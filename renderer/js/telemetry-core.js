/**
 * telemetry-core.js — shared, PURE telemetry data layer (V1 Step 1).
 *
 * UI-free / DOM-free / Electron-free / Chart-free. Used by BOTH the Electron renderer and the
 * Node CLI (tools/validate-against-telemetry.js) and the synthetic tests, so the CSV parsing,
 * unit handling, timebase analysis, channel mapping, definition grading and fail-closed preflight
 * live in ONE place instead of two.
 *
 * Scope (Step 1, data layer only): it does NOT compute yaw metrics / K_us / roll / setup advice,
 * and does NOT touch the vehicle-dynamics model. "definition_confirmed" here means the channel
 * DEFINITION is confirmed — NOT that any model or measurement is validated.
 *
 * Channel canonical names are reused from telemetry-schema.js (source-agnostic); nothing here is
 * hardcoded to Bosch/.bmsbin. A vehicle's specifics (steering ratio, signs, wheelbase…) come from
 * the caller-supplied `definitions` object, never baked in.
 */
(function (root) {
  'use strict';

  // ── reuse the canonical channel vocabulary (Node: require; renderer/vm: global) ──
  let _schema = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { _schema = require('./telemetry-schema.js'); } catch (e) { _schema = null; }
  }
  const CHANNEL_PATTERNS = (_schema && _schema.TELEMETRY_CHANNEL_PATTERNS) ||
    (typeof TELEMETRY_CHANNEL_PATTERNS !== 'undefined' ? TELEMETRY_CHANNEL_PATTERNS : {});
  const REQUIRED_FOR_CORRELATION = (_schema && _schema.TELEMETRY_REQUIRED_FOR_CORRELATION) ||
    (typeof TELEMETRY_REQUIRED_FOR_CORRELATION !== 'undefined' ? TELEMETRY_REQUIRED_FOR_CORRELATION : ['lateral_accel', 'yaw_rate', 'steering', 'speed']);

  const G = 9.81;

  // ── definition grading vocabulary (definition status ONLY; not model/measurement validation) ──
  const GRADE = { DEFINITION_CONFIRMED: 'definition_confirmed', PROVISIONAL: 'provisional', BLOCKED: 'blocked' };
  const _RANK = { blocked: 0, provisional: 1, definition_confirmed: 2 };
  function worst(...g) { return g.reduce((a, b) => (_RANK[b] < _RANK[a] ? b : a), GRADE.DEFINITION_CONFIRMED); }
  function chGrade(r) { return r.blocked && r.blocked.length ? GRADE.BLOCKED : (r.confirmed ? GRADE.DEFINITION_CONFIRMED : GRADE.PROVISIONAL); }

  // Geometry default profile (research profile only; a real session passes its own definitions).
  const F312 = { wheelbase_mm: 2800, frontTrack_mm: 1595, rearTrack_mm: 1540, steeringRatioDefault: 12.5 };

  // ── stats ──
  function median(a) { const s = a.filter(x => x != null).slice().sort((x, y) => x - y); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function linfitOrigin(x, y) { let sxx = 0, sxy = 0; for (let i = 0; i < x.length; i++) { sxx += x[i] * x[i]; sxy += x[i] * y[i]; } return sxx ? sxy / sxx : 0; }
  function linfit(x, y) {
    const n = x.length; if (n < 2) return { slope: 0, intercept: 0, r2: 0, n, slopeOrigin: 0 };
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; syy += y[i] * y[i]; }
    const d = n * sxx - sx * sx, b = d ? (n * sxy - sx * sy) / d : 0, a = (sy - b * sx) / n;
    const sst = syy - sy * sy / n; let ssr = 0; for (let i = 0; i < n; i++) { const f = a + b * x[i]; ssr += (y[i] - f) ** 2; }
    return { slope: b, intercept: a, r2: sst > 0 ? 1 - ssr / sst : 0, n, slopeOrigin: linfitOrigin(x, y) };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CSV PARSER (RFC4180-ish): quoted fields, escaped quotes (""), commas/newlines
  // inside quotes, CRLF/LF/CR, blank lines, ragged rows, missing/invalid cells.
  // ──────────────────────────────────────────────────────────────────────────
  function tokenizeCsv(text) {
    const rows = []; let field = '', row = [], inQ = false; let started = false;
    const t = text.replace(/^﻿/, ''); // strip BOM
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (inQ) {
        if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') { inQ = true; started = true; }
      else if (c === ',') { row.push(field); field = ''; started = true; }
      else if (c === '\r') { /* handled by \n or alone */ if (t[i + 1] !== '\n') { row.push(field); rows.push(row); field = ''; row = []; started = false; } }
      else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = []; started = false; }
      else { field += c; started = true; }
    }
    if (started || field.length || row.length) { row.push(field); rows.push(row); }
    // `unterminatedQuote`: a quote opened and never closed before EOF. A legal quoted field
    // (incl. multi-line) closes its quote → inQ=false here, so this only fires on a genuine
    // stray/unclosed quote that would otherwise silently swallow the rest of the file.
    return { rows, unterminatedQuote: inQ };
  }

  function _splitHeader(h) {
    const m = String(h).trim().match(/^([^\[]*?)\s*(?:\[\s*([^\]]*?)\s*\])?\s*$/);
    return { name: (m && m[1] ? m[1] : String(h)).trim(), unit: (m && m[2] ? m[2] : '').trim() };
  }

  /**
   * Parse CSV text into the rich data contract.
   * @returns {{rowCount, columns:[{rawHeader,rawName,rawUnit,values,missingCount,invalidCount}], warnings, errors}}
   */
  function parseCsv(text) {
    const warnings = [], errors = [];
    if (text == null || String(text).trim() === '') { errors.push({ code: 'EMPTY', message: 'empty input' }); return { rowCount: 0, columns: [], warnings, errors }; }
    const tokenized = tokenizeCsv(text);
    if (tokenized.unterminatedQuote) {
      // FATAL: an unclosed quote swallows every comma/newline to EOF, silently collapsing many
      // rows into one. The structure past the stray quote is unrecoverable, so we refuse to
      // return a usable dataset — the import layer must not build a session or run preflight.
      errors.push({ code: 'CSV_UNCLOSED_QUOTE', message: 'unterminated quoted field — file truncated at a stray quote; not a usable dataset' });
      return { rowCount: 0, columns: [], warnings, errors };
    }
    let rows = tokenized.rows;
    // drop fully-blank rows (single empty field), count them
    let blank = 0;
    rows = rows.filter(r => { const empty = r.length === 1 && r[0].trim() === ''; if (empty) blank++; return !empty; });
    if (blank) warnings.push({ code: 'BLANK_ROWS', message: `${blank} blank row(s) skipped`, count: blank });
    if (!rows.length) { errors.push({ code: 'NO_ROWS', message: 'no rows' }); return { rowCount: 0, columns: [], warnings, errors }; }
    const header = rows[0];
    const ncol = header.length;
    // duplicate header detection
    const seen = new Map();
    const cols = header.map((h, j) => {
      const { name, unit } = _splitHeader(h);
      const key = name.toLowerCase();
      if (seen.has(key)) warnings.push({ code: 'DUP_HEADER', message: `duplicate header "${name}" (columns ${seen.get(key)} & ${j})`, name });
      else seen.set(key, j);
      return { rawHeader: h, rawName: name, rawUnit: unit, values: [], missingCount: 0, invalidCount: 0 };
    });
    let rowCount = 0, ragged = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length !== ncol) { ragged++; }
      rowCount++;
      for (let j = 0; j < ncol; j++) {
        const raw = j < r.length ? r[j] : undefined;
        const col = cols[j];
        if (raw === undefined || raw === null || String(raw).trim() === '') { col.values.push(null); col.missingCount++; continue; }
        const v = Number(String(raw).trim());
        if (Number.isFinite(v)) col.values.push(v);
        else { col.values.push(null); col.invalidCount++; }
      }
    }
    if (ragged) warnings.push({ code: 'RAGGED_ROWS', message: `${ragged} row(s) had a column-count mismatch (padded/truncated to ${ncol})`, count: ragged, expected: ncol });
    return { rowCount, columns: cols, warnings, errors };
  }

  /** Adapter → legacy column-map shape {data, units, n, channels} (lowercased names). */
  function columnMap(parsed) {
    const data = {}, units = {}; const channels = [];
    for (const c of parsed.columns) { const k = c.rawName.toLowerCase(); data[k] = c.values; units[k] = (c.rawUnit || '').toLowerCase(); channels.push(k); }
    return { data, units, n: parsed.rowCount, channels };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UNITS — only explicitly-known units; unknown is never guessed.
  // ──────────────────────────────────────────────────────────────────────────
  const UNIT_DIMENSIONS = {
    time:         { canonical: 's',     units: { s: 1, sec: 1, second: 1, ms: 0.001, msec: 0.001 } },
    speed:        { canonical: 'm/s',   units: { 'm/s': 1, mps: 1, 'km/h': 1 / 3.6, kmh: 1 / 3.6, kph: 1 / 3.6, mph: 0.44704 } },
    angle:        { canonical: 'rad',   units: { rad: 1, deg: Math.PI / 180, degree: Math.PI / 180, '°': Math.PI / 180 } },
    angular_rate: { canonical: 'rad/s', units: { 'rad/s': 1, 'deg/s': Math.PI / 180, 'degs': Math.PI / 180, 'dps': Math.PI / 180 } },
    acceleration: { canonical: 'm/s2',  units: { 'm/s2': 1, 'm/s^2': 1, 'm/s²': 1, g: G, gee: G } },
    displacement: { canonical: 'm',     units: { m: 1, mm: 0.001, cm: 0.01 } },
  };
  function _normUnit(u) { return String(u == null ? '' : u).trim().toLowerCase().replace(/\s+/g, ''); }
  /** classifyUnit(rawUnit[, dimension]) → {support:'supported'|'unsupported'|'missing', dimension, canonical, factor} */
  function classifyUnit(rawUnit, dimension) {
    const u = _normUnit(rawUnit);
    if (!u) return { support: 'missing', dimension: dimension || null, canonical: null, factor: null };
    const dims = dimension ? [dimension] : Object.keys(UNIT_DIMENSIONS);
    for (const d of dims) { const def = UNIT_DIMENSIONS[d]; if (def && def.units[u] !== undefined) return { support: 'supported', dimension: d, canonical: def.canonical, factor: def.units[u] }; }
    return { support: 'unsupported', dimension: dimension || null, canonical: null, factor: null };
  }
  function convertToCanonical(value, rawUnit, dimension) { const c = classifyUnit(rawUnit, dimension); if (c.support !== 'supported' || value == null) return null; return value * c.factor; }
  // direct converters used by the CLI's measured-* (kept consistent with prior behaviour)
  function toMs(unit, x) { unit = _normUnit(unit); if (unit.includes('m/s') || unit === 'mps') return x; if (unit.includes('mph')) return x * 0.44704; return x / 3.6; }
  function toG(unit, x) { unit = _normUnit(unit); if (unit.includes('m/s')) return x / G; return x; }
  function yawToRadS(unit, x) { unit = _normUnit(unit); if (unit.includes('deg')) return x * Math.PI / 180; return x; }

  // ──────────────────────────────────────────────────────────────────────────
  // TIMEBASE — distinguishes GLOBAL timestamp reset (blocker) from LAP-timer reset (normal).
  // Consumes the legacy column-map shape (use columnMap(parseCsv(...))).
  // ──────────────────────────────────────────────────────────────────────────
  const _TIME_COLS = ['time', 'xtime', 't', 'timestamp'];
  const _LAP_COLS = ['laptime', 'laptime_', 'laptrig', 'lapno', 'lap', 'lapindex', 'lapctr', 'lapdist'];
  function timebaseReport(tel) {
    let timeCol = null, timeName = null;
    for (const n of _TIME_COLS) if (Array.isArray(tel.data[n])) { timeCol = tel.data[n]; timeName = n; break; }
    const perCh = tel.channels.map(name => {
      const a = tel.data[name]; let first = null, last = null, cnt = 0, miss = 0;
      for (let i = 0; i < a.length; i++) { if (a[i] == null) miss++; else { cnt++; if (first == null) first = i; last = i; } }
      return { name, count: cnt, missingRatio: +(miss / Math.max(1, a.length)).toFixed(3), first, last };
    });
    let dt = null, monotonic = true, dups = 0, resets = 0, gaps = 0, sampleRateHz = null;
    if (timeCol) {
      const dts = [];
      for (let i = 1; i < timeCol.length; i++) { if (timeCol[i] == null || timeCol[i - 1] == null) continue; const d = timeCol[i] - timeCol[i - 1]; if (d === 0) { dups++; continue; } if (d < 0) { resets++; monotonic = false; continue; } dts.push(d); }
      dts.sort((a, b) => a - b); const med = dts[dts.length >> 1] || 0; for (const d of dts) if (med > 0 && d > 3 * med) gaps++;
      dt = { median: +med.toFixed(6), min: +(dts[0] || 0).toFixed(6), max: +(dts[dts.length - 1] || 0).toFixed(6), n: dts.length };
      if (med > 0) sampleRateHz = +(1 / med).toFixed(2);
    }
    // lap-timer resets (informational only — these are NORMAL, not a sync blocker)
    let lapResets = 0, lapName = null;
    for (const n of _LAP_COLS) { if (Array.isArray(tel.data[n])) { const a = tel.data[n]; let lr = 0; for (let i = 1; i < a.length; i++) { if (a[i] != null && a[i - 1] != null && a[i] < a[i - 1]) lr++; } if (lr) { lapResets += lr; lapName = lapName || n; } } }

    // `reason` = English text (kept stable for the CLI / validate-against-telemetry + self-test).
    // `reasonCodes` = a PARALLEL [{code,params,message}] list (same entries/order) for the UI to
    // localize. addReason() appends to both so they never drift; grade-affecting logic is unchanged.
    let status = GRADE.DEFINITION_CONFIRMED; const reason = [], reasonCodes = [];
    const addReason = (msg, code, params) => { reason.push(msg); reasonCodes.push({ code, params: params || {}, message: msg }); };
    if (!timeCol) { status = GRADE.PROVISIONAL; addReason('no time column — assuming rows are ordered co-samples', 'TB_NO_TIME'); }
    if (resets > 0) { status = GRADE.BLOCKED; addReason(`${resets} GLOBAL timestamp reset(s) — synchronization blocked`, 'TB_RESET', { n: resets }); }
    if (dups > 0 && status !== GRADE.BLOCKED) { status = GRADE.PROVISIONAL; addReason(`${dups} duplicate timestamp(s)`, 'TB_DUP', { n: dups }); }
    if (gaps > 0 && status !== GRADE.BLOCKED) { status = (status === GRADE.DEFINITION_CONFIRMED ? GRADE.PROVISIONAL : status); addReason(`${gaps} large gap(s)`, 'TB_GAP', { n: gaps }); }
    if (lapResets > 0) addReason(`${lapResets} lap-timer reset(s) on "${lapName}" (normal — not a sync blocker)`, 'TB_LAP_RESET', { n: lapResets, name: lapName });
    return { hasTime: !!timeCol, timeName, dt, sampleRateHz, monotonic, dups, resets, gaps, lapResets, lapName, perCh, status, reason, reasonCodes };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CHANNEL MAPPING (schema-based) — exact/alias auto; broad/ambiguous NOT auto-confirmed;
  // unknown preserved. User `definitions` can confirm a channel (→ definition_confirmed).
  // ──────────────────────────────────────────────────────────────────────────
  function _isAnchored(re) { const s = re.source; return s.startsWith('^') && s.endsWith('$'); }
  function _matchCanonicals(rawName) {
    const out = [];
    for (const canon of Object.keys(CHANNEL_PATTERNS)) {
      for (const re of CHANNEL_PATTERNS[canon]) { if (re.test(rawName)) { out.push({ canon, anchored: _isAnchored(re) }); break; } }
    }
    return out;
  }
  /**
   * mapChannels(parsed, definitions) → per-column mapping report.
   * definitions.channels[canonicalName] = { confirmed:true, unit, sign, offset, meaning, ... } (optional user overrides)
   */
  function mapChannels(parsed, definitions) {
    const defs = (definitions && definitions.channels) || {};
    return parsed.columns.map(col => {
      const raw = col.rawName;
      const matches = _matchCanonicals(raw);
      let canonicalName = null, matchType = 'none', confidence = 'unknown', basis = 'unknown';
      if (matches.length === 0) { matchType = 'none'; }
      else if (matches.length > 1) { matchType = 'ambiguous'; confidence = 'low'; canonicalName = null; }
      else { canonicalName = matches[0].canon; if (matches[0].anchored) { matchType = 'exact'; confidence = 'high'; basis = 'exact_dictionary_match'; } else { matchType = 'alias'; confidence = 'medium'; basis = 'alias_match'; } }
      // user override / confirmation
      let status = GRADE.PROVISIONAL;
      const userDef = canonicalName && defs[canonicalName];
      if (userDef && userDef.confirmed === true) { status = GRADE.DEFINITION_CONFIRMED; basis = 'user_confirmed'; confidence = 'high'; }
      else if (matchType === 'none') { status = 'unknown'; basis = 'csv_header'; }
      else if (matchType === 'ambiguous') { status = GRADE.PROVISIONAL; }
      // a clean auto-map is provisional (not definition_confirmed) until a user confirms semantics
      return { rawName: raw, rawUnit: col.rawUnit || '', canonicalName, matchType, confidence, status, basis, candidates: matches.map(m => m.canon) };
    });
  }

  // ── config-driven channel resolution (for the CLI's measured-* — config supplies definitions) ──
  const SPEC = {
    speed: { unitField: 'unit', knownUnits: ['km/h', 'kmh', 'm/s', 'mph'], defFields: ['source'], defaults: { source: 'unknown' } },
    steer: { unitField: 'unit', knownUnits: ['deg', 'rad'], defFields: ['meaning', 'sign', 'offset_deg', 'steering_ratio', 'ratio_definition', 'front_angle_basis'], defaults: { meaning: 'steering_wheel_angle', sign: 1, offset_deg: 0, steering_ratio: F312.steeringRatioDefault, ratio_definition: 'wheel_per_roadwheel', front_angle_basis: 'bicycle_equivalent' } },
    accy: { unitField: 'unit', knownUnits: ['g', 'm/s'], defFields: ['sign', 'offset', 'gravity_compensated'], defaults: { sign: 1, offset: 0, gravity_compensated: true } },
    yaw: { unitField: 'unit', knownUnits: ['deg/s', 'deg', 'rad/s', 'rad'], defFields: ['is_rate', 'sign', 'offset'], defaults: { is_rate: true, sign: 1, offset: 0 } },
    damper: { unitField: 'unit', knownUnits: ['mm'], defFields: ['meaning', 'sign', 'zero'], defaults: { meaning: 'damper_displacement', sign: 1, zero: 0 } },
  };
  function resolveChannel(cfg, tel, key, defaultCol, spec) {
    const c = (cfg.channels && cfg.channels[key]) || {};
    const column = String(c.column || defaultCol).toLowerCase();
    const r = { key, column, present: Array.isArray(tel.data[column]), arr: tel.data[column] || null, assumed: [], blocked: [], val: {} };
    if (!r.present) { r.blocked.push(`channel column "${column}" missing from CSV`); r.confirmed = false; return r; }
    let unit = (c[spec.unitField] !== undefined ? c[spec.unitField] : tel.units[column] || '').toString().toLowerCase().replace(/\s/g, '');
    r.unit = unit; r.unitFromConfig = c[spec.unitField] !== undefined;
    r.unitKnown = !!unit && spec.knownUnits.some(u => unit.includes(u));
    if (!unit) r.blocked.push(`${key} unit unknown (no [unit] in header and none in config)`);
    else if (!r.unitKnown) r.blocked.push(`${key} unit "${unit}" not recognised`);
    if (!r.unitFromConfig) r.assumed.push('unit');
    for (const f of spec.defFields) { if (c[f] === undefined) r.assumed.push(f); r.val[f] = (c[f] !== undefined ? c[f] : spec.defaults[f]); }
    r.confirmed = c.confirmed === true && r.blocked.length === 0 && r.assumed.length === 0;
    return r;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PREFLIGHT — fail-closed. Reports definition status + which analyses COULD run.
  // Does NOT compute any analysis. measured K_us / body roll / setup advice are pinned blocked.
  // ──────────────────────────────────────────────────────────────────────────
  function runTelemetryPreflight(parsed, definitions, options) {
    options = options || {};
    const tel = columnMap(parsed);
    const tb = timebaseReport(tel);
    const channelReports = mapChannels(parsed, definitions).map(m => {
      const dim = _canonDimension(m.canonicalName);
      const unitClass = classifyUnit(m.rawUnit, dim);
      return Object.assign({}, m, { unitDimension: dim, unitSupport: unitClass.support, unitCanonical: unitClass.canonical });
    });
    const present = {}; channelReports.forEach(c => { if (c.canonicalName) present[c.canonicalName] = c; });

    // Diagnostics are emitted as {code, params, message}: `code`+`params` let the UI localize,
    // `message` is the English fallback. Entry COUNT/ORDER is identical to the prior string version
    // (parser carries its own code; timebase reuses tb.reasonCodes 1:1 with tb.reason), so
    // blockers.length / assumptions.length — and therefore the grade — are unchanged.
    const blockers = [], assumptions = [], warnings = [];
    (parsed.warnings || []).forEach(w => warnings.push({ code: w.code || 'WARNING', params: { count: w.count, name: w.name, expected: w.expected }, message: w.message || String(w) }));
    (parsed.errors || []).forEach(e => blockers.push({ code: e.code || 'ERROR', params: {}, message: e.message || String(e) }));
    if (tb.status === GRADE.BLOCKED) blockers.push(...tb.reasonCodes);
    else if (tb.status === GRADE.PROVISIONAL) assumptions.push(...tb.reasonCodes);

    // required-for-correlation channels
    for (const req of REQUIRED_FOR_CORRELATION) {
      const c = present[req];
      if (!c) { /* missing → only blocks the analyses that need it, recorded in availableAnalyses */ continue; }
      if (c.unitSupport === 'unsupported') blockers.push({ code: 'REQ_UNIT_UNSUPPORTED', params: { req, unit: c.rawUnit }, message: `${req} unit "${c.rawUnit}" not recognised` });
      else if (c.unitSupport === 'missing') assumptions.push({ code: 'REQ_UNIT_MISSING', params: { req }, message: `${req} unit not declared (header has no [unit])` });
      if (c.status !== GRADE.DEFINITION_CONFIRMED) assumptions.push({ code: 'REQ_NOT_CONFIRMED', params: { req, rawName: c.rawName, matchType: c.matchType }, message: `${req} mapping "${c.rawName}→${req}" not user-confirmed (${c.matchType})` });
    }
    channelReports.filter(c => c.matchType === 'ambiguous').forEach(c => warnings.push({ code: 'CH_AMBIGUOUS', params: { rawName: c.rawName, candidates: c.candidates.join('/') }, message: `channel "${c.rawName}" is ambiguous (${c.candidates.join('/')}) — left unmapped` }));

    const numericChannels = channelReports.filter(c => tel.data[c.rawName.toLowerCase()] && tel.data[c.rawName.toLowerCase()].some(v => v != null)).length;
    const yawReqPresent = REQUIRED_FOR_CORRELATION.every(req => present[req]);
    const yawUnitsOk = REQUIRED_FOR_CORRELATION.every(req => present[req] && present[req].unitSupport !== 'unsupported');

    const availableAnalyses = {
      synchronizedCurves: tb.status !== GRADE.BLOCKED && numericChannels >= 1,
      observedYawResponse: tb.status !== GRADE.BLOCKED && yawReqPresent && yawUnitsOk, // future-condition only; metrics NOT implemented in Step 1
      measuredKus: false,            // fail-closed (not identifiable from this telemetry)
      bodyRollGradient: false,       // blocked until damper sign/zero/MR scale chain is closed
      setupRecommendation: false,    // blocked
    };

    // RL2 positive-evidence rule: the OVERALL grade must never reach definition_confirmed with
    // ZERO confirmed definitions. A clean timebase + purely auto-mapped / unknown-only columns is
    // NOT positive evidence — it stays provisional. (worst()'s seed stays DEFINITION_CONFIRMED: it
    // is the "take the lowest rank" identity; lowering the seed would clamp every result.)
    // NOTE (deferred contract-tightening): "≥1 confirmed channel" still lets a single confirmed
    // channel unrelated to any enabled capability lift the top grade; a stricter "≥1 confirmed
    // capability-input set" rule is left for a follow-up, per review.
    const hasDefinitionConfirmedEvidence = channelReports.some(c => c.status === GRADE.DEFINITION_CONFIRMED);
    let top = blockers.length ? GRADE.BLOCKED : (assumptions.length ? GRADE.PROVISIONAL : GRADE.DEFINITION_CONFIRMED);
    if (top === GRADE.DEFINITION_CONFIRMED && !hasDefinitionConfirmedEvidence) top = GRADE.PROVISIONAL;
    const grade = worst(tb.status, top);
    return { grade, blockers, assumptions, warnings, channelReports, timebaseReport: tb, availableAnalyses };
  }

  const _CANON_DIM = {
    speed: 'speed', steering: 'angle', yaw_rate: 'angular_rate', lateral_accel: 'acceleration', longitudinal_accel: 'acceleration',
    damper_fl: 'displacement', damper_fr: 'displacement', damper_rl: 'displacement', damper_rr: 'displacement',
    ride_height_front: 'displacement', ride_height_rear: 'displacement',
    wheel_speed_fl: 'speed', wheel_speed_fr: 'speed', wheel_speed_rl: 'speed', wheel_speed_rr: 'speed',
  };
  function _canonDimension(canon) { return canon ? (_CANON_DIM[canon] || null) : null; }

  const api = {
    G, GRADE, F312, SPEC, CHANNEL_PATTERNS, REQUIRED_FOR_CORRELATION, UNIT_DIMENSIONS,
    worst, chGrade, median, linfit, linfitOrigin,
    tokenizeCsv, parseCsv, columnMap,
    classifyUnit, convertToCanonical, toMs, toG, yawToRadS,
    timebaseReport, mapChannels, resolveChannel, runTelemetryPreflight,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TelemetryCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
