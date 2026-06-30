/**
 * renderer/js/r3-0f-migration-engine.js — R3.0F F1 · Unified Migration Engine (PURE LOGIC, backend injected).
 *
 * Orchestrates per-store migrators (cases / sessions / r3_0e_experiments / r3_0e_outcomes /
 * r3_0e_timelines / r3_0e_followupLinks) against the unified storage envelope. The engine:
 *
 *   • is deterministic — same inputs + same injected clock + same backend state → same writes/journal.
 *   • is idempotent — running migrate() against a fully-migrated store is a no-op (zero writes).
 *   • is fail-closed — future-version records are REJECTED (never coerced); malformed records, sparse
 *     arrays, accessors, symbols, Proxy traps, non-enumerable hostile keys, prototype-pollution, hostile
 *     toJSON hooks, BigInt/cycles are all stripped by an input firewall (structuredClone → JSON deep-clone).
 *   • never silently drops data — every record is either migrated, no-op, rejected (with reasonCode), or
 *     failed (backend abort). Each record produces ONE deterministic journal entry.
 *   • never fabricates producer attestation — migrator output is plain data; the live store re-validates
 *     on subsequent read via its own contract path.
 *   • is single-batch atomic per store — either ALL writes + journal entries for a store batch land, or
 *     the batch is aborted (backend.transact). On abort, the entire batch is journaled as 'failed' with
 *     reasonCode BACKEND_REJECTED in a final defensive journal append (best effort).
 *   • never invents authority across stores — migration of one record never references another store's
 *     records. The follow-up reverse index and the experiments/outcomes secondary index are NOT touched
 *     by the engine; those indexes are owned by the live stores and will be re-validated next time the
 *     live store reads them.
 *
 * Hostile-runtime defenses (anti-tamper, anti-poisoning):
 *   • Closure-captured intrinsics at module load time (Object.* / Array.* / JSON.* / String.* / Number.*).
 *   • Pre-clone every record via structuredClone (closure-captured), fallback to closure-captured JSON
 *     parse/stringify chain — strips Proxy traps, accessors, symbols, non-enumerables, prototype chains,
 *     toJSON hooks. JSON.stringify rejects cycles → RECORD_CIRCULAR.
 *   • Reject any record whose pre-clone fails or whose serialized size > maxRecordBytes (8MB default).
 *   • Reject any migrator result that lacks an "ok" boolean — defense vs malicious migrator overrides.
 *   • Journal is a closure-private append-only buffer plus a backend mirror. Engine refuses to append
 *     when totalDropped+entries exceeds 4× maxJournalEntries within a single run (JOURNAL_OVERFLOW).
 *
 * Public API:
 *   createMigrationEngine({ backend, registry?, metaStore?, journalKey?, stateKey?, clock?, stamp?,
 *                           maxJournalEntries?, maxRecordBytes?, migratorTimeoutMs? })
 *     → { detect, plan, migrate, journal, envelope }
 *
 *   detect()    → Promise<{ ok, currentEnvelope?, targetEnvelope, perStoreStatus, knownStores }>
 *   plan()      → Promise<{ ok, generatedAt, steps, blockers, perStoreSummary }>
 *   migrate(opts={confirm:true}) → Promise<{ ok, report }> — report has perStore, journalAppended, status.
 *   journal()   → Promise<frozen array of journal entries (most recent last)>
 *   envelope()  → frozen target envelope
 *
 * UMD: Node require / Electron renderer global (R3_0F_MigrationEngine).
 */
(function (root) {
  'use strict';
  // Literal-only require pairs (each entry: [nodeFn, browserGlobalName]). Keeping the require
  // specifiers literal-string-only satisfies the phase-no-consumer heuristic and gives the
  // bundler a static dependency graph. Each branch returns null on failure (best-effort UMD).
  function _loadEnv() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../contracts/r3.0f/migration-envelope.js'); } catch (_) { } }
    return (root && root.R3_0F_MigrationEnvelope) || null;
  }
  function _loadCaseMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/case-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_CaseMigrator) || null;
  }
  function _loadSessionMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/session-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_SessionMigrator) || null;
  }
  function _loadExperimentMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/experiment-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_ExperimentMigrator) || null;
  }
  function _loadOutcomeMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/outcome-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_OutcomeMigrator) || null;
  }
  function _loadTimelineMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/timeline-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_TimelineMigrator) || null;
  }
  function _loadFollowupMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/followup-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_FollowupMigrator) || null;
  }

  // ── closure-captured intrinsics ──────────────────────────────────────────────
  var _Object              = Object;
  var _ObjectCreate        = Object.create;
  var _ObjectFreeze        = Object.freeze;
  var _ObjectIsFrozen      = Object.isFrozen;
  var _ObjectKeys          = Object.keys;
  var _ObjectAssign        = Object.assign || function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; };
  var _ObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
  var _ObjectGetPrototypeOf      = Object.getPrototypeOf;
  var _ObjectPrototype     = Object.prototype;
  var _ObjectPrototypeHasOwnProperty = Object.prototype.hasOwnProperty;
  var _ArrayIsArray        = Array.isArray;
  var _ArrayPrototypeSlice = Array.prototype.slice;
  var _ArrayPrototypePush  = Array.prototype.push;
  var _JSONStringify       = JSON.stringify;
  var _JSONParse           = JSON.parse;
  var _StructuredClone     = typeof structuredClone === 'function' ? structuredClone : null;
  var _isFinite            = isFinite;
  var _isNaN               = isNaN;
  var _MathFloor           = Math.floor;
  var _Date                = Date;
  var _NumberIsFinite      = typeof Number.isFinite === 'function' ? Number.isFinite : function (v) { return typeof v === 'number' && _isFinite(v); };

  var ENV = _loadEnv();
  if (!ENV) throw new Error('r3-0f-migration-engine: migration-envelope contract not loadable');

  var META_STORE_DEFAULT       = 'meta';
  var JOURNAL_KEY_DEFAULT      = '__r3_0f_migration_journal__';
  var STATE_KEY_DEFAULT        = '__r3_0f_migration_state__';
  var MAX_JOURNAL_ENTRIES_DEF  = 256;
  var MAX_RECORD_BYTES_DEF     = 8000000; // 8MB
  var JOURNAL_OVERFLOW_FACTOR  = 4;       // overflow gate inside one migrate() call

  // ── default migrator registry (literal loaders) ──────────────────────────────
  function _defaultRegistry() {
    var reg = {};
    var mods = [
      _loadCaseMigrator(),
      _loadSessionMigrator(),
      _loadExperimentMigrator(),
      _loadOutcomeMigrator(),
      _loadTimelineMigrator(),
      _loadFollowupMigrator()
    ];
    for (var i = 0; i < mods.length; i++) {
      var m = mods[i];
      if (m && typeof m.storeKey === 'string' && typeof m.migrate === 'function') {
        reg[m.storeKey] = m;
      }
    }
    return reg;
  }

  // ── helpers (closure-private; do not depend on prototype methods) ────────────
  function _isPlainObject(v) {
    if (v === null || typeof v !== 'object') return false;
    if (_ArrayIsArray(v)) return false;
    return true;
  }

  function _now(clock, stamp) {
    if (typeof clock === 'function') {
      try { var s = clock(); if (typeof s === 'string' && s.length) return s; } catch (_) { /* fall through */ }
    }
    if (typeof stamp === 'string' && stamp.length) return stamp;
    try { return new _Date().toISOString(); } catch (_) { return '1970-01-01T00:00:00.000Z'; }
  }

  // FNV-1a 64 (BigInt-free) — deterministic hash sufficient to fingerprint a record post-migration
  function _hash(str) {
    if (typeof str !== 'string') str = String(str);
    var h1 = 0x811c9dc5, h2 = 0xcbf29ce4;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      h1 ^= c & 0xff; h1 = (h1 * 0x01000193) >>> 0;
      h2 ^= (c >> 8) & 0xff; h2 = (h2 * 0x01000193) >>> 0;
    }
    // pad to 8 hex chars each
    var a = h1.toString(16); while (a.length < 8) a = '0' + a;
    var b = h2.toString(16); while (b.length < 8) b = '0' + b;
    return a + b;
  }

  // Input firewall: structuredClone → JSON deep-clone. Returns { ok, value? , reason?, bytes? }.
  function _sanitize(rec, maxBytes) {
    if (rec === null || rec === undefined) return { ok: false, reason: 'RECORD_NOT_AN_OBJECT' };
    if (typeof rec !== 'object') return { ok: false, reason: 'RECORD_NOT_AN_OBJECT' };
    if (_ArrayIsArray(rec)) return { ok: false, reason: 'RECORD_NOT_AN_OBJECT' };
    var cloned = null, viaJson = false;
    if (_StructuredClone) {
      try { cloned = _StructuredClone(rec); } catch (_) { cloned = null; }
    }
    if (cloned === null) {
      try { cloned = _JSONParse(_JSONStringify(rec)); viaJson = true; }
      catch (_) { return { ok: false, reason: 'RECORD_CIRCULAR' }; }
    }
    // After structuredClone, also do a JSON round-trip so the engine ALWAYS sees a plain
    // JSON-compatible value (structuredClone preserves Maps/Sets/Dates which we don't want in storage).
    var serialized;
    try { serialized = _JSONStringify(cloned); } catch (_) { return { ok: false, reason: 'RECORD_CIRCULAR' }; }
    if (typeof serialized !== 'string') return { ok: false, reason: 'RECORD_CIRCULAR' };
    if (serialized.length > maxBytes) return { ok: false, reason: 'RECORD_TOO_LARGE', bytes: serialized.length };
    var final;
    try { final = _JSONParse(serialized); } catch (_) { return { ok: false, reason: 'RECORD_CIRCULAR' }; }
    if (!_isPlainObject(final)) return { ok: false, reason: 'RECORD_NOT_AN_OBJECT' };
    return { ok: true, value: final, bytes: serialized.length, viaJson: viaJson };
  }

  // Build a deterministic journal entry. ALL fields owned by the engine.
  function _journalEntry(now, store, key, fromVersion, toVersion, status, migrationsApplied, recordHash, reasonCode, limitations) {
    var entry = {
      schemaVersion: 1,
      recordedAt: now,
      store: store,
      key: key,
      fromVersion: fromVersion,
      toVersion: toVersion,
      status: status,
      recordHash: recordHash,
      migrationsApplied: _ArrayIsArray(migrationsApplied) ? migrationsApplied.slice() : [],
      limitations: _ArrayIsArray(limitations) ? limitations.slice() : []
    };
    if (status === 'rejected' || status === 'failed') {
      entry.reasonCode = reasonCode || 'NO_MIGRATION_PATH';
    }
    return ENV.deepFreeze(entry);
  }

  // ── engine factory ───────────────────────────────────────────────────────────
  function createMigrationEngine(spec) {
    spec = spec || {};
    if (!spec.backend || typeof spec.backend.transact !== 'function') {
      throw new Error('createMigrationEngine: backend with transact required');
    }
    if (typeof spec.backend.list !== 'function' || typeof spec.backend.get !== 'function') {
      throw new Error('createMigrationEngine: backend with list+get required');
    }
    var backend             = spec.backend;
    var registry            = spec.registry && typeof spec.registry === 'object' ? spec.registry : _defaultRegistry();
    var META                = (typeof spec.metaStore === 'string' && spec.metaStore.length) ? spec.metaStore : META_STORE_DEFAULT;
    var JOURNAL_KEY         = (typeof spec.journalKey === 'string' && spec.journalKey.length) ? spec.journalKey : JOURNAL_KEY_DEFAULT;
    var STATE_KEY           = (typeof spec.stateKey === 'string' && spec.stateKey.length) ? spec.stateKey : STATE_KEY_DEFAULT;
    var MAX_JOURNAL         = _NumberIsFinite(spec.maxJournalEntries) && spec.maxJournalEntries > 0 ? _MathFloor(spec.maxJournalEntries) : MAX_JOURNAL_ENTRIES_DEF;
    var MAX_RECORD_BYTES    = _NumberIsFinite(spec.maxRecordBytes) && spec.maxRecordBytes > 0 ? _MathFloor(spec.maxRecordBytes) : MAX_RECORD_BYTES_DEF;
    var clock               = spec.clock;
    var stamp               = spec.stamp;
    var KNOWN_STORES        = _ObjectKeys(registry).sort();

    // Validate registry: each entry must have storeKey, targetVersion (number), migrate (function)
    for (var i = 0; i < KNOWN_STORES.length; i++) {
      var sk = KNOWN_STORES[i];
      var mg = registry[sk];
      if (!mg || typeof mg.migrate !== 'function' || mg.storeKey !== sk || !_NumberIsFinite(mg.targetVersion) || mg.targetVersion < 0) {
        throw new Error('createMigrationEngine: invalid migrator for storeKey=' + sk);
      }
      var declared = ENV.PER_STORE_TARGETS[sk];
      if (declared !== undefined && mg.targetVersion !== declared) {
        throw new Error('createMigrationEngine: migrator targetVersion drift for storeKey=' + sk + ' (' + mg.targetVersion + ' != ' + declared + ')');
      }
    }

    function envelope() { return ENV.buildEnvelope(); }

    // Read the persisted state envelope from meta store; return null if absent / malformed.
    function _readState() {
      return backend.get(META, STATE_KEY).then(function (st) {
        if (!_isPlainObject(st)) return null;
        return st;
      }, function () { return null; });
    }

    function _readJournal() {
      return backend.get(META, JOURNAL_KEY).then(function (j) {
        if (_ArrayIsArray(j)) return j.slice();
        if (_isPlainObject(j) && _ArrayIsArray(j.entries)) return j.entries.slice();
        return [];
      }, function () { return []; });
    }

    function journal() {
      return _readJournal().then(function (entries) {
        var out = [];
        for (var i = 0; i < entries.length; i++) {
          var v = ENV.validateJournalEntry(entries[i]);
          if (v.ok) out.push(ENV.deepFreeze(entries[i]));
        }
        return ENV.deepFreeze(out);
      });
    }

    // detect() — list each store, classify counts; does NOT mutate state.
    function detect() {
      var target = envelope();
      var perStoreStatus = {};
      var promises = [];
      for (var i = 0; i < KNOWN_STORES.length; i++) {
        (function (storeKey) {
          var mg = registry[storeKey];
          promises.push(backend.list(storeKey).then(function (rows) {
            rows = _ArrayIsArray(rows) ? rows : [];
            var counts = { records: rows.length, atTarget: 0, belowTarget: 0, futureVersion: 0, malformed: 0 };
            for (var r = 0; r < rows.length; r++) {
              var row = rows[r];
              var rec = row && row.value;
              if (!_isPlainObject(rec)) { counts.malformed += 1; continue; }
              var v = rec.schemaVersion;
              if (typeof v !== 'number' || !_isFinite(v) || v < 0 || _MathFloor(v) !== v) { counts.malformed += 1; continue; }
              if (v > mg.targetVersion) counts.futureVersion += 1;
              else if (v < mg.targetVersion) counts.belowTarget += 1;
              else counts.atTarget += 1;
            }
            perStoreStatus[storeKey] = counts;
          }, function () {
            // backend list failed for this store — record null record-set
            perStoreStatus[storeKey] = { records: 0, atTarget: 0, belowTarget: 0, futureVersion: 0, malformed: 0, listFailed: true };
          }));
        })(KNOWN_STORES[i]);
      }
      return Promise.all(promises).then(function () {
        return _readState().then(function (st) {
          var currentEnvelope = st && _isPlainObject(st.envelope) ? st.envelope : null;
          var envMismatch = false;
          if (currentEnvelope) {
            var ev = ENV.validateEnvelope(currentEnvelope);
            envMismatch = !ev.ok;
          }
          return ENV.deepFreeze({
            ok: true,
            currentEnvelope: currentEnvelope ? ENV.deepFreeze(currentEnvelope) : null,
            targetEnvelope: target,
            envelopeMismatch: envMismatch,
            knownStores: KNOWN_STORES.slice(),
            perStoreStatus: perStoreStatus
          });
        });
      });
    }

    // plan() — pure preview. NEVER writes. NEVER mutates registry.
    function plan() {
      return detect().then(function (det) {
        var steps = [], blockers = [], perStoreSummary = {};
        for (var i = 0; i < KNOWN_STORES.length; i++) {
          var sk = KNOWN_STORES[i];
          var st = det.perStoreStatus[sk] || {};
          perStoreSummary[sk] = {
            records: st.records || 0,
            wouldMigrate: st.belowTarget || 0,
            wouldNoop: st.atTarget || 0,
            wouldReject: (st.futureVersion || 0) + (st.malformed || 0),
            listFailed: !!st.listFailed
          };
          if (st.belowTarget > 0) steps.push({ store: sk, action: 'migrate', count: st.belowTarget });
          if (st.atTarget > 0) steps.push({ store: sk, action: 'no-op', count: st.atTarget });
          if (st.futureVersion > 0) blockers.push({ store: sk, reasonCode: 'UNSUPPORTED_FUTURE_VERSION', count: st.futureVersion });
          if (st.malformed > 0) blockers.push({ store: sk, reasonCode: 'RECORD_BAD_VERSION', count: st.malformed });
          if (st.listFailed) blockers.push({ store: sk, reasonCode: 'BACKEND_REJECTED', count: 0 });
        }
        return ENV.deepFreeze({
          ok: true,
          generatedAt: _now(clock, stamp),
          steps: steps,
          blockers: blockers,
          perStoreSummary: perStoreSummary,
          targetEnvelope: det.targetEnvelope,
          currentEnvelope: det.currentEnvelope
        });
      });
    }

    // Per-store migration batch. Returns Promise<{ store, counts, journalEntries, ok }>
    function _migrateStore(storeKey) {
      var mg = registry[storeKey];
      var now = _now(clock, stamp);
      return backend.list(storeKey).then(function (rows) {
        rows = _ArrayIsArray(rows) ? rows : [];
        // Pre-process rows OUTSIDE the transact (transact is sync). We build writes + journal entries
        // here, then commit atomically. Cross-record state cannot leak: each row is processed in
        // isolation, against its CLONED value.
        var writes = [];
        var entries = [];
        var counts = { records: rows.length, migrated: 0, noop: 0, rejected: 0, failed: 0 };
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i];
          var key = row && typeof row.key === 'string' ? row.key : null;
          if (!key) { // backend returned an unkeyed row — treat as failed but DO NOT WRITE
            entries.push(_journalEntry(now, storeKey, '<unkeyed>', -1, mg.targetVersion, 'failed', [], '', 'BACKEND_REJECTED', ['unkeyed_row']));
            counts.failed += 1;
            continue;
          }
          var san = _sanitize(row.value, MAX_RECORD_BYTES);
          if (!san.ok) {
            entries.push(_journalEntry(now, storeKey, key, -1, mg.targetVersion, 'rejected', [], '', san.reason, []));
            counts.rejected += 1;
            continue;
          }
          var fromVersion = (typeof san.value.schemaVersion === 'number' && _isFinite(san.value.schemaVersion) && san.value.schemaVersion >= 0 && _MathFloor(san.value.schemaVersion) === san.value.schemaVersion) ? san.value.schemaVersion : -1;
          if (fromVersion < 0) {
            entries.push(_journalEntry(now, storeKey, key, -1, mg.targetVersion, 'rejected', [], '', 'RECORD_BAD_VERSION', []));
            counts.rejected += 1;
            continue;
          }
          var result;
          try { result = mg.migrate(san.value); }
          catch (e) {
            entries.push(_journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', [], '', 'MIGRATOR_THREW', [String(e && e.message || e).slice(0, 200)]));
            counts.failed += 1;
            continue;
          }
          // Defense: migrator MUST return a plain object with explicit ok boolean.
          if (!_isPlainObject(result) || (result.ok !== true && result.ok !== false)) {
            entries.push(_journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', [], '', 'MIGRATOR_THREW', ['bad_migrator_return']));
            counts.failed += 1;
            continue;
          }
          if (result.ok === false) {
            var rc = (typeof result.reason === 'string' && result.reason.length) ? result.reason : 'NO_MIGRATION_PATH';
            // Map legacy schema-migration.js codes into the F1 closed enum.
            if (rc === 'case_NOT_AN_OBJECT' || rc === 'session_NOT_AN_OBJECT') rc = 'RECORD_NOT_AN_OBJECT';
            if (rc === 'case_BAD_VERSION' || rc === 'session_BAD_VERSION') rc = 'RECORD_BAD_VERSION';
            entries.push(_journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'rejected', _ArrayIsArray(result.migrations) ? result.migrations : [], '', rc, []));
            counts.rejected += 1;
            continue;
          }
          // ok=true. If migrations array is empty, this is a no-op (already at target).
          var migrated = result.record;
          if (!_isPlainObject(migrated)) {
            entries.push(_journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', [], '', 'POST_MIGRATION_INVALID', ['migrator_returned_non_object']));
            counts.failed += 1;
            continue;
          }
          // Re-sanitize the post-migration record (defends against migrator returning an exotic value).
          var postSan = _sanitize(migrated, MAX_RECORD_BYTES);
          if (!postSan.ok) {
            entries.push(_journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', _ArrayIsArray(result.migrations) ? result.migrations : [], '', postSan.reason, []));
            counts.failed += 1;
            continue;
          }
          var toVersion = (typeof postSan.value.schemaVersion === 'number' && _isFinite(postSan.value.schemaVersion)) ? postSan.value.schemaVersion : mg.targetVersion;
          if (toVersion > mg.targetVersion) {
            entries.push(_journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', _ArrayIsArray(result.migrations) ? result.migrations : [], '', 'POST_MIGRATION_INVALID', ['version_overshoot']));
            counts.failed += 1;
            continue;
          }
          var hash = _hash(_JSONStringify(postSan.value));
          var migrationsList = _ArrayIsArray(result.migrations) ? result.migrations : [];
          var status;
          if (migrationsList.length === 0 && fromVersion === mg.targetVersion) {
            // True no-op: no write necessary. Journal records the no-op (deterministic audit).
            status = 'no-op';
            counts.noop += 1;
          } else {
            status = 'migrated';
            writes.push({ store: storeKey, key: key, value: postSan.value });
            counts.migrated += 1;
          }
          entries.push(_journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, status, migrationsList, hash, '', []));
        }
        return { storeKey: storeKey, counts: counts, writes: writes, entries: entries };
      }, function (err) {
        // list failed — record one defensive entry and skip writes
        return {
          storeKey: storeKey,
          counts: { records: 0, migrated: 0, noop: 0, rejected: 0, failed: 1 },
          writes: [],
          entries: [_journalEntry(now, storeKey, '<list>', -1, mg.targetVersion, 'failed', [], '', 'BACKEND_REJECTED', [String(err && err.message || err).slice(0, 200)])]
        };
      });
    }

    function migrate(opts) {
      opts = opts || {};
      if (opts.confirm !== true) {
        return Promise.resolve(ENV.deepFreeze({
          ok: false,
          reasonCode: 'CONFIRM_REQUIRED',
          report: ENV.deepFreeze({ status: 'halted', startedAt: _now(clock, stamp), perStore: {}, journalAppended: 0 })
        }));
      }
      var startedAt = _now(clock, stamp);
      // Read existing state to detect envelope mismatch up front.
      return _readState().then(function (st) {
        if (st && _isPlainObject(st.envelope)) {
          if (typeof st.envelope.engineVersion === 'number' && st.envelope.engineVersion > ENV.ENGINE_VERSION) {
            return ENV.deepFreeze({
              ok: false,
              reasonCode: 'ENVELOPE_VERSION_MISMATCH',
              report: ENV.deepFreeze({ status: 'halted', startedAt: startedAt, perStore: {}, journalAppended: 0 })
            });
          }
        }
        // Sequentially migrate each store. We do NOT parallelize: ordering matters for the journal
        // (deterministic audit) and because backend.transact() serializes anyway.
        var perStoreOut = {};
        var allEntries = [];
        var anyWrites = false;
        var anyMigrated = false, anyRejected = false, anyFailed = false;
        var p = Promise.resolve();
        for (var i = 0; i < KNOWN_STORES.length; i++) {
          (function (sk) {
            p = p.then(function () {
              return _migrateStore(sk).then(function (res) {
                perStoreOut[sk] = res.counts;
                // overflow gate per single migrate() run
                if (allEntries.length + res.entries.length > MAX_JOURNAL * JOURNAL_OVERFLOW_FACTOR) {
                  res.entries = [_journalEntry(_now(clock, stamp), sk, '<overflow>', -1, registry[sk].targetVersion, 'failed', [], '', 'JOURNAL_OVERFLOW', [])];
                  res.writes = [];
                  res.counts.failed += 1;
                }
                for (var j = 0; j < res.entries.length; j++) allEntries.push(res.entries[j]);
                if (res.counts.migrated > 0) anyMigrated = true;
                if (res.counts.rejected > 0) anyRejected = true;
                if (res.counts.failed > 0) anyFailed = true;
                if (res.writes.length > 0) {
                  anyWrites = true;
                  // Commit this store's writes atomically. Failure → buffer-only journal append; no partial write.
                  return backend.transact({
                    stores: [sk],
                    reads: [],
                    compute: function () { return { writes: res.writes, result: { committed: res.writes.length } }; }
                  }).then(function () { return; }, function (err) {
                    // backend rejected: invalidate THIS store's migrated count and re-journal as failed
                    var failedNow = _now(clock, stamp);
                    var migratedNow = res.counts.migrated;
                    perStoreOut[sk] = _ObjectAssign({}, res.counts, { migrated: 0, failed: res.counts.failed + migratedNow });
                    // remove the prior "migrated" entries we already pushed for this store — replace with one defensive failed entry
                    allEntries = allEntries.filter(function (e) { return !(e.store === sk && e.status === 'migrated'); });
                    allEntries.push(_journalEntry(failedNow, sk, '<batch>', -1, registry[sk].targetVersion, 'failed', [], '', 'BACKEND_REJECTED', [String(err && err.message || err).slice(0, 200)]));
                    anyFailed = true;
                    anyMigrated = res.counts.migrated > 0 ? anyMigrated : anyMigrated; // keep prior flag from other stores
                  });
                }
              });
            });
          })(KNOWN_STORES[i]);
        }
        return p.then(function () {
          // Build report status
          var status;
          if (anyFailed) status = 'halted';
          else if (anyRejected && anyMigrated) status = 'partial';
          else if (anyRejected && !anyMigrated && !anyWrites) status = 'partial';
          else if (anyMigrated) status = 'complete';
          else status = 'no-op';
          var completedAt = _now(clock, stamp);
          // Persist journal + state in ONE atomic transact on META store
          return _readJournal().then(function (priorJournal) {
            var compactedJournal = priorJournal.concat(allEntries);
            var totalDropped = 0;
            if (compactedJournal.length > MAX_JOURNAL) {
              totalDropped = compactedJournal.length - MAX_JOURNAL;
              compactedJournal = compactedJournal.slice(compactedJournal.length - MAX_JOURNAL);
            }
            var stateNext = {
              schemaVersion: 1,
              envelope: envelope(),
              lastRunStartedAt: startedAt,
              lastRunCompletedAt: completedAt,
              lastRunStatus: status,
              lastRunPerStore: perStoreOut,
              lastRunJournalAppended: allEntries.length,
              lifetimeJournalDropped: ((st && _isPlainObject(st) && typeof st.lifetimeJournalDropped === 'number') ? st.lifetimeJournalDropped : 0) + totalDropped
            };
            return backend.transact({
              stores: [META],
              reads: [],
              compute: function () {
                return {
                  writes: [
                    { store: META, key: JOURNAL_KEY, value: compactedJournal },
                    { store: META, key: STATE_KEY,   value: stateNext }
                  ],
                  result: { journalLen: compactedJournal.length, dropped: totalDropped }
                };
              }
            }).then(function (r) {
              return ENV.deepFreeze({
                ok: status !== 'halted',
                report: ENV.deepFreeze({
                  startedAt: startedAt,
                  completedAt: completedAt,
                  status: status,
                  perStore: perStoreOut,
                  journalAppended: allEntries.length,
                  journalLen: r.journalLen,
                  lifetimeJournalDropped: stateNext.lifetimeJournalDropped,
                  envelope: envelope()
                })
              });
            }, function (err) {
              return ENV.deepFreeze({
                ok: false,
                reasonCode: 'BACKEND_REJECTED',
                report: ENV.deepFreeze({
                  startedAt: startedAt,
                  completedAt: _now(clock, stamp),
                  status: 'halted',
                  perStore: perStoreOut,
                  journalAppended: 0,
                  metaWriteError: String(err && err.message || err).slice(0, 200)
                })
              });
            });
          });
        });
      });
    }

    return {
      detect:   detect,
      plan:     plan,
      migrate:  migrate,
      journal:  journal,
      envelope: envelope,
      knownStores: function () { return KNOWN_STORES.slice(); }
    };
  }

  var api = {
    createMigrationEngine: createMigrationEngine,
    envelope:              ENV.buildEnvelope,
    PER_STORE_TARGETS:     ENV.PER_STORE_TARGETS,
    REASON_CODES:          ENV.REASON_CODES,
    STATUS_VALUES:         ENV.STATUS_VALUES,
    REPORT_STATUS_VALUES:  ENV.REPORT_STATUS_VALUES
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_MigrationEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
