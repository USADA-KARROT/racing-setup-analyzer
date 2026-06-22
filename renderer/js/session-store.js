/**
 * session-store.js — R3.0B: local-only telemetry session storage, SEPARATE from case records (PURE; backend injected).
 *
 * Raw telemetry SAMPLES live ONLY here. Bounded by SIZE (maxSessionBytes per session, maxRawBytes total) — NOT the
 * case-record array cap (raw sessions legitimately hold large sample arrays). Oldest-evicted when over the total
 * budget, with a bounded eviction log embedded in the SAME `sessionIndex/__index` envelope (one atomic transact →
 * index + log can never diverge). Raw sessions are NEVER auto-uploaded and NEVER part of a portable case bundle;
 * exportRawArchive(id) is an explicit opt-in, distinct from the case export.
 *
 * UMD: Node require / Electron renderer global (SessionStore).
 */
(function (root) {
  'use strict';
  function _req(p, g) { try { if (typeof module !== 'undefined' && module.exports) return require(p); } catch (e) { } return (root && root[g]) || null; }
  var MIG = _req('./schema-migration.js', 'SchemaMigration');

  var SIDX = 'sessionIndex', SPAY = 'sessions', IDXKEY = '__index', LOG_CAP = 64;

  function _now(stamp) { return stamp || (typeof Date !== 'undefined' ? new Date().toISOString() : '1970-01-01T00:00:00.000Z'); }
  function _newId() { var t = (typeof Date !== 'undefined' ? Date.now() : 0).toString(36); var r = Math.floor((typeof Math !== 'undefined' ? Math.random() : 0) * 1e9).toString(36); return ('sess_' + t + '_' + r).slice(0, 60); }
  function _utf8Len(str) { try { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length; } catch (e) { } var n = 0; for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xD800 && c <= 0xDBFF) ? (i++, 4) : 3; } return n; }
  function _bytes(v) { try { return _utf8Len(JSON.stringify(v)); } catch (e) { return Infinity; } } // UTF-8 bytes
  function _err(code) { var e = new Error(code); e.code = code; return e; }

  function createSessionStore(backend, opts) {
    opts = opts || {};
    if (!backend || typeof backend.transact !== 'function') throw new Error('createSessionStore: a backend with transact is required');
    var migration = opts.migration || MIG;
    var maxSessionBytes = opts.maxSessionBytes || 8000000;   // 8MB / session
    var maxRawBytes = opts.maxRawBytes || 64000000;          // 64MB total budget

    return {
      put: function (input) {
        input = input || {};
        var rec = { schemaVersion: migration.SESSION_SCHEMA_VERSION, sessionId: input.sessionId || _newId(), summary: input.summary || {}, raw: input.raw != null ? input.raw : null, createdAt: _now(opts.stamp) };
        var size = _bytes(rec);
        if (size > maxSessionBytes) return Promise.resolve({ ok: false, code: 'SESSION_TOO_LARGE', size: size, limit: maxSessionBytes });
        if (size > maxRawBytes) return Promise.resolve({ ok: false, code: 'SESSION_EXCEEDS_BUDGET', size: size, limit: maxRawBytes }); // a single session alone over the total budget can never fit
        return backend.transact({ stores: [SPAY, SIDX], reads: [{ store: SIDX, key: IDXKEY }], compute: function (rv) {
          var idx = rv[0] || { ids: {}, totalBytes: 0, evictionLog: [], totalEvictions: 0 };
          if (!idx.ids) idx.ids = {}; if (!idx.evictionLog) idx.evictionLog = []; idx.totalEvictions = idx.totalEvictions || 0;
          var writes = [];
          var prev = idx.ids[rec.sessionId];
          var newTotal = (idx.totalBytes || 0) - (prev ? prev.bytes : 0) + size;
          // evict oldest until within budget (never evict the session we are writing)
          var entries = Object.keys(idx.ids).filter(function (k) { return k !== rec.sessionId; }).map(function (k) { return { id: k, e: idx.ids[k] }; }).sort(function (a, b) { return (a.e.createdAt || '') < (b.e.createdAt || '') ? -1 : 1; });
          var ei = 0;
          while (newTotal > maxRawBytes && ei < entries.length) {
            var victim = entries[ei++]; newTotal -= victim.e.bytes; delete idx.ids[victim.id];
            idx.evictionLog.push({ at: _now(opts.stamp), bytes: victim.e.bytes, reason: 'budget' });
            if (idx.evictionLog.length > LOG_CAP) idx.evictionLog.shift(); // bounded ring buffer
            idx.totalEvictions += 1;
            writes.push({ store: SPAY, key: victim.id, op: 'delete' });
          }
          idx.ids[rec.sessionId] = { bytes: size, createdAt: rec.createdAt, summary: rec.summary };
          idx.totalBytes = newTotal;
          writes.push({ store: SPAY, key: rec.sessionId, value: rec });
          writes.push({ store: SIDX, key: IDXKEY, value: idx });
          return { writes: writes, result: { sessionId: rec.sessionId, evicted: writes.filter(function (w) { return w.op === 'delete'; }).length } };
        } }).then(function (r) { return { ok: true, sessionId: r.sessionId, evicted: r.evicted }; }, function (e) { return { ok: false, code: e.code || 'STORE_ERROR', error: String(e && e.message || e) }; });
      },
      get: function (sessionId) { return backend.get(SPAY, sessionId).then(function (rec) { if (!rec) return { ok: false, code: 'SESSION_NOT_FOUND' }; var m = migration.migrateSessionRecord(rec); if (!m.ok) return { ok: false, code: m.reason, rejected: true }; return { ok: true, session: m.record }; }); },
      list: function () { return backend.get(SIDX, IDXKEY).then(function (idx) { idx = idx || { ids: {} }; return Object.keys(idx.ids || {}).map(function (id) { return Object.assign({ sessionId: id }, idx.ids[id]); }); }); },
      remove: function (sessionId, conf) { if (!conf || conf.confirm !== true) return Promise.resolve({ ok: false, code: 'CONFIRM_REQUIRED' }); return backend.transact({ stores: [SPAY, SIDX], reads: [{ store: SIDX, key: IDXKEY }], compute: function (rv) { var idx = rv[0] || { ids: {} }; var prev = idx.ids[sessionId]; if (prev) idx.totalBytes = (idx.totalBytes || 0) - prev.bytes; delete idx.ids[sessionId]; return { writes: [{ store: SPAY, key: sessionId, op: 'delete' }, { store: SIDX, key: IDXKEY, value: idx }], result: 1 }; } }).then(function () { return { ok: true }; }, function (e) { return { ok: false, code: e.code || 'STORE_ERROR' }; }); },
      evictionStats: function () { return backend.get(SIDX, IDXKEY).then(function (idx) { idx = idx || {}; return { totalEvictions: idx.totalEvictions || 0, recent: (idx.evictionLog || []).slice(), totalBytes: idx.totalBytes || 0 }; }); },
      // explicit, opt-in raw archive — distinct from the portable CASE bundle (which never carries raw telemetry)
      exportRawArchive: function (sessionId) { return this.get(sessionId).then(function (g) { return g.ok ? { ok: true, archive: { kind: 'raw_telemetry_archive', sessionId: sessionId, session: g.session } } : g; }); },
      compact: function () { /* atomic: remove orphan session payloads in ONE transaction */
        return backend.list(SPAY).then(function (rows) {
          var keys = (rows || []).map(function (r) { return r.key; });
          return backend.transact({ stores: [SPAY, SIDX], reads: [{ store: SIDX, key: IDXKEY }], compute: function (rv) {
            var idx = rv[0] || { ids: {} }, ids = idx.ids || {}, writes = [];
            keys.forEach(function (k) { if (!ids[k]) writes.push({ store: SPAY, key: k, op: 'delete' }); });
            return { writes: writes, result: { removed: writes.length } };
          } });
        }).then(function (r) { return { ok: true, removed: r.removed }; }, function (e) { return { ok: false, code: e.code || 'STORE_ERROR' }; }); },
    };
  }

  var api = { createSessionStore: createSessionStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SessionStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
