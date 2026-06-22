/**
 * tests/case-library-viewmodel.test.js — R3.0B pure library view model (search/filters/buckets/indicators).
 */
'use strict';
const L = require('../renderer/js/case-library-viewmodel.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

const recs = [
  { caseId: 'a', title: 'Lihpao baseline', vehicle: 'F3', track: 'Lihpao', status: 'complete', pinned: true, archived: false, updatedAt: '2026-06-20', capability: { telemetryObservable: true, measuredKUsEligible: true, cornerCoachingEligible: true } },
  { caseId: 'b', title: 'Wet test', vehicle: 'F4', track: 'Penbay', status: 'draft', pinned: false, archived: false, updatedAt: '2026-06-21', capability: { telemetryInspectable: true } },
  { caseId: 'c', title: 'Old archived', vehicle: 'F3', track: 'Lihpao', status: 'archived', pinned: false, archived: true, updatedAt: '2026-06-10', capability: {} },
];

(() => { const v = L.buildCaseLibraryView(recs, {}); chk('archived excluded by default', v.rows.length === 2); chk('counts total', v.counts.total === 3); chk('pinned bucket', v.buckets.pinned.length === 1 && v.buckets.pinned[0].caseId === 'a'); chk('archived bucket lists archived', v.buckets.archived.length === 1); })();
(() => { const v = L.buildCaseLibraryView(recs, { includeArchived: true }); chk('includeArchived shows all', v.rows.length === 3); })();
(() => { const v = L.buildCaseLibraryView(recs, {}); chk('archived bucket has FULL rows (indicators+status)', v.buckets.archived.length === 1 && v.buckets.archived[0].status === 'archived' && !!v.buckets.archived[0].indicators); })();
(() => { const v = L.buildCaseLibraryView(recs, { search: 'wet' }); chk('search by title', v.rows.length === 1 && v.rows[0].caseId === 'b'); })();
(() => { const v = L.buildCaseLibraryView(recs, { vehicle: 'F3' }); chk('vehicle filter', v.rows.length === 1 && v.rows[0].caseId === 'a'); })();
(() => { const v = L.buildCaseLibraryView(recs, { track: 'penbay' }); chk('track filter (case-insensitive)', v.rows.length === 1 && v.rows[0].caseId === 'b'); })();
(() => { const v = L.buildCaseLibraryView(recs, { status: 'draft' }); chk('status filter', v.rows.length === 1 && v.rows[0].caseId === 'b'); })();
(() => { const v = L.buildCaseLibraryView(recs, { fromDate: '2026-06-21' }); chk('fromDate filter', v.rows.length === 1 && v.rows[0].caseId === 'b'); })();
(() => { const v = L.buildCaseLibraryView(recs, {}); const a = v.rows.find(r => r.caseId === 'a'); chk('indicators from stored capability', a.indicators.telemetry === 'observable' && a.indicators.measured === 'measured' && a.indicators.corner === 'eligible'); const b = v.rows.find(r => r.caseId === 'b'); chk('indicators degrade honestly', b.indicators.telemetry === 'inspectable' && b.indicators.measured === 'uncalibrated' && b.indicators.corner === 'none'); })();
(() => { const v = L.buildCaseLibraryView([], {}); chk('empty library', v.rows.length === 0 && v.counts.total === 0); })();
(() => { const v = L.buildCaseLibraryView(null, null); chk('null-safe', v.rows.length === 0); })();
(() => { const v = L.buildCaseLibraryView(recs, {}); chk('sorted by updatedAt desc', v.rows[0].caseId === 'b'); })();

console.log(`case-library-viewmodel: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
