/**
 * tests/schema-migration.test.js — R3.0B versioned migration (pure, fail-closed). Hand-built fixtures.
 */
'use strict';
const M = require('../renderer/js/schema-migration.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

chk('current case version migrates ok (identity)', M.migrateCaseRecord({ schemaVersion: M.CASE_SCHEMA_VERSION, caseId: 'c' }).ok === true);
(() => { const r = M.migrateCaseRecord({ schemaVersion: M.CASE_SCHEMA_VERSION + 5, caseId: 'c' }); chk('FUTURE version REJECTED fail-closed', r.ok === false && r.rejected === true && r.reason === 'UNSUPPORTED_FUTURE_VERSION'); })();
chk('non-object rejected', M.migrateCaseRecord(null).ok === false);
chk('missing/NaN version rejected', M.migrateCaseRecord({ caseId: 'c' }).ok === false);
chk('negative/float version rejected', M.migrateCaseRecord({ schemaVersion: 1.5 }).ok === false);
chk('unknown fields preserved (carry-through)', (() => { const r = M.migrateCaseRecord({ schemaVersion: M.CASE_SCHEMA_VERSION, caseId: 'c', mysteryField: { keep: 1 } }); return r.ok && r.record.mysteryField && r.record.mysteryField.keep === 1; })());
chk('session current version ok', M.migrateSessionRecord({ schemaVersion: M.SESSION_SCHEMA_VERSION, sessionId: 's' }).ok === true);
chk('session future rejected', M.migrateSessionRecord({ schemaVersion: 99, sessionId: 's' }).ok === false);
chk('migrations log is an array', Array.isArray(M.migrateCaseRecord({ schemaVersion: M.CASE_SCHEMA_VERSION }).migrations));

console.log(`schema-migration: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
