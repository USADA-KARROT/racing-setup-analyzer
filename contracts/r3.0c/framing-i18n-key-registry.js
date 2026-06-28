/**
 * contracts/r3.0c/framing-i18n-key-registry.js — R3.0C C7 · Framing-source contract registry.
 *
 * Per SKYLINE Continuous Delivery Master Directive §七 C7 + docs/r3.0c-framing-source-contract.md:
 * every framing entry the C7 orchestrator emits MUST be a plain object
 * { reasonCode, i18nKey, params? } where reasonCode ∈ contracts/r3.0c/reason-codes.js
 * REASON_CODES AND i18nKey ∈ the frozen registry exported here. The renderer maps i18nKey to a
 * fixed wording table in renderer/js/i18n-comparisons.js — the orchestrator never authors UI
 * prose; the viewmodel never re-words; the UI calls only t(entry.i18nKey).
 *
 * The registry is a CLOSED ALLOWLIST. Anything outside fails closed at orchestrator emit time
 * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
 *
 * Capability gate: governance/r3.0c/capabilities.json framing_source_structured_contract.enabled
 * must be true for any orchestrator code path that emits framing entries. Until then this module
 * is loaded (so tests can pin the registry) but no production caller invokes the emitter.
 *
 * UMD: Node require / Electron renderer global (R3_0C_FramingI18nKeyRegistry).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
  if (!RC || !CE) throw new Error('framing-i18n-key-registry.js requires reason-codes.js + comparison-eligibility-contract.js');
  var CODES = RC.REASON_CODES;

  // The closed allowlist of framing i18nKeys. Every entry the orchestrator emits MUST use one of
  // these keys. The keys are stable string constants — renderer maps them to en/zh/ja wording.
  // Keys are organised by framing field (observed_delta / likely_driver_behaviour_difference /
  // possible_vehicle_response_difference / cannot_distinguish_reasons). A new framing entry
  // requires adding both the key here AND the en/zh/ja wording in renderer/js/i18n-comparisons.js
  // (the i18n-parity test fails closed on either gap).
  var FRAMING_I18N_KEY_REGISTRY = Object.freeze([
    // observed_delta (the comparison produced a finite cumulative or per-corner delta)
    'r3_0c.framing.observed_delta.cumulative',
    'r3_0c.framing.observed_delta.per_corner',
    'r3_0c.framing.observed_delta.faster_overall',
    'r3_0c.framing.observed_delta.slower_overall',
    'r3_0c.framing.observed_delta.identical_lap',

    // likely_driver_behaviour_difference (positionally aligned with confirmed driver input channel)
    'r3_0c.framing.likely_driver_behaviour_difference.brake_onset',
    'r3_0c.framing.likely_driver_behaviour_difference.throttle_application',
    'r3_0c.framing.likely_driver_behaviour_difference.steering_correction',
    'r3_0c.framing.likely_driver_behaviour_difference.none_detected',

    // possible_vehicle_response_difference (positionally aligned with vehicle-response channel,
    // NOT explainable by aligned driver input)
    'r3_0c.framing.possible_vehicle_response_difference.lat_accel',
    'r3_0c.framing.possible_vehicle_response_difference.yaw_rate',
    'r3_0c.framing.possible_vehicle_response_difference.exit_speed',
    'r3_0c.framing.possible_vehicle_response_difference.none_detected',

    // cannot_distinguish_reasons (always emitted even when empty — array of entries)
    'r3_0c.framing.cannot_distinguish',
    'r3_0c.framing.cannot_distinguish.insufficient_channel_coverage',
    'r3_0c.framing.cannot_distinguish.confounded_by_driver_input',
    'r3_0c.framing.cannot_distinguish.confounded_by_calibration_drift',
    'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised',

    // nextValidationAction (single entry per result; viewmodel renders as a single CTA)
    'r3_0c.framing.next_validation.confirm_channel_mapping',
    'r3_0c.framing.next_validation.confirm_track_identity',
    'r3_0c.framing.next_validation.select_different_reference',
    'r3_0c.framing.next_validation.repeat_lap_under_controlled_conditions',
  ]);

  // Bound a structurally valid framing-entry per FRAMING_KEY_SHAPE (already exposed on the
  // comparison-eligibility contract) AND the i18nKey appears in the registry above.
  // Adversarial: per-string UTF-8 byte cap of 256 on every param value (mirrors the F12 contract).
  var MAX_PARAM_STRING_BYTES = 256;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _safeOwnKeys(o) { try { return Reflect && typeof Reflect.ownKeys === 'function' ? Reflect.ownKeys(o) : Object.keys(o); } catch (e) { return null; } }

  // Codex C7-R2-C-01 closure: tri-state own-property read. Distinguishes ABSENT (no own key) from
  // VALUE (own data descriptor) from THREW (Proxy/accessor/descriptor lookup throws OR descriptor
  // is an accessor descriptor — accessors violate the plain-object framing contract regardless of
  // whether they happen to throw on this particular read). Callers MUST treat THREW as
  // fail-closed; the previous _safeGet swallowed throws into `undefined` which was laundered as
  // "optional field absent" further down.
  var READ_ABSENT = Object.freeze({ state: 'ABSENT' });
  var READ_THREW = Object.freeze({ state: 'THREW' });
  function _readOwn(o, k) {
    var desc;
    try { desc = Object.getOwnPropertyDescriptor(o, k); }
    catch (e) { return READ_THREW; }
    if (!desc) return READ_ABSENT;
    // accessor descriptor (get/set) — reject. Even a getter that returns a benign value can have
    // side effects, can throw on any future read, can return different values on each call. The
    // framing contract requires plain data; accessors are out of band.
    if (typeof desc.get === 'function' || typeof desc.set === 'function') return READ_THREW;
    // data descriptor — value already resolved, no observable side-effect read needed.
    return { state: 'VALUE', value: desc.value };
  }
  function _utf8ByteLength(s) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }

  /**
   * isRegisteredFramingI18nKey(key) — closed allowlist check. Anything outside fails.
   */
  function isRegisteredFramingI18nKey(key) {
    return typeof key === 'string' && FRAMING_I18N_KEY_REGISTRY.indexOf(key) !== -1;
  }

  /**
   * validateFramingEntry(entry) — structural + registry gate.
   *   • entry must be a plain object owning ONLY {reasonCode, i18nKey, params?} keys
   *   • reasonCode ∈ REASON_CODES
   *   • i18nKey ∈ FRAMING_I18N_KEY_REGISTRY
   *   • params, when present, plain object whose values are finite numbers / booleans / null /
   *     strings ≤ MAX_PARAM_STRING_BYTES. No arrays / exotic objects / functions / symbols.
   *
   * Returns { valid:true } or { valid:false, reasonCode, detail }.
   */
  function validateFramingEntry(entry) {
    try {
      if (!_isPlain(entry)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry not a plain object' };
      // Codex C7 finding C7-F1 closure: use Reflect.ownKeys so non-enumerable + Symbol-keyed extras
      // are detected. Object.keys missed both.
      var keys = _safeOwnKeys(entry);
      if (keys === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry own-key enumeration threw (Proxy)' };
      var ALLOWED = { reasonCode: true, i18nKey: true, params: true };
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (typeof key !== 'string') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has non-string (e.g. Symbol) own-key' };
        if (!ALLOWED[key]) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has unknown key: ' + String(key).slice(0, 60) };
      }
      // Codex C7-R2-C-01 closure: tri-state read on every own property. THREW = accessor descriptor
      // OR descriptor lookup throws — both fail-closed. The previous _safeGet swallowed throws and
      // returned undefined, which the params branch below treated as "optional field absent" — an
      // input with `Object.defineProperty(entry, 'params', { get(){throw} })` slipped through.
      var rcRead = _readOwn(entry, 'reasonCode');
      if (rcRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: rcRead.state === 'THREW' ? 'framing reasonCode is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing reasonCode missing' };
      if (!RC.isReasonCode(rcRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing reasonCode unregistered' };
      var keyRead = _readOwn(entry, 'i18nKey');
      if (keyRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: keyRead.state === 'THREW' ? 'framing i18nKey is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing i18nKey missing' };
      if (!isRegisteredFramingI18nKey(keyRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing i18nKey not in registry' };
      var paramsRead = _readOwn(entry, 'params');
      if (paramsRead.state === 'THREW') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params is accessor descriptor or descriptor lookup threw — fail-closed' };
      if (paramsRead.state === 'VALUE' && paramsRead.value !== undefined) {
        var paramsRaw = paramsRead.value;
        if (!_isPlain(paramsRaw)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params not a plain object' };
        var pks = _safeOwnKeys(paramsRaw);
        if (pks === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params own-key enumeration threw (Proxy)' };
        for (var j = 0; j < pks.length; j++) {
          var k = pks[j];
          if (typeof k !== 'string' || k.length === 0) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has empty / non-string (e.g. Symbol) key' };
          // Inner-level tri-state read so a param-value accessor / Proxy is also rejected, not
          // laundered via plain o[k] access.
          var inner = _readOwn(paramsRaw, k);
          if (inner.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: inner.state === 'THREW' ? 'framing params value is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing params value missing for own key' };
          var v = inner.value;
          if (v === null || typeof v === 'boolean') continue;
          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; continue; }
          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; continue; }
          return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has unsupported value type' };
        }
      }
      return { valid: true };
    } catch (e) {
      // Codex C7 finding C7-B1 closure: any throw from a Proxy / accessor / inherited trap
      // results in fail-closed at this top-level boundary.
      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing validation threw — fail-closed' };
    }
  }

  /**
   * cannotDistinguishFallback() — the canonical fallback framing entry the orchestrator emits
   * when a field cannot be populated. Matches docs/r3.0c-framing-source-contract.md rule
   * (params OMITTED — not null — to satisfy FRAMING_KEY_SHAPE optional-key discipline).
   */
  function cannotDistinguishFallback() {
    return Object.freeze({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
  }

  var api = {
    FRAMING_I18N_KEY_REGISTRY: FRAMING_I18N_KEY_REGISTRY,
    MAX_PARAM_STRING_BYTES: MAX_PARAM_STRING_BYTES,
    isRegisteredFramingI18nKey: isRegisteredFramingI18nKey,
    validateFramingEntry: validateFramingEntry,
    cannotDistinguishFallback: cannotDistinguishFallback,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_FramingI18nKeyRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
