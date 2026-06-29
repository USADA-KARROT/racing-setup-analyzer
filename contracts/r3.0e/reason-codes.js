/**
 * contracts/r3.0e/reason-codes.js — R3.0E E1 · Reason codes (NON-PRODUCTION).
 *
 * Closed enum + structural helpers shared by every R3.0E contract module. Mirrors the
 * D1 reason-codes.js layering (RC.REASON_CODES, RC.ALL_REASON_CODES, RC.isReasonCode,
 * RC.buildBlockedResult, RC.isOriginalPlainObject, RC.hasHiddenOwnKey, RC.toCleanCopy)
 * so R3.0E contracts inherit the same hardened verification surface without re-implementing
 * it. R3.0D codes are NOT re-exported here — each phase owns its own reason-code namespace.
 *
 * UMD: Node require / Electron renderer global (R3_0E_ReasonCodes).
 */
(function (root) {
  'use strict';

  // E1 reason codes — Experiment / Outcome / Case Timeline / Control Variables / follow-up
  // linkage. NOT a superset of D1; R3.0E owns its own namespace. Codes prefixed by the
  // contract they bind: EXPERIMENT_ / OUTCOME_ / CONTROL_ / TIMELINE_ / LINKAGE_.
  var REASON_CODES = Object.freeze({
    // ---- Structural ----
    EXPERIMENT_INVALID: 'EXPERIMENT_INVALID',
    OUTCOME_INVALID: 'OUTCOME_INVALID',
    CONTROL_VARIABLES_INVALID: 'CONTROL_VARIABLES_INVALID',
    TIMELINE_INVALID: 'TIMELINE_INVALID',
    LINKAGE_INVALID: 'LINKAGE_INVALID',
    UNKNOWN_OWN_KEY: 'UNKNOWN_OWN_KEY',
    BYTE_CAP_EXCEEDED: 'BYTE_CAP_EXCEEDED',
    ARRAY_CAP_EXCEEDED: 'ARRAY_CAP_EXCEEDED',
    PROTOTYPE_POLLUTION_REJECTED: 'PROTOTYPE_POLLUTION_REJECTED',
    UNSUPPORTED_FUTURE_SCHEMA: 'UNSUPPORTED_FUTURE_SCHEMA',
    INTERNAL_CONTRACT_VIOLATION: 'INTERNAL_CONTRACT_VIOLATION',

    // ---- Experiment lifecycle ----
    EXPERIMENT_STATUS_INVALID: 'EXPERIMENT_STATUS_INVALID',
    EXPERIMENT_BASELINE_MISSING: 'EXPERIMENT_BASELINE_MISSING',
    EXPERIMENT_EXPECTED_DIRECTION_INVALID: 'EXPERIMENT_EXPECTED_DIRECTION_INVALID',
    EXPERIMENT_EXPECTED_MAGNITUDE_RANGE_INVALID: 'EXPERIMENT_EXPECTED_MAGNITUDE_RANGE_INVALID',
    EXPERIMENT_TARGET_METRIC_INVALID: 'EXPERIMENT_TARGET_METRIC_INVALID',
    EXPERIMENT_SETUP_CHANGE_INVALID: 'EXPERIMENT_SETUP_CHANGE_INVALID',
    EXPERIMENT_DRIVER_INSTRUCTION_INVALID: 'EXPERIMENT_DRIVER_INSTRUCTION_INVALID',
    EXPERIMENT_VALIDATION_PLAN_MISSING: 'EXPERIMENT_VALIDATION_PLAN_MISSING',
    EXPERIMENT_STOP_CONDITIONS_MISSING: 'EXPERIMENT_STOP_CONDITIONS_MISSING',

    // ---- Outcome classification ----
    OUTCOME_CLASS_INVALID: 'OUTCOME_CLASS_INVALID',
    OUTCOME_COMPARABILITY_INSUFFICIENT: 'OUTCOME_COMPARABILITY_INSUFFICIENT',
    OUTCOME_CONFOUNDERS_PRESENT: 'OUTCOME_CONFOUNDERS_PRESENT',
    OUTCOME_DRIVER_FEEDBACK_INVALID: 'OUTCOME_DRIVER_FEEDBACK_INVALID',
    OUTCOME_DATA_QUALITY_INVALID: 'OUTCOME_DATA_QUALITY_INVALID',

    // ---- Control variables ----
    CONTROL_VARIABLE_MISSING: 'CONTROL_VARIABLE_MISSING',
    CONTROL_VARIABLE_OUT_OF_RANGE: 'CONTROL_VARIABLE_OUT_OF_RANGE',

    // ---- Case timeline + follow-up linkage ----
    TIMELINE_ORDERING_INVALID: 'TIMELINE_ORDERING_INVALID',
    LINKAGE_PARENT_MISSING: 'LINKAGE_PARENT_MISSING',
    LINKAGE_ORPHAN_FOLLOW_UP: 'LINKAGE_ORPHAN_FOLLOW_UP',

    // ---- Limitations (bounded honesty) ----
    LIMITATION_NO_CONTROL_VARIABLES: 'LIMITATION_NO_CONTROL_VARIABLES',
    LIMITATION_CROSS_SESSION_FOLLOW_UP: 'LIMITATION_CROSS_SESSION_FOLLOW_UP',
    LIMITATION_PARENT_CASE_ARCHIVED: 'LIMITATION_PARENT_CASE_ARCHIVED',
  });

  var ALL_REASON_CODES = Object.freeze(Object.keys(REASON_CODES));
  var _CODE_SET = (function () { var s = Object.create(null); for (var i = 0; i < ALL_REASON_CODES.length; i++) s[ALL_REASON_CODES[i]] = true; return s; })();
  function isReasonCode(c) { return typeof c === 'string' && _CODE_SET[c] === true; }

  function buildBlockedResult(reasonCodes, opts) {
    opts = opts || {};
    var codes = [];
    var seen = Object.create(null);
    if (Array.isArray(reasonCodes)) {
      for (var i = 0; i < reasonCodes.length; i++) {
        var rc = reasonCodes[i];
        if (typeof rc === 'string' && !seen[rc]) { seen[rc] = true; codes.push(rc); }
      }
    }
    if (codes.length === 0) codes.push(REASON_CODES.INTERNAL_CONTRACT_VIOLATION);
    return Object.freeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: Object.freeze(codes),
      explanationKeys: Object.freeze(codes.map(function (c) { return 'r3_0e.reason.' + c.toLowerCase(); })),
      detail: typeof opts.detail === 'string' ? opts.detail : '',
      result: null,
    });
  }

  // ---- Structural helpers shared by every R3.0E contract module ----
  function isOriginalPlainObject(v) {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
    try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
    catch (e) { return false; }
  }
  function hasHiddenOwnKey(o) {
    try {
      var syms = Object.getOwnPropertySymbols(o);
      if (syms && syms.length > 0) return true;
      var names = Object.getOwnPropertyNames(o);
      for (var i = 0; i < names.length; i++) {
        var d = Object.getOwnPropertyDescriptor(o, names[i]);
        if (!d || d.enumerable !== true) return true;
        if (typeof d.get === 'function' || typeof d.set === 'function') return true;
      }
      return false;
    } catch (e) { return true; }
  }
  function hasNonPlainNestedObject(o) {
    try {
      var stack = [o];
      var depth = 0;
      while (stack.length > 0 && depth < 256) {
        var v = stack.shift(); depth++;
        if (v === null) continue;
        var t = typeof v;
        if (t !== 'object') continue;
        var isArr = Array.isArray(v);
        if (!isArr) {
          var p = Object.getPrototypeOf(v);
          if (!(p === Object.prototype || p === null)) return true;
        }
        if (isArr) for (var i = 0; i < v.length; i++) stack.push(v[i]);
        else {
          var names = Object.getOwnPropertyNames(v);
          for (var j = 0; j < names.length; j++) stack.push(v[names[j]]);
        }
      }
      return false;
    } catch (e) { return true; }
  }
  function toCleanCopy(o) {
    try {
      if (typeof structuredClone === 'function') return structuredClone(o);
      return JSON.parse(JSON.stringify(o));
    } catch (e) { return null; }
  }

  var api = {
    REASON_CODES: REASON_CODES,
    ALL_REASON_CODES: ALL_REASON_CODES,
    isReasonCode: isReasonCode,
    buildBlockedResult: buildBlockedResult,
    isOriginalPlainObject: isOriginalPlainObject,
    hasHiddenOwnKey: hasHiddenOwnKey,
    hasNonPlainNestedObject: hasNonPlainNestedObject,
    toCleanCopy: toCleanCopy,
  };
  Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { Object.defineProperty(root, 'R3_0E_ReasonCodes', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_ReasonCodes = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
