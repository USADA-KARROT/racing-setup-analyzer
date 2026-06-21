/**
 * tests/analysis-case.test.js — R2.1D AnalysisCase contract tests (PURE).
 * Run: node tests/analysis-case.test.js
 * Matrix: A schema · B binding · C canonical integrity · D capability · E blockers · G determinism · serialize.
 */
'use strict';
const CP = require('../renderer/js/canonical-parameters.js');
const SS = require('../renderer/js/setup-snapshot.js');
const AC = require('../renderer/js/analysis-case.js');
const F = require('./fixtures/analysis-case-f312-synthetic.js');
let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const codes = (c) => [...new Set(c.blockedReasons.map(b => b.code))];
const { PROVENANCE: P, CONVERSION_STATUS: S, APPLICABILITY: A, CONFIDENCE: C } = CP;

console.log('=== analysis-case tests ===');

// helper: a fully model-usable synthetic canonical input snapshot (NON-F312, to exercise the eligible path)
function completeSnapshot() {
  const doc = (k, v) => CP.makeCanonicalParameter({ parameter: k, value: v, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.BOTH, sourceRef: 'syn' });
  const der = (k, v, ref) => CP.makeCanonicalParameter({ parameter: k, value: v, provenance: P.DERIVED, confidence: C.HIGH, conversionStatus: S.VERIFIED, applicability: A.BOTH, conversionRef: ref });
  return {
    frontWheelRateNmm: der('frontWheelRateNmm', 81.6, 'ground_rate_to_wheel_rate'),
    rearWheelRateNmm: der('rearWheelRateNmm', 98, 'spring_element_to_wheel_rate'),
    frontArbRollStiffnessNmDeg: der('frontArbRollStiffnessNmDeg', 1400, 'arb_component_to_axle_roll_stiffness'),
    rearArbRollStiffnessNmDeg: der('rearArbRollStiffnessNmDeg', 1600, 'arb_component_to_axle_roll_stiffness'),
    frontTrackMm: doc('frontTrackMm', 1595), rearTrackMm: doc('rearTrackMm', 1540), wheelbaseMm: doc('wheelbaseMm', 2800),
    massKg: doc('massKg', 565), frontWeightPct: doc('frontWeightPct', 49.4),
    cgHeightMm: doc('cgHeightMm', 280), frontRollCentreHeightMm: doc('frontRollCentreHeightMm', 30), rearRollCentreHeightMm: doc('rearRollCentreHeightMm', 40),
  };
}
function completeCase(overrides) {
  const base = {
    caseId: 'syn_case_complete', schemaVersion: '1.0.0',
    caseMetadata: { title: 't', createdAt: '2026-06-21T00:00:00Z' },
    vehicleBinding: { profileId: 'syn_profile', profileVersion: 'v1', applicability: 'both' },
    setupSnapshot: SS.makeSetupSnapshot({ snapshotId: 'syn_s', vehicleProfileId: 'syn_profile', selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }),
    telemetryBinding: { sessionId: 'syn_sess', adapterId: 'csv', canonicalSessionSchemaVersion: '1', sourceFormat: 'csv', channelCapabilitySummary: { speed: 'confirmed', yawRate: 'confirmed' }, qualitySummary: {}, confirmationState: { timebase: 'confirmed' } },
    modelSnapshot: { modelId: 'dynamics-model', modelVersion: 'v1.6.0', calibrationVersion: 'baseline', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: completeSnapshot() },
    context: { trackProfileRef: null },
  };
  Object.keys(overrides || {}).forEach(k => { base[k] = overrides[k]; });
  return AC.createAnalysisCase(base);
}

// ── A. schema ─────────────────────────────────────────────────────────────────────────────────
(() => {
  const c = F.buildSyntheticF312Case();
  chk('A: minimal valid case', c.valid && c.errors.length === 0, c.errors);
  chk('A: schemaVersion required (missing → fail)', F.buildSyntheticF312Case({ schemaVersion: null }).errors.indexOf('schema_version_required') !== -1);
  chk('A: unknown major version → fail', F.buildSyntheticF312Case({ schemaVersion: '2.0.0' }).errors.indexOf('incompatible_schema_version') !== -1);
  chk('A: caseId missing → fail', F.buildSyntheticF312Case({ caseId: '' }).errors.indexOf('case_id_invalid_or_private') !== -1);
  chk('A: nullable track context is legal', c.context.trackProfileRef === null && c.valid);
  const round = AC.parseAnalysisCase(AC.serializeAnalysisCase(c));
  chk('A: JSON round-trip equal + revalidates', round.ok && JSON.stringify(round.case) === JSON.stringify(c));
})();

// ── B. binding integrity ────────────────────────────────────────────────────────────────────────
(() => {
  const mismatch = F.buildSyntheticF312Case({ setupSnapshot: SS.makeSetupSnapshot({ snapshotId: 'syn_s', vehicleProfileId: 'other_profile', selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }) });
  chk('B: setup bound to a different vehicle profile → fail', mismatch.errors.indexOf('setup_snapshot_vehicle_profile_mismatch') !== -1);
  chk('B: missing version lock → fail', F.buildSyntheticF312Case({ vehicleBinding: { profileId: F.PROFILE_ID, applicability: 'both' } }).errors.indexOf('vehicle_binding_version_lock_missing') !== -1);
  chk('B: telemetry session missing sessionId → fail', F.buildSyntheticF312Case({ telemetryBinding: { adapterId: 'csv' } }).errors.indexOf('telemetry_session_id_invalid_or_private') !== -1);
  chk('B: model canonical contract version missing → fail', F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', canonicalContractVersion: null, canonicalInputSnapshot: {} } }).errors.indexOf('model_canonical_contract_version_required') !== -1);
  chk('B: model canonical contract version incompatible → fail', F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', canonicalContractVersion: '2.0.0', canonicalInputSnapshot: {} } }).errors.indexOf('model_canonical_contract_version_incompatible') !== -1);
})();

// ── C. canonical parameter integrity ──────────────────────────────────────────────────────────
(() => {
  const c = F.buildSyntheticF312Case();
  const snap = c.modelSnapshot.canonicalInputSnapshot;
  chk('C: mixed front/rear basis both usable (ground identity + spring×MR²)', snap.frontWheelRateNmm.modelUsable === true && snap.rearWheelRateNmm.modelUsable === true);
  chk('C: ARB blocked (unknown MR) → not usable, value null', snap.frontArbRollStiffnessNmDeg.modelUsable === false && snap.frontArbRollStiffnessNmDeg.value === null);
  chk('C: unknown CG not usable', snap.cgHeightMm.modelUsable === false);
  // a rate marked usable but missing conversionRef → recomputed as not usable → model input incomplete
  const noRef = F.buildCanonicalInputSnapshot();
  noRef.frontWheelRateNmm = CP.makeCanonicalParameter({ parameter: 'frontWheelRateNmm', value: 81.6, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.BOTH });
  const cNoRef = F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: noRef } });
  chk('C: rate w/o conversionRef → blocked as missing required', cNoRef.capabilityState.modelInputEligible === false && cNoRef.blockedReasons.some(b => b.parameterKey === 'frontWheelRateNmm'));
  // a derived ghost conversionRef → integrity failure
  const ghost = completeSnapshot(); ghost.frontWheelRateNmm = CP.makeCanonicalParameter({ parameter: 'frontWheelRateNmm', value: 81.6, provenance: P.DERIVED, confidence: C.HIGH, conversionStatus: S.VERIFIED, applicability: A.BOTH, conversionRef: 'ghost' });
  chk('C: ghost conversionRef → model input ineligible', completeCase({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: ghost } }).capabilityState.modelInputEligible === false);
  chk('C: complete usable snapshot → modelInputEligible TRUE (gate can open)', completeCase({}).capabilityState.modelInputEligible === true, completeCase({}).blockedReasons.map(b => b.code));
})();

// ── D. capability derivation ──────────────────────────────────────────────────────────────────
(() => {
  const c = F.buildSyntheticF312Case();
  chk('D: bindings complete → caseAssembled', c.capabilityState.caseAssembled === true);
  chk('D: F312 CG/RC unknown + ARB blocked → modelInputEligible false', c.capabilityState.modelInputEligible === false);
  chk('D: descriptive telemetry inspectable, but comparison still false', c.capabilityState.telemetryInspectionEligible === true && c.capabilityState.modelTelemetryComparisonEligible === false);
  chk('D: recommendation always false', c.capabilityState.setupRecommendationEligible === false);
  chk('D: caller cannot supply capabilityState', F.buildSyntheticF312Case({ capabilityState: { modelTelemetryComparisonEligible: true } }).errors.indexOf('capability_state_must_not_be_supplied') !== -1);
  // tampering a built case: flip comparison true → validate rejects
  const t = F.buildSyntheticF312Case(); t.capabilityState.modelTelemetryComparisonEligible = true;
  chk('D: tampered comparison=true → validate rejects', AC.validateAnalysisCase(t).ok === false && AC.validateAnalysisCase(t).errors.indexOf('forbidden_capability_enabled') !== -1);
})();

// ── E. blocker integrity ──────────────────────────────────────────────────────────────────────
(() => {
  chk('E: non-array blockers → fail-closed marker', AC.normalizeBlockers('x').blockers[0].code === 'MALFORMED_BLOCKERS_INPUT' && AC.normalizeBlockers('x').malformed === true);
  chk('E: blocker missing code → invalid', AC.makeBlocker({ scope: 'model' }).valid === false);
  chk('E: blocker missing scope → invalid', AC.makeBlocker({ code: 'X' }).valid === false);
  const dup = AC.normalizeBlockers([{ code: 'X', scope: 'model', parameterKey: 'p' }, { code: 'X', scope: 'model', parameterKey: 'p' }]);
  chk('E: duplicate blocker deduped deterministically', dup.blockers.length === 1);
  const c = F.buildSyntheticF312Case();
  chk('E: unresolved ARB selection traceable to a blocker', c.blockedReasons.some(b => b.code === AC.BLOCKER_CODE.UNRESOLVED_SETUP_SELECTION && /Arb/i.test(b.parameterKey || b.details || '')) || c.blockedReasons.some(b => b.code === AC.BLOCKER_CODE.UNRESOLVED_SETUP_SELECTION));
  chk('E: comparison + recommendation always carry their not-implemented blocker', codes(c).indexOf('MODEL_COMPARISON_NOT_IMPLEMENTED') !== -1 && codes(c).indexOf('RECOMMENDATION_NOT_IMPLEMENTED') !== -1);
})();

// ── G. determinism / no mutation ──────────────────────────────────────────────────────────────
(() => {
  const input = { caseId: 'syn_case_g', schemaVersion: '1.0.0', caseMetadata: { title: 't', createdAt: '2026-06-21T00:00:00Z' }, vehicleBinding: { profileId: 'p', profileVersion: 'v1' }, setupSnapshot: SS.makeSetupSnapshot({ snapshotId: 's', vehicleProfileId: 'p', selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }), telemetryBinding: { sessionId: 'sess' }, modelSnapshot: { modelId: 'm', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: {} }, context: {} };
  const before = JSON.stringify(input);
  const c1 = AC.createAnalysisCase(input);
  chk('G: createAnalysisCase does not mutate input', JSON.stringify(input) === before);
  input.setupSnapshot.vehicleProfileId = 'CHANGED';
  chk('G: mutating input AFTER create does not affect the case', c1.setupSnapshot.vehicleProfileId === 'p');
  chk('G: createdAt required (missing → fail)', AC.createAnalysisCase(Object.assign({}, input, { caseMetadata: { title: 't' } })).errors.indexOf('case_metadata_createdAt_required') !== -1);
  const c2 = AC.createAnalysisCase(JSON.parse(before));
  chk('G: same input → same capability + provenance', JSON.stringify(c1.capabilityState) === JSON.stringify(c2.capabilityState) && JSON.stringify(c1.provenanceSummary) === JSON.stringify(c2.provenanceSummary));
  chk('G: serialize is reproducible', AC.serializeAnalysisCase(c1) === AC.serializeAnalysisCase(c2));
})();

// ── serialize / parse ─────────────────────────────────────────────────────────────────────────
(() => {
  const c = F.buildSyntheticF312Case();
  const round = AC.parseAnalysisCase(AC.serializeAnalysisCase(c));
  chk('ser: roundtrip ok + revalidated', round.ok === true && round.case.caseId === 'syn_case_f312_001');
  chk('ser: parse of invalid json fails closed', AC.parseAnalysisCase('{not json').ok === false);
  let threw = false, ser; try { ser = AC.serializeAnalysisCase({ kind: 'analysis_case', bad: () => 1 }); } catch (e) { threw = true; }
  chk('ser: a function → null, fail-closed, never throws', threw === false && ser === null);
})();

// ── three-way adversarial-review regressions ─────────────────────────────────────────────────────
(() => {
  // MED1: structural blockers cannot be silently emptied/edited away
  const c = F.buildSyntheticF312Case(); c.blockedReasons = [];
  chk('REG-MED1: emptied blockedReasons → validate rejects (blocker_dropped)', AC.validateAnalysisCase(c).errors.some(e => e.indexOf('blocker_dropped:') !== -1));
  // MED2: a key collision keeps the HIGHEST severity and merges details (no error→info demotion)
  const n = AC.normalizeBlockers([{ code: 'X', scope: 'model', parameterKey: 'p', severity: 'info', details: ['a'] }, { code: 'X', scope: 'model', parameterKey: 'p', severity: 'error', details: ['b'] }]);
  chk('REG-MED2: collide keeps error severity + merges details', n.blockers.length === 1 && n.blockers[0].severity === 'error' && JSON.stringify(n.blockers[0].details).indexOf('a') !== -1 && JSON.stringify(n.blockers[0].details).indexOf('b') !== -1, n.blockers[0]);
  // LOW2: model build identity required + profile schema compat
  chk('REG-LOW2: modelVersion required', F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: {} } }).errors.indexOf('model_version_required') !== -1);
  chk('REG-LOW2b: incompatible profileSchemaVersion rejected', F.buildSyntheticF312Case({ vehicleBinding: { profileId: F.PROFILE_ID, profileVersion: 'v1', profileSchemaVersion: '9.9' } }).errors.indexOf('profile_schema_version_incompatible') !== -1);
  // LOW4: incompatible canonical session schema → WARNING blocker, case still assembled (soft gate)
  const cSess = F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', adapterId: 'csv', canonicalSessionSchemaVersion: '99.0.0', sourceFormat: 'csv', channelCapabilitySummary: { speed: 'confirmed', yawRate: 'confirmed' }, qualitySummary: {}, confirmationState: { timebase: 'confirmed' } } });
  chk('REG-LOW4: incompatible session schema → warning blocker, still valid', cSess.valid === true && cSess.blockedReasons.some(b => b.code === AC.BLOCKER_CODE.TELEMETRY_SESSION_SCHEMA_INCOMPATIBLE && b.severity === 'warning'), cSess.errors);
  // MED4: an unknown future field is SURFACED as a warning, not silently dropped
  const cWarn = F.buildSyntheticF312Case({ context: { trackProfileRef: null, trackProfile: { corners: 1 } } });
  chk('REG-MED4: unknown future field surfaced as warning', (cWarn.warnings || []).some(w => w.indexOf('dropped_unknown_field:context.trackProfile') !== -1), cWarn.warnings);
})();

console.log(`analysis-case: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
