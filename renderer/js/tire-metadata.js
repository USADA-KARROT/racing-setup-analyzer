/**
 * tire-metadata.js — Tyre-model credibility descriptor (Phase 2B)
 *
 * Produces a structured, per-output description of the ACTIVE tyre model so the UI and
 * tests can tell — honestly and at capability/output granularity — where each tyre number
 * comes from and how much to trust it. This is a pure descriptor: it does NOT compute
 * forces, does NOT change Cα / μ, and does NOT touch tir-parser.js maths.
 *
 * The trap this guards against: an imported .tir is NOT a whole real-tyre model. It
 * replaces only the lateral cornering stiffness (Cα) and the lap-sim peak μ. Temperature,
 * pressure, width grip and the grip-balance shift (tireUsShift) stay on the generic
 * heuristics even after import. So we describe THREE layers (see Phase 1 spirit):
 *
 *   1. Source     — where the model came from (generic vs imported .tir). Not a trust level.
 *   2. Coverage   — which physical capabilities the model actually covers.
 *   3. Contributions — per OUTPUT, which subsystem computes it and its ◆◈◇ trust tier.
 *
 * `tier` values are 'physics' | 'model' | 'heuristic' so the UI can feed them straight
 * into the Phase-1 tierBadge() helper. `fallbackUsed` is true only when an imported tyre
 * is active but a given output still uses the generic heuristic instead of the import.
 *
 * noteKey / messageKey are i18n identifiers only — the trilingual strings are added in
 * Phase 2C when the status UI renders them.
 */

// Canonical i18n key identifiers (strings resolved by the UI in Phase 2C).
const TIRE_META_KEYS = {
  corneringStiffnessFromTir:    'tire.meta.corneringStiffnessFromTir',
  corneringStiffnessGeneric:    'tire.meta.corneringStiffnessGeneric',
  peakMuFromTir:                'tire.meta.peakMuFromTir',
  peakMuGeneric:                'tire.meta.peakMuGeneric',
  pressureHeuristic:            'tire.meta.pressureHeuristic',
  pressureHeuristicFallback:    'tire.meta.pressureHeuristicFallback',
  temperatureHeuristic:         'tire.meta.temperatureHeuristic',
  temperatureHeuristicFallback: 'tire.meta.temperatureHeuristicFallback',
  widthHeuristic:               'tire.meta.widthHeuristic',
  widthHeuristicFallback:       'tire.meta.widthHeuristicFallback',
  tireUsShiftHeuristic:         'tire.meta.tireUsShiftHeuristic',
  tireUsShiftHeuristicFallback: 'tire.meta.tireUsShiftHeuristicFallback',
};

/** Has this parsed .tir got a (non-default) coefficient `k`? */
function tirHas(t, k) {
  return !!(t && t.raw && Object.prototype.hasOwnProperty.call(t.raw, k));
}

/** Detect which capabilities an imported .tir actually covers. */
function tirCoverage(t) {
  const lateral = tirHas(t, 'PCY1'); // required at import; pure-slip lateral set
  return {
    lateralPureSlip: lateral,
    peakMu: lateral, // peak μ is derived from the lateral fit
    verticalStiffness: (t && t.verticalStiffness_Npm > 0) || tirHas(t, 'VERTICAL_STIFFNESS'),
    loadSensitivity: tirHas(t, 'PDY2') || tirHas(t, 'PKY2'),
    camberSensitivity: tirHas(t, 'PKY3') || tirHas(t, 'PDY3') || tirHas(t, 'PVY3') || tirHas(t, 'PEY4'),
    // The .tir CAN carry a pressure model (PPY*), but the app's pressure GRIP correction
    // never uses it (always heuristic). coverage describes the FILE; contributions the OUTPUT.
    pressureModel: !!(t && t.nomPres_pa > 0) && (tirHas(t, 'PPY1') || tirHas(t, 'PPY2') || tirHas(t, 'PPY3') || tirHas(t, 'PPY4')),
    longitudinalForce: false, // parser models lateral only (no Fx)
    aligningMoment: false,    // no Mz
    combinedSlip: false,      // pure slip only
    temperatureModel: false,  // .tir has no thermal model; app temp grip is heuristic
    widthModel: false,        // app width grip is heuristic
  };
}

/** Metadata for the generic (no .tir) tyre model. */
function genericTireMetadata(compoundId) {
  return {
    sourceType: 'generic',
    overallStatus: 'generic',
    sourceFileName: null,
    parser: null,
    compoundId: compoundId || null,
    coverage: {
      lateralPureSlip: true,    // generic Pacejka '89 model
      peakMu: true,             // from the compound table
      verticalStiffness: false, // no per-tyre vertical-stiffness model in generic mode
      loadSensitivity: true,    // a4 load-sensitivity knee
      camberSensitivity: true,  // a5 camber term
      pressureModel: false,     // heuristic factor only, not a model
      longitudinalForce: false,
      aligningMoment: false,
      combinedSlip: false,
      temperatureModel: false,  // heuristic factor only
      widthModel: false,        // heuristic factor only
    },
    // In generic mode nothing is a "fallback" — everything is simply generic.
    fallbackUsed: {
      corneringStiffness: false, peakMu: false,
      pressureGripCorrection: false, temperatureGripCorrection: false,
      widthGripCorrection: false, tireUsShift: false,
    },
    contributions: {
      corneringStiffness:        { tier: 'model',     source: 'generic_pacejka', fallback: false, noteKey: TIRE_META_KEYS.corneringStiffnessGeneric },
      peakMu:                    { tier: 'heuristic', source: 'generic_compound', fallback: false, noteKey: TIRE_META_KEYS.peakMuGeneric },
      pressureGripCorrection:    { tier: 'heuristic', source: 'calibration', fallback: false, noteKey: TIRE_META_KEYS.pressureHeuristic },
      temperatureGripCorrection: { tier: 'heuristic', source: 'calibration', fallback: false, noteKey: TIRE_META_KEYS.temperatureHeuristic },
      widthGripCorrection:       { tier: 'heuristic', source: 'calibration', fallback: false, noteKey: TIRE_META_KEYS.widthHeuristic },
      tireUsShift:               { tier: 'heuristic', source: 'calibration', fallback: false, noteKey: TIRE_META_KEYS.tireUsShiftHeuristic },
    },
    diagnostics: [
      { severity: 'info', code: 'TIRE_GENERIC_MODEL', tier: 'heuristic',
        messageKey: 'tire.info.genericModel',
        affectedOutputs: ['peakMu', 'pressureGripCorrection', 'temperatureGripCorrection', 'widthGripCorrection'] },
    ],
  };
}

/** Metadata for an imported .tir tyre model. */
function importedTirMetadata(t) {
  const coverage = tirCoverage(t);
  // "valid" = the lateral handling set is complete enough to drive Cα meaningfully.
  const core = coverage.lateralPureSlip && coverage.loadSensitivity && coverage.camberSensitivity && coverage.verticalStiffness;
  const overallStatus = core ? 'imported_valid' : 'imported_partial';

  const diagnostics = [];
  // The headline honesty message: import upgrades Cα/μ only.
  diagnostics.push({ severity: 'info', code: 'TIR_GRIP_STILL_HEURISTIC', tier: 'heuristic',
    messageKey: 'tire.info.gripStillHeuristic',
    affectedOutputs: ['pressureGripCorrection', 'temperatureGripCorrection', 'widthGripCorrection', 'tireUsShift'] });
  if (overallStatus === 'imported_partial') {
    diagnostics.push({ severity: 'warning', code: 'TIR_PARTIAL_COVERAGE', tier: 'heuristic',
      messageKey: 'tire.warning.tirPartialCoverage', affectedOutputs: ['corneringStiffness'] });
  }
  if (!coverage.camberSensitivity) {
    diagnostics.push({ severity: 'warning', code: 'TIR_NO_CAMBER_MODEL', tier: 'heuristic',
      messageKey: 'tire.warning.noCamberModel', affectedOutputs: ['corneringStiffness'] });
  }
  if (!coverage.verticalStiffness) {
    diagnostics.push({ severity: 'warning', code: 'TIR_NO_VERTICAL_STIFFNESS', tier: 'heuristic',
      messageKey: 'tire.warning.noVerticalStiffness', affectedOutputs: ['tireSpringRate'] });
  }
  if (!coverage.pressureModel) {
    diagnostics.push({ severity: 'info', code: 'TIR_NO_PRESSURE_MODEL', tier: 'heuristic',
      messageKey: 'tire.warning.noPressureModel', affectedOutputs: ['pressureGripCorrection'] });
  } else {
    // File HAS pressure coeffs but the app still uses the heuristic grip correction.
    diagnostics.push({ severity: 'info', code: 'TIR_PRESSURE_MODEL_UNUSED', tier: 'heuristic',
      messageKey: 'tire.info.pressureModelUnused', affectedOutputs: ['pressureGripCorrection'] });
  }

  return {
    sourceType: 'imported_tir',
    overallStatus,
    sourceFileName: (t && t.name) || null,
    parser: 'parseTIR',
    mfVersion: (t && t.mfVersion) || null,
    coverage,
    // Imported tyre active, but these outputs still fall back to the generic heuristic.
    fallbackUsed: {
      corneringStiffness: false, peakMu: false,
      pressureGripCorrection: true, temperatureGripCorrection: true,
      widthGripCorrection: true, tireUsShift: true,
    },
    contributions: {
      corneringStiffness:        { tier: 'model',     source: 'imported_tir', fallback: false, noteKey: TIRE_META_KEYS.corneringStiffnessFromTir },
      peakMu:                    { tier: 'model',     source: 'imported_tir', fallback: false, noteKey: TIRE_META_KEYS.peakMuFromTir },
      pressureGripCorrection:    { tier: 'heuristic', source: 'calibration', fallback: true, noteKey: TIRE_META_KEYS.pressureHeuristicFallback },
      temperatureGripCorrection: { tier: 'heuristic', source: 'calibration', fallback: true, noteKey: TIRE_META_KEYS.temperatureHeuristicFallback },
      widthGripCorrection:       { tier: 'heuristic', source: 'calibration', fallback: true, noteKey: TIRE_META_KEYS.widthHeuristicFallback },
      tireUsShift:               { tier: 'heuristic', source: 'calibration', fallback: true, noteKey: TIRE_META_KEYS.tireUsShiftHeuristicFallback },
    },
    diagnostics,
  };
}

/**
 * Build the active tyre-model metadata descriptor.
 * @param {object} opts
 * @param {object|null} opts.tirParsed  parsed .tir (from parseTIR) when an import is active
 * @param {boolean}     opts.useTir     whether the imported tyre is enabled in the model
 * @param {string|null} opts.compoundId the generic compound id (for the generic branch)
 * @returns {object} descriptor (sourceType / overallStatus / coverage / fallbackUsed / contributions / diagnostics)
 */
function buildTireModelMetadata(opts = {}) {
  const { tirParsed = null, useTir = false, compoundId = null } = opts;
  if (useTir && tirParsed && tirParsed.raw && tirParsed.raw.PCY1 !== undefined) {
    return importedTirMetadata(tirParsed);
  }
  return genericTireMetadata(compoundId);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildTireModelMetadata, genericTireMetadata, importedTirMetadata, tirCoverage, TIRE_META_KEYS };
}
