/**
 * renderer/js/r3-0f-migration-engine.js — R3.0F F1 · Unified Migration Engine (PURE LOGIC, backend injected).
 *
 * Orchestrates per-store migrators (cases / sessions / r3_0e_experiments / r3_0e_outcomes /
 * r3_0e_timelines / r3_0e_followupLinks) against the unified storage envelope. The engine:
 *
 *   • is deterministic — same inputs + same injected clock + same backend state → same writes/journal.
 *   • is idempotent — running migrate() against a fully-migrated store performs ZERO writes AND ZERO
 *     journal appends; no spurious churn even when re-invoked repeatedly.
 *   • is fail-closed — future-version records are REJECTED (never coerced); malformed records, sparse
 *     arrays, accessors, symbols, Proxy traps, non-enumerable hostile keys, prototype-pollution, hostile
 *     toJSON hooks, BigInt/cycles are all stripped by an input firewall (structuredClone ONLY; JSON-fallback
 *     paths on the original object are intentionally REMOVED so toJSON traps cannot run — see F1-R1-02).
 *   • never silently drops data — every state-changing record is journaled; pure no-op runs emit no journal
 *     entries (audit count lives in state.lastRunPerStore) so repeat scans cannot churn the ring buffer.
 *   • never fabricates producer attestation — migrator output is plain data, and any field whose name
 *     looks like a producer-attestation marker (allowlist of well-known names) causes the migrated record
 *     to be REJECTED with PRODUCER_ATTESTATION_REFUSED (F1-R1-09).
 *   • commits store writes AND journal AND state in ONE atomic backend.transact() across all stores +
 *     META, so a META failure cannot land data without an audit row, and a data failure cannot land an
 *     audit row without the data (F1-R1-03).
 *   • never invents authority across stores — migration of one record never references another store's
 *     records. The follow-up reverse index and the experiments/outcomes secondary index are NOT touched
 *     by the engine; those indexes are owned by the live stores and will be re-validated next time the
 *     live store reads them.
 *   • enforces a closed-enum reasonCode at the boundary: any migrator-supplied reason that is not in
 *     contracts/r3.0f/migration-envelope.js REASON_CODES is mapped to NO_MIGRATION_PATH (F1-R1-01).
 *   • preflights journal capacity: if processing would exceed MAX_JOURNAL × JOURNAL_OVERFLOW_FACTOR
 *     entries in a single run, the engine HALTS before any mutation (F1-R1-05).
 *   • validates the persisted envelope structurally (not just engineVersion) and rejects any malformed
 *     envelope as ENVELOPE_VERSION_MISMATCH (F1-R1-06).
 *   • validates lifetimeJournalDropped is a non-negative safe integer (F1-R1-07).
 *   • recordHash is documented as a NON-CRYPTOGRAPHIC FNV-1a fingerprint — useful for audit comparison
 *     within one repository, NOT a tamper-proof signature (F1-R1-08).
 *   • validates backend.transact() return shape; fail-closed BACKEND_REJECTED if missing fields (F1-R1-10).
 *
 * Hostile-runtime defenses (anti-tamper, anti-poisoning):
 *   • Closure-captured intrinsics at module load time (Object.* / Array.* / JSON.* / String.* / Number.*).
 *   • structuredClone REQUIRED at module load — engine refuses to construct without it.
 *   • Migrator results validated at the boundary: ok must be explicit boolean; migrationsApplied must be
 *     an array of plain strings; reason must be in closed enum (or mapped to NO_MIGRATION_PATH).
 *   • Producer-attestation field-name allowlist rejection (see PRODUCER_ATTESTATION_FIELDS).
 *
 * Public API:
 *   createMigrationEngine({ backend, registry?, metaStore?, journalKey?, stateKey?, clock?, stamp?,
 *                           maxJournalEntries?, maxRecordBytes? })
 *     → { detect, plan, migrate, journal, envelope, knownStores }
 *
 *   detect()    → Promise<frozen { ok, currentEnvelope?, targetEnvelope, perStoreStatus, knownStores, envelopeMismatch }>
 *   plan()      → Promise<frozen { ok, generatedAt, steps, blockers, perStoreSummary }>
 *   migrate({confirm:true}) → Promise<frozen { ok, report | reasonCode }>
 *   journal()   → Promise<frozen array of journal entries (most recent last)>
 *   envelope()  → frozen target envelope
 *
 * UMD: Node require / Electron renderer global (R3_0F_MigrationEngine).
 */
(function (root) {
  'use strict';
  // Literal-only require pairs.
  function _loadEnv() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../contracts/r3.0f/migration-envelope.js'); } catch (_) { } }
    return (root && root.R3_0F_MigrationEnvelope) || null;
  }
  function _loadCaseMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/case-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_CaseMigrator) || null;
  }
  function _loadSessionMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/session-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_SessionMigrator) || null;
  }
  function _loadExperimentMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/experiment-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_ExperimentMigrator) || null;
  }
  function _loadOutcomeMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/outcome-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_OutcomeMigrator) || null;
  }
  function _loadTimelineMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/timeline-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_TimelineMigrator) || null;
  }
  function _loadFollowupMigrator() {
    if (typeof module !== 'undefined' && module.exports) { try { return require('../../scripts/migrators/followup-migrator.js'); } catch (_) { } }
    return (root && root.R3_0F_FollowupMigrator) || null;
  }

  // ── closure-captured intrinsics ──────────────────────────────────────────────
  var _ObjectFreeze        = Object.freeze;
  var _ObjectIsFrozen      = Object.isFrozen;
  var _ObjectKeys          = Object.keys;
  var _ObjectAssign        = Object.assign || function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k]; } return t; };
  var _ObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
  var _ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var _ObjectGetPrototypeOf = Object.getPrototypeOf;
  var _ObjectPrototype     = Object.prototype;
  var _ObjectPrototypeHasOwnProperty = Object.prototype.hasOwnProperty;
  var _ArrayIsArray        = Array.isArray;
  var _JSONStringify       = JSON.stringify;
  var _JSONParse           = JSON.parse;
  var _StructuredClone     = typeof structuredClone === 'function' ? structuredClone : null;
  var _isFinite            = isFinite;
  var _MathFloor           = Math.floor;
  var _Date                = Date;
  var _NumberIsFinite      = typeof Number.isFinite === 'function' ? Number.isFinite : function (v) { return typeof v === 'number' && _isFinite(v); };
  var _NumberIsSafeInteger = typeof Number.isSafeInteger === 'function' ? Number.isSafeInteger : function (v) { return _NumberIsFinite(v) && _MathFloor(v) === v && v <= 9007199254740991 && v >= -9007199254740991; };
  // F1-R10-01 / F1-R11-01 / F1-R11-02: closure-capture every prototype method the engine
  // invokes against potentially-tampered ambient prototypes. Invoke via captured Reflect.apply
  // (NOT via .call — that would still go through ambient Function.prototype.call). Reflect.apply
  // is invoked as a direct function call, never via property lookup.
  var _ReflectApply            = Reflect.apply;
  var _StringFromCharCode      = String.fromCharCode;
  var _StringProtoCharCodeAt   = String.prototype.charCodeAt;
  var _StringProtoReplace      = String.prototype.replace;
  var _StringProtoNormalize    = String.prototype.normalize;
  var _StringProtoToLowerCase  = String.prototype.toLowerCase;
  var _StringProtoIndexOf      = String.prototype.indexOf;
  var _NumberProtoToString     = Number.prototype.toString;
  var _ArrayProtoSort          = Array.prototype.sort;
  var _PromiseAll              = Promise.all.bind(Promise);
  var _PromiseResolve          = Promise.resolve.bind(Promise);
  var _PromiseReject           = Promise.reject.bind(Promise);
  // F1-R22-01: capture Promise.prototype.then and Promise.prototype.catch. Ambient .then
  // poisoning can rewrite resolved values delivered to engine callbacks (e.g. transforming
  // [50] → [] right before the JOURNAL_OVERFLOW preflight reads them). _safeThen / _safeCatch
  // route every engine-owned promise transition through captured Reflect.apply + captured
  // Promise.prototype.then / Promise.prototype.catch so the ambient prototype cannot intercept.
  var _PromiseProtoThen        = Promise.prototype.then;
  var _PromiseProtoCatch       = Promise.prototype.catch;
  function _safeThen(p, onFulfilled, onRejected) {
    return _ReflectApply(_PromiseProtoThen, p, onRejected === undefined ? [onFulfilled] : [onFulfilled, onRejected]);
  }
  function _safeCatch(p, onRejected) {
    return _ReflectApply(_PromiseProtoCatch, p, [onRejected]);
  }
  // F1-R18-01: avoid ambient Array.prototype.push on commit-critical arrays. Index-assignment
  // bypasses the prototype chain (assignment to arr[arr.length] uses the internal length slot,
  // not the .push method). Returns the new length.
  function _safePush(arr, v) { arr[arr.length] = v; return arr.length; }
  function _safeCharCodeAt(str, i)        { return _ReflectApply(_StringProtoCharCodeAt, str, [i]); }
  function _safeToString16(n)             { return _ReflectApply(_NumberProtoToString, n, [16]); }
  function _safeReplace(str, re, repl)    { return _ReflectApply(_StringProtoReplace, str, [re, repl]); }
  function _safeNormalize(str, form)      { return _ReflectApply(_StringProtoNormalize, str, [form]); }
  function _safeToLowerCase(str)          { return _ReflectApply(_StringProtoToLowerCase, str, []); }
  function _safeIndexOf(str, needle)      { return _ReflectApply(_StringProtoIndexOf, str, [needle]); }
  function _safeSort(arr)                 { return _ReflectApply(_ArrayProtoSort, arr, []); }

  var ENV = _loadEnv();
  if (!ENV) throw new Error('r3-0f-migration-engine: migration-envelope contract not loadable');

  var META_STORE_DEFAULT       = 'meta';
  var JOURNAL_KEY_DEFAULT      = '__r3_0f_migration_journal__';
  var STATE_KEY_DEFAULT        = '__r3_0f_migration_state__';
  var MAX_JOURNAL_ENTRIES_DEF  = 256;
  var MAX_RECORD_BYTES_DEF     = 8000000; // 8MB
  var JOURNAL_OVERFLOW_FACTOR  = 4;

  // F1-R1-09: producer-attestation field-name allowlist. Any migrated record whose top-level OR
  // nested object contains one of these keys is REJECTED with PRODUCER_ATTESTATION_REFUSED. Live
  // producer modules (R3.0B / R3.0C / R3.0D / R3.0E) use closure-private WeakSet attestation that
  // is NEVER serialized — these field names are reserved sentinels that downstream auditors must
  // be able to trust as "not present in persisted data".
  // F1-R1-09 / F1-R2-03: producer-attestation defense. We refuse migrator output that contains
  // either (a) an EXACT match to a well-known attestation key (case variants stripped via NFKC +
  // lowercase normalization), or (b) a key whose NFKC-lowercased form CONTAINS any of the
  // attestation TOKENS (authoritative / producerattested / attested / verified / signature /
  // proof / authority). Token-based check defends against case variants (`_AUTHORITATIVE`),
  // visual confusables normalized by NFKC, and obfuscated suffix/prefix forms (`_authXattested`).
  var PRODUCER_ATTESTATION_FIELDS = (function () {
    var s = {};
    var names = [
      '_authoritative', '_producerAttested', '_attested', '__attested',
      '_verified', '__verified', '_signature', '__signature',
      '_proof', '__proof', '_authority', '__authority',
      '_authoritativeSession', '_authoritativeCase', '_authoritativeOutcome'
    ];
    for (var i = 0; i < names.length; i++) s[names[i]] = true;
    return _ObjectFreeze(s);
  })();
  var PRODUCER_ATTESTATION_TOKENS = _ObjectFreeze([
    'authoritative', 'producerattested', 'attested', 'verified',
    'signature', 'proof', 'authority'
  ]);
  // Pre-compute the normalized form of the exact-name set for fast lookup.
  // F1-R5-01 / F1-R6-01 / F1-R7-01: strip ALL Unicode Default_Ignorable_Code_Point characters
  // AND all combining marks (\p{Mn}) BEFORE NFKC. DICP covers a superset of \p{Cf}: it also
  // includes Cn (unassigned default-ignorables like U+2065, U+FFF0..U+FFF8, U+E0000..U+E0FFF)
  // and the Hangul fillers (U+115F/U+1160/U+3164/U+FFA0). \p{Mn} covers combining marks
  // (combining acute U+0301, combining grapheme joiner U+034F, variation selectors supplement
  // U+E0100..U+E01EF) that are NOT in DICP but are still used in token-splicing attacks.
  // Unicode property escapes require the `u` flag and are stable since Node 12.
  // F1-R8-01: additionally strip \p{White_Space} (covers space U+0020, NBSP U+00A0, narrow
  // NBSP U+202F, ideographic space U+3000, line/paragraph separators U+2028/U+2029, and all
  // other Unicode-spec whitespace) AND Braille pattern blank U+2800 (a visually-blank `Lo`
  // character that survives every other strip).
  //
  // The full defang covers:
  //   \p{Default_Ignorable_Code_Point} — Cf + Hangul fillers + Cn unassigned-DICPs (R7)
  //   \p{Mn} — combining marks (R6)
  //   \p{Cc} — C0/C1 control characters (R8 pre-emptive)
  //   \p{Cs} — isolated surrogate halves (R8 pre-emptive)
  //   \p{White_Space} — all Unicode whitespace (R8)
  //   U+2800 — Braille blank (R8)
  // Field names in R3.0B/C/D/E contracts are camelCase ASCII; whitespace is never legitimate.
  var _DEFANG_RE = /[\p{Default_Ignorable_Code_Point}\p{Mn}\p{Cc}\p{Cs}\p{White_Space}⠀]/gu;
  // F1-R11-02: use closure-captured String prototype methods via _ReflectApply, so ambient
  // String.prototype.replace / .normalize / .toLowerCase rebinding cannot bypass attestation.
  function _normalizeKey(k) {
    if (typeof k !== 'string') return '';
    var stripped;
    try { stripped = _safeReplace(k, _DEFANG_RE, ''); } catch (_) { stripped = k; }
    var s;
    try { s = _safeNormalize(stripped, 'NFKC'); } catch (_) { s = stripped; }
    try { return _safeToLowerCase(s); } catch (_) { return s; }
  }
  var PRODUCER_ATTESTATION_NORMALIZED = (function () {
    var s = {};
    var names = _ObjectKeys(PRODUCER_ATTESTATION_FIELDS);
    for (var i = 0; i < names.length; i++) s[_normalizeKey(names[i])] = true;
    return _ObjectFreeze(s);
  })();
  // F1-R3-01: sentinel-aware token check. Ordinary contract field names that happen to contain
  // an attestation TOKEN (e.g. R3.0C `lapAuthority`, `distanceAuthority`, `normalizationAuthority`,
  // `projectionSignature`, R3.0E `experimentVerified`, etc.) are legitimate persisted data and
  // must NOT be rejected. The runtime rule:
  //   (a) Exact match (after NFKC + lowercase) to one of the 15 PRODUCER_ATTESTATION_FIELDS
  //       sentinel names — REJECT (defends against `_authoritative`, `_AUTHORITATIVE`, `__verified`).
  //   (b) Key that BEGINS with one or more underscores (the JS "private sentinel" convention)
  //       AND whose normalized form contains an attestation token — REJECT. This catches
  //       `_authXattested`, `__customAuthority`, `___signature`, etc. while letting
  //       camelCase contract fields pass.
  //   (c) Otherwise — accept. Ordinary field names whose body contains an attestation token
  //       (e.g. `lapAuthority`, `projectionSignature`, `experimentVerified`) are NOT private
  //       sentinels and must pass migration.
  function _keyLooksLikeAttestation(k) {
    if (typeof k !== 'string' || k.length === 0) return false;
    var n = _normalizeKey(k);
    if (!n) return false;
    if (PRODUCER_ATTESTATION_NORMALIZED[n]) return true;
    // F1-R4-01: check the NORMALIZED first char, not the raw key's first char. NFKC normalizes
    // Unicode low-line confusables (U+FF3F fullwidth, U+FE33 presentation form, etc.) to '_';
    // a hostile migrator using `＿fakeSignatureHere` would bypass a raw-char check while still
    // collapsing to a private-sentinel-looking key under NFKC.
    if (_safeCharCodeAt(n, 0) !== 0x5F /* '_' */) return false;
    for (var i = 0; i < PRODUCER_ATTESTATION_TOKENS.length; i++) {
      if (_safeIndexOf(n, PRODUCER_ATTESTATION_TOKENS[i]) !== -1) return true;
    }
    return false;
  }

  function _containsAttestationField(v, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 64) return true; // depth-bomb defense; treat as attestation-suspect
    if (v === null || typeof v !== 'object') return false;
    if (_ArrayIsArray(v)) {
      for (var i = 0; i < v.length; i++) {
        if (_containsAttestationField(v[i], depth + 1)) return true;
      }
      return false;
    }
    var keys = _ObjectKeys(v);
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      if (_keyLooksLikeAttestation(k)) return true;
      if (_containsAttestationField(v[k], depth + 1)) return true;
    }
    return false;
  }

  // Default registry (literal loaders)
  function _defaultRegistry() {
    var reg = {};
    var mods = [
      _loadCaseMigrator(),
      _loadSessionMigrator(),
      _loadExperimentMigrator(),
      _loadOutcomeMigrator(),
      _loadTimelineMigrator(),
      _loadFollowupMigrator()
    ];
    for (var i = 0; i < mods.length; i++) {
      var m = mods[i];
      if (m && typeof m.storeKey === 'string' && typeof m.migrate === 'function') {
        reg[m.storeKey] = m;
      }
    }
    return reg;
  }

  function _isPlainObject(v) {
    if (v === null || typeof v !== 'object') return false;
    if (_ArrayIsArray(v)) return false;
    return true;
  }

  function _now(clock, stamp) {
    if (typeof clock === 'function') {
      try { var s = clock(); if (typeof s === 'string' && s.length) return s; } catch (_) { /* fall through */ }
    }
    if (typeof stamp === 'string' && stamp.length) return stamp;
    try { return new _Date().toISOString(); } catch (_) { return '1970-01-01T00:00:00.000Z'; }
  }

  // F1-R1-08: NON-CRYPTOGRAPHIC deterministic fingerprint over JSON serialization. Useful for
  // auditing equality of post-migration records within one repository, NOT for proving authority,
  // NOT collision-resistant under adversarial input. Auditors must treat this as a weak hash.
  // F1-R10-01: use closure-captured String.prototype.charCodeAt and Number.prototype.toString so
  // ambient-prototype rebinding cannot corrupt or throw out of the hash path.
  function _hash(str) {
    if (typeof str !== 'string') str = String(str);
    var h1 = 0x811c9dc5, h2 = 0xcbf29ce4;
    var n = str.length;
    for (var i = 0; i < n; i++) {
      var c = _safeCharCodeAt(str, i);
      h1 ^= c & 0xff; h1 = (h1 * 0x01000193) >>> 0;
      h2 ^= (c >> 8) & 0xff; h2 = (h2 * 0x01000193) >>> 0;
    }
    var a = _safeToString16(h1); while (a.length < 8) a = '0' + a;
    var b = _safeToString16(h2); while (b.length < 8) b = '0' + b;
    return 'fnv1a64:' + a + b;
  }

  // F1-R14-01: JSON-safety walker. structuredClone preserves Date/BigInt/Map/Set/RegExp etc., and
  // JSON.stringify on those would invoke ambient toJSON hooks (e.g. BigInt.prototype.toJSON).
  // Walk the structuredCloned value BEFORE JSON.stringify and reject any non-plain-JSON value.
  // Returns true iff the value is purely null / string / number / boolean / plain object / array.
  // Note: undefined is rejected here because JSON would silently strip it; callers receive a
  // sanitize-fail and journal the record as RECORD_CIRCULAR.
  function _isJsonSafe(v, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 256) return false; // bounded depth
    if (v === null) return true;
    var t = typeof v;
    if (t === 'string' || t === 'boolean') return true;
    if (t === 'number') return _isFinite(v); // reject NaN/Infinity (JSON would coerce to null)
    // JSON.stringify omits object properties whose value is undefined (per ECMA-262 §25.5.2).
    // To stay consistent with R3.0B importBundle which sets `schema: undefined`, the engine
    // treats undefined on a property as JSON-safe (it will be stripped during serialization).
    if (t === 'undefined') return true;
    if (t === 'function' || t === 'symbol' || t === 'bigint') return false;
    if (t !== 'object') return false;
    if (_ArrayIsArray(v)) {
      for (var i = 0; i < v.length; i++) if (!_isJsonSafe(v[i], depth + 1)) return false;
      return true;
    }
    // F1-R15-01: use CLOSURE-CAPTURED Object.getPrototypeOf + Object.prototype. Ambient rebinding
    // of Object.getPrototypeOf (e.g., made to always return Object.prototype) would otherwise let
    // a Date / Map / Set / RegExp / typed array survive this check and reach JSON.stringify where
    // its prototype toJSON hook would fire.
    var proto = _ObjectGetPrototypeOf(v);
    if (proto !== null && proto !== _ObjectPrototype) return false;
    var keys = _ObjectKeys(v);
    for (var j = 0; j < keys.length; j++) if (!_isJsonSafe(v[keys[j]], depth + 1)) return false;
    return true;
  }

  // F1-R20-01: descriptor-only preflight. structuredClone invokes accessor getters on enumerable
  // accessor properties. We walk own property descriptors (via captured
  // _ObjectGetOwnPropertyDescriptor) WITHOUT reading the value, and reject any descriptor that
  // lacks `value` (i.e., accessor descriptor with `get`/`set`). Symbols are not reachable via
  // _ObjectGetOwnPropertyNames so they're naturally excluded; if they were reachable via
  // own-property-symbols, we'd also reject. Returns true if the tree is safe to structuredClone.
  function _isAccessorFreeDescriptorTree(v, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 256) return false;
    if (v === null) return true;
    var t = typeof v;
    if (t !== 'object') return true;
    var names = _ObjectGetOwnPropertyNames(v);
    for (var i = 0; i < names.length; i++) {
      var k = names[i];
      var d;
      try { d = _ObjectGetOwnPropertyDescriptor(v, k); } catch (_) { return false; }
      if (!d) return false;
      // Accessor descriptor → REJECT
      if (typeof d.get === 'function' || typeof d.set === 'function') return false;
      // Data descriptor with `value` — recurse without reading via v[k] (use d.value)
      if (!('value' in d)) return false;
      if (!_isAccessorFreeDescriptorTree(d.value, depth + 1)) return false;
    }
    return true;
  }

  // F1-R19-01: trap-free own-key serializer. JSON.stringify invokes any `toJSON` it can find via
  // the prototype chain — including a hostile `Object.prototype.toJSON` installed after engine
  // load. This serializer walks own enumerable keys directly (via captured _ObjectKeys) and
  // emits JSON without consulting toJSON at any point. Bounded depth 256. Returns a JSON string
  // OR null on failure (cycle / unsupported value). Caller must have already validated input via
  // _isJsonSafe (so only null / boolean / finite number / string / plain object / array reach).
  function _safeJsonStringify(v, depth) {
    if (depth === undefined) depth = 0;
    if (depth > 256) return null;
    // JSON.stringify treats undefined as null when it appears as an ARRAY element (caller's
    // responsibility to omit when it's an object PROPERTY VALUE). Returning 'null' here
    // mirrors that behaviour for array elements; object-key callers explicitly skip undefined
    // before invoking this function (see the plain-object branch below).
    if (v === undefined) return 'null';
    if (v === null) return 'null';
    var t = typeof v;
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'number') {
      if (!_isFinite(v)) return null;
      // Use ambient Number→string conversion via _safeToString16-style approach is overkill;
      // simple coercion is safe here because _isJsonSafe already rejected NaN/Infinity, and
      // primitive number stringification does not invoke prototype methods on the number.
      return '' + v;
    }
    if (t === 'string') {
      // Escape per JSON RFC 8259 §7. Walk char-by-char using captured charCodeAt; emit using
      // string concatenation (no prototype methods on the result string).
      var out = '"';
      for (var i = 0; i < v.length; i++) {
        var c = _safeCharCodeAt(v, i);
        if (c === 0x22) out += '\\"';        // "
        else if (c === 0x5C) out += '\\\\';   // backslash
        else if (c === 0x08) out += '\\b';
        else if (c === 0x09) out += '\\t';
        else if (c === 0x0A) out += '\\n';
        else if (c === 0x0C) out += '\\f';
        else if (c === 0x0D) out += '\\r';
        else if (c < 0x20) {
          var h = _safeToString16(c);
          while (h.length < 4) h = '0' + h;
          out += '\\u' + h;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          // Lone surrogate — _isJsonSafe should have rejected via _DEFANG_RE on key paths but
          // primitive string VALUES with lone surrogates may survive. Emit as \uXXXX escape.
          var hs = _safeToString16(c);
          while (hs.length < 4) hs = '0' + hs;
          out += '\\u' + hs;
        } else {
          // Build single-char string via String.fromCharCode (intrinsic — closure-captured)
          out += _StringFromCharCode(c);
        }
      }
      return out + '"';
    }
    if (t !== 'object') return null; // function / bigint / symbol / undefined → unsupported
    if (_ArrayIsArray(v)) {
      var parts = [];
      for (var ai = 0; ai < v.length; ai++) {
        var elem = _safeJsonStringify(v[ai], depth + 1);
        if (elem === null) return null;
        parts[parts.length] = elem;
      }
      // Join with comma using string concatenation (no Array.prototype.join — could be tampered).
      var arrStr = '[';
      for (var pj = 0; pj < parts.length; pj++) {
        if (pj > 0) arrStr += ',';
        arrStr += parts[pj];
      }
      return arrStr + ']';
    }
    // Plain object: walk own enumerable keys. Per JSON.stringify semantics, properties whose
    // value is `undefined` are OMITTED from the output (the key disappears entirely).
    var keys = _ObjectKeys(v);
    var entries = [];
    for (var ki = 0; ki < keys.length; ki++) {
      var k = keys[ki];
      var keyVal = v[k];
      if (keyVal === undefined) continue; // omit undefined-valued properties (JSON spec)
      var keyStr = _safeJsonStringify(k, depth + 1);
      if (keyStr === null) return null;
      var valStr = _safeJsonStringify(keyVal, depth + 1);
      if (valStr === null) return null;
      entries[entries.length] = keyStr + ':' + valStr;
    }
    var objStr = '{';
    for (var ej = 0; ej < entries.length; ej++) {
      if (ej > 0) objStr += ',';
      objStr += entries[ej];
    }
    return objStr + '}';
  }

  // F1-R1-02 / F1-R14-01 / F1-R19-01: structured-clone-only firewall + JSON-safety walker +
  // trap-free serializer. If structuredClone is unavailable OR throws on the input, the record
  // is REJECTED. We then walk the cloned tree and reject any non-plain-JSON value (BigInt / Date /
  // Map / Set / typed array / function / symbol / NaN / Infinity / non-plain prototype). The
  // post-clone JSON serialization uses _safeJsonStringify (trap-free) instead of JSON.stringify
  // so hostile Object.prototype.toJSON / Array.prototype.toJSON / inherited toJSON hooks added
  // AFTER module load cannot fire.
  function _sanitize(rec, maxBytes) {
    if (rec === null || rec === undefined) return { ok: false, reason: 'RECORD_NOT_AN_OBJECT' };
    if (typeof rec !== 'object') return { ok: false, reason: 'RECORD_NOT_AN_OBJECT' };
    if (_ArrayIsArray(rec)) return { ok: false, reason: 'RECORD_NOT_AN_OBJECT' };
    if (!_StructuredClone) return { ok: false, reason: 'PROXY_INPUT_REJECTED' }; // refuse without structured clone
    // F1-R20-01: descriptor-only preflight — reject any accessor property BEFORE structuredClone
    // can invoke its getter. structuredClone honors enumerable accessor descriptors and clones
    // the getter's return value, so a hostile getter could materialize an attacker-controlled
    // value into the engine's pipeline. We walk own descriptors with no value-read.
    if (!_isAccessorFreeDescriptorTree(rec)) return { ok: false, reason: 'PROXY_INPUT_REJECTED' };
    var cloned;
    try { cloned = _StructuredClone(rec); } catch (_) { return { ok: false, reason: 'PROXY_INPUT_REJECTED' }; }
    // F1-R14-01: pre-validate the cloned tree is purely JSON-safe (no BigInt/Date/Map/Set/typed
    // arrays/Symbol/Function/NaN/Infinity/non-plain prototypes). Reject before JSON.stringify so
    // no toJSON hook is reachable.
    if (!_isJsonSafe(cloned)) return { ok: false, reason: 'RECORD_CIRCULAR' };
    // F1-R19-01: use trap-free _safeJsonStringify instead of JSON.stringify, so a hostile
    // Object.prototype.toJSON / inherited toJSON cannot be invoked during serialization.
    var serialized = _safeJsonStringify(cloned);
    if (typeof serialized !== 'string') return { ok: false, reason: 'RECORD_CIRCULAR' };
    if (serialized.length > maxBytes) return { ok: false, reason: 'RECORD_TOO_LARGE', bytes: serialized.length };
    var final;
    try { final = _JSONParse(serialized); } catch (_) { return { ok: false, reason: 'RECORD_CIRCULAR' }; }
    if (!_isPlainObject(final)) return { ok: false, reason: 'RECORD_NOT_AN_OBJECT' };
    return { ok: true, value: final, bytes: serialized.length };
  }

  // F1-R1-01: closed-enum boundary. Map any migrator-supplied reason that is NOT in the contract
  // enum to NO_MIGRATION_PATH so unknown codes never poison the journal. Legacy R3.0B codes are
  // pre-mapped to their F1 equivalents.
  var LEGACY_REASON_MAP = (function () {
    var m = {};
    m['case_NOT_AN_OBJECT']    = 'RECORD_NOT_AN_OBJECT';
    m['session_NOT_AN_OBJECT'] = 'RECORD_NOT_AN_OBJECT';
    m['case_BAD_VERSION']      = 'RECORD_BAD_VERSION';
    m['session_BAD_VERSION']   = 'RECORD_BAD_VERSION';
    return _ObjectFreeze(m);
  })();
  function _coerceReasonCode(reason) {
    if (typeof reason !== 'string' || !reason.length) return 'NO_MIGRATION_PATH';
    if (LEGACY_REASON_MAP[reason]) return LEGACY_REASON_MAP[reason];
    // build reason set from contract — closure-captured
    var REASON_CODES = ENV.REASON_CODES;
    for (var i = 0; i < REASON_CODES.length; i++) if (REASON_CODES[i] === reason) return reason;
    return 'NO_MIGRATION_PATH';
  }

  // F1 pre-R21 hardening: sanitize limitations array via index loop (no ambient
  // Array.prototype.slice/.map/.filter chain). Strings only, max 16 entries, max 200 chars each.
  function _sanitizeLimitationsList(arr) {
    if (!_ArrayIsArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length && out.length < 16; i++) {
      var v = arr[i];
      if (typeof v === 'string' && v.length > 0) {
        // Truncate to 200 chars via captured charCodeAt-style index access; primitive substring
        // would itself use ambient String.prototype.slice — we use the captured _safeReplace
        // style approach by building char-by-char.
        if (v.length <= 200) _safePush(out, v);
        else {
          var truncated = '';
          for (var j = 0; j < 200; j++) truncated += _StringFromCharCode(_safeCharCodeAt(v, j));
          _safePush(out, truncated);
        }
      }
    }
    return out;
  }

  // F1-R1-01: validate migrationsApplied array contains only short non-empty strings (defense vs
  // migrator-supplied fabricated audit labels). Returns sanitized copy.
  function _sanitizeMigrationsApplied(arr) {
    if (!_ArrayIsArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length && i < 32; i++) {
      var v = arr[i];
      if (typeof v === 'string' && v.length > 0 && v.length <= 64) _safePush(out, v);
    }
    return out;
  }

  function _journalEntry(now, store, key, fromVersion, toVersion, status, migrationsApplied, recordHash, reasonCode, limitations) {
    var entry = {
      schemaVersion: 1,
      recordedAt: now,
      store: store,
      key: key,
      fromVersion: fromVersion,
      toVersion: toVersion,
      status: status,
      recordHash: typeof recordHash === 'string' ? recordHash : '',
      migrationsApplied: _sanitizeMigrationsApplied(migrationsApplied),
      // F1 pre-R21 hardening: replace ambient .slice/.map/.filter chain with index loops so
      // limitations sanitization is not vulnerable to selective Array prototype poisoning.
      limitations: _sanitizeLimitationsList(limitations)
    };
    if (status === 'rejected' || status === 'failed') {
      entry.reasonCode = _coerceReasonCode(reasonCode);
    }
    return ENV.deepFreeze(entry);
  }

  // F1-R2-01 / F1-R9-01: deterministic preimage hash used for TOCTOU sentinels.
  //
  // F1-R9-01: the hash MUST be taken AFTER structured-clone sanitization. Calling JSON.stringify
  // on the ORIGINAL listed value would re-trigger inherited toJSON traps, undoing the F1-R1-02
  // firewall. structuredClone strips proxies/accessors/toJSON before JSON-stringify reads any
  // property. Handles records (objects), priorJournal (arrays), priorState (object or null) and
  // primitives uniformly so the same canonical form is hashed on both sides of the TOCTOU window.
  // Returns null on sanitization failure (no comparable preimage).
  // F1-R10-02: capture a backend row's key + value once per intake, under try/catch, so a
  // hostile custom backend cannot fire an accessor getter twice or surface unexpected errors
  // beyond the firewall. Returns null on any error or non-object input.
  function _captureRow(row) {
    if (!row || typeof row !== 'object') return null;
    try {
      var k = row.key;
      var v = row.value;
      return { key: k, value: v };
    } catch (_) {
      return null;
    }
  }

  // F1-R14-01: same JSON-safety walker applies here too. structuredClone may preserve BigInt,
  // Date, etc.; JSON.stringify would invoke their toJSON. Reject unsafe values BEFORE serialize.
  // null on unsafe → callers fail-closed (TOCTOU comparisons against valid hashes will not match).
  function _sanitizedHash(v) {
    if (v === undefined) v = null;
    var cloned;
    try {
      if (v === null) cloned = null;
      else if (typeof v !== 'object') cloned = v;
      else {
        // F1-R20-01: descriptor-only preflight before structuredClone.
        if (!_isAccessorFreeDescriptorTree(v)) return null;
        cloned = _StructuredClone(v);
      }
    } catch (_) { return null; }
    if (cloned !== null && typeof cloned === 'object' && !_isJsonSafe(cloned)) return null;
    if (typeof cloned !== 'object' && cloned !== null && typeof cloned !== 'string' && typeof cloned !== 'number' && typeof cloned !== 'boolean') return null;
    // F1-R19-01: trap-free serialization
    var s = _safeJsonStringify(cloned);
    return typeof s === 'string' ? _hash(s) : null;
  }

  // ── engine factory ───────────────────────────────────────────────────────────
  function createMigrationEngine(spec) {
    spec = spec || {};
    if (!spec.backend || typeof spec.backend.transact !== 'function') {
      throw new Error('createMigrationEngine: backend with transact required');
    }
    if (typeof spec.backend.list !== 'function' || typeof spec.backend.get !== 'function') {
      throw new Error('createMigrationEngine: backend with list+get required');
    }
    if (!_StructuredClone) {
      throw new Error('createMigrationEngine: structuredClone required (Node 17+ / modern browser)');
    }
    var backend             = spec.backend;
    var registry            = spec.registry && typeof spec.registry === 'object' ? spec.registry : _defaultRegistry();
    var META                = (typeof spec.metaStore === 'string' && spec.metaStore.length) ? spec.metaStore : META_STORE_DEFAULT;
    var JOURNAL_KEY         = (typeof spec.journalKey === 'string' && spec.journalKey.length) ? spec.journalKey : JOURNAL_KEY_DEFAULT;
    var STATE_KEY           = (typeof spec.stateKey === 'string' && spec.stateKey.length) ? spec.stateKey : STATE_KEY_DEFAULT;
    var MAX_JOURNAL         = _NumberIsFinite(spec.maxJournalEntries) && spec.maxJournalEntries > 0 ? _MathFloor(spec.maxJournalEntries) : MAX_JOURNAL_ENTRIES_DEF;
    var MAX_RECORD_BYTES    = _NumberIsFinite(spec.maxRecordBytes) && spec.maxRecordBytes > 0 ? _MathFloor(spec.maxRecordBytes) : MAX_RECORD_BYTES_DEF;
    var clock               = spec.clock;
    var stamp               = spec.stamp;
    // F1 pre-R21 hardening: use captured Array.prototype.sort via Reflect.apply so ambient
    // tampering with sort cannot collapse KNOWN_STORES to [].
    var KNOWN_STORES        = _safeSort(_ObjectKeys(registry));
    // F1-R2-01: engine-level migrate() serialization. Concurrent migrate() calls on the same
    // engine queue behind this Promise chain so they cannot race on the list-then-transact window.
    // Backend.transact also serializes underneath, but the engine reads BEFORE entering transact
    // (to build the per-record migration plan), and that read-window is what this mutex protects.
    var migrateChain = _PromiseResolve();

    for (var i = 0; i < KNOWN_STORES.length; i++) {
      var sk = KNOWN_STORES[i];
      var mg = registry[sk];
      if (!mg || typeof mg.migrate !== 'function' || mg.storeKey !== sk || !_NumberIsFinite(mg.targetVersion) || mg.targetVersion < 0) {
        throw new Error('createMigrationEngine: invalid migrator for storeKey=' + sk);
      }
      var declared = ENV.PER_STORE_TARGETS[sk];
      if (declared !== undefined && mg.targetVersion !== declared) {
        throw new Error('createMigrationEngine: migrator targetVersion drift for storeKey=' + sk + ' (' + mg.targetVersion + ' != ' + declared + ')');
      }
    }

    function envelope() { return ENV.buildEnvelope(); }

    function _readState() {
      return _safeThen(backend.get(META, STATE_KEY), function (st) {
        if (!_isPlainObject(st)) return null;
        return st;
      }, function () { return null; });
    }
    // F1 pre-R21 hardening: copy via index loop instead of ambient Array.prototype.slice so a
    // poisoned slice cannot return [] while the underlying journal is non-empty (which would
    // cause priorJournalHash drift vs the in-transact re-read, but harden up front anyway).
    function _readJournal() {
      return _safeThen(backend.get(META, JOURNAL_KEY), function (j) {
        var src = null;
        if (_ArrayIsArray(j)) src = j;
        else if (_isPlainObject(j) && _ArrayIsArray(j.entries)) src = j.entries;
        if (!src) return [];
        var copy = [];
        for (var i = 0; i < src.length; i++) copy[i] = src[i];
        return copy;
      }, function () { return []; });
    }

    function journal() {
      return _safeThen(_readJournal(), function (entries) {
        var out = [];
        for (var i = 0; i < entries.length; i++) {
          var v = ENV.validateJournalEntry(entries[i]);
          if (v.ok) _safePush(out, ENV.deepFreeze(entries[i]));
        }
        return ENV.deepFreeze(out);
      });
    }

    function detect() {
      var target = envelope();
      var perStoreStatus = {};
      var promises = [];
      for (var i = 0; i < KNOWN_STORES.length; i++) {
        (function (storeKey) {
          var mg = registry[storeKey];
          _safePush(promises, _safeThen(backend.list(storeKey), function (rows) {
            rows = _ArrayIsArray(rows) ? rows : [];
            var counts = { records: rows.length, atTarget: 0, belowTarget: 0, futureVersion: 0, malformed: 0 };
            for (var r = 0; r < rows.length; r++) {
              // F1-R10-02: capture row.value once via try/catch, then sanitize-clone before
              // any property read. Hostile accessor on row.value fires at most once per row.
              var captured = _captureRow(rows[r]);
              if (!captured) { counts.malformed += 1; continue; }
              var rec = captured.value;
              if (!_isPlainObject(rec)) { counts.malformed += 1; continue; }
              // F1-R20-01: descriptor-only preflight before structuredClone in detect() too.
              // structuredClone honors enumerable accessor descriptors and would invoke a hostile
              // getter; detect() is a preview path and must be side-effect free.
              if (!_isAccessorFreeDescriptorTree(rec)) { counts.malformed += 1; continue; }
              var snap;
              try { snap = _StructuredClone(rec); } catch (_) { counts.malformed += 1; continue; }
              var v = snap.schemaVersion;
              if (typeof v !== 'number' || !_isFinite(v) || v < 0 || _MathFloor(v) !== v) { counts.malformed += 1; continue; }
              if (v > mg.targetVersion) counts.futureVersion += 1;
              else if (v < mg.targetVersion) counts.belowTarget += 1;
              else counts.atTarget += 1;
            }
            perStoreStatus[storeKey] = counts;
          }, function () {
            perStoreStatus[storeKey] = { records: 0, atTarget: 0, belowTarget: 0, futureVersion: 0, malformed: 0, listFailed: true };
          }));
        })(KNOWN_STORES[i]);
      }
      return _safeThen(_PromiseAll(promises), function () {
        return _safeThen(_readState(), function (st) {
          var currentEnvelope = st && _isPlainObject(st.envelope) ? st.envelope : null;
          var envMismatch = false;
          if (currentEnvelope) {
            var ev = ENV.validateEnvelope(currentEnvelope);
            envMismatch = !ev.ok;
          }
          return ENV.deepFreeze({
            ok: true,
            currentEnvelope: currentEnvelope ? ENV.deepFreeze(currentEnvelope) : null,
            targetEnvelope: target,
            envelopeMismatch: envMismatch,
            knownStores: KNOWN_STORES.slice(),
            perStoreStatus: perStoreStatus
          });
        });
      });
    }

    function plan() {
      return _safeThen(detect(), function (det) {
        var steps = [], blockers = [], perStoreSummary = {};
        for (var i = 0; i < KNOWN_STORES.length; i++) {
          var sk = KNOWN_STORES[i];
          var st = det.perStoreStatus[sk] || {};
          perStoreSummary[sk] = {
            records: st.records || 0,
            wouldMigrate: st.belowTarget || 0,
            wouldNoop: st.atTarget || 0,
            wouldReject: (st.futureVersion || 0) + (st.malformed || 0),
            listFailed: !!st.listFailed
          };
          if (st.belowTarget > 0) _safePush(steps, { store: sk, action: 'migrate', count: st.belowTarget });
          if (st.atTarget > 0) _safePush(steps, { store: sk, action: 'no-op', count: st.atTarget });
          if (st.futureVersion > 0) _safePush(blockers, { store: sk, reasonCode: 'UNSUPPORTED_FUTURE_VERSION', count: st.futureVersion });
          if (st.malformed > 0) _safePush(blockers, { store: sk, reasonCode: 'RECORD_BAD_VERSION', count: st.malformed });
          if (st.listFailed) _safePush(blockers, { store: sk, reasonCode: 'BACKEND_REJECTED', count: 0 });
        }
        return ENV.deepFreeze({
          ok: true,
          generatedAt: _now(clock, stamp),
          steps: steps,
          blockers: blockers,
          perStoreSummary: perStoreSummary,
          targetEnvelope: det.targetEnvelope,
          currentEnvelope: det.currentEnvelope
        });
      });
    }

    // Pre-compute per-store work outside any transact. Returns { storeKey, counts, writes, entries }.
    function _computeStoreWork(storeKey, now) {
      var mg = registry[storeKey];
      return _safeThen(backend.list(storeKey), function (rows) {
        rows = _ArrayIsArray(rows) ? rows : [];
        var writes = [];
        var entries = [];
        var counts = { records: rows.length, migrated: 0, noop: 0, rejected: 0, failed: 0 };
        for (var i = 0; i < rows.length; i++) {
          // F1-R10-02: capture row.key + row.value ONCE per intake. Hostile accessor on either
          // can only fire a single time, and any access throw → unkeyed-row fail-closed branch.
          var captured = _captureRow(rows[i]);
          if (!captured || typeof captured.key !== 'string' || captured.key.length === 0) {
            _safePush(entries, _journalEntry(now, storeKey, '<unkeyed>', -1, mg.targetVersion, 'failed', [], '', 'BACKEND_REJECTED', ['unkeyed_row']));
            counts.failed += 1;
            continue;
          }
          var key = captured.key;
          var capturedValue = captured.value;
          var san = _sanitize(capturedValue, MAX_RECORD_BYTES);
          if (!san.ok) {
            _safePush(entries, _journalEntry(now, storeKey, key, -1, mg.targetVersion, 'rejected', [], '', san.reason, []));
            counts.rejected += 1;
            continue;
          }
          var fromVersion = (typeof san.value.schemaVersion === 'number' && _isFinite(san.value.schemaVersion) && san.value.schemaVersion >= 0 && _MathFloor(san.value.schemaVersion) === san.value.schemaVersion) ? san.value.schemaVersion : -1;
          if (fromVersion < 0) {
            _safePush(entries, _journalEntry(now, storeKey, key, -1, mg.targetVersion, 'rejected', [], '', 'RECORD_BAD_VERSION', []));
            counts.rejected += 1;
            continue;
          }
          // F1-R12-01: hard engine-level boundary — future-version records are REJECTED before
          // the migrator runs. The default per-store migrators already enforce this, but a
          // custom registry could supply a migrator that returns ok:true with a downgraded
          // schemaVersion. The engine MUST never let a hostile migrator overwrite a
          // future-version record. fromVersion > targetVersion is always UNSUPPORTED_FUTURE_VERSION,
          // regardless of what the migrator wants to do.
          if (fromVersion > mg.targetVersion) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'rejected', [], '', 'UNSUPPORTED_FUTURE_VERSION', []));
            counts.rejected += 1;
            continue;
          }
          var result;
          try { result = mg.migrate(san.value); }
          catch (e) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', [], '', 'MIGRATOR_THREW', [String(e && e.message || e).slice(0, 200)]));
            counts.failed += 1;
            continue;
          }
          if (!_isPlainObject(result) || (result.ok !== true && result.ok !== false)) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', [], '', 'MIGRATOR_THREW', ['bad_migrator_return']));
            counts.failed += 1;
            continue;
          }
          if (result.ok === false) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'rejected', _ArrayIsArray(result.migrations) ? result.migrations : [], '', result.reason, []));
            counts.rejected += 1;
            continue;
          }
          var migrated = result.record;
          if (!_isPlainObject(migrated)) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', [], '', 'POST_MIGRATION_INVALID', ['migrator_returned_non_object']));
            counts.failed += 1;
            continue;
          }
          var postSan = _sanitize(migrated, MAX_RECORD_BYTES);
          if (!postSan.ok) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', _ArrayIsArray(result.migrations) ? result.migrations : [], '', postSan.reason, []));
            counts.failed += 1;
            continue;
          }
          // F1-R1-09: producer-attestation field defense — reject migrator output that contains
          // any well-known authority-attestation field name.
          if (_containsAttestationField(postSan.value)) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'rejected', _ArrayIsArray(result.migrations) ? result.migrations : [], '', 'PRODUCER_ATTESTATION_REFUSED', ['attestation_field_in_migrated_record']));
            counts.rejected += 1;
            continue;
          }
          // F1-R13-01: post-migration schemaVersion MUST be exactly mg.targetVersion. Missing,
          // string, fractional, negative, or below-target values would let a hostile or buggy
          // migrator corrupt an at-target record (e.g. schemaVersion: -1, 1.5, "1", undefined).
          // Any deviation → POST_MIGRATION_INVALID, no write.
          var toVersion = postSan.value.schemaVersion;
          if (typeof toVersion !== 'number' || !_isFinite(toVersion) || _MathFloor(toVersion) !== toVersion) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', _ArrayIsArray(result.migrations) ? result.migrations : [], '', 'POST_MIGRATION_INVALID', ['post_migration_schema_version_invalid']));
            counts.failed += 1;
            continue;
          }
          if (toVersion > mg.targetVersion) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', _ArrayIsArray(result.migrations) ? result.migrations : [], '', 'POST_MIGRATION_INVALID', ['version_overshoot']));
            counts.failed += 1;
            continue;
          }
          if (toVersion !== mg.targetVersion) {
            _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'failed', _ArrayIsArray(result.migrations) ? result.migrations : [], '', 'POST_MIGRATION_INVALID', ['post_migration_schema_version_below_target']));
            counts.failed += 1;
            continue;
          }
          var migrationsList = _ArrayIsArray(result.migrations) ? result.migrations : [];
          if (migrationsList.length === 0 && fromVersion === mg.targetVersion) {
            // F1-R1-04: pure no-op records do NOT receive a journal entry. The count is preserved
            // in counts.noop and surfaces in state.lastRunPerStore.
            counts.noop += 1;
            continue;
          }
          // F1-R19-01: hash from trap-free serializer (already validated via _isJsonSafe upstream)
          var hash = _hash(_safeJsonStringify(postSan.value));
          // F1-R2-01 / F1-R10-02: source hash uses the ALREADY-CAPTURED value (no second
          // accessor fire on row.value), routed through _sanitizedHash which structured-clones
          // before serialization. Same canonical form on both sides of the TOCTOU window.
          var sourceHash = _sanitizedHash(capturedValue);
          _safePush(writes, { store: storeKey, key: key, value: postSan.value, sourceHash: sourceHash });
          counts.migrated += 1;
          _safePush(entries, _journalEntry(now, storeKey, key, fromVersion, mg.targetVersion, 'migrated', migrationsList, hash, '', []));
        }
        return { storeKey: storeKey, counts: counts, writes: writes, entries: entries };
      }, function (err) {
        return {
          storeKey: storeKey,
          counts: { records: 0, migrated: 0, noop: 0, rejected: 0, failed: 1 },
          writes: [],
          entries: [_journalEntry(now, storeKey, '<list>', -1, mg.targetVersion, 'failed', [], '', 'BACKEND_REJECTED', [String(err && err.message || err).slice(0, 200)])]
        };
      });
    }

    function _migrateImpl(opts) {
      opts = opts || {};
      if (opts.confirm !== true) {
        return _PromiseResolve(ENV.deepFreeze({
          ok: false,
          reasonCode: 'CONFIRM_REQUIRED',
          report: ENV.deepFreeze({ status: 'halted', startedAt: _now(clock, stamp), perStore: {}, journalAppended: 0 })
        }));
      }
      var startedAt = _now(clock, stamp);
      return _safeThen(_readState(), function (st) {
        // F1-R1-06: validate the persisted envelope structurally (not just engineVersion number)
        if (st && _isPlainObject(st.envelope)) {
          var ev = ENV.validateEnvelope(st.envelope);
          if (!ev.ok) {
            return ENV.deepFreeze({
              ok: false,
              reasonCode: 'ENVELOPE_VERSION_MISMATCH',
              report: ENV.deepFreeze({ status: 'halted', startedAt: startedAt, perStore: {}, journalAppended: 0, envelopeViolations: ev.violations.slice(0, 16) })
            });
          }
          if (typeof st.envelope.engineVersion === 'number' && st.envelope.engineVersion > ENV.ENGINE_VERSION) {
            return ENV.deepFreeze({
              ok: false,
              reasonCode: 'ENVELOPE_VERSION_MISMATCH',
              report: ENV.deepFreeze({ status: 'halted', startedAt: startedAt, perStore: {}, journalAppended: 0 })
            });
          }
        }
        // F1-R1-07: prior lifetimeJournalDropped must be a non-negative safe integer.
        var priorDropped = 0;
        if (st && _isPlainObject(st)) {
          if (st.lifetimeJournalDropped !== undefined) {
            if (!_NumberIsSafeInteger(st.lifetimeJournalDropped) || st.lifetimeJournalDropped < 0) {
              return ENV.deepFreeze({
                ok: false,
                reasonCode: 'ENVELOPE_VERSION_MISMATCH',
                report: ENV.deepFreeze({ status: 'halted', startedAt: startedAt, perStore: {}, journalAppended: 0, stateViolation: 'lifetimeJournalDropped_invalid' })
              });
            }
            priorDropped = st.lifetimeJournalDropped;
          }
        }
        // F1-R1-05: preflight journal capacity. Sum records across stores; if total > overflow
        // threshold, HALT before any mutation.
        var listP = [];
        for (var i = 0; i < KNOWN_STORES.length; i++) {
          (function (sk) {
            _safePush(listP, _safeThen(backend.list(sk), function (rows) { return _ArrayIsArray(rows) ? rows.length : 0; }, function () { return 0; }));
          })(KNOWN_STORES[i]);
        }
        return _safeThen(_PromiseAll(listP), function (counts) {
          var totalRecords = 0;
          for (var j = 0; j < counts.length; j++) totalRecords += counts[j];
          if (totalRecords > MAX_JOURNAL * JOURNAL_OVERFLOW_FACTOR) {
            return ENV.deepFreeze({
              ok: false,
              reasonCode: 'JOURNAL_OVERFLOW',
              report: ENV.deepFreeze({ status: 'halted', startedAt: startedAt, perStore: {}, journalAppended: 0, totalRecordsObserved: totalRecords, journalCapacity: MAX_JOURNAL * JOURNAL_OVERFLOW_FACTOR })
            });
          }
          // Run per-store compute (no writes yet). Sequentially to keep journal ordering deterministic.
          var perStoreResults = [];
          var p = _PromiseResolve();
          for (var k = 0; k < KNOWN_STORES.length; k++) {
            (function (sk) {
              p = _safeThen(p, function () {
                return _safeThen(_computeStoreWork(sk, _now(clock, stamp)), function (res) { _safePush(perStoreResults, res); });
              });
            })(KNOWN_STORES[k]);
          }
          return _safeThen(p, function () { return _commit(perStoreResults, startedAt, priorDropped, st); });
        });
      });
    }

    function _commit(perStoreResults, startedAt, priorDropped, priorState) {
      var allEntries = [];
      var allWrites = [];
      var perStoreOut = {};
      var storesUsedForWrites = {};
      var anyMigrated = false, anyRejected = false, anyFailed = false;
      for (var i = 0; i < perStoreResults.length; i++) {
        var r = perStoreResults[i];
        perStoreOut[r.storeKey] = r.counts;
        for (var j = 0; j < r.entries.length; j++) _safePush(allEntries, r.entries[j]);
        for (var w = 0; w < r.writes.length; w++) { _safePush(allWrites, r.writes[w]); storesUsedForWrites[r.writes[w].store] = true; }
        if (r.counts.migrated > 0) anyMigrated = true;
        if (r.counts.rejected > 0) anyRejected = true;
        if (r.counts.failed > 0) anyFailed = true;
      }
      var status;
      if (anyFailed) status = 'halted';
      else if (anyMigrated && anyRejected) status = 'partial';
      else if (anyMigrated) status = 'complete';
      else if (anyRejected) status = 'partial';
      else status = 'no-op';
      var completedAt = _now(clock, stamp);

      // F1-R1-04: idempotency — pure no-op runs (no migrations, no rejections, no failures) do
      // NOT touch META. The state.lastRunPerStore counters still live in the previous state.json
      // mirror; downstream auditors can re-derive presence-only counts from backend.list() instead.
      if (status === 'no-op' && allWrites.length === 0 && allEntries.length === 0) {
        return ENV.deepFreeze({
          ok: true,
          report: ENV.deepFreeze({
            startedAt: startedAt,
            completedAt: completedAt,
            status: 'no-op',
            perStore: perStoreOut,
            journalAppended: 0,
            envelope: envelope(),
            idempotentSkipped: true
          })
        });
      }

      // Read prior journal, append new entries, compact, build state.
      return _safeThen(_readJournal(), function (priorJournal) {
        // F1-R17-01: build compactedJournal with plain index loops instead of
        // priorJournal.concat / .slice. Ambient Array.prototype.concat or .slice poisoning
        // could otherwise return only priorJournal (or []) while META state still claims
        // "journalAppended:N" — orphaning migrated data without an audit row.
        var combined = [];
        for (var pj = 0; pj < priorJournal.length; pj++) combined[pj] = priorJournal[pj];
        for (var ne = 0; ne < allEntries.length; ne++) combined[combined.length] = allEntries[ne];
        if (combined.length !== priorJournal.length + allEntries.length) {
          // Sanity gate: ambient tampering caused a length discrepancy. Abort the entire commit.
          throw new Error('COMMIT_JOURNAL_PROJECTION_CORRUPTED');
        }
        var compactedJournal;
        var totalDropped = 0;
        if (combined.length > MAX_JOURNAL) {
          totalDropped = combined.length - MAX_JOURNAL;
          compactedJournal = [];
          // Keep the NEWEST MAX_JOURNAL entries.
          var startIdx = combined.length - MAX_JOURNAL;
          for (var ci = 0; ci < MAX_JOURNAL; ci++) compactedJournal[ci] = combined[startIdx + ci];
        } else {
          compactedJournal = combined;
        }
        if (compactedJournal.length > MAX_JOURNAL) {
          throw new Error('COMMIT_JOURNAL_COMPACTION_CORRUPTED');
        }
        var stateNext = {
          schemaVersion: 1,
          envelope: envelope(),
          lastRunStartedAt: startedAt,
          lastRunCompletedAt: completedAt,
          lastRunStatus: status,
          lastRunPerStore: perStoreOut,
          lastRunJournalAppended: allEntries.length,
          lifetimeJournalDropped: priorDropped + totalDropped
        };

        // F1-R1-03: ALL writes (data store writes + META journal + META state) commit in ONE
        // atomic backend.transact() across all stores used + META. Either everything lands or
        // nothing does. No half-applied migration without an audit row; no audit row without data.
        //
        // F1-R2-01: declare reads for every key we plan to write PLUS META journal + state. Inside
        // compute(), re-hash each data read and compare against the snapshot sourceHash captured
        // at list time. Re-hash priorJournal + priorState too; if either changed, abort. Backend
        // semantics: transact serializes via its own tx mutex; the read values handed to compute()
        // are the CURRENT contents of the requested keys inside the same atomic boundary as the
        // writes — so a concurrent writer that committed between list() and transact() will be
        // visible here as a hash mismatch.
        var storesList = _ObjectKeys(storesUsedForWrites);
        _safePush(storesList, META);
        // Compute prior-journal/state preimage hashes (the snapshot we already loaded above).
        var priorJournalHash = _sanitizedHash(priorJournal);
        var priorStateHash   = _sanitizedHash(priorState || null);
        // Build reads spec
        var readsSpec = [];
        for (var rw = 0; rw < allWrites.length; rw++) {
          _safePush(readsSpec, { store: allWrites[rw].store, key: allWrites[rw].key });
        }
        _safePush(readsSpec, { store: META, key: JOURNAL_KEY });
        _safePush(readsSpec, { store: META, key: STATE_KEY });

        return _safeThen(backend.transact({
          stores: storesList,
          reads: readsSpec,
          compute: function (readValues) {
            // TOCTOU verification: each data read must match its sourceHash.
            for (var i = 0; i < allWrites.length; i++) {
              var observedHash = _sanitizedHash(readValues[i] === undefined ? null : readValues[i]);
              if (observedHash !== allWrites[i].sourceHash) {
                // Abort: concurrent writer changed value between list and commit.
                throw new Error('CONCURRENT_WRITE_DETECTED:' + allWrites[i].store + ':' + allWrites[i].key);
              }
            }
            // priorJournal verification
            var observedPriorJournal = readValues[allWrites.length];
            var observedPriorJournalNormalized = _ArrayIsArray(observedPriorJournal)
              ? observedPriorJournal
              : (_isPlainObject(observedPriorJournal) && _ArrayIsArray(observedPriorJournal.entries) ? observedPriorJournal.entries : []);
            if (_sanitizedHash(observedPriorJournalNormalized) !== priorJournalHash) {
              throw new Error('CONCURRENT_JOURNAL_WRITE_DETECTED');
            }
            // priorState verification (compare against the state object we loaded; null if absent)
            var observedPriorState = readValues[allWrites.length + 1];
            var observedPriorStateForHash = _isPlainObject(observedPriorState) ? observedPriorState : null;
            if (_sanitizedHash(observedPriorStateForHash) !== priorStateHash) {
              throw new Error('CONCURRENT_STATE_WRITE_DETECTED');
            }
            // F1-R16-01: build allWritesCombined with a plain index loop instead of
            // Array.prototype.map/concat. Ambient Array.prototype.map poisoning could otherwise
            // return [] for data writes while META journal/state still commits, falsely claiming
            // "complete" without persisting the migrated records. Strip sourceHash from data
            // writes here — that field is engine-internal, must NOT be persisted.
            var sanitizedDataWrites = [];
            for (var sdwI = 0; sdwI < allWrites.length; sdwI++) {
              var w = allWrites[sdwI];
              sanitizedDataWrites[sdwI] = { store: w.store, key: w.key, value: w.value };
            }
            var allWritesCombined = [];
            for (var awcI = 0; awcI < sanitizedDataWrites.length; awcI++) {
              allWritesCombined[awcI] = sanitizedDataWrites[awcI];
            }
            allWritesCombined[allWritesCombined.length] = { store: META, key: JOURNAL_KEY, value: compactedJournal };
            allWritesCombined[allWritesCombined.length] = { store: META, key: STATE_KEY,   value: stateNext };
            // Cross-check: dataWrites count must equal allWrites.length and the actual combined
            // length must equal allWrites.length + 2. If ambient Array tampering somehow corrupted
            // either count, the backend transact return-shape validation downstream will catch it.
            if (sanitizedDataWrites.length !== allWrites.length || allWritesCombined.length !== allWrites.length + 2) {
              throw new Error('COMMIT_WRITE_PROJECTION_CORRUPTED');
            }
            return {
              writes: allWritesCombined,
              result: { journalLen: compactedJournal.length, dropped: totalDropped, dataWrites: sanitizedDataWrites.length }
            };
          }
        }), function (r) {
          // F1-R1-10: validate return shape strictly.
          if (!_isPlainObject(r) || !_NumberIsSafeInteger(r.journalLen) || r.journalLen < 0 ||
              !_NumberIsSafeInteger(r.dropped) || r.dropped < 0 || !_NumberIsSafeInteger(r.dataWrites) || r.dataWrites < 0) {
            return ENV.deepFreeze({
              ok: false,
              reasonCode: 'BACKEND_REJECTED',
              report: ENV.deepFreeze({
                startedAt: startedAt,
                completedAt: _now(clock, stamp),
                status: 'halted',
                perStore: perStoreOut,
                journalAppended: 0,
                metaWriteError: 'transact_returned_invalid_shape'
              })
            });
          }
          return ENV.deepFreeze({
            ok: status !== 'halted',
            report: ENV.deepFreeze({
              startedAt: startedAt,
              completedAt: completedAt,
              status: status,
              perStore: perStoreOut,
              journalAppended: allEntries.length,
              journalLen: r.journalLen,
              lifetimeJournalDropped: stateNext.lifetimeJournalDropped,
              envelope: envelope()
            })
          });
        }, function (err) {
          // F1-R1-03: atomic transact failed → NOTHING was written. No data, no journal, no state.
          return ENV.deepFreeze({
            ok: false,
            reasonCode: 'BACKEND_REJECTED',
            report: ENV.deepFreeze({
              startedAt: startedAt,
              completedAt: _now(clock, stamp),
              status: 'halted',
              perStore: perStoreOut,
              journalAppended: 0,
              metaWriteError: String(err && err.message || err).slice(0, 200)
            })
          });
        });
      });
    }

    // F1-R2-01 / F1-R22-01: serialize concurrent migrate() calls via the engine-level mutex
    // chain, using captured _safeThen so ambient Promise.prototype.then poisoning cannot break
    // the serialization handshake.
    function migrate(opts) {
      var run = function () { return _migrateImpl(opts); };
      var next = _safeThen(migrateChain, run, run); // even if prior errored, next still runs
      migrateChain = _safeThen(next, function () { }, function () { });
      return next;
    }

    return {
      detect:   detect,
      plan:     plan,
      migrate:  migrate,
      journal:  journal,
      envelope: envelope,
      knownStores: function () { return KNOWN_STORES.slice(); }
    };
  }

  var api = {
    createMigrationEngine: createMigrationEngine,
    envelope:              ENV.buildEnvelope,
    PER_STORE_TARGETS:     ENV.PER_STORE_TARGETS,
    REASON_CODES:          ENV.REASON_CODES,
    STATUS_VALUES:         ENV.STATUS_VALUES,
    REPORT_STATUS_VALUES:  ENV.REPORT_STATUS_VALUES,
    PRODUCER_ATTESTATION_FIELDS: _safeSort(_ObjectKeys(PRODUCER_ATTESTATION_FIELDS))
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_MigrationEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
