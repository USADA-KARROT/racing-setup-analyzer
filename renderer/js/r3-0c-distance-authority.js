/**
 * renderer/js/r3-0c-distance-authority.js — R3.0C C2 · Distance Authority (renderer-level).
 *
 * Decides which lap-distance / track-position channel for a given lap can be trusted as the
 * authoritative basis for normalized-position downstream. The rule is intentionally narrow:
 *
 *   AN AUTHORITY EXISTS ONLY IF the caller declares a channel-source distance with an explicit
 *   unit, an explicit direction ('forward' | 'reverse'), an explicit wrapSemantics, and an
 *   authorityStatus of 'channel_source_declared'. Inferential sources (sample index, elapsed-time
 *   ratio, speed integral, GPS-derived approximation) are ENUMERATED and EXPLICITLY REJECTED — the
 *   service records which were offered so downstream UI can explain what was refused, but never
 *   accepts them.
 *
 * Why this is its own module (not folded into lap-authority): distance authority has its OWN
 * narrow rejection rule and its own evidence shape that must propagate through to C3
 * (normalized distance) and C4 (corner pairing) without re-derivation. Centralising the rule
 * here keeps a future C3 free to add real normalization logic on top of a stable evidence
 * surface, instead of re-litigating "is this distance trustworthy" at every checkpoint.
 *
 * Public surface:
 *   deriveDistanceAuthority(distanceEvidence)
 *   ACCEPTED_AUTHORITY_STATUSES / ACCEPTED_DIRECTIONS / ACCEPTED_WRAP_SEMANTICS
 *   FORBIDDEN_INFERENCE_SOURCES — enumeration of inputs the service refuses
 *
 * Fail-closed contract:
 *   • Non-object / null distanceEvidence → blocked (MISSING_NORMALIZED_DISTANCE_AUTHORITY).
 *   • proposedChannels missing / empty / non-array → blocked.
 *   • A proposed channel WITH a forbidden authorityStatus (e.g. 'inferred_from_sample_index',
 *     'inferred_from_elapsed_time_ratio', 'inferred_from_speed_integral') is rejected even if
 *     the unit / direction look fine — the service refuses to accept the inferred origin under
 *     any cosmetic relabeling.
 *   • Multiple valid candidates → pick the FIRST one whose authorityStatus is 'channel_source_declared'
 *     in caller-supplied order (deterministic, no implicit ranking, no preference for any specific
 *     unit). If ties matter the caller orders them.
 *   • The returned descriptor SHAPE is compatible with the lap-authority service's
 *     `lapEvidence.distance.authority` slot — they can be wired together without translation.
 *
 * NO ALGORITHM beyond the rule check: the service does NOT integrate speed, does NOT sniff
 * channel content, does NOT touch UI, does NOT decide track identity, does NOT normalize
 * position values (that's C3).
 *
 * UMD: Node require / Electron renderer global (R3_0C_DistanceAuthority).
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
    throw new Error('renderer/js/r3-0c-distance-authority.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
  }
  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C2_LAP_AUTHORITY';

  var ACCEPTED_AUTHORITY_STATUSES = Object.freeze(['channel_source_declared']);
  var ACCEPTED_DIRECTIONS = Object.freeze(['forward', 'reverse']);
  // wrap semantics — 'no_wrap' = distance is monotonic across the lap; 'wraps_at_lap_end' = distance
  // resets at lap boundary; 'wraps_at_value' = a known scalar wrap (e.g. 0..track_length then back to 0).
  var ACCEPTED_WRAP_SEMANTICS = Object.freeze(['no_wrap', 'wraps_at_lap_end', 'wraps_at_value']);
  // ENUMERATED rejected origins. Any authorityStatus in this list is fail-closed — the service
  // refuses to accept a distance derived from these signals regardless of how it is dressed up.
  var FORBIDDEN_INFERENCE_SOURCES = Object.freeze([
    'inferred_from_sample_index',
    'inferred_from_elapsed_time_ratio',
    'inferred_from_speed_integral',
    'inferred_from_gps_proximity',
    'inferred_from_track_length_guess',
  ]);

  function _isPlain(v) {
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
    var p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  function _blocked(reasons, detail) {
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    return RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
  }

  function _isValidChannel(c) {
    if (!_isPlain(c)) return false;
    if (!_nonEmptyStr(c.channelName)) return false;
    if (!_nonEmptyStr(c.unit)) return false;
    if (ACCEPTED_DIRECTIONS.indexOf(c.direction) === -1) return false;
    if (ACCEPTED_WRAP_SEMANTICS.indexOf(c.wrapSemantics) === -1) return false;
    if (ACCEPTED_AUTHORITY_STATUSES.indexOf(c.authorityStatus) === -1) return false;
    return true;
  }

  function _rejectedReason(c) {
    if (!_isPlain(c)) return 'not_an_object';
    if (!_nonEmptyStr(c.channelName)) return 'channel_name_missing';
    if (!_nonEmptyStr(c.unit)) return 'unit_missing';
    if (ACCEPTED_DIRECTIONS.indexOf(c.direction) === -1) return 'direction_invalid';
    if (ACCEPTED_WRAP_SEMANTICS.indexOf(c.wrapSemantics) === -1) return 'wrap_semantics_invalid';
    if (FORBIDDEN_INFERENCE_SOURCES.indexOf(c.authorityStatus) !== -1) return 'authority_status_inferential_rejected';
    if (ACCEPTED_AUTHORITY_STATUSES.indexOf(c.authorityStatus) === -1) return 'authority_status_invalid';
    return 'unknown';
  }

  function deriveDistanceAuthority(distanceEvidence) {
    if (!_isPlain(distanceEvidence)) {
      var b0 = _blocked([CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY], 'distance evidence not an object');
      return Object.freeze({
        eligible: false,
        authority: null,
        status: 'blocked',
        reasonCodes: b0.reasonCodes,
        explanationKeys: b0.explanationKeys,
        proposedCount: 0,
        rejectedProposals: Object.freeze([]),
        rejectedInferentialSources: Object.freeze([]),
        detail: b0.detail,
        result: null,
      });
    }
    var proposals = Array.isArray(distanceEvidence.proposedChannels) ? distanceEvidence.proposedChannels.slice() : [];
    var fallback = Array.isArray(distanceEvidence.fallbackInferences) ? distanceEvidence.fallbackInferences.slice() : [];
    var rejectedFallbacks = fallback.filter(function (s) { return FORBIDDEN_INFERENCE_SOURCES.indexOf(s) !== -1; });

    var rejectedProposals = [];
    var chosen = null;
    // Iterate EVERY proposal so the evidence trail records every offered candidate. Pick the first
    // valid one as the authority; subsequent proposals (valid or invalid) are recorded with their
    // actual reason. This is the contract: "the service refuses to accept a distance derived from
    // [forbidden] signals regardless of how it is dressed up" — refusal must be visible even when a
    // valid proposal earlier in the list has already supplied the authority.
    for (var i = 0; i < proposals.length; i++) {
      var c = proposals[i];
      var validHere = _isValidChannel(c);
      if (validHere && !chosen) { chosen = c; continue; }
      var reason = validHere ? 'skipped_after_first_valid' : _rejectedReason(c);
      rejectedProposals.push(Object.freeze({
        index: i,
        channelName: _isPlain(c) && _nonEmptyStr(c.channelName) ? c.channelName : null,
        authorityStatus: _isPlain(c) && _nonEmptyStr(c.authorityStatus) ? c.authorityStatus : null,
        rejectedReason: reason,
      }));
    }

    if (!chosen) {
      var bx = _blocked([CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY], 'no proposal passed authority rules');
      return Object.freeze({
        eligible: false,
        authority: null,
        status: 'blocked',
        reasonCodes: bx.reasonCodes,
        explanationKeys: bx.explanationKeys,
        proposedCount: proposals.length,
        rejectedProposals: Object.freeze(rejectedProposals.slice()),
        rejectedInferentialSources: Object.freeze(rejectedFallbacks.slice()),
        detail: bx.detail,
        result: null,
      });
    }

    var limitations = Array.isArray(chosen.limitations) ? chosen.limitations.filter(_nonEmptyStr).slice() : [];

    return Object.freeze({
      eligible: true,
      authority: Object.freeze({
        sourceChannel: chosen.channelName,
        unit: chosen.unit,
        direction: chosen.direction,
        wrapSemantics: chosen.wrapSemantics,
        authorityStatus: chosen.authorityStatus,
        limitations: Object.freeze(limitations),
      }),
      status: 'distance_authority_declared',
      reasonCodes: Object.freeze([]),
      proposedCount: proposals.length,
      rejectedProposals: Object.freeze(rejectedProposals.slice()),
      rejectedInferentialSources: Object.freeze(rejectedFallbacks.slice()),
      result: null,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    ACCEPTED_AUTHORITY_STATUSES: ACCEPTED_AUTHORITY_STATUSES,
    ACCEPTED_DIRECTIONS: ACCEPTED_DIRECTIONS,
    ACCEPTED_WRAP_SEMANTICS: ACCEPTED_WRAP_SEMANTICS,
    FORBIDDEN_INFERENCE_SOURCES: FORBIDDEN_INFERENCE_SOURCES,
    deriveDistanceAuthority: deriveDistanceAuthority,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_DistanceAuthority = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
