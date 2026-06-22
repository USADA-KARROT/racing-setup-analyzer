/**
 * tests/r3.0b-ui.test.js — R3.0B Case Library UI wiring (static, DOM-free).
 * Verifies index.html loads the persistence modules, renders the library (search/filters/save/open/dup/archive/
 * delete/export/import), and that RAW telemetry working state was moved OUT of the Alpine reactive tree into the
 * non-reactive caseDataHolder.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
let pass = 0, fail = 0; const chk = (n, c) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n); } };

// persistence modules loaded, before case-shell
['storage-backend', 'schema-migration', 'case-record-schema', 'case-store', 'session-store', 'case-library-viewmodel'].forEach(function (m) {
  chk('module loaded: ' + m, html.indexOf('js/' + m + '.js"') !== -1);
});
chk('case-store loads before case-shell', html.indexOf('js/case-store.js"') < html.indexOf('js/case-shell.js"'));

// raw working state moved OUT of the reactive tree (CP1 #4)
chk('non-reactive caseDataHolder declared', /const caseDataHolder = \{[^}]*lastSession[^}]*importedBundle/.test(html));
chk('no reactive _lastSession property', html.indexOf('_lastSession: null') === -1 && html.indexOf('this._lastSession') === -1);
chk('no reactive _importedBundle property', html.indexOf('_importedBundle: null') === -1 && html.indexOf('this._importedBundle') === -1);
chk('refs repointed to holder', /caseDataHolder\.lastSession/.test(html) && /caseDataHolder\.importedBundle/.test(html));

// store wiring: IndexedDB backend, no silent memory fallback in the renderer
chk('ensureStore uses IndexedDBBackend', /StorageBackend\.IndexedDBBackend/.test(html));
chk('no memory fallback in renderer', html.indexOf('StorageBackend.MemoryBackend') === -1);
chk('store held non-reactively', /caseDataHolder\.caseStore/.test(html) && /caseDataHolder\.sessionStore/.test(html));
// CP2 r2 #2: session-store is genuinely USED — raw session persisted there (demo + import), case links the id
chk('session-store persists raw session', /caseDataHolder\.sessionStore\.put\(/.test(html) && /_persistSession\(/.test(html));
chk('demo + import both persist a session', (html.match(/this\._persistSession\(/g) || []).length >= 2);
chk('saved case links telemetrySessionId', /telemetrySessionId: caseDataHolder\.lastSessionId/.test(html));
chk('save awaits session persistence (no null-link race)', /sessionPersistPromise\|\|Promise\.resolve\(\)\)\.then/.test(html));
chk('openCase restores lastSessionId from the opened case', /caseDataHolder\.lastSessionId=\(o\.associations&&o\.associations\.telemetrySessionId\)/.test(html));
// CP2 r5: stale-async guard — a monotonic token prevents an in-flight persist from clobbering a newly-opened case
chk('session-op token guards stale persistence', /sessionOpToken/.test(html) && /tok!==caseDataHolder\.sessionOpToken/.test(html) && /\+\+caseDataHolder\.sessionOpToken/.test(html));
// CP2 r2 #1: imported summary can't be promoted via Save-as-new
chk('save-as-new guarded for imported summary', /saveCurrentCaseAsNew\(\)[\s\S]{0,120}importedSummaryOpen/.test(html));

// library panel + controls
chk('Case Library panel', /Case Library/.test(html));
chk('save button → saveCurrentCase', /@click="saveCurrentCase\(\)"/.test(html));
chk('save-as-new button', /@click="saveCurrentCaseAsNew\(\)"/.test(html));
chk('open button', /@click="openCase\(row\.caseId\)"/.test(html));
chk('duplicate button', /@click="duplicateCase\(row\.caseId\)"/.test(html));
chk('archive toggle', /@click="archiveCase\(row\.caseId, ?!row\.archived\)"/.test(html));
chk('delete button', /@click="deleteCase\(row\.caseId\)"/.test(html));
chk('export control', /@click="exportCaseRow\(currentCaseId\)"/.test(html));
chk('import file control', /@change="importCaseFile\(\$event\)"/.test(html));
chk('search + vehicle filters', /x-model="libFilters\.search"/.test(html) && /x-model="libFilters\.vehicle"/.test(html));
chk('includeArchived filter', /x-model="libFilters\.includeArchived"/.test(html));
chk('library rows iterate (bucketed)', /x-for="row in sec\.rows"/.test(html));
chk('per-row indicators shown', /row\.indicators\.measured/.test(html));
chk('imported badge', /row\.recordType==='imported_summary'/.test(html));
chk('imported-summary degraded notice', /Imported summary — full section detail not included/.test(html));
chk('empty-state honest', /No saved cases/.test(html));

// methods present + honest gates
chk('delete uses confirm', /deleteCase\(id\)\{[\s\S]{0,200}confirm\(/.test(html));
chk('remove passes confirm:true', /\.remove\(id, ?\{ ?confirm: ?true ?\}\)/.test(html));
chk('open restores analysisView + shellEvidence', /openCase\(id\)\{[\s\S]{0,400}self\.analysisView=o\.analysisResults[\s\S]{0,200}self\._shellEvidence/.test(html));
chk('save serializes the view model (display-safe)', /analysisResults: JSON\.parse\(JSON\.stringify\(this\.analysisView\)\)/.test(html));
chk('storageError surfaced', /x-text="'Storage: '\+storageError"/.test(html));
// CP3: autosave (§7.3) — debounced, gated to a saved local_full case (never auto-creates / never promotes imported)
chk('autosave method gated to saved local_full', /autosaveCurrentCase\(\)\{[\s\S]{0,220}!this\.currentCaseId \|\| this\.importedSummaryOpen/.test(html));
chk('autosave debounced (timer)', /caseDataHolder\.autosaveTimer=setTimeout/.test(html));
chk('autosave toggle in UI', /x-model="autosaveEnabled"/.test(html));
// CP3: imported summary renders a SAFE degraded view (full workspace gated off so it cannot deref missing setupInputs)
chk('imported-summary degraded view present', /id="importedSummaryView"/.test(html));
chk('full workspace gated to local (not imported)', /analysisView && !importedSummaryOpen/.test(html));
// §7.4: full filter set + pinned/recent/archived buckets + persisted pin action
chk('track filter wired', /x-model="libFilters\.track"/.test(html));
chk('status filter wired', /x-model="libFilters\.status"/.test(html));
chk('date filter wired', /x-model="libFilters\.fromDate"/.test(html));
chk('renders buckets via libSections', /x-for="sec in libSections\(\)"/.test(html) && /libSections\(\)\{[\s\S]{0,260}buckets/.test(html));
chk('pin action present + persisted', /@click="pinCase\(row\.caseId, ?!row\.pinned\)"/.test(html) && /setPinned/.test(require('fs').readFileSync(require('path').join(__dirname,'..','renderer','js','case-store.js'),'utf8')));
chk('corner indicator shown in list', /row\.indicators\.corner/.test(html));
chk('telemetry indicator shown in list', /row\.indicators\.telemetry/.test(html));
chk('archived bucket rendered from view model (b.archived)', /rows:b\.archived/.test(html));

console.log(`r3.0b-ui: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
