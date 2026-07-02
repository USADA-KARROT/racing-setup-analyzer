/**
 * tests/release-gate.test.js — R3.0F F5 · release-gate script fail-closed contract.
 *
 * Unit-tests scripts/check-release-gate.js WITHOUT spawning the real validators
 * (conditions 1/2 alone would re-run the full multi-minute suite): the gate's io
 * (delegate/readJson) is injectable, so each condition's JUDGEMENT is exercised
 * against stubbed child results and stubbed artifacts. The real-io happy paths of
 * the filesystem-only conditions (9/10/11) run against the actual repo.
 */
'use strict';
const path = require('path');
const fs = require('fs');

const G = require('../scripts/check-release-gate.js');

let passed = 0, failed = 0;
function chk(name, cond, extra) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}
function cond(id) { return G.CONDITIONS.find((c) => c.id === id); }

// ── shape ───────────────────────────────────────────────────────────────────────
chk('gate declares exactly 12 conditions', G.CONDITIONS.length === 12, G.CONDITIONS.length);
chk('condition ids are 1..12 in order', G.CONDITIONS.every((c, i) => c.id === i + 1));
chk('condition keys are unique', new Set(G.CONDITIONS.map((c) => c.key)).size === 12);
const EXPECTED_KEYS = ['preflight', 'tests', 'e2e', 'frozen', 'preset501', 'i18n', 'reachability', 'noOrphans', 'electronBuild', 'releaseNotes', 'changelog', 'tagPolicy'];
chk('condition keys match the 12-condition governance definition', JSON.stringify(G.CONDITIONS.map((c) => c.key)) === JSON.stringify(EXPECTED_KEYS), G.CONDITIONS.map((c) => c.key));

// ── stub helpers ────────────────────────────────────────────────────────────────
function ioAllGreen(artifacts) {
  return {
    delegate: () => ({ ok: true, detail: { stub: true } }),
    readJson: (p) => {
      const base = path.basename(p);
      if (artifacts && Object.prototype.hasOwnProperty.call(artifacts, base)) return artifacts[base];
      throw new Error('stub: no artifact ' + base);
    },
  };
}
const GREEN_ARTIFACTS = {
  // condition 9 reads package.json through io.readJson — hand it the real one
  'package.json': JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')),
  // mirrors the REAL artifact schema: fields under `summary`, per-file rows judged by exitCode
  'test-manifest.json': {
    summary: {
      discovered: 108, ran: 108, passedFiles: 108, failedFiles: 0, timeoutFiles: 0,
      assertionsPassed: 10000, assertionsFailed: 0, discoveryMissing: [], discoveryGhost: [],
    },
    results: Array.from({ length: 15 }, (_, i) => ({ file: 'tests/e2e/x-' + i + '.test.js', exitCode: 0, timedOut: false, assertionsFailed: 0 }))
      .concat([{ file: 'tests/other.test.js', exitCode: 0, timedOut: false, assertionsFailed: 0 }]),
  },
  'frozen-boundary-result.json': { frozenDiffCount: 0 },
  'preset-integrity.json': { presetCount: 501 },
  'i18n-result.json': { i18nMissing: 0 },
  // mirrors the REAL artifact schema: productionFeatureOrphans is a COUNT, ids in `orphans`
  'feature-registry-result.json': { productionFeatureOrphans: 0, orphans: [] },
};

// ── per-condition fail-closed judgement ─────────────────────────────────────────

// 1 preflight: selftest failure blocks before the audit even runs
(function () {
  let calls = 0;
  const io = { delegate: () => { calls++; return { ok: false, detail: {} }; }, readJson: () => ({}) };
  const r = cond(1).run(io);
  chk('preflight: selftest failure -> FAIL without running the audit', r.ok === false && calls === 1);
  const io2 = { delegate: () => ({ ok: true, detail: {} }), readJson: () => ({}) };
  chk('preflight: both stages green -> PASS', cond(1).run(io2).ok === true);
})();

// 2 tests: child exit 0 alone is NOT enough — the manifest must corroborate
(function () {
  const r = cond(2).run(ioAllGreen(GREEN_ARTIFACTS));
  chk('tests: green child + green manifest -> PASS', r.ok === true);
  const badManifest = JSON.parse(JSON.stringify(GREEN_ARTIFACTS['test-manifest.json'])); badManifest.summary.assertionsFailed = 1;
  const r2 = cond(2).run(ioAllGreen(Object.assign({}, GREEN_ARTIFACTS, { 'test-manifest.json': badManifest })));
  chk('tests: assertionsFailed>0 -> FAIL even with child exit 0', r2.ok === false);
  const ghost = JSON.parse(JSON.stringify(GREEN_ARTIFACTS['test-manifest.json'])); ghost.summary.discoveryGhost = ['tests/ghost.test.js'];
  chk('tests: discoveryGhost non-empty -> FAIL', cond(2).run(ioAllGreen(Object.assign({}, GREEN_ARTIFACTS, { 'test-manifest.json': ghost }))).ok === false);
  chk('tests: missing manifest artifact -> FAIL (fail-closed)', cond(2).run(ioAllGreen({})).ok === false);
})();

// 3 e2e: judged purely from the manifest
(function () {
  chk('e2e: 15 green e2e rows -> PASS', cond(3).run(ioAllGreen(GREEN_ARTIFACTS)).ok === true);
  const oneFail = JSON.parse(JSON.stringify(GREEN_ARTIFACTS['test-manifest.json']));
  oneFail.results[3].exitCode = 1;
  chk('e2e: one failed e2e file -> FAIL', cond(3).run(ioAllGreen(Object.assign({}, GREEN_ARTIFACTS, { 'test-manifest.json': oneFail }))).ok === false);
  const tooFew = JSON.parse(JSON.stringify(GREEN_ARTIFACTS['test-manifest.json']));
  tooFew.results = tooFew.results.slice(0, 10);
  chk('e2e: fewer than 15 e2e files -> FAIL (floor guard)', cond(3).run(ioAllGreen(Object.assign({}, GREEN_ARTIFACTS, { 'test-manifest.json': tooFew }))).ok === false);
  chk('e2e: unreadable manifest -> FAIL (fail-closed)', cond(3).run(ioAllGreen({})).ok === false);
})();

// 4/5/6: artifact must corroborate the child exit code
(function () {
  chk('frozen: green child + frozenDiffCount 0 -> PASS', cond(4).run(ioAllGreen(GREEN_ARTIFACTS)).ok === true);
  chk('frozen: frozenDiffCount 1 -> FAIL', cond(4).run(ioAllGreen(Object.assign({}, GREEN_ARTIFACTS, { 'frozen-boundary-result.json': { frozenDiffCount: 1 } }))).ok === false);
  chk('preset501: 501 -> PASS', cond(5).run(ioAllGreen(GREEN_ARTIFACTS)).ok === true);
  chk('preset501: 500 -> FAIL even with child exit 0', cond(5).run(ioAllGreen(Object.assign({}, GREEN_ARTIFACTS, { 'preset-integrity.json': { presetCount: 500 } }))).ok === false);
  chk('i18n: 0 missing -> PASS', cond(6).run(ioAllGreen(GREEN_ARTIFACTS)).ok === true);
  chk('i18n: 3 missing -> FAIL', cond(6).run(ioAllGreen(Object.assign({}, GREEN_ARTIFACTS, { 'i18n-result.json': { i18nMissing: 3 } }))).ok === false);
})();

// 7 reachability delegates; a red child fails the condition
(function () {
  const io = { delegate: () => ({ ok: false, detail: { exitCode: 1 } }), readJson: () => ({}) };
  chk('reachability: red child -> FAIL', cond(7).run(io).ok === false);
})();

// 8 noOrphans: ALL four consumer checks and the orphan list must be green
(function () {
  chk('noOrphans: all green -> PASS', cond(8).run(ioAllGreen(GREEN_ARTIFACTS)).ok === true);
  chk('noOrphans: one orphan -> FAIL', cond(8).run(ioAllGreen(Object.assign({}, GREEN_ARTIFACTS, { 'feature-registry-result.json': { productionFeatureOrphans: 1, orphans: ['x'] } }))).ok === false);
  let call = 0;
  const ioOneRed = {
    delegate: () => { call++; return call === 3 ? { ok: false, detail: {} } : { ok: true, detail: {} }; },
    readJson: ioAllGreen(GREEN_ARTIFACTS).readJson,
  };
  chk('noOrphans: one red consumer check (of 4) -> FAIL', cond(8).run(ioOneRed).ok === false);
  chk('noOrphans: missing registry artifact -> FAIL (fail-closed)', cond(8).run({ delegate: () => ({ ok: true, detail: {} }), readJson: () => { throw new Error('none'); } }).ok === false);
})();

// 9/10/11: filesystem conditions against the REAL repo (happy path must hold at HEAD)
(function () {
  const io = { delegate: G._delegate, readJson: G._readJson };
  const r9 = cond(9).run(io);
  chk('electronBuild: real repo passes declaration-level readiness', r9.ok === true, r9.detail);
  chk('electronBuild: found the full script-tag inventory (>=90)', r9.detail.scriptTags >= 90, r9.detail.scriptTags);
  const r10 = cond(10).run(io);
  chk('releaseNotes: real draft passes required-section scan', r10.ok === true, r10.detail);
  const r11 = cond(11).run(io);
  chk('changelog: real CHANGELOG passes hook scan', r11.ok === true, r11.detail);
})();

// 10: a draft missing a required section fails (probe against a temp copy via regex logic)
(function () {
  const text = fs.readFileSync(path.join(__dirname, '..', 'docs', 'release-notes-2.0.0.md'), 'utf8');
  chk('releaseNotes: draft declares DRAFT status', /Status:\s*DRAFT/i.test(text));
  chk('releaseNotes: draft discloses unsigned+unnotarized', /not code-signed and not notarized/i.test(text));
  chk('releaseNotes: draft has release-boundary section', /^## Release boundary/m.test(text));
})();

// 12 tagPolicy delegates
(function () {
  chk('tagPolicy: red child -> FAIL', cond(12).run({ delegate: () => ({ ok: false, detail: {} }), readJson: () => ({}) }).ok === false);
})();

// ── runGate aggregation ─────────────────────────────────────────────────────────
(function () {
  const report = G.runGate(ioAllGreen(GREEN_ARTIFACTS));
  chk('runGate: all-green stub -> ok true, 12/12', report.ok === true && report.passedCount === 12 && report.failedCount === 0, report.failedKeys);
  const ioRed = {
    delegate: (script) => ({ ok: String(script).indexOf('check-version-policy') === -1, detail: {} }),
    readJson: ioAllGreen(GREEN_ARTIFACTS).readJson,
  };
  const r2 = G.runGate(ioRed);
  chk('runGate: single red condition -> ok false, names the failed key', r2.ok === false && r2.failedKeys.indexOf('tagPolicy') !== -1, r2.failedKeys);
  chk('runGate: NO short-circuit — all 12 conditions still reported', r2.conditions.length === 12);
  const ioCrash = { delegate: () => { throw new Error('boom'); }, readJson: () => { throw new Error('boom'); } };
  const r3 = G.runGate(ioCrash);
  // Conditions 10/11 are pure-filesystem checks that never touch io, so with a
  // crashing io exactly the 10 io-dependent conditions fail closed (1-9, 12).
  chk('runGate: crashing io -> all 10 io-dependent conditions FAIL closed, gate ok=false',
    r3.ok === false && r3.failedCount === 10
    && r3.failedKeys.indexOf('releaseNotes') === -1 && r3.failedKeys.indexOf('changelog') === -1, r3.failedKeys);
})();

console.log('release-gate: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
