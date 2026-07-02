// renderer/js/r3-0d-contracts-bundle.js — GENERATED, DO NOT EDIT BY HAND.
// Concatenation of contracts/r3.0d/* in dependency order for browser use.
// Node test harness loads contracts/r3.0d/* directly; this bundle is browser-only.
// Regenerate via:  node tools/build-r3-0d-browser-bundle.js

// ====== contracts/r3.0d/hardened-intrinsics.js ======
/**
 * contracts/r3.0d/hardened-intrinsics.js — R3.0D Hardened Intrinsics Toolkit.
 *
 * Single source of truth for closure-captured pristine intrinsic references and the narrow set
 * of safe wrappers that the rest of R3.0D's contract / runtime path is permitted to use.
 *
 * Codex D2 Round 15 architectural convergence (per SKYLINE directive 2026-06-29):
 *
 *   "只要內部不再執行ambient lookup ... 而只使用module-init捕獲、closure-private的pristine
 *    references，攻擊者替換ambient method後自我還原也沒有意義，因為hostile replacement根本不會
 *    被呼叫。"
 *
 * Rounds 1-15 demonstrated that any defence-in-depth that lets validation code call an AMBIENT
 * prototype method (`arr.push`, `Object.keys`, `String(x)`, `Number.isInteger`, …) is defeated by
 * a hostile replacement that self-restores on its own invocation. The integrity guard then sees
 * a clean state at the next checkpoint, but the validator already used the rebound binding.
 *
 * This module is the FOUNDATION layer. Every other R3.0D contract + the renderer must call ONLY
 * the safe wrappers exported here. Direct ambient property access (`Array.isArray`, `obj.length`,
 * `JSON.stringify`, `Object.freeze`, etc.) is FORBIDDEN throughout the validation path.
 *
 * The wrappers themselves capture pristine intrinsic references at module-init time (BEFORE any
 * caller code can run) and invoke them via captured `Reflect.apply`. They NEVER:
 *   - Use `.call`, `.apply`, or `.bind` on captured methods (those go through
 *     Function.prototype.* which is rebindable).
 *   - Use ambient property lookup on the captured object (which would fire prototype-chain
 *     accessors installed after import).
 *   - Fall back to JSON-round-trip for cloning (which invokes hostile toJSON / drops Symbols
 *     non-deterministically).
 *   - Invoke caller toJSON / Proxy traps / accessor descriptors (`.value` reads on a
 *     `_ObjectGetOwnPropertyDescriptor` result avoid `[[Get]]` semantics).
 *
 * Inputs that carry an accessor descriptor, a Symbol-keyed own property, a non-enumerable own
 * property, a non-Object.prototype prototype, an Array subclass, a mutated Array prototype, or
 * a class instance fail-closed at the structural audit (`deepOriginalShapeAudit`).
 *
 * UMD: Node require / Electron renderer global (R3_0D_HardenedIntrinsics).
 */
(function (root) {
  'use strict';

  // ─── PHASE 1 — closure-private intrinsic captures ────────────────────────────
  // Every primitive method we may directly or indirectly depend on. References are taken at
  // module evaluation time, BEFORE any external caller code runs. The captured refs are kept
  // in IIFE-local variables and NEVER exposed to the api object.

  // Container globals
  var _Object = Object;
  var _Array = Array;
  var _String_ctor = String;
  var _Number = Number;
  var _Function = Function;
  var _JSON = JSON;
  var _Reflect = (typeof Reflect !== 'undefined') ? Reflect : null;
  var _Math = Math;
  var _RegExp = RegExp;

  // Object.* statics
  var _ObjectCreate = Object.create;
  var _ObjectFreeze = Object.freeze;
  var _ObjectIsFrozen = Object.isFrozen;
  var _ObjectKeys = Object.keys;
  var _ObjectAssign = Object.assign;
  var _ObjectGetPrototypeOf = Object.getPrototypeOf;
  var _ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var _ObjectGetOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
  var _ObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
  var _ObjectDefineProperty = Object.defineProperty;

  // Object.prototype
  var _ObjectPrototypeHasOwnProperty = Object.prototype.hasOwnProperty;

  // Array.* statics
  var _ArrayIsArray = Array.isArray;

  // Array.prototype
  var _ArrayPrototypePush = Array.prototype.push;
  var _ArrayPrototypeIndexOf = Array.prototype.indexOf;
  var _ArrayPrototypeForEach = Array.prototype.forEach;
  var _ArrayPrototypeMap = Array.prototype.map;
  var _ArrayPrototypeSlice = Array.prototype.slice;
  var _ArrayPrototypeSort = Array.prototype.sort;
  var _ArrayPrototypeJoin = Array.prototype.join;
  var _ArrayPrototypeConcat = Array.prototype.concat;
  var _ArrayPrototypeShift = Array.prototype.shift;
  // Array prototype reference itself for prototype-identity checks
  var _ArrayPrototype = Array.prototype;
  var _ObjectPrototype = Object.prototype;

  // Reflect
  var _ReflectApply = _Reflect ? Reflect.apply : null;
  var _ReflectOwnKeys = _Reflect ? Reflect.ownKeys : null;

  // String global function (number-to-string + general value coercion)
  var _StringCoerce = String;

  // String.prototype
  var _StringPrototypeCharAt = String.prototype.charAt;
  var _StringPrototypeCharCodeAt = String.prototype.charCodeAt;
  var _StringPrototypeSlice = String.prototype.slice;
  var _StringPrototypeNormalize = String.prototype.normalize;
  var _StringPrototypeToLowerCase = String.prototype.toLowerCase;

  // Number.* statics + prototype
  var _NumberIsFinite = Number.isFinite;
  var _NumberIsInteger = Number.isInteger;
  var _NumberIsNaN = Number.isNaN;
  var _NumberPrototypeToString = Number.prototype.toString;

  // Math
  var _MathFloor = Math.floor;

  // RegExp.prototype
  var _RegExpPrototypeTest = RegExp.prototype.test;

  // JSON
  var _JSONStringify = JSON.stringify;
  var _JSONParse = JSON.parse;

  // TextEncoder / structuredClone (modern-runtime guaranteed in our target environments).
  // Codex D2 Round 16 RN-28 closure: capture TextEncoder.prototype.encode at module-init so
  // safeUtf8ByteLength never invokes the instance's `.encode` method via ambient property
  // lookup. A hostile TextEncoder.prototype.encode replacement is then unreachable.
  var _TextEncoderCtor = (typeof TextEncoder !== 'undefined') ? TextEncoder : null;
  var _TextEncoderPrototypeEncode = _TextEncoderCtor ? TextEncoder.prototype.encode : null;
  var _StructuredCloneFn = (typeof structuredClone === 'function') ? structuredClone : null;

  // Sentinel for failed structural reads (distinguishable from any legitimate value).
  var _SENTINEL = _ObjectFreeze({ __hardenedIntrinsicsSentinel__: true });

  // ─── PHASE 2 — safe wrappers (the ONLY public surface) ───────────────────────
  // Every wrapper uses captured refs + captured Reflect.apply. None invoke any ambient
  // method, .call, .apply, .bind, JSON fallback, toJSON, or getter/accessor.

  // _apply(fn, thisArg, argsArray) — invoke a captured function via captured Reflect.apply.
  // Reflect.apply uses the function's [[Call]] internal slot directly, bypassing
  // Function.prototype.call (which is rebindable).
  function _apply(fn, thisArg, argsArray) {
    if (_ReflectApply === null) {
      // Modern runtimes (Node 17+, browsers ~2022+) guarantee Reflect.apply. Fail-closed
      // rather than fall back to .call which is itself rebindable.
      return _SENTINEL;
    }
    try { return _ReflectApply(fn, thisArg, argsArray); }
    catch (e) { return _SENTINEL; }
  }

  // safeOwnKeys(obj) — Reflect.ownKeys via captured Reflect.apply. Returns an array of
  // string and symbol keys, or null on failure.
  function safeOwnKeys(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object' && typeof obj !== 'function') return null;
    var r = _apply(_ReflectOwnKeys, _Reflect, [obj]);
    if (r === _SENTINEL) return null;
    return r;
  }

  // safeKeys(obj) — Object.keys (enumerable string keys only).
  function safeKeys(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return null;
    var r = _apply(_ObjectKeys, _Object, [obj]);
    if (r === _SENTINEL) return null;
    return r;
  }

  // safeGetOwnDescriptor(obj, key) — structural descriptor read (no [[Get]] invocation,
  // so a Proxy's get trap / a value accessor does NOT fire). Returns the descriptor record
  // or null. Note that returning an accessor descriptor (no `value` field) signals
  // tampering / accessor presence — callers MUST check `'value' in d`.
  function safeGetOwnDescriptor(obj, key) {
    if (obj === null || obj === undefined) return null;
    var r = _apply(_ObjectGetOwnPropertyDescriptor, _Object, [obj, key]);
    if (r === _SENTINEL) return null;
    return r;
  }

  // safeGetOwnPropertyNames(obj) — Object.getOwnPropertyNames via captured ref. Returns ALL
  // own string keys (enumerable AND non-enumerable), or null on failure.
  function safeGetOwnPropertyNames(obj) {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return null;
    var r = _apply(_ObjectGetOwnPropertyNames, _Object, [obj]);
    if (r === _SENTINEL) return null;
    return r;
  }

  // safeGetPrototypeOf(obj) — Object.getPrototypeOf via captured ref. Returns the prototype
  // (for a Proxy this invokes the getPrototypeOf trap, which is the spec behaviour — callers
  // must handle Proxy-lying via deepOriginalShapeAudit at the boundary).
  function safeGetPrototypeOf(obj) {
    if (obj === null || obj === undefined) return null;
    var r = _apply(_ObjectGetPrototypeOf, _Object, [obj]);
    if (r === _SENTINEL) return null;
    return r;
  }

  // safeDefineDataProperty(obj, key, value) — install an own data descriptor via
  // [[DefineOwnProperty]] (bypasses [[Set]] / setters on Object.prototype or Array.prototype).
  // Returns true on success, false on failure.
  function safeDefineDataProperty(obj, key, value) {
    if (obj === null || obj === undefined) return false;
    var r = _apply(_ObjectDefineProperty, _Object, [obj, key, { value: value, writable: true, enumerable: true, configurable: true }]);
    return r !== _SENTINEL;
  }

  // safeHasOwn(obj, key) — own-property check via descriptor read (avoids
  // Object.prototype.hasOwnProperty.call rebinding AND Function.prototype.call rebinding).
  function safeHasOwn(obj, key) {
    var d = safeGetOwnDescriptor(obj, key);
    return d !== null && d !== undefined;
  }

  // safeArrayPush(arr, value) — install an own data descriptor at arr.length. Bypasses
  // Array.prototype.push rebinding AND any Array.prototype["N"] setter installation.
  function safeArrayPush(arr, value) {
    if (arr === null || arr === undefined) return false;
    var len;
    try { len = arr.length; } catch (e) { return false; }
    if (typeof len !== 'number') return false;
    return safeDefineDataProperty(arr, len, value);
  }

  // safeArrayIndexOf(arr, target) — direct equality search via own-indexed reads.
  // Returns -1 on failure or absence.
  function safeArrayIndexOf(arr, target) {
    if (arr === null || arr === undefined) return -1;
    var len;
    try { len = arr.length; } catch (e) { return -1; }
    if (typeof len !== 'number') return -1;
    len = len | 0;
    for (var i = 0; i < len; i++) {
      var v;
      try { v = arr[i]; } catch (e) { return -1; }
      if (v === target) return i;
    }
    return -1;
  }

  // safeArrayForEach(arr, fn) — direct-loop forEach. fn is a closure provided by the
  // CONTRACT module (trusted), not the caller. Returns undefined.
  function safeArrayForEach(arr, fn) {
    if (arr === null || arr === undefined) return;
    var len;
    try { len = arr.length; } catch (e) { return; }
    if (typeof len !== 'number') return;
    len = len | 0;
    for (var i = 0; i < len; i++) {
      try { fn(arr[i], i); } catch (e) { /* fn is trusted but defensive */ }
    }
  }

  // safeArrayMap(arr, fn) — direct-loop map. fn is a trusted closure. Returns a new array
  // with elements written via defineProperty (bypasses prototype setters).
  function safeArrayMap(arr, fn) {
    var out = [];
    if (arr === null || arr === undefined) return out;
    var len;
    try { len = arr.length; } catch (e) { return out; }
    if (typeof len !== 'number') return out;
    len = len | 0;
    for (var i = 0; i < len; i++) {
      var mapped;
      try { mapped = fn(arr[i], i); } catch (e) { continue; }
      safeDefineDataProperty(out, i, mapped);
    }
    return out;
  }

  // safeArraySlice(arr) — direct-loop copy via defineProperty.
  function safeArraySlice(arr) {
    var out = [];
    if (arr === null || arr === undefined) return out;
    var len;
    try { len = arr.length; } catch (e) { return out; }
    if (typeof len !== 'number') return out;
    len = len | 0;
    for (var i = 0; i < len; i++) safeDefineDataProperty(out, i, arr[i]);
    return out;
  }

  // safeArraySort(arr, cmp) — Reflect.apply on captured Array.prototype.sort, with a manual
  // insertion-sort fallback if Reflect.apply is unavailable (fallback never rebound).
  function safeArraySort(arr, cmp) {
    if (arr === null || arr === undefined) return arr;
    var args = cmp ? [cmp] : [];
    var r = _apply(_ArrayPrototypeSort, arr, args);
    if (r !== _SENTINEL) return r;
    // Manual insertion sort fallback
    var len;
    try { len = arr.length; } catch (e) { return arr; }
    if (typeof len !== 'number') return arr;
    for (var s = 1; s < len; s++) {
      var cur = arr[s];
      var k = s - 1;
      while (k >= 0 && (cmp ? cmp(arr[k], cur) > 0 : arr[k] > cur)) { arr[k + 1] = arr[k]; k--; }
      arr[k + 1] = cur;
    }
    return arr;
  }

  // safeStringSlice(s, start, end) — Reflect.apply on captured String.prototype.slice.
  function safeStringSlice(s, start, end) {
    if (typeof s !== 'string') return '';
    var args = (end === undefined) ? [start] : [start, end];
    var r = _apply(_StringPrototypeSlice, s, args);
    if (r === _SENTINEL || typeof r !== 'string') return '';
    return r;
  }

  // safeStringCharCodeAt(s, i) — Reflect.apply on captured charCodeAt.
  function safeStringCharCodeAt(s, i) {
    if (typeof s !== 'string') return NaN;
    var r = _apply(_StringPrototypeCharCodeAt, s, [i]);
    if (r === _SENTINEL) return NaN;
    return r;
  }

  // safeRegExpTest(re, s) — Reflect.apply on captured RegExp.prototype.test.
  function safeRegExpTest(re, s) {
    var r = _apply(_RegExpPrototypeTest, re, [s]);
    if (r === _SENTINEL) return false;
    return r === true;
  }

  // safeNumberIsInteger(n) — captured Number.isInteger.
  function safeNumberIsInteger(n) {
    var r = _apply(_NumberIsInteger, _Number, [n]);
    if (r === _SENTINEL) return false;
    return r === true;
  }

  // safeNumberIsFinite(n) — captured Number.isFinite.
  function safeNumberIsFinite(n) {
    var r = _apply(_NumberIsFinite, _Number, [n]);
    if (r === _SENTINEL) return false;
    return r === true;
  }

  // safeMathFloor(n) — captured Math.floor.
  function safeMathFloor(n) {
    var r = _apply(_MathFloor, _Math, [n]);
    if (r === _SENTINEL) return NaN;
    return r;
  }

  // safeUtf8ByteLength(s) — UTF-8 byte width via captured TextEncoder constructor. Falls back
  // to manual char-code summation (using safeStringCharCodeAt, all captured) if TextEncoder is
  // somehow unavailable. Lone surrogates count as 6 bytes (\uXXXX JSON escape width).
  function safeUtf8ByteLength(s) {
    if (typeof s !== 'string') return 0;
    if (_TextEncoderCtor !== null && _TextEncoderPrototypeEncode !== null) {
      try {
        var enc = new _TextEncoderCtor();
        // Codex D2 Round 16 RN-28 closure: invoke captured TextEncoder.prototype.encode via
        // captured Reflect.apply rather than the instance's `.encode` property — that ambient
        // property lookup would invoke a rebound prototype method (or a Proxy get trap on the
        // instance, which is what the Uint8Array adapter returns in some host implementations).
        var arr = _apply(_TextEncoderPrototypeEncode, enc, [s]);
        if (arr !== _SENTINEL && arr && typeof arr.length === 'number') return arr.length;
      } catch (e) { /* fall through to manual */ }
    }
    var n = 0;
    var len = s.length;
    for (var i = 0; i < len; i++) {
      var c = safeStringCharCodeAt(s, i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xDC00 && c <= 0xDFFF) n += 6; // lone low surrogate -> \uXXXX
      else if (c >= 0xD800 && c <= 0xDBFF) {       // high surrogate
        if (i + 1 < len) {
          var c2 = safeStringCharCodeAt(s, i + 1);
          if (c2 >= 0xDC00 && c2 <= 0xDFFF) { n += 4; i++; continue; } // valid pair = 4-byte UTF-8
        }
        n += 6; // lone high -> \uXXXX
      }
      else n += 3;
    }
    return n;
  }

  // safeStructuredClone(v) — captured structuredClone. Returns null on failure (DataCloneError
  // / unavailable runtime). Note: structuredClone DOES invoke Proxy [[Get]] / [[OwnPropertyKeys]]
  // traps during the clone — callers that need full immunity from Proxy traps should do a
  // deepOriginalShapeAudit on the original BEFORE invoking structuredClone.
  function safeStructuredClone(v) {
    if (_StructuredCloneFn === null) return null;
    var r = _apply(_StructuredCloneFn, undefined, [v]);
    if (r === _SENTINEL) return null;
    return r;
  }

  // safeStringCoerce(v) — global String(v) for non-string primitives. Captures the global
  // function reference so rebinding globalThis.String has no effect.
  function safeStringCoerce(v) {
    var r = _apply(_StringCoerce, undefined, [v]);
    if (r === _SENTINEL) return '';
    return r;
  }

  // safeStringToLowerCase(s) — Reflect.apply on captured String.prototype.toLowerCase. Required
  // by reason-codes.js when computing per-code i18n explanation keys from UPPER_SNAKE constants
  // (e.g. 'EVIDENCE_NODE_INVALID' -> 'r3_0d.reason.evidence_node_invalid'). Without a wrapper the
  // ambient `str.toLowerCase()` call would route through a rebindable prototype method.
  function safeStringToLowerCase(s) {
    if (typeof s !== 'string') return '';
    var r = _apply(_StringPrototypeToLowerCase, s, []);
    if (r === _SENTINEL || typeof r !== 'string') return '';
    return r;
  }

  // safeIsArray(v) — captured Array.isArray invocation. The standalone replacement for ambient
  // `Array.isArray(v)`. Note: a hostile Proxy can lie about being an array (its [[OwnPropertyKeys]]
  // makes Array.isArray return true) — callers needing full integrity must additionally validate
  // via deepOriginalShapeAudit (which also confirms Array.prototype identity).
  function safeIsArray(v) {
    var r = _apply(_ArrayIsArray, _Array, [v]);
    if (r === _SENTINEL) return false;
    return r === true;
  }

  // safeIsPlainShape(v) — TOP-LEVEL (non-recursive) plain-shape classification. Returns one of:
  //   'plain-object' — v is a non-null, non-array object whose prototype is exactly
  //                    Object.prototype or null. Class instances are rejected.
  //   'plain-array'  — v passes Array.isArray AND its prototype is exactly Array.prototype.
  //                    Array subclasses and arrays with mutated prototypes are rejected.
  //   'reject'       — anything else (null, primitive, function, class instance, Array subclass,
  //                    or any prototype-of access failure).
  // Required by reason-codes.js helpers (_isOriginalPlainObject, _hasNonPlainNestedObject) so
  // they can perform the prototype-identity check WITHOUT exposing the captured Object.prototype
  // / Array.prototype references to callers. The check itself uses captured intrinsics only.
  function safeIsPlainShape(v) {
    if (v === null || typeof v !== 'object') return 'reject';
    var isArr = safeIsArray(v);
    var proto = safeGetPrototypeOf(v);
    if (isArr) {
      if (proto !== _ArrayPrototype) return 'reject';
      return 'plain-array';
    }
    if (proto === _ObjectPrototype || proto === null) return 'plain-object';
    return 'reject';
  }

  // deepOriginalShapeAudit(v, depth) — recursive structural validator. Returns true ONLY if v
  // is composed exclusively of plain objects (Object.prototype proto), plain arrays
  // (Array.prototype proto, NOT subclass), strings, finite numbers, booleans, null. Rejects:
  //   - class instances (non-Object.prototype proto)
  //   - Array subclasses (non-Array.prototype proto)
  //   - Proxies that lie about their prototype (lying still produces a wrong proto here)
  //   - Symbol-keyed own properties at any depth
  //   - Non-enumerable own properties at any depth
  //   - Accessor descriptors at any depth
  //   - Function values
  //   - Infinity / NaN numbers
  //   - Recursion past depth cap (32)
  // Calls captured intrinsics only; the audit itself never invokes a [[Get]] on the input
  // (uses descriptor reads exclusively).
  function deepOriginalShapeAudit(v, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 32) return false;
    if (v === null) return true;
    var t = typeof v;
    if (t === 'string' || t === 'boolean') return true;
    if (t === 'number') return safeNumberIsFinite(v);
    if (t === 'function' || t === 'symbol' || t === 'undefined') return false;
    if (t !== 'object') return false;
    // prototype check
    var proto = safeGetPrototypeOf(v);
    var isPlainArray = false;
    if (proto === null) {
      // Object.create(null) — accept; treated as plain object with null proto
    } else if (proto === _ObjectPrototype) {
      // plain object
    } else if (proto === _ArrayPrototype) {
      // plain array — additional check: Array.isArray must agree
      var isArr = _apply(_ArrayIsArray, _Array, [v]);
      if (isArr !== true) return false;
      isPlainArray = true;
    } else {
      return false; // class instance / Array subclass / mutated prototype
    }
    // structural key audit (own keys, including non-enumerable, including Symbol)
    var allKeys = safeOwnKeys(v);
    if (allKeys === null) return false;
    var enumKeysOnly = safeKeys(v);
    if (enumKeysOnly === null) return false;
    // For plain Array: an extra non-enumerable own property "length" is intrinsic (every
    // Array has it by spec). Accept exactly that one extra. Any OTHER non-enumerable or
    // Symbol key is a rejection signal.
    var allowedExtra = isPlainArray ? 1 : 0;
    if (allKeys.length !== enumKeysOnly.length + allowedExtra) return false;
    var len = allKeys.length;
    for (var i = 0; i < len; i++) {
      var k = allKeys[i];
      if (typeof k === 'symbol') return false;
      var d = safeGetOwnDescriptor(v, k);
      if (d === null || d === undefined) return false;
      if (!('value' in d)) return false; // accessor descriptor
      // Allow the intrinsic Array length (non-enumerable). For all other keys, must be enumerable.
      if (d.enumerable !== true) {
        if (!(isPlainArray && k === 'length')) return false;
      }
      // Recurse into nested
      var child = d.value;
      if (typeof child === 'object' && child !== null) {
        if (!deepOriginalShapeAudit(child, depth + 1)) return false;
      }
      else if (typeof child === 'number') {
        if (!safeNumberIsFinite(child)) return false;
      }
      else if (typeof child === 'function' || typeof child === 'symbol' || typeof child === 'undefined') {
        return false;
      }
    }
    return true;
  }

  // safeObjectCreateNull() — return a fresh object with a NULL prototype using the captured
  // Object.create reference invoked via Reflect.apply. Added 2026-06-29 for the renderer
  // evidence-graph builder which uses `_ObjectCreate(null)` as a Map-shaped sentinel (proto-null
  // bag where attacker-controlled nodeIds like 'constructor' / '__proto__' cannot collide with
  // Object.prototype keys). Without this wrapper the caller would need its own captured
  // reference, fragmenting the single-source-of-truth invariant. No-arg only — the wrapper does
  // not accept a custom prototype because every R3.0D caller wants the null-proto case.
  function safeObjectCreateNull() {
    var r = _apply(_ObjectCreate, _Object, [null]);
    if (r === _SENTINEL) return null;
    return r;
  }

  // safeObjectAssign(target, source) — shallow-copy `source`'s own enumerable string-keyed
  // properties into `target` using captured intrinsics ONLY. NEVER invokes Object.assign
  // (which routes through ambient [[Get]] / Proxy traps and Object.prototype setters). Each
  // copied key goes through safeDefineDataProperty so prototype setters are bypassed. Values
  // are read via descriptor access (no [[Get]] trap fires). Returns target.
  //
  // Added 2026-06-29 for evidence-node-contract.js per-node sanitized-output construction
  // (replaces `Object.freeze(Object.assign({}, n.observation.params))`). Single-purpose
  // narrow helper: callers that need a more elaborate merge / multi-source assign should
  // compose this with safeKeys themselves rather than expand the helper surface here.
  function safeObjectAssign(target, source) {
    if (target === null || target === undefined) return target;
    if (source === null || source === undefined) return target;
    if (typeof source !== 'object') return target;
    var keys = safeKeys(source);
    if (keys === null) return target;
    var len = keys.length;
    for (var i = 0; i < len; i++) {
      var k = keys[i];
      var d = safeGetOwnDescriptor(source, k);
      if (d === null || d === undefined) continue;
      if (!('value' in d)) continue; // accessor descriptor — skip rather than fire its getter
      safeDefineDataProperty(target, k, d.value);
    }
    return target;
  }

  // deepFreeze(v) — recursive Object.freeze via captured _ObjectFreeze. Skips primitives,
  // freezes both arrays and plain objects + their reachable subtree. Returns v.
  function deepFreeze(v) {
    if (v === null || typeof v !== 'object') return v;
    var keys = safeKeys(v);
    if (keys !== null) {
      var len = keys.length;
      for (var i = 0; i < len; i++) {
        var nested = v[keys[i]];
        if (typeof nested === 'object' && nested !== null) deepFreeze(nested);
      }
    }
    _apply(_ObjectFreeze, _Object, [v]);
    return v;
  }

  // stableStringify(value) — canonical JSON serializer, sorted keys at every depth, NO toJSON
  // invocation anywhere. Walks via safeKeys + manual recursion + direct primitive encoding.
  // Used for canonical bytes (graphId / dedup) AND envelope byte cap measurement.
  function stableStringify(value) {
    if (value === null) return 'null';
    var t = typeof value;
    if (t === 'string') {
      // Captured _JSONStringify on a PRIMITIVE string never invokes toJSON (per ES
      // §25.5.2.2 SerializeJSONProperty: toJSON is only consulted when Type(value) is Object).
      var r = _apply(_JSONStringify, _JSON, [value]);
      if (r === _SENTINEL || typeof r !== 'string') return '""';
      return r;
    }
    if (t === 'number') {
      if (!safeNumberIsFinite(value)) return 'null';
      return safeStringCoerce(value);
    }
    if (t === 'boolean') return value ? 'true' : 'false';
    if (t === 'undefined') return 'null';
    var isArr = _apply(_ArrayIsArray, _Array, [value]);
    if (isArr === true) {
      var result = '[';
      var len;
      try { len = value.length; } catch (e) { return 'null'; }
      if (typeof len !== 'number') return 'null';
      for (var i = 0; i < len; i++) {
        if (i > 0) result += ',';
        result += stableStringify(value[i]);
      }
      return result + ']';
    }
    if (t === 'object') {
      var keys = safeKeys(value);
      if (keys === null) return 'null';
      // Manual insertion sort — no .sort dependency.
      var sortLen = keys.length;
      for (var s = 1; s < sortLen; s++) {
        var cur = keys[s];
        var k = s - 1;
        while (k >= 0 && keys[k] > cur) { keys[k + 1] = keys[k]; k--; }
        keys[k + 1] = cur;
      }
      var obj = '{';
      for (var j = 0; j < sortLen; j++) {
        if (j > 0) obj += ',';
        var key = keys[j];
        var qkey = _apply(_JSONStringify, _JSON, [key]);
        if (qkey === _SENTINEL || typeof qkey !== 'string') return 'null';
        obj += qkey + ':' + stableStringify(value[key]);
      }
      return obj + '}';
    }
    return 'null';
  }

  // ─── Public API (the ONLY exported surface) ──────────────────────────────────
  // Captured intrinsics are NOT exported. The capture refs are deliberately kept in IIFE-local
  // variables to prevent the caller from substituting them. Even the api object itself is
  // frozen so callers can't replace wrapper bindings.
  var api = {
    safeOwnKeys: safeOwnKeys,
    safeKeys: safeKeys,
    safeGetOwnDescriptor: safeGetOwnDescriptor,
    safeGetOwnPropertyNames: safeGetOwnPropertyNames,
    safeGetPrototypeOf: safeGetPrototypeOf,
    safeDefineDataProperty: safeDefineDataProperty,
    safeHasOwn: safeHasOwn,
    safeArrayPush: safeArrayPush,
    safeArrayIndexOf: safeArrayIndexOf,
    safeArrayForEach: safeArrayForEach,
    safeArrayMap: safeArrayMap,
    safeArraySlice: safeArraySlice,
    safeArraySort: safeArraySort,
    safeStringSlice: safeStringSlice,
    safeStringCharCodeAt: safeStringCharCodeAt,
    safeRegExpTest: safeRegExpTest,
    safeNumberIsInteger: safeNumberIsInteger,
    safeNumberIsFinite: safeNumberIsFinite,
    safeMathFloor: safeMathFloor,
    safeUtf8ByteLength: safeUtf8ByteLength,
    safeStructuredClone: safeStructuredClone,
    safeStringCoerce: safeStringCoerce,
    safeStringToLowerCase: safeStringToLowerCase,
    safeIsArray: safeIsArray,
    safeIsPlainShape: safeIsPlainShape,
    safeObjectCreateNull: safeObjectCreateNull,
    safeObjectAssign: safeObjectAssign,
    deepOriginalShapeAudit: deepOriginalShapeAudit,
    deepFreeze: deepFreeze,
    stableStringify: stableStringify,
  };
  _ObjectFreeze(api);

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { _ObjectDefineProperty(root, 'R3_0D_HardenedIntrinsics', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0D_HardenedIntrinsics = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/reason-codes.js ======
/**
 * contracts/r3.0d/reason-codes.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * The single, frozen, machine-readable registry of R3.0D Decision Engine reason codes. This module is a
 * CONTRACT artifact only:
 *   • lives OUTSIDE renderer/js/ — the R3-GATE0 R3.0D scope guard does not apply;
 *   • has NO runtime consumer, is required by NO production module, imports NOTHING from renderer/js/;
 *   • contains NO algorithm — no graph traversal, no rule evaluation, no priority ranking, no causal
 *     inference. Codes + a shared blocked-result factory only.
 *
 * Codes are stable, unique, UPPER_SNAKE string constants (machine-readable; never replaced by free text).
 * Each code carries a stable i18n explanation KEY (a hook for a human-readable rendering) — never UI prose.
 *
 * R3.0D hardened-intrinsics refactor: every ambient intrinsic call routed through the
 * closure-captured wrappers in contracts/r3.0d/hardened-intrinsics.js. No direct ambient
 * Object.* / Array.* / String() / structuredClone() / .push / .forEach / .map / .slice
 * remains in this file. See the per-call comments below.
 *
 * UMD: Node require / Electron renderer global (R3_0D_ReasonCodes). (Global export is for symmetry with the
 * codebase UMD convention; nothing in renderer/js/ requires it — D1 wires no consumer.)
 */
(function (root) {
  'use strict';

  // ─── Hardened-intrinsics import ─────────────────────────────────────────────
  // Every primitive-method dependency in this file goes through HI.*. Ambient
  // Object.* / Array.* / String() / structuredClone(...) calls are FORBIDDEN here.
  var HI = (typeof module !== 'undefined' && module.exports)
    ? require('./hardened-intrinsics.js')
    : (root && root.R3_0D_HardenedIntrinsics);

  // R3.0D reason codes. Grouped by the directive Section 8 / 9 / 10 dimensions:
  //  • EVIDENCE_*           — evidence-graph structural rejections (D1 + D2)
  //  • HYPOTHESIS_*         — hypothesis-shape + causal-overclaim rejections (D1 + D3)
  //  • RECOMMENDATION_*     — recommendation + priority rejections (D1 + D4)
  //  • VALIDATION_ACTION_*  — validation-action rejections
  //  • CANNOT_CONCLUDE      — the structurally-mandated outcome when evidence is insufficient
  //  • LIMITATION_*         — bounded-honesty limitation codes
  //  • SOURCE_IDENTITY_*    — case/session/lap binding rejections
  //  • BRIEF_*              — engineer-brief composition rejections
  //  • Structural / fail-closed: INTERNAL_CONTRACT_VIOLATION, UNSUPPORTED_FUTURE_SCHEMA,
  //    PROTOTYPE_POLLUTION_REJECTED, NUMERIC_INVALID, BYTE_CAP_EXCEEDED, ARRAY_CAP_EXCEEDED.
  // The REASON_CODES object literal is built via a plain literal (allowed: literal construction
  // uses [[CreateDataPropertyOrThrow]], not [[Set]]) then deep-frozen via HI.deepFreeze.
  var REASON_CODES = HI.deepFreeze({
    // Evidence (D1 structural + D2 graph)
    EVIDENCE_NODE_INVALID: 'EVIDENCE_NODE_INVALID',
    EVIDENCE_NODE_MISSING_ID: 'EVIDENCE_NODE_MISSING_ID',
    EVIDENCE_NODE_ID_FORBIDDEN: 'EVIDENCE_NODE_ID_FORBIDDEN',
    EVIDENCE_CATEGORY_UNKNOWN: 'EVIDENCE_CATEGORY_UNKNOWN',
    EVIDENCE_CREDIBILITY_INVALID: 'EVIDENCE_CREDIBILITY_INVALID',
    EVIDENCE_PROVENANCE_INVALID: 'EVIDENCE_PROVENANCE_INVALID',
    EVIDENCE_CONFIDENCE_FORBIDDEN: 'EVIDENCE_CONFIDENCE_FORBIDDEN',
    EVIDENCE_FRESHNESS_STALE: 'EVIDENCE_FRESHNESS_STALE',
    EVIDENCE_ASSOCIATION_MISMATCH: 'EVIDENCE_ASSOCIATION_MISMATCH',
    EVIDENCE_OBSERVATION_INVALID: 'EVIDENCE_OBSERVATION_INVALID',
    EVIDENCE_DUPLICATE_ID: 'EVIDENCE_DUPLICATE_ID',
    EVIDENCE_GRAPH_CYCLE: 'EVIDENCE_GRAPH_CYCLE',
    EVIDENCE_GRAPH_ORPHAN: 'EVIDENCE_GRAPH_ORPHAN',
    EVIDENCE_GRAPH_SELF_REFERENCE: 'EVIDENCE_GRAPH_SELF_REFERENCE',
    EVIDENCE_GRAPH_BOUNDS_EXCEEDED: 'EVIDENCE_GRAPH_BOUNDS_EXCEEDED',
    EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT: 'EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT',
    EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT: 'EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT',
    EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN: 'EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN',

    // Hypothesis (D1 shape + D3 causal-overclaim guard)
    HYPOTHESIS_INVALID: 'HYPOTHESIS_INVALID',
    HYPOTHESIS_CAUSAL_OVERCLAIM: 'HYPOTHESIS_CAUSAL_OVERCLAIM',
    HYPOTHESIS_CONFIDENCE_FORBIDDEN: 'HYPOTHESIS_CONFIDENCE_FORBIDDEN',
    HYPOTHESIS_AUTHORITY_FORGED: 'HYPOTHESIS_AUTHORITY_FORGED',
    HYPOTHESIS_CATEGORY_UNKNOWN: 'HYPOTHESIS_CATEGORY_UNKNOWN',
    HYPOTHESIS_EVIDENCE_LINK_INVALID: 'HYPOTHESIS_EVIDENCE_LINK_INVALID',
    HYPOTHESIS_CONTRADICTION_INVALID: 'HYPOTHESIS_CONTRADICTION_INVALID',
    HYPOTHESIS_ALTERNATIVE_INVALID: 'HYPOTHESIS_ALTERNATIVE_INVALID',
    HYPOTHESIS_DRIVER_BLAME_FORBIDDEN: 'HYPOTHESIS_DRIVER_BLAME_FORBIDDEN',
    HYPOTHESIS_PROFESSIONAL_DIAGNOSIS_FORBIDDEN: 'HYPOTHESIS_PROFESSIONAL_DIAGNOSIS_FORBIDDEN',
    HYPOTHESIS_GUARANTEED_FIX_FORBIDDEN: 'HYPOTHESIS_GUARANTEED_FIX_FORBIDDEN',
    HYPOTHESIS_FREE_TEXT_CAUSAL_AUTHORITY_FORBIDDEN: 'HYPOTHESIS_FREE_TEXT_CAUSAL_AUTHORITY_FORBIDDEN',

    // Recommendation + Priority (D1 shape + D4)
    RECOMMENDATION_INVALID: 'RECOMMENDATION_INVALID',
    RECOMMENDATION_BLOCKED: 'RECOMMENDATION_BLOCKED',
    RECOMMENDATION_AUTO_TUNING_FORBIDDEN: 'RECOMMENDATION_AUTO_TUNING_FORBIDDEN',
    RECOMMENDATION_AUTO_SETUP_FORBIDDEN: 'RECOMMENDATION_AUTO_SETUP_FORBIDDEN',
    RECOMMENDATION_AUTO_CALIBRATION_FORBIDDEN: 'RECOMMENDATION_AUTO_CALIBRATION_FORBIDDEN',
    RECOMMENDATION_AUTO_PRESET_FORBIDDEN: 'RECOMMENDATION_AUTO_PRESET_FORBIDDEN',
    RECOMMENDATION_SETUP_WITHOUT_QUALIFIED_EVIDENCE: 'RECOMMENDATION_SETUP_WITHOUT_QUALIFIED_EVIDENCE',
    RECOMMENDATION_PRIORITY_INVALID: 'RECOMMENDATION_PRIORITY_INVALID',
    RECOMMENDATION_PRIORITY_OUT_OF_ORDER: 'RECOMMENDATION_PRIORITY_OUT_OF_ORDER',

    // Validation actions
    VALIDATION_ACTION_INVALID: 'VALIDATION_ACTION_INVALID',
    VALIDATION_ACTION_UNKNOWN_KIND: 'VALIDATION_ACTION_UNKNOWN_KIND',

    // Honest-outcome codes
    CANNOT_CONCLUDE: 'CANNOT_CONCLUDE',
    INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
    INCONCLUSIVE_DATA_QUALITY: 'INCONCLUSIVE_DATA_QUALITY',
    INCONCLUSIVE_CONTRADICTION: 'INCONCLUSIVE_CONTRADICTION',

    // Limitations (bounded honesty)
    LIMITATION_MISSING_CHANNEL: 'LIMITATION_MISSING_CHANNEL',
    LIMITATION_SYNTHETIC_ONLY: 'LIMITATION_SYNTHETIC_ONLY',
    // Codex D-GATE-02 closure: D2 propagates this limitation whenever the sanitized graph
    // contains ANY node with sourceId === 'imported_summary'; D3 carries it into the
    // hypothesisSet.limitations union; D5 service rejects the brief at composition time
    // (the imported-summary path can never produce an authoritative engineer brief, even
    // if its credibility is below 'measured').
    LIMITATION_IMPORTED_SUMMARY: 'LIMITATION_IMPORTED_SUMMARY',
    LIMITATION_UNCALIBRATED_INPUT: 'LIMITATION_UNCALIBRATED_INPUT',
    LIMITATION_HEURISTIC_ONLY: 'LIMITATION_HEURISTIC_ONLY',
    LIMITATION_SINGLE_LAP_SAMPLE: 'LIMITATION_SINGLE_LAP_SAMPLE',
    LIMITATION_NO_CONTROLLED_REPEAT: 'LIMITATION_NO_CONTROLLED_REPEAT',
    LIMITATION_SCOPE_SAME_SESSION_ONLY: 'LIMITATION_SCOPE_SAME_SESSION_ONLY',

    // Source identity (case / session / lap / source binding)
    SOURCE_IDENTITY_INVALID: 'SOURCE_IDENTITY_INVALID',
    SOURCE_IDENTITY_FORGED: 'SOURCE_IDENTITY_FORGED',
    SOURCE_IDENTITY_CASE_MISMATCH: 'SOURCE_IDENTITY_CASE_MISMATCH',
    SOURCE_IDENTITY_SESSION_MISMATCH: 'SOURCE_IDENTITY_SESSION_MISMATCH',
    SOURCE_IDENTITY_LAP_MISMATCH: 'SOURCE_IDENTITY_LAP_MISMATCH',
    SOURCE_IDENTITY_VERSION_MISSING: 'SOURCE_IDENTITY_VERSION_MISSING',

    // Engineer Brief composition
    BRIEF_INVALID: 'BRIEF_INVALID',
    BRIEF_CONTRADICTION_HIDDEN: 'BRIEF_CONTRADICTION_HIDDEN',
    BRIEF_LIMITATION_HIDDEN: 'BRIEF_LIMITATION_HIDDEN',
    BRIEF_CANNOT_CONCLUDE_HIDDEN: 'BRIEF_CANNOT_CONCLUDE_HIDDEN',
    BRIEF_AUTHORITY_FORGED: 'BRIEF_AUTHORITY_FORGED',

    // Structural / fail-closed
    INTERNAL_CONTRACT_VIOLATION: 'INTERNAL_CONTRACT_VIOLATION',
    UNSUPPORTED_FUTURE_SCHEMA: 'UNSUPPORTED_FUTURE_SCHEMA',
    PROTOTYPE_POLLUTION_REJECTED: 'PROTOTYPE_POLLUTION_REJECTED',
    NUMERIC_INVALID: 'NUMERIC_INVALID',
    BYTE_CAP_EXCEEDED: 'BYTE_CAP_EXCEEDED',
    ARRAY_CAP_EXCEEDED: 'ARRAY_CAP_EXCEEDED',
    GRAPH_CAP_EXCEEDED: 'GRAPH_CAP_EXCEEDED',
    UNKNOWN_OWN_KEY: 'UNKNOWN_OWN_KEY',
  });

  // Build ALL_REASON_CODES via captured wrappers: safeKeys (replaces Object.keys),
  // safeArrayMap (replaces .map), then HI.deepFreeze (replaces Object.freeze).
  var ALL_REASON_CODES = HI.deepFreeze(
    HI.safeArrayMap(HI.safeKeys(REASON_CODES), function (k) { return REASON_CODES[k]; })
  );

  // human-readable explanation HOOK — a stable i18n key per code (the consumer renders it; this is never prose).
  // Built with safeArrayForEach + safeDefineDataProperty + safeStringToLowerCase to avoid
  // ambient .forEach / obj[k]=v / str.toLowerCase() lookups.
  var EXPLANATION_KEYS = HI.deepFreeze((function () {
    var m = {};
    HI.safeArrayForEach(ALL_REASON_CODES, function (c) {
      HI.safeDefineDataProperty(m, c, 'r3_0d.reason.' + HI.safeStringToLowerCase(c));
    });
    return m;
  })());

  // safeHasOwn replaces Object.prototype.hasOwnProperty.call.
  function isReasonCode(c) { return typeof c === 'string' && HI.safeHasOwn(EXPLANATION_KEYS, c); }
  function explanationKeyFor(c) { return isReasonCode(c) ? EXPLANATION_KEYS[c] : null; }

  // shared blocked-result factory (fail-closed). A blocked result NEVER carries a numeric / structured payload.
  function _normCodes(reasonCodes) {
    // safeIsArray replaces Array.isArray.
    var arr = HI.safeIsArray(reasonCodes) ? reasonCodes : (reasonCodes == null ? [] : [reasonCodes]);
    var seen = {}, out = [];
    // safeArrayForEach replaces .forEach; safeDefineDataProperty replaces seen[c]=true;
    // safeArrayPush replaces .push.
    HI.safeArrayForEach(arr, function (c) {
      if (isReasonCode(c) && !seen[c]) {
        HI.safeDefineDataProperty(seen, c, true);
        HI.safeArrayPush(out, c);
      }
    });
    if (out.length === 0) HI.safeArrayPush(out, REASON_CODES.INTERNAL_CONTRACT_VIOLATION); // fail-closed: never an empty block
    return out;
  }
  function buildBlockedResult(reasonCodes, opts) {
    opts = opts || {};
    var codes = _normCodes(reasonCodes);
    // safeArraySlice replaces .slice; safeArrayMap replaces .map; safeStringCoerce replaces String(...);
    // safeStringSlice replaces .slice on string; HI.deepFreeze replaces Object.freeze.
    var detail = (opts.detail != null) ? HI.safeStringSlice(HI.safeStringCoerce(opts.detail), 0, 200) : null;
    return HI.deepFreeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: HI.deepFreeze(HI.safeArraySlice(codes)),
      explanationKeys: HI.deepFreeze(HI.safeArrayMap(codes, explanationKeyFor)),
      detail: detail,
      result: null,
    });
  }

  // Codex D1 R2 Finding RN-06 closure: shared Proxy-rejection input cleanser. Every main validator
  // (validateSourceIdentity / validateEvidenceNodeShape / validateHypothesisShape /
  // validateRecommendationShape / validateEngineerBriefShape / validateDecisionInputShape) calls
  // _toCleanCopy AT ENTRY. The result is a plain-prototype deep clone — a Proxy whose ownKeys/get
  // traps lie about hidden state CANNOT survive: structuredClone enumerates via the engine's internal
  // [[OwnPropertyKeys]] + [[GetOwnProperty]] traps (same surface), but the resulting clone is a
  // PLAIN OBJECT whose own-property set is exactly what the Proxy reported. Downstream validators
  // operating on the clone therefore see EXACTLY what they validate — no parallel-universe hidden
  // properties remain reachable via direct property access on the original. structuredClone throw
  // (DataCloneError on functions / symbols-as-values / shared array buffers / etc.) → fail-closed.
  // JSON round-trip fallback when structuredClone unavailable: same posture but cannot preserve
  // certain shapes; fail-closed on any throw.
  function _toCleanCopy(v) {
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    // Codex D1 R3 Finding RN-11 closure: NO JSON.stringify fallback. HI.safeStructuredClone
    // returns null when structuredClone is unavailable OR when the clone throws — preserving the
    // original fail-closed posture (caller treats null as "not a plain object").
    return HI.safeStructuredClone(v);
  }
  /**
   * _hasHiddenOwnKey(v) — detects Symbol-keyed OR non-enumerable own properties on the TOP-LEVEL
   * of v. structuredClone silently drops both, so without this check a value like { caseId: 'x',
   * [hostileSym]: payload } would clone to { caseId: 'x' } and pass validation. The pre-clone check
   * rejects such inputs at the boundary so the failure surface mirrors the Codex D1 R1 RN-01
   * recommended behaviour exactly. Throws (Proxy traps lying) → treat as hidden (fail closed).
   *
   * Refactored: safeOwnKeys returns BOTH string + symbol own keys, safeGetOwnPropertyNames returns
   * all string own keys (enumerable + non-enumerable), safeKeys returns only enumerable string
   * keys. (a) any symbol key in safeOwnKeys → hidden. (b) allStringNames.length !==
   * enumStringKeys.length → at least one non-enumerable string own property → hidden.
   * Any wrapper-null return (= Proxy/intrinsic failure) → fail-closed = hidden.
   */
  function _hasHiddenOwnKey(v) {
    if (v === null || typeof v !== 'object') return false;
    var ownKeys = HI.safeOwnKeys(v);
    if (ownKeys === null) return true;
    var len = ownKeys.length;
    for (var i = 0; i < len; i++) {
      if (typeof ownKeys[i] === 'symbol') return true;
    }
    var allNames = HI.safeGetOwnPropertyNames(v);
    var enumKeys = HI.safeKeys(v);
    if (allNames === null || enumKeys === null) return true;
    if (allNames.length !== enumKeys.length) return true;
    return false;
  }
  /**
   * _isOriginalPlainObject(v) — Codex D1 R4 Finding RN-11 closure: prototype check on the ORIGINAL
   * input BEFORE structuredClone runs. structuredClone happily converts an ordinary class instance
   * into a plain object copy (DataCloneError only on a narrower set: functions, Symbol values,
   * SharedArrayBuffer with shared:true, etc.), which means a class instance with valid own fields
   * + an inherited toJSON method could otherwise pass _isPlain AFTER cloning even though the
   * ORIGINAL was a class instance. Calling this check BEFORE toCleanCopy in each main validator
   * makes class instances fail-closed at the boundary regardless of their own-field shape.
   *
   * Refactored to HI.safeIsPlainShape which performs the captured Array.isArray + captured
   * getPrototypeOf check internally. Returns true only for the 'plain-object' classification
   * (proto === Object.prototype OR null, non-array, non-null object).
   */
  function _isOriginalPlainObject(v) {
    return HI.safeIsPlainShape(v) === 'plain-object';
  }
  /**
   * _hasNonPlainNestedObject(v, depth) — Codex D1 R5 Finding RN-11 (nested-level) closure:
   * recursively walks the ORIGINAL input pre-clone and returns true if ANY nested object (at any
   * depth, including inside arrays) has a prototype that is not Object.prototype / null / Array.
   * Catches class instances embedded as identity / confidence / observation / nested entry values.
   * Also rejects accessor descriptors at any level — a hostile getter at depth would otherwise be
   * invoked by structuredClone's [[Get]] semantics. Symbol keys are silently skipped here (the
   * top-level hasHiddenOwnKey already rejects them at the boundary; descending into Symbol-keyed
   * subtrees would itself invoke their getters). Depth cap 32 prevents pathological recursion.
   *
   * Refactored: HI.safeIsPlainShape does the per-level Array-subclass / class-instance / mutated-
   * prototype rejection (Codex D1 R6 Finding RN-11 closure for array subclasses); HI.safeOwnKeys
   * + HI.safeGetOwnDescriptor handle the per-key walk; the .value structural read still avoids
   * invoking [[Get]] (so a hostile accessor at depth is never fired).
   */
  function _hasNonPlainNestedObject(v, depth) {
    if (depth == null) depth = 0;
    if (depth > 32) return true;
    if (v === null || typeof v !== 'object') return false;
    var shape = HI.safeIsPlainShape(v);
    if (shape === 'reject') return true;
    var keys = HI.safeOwnKeys(v);
    if (keys === null) return true;
    var len = keys.length;
    for (var i = 0; i < len; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return true; // any nested symbol key — fail closed
      var d = HI.safeGetOwnDescriptor(v, k);
      if (d === null || d === undefined) return true;
      if (typeof d.get === 'function' || typeof d.set === 'function') return true; // accessor descriptor
      if (_hasNonPlainNestedObject(d.value, depth + 1)) return true;
    }
    return false;
  }

  var api = {
    REASON_CODES: REASON_CODES,
    ALL_REASON_CODES: ALL_REASON_CODES,
    EXPLANATION_KEYS: EXPLANATION_KEYS,
    isReasonCode: isReasonCode,
    explanationKeyFor: explanationKeyFor,
    buildBlockedResult: buildBlockedResult,
    toCleanCopy: _toCleanCopy,
    hasHiddenOwnKey: _hasHiddenOwnKey,
    isOriginalPlainObject: _isOriginalPlainObject,
    hasNonPlainNestedObject: _hasNonPlainNestedObject,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_ReasonCodes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/credibility-contract.js ======
/**
 * contracts/r3.0d/credibility-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the Credibility ladder, Provenance enum, Confidence state, and Availability enum used by
 * every D-phase contract. Credibility is OWNED by the domain/service (it is an INPUT here); a
 * UI/consumer never derives it. This module only VALIDATES caller-supplied authority — it computes
 * no new measurement, reads no telemetry, makes no inference.
 *
 * Confidence discipline (directive §8 / D1 — Confidence):
 *   • A caller CANNOT directly supply a numeric confidence at D1.
 *   • Confidence is either:
 *     (a) UNRESOLVED — explicit `{ state: 'unresolved' }` marker, OR
 *     (b) NOT_COMPUTED — explicit `{ state: 'not_computed' }` marker.
 *   The numeric confidence value is produced ONLY by a deterministic engine at D4_PRIORITY_ENGINE.
 *   Any D1 confidence object that carries a numeric `value` field is rejected with
 *   HYPOTHESIS_CONFIDENCE_FORBIDDEN.
 *
 * Credibility ladder (mirrors docs/credibility-and-trust.md and the R3.0C / R3.0B enums so the
 * vocabulary cannot drift). NON-PRODUCTION: no renderer dependency, no runtime consumer, no algorithm.
 *
 * HARDENED-INTRINSICS REFACTOR (2026-06-29): all ambient intrinsic calls routed through
 * hardened-intrinsics.js safe wrappers. Replaced:
 *   - Object.freeze(...) for enum tables and validator return values → HI.deepFreeze
 *   - Object.keys(o)               → HI.safeKeys (in dead `_ownKeys` helper, removed)
 *   - Object.getPrototypeOf(v)     → HI.safeGetPrototypeOf
 *   - Array.isArray(v)             → HI.safeIsArray
 *   - list.indexOf(v) !== -1       → HI.safeArrayIndexOf
 *   - Reflect.ownKeys(o)           → HI.safeOwnKeys
 *   - keys.length / keys[i] iteration retained (own-property reads on plain arrays we built)
 * Semantic behaviour preserved exactly: every reason code path, every validator outcome, and the
 * `_hasOnlyAllowedKeys` Symbol/non-enumerable rejection (Codex D1 R1 RN-01 closure) all match the
 * pre-refactor file. The defence-in-depth comments are retained verbatim.
 *
 * UMD: Node require / Electron renderer global (R3_0D_CredibilityContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = null; } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  if (!RC) throw new Error('credibility-contract.js requires reason-codes.js');
  var HI = _req('./hardened-intrinsics.js', typeof R3_0D_HardenedIntrinsics !== 'undefined' ? R3_0D_HardenedIntrinsics : undefined);
  if (!HI) throw new Error('credibility-contract.js requires hardened-intrinsics.js');
  var CODES = RC.REASON_CODES;

  // R3.0D credibility ladder. Directive §8 mandates `measured / derived / heuristic / synthetic` for
  // EVIDENCE credibility (i.e., where the data came from). The five-step ladder from R3.0C is the
  // CONCLUSION credibility (the strength of a downstream claim). D1 keeps both vocabularies cleanly
  // separated so a heuristic source cannot be re-labelled as a measured conclusion.
  var EVIDENCE_CREDIBILITY = HI.deepFreeze(['measured', 'derived', 'heuristic', 'synthetic']);
  var CONCLUSION_CREDIBILITY = HI.deepFreeze(['Physics', 'Model', 'Measured', 'Derived', 'Heuristic', 'Unavailable']);

  // Provenance enum mirrors R3.0B / R3.0C.
  var PROVENANCE = HI.deepFreeze(['synthetic', 'real', 'unverified']);

  // Confidence state at D1 — closed enum. There is NO numeric `value` field allowed at D1.
  var CONFIDENCE_STATES = HI.deepFreeze(['unresolved', 'not_computed']);

  // Availability enum — used by the evidence graph (whether a metric / channel is currently usable).
  var AVAILABILITY = HI.deepFreeze(['available', 'unavailable', 'partial', 'unconfirmed']);

  // Allowed-keys whitelist for confidence object validation. Frozen once at module init so it
  // cannot be mutated by an attacker between calls.
  var _CONFIDENCE_ALLOWED_KEYS = HI.deepFreeze(['state']);

  // _isPlain(v) — must be a non-array, non-null object whose prototype is exactly Object.prototype
  // or null. Implemented via HI.safeIsPlainShape so the Object.prototype identity check happens
  // inside hardened-intrinsics (which holds the captured _ObjectPrototype reference). Avoids any
  // ambient `Object.prototype` lookup or ambient `Array.isArray` / `Object.getPrototypeOf` call.
  function _isPlain(v) {
    return HI.safeIsPlainShape(v) === 'plain-object';
  }
  function _inEnum(list, v) { return typeof v === 'string' && HI.safeArrayIndexOf(list, v) !== -1; }

  // Codex D1 R1 Finding RN-01 closure: Reflect.ownKeys catches non-enumerable + Symbol-keyed own
  // properties that Object.keys silently ignores. Symbols always fail the string-allowlist indexOf.
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys = HI.safeOwnKeys(o);
    if (keys === null) return false;
    var n = keys.length;
    for (var i = 0; i < n; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (HI.safeArrayIndexOf(allowed, k) === -1) return false;
    }
    return true;
  }

  /**
   * validateEvidenceCredibility(value) — caller supplies a string from EVIDENCE_CREDIBILITY.
   * Returns { valid:true } or buildBlockedResult.
   */
  function validateEvidenceCredibility(value) {
    // RN-02 closure: outer try/catch. Even an enum-lookup against a hostile object can throw if the
    // value is a Proxy whose toString/conversion throws; pin the boundary.
    try {
      if (!_inEnum(EVIDENCE_CREDIBILITY, value)) return RC.buildBlockedResult([CODES.EVIDENCE_CREDIBILITY_INVALID]);
      return HI.deepFreeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_CREDIBILITY_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * validateProvenance(value) — caller supplies a string from PROVENANCE.
   */
  function validateProvenance(value) {
    try {
      if (!_inEnum(PROVENANCE, value)) return RC.buildBlockedResult([CODES.EVIDENCE_PROVENANCE_INVALID]);
      return HI.deepFreeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_PROVENANCE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * validateConfidenceShape(c) — D1 caller-supplied confidence MUST be a closed-key plain object with
   * { state: 'unresolved' | 'not_computed' }. Any presence of `value`, `score`, `numeric`, `probability`
   * → HYPOTHESIS_CONFIDENCE_FORBIDDEN. Any extra own key → UNKNOWN_OWN_KEY.
   */
  function validateConfidenceShape(c) {
    try {
      if (!_isPlain(c)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN], { detail: 'confidence not plain object' });
      if (!_hasOnlyAllowedKeys(c, _CONFIDENCE_ALLOWED_KEYS)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN, CODES.UNKNOWN_OWN_KEY], { detail: 'confidence carries forbidden own key' });
      if (!_inEnum(CONFIDENCE_STATES, c.state)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN], { detail: 'confidence.state not in allowed enum' });
      return HI.deepFreeze({ valid: true, state: c.state });
    } catch (e) {
      return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'confidence validator threw on hostile input' });
    }
  }

  /**
   * validateAvailability(value) — caller supplies a string from AVAILABILITY.
   */
  function validateAvailability(value) {
    try {
      if (!_inEnum(AVAILABILITY, value)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID]);
      return HI.deepFreeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  // synthetic-honesty constraint: a `synthetic` provenance MUST carry the LIMITATION_SYNTHETIC_ONLY
  // marker among its limitations. This is checked at the evidence-node layer; here we expose the
  // constant for the cross-layer assertion.
  var SYNTHETIC_LIMITATION_REQUIRED = CODES.LIMITATION_SYNTHETIC_ONLY;

  var api = {
    EVIDENCE_CREDIBILITY: EVIDENCE_CREDIBILITY,
    CONCLUSION_CREDIBILITY: CONCLUSION_CREDIBILITY,
    PROVENANCE: PROVENANCE,
    CONFIDENCE_STATES: CONFIDENCE_STATES,
    AVAILABILITY: AVAILABILITY,
    SYNTHETIC_LIMITATION_REQUIRED: SYNTHETIC_LIMITATION_REQUIRED,
    validateEvidenceCredibility: validateEvidenceCredibility,
    validateProvenance: validateProvenance,
    validateConfidenceShape: validateConfidenceShape,
    validateAvailability: validateAvailability,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_CredibilityContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/source-identity-contract.js ======
/**
 * contracts/r3.0d/source-identity-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines SourceIdentity — the case / session / lap / source-version binding every EvidenceNode,
 * Observation, Hypothesis, Recommendation, and Engineer Brief MUST carry. The contract validates the
 * SHAPE of an identity claim (it does NOT verify the claim against an authoritative WeakSet — that
 * authority binding lives in the renderer at C8_ACTIVATION's r3cC8Authority / r3cC8SessionAuthority
 * closures). D1's job is to refuse a structurally malformed identity at the contract boundary so a
 * downstream production module can never see one.
 *
 * Freshness rule: a freshness timestamp (ISO-8601 string) is required on every node so the D3
 * Priority Engine can downweight stale evidence; values older than now-by-policy are flagged but the
 * D1 contract does NOT compute a policy decision — it only validates the SHAPE.
 *
 * Association binding: the optional lapId is the only field where a null is permitted (lap-scoped
 * evidence is rarer than case-scoped or session-scoped). caseId + sessionId are MANDATORY.
 *
 * Hardened-intrinsics refactor (Codex D2 Round 15 architectural convergence): every ambient
 * intrinsic call (Object.*, Array.*, String(), Number.*, Math.*, RegExp.prototype.test, JSON.*,
 * TextEncoder, arr.push, arr.indexOf, arr.forEach, etc.) has been replaced with the closure-private
 * safe wrapper from hardened-intrinsics.js. Hostile ambient rebinding cannot affect the validator
 * because the validator never performs an ambient lookup.
 *
 * UMD: Node require / Electron renderer global (R3_0D_SourceIdentityContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = null; } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  if (!RC) throw new Error('source-identity-contract.js requires reason-codes.js');
  var HI = _req('./hardened-intrinsics.js', typeof R3_0D_HardenedIntrinsics !== 'undefined' ? R3_0D_HardenedIntrinsics : undefined);
  if (!HI) throw new Error('source-identity-contract.js requires hardened-intrinsics.js');
  var CODES = RC.REASON_CODES;

  // Closed key set for SourceIdentity (D1). Any extra own key → UNKNOWN_OWN_KEY. caseId / sessionId /
  // sourceId / sourceVersion / freshness are MANDATORY; lapId is OPTIONAL (null permitted).
  // Use HI.deepFreeze for the allowlists so freezing itself goes through a captured Object.freeze.
  var SOURCE_IDENTITY_KEYS = HI.deepFreeze(['caseId', 'sessionId', 'lapId', 'sourceId', 'sourceVersion', 'freshness']);
  var SOURCE_IDENTITY_REQUIRED_KEYS = HI.deepFreeze(['caseId', 'sessionId', 'sourceId', 'sourceVersion', 'freshness']);

  // String byte cap per field (UTF-8 byte length, NOT character count). Same cap pattern as R3.0C's
  // comparison-export bounded strings — prevents an attacker padding an id with megabytes.
  var STRING_BYTE_CAP = 512;

  // _isPlain — TOP-LEVEL plain-object classification routed through HI.safeIsPlainShape so the
  // prototype-identity check uses the closure-private captured Object.prototype / Array.prototype.
  function _isPlain(v) {
    return HI.safeIsPlainShape(v) === 'plain-object';
  }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // _utf8Bytes — UTF-8 byte width via captured TextEncoder. Hardened wrapper returns 0 for
  // non-strings and falls back to manual char-code summation if TextEncoder is unavailable.
  function _utf8Bytes(s) { return HI.safeUtf8ByteLength(s); }

  // Codex D1 Round 1 Finding RN-01 closure: use Reflect.ownKeys so non-enumerable own properties AND
  // Symbol-keyed properties are also enumerated. Symbols are not in the allowlist (a string array) →
  // they fail the indexOf check. Proxy ownKeys traps that throw collapse to false (fail-closed).
  // Refactor: route both ownKeys + indexOf through HI safe wrappers.
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys = HI.safeOwnKeys(o);
    if (keys === null) return false;
    var len = keys.length;
    for (var i = 0; i < len; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (HI.safeArrayIndexOf(allowed, k) === -1) return false;
    }
    return true;
  }

  // ISO-8601 timestamp regex (basic — full validation lives in the production service if it ever
  // becomes a freshness POLICY decision; D1 only checks the SHAPE). Captured at module-init time;
  // tested via HI.safeRegExpTest so RegExp.prototype.test rebinding cannot affect the validator.
  var ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

  /**
   * validateSourceIdentity(id) — D1 SHAPE gate.
   *
   * Returns { valid:true, identity:<frozen copy> } or buildBlockedResult.
   *
   * Refusals:
   *   • not a plain prototype object   → INTERNAL_CONTRACT_VIOLATION
   *   • extra own key                  → SOURCE_IDENTITY_INVALID + UNKNOWN_OWN_KEY
   *   • caseId / sessionId / sourceId / sourceVersion / freshness missing or non-string
   *                                    → SOURCE_IDENTITY_INVALID
   *   • lapId neither null nor non-empty string
   *                                    → SOURCE_IDENTITY_LAP_MISMATCH
   *   • any string field exceeds STRING_BYTE_CAP
   *                                    → BYTE_CAP_EXCEEDED
   *   • freshness not ISO-8601 shape   → SOURCE_IDENTITY_INVALID
   */
  function validateSourceIdentity(idIn) {
    // Codex D1 R1 Finding RN-02 + R2 Finding RN-06 closure: outer try/catch AND Proxy-rejection input
    // clone. The validator operates on the cleaned clone, not the original — a Proxy that hides keys
    // is reduced to its disclosed surface, then the clone is itself a plain object whose own-property
    // set is fully enumerable. structuredClone DataCloneError → fail-closed.
    try {
    if (!RC.isOriginalPlainObject(idIn)) return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'identity prototype is not Object.prototype or null (class instance / Proxy / non-plain rejected pre-clone)' });
    if (RC.hasHiddenOwnKey(idIn)) return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'identity carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(idIn)) return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'identity contains a nested non-plain object (class instance / accessor / nested Symbol key)' });
    var id = RC.toCleanCopy(idIn);
    if (!_isPlain(id)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'identity not a plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(id, SOURCE_IDENTITY_KEYS)) return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'identity carries forbidden own key' });
    var reasons = [];
    HI.safeArrayForEach(SOURCE_IDENTITY_REQUIRED_KEYS, function (k) {
      var v = id[k];
      if (!_nonEmptyStr(v)) { HI.safeArrayPush(reasons, CODES.SOURCE_IDENTITY_INVALID); return; }
      if (_utf8Bytes(v) > STRING_BYTE_CAP) HI.safeArrayPush(reasons, CODES.BYTE_CAP_EXCEEDED);
    });
    if (!HI.safeHasOwn(id, 'lapId')) {
      // lapId is OPTIONAL — default null when omitted. The producer MAY omit it for case/session-scoped
      // evidence; consumers MUST treat absence as null.
    } else if (id.lapId !== null) {
      if (!_nonEmptyStr(id.lapId)) HI.safeArrayPush(reasons, CODES.SOURCE_IDENTITY_LAP_MISMATCH);
      else if (_utf8Bytes(id.lapId) > STRING_BYTE_CAP) HI.safeArrayPush(reasons, CODES.BYTE_CAP_EXCEEDED);
    }
    if (_nonEmptyStr(id.freshness) && !HI.safeRegExpTest(ISO8601_RE, id.freshness)) HI.safeArrayPush(reasons, CODES.SOURCE_IDENTITY_INVALID);
    if (!_nonEmptyStr(id.sourceVersion)) {
      // Already caught above as SOURCE_IDENTITY_INVALID — keep the specific code too for diagnostic value.
      HI.safeArrayPush(reasons, CODES.SOURCE_IDENTITY_VERSION_MISSING);
    }
    if (reasons.length) {
      // Deduplicate while preserving first-seen order. Use a null-proto object via direct {} literal
      // ONLY for boolean keys (no prototype-chain reads in the deduplication loop). The output `out`
      // is built exclusively through HI.safeArrayPush.
      var seen = {}, out = [];
      HI.safeArrayForEach(reasons, function (c) {
        if (!seen[c]) { seen[c] = true; HI.safeArrayPush(out, c); }
      });
      return RC.buildBlockedResult(out);
    }
    // HI.deepFreeze replaces Object.freeze; recursively freezes the identity snapshot.
    return HI.deepFreeze({
      valid: true,
      identity: HI.deepFreeze({
        caseId: id.caseId,
        sessionId: id.sessionId,
        lapId: HI.safeHasOwn(id, 'lapId') ? id.lapId : null,
        sourceId: id.sourceId,
        sourceVersion: id.sourceVersion,
        freshness: id.freshness,
      }),
    });
    } catch (e) {
      return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'source-identity validator threw on hostile input' });
    }
  }

  /**
   * sourceIdentityMatches(a, b) — equality based on the four hard identifiers + sourceVersion. The
   * freshness timestamp is intentionally EXCLUDED from equality (it advances naturally between reads
   * of the same evidence).
   */
  function sourceIdentityMatches(a, b) {
    if (!_isPlain(a) || !_isPlain(b)) return false;
    return a.caseId === b.caseId
      && a.sessionId === b.sessionId
      && a.lapId === b.lapId
      && a.sourceId === b.sourceId
      && a.sourceVersion === b.sourceVersion;
  }

  var api = {
    SOURCE_IDENTITY_KEYS: SOURCE_IDENTITY_KEYS,
    SOURCE_IDENTITY_REQUIRED_KEYS: SOURCE_IDENTITY_REQUIRED_KEYS,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    validateSourceIdentity: validateSourceIdentity,
    sourceIdentityMatches: sourceIdentityMatches,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_SourceIdentityContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/evidence-node-contract.js ======
/**
 * contracts/r3.0d/evidence-node-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the EvidenceNode SHAPE (the smallest unit of fact in the Decision Engine), the closed
 * category enum (directive §8 "Evidence分類"), the Observation sub-shape, and per-node bounded-honesty
 * limitation handling. D1 implements NO graph algorithm — the D2_EVIDENCE_GRAPH service builds + walks
 * the actual graph (dedup, cycle detection, orphan detection, double-counting prevention).
 *
 * Closed key set discipline: any extra own key on a caller-supplied EvidenceNode → UNKNOWN_OWN_KEY.
 * No getter / accessor / Symbol-key / non-enumerable extra reaches the contract; we use
 * Object.keys + descriptor-safe reads to detect every escape attempt.
 *
 * HARDENED-INTRINSICS REFACTOR (2026-06-29): all ambient intrinsic calls routed through
 * hardened-intrinsics.js safe wrappers. Replaced:
 *   - Object.freeze(...)            → HI.deepFreeze (enum tables + every validator return value)
 *   - Object.getPrototypeOf(v)      → HI.safeIsPlainShape (composite plain-object check)
 *   - Array.isArray(v)              → HI.safeIsArray
 *   - Reflect.ownKeys(o)            → HI.safeOwnKeys
 *   - list.indexOf(v) / arr.indexOf → HI.safeArrayIndexOf
 *   - arr.push(x)                   → HI.safeArrayPush
 *   - reasons.push.apply(reasons,a) → HI.safeArrayForEach + HI.safeArrayPush
 *   - reasons.forEach(fn)           → HI.safeArrayForEach
 *   - arr.slice()                   → HI.safeArraySlice
 *   - Number.isInteger              → HI.safeNumberIsInteger
 *   - /regex/.test(s)               → HI.safeRegExpTest
 *   - new TextEncoder().encode().length → HI.safeUtf8ByteLength
 *   - Object.assign({}, params)     → HI.safeObjectAssign on a fresh literal `{}`
 *
 * Plain `{}` / `[]` literal construction is retained — those use [[CreateDataPropertyOrThrow]]
 * (not [[Set]]) and cannot be subverted by prototype setters. Property assignment to those
 * fresh containers is routed through safeDefineDataProperty (inside the safe wrappers).
 *
 * Semantic behaviour preserved exactly: every reason code path, every validator outcome, every
 * Codex D1 R1/R2 defence-in-depth comment is kept verbatim. `_hasOnlyAllowedKeys` still rejects
 * Symbol-keyed + non-enumerable own properties (RN-01 closure).
 *
 * UMD: Node require / Electron renderer global (R3_0D_EvidenceNodeContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = null; } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  if (!RC || !CR || !SI) throw new Error('evidence-node-contract.js requires reason-codes + credibility + source-identity contracts');
  var HI = _req('./hardened-intrinsics.js', typeof R3_0D_HardenedIntrinsics !== 'undefined' ? R3_0D_HardenedIntrinsics : undefined);
  if (!HI) throw new Error('evidence-node-contract.js requires hardened-intrinsics.js');
  var CODES = RC.REASON_CODES;

  // Directive §8 "Evidence分類" — closed set. `unknown` is allowed for the rare case where a node is
  // emitted before the category is determined (the priority engine then deprioritises it). New
  // categories must be added here AND to the schema test fixture — no caller-supplied free-form value.
  var EVIDENCE_CATEGORIES = HI.deepFreeze(['data_quality', 'mapping_calibration', 'driver_behaviour', 'vehicle_response', 'setup_model', 'unknown']);

  // EvidenceNode closed key set (D1 SHAPE).
  var EVIDENCE_NODE_KEYS = HI.deepFreeze([
    'nodeId',
    'category',
    'identity',          // SourceIdentity (caseId, sessionId, lapId?, sourceId, sourceVersion, freshness)
    'credibility',       // EVIDENCE_CREDIBILITY enum
    'provenance',        // PROVENANCE enum
    'availability',      // AVAILABILITY enum
    'confidence',        // D1: { state: 'unresolved' | 'not_computed' } only
    'observation',       // structured observation payload (closed schema below)
    'limitations',       // array of LIMITATION_* codes (bounded honesty)
    'supportingEdges',   // array of nodeId strings (other evidence supporting this one)
    'contradictingEdges',// array of nodeId strings (other evidence contradicting this one)
    'schemaVersion',     // integer; rejects future schemas at D1
  ]);

  // Observation closed key set. The observation is the FACT this node carries (e.g. a metric value,
  // a flag that a channel is missing). The shape is intentionally minimal at D1 — domain-specific
  // fields belong to category-specific specialisations introduced at D2 / D3.
  var OBSERVATION_KEYS = HI.deepFreeze(['kind', 'i18nKey', 'params', 'channel']);
  var OBSERVATION_KIND_ALLOWED = HI.deepFreeze(['metric_value', 'metric_threshold_crossed', 'channel_missing', 'channel_uncalibrated', 'channel_partial', 'lap_authority_blocked', 'comparison_blocked', 'qualitative_marker']);

  // Schema version pin. A node whose schemaVersion is HIGHER than D1's SUPPORTED_SCHEMA_VERSION is
  // rejected with UNSUPPORTED_FUTURE_SCHEMA — a future-schema node must NEVER be silently accepted.
  var SUPPORTED_SCHEMA_VERSION = 1;

  // Caps. Directive §8: "array caps, graph caps, total envelope cap".
  var LIMITATIONS_ARRAY_CAP = 32;
  var EDGES_ARRAY_CAP = 64;
  var STRING_BYTE_CAP = 512;     // per-field
  var PARAMS_VALUE_BYTE_CAP = 256;

  // NodeId grammar. Directive: "no private path, no filename, no raw telemetry, deterministic / secure
  // immutable id, caller cannot collide". The contract enforces a grammar (no '/', no '..', no '\\',
  // no leading '.'); production-side D2 layer adds collision detection.
  var NODE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var NODE_ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  // _isPlain(v) — routed through HI.safeIsPlainShape so the Object.prototype identity check uses
  // hardened-intrinsics' captured _ObjectPrototype reference (no ambient lookup).
  function _isPlain(v) { return HI.safeIsPlainShape(v) === 'plain-object'; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D1 R1 Finding RN-01 closure: Reflect.ownKeys catches non-enumerable + Symbol-keyed.
  // Now via HI.safeOwnKeys (captured Reflect.ownKeys behind Reflect.apply — no rebind).
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys = HI.safeOwnKeys(o);
    if (keys === null) return false;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (HI.safeArrayIndexOf(allowed, k) === -1) return false;
    }
    return true;
  }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  // UTF-8 byte width via captured TextEncoder (manual fallback inside HI handles the no-TextEncoder
  // path — see hardened-intrinsics.js safeUtf8ByteLength).
  function _utf8Bytes(s) { return HI.safeUtf8ByteLength(s); }
  function _isStringCodeArray(v, cap) {
    if (!HI.safeIsArray(v) || v.length > cap) return false;
    for (var i = 0; i < v.length; i++) if (typeof v[i] !== 'string' || v[i].length === 0) return false;
    return true;
  }

  /**
   * validateObservationShape(o) — closed-key plain object with kind ∈ OBSERVATION_KIND_ALLOWED,
   * i18nKey non-empty string (no UI prose at D1), optional params plain object whose own values are
   * finite numbers, booleans, null, or short strings (≤ PARAMS_VALUE_BYTE_CAP).
   */
  function validateObservationShape(o) {
    // RN-02 closure: outer try/catch.
    try {
    if (!_isPlain(o)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID], { detail: 'observation not a plain object' });
    if (!_hasOnlyAllowedKeys(o, OBSERVATION_KEYS)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID, CODES.UNKNOWN_OWN_KEY]);
    if (HI.safeArrayIndexOf(OBSERVATION_KIND_ALLOWED, o.kind) === -1) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID], { detail: 'observation.kind not allowed' });
    if (!_nonEmptyStr(o.i18nKey)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID], { detail: 'observation.i18nKey missing' });
    if (_utf8Bytes(o.i18nKey) > STRING_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
    if ('channel' in o && o.channel !== null && !_nonEmptyStr(o.channel)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID]);
    if ('params' in o && o.params !== null && o.params !== undefined) {
      if (!_isPlain(o.params)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID]);
      // Codex D1 R2 Finding RN-07 closure: Reflect.ownKeys + Symbol rejection mirrors validateParamsShape.
      // Now via HI.safeOwnKeys (captured Reflect.ownKeys + Reflect.apply, not rebindable).
      var pk = HI.safeOwnKeys(o.params);
      if (pk === null) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID]);
      for (var i = 0; i < pk.length; i++) {
        var k = pk[i];
        if (typeof k === 'symbol') return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID, CODES.UNKNOWN_OWN_KEY]);
        var v = o.params[k];
        if (v === null || typeof v === 'boolean') continue;
        if (typeof v === 'number') { if (!_isFiniteNum(v)) return RC.buildBlockedResult([CODES.NUMERIC_INVALID]); continue; }
        if (typeof v === 'string') { if (_utf8Bytes(v) > PARAMS_VALUE_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]); continue; }
        return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID], { detail: 'observation.params value type not allowed' });
      }
    }
    return HI.deepFreeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'observation validator threw on hostile input' });
    }
  }

  /**
   * validateEvidenceNodeShape(n) — D1 STRUCTURAL gate. Composes credibility, source-identity, and
   * observation validators. Returns { valid:true } or buildBlockedResult.
   *
   * D1 does NOT validate the graph relations (cycles, orphans, double-counting) — that is the D2
   * EVIDENCE_GRAPH service's job. D1 ONLY proves a single node's STRUCTURE.
   */
  function validateEvidenceNodeShape(nIn) {
    // Outer try/catch + Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(nIn)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'node prototype is not Object.prototype or null (class instance / Proxy / non-plain rejected pre-clone)' });
    if (RC.hasHiddenOwnKey(nIn)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'node carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(nIn)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'node contains a nested non-plain object (class instance laundered through identity / confidence / observation)' });
    var n = RC.toCleanCopy(nIn);
    if (!_isPlain(n)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID], { detail: 'node not a plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(n, EVIDENCE_NODE_KEYS)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    // schemaVersion: must be the integer SUPPORTED_SCHEMA_VERSION. Higher → UNSUPPORTED_FUTURE_SCHEMA.
    if (!HI.safeNumberIsInteger(n.schemaVersion)) HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_INVALID);
    else if (n.schemaVersion > SUPPORTED_SCHEMA_VERSION) HI.safeArrayPush(reasons, CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (n.schemaVersion < 1) HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_INVALID);

    // nodeId
    if (!_nonEmptyStr(n.nodeId)) HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_MISSING_ID);
    else if (HI.safeRegExpTest(NODE_ID_FORBIDDEN_RE, n.nodeId) || !HI.safeRegExpTest(NODE_ID_RE, n.nodeId)) HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_ID_FORBIDDEN);

    // category
    if (HI.safeArrayIndexOf(EVIDENCE_CATEGORIES, n.category) === -1) HI.safeArrayPush(reasons, CODES.EVIDENCE_CATEGORY_UNKNOWN);

    // identity
    var idCheck = SI.validateSourceIdentity(n.identity);
    if (idCheck.valid !== true) {
      var idCodes = idCheck.reasonCodes;
      if (HI.safeIsArray(idCodes)) {
        HI.safeArrayForEach(idCodes, function (c) { HI.safeArrayPush(reasons, c); });
      } else {
        HI.safeArrayPush(reasons, CODES.SOURCE_IDENTITY_INVALID);
      }
    }

    // credibility, provenance, availability
    var crCheck = CR.validateEvidenceCredibility(n.credibility);
    if (crCheck.valid !== true) HI.safeArrayPush(reasons, CODES.EVIDENCE_CREDIBILITY_INVALID);
    var prCheck = CR.validateProvenance(n.provenance);
    if (prCheck.valid !== true) HI.safeArrayPush(reasons, CODES.EVIDENCE_PROVENANCE_INVALID);
    var avCheck = CR.validateAvailability(n.availability);
    if (avCheck.valid !== true) HI.safeArrayPush(reasons, CODES.EVIDENCE_OBSERVATION_INVALID);

    // confidence (D1: caller cannot supply numeric)
    var cfCheck = CR.validateConfidenceShape(n.confidence);
    if (cfCheck.valid !== true) HI.safeArrayPush(reasons, CODES.EVIDENCE_CONFIDENCE_FORBIDDEN);

    // observation — propagate inner reasonCodes so NUMERIC_INVALID / BYTE_CAP_EXCEEDED surface to the caller
    var obCheck = validateObservationShape(n.observation);
    if (obCheck.valid !== true) {
      HI.safeArrayPush(reasons, CODES.EVIDENCE_OBSERVATION_INVALID);
      if (HI.safeIsArray(obCheck.reasonCodes)) {
        HI.safeArrayForEach(obCheck.reasonCodes, function (c) { HI.safeArrayPush(reasons, c); });
      }
    }

    // limitations array — closed code list, bounded length
    if (!_isStringCodeArray(n.limitations, LIMITATIONS_ARRAY_CAP)) HI.safeArrayPush(reasons, CODES.ARRAY_CAP_EXCEEDED);
    else {
      for (var li = 0; li < n.limitations.length; li++) {
        var lc = n.limitations[li];
        if (!RC.isReasonCode(lc)) { HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_INVALID); break; }
      }
    }

    // edges arrays
    if (!_isStringCodeArray(n.supportingEdges, EDGES_ARRAY_CAP)) HI.safeArrayPush(reasons, CODES.ARRAY_CAP_EXCEEDED);
    if (!_isStringCodeArray(n.contradictingEdges, EDGES_ARRAY_CAP)) HI.safeArrayPush(reasons, CODES.ARRAY_CAP_EXCEEDED);

    // self-reference (D1 catches the easy case; D2 catches deep cycles)
    if (_nonEmptyStr(n.nodeId)) {
      var supEdges = HI.safeIsArray(n.supportingEdges) ? n.supportingEdges : [];
      var conEdges = HI.safeIsArray(n.contradictingEdges) ? n.contradictingEdges : [];
      if (HI.safeArrayIndexOf(supEdges, n.nodeId) !== -1) HI.safeArrayPush(reasons, CODES.EVIDENCE_GRAPH_SELF_REFERENCE);
      if (HI.safeArrayIndexOf(conEdges, n.nodeId) !== -1) HI.safeArrayPush(reasons, CODES.EVIDENCE_GRAPH_SELF_REFERENCE);
    }

    // synthetic-honesty: a synthetic provenance MUST declare LIMITATION_SYNTHETIC_ONLY in limitations.
    if (n.provenance === 'synthetic') {
      var lims = HI.safeIsArray(n.limitations) ? n.limitations : [];
      if (HI.safeArrayIndexOf(lims, CR.SYNTHETIC_LIMITATION_REQUIRED) === -1) HI.safeArrayPush(reasons, CODES.LIMITATION_SYNTHETIC_ONLY);
    }

    // heuristic credibility: MUST declare LIMITATION_HEURISTIC_ONLY. Same posture as synthetic.
    if (n.credibility === 'heuristic') {
      var lims2 = HI.safeIsArray(n.limitations) ? n.limitations : [];
      if (HI.safeArrayIndexOf(lims2, CODES.LIMITATION_HEURISTIC_ONLY) === -1) HI.safeArrayPush(reasons, CODES.LIMITATION_HEURISTIC_ONLY);
    }

    if (reasons.length) {
      var seen = {}, out = [];
      HI.safeArrayForEach(reasons, function (c) { if (!seen[c]) { seen[c] = true; HI.safeArrayPush(out, c); } });
      return RC.buildBlockedResult(out);
    }
    // sanitized = a frozen plain copy with only the declared keys; downstream consumers should use
    // this rather than the caller object to avoid TOCTOU on a Proxy getter.
    return HI.deepFreeze({
      valid: true,
      sanitized: HI.deepFreeze({
        schemaVersion: n.schemaVersion,
        nodeId: n.nodeId,
        category: n.category,
        identity: HI.deepFreeze({
          caseId: n.identity.caseId,
          sessionId: n.identity.sessionId,
          lapId: ('lapId' in n.identity) ? n.identity.lapId : null,
          sourceId: n.identity.sourceId,
          sourceVersion: n.identity.sourceVersion,
          freshness: n.identity.freshness,
        }),
        credibility: n.credibility,
        provenance: n.provenance,
        availability: n.availability,
        confidence: HI.deepFreeze({ state: n.confidence.state }),
        observation: HI.deepFreeze({
          kind: n.observation.kind,
          i18nKey: n.observation.i18nKey,
          params: n.observation.params ? HI.deepFreeze(HI.safeObjectAssign({}, n.observation.params)) : null,
          channel: ('channel' in n.observation) ? n.observation.channel : null,
        }),
        limitations: HI.deepFreeze(HI.safeArraySlice(n.limitations)),
        supportingEdges: HI.deepFreeze(HI.safeArraySlice(n.supportingEdges)),
        contradictingEdges: HI.deepFreeze(HI.safeArraySlice(n.contradictingEdges)),
      }),
    });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'evidence node validator threw on hostile input' });
    }
  }

  var api = {
    EVIDENCE_CATEGORIES: EVIDENCE_CATEGORIES,
    EVIDENCE_NODE_KEYS: EVIDENCE_NODE_KEYS,
    OBSERVATION_KEYS: OBSERVATION_KEYS,
    OBSERVATION_KIND_ALLOWED: OBSERVATION_KIND_ALLOWED,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    LIMITATIONS_ARRAY_CAP: LIMITATIONS_ARRAY_CAP,
    EDGES_ARRAY_CAP: EDGES_ARRAY_CAP,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    PARAMS_VALUE_BYTE_CAP: PARAMS_VALUE_BYTE_CAP,
    NODE_ID_RE: NODE_ID_RE,
    validateObservationShape: validateObservationShape,
    validateEvidenceNodeShape: validateEvidenceNodeShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_EvidenceNodeContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/hypothesis-contract.js ======
/**
 * contracts/r3.0d/hypothesis-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines Hypothesis + Contradiction + AlternativeExplanation + CannotConclude + Limitation +
 * ValidationAction SHAPES. The D1 contract layer enforces the structural reasoning discipline that
 * directive §8 mandates:
 *   • supportingEvidenceIds      — required
 *   • contradictingEvidenceIds   — required
 *   • alternativeExplanationIds  — required
 *   • cannotConcludeReasonCodes  — required
 *   • limitations                — required
 *   • validationActionIds        — required
 * A Hypothesis that omits ANY of these (even with an empty array) → HYPOTHESIS_INVALID. Free-text
 * causal authority is rejected as a structural posture, not a style preference. The hypothesis MUST
 * carry an i18nKey for any narrative; free-form prose at the authority layer is forbidden.
 *
 * Causal overclaim rejection (directive §8 "禁止輸出"):
 *   • exact_cause, driver_fault, setup_caused_loss, guaranteed_fix, professional_diagnosis,
 *     fastest_setup, theoretical_best — any of these strings appearing in i18nKey OR any param
 *     value triggers HYPOTHESIS_CAUSAL_OVERCLAIM. D1 catches the lexical surface; D3 adds semantic
 *     analysis.
 *
 * Confidence: D1 forbids any numeric confidence on a Hypothesis. The hypothesis's confidence field
 * MUST be { state: 'unresolved' | 'not_computed' } only — D3 produces the numeric value.
 *
 * UMD: Node require / Electron renderer global (R3_0D_HypothesisContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = null; } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  if (!RC || !CR || !SI) throw new Error('hypothesis-contract.js requires reason-codes + credibility + source-identity');
  var CODES = RC.REASON_CODES;

  // Hypothesis category — must match Evidence categories (each hypothesis is about one category). New
  // categories require an evidence-node-contract update first; mirror keeps drift impossible.
  var HYPOTHESIS_CATEGORIES = Object.freeze(['data_quality', 'mapping_calibration', 'driver_behaviour', 'vehicle_response', 'setup_model', 'unknown']);

  // Closed key set.
  var HYPOTHESIS_KEYS = Object.freeze([
    'hypothesisId',
    'category',
    'identity',                    // SourceIdentity binding
    'i18nKey',                     // the i18n hook for the hypothesis's display text (NO free-form prose)
    'params',                      // optional plain-object params for the i18n template
    'credibility',                 // CONCLUSION_CREDIBILITY (e.g., Heuristic until D3 upgrades)
    'confidence',                  // D1: { state: 'unresolved' | 'not_computed' } only
    'supportingEvidenceIds',
    'contradictingEvidenceIds',
    'alternativeExplanationIds',
    'cannotConcludeReasonCodes',
    'limitations',
    'validationActionIds',
    'schemaVersion',
  ]);

  // ContextExplanation closed key set.
  var ALTERNATIVE_EXPLANATION_KEYS = Object.freeze(['alternativeId', 'i18nKey', 'params', 'supportingEvidenceIds']);

  // ValidationAction closed key set. Directive §8 + §10 (Priority Engine) fixes the kind enum.
  var VALIDATION_ACTION_KEYS = Object.freeze(['actionId', 'kind', 'i18nKey', 'params', 'requiresControlledVariables', 'expectedObservationI18nKey']);
  var VALIDATION_ACTION_KIND_ALLOWED = Object.freeze([
    'fix_data_quality',
    'recalibrate_channel',
    'controlled_repeat_lap',
    'driver_experiment',
    'setup_experiment',
    'collect_additional_session',
    'collect_additional_lap',
    'no_action_required',
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;

  // Caps — generous but bounded.
  var ID_ARRAY_CAP = 64;
  var ALTERNATIVE_ARRAY_CAP = 16;
  var LIMITATION_ARRAY_CAP = 32;
  var STRING_BYTE_CAP = 512;
  var PARAMS_VALUE_BYTE_CAP = 256;
  var HYPOTHESIS_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var HYPOTHESIS_ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  // Causal-overclaim lexical guard. D1 rejects these substrings anywhere in i18nKey or any string
  // param value. The list is INTENTIONALLY SMALL — D1 catches the lexical surface; D3 / Codex catch
  // the semantic surface. False positives are acceptable here (a contract layer prefers fail-closed).
  var CAUSAL_OVERCLAIM_TERMS = Object.freeze([
    'exact_cause', 'exact cause',
    'driver_fault', 'driver fault', 'driver_blame', 'driver blame',
    'setup_caused', 'setup caused', 'setup_caused_loss',
    'guaranteed_fix', 'guaranteed fix', 'guarantees',
    'professional_diagnosis', 'professional diagnosis',
    'fastest_setup', 'fastest setup',
    'theoretical_best', 'theoretical best',
  ]);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D1 R1 Finding RN-01 closure.
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  // Codex D1 R1 Finding RN-05 closure: ID-array elements MUST also pass the byte cap and the
  // grammar regex (same as the parent id). Otherwise an arbitrarily-long string can pad an id slot
  // before envelope validation. _isIdArray therefore takes the same id grammar + byte cap as the
  // owning shape.
  function _isIdArray(v, cap) {
    if (!Array.isArray(v) || v.length > cap) return false;
    for (var i = 0; i < v.length; i++) {
      var e = v[i];
      if (typeof e !== 'string' || e.length === 0) return false;
      if (HYPOTHESIS_ID_FORBIDDEN_RE.test(e) || !HYPOTHESIS_ID_RE.test(e)) return false;
      if (_utf8Bytes(e) > STRING_BYTE_CAP) return false;
    }
    return true;
  }
  // Codex D1 R2 Finding RN-08 closure: centralized normalization covering ALL Unicode dash characters.
  // Previous regex only covered U+2010–U+2015 (en-dash family) but missed U+2212 MINUS SIGN, U+FF0D
  // FULLWIDTH HYPHEN-MINUS, and the general \p{Pd} Dash_Punctuation category. _normalizeForOverclaim
  // is exported on the api so recommendation-contract + engineer-brief-contract use the SAME canonical
  // normalizer — no duplicated regex.
  // Dash character class: U+002D (-) ASCII hyphen-minus, U+2010–U+2015 (hyphen / non-breaking hyphen /
  // figure dash / en dash / em dash / horizontal bar), U+2212 (minus sign), U+FE58 (small em dash),
  // U+FE63 (small hyphen-minus), U+FF0D (fullwidth hyphen-minus), U+058A (Armenian hyphen),
  // U+05BE (Hebrew maqaf), U+1806 (Mongolian todo soft hyphen), U+1400 (Canadian hyphen), U+2E17
  // (double oblique hyphen), U+2E1A (hyphen with diaeresis), U+2E3A/B (two/three-em dash), U+2E40
  // (double hyphen), U+30A0 (Katakana-Hiragana double hyphen).
  // Explicit Unicode escapes to remove any ambiguity in the regex parser. Includes ASCII hyphen-minus
  // (U+002D), the U+2010..U+2015 dash family (HYPHEN / NON-BREAKING / FIGURE / EN / EM / HORIZONTAL),
  // U+2212 MINUS SIGN, U+FF0D FULLWIDTH HYPHEN-MINUS, U+FE58/63 SMALL EM/HYPHEN, U+058A Armenian,
  // U+05BE Hebrew MAQAF, U+1806 Mongolian SOFT HYPHEN, U+1400 Canadian, U+2E17 DOUBLE OBLIQUE,
  // U+2E1A HYPHEN-DIAERESIS, U+2E3A/B TWO/THREE EM DASH, U+2E40 DOUBLE HYPHEN, U+30A0 Kana double.
  var DASH_OR_WS_RE = /[\s-‐‑‒–—―−－﹘﹣֊־᠆᐀⸗⸚⸺⸻⹀゠]+/g;
  function _normalizeForOverclaim(s) {
    if (typeof s !== 'string') return '';
    return s.toLowerCase().replace(DASH_OR_WS_RE, '_');
  }
  function _hasCausalOverclaim(s) {
    if (typeof s !== 'string') return false;
    var normalized = _normalizeForOverclaim(s);
    for (var i = 0; i < CAUSAL_OVERCLAIM_TERMS.length; i++) {
      var t = _normalizeForOverclaim(CAUSAL_OVERCLAIM_TERMS[i]);
      if (normalized.indexOf(t) !== -1) return true;
    }
    return false;
  }

  /**
   * validateParamsShape(p) — closed key plain object, values ∈ { finite number, boolean, null, short
   * string }. Same posture as evidence-node observation params.
   */
  function validateParamsShape(p) {
    // RN-02 closure: outer try/catch. RN-01 closure: Reflect.ownKeys rejects Symbol-keyed extras.
    try {
      if (p === null || p === undefined) return Object.freeze({ valid: true });
      if (!_isPlain(p)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID]);
      var keys; try { keys = Reflect.ownKeys(p); } catch (e) { return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID]); }
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (typeof k === 'symbol') return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY]);
        var v = p[k];
        if (v === null || typeof v === 'boolean') continue;
        if (typeof v === 'number') { if (!_isFiniteNum(v)) return RC.buildBlockedResult([CODES.NUMERIC_INVALID]); continue; }
        if (typeof v === 'string') {
          if (_utf8Bytes(v) > PARAMS_VALUE_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
          if (_hasCausalOverclaim(v)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CAUSAL_OVERCLAIM]);
          continue;
        }
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID]);
      }
      return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'params validator threw on hostile input' });
    }
  }

  /**
   * validateAlternativeExplanationShape(a) — closed-key plain object.
   */
  function validateAlternativeExplanationShape(a) {
    try {
    if (!_isPlain(a)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID]);
    if (!_hasOnlyAllowedKeys(a, ALTERNATIVE_EXPLANATION_KEYS)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID, CODES.UNKNOWN_OWN_KEY]);
    if (!_nonEmptyStr(a.alternativeId) || HYPOTHESIS_ID_FORBIDDEN_RE.test(a.alternativeId) || !HYPOTHESIS_ID_RE.test(a.alternativeId)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID]);
    if (!_nonEmptyStr(a.i18nKey)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID]);
    if (_utf8Bytes(a.i18nKey) > STRING_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
    if (_hasCausalOverclaim(a.i18nKey)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CAUSAL_OVERCLAIM]);
    var pc = validateParamsShape('params' in a ? a.params : null);
    if (pc.valid !== true) return pc;
    if ('supportingEvidenceIds' in a) {
      if (!_isIdArray(a.supportingEvidenceIds, ID_ARRAY_CAP)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID, CODES.ARRAY_CAP_EXCEEDED]);
    }
    return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'alternative validator threw on hostile input' });
    }
  }

  /**
   * validateValidationActionShape(a) — closed-key plain object with kind ∈ VALIDATION_ACTION_KIND_ALLOWED.
   */
  function validateValidationActionShape(a) {
    try {
    if (!_isPlain(a)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
    if (!_hasOnlyAllowedKeys(a, VALIDATION_ACTION_KEYS)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID, CODES.UNKNOWN_OWN_KEY]);
    if (!_nonEmptyStr(a.actionId) || HYPOTHESIS_ID_FORBIDDEN_RE.test(a.actionId) || !HYPOTHESIS_ID_RE.test(a.actionId)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
    if (VALIDATION_ACTION_KIND_ALLOWED.indexOf(a.kind) === -1) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_UNKNOWN_KIND]);
    if (!_nonEmptyStr(a.i18nKey)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
    if (_utf8Bytes(a.i18nKey) > STRING_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
    if (_hasCausalOverclaim(a.i18nKey)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CAUSAL_OVERCLAIM]);
    if ('params' in a) { var pc = validateParamsShape(a.params); if (pc.valid !== true) return pc; }
    if ('requiresControlledVariables' in a) {
      if (a.requiresControlledVariables !== true && a.requiresControlledVariables !== false) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
    }
    if ('expectedObservationI18nKey' in a && a.expectedObservationI18nKey !== null) {
      if (!_nonEmptyStr(a.expectedObservationI18nKey)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
      if (_utf8Bytes(a.expectedObservationI18nKey) > STRING_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
      if (_hasCausalOverclaim(a.expectedObservationI18nKey)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CAUSAL_OVERCLAIM]);
    }
    return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'validation-action validator threw on hostile input' });
    }
  }

  /**
   * validateHypothesisShape(h) — D1 STRUCTURAL gate. Composes credibility, source-identity, params,
   * alternative-explanation, validation-action validators. Returns { valid:true } or buildBlockedResult.
   */
  function validateHypothesisShape(hIn) {
    // Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(hIn)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'hypothesis prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(hIn)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'hypothesis carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(hIn)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'hypothesis contains a nested non-plain object (class instance laundered through identity / confidence / nested entries)' });
    var h = RC.toCleanCopy(hIn);
    if (!_isPlain(h)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'hypothesis not plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(h, HYPOTHESIS_KEYS)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    if (!Number.isInteger(h.schemaVersion)) reasons.push(CODES.HYPOTHESIS_INVALID);
    else if (h.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (h.schemaVersion < 1) reasons.push(CODES.HYPOTHESIS_INVALID);

    if (!_nonEmptyStr(h.hypothesisId)) reasons.push(CODES.HYPOTHESIS_INVALID);
    else if (HYPOTHESIS_ID_FORBIDDEN_RE.test(h.hypothesisId) || !HYPOTHESIS_ID_RE.test(h.hypothesisId)) reasons.push(CODES.HYPOTHESIS_INVALID);

    if (HYPOTHESIS_CATEGORIES.indexOf(h.category) === -1) reasons.push(CODES.HYPOTHESIS_CATEGORY_UNKNOWN);

    var idCheck = SI.validateSourceIdentity(h.identity);
    if (idCheck.valid !== true) reasons.push(CODES.SOURCE_IDENTITY_INVALID);

    if (!_nonEmptyStr(h.i18nKey)) reasons.push(CODES.HYPOTHESIS_INVALID);
    else {
      if (_utf8Bytes(h.i18nKey) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      if (_hasCausalOverclaim(h.i18nKey)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
    }

    var pc = validateParamsShape('params' in h ? h.params : null);
    if (pc.valid !== true) reasons.push.apply(reasons, pc.reasonCodes || [CODES.HYPOTHESIS_INVALID]);

    // Credibility — uses CONCLUSION_CREDIBILITY ladder (not EVIDENCE_CREDIBILITY). A heuristic
    // conclusion MUST declare LIMITATION_HEURISTIC_ONLY.
    if (CR.CONCLUSION_CREDIBILITY.indexOf(h.credibility) === -1) reasons.push(CODES.HYPOTHESIS_INVALID);

    // Confidence — caller cannot supply numeric.
    var cfCheck = CR.validateConfidenceShape(h.confidence);
    if (cfCheck.valid !== true) reasons.push(CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN);

    // Each evidence/alt/validation array MUST be present (even if empty). Directive §8: structured
    // reasoning output requires all six slots — omission is itself a hypothesis-structure violation.
    if (!_isIdArray(h.supportingEvidenceIds, ID_ARRAY_CAP)) reasons.push(CODES.HYPOTHESIS_EVIDENCE_LINK_INVALID);
    if (!_isIdArray(h.contradictingEvidenceIds, ID_ARRAY_CAP)) reasons.push(CODES.HYPOTHESIS_CONTRADICTION_INVALID);
    // Codex D1 R2 Finding RN-09 closure: alternativeExplanationIds was the one remaining id-array that
    // bypassed _isIdArray's grammar + byte-cap check. Route through _isIdArray with ALTERNATIVE_ARRAY_CAP.
    if (!_isIdArray(h.alternativeExplanationIds, ALTERNATIVE_ARRAY_CAP)) reasons.push(CODES.HYPOTHESIS_ALTERNATIVE_INVALID);
    if (!Array.isArray(h.cannotConcludeReasonCodes) || h.cannotConcludeReasonCodes.length > ID_ARRAY_CAP) reasons.push(CODES.HYPOTHESIS_INVALID);
    else for (var ci = 0; ci < h.cannotConcludeReasonCodes.length; ci++) if (!RC.isReasonCode(h.cannotConcludeReasonCodes[ci])) { reasons.push(CODES.HYPOTHESIS_INVALID); break; }
    if (!Array.isArray(h.limitations) || h.limitations.length > LIMITATION_ARRAY_CAP) reasons.push(CODES.ARRAY_CAP_EXCEEDED);
    else for (var li = 0; li < h.limitations.length; li++) if (!RC.isReasonCode(h.limitations[li])) { reasons.push(CODES.HYPOTHESIS_INVALID); break; }
    if (!_isIdArray(h.validationActionIds, ID_ARRAY_CAP)) reasons.push(CODES.HYPOTHESIS_INVALID);

    // Heuristic conclusion MUST declare LIMITATION_HEURISTIC_ONLY.
    if (h.credibility === 'Heuristic') {
      var lims = Array.isArray(h.limitations) ? h.limitations : [];
      if (lims.indexOf(CODES.LIMITATION_HEURISTIC_ONLY) === -1) reasons.push(CODES.LIMITATION_HEURISTIC_ONLY);
    }

    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }
    return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'hypothesis validator threw on hostile input' });
    }
  }

  var api = {
    HYPOTHESIS_CATEGORIES: HYPOTHESIS_CATEGORIES,
    HYPOTHESIS_KEYS: HYPOTHESIS_KEYS,
    ALTERNATIVE_EXPLANATION_KEYS: ALTERNATIVE_EXPLANATION_KEYS,
    VALIDATION_ACTION_KEYS: VALIDATION_ACTION_KEYS,
    VALIDATION_ACTION_KIND_ALLOWED: VALIDATION_ACTION_KIND_ALLOWED,
    CAUSAL_OVERCLAIM_TERMS: CAUSAL_OVERCLAIM_TERMS,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    ID_ARRAY_CAP: ID_ARRAY_CAP,
    ALTERNATIVE_ARRAY_CAP: ALTERNATIVE_ARRAY_CAP,
    LIMITATION_ARRAY_CAP: LIMITATION_ARRAY_CAP,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    PARAMS_VALUE_BYTE_CAP: PARAMS_VALUE_BYTE_CAP,
    validateParamsShape: validateParamsShape,
    validateAlternativeExplanationShape: validateAlternativeExplanationShape,
    validateValidationActionShape: validateValidationActionShape,
    validateHypothesisShape: validateHypothesisShape,
    // Codex D1 R2 RN-08 closure exports — recommendation-contract + engineer-brief-contract import
    // these so all three modules share the SAME canonical overclaim scanner. No module re-implements.
    hasCausalOverclaim: _hasCausalOverclaim,
    normalizeForOverclaim: _normalizeForOverclaim,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_HypothesisContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/recommendation-contract.js ======
/**
 * contracts/r3.0d/recommendation-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines Recommendation + Priority SHAPES. The Priority enum is FIXED ORDER per directive §10:
 *   1. data_quality
 *   2. mapping_calibration
 *   3. controlled_repeat_lap
 *   4. driver_experiment
 *   5. setup_experiment
 * Any caller-supplied priority key out of this order at the engine layer triggers
 * RECOMMENDATION_PRIORITY_OUT_OF_ORDER. The D1 contract enforces the closed enum at the SHAPE layer;
 * the D4 Priority Engine enforces the ordering at the engine layer.
 *
 * Auto-tuning rejection (directive §10 "禁止"): any recommendation that proposes an automatic apply
 * (auto_setup / auto_calibration / auto_preset_modification / auto_tuning) at this layer is rejected.
 *
 * UMD: Node require / Electron renderer global (R3_0D_RecommendationContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = null; } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  var HC = _req('./hypothesis-contract.js', typeof R3_0D_HypothesisContract !== 'undefined' ? R3_0D_HypothesisContract : undefined);
  if (!RC || !CR || !SI || !HC) throw new Error('recommendation-contract.js requires reason-codes + credibility + source-identity + hypothesis');
  var CODES = RC.REASON_CODES;

  // Fixed priority ladder. The number is the DETERMINISTIC ordering — never reorderable by caller.
  var PRIORITY_LADDER = Object.freeze([
    { rank: 1, key: 'data_quality' },
    { rank: 2, key: 'mapping_calibration' },
    { rank: 3, key: 'controlled_repeat_lap' },
    { rank: 4, key: 'driver_experiment' },
    { rank: 5, key: 'setup_experiment' },
  ]);
  var PRIORITY_KEY_RANK = Object.freeze((function () { var m = {}; PRIORITY_LADDER.forEach(function (p) { m[p.key] = p.rank; }); return m; })());
  var PRIORITY_KEYS = Object.freeze(PRIORITY_LADDER.map(function (p) { return p.key; }));

  // Apply-mode enum. ONLY 'driver_action' and 'user_initiated' are allowed at D1. Any auto_* value is
  // rejected with the appropriate AUTO_*_FORBIDDEN code.
  var APPLY_MODE_ALLOWED = Object.freeze(['driver_action', 'user_initiated']);
  var APPLY_MODE_FORBIDDEN = Object.freeze({
    'auto_tuning': CODES.RECOMMENDATION_AUTO_TUNING_FORBIDDEN,
    'auto_setup': CODES.RECOMMENDATION_AUTO_SETUP_FORBIDDEN,
    'auto_calibration': CODES.RECOMMENDATION_AUTO_CALIBRATION_FORBIDDEN,
    'auto_preset': CODES.RECOMMENDATION_AUTO_PRESET_FORBIDDEN,
  });

  // Recommendation closed key set.
  var RECOMMENDATION_KEYS = Object.freeze([
    'recommendationId',
    'priorityKey',
    'identity',                    // SourceIdentity
    'hypothesisId',                // backlink to the hypothesis this recommendation acts on
    'i18nKey',                     // display text key
    'params',
    'applyMode',                   // 'driver_action' | 'user_initiated' (no auto_*)
    'whyNowI18nKey',
    'expectedObservationI18nKey',
    'stopConditionI18nKey',
    'rollbackConditionI18nKey',
    'blockingPrerequisiteIds',     // array of validation-action ids that MUST complete first
    'limitations',
    'schemaVersion',
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;
  var ID_ARRAY_CAP = 32;
  var LIMITATION_ARRAY_CAP = 32;
  var STRING_BYTE_CAP = 512;
  var REC_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var REC_ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D1 R1 Finding RN-01 closure.
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  // Codex D1 R1 Finding RN-05 closure: ID-array elements MUST pass byte cap + id grammar.
  function _isIdArray(v, cap) {
    if (!Array.isArray(v) || v.length > cap) return false;
    for (var i = 0; i < v.length; i++) {
      var e = v[i];
      if (typeof e !== 'string' || e.length === 0) return false;
      if (REC_ID_FORBIDDEN_RE.test(e) || !REC_ID_RE.test(e)) return false;
      if (_utf8Bytes(e) > STRING_BYTE_CAP) return false;
    }
    return true;
  }

  /**
   * validatePriorityKey(k) — must be one of PRIORITY_KEYS. Returns { valid:true, rank } or blocked.
   */
  function validatePriorityKey(k) {
    try {
      if (typeof k !== 'string' || PRIORITY_KEY_RANK[k] === undefined) return RC.buildBlockedResult([CODES.RECOMMENDATION_PRIORITY_INVALID]);
      return Object.freeze({ valid: true, rank: PRIORITY_KEY_RANK[k] });
    } catch (e) {
      return RC.buildBlockedResult([CODES.RECOMMENDATION_PRIORITY_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * validateApplyMode(m) — strict whitelist; forbidden auto_* values map to their specific reason.
   */
  function validateApplyMode(m) {
    try {
      if (typeof m !== 'string') return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID]);
      if (APPLY_MODE_FORBIDDEN[m]) return RC.buildBlockedResult([APPLY_MODE_FORBIDDEN[m]]);
      if (APPLY_MODE_ALLOWED.indexOf(m) === -1) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID]);
      return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * validateRecommendationShape(r) — D1 STRUCTURAL gate.
   *
   * Additional D1 rule: a setup_experiment recommendation requires the linked hypothesis to be at
   * least 'Derived' credibility (the contract layer does NOT have hypothesis lookups — it only
   * checks the SHAPE; the engine layer at D4 performs the credibility join).
   */
  function validateRecommendationShape(rIn) {
    // Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(rIn)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'recommendation prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(rIn)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'recommendation carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(rIn)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'recommendation contains a nested non-plain object' });
    var r = RC.toCleanCopy(rIn);
    if (!_isPlain(r)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID], { detail: 'recommendation not plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(r, RECOMMENDATION_KEYS)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    if (!Number.isInteger(r.schemaVersion)) reasons.push(CODES.RECOMMENDATION_INVALID);
    else if (r.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (r.schemaVersion < 1) reasons.push(CODES.RECOMMENDATION_INVALID);

    if (!_nonEmptyStr(r.recommendationId)) reasons.push(CODES.RECOMMENDATION_INVALID);
    else if (REC_ID_FORBIDDEN_RE.test(r.recommendationId) || !REC_ID_RE.test(r.recommendationId)) reasons.push(CODES.RECOMMENDATION_INVALID);

    var pk = validatePriorityKey(r.priorityKey);
    if (pk.valid !== true) reasons.push(CODES.RECOMMENDATION_PRIORITY_INVALID);

    var idCheck = SI.validateSourceIdentity(r.identity);
    if (idCheck.valid !== true) reasons.push(CODES.SOURCE_IDENTITY_INVALID);

    if (!_nonEmptyStr(r.hypothesisId)) reasons.push(CODES.RECOMMENDATION_INVALID);

    ['i18nKey', 'whyNowI18nKey', 'expectedObservationI18nKey', 'stopConditionI18nKey', 'rollbackConditionI18nKey'].forEach(function (k) {
      var v = r[k];
      if (!_nonEmptyStr(v)) { reasons.push(CODES.RECOMMENDATION_INVALID); return; }
      if (_utf8Bytes(v) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      // Codex D1 R2 RN-08 closure: use HC.hasCausalOverclaim (centralized normalizing scanner that
      // collapses ALL Unicode dash characters + whitespace runs to underscore). Catches DRIVER-FAULT,
      // guaranteed-fix-recommended, exact−cause (U+2212), exact—cause (em-dash), GUARANTEED FIX.
      if (HC.hasCausalOverclaim(v)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
    });

    if ('params' in r) {
      var pc = HC.validateParamsShape(r.params);
      if (pc.valid !== true) reasons.push.apply(reasons, pc.reasonCodes || [CODES.RECOMMENDATION_INVALID]);
    }

    var amCheck = validateApplyMode(r.applyMode);
    if (amCheck.valid !== true) reasons.push.apply(reasons, amCheck.reasonCodes || [CODES.RECOMMENDATION_INVALID]);

    if (!_isIdArray(r.blockingPrerequisiteIds, ID_ARRAY_CAP)) reasons.push(CODES.RECOMMENDATION_INVALID);
    if (!Array.isArray(r.limitations) || r.limitations.length > LIMITATION_ARRAY_CAP) reasons.push(CODES.ARRAY_CAP_EXCEEDED);
    else for (var li = 0; li < r.limitations.length; li++) if (!RC.isReasonCode(r.limitations[li])) { reasons.push(CODES.RECOMMENDATION_INVALID); break; }

    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }
    return Object.freeze({ valid: true, rank: pk.rank });
    } catch (e) {
      return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'recommendation validator threw on hostile input' });
    }
  }

  var api = {
    PRIORITY_LADDER: PRIORITY_LADDER,
    PRIORITY_KEYS: PRIORITY_KEYS,
    PRIORITY_KEY_RANK: PRIORITY_KEY_RANK,
    APPLY_MODE_ALLOWED: APPLY_MODE_ALLOWED,
    APPLY_MODE_FORBIDDEN: APPLY_MODE_FORBIDDEN,
    RECOMMENDATION_KEYS: RECOMMENDATION_KEYS,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    validatePriorityKey: validatePriorityKey,
    validateApplyMode: validateApplyMode,
    validateRecommendationShape: validateRecommendationShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_RecommendationContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/decision-input-contract.js ======
/**
 * contracts/r3.0d/decision-input-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Composes evidence-node + hypothesis + recommendation contracts into the input SHAPE the future
 * D3 PRIORITY_ENGINE and D4 ENGINEER_BRIEF services will accept. D1 does NOT implement the engines —
 * it ONLY validates that a caller-supplied decision input has the closed shape every downstream
 * deterministic engine can safely read.
 *
 * Cross-shape invariants D1 enforces:
 *   • every supportingEvidenceId on every hypothesis references an evidence node present in the
 *     input.nodes array (no orphans at the input layer);
 *   • every contradictingEvidenceId same;
 *   • every alternativeExplanationId references one of the input.alternativeExplanations entries;
 *   • every validationActionId on every hypothesis references one of the input.validationActions
 *     entries;
 *   • every hypothesisId referenced by a recommendation exists in the input.hypotheses array;
 *   • every blockingPrerequisiteId references a validationAction;
 *   • all identities share the SAME caseId + sessionId (same-Analysis-Case scope from R3.0C is
 *     inherited — cross-case / cross-session decision inputs are forbidden at the SHAPE layer).
 *
 * The contract does NOT score / rank / select — D3+ services do that.
 *
 * UMD: Node require / Electron renderer global (R3_0D_DecisionInputContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = null; } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var EN = _req('./evidence-node-contract.js', typeof R3_0D_EvidenceNodeContract !== 'undefined' ? R3_0D_EvidenceNodeContract : undefined);
  var HC = _req('./hypothesis-contract.js', typeof R3_0D_HypothesisContract !== 'undefined' ? R3_0D_HypothesisContract : undefined);
  var REC = _req('./recommendation-contract.js', typeof R3_0D_RecommendationContract !== 'undefined' ? R3_0D_RecommendationContract : undefined);
  if (!RC || !EN || !HC || !REC) throw new Error('decision-input-contract.js requires reason-codes + evidence-node + hypothesis + recommendation');
  var CODES = RC.REASON_CODES;

  var DECISION_INPUT_KEYS = Object.freeze([
    'caseId',
    'sessionId',
    'nodes',
    'hypotheses',
    'alternativeExplanations',
    'validationActions',
    'recommendations',
    'schemaVersion',
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;

  // Graph-wide caps. Directive §8 / §9 — "graph caps, total envelope cap".
  var NODES_CAP = 256;
  var HYPOTHESES_CAP = 64;
  var ALTERNATIVES_CAP = 128;
  var VALIDATION_ACTIONS_CAP = 128;
  var RECOMMENDATIONS_CAP = 32;
  var ENVELOPE_BYTE_CAP = 256 * 1024; // 256 KiB total — far below the comparison-export 1 MiB cap

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D1 R1 Finding RN-01 closure.
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }

  /**
   * validateDecisionInputShape(input) — D1 STRUCTURAL gate over the composed graph.
   *
   * Returns { valid:true, summary:{...counts} } or buildBlockedResult.
   */
  function validateDecisionInputShape(inputIn) {
    // Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(inputIn)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'decision-input prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(inputIn)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION, CODES.UNKNOWN_OWN_KEY], { detail: 'decision-input carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(inputIn)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'decision-input contains a nested non-plain object' });
    var input = RC.toCleanCopy(inputIn);
    if (!_isPlain(input)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'decision-input not plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(input, DECISION_INPUT_KEYS)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    if (!Number.isInteger(input.schemaVersion)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (input.schemaVersion < 1) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);

    if (!_nonEmptyStr(input.caseId)) reasons.push(CODES.SOURCE_IDENTITY_INVALID);
    if (!_nonEmptyStr(input.sessionId)) reasons.push(CODES.SOURCE_IDENTITY_INVALID);

    // Per-collection: must be an array within cap, each entry must pass its respective SHAPE validator.
    if (!Array.isArray(input.nodes)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.nodes.length > NODES_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);
    if (!Array.isArray(input.hypotheses)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.hypotheses.length > HYPOTHESES_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);
    if (!Array.isArray(input.alternativeExplanations)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.alternativeExplanations.length > ALTERNATIVES_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);
    if (!Array.isArray(input.validationActions)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.validationActions.length > VALIDATION_ACTIONS_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);
    if (!Array.isArray(input.recommendations)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.recommendations.length > RECOMMENDATIONS_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);

    // Envelope byte cap — serialize-and-measure.
    try {
      var serialized = JSON.stringify(input);
      if (typeof serialized !== 'string') reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
      else {
        var bytes = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(serialized).length : Buffer.byteLength(serialized, 'utf8');
        if (bytes > ENVELOPE_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      }
    } catch (e) { reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION); }

    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }

    // Per-entry SHAPE validation + same-case / same-session cross-check + reference integrity.
    var nodeIds = {}, hypIds = {}, altIds = {}, actIds = {};
    var i, r;
    for (i = 0; i < input.nodes.length; i++) {
      r = EN.validateEvidenceNodeShape(input.nodes[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.EVIDENCE_NODE_INVALID]); continue; }
      if (nodeIds[input.nodes[i].nodeId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      nodeIds[input.nodes[i].nodeId] = true;
      if (input.nodes[i].identity.caseId !== input.caseId || input.nodes[i].identity.sessionId !== input.sessionId) reasons.push(CODES.SOURCE_IDENTITY_CASE_MISMATCH);
    }
    for (i = 0; i < input.alternativeExplanations.length; i++) {
      r = HC.validateAlternativeExplanationShape(input.alternativeExplanations[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.HYPOTHESIS_ALTERNATIVE_INVALID]); continue; }
      if (altIds[input.alternativeExplanations[i].alternativeId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      altIds[input.alternativeExplanations[i].alternativeId] = true;
    }
    for (i = 0; i < input.validationActions.length; i++) {
      r = HC.validateValidationActionShape(input.validationActions[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.VALIDATION_ACTION_INVALID]); continue; }
      if (actIds[input.validationActions[i].actionId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      actIds[input.validationActions[i].actionId] = true;
    }
    for (i = 0; i < input.hypotheses.length; i++) {
      r = HC.validateHypothesisShape(input.hypotheses[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.HYPOTHESIS_INVALID]); continue; }
      var h = input.hypotheses[i];
      if (hypIds[h.hypothesisId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      hypIds[h.hypothesisId] = true;
      if (h.identity.caseId !== input.caseId || h.identity.sessionId !== input.sessionId) reasons.push(CODES.SOURCE_IDENTITY_CASE_MISMATCH);
      // Reference integrity
      for (var sei = 0; sei < h.supportingEvidenceIds.length; sei++) if (!nodeIds[h.supportingEvidenceIds[sei]]) { reasons.push(CODES.HYPOTHESIS_EVIDENCE_LINK_INVALID); break; }
      for (var cei = 0; cei < h.contradictingEvidenceIds.length; cei++) if (!nodeIds[h.contradictingEvidenceIds[cei]]) { reasons.push(CODES.HYPOTHESIS_CONTRADICTION_INVALID); break; }
      for (var aei = 0; aei < h.alternativeExplanationIds.length; aei++) if (!altIds[h.alternativeExplanationIds[aei]]) { reasons.push(CODES.HYPOTHESIS_ALTERNATIVE_INVALID); break; }
      for (var vai = 0; vai < h.validationActionIds.length; vai++) if (!actIds[h.validationActionIds[vai]]) { reasons.push(CODES.VALIDATION_ACTION_INVALID); break; }
    }
    var recIds = {};
    for (i = 0; i < input.recommendations.length; i++) {
      r = REC.validateRecommendationShape(input.recommendations[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.RECOMMENDATION_INVALID]); continue; }
      var rec = input.recommendations[i];
      if (recIds[rec.recommendationId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      recIds[rec.recommendationId] = true;
      if (rec.identity.caseId !== input.caseId || rec.identity.sessionId !== input.sessionId) reasons.push(CODES.SOURCE_IDENTITY_CASE_MISMATCH);
      if (!hypIds[rec.hypothesisId]) reasons.push(CODES.RECOMMENDATION_INVALID);
      for (var bpi = 0; bpi < rec.blockingPrerequisiteIds.length; bpi++) if (!actIds[rec.blockingPrerequisiteIds[bpi]]) { reasons.push(CODES.RECOMMENDATION_INVALID); break; }
    }

    if (reasons.length) {
      var seen2 = {}, out2 = [];
      reasons.forEach(function (c) { if (!seen2[c]) { seen2[c] = true; out2.push(c); } });
      return RC.buildBlockedResult(out2);
    }
    return Object.freeze({
      valid: true,
      summary: Object.freeze({
        caseId: input.caseId,
        sessionId: input.sessionId,
        nodeCount: input.nodes.length,
        hypothesisCount: input.hypotheses.length,
        alternativeCount: input.alternativeExplanations.length,
        validationActionCount: input.validationActions.length,
        recommendationCount: input.recommendations.length,
      }),
    });
    } catch (e) {
      return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'decision-input validator threw on hostile input' });
    }
  }

  var api = {
    DECISION_INPUT_KEYS: DECISION_INPUT_KEYS,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    NODES_CAP: NODES_CAP,
    HYPOTHESES_CAP: HYPOTHESES_CAP,
    ALTERNATIVES_CAP: ALTERNATIVES_CAP,
    VALIDATION_ACTIONS_CAP: VALIDATION_ACTIONS_CAP,
    RECOMMENDATIONS_CAP: RECOMMENDATIONS_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    validateDecisionInputShape: validateDecisionInputShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_DecisionInputContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/engineer-brief-contract.js ======
/**
 * contracts/r3.0d/engineer-brief-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the Engineer Brief OUTPUT SHAPE — the closed envelope the D4 ENGINEER_BRIEF service emits
 * and the D5 UI renders. D1 contract layer validates the SHAPE only:
 *   • closed key set
 *   • required fields present
 *   • bounded strings + arrays
 *   • no causal overclaim wording at the structural layer (D3 / Codex enforces semantic)
 *   • no contradictions / cannotConclude / limitations hidden (directive §10 D5 UI rules promoted
 *     to a contract assertion: every brief MUST surface contradictions[], limitations[], and
 *     cannotConcludeReasonCodes[] fields — omission triggers BRIEF_CONTRADICTION_HIDDEN /
 *     BRIEF_LIMITATION_HIDDEN / BRIEF_CANNOT_CONCLUDE_HIDDEN).
 *
 * UMD: Node require / Electron renderer global (R3_0D_EngineerBriefContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = null; } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  var HC = _req('./hypothesis-contract.js', typeof R3_0D_HypothesisContract !== 'undefined' ? R3_0D_HypothesisContract : undefined);
  if (!RC || !CR || !SI || !HC) throw new Error('engineer-brief-contract.js requires reason-codes + credibility + source-identity + hypothesis');
  var CODES = RC.REASON_CODES;

  // Brief closed key set. Required-presence rules below.
  var BRIEF_KEYS = Object.freeze([
    'briefId',
    'identity',                    // SourceIdentity binding
    'primaryIssueI18nKey',
    'primaryIssueParams',
    'secondaryIssueI18nKey',       // optional — may be null
    'secondaryIssueParams',
    'evidenceSummary',             // array of { nodeId, i18nKey, params }
    'contradictions',              // array of { hypothesisId, contradictingEvidenceIds, i18nKey }
    'alternativeExplanations',     // array of { alternativeId, i18nKey }
    'cannotConcludeReasonCodes',   // array of reason codes
    'nextValidationAction',        // { actionId, kind, i18nKey } | null
    'driverExperimentI18nKey',     // optional — may be null
    'setupExperimentI18nKey',      // optional — may be null (requires qualified evidence; engine-checked)
    'confidence',                  // D1: { state: 'unresolved' | 'not_computed' } only
    'credibility',                 // CONCLUSION_CREDIBILITY enum
    'provenance',                  // PROVENANCE enum
    'limitations',                 // array of LIMITATION_* reason codes
    'schemaVersion',
  ]);

  // Mandatory-presence rule (directive §10 D5 UI invariants promoted to contract):
  //   contradictions, alternativeExplanations, cannotConcludeReasonCodes, limitations — even if
  //   empty arrays, the keys MUST be present. Omitting any of them triggers the corresponding
  //   BRIEF_*_HIDDEN code. This makes "hidden contradiction" a contract-level violation, not just
  //   a code-review observation.
  var MANDATORY_PRESENCE_KEYS = Object.freeze([
    { key: 'contradictions', missingCode: CODES.BRIEF_CONTRADICTION_HIDDEN },
    { key: 'alternativeExplanations', missingCode: CODES.BRIEF_INVALID },
    { key: 'cannotConcludeReasonCodes', missingCode: CODES.BRIEF_CANNOT_CONCLUDE_HIDDEN },
    { key: 'limitations', missingCode: CODES.BRIEF_LIMITATION_HIDDEN },
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;
  var ARRAY_CAP = 32;
  var STRING_BYTE_CAP = 512;
  var ENVELOPE_BYTE_CAP = 64 * 1024; // 64 KiB — UI surface, small

  var BRIEF_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var BRIEF_ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D1 R1 Finding RN-01 closure.
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  // Codex D1 R2 Finding RN-08 closure: use HC.hasCausalOverclaim (centralized normalizing scanner).
  function _hasCausalOverclaim(s) { return HC.hasCausalOverclaim(s); }
  function _checkI18nKey(v, reasons) {
    if (!_nonEmptyStr(v)) { reasons.push(CODES.BRIEF_INVALID); return; }
    if (_utf8Bytes(v) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
    if (_hasCausalOverclaim(v)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
  }

  /**
   * validateEngineerBriefShape(b) — D1 STRUCTURAL gate.
   */
  function validateEngineerBriefShape(bIn) {
    // Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(bIn)) return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'brief prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(bIn)) return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'brief carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(bIn)) return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'brief contains a nested non-plain object' });
    var b = RC.toCleanCopy(bIn);
    if (!_isPlain(b)) return RC.buildBlockedResult([CODES.BRIEF_INVALID], { detail: 'brief not plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(b, BRIEF_KEYS)) return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    if (!Number.isInteger(b.schemaVersion)) reasons.push(CODES.BRIEF_INVALID);
    else if (b.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (b.schemaVersion < 1) reasons.push(CODES.BRIEF_INVALID);

    if (!_nonEmptyStr(b.briefId) || BRIEF_ID_FORBIDDEN_RE.test(b.briefId) || !BRIEF_ID_RE.test(b.briefId)) reasons.push(CODES.BRIEF_INVALID);

    var idCheck = SI.validateSourceIdentity(b.identity);
    if (idCheck.valid !== true) reasons.push(CODES.SOURCE_IDENTITY_INVALID);

    _checkI18nKey(b.primaryIssueI18nKey, reasons);
    if ('primaryIssueParams' in b) {
      var pp = HC.validateParamsShape(b.primaryIssueParams);
      if (pp.valid !== true) reasons.push.apply(reasons, pp.reasonCodes || [CODES.BRIEF_INVALID]);
    }
    if ('secondaryIssueI18nKey' in b && b.secondaryIssueI18nKey !== null) _checkI18nKey(b.secondaryIssueI18nKey, reasons);
    if ('secondaryIssueParams' in b && b.secondaryIssueParams !== null) {
      var sp = HC.validateParamsShape(b.secondaryIssueParams);
      if (sp.valid !== true) reasons.push.apply(reasons, sp.reasonCodes || [CODES.BRIEF_INVALID]);
    }

    // Mandatory-presence keys
    MANDATORY_PRESENCE_KEYS.forEach(function (rule) {
      if (!(rule.key in b)) reasons.push(rule.missingCode);
      else if (!Array.isArray(b[rule.key])) reasons.push(rule.missingCode);
      else if (b[rule.key].length > ARRAY_CAP) reasons.push(CODES.ARRAY_CAP_EXCEEDED);
    });

    // Codex D1 R1 Finding RN-04 closure: each nested entry is a CLOSED-key shape with its own
    // validator. Extra own keys → BRIEF_INVALID + UNKNOWN_OWN_KEY. Contradiction entries also
    // validate contradictingEvidenceIds (id array with grammar + byte cap). Nested params validated.
    var EVIDENCE_SUMMARY_KEYS = ['nodeId', 'i18nKey', 'params'];
    var CONTRADICTION_KEYS = ['hypothesisId', 'contradictingEvidenceIds', 'i18nKey', 'params'];
    var ALT_ENTRY_KEYS = ['alternativeId', 'i18nKey', 'params'];
    function _checkBriefIdArray(v, cap) {
      if (!Array.isArray(v) || v.length > cap) return false;
      for (var i = 0; i < v.length; i++) {
        var e = v[i];
        if (typeof e !== 'string' || e.length === 0) return false;
        if (BRIEF_ID_FORBIDDEN_RE.test(e) || !BRIEF_ID_RE.test(e)) return false;
        if (_utf8Bytes(e) > STRING_BYTE_CAP) return false;
      }
      return true;
    }
    function _checkEntry(entry, allowedKeys, idKey, missingCode, requireContradictingEvidence) {
      if (!_isPlain(entry)) { reasons.push(missingCode); return; }
      if (!_hasOnlyAllowedKeys(entry, allowedKeys)) { reasons.push(missingCode); reasons.push(CODES.UNKNOWN_OWN_KEY); return; }
      if (!_nonEmptyStr(entry[idKey])) { reasons.push(missingCode); return; }
      if (BRIEF_ID_FORBIDDEN_RE.test(entry[idKey]) || !BRIEF_ID_RE.test(entry[idKey])) { reasons.push(missingCode); return; }
      if (_utf8Bytes(entry[idKey]) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      if (!_nonEmptyStr(entry.i18nKey)) { reasons.push(missingCode); return; }
      if (_utf8Bytes(entry.i18nKey) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      if (_hasCausalOverclaim(entry.i18nKey)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
      if ('params' in entry) {
        var pc = HC.validateParamsShape(entry.params);
        if (pc.valid !== true) reasons.push.apply(reasons, pc.reasonCodes || [missingCode]);
      }
      if (requireContradictingEvidence) {
        if (!_checkBriefIdArray(entry.contradictingEvidenceIds, ARRAY_CAP)) reasons.push(CODES.BRIEF_CONTRADICTION_HIDDEN);
      }
    }
    // Codex D1 R2 Finding RN-10 closure: every entry-collection MUST be an array with bounded length
    // BEFORE entry iteration runs. A non-array evidenceSummary previously skipped entry validation
    // entirely; now it triggers BRIEF_INVALID. contradictions / alternativeExplanations are mandatory-
    // presence keys already caught above; evidenceSummary is also enforced here.
    if (!Array.isArray(b.evidenceSummary)) reasons.push(CODES.BRIEF_INVALID);
    else if (b.evidenceSummary.length > ARRAY_CAP) reasons.push(CODES.ARRAY_CAP_EXCEEDED);
    else for (var ei = 0; ei < b.evidenceSummary.length; ei++) _checkEntry(b.evidenceSummary[ei], EVIDENCE_SUMMARY_KEYS, 'nodeId', CODES.BRIEF_INVALID, false);
    if (Array.isArray(b.contradictions)) for (var coi = 0; coi < b.contradictions.length; coi++) _checkEntry(b.contradictions[coi], CONTRADICTION_KEYS, 'hypothesisId', CODES.BRIEF_CONTRADICTION_HIDDEN, true);
    if (Array.isArray(b.alternativeExplanations)) for (var ali = 0; ali < b.alternativeExplanations.length; ali++) _checkEntry(b.alternativeExplanations[ali], ALT_ENTRY_KEYS, 'alternativeId', CODES.BRIEF_INVALID, false);

    // cannotConcludeReasonCodes + limitations — each entry MUST be a known reason code
    if (Array.isArray(b.cannotConcludeReasonCodes)) for (var ci = 0; ci < b.cannotConcludeReasonCodes.length; ci++) if (!RC.isReasonCode(b.cannotConcludeReasonCodes[ci])) { reasons.push(CODES.BRIEF_INVALID); break; }
    if (Array.isArray(b.limitations)) for (var li = 0; li < b.limitations.length; li++) if (!RC.isReasonCode(b.limitations[li])) { reasons.push(CODES.BRIEF_INVALID); break; }

    // nextValidationAction
    if ('nextValidationAction' in b && b.nextValidationAction !== null) {
      var va = HC.validateValidationActionShape(b.nextValidationAction);
      if (va.valid !== true) reasons.push.apply(reasons, va.reasonCodes || [CODES.VALIDATION_ACTION_INVALID]);
    }

    // driverExperiment / setupExperiment i18nKey — optional. setupExperiment requires
    // qualified evidence (engine-checked at D4); D1 only verifies the SHAPE.
    if ('driverExperimentI18nKey' in b && b.driverExperimentI18nKey !== null) _checkI18nKey(b.driverExperimentI18nKey, reasons);
    if ('setupExperimentI18nKey' in b && b.setupExperimentI18nKey !== null) _checkI18nKey(b.setupExperimentI18nKey, reasons);

    // Confidence — caller cannot supply numeric.
    var cfCheck = CR.validateConfidenceShape(b.confidence);
    if (cfCheck.valid !== true) reasons.push(CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN);

    if (CR.CONCLUSION_CREDIBILITY.indexOf(b.credibility) === -1) reasons.push(CODES.BRIEF_INVALID);
    if (CR.PROVENANCE.indexOf(b.provenance) === -1) reasons.push(CODES.EVIDENCE_PROVENANCE_INVALID);

    // Envelope byte cap
    try {
      var serialized = JSON.stringify(b);
      var bytes = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(serialized).length : Buffer.byteLength(serialized, 'utf8');
      if (bytes > ENVELOPE_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
    } catch (e) { reasons.push(CODES.BRIEF_INVALID); }

    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }
    return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'brief validator threw on hostile input' });
    }
  }

  var api = {
    BRIEF_KEYS: BRIEF_KEYS,
    MANDATORY_PRESENCE_KEYS: MANDATORY_PRESENCE_KEYS,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    ARRAY_CAP: ARRAY_CAP,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    validateEngineerBriefShape: validateEngineerBriefShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_EngineerBriefContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

// ====== contracts/r3.0d/index.js ======
/**
 * contracts/r3.0d/index.js — R3.0D D1 · Contract Foundation aggregate (NON-PRODUCTION).
 *
 * Re-exports the R3.0D Decision Engine contract surface. This is a CONTRACT artifact only: it lives
 * outside renderer/js/, has NO runtime consumer, is required by NO production module, imports
 * NOTHING from renderer/js/, and contains NO algorithm.
 *
 * UMD: Node require / Electron renderer global (R3_0D_Contracts).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = null; } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  var EN = _req('./evidence-node-contract.js', typeof R3_0D_EvidenceNodeContract !== 'undefined' ? R3_0D_EvidenceNodeContract : undefined);
  var HC = _req('./hypothesis-contract.js', typeof R3_0D_HypothesisContract !== 'undefined' ? R3_0D_HypothesisContract : undefined);
  var REC = _req('./recommendation-contract.js', typeof R3_0D_RecommendationContract !== 'undefined' ? R3_0D_RecommendationContract : undefined);
  var DI = _req('./decision-input-contract.js', typeof R3_0D_DecisionInputContract !== 'undefined' ? R3_0D_DecisionInputContract : undefined);
  var EB = _req('./engineer-brief-contract.js', typeof R3_0D_EngineerBriefContract !== 'undefined' ? R3_0D_EngineerBriefContract : undefined);
  if (!RC || !CR || !SI || !EN || !HC || !REC || !DI || !EB) throw new Error('contracts/r3.0d/index.js could not load the contract modules');

  var api = {
    reasonCodes: RC,
    credibility: CR,
    sourceIdentity: SI,
    evidenceNode: EN,
    hypothesis: HC,
    recommendation: REC,
    decisionInput: DI,
    engineerBrief: EB,
    // convenience top-level constants
    REASON_CODES: RC.REASON_CODES,
    ALL_REASON_CODES: RC.ALL_REASON_CODES,
    EVIDENCE_CATEGORIES: EN.EVIDENCE_CATEGORIES,
    EVIDENCE_CREDIBILITY: CR.EVIDENCE_CREDIBILITY,
    PROVENANCE: CR.PROVENANCE,
    CONFIDENCE_STATES: CR.CONFIDENCE_STATES,
    PRIORITY_LADDER: REC.PRIORITY_LADDER,
    HYPOTHESIS_CATEGORIES: HC.HYPOTHESIS_CATEGORIES,
    VALIDATION_ACTION_KIND_ALLOWED: HC.VALIDATION_ACTION_KIND_ALLOWED,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_Contracts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
