/**
 * renderer/js/r3-0c-lap-authority.js — R3.0C C2 · Lap Authority (renderer-level production service).
 *
 * Re-derives the FIVE lap authorities defined by contracts/r3.0c/valid-lap-contract.js
 * (lapIdentity, completeness, timingValidity, trackIdentity, sampleContinuity) FROM RAW LAP EVIDENCE.
 * It does NOT trust caller-supplied authority claims — every slot is recomputed from the evidence
 * object and the calibration thresholds; the contract layer then validates the produced descriptor.
 *
 * Public surface:
 *   deriveLapAuthority(lapEvidence, options)         — primary entry; returns a descriptor + reasonCodes
 *   assessMetricChannelRequirements(metric, ev, opts) — partial-channel gating for a single metric
 *   DEFAULT_THRESHOLDS                                — calibrated against the 16-fixture matrix
 *   METRIC_REQUIRED_CHANNELS                          — metric → required raw-channel allowlist
 *   AUTHORITY_KEYS / SUPPORTED_PROVENANCES            — for tests and downstream consumers
 *
 * Fail-closed contract:
 *   • Any malformed input (non-object evidence, missing required scalar field) → blocked with
 *     INTERNAL_CONTRACT_VIOLATION; descriptor is null. Never throws.
 *   • Track identity must arrive as { trackId, layoutId, source:'explicit' }; anything else is
 *     fail-closed (MISSING_TRACK_IDENTITY). No inference from name / filename / lap-length / sample
 *     shape — that policy lives in renderer/js/r3-0c-track-identity.js and this service refuses to
 *     duplicate it.
 *   • Distance authority is opt-in evidence; when present it must be an authoritative descriptor
 *     produced by renderer/js/r3-0c-distance-authority.js (authorityStatus !== 'inferred'). When
 *     absent, sampleContinuity only uses the time-domain gap test; the contract will still emit
 *     MISSING_NORMALIZED_DISTANCE_AUTHORITY at the comparison-eligibility step if distance is
 *     required there.
 *   • Synthetic provenance is permitted by default; the produced descriptor records it on the
 *     evidence side-channel so the comparison layer's credibility validator can enforce the
 *     SYNTHETIC_ONLY_LIMITATION marker independently.
 *
 * Calibration:
 *   DEFAULT_THRESHOLDS is `calibrationStatus: 'fixture_derived_pending_field_validation'`. Every
 *   eligible descriptor carries a `limitations` array on the evidence side that includes
 *   'thresholds_fixture_calibrated_not_field_validated' — downstream credibility metadata MUST
 *   preserve this string so we never claim a field-calibrated authority we do not have. Caller
 *   thresholds (via options.thresholds) override the default but are recorded as
 *   `calibrationStatus: 'caller_supplied'` and still carry the field-validation limitation unless
 *   the caller explicitly supplies `calibrationStatus`.
 *
 * NO ALGORITHM beyond the structural authority derivation: this module does NOT segment laps, does
 * NOT pair corners, does NOT compute deltas, does NOT select reference laps, does NOT touch the
 * UI, does NOT touch the Feature Registry, does NOT decide track identity on its own (it only
 * inspects an authority descriptor the caller supplies).
 *
 * UMD: Node require / Electron renderer global (R3_0C_LapAuthority).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); }
    catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) {
    throw new Error('renderer/js/r3-0c-lap-authority.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
  }
  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var VL = Contracts.validLap;
  var CE = Contracts.comparisonEligibility;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C2_LAP_AUTHORITY';

  // The five authority keys come from the contract; mirroring them here lets fixtures cite a
  // single source-of-truth name set without re-importing the contract. Order matters: the contract
  // emits reason codes in this order.
  var AUTHORITY_KEYS = VL.REQUIRED_LAP_AUTHORITIES;

  var SUPPORTED_PROVENANCES = Object.freeze(['real', 'synthetic', 'unverified']);

  // metric → required raw channels. Closed allowlist (extending requires both this map AND the
  // contract's SUPPORTED_METRICS allowlist — both stay in lockstep so a metric without a channel
  // map cannot accidentally claim eligibility). Channel names are canonical (the same vocabulary
  // telemetry-core uses); the validation only checks PRESENCE in lapEvidence.channelsAvailable.
  var METRIC_REQUIRED_CHANNELS = Object.freeze({
    speedDelta: Object.freeze(['speed']),
    timeDelta: Object.freeze(['time']),
    latAccelDelta: Object.freeze(['lateral_accel']),
    brakingOnsetDelta: Object.freeze(['brake']),
    throttleApplicationDelta: Object.freeze(['throttle']),
    steeringCorrectionDelta: Object.freeze(['steering']),
  });

  // calibration evidence is documented in governance/r3.0c/checkpoints/C2.json; numerical values
  // here are the fixture-matrix-validated conservative defaults. CalibrationStatus is the contract
  // between this service and any downstream credibility metadata: it must propagate or downgrade.
  var DEFAULT_THRESHOLDS = Object.freeze({
    coverage: 0.95,                  // share of expected nominal samples actually present
    minimumSamples: 200,             // hard floor — fewer samples cannot support derivative metrics
    normalizedMaxGap: 0.02,          // largest normalized-distance gap between consecutive samples
    timeGapSeconds: 0.5,             // largest time gap between consecutive samples
    calibrationStatus: 'fixture_derived_pending_field_validation',
  });

  var FIELD_CALIBRATION_LIMITATION = 'thresholds_fixture_calibrated_not_field_validated';

  function _isPlain(v) {
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
    var p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _isPosNum(v) { return typeof v === 'number' && isFinite(v) && v >= 0; }
  function _isStrictPosNum(v) { return typeof v === 'number' && isFinite(v) && v > 0; }

  function _freezeArray(arr) { return Object.freeze((arr || []).slice()); }

  function _blocked(reasons, detail) {
    // Always route through the contract factory so reason codes are normalized + deduped + the
    // empty-reason fail-closed guarantee holds. Detail is bounded by the contract to 200 chars.
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    return RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
  }

  function _resolveThresholds(opts) {
    if (!opts || !_isPlain(opts.thresholds)) return DEFAULT_THRESHOLDS;
    // Caller overrides: every numeric must validate; missing fields inherit DEFAULT_THRESHOLDS.
    var t = opts.thresholds;
    var out = {
      coverage: typeof t.coverage === 'number' && t.coverage > 0 && t.coverage <= 1 ? t.coverage : DEFAULT_THRESHOLDS.coverage,
      minimumSamples: Number.isInteger(t.minimumSamples) && t.minimumSamples > 0 ? t.minimumSamples : DEFAULT_THRESHOLDS.minimumSamples,
      normalizedMaxGap: typeof t.normalizedMaxGap === 'number' && t.normalizedMaxGap > 0 && t.normalizedMaxGap < 1 ? t.normalizedMaxGap : DEFAULT_THRESHOLDS.normalizedMaxGap,
      timeGapSeconds: typeof t.timeGapSeconds === 'number' && t.timeGapSeconds > 0 ? t.timeGapSeconds : DEFAULT_THRESHOLDS.timeGapSeconds,
      calibrationStatus: _nonEmptyStr(t.calibrationStatus) ? t.calibrationStatus : 'caller_supplied',
    };
    return Object.freeze(out);
  }

  function _validateProvenance(p, opts) {
    if (!_nonEmptyStr(p) || SUPPORTED_PROVENANCES.indexOf(p) === -1) return false;
    if (opts && Array.isArray(opts.requireProvenance) && opts.requireProvenance.length) {
      return opts.requireProvenance.indexOf(p) !== -1;
    }
    return true; // default: all three accepted; SYNTHETIC honesty is enforced by the credibility contract downstream
  }

  // Derive lapIdentity.satisfied — every identity scalar (case + session + lap + source) must be a
  // non-empty string; sourceId is the authoritative origin marker (importer / synthesizer / live
  // stream) and is required so the credibility ladder downstream can record provenance precisely.
  function _deriveLapIdentity(ev) {
    var ok = _nonEmptyStr(ev.caseId) && _nonEmptyStr(ev.sessionId) && _nonEmptyStr(ev.lapId) && _nonEmptyStr(ev.sourceId);
    return { satisfied: !!ok };
  }

  // completeness — the lap must have foundational channels present (time + speed). Without these
  // the rest of the analysis cannot run, so the structural authority is denied even before
  // metric-level partial-channel gating. Per-metric channel checks happen separately via
  // assessMetricChannelRequirements so unrelated metrics are not poisoned by, say, missing brake.
  function _deriveCompleteness(ev) {
    if (!Array.isArray(ev.channelsAvailable)) return { satisfied: false };
    var have = new Set(ev.channelsAvailable.filter(_nonEmptyStr));
    var foundational = ['time', 'speed'];
    var allPresent = foundational.every(function (c) { return have.has(c); });
    return { satisfied: !!allPresent };
  }

  // timingValidity — start < end, lapTimeMs > 0, and the declared lapTimeMs must agree with
  // (end - start) * 1000 within 1ms tolerance (timestamp rounding). A negative or zero lap time,
  // out-of-order timestamps, or a >1ms internal inconsistency fails closed.
  function _deriveTimingValidity(ev) {
    var t = ev.timing;
    if (!_isPlain(t)) return { satisfied: false };
    if (!_isStrictPosNum(t.lapTimeMs)) return { satisfied: false };
    if (!_isPosNum(t.lapStartTime) || !_isPosNum(t.lapEndTime)) return { satisfied: false };
    if (!(t.lapEndTime > t.lapStartTime)) return { satisfied: false };
    var computedMs = (t.lapEndTime - t.lapStartTime) * 1000;
    if (Math.abs(computedMs - t.lapTimeMs) > 1) return { satisfied: false };
    return { satisfied: true };
  }

  // trackIdentity — only the explicit shape is honored. Anything else (a string name, a derived
  // object, a missing source flag) is treated as absent and produces MISSING_TRACK_IDENTITY.
  function _deriveTrackIdentity(ev) {
    var ti = ev.trackIdentity;
    if (!_isPlain(ti)) return { satisfied: false };
    if (!_nonEmptyStr(ti.trackId) || !_nonEmptyStr(ti.layoutId)) return { satisfied: false };
    if (ti.source !== 'explicit') return { satisfied: false };
    return { satisfied: true };
  }

  // sampleContinuity — the only authority that splits its reason code between two failure modes
  // (DISCONTINUOUS_SAMPLES vs INSUFFICIENT_SAMPLE_COVERAGE). The contract reads `discontinuous`
  // to pick the right code, so this service must mark it explicitly when a SINGLE excessive gap
  // (time-domain OR normalized-distance-domain) is the failure mode — even if the overall sample
  // count is otherwise adequate. Coverage / sample-count failures leave `discontinuous` false.
  function _deriveSampleContinuity(ev, thresholds) {
    var s = ev.samples;
    if (!_isPlain(s)) return { satisfied: false, discontinuous: false, reasonHint: 'samples_missing' };
    if (!Number.isInteger(s.count) || s.count < 0) return { satisfied: false, discontinuous: false, reasonHint: 'sample_count_invalid' };
    if (s.count < thresholds.minimumSamples) return { satisfied: false, discontinuous: false, reasonHint: 'below_min_samples' };
    if (!_isPosNum(s.timebaseMedianSeconds) || !_isPosNum(s.timebaseMaxGapSeconds)) {
      return { satisfied: false, discontinuous: false, reasonHint: 'timebase_invalid' };
    }
    var bigTimeGap = s.timebaseMaxGapSeconds > thresholds.timeGapSeconds;
    if (bigTimeGap) return { satisfied: false, discontinuous: true, reasonHint: 'time_gap_exceeds_threshold' };
    // coverage gate — declared sample count divided by samples expected from (lapDuration / median).
    // Below threshold means the lap evidence is internally inconsistent (declared median + duration
    // imply many more samples than were collected — i.e. either large untimed gaps or misreporting).
    // Treated as INSUFFICIENT_SAMPLE_COVERAGE (NOT DISCONTINUOUS_SAMPLES) — coverage is a density
    // failure, not a single-gap failure. timeGap failures above already routed to DISCONTINUOUS.
    var coverage = _coverage(ev, thresholds);
    if (coverage < thresholds.coverage) {
      return { satisfied: false, discontinuous: false, reasonHint: 'below_coverage_threshold' };
    }
    // distance-domain gap is checked only when distance evidence is present AND authoritative.
    if (_isPlain(ev.distance) && _isPlain(ev.distance.samples)) {
      var d = ev.distance.samples;
      if (typeof d.normalizedMaxGap === 'number' && d.normalizedMaxGap > thresholds.normalizedMaxGap) {
        return { satisfied: false, discontinuous: true, reasonHint: 'normalized_gap_exceeds_threshold' };
      }
      if (d.monotonic === false) {
        return { satisfied: false, discontinuous: true, reasonHint: 'distance_non_monotonic' };
      }
    }
    return { satisfied: true, discontinuous: false };
  }

  function _coverage(ev, thresholds) {
    // coverage = actual / expected, where expected is derived from lap duration × nominal sample rate.
    // If timebaseMedianSeconds is 0 or unknown, coverage is undefined and we conservatively report 0.
    if (!_isPlain(ev.samples) || !_isPlain(ev.timing)) return 0;
    var med = ev.samples.timebaseMedianSeconds;
    if (!_isStrictPosNum(med)) return 0;
    var durationSeconds = ev.timing.lapEndTime - ev.timing.lapStartTime;
    if (!(durationSeconds > 0)) return 0;
    var expected = durationSeconds / med;
    if (!(expected > 0)) return 0;
    return Math.min(1, ev.samples.count / expected);
  }

  function deriveLapAuthority(lapEvidence, options) {
    if (!_isPlain(lapEvidence)) {
      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'lapEvidence not an object');
    }
    var opts = _isPlain(options) ? options : null;
    var thresholds = _resolveThresholds(opts);

    // Provenance is a structural gate — the descriptor cannot be produced if we cannot honestly
    // label its source class. Synthetic stays accepted; the credibility contract enforces honesty.
    if (!_validateProvenance(lapEvidence.provenance, opts)) {
      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'provenance unsupported');
    }

    var lapIdentity = _deriveLapIdentity(lapEvidence);
    var completeness = _deriveCompleteness(lapEvidence);
    var timingValidity = _deriveTimingValidity(lapEvidence);
    var trackIdentity = _deriveTrackIdentity(lapEvidence);
    var sampleContinuity = _deriveSampleContinuity(lapEvidence, thresholds);

    var descriptor = {
      lapIdentity: { satisfied: !!lapIdentity.satisfied },
      completeness: { satisfied: !!completeness.satisfied },
      timingValidity: { satisfied: !!timingValidity.satisfied },
      trackIdentity: { satisfied: !!trackIdentity.satisfied },
      sampleContinuity: { satisfied: !!sampleContinuity.satisfied, discontinuous: !!sampleContinuity.discontinuous },
    };

    // Delegate the final reason-code emission to the contract; this is the single place reason
    // codes for the lap-authority cluster are produced. Re-emitting them here would risk drift.
    var contractResult = VL.evaluateLapAuthority(descriptor);

    var coverage = _coverage(lapEvidence, thresholds);
    var limitations = [FIELD_CALIBRATION_LIMITATION];
    if (lapEvidence.provenance === 'synthetic') limitations.push(CODES.SYNTHETIC_ONLY_LIMITATION);

    var evidenceOut = Object.freeze({
      caseId: _nonEmptyStr(lapEvidence.caseId) ? lapEvidence.caseId : null,
      sessionId: _nonEmptyStr(lapEvidence.sessionId) ? lapEvidence.sessionId : null,
      lapId: _nonEmptyStr(lapEvidence.lapId) ? lapEvidence.lapId : null,
      sourceId: _nonEmptyStr(lapEvidence.sourceId) ? lapEvidence.sourceId : null,
      provenance: lapEvidence.provenance,
      timing: _isPlain(lapEvidence.timing) ? Object.freeze({
        lapStartTime: lapEvidence.timing.lapStartTime,
        lapEndTime: lapEvidence.timing.lapEndTime,
        lapTimeMs: lapEvidence.timing.lapTimeMs,
      }) : null,
      samples: _isPlain(lapEvidence.samples) ? Object.freeze({
        count: lapEvidence.samples.count,
        timebaseMedianSeconds: lapEvidence.samples.timebaseMedianSeconds,
        timebaseMaxGapSeconds: lapEvidence.samples.timebaseMaxGapSeconds,
        coverage: coverage,
      }) : null,
      distance: _isPlain(lapEvidence.distance) && _isPlain(lapEvidence.distance.authority) ? Object.freeze({
        authorityStatus: lapEvidence.distance.authority.authorityStatus || null,
        sourceChannel: lapEvidence.distance.authority.sourceChannel || null,
        unit: lapEvidence.distance.authority.unit || null,
        direction: lapEvidence.distance.authority.direction || null,
        wrapSemantics: lapEvidence.distance.authority.wrapSemantics || null,
      }) : null,
      channelsAvailable: Array.isArray(lapEvidence.channelsAvailable) ? _freezeArray(lapEvidence.channelsAvailable.slice()) : Object.freeze([]),
      appliedThresholds: thresholds,
      sampleContinuityHint: sampleContinuity.reasonHint || null,
      limitations: _freezeArray(limitations),
    });

    if (!contractResult.eligible) {
      // Compose an explicit-shaped blocked result that PRESERVES the contract-emitted reason codes
      // AND the side-channel evidence, so downstream credibility metadata can carry both. The
      // contract's blocked result is immutable; we wrap it rather than mutate.
      return Object.freeze({
        eligible: false,
        descriptor: Object.freeze({
          lapIdentity: Object.freeze(descriptor.lapIdentity),
          completeness: Object.freeze(descriptor.completeness),
          timingValidity: Object.freeze(descriptor.timingValidity),
          trackIdentity: Object.freeze(descriptor.trackIdentity),
          sampleContinuity: Object.freeze(descriptor.sampleContinuity),
        }),
        status: 'blocked',
        reasonCodes: contractResult.reasonCodes,
        explanationKeys: contractResult.explanationKeys,
        evidence: evidenceOut,
        result: null,
      });
    }

    return Object.freeze({
      eligible: true,
      descriptor: Object.freeze({
        lapIdentity: Object.freeze(descriptor.lapIdentity),
        completeness: Object.freeze(descriptor.completeness),
        timingValidity: Object.freeze(descriptor.timingValidity),
        trackIdentity: Object.freeze(descriptor.trackIdentity),
        sampleContinuity: Object.freeze(descriptor.sampleContinuity),
      }),
      status: 'lap_authority_complete',
      evaluation: 'evidence_derived', // honest scope: derived from evidence, not just a structure gate
      reasonCodes: Object.freeze([]),
      evidence: evidenceOut,
      result: null, // no comparison numbers — that's later checkpoints
    });
  }

  // assessMetricChannelRequirements — partial-channel gating. The metric must first be supported
  // by the contract (closed allowlist) AND it must be in our METRIC_REQUIRED_CHANNELS map (the two
  // are kept in lockstep). If raw channels it needs are missing on this lap, only THAT metric is
  // blocked — the lap can still satisfy lap-level authority and other metrics can still be
  // computed. This is the "缺 steering → 只 block 需要 steering 的分析" semantic.
  function assessMetricChannelRequirements(metricName, lapEvidence, options) {
    var contractMetric = CE.evaluateMetricSupport(metricName);
    if (!contractMetric.eligible) return contractMetric; // UNSUPPORTED_METRIC etc — passthrough
    var req = METRIC_REQUIRED_CHANNELS[metricName];
    if (!req) {
      // metric is in the contract's SUPPORTED_METRICS but we have no required-channels mapping —
      // fail closed so a silently-added metric cannot pass unchecked.
      return _blocked([CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE], 'no required-channel map for ' + metricName);
    }
    if (!_isPlain(lapEvidence) || !Array.isArray(lapEvidence.channelsAvailable)) {
      return _blocked([CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE], 'lapEvidence.channelsAvailable missing');
    }
    var have = new Set(lapEvidence.channelsAvailable.filter(_nonEmptyStr));
    var missing = [];
    for (var i = 0; i < req.length; i++) if (!have.has(req[i])) missing.push(req[i]);
    if (missing.length) {
      var res = _blocked([CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE], 'metric ' + metricName + ' missing channels: ' + missing.join(','));
      // Augment with structured evidence — the contract's blocked result has a bounded `detail`
      // string; we wrap it so the downstream UI / credibility can introspect which channels.
      return Object.freeze({
        eligible: false,
        status: 'blocked',
        metric: metricName,
        requiredChannels: Object.freeze(req.slice()),
        missingChannels: Object.freeze(missing.slice()),
        reasonCodes: res.reasonCodes,
        explanationKeys: res.explanationKeys,
        detail: res.detail,
        result: null,
      });
    }
    return Object.freeze({
      eligible: true,
      status: 'metric_channels_present',
      metric: metricName,
      requiredChannels: Object.freeze(req.slice()),
      missingChannels: Object.freeze([]),
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    AUTHORITY_KEYS: AUTHORITY_KEYS,
    SUPPORTED_PROVENANCES: SUPPORTED_PROVENANCES,
    METRIC_REQUIRED_CHANNELS: METRIC_REQUIRED_CHANNELS,
    DEFAULT_THRESHOLDS: DEFAULT_THRESHOLDS,
    FIELD_CALIBRATION_LIMITATION: FIELD_CALIBRATION_LIMITATION,
    deriveLapAuthority: deriveLapAuthority,
    assessMetricChannelRequirements: assessMetricChannelRequirements,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_LapAuthority = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
