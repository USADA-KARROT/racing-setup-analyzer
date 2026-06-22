/**
 * tests/i18n-parity.test.js — i18n anti-regression guard (en / zh-TW / ja).
 * Builds the merged dictionary exactly as the browser does, then asserts:
 *  1) trilingual key parity (no silent EN fallback for a missing zh/ja key)
 *  2) no non-allowlisted empty-string translations (an empty value can't hide a gap)
 *  3) interpolation-placeholder consistency across locales
 *  4) dynamic shell-code coverage (every status / nextAction enum has a 3-lang key)
 *  5) a hard-coded-English scanner over the fully-internationalized R3 shell region of index.html
 *  6) t() fallback semantics (missing key → key itself; intentional empty respected)
 *
 * Allowlist principle for the hard-coded scanner: brand/product names, milestone ids, unit tokens,
 * mathematical/symbol glyphs, and pure code identifiers are NOT user-facing copy and are excluded.
 * Scope is the R3 shell region only (the analysis workspace A–J body is a separate, tracked phase).
 */
'use strict';
const fs = require('fs');
const path = require('path');
let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// build the merged dictionary exactly as the browser loads it
global.I18N = require('../renderer/js/i18n.js').I18N;
require('../renderer/js/i18n-guide.js');
require('../renderer/js/i18n-ui.js');
require('../renderer/js/i18n-csv.js');
require('../renderer/js/i18n-advisor.js');
require('../renderer/js/i18n-shell.js');
const { en, zh, ja } = global.I18N;
const ek = Object.keys(en), zk = Object.keys(zh), jk = Object.keys(ja);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// 1) key parity
chk('zh has every en key (no silent EN fallback)', ek.every(k => has(zh, k)), ek.filter(k => !has(zh, k)).slice(0, 8));
chk('ja has every en key (no silent EN fallback)', ek.every(k => has(ja, k)), ek.filter(k => !has(ja, k)).slice(0, 8));
chk('no zh key absent from en', zk.every(k => has(en, k)), zk.filter(k => !has(en, k)).slice(0, 8));
chk('no ja key absent from en', jk.every(k => has(en, k)), jk.filter(k => !has(en, k)).slice(0, 8));
chk('all three locales identical key count', ek.length === zk.length && zk.length === jk.length, { en: ek.length, zh: zk.length, ja: jk.length });

// 2) empty-string gaps (intentional empties allowlisted; must be empty in ALL three)
const EMPTY_OK = new Set(['ui.lapPost', 'ui.lihpaoLapPost', 'ui.lihpaoLapPostSh']);
// zh/ja carry real text everywhere — an EN-empty key (e.g. ui.lapPost, where English appends no unit) still
// gets a zh/ja suffix like 圈 / 周, so zh/ja must never be empty; only EN may be intentionally empty (allowlisted).
const zhEmpty = zk.filter(k => zh[k] === '');
const jaEmpty = jk.filter(k => ja[k] === '');
const enEmpty = ek.filter(k => en[k] === '' && !EMPTY_OK.has(k));
chk('no empty zh translations', zhEmpty.length === 0, zhEmpty.slice(0, 8));
chk('no empty ja translations', jaEmpty.length === 0, jaEmpty.slice(0, 8));
chk('en empty strings are allowlisted only (intentional: unit suffix lives only in zh/ja)', enEmpty.length === 0, enEmpty.slice(0, 8));

// 3) interpolation placeholder consistency ({x} / %s / {0})
const ph = (s) => (String(s).match(/\{[a-zA-Z0-9_]+\}|%[sd]|\{\d+\}/g) || []).sort();
const phMismatch = ek.filter(k => { const a = ph(en[k]).join(','); return (has(zh, k) && ph(zh[k]).join(',') !== a) || (has(ja, k) && ph(ja[k]).join(',') !== a); });
chk('interpolation placeholders consistent across locales', phMismatch.length === 0, phMismatch.slice(0, 8));

// 4) dynamic shell-code coverage
const STATUSES = ['empty', 'draft', 'importing', 'mapping_required', 'confirmation_required', 'window_required', 'calibration_required', 'ready_for_directional_analysis', 'ready_for_measured_analysis', 'analysis_complete', 'partially_blocked', 'error'];
const missStatus = STATUSES.filter(s => !(has(en, 'ui.status.' + s) && has(zh, 'ui.status.' + s) && has(ja, 'ui.status.' + s)));
chk('every shell status enum has a 3-lang key', missStatus.length === 0, missStatus);
const NEXT = ['create_case', 'run_model_or_import_telemetry', 'finish_import', 'map_channels_to_canonical', 'confirm_channel_identity', 'select_a_valid_analysis_window', 'add_a_steering_calibration', 'add_calibration_for_measured_or_import_more', 'review_measured_metrics_and_recommendations', 'review_recommendations_or_import_more_telemetry', 'resolve_the_top_blocked_reason', 'check_setup_inputs'];
const missNext = NEXT.filter(s => !(has(en, 'ui.nextAction.' + s) && has(zh, 'ui.nextAction.' + s) && has(ja, 'ui.nextAction.' + s)));
chk('every nextAction code has a 3-lang key', missNext.length === 0, missNext);

// 5) hard-coded English scanner over the R3 shell region
const html = fs.readFileSync(path.join(__dirname, '../renderer/index.html'), 'utf8').split('\n');
const startIdx = html.findIndex(l => l.includes('R3.0A: Analysis-Case app shell'));
const endIdx = html.findIndex(l => l.includes('R3.0A: Setup Library sub-navigation'));
chk('R3 shell region located in index.html', startIdx > 0 && endIdx > startIdx, { startIdx, endIdx });
// excluded (not user-facing copy): brand, milestone id, unit tokens, symbol glyphs, code identifiers
const ALLOW = /Racing Dynamics|R3\.0C|deg\/g|—|○|★|✓|CSV|Kus|K<sub>/;
const offenders = [];
if (startIdx > 0 && endIdx > startIdx) {
  for (let i = startIdx; i < endIdx; i++) {
    const line = html[i];
    // a literal text node ">Words<" that is not a binding and not allowlisted
    (line.match(/>[A-Z][A-Za-z][A-Za-z /&]+</g) || []).forEach(tn => { if (!ALLOW.test(tn)) offenders.push((i + 1) + ': ' + tn); });
    // a static placeholder=/title= with a letter (should be the :placeholder / :title bound form)
    if (/\splaceholder="[A-Za-z]/.test(line)) offenders.push((i + 1) + ': static placeholder=');
    if (/\stitle="[A-Za-z]/.test(line) && !/:title=/.test(line)) offenders.push((i + 1) + ': static title=');
  }
}
chk('no hard-coded English literals in the R3 shell region', offenders.length === 0, offenders.slice(0, 12));

// 6) t() fallback semantics
function mkT(lang) { const D = { en, zh, ja }; return (k) => { if (has(D[lang], k)) return D[lang][k]; if (has(en, k)) return en[k]; return k; }; }
const tzh = mkT('zh'), ten = mkT('en');
chk('missing key returns the key itself', tzh('ui.__nonexistent__') === 'ui.__nonexistent__');
chk('intentional EN empty respected (returns "", not the key)', ten('ui.lapPost') === '');
chk('present key returns the localized value', tzh('ui.case.save') === '儲存');

console.log('i18n-parity: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
