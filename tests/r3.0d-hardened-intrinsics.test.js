/**
 * tests/r3.0d-hardened-intrinsics.test.js — adversarial direct-test of every HI.* wrapper.
 *
 * Codex D2 Round 16 RN-31 closure: Section AA in tests/r3.0d-evidence-graph.test.js asserts
 * `hostileInvocationCount === 0` but most assertions pass because the renderer's Step 0 entry
 * intrinsic guard BLOCKs the build before any wrapper is reached. That short-circuit masks the
 * architectural claim — we have not directly proven that the WRAPPER itself bypasses the ambient
 * method.
 *
 * This suite exercises each HI.* wrapper DIRECTLY (no renderer, no entry guard). For every
 * wrapper we install a hostile self-restoring replacement of an ambient intrinsic, invoke the
 * wrapper, and assert TWO independent properties:
 *
 *   1. hostileInvocationCount === 0 — the wrapper did not call the rebound ambient method.
 *   2. wrapper output is correct — the wrapper produced the same result as if no rebind
 *      had happened (i.e. it used the closure-captured pristine reference).
 *
 * If BOTH hold for every wrapper, the architectural claim ("the validation path never invokes
 * ambient intrinsics") is independently verified.
 *
 * Node CLI: `node tests/r3.0d-hardened-intrinsics.test.js`, exit 1 on any failure.
 */
'use strict';

const HI = require('../contracts/r3.0d/hardened-intrinsics.js');

// Capture our own pristine intrinsic refs at THIS module's init (before any test rebind).
// These are used by the runRebind harness to install + restore the hostile binding without
// depending on the (potentially-rebound) ambient Object.defineProperty.
const _origObjectDefineProperty = Object.defineProperty;
const _origReflectApply = Reflect.apply;

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else {
    fail++;
    console.log('  ✗ ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
  }
}

// runRebind(container, key, hostileImpl, action)
//   container: the object to rebind on (e.g. Array.prototype, Object, Reflect)
//   key:       the property name to rebind
//   hostileImpl: function to install (its body counts hits + may self-restore)
//   action:    () => result — the wrapper invocation to test under the rebind
// Returns: { result, hits } where hits is the count of hostile invocations.
//
// IMPORTANT: install + restore use the captured _origObjectDefineProperty via captured
// _origReflectApply so the harness itself never invokes the (potentially-rebound) ambient
// Object.defineProperty. Otherwise rebinding Object.defineProperty would cause the harness
// to invoke its own hostile during install/restore, corrupting subsequent tests.
function runRebind(container, key, hostileImpl, action) {
  const orig = container[key];
  let hits = 0;
  const hostile = function () {
    hits++;
    return hostileImpl.apply(this, arguments);
  };
  let result;
  try {
    _origReflectApply(_origObjectDefineProperty, Object, [container, key, { value: hostile, writable: true, enumerable: true, configurable: true }]);
    result = action();
  } finally {
    try { _origReflectApply(_origObjectDefineProperty, Object, [container, key, { value: orig, writable: true, enumerable: true, configurable: true }]); }
    catch (e) { container[key] = orig; }
  }
  return { result: result, hits: hits };
}

// ── Group 1 — Array.prototype methods ────────────────────────────────────────────
(function group1_arrayPrototype() {
  // safeArrayPush — must use _ObjectDefineProperty, not .push
  (function () {
    const arr = [];
    const r = runRebind(Array.prototype, 'push', function () { return 0; }, function () {
      HI.safeArrayPush(arr, 'value');
      return arr.length === 1 && arr[0] === 'value';
    });
    chk('safeArrayPush: hostile Array.prototype.push never invoked', r.hits === 0);
    chk('safeArrayPush: output correct (length=1, [0]="value")', r.result === true);
  })();

  // safeArrayIndexOf — must use direct loop, not .indexOf
  (function () {
    const arr = ['a', 'b', 'c'];
    const r = runRebind(Array.prototype, 'indexOf', function () { return -1; }, function () {
      return HI.safeArrayIndexOf(arr, 'b');
    });
    chk('safeArrayIndexOf: hostile Array.prototype.indexOf never invoked', r.hits === 0);
    chk('safeArrayIndexOf: output correct (returns 1)', r.result === 1);
  })();

  // safeArrayForEach — must use direct loop
  (function () {
    const arr = [1, 2, 3];
    let sum = 0;
    const r = runRebind(Array.prototype, 'forEach', function () { /* skip all */ }, function () {
      HI.safeArrayForEach(arr, function (v) { sum += v; });
      return sum;
    });
    chk('safeArrayForEach: hostile Array.prototype.forEach never invoked', r.hits === 0);
    chk('safeArrayForEach: output correct (sum=6)', r.result === 6);
  })();

  // safeArrayMap — must use direct loop with defineProperty
  (function () {
    const r = runRebind(Array.prototype, 'map', function () { return []; }, function () {
      const out = HI.safeArrayMap([1, 2, 3], function (v) { return v * 2; });
      return out.length === 3 && out[0] === 2 && out[1] === 4 && out[2] === 6;
    });
    chk('safeArrayMap: hostile Array.prototype.map never invoked', r.hits === 0);
    chk('safeArrayMap: output correct ([2,4,6])', r.result === true);
  })();

  // safeArraySlice — must use direct loop
  (function () {
    const r = runRebind(Array.prototype, 'slice', function () { return []; }, function () {
      const out = HI.safeArraySlice(['x', 'y', 'z']);
      return out.length === 3 && out[0] === 'x' && out[2] === 'z';
    });
    chk('safeArraySlice: hostile Array.prototype.slice never invoked', r.hits === 0);
    chk('safeArraySlice: output correct (copy of ["x","y","z"])', r.result === true);
  })();

  // safeArraySort — uses Reflect.apply on captured Array.prototype.sort
  (function () {
    const r = runRebind(Array.prototype, 'sort', function () { return this; }, function () {
      const arr = [3, 1, 2];
      HI.safeArraySort(arr);
      return arr[0] === 1 && arr[1] === 2 && arr[2] === 3;
    });
    chk('safeArraySort: hostile Array.prototype.sort never invoked', r.hits === 0);
    chk('safeArraySort: output correct (sorted [1,2,3])', r.result === true);
  })();
})();

// ── Group 2 — Object.* statics ────────────────────────────────────────────────────
(function group2_objectStatics() {
  // safeKeys
  (function () {
    const r = runRebind(Object, 'keys', function () { return []; }, function () {
      const keys = HI.safeKeys({ a: 1, b: 2 });
      return keys.length === 2 && keys.indexOf('a') !== -1 && keys.indexOf('b') !== -1;
    });
    chk('safeKeys: hostile Object.keys never invoked', r.hits === 0);
    chk('safeKeys: output correct ([a,b])', r.result === true);
  })();

  // safeGetOwnDescriptor
  (function () {
    const r = runRebind(Object, 'getOwnPropertyDescriptor', function () { return undefined; }, function () {
      const d = HI.safeGetOwnDescriptor({ a: 42 }, 'a');
      return d && d.value === 42;
    });
    chk('safeGetOwnDescriptor: hostile Object.getOwnPropertyDescriptor never invoked', r.hits === 0);
    chk('safeGetOwnDescriptor: output correct (value=42)', r.result === true);
  })();

  // safeGetOwnPropertyNames
  (function () {
    const r = runRebind(Object, 'getOwnPropertyNames', function () { return []; }, function () {
      const names = HI.safeGetOwnPropertyNames({ a: 1, b: 2 });
      return names.length === 2;
    });
    chk('safeGetOwnPropertyNames: hostile Object.getOwnPropertyNames never invoked', r.hits === 0);
    chk('safeGetOwnPropertyNames: output correct (length=2)', r.result === true);
  })();

  // safeGetPrototypeOf
  (function () {
    const r = runRebind(Object, 'getPrototypeOf', function () { return null; }, function () {
      const proto = HI.safeGetPrototypeOf({});
      return proto === Object.prototype;
    });
    chk('safeGetPrototypeOf: hostile Object.getPrototypeOf never invoked', r.hits === 0);
    chk('safeGetPrototypeOf: output correct (Object.prototype)', r.result === true);
  })();

  // safeDefineDataProperty (vs Object.defineProperty rebind)
  (function () {
    const r = runRebind(Object, 'defineProperty', function () { return arguments[0]; }, function () {
      const obj = {};
      const ok = HI.safeDefineDataProperty(obj, 'x', 99);
      return ok && obj.x === 99;
    });
    chk('safeDefineDataProperty: hostile Object.defineProperty never invoked', r.hits === 0);
    chk('safeDefineDataProperty: output correct (own data prop installed)', r.result === true);
  })();

  // safeHasOwn (vs hasOwnProperty.call rebind)
  (function () {
    const r = runRebind(Object.prototype, 'hasOwnProperty', function () { return false; }, function () {
      return HI.safeHasOwn({ a: 1 }, 'a') === true && HI.safeHasOwn({ a: 1 }, 'b') === false;
    });
    chk('safeHasOwn: hostile Object.prototype.hasOwnProperty never invoked', r.hits === 0);
    chk('safeHasOwn: output correct (true for present, false for absent)', r.result === true);
  })();

  // deepFreeze (vs Object.freeze rebind)
  (function () {
    const obj = { a: 1, nested: { b: 2 } };
    const r = runRebind(Object, 'freeze', function (o) { return o; }, function () {
      HI.deepFreeze(obj);
      return Object.isFrozen(obj) && Object.isFrozen(obj.nested);
    });
    chk('deepFreeze: hostile Object.freeze never invoked', r.hits === 0);
    chk('deepFreeze: output correct (recursively frozen)', r.result === true);
  })();
})();

// ── Group 3 — Reflect ────────────────────────────────────────────────────────────
(function group3_reflect() {
  // safeOwnKeys (uses Reflect.ownKeys via Reflect.apply)
  (function () {
    const r = runRebind(Reflect, 'ownKeys', function () { return []; }, function () {
      const keys = HI.safeOwnKeys({ a: 1, b: 2 });
      return keys.length === 2;
    });
    chk('safeOwnKeys: hostile Reflect.ownKeys never invoked', r.hits === 0);
    chk('safeOwnKeys: output correct (length=2)', r.result === true);
  })();
})();

// ── Group 4 — Number / Math / RegExp ────────────────────────────────────────────
(function group4_numberMathRegex() {
  (function () {
    const r = runRebind(Number, 'isInteger', function () { return true; }, function () {
      return HI.safeNumberIsInteger(1.5) === false && HI.safeNumberIsInteger(2) === true;
    });
    chk('safeNumberIsInteger: hostile Number.isInteger never invoked', r.hits === 0);
    chk('safeNumberIsInteger: output correct (1.5→false, 2→true)', r.result === true);
  })();

  (function () {
    const r = runRebind(Number, 'isFinite', function () { return true; }, function () {
      return HI.safeNumberIsFinite(Infinity) === false && HI.safeNumberIsFinite(42) === true;
    });
    chk('safeNumberIsFinite: hostile Number.isFinite never invoked', r.hits === 0);
    chk('safeNumberIsFinite: output correct (Infinity→false, 42→true)', r.result === true);
  })();

  (function () {
    const r = runRebind(Math, 'floor', function (n) { return n; }, function () {
      return HI.safeMathFloor(3.7) === 3 && HI.safeMathFloor(-1.2) === -2;
    });
    chk('safeMathFloor: hostile Math.floor never invoked', r.hits === 0);
    chk('safeMathFloor: output correct (3.7→3, -1.2→-2)', r.result === true);
  })();

  (function () {
    const r = runRebind(RegExp.prototype, 'test', function () { return true; }, function () {
      return HI.safeRegExpTest(/^[a-z]+$/, 'abc') === true && HI.safeRegExpTest(/^[a-z]+$/, '123') === false;
    });
    chk('safeRegExpTest: hostile RegExp.prototype.test never invoked', r.hits === 0);
    chk('safeRegExpTest: output correct ("abc"→true, "123"→false)', r.result === true);
  })();
})();

// ── Group 5 — String / global functions ─────────────────────────────────────────
(function group5_stringGlobals() {
  // safeStringCoerce (vs global String rebind)
  (function () {
    const r = runRebind(globalThis, 'String', function () { return 'constant'; }, function () {
      return HI.safeStringCoerce(42) === '42' && HI.safeStringCoerce(true) === 'true';
    });
    chk('safeStringCoerce: hostile global String never invoked', r.hits === 0);
    chk('safeStringCoerce: output correct (42→"42", true→"true")', r.result === true);
  })();

  // safeStringSlice (vs String.prototype.slice rebind)
  (function () {
    const r = runRebind(String.prototype, 'slice', function () { return ''; }, function () {
      return HI.safeStringSlice('abcdef', 1, 4) === 'bcd' && HI.safeStringSlice('xy', -2) === 'xy';
    });
    chk('safeStringSlice: hostile String.prototype.slice never invoked', r.hits === 0);
    chk('safeStringSlice: output correct ("abcdef".slice(1,4)→"bcd")', r.result === true);
  })();

  // safeStringCharCodeAt (vs String.prototype.charCodeAt rebind)
  (function () {
    const r = runRebind(String.prototype, 'charCodeAt', function () { return 0; }, function () {
      return HI.safeStringCharCodeAt('A', 0) === 65 && HI.safeStringCharCodeAt('z', 0) === 122;
    });
    chk('safeStringCharCodeAt: hostile String.prototype.charCodeAt never invoked', r.hits === 0);
    chk('safeStringCharCodeAt: output correct ("A"→65, "z"→122)', r.result === true);
  })();
})();

// ── Group 6 — TextEncoder + structuredClone ─────────────────────────────────────
(function group6_textEncoderStructuredClone() {
  // safeUtf8ByteLength via captured TextEncoder.prototype.encode (Codex Round 16 RN-28)
  (function () {
    const r = runRebind(TextEncoder.prototype, 'encode', function () { return { length: 0 }; }, function () {
      return HI.safeUtf8ByteLength('hello') === 5 && HI.safeUtf8ByteLength('é') === 2 && HI.safeUtf8ByteLength('🚀') === 4;
    });
    chk('safeUtf8ByteLength: hostile TextEncoder.prototype.encode never invoked', r.hits === 0);
    chk('safeUtf8ByteLength: output correct ("hello"→5, "é"→2, "🚀"→4)', r.result === true);
  })();

  // safeStructuredClone (vs globalThis.structuredClone rebind)
  (function () {
    const r = runRebind(globalThis, 'structuredClone', function (v) { return v; }, function () {
      const orig = { a: 1, b: { c: 2 } };
      const cloned = HI.safeStructuredClone(orig);
      // structuredClone should produce a separate object (identity differs) with same data
      return cloned !== orig && cloned !== null && cloned.a === 1 && cloned.b.c === 2 && cloned.b !== orig.b;
    });
    chk('safeStructuredClone: hostile globalThis.structuredClone never invoked', r.hits === 0);
    chk('safeStructuredClone: output correct (deep clone, separate identity)', r.result === true);
  })();
})();

// ── Group 7 — JSON / stableStringify ────────────────────────────────────────────
(function group7_jsonStableStringify() {
  // stableStringify must NOT invoke ambient JSON.stringify on objects (it walks manually).
  // It DOES invoke captured _JSONStringify on primitive strings, which doesn't trigger toJSON.
  (function () {
    const r = runRebind(JSON, 'stringify', function () { return '"poisoned"'; }, function () {
      const s = HI.stableStringify({ b: 2, a: 1, c: [3, 4] });
      // canonical: sorted keys, no spaces, primitive strings quoted via captured JSON.stringify
      return s === '{"a":1,"b":2,"c":[3,4]}';
    });
    chk('stableStringify: hostile JSON.stringify never invoked at the object/array level', r.hits === 0);
    chk('stableStringify: output correct (canonical sorted-keys JSON)', r.result === true);
  })();
})();

// ── Group 8 — deep audit + edge cases ────────────────────────────────────────────
(function group8_deepAudit() {
  // deepOriginalShapeAudit rejects class instances
  chk('deepOriginalShapeAudit: rejects class instance', HI.deepOriginalShapeAudit(new class {}()) === false);
  chk('deepOriginalShapeAudit: rejects Symbol key', HI.deepOriginalShapeAudit({ [Symbol('s')]: 1 }) === false);
  chk('deepOriginalShapeAudit: rejects non-enumerable extra',
    HI.deepOriginalShapeAudit(Object.defineProperty({}, 'h', { value: 1, enumerable: false })) === false);
  chk('deepOriginalShapeAudit: rejects accessor descriptor',
    HI.deepOriginalShapeAudit(Object.defineProperty({}, 'x', { get: function () { return 1; }, enumerable: true, configurable: true })) === false);
  chk('deepOriginalShapeAudit: accepts plain object + array', HI.deepOriginalShapeAudit({ a: 1, b: [1, 2] }) === true);
  chk('deepOriginalShapeAudit: rejects Infinity', HI.deepOriginalShapeAudit({ n: Infinity }) === false);
  chk('deepOriginalShapeAudit: rejects NaN', HI.deepOriginalShapeAudit({ n: NaN }) === false);
  chk('deepOriginalShapeAudit: rejects function value', HI.deepOriginalShapeAudit({ f: function () {} }) === false);

  // Frozen api guarantees
  chk('HI.api is frozen', Object.isFrozen(HI));
  chk('HI does NOT expose _ObjectFreeze (or any underscored private)',
    Object.keys(HI).every(k => !k.startsWith('_')));
})();

console.log('R3.0D hardened-intrinsics direct-test suite: ' + pass + ' pass, ' + fail + ' fail');
if (fail > 0) process.exit(1);
