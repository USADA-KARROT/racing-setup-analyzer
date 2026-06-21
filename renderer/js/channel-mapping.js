/**
 * channel-mapping.js — R2.3 §4.3: explicit raw→canonical channel mapping projection (PURE).
 *
 * buildChannelMapping(rawChannels, assignments, opts): the user can map ANY raw column (by stable
 * `rawColumnId`) to a canonical channel — manual assignment, not limited to auto-detect. telemetry-core
 * patterns are used only to SUGGEST. Produces an immutable `mappingEntries` list (one per assignment) so a
 * downstream service can re-check one-to-one uniqueness in BOTH directions; a canonical-keyed convenience
 * map (`byCanonical`) is for display only.
 *
 * RED LINES: pure; never mutates input; identity is by `rawColumnId` (not the lossy lower-cased name);
 * `identityStatus` is descriptive — the analysis judge is `userConfirmed===true ∧ valid projection ∧ 1:1`
 * (enforced downstream). No observation/calibration logic here.
 *
 * UMD: Node require / Electron renderer global (ChannelMapping).
 */
(function (root) {
  'use strict';

  var CANONICAL_CHANNELS = Object.freeze(['speed', 'lateral_accel', 'yaw_rate', 'steering', 'throttle', 'brake', 'track_position', 'lap', 'time']);
  var CANONICAL_UNITS = Object.freeze({ speed: 'm/s', lateral_accel: 'm/s2', yaw_rate: 'rad/s', steering: null, throttle: '%', brake: 'bar', track_position: 'm', lap: null, time: 's' });
  var IDENTITY_STATUS = Object.freeze(['confirmed', 'auto_detected', 'user_assigned', 'assumed', 'ambiguous', 'unavailable']);
  // suggestion-only patterns (extends telemetry-schema with pedal/track/lap)
  var SUGGEST = {
    speed: [/^speed$/i, /vehicle.*speed/i, /car.?speed/i, /gps.?speed/i],
    lateral_accel: [/^accy$/i, /lat.*acc/i, /g.?lat/i],
    yaw_rate: [/yaw/i],
    steering: [/steer/i],
    throttle: [/throttle/i, /^tps$/i, /accel.*ped/i, /gas/i],
    brake: [/brake/i, /^bps$/i, /brk/i],
    track_position: [/track.*pos/i, /lap.*dist/i, /^dist/i, /gps/i, /curv/i],
    lap: [/^lap$/i, /lapno/i, /lap.*num/i, /lap.*idx/i],
    time: [/^time$/i, /^t$/i, /timestamp/i, /^xtime$/i],
  };

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _validProjection(p) {
    return p && _isFiniteNum(p.scale) && p.scale !== 0 && _isFiniteNum(p.offset) && (p.sign === 1 || p.sign === -1);
  }
  // deterministic projection signature (binds a steering calibration to THIS mapping's projection); MUST match calibration-registry.projectionSignature
  function projectionSignature(p) { p = p || {}; return 's:' + p.scale + '|o:' + p.offset + '|g:' + p.sign; }

  // auto-suggest a canonical channel for a raw name; returns {canonical, confidence} or null
  function _suggest(rawName) {
    var hits = [];
    Object.keys(SUGGEST).forEach(function (canon) {
      if (SUGGEST[canon].some(function (re) { return re.test(rawName); })) hits.push(canon);
    });
    if (hits.length === 1) return { canonical: hits[0], confidence: 'medium', ambiguous: false };
    if (hits.length > 1) return { canonical: null, confidence: 'low', ambiguous: true, candidates: hits };
    return null;
  }

  /**
   * @param rawChannels  [{rawColumnId, rawName, rawUnit, ...}]
   * @param assignments  [{rawColumnId, canonicalChannel, userConfirmed?, scale?, offset?, sign?, canonicalUnit?}]
   */
  function buildChannelMapping(rawChannels, assignments, opts) {
    rawChannels = Array.isArray(rawChannels) ? rawChannels : [];
    assignments = Array.isArray(assignments) ? assignments : [];
    var byId = {};
    rawChannels.forEach(function (c) { if (c && _isFiniteNum(c.rawColumnId)) byId[c.rawColumnId] = c; });

    var entries = [], mappingEntries = [], errors = [];
    var seenCanonical = {}, seenColumn = {}, ambiguities = [];

    assignments.forEach(function (a, i) {
      a = a || {};
      var raw = byId[a.rawColumnId];
      if (!raw) { errors.push({ code: 'ASSIGNMENT_UNKNOWN_COLUMN', detail: String(a.rawColumnId), index: i }); return; }
      if (CANONICAL_CHANNELS.indexOf(a.canonicalChannel) === -1) { errors.push({ code: 'ASSIGNMENT_UNKNOWN_CANONICAL', detail: String(a.canonicalChannel), index: i }); return; }
      var projection = { scale: _isFiniteNum(a.scale) ? a.scale : 1, offset: _isFiniteNum(a.offset) ? a.offset : 0, sign: (a.sign === -1 ? -1 : 1) };
      var projValid = _validProjection(projection);
      var userConfirmed = a.userConfirmed === true;
      // duplicate detection (both directions) — reported, not silently collapsed
      if (seenCanonical[a.canonicalChannel] != null) ambiguities.push({ code: 'DUPLICATE_CANONICAL', canonicalChannel: a.canonicalChannel });
      if (seenColumn[a.rawColumnId] != null) ambiguities.push({ code: 'DUPLICATE_COLUMN', rawColumnId: a.rawColumnId });
      seenCanonical[a.canonicalChannel] = (seenCanonical[a.canonicalChannel] || 0) + 1;
      seenColumn[a.rawColumnId] = (seenColumn[a.rawColumnId] || 0) + 1;

      var entry = {
        rawColumnId: a.rawColumnId, rawName: raw.rawName, canonicalChannel: a.canonicalChannel,
        rawUnit: raw.rawUnit || null, canonicalUnit: a.canonicalUnit != null ? a.canonicalUnit : CANONICAL_UNITS[a.canonicalChannel],
        scale: projection.scale, offset: projection.offset, sign: projection.sign,
        identityStatus: userConfirmed ? 'confirmed' : 'user_assigned',
        confidence: userConfirmed ? 'high' : 'medium', source: 'user', userConfirmed: userConfirmed,
        projectionValid: projValid,
      };
      entries.push(entry);
      // immutable mapping record for downstream uniqueness/eligibility (one per assignment)
      mappingEntries.push({ rawColumnId: a.rawColumnId, rawName: raw.rawName, canonicalChannel: a.canonicalChannel, userConfirmed: userConfirmed, projection: { scale: projection.scale, offset: projection.offset, sign: projection.sign }, rawUnit: raw.rawUnit || null, canonicalUnit: entry.canonicalUnit });
    });

    // auto-suggestions for raw columns not user-assigned (display hints; userConfirmed:false)
    var assignedColumns = {}; mappingEntries.forEach(function (m) { assignedColumns[m.rawColumnId] = true; });
    var suggestions = [];
    rawChannels.forEach(function (c) {
      if (assignedColumns[c.rawColumnId]) return;
      var sug = _suggest(c.rawName);
      if (!sug) return;
      suggestions.push({ rawColumnId: c.rawColumnId, rawName: c.rawName, canonicalChannel: sug.canonical, identityStatus: sug.ambiguous ? 'ambiguous' : 'auto_detected', confidence: sug.confidence, candidates: sug.candidates || null, userConfirmed: false, source: 'auto' });
    });

    var byCanonical = {}; // convenience/display only — may collapse duplicates (downstream uses mappingEntries)
    entries.forEach(function (e) { if (byCanonical[e.canonicalChannel] == null) byCanonical[e.canonicalChannel] = e; });

    return { ok: errors.length === 0, entries: entries, mappingEntries: mappingEntries, byCanonical: byCanonical, suggestions: suggestions, ambiguities: ambiguities, errors: errors };
  }

  var api = { buildChannelMapping: buildChannelMapping, projectionSignature: projectionSignature, CANONICAL_CHANNELS: CANONICAL_CHANNELS, CANONICAL_UNITS: CANONICAL_UNITS, IDENTITY_STATUS: IDENTITY_STATUS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ChannelMapping = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
