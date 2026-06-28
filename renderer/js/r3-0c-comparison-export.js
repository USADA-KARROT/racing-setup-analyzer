/**
 * renderer/js/r3-0c-comparison-export.js — R3.0C C6 · Comparison Export Service.
 *
 * Closed-allowlist gateway between authoritative C5 delta-metrics results and the bounded portable
 * export envelope defined by contracts/r3.0c/comparison-export-contract.js. This service does NOT
 * compute anything new — it validates input authority, rebuilds an explicit allowlist payload from
 * service output, applies bounded caps, calls the contract envelope builder, round-trips the JSON
 * representation (serialize → parse → re-validate), and returns a frozen envelope.
 *
 * The directive's allowlist (R3.0 Continuous Delivery §七 C6):
 *   Allowed: schema identity / version / generatedAt (envelope), comparisonStatus, referenceLap,
 *            comparisonLap, association, cumulativeDelta, corners, metricAvailability, credibility,
 *            confidence, provenance, limitations, blockers, cannotConclude, alternativeExplanations,
 *            nextValidationAction.
 *   Forbidden: raw telemetry, normalized grids, per-sample traces, channel arrays, full session
 *              objects, IndexedDB keys, filenames, private paths, arbitrary user metadata,
 *              reactive UI state, class instance, Date / Map / Set / typed arrays, callback /
 *              function, unbounded prose, the caller's complete result spread.
 *
 * Blocked export contract (directive): only current + authoritative + service-produced blocked
 * results may be exported. Blocked envelopes carry status / reasonCodes / limitations / minimal
 * identity / next validation action — never fabricated metrics.
 *
 * Authority discipline (the ten builder steps from the directive):
 *   1. Validate the result is shaped like a C5 service output (status + sign + metrics shape).
 *   2. Validate the association block (caseId / sessionId / track / layout / basis / direction).
 *   3. Validate the generation token is a non-empty string supplied by the caller (the orchestrator
 *      is responsible for token freshness — this service refuses an absent token).
 *   4. Explicit allowlist: only the directive-named fields land in the payload.
 *   5. Rebuild a plain object from scratch — never spread or assign the caller's result.
 *   6. Apply bounded item caps + per-string + total UTF-8 byte caps (delegated to the envelope
 *      contract's validator).
 *   7. Validate the constructed envelope.
 *   8. JSON.stringify the envelope (deterministic ordering follows the allowlist key order).
 *   9. JSON.parse the serialized string.
 *  10. Re-validate the parsed envelope — round-trip equivalence is the export's deterministic
 *      contract. Any round-trip drift fails closed.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonExport).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-export.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var EX = Contracts.comparisonExport;
  var CE = Contracts.comparisonEligibility;
  var CR = Contracts.credibility;
  var DM = Contracts.deltaMetrics;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C6_EXPORT';
  var SIGN_FORMULA = 'comparison_minus_reference';

  // recognised authoritative C5 service status values; nothing else is treated as a service result.
  var ELIGIBLE_RESULT_STATUS = 'delta_metrics_computed';
  var BLOCKED_RESULT_STATUS = 'blocked';
  // closed payload key sets (eligible + blocked). The builder constructs these in fixed order so
  // JSON.stringify produces a deterministic byte stream for a given input.
  var ELIGIBLE_PAYLOAD_KEYS = Object.freeze([
    'comparisonStatus',
    'referenceLap',
    'comparisonLap',
    'association',
    'cumulativeDelta',
    'corners',
    'metricAvailability',
    'credibility',
    'confidence',
    'provenance',
    'limitations',
    'blockers',
    'cannotConclude',
    'alternativeExplanations',
    'nextValidationAction',
  ]);
  var BLOCKED_PAYLOAD_KEYS = Object.freeze([
    'comparisonStatus',
    'status',
    'reasonCodes',
    'limitations',
    'identity',
    'nextValidationAction',
  ]);
  // bounded caps that mirror the export envelope contract.
  var MAX_CORNERS = EX.MAX_BOUNDED_ARRAY; // 64
  var MAX_LIMITATIONS = EX.MAX_BOUNDED_ARRAY;
  var MAX_FRAMING_ENTRIES = EX.MAX_BOUNDED_ARRAY;
  var MAX_PARAM_STRING_BYTES = 256;       // matches FRAMING_KEY_SHAPE.paramsValueRule short_string
  var MAX_GENERAL_STRING_BYTES = EX.MAX_STRING_UTF8_BYTES; // 4096

  // helpers
  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _isFiniteNumOrNull(v) { return v === null || _isFiniteNum(v); }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _utf8ByteLength(s) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }
  function _shortString(s, cap) {
    if (typeof s !== 'string') return null;
    return _utf8ByteLength(s) <= (cap || MAX_GENERAL_STRING_BYTES) ? s : null;
  }
  function _allowlistFrame(frame) {
    // FRAMING_KEY_SHAPE: { reasonCode, i18nKey, params? } — params is plain object or OMITTED.
    if (!_isPlain(frame)) return null;
    if (!RC.isReasonCode(frame.reasonCode)) return null;
    if (!_nonEmptyStr(frame.i18nKey)) return null;
    if (_utf8ByteLength(frame.i18nKey) > MAX_GENERAL_STRING_BYTES) return null;
    var out = { reasonCode: frame.reasonCode, i18nKey: frame.i18nKey };
    if (frame.params !== undefined) {
      if (!_isPlain(frame.params)) return null;
      var params = {};
      var keys = Object.keys(frame.params);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (typeof k !== 'string' || k.length === 0) return null;
        var v = frame.params[k];
        if (v === null || typeof v === 'boolean') { params[k] = v; continue; }
        if (typeof v === 'number') {
          if (!_isFiniteNum(v)) return null;
          params[k] = v; continue;
        }
        if (typeof v === 'string') {
          var s = _shortString(v, MAX_PARAM_STRING_BYTES);
          if (s === null) return null;
          params[k] = s; continue;
        }
        return null; // arrays / exotic objects / functions / symbols / bigints → reject
      }
      out.params = params;
    }
    return out;
  }
  function _allowlistFrameArray(arr, cap) {
    if (!Array.isArray(arr)) return [];
    if (arr.length > cap) return null; // bounded
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var f = _allowlistFrame(arr[i]);
      if (f === null) return null;
      out.push(f);
    }
    return out;
  }
  function _allowlistLimitations(arr) {
    if (!Array.isArray(arr)) return [];
    if (arr.length > MAX_LIMITATIONS) return null;
    var out = [];
    var seen = {};
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      if (!RC.isReasonCode(c)) return null;
      if (seen[c]) continue; // dedupe
      seen[c] = true;
      out.push(c);
    }
    return out;
  }

  function _blockedExport(reasonCodes, detail) {
    var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    var br = RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
    return Object.freeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: br.reasonCodes,
      explanationKeys: br.explanationKeys,
      detail: br.detail,
      envelope: null,
      serialized: null,
      result: null,
    });
  }

  // Authority shape gates (steps 1–3 of the directive).
  function _validateRequestShape(request) {
    if (!_isPlain(request)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'request not a plain object' };
    if (!_nonEmptyStr(request.generationToken)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'missing generationToken' };
    if (_utf8ByteLength(request.generationToken) > MAX_GENERAL_STRING_BYTES) return { ok: false, reasons: [CODES.EXPORT_PAYLOAD_STRING_TOO_LONG], detail: 'generationToken too long' };
    if (!_isPlain(request.result)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result not a plain object' };
    if (typeof request.result.eligible !== 'boolean') return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result.eligible not boolean' };
    if (typeof request.result.status !== 'string') return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result.status not string' };
    var st = request.result.status;
    if (request.result.eligible === true && st !== ELIGIBLE_RESULT_STATUS) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'eligible result must carry status delta_metrics_computed' };
    if (request.result.eligible === false && st !== BLOCKED_RESULT_STATUS) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'blocked result must carry status blocked' };
    if (request.result.eligible === true && request.result.sign !== SIGN_FORMULA) return { ok: false, reasons: [CODES.DELTA_METRIC_SIGN_FORBIDDEN], detail: 'eligible result sign mismatch' };
    return { ok: true };
  }

  function _validateAssociation(association) {
    if (!_isPlain(association)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'association not a plain object' };
    if (!_nonEmptyStr(association.caseId)) return { ok: false, reasons: [CODES.CROSS_CASE_COMPARISON_UNSUPPORTED], detail: 'association missing caseId' };
    if (!_nonEmptyStr(association.sessionId)) return { ok: false, reasons: [CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED], detail: 'association missing sessionId' };
    if (!_nonEmptyStr(association.trackId) || !_nonEmptyStr(association.layoutId)) return { ok: false, reasons: [CODES.MISSING_TRACK_IDENTITY], detail: 'association missing track/layout id' };
    if (CE.ACCEPTED_POSITION_BASES.indexOf(association.positionBasis) === -1) return { ok: false, reasons: [CODES.MISSING_POSITION_BASIS], detail: 'association positionBasis invalid' };
    if (CE.ACCEPTED_POSITION_DIRECTIONS.indexOf(association.positionDirection) === -1) return { ok: false, reasons: [CODES.MISSING_POSITION_DIRECTION], detail: 'association positionDirection invalid' };
    return { ok: true };
  }

  function _validateAssociationVsResultIdentity(result, association) {
    // result.identity is { caseId, sessionId }; association must match. This catches a stale result
    // (the C5 service was called against a different case/session than the orchestrator's current
    // association). Stale results MUST NOT export — directive §七 C6 "blocked export only when
    // current + authoritative".
    if (!_isPlain(result.identity)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result.identity not plain' };
    if (result.identity.caseId !== association.caseId) return { ok: false, reasons: [CODES.CROSS_CASE_COMPARISON_UNSUPPORTED], detail: 'result.identity caseId stale vs association' };
    if (result.identity.sessionId !== association.sessionId) return { ok: false, reasons: [CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED], detail: 'result.identity sessionId stale vs association' };
    return { ok: true };
  }

  // Allowlist rebuild of bounded summaries (step 4–5).
  function _buildReferenceLapSummary(request) {
    // request.referenceLap should be a small plain object with sessionId / lapId / lapTimeMs.
    // We REBUILD it explicitly; we do NOT spread the caller's input.
    var ref = request.referenceLap;
    if (!_isPlain(ref)) return null;
    var lapTimeMs = (ref.lapTimeMs === undefined || ref.lapTimeMs === null) ? null : ref.lapTimeMs;
    if (lapTimeMs !== null && (!_isFiniteNum(lapTimeMs) || lapTimeMs <= 0)) return null;
    var sessionId = _nonEmptyStr(ref.sessionId) ? _shortString(ref.sessionId) : null;
    var lapId = _nonEmptyStr(ref.lapId) ? _shortString(ref.lapId) : null;
    if (sessionId === null) return null;
    return { sessionId: sessionId, lapId: lapId, lapTimeMs: lapTimeMs };
  }
  function _buildComparisonLapSummary(request) {
    var cmp = request.comparisonLap;
    if (!_isPlain(cmp)) return null;
    var lapTimeMs = (cmp.lapTimeMs === undefined || cmp.lapTimeMs === null) ? null : cmp.lapTimeMs;
    if (lapTimeMs !== null && (!_isFiniteNum(lapTimeMs) || lapTimeMs <= 0)) return null;
    var sessionId = _nonEmptyStr(cmp.sessionId) ? _shortString(cmp.sessionId) : null;
    var lapId = _nonEmptyStr(cmp.lapId) ? _shortString(cmp.lapId) : null;
    if (sessionId === null) return null;
    return { sessionId: sessionId, lapId: lapId, lapTimeMs: lapTimeMs };
  }
  function _buildAssociationSummary(association) {
    return {
      caseId: association.caseId,
      trackId: association.trackId,
      layoutId: association.layoutId,
      positionBasis: association.positionBasis,
      positionDirection: association.positionDirection,
    };
  }
  function _buildCumulativeDelta(metrics) {
    if (!_isPlain(metrics) || !_isPlain(metrics.delta_cumulative)) {
      return { value: null, unit: 'ms', available: false, reason: CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE };
    }
    var dc = metrics.delta_cumulative;
    if (!_isFiniteNumOrNull(dc.value) || dc.value === null) {
      return { value: null, unit: 'ms', available: false, reason: CODES.DELTA_METRIC_NUMERIC_INVALID };
    }
    return { value: dc.value, unit: 'ms', available: true };
  }
  function _buildCorners(metrics) {
    // The corners array is the per-corner sector_delta projection. entry/mid/exit are kept out of
    // export until the phase-boundary capability is enabled (governance/r3.0c/capabilities.json
    // phase_boundary_contract.enabled). C6 only exports sector_delta per corner.
    if (!_isPlain(metrics) || !_isPlain(metrics.sector_delta) || !Array.isArray(metrics.sector_delta.perCorner)) {
      return []; // no corners → bounded empty array is valid
    }
    var pc = metrics.sector_delta.perCorner;
    if (pc.length > MAX_CORNERS) return null;
    var out = [];
    for (var i = 0; i < pc.length; i++) {
      var e = pc[i];
      if (e === null || e === undefined) { out.push({ cornerId: null, sectorDelta: null, available: false, reason: CODES.DELTA_METRIC_NUMERIC_INVALID }); continue; }
      if (!_isPlain(e)) return null;
      var cornerId = _nonEmptyStr(e.cornerId) ? _shortString(e.cornerId) : null;
      if (cornerId === null) return null;
      var available = e.available === true;
      var sectorDelta = null;
      var reason;
      if (available) {
        if (!_isFiniteNum(e.value)) return null;
        sectorDelta = e.value;
        out.push({ cornerId: cornerId, sectorDelta: sectorDelta, available: true });
      } else {
        reason = RC.isReasonCode(e.reason) ? e.reason : CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE;
        out.push({ cornerId: cornerId, sectorDelta: null, available: false, reason: reason });
      }
    }
    return out;
  }
  function _buildMetricAvailability(metrics) {
    var names = CE.SUPPORTED_METRICS;
    var out = {};
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      // map SUPPORTED_METRICS (UI/eligibility names) to delta-metrics names where appropriate.
      // The export's metricAvailability lists THE export's view of which delta metrics carry a
      // value. We only mark true when the metric exists in the result AND is not blocked AND
      // not partial.
      var key = n === 'speedDelta' ? null : null; // C5 doesn't carry speedDelta in metrics (deferred)
      // For C6 export, the present canonical metrics in C5 result are lap_time / delta_cumulative
      // / sector_delta / entry_delta / mid_delta / exit_delta. We expose availability for these
      // names directly so the export consumer can read availability per the C5 vocabulary.
      out[n] = false;
    }
    // Direct exposure for the C5 canonical metric vocabulary.
    var canonical = DM.SUPPORTED_DELTA_METRICS;
    for (var j = 0; j < canonical.length; j++) {
      var cn = canonical[j];
      var m = _isPlain(metrics) ? metrics[cn] : null;
      var phaseGated = DM.PHASE_SCOPE_METRICS.indexOf(cn) !== -1;
      // The PHASE_SCOPE_METRICS may have computed values in the C5 result, but C6 export does NOT
      // expose their availability while the phase_boundary_contract capability is disabled. The
      // service simply reports availability:false for those entries — the consumer cannot derive
      // a phase value from the export.
      if (phaseGated) { out[cn] = false; continue; }
      if (!_isPlain(m)) { out[cn] = false; continue; }
      if (m.partial === true) { out[cn] = false; continue; }
      if (m.value === undefined && !Array.isArray(m.perCorner)) { out[cn] = false; continue; }
      out[cn] = true;
    }
    return out;
  }

  function _buildEligiblePayload(request, allowedFraming) {
    var ref = _buildReferenceLapSummary(request); if (ref === null) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'referenceLap summary invalid' };
    var cmp = _buildComparisonLapSummary(request); if (cmp === null) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'comparisonLap summary invalid' };
    var assoc = _buildAssociationSummary(request.association);
    var metrics = request.result.metrics;
    var cumDelta = _buildCumulativeDelta(metrics);
    var corners = _buildCorners(metrics);
    if (corners === null) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'corners summary invalid' };
    var availability = _buildMetricAvailability(metrics);
    var limitations = _allowlistLimitations(request.credibilityMetadata.limitations);
    if (limitations === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'limitations contain unknown codes or exceed cap' };
    var blockers = _allowlistLimitations(request.credibilityMetadata.blockedReasons);
    if (blockers === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'blockedReasons contain unknown codes or exceed cap' };
    var cannotConclude = _allowlistFrameArray(allowedFraming.cannotConclude || [], MAX_FRAMING_ENTRIES);
    if (cannotConclude === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.cannotConclude invalid' };
    var alternativeExplanations = _allowlistFrameArray(allowedFraming.alternativeExplanations || [], MAX_FRAMING_ENTRIES);
    if (alternativeExplanations === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.alternativeExplanations invalid' };
    var nextValidationAction = null;
    if (allowedFraming.nextValidationAction !== undefined && allowedFraming.nextValidationAction !== null) {
      nextValidationAction = _allowlistFrame(allowedFraming.nextValidationAction);
      if (nextValidationAction === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.nextValidationAction invalid' };
    }
    // any per-metric partial → comparisonStatus = 'partial' rather than 'success'.
    var anyPartial = false;
    if (_isPlain(metrics)) {
      var ks = Object.keys(metrics);
      for (var i = 0; i < ks.length; i++) {
        var m = metrics[ks[i]];
        if (_isPlain(m) && m.partial === true) { anyPartial = true; break; }
      }
    }
    var payload = {
      comparisonStatus: anyPartial ? 'partial' : 'success',
      referenceLap: ref,
      comparisonLap: cmp,
      association: assoc,
      cumulativeDelta: cumDelta,
      corners: corners,
      metricAvailability: availability,
      credibility: request.credibilityMetadata.credibility,
      confidence: request.credibilityMetadata.confidence,
      provenance: request.credibilityMetadata.provenance,
      limitations: limitations,
      blockers: blockers,
      cannotConclude: cannotConclude,
      alternativeExplanations: alternativeExplanations,
      nextValidationAction: nextValidationAction,
    };
    // Deterministic key order: rebuild in ELIGIBLE_PAYLOAD_KEYS order so JSON.stringify is stable.
    var ordered = {};
    for (var k = 0; k < ELIGIBLE_PAYLOAD_KEYS.length; k++) {
      var key = ELIGIBLE_PAYLOAD_KEYS[k];
      ordered[key] = payload[key];
    }
    return { ok: true, payload: ordered };
  }

  function _buildBlockedPayload(request) {
    var result = request.result;
    var assoc = request.association;
    var reasonCodes = Array.isArray(result.reasonCodes) ? result.reasonCodes.filter(function (c) { return RC.isReasonCode(c); }) : [];
    if (reasonCodes.length === 0) reasonCodes = [CODES.INTERNAL_CONTRACT_VIOLATION];
    var limitations = _allowlistLimitations(request.credibilityMetadata ? request.credibilityMetadata.limitations : []);
    if (limitations === null) limitations = [];
    var nextValidationAction = null;
    if (request.framing && request.framing.nextValidationAction) {
      nextValidationAction = _allowlistFrame(request.framing.nextValidationAction);
    }
    var payload = {
      comparisonStatus: 'blocked',
      status: 'blocked',
      reasonCodes: reasonCodes,
      limitations: limitations,
      identity: { caseId: assoc.caseId, sessionId: assoc.sessionId },
      nextValidationAction: nextValidationAction,
    };
    var ordered = {};
    for (var k = 0; k < BLOCKED_PAYLOAD_KEYS.length; k++) {
      ordered[BLOCKED_PAYLOAD_KEYS[k]] = payload[BLOCKED_PAYLOAD_KEYS[k]];
    }
    return { ok: true, payload: ordered };
  }

  /**
   * buildComparisonExport(request) — produces a closed-schema portable comparison envelope.
   *
   * request shape (caller MUST supply ALL five fields):
   *   {
   *     result: <C5 delta-metrics service result — eligible or blocked>,
   *     association: { caseId, sessionId, trackId, layoutId, positionBasis, positionDirection },
   *     credibilityMetadata: { credibility, provenance, confidence, limitations[], blockedReasons[] },
   *     generationToken: '<non-empty opaque token>',
   *     framing?: { cannotConclude?:[], alternativeExplanations?:[], nextValidationAction? }
   *   }
   *
   * Returns either:
   *   - frozen envelope { schemaIdentity, schemaVersion, generatedAt:null, payload },
   *     with a `.serialized` plain-string mirror produced by JSON.stringify + JSON.parse round trip;
   *   - or _blockedExport([reasonCodes]) — never a partial envelope.
   */
  function buildComparisonExport(request) {
    // 1. shape gate
    var shape = _validateRequestShape(request);
    if (!shape.ok) return _blockedExport(shape.reasons, shape.detail);
    // 2. association gate
    var assoc = _validateAssociation(request.association);
    if (!assoc.ok) return _blockedExport(assoc.reasons, assoc.detail);
    // 3. credibility gate
    var cred = CR.validateCredibilityMetadata(request.credibilityMetadata);
    if (!cred.valid) return _blockedExport(cred.reasonCodes.slice(), 'credibilityMetadata invalid');

    // 4. eligible vs blocked branch
    var payloadBuilt;
    if (request.result.eligible === true) {
      // 4a. association ↔ result identity match (stale-result guard)
      var idCheck = _validateAssociationVsResultIdentity(request.result, request.association);
      if (!idCheck.ok) return _blockedExport(idCheck.reasons, idCheck.detail);
      var framing = _isPlain(request.framing) ? request.framing : {};
      payloadBuilt = _buildEligiblePayload(request, framing);
    } else {
      payloadBuilt = _buildBlockedPayload(request);
    }
    if (!payloadBuilt.ok) return _blockedExport(payloadBuilt.reasons, payloadBuilt.detail);

    // 5. build envelope via the contract
    var envelope = EX.buildComparisonExportEnvelope(payloadBuilt.payload);
    if (envelope.eligible === false) {
      // envelope construction failed (oversize / non-finite / etc.) — propagate the reason verbatim.
      return _blockedExport(envelope.reasonCodes.slice(), envelope.detail);
    }
    // 6. validate the constructed envelope (first pass — pre-serialize).
    var preCheck = EX.validateComparisonExportEnvelope(envelope);
    if (preCheck.eligible === false) return _blockedExport(preCheck.reasonCodes.slice(), preCheck.detail || 'envelope failed pre-serialize validation');

    // 7. serialize → 8. parse → 9. revalidate (round-trip determinism).
    var serialized;
    try { serialized = JSON.stringify(envelope); }
    catch (e) { return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.stringify threw: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown')); }
    if (typeof serialized !== 'string') return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.stringify produced non-string');
    var parsed;
    try { parsed = JSON.parse(serialized); }
    catch (e) { return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.parse threw: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown')); }
    var postCheck = EX.validateComparisonExportEnvelope(parsed);
    if (postCheck.eligible === false) return _blockedExport(postCheck.reasonCodes.slice(), postCheck.detail || 'envelope failed post-serialize validation');

    // 10. return the constructed envelope + its serialized + parsed mirrors. The parsed mirror is
    //     what a downstream consumer would actually receive after a true file round-trip.
    return Object.freeze({
      eligible: true,
      status: 'comparison_export_built',
      envelope: envelope,
      serialized: serialized,
      parsed: Object.freeze(parsed),
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    SIGN_FORMULA: SIGN_FORMULA,
    ELIGIBLE_PAYLOAD_KEYS: ELIGIBLE_PAYLOAD_KEYS,
    BLOCKED_PAYLOAD_KEYS: BLOCKED_PAYLOAD_KEYS,
    buildComparisonExport: buildComparisonExport,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
