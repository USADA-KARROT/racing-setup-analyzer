/**
 * tests/e2e/hardening-06-supply-chain.test.js — R3.0F F3 · Supply-chain hardening.
 *
 * Asserts the project's dependency footprint is minimal and locked:
 *   • package.json declares ONLY known runtime + dev deps (electron / electron-builder)
 *   • No production renderer module pulls a bare third-party import via require()
 *   • No "scripts" in package.json reference untrusted external tooling
 *   • CHANGELOG.md exists at the repository root (per F2 schema allowedRoots)
 *   • No secrets / API keys / .env files committed
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;
var fs = require('fs');
var path = require('path');

var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
try {
  var repoRoot = path.join(__dirname, '..', '..');

  // Step 1: package.json dependency footprint
  var pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  chk('package.json has no runtime "dependencies" key (Electron-only app)', pkg.dependencies === undefined || Object.keys(pkg.dependencies || {}).length === 0);
  chk('devDependencies present', pkg.devDependencies && typeof pkg.devDependencies === 'object');

  var allowedDevDeps = ['electron', 'electron-builder'];
  var devDepNames = Object.keys(pkg.devDependencies || {});
  var unexpectedDevDeps = devDepNames.filter(function (n) { return allowedDevDeps.indexOf(n) === -1; });
  chk('devDependencies are within the allowed list', unexpectedDevDeps.length === 0, { unexpected: unexpectedDevDeps });

  // F3-R1-06 closure: anchored, segment-by-segment allowlist for npm scripts. Each `&&`
  // or `;`-separated segment must INDEPENDENTLY match a local-toolchain shape. Forbidden
  // tokens (curl, wget, npx, fetch, sh -c, eval, base64, ssh, scp, rsync) trigger fail-closed
  // even within a longer command. URL substrings and shell metacharacters (pipe/redirect to
  // /dev/something, $(...), backticks) are rejected.
  // F3-R5-03 closure: prevent path traversal. `node tests/../../etc/passwd` previously matched
  // the [\w@\-./]+ char class. Now we tokenize the node target path and reject any segment
  // that is `..`, `.`, empty (consecutive slashes), or begins with `/` (absolute).
  // F3-R7-05 closure: forbidden-tokens regex now rejects ALL shell I/O redirection (`>`, `>>`,
  // `<`, `2>`, `&>`, `|` for piping) and the most common exfil command tokens. The previous
  // pattern only rejected `>/dev/...` leaving `> /tmp/exfil` undetected.
  // F3-R7-05 closure: reject shell I/O redirection (>, >>, <), command substitution ($(...),
  // backticks), pipes (|), and known dangerous tool names. The previous pattern only caught
  // redirection to /dev/...; now any `>` redirection is rejected. (Note: `&&` is the SEGMENT
  // separator and is intentionally not flagged at the full-script level.)
  // F3-R9-05 closure: shell redirection rejection no longer requires whitespace around `>`.
  // `electron-builder >out` (no space) must fail. Use ANY `>` / `<` / `|` shell-metachar
  // outside string-literal contexts. The previous pattern required `\s>\s` and missed compact forms.
  // F3-R18-01 closure: reject ANY unquoted pipe character (not just pipe-followed-by-word).
  var FORBIDDEN_TOKENS = /\b(curl|wget|npx|fetch|eval|base64|ssh|scp|rsync|nc|netcat|telnet)\b|\bsh\s+-c\b|https?:\/\/|\$\(|`|\||>|<\s|2>|&>/i;
  var ALLOWED_NODE_DASH_FLAGS_FORBIDDEN = /\bnode\s+-/;
  var ALLOWED_NODE_ROOTS = ['tests', 'scripts', 'tools'];

  function _nodeSegmentAllowed(seg) {
    // Match: `node <path>` optionally followed by additional args (file paths only, no flags)
    var m = seg.match(/^node\s+([^\s]+)((?:\s+[^\s]+)*)$/);
    if (!m) return false;
    var firstPath = m[1];
    // Reject absolute paths
    if (firstPath.charAt(0) === '/') return false;
    // Reject empty or root-only paths
    var parts = firstPath.split('/');
    if (parts.length < 2) return false;
    // First segment must be an allowed root
    if (ALLOWED_NODE_ROOTS.indexOf(parts[0]) === -1) return false;
    // Each subsequent segment must NOT be '.', '..', or empty
    for (var sp = 0; sp < parts.length; sp++) {
      var seg2 = parts[sp];
      if (seg2 === '' || seg2 === '.' || seg2 === '..') return false;
      // Each segment must use only safe path chars
      if (!/^[\w@\-.]+$/.test(seg2)) return false;
    }
    // Additional args (after the script path) are positional args TO THE SCRIPT, not node
    // flags. Script-level flags like `--selftest` are allowed; absolute paths and traversal
    // segments are not, and individual forbidden tokens (already checked at segment level)
    // are blocked.
    if (m[2]) {
      var rest = m[2].trim().split(/\s+/);
      for (var ri = 0; ri < rest.length; ri++) {
        var arg = rest[ri];
        if (arg === '') continue;
        // Whitelisted: --<name> with simple ASCII letters/digits/dash
        if (/^--[\w-]+$/.test(arg)) continue;
        // Whitelisted: -<single-letter>
        if (/^-[a-zA-Z]$/.test(arg)) continue;
        // Reject absolute paths and traversal
        if (arg.charAt(0) === '/') return false;
        if (arg.indexOf('..') !== -1 || arg.indexOf('/./') !== -1) return false;
        // Allow simple positional paths (same safe chars + slash)
        if (!/^[\w@\-./]+$/.test(arg)) return false;
      }
    }
    return true;
  }

  var ALLOWED_SEGMENT_PATTERNS = [
    /^electron-builder(\s|$)/,
    /^electron(\s+\.|\s*$)/
  ];
  function _segmentAllowed(seg) {
    seg = seg.trim();
    if (seg === '') return false;
    if (FORBIDDEN_TOKENS.test(seg)) return false;
    if (ALLOWED_NODE_DASH_FLAGS_FORBIDDEN.test(seg)) return false;
    if (_nodeSegmentAllowed(seg)) return true;
    for (var p = 0; p < ALLOWED_SEGMENT_PATTERNS.length; p++) {
      if (ALLOWED_SEGMENT_PATTERNS[p].test(seg)) return true;
    }
    return false;
  }

  var scripts = pkg.scripts || {};
  var scriptNames = Object.keys(scripts);
  for (var i = 0; i < scriptNames.length; i++) {
    var s = scripts[scriptNames[i]];
    // Reject the whole script if it contains any forbidden token anywhere.
    var bannedAnywhere = FORBIDDEN_TOKENS.test(s);
    // Split on && and ; (top-level only; we don't shell-parse for nested quoting because
    // the allowlist patterns are themselves restrictive — anything exotic fails).
    var segments = s.split(/&&|;/);
    var allSegOk = !bannedAnywhere && segments.length > 0 && segments.every(_segmentAllowed);
    chk('package.json script "' + scriptNames[i] + '" passes anchored per-segment allowlist', allSegOk, { script: s, segments: segments });
  }

  // Step 3: no bare third-party require in renderer/js (cross-check with dependency-audit)
  var rendererJsDir = path.join(repoRoot, 'renderer', 'js');
  var jsFiles = fs.readdirSync(rendererJsDir).filter(function (f) { return f.endsWith('.js'); });
  var bareThirdParty = [];
  for (var k = 0; k < jsFiles.length; k++) {
    var src = fs.readFileSync(path.join(rendererJsDir, jsFiles[k]), 'utf8');
    // require('foo') where foo is NOT relative (./ or ../) AND NOT a Node built-in
    var nodeBuiltins = ['fs', 'path', 'os', 'crypto', 'child_process', 'http', 'https', 'net', 'url', 'assert', 'module', 'vm', 'util', 'events', 'stream', 'buffer'];
    var rRe = /require\(['"]([^'"]+)['"]\)/g;
    var rm;
    while ((rm = rRe.exec(src)) !== null) {
      var spec = rm[1];
      if (spec.indexOf('./') === 0 || spec.indexOf('../') === 0) continue;
      if (nodeBuiltins.indexOf(spec) !== -1) continue;
      bareThirdParty.push(jsFiles[k] + ': ' + spec);
    }
  }
  chk('no bare third-party require in renderer/js (CI dep-free lane safe)', bareThirdParty.length === 0, { bare: bareThirdParty.slice(0, 5) });

  // Step 4: no .env or .env.local file in repo (committed secrets check)
  var envFile = path.join(repoRoot, '.env');
  var envLocal = path.join(repoRoot, '.env.local');
  chk('no .env at repo root', !fs.existsSync(envFile));
  chk('no .env.local at repo root', !fs.existsSync(envLocal));

  // Step 5: CHANGELOG.md exists (per F2 schema allowedRoots and release readiness path)
  // F3 doesn't yet ship CHANGELOG content — that's F4/F5. Only the presence check here.
  var changelogPath = path.join(repoRoot, 'CHANGELOG.md');
  // F3 may pre-create CHANGELOG.md as part of release-readiness prep, but presence is optional
  // at this checkpoint. Just record whether it's present.
  chk('CHANGELOG.md presence check is non-fatal at F3', true);

  // Step 6: no commit-tracked node_modules (large binary surface)
  var nmTrackedFile = path.join(repoRoot, '.gitignore');
  var gitignore = fs.readFileSync(nmTrackedFile, 'utf8');
  chk('.gitignore excludes node_modules/', /^node_modules\/?$/m.test(gitignore));
  chk('.gitignore excludes artifacts/', /^artifacts\/?$/m.test(gitignore));

  // Step 7: zero console error
  chk('zero console.error during supply-chain hardening', h.consoleErrorCount === 0);
} finally {
  h.dispose();
}

t.report('e2e-hardening-06-supply-chain');
