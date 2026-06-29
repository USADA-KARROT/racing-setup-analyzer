/**
 * contracts/r3.0e/experiment-contract.js — R3.0E E1 · Experiment shape contract (NON-PRODUCTION).
 *
 * Defines the structural shape of an Experiment object. Mirrors the D1 pattern: closed key
 * set + closed-enum status + mandatory field presence + bounded strings/arrays + no causal
 * overclaim at the structural layer (E3 outcome classifier enforces semantic invariants).
 *
 * Experiment is a R3.0E-owned object stored in a SEPARATE versioned IndexedDB namespace
 * at E2_EXPERIMENT_STORE. It is NEVER an extension of the frozen R3.0B case-record schema
 * (per SKYLINE D12/E1 ruling). The follow-up linkage between Experiment and Case is
 * BIDIRECTIONAL but lives in a separate linkage object.
 *
 * UMD: Node require / Electron renderer global (R3_0E_ExperimentContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0E_ReasonCodes !== 'undefined' ? R3_0E_ReasonCodes : undefined);
  if (!RC) throw new Error('experiment-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // Closed key set for an Experiment object.
  var EXPERIMENT_KEYS = Object.freeze([
    'schemaVersion',
    'experimentId',                  // 'exp_<16hex>'
    'sourceCaseId',                  // R3.0B case-record caseId (string ref only — no schema extension)
    'sourceHypothesisId',            // R3.0D hypothesisId
    'sourceRecommendationId',        // R3.0D priorityId or recommendation reference
    'targetMetric',                  // canonical channel id (e.g., 'roll_gradient_deg_per_g')
    'baselineValue',                 // numeric baseline (from D5 brief / case observation)
    'expectedDirection',             // 'increase' | 'decrease' | 'no_change'
    'expectedMagnitudeRange',        // { min: number, max: number } both finite, min <= max
    'setupChange',                   // structured object describing the setup mutation
    'driverInstruction',             // optional driver-facing instruction (i18n key)
    'controlVariables',              // array of control variable descriptors
    'validationPlan',                // string i18n key referencing the validation procedure
    'stopConditions',                // array of { i18nKey, params } guard conditions
    'status',                        // EXPERIMENT_STATUS_ALLOWED enum
    'followUpCaseIds',               // array of follow-up case ids (R3.0B references)
    'outcome',                       // nullable — set at E3
    'createdAt',                     // ISO 8601 string
  ]);

  // Status enum — closed.
  var EXPERIMENT_STATUS_ALLOWED = Object.freeze([
    'draft',
    'planned',
    'applied',
    'completed',
    'abandoned',
    'invalid',
  ]);

  // Expected direction enum.
  var EXPECTED_DIRECTION_ALLOWED = Object.freeze(['increase', 'decrease', 'no_change']);

  var SUPPORTED_SCHEMA_VERSION = 1;
  var ARRAY_CAP = 32;
  var STRING_BYTE_CAP = 512;
  var ENVELOPE_BYTE_CAP = 128 * 1024;

  var EXPERIMENT_ID_RE = /^exp_[0-9a-f]{16,32}$/;
  var ID_GRAMMAR_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _finite(n) { return typeof n === 'number' && isFinite(n) && !isNaN(n); }

  /**
   * validateExperimentShape(e) — E1 STRUCTURAL gate.
   */
  function validateExperimentShape(eIn) {
    try {
      if (!RC.isOriginalPlainObject(eIn)) return RC.buildBlockedResult([CODES.EXPERIMENT_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'experiment prototype is not Object.prototype or null' });
      if (RC.hasHiddenOwnKey(eIn)) return RC.buildBlockedResult([CODES.EXPERIMENT_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'experiment carries Symbol-keyed or non-enumerable own property' });
      if (RC.hasNonPlainNestedObject(eIn)) return RC.buildBlockedResult([CODES.EXPERIMENT_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'experiment contains nested non-plain object' });
      var e = RC.toCleanCopy(eIn);
      if (!_isPlain(e)) return RC.buildBlockedResult([CODES.EXPERIMENT_INVALID], { detail: 'experiment not plain object' });
      if (!_hasOnlyAllowedKeys(e, EXPERIMENT_KEYS)) return RC.buildBlockedResult([CODES.EXPERIMENT_INVALID, CODES.UNKNOWN_OWN_KEY]);

      var reasons = [];

      if (!Number.isInteger(e.schemaVersion)) reasons.push(CODES.EXPERIMENT_INVALID);
      else if (e.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
      else if (e.schemaVersion < 1) reasons.push(CODES.EXPERIMENT_INVALID);

      if (!_nonEmptyStr(e.experimentId) || !EXPERIMENT_ID_RE.test(e.experimentId)) reasons.push(CODES.EXPERIMENT_INVALID);

      // sourceCaseId — string ref only (no schema extension into R3.0B). Validate grammar only.
      if (!_nonEmptyStr(e.sourceCaseId) || ID_FORBIDDEN_RE.test(e.sourceCaseId) || !ID_GRAMMAR_RE.test(e.sourceCaseId)) reasons.push(CODES.EXPERIMENT_INVALID);

      if (!_nonEmptyStr(e.sourceHypothesisId) || ID_FORBIDDEN_RE.test(e.sourceHypothesisId) || !ID_GRAMMAR_RE.test(e.sourceHypothesisId)) reasons.push(CODES.EXPERIMENT_INVALID);
      if (!_nonEmptyStr(e.sourceRecommendationId) || ID_FORBIDDEN_RE.test(e.sourceRecommendationId) || !ID_GRAMMAR_RE.test(e.sourceRecommendationId)) reasons.push(CODES.EXPERIMENT_INVALID);

      if (!_nonEmptyStr(e.targetMetric) || _utf8Bytes(e.targetMetric) > STRING_BYTE_CAP) reasons.push(CODES.EXPERIMENT_TARGET_METRIC_INVALID);

      if (!_finite(e.baselineValue)) reasons.push(CODES.EXPERIMENT_BASELINE_MISSING);

      if (EXPECTED_DIRECTION_ALLOWED.indexOf(e.expectedDirection) === -1) reasons.push(CODES.EXPERIMENT_EXPECTED_DIRECTION_INVALID);

      if (!_isPlain(e.expectedMagnitudeRange) || !_finite(e.expectedMagnitudeRange.min) || !_finite(e.expectedMagnitudeRange.max) || e.expectedMagnitudeRange.min > e.expectedMagnitudeRange.max) {
        reasons.push(CODES.EXPERIMENT_EXPECTED_MAGNITUDE_RANGE_INVALID);
      }

      if (!_isPlain(e.setupChange)) reasons.push(CODES.EXPERIMENT_SETUP_CHANGE_INVALID);

      // driverInstruction is OPTIONAL — null permitted; non-empty string when present.
      if (e.driverInstruction !== null && !_nonEmptyStr(e.driverInstruction)) reasons.push(CODES.EXPERIMENT_DRIVER_INSTRUCTION_INVALID);

      if (!Array.isArray(e.controlVariables) || e.controlVariables.length > ARRAY_CAP) reasons.push(CODES.CONTROL_VARIABLES_INVALID);

      if (!_nonEmptyStr(e.validationPlan) || _utf8Bytes(e.validationPlan) > STRING_BYTE_CAP) reasons.push(CODES.EXPERIMENT_VALIDATION_PLAN_MISSING);

      if (!Array.isArray(e.stopConditions) || e.stopConditions.length === 0) reasons.push(CODES.EXPERIMENT_STOP_CONDITIONS_MISSING);

      if (EXPERIMENT_STATUS_ALLOWED.indexOf(e.status) === -1) reasons.push(CODES.EXPERIMENT_STATUS_INVALID);

      if (!Array.isArray(e.followUpCaseIds) || e.followUpCaseIds.length > ARRAY_CAP) reasons.push(CODES.LINKAGE_INVALID);

      // outcome is OPTIONAL at E1 (set at E3) — null permitted; plain object when present.
      if (e.outcome !== null && !_isPlain(e.outcome)) reasons.push(CODES.OUTCOME_INVALID);

      if (!_nonEmptyStr(e.createdAt)) reasons.push(CODES.EXPERIMENT_INVALID);

      // Envelope byte cap.
      try {
        var serialized = JSON.stringify(e);
        var bytes = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(serialized).length : Buffer.byteLength(serialized, 'utf8');
        if (bytes > ENVELOPE_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      } catch (eAny) { reasons.push(CODES.EXPERIMENT_INVALID); }

      if (reasons.length) {
        var seen = Object.create(null), out = [];
        reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
        return RC.buildBlockedResult(out);
      }
      return Object.freeze({ valid: true });
    } catch (eOuter) {
      return RC.buildBlockedResult([CODES.EXPERIMENT_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'experiment validator threw on hostile input' });
    }
  }

  var api = {
    EXPERIMENT_KEYS: EXPERIMENT_KEYS,
    EXPERIMENT_STATUS_ALLOWED: EXPERIMENT_STATUS_ALLOWED,
    EXPECTED_DIRECTION_ALLOWED: EXPECTED_DIRECTION_ALLOWED,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    ARRAY_CAP: ARRAY_CAP,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    validateExperimentShape: validateExperimentShape,
  };
  Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { Object.defineProperty(root, 'R3_0E_ExperimentContract', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_ExperimentContract = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
