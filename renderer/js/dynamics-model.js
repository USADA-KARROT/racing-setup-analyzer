/**
 * Vehicle Dynamics Prediction Model - 車輛動力學預測模型
 * 三層架構：快速 → 輪胎詳細 → 完整
 *
 * Core physics:
 *   Setup → Roll Stiffness Distribution → LLTD → Slip Angle Balance → Handling Tendency
 *
 * References:
 *   - Milliken & Milliken, Race Car Vehicle Dynamics
 *   - OptimumG Vehicle Dynamics
 *   - Suspension Secrets (suspensionsecrets.co.uk)
 *
 * Ported from Python dynamics_model.py → JavaScript
 */

// ============================================================
// Constants
// ============================================================
const G = 9.81;        // m/s²
const RHO_AIR = 1.225; // kg/m³ at sea level 20°C
const G_STEEL = 80000; // MPa (shear modulus of steel, for ARB calculation)

// ============================================================
// Utility: round to N decimal places
// ============================================================
function roundN(val, n) {
  const f = Math.pow(10, n);
  return Math.round(val * f) / f;
}

// ============================================================
// TIER 1: 簡易版 - Setup → Handling Tendency
// Input: spring rates, ARB, track, MR, weight dist
// Output: Understeer gradient indicator (-1 to +1)
// ============================================================
class Tier1BasicBalance {
  /**
   * @param {Object} params
   *   front_spring_rate: N/mm (wheel rate if use_wheel_rate=true)
   *   rear_spring_rate: N/mm
   *   front_arb: Nm/deg (0 if no ARB)
   *   rear_arb: Nm/deg
   *   front_track: mm
   *   rear_track: mm
   *   front_motion_ratio: dimensionless (default 1.0)
   *   rear_motion_ratio: dimensionless (default 1.0)
   *   weight_front_pct: % (e.g. 44.5)
   *   total_weight: kg
   *   cg_height: mm (above ground)
   *   wheelbase: mm
   *   use_wheel_rate: bool - if true, spring rates are already wheel rates
   */
  constructor(params) {
    this.p = params;
  }

  /** Convert spring rate to wheel rate via motion ratio. */
  wheelRate(springRate, motionRatio) {
    return springRate * Math.pow(motionRatio, 2);
  }

  /**
   * Roll stiffness contribution from springs (Nm/deg).
   * K_roll = K_wheel * (track/2)^2 * (pi/180)
   * K_wheel in N/mm, track in mm → convert to N/m and m
   */
  rollStiffnessSpring(wheelRateNmm, trackMm) {
    const kW = wheelRateNmm * 1000; // N/m
    const tHalf = trackMm / 2000;   // m
    return kW * Math.pow(tHalf, 2) * (Math.PI / 180);
  }

  calculate() {
    const p = this.p;
    const fMr = p.front_motion_ratio ?? 1.0;
    const rMr = p.rear_motion_ratio ?? 1.0;

    let fWr, rWr;
    if (p.use_wheel_rate) {
      fWr = p.front_spring_rate;
      rWr = p.rear_spring_rate;
    } else {
      fWr = this.wheelRate(p.front_spring_rate, fMr);
      rWr = this.wheelRate(p.rear_spring_rate, rMr);
    }

    // Effective wheel rate (spring in series with tire)
    const tireK = p.tire_spring_rate ?? 220; // N/mm default
    let fWrEff, rWrEff;
    if (tireK > 0 && fWr > 0) {
      fWrEff = 1.0 / (1.0 / tireK + 1.0 / fWr);
    } else {
      fWrEff = fWr;
    }
    if (tireK > 0 && rWr > 0) {
      rWrEff = 1.0 / (1.0 / tireK + 1.0 / rWr);
    } else {
      rWrEff = rWr;
    }

    // Roll stiffness from springs (using effective wheel rate)
    const fRsSpring = this.rollStiffnessSpring(fWrEff, p.front_track);
    const rRsSpring = this.rollStiffnessSpring(rWrEff, p.rear_track);

    // Add ARB contribution
    const fArb = p.front_arb ?? 0;
    const rArb = p.rear_arb ?? 0;
    const fRsTotal = fRsSpring + fArb;
    const rRsTotal = rRsSpring + rArb;
    const totalRs = fRsTotal + rRsTotal;

    // Roll stiffness distribution
    const rsDistFront = totalRs > 0 ? (fRsTotal / totalRs * 100) : 50.0;

    // Weight distribution
    const wFrontPct = p.weight_front_pct ?? 50.0;
    const totalWeight = p.total_weight ?? 1000;
    const cgHeight = (p.cg_height ?? 300) / 1000; // to meters

    // Roll gradient (deg/g)
    let rollGradient = 0;
    if (totalRs > 0) {
      rollGradient = (totalWeight * G * cgHeight) / (totalRs * 180 / Math.PI);
    }

    // === Ride Frequency ===
    const sprungMassFront = (totalWeight * wFrontPct / 100) / 2; // per corner
    const sprungMassRear = (totalWeight * (100 - wFrontPct) / 100) / 2;
    let rideFreqFront = 0, rideFreqRear = 0;
    if (sprungMassFront > 0 && fWrEff > 0) {
      rideFreqFront = 1 / (2 * Math.PI) * Math.sqrt(fWrEff * 1000 / sprungMassFront);
    }
    if (sprungMassRear > 0 && rWrEff > 0) {
      rideFreqRear = 1 / (2 * Math.PI) * Math.sqrt(rWrEff * 1000 / sprungMassRear);
    }

    function rideFreqCategory(hz) {
      if (hz < 1.5) return 'comfort';
      if (hz < 2.5) return 'street';
      if (hz < 3.5) return 'track';
      return 'race';
    }

    // === Decomposed LLTD (Geometric + Elastic) ===
    const hRcF = (p.front_roll_center_height ?? 50) / 1000; // m
    const hRcR = (p.rear_roll_center_height ?? 100) / 1000;
    const tF = (p.front_track ?? 1500) / 1000; // m
    const tR = (p.rear_track ?? 1500) / 1000;
    const mF = totalWeight * wFrontPct / 100;
    const mR = totalWeight * (100 - wFrontPct) / 100;

    // Geometric load transfer (per g)
    const dFzGeoF = mF * hRcF / tF;
    const dFzGeoR = mR * hRcR / tR;

    // Elastic load transfer (through springs/ARBs, per g)
    const rollMomentArm = mF * (cgHeight - hRcF) + mR * (cgHeight - hRcR);
    let dFzElasticF = 0, dFzElasticR = 0;
    if (totalRs > 0) {
      dFzElasticF = (fRsTotal / totalRs) * rollMomentArm / tF;
      dFzElasticR = (rRsTotal / totalRs) * rollMomentArm / tR;
    }

    const totalDFzF = dFzGeoF + dFzElasticF;
    const totalDFzR = dFzGeoR + dFzElasticR;
    const totalDFz = totalDFzF + totalDFzR;
    const lltdDecomposedFront = totalDFz > 0 ? (totalDFzF / totalDFz * 100) : 50;
    const geoPctOfTotal = totalDFz > 0 ? ((dFzGeoF + dFzGeoR) / totalDFz * 100) : 0;

    // Use decomposed LLTD as the real LLTD
    const lltdFront = lltdDecomposedFront;

    // Understeer tendency
    const usGradient = lltdFront - wFrontPct;

    // Normalize to -1 (max oversteer) to +1 (max understeer)
    const usNormalized = Math.max(-1.0, Math.min(1.0, usGradient / 15.0));

    // Handling tendency label
    let tendency, tendencyZh;
    if (usGradient > 3) {
      tendency = 'Understeer';
      tendencyZh = '轉向不足';
    } else if (usGradient < -3) {
      tendency = 'Oversteer';
      tendencyZh = '轉向過度';
    } else {
      tendency = 'Neutral';
      tendencyZh = '中性';
    }

    return {
      tier: 1,
      // Roll stiffness
      front_wheel_rate: roundN(fWr, 1),
      rear_wheel_rate: roundN(rWr, 1),
      front_wheel_rate_effective: roundN(fWrEff, 1),
      rear_wheel_rate_effective: roundN(rWrEff, 1),
      tire_spring_rate: tireK,
      front_roll_stiffness_spring: roundN(fRsSpring, 1),
      rear_roll_stiffness_spring: roundN(rRsSpring, 1),
      front_roll_stiffness_total: roundN(fRsTotal, 1),
      rear_roll_stiffness_total: roundN(rRsTotal, 1),
      total_roll_stiffness: roundN(totalRs, 1),
      roll_stiffness_dist_front: roundN(rsDistFront, 1),
      roll_gradient_deg_per_g: roundN(rollGradient, 3),
      // Balance
      lltd_front: roundN(lltdFront, 1),
      weight_front_pct: roundN(wFrontPct, 1),
      understeer_gradient: roundN(usGradient, 2),
      understeer_normalized: roundN(usNormalized, 3),
      tendency: tendency,
      tendency_zh: tendencyZh,
      // Ride frequency
      ride_frequency: {
        front_hz: roundN(rideFreqFront, 2),
        rear_hz: roundN(rideFreqRear, 2),
        ratio: rideFreqFront > 0 ? roundN(rideFreqRear / rideFreqFront, 3) : 0,
        front_category: rideFreqCategory(rideFreqFront),
        rear_category: rideFreqCategory(rideFreqRear),
      },
      // LLTD decomposition
      lltd_decomposed: {
        geometric_front: roundN(dFzGeoF, 1),
        geometric_rear: roundN(dFzGeoR, 1),
        elastic_front: roundN(dFzElasticF, 1),
        elastic_rear: roundN(dFzElasticR, 1),
        total_front_pct: roundN(lltdDecomposedFront, 1),
        geometric_pct_of_total: roundN(geoPctOfTotal, 1),
      },
      // Component breakdown
      breakdown: {
        spring_effect: roundN(
          (fRsSpring + rRsSpring) > 0
            ? (fRsSpring / (fRsSpring + rRsSpring) * 100 - wFrontPct)
            : 0,
          1
        ),
        arb_effect: roundN(fArb - rArb, 1),
      },
    };
  }
}


// ============================================================
// Tire Model
// ============================================================
class TireModel {
  // Legacy compound parameters: [optimal_temp_C, temp_window_C, peak_grip_coeff]
  static COMPOUNDS = {
    soft:       [85, 15, 1.05],
    medium:     [95, 20, 1.00],
    hard:       [105, 25, 0.95],
    wet:        [55, 30, 0.70],
    slick_soft: [90, 12, 1.08],
    slick_hard: [100, 18, 1.02],
  };

  // Reference tire width for normalization (mm)
  static REFERENCE_WIDTH = 245;

  /**
   * Get tire parameters from either legacy compound name or trackday tire ID.
   * Returns [optimal_temp, temp_window, peak_grip, optimal_pressure_front, optimal_pressure_rear]
   */
  static getTireParams(compoundOrTireId) {
    // Check trackday tire database first
    if (typeof TRACKDAY_TIRES !== 'undefined' && TRACKDAY_TIRES[compoundOrTireId]) {
      const t = TRACKDAY_TIRES[compoundOrTireId];
      return [t.optimal_temp, t.temp_window, t.peak_grip,
              t.optimal_pressure_front_bar, t.optimal_pressure_rear_bar];
    }
    // Fall back to legacy compounds
    if (TireModel.COMPOUNDS[compoundOrTireId]) {
      const [opt, win, peak] = TireModel.COMPOUNDS[compoundOrTireId];
      return [opt, win, peak, 1.90, 1.90];
    }
    // Default
    return [95, 20, 1.0, 1.90, 1.90];
  }

  /**
   * Grip multiplier based on tire temperature.
   * Bell curve: peak at optimal temp, drops off outside window.
   */
  static gripFactorTemperature(tireTempC, compound = 'medium') {
    const [optTemp, window, peak] = TireModel.getTireParams(compound);
    const delta = Math.abs(tireTempC - optTemp);
    const factor = Math.exp(-0.5 * Math.pow(delta / window, 2));
    return roundN(factor * peak, 4);
  }

  /**
   * Grip multiplier based on tire pressure.
   * Optimal pressure gives 1.0; too high or too low reduces grip.
   * Typical sensitivity: ~2% per 0.1 bar deviation.
   */
  static gripFactorPressure(pressureBar, optimalBar = 1.90) {
    const delta = Math.abs(pressureBar - optimalBar);
    const factor = 1.0 - 0.2 * delta;
    return roundN(Math.max(0.5, Math.min(1.0, factor)), 4);
  }

  /**
   * Grip multiplier based on tire width.
   * Wider tire = larger contact patch = more grip (diminishing returns).
   * Approximation: grip scales with sqrt(width_ratio).
   * Reference: 245mm = 1.0x multiplier.
   */
  static gripFactorWidth(tireWidthMm, referenceWidth = null) {
    const ref = referenceWidth || TireModel.REFERENCE_WIDTH;
    if (tireWidthMm <= 0 || ref <= 0) return 1.0;
    const ratio = tireWidthMm / ref;
    const factor = Math.sqrt(ratio);
    return roundN(Math.max(0.8, Math.min(1.25, factor)), 4);
  }

  /**
   * Tire load sensitivity: grip efficiency decreases as load increases.
   * K_y = K * sin(2 * atan(Fz / Fz0))
   * At Fz=Fz0: K_y ≈ 0.91K (already losing ~9% efficiency)
   */
  static tireLoadSensitivity(fzN, fz0N = 4000, k = 1.0) {
    if (fzN <= 0 || fz0N <= 0) return k;
    return k * Math.sin(2 * Math.atan(fzN / fz0N));
  }

  /** Combined grip factor from temperature, pressure, and width. */
  static effectiveGrip(tireTempC, pressureBar, compound = 'medium', optimalPressure = 1.90, tireWidthMm = 0) {
    const gTemp = TireModel.gripFactorTemperature(tireTempC, compound);
    const gPres = TireModel.gripFactorPressure(pressureBar, optimalPressure);
    const gWidth = tireWidthMm > 0 ? TireModel.gripFactorWidth(tireWidthMm) : 1.0;
    return roundN(gTemp * gPres * gWidth, 4);
  }
}


// ============================================================
// Pacejka Simplified Tire Model (14-param, optional advanced model)
// ============================================================
class PacejkaTireModel {
  // Default coefficients by tire category
  static COEFFICIENTS = {
    race:       { a1: -22.1, a2: 1011, a3: 1078, a4: 1.82, a5: 0.208, a6: 0.0, a7: -0.354, C: 1.30 },
    semi_slick: { a1: -22.1, a2: 1011, a3: 1078, a4: 1.82, a5: 0.208, a6: 0.0, a7: -0.354, C: 1.30 },
    sport:      { a1: -22.1, a2: 1011, a3: 900,  a4: 2.0,  a5: 0.15,  a6: 0.0, a7: -0.3,   C: 1.30 },
  };

  /**
   * Simplified Pacejka Magic Formula lateral force.
   * F = D * sin(C * atan(B*α - E*(B*α - atan(B*α))))
   * @param {number} slipAngleDeg - slip angle in degrees
   * @param {number} fzKn - vertical load in kN
   * @param {number} camberDeg - camber angle in degrees
   * @param {string} category - 'race'|'semi_slick'|'sport'
   * @returns {number} lateral force in N
   */
  static lateralForce(slipAngleDeg, fzKn, camberDeg = 0, category = 'semi_slick') {
    const co = PacejkaTireModel.COEFFICIENTS[category] || PacejkaTireModel.COEFFICIENTS.sport;
    const alpha = slipAngleDeg * Math.PI / 180;
    const C = co.C;
    const D = (co.a1 * fzKn + co.a2) * fzKn;
    const BCD = co.a3 * Math.sin(2 * Math.atan(fzKn / co.a4)) * (1 - co.a5 * Math.abs(camberDeg));
    const E = co.a6 * fzKn + co.a7;
    const B = (C * D) !== 0 ? BCD / (C * D) : 0;
    const Ba = B * alpha;
    return D * Math.sin(C * Math.atan(Ba - E * (Ba - Math.atan(Ba))));
  }
}


// ============================================================
// TIER 2: 進階版 - 加入輪胎模型（溫度/壓力/配方/寬度）
// ============================================================
class Tier2TireAware {
  /**
   * @param {Object} params - same as Tier1
   * @param {Object} tireParams
   *   fl_temp, fr_temp, rl_temp, rr_temp: tire temps in °C
   *   fl_pressure, fr_pressure, rl_pressure, rr_pressure: bar
   *   front_compound: string (legacy name or trackday tire ID)
   *   rear_compound: string
   *   front_optimal_pressure: bar (default 1.90)
   *   rear_optimal_pressure: bar (default 1.90)
   *   front_tire_width: mm (default 0 = ignore)
   *   rear_tire_width: mm (default 0 = ignore)
   */
  constructor(params, tireParams) {
    this.params = params;
    this.tp = tireParams;
  }

  calculate() {
    // First get Tier 1 result
    const t1 = new Tier1BasicBalance(this.params).calculate();
    const tp = this.tp;

    // Calculate grip for each corner
    const fCompound = tp.front_compound ?? 'medium';
    const rCompound = tp.rear_compound ?? 'medium';

    // Auto-detect optimal pressure from tire database
    let fOptP = tp.front_optimal_pressure ?? 1.90;
    let rOptP = tp.rear_optimal_pressure ?? 1.90;
    if (typeof TRACKDAY_TIRES !== 'undefined') {
      if (TRACKDAY_TIRES[fCompound] && fOptP === 1.90) {
        fOptP = TRACKDAY_TIRES[fCompound].optimal_pressure_front_bar;
      }
      if (TRACKDAY_TIRES[rCompound] && rOptP === 1.90) {
        rOptP = TRACKDAY_TIRES[rCompound].optimal_pressure_rear_bar;
      }
    }

    // Tire width
    const fWidth = tp.front_tire_width ?? 0;
    const rWidth = tp.rear_tire_width ?? 0;

    const flGrip = TireModel.effectiveGrip(tp.fl_temp ?? 90, tp.fl_pressure ?? 1.90, fCompound, fOptP, fWidth);
    const frGrip = TireModel.effectiveGrip(tp.fr_temp ?? 90, tp.fr_pressure ?? 1.90, fCompound, fOptP, fWidth);
    const rlGrip = TireModel.effectiveGrip(tp.rl_temp ?? 90, tp.rl_pressure ?? 1.90, rCompound, rOptP, rWidth);
    const rrGrip = TireModel.effectiveGrip(tp.rr_temp ?? 90, tp.rr_pressure ?? 1.90, rCompound, rOptP, rWidth);

    const frontAvgGrip = (flGrip + frGrip) / 2;
    const rearAvgGrip = (rlGrip + rrGrip) / 2;

    // Grip ratio
    const gripRatio = rearAvgGrip > 0 ? (frontAvgGrip / rearAvgGrip) : 1.0;

    // Tire-adjusted understeer gradient
    const tireUsShift = -(gripRatio - 1.0) * 30;
    const adjustedUs = t1.understeer_gradient + tireUsShift;
    const adjustedNormalized = Math.max(-1.0, Math.min(1.0, adjustedUs / 15.0));

    let tendency, tendencyZh;
    if (adjustedUs > 3) {
      tendency = 'Understeer';
      tendencyZh = '轉向不足';
    } else if (adjustedUs < -3) {
      tendency = 'Oversteer';
      tendencyZh = '轉向過度';
    } else {
      tendency = 'Neutral';
      tendencyZh = '中性';
    }

    // Grip warnings
    const warnings = [];
    if (frontAvgGrip < 0.85) {
      warnings.push('前輪抓地力偏低 (溫度或壓力不在工作範圍)');
    }
    if (rearAvgGrip < 0.85) {
      warnings.push('後輪抓地力偏低 (溫度或壓力不在工作範圍)');
    }
    if (Math.abs(flGrip - frGrip) > 0.05) {
      warnings.push('前輪左右抓地力不平衡 (差異 ' + (Math.abs(flGrip - frGrip) * 100).toFixed(1) + '%)');
    }
    if (Math.abs(rlGrip - rrGrip) > 0.05) {
      warnings.push('後輪左右抓地力不平衡 (差異 ' + (Math.abs(rlGrip - rrGrip) * 100).toFixed(1) + '%)');
    }

    // Tire width effect info
    const fWidthFactor = fWidth > 0 ? TireModel.gripFactorWidth(fWidth) : 1.0;
    const rWidthFactor = rWidth > 0 ? TireModel.gripFactorWidth(rWidth) : 1.0;

    // Tire load sensitivity
    const totalWeight = this.params.total_weight ?? 1000;
    const wFrontPct = this.params.weight_front_pct ?? 50;
    const nominalCornerLoad = totalWeight * G / 4;
    const flLoad = (totalWeight * wFrontPct / 100 / 2) * G;
    const rlLoad = (totalWeight * (100 - wFrontPct) / 100 / 2) * G;
    const loadSensitivity = {
      fl_efficiency: roundN(TireModel.tireLoadSensitivity(flLoad, nominalCornerLoad), 3),
      fr_efficiency: roundN(TireModel.tireLoadSensitivity(flLoad, nominalCornerLoad), 3),
      rl_efficiency: roundN(TireModel.tireLoadSensitivity(rlLoad, nominalCornerLoad), 3),
      rr_efficiency: roundN(TireModel.tireLoadSensitivity(rlLoad, nominalCornerLoad), 3),
      nominal_load_n: roundN(nominalCornerLoad, 0),
    };

    return {
      ...t1,
      tier: 2,
      // Tire grip
      tire_grip: {
        fl: flGrip, fr: frGrip, rl: rlGrip, rr: rrGrip,
        front_avg: roundN(frontAvgGrip, 4),
        rear_avg: roundN(rearAvgGrip, 4),
        grip_ratio_f_r: roundN(gripRatio, 4),
        front_width_mm: fWidth,
        rear_width_mm: rWidth,
        front_width_factor: roundN(fWidthFactor, 4),
        rear_width_factor: roundN(rWidthFactor, 4),
      },
      load_sensitivity: loadSensitivity,
      // Adjusted balance
      tire_us_shift: roundN(tireUsShift, 2),
      adjusted_understeer_gradient: roundN(adjustedUs, 2),
      adjusted_normalized: roundN(adjustedNormalized, 3),
      adjusted_tendency: tendency,
      adjusted_tendency_zh: tendencyZh,
      warnings: warnings,
    };
  }
}


// ============================================================
// TIER 3: 完整版 - 四角重量、空力、Damper、幾何、Bump Rubber
// ============================================================
class Tier3Complete {
  /**
   * @param {Object} params - same as Tier1
   * @param {Object} tireParams - same as Tier2
   * @param {Object} advancedParams
   *   Corner weights: fl_weight, fr_weight, rl_weight, rr_weight (kg)
   *   Aero: speed_kmh, front_downforce_coeff (CzF), rear_downforce_coeff (CzR), frontal_area (m²)
   *   Damper: front_bump_force, front_rebound_force, rear_bump_force, rear_rebound_force (kgf)
   *   Geometry: front_camber_deg, rear_camber_deg, front_toe_deg, rear_toe_deg
   *   Bump rubber: front_bump_rubber_engaged, rear_bump_rubber_engaged, front_bump_rubber_rate, rear_bump_rubber_rate (N/mm)
   */
  constructor(params, tireParams, advancedParams) {
    this.params = params;
    this.tireParams = tireParams;
    this.ap = advancedParams;
  }

  /** Downforce in N at given speed. */
  aeroLoad(cz, speedKmh, frontalArea) {
    const v = speedKmh / 3.6; // m/s
    return 0.5 * RHO_AIR * Math.pow(v, 2) * frontalArea * cz;
  }

  /**
   * Grip multiplier from camber angle.
   * Optimal negative camber ~3° for racing tires.
   */
  camberGripFactor(camberDeg) {
    const optimal = 3.0;
    const delta = Math.abs(Math.abs(camberDeg) - optimal);
    return Math.max(0.9, 1.0 - 0.02 * delta);
  }

  /**
   * Toe effect on effective cornering stiffness.
   * Front: toe-out reduces understeer. Rear: toe-in reduces oversteer.
   * Returns an understeer shift value (positive = more understeer).
   */
  toeStabilityFactor(toeDeg, isFront) {
    if (isFront) {
      return -toeDeg * 1.5;
    } else {
      return toeDeg * 1.5;
    }
  }

  calculate() {
    const ap = this.ap;

    // Get Tier 2 result
    const t2 = new Tier2TireAware(this.params, this.tireParams).calculate();

    // === Corner Weight Analysis ===
    const flW = ap.fl_weight ?? 0;
    const frW = ap.fr_weight ?? 0;
    const rlW = ap.rl_weight ?? 0;
    const rrW = ap.rr_weight ?? 0;
    const totalW = flW + frW + rlW + rrW;

    let cornerWeightInfo = null;
    let crossDeviation = 0;
    let cwWarning = null;

    if (totalW > 0) {
      const frontW = flW + frW;
      const rearW = rlW + rrW;
      const crossW = flW + rrW;
      const crossPct = crossW / totalW * 100;
      crossDeviation = Math.abs(crossPct - 50);
      const leftW = flW + rlW;
      const rightW = frW + rrW;
      const lrImbalance = Math.abs(leftW - rightW) / totalW * 100;

      cornerWeightInfo = {
        total: roundN(totalW, 1),
        front: roundN(frontW, 1),
        rear: roundN(rearW, 1),
        front_pct: roundN(frontW / totalW * 100, 1),
        cross_weight_pct: roundN(crossPct, 1),
        cross_deviation: roundN(crossDeviation, 1),
        lr_imbalance_pct: roundN(lrImbalance, 1),
        fl: flW, fr: frW, rl: rlW, rr: rrW,
      };

      if (crossDeviation > 1.0) {
        if (crossPct > 50) {
          cwWarning = 'Cross weight ' + crossPct.toFixed(1) + '%: 右彎較穩定，左彎偏轉向過度';
        } else {
          cwWarning = 'Cross weight ' + crossPct.toFixed(1) + '%: 左彎較穩定，右彎偏轉向過度';
        }
      }
    }

    // === Aero Effect ===
    const speed = ap.speed_kmh ?? 0;
    const czf = ap.front_downforce_coeff ?? 0;
    const czr = ap.rear_downforce_coeff ?? 0;
    const area = ap.frontal_area ?? 1.5;

    const frontDfN = this.aeroLoad(czf, speed, area);
    const rearDfN = this.aeroLoad(czr, speed, area);
    const frontDfKg = frontDfN / G;
    const rearDfKg = rearDfN / G;

    const totalDf = frontDfKg + rearDfKg;
    const aeroBalanceFront = totalDf > 0 ? (frontDfKg / totalDf * 100) : 50;

    let effectiveFrontPct, aeroUsShift;
    if (totalW > 0 && totalDf > 0) {
      const frontW = flW + frW;
      effectiveFrontPct = (frontW + frontDfKg) / (totalW + totalDf) * 100;
      aeroUsShift = effectiveFrontPct - (frontW / totalW * 100);
    } else {
      effectiveFrontPct = t2.weight_front_pct ?? 50;
      aeroUsShift = 0;
    }

    const aeroInfo = {
      speed_kmh: speed,
      front_downforce_kg: roundN(frontDfKg, 1),
      rear_downforce_kg: roundN(rearDfKg, 1),
      total_downforce_kg: roundN(totalDf, 1),
      aero_balance_front_pct: roundN(aeroBalanceFront, 1),
      effective_weight_front_pct: roundN(effectiveFrontPct, 1),
      aero_us_shift: roundN(aeroUsShift, 2),
    };

    // === Damper Effect ===
    const fBump = ap.front_bump_force ?? 0;
    const fRebound = ap.front_rebound_force ?? 0;
    const rBump = ap.rear_bump_force ?? 0;
    const rRebound = ap.rear_rebound_force ?? 0;

    const damperInfo = {
      front_bump: fBump,
      front_rebound: fRebound,
      rear_bump: rBump,
      rear_rebound: rRebound,
    };

    let damperRatioBump, damperUsShiftEntry;
    if (fBump + rBump > 0) {
      damperRatioBump = fBump / (fBump + rBump) * 100;
      damperUsShiftEntry = (damperRatioBump - 50) * 0.1;
    } else {
      damperRatioBump = 50;
      damperUsShiftEntry = 0;
    }

    let damperRatioRebound, damperUsShiftExit;
    if (fRebound + rRebound > 0) {
      damperRatioRebound = fRebound / (fRebound + rRebound) * 100;
      damperUsShiftExit = (damperRatioRebound - 50) * 0.1;
    } else {
      damperRatioRebound = 50;
      damperUsShiftExit = 0;
    }

    damperInfo.bump_ratio_front_pct = roundN(damperRatioBump, 1);
    damperInfo.rebound_ratio_front_pct = roundN(damperRatioRebound, 1);
    damperInfo.entry_us_shift = roundN(damperUsShiftEntry, 2);
    damperInfo.exit_us_shift = roundN(damperUsShiftExit, 2);

    // === Damping Ratio ===
    const fWrEff = t2.front_wheel_rate_effective ?? t2.front_wheel_rate ?? 0;
    const rWrEff = t2.rear_wheel_rate_effective ?? t2.rear_wheel_rate ?? 0;
    const totalWeightT3 = this.params.total_weight ?? 1000;
    const wFrontPctT3 = this.params.weight_front_pct ?? 50;
    const sprungMassFrontT3 = (totalWeightT3 * wFrontPctT3 / 100) / 2;
    const sprungMassRearT3 = (totalWeightT3 * (100 - wFrontPctT3) / 100) / 2;

    // c = average damper force converted from kgf to Ns/m (approximate)
    const fDampC = ((fBump + fRebound) / 2) * G; // kgf -> N (simplified)
    const rDampC = ((rBump + rRebound) / 2) * G;
    const fDampK = fWrEff * 1000; // N/mm -> N/m
    const rDampK = rWrEff * 1000;

    let dampingRatioFront = 0, dampingRatioRear = 0;
    if (fDampK > 0 && sprungMassFrontT3 > 0) {
      dampingRatioFront = fDampC / (2 * Math.sqrt(fDampK * sprungMassFrontT3));
    }
    if (rDampK > 0 && sprungMassRearT3 > 0) {
      dampingRatioRear = rDampC / (2 * Math.sqrt(rDampK * sprungMassRearT3));
    }

    function dampingCategory(z) {
      if (z < 0.3) return 'underdamped';
      if (z < 0.5) return 'street';
      if (z < 0.8) return 'track';
      return 'race';
    }

    // Roll damping ratio
    const cgHeightT3 = (this.params.cg_height ?? 300) / 1000;
    const rollMOI = 0.5 * totalWeightT3 * Math.pow(cgHeightT3, 2);
    const totalRsNmRad = (t2.total_roll_stiffness ?? 0) * 180 / Math.PI;
    const critRollDamping = (totalRsNmRad > 0 && rollMOI > 0) ? Math.sqrt(totalRsNmRad * rollMOI) : 0;
    const fTrack = (this.params.front_track ?? 1500) / 1000;
    const rTrack = (this.params.rear_track ?? 1500) / 1000;
    const actualRollDamping = (fDampC * Math.pow(fTrack / 2, 2) + rDampC * Math.pow(rTrack / 2, 2)) * Math.PI / 180;
    const rollDampingRatio = critRollDamping > 0 ? actualRollDamping / (2 * critRollDamping) : 0;

    const dampingInfo = {
      front_ratio: roundN(dampingRatioFront, 3),
      rear_ratio: roundN(dampingRatioRear, 3),
      front_category: dampingCategory(dampingRatioFront),
      rear_category: dampingCategory(dampingRatioRear),
      roll_damping_ratio: roundN(rollDampingRatio, 3),
    };

    // === Longitudinal Weight Transfer ===
    const brakingG = ap.braking_g ?? 0;
    const accelG = ap.accel_g ?? 0;
    const wheelbaseM = (this.params.wheelbase ?? 2700) / 1000;
    const longTransfer = {};

    if (brakingG > 0) {
      const dFzBrake = totalWeightT3 * brakingG * cgHeightT3 / wheelbaseM;
      const frontUnderBrake = (totalWeightT3 * wFrontPctT3 / 100) + dFzBrake;
      const rearUnderBrake = (totalWeightT3 * (100 - wFrontPctT3) / 100) - dFzBrake;
      longTransfer.braking = {
        transfer_kg: roundN(dFzBrake, 1),
        front_pct: roundN(frontUnderBrake / totalWeightT3 * 100, 1),
        rear_pct: roundN(rearUnderBrake / totalWeightT3 * 100, 1),
      };
    }
    if (accelG > 0) {
      const dFzAccel = totalWeightT3 * accelG * cgHeightT3 / wheelbaseM;
      const frontUnderAccel = (totalWeightT3 * wFrontPctT3 / 100) - dFzAccel;
      const rearUnderAccel = (totalWeightT3 * (100 - wFrontPctT3) / 100) + dFzAccel;
      longTransfer.acceleration = {
        transfer_kg: roundN(dFzAccel, 1),
        front_pct: roundN(frontUnderAccel / totalWeightT3 * 100, 1),
        rear_pct: roundN(rearUnderAccel / totalWeightT3 * 100, 1),
      };
    }

    // === Slip Angle & Yaw Dynamics ===
    const mFT3 = totalWeightT3 * wFrontPctT3 / 100;
    const mRT3 = totalWeightT3 * (100 - wFrontPctT3) / 100;
    // Cornering stiffness estimate (N/deg) ≈ load * 0.12
    const cAlphaF = mFT3 * G * 0.12;
    const cAlphaR = mRT3 * G * 0.12;
    const slipAngleFront = cAlphaF > 0 ? (mFT3 * G / cAlphaF) * (180 / Math.PI) : 0;
    const slipAngleRear = cAlphaR > 0 ? (mRT3 * G / cAlphaR) * (180 / Math.PI) : 0;

    // Characteristic speed (understeer only, K_us > 0)
    const usGradRad = (t2.understeer_gradient ?? 0) * Math.PI / 180; // deg -> rad
    let charSpeed = 0;
    if (usGradRad > 0) {
      charSpeed = Math.sqrt(G * wheelbaseM / usGradRad) * 3.6; // m/s -> km/h
    }

    // Yaw gain at reference speed (100 km/h)
    const refSpeedMs = 100 / 3.6;
    let yawGain = 0;
    if (wheelbaseM > 0) {
      const kUsVal = usGradRad;
      yawGain = refSpeedMs / (wheelbaseM * (1 + kUsVal * Math.pow(refSpeedMs, 2) / G));
    }

    const dynamicsInfo = {
      slip_angle_front_deg: roundN(slipAngleFront, 2),
      slip_angle_rear_deg: roundN(slipAngleRear, 2),
      first_saturates: slipAngleFront > slipAngleRear ? 'front' : 'rear',
      characteristic_speed_kmh: charSpeed > 0 ? roundN(charSpeed, 0) : null,
      yaw_gain_at_100kmh: roundN(yawGain, 3),
    };

    // === Camber & Toe ===
    const fCamber = ap.front_camber_deg ?? -3.0;
    const rCamber = ap.rear_camber_deg ?? -2.0;
    const fToe = ap.front_toe_deg ?? 0;
    const rToe = ap.rear_toe_deg ?? 0;

    const fCamberGrip = this.camberGripFactor(fCamber);
    const rCamberGrip = this.camberGripFactor(rCamber);
    const camberUsShift = -(fCamberGrip - rCamberGrip) * 20;

    const toeUsShift = this.toeStabilityFactor(fToe, true) + this.toeStabilityFactor(rToe, false);

    const geometryInfo = {
      front_camber: fCamber,
      rear_camber: rCamber,
      front_toe: fToe,
      rear_toe: rToe,
      camber_grip_front: roundN(fCamberGrip, 3),
      camber_grip_rear: roundN(rCamberGrip, 3),
      camber_us_shift: roundN(camberUsShift, 2),
      toe_us_shift: roundN(toeUsShift, 2),
    };

    // === Bump Rubber Effect ===
    let brInfo = {};
    let brUsShift = 0;
    if (ap.front_bump_rubber_engaged || ap.rear_bump_rubber_engaged) {
      const fBrRate = ap.front_bump_rubber_engaged ? (ap.front_bump_rubber_rate ?? 0) : 0;
      const rBrRate = ap.rear_bump_rubber_engaged ? (ap.rear_bump_rubber_rate ?? 0) : 0;
      if (fBrRate + rBrRate > 0) {
        const brRatioFront = fBrRate / (fBrRate + rBrRate) * 100;
        brUsShift = (brRatioFront - 50) * 0.3;
      }
      brInfo = {
        front_rate: fBrRate,
        rear_rate: rBrRate,
        us_shift: roundN(brUsShift, 2),
      };
    }

    // === Combined Result ===
    const mechanicalUs = t2.understeer_gradient;
    const tireUs = t2.tire_us_shift ?? 0;
    const totalUsSteady = mechanicalUs + tireUs + aeroUsShift + camberUsShift + toeUsShift + brUsShift;
    const totalUsEntry = totalUsSteady + damperUsShiftEntry;
    const totalUsExit = totalUsSteady + damperUsShiftExit;

    function tendencyLabel(usVal) {
      if (usVal > 3) return ['Understeer', '轉向不足'];
      if (usVal < -3) return ['Oversteer', '轉向過度'];
      return ['Neutral', '中性'];
    }

    const steadyT = tendencyLabel(totalUsSteady);
    const entryT = tendencyLabel(totalUsEntry);
    const exitT = tendencyLabel(totalUsExit);

    // Compile all warnings
    const allWarnings = [...(t2.warnings || [])];
    if (cwWarning) allWarnings.push(cwWarning);
    if (crossDeviation > 2) {
      allWarnings.push('Cross weight 偏差 ' + crossDeviation.toFixed(1) + '%，建議調整配重');
    }
    if (speed > 100 && totalDf < 50) {
      allWarnings.push('高速但下壓力不足，注意穩定性');
    }

    return {
      tier: 3,
      // Include tier 1 & 2 mechanical results
      mechanical: {
        roll_stiffness_front: t2.front_roll_stiffness_total,
        roll_stiffness_rear: t2.rear_roll_stiffness_total,
        roll_stiffness_dist_front: t2.roll_stiffness_dist_front,
        roll_gradient: t2.roll_gradient_deg_per_g,
        lltd_front: t2.lltd_front,
        weight_front_pct: t2.weight_front_pct,
        mechanical_us: roundN(mechanicalUs, 2),
        front_wheel_rate_effective: t2.front_wheel_rate_effective,
        rear_wheel_rate_effective: t2.rear_wheel_rate_effective,
        ride_frequency: t2.ride_frequency,
        lltd_decomposed: t2.lltd_decomposed,
      },
      tire: t2.tire_grip || {},
      tire_us_shift: roundN(tireUs, 2),
      corner_weight: cornerWeightInfo,
      aero: aeroInfo,
      damper: damperInfo,
      geometry: geometryInfo,
      bump_rubber: brInfo,
      damping: dampingInfo,
      longitudinal_transfer: longTransfer,
      dynamics: dynamicsInfo,
      load_sensitivity: t2.load_sensitivity || {},
      // Final combined predictions
      prediction: {
        steady_state: {
          understeer_gradient: roundN(totalUsSteady, 2),
          normalized: roundN(Math.max(-1, Math.min(1, totalUsSteady / 15)), 3),
          tendency: steadyT[0],
          tendency_zh: steadyT[1],
        },
        turn_entry: {
          understeer_gradient: roundN(totalUsEntry, 2),
          normalized: roundN(Math.max(-1, Math.min(1, totalUsEntry / 15)), 3),
          tendency: entryT[0],
          tendency_zh: entryT[1],
        },
        turn_exit: {
          understeer_gradient: roundN(totalUsExit, 2),
          normalized: roundN(Math.max(-1, Math.min(1, totalUsExit / 15)), 3),
          tendency: exitT[0],
          tendency_zh: exitT[1],
        },
      },
      // Contribution breakdown (for stacked bar chart)
      contribution: {
        mechanical: roundN(mechanicalUs, 2),
        tire: roundN(tireUs, 2),
        aero: roundN(aeroUsShift, 2),
        camber: roundN(camberUsShift, 2),
        toe: roundN(toeUsShift, 2),
        bump_rubber: roundN(brUsShift, 2),
        damper_entry: roundN(damperUsShiftEntry, 2),
        damper_exit: roundN(damperUsShiftExit, 2),
      },
      warnings: allWarnings,
    };
  }
}


// ============================================================
// Baseline Comparison: 歸零校正
// ============================================================
function compareWithBaseline(tier, baselineInputs, currentInputs) {
  /**
   * Compare baseline and current setups, output delta metrics.
   *
   * tier: 1, 2, or 3
   * baselineInputs / currentInputs: object with keys matching each tier's needs
   *   tier 1: {params: {...}}
   *   tier 2: {params: {...}, tire_params: {...}}
   *   tier 3: {params: {...}, tire_params: {...}, advanced_params: {...}}
   */
  function runTier(inputs) {
    if (tier === 1) {
      return new Tier1BasicBalance(inputs.params).calculate();
    } else if (tier === 2) {
      return new Tier2TireAware(inputs.params, inputs.tire_params).calculate();
    } else {
      return new Tier3Complete(inputs.params, inputs.tire_params, inputs.advanced_params).calculate();
    }
  }

  const b = runTier(baselineInputs);
  const c = runTier(currentInputs);

  // Extract the "main" understeer gradient for each tier
  function getUs(result, t) {
    if (t === 3 && result.prediction) {
      return result.prediction.steady_state.understeer_gradient;
    }
    if (t === 2) {
      return result.adjusted_understeer_gradient ?? result.understeer_gradient ?? 0;
    }
    return result.understeer_gradient ?? 0;
  }

  function getNorm(result, t) {
    if (t === 3 && result.prediction) {
      return result.prediction.steady_state.normalized;
    }
    if (t === 2) {
      return result.adjusted_normalized ?? result.understeer_normalized ?? 0;
    }
    return result.understeer_normalized ?? 0;
  }

  const bUs = getUs(b, tier);
  const cUs = getUs(c, tier);
  const deltaUs = roundN(cUs - bUs, 3);

  const bNorm = getNorm(b, tier);
  const cNorm = getNorm(c, tier);
  const deltaNorm = roundN(cNorm - bNorm, 3);

  // Relative normalized
  const relNorm = roundN(Math.max(-1.0, Math.min(1.0, deltaUs / 10.0)), 3);

  // Tendency label for the delta
  let deltaTendency, deltaTendencyZh;
  if (deltaUs > 1.5) {
    deltaTendency = 'more_understeer';
    deltaTendencyZh = '比基準更轉向不足';
  } else if (deltaUs < -1.5) {
    deltaTendency = 'more_oversteer';
    deltaTendencyZh = '比基準更轉向過度';
  } else {
    deltaTendency = 'similar';
    deltaTendencyZh = '與基準相近';
  }

  const delta = {
    understeer_gradient: deltaUs,
    normalized: deltaNorm,
    relative_normalized: relNorm,
    tendency: deltaTendency,
    tendency_zh: deltaTendencyZh,
  };

  // Roll stiffness delta
  const bRsd = b.roll_stiffness_dist_front ?? (b.mechanical ? b.mechanical.roll_stiffness_dist_front : null);
  const cRsd = c.roll_stiffness_dist_front ?? (c.mechanical ? c.mechanical.roll_stiffness_dist_front : null);
  if (bRsd != null && cRsd != null) {
    delta.roll_stiffness_dist_front = roundN(cRsd - bRsd, 2);
  }

  // Ride frequency delta (available in all tiers)
  const bRf = b.ride_frequency ?? (b.mechanical ? b.mechanical.ride_frequency : null);
  const cRf = c.ride_frequency ?? (c.mechanical ? c.mechanical.ride_frequency : null);
  if (bRf && cRf) {
    delta.ride_frequency = {
      front_hz: roundN(cRf.front_hz - bRf.front_hz, 2),
      rear_hz: roundN(cRf.rear_hz - bRf.rear_hz, 2),
    };
  }

  // Tier 2+: tire grip delta
  if (tier >= 2) {
    let bTire = tier === 3 ? (b.tire || {}) : (b.tire_grip || {});
    let cTire = tier === 3 ? (c.tire || {}) : (c.tire_grip || {});
    for (const corner of ['fl', 'fr', 'rl', 'rr', 'front_avg', 'rear_avg']) {
      const bv = bTire[corner];
      const cv = cTire[corner];
      if (bv != null && cv != null) {
        delta['tire_grip_' + corner] = roundN(cv - bv, 4);
      }
    }
  }

  // Tier 3: entry/exit delta
  if (tier === 3 && b.prediction && c.prediction) {
    for (const phase of ['turn_entry', 'turn_exit']) {
      const bPhase = b.prediction[phase].understeer_gradient;
      const cPhase = c.prediction[phase].understeer_gradient;
      const d = roundN(cPhase - bPhase, 3);
      delta[phase + '_delta'] = d;
      if (d > 1.5) {
        delta[phase + '_tendency_zh'] = '比基準更轉向不足';
      } else if (d < -1.5) {
        delta[phase + '_tendency_zh'] = '比基準更轉向過度';
      } else {
        delta[phase + '_tendency_zh'] = '與基準相近';
      }
    }

    // Contribution delta
    const bCont = b.contribution || {};
    const cCont = c.contribution || {};
    const contDelta = {};
    for (const k of ['mechanical', 'tire', 'aero', 'camber', 'toe', 'bump_rubber', 'damper_entry', 'damper_exit']) {
      contDelta[k] = roundN((cCont[k] ?? 0) - (bCont[k] ?? 0), 3);
    }
    delta.contribution = contDelta;

    // Damping ratio delta
    if (b.damping && c.damping) {
      delta.damping = {
        front_ratio: roundN(c.damping.front_ratio - b.damping.front_ratio, 3),
        rear_ratio: roundN(c.damping.rear_ratio - b.damping.rear_ratio, 3),
        roll_damping_ratio: roundN(c.damping.roll_damping_ratio - b.damping.roll_damping_ratio, 3),
      };
    }

    // Dynamics delta
    if (b.dynamics && c.dynamics) {
      delta.dynamics = {
        slip_angle_front: roundN(c.dynamics.slip_angle_front_deg - b.dynamics.slip_angle_front_deg, 2),
        slip_angle_rear: roundN(c.dynamics.slip_angle_rear_deg - b.dynamics.slip_angle_rear_deg, 2),
        yaw_gain: roundN(c.dynamics.yaw_gain_at_100kmh - b.dynamics.yaw_gain_at_100kmh, 3),
      };
    }
  }

  return {
    baseline: b,
    current: c,
    delta: delta,
  };
}


// ============================================================
// Setup Advisor — 調校建議引擎
// 14 條規則，根據計算結果產生優先級建議
// ============================================================
class SetupAdvisor {

  /**
   * Analyze a prediction result and generate setup suggestions.
   * @param {Object} result - Output from any Tier's calculate()
   * @param {number} tier - 1, 2, or 3
   * @param {Object} params - Original input params (pred object)
   * @param {Object} [advParams] - Advanced params (Tier 3 adv object)
   * @returns {{ suggestions: Array<{priority,category,category_zh,message,suggestion,values}>, summary: {high,medium,low,total} }}
   */
  static analyze(result, tier, params, advParams) {
    if (!result) return { suggestions: [], summary: { high: 0, medium: 0, low: 0, total: 0 } };

    const suggestions = [];
    const add = (priority, category, categoryZh, message, suggestion, values) => {
      suggestions.push({ priority, category, category_zh: categoryZh, message, suggestion: suggestion || '', values: values || {} });
    };

    // ── Rule 1: Ride Frequency ratio out of flat-ride range ──
    const rf = result.ride_frequency || (result.mechanical?.ride_frequency);
    if (rf && rf.front_hz > 0 && rf.rear_hz > 0) {
      // ratio = rear/front in our model
      const ratio = rf.ratio;
      if (ratio < 0.80 || ratio > 1.0) {
        const pri = (ratio < 0.75 || ratio > 1.05) ? 'high' : 'medium';
        const targetRatio = 0.90;
        const targetFrontHz = rf.rear_hz / targetRatio;
        // Reverse-calculate required spring rate
        const fMr = params.front_motion_ratio ?? 1.0;
        const tireK = params.tire_spring_rate ?? 220;
        const wFrontPct = params.weight_front_pct ?? 50;
        const totalWeight = params.total_weight ?? 1000;
        const mCorner = (totalWeight * wFrontPct / 100) / 2;
        const kWheelNeeded = Math.pow(2 * Math.PI * targetFrontHz, 2) * mCorner / 1000;
        // Subtract tire compliance: k_spring_wheel = 1/(1/kWheelNeeded - 1/tireK)
        let targetSpring = kWheelNeeded;
        if (tireK > kWheelNeeded) {
          const kSpringWheel = 1.0 / (1.0 / kWheelNeeded - 1.0 / tireK);
          targetSpring = kSpringWheel / Math.pow(fMr, 2);
        }
        add(pri, 'spring', '彈簧',
          `前後 Ride Frequency 比值 ${roundN(ratio, 2)} 偏離 Flat Ride 範圍 (0.85-0.95)。前 ${roundN(rf.front_hz, 1)} Hz / 後 ${roundN(rf.rear_hz, 1)} Hz`,
          `建議前彈簧率調整為 ${roundN(targetSpring, 0)} N/mm（目前 ${params.front_spring_rate} N/mm），可達到比值 ${targetRatio}`,
          { target_front_spring: roundN(targetSpring, 1), target_ratio: targetRatio, target_front_hz: roundN(targetFrontHz, 2) }
        );
      }
    }

    // ── Rule 2: Ride Frequency too low for track use ──
    if (rf && rf.front_hz > 0 && rf.rear_hz > 0) {
      const minHz = Math.min(rf.front_hz, rf.rear_hz);
      if (minHz < 2.0) {
        const pri = minHz < 1.5 ? 'high' : 'medium';
        const axle = rf.front_hz < rf.rear_hz ? '前' : '後';
        const axleHz = Math.min(rf.front_hz, rf.rear_hz);
        add(pri, 'spring', '彈簧',
          `${axle}軸 Ride Frequency ${roundN(axleHz, 2)} Hz 偏低，賽道使用建議 2.0-3.5 Hz`,
          `提高${axle}彈簧率可增加頻率。使用「彈簧計算器」可精確計算所需彈簧率`,
          { low_axis: axle, current_hz: roundN(axleHz, 2), target_hz: 2.5 }
        );
      }
    }

    // ── Rule 3: Ride Frequency too high (too stiff) ──
    if (rf) {
      if (rf.front_hz > 4.0) {
        add('medium', 'spring', '彈簧',
          `前軸 Ride Frequency ${roundN(rf.front_hz, 2)} Hz 偏高（> 4.0 Hz），可能影響機械抓地力`,
          '考慮降低前彈簧率或使用較軟的輪胎', {});
      }
      if (rf.rear_hz > 4.0) {
        add('medium', 'spring', '彈簧',
          `後軸 Ride Frequency ${roundN(rf.rear_hz, 2)} Hz 偏高（> 4.0 Hz），可能影響機械抓地力`,
          '考慮降低後彈簧率或使用較軟的輪胎', {});
      }
    }

    // ── Rule 4: LLTD vs weight distribution mismatch ──
    const lltdF = result.lltd_front ?? (result.mechanical?.lltd_front);
    const wFPct = result.weight_front_pct ?? (result.mechanical?.weight_front_pct);
    if (lltdF != null && wFPct != null) {
      const diff = Math.abs(lltdF - wFPct);
      if (diff > 8) {
        const pri = diff > 12 ? 'high' : 'medium';
        const direction = lltdF > wFPct ? '轉向不足' : '轉向過度';
        const fix = lltdF > wFPct
          ? '降低前 ARB 或增加後 ARB 剛性'
          : '增加前 ARB 或降低後 ARB 剛性';
        add(pri, 'arb', '防傾桿',
          `LLTD ${roundN(lltdF, 1)}% vs 重量分佈 ${roundN(wFPct, 1)}%，差距 ${roundN(diff, 1)}% — ${direction}傾向明顯`,
          fix,
          { lltd: roundN(lltdF, 1), weight_pct: roundN(wFPct, 1), diff: roundN(diff, 1) }
        );
      }
    }

    // ── Rule 5: Roll Gradient too high ──
    const rollGrad = result.roll_gradient_deg_per_g ?? (result.mechanical?.roll_gradient);
    if (rollGrad != null && rollGrad > 3.0) {
      const pri = rollGrad > 5.0 ? 'high' : 'medium';
      add(pri, 'arb', '防傾桿',
        `Roll Gradient ${roundN(rollGrad, 2)}°/g 偏大，賽道建議 < 2.0°/g`,
        '增加 ARB 剛性或提高彈簧率可減小側傾',
        { roll_gradient: roundN(rollGrad, 2) }
      );
    }

    // ── Rule 6: Geometric load transfer is high proportion ──
    const lltdDec = result.lltd_decomposed || (result.mechanical?.lltd_decomposed);
    if (lltdDec && lltdDec.geometric_pct_of_total > 40) {
      add('low', 'geometry', '幾何',
        `幾何荷重轉移佔總荷重轉移的 ${roundN(lltdDec.geometric_pct_of_total, 1)}%（Roll Center 較高）`,
        '過渡反應較快但彈簧/ARB 可調範圍較小。如需更大調整空間，可考慮降低 Roll Center 高度',
        { geo_pct: roundN(lltdDec.geometric_pct_of_total, 1) }
      );
    }

    // ── Rule 7: Damping ratio too low (Tier 3 only) ──
    if (tier === 3 && result.damping) {
      const dF = result.damping.front_ratio;
      const dR = result.damping.rear_ratio;
      const minD = Math.min(dF, dR);
      if (minD < 0.3) {
        const pri = minD < 0.2 ? 'high' : 'medium';
        const axle = dF < dR ? '前' : '後';
        const val = dF < dR ? dF : dR;
        // Calculate target damper force for ζ=0.5
        const totalWeight = params.total_weight ?? 1000;
        const wFPctLocal = params.weight_front_pct ?? 50;
        const effWr = axle === '前'
          ? (result.mechanical?.front_wheel_rate_effective ?? result.front_wheel_rate_effective ?? 50)
          : (result.mechanical?.rear_wheel_rate_effective ?? result.rear_wheel_rate_effective ?? 50);
        const mCorner = axle === '前'
          ? (totalWeight * wFPctLocal / 100) / 2
          : (totalWeight * (100 - wFPctLocal) / 100) / 2;
        const targetZeta = 0.5;
        const targetC_N = targetZeta * 2 * Math.sqrt(effWr * 1000 * mCorner);
        const targetC_kgf = targetC_N / G;
        add(pri, 'damper', '阻尼',
          `${axle}軸阻尼比 ${roundN(val, 2)}（${val < 0.2 ? '嚴重欠阻尼' : '欠阻尼'}），車身回彈過多`,
          `建議${axle}軸平均阻尼力增加到 ~${roundN(targetC_kgf, 0)} kgf（目標 ζ=${targetZeta}）`,
          { axis: axle, current_ratio: roundN(val, 2), target_kgf: roundN(targetC_kgf, 0), target_zeta: targetZeta }
        );
      }
    }

    // ── Rule 8: Front/rear damping ratio mismatch ──
    if (tier === 3 && result.damping) {
      const diff = Math.abs(result.damping.front_ratio - result.damping.rear_ratio);
      if (diff > 0.25) {
        add('medium', 'damper', '阻尼',
          `前後阻尼比差距 ${roundN(diff, 2)}（前 ${roundN(result.damping.front_ratio, 2)} / 後 ${roundN(result.damping.rear_ratio, 2)}），可能造成 pitch 振盪`,
          '建議前後阻尼比保持在 0.2 以內的差距',
          { front_ratio: roundN(result.damping.front_ratio, 2), rear_ratio: roundN(result.damping.rear_ratio, 2), diff: roundN(diff, 2) }
        );
      }
    }

    // ── Rule 9: Front/rear grip imbalance (Tier 2+) ──
    if (tier >= 2 && result.tire_grip) {
      const gr = result.tire_grip.grip_ratio_f_r;
      if (gr != null && Math.abs(gr - 1.0) > 0.08) {
        const pri = Math.abs(gr - 1.0) > 0.15 ? 'high' : 'medium';
        const weak = gr < 1.0 ? '前' : '後';
        add(pri, 'tire', '輪胎',
          `前後抓地力比 ${roundN(gr, 3)}，${weak}軸抓地力相對不足`,
          `調整${weak}軸胎壓（偏離最佳值會降低抓地力）或更換胎種`,
          { grip_ratio: roundN(gr, 3), weak_axis: weak }
        );
      }
    }

    // ── Rule 10: Tire not in operating window (Tier 2+) ──
    if (tier >= 2 && result.tire_grip) {
      const tg = result.tire_grip;
      const corners = [
        { name: '左前', val: tg.fl }, { name: '右前', val: tg.fr },
        { name: '左後', val: tg.rl }, { name: '右後', val: tg.rr },
      ];
      for (const c of corners) {
        if (c.val != null && c.val < 0.85) {
          const pri = c.val < 0.75 ? 'high' : 'medium';
          add(pri, 'tire', '輪胎',
            `${c.name} 抓地力僅 ${roundN(c.val * 100, 0)}%，輪胎可能不在工作溫度或壓力範圍`,
            '確認胎溫和胎壓是否在該輪胎的最佳區間',
            { corner: c.name, grip_pct: roundN(c.val * 100, 0) }
          );
        }
      }
    }

    // ── Rule 11: Aero balance mismatch (Tier 3) ──
    if (tier === 3 && result.aero) {
      const aeroF = result.aero.aero_balance_front_pct;
      const mechWF = result.mechanical?.weight_front_pct ?? wFPct;
      if (aeroF != null && mechWF != null) {
        const diff = Math.abs(aeroF - mechWF);
        if (diff > 10) {
          add('medium', 'aero', '空力',
            `空力平衡 ${roundN(aeroF, 1)}% vs 重量分佈 ${roundN(mechWF, 1)}%，差距 ${roundN(diff, 1)}%`,
            '高速時轉向特性會與低速不同。調整前後下壓力係數可改善',
            { aero_balance: roundN(aeroF, 1), weight_pct: roundN(mechWF, 1) }
          );
        }
      }
    }

    // ── Rule 12: Cross Weight deviation (Tier 3) ──
    if (tier === 3 && result.corner_weight) {
      const dev = result.corner_weight.cross_deviation;
      if (dev != null && dev > 1.5) {
        const pri = dev > 2.5 ? 'high' : 'medium';
        add(pri, 'weight', '重量',
          `Cross Weight 偏差 ${roundN(dev, 1)}%（${roundN(result.corner_weight.cross_weight_pct, 1)}%），車輛左右不對稱`,
          '調整角落重量（墊片、彈簧預載）使 Cross Weight 趨近 50%',
          { cross_deviation: roundN(dev, 1), cross_weight_pct: roundN(result.corner_weight.cross_weight_pct, 1) }
        );
      }
    }

    // ── Rule 13: Camber deviation (Tier 3) ──
    if (tier === 3 && result.geometry) {
      const fc = result.geometry.front_camber;
      const rc = result.geometry.rear_camber;
      const fOff = Math.abs(Math.abs(fc) - 3.0);
      const rOff = Math.abs(Math.abs(rc) - 2.0);
      if (fOff > 1.5 || rOff > 1.0) {
        const details = [];
        if (fOff > 1.5) details.push(`前 Camber ${fc}° 偏離建議值 -3.0°`);
        if (rOff > 1.0) details.push(`後 Camber ${rc}° 偏離建議值 -2.0°`);
        add('low', 'geometry', '幾何',
          `Camber 設定偏離賽道建議值：${details.join('、')}`,
          '賽道使用建議前 -2.5°~-3.5°、後 -1.5°~-2.5°',
          { front_camber: fc, rear_camber: rc }
        );
      }
    }

    // ── Rule 14: Oversteer warning — no characteristic speed ──
    if (tier === 3 && result.prediction) {
      const usG = result.prediction.steady_state.understeer_gradient;
      if (usG < 0) {
        add('high', 'balance', '平衡',
          `車輛呈現轉向過度特性（US gradient = ${roundN(usG, 2)}）— 無特徵速度限制`,
          '高速時轉向增益持續上升，需要駕駛技術修正。增加前軸荷重轉移（前 ARB、前彈簧）可改善',
          { understeer_gradient: roundN(usG, 2) }
        );
      }
    } else if (tier < 3) {
      const usG = result.understeer_gradient ?? result.adjusted_understeer_gradient;
      if (usG != null && usG < -5) {
        add('high', 'balance', '平衡',
          `車輛呈現明顯轉向過度特性（US gradient = ${roundN(usG, 2)}）`,
          '增加前 ARB 或前彈簧率可增加前軸荷重轉移，改善平衡',
          { understeer_gradient: roundN(usG, 2) }
        );
      }
    }

    // Sort by priority: high → medium → low
    const priOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => (priOrder[a.priority] ?? 9) - (priOrder[b.priority] ?? 9));

    const summary = {
      high: suggestions.filter(s => s.priority === 'high').length,
      medium: suggestions.filter(s => s.priority === 'medium').length,
      low: suggestions.filter(s => s.priority === 'low').length,
      total: suggestions.length,
    };

    return { suggestions, summary };
  }
}


// ============================================================
// Spring Calculator — 彈簧計算器
// 頻率↔彈簧率互算、對照表、ARB sizing
// ============================================================
class SpringCalculator {

  /**
   * Calculate required spring rate from target ride frequency.
   * @param {number} targetHz - Target ride frequency in Hz
   * @param {number} cornerMass - Sprung mass per corner in kg
   * @param {number} motionRatio - Suspension motion ratio (default 1.0)
   * @param {number} tireSpringRate - Tire spring rate in N/mm (default 220)
   * @returns {{ spring_rate, wheel_rate, effective_wheel_rate, frequency_hz, category }}
   */
  static freqToSpring(targetHz, cornerMass, motionRatio, tireSpringRate) {
    const mr = motionRatio || 1.0;
    const tireK = tireSpringRate || 220;
    const m = cornerMass || 250;
    const f = targetHz || 2.0;

    // Required effective wheel rate: k_eff = (2πf)² × m / 1000  [N/mm]
    const kEff = Math.pow(2 * Math.PI * f, 2) * m / 1000;

    // Subtract tire compliance to get spring-only wheel rate
    // k_eff = 1/(1/k_tire + 1/k_wheel) → k_wheel = 1/(1/k_eff - 1/k_tire)
    let kWheel;
    if (tireK > kEff) {
      kWheel = 1.0 / (1.0 / kEff - 1.0 / tireK);
    } else {
      // Tire spring rate is too low — can't achieve this frequency
      kWheel = kEff * 10; // fallback: very stiff spring needed
    }

    // Reverse motion ratio: spring rate = wheel rate / MR²
    const springRate = kWheel / Math.pow(mr, 2);

    // Verify: compute actual frequency
    const actualKWheel = springRate * Math.pow(mr, 2);
    const actualKEff = 1.0 / (1.0 / tireK + 1.0 / actualKWheel);
    const actualHz = 1 / (2 * Math.PI) * Math.sqrt(actualKEff * 1000 / m);

    const cat = actualHz < 1.5 ? 'comfort' : actualHz < 2.5 ? 'street' : actualHz < 3.5 ? 'track' : 'race';

    return {
      spring_rate: roundN(springRate, 1),
      wheel_rate: roundN(actualKWheel, 1),
      effective_wheel_rate: roundN(actualKEff, 1),
      frequency_hz: roundN(actualHz, 2),
      category: cat,
    };
  }

  /**
   * Calculate ride frequency from spring rate.
   * @param {number} springRate - Spring rate in N/mm
   * @param {number} cornerMass - Sprung mass per corner in kg
   * @param {number} motionRatio - default 1.0
   * @param {number} tireSpringRate - default 220 N/mm
   * @returns {{ frequency_hz, wheel_rate, effective_wheel_rate, category }}
   */
  static springToFreq(springRate, cornerMass, motionRatio, tireSpringRate) {
    const mr = motionRatio || 1.0;
    const tireK = tireSpringRate || 220;
    const m = cornerMass || 250;
    const k = springRate || 50;

    const kWheel = k * Math.pow(mr, 2);
    const kEff = 1.0 / (1.0 / tireK + 1.0 / kWheel);
    const hz = 1 / (2 * Math.PI) * Math.sqrt(kEff * 1000 / m);
    const cat = hz < 1.5 ? 'comfort' : hz < 2.5 ? 'street' : hz < 3.5 ? 'track' : 'race';

    return {
      frequency_hz: roundN(hz, 2),
      wheel_rate: roundN(kWheel, 1),
      effective_wheel_rate: roundN(kEff, 1),
      category: cat,
    };
  }

  /**
   * Generate a spring rate ↔ frequency reference table.
   * @param {number} cornerMass
   * @param {number} motionRatio
   * @param {number} tireSpringRate
   * @param {number[]} [rates] - Spring rates to include (default common values)
   * @returns {Array<{spring_rate, wheel_rate, effective_wheel_rate, frequency_hz, category}>}
   */
  static springTable(cornerMass, motionRatio, tireSpringRate, rates) {
    const defaultRates = [20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200];
    const rateList = rates || defaultRates;
    return rateList.map(r => ({
      spring_rate: r,
      ...SpringCalculator.springToFreq(r, cornerMass, motionRatio, tireSpringRate),
    }));
  }

  /**
   * Calculate ARB stiffness needed for target roll gradient.
   * @param {number} totalWeight - kg
   * @param {number} cgHeight - mm
   * @param {number} targetRollGrad - target roll gradient in deg/g
   * @param {number} frontPct - front roll stiffness distribution target %
   * @param {number} existingSpringRollFront - existing spring roll stiffness front (Nm/deg)
   * @param {number} existingSpringRollRear - existing spring roll stiffness rear (Nm/deg)
   * @returns {{ total_roll_needed, front_roll_needed, rear_roll_needed, front_arb_needed, rear_arb_needed, current_roll_gradient }}
   */
  static arbSizing(totalWeight, cgHeight, targetRollGrad, frontPct, existingSpringRollFront, existingSpringRollRear) {
    const m = totalWeight || 1000;
    const h = (cgHeight || 300) / 1000; // to meters
    const target = targetRollGrad || 2.0;
    const fPct = frontPct || 55;

    // Current roll stiffness from springs
    const currentSpringTotal = (existingSpringRollFront || 0) + (existingSpringRollRear || 0);
    let currentRollGrad = 0;
    if (currentSpringTotal > 0) {
      currentRollGrad = (m * G * h) / (currentSpringTotal * Math.PI / 180);
    }

    // Required total roll stiffness for target gradient
    const totalNeeded = (m * G * h) / (target * Math.PI / 180);

    const frontNeeded = totalNeeded * fPct / 100;
    const rearNeeded = totalNeeded * (100 - fPct) / 100;

    const frontArbNeeded = Math.max(0, frontNeeded - (existingSpringRollFront || 0));
    const rearArbNeeded = Math.max(0, rearNeeded - (existingSpringRollRear || 0));

    return {
      total_roll_needed: roundN(totalNeeded, 0),
      front_roll_needed: roundN(frontNeeded, 0),
      rear_roll_needed: roundN(rearNeeded, 0),
      front_arb_needed: roundN(frontArbNeeded, 0),
      rear_arb_needed: roundN(rearArbNeeded, 0),
      current_roll_gradient: roundN(currentRollGrad, 2),
      current_spring_total: roundN(currentSpringTotal, 0),
    };
  }
}
