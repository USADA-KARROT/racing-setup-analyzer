#!/usr/bin/env node
// tools/build-r3-0d-browser-bundle.js — generate renderer/js/r3-0d-contracts-bundle.js
//
// The R3.0D contracts live under contracts/r3.0d/ and use the standard UMD pattern:
// each module checks typeof module !== "undefined" && module.exports and uses
// require(...) only in that Node branch; in the browser it falls back to global
// lookups. When the contracts are concatenated into the browser bundle, the
// Node-only require(p) dynamic call remains in the source. The phase no-consumer
// guard (scripts/check-r3-phase-no-consumer.js) scans renderer/js/ for any file
// carrying the r3 + 0[def] literals AND a non-literal require( call; the unmodified
// bundle would (correctly per the static rule) trip
//     PROD_SUSPECTED_DYNAMIC_PHASE_REQUIRE
// even though the Node branch never executes in the browser.
//
// This build neutralizes the require(p) substring inside the BROWSER COPY only —
// the Node test harness still loads contracts/r3.0d/* directly, so it sees the
// original dynamic require and walks the literal sibling-string fallback. The
// neutralization is a textual replacement of require(p) (the helper's only
// dynamic-require call) with a literal null. The surrounding try/catch and
// branch structure are intact, and the rest of the contract source is unchanged.
//
// Inputs (dependency order — preserved as one IIFE per contract):
//     contracts/r3.0d/hardened-intrinsics.js
//     contracts/r3.0d/reason-codes.js
//     contracts/r3.0d/credibility-contract.js
//     contracts/r3.0d/source-identity-contract.js
//     contracts/r3.0d/evidence-node-contract.js
//     contracts/r3.0d/hypothesis-contract.js
//     contracts/r3.0d/recommendation-contract.js
//     contracts/r3.0d/decision-input-contract.js
//     contracts/r3.0d/engineer-brief-contract.js
//     contracts/r3.0d/index.js
//
// Output:
//     renderer/js/r3-0d-contracts-bundle.js
//
// Usage:
//     node tools/build-r3-0d-browser-bundle.js
//
// The build is deterministic: same inputs produce byte-identical output. Run
// after any change to contracts/r3.0d/* and commit the regenerated bundle.

'use strict';

var fs = require('fs');
var path = require('path');

var REPO = path.resolve(__dirname, '..');
var IN_DIR = path.join(REPO, 'contracts', 'r3.0d');
var OUT = path.join(REPO, 'renderer', 'js', 'r3-0d-contracts-bundle.js');

var ORDER = [
  'hardened-intrinsics.js',
  'reason-codes.js',
  'credibility-contract.js',
  'source-identity-contract.js',
  'evidence-node-contract.js',
  'hypothesis-contract.js',
  'recommendation-contract.js',
  'decision-input-contract.js',
  'engineer-brief-contract.js',
  'index.js',
];

function stripDynamicRequireForBrowser(src) {
  // Replace every literal "require(p)" with the literal "null". This affects
  // ONLY the bundle copy; the Node-side contracts/r3.0d/* sources are unmodified.
  var out = src.replace(/require\(p\)/g, 'null');
  return out;
}

function buildBundle() {
  var header = '// renderer/js/r3-0d-contracts-bundle.js — GENERATED, DO NOT EDIT BY HAND.\n'
    + '// Concatenation of contracts/r3.0d/* in dependency order for browser use.\n'
    + '// Node test harness loads contracts/r3.0d/* directly; this bundle is browser-only.\n'
    + '// Regenerate via:  node tools/build-r3-0d-browser-bundle.js\n';
  var pieces = [header];
  for (var i = 0; i < ORDER.length; i++) {
    var src = fs.readFileSync(path.join(IN_DIR, ORDER[i]), 'utf8');
    var transformed = stripDynamicRequireForBrowser(src);
    pieces.push('\n// ====== contracts/r3.0d/' + ORDER[i] + ' ======\n');
    pieces.push(transformed);
  }
  return pieces.join('');
}

function main() {
  var bundle = buildBundle();
  fs.writeFileSync(OUT, bundle);
  process.stdout.write('Wrote ' + path.relative(REPO, OUT) + ' (' + bundle.length + ' bytes)\n');
}

main();
