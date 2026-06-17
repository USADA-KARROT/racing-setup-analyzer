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
// Handling-balance scale (understeer gradient in deg/g)
// 全模型的轉向平衡統一用「真實 understeer gradient, deg/g」表示。
// 正 = 轉向不足(US), 負 = 轉向過度(OS)。一般量產車 +1~+4、賽車 0~+1.5、
// 後置/中置可能微負。NEUTRAL 帶寬 ±0.5 deg/g。
// ============================================================
const US_NEUTRAL_BAND = CAL.US_NEUTRAL_BAND;   // deg/g — 此帶內視為中性 (見 calibration.js)
const US_NORM_SCALE = CAL.US_NORM_SCALE;       // deg/g 對應正規化 ±1 的滿刻度 (見 calibration.js)
function usTendency(degPerG) {
  if (degPerG > US_NEUTRAL_BAND) return ['Understeer', '轉向不足'];
  if (degPerG < -US_NEUTRAL_BAND) return ['Oversteer', '轉向過度'];
  return ['Neutral', '中性'];
}
function usNorm(degPerG) {
  return Math.max(-1.0, Math.min(1.0, degPerG / US_NORM_SCALE));
}

/*
╔══════════════════════════════════════════════════════════════════════════╗
║  知識文 #1 — 車為什麼會推頭 / 甩尾？輪胎負載敏感度 (Tire Load Sensitivity)  ║
║  對象：FSAE / 賽道新手工程師   程度：★★☆   閱讀時間：3 分鐘               ║
╚══════════════════════════════════════════════════════════════════════════╝

【一句話】
  轉向不足(推頭)還是轉向過度(甩尾)，根本上是在比「前軸和後軸，誰先把抓地力用完」。
  而決定誰先用完的核心物理，是一條反直覺的曲線：輪胎越重，每公斤負載能給的抓地力反而越少。

【直覺：先打掉一個常見誤會】
  很多人以為「壓得越重抓地力越大，所以重的那軸比較不會滑」。前半句對、後半句錯。
  輪胎的側向抓地力 Fy 確實隨垂直負載 Fz 增加，但是「邊際遞減」的——
  加第 1 個 100kg，抓地力長很多；加第 5 個 100kg，只長一點點。
  把抓地力「除以」負載,得到「每公斤的效率(= μ)」,這個效率是隨負載「下降」的。
  → 所以越重的軸，雖然總抓地力大，但相對於它要承擔的離心力，反而比較吃緊、比較早滑。

【物理：這條曲線怎麼決定平衡】
  過彎時整台車的離心力，前後軸各自要分攤的部分,正比於各軸的「質量」。
  而各軸能提供的抓地力上限,由它的負載 × 那個負載下的 μ 決定。
  比較兩軸「需求/能力」的緊張程度,就知道誰先滑:
    • 前軸先滑 → 推頭 (Understeer, 轉向不足)
    • 後軸先滑 → 甩尾 (Oversteer, 轉向過度)
  這就是為什麼「車頭重的車(前驅居多)天生推頭」——前軸又重、效率又被負載敏感度拉低。

  第二層：左右荷重轉移 (lateral load transfer) 也透過同一條曲線起作用。
  過彎時外輪增載、內輪減載;因為曲線是「凹」的,外輪多賺的 μ < 內輪虧掉的 μ,
  所以「一軸的荷重轉移越大 → 那一整軸的有效抓地效率越低 → 那一軸越早滑」。
  → 這就是 ARB / 彈簧 / 防傾桿在做的事:它們改變的是「前後軸各分到多少荷重轉移」
    (工程上叫 LLTD, Lateral Load Transfer Distribution)。
    前 ARB 加硬 → 前軸荷重轉移變多 → 前軸效率降 → 更推頭。後 ARB 加硬 → 更甩尾。

【公式 (Milliken, RCVD)】
  轉向不足梯度  K_us = W_f / C_αf − W_r / C_αr     [deg/g]
    W_f, W_r = 前/後軸重 (N)
    C_αf, C_αr = 前/後軸的 cornering stiffness (N/deg)，= 該軸兩條胎在「各自負載下」的和
  K_us > 0 → 推頭；< 0 → 甩尾；≈ 0 → 中性。
  漂亮之處：把「配重(靜態 Fz)」和「ARB/LLTD(荷重轉移 ΔFz)」用同一條曲線一次算進去。

【對應到下面這個函式 axlePairCorneringStiffness()】
  • halfStatic = 該軸一條胎的靜態負載 → 處理「配重」那一層
  • dt = 荷重轉移 → 外胎 halfStatic+dt、內胎 halfStatic−dt → 處理「LLTD/ARB」那一層
  • 兩條胎各自查 Pacejka 的 cornering stiffness 再相加 → 凹曲線自動讓「轉移越大效率越低」
  下面 Tier1 的 calculate() 就拿前後軸的 C_α 套上面那條 K_us 公式。

【FSAE 注意 ⚠】
  • FSAE 賽車車重輕(~200-250kg)、胎窄、低速，負載敏感度的「膝點」位置和量產車不同——
    本模型用平均單胎靜載校準膝點(a4Ref)，你做自己的車時要換成你輪胎的實測 Fz-Fy 數據。
  • FSAE 最有效的平衡工具通常是 ARB(改 LLTD)，因為配重分佈受規則/包裝限制難動。
  • 真實的 C_α 一定要用「你那條胎的 TTC(Tire Test Consortium)數據」擬合，不要照抄這裡的
    sport 預設係數——這是 FSAE 車隊最常犯、也最致命的偷懶。

【延伸】
  Milliken & Milliken, Race Car Vehicle Dynamics, ch.5-6 (load sensitivity, K_us)
  下一篇 → 知識文 #2：側傾剛性怎麼算、為什麼 ARB 是調 LLTD 的主力 (見 rollStiffnessSpring)
*/

/**
 * Axle pair cornering stiffness (N/deg) including lateral load transfer.
 * 兩條輪胎(外側增載/內側減載)各自的 cornering stiffness 相加；因負載敏感度
 * (Pacejka BCD 的凹性)，荷重轉移越大 → 該軸有效 cornering stiffness 越低。
 * 這是把「配重」與「LLTD/側傾剛性分配」統一進同一個負載敏感度物理的關鍵。
 * 詳見上方「知識文 #1」。
 * @param {number} axleMassKg 該軸靜態質量 (kg)
 * @param {number} transferKgPerG 單側荷重轉移 (kg per g)
 * @param {number} ayRefG 評估用的側向加速度 (g)
 * @param {number} a4RefKn 負載敏感度膝點(平均單胎靜載, kN)
 */
function axlePairCorneringStiffness(axleMassKg, transferKgPerG, ayRefG, a4RefKn, tireModel) {
  const halfStatic = axleMassKg / 2;            // 單胎靜態質量 (kg)
  const dt = transferKgPerG * ayRefG;           // ayRef 下單側轉移量 (kg)
  const fzOutKn = Math.max(0, halfStatic + dt) * G / 1000; // 外胎垂直力 (kN)
  const fzInKn = Math.max(0, halfStatic - dt) * G / 1000;  // 內胎
  // 若使用者匯入真實 .tir 胎模型，改用其實測 MF cornering stiffness
  // (對應上方知識文註記:做自己的車時要換成你輪胎的實測 Fz-Fy 數據)
  if (tireModel && tireModel.raw && tireModel.raw.PCY1 !== undefined && typeof corneringStiffnessNdeg === 'function') {
    return corneringStiffnessNdeg(tireModel, fzOutKn * 1000, 0)
         + corneringStiffnessNdeg(tireModel, fzInKn * 1000, 0);
  }
  return PacejkaTireModel.corneringStiffness(fzOutKn, 0, 'sport', a4RefKn)
       + PacejkaTireModel.corneringStiffness(fzInKn, 0, 'sport', a4RefKn);
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
   * Roll stiffness of one axle from a pair of springs (Nm/deg).
   * Two springs per axle, each at lever arm t/2:
   *   K_roll = 2 * K_wheel * (t/2)^2 = K_wheel * t^2 / 2   [Nm/rad]
   * (Milliken RCVD; OptimumG Tech Tip 2; Suspension Secrets)
   * K_wheel in N/mm, track in mm → output in Nm/deg
   */
  rollStiffnessSpring(wheelRateNmm, trackMm) {
    const kW = wheelRateNmm * 1000; // N/m
    const t = trackMm / 1000;       // m
    return kW * Math.pow(t, 2) / 2 * (Math.PI / 180);
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

    // === Axle roll stiffness ===
    // Suspension contribution: springs (at wheel rate) + ARB, then in series
    // with the tire pair's own roll stiffness — in roll the tires are the
    // last spring between suspension and road, for ARB as well as springs.
    const fRsSpring = this.rollStiffnessSpring(fWr, p.front_track ?? 1500);
    const rRsSpring = this.rollStiffnessSpring(rWr, p.rear_track ?? 1500);
    const fArb = p.front_arb ?? 0;
    const rArb = p.rear_arb ?? 0;
    const fRsSusp = fRsSpring + fArb;
    const rRsSusp = rRsSpring + rArb;
    const fRsTire = this.rollStiffnessSpring(tireK, p.front_track ?? 1500);
    const rRsTire = this.rollStiffnessSpring(tireK, p.rear_track ?? 1500);
    const fRsTotal = (fRsSusp > 0 && fRsTire > 0)
      ? 1.0 / (1.0 / fRsSusp + 1.0 / fRsTire)
      : fRsSusp;
    const rRsTotal = (rRsSusp > 0 && rRsTire > 0)
      ? 1.0 / (1.0 / rRsSusp + 1.0 / rRsTire)
      : rRsSusp;
    const totalRs = fRsTotal + rRsTotal;

    // Roll stiffness distribution
    const rsDistFront = totalRs > 0 ? (fRsTotal / totalRs * 100) : 50.0;

    // Weight distribution
    const wFrontPct = p.weight_front_pct ?? 50.0;
    const totalWeight = p.total_weight ?? 1000;
    const cgHeight = (p.cg_height ?? 300) / 1000; // to meters

    // Roll centers & axle masses (shared with the LLTD decomposition below).
    // 預設前後相等：側傾中心不對稱（尤其後>前）會讓幾何荷重轉移系統性偏向後軸，
    // 把 LLTD 壓到低於配重% → 即使側傾剛性與配重配平的車也會被算成轉向過度。
    // 在沒有實際 roll center 數據時，採對稱預設＝平衡由「側傾剛性分配 vs 配重」決定
    // （這才是使用者實際在調的東西）。有真實數據時可由 preset/輸入覆寫。
    const hRcF = (p.front_roll_center_height ?? 50) / 1000; // m
    const hRcR = (p.rear_roll_center_height ?? 50) / 1000;
    const tF = (p.front_track ?? 1500) / 1000; // m
    const tR = (p.rear_track ?? 1500) / 1000;
    const mF = totalWeight * wFrontPct / 100;
    const mR = totalWeight * (100 - wFrontPct) / 100;

    // Roll moment arm: CG height above the roll axis, weighted per axle (kg·m)
    const rollMomentArm = mF * (cgHeight - hRcF) + mR * (cgHeight - hRcR);

    // Roll gradient (deg/g):
    //   φ = M_roll / K_roll = m·g·(h_cg − h_roll_axis) / K_total
    //   [Nm] / [Nm/deg] = deg — no radian conversion needed
    let rollGradient = 0;
    if (totalRs > 0) {
      rollGradient = (rollMomentArm * G) / totalRs;
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
    // Geometric load transfer (per g)
    const dFzGeoF = mF * hRcF / tF;
    const dFzGeoR = mR * hRcR / tR;

    // Elastic load transfer (through springs/ARBs, per g)
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

    // === Steady-state understeer gradient (deg/g, unified Milliken model) ===
    // K_us = W_f/C_αf − W_r/C_αr, where each axle's cornering stiffness C_α is
    // evaluated at its static load PLUS its lateral load transfer (per the LLTD
    // decomposition above). 這一條同時捕捉:
    //   (a) 配重 — 車頭重 → 前軸單胎負載大 → 負載敏感度使 C_αf 偏低 → 轉向不足
    //   (b) LLTD/側傾剛性分配 — 前軸荷重轉移多 → C_αf 進一步下降 → 轉向不足
    // 取代舊式 (LLTD% − weight%)：舊式漏掉 (a)，導致前驅/車頭重車被誤判轉向過度。
    const ayRef = CAL.CORNERING_STIFFNESS_AY_REF_G; // g — 評估荷重轉移的參考側向加速度(校準後 LLTD 敏感度最合理,見 calibration.js)
    const a4Ref = totalWeight * G / 4 / 1000; // 平均單胎靜載 (kN)，校準負載敏感度膝點
    const cAlphaF = axlePairCorneringStiffness(mF, totalDFzF, ayRef, a4Ref, p.tireModel);
    const cAlphaR = axlePairCorneringStiffness(mR, totalDFzR, ayRef, a4Ref, p.tireModel);
    const usGradient = (cAlphaF > 0 && cAlphaR > 0)
      ? (mF * G / cAlphaF) - (mR * G / cAlphaR)
      : 0;

    const usNormalized = usNorm(usGradient);
    const [tendency, tendencyZh] = usTendency(usGradient);

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
      front_roll_stiffness_tire: roundN(fRsTire, 1),
      rear_roll_stiffness_tire: roundN(rRsTire, 1),
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

  // Reference tire width for normalization (mm) — 見 calibration.js
  static REFERENCE_WIDTH = CAL.TIRE_WIDTH_GRIP_REF_MM;

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
    const factor = 1.0 - CAL.PRESSURE_GRIP_LOSS_PER_BAR * delta;
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
    const factor = Math.pow(ratio, CAL.TIRE_WIDTH_GRIP_EXPONENT);
    return roundN(Math.max(0.8, Math.min(1.25, factor)), 4);
  }

  /**
   * Tire load sensitivity shape: cornering stiffness vs vertical load,
   * K_y = K * sin(2 * atan(Fz / Fz0))  — same shape as the Pacejka '89 BCD
   * term. Peaks at Fz = Fz0 (factor exactly 1.0) and falls off at higher
   * load; this fall-off is why lateral load transfer costs an axle grip.
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
    const C = co.C;
    const D = (co.a1 * fzKn + co.a2) * fzKn;
    const BCD = PacejkaTireModel.corneringStiffness(fzKn, camberDeg, category);
    const E = co.a6 * fzKn + co.a7;
    const B = (C * D) !== 0 ? BCD / (C * D) : 0;
    // '89 係數以「度」擬合（BCD 為 N/deg），slip angle 直接用度帶入，
    // 不可轉成 radians（會把力低估 57 倍）
    const Ba = B * slipAngleDeg;
    return D * Math.sin(C * Math.atan(Ba - E * (Ba - Math.atan(Ba))));
  }

  /**
   * Cornering stiffness at zero slip (N/deg): the BCD term of the '89 model.
   * BCD = a3 * sin(2 * atan(Fz/a4)) * (1 - a5*|γ|) — peaks at Fz = a4 (kN)
   * and falls off at higher load (tire load sensitivity).
   * The a5 camber term is applied with γ in radians: with the published
   * a5 ≈ 0.208 this gives the physically sensible ~1-2% reduction at 3°
   * camber (per-degree application would wrongly erase >60% of stiffness).
   * @param {number} fzKn - vertical load on the tire in kN
   * @param {number} camberDeg - camber angle in degrees
   * @param {string} category - 'race'|'semi_slick'|'sport'
   * @returns {number} cornering stiffness in N/deg
   */
  static corneringStiffness(fzKn, camberDeg = 0, category = 'semi_slick', a4OverrideKn = 0) {
    const co = PacejkaTireModel.COEFFICIENTS[category] || PacejkaTireModel.COEFFICIENTS.sport;
    if (fzKn <= 0) return 0;
    // a4OverrideKn: 發布的 a4（峰值荷重 ≈1.8-2.0 kN/胎）是 1980 年代輕車胎
    // 的擬合值；現代輪胎依車重選型（load index），剛性峰值會落在工作荷重
    // 附近。呼叫端可傳入車輛的平均單胎靜載把「膝點」校準到該車，
    // 否則所有 >750kg 的車都會被誤判為遠超過峰值。
    const a4 = Math.max(co.a4, a4OverrideKn || 0);
    const camberRad = Math.abs(camberDeg) * Math.PI / 180;
    const camberFactor = Math.max(0, 1 - co.a5 * camberRad);
    return co.a3 * Math.sin(2 * Math.atan(fzKn / a4)) * camberFactor;
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
    // 前/後抓地比失衡 → 平衡偏移 (deg/g)。gripRatio<1(前軸較弱) → 轉向不足(+)。
    // 增益見 calibration.js TIRE_GRIP_TO_US_GRADIENT_GAIN：前軸抓地少 10% ≈ +1.4 deg/g 偏移。
    const tireUsShift = -(gripRatio - 1.0) * CAL.TIRE_GRIP_TO_US_GRADIENT_GAIN;
    const adjustedUs = t1.understeer_gradient + tireUsShift;
    const adjustedNormalized = usNorm(adjustedUs);
    const [tendency, tendencyZh] = usTendency(adjustedUs);

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

    // Tire load sensitivity (cornering-stiffness efficiency vs nominal load;
    // left/right static loads are equal here since only axle weights are known)
    const totalWeight = this.params.total_weight ?? 1000;
    const wFrontPct = this.params.weight_front_pct ?? 50;
    const nominalCornerLoad = totalWeight * G / 4;
    const frontCornerLoad = (totalWeight * wFrontPct / 100 / 2) * G;
    const rearCornerLoad = (totalWeight * (100 - wFrontPct) / 100 / 2) * G;
    const loadSensitivity = {
      fl_efficiency: roundN(TireModel.tireLoadSensitivity(frontCornerLoad, nominalCornerLoad), 3),
      fr_efficiency: roundN(TireModel.tireLoadSensitivity(frontCornerLoad, nominalCornerLoad), 3),
      rl_efficiency: roundN(TireModel.tireLoadSensitivity(rearCornerLoad, nominalCornerLoad), 3),
      rr_efficiency: roundN(TireModel.tireLoadSensitivity(rearCornerLoad, nominalCornerLoad), 3),
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
   * Toe effect on the understeer balance. Convention: positive = toe-in.
   * Front toe-in → straight-line stability, slower turn-in (more understeer);
   * front toe-out (negative) → sharper turn-in (less understeer).
   * Rear toe-in → rear stability (more understeer); rear toe-out → oversteer.
   * Returns an understeer shift value (positive = more understeer).
   */
  toeStabilityFactor(toeDeg, isFront) {
    // 同一符號慣例（+ = toe-in）下前後軸方向相同；isFront 保留簽名相容，
    // 目前刻意不影響計算
    return toeDeg * 1.5;
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
      // Cross weight diagonal: FL + RR（本工具刻意採用此對角作為分析視角，
      // 用於非對稱賽道/偏置配重時直接觀察右前輪負載；與磅秤常見的 RF+LR
      // 互補：FL+RR% = 100% − RF+LR%）
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
        // FL+RR > 50% ⟺ RF+LR < 50%（reverse wedge）→ 左彎偏鬆（轉向過度）、
        // 右彎偏緊（轉向不足/較穩定）；< 50% 相反
        if (crossPct > 50) {
          cwWarning = 'Cross weight (FL+RR) ' + crossPct.toFixed(1) + '%: 右彎較穩定，左彎偏轉向過度';
        } else {
          cwWarning = 'Cross weight (FL+RR) ' + crossPct.toFixed(1) + '%: 左彎較穩定，右彎偏轉向過度';
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
      // Downforce adds grip without adding mass: shifting vertical load share
      // toward the front gives the front axle more grip margin for the same
      // lateral demand → LESS understeer. Front-biased aero = high-speed
      // oversteer; rear-biased aero = high-speed understeer/stability.
      // 每 1% 有效配重前移 ≈ 0.2 deg/g 偏移(見 calibration.js WEIGHT_SHIFT_TO_US_GRADIENT)。
      aeroUsShift = -(effectiveFrontPct - (frontW / totalW * 100)) * CAL.WEIGHT_SHIFT_TO_US_GRADIENT;
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

    // Damper 只影響「過渡」平衡(進/出彎),對穩態平衡影響小 → deg/g 尺度用小增益 0.03。
    let damperRatioBump, damperUsShiftEntry;
    if (fBump + rBump > 0) {
      damperRatioBump = fBump / (fBump + rBump) * 100;
      damperUsShiftEntry = (damperRatioBump - 50) * 0.03;
    } else {
      damperRatioBump = 50;
      damperUsShiftEntry = 0;
    }

    let damperRatioRebound, damperUsShiftExit;
    if (fRebound + rRebound > 0) {
      damperRatioRebound = fRebound / (fRebound + rRebound) * 100;
      damperUsShiftExit = (damperRatioRebound - 50) * 0.03;
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

    // Damper coefficient c = F / v_ref. Spec-sheet forces are quoted at a
    // reference shaft speed (commonly 0.1–0.3 m/s, e.g. TEIN uses 0.3 m/s) —
    // dividing by it converts force (kgf→N) into N·s/m. Reflected to the
    // wheel via the motion ratio (damper assumed to share the spring's MR).
    // 防呆：使用者清空欄位（''）或輸入 0/負值都會造成除以零 → 退回 0.3
    const refSpdRaw = Number(ap.damper_ref_speed);
    const damperRefSpeed = (Number.isFinite(refSpdRaw) && refSpdRaw > 0) ? refSpdRaw : 0.3; // m/s
    const fMrT3 = this.params.front_motion_ratio ?? 1.0;
    const rMrT3 = this.params.rear_motion_ratio ?? 1.0;
    const fDampC = ((fBump + fRebound) / 2) * G / damperRefSpeed * Math.pow(fMrT3, 2); // N·s/m at wheel
    const rDampC = ((rBump + rRebound) / 2) * G / damperRefSpeed * Math.pow(rMrT3, 2);
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

    // Roll damping ratio: ζ_roll = C_roll / (2·√(K_roll · I_roll))
    // C_roll = Σ 2·c·(t/2)² per axle = c·t²/2  [N·m·s/rad] — two dampers per
    // axle, all quantities per-radian so no degree conversion is involved.
    // I_roll ≈ m·(0.3·t_avg)²: roll radius of gyration ≈ 30% of track (approx).
    const cgHeightT3 = (this.params.cg_height ?? 300) / 1000;
    const fTrack = (this.params.front_track ?? 1500) / 1000;
    const rTrack = (this.params.rear_track ?? 1500) / 1000;
    const avgTrack = (fTrack + rTrack) / 2;
    const rollMOI = totalWeightT3 * Math.pow(0.3 * avgTrack, 2);
    const totalRsNmRad = (t2.total_roll_stiffness ?? 0) * 180 / Math.PI; // Nm/deg → Nm/rad
    const actualRollDamping = fDampC * Math.pow(fTrack, 2) / 2 + rDampC * Math.pow(rTrack, 2) / 2;
    const rollDampingRatio = (totalRsNmRad > 0 && rollMOI > 0)
      ? actualRollDamping / (2 * Math.sqrt(totalRsNmRad * rollMOI))
      : 0;

    const dampingInfo = {
      front_ratio: roundN(dampingRatioFront, 3),
      rear_ratio: roundN(dampingRatioRear, 3),
      front_category: dampingCategory(dampingRatioFront),
      rear_category: dampingCategory(dampingRatioRear),
      roll_damping_ratio: roundN(rollDampingRatio, 3),
      damper_ref_speed_ms: damperRefSpeed,
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

    // === Slip Angle & Yaw Dynamics (linear bicycle model, Gillespie ch.6) ===
    // Axle cornering stiffness from the Pacejka '89 BCD term evaluated at the
    // static per-tire load, scaled by tire width where known. The load
    // sensitivity built into BCD makes the heavier axle proportionally
    // "weaker" — exactly the mechanism behind weight-distribution understeer.
    const tpT3 = this.tireParams || {};
    // Axle loads: prefer measured corner weights when entered; otherwise
    // total weight × distribution
    let wF_N, wR_N;
    if (totalW > 0) {
      wF_N = (flW + frW) * G;
      wR_N = (rlW + rrW) * G;
    } else {
      wF_N = totalWeightT3 * wFrontPctT3 / 100 * G;
      wR_N = totalWeightT3 * (100 - wFrontPctT3) / 100 * G;
    }
    // 把 Pacejka 荷重敏感度的「膝點」校準到本車的平均單胎靜載
    // （詳見 corneringStiffness 註解）
    const a4EffKn = (wF_N + wR_N) / 4 / 1000;

    function tireCategoryT3(compound) {
      if (typeof TRACKDAY_TIRES !== 'undefined' && compound && TRACKDAY_TIRES[compound]) {
        return TRACKDAY_TIRES[compound].category;
      }
      return 'sport';
    }
    const fWidthT3 = tpT3.front_tire_width ?? 0;
    const rWidthT3 = tpT3.rear_tire_width ?? 0;
    const fWidthFactorT3 = fWidthT3 > 0 ? TireModel.gripFactorWidth(fWidthT3) : 1.0;
    const rWidthFactorT3 = rWidthT3 > 0 ? TireModel.gripFactorWidth(rWidthT3) : 1.0;
    const fCamberDyn = ap.front_camber_deg ?? -3.0;
    const rCamberDyn = ap.rear_camber_deg ?? -2.0;

    const tmDyn = this.params && this.params.tireModel;
    const useTmDyn = tmDyn && tmDyn.raw && tmDyn.raw.PCY1 !== undefined && typeof corneringStiffnessNdeg === 'function';
    const cAlphaF = useTmDyn
      ? 2 * corneringStiffnessNdeg(tmDyn, wF_N / 2, fCamberDyn * Math.PI / 180) * fWidthFactorT3
      : 2 * PacejkaTireModel.corneringStiffness(
          wF_N / 2 / 1000, fCamberDyn, tireCategoryT3(tpT3.front_compound), a4EffKn) * fWidthFactorT3; // N/deg per axle
    const cAlphaR = useTmDyn
      ? 2 * corneringStiffnessNdeg(tmDyn, wR_N / 2, rCamberDyn * Math.PI / 180) * rWidthFactorT3
      : 2 * PacejkaTireModel.corneringStiffness(
          wR_N / 2 / 1000, rCamberDyn, tireCategoryT3(tpT3.rear_compound), a4EffKn) * rWidthFactorT3;

    // Slip angle required at 1 g lateral (deg): α = W·a_y / C_α
    const slipAngleFront = cAlphaF > 0 ? wF_N / cAlphaF : 0;
    const slipAngleRear = cAlphaR > 0 ? wR_N / cAlphaR : 0;

    // Understeer gradient (Gillespie eq. 6-10): K_us = W_f/C_αf − W_r/C_αr [deg/g]
    const kUsLinDeg = slipAngleFront - slipAngleRear;
    const kUsLinRad = kUsLinDeg * Math.PI / 180;

    // Characteristic speed (understeer: yaw gain peaks) or critical speed
    // (oversteer: linear model becomes unstable): V = √(g·L / |K_us|)
    // |K_us| < 0.1 deg/g 視為中性：再小的梯度算出的特徵/臨界速度會是
    // 數千 km/h 的無意義數字，不顯示
    let charSpeed = null, critSpeed = null;
    const NEUTRAL_KUS_DEG = 0.1;
    if (kUsLinDeg > NEUTRAL_KUS_DEG) {
      charSpeed = Math.sqrt(G * wheelbaseM / kUsLinRad) * 3.6; // km/h
    } else if (kUsLinDeg < -NEUTRAL_KUS_DEG) {
      critSpeed = Math.sqrt(G * wheelbaseM / -kUsLinRad) * 3.6;
    }

    // Yaw rate gain r/δ at 100 km/h (Gillespie): V / (L + K_us·V²/g)  [1/s]
    // 接近臨界速度（>85%）時線性模型發散、數值無意義 → 不顯示
    const refSpeedMs = 100 / 3.6;
    let yawGain = null;
    const yawDenom = wheelbaseM + kUsLinRad * Math.pow(refSpeedMs, 2) / G;
    const nearCritical = critSpeed != null && 100 >= 0.85 * critSpeed;
    if (yawDenom > 0.01 && !nearCritical) {
      yawGain = refSpeedMs / yawDenom;
    } // else: at/above (or near) critical speed — the linear model diverges

    const dynamicsInfo = {
      cornering_stiffness_front_n_deg: roundN(cAlphaF, 0),
      cornering_stiffness_rear_n_deg: roundN(cAlphaR, 0),
      slip_angle_front_deg: roundN(slipAngleFront, 2),   // at 1 g lateral
      slip_angle_rear_deg: roundN(slipAngleRear, 2),
      first_saturates: slipAngleFront > slipAngleRear ? 'front' : 'rear',
      understeer_gradient_linear_deg_g: roundN(kUsLinDeg, 2),
      characteristic_speed_kmh: charSpeed != null ? roundN(charSpeed, 0) : null,
      critical_speed_kmh: critSpeed != null ? roundN(critSpeed, 0) : null,
      yaw_gain_at_100kmh: yawGain != null ? roundN(yawGain, 3) : null,
    };

    // === Camber & Toe ===
    const fCamber = ap.front_camber_deg ?? -3.0;
    const rCamber = ap.rear_camber_deg ?? -2.0;
    const fToe = ap.front_toe_deg ?? 0;
    const rToe = ap.rear_toe_deg ?? 0;

    const fCamberGrip = this.camberGripFactor(fCamber);
    const rCamberGrip = this.camberGripFactor(rCamber);
    // 前後 camber 抓地差 → 平衡偏移 (deg/g)。增益 10：camberGrip 差 0.05 ≈ 0.5 deg/g。
    const camberUsShift = -(fCamberGrip - rCamberGrip) * 10;

    // Toe 偏移 (deg/g)：前後各 toeDeg×1.0(原 1.5 降為 deg/g 尺度)。
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
        brUsShift = (brRatioFront - 50) * 0.06; // deg/g 尺度
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

    const steadyT = usTendency(totalUsSteady);
    const entryT = usTendency(totalUsEntry);
    const exitT = usTendency(totalUsExit);

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
        roll_stiffness_spring_front: t2.front_roll_stiffness_spring,
        roll_stiffness_spring_rear: t2.rear_roll_stiffness_spring,
        roll_stiffness_tire_front: t2.front_roll_stiffness_tire,
        roll_stiffness_tire_rear: t2.rear_roll_stiffness_tire,
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
          normalized: roundN(usNorm(totalUsSteady), 3),
          tendency: steadyT[0],
          tendency_zh: steadyT[1],
        },
        turn_entry: {
          understeer_gradient: roundN(totalUsEntry, 2),
          normalized: roundN(usNorm(totalUsEntry), 3),
          tendency: entryT[0],
          tendency_zh: entryT[1],
        },
        turn_exit: {
          understeer_gradient: roundN(totalUsExit, 2),
          normalized: roundN(usNorm(totalUsExit), 3),
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

  // Relative normalized (deltaUs 為 deg/g；±2 deg/g 視為滿刻度)
  const relNorm = roundN(Math.max(-1.0, Math.min(1.0, deltaUs / 2.0)), 3);

  // Tendency label for the delta (deg/g 尺度：±0.4 deg/g 以上才算明顯差異)
  let deltaTendency, deltaTendencyZh;
  if (deltaUs > 0.4) {
    deltaTendency = 'more_understeer';
    deltaTendencyZh = '比基準更轉向不足';
  } else if (deltaUs < -0.4) {
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
      if (d > 0.4) {
        delta[phase + '_tendency_zh'] = '比基準更轉向不足';
      } else if (d < -0.4) {
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

    // Dynamics delta (yaw gain can be null above the critical speed)
    if (b.dynamics && c.dynamics) {
      delta.dynamics = {
        slip_angle_front: roundN(c.dynamics.slip_angle_front_deg - b.dynamics.slip_angle_front_deg, 2),
        slip_angle_rear: roundN(c.dynamics.slip_angle_rear_deg - b.dynamics.slip_angle_rear_deg, 2),
        yaw_gain: (c.dynamics.yaw_gain_at_100kmh != null && b.dynamics.yaw_gain_at_100kmh != null)
          ? roundN(c.dynamics.yaw_gain_at_100kmh - b.dynamics.yaw_gain_at_100kmh, 3)
          : null,
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
  static analyze(result, tier, params, advParams, tr) {
    if (!result) return { suggestions: [], summary: { high: 0, medium: 0, low: 0, total: 0 } };

    // i18n: tr(key) translates a key; falls back to the key itself when no translator is injected.
    const T = (typeof tr === 'function') ? tr : (k => k);
    const fmt = (key, vars) => { let s = T(key); if (vars) for (const p in vars) s = s.split('{' + p + '}').join(vars[p]); return s; };
    const FRONT = T('adv.frag.front'), REAR = T('adv.frag.rear');

    const suggestions = [];
    // add(priority, category, message, suggestion, values) — category is the English key; category_zh is localized from it.
    const add = (priority, category, message, suggestion, values) => {
      suggestions.push({ priority, category, category_zh: T('adv.cat.' + category), message, suggestion: suggestion || '', values: values || {} });
    };

    // ── Rule 1: Front/rear ride frequency relationship ──
    // ratio = rear/front. Olley "Flat Ride": rear ride frequency 10-20%
    // HIGHER than front (ratio ≈ 1.10-1.20) so pitch settles into bounce
    // after a bump. Track/aero cars often run the front stiffer instead
    // (ratio 0.9-1.0) for platform control — both are legitimate, so only
    // clear outliers are flagged.
    const rf = result.ride_frequency || (result.mechanical?.ride_frequency);
    if (rf && rf.front_hz > 0 && rf.rear_hz > 0) {
      const ratio = rf.ratio;
      if (ratio < 0.85 || ratio > 1.35) {
        const pri = (ratio < 0.75 || ratio > 1.5) ? 'medium' : 'low';
        const targetRatio = 1.10;
        const targetRearHz = rf.front_hz * targetRatio;
        // Reverse-calculate required REAR spring rate for flat ride
        const rMr = params.rear_motion_ratio ?? 1.0;
        const tireK = params.tire_spring_rate ?? 220;
        const wFrontPct = params.weight_front_pct ?? 50;
        const totalWeight = params.total_weight ?? 1000;
        const mCorner = (totalWeight * (100 - wFrontPct) / 100) / 2;
        const kWheelNeeded = Math.pow(2 * Math.PI * targetRearHz, 2) * mCorner / 1000;
        // Subtract tire compliance: k_spring_wheel = 1/(1/kWheelNeeded - 1/tireK)
        let targetSpring;
        if (tireK > kWheelNeeded) {
          const kSpringWheel = 1.0 / (1.0 / kWheelNeeded - 1.0 / tireK);
          targetSpring = kSpringWheel / Math.pow(rMr, 2);
        } else {
          // 目標頻率超過輪胎剛性上限，給下界值（同樣換算回彈簧端）
          targetSpring = kWheelNeeded / Math.pow(rMr, 2);
        }
        add(pri, 'spring',
          fmt('adv.r1.msg', { ratio: roundN(ratio, 2), front: roundN(rf.front_hz, 1), rear: roundN(rf.rear_hz, 1) }),
          fmt('adv.r1.sug', { spring: roundN(targetSpring, 0), cur: params.rear_spring_rate, ratio: targetRatio }),
          { target_rear_spring: roundN(targetSpring, 1), target_ratio: targetRatio, target_rear_hz: roundN(targetRearHz, 2) }
        );
      }
    }

    // ── Rule 2: Ride Frequency too low for track use ──
    if (rf && rf.front_hz > 0 && rf.rear_hz > 0) {
      const minHz = Math.min(rf.front_hz, rf.rear_hz);
      if (minHz < 2.0) {
        const pri = minHz < 1.5 ? 'high' : 'medium';
        const axle = rf.front_hz < rf.rear_hz ? FRONT : REAR;
        const axleHz = Math.min(rf.front_hz, rf.rear_hz);
        add(pri, 'spring',
          fmt('adv.r2.msg', { axle, hz: roundN(axleHz, 2) }),
          fmt('adv.r2.sug', { axle }),
          { low_axis: axle, current_hz: roundN(axleHz, 2), target_hz: 2.5 }
        );
      }
    }

    // ── Rule 3: Ride Frequency too high (too stiff) ──
    if (rf) {
      if (rf.front_hz > 4.0) {
        add('medium', 'spring',
          fmt('adv.r3.msg', { axle: FRONT, hz: roundN(rf.front_hz, 2) }),
          fmt('adv.r3.sug', { axle: FRONT }), {});
      }
      if (rf.rear_hz > 4.0) {
        add('medium', 'spring',
          fmt('adv.r3.msg', { axle: REAR, hz: roundN(rf.rear_hz, 2) }),
          fmt('adv.r3.sug', { axle: REAR }), {});
      }
    }

    // ── Rule 4: LLTD vs weight distribution mismatch ──
    const lltdF = result.lltd_front ?? (result.mechanical?.lltd_front);
    const wFPct = result.weight_front_pct ?? (result.mechanical?.weight_front_pct);
    if (lltdF != null && wFPct != null) {
      const diff = Math.abs(lltdF - wFPct);
      if (diff > 8) {
        const pri = diff > 12 ? 'high' : 'medium';
        const dir = lltdF > wFPct ? T('us.Understeer') : T('us.Oversteer');
        const fix = lltdF > wFPct ? T('adv.r4.fixUnder') : T('adv.r4.fixOver');
        add(pri, 'arb',
          fmt('adv.r4.msg', { lltd: roundN(lltdF, 1), wpct: roundN(wFPct, 1), diff: roundN(diff, 1), dir }),
          fix,
          { lltd: roundN(lltdF, 1), weight_pct: roundN(wFPct, 1), diff: roundN(diff, 1) }
        );
      }
    }

    // ── Rule 5: Roll Gradient too high ──
    const rollGrad = result.roll_gradient_deg_per_g ?? (result.mechanical?.roll_gradient);
    if (rollGrad != null && rollGrad > 3.0) {
      const pri = rollGrad > 5.0 ? 'high' : 'medium';
      add(pri, 'arb',
        fmt('adv.r5.msg', { rg: roundN(rollGrad, 2) }),
        T('adv.r5.sug'),
        { roll_gradient: roundN(rollGrad, 2) }
      );
    }

    // ── Rule 6: Geometric load transfer is high proportion ──
    const lltdDec = result.lltd_decomposed || (result.mechanical?.lltd_decomposed);
    if (lltdDec && lltdDec.geometric_pct_of_total > 40) {
      add('low', 'geometry',
        fmt('adv.r6.msg', { pct: roundN(lltdDec.geometric_pct_of_total, 1) }),
        T('adv.r6.sug'),
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
        const isFront = dF < dR;
        const axle = isFront ? FRONT : REAR;
        const val = isFront ? dF : dR;
        // Calculate target damper force for ζ=0.5
        const totalWeight = params.total_weight ?? 1000;
        const wFPctLocal = params.weight_front_pct ?? 50;
        const effWr = isFront
          ? (result.mechanical?.front_wheel_rate_effective ?? result.front_wheel_rate_effective ?? 0)
          : (result.mechanical?.rear_wheel_rate_effective ?? result.rear_wheel_rate_effective ?? 0);
        const mCorner = isFront
          ? (totalWeight * wFPctLocal / 100) / 2
          : (totalWeight * (100 - wFPctLocal) / 100) / 2;
        const targetZeta = 0.5;
        // 參考速度優先用計算結果實際採用的值（與顯示的 ζ 一致），並防 0
        const refVRaw = Number(result.damping?.damper_ref_speed_ms ?? advParams?.damper_ref_speed);
        const refV = (Number.isFinite(refVRaw) && refVRaw > 0) ? refVRaw : 0.3;
        if (effWr > 0 && mCorner > 0) {
          // Target damper coefficient at the wheel, reflected back to the
          // damper through MR², then expressed as a force at the reference
          // shaft speed (what spec sheets quote)
          const mrAxle = isFront
            ? (params.front_motion_ratio ?? 1.0)
            : (params.rear_motion_ratio ?? 1.0);
          const targetC_wheel = targetZeta * 2 * Math.sqrt(effWr * 1000 * mCorner); // N·s/m
          const targetC_damper = targetC_wheel / Math.pow(mrAxle, 2);
          const targetF_kgf = targetC_damper * refV / G;
          add(pri, 'damper',
            fmt('adv.r7.msg', { axle, ratio: roundN(val, 2), sev: T(val < 0.2 ? 'adv.frag.severeUnderdamped' : 'adv.frag.underdamped') }),
            fmt('adv.r7.sug', { axle, refV, kgf: roundN(targetF_kgf, 0), zeta: targetZeta }),
            { axis: axle, current_ratio: roundN(val, 2), target_kgf: roundN(targetF_kgf, 0), target_zeta: targetZeta, ref_speed_ms: refV }
          );
        } else {
          // 缺少有效輪率資料 — 不憑空捏造目標阻尼力
          add(pri, 'damper',
            fmt('adv.r7.msg', { axle, ratio: roundN(val, 2), sev: T(val < 0.2 ? 'adv.frag.severeUnderdamped' : 'adv.frag.underdamped') }),
            fmt('adv.r7.sugNoData', { axle }),
            { axis: axle, current_ratio: roundN(val, 2), target_zeta: targetZeta }
          );
        }
      }
    }

    // ── Rule 8: Front/rear damping ratio mismatch ──
    if (tier === 3 && result.damping) {
      const diff = Math.abs(result.damping.front_ratio - result.damping.rear_ratio);
      if (diff > 0.25) {
        add('medium', 'damper',
          fmt('adv.r8.msg', { diff: roundN(diff, 2), f: roundN(result.damping.front_ratio, 2), r: roundN(result.damping.rear_ratio, 2) }),
          T('adv.r8.sug'),
          { front_ratio: roundN(result.damping.front_ratio, 2), rear_ratio: roundN(result.damping.rear_ratio, 2), diff: roundN(diff, 2) }
        );
      }
    }

    // ── Rule 9: Front/rear grip imbalance (Tier 2+) ──
    if (tier >= 2 && result.tire_grip) {
      const gr = result.tire_grip.grip_ratio_f_r;
      if (gr != null && Math.abs(gr - 1.0) > 0.08) {
        const pri = Math.abs(gr - 1.0) > 0.15 ? 'high' : 'medium';
        const weak = gr < 1.0 ? FRONT : REAR;
        add(pri, 'tire',
          fmt('adv.r9.msg', { gr: roundN(gr, 3), weak }),
          fmt('adv.r9.sug', { weak }),
          { grip_ratio: roundN(gr, 3), weak_axis: weak }
        );
      }
    }

    // ── Rule 10: Tire not in operating window (Tier 2+) ──
    if (tier >= 2 && result.tire_grip) {
      const tg = result.tire_grip;
      const corners = [
        { name: T('adv.corner.fl'), val: tg.fl }, { name: T('adv.corner.fr'), val: tg.fr },
        { name: T('adv.corner.rl'), val: tg.rl }, { name: T('adv.corner.rr'), val: tg.rr },
      ];
      for (const c of corners) {
        if (c.val != null && c.val < 0.85) {
          const pri = c.val < 0.75 ? 'high' : 'medium';
          add(pri, 'tire',
            fmt('adv.r10.msg', { corner: c.name, pct: roundN(c.val * 100, 0) }),
            T('adv.r10.sug'),
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
          add('medium', 'aero',
            fmt('adv.r11.msg', { aero: roundN(aeroF, 1), wpct: roundN(mechWF, 1), diff: roundN(diff, 1) }),
            T('adv.r11.sug'),
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
        add(pri, 'weight',
          fmt('adv.r12.msg', { dev: roundN(dev, 1), pct: roundN(result.corner_weight.cross_weight_pct, 1) }),
          T('adv.r12.sug'),
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
        if (fOff > 1.5) details.push(fmt('adv.r13.detFront', { fc }));
        if (rOff > 1.0) details.push(fmt('adv.r13.detRear', { rc }));
        add('low', 'geometry',
          fmt('adv.r13.msg', { details: details.join(T('adv.frag.listSep')) }),
          T('adv.r13.sug'),
          { front_camber: fc, rear_camber: rc }
        );
      }
    }

    // ── Rule 14: Oversteer warning ──
    if (tier === 3 && result.prediction) {
      const usG = result.prediction.steady_state.understeer_gradient;
      if (usG < 0) {
        const critKmh = result.dynamics?.critical_speed_kmh;
        add('high', 'balance',
          fmt('adv.r14.msg', { usg: roundN(usG, 2) }),
          (critKmh ? fmt('adv.r14.sugCritPre', { kmh: critKmh }) : T('adv.r14.sugNoCritPre'))
            + T('adv.r14.sugSuffix'),
          { understeer_gradient: roundN(usG, 2), critical_speed_kmh: critKmh ?? null }
        );
      }
    } else if (tier < 3) {
      const usG = result.adjusted_understeer_gradient ?? result.understeer_gradient;
      if (usG != null && usG < -1.0) {
        add('high', 'balance',
          fmt('adv.r14b.msg', { usg: roundN(usG, 2) }),
          T('adv.r14b.sug'),
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
  static arbSizing(totalWeight, cgHeight, targetRollGrad, frontPct, existingSpringRollFront, existingSpringRollRear, tireRollFront, tireRollRear) {
    const m = totalWeight || 1000;
    const h = (cgHeight || 300) / 1000; // to meters
    const target = targetRollGrad || 2.0;
    const fPct = frontPct || 55;
    const springF = existingSpringRollFront || 0;
    const springR = existingSpringRollRear || 0;
    const tireF = tireRollFront || 0;
    const tireR = tireRollRear || 0;

    // All roll stiffness in Nm/deg → roll gradient = M_roll [Nm/g] / K [Nm/deg]
    // = deg/g directly. h uses full CG height (roll-center heights unknown in
    // this tool), which slightly overestimates the roll moment — conservative.
    // 若有提供輪胎側傾剛性（tireRollFront/Rear），會把輪胎柔度串聯進來，
    // 與 Tier 1 模型一致（否則裝上建議的 ARB 後實際側傾會比目標大 ~10-15%）。
    const series = (a, b) => (a > 0 && b > 0) ? 1 / (1 / a + 1 / b) : a;
    const currentTotal = series(springF, tireF) + series(springR, tireR);
    let currentRollGrad = 0;
    if (currentTotal > 0) {
      currentRollGrad = (m * G * h) / currentTotal;
    }

    // Required total axle-level roll stiffness (Nm/deg) for target gradient
    const totalNeeded = (m * G * h) / target;
    const frontNeeded = totalNeeded * fPct / 100;
    const rearNeeded = totalNeeded * (100 - fPct) / 100;

    // 透過輪胎串聯反推懸吊端需求：K_susp = 1/(1/K_axle − 1/K_tire)。
    // 若輪胎剛性本身低於軸需求，目標無法達成（回傳 null）。
    const suspNeeded = (axleNeed, tire) => {
      if (tire > axleNeed) return 1 / (1 / axleNeed - 1 / tire);
      if (tire > 0) return null; // 輪胎柔度已限制住，加 ARB 也到不了
      return axleNeed;           // 無輪胎資料 — 直接用軸需求
    };
    const frontSusp = suspNeeded(frontNeeded, tireF);
    const rearSusp = suspNeeded(rearNeeded, tireR);
    const frontArbNeeded = frontSusp == null ? null : Math.max(0, frontSusp - springF);
    const rearArbNeeded = rearSusp == null ? null : Math.max(0, rearSusp - springR);

    return {
      total_roll_needed: roundN(totalNeeded, 0),
      front_roll_needed: roundN(frontNeeded, 0),
      rear_roll_needed: roundN(rearNeeded, 0),
      front_arb_needed: frontArbNeeded == null ? null : roundN(frontArbNeeded, 0),
      rear_arb_needed: rearArbNeeded == null ? null : roundN(rearArbNeeded, 0),
      unreachable: frontArbNeeded == null || rearArbNeeded == null,
      current_roll_gradient: roundN(currentRollGrad, 2),
      current_spring_total: roundN(springF + springR, 0),
    };
  }
}

// ============================================================
// Tire Spring Rate Estimator
// 從輪胎規格（扁平比、胎寬、胎壓）推算輪胎垂直彈簧率
//
// 實測上輪胎垂直剛性主要由「胎壓」決定（約 80-90%），胎壁高度
// （扁平比）與胎寬是次要因素，因此扁平比只用弱指數修正：
//   K ≈ 220 × (55/aspect)^0.35 × (width/205)^0.3 × (0.15 + 0.85·P/2.2)
//
// 校準點：
//   205/55R16 @2.2bar ≈ 220 N/mm（文獻常用基準）
//   255/40R17 RE-71R 實測 ≈ 250 N/mm（本式估 ~263，+5%）
//   乘用車胎實測範圍約 188-320 N/mm
//
// Typical @2.2 bar:
//   55 aspect → ~210-225 N/mm
//   45 aspect → ~230-250 N/mm
//   40 aspect → ~245-265 N/mm
//   35 aspect → ~255-285 N/mm
//   30 aspect → ~270-300 N/mm
// ============================================================
class TireSpringEstimator {
  // Reference: 205/55R16 ≈ 220 N/mm at 2.2 bar
  static REF_WIDTH = 205;
  static REF_ASPECT = 55;
  static REF_SPRING_RATE = 220;
  static REF_PRESSURE = 2.2; // bar

  /**
   * 從輪胎規格推算垂直彈簧率
   * @param {number} width - 胎寬 (mm), e.g. 235
   * @param {number} aspectRatio - 扁平比, e.g. 40
   * @param {number} [pressureBar=2.2] - 胎壓 (bar)；垂直剛性的主導因素
   * @returns {number} 估算彈簧率 (N/mm)
   */
  static estimate(width, aspectRatio, pressureBar) {
    if (!width || !aspectRatio || aspectRatio <= 0) return this.REF_SPRING_RATE;
    const p = pressureBar || this.REF_PRESSURE;

    // 扁平比：弱反比（指數 0.35）— 胎壁越短剛性略增
    const aspectFactor = Math.pow(this.REF_ASPECT / aspectRatio, 0.35);
    // 胎寬：弱正比（指數 0.3）
    const widthFactor = Math.pow(width / this.REF_WIDTH, 0.3);
    // 胎壓：主導項，近似線性（含小量結構剛性常數項）
    const pressureFactor = 0.15 + 0.85 * (p / this.REF_PRESSURE);

    const estimated = this.REF_SPRING_RATE * aspectFactor * widthFactor * pressureFactor;
    return roundN(Math.max(100, Math.min(500, estimated)), 0);
  }

  /**
   * 從規格字串解析前後輪胎規格
   * 支援格式：
   *   "F: 235/40 R18 / R: 295/30 R18"
   *   "265/30ZR19"
   *   "205/55R16 (base) / 215/45R17"
   *   "F: 225/40 ZR18 / R: 225/40 ZR18"
   * @param {string} sizeStr - OEM tire size string
   * @returns {{front: {width,aspect,rim}, rear: {width,aspect,rim}}}
   */
  static parseTireSize(sizeStr) {
    if (!sizeStr) return null;

    const result = { front: null, rear: null };

    // Try F: / R: format first
    const fMatch = sizeStr.match(/F:\s*(\d+)\/(\d+)\s*Z?R(\d+)/i);
    const rMatch = sizeStr.match(/R:\s*(\d+)\/(\d+)\s*Z?R(\d+)/i);

    if (fMatch && rMatch) {
      result.front = { width: +fMatch[1], aspect: +fMatch[2], rim: +fMatch[3] };
      result.rear = { width: +rMatch[1], aspect: +rMatch[2], rim: +rMatch[3] };
      return result;
    }

    // Try single spec (same front/rear) - "265/30ZR19" or "215/40R18"
    const singleMatch = sizeStr.match(/(\d+)\/(\d+)\s*Z?R(\d+)/i);
    if (singleMatch) {
      const spec = { width: +singleMatch[1], aspect: +singleMatch[2], rim: +singleMatch[3] };
      result.front = { ...spec };
      result.rear = { ...spec };
      return result;
    }

    return null;
  }

  /**
   * 從 OEM 規格字串直接估算前後彈簧率
   * @param {string} sizeStr - OEM tire size string
   * @returns {{front_spring_rate: number, rear_spring_rate: number, front_spec: object, rear_spec: object}|null}
   */
  static estimateFromString(sizeStr) {
    const parsed = this.parseTireSize(sizeStr);
    if (!parsed) return null;

    return {
      front_spring_rate: this.estimate(parsed.front.width, parsed.front.aspect),
      rear_spring_rate: this.estimate(parsed.rear.width, parsed.rear.aspect),
      front_spec: parsed.front,
      rear_spec: parsed.rear,
    };
  }

  /**
   * 計算換框（升級輪圈）後的輪胎規格變化
   * 保持外徑不變，重新計算扁平比
   * @param {object} originalSpec - {width, aspect, rim}
   * @param {number} newRimSize - 新輪圈直徑 (inches)
   * @param {number} newWidth - 新胎寬 (mm), optional
   * @returns {{width, aspect, rim, original_diameter, new_diameter, spring_rate, diameter_change_mm}}
   */
  static calculateWheelUpgrade(originalSpec, newRimSize, newWidth) {
    if (!originalSpec) return null;

    const w0 = originalSpec.width;
    const a0 = originalSpec.aspect;
    const r0 = originalSpec.rim;

    // 原始外徑 (mm)
    // 外徑 = 輪圈直徑(mm) + 2 × 胎壁高度
    // 胎壁高度 = 胎寬 × 扁平比 / 100
    const originalDiameter = r0 * 25.4 + 2 * (w0 * a0 / 100);

    const nw = newWidth || w0;
    const nr = newRimSize;

    // 保持外徑不變，反算新扁平比
    // originalDiameter = nr * 25.4 + 2 * (nw * newAspect / 100)
    // newAspect = (originalDiameter - nr * 25.4) / (2 * nw) * 100
    const newSidewallHeight = (originalDiameter - nr * 25.4) / 2;
    const newAspect = Math.round(newSidewallHeight / nw * 100);

    // 如果扁平比不合理（< 20 或 > 70），提示不適合
    if (newAspect < 20 || newAspect > 70) {
      return {
        error: true,
        message: `計算出的扁平比 ${newAspect} 不在合理範圍（20-70），此輪圈尺寸不適用`,
        width: nw, aspect: newAspect, rim: nr,
      };
    }

    const newDiameter = nr * 25.4 + 2 * (nw * newAspect / 100);
    const springRate = this.estimate(nw, newAspect);

    return {
      width: nw,
      aspect: newAspect,
      rim: nr,
      original_diameter: roundN(originalDiameter, 1),
      new_diameter: roundN(newDiameter, 1),
      diameter_change_mm: roundN(newDiameter - originalDiameter, 1),
      spring_rate: springRate,
      sidewall_height: roundN(newSidewallHeight, 1),
      original_sidewall: roundN(w0 * a0 / 100, 1),
      sidewall_change_pct: roundN((newSidewallHeight - w0 * a0 / 100) / (w0 * a0 / 100) * 100, 1),
    };
  }

  /**
   * 常見升級輪圈選項，根據原始輪圈大小產生建議
   * @param {number} originalRim - 原始輪圈尺寸
   * @returns {number[]} 建議的輪圈尺寸列表
   */
  static suggestRimSizes(originalRim) {
    const sizes = [];
    for (let r = Math.max(15, originalRim - 1); r <= Math.min(22, originalRim + 2); r++) {
      sizes.push(r);
    }
    return sizes;
  }
}
