#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — frozen-boundary check.
 *
 * Computes the set of changed files between the PR base and head and intersects it with the frozen
 * manifest (scripts/frozen-files.json). Any frozen file touched → fail. A milestone explicitly
 * authorised to change a frozen file passes ONLY those paths via FROZEN_ALLOW (comma-separated,
 * repo-relative); the check itself is never disabled. git diff is the authority.
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

function run() {
  const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'frozen-files.json'), 'utf8'));
  const frozen = new Set(manifest.frozen.map(f => f.path));
  const allow = new Set((process.env.FROZEN_ALLOW || '').split(',').map(s => s.trim()).filter(Boolean));

  const base = process.env.BASE_SHA || 'origin/main';
  const head = process.env.HEAD_SHA || 'HEAD';
  // three-dot: changes on head since it diverged from base (what THIS PR introduces)
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
console.log('FROZEN ' + JSON.stringify({ frozenDiffCount: result.frozenDiffCount, violations: result.violations, ok: result.ok }));
process.exit(exitCode);
