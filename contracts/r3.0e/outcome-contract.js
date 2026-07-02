/**
 * contracts/r3.0e/outcome-contract.js — R3.0E E1 · Outcome shape contract (NON-PRODUCTION).
 *
 * Defines the structural shape of an Outcome — the classification produced at E3 by the
 * Outcome Classifier and attached to an Experiment. Classes form a closed enum:
 *   confirmed / partially_confirmed / contradicted / inconclusive / invalid_comparison /
 *   inconclusive_due_to_confounders.
 *
 * E1 contract layer validates SHAPE only. Semantic invariants (direction match, magnitude
 * within range, confounder detection) are enforced by the E3 algorithm.
 *
 * UMD: Node require / Electron renderer global (R3_0E_OutcomeContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0E_ReasonCodes !== 'undefined' ? R3_0E_ReasonCodes : undefined);
  if (!RC) throw new Error('outcome-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  var OUTCOME_KEYS = Object.freeze([
    'schemaVersion',
    'outcomeId',
    'experimentId',
    'class',                          // OUTCOME_CLASS_ALLOWED
    'observedDirection',              // EXPECTED_DIRECTION_ALLOWED OR null
    'observedMagnitude',              // number OR null
    'comparabilityScore',             // 0..1
    'confounders',                    // array of control-variable ids that drifted
    'driverFeedback',                 // optional i18n key OR null
    'dataQualityIssues',              // array of i18n keys (or reason codes)
    'sideEffects',                    // array of structured side-effect descriptors
    'limitations',                    // array of LIMITATION_* reason codes
    'createdAt',
  ]);

  var OUTCOME_CLASS_ALLOWED = Object.freeze([
    'confirmed',
    'partially_confirmed',
    'contradicted',
    'inconclusive',
    'invalid_comparison',
    'inconclusive_due_to_confounders',
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;
  var ARRAY_CAP = 32;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  function validateOutcomeShape(oIn) {
    try {
      if (!RC.isOriginalPlainObject(oIn)) return RC.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED]);
      if (RC.hasHiddenOwnKey(oIn)) return RC.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.UNKNOWN_OWN_KEY]);
      if (RC.hasNonPlainNestedObject(oIn)) return RC.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED]);
      var o = RC.toCleanCopy(oIn);
      if (!_isPlain(o)) return RC.buildBlockedResult([CODES.OUTCOME_INVALID]);
      if (!_hasOnlyAllowedKeys(o, OUTCOME_KEYS)) return RC.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.UNKNOWN_OWN_KEY]);

      var reasons = [];
      if (!Number.isInteger(o.schemaVersion)) reasons.push(CODES.OUTCOME_INVALID);
      else if (o.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
      else if (o.schemaVersion < 1) reasons.push(CODES.OUTCOME_INVALID);

      if (!_nonEmptyStr(o.outcomeId)) reasons.push(CODES.OUTCOME_INVALID);
      if (!_nonEmptyStr(o.experimentId)) reasons.push(CODES.OUTCOME_INVALID);
      if (OUTCOME_CLASS_ALLOWED.indexOf(o['class']) === -1) reasons.push(CODES.OUTCOME_CLASS_INVALID);
      if (o.observedDirection !== null && ['increase', 'decrease', 'no_change'].indexOf(o.observedDirection) === -1) reasons.push(CODES.OUTCOME_INVALID);
      if (o.observedMagnitude !== null && typeof o.observedMagnitude !== 'number') reasons.push(CODES.OUTCOME_INVALID);
      if (typeof o.comparabilityScore !== 'number' || o.comparabilityScore < 0 || o.comparabilityScore > 1) reasons.push(CODES.OUTCOME_COMPARABILITY_INSUFFICIENT);
      if (!Array.isArray(o.confounders) || o.confounders.length > ARRAY_CAP) reasons.push(CODES.OUTCOME_INVALID);
      if (o.driverFeedback !== null && !_nonEmptyStr(o.driverFeedback)) reasons.push(CODES.OUTCOME_DRIVER_FEEDBACK_INVALID);
      if (!Array.isArray(o.dataQualityIssues) || o.dataQualityIssues.length > ARRAY_CAP) reasons.push(CODES.OUTCOME_DATA_QUALITY_INVALID);
      if (!Array.isArray(o.sideEffects) || o.sideEffects.length > ARRAY_CAP) reasons.push(CODES.OUTCOME_INVALID);
      if (!Array.isArray(o.limitations) || o.limitations.length > ARRAY_CAP) reasons.push(CODES.OUTCOME_INVALID);
      if (!_nonEmptyStr(o.createdAt)) reasons.push(CODES.OUTCOME_INVALID);

      // confounders-present → class must be inconclusive_due_to_confounders OR limitations carries CONTROL_VARIABLE_MISSING.
      if (Array.isArray(o.confounders) && o.confounders.length > 0
          && o['class'] !== 'inconclusive_due_to_confounders'
          && o['class'] !== 'invalid_comparison'
          && !(Array.isArray(o.limitations) && o.limitations.indexOf('CONTROL_VARIABLE_MISSING') !== -1)) {
        reasons.push(CODES.OUTCOME_CONFOUNDERS_PRESENT);
      }

      if (reasons.length) {
        var seen = Object.create(null), out = [];
        reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
        return RC.buildBlockedResult(out);
      }
      return Object.freeze({ valid: true });
    } catch (eOuter) {
      return RC.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  var api = {
    OUTCOME_KEYS: OUTCOME_KEYS,
    OUTCOME_CLASS_ALLOWED: OUTCOME_CLASS_ALLOWED,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    validateOutcomeShape: validateOutcomeShape,
  };
  Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { Object.defineProperty(root, 'R3_0E_OutcomeContract', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_OutcomeContract = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
