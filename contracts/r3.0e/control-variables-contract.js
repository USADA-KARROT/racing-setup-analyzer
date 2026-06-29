/**
 * contracts/r3.0e/control-variables-contract.js — R3.0E E1 (NON-PRODUCTION).
 *
 * Defines the structural shape of a single Control Variable descriptor. Control variables
 * are things the experiment is supposed to HOLD CONSTANT (track, tyre temperature window,
 * driver session, weather). The E3 outcome classifier checks whether each declared control
 * variable held within its allowed range; out-of-range → confounder.
 */
(function (root) {
  'use strict';
  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0E_ReasonCodes !== 'undefined' ? R3_0E_ReasonCodes : undefined);
  if (!RC) throw new Error('control-variables-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  var CONTROL_VARIABLE_KEYS = Object.freeze([
    'name',
    'description',                    // i18n key
    'expectedValue',                  // number OR string OR null
    'allowedRange',                   // { min, max } OR null
    'observedValue',                  // number OR string OR null (filled at E3)
    'withinRange',                    // boolean OR null (filled at E3)
  ]);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  function validateControlVariableShape(cIn) {
    try {
      if (!RC.isOriginalPlainObject(cIn)) return RC.buildBlockedResult([CODES.CONTROL_VARIABLES_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED]);
      if (RC.hasHiddenOwnKey(cIn)) return RC.buildBlockedResult([CODES.CONTROL_VARIABLES_INVALID, CODES.UNKNOWN_OWN_KEY]);
      var c = RC.toCleanCopy(cIn);
      if (!_isPlain(c)) return RC.buildBlockedResult([CODES.CONTROL_VARIABLES_INVALID]);
      if (!_hasOnlyAllowedKeys(c, CONTROL_VARIABLE_KEYS)) return RC.buildBlockedResult([CODES.CONTROL_VARIABLES_INVALID, CODES.UNKNOWN_OWN_KEY]);

      var reasons = [];
      if (!_nonEmptyStr(c.name)) reasons.push(CODES.CONTROL_VARIABLES_INVALID);
      if (!_nonEmptyStr(c.description)) reasons.push(CODES.CONTROL_VARIABLES_INVALID);
      if (c.expectedValue !== null && typeof c.expectedValue !== 'number' && typeof c.expectedValue !== 'string') reasons.push(CODES.CONTROL_VARIABLES_INVALID);
      if (c.allowedRange !== null) {
        if (!_isPlain(c.allowedRange)
            || typeof c.allowedRange.min !== 'number' || !isFinite(c.allowedRange.min)
            || typeof c.allowedRange.max !== 'number' || !isFinite(c.allowedRange.max)
            || c.allowedRange.min > c.allowedRange.max) {
          reasons.push(CODES.CONTROL_VARIABLE_OUT_OF_RANGE);
        }
      }
      if (c.observedValue !== null && typeof c.observedValue !== 'number' && typeof c.observedValue !== 'string') reasons.push(CODES.CONTROL_VARIABLES_INVALID);
      if (c.withinRange !== null && typeof c.withinRange !== 'boolean') reasons.push(CODES.CONTROL_VARIABLES_INVALID);

      if (reasons.length) {
        var seen = Object.create(null), out = [];
        reasons.forEach(function (k) { if (!seen[k]) { seen[k] = true; out.push(k); } });
        return RC.buildBlockedResult(out);
      }
      return Object.freeze({ valid: true });
    } catch (e) { return RC.buildBlockedResult([CODES.CONTROL_VARIABLES_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]); }
  }

  var api = { CONTROL_VARIABLE_KEYS: CONTROL_VARIABLE_KEYS, validateControlVariableShape: validateControlVariableShape };
  Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { Object.defineProperty(root, 'R3_0E_ControlVariablesContract', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_ControlVariablesContract = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
