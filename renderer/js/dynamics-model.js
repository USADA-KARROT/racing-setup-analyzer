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

    // Roll stiffness from springs
    const fRsSpring = this.rollStiffnessSpring(fWr, p.front_track);
    const rRsSpring = this.rollStiffnessSpring(rWr, p.rear_track);

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

    // Roll gradient (deg/g)
    const totalWeight = p.total_weight ?? 1000;
    const cgHeight = (p.cg_height ?? 300) / 1000; // to meters
    let rollGradient = 0;
    if (totalRs > 0) {
      rollGradient = (totalWeight * G * cgHeight) / (totalRs * 180 / Math.PI);
    }

    // LLTD (Lateral Load Transfer Distribution)
    const lltdFront = rsDistFront;

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

  /** Combined grip factor from temperature, pressure, and width. */
  static effectiveGrip(tireTempC, pressureBar, compound = 'medium', optimalPressure = 1.90, tireWidthMm = 0) {
    const gTemp = TireModel.gripFactorTemperature(tireTempC, compound);
    const gPres = TireModel.gripFactorPressure(pressureBar, optimalPressure);
    const gWidth = tireWidthMm > 0 ? TireModel.gripFactorWidth(tireWidthMm) : 1.0;
    return roundN(gTemp * gPres * gWidth, 4);
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
      },
      tire: t2.tire_grip || {},
      tire_us_shift: roundN(tireUs, 2),
      corner_weight: cornerWeightInfo,
      aero: aeroInfo,
      damper: damperInfo,
      geometry: geometryInfo,
      bump_rubber: brInfo,
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
  }

  return {
    baseline: b,
    current: c,
    delta: delta,
  };
}
