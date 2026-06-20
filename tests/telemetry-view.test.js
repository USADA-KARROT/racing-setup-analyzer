/**
 * tests/telemetry-view.test.js — synthetic tests for the pure view-model layer (V1 Step 2A).
 * No DOM, no real CSV, no model. Run: node tests/telemetry-view.test.js
 */
'use strict';
const Core = require('../renderer/js/telemetry-core.js');
const V = require('../renderer/js/telemetry-view.js');
let pass = 0, fail = 0;
const chk = (n, cond, d) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

console.log('=== telemetry-view synthetic tests ===');

const CSV = 'time[s],speed[km/h],steer[deg],accy[g],yaw[deg/s]\n0,100,-5,0.5,20\n0.05,101,-5.1,0.52,21\n0.10,102,-5.2,0.54,22';
const parsed = Core.parseCsv(CSV);
const session = V.newSession('session.csv', parsed, 'custom');
// columns: 0=time 1=speed 2=steer 3=accy 4=yaw

// ── import summary ──
(() => {
  const s = V.buildImportSummary(session);
  chk('import: fileName', s.fileName === 'session.csv');
  chk('import: rowCount/columnCount', s.rowCount === 3 && s.columnCount === 5, { r: s.rowCount, c: s.columnCount });
  chk('import: sampleRate ≈20', Math.abs(s.sampleRateHz - 20) < 0.5, s.sampleRateHz);
  chk('import: hasTime + duration', s.hasTime && Math.abs(s.timeRange.duration - 0.10) < 1e-6, s.timeRange);
  chk('import: profile=custom empty', s.profile.id === 'custom' && s.profile.rows.length === 0);
})();

// ── vehicle profile context ──
(() => {
  const f = V.profileContext('f312_research');
  chk('profile: f312 has rows', f.rows.length > 0);
  const sr = f.rows.find(r => r.key === 'steering_ratio');
  chk('profile: steering_ratio documented 12.5', sr && sr.value === 12.5 && sr.provenance === 'documented');
  const cg = f.rows.find(r => r.key === 'cg_height_mm');
  chk('profile: cg_height unavailable + value null', cg && cg.provenance === 'unavailable' && cg.value === null && cg.available === false);
  chk('profile: custom empty', V.profileContext('custom').rows.length === 0);
})();

// ── mapping rows (auto-map presentation) ──
(() => {
  const rows = V.buildMappingRows(session);
  chk('map: 5 rows', rows.length === 5);
  const accy = rows[3];
  chk('map: accy→lateral_accel exact provisional', accy.autoCanonical === 'lateral_accel' && accy.matchType === 'exact' && accy.status === Core.GRADE.PROVISIONAL && accy.confirmed === false, { c: accy.autoCanonical, s: accy.status });
  const speed = rows[1];
  chk('map: speed raw→canonical km/h→m/s sample', speed.unitSample && speed.unitSample.canonicalUnit === 'm/s' && Math.abs(speed.unitSample.canonical - 100 / 3.6) < 1e-3, speed.unitSample);
  const time = rows[0];
  chk('map: time unmapped/unknown preserved', time.autoCanonical === null && time.status === 'unknown' && time.rawName === 'time');
})();

// ── user edit: confirm a channel ──
(() => {
  const s2 = V.applyMappingEdit(session, 3, { canonicalName: 'lateral_accel', confirmed: true });
  chk('edit: immutable (orig unchanged)', !session.definitions[3]);
  const core = V.toCoreDefinitions(s2);
  chk('edit: confirmed → core definitions includes lateral_accel', core.channels.lateral_accel && core.channels.lateral_accel.confirmed === true, core.channels);
  const row = V.buildMappingRows(s2)[3];
  chk('edit: confirmed row status=definition_confirmed', row.status === Core.GRADE.DEFINITION_CONFIRMED && row.confirmed === true, row.status);
})();

// ── confirmation invalidation: changing a param after confirm clears confirmed ──
(() => {
  const s2 = V.applyMappingEdit(session, 3, { canonicalName: 'lateral_accel', confirmed: true });
  const s3 = V.applyMappingEdit(s2, 3, { unit: 'm/s2' });
  chk('invalidation: unit change clears prior confirmation', s3.definitions[3].confirmed === false, s3.definitions[3]);
  // but a non-param change (none here) or explicit re-confirm keeps it
  const s4 = V.applyMappingEdit(s3, 3, { confirmed: true });
  chk('invalidation: explicit re-confirm restores', s4.definitions[3].confirmed === true);
})();

// ── profile must NOT auto-confirm any CSV channel ──
(() => {
  const sp = V.setProfile(session, 'f312_research');
  chk('profile: setProfile changes id only', sp.profileId === 'f312_research');
  chk('profile: no channel auto-confirmed', Object.keys(V.toCoreDefinitions(sp).channels).length === 0);
  chk('profile: mapping rows still unconfirmed', V.buildMappingRows(sp).every(r => r.confirmed === false));
})();

// ── preflight summary + capabilities ──
(() => {
  let pf = V.buildPreflightSummary(session);
  chk('preflight: auto-only → provisional', pf.grade === Core.GRADE.PROVISIONAL, pf.grade);

  // confirm all 4 required channels
  let s = session;
  s = V.applyMappingEdit(s, 1, { confirmed: true }); // speed
  s = V.applyMappingEdit(s, 2, { confirmed: true }); // steer→steering
  s = V.applyMappingEdit(s, 3, { confirmed: true }); // accy→lateral_accel
  s = V.applyMappingEdit(s, 4, { confirmed: true }); // yaw→yaw_rate
  pf = V.buildPreflightSummary(s);
  chk('preflight: all required confirmed → definition_confirmed', pf.grade === Core.GRADE.DEFINITION_CONFIRMED, { g: pf.grade, a: pf.assumptions, b: pf.blockers });

  const caps = V.buildCapabilityRows(s);
  const byKey = Object.fromEntries(caps.map(c => [c.key, c]));
  chk('caps: observedYawResponse available', byKey.observedYawResponse.available === true);
  chk('caps: K_us blocked', byKey.measuredKus.available === false && byKey.measuredKus.reasonKey === 'ui.telem.cap.reason.kus');
  chk('caps: bodyRoll blocked', byKey.bodyRollGradient.available === false);
  chk('caps: setupRecommendation blocked', byKey.setupRecommendation.available === false);
})();

// ── buildCurveData (V1 Step 3-i): pure curve-data prep ──
(() => {
  // 1. no decimation when rows <= target
  let cd = V.buildCurveData(session, { channels: [1], targetPoints: 1000 });
  chk('curve: no-decimation when small', cd.decimated === false && cd.lanes[0].points.length === 3, { d: cd.decimated, n: cd.lanes[0].points.length });
  chk('curve: x.full references full data', cd.x.full.count === 3 && cd.x.kind === 'time' && cd.x.unit === 's');

  // 2. canonical conversion (km/h → m/s)
  cd = V.buildCurveData(session, { channels: [1] }); // speed default canonical
  chk('curve: canonical unit m/s', cd.lanes[0].unit === 'm/s' && cd.lanes[0].useCanonical === true, cd.lanes[0].unit);
  chk('curve: canonical y converted', Math.abs(cd.lanes[0].points[0].y - 100 / 3.6) < 1e-3, cd.lanes[0].points[0].y);

  // 3. decimation + min/max peak preservation
  let big = 'time[s],val\n'; for (let i = 0; i < 2000; i++) big += (i * 0.05).toFixed(2) + ',' + (i === 1370 ? 9999 : i) + '\n';
  const bs = V.newSession('big.csv', Core.parseCsv(big), 'custom');
  cd = V.buildCurveData(bs, { channels: [1], targetPoints: 100, useCanonical: false });
  const allY = cd.lanes[0].points.map(p => p.y);
  chk('curve: decimated when large', cd.decimated === true && cd.bucketCount === 100, { d: cd.decimated, b: cd.bucketCount });
  chk('curve: decimation reduces points', cd.lanes[0].points.length < 2000 && cd.lanes[0].points.length > 0, cd.lanes[0].points.length);
  chk('curve: peak (min & max) preserved', Math.min(...allY) === 0 && Math.max(...allY) === 9999, { mn: Math.min(...allY), mx: Math.max(...allY) });
  chk('curve: no false gaps on continuous data', cd.lanes[0].gapCount === 0, cd.lanes[0].gapCount);

  // 4. gap-break on null
  const gp = V.newSession('g.csv', Core.parseCsv('time[s],speed[km/h]\n0,100\n0.05,\n0.10,102'), 'custom');
  cd = V.buildCurveData(gp, { channels: [1] });
  chk('curve: null skipped, next point flagged gap', cd.lanes[0].points.length === 2 && cd.lanes[0].points[1].gap === true, cd.lanes[0].points);

  // 5. shared x-alignment across channels
  cd = V.buildCurveData(session, { channels: [1, 2] });
  chk('curve: lanes share x alignment', cd.lanes[0].points.length === cd.lanes[1].points.length && cd.lanes[0].points[0].x === cd.lanes[1].points[0].x);

  // 6. window narrows view but full is preserved
  cd = V.buildCurveData(session, { channels: [1], xWindow: { startRow: 1, endRow: 2 } });
  chk('curve: window count + full preserved', cd.window.count === 2 && cd.x.full.count === 3 && cd.lanes[0].points[0].row === 1, { w: cd.window, f: cd.x.full });
})();

// ── buildLaneReaders (V1 Step 3-iii-b: cursor/selection raw readers) ──
(() => {
  const r = V.buildLaneReaders(session, { channels: [1, 3], useCanonical: true });
  chk('readers: count + raw values referenced', r.length === 2 && r[0].values.length === 3 && r[0].values[0] === 100);
  chk('readers: canonical factor km/h→m/s', r[0].canonicalName === 'speed' && r[0].unit === 'm/s' && Math.abs(r[0].factor - 1 / 3.6) < 1e-6, { c: r[0].canonicalName, u: r[0].unit, f: r[0].factor });
  chk('readers: accy g→m/s2 factor', r[1].unit === 'm/s2' && Math.abs(r[1].factor - 9.81) < 0.02, r[1]);
  const raw = V.buildLaneReaders(session, { channels: [1], useCanonical: false });
  chk('readers: raw mode → factor 1, raw unit', raw[0].factor === 1 && raw[0].unit === 'km/h', raw[0]);
})();

// ── i18n-csv dictionary integrity (3-language alignment; interpolation placeholders preserved) ──
(() => {
  const { CSV_I18N } = require('../renderer/js/i18n-csv.js');
  const ek = Object.keys(CSV_I18N.en).sort(), zk = Object.keys(CSV_I18N.zh).sort(), jk = Object.keys(CSV_I18N.ja).sort();
  chk('i18n: en/zh key sets identical', JSON.stringify(ek) === JSON.stringify(zk), { onlyEn: ek.filter(k => !(k in CSV_I18N.zh)), onlyZh: zk.filter(k => !(k in CSV_I18N.en)) });
  chk('i18n: en/ja key sets identical', JSON.stringify(ek) === JSON.stringify(jk), { onlyEn: ek.filter(k => !(k in CSV_I18N.ja)), onlyJa: jk.filter(k => !(k in CSV_I18N.en)) });
  chk('i18n: no empty values in any language', ['en', 'zh', 'ja'].every(l => Object.values(CSV_I18N[l]).every(v => typeof v === 'string' && v.length > 0)));
  const need = ['ui.telem.grade.definition_confirmed', 'ui.telem.grade.blocked', 'ui.telem.match.exact', 'ui.telem.sum.ch', 'ui.telem.plot.row', 'ui.telem.profile.custom', 'ui.telem.cap.measuredKus', 'ui.telem.cap.reason.kus', 'ui.telem.cap.reason.channelsMissing', 'ui.telem.diag.CSV_UNCLOSED_QUOTE', 'ui.telem.diag.TB_RESET', 'ui.telem.diag.REQ_NOT_CONFIRMED'];
  chk('i18n: all batch-2 keys present in 3 languages', need.every(k => CSV_I18N.en[k] && CSV_I18N.zh[k] && CSV_I18N.ja[k]), need.filter(k => !(CSV_I18N.en[k] && CSV_I18N.zh[k] && CSV_I18N.ja[k])));
  chk('i18n: param placeholders preserved across languages', ['en', 'zh', 'ja'].every(l => /\{count\}/.test(CSV_I18N[l]['ui.telem.diag.BLANK_ROWS']) && /\{n\}/.test(CSV_I18N[l]['ui.telem.diag.TB_RESET']) && /\{name\}/.test(CSV_I18N[l]['ui.telem.diag.DUP_HEADER'])));
})();

// ── batch-2 view-model output: language-neutral keys + structured (localizable) diagnostics ──
(() => {
  const caps = V.buildCapabilityRows(session);
  const byKey = Object.fromEntries(caps.map(c => [c.key, c]));
  chk('caps: labelKey is an i18n key (not English text)', byKey.synchronizedCurves.labelKey === 'ui.telem.cap.synchronizedCurves');
  chk('caps: blocked reasonKey is an i18n key', byKey.measuredKus.reasonKey === 'ui.telem.cap.reason.kus');
  // import-summary warnings are structured {code, params, message} (NOT a pre-joined English string)
  const imp = V.buildImportSummary(V.newSession('x.csv', Core.parseCsv('a,b\n1,2,3\n4,5'), 'custom'));
  chk('import: warnings carry code + message (structured)', imp.warnings.length > 0 && imp.warnings[0].code === 'RAGGED_ROWS' && typeof imp.warnings[0].message === 'string');
  // preflight diagnostics are structured {code, params, message}: fatal CSV → blocker carries the code
  const bad = Core.runTelemetryPreflight(Core.parseCsv('time,v\n0,1\n2,"oops'), {}, {});
  chk('preflight: blocker carries CSV_UNCLOSED_QUOTE code', bad.blockers.some(b => b && b.code === 'CSV_UNCLOSED_QUOTE'));
  // timebase reset → blocker carries TB_RESET + structured params (for interpolation)
  const rst = Core.runTelemetryPreflight(Core.parseCsv('time[s],v\n0,1\n0.1,2\n0.05,3'), {}, {});
  chk('preflight: reset blocker carries TB_RESET + n param', rst.blockers.some(b => b && b.code === 'TB_RESET' && b.params && b.params.n >= 1), rst.blockers);
})();

// ── batch-2 telemDiag contract + adversarial i18n coverage (mirror of index.html telemDiag; keep in sync) ──
(() => {
  const { CSV_I18N } = require('../renderer/js/i18n-csv.js');
  const mkTelemDiag = (lang) => {
    const t = (k) => (CSV_I18N[lang] && CSV_I18N[lang][k] != null) ? CSV_I18N[lang][k] : (CSV_I18N.en[k] != null ? CSV_I18N.en[k] : k);
    return (d) => { if (d == null) return ''; if (typeof d === 'string') return d; const code = d.code || ''; const key = 'ui.telem.diag.' + code; const tpl = t(key);
      const base = (tpl !== key) ? tpl : (d.message || code || t('ui.telem.diag.WARNING')); const p = d.params || {};
      return base.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? String(p[k]) : m)); };
  };
  const diagZh = mkTelemDiag('zh');
  chk('telemDiag: localized + param interpolated', /3/.test(diagZh({ code: 'TB_RESET', params: { n: 3 } })) && /重置|封鎖/.test(diagZh({ code: 'TB_RESET', params: { n: 3 } })));
  chk('telemDiag: unknown code → English message fallback', diagZh({ code: 'NOPE_XYZ', params: {}, message: 'raw english' }) === 'raw english');
  chk('telemDiag: unknown code + no message → code fallback', diagZh({ code: 'WEIRD' }) === 'WEIRD');
  chk('telemDiag: missing {param} kept verbatim (not silently blanked)', diagZh({ code: 'TB_RESET', params: {} }).includes('{n}'));
  // adversarial: trigger every diagnostic code the core can emit; zh AND ja localize with no key/placeholder leftover
  const codes = [];
  ['time,v\n0,1\n2,"oops', '', 'a,b\n1,2,3\n4,5', 'speed,speed\n1,2', 'a,b\n\n1,2\n3,4', 'time[s],v\n0,1\n0.1,2\n0.05,3', 'time[s],v\n0,1\n0,2\n0.1,3', 'v\n1\n2\n3', 'time[s],speed[furlongs],steer[deg],accy[g],yaw[deg/s]\n0,1,2,3,4\n0.1,1,2,3,4', 'time[s],yaw_steer\n0,1\n0.1,2'].forEach(csv => {
    const pf = Core.runTelemetryPreflight(Core.parseCsv(csv), {}, {});
    [].concat(pf.blockers, pf.assumptions, pf.warnings).forEach(d => { if (d) codes.push(d); });
  });
  chk('adversarial: codes were actually triggered', codes.length >= 8, codes.length);
  ['zh', 'ja'].forEach(lang => { const diag = mkTelemDiag(lang); codes.forEach(d => {
    const out = diag(d);
    chk('telemDiag[' + lang + '] no key/placeholder leftover for ' + d.code, !!out && !out.includes('ui.telem.') && !/\{\w+\}/.test(out), { code: d.code, out });
  }); });
})();

console.log(`telemetry-view: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
