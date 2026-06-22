#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — i18n three-language parity check (structured evidence).
 *
 * Loads the SAME production i18n modules, in the SAME order, as tests/i18n-parity.test.js, so this
 * computes parity from the single source of truth (not a re-implementation, not a stdout scrape).
 * i18nMissing = number of keys missing from ANY locale (union of all locale key sets).
 * The behavioural gate stays tests/i18n-parity.test.js inside the manifest; this emits the number.
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/i18n-result.json   (exit non-zero if i18nMissing > 0)
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
function run() {
  // Static relative requires (same modules/order as tests/i18n-parity.test.js) keep this script on the
  // dependency-audit's static path — no computed module specifiers.
  global.I18N = require('../renderer/js/i18n.js').I18N;
  require('../renderer/js/i18n-guide.js');
  require('../renderer/js/i18n-ui.js');
  require('../renderer/js/i18n-csv.js');
  require('../renderer/js/i18n-advisor.js');
  require('../renderer/js/i18n-shell.js');
  require('../renderer/js/i18n-workspace.js');
  const I = global.I18N;
  const locales = Object.keys(I).filter(l => I[l] && typeof I[l] === 'object');
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const union = Array.from(new Set([].concat(...locales.map(l => Object.keys(I[l]))))).sort();
  const missing = {};
  let i18nMissing = 0;
  for (const l of locales) {
    const m = union.filter(k => !has(I[l], k));
    missing[l] = m;
    i18nMissing += m.length;
  }
  const expectedLocales = ['en', 'zh', 'ja'];
  const localesOk = expectedLocales.every(l => locales.includes(l));
  const ok = i18nMissing === 0 && localesOk;
  return {
    check: 'i18n-parity',
    locales,
    expectedLocales,
    localesOk,
    keyCounts: Object.fromEntries(locales.map(l => [l, Object.keys(I[l]).length])),
    unionKeyCount: union.length,
    missing,
    i18nMissing,
    ok,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'i18n-parity', fatalError: String((e && e.stack) || e), i18nMissing: -1, ok: false }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'i18n-result.json'), JSON.stringify(result, null, 2));
console.log('I18N ' + JSON.stringify({ i18nMissing: result.i18nMissing, ok: result.ok, keyCounts: result.keyCounts }));
process.exit(exitCode);
