/**
 * telemetry-interact.js — V1 Step 3-(iii)-a: PURE interaction geometry.
 *
 * Per consensus, every interaction (cursor / hover / zoom / pan / range-select)
 * maps back to RAW time and RAW source index — the decimated display points are
 * for drawing only. These functions encode that mapping with no DOM, no canvas,
 * no events, so they are fully node-testable. The canvas event wiring + UX
 * (iii-b) consumes them later.
 *
 * Window/selection are expressed in TIME (raw seconds or raw row index when the
 * x-axis is 'index'); indices returned are RAW source rows into the original
 * (non-decimated) data.
 *
 * UMD: Node require / Electron renderer global (TelemetryInteract). No deps
 * (operates on a `layout` produced by TelemetryPlot.plotLayout + raw arrays).
 */
(function (root) {
  'use strict';

  // px → x-domain value (raw time, or raw row index when x.kind==='index'). No clamp.
  function pixelToTime(px, layout) {
    if (!layout || !layout.x || !layout.x.scale) return null;
    return layout.x.scale.inv(px);
  }

  // nearest index into an ascending `timeValues` array (binary search).
  // Returns -1 for an empty array. Clamps to the ends outside the range.
  function timeToNearestSourceIndex(time, timeValues) {
    var n = timeValues ? timeValues.length : 0;
    if (!n) return -1;
    if (time <= timeValues[0]) return 0;
    if (time >= timeValues[n - 1]) return n - 1;
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (timeValues[mid] < time) lo = mid; else hi = mid; }
    return (time - timeValues[lo]) <= (timeValues[hi] - time) ? lo : hi;
  }

  /**
   * buildTimeIndex(timeValues) — build a strictly-non-decreasing valid-time index that maps back
   * to RAW source rows, from a `timeValues` array that may contain holes or a broken timebase.
   *   { raw, times, rows, usable, invalidCount, duplicateCount, resetCount }
   * raw       = the original array (so callers can read raw[row] for display).
   * times[k]  = the k-th USABLE time;  rows[k] = its RAW source row (binary search lives on times).
   * Policy (per review — fail closed, never silently launder a broken timebase):
   *   • null / undefined / NaN / ±Infinity  → skipped + counted (no legal time position).
   *   • duplicate timestamp (v === prev)    → KEPT (non-decreasing is fine for binary search;
   *                                            timeToNearestSourceIndex ties to the lower row) + counted.
   *   • time goes BACKWARDS (v < prev)       → counted; the WHOLE index is marked usable:false.
   * `usable:false` means a global reset/corruption makes nearest-row mapping unsafe; callers MUST
   * disable cursor/selection rather than dropping the reversal and drawing as if normal.
   */
  function buildTimeIndex(timeValues) {
    var raw = timeValues || [];
    var times = [], rows = [];
    var invalidCount = 0, duplicateCount = 0, resetCount = 0, prev = null;
    for (var i = 0; i < raw.length; i++) {
      var v = raw[i];
      if (v == null || typeof v !== 'number' || !isFinite(v)) { invalidCount++; continue; }
      if (prev !== null) {
        if (v < prev) { resetCount++; continue; }   // backwards → reset (counted; index→unusable)
        if (v === prev) duplicateCount++;            // duplicate kept (non-decreasing)
      }
      times.push(v); rows.push(i); prev = v;
    }
    return { raw: raw, times: times, rows: rows, usable: resetCount === 0,
      invalidCount: invalidCount, duplicateCount: duplicateCount, resetCount: resetCount };
  }

  // accept either a raw timeValues array (back-compat) or a prebuilt timeIndex object.
  function _asTimeIndex(timeRef) {
    if (Array.isArray(timeRef)) return buildTimeIndex(timeRef);
    return timeRef || { raw: [], times: [], rows: [], usable: false };
  }

  // nearest RAW source row to `time` via a timeIndex (from buildTimeIndex).
  // Returns -1 when empty OR when the index is unusable (timebase reset → mapping unsafe).
  function nearestRowByTime(time, timeIndex) {
    if (!timeIndex || !timeIndex.usable) return -1;
    var k = timeToNearestSourceIndex(time, timeIndex.times);
    return k < 0 ? -1 : timeIndex.rows[k];
  }

  /**
   * computeCursorValues(time, timeValues, laneReaders) — readout at the cursor,
   * sampled from RAW rows (not display points).
   *   laneReaders: [{ columnId, rawName, canonicalName, unit, values, factor }]
   *     values  = original column array; factor = canonical conversion (1 if none / raw)
   * Returns { row, time, lanes:[{ columnId, rawName, canonicalName, unit, rawValue, value }] }
   */
  function computeCursorValues(time, timeRef, laneReaders) {
    var idx = _asTimeIndex(timeRef);          // accepts a raw array (back-compat) or a timeIndex
    var row = nearestRowByTime(time, idx);     // RAW source row, or -1 when unusable/empty
    var lanes = (laneReaders || []).map(function (r) {
      var raw = (row >= 0 && r.values) ? r.values[row] : null;
      var f = (r.factor == null ? 1 : r.factor);
      return {
        columnId: r.columnId, rawName: r.rawName, canonicalName: r.canonicalName, unit: r.unit,
        rawValue: raw, value: raw == null ? null : raw * f,
      };
    });
    return { row: row, time: row >= 0 ? idx.raw[row] : null, lanes: lanes };
  }

  // clamp [xMin,xMax] into fullDomain {min,max}, keeping width when possible,
  // enforcing a minimum width so a window never collapses to zero.
  function clampWindow(xMin, xMax, fullDomain, minWidth) {
    var min = fullDomain.min, max = fullDomain.max, fullW = max - min;
    var lo = Math.min(xMin, xMax), hi = Math.max(xMin, xMax);
    var mw = (minWidth != null ? minWidth : (fullW > 0 ? fullW * 1e-3 : 0));
    var w = Math.max(hi - lo, mw);
    if (w >= fullW) return { startTime: min, endTime: max };
    if (hi - lo < w) { var c = (lo + hi) / 2; lo = c - w / 2; hi = c + w / 2; } // enforce min width about centre
    if (lo < min) { lo = min; hi = lo + w; }
    if (hi > max) { hi = max; lo = hi - w; }
    if (lo < min) lo = min;
    return { startTime: lo, endTime: hi };
  }

  // zoom about `anchorTime` so the anchor stays at the same relative position
  // (no drift). factor = newWidth/oldWidth: <1 zoom in, >1 zoom out.
  function zoomWindow(anchorTime, factor, currentWindow, fullDomain) {
    var w = currentWindow.endTime - currentWindow.startTime;
    var nw = w * factor;
    var frac = w > 0 ? (anchorTime - currentWindow.startTime) / w : 0.5;
    frac = Math.max(0, Math.min(1, frac));
    var ns = anchorTime - frac * nw;
    return clampWindow(ns, ns + nw, fullDomain);
  }

  // pan by deltaTime, keeping the window width (bumps against the domain edges).
  function panWindow(deltaTime, currentWindow, fullDomain) {
    var w = currentWindow.endTime - currentWindow.startTime;
    return clampWindow(currentWindow.startTime + deltaTime, currentWindow.endTime + deltaTime, fullDomain, w);
  }

  /**
   * selectionFromPixels(x0, x1, layout, timeValues) — a drag-selection rectangle
   * (two pixel x's) → the canonical selection contract:
   *   { startTime, endTime, startIndex, endIndex, source:'user_drag' }
   * startIndex/endIndex are RAW source rows. Returns null if the layout has no x.
   */
  function selectionFromPixels(x0, x1, layout, timeRef) {
    var t0 = pixelToTime(x0, layout), t1 = pixelToTime(x1, layout);
    if (t0 == null || t1 == null) return null;
    var idx = _asTimeIndex(timeRef);           // shared valid-time index (same one the cursor uses)
    var dom = layout.x.scale.dom;
    var a = Math.max(dom[0], Math.min(dom[1], Math.min(t0, t1)));
    var b = Math.max(dom[0], Math.min(dom[1], Math.max(t0, t1)));
    return {
      startTime: a, endTime: b,
      startIndex: nearestRowByTime(a, idx),    // RAW source rows (−1 when index unusable)
      endIndex: nearestRowByTime(b, idx),
      source: 'user_drag',
    };
  }

  /**
   * summarizeSelection(startIndex, endIndex, laneReaders) — per-channel stats over a
   * RAW row range [startIndex,endIndex] (inclusive). Derived live from the selection
   * object + original rows (no second stored state). Skips null samples.
   *   laneReaders: [{ columnId, rawName, canonicalName, unit, values, factor }]
   * Returns { startIndex, endIndex, rowCount, lanes:[{ columnId, rawName, canonicalName,
   *   unit, count, min, max, mean }] }  (min/max/mean are canonical; null when no samples)
   */
  function summarizeSelection(startIndex, endIndex, laneReaders) {
    var a = Math.min(startIndex, endIndex), b = Math.max(startIndex, endIndex);
    var rowCount = (a >= 0 && b >= 0) ? (b - a + 1) : 0;
    var lanes = (laneReaders || []).map(function (r) {
      var f = (r.factor == null ? 1 : r.factor);
      var mn = Infinity, mx = -Infinity, sum = 0, cnt = 0;
      for (var i = a; i <= b; i++) {
        var raw = r.values ? r.values[i] : null;
        if (raw == null) continue;
        var v = raw * f; if (v < mn) mn = v; if (v > mx) mx = v; sum += v; cnt++;
      }
      return {
        columnId: r.columnId, rawName: r.rawName, canonicalName: r.canonicalName, unit: r.unit,
        count: cnt, min: cnt ? mn : null, max: cnt ? mx : null, mean: cnt ? sum / cnt : null,
      };
    });
    return { startIndex: a, endIndex: b, rowCount: rowCount, lanes: lanes };
  }

  var api = { pixelToTime, timeToNearestSourceIndex, buildTimeIndex, nearestRowByTime, computeCursorValues, clampWindow, zoomWindow, panWindow, selectionFromPixels, summarizeSelection };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TelemetryInteract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
