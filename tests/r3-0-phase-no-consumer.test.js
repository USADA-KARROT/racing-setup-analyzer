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
const os = require('os');

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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-phase-noc-art-'));
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp, R3_PHASE_PROGRAM: phase });
  if (scanBase) env.R3_PHASE_NO_CONSUMER_BASE_OVERRIDE = scanBase;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, ARTIFACT[phase] || 'r3-phase-no-consumer.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr || '', stdout: r.stdout || '', tmp };
}

function buildSyntheticTree(consumerLine) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-phase-noc-tree-'));
  fs.mkdirSync(path.join(dir, 'renderer', 'js'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'renderer'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'renderer', 'js', 'maybe-consumer.js'), consumerLine || '// no consumer\nmodule.exports = {};\n');
  fs.writeFileSync(path.join(dir, 'renderer', 'index.html'), '<!doctype html><html><body><script src="js/maybe-consumer.js"></script></body></html>');
  fs.writeFileSync(path.join(dir, 'main.js'), '// no R3 phase consumer\n');
  fs.writeFileSync(path.join(dir, 'preload.js'), '// no preload consumer\n');
  return dir;
}

// ── PASS: real repo ──
for (const phase of PHASES) {
  const r = runValidator(phase, null);
  chk(phase + ' PASS real repo rc=0', r.status === 0, { status: r.status, violations: r.artifact && r.artifact.violations });
  chk(phase + ' PASS no consumer count=0', r.artifact && r.artifact.runtimeConsumerCount === 0);
  chk(phase + ' PASS contractPrefix=' + CONTRACT_PREFIX[phase], r.artifact && r.artifact.contractPrefix === CONTRACT_PREFIX[phase]);
}

// ── FAIL: missing R3_PHASE_PROGRAM ──
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-phase-noc-art-'));
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp });
  delete env.R3_PHASE_PROGRAM;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, 'r3-phase-no-consumer.json'), 'utf8')); } catch (_) { artifact = null; }
  chk('FAIL missing R3_PHASE_PROGRAM rc=1', r.status === 1);
  chk('FAIL missing R3_PHASE_PROGRAM artifact PHASE_PROGRAM_INVALID', artifact && Array.isArray(artifact.violations) && artifact.violations.some(v => v.code === 'PHASE_PROGRAM_INVALID'));
}

// ── FAIL: synthetic renderer/js/ file requires contracts/<phase>/ ──
for (const phase of PHASES) {
  const prefix = CONTRACT_PREFIX[phase];
  const tree = buildSyntheticTree('var c = require("../../' + prefix + '/index.js");\nmodule.exports = c;\n');
  const r = runValidator(phase, tree);
  chk(phase + ' FAIL synthetic consumer rc!=0', r.status !== 0);
  chk(phase + ' FAIL synthetic consumer detected', r.artifact && r.artifact.runtimeConsumerCount > 0);
  chk(phase + ' FAIL synthetic consumer PROD_REQUIRES_PHASE_CONTRACTS', r.artifact && r.artifact.violations.some(v => v.code === 'PROD_REQUIRES_PHASE_CONTRACTS'));
}

// ── FAIL: synthetic index.html loads contracts/<phase>/ script ──
for (const phase of PHASES) {
  const prefix = CONTRACT_PREFIX[phase];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-phase-noc-html-'));
  fs.mkdirSync(path.join(dir, 'renderer', 'js'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'renderer'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'renderer', 'js', 'clean.js'), '// clean\n');
  fs.writeFileSync(path.join(dir, 'renderer', 'index.html'), '<!doctype html><html><body><script src="../' + prefix + '/x.js"></script></body></html>');
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL index.html loads phase contracts', r.artifact && r.artifact.violations.some(v => v.code === 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS'));
}

console.log('phase-no-consumer: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
