/**
 * telemetry-plot.js — V1 Step 3-(ii): static multi-channel canvas plotter.
 *
 * Two layers, deliberately split so geometry is unit-testable without a DOM:
 *   1. plotLayout(viewport, curveData, opts)  — PURE geometry. Given a viewport
 *      ({cssW,cssH,dpr}) and the output of TelemetryView.buildCurveData, returns
 *      lane rectangles + linear x→px / y→px mappings. No canvas, no globals.
 *      This answers "is the geometry correct?" via node tests, not by eye.
 *   2. drawCurves(ctx, layout, theme) — canvas painting (HiDPI transform, grid,
 *      axis, lane labels, y=0 reference, gap-broken polylines). Verified visually
 *      in the preview, NOT unit-tested.
 *
 * Scope (ii), per consensus: HiDPI, stacked grouped lanes, shared X axis, lane
 * layout, x|y→px mapping, grid, axes, unit+channel labels, gap-break, lane
 * status/availability, resize redraw, empty/blocked state. NO cursor / hover /
 * zoom / pan / selection — those are (iii). Selection always references full
 * original rows; this layer only renders.
 *
 * UMD: Node require / Electron renderer global (TelemetryPlot). No deps.
 */
(function (root) {
  'use strict';

  // distinct, colourblind-aware-ish line palette, indexed by lane order
  var PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#ef4444', '#06b6d4', '#eab308', '#ec4899'];

  // status → label colour (mirrors preflight grading)
  var STATUS_COLOR = {
    definition_confirmed: '#10b981',
    provisional: '#f59e0b',
    blocked: '#9ca3af',
    unknown: '#9ca3af',
  };

  var DEFAULT_THEME = {
    bg: '#0b1220',
    grid: 'rgba(148,163,184,0.18)',
    gridStrong: 'rgba(148,163,184,0.30)',
    text: '#cbd5e1',
    textDim: '#94a3b8',
    zero: 'rgba(148,163,184,0.45)',
    laneBorder: 'rgba(148,163,184,0.22)',
    cursor: 'rgba(226,232,240,0.9)',
    selectionFill: 'rgba(56,189,248,0.15)',
    selectionEdge: 'rgba(56,189,248,0.65)',
    palette: PALETTE,
    status: STATUS_COLOR,
  };

  var DEFAULT_OPTS = {
    padding: { top: 10, right: 16, bottom: 6, left: 64 },
    laneGap: 14,
    axisH: 26,          // bottom strip reserved for the shared X axis labels
    labelH: 16,         // top strip inside each lane reserved for its title
    yPadFrac: 0.06,     // headroom above/below the data within a lane
    yTicks: 3,          // horizontal grid lines per lane (excl. top/bottom border)
    xTicks: 6,
    dprCap: 2,          // clamp devicePixelRatio so a hi-DPI external display can't
    minLaneH: 28,       // explode the backing store for an already-decimated series
  };

  // linear map dom→range as px = m*v + b (and an inverse for future (iii) use)
  function linScale(dom0, dom1, r0, r1) {
    var span = dom1 - dom0;
    var m = span === 0 ? 0 : (r1 - r0) / span;
    var b = r0 - m * dom0;
    return {
      m: m, b: b, dom: [dom0, dom1], range: [r0, r1],
      to: function (v) { return m * v + b; },
      inv: function (px) { return m === 0 ? dom0 : (px - b) / m; },
    };
  }

  // expand a [min,max] data range into a padded, non-degenerate display domain
  function padDomain(min, max, frac) {
    if (min == null || max == null) return null;
    if (min === max) { var e = Math.abs(min) * 0.05 || 1; return [min - e, max + e]; }
    var pad = (max - min) * frac;
    return [min - pad, max + pad];
  }

  /**
   * plotLayout(viewport, curveData, opts) → pure geometry. No DOM.
   *  viewport: { cssW, cssH, dpr }
   *  returns: {
   *    css:{w,h}, dpr, backing:{w,h},
   *    empty:boolean, reason?:string,
   *    plotArea:{x,y,w,h},
   *    x:{ kind,name,unit, scale }|null,          // shared X
   *    lanes:[{ columnId,rawName,canonicalName,unit,useCanonical,status,
   *             rect:{x,y,w,h}, plot:{x,y,w,h}, y:{scale, zeroPx|null},
   *             points(ref), gapCount, color }]
   *  }
   */
  function plotLayout(viewport, curveData, opts) {
    opts = mergeOpts(opts);
    var cssW = Math.max(1, viewport.cssW || 0);
    var cssH = Math.max(1, viewport.cssH || 0);
    var dpr = Math.min(opts.dprCap, Math.max(1, viewport.dpr || 1));
    var pad = opts.padding;
    var theme = opts.theme || DEFAULT_THEME;

    var base = {
      css: { w: cssW, h: cssH }, dpr: dpr,
      backing: { w: Math.round(cssW * dpr), h: Math.round(cssH * dpr) },
    };

    var lanesIn = (curveData && curveData.lanes) || [];
    var plotArea = {
      x: pad.left, y: pad.top,
      w: Math.max(1, cssW - pad.left - pad.right),
      h: Math.max(1, cssH - pad.top - pad.bottom - opts.axisH),
    };
    base.plotArea = plotArea;

    if (!lanesIn.length) { base.empty = true; base.reason = 'no-channels'; base.x = null; base.lanes = []; return base; }

    // shared X domain across every lane's points
    var xMin = Infinity, xMax = -Infinity, anyX = false;
    for (var i = 0; i < lanesIn.length; i++) {
      var pts = lanesIn[i].points || [];
      for (var j = 0; j < pts.length; j++) { var xv = pts[j].x; if (xv < xMin) xMin = xv; if (xv > xMax) xMax = xv; anyX = true; }
    }
    if (!anyX) { base.empty = true; base.reason = 'no-data'; base.x = null; base.lanes = []; return base; }
    if (xMin === xMax) { xMax = xMin + 1; }   // single-sample guard

    var xScale = linScale(xMin, xMax, plotArea.x, plotArea.x + plotArea.w);
    base.empty = false;
    base.x = {
      kind: curveData.x ? curveData.x.kind : 'index',
      name: curveData.x ? curveData.x.name : 'row',
      unit: curveData.x ? curveData.x.unit : '',
      scale: xScale,
      // tick positions live in the layout so axis placement is node-testable, not redrawn by eye
      ticks: ticks(xMin, xMax, opts.xTicks).map(function (v) { return { v: v, px: xScale.to(v) }; }),
    };

    var n = lanesIn.length;
    var laneH = (plotArea.h - opts.laneGap * (n - 1)) / n;
    base.lanes = lanesIn.map(function (ln, idx) {
      var rect = { x: plotArea.x, y: plotArea.y + idx * (laneH + opts.laneGap), w: plotArea.w, h: laneH };
      // inner plot rect leaves a strip at the top of the lane for its title
      var plot = { x: rect.x, y: rect.y + opts.labelH, w: rect.w, h: Math.max(1, rect.h - opts.labelH) };
      var dom = padDomain(ln.yMin, ln.yMax, opts.yPadFrac);
      var yScale = dom ? linScale(dom[0], dom[1], plot.y + plot.h, plot.y) : null;  // value↑ → pixel↓
      var zeroPx = (yScale && dom[0] <= 0 && 0 <= dom[1]) ? yScale.to(0) : null;
      var yTicks = [];
      if (yScale) ticks(dom[0], dom[1], opts.yTicks).forEach(function (v) {
        var px = yScale.to(v);
        if (px >= plot.y - 0.5 && px <= plot.y + plot.h + 0.5) yTicks.push({ v: v, px: px }); // clip to plot box
      });
      var status = ln.status || (ln.useCanonical ? 'provisional' : 'unknown');
      return {
        columnId: ln.columnId, rawName: ln.rawName, canonicalName: ln.canonicalName,
        unit: ln.unit, useCanonical: ln.useCanonical, status: status,
        rect: rect, plot: plot, y: { scale: yScale, zeroPx: zeroPx, ticks: yTicks },
        points: ln.points, gapCount: ln.gapCount,
        color: theme.palette[idx % theme.palette.length],
      };
    });
    return base;
  }

  function mergeOpts(opts) {
    opts = opts || {};
    var o = {};
    for (var k in DEFAULT_OPTS) o[k] = (opts[k] !== undefined ? opts[k] : DEFAULT_OPTS[k]);
    o.padding = Object.assign({}, DEFAULT_OPTS.padding, opts.padding || {});
    o.theme = opts.theme ? Object.assign({}, DEFAULT_THEME, opts.theme) : DEFAULT_THEME;
    return o;
  }

  // "nice" tick values across [a,b] — small helper for axis labels
  function ticks(a, b, count) {
    if (a === b) return [a];
    var span = b - a, step0 = span / Math.max(1, count);
    var mag = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10));
    var norm = step0 / mag, step;
    if (norm < 1.5) step = 1; else if (norm < 3) step = 2; else if (norm < 7) step = 5; else step = 10;
    step *= mag;
    var start = Math.ceil(a / step) * step, out = [];
    for (var v = start; v <= b + step * 1e-6 && out.length < 100; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  }

  function fmt(v, unit) {
    if (v == null) return '';
    var a = Math.abs(v), s;
    if (a !== 0 && (a < 0.01 || a >= 100000)) s = v.toExponential(1);
    else s = (Math.round(v * 1000) / 1000).toString();
    return unit ? s + ' ' + unit : s;
  }

  /**
   * drawCurves(ctx, layout, theme) — paint `layout` onto a 2D canvas context.
   * Caller must size the canvas backing store to layout.backing.{w,h} and the CSS
   * box to layout.css.{w,h}; this function applies the dpr transform itself.
   * Returns nothing. Not unit-tested (visual / preview verification).
   */
  function drawCurves(ctx, layout, theme) {
    theme = theme ? Object.assign({}, DEFAULT_THEME, theme) : DEFAULT_THEME;
    var dpr = layout.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);          // HiDPI: 1 unit = 1 css px
    ctx.clearRect(0, 0, layout.css.w, layout.css.h);
    if (theme.bg) { ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, layout.css.w, layout.css.h); }
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    if (layout.empty) {
      ctx.fillStyle = theme.textDim; ctx.textAlign = 'center';
      var msg = layout.reason === 'no-data' ? 'No plottable data in selection'
        : 'Select one or more channels to plot';
      ctx.fillText(msg, layout.css.w / 2, layout.css.h / 2);
      ctx.textAlign = 'left';
      return;
    }

    var xs = layout.x.scale;
    var xTicks = layout.x.ticks;

    layout.lanes.forEach(function (ln) {
      var p = ln.plot, ys = ln.y.scale;
      // lane border box
      ctx.strokeStyle = theme.laneBorder; ctx.lineWidth = 1;
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);

      // vertical X grid (shared) — positions come from the layout
      ctx.strokeStyle = theme.grid; ctx.lineWidth = 1; ctx.beginPath();
      xTicks.forEach(function (t) { var px = Math.round(t.px) + 0.5; ctx.moveTo(px, p.y); ctx.lineTo(px, p.y + p.h); });
      ctx.stroke();

      // horizontal Y grid + left-axis value labels — positions come from the layout (already clipped)
      if (ys) {
        ctx.strokeStyle = theme.grid; ctx.fillStyle = theme.textDim; ctx.textAlign = 'right';
        ln.y.ticks.forEach(function (t) {
          var py = Math.round(t.px) + 0.5;
          ctx.beginPath(); ctx.moveTo(p.x, py); ctx.lineTo(p.x + p.w, py); ctx.stroke();
          ctx.fillText(fmt(t.v), p.x - 6, py);
        });
        // y = 0 reference (emphasised) for signed channels
        if (ln.y.zeroPx != null) {
          var z = Math.round(ln.y.zeroPx) + 0.5;
          ctx.strokeStyle = theme.zero; ctx.lineWidth = 1; ctx.beginPath();
          ctx.moveTo(p.x, z); ctx.lineTo(p.x + p.w, z); ctx.stroke();
        }
      }

      // lane title: rawName → canonical (unit), coloured by definition status
      var statusColor = (theme.status && theme.status[ln.status]) || theme.textDim;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      var title = ln.rawName + (ln.canonicalName ? ' → ' + ln.canonicalName : '') + (ln.unit ? '  [' + ln.unit + ']' : '');
      ctx.fillStyle = ln.color;
      ctx.fillRect(ln.rect.x, ln.rect.y + 2, 10, 10);           // colour swatch
      ctx.fillStyle = statusColor;
      ctx.fillText(title + '  · ' + ln.status, ln.rect.x + 16, ln.rect.y + 7);

      // data polyline with gap breaks
      if (ys && ln.points && ln.points.length) {
        ctx.strokeStyle = ln.color; ctx.lineWidth = 1.25; ctx.beginPath();
        var started = false;
        for (var i = 0; i < ln.points.length; i++) {
          var pt = ln.points[i];
          var px = xs.to(pt.x), py = ys.to(pt.y);
          if (!started || pt.gap) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    });

    // shared X axis labels along the bottom
    var lastLane = layout.lanes[layout.lanes.length - 1];
    var axisY = lastLane.plot.y + lastLane.plot.h + 4;
    ctx.fillStyle = theme.textDim; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    xTicks.forEach(function (t) { ctx.fillText(fmt(t.v), t.px, axisY); });
    ctx.textAlign = 'right';
    ctx.fillStyle = theme.text;
    ctx.fillText(layout.x.name + (layout.x.unit ? ' [' + layout.x.unit + ']' : ''), layout.css.w - 4, axisY + 12);
    ctx.textAlign = 'left';
  }

  /**
   * drawSelection(ctx, layout, sel, theme) — translucent range-selection band over
   * the plot area. `sel`={startTime,endTime}. Overlay: call AFTER drawCurves (same
   * ctx, same dpr transform). Does not clear.
   */
  function drawSelection(ctx, layout, sel, theme) {
    theme = theme ? Object.assign({}, DEFAULT_THEME, theme) : DEFAULT_THEME;
    if (!layout || layout.empty || !sel || !layout.x) return;
    ctx.setTransform(layout.dpr || 1, 0, 0, layout.dpr || 1, 0, 0);
    var xs = layout.x.scale, dom = xs.dom;
    var a = Math.max(dom[0], Math.min(dom[1], Math.min(sel.startTime, sel.endTime)));
    var b = Math.max(dom[0], Math.min(dom[1], Math.max(sel.startTime, sel.endTime)));
    var x0 = xs.to(a), x1 = xs.to(b);
    var top = layout.plotArea.y, bot = layout.plotArea.y + layout.plotArea.h;
    ctx.fillStyle = theme.selectionFill;
    ctx.fillRect(x0, top, Math.max(1, x1 - x0), bot - top);
    ctx.strokeStyle = theme.selectionEdge; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(Math.round(x0) + 0.5, top); ctx.lineTo(Math.round(x0) + 0.5, bot);
    ctx.moveTo(Math.round(x1) + 0.5, top); ctx.lineTo(Math.round(x1) + 0.5, bot);
    ctx.stroke();
  }

  /**
   * drawCursor(ctx, layout, cursorTime, cursorLanes, theme, opts) — vertical cursor
   * line across all lanes + a per-lane dot at the cursor's value.
   *   cursorLanes: [{ columnId, value }] (canonical values from computeCursorValues)
   *   opts.dim: true → faded (e.g. cursor retained after the pointer leaves canvas)
   * Overlay: call AFTER drawCurves. Does not clear.
   */
  function drawCursor(ctx, layout, cursorTime, cursorLanes, theme, opts) {
    theme = theme ? Object.assign({}, DEFAULT_THEME, theme) : DEFAULT_THEME; opts = opts || {};
    if (!layout || layout.empty || cursorTime == null || !layout.x) return;
    var xs = layout.x.scale, dom = xs.dom;
    if (cursorTime < dom[0] || cursorTime > dom[1]) return;
    ctx.setTransform(layout.dpr || 1, 0, 0, layout.dpr || 1, 0, 0);
    var x = xs.to(cursorTime);
    var top = layout.plotArea.y, bot = layout.plotArea.y + layout.plotArea.h;
    ctx.save(); ctx.globalAlpha = opts.dim ? 0.4 : 1;
    ctx.strokeStyle = theme.cursor; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, top); ctx.lineTo(Math.round(x) + 0.5, bot); ctx.stroke();
    var byId = {}; (cursorLanes || []).forEach(function (c) { byId[c.columnId] = c; });
    layout.lanes.forEach(function (ln) {
      var c = byId[ln.columnId]; if (!c || c.value == null || !ln.y.scale) return;
      var py = ln.y.scale.to(c.value); if (py < ln.plot.y || py > ln.plot.y + ln.plot.h) return;
      ctx.fillStyle = ln.color; ctx.beginPath(); ctx.arc(x, py, 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  /**
   * scatterLayout(viewport, yawData, opts) → PURE geometry for the V2 Observed Yaw-Response scatter.
   *  yawData = TelemetryView.buildYawResponseData output (scatter:[{steer,yawRate,speed}], speedBins, units).
   *  X = RAW steering, Y = yaw rate (rad/s). Points are coloured by which speed bin they fall in.
   *  No model line, no fit, no ratio conversion — descriptive only.
   */
  function scatterLayout(viewport, yawData, opts) {
    opts = mergeOpts(opts);
    var cssW = Math.max(1, viewport.cssW || 0), cssH = Math.max(1, viewport.cssH || 0);
    var dpr = Math.min(opts.dprCap, Math.max(1, viewport.dpr || 1));
    var pad = opts.padding, theme = opts.theme || DEFAULT_THEME;
    var base = { css: { w: cssW, h: cssH }, dpr: dpr, backing: { w: Math.round(cssW * dpr), h: Math.round(cssH * dpr) } };
    var pts = (yawData && yawData.scatter) || [];
    var plotArea = { x: pad.left, y: pad.top, w: Math.max(1, cssW - pad.left - pad.right), h: Math.max(1, cssH - pad.top - pad.bottom - opts.axisH) };
    base.plotArea = plotArea;
    if (!pts.length) { base.empty = true; base.reason = (yawData && yawData.reason) || 'no-data'; base.points = []; base.x = null; base.y = null; base.bins = []; return base; }
    var xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (var i = 0; i < pts.length; i++) { var p = pts[i]; if (p.steer < xmin) xmin = p.steer; if (p.steer > xmax) xmax = p.steer; if (p.yawRate < ymin) ymin = p.yawRate; if (p.yawRate > ymax) ymax = p.yawRate; }
    var xd = padDomain(xmin, xmax, opts.yPadFrac) || [xmin - 1, xmax + 1];
    var yd = padDomain(ymin, ymax, opts.yPadFrac) || [ymin - 1, ymax + 1];
    var xs = linScale(xd[0], xd[1], plotArea.x, plotArea.x + plotArea.w);
    var ys = linScale(yd[0], yd[1], plotArea.y + plotArea.h, plotArea.y);
    base.empty = false;
    var bins = ((yawData && yawData.speedBins) || []).map(function (b, idx) { return { start: b.speedStart, end: b.speedEnd, color: theme.palette[idx % theme.palette.length], n: b.n }; });
    function colorForSpeed(sp) { for (var k = 0; k < bins.length; k++) { if (sp >= bins[k].start && (sp < bins[k].end || k === bins.length - 1)) return bins[k].color; } return bins.length ? bins[bins.length - 1].color : theme.palette[0]; }
    var units = (yawData && yawData.units) || {};
    base.x = { name: 'steering', unit: units.steer || '', scale: xs, ticks: ticks(xd[0], xd[1], opts.xTicks).map(function (v) { return { v: v, px: xs.to(v) }; }) };
    base.y = { name: 'yaw rate', unit: units.yawRate || 'rad/s', scale: ys, ticks: ticks(yd[0], yd[1], opts.yTicks).map(function (v) { return { v: v, px: ys.to(v) }; }) };
    base.zeroX = (xd[0] <= 0 && 0 <= xd[1]) ? xs.to(0) : null;
    base.zeroY = (yd[0] <= 0 && 0 <= yd[1]) ? ys.to(0) : null;
    base.points = pts.map(function (p) { return { px: xs.to(p.steer), py: ys.to(p.yawRate), color: colorForSpeed(p.speed), speed: p.speed }; });
    base.bins = bins;
    return base;
  }

  /**
   * drawScatter(ctx, layout, theme) — paint the scatter `layout`. Not unit-tested (visual). Caller
   * sizes the canvas to layout.backing/css; this applies the dpr transform itself.
   */
  function drawScatter(ctx, layout, theme) {
    theme = theme ? Object.assign({}, DEFAULT_THEME, theme) : DEFAULT_THEME;
    var dpr = layout.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.css.w, layout.css.h);
    if (theme.bg) { ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, layout.css.w, layout.css.h); }
    ctx.font = '11px -apple-system, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    if (layout.empty) { ctx.fillStyle = theme.textDim; ctx.textAlign = 'center'; ctx.fillText('No steady-state points to plot', layout.css.w / 2, layout.css.h / 2); ctx.textAlign = 'left'; return; }
    var pa = layout.plotArea;
    ctx.strokeStyle = theme.laneBorder; ctx.lineWidth = 1; ctx.strokeRect(pa.x + 0.5, pa.y + 0.5, pa.w - 1, pa.h - 1);
    // y grid + labels
    ctx.fillStyle = theme.textDim; ctx.textAlign = 'right';
    layout.y.ticks.forEach(function (t) { var py = Math.round(t.px) + 0.5; if (py < pa.y - 0.5 || py > pa.y + pa.h + 0.5) return; ctx.strokeStyle = theme.grid; ctx.beginPath(); ctx.moveTo(pa.x, py); ctx.lineTo(pa.x + pa.w, py); ctx.stroke(); ctx.fillStyle = theme.textDim; ctx.fillText(fmt(t.v), pa.x - 6, py); });
    // x grid + labels
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    layout.x.ticks.forEach(function (t) { var px = Math.round(t.px) + 0.5; if (px < pa.x - 0.5 || px > pa.x + pa.w + 0.5) return; ctx.strokeStyle = theme.grid; ctx.beginPath(); ctx.moveTo(px, pa.y); ctx.lineTo(px, pa.y + pa.h); ctx.stroke(); ctx.fillStyle = theme.textDim; ctx.fillText(fmt(t.v), px, pa.y + pa.h + 4); });
    ctx.textBaseline = 'middle';
    // zero references
    if (layout.zeroX != null) { var zx = Math.round(layout.zeroX) + 0.5; ctx.strokeStyle = theme.zero; ctx.beginPath(); ctx.moveTo(zx, pa.y); ctx.lineTo(zx, pa.y + pa.h); ctx.stroke(); }
    if (layout.zeroY != null) { var zy = Math.round(layout.zeroY) + 0.5; ctx.strokeStyle = theme.zero; ctx.beginPath(); ctx.moveTo(pa.x, zy); ctx.lineTo(pa.x + pa.w, zy); ctx.stroke(); }
    // points
    ctx.globalAlpha = 0.6;
    for (var i = 0; i < layout.points.length; i++) { var p = layout.points[i]; if (p.px < pa.x || p.px > pa.x + pa.w || p.py < pa.y || p.py > pa.y + pa.h) continue; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.px, p.py, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    // axis titles
    ctx.fillStyle = theme.text; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(layout.x.name + (layout.x.unit ? ' [' + layout.x.unit + ']' : ''), layout.css.w - 4, pa.y + pa.h + 14);
    ctx.textAlign = 'left'; ctx.fillText(layout.y.name + (layout.y.unit ? ' [' + layout.y.unit + ']' : ''), 4, 2);
    // legend (speed bins)
    if (layout.bins && layout.bins.length) {
      var lx = pa.x + 8, ly = pa.y + 10; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (var b = 0; b < layout.bins.length; b++) { var bn = layout.bins[b]; ctx.fillStyle = bn.color; ctx.fillRect(lx, ly - 4, 8, 8); ctx.fillStyle = theme.textDim; ctx.fillText(fmt(bn.start) + '–' + fmt(bn.end), lx + 12, ly); ly += 14; }
    }
  }

  var api = { plotLayout, drawCurves, drawSelection, drawCursor, scatterLayout, drawScatter, linScale, padDomain, ticks, fmt, PALETTE, DEFAULT_THEME, DEFAULT_OPTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TelemetryPlot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
