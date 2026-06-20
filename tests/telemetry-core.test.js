/**
 * tests/telemetry-core.test.js — synthetic tests for the shared telemetry data core (V1 Step 1).
 * Pure: no UI, no real CSV, no model. Run: node tests/telemetry-core.test.js
 */
'use strict';
const C = require('../renderer/js/telemetry-core.js');
let pass = 0, fail = 0;
const chk = (n, cond, d) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const near = (a, b, e = 1e-6) => a != null && Math.abs(a - b) <= e;

console.log('=== telemetry-core synthetic tests ===');

// ── CSV parsing ──
(() => {
  let p = C.parseCsv('a,b\n1,2\n3,4');
  chk('csv: basic rowCount', p.rowCount === 2, p.rowCount);
  chk('csv: basic columns', p.columns.length === 2);
  chk('csv: basic values', p.columns[0].values[0] === 1 && p.columns[1].values[1] === 4);

  p = C.parseCsv('a,b\n"1","2"');
  chk('csv: quoted numeric', p.columns[0].values[0] === 1 && p.columns[1].values[0] === 2);

  p = C.parseCsv('name,val\n"x,y",3');
  chk('csv: comma inside quotes keeps 2 cols', p.columns.length === 2, p.columns.length);
  chk('csv: quoted-comma value parsed', p.columns[1].values[0] === 3);
  chk('csv: non-numeric → invalid', p.columns[0].values[0] === null && p.columns[0].invalidCount === 1);

  p = C.parseCsv('v\n"a""b"');
  chk('csv: escaped quote keeps one field', p.columns.length === 1);

  const lf = C.parseCsv('a,b\n1,2\n3,4');
  const crlf = C.parseCsv('a,b\r\n1,2\r\n3,4');
  chk('csv: CRLF == LF', crlf.rowCount === lf.rowCount && crlf.columns[1].values[1] === 4);

  p = C.parseCsv('a,b\n1,2\n\n3,4');
  chk('csv: blank line skipped', p.rowCount === 2, p.rowCount);
  chk('csv: blank-line warning', p.warnings.some(w => w.code === 'BLANK_ROWS'));

  p = C.parseCsv('a,b\n1,\n3,4');
  chk('csv: missing cell → null + missingCount', p.columns[1].values[0] === null && p.columns[1].missingCount === 1);

  p = C.parseCsv('a,b\n1,2,99\n3,4');
  chk('csv: extra cell → ragged warning', p.warnings.some(w => w.code === 'RAGGED_ROWS'));
  chk('csv: extra cell truncated to ncol', p.columns.length === 2 && p.rowCount === 2);

  p = C.parseCsv('a,b\n1\n3,4');
  chk('csv: fewer cells → missing + ragged', p.columns[1].values[0] === null && p.warnings.some(w => w.code === 'RAGGED_ROWS'));

  p = C.parseCsv('a,a\n1,2');
  chk('csv: duplicate header warning', p.warnings.some(w => w.code === 'DUP_HEADER'));

  p = C.parseCsv('yaw[deg/s]\n12.5');
  chk('csv: yaw[deg/s] unit not truncated', p.columns[0].rawName === 'yaw' && p.columns[0].rawUnit === 'deg/s', { n: p.columns[0].rawName, u: p.columns[0].rawUnit });

  chk('csv: empty input → error', C.parseCsv('').errors.length > 0);
})();

// ── units ──
(() => {
  chk('unit: km/h supported', C.classifyUnit('km/h', 'speed').support === 'supported');
  chk('unit: km/h→m/s', near(C.convertToCanonical(36, 'km/h', 'speed'), 10));
  chk('unit: deg→rad', near(C.convertToCanonical(180, 'deg', 'angle'), Math.PI, 1e-9));
  chk('unit: deg/s→rad/s', near(C.convertToCanonical(180, 'deg/s', 'angular_rate'), Math.PI, 1e-9));
  chk('unit: g→m/s2', near(C.convertToCanonical(1, 'g', 'acceleration'), 9.81));
  chk('unit: unsupported', C.classifyUnit('furlongs', 'speed').support === 'unsupported');
  chk('unit: missing', C.classifyUnit('', 'speed').support === 'missing');
  chk('unit: no guess for unknown', C.convertToCanonical(1, 'counts', 'acceleration') === null);
})();

// ── timebase ──
(() => {
  const mk = (time, extra) => { const data = { time }, ch = ['time']; if (extra) { Object.assign(data, extra); ch.push(...Object.keys(extra)); } return { data, units: {}, n: time.length, channels: ch }; };
  const t20 = []; for (let i = 0; i < 50; i++) t20.push(+(i * 0.05).toFixed(2));
  let tb = C.timebaseReport(mk(t20));
  chk('tb: stable 20Hz definition_confirmed', tb.status === C.GRADE.DEFINITION_CONFIRMED, tb.status);
  chk('tb: sampleRate ≈ 20', near(tb.sampleRateHz, 20, 0.5), tb.sampleRateHz);

  const jit = t20.map((v, i) => +(v + (i % 2 ? 0.002 : -0.002)).toFixed(4));
  chk('tb: small jitter still ok', C.timebaseReport(mk(jit)).status === C.GRADE.DEFINITION_CONFIRMED);

  chk('tb: duplicate timestamp → provisional', C.timebaseReport(mk([0, 0.05, 0.05, 0.10, 0.15])).status === C.GRADE.PROVISIONAL);

  const reset = [0, 0.05, 0.10, 0.02, 0.07, 0.12];
  tb = C.timebaseReport(mk(reset));
  chk('tb: global reset → blocked', tb.status === C.GRADE.BLOCKED && tb.resets >= 1, { s: tb.status, r: tb.resets });

  const gap = [0, 0.05, 0.10, 5.0, 5.05, 5.10];
  tb = C.timebaseReport(mk(gap));
  chk('tb: gap → provisional + gaps≥1', tb.status === C.GRADE.PROVISIONAL && tb.gaps >= 1, { s: tb.status, g: tb.gaps });

  // lap-timer reset must NOT be a global blocker
  tb = C.timebaseReport(mk(t20, { lap: t20.map((v, i) => (i < 25 ? 1 : 2)) }));
  chk('tb: lap col no reset baseline', tb.status === C.GRADE.DEFINITION_CONFIRMED);
  const lapcol = []; for (let i = 0; i < 50; i++) lapcol.push(i % 10); // resets every 10 (lap timer)
  tb = C.timebaseReport(mk(t20, { laptime: lapcol }));
  chk('tb: lap reset detected but NOT blocking', tb.lapResets > 0 && tb.status === C.GRADE.DEFINITION_CONFIRMED, { lr: tb.lapResets, s: tb.status });
})();

// ── channel mapping ──
(() => {
  const m = (header, defs) => C.mapChannels(C.parseCsv(header + '\n1'), defs)[0];
  chk('map: exact accy→lateral_accel high', (() => { const r = m('accy'); return r.canonicalName === 'lateral_accel' && r.matchType === 'exact' && r.confidence === 'high'; })());
  chk('map: alias lat_accel→lateral_accel medium', (() => { const r = m('lat_accel'); return r.canonicalName === 'lateral_accel' && r.matchType === 'alias'; })());
  chk('map: ambiguous yaw_steer unmapped', (() => { const r = m('yaw_steer'); return r.matchType === 'ambiguous' && r.canonicalName === null; })());
  chk('map: unknown preserved', (() => { const r = m('foobar'); return r.canonicalName === null && r.rawName === 'foobar' && r.status === 'unknown'; })());
  chk('map: auto-map is provisional (not confirmed)', m('accy').status === C.GRADE.PROVISIONAL);
  chk('map: user override → definition_confirmed', (() => { const r = m('accy', { channels: { lateral_accel: { confirmed: true } } }); return r.status === C.GRADE.DEFINITION_CONFIRMED && r.basis === 'user_confirmed'; })());
  chk('map: raw unit preserved', C.mapChannels(C.parseCsv('speed[km/h]\n1'))[0].rawUnit === 'km/h');
})();

// ── preflight grading + availableAnalyses ──
(() => {
  const FULL = 'time[s],speed[km/h],steer[deg],accy[g],yaw[deg/s]\n0,100,-5,0.5,20\n0.05,101,-5.1,0.52,21';
  const allDef = { channels: { speed: { confirmed: true }, steering: { confirmed: true }, lateral_accel: { confirmed: true }, yaw_rate: { confirmed: true } } };
  let pf = C.runTelemetryPreflight(C.parseCsv(FULL), allDef, {});
  chk('pf: full definition → definition_confirmed', pf.grade === C.GRADE.DEFINITION_CONFIRMED, { g: pf.grade, a: pf.assumptions, b: pf.blockers });
  chk('pf: yaw available with full def', pf.availableAnalyses.observedYawResponse === true);
  chk('pf: kus/roll/rec blocked even when yaw available', !pf.availableAnalyses.measuredKus && !pf.availableAnalyses.bodyRollGradient && !pf.availableAnalyses.setupRecommendation);

  pf = C.runTelemetryPreflight(C.parseCsv(FULL), {}, {}); // auto-map only, no semantic confirm
  chk('pf: missing semantic definition → provisional', pf.grade === C.GRADE.PROVISIONAL, pf.grade);

  // missing required column (no yaw) → yaw analysis unavailable, curves still available
  const NOYAW = 'time[s],speed[km/h]\n0,100\n0.05,101';
  pf = C.runTelemetryPreflight(C.parseCsv(NOYAW), {}, {});
  chk('pf: missing required column → observedYawResponse false', pf.availableAnalyses.observedYawResponse === false);
  chk('pf: synchronized curves available without yaw', pf.availableAnalyses.synchronizedCurves === true);

  // unsupported required unit → blocked
  const BADUNIT = 'time[s],speed[furlongs],steer[deg],accy[g],yaw[deg/s]\n0,1,-5,0.5,20\n0.05,1,-5,0.5,21';
  pf = C.runTelemetryPreflight(C.parseCsv(BADUNIT), allDef, {});
  chk('pf: unsupported required unit → blocked', pf.grade === C.GRADE.BLOCKED, { g: pf.grade, b: pf.blockers });

  // global time reset → blocked
  const RESET = 'time[s],speed[km/h],steer[deg],accy[g],yaw[deg/s]\n0,100,-5,0.5,20\n0.05,101,-5,0.5,21\n0.02,102,-5,0.5,21';
  pf = C.runTelemetryPreflight(C.parseCsv(RESET), allDef, {});
  chk('pf: global time reset → blocked', pf.grade === C.GRADE.BLOCKED && pf.availableAnalyses.synchronizedCurves === false);
})();

// ── #0 unclosed quote is FATAL (adversarial: must not silently swallow the rest of the file) ──
(() => {
  const r = C.parseCsv('time,speed\n0,1\n2,"oops never closed\n4,5\n6,7');
  chk('csv: unclosed quote → CSV_UNCLOSED_QUOTE error', r.errors.some(e => e.code === 'CSV_UNCLOSED_QUOTE'), r.errors);
  chk('csv: unclosed quote → no usable dataset (no silent row merge)', r.rowCount === 0 && r.columns.length === 0, { n: r.rowCount, c: r.columns.length });
  // a LEGAL multi-line quoted field (quote DOES close) must NOT be misflagged as unclosed
  const ok = C.parseCsv('time,note\n0,"line1\nline2"\n1,x');
  chk('csv: legal multiline quoted field not misflagged', !ok.errors.some(e => e.code === 'CSV_UNCLOSED_QUOTE') && ok.rowCount === 2, { e: ok.errors, n: ok.rowCount });
})();

// ── #1 positive-evidence rule: zero confirmed definitions must NEVER grade definition_confirmed ──
(() => {
  // clean time + only an UNKNOWN channel, nothing user-confirmed → was the bug (went green); must be provisional
  let pf = C.runTelemetryPreflight(C.parseCsv('time[s],foobar\n0,1\n0.05,2'), {}, {});
  chk('pf: clean time + unknown-only, zero confirmed → provisional (not green)', pf.grade === C.GRADE.PROVISIONAL, pf.grade);
  // worst()'s identity must stay definition_confirmed so a genuinely-confirmed path can still reach green
  chk('worst: all-confirmed stays definition_confirmed (seed unchanged)', C.worst(C.GRADE.DEFINITION_CONFIRMED, C.GRADE.DEFINITION_CONFIRMED) === C.GRADE.DEFINITION_CONFIRMED);
})();

// ── i18n batch-2 invariant: timebaseReport.reason and .reasonCodes stay in lockstep (no dual-track drift) ──
(() => {
  const cases = [
    'time[s],v\n0,1\n0.1,2\n0.05,3',   // reset
    'time[s],v\n0,1\n0,2\n0.1,3',      // duplicate timestamp
    'v\n1\n2\n3',                       // no time column
  ];
  cases.forEach((csv, i) => {
    const tb = C.timebaseReport(C.columnMap(C.parseCsv(csv)));
    chk('tb invariant: reason/reasonCodes same length #' + i, tb.reason.length === tb.reasonCodes.length, { r: tb.reason.length, rc: tb.reasonCodes.length });
    chk('tb invariant: reasonCodes[i].message === reason[i] #' + i, tb.reasonCodes.every((rc, j) => rc.message === tb.reason[j]));
    chk('tb invariant: every reasonCode carries a code #' + i, tb.reasonCodes.every(rc => typeof rc.code === 'string' && rc.code.length > 0));
  });
})();

// ── grade-invariance fixture: structured {code,params,message} diagnostics must NOT change grade or counts vs the legacy English text ──
(() => {
  const pf = C.runTelemetryPreflight(C.parseCsv('time[s],v\n0,1\n0.1,2\n0.05,3'), {}, {}); // reset
  chk('fixture: reset → blocked', pf.grade === C.GRADE.BLOCKED);
  chk('fixture: blockers are structured {code,message}', pf.blockers.length >= 1 && pf.blockers.every(b => b && b.code && typeof b.message === 'string'));
  chk('fixture: reset blocker keeps legacy English message + TB_RESET code', pf.blockers.some(b => b.code === 'TB_RESET' && /GLOBAL timestamp reset/.test(b.message)));
  const allDef = { channels: { speed: { confirmed: true }, steering: { confirmed: true }, lateral_accel: { confirmed: true }, yaw_rate: { confirmed: true } } };
  const pf2 = C.runTelemetryPreflight(C.parseCsv('time[s],speed[km/h],steer[deg],accy[g],yaw[deg/s]\n0,100,-5,0.5,20\n0.05,101,-5.1,0.52,21'), allDef, {});
  chk('fixture: full confirmed → definition_confirmed, zero blockers/assumptions (grade unchanged by i18n)', pf2.grade === C.GRADE.DEFINITION_CONFIRMED && pf2.blockers.length === 0 && pf2.assumptions.length === 0, { g: pf2.grade, b: pf2.blockers.length, a: pf2.assumptions.length });
})();

console.log(`telemetry-core: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
