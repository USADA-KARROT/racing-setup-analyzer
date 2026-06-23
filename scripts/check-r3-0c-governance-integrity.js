#!/usr/bin/env node
'use strict';
/**
 * R3.0C C0 — Governance integrity (visibility) checker.
 *
 * Computes a SHA-256 inventory of every file that defines the R3.0C governance contract — the schema /
 * state / capabilities / checkpoint-manifest-schema / per-checkpoint manifests, the three new C0
 * validators, the original R3.0C scope guard (whose blocking semantics must not weaken without explicit
 * authorization), the CI workflow, and the evidence collector. C0 only establishes the baseline
 * inventory; it does not assert immutability. Future checkpoints that touch any of these files will
 * surface a different hash, making the governance change explicit rather than silent — and the
 * checkpoint manifest must then declare governanceChanged=true so Codex scope includes governance.
 *
 * Internal failure (missing required file, unreadable file, hashing error) fails closed:
 *   ok=false, INTERNAL_VALIDATOR_FAILURE violation, exit code 2.
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-0c-governance-integrity.json
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
// INTEGRITY_REPO defaults to the real repo. R3_0C_INTEGRITY_REPO_OVERRIDE is for test fixtures ONLY —
// changes WHERE the inventory is taken from, never WHETHER to take it.
const INTEGRITY_REPO = process.env.R3_0C_INTEGRITY_REPO_OVERRIDE ? path.resolve(process.env.R3_0C_INTEGRITY_REPO_OVERRIDE) : REPO;

const REQUIRED = [
  'governance/r3.0c/schema.json',
  'governance/r3.0c/state.json',
  'governance/r3.0c/capabilities.json',
  'governance/r3.0c/checkpoint-manifest.schema.json',
  'governance/r3.0c/checkpoints/C0.json',
  'scripts/check-r3-0c-governance.js',
  'scripts/check-r3-0c-no-consumer.js',
  'scripts/check-r3-0c-governance-integrity.js',
  'scripts/check-r3-0c-guard.js',
  'scripts/collect-evidence.js',
  '.github/workflows/ci.yml',
];

function listAllCheckpointManifests() {
  const dir = path.join(INTEGRITY_REPO, 'governance', 'r3.0c', 'checkpoints');
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => 'governance/r3.0c/checkpoints/' + f)
      .sort();
  } catch (_) { return []; }
}

function hashFile(rel) {
  const abs = path.join(INTEGRITY_REPO, rel);
  const buf = fs.readFileSync(abs);
  return {
    path: rel,
    bytes: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  };
}

function run() {
  const violations = [];
  const inventory = [];
  const extraManifests = listAllCheckpointManifests().filter(f => !REQUIRED.includes(f));
  const all = REQUIRED.concat(extraManifests);
  for (const rel of all) {
    try { inventory.push(hashFile(rel)); }
    catch (e) {
      violations.push({ code: 'GOVERNANCE_FILE_UNREADABLE', file: rel, message: e.message });
    }
  }
  const requiredPresent = REQUIRED.every(r => inventory.find(i => i.path === r));
  if (!requiredPresent) {
    for (const r of REQUIRED) if (!inventory.find(i => i.path === r)) violations.push({ code: 'GOVERNANCE_REQUIRED_FILE_MISSING', file: r });
  }
  // governance-bundle digest: stable sha256 over (sorted path|sha256) lines.
  const bundleLines = inventory.slice().sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map(i => i.path + '|' + i.sha256);
  const bundleSha256 = crypto.createHash('sha256').update(bundleLines.join('\n')).digest('hex');

  return {
    check: 'r3-0c-governance-integrity',
    note: 'C0 baseline inventory only. C0 does not enforce hash equality across PRs; subsequent checkpoints that modify any listed file must declare governanceChanged=true in their checkpoint manifest so Codex scope includes governance review.',
    requiredFileCount: REQUIRED.length,
    inventory,
    extraCheckpointManifests: extraManifests,
    bundleSha256,
    violations,
    ok: violations.length === 0,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) {
  result = {
    check: 'r3-0c-governance-integrity',
    ok: false,
    inventory: [],
    bundleSha256: null,
    violations: [{ code: 'INTERNAL_VALIDATOR_FAILURE', message: String((e && e.stack) || e) }],
  };
  exitCode = 2;
}
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'r3-0c-governance-integrity.json'), JSON.stringify(result, null, 2));
console.log('R3.0C-GOV-INTEGRITY ' + JSON.stringify({
  files: (result.inventory || []).length,
  bundleSha256: result.bundleSha256,
  violations: (result.violations || []).length,
  ok: result.ok,
}));
process.exit(exitCode);
