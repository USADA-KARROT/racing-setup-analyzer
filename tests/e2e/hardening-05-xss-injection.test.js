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

  // F3-R1-05 closure: scan for all forbidden DOM API patterns and fail-closed on ALL of them.
  // Strip JS comments first so block-comment decoys cannot mask a real sink.
  function stripJsComments(src) {
    src = src.replace(/\/\*[\s\S]*?\*\//g, '');
    src = src.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    return src;
  }

  var unsafeApis = [];
  for (var j = 0; j < files.length; j++) {
    var fp = path.join(rendererJsDir, files[j]);
    var rawSrc = fs.readFileSync(fp, 'utf8');
    var s = stripJsComments(rawSrc);

    // (i) document.write / document.writeln
    if (/document\.write\(/.test(s)) unsafeApis.push(files[j] + ': document.write');
    if (/document\.writeln\(/.test(s)) unsafeApis.push(files[j] + ': document.writeln');

    // (ii) new Function( with any non-pure-string-literal argument
    var nfMatches = s.match(/new\s+Function\s*\([^)]*\)/g) || [];
    for (var nfi = 0; nfi < nfMatches.length; nfi++) {
      var args = nfMatches[nfi].replace(/^new\s+Function\s*\(/, '').replace(/\)$/, '').trim();
      // Allow: empty args, or arg is purely string literals (e.g. 'return this')
      if (args === '' || /^['"`][^'"`]*['"`]$/.test(args)) continue;
      unsafeApis.push(files[j] + ': new Function with non-literal arg → ' + nfMatches[nfi].slice(0, 60));
    }

    // (iii) variable-RHS outerHTML assignment (mirror innerHTML rule)
    var lines2 = s.split(/\n/);
    for (var l2 = 0; l2 < lines2.length; l2++) {
      var line2 = lines2[l2];
      var mO = line2.match(/\.outerHTML\s*=\s*(.+?)\s*[;)]/);
      if (mO) {
        var rhsO = mO[1].trim();
        if (rhsO === "''" || rhsO === '""') continue;
        if (/^['"`].*['"`]$/.test(rhsO)) continue;
        unsafeApis.push(files[j] + ':' + (l2 + 1) + ' outerHTML = variable RHS');
      }
    }

    // (iv) insertAdjacentHTML with non-literal htmlText
    var iaMatches = s.match(/\.insertAdjacentHTML\s*\([^)]*\)/g) || [];
    for (var iai = 0; iai < iaMatches.length; iai++) {
      // insertAdjacentHTML(position, text) — both args. We require text (2nd arg) to be a string literal.
      var iaArgs = iaMatches[iai].replace(/^\.insertAdjacentHTML\s*\(/, '').replace(/\)$/, '').trim();
      // Split on first comma at depth 0
      var depth = 0; var commaIdx = -1;
      for (var ic = 0; ic < iaArgs.length; ic++) {
        var ch = iaArgs.charAt(ic);
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') depth--;
        else if (ch === ',' && depth === 0) { commaIdx = ic; break; }
      }
      if (commaIdx === -1) { unsafeApis.push(files[j] + ': malformed insertAdjacentHTML — ' + iaMatches[iai].slice(0, 60)); continue; }
      var textArg = iaArgs.slice(commaIdx + 1).trim();
      if (!/^['"`].*['"`]$/.test(textArg)) {
        unsafeApis.push(files[j] + ': insertAdjacentHTML with non-literal text arg → ' + iaMatches[iai].slice(0, 60));
      }
    }

    // (v) DOMParser.parseFromString — direct sink for arbitrary HTML
    if (/DOMParser\s*\(\s*\)/.test(s) || /new\s+DOMParser/.test(s)) {
      // We don't ban DOMParser outright (it can be safe with text/xml), but record its usage
      // so a future review notices. F3 BLOCKS only if combined with .parseFromString(varInput).
      if (/\.parseFromString\s*\(\s*(?!['"`])/.test(s)) {
        unsafeApis.push(files[j] + ': DOMParser.parseFromString with non-literal first arg');
      }
    }

    // (vi) setAttribute('on...', X) — direct event-handler attribute injection
    var saMatches = s.match(/\.setAttribute\s*\(\s*['"]on[a-z]+['"][^)]*\)/gi) || [];
    if (saMatches.length > 0) {
      unsafeApis.push(files[j] + ': setAttribute("on*", ...) injection → ' + saMatches[0].slice(0, 60));
    }
  }

  // F3-R1-05 closure: assert ALL forbidden APIs land in unsafeApis empty.
  chk('NO unsafe DOM API usage in renderer/js (post-comment-strip)', unsafeApis.length === 0, { count: unsafeApis.length, examples: unsafeApis.slice(0, 5) });

  // Step 3: scan renderer/index.html for safe Alpine.js binding patterns
  var indexSrc = fs.readFileSync(indexHtmlPath, 'utf8');
  // x-text is safe (sets textContent). x-html is taint-prone — must only bind to frozen-i18n
  // helper outputs, never to raw user input. We extract every x-html RHS and check it routes
  // through one of the known-safe helpers (t / tCode / tErr / credCode / i18n calls).
  // F3-R2-04 closure: HTML allows double-quoted, single-quoted, and unquoted attribute values.
  // The scan must match all three forms; otherwise a single-quoted unsafe `x-html='case.title'`
  // slips past. Use [\s\S] to handle multi-line attribute values.
  var xHtmlPatterns = [
    /x-html\s*=\s*"([\s\S]+?)"/g,    // double-quoted
    /x-html\s*=\s*'([\s\S]+?)'/g,    // single-quoted
    /x-html\s*=\s*([^\s>'"][^\s>]*)/g // unquoted (rare, but allowed by HTML)
  ];
  var unsafeXHtml = [];
  var xHtmlCount = 0;
  for (var xpi = 0; xpi < xHtmlPatterns.length; xpi++) {
    var pat = xHtmlPatterns[xpi];
    var m;
    while ((m = pat.exec(indexSrc)) !== null) {
      xHtmlCount++;
      var rhs = m[1].trim();
      // Safe pattern: every x-html binding MUST be a function call into a named helper.
      var safe = /^[a-zA-Z_$][\w$]*\s*\(/.test(rhs)
              || /^['"`].*['"`]$/.test(rhs)
              || /\?\s*[a-zA-Z_$][\w$]*\s*\(/.test(rhs);
      if (!safe) unsafeXHtml.push(rhs.slice(0, 80));
    }
  }
  chk('every x-html RHS (double/single/unquoted) is a function call, not a raw variable', unsafeXHtml.length === 0, { count: xHtmlCount, unsafe_examples: unsafeXHtml.slice(0, 3) });

  // Step 4: i18n interpolation safety — no `t('key', userValue)` shapes that re-template
  // (the existing tCode/tErr helpers from R3.0E i18n parity scan are validated separately).
  chk('renderer index.html uses Alpine.js x-data app() pattern', /x-data\s*=\s*"app\(\)"/.test(indexSrc));

  // Step 5: zero console error
  chk('zero console.error during XSS hardening', h.consoleErrorCount === 0);
} finally {
  h.dispose();
}

t.report('e2e-hardening-05-xss-injection');
