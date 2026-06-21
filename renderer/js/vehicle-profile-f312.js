/**
 * vehicle-profile-f312.js — R2.1C: F312 / F317 audit FIXTURE (PURE data, NOT a UI preset).
 *
 * This is the first concrete VehicleProfile built on the canonical contract. It is deliberately NOT
 * wired to the app, NOT an official car preset, and NOT fed to the model. Its only job is to prove
 * the contract holds against real audit numbers and stays fail-closed where evidence is missing.
 *
 * SOURCING RULES (locked by the brief):
 *  • Only audit-verified manufacturer/setup-sheet table values (no illustrative numbers from chat).
 *  • Adjustable items (torsion bar / spring / ARB) are kept as the FULL option table — we never pick
 *    one "standard" value as the car's fixed rate (that choice belongs to a future SetupSnapshot).
 *  • Unknown fields (CG, absolute roll-centre, 13" slick vertical operating-point rate, third element
 *    rate) STAY unknown — no generic placeholder.
 *  • F312 & F317 share one manual (Euroformula Open). Every datum carries an applicability tag
 *    (f312 | f317 | both | unclear).
 *
 * Layered shape (per the agreed VehicleProfile design):
 *   identity · documentedSourceData(fixed + optionTables) · canonicalModelParameters(fixed +
 *   optionTables) · unknowns · validationStatus.
 *
 * RED LINE: changes no model result; pure assembly over canonical-parameters + parameter-conversions.
 * UMD: Node require / Electron renderer global (VehicleProfileF312).
 */
(function (root) {
  'use strict';

  var _cp = null, _pc = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { _cp = require('./canonical-parameters.js'); } catch (e) { _cp = null; }
    try { _pc = require('./parameter-conversions.js'); } catch (e) { _pc = null; }
  }
  var CP = _cp || (typeof CanonicalParameters !== 'undefined' ? CanonicalParameters : null);
  var PC = _pc || (typeof ParameterConversions !== 'undefined' ? ParameterConversions : null);
  if (!CP || !PC) throw new Error('vehicle-profile-f312.js requires canonical-parameters.js + parameter-conversions.js');

  var B = CP.SOURCE_BASIS, T = CP.TRAVEL_TERM, P = CP.PROVENANCE, C = CP.CONFIDENCE, A = CP.APPLICABILITY,
      S = CP.CONVERSION_STATUS, K = CP.CANONICAL_PARAM;

  // ── sanitized citation ids (no file paths / no raw private data) ──────────────────────────────
  var SRC = {
    manual: 'dallara_f312_f317_owners_manual',     // shared Euroformula Open manual
    sheet: 'f312_setup_record_sheet',              // sanitized setup sheet (percentages/derived only)
    tyre: 'f3_2015_tyre_spec_sheet',
    ref: 'reference_f312_specs',                    // local sanitized spec memo
  };

  function raw(o) { return CP.makeRawSource(o); }

  // ── DOCUMENTED SOURCE DATA — fixed chassis/geometry/inertia ───────────────────────────────────
  var FIXED_SOURCES = {
    frontTrack: raw({ value: 1595, unit: 'mm', definition: 'front track', basis: B.CHASSIS, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH }),
    rearTrack: raw({ value: 1540, unit: 'mm', definition: 'rear track', basis: B.CHASSIS, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH }),
    wheelbase: raw({ value: 2800, unit: 'mm', definition: 'wheelbase', basis: B.CHASSIS, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH }),
    mass: raw({ value: 565, unit: 'kg', definition: 'minimum weight incl. driver+ballast (F3 reg); Suzuka sheet shows 569 full', basis: B.CHASSIS, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.F312, notes: ['Euroformula F317 minimum weight may differ → not tagged both'] }),
    frontWeightPct: raw({ value: 49.4, unit: '%', definition: 'front weight share incl. driver (sanitized from corner weights)', basis: B.CHASSIS, source: SRC.sheet, provenance: P.MEASURED, confidence: C.MEDIUM, applicability: A.F312, notes: ['percentage only; raw corner weights stay private'] }),
    steeringRatio: raw({ value: 12.5, unit: ':1', definition: 'overall static steering ratio (wheel°/road°)', basis: B.CHASSIS, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH }),
    // motion ratios — explicit travel-ratio direction (manual = wheel/element). REAR feeds the coil
    // conversion; FRONT damper MR is recorded for completeness only (front uses torsion ground rate).
    rearSpringRatioManual: raw({ value: 1.30, unit: 'dimensionless', definition: 'rear wheel/spring travel ratio', basis: B.WHEEL, ratioDefinition: { numerator: T.WHEEL, denominator: T.SPRING }, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH }),
    frontDamperRatioManual: raw({ value: 1.39, unit: 'dimensionless', definition: 'front wheel/damper travel ratio (damper calc only, NOT spring rate)', basis: B.WHEEL, ratioDefinition: { numerator: T.WHEEL, denominator: T.DROPLINK }, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH, notes: ['front spring is a torsion bar given as ground stiffness; this damper MR does not enter wheel-rate'] }),
  };

  // ── DOCUMENTED SOURCE DATA — option tables (adjustable; FULL table kept, never reduced to one) ──
  // Front torsion bar: manual prints torsion[Nm/deg] ↔ ground[N/mm]. Only the rows transcribed in the
  // audit are present; the table is PARTIAL (see unresolved). 'ground' basis ⇒ already wheel-referred.
  var OPTION_SOURCES = {
    frontTorsion: [
      raw({ value: 71.8, unit: 'N/mm', definition: 'front torsion bar ground stiffness (torsion 11.0 Nm/deg)', basis: B.GROUND, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH, notes: ['torsion 11.0 Nm/deg'] }),
      raw({ value: 81.6, unit: 'N/mm', definition: 'front torsion bar ground stiffness (torsion 12.5 Nm/deg)', basis: B.GROUND, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH, notes: ['torsion 12.5 Nm/deg'] }),
    ],
    // Rear coil: element rate (lb/in). Manual baseline 850; Suzuka setup sheet 950. Both kept.
    rearSpring: [
      raw({ value: 850, unit: 'lb/in', definition: 'rear coil element rate (manual baseline)', basis: B.SPRING_ELEMENT, source: SRC.manual, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH }),
      raw({ value: 950, unit: 'lb/in', definition: 'rear coil element rate (Suzuka setup sheet)', basis: B.SPRING_ELEMENT, source: SRC.sheet, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.F312 }),
    ],
    // ARB: component stiffness (kgf/mm, one blade end locked). Only baseline blades recorded.
    frontArb: [
      raw({ value: 60, unit: 'kgf/mm', definition: 'front ARB blade component (D15 medium, baseline)', basis: B.ARB_BLADE_COMPONENT, source: SRC.ref, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.F312, notes: ['blade designation D15 medium'] }),
    ],
    rearArb: [
      raw({ value: 90, unit: 'kgf/mm', definition: 'rear ARB blade component (D17, baseline)', basis: B.ARB_BLADE_COMPONENT, source: SRC.ref, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.F312, notes: ['blade designation D17'] }),
    ],
  };

  // Tyre datasheet single-point vertical rates exist, but the model needs an operating-point rate →
  // recorded as documented raw, yet canonical tyre vertical rate stays UNKNOWN (fail-closed).
  var TYRE_SOURCES = {
    frontTyreVertical: raw({ value: 170, unit: 'N/mm', definition: 'front tyre vertical rate @3kN, 8J (datasheet single point)', basis: B.CHASSIS, source: SRC.tyre, provenance: P.DOCUMENTED, confidence: C.LOW, applicability: A.BOTH, notes: ['200/50R13; load-dependent single point, not an operating-point rate'] }),
    rearTyreVertical: raw({ value: 200, unit: 'N/mm', definition: 'rear tyre vertical rate @3kN (datasheet single point)', basis: B.CHASSIS, source: SRC.tyre, provenance: P.DOCUMENTED, confidence: C.LOW, applicability: A.BOTH, notes: ['240/45R13; load-dependent single point'] }),
  };

  function _canon(parameter, value, provenance, confidence, conversionStatus, applicability, extra) {
    return CP.makeCanonicalParameter(Object.assign({
      parameter: parameter, value: value, provenance: provenance, confidence: confidence,
      conversionStatus: conversionStatus, applicability: applicability,
    }, extra || {}));
  }

  function buildF312Fixture() {
    // ---- fixed canonical params (mostly identity / documented) ----
    var fixed = {
      frontTrackMm: _canon(K.FRONT_TRACK, 1595, P.DOCUMENTED, C.HIGH, S.NOT_REQUIRED, A.BOTH, { sourceRef: SRC.manual }),
      rearTrackMm: _canon(K.REAR_TRACK, 1540, P.DOCUMENTED, C.HIGH, S.NOT_REQUIRED, A.BOTH, { sourceRef: SRC.manual }),
      wheelbaseMm: _canon(K.WHEELBASE, 2800, P.DOCUMENTED, C.HIGH, S.NOT_REQUIRED, A.BOTH, { sourceRef: SRC.manual }),
      massKg: _canon(K.MASS, 565, P.DOCUMENTED, C.MEDIUM, S.NOT_REQUIRED, A.F312, { sourceRef: SRC.manual }),
      frontWeightPct: _canon(K.FRONT_WEIGHT_PCT, 49.4, P.MEASURED, C.MEDIUM, S.NOT_REQUIRED, A.F312, { sourceRef: SRC.sheet }),
      steeringRatioOverall: _canon(K.STEERING_RATIO_OVERALL, 12.5, P.DOCUMENTED, C.HIGH, S.NOT_REQUIRED, A.BOTH, { sourceRef: SRC.manual }),
    };

    // rear software MR from the manual ratio (verified reciprocal conversion)
    var rearMrConv = PC.manualRatioToSoftwareMr(FIXED_SOURCES.rearSpringRatioManual);
    var rearMr = rearMrConv.ok ? rearMrConv.output.value : null;

    // ---- option tables: convert each row to a canonical CANDIDATE (never pick one) ----
    var frontWheelRate = OPTION_SOURCES.frontTorsion.map(function (r) {
      var conv = PC.groundRateToWheelRate(r, K.FRONT_WHEEL_RATE); // identity (ground already wheel-referred)
      return {
        source: r, conversion: conv,
        canonical: _canon(K.FRONT_WHEEL_RATE, conv.ok ? conv.output.value : null,
          conv.ok ? P.DERIVED : P.UNKNOWN, r.confidence, conv.status, r.applicability,
          { conversionRef: conv.conversionId, sourceRef: r.source, legacyUseWheelRate: true }),
      };
    });

    var rearWheelRate = OPTION_SOURCES.rearSpring.map(function (r) {
      var conv = PC.springElementToWheelRate(r, rearMr, K.REAR_WHEEL_RATE);
      return {
        source: r, conversion: conv, motionRatioConversion: rearMrConv,
        canonical: _canon(K.REAR_WHEEL_RATE, conv.ok ? conv.output.value : null,
          conv.ok ? P.DERIVED : P.UNKNOWN, r.confidence, conv.status, r.applicability,
          { conversionRef: conv.conversionId, sourceRef: r.source, legacyUseWheelRate: true }),
      };
    });

    // ARB: arbMr is UNKNOWN for this car → conversion BLOCKED → canonical not model-usable (fail-closed).
    function arbCandidate(r, param, trackMm) {
      var conv = PC.arbComponentToAxleRollStiffness(r, /* arbMr */ null, trackMm, param);
      return {
        source: r, conversion: conv,
        canonical: _canon(param, conv.ok ? conv.output.value : null, P.DERIVED, r.confidence,
          conv.ok ? conv.status : S.BLOCKED, r.applicability,
          { conversionRef: conv.conversionId, sourceRef: r.source, blockers: ['arb_motion_ratio_unknown'] }),
      };
    }
    var frontArb = OPTION_SOURCES.frontArb.map(function (r) { return arbCandidate(r, K.FRONT_ARB_ROLL_STIFFNESS, 1595); });
    var rearArb = OPTION_SOURCES.rearArb.map(function (r) { return arbCandidate(r, K.REAR_ARB_ROLL_STIFFNESS, 1540); });

    // ---- unknowns: explicit, no placeholder ----
    var unknowns = {
      cgHeightMm: _canon(K.CG_HEIGHT, null, P.UNKNOWN, C.UNKNOWN, S.BLOCKED, A.BOTH, { blockers: ['no_measurement_manual_silent'] }),
      frontRollCentreHeightMm: _canon(K.FRONT_ROLL_CENTRE_HEIGHT, null, P.UNKNOWN, C.UNKNOWN, S.BLOCKED, A.BOTH, { blockers: ['tyre_dependent_no_absolute_value'] }),
      rearRollCentreHeightMm: _canon(K.REAR_ROLL_CENTRE_HEIGHT, null, P.UNKNOWN, C.UNKNOWN, S.BLOCKED, A.BOTH, { blockers: ['tyre_dependent_no_absolute_value'] }),
      frontTyreVerticalRateNmm: _canon(K.FRONT_TYRE_VERTICAL_RATE, null, P.UNKNOWN, C.UNKNOWN, S.BLOCKED, A.BOTH, { blockers: ['only_single_point_datasheet_no_operating_point_rate'], sourceRef: SRC.tyre }),
      rearTyreVerticalRateNmm: _canon(K.REAR_TYRE_VERTICAL_RATE, null, P.UNKNOWN, C.UNKNOWN, S.BLOCKED, A.BOTH, { blockers: ['only_single_point_datasheet_no_operating_point_rate'], sourceRef: SRC.tyre }),
      // third element heave rate: no canonical parameter exists (model has no heave state) — structural gap.
      thirdElementHeaveRate: { available: false, reason: 'no_canonical_parameter_model_has_no_heave_state', applicability: A.BOTH, note: 'manual gives third-element MR only, never a rate' },
    };

    return {
      schemaVersion: '1',
      identity: {
        family: 'Dallara F312 / F317 (Euroformula Open, shared manual)',
        generations: ['f312', 'f317'],
        applicabilityNote: 'F312 & F317 share one owners manual; F317 has no independent manual. Setup-sheet measured data is F312-specific.',
        note: 'Audit fixture only — NOT a UI preset, NOT fed to the model.',
      },
      documentedSourceData: {
        fixed: FIXED_SOURCES,
        optionTables: OPTION_SOURCES,
        tyre: TYRE_SOURCES,
      },
      canonicalModelParameters: {
        fixed: fixed,
        optionTables: { frontWheelRate: frontWheelRate, rearWheelRate: rearWheelRate, frontArb: frontArb, rearArb: rearArb },
        rearSoftwareMotionRatio: rearMrConv,
      },
      unknowns: unknowns,
      validationStatus: buildValidationStatus(fixed, { frontWheelRate: frontWheelRate, rearWheelRate: rearWheelRate, frontArb: frontArb, rearArb: rearArb }, unknowns),
    };
  }

  function buildValidationStatus(fixed, optionTables, unknowns) {
    var usable = 0, blocked = 0, unknownCount = 0;
    function tally(p) { if (!p || p.kind !== 'canonical_parameter') return; if (p.modelUsable) usable++; else if (p.value == null && p.provenance === P.UNKNOWN) unknownCount++; else blocked++; }
    Object.keys(fixed).forEach(function (k) { tally(fixed[k]); });
    Object.keys(optionTables).forEach(function (t) { optionTables[t].forEach(function (row) { tally(row.canonical); }); });
    Object.keys(unknowns).forEach(function (k) { var u = unknowns[k]; if (u && u.kind === 'canonical_parameter') tally(u); });
    return {
      modelUsableCount: usable, blockedCount: blocked, unknownCount: unknownCount,
      notes: [
        'modelUsable here = canonical-contract model-ready; it does NOT mean the current renderer can ingest it (use_wheel_rate gap — see migration proposal).',
        'ARB candidates are BLOCKED pending a confirmed ARB motion ratio for this car.',
        'Front torsion + rear spring option tables are PARTIAL (only audit-transcribed rows).',
      ],
    };
  }

  var api = {
    SRC: SRC, FIXED_SOURCES: FIXED_SOURCES, OPTION_SOURCES: OPTION_SOURCES, TYRE_SOURCES: TYRE_SOURCES,
    buildF312Fixture: buildF312Fixture,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VehicleProfileF312 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
