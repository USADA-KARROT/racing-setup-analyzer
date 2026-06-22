/**
 * storage-backend.js — R3.0B: a namespaced async key/value backend with an IndexedDB-safe atomic transaction.
 *
 * Contract (all Promise-returning):
 *   get(ns,key) · put(ns,key,val) · add(ns,key,val) [create-if-absent; rejects if present] · del(ns,key) ·
 *   list(ns) → [{key,value}] · estimateBytes(ns?) ·
 *   update(ns,key,fn) → atomic read-modify-write of one key (sugar over transact) ·
 *   transact({stores:[ns...], reads:[{store,key}...], compute:(readValues)=>({writes:[{store,key,value}|{store,key,op:'delete'}], result})}) → Promise<result>
 *
 * transact is IndexedDB-safe: ALL reads are declared up front; `compute` is SYNCHRONOUS and PURE (no I/O, no await)
 * and returns the writes + a result; the backend reads, then synchronously computes, then applies the writes, then
 * commits — atomically. Two implementations:
 *   - MemoryBackend  : tests / explicit SSR. A global mutex serializes transactions; values are structured-cloned
 *                      at every boundary so callers can never mutate stored references.
 *   - IndexedDBBackend: browser AND Electron renderer (IndexedDB exists in both). One readwrite transaction per
 *                       transact(); aborts (no partial write) on error/quota, surfacing a typed StorageError.
 * A renderer NEVER silently falls back to memory — IndexedDB unavailability surfaces STORAGE_UNAVAILABLE.
 *
 * UMD: Node require / Electron renderer global (StorageBackend).
 */
(function (root) {
  'use strict';

  function StorageError(code, message) { this.name = 'StorageError'; this.code = code; this.message = message || code; }
  StorageError.prototype = Object.create(Error.prototype);
  var CODES = { UNAVAILABLE: 'STORAGE_UNAVAILABLE', QUOTA: 'STORAGE_QUOTA_EXCEEDED', KEY_EXISTS: 'STORAGE_KEY_EXISTS', BAD_TXN: 'STORAGE_BAD_TRANSACTION' };

  function _clone(v) {
    if (v === undefined) return undefined;
    if (typeof structuredClone === 'function') { try { return structuredClone(v); } catch (e) { /* fall through */ } }
    return JSON.parse(JSON.stringify(v));
  }
  function _byteLen(v) { try { return JSON.stringify(v).length; } catch (e) { return 0; } }

  function _validateTxnSpec(spec) {
    if (!spec || typeof spec !== 'object') throw new StorageError(CODES.BAD_TXN, 'spec required');
    if (!Array.isArray(spec.stores) || !spec.stores.length) throw new StorageError(CODES.BAD_TXN, 'stores required');
    if (spec.reads != null && !Array.isArray(spec.reads)) throw new StorageError(CODES.BAD_TXN, 'reads must be an array');
    if (typeof spec.compute !== 'function') throw new StorageError(CODES.BAD_TXN, 'compute must be a function');
  }
  // apply a compute() result shape; returns the writes array (validated) — pure
  function _normalizeWrites(out, stores) {
    if (!out || typeof out !== 'object') throw new StorageError(CODES.BAD_TXN, 'compute must return an object');
    var writes = out.writes || [];
    if (!Array.isArray(writes)) throw new StorageError(CODES.BAD_TXN, 'writes must be an array');
    writes.forEach(function (w) {
      if (!w || stores.indexOf(w.store) === -1 || typeof w.key !== 'string') throw new StorageError(CODES.BAD_TXN, 'invalid write');
    });
    return writes;
  }

  // ── MemoryBackend ──────────────────────────────────────────────────────────
  function MemoryBackend() {
    var data = {}; // ns -> { key -> value }
    var chain = Promise.resolve(); // global mutex
    function nsOf(ns) { if (!data[ns]) data[ns] = {}; return data[ns]; }
    function run(fn) { var p = chain.then(function () { return fn(); }); chain = p.then(function () { }, function () { }); return p; }
    return {
      _kind: 'memory',
      get: function (ns, key) { return run(function () { return _clone(nsOf(ns)[key]); }); },
      put: function (ns, key, val) { return run(function () { nsOf(ns)[key] = _clone(val); }); },
      add: function (ns, key, val) { return run(function () { var s = nsOf(ns); if (Object.prototype.hasOwnProperty.call(s, key)) throw new StorageError(CODES.KEY_EXISTS, key); s[key] = _clone(val); }); },
      del: function (ns, key) { return run(function () { delete nsOf(ns)[key]; }); },
      list: function (ns) { return run(function () { var s = nsOf(ns); return Object.keys(s).map(function (k) { return { key: k, value: _clone(s[k]) }; }); }); },
      estimateBytes: function (ns) { return run(function () { if (ns) { var s = nsOf(ns); return Object.keys(s).reduce(function (a, k) { return a + _byteLen(s[k]); }, 0); } return Object.keys(data).reduce(function (a, n) { var ss = data[n]; return a + Object.keys(ss).reduce(function (b, k) { return b + _byteLen(ss[k]); }, 0); }, 0); }); },
      transact: function (spec) {
        return run(function () {
          _validateTxnSpec(spec);
          var readValues = (spec.reads || []).map(function (r) { return _clone(nsOf(r.store)[r.key]); });
          var out = spec.compute(readValues); // SYNCHRONOUS pure
          var writes = _normalizeWrites(out, spec.stores);
          // apply atomically (memory is single-threaded under the mutex)
          writes.forEach(function (w) { if (w.op === 'delete') delete nsOf(w.store)[w.key]; else nsOf(w.store)[w.key] = _clone(w.value); });
          return _clone(out.result);
        });
      },
      update: function (ns, key, fn) { return this.transact({ stores: [ns], reads: [{ store: ns, key: key }], compute: function (rv) { var next = fn(rv[0]); return { writes: [{ store: ns, key: key, value: next }], result: next }; } }); },
    };
  }

  // ── IndexedDBBackend (browser + Electron renderer) ───────────────────────────
  function IndexedDBBackend(opts) {
    opts = opts || {};
    var idb = (typeof indexedDB !== 'undefined') ? indexedDB : (root && root.indexedDB);
    if (!idb) throw new StorageError(CODES.UNAVAILABLE, 'indexedDB not available');
    var dbName = opts.dbName || 'racing_analyzer_store';
    var stores = opts.stores || ['cases', 'caseIndex', 'sessions', 'sessionIndex', 'meta'];
    var version = opts.version || 1;
    var _db = null;
    function open() {
      if (_db) return Promise.resolve(_db);
      return new Promise(function (resolve, reject) {
        var req;
        try { req = idb.open(dbName, version); } catch (e) { reject(new StorageError(CODES.UNAVAILABLE, String(e && e.message || e))); return; }
        req.onupgradeneeded = function () { var db = req.result; stores.forEach(function (s) { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); }); };
        req.onsuccess = function () { _db = req.result; resolve(_db); };
        req.onerror = function () { reject(new StorageError(CODES.UNAVAILABLE, String(req.error && req.error.message || 'open failed'))); };
      });
    }
    function reqP(request, onerr) { return new Promise(function (resolve, reject) { request.onsuccess = function () { resolve(request.result); }; request.onerror = function () { reject(onerr ? onerr(request.error) : request.error); }; }); }
    function single(storeNames, mode, fn) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx, result, aborted = false;
          try { tx = db.transaction(storeNames, mode); } catch (e) { reject(new StorageError(CODES.BAD_TXN, String(e && e.message || e))); return; }
          tx.oncomplete = function () { resolve(result); };
          tx.onabort = function () { if (!aborted) reject(_quotaOr(tx.error)); };
          tx.onerror = function () { /* abort handler resolves */ };
          try { fn(tx, function (r) { result = r; }, function (e) { aborted = true; try { tx.abort(); } catch (_) {} reject(e); }); }
          catch (e) { aborted = true; try { tx.abort(); } catch (_) {} reject(e instanceof StorageError ? e : new StorageError(CODES.BAD_TXN, String(e && e.message || e))); }
        });
      });
    }
    function _quotaOr(err) { var n = err && err.name; if (n === 'QuotaExceededError' || n === 'NS_ERROR_DOM_QUOTA_REACHED') return new StorageError(CODES.QUOTA, 'quota exceeded'); return new StorageError(CODES.BAD_TXN, String((err && err.message) || 'transaction aborted')); }
    return {
      _kind: 'indexeddb',
      get: function (ns, key) { return single([ns], 'readonly', function (tx, done) { var r = tx.objectStore(ns).get(key); r.onsuccess = function () { done(r.result); }; }); },
      put: function (ns, key, val) { return single([ns], 'readwrite', function (tx) { tx.objectStore(ns).put(val, key); }); },
      add: function (ns, key, val) { return single([ns], 'readwrite', function (tx, done, fail) { var r = tx.objectStore(ns).add(val, key); r.onerror = function () { fail(new StorageError(CODES.KEY_EXISTS, key)); }; }); },
      del: function (ns, key) { return single([ns], 'readwrite', function (tx) { tx.objectStore(ns).delete(key); }); },
      list: function (ns) { return single([ns], 'readonly', function (tx, done) { var out = []; var cur = tx.objectStore(ns).openCursor(); cur.onsuccess = function () { var c = cur.result; if (c) { out.push({ key: c.key, value: c.value }); c.continue(); } else done(out); }; }); },
      estimateBytes: function (ns) {
        if (navigator && navigator.storage && navigator.storage.estimate && !ns) return navigator.storage.estimate().then(function (e) { return e.usage || 0; });
        var names = ns ? [ns] : stores; var total = 0; var self = this;
        return names.reduce(function (p, n) { return p.then(function () { return self.list(n).then(function (rows) { rows.forEach(function (r) { total += _byteLen(r.value); }); }); }); }, Promise.resolve()).then(function () { return total; });
      },
      // IndexedDB-safe: declared reads → synchronous compute → writes, all in ONE readwrite transaction.
      transact: function (spec) {
        _validateTxnSpec(spec);
        return single(spec.stores, 'readwrite', function (tx, done, fail) {
          var reads = spec.reads || [];
          var values = new Array(reads.length); var pending = reads.length;
          if (!pending) { applyCompute(); return; }
          reads.forEach(function (r, i) { var rq = tx.objectStore(r.store).get(r.key); rq.onsuccess = function () { values[i] = rq.result; if (--pending === 0) applyCompute(); }; });
          function applyCompute() {
            // SYNCHRONOUS from the final read's success callback — no await/Promise hop (keeps the txn alive)
            var out;
            try { out = spec.compute(values.map(_clone)); var writes = _normalizeWrites(out, spec.stores); writes.forEach(function (w) { var os = tx.objectStore(w.store); if (w.op === 'delete') os.delete(w.key); else os.put(w.value, w.key); }); done(out.result); }
            catch (e) { fail(e instanceof StorageError ? e : new StorageError(CODES.BAD_TXN, String(e && e.message || e))); }
          }
        });
      },
      update: function (ns, key, fn) { return this.transact({ stores: [ns], reads: [{ store: ns, key: key }], compute: function (rv) { var next = fn(rv[0]); return { writes: [{ store: ns, key: key, value: next }], result: next }; } }); },
    };
  }

  var api = { MemoryBackend: MemoryBackend, IndexedDBBackend: IndexedDBBackend, StorageError: StorageError, CODES: CODES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.StorageBackend = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
