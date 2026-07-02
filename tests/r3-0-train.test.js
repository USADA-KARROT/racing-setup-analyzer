/**
 * tests/r3-0-train.test.js — R3.0 Integrated Delivery Train cross-phase + scope-pin + lineage validator.
 *
 * Covers scripts/check-r3-0-train.js. Real-repo PASS path AND a comprehensive adversarial battery:
 *   1. legal initial train PASS
 *   2. phase跳級 / D早於C8 / E早於D / F早於E FAIL
 *   3. capability倒退 FAIL
 *   4. 路徑 wildcard / regex / glob / absolute / .. FAIL (covered in phase governance tests)
 *   5. 移除已授權path FAIL
 *   6. 未知 phase / checkpoint / capability FAIL (cross-validated via R4 prefix etc)
 *   7. governanceChanged 缺失 FAIL
 *   8. validator弱化與feature加入同commit FAIL (heuristic via governance file touch w/ flag false)
 *   9. checkpoint SHA / artifactBoundSha 不符 FAIL
 *  10. intermediate release=true FAIL
 *  11. targetVersion非2.0.0 FAIL
 *  12. cross-session=true FAIL
 *  13. reference auto-selection 啟用 FAIL
 *  14. R4.0 capability FAIL
 *  15. R3.0B case-record schema修改 (authorized path) FAIL
 *
 * Fixtures: a temp directory tree that copies the real governance/ structure and mutates one
 * specific file or field per test. R3_TRAIN_BASE_OVERRIDE points to that tree so the real repo is
 * never mutated.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const H = require('./helpers/managed-temp-dir.js');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/check-r3-0-train.js';

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

function runValidator(base) {
  const tmp = H.acquireTempDir('r3-train-art-');
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp });
  if (base) env.R3_TRAIN_BASE_OVERRIDE = base;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, 'r3-0-train.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr || '', stdout: r.stdout || '', tmp };
}

function hasViolation(artifact, code) {
  return !!(artifact && Array.isArray(artifact.violations) && artifact.violations.some(v => v.code === code));
}

function buildFixture() {
  const dir = H.acquireTempDir('r3-train-fix-');
  fs.mkdirSync(path.join(dir, 'governance'), { recursive: true });
  for (const sub of ['r3.0', 'r3.0c', 'r3.0d', 'r3.0e', 'r3.0f']) {
    fs.cpSync(path.join(REPO, 'governance', sub), path.join(dir, 'governance', sub), { recursive: true });
  }
  return dir;
}

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function writeJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2)); }

// ── 1. legal initial train (real repo) ──
{
  const r = runValidator(null);
  chk('PASS real repo rc=0', r.status === 0, { violations: r.artifact && r.artifact.violations });
  chk('PASS artifact ok=true', r.artifact && r.artifact.ok === true);
  // F6: the Train PR (#16) is merged to main (0711e74a) — MERGED is the correct terminal
  // status per train.schema.json trainStatusValues; IN_PROGRESS would now be stale.
  chk('PASS trainStatus=MERGED', r.artifact && r.artifact.trainStatus === 'MERGED');
  chk('PASS currentPhase is a valid R3.0 phase', r.artifact && ['R3.0C', 'R3.0D', 'R3.0E', 'R3.0F'].indexOf(r.artifact.currentPhase) !== -1);
  chk('PASS targetVersion=2.0.0', r.artifact && r.artifact.targetVersion === '2.0.0');
  chk('PASS targetTag=v2.0.0', r.artifact && r.artifact.targetTag === 'v2.0.0');
  chk('PASS intermediateReleaseAllowed=false', r.artifact && r.artifact.intermediateReleaseAllowed === false);
  chk('PASS r4Excluded=true', r.artifact && r.artifact.r4Excluded === true);
  chk('PASS all 4 phases summarized', r.artifact && r.artifact.phases && Object.keys(r.artifact.phases).length === 4);
}

// ── 2a. D current=D2 but R3.0C still at C7_UI (pre-C8) → CROSS_PHASE_PREMATURE_ADVANCE ──
// Note: the real-repo governance is at C8_ACTIVATION after activation; the fixture must roll the
// R3.0C copy back to a pre-C8 checkpoint to recreate the "D advancing before C8 reached" premise.
{
  const dir = buildFixture();
  const cs = readJson(path.join(dir, 'governance', 'r3.0c', 'state.json'));
  cs.currentCheckpoint = 'C7_UI'; cs.featureRegistryActivationAllowed = false;
  cs.enabledCapabilities = (cs.enabledCapabilities || []).filter(c => c !== 'feature_registry_active');
  cs.authorizedProductionPaths = (cs.authorizedProductionPaths || []).filter(e => !(e && e.capability === 'feature_registry_active'));
  writeJson(path.join(dir, 'governance', 'r3.0c', 'state.json'), cs);
  const ds = readJson(path.join(dir, 'governance', 'r3.0d', 'state.json'));
  ds.currentCheckpoint = 'D2_EVIDENCE_GRAPH'; ds.authorizedProductionPaths = []; ds.enabledCapabilities = [];
  writeJson(path.join(dir, 'governance', 'r3.0d', 'state.json'), ds);
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.phaseStates['R3.0C'].currentCheckpoint = 'C7_UI'; ts.phaseStates['R3.0C'].finalActivationReached = false;
  ts.currentPhaseCheckpoint = 'C7_UI';
  ts.phaseStates['R3.0D'].currentCheckpoint = 'D2_EVIDENCE_GRAPH';
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL D before C8 rc!=0', r.status !== 0);
  chk('FAIL D before C8 CROSS_PHASE_PREMATURE_ADVANCE', hasViolation(r.artifact, 'CROSS_PHASE_PREMATURE_ADVANCE'));
}

// ── 2b. E current=E2 but R3.0D still at D4 (pre-D5) ──
// Note: the real-repo governance is at D5_ENGINEER_BRIEF_ACTIVATION after activation; the
// fixture must roll the R3.0D copy back to a pre-D5 checkpoint to recreate the "E advancing
// before D5 reached" premise. Mirror the 2a pattern (which rolls R3.0C back to C7_UI).
{
  const dir = buildFixture();
  const ds = readJson(path.join(dir, 'governance', 'r3.0d', 'state.json'));
  ds.currentCheckpoint = 'D4_PRIORITY_ENGINE'; ds.uiAllowed = false; ds.featureRegistryActivationAllowed = false;
  writeJson(path.join(dir, 'governance', 'r3.0d', 'state.json'), ds);
  const es = readJson(path.join(dir, 'governance', 'r3.0e', 'state.json'));
  es.currentCheckpoint = 'E2_EXPERIMENT_STORE';
  writeJson(path.join(dir, 'governance', 'r3.0e', 'state.json'), es);
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.phaseStates['R3.0D'].currentCheckpoint = 'D4_PRIORITY_ENGINE';
  ts.phaseStates['R3.0D'].finalActivationReached = false;
  ts.phaseStates['R3.0E'].currentCheckpoint = 'E2_EXPERIMENT_STORE';
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL E before D5 CROSS_PHASE_PREMATURE_ADVANCE', hasViolation(r.artifact, 'CROSS_PHASE_PREMATURE_ADVANCE'));
}

// ── 2c. F current=F1 but R3.0E NOT yet at E5 ──
{
  const dir = buildFixture();
  // Force R3.0E back to E2 (pre-E5) for this test scenario.
  const es = readJson(path.join(dir, 'governance', 'r3.0e', 'state.json'));
  es.currentCheckpoint = 'E2_EXPERIMENT_STORE';
  writeJson(path.join(dir, 'governance', 'r3.0e', 'state.json'), es);
  const fs2 = readJson(path.join(dir, 'governance', 'r3.0f', 'state.json'));
  fs2.currentCheckpoint = 'F1_MIGRATION_ENGINE';
  writeJson(path.join(dir, 'governance', 'r3.0f', 'state.json'), fs2);
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.phaseStates['R3.0E'].currentCheckpoint = 'E2_EXPERIMENT_STORE';
  ts.phaseStates['R3.0E'].finalActivationReached = false;
  ts.phaseStates['R3.0F'].currentCheckpoint = 'F1_MIGRATION_ENGINE';
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL F before E5 CROSS_PHASE_PREMATURE_ADVANCE', hasViolation(r.artifact, 'CROSS_PHASE_PREMATURE_ADVANCE'));
}

// ── 3. capability regression across D checkpoint manifests ──
{
  const dir = buildFixture();
  // Inject an extra checkpoint manifest D2 that drops an earlier capability D1 listed.
  const d1 = { schemaVersion: 1, program: 'R3.0D', checkpoint: 'D1_CONTRACT_FOUNDATION', baseSha: 'x', headSha: 'x',
    previousCheckpoint: 'D0_BOOTSTRAP', authorizedPaths: [], enabledCapabilitiesBefore: [], enabledCapabilitiesAfter: ['contract_foundation_present'],
    forbiddenCapabilities: [], tests: null, workflowRunId: null, artifactId: null, artifactBoundSha: null, codexVerdict: null,
    frozenDiff: 0, productionDiff: 0, runtimeConsumerCount: 0, featureRegistryState: {}, packageVersion: '1.4.0', createdAt: null,
    status: 'pending', governanceChanged: false, crossPhaseGate: { r3cCheckpoint: 'C8_ACTIVATION', requiredFor: 'D1_CONTRACT_FOUNDATION', satisfied: true } };
  const d2 = Object.assign({}, d1, { checkpoint: 'D2_EVIDENCE_GRAPH', previousCheckpoint: 'D1_CONTRACT_FOUNDATION', enabledCapabilitiesBefore: ['contract_foundation_present'], enabledCapabilitiesAfter: [] });
  writeJson(path.join(dir, 'governance', 'r3.0d', 'checkpoints', 'D1.json'), d1);
  writeJson(path.join(dir, 'governance', 'r3.0d', 'checkpoints', 'D2.json'), d2);
  const r = runValidator(dir);
  chk('FAIL capability regression CAPABILITY_REGRESSION', hasViolation(r.artifact, 'CAPABILITY_REGRESSION'));
}

// ── 4. authorized path removed across checkpoints ──
{
  const dir = buildFixture();
  const d1 = { schemaVersion: 1, program: 'R3.0D', checkpoint: 'D1_CONTRACT_FOUNDATION', baseSha: 'x', headSha: 'x',
    previousCheckpoint: 'D0_BOOTSTRAP', authorizedPaths: ['renderer/js/adapter.js'], enabledCapabilitiesBefore: [], enabledCapabilitiesAfter: ['contract_foundation_present'],
    forbiddenCapabilities: [], tests: null, workflowRunId: null, artifactId: null, artifactBoundSha: null, codexVerdict: null,
    frozenDiff: 0, productionDiff: 0, runtimeConsumerCount: 0, featureRegistryState: {}, packageVersion: '1.4.0', createdAt: null,
    status: 'pending', governanceChanged: false, crossPhaseGate: { r3cCheckpoint: 'C8_ACTIVATION', requiredFor: 'D1_CONTRACT_FOUNDATION', satisfied: true } };
  const d2 = Object.assign({}, d1, { checkpoint: 'D2_EVIDENCE_GRAPH', previousCheckpoint: 'D1_CONTRACT_FOUNDATION', authorizedPaths: [] });
  writeJson(path.join(dir, 'governance', 'r3.0d', 'checkpoints', 'D1.json'), d1);
  writeJson(path.join(dir, 'governance', 'r3.0d', 'checkpoints', 'D2.json'), d2);
  const r = runValidator(dir);
  chk('FAIL authorized path removed AUTHORIZED_PATH_REMOVED', hasViolation(r.artifact, 'AUTHORIZED_PATH_REMOVED'));
}

// ── 5. governanceChanged flag missing when changedFiles touches governance ──
{
  const dir = buildFixture();
  const manifest = { schemaVersion: 1, program: 'R3.0D', checkpoint: 'D1_CONTRACT_FOUNDATION', baseSha: 'x', headSha: 'x',
    previousCheckpoint: 'D0_BOOTSTRAP', authorizedPaths: [], enabledCapabilitiesBefore: [], enabledCapabilitiesAfter: [],
    forbiddenCapabilities: [], tests: null, workflowRunId: null, artifactId: null, artifactBoundSha: null, codexVerdict: null,
    frozenDiff: 0, productionDiff: 0, runtimeConsumerCount: 0, featureRegistryState: {}, packageVersion: '1.4.0', createdAt: null,
    status: 'pending', governanceChanged: false, crossPhaseGate: { r3cCheckpoint: 'C8_ACTIVATION', requiredFor: 'D1_CONTRACT_FOUNDATION', satisfied: true },
    changedFiles: ['governance/r3.0d/schema.json', 'scripts/check-r3-phase-governance.js'] };
  writeJson(path.join(dir, 'governance', 'r3.0d', 'checkpoints', 'D1.json'), manifest);
  const r = runValidator(dir);
  chk('FAIL governanceChanged flag missing GOVERNANCE_CHANGED_FLAG_MISSING', hasViolation(r.artifact, 'GOVERNANCE_CHANGED_FLAG_MISSING'));
}

// ── 6. artifactBoundSha != headSha ──
{
  const dir = buildFixture();
  const manifest = { schemaVersion: 1, program: 'R3.0D', checkpoint: 'D1_CONTRACT_FOUNDATION', baseSha: 'x', headSha: 'aaa',
    previousCheckpoint: 'D0_BOOTSTRAP', authorizedPaths: [], enabledCapabilitiesBefore: [], enabledCapabilitiesAfter: [],
    forbiddenCapabilities: [], tests: null, workflowRunId: null, artifactId: null, artifactBoundSha: 'bbb', codexVerdict: null,
    frozenDiff: 0, productionDiff: 0, runtimeConsumerCount: 0, featureRegistryState: {}, packageVersion: '1.4.0', createdAt: null,
    status: 'pending', governanceChanged: true, crossPhaseGate: { r3cCheckpoint: 'C8_ACTIVATION', requiredFor: 'D1_CONTRACT_FOUNDATION', satisfied: true } };
  writeJson(path.join(dir, 'governance', 'r3.0d', 'checkpoints', 'D1.json'), manifest);
  const r = runValidator(dir);
  chk('FAIL artifact SHA mismatch ARTIFACT_BOUND_SHA_MISMATCH', hasViolation(r.artifact, 'ARTIFACT_BOUND_SHA_MISMATCH'));
}

// ── 7. PASS status without artifactBoundSha == headSha ──
{
  const dir = buildFixture();
  const manifest = { schemaVersion: 1, program: 'R3.0D', checkpoint: 'D1_CONTRACT_FOUNDATION', baseSha: 'x', headSha: 'aaa',
    previousCheckpoint: 'D0_BOOTSTRAP', authorizedPaths: [], enabledCapabilitiesBefore: [], enabledCapabilitiesAfter: [],
    forbiddenCapabilities: [], tests: null, workflowRunId: null, artifactId: null, artifactBoundSha: null, codexVerdict: null,
    frozenDiff: 0, productionDiff: 0, runtimeConsumerCount: 0, featureRegistryState: {}, packageVersion: '1.4.0', createdAt: null,
    status: 'PASS', governanceChanged: true, crossPhaseGate: { r3cCheckpoint: 'C8_ACTIVATION', requiredFor: 'D1_CONTRACT_FOUNDATION', satisfied: true } };
  writeJson(path.join(dir, 'governance', 'r3.0d', 'checkpoints', 'D1.json'), manifest);
  const r = runValidator(dir);
  chk('FAIL PASS without bound SHA PASS_REQUIRES_ARTIFACT_BOUND_SHA', hasViolation(r.artifact, 'PASS_REQUIRES_ARTIFACT_BOUND_SHA'));
}

// ── 8. intermediateReleaseAllowed=true (state mirror) ──
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.intermediateReleaseAllowed = true;
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL intermediate release allowed', hasViolation(r.artifact, 'TRAIN_INTERMEDIATE_RELEASE_ALLOWED'));
}

// ── 9. targetVersion != 2.0.0 ──
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.targetVersion = '1.9.0';
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL targetVersion wrong', hasViolation(r.artifact, 'TRAIN_TARGET_VERSION_WRONG'));
}

// ── 10. targetTag != v2.0.0 ──
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.targetTag = 'v1.9.0';
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL targetTag wrong', hasViolation(r.artifact, 'TRAIN_TARGET_TAG_WRONG'));
}

// ── 11. scope pin: cross-session allowed=true (schema) ──
{
  const dir = buildFixture();
  const sch = readJson(path.join(dir, 'governance', 'r3.0', 'train.schema.json'));
  sch.scopePin.comparisonScope.crossSessionForbidden = false;
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.schema.json'), sch);
  const r = runValidator(dir);
  chk('FAIL cross-session allowed (schema)', hasViolation(r.artifact, 'SCOPE_PIN_SCHEMA_CROSS_SESSION_ALLOWED'));
}

// ── 12. scope pin: same-case = false (state mirror) ──
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.scopePinMirror.comparisonScope.sameAnalysisCaseOnly = false;
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL same-case not true (mirror)', hasViolation(r.artifact, 'TRAIN_SCOPE_PIN_MIRROR_SAME_CASE_NOT_TRUE'));
}

// ── 13. scope pin: fastest_valid enabled (schema) ──
{
  const dir = buildFixture();
  const sch = readJson(path.join(dir, 'governance', 'r3.0', 'train.schema.json'));
  sch.scopePin.referenceSelectionPolicy.fastestValidEnabled = true;
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.schema.json'), sch);
  const r = runValidator(dir);
  chk('FAIL fastest_valid enabled', hasViolation(r.artifact, 'SCOPE_PIN_FASTEST_VALID_ENABLED'));
}

// ── 14. scope pin: best_sector_composite enabled (state mirror) ──
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.scopePinMirror.referenceSelectionPolicy.bestSectorCompositeEnabled = true;
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL best_sector_composite enabled (mirror)', hasViolation(r.artifact, 'TRAIN_SCOPE_PIN_MIRROR_COMPOSITE_ENABLED'));
}

// ── 15. scope pin: hypothesis storage extends R3.0B (state mirror) ──
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.scopePinMirror.hypothesisStorage.extendR3bCaseRecordSchema = true;
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL hypothesis storage extends R3.0B', hasViolation(r.artifact, 'TRAIN_SCOPE_PIN_MIRROR_HYPOTHESIS_EXTENDS_R3B'));
}

// ── 16. scope pin: R4 not excluded (schema) ──
{
  const dir = buildFixture();
  const sch = readJson(path.join(dir, 'governance', 'r3.0', 'train.schema.json'));
  sch.scopePin.r4Exclusion.r4Excluded = false;
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.schema.json'), sch);
  const r = runValidator(dir);
  chk('FAIL R4 not excluded (schema)', hasViolation(r.artifact, 'SCOPE_PIN_R4_NOT_EXCLUDED'));
}

// ── 17. R4 capability injected into R3.0D schema ──
{
  const dir = buildFixture();
  const dsch = readJson(path.join(dir, 'governance', 'r3.0d', 'schema.json'));
  dsch.capabilities.push('r4_closed_loop_present');
  dsch.capabilityUnlockFloor['r4_closed_loop_present'] = 'D5_ENGINEER_BRIEF_ACTIVATION';
  writeJson(path.join(dir, 'governance', 'r3.0d', 'schema.json'), dsch);
  const r = runValidator(dir);
  chk('FAIL R4 capability present', hasViolation(r.artifact, 'R4_CAPABILITY_PRESENT'));
}

// ── 18. authorized path touches frozen R3.0B persistence path ──
{
  const dir = buildFixture();
  const manifest = { schemaVersion: 1, program: 'R3.0E', checkpoint: 'E2_EXPERIMENT_STORE', baseSha: 'x', headSha: 'x',
    previousCheckpoint: 'E1_CONTRACT_FOUNDATION', authorizedPaths: ['renderer/js/case-record-schema.js'], enabledCapabilitiesBefore: ['contract_foundation_present'], enabledCapabilitiesAfter: ['contract_foundation_present', 'experiment_store_present'],
    forbiddenCapabilities: [], tests: null, workflowRunId: null, artifactId: null, artifactBoundSha: null, codexVerdict: null,
    frozenDiff: 0, productionDiff: 0, runtimeConsumerCount: 0, featureRegistryState: {}, packageVersion: '1.4.0', createdAt: null,
    status: 'pending', governanceChanged: true, crossPhaseGate: { r3dCheckpoint: 'D5_ENGINEER_BRIEF_ACTIVATION', requiredFor: 'E2_EXPERIMENT_STORE', satisfied: true },
    r3bCaseRecordSchemaUntouched: true };
  writeJson(path.join(dir, 'governance', 'r3.0e', 'checkpoints', 'E2.json'), manifest);
  const r = runValidator(dir);
  chk('FAIL auth path touches R3.0B frozen', hasViolation(r.artifact, 'AUTH_PATH_TOUCHES_R3B_FROZEN'));
}

// ── 19. R3.0E checkpoint missing r3bCaseRecordSchemaUntouched=true ──
{
  const dir = buildFixture();
  const manifest = { schemaVersion: 1, program: 'R3.0E', checkpoint: 'E2_EXPERIMENT_STORE', baseSha: 'x', headSha: 'x',
    previousCheckpoint: 'E1_CONTRACT_FOUNDATION', authorizedPaths: ['renderer/js/experiment-store.js'], enabledCapabilitiesBefore: ['contract_foundation_present'], enabledCapabilitiesAfter: ['contract_foundation_present', 'experiment_store_present'],
    forbiddenCapabilities: [], tests: null, workflowRunId: null, artifactId: null, artifactBoundSha: null, codexVerdict: null,
    frozenDiff: 0, productionDiff: 0, runtimeConsumerCount: 0, featureRegistryState: {}, packageVersion: '1.4.0', createdAt: null,
    status: 'pending', governanceChanged: true, crossPhaseGate: { r3dCheckpoint: 'D5_ENGINEER_BRIEF_ACTIVATION', requiredFor: 'E2_EXPERIMENT_STORE', satisfied: true },
    r3bCaseRecordSchemaUntouched: false };
  writeJson(path.join(dir, 'governance', 'r3.0e', 'checkpoints', 'E2.json'), manifest);
  const r = runValidator(dir);
  chk('FAIL R3.0E missing r3bCaseRecordSchemaUntouched=true', hasViolation(r.artifact, 'R3B_CASE_RECORD_SCHEMA_FLAG_NOT_TRUE'));
}

// ── 20. R3.0F packageVersion drift before F6 ──
{
  const dir = buildFixture();
  const manifest = { schemaVersion: 1, program: 'R3.0F', checkpoint: 'F1_MIGRATION_ENGINE', baseSha: 'x', headSha: 'x',
    previousCheckpoint: 'F0_BOOTSTRAP', authorizedPaths: ['renderer/js/migration-engine.js'], enabledCapabilitiesBefore: [], enabledCapabilitiesAfter: ['migration_engine_present'],
    forbiddenCapabilities: [], tests: null, workflowRunId: null, artifactId: null, artifactBoundSha: null, codexVerdict: null,
    frozenDiff: 0, productionDiff: 0, runtimeConsumerCount: 0, featureRegistryState: {}, packageVersion: '1.5.0', createdAt: null,
    status: 'pending', governanceChanged: true, crossPhaseGate: { r3eCheckpoint: 'E5_ACTIVATION', requiredFor: 'F1_MIGRATION_ENGINE', satisfied: true },
    r3bCaseRecordSchemaUntouched: true, releaseRecord: null };
  writeJson(path.join(dir, 'governance', 'r3.0f', 'checkpoints', 'F1.json'), manifest);
  const r = runValidator(dir);
  chk('FAIL F1 packageVersion drift', hasViolation(r.artifact, 'R3F_PACKAGE_VERSION_DRIFT'));
}

// ── 21. train state missing required field ──
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  delete ts.targetVersion;
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL train state missing field', hasViolation(r.artifact, 'TRAIN_STATE_REQUIRED_FIELD_MISSING') || hasViolation(r.artifact, 'TRAIN_TARGET_VERSION_WRONG'));
}

// ── 22. train state vs phase state checkpoint mismatch ──
// Note: the real-repo R3.0D is at D5_ENGINEER_BRIEF_ACTIVATION post-activation. Inject a
// disagreement by changing train.json's R3.0D checkpoint to something the state.json copy
// does not match — D0_BOOTSTRAP is the canonical pre-start value.
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.phaseStates['R3.0D'].currentCheckpoint = 'D0_BOOTSTRAP'; // disagrees with state.json D5_ENGINEER_BRIEF_ACTIVATION
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL phase checkpoint mismatch', hasViolation(r.artifact, 'TRAIN_PHASE_CHECKPOINT_MISMATCH'));
}

// ── 23. invalid train status ──
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.trainStatus = 'BOGUS_STATUS';
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL invalid trainStatus', hasViolation(r.artifact, 'TRAIN_STATUS_INVALID'));
}

// ── 24. F6 release-mirror consistency (semantic ruling: release_executed = PUBLISHED only) ──
// Fixture helpers: mutate the F6 checkpoint / R3.0F state copies and expect the exact violation.
function f6Path(dir) { return path.join(dir, 'governance', 'r3.0f', 'checkpoints', 'F6.json'); }
function f6State(dir) { return path.join(dir, 'governance', 'r3.0f', 'state.json'); }
function mutateF6(fn) {
  const dir = buildFixture();
  const m = readJson(f6Path(dir));
  const st = readJson(f6State(dir));
  fn(m, st);
  writeJson(f6Path(dir), m); writeJson(f6State(dir), st);
  return runValidator(dir);
}

// mirror-1: tag recorded, no published Release, capability flipped on -> FAIL
{
  const r = mutateF6((m, st) => { st.enabledCapabilities.push('release_executed'); });
  chk('FAIL release_executed capability with tag+draft only', hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
}
// mirror-2: record flag releaseExecuted=true while Release is still a draft -> FAIL (both codes)
{
  const r = mutateF6((m) => { m.releaseRecord.releaseExecuted = true; });
  chk('FAIL releaseExecuted record flag on draft Release', hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_ON_DRAFT') && hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
}
// mirror-3: a genuinely published Release allows release_executed. The edit set below is
// EXACTLY schema releaseStages.publishForwardFields — the exhaustive forward-only publish
// mirror (stage, state, draft, published, publishedAt, record flag, capability); no other
// recorded evidence (tag SHAs, release id, mainMergeSha) is touched.
{
  const r = mutateF6((m, st) => {
    m.releaseStage = 'RELEASE_PUBLISHED';
    m.releaseRecord.githubRelease.state = 'PUBLISHED';
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00Z';
    m.releaseRecord.releaseExecuted = true;
    st.enabledCapabilities.push('release_executed');
  });
  chk('PASS-path: published Release permits release_executed (no mirror violations)', !hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH') && !hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_ON_DRAFT') && !hasViolation(r.artifact, 'R3F_RELEASE_STAGE_EVIDENCE_MISMATCH') && !hasViolation(r.artifact, 'R3F_RELEASE_STATE_FIELD_MISMATCH'));
}
// mirror-4: dmgUploaded=true with empty assets -> FAIL
{
  const r = mutateF6((m) => { m.releaseRecord.dmgUploaded = true; });
  chk('FAIL dmgUploaded=true with no .dmg asset', hasViolation(r.artifact, 'R3F_DMG_FLAG_WITHOUT_ASSET'));
}
// mirror-5: dmgUploaded=true with only a non-dmg asset -> still FAIL
{
  const r = mutateF6((m) => { m.releaseRecord.dmgUploaded = true; m.releaseRecord.githubRelease.assets = [{ name: 'notes.txt' }]; });
  chk('FAIL dmgUploaded=true with non-dmg asset only', hasViolation(r.artifact, 'R3F_DMG_FLAG_WITHOUT_ASSET'));
}
// mirror-6: empty assets but dmgUploaded not exactly false -> FAIL
{
  const r = mutateF6((m) => { delete m.releaseRecord.dmgUploaded; });
  chk('FAIL empty assets require dmgUploaded===false', hasViolation(r.artifact, 'R3F_DMG_FLAG_NOT_FALSE_ON_EMPTY_ASSETS'));
}
// mirror-7: tag target differs from the recorded main merge SHA -> FAIL
{
  const r = mutateF6((m) => { m.releaseRecord.tagTarget = '1661f1c16d584c96aec2fc1704f6dd730a86d480'; });
  chk('FAIL tagTarget != mainMergeSha', hasViolation(r.artifact, 'R3F_TAG_TARGET_MISMATCH'));
}
// mirror-8: wrong tag name -> FAIL
{
  const r = mutateF6((m) => { m.releaseRecord.tag = 'v2.0.1'; });
  chk('FAIL releaseRecord.tag != v2.0.0', hasViolation(r.artifact, 'R3F_RELEASE_TAG_WRONG'));
}
// mirror-9: Release tag_name diverging from the recorded tag -> FAIL
{
  const r = mutateF6((m) => { m.releaseRecord.githubRelease.tagName = 'v1.9.9'; });
  chk('FAIL githubRelease.tagName != releaseRecord.tag', hasViolation(r.artifact, 'R3F_RELEASE_TAG_NAME_MISMATCH'));
}
// mirror-10: stage rolled back to RELEASE_PREPARED while tag evidence exists -> FAIL (no history rewrite)
{
  const r = mutateF6((m) => { m.releaseStage = 'RELEASE_PREPARED'; });
  chk('FAIL stage may not lag recorded tag/Release evidence', hasViolation(r.artifact, 'R3F_RELEASE_STAGE_EVIDENCE_MISMATCH'));
}
// mirror-11: lightweight tag (or missing tag object) -> FAIL
{
  const r = mutateF6((m) => { m.releaseRecord.tagType = 'lightweight'; m.releaseRecord.tagObjectSha = m.releaseRecord.tagTarget; });
  chk('FAIL non-annotated tag record', hasViolation(r.artifact, 'R3F_TAG_NOT_ANNOTATED'));
}
// mirror-12: unknown releaseStage -> FAIL
{
  const r = mutateF6((m) => { m.releaseStage = 'RELEASE_SHIPPED'; });
  chk('FAIL unknown releaseStage', hasViolation(r.artifact, 'R3F_RELEASE_STAGE_UNKNOWN'));
}
// mirror-13 (MIRROR-R1-01): published flags but state field still DRAFT -> FAIL
{
  const r = mutateF6((m, st) => {
    m.releaseStage = 'RELEASE_PUBLISHED';
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00Z';
    m.releaseRecord.releaseExecuted = true;
    st.enabledCapabilities.push('release_executed');
    // state left as 'DRAFT' — contradictory record must be rejected
  });
  chk('FAIL state=DRAFT contradicting published flags', hasViolation(r.artifact, 'R3F_RELEASE_STATE_FIELD_MISMATCH') && hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
}
// mirror-14 (MIRROR-R1-02): releaseStage deleted -> FAIL
{
  const r = mutateF6((m) => { delete m.releaseStage; });
  chk('FAIL missing releaseStage', hasViolation(r.artifact, 'R3F_RELEASE_STAGE_MISSING'));
}
// mirror-15 (MIRROR-R1-02): schema releaseStages unreadable -> FAIL
{
  const dir = buildFixture();
  const sch = readJson(path.join(dir, 'governance', 'r3.0f', 'schema.json'));
  delete sch.releaseStages;
  writeJson(path.join(dir, 'governance', 'r3.0f', 'schema.json'), sch);
  const r = runValidator(dir);
  chk('FAIL schema releaseStages missing', hasViolation(r.artifact, 'R3F_RELEASE_STAGES_SCHEMA_MISSING'));
}
// mirror-16 (MIRROR-R1-03): bare-string asset entries are malformed AND never satisfy dmgUploaded
{
  const r = mutateF6((m) => { m.releaseRecord.dmgUploaded = true; m.releaseRecord.githubRelease.assets = ['app.dmg']; });
  chk('FAIL string asset entry rejected as malformed', hasViolation(r.artifact, 'R3F_RELEASE_ASSETS_MALFORMED') && hasViolation(r.artifact, 'R3F_DMG_FLAG_WITHOUT_ASSET'));
}
// mirror-17 (MIRROR-R1-04): whitespace/invalid publishedAt never counts as published
{
  const r = mutateF6((m, st) => {
    m.releaseStage = 'RELEASE_PUBLISHED';
    m.releaseRecord.githubRelease.state = 'PUBLISHED';
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '   ';
    m.releaseRecord.releaseExecuted = true;
    st.enabledCapabilities.push('release_executed');
  });
  chk('FAIL whitespace publishedAt rejected', hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH') && hasViolation(r.artifact, 'R3F_RELEASE_STAGE_EVIDENCE_MISMATCH'));
}
// mirror-18 (MIRROR-R2-02): assets deleted entirely -> FAIL (no silent skip)
{
  const r = mutateF6((m) => { delete m.releaseRecord.githubRelease.assets; });
  chk('FAIL missing assets array', hasViolation(r.artifact, 'R3F_RELEASE_ASSETS_MISSING'));
}
// mirror-19 (MIRROR-R2-02): assets as a non-array -> FAIL
{
  const r = mutateF6((m) => { m.releaseRecord.githubRelease.assets = 'none'; });
  chk('FAIL non-array assets', hasViolation(r.artifact, 'R3F_RELEASE_ASSETS_MISSING'));
}
// mirror-20 (MIRROR-R3-01): deleting state cannot bypass the mandatory state advance
{
  const r = mutateF6((m, st) => {
    m.releaseStage = 'RELEASE_PUBLISHED';
    delete m.releaseRecord.githubRelease.state;
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00Z';
    m.releaseRecord.releaseExecuted = true;
    st.enabledCapabilities.push('release_executed');
  });
  chk('FAIL missing state field blocks release_executed', hasViolation(r.artifact, 'R3F_RELEASE_STATE_FIELD_MISSING') && hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
}
// mirror-21 (MIRROR-R3-02): impossible calendar date in publishedAt never counts as published
{
  const r = mutateF6((m, st) => {
    m.releaseStage = 'RELEASE_PUBLISHED';
    m.releaseRecord.githubRelease.state = 'PUBLISHED';
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '2026-02-30T05:00:00Z';
    m.releaseRecord.releaseExecuted = true;
    st.enabledCapabilities.push('release_executed');
  });
  chk('FAIL impossible publishedAt date (2026-02-30) rejected', hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
}
// mirror-22 (MIRROR-R4-01): absurd timezone offset in publishedAt never counts as published
{
  const r = mutateF6((m, st) => {
    m.releaseStage = 'RELEASE_PUBLISHED';
    m.releaseRecord.githubRelease.state = 'PUBLISHED';
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00+99:99';
    m.releaseRecord.releaseExecuted = true;
    st.enabledCapabilities.push('release_executed');
  });
  chk('FAIL invalid timezone offset (+99:99) rejected', hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
}
// mirror-23 (MIRROR-R4-02): stage stuck at TAGGED_DRAFT while the Release is published -> FAIL
{
  const r = mutateF6((m) => {
    m.releaseRecord.githubRelease.state = 'PUBLISHED';
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00Z';
    // releaseStage left at RELEASE_TAGGED_DRAFT — stage may not lag published evidence
  });
  chk('FAIL stage lags published evidence', hasViolation(r.artifact, 'R3F_RELEASE_STAGE_EVIDENCE_MISMATCH'));
}
// mirror-24 (MIRROR-R4-03): weakening/removing releaseExecutedRequiresStage is itself a violation
{
  const dir = buildFixture();
  const sch = readJson(path.join(dir, 'governance', 'r3.0f', 'schema.json'));
  sch.releaseStages.releaseExecutedRequiresStage = 'RELEASE_TAGGED_DRAFT';
  writeJson(path.join(dir, 'governance', 'r3.0f', 'schema.json'), sch);
  const r = runValidator(dir);
  chk('FAIL weakened releaseExecutedRequiresStage', hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_STAGE_RULE_INVALID'));
  const dir2 = buildFixture();
  const sch2 = readJson(path.join(dir2, 'governance', 'r3.0f', 'schema.json'));
  delete sch2.releaseStages.releaseExecutedRequiresStage;
  writeJson(path.join(dir2, 'governance', 'r3.0f', 'schema.json'), sch2);
  const r2 = runValidator(dir2);
  chk('FAIL missing releaseExecutedRequiresStage', hasViolation(r2.artifact, 'R3F_RELEASE_EXECUTED_STAGE_RULE_INVALID'));
}
// mirror-25 (MIRROR-R5-01): +14:59 offset is beyond the +/-14:00 hard cap
{
  const r = mutateF6((m, st) => {
    m.releaseStage = 'RELEASE_PUBLISHED';
    m.releaseRecord.githubRelease.state = 'PUBLISHED';
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00+14:59';
    m.releaseRecord.releaseExecuted = true;
    st.enabledCapabilities.push('release_executed');
  });
  chk('FAIL offset beyond +/-14:00 cap rejected', hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
  const r2 = mutateF6((m, st) => {
    m.releaseStage = 'RELEASE_PUBLISHED';
    m.releaseRecord.githubRelease.state = 'PUBLISHED';
    m.releaseRecord.githubRelease.draft = false;
    m.releaseRecord.githubRelease.published = true;
    m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00+14:00';
    m.releaseRecord.releaseExecuted = true;
    st.enabledCapabilities.push('release_executed');
  });
  chk('PASS-path: exactly +14:00 offset is legal publish evidence', !hasViolation(r2.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
}
// mirror-26 (MIRROR-R5-02): a crafted schema with a fake terminal stage cannot enable release_executed
{
  const dir = buildFixture();
  const sch = readJson(path.join(dir, 'governance', 'r3.0f', 'schema.json'));
  sch.releaseStages.order = ['RELEASE_PREPARED', 'RELEASE_TAGGED_DRAFT', 'RELEASE_YOLO'];
  sch.releaseStages.releaseExecutedRequiresStage = 'RELEASE_YOLO';
  writeJson(path.join(dir, 'governance', 'r3.0f', 'schema.json'), sch);
  const m = readJson(f6Path(dir)); const st = readJson(f6State(dir));
  m.releaseStage = 'RELEASE_YOLO';
  m.releaseRecord.githubRelease.state = 'PUBLISHED';
  m.releaseRecord.githubRelease.draft = false;
  m.releaseRecord.githubRelease.published = true;
  m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00Z';
  m.releaseRecord.releaseExecuted = true;
  st.enabledCapabilities.push('release_executed');
  writeJson(f6Path(dir), m); writeJson(f6State(dir), st);
  const r = runValidator(dir);
  chk('FAIL crafted terminal stage rejected (canonical order pin + rule invalid + executed blocked)', hasViolation(r.artifact, 'R3F_RELEASE_STAGES_ORDER_DRIFT') && hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_STAGE_RULE_INVALID') && hasViolation(r.artifact, 'R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH'));
}
// mirror-27 (MIRROR-R6-01): a DRAFT record with published missing/null is malformed, not acceptable
{
  const r = mutateF6((m) => { delete m.releaseRecord.githubRelease.published; });
  chk('FAIL DRAFT record with published missing', hasViolation(r.artifact, 'R3F_RELEASE_STATE_FIELD_MISMATCH'));
  const r2 = mutateF6((m) => { m.releaseRecord.githubRelease.published = null; });
  chk('FAIL DRAFT record with published=null', hasViolation(r2.artifact, 'R3F_RELEASE_STATE_FIELD_MISMATCH'));
}
// mirror-28 (MIRROR-R7-01): a DRAFT record carrying publishedAt evidence is contradictory
{
  const r = mutateF6((m) => { m.releaseRecord.githubRelease.publishedAt = '2026-07-02T05:00:00Z'; });
  chk('FAIL DRAFT record with an ISO publishedAt', hasViolation(r.artifact, 'R3F_RELEASE_STATE_FIELD_MISMATCH'));
  const r2 = mutateF6((m) => { m.releaseRecord.githubRelease.publishedAt = ''; });
  chk('FAIL DRAFT record with empty-string publishedAt', hasViolation(r2.artifact, 'R3F_RELEASE_STATE_FIELD_MISMATCH'));
}

H.cleanupAll();
console.log('r3-0-train: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
