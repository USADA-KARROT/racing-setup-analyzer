/**
 * tests/telemetry-plot.test.js — geometry tests for the PURE plotLayout layer
 * (V1 Step 3-ii). No canvas/DOM. drawCurves is verified visually in the preview.
 * Run: node tests/telemetry-plot.test.js
 */
'use strict';
const P = require('../renderer/js/telemetry-plot.js');
const Core = require('../renderer/js/telemetry-core.js');
const V = require('../renderer/js/telemetry-view.js');
let pass = 0, fail = 0;
const chk = (n, cond, d) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-6);

console.log('=== telemetry-plot geometry tests ===');

// synthetic curveData: speed (all-positive) + accy (signed, crosses 0)
const cd = {
  x: { kind: 'time', name: 'time', unit: 's', full: { startRow: 0, endRow: 10, count: 11 } },
  window: { startRow: 0, endRow: 10, count: 11 }, decimated: false, bucketCount: 11,
  lanes: [
    { columnId: 1, rawName: 'speed', canonicalName: 'speed', unit: 'm/s', useCanonical: true, points: [{ x: 0, y: 0, row: 0, gap: false }, { x: 10, y: 100, row: 10, gap: false }], yMin: 0, yMax: 100, gapCount: 0 },
    { columnId: 3, rawName: 'accy', canonicalName: 'lateral_accel', unit: 'm/s2', useCanonical: true, points: [{ x: 0, y: -20, row: 0, gap: false }, { x: 5, y: 0, row: 5, gap: false }, { x: 10, y: 20, row: 10, gap: false }], yMin: -20, yMax: 20, gapCount: 0 },
  ],
};
const L = P.plotLayout({ cssW: 800, cssH: 600, dpr: 2 }, cd);

// ── viewport / HiDPI ──
chk('layout: css preserved', L.css.w === 800 && L.css.h === 600);
chk('layout: backing = css × dpr', L.backing.w === 1600 && L.backing.h === 1200, L.backing);
chk('layout: not empty', L.empty === false);

// ── plot area (padding 64/16/10/6 + axisH 26) ──
chk('layout: plotArea', L.plotArea.x === 64 && L.plotArea.y === 10 && L.plotArea.w === 720 && L.plotArea.h === 558, L.plotArea);

// ── shared X scale: domain endpoints map to plot edges ──
chk('layout: x.to(min)=left edge', near(L.x.scale.to(0), 64));
chk('layout: x.to(max)=right edge', near(L.x.scale.to(10), 784), L.x.scale.to(10));
chk('layout: x monotonic increasing', L.x.scale.to(3) < L.x.scale.to(7));

// ── lane stacking: non-overlapping, fills plotArea, gap respected ──
chk('layout: 2 lanes', L.lanes.length === 2);
const l0 = L.lanes[0], l1 = L.lanes[1];
chk('layout: lane0 rect', l0.rect.x === 64 && l0.rect.y === 10 && l0.rect.w === 720 && near(l0.rect.h, 272), l0.rect);
chk('layout: lane1 below lane0 + laneGap', near(l1.rect.y, l0.rect.y + l0.rect.h + 14), { l1y: l1.rect.y });
chk('layout: lanes fill plotArea height', near((l1.rect.y + l1.rect.h) - l0.rect.y, L.plotArea.h));
chk('layout: lanes do not overlap', l1.rect.y >= l0.rect.y + l0.rect.h - 1e-9);

// ── y scale per lane: value↑ → pixel↓, domain edges hit inner plot edges ──
const y0 = l0.y.scale;
chk('layout: y value-up → pixel-down', y0.to(100) < y0.to(0));
chk('layout: y domain bottom = plot bottom', near(y0.to(y0.dom[0]), l0.plot.y + l0.plot.h), { got: y0.to(y0.dom[0]), want: l0.plot.y + l0.plot.h });
chk('layout: y domain top = plot top', near(y0.to(y0.dom[1]), l0.plot.y));
chk('layout: y domain padded beyond data', y0.dom[0] < 0 && y0.dom[1] > 100, y0.dom);

// ── y=0 reference: present for signed lane, positioned inside plot ──
chk('layout: accy zeroPx present + inside plot', l1.y.zeroPx != null && l1.y.zeroPx > l1.plot.y && l1.y.zeroPx < l1.plot.y + l1.plot.h, l1.y.zeroPx);
chk('layout: accy zero centred (symmetric data)', near(l1.y.zeroPx, l1.plot.y + l1.plot.h / 2, 1));

// ── status + colour presentation ──
chk('layout: status from useCanonical', l0.status === 'provisional' && l1.status === 'provisional');
chk('layout: palette by index', l0.color === P.PALETTE[0] && l1.color === P.PALETTE[1]);

// ── dpr clamp: external 3× display clamped to 2 ──
const Lhi = P.plotLayout({ cssW: 800, cssH: 600, dpr: 3 }, cd);
chk('layout: dpr capped at 2', Lhi.dpr === 2 && Lhi.backing.w === 1600, { dpr: Lhi.dpr, bw: Lhi.backing.w });

// ── empty states ──
const e1 = P.plotLayout({ cssW: 800, cssH: 600, dpr: 1 }, { lanes: [] });
chk('layout: no channels → empty/no-channels', e1.empty === true && e1.reason === 'no-channels');
const e2 = P.plotLayout({ cssW: 800, cssH: 600, dpr: 1 }, { lanes: [{ columnId: 1, rawName: 'x', points: [], yMin: null, yMax: null }] });
chk('layout: channel but no data → empty/no-data', e2.empty === true && e2.reason === 'no-data');

// ── helpers ──
chk('padDomain: degenerate expanded', (() => { const d = P.padDomain(5, 5, 0.06); return d[0] < 5 && d[1] > 5; })());
chk('padDomain: null on missing', P.padDomain(null, 3, 0.06) === null);
chk('linScale: inverse round-trips', (() => { const s = P.linScale(0, 10, 100, 900); return near(s.inv(s.to(7)), 7); })());
chk('ticks: spans range', (() => { const t = P.ticks(0, 10, 5); return t.length >= 3 && t[0] >= 0 && t[t.length - 1] <= 10; })());

// ── tick positions in layout (axis placement node-testable, per consensus) ──
(() => {
  const xt = L.x.ticks;
  chk('ticks: x.ticks within plot width', xt.length >= 2 && xt.every(t => t.px >= L.plotArea.x - 0.5 && t.px <= L.plotArea.x + L.plotArea.w + 0.5), xt.map(t => Math.round(t.px)));
  chk('ticks: x.ticks px matches scale', xt.every(t => near(t.px, L.x.scale.to(t.v))));
  chk('ticks: x.ticks monotonic', xt.every((t, i) => i === 0 || t.px > xt[i - 1].px));
  const yt = L.lanes[1].y.ticks, lp = L.lanes[1].plot;
  chk('ticks: y.ticks clipped to plot box', yt.length >= 1 && yt.every(t => t.px >= lp.y - 0.5 && t.px <= lp.y + lp.h + 0.5));
  chk('ticks: y.ticks px matches scale', yt.every(t => near(t.px, L.lanes[1].y.scale.to(t.v))));
})();

// ── tiny canvas must not crash or produce NaN/Infinity geometry ──
(() => {
  const T = P.plotLayout({ cssW: 8, cssH: 8, dpr: 1 }, cd);
  chk('tiny: plotArea ≥1 and finite', T.plotArea.w >= 1 && T.plotArea.h >= 1 && isFinite(T.plotArea.w) && isFinite(T.plotArea.h), T.plotArea);
  chk('tiny: lanes produced with finite rects', T.lanes.length === 2 && T.lanes.every(l => isFinite(l.rect.h) && isFinite(l.plot.h) && l.plot.h >= 1));
  chk('tiny: x ticks px all finite', T.x && T.x.ticks.every(t => isFinite(t.px)));
})();

// ── resize: same data at two widths keeps proportional mapping ──
(() => {
  const A = P.plotLayout({ cssW: 400, cssH: 600, dpr: 1 }, cd);
  const B = P.plotLayout({ cssW: 900, cssH: 600, dpr: 1 }, cd);
  chk('resize: x domain identical across widths', A.x.scale.dom[0] === B.x.scale.dom[0] && A.x.scale.dom[1] === B.x.scale.dom[1]);
  chk('resize: domain edges hit plot edges at both widths', near(A.x.scale.to(A.x.scale.dom[0]), A.plotArea.x) && near(B.x.scale.to(B.x.scale.dom[1]), B.plotArea.x + B.plotArea.w));
  const mid = (cd.lanes[0].points[0].x + cd.lanes[0].points[1].x) / 2;
  chk('resize: domain midpoint at plot centre both widths', near(A.x.scale.to(mid), A.plotArea.x + A.plotArea.w / 2) && near(B.x.scale.to(mid), B.plotArea.x + B.plotArea.w / 2));
})();

// ── lane count follows selected channels only (unselected don't occupy space) ──
(() => {
  const one = P.plotLayout({ cssW: 800, cssH: 600, dpr: 1 }, { x: cd.x, lanes: [cd.lanes[0]] });
  chk('lanes: single selected lane fills plotArea height', one.lanes.length === 1 && near(one.lanes[0].rect.h, one.plotArea.h), { h: one.lanes[0].rect.h, area: one.plotArea.h });
})();

// ── integration: real buildCurveData output feeds plotLayout cleanly ──
(() => {
  const csv = 'time[s],speed[km/h],accy[g],yaw[deg/s]\n' +
    Array.from({ length: 300 }, (_, i) => (i * 0.05).toFixed(2) + ',' + (100 + 20 * Math.sin(i / 10)) + ',' + (Math.sin(i / 7)) + ',' + (10 * Math.cos(i / 9))).join('\n');
  const s = V.newSession('r.csv', Core.parseCsv(csv), 'custom');
  const real = V.buildCurveData(s, { channels: [1, 2, 3], targetPoints: 120 });
  const RL = P.plotLayout({ cssW: 900, cssH: 500, dpr: 2 }, real);
  chk('integration: 3 lanes laid out, not empty', RL.empty === false && RL.lanes.length === 3);
  chk('integration: x scale monotonic over real domain', RL.x.scale.to(RL.x.scale.dom[0]) < RL.x.scale.to(RL.x.scale.dom[1]));
  chk('integration: every lane has a y scale + points', RL.lanes.every(l => l.y.scale && l.points.length > 0));
  chk('integration: signed channels get zeroPx, speed-ish may too', RL.lanes[1].y.zeroPx != null && RL.lanes[2].y.zeroPx != null);
})();

// ── overlay drawing (drawSelection / drawCursor) via a mock 2D context ──
(() => {
  const mk = () => { const calls = []; return { calls, setTransform: () => calls.push('setTransform'), clearRect() {}, fillRect: () => calls.push('fillRect'), beginPath() {}, moveTo() {}, lineTo() {}, stroke: () => calls.push('stroke'), arc: () => calls.push('arc'), fill: () => calls.push('fill'), save() {}, restore() {}, fillText() {}, strokeRect() {} }; };
  let m = mk();
  P.drawSelection(m, L, { startTime: 2, endTime: 7 });
  chk('overlay: drawSelection fills band + edges', m.calls.includes('fillRect') && m.calls.includes('stroke'));
  m = mk(); P.drawSelection(m, L, null);
  chk('overlay: drawSelection null → no fill', !m.calls.includes('fillRect'));
  m = mk(); P.drawCursor(m, L, 5, [{ columnId: 1, value: 50 }, { columnId: 3, value: 0 }]);
  chk('overlay: drawCursor line + per-lane dots', m.calls.includes('stroke') && m.calls.filter(c => c === 'arc').length === 2, m.calls);
  m = mk(); P.drawCursor(m, L, 999, [{ columnId: 1, value: 50 }]);
  chk('overlay: drawCursor out-of-domain → nothing', m.calls.length === 0);
  m = mk(); P.drawCursor(m, P.plotLayout({ cssW: 800, cssH: 600, dpr: 1 }, { lanes: [] }), 5, []);
  chk('overlay: drawCursor empty layout → no crash', m.calls.length === 0);
})();

console.log(`telemetry-plot: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
