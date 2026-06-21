/**
 * analysis-execution.js — R2.2 §7: Analysis execution layer (PURE orchestration, isolated side effects).
 *
 * runAnalysisCase(analysisCase, opts): validate the R2.1D case → resolve canonical model inputs →
 * execute the physics core → freeze a model-result snapshot → derive the MODEL-SIDE capability → return
 * a SEPARATE structured execution result. It NEVER mutates the case and NEVER writes results/eligibility
 * back onto it (that would trip R2.1D's tamper/forbidden-capability validation). Downstream capabilities
 * (telemetry observable / comparison / insight) are NOT decided here — they are aggregated later, once
 * observation + comparison exist (see analysis-workspace.js deriveWorkspaceCapability).
 *
 * RED LINES (must not break):
 *  • Imports analysis-case + canonical-model-input only. The physics core is a NON-UMD global; it is taken
 *    from opts.modelRunner (a params→result fn) or a global Tier1BasicBalance, else MODEL_ENGINE_UNAVAILABLE.
 *  • Deterministic. Input never mutated. Model result deep-frozen. A failed/partial model run NEVER poses
 *    as success (caught → MODEL_RUN_FAILED; a structurally-invalid model output → MODEL_RUN_FAILED).
 *  • Credibility honesty: the model result is labelled 'Model' (engineering model, directionally reliable),
 *    never 'Measured'.
 *
 * UMD: Node require / Electron renderer global (AnalysisExecution).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var AC = _req('./analysis-case.js', typeof AnalysisCase !== 'undefined' ? AnalysisCase : undefined);
  var CMI = _req('./canonical-model-input.js', typeof CanonicalModelInput !== 'undefined' ? CanonicalModelInput : undefined);
  if (!AC || !CMI) throw new Error('analysis-execution.js requires analysis-case + canonical-model-input');

  // model output structural contract: the Tier-1 keys that must be present + finite for a run to count.
  var REQUIRED_RESULT_NUMBERS = ['front_wheel_rate', 'rear_wheel_rate', 'total_roll_stiffness', 'roll_stiffness_dist_front', 'understeer_gradient'];
  var TENDENCY_MAP = { Understeer: 'understeer', Oversteer: 'oversteer', Neutral: 'neutral' };

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _blocker(code, scope, detail) { return { code: code, scope: scope || 'model', severity: 'error', detail: detail || null }; }
  function _deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.keys(o).forEach(function (k) { _deepFreeze(o[k]); });
      Object.freeze(o);
    }
    return o;
  }

  function _resolveRunner(opts) {
    opts = opts || {};
    if (typeof opts.modelRunner === 'function') return opts.modelRunner;
    // a renderer-global bare-class physics core
    var Engine = (typeof opts.modelEngine === 'function') ? opts.modelEngine
      : (typeof Tier1BasicBalance !== 'undefined' ? Tier1BasicBalance
        : (root && root.Tier1BasicBalance) ? root.Tier1BasicBalance : null);
    if (Engine) return function (params) { return new Engine(params).calculate(); };
    return null;
  }

  function _validModelResult(r) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
    for (var i = 0; i < REQUIRED_RESULT_NUMBERS.length; i++) { if (!_isFiniteNum(r[REQUIRED_RESULT_NUMBERS[i]])) return false; }
    if (typeof r.tendency !== 'string' || !TENDENCY_MAP.hasOwnProperty(r.tendency)) return false;
    return true;
  }

  function _fail(analysisCaseId, modelVersion, capability, blockedReasons, warnings) {
    return {
      valid: false, analysisCaseId: analysisCaseId || null, modelVersion: modelVersion || null,
      modelResultSnapshot: null, predictedTendency: 'unavailable',
      capabilityState: capability, blockedReasons: blockedReasons || [], provenanceSummary: null,
      warnings: warnings || [], credibility: 'Unavailable',
    };
  }

  /**
   * runAnalysisCase(analysisCase, opts) → execution result (model-side only; downstream gated elsewhere).
   * opts: { modelRunner?: (params)=>result, modelEngine?: class }
   */
  function runAnalysisCase(analysisCase, opts) {
    try { return _runInner(analysisCase, opts); }
    catch (e) {
      return _fail(null, null, { caseValid: false, modelInputResolved: false, modelRan: false }, [_blocker('EXECUTION_EXCEPTION', 'case', String(e && e.message || e))]);
    }
  }
  function _runInner(analysisCase, opts) {
    var warnings = [];
    var caseId = (analysisCase && typeof analysisCase === 'object' && !Array.isArray(analysisCase)) ? (analysisCase.caseId || null) : null;
    var modelVersion = (analysisCase && analysisCase.modelSnapshot && analysisCase.modelSnapshot.modelVersion) || null;

    // 1) validate the case (R2.1D) — never trust an unvalidated case
    var val = AC.validateAnalysisCase(analysisCase);
    if (!val.ok) {
      return _fail(caseId, modelVersion, { caseValid: false, modelInputResolved: false, modelRan: false },
        [_blocker('ANALYSIS_CASE_INVALID', 'case', val.errors)], warnings);
    }

    // 2) resolve canonical model inputs (only authoritatively modelUsable values)
    var snap = (analysisCase.modelSnapshot && analysisCase.modelSnapshot.canonicalInputSnapshot) || {};
    var resolved = CMI.buildModelParamsFromCanonical(snap);
    if (!resolved.resolved) {
      return _fail(caseId, modelVersion, { caseValid: true, modelInputResolved: false, modelRan: false },
        resolved.blockedReasons.map(function (b) { return _blocker(b.code, 'model', { parameterKey: b.parameterKey, detail: b.detail }); }), warnings);
    }

    // 3) execute the physics core (injected runner / global), fail-closed
    var runner = _resolveRunner(opts);
    if (!runner) {
      return _fail(caseId, modelVersion, { caseValid: true, modelInputResolved: true, modelRan: false },
        [_blocker('MODEL_ENGINE_UNAVAILABLE', 'model', 'no modelRunner injected and no global Tier1BasicBalance')], warnings);
    }
    var rawResult;
    try { rawResult = runner(resolved.params); }
    catch (e) {
      return _fail(caseId, modelVersion, { caseValid: true, modelInputResolved: true, modelRan: false },
        [_blocker('MODEL_RUN_FAILED', 'model', String(e && e.message || e))], warnings);
    }
    if (!_validModelResult(rawResult)) {
      return _fail(caseId, modelVersion, { caseValid: true, modelInputResolved: true, modelRan: false },
        [_blocker('MODEL_RUN_FAILED', 'model', 'model output missing required finite fields or tendency')], warnings);
    }

    // 4) freeze a snapshot (a deep clone so the frozen result never aliases the engine's internals)
    var snapshot = _deepFreeze(JSON.parse(JSON.stringify(rawResult)));
    var predictedTendency = TENDENCY_MAP[rawResult.tendency];
    // surface the ALREADY-resolved wheelbase (mm->m) for downstream measured-metric fits — pure read of an
    // authoritative resolved input; no physics change, model output untouched.
    var _wbMm = (resolved.params && typeof resolved.params.wheelbase === 'number' && isFinite(resolved.params.wheelbase) && resolved.params.wheelbase > 0) ? resolved.params.wheelbase : null;
    var measurementGeometry = { wheelbaseM: _wbMm != null ? _wbMm / 1000 : null, valid: _wbMm != null };

    return {
      valid: true,
      analysisCaseId: caseId,
      modelVersion: modelVersion,
      modelResultSnapshot: snapshot,
      predictedTendency: predictedTendency,                 // normalized: understeer|neutral|oversteer
      capabilityState: { caseValid: true, modelInputResolved: true, modelRan: true },
      blockedReasons: [],
      provenanceSummary: { modelInputs: resolved.provenance, usedParameters: resolved.usedParameters, modelVersion: modelVersion },
      measurementGeometry: measurementGeometry,             // { wheelbaseM, valid } — for downstream measured K_us only
      warnings: warnings,
      credibility: 'Model',                                 // engineering model — directionally reliable, NOT measured
    };
  }

  var api = { runAnalysisCase: runAnalysisCase, REQUIRED_RESULT_NUMBERS: REQUIRED_RESULT_NUMBERS, TENDENCY_MAP: TENDENCY_MAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AnalysisExecution = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
