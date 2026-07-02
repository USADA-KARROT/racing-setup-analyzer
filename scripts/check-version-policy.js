#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — package + version policy check (dependency-free lane).
 *
 * package.json version must remain 2.0.0 — the F6_RELEASE pin after the single authorized
 * 1.4.0 -> 2.0.0 bump (unless VERSION_BUMP_ALLOW=<x.y.z> stages a future authorized bump). The lockfile must stay
 * untracked and must not be introduced by this PR. The CI workflow must contain no package-manager
 * install, Electron build, or lifecycle invocation — R3-GATE0 must not quietly change the project's
 * existing dependency governance. CI never publishes / tags / releases (no release step exists).
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

  const lockfileTracked = !!git(['ls-files', 'package-lock.json']);
  const base = process.env.BASE_SHA || 'origin/main', head = process.env.HEAD_SHA || 'HEAD';
  const changed = (git(['diff', '--name-only', base + '...' + head]) || '').split('\n').map(s => s.trim()).filter(Boolean);
  const lockfileAddedByPR = changed.includes('package-lock.json');

  // The CI workflow must not install packages / build Electron / run lifecycle scripts.
  const wfDir = path.join(REPO, '.github', 'workflows');
  let wfFiles = [];
  try { wfFiles = fs.readdirSync(wfDir).filter(f => /\.ya?ml$/.test(f)); } catch (_) { /* none */ }
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

  const ok = versionOk && !lockfileTracked && !lockfileAddedByPR && workflowViolations.length === 0;
  return {
    check: 'version-policy',
    packageVersion: version, expected: EXPECTED, bumpAllow: allow || null, versionOk,
    lockfileTracked, lockfileAddedByPR, workflowViolations, ok,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'version-policy', fatalError: String((e && e.stack) || e), packageVersion: null, ok: false }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'version-policy.json'), JSON.stringify(result, null, 2));
console.log('VERSION ' + JSON.stringify({ packageVersion: result.packageVersion, lockfileTracked: result.lockfileTracked, workflowViolations: result.workflowViolations, ok: result.ok }));
process.exit(exitCode);
