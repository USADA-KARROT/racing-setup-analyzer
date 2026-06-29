/**
 * contracts/r3.0e/case-timeline-contract.js — R3.0E E1 (NON-PRODUCTION).
 *
 * Case Timeline shape: a chronologically-ordered, structurally-validated sequence of
 * timeline events for a case lineage (baseline → recommendation → applied setup → follow-up
 * → outcome). Bidirectional parent ↔ follow-up linkage lives in the linkage contract; the
 * timeline contract is the read-only display shape.
 */
(function (root) {
  'use strict';
  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0E_ReasonCodes !== 'undefined' ? R3_0E_ReasonCodes : undefined);
  if (!RC) throw new Error('case-timeline-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  var TIMELINE_KEYS = Object.freeze([
    'schemaVersion',
    'caseId',
    'events',                          // array of timeline-event objects
  ]);

  var EVENT_KEYS = Object.freeze(['eventId', 'kind', 'createdAt', 'i18nKey', 'params']);

  var EVENT_KIND_ALLOWED = Object.freeze([
    'baseline_captured',
    'hypothesis_recorded',
    'recommendation_made',
    'experiment_planned',
    'experiment_applied',
    'follow_up_case_created',
    'outcome_classified',
    'experiment_abandoned',
  ]);

  var ARRAY_CAP = 64;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  function validateCaseTimelineShape(tIn) {
    try {
      if (!RC.isOriginalPlainObject(tIn)) return RC.buildBlockedResult([CODES.TIMELINE_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED]);
      if (RC.hasHiddenOwnKey(tIn)) return RC.buildBlockedResult([CODES.TIMELINE_INVALID, CODES.UNKNOWN_OWN_KEY]);
      var t = RC.toCleanCopy(tIn);
      if (!_isPlain(t)) return RC.buildBlockedResult([CODES.TIMELINE_INVALID]);
      if (!_hasOnlyAllowedKeys(t, TIMELINE_KEYS)) return RC.buildBlockedResult([CODES.TIMELINE_INVALID, CODES.UNKNOWN_OWN_KEY]);

      var reasons = [];
      if (!Number.isInteger(t.schemaVersion) || t.schemaVersion !== 1) reasons.push(CODES.TIMELINE_INVALID);
      if (!_nonEmptyStr(t.caseId)) reasons.push(CODES.TIMELINE_INVALID);
      if (!Array.isArray(t.events) || t.events.length > ARRAY_CAP) reasons.push(CODES.TIMELINE_INVALID);
      else {
        var prevTime = -Infinity;
        for (var i = 0; i < t.events.length; i++) {
          var ev = t.events[i];
          if (!_isPlain(ev) || !_hasOnlyAllowedKeys(ev, EVENT_KEYS)) { reasons.push(CODES.TIMELINE_INVALID); break; }
          if (!_nonEmptyStr(ev.eventId)) reasons.push(CODES.TIMELINE_INVALID);
          if (EVENT_KIND_ALLOWED.indexOf(ev.kind) === -1) reasons.push(CODES.TIMELINE_INVALID);
          if (!_nonEmptyStr(ev.createdAt)) reasons.push(CODES.TIMELINE_INVALID);
          if (!_nonEmptyStr(ev.i18nKey)) reasons.push(CODES.TIMELINE_INVALID);
          if (ev.params !== null && !_isPlain(ev.params)) reasons.push(CODES.TIMELINE_INVALID);
          // Chronological order check: parse createdAt as ISO.
          var msNow = Date.parse(ev.createdAt);
          if (isNaN(msNow)) reasons.push(CODES.TIMELINE_INVALID);
          else if (msNow < prevTime) reasons.push(CODES.TIMELINE_ORDERING_INVALID);
          else prevTime = msNow;
        }
      }

      if (reasons.length) {
        var seen = Object.create(null), out = [];
        reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
        return RC.buildBlockedResult(out);
      }
      return Object.freeze({ valid: true });
    } catch (e) { return RC.buildBlockedResult([CODES.TIMELINE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]); }
  }

  var api = { TIMELINE_KEYS: TIMELINE_KEYS, EVENT_KIND_ALLOWED: EVENT_KIND_ALLOWED, validateCaseTimelineShape: validateCaseTimelineShape };
  Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { Object.defineProperty(root, 'R3_0E_CaseTimelineContract', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_CaseTimelineContract = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
