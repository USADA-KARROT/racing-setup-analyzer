'use strict';
/**
 * tests/r3-0d-contracts-bundle-equivalence.test.js — R3.0F F5 (Gap-B1 closure) bundle drift guard.
 *
 * The browser loads the R3.0D contracts via renderer/js/r3-0d-contracts-bundle.js, an
 * auto-generated concatenation of contracts/r3.0d/* produced by
 * tools/build-r3-0d-browser-bundle.js. The R3.0C bundle has had an equivalence guard
 * since C7 (tests/r3-0c-contracts-bundle-equivalence.test.js); the R3.0D bundle had
 * none — a contract edit without regeneration would ship stale contract code to the
 * browser while Node tests see fresh code. This test re-runs the generator and asserts
 * the committed bundle is byte-for-byte equal. Fails closed on any drift.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Bundle = require('../tools/build-r3-0d-browser-bundle.js');

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

// A. Bundle file exists and is loaded by the page before the D2-D5 modules.
chk('A1 bundle file exists', fs.existsSync(Bundle.OUT_FILE));
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
const bundleIdx = html.indexOf('js/r3-0d-contracts-bundle.js');
const consumerIdx = html.indexOf('js/r3-0d-evidence-graph.js');
chk('A2 index.html loads the bundle', bundleIdx !== -1);
chk('A3 bundle script tag precedes the first D2 consumer', bundleIdx !== -1 && consumerIdx !== -1 && bundleIdx < consumerIdx, { bundleIdx, consumerIdx });

// B. Re-running the generator reproduces the committed bytes exactly.
const expected = fs.readFileSync(Bundle.OUT_FILE, 'utf8');
const regenerated = Bundle.buildBundle();
chk('B1 regenerated length matches committed', regenerated.length === expected.length, { committed: expected.length, regenerated: regenerated.length });
chk('B2 regenerated content matches committed byte-for-byte', regenerated === expected);
const h1 = crypto.createHash('sha256').update(expected).digest('hex');
const h2 = crypto.createHash('sha256').update(regenerated).digest('hex');
chk('B3 regenerated sha256 matches committed sha256', h1 === h2, { committed: h1, regenerated: h2 });

// C. Source order covers every contracts/r3.0d/*.js exactly once, dependency-first.
const onDisk = fs.readdirSync(Bundle.IN_DIR).filter((f) => f.endsWith('.js')).sort();
const declared = Bundle.ORDER.slice().sort();
chk('C1 ORDER covers every contracts/r3.0d/*.js exactly once', JSON.stringify(onDisk) === JSON.stringify(declared), { onDisk, declared });
chk('C2 ORDER starts with hardened-intrinsics.js', Bundle.ORDER[0] === 'hardened-intrinsics.js');
chk('C3 ORDER ends with index.js', Bundle.ORDER[Bundle.ORDER.length - 1] === 'index.js');

// D. The browser copy carries no live dynamic require: the generator's
//    stripDynamicRequireForBrowser must have neutralized every `require(p)`.
chk('D1 bundle contains no require(p) dynamic call', expected.indexOf('require(p)') === -1);

console.log('r3-0d-contracts-bundle-equivalence: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
