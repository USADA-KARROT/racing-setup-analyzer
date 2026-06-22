#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — Vehicle preset integrity check (structured evidence).
 *
 * Loads the REAL car-presets.js (+ api.js) in a vm context exactly as tests/vehicle-preset-pipeline.test.js
 * does, then asserts: count === 501, IDs unique, and emits a STABILITY manifest (sorted-ID sha256 +
 * content sha256). The hashes track drift only — git + the frozen-boundary check remain the content
 * authority (a derived hash is never treated as the source of truth).
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/preset-integrity.json   (exit non-zero on count/uniqueness failure)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
const J = p => path.join(REPO, 'renderer', 'js', p);
const EXPECTED = 501;

function run() {
  const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  let src = fs.readFileSync(J('car-presets.js'), 'utf8');
  try { src += '\n' + fs.readFileSync(J('api.js'), 'utf8'); } catch (_) { /* api.js optional */ }
  src += '\n; this.__presets = (typeof CAR_PRESETS !== "undefined") ? CAR_PRESETS : null;'
    + '\n; this.__api = (typeof api !== "undefined") ? api : null;';
  vm.runInContext(src, ctx, { filename: 'preset-load' });

  const CAR_PRESETS = ctx.__presets;
  if (!CAR_PRESETS || typeof CAR_PRESETS !== 'object') throw new Error('CAR_PRESETS not loaded');
  const api = ctx.__api;

  const ids = Object.keys(CAR_PRESETS);
  const apiCount = api && typeof api.getPresets === 'function' ? api.getPresets().length : null;
  const uniqueIds = new Set(ids);
  const idsUnique = uniqueIds.size === ids.length;
  const sortedIds = ids.slice().sort();
  const idManifestSha256 = crypto.createHash('sha256').update(sortedIds.join('\n')).digest('hex');
  const contentSha256 = crypto.createHash('sha256').update(JSON.stringify(CAR_PRESETS)).digest('hex');

  const ok = ids.length === EXPECTED && idsUnique && (apiCount === null || apiCount === EXPECTED);
  return {
    check: 'preset-integrity',
    presetCount: ids.length,
    apiCount,
    expected: EXPECTED,
    idsUnique,
    idManifestSha256,
    contentSha256,
    note: 'Hashes track STABILITY only; git history + the frozen-boundary check are the content authority.',
    ok,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'preset-integrity', fatalError: String((e && e.stack) || e), presetCount: -1, ok: false }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'preset-integrity.json'), JSON.stringify(result, null, 2));
console.log('PRESET ' + JSON.stringify({ presetCount: result.presetCount, apiCount: result.apiCount, idsUnique: result.idsUnique, ok: result.ok }));
process.exit(exitCode);
