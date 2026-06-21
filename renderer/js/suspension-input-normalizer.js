/**
 * suspension-input-normalizer.js — R2.2 §5: Legacy + explicit per-axle suspension normalization (PURE).
 *
 * Turns a suspension input (legacy whole-car OR explicit per-axle) into normalized per-axle WHEEL
 * rates (N/mm, already motion-ratio folded), faithfully reproducing the physics core's single
 * spring→wheel rule (dynamics-model.js L180-186): wheelRate = springRate × MR_software² where
 * MR_software = spring_travel / wheel_travel. It is a NUMERICAL compatibility layer + a self-describing
 * provenance trail — NOT a canonical-evidence upgrade.
 *
 * RED LINES (must not break):
 *  • Pure arithmetic + a minimal local validator. Imports NOTHING (no dynamics-model, no car-presets,
 *    no canonical modules). Never mutates the caller input. Deterministic. Output never aliases input.
 *  • TRUST BOUNDARY: normalization success ≠ canonical evidence verification. provenance.canonicalTrustUpgraded
 *    is a hard literal `false` that NO caller field can flip (an injected canonicalTrustUpgraded/modelUsable
 *    is an unknown field → rejected). Legacy input never becomes measured/documented/verified/modelUsable.
 *  • RATIO DIRECTION: only software MR (numerator=spring_travel, denominator=wheel_travel) is supported.
 *    A reverse (manual wheel/spring) ratio is REJECTED, never silently reciprocated.
 *  • Fail-closed: any contract violation → {valid:false} + structured errors[]; both normalized rates null;
 *    never throws. Exotic/unreadable input (NaN/Infinity/function/BigInt/Symbol/Map/Set/Date/cyclic/getter
 *    that throws) → EXOTIC_OR_UNREADABLE_INPUT (a documented limitation: transparent proxies are not detected).
 *
 * UMD: Node require / Electron renderer global (SuspensionInputNormalizer). No deps, no DOM.
 */
(function (root) {
  'use strict';

  // ── fixed error vocabulary (frozen enum; tests assert codes exactly, never free text) ──────────
  var ERROR_CODE = Object.freeze({
    INVALID_INPUT_TYPE: 'INVALID_INPUT_TYPE',
    UNKNOWN_TOP_LEVEL_FIELD: 'UNKNOWN_TOP_LEVEL_FIELD',
    MISSING_FRONT_AXLE: 'MISSING_FRONT_AXLE',
    MISSING_REAR_AXLE: 'MISSING_REAR_AXLE',
    MISSING_RATE: 'MISSING_RATE',
    NON_FINITE_RATE: 'NON_FINITE_RATE',
    NON_POSITIVE_RATE: 'NON_POSITIVE_RATE',
    UNKNOWN_BASIS: 'UNKNOWN_BASIS',
    MISSING_MOTION_RATIO: 'MISSING_MOTION_RATIO',
    NON_FINITE_MOTION_RATIO: 'NON_FINITE_MOTION_RATIO',
    NON_POSITIVE_MOTION_RATIO: 'NON_POSITIVE_MOTION_RATIO',
    MISSING_RATIO_DEFINITION: 'MISSING_RATIO_DEFINITION',
    INVALID_RATIO_DEFINITION: 'INVALID_RATIO_DEFINITION',
    UNSUPPORTED_RATIO_DIRECTION: 'UNSUPPORTED_RATIO_DIRECTION',
    LEGACY_FLAG_INVALID_TYPE: 'LEGACY_FLAG_INVALID_TYPE',
    EXOTIC_OR_UNREADABLE_INPUT: 'EXOTIC_OR_UNREADABLE_INPUT',
  });

  // travel-term vocabulary (hardcoded to stay dependency-free; matches canonical-parameters TRAVEL_TERM values)
  var TERM = Object.freeze({ SPRING: 'spring_travel', WHEEL: 'wheel_travel' });
  // explicit canonical basis enum (matches canonical-parameters SOURCE_BASIS values for these three)
  var BASIS = Object.freeze({ SPRING_ELEMENT: 'spring_element', WHEEL: 'wheel', GROUND: 'ground' });

  var LEGACY_KEYS = ['front_spring_rate', 'rear_spring_rate', 'front_motion_ratio', 'rear_motion_ratio', 'use_wheel_rate'];
  var EXPLICIT_TOP_KEYS = ['front', 'rear'];
  var EXPLICIT_AXLE_KEYS = ['rate', 'basis', 'motionRatio', 'ratioDefinition'];
  var RATIO_DEF_KEYS = ['numerator', 'denominator', 'source'];

  function _isPlainObject(v) {
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
    var proto = Object.getPrototypeOf(v);
    return proto === Object.prototype || proto === null;
  }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }

  // minimal JSON-safety check (descriptor-based; never executes a getter; cyclic/exotic → false).
  function _isJsonSafe(v, depth) {
    try {
      depth = depth || 0;
      if (depth > 24) return false;                          // cyclic / too deep → fail closed
      if (v == null) return true;
      var t = typeof v;
      if (t === 'number') return isFinite(v);                // NaN / ±Infinity rejected
      if (t === 'string' || t === 'boolean') return true;
      if (t !== 'object') return false;                      // function / symbol / bigint
      if (Array.isArray(v)) {
        var ak = Reflect.ownKeys(v);
        for (var ai = 0; ai < ak.length; ai++) {
          var akk = ak[ai];
          if (akk === 'length') continue;
          if (typeof akk === 'symbol') return false;
          var ad = Object.getOwnPropertyDescriptor(v, akk);
          if (!ad || !ad.enumerable || typeof ad.get === 'function' || typeof ad.set === 'function') return false;
          if (!_isJsonSafe(ad.value, depth + 1)) return false;
        }
        return true;
      }
      var proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null) return false; // Map/Set/Date/TypedArray/RegExp/host/Proxy-exotic
      var keys = Reflect.ownKeys(v);
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        if (typeof k === 'symbol') return false;
        var desc = Object.getOwnPropertyDescriptor(v, k);
        if (!desc || !desc.enumerable) return false;
        if (typeof desc.get === 'function' || typeof desc.set === 'function') return false; // never run getter
        if (!_isJsonSafe(desc.value, depth + 1)) return false;
      }
      return true;
    } catch (e) { return false; } // a getter / Proxy trap threw → fail closed
  }

  function _err(code, scope, axle, field) {
    return { code: code, scope: scope, axle: axle != null ? axle : null, field: field != null ? field : null, fatal: true };
  }
  function _result(valid, errors, frontWr, rearWr, semantics, source) {
    return {
      valid: valid,
      errors: errors,
      normalized: { frontWheelRateNmm: valid ? frontWr : null, rearWheelRateNmm: valid ? rearWr : null },
      semantics: semantics,
      provenance: { source: source, canonicalTrustUpgraded: false }, // HARD literal — never caller-controlled
    };
  }
  function _emptySemantics(compatibilityMode) {
    return { frontBasis: null, rearBasis: null, frontRatioDefinition: null, rearRatioDefinition: null, compatibilityMode: compatibilityMode };
  }

  // ── legacy whole-car normalization ──────────────────────────────────────────────────────────────
  function normalizeLegacySuspensionInput(input) {
    try { return _normalizeLegacyInner(input); }
    catch (e) { return _result(false, [_err(ERROR_CODE.EXOTIC_OR_UNREADABLE_INPUT, 'input', null, null)], null, null, _emptySemantics(true), 'legacy_input'); }
  }
  function _normalizeLegacyInner(input) {
    if (!_isPlainObject(input) || !_isJsonSafe(input)) {
      var code = _isPlainObject(input) ? ERROR_CODE.EXOTIC_OR_UNREADABLE_INPUT : ERROR_CODE.INVALID_INPUT_TYPE;
      return _result(false, [_err(code, 'input', null, null)], null, null, _emptySemantics(true), 'legacy_input');
    }
    var errors = [];
    // closed schema: any key outside the legacy whitelist (incl. injected canonicalTrustUpgraded/modelUsable) is rejected
    Object.keys(input).forEach(function (k) {
      if (LEGACY_KEYS.indexOf(k) === -1) errors.push(_err(ERROR_CODE.UNKNOWN_TOP_LEVEL_FIELD, 'input', null, k));
    });

    // use_wheel_rate flag: true=identity, false/undefined=spring×MR², other type=fatal
    var flag = input.use_wheel_rate;
    var identityMode = false, flagOk = true;
    if (flag === true) identityMode = true;
    else if (flag === false || flag === undefined || !('use_wheel_rate' in input)) identityMode = false;
    else { errors.push(_err(ERROR_CODE.LEGACY_FLAG_INVALID_TYPE, 'input', null, 'use_wheel_rate')); flagOk = false; }

    var fRate = _checkLegacyRate(input.front_spring_rate, 'front', errors);
    var rRate = _checkLegacyRate(input.rear_spring_rate, 'rear', errors);
    // motion ratio: required (>0) on the spring-element path; on the identity path it may be absent,
    // but if present it must still be finite>0 (a malformed ratio is never silently accepted).
    var fMr = _checkLegacyRatio(input.front_motion_ratio, 'front', !identityMode, errors);
    var rMr = _checkLegacyRatio(input.rear_motion_ratio, 'rear', !identityMode, errors);

    if (errors.length) {
      var compat = true;
      return _result(false, errors, null, null, _emptySemantics(compat), 'legacy_input');
    }
    // all valid → compute
    var frontWr, rearWr, semantics;
    if (identityMode) {
      frontWr = fRate; rearWr = rRate;
      semantics = { frontBasis: 'legacy_wheel_rate', rearBasis: 'legacy_wheel_rate', frontRatioDefinition: null, rearRatioDefinition: null, compatibilityMode: true };
    } else {
      // Math.pow(mr,2) — NOT mr*mr — to reproduce dynamics-model.js wheelRate() BIT-FOR-BIT (IEEE-754
      // Math.pow(x,2) ≠ x*x for some values; an off-by-1-ulp wheel rate diverges in the rounded output).
      frontWr = fRate * Math.pow(fMr, 2); rearWr = rRate * Math.pow(rMr, 2);
      var rd = { numerator: TERM.SPRING, denominator: TERM.WHEEL, source: 'legacy_implicit' };
      semantics = { frontBasis: 'legacy_spring_element', rearBasis: 'legacy_spring_element', frontRatioDefinition: { numerator: TERM.SPRING, denominator: TERM.WHEEL, source: 'legacy_implicit' }, rearRatioDefinition: { numerator: TERM.SPRING, denominator: TERM.WHEEL, source: 'legacy_implicit' }, compatibilityMode: true };
    }
    return _result(true, [], frontWr, rearWr, semantics, 'legacy_input');
  }
  function _checkLegacyRate(v, axle, errors) {
    if (v === undefined) { errors.push(_err(ERROR_CODE.MISSING_RATE, 'axle', axle, 'rate')); return null; }
    if (!_isFiniteNum(v)) { errors.push(_err(ERROR_CODE.NON_FINITE_RATE, 'axle', axle, 'rate')); return null; }
    if (v <= 0) { errors.push(_err(ERROR_CODE.NON_POSITIVE_RATE, 'axle', axle, 'rate')); return null; }
    return v;
  }
  function _checkLegacyRatio(v, axle, required, errors) {
    if (v === undefined) { if (required) errors.push(_err(ERROR_CODE.MISSING_MOTION_RATIO, 'axle', axle, 'motionRatio')); return null; }
    if (!_isFiniteNum(v)) { errors.push(_err(ERROR_CODE.NON_FINITE_MOTION_RATIO, 'axle', axle, 'motionRatio')); return null; }
    if (v <= 0) { errors.push(_err(ERROR_CODE.NON_POSITIVE_MOTION_RATIO, 'axle', axle, 'motionRatio')); return null; }
    return v;
  }

  // ── explicit per-axle normalization (mixed basis allowed) ───────────────────────────────────────
  function normalizeExplicitSuspensionInput(input) {
    try { return _normalizeExplicitInner(input); }
    catch (e) { return _result(false, [_err(ERROR_CODE.EXOTIC_OR_UNREADABLE_INPUT, 'input', null, null)], null, null, _emptySemantics(false), 'explicit_input'); }
  }
  function _normalizeExplicitInner(input) {
    if (!_isPlainObject(input) || !_isJsonSafe(input)) {
      var code = _isPlainObject(input) ? ERROR_CODE.EXOTIC_OR_UNREADABLE_INPUT : ERROR_CODE.INVALID_INPUT_TYPE;
      return _result(false, [_err(code, 'input', null, null)], null, null, _emptySemantics(false), 'explicit_input');
    }
    var errors = [];
    Object.keys(input).forEach(function (k) {
      if (EXPLICIT_TOP_KEYS.indexOf(k) === -1) errors.push(_err(ERROR_CODE.UNKNOWN_TOP_LEVEL_FIELD, 'input', null, k));
    });
    if (!('front' in input) || input.front == null) errors.push(_err(ERROR_CODE.MISSING_FRONT_AXLE, 'axle', 'front', null));
    if (!('rear' in input) || input.rear == null) errors.push(_err(ERROR_CODE.MISSING_REAR_AXLE, 'axle', 'rear', null));

    var front = _checkExplicitAxle(input.front, 'front', errors);
    var rear = _checkExplicitAxle(input.rear, 'rear', errors);

    if (errors.length) return _result(false, errors, null, null, _emptySemantics(false), 'explicit_input');
    var semantics = {
      frontBasis: front.basis, rearBasis: rear.basis,
      frontRatioDefinition: front.ratioDefinition, rearRatioDefinition: rear.ratioDefinition,
      compatibilityMode: false,
    };
    return _result(true, [], front.wheelRate, rear.wheelRate, semantics, 'explicit_input');
  }
  // returns {wheelRate, basis, ratioDefinition} on success; pushes errors + returns null fields on failure.
  // A single axle is valid ONLY if it accrued NO error of its own (closed schema: unknown subfield fails too).
  function _checkExplicitAxle(axle, which, errors) {
    var fail = { wheelRate: null, basis: null, ratioDefinition: null };
    var hadAxleError = function () { return errors.some(function (e) { return e.axle === which; }); };
    if (axle == null) return fail; // MISSING_*_AXLE already pushed by caller
    if (!_isPlainObject(axle)) { errors.push(_err(ERROR_CODE.EXOTIC_OR_UNREADABLE_INPUT, 'axle', which, null)); return fail; }
    Object.keys(axle).forEach(function (k) {
      if (EXPLICIT_AXLE_KEYS.indexOf(k) === -1) errors.push(_err(ERROR_CODE.UNKNOWN_TOP_LEVEL_FIELD, 'axle', which, k));
    });
    // rate
    var rate = null;
    if (axle.rate === undefined) errors.push(_err(ERROR_CODE.MISSING_RATE, 'axle', which, 'rate'));
    else if (!_isFiniteNum(axle.rate)) errors.push(_err(ERROR_CODE.NON_FINITE_RATE, 'axle', which, 'rate'));
    else if (axle.rate <= 0) errors.push(_err(ERROR_CODE.NON_POSITIVE_RATE, 'axle', which, 'rate'));
    else rate = axle.rate;
    // basis
    var basis = axle.basis;
    if (basis !== BASIS.SPRING_ELEMENT && basis !== BASIS.WHEEL && basis !== BASIS.GROUND) {
      errors.push(_err(ERROR_CODE.UNKNOWN_BASIS, 'axle', which, 'basis'));
      return fail;
    }
    if (basis === BASIS.SPRING_ELEMENT) {
      // motion ratio required + ratioDefinition required (software direction)
      var mr = null;
      if (axle.motionRatio === undefined) errors.push(_err(ERROR_CODE.MISSING_MOTION_RATIO, 'axle', which, 'motionRatio'));
      else if (!_isFiniteNum(axle.motionRatio)) errors.push(_err(ERROR_CODE.NON_FINITE_MOTION_RATIO, 'axle', which, 'motionRatio'));
      else if (axle.motionRatio <= 0) errors.push(_err(ERROR_CODE.NON_POSITIVE_MOTION_RATIO, 'axle', which, 'motionRatio'));
      else mr = axle.motionRatio;
      var rd = _checkRatioDefinition(axle.ratioDefinition, which, errors);
      if (hadAxleError() || rate == null || mr == null || rd == null) return fail;
      // Math.pow(mr,2) to match dynamics-model.js wheelRate() bit-for-bit (see legacy path note).
      return { wheelRate: rate * Math.pow(mr, 2), basis: BASIS.SPRING_ELEMENT, ratioDefinition: { numerator: rd.numerator, denominator: rd.denominator } };
    }
    // wheel / ground: identity; motionRatio + ratioDefinition must NOT be carried
    if (axle.motionRatio !== undefined) errors.push(_err(ERROR_CODE.INVALID_RATIO_DEFINITION, 'axle', which, 'motionRatio'));
    if (axle.ratioDefinition !== undefined && axle.ratioDefinition !== null) errors.push(_err(ERROR_CODE.INVALID_RATIO_DEFINITION, 'ratio', which, 'ratioDefinition'));
    if (hadAxleError() || rate == null) return fail;
    return { wheelRate: rate, basis: basis, ratioDefinition: null };
  }
  // validate software-direction ratio definition; returns {numerator,denominator} or null (+pushes error).
  function _checkRatioDefinition(rd, which, errors) {
    if (rd == null) { errors.push(_err(ERROR_CODE.MISSING_RATIO_DEFINITION, 'ratio', which, 'ratioDefinition')); return null; }
    if (!_isPlainObject(rd)) { errors.push(_err(ERROR_CODE.INVALID_RATIO_DEFINITION, 'ratio', which, 'ratioDefinition')); return null; }
    var unknown = Object.keys(rd).some(function (k) { return RATIO_DEF_KEYS.indexOf(k) === -1; });
    if (unknown) { errors.push(_err(ERROR_CODE.INVALID_RATIO_DEFINITION, 'ratio', which, 'ratioDefinition')); return null; }
    var num = rd.numerator, den = rd.denominator;
    if (num === undefined || den === undefined) { errors.push(_err(ERROR_CODE.MISSING_RATIO_DEFINITION, 'ratio', which, 'ratioDefinition')); return null; }
    var vocab = [TERM.SPRING, TERM.WHEEL];
    if (vocab.indexOf(num) === -1 || vocab.indexOf(den) === -1) { errors.push(_err(ERROR_CODE.INVALID_RATIO_DEFINITION, 'ratio', which, 'ratioDefinition')); return null; }
    if (num === den) { errors.push(_err(ERROR_CODE.INVALID_RATIO_DEFINITION, 'ratio', which, 'ratioDefinition')); return null; }
    // software direction = spring_travel / wheel_travel; the reverse (manual wheel/spring) is rejected, never reciprocated.
    if (num !== TERM.SPRING || den !== TERM.WHEEL) { errors.push(_err(ERROR_CODE.UNSUPPORTED_RATIO_DIRECTION, 'ratio', which, 'ratioDefinition')); return null; }
    return { numerator: TERM.SPRING, denominator: TERM.WHEEL };
  }

  var api = {
    ERROR_CODE: ERROR_CODE, TERM: TERM, BASIS: BASIS,
    LEGACY_KEYS: LEGACY_KEYS, EXPLICIT_AXLE_KEYS: EXPLICIT_AXLE_KEYS,
    normalizeLegacySuspensionInput: normalizeLegacySuspensionInput,
    normalizeExplicitSuspensionInput: normalizeExplicitSuspensionInput,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SuspensionInputNormalizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
