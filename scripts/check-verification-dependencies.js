#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — Dependency Audit Gate (dependency-free verification lane).
 *
 * Proves that every file CI executes — the authoritative test entry points (from package.json
 * scripts.test) plus the R3-GATE0 verification scripts, and everything reachable through
 * require()/import — needs no third-party npm package. The lane installs nothing, so a bare specifier
 * or an unresolvable dynamic load FAILS (fail-closed), never slips through as a runtime "module not
 * found". The Node builtin set comes from require('module').builtinModules.
 *
 * A real (string/template/regex/comment-aware) tokenizer locates require/import in CODE positions only,
 * so example text in comments or strings is never mistaken for an import. Two safe dynamic forms are
 * adjudicated statically and recorded transparently (dynamicResolvedStatically — decisions, not skips):
 *   1. require/import( path.join(__dirname, ...string-literals) )  → the evaluated repo file.
 *   2. require(IDENT) where IDENT is the parameter of the ENCLOSING function and every call site of that
 *      function passes only literal relative './*.js' specifiers (the UMD `_req(p)` helper) → those.
 * Anything else dynamic → dynamicUnresolved (FAIL). The documented allowlist is empty by design.
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/dependency-audit.json
 */
const fs = require('fs');
const path = require('path');
const { builtinModules } = require('module');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');

const BUILTINS = new Set(builtinModules);
const isBuiltin = spec => { const s = spec.startsWith('node:') ? spec.slice(5) : spec; return BUILTINS.has(s) || BUILTINS.has(s.split('/')[0]); };
const isRelative = spec => spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..';
const KEYWORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'do', 'else', 'yield', 'await', 'case']);

// Minimal documented allowlist for in-repo dynamic loads that cannot be adjudicated by the rules above.
// Empty by design — an entry would be an explicit, reviewed decision, NOT a general bypass.
const DYNAMIC_ALLOWLIST = []; // { file, line, reason }

function entryPoints() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const fromTests = (pkg.scripts.test || '').split('&&')
    .map(s => s.trim()).filter(Boolean)
    .map(s => { const m = s.match(/^node\s+(\S+)/); return m ? m[1] : null; }).filter(Boolean);
  const verifScripts = fs.readdirSync(path.join(REPO, 'scripts')).filter(f => f.endsWith('.js')).map(f => 'scripts/' + f);
  return Array.from(new Set([...fromTests, ...verifScripts])).map(rel => path.resolve(REPO, rel));
}

// Tokenizer: skips comments; emits string/template/regex/word/num/punct with source index.
function tokenize(src) {
  const T = []; let i = 0; const n = src.length;
  const last = () => (T.length ? T[T.length - 1] : null);
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'") { let j = i + 1, v = ''; while (j < n) { if (src[j] === '\\') { v += (src[j + 1] || ''); j += 2; continue; } if (src[j] === c) break; v += src[j]; j++; } T.push({ t: 'str', v, i }); i = j + 1; continue; }
    if (c === '`') { let j = i + 1; while (j < n) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '`') break; j++; } T.push({ t: 'tmpl', i }); i = j + 1; continue; }
    if (c === '/') {
      const l = last();
      const division = l && ((l.t === 'word' && !KEYWORDS.has(l.v)) || l.t === 'num' || l.t === 'str' || l.t === 'tmpl' || l.t === 'regex' || (l.t === 'punct' && (l.v === ')' || l.v === ']')));
      if (!division) { let j = i + 1, cls = false; while (j < n) { const e = src[j]; if (e === '\\') { j += 2; continue; } if (e === '[') cls = true; else if (e === ']') cls = false; else if (e === '/' && !cls) break; else if (e === '\n') break; j++; } j++; while (j < n && /[a-z]/i.test(src[j])) j++; T.push({ t: 'regex', i }); i = j; continue; }
      T.push({ t: 'punct', v: '/', i }); i++; continue;
    }
    if (/[A-Za-z_$]/.test(c)) { let j = i; while (j < n && /[\w$]/.test(src[j])) j++; T.push({ t: 'word', v: src.slice(i, j), i }); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < n && /[\w.]/.test(src[j])) j++; T.push({ t: 'num', v: src.slice(i, j), i }); i = j; continue; }
    T.push({ t: 'punct', v: c, i }); i++;
  }
  return T;
}

function grabParen(T, openK) { // openK = index of '(' token
  let depth = 0; const inner = []; let closeTok = null;
  for (let k = openK; k < T.length; k++) {
    const x = T[k];
    if (x.t === 'punct' && (x.v === '(' || x.v === '[' || x.v === '{')) { depth++; if (depth > 1) inner.push(x); continue; }
    if (x.t === 'punct' && (x.v === ')' || x.v === ']' || x.v === '}')) { depth--; if (depth === 0) { closeTok = x; break; } inner.push(x); continue; }
    if (depth >= 1) inner.push(x);
  }
  return { closeTok, inner };
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

function extractSpecifiers(src) {
  const T = tokenize(src);
  const out = [];
  for (let k = 0; k < T.length; k++) {
    const t = T[k];
    if (t.t !== 'word' || (t.v !== 'require' && t.v !== 'import')) continue;
    const a = T[k + 1];
    if (a && a.t === 'punct' && a.v === '(') {
      const { closeTok, inner } = grabParen(T, k + 1);
      if (!closeTok) continue;
      const line = lineOf(src, t.i);
      if (inner.length === 1 && inner[0].t === 'str') out.push({ type: 'static', kind: t.v, spec: inner[0].v, line });
      else out.push({ type: 'dynamic', kind: t.v, raw: src.slice(a.i + 1, closeTok.i).trim(), line, index: t.i });
      continue;
    }
    if (t.v === 'import') {
      if (a && a.t === 'str') { out.push({ type: 'static', kind: 'import', spec: a.v, line: lineOf(src, t.i) }); continue; }
      // import ... from 'x'
      let j = k + 1;
      while (j < T.length && !(T[j].t === 'word' && T[j].v === 'from')) { if (T[j].t === 'punct' && T[j].v === ';') break; j++; }
      if (T[j] && T[j].t === 'word' && T[j].v === 'from' && T[j + 1] && T[j + 1].t === 'str') out.push({ type: 'static', kind: 'import', spec: T[j + 1].v, line: lineOf(src, t.i) });
    }
  }
  return out;
}

function resolveRelative(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + '.js', base + '.json', path.join(base, 'index.js')]) { try { if (fs.statSync(c).isFile()) return c; } catch (_) { /* keep trying */ } }
  return null;
}

function splitTopLevel(s) {
  const out = []; let depth = 0, cur = '', q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === '\\') { cur += (s[i + 1] || ''); i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; cur += c; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim() !== '') out.push(cur);
  return out;
}

function extractParenBody(src, openIdx) {
  let depth = 0, q = null;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '(') depth++; else if (c === ')') { depth--; if (depth === 0) return src.slice(openIdx + 1, i); }
  }
  return null;
}

function tryStaticPathJoin(raw, fromFile) {
  const m = raw.match(/^path\.(join|resolve)\(([\s\S]+)\)\s*$/);
  if (!m) return null;
  const args = splitTopLevel(m[2]).map(a => a.trim());
  if (!args.length || args[0] !== '__dirname') return null; // only the __dirname anchor
  const parts = [];
  for (const a of args.slice(1)) { const lit = a.match(/^(['"])([^'"]*)\1$/); if (!lit) return null; parts.push(lit[2]); }
  return path.resolve(path.dirname(fromFile), ...parts);
}

// Find the function that ENCLOSES the require at charIdx and whose parameter list contains `ident`.
function enclosingFn(src, charIdx, ident) {
  let idx = charIdx;
  while (idx > 0) {
    const f = src.lastIndexOf('function', idx);
    if (f < 0) return null;
    const m = src.slice(f).match(/^function\s*([A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/);
    if (m) { const params = m[2].split(',').map(s => s.trim()).filter(Boolean); if (params.indexOf(ident) >= 0) return { name: m[1] || null, paramIdx: params.indexOf(ident) }; }
    idx = f - 1;
  }
  return null;
}

// All call sites of fnName: are the args at paramIdx all literal relative specifiers?
function callSiteLiterals(src, fnName, paramIdx) {
  if (!fnName) return { ok: false, any: false, nonLiteral: ['(anonymous enclosing function)'] };
  const re = new RegExp('(^|[^\\w$.])' + fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\(', 'g');
  let m, any = false, allLit = true; const lits = [], non = [];
  while ((m = re.exec(src))) {
    const callAt = m.index + (m[1] ? 1 : 0);
    if (/function\s+$/.test(src.slice(Math.max(0, callAt - 12), callAt))) continue; // skip the definition
    const body = extractParenBody(src, src.indexOf('(', callAt));
    if (body == null) continue;
    const arg = (splitTopLevel(body)[paramIdx] || '').trim();
    any = true;
    const lit = arg.match(/^(['"])((?:\.\.?\/)[^'"]+)\1$/);
    if (lit) lits.push(lit[2]); else { allLit = false; non.push(arg); }
  }
  return { ok: any && allLit, any, lits, nonLiteral: non };
}

function run() {
  const entries = entryPoints();
  const visited = new Set();
  const queue = entries.slice();
  const builtinImports = new Set();
  let relativeImports = 0;
  const externalImports = [], dynamicUnresolved = [], unresolvedRelative = [], dynamicResolvedStatically = [];

  const enqueueRel = (fromFile, spec, line) => {
    relativeImports++;
    const resolved = resolveRelative(fromFile, spec);
    if (!resolved) { unresolvedRelative.push({ file: path.relative(REPO, fromFile), line, spec, reason: 'relative path does not resolve to a repo file' }); return; }
    if (resolved.startsWith(REPO) && !visited.has(resolved)) queue.push(resolved);
  };

  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    let src;
    try { src = fs.readFileSync(file, 'utf8'); } catch (_) { unresolvedRelative.push({ file: path.relative(REPO, file), reason: 'unreadable' }); continue; }
    const rel = path.relative(REPO, file);
    for (const s of extractSpecifiers(src)) {
      if (s.type === 'static') {
        if (isBuiltin(s.spec)) { builtinImports.add(s.spec.replace(/^node:/, '')); continue; }
        if (isRelative(s.spec)) { enqueueRel(file, s.spec, s.line); continue; }
        externalImports.push({ file: rel, line: s.line, kind: s.kind, spec: s.spec, reason: 'bare third-party specifier; lane installs nothing' });
        continue;
      }
      if (DYNAMIC_ALLOWLIST.find(a => a.file === rel && a.line === s.line)) { dynamicResolvedStatically.push({ file: rel, line: s.line, via: 'allowlist' }); continue; }
      const sp = tryStaticPathJoin(s.raw, file);
      if (sp) {
        const target = (sp.endsWith('.js') ? [sp] : [sp, sp + '.js', path.join(sp, 'index.js')]).find(c => { try { return fs.statSync(c).isFile(); } catch (_) { return false; } });
        if (target && target.startsWith(REPO)) { if (!visited.has(target)) queue.push(target); dynamicResolvedStatically.push({ file: rel, line: s.line, via: 'static-path-join', target: path.relative(REPO, target) }); continue; }
      }
      const idm = s.raw.match(/^([A-Za-z_$][\w$]*)$/);
      if (idm) {
        const fn = enclosingFn(src, s.index, idm[1]);
        if (fn) {
          const cs = callSiteLiterals(src, fn.name, fn.paramIdx);
          if (cs.ok) { cs.lits.forEach(p => enqueueRel(file, p, s.line)); dynamicResolvedStatically.push({ file: rel, line: s.line, via: 'forwarded-literal-args', fn: fn.name, resolvedSpecs: Array.from(new Set(cs.lits)) }); continue; }
          dynamicUnresolved.push({ file: rel, line: s.line, kind: s.kind, raw: s.raw, reason: 'enclosing fn ' + (fn.name || '(anon)') + ' has non-literal call-site arg(s): ' + cs.nonLiteral.join(' | ') });
          continue;
        }
      }
      dynamicUnresolved.push({ file: rel, line: s.line, kind: s.kind, raw: s.raw, reason: 'non-literal module specifier cannot be statically adjudicated' });
    }
  }

  const ok = externalImports.length === 0 && dynamicUnresolved.length === 0 && unresolvedRelative.length === 0;
  return {
    check: 'dependency-audit', mode: 'dependency-free',
    entryPoints: entries.length, filesTraversed: visited.size,
    builtinImports: Array.from(builtinImports).sort(), relativeImports,
    externalImports, dynamicUnresolved, unresolvedRelative, dynamicResolvedStatically,
    dynamicAllowlist: DYNAMIC_ALLOWLIST, overall: ok ? 'PASS' : 'FAIL', ok,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'dependency-audit', mode: 'dependency-free', fatalError: String((e && e.stack) || e), overall: 'FAIL', ok: false, externalImports: [], dynamicUnresolved: [] }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'dependency-audit.json'), JSON.stringify(result, null, 2));
console.log('DEP-AUDIT ' + JSON.stringify({ entryPoints: result.entryPoints, filesTraversed: result.filesTraversed, external: (result.externalImports || []).length, dynamicUnresolved: (result.dynamicUnresolved || []).length, resolvedStatically: (result.dynamicResolvedStatically || []).length, ok: result.ok }));
process.exit(exitCode);
