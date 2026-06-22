/**
 * case-library-viewmodel.js — R3.0B: PURE view model for the Analysis Cases library.
 *
 * buildCaseLibraryView(records, filters) → { rows, buckets:{pinned,recent,archived}, counts, indicators per row }.
 * Reads the STORED index meta-summaries (title/vehicle/track/status/pinned/archived/dates/capability) — it does NOT
 * re-decide eligibility or load payloads. Search + vehicle/track/date/status filters; pinned/archived/recent buckets;
 * per-row telemetry/calibration/corner availability indicators derived from the stored capability flags.
 *
 * UMD: Node require / Electron renderer global (CaseLibraryViewModel).
 */
(function (root) {
  'use strict';

  function _s(v) { return (v == null ? '' : String(v)).toLowerCase(); }
  function _indicators(cap) {
    cap = cap || {};
    return {
      telemetry: cap.telemetryObservable === true ? 'observable' : (cap.telemetryInspectable === true ? 'inspectable' : 'none'),
      measured: cap.measuredKUsEligible === true ? 'measured' : (cap.calibratedMagnitudeEligible === true ? 'calibrated' : 'uncalibrated'),
      corner: cap.cornerCoachingEligible === true ? 'eligible' : 'none',
    };
  }

  function buildCaseLibraryView(records, filters) {
    records = Array.isArray(records) ? records : [];
    filters = filters || {};
    var q = _s(filters.search);
    var fv = _s(filters.vehicle), ft = _s(filters.track), fs = filters.status ? String(filters.status) : null;
    var fromDate = filters.fromDate || null, toDate = filters.toDate || null;
    var includeArchived = filters.includeArchived === true;

    var rows = records.map(function (r) {
      return {
        caseId: r.caseId, title: r.title || 'Untitled case', vehicle: r.vehicle || null, track: r.track || null,
        status: r.status || 'draft', pinned: !!r.pinned, archived: !!r.archived, recordType: r.recordType || 'local_full',
        createdAt: r.createdAt || null, updatedAt: r.updatedAt || null, source: r.source || null,
        indicators: _indicators(r.capability),
      };
    }).filter(function (r) {
      if (!includeArchived && r.archived) return false;
      if (fs && r.status !== fs) return false;
      if (fv && _s(r.vehicle).indexOf(fv) === -1) return false;
      if (ft && _s(r.track).indexOf(ft) === -1) return false;
      if (fromDate && (r.updatedAt || r.createdAt || '') < fromDate) return false;
      if (toDate && (r.updatedAt || r.createdAt || '') > toDate) return false;
      if (q) { var hay = _s(r.title) + ' ' + _s(r.vehicle) + ' ' + _s(r.track); if (hay.indexOf(q) === -1) return false; }
      return true;
    });

    function mapRow(r) {
      return {
        caseId: r.caseId, title: r.title || 'Untitled case', vehicle: r.vehicle || null, track: r.track || null,
        status: r.status || 'draft', pinned: !!r.pinned, archived: !!r.archived, recordType: r.recordType || 'local_full',
        createdAt: r.createdAt || null, updatedAt: r.updatedAt || null, source: r.source || null, indicators: _indicators(r.capability),
      };
    }
    function byUpdatedDesc(a, b) { return (b.updatedAt || b.createdAt || '') < (a.updatedAt || a.createdAt || '') ? -1 : 1; }
    var sorted = rows.slice().sort(byUpdatedDesc);
    var pinned = sorted.filter(function (r) { return r.pinned; });
    var recent = sorted.filter(function (r) { return !r.pinned; }).slice(0, filters.recentLimit || 20);
    // full archived rows (independent of the includeArchived list filter) so the UI can render b.archived directly
    var archivedAll = records.filter(function (r) { return r.archived; }).map(mapRow).sort(byUpdatedDesc);

    return {
      rows: sorted,
      buckets: { pinned: pinned, recent: recent, archived: archivedAll },
      counts: { total: records.length, shown: sorted.length, pinned: pinned.length, archived: archivedAll.length },
    };
  }

  var api = { buildCaseLibraryView: buildCaseLibraryView };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CaseLibraryViewModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
