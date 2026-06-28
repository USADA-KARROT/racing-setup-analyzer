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
const os = require('os');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/check-r3-0-train.js';

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

function runValidator(base) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-train-art-'));
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-train-fix-'));
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
  chk('PASS trainStatus=IN_PROGRESS', r.artifact && r.artifact.trainStatus === 'IN_PROGRESS');
  chk('PASS currentPhase=R3.0C', r.artifact && r.artifact.currentPhase === 'R3.0C');
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
  ds.currentCheckpoint = 'D2_HYPOTHESIS_ENGINE'; ds.authorizedProductionPaths = []; ds.enabledCapabilities = [];
  writeJson(path.join(dir, 'governance', 'r3.0d', 'state.json'), ds);
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.phaseStates['R3.0C'].currentCheckpoint = 'C7_UI'; ts.phaseStates['R3.0C'].finalActivationReached = false;
  ts.currentPhaseCheckpoint = 'C7_UI';
  ts.phaseStates['R3.0D'].currentCheckpoint = 'D2_HYPOTHESIS_ENGINE';
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL D before C8 rc!=0', r.status !== 0);
  chk('FAIL D before C8 CROSS_PHASE_PREMATURE_ADVANCE', hasViolation(r.artifact, 'CROSS_PHASE_PREMATURE_ADVANCE'));
}

// ── 2b. E current=E2 but R3.0D still at D0 ──
{
  const dir = buildFixture();
  const es = readJson(path.join(dir, 'governance', 'r3.0e', 'state.json'));
  es.currentCheckpoint = 'E2_EXPERIMENT_STORE';
  writeJson(path.join(dir, 'governance', 'r3.0e', 'state.json'), es);
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.phaseStates['R3.0E'].currentCheckpoint = 'E2_EXPERIMENT_STORE';
  writeJson(path.join(dir, 'governance', 'r3.0', 'train.json'), ts);
  const r = runValidator(dir);
  chk('FAIL E before D5 CROSS_PHASE_PREMATURE_ADVANCE', hasViolation(r.artifact, 'CROSS_PHASE_PREMATURE_ADVANCE'));
}

// ── 2c. F current=F1 but R3.0E still at E0 ──
{
  const dir = buildFixture();
  const fs2 = readJson(path.join(dir, 'governance', 'r3.0f', 'state.json'));
  fs2.currentCheckpoint = 'F1_MIGRATION_ENGINE';
  writeJson(path.join(dir, 'governance', 'r3.0f', 'state.json'), fs2);
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
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
  const d2 = Object.assign({}, d1, { checkpoint: 'D2_HYPOTHESIS_ENGINE', previousCheckpoint: 'D1_CONTRACT_FOUNDATION', enabledCapabilitiesBefore: ['contract_foundation_present'], enabledCapabilitiesAfter: [] });
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
  const d2 = Object.assign({}, d1, { checkpoint: 'D2_HYPOTHESIS_ENGINE', previousCheckpoint: 'D1_CONTRACT_FOUNDATION', authorizedPaths: [] });
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
  dsch.capabilityUnlockFloor['r4_closed_loop_present'] = 'D5_ACTIVATION';
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
    status: 'pending', governanceChanged: true, crossPhaseGate: { r3dCheckpoint: 'D5_ACTIVATION', requiredFor: 'E2_EXPERIMENT_STORE', satisfied: true },
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
    status: 'pending', governanceChanged: true, crossPhaseGate: { r3dCheckpoint: 'D5_ACTIVATION', requiredFor: 'E2_EXPERIMENT_STORE', satisfied: true },
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
{
  const dir = buildFixture();
  const ts = readJson(path.join(dir, 'governance', 'r3.0', 'train.json'));
  ts.phaseStates['R3.0D'].currentCheckpoint = 'D5_ACTIVATION'; // disagrees with state.json D0_BOOTSTRAP
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

console.log('r3-0-train: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
