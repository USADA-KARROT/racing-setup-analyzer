/**
 * tests/setup-snapshot.test.js — R2.1D SetupSnapshot contract tests (PURE).
 * Run: node tests/setup-snapshot.test.js
 */
'use strict';
const CP = require('../renderer/js/canonical-parameters.js');
const SS = require('../renderer/js/setup-snapshot.js');
let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const OC = SS.SETUP_OPTION_CATEGORY;

console.log('=== setup-snapshot tests ===');

// ── clean-room id guard ─────────────────────────────────────────────────────────────────────────
(() => {
  chk('priv: unix path → private', SS.isPrivateRef('/Users/x/a.csv') === true);
  chk('priv: windows path → private', SS.isPrivateRef('C:\\data\\f.xlsx') === true);
  chk('priv: bmsbin filename → private', SS.isPrivateRef('session.bmsbin') === true);
  chk('priv: iCloud folder → private', SS.isPrivateRef('iCloud/x') === true);
  chk('priv: 個人資料 → private', SS.isPrivateRef('個人資料/x') === true);
  chk('priv: 32-hex fingerprint → private', SS.isPrivateRef('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4') === true);
  chk('priv: empty → private', SS.isPrivateRef('') === true);
  chk('priv: non-string → private', SS.isPrivateRef(123) === true);
  chk('priv: opaque id → ok', SS.isPrivateRef('syn_setup_001') === false && SS.isPrivateRef('f312_audit_fixture') === false);
})();

// ── basic snapshot ──────────────────────────────────────────────────────────────────────────────
const good = (o) => SS.makeSetupSnapshot(Object.assign({
  snapshotId: 'syn_setup_001', vehicleProfileId: 'f312_audit',
  selectedOptions: [{ category: OC.SPRING, optionId: 'syn_spring_950', appliesToParameter: 'rearWheelRateNmm' }],
  measuredSettings: { ride: { value: 16, unit: 'mm', definition: 'front ride height', basis: CP.SOURCE_BASIS.CHASSIS, source: 's', provenance: CP.PROVENANCE.MEASURED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.F312 } },
  unresolvedSelections: [],
}, o));
(() => {
  const s = good({});
  chk('basic: valid', s.valid && s.errors.length === 0, s.errors);
  chk('basic: schemaVersion set', s.schemaVersion === SS.SCHEMA_VERSION);
  chk('basic: selected option preserved (reference, no value)', s.selectedOptions[0].optionId === 'syn_spring_950' && !('value' in s.selectedOptions[0]));
  chk('basic: measured setting is a raw source w/ unit+basis+provenance', s.measuredSettings.ride.kind === 'raw_source' && s.measuredSettings.ride.unit === 'mm' && s.measuredSettings.ride.provenance === CP.PROVENANCE.MEASURED);
  chk('basic: provenance summary counts measured', s.provenanceSummary.byProvenance.measured === 1 && s.provenanceSummary.measuredCount === 1);
})();

// ── fail-closed ─────────────────────────────────────────────────────────────────────────────────
(() => {
  chk('fc: private snapshotId → invalid', good({ snapshotId: '/tmp/x.csv' }).errors.indexOf('snapshot_id_invalid_or_private') !== -1);
  chk('fc: private vehicleProfileId → invalid', good({ vehicleProfileId: 'C:\\p' }).errors.indexOf('vehicle_profile_id_invalid_or_private') !== -1);
  chk('fc: bad option category → invalid', good({ selectedOptions: [{ category: 'nope', optionId: 'x' }] }).valid === false);
  chk('fc: private optionId → invalid', good({ selectedOptions: [{ category: OC.SPRING, optionId: 'a.bmsbin' }] }).valid === false);
  chk('fc: selectedOptions non-array → invalid', good({ selectedOptions: 'x' }).errors.indexOf('selected_options_not_array') !== -1);
  // a measured ratio without ratioDefinition is rejected (inherited from makeRawSource)
  chk('fc: ratio-like measured setting w/o ratioDefinition → invalid', good({ measuredSettings: { mr: { value: 1.3, unit: 'dimensionless', definition: 'rear wheel/spring ratio', basis: CP.SOURCE_BASIS.WHEEL, source: 's', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.BOTH } } }).valid === false);
  chk('fc: malformed unresolved selection → invalid', good({ unresolvedSelections: [{ category: OC.ARB }] }).errors.indexOf('unresolved_selection_malformed') !== -1);
})();

// ── unknown stays unknown (no generic fill) + unresolved tracking ─────────────────────────────────
(() => {
  const s = good({
    measuredSettings: { cg: { value: null, unit: 'mm', definition: 'cg height', basis: CP.SOURCE_BASIS.CHASSIS, source: 's', provenance: CP.PROVENANCE.UNKNOWN, confidence: CP.CONFIDENCE.UNKNOWN, applicability: CP.APPLICABILITY.BOTH } },
    unresolvedSelections: [{ category: OC.ARB, optionId: 'syn_arb', reason: 'arb_motion_ratio_unknown', parameterKey: 'frontArbRollStiffnessNmDeg' }],
  });
  chk('unknown: null measured value kept (not filled)', s.measuredSettings.cg.value === null && s.measuredSettings.cg.provenance === CP.PROVENANCE.UNKNOWN);
  chk('unknown: unresolved selection tracked', s.unresolvedSelections.length === 1 && s.unresolvedSelections[0].parameterKey === 'frontArbRollStiffnessNmDeg');
  chk('unknown: provenance summary counts unknown', s.provenanceSummary.byProvenance.unknown === 1);
})();

// ── determinism / no mutation ─────────────────────────────────────────────────────────────────────
(() => {
  const input = { snapshotId: 'syn_setup_001', vehicleProfileId: 'f312_audit', selectedOptions: [{ category: OC.SPRING, optionId: 'syn_spring_950' }], measuredSettings: {}, unresolvedSelections: [] };
  const before = JSON.stringify(input);
  SS.makeSetupSnapshot(input);
  chk('mutation: input object not mutated', JSON.stringify(input) === before);
  chk('determinism: same input → same valid/summary', JSON.stringify(SS.makeSetupSnapshot(input).provenanceSummary) === JSON.stringify(SS.makeSetupSnapshot(input).provenanceSummary));
})();

// ── Codex independent-review regressions ─────────────────────────────────────────────────────────
(() => {
  // MED2: a caller editing input AFTER build must NOT reach the snapshot (deep clone isolation)
  const inp = { snapshotId: 's', vehicleProfileId: 'p', selectedOptions: [{ category: OC.SPRING, optionId: 'o' }], measuredSettings: {}, unresolvedSelections: [], tyreContext: { compoundId: 'c', note: 'before' } };
  const snap = SS.makeSetupSnapshot(inp); inp.tyreContext.note = 'after'; inp.selectedOptions[0].optionId = 'CHANGED';
  chk('CODEX-MED2: caller mutation after build does not reach snapshot', snap.tyreContext.note === 'before' && snap.selectedOptions[0].optionId === 'o', { note: snap.tyreContext.note, opt: snap.selectedOptions[0].optionId });
  // electronic setting value must be scalar (no array/object payload) — uses an ALLOWLISTED setting key
  chk('CODEX-MED2b: non-scalar electronic value → invalid', good({ electronicSettings: { differential: { value: [1, 2, 3] } } }).errors.indexOf('electronic_differential_value_not_scalar') !== -1);
  // tyre context must be flat scalar (no nested payload) — uses an ALLOWLISTED tyre key
  chk('CODEX-MED2c: non-scalar tyre context value → invalid', good({ tyreContext: { compoundId: 'c', set: [1, 2] } }).errors.indexOf('tyre_context_set_not_scalar') !== -1);
  // FIXED allowlist: an unknown setting / context key is a hard error (not a silent drop)
  chk('CODEX3-ALLOW: unknown electronic key → hard error', good({ electronicSettings: { madeUpKnob: { value: 1 } } }).errors.indexOf('electronic_madeUpKnob_unknown_key') !== -1);
  chk('CODEX3-ALLOW2: unknown tyre context key → hard error', good({ tyreContext: { compoundId: 'c', foo: 1 } }).errors.indexOf('tyre_context_foo_unknown_key') !== -1);
  // round-2: every setup string value must pass the path rule (but a bare-slash value like '60/80' is fine)
  chk('CODEX2-HIGH3a: path in tyre context note → invalid', good({ tyreContext: { compoundId: 'c', note: '/private/tmp/run.bin' } }).errors.indexOf('tyre_context_note_private_value') !== -1);
  chk('CODEX2-HIGH3b: path in electronic value → invalid', good({ electronicSettings: { differential: { value: '/Users/x/a.csv' } } }).errors.indexOf('electronic_differential_value_private') !== -1);
  chk('CODEX2-HIGH3c: legitimate slash value (60/80 diff) accepted', good({ electronicSettings: { differential: { value: '60/80' } } }).valid === true);
  chk('CODEX2-HIGH3d: validateSetupSnapshot re-runs tyre/electronic schema', SS.validateSetupSnapshot(Object.assign(good({}), { tyreContext: { note: '/private/x.bin' } })).ok === false);
})();

console.log(`setup-snapshot: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
