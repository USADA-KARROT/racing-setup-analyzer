/**
 * tests/r3-0-phase-no-consumer.test.js — R3.0 Integrated Delivery Train per-phase no-runtime-consumer.
 *
 * Covers scripts/check-r3-phase-no-consumer.js for R3.0D / R3.0E / R3.0F. Validates the real-repo PASS
 * path AND adversarial FAIL fixtures (R3_PHASE_NO_CONSUMER_BASE_OVERRIDE points to synthetic trees so
 * the real renderer/js/ is never mutated).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const H = require('./helpers/managed-temp-dir.js');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/check-r3-phase-no-consumer.js';
const PHASES = ['R3.0D', 'R3.0E', 'R3.0F'];
const ARTIFACT = { 'R3.0D': 'r3-0d-no-consumer.json', 'R3.0E': 'r3-0e-no-consumer.json', 'R3.0F': 'r3-0f-no-consumer.json' };
const CONTRACT_PREFIX = { 'R3.0D': 'contracts/r3.0d', 'R3.0E': 'contracts/r3.0e', 'R3.0F': 'contracts/r3.0f' };

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

function runValidator(phase, scanBase) {
  const tmp = H.acquireTempDir('r3-phase-noc-art-');
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp, R3_PHASE_PROGRAM: phase });
  if (scanBase) env.R3_PHASE_NO_CONSUMER_BASE_OVERRIDE = scanBase;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, ARTIFACT[phase] || 'r3-phase-no-consumer.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr || '', stdout: r.stdout || '', tmp };
}

function buildSyntheticTree(consumerLine) {
  const dir = H.acquireTempDir('r3-phase-noc-tree-');
  fs.mkdirSync(path.join(dir, 'renderer', 'js'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'renderer'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'renderer', 'js', 'maybe-consumer.js'), consumerLine || '// no consumer\nmodule.exports = {};\n');
  fs.writeFileSync(path.join(dir, 'renderer', 'index.html'), '<!doctype html><html><body><script src="js/maybe-consumer.js"></script></body></html>');
  fs.writeFileSync(path.join(dir, 'main.js'), '// no R3 phase consumer\n');
  fs.writeFileSync(path.join(dir, 'preload.js'), '// no preload consumer\n');
  return dir;
}

// ── PASS: real repo ──
// Per-phase consumer authorization: the validator's PASS posture is "every consumer is listed in
// state.authorizedProductionPaths". The real repo may carry 0..N authorized consumers depending on
// where each phase's currentCheckpoint sits — assert unauthorizedConsumerCount===0 instead of
// runtimeConsumerCount===0 (which would falsely fail for R3.0D after D2 advances).
for (const phase of PHASES) {
  const r = runValidator(phase, null);
  chk(phase + ' PASS real repo rc=0', r.status === 0, { status: r.status, violations: r.artifact && r.artifact.violations });
  chk(phase + ' PASS unauthorizedConsumerCount=0', r.artifact && r.artifact.unauthorizedConsumerCount === 0);
  chk(phase + ' PASS every consumer is authorized (consumers === authorizedConsumers)', r.artifact && r.artifact.runtimeConsumerCount === r.artifact.authorizedConsumerCount);
  chk(phase + ' PASS contractPrefix=' + CONTRACT_PREFIX[phase], r.artifact && r.artifact.contractPrefix === CONTRACT_PREFIX[phase]);
}

// ── FAIL: missing R3_PHASE_PROGRAM ──
{
  const tmp = H.acquireTempDir('r3-phase-noc-art-');
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp });
  delete env.R3_PHASE_PROGRAM;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, 'r3-phase-no-consumer.json'), 'utf8')); } catch (_) { artifact = null; }
  chk('FAIL missing R3_PHASE_PROGRAM rc=1', r.status === 1);
  chk('FAIL missing R3_PHASE_PROGRAM artifact PHASE_PROGRAM_INVALID', artifact && Array.isArray(artifact.violations) && artifact.violations.some(v => v.code === 'PHASE_PROGRAM_INVALID'));
}

// ── FAIL: synthetic renderer/js/ file requires contracts/<phase>/ ──
// The synthetic file (renderer/js/maybe-consumer.js) is NEVER in state.authorizedProductionPaths
// for any phase (the real repo's state only authorizes the actual phase production paths). So a
// synthetic consumer is always flagged as PROD_UNAUTHORIZED_CONSUMER.
for (const phase of PHASES) {
  const prefix = CONTRACT_PREFIX[phase];
  const tree = buildSyntheticTree('var c = require("../../' + prefix + '/index.js");\nmodule.exports = c;\n');
  const r = runValidator(phase, tree);
  chk(phase + ' FAIL synthetic consumer rc!=0', r.status !== 0);
  chk(phase + ' FAIL synthetic consumer detected', r.artifact && r.artifact.runtimeConsumerCount > 0);
  chk(phase + ' FAIL synthetic consumer PROD_UNAUTHORIZED_CONSUMER', r.artifact && r.artifact.violations.some(v => v.code === 'PROD_UNAUTHORIZED_CONSUMER'));
  chk(phase + ' FAIL synthetic consumer unauthorizedConsumerCount>0', r.artifact && r.artifact.unauthorizedConsumerCount > 0);
}

// ── FAIL: synthetic index.html loads contracts/<phase>/ script ──
for (const phase of PHASES) {
  const prefix = CONTRACT_PREFIX[phase];
  const dir = H.acquireTempDir('r3-phase-noc-html-');
  fs.mkdirSync(path.join(dir, 'renderer', 'js'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'renderer'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'renderer', 'js', 'clean.js'), '// clean\n');
  fs.writeFileSync(path.join(dir, 'renderer', 'index.html'), '<!doctype html><html><body><script src="../' + prefix + '/x.js"></script></body></html>');
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL index.html loads phase contracts', r.artifact && r.artifact.violations.some(v => v.code === 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS'));
}

// ── Codex D2 Round 1 RN-10 closure — malformed state.json entries fail closed ──
// Build a synthetic state.json with each shape defect and confirm the script fails.
function runWithSyntheticState(phase, stateJson, sceneSrc) {
  const tmpArt = H.acquireTempDir('r3-phase-noc-art-');
  const tmpScan = H.acquireTempDir('r3-phase-noc-scan-');
  const tmpState = path.join(tmpArt, 'state.json');
  fs.mkdirSync(path.join(tmpScan, 'renderer', 'js'), { recursive: true });
  fs.writeFileSync(path.join(tmpScan, 'renderer', 'js', 'maybe-consumer.js'), sceneSrc || '// clean\n');
  fs.writeFileSync(path.join(tmpScan, 'renderer', 'index.html'), '<!doctype html><html><body></body></html>');
  fs.writeFileSync(path.join(tmpScan, 'main.js'), '// no consumer\n');
  fs.writeFileSync(path.join(tmpScan, 'preload.js'), '// no consumer\n');
  fs.writeFileSync(tmpState, JSON.stringify(stateJson));
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmpArt, R3_PHASE_PROGRAM: phase, R3_PHASE_NO_CONSUMER_BASE_OVERRIDE: tmpScan, R3_PHASE_STATE_FILE_OVERRIDE: tmpState });
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmpArt, ARTIFACT[phase] || 'r3-phase-no-consumer.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact };
}

(function rn10Tests() {
  const consumerSrc = 'var c = require("../../contracts/r3.0d/index.js");\nmodule.exports = c;\n';
  const goodEnabled = ['contract_foundation_present', 'evidence_graph_present'];
  // missing capability
  const r1 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D2_EVIDENCE_GRAPH', authorizedProductionPaths: [{ path: 'renderer/js/maybe-consumer.js' }], enabledCapabilities: goodEnabled, runtimeConsumersAllowed: true, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: true }, consumerSrc);
  chk('RN-10 missing capability key → fail closed', r1.status !== 0 && r1.artifact && r1.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_PATH_ENTRY_INVALID'));
  // extra key
  const r2 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D2_EVIDENCE_GRAPH', authorizedProductionPaths: [{ path: 'renderer/js/maybe-consumer.js', capability: 'evidence_graph_present', extra: 1 }], enabledCapabilities: goodEnabled, runtimeConsumersAllowed: true, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: true }, consumerSrc);
  chk('RN-10 extra own key → fail closed', r2.status !== 0 && r2.artifact && r2.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_PATH_ENTRY_INVALID'));
  // forbidden .. path
  const r3 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D2_EVIDENCE_GRAPH', authorizedProductionPaths: [{ path: '../renderer/js/x.js', capability: 'evidence_graph_present' }], enabledCapabilities: goodEnabled, runtimeConsumersAllowed: true, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: true }, consumerSrc);
  chk('RN-10 .. in path → fail closed', r3.status !== 0 && r3.artifact && r3.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_PATH_GRAMMAR_INVALID'));
  // glob char
  const r4 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D2_EVIDENCE_GRAPH', authorizedProductionPaths: [{ path: 'renderer/js/*.js', capability: 'evidence_graph_present' }], enabledCapabilities: goodEnabled, runtimeConsumersAllowed: true, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: true }, consumerSrc);
  chk('RN-10 glob char in path → fail closed', r4.status !== 0 && r4.artifact && r4.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_PATH_GRAMMAR_INVALID'));
  // duplicate entries
  const r5 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D2_EVIDENCE_GRAPH', authorizedProductionPaths: [{ path: 'renderer/js/x.js', capability: 'evidence_graph_present' }, { path: 'renderer/js/x.js', capability: 'evidence_graph_present' }], enabledCapabilities: goodEnabled, runtimeConsumersAllowed: true, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: true }, '// clean\n');
  chk('RN-10 duplicate entry → fail closed', r5.status !== 0 && r5.artifact && r5.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_PATH_DUPLICATE'));
  // any malformed entry forces the allow set to empty (defence-in-depth)
  chk('RN-10 malformed allow set is empty (defence in depth)', r1.artifact && r1.artifact.authorizedPathCount === 0);
  // Round 2 follow-up: capability whitespace → fail closed
  const r6 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D2_EVIDENCE_GRAPH', authorizedProductionPaths: [{ path: 'renderer/js/r3-0d-evidence-graph.js', capability: ' evidence_graph_present' }], enabledCapabilities: goodEnabled, runtimeConsumersAllowed: true, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: true }, '// clean\n');
  chk('RN-10 r2: capability with leading whitespace → fail closed', r6.status !== 0 && r6.artifact && r6.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_CAPABILITY_GRAMMAR_INVALID'));
  // unknown capability
  const r7 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D2_EVIDENCE_GRAPH', authorizedProductionPaths: [{ path: 'renderer/js/r3-0d-evidence-graph.js', capability: 'not_a_real_cap' }], enabledCapabilities: goodEnabled, runtimeConsumersAllowed: true, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: true }, '// clean\n');
  chk('RN-10 r2: unknown capability → fail closed', r7.status !== 0 && r7.artifact && r7.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_CAPABILITY_UNKNOWN'));
  // capability not enabled
  const r8 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D2_EVIDENCE_GRAPH', authorizedProductionPaths: [{ path: 'renderer/js/r3-0d-evidence-graph.js', capability: 'evidence_graph_present' }], enabledCapabilities: ['contract_foundation_present'], runtimeConsumersAllowed: true, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: true }, '// clean\n');
  chk('RN-10 r2: capability not enabled → fail closed', r8.status !== 0 && r8.artifact && r8.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_CAPABILITY_NOT_ENABLED'));
  // capability below floor
  const r9 = runWithSyntheticState('R3.0D', { schemaVersion: 1, program: 'R3.0D', currentCheckpoint: 'D1_CONTRACT_FOUNDATION', authorizedProductionPaths: [{ path: 'renderer/js/r3-0d-evidence-graph.js', capability: 'evidence_graph_present' }], enabledCapabilities: ['contract_foundation_present', 'evidence_graph_present'], runtimeConsumersAllowed: false, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: false }, '// clean\n');
  chk('RN-10 r2: capability below floor → fail closed', r9.status !== 0 && r9.artifact && r9.artifact.violations.some(v => v.code === 'STATE_AUTHORIZED_CAPABILITY_BELOW_FLOOR'));
})();

// ── Codex D2 Round 1 RN-11 closure — suspected dynamic phase require detector ──
(function rn11Tests() {
  for (const phase of PHASES) {
    const prefix = CONTRACT_PREFIX[phase];
    // file contains string-concat-near-require AND r3.0d/e/f literal somewhere
    const sceneSrc = "var prefix = '../../contracts/';\nvar phase = '" + prefix.split('/').pop() + "';\nvar p = prefix + phase + '/index.js';\nvar c = require(p);\nmodule.exports = c;\n";
    const tmpScan = H.acquireTempDir('r3-phase-noc-scan-');
    fs.mkdirSync(path.join(tmpScan, 'renderer', 'js'), { recursive: true });
    fs.writeFileSync(path.join(tmpScan, 'renderer', 'js', 'sneaky.js'), sceneSrc);
    fs.writeFileSync(path.join(tmpScan, 'renderer', 'index.html'), '<!doctype html><html><body></body></html>');
    fs.writeFileSync(path.join(tmpScan, 'main.js'), '// no consumer\n');
    fs.writeFileSync(path.join(tmpScan, 'preload.js'), '// no consumer\n');
    const r = runValidator(phase, tmpScan);
    chk(phase + ' RN-11 string-concat dynamic phase require flagged', r.artifact && r.artifact.violations.some(v => v.code === 'PROD_SUSPECTED_DYNAMIC_PHASE_REQUIRE'));
  }
})();

// ── Codex D2 Round 2 RN-11 follow-up — broader template-literal + fragment heuristic ──
(function rn11Round2Tests() {
  for (const phase of PHASES) {
    const phaseTail = CONTRACT_PREFIX[phase].split('/').pop().slice(-2); // '0d' | '0e' | '0f'
    // Template literal split: `${"r3"}.0d` — round 1 detector missed this; round 2 must catch.
    const sceneSrc = "var p = '../../contracts/' + `${\"r3\"}.` + '" + phaseTail + "/index.js';\nvar c = require(p);\nmodule.exports = c;\n";
    const tmpScan = H.acquireTempDir('r3-phase-noc-scan-tmpl-');
    fs.mkdirSync(path.join(tmpScan, 'renderer', 'js'), { recursive: true });
    fs.writeFileSync(path.join(tmpScan, 'renderer', 'js', 'tmpl-sneaky.js'), sceneSrc);
    fs.writeFileSync(path.join(tmpScan, 'renderer', 'index.html'), '<!doctype html><html><body></body></html>');
    fs.writeFileSync(path.join(tmpScan, 'main.js'), '// no consumer\n');
    fs.writeFileSync(path.join(tmpScan, 'preload.js'), '// no consumer\n');
    const r = runValidator(phase, tmpScan);
    chk(phase + ' RN-11 r2: template-literal split require flagged', r.artifact && r.artifact.violations.some(v => v.code === 'PROD_SUSPECTED_DYNAMIC_PHASE_REQUIRE'));
  }
})();

H.cleanupAll();
console.log('phase-no-consumer: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
