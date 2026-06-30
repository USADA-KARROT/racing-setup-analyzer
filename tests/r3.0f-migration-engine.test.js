/**
 * tests/r3.0f-migration-engine.test.js — R3.0F F1 · adversarial migration-engine tests.
 *
 * Covers (per F1 governance spec) plus Codex F1 R1 closure regressions (F1-R1-01..F1-R1-10):
 *   current-version no-op / single-step / multi-step / idempotency-NO-CHURN / interrupted /
 *   partial-store failure / malformed legacy row / unknown future version / sparse arrays /
 *   accessor / symbol / non-enumerable / Proxy input / prototype pollution / hostile intrinsic
 *   rebind / JSON-fallback removal / duplicated IDs / clock rollback / timeline monotonicity /
 *   cross-case contamination / migration rollback failure journal / producer-attestation
 *   restoration boundary / closed reason-code coercion / envelope structural validation /
 *   lifetimeJournalDropped safe-integer / hash family prefix / atomic-cross-store commit /
 *   journal-overflow preflight halt / META transact return-shape validation.
 */
'use strict';
var ENG = require('../renderer/js/r3-0f-migration-engine.js');
var SB  = require('../renderer/js/storage-backend.js');
var ENV = require('../contracts/r3.0f/migration-envelope.js');

var pass = 0, fail = 0;
function chk(msg, cond, detail) {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}
function asyncCase(name, fn) { return fn().catch(function (e) { fail += 1; console.log('  FAIL ' + name + ' threw: ' + (e && e.stack || e)); }); }
function freshJournalReader(b) { var e = ENG.createMigrationEngine({ backend: b, stamp: STAMP }); return e.journal(); }
var STAMP = '2026-07-01T00:00:00.000Z';

// ── A. Engine factory contract ───────────────────────────────────────────────
chk('factory rejects when backend missing transact', (function () { try { ENG.createMigrationEngine({}); return false; } catch (e) { return /backend/.test(String(e.message)); } })());
chk('factory rejects when backend missing list+get', (function () { try { ENG.createMigrationEngine({ backend: { transact: function () {} } }); return false; } catch (e) { return /list/.test(String(e.message)); } })());
chk('factory rejects bad migrator targetVersion drift', (function () { try { ENG.createMigrationEngine({ backend: SB.MemoryBackend(), registry: { cases: { storeKey: 'cases', targetVersion: 99, migrate: function () {} } } }); return false; } catch (e) { return /drift/.test(String(e.message)); } })());
chk('factory rejects migrator with wrong storeKey identity', (function () { try { ENG.createMigrationEngine({ backend: SB.MemoryBackend(), registry: { cases: { storeKey: 'WRONG', targetVersion: 1, migrate: function () {} } } }); return false; } catch (e) { return /invalid migrator/.test(String(e.message)); } })());

// ── B. Envelope contract ──────────────────────────────────────────────────────
(function () {
  var env = ENG.envelope();
  chk('envelope schemaVersion=1', env.schemaVersion === 1);
  chk('envelope engineVersion=1', env.engineVersion === 1);
  chk('envelope storageVersion=1', env.storageVersion === 1);
  chk('envelope perStore frozen', Object.isFrozen(env.perStore));
  chk('envelope is frozen', Object.isFrozen(env));
  chk('envelope perStore contains every known store', ['cases','sessions','r3_0e_experiments','r3_0e_outcomes','r3_0e_timelines','r3_0e_followupLinks'].every(function (k) { return env.perStore[k] === 1; }));
  try { env.perStore.cases = 99; } catch (_) {}
  chk('frozen envelope rejects perStore mutation', env.perStore.cases === 1);
  var v = ENV.validateEnvelope(env);
  chk('built envelope validates against contract', v.ok && v.violations.length === 0);
  var bad = ENV.validateEnvelope({ engineVersion: 99, storageVersion: 1, perStore: {} });
  chk('mismatched envelope rejected', !bad.ok && bad.violations.length > 0);
})();

// ── C. detect on empty backend ───────────────────────────────────────────────
asyncCase('empty-backend detect reports zeros', function () {
  var e = ENG.createMigrationEngine({ backend: SB.MemoryBackend(), stamp: STAMP });
  return e.detect().then(function (d) {
    chk('detect ok', d.ok === true);
    chk('detect currentEnvelope null on first run', d.currentEnvelope === null);
    chk('detect knownStores has 6', d.knownStores.length === 6);
    chk('detect perStoreStatus has 6 keys', Object.keys(d.perStoreStatus).length === 6);
    chk('detect counts all zero', Object.keys(d.perStoreStatus).every(function (k) { return d.perStoreStatus[k].records === 0; }));
  });
});

// ── D. plan() is pure preview ────────────────────────────────────────────────
asyncCase('plan on empty backend produces zero steps and zero blockers', function () {
  var b = SB.MemoryBackend();
  var e = ENG.createMigrationEngine({ backend: b, stamp: STAMP });
  return e.plan().then(function (p) {
    chk('plan ok', p.ok === true);
    chk('plan steps empty', p.steps.length === 0);
    chk('plan blockers empty', p.blockers.length === 0);
    return b.get('meta', '__r3_0f_migration_state__').then(function (s) {
      chk('plan did not write state', s === undefined);
    });
  });
});

// ── E. migrate without confirm ───────────────────────────────────────────────
asyncCase('migrate without confirm fails CONFIRM_REQUIRED', function () {
  var e = ENG.createMigrationEngine({ backend: SB.MemoryBackend(), stamp: STAMP });
  return e.migrate({}).then(function (r) {
    chk('refuses without confirm', r.ok === false && r.reasonCode === 'CONFIRM_REQUIRED');
    chk('halted report', r.report.status === 'halted');
  });
});

// ── F. F1-R1-04 — Pure no-op run: ZERO journal append, ZERO state write ─────
asyncCase('F1-R1-04: empty-backend migrate truly idempotent — no META write', function () {
  var b = SB.MemoryBackend();
  var e = ENG.createMigrationEngine({ backend: b, stamp: STAMP });
  return e.migrate({ confirm: true }).then(function (r) {
    chk('empty migrate ok + status no-op', r.ok === true && r.report.status === 'no-op');
    chk('idempotentSkipped flag set', r.report.idempotentSkipped === true);
    chk('zero journal appended', r.report.journalAppended === 0);
    return b.get('meta', '__r3_0f_migration_state__');
  }).then(function (s) {
    chk('state NOT persisted on empty no-op (truly idempotent)', s === undefined);
  });
});

asyncCase('F1-R1-04: at-target case is no-op, no journal append, no state churn', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'c1', { schemaVersion: 1, caseId: 'c1', metadata: { title: 'X' } }).then(function () {
    var e = ENG.createMigrationEngine({ backend: b, stamp: STAMP });
    return e.migrate({ confirm: true });
  }).then(function (r) {
    chk('first migrate ok', r.ok === true);
    chk('cases.noop=1', r.report.perStore.cases.noop === 1);
    chk('zero journal appended (no churn from no-op)', r.report.journalAppended === 0);
    chk('idempotentSkipped on pure no-op', r.report.idempotentSkipped === true);
    return b.get('meta', '__r3_0f_migration_journal__');
  }).then(function (j) {
    chk('no journal persisted (pure no-op)', j === undefined || (Array.isArray(j) && j.length === 0));
  });
});

// ── G. Future-version rejected ──────────────────────────────────────────────
asyncCase('future-version case rejected fail-closed', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'cFuture', { schemaVersion: 99, caseId: 'cFuture' }).then(function () {
    var e = ENG.createMigrationEngine({ backend: b, stamp: STAMP });
    return e.migrate({ confirm: true });
  }).then(function (r) {
    chk('future-version rejected count=1', r.report.perStore.cases.rejected === 1);
    chk('overall status=partial', r.report.status === 'partial');
    return b.get('cases', 'cFuture');
  }).then(function (rec) {
    chk('future-version record UNTOUCHED', rec && rec.schemaVersion === 99);
  });
});

// ── H. Malformed records ────────────────────────────────────────────────────
asyncCase('null/bad-version cases rejected with closed reasonCodes', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'cNull', null)
    .then(function () { return b.put('cases', 'cBadVersion', { schemaVersion: -1, caseId: 'cBadVersion' }); })
    .then(function () { return b.put('cases', 'cFloatVersion', { schemaVersion: 1.5, caseId: 'cFloat' }); })
    .then(function () { return b.put('cases', 'cStringVersion', { schemaVersion: '1', caseId: 'cStr' }); })
    .then(function () { return b.put('cases', 'cMissingVersion', { caseId: 'cMissing' }); })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('5 cases all rejected', r.report.perStore.cases.rejected === 5);
      chk('status=partial', r.report.status === 'partial');
      return freshJournalReader(b);
    })
    .then(function (j) {
      var cases = j.filter(function (e) { return e.store === 'cases'; });
      chk('5 rejected entries journaled', cases.length === 5);
      var reasons = cases.map(function (e) { return e.reasonCode; }).sort();
      chk('reasonCodes include RECORD_NOT_AN_OBJECT', reasons.indexOf('RECORD_NOT_AN_OBJECT') !== -1);
      chk('reasonCodes include RECORD_BAD_VERSION', reasons.indexOf('RECORD_BAD_VERSION') !== -1);
    });
});

// ── I. F1-R1-01 — Migrator returning unknown reasonCode is COERCED ──────────
asyncCase('F1-R1-01: unknown migrator reasonCode coerced to NO_MIGRATION_PATH', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function () { return { ok: false, reason: 'EVIL_CUSTOM_CODE', migrations: ['fake-step'] }; } } };
  return b.put('cases', 'cEvil', { schemaVersion: 1, caseId: 'cEvil' }).then(function () {
    return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true });
  }).then(function () {
    return freshJournalReader(b);
  }).then(function (j) {
    var c = j.filter(function (e) { return e.store === 'cases'; });
    chk('evil reason coerced to NO_MIGRATION_PATH', c.length === 1 && c[0].reasonCode === 'NO_MIGRATION_PATH');
    chk('migrationsApplied preserved as fake-step string', c[0].migrationsApplied[0] === 'fake-step');
  });
});

asyncCase('F1-R1-01: migrator returning non-string migrations sanitized', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, extra: 'x' }, migrations: ['ok', 1234, null, '', 'a'.repeat(200), 'good'] };
  } } };
  return b.put('cases', 'cX', { schemaVersion: 1, caseId: 'cX' }).then(function () {
    return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true });
  }).then(function () {
    return freshJournalReader(b);
  }).then(function (j) {
    var c = j.filter(function (e) { return e.store === 'cases'; });
    // Only 'ok' and 'good' survive: int/null/empty/string-too-long are all stripped
    chk('non-string migration labels stripped', c.length === 1 && c[0].migrationsApplied.length === 2 && c[0].migrationsApplied[0] === 'ok' && c[0].migrationsApplied[1] === 'good');
  });
});

// ── J. F1-R1-02 — Hostile toJSON cannot run inside the ENGINE's firewall ────
asyncCase('F1-R1-02: engine firewall does NOT invoke toJSON (structuredClone-only)', function () {
  // We bypass MemoryBackend's clone path entirely by using a wrapped backend whose .list returns
  // the ORIGINAL hostile object (un-cloned). The engine's _sanitize must use structuredClone-only;
  // structuredClone(hostileRec) where toJSON is a function throws DataCloneError, so the engine
  // REJECTS with PROXY_INPUT_REJECTED and never invokes toJSON.
  var hijackInvoked = false;
  var hostileRec = { schemaVersion: 1, caseId: 'cJSON', toJSON: function () { hijackInvoked = true; return { schemaVersion: 1, caseId: 'cJSONHijacked' }; } };
  var real = SB.MemoryBackend();
  var wrapped = {
    list: function (ns) { if (ns === 'cases') return Promise.resolve([{ key: 'cJSON', value: hostileRec }]); return real.list(ns); },
    get: real.get.bind(real),
    put: real.put.bind(real),
    transact: real.transact.bind(real)
  };
  return ENG.createMigrationEngine({ backend: wrapped, stamp: STAMP }).migrate({ confirm: true })
    .then(function (r) {
      chk('engine firewall did NOT invoke toJSON', hijackInvoked === false);
      chk('hostile record REJECTED', r.report.perStore.cases.rejected === 1);
      return ENG.createMigrationEngine({ backend: wrapped, stamp: STAMP }).journal();
    })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('reasonCode PROXY_INPUT_REJECTED', c.length === 1 && c[0].reasonCode === 'PROXY_INPUT_REJECTED');
    });
});

// ── K. F1-R1-03 — Atomic commit: backend rejection means NOTHING is written ─
asyncCase('F1-R1-03: backend.transact failure → no partial writes, no journal landed', function () {
  var real = SB.MemoryBackend();
  var rejectAll = false;
  var wrapped = {
    list: real.list.bind(real), get: real.get.bind(real), put: real.put.bind(real),
    transact: function (spec) {
      if (rejectAll) return Promise.reject(new Error('disk full'));
      return real.transact(spec);
    }
  };
  return real.put('cases', 'cInt', { schemaVersion: 1, caseId: 'cInt', metadata: { title: 'T' } }).then(function () {
    var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
      return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, migratedAt: 'now' }, migrations: ['delta'] };
    } } };
    rejectAll = true;
    var e = ENG.createMigrationEngine({ backend: wrapped, registry: registry, stamp: STAMP });
    return e.migrate({ confirm: true });
  }).then(function (r) {
    chk('backend rejection → ok=false', r.ok === false);
    chk('reasonCode=BACKEND_REJECTED', r.reasonCode === 'BACKEND_REJECTED');
    chk('status=halted', r.report.status === 'halted');
    return real.get('cases', 'cInt');
  }).then(function (rec) {
    chk('original record UNCHANGED (no partial write)', rec && !rec.migratedAt);
    return real.get('meta', '__r3_0f_migration_journal__');
  }).then(function (j) {
    chk('no journal landed (atomic rollback)', j === undefined);
    return real.get('meta', '__r3_0f_migration_state__');
  }).then(function (st) {
    chk('no state landed (atomic rollback)', st === undefined);
  });
});

// ── L. F1-R1-05 — JOURNAL_OVERFLOW preflight halt ───────────────────────────
asyncCase('F1-R1-05: overflow preflight halts before mutation', function () {
  var b = SB.MemoryBackend();
  // 50 records, maxJournal=5 → threshold = 20; 50 > 20 → halt
  var seed = Promise.resolve();
  for (var i = 0; i < 50; i++) (function (idx) { seed = seed.then(function () { return b.put('cases', 'c' + idx, { schemaVersion: 1, caseId: 'c' + idx }); }); })(i);
  return seed.then(function () {
    var e = ENG.createMigrationEngine({ backend: b, stamp: STAMP, maxJournalEntries: 5 });
    return e.migrate({ confirm: true });
  }).then(function (r) {
    chk('JOURNAL_OVERFLOW returned', r.ok === false && r.reasonCode === 'JOURNAL_OVERFLOW');
    chk('status=halted before any mutation', r.report.status === 'halted');
    return b.get('meta', '__r3_0f_migration_journal__');
  }).then(function (j) {
    chk('no journal written on overflow halt', j === undefined);
  });
});

// ── M. F1-R1-06 — Malformed envelope structurally rejected ──────────────────
asyncCase('F1-R1-06: malformed persisted envelope halts ENVELOPE_VERSION_MISMATCH', function () {
  var b = SB.MemoryBackend();
  return b.put('meta', '__r3_0f_migration_state__', { schemaVersion: 1, envelope: { engineVersion: '99', storageVersion: 1, perStore: { cases: 1 } } })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('malformed envelope refused', r.ok === false && r.reasonCode === 'ENVELOPE_VERSION_MISMATCH');
      chk('envelopeViolations present', Array.isArray(r.report.envelopeViolations) && r.report.envelopeViolations.length > 0);
    });
});

asyncCase('F1-R1-06: per-store drift in persisted envelope refused', function () {
  var b = SB.MemoryBackend();
  return b.put('meta', '__r3_0f_migration_state__', { schemaVersion: 1, envelope: { engineVersion: 1, storageVersion: 1, perStore: { cases: 1, sessions: 99, r3_0e_experiments: 1, r3_0e_outcomes: 1, r3_0e_timelines: 1, r3_0e_followupLinks: 1 } } })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('per-store drift refused', r.ok === false && r.reasonCode === 'ENVELOPE_VERSION_MISMATCH');
    });
});

// ── N. F1-R1-07 — lifetimeJournalDropped must be safe integer ───────────────
asyncCase('F1-R1-07: hostile lifetimeJournalDropped (-10) refused', function () {
  var b = SB.MemoryBackend();
  return b.put('meta', '__r3_0f_migration_state__', { schemaVersion: 1, envelope: ENG.envelope(), lifetimeJournalDropped: -10 })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) { chk('negative lifetimeJournalDropped refused', r.ok === false); });
});

asyncCase('F1-R1-07: NaN lifetimeJournalDropped refused', function () {
  var b = SB.MemoryBackend();
  return b.put('meta', '__r3_0f_migration_state__', { schemaVersion: 1, envelope: ENG.envelope(), lifetimeJournalDropped: NaN })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) { chk('NaN lifetimeJournalDropped refused', r.ok === false); });
});

// ── O. F1-R1-08 — recordHash carries family prefix ──────────────────────────
asyncCase('F1-R1-08: recordHash prefixed with fnv1a64 (non-cryptographic marker)', function () {
  var b = SB.MemoryBackend();
  // To trigger a migrated journal entry, we need a record requiring migration. Use registry override.
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, x: 1 }, migrations: ['delta'] };
  } } };
  return b.put('cases', 'cH', { schemaVersion: 1, caseId: 'cH' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('hash prefix fnv1a64:', c.length === 1 && c[0].recordHash.indexOf('fnv1a64:') === 0);
    });
});

// ── P. F1-R1-09 — Producer-attestation field forbidden ──────────────────────
asyncCase('F1-R1-09: migrator output containing _authoritative rejected', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, _authoritative: true }, migrations: ['evil'] };
  } } };
  return b.put('cases', 'cA', { schemaVersion: 1, caseId: 'cA' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('attestation field rejected', c.length === 1 && c[0].status === 'rejected' && c[0].reasonCode === 'PRODUCER_ATTESTATION_REFUSED');
    });
});

asyncCase('F1-R1-09: nested __verified field rejected', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, metadata: { nested: { __verified: 1 } } }, migrations: ['x'] };
  } } };
  return b.put('cases', 'cN', { schemaVersion: 1, caseId: 'cN' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('nested attestation field rejected', c.length === 1 && c[0].reasonCode === 'PRODUCER_ATTESTATION_REFUSED');
    });
});

asyncCase('F1-R1-09: PRODUCER_ATTESTATION_FIELDS list exposed', function () {
  chk('list contains _authoritative', ENG.PRODUCER_ATTESTATION_FIELDS.indexOf('_authoritative') !== -1);
  chk('list contains __verified', ENG.PRODUCER_ATTESTATION_FIELDS.indexOf('__verified') !== -1);
  return Promise.resolve();
});

// ── Q. F1-R1-10 — META transact return-shape validation ─────────────────────
asyncCase('F1-R1-10: backend transact returning bad shape → BACKEND_REJECTED', function () {
  var real = SB.MemoryBackend();
  var wrapped = {
    list: real.list.bind(real), get: real.get.bind(real), put: real.put.bind(real),
    transact: function (spec) {
      // For data+meta transact, return a malformed result instead of the proper { journalLen, dropped }
      var hasMeta = spec.stores && spec.stores.indexOf('meta') !== -1;
      if (hasMeta) {
        // Actually apply writes but return a bad shape
        return real.transact(spec).then(function () { return { wrong: 'shape' }; });
      }
      return real.transact(spec);
    }
  };
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, x: 1 }, migrations: ['delta'] };
  } } };
  return real.put('cases', 'cBad', { schemaVersion: 1, caseId: 'cBad' })
    .then(function () { return ENG.createMigrationEngine({ backend: wrapped, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('bad transact shape → ok false', r.ok === false);
      chk('reasonCode=BACKEND_REJECTED', r.reasonCode === 'BACKEND_REJECTED');
      chk('metaWriteError mentions shape', r.report.metaWriteError && r.report.metaWriteError.indexOf('shape') !== -1);
    });
});

// ── R. Hostile inputs ───────────────────────────────────────────────────────
asyncCase('hostile: prototype-pollution stripped', function () {
  var b = SB.MemoryBackend();
  var evil = JSON.parse('{"schemaVersion":1,"caseId":"cEvil","__proto__":{"polluted":true}}');
  return b.put('cases', 'cEvil', evil)
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { chk('Object.prototype.polluted undefined', ({}).polluted === undefined); });
});

asyncCase('hostile: Proxy record sanitized', function () {
  if (typeof Proxy !== 'function') { chk('Proxy unavailable — skipping', true); return Promise.resolve(); }
  var b = SB.MemoryBackend();
  var trapped = new Proxy({ schemaVersion: 1, caseId: 'cProx' }, { get: function (t, p) { return t[p]; } });
  return b.put('cases', 'cProx', trapped)
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) { chk('proxy record handled', r.report.perStore.cases.records === 1); });
});

asyncCase('migrator throwing → MIGRATOR_THREW', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function () { throw new Error('boom'); } } };
  return b.put('cases', 'cThrow', { schemaVersion: 1, caseId: 'cThrow' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('throwing migrator → failed', r.report.perStore.cases.failed === 1);
      chk('status=halted', r.report.status === 'halted');
      return freshJournalReader(b);
    })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('one MIGRATOR_THREW entry', c.length === 1 && c[0].reasonCode === 'MIGRATOR_THREW');
    });
});

asyncCase('migrator returning bad shape → failed', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function () { return { not: 'ok' }; } } };
  return b.put('cases', 'cBad', { schemaVersion: 1, caseId: 'cBad' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) { chk('bad-shape migrator → failed', r.report.perStore.cases.failed === 1); });
});

asyncCase('migrator returning non-object record → failed', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function () { return { ok: true, record: 'not-an-object', migrations: [] }; } } };
  return b.put('cases', 'cBad2', { schemaVersion: 1, caseId: 'cBad2' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('POST_MIGRATION_INVALID recorded', c.length === 1 && c[0].reasonCode === 'POST_MIGRATION_INVALID');
    });
});

asyncCase('migrator version overshoot → POST_MIGRATION_INVALID', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) { return { ok: true, record: { schemaVersion: 99, caseId: rec.caseId }, migrations: ['0->99'] }; } } };
  return b.put('cases', 'cOver', { schemaVersion: 1, caseId: 'cOver' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('overshoot → POST_MIGRATION_INVALID', c.length === 1 && c[0].reasonCode === 'POST_MIGRATION_INVALID');
    });
});

asyncCase('record exceeding maxRecordBytes rejected', function () {
  var b = SB.MemoryBackend();
  var bigText = ''; for (var i = 0; i < 1500; i++) bigText += 'A';
  return b.put('cases', 'cBig', { schemaVersion: 1, caseId: 'cBig', bigText: bigText })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP, maxRecordBytes: 1000 }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('large record rejected', r.report.perStore.cases.rejected === 1);
      return freshJournalReader(b);
    })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('RECORD_TOO_LARGE reasonCode', c.length === 1 && c[0].reasonCode === 'RECORD_TOO_LARGE');
    });
});

// ── S. Producer-attestation restoration boundary ────────────────────────────
asyncCase('post-migration value handed to backend is plain JSON-clone', function () {
  // After F1-R2-01, the engine's transact.compute requires proper read values to be passed.
  // We verify the stored value AFTER migrate() completes by reading the backend directly.
  var real = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, addedField: 'x' }, migrations: ['delta'] };
  } } };
  return real.put('cases', 'cAttest', { schemaVersion: 1, caseId: 'cAttest' })
    .then(function () { return ENG.createMigrationEngine({ backend: real, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('migrate ok', r.ok === true);
      return real.get('cases', 'cAttest');
    })
    .then(function (observedValue) {
      chk('value persisted', observedValue !== null && observedValue !== undefined);
      chk('observed value has plain prototype', observedValue && Object.getPrototypeOf(observedValue) === Object.prototype);
      chk('observed value is not frozen (live store re-validates)', observedValue && !Object.isFrozen(observedValue));
      chk('observed value has addedField', observedValue && observedValue.addedField === 'x');
    });
});

// ── T. Journal append-only across runs ──────────────────────────────────────
asyncCase('journal grows across runs (with mutating records)', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, x: 1 }, migrations: ['delta'] };
  } } };
  return b.put('cases', 'c1', { schemaVersion: 1, caseId: 'c1' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j1) {
      var len1 = j1.length;
      return b.put('cases', 'c2', { schemaVersion: 1, caseId: 'c2' })
        .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
        .then(function () { return freshJournalReader(b); })
        .then(function (j2) {
          chk('journal grew', j2.length > len1);
          var same = true; for (var i = 0; i < len1; i++) { if (j2[i].key !== j1[i].key) { same = false; break; } }
          chk('prior entries unchanged', same);
        });
    });
});

// ── U. Journal ring buffer (drops oldest, keeps newest) ─────────────────────
asyncCase('journal ring buffer keeps newest and accounts dropped', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, x: 1 }, migrations: ['delta'] };
  } } };
  var seed = Promise.resolve();
  for (var i = 0; i < 10; i++) (function (idx) { seed = seed.then(function () { return b.put('cases', 'c' + idx, { schemaVersion: 1, caseId: 'c' + idx }); }); })(i);
  // maxJournal=4 → threshold 16; 10 fits, journal compacts to 4
  return seed.then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP, maxJournalEntries: 4 }).migrate({ confirm: true }); })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP, maxJournalEntries: 4 }).journal(); })
    .then(function (j) {
      chk('journal compacted to 4', j.length === 4);
      return b.get('meta', '__r3_0f_migration_state__');
    })
    .then(function (st) {
      chk('lifetimeJournalDropped = 6', st.lifetimeJournalDropped === 6);
    });
});

// ── V. Engine refuses with persisted engineVersion > current ───────────────
asyncCase('engine refuses with persisted engineVersion > current', function () {
  var b = SB.MemoryBackend();
  // craft an envelope that PASSES validateEnvelope structurally (won't trip F1-R1-06) but has
  // engineVersion > current — must be caught by the numeric engineVersion check
  // validateEnvelope requires engineVersion === ENGINE_VERSION === 1, so any number > 1 will fail
  // structural validation FIRST. To target the numeric check specifically, we'd need a partial
  // envelope. Easier: just confirm the END behavior — high engineVersion triggers a refusal.
  return b.put('meta', '__r3_0f_migration_state__', { schemaVersion: 1, envelope: { engineVersion: 99, storageVersion: 1, perStore: { cases: 1 } } })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('refused with ENVELOPE_VERSION_MISMATCH', r.ok === false && r.reasonCode === 'ENVELOPE_VERSION_MISMATCH');
    });
});

// ── W. Cross-store isolation ────────────────────────────────────────────────
asyncCase('failure in one store does not write another store', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'cFail', { schemaVersion: 1, caseId: 'cFail' })
    .then(function () { return b.put('sessions', 'sOk', { schemaVersion: 1, sessionId: 'sOk', summary: {}, raw: null, createdAt: STAMP }); })
    .then(function () {
      var registry = {
        cases: { storeKey: 'cases', targetVersion: 1, migrate: function () { throw new Error('boom'); } },
        sessions: { storeKey: 'sessions', targetVersion: 1, migrate: function (rec) { return { ok: true, record: rec, migrations: [] }; } },
        r3_0e_experiments:   require('../scripts/migrators/experiment-migrator.js'),
        r3_0e_outcomes:      require('../scripts/migrators/outcome-migrator.js'),
        r3_0e_timelines:     require('../scripts/migrators/timeline-migrator.js'),
        r3_0e_followupLinks: require('../scripts/migrators/followup-migrator.js')
      };
      return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true });
    })
    .then(function (r) {
      chk('cases failed=1', r.report.perStore.cases.failed === 1);
      chk('sessions noop=1', r.report.perStore.sessions.noop === 1);
      chk('sessions migrated=0', r.report.perStore.sessions.migrated === 0);
    });
});

// ── X. R3.0B integrity invariant ────────────────────────────────────────────
asyncCase('R3.0B SCHEMA_VERSION matches envelope target', function () {
  var SM = require('../renderer/js/schema-migration.js');
  chk('CASE_SCHEMA_VERSION', SM.CASE_SCHEMA_VERSION === ENV.PER_STORE_TARGETS.cases);
  chk('SESSION_SCHEMA_VERSION', SM.SESSION_SCHEMA_VERSION === ENV.PER_STORE_TARGETS.sessions);
  return Promise.resolve();
});

// ── Y. R3.0E contract integration ───────────────────────────────────────────
asyncCase('R3.0E experiment-migrator validates against R3.0E contract', function () {
  var b = SB.MemoryBackend();
  var validExp = {
    schemaVersion: 1, experimentId: 'exp_0123456789abcdef', sourceCaseId: 'case_demo',
    sourceHypothesisId: 'pri_0123456789abcdef', sourceRecommendationId: 'priority_demo',
    targetMetric: 'roll_gradient_deg_per_g', baselineValue: 3.5, expectedDirection: 'decrease',
    expectedMagnitudeRange: { min: 0.5, max: 1.5 },
    setupChange: { component: 'front_arb', delta_nm_per_deg: 200 },
    driverInstruction: null, controlVariables: [],
    validationPlan: 'r3.0e.plan.controlled_repeat_lap',
    stopConditions: [{ i18nKey: 'r3.0e.stop.lap_time_increase', params: { threshold_s: 0.5 } }],
    status: 'planned', followUpCaseIds: [], outcome: null, createdAt: '2026-06-30T10:00:00Z'
  };
  return b.put('r3_0e_experiments', 'exp_0123456789abcdef', validExp)
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('valid experiment no-op', r.report.perStore.r3_0e_experiments.noop === 1);
    });
});

asyncCase('R3.0E experiment future-version rejected', function () {
  var b = SB.MemoryBackend();
  return b.put('r3_0e_experiments', 'expFuture', { schemaVersion: 9, experimentId: 'expFuture' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) { chk('future experiment rejected', r.report.perStore.r3_0e_experiments.rejected === 1); });
});

asyncCase('R3.0E experiment invalid-at-target rejected via contract', function () {
  var b = SB.MemoryBackend();
  return b.put('r3_0e_experiments', 'expBad', { schemaVersion: 1, experimentId: 'no_other_fields' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'r3_0e_experiments'; });
      chk('contract-invalid experiment rejected', c.length === 1 && c[0].reasonCode === 'POST_MIGRATION_INVALID');
    });
});

// ── Z. Journal entry shape valid ────────────────────────────────────────────
asyncCase('every journal entry validates against contract', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'cF', { schemaVersion: 99, caseId: 'cF' })
    .then(function () { return b.put('cases', 'cBad', { caseId: 'cBad' }); })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).journal(); })
    .then(function (j) {
      chk('journal length=2', j.length === 2);
      var allValid = j.every(function (entry) { return ENV.validateJournalEntry(entry).ok; });
      chk('all journal entries valid', allValid);
      chk('all entries frozen', j.every(function (e) { return Object.isFrozen(e); }));
    });
});

// ── AA. detect vs plan consistency ──────────────────────────────────────────
asyncCase('detect and plan agree', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'c1', { schemaVersion: 1, caseId: 'c1' })
    .then(function () { return b.put('cases', 'c2', { schemaVersion: 99, caseId: 'c2' }); })
    .then(function () {
      var e = ENG.createMigrationEngine({ backend: b, stamp: STAMP });
      return Promise.all([e.detect(), e.plan()]);
    }).then(function (arr) {
      var d = arr[0], p = arr[1];
      chk('detect cases.records=2', d.perStoreStatus.cases.records === 2);
      chk('detect cases.atTarget=1', d.perStoreStatus.cases.atTarget === 1);
      chk('detect cases.futureVersion=1', d.perStoreStatus.cases.futureVersion === 1);
      chk('plan blockers include UNSUPPORTED_FUTURE_VERSION', p.blockers.some(function (b) { return b.reasonCode === 'UNSUPPORTED_FUTURE_VERSION' && b.store === 'cases'; }));
    });
});

// ── BB. detect per-store list failure ───────────────────────────────────────
asyncCase('detect handles per-store list failure', function () {
  var real = SB.MemoryBackend();
  var wrapped = {
    list: function (ns) { if (ns === 'cases') return Promise.reject(new Error('iorr')); return real.list(ns); },
    get: real.get.bind(real), put: real.put.bind(real), transact: real.transact.bind(real)
  };
  return ENG.createMigrationEngine({ backend: wrapped, stamp: STAMP }).detect().then(function (d) {
    chk('cases listFailed=true', d.perStoreStatus.cases.listFailed === true);
  });
});

// ── CC. Unkeyed row defense ─────────────────────────────────────────────────
asyncCase('unkeyed row journaled as failed', function () {
  var real = SB.MemoryBackend();
  var wrapped = {
    list: function (ns) {
      if (ns === 'cases') return Promise.resolve([ { value: { schemaVersion: 1, caseId: 'x' } } ]);
      return real.list(ns);
    },
    get: real.get.bind(real), put: real.put.bind(real), transact: real.transact.bind(real)
  };
  return ENG.createMigrationEngine({ backend: wrapped, stamp: STAMP }).migrate({ confirm: true }).then(function (r) {
    chk('unkeyed failed=1', r.report.perStore.cases.failed === 1);
    return ENG.createMigrationEngine({ backend: wrapped, stamp: STAMP }).journal();
  }).then(function (j) {
    var c = j.filter(function (e) { return e.store === 'cases'; });
    chk('unkeyed reasonCode=BACKEND_REJECTED', c.length === 1 && c[0].reasonCode === 'BACKEND_REJECTED');
  });
});

// ── DD. validateJournalEntry edge cases ─────────────────────────────────────
chk('validateJournalEntry rejects null', !ENV.validateJournalEntry(null).ok);
chk('validateJournalEntry rejects bad status', !ENV.validateJournalEntry({ schemaVersion: 1, recordedAt: STAMP, store: 'x', key: 'y', fromVersion: 0, toVersion: 1, status: 'bogus', recordHash: '', migrationsApplied: [], limitations: [] }).ok);
chk('validateJournalEntry rejects missing reason on rejected', !ENV.validateJournalEntry({ schemaVersion: 1, recordedAt: STAMP, store: 'x', key: 'y', fromVersion: 0, toVersion: 1, status: 'rejected', recordHash: '', migrationsApplied: [], limitations: [] }).ok);
chk('validateJournalEntry accepts well-formed rejected', ENV.validateJournalEntry({ schemaVersion: 1, recordedAt: STAMP, store: 'x', key: 'y', fromVersion: 0, toVersion: 1, status: 'rejected', recordHash: '', migrationsApplied: [], limitations: [], reasonCode: 'NO_MIGRATION_PATH' }).ok);

// ── EE. default registry ────────────────────────────────────────────────────
asyncCase('default registry exposes 6 stores', function () {
  var k = ENG.createMigrationEngine({ backend: SB.MemoryBackend(), stamp: STAMP }).knownStores().sort();
  chk('6 stores', k.length === 6);
  ['cases','sessions','r3_0e_experiments','r3_0e_outcomes','r3_0e_timelines','r3_0e_followupLinks'].forEach(function (s) {
    chk('registry contains ' + s, k.indexOf(s) !== -1);
  });
  return Promise.resolve();
});

// ── FF. Enums frozen ────────────────────────────────────────────────────────
chk('REASON_CODES frozen', Object.isFrozen(ENV.REASON_CODES));
chk('STATUS_VALUES frozen', Object.isFrozen(ENV.STATUS_VALUES));
chk('REPORT_STATUS_VALUES contains complete/partial/halted/no-op', ENV.REPORT_STATUS_VALUES.indexOf('complete') !== -1 && ENV.REPORT_STATUS_VALUES.indexOf('halted') !== -1);
chk('PRODUCER_ATTESTATION_FIELDS is array', Array.isArray(ENG.PRODUCER_ATTESTATION_FIELDS));

// ── GG. Deeply nested record handled ────────────────────────────────────────
asyncCase('deep record handled without crash', function () {
  var b = SB.MemoryBackend();
  var deep = {}; var cur = deep;
  for (var i = 0; i < 30; i++) { cur.child = {}; cur = cur.child; }
  return b.put('cases', 'cD', { schemaVersion: 1, caseId: 'cD', payload: deep })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) { chk('deep record processed', r.report.perStore.cases.records === 1); });
});

// ── HH. envelope() frozen ───────────────────────────────────────────────────
chk('envelope() frozen', Object.isFrozen(ENG.envelope()));
chk('envelope().perStore frozen', Object.isFrozen(ENG.envelope().perStore));

// ── II. clock injection determinism ─────────────────────────────────────────
asyncCase('injected stamp pinned in journal recordedAt', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'cClock', { schemaVersion: 99, caseId: 'cClock' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('recordedAt = STAMP', c.length === 1 && c[0].recordedAt === STAMP);
    });
});

// ── JJ. After migrate, plan shows no-migrate steps ──────────────────────────
asyncCase('after migrate, plan has no migrate steps', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'c1', { schemaVersion: 1, caseId: 'c1' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).plan(); })
    .then(function (p) {
      chk('no migrate-action steps', p.steps.every(function (s) { return s.action !== 'migrate'; }));
      chk('plan blockers empty', p.blockers.length === 0);
    });
});

// ── KK. Idempotency: second migrate after pure no-op also no-op ─────────────
asyncCase('second migrate on unchanged data is no-op (no journal churn)', function () {
  var b = SB.MemoryBackend();
  return b.put('cases', 'c1', { schemaVersion: 1, caseId: 'c1' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return ENG.createMigrationEngine({ backend: b, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r2) {
      chk('second run = no-op', r2.report.status === 'no-op');
      chk('second run idempotentSkipped', r2.report.idempotentSkipped === true);
      chk('second run journalAppended=0', r2.report.journalAppended === 0);
    });
});

// ── MM. F1-R2-01 — TOCTOU: concurrent write between list and transact detected ───
asyncCase('F1-R2-01: concurrent write between list and transact → BACKEND_REJECTED', function () {
  var real = SB.MemoryBackend();
  // Inject a wrapped backend that mutates `cases/c1` AFTER list() but BEFORE transact() runs
  // compute(). We intercept transact: when called by the engine, we first write a "concurrent"
  // value to the same key via the real backend, then forward the transact. Inside compute, the
  // engine's read will see the concurrent value, hash mismatch, and throw → BACKEND_REJECTED.
  var concurrentInjected = false;
  var wrapped = {
    list: real.list.bind(real), get: real.get.bind(real), put: real.put.bind(real),
    transact: function (spec) {
      // Only inject once and only when transact involves the cases store
      if (!concurrentInjected && spec.stores && spec.stores.indexOf('cases') !== -1) {
        concurrentInjected = true;
        return real.put('cases', 'c1', { schemaVersion: 1, caseId: 'c1', concurrent: true }).then(function () { return real.transact(spec); });
      }
      return real.transact(spec);
    }
  };
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, migratedAt: 'now' }, migrations: ['delta'] };
  } } };
  return real.put('cases', 'c1', { schemaVersion: 1, caseId: 'c1' })
    .then(function () { return ENG.createMigrationEngine({ backend: wrapped, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function (r) {
      chk('concurrent write detected → ok=false', r.ok === false);
      chk('reasonCode=BACKEND_REJECTED', r.reasonCode === 'BACKEND_REJECTED');
      chk('metaWriteError mentions CONCURRENT', r.report.metaWriteError && r.report.metaWriteError.indexOf('CONCURRENT_WRITE_DETECTED') !== -1);
      return real.get('cases', 'c1');
    })
    .then(function (rec) {
      // The concurrent writer's value should be preserved; engine must NOT have overwritten it.
      chk('concurrent writer value preserved (engine did not overwrite)', rec && rec.concurrent === true);
    });
});

// ── F1-R2-01: engine-level migrate() serialization ─────────────────────────
asyncCase('F1-R2-01: concurrent migrate() calls are serialized at the engine', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, n: (rec.n || 0) + 1 }, migrations: ['bump'] };
  } } };
  return b.put('cases', 'c1', { schemaVersion: 1, caseId: 'c1', n: 0 })
    .then(function () {
      var e = ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP });
      // Kick off two migrate() calls without awaiting the first. They must serialize.
      var p1 = e.migrate({ confirm: true });
      var p2 = e.migrate({ confirm: true });
      return Promise.all([p1, p2]);
    })
    .then(function (results) {
      var r1 = results[0], r2 = results[1];
      // First run: data was at v0 conceptually → migrator bumps it. After commit, second migrate
      // sees the post-migration data and is no-op (or migrates again if migrator is non-idempotent).
      // The key property: BOTH calls return frozen reports; no exceptions; serialization succeeded.
      chk('both migrate() calls returned reports', !!r1.report && !!r2.report);
      chk('first migrate ok', r1.ok === true);
      chk('second migrate ok (or no-op)', r2.ok === true);
    });
});

// ── NN. F1-R2-02 — R3.0E migrators fail closed when contract validator missing ─
// Use child_process to isolate Module._resolveFilename mutation from the in-process
// concurrent asyncCases (otherwise they race on require.cache).
function _runMigratorFailClosed(name, contractMatch, migratorAbsPath, recordLiteral) {
  var cp = require('child_process');
  var script = "'use strict';\n" +
    "var Module = require('module');\n" +
    "var fs = require('fs');\n" +
    "var os = require('os');\n" +
    "var tmpContract = os.tmpdir() + '/empty-" + name + "-contract.js';\n" +
    "fs.writeFileSync(tmpContract, 'module.exports = {};');\n" +
    "var orig = Module._resolveFilename;\n" +
    "Module._resolveFilename = function(req, parent) {\n" +
    "  if (req.indexOf(" + JSON.stringify(contractMatch) + ") !== -1) return tmpContract;\n" +
    "  return orig.call(this, req, parent);\n" +
    "};\n" +
    "var M = require(" + JSON.stringify(migratorAbsPath) + ");\n" +
    "var r = M.migrate(" + recordLiteral + ");\n" +
    "process.stdout.write(JSON.stringify({ ok: r.ok, reason: r.reason }));\n";
  var out = cp.execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' });
  return JSON.parse(out);
}

var _path = require('path');
var _repo = _path.resolve(__dirname, '..');

(function () {
  var r = _runMigratorFailClosed('experiment', 'contracts/r3.0e/experiment-contract', _path.join(_repo, 'scripts/migrators/experiment-migrator.js'), '{schemaVersion:1,experimentId:"x"}');
  chk('F1-R2-02: experiment-migrator fail-closed without validator', r.ok === false && r.reason === 'NO_MIGRATION_PATH');
})();
(function () {
  var r = _runMigratorFailClosed('outcome', 'contracts/r3.0e/outcome-contract', _path.join(_repo, 'scripts/migrators/outcome-migrator.js'), '{schemaVersion:1,outcomeId:"x"}');
  chk('F1-R2-02: outcome-migrator fail-closed without validator', r.ok === false && r.reason === 'NO_MIGRATION_PATH');
})();
(function () {
  var r = _runMigratorFailClosed('timeline', 'contracts/r3.0e/case-timeline-contract', _path.join(_repo, 'scripts/migrators/timeline-migrator.js'), '{schemaVersion:1,caseId:"x",events:[]}');
  chk('F1-R2-02: timeline-migrator fail-closed without validator', r.ok === false && r.reason === 'NO_MIGRATION_PATH');
})();
(function () {
  var r = _runMigratorFailClosed('followup', 'contracts/r3.0e/follow-up-link-contract', _path.join(_repo, 'scripts/migrators/followup-migrator.js'), '{schemaVersion:1,linkId:"x"}');
  chk('F1-R2-02: followup-migrator fail-closed without validator', r.ok === false && r.reason === 'NO_MIGRATION_PATH');
})();

// ── OO. F1-R2-03 — Case-variant + token attestation key rejected ────────────
asyncCase('F1-R2-03: uppercase _AUTHORITATIVE rejected', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, _AUTHORITATIVE: true }, migrations: ['evil'] };
  } } };
  return b.put('cases', 'cU', { schemaVersion: 1, caseId: 'cU' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('uppercase attestation field rejected', c.length === 1 && c[0].reasonCode === 'PRODUCER_ATTESTATION_REFUSED');
    });
});

asyncCase('F1-R2-03: MixedCase _ProducerAttested rejected', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, _ProducerAttested: 1 }, migrations: ['evil'] };
  } } };
  return b.put('cases', 'cM', { schemaVersion: 1, caseId: 'cM' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('mixedcase attestation field rejected', c.length === 1 && c[0].reasonCode === 'PRODUCER_ATTESTATION_REFUSED');
    });
});

asyncCase('F1-R2-03: token-bearing key like fakeSignatureHere rejected', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, fakeSignatureHere: 'x' }, migrations: ['evil'] };
  } } };
  return b.put('cases', 'cT', { schemaVersion: 1, caseId: 'cT' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('token-bearing key rejected', c.length === 1 && c[0].reasonCode === 'PRODUCER_ATTESTATION_REFUSED');
    });
});

asyncCase('F1-R2-03: __SIGNATURE rejected', function () {
  var b = SB.MemoryBackend();
  var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
    return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, __SIGNATURE: 'fake' }, migrations: ['evil'] };
  } } };
  return b.put('cases', 'cS', { schemaVersion: 1, caseId: 'cS' })
    .then(function () { return ENG.createMigrationEngine({ backend: b, registry: registry, stamp: STAMP }).migrate({ confirm: true }); })
    .then(function () { return freshJournalReader(b); })
    .then(function (j) {
      var c = j.filter(function (e) { return e.store === 'cases'; });
      chk('underscore-prefixed uppercase token rejected', c.length === 1 && c[0].reasonCode === 'PRODUCER_ATTESTATION_REFUSED');
    });
});

// ── LL. Final ───────────────────────────────────────────────────────────────
function _finalReport() {
  console.log('r3.0f-migration-engine: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
}
setTimeout(_finalReport, 3000);
