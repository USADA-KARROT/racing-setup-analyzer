/**
 * case-store.js — R3.0B: local-first Analysis Case CRUD over a storage backend (PURE logic; backend injected).
 *
 * createCaseStore(backend, opts) → { create, save, open, duplicate, archive, unarchive, remove, list, exportCase,
 *   importBundle, compact }. Every mutation is ONE atomic backend.transact over [cases, caseIndex] (payload + index
 *   committed together — no two-phase window). save-update requires an existing index entry (a deleted case is not
 *   resurrected); create aborts on id collision. Raw telemetry never enters a case record (sanitizeForStorage is
 *   all-or-nothing). exportCase = a curated closed portable bundle; importBundle re-validates + stores as
 *   imported_summary (never promoted to local_full).
 *
 * UMD: Node require / Electron renderer global (CaseStore).
 */
(function (root) {
  'use strict';
  function _req(p, g) { try { if (typeof module !== 'undefined' && module.exports) return require(p); } catch (e) { } return (root && root[g]) || null; }
  var CRS = _req('./case-record-schema.js', 'CaseRecordSchema');
  var MIG = _req('./schema-migration.js', 'SchemaMigration');

  var IDX = 'caseIndex', PAY = 'cases', IDXKEY = '__index';

  function _now(stamp) { return stamp || (typeof Date !== 'undefined' ? new Date().toISOString() : '1970-01-01T00:00:00.000Z'); }
  function _newId() { var t = (typeof Date !== 'undefined' ? Date.now() : 0).toString(36); var r = Math.floor((typeof Math !== 'undefined' ? Math.random() : 0) * 1e9).toString(36); return ('case_' + t + '_' + r).slice(0, 60); }
  function _err(code, extra) { var e = new Error(code); e.code = code; if (extra) Object.assign(e, extra); return e; }
  function _capFlags(shellEvidence) { var c = (shellEvidence && shellEvidence.capability) || {}; var out = {}; Object.keys(c).forEach(function (k) { if (typeof c[k] === 'boolean') out[k] = c[k]; }); return out; }
  function _metaSummary(rec) {
    var md = rec.metadata || {};
    return { title: md.title || null, vehicle: md.vehicle || null, track: md.track || null, status: md.status || 'draft', pinned: !!md.pinned, archived: !!md.archived, createdAt: md.createdAt || null, updatedAt: md.updatedAt || null, recordType: rec.recordType || 'local_full', source: (rec.shellEvidence && rec.shellEvidence.source) || null, capability: _capFlags(rec.shellEvidence) };
  }

  function createCaseStore(backend, opts) {
    opts = opts || {};
    if (!backend || typeof backend.transact !== 'function') throw new Error('createCaseStore: a backend with transact is required');
    var schema = opts.schema || CRS, migration = opts.migration || MIG;

    function _buildRecord(input, recordType, stamp) {
      var md = input.metadata || {};
      var rec = {
        schemaVersion: migration.CASE_SCHEMA_VERSION, recordType: recordType, caseId: input.caseId || _newId(),
        metadata: { title: md.title || 'Untitled case', note: md.note || null, vehicle: md.vehicle || null, track: md.track || null, status: md.status || 'complete', createdAt: md.createdAt || _now(stamp), updatedAt: _now(stamp), pinned: !!md.pinned, archived: !!md.archived },
        associations: Object.assign({ vehicleProfileId: null, setupRevisionId: null, telemetrySessionId: null, trackId: null, parentCaseId: null, comparisonGroupId: null, experimentId: null, followUpCaseIds: [] }, input.associations || {}),
        setupSnapshot: input.setupSnapshot || {}, analysisResults: input.analysisResults || {}, shellEvidence: input.shellEvidence || {},
      };
      // sanitize the COMPLETE assembled record (all-or-nothing) — no field (associations/metadata/etc) bypasses the bound
      var san = schema.sanitizeForStorage(rec);
      if (!san.ok) throw _err('RECORD_NOT_STORABLE', { violations: san.violations });
      return san.value;
    }
    function _writeCase(rec, mode) {
      return backend.transact({ stores: [PAY, IDX], reads: [{ store: IDX, key: IDXKEY }, { store: PAY, key: rec.caseId }], compute: function (rv) {
        var idx = rv[0] || { ids: {} }; if (!idx.ids) idx.ids = {};
        var prev = idx.ids[rec.caseId], prevPayload = rv[1];
        if (mode === 'create' && prev) throw _err('ID_COLLISION', { caseId: rec.caseId });
        if (mode === 'update') {
          if (!prev) throw _err('CASE_NOT_FOUND', { caseId: rec.caseId }); // no resurrection
          if (prev.recordType === 'imported_summary') throw _err('CANNOT_OVERWRITE_IMPORTED', { caseId: rec.caseId }); // never promote imported→local_full
          if (prevPayload && typeof prevPayload.schemaVersion === 'number' && prevPayload.schemaVersion > migration.CASE_SCHEMA_VERSION) throw _err('CANNOT_OVERWRITE_FUTURE', { caseId: rec.caseId }); // never clobber a newer-version record with an older one
        }
        idx.ids[rec.caseId] = _metaSummary(rec);
        return { writes: [{ store: PAY, key: rec.caseId, value: rec }, { store: IDX, key: IDXKEY, value: idx }], result: { caseId: rec.caseId } };
      } }).then(function (r) { return { ok: true, caseId: r.caseId, record: rec }; }, function (e) { return { ok: false, code: e.code || 'STORE_ERROR', error: String(e && e.message || e), violations: e.violations }; });
    }

    return {
      create: function (input) { var rec; try { rec = _buildRecord(input || {}, 'local_full', opts.stamp); } catch (e) { return Promise.resolve({ ok: false, code: e.code || 'RECORD_NOT_STORABLE', violations: e.violations, error: String(e.message) }); } return _writeCase(rec, 'create'); },
      save: function (input) { input = input || {}; var mode = input.caseId ? 'update' : 'create'; var rec; try { rec = _buildRecord(input, 'local_full', opts.stamp); } catch (e) { return Promise.resolve({ ok: false, code: e.code || 'RECORD_NOT_STORABLE', violations: e.violations, error: String(e.message) }); } return _writeCase(rec, mode); },
      open: function (caseId) {
        return backend.get(PAY, caseId).then(function (rec) {
          if (!rec) return { ok: false, code: 'CASE_NOT_FOUND' };
          var m = migration.migrateCaseRecord(rec);
          if (!m.ok) return { ok: false, code: m.reason, rejected: true };
          var r = m.record;
          return { ok: true, caseId: r.caseId, recordType: r.recordType, migrations: m.migrations, metadata: r.metadata, associations: r.associations, setupSnapshot: r.setupSnapshot, analysisResults: r.analysisResults, shellEvidence: r.shellEvidence, degraded: r.recordType === 'imported_summary' };
        });
      },
      duplicate: function (caseId, overrides) {
        var self = this;
        return self.open(caseId).then(function (o) {
          if (!o.ok) return o; if (o.recordType === 'imported_summary') return { ok: false, code: 'CANNOT_DUPLICATE_IMPORTED_SUMMARY' };
          var clone = JSON.parse(JSON.stringify({ metadata: Object.assign({}, o.metadata, { title: (overrides && overrides.title) || (o.metadata.title + ' (copy)'), createdAt: null, updatedAt: null }), associations: Object.assign({}, o.associations, { parentCaseId: caseId, followUpCaseIds: [] }), setupSnapshot: o.setupSnapshot, analysisResults: o.analysisResults, shellEvidence: o.shellEvidence }));
          return self.create(clone); // fresh caseId; deep-cloned (no shared mutable refs)
        });
      },
      _setArchived: function (caseId, archived) {
        return backend.transact({ stores: [PAY, IDX], reads: [{ store: IDX, key: IDXKEY }, { store: PAY, key: caseId }], compute: function (rv) {
          var idx = rv[0] || { ids: {} }; var rec = rv[1]; if (!rec || !idx.ids[caseId]) throw _err('CASE_NOT_FOUND');
          if (typeof rec.schemaVersion === 'number' && rec.schemaVersion > migration.CASE_SCHEMA_VERSION) throw _err('CANNOT_OVERWRITE_FUTURE', { caseId: caseId });
          rec.metadata.archived = archived; rec.metadata.status = archived ? 'archived' : (rec.metadata.status === 'archived' ? 'complete' : rec.metadata.status); rec.metadata.updatedAt = _now(opts.stamp);
          idx.ids[caseId] = _metaSummary(rec);
          return { writes: [{ store: PAY, key: caseId, value: rec }, { store: IDX, key: IDXKEY, value: idx }], result: { caseId: caseId, archived: archived } };
        } }).then(function (r) { return { ok: true, caseId: r.caseId, archived: r.archived }; }, function (e) { return { ok: false, code: e.code || 'STORE_ERROR' }; });
      },
      archive: function (caseId) { return this._setArchived(caseId, true); },
      unarchive: function (caseId) { return this._setArchived(caseId, false); },
      setPinned: function (caseId, pinned) {
        return backend.transact({ stores: [PAY, IDX], reads: [{ store: IDX, key: IDXKEY }, { store: PAY, key: caseId }], compute: function (rv) {
          var idx = rv[0] || { ids: {} }; var rec = rv[1]; if (!rec || !idx.ids[caseId]) throw _err('CASE_NOT_FOUND');
          if (typeof rec.schemaVersion === 'number' && rec.schemaVersion > migration.CASE_SCHEMA_VERSION) throw _err('CANNOT_OVERWRITE_FUTURE', { caseId: caseId });
          rec.metadata.pinned = !!pinned; rec.metadata.updatedAt = _now(opts.stamp);
          idx.ids[caseId] = _metaSummary(rec);
          return { writes: [{ store: PAY, key: caseId, value: rec }, { store: IDX, key: IDXKEY, value: idx }], result: { caseId: caseId, pinned: !!pinned } };
        } }).then(function (r) { return { ok: true, caseId: r.caseId, pinned: r.pinned }; }, function (e) { return { ok: false, code: e.code || 'STORE_ERROR' }; });
      },
      remove: function (caseId, conf) {
        if (!conf || conf.confirm !== true) return Promise.resolve({ ok: false, code: 'CONFIRM_REQUIRED' }); // fail-closed
        return backend.transact({ stores: [PAY, IDX], reads: [{ store: IDX, key: IDXKEY }], compute: function (rv) {
          var idx = rv[0] || { ids: {} }; delete idx.ids[caseId];
          return { writes: [{ store: PAY, key: caseId, op: 'delete' }, { store: IDX, key: IDXKEY, value: idx }], result: { caseId: caseId } };
        } }).then(function () { return { ok: true, caseId: caseId }; }, function (e) { return { ok: false, code: e.code || 'STORE_ERROR' }; });
      },
      list: function () { return backend.get(IDX, IDXKEY).then(function (idx) { idx = idx || { ids: {} }; return Object.keys(idx.ids || {}).map(function (id) { return Object.assign({ caseId: id }, idx.ids[id]); }); }); },
      exportCase: function (caseId) {
        return this.open(caseId).then(function (o) { if (!o.ok) return o; var b = schema.toPortableBundle({ caseId: o.caseId, recordType: 'local_full', metadata: o.metadata, associations: o.associations, setupSnapshot: o.setupSnapshot, analysisResults: o.analysisResults, shellEvidence: o.shellEvidence }); return b.ok ? { ok: true, bundle: b.bundle } : { ok: false, code: b.reason, field: b.field }; });
      },
      importBundle: function (bundle) {
        var v = schema.validatePortableBundle(bundle);
        if (!v.ok) return Promise.resolve({ ok: false, code: v.reason, field: v.field, detail: v.detail });
        var b = v.bundle, rs = b.resultsSummary || {}, se = b.shellEvidenceSummary || {};
        // store as imported_summary — NEVER promoted to a full analysisView
        var rec = {
          schema: undefined, recordType: 'imported_summary', caseId: _newId(),
          metadata: Object.assign({}, b.metadata, { title: (b.metadata.title || 'Imported') + ' (imported)', createdAt: b.metadata.createdAt, updatedAt: _now(opts.stamp), status: b.metadata.status }),
          associations: Object.assign({}, b.associations, { followUpCaseIds: [] }),
          setupSnapshot: b.setupSnapshotSummary || {},
          analysisResults: { caseHeader: { overallStatus: rs.overallStatus }, capabilitySummary: rs.capabilitySummary || [], modelPrediction: { understeerGradient: { value: rs.understeerGradient }, predictedTendency: { value: rs.predictedTendency } }, measuredMetrics: { measuredKUs: { value: rs.measuredKUs }, agreementClass: rs.agreementClass, dataProvenance: rs.provenance }, modelVsActual: { blockedReasons: rs.blockedReasons || [] } },
          shellEvidence: { capability: se.capability || {}, observation: { blockedReasons: se.observationBlockedReasons || [] }, source: 'imported_bundle' },
        };
        rec.schemaVersion = migration.CASE_SCHEMA_VERSION;
        return _writeCase(rec, 'create');
      },
      compact: function () { /* defensive sweep (atomic): delete payloads not referenced by the index, in ONE transaction */
        return backend.list(PAY).then(function (rows) {
          var keys = (rows || []).map(function (r) { return r.key; });
          return backend.transact({ stores: [PAY, IDX], reads: [{ store: IDX, key: IDXKEY }], compute: function (rv) {
            var idx = rv[0] || { ids: {} }, ids = idx.ids || {}, writes = [];
            keys.forEach(function (k) { if (!ids[k]) writes.push({ store: PAY, key: k, op: 'delete' }); }); // a payload absent from the index (re-read inside the txn) is a true orphan — atomic writes never leave a payload unindexed
            return { writes: writes, result: { removed: writes.length } };
          } });
        }).then(function (r) { return { ok: true, removed: r.removed }; }, function (e) { return { ok: false, code: e.code || 'STORE_ERROR' }; });
      },
    };
  }

  var api = { createCaseStore: createCaseStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CaseStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
