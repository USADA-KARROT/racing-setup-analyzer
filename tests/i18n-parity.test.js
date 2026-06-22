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
require('../renderer/js/i18n-workspace.js');
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

// 5) hard-coded English scanner over EVERY i18n'd region (R3 shell + analysis workspace + import/calibrate flow)
const html = fs.readFileSync(path.join(__dirname, '../renderer/index.html'), 'utf8').split('\n');
const REGIONS = [
  ['R3.0A: Analysis-Case app shell', 'R3.0A: Setup Library sub-navigation'],   // R3 shell
  ["showPane('analysis')", '</main>'],                                          // analysis workspace pane (import flow + sections A–J)
  ["showPane('predict')", "showPane('advisor')"],                                  // Setup-Library tier result panes
  ["showPane('spring')", "showPane('tire')"],                                       // spring + ARB calculators + reference table
  ["showPane('guide')", "showPane('telemetry')"],                                   // engineering guide
  ["showPane('dashboard')", "showPane('comparisons')"],                            // case dashboard
  ["showPane('comparisons')", "showPane('predict')"],                               // comparisons
  ["showPane('advisor')", "showPane('spring')"],                                    // setup advisor
  ["showPane('tire')", "showPane('lihpao')"],                                        // tire model
  ["showPane('lihpao')", "showPane('guide')"],                                       // Lihpao track
  ["showPane('telemetry')", "showPane('analysis')"],                                 // legacy .bmsbin telemetry viewer
];
// allowlisted TOKENS (removed PER-TOKEN, not whole-line, so a leak beside an allowed token is still caught):
// brand/product, milestone & version ids, unit & symbol tokens, canonical channel option VALUES, engineering
// abbreviations, K_us markup, and credBadge('<Level>') — its arg is a machine level mapped via aw.cred, not copy.
const ALLOW = /Racing Dynamics|R3\.0C|R2\.\d|deg\/g|N\/mm|Nm\/deg|°C?|km\/h|kgf|Hz|—|·|○|★|✓|→|↔|⚠|CSV|MDF|K_us|Kus|K<sub>|<sub>us<\/sub>|\bARB\b|\bLLTD\b|\bMR\b|\bCG\b|credBadge\('[A-Za-z]+'\)|'(?:Physics|Model|Measured|Derived|Heuristic|Unavailable)'|value="(?:speed|lateral_accel|yaw_rate|steering|throttle|brake|track_position|lap|time)"/g;
const offenders = [];
let located = 0;
REGIONS.forEach(([sm, em]) => {
  const s = html.findIndex(l => l.includes(sm));
  const e = html.findIndex((l, idx) => idx > s && l.includes(em));
  if (s < 0 || e <= s) return;
  located++;
  for (let i = s; i < e; i++) {
    const stripped = html[i].replace(ALLOW, ' '); // per-token removal, then scan the remainder
    // a literal text node ">Words<" (capitalized, 3+ letters) — i18n'd copy renders via x-text so this is a leak
    (stripped.match(/>[A-Z][a-z][A-Za-z ]{2,}</g) || []).forEach(tn => offenders.push((i + 1) + ' text: ' + tn));
    // a static placeholder=/title= carrying letters (should be the :placeholder / :title bound form)
    if (/\splaceholder="[A-Za-z]/.test(stripped)) offenders.push((i + 1) + ': static placeholder=');
    if (/\stitle="[A-Za-z]/.test(stripped) && !/:title=/.test(html[i])) offenders.push((i + 1) + ': static title=');
    // a capitalized English string literal anywhere in an Alpine expression (catches inline concat like '(residual …)')
    (stripped.match(/'[A-Z][a-z][A-Za-z]{2,}[A-Za-z ]*'/g) || []).forEach(m => offenders.push((i + 1) + ' literal: ' + m));
  }
});
chk('both i18n\'d scanner regions located', located === REGIONS.length, { located });
chk('no hard-coded English literals in the i18n\'d regions', offenders.length === 0, offenders.slice(0, 15));
// CP-I18N-2: evidence-drawer dynamic layer labels (b.layer) are localized in all three locales
['execution', 'observation', 'comparison', 'measured', 'raceEngineer', 'driverCoach', 'trackIntelligence', 'model'].forEach(L => {
  chk('layer localized 3-lang: ' + L, has(en, 'aw.layer.' + L) && has(zh, 'aw.layer.' + L) && has(ja, 'aw.layer.' + L));
});

// 6) t() fallback semantics
function mkT(lang) { const D = { en, zh, ja }; return (k) => { if (has(D[lang], k)) return D[lang][k]; if (has(en, k)) return en[k]; return k; }; }
const tzh = mkT('zh'), ten = mkT('en');
chk('missing key returns the key itself', tzh('ui.__nonexistent__') === 'ui.__nonexistent__');
chk('intentional EN empty respected (returns "", not the key)', ten('ui.lapPost') === '');
chk('present key returns the localized value', tzh('ui.case.save') === '儲存');

// 7) CP-I18N-3: service-derived dynamic-code inventory — production blocker/cannotConclude codes need a 3-lang key
const svcDir = path.join(__dirname, '../renderer/js');
let svcSrc = '';
fs.readdirSync(svcDir).filter(f => /\.js$/.test(f) && !/^i18n/.test(f)).forEach(f => svcSrc += fs.readFileSync(path.join(svcDir, f), 'utf8'));
const uniq = a => [...new Set(a)];
const tri = (ns, c) => has(en, ns + '.' + c) && has(zh, ns + '.' + c) && has(ja, ns + '.' + c);
// internal/exception/model-pipeline codes may humanize (not a normal user-facing path)
const INTERNAL = /_EXCEPTION$|^EXECUTION_|MALFORMED|NOT_CANONICAL|FORBIDDEN_|_GUARD$|ANALYSIS_CASE_INVALID|CANONICAL_SNAPSHOT|CANONICAL_INPUT_NOT_MODEL|TELEMETRY_SESSION_MISSING|MODEL_ENGINE_UNAVAILABLE|MODEL_RUN_FAILED|MODEL_RESULT_NOT|BASELINE_|PARAMETER_|PERTURBED_|PROBE_|RECOMMENDED_|PREDICTED_RESULT|SETUP_[AB]_MODEL|DEGENERATE_|IMPLAUSIBLE_|UNKNOWN_TARGET|UNKNOWN_PARAMETER|BAD_TARGET|ANALYSIS_EXECUTION_UNAVAILABLE/;
const blockerCodes = uniq([...svcSrc.matchAll(/_blocker\(['"]([A-Z0-9_]+)['"]/g)].map(m => m[1]));
const cannotCodes = uniq([...svcSrc.matchAll(/cannotConclude\.push\(['"]([a-z0-9_]+)['"]/g)].map(m => m[1]));
const missBlocker = blockerCodes.filter(c => !INTERNAL.test(c) && !tri('ui.blocker', c));
const missCannot = cannotCodes.filter(c => !tri('ui.cannot', c));
chk('every production blocker code has a 3-lang key (internal/exception allowlisted)', missBlocker.length === 0, missBlocker);
chk('every cannotConclude code has a 3-lang key', missCannot.length === 0, missCannot);
// limitation + confounder closure (CP-I18N-3 round2): measured-metric confounders render via ui.confounder,
// quantitative-recommendation limitations via ui.limitation -- both namespaces must carry every emitted code.
const collectArr = re => uniq([].concat(...[...svcSrc.matchAll(re)].map(m => (m[1].match(/'[a-z0-9_]+'/g) || []).map(s => s.slice(1, -1)))));
const limCodes = uniq([...collectArr(/\bLIMITATIONS\s*=\s*\[([^\]]*)\]/g), ...[...svcSrc.matchAll(/limitations\.push\(['"]([a-z0-9_]+)['"]/g)].map(m => m[1])]);
const confCodes = collectArr(/\bCONFOUNDERS\s*=\s*\[([^\]]*)\]/g);
const missLim = limCodes.filter(c => !tri('ui.limitation', c));
const missConf = confCodes.filter(c => !tri('ui.confounder', c));
chk('every limitation code has a 3-lang ui.limitation key', missLim.length === 0, missLim);
chk('every confounder code has a 3-lang ui.confounder key', missConf.length === 0, missConf);

// 8) CP-I18N-3: UI-layer helpers (tCode recorder + tErr) + a11y lang are wired in index.html
const idxHtml = fs.readFileSync(path.join(__dirname, '../renderer/index.html'), 'utf8');
chk('tCode records unknown codes (dev detection, not silent)', /tCode\(prefix, code\)\{[\s\S]{0,500}__i18nMissingCodes/.test(idxHtml));
chk('tCode humanizes unknown codes as a last resort', /tCode\(prefix, code\)\{[\s\S]{0,900}toUpperCase/.test(idxHtml));
chk('tErr maps error codes with a localized generic fallback', /tErr\(v\)\{[\s\S]{0,500}ui\.err\.generic/.test(idxHtml) && tri.length && has(en, 'ui.err.generic') && has(zh, 'ui.err.generic') && has(ja, 'ui.err.generic'));
chk('error displays route through tErr (no raw importError/analysisError/storageError)', /x-text="tErr\(importError\)"/.test(idxHtml) && /x-text="tErr\(analysisError\)"/.test(idxHtml) && /tErr\(storageError\)/.test(idxHtml));
chk('document lang bound to the active locale (a11y)', /documentElement\.lang=\(l==='zh'\?'zh-TW':l\)/.test(idxHtml));
// CP-I18N-3 round3: trust-panel evidence layer + deleteCase confirm must not leak English
chk('trust-panel evidence layer localized (not raw b.layer)', /\(b\.layer\?tCode\('aw\.layer',b\.layer\)/.test(idxHtml));
chk('deleteCase confirm localized (no raw English prompt)', /confirm\(this\.t\('ui\.case\.deleteConfirm'\)\)/.test(idxHtml) && !/Delete this case\? This cannot be undone\./.test(idxHtml) && tri('ui.case', 'deleteConfirm'));
// CP-I18N-3 #1: legacy .bmsbin viewer adapter titles are no longer English in zh/ja
['ui.telem.cadapter.title', 'ui.telem.sadapter.title'].forEach(k => {
  chk('legacy adapter title localized: ' + k, has(en, k) && zh[k] !== en[k] && ja[k] !== en[k]);
});

console.log('i18n-parity: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
