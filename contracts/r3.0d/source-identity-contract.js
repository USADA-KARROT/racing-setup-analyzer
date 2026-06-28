/**
 * contracts/r3.0d/source-identity-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines SourceIdentity — the case / session / lap / source-version binding every EvidenceNode,
 * Observation, Hypothesis, Recommendation, and Engineer Brief MUST carry. The contract validates the
 * SHAPE of an identity claim (it does NOT verify the claim against an authoritative WeakSet — that
 * authority binding lives in the renderer at C8_ACTIVATION's r3cC8Authority / r3cC8SessionAuthority
 * closures). D1's job is to refuse a structurally malformed identity at the contract boundary so a
 * downstream production module can never see one.
 *
 * Freshness rule: a freshness timestamp (ISO-8601 string) is required on every node so the D3
 * Priority Engine can downweight stale evidence; values older than now-by-policy are flagged but the
 * D1 contract does NOT compute a policy decision — it only validates the SHAPE.
 *
 * Association binding: the optional lapId is the only field where a null is permitted (lap-scoped
 * evidence is rarer than case-scoped or session-scoped). caseId + sessionId are MANDATORY.
 *
 * UMD: Node require / Electron renderer global (R3_0D_SourceIdentityContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  if (!RC) throw new Error('source-identity-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // Closed key set for SourceIdentity (D1). Any extra own key → UNKNOWN_OWN_KEY. caseId / sessionId /
  // sourceId / sourceVersion / freshness are MANDATORY; lapId is OPTIONAL (null permitted).
  var SOURCE_IDENTITY_KEYS = Object.freeze(['caseId', 'sessionId', 'lapId', 'sourceId', 'sourceVersion', 'freshness']);
  var SOURCE_IDENTITY_REQUIRED_KEYS = Object.freeze(['caseId', 'sessionId', 'sourceId', 'sourceVersion', 'freshness']);

  // String byte cap per field (UTF-8 byte length, NOT character count). Same cap pattern as R3.0C's
  // comparison-export bounded strings — prevents an attacker padding an id with megabytes.
  var STRING_BYTE_CAP = 512;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return s.length * 4; /* worst-case */ } }

  // Codex D1 Round 1 Finding RN-01 closure: use Reflect.ownKeys so non-enumerable own properties AND
  // Symbol-keyed properties are also enumerated. Symbols are not in the allowlist (a string array) →
  // they fail the indexOf check. Proxy ownKeys traps that throw collapse to false (fail-closed).
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; }
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (allowed.indexOf(k) === -1) return false;
    }
    return true;
  }

  // ISO-8601 timestamp regex (basic — full validation lives in the production service if it ever
  // becomes a freshness POLICY decision; D1 only checks the SHAPE).
  var ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

  /**
   * validateSourceIdentity(id) — D1 SHAPE gate.
   *
   * Returns { valid:true, identity:<frozen copy> } or buildBlockedResult.
   *
   * Refusals:
   *   • not a plain prototype object   → INTERNAL_CONTRACT_VIOLATION
   *   • extra own key                  → SOURCE_IDENTITY_INVALID + UNKNOWN_OWN_KEY
   *   • caseId / sessionId / sourceId / sourceVersion / freshness missing or non-string
   *                                    → SOURCE_IDENTITY_INVALID
   *   • lapId neither null nor non-empty string
   *                                    → SOURCE_IDENTITY_LAP_MISMATCH
   *   • any string field exceeds STRING_BYTE_CAP
   *                                    → BYTE_CAP_EXCEEDED
   *   • freshness not ISO-8601 shape   → SOURCE_IDENTITY_INVALID
   */
  function validateSourceIdentity(id) {
    // Codex D1 Round 1 Finding RN-02 closure: outer try/catch so any hostile getter throw collapses
    // to a structured SOURCE_IDENTITY_INVALID + INTERNAL_CONTRACT_VIOLATION instead of escaping.
    try {
    if (!_isPlain(id)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'identity not a plain object' });
    if (!_hasOnlyAllowedKeys(id, SOURCE_IDENTITY_KEYS)) return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'identity carries forbidden own key' });
    var reasons = [];
    SOURCE_IDENTITY_REQUIRED_KEYS.forEach(function (k) {
      var v = id[k];
      if (!_nonEmptyStr(v)) { reasons.push(CODES.SOURCE_IDENTITY_INVALID); return; }
      if (_utf8Bytes(v) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
    });
    if (!('lapId' in id)) {
      // lapId is OPTIONAL — default null when omitted. The producer MAY omit it for case/session-scoped
      // evidence; consumers MUST treat absence as null.
    } else if (id.lapId !== null) {
      if (!_nonEmptyStr(id.lapId)) reasons.push(CODES.SOURCE_IDENTITY_LAP_MISMATCH);
      else if (_utf8Bytes(id.lapId) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
    }
    if (_nonEmptyStr(id.freshness) && !ISO8601_RE.test(id.freshness)) reasons.push(CODES.SOURCE_IDENTITY_INVALID);
    if (!_nonEmptyStr(id.sourceVersion)) {
      // Already caught above as SOURCE_IDENTITY_INVALID — keep the specific code too for diagnostic value.
      reasons.push(CODES.SOURCE_IDENTITY_VERSION_MISSING);
    }
    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }
    return Object.freeze({
      valid: true,
      identity: Object.freeze({
        caseId: id.caseId,
        sessionId: id.sessionId,
        lapId: ('lapId' in id) ? id.lapId : null,
        sourceId: id.sourceId,
        sourceVersion: id.sourceVersion,
        freshness: id.freshness,
      }),
    });
    } catch (e) {
      return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'source-identity validator threw on hostile input' });
    }
  }

  /**
   * sourceIdentityMatches(a, b) — equality based on the four hard identifiers + sourceVersion. The
   * freshness timestamp is intentionally EXCLUDED from equality (it advances naturally between reads
   * of the same evidence).
   */
  function sourceIdentityMatches(a, b) {
    if (!_isPlain(a) || !_isPlain(b)) return false;
    return a.caseId === b.caseId
      && a.sessionId === b.sessionId
      && a.lapId === b.lapId
      && a.sourceId === b.sourceId
      && a.sourceVersion === b.sourceVersion;
  }

  var api = {
    SOURCE_IDENTITY_KEYS: SOURCE_IDENTITY_KEYS,
    SOURCE_IDENTITY_REQUIRED_KEYS: SOURCE_IDENTITY_REQUIRED_KEYS,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    validateSourceIdentity: validateSourceIdentity,
    sourceIdentityMatches: sourceIdentityMatches,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_SourceIdentityContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
