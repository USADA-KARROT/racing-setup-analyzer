/**
 * Lihpao Lap-Time Simulator — 麗寶 G2 單圈時間模擬器
 *
 * 兩層模型：
 *   (1) Quasi-static point-mass lap sim (GG-diagram)：從車輛抓地/空力/動力/質量，
 *       在麗寶 G2 彎道序列上算出單圈時間。
 *   (2) Tire stint evolution：胎溫/胎壓隨圈數演化 → 抓地力隨之變化 → 找出
 *       「胎壓甜蜜點」出現在第幾圈、最快單圈在第幾圈、逐圈圈速表。
 *
 * 物理依據：
 *   - 過彎極速：μ·(m·g + ½ρ·ClA·v²) = m·v²/r  (含空力下壓力，對 v² 解二次)
 *   - 直線：F = min(P/v, μ·N) − ½ρ·CdA·v² − rolling，前向/後向積分 + 煞車
 *   - 胎壓溫度：P_hot = P_cold·(T_carcass+273)/(T_amb+273) (理想氣體)
 *   - 抓地隨溫度/壓力：沿用 TireModel.gripFactorTemperature / gripFactorPressure
 *
 * 麗寶 G2 幾何為「代表性 + 對標校準」(GR Yaris ≈ 1:50)，非實測座標；
 * 對 setup 變化的「相對」反應正確，絕對值已對標真實圈速。
 */

// ============================================================
// 麗寶 G2 賽道模型 (3.500 km, 23 turns, Houli Taichung)
// 以「速度決定彎」+ 連接直線表示。半徑為代表值(校準至真實圈速)。
// 來源：racingcircuits.info / 51gt3 / FastestLaps；GR Yaris 1:50.89 對標。
// ============================================================
const LIHPAO_G2 = {
  name: 'Lihpao International Circuit (G2)',
  name_zh: '麗寶國際賽車場 G2',
  length_m: 3500,
  turns: 23,
  // 半徑校準係數：代表性幾何對標真實圈速。校準點(k=1.1)：
  //   改裝半熱熔 GR Yaris(mu≈1.25/220kW) → 1:50.5 ≈ 真實紀錄 1:50.89(蘇彥銘)
  //   原廠街胎 GR Yaris(mu≈1.0) → ~2:00(較慢，符合「紀錄車多為改裝」的事實)
  // 絕對圈速取決於輸入規格(動力/抓地/空力/質量/改裝)，改裝車會正確預測更快。
  radius_scale: 1.1,
  // 段落序列(繞一圈)：corner = 過彎(半徑 m)，straight = 直線(長度 m)
  // 23 彎多為複合彎，這裡以 ~13 個速度決定點 + 連接直線表示，總長對齊 3500m。
  // 麗寶特徵：1 條主直線(~900m)、數個 hairpin、技術型中低速彎、Fire 區大落差。
  segments: [
    { type: 'straight', length: 920 },               // 主直線 (start/finish)
    { type: 'corner', radius: 28,  arc: 55,  name: 'T1 重煞 hairpin' },
    { type: 'straight', length: 150 },
    { type: 'corner', radius: 60,  arc: 70,  name: 'T2-3 中速複合' },
    { type: 'straight', length: 110 },
    { type: 'corner', radius: 40,  arc: 60,  name: 'T4 中低速' },
    { type: 'straight', length: 180 },
    { type: 'corner', radius: 22,  arc: 45,  name: 'T5 緊 hairpin' },
    { type: 'straight', length: 130 },
    { type: 'corner', radius: 75,  arc: 90,  name: 'T6-7 高速' },
    { type: 'straight', length: 90 },
    { type: 'corner', radius: 35,  arc: 55,  name: 'T8 Fire 區下坡' },
    { type: 'straight', length: 120 },
    { type: 'corner', radius: 50,  arc: 65,  name: 'T9-10 中速' },
    { type: 'straight', length: 95 },
    { type: 'corner', radius: 25,  arc: 50,  name: 'T11 緊彎' },
    { type: 'straight', length: 160 },
    { type: 'corner', radius: 90,  arc: 80,  name: 'T12-13 高速' },
    { type: 'straight', length: 100 },
    { type: 'corner', radius: 45,  arc: 60,  name: 'T14-15 中速' },
    { type: 'straight', length: 110 },
    { type: 'corner', radius: 30,  arc: 50,  name: 'T16 中低速' },
    { type: 'straight', length: 85 },
    { type: 'corner', radius: 55,  arc: 70,  name: 'T17-18 中速' },
    { type: 'straight', length: 90 },
    { type: 'corner', radius: 20,  arc: 45,  name: 'T19 最緊 hairpin' },
    { type: 'straight', length: 140 },
    { type: 'corner', radius: 65,  arc: 75,  name: 'T20-21 中高速' },
    { type: 'straight', length: 100 },
    { type: 'corner', radius: 38,  arc: 55,  name: 'T22-23 末段複合 → 主直線' },
  ],
};

// 動力/阻力預設(依車輛類別，可被 preset 覆寫)
const POWER_DEFAULTS_KW = {
  hot_hatch: 190, sports_car: 240, super_car: 440, gt3: 375,
  sedan: 150, kei: 47, electric: 300, hypercar: 700,
};

// ============================================================
// 單圈模擬器
// ============================================================
class LihpaoLapSim {
  /**
   * @param {Object} car
   *   mass_kg, power_kw, drivetrain ('FWD'|'RWD'|'AWD')
   *   mu  : 輪胎峰值摩擦係數(已含抓地因子，~0.9-1.6)
   *   ClA : 下壓力面積係數 (CzF+CzR 等效，m²；road car ~0, 賽車 1-4)
   *   CdA : 阻力面積 (m²；~0.6-1.0)
   *   balance_penalty : 0-1，平衡偏離中性的圈速懲罰(轉向過度/不足都慢)
   * @param {Object} track  預設 LIHPAO_G2
   */
  constructor(car, track) {
    this.car = car;
    this.track = track || LIHPAO_G2;
    this.dx = 5; // m，離散步長
    this.RHO = 1.225;
    this.G = 9.81;
  }

  /** 過彎極速 (m/s)：μ·(m·g + ½ρ·ClA·v²) = m·v²/r → 對 v² 解二次 */
  cornerSpeed(r) {
    const { mass_kg, mu, ClA } = this.car;
    const m = mass_kg, g = this.G;
    // (m/r − ½ρ·ClA·μ) v² = μ·m·g
    const a = m / r - 0.5 * this.RHO * (ClA || 0) * mu;
    if (a <= 0) return 120; // 下壓力主導，極高(封頂 432km/h)
    return Math.min(Math.sqrt(mu * m * g / a), 120);
  }

  /** 在速度 v 下可用的縱向加速度 (m/s²)：動力/抓地取小，扣阻力 */
  accelAt(v) {
    const { mass_kg, power_kw, mu, ClA } = this.car;
    const m = mass_kg;
    const Fpower = v > 1 ? (power_kw * 1000 * 0.9) / v : (power_kw * 1000 * 0.9); // 0.9 傳動效率
    const N = m * this.G + 0.5 * this.RHO * (ClA || 0) * v * v;
    const tractionFrac = this.car.drivetrain === 'AWD' ? 1.0 : 0.62; // 驅動軸荷重比
    const Ftraction = mu * N * tractionFrac;
    const Fdrag = 0.5 * this.RHO * (this.car.CdA || 0.7) * v * v;
    const Froll = 0.015 * m * this.G;
    return (Math.min(Fpower, Ftraction) - Fdrag - Froll) / m;
  }

  /** 煞車減速度 (m/s²，正值)：抓地全用於減速 + 阻力幫忙 */
  brakeAt(v) {
    const { mass_kg, mu, ClA } = this.car;
    const m = mass_kg;
    const N = m * this.G + 0.5 * this.RHO * (ClA || 0) * v * v;
    const Fbrake = mu * N * 0.95; // 0.95：煞車略保留
    const Fdrag = 0.5 * this.RHO * (this.car.CdA || 0.7) * v * v;
    return (Fbrake + Fdrag) / m;
  }

  /** 把賽道離散成每 dx 一點，回傳每點的曲率極速上限 (m/s) */
  buildSpeedCap() {
    const cap = [], meta = [];
    const rScale = this.track.radius_scale || 1.0;
    for (const seg of this.track.segments) {
      const len = seg.type === 'corner' ? seg.arc : seg.length;
      const n = Math.max(1, Math.round(len / this.dx));
      const vcap = seg.type === 'corner' ? this.cornerSpeed(seg.radius * rScale) : 999;
      for (let i = 0; i < n; i++) { cap.push(vcap); meta.push(seg.type === 'corner' ? seg.name : null); }
    }
    return { cap, meta };
  }

  /** 一圈時間 (s)：前向加速 + 後向煞車收斂 */
  lapTime() {
    const { cap } = this.buildSpeedCap();
    const N = cap.length, dx = this.dx;
    const v = cap.slice();
    // 多次前向/後向掃描收斂(封閉迴圈)
    for (let pass = 0; pass < 4; pass++) {
      // 前向：加速限制
      for (let i = 1; i < N; i++) {
        const vmax = Math.sqrt(Math.max(0, v[(i - 1 + N) % N] ** 2 + 2 * this.accelAt(v[(i - 1 + N) % N]) * dx));
        v[i] = Math.min(v[i], cap[i], vmax);
      }
      // 環狀接續
      const v0 = Math.sqrt(Math.max(0, v[N - 1] ** 2 + 2 * this.accelAt(v[N - 1]) * dx));
      v[0] = Math.min(v[0], cap[0], v0);
      // 後向：煞車限制
      for (let i = N - 2; i >= 0; i--) {
        const vmax = Math.sqrt(Math.max(0, v[i + 1] ** 2 + 2 * this.brakeAt(v[i + 1]) * dx));
        v[i] = Math.min(v[i], vmax);
      }
      const vEnd = Math.sqrt(Math.max(0, v[0] ** 2 + 2 * this.brakeAt(v[0]) * dx));
      v[N - 1] = Math.min(v[N - 1], vEnd);
    }
    let t = 0, vmaxSeen = 0;
    for (let i = 0; i < N; i++) {
      const vi = Math.max(v[i], 5);
      t += dx / vi;
      vmaxSeen = Math.max(vmaxSeen, vi);
    }
    // 平衡懲罰：偏離中性越多越慢(駕駛要修正、無法全力)
    const bp = this.car.balance_penalty || 0;
    t *= (1 + bp);
    return { lap_s: t, v_max_kmh: vmaxSeen * 3.6, avg_kmh: this.track.length_m / t * 3.6 };
  }
}

// ============================================================
// Tire stint 演化模型 — 胎溫/胎壓隨圈數 → 抓地力 → 逐圈圈速、甜蜜點
// ============================================================
class LihpaoStintSim {
  /**
   * @param {Object} car  同 LihpaoLapSim 的 car，但 mu 在此會逐圈重算
   *   base_mu : 輪胎峰值摩擦(不含溫壓因子)，= peak_grip × 寬度因子
   *   compound : 胎種 id (查 TRACKDAY_TIRES 取 optimal_temp/window/optimal_pressure)
   *   cold_pressure_bar : 起跑冷胎壓
   *   optimal_pressure_bar : 該胎熱胎壓甜蜜點(DB 值)
   * @param {Object} env  ambient_c, track_c
   * @param {Object} stint  laps, fuel_start_kg, fuel_per_lap_kg
   */
  constructor(car, env, stint) {
    this.car = car;
    this.env = env || { ambient_c: 28, track_c: 38 };
    this.stint = Object.assign({ laps: 16, fuel_start_kg: 40, fuel_per_lap_kg: 2.0 }, stint || {});
  }

  /** 第 lap 圈的胎核心溫度 (°C)：一階趨近工作平衡溫 */
  tireTemp(lap) {
    const trackC = this.env.track_c;
    const optT = this.car.optimal_temp ?? 70;
    // 工作平衡溫 = 路溫做功升溫 與 輪胎設計溫 的加權(輪胎為自身最佳溫設計，
    // 不會無條件大幅過熱；街胎 optT 低→偏熱、賽胎 optT 高→需充分暖胎)
    const Teq = 0.55 * (trackC + 44) + 0.45 * optT;
    const Tstart = this.env.ambient_c + 5; // 出 pit 微溫
    const tau = 1.6; // 圈，時間常數(~3-4 圈到平衡)
    return Teq + (Tstart - Teq) * Math.exp(-(lap - 1) / tau);
  }

  /** 第 lap 圈的熱胎壓 (bar)：理想氣體，冷壓×溫比 */
  hotPressure(lap) {
    const Tc = this.tireTemp(lap);
    // 胎內氣體溫 ≈ 核心溫 − 偏移；冷壓基準為環境溫
    const Tgas = Tc - 8;
    const Tcold = this.env.ambient_c;
    return this.car.cold_pressure_bar * (Tgas + 273.15) / (Tcold + 273.15);
  }

  /** 逐圈模擬：回傳每圈 {lap, temp, pressure, grip, mass, lap_s} + 摘要 */
  run() {
    const laps = this.stint.laps;
    const out = [];
    const optT = this.car.optimal_temp ?? 70;
    const optWin = this.car.temp_window ?? 22;
    const optP = this.car.optimal_pressure_bar ?? 1.9;
    const treadwear = this.car.treadwear ?? 200;
    // 磨耗退化率：軟胎(低 treadwear)退得快
    const wearPerLap = 0.004 * (200 / Math.max(40, treadwear));

    let sweetPressureLap = null, peakGripLap = 1, peakGrip = 0;
    for (let lap = 1; lap <= laps; lap++) {
      const T = this.tireTemp(lap);
      const P = this.hotPressure(lap);
      // 抓地「相對因子」(0-1, 1.0=最佳)：沿用鐘形溫度曲線+壓力曲線，但除掉 peak
      // (peak 已含在 base_mu，否則重複計算)；冷胎仍有 ~55% 抓地，設地板避免 out-lap 失真
      const peak = this.car.peak_grip || 1.0;
      let gTempNorm = 1, gPres = 1;
      if (typeof TireModel !== 'undefined') {
        gTempNorm = TireModel.gripFactorTemperature(T, this.car.compound) / peak;
        gPres = TireModel.gripFactorPressure(P, optP);
      } else {
        gTempNorm = Math.exp(-0.5 * ((T - optT) / optWin) ** 2);
        gPres = Math.max(0.5, 1 - 0.2 * Math.abs(P - optP));
      }
      gTempNorm = Math.max(0.55, gTempNorm); // 冷胎地板 ~55%
      // 磨耗(峰值後累積)
      const wear = Math.max(0, lap - 2) * wearPerLap;
      const grip = Math.max(0.4, gTempNorm * gPres - wear); // 1.0 = 該胎峰值(=base_mu)

      // 該圈質量(燃油遞減)
      const fuel = Math.max(0, this.stint.fuel_start_kg - (lap - 1) * this.stint.fuel_per_lap_kg);
      const mass = this.car.dry_mass_kg + fuel;

      // 該圈單圈時間
      const sim = new LihpaoLapSim({
        ...this.car,
        mass_kg: mass,
        mu: this.car.base_mu * grip,
      });
      const lapRes = sim.lapTime();

      // 胎壓甜蜜點：熱壓首次進入 optimal ±0.07 bar
      if (sweetPressureLap === null && Math.abs(P - optP) <= 0.07) sweetPressureLap = lap;
      if (grip > peakGrip) { peakGrip = grip; peakGripLap = lap; }

      out.push({
        lap, temp_c: roundN(T, 1), pressure_bar: roundN(P, 2),
        grip_factor: roundN(grip, 4), mass_kg: roundN(mass, 1),
        lap_s: roundN(lapRes.lap_s, 3), v_max_kmh: roundN(lapRes.v_max_kmh, 1),
        in_window: Math.abs(T - optT) <= optWin && Math.abs(P - optP) <= 0.1,
      });
    }

    // 最快單圈
    let fastest = out[0];
    for (const r of out) if (r.lap_s < fastest.lap_s) fastest = r;

    // 建議冷胎壓：讓熱壓在第 ~3 圈(暖胎完成)落在 optimal
    // P_hot(lap3) = cold × (Tgas3+273)/(Tamb+273) = optP → cold = optP × (Tamb+273)/(Tgas3+273)
    const Tgas3 = this.tireTemp(3) - 8;
    const recommendedCold = optP * (this.env.ambient_c + 273.15) / (Tgas3 + 273.15);

    return {
      laps: out,
      fastest_lap: fastest.lap,
      fastest_time_s: fastest.lap_s,
      fastest_time_str: fmtLap(fastest.lap_s),
      sweet_pressure_lap: sweetPressureLap,
      peak_grip_lap: peakGripLap,
      recommended_cold_pressure_bar: roundN(recommendedCold, 2),
      degradation_onset_lap: peakGripLap, // 峰值後開始退化
      optimal_pressure_bar: optP,
      optimal_temp_c: optT,
    };
  }
}

// ============================================================
// 銜接層：把使用者的車輛/輪胎 setup → 單圈模擬輸入 → 跑 stint
// ============================================================
/**
 * @param {Object} setup
 *   params      : Tier1/3 的底盤參數(total_weight, weight_front_pct, layout 等)
 *   tireParams  : 胎參數(front_compound, front_tire_width, *_pressure 等)
 *   advParams   : Tier3 進階(aero coeff, camber...)；可省略
 *   layout      : 'FWD'|'RWD'|'AWD'
 *   power_kw    : 引擎功率(必填或由類別預設)
 *   category    : 車輛類別(取功率預設)
 *   env         : {ambient_c, track_c}
 *   stint       : {laps, fuel_start_kg, fuel_per_lap_kg, cold_pressure_bar}
 */
function simulateLihpao(setup) {
  const p = setup.params || {};
  const tp = setup.tireParams || {};
  const ap = setup.advParams || {};

  // 1) 平衡 + 抓地：跑現有模型
  let bal = 0, gripFactorRef = 1.0;
  try {
    const t = new Tier3Complete(p, tp, ap).calculate();
    bal = t.prediction?.steady_state?.understeer_gradient ?? 0;
  } catch (e) {
    try { bal = new Tier1BasicBalance(p).calculate().understeer_gradient; } catch (_) {}
  }

  // 2) 輪胎峰值摩擦(不含溫壓)：peak_grip × 寬度因子
  const compound = tp.front_compound || 'medium';
  let peak = 1.0, optTemp = 70, optWin = 22, optP = 1.9, treadwear = 200;
  if (typeof TRACKDAY_TIRES !== 'undefined' && TRACKDAY_TIRES[compound]) {
    const td = TRACKDAY_TIRES[compound];
    peak = td.peak_grip; optTemp = td.optimal_temp; optWin = td.temp_window;
    optP = td.optimal_pressure_front_bar; treadwear = td.treadwear;
  } else if (typeof TireModel !== 'undefined' && TireModel.COMPOUNDS[compound]) {
    peak = TireModel.COMPOUNDS[compound][2]; optTemp = TireModel.COMPOUNDS[compound][0];
    optWin = TireModel.COMPOUNDS[compound][1];
  }
  const widthFactor = (tp.front_tire_width > 0 && typeof TireModel !== 'undefined')
    ? TireModel.gripFactorWidth(tp.front_tire_width) : 1.0;
  const base_mu = peak * widthFactor;

  // 3) 空力面積：Cz 係數 → ClA 等效(road car ~0；有輸入才算)
  const czf = ap.front_downforce_coeff ?? 0, czr = ap.rear_downforce_coeff ?? 0;
  const area = ap.frontal_area ?? 1.8;
  const ClA = (czf + czr) > 0 ? (czf + czr) : 0;
  const CdA = area * 0.34; // 估：Cd≈0.34 × 正面積

  // 4) 平衡懲罰：偏離中性越多越慢(最多 ~4%)
  const balance_penalty = Math.min(0.04, Math.abs(bal) * 0.012);

  // 5) 動力 + 佈局
  const layout = setup.layout || p.layout || 'RWD';
  const drivetrain = /AWD|4WD/i.test(layout) ? 'AWD' : (/^F/i.test(layout) ? 'FWD' : 'RWD');
  const power_kw = setup.power_kw || POWER_DEFAULTS_KW[setup.category] || 200;

  const dryMass = p.total_weight ?? 1300;
  const env = setup.env || { ambient_c: 28, track_c: 38 };
  const stint = setup.stint || {};
  const coldP = stint.cold_pressure_bar ?? (tp.fl_pressure ?? optP - 0.25);

  const car = {
    dry_mass_kg: dryMass, power_kw, drivetrain,
    base_mu, peak_grip: peak, ClA, CdA, balance_penalty,
    compound, optimal_temp: optTemp, temp_window: optWin,
    optimal_pressure_bar: optP, treadwear,
    cold_pressure_bar: coldP,
  };

  const result = new LihpaoStintSim(car, env, stint).run();
  result.inputs = {
    base_mu: roundN(base_mu, 3), ClA: roundN(ClA, 2), CdA: roundN(CdA, 2),
    power_kw, drivetrain, dry_mass_kg: dryMass, balance_us_deg_g: roundN(bal, 2),
    balance_penalty_pct: roundN(balance_penalty * 100, 1), cold_pressure_bar: roundN(coldP, 2),
    track: LIHPAO_G2.name_zh,
  };
  return result;
}

/** 秒 → m:ss.mmm */
function fmtLap(s) {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(3)}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LIHPAO_G2, POWER_DEFAULTS_KW, LihpaoLapSim, LihpaoStintSim, simulateLihpao, fmtLap };
}
