#!/usr/bin/env node
/**
 * scripts/check-release-gate.js — R3.0F F5_RELEASE_GATE · 12-condition release gate.
 *
 * Implements the gate defined by governance/r3.0f/capabilities.json →
 * release_gate_present: "12-condition release gate script (preflight, tests, E2E,
 * frozen 0, preset 501, i18n parity, reachability, no orphans, Electron build OK,
 * release notes drafted, CHANGELOG, tag policy). MUST run fail-closed."
 *
 * Design:
 *   - Dependency-free (Node builtins only) — this file lives in scripts/ and is
 *     therefore itself an entry point of the check-verification-dependencies audit.
 *   - Delegating: conditions 1,2,4,5,6,7,8,12 spawn the existing single-purpose
 *     validators as child processes and judge on exit code + artifact JSON. This
 *     script adds NO alternative implementation of what those validators enforce.
 *   - Condition 3 (E2E) is judged from the test manifest produced by condition 2:
 *     every tests/e2e/ file must have run and passed.
 *   - Condition 9 (Electron build OK) is a declaration-level readiness check
 *     (CI is install-free by policy — scripts/check-version-policy.js forbids
 *     npm install/electron-builder text in workflows — so an actual build cannot
 *     run here; an actual local build is a separate, manual F5 evidence step).
 *   - Conditions 10/11 verify the release-notes draft and CHANGELOG hooks.
 *   - ALL 12 conditions always run (no short-circuit) so one gate run reports the
 *     complete failure surface; the gate exits 1 if ANY condition failed.
 *   - Exit codes: 0 = all 12 PASS · 1 = one or more conditions FAILED · 2 = the
 *     gate itself crashed (fail-closed).
 *
 * Output: artifacts/release-gate.json + one stdout line `RELEASE-GATE {json}`.
 *
 * Env:
 *   ARTIFACT_DIR   — artifact directory (default <repo>/artifacts)
 *   BASE_SHA/HEAD_SHA/FROZEN_ALLOW — passed through to check-frozen-boundary.js
 *   RELEASE_GATE_TIMEOUT_MS — per-child timeout (default 900000; the full test
 *                             suite runs inside condition 2)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.join(REPO, 'artifacts');
const CHILD_TIMEOUT = Number(process.env.RELEASE_GATE_TIMEOUT_MS || 900000);

// ── plumbing ────────────────────────────────────────────────────────────────────

function _readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function _spawnNode(args, extraEnv) {
  const r = cp.spawnSync(process.execPath, args, {
    cwd: REPO,
    encoding: 'utf8',
    timeout: CHILD_TIMEOUT,
    env: Object.assign({}, process.env, { ARTIFACT_DIR: ARTIFACT_DIR }, extraEnv || {}),
  });
  return {
    status: r.status,
    timedOut: !!(r.error && r.error.code === 'ETIMEDOUT'),
    stdout: (r.stdout || '').slice(-4000),
    stderr: (r.stderr || '').slice(-4000),
  };
}

// A delegating condition: PASS iff child exits 0 (timeout / non-zero / spawn error
// all FAIL — fail-closed).
function _delegate(scriptRelPath, extraArgs, extraEnv) {
  const r = _spawnNode([path.join(REPO, scriptRelPath)].concat(extraArgs || []), extraEnv);
  return {
    ok: r.status === 0 && !r.timedOut,
    detail: {
      script: scriptRelPath,
      exitCode: r.status,
      timedOut: r.timedOut,
      lastStdoutLine: r.stdout.trim().split('\n').pop() || '',
    },
  };
}

// Codex F5-R2-01: a delegated child's exit code alone is not enough — the artifact
// the child just (re)wrote must also be readable and carry ok === true. Missing,
// unreadable, or schema-invalid artifacts FAIL the condition even on exit 0.
function _corroborate(io, childResult, artifactName) {
  if (!childResult.ok) return { ok: false, detail: childResult.detail };
  let art = null;
  try { art = io.readJson(path.join(ARTIFACT_DIR, artifactName)); } catch (_) { }
  const artOk = !!art && art.ok === true;
  return {
    ok: artOk,
    detail: Object.assign({}, childResult.detail, {
      artifact: artifactName,
      artifactOk: art ? art.ok === true : null,
      artifactReadable: !!art,
    }),
  };
}

// ── the 12 conditions ───────────────────────────────────────────────────────────

const CONDITIONS = [
  {
    id: 1,
    key: 'preflight',
    name: 'Preflight — dependency-free verification lane audit',
    run(io) {
      const self = io.delegate('scripts/check-verification-dependencies.js', ['--selftest']);
      if (!self.ok) return { ok: false, detail: { phase: 'selftest', inner: self.detail } };
      const main = _corroborate(io, io.delegate('scripts/check-verification-dependencies.js'), 'dependency-audit.json');
      return { ok: main.ok, detail: { phase: 'audit', inner: main.detail } };
    },
  },
  {
    id: 2,
    key: 'tests',
    name: 'Tests — full manifest run (canonical npm-test chain, per-file child process)',
    run(io) {
      const r = io.delegate('scripts/run-tests-manifest.js');
      let summary = null;
      try {
        const manifest = io.readJson(path.join(ARTIFACT_DIR, 'test-manifest.json'));
        summary = manifest && manifest.summary ? manifest.summary : null;
      } catch (_) { /* judged below */ }
      const ok = r.ok
        && !!summary
        && summary.failedFiles === 0
        && summary.timeoutFiles === 0
        && summary.assertionsFailed === 0
        && Array.isArray(summary.discoveryMissing) && summary.discoveryMissing.length === 0
        && Array.isArray(summary.discoveryGhost) && summary.discoveryGhost.length === 0;
      return {
        ok: ok,
        detail: {
          inner: r.detail,
          discovered: summary ? summary.discovered : null,
          ran: summary ? summary.ran : null,
          assertionsPassed: summary ? summary.assertionsPassed : null,
          assertionsFailed: summary ? summary.assertionsFailed : null,
        },
      };
    },
  },
  {
    id: 3,
    key: 'e2e',
    name: 'E2E — every tests/e2e/ file ran and passed (judged from the test manifest)',
    run(io) {
      let manifest;
      try {
        manifest = io.readJson(path.join(ARTIFACT_DIR, 'test-manifest.json'));
      } catch (e) {
        return { ok: false, detail: { error: 'test-manifest.json unreadable — run condition 2 first: ' + e.message } };
      }
      const results = Array.isArray(manifest.results) ? manifest.results : [];
      const e2e = results.filter((x) => typeof x.file === 'string' && x.file.indexOf('tests/e2e/') === 0);
      // A file passed iff its child exited 0, did not time out, and parsed EXACTLY zero
      // failed assertions. STRICT === 0 (Codex F5-R1-01): a malformed row with a
      // missing/null assertionsFailed must FAIL closed, not default to zero.
      const failed = e2e
        .filter((x) => !(x.exitCode === 0 && x.timedOut !== true && x.assertionsFailed === 0))
        .map((x) => x.file);
      // Fail-closed floor: the F2+F3 manifest ships 15 e2e files (9 flows + 6 probes).
      const ok = e2e.length >= 15 && failed.length === 0;
      return { ok: ok, detail: { e2eFiles: e2e.length, failed: failed } };
    },
  },
  {
    id: 4,
    key: 'frozen',
    name: 'Frozen 0 — no frozen-manifest file modified (C8-authorized registry exception mirrored from CI)',
    run(io) {
      // EXACTLY the CI workflow's conditional: renderer/js/feature-registry.js is allowlisted
      // ONLY while governance/r3.0c/state.json grants featureRegistryActivationAllowed AND lists
      // the file as an authorized production path. Any OTHER frozen file changed still fails,
      // and the allowlist itself vanishes if governance ever revokes the grant.
      let allow = '';
      try {
        const st = io.readJson(path.join(REPO, 'governance', 'r3.0c', 'state.json'));
        if (st.featureRegistryActivationAllowed === true &&
            (st.authorizedProductionPaths || []).some(e => e && e.path === 'renderer/js/feature-registry.js' && e.capability === 'feature_registry_active')) {
          allow = 'renderer/js/feature-registry.js';
        }
      } catch (_) { /* fail-closed: no allow */ }
      const r = io.delegate('scripts/check-frozen-boundary.js', [], { FROZEN_ALLOW: allow });
      let frozen = null;
      try { frozen = io.readJson(path.join(ARTIFACT_DIR, 'frozen-boundary-result.json')); } catch (_) { }
      // ok iff the child passed AND nothing outside the (possibly empty) allowlist changed.
      const violations = frozen && Array.isArray(frozen.violations) ? frozen.violations : null;
      return {
        ok: r.ok && !!frozen && violations !== null && violations.length === 0,
        detail: { inner: r.detail, frozenAllow: allow || null, frozenDiffCount: frozen ? frozen.frozenDiffCount : null, violations },
      };
    },
  },
  {
    id: 5,
    key: 'preset501',
    name: 'Preset 501 — vehicle preset integrity',
    run(io) {
      const r = io.delegate('scripts/check-preset-integrity.js');
      let p = null;
      try { p = io.readJson(path.join(ARTIFACT_DIR, 'preset-integrity.json')); } catch (_) { }
      return {
        ok: r.ok && !!p && p.presetCount === 501,
        detail: { inner: r.detail, presetCount: p ? p.presetCount : null },
      };
    },
  },
  {
    id: 6,
    key: 'i18n',
    name: 'i18n parity — en/zh/ja union-key parity on production locale modules',
    run(io) {
      const r = io.delegate('scripts/check-i18n.js');
      let m = null;
      try { m = io.readJson(path.join(ARTIFACT_DIR, 'i18n-result.json')); } catch (_) { }
      return {
        ok: r.ok && !!m && m.i18nMissing === 0,
        detail: { inner: r.detail, i18nMissing: m ? m.i18nMissing : null },
      };
    },
  },
  {
    id: 7,
    key: 'reachability',
    name: 'Reachability — feature-registry contract (state-aware)',
    run(io) {
      const r = _corroborate(io, io.delegate('scripts/check-feature-registry.js'), 'feature-registry-result.json');
      return { ok: r.ok, detail: r.detail };
    },
  },
  {
    id: 8,
    key: 'noOrphans',
    name: 'No orphans — zero production feature orphans + no unauthorized contract consumers (C/D/E/F)',
    run(io) {
      // Codex F5-R1-02: condition 8 must NOT judge on a possibly-stale artifact from a
      // previous run — it delegates check-feature-registry.js ITSELF (independently of
      // condition 7), and only reads the artifact that THIS child just rewrote, and only
      // when that child exited 0.
      const regRun = io.delegate('scripts/check-feature-registry.js');
      let reg = null;
      if (regRun.ok) {
        try { reg = io.readJson(path.join(ARTIFACT_DIR, 'feature-registry-result.json')); } catch (_) { }
      }
      // check-feature-registry.js writes productionFeatureOrphans as a COUNT (number);
      // the offending ids live in the sibling `orphans` array. Fail closed when the
      // child failed, the artifact is unreadable, or the count is absent/non-zero.
      const orphanCount = reg && typeof reg.productionFeatureOrphans === 'number' ? reg.productionFeatureOrphans : null;
      const c = _corroborate(io, io.delegate('scripts/check-r3-0c-no-consumer.js'), 'r3-0c-no-consumer.json');
      const d = _corroborate(io, io.delegate('scripts/check-r3-phase-no-consumer.js', [], { R3_PHASE_PROGRAM: 'R3.0D' }), 'r3-0d-no-consumer.json');
      const e = _corroborate(io, io.delegate('scripts/check-r3-phase-no-consumer.js', [], { R3_PHASE_PROGRAM: 'R3.0E' }), 'r3-0e-no-consumer.json');
      const f = _corroborate(io, io.delegate('scripts/check-r3-phase-no-consumer.js', [], { R3_PHASE_PROGRAM: 'R3.0F' }), 'r3-0f-no-consumer.json');
      const ok = regRun.ok && orphanCount === 0 && c.ok && d.ok && e.ok && f.ok;
      return {
        ok: ok,
        detail: {
          registryChild: regRun.detail,
          productionFeatureOrphans: orphanCount,
          orphanIds: reg && Array.isArray(reg.orphans) ? reg.orphans : null,
          r30c: c.detail, r30d: d.detail, r30e: e.detail, r30f: f.detail,
        },
      };
    },
  },
  {
    id: 9,
    key: 'electronBuild',
    name: 'Electron build OK — declaration-level packaging readiness (CI is install-free by policy)',
    run(io) {
      const problems = [];
      let pkg;
      try { pkg = io.readJson(path.join(REPO, 'package.json')); } catch (e) {
        return { ok: false, detail: { problems: ['package.json unreadable: ' + e.message] } };
      }
      // 9a. devDependencies are exactly the two build tools with well-formed ranges.
      const dev = pkg.devDependencies || {};
      const devKeys = Object.keys(dev).sort();
      if (devKeys.join(',') !== 'electron,electron-builder') problems.push('devDependencies must be exactly {electron, electron-builder}; got ' + devKeys.join(','));
      for (const k of devKeys) {
        if (!/^[\^~]?\d+\.\d+\.\d+$/.test(String(dev[k]))) problems.push('devDependency ' + k + ' has a non-simple range: ' + dev[k]);
      }
      if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) problems.push('runtime dependencies must be empty; got ' + Object.keys(pkg.dependencies).join(','));
      // 9b. build block shape.
      const b = pkg.build || {};
      if (b.appId !== 'com.racingsetup.analyzer') problems.push('build.appId drifted: ' + b.appId);
      if (b.productName !== 'Racing Setup Analyzer') problems.push('build.productName drifted: ' + b.productName);
      if (!b.directories || typeof b.directories.output !== 'string' || b.directories.output.length === 0) problems.push('build.directories.output missing');
      // 9c. files allowlist: exactly the three production roots PLUS (H5) any number of
      //     single-file '!renderer/js/<name>.js' EXCLUSIONS (the UI-truth package excludes).
      //     Nothing else — no extra inclusions, no directory-wide or non-renderer excludes.
      const files = Array.isArray(b.files) ? b.files.slice() : [];
      const baseRoots = ['main.js', 'preload.js', 'renderer/**/*'];
      const inclusions = files.filter(f => !String(f).startsWith('!'));
      const exclusions = files.filter(f => String(f).startsWith('!'));
      if (JSON.stringify(inclusions.slice().sort()) !== JSON.stringify(baseRoots.slice().sort())) problems.push('build.files inclusions must be exactly [main.js, preload.js, renderer/**/*]; got ' + JSON.stringify(inclusions));
      const badExcl = exclusions.filter(f => !/^!renderer\/js\/[A-Za-z0-9._-]+\.js$/.test(f));
      if (badExcl.length) problems.push('build.files exclusions must each be a single-file !renderer/js/<name>.js pattern; got ' + JSON.stringify(badExcl));
      // every excluded file must NOT be referenced by the page (no packaged 404s)
      const htmlForExcl = fs.readFileSync(path.join(REPO, 'renderer', 'index.html'), 'utf8');
      const leakedExcl = exclusions.map(f => f.replace('!renderer/js/', '')).filter(f => htmlForExcl.includes('js/' + f));
      if (leakedExcl.length) problems.push('build.files excludes page-loaded scripts (packaged 404): ' + JSON.stringify(leakedExcl));
      // 9d. every asset the build config references must exist on disk (no dangling icons).
      for (const [plat, cfg] of [['mac', b.mac], ['win', b.win]]) {
        if (cfg && typeof cfg.icon === 'string') {
          if (!fs.existsSync(path.join(REPO, cfg.icon))) problems.push('build.' + plat + '.icon references a missing file: ' + cfg.icon);
        }
      }
      // 9e. the three packaged roots exist.
      for (const f of ['main.js', 'preload.js', 'renderer/index.html']) {
        if (!fs.existsSync(path.join(REPO, f))) problems.push('packaged root missing: ' + f);
      }
      // 9f. renderer tree hygiene: nothing that must not ship.
      const rendererDir = path.join(REPO, 'renderer');
      const bad = [];
      (function walk(dir) {
        for (const name of fs.readdirSync(dir)) {
          const full = path.join(dir, name);
          const st = fs.statSync(full);
          if (st.isDirectory()) {
            if (name === 'node_modules') { bad.push(path.relative(REPO, full)); continue; }
            walk(full);
          } else if (name === '.DS_Store' || name.endsWith('.map') || name.endsWith('.env')) {
            bad.push(path.relative(REPO, full));
          }
        }
      })(rendererDir);
      if (bad.length) problems.push('renderer tree contains non-shippable entries: ' + bad.join(', '));
      // 9g. every script/lib the page references exists on disk (missing-asset guard).
      const html = fs.readFileSync(path.join(REPO, 'renderer', 'index.html'), 'utf8');
      const srcs = [];
      const re = /<script[^>]+src="([^"]+)"/g;
      let m;
      while ((m = re.exec(html)) !== null) srcs.push(m[1]);
      const missing = srcs.filter((s) => !fs.existsSync(path.join(REPO, 'renderer', s)));
      if (srcs.length < 90) problems.push('suspiciously few <script src> tags parsed from renderer/index.html: ' + srcs.length);
      if (missing.length) problems.push('renderer/index.html references missing assets: ' + missing.join(', '));
      return { ok: problems.length === 0, detail: { problems: problems, scriptTags: srcs.length } };
    },
  },
  {
    id: 10,
    key: 'releaseNotes',
    name: 'Release notes drafted — docs/release-notes-2.0.0.md with required sections',
    run(io) {
      // v2.0.1 public line: the 2.0.1 notes are the primary document; the 2.0.0 notes remain as history.
      const p = path.join(REPO, 'docs', 'release-notes-2.0.1.md');
      if (!fs.existsSync(p)) return { ok: false, detail: { error: 'docs/release-notes-2.0.1.md does not exist' } };
      const text = fs.readFileSync(p, 'utf8');
      const required = [
        // F6 finalized: the notes must declare RELEASE CANDIDATE status — a reversion
        // to DRAFT (or a missing/unknown declaration) fails the gate.
        ['release-candidate status', /Status:\s*RELEASE CANDIDATE/i],
        ['unsigned/unnotarized disclosure', /not code-signed and not notarized/i],
        ['upgrade guidance', /^## Upgrade guidance/m],
        ['backup/rollback guidance', /^## Backup and rollback guidance/m],
        ['known limitations', /^## Known limitations/m],
        ['release boundary', /^## Release boundary/m],
      ];
      const missing = required.filter(([, rx]) => !rx.test(text)).map(([label]) => label);
      return { ok: missing.length === 0, detail: { missingSections: missing } };
    },
  },
  {
    id: 11,
    key: 'changelog',
    name: 'CHANGELOG — finalized [2.0.0] Release-Candidate section and the 1.4.0 pin statement',
    run(io) {
      const p = path.join(REPO, 'CHANGELOG.md');
      if (!fs.existsSync(p)) return { ok: false, detail: { error: 'CHANGELOG.md does not exist' } };
      const text = fs.readFileSync(p, 'utf8');
      const problems = [];
      if (!/^# Changelog/m.test(text)) problems.push('missing top-level "# Changelog" heading');
      if (!/^## \[2\.0\.1\] — Public Release Candidate/m.test(text)) problems.push('missing the [2.0.1] — Public Release Candidate section heading');
      if (!/pinned at .?1\.4\.0/i.test(text)) problems.push('missing the pinned-at-1.4.0 history statement');
      return { ok: problems.length === 0, detail: { problems: problems } };
    },
  },
  {
    id: 12,
    key: 'tagPolicy',
    name: 'Tag policy — version pinned at the authorized value (check-version-policy EXPECTED), lockfile TRACKED (H3 reproducible-build authority), verification lane install-free',
    run(io) {
      const r = _corroborate(io, io.delegate('scripts/check-version-policy.js'), 'version-policy.json');
      return { ok: r.ok, detail: r.detail };
    },
  },
];

// ── runner ──────────────────────────────────────────────────────────────────────

// io is injectable so tests can exercise each condition's fail-closed judgement
// without spawning the real (multi-minute) validators.
function runGate(io) {
  io = io || { delegate: _delegate, readJson: _readJson };
  const results = [];
  for (const cond of CONDITIONS) {
    let out;
    try {
      out = cond.run(io);
    } catch (e) {
      out = { ok: false, detail: { crashed: String((e && e.message) || e) } };
    }
    results.push({ id: cond.id, key: cond.key, name: cond.name, ok: out.ok === true, detail: out.detail });
  }
  const failed = results.filter((r) => !r.ok);
  return {
    schemaVersion: 1,
    gate: 'F5_RELEASE_GATE',
    conditions: results,
    passedCount: results.length - failed.length,
    failedCount: failed.length,
    failedKeys: failed.map((r) => r.key),
    ok: failed.length === 0,
  };
}

module.exports = { CONDITIONS, runGate, _delegate: _delegate, _readJson: _readJson };

if (require.main === module) {
  let exitCode = 2;
  try {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    const report = runGate();
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'release-gate.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write('RELEASE-GATE ' + JSON.stringify({
      ok: report.ok, passed: report.passedCount, failed: report.failedCount, failedKeys: report.failedKeys,
    }) + '\n');
    exitCode = report.ok ? 0 : 1;
  } catch (e) {
    process.stderr.write('RELEASE-GATE FATAL ' + String((e && e.stack) || e) + '\n');
    exitCode = 2;
  }
  process.exit(exitCode);
}
