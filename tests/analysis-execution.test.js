/**
 * tests/analysis-execution.test.js — R2.2 §7: runAnalysisCase execution layer.
 * Valid run (model-side capability only) · blocked run (invalid case / unresolved inputs / engine
 * unavailable / model-run failure) · immutable input · deterministic · frozen snapshot · case never
 * written back to (R2.1D stays intact). Real Tier1 physics is injected via vm-load.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const AX = require('../renderer/js/analysis-execution.js');
const AC = require('../renderer/js/analysis-case.js');
const SS = require('../renderer/js/setup-snapshot.js');
const CP = require('../renderer/js/canonical-parameters.js');
const K = CP.CANONICAL_PARAM;

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };
const deepEq = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };

// ── real Tier1 physics via vm (the injected modelRunner) ──
const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance:Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'exec-bundle.js' });
const Tier1 = ctx.__h.Tier1BasicBalance;
const runner = (params) => new Tier1(params).calculate();

// builders
const usableRate = (param, value, ref) => CP.makeCanonicalParameter({ parameter: param, value, provenance: 'derived', confidence: 'high', conversionStatus: 'verified', applicability: 'both', conversionRef: ref || 'spring_element_to_wheel_rate' });
const usableGeo = (param, value) => CP.makeCanonicalParameter({ parameter: param, value, provenance: 'documented', confidence: 'high', conversionStatus: 'not_required', applicability: 'both' });

function usableSnapshot() {
  return {
    frontWheelRateNmm: usableRate(K.FRONT_WHEEL_RATE, 81.6), rearWheelRateNmm: usableRate(K.REAR_WHEEL_RATE, 150.0),
    frontArbRollStiffnessNmDeg: usableRate(K.FRONT_ARB_ROLL_STIFFNESS, 350, 'arb_component_to_axle_roll_stiffness'),
    rearArbRollStiffnessNmDeg: usableRate(K.REAR_ARB_ROLL_STIFFNESS, 250, 'arb_component_to_axle_roll_stiffness'),
    frontTrackMm: usableGeo(K.FRONT_TRACK, 1595), rearTrackMm: usableGeo(K.REAR_TRACK, 1540), wheelbaseMm: usableGeo(K.WHEELBASE, 2800),
    massKg: usableGeo(K.MASS, 565), frontWeightPct: usableGeo(K.FRONT_WEIGHT_PCT, 49.4),
    cgHeightMm: usableGeo(K.CG_HEIGHT, 290), frontRollCentreHeightMm: usableGeo(K.FRONT_ROLL_CENTRE_HEIGHT, 30), rearRollCentreHeightMm: usableGeo(K.REAR_ROLL_CENTRE_HEIGHT, 45),
  };
}
function buildCase(snapOverride) {
  return AC.createAnalysisCase({
    caseId: 'syn_case_exec', schemaVersion: '1.0.0',
    caseMetadata: { title: 'exec test', createdAt: '2026-06-21T00:00:00Z' },
    vehicleBinding: { profileId: 'exec_profile', profileVersion: 'v1' },
    setupSnapshot: SS.makeSetupSnapshot({ snapshotId: 'exec_setup', vehicleProfileId: 'exec_profile' }),
    telemetryBinding: { sessionId: 'exec_sess', channelCapabilitySummary: { speed: 'confirmed', yawRate: 'confirmed', lateralAcceleration: 'confirmed', steeringRaw: 'confirmed' }, qualitySummary: { sampleRateHz: 20 }, confirmationState: { timebase: 'confirmed' } },
    modelSnapshot: { modelId: 'dynamics-model', modelVersion: 'v1.6.0', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: snapOverride || usableSnapshot() },
    context: {},
  });
}

// ── valid run ──
(() => {
  const c = buildCase();
  chk('precondition: case valid', c.valid === true, c.errors);
  const r = AX.runAnalysisCase(c, { modelRunner: runner });
  chk('valid run: valid true', r.valid === true, r.blockedReasons);
  chk('valid run: capability model-side only', deepEq(Object.keys(r.capabilityState).sort(), ['caseValid', 'modelInputResolved', 'modelRan']));
  chk('valid run: modelRan true', r.capabilityState.modelRan === true);
  chk('valid run: snapshot has understeer_gradient', typeof r.modelResultSnapshot.understeer_gradient === 'number');
  chk('valid run: predictedTendency normalized', ['understeer', 'neutral', 'oversteer'].indexOf(r.predictedTendency) !== -1, r.predictedTendency);
  chk('valid run: credibility Model', r.credibility === 'Model');
  chk('valid run: snapshot frozen', Object.isFrozen(r.modelResultSnapshot));
  chk('valid run: snapshot matches direct Tier1 run', deepEq(r.modelResultSnapshot, JSON.parse(JSON.stringify(runner(require('../renderer/js/canonical-model-input.js').buildModelParamsFromCanonical(usableSnapshot()).params)))));
  chk('valid run: modelVersion surfaced', r.modelVersion === 'v1.6.0');
})();

// ── immutable input + case not written back ──
(() => {
  const c = buildCase();
  const before = JSON.stringify(c);
  const r1 = AX.runAnalysisCase(c, { modelRunner: runner });
  chk('immutable: case unchanged after run', JSON.stringify(c) === before);
  chk('case-intact: still validates clean', AC.validateAnalysisCase(c).ok === true);
  chk('case-intact: capability still has no comparison key', !('modelTelemetryComparisonEligible' in r1.capabilityState));
  // deterministic
  const r2 = AX.runAnalysisCase(c, { modelRunner: runner });
  chk('deterministic: same snapshot', deepEq(r1.modelResultSnapshot, r2.modelResultSnapshot));
})();

// ── blocked: invalid case ──
(() => {
  const r = AX.runAnalysisCase({ kind: 'analysis_case', schemaVersion: '9.9.9' }, { modelRunner: runner });
  chk('invalid case: valid false', r.valid === false);
  chk('invalid case: caseValid false', r.capabilityState.caseValid === false);
  chk('invalid case: ANALYSIS_CASE_INVALID blocker', r.blockedReasons.some((b) => b.code === 'ANALYSIS_CASE_INVALID'));
  chk('invalid case: no model snapshot', r.modelResultSnapshot === null);
})();

// ── blocked: unresolved canonical inputs (ARB blocked) ──
(() => {
  const snap = usableSnapshot();
  snap.frontArbRollStiffnessNmDeg = CP.makeCanonicalParameter({ parameter: K.FRONT_ARB_ROLL_STIFFNESS, value: null, provenance: 'unknown', confidence: 'unknown', conversionStatus: 'blocked', applicability: 'both', blockers: ['arb_motion_ratio_unknown'] });
  const c = buildCase(snap);
  const r = AX.runAnalysisCase(c, { modelRunner: runner });
  chk('unresolved: valid false', r.valid === false);
  chk('unresolved: modelInputResolved false', r.capabilityState.modelInputResolved === false);
  chk('unresolved: modelRan false', r.capabilityState.modelRan === false);
  chk('unresolved: blocker present', r.blockedReasons.some((b) => b.code === 'CANONICAL_INPUT_NOT_MODEL_USABLE'));
})();

// ── blocked: engine unavailable (no runner, no global) ──
(() => {
  const c = buildCase();
  const r = AX.runAnalysisCase(c, {});
  chk('engine unavailable: MODEL_ENGINE_UNAVAILABLE', r.valid === false && r.blockedReasons.some((b) => b.code === 'MODEL_ENGINE_UNAVAILABLE'));
  chk('engine unavailable: modelInputResolved true, modelRan false', r.capabilityState.modelInputResolved === true && r.capabilityState.modelRan === false);
})();

// ── blocked: model run throws / returns bad output → MODEL_RUN_FAILED ──
(() => {
  const c = buildCase();
  const rThrow = AX.runAnalysisCase(c, { modelRunner: () => { throw new Error('boom'); } });
  chk('run throws: MODEL_RUN_FAILED', rThrow.valid === false && rThrow.blockedReasons.some((b) => b.code === 'MODEL_RUN_FAILED'));
  const rBad = AX.runAnalysisCase(c, { modelRunner: () => ({ tendency: 'Understeer' }) }); // missing finite numbers
  chk('bad output: MODEL_RUN_FAILED', rBad.valid === false && rBad.blockedReasons.some((b) => b.code === 'MODEL_RUN_FAILED'));
  const rBadTendency = AX.runAnalysisCase(c, { modelRunner: () => ({ front_wheel_rate: 1, rear_wheel_rate: 1, total_roll_stiffness: 1, roll_stiffness_dist_front: 50, understeer_gradient: 1, tendency: 'Wobble' }) });
  chk('bad tendency: MODEL_RUN_FAILED', rBadTendency.valid === false && rBadTendency.blockedReasons.some((b) => b.code === 'MODEL_RUN_FAILED'));
})();

// ── totally exotic input never throws ──
(() => {
  let threw = false; let r;
  try { r = AX.runAnalysisCase(null, { modelRunner: runner }); } catch (e) { threw = true; }
  chk('exotic input: no throw', threw === false);
  chk('exotic input: fail-closed', r && r.valid === false);
})();

console.log(`analysis-execution: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
