/**
 * canonical-model-input.js — R2.2 §6: canonical runtime adapter (PURE).
 *
 * The bridge that lets the physics core consume CANONICAL per-axle wheel rates directly, instead of the
 * whole-car `use_wheel_rate` boolean. It maps an AnalysisCase `canonicalInputSnapshot` (R2.1A/B canonical
 * parameters) to a plain `dynamics-model.js` params object whose wheel rates are ALREADY motion-ratio
 * folded — so it sets `use_wheel_rate:true` purely as a COMPATIBILITY flag (the canonical value is the
 * wheel rate; the new path does not re-apply MR²). The legacy preset path is neither rewritten nor routed
 * through here, so existing results stay byte-identical.
 *
 * RED LINES (must not break):
 *  • Pure. Imports only canonical-parameters (the data contract). No dynamics-model, no telemetry, no UI.
 *    Never mutates input. Deterministic. Output params is a fresh plain object.
 *  • Resolves ONLY authoritatively `modelUsable` canonical values — `modelUsable` is RECOMPUTED here
 *    (never trusts a caller-set flag). Any required input not model-usable → resolved:false + structured
 *    blockedReasons; NO partial/guessed params object that could be mistaken for a runnable setup.
 *  • Explicit unit/field mapping (canonical key → model param key), one fixed table; an extra/unknown
 *    canonical key is ignored for params but never silently turned into a model field.
 *
 * UMD: Node require / Electron renderer global (CanonicalModelInput).
 */
(function (root) {
  'use strict';

  var _cp = null;
  if (typeof module !== 'undefined' && module.exports) { try { _cp = require('./canonical-parameters.js'); } catch (e) { _cp = null; } }
  var CP = _cp || (typeof CanonicalParameters !== 'undefined' ? CanonicalParameters : null);
  if (!CP) throw new Error('canonical-model-input.js requires canonical-parameters.js');

  // canonical key → dynamics-model param key (+ whether the model run requires it). Fixed, explicit.
  // The required set mirrors analysis-case REQUIRED_MODEL_INPUTS (the minimal inputs the core needs).
  var MODEL_INPUT_MAP = Object.freeze({
    frontWheelRateNmm: { paramKey: 'front_spring_rate', required: true, unit: 'N/mm' },
    rearWheelRateNmm: { paramKey: 'rear_spring_rate', required: true, unit: 'N/mm' },
    frontArbRollStiffnessNmDeg: { paramKey: 'front_arb', required: true, unit: 'Nm/deg' },
    rearArbRollStiffnessNmDeg: { paramKey: 'rear_arb', required: true, unit: 'Nm/deg' },
    frontTrackMm: { paramKey: 'front_track', required: true, unit: 'mm' },
    rearTrackMm: { paramKey: 'rear_track', required: true, unit: 'mm' },
    wheelbaseMm: { paramKey: 'wheelbase', required: true, unit: 'mm' },
    massKg: { paramKey: 'total_weight', required: true, unit: 'kg' },
    frontWeightPct: { paramKey: 'weight_front_pct', required: true, unit: '%' },
    cgHeightMm: { paramKey: 'cg_height', required: true, unit: 'mm' },
    frontRollCentreHeightMm: { paramKey: 'front_roll_center_height', required: true, unit: 'mm' },
    rearRollCentreHeightMm: { paramKey: 'rear_roll_center_height', required: true, unit: 'mm' },
    // optional tyre vertical rate: model uses ONE tire_spring_rate (front used if both axles usable+present);
    // when absent the core's own default (220 N/mm) applies. Recorded as a known first-version limitation.
    frontTyreVerticalRateNmm: { paramKey: 'tire_spring_rate', required: false, unit: 'N/mm' },
  });

  function _blocker(code, parameterKey, detail) {
    return { code: code, scope: 'model', parameterKey: parameterKey || null, detail: detail || null };
  }

  // authoritative re-evaluation: never trust a caller-set modelUsable. Rebuild via makeCanonicalParameter.
  function _authoritative(p) {
    if (!p || p.kind !== 'canonical_parameter') return null;
    return CP.makeCanonicalParameter({
      parameter: p.parameter, value: p.value, provenance: p.provenance, confidence: p.confidence,
      conversionStatus: p.conversionStatus, applicability: p.applicability,
      conversionRef: p.conversionRef, sourceRef: p.sourceRef, blockers: p.blockers,
      legacyUseWheelRate: p.legacyUseWheelRate,
    });
  }

  /**
   * buildModelParamsFromCanonical(canonicalInputSnapshot)
   *   → { resolved, params|null, blockedReasons[], usedParameters[], missingParameters[], provenance }
   * resolved:false (params:null) if any REQUIRED canonical input is not authoritatively modelUsable.
   */
  function buildModelParamsFromCanonical(snapshot) {
    var blockedReasons = [], usedParameters = [], missingParameters = [];
    var provenanceByParam = {};
    var params = {};
    if (snapshot == null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return { resolved: false, params: null, blockedReasons: [_blocker('CANONICAL_SNAPSHOT_MALFORMED', null, 'snapshot not an object')], usedParameters: [], missingParameters: [], provenance: {} };
    }
    Object.keys(MODEL_INPUT_MAP).forEach(function (canonKey) {
      var spec = MODEL_INPUT_MAP[canonKey];
      var auth = _authoritative(snapshot[canonKey]);
      if (!auth || !auth.modelUsable) {
        if (spec.required) {
          missingParameters.push(canonKey);
          blockedReasons.push(_blocker('CANONICAL_INPUT_NOT_MODEL_USABLE', canonKey, auth ? auth.blockers : ['absent']));
        }
        return; // optional + not usable → leave to the model default
      }
      params[spec.paramKey] = auth.value;
      usedParameters.push(canonKey);
      provenanceByParam[spec.paramKey] = { canonicalKey: canonKey, provenance: auth.provenance, conversionStatus: auth.conversionStatus, conversionRef: auth.conversionRef, unit: spec.unit };
    });

    if (blockedReasons.length) {
      return { resolved: false, params: null, blockedReasons: blockedReasons, usedParameters: usedParameters, missingParameters: missingParameters, provenance: provenanceByParam };
    }
    // canonical wheel rates are already MR-folded → tell the core to use them directly (compatibility flag).
    params.use_wheel_rate = true;
    return { resolved: true, params: params, blockedReasons: [], usedParameters: usedParameters, missingParameters: [], provenance: provenanceByParam };
  }

  var api = {
    MODEL_INPUT_MAP: MODEL_INPUT_MAP,
    buildModelParamsFromCanonical: buildModelParamsFromCanonical,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CanonicalModelInput = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
