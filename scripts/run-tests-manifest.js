#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — trusted per-file test runner.
 *
 * Deterministic discovery from package.json `scripts.test` (the single authoritative test list),
 * cross-checked against tests/*.js on disk so a forgotten file cannot silently drop out of coverage.
 * Each file runs in its OWN child process. Per-file PASS authority is the child's EXIT CODE — never a
 * grep of "PASS", never the test name. Fail-closed on timeout and on exit/assertion inconsistency.
 * The manifest is always written (even on failure); the process exits non-zero if anything failed.
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/test-manifest.json
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
const OUT = path.join(ARTIFACT_DIR, 'test-manifest.json');
const TIMEOUT_MS = parseInt(process.env.TEST_TIMEOUT_MS || '180000', 10);

function discover() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const cmd = pkg.scripts && pkg.scripts.test;
  if (!cmd) throw new Error('package.json scripts.test missing');
  const parts = cmd.split('&&').map(s => s.trim()).filter(Boolean);
  const entries = parts.map(p => {
    const m = p.match(/^node\s+(.+)$/);
    if (!m) throw new Error('non-`node` test step (cannot discover deterministically): ' + p);
    const argv = m[1].trim().split(/\s+/);
    return { file: argv[0], args: argv.slice(1), command: 'node ' + m[1].trim() };
  });
  // cross-check vs disk: catch both a forgotten file (coverage gap) and a referenced-but-missing file.
  const onDisk = fs.readdirSync(path.join(REPO, 'tests')).filter(f => f.endsWith('.js')).map(f => 'tests/' + f).sort();
  const refTests = entries.map(e => e.file).filter(f => f.startsWith('tests/')).sort();
  const discoveryMissing = onDisk.filter(f => !refTests.includes(f)); // on disk but NOT run
  const discoveryGhost = refTests.filter(f => !onDisk.includes(f));   // referenced but absent
  return { entries, discoveryMissing, discoveryGhost };
}

function parseAssertions(stdout) {
  // Repo-wide convention: every test prints "... N passed, M failed" (en/zh both contain the words).
  const re = /(\d+)\s+passed,\s+(\d+)\s+failed/g;
  let m, last = null, count = 0;
  while ((m = re.exec(stdout)) !== null) { last = m; count++; }
  if (last) return { passed: +last[1], failed: +last[2], parsed: true, matches: count };
  const m2 = stdout.match(/selftest[^0-9]*?(\d+)\s*\/\s*(\d+)/i); // tools/validate --selftest style "N/N"
  if (m2) { const ran = +m2[2], ok = +m2[1]; return { passed: ok, failed: ran - ok, parsed: true, matches: 1 }; }
  return { passed: null, failed: null, parsed: false, matches: 0 };
}

function digest(s) {
  s = s || '';
  return { len: s.length, sha256: crypto.createHash('sha256').update(s).digest('hex'), head: s.slice(0, 400), tail: s.slice(-400) };
}

function runOne(entry) {
  const start = Date.now();
  const r = cp.spawnSync('node', [entry.file, ...entry.args], {
    cwd: REPO, timeout: TIMEOUT_MS, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const durationMs = Date.now() - start;
  const timedOut = !!(r.error && (r.error.code === 'ETIMEDOUT' || r.signal === 'SIGTERM'));
  const stdout = r.stdout || '', stderr = r.stderr || '';
  const a = parseAssertions(stdout);
  const exitCode = timedOut ? null : (typeof r.status === 'number' ? r.status : null);
  const signal = r.signal || null;
  let passed;
  if (timedOut) passed = false;                       // fail-closed
  else if (exitCode !== 0) passed = false;            // exit code is the authority
  else if (a.parsed && a.failed > 0) passed = false;  // exit 0 but reported failures -> inconsistency, fail-closed
  else passed = true;
  return {
    file: entry.file, command: entry.command, exitCode, signal, timedOut,
    assertionsPassed: a.passed, assertionsFailed: a.failed, assertionsParsed: a.parsed,
    skipped: 0, durationMs, stdoutDigest: digest(stdout), stderrDigest: digest(stderr), passed,
  };
}

function main() {
  let manifest, exitCode = 0;
  try {
    const disc = discover();
    const results = disc.entries.map(runOne);
    const summary = {
      discovered: disc.entries.length,
      ran: results.length,
      passedFiles: results.filter(r => r.passed).length,
      failedFiles: results.filter(r => !r.passed && !r.timedOut).length,
      timeoutFiles: results.filter(r => r.timedOut).length,
      assertionsPassed: results.reduce((s, r) => s + (r.assertionsPassed || 0), 0),
      assertionsFailed: results.reduce((s, r) => s + (r.assertionsFailed || 0), 0),
      skipped: results.reduce((s, r) => s + (r.skipped || 0), 0),
      discoveryMissing: disc.discoveryMissing,
      discoveryGhost: disc.discoveryGhost,
    };
    manifest = { tool: 'r3-gate0-test-manifest', timeoutMs: TIMEOUT_MS, summary, results };
    const fail = summary.failedFiles > 0 || summary.timeoutFiles > 0 || summary.assertionsFailed > 0
      || disc.discoveryMissing.length > 0 || disc.discoveryGhost.length > 0;
    exitCode = fail ? 1 : 0;
  } catch (e) {
    manifest = { tool: 'r3-gate0-test-manifest', fatalError: String((e && e.stack) || e) };
    exitCode = 2;
  }
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
  const s = manifest.summary || {};
  console.log('MANIFEST_SUMMARY ' + JSON.stringify({
    discovered: s.discovered, ran: s.ran, passedFiles: s.passedFiles, failedFiles: s.failedFiles,
    timeoutFiles: s.timeoutFiles, assertionsPassed: s.assertionsPassed, assertionsFailed: s.assertionsFailed,
    discoveryMissing: s.discoveryMissing, discoveryGhost: s.discoveryGhost, exitCode,
  }));
  process.exit(exitCode);
}
main();
