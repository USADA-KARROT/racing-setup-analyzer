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

  // F3-R3-03 closure: also scan INLINE script bodies in renderer/index.html. The main app
  // module lives in a <script>...</script> block in the renderer document, which the previous
  // scanner missed. We extract every inline <script> body and treat each as a synthetic
  // "renderer-inline-N.js" source for the same DOM-sink rules.
  var indexHtmlRaw = fs.readFileSync(indexHtmlPath, 'utf8');
  function extractInlineScripts(html) {
    // F3-R6-03 closure: only scan executable JavaScript script blocks. Skip
    // application/json, importmap, application/ld+json, and other non-executable
    // data MIME types. Default (no `type` attribute) and explicit JS MIME types
    // are scanned. `type="module"` IS executable JS and IS scanned.
    var bodies = [];
    var re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var attrs = m[1] || '';
      // Skip external <script src="...">
      if (/\bsrc\s*=/.test(attrs)) continue;
      // Determine type. Default = JS executable.
      var typeMatch = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i);
      if (typeMatch) {
        var typ = typeMatch[1].toLowerCase().trim();
        // Allowed (executable JS) types: empty / module / text/javascript / application/javascript / application/ecmascript
        var isExecutableJs = (typ === '' || typ === 'module' || typ === 'text/javascript' || typ === 'application/javascript' || typ === 'application/ecmascript');
        if (!isExecutableJs) continue;
      }
      bodies.push(m[2]);
    }
    return bodies;
  }
  var inlineScripts = extractInlineScripts(indexHtmlRaw);
  chk('renderer/index.html inline scripts extracted for DOM-sink scan', inlineScripts.length >= 1, { inline_count: inlineScripts.length });
  // Treat each inline script as a synthetic file in the scanner pipeline.
  // F3-R8-03 closure: helper hoisted at file-block scope for use by both innerHTML/outerHTML
  // assignment scans and the x-html helper-call argument-provenance check.
  function isSafeStringLiteral(expr) {
    var e = expr.trim();
    if (e === "''" || e === '""' || e === '``') return true;
    if (/^"(?:[^"\\]|\\.)*"$/.test(e)) return true;
    if (/^'(?:[^'\\]|\\.)*'$/.test(e)) return true;
    if (/^`(?:[^`\\]|\\.)*`$/.test(e) && !/\$\{/.test(e)) return true;
    return false;
  }

  var allSources = []; // {name, src}
  for (var fi = 0; fi < files.length; fi++) {
    allSources.push({ name: files[fi], src: fs.readFileSync(path.join(rendererJsDir, files[fi]), 'utf8') });
  }
  for (var ii = 0; ii < inlineScripts.length; ii++) {
    allSources.push({ name: 'index.html-inline[' + ii + ']', src: inlineScripts[ii] });
  }

  // We don't ban innerHTML wholesale — Alpine.js + tailwind use it indirectly via x-html.
  // The F3 hardening is: NO production module assigns innerHTML/outerHTML to a variable
  // user-supplied value. We check that any innerHTML assignment in renderer/js is to a
  // STRING LITERAL (whitelisted) or to `''` (clearing).
  var unsafeInnerHtmlAssigns = [];
  for (var i = 0; i < allSources.length; i++) {
    var src = allSources[i].src;
    var srcName = allSources[i].name;
    // F3-R15-01 closure: strip JS comments BEFORE normalization so comment-separated dot-member
    // expressions (e.g., `element./* note */ innerHTML = X`) cannot disguise a sink.
    src = stripJsComments(src);
    // F3-R14-01 closure: also collapse newlines INSIDE member expressions. JavaScript allows
    // `element.\n  innerHTML = X` and `element\n  ['innerHTML'] = X` — both legal multi-line
    // splits that the line-based scanner would miss.
    var collapsed = src;
    // Collapse newlines around member-access dot/computed-access bracket
    collapsed = collapsed.replace(/\.\s*\r?\n\s*/g, '.');
    collapsed = collapsed.replace(/\s*\r?\n\s*\.\s*/g, '.');
    collapsed = collapsed.replace(/\s*\r?\n\s*(\[)/g, ' $1');
    // Collapse newlines around `=`
    collapsed = collapsed.replace(/\s*\r?\n\s*=\s*/g, ' = ');
    collapsed = collapsed.replace(/=\s*\r?\n\s*/g, '= ');
    var lines = collapsed.split(/\n/);
    for (var l = 0; l < lines.length; l++) {
      var line = lines[l];
      // F3-R9-04 closure: accept assignments terminated by `;`, `)`, end-of-line, OR end-of-input.
      // ASI (Automatic Semicolon Insertion) allows `element.innerHTML = userValue` without `;`.
      var m = line.match(/\.innerHTML\s*=\s*(.+?)\s*(?:[;)]|$)/);
      if (m) {
        var rhs = m[1].trim();
        if (rhs && !isSafeStringLiteral(rhs)) {
          unsafeInnerHtmlAssigns.push(srcName + ':' + (l + 1) + ' ' + line.trim().slice(0, 120));
        }
      }
      var mIcomp = line.match(/\[\s*['"`]innerHTML['"`]\s*\]\s*=\s*(.+?)\s*(?:[;)]|$)/);
      if (mIcomp) {
        var rhsIcomp = mIcomp[1].trim();
        if (rhsIcomp && !isSafeStringLiteral(rhsIcomp)) {
          unsafeInnerHtmlAssigns.push(srcName + ':' + (l + 1) + ' ["innerHTML"] = variable RHS (computed)');
        }
      }
    }
  }
  chk('no unsafe variable-RHS innerHTML in renderer/js AND inline scripts', unsafeInnerHtmlAssigns.length === 0, unsafeInnerHtmlAssigns.slice(0, 5));

  // F3-R4-02 closure: replace regex-based comment stripping with the same string/regex-literal-
  // aware lexical scanner used in hardening-01. A string literal containing "/*" before an
  // unsafe sink and a later string containing "*/" would otherwise delete the sink between them.
  function stripJsComments(src) {
    var out = '';
    var i = 0;
    var n = src.length;
    var inStr = false;
    var strCh = '';
    var lastSig = '';
    var lastWasRegexPrecedingKw = false;
    // F3-R16-01: template-literal `${...}` interpolation must be lexed as JS code.
    // Track template-stack depth; inside `${...}` we re-enter the main scanner state.
    var tplStack = []; // each entry: braceDepth (closes the interpolation when matched)
    var inTplInterp = false;
    var tplBraceDepth = 0;
    function couldStartRegex(prev) {
      if (lastWasRegexPrecedingKw) return true;
      if (prev === '') return true;
      if ('([{,;:!=?&|^~<>+-*%'.indexOf(prev) !== -1) return true;
      return false;
    }
    var REGEX_PRECEDING_KEYWORDS = ['return', 'throw', 'typeof', 'void', 'delete', 'case', 'yield', 'await', 'in', 'of', 'new', 'instanceof', 'do', 'else'];
    function readIdent(s, start) {
      var j = start;
      while (j < s.length && /[A-Za-z0-9_$]/.test(s.charAt(j))) j++;
      return s.slice(start, j);
    }
    while (i < n) {
      var ch = src.charAt(i);
      var nxt = i + 1 < n ? src.charAt(i + 1) : '';
      if (inStr) {
        // Inside a template literal, watch for `${` to enter an interpolation context.
        if (strCh === '`' && ch === '$' && nxt === '{') {
          out += ch + nxt;
          tplStack.push({ braceDepth: tplBraceDepth + 1 });
          inStr = false;
          inTplInterp = true;
          tplBraceDepth++;
          i += 2;
          continue;
        }
        if (ch === '\\' && i + 1 < n) { out += ch + nxt; i += 2; continue; }
        if (ch === strCh) { inStr = false; out += ch; i++; lastSig = ch; continue; }
        out += ch; i++; continue;
      }
      // Inside template interpolation, watch for `}` closing the interpolation back into the template.
      if (inTplInterp && ch === '{') { tplBraceDepth++; out += ch; i++; continue; }
      if (inTplInterp && ch === '}') {
        tplBraceDepth--;
        var top = tplStack[tplStack.length - 1];
        if (top && tplBraceDepth === top.braceDepth - 1) {
          // Back to template string body
          tplStack.pop();
          inTplInterp = tplStack.length > 0;
          inStr = true;
          strCh = '`';
          out += ch; i++;
          continue;
        }
        out += ch; i++; continue;
      }
      if (ch === '/' && nxt === '/') { while (i < n && src.charAt(i) !== '\n') i++; continue; }
      if (ch === '/' && nxt === '*') {
        i += 2;
        while (i < n && !(src.charAt(i) === '*' && i + 1 < n && src.charAt(i + 1) === '/')) i++;
        if (i < n) i += 2;
        continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        var ident = readIdent(src, i);
        out += ident;
        i += ident.length;
        lastWasRegexPrecedingKw = (REGEX_PRECEDING_KEYWORDS.indexOf(ident) !== -1);
        lastSig = ident.charAt(ident.length - 1);
        continue;
      }
      if (/[0-9]/.test(ch)) {
        var numStart = i;
        while (i < n && /[0-9.eE_xboBOXn+\-]/.test(src.charAt(i))) {
          var nc = src.charAt(i);
          if ((nc === '+' || nc === '-') && i > numStart && !/[eE]/.test(src.charAt(i - 1))) break;
          i++;
        }
        out += src.slice(numStart, i);
        lastWasRegexPrecedingKw = false;
        lastSig = src.charAt(i - 1);
        continue;
      }
      if (ch === '/' && couldStartRegex(lastSig)) {
        out += ch; i++;
        var inCharClass = false;
        while (i < n) {
          var rc = src.charAt(i);
          out += rc;
          if (rc === '\\' && i + 1 < n) { out += src.charAt(i + 1); i += 2; continue; }
          if (rc === '[') { inCharClass = true; i++; continue; }
          if (rc === ']' && inCharClass) { inCharClass = false; i++; continue; }
          if (rc === '/' && !inCharClass) { i++; break; }
          if (rc === '\n') { break; }
          i++;
        }
        while (i < n && /[gimsuyd]/.test(src.charAt(i))) { out += src.charAt(i); i++; }
        lastSig = '/';
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        inStr = true; strCh = ch; out += ch; i++;
        lastWasRegexPrecedingKw = false;
        continue;
      }
      out += ch;
      if (!/\s/.test(ch)) {
        lastSig = ch;
        lastWasRegexPrecedingKw = false;
      }
      i++;
    }
    return out;
  }

  // F3-R3-03 closure: run the same forbidden-API scan over inline scripts AND renderer/js files.
  var unsafeApis = [];
  for (var j = 0; j < allSources.length; j++) {
    var rawSrc = allSources[j].src;
    var srcName2 = allSources[j].name;
    var s = stripJsComments(rawSrc);

    // F3-R7-03 closure: also detect computed-member equivalents (element['innerHTML'] = ...,
    // document['write'](...), etc.).
    // (i) document.write / document.writeln — both dot AND computed forms
    if (/document\.write\s*\(/.test(s)) unsafeApis.push(srcName2 + ': document.write');
    if (/document\.writeln\s*\(/.test(s)) unsafeApis.push(srcName2 + ': document.writeln');
    if (/document\s*\[\s*['"`]write['"`]\s*\]\s*\(/.test(s)) unsafeApis.push(srcName2 + ': document["write"] (computed)');
    if (/document\s*\[\s*['"`]writeln['"`]\s*\]\s*\(/.test(s)) unsafeApis.push(srcName2 + ': document["writeln"] (computed)');

    // (ii) new Function( with any non-pure-string-literal argument
    var nfMatches = s.match(/new\s+Function\s*\([^)]*\)/g) || [];
    for (var nfi = 0; nfi < nfMatches.length; nfi++) {
      var args = nfMatches[nfi].replace(/^new\s+Function\s*\(/, '').replace(/\)$/, '').trim();
      if (args === '' || isSafeStringLiteral(args)) continue;
      unsafeApis.push(srcName2 + ': new Function with non-literal arg → ' + nfMatches[nfi].slice(0, 60));
    }

    // F3-R14-01: apply the SAME bidirectional collapse + member-expression normalization
    // to the outerHTML+computed scanner.
    var sCollapsed = s;
    sCollapsed = sCollapsed.replace(/\.\s*\r?\n\s*/g, '.');
    sCollapsed = sCollapsed.replace(/\s*\r?\n\s*\.\s*/g, '.');
    sCollapsed = sCollapsed.replace(/\s*\r?\n\s*(\[)/g, ' $1');
    sCollapsed = sCollapsed.replace(/\s*\r?\n\s*=\s*/g, ' = ');
    sCollapsed = sCollapsed.replace(/=\s*\r?\n\s*/g, '= ');
    var lines2 = sCollapsed.split(/\n/);
    for (var l2 = 0; l2 < lines2.length; l2++) {
      var line2 = lines2[l2];
      // F3-R9-04 closure: also accept end-of-line termination (ASI).
      var mO = line2.match(/\.outerHTML\s*=\s*(.+?)\s*(?:[;)]|$)/);
      if (mO) {
        var rhsO = mO[1].trim();
        if (rhsO && !isSafeStringLiteral(rhsO)) {
          unsafeApis.push(srcName2 + ':' + (l2 + 1) + ' outerHTML = variable RHS');
        }
      }
      var mOc = line2.match(/\[\s*['"`]outerHTML['"`]\s*\]\s*=\s*(.+?)\s*(?:[;)]|$)/);
      if (mOc) {
        var rhsOc = mOc[1].trim();
        if (rhsOc && !isSafeStringLiteral(rhsOc)) {
          unsafeApis.push(srcName2 + ':' + (l2 + 1) + ' ["outerHTML"] = variable RHS (computed)');
        }
      }
      var mIc = line2.match(/\[\s*['"`]innerHTML['"`]\s*\]\s*=\s*(.+?)\s*(?:[;)]|$)/);
      if (mIc) {
        var rhsIc = mIc[1].trim();
        if (rhsIc && !isSafeStringLiteral(rhsIc)) {
          unsafeApis.push(srcName2 + ':' + (l2 + 1) + ' ["innerHTML"] = variable RHS (computed)');
        }
      }
    }

    // (iv) insertAdjacentHTML with non-literal htmlText
    var iaMatches = s.match(/\.insertAdjacentHTML\s*\([^)]*\)/g) || [];
    for (var iai = 0; iai < iaMatches.length; iai++) {
      var iaArgs = iaMatches[iai].replace(/^\.insertAdjacentHTML\s*\(/, '').replace(/\)$/, '').trim();
      var depth = 0; var commaIdx = -1;
      for (var ic = 0; ic < iaArgs.length; ic++) {
        var ch = iaArgs.charAt(ic);
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') depth--;
        else if (ch === ',' && depth === 0) { commaIdx = ic; break; }
      }
      if (commaIdx === -1) { unsafeApis.push(srcName2 + ': malformed insertAdjacentHTML — ' + iaMatches[iai].slice(0, 60)); continue; }
      var textArg = iaArgs.slice(commaIdx + 1).trim();
      if (!isSafeStringLiteral(textArg)) {
        unsafeApis.push(srcName2 + ': insertAdjacentHTML with non-literal text arg → ' + iaMatches[iai].slice(0, 60));
      }
    }

    // (v) DOMParser.parseFromString — non-literal first arg
    if (/DOMParser\s*\(\s*\)/.test(s) || /new\s+DOMParser/.test(s)) {
      if (/\.parseFromString\s*\(\s*(?!['"`])/.test(s)) {
        unsafeApis.push(srcName2 + ': DOMParser.parseFromString with non-literal first arg');
      }
    }

    // (vi) setAttribute('on...', X) — direct event-handler attribute injection
    var saMatches = s.match(/\.setAttribute\s*\(\s*['"]on[a-z]+['"][^)]*\)/gi) || [];
    if (saMatches.length > 0) {
      unsafeApis.push(srcName2 + ': setAttribute("on*", ...) injection → ' + saMatches[0].slice(0, 60));
    }

    // (vii) Dynamic x-html attribute construction in inline scripts (setAttribute('x-html', X))
    var dxhMatches = s.match(/\.setAttribute\s*\(\s*['"]x-html['"][^)]*\)/gi) || [];
    if (dxhMatches.length > 0) {
      unsafeApis.push(srcName2 + ': dynamic x-html attribute construction → ' + dxhMatches[0].slice(0, 60));
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
  // F3-R7-04 closure: do NOT treat arbitrary function calls as safe. Maintain an EXPLICIT
  // allowlist of approved HTML-producing helpers. Generic identifiers like String(...) /
  // JSON.stringify(...) / Object(...) are NOT safe because they could route user-controlled
  // data into HTML. The current production renderer uses only: t, credBadge, tierBadge.
  // F3-R8-04 closure: allowlisted helpers must receive ONLY frozen-enum / string-literal /
  // bare known-safe-i18n-key arguments. A call like `credBadge(case.title)` would route
  // user-controlled data into HTML even though `credBadge` is allowlisted. Restrict each
  // helper to its known-safe argument shape:
  //   - t(<string-literal>) — i18n key; string literal only
  //   - credBadge(<string-literal>) — fixed badge label set
  //   - tierBadge(<string-literal>) — fixed tier name set
  var SAFE_XHTML_HELPERS = ['t', 'credBadge', 'tierBadge'];
  var xHtmlPatterns = [
    /x-html\s*=\s*"([\s\S]+?)"/g,
    /x-html\s*=\s*'([\s\S]+?)'/g,
    /x-html\s*=\s*([^\s>'"][^\s>]*)/g
  ];
  var unsafeXHtml = [];
  var xHtmlCount = 0;
  // F3-R10-02 closure: helper-specific argument rules. The `t()` translation helper RETURNS
  // its input unchanged when the i18n key is missing, so passing user-controlled property
  // chains would inject HTML. Restrict `t` to STRING-LITERAL keys only. Badge helpers
  // (credBadge/tierBadge) accept bare property accesses too (production usage).
  var HELPER_ARG_RULES = {
    t: 'literal-only',
    credBadge: 'literal-or-prop-or-ternary',
    tierBadge: 'literal-or-prop-or-ternary'
  };
  function isSafeHelperCall(expr) {
    var m = expr.match(/^([a-zA-Z_$][\w$]*)\s*\(([\s\S]*)\)\s*$/);
    if (!m) return false;
    if (SAFE_XHTML_HELPERS.indexOf(m[1]) === -1) return false;
    var helperName = m[1];
    var rule = HELPER_ARG_RULES[helperName];
    var argList = m[2].trim();
    if (argList === '') return true;
    // Split on top-level commas
    var args = [];
    var depth = 0;
    var inStr = false;
    var strCh = '';
    var segStart = 0;
    for (var ci = 0; ci <= argList.length; ci++) {
      var ch2 = ci < argList.length ? argList.charAt(ci) : ',';
      if (inStr) {
        if (ch2 === '\\') { ci++; continue; }
        if (ch2 === strCh) inStr = false;
        continue;
      }
      if (ch2 === '"' || ch2 === "'" || ch2 === '`') { inStr = true; strCh = ch2; continue; }
      if (ch2 === '(' || ch2 === '[' || ch2 === '{') depth++;
      else if (ch2 === ')' || ch2 === ']' || ch2 === '}') depth--;
      else if (ch2 === ',' && depth === 0) {
        args.push(argList.slice(segStart, ci).trim());
        segStart = ci + 1;
      }
    }
    // F3-R8-04 closure: every argument MUST be one of these safe shapes —
    //   (a) string literal (single/double quoted; backtick without ${...})
    //   (b) bare identifier or property access chain (e.g., c.tier, foo.bar.baz)
    //   No concatenation, no function calls, no template-with-interpolation.
    // The bare property-access carve-out reflects the existing production pattern where
    // tierBadge/credBadge receive enum-constrained values (e.g., c.tier in {physics,model,
    // heuristic}). The helpers themselves are pure functions of these enums plus i18n lookups.
    // F3-R12-02 closure: badge-helper args must come from an EXACT allowlist of
    // production-known enum-authoritative property chains. A bare-chain-allow rule lets
    // future contributors funnel user-typed fields (`case.title`) through approved helpers.
    // Exhaustive grep of all bare-chain args used by tierBadge / credBadge in renderer/index.html
    // at this SHA. Adding a new arg requires updating this allowlist (forces explicit review).
    var BADGE_ARG_ALLOWED_CHAINS = [
      'c.tier',
      'l',
      'analysisView.setupInputs.frontWheelRate.credibility',
      'analysisView.setupInputs.rearWheelRate.credibility',
      'analysisView.setupInputs.frontArb.credibility',
      'analysisView.setupInputs.rearArb.credibility'
    ];
    function isSafeArg(arg) {
      if (isSafeStringLiteral(arg)) return true;
      if (rule === 'literal-only') return false;
      // F3-R12-02: badge helpers — bare property chain ONLY if it's in the exact allowlist.
      if (BADGE_ARG_ALLOWED_CHAINS.indexOf(arg) !== -1) return true;
      // Ternary `<cond> ? <left> : <right>` where both branches are themselves safe args.
      // Use a depth-aware splitter so nested ternaries are handled correctly.
      var qIdx = -1;
      var depth = 0;
      var inStr = false;
      var strCh = '';
      for (var ti = 0; ti < arg.length; ti++) {
        var tc = arg.charAt(ti);
        if (inStr) {
          if (tc === '\\') { ti++; continue; }
          if (tc === strCh) inStr = false;
          continue;
        }
        if (tc === '"' || tc === "'" || tc === '`') { inStr = true; strCh = tc; continue; }
        if (tc === '(' || tc === '[' || tc === '{') depth++;
        else if (tc === ')' || tc === ']' || tc === '}') depth--;
        else if (tc === '?' && depth === 0) { qIdx = ti; break; }
      }
      if (qIdx === -1) return false;
      var cond = arg.slice(0, qIdx).trim();
      var afterQ = arg.slice(qIdx + 1);
      // Find matching colon at depth 0
      var cIdx = -1;
      depth = 0; inStr = false;
      for (var ti2 = 0; ti2 < afterQ.length; ti2++) {
        var tc2 = afterQ.charAt(ti2);
        if (inStr) {
          if (tc2 === '\\') { ti2++; continue; }
          if (tc2 === strCh) inStr = false;
          continue;
        }
        if (tc2 === '"' || tc2 === "'" || tc2 === '`') { inStr = true; strCh = tc2; continue; }
        if (tc2 === '(' || tc2 === '[' || tc2 === '{') depth++;
        else if (tc2 === ')' || tc2 === ']' || tc2 === '}') depth--;
        else if (tc2 === ':' && depth === 0) { cIdx = ti2; break; }
      }
      if (cIdx === -1) return false;
      var lhs = afterQ.slice(0, cIdx).trim();
      var rhs = afterQ.slice(cIdx + 1).trim();
      // Condition can be any boolean expression (we already verified it's not a function-call
      // chain that constructs HTML; the OUTPUT of the ternary is what matters). Require LHS
      // and RHS to be safe args themselves.
      return isSafeArg(lhs) && isSafeArg(rhs);
    }
    for (var ai = 0; ai < args.length; ai++) {
      if (!isSafeArg(args[ai])) return false;
    }
    return true;
  }
  for (var xpi = 0; xpi < xHtmlPatterns.length; xpi++) {
    var pat = xHtmlPatterns[xpi];
    var m;
    while ((m = pat.exec(indexSrc)) !== null) {
      xHtmlCount++;
      var rhs = m[1].trim();
      // Acceptable shapes:
      //   1. Direct call to an allowlisted helper: t(...) / credBadge(...) / tierBadge(...)
      //   2. String literal (rare)
      //   3. Ternary whose BOTH branches are either helper-calls or string literals
      // F3-R11-01 closure: route ALL "is this a safe string" decisions through
      // isSafeStringLiteral, which correctly rejects backtick template literals containing
      // `${...}` interpolation. The previous loose /^['"`].*['"`]$/ regex accepted
      // `${case.title}` interpolations.
      var safe = false;
      if (isSafeStringLiteral(rhs)) safe = true;
      else if (isSafeHelperCall(rhs)) safe = true;
      else {
        var ternMatch = rhs.match(/^[\s\S]+?\?\s*([\s\S]+?)\s*:\s*([\s\S]+?)$/);
        if (ternMatch) {
          var lhs = ternMatch[1].trim();
          var rhs2 = ternMatch[2].trim();
          var lhsOk = isSafeHelperCall(lhs) || isSafeStringLiteral(lhs);
          var rhsOk = isSafeHelperCall(rhs2) || isSafeStringLiteral(rhs2);
          if (lhsOk && rhsOk) safe = true;
        }
      }
      if (!safe) unsafeXHtml.push(rhs.slice(0, 80));
    }
  }
  chk('every x-html RHS is a call to an ALLOWLISTED helper (t/credBadge/tierBadge) or a string literal', unsafeXHtml.length === 0, { count: xHtmlCount, unsafe_examples: unsafeXHtml.slice(0, 3) });

  // Step 4: i18n interpolation safety — no `t('key', userValue)` shapes that re-template
  // (the existing tCode/tErr helpers from R3.0E i18n parity scan are validated separately).
  chk('renderer index.html uses Alpine.js x-data app() pattern', /x-data\s*=\s*"app\(\)"/.test(indexSrc));

  // Step 5: zero console error
  chk('zero console.error during XSS hardening', h.consoleErrorCount === 0);
} finally {
  h.dispose();
}

t.report('e2e-hardening-05-xss-injection');
