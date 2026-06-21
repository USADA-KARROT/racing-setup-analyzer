/**
 * tests/analysis-case-adversarial.test.js — R2.1D red-line / clean-room adversarial tests (PURE).
 * Run: node tests/analysis-case-adversarial.test.js
 * Every attack must fail-closed or be explicitly rejected by the validator.
 * Matrix: F clean-room/privacy · H 12 red-line injections.
 */
'use strict';
const CP = require('../renderer/js/canonical-parameters.js');
const SS = require('../renderer/js/setup-snapshot.js');
const AC = require('../renderer/js/analysis-case.js');
const F = require('./fixtures/analysis-case-f312-synthetic.js');
let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const rejected = (c) => c.valid === false && c.errors.length > 0;
const hasErr = (c, sub) => c.errors.some(e => e.indexOf(sub) !== -1);

console.log('=== analysis-case adversarial tests ===');

// ── F. clean-room / privacy ───────────────────────────────────────────────────────────────────
(() => {
  chk('F1: unix absolute path as caseId → rejected', rejected(F.buildSyntheticF312Case({ caseId: '/Users/x/case.json' })));
  chk('F2: windows path as sessionId → rejected', rejected(F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'C:\\logs\\s.csv' } })));
  chk('F3: linux path as profileId → rejected', (() => { const c = F.buildSyntheticF312Case({ vehicleBinding: { profileId: '/home/u/p', profileVersion: 'v1' } }); return hasErr(c, 'vehicle_profile_id_invalid_or_private'); })());
  chk('F4: raw telemetry sample array → forbidden field', hasErr(F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', samples: [1, 2, 3] } }), 'forbidden_field:samples'));
  chk('F5: raw binary payload → forbidden field', hasErr(F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', rawBinary: 'AAEC' } }), 'forbidden_field:rawBinary'));
  chk('F6: real filename smuggled into metadata notes → rejected', hasErr(F.buildSyntheticF312Case({ caseMetadata: { title: 't', createdAt: '2026-06-21T00:00:00Z', notes: 'see /Users/x/T01_S4_7.csv' } }), 'case_metadata_notes_contains_private_ref'));
  chk('F7: fixture itself leaks no private source', F.buildSyntheticF312Case().provenanceSummary.privateSourceCount === 0);
  chk('F8: sanitized opaque ids are accepted', F.buildSyntheticF312Case().valid === true);
})();

// ── H. red-line adversarial injections (12) ───────────────────────────────────────────────────
(() => {
  // 1 measuredKus smuggled into the canonical input snapshot
  const s1 = F.buildCanonicalInputSnapshot(); s1.measuredKus = 1.5;
  chk('H1: measuredKus in case → forbidden field', hasErr(F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: s1 } }), 'forbidden_field:measuredKus'));
  // 2 setupRecommendation smuggled into setup snapshot
  const ss = SS.makeSetupSnapshot({ snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }); ss.setupRecommendation = { change: 'softer ARB' };
  chk('H2: setupRecommendation in case → forbidden field', hasErr(F.buildSyntheticF312Case({ setupSnapshot: ss }), 'forbidden_field:setupRecommendation'));
  // 3 modelOverlay smuggled in
  const s3 = F.buildCanonicalInputSnapshot(); s3.modelOverlay = { x: 1 };
  chk('H3: modelOverlay in case → forbidden field', hasErr(F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: s3 } }), 'forbidden_field:modelOverlay'));
  // 4 raw steering claimed as confirmed road-wheel angle without calibration
  const c4 = F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', channelCapabilitySummary: { speed: 'confirmed', yawRate: 'confirmed', roadWheelAngle: 'confirmed' }, qualitySummary: {}, confirmationState: { steeringCalibration: 'unconfirmed' } } });
  chk('H4: road-wheel "confirmed" w/o calibration → blocker + no comparison', c4.blockedReasons.some(b => b.code === AC.BLOCKER_CODE.STEERING_CALIBRATION_UNCONFIRMED) && c4.capabilityState.modelTelemetryComparisonEligible === false);
  // 5 nominal 12.5 steering ratio promoted to confirmed calibration must NOT unlock comparison
  const c5 = F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', channelCapabilitySummary: { speed: 'confirmed', yawRate: 'confirmed', roadWheelAngle: 'confirmed' }, qualitySummary: {}, confirmationState: { steeringCalibration: 'confirmed' } } });
  chk('H5: even "confirmed" steering calibration does NOT enable comparison (hard false)', c5.capabilityState.modelTelemetryComparisonEligible === false);
  // 6 generic CG filling an unknown → estimated provenance is never usable
  const s6 = F.buildCanonicalInputSnapshot(); s6.cgHeightMm = CP.makeCanonicalParameter({ parameter: 'cgHeightMm', value: 290, provenance: CP.PROVENANCE.ESTIMATED, confidence: CP.CONFIDENCE.HIGH, conversionStatus: CP.CONVERSION_STATUS.NOT_REQUIRED, applicability: CP.APPLICABILITY.BOTH });
  const c6 = F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: s6 } });
  chk('H6: generic estimated CG → still model-input-ineligible', c6.capabilityState.modelInputEligible === false);
  // 7 blocked ARB hand-flagged modelUsable:true → recomputed false + validator catches tamper
  const s7 = F.buildCanonicalInputSnapshot(); s7.frontArbRollStiffnessNmDeg = { kind: 'canonical_parameter', parameter: 'frontArbRollStiffnessNmDeg', value: 1400, provenance: CP.PROVENANCE.DERIVED, confidence: CP.CONFIDENCE.MEDIUM, conversionStatus: CP.CONVERSION_STATUS.BLOCKED, applicability: CP.APPLICABILITY.BOTH, conversionRef: 'arb_component_to_axle_roll_stiffness', modelUsable: true, blockers: ['arb_motion_ratio_unknown'] };
  const c7 = F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: s7 } });
  chk('H7: blocked ARB flagged usable → recomputed ineligible', c7.capabilityState.modelInputEligible === false);
  chk('H7b: create rebuilds canonical → tampered modelUsable cleared to false', c7.modelSnapshot.canonicalInputSnapshot.frontArbRollStiffnessNmDeg.modelUsable === false);
  const c7b = F.buildSyntheticF312Case(); c7b.modelSnapshot.canonicalInputSnapshot.frontArbRollStiffnessNmDeg.modelUsable = true;
  chk('H7c: post-build usability tamper → validator catches', AC.validateAnalysisCase(c7b).errors.indexOf('canonical_input_frontArbRollStiffnessNmDeg_usability_tampered') !== -1);
  // 8 local path injection (macOS)
  chk('H8: macOS path as modelId → rejected', hasErr(F.buildSyntheticF312Case({ modelSnapshot: { modelId: '/Users/x/model', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: {} } }), 'model_id_invalid_or_private'));
  // 9 raw telemetry injection (csvText)
  chk('H9: csvText raw injection → forbidden field', hasErr(F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', csvText: 'a,b\n1,2' } }), 'forbidden_field:csvText'));
  // 10 manual comparison=true
  chk('H10: caller-supplied capabilityState → rejected at create', hasErr(F.buildSyntheticF312Case({ capabilityState: { modelTelemetryComparisonEligible: true } }), 'capability_state_must_not_be_supplied'));
  const t10 = F.buildSyntheticF312Case(); t10.capabilityState.modelTelemetryComparisonEligible = true;
  chk('H10b: post-hoc comparison=true → validator rejects', AC.validateAnalysisCase(t10).errors.indexOf('forbidden_capability_enabled') !== -1);
  // 11 manual recommendation=true
  const t11 = F.buildSyntheticF312Case(); t11.capabilityState.setupRecommendationEligible = true;
  chk('H11: post-hoc recommendation=true → validator rejects', AC.validateAnalysisCase(t11).errors.indexOf('forbidden_capability_enabled') !== -1);
  // 12 non-existent conversionRef
  const s12 = F.buildCanonicalInputSnapshot(); s12.rearWheelRateNmm = CP.makeCanonicalParameter({ parameter: 'rearWheelRateNmm', value: 98, provenance: CP.PROVENANCE.DERIVED, confidence: CP.CONFIDENCE.HIGH, conversionStatus: CP.CONVERSION_STATUS.VERIFIED, applicability: CP.APPLICABILITY.BOTH, conversionRef: 'no_such_conversion' });
  const c12 = F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: s12 } });
  chk('H12: ghost conversionRef → model input ineligible', c12.capabilityState.modelInputEligible === false && c12.blockedReasons.some(b => b.parameterKey === 'rearWheelRateNmm'));
})();

// ── three-way adversarial-review regressions ─────────────────────────────────────────────────────
(() => {
  // HIGH: a DOCUMENTED rate-like value with a ghost conversionRef must be blocked (registry membership
  // is checked for ANY conversionRef, not only DERIVED) → that key carries a blocker, gate stays closed.
  const sGhost = F.buildCanonicalInputSnapshot();
  sGhost.frontWheelRateNmm = CP.makeCanonicalParameter({ parameter: 'frontWheelRateNmm', value: 81.6, provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, conversionStatus: CP.CONVERSION_STATUS.NOT_REQUIRED, applicability: CP.APPLICABILITY.BOTH, conversionRef: 'GHOST_DOES_NOT_EXIST' });
  const cGhost = F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: sGhost } });
  chk('REG-HIGH: documented rate + ghost conversionRef → that key blocked, ineligible', cGhost.capabilityState.modelInputEligible === false && cGhost.blockedReasons.some(b => b.parameterKey === 'frontWheelRateNmm' && JSON.stringify(b.details).indexOf('conversion_ref_not_in_registry') !== -1), cGhost.blockedReasons.filter(b => b.parameterKey === 'frontWheelRateNmm'));

  // MED3: forbidden content buried past the recursion cap fails CLOSED (not silently stored)
  const deepNest = (n, leaf) => { let o = leaf; for (let i = 0; i < n; i++) o = { nest: o }; return o; };
  const sDeep = F.buildCanonicalInputSnapshot();
  sDeep.frontTrackMm = Object.assign({}, sDeep.frontTrackMm, { trap: deepNest(30, { modelOverlay: { secret: 1 } }) });
  const cDeep = F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: sDeep } });
  chk('REG-MED3: forbidden content past depth cap → fail-closed', cDeep.valid === false && cDeep.errors.some(e => e.indexOf('__depth_exceeded__') !== -1 || e.indexOf('modelOverlay') !== -1 || e === 'non_json_safe_input'));

  // LOW1: an unexpected capabilityState key (post-build) is a hard error
  const tCap = F.buildSyntheticF312Case(); tCap.capabilityState.runComparison = true;
  chk('REG-LOW1: unexpected capability key → validate rejects', AC.validateAnalysisCase(tCap).errors.some(e => e.indexOf('capability_unexpected_key:runComparison') !== -1));

  // LOW3: a private path under an UNKNOWN telemetry key is explicitly rejected (not silently dropped)
  chk('REG-LOW3: private path under unknown telemetry key → rejected', hasErr(F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', logFile: '/Users/x/run.csv' } }), 'private_value:logFile'));
})();

// ── Codex independent-review regressions (closed-schema hardening) ───────────────────────────────
(() => {
  // HIGH1: telemetry summary is a CLOSED flat scalar map — array / binary / path / nested under an aliased key all rejected
  chk('CODEX-HIGH1a: array payload in qualitySummary → rejected', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', qualitySummary: { samplesAlias: [1, 2, 3] } } }).valid === false);
  chk('CODEX-HIGH1b: base64 blob in qualitySummary → rejected', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', qualitySummary: { payload: 'QUFFQ0FBRUNBQUVDQUFFQ0FBRUM=' } } }).valid === false);
  chk('CODEX-HIGH1c: nested path value in qualitySummary → rejected (not in enum)', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', qualitySummary: { capture: '/private/tmp/run.bin' } } }).valid === false);
  chk('CODEX-HIGH1d: nested object in confirmationState → rejected', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', confirmationState: { nested: { a: 1 } } } }).valid === false);
  // HIGH2: canonicalInputSnapshot is a CLOSED key set — an aliased model output is rejected and not serialized
  const snap = F.buildCanonicalInputSnapshot(); snap.experimental = { result: 42.4242, prediction: [1, 2] };
  const c2 = F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'x', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: snap } });
  chk('CODEX-HIGH2: aliased model result key → rejected + not serialized', c2.valid === false && AC.serializeAnalysisCase(c2).indexOf('42.4242') === -1 && hasErr(c2, 'canonical_input_unknown_key:experimental'));
  const snap2 = F.buildCanonicalInputSnapshot(); snap2.massKg = { sneaky: 1 };
  chk('CODEX-HIGH2b: canonical key with non-canonical value → rejected', hasErr(F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'x', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: snap2 } }), 'canonical_input_massKg_not_canonical_parameter'));
  // MED1: validate RE-RUNS create-time structural invariants (tamper data + recompute capability → caught)
  const t = F.buildSyntheticF312Case(); t.telemetryBinding.sessionId = null; t.capabilityState = AC.deriveCapabilityState(t);
  chk('CODEX-MED1: tampered sessionId + recomputed capability → validate rejects', AC.validateAnalysisCase(t).ok === false && AC.validateAnalysisCase(t).errors.indexOf('telemetry_session_id_invalid_or_private') !== -1);
  const t2 = F.buildSyntheticF312Case(); t2.setupSnapshot.vehicleProfileId = 'OTHER'; t2.capabilityState = AC.deriveCapabilityState(t2);
  chk('CODEX-MED1b: tampered setup↔profile binding → validate rejects', AC.validateAnalysisCase(t2).errors.indexOf('setup_snapshot_vehicle_profile_mismatch') !== -1);
})();

// ── Codex round-2 regressions (truly-closed schema: rebuild + enum, no heuristics) ───────────────
(() => {
  // HIGH1: a known canonical key cannot smuggle an undefined extra field (nested payload/path)
  const snap = F.buildCanonicalInputSnapshot(); snap.frontTrackMm = Object.assign({}, snap.frontTrackMm, { artifact: { payload: 'AAEC', capture: '/private/tmp/run.bin' } });
  const c1 = F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'x', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: snap } });
  chk('CODEX2-HIGH1: extra field inside a canonical parameter → rejected + not serialized', c1.valid === false && hasErr(c1, 'canonical_input_frontTrackMm_unexpected_field:artifact') && AC.serializeAnalysisCase(c1).indexOf('/private/tmp') === -1);
  // a canonical parameter whose key/parameter disagree is rejected
  const snapM = F.buildCanonicalInputSnapshot(); snapM.massKg = Object.assign({}, snapM.frontTrackMm); // parameter says frontTrackMm under key massKg
  chk('CODEX2-HIGH1b: canonical key/parameter mismatch → rejected', hasErr(F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'x', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: snapM } }), 'canonical_input_massKg_parameter_mismatch'));
  // HIGH2: telemetry summaries are type/enum specs, not "any short scalar"
  chk('CODEX2-HIGH2a: short base64 in qualitySummary → rejected', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', qualitySummary: { payload: 'AAEC' } } }).valid === false);
  chk('CODEX2-HIGH2b: non-enum channel state → rejected', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', channelCapabilitySummary: { speed: 'totally_made_up' } } }).valid === false);
  chk('CODEX2-HIGH2c: enum values accepted', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', channelCapabilitySummary: { speed: 'confirmed' }, qualitySummary: { sampleRateHz: 20, dropout: 'low' }, confirmationState: { timebase: 'confirmed' } } }).valid === true);
})();

// ── user-mandated regression matrix (closed-schema completeness, fixed-key + shared-validator) ───
(() => {
  // canonical key + extra PRIMITIVE field (not only nested object)
  const sp = F.buildCanonicalInputSnapshot(); sp.massKg = Object.assign({}, sp.massKg, { foo: 1 });
  chk('U-canon-extra-primitive: extra primitive field in canonical param → rejected', hasErr(F.buildSyntheticF312Case({ modelSnapshot: { modelId: 'm', modelVersion: 'v', calibrationVersion: 'b', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: sp } }), 'canonical_input_massKg_unexpected_field:foo'));
  // telemetry: unknown key (fixed-key allowlist), wrong type, non-finite number
  chk('U-telem-unknown-key: unknown qualitySummary key → rejected', hasErr(F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', qualitySummary: { payload: 'AAEC' } } }), 'qualitySummary.payload_unknown_key'));
  chk('U-telem-wrong-type: channel state as number → rejected', hasErr(F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', channelCapabilitySummary: { speed: 1 } } }), 'channelCapabilitySummary.speed_value_not_allowed'));
  chk('U-telem-nonfinite: NaN quality number → rejected (early non_json_safe or per-field)', (() => { const c = F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', qualitySummary: { sampleRateHz: NaN } } }); return c.valid === false && (c.errors.indexOf('non_json_safe_input') !== -1 || c.errors.indexOf('qualitySummary.sampleRateHz_not_finite_number') !== -1); })());
  // post-build SetupSnapshot tamper → AnalysisCase validate catches it (validate re-runs setup schema)
  const t = F.buildSyntheticF312Case(); t.setupSnapshot.tyreContext = { note: '/private/tmp/run.bin' };
  chk('U-setup-tamper: tampered SetupSnapshot tyre path → validate rejects', AC.validateAnalysisCase(t).errors.indexOf('setup_snapshot_invalid') !== -1);
  // parse round-trip re-runs the FULL validator (a serialized tampered case fails closed on parse)
  const t2 = F.buildSyntheticF312Case(); t2.capabilityState.modelTelemetryComparisonEligible = true;
  chk('U-parse-revalidate: serialized tampered case → parse fails closed', AC.parseAnalysisCase(AC.serializeAnalysisCase(t2)).ok === false);
})();

// ── Codex round-3 regressions (path completeness, deep re-validation, JSON-safe, no-throw) ────────
(() => {
  const mkSetup = (extra) => SS.makeSetupSnapshot(Object.assign({ snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }, extra));
  // HIGH1: UNC / file:// paths in allowed setup strings rejected
  chk('CODEX3-HIGH1a: file:// in tyre note → rejected', F.buildSyntheticF312Case({ setupSnapshot: mkSetup({ tyreContext: { note: 'file://server/share' } }) }).valid === false);
  chk('CODEX3-HIGH1b: UNC in tyre note → rejected', mkSetup({ tyreContext: { note: '\\\\server\\share\\run' } }).errors.indexOf('tyre_context_note_private_value') !== -1);
  // HIGH2: validate RE-RUNS setup structure (never trusts a nested .valid a tamperer set)
  const t = F.buildSyntheticF312Case(); t.setupSnapshot.selectedOptions = [{ valid: true, category: 'BAD', optionId: 'opaque' }]; t.capabilityState = AC.deriveCapabilityState(t);
  chk('CODEX3-HIGH2a: tampered selectedOption (.valid=true, bad category) → validate rejects', AC.validateAnalysisCase(t).ok === false);
  const t2 = F.buildSyntheticF312Case(); t2.setupSnapshot.measuredSettings = { x: { kind: 'raw_source', valid: true, source: '/Users/x/a.csv' } }; t2.capabilityState = AC.deriveCapabilityState(t2);
  chk('CODEX3-HIGH2b: tampered measuredSetting (.valid=true, path source) → validate rejects', AC.validateAnalysisCase(t2).ok === false);
  // MED1: non-JSON-safe input fails closed (no silent {} / string coercion)
  chk('CODEX3-MED1a: Map telemetry summary → non_json_safe_input', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', qualitySummary: new Map([['payload', 'AAEC']]) } }).errors.indexOf('non_json_safe_input') !== -1);
  chk('CODEX3-MED1b: Date in tyre note → non_json_safe_input', mkSetup({ tyreContext: { note: new Date(0) } }).errors.indexOf('non_json_safe_input') !== -1);
  // MED2: a primitive electronic entry fails closed, never throws
  let threw = false; try { mkSetup({ electronicSettings: { differential: 'foo' } }); } catch (e) { threw = true; }
  chk('CODEX3-MED2: primitive electronic entry → no throw + fail closed', threw === false && mkSetup({ electronicSettings: { differential: 'foo' } }).errors.indexOf('electronic_differential_not_object') !== -1);
})();

// ── Codex round-4 regressions (encoding, prototype pollution, toJSON/Proxy, post-build json-safe) ─
(() => {
  const mkSetup = (extra) => SS.makeSetupSnapshot(Object.assign({ snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }, extra));
  // HIGH1: percent-encoded / data: schemes rejected (decode-before-check + scheme detection)
  chk('CODEX4-HIGH1a: percent-encoded path in id → rejected', mkSetup({ snapshotId: 'file%3A%2F%2Fx' }).valid === false);
  chk('CODEX4-HIGH1b: data: scheme caseId → rejected', F.buildSyntheticF312Case({ caseId: 'data:opaque' }).valid === false);
  chk('CODEX4-HIGH1c: percent-encoded path in tyre note → rejected', mkSetup({ tyreContext: { note: 'file%3A%2F%2Fserver' } }).errors.indexOf('tyre_context_note_private_value') !== -1);
  // HIGH2: prototype-pollution keys are UNKNOWN keys, not inherited allowlist hits
  const c = F.buildSyntheticF312Case();
  Object.defineProperty(c.modelSnapshot.canonicalInputSnapshot, 'constructor', { value: { kind: 'canonical_parameter', parameter: 'constructor', value: 1, provenance: 'documented', confidence: 'high', conversionStatus: 'not_required', applicability: 'both', blockers: [], modelUsable: false, valid: true, errors: [] }, enumerable: true, configurable: true });
  chk('CODEX4-HIGH2: constructor own-key in canonical → unknown_key rejected', AC.validateAnalysisCase(c).errors.indexOf('canonical_input_unknown_key:constructor') !== -1);
  // HIGH3: non-enumerable toJSON rejected; a throwing Proxy fails closed (no crash)
  const x = {}; Object.defineProperty(x, 'toJSON', { enumerable: false, value() { return { snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }; } });
  chk('CODEX4-HIGH3a: non-enumerable toJSON → fail closed', SS.makeSetupSnapshot(x).valid === false);
  let threw = false; try { SS.makeSetupSnapshot(new Proxy({}, { ownKeys() { throw new Error('p'); } })); } catch (e) { threw = true; }
  chk('CODEX4-HIGH3b: throwing Proxy → fail closed, never throws', threw === false);
  // MED1: a post-build non-JSON value is caught by validate
  const m = F.buildSyntheticF312Case(); m.context.weatherContext = new Map([['secret', 'x']]);
  chk('CODEX4-MED1: post-build Map in context → validate rejects', AC.validateAnalysisCase(m).errors.indexOf('non_json_safe_input') !== -1);
})();

// ── Codex round-5 regressions (finite numbers, exotic-object fail-closed boundary, multi-encoding) ─
(() => {
  const mkSetup = (extra) => SS.makeSetupSnapshot(Object.assign({ snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }, extra));
  // 1: NaN / Infinity rejected (no silent → null coercion)
  chk('CODEX5-1a: NaN in tyre context → rejected', mkSetup({ tyreContext: { wear: NaN } }).valid === false);
  chk('CODEX5-1b: Infinity quality number → rejected', F.buildSyntheticF312Case({ telemetryBinding: { sessionId: 'syn_sess', qualitySummary: { sampleRateHz: Infinity } } }).valid === false);
  // 2: getter / Proxy at a public boundary → fail closed, never throws
  let t1 = false; try { AC.validateAnalysisCase(new Proxy(F.buildSyntheticF312Case(), { get() { throw new Error('trap'); } })); } catch (e) { t1 = true; }
  chk('CODEX5-2a: Proxy get-trap at validate → fail closed (no throw)', t1 === false);
  let t2 = false; try { SS.makeSetupSnapshot(new Proxy({}, { get() { throw new Error('trap'); } })); } catch (e) { t2 = true; }
  chk('CODEX5-2b: Proxy get-trap at make → fail closed (no throw)', t2 === false);
  // 3: symbol / non-enumerable / accessor own properties rejected (getter NOT executed)
  const sym = { snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }; sym[Symbol('rawbinary')] = [1];
  chk('CODEX5-3a: symbol own key → rejected', SS.makeSetupSnapshot(sym).valid === false);
  const ne = { snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }; Object.defineProperty(ne, 'hidden', { value: [1], enumerable: false });
  chk('CODEX5-3b: non-enumerable own key → rejected', SS.makeSetupSnapshot(ne).valid === false);
  const ac = { vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }; Object.defineProperty(ac, 'snapshotId', { enumerable: true, get() { return 'leak'; } });
  chk('CODEX5-3c: accessor (getter) own key → rejected, getter not run', SS.makeSetupSnapshot(ac).valid === false);
  // 4: multi-encoded / %uXXXX private refs rejected; bare % stays legitimate (no false positive)
  chk('CODEX5-4a: triple-encoded path id → rejected', F.buildSyntheticF312Case({ caseId: 'file%25253A%25252F%25252Fx' }).valid === false);
  chk('CODEX5-4b: %uXXXX-encoded path id → rejected', F.buildSyntheticF312Case({ caseId: 'file%u003A%u002F%u002Fx' }).valid === false);
  chk('CODEX5-4c: truncated valid-hex encoding → fail closed', mkSetup({ snapshotId: 'x%E0%A' }).valid === false);
  chk('CODEX5-4d: legitimate bare-% value accepted (no false positive)', mkSetup({ tyreContext: { note: '50% worn' } }).valid === true);
})();

// ── Codex acceptance regressions (getter-not-executed, array own props, serialize fail-closed) ────
(() => {
  // serialize runs JSON-safety FIRST → an accessor getter is never executed, and it returns null
  const c = F.buildSyntheticF312Case(); let sh = 0; Object.defineProperty(c, 'caseId', { configurable: true, enumerable: true, get() { sh++; return 'x'; } });
  const ser = AC.serializeAnalysisCase(c);
  chk('ACC-1: serialize accessor → null + getter NOT executed', ser === null && sh === 0);
  // make checks json-safety BEFORE cloning → accessor getter never executed
  let hits = 0; const z = { vehicleProfileId: F.PROFILE_ID, selectedOptions: [], measuredSettings: {}, unresolvedSelections: [] }; Object.defineProperty(z, 'snapshotId', { enumerable: true, get() { hits++; return 'x'; } });
  chk('ACC-2: make accessor → invalid + getter NOT executed', SS.makeSetupSnapshot(z).valid === false && hits === 0);
  // an array's OWN symbol / non-enumerable / accessor properties are rejected (not just its indexed elements)
  const a1 = [{ category: 'spring', optionId: 'o' }]; a1[Symbol('x')] = [1];
  chk('ACC-3a: array symbol own prop → rejected', SS.makeSetupSnapshot({ snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: a1, measuredSettings: {}, unresolvedSelections: [] }).valid === false);
  const a2 = [{ category: 'spring', optionId: 'o' }]; Object.defineProperty(a2, 'sneaky', { value: [1], enumerable: false });
  chk('ACC-3b: array non-enumerable own prop → rejected', SS.makeSetupSnapshot({ snapshotId: 's', vehicleProfileId: F.PROFILE_ID, selectedOptions: a2, measuredSettings: {}, unresolvedSelections: [] }).valid === false);
})();

// ── final acceptance regressions (validate getter-not-executed; transparent proxy = plain target) ──
(() => {
  // validate runs JSON-safety FIRST and returns immediately → a rejected accessor's getter is never executed
  const c = F.buildSyntheticF312Case(); let h = 0; Object.defineProperty(c, 'caseId', { configurable: true, enumerable: true, get() { h++; return 'x'; } });
  const v = AC.validateAnalysisCase(c);
  chk('ACC-4a: validate accessor → invalid + getter NOT executed', v.ok === false && h === 0);
  const s = { kind: 'setup_snapshot' }; let h2 = 0; Object.defineProperty(s, 'snapshotId', { enumerable: true, get() { h2++; return 'x'; } });
  chk('ACC-4b: validate setup accessor → invalid + getter NOT executed', SS.validateSetupSnapshot(s).ok === false && h2 === 0);
  // a fully transparent proxy over a VALID plain case is treated as that plain data (documented limitation,
  // not a leak: it can only forward what the underlying plain object already holds)
  const tp = new Proxy(F.buildSyntheticF312Case(), {});
  chk('ACC-4c: transparent proxy over a valid case → behaves as its plain target', AC.validateAnalysisCase(tp).ok === true);
})();

console.log(`analysis-case-adversarial: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
