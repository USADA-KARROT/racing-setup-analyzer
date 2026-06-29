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
