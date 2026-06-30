/**
 * scripts/migrators/experiment-migrator.js — R3.0F F1 · per-store migrator for r3_0e_experiments (R3.0E).
 *
 * Validates schemaVersion against the R3.0E experiment contract, runs the contract validator on the
 * post-migration record, and refuses any future version. F1 has NO step migrators (all R3.0E stores at v1)
 * — the wrapper establishes the framework for future bumps. NEVER fabricates producer attestation;
 * R3.0E store still re-validates on read via its own contract path. Migration of one experiment does NOT
 * touch the experiments index — the engine drives index rebuild as a separate, atomic post-batch step.
 *
 * UMD: Node require / Electron renderer global (R3_0F_ExperimentMigrator).
 */
(function (root) {
  'use strict';
  // Literal-only loader.
  var EC = null;
  if (typeof module !== 'undefined' && module.exports) { try { EC = require('../../contracts/r3.0e/experiment-contract.js'); } catch (_) { } }
  if (!EC) EC = (root && root.R3_0E_ExperimentContract) || null;

  var TARGET = 1; // mirrors r3-0e-stores.js SCHEMA_VERSIONS.experiment
  var STEPS = [];  // STEPS[i] migrates from version i → i+1; none yet at v1

  function migrate(rec) {
    // F1-R2-02: fail closed when the contract validator is unavailable. Without the validator
    // we cannot enforce post-migration invariants, so we refuse to certify any record as valid.
    if (!EC || typeof EC.validateExperimentShape !== 'function') {
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
      migrations.push('experiment:' + from + '->' + (from + 1));
    }
    var v2 = EC.validateExperimentShape(out);
    if (!v2 || v2.valid !== true) {
      return { ok: false, rejected: true, reason: 'POST_MIGRATION_INVALID', migrations: migrations, detail: { reasonCodes: (v2 && v2.reasonCodes) || [] } };
    }
    return { ok: true, record: out, migrations: migrations };
  }

  var api = { storeKey: 'r3_0e_experiments', targetVersion: TARGET, migrate: migrate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_ExperimentMigrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
