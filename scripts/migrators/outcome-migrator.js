/**
 * scripts/migrators/outcome-migrator.js — R3.0F F1 · per-store migrator for r3_0e_outcomes (R3.0E).
 *
 * Validates schemaVersion against the R3.0E outcome contract, runs the contract shape validator on
 * the post-migration record, and refuses any future version. F1 has NO step migrators (all R3.0E
 * stores at v1). NEVER fabricates producer attestation; outcome-store re-validates on read. The
 * outcomes index is rebuilt by the engine post-batch, not here.
 *
 * UMD: Node require / Electron renderer global (R3_0F_OutcomeMigrator).
 */
(function (root) {
  'use strict';
  // Literal-only loader.
  var OC = null;
  if (typeof module !== 'undefined' && module.exports) { try { OC = require('../../contracts/r3.0e/outcome-contract.js'); } catch (_) { } }
  if (!OC) OC = (root && root.R3_0E_OutcomeContract) || null;

  var TARGET = 1;
  var STEPS = [];

  function migrate(rec) {
    // F1-R2-02: fail closed when the contract validator is unavailable.
    if (!OC || typeof OC.validateOutcomeShape !== 'function') {
      return { ok: false, rejected: true, reason: 'NO_MIGRATION_PATH', migrations: [] };
    }
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
      migrations.push('outcome:' + from + '->' + (from + 1));
    }
    var v2 = OC.validateOutcomeShape(out);
    if (!v2 || v2.valid !== true) {
      return { ok: false, rejected: true, reason: 'POST_MIGRATION_INVALID', migrations: migrations, detail: { reasonCodes: (v2 && v2.reasonCodes) || [] } };
    }
    return { ok: true, record: out, migrations: migrations };
  }

  var api = { storeKey: 'r3_0e_outcomes', targetVersion: TARGET, migrate: migrate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_OutcomeMigrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
