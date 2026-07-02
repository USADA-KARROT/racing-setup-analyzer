'use strict';
/**
 * tests/supply-chain.test.js — H3 reproducible-build + supply-chain governance.
 *
 * Exercises the REAL scripts/check-supply-chain.js and scripts/generate-sbom.js in child processes:
 *   - the real repo PASSES (lockfile present, pins exact, vendor hashes match, licenses allowlisted,
 *     SBOM fresh, notices present);
 *   - fail-closed cases run the real script against a sandboxed repo fixture with one mutation each
 *     (missing lockfile, range devDep, vendor hash drift, copyleft license, uncovered vendor file,
 *     stale SBOM, missing notices).
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const H = require('./helpers/managed-temp-dir.js');

let passed = 0, failed = 0;
function chk(name, cond, extra) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

const REPO = path.resolve(__dirname, '..');

// 1. selftest passes
(function () {
  const r = cp.spawnSync(process.execPath, [path.join(REPO, 'scripts', 'check-supply-chain.js'), '--selftest'], { encoding: 'utf8' });
  chk('check-supply-chain --selftest passes', r.status === 0, r.stdout);
})();

// 2. real repo passes
(function () {
  const box = H.acquireTempDir('h3-sc-real-');
  try {
    const r = cp.spawnSync(process.execPath, [path.join(REPO, 'scripts', 'check-supply-chain.js')], {
      cwd: REPO, encoding: 'utf8', env: Object.assign({}, process.env, { ARTIFACT_DIR: box }),
    });
    const art = JSON.parse(fs.readFileSync(path.join(box, 'supply-chain.json'), 'utf8'));
    chk('real repo supply-chain check PASSES', r.status === 0 && art.ok === true, art.problems);
    chk('real SBOM covers npm + vendored components', art.npmComponentCount > 400 && art.vendorCount === 3, { npm: art.npmComponentCount, vendor: art.vendorCount });
  } finally { H.releaseTempDir(box); }
})();

// 3. real SBOM is fresh (generate --check passes)
(function () {
  const r = cp.spawnSync(process.execPath, [path.join(REPO, 'scripts', 'generate-sbom.js'), '--check'], { cwd: REPO, encoding: 'utf8' });
  chk('committed SBOM is up to date (generate-sbom --check)', r.status === 0, (r.stderr || r.stdout).trim());
})();

// ---- fail-closed sandbox: copy the supply-chain-relevant files into a fixture repo and mutate one ----
function sandbox() {
  const box = H.acquireTempDir('h3-sc-box-');
  fs.mkdirSync(path.join(box, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(box, 'supply-chain'), { recursive: true });
  fs.mkdirSync(path.join(box, 'renderer', 'lib'), { recursive: true });
  for (const s of ['check-supply-chain.js', 'generate-sbom.js']) fs.copyFileSync(path.join(REPO, 'scripts', s), path.join(box, 'scripts', s));
  fs.copyFileSync(path.join(REPO, 'package.json'), path.join(box, 'package.json'));
  fs.copyFileSync(path.join(REPO, 'package-lock.json'), path.join(box, 'package-lock.json'));
  fs.copyFileSync(path.join(REPO, 'supply-chain', 'vendor-manifest.json'), path.join(box, 'supply-chain', 'vendor-manifest.json'));
  fs.copyFileSync(path.join(REPO, 'supply-chain', 'build-environment.json'), path.join(box, 'supply-chain', 'build-environment.json'));
  fs.copyFileSync(path.join(REPO, 'supply-chain', 'sbom.cdx.json'), path.join(box, 'supply-chain', 'sbom.cdx.json'));
  fs.copyFileSync(path.join(REPO, 'THIRD_PARTY_NOTICES.md'), path.join(box, 'THIRD_PARTY_NOTICES.md'));
  for (const f of fs.readdirSync(path.join(REPO, 'renderer', 'lib'))) fs.copyFileSync(path.join(REPO, 'renderer', 'lib', f), path.join(box, 'renderer', 'lib', f));
  return box;
}
function runIn(box) {
  const r = cp.spawnSync(process.execPath, [path.join(box, 'scripts', 'check-supply-chain.js')], {
    cwd: box, encoding: 'utf8', env: Object.assign({}, process.env, { ARTIFACT_DIR: box }),
  });
  let art = null; try { art = JSON.parse(fs.readFileSync(path.join(box, 'supply-chain.json'), 'utf8')); } catch (_) {}
  return { status: r.status, art };
}
function writeJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n'); }

// baseline: the pristine sandbox must PASS (proves mutations are what break it)
(function () {
  const box = sandbox();
  try {
    // sandbox SBOM was generated in-repo; regenerate inside the box so serial/paths match
    cp.spawnSync(process.execPath, [path.join(box, 'scripts', 'generate-sbom.js')], { cwd: box, encoding: 'utf8' });
    const r = runIn(box);
    chk('pristine sandbox PASSES', r.status === 0 && r.art && r.art.ok === true, r.art && r.art.problems);
  } finally { H.releaseTempDir(box); }
})();

// a) missing lockfile
(function () {
  const box = sandbox();
  try { fs.unlinkSync(path.join(box, 'package-lock.json')); const r = runIn(box);
    chk('FAIL missing lockfile', r.status !== 0 && r.art && r.art.problems.some(p => /package-lock\.json missing/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

// b) range devDependency
(function () {
  const box = sandbox();
  try { const p = JSON.parse(fs.readFileSync(path.join(box, 'package.json'), 'utf8')); p.devDependencies.electron = '^33.0.0'; writeJson(path.join(box, 'package.json'), p);
    const r = runIn(box);
    chk('FAIL range devDependency (^)', r.status !== 0 && r.art && r.art.problems.some(p => /not an exact version/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

// c) vendor hash drift
(function () {
  const box = sandbox();
  try { fs.appendFileSync(path.join(box, 'renderer', 'lib', 'alpine.min.js'), '\n/* tamper */');
    const r = runIn(box);
    chk('FAIL vendor hash drift', r.status !== 0 && r.art && r.art.problems.some(p => /hash DRIFT/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

// d) copyleft license injected into the lockfile
(function () {
  const box = sandbox();
  try { const l = JSON.parse(fs.readFileSync(path.join(box, 'package-lock.json'), 'utf8'));
    l.packages['node_modules/__evil'] = { version: '1.0.0', license: 'GPL-3.0' }; writeJson(path.join(box, 'package-lock.json'), l);
    const r = runIn(box);
    chk('FAIL copyleft (GPL-3.0) npm license', r.status !== 0 && r.art && r.art.problems.some(p => /non-allowlisted npm license/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

// e) uncovered vendored file
(function () {
  const box = sandbox();
  try { fs.writeFileSync(path.join(box, 'renderer', 'lib', 'rogue.js'), '// unmanaged');
    const r = runIn(box);
    chk('FAIL uncovered vendored file', r.status !== 0 && r.art && r.art.problems.some(p => /not covered by the vendor manifest/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

// f) stale SBOM
(function () {
  const box = sandbox();
  try {
    cp.spawnSync(process.execPath, [path.join(box, 'scripts', 'generate-sbom.js')], { cwd: box, encoding: 'utf8' });
    const s = JSON.parse(fs.readFileSync(path.join(box, 'supply-chain', 'sbom.cdx.json'), 'utf8')); s.components.push({ type: 'library', name: 'ghost', version: '9.9.9' });
    writeJson(path.join(box, 'supply-chain', 'sbom.cdx.json'), s);
    const r = runIn(box);
    chk('FAIL stale SBOM', r.status !== 0 && r.art && r.art.problems.some(p => /SBOM freshness/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

// g) missing THIRD_PARTY_NOTICES
(function () {
  const box = sandbox();
  try { cp.spawnSync(process.execPath, [path.join(box, 'scripts', 'generate-sbom.js')], { cwd: box, encoding: 'utf8' });
    fs.unlinkSync(path.join(box, 'THIRD_PARTY_NOTICES.md'));
    const r = runIn(box);
    chk('FAIL missing THIRD_PARTY_NOTICES', r.status !== 0 && r.art && r.art.problems.some(p => /THIRD_PARTY_NOTICES/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

// h) wrong lockfileVersion
(function () {
  const box = sandbox();
  try {
    cp.spawnSync(process.execPath, [path.join(box, 'scripts', 'generate-sbom.js')], { cwd: box, encoding: 'utf8' });
    const l = JSON.parse(fs.readFileSync(path.join(box, 'package-lock.json'), 'utf8')); l.lockfileVersion = 2;
    writeJson(path.join(box, 'package-lock.json'), l);
    const r = runIn(box);
    chk('FAIL wrong lockfileVersion (not 3)', r.status !== 0 && r.art && r.art.problems.some(p => /lockfileVersion must be 3/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

// i) missing engines
(function () {
  const box = sandbox();
  try {
    cp.spawnSync(process.execPath, [path.join(box, 'scripts', 'generate-sbom.js')], { cwd: box, encoding: 'utf8' });
    const pk = JSON.parse(fs.readFileSync(path.join(box, 'package.json'), 'utf8')); delete pk.engines;
    writeJson(path.join(box, 'package.json'), pk);
    const r = runIn(box);
    chk('FAIL missing engines', r.status !== 0 && r.art && r.art.problems.some(p => /engines\.node missing/.test(p)));
  } finally { H.releaseTempDir(box); }
})();

console.log('supply-chain: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
