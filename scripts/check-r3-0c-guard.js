#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — R3.0C scope guard.
 *
 * R3-GATE0 must NOT begin R3.0C (Reference Lap / Corner Delta) production work. Three guarantees:
 *  1. registry contract: case_comparison / reference_lap / corner_delta remain deferred (R3.0C) and
 *     carry NO rendererAdapter (stable IDs may exist; behaviour must not be enabled).
 *  2. filename guard: no changed renderer/js module is named after those features.
 *  3. content guard: the ADDED LINES of EVERY changed renderer/js file (added, modified, or renamed) are
 *     scanned for R3.0C symbols — so deferred behaviour cannot be slipped into a neutrally-named new
 *     module (e.g. lap-analysis.js) OR into an edit of an existing generic module. Pre-existing lines
 *     (e.g. the deferred-ID definitions already in feature-registry.js) are NOT flagged.
 * Planning docs are allowed; production behaviour is not.
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

function run() {
  const R = require('../renderer/js/feature-registry.js'); // static relative (dependency-audit friendly)
  const FEATURES = R.FEATURES;
  const deferredStillDeferred = DEFERRED_R30C.every(id => {
    const f = FEATURES[id];
    return f && f.availability === 'deferred' && f.deferredReason === 'R3.0C' && !f.rendererAdapter;
  });

  const base = process.env.BASE_SHA || 'origin/main';
  const head = process.env.HEAD_SHA || 'HEAD';

  // (2) filename guard over all changed files
  const changed = git(['diff', '--name-only', base + '...' + head]).split('\n').map(s => s.trim()).filter(Boolean);
  const r3_0c_production_files = changed.filter(f => R30C_PROD_RE.test(f));

  // (3) content guard: scan ADDED LINES of every changed renderer/js file (added/modified/renamed)
  const diff = gitSafe(['diff', '--unified=0', base + '...' + head, '--', 'renderer/js']) || '';
  const r3_0c_symbol_hits = [];
  let curFile = null;
  for (const ln of diff.split('\n')) {
    const mf = ln.match(/^\+\+\+ b\/(.+)$/);
    if (mf) { curFile = mf[1] === '/dev/null' ? null : mf[1]; continue; }
    if (curFile && /\.js$/.test(curFile) && ln.startsWith('+') && !ln.startsWith('+++')) {
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
