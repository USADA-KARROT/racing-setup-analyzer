/**
 * canonical-parameters.js — R2.1A: Canonical Engineering Parameter Contract (PURE data contract).
 *
 * The bottom-most layer of the "Analysis Case Foundation". It defines the THREE-LAYER shape that
 * any vehicle engineering value must pass through before it can reach the physics core:
 *
 *     RawSourceValue   →   ConversionRecord   →   CanonicalModelParameter
 *     (manual / sheet)     (provenance-aware)     (model-ready, fixed unit)
 *
 * WHY THIS EXISTS (F3 audit finding): "the value entered the model before its physical meaning was
 * standardised". A pretty {value, provenance, confidence} schema only structures the mess. The cure
 * is to make the *physical definition* (basis, ratio direction, unit) and the *transform status*
 * first-class, gating fields — so a documented-but-unconverted value can NEVER masquerade as
 * model-ready.
 *
 * RED LINES (must not break — enforced by canonical-parameters.test.js):
 *  • This file changes NO model result. It is data shape + fail-closed validation only. No physics,
 *    no UI, no Advisor, no preset, no telemetry. It does not import dynamics-model.js.
 *  • A motion ratio is NEVER a bare number: its travel ratio numerator & denominator are explicit.
 *  • modelUsable is a CAPABILITY gate, decided by {provenance, conversionStatus, value-present,
 *    blockers} — NEVER by confidence alone. estimated/unknown/unverified/blocked → never usable.
 *  • A value produced by a conversion is provenance 'derived'. It may NEVER be promoted to
 *    'documented'/'measured'. (derived ≠ documented.)
 *  • use_wheel_rate is recorded ONLY as a legacy-compatibility note on the canonical wheel-rate
 *    parameter; it is NOT the new architecture's semantics. The new path carries wheel rate directly.
 *
 * UMD: Node require / Electron renderer global (CanonicalParameters). No deps, no DOM.
 */
(function (root) {
  'use strict';

  // ── enums (frozen vocabularies — the schema's controlled language) ─────────────────────────────

  // Where a raw value physically "lives" — what the number is measured at / referred to.
  var SOURCE_BASIS = Object.freeze({
    SPRING_ELEMENT: 'spring_element',           // rate at the coil/torsion element itself
    WHEEL: 'wheel',                             // already referred to the wheel/contact patch
    GROUND: 'ground',                           // manufacturer "ground stiffness" = wheel-referred
    ARB_BLADE_COMPONENT: 'arb_blade_component', // one end locked, other end displaced 1 unit (legacy)
    ARB_DROPLINK: 'arb_droplink',               // at the droplink
    ARB_GROUND_ANTI_SYMMETRIC: 'arb_ground_anti_symmetric', // F320-style: 2×component, wheel-referred
    CHASSIS: 'chassis',                         // a geometric/inertial chassis quantity (track, mass…)
    UNKNOWN: 'unknown',
  });

  // Tokens allowed as motion-ratio travel terms (numerator / denominator).
  var TRAVEL_TERM = Object.freeze({
    WHEEL: 'wheel_travel',
    SPRING: 'spring_travel',
    DROPLINK: 'droplink_travel',
  });

  // Evidence quality of WHERE a value came from (not how sure we "feel").
  var PROVENANCE = Object.freeze({
    DOCUMENTED: 'documented',   // straight from a manufacturer manual / parts list / setup sheet
    DERIVED: 'derived',         // produced by a transform from documented inputs
    MEASURED: 'measured',       // from real measurement (corner weights, dyno, alignment)
    ESTIMATED: 'estimated',     // a typical/assumed value, no source for THIS car
    UNKNOWN: 'unknown',         // genuinely not available
  });

  var CONFIDENCE = Object.freeze({ HIGH: 'high', MEDIUM: 'medium', LOW: 'low', UNKNOWN: 'unknown' });

  // Which chassis generation a datum applies to. F312 & F317 share one manual (Euroformula Open).
  var APPLICABILITY = Object.freeze({
    F312: 'f312', F317: 'f317', BOTH: 'both', UNCLEAR: 'unclear', NA: 'na',
  });

  // The state of the raw→canonical transform for a parameter.
  var CONVERSION_STATUS = Object.freeze({
    VERIFIED: 'verified',         // transform has a proof test locking its formula/direction
    UNVERIFIED: 'unverified',     // transform exists but is not yet test-locked
    BLOCKED: 'blocked',           // cannot convert yet (missing input / architecture gap)
    NOT_REQUIRED: 'not_required', // value already canonical (e.g. track in mm) — identity/pass-through
    REJECTED: 'rejected',         // input basis/definition is illegal for the requested conversion
  });

  // ── canonical model parameters: the FIXED vocabulary the physics core consumes ────────────────
  // Each canonical parameter has ONE unit. A value is only ever stored against this unit.
  var CANONICAL_PARAM = Object.freeze({
    // core rate quantities (the contract's mandated minimum)
    FRONT_WHEEL_RATE: 'frontWheelRateNmm',                 // N/mm at the wheel (already MR-folded)
    REAR_WHEEL_RATE: 'rearWheelRateNmm',                   // N/mm at the wheel
    FRONT_ARB_ROLL_STIFFNESS: 'frontArbRollStiffnessNmDeg',// Nm/deg axle roll stiffness
    REAR_ARB_ROLL_STIFFNESS: 'rearArbRollStiffnessNmDeg',  // Nm/deg axle roll stiffness
    // geometry / inertia (mostly documented, identity)
    FRONT_TRACK: 'frontTrackMm',
    REAR_TRACK: 'rearTrackMm',
    WHEELBASE: 'wheelbaseMm',
    MASS: 'massKg',
    FRONT_WEIGHT_PCT: 'frontWeightPct',
    CG_HEIGHT: 'cgHeightMm',
    FRONT_ROLL_CENTRE_HEIGHT: 'frontRollCentreHeightMm',
    REAR_ROLL_CENTRE_HEIGHT: 'rearRollCentreHeightMm',
    FRONT_TYRE_VERTICAL_RATE: 'frontTyreVerticalRateNmm',
    REAR_TYRE_VERTICAL_RATE: 'rearTyreVerticalRateNmm',
    STEERING_RATIO_OVERALL: 'steeringRatioOverall',        // dimensionless (wheel°/road°)
  });

  var CANONICAL_UNIT = Object.freeze({
    frontWheelRateNmm: 'N/mm', rearWheelRateNmm: 'N/mm',
    frontArbRollStiffnessNmDeg: 'Nm/deg', rearArbRollStiffnessNmDeg: 'Nm/deg',
    frontTrackMm: 'mm', rearTrackMm: 'mm', wheelbaseMm: 'mm',
    massKg: 'kg', frontWeightPct: '%', cgHeightMm: 'mm',
    frontRollCentreHeightMm: 'mm', rearRollCentreHeightMm: 'mm',
    frontTyreVerticalRateNmm: 'N/mm', rearTyreVerticalRateNmm: 'N/mm',
    steeringRatioOverall: ':1',
  });

  function _isEnum(obj, v) { for (var k in obj) { if (obj[k] === v) return true; } return false; }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }

  // ── layer 1: RawSourceValue ───────────────────────────────────────────────────────────────────
  /**
   * @param {Object} o
   *   value: number|null, unit: string, definition: string (free, human),
   *   basis: SOURCE_BASIS, ratioDefinition: {numerator:TRAVEL_TERM, denominator:TRAVEL_TERM}|null,
   *   source: string (sanitized citation id), provenance, confidence, applicability, notes?: string[]
   * Fail-closed: an invalid enum / a motion-style basis without an explicit ratioDefinition does NOT
   * throw — it returns an object with errors[] and valid:false, so a fixture can record the problem.
   */
  function makeRawSource(o) {
    o = o || {};
    var errors = [];
    if (!('value' in o)) errors.push('missing_value_key'); // null is allowed (unknown), undefined is not
    if (typeof o.unit !== 'string' || !o.unit) errors.push('missing_unit');
    if (typeof o.definition !== 'string' || !o.definition) errors.push('missing_definition');
    if (!_isEnum(SOURCE_BASIS, o.basis)) errors.push('bad_basis');
    if (!_isEnum(PROVENANCE, o.provenance)) errors.push('bad_provenance');
    if (!_isEnum(CONFIDENCE, o.confidence)) errors.push('bad_confidence');
    if (!_isEnum(APPLICABILITY, o.applicability)) errors.push('bad_applicability');
    var ratio = o.ratioDefinition || null;
    if (ratio) {
      if (!_isEnum(TRAVEL_TERM, ratio.numerator) || !_isEnum(TRAVEL_TERM, ratio.denominator)) {
        errors.push('bad_ratio_definition');
      } else if (ratio.numerator === ratio.denominator) {
        errors.push('degenerate_ratio_definition');
      }
    } else if (typeof o.definition === 'string' && /\bratio\b/i.test(o.definition) && o.unit === 'dimensionless') {
      // STRUCTURAL enforcement: a datum that calls itself a ratio MUST declare its travel terms —
      // the "never a bare number" rule must bite at storage, not only where C1 consumes it.
      errors.push('motion_ratio_missing_definition');
    }
    if (o.value != null && !_isFiniteNum(o.value)) errors.push('non_finite_value');
    return {
      kind: 'raw_source',
      value: ('value' in o) ? o.value : undefined,
      unit: o.unit || null,
      definition: o.definition || null,
      basis: o.basis || null,
      ratioDefinition: ratio,
      source: o.source || null,
      provenance: o.provenance || null,
      confidence: o.confidence || null,
      applicability: o.applicability || null,
      notes: Array.isArray(o.notes) ? o.notes.slice() : [],
      valid: errors.length === 0,
      errors: errors,
    };
  }

  // ── layer 2: ConversionRecord ─────────────────────────────────────────────────────────────────
  /**
   * A self-describing record of one raw→canonical transform. It KEEPS the full provenance trail:
   * raw value/unit/definition/basis (+ratio), the formula string, conversion id+version, source,
   * and the canonical result. ok=false carries a reason and leaves output.value=null (fail-closed).
   */
  function makeConversionRecord(o) {
    o = o || {};
    return {
      kind: 'conversion_record',
      conversionId: o.conversionId || null,
      version: o.version || null,
      formula: o.formula || null,
      status: _isEnum(CONVERSION_STATUS, o.status) ? o.status : CONVERSION_STATUS.UNVERIFIED,
      inputs: {
        rawValue: (o.inputs && 'rawValue' in o.inputs) ? o.inputs.rawValue : null,
        rawUnit: (o.inputs && o.inputs.rawUnit) || null,
        rawDefinition: (o.inputs && o.inputs.rawDefinition) || null,
        rawBasis: (o.inputs && o.inputs.rawBasis) || null,
        ratioDefinition: (o.inputs && o.inputs.ratioDefinition) || null,
        auxiliary: (o.inputs && o.inputs.auxiliary) || null, // e.g. {trackMm, arbMr} used by the formula
      },
      output: {
        parameter: (o.output && o.output.parameter) || null,
        value: (o.output && 'value' in o.output) ? o.output.value : null,
        unit: (o.output && o.output.unit) || null,
        // a converted motion ratio MUST keep its explicit travel-ratio direction (never a bare number)
        ratioDefinition: (o.output && o.output.ratioDefinition) || null,
      },
      source: o.source || null,
      ok: o.ok === true,
      reason: o.reason || null,
    };
  }

  // ── layer 3: CanonicalModelParameter ──────────────────────────────────────────────────────────
  var _MODEL_USABLE_PROVENANCE = [PROVENANCE.DOCUMENTED, PROVENANCE.DERIVED, PROVENANCE.MEASURED];
  var _MODEL_USABLE_CONV = [CONVERSION_STATUS.VERIFIED, CONVERSION_STATUS.NOT_REQUIRED];
  // Rate / stiffness params can NEVER be entered as a bare documented number — they only become
  // model-usable through a conversion (so a raw lb/in or kgf/mm can't masquerade as canonical N/mm or
  // Nm/deg). They therefore REQUIRE a conversionRef to be usable.
  var _RATE_LIKE_PARAMS = [
    CANONICAL_PARAM.FRONT_WHEEL_RATE, CANONICAL_PARAM.REAR_WHEEL_RATE,
    CANONICAL_PARAM.FRONT_ARB_ROLL_STIFFNESS, CANONICAL_PARAM.REAR_ARB_ROLL_STIFFNESS,
    CANONICAL_PARAM.FRONT_TYRE_VERTICAL_RATE, CANONICAL_PARAM.REAR_TYRE_VERTICAL_RATE,
  ];

  /**
   * Build a canonical model parameter and DECIDE modelUsable by capability rules (never confidence):
   *   usable ⇔ value is finite
   *          ∧ provenance ∈ {documented, derived, measured}
   *          ∧ conversionStatus ∈ {verified, not_required}
   *          ∧ no explicit blockers (a non-array blockers input fails CLOSED, never silently dropped)
   *          ∧ provenance trail present: derived ⇒ conversionRef; rate/stiffness param ⇒ conversionRef
   * `legacyUseWheelRate` (optional) is recorded ONLY as a note for wheel-rate params; it does not
   * affect the value (the canonical value is already the wheel rate).
   */
  function makeCanonicalParameter(o) {
    o = o || {};
    var param = o.parameter;
    var unit = CANONICAL_UNIT[param] || null;
    // FAIL CLOSED on a malformed blockers input — a truthy non-array block-intent must NOT vanish.
    var blockers = [];
    if (Array.isArray(o.blockers)) blockers = o.blockers.slice();
    else if (o.blockers != null) blockers.push('malformed_blockers_input');
    var errors = [];
    if (!_isEnum(CANONICAL_PARAM, param)) errors.push('bad_parameter');
    if (!_isEnum(PROVENANCE, o.provenance)) errors.push('bad_provenance');
    if (!_isEnum(CONVERSION_STATUS, o.conversionStatus)) errors.push('bad_conversion_status');
    if (!_isEnum(APPLICABILITY, o.applicability)) errors.push('bad_applicability');
    if (o.value != null && !_isFiniteNum(o.value)) errors.push('non_finite_value');

    var valuePresent = _isFiniteNum(o.value);
    var provOk = _MODEL_USABLE_PROVENANCE.indexOf(o.provenance) !== -1;
    var convOk = _MODEL_USABLE_CONV.indexOf(o.conversionStatus) !== -1;
    var hasConversionRef = typeof o.conversionRef === 'string' && o.conversionRef.length > 0;
    var isRateLike = _RATE_LIKE_PARAMS.indexOf(param) !== -1;
    // provenance-trail gate: a derived value, or any rate/stiffness param, must point at a conversion.
    var trailOk = true, trailBlock = null;
    if (o.provenance === PROVENANCE.DERIVED && !hasConversionRef) { trailOk = false; trailBlock = 'derived_without_conversion_ref'; }
    else if (isRateLike && !hasConversionRef) { trailOk = false; trailBlock = 'rate_param_without_conversion_ref'; }
    // derived guard: a derived value with an unverified/blocked/rejected transform is never usable.
    var modelUsable = errors.length === 0 && valuePresent && provOk && convOk && trailOk && blockers.length === 0;
    if (!modelUsable) {
      if (!valuePresent) blockers.indexOf('value_unavailable') === -1 && blockers.push('value_unavailable');
      if (!provOk && errors.length === 0) blockers.indexOf('provenance_not_model_grade') === -1 && blockers.push('provenance_not_model_grade');
      if (!convOk && errors.length === 0) blockers.indexOf('conversion_not_verified') === -1 && blockers.push('conversion_not_verified');
      if (!trailOk && errors.length === 0 && trailBlock) blockers.indexOf(trailBlock) === -1 && blockers.push(trailBlock);
    }
    return {
      kind: 'canonical_parameter',
      parameter: param || null,
      value: ('value' in o) ? (valuePresent ? o.value : null) : null,
      unit: unit,
      provenance: o.provenance || null,
      confidence: _isEnum(CONFIDENCE, o.confidence) ? o.confidence : CONFIDENCE.UNKNOWN,
      conversionStatus: o.conversionStatus || null,
      applicability: o.applicability || null,
      conversionRef: o.conversionRef || null,   // conversionId that produced this (null if direct)
      sourceRef: o.sourceRef || null,           // raw source citation id
      legacyUseWheelRate: o.legacyUseWheelRate === true ? true : undefined, // legacy-compat note only
      modelUsable: modelUsable,
      blockers: blockers,
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Referential-integrity check for a canonical parameter against a conversion registry (injected to
   * avoid a circular dependency on parameter-conversions.js). A DERIVED value must point at a real
   * conversion id; a VERIFIED-status derived value's conversion must itself be registry-verified.
   * Non-derived params pass (their trail is sourceRef, validated where they are built).
   * @returns {ok:boolean, reason:string|null}
   */
  function checkConversionIntegrity(param, registry) {
    if (!param || param.kind !== 'canonical_parameter') return { ok: false, reason: 'not_canonical_parameter' };
    if (param.provenance !== PROVENANCE.DERIVED) return { ok: true, reason: null };
    var ref = param.conversionRef;
    if (typeof ref !== 'string' || !ref) return { ok: false, reason: 'derived_without_conversion_ref' };
    if (!registry || !registry[ref]) return { ok: false, reason: 'conversion_ref_not_in_registry' };
    if (param.conversionStatus === CONVERSION_STATUS.VERIFIED && registry[ref].verified !== true) {
      return { ok: false, reason: 'verified_status_but_registry_unverified' };
    }
    return { ok: true, reason: null };
  }

  var api = {
    SOURCE_BASIS: SOURCE_BASIS, TRAVEL_TERM: TRAVEL_TERM, PROVENANCE: PROVENANCE,
    CONFIDENCE: CONFIDENCE, APPLICABILITY: APPLICABILITY, CONVERSION_STATUS: CONVERSION_STATUS,
    CANONICAL_PARAM: CANONICAL_PARAM, CANONICAL_UNIT: CANONICAL_UNIT,
    makeRawSource: makeRawSource, makeConversionRecord: makeConversionRecord,
    makeCanonicalParameter: makeCanonicalParameter, checkConversionIntegrity: checkConversionIntegrity,
    // exposed for tests
    _isEnum: _isEnum, _RATE_LIKE_PARAMS: _RATE_LIKE_PARAMS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CanonicalParameters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
