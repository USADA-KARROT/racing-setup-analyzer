#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — Dependency Audit Gate (dependency-free verification lane).
 *
 * Proves that every file CI executes — the authoritative test entry points (from package.json
 * scripts.test) plus the R3-GATE0 verification scripts, and everything reachable through
 * require()/import — needs no third-party npm package. The lane installs nothing, so a bare specifier
 * or an unresolvable dynamic load FAILS (fail-closed). The Node builtin set comes from
 * require('module').builtinModules.
 *
 * A stack-based lexer locates require/import in CODE positions only. It is comment/string/regex aware,
 * AND template-aware: template `${...}` expression bodies are tokenized inline through the same lexer
 * (so a `}` inside a comment/string/regex/nested-template inside `${...}` does not end the expression,
 * and a hidden `${require('x')}` is still seen). Two safe dynamic forms are adjudicated statically and
 * recorded (decisions, not skips):
 *   1. require/import( path.join(__dirname, ...string-literals) ) — ONLY when this file binds `path` to
 *      require('path'), `path` is never reassigned, and the call site is not inside a scope that shadows
 *      `path` (e.g. `function f(path){...}`).
 *   2. require(IDENT) where IDENT is a parameter of the function whose BODY actually encloses this call,
 *      and every call site of that function passes only literal relative './*.js' specifiers.
 * Anything else dynamic → dynamicUnresolved (FAIL). The documented allowlist is empty by design.
 * `--selftest` carries adversarial cases for every rule above.
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
const DYNAMIC_ALLOWLIST = []; // { file, line, reason } — empty by design (no general bypass)

function entryPoints() {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const fromTests = (pkg.scripts.test || '').split('&&')
    .map(s => s.trim()).filter(Boolean)
    .map(s => { const m = s.match(/^node\s+(\S+)/); return m ? m[1] : null; }).filter(Boolean);
  const verifScripts = fs.readdirSync(path.join(REPO, 'scripts')).filter(f => f.endsWith('.js')).map(f => 'scripts/' + f);
  return Array.from(new Set([...fromTests, ...verifScripts])).map(rel => path.resolve(REPO, rel));
}

// Stack-based lexer. Template literal text is skipped; `${` opens an expression that is lexed inline
// through this same loop; the matching `}` (tracked by brace depth, never confused by a `}` inside a
// comment/string/regex within the expression) closes it back to template-literal mode.
function tokenize(src) {
  const T = []; let i = 0; const n = src.length;
  const last = () => (T.length ? T[T.length - 1] : null);
  const tplBraceStack = []; let braceDepth = 0; let mode = 'code';
  while (i < n) {
    if (mode === 'tpl') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i++; mode = 'code'; continue; }
      if (c === '$' && src[i + 1] === '{') { T.push({ t: 'punct', v: '${', i }); i += 2; tplBraceStack.push(braceDepth); braceDepth++; mode = 'code'; continue; }
      i++; continue;
    }
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { i += 2; while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'") { let j = i + 1, v = ''; while (j < n) { if (src[j] === '\\') { v += (src[j + 1] || ''); j += 2; continue; } if (src[j] === c) break; v += src[j]; j++; } T.push({ t: 'str', v, i }); i = j + 1; continue; }
    if (c === '`') { T.push({ t: 'tmpl', i }); i++; mode = 'tpl'; continue; }
    if (c === '/') {
      const l = last();
      const division = l && ((l.t === 'word' && !KEYWORDS.has(l.v)) || l.t === 'num' || l.t === 'str' || l.t === 'tmpl' || l.t === 'regex' || (l.t === 'punct' && (l.v === ')' || l.v === ']')));
      if (!division) { let j = i + 1, cls = false; while (j < n) { const e = src[j]; if (e === '\\') { j += 2; continue; } if (e === '[') cls = true; else if (e === ']') cls = false; else if (e === '/' && !cls) break; else if (e === '\n') break; j++; } j++; while (j < n && /[a-z]/i.test(src[j])) j++; T.push({ t: 'regex', i }); i = j; continue; }
      T.push({ t: 'punct', v: '/', i }); i++; continue;
    }
    if (c === '{') { braceDepth++; T.push({ t: 'punct', v: '{', i }); i++; continue; }
    if (c === '}') {
      if (tplBraceStack.length && braceDepth === tplBraceStack[tplBraceStack.length - 1] + 1) { tplBraceStack.pop(); braceDepth--; T.push({ t: 'punct', v: '}', i }); i++; mode = 'tpl'; continue; }
      braceDepth--; T.push({ t: 'punct', v: '}', i }); i++; continue;
    }
    if (/[A-Za-z_$]/.test(c)) { let j = i; while (j < n && /[\w$]/.test(src[j])) j++; T.push({ t: 'word', v: src.slice(i, j), i }); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < n && /[\w.]/.test(src[j])) j++; T.push({ t: 'num', v: src.slice(i, j), i }); i = j; continue; }
    T.push({ t: 'punct', v: c, i }); i++;
  }
  return T;
}

const OPEN = new Set(['(', '[', '{', '${']);
const CLOSE = new Set([')', ']', '}']);

function grabParen(T, openK) { // openK = index of '(' token
  let depth = 0; const inner = []; let closeTok = null, closeK = -1;
  for (let k = openK; k < T.length; k++) {
    const x = T[k];
    if (x.t === 'punct' && OPEN.has(x.v)) { depth++; if (depth > 1) inner.push(x); continue; }
    if (x.t === 'punct' && CLOSE.has(x.v)) { depth--; if (depth === 0) { closeTok = x; closeK = k; break; } inner.push(x); continue; }
    if (depth >= 1) inner.push(x);
  }
  return { closeTok, closeK, inner };
}

function grabBrace(T, openK) { // openK = index of '{' token; returns index of matching '}' (or -1)
  let depth = 0;
  for (let k = openK; k < T.length; k++) {
    const x = T[k];
    if (x.t === 'punct' && (x.v === '{' || x.v === '${')) depth++;
    else if (x.t === 'punct' && x.v === '}') { depth--; if (depth === 0) return k; }
  }
  return -1;
}

function splitArgsTokens(inner) {
  const groups = []; let cur = [], depth = 0;
  for (const x of inner) {
    if (x.t === 'punct' && OPEN.has(x.v)) { depth++; cur.push(x); continue; }
    if (x.t === 'punct' && CLOSE.has(x.v)) { depth--; cur.push(x); continue; }
    if (x.t === 'punct' && x.v === ',' && depth === 0) { groups.push(cur); cur = []; continue; }
    cur.push(x);
  }
  if (cur.length) groups.push(cur);
  return groups;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

// Find the function whose BODY actually contains token index `idx`. Verifies idx lies between the body
// braces (not merely after a preceding `function` keyword). Returns { name, paramNames, fnStart } | null.
function findEnclosingFunction(T, idx) {
  for (let k = idx - 1; k >= 0; k--) {
    if (!(T[k].t === 'word' && T[k].v === 'function')) continue;
    let p = k + 1, name = null;
    if (T[p] && T[p].t === 'word') { name = T[p].v; p++; }
    if (!(T[p] && T[p].t === 'punct' && T[p].v === '(')) continue;
    const paren = grabParen(T, p);
    if (paren.closeK < 0) continue;
    let b = paren.closeK + 1;
    if (!(T[b] && T[b].t === 'punct' && T[b].v === '{')) continue; // function declarations have a block body right after )
    const bodyClose = grabBrace(T, b);
    if (bodyClose < 0) continue;
    if (idx > b && idx < bodyClose) {
      const paramNames = splitArgsTokens(paren.inner).map(g => (g.length === 1 && g[0].t === 'word') ? g[0].v : null).filter(Boolean);
      return { name, paramNames, fnStart: k };
    }
    // a `function` whose body does NOT contain idx is not our encloser; keep scanning outward
  }
  return null;
}

// Is `path` shadowed (by a function parameter) at the scope of token index `idx`?
function pathShadowedAt(T, idx) {
  let cur = idx;
  for (let guard = 0; guard < 64; guard++) {
    const fn = findEnclosingFunction(T, cur);
    if (!fn) return false;
    if (fn.paramNames.includes('path')) return true;
    cur = fn.fnStart; // walk outward
    if (cur <= 0) return false;
  }
  return false;
}

// File binds `path` to the Node builtin at top level?
function pathBoundToBuiltin(T) {
  for (let k = 0; k + 4 < T.length; k++) {
    if (T[k].t === 'word' && T[k].v === 'path' && T[k + 1].t === 'punct' && T[k + 1].v === '=' &&
        T[k + 2].t === 'word' && T[k + 2].v === 'require' && T[k + 3].t === 'punct' && T[k + 3].v === '(' &&
        T[k + 4].t === 'str' && (T[k + 4].v === 'path' || T[k + 4].v === 'node:path')) return true;
  }
  return false;
}

// Is `path` reassigned anywhere (an assignment that is NOT the builtin-require binding)?
function pathReassigned(T) {
  for (let k = 0; k + 1 < T.length; k++) {
    if (!(T[k].t === 'word' && T[k].v === 'path')) continue;
    const nx = T[k + 1];
    if (!(nx && nx.t === 'punct' && nx.v === '=')) continue;
    if (T[k + 2] && T[k + 2].t === 'punct' && (T[k + 2].v === '=' || T[k + 2].v === '>')) continue; // ==, ===, =>
    const pv = T[k - 1] && T[k - 1].v;
    if (pv === '=' || pv === '!' || pv === '<' || pv === '>') continue; // ==, !=, <=, >=
    const isReqBind = T[k + 2] && T[k + 2].t === 'word' && T[k + 2].v === 'require' && T[k + 3] && T[k + 3].v === '(' &&
      T[k + 4] && T[k + 4].t === 'str' && (T[k + 4].v === 'path' || T[k + 4].v === 'node:path');
    const isDeclared = T[k - 1] && T[k - 1].t === 'word' && ['const', 'let', 'var'].includes(T[k - 1].v);
    if (isReqBind && isDeclared) continue; // the legitimate binding
    return true; // any other `path = ...`
  }
  return false;
}

function extractSpecifiers(T, src) {
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
      else out.push({ type: 'dynamic', kind: t.v, raw: src.slice(a.i + 1, closeTok.i).trim(), line, tokenIndex: k });
      continue;
    }
    if (t.v === 'import') {
      if (a && a.t === 'str') { out.push({ type: 'static', kind: 'import', spec: a.v, line: lineOf(src, t.i) }); continue; }
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

function tryStaticPathJoin(raw, fromFile) {
  const m = raw.match(/^path\.(join|resolve)\(([\s\S]+)\)\s*$/);
  if (!m) return null;
  const args = splitTopLevel(m[2]).map(a => a.trim());
  if (!args.length || args[0] !== '__dirname') return null;
  const parts = [];
  for (const a of args.slice(1)) { const lit = a.match(/^(['"])([^'"]*)\1$/); if (!lit) return null; parts.push(lit[2]); }
  return path.resolve(path.dirname(fromFile), ...parts);
}

// Token-based: every call site of fnName — is the arg at paramIdx always a literal relative specifier?
function callSiteLiteralsTok(T, fnName, paramIdx) {
  if (!fnName) return { ok: false, any: false, nonLiteral: ['(anonymous enclosing function)'] };
  let any = false, allLit = true; const lits = [], non = [];
  for (let k = 0; k < T.length; k++) {
    if (!(T[k].t === 'word' && T[k].v === fnName)) continue;
    if (k > 0 && T[k - 1].t === 'word' && T[k - 1].v === 'function') continue; // the definition, not a call
    const open = T[k + 1];
    if (!(open && open.t === 'punct' && open.v === '(')) continue;
    const { inner } = grabParen(T, k + 1);
    const g = splitArgsTokens(inner)[paramIdx] || [];
    any = true;
    if (g.length === 1 && g[0].t === 'str' && /^\.\.?\//.test(g[0].v)) lits.push(g[0].v);
    else { allLit = false; non.push(g.map(x => x.v || x.t).join(' ') || '(missing)'); }
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
    const T = tokenize(src);
    const pathBound = pathBoundToBuiltin(T) && !pathReassigned(T);
    for (const s of extractSpecifiers(T, src)) {
      if (s.type === 'static') {
        if (isBuiltin(s.spec)) { builtinImports.add(s.spec.replace(/^node:/, '')); continue; }
        if (isRelative(s.spec)) { enqueueRel(file, s.spec, s.line); continue; }
        externalImports.push({ file: rel, line: s.line, kind: s.kind, spec: s.spec, reason: 'bare third-party specifier; lane installs nothing' });
        continue;
      }
      if (DYNAMIC_ALLOWLIST.find(a => a.file === rel && a.line === s.line)) { dynamicResolvedStatically.push({ file: rel, line: s.line, via: 'allowlist' }); continue; }
      const sp = (pathBound && !pathShadowedAt(T, s.tokenIndex)) ? tryStaticPathJoin(s.raw, file) : null;
      if (sp) {
        const target = (sp.endsWith('.js') ? [sp] : [sp, sp + '.js', path.join(sp, 'index.js')]).find(c => { try { return fs.statSync(c).isFile(); } catch (_) { return false; } });
        if (target && target.startsWith(REPO)) { if (!visited.has(target)) queue.push(target); dynamicResolvedStatically.push({ file: rel, line: s.line, via: 'static-path-join', target: path.relative(REPO, target) }); continue; }
      }
      const idm = s.raw.match(/^([A-Za-z_$][\w$]*)$/);
      if (idm) {
        const fn = findEnclosingFunction(T, s.tokenIndex);
        const pidx = fn ? fn.paramNames.indexOf(idm[1]) : -1;
        if (fn && pidx >= 0) {
          const cs = callSiteLiteralsTok(T, fn.name, pidx);
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

// Adversarial self-test: proves the lexer/adjudicator detects hidden third-party imports and is not
// fooled by comments/strings/regex/template-boundary tricks, shadowed/reassigned `path`, or a global
// require(IDENT) that is not actually inside the forwarding function. Run via `--selftest`.
function selftest() {
  const cases = []; const check = (name, cond) => cases.push({ name, ok: !!cond });
  const sp = s => extractSpecifiers(tokenize(s), s);
  check('template ${require(lodash)} is SEEN', sp("const a = `${require('lodash')}`;").some(s => s.spec === 'lodash'));
  check('template ${import(evil)} is SEEN', sp("const b = `${import('evil-pkg')}`;").some(s => s.spec === 'evil-pkg'));
  check('nested template ${`${require(deep)}`} is SEEN', sp("const c = `${`${require('deep-pkg')}`}`;").some(s => s.spec === 'deep-pkg'));
  check('template ${/* } */ require(evil2)} is SEEN (comment-brace not end)', sp("const d = `${/* } */ require('evil2')}`;").some(s => s.spec === 'evil2'));
  check("template ${ s=>s+'}' ; require(evil3)} is SEEN (string-brace not end)", sp("const e = `${ ((s)=>s+'}')('x') + require('evil3') }`;").some(s => s.spec === 'evil3'));
  check('comment require is IGNORED', !sp("// require('ghost')\nconst f=1;").some(s => s.spec === 'ghost'));
  check('block-comment require is IGNORED', !sp("/* require('ghost2') */\nconst g=1;").some(s => s.spec === 'ghost2'));
  check('string require is IGNORED', !sp("const s=\"require('ghost3')\";").some(s => s.spec === 'ghost3'));
  check('regex require is IGNORED', !sp("const re=/require\\('ghost4'\\)/;").some(s => s.spec === 'ghost4'));
  check('relative require is SEEN', sp("const h=require('./rel.js');").some(s => s.type === 'static' && s.spec === './rel.js'));
  check('builtin require is SEEN', sp("const fsx=require('fs');").some(s => s.spec === 'fs'));
  check('path=require(path) bound', pathBoundToBuiltin(tokenize("const path = require('path');")));
  check('shadowed path object NOT bound', !pathBoundToBuiltin(tokenize("const path = { join: function () { return 'evil'; } };")));
  check('path reassignment detected', pathReassigned(tokenize("const path = require('path'); path = require('evil');")));
  check('no reassignment for plain binding', !pathReassigned(tokenize("const path = require('path'); const y = path.join('a','b');")));
  // shadowed-at-call-site: path.join inside function f(path) must be detected as shadowed
  {
    const src = "const path = require('path');\nfunction f(path) { return require(path.join(__dirname, 'x.js')); }";
    const T = tokenize(src); const dyn = extractSpecifiers(T, src).find(x => x.type === 'dynamic');
    check('path shadowed at call site detected', !!dyn && pathShadowedAt(T, dyn.tokenIndex));
    check('path NOT shadowed at top-level call', (() => { const s2 = "const path = require('path');\nconst m = require(path.join(__dirname, 'x.js'));"; const T2 = tokenize(s2); const d2 = extractSpecifiers(T2, s2).find(x => x.type === 'dynamic'); return d2 && !pathShadowedAt(T2, d2.tokenIndex); })());
  }
  // global require(IDENT) after a forwarding function must NOT be falsely enclosed
  {
    const src = "function _req(p){ return require(p); }\n_req('./a.js');\nconst m = require(globalP);";
    const T = tokenize(src); const dyns = extractSpecifiers(T, src).filter(x => x.type === 'dynamic');
    const top = dyns.find(x => x.raw === 'globalP');
    check('global require(IDENT) not falsely enclosed', !!top && findEnclosingFunction(T, top.tokenIndex) === null);
    const inside = dyns.find(x => x.raw === 'p');
    check('inside-fn require(p) is correctly enclosed', !!inside && !!findEnclosingFunction(T, inside.tokenIndex));
  }
  const failed = cases.filter(c => !c.ok);
  console.log('DEP-AUDIT-SELFTEST ' + (cases.length - failed.length) + '/' + cases.length + ' passed' + (failed.length ? ' — FAILED: ' + failed.map(c => c.name).join('; ') : ''));
  process.exit(failed.length ? 1 : 0);
}
if (process.argv.includes('--selftest')) selftest();

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'dependency-audit', mode: 'dependency-free', fatalError: String((e && e.stack) || e), overall: 'FAIL', ok: false, externalImports: [], dynamicUnresolved: [] }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'dependency-audit.json'), JSON.stringify(result, null, 2));
console.log('DEP-AUDIT ' + JSON.stringify({ entryPoints: result.entryPoints, filesTraversed: result.filesTraversed, external: (result.externalImports || []).length, dynamicUnresolved: (result.dynamicUnresolved || []).length, resolvedStatically: (result.dynamicResolvedStatically || []).length, ok: result.ok }));
process.exit(exitCode);
