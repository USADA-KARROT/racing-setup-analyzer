/**
 * schema-migration.js — R3.0B: versioned schema + deterministic, fail-closed migration (PURE, no I/O).
 *
 * migrateCaseRecord(rec) / migrateSessionRecord(rec) → { ok, record?, migrations:[], rejected?, reason? }.
 * Rules: a FUTURE version (rec.schemaVersion > current) is REJECTED fail-closed (never coerced / never opened);
 * a known older version is migrated step-by-step; unknown fields are PRESERVED (the LOCAL record keeps everything —
 * migration never silent-drops); the migration steps applied are logged. Deterministic.
 *
 * UMD: Node require / Electron renderer global (SchemaMigration).
 */
(function (root) {
  'use strict';

  var STORAGE_SCHEMA_VERSION = 1;
  var CASE_SCHEMA_VERSION = 1;
  var SESSION_SCHEMA_VERSION = 1;

  // step migrators: index i upgrades a record AT version i → i+1. (None yet at v1; future versions append here.)
  var CASE_STEPS = [];     // CASE_STEPS[0] would migrate v0→v1, etc.
  var SESSION_STEPS = [];

  function _migrate(rec, current, steps, label) {
    if (rec == null || typeof rec !== 'object' || Array.isArray(rec)) return { ok: false, rejected: true, reason: label + '_NOT_AN_OBJECT', migrations: [] };
    var v = rec.schemaVersion;
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || Math.floor(v) !== v) return { ok: false, rejected: true, reason: label + '_BAD_VERSION', migrations: [] };
    if (v > current) return { ok: false, rejected: true, reason: 'UNSUPPORTED_FUTURE_VERSION', migrations: [], detail: { found: v, current: current } };
    var out = rec, migrations = [];
    while ((out.schemaVersion || 0) < current) {
      var from = out.schemaVersion || 0;
      var step = steps[from];
      if (typeof step !== 'function') return { ok: false, rejected: true, reason: 'NO_MIGRATION_PATH', migrations: migrations, detail: { from: from } };
      out = step(out); // step MUST preserve unknown fields (carry-through) and bump schemaVersion
      out.schemaVersion = from + 1;
      migrations.push(label + ':' + from + '->' + (from + 1));
    }
    return { ok: true, record: out, migrations: migrations };
  }

  function migrateCaseRecord(rec) { return _migrate(rec, CASE_SCHEMA_VERSION, CASE_STEPS, 'case'); }
  function migrateSessionRecord(rec) { return _migrate(rec, SESSION_SCHEMA_VERSION, SESSION_STEPS, 'session'); }

  var api = {
    STORAGE_SCHEMA_VERSION: STORAGE_SCHEMA_VERSION, CASE_SCHEMA_VERSION: CASE_SCHEMA_VERSION, SESSION_SCHEMA_VERSION: SESSION_SCHEMA_VERSION,
    migrateCaseRecord: migrateCaseRecord, migrateSessionRecord: migrateSessionRecord,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SchemaMigration = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
