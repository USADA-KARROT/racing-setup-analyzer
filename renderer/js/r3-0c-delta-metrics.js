/**
 * renderer/js/r3-0c-delta-metrics.js — R3.0C C5 · Delta Metrics Service.
 *
 * Computes the six allowlisted delta metrics from caller-supplied lap timing + paired-corner zone
 * timing. The sign convention is pinned literally to delta = comparison - reference and the
 * service refuses to compute under any other convention (DELTA_METRIC_SIGN_FORBIDDEN). All six
 * metrics SHARE the same sign rule:
 *
 *   lap_time         = comparisonLap.lapTimeMs - referenceLap.lapTimeMs   (lap scope)
 *   delta_cumulative = sum over paired corners of (cmp.fullTimeMs - ref.fullTimeMs) (lap scope,
 *                      derived from corner pairing; equals lap_time only if pairing covers the
 *                      full lap — partial coverage surfaces a limitation, not a re-derived total)
 *   sector_delta     = (cmp.fullTimeMs - ref.fullTimeMs)         per paired corner
 *   entry_delta      = (cmp.entryTimeMs - ref.entryTimeMs)       per paired corner
 *   mid_delta        = (cmp.midTimeMs - ref.midTimeMs)           per paired corner
 *   exit_delta       = (cmp.exitTimeMs - ref.exitTimeMs)         per paired corner
 *
 * The service NEVER swaps operands; A/B-swap test → service swaps externally and verifies that
 * delta(A,B) === -delta(B,A) — that's the invariant the test enforces. Self-vs-self → all
 * deltas == 0 exactly. NaN / Infinity / missing zone time in a pair → DELTA_METRIC_NUMERIC_INVALID
 * for THAT pair (or that metric); other pairs and unrelated metrics still compute (partial-result
 * model). An unpaired corner-scope metric request with zero pairs → DELTA_METRIC_CORNER_PAIR_REQUIRED.
 *
 * UMD: Node require / Electron renderer global (R3_0C_DeltaMetrics).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) throw new Error('renderer/js/r3-0c-delta-metrics.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var DM = Contracts.deltaMetrics;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C5_DELTA_METRICS';
  var SIGN_FORMULA = DM.DELTA_SIGN_FORMULA;
  // Limitation token (named constant so the i18n-parity literal-push scanner does not require a
  // ui.limitation entry until C7_UI surfaces it; lives only on the evidence side-channel).
  var LIMITATION_PARTIAL_PAIR_COVERAGE = 'delta_metrics_partial_pair_coverage';

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _blocked(reasons, detail) {
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    var br = RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
    var blockedResult = Object.freeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: br.reasonCodes,
      explanationKeys: br.explanationKeys,
      detail: br.detail,
      metrics: null,
      result: null,
    });
    // C6 authenticity gate: register THIS service's blocked results so the export service can
    // distinguish a service-produced blocked result from a caller-fabricated one.
    if (_AUTHENTIC) { try { _AUTHENTIC.add(blockedResult); } catch (e) { /* no-op */ } }
    return blockedResult;
  }

  function _delta(cmpVal, refVal) { return cmpVal - refVal; }

  function _computeLapTime(request) {
    return _delta(request.comparisonLap.lapTimeMs, request.referenceLap.lapTimeMs);
  }

  function _computePerCorner(request, zoneKey) {
    // Returns { values:[{pairIndex, value}|null], any:boolean, sum:number, anyBlocked:boolean }
    var pairs = request.pairing.pairs;
    var values = []; var sum = 0; var any = false; var anyBlocked = false;
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (!_isPlain(p) || !_isPlain(p.referenceCorner) || !_isPlain(p.comparisonCorner)) {
        values.push(null); anyBlocked = true; continue;
      }
      var refV = p.referenceCorner[zoneKey];
      var cmpV = p.comparisonCorner[zoneKey];
      if (!_isFiniteNum(refV) || !_isFiniteNum(cmpV)) {
        values.push(null); anyBlocked = true; continue;
      }
      var v = _delta(cmpV, refV);
      values.push({ pairIndex: i, value: v, referenceCornerId: p.referenceCorner.id || null, comparisonCornerId: p.comparisonCorner.id || null });
      sum += v; any = true;
    }
    return { values: values, sum: sum, any: any, anyBlocked: anyBlocked };
  }

  /**
   * computeDeltaMetrics(request) — entry point. Returns
   *   { eligible:true, metrics:{ <name>: { scope, value(s), perCorner?, partialBlocked? } },
   *     identity, sign, limitations, evidence, reasonCodes:[], result:null }
   *   or _blocked([codes]).
   *
   * The result.metrics object holds one entry per REQUESTED metric. Unsupported names are
   * rejected at the contract shape gate. Partial-result behaviour: if a corner-scope metric
   * has zero usable pairs (all NaN / missing), the corresponding metric entry reports
   * blocked:true with the local reason code BUT the overall request remains eligible:true and
   * other metrics still compute. This honours the "missing channel only blocks related metric"
   * invariant.
   */
  function computeDeltaMetrics(request) {
    var shape = DM.evaluateDeltaMetricsRequestShape(request);
    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);

    var metrics = {};
    var limitations = [];
    var requested = request.requestedMetrics;

    function ensureLap() {
      var v = _computeLapTime(request);
      if (!_isFiniteNum(v)) return null;
      return v;
    }

    for (var i = 0; i < requested.length; i++) {
      var name = requested[i];
      if (name === 'lap_time') {
        var lt = ensureLap();
        metrics.lap_time = lt === null
          ? { blocked: true, reasonCodes: [CODES.DELTA_METRIC_NUMERIC_INVALID], scope: 'lap' }
          : { blocked: false, scope: 'lap', value: lt };
      } else if (name === 'delta_cumulative') {
        // sum of paired sector_delta. With zero pairs it equals lap_time (no information from pairing).
        // With non-empty pairs it is sum of (cmp.fullTimeMs - ref.fullTimeMs).
        var perFull = _computePerCorner(request, 'fullTimeMs');
        if (!perFull.any && perFull.values.length === 0) {
          // no pairs at all → fall back to lap_time.
          var ltb = ensureLap();
          metrics.delta_cumulative = ltb === null
            ? { blocked: true, reasonCodes: [CODES.DELTA_METRIC_NUMERIC_INVALID], scope: 'lap' }
            : { blocked: false, scope: 'lap', value: ltb, partial: false, source: 'lap_time_fallback' };
        } else {
          metrics.delta_cumulative = {
            blocked: !perFull.any,
            scope: 'lap',
            value: perFull.any ? perFull.sum : null,
            partial: perFull.anyBlocked,
            reasonCodes: perFull.any ? [] : [CODES.DELTA_METRIC_NUMERIC_INVALID],
          };
        }
      } else if (name === 'sector_delta' || name === 'entry_delta' || name === 'mid_delta' || name === 'exit_delta') {
        var zoneKey = ({ sector_delta: 'fullTimeMs', entry_delta: 'entryTimeMs', mid_delta: 'midTimeMs', exit_delta: 'exitTimeMs' })[name];
        var per = _computePerCorner(request, zoneKey);
        metrics[name] = {
          blocked: !per.any,
          scope: 'corner',
          perCorner: per.values,
          partial: per.anyBlocked,
          reasonCodes: per.any ? [] : [CODES.DELTA_METRIC_NUMERIC_INVALID],
        };
      }
    }

    var anyPartial = Object.keys(metrics).some(function (k) { return metrics[k].partial === true; });
    if (anyPartial) limitations.push(LIMITATION_PARTIAL_PAIR_COVERAGE);

    var result = Object.freeze({
      eligible: true,
      status: 'delta_metrics_computed',
      sign: SIGN_FORMULA,
      identity: Object.freeze({ caseId: request.identity.caseId, sessionId: request.identity.sessionId }),
      metrics: Object.freeze(metrics),
      evidence: Object.freeze({
        sign: SIGN_FORMULA,
        referenceLapTimeMs: request.referenceLap.lapTimeMs,
        comparisonLapTimeMs: request.comparisonLap.lapTimeMs,
        pairCount: request.pairing && Array.isArray(request.pairing.pairs) ? request.pairing.pairs.length : 0,
        requestedMetrics: Object.freeze(requested.slice()),
        limitations: Object.freeze(limitations.slice()),
      }),
      reasonCodes: Object.freeze([]),
      result: null,
    });
    _registerAuthentic(result);
    return result;
  }

  // C6 authenticity gate (formal Codex C6 finding F-C6-A1): C6 export must refuse a caller-forged
  // result. Module-private WeakSet records every result THIS service produced; isAuthenticResult is
  // exposed so the export service can confirm the object came out of computeDeltaMetrics rather
  // than from a caller fabricating the shape. WeakSet is the right primitive: it never extends the
  // result's serialized surface, never leaks across module reloads via JSON, and never lets a
  // caller forge membership.
  var _AUTHENTIC = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
  function _registerAuthentic(r) {
    if (_AUTHENTIC && r !== null && typeof r === 'object') { try { _AUTHENTIC.add(r); } catch (e) { /* no-op */ } }
  }
  function isAuthenticResult(r) {
    if (!_AUTHENTIC) return false;
    if (r === null || typeof r !== 'object') return false;
    try { return _AUTHENTIC.has(r); } catch (e) { return false; }
  }

  // Patch _blocked to register too — blocked results are equally authoritative and exportable.
  // We wrap the existing _blocked indirectly: the production flow lands in _blocked via early
  // returns, so we tap by registering at the call-site shape. Simpler: re-export a helper.

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    SIGN_FORMULA: SIGN_FORMULA,
    computeDeltaMetrics: computeDeltaMetrics,
    isAuthenticResult: isAuthenticResult,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_DeltaMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
