#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — frozen-boundary check.
 *
 * Computes the set of changed files between the PR base and head and intersects it with the frozen
 * manifest. The frozen set is the UNION of the base-commit manifest (read from the base commit object,
 * which this PR cannot rewrite) and the head manifest — so a PR cannot drop an entry from
 * scripts/frozen-files.json to slip a frozen file past the guard. Any frozen file touched → fail. A
 * milestone explicitly authorised to change a frozen file passes ONLY those paths via FROZEN_ALLOW
 * (comma-separated, repo-relative); the check itself is never disabled.
 *
 * NOTE on the trust anchor: this guard still executes from the PR checkout. The complete defence against
 * a PR that rewrites the guard code itself is repo governance — a CODEOWNERS-gated required status check
 * on a protected branch (.github/CODEOWNERS + branch protection); see docs/r3-gate0-trusted-verification.md §8.
 *
 * Env: BASE_SHA / HEAD_SHA (CI supplies; fallback origin/main...HEAD), FROZEN_ALLOW (optional allowlist).
 * Output: ${ARTIFACT_DIR:-artifacts}/frozen-diff.txt   (exit non-zero if any non-allowlisted frozen file changed)
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');

function git(args) {
  const r = cp.spawnSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('git ' + args.join(' ') + ' failed: ' + (r.stderr || r.stdout));
  return (r.stdout || '').trim();
}
function gitSafe(args) {
  const r = cp.spawnSync('git', args, { cwd: REPO, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return r.status === 0 ? (r.stdout || '') : null;
}

function run() {
  const headManifest = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'frozen-files.json'), 'utf8'));
  const allow = new Set((process.env.FROZEN_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean));
  const base = process.env.BASE_SHA || 'origin/main';
  const head = process.env.HEAD_SHA || 'HEAD';

  // base-anchored frozen set: union of base-commit manifest (immutable in this PR) and head manifest.
  const baseTxt = gitSafe(['show', base + ':scripts/frozen-files.json']);
  let baseManifestPaths = [];
  if (baseTxt) { try { baseManifestPaths = (JSON.parse(baseTxt).frozen || []).map(f => f.path); } catch (_) { /* base lacked/invalid manifest */ } }
  const baseManifestAvailable = baseTxt != null && baseManifestPaths.length > 0;
  const frozen = new Set([...headManifest.frozen.map(f => f.path), ...baseManifestPaths]);

  const changed = git(['diff', '--name-only', base + '...' + head]).split('\n').map(s => s.trim()).filter(Boolean);
  const frozenChanged = changed.filter(f => frozen.has(f));
  const allowedChanged = frozenChanged.filter(f => allow.has(f));
  const violations = frozenChanged.filter(f => !allow.has(f));

  const ok = violations.length === 0;
  return {
    result: {
      check: 'frozen-boundary',
      base, head,
      frozenCount: frozen.size,
      baseManifestAvailable,
      headManifestCount: headManifest.frozen.length,
      baseManifestCount: baseManifestPaths.length,
      changedFileCount: changed.length,
      frozenChanged,
      allowlisted: Array.from(allow),
      allowedChanged,
      violations,
      frozenDiffCount: violations.length,
      ok,
    },
    text: violations.join('\n') + (violations.length ? '\n' : ''),
  };
}

let result, text, exitCode;
try { const r = run(); result = r.result; text = r.text; exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'frozen-boundary', fatalError: String((e && e.stack) || e), frozenDiffCount: -1, ok: false }; text = 'ERROR: ' + result.fatalError + '\n'; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'frozen-diff.txt'), text);
fs.writeFileSync(path.join(ARTIFACT_DIR, 'frozen-boundary-result.json'), JSON.stringify(result, null, 2));
console.log('FROZEN ' + JSON.stringify({ frozenDiffCount: result.frozenDiffCount, violations: result.violations, baseManifestAvailable: result.baseManifestAvailable, ok: result.ok }));
process.exit(exitCode);
