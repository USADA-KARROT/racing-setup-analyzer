/**
 * tests/telemetry-interact.test.js — V1 Step 3-(iii)-a pure interaction geometry.
 * No DOM/canvas/events. Run: node tests/telemetry-interact.test.js
 */
'use strict';
const I = require('../renderer/js/telemetry-interact.js');
const P = require('../renderer/js/telemetry-plot.js');
let pass = 0, fail = 0;
const chk = (n, cond, d) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-6);

console.log('=== telemetry-interact geometry tests ===');

// layout stub: time 0..90s mapped to px 64..784 (matches plotLayout's x scale shape)
const layout = { x: { scale: P.linScale(0, 90, 64, 784) } };
const tv = Array.from({ length: 91 }, (_, i) => i); // raw time rows 0,1,...,90

// ── pixelToTime ──
chk('px→time: left edge → domain min', near(I.pixelToTime(64, layout), 0));
chk('px→time: right edge → domain max', near(I.pixelToTime(784, layout), 90));
chk('px→time: round-trips through scale', near(I.pixelToTime(layout.x.scale.to(37.5), layout), 37.5));
chk('px→time: null when no x', I.pixelToTime(100, {}) === null);

// ── timeToNearestSourceIndex (binary search) ──
chk('nearest: exact', I.timeToNearestSourceIndex(42, tv) === 42);
chk('nearest: rounds to closer side', I.timeToNearestSourceIndex(3.6, tv) === 4 && I.timeToNearestSourceIndex(3.4, tv) === 3);
chk('nearest: tie → lower index', I.timeToNearestSourceIndex(2.5, tv) === 2);
chk('nearest: clamps below/above', I.timeToNearestSourceIndex(-10, tv) === 0 && I.timeToNearestSourceIndex(999, tv) === 90);
chk('nearest: empty → -1', I.timeToNearestSourceIndex(5, []) === -1);
chk('nearest: single element', I.timeToNearestSourceIndex(5, [7]) === 0);

// ── computeCursorValues (samples RAW rows, applies canonical factor) ──
(() => {
  const readers = [
    { columnId: 1, rawName: 'speed', canonicalName: 'speed', unit: 'm/s', values: [360, 180, 90], factor: 1 / 3.6 },
    { columnId: 3, rawName: 'accy', canonicalName: 'lateral_accel', unit: 'm/s2', values: [1, null, -2], factor: 9.80665 },
  ];
  const tv3 = [0, 1, 2];
  const cur = I.computeCursorValues(1.1, tv3, readers); // nearest row = 1
  chk('cursor: row + time from nearest source', cur.row === 1 && cur.time === 1);
  chk('cursor: canonical value (km/h→m/s)', near(cur.lanes[0].value, 180 / 3.6) && cur.lanes[0].rawValue === 180);
  chk('cursor: null raw → null value preserved', cur.lanes[1].rawValue === null && cur.lanes[1].value === null);
  chk('cursor: empty readers ok', I.computeCursorValues(1, tv3, []).lanes.length === 0);
})();

// ── clampWindow ──
const FD = { min: 0, max: 90 };
chk('clamp: inside unchanged', (() => { const w = I.clampWindow(10, 20, FD); return w.startTime === 10 && w.endTime === 20; })());
chk('clamp: reversed input normalised', (() => { const w = I.clampWindow(20, 10, FD); return w.startTime === 10 && w.endTime === 20; })());
chk('clamp: left overflow keeps width', (() => { const w = I.clampWindow(-5, 5, FD); return near(w.startTime, 0) && near(w.endTime, 10); })());
chk('clamp: right overflow keeps width', (() => { const w = I.clampWindow(85, 95, FD); return near(w.startTime, 80) && near(w.endTime, 90); })());
chk('clamp: wider than full → full', (() => { const w = I.clampWindow(-50, 200, FD); return w.startTime === 0 && w.endTime === 90; })());
chk('clamp: min width enforced about centre', (() => { const w = I.clampWindow(50, 50, FD, 2); return near(w.endTime - w.startTime, 2) && near((w.startTime + w.endTime) / 2, 50); })());

// ── zoomWindow (anchor must not drift) ──
(() => {
  const cur = { startTime: 0, endTime: 90 };
  const zi = I.zoomWindow(45, 0.5, cur, FD); // zoom in about centre
  chk('zoom: in narrows window', near(zi.endTime - zi.startTime, 45));
  chk('zoom: anchor relative position preserved', near((45 - zi.startTime) / (zi.endTime - zi.startTime), 0.5));
  const cur2 = { startTime: 20, endTime: 40 };
  const za = I.zoomWindow(20, 0.5, cur2, FD); // anchor at left edge
  chk('zoom: edge anchor stays at edge', near(za.startTime, 20) && near(za.endTime, 30));
  const zo = I.zoomWindow(45, 5, { startTime: 30, endTime: 60 }, FD); // zoom out beyond full
  chk('zoom: out clamps to full domain', zo.startTime === 0 && zo.endTime === 90);
})();

// ── panWindow (keeps width, bumps edges) ──
(() => {
  const cur = { startTime: 20, endTime: 40 };
  chk('pan: shifts by delta', (() => { const w = I.panWindow(10, cur, FD); return near(w.startTime, 30) && near(w.endTime, 50); })());
  chk('pan: right edge bump keeps width', (() => { const w = I.panWindow(60, cur, FD); return near(w.endTime, 90) && near(w.endTime - w.startTime, 20); })());
  chk('pan: left edge bump keeps width', (() => { const w = I.panWindow(-30, cur, FD); return near(w.startTime, 0) && near(w.endTime - w.startTime, 20); })());
})();

// ── selectionFromPixels (the canonical contract) ──
(() => {
  const sel = I.selectionFromPixels(204, 544, layout, tv); // → t 17.5 .. 60
  chk('select: contract shape', sel && 'startTime' in sel && 'endTime' in sel && 'startIndex' in sel && 'endIndex' in sel && sel.source === 'user_drag');
  chk('select: ordered start<end', sel.startTime < sel.endTime);
  chk('select: indices align to nearest raw rows', sel.startIndex === 17 && sel.endIndex === 60, { si: sel.startIndex, ei: sel.endIndex });
  const rev = I.selectionFromPixels(544, 204, layout, tv); // reversed drag → same span
  chk('select: reversed drag → same span', near(rev.startTime, sel.startTime) && near(rev.endTime, sel.endTime));
  const over = I.selectionFromPixels(-100, 9000, layout, tv); // beyond canvas → clamped to domain
  chk('select: clamps to x domain', near(over.startTime, 0) && near(over.endTime, 90) && over.startIndex === 0 && over.endIndex === 90);
  chk('select: null layout → null', I.selectionFromPixels(0, 100, {}, tv) === null);
})();

// ── summarizeSelection (per-channel stats over a raw row range, null-skipping) ──
(() => {
  const readers = [
    { columnId: 1, rawName: 'speed', canonicalName: 'speed', unit: 'm/s', values: [36, 72, 108, 144, 180], factor: 1 / 3.6 }, // → 10,20,30,40,50 m/s
    { columnId: 3, rawName: 'accy', canonicalName: 'lateral_accel', unit: 'm/s2', values: [1, null, 3, null, 5], factor: 1 },
  ];
  const s = I.summarizeSelection(1, 3, readers); // rows 1..3
  chk('summary: rowCount inclusive', s.rowCount === 3 && s.startIndex === 1 && s.endIndex === 3);
  chk('summary: canonical min/max/mean', near(s.lanes[0].min, 20) && near(s.lanes[0].max, 40) && near(s.lanes[0].mean, 30) && s.lanes[0].count === 3, s.lanes[0]);
  chk('summary: null samples skipped in count + stats', s.lanes[1].count === 1 && near(s.lanes[1].min, 3) && near(s.lanes[1].max, 3) && near(s.lanes[1].mean, 3));
  const rev = I.summarizeSelection(3, 1, readers);
  chk('summary: reversed range normalised', rev.startIndex === 1 && rev.endIndex === 3 && near(rev.lanes[0].mean, 30));
  const allNull = I.summarizeSelection(0, 2, [{ columnId: 9, rawName: 'x', canonicalName: 'x', unit: '', values: [null, null, null], factor: 1 }]);
  chk('summary: all-null lane → null stats, count 0', allNull.lanes[0].count === 0 && allNull.lanes[0].min === null && allNull.lanes[0].mean === null);
})();

// ── #3 buildTimeIndex + nearestRowByTime: null/NaN/reset/duplicate policy (fail closed) ──
(() => {
  // null in the time column → skipped + counted, but rows still map to RAW source rows
  const ti = I.buildTimeIndex([0, 0.1, null, 0.3, 0.4]);
  chk('timeIndex: null skipped + counted, still usable', ti.invalidCount === 1 && ti.usable === true);
  chk('timeIndex: times compacted, rows map to RAW', JSON.stringify(ti.times) === JSON.stringify([0, 0.1, 0.3, 0.4]) && JSON.stringify(ti.rows) === JSON.stringify([0, 1, 3, 4]), { t: ti.times, r: ti.rows });
  chk('timeIndex: query 0.31 → RAW row 3 (not compact index 2)', I.nearestRowByTime(0.31, ti) === 3, I.nearestRowByTime(0.31, ti));
  // NaN / ±Infinity have no legal time position → invalid; the rest still maps correctly
  const tn = I.buildTimeIndex([0, NaN, 0.2, Infinity, 0.4]);
  chk('timeIndex: NaN/Infinity invalid, rows RAW', tn.invalidCount === 2 && tn.usable === true && JSON.stringify(tn.rows) === JSON.stringify([0, 2, 4]), { inv: tn.invalidCount, r: tn.rows });
  chk('timeIndex: nearest after invalids maps RAW', I.nearestRowByTime(0.21, tn) === 2);
  // time goes BACKWARDS (reset) → NOT silently dropped: whole index unusable, mapping refuses
  const tr = I.buildTimeIndex([0, 0.2, 0.1, 0.3]);
  chk('timeIndex: reset → usable=false + resetCount', tr.usable === false && tr.resetCount >= 1, tr);
  chk('timeIndex: unusable → nearestRowByTime -1 (fail closed, no laundered timebase)', I.nearestRowByTime(0.15, tr) === -1);
  // duplicate timestamp → kept (non-decreasing), counted, tie resolves to the lower raw row
  const td = I.buildTimeIndex([0, 0.1, 0.1, 0.2]);
  chk('timeIndex: duplicate kept + counted + usable', td.duplicateCount === 1 && td.usable === true && td.times.length === 4, td);
  chk('timeIndex: duplicate query ties to lower raw row', I.nearestRowByTime(0.1, td) === 1, I.nearestRowByTime(0.1, td));
})();

// ── #3 cursor + selection consume the SAME index; both map to RAW rows under null time ──
(() => {
  const lay = { x: { scale: P.linScale(0, 4, 0, 400) } };
  const tv = [0, 1, null, 3, 4];                 // row 2 has no timestamp
  const ti = I.buildTimeIndex(tv);
  const readers = [{ columnId: 1, rawName: 'v', canonicalName: 'speed', unit: 'm/s', values: [10, 11, 12, 13, 14], factor: 1 }];
  const cur = I.computeCursorValues(3.1, ti, readers);  // nearest valid time 3 → RAW row 3
  chk('cursor(null time): row = RAW 3, value read from row 3', cur.row === 3 && cur.lanes[0].rawValue === 13, { row: cur.row, v: cur.lanes[0].rawValue });
  const sel = I.selectionFromPixels(0, 400, lay, ti);   // same shared index
  chk('selection(null time): start/end are RAW source rows', sel.startIndex === 0 && sel.endIndex === 4, sel);
  const sum = I.summarizeSelection(sel.startIndex, sel.endIndex, readers);
  chk('selection summary: raw range count includes the null-time row (locked policy)', sum.rowCount === 5 && sum.lanes[0].count === 5, sum);
  // unusable timebase (reset) → cursor + selection BOTH refuse to map (fail closed)
  const tiBad = I.buildTimeIndex([0, 5, 1, 6]);
  chk('cursor(reset): unusable → row -1', I.computeCursorValues(2, tiBad, readers).row === -1);
  const selBad = I.selectionFromPixels(0, 400, lay, tiBad);
  chk('selection(reset): unusable → indices -1', selBad.startIndex === -1 && selBad.endIndex === -1, selBad);
})();

console.log(`telemetry-interact: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
