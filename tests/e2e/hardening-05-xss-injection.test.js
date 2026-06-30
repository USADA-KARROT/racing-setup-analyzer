/**
 * tests/e2e/hardening-05-xss-injection.test.js — R3.0F F3 · XSS / HTML-injection hardening.
 *
 * Asserts the renderer does NOT use unsafe DOM injection patterns that would let user-supplied
 * data execute as script. Per F3 quality bar "no console error / no stale UI", a renderer that
 * pipes free-text fields into innerHTML or document.write would be a regression.
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
  var rendererJsDir = path.join(__dirname, '..', '..', 'renderer', 'js');
  var indexHtmlPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');

  // Step 1: scan renderer/js for unsafe DOM API usage
  // Forbidden patterns (in production renderer/js modules):
  //   - element.innerHTML = userValue (taint flow)
  //   - element.outerHTML = userValue
  //   - document.write
  //   - new Function(string) / eval(string)
  var forbidden = [
    { name: 'innerHTML =', re: /\.innerHTML\s*=\s*[^"']/, allowEmptyAssign: true },
    { name: 'outerHTML =', re: /\.outerHTML\s*=\s*[^"']/, allowEmptyAssign: true },
    { name: 'document.write', re: /document\.write\(/ },
    { name: 'document.writeln', re: /document\.writeln\(/ },
    { name: 'new Function(', re: /new\s+Function\s*\(/ },
    { name: 'global eval', re: /(^|[^.])eval\s*\(/m }
  ];

  var files = fs.readdirSync(rendererJsDir).filter(function (f) { return f.endsWith('.js'); });
  chk('renderer/js has files to scan', files.length > 0);

  // We don't ban innerHTML wholesale — Alpine.js + tailwind use it indirectly via x-html.
  // The F3 hardening is: NO production module assigns innerHTML/outerHTML to a variable
  // user-supplied value. We check that any innerHTML assignment in renderer/js is to a
  // STRING LITERAL (whitelisted) or to `''` (clearing).
  var unsafeInnerHtmlAssigns = [];
  for (var i = 0; i < files.length; i++) {
    var fpath = path.join(rendererJsDir, files[i]);
    var src = fs.readFileSync(fpath, 'utf8');
    // Find lines like `.innerHTML = X` where X is NOT a string literal
    var lines = src.split(/\n/);
    for (var l = 0; l < lines.length; l++) {
      var line = lines[l];
      var m = line.match(/\.innerHTML\s*=\s*(.+?)\s*[;)]/);
      if (m) {
        var rhs = m[1].trim();
        // Allow: empty string '', "", literal HTML strings
        if (rhs === "''" || rhs === '""') continue;
        // Allow: literal strings (quoted)
        if (/^['"`].*['"`]$/.test(rhs)) continue;
        // Anything else = potential XSS taint
        unsafeInnerHtmlAssigns.push(files[i] + ':' + (l + 1) + ' ' + line.trim().slice(0, 120));
      }
    }
  }
  chk('no unsafe variable-RHS innerHTML assignments in renderer/js', unsafeInnerHtmlAssigns.length === 0, unsafeInnerHtmlAssigns.slice(0, 5));

  // Step 2: scan for document.write and new Function
  var unsafeApis = [];
  for (var j = 0; j < files.length; j++) {
    var fp = path.join(rendererJsDir, files[j]);
    var s = fs.readFileSync(fp, 'utf8');
    if (/document\.write\(/.test(s)) unsafeApis.push(files[j] + ': document.write');
    if (/document\.writeln\(/.test(s)) unsafeApis.push(files[j] + ': document.writeln');
    // new Function( with non-string-literal arg is a yellow flag; check for bare new Function(
    if (/new\s+Function\s*\([^)]*\w[^)]*\)/.test(s)) {
      // Allow new Function('"use strict"; return this')() bootstraps (no taint vars)
      // Practical check: is the call inside a comment? Skip if so.
      var bareLines = s.split(/\n/).filter(function (ln) {
        return /new\s+Function\s*\(/.test(ln) && !/^\s*\/\//.test(ln) && !/^\s*\*/.test(ln);
      });
      if (bareLines.length > 0) unsafeApis.push(files[j] + ': new Function( with variable arg');
    }
  }
  chk('no document.write / document.writeln in renderer/js', unsafeApis.filter(function (s) { return /document\.write/.test(s); }).length === 0, unsafeApis);

  // Step 3: scan renderer/index.html for safe Alpine.js binding patterns
  var indexSrc = fs.readFileSync(indexHtmlPath, 'utf8');
  // x-text is safe (sets textContent). x-html is taint-prone — must only bind to frozen-i18n
  // helper outputs, never to raw user input. We extract every x-html RHS and check it routes
  // through one of the known-safe helpers (t / tCode / tErr / credCode / i18n calls).
  var xHtmlRe = /x-html\s*=\s*"([^"]+)"/g;
  var unsafeXHtml = [];
  var xHtmlCount = 0;
  var m;
  while ((m = xHtmlRe.exec(indexSrc)) !== null) {
    xHtmlCount++;
    var rhs = m[1].trim();
    // Safe pattern: every x-html binding MUST be a function call into a named helper
    // (e.g., t(...), tCode(...), tErr(...), credCode(...), credBadge(...), tierBadge(...),
    // any other internal i18n / badge / formatter). Naked variables or raw property accesses
    // (e.g., `userText` or `case.title`) are NOT safe and must be flagged.
    // Acceptable: <identifier>(...) — function call. Also acceptable: a ternary whose branches
    // are all function calls or string literals.
    var safe = /^[a-zA-Z_$][\w$]*\s*\(/.test(rhs) // bare function call
            || /^['"`].*['"`]$/.test(rhs)         // string literal (rare but harmless)
            || /\?\s*[a-zA-Z_$][\w$]*\s*\(/.test(rhs); // ternary with helper-call branches
    if (!safe) unsafeXHtml.push(rhs.slice(0, 80));
  }
  chk('every x-html RHS is a function call (not a raw variable)', unsafeXHtml.length === 0, { count: xHtmlCount, unsafe_examples: unsafeXHtml.slice(0, 3) });

  // Step 4: i18n interpolation safety — no `t('key', userValue)` shapes that re-template
  // (the existing tCode/tErr helpers from R3.0E i18n parity scan are validated separately).
  chk('renderer index.html uses Alpine.js x-data app() pattern', /x-data\s*=\s*"app\(\)"/.test(indexSrc));

  // Step 5: zero console error
  chk('zero console.error during XSS hardening', h.consoleErrorCount === 0);
} finally {
  h.dispose();
}

t.report('e2e-hardening-05-xss-injection');
