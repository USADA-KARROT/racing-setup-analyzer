/**
 * contracts/r3.0e/follow-up-link-contract.js — R3.0E E1 (NON-PRODUCTION).
 *
 * Bidirectional parent ↔ follow-up linkage between R3.0B case records and R3.0E
 * Experiments. The linkage object stores parent + child case ids on EACH side so a
 * deleted parent can be detected (child becomes ORPHAN, never silently broken).
 * Per SKYLINE D12/E1 ruling: this linkage is stored in a SEPARATE namespace; it
 * does NOT extend the frozen R3.0B case-record schema.
 */
(function (root) {
  'use strict';
  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0E_ReasonCodes !== 'undefined' ? R3_0E_ReasonCodes : undefined);
  if (!RC) throw new Error('follow-up-link-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  var LINK_KEYS = Object.freeze([
    'schemaVersion',
    'linkId',
    'parentCaseId',                     // R3.0B caseId ref
    'followUpCaseId',                   // R3.0B caseId ref
    'experimentId',                     // R3.0E experimentId ref
    'parentStatus',                     // 'present' | 'archived' | 'deleted'
    'createdAt',
  ]);

  var PARENT_STATUS_ALLOWED = Object.freeze(['present', 'archived', 'deleted']);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  function validateFollowUpLinkShape(lIn) {
    try {
      if (!RC.isOriginalPlainObject(lIn)) return RC.buildBlockedResult([CODES.LINKAGE_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED]);
      if (RC.hasHiddenOwnKey(lIn)) return RC.buildBlockedResult([CODES.LINKAGE_INVALID, CODES.UNKNOWN_OWN_KEY]);
      var l = RC.toCleanCopy(lIn);
      if (!_isPlain(l)) return RC.buildBlockedResult([CODES.LINKAGE_INVALID]);
      if (!_hasOnlyAllowedKeys(l, LINK_KEYS)) return RC.buildBlockedResult([CODES.LINKAGE_INVALID, CODES.UNKNOWN_OWN_KEY]);

      var reasons = [];
      if (!Number.isInteger(l.schemaVersion) || l.schemaVersion !== 1) reasons.push(CODES.LINKAGE_INVALID);
      if (!_nonEmptyStr(l.linkId)) reasons.push(CODES.LINKAGE_INVALID);
      if (!_nonEmptyStr(l.parentCaseId)) reasons.push(CODES.LINKAGE_PARENT_MISSING);
      if (!_nonEmptyStr(l.followUpCaseId)) reasons.push(CODES.LINKAGE_INVALID);
      if (l.parentCaseId === l.followUpCaseId) reasons.push(CODES.LINKAGE_INVALID);  // self-link
      if (!_nonEmptyStr(l.experimentId)) reasons.push(CODES.LINKAGE_INVALID);
      if (PARENT_STATUS_ALLOWED.indexOf(l.parentStatus) === -1) reasons.push(CODES.LINKAGE_INVALID);
      if (!_nonEmptyStr(l.createdAt)) reasons.push(CODES.LINKAGE_INVALID);

      if (reasons.length) {
        var seen = Object.create(null), out = [];
        reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
        return RC.buildBlockedResult(out);
      }
      return Object.freeze({ valid: true });
    } catch (e) { return RC.buildBlockedResult([CODES.LINKAGE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]); }
  }

  var api = { LINK_KEYS: LINK_KEYS, PARENT_STATUS_ALLOWED: PARENT_STATUS_ALLOWED, validateFollowUpLinkShape: validateFollowUpLinkShape };
  Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { Object.defineProperty(root, 'R3_0E_FollowUpLinkContract', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_FollowUpLinkContract = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
