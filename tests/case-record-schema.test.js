/**
 * tests/case-record-schema.test.js — R3.0B sanitize (local, all-or-nothing) + portable bundle (curated, constrained).
 * Hand-built fixtures (no production builder as oracle). Covers raw-array rejection, non-plain/cyclic, portable
 * value constraints (CSV/base64 in grammar fields rejected), required fields, fail-closed future bundle version.
 */
'use strict';
const S = require('../renderer/js/case-record-schema.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// ── sanitizeForStorage: all-or-nothing universal bound ──
chk('clean small VM sanitizes ok', S.sanitizeForStorage({ a: 1, arr: [1, 2, 3], nested: { corners: [{ phase: 'entry' }] } }).ok === true);
chk('oversized array REJECTS (raw telemetry)', S.sanitizeForStorage({ samples: new Array(5000).fill(0) }).ok === false);
(() => { const r = S.sanitizeForStorage({ samples: new Array(5000).fill(0) }); chk('rejection lists violation', r.violations && r.violations[0].kind === 'oversized_array'); })();
chk('non-plain (Date) REJECTS', S.sanitizeForStorage({ d: new Date() }).ok === false);
chk('function REJECTS', S.sanitizeForStorage({ f: function () { } }).ok === false);
chk('NaN REJECTS', S.sanitizeForStorage({ n: NaN }).ok === false);
(() => { const c = {}; c.self = c; chk('cyclic REJECTS', S.sanitizeForStorage(c).ok === false); })();
(() => { const r = S.sanitizeForStorage({ x: { y: { z: [1, 2] } } }); chk('clean deep ok + cloned', r.ok && r.value.x.y.z[0] === 1); })();
chk('array at exactly cap ok', S.sanitizeForStorage({ a: new Array(256).fill(1) }).ok === true);
chk('array one over cap rejects', S.sanitizeForStorage({ a: new Array(257).fill(1) }).ok === false);
// CP2 r12: byte cap measured in UTF-8 bytes (multibyte chars), not UTF-16 units
(() => { const big = '\u4e2d'.repeat(800000); chk('multibyte over-cap rejected (UTF-8 bytes)', S.sanitizeForStorage({ s: big }).ok === false); })();
(() => { chk('small multibyte ok', S.sanitizeForStorage({ s: '\u4e2d\u6587' }).ok === true); })();
// CP2 r13: prototype-pollution-safe — an own __proto__ data property becomes a real own key (no proto mutation),
// caught as an unknown field on import (not a hidden prototype injection).
(() => { const o = JSON.parse('{"__proto__":{"polluted":true}}'); const r = S.sanitizeForStorage(o); chk('sanitize does not pollute Object.prototype', ({}).polluted === undefined); chk('__proto__ kept as own data key (visible)', r.ok && Object.prototype.hasOwnProperty.call(r.value, '__proto__')); })();
(() => { const b = S.toPortableBundle(rec()).bundle; const evil = JSON.parse('{"__proto__":{"title":"Injected","status":"complete","createdAt":"x"}}'); b.metadata = evil; const v = S.validatePortableBundle(b); chk('proto-injected metadata rejected on import', v.ok === false); chk('Object.prototype not polluted by import', ({}).title === undefined); })();

// CP2 #4: undefined / sparse-array / symbol-keyed are JSON-unstable → rejected (not silently normalized)
chk('undefined value rejected', S.sanitizeForStorage({ a: undefined }).ok === false);
chk('sparse array hole rejected', S.sanitizeForStorage({ b: [, 1] }).ok === false);
(() => { const o = {}; o[Symbol('s')] = 1; chk('symbol-keyed object rejected', S.sanitizeForStorage(o).ok === false); })();
(() => { const a = Object.assign([1, 2], { [Symbol('hidden')]: 1 }); chk('symbol-keyed array rejected', S.sanitizeForStorage(a).ok === false); })();
// CP2 r7: a non-index own property on an array is dropped by JSON → rejected
(() => { const a = [1]; a.extra = undefined; chk('array non-index property rejected', S.sanitizeForStorage({ a: a }).ok === false); })();
(() => { const a = [1]; a.extra = 5; chk('array extra prop (defined) rejected', S.sanitizeForStorage({ a: a }).ok === false); })();
(() => { const a = [1, 2]; a['01'] = 7; chk('non-canonical index "01" rejected', S.sanitizeForStorage({ a: a }).ok === false); })();
(() => { const a = [1, 2]; a['1.0'] = 7; chk('non-canonical index "1.0" rejected', S.sanitizeForStorage({ a: a }).ok === false); })();
(() => { const a = [1]; Object.defineProperty(a, 'hidden', { value: 9, enumerable: false }); chk('non-enumerable array prop rejected', S.sanitizeForStorage({ a: a }).ok === false); })();
(() => { chk('clean dense array still ok', S.sanitizeForStorage({ a: [1, 2, 3] }).ok === true); })();
// CP2 r9: non-enumerable / accessor OBJECT properties (dropped by JSON) rejected
(() => { const o = {}; Object.defineProperty(o, 'raw', { value: new Array(300), enumerable: false }); chk('non-enumerable object prop rejected', S.sanitizeForStorage(o).ok === false); })();
(() => { const o = { get sneaky() { return new Array(300); } }; chk('accessor object prop rejected', S.sanitizeForStorage(o).ok === false); })();
// CP2 r10: sanitize must NOT invoke a getter before rejecting it (no side effects)
(() => { let hits = 0; const o = { get x() { hits++; return 1; } }; S.sanitizeForStorage(o); chk('getter NOT invoked during sanitize', hits === 0); })();
// CP2 r11: inherited/own array index getter NOT invoked; bundle root sanitized before ANY field access
(() => { let hits = 0; const a = [1]; Object.defineProperty(a, 1, { get() { hits++; return 2; }, enumerable: true, configurable: true }); a.length = 2; const r = S.sanitizeForStorage({ a: a }); chk('array index getter not invoked + rejected', r.ok === false && hits === 0); })();
(() => { let hits = 0; const b = S.toPortableBundle(rec()).bundle; Object.defineProperty(b.meta, 'schemaVersion', { get() { hits++; return 1; }, enumerable: true }); const v = S.validatePortableBundle(b); chk('meta getter not invoked before sanitize', v.ok === false && hits === 0); })();

// CP2 r10: an imported bundle with an accessor / Infinity excludedFields.n is rejected (gated through sanitizer)
(() => { const b = S.toPortableBundle(rec()).bundle; Object.defineProperty(b.metadata, 'title', { get() { return 'x'; }, enumerable: true }); chk('accessor on bundle field rejected', S.validatePortableBundle(b).ok === false); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.meta.excludedFields = [{ at: 'x', kind: 'y', n: Infinity }]; chk('Infinity excludedFields.n rejected', S.validatePortableBundle(b).ok === false); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.meta.excludedFields = [{ at: 'x'.repeat(7000), kind: 'k', n: 1 }]; chk('overlong excludedFields.at rejected', S.validatePortableBundle(b).ok === false); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.meta.excludedFields = [{ at: 'metadata.x', kind: 'k', n: -1 }]; chk('negative excludedFields.n rejected', S.validatePortableBundle(b).ok === false); })();


// ── toPortableBundle: required fields + curated allowlist ──
function rec(over) {
  return Object.assign({ caseId: 'case_1', recordType: 'local_full',
    metadata: { title: 'My Run', status: 'complete', createdAt: '2026-06-22T00:00:00Z', vehicle: 'F3', track: 'Lihpao' },
    associations: { followUpCaseIds: ['case_2'] },
    setupSnapshot: { frontWheelRate: 240, mass: 565 },
    analysisResults: { caseHeader: { overallStatus: 'analysis_complete' }, capabilitySummary: [{ key: 'modelRan', available: true }], modelPrediction: { understeerGradient: { value: 2.1 }, predictedTendency: { value: 'understeer' } }, measuredMetrics: { measuredKUs: { value: 1.9 }, agreementClass: 'close', dataProvenance: 'synthetic' }, modelVsActual: { blockedReasons: [{ code: 'X_BLOCKED' }] } },
    shellEvidence: { capability: { modelRan: true, telemetryObservable: true }, observation: { blockedReasons: [{ code: 'OBS_X' }] }, source: 'demo_case' } }, over || {});
}
(() => { const b = S.toPortableBundle(rec()); chk('portable bundle builds', b.ok === true); chk('carries caseId/title', b.bundle.caseId === 'case_1' && b.bundle.metadata.title === 'My Run'); chk('carries measured scalar', b.bundle.resultsSummary.measuredKUs === 1.9); chk('carries capability flags', b.bundle.shellEvidenceSummary.capability.modelRan === true); chk('carries blocked code', b.bundle.resultsSummary.blockedReasons[0].code === 'X_BLOCKED'); })();
chk('missing required title REJECTS bundle', S.toPortableBundle(rec({ metadata: { status: 'complete', createdAt: 'x' } })).ok === false);
chk('bad status enum REJECTS', S.toPortableBundle(rec({ metadata: { title: 't', status: 'bogus', createdAt: 'x' } })).ok === false);

// CSV/base64 in a GRAMMAR field (blocked-reason code) → excluded (constraint_violation), not carried
(() => { const r = rec(); r.analysisResults.modelVsActual.blockedReasons = [{ code: 'a,b\nc,d' }, { code: 'AAAA+/==' }, { code: 'GOOD_CODE' }]; const b = S.toPortableBundle(r); chk('non-conforming codes excluded', b.ok && b.bundle.resultsSummary.blockedReasons.length === 1 && b.bundle.resultsSummary.blockedReasons[0].code === 'GOOD_CODE'); chk('exclusions logged', b.bundle.meta.excludedFields.length >= 2); })();
// capability with a non-boolean / bad key → excluded
(() => { const r = rec(); r.shellEvidence.capability = { modelRan: true, 'bad key!': true, evil: 'CSV,data' }; const b = S.toPortableBundle(r); chk('capability bad key/value excluded', b.ok && b.bundle.shellEvidenceSummary.capability.modelRan === true && b.bundle.shellEvidenceSummary.capability['bad key!'] === undefined && b.bundle.shellEvidenceSummary.capability.evil === undefined); })();
// raw array smuggled into analysisResults → does NOT reach the bundle (curated allowlist ignores unlisted paths)
(() => { const r = rec(); r.analysisResults.rawSamples = new Array(5000).fill(1); const b = S.toPortableBundle(r); chk('unlisted raw array not in bundle', b.ok && b.bundle.resultsSummary.rawSamples === undefined && JSON.stringify(b.bundle).indexOf('rawSamples') === -1); })();
// title length cap (user metadata) — long string truncated-to-excluded (not carried beyond cap)
(() => { const r = rec({ metadata: { title: 'x'.repeat(5000), status: 'complete', createdAt: 'd' } }); const b = S.toPortableBundle(r); chk('overlong title rejects (required field constraint)', b.ok === false); })();

// CP2 #3: off-allowlist fields are LOGGED in excludedFields, not silently dropped
(() => { const r = rec(); r.unknownTop = 'y'; r.metadata.sneaky = 'z'; r.associations.weird = 1; r.shellEvidence.extra = true; const b = S.toPortableBundle(r); chk('off-allowlist fields logged (not silent)', b.ok && b.bundle.meta.excludedFields.filter(e => e.kind === 'not_allowlisted').length >= 3); })();

// ── validatePortableBundle: fail-closed future version ──
(() => { const b = S.toPortableBundle(rec()).bundle; chk('valid bundle validates', S.validatePortableBundle(b).ok === true); const future = JSON.parse(JSON.stringify(b)); future.meta.schemaVersion = 999; const v = S.validatePortableBundle(future); chk('FUTURE bundle version REJECTED fail-closed', v.ok === false && v.reason === 'UNSUPPORTED_FUTURE_VERSION'); })();
chk('non-bundle rejected', S.validatePortableBundle({}).ok === false);
// CP2 r5: an imported bundle with off-allowlist fields is REJECTED fail-closed (untrusted surface)
(() => { const b = S.toPortableBundle(rec()).bundle; b.unexpectedRawLikePayload = 'x'; const v = S.validatePortableBundle(b); chk('bundle top-level unknown field rejected', v.ok === false && v.reason === 'BUNDLE_HAS_UNKNOWN_FIELDS'); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.resultsSummary.unlisted = [1, 2, 3]; chk('bundle nested unknown field rejected', S.validatePortableBundle(b).ok === false); })();
// CP2 r6: unknown key INSIDE an array element is rejected (not silently dropped)
(() => { const b = S.toPortableBundle(rec()).bundle; b.resultsSummary.capabilitySummary[0].injected = 'x'; const v = S.validatePortableBundle(b); chk('array-element unknown key rejected', v.ok === false && v.reason === 'BUNDLE_HAS_UNKNOWN_FIELDS'); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.resultsSummary.blockedReasons = [{ code: 'OK', sneak: 1 }]; chk('blockedReasons element extra key rejected', S.validatePortableBundle(b).ok === false); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.associations.followUpCaseIds = ['case_2', { evil: 1 }]; chk('followUpCaseIds non-string element rejected', S.validatePortableBundle(b).ok === false); })();
// CP2 r7: wrong-TYPE element value rejected (not just unknown keys)
(() => { const b = S.toPortableBundle(rec()).bundle; b.resultsSummary.capabilitySummary = [{ key: 7, available: true }]; chk('capabilitySummary non-string key rejected', S.validatePortableBundle(b).ok === false); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.resultsSummary.capabilitySummary = [{ key: 'k', available: 'yes' }]; chk('capabilitySummary non-boolean available rejected', S.validatePortableBundle(b).ok === false); })();
// CP2 r9: constraint-invalid VALUES rejected (not silently recanonicalized)
(() => { const b = S.toPortableBundle(rec()).bundle; b.resultsSummary.blockedReasons = [{ code: 'not canonical' }]; const v = S.validatePortableBundle(b); chk('non-canonical code value rejected', v.ok === false && v.reason === 'BUNDLE_VALUE_INVALID'); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.metadata.status = 'weird'; chk('bad status value rejected on import', S.validatePortableBundle(b).ok === false); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.associations.parentCaseId = 'has spaces!'; chk('bad id value rejected on import', S.validatePortableBundle(b).ok === false); })();
(() => { const b = S.toPortableBundle(rec()).bundle; b.resultsSummary.measuredKUs = 'NaNstring'; chk('non-numeric measured value rejected', S.validatePortableBundle(b).ok === false); })();
chk('bundle missing caseId rejected', (() => { const b = S.toPortableBundle(rec()).bundle; delete b.caseId; return S.validatePortableBundle(b).ok === false; })());

console.log(`case-record-schema: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
