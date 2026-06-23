#!/usr/bin/env node
'use strict';
/**
 * R3.0 Integrated Delivery Train — per-phase governance integrity (visibility) checker (D / E / F).
 *
 * Parameterized variant of scripts/check-r3-0c-governance-integrity.js (which inventories R3.0C).
 * The phase to validate is selected by env R3_PHASE_PROGRAM (one of 'R3.0D', 'R3.0E', 'R3.0F').
 *
 * Computes a SHA-256 inventory of every file that defines this phase's governance contract — the
 * schema / state / capabilities / checkpoint-manifest-schema / per-checkpoint manifests, plus the
 * shared train-level validators and the CI workflow / evidence collector. This phase only establishes
 * its baseline inventory; it does not assert immutability. Future checkpoints that modify any listed
 * file will surface a different hash, making the governance change explicit — the per-checkpoint
 * manifest must then declare governanceChanged=true so Codex scope includes governance.
 *
 * Internal failure fails closed: ok=false, INTERNAL_VALIDATOR_FAILURE, exit code 2.
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-<lower-dashed-program>-governance-integrity.json
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');

const PHASE_CONFIG = {
  'R3.0D': { dir: 'governance/r3.0d', bootstrapManifest: 'D0.json', artifact: 'r3-0d-governance-integrity.json', label: 'R3.0D-GOV-INTEGRITY' },
  'R3.0E': { dir: 'governance/r3.0e', bootstrapManifest: 'E0.json', artifact: 'r3-0e-governance-integrity.json', label: 'R3.0E-GOV-INTEGRITY' },
  'R3.0F': { dir: 'governance/r3.0f', bootstrapManifest: 'F0.json', artifact: 'r3-0f-governance-integrity.json', label: 'R3.0F-GOV-INTEGRITY' },
};

const PHASE_PROGRAM = String(process.env.R3_PHASE_PROGRAM || '').trim();
const PHASE = PHASE_CONFIG[PHASE_PROGRAM];

const INTEGRITY_REPO = process.env.R3_PHASE_INTEGRITY_REPO_OVERRIDE ? path.resolve(process.env.R3_PHASE_INTEGRITY_REPO_OVERRIDE) : REPO;

function requiredFiles() {
  if (!PHASE) return [];
  return [
    PHASE.dir + '/schema.json',
    PHASE.dir + '/state.json',
    PHASE.dir + '/capabilities.json',
    PHASE.dir + '/checkpoint-manifest.schema.json',
    PHASE.dir + '/checkpoints/' + PHASE.bootstrapManifest,
    'governance/r3.0/train.schema.json',
    'governance/r3.0/train.json',
    'scripts/check-r3-phase-governance.js',
    'scripts/check-r3-phase-no-consumer.js',
    'scripts/check-r3-phase-governance-integrity.js',
    'scripts/check-r3-0-train.js',
    'scripts/collect-evidence.js',
    '.github/workflows/ci.yml',
  ];
}

function listAllCheckpointManifests() {
  const dir = path.join(INTEGRITY_REPO, PHASE.dir, 'checkpoints');
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => PHASE.dir + '/checkpoints/' + f)
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

function finish(payload) {
  return Object.assign({ check: PHASE ? ('r3-' + PHASE_PROGRAM.toLowerCase().replace('.', '-') + '-governance-integrity').replace('--', '-') : 'r3-phase-governance-integrity', program: PHASE_PROGRAM || null }, payload);
}

function run() {
  if (!PHASE) {
    return finish({ ok: false, violations: [{ code: 'PHASE_PROGRAM_INVALID', message: 'R3_PHASE_PROGRAM must be one of R3.0D / R3.0E / R3.0F; got ' + JSON.stringify(PHASE_PROGRAM) }], inventory: [], bundleSha256: null });
  }
  const violations = [];
  const inventory = [];
  const REQUIRED = requiredFiles();
  const extraManifests = listAllCheckpointManifests().filter(f => !REQUIRED.includes(f));
  const all = REQUIRED.concat(extraManifests);
  for (const rel of all) {
    try { inventory.push(hashFile(rel)); }
    catch (e) { violations.push({ code: 'GOVERNANCE_FILE_UNREADABLE', file: rel, message: e.message }); }
  }
  for (const r of REQUIRED) if (!inventory.find(i => i.path === r)) violations.push({ code: 'GOVERNANCE_REQUIRED_FILE_MISSING', file: r });
  const bundleLines = inventory.slice().sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map(i => i.path + '|' + i.sha256);
  const bundleSha256 = crypto.createHash('sha256').update(bundleLines.join('\n')).digest('hex');

  return finish({
    note: PHASE_PROGRAM + ' baseline inventory only. This check does not enforce hash equality across PRs; subsequent checkpoints that modify any listed file must declare governanceChanged=true in their checkpoint manifest so Codex scope includes governance review.',
    requiredFileCount: REQUIRED.length,
    inventory,
    extraCheckpointManifests: extraManifests,
    bundleSha256,
    violations,
    ok: violations.length === 0,
  });
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) {
  result = finish({
    ok: false,
    inventory: [],
    bundleSha256: null,
    violations: [{ code: 'INTERNAL_VALIDATOR_FAILURE', message: String((e && e.stack) || e) }],
  });
  exitCode = 2;
}
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
const outName = PHASE ? PHASE.artifact : 'r3-phase-governance-integrity.json';
fs.writeFileSync(path.join(ARTIFACT_DIR, outName), JSON.stringify(result, null, 2));
const label = PHASE ? PHASE.label : 'R3-PHASE-GOV-INTEGRITY';
console.log(label + ' ' + JSON.stringify({
  program: result.program,
  files: (result.inventory || []).length,
  bundleSha256: result.bundleSha256,
  violations: (result.violations || []).length,
  ok: result.ok,
}));
process.exit(exitCode);
