/**
 * tests/fixtures/analysis-case-f312-synthetic.js — fully sanitized synthetic F312/F317 AnalysisCase.
 *
 * Proves: F312/F317 audit profile + synthetic setup selection + synthetic telemetry session metadata
 * + model version snapshot → a VALID, assembled case that is HONESTLY model-input-ineligible
 * (ARB blocked on unknown MR; CG / absolute RC unknown) and comparison/recommendation hard-false.
 *
 * Sanitized: opaque ids only, no real filenames/paths/session ids, no raw telemetry, no generic fill.
 * Canonical inputs are taken straight from the R2.1A/B F312 fixture (real audit values / blocked).
 */
'use strict';
const VP = require('../../renderer/js/vehicle-profile-f312.js');
const SS = require('../../renderer/js/setup-snapshot.js');
const AC = require('../../renderer/js/analysis-case.js');
const CP = require('../../renderer/js/canonical-parameters.js');

const PROFILE_ID = 'f312_f317_audit_fixture';

function buildSyntheticSetupSnapshot() {
  return SS.makeSetupSnapshot({
    snapshotId: 'syn_setup_f312_001',
    vehicleProfileId: PROFILE_ID,
    selectedOptions: [
      { category: SS.SETUP_OPTION_CATEGORY.TORSION_BAR, optionId: 'syn_torsion_125', appliesToParameter: 'frontWheelRateNmm' },
      { category: SS.SETUP_OPTION_CATEGORY.SPRING, optionId: 'syn_rear_coil_950', appliesToParameter: 'rearWheelRateNmm' },
      { category: SS.SETUP_OPTION_CATEGORY.ARB, optionId: 'syn_front_arb_d15', appliesToParameter: 'frontArbRollStiffnessNmDeg' },
      { category: SS.SETUP_OPTION_CATEGORY.ARB, optionId: 'syn_rear_arb_d17', appliesToParameter: 'rearArbRollStiffnessNmDeg' },
    ],
    measuredSettings: {
      front_ride_height: { value: 16, unit: 'mm', definition: 'front ride height (synthetic)', basis: CP.SOURCE_BASIS.CHASSIS, source: 'syn_setup_sheet', provenance: CP.PROVENANCE.MEASURED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.F312 },
      rear_ride_height: { value: 35, unit: 'mm', definition: 'rear ride height (synthetic)', basis: CP.SOURCE_BASIS.CHASSIS, source: 'syn_setup_sheet', provenance: CP.PROVENANCE.MEASURED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.F312 },
    },
    electronicSettings: { differential: { value: '60/80', unit: null, note: 'synthetic diff ramp' } },
    tyreContext: { compoundId: 'syn_a005', note: 'synthetic compound ref' },
    unresolvedSelections: [
      { category: SS.SETUP_OPTION_CATEGORY.ARB, optionId: 'syn_front_arb_d15', reason: 'arb_motion_ratio_unknown', parameterKey: 'frontArbRollStiffnessNmDeg' },
      { category: SS.SETUP_OPTION_CATEGORY.ARB, optionId: 'syn_rear_arb_d17', reason: 'arb_motion_ratio_unknown', parameterKey: 'rearArbRollStiffnessNmDeg' },
    ],
  });
}

function buildCanonicalInputSnapshot() {
  const fx = VP.buildF312Fixture();
  const ot = fx.canonicalModelParameters.optionTables;
  const fixed = fx.canonicalModelParameters.fixed;
  const unk = fx.unknowns;
  return {
    // front from torsion GROUND identity (12.5 Nm/deg → 81.6 N/mm), rear from spring-element × MR² — mixed basis
    frontWheelRateNmm: ot.frontWheelRate[1].canonical,
    rearWheelRateNmm: ot.rearWheelRate[1].canonical,
    // ARB blocked (unknown motion ratio)
    frontArbRollStiffnessNmDeg: ot.frontArb[0].canonical,
    rearArbRollStiffnessNmDeg: ot.rearArb[0].canonical,
    // documented geometry / inertia
    frontTrackMm: fixed.frontTrackMm, rearTrackMm: fixed.rearTrackMm, wheelbaseMm: fixed.wheelbaseMm,
    massKg: fixed.massKg, frontWeightPct: fixed.frontWeightPct,
    // unknowns kept unknown
    cgHeightMm: unk.cgHeightMm, frontRollCentreHeightMm: unk.frontRollCentreHeightMm, rearRollCentreHeightMm: unk.rearRollCentreHeightMm,
  };
}

function buildSyntheticF312Case(overrides) {
  overrides = overrides || {};
  const input = {
    caseId: 'syn_case_f312_001',
    schemaVersion: '1.0.0',
    caseMetadata: { title: 'F312/F317 synthetic audit case', createdAt: '2026-06-21T00:00:00Z', notes: 'synthetic fixture; no private data' },
    vehicleBinding: { profileId: PROFILE_ID, profileSchemaVersion: '1', profileVersion: 'audit-2026-06-21', profileDigest: 'a1b2c3d4', applicability: 'both' },
    setupSnapshot: buildSyntheticSetupSnapshot(),
    telemetryBinding: {
      sessionId: 'syn_session_suzuka_t01', adapterId: 'csv_generic_v1', canonicalSessionSchemaVersion: '1', sourceFormat: 'csv',
      channelCapabilitySummary: { speed: 'confirmed', yawRate: 'confirmed', steeringRaw: 'confirmed', roadWheelAngle: 'unavailable', lateralAcceleration: 'confirmed' },
      qualitySummary: { sampleRateHz: 20, dropout: 'low' },
      confirmationState: { timebase: 'unconfirmed', steeringCalibration: 'unconfirmed' },
    },
    modelSnapshot: {
      modelId: 'dynamics-model', modelVersion: 'v1.6.0', calibrationVersion: 'baseline', canonicalContractVersion: '1.0.0',
      canonicalInputSnapshot: buildCanonicalInputSnapshot(),
    },
    context: { trackProfileRef: null, weatherContext: null, sessionTyreContext: null },
  };
  Object.keys(overrides).forEach((k) => { input[k] = overrides[k]; });
  return AC.createAnalysisCase(input);
}

module.exports = { PROFILE_ID, buildSyntheticSetupSnapshot, buildCanonicalInputSnapshot, buildSyntheticF312Case };
