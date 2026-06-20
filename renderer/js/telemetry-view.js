/**
 * telemetry-view.js — PURE view-model layer for the Telemetry CSV Evidence viewer (V1 Step 2A).
 *
 * It PRESENTS telemetry-core's decisions for the UI — it does NOT re-implement any science
 * (no grading / preflight / mapping logic lives here; it only formats core output + applies user
 * intent). DOM-free / Alpine-free / Chart-free so it can be unit-tested in Node.
 *
 * Session shape (owned by the UI, kept in memory only — clean-room: no path persisted):
 *   {
 *     fileName,                       // display only
 *     parsed,                         // result of TelemetryCore.parseCsv(text)
 *     definitions: { [columnId]: { canonicalName?, unit?, sign?, offset?, confirmed? } },  // columnId = index in parsed.columns
 *     profileId,                      // 'custom' | 'f312_research'
 *   }
 *
 * Locked-in (per review): session definitions keyed by columnId; a vehicle profile supplies only
 * vehicle/documented context and NEVER auto-confirms a CSV channel; the view-model only presents
 * core's judgement.
 */
(function (root) {
  'use strict';
  let _core = null;
  if (typeof module !== 'undefined' && module.exports) { try { _core = require('./telemetry-core.js'); } catch (e) { _core = null; } }
  const Core = _core || (typeof TelemetryCore !== 'undefined' ? TelemetryCore : null);

  // ── vehicle research profiles (documented context ONLY; NOT app defaults; never auto-confirm channels) ──
  const VEHICLE_PROFILES = {
    custom: { id: 'custom', label: 'Custom (no vehicle assumptions)', labelKey: 'ui.telem.profile.custom', context: [] },
    f312_research: {
      id: 'f312_research', label: 'Dallara F312 (research profile)', labelKey: 'ui.telem.profile.f312_research',
      // each: { key, value, provenance }  provenance ∈ documented|derived|assumed|unavailable
      context: [
        { key: 'wheelbase_m', value: 2.8, provenance: 'documented' },
        { key: 'front_track_mm', value: 1595, provenance: 'documented' },
        { key: 'rear_track_mm', value: 1540, provenance: 'documented' },
        { key: 'steering_ratio', value: 12.5, provenance: 'documented' },     // overall static (manual)
        { key: 'ackermann_pct', value: 28, provenance: 'documented' },
        { key: 'front_motion_ratio', value: 1.39, provenance: 'documented' },
        { key: 'rear_motion_ratio', value: 1.30, provenance: 'documented' },
        { key: 'total_weight_kg', value: 569, provenance: 'documented' },
        { key: 'front_weight_pct', value: 49.4, provenance: 'documented' },
        { key: 'cg_height_mm', value: null, provenance: 'unavailable' },
        { key: 'front_torsion_wheel_rate', value: null, provenance: 'unavailable' },
        { key: 'arb_stiffness', value: null, provenance: 'unavailable' },
        { key: 'front_roll_distribution_definition', value: '60.96% (sheet)', provenance: 'unresolved' },
      ],
    },
  };
  function profileContext(profileId) { const p = VEHICLE_PROFILES[profileId] || VEHICLE_PROFILES.custom; return { id: p.id, label: p.label, labelKey: p.labelKey, rows: p.context.map(c => ({ key: c.key, value: c.value, provenance: c.provenance, available: c.value != null })) }; }

  // ── session helpers (immutable updates; definitions keyed by columnId) ──
  function newSession(fileName, parsed, profileId) { return { fileName: fileName || null, parsed, definitions: {}, profileId: profileId || 'custom' }; }

  /**
   * Apply a user edit to a column's definition. Changing any defining parameter (canonicalName,
   * unit, sign, offset) INVALIDATES a prior confirmation (must be re-confirmed) — unless the edit
   * itself sets confirmed.
   */
  function applyMappingEdit(session, columnId, edit) {
    const defs = Object.assign({}, session.definitions);
    const prev = Object.assign({}, defs[columnId] || {});
    const next = Object.assign({}, prev);
    const PARAMS = ['canonicalName', 'unit', 'sign', 'offset'];
    let paramChanged = false;
    for (const k of Object.keys(edit)) { if (PARAMS.includes(k) && edit[k] !== prev[k]) paramChanged = true; next[k] = edit[k]; }
    if (paramChanged && edit.confirmed === undefined && prev.confirmed) next.confirmed = false; // confirmation invalidation
    defs[columnId] = next;
    return Object.assign({}, session, { definitions: defs });
  }
  function setProfile(session, profileId) { return Object.assign({}, session, { profileId: VEHICLE_PROFILES[profileId] ? profileId : 'custom' }); }

  /** Translate columnId-keyed UI definitions → core's canonical-keyed definitions (confirmed columns only). */
  function toCoreDefinitions(session) {
    const channels = {};
    const cols = session.parsed.columns;
    for (const k of Object.keys(session.definitions)) {
      const d = session.definitions[k]; if (!d || !d.confirmed) continue;
      const col = cols[+k]; if (!col) continue;
      const canon = d.canonicalName || _autoCanonical(session, +k);
      if (!canon) continue;
      channels[canon] = { confirmed: true };
      if (d.unit !== undefined) channels[canon].unit = d.unit;
      if (d.sign !== undefined) channels[canon].sign = d.sign;
      if (d.offset !== undefined) channels[canon].offset = d.offset;
    }
    return { channels };
  }
  function _autoMap(session) { return Core.mapChannels(session.parsed, toCoreDefinitions(session)); }
  function _autoCanonical(session, columnId) { const m = Core.mapChannels({ columns: [session.parsed.columns[columnId]] })[0]; return m ? m.canonicalName : null; }

  // ── view-models ──
  function buildImportSummary(session) {
    const p = session.parsed; const tel = Core.columnMap(p); const tb = Core.timebaseReport(tel);
    let timeRange = null;
    if (tb.hasTime) { const tcol = tel.data[tb.timeName].filter(v => v != null); timeRange = { start: tcol[0], end: tcol[tcol.length - 1], duration: (tcol[tcol.length - 1] - tcol[0]) }; }
    return {
      fileName: session.fileName, rowCount: p.rowCount, columnCount: p.columns.length,
      warnings: (p.warnings || []).map(w => ({ code: w.code || 'WARNING', params: { count: w.count, name: w.name, expected: w.expected }, message: w.message || String(w) })),
      errors: (p.errors || []).map(e => ({ code: e.code || 'ERROR', params: {}, message: e.message || String(e) })),
      sampleRateHz: tb.sampleRateHz, hasTime: tb.hasTime, timeRange,
      profile: profileContext(session.profileId),
    };
  }

  function buildMappingRows(session) {
    const auto = _autoMap(session);
    return session.parsed.columns.map((col, i) => {
      const a = auto[i]; const d = session.definitions[i] || {};
      const effectiveCanonical = d.canonicalName !== undefined ? d.canonicalName : a.canonicalName;
      const confirmed = !!d.confirmed;
      // status: presented from core; user-confirmed → definition_confirmed (core vocabulary)
      let status = a.status;
      if (confirmed && effectiveCanonical) status = Core.GRADE.DEFINITION_CONFIRMED;
      else if (d.canonicalName !== undefined && d.canonicalName !== a.canonicalName) status = Core.GRADE.PROVISIONAL; // manual override, unconfirmed
      const dim = effectiveCanonical ? _dimOf(effectiveCanonical) : null;
      const unitRaw = d.unit !== undefined ? d.unit : (col.rawUnit || '');
      const uc = Core.classifyUnit(unitRaw, dim);
      // lightweight raw→canonical sample
      let sample = null;
      const firstVal = col.values.find(v => v != null);
      if (firstVal != null && uc.support === 'supported') sample = { raw: firstVal, rawUnit: unitRaw, canonical: +(firstVal * uc.factor).toPrecision(6), canonicalUnit: uc.canonical };
      return {
        columnId: i, rawHeader: col.rawHeader, rawName: col.rawName, rawUnit: col.rawUnit || '',
        autoCanonical: a.canonicalName, effectiveCanonical, matchType: a.matchType, confidence: a.confidence,
        basis: confirmed ? 'user_confirmed' : a.basis, status, confirmed,
        unitDimension: dim, unitSupport: uc.support, unitCanonical: uc.canonical, unitSample: sample,
        sign: d.sign !== undefined ? d.sign : 1, offset: d.offset !== undefined ? d.offset : 0,
        candidates: a.candidates || [],
        missingCount: col.missingCount, invalidCount: col.invalidCount,
      };
    });
  }

  function _preflight(session) { return Core.runTelemetryPreflight(session.parsed, toCoreDefinitions(session), {}); }

  function buildPreflightSummary(session) {
    const pf = _preflight(session);
    return { grade: pf.grade, blockers: pf.blockers.slice(), assumptions: pf.assumptions.slice(), warnings: pf.warnings.slice() };
  }

  // capability label / blocked-reason as i18n KEYS (view stays language-neutral; the UI calls t()).
  const _ANALYSIS_LABEL_KEY = {
    synchronizedCurves: 'ui.telem.cap.synchronizedCurves',
    observedYawResponse: 'ui.telem.cap.observedYawResponse',
    measuredKus: 'ui.telem.cap.measuredKus',
    bodyRollGradient: 'ui.telem.cap.bodyRollGradient',
    setupRecommendation: 'ui.telem.cap.setupRecommendation',
  };
  const _ANALYSIS_BLOCKED_REASON_KEY = {
    measuredKus: 'ui.telem.cap.reason.kus',
    bodyRollGradient: 'ui.telem.cap.reason.roll',
    setupRecommendation: 'ui.telem.cap.reason.setup',
  };
  function buildCapabilityRows(session) {
    const pf = _preflight(session); const av = pf.availableAnalyses;
    return Object.keys(_ANALYSIS_LABEL_KEY).map(key => {
      const available = !!av[key];
      let reasonKey = '';
      if (_ANALYSIS_BLOCKED_REASON_KEY[key]) reasonKey = _ANALYSIS_BLOCKED_REASON_KEY[key];
      else if (!available) reasonKey = pf.timebaseReport.status === Core.GRADE.BLOCKED ? 'ui.telem.cap.reason.timebaseBlocked' : 'ui.telem.cap.reason.channelsMissing';
      return { key, labelKey: _ANALYSIS_LABEL_KEY[key], available, reasonKey };
    });
  }

  // canonical → unit dimension (mirror of core's internal table; presentation only)
  const _CANON_DIM = { speed: 'speed', steering: 'angle', yaw_rate: 'angular_rate', lateral_accel: 'acceleration', longitudinal_accel: 'acceleration', damper_fl: 'displacement', damper_fr: 'displacement', damper_rl: 'displacement', damper_rr: 'displacement', ride_height_front: 'displacement', ride_height_rear: 'displacement', wheel_speed_fl: 'speed', wheel_speed_fr: 'speed', wheel_speed_rl: 'speed', wheel_speed_rr: 'speed' };
  function _dimOf(canon) { return canon ? (_CANON_DIM[canon] || null) : null; }

  // ── curve data prep (V1 Step 3-i): PURE. Shared row-index BUCKET downsampling with min/max peak
  //    preservation, gap-break on null / large time-gap, optional canonical conversion. Decimation is
  //    DISPLAY-ONLY — full data stays in the session; window/full row-ranges always reference the original.
  const _TIME_NAMES = ['time', 'xtime', 't', 'timestamp'];
  function _xAxis(session) {
    const cols = session.parsed.columns;
    for (let i = 0; i < cols.length; i++) {
      if (_TIME_NAMES.includes(cols[i].rawName.toLowerCase())) {
        const uc = Core.classifyUnit(cols[i].rawUnit, 'time');
        return { kind: 'time', columnId: i, name: cols[i].rawName, unit: uc.support === 'supported' ? 's' : (cols[i].rawUnit || ''), factor: uc.support === 'supported' ? uc.factor : 1 };
      }
    }
    return { kind: 'index', columnId: null, name: 'row', unit: '', factor: 1 };
  }
  /**
   * buildCurveData(session, {channels:[columnId...], targetPoints, xWindow:{startRow,endRow}, useCanonical})
   * → { x:{kind,name,unit,full:{startRow,endRow,count}}, window:{startRow,endRow,count}, decimated, bucketCount, lanes:[...] }
   * Each lane: { columnId, rawName, canonicalName, unit, useCanonical, points:[{x,y,row,gap}], yMin, yMax, gapCount }
   * `gap:true` on a point means "do not draw a line from the previous point to this one".
   */
  function buildCurveData(session, opts) {
    opts = opts || {};
    const cols = session.parsed.columns;
    const N = session.parsed.rowCount;
    const target = Math.max(50, opts.targetPoints || 1500);
    const useCanonical = opts.useCanonical !== false;
    const x = _xAxis(session);
    const xCol = x.columnId != null ? cols[x.columnId].values : null;
    const xAt = (row) => xCol ? (xCol[row] != null ? xCol[row] * x.factor : null) : row;
    const w = opts.xWindow || {};
    const s0 = Math.max(0, w.startRow != null ? w.startRow : 0);
    const e0 = Math.min(N - 1, w.endRow != null ? w.endRow : N - 1);
    const winN = Math.max(0, e0 - s0 + 1);
    const channels = (opts.channels || []).slice();
    let medDt = 0;
    if (x.kind === 'time' && xCol) {
      const dts = []; for (let i = s0 + 1; i <= e0; i++) { if (xCol[i] != null && xCol[i - 1] != null) { const d = (xCol[i] - xCol[i - 1]) * x.factor; if (d > 0) dts.push(d); } }
      dts.sort((a, b) => a - b); medDt = dts[dts.length >> 1] || 0;
    }
    const decimated = winN > target;
    const nBuckets = decimated ? target : winN;
    // gap = a jump much larger than the EXPECTED point spacing in the current (possibly decimated)
    // representation — NOT the raw sample dt (otherwise normal bucket spacing reads as a gap).
    const expectedDx = (decimated && nBuckets > 0 ? winN / nBuckets : 1) * medDt;
    const gapThresh = medDt > 0 ? 3 * expectedDx : Infinity;
    const lanes = channels.map(columnId => {
      const col = cols[columnId];
      const def = session.definitions[columnId] || {};
      const canon = def.canonicalName !== undefined ? def.canonicalName : _autoCanonical(session, columnId);
      const dim = canon ? _dimOf(canon) : null;
      const unitRaw = def.unit !== undefined ? def.unit : (col.rawUnit || '');
      const uc = useCanonical ? Core.classifyUnit(unitRaw, dim) : { support: 'missing' };
      const conv = (uc.support === 'supported') ? (v => v == null ? null : v * uc.factor) : (v => v);
      const unit = (uc.support === 'supported') ? uc.canonical : (col.rawUnit || '');
      const vals = col.values;
      const points = []; let yMin = Infinity, yMax = -Infinity, gapCount = 0, prevX = null, broke = false;
      const emit = (row, rawY) => {
        const xv = xAt(row); if (xv == null || rawY == null) return;
        const yv = conv(rawY);
        const gap = broke || (prevX != null && (xv - prevX) > gapThresh);
        if (gap && points.length) gapCount++;
        points.push({ x: xv, y: yv, row, gap: !!gap });
        if (yv < yMin) yMin = yv; if (yv > yMax) yMax = yv; prevX = xv; broke = false;
      };
      if (!decimated) {
        for (let r = s0; r <= e0; r++) { if (vals[r] == null) { broke = true; continue; } emit(r, vals[r]); }
      } else {
        for (let b = 0; b < nBuckets; b++) {
          const rs = s0 + Math.floor(b * winN / nBuckets);
          const re = s0 + Math.floor((b + 1) * winN / nBuckets) - 1;
          let minR = -1, maxR = -1, minV = Infinity, maxV = -Infinity, any = false;
          for (let r = rs; r <= re; r++) { const v = vals[r]; if (v == null) continue; any = true; if (v < minV) { minV = v; minR = r; } if (v > maxV) { maxV = v; maxR = r; } }
          if (!any) { broke = true; continue; }
          if (minR === maxR) emit(minR, minV);
          else if (minR < maxR) { emit(minR, minV); emit(maxR, maxV); }
          else { emit(maxR, maxV); emit(minR, minV); }
        }
      }
      return { columnId, rawName: col.rawName, canonicalName: canon || null, unit, useCanonical: uc.support === 'supported', points, yMin: points.length ? yMin : null, yMax: points.length ? yMax : null, gapCount };
    });
    return { x: { kind: x.kind, name: x.name, unit: x.unit, columnId: x.columnId, factor: x.factor, full: { startRow: 0, endRow: N - 1, count: N } }, window: { startRow: s0, endRow: e0, count: winN }, decimated, bucketCount: nBuckets, lanes };
  }

  /**
   * buildLaneReaders(session, {channels, useCanonical}) — raw-row readers for the
   * interaction layer (cursor readout + selection stats). Conversion is resolved
   * HERE via the same canonical pipeline as buildCurveData (Core.classifyUnit) so
   * TelemetryInteract never re-derives sign/offset/factor itself.
   * Returns [{ columnId, rawName, canonicalName, unit, values, factor }].
   */
  function buildLaneReaders(session, opts) {
    opts = opts || {};
    const cols = session.parsed.columns;
    const useCanonical = opts.useCanonical !== false;
    return (opts.channels || []).map(function (columnId) {
      const col = cols[columnId];
      const def = session.definitions[columnId] || {};
      const canon = def.canonicalName !== undefined ? def.canonicalName : _autoCanonical(session, columnId);
      const dim = canon ? _dimOf(canon) : null;
      const unitRaw = def.unit !== undefined ? def.unit : (col.rawUnit || '');
      const uc = useCanonical ? Core.classifyUnit(unitRaw, dim) : { support: 'missing' };
      const supported = uc.support === 'supported';
      return {
        columnId: columnId, rawName: col.rawName, canonicalName: canon || null,
        unit: supported ? uc.canonical : (col.rawUnit || ''), values: col.values, factor: supported ? uc.factor : 1,
      };
    });
  }

  const api = { VEHICLE_PROFILES, profileContext, newSession, applyMappingEdit, setProfile, toCoreDefinitions, buildImportSummary, buildMappingRows, buildPreflightSummary, buildCapabilityRows, buildCurveData, buildLaneReaders };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TelemetryView = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
