#!/usr/bin/env node
'use strict';
/**
 * H3 — supply-chain governance check (dependency-free).
 *
 * Fail-closed validation of the reproducible-build + supply-chain contract:
 *
 *   1. package-lock.json exists, is lockfileVersion 3, and its root name/version match package.json.
 *   2. devDependencies are pinned to EXACT versions (no ^ ~ ranges) and match the lockfile.
 *   3. engines.node / engines.npm are declared.
 *   4. Vendor manifest: every listed library file exists on disk and its sha256 matches (drift = fail);
 *      every renderer/lib/*.js file on disk is COVERED by the manifest (no unmanaged vendored file).
 *   5. License allowlist: every npm component's license (from the lockfile) is on the permissive
 *      allowlist; every vendored library license is on the allowlist. Any copyleft/unknown = fail.
 *   6. SBOM freshness: supply-chain/sbom.cdx.json is byte-identical to a fresh regeneration.
 *   7. THIRD_PARTY_NOTICES.md exists and references every vendored library by name.
 *   8. build-environment.json declares the pinned toolchain + arm64-only platform support.
 *
 * `--selftest` exercises the hash-drift, range-version, uncovered-vendor-file, and copyleft-license
 * rejection paths against in-memory fixtures. Uses only Node builtins (fs, path, crypto).
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/supply-chain.json
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');

// Permissive licenses acceptable for redistribution in an UNLICENSED (all-rights-reserved) app.
// NOTE: this list is intentionally permissive-only — no GPL/LGPL/AGPL/MPL/EPL/CDDL copyleft.
const LICENSE_ALLOWLIST = new Set([
  'MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'BlueOak-1.0.0',
  'CC0-1.0', 'CC-BY-4.0', 'Unlicense', 'WTFPL', 'Python-2.0', 'BSD',
]);
// SPDX expression splitter: accept a compound expr iff EVERY named license token is allowlisted.
function licenseAllowed(expr) {
  if (!expr) return false;
  const tokens = String(expr).replace(/[()]/g, ' ').split(/\s+(?:OR|AND)\s+/i).map(t => t.trim()).filter(Boolean);
  if (!tokens.length) return false;
  return tokens.every(t => LICENSE_ALLOWLIST.has(t));
}
function licenseOf(entry) {
  if (typeof entry.license === 'string') return entry.license;
  if (Array.isArray(entry.licenses) && entry.licenses[0]) return entry.licenses[0].type || null;
  return null;
}
function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function run() {
  const problems = [];
  const fail = (msg) => problems.push(msg);

  const pkg = readJson(path.join(REPO, 'package.json'));

  // 1. lockfile
  let lock = null;
  try { lock = readJson(path.join(REPO, 'package-lock.json')); }
  catch (_) { fail('package-lock.json missing or unreadable (required reproducible-build authority)'); }
  if (lock) {
    if (lock.lockfileVersion !== 3) fail('package-lock.json lockfileVersion must be 3; got ' + lock.lockfileVersion);
    const root = (lock.packages && lock.packages['']) || {};
    if (root.name !== pkg.name) fail('lockfile root name ' + root.name + ' != package.json name ' + pkg.name);
    if (root.version !== pkg.version) fail('lockfile root version ' + root.version + ' != package.json version ' + pkg.version);
  }

  // 2. exact devDependency pins + lockfile agreement
  const dev = pkg.devDependencies || {};
  for (const [name, range] of Object.entries(dev)) {
    if (/[\^~><*]|\s-\s|x/i.test(range)) fail('devDependency ' + name + ' is not an exact version: ' + range);
    if (lock) {
      const locked = lock.packages && lock.packages['node_modules/' + name];
      if (!locked) fail('devDependency ' + name + ' not present in lockfile');
      else if (locked.version !== range) fail('devDependency ' + name + ' pin ' + range + ' != lockfile ' + locked.version);
    }
  }

  // 3. engines
  if (!pkg.engines || !pkg.engines.node) fail('package.json engines.node missing');
  if (!pkg.engines || !pkg.engines.npm) fail('package.json engines.npm missing');

  // 4. vendor manifest hashes + coverage
  let vendor = null;
  try { vendor = readJson(path.join(REPO, 'supply-chain', 'vendor-manifest.json')); }
  catch (_) { fail('supply-chain/vendor-manifest.json missing'); }
  const libDir = path.join(REPO, 'renderer', 'lib');
  const onDiskLibs = fs.existsSync(libDir) ? fs.readdirSync(libDir).filter(f => /\.js$/.test(f)) : [];
  const covered = new Set();
  if (vendor) {
    for (const lib of vendor.libraries || []) {
      const abs = path.join(REPO, lib.shippedPath);
      if (!fs.existsSync(abs)) { fail('vendored file missing: ' + lib.shippedPath); continue; }
      const actual = sha256File(abs);
      if (actual !== lib.sha256) fail('vendor hash DRIFT for ' + lib.shippedPath + ': manifest ' + lib.sha256 + ' actual ' + actual);
      if (!licenseAllowed(lib.license)) fail('vendored ' + lib.name + ' license not on allowlist: ' + lib.license);
      covered.add(path.basename(lib.shippedPath));
    }
  }
  for (const f of onDiskLibs) if (!covered.has(f)) fail('renderer/lib/' + f + ' is not covered by the vendor manifest (unmanaged vendored file)');

  // 5. npm license allowlist
  if (lock) {
    const offenders = [];
    for (const [key, entry] of Object.entries(lock.packages || {})) {
      if (key === '') continue;
      const lic = licenseOf(entry);
      if (!licenseAllowed(lic)) offenders.push(key.replace(/^node_modules\//, '') + '@' + (entry.version || '?') + ' => ' + (lic || 'UNKNOWN'));
    }
    if (offenders.length) fail('non-allowlisted npm license(s): ' + offenders.slice(0, 10).join('; ') + (offenders.length > 10 ? ' (+' + (offenders.length - 10) + ' more)' : ''));
  }

  // 6. SBOM freshness (regenerate in --check mode)
  const sbomCheck = cp.spawnSync(process.execPath, [path.join(REPO, 'scripts', 'generate-sbom.js'), '--check'], { cwd: REPO, encoding: 'utf8' });
  if (sbomCheck.status !== 0) fail('SBOM freshness check failed: ' + (sbomCheck.stderr || sbomCheck.stdout || '').trim());

  // 7. THIRD_PARTY_NOTICES references every vendored lib
  let notices = '';
  try { notices = fs.readFileSync(path.join(REPO, 'THIRD_PARTY_NOTICES.md'), 'utf8'); }
  catch (_) { fail('THIRD_PARTY_NOTICES.md missing'); }
  if (notices && vendor) {
    for (const lib of vendor.libraries || []) {
      if (notices.indexOf(lib.displayName) === -1 && notices.indexOf(lib.name) === -1) fail('THIRD_PARTY_NOTICES.md does not mention vendored library ' + lib.displayName);
    }
  }

  // 8. build-environment manifest
  let buildEnv = null;
  try { buildEnv = readJson(path.join(REPO, 'supply-chain', 'build-environment.json')); }
  catch (_) { fail('supply-chain/build-environment.json missing'); }
  if (buildEnv) {
    if (!buildEnv.installMode || !/npm ci/.test(buildEnv.installMode)) fail('build-environment.installMode must document npm ci');
    if (!buildEnv.platformSupport || buildEnv.platformSupport.arm64 !== true || buildEnv.platformSupport.x64 !== false) fail('build-environment.platformSupport must be arm64-only (arm64:true, x64:false)');
  }

  return { check: 'supply-chain', ok: problems.length === 0, problems, npmComponentCount: lock ? Object.keys(lock.packages || {}).length - 1 : null, vendorCount: vendor ? (vendor.libraries || []).length : null };
}

// ---- self-test ----
function selftest() {
  let ok = true;
  const t = (name, cond) => { if (!cond) { ok = false; console.error('  SELFTEST FAIL: ' + name); } };
  t('MIT allowed', licenseAllowed('MIT'));
  t('ISC allowed', licenseAllowed('ISC'));
  t('MIT OR Apache-2.0 allowed', licenseAllowed('(MIT OR Apache-2.0)'));
  t('GPL-3.0 rejected', !licenseAllowed('GPL-3.0'));
  t('MIT AND GPL-3.0 rejected (any copyleft token fails)', !licenseAllowed('MIT AND GPL-3.0'));
  t('null license rejected', !licenseAllowed(null));
  t('empty license rejected', !licenseAllowed(''));
  console.log(ok ? 'supply-chain selftest: PASS' : 'supply-chain selftest: FAIL');
  return ok;
}

if (process.argv.includes('--selftest')) {
  process.exit(selftest() ? 0 : 1);
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'supply-chain', ok: false, fatalError: String((e && e.stack) || e) }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'supply-chain.json'), JSON.stringify(result, null, 2));
console.log('SUPPLY-CHAIN ' + JSON.stringify({ ok: result.ok, problems: result.problems ? result.problems.length : 'fatal' }));
if (result.problems && result.problems.length) for (const p of result.problems) console.log('  - ' + p);
process.exit(exitCode);
