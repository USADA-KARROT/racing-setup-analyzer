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

  // F3-R7-01 closure: enumerate ALL `webPreferences: { ... }` occurrences in main.js, not just
  // the first one. Multiple BrowserWindow constructors must each pass the security audit.
  function extractAllWebPrefsBodies(src) {
    var bodies = [];
    var startIdx = 0;
    while (true) {
      var sub = src.slice(startIdx);
      var startMatch = sub.match(/webPreferences\s*:\s*\{/);
      if (!startMatch) break;
      var absStart = startIdx + startMatch.index + startMatch[0].length;
      var depth = 1;
      var i = absStart;
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
          else if (ch === '}') { depth--; if (depth === 0) { bodies.push(src.slice(absStart, i)); break; } }
        }
        i++;
      }
      startIdx = i + 1;
      if (startIdx >= src.length) break;
    }
    return bodies;
  }
  var wpBodies = extractAllWebPrefsBodies(mainSrc);
  chk('main.js declares at least one webPreferences block', wpBodies.length >= 1, { count: wpBodies.length });

  for (var wpi = 0; wpi < wpBodies.length; wpi++) {
    var wpBody = wpBodies[wpi];
    var lbl = 'webPreferences[' + wpi + ']';
    chk(lbl + ' uses NO computed-key syntax for security flags',
      !/\[\s*['"`](?:contextIsolation|nodeIntegration|webSecurity|allowRunningInsecureContent|experimentalFeatures|enableRemoteModule|nodeIntegrationInWorker|nodeIntegrationInSubFrames|sandbox)['"`]\s*\]\s*:/.test(wpBody));

    // F3-R9-01 closure: reject any spread `...` inside webPreferences. A spread can carry
    // unsafe overrides that the static-flag audit cannot see.
    chk(lbl + ' uses NO spread operator', !/\.\.\./.test(wpBody));

    chk(lbl + '.contextIsolation === literal true', /(^|[\s,{])contextIsolation\s*:\s*true\s*(,|$|\s)/m.test(wpBody));
    chk(lbl + '.nodeIntegration === literal false', /(^|[\s,{])nodeIntegration\s*:\s*false\s*(,|$|\s)/m.test(wpBody));

    // F3-R10-01 closure: reject any unsafe redeclaration. JS uses the LAST value for duplicate
    // keys; a contributor leaving both `contextIsolation: true` and later `contextIsolation: false`
    // would silently flip the effective value. Reject ANY occurrence of the unsafe literal +
    // assert exactly ONE occurrence of each required key.
    chk(lbl + ' has NO contextIsolation: false anywhere', !/contextIsolation\s*:\s*false/.test(wpBody));
    chk(lbl + ' has NO nodeIntegration: true anywhere', !/nodeIntegration\s*:\s*true/.test(wpBody));
    var ciCount = (wpBody.match(/(^|[\s,{])contextIsolation\s*:/g) || []).length;
    var niCount = (wpBody.match(/(^|[\s,{])nodeIntegration\s*:/g) || []).length;
    chk(lbl + ' declares contextIsolation EXACTLY ONCE', ciCount === 1, { count: ciCount });
    chk(lbl + ' declares nodeIntegration EXACTLY ONCE', niCount === 1, { count: niCount });

    chk(lbl + '.allowRunningInsecureContent NOT set to true', !/allowRunningInsecureContent\s*:\s*true/.test(wpBody));
    chk(lbl + '.webSecurity NOT set to false', !/webSecurity\s*:\s*false/.test(wpBody));
    chk(lbl + '.experimentalFeatures NOT set to true', !/experimentalFeatures\s*:\s*true/.test(wpBody));
    chk(lbl + '.enableRemoteModule NOT set to true', !/enableRemoteModule\s*:\s*true/.test(wpBody));
    chk(lbl + '.nodeIntegrationInWorker NOT set to true', !/nodeIntegrationInWorker\s*:\s*true/.test(wpBody));
    chk(lbl + '.nodeIntegrationInSubFrames NOT set to true', !/nodeIntegrationInSubFrames\s*:\s*true/.test(wpBody));
    // F3-R8-01 closure: sandbox must NOT be explicitly disabled. If the key is present, it
    // must be set to literal `true`. If absent, Electron's default (sandbox enabled when
    // contextIsolation:true) applies.
    chk(lbl + '.sandbox NOT set to false', !/(^|[\s,{])sandbox\s*:\s*false\s*(,|$|\s)/m.test(wpBody));
    if (/(^|[\s,{])sandbox\s*:/.test(wpBody)) {
      chk(lbl + '.sandbox (when set) === literal true', /(^|[\s,{])sandbox\s*:\s*true\s*(,|$|\s)/m.test(wpBody));
    }
  }

  // H1: renderer version-reporting honesty — api.js must never fabricate a version.
  var apiSrc = stripJsComments(fs.readFileSync(path.join(__dirname, '..', '..', 'renderer', 'js', 'api.js'), 'utf8'));
  chk('api.js has NO fabricated 1.0.0 version literal', !/['"`]1\.0\.0['"`]/.test(apiSrc));
  chk('api.js defaults version reporting to the literal unavailable', /_appVersion\s*:\s*['"`]unavailable['"`]/.test(apiSrc));
  chk('api.js never reads a synchronous electronAPI.version field (pre-H1 shape)', !/electronAPI\s*\.\s*version\b/.test(apiSrc));
  chk('api.js resolves the version via electronAPI.getAppVersion()', /electronAPI\s*\.\s*getAppVersion\s*\(/.test(apiSrc));
  chk('api.js missing-bridge path is observable (console.warn)', /console\.warn\([^)]*electronAPI/.test(apiSrc));

  // H1: main.js IPC surface — exactly ONE allowlisted handle() on the constant
  // channel, removeHandler-first (idempotent double-registration guard), and no
  // generic/dynamic channel registration anywhere.
  var handleCalls = mainSrc.match(/ipcMain\s*\.\s*handle\s*\(/g) || [];
  chk('main.js registers EXACTLY one ipcMain.handle', handleCalls.length === 1, { count: handleCalls.length });
  chk('main.js handle uses the APP_VERSION_CHANNEL constant', /ipcMain\s*\.\s*handle\s*\(\s*APP_VERSION_CHANNEL\s*,/.test(mainSrc));
  chk('main.js channel constant = app:get-version', /APP_VERSION_CHANNEL\s*=\s*['"`]app:get-version['"`]/.test(mainSrc));
  chk('main.js removeHandler-first double-registration guard', /ipcMain\s*\.\s*removeHandler\s*\(\s*APP_VERSION_CHANNEL\s*\)/.test(mainSrc));
  chk('main.js handler returns app.getVersion() (single version authority)', /handle\s*\(\s*APP_VERSION_CHANNEL\s*,\s*\(\s*\)\s*=>\s*app\.getVersion\(\)\s*\)/.test(mainSrc));
  chk('main.js has NO ipcMain.on/once (no fire-and-forget channels)', !/ipcMain\s*\.\s*(on|once|addListener)\b/.test(mainSrc));

  // Step 2: preload.js minimal surface — post-strip checks (no comment-decoy false positives)
  chk('preload.js uses contextBridge', /contextBridge/.test(preloadSrc));
  // H1: the preload legitimately uses ipcRenderer.invoke on the single allowlisted
  // constant channel. The boundary contract is now: (a) ipcRenderer itself is never
  // placed on the exposed surface, (b) no generic send/sendSync/on/postMessage entry,
  // (c) invoke is called ONLY with the APP_VERSION_CHANNEL constant, (d) exactly one
  // channel constant exists and it is the allowlisted literal.
  chk('preload.js never exposes ipcRenderer on the bridge surface', !/exposeInMainWorld[\s\S]*?ipcRenderer\s*[,}]/.test(preloadSrc));
  chk('preload.js has NO generic ipcRenderer.send/sendSync/on/once/postMessage', !/ipcRenderer\s*\.\s*(send|sendSync|sendToHost|on|once|addListener|postMessage)\b/.test(preloadSrc));
  var invokeCalls = preloadSrc.match(/ipcRenderer\s*\.\s*invoke\s*\(\s*([A-Za-z_$][\w$]*|['"`][^'"`]*['"`])/g) || [];
  chk('preload.js ipcRenderer.invoke is used EXACTLY once', invokeCalls.length === 1, { invokeCalls: invokeCalls });
  // H1-R2-01 closure: STRUCTURAL token accounting — regex-shape checks alone allow
  // closure-alias smuggling (e.g. an outer `leak = (...args) => ipcRenderer.invoke(...args)`
  // returned by getAppVersion while one unreachable allowlisted call satisfies the
  // count). The invariant below is alias-proof: after removing the ONLY two legal
  // appearances (the fixed destructure and the exact allowlisted invoke), the token
  // `ipcRenderer` must not appear ANYWHERE else in the file — any alias assignment,
  // re-destructure, spread, or argument-forwarding wrapper leaves a residue and fails.
  function ipcResidue(src) {
    return src
      .replace(/const\s*\{\s*contextBridge\s*,\s*ipcRenderer\s*\}\s*=\s*require\(\s*['"]electron['"]\s*\)/, '')
      .replace(/ipcRenderer\s*\.\s*invoke\s*\(\s*APP_VERSION_CHANNEL\s*\)/, '');
  }
  chk('preload.js ipcRenderer token accounting: ZERO appearances outside the two legal sites',
    !/ipcRenderer/.test(ipcResidue(preloadSrc)),
    { residue: (ipcResidue(preloadSrc).match(/.{0,50}ipcRenderer.{0,50}/) || [])[0] });
  chk('preload.js has EXACTLY one require(), the fixed electron destructure',
    (preloadSrc.match(/require\s*\(/g) || []).length === 1 && /const\s*\{\s*contextBridge\s*,\s*ipcRenderer\s*\}\s*=\s*require\(\s*['"]electron['"]\s*\)/.test(preloadSrc));
  chk('preload.js has NO rest/spread token anywhere (post-strip)', preloadSrc.indexOf('...') === -1);
  // Self-test: the exact round-2 attack shape MUST be caught by the residue invariant.
  (function adversarialSelfTest() {
    var attack = preloadSrc.replace('contextBridge.exposeInMainWorld', 'var leak = function () { return ipcRenderer; };\ncontextBridge.exposeInMainWorld');
    chk('SELF-TEST: alias-smuggling shape is caught by the residue invariant', /ipcRenderer/.test(ipcResidue(attack)));
  })();
  chk('preload.js invoke uses the APP_VERSION_CHANNEL constant (no inline/caller-chosen channel)', /ipcRenderer\s*\.\s*invoke\s*\(\s*APP_VERSION_CHANNEL\s*[),]/.test(preloadSrc));
  var channelConsts = preloadSrc.match(/APP_VERSION_CHANNEL\s*=\s*['"`]([^'"`]+)['"`]/g) || [];
  chk('preload.js declares exactly one channel constant = app:get-version', channelConsts.length === 1 && /['"`]app:get-version['"`]/.test(channelConsts[0]), { channelConsts: channelConsts });
  chk('preload.js does NOT require ./package.json (the pre-H1 sandbox crash)', !/require\s*\(\s*['"]\.\/package\.json['"]\s*\)/.test(preloadSrc));
  chk('preload.js never fabricates a version literal', !/['"`]1\.0\.0['"`]/.test(preloadSrc));
  chk('preload.js does NOT require fs (post-strip)', !/require\s*\(\s*['"]fs['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require child_process (post-strip)', !/require\s*\(\s*['"]child_process['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require net (post-strip)', !/require\s*\(\s*['"]net['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require http (post-strip)', !/require\s*\(\s*['"]http['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require https (post-strip)', !/require\s*\(\s*['"]https['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT require os (post-strip)', !/require\s*\(\s*['"]os['"]\s*\)/.test(preloadSrc));
  chk('preload.js does NOT eval untrusted content (post-strip)', !/eval\s*\(|new\s+Function\s*\(/.test(preloadSrc));

  // F3-R8-02 closure: enumerate EVERY exposeInMainWorld call. There must be EXACTLY ONE
  // and its surface must be exactly {platform, version}.
  // F3-R9-02 closure: also detect computed-form contextBridge['exposeInMainWorld'] calls.
  function extractAllExposedSurfaces(src) {
    var entries = [];
    var startIdx = 0;
    while (true) {
      var sub = src.slice(startIdx);
      // Dot form OR computed form OR alias-via-destructure (latter detected separately below).
      var sm = sub.match(/contextBridge\s*(?:\.exposeInMainWorld|\[\s*['"`]exposeInMainWorld['"`]\s*\])\s*\(\s*(['"`])([^'"`]+)\1\s*,\s*\{/);
      if (!sm) break;
      var absStart = startIdx + sm.index + sm[0].length;
      var worldName = sm[2];
      var depth = 1;
      var i = absStart;
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
          else if (ch === '}') { depth--; if (depth === 0) { entries.push({ name: worldName, body: src.slice(absStart, i) }); break; } }
        }
        i++;
      }
      startIdx = i + 1;
      if (startIdx >= src.length) break;
    }
    return entries;
  }
  var exposedSurfaces = extractAllExposedSurfaces(preloadSrc);
  chk('preload.js exposes EXACTLY ONE contextBridge surface', exposedSurfaces.length === 1, { surfaces: exposedSurfaces.map(function (e) { return e.name; }) });
  var exposedEntry = exposedSurfaces[0] || { name: '', body: '' };
  var exposedBody = exposedEntry.body || '';
  chk('preload.js exposes the surface as "electronAPI"', exposedEntry.name === 'electronAPI');

  // F3-R9-02 closure: also assert NO bare/aliased `exposeInMainWorld` reference outside the
  // single audited call. A regression like
  //   const e = contextBridge.exposeInMainWorld; e('backdoor', {...})
  // would not match the extractor. We count total occurrences of the keyword and require it
  // to appear exactly ONCE in the file.
  var exposeOccurrences = (preloadSrc.match(/exposeInMainWorld/g) || []).length;
  chk('preload.js references exposeInMainWorld EXACTLY ONCE (no aliasing/destructuring escape)', exposeOccurrences === 1, { count: exposeOccurrences });

  // No spread (...) — exposes hidden properties
  chk('preload.js exposed surface has NO spread operator', !/\.\.\./.test(exposedBody));
  // No computed keys
  chk('preload.js exposed surface has NO computed keys', !/\[\s*['"`][^'"`]+['"`]\s*\]\s*:/.test(exposedBody));
  // No method shorthand (function bodies)
  chk('preload.js exposed surface has NO method shorthand', !/\b[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*\{/.test(exposedBody));
  // No accessor properties (get foo() {})
  chk('preload.js exposed surface has NO accessor properties', !/\b(?:get|set)\s+[a-zA-Z_$][\w$]*\s*\(/.test(exposedBody));

  // Parse top-level key list — split on top-level commas (depth-0 commas)
  function topLevelKeys(body) {
    var keys = [];
    var depth = 0;
    var inStr = false;
    var strCh = '';
    var segStart = 0;
    for (var i = 0; i <= body.length; i++) {
      var ch = i < body.length ? body.charAt(i) : ',';
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === strCh) inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; continue; }
      if (ch === '{' || ch === '[' || ch === '(') depth++;
      else if (ch === '}' || ch === ']' || ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        var seg = body.slice(segStart, i).trim();
        if (seg) {
          var kMatch = seg.match(/^([a-zA-Z_$][\w$]*)\s*:/);
          if (kMatch) keys.push(kMatch[1]);
          else if (/^[a-zA-Z_$][\w$]*$/.test(seg)) keys.push(seg); // shorthand
          else keys.push('<INVALID:' + seg.slice(0, 30) + '>');
        }
        segStart = i + 1;
      }
    }
    return keys;
  }
  var exposedKeys = topLevelKeys(exposedBody).sort();
  chk('preload.js exposed surface has EXACTLY {getAppVersion, platform}', JSON.stringify(exposedKeys) === JSON.stringify(['getAppVersion', 'platform']), { keys: exposedKeys });

  // F3-R9-03 closure: each exposed value must be an INERT primitive expression — no functions,
  // no closures, no process/global access, no dynamic require. Parse the body's key:value pairs
  // and assert each value is on an allowlist of safe shapes.
  function topLevelEntries(body) {
    var entries = [];
    var depth = 0;
    var inStr = false;
    var strCh = '';
    var segStart = 0;
    for (var i = 0; i <= body.length; i++) {
      var ch = i < body.length ? body.charAt(i) : ',';
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === strCh) inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; continue; }
      if (ch === '{' || ch === '[' || ch === '(') depth++;
      else if (ch === '}' || ch === ']' || ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        var seg = body.slice(segStart, i).trim();
        if (seg) {
          var kvMatch = seg.match(/^([a-zA-Z_$][\w$]*)\s*:\s*([\s\S]+)$/);
          if (kvMatch) entries.push({ key: kvMatch[1], value: kvMatch[2].trim() });
          else if (/^[a-zA-Z_$][\w$]*$/.test(seg)) entries.push({ key: seg, value: seg }); // shorthand
        }
        segStart = i + 1;
      }
    }
    return entries;
  }
  var exposedEntries = topLevelEntries(exposedBody);
  var EXPOSED_FORBIDDEN_TOKENS = /\bprocess\b|\bglobalThis\b|\b__dirname\b|\b__filename\b|\bModule\b|\beval\b|\b(?:child_process|fs|net|http|https|os|crypto|dgram|vm|cluster|worker_threads|repl|inspector|perf_hooks|trace_events)\b/;
  function isInertExposedValue(val) {
    // (a) string literal
    if (/^["'][^"']*["']$/.test(val)) return true;
    // (b) reading process.platform IS allowed (it's a known-inert string)
    if (/^process\.platform$/.test(val)) return true;
    // (c) H1: the pre-H1 require('./package.json').version chain is now FORBIDDEN
    //     (it crashed the sandboxed preload); the only allowed function reference is
    //     the named getAppVersion defined in this file (validated separately below).
    if (/^getAppVersion$/.test(val)) return true;
    // (d) plain numeric / boolean / null literal
    if (/^(?:-?\d+(?:\.\d+)?|true|false|null)$/.test(val)) return true;
    return false;
  }
  // The allowed function reference must be a top-level named function declared in
  // preload.js itself. H1-R1-02 closure: the BODY is extracted (brace matching) and
  // audited — zero parameters (no caller-argument forwarding into IPC), ipcRenderer
  // used ONLY as the exact allowlisted invoke, no Node authority, no arguments
  // object, no rest/spread forwarding, and it never returns ipcRenderer itself.
  chk('preload.js declares the named getAppVersion function it exposes',
    /function\s+getAppVersion\s*\(\s*\)/.test(preloadSrc));
  (function auditGetAppVersionBody() {
    var m = preloadSrc.match(/function\s+getAppVersion\s*\(\s*\)\s*\{/);
    chk('getAppVersion has ZERO parameters', !!m);
    if (!m) return;
    var i = m.index + m[0].length, depth = 1, inStr = false, strCh = '';
    while (i < preloadSrc.length && depth > 0) {
      var ch = preloadSrc.charAt(i);
      if (inStr) { if (ch === '\\') { i += 2; continue; } if (ch === strCh) inStr = false; }
      else if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; }
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    var body = preloadSrc.slice(m.index + m[0].length, i - 1);
    var bodyNoInvoke = body.replace(/ipcRenderer\s*\.\s*invoke\s*\(\s*APP_VERSION_CHANNEL\s*\)/g, '');
    chk('getAppVersion body: ipcRenderer appears ONLY as the exact allowlisted invoke', !/ipcRenderer/.test(bodyNoInvoke), { residue: (bodyNoInvoke.match(/.{0,40}ipcRenderer.{0,40}/) || [])[0] });
    chk('getAppVersion body: no require/process/arguments/spread forwarding', !/\brequire\s*\(|\bprocess\s*[.\[]|\barguments\b|\.\.\./.test(body));
    chk('getAppVersion body: never returns a bare authority object', !/return\s+ipcRenderer\b|return\s+process\b|return\s+require\b/.test(body));
  })();
  for (var ee = 0; ee < exposedEntries.length; ee++) {
    var entry = exposedEntries[ee];
    // Static forbidden-token check (catches process.env, child_process, etc., even via concat)
    chk('exposed[' + entry.key + '] has NO Node-authority tokens',
      !EXPOSED_FORBIDDEN_TOKENS.test(entry.value) || /^process\.platform$/.test(entry.value),
      { key: entry.key, value: entry.value.slice(0, 80) });
    // Allowlist shape check
    chk('exposed[' + entry.key + '] is an inert primitive expression',
      isInertExposedValue(entry.value),
      { key: entry.key, value: entry.value.slice(0, 80) });
  }

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
