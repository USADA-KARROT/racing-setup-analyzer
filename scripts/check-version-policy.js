#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — package + version policy check (dependency-free lane).
 *
 * package.json version must remain 2.0.0 — the F6_RELEASE pin after the single authorized
 * 1.4.0 -> 2.0.0 bump (unless VERSION_BUMP_ALLOW=<x.y.z> stages a future authorized bump).
 *
 * H3 (v2.0.x public-release hardening) POLICY FLIP: a tracked package-lock.json is now REQUIRED
 * (the reproducible-build authority) — its ABSENCE is the violation. The DEPENDENCY-FREE
 * VERIFICATION LANE (the trusted-verification-gate workflow) must still contain no package-manager
 * install / Electron build / lifecycle invocation; that ban is now scoped to that ONE workflow so a
 * separate supply-chain/build lane may legitimately run `npm ci`. CI never publishes / tags / releases.
 *
 * Env: BASE_SHA / HEAD_SHA (CI supplies; fallback origin/main...HEAD), VERSION_BUMP_ALLOW (optional).
 * Output: ${ARTIFACT_DIR:-artifacts}/version-policy.json   (exit non-zero on any violation)
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
const EXPECTED = '2.0.0';

function git(args) {
  const r = cp.spawnSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return r.status === 0 ? (r.stdout || '').trim() : null;
}

function run() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const allow = (process.env.VERSION_BUMP_ALLOW || '').trim();
  const version = pkg.version;
  const versionOk = version === EXPECTED || (!!allow && version === allow);

  // H3: the lockfile is now the REQUIRED reproducible-build authority. It must be tracked and
  // must remain tracked; a PR that removes it is the violation.
  const lockfileTracked = !!git(['ls-files', 'package-lock.json']);
  const base = process.env.BASE_SHA || 'origin/main', head = process.env.HEAD_SHA || 'HEAD';
  const changed = (git(['diff', '--name-only', base + '...' + head]) || '').split('\n').map(s => s.trim()).filter(Boolean);
  const lockfileDeletedByPR = git(['diff', '--name-only', '--diff-filter=D', base + '...' + head]) || '';
  const lockfileRemovedByPR = lockfileDeletedByPR.split('\n').map(s => s.trim()).includes('package-lock.json');

  // The CI workflow must not install packages / build Electron / run lifecycle scripts.
  // The install-free ban applies ONLY to the dependency-free verification lane (ci.yml). The
  // supply-chain/build lane is exempt — it exists precisely to run `npm ci` reproducibly.
  const VERIFICATION_LANE_WORKFLOW = 'ci.yml';
  const wfDir = path.join(REPO, '.github', 'workflows');
  const verificationLaneExists = fs.existsSync(path.join(wfDir, VERIFICATION_LANE_WORKFLOW));
  let wfFiles = [];
  try { wfFiles = fs.readdirSync(wfDir).filter(f => /\.ya?ml$/.test(f) && f === VERIFICATION_LANE_WORKFLOW); } catch (_) { /* none */ }
  const forbidden = [
    { re: /npm\s+ci\b/, name: 'npm ci' }, { re: /npm\s+install\b/, name: 'npm install' },
    { re: /\bnpx\b/, name: 'npx' }, { re: /\byarn\b/, name: 'yarn' }, { re: /\bpnpm\b/, name: 'pnpm' },
    { re: /electron-builder/, name: 'electron-builder' }, { re: /npm\s+run\s+build/, name: 'npm run build' },
    { re: /build:(mac|win|all)\b/, name: 'electron build script' },
  ];
  const workflowViolations = [];
  for (const f of wfFiles) {
    const txt = fs.readFileSync(path.join(wfDir, f), 'utf8');
    for (const x of forbidden) if (x.re.test(txt)) workflowViolations.push(f + ': ' + x.name);
  }

  const ok = versionOk && lockfileTracked && !lockfileRemovedByPR && verificationLaneExists && workflowViolations.length === 0;
  return {
    check: 'version-policy',
    packageVersion: version, expected: EXPECTED, bumpAllow: allow || null, versionOk,
    lockfileTracked, lockfileRequired: true, lockfileRemovedByPR, verificationLaneExists, workflowViolations, ok,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'version-policy', fatalError: String((e && e.stack) || e), packageVersion: null, ok: false }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'version-policy.json'), JSON.stringify(result, null, 2));
console.log('VERSION ' + JSON.stringify({ packageVersion: result.packageVersion, lockfileTracked: result.lockfileTracked, lockfileRemovedByPR: result.lockfileRemovedByPR, workflowViolations: result.workflowViolations, ok: result.ok }));
process.exit(exitCode);
