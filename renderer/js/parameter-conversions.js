/**
 * parameter-conversions.js — R2.1B: Provenance-aware raw→canonical conversion registry (PURE).
 *
 * Every transform from a manufacturer/sheet raw value to a canonical model parameter lives here as a
 * named, versioned, self-describing conversion. Each run returns a ConversionRecord that KEEPS the
 * full trail (raw value/unit/definition/basis/ratio, formula, id, version, source, canonical result)
 * so nothing reaches the model "with its physical meaning lost".
 *
 * The MATH here is exactly the audit's three-way-verified chain (Milliken RCVD + SF14 + Dallara
 * house rule). The proof tests in tests/parameter-conversions.test.js LOCK direction & factors:
 *   • manual wheel/spring ratio ↔ software MR are reciprocals (software MR = spring/wheel travel),
 *   • spring-element rate → wheel rate = rate × MR_sw²,
 *   • legacy ARB component kgf/mm → axle Nm/deg via /MR_arb² (inverse-square) then track²/2 (BOTH
 *     sides already included — NEVER an extra ×2),
 *   • F320 anti-symmetric "ground" stiffness must NOT pass through the legacy component chain,
 *   • unknown / illegal basis or unit → fail-closed (ok:false, value:null), never a guess.
 *
 * RED LINES: changes no model result; imports only canonical-parameters.js (data contract); no UI,
 * no Advisor, no preset, no telemetry, no dynamics-model. A 'derived' result is NEVER 'documented'.
 *
 * UMD: Node require / Electron renderer global (ParameterConversions).
 */
(function (root) {
  'use strict';

  var _cp = null;
  if (typeof module !== 'undefined' && module.exports) { try { _cp = require('./canonical-parameters.js'); } catch (e) { _cp = null; } }
  var CP = _cp || (typeof CanonicalParameters !== 'undefined' ? CanonicalParameters : null);
  if (!CP) throw new Error('parameter-conversions.js requires canonical-parameters.js');

  var BASIS = CP.SOURCE_BASIS, TERM = CP.TRAVEL_TERM, STATUS = CP.CONVERSION_STATUS,
      PARAM = CP.CANONICAL_PARAM, UNIT = CP.CANONICAL_UNIT, PROV = CP.PROVENANCE;

  // ── unit constants (pure, well-known) ─────────────────────────────────────────────────────────
  var LBF_IN_TO_N_MM = 4.4482216152605 / 25.4;  // = 0.17512683524 N/mm per lbf/in
  var KGF_TO_N = 9.80665;                         // standard gravity
  var DEG_PER_RAD = 180 / Math.PI;

  function _finite(v) { return typeof v === 'number' && isFinite(v); }

  function _rec(o) { return CP.makeConversionRecord(o); }
  function _fail(base, reason, status) {
    base.ok = false; base.reason = reason; base.status = status || STATUS.BLOCKED;
    base.output = base.output || {}; base.output.value = null;
    return _rec(base);
  }

  // ── unit helpers (return number or null; null = unrecognised unit → caller fails closed) ───────
  function rateToNmm(value, unit) {
    if (!_finite(value)) return null;
    if (unit === 'N/mm') return value;
    if (unit === 'lb/in' || unit === 'lbf/in') return value * LBF_IN_TO_N_MM;
    if (unit === 'kgf/mm' || unit === 'kg/mm') return value * KGF_TO_N;
    return null;
  }

  // ── C1: manual wheel/spring ratio → software motion ratio (reciprocal) ─────────────────────────
  // Manufacturer ratio is wheel_travel / spring_travel (>1). The model's MR satisfies
  // wheelRate = springRate × MR², i.e. the model MR = spring_travel / wheel_travel = 1 / manual.
  function manualRatioToSoftwareMr(raw) {
    var formula = 'MR_software = 1 / ratio_manual  (manual = wheel_travel/spring_travel; software = spring_travel/wheel_travel)';
    var base = {
      conversionId: 'manual_ratio_to_software_mr', version: '1', formula: formula,
      inputs: { rawValue: raw && raw.value, rawUnit: (raw && raw.unit) || 'dimensionless',
                rawDefinition: raw && raw.definition, rawBasis: raw && raw.basis,
                ratioDefinition: raw && raw.ratioDefinition },
      source: raw && raw.source,
      output: { parameter: 'motion_ratio_software', unit: 'dimensionless' },
    };
    var rd = raw && raw.ratioDefinition;
    if (!rd || rd.numerator !== TERM.WHEEL || rd.denominator !== TERM.SPRING) {
      return _fail(base, 'manual_ratio_must_be_wheel_over_spring_travel', STATUS.REJECTED);
    }
    if (!_finite(raw.value) || raw.value <= 0) return _fail(base, 'non_positive_ratio', STATUS.BLOCKED);
    base.output.value = 1 / raw.value;
    base.output.ratioDefinition = { numerator: TERM.SPRING, denominator: TERM.WHEEL };
    base.status = STATUS.VERIFIED; base.ok = true; base.reason = null;
    return _rec(base);
  }

  // ── C2: spring-element rate → wheel rate (× MR_software²) ──────────────────────────────────────
  // raw is the rate AT THE SPRING ELEMENT (coil lb/in or N/mm). softwareMr = spring/wheel travel.
  function springElementToWheelRate(raw, softwareMr, parameter) {
    var formula = 'wheelRate[N/mm] = elementRate[N/mm] × MR_software²   (MR_software = spring/wheel travel)';
    var rNmm = rateToNmm(raw && raw.value, raw && raw.unit);
    var base = {
      conversionId: 'spring_element_to_wheel_rate', version: '1', formula: formula,
      inputs: { rawValue: raw && raw.value, rawUnit: raw && raw.unit, rawDefinition: raw && raw.definition,
                rawBasis: raw && raw.basis, auxiliary: { softwareMr: softwareMr, elementRateNmm: rNmm } },
      source: raw && raw.source,
      output: { parameter: parameter || null, unit: UNIT[parameter] || 'N/mm' },
    };
    if (raw && raw.basis !== BASIS.SPRING_ELEMENT) return _fail(base, 'basis_must_be_spring_element', STATUS.REJECTED);
    if (rNmm == null) return _fail(base, 'unrecognised_rate_unit', STATUS.REJECTED);
    if (!_finite(softwareMr) || softwareMr <= 0) return _fail(base, 'missing_or_bad_motion_ratio', STATUS.BLOCKED);
    base.output.value = rNmm * softwareMr * softwareMr;
    base.status = STATUS.VERIFIED; base.ok = true; base.reason = null;
    return _rec(base);
  }

  // ── C3: ground / wheel-referred rate → wheel rate (identity; NOT_REQUIRED transform) ───────────
  // Manufacturer "ground stiffness" (N/mm) is already at the wheel; it must NOT be multiplied by MR²
  // again. This is the F312 front-torsion case (the manual prints torsion Nm/deg ↔ ground N/mm).
  function groundRateToWheelRate(raw, parameter) {
    var formula = 'wheelRate[N/mm] = groundStiffness[N/mm]   (already wheel-referred — identity, no MR²)';
    var rNmm = rateToNmm(raw && raw.value, raw && raw.unit);
    var base = {
      conversionId: 'ground_rate_to_wheel_rate', version: '1', formula: formula,
      inputs: { rawValue: raw && raw.value, rawUnit: raw && raw.unit, rawDefinition: raw && raw.definition,
                rawBasis: raw && raw.basis },
      source: raw && raw.source,
      output: { parameter: parameter || null, unit: UNIT[parameter] || 'N/mm' },
    };
    if (raw && raw.basis !== BASIS.GROUND && raw.basis !== BASIS.WHEEL) {
      return _fail(base, 'basis_must_be_ground_or_wheel', STATUS.REJECTED);
    }
    if (rNmm == null) return _fail(base, 'unrecognised_rate_unit', STATUS.REJECTED);
    base.output.value = rNmm;
    base.status = STATUS.NOT_REQUIRED; base.ok = true; base.reason = null;
    return _rec(base);
  }

  // ── C4: legacy ARB component (kgf/mm) → axle roll stiffness (Nm/deg) ───────────────────────────
  // The audit's three-way-verified chain. component = one blade end locked, other displaced 1mm.
  //   k_comp[kgf/mm] ×9.80665 → N/mm
  //                  /MR_arb²  → wheel N/mm   (MR_arb = wheel_travel/droplink_travel, inverse-square)
  //                  ×1000     → N/m
  //                  ×track²/2 → Nm/rad       (track in m; the ²/2 ALREADY carries both sides)
  //                  ×π/180    → Nm/deg
  // NEVER an extra ×2 (track²/2 already is 2×K×(t/2)²). F320 ground basis is rejected on purpose.
  // arbMr may be a bare number OR a provenance-tagged {value, provenance}. The CHAIN MATH is always
  // correct, but a SPECIFIC car's axle stiffness is only trustworthy if its ARB motion ratio is itself
  // documented/measured — so a bare/guessed arbMr yields status UNVERIFIED (never silently VERIFIED).
  function arbComponentToAxleRollStiffness(raw, arbMr, trackMm, parameter) {
    var formula = 'axle[Nm/deg] = k_comp[kgf/mm]×9.80665 /MR_arb² ×1000 ×(track_m²/2) ×π/180   (no extra ×2)';
    var arbMrVal = (arbMr && typeof arbMr === 'object') ? arbMr.value : arbMr;
    var arbMrProv = (arbMr && typeof arbMr === 'object') ? arbMr.provenance : null;
    var arbMrTrusted = arbMrProv === PROV.DOCUMENTED || arbMrProv === PROV.MEASURED;
    var base = {
      conversionId: 'arb_component_to_axle_roll_stiffness', version: '1', formula: formula,
      inputs: { rawValue: raw && raw.value, rawUnit: raw && raw.unit, rawDefinition: raw && raw.definition,
                rawBasis: raw && raw.basis, auxiliary: { arbMr: arbMrVal, arbMrProvenance: arbMrProv || 'untagged', trackMm: trackMm } },
      source: raw && raw.source,
      output: { parameter: parameter || null, unit: UNIT[parameter] || 'Nm/deg' },
    };
    // basis gate: ONLY a legacy blade component may use this chain.
    if (raw && raw.basis === BASIS.ARB_GROUND_ANTI_SYMMETRIC) {
      return _fail(base, 'f320_anti_symmetric_ground_must_not_use_legacy_component_chain', STATUS.REJECTED);
    }
    if (raw && raw.basis !== BASIS.ARB_BLADE_COMPONENT) {
      return _fail(base, 'basis_must_be_arb_blade_component', STATUS.REJECTED);
    }
    var unit = raw && raw.unit;
    if (unit !== 'kgf/mm' && unit !== 'kg/mm') return _fail(base, 'arb_component_unit_must_be_kgf_per_mm', STATUS.REJECTED);
    if (!_finite(raw.value) || raw.value <= 0) return _fail(base, 'non_positive_component_rate', STATUS.BLOCKED);
    if (!_finite(arbMrVal) || arbMrVal <= 0) return _fail(base, 'missing_or_bad_arb_motion_ratio', STATUS.BLOCKED);
    if (!_finite(trackMm) || trackMm <= 0) return _fail(base, 'missing_or_bad_track', STATUS.BLOCKED);
    var kWheelNmm = raw.value * KGF_TO_N / (arbMrVal * arbMrVal); // N/mm at wheel
    var trackM = trackMm / 1000;
    var axleNmRad = kWheelNmm * 1000 * (trackM * trackM) / 2; // Nm/rad  (×1000: N/mm→N/m)
    base.output.value = axleNmRad / DEG_PER_RAD;              // Nm/deg
    base.status = arbMrTrusted ? STATUS.VERIFIED : STATUS.UNVERIFIED;
    base.ok = true;
    base.reason = arbMrTrusted ? null : 'arb_motion_ratio_provenance_unconfirmed';
    return _rec(base);
  }

  // ── C5: F320 anti-symmetric "ground" ARB stiffness → axle roll stiffness (Nm/deg) ──────────────
  // F320 prints @ground = (2×component)/MR_arb² — already both-sides AND wheel-referred. So it must
  // NOT be divided by MR² again, nor doubled. Chain: kGround[N/mm] ×1000 ×track²/2 ×π/180.
  // Marked UNVERIFIED: we have the Dallara house-rule convention but no F320 real value / per-blade
  // table to lock it. Fail-closed at the canonical layer (never model-usable until proven).
  function f320GroundArbToAxleRollStiffness(raw, trackMm, parameter) {
    var formula = 'axle[Nm/deg] = kGround[N/mm] ×1000 ×(track_m²/2) ×π/180   (ground = already wheel-referred & both-sided; NO /MR², NO ×2)';
    var rNmm = rateToNmm(raw && raw.value, raw && raw.unit);
    var base = {
      conversionId: 'f320_ground_arb_to_axle_roll_stiffness', version: '0', formula: formula,
      inputs: { rawValue: raw && raw.value, rawUnit: raw && raw.unit, rawDefinition: raw && raw.definition,
                rawBasis: raw && raw.basis, auxiliary: { trackMm: trackMm } },
      source: raw && raw.source,
      output: { parameter: parameter || null, unit: UNIT[parameter] || 'Nm/deg' },
    };
    if (raw && raw.basis !== BASIS.ARB_GROUND_ANTI_SYMMETRIC) {
      return _fail(base, 'basis_must_be_arb_ground_anti_symmetric', STATUS.REJECTED);
    }
    if (rNmm == null) return _fail(base, 'unrecognised_rate_unit', STATUS.REJECTED);
    if (!_finite(trackMm) || trackMm <= 0) return _fail(base, 'missing_or_bad_track', STATUS.BLOCKED);
    var trackM = trackMm / 1000;
    var axleNmRad = rNmm * 1000 * (trackM * trackM) / 2;
    base.output.value = axleNmRad / DEG_PER_RAD;
    // Convention-correct but not corpus-locked → UNVERIFIED on purpose.
    base.status = STATUS.UNVERIFIED; base.ok = true; base.reason = 'f320_convention_only_not_corpus_locked';
    return _rec(base);
  }

  // ── registry (metadata for discovery / docs) ──────────────────────────────────────────────────
  var CONVERSIONS = Object.freeze({
    manual_ratio_to_software_mr: { version: '1', acceptsBasis: ['(ratio)'], produces: 'motion_ratio_software', verified: true },
    spring_element_to_wheel_rate: { version: '1', acceptsBasis: [BASIS.SPRING_ELEMENT], produces: 'wheel_rate_nmm', verified: true },
    ground_rate_to_wheel_rate: { version: '1', acceptsBasis: [BASIS.GROUND, BASIS.WHEEL], produces: 'wheel_rate_nmm', verified: true },
    arb_component_to_axle_roll_stiffness: { version: '1', acceptsBasis: [BASIS.ARB_BLADE_COMPONENT], produces: 'arb_roll_stiffness_nm_deg', verified: true },
    f320_ground_arb_to_axle_roll_stiffness: { version: '0', acceptsBasis: [BASIS.ARB_GROUND_ANTI_SYMMETRIC], produces: 'arb_roll_stiffness_nm_deg', verified: false },
  });

  var api = {
    CONVERSIONS: CONVERSIONS,
    LBF_IN_TO_N_MM: LBF_IN_TO_N_MM, KGF_TO_N: KGF_TO_N, DEG_PER_RAD: DEG_PER_RAD,
    rateToNmm: rateToNmm,
    manualRatioToSoftwareMr: manualRatioToSoftwareMr,
    springElementToWheelRate: springElementToWheelRate,
    groundRateToWheelRate: groundRateToWheelRate,
    arbComponentToAxleRollStiffness: arbComponentToAxleRollStiffness,
    f320GroundArbToAxleRollStiffness: f320GroundArbToAxleRollStiffness,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ParameterConversions = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
