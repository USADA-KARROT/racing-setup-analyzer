/**
 * scripts/migrators/timeline-migrator.js — R3.0F F1 · per-store migrator for r3_0e_timelines (R3.0E).
 *
 * Timeline records are append-only. The migrator validates the post-migration shape via the R3.0E
 * case-timeline contract. F1 has NO step migrators (v1). Migration NEVER reorders timeline events,
 * NEVER removes events, NEVER fabricates events, NEVER weakens the monotonic-time guarantee. A timeline
 * whose events.at sequence is non-monotonic in the source record is treated as POST_MIGRATION_INVALID
 * (the contract validator enforces this).
 *
 * UMD: Node require / Electron renderer global (R3_0F_TimelineMigrator).
 */
(function (root) {
  'use strict';
  // Literal-only loader.
  var TC = null;
  if (typeof module !== 'undefined' && module.exports) { try { TC = require('../../contracts/r3.0e/case-timeline-contract.js'); } catch (_) { } }
  if (!TC) TC = (root && root.R3_0E_CaseTimelineContract) || null;

  var TARGET = 1;
  var STEPS = [];

  function migrate(rec) {
    if (rec === null || typeof rec !== 'object' || Array.isArray(rec)) {
      return { ok: false, rejected: true, reason: 'RECORD_NOT_AN_OBJECT', migrations: [] };
    }
    var v = rec.schemaVersion;
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || Math.floor(v) !== v) {
      return { ok: false, rejected: true, reason: 'RECORD_BAD_VERSION', migrations: [] };
    }
    if (v > TARGET) {
      return { ok: false, rejected: true, reason: 'UNSUPPORTED_FUTURE_VERSION', migrations: [], detail: { found: v, current: TARGET } };
    }
    var out = rec, migrations = [];
    while ((out.schemaVersion || 0) < TARGET) {
      var from = out.schemaVersion || 0;
      var step = STEPS[from];
      if (typeof step !== 'function') {
        return { ok: false, rejected: true, reason: 'NO_MIGRATION_PATH', migrations: migrations, detail: { from: from } };
      }
      out = step(out);
      out.schemaVersion = from + 1;
      migrations.push('timeline:' + from + '->' + (from + 1));
    }
    if (TC && typeof TC.validateCaseTimelineShape === 'function') {
      var v2 = TC.validateCaseTimelineShape(out);
      if (!v2 || v2.valid !== true) {
        return { ok: false, rejected: true, reason: 'POST_MIGRATION_INVALID', migrations: migrations, detail: { reasonCodes: (v2 && v2.reasonCodes) || [] } };
      }
    }
    return { ok: true, record: out, migrations: migrations };
  }

  var api = { storeKey: 'r3_0e_timelines', targetVersion: TARGET, migrate: migrate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_TimelineMigrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
