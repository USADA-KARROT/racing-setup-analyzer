/**
 * scripts/migrators/followup-migrator.js — R3.0F F1 · per-store migrator for r3_0e_followupLinks (R3.0E).
 *
 * Follow-up links carry NO comparison authority — that semantic invariant survives migration. The
 * migrator validates the post-migration shape via the R3.0E follow-up-link contract. F1 has NO step
 * migrators (v1). The reverse-index r3_0e_followupLinksByCase is rebuilt by the engine post-batch,
 * not here.
 *
 * UMD: Node require / Electron renderer global (R3_0F_FollowupMigrator).
 */
(function (root) {
  'use strict';
  // Literal-only loader.
  var FC = null;
  if (typeof module !== 'undefined' && module.exports) { try { FC = require('../../contracts/r3.0e/follow-up-link-contract.js'); } catch (_) { } }
  if (!FC) FC = (root && root.R3_0E_FollowUpLinkContract) || null;

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
      migrations.push('followUpLink:' + from + '->' + (from + 1));
    }
    if (FC && typeof FC.validateFollowUpLinkShape === 'function') {
      var v2 = FC.validateFollowUpLinkShape(out);
      if (!v2 || v2.valid !== true) {
        return { ok: false, rejected: true, reason: 'POST_MIGRATION_INVALID', migrations: migrations, detail: { reasonCodes: (v2 && v2.reasonCodes) || [] } };
      }
    }
    return { ok: true, record: out, migrations: migrations };
  }

  var api = { storeKey: 'r3_0e_followupLinks', targetVersion: TARGET, migrate: migrate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_FollowupMigrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
