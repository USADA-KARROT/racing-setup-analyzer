/**
 * tests/r3-0c-track-identity.test.js — R3.0C C2 · Track Identity authority.
 *
 * Verifies the narrow authoritative rule: ONLY explicit { trackId, layoutId, source:'explicit' }
 * is honored. Every other shape (name-only, filename-only, lap-length match, sample-shape
 * fingerprint, GPS bounding box, missing source) MUST fail closed with MISSING_TRACK_IDENTITY
 * and the rejection evidence MUST record which inference signals were present so the UI can
 * explain to the user what was ignored.
 *
 * Adversarial cases cover: whitespace-only / 'null' / 'undefined' string literals, mixed valid
 * +invalid metadata, source flag spoofing attempts, and the equalsTrackIdentity path through
 * both raw metadata and already-derived results.
 */
'use strict';
const Service = require('../renderer/js/r3-0c-track-identity.js');
const Contracts = require('../contracts/r3.0c/index.js');
const CODES = Contracts.reasonCodes.REASON_CODES;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (res, code) => !!(res && Array.isArray(res.reasonCodes) && res.reasonCodes.indexOf(code) !== -1);

// ── A. constants ──
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 CHECKPOINT_FLOOR === C2_LAP_AUTHORITY', Service.CHECKPOINT_FLOOR === 'C2_LAP_AUTHORITY');
chk('A3 ACCEPTED_SOURCES contains only "explicit"', Service.ACCEPTED_SOURCES.length === 1 && Service.ACCEPTED_SOURCES[0] === 'explicit');
chk('A4 FORBIDDEN_INFERENCE_FIELDS includes name + filename + lapLengthMeters + sampleShapeFingerprint + gpsBoundingBox',
  Service.FORBIDDEN_INFERENCE_FIELDS.indexOf('name') !== -1
  && Service.FORBIDDEN_INFERENCE_FIELDS.indexOf('filename') !== -1
  && Service.FORBIDDEN_INFERENCE_FIELDS.indexOf('lapLengthMeters') !== -1
  && Service.FORBIDDEN_INFERENCE_FIELDS.indexOf('sampleShapeFingerprint') !== -1
  && Service.FORBIDDEN_INFERENCE_FIELDS.indexOf('gpsBoundingBox') !== -1);
chk('A5 ACCEPTED_SOURCES frozen', Object.isFrozen(Service.ACCEPTED_SOURCES));
chk('A6 FORBIDDEN_INFERENCE_FIELDS frozen', Object.isFrozen(Service.FORBIDDEN_INFERENCE_FIELDS));

// ── B. authoritative happy path ──
(() => {
  const r = Service.deriveTrackIdentity({ trackId: 'silverstone', layoutId: 'gp', source: 'explicit' });
  chk('B1 authoritative=true', r.authoritative === true);
  chk('B1b status=track_identity_authoritative', r.status === 'track_identity_authoritative');
  chk('B1c identity.trackId preserved', r.identity.trackId === 'silverstone');
  chk('B1d identity.layoutId preserved', r.identity.layoutId === 'gp');
  chk('B1e identity.source === explicit', r.identity.source === 'explicit');
  chk('B1f reasonCodes empty', r.reasonCodes.length === 0);
  chk('B1g identity frozen', Object.isFrozen(r.identity));
  chk('B1h result===null (CP1 yields no payload)', r.result === null);
})();

// ── C. name-only metadata is REFUSED, even when filename + lap length match ──
(() => {
  const r = Service.deriveTrackIdentity({ name: 'Silverstone GP', filename: 'silverstone.csv', lapLengthMeters: 5891 });
  chk('C1 name-only blocked + MISSING_TRACK_IDENTITY', r.authoritative === false && hasCode(r, CODES.MISSING_TRACK_IDENTITY));
  chk('C1b rejectedInferenceSignals lists name', r.rejectedInferenceSignals.indexOf('name') !== -1);
  chk('C1c rejectedInferenceSignals lists filename', r.rejectedInferenceSignals.indexOf('filename') !== -1);
  chk('C1d rejectedInferenceSignals lists lapLengthMeters', r.rejectedInferenceSignals.indexOf('lapLengthMeters') !== -1);
})();

// ── D. metadata with REAL trackId+layoutId but source != explicit must STILL fail ──
['name_match', 'filename_match', 'fingerprint', 'gps_proximity', 'unspecified', ''].forEach(srcVal => {
  const r = Service.deriveTrackIdentity({ trackId: 'silverstone', layoutId: 'gp', source: srcVal });
  chk('D.source=' + JSON.stringify(srcVal) + ' blocked + MISSING_TRACK_IDENTITY', r.authoritative === false && hasCode(r, CODES.MISSING_TRACK_IDENTITY));
  if (typeof srcVal === 'string' && srcVal.length > 0) {
    chk('D.source=' + JSON.stringify(srcVal) + ' rejectedSource recorded', r.rejectedSource === srcVal);
  }
});

// ── E. missing trackId / layoutId / both ──
[
  ['E1 trackId empty', { trackId: '', layoutId: 'gp', source: 'explicit' }],
  ['E2 layoutId empty', { trackId: 'silverstone', layoutId: '', source: 'explicit' }],
  ['E3 trackId whitespace only', { trackId: '   ', layoutId: 'gp', source: 'explicit' }],
  ['E4 layoutId is "null" literal', { trackId: 'silverstone', layoutId: 'null', source: 'explicit' }],
  ['E5 trackId is "undefined" literal', { trackId: 'undefined', layoutId: 'gp', source: 'explicit' }],
  ['E6 trackId is non-string', { trackId: 42, layoutId: 'gp', source: 'explicit' }],
  ['E7 layoutId is null', { trackId: 'silverstone', layoutId: null, source: 'explicit' }],
].forEach(([name, md]) => {
  const r = Service.deriveTrackIdentity(md);
  chk(name + ' → blocked + MISSING_TRACK_IDENTITY', r.authoritative === false && hasCode(r, CODES.MISSING_TRACK_IDENTITY));
});

// ── F. non-object metadata ──
[null, undefined, 'silverstone', 42, true, [], {}].forEach((bad, i) => {
  const r = Service.deriveTrackIdentity(bad);
  chk('F.non-object-' + i + ' blocked', r.authoritative === false && hasCode(r, CODES.MISSING_TRACK_IDENTITY));
});

// ── G. trim() applied to trackId/layoutId on authoritative path ──
(() => {
  const r = Service.deriveTrackIdentity({ trackId: '  silverstone  ', layoutId: ' gp ', source: 'explicit' });
  chk('G1 authoritative + trimmed', r.authoritative === true && r.identity.trackId === 'silverstone' && r.identity.layoutId === 'gp');
})();

// ── H. equalsTrackIdentity — both authoritative + equal ──
(() => {
  const a = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  const b = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  const r = Service.equalsTrackIdentity(a, b);
  chk('H1 equal authoritative identities → equal=true', r.equal === true);
  chk('H1b status=track_identity_equal', r.status === 'track_identity_equal');
  chk('H1c identity preserved', r.identity.trackId === 'silverstone' && r.identity.layoutId === 'gp');
  chk('H1d reasonCodes empty', r.reasonCodes.length === 0);
})();

// ── I. equalsTrackIdentity — both authoritative but mismatched ──
(() => {
  const a = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  const b = { trackId: 'silverstone', layoutId: 'national', source: 'explicit' };
  const r = Service.equalsTrackIdentity(a, b);
  chk('I1 different layoutId → equal=false + TRACK_IDENTITY_MISMATCH', r.equal === false && hasCode(r, CODES.TRACK_IDENTITY_MISMATCH));
  chk('I1b records both sides', r.a.trackId === 'silverstone' && r.b.layoutId === 'national');
})();
(() => {
  const a = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  const b = { trackId: 'monza', layoutId: 'gp', source: 'explicit' };
  const r = Service.equalsTrackIdentity(a, b);
  chk('I2 different trackId → equal=false + TRACK_IDENTITY_MISMATCH', r.equal === false && hasCode(r, CODES.TRACK_IDENTITY_MISMATCH));
})();

// ── J. equalsTrackIdentity — one side non-authoritative ──
(() => {
  const a = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  const b = { name: 'Silverstone' };
  const r = Service.equalsTrackIdentity(a, b);
  chk('J1 b non-authoritative → equal=false + MISSING_TRACK_IDENTITY', r.equal === false && hasCode(r, CODES.MISSING_TRACK_IDENTITY));
  chk('J1b records non-authoritative side', r.nonAuthoritativeSide.indexOf('b') !== -1 && r.nonAuthoritativeSide.indexOf('a') === -1);
})();
(() => {
  const a = { filename: 'foo.csv' };
  const b = { trackId: 'monza', layoutId: 'gp', source: 'explicit' };
  const r = Service.equalsTrackIdentity(a, b);
  chk('J2 a non-authoritative → blocked', r.equal === false && hasCode(r, CODES.MISSING_TRACK_IDENTITY));
  chk('J2b records "a" as non-authoritative', r.nonAuthoritativeSide.indexOf('a') !== -1);
})();
(() => {
  const r = Service.equalsTrackIdentity({ name: 'A' }, { name: 'B' });
  chk('J3 both non-authoritative → blocked + lists both sides', r.equal === false && r.nonAuthoritativeSide.length === 2);
})();

// ── K. equalsTrackIdentity accepts already-derived results too ──
(() => {
  const a = Service.deriveTrackIdentity({ trackId: 'silverstone', layoutId: 'gp', source: 'explicit' });
  const b = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  const r = Service.equalsTrackIdentity(a, b);
  chk('K1 derived a vs raw b → equal=true (chainable)', r.equal === true);
})();

// ── L. CRITICAL: a deeply-spoofed metadata object with FORBIDDEN_INFERENCE_FIELDS *and* the explicit
//      shape must still be authoritative for the explicit half, but report the rejected signals so
//      the comparison layer can downgrade credibility appropriately. ──
(() => {
  const r = Service.deriveTrackIdentity({
    trackId: 'silverstone', layoutId: 'gp', source: 'explicit',
    name: 'Silverstone Grand Prix', filename: 'sv-gp.csv', lapLengthMeters: 5891, gpsBoundingBox: { n: 1, s: 0, e: 1, w: 0 },
  });
  chk('L1 explicit + name/filename → still authoritative (we trust the explicit declaration)', r.authoritative === true);
  chk('L1b inference signals recorded as rejected', r.rejectedInferenceSignals.length >= 3);
})();

// ── M. result objects are frozen ──
(() => {
  const r = Service.deriveTrackIdentity({ trackId: 'silverstone', layoutId: 'gp', source: 'explicit' });
  chk('M1 authoritative result frozen', Object.isFrozen(r));
  chk('M1b identity frozen', Object.isFrozen(r.identity));
  const r2 = Service.deriveTrackIdentity({});
  chk('M2 blocked result frozen', Object.isFrozen(r2));
})();

// ── N. forged-authority defence (Codex Gate C-A round 2 BLOCK fix). equalsTrackIdentity must
//      NEVER trust a caller-attached `authoritative:true` flag in isolation — it must always
//      re-derive from the underlying identity to reject forgeries that skip the explicit-source
//      rule. Without this defence, a caller could attach the flag to any identity object and
//      have it compare equal to a real explicit identity. ──
(() => {
  const validExplicit = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  // forgery 1: authoritative=true with NO source on inner identity
  const forgedNoSource = { authoritative: true, identity: { trackId: 'silverstone', layoutId: 'gp' } };
  const r1 = Service.equalsTrackIdentity(forgedNoSource, validExplicit);
  chk('N1 forged authoritative WITHOUT source field → blocked + MISSING_TRACK_IDENTITY',
    r1.equal === false && hasCode(r1, CODES.MISSING_TRACK_IDENTITY));

  // forgery 2: authoritative=true with non-explicit source on inner identity
  const forgedNameMatch = { authoritative: true, identity: { trackId: 'silverstone', layoutId: 'gp', source: 'name_match' } };
  const r2 = Service.equalsTrackIdentity(forgedNameMatch, validExplicit);
  chk('N2 forged authoritative with source="name_match" → blocked + MISSING_TRACK_IDENTITY',
    r2.equal === false && hasCode(r2, CODES.MISSING_TRACK_IDENTITY));

  // forgery 3: forged but with source='explicit' on inner identity — should re-derive successfully
  // (this is functionally indistinguishable from the caller having passed raw explicit metadata,
  // which is the threat-model limit: forgery WITH valid identity content is the same as raw input)
  const forgedButValid = { authoritative: true, identity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' } };
  const r3 = Service.equalsTrackIdentity(forgedButValid, validExplicit);
  chk('N3 forged-but-valid (carries source=explicit) → equal=true (threat-model limit: equivalent to passing raw explicit metadata)', r3.equal === true);

  // forgery 4: a derived result a is correctly re-derived round-trip with the chainable contract
  const realDerived = Service.deriveTrackIdentity(validExplicit);
  const r4 = Service.equalsTrackIdentity(realDerived, validExplicit);
  chk('N4 real prior-derived result still chains to equal=true (regression guard for K1)', r4.equal === true);

  // forgery 5: forged with completely different identity numbers — re-derivation succeeds (since
  // source=explicit is present), then equality returns MISMATCH (NOT equal=true).
  const forgedDifferent = { authoritative: true, identity: { trackId: 'forged', layoutId: 'gp', source: 'explicit' } };
  const r5 = Service.equalsTrackIdentity(forgedDifferent, validExplicit);
  chk('N5 forged-but-valid with different trackId → equal=false + TRACK_IDENTITY_MISMATCH (not false-equal)',
    r5.equal === false && hasCode(r5, CODES.TRACK_IDENTITY_MISMATCH));
})();

console.log('r3-0c-track-identity: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
