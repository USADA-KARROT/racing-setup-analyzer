#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 / R3.0C — scope guard (state-aware from C1).
 *
 * Invariant: NO UNAUTHORIZED R3.0C production work. At C0 (empty authorizedProductionPaths) the guard
 * is equivalent to its original R3-GATE0 form — every changed renderer/js file is scanned for R3.0C
 * filenames + content symbols. From C1 the state-aware allowance honours the exact set of renderer/js
 * paths listed in governance/r3.0c/state.json authorizedProductionPaths (whose capability is in
 * state.enabledCapabilities); those files may carry R3.0C symbols in source and comments (e.g. the
 * adapter documenting the scope boundary) without tripping the guard. Every OTHER changed renderer/js
 * file remains strictly scanned. The three feature IDs (case_comparison / reference_lap / corner_delta)
 * must still be deferred in renderer/js/feature-registry.js with NO rendererAdapter until C8 authorizes
 * activation — that registry contract is unchanged at every checkpoint.
 *
 * Three guarantees:
 *  1. registry contract: case_comparison / reference_lap / corner_delta remain deferred (R3.0C) and
 *     carry NO rendererAdapter until C8_ACTIVATION.
 *  2. filename guard: no changed renderer/js module that is NOT in authorizedProductionPaths is
 *     named after those features.
 *  3. content guard: the ADDED LINES of EVERY changed renderer/js file NOT in authorizedProductionPaths
 *     are scanned for R3.0C symbols — so deferred behaviour cannot be slipped into a neutrally-named
 *     new module (e.g. lap-analysis.js) OR into an edit of an existing generic module. Pre-existing
 *     lines (e.g. the deferred-ID definitions already in feature-registry.js) are NOT flagged.
 *
 * If state.json is unreadable the guard falls back to its original no-allowance behaviour — fail-closed.
 *
 * Env: BASE_SHA / HEAD_SHA (CI supplies; fallback origin/main...HEAD).
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-0c-guard.json   (exit non-zero on any violation)
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
const DEFERRED_R30C = ['case_comparison', 'reference_lap', 'corner_delta'];
const R30C_PROD_RE = /^renderer\/js\/.*(reference[-_]?lap|corner[-_]?delta|case[-_]?comparison).*\.js$/i;
const R30C_SYMBOL_RE = /(reference[-_ ]?lap|corner[-_ ]?delta|case[-_ ]?comparison)/i;

function git(args) {
  const r = cp.spawnSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('git ' + args.join(' ') + ' failed: ' + (r.stderr || r.stdout));
  return (r.stdout || '').trim();
}
function gitSafe(args) {
  const r = cp.spawnSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? (r.stdout || '') : null;
}

function loadAuthorizedAdapterPaths() {
  // Returns the set of renderer/js paths authorized by governance/r3.0c/state.json. Authorization is
  // gated on capability membership in state.enabledCapabilities. State.json unreadable degrades to
  // an empty set (no allowance — original R3-GATE0 behaviour).
  const set = new Set();
  try {
    const state = JSON.parse(fs.readFileSync(path.join(REPO, 'governance', 'r3.0c', 'state.json'), 'utf8'));
    const enabled = new Set(Array.isArray(state.enabledCapabilities) ? state.enabledCapabilities : []);
    const raw = Array.isArray(state.authorizedProductionPaths) ? state.authorizedProductionPaths : [];
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue;
      const p = entry.path, cap = entry.capability;
      if (typeof p !== 'string' || typeof cap !== 'string') continue;
      if (!p.startsWith('renderer/js/')) continue;
      if (!enabled.has(cap)) continue;
      set.add(p);
    }
  } catch (_) { /* fall-closed: empty set */ }
  return set;
}

function run() {
  const R = require('../renderer/js/feature-registry.js'); // static relative (dependency-audit friendly)
  const FEATURES = R.FEATURES;
  const deferredStillDeferred = DEFERRED_R30C.every(id => {
    const f = FEATURES[id];
    return f && f.availability === 'deferred' && f.deferredReason === 'R3.0C' && !f.rendererAdapter;
  });

  const base = process.env.BASE_SHA || 'origin/main';
  const head = process.env.HEAD_SHA || 'HEAD';

  // State-aware allowance — paths in this set are NOT subject to filename / content R3.0C scanning,
  // because they are the explicitly governance-authorized R3.0C production surface (e.g. the C1
  // adapter, which documents the deferred feature names in its module-doc to communicate the scope
  // boundary). All other changed renderer/js files remain strictly scanned.
  const authorizedAdapterPaths = loadAuthorizedAdapterPaths();

  // (2) filename guard over all changed files (skip authorized adapter paths)
  const changed = git(['diff', '--name-only', base + '...' + head]).split('\n').map(s => s.trim()).filter(Boolean);
  const r3_0c_production_files = changed.filter(f => R30C_PROD_RE.test(f) && !authorizedAdapterPaths.has(f));

  // (3) content guard: scan ADDED LINES of every changed renderer/js file (added/modified/renamed)
  //     — skipping any file whose path is in the authorized adapter set.
  const diff = gitSafe(['diff', '--unified=0', base + '...' + head, '--', 'renderer/js']) || '';
  const r3_0c_symbol_hits = [];
  let curFile = null;
  for (const ln of diff.split('\n')) {
    const mf = ln.match(/^\+\+\+ b\/(.+)$/);
    if (mf) { curFile = mf[1] === '/dev/null' ? null : mf[1]; continue; }
    if (!curFile) continue;
    if (authorizedAdapterPaths.has(curFile)) continue;
    if (/\.js$/.test(curFile) && ln.startsWith('+') && !ln.startsWith('+++')) {
      const added = ln.slice(1);
      if (R30C_SYMBOL_RE.test(added)) r3_0c_symbol_hits.push({ file: curFile, line: added.trim().slice(0, 120) });
    }
  }

  const ok = deferredStillDeferred && r3_0c_production_files.length === 0 && r3_0c_symbol_hits.length === 0;
  return {
    check: 'r3-0c-scope-guard',
    deferredR30cIds: DEFERRED_R30C,
    deferredStillDeferred,
    r3_0c_production_files,
    r3_0c_symbol_hits,
    r3_0c_production_diff: r3_0c_production_files.length + r3_0c_symbol_hits.length,
    authorizedAdapterPaths: Array.from(authorizedAdapterPaths).sort(),
    base, head,
    ok,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'r3-0c-scope-guard', fatalError: String((e && e.stack) || e), deferredStillDeferred: false, r3_0c_production_diff: -1, ok: false }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'r3-0c-guard.json'), JSON.stringify(result, null, 2));
console.log('R3.0C-GUARD ' + JSON.stringify({ deferredStillDeferred: result.deferredStillDeferred, productionDiff: result.r3_0c_production_diff, ok: result.ok }));
process.exit(exitCode);
