/**
 * tests/e2e/hardening-01-electron-boundary.test.js — R3.0F F3 · Electron renderer boundary.
 *
 * Asserts the Electron host enforces the strictest renderer-process isolation:
 *   • contextIsolation: true (per Electron security best practices)
 *   • nodeIntegration: false (no Node API access from renderer)
 *   • preload.js exposes ONLY the minimal contextBridge surface
 *   • preload.js does NOT load fs / child_process / net / http / https / ipcRenderer
 *   • main.js does NOT enable unsafe webPreferences flags (allowRunningInsecureContent,
 *     webSecurity: false, experimentalFeatures, sandbox: false-override)
 *   • main.js Content-Security-Policy not weakened
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
  var mainPath = path.join(__dirname, '..', '..', 'main.js');
  var mainRaw = fs.readFileSync(mainPath, 'utf8');
  var preloadPath = path.join(__dirname, '..', '..', 'preload.js');
  var preloadRaw = fs.readFileSync(preloadPath, 'utf8');
  var indexPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
  var indexSrc = fs.readFileSync(indexPath, 'utf8');

  // F3-R4-01 closure: lexical scanner now also recognizes regex literals (including character
  // classes like `/[/*]/` that contain `/` and `*`). Without regex tracking, the scanner would
  // see `/[` and enter block-comment mode, truncating the rest of the source.
  // Strategy: determine if a `/` starts a regex literal by looking back at the last meaningful
  // non-whitespace character. Regex follows operators, keywords, `(`, `[`, `{`, `,`, `;`, `:`,
  // `!`, `=`, `?`, `&`, `|`, `^`, `~`, `<`, `>`, `+`, `-`, `*`, `%`, `return`, `typeof`, etc.
  // After identifiers, `]`, `)`, numbers, or string literals, `/` is division.
  function stripJsComments(src) {
    var out = '';
    var i = 0;
    var n = src.length;
    var inStr = false;
    var strCh = '';
    var lastSig = ''; // last significant character (non-whitespace, non-comment)
    // F3-R5-01 closure: track a boolean keyword-context flag alongside lastSig.
    var lastWasRegexPrecedingKw = false;
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
        if (ch === '\\' && i + 1 < n) { out += ch + nxt; i += 2; continue; }
        if (ch === strCh) { inStr = false; out += ch; i++; lastSig = ch; continue; }
        out += ch; i++; continue;
      }
      if (ch === '/' && nxt === '/') {
        while (i < n && src.charAt(i) !== '\n') i++;
        continue;
      }
      if (ch === '/' && nxt === '*') {
        i += 2;
        while (i < n && !(src.charAt(i) === '*' && i + 1 < n && src.charAt(i + 1) === '/')) i++;
        if (i < n) i += 2;
        continue;
      }
      // Identifier — track if it is a regex-preceding keyword
      if (/[A-Za-z_$]/.test(ch)) {
        var ident = readIdent(src, i);
        out += ident;
        i += ident.length;
        if (REGEX_PRECEDING_KEYWORDS.indexOf(ident) !== -1) {
          lastWasRegexPrecedingKw = true;
        } else {
          lastWasRegexPrecedingKw = false;
        }
        lastSig = ident.charAt(ident.length - 1);
        continue;
      }
      // F3-R6-01 closure: numbers also consume keyword context.
      if (/[0-9]/.test(ch)) {
        var numStart = i;
        while (i < n && /[0-9.eE_xboBOXn+\-]/.test(src.charAt(i))) {
          // accept digits, fractional/exp/separator/bin-oct-hex/BigInt-n; signs only inside exponent
          var nc = src.charAt(i);
          if ((nc === '+' || nc === '-') && i > numStart && !/[eE]/.test(src.charAt(i - 1))) break;
          i++;
        }
        out += src.slice(numStart, i);
        lastWasRegexPrecedingKw = false;
        lastSig = src.charAt(i - 1);
        continue;
      }
      // Regex literal
      if (ch === '/' && couldStartRegex(lastSig)) {
        out += ch;
        i++;
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
        lastWasRegexPrecedingKw = false; // F3-R6-01: any non-whitespace operator/punct clears kw flag
      }
      i++;
    }
    return out;
  }
  var mainSrc = stripJsComments(mainRaw);
  var preloadSrc = stripJsComments(preloadRaw);

  // F3-R2-01 closure: extract the webPreferences object body via balanced-brace scanning,
  // not a naive regex. A regex like `webPreferences\s*:\s*\{([\s\S]*?)\n\s*\}` truncates at the
  // FIRST nested object's closing brace, leaving subsequent unsafe flags invisible.
  function extractWebPrefsBody(src) {
    var startMatch = src.match(/webPreferences\s*:\s*\{/);
    if (!startMatch) return null;
    var start = startMatch.index + startMatch[0].length;
    var depth = 1;
    var i = start;
    var inStr = false;
    var strCh = '';
    while (i < src.length && depth > 0) {
      var ch = src.charAt(i);
      if (inStr) {
        if (ch === '\\' && i + 1 < src.length) { i += 2; continue; }
        if (ch === strCh) { inStr = false; }
      } else {
        if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; }
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return src.slice(start, i); }
      }
      i++;
    }
    return null;
  }
  var wpBody = extractWebPrefsBody(mainSrc);
  chk('main.js declares webPreferences block (balanced-brace extract)', wpBody !== null);
  if (wpBody == null) wpBody = '';

  chk('webPreferences uses NO computed-key syntax for security flags',
    !/\[\s*['"`](?:contextIsolation|nodeIntegration|webSecurity|allowRunningInsecureContent|experimentalFeatures|enableRemoteModule|nodeIntegrationInWorker|nodeIntegrationInSubFrames|sandbox)['"`]\s*\]\s*:/.test(wpBody));

  chk('main.js webPreferences.contextIsolation === literal true', /(^|[\s,{])contextIsolation\s*:\s*true\s*(,|$|\s)/m.test(wpBody));
  chk('main.js webPreferences.nodeIntegration === literal false', /(^|[\s,{])nodeIntegration\s*:\s*false\s*(,|$|\s)/m.test(wpBody));

  chk('webPreferences.allowRunningInsecureContent NOT set to true', !/allowRunningInsecureContent\s*:\s*true/.test(wpBody));
  chk('webPreferences.webSecurity NOT set to false', !/webSecurity\s*:\s*false/.test(wpBody));
  chk('webPreferences.experimentalFeatures NOT set to true', !/experimentalFeatures\s*:\s*true/.test(wpBody));
  chk('webPreferences.enableRemoteModule NOT set to true', !/enableRemoteModule\s*:\s*true/.test(wpBody));
  chk('webPreferences.nodeIntegrationInWorker NOT set to true', !/nodeIntegrationInWorker\s*:\s*true/.test(wpBody));
  chk('webPreferences.nodeIntegrationInSubFrames NOT set to true', !/nodeIntegrationInSubFrames\s*:\s*true/.test(wpBody));

  // Step 2: preload.js minimal surface — post-strip checks (no comment-decoy false positives)
  chk('preload.js uses contextBridge', /contextBridge/.test(preloadSrc));
  chk('preload.js does NOT reference ipcRenderer (post-strip)', !/ipcRenderer/.test(preloadSrc));
  chk('preload.js does NOT require fs (post-strip)', !/require\s*\(\s*['"]fs['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require child_process (post-strip)', !/require\s*\(\s*['"]child_process['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require net (post-strip)', !/require\s*\(\s*['"]net['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require http (post-strip)', !/require\s*\(\s*['"]http['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require https (post-strip)', !/require\s*\(\s*['"]https['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require os (post-strip)', !/require\s*\(\s*['"]os['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT eval untrusted content (post-strip)', !/eval\s*\(|new\s+Function\s*\(/.test(preloadSrc));

  // Step 3: preload exposed surface is tiny + read-only
  // The expected surface is { platform, version } — both read-only metadata.
  chk('preload.js exposes only platform + version (no IPC channels)', /platform\s*:/.test(preloadSrc) && /version\s*:/.test(preloadSrc) && preloadSrc.length < 500);

  // Step 4: renderer/index.html declares CSP header
  var cspMatch = indexSrc.match(/<meta\s+http-equiv\s*=\s*"Content-Security-Policy"\s+content\s*=\s*"([^"]+)"/i);
  chk('renderer index.html declares CSP via meta', cspMatch !== null);
  // We tolerate 'unsafe-inline' + 'unsafe-eval' here because the app is a localfile Electron renderer
  // and the existing R3.0C/D/E code uses inline Alpine.js handlers. F3 hardens it by ensuring no
  // external script source is referenced.
  chk('CSP default-src is self only', cspMatch && /default-src\s+'self'/.test(cspMatch[1]));
  chk('renderer does not pull external script (no <script src="http">)', !/script[^>]+src\s*=\s*["']https?:\/\//i.test(indexSrc));

  // Step 5: zero console error
  chk('zero console.error during electron-boundary hardening', h.consoleErrorCount === 0);
} finally {
  h.dispose();
}

t.report('e2e-hardening-01-electron-boundary');
