/**
 * 動力學模型迴歸測試 — 驗證公式與教科書一致
 * 執行: npm test  (或 node tests/verify-dynamics.js)
 *
 * 驗證來源:
 *   - Milliken & Milliken, Race Car Vehicle Dynamics
 *   - Gillespie, Fundamentals of Vehicle Dynamics (ch.6: K_us, 特徵/臨界速度, yaw gain)
 *   - OptimumG Tech Tips 1 & 2 (ride frequency, roll gradient, 阻尼比)
 *   - Suspension Secrets (axle roll stiffness K = k_w·t²/2)
 *   - 實測: 255/40R17 RE-71R 垂直剛性 ≈ 250 N/mm
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src =
  fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'lihpao-laptime.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'tir-parser.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'kinematics.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'transient.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-parser.js'), 'utf8') + '\n' +
  'this.__exports = { Tier1BasicBalance, Tier2TireAware, Tier3Complete, TireModel, ' +
  'PacejkaTireModel, SetupAdvisor, SpringCalculator, TireSpringEstimator, ' +
  'compareWithBaseline, roundN, TRACKDAY_TIRES, ' +
  'parseTIR, mfFy0, tireCharacteristics, ' +
  'solveStatic, solveAtTravel, kinematicsSweep, ' +
  'transient2DOF, estimateIz, ' +
  'parseBmsHeader, parseBmsCatalog, parseBms, ' +
  'CAL, CALIBRATION, ' +
  'LIHPAO_G2, LihpaoLapSim, LihpaoStintSim, simulateLihpao };';

const ctx = {};
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'combined.js' });
const M = ctx.__exports;

const G = 9.81;
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
function approx(a, b, tolPct) {
  return Math.abs(a - b) <= Math.abs(b) * (tolPct / 100);
}

// ── 測試車：Porsche 996 GT3 preset ──
const gt3 = {
  front_spring_rate: 40, rear_spring_rate: 95,
  front_arb: 180, rear_arb: 80,
  front_track: 1485, rear_track: 1495,
  front_motion_ratio: 1.0, rear_motion_ratio: 0.90,
  weight_front_pct: 38.0, total_weight: 1380,
  cg_height: 470, wheelbase: 2355,
};

console.log('\n[1] 軸側傾剛性 K = k_w·t²/2 (Milliken / Suspension Secrets)');
{
  const t1 = new M.Tier1BasicBalance(gt3).calculate();
  // 前彈簧（不含輪胎、不含 ARB）: 40 N/mm × (1.485 m)² / 2 → Nm/deg
  const expected = 40000 * 1.485 * 1.485 / 2 * (Math.PI / 180);
  check('前彈簧側傾剛性 = k·t²/2', approx(t1.front_roll_stiffness_spring, expected, 0.5),
    `got ${t1.front_roll_stiffness_spring}, want ${expected.toFixed(1)}`);
  // 輪胎串聯後總剛性必須小於 (彈簧+ARB) 懸吊剛性
  check('輪胎串聯後總剛性 < 懸吊剛性', t1.front_roll_stiffness_total < t1.front_roll_stiffness_spring + 180);
}

console.log('\n[2] Roll gradient 量級 (OptimumG: 街車 ~3-6°/g, 高下壓力賽車 0.2-0.7°/g)');
{
  const t1 = new M.Tier1BasicBalance(gt3).calculate();
  check('GT3 roll gradient 在 1.5-5 °/g 合理區間', t1.roll_gradient_deg_per_g > 1.5 && t1.roll_gradient_deg_per_g < 5,
    `got ${t1.roll_gradient_deg_per_g}`);
  // 軟彈簧街車應比硬彈簧賽車側傾大
  const soft = new M.Tier1BasicBalance({ ...gt3, front_spring_rate: 25, rear_spring_rate: 35, front_arb: 0, rear_arb: 0 }).calculate();
  check('軟彈簧 → roll gradient 更大', soft.roll_gradient_deg_per_g > t1.roll_gradient_deg_per_g);
}

console.log('\n[3] ARB sizing 單位一致性 (Nm/deg)');
{
  const t1 = new M.Tier1BasicBalance(gt3).calculate();
  const arb = M.SpringCalculator.arbSizing(1380, 470, 2.0, 55,
    t1.front_roll_stiffness_spring, t1.rear_roll_stiffness_spring);
  // 目標 2°/g: K_needed = m·g·h / 2 = 1380×9.81×0.47/2 ≈ 3182 Nm/deg
  check('total_roll_needed ≈ m·g·h/target', approx(arb.total_roll_needed, 1380 * G * 0.47 / 2, 1),
    `got ${arb.total_roll_needed}`);
  check('front_arb_needed 在現實範圍 (< 3000 Nm/deg)', arb.front_arb_needed < 3000,
    `got ${arb.front_arb_needed}`);
  check('current_roll_gradient 在現實範圍 (< 15 °/g)', arb.current_roll_gradient < 15,
    `got ${arb.current_roll_gradient}`);
}

console.log('\n[4] 線性自行車模型 (Gillespie ch.6)');
{
  const adv = { fl_weight: 262, fr_weight: 262, rl_weight: 428, rr_weight: 428, speed_kmh: 0, damper_ref_speed: 0.3,
    front_bump_force: 80, front_rebound_force: 120, rear_bump_force: 100, rear_rebound_force: 150,
    front_camber_deg: -3.0, rear_camber_deg: -2.0 };
  const t3 = new M.Tier3Complete(gt3, {}, adv).calculate();
  const d = t3.dynamics;
  check('滑移角@1g 在 2-10° 物理範圍', d.slip_angle_front_deg > 2 && d.slip_angle_front_deg < 10
    && d.slip_angle_rear_deg > 2 && d.slip_angle_rear_deg < 10,
    `got F ${d.slip_angle_front_deg}° / R ${d.slip_angle_rear_deg}°`);
  // K_us = α_f − α_r (Gillespie eq. 6-10)
  check('K_us = W_f/C_f − W_r/C_r', approx(d.understeer_gradient_linear_deg_g,
    d.slip_angle_front_deg - d.slip_angle_rear_deg, 2),
    `got ${d.understeer_gradient_linear_deg_g}`);
  // 特徵/臨界速度互斥且符合 V = √(g·L/|K|)
  const kRad = d.understeer_gradient_linear_deg_g * Math.PI / 180;
  if (kRad > 0) {
    const vChar = Math.sqrt(G * 2.355 / kRad) * 3.6;
    check('特徵速度 = √(g·L/K_us)', d.characteristic_speed_kmh != null && approx(d.characteristic_speed_kmh, vChar, 2));
    check('K_us>0 時無臨界速度', d.critical_speed_kmh == null);
  } else {
    const vCrit = Math.sqrt(G * 2.355 / -kRad) * 3.6;
    check('臨界速度 = √(g·L/|K_us|)', d.critical_speed_kmh != null && approx(d.critical_speed_kmh, vCrit, 2));
    check('K_us<0 時無特徵速度', d.characteristic_speed_kmh == null);
  }
  // Yaw gain: r/δ = V/(L + K·V²/g)，若高於臨界速度則為 null
  const V = 100 / 3.6;
  const denom = 2.355 + kRad * V * V / G;
  if (denom > 0.01) {
    check('Yaw gain = V/(L + K·V²/g)', d.yaw_gain_at_100kmh != null && approx(d.yaw_gain_at_100kmh, V / denom, 2),
      `got ${d.yaw_gain_at_100kmh}, want ${(V / denom).toFixed(3)}`);
  } else {
    check('超過臨界速度時 yaw gain = null', d.yaw_gain_at_100kmh == null);
  }
  // 50/50 對稱車 → K_us ≈ 0（同胎寬同 camber 時前後抓地相同）
  // 注意：角落重量優先於 slider，所以這裡也要給對稱的角落重量
  const sym = new M.Tier3Complete({ ...gt3, weight_front_pct: 50 }, {},
    { ...adv, fl_weight: 345, fr_weight: 345, rl_weight: 345, rr_weight: 345,
      front_camber_deg: -2, rear_camber_deg: -2 }).calculate();
  check('50/50 車 K_us ≈ 0', Math.abs(sym.dynamics.understeer_gradient_linear_deg_g) < 0.05,
    `got ${sym.dynamics.understeer_gradient_linear_deg_g}`);
}

console.log('\n[5] 阻尼比 (OptimumG Tech Tip 2: 賽車 ζ ≈ 0.65-0.7)');
{
  const adv = { fl_weight: 262, fr_weight: 262, rl_weight: 428, rr_weight: 428, damper_ref_speed: 0.3,
    front_bump_force: 80, front_rebound_force: 120, rear_bump_force: 100, rear_rebound_force: 150 };
  const t3 = new M.Tier3Complete(gt3, {}, adv).calculate();
  check('heave 阻尼比在 0.2-1.2 現實範圍', t3.damping.front_ratio > 0.2 && t3.damping.front_ratio < 1.2
    && t3.damping.rear_ratio > 0.2 && t3.damping.rear_ratio < 1.2,
    `got F ${t3.damping.front_ratio} / R ${t3.damping.rear_ratio}`);
  check('側傾阻尼比在 0.1-1.5 現實範圍', t3.damping.roll_damping_ratio > 0.1 && t3.damping.roll_damping_ratio < 1.5,
    `got ${t3.damping.roll_damping_ratio}`);
  // 參考速度越高（同樣力）→ c 越小 → ζ 越小
  const t3b = new M.Tier3Complete(gt3, {}, { ...adv, damper_ref_speed: 0.6 }).calculate();
  check('參考速度加倍 → ζ 減半', approx(t3b.damping.front_ratio, t3.damping.front_ratio / 2, 3));
}

console.log('\n[6] 空力方向 (front-biased downforce → 高速轉向過度)');
{
  const advBase = { fl_weight: 250, fr_weight: 250, rl_weight: 250, rr_weight: 250, speed_kmh: 200, frontal_area: 2.0 };
  const frontHeavy = new M.Tier3Complete({ ...gt3, weight_front_pct: 50 }, {},
    { ...advBase, front_downforce_coeff: 0.8, rear_downforce_coeff: 0.2 }).calculate();
  const rearHeavy = new M.Tier3Complete({ ...gt3, weight_front_pct: 50 }, {},
    { ...advBase, front_downforce_coeff: 0.2, rear_downforce_coeff: 0.8 }).calculate();
  check('前偏空力 → aero_us_shift < 0 (轉向過度)', frontHeavy.aero.aero_us_shift < 0,
    `got ${frontHeavy.aero.aero_us_shift}`);
  check('後偏空力 → aero_us_shift > 0 (轉向不足)', rearHeavy.aero.aero_us_shift > 0,
    `got ${rearHeavy.aero.aero_us_shift}`);
}

console.log('\n[7] Toe 慣例 (+ = toe-in)');
{
  const adv = { fl_weight: 250, fr_weight: 250, rl_weight: 250, rr_weight: 250 };
  const frontToeIn = new M.Tier3Complete(gt3, {}, { ...adv, front_toe_deg: 0.3, rear_toe_deg: 0 }).calculate();
  const rearToeIn = new M.Tier3Complete(gt3, {}, { ...adv, front_toe_deg: 0, rear_toe_deg: 0.3 }).calculate();
  check('前 toe-in → 更轉向不足', frontToeIn.geometry.toe_us_shift > 0);
  check('後 toe-in → 更轉向不足(穩定)', rearToeIn.geometry.toe_us_shift > 0);
}

console.log('\n[8] Cross weight (FL+RR 分析對角，作者刻意設計)');
{
  const adv = { fl_weight: 260, fr_weight: 240, rl_weight: 240, rr_weight: 260 };
  const t3 = new M.Tier3Complete(gt3, {}, adv).calculate();
  check('cross = (FL+RR)/total', approx(t3.corner_weight.cross_weight_pct, 52, 0.1),
    `got ${t3.corner_weight.cross_weight_pct}`);
}

console.log('\n[9] Flat ride 規則 (Olley: 後/前 ≈ 1.10-1.20)');
{
  // 後軸頻率明顯低於前軸 → 應觸發 Rule 1，且目標是「後/前 = 1.10」
  const lowRear = { ...gt3, front_spring_rate: 80, rear_spring_rate: 30, rear_motion_ratio: 1.0 };
  const t1 = new M.Tier1BasicBalance(lowRear).calculate();
  const advice = M.SetupAdvisor.analyze(t1, 1, lowRear);
  const rule1 = advice.suggestions.find(s => s.values && s.values.target_ratio != null);
  check('後/前比值過低觸發建議', !!rule1, `ratio=${t1.ride_frequency.ratio}`);
  if (rule1) {
    check('目標比值 = 1.10 (後高於前)', rule1.values.target_ratio === 1.10);
    check('建議調整「後」彈簧', rule1.values.target_rear_spring != null);
  }
}

console.log('\n[10] 輪胎垂直彈簧率估算 (實測校準)');
{
  const k1 = M.TireSpringEstimator.estimate(255, 40); // RE-71R 實測 ≈ 250 N/mm
  check('255/40 估算 ≈ 250 N/mm (±10%)', approx(k1, 250, 10), `got ${k1}`);
  const k2 = M.TireSpringEstimator.estimate(205, 55); // 基準
  check('205/55 ≈ 220 N/mm 基準', approx(k2, 220, 3), `got ${k2}`);
  const kLow = M.TireSpringEstimator.estimate(255, 40, 1.8);
  const kHigh = M.TireSpringEstimator.estimate(255, 40, 2.8);
  check('胎壓越高剛性越高', kHigh > k1 && k1 > kLow);
  const k30 = M.TireSpringEstimator.estimate(295, 30);
  check('295/30 在 250-320 N/mm 合理範圍', k30 >= 250 && k30 <= 320, `got ${k30}`);
}

console.log('\n[11] Pacejka 模型');
{
  // BCD 在 Fz = a4 時達峰值
  const peak = M.PacejkaTireModel.corneringStiffness(1.82, 0, 'semi_slick');
  const below = M.PacejkaTireModel.corneringStiffness(1.0, 0, 'semi_slick');
  const above = M.PacejkaTireModel.corneringStiffness(4.0, 0, 'semi_slick');
  check('C_α 峰值在 Fz = a4', peak > below && peak > above);
  // -3° camber 只應小幅降低剛性 (~1%，a5 以 rad 計)
  const cambered = M.PacejkaTireModel.corneringStiffness(3.0, -3, 'semi_slick');
  const straight = M.PacejkaTireModel.corneringStiffness(3.0, 0, 'semi_slick');
  check('-3° camber 降低 C_α < 3%', cambered > straight * 0.97 && cambered < straight);
  // 4kN 半熱熔胎: 側向力峰值 μ 應在 0.8-1.3
  let fMax = 0;
  for (let a = 0; a <= 20; a += 0.5) fMax = Math.max(fMax, M.PacejkaTireModel.lateralForce(a, 4.0, 0));
  check('峰值 μ 在 0.8-1.3', fMax / 4000 > 0.8 && fMax / 4000 < 1.3, `μ=${(fMax / 4000).toFixed(2)}`);
}

console.log('\n[12] Load sensitivity 形狀');
{
  check('Fz=Fz0 時 = 1.0 (峰值)', M.TireModel.tireLoadSensitivity(4000, 4000) === 1.0);
  check('Fz>Fz0 時下降', M.TireModel.tireLoadSensitivity(6000, 4000) < 1.0);
}

console.log('\n[13] 縱向荷重轉移 ΔW = W·a·h/L (Gillespie)');
{
  const adv = { fl_weight: 250, fr_weight: 250, rl_weight: 250, rr_weight: 250, braking_g: 1.0 };
  const t3 = new M.Tier3Complete(gt3, {}, adv).calculate();
  const expected = 1380 * 1.0 * 0.47 / 2.355; // kg
  check('1g 煞車轉移量', approx(t3.longitudinal_transfer.braking.transfer_kg, expected, 1),
    `got ${t3.longitudinal_transfer.braking.transfer_kg}, want ${expected.toFixed(1)}`);
}

console.log('\n[14] 全車種資料庫掃描（Tier 1 輸出健全性）');
{
  const presetsSrc = fs.readFileSync(path.join(jsDir, 'car-presets.js'), 'utf8') +
    '\nthis.__presets = CAR_PRESETS;';
  const pctx = {};
  vm.createContext(pctx);
  vm.runInContext(presetsSrc, pctx, { filename: 'car-presets.js' });
  const presets = pctx.__presets;
  let bad = [];
  let count = 0;
  for (const [id, car] of Object.entries(presets)) {
    if (!car.params) continue;
    count++;
    const r = new M.Tier1BasicBalance(car.params).calculate();
    // 上限 18°/g：軟懸吊越野車/kei car/4 噸電動皮卡（Hummer EV 15.3）的
    // 線性模型（無 bump stop、無主動懸吊）可達 12-16°/g；此測試目的是抓
    // 單位錯誤（2x/57x 量級會讓整批車掉出範圍），不是抓極端車型
    const ok = isFinite(r.roll_gradient_deg_per_g) && r.roll_gradient_deg_per_g > 0.2 && r.roll_gradient_deg_per_g < 18
      && r.lltd_front > 15 && r.lltd_front < 85
      && r.ride_frequency.front_hz > 0.7 && r.ride_frequency.front_hz < 5.5
      && r.ride_frequency.rear_hz > 0.7 && r.ride_frequency.rear_hz < 5.5;
    if (!ok) bad.push(`${id}: rollGrad=${r.roll_gradient_deg_per_g} lltd=${r.lltd_front} f=${r.ride_frequency.front_hz}/${r.ride_frequency.rear_hz}`);
  }
  check(`${count} 台車全部輸出在物理合理範圍`, bad.length === 0,
    bad.slice(0, 5).join(' | ') + (bad.length > 5 ? ` …共${bad.length}台` : ''));
}

console.log('\n[15] Pacejka 荷重敏感度膝點隨車重校準 (a4 scaling)');
{
  const adv = { fl_weight: 262, fr_weight: 262, rl_weight: 428, rr_weight: 428 };
  const t3 = new M.Tier3Complete(gt3, {}, adv).calculate();
  const d = t3.dynamics;
  // 未校準時 GT3 臨界速度 ~75 km/h（明顯失真）；校準後應 > 90 或為 understeer
  check('GT3 臨界速度不再低得離譜 (>90 km/h 或無)', d.critical_speed_kmh == null || d.critical_speed_kmh > 90,
    `got ${d.critical_speed_kmh}`);
  // 前重車（FF）應為轉向不足，且特徵速度存在
  const ff = new M.Tier3Complete({ ...gt3, weight_front_pct: 62 }, {},
    { fl_weight: 428, fr_weight: 428, rl_weight: 262, rr_weight: 262, front_camber_deg: -2, rear_camber_deg: -2 }).calculate();
  check('62/38 前重車 → K_us > 0 (轉向不足)', ff.dynamics.understeer_gradient_linear_deg_g > 0,
    `got ${ff.dynamics.understeer_gradient_linear_deg_g}`);
  // 角落重量優先：corner weights 與 slider 不一致時用 corner weights
  const cw = new M.Tier3Complete({ ...gt3, weight_front_pct: 50 }, {},
    { fl_weight: 262, fr_weight: 262, rl_weight: 428, rr_weight: 428 }).calculate();
  check('有角落重量時軸荷重以磅秤值為準', Math.abs(cw.dynamics.slip_angle_front_deg - t3.dynamics.slip_angle_front_deg) < 0.05,
    `got ${cw.dynamics.slip_angle_front_deg} vs ${t3.dynamics.slip_angle_front_deg}`);
}

console.log('\n[16] 阻尼參考速度防呆 (0/\'\'/負值 → 退回 0.3)');
{
  const advBase = { fl_weight: 262, fr_weight: 262, rl_weight: 428, rr_weight: 428,
    front_bump_force: 80, front_rebound_force: 120, rear_bump_force: 100, rear_rebound_force: 150 };
  const ref = new M.Tier3Complete(gt3, {}, { ...advBase, damper_ref_speed: 0.3 }).calculate();
  for (const v of [0, '', -1, null, undefined]) {
    const t = new M.Tier3Complete(gt3, {}, { ...advBase, damper_ref_speed: v }).calculate();
    check(`damper_ref_speed=${JSON.stringify(v)} → ζ 有限且等於 0.3 預設`,
      isFinite(t.damping.front_ratio) && t.damping.front_ratio === ref.damping.front_ratio,
      `got ${t.damping.front_ratio}`);
  }
}

console.log('\n[17] arbSizing 輪胎柔度補償（軸級閉合）');
{
  const t1 = new M.Tier1BasicBalance(gt3).calculate();
  const arb = M.SpringCalculator.arbSizing(1380, 470, 2.0, 55,
    t1.front_roll_stiffness_spring, t1.rear_roll_stiffness_spring,
    t1.front_roll_stiffness_tire, t1.rear_roll_stiffness_tire);
  if (arb.front_arb_needed != null && arb.rear_arb_needed != null) {
    // 裝上建議 ARB 後，軸級總剛性（過輪胎串聯）應準確等於 totalNeeded
    const series = (a, b) => 1 / (1 / a + 1 / b);
    const achieved = series(t1.front_roll_stiffness_spring + arb.front_arb_needed, t1.front_roll_stiffness_tire)
      + series(t1.rear_roll_stiffness_spring + arb.rear_arb_needed, t1.rear_roll_stiffness_tire);
    check('series(spring+ARB, tire) 總和 = 所需總剛性', approx(achieved, arb.total_roll_needed, 1),
      `achieved ${achieved.toFixed(0)} vs needed ${arb.total_roll_needed}`);
  } else {
    check('輪胎柔度限制時回報 unreachable', arb.unreachable === true);
  }
  // 不帶輪胎參數時維持舊行為（不應變 null）
  const legacy = M.SpringCalculator.arbSizing(1380, 470, 2.0, 55,
    t1.front_roll_stiffness_spring, t1.rear_roll_stiffness_spring);
  check('無輪胎參數時維持舊行為', legacy.front_arb_needed != null && legacy.unreachable === false);
}

console.log('\n[18] 統一機械平衡 (Tier1 understeer_gradient, deg/g) — 配重 + LLTD');
{
  // 共用底盤，只改配重分佈：車頭重 → 轉向不足，車尾重 → 轉向過度
  const chassis = { front_spring_rate: 60, rear_spring_rate: 60, front_arb: 300, rear_arb: 300,
    front_track: 1550, rear_track: 1550, front_motion_ratio: 1, rear_motion_ratio: 1,
    total_weight: 1300, cg_height: 300, wheelbase: 2600 };
  const us62 = new M.Tier1BasicBalance({ ...chassis, weight_front_pct: 62 }).calculate().understeer_gradient;
  const us50 = new M.Tier1BasicBalance({ ...chassis, weight_front_pct: 50 }).calculate().understeer_gradient;
  const us40 = new M.Tier1BasicBalance({ ...chassis, weight_front_pct: 40 }).calculate().understeer_gradient;
  check('車頭重(62%F) → 轉向不足 (US>0)', us62 > 0.3, `got ${us62}`);
  check('50/50 → 近中性 (|US|<0.3)', Math.abs(us50) < 0.3, `got ${us50}`);
  check('車尾重(40%F) → 轉向過度 (US<0)', us40 < -0.3, `got ${us40}`);
  check('配重單調: 62%F 比 50%F 更US, 40%F 更OS', us62 > us50 && us50 > us40);
  check('US 在 deg/g 合理範圍 (|US|<8)', Math.abs(us62) < 8 && Math.abs(us40) < 8);

  // ARB 方向：前 ARB↑ → 更US；後 ARB↑ → 更OS（使用者實際在調的）
  const balanced = { ...chassis, weight_front_pct: 50 };
  const stiffFront = new M.Tier1BasicBalance({ ...balanced, front_arb: 800, rear_arb: 200 }).calculate().understeer_gradient;
  const stiffRear = new M.Tier1BasicBalance({ ...balanced, front_arb: 200, rear_arb: 800 }).calculate().understeer_gradient;
  check('前 ARB 硬 → 轉向不足方向', stiffFront > 0, `got ${stiffFront}`);
  check('後 ARB 硬 → 轉向過度方向', stiffRear < 0, `got ${stiffRear}`);
  check('前硬 vs 後硬 方向相反且對稱', stiffFront > stiffRear);
}

console.log('\n[19] 預設車庫傾向分佈合理性 (回歸「全部轉向過度」bug)');
{
  const presetsSrc = fs.readFileSync(path.join(jsDir, 'car-presets.js'), 'utf8') + '\nthis.__p = CAR_PRESETS;';
  const pctx = {}; vm.createContext(pctx); vm.runInContext(presetsSrc, pctx);
  const presets = pctx.__p;
  let cnt = { Understeer: 0, Neutral: 0, Oversteer: 0 }, ff = { U: 0, O: 0 }, n = 0;
  for (const [id, car] of Object.entries(presets)) {
    if (!car.params) continue; n++;
    const r = new M.Tier1BasicBalance(car.params).calculate();
    cnt[r.tendency]++;
    if (car.layout === 'FF') { if (r.tendency === 'Understeer') ff.U++; if (r.tendency === 'Oversteer') ff.O++; }
  }
  // 不該再出現「壓倒性全部轉向過度」：OS 不應超過半數
  check(`OS 不超過 50% (修正前幾乎全 OS)`, cnt.Oversteer < n * 0.5, `OS=${cnt.Oversteer}/${n}`);
  check('三種傾向都有合理數量(各>10%)', cnt.Understeer > n*0.1 && cnt.Neutral > n*0.1 && cnt.Oversteer > n*0.1,
    `U/N/O = ${cnt.Understeer}/${cnt.Neutral}/${cnt.Oversteer}`);
  // 前驅(FF)應以轉向不足為主，不該以轉向過度為主
  check('FF 前驅車 轉向不足 > 轉向過度 (物理正確)', ff.U > ff.O, `FF US=${ff.U} OS=${ff.O}`);
}

console.log('\n[20] 麗寶單圈模擬器 — GG 點質量 lap sim');
{
  // 賽道總長對齊 3500m (含半徑校準)
  const segLen = M.LIHPAO_G2.segments.reduce((s, seg) => s + (seg.type === 'corner' ? seg.arc : seg.length), 0);
  check('賽道段落總長 ≈ 3500m (±200)', Math.abs(segLen - 3500) < 200, `got ${segLen}`);

  const grYaris = { mass_kg: 1280, power_kw: 220, drivetrain: 'AWD', mu: 1.25, ClA: 0.3, CdA: 0.72 };
  const base = new M.LihpaoLapSim(grYaris).lapTime();
  // 改裝半熱熔 GR Yaris 對標真實紀錄 1:50.89 (±5s)
  check('改裝 GR Yaris 圈速 ≈ 110.9s (1:50, ±6s)', Math.abs(base.lap_s - 110.9) < 6, `got ${base.lap_s.toFixed(1)}s`);
  check('極速合理 (180-260 km/h)', base.v_max_kmh > 180 && base.v_max_kmh < 260, `got ${base.v_max_kmh.toFixed(0)}`);

  // 單調性：抓地↑→更快, 動力↑→更快, 質量↑→更慢
  const moreGrip = new M.LihpaoLapSim({ ...grYaris, mu: 1.40 }).lapTime();
  const morePower = new M.LihpaoLapSim({ ...grYaris, power_kw: 320 }).lapTime();
  const heavier = new M.LihpaoLapSim({ ...grYaris, mass_kg: 1500 }).lapTime();
  check('抓地↑ → 圈速更快', moreGrip.lap_s < base.lap_s, `${moreGrip.lap_s.toFixed(1)} < ${base.lap_s.toFixed(1)}`);
  check('動力↑ → 圈速更快', morePower.lap_s < base.lap_s);
  check('質量↑ → 圈速更慢', heavier.lap_s > base.lap_s);
}

console.log('\n[21] 麗寶 stint 演化 — 胎壓甜蜜點 / 最快圈 / 退化');
{
  const r = M.simulateLihpao({
    params: { total_weight: 1280, weight_front_pct: 59, front_track: 1535, rear_track: 1550,
      front_spring_rate: 60, rear_spring_rate: 55, front_arb: 600, rear_arb: 300, front_motion_ratio: 1, rear_motion_ratio: 1,
      cg_height: 480, wheelbase: 2560 },
    tireParams: { front_compound: 'yokohama_a052', rear_compound: 'yokohama_a052', front_tire_width: 235 },
    layout: 'AWD', power_kw: 220, env: { ambient_c: 28, track_c: 38 },
    stint: { laps: 12, fuel_start_kg: 45, fuel_per_lap_kg: 2.2, cold_pressure_bar: 1.95 },
  });
  check('產生 12 圈逐圈資料', r.laps.length === 12);
  check('最快單圈時間字串格式 m:ss.mmm', /^\d:\d\d\.\d{3}$/.test(r.fastest_time_str), r.fastest_time_str);
  check('甜蜜點在 stint 早段 (第1-5圈)', r.sweet_pressure_lap >= 1 && r.sweet_pressure_lap <= 5, `第${r.sweet_pressure_lap}圈`);
  check('最快圈 ≈ 峰值抓地圈 (±1)', Math.abs(r.fastest_lap - r.peak_grip_lap) <= 1);
  // 冷胎 out-lap 比最快圈慢
  check('第1圈(冷胎)比最快圈慢', r.laps[0].lap_s > r.fastest_time_s, `lap1 ${r.laps[0].lap_s} > best ${r.fastest_time_s}`);
  // 熱胎壓 > 冷胎壓 (升溫建壓)
  check('熱胎壓 > 冷胎壓 (升溫建壓)', r.laps[r.laps.length-1].pressure_bar > 1.95);
  // 建議冷壓 < 熱胎甜蜜點 (因升溫建壓)
  check('建議冷胎壓 < 熱胎甜蜜點', r.recommended_cold_pressure_bar < r.optimal_pressure_bar, `${r.recommended_cold_pressure_bar} < ${r.optimal_pressure_bar}`);
  // 峰值後退化：末圈抓地 < 峰值圈抓地
  check('峰值後抓地退化', r.laps[r.laps.length-1].grip_factor < r.laps[r.peak_grip_lap-1].grip_factor);
}

console.log('\n[22] 胎種抓地排序 — 光頭胎應比街胎快 (回歸「光頭胎變慢」bug)');
{
  const carP = { total_weight: 1280, weight_front_pct: 55, front_track: 1535, rear_track: 1550,
    front_spring_rate: 80, rear_spring_rate: 70, front_arb: 600, rear_arb: 300,
    front_motion_ratio: 1, rear_motion_ratio: 1, cg_height: 300, wheelbase: 2560 };
  const lap = (comp) => {
    const td = M.TRACKDAY_TIRES[comp];
    const cold = Math.round((td.optimal_pressure_front_bar - 0.2) * 100) / 100;
    return M.simulateLihpao({ params: carP, tireParams: { front_compound: comp, rear_compound: comp, front_tire_width: 245 },
      layout: 'AWD', power_kw: 300, env: { ambient_c: 28, track_c: 38 }, stint: { laps: 10, cold_pressure_bar: cold } }).fastest_time_s;
  };
  const street = lap('michelin_ps4s');     // peak 1.00
  const semi = lap('yokohama_a052');        // peak 1.14
  const slick = lap('slick_soft');          // peak 1.30
  check('光頭軟胎 比 街胎(PS4S) 快', slick < street, `slick ${slick.toFixed(1)} < street ${street.toFixed(1)}`);
  check('光頭軟胎 比 半熱熔(A052) 快', slick < semi, `slick ${slick.toFixed(1)} < semi ${semi.toFixed(1)}`);
  check('半熱熔 比 街胎 快', semi < street, `semi ${semi.toFixed(1)} < street ${street.toFixed(1)}`);
  // 光頭胎(高最佳溫)在熱賽道能達到工作窗口(峰值抓地>85%)
  const td = M.TRACKDAY_TIRES['slick_soft'];
  const r = M.simulateLihpao({ params: carP, tireParams: { front_compound: 'slick_soft', rear_compound: 'slick_soft', front_tire_width: 245 },
    layout: 'AWD', power_kw: 300, env: { ambient_c: 28, track_c: 38 }, stint: { laps: 10, cold_pressure_bar: 1.35 } });
  check('光頭胎在熱賽道達工作窗口 (峰值抓地>85%)', Math.max(...r.laps.map(l => l.grip_factor)) > 0.85,
    `peak grip ${(Math.max(...r.laps.map(l => l.grip_factor)) * 100).toFixed(0)}%`);
}

// ─── .tir Pacejka MF6.2 importer — synthetic-coefficient unit tests (no proprietary data) ───
{
  const SYN_TIR = `[MDI_HEADER]
FILE_TYPE ='tir'
[MODEL]
FITTYP = 62
[DIMENSION]
UNLOADED_RADIUS = 0.30
WIDTH = 0.20
ASPECT_RATIO = 0.50
RIM_RADIUS = 0.20
[OPERATING_CONDITIONS]
INFLPRES = 200000
NOMPRES = 200000
[VERTICAL]
FNOMIN = 4000
VERTICAL_STIFFNESS = 250000   $ synthetic, expect 250 N/mm
[LATERAL_COEFFICIENTS]
PCY1 = 1.6
PDY1 = 1.5
PDY2 = -0.10
PEY1 = 0.0
PKY1 = -40
PKY2 = 2.0
PKY4 = 2.0`;
  const t = M.parseTIR(SYN_TIR);
  check('tir: FNOMIN parsed', t.Fnom === 4000, `got ${t.Fnom}`);
  check('tir: vertical stiffness → N/mm', approx(t.verticalStiffness_Nmm, 250, 0.5), `got ${t.verticalStiffness_Nmm}`);
  check('tir: dims (width) parsed', t.dims.width_m === 0.20, `got ${t.dims.width_m}`);
  check('tir: lateral coeff PCY1 parsed', t.raw.PCY1 === 1.6, `got ${t.raw.PCY1}`);
  check('tir: comment stripped from value', t.raw.VERTICAL_STIFFNESS === 250000, `got ${t.raw.VERTICAL_STIFFNESS}`);
  const fy2 = M.mfFy0(t, 2 * Math.PI / 180, 4000);
  const fy6 = M.mfFy0(t, 6 * Math.PI / 180, 4000);
  check('tir: ISO sign (α>0 → Fy<0)', fy6 < 0, `Fy(6°)=${fy6.toFixed(0)}`);
  check('tir: Fy rises toward peak (|Fy(2°)|<|Fy(6°)|)', Math.abs(fy2) < Math.abs(fy6));
  const c = M.tireCharacteristics(t);
  check('tir: peak μ ≈ PDY1 (1.3–1.7)', c.peakMu > 1.3 && c.peakMu < 1.7, `μ=${c.peakMu}`);
  check('tir: optimal slip angle 3–12°', c.optimalSlipAngle_deg >= 3 && c.optimalSlipAngle_deg <= 12, `${c.optimalSlipAngle_deg}°`);
  check('tir: cornering stiffness > 0', c.corneringStiffness_Ndeg > 0, `${c.corneringStiffness_Ndeg} N/deg`);
  check('tir: load sensitivity (μ falls as Fz rises)', c.muVsLoad[0].mu > c.muVsLoad[c.muVsLoad.length - 1].mu);
  // integration: an imported tire actually drives the handling-balance model (optional path)
  const carP = { front_spring_rate:60, rear_spring_rate:60, front_arb:0, rear_arb:0, front_track:1500, rear_track:1500, front_motion_ratio:1, rear_motion_ratio:1, weight_front_pct:55, total_weight:1300, cg_height:500, wheelbase:2600 };
  const baseK = new M.Tier1BasicBalance(carP).calculate().understeer_gradient;
  const tirK = new M.Tier1BasicBalance(Object.assign({}, carP, { tireModel: M.parseTIR(SYN_TIR) })).calculate().understeer_gradient;
  check('tir: imported tire feeds handling model (K_us shifts)', Number.isFinite(tirK) && Math.abs(tirK - baseK) > 1e-6, `base ${baseK} → tir ${tirK}`);
  check('tir: default prediction unaffected without tireModel', new M.Tier1BasicBalance(carP).calculate().understeer_gradient === baseK);
  // integration: imported peak μ overrides the Lihpao lap-sim base_mu
  const lapSetup = { params: carP, tireParams: { front_compound: 'slick_soft', front_tire_width: 245 }, layout: 'RWD', power_kw: 250, stint: { laps: 3, cold_pressure_bar: 1.5 } };
  const lapBase = M.simulateLihpao(lapSetup).inputs.base_mu;
  const lapTir = M.simulateLihpao(Object.assign({}, lapSetup, { tirePeakMu: c.peakMu })).inputs.base_mu;
  check('tir: peak μ feeds lap-sim base_mu (override)', Math.abs(lapTir - lapBase) > 1e-3, `base ${lapBase} → tir ${lapTir}`);
  check('tir: lap sim unaffected without tirePeakMu', M.simulateLihpao(lapSetup).inputs.base_mu === lapBase);
}

// ─── 2D suspension kinematics (front-view double wishbone) — synthetic geometry ───
{
  const hp = { lai:{y:150,z:130}, lbj:{y:580,z:110}, uai:{y:230,z:350}, ubj:{y:560,z:400}, wc:{y:620,z:305}, cp:{y:625,z:0} };
  const sw = M.kinematicsSweep(hp, { staticCamberDeg: -3.0, travel_mm: 40, step_mm: 10 });
  const mid = sw.curve.find(p => p.dz_mm === 0);
  check('kin: roll-center height in 0–150mm', sw.static.rollCenterHeight_mm >= 0 && sw.static.rollCenterHeight_mm <= 150, `RC ${sw.static.rollCenterHeight_mm}`);
  check('kin: ride height (dz=0) returns static camber', Math.abs(mid.camber_deg - (-3.0)) < 0.02, `got ${mid.camber_deg}`);
  check('kin: camber gain negative (more neg camber in bump)', sw.camberGain_deg_per_mm < 0, `${sw.camberGain_deg_per_mm}`);
  check('kin: camber gain magnitude sane (<0.1°/mm)', Math.abs(sw.camberGain_deg_per_mm) < 0.1);
  check('kin: camber curve smooth/monotonic (no branch-jump spike)', sw.curve.every((p, i, a) => i === 0 || p.camber_deg <= a[i - 1].camber_deg + 0.001));
  check('kin: roll center migrates with travel', sw.curve[0].rollCenterHeight_mm !== sw.curve[sw.curve.length - 1].rollCenterHeight_mm);
}

// ─── Reference-case validation (textbook directional facts + published ranges + formula cross-checks) ───
// 來源: Milliken & Milliken RCVD ch.5-6; Gillespie Fundamentals ch.6; OptimumG Tech Tips.
// 說明: 這是「對教科書關係/公開範圍」的驗證,非遙測校準(後者需解碼 .bmsbin 真實資料)。
{
  const ref = (over) => Object.assign({
    front_spring_rate: 80, rear_spring_rate: 80, front_arb: 200, rear_arb: 200,
    front_track: 1550, rear_track: 1550, front_motion_ratio: 1, rear_motion_ratio: 1,
    weight_front_pct: 50, total_weight: 1300, cg_height: 480, wheelbase: 2600,
  }, over || {});
  const calc = (o) => new M.Tier1BasicBalance(ref(o)).calculate();
  const balanced = calc({});
  // textbook directional facts
  check('ref: front-heavy car is more understeer (Milliken K_us)', calc({ weight_front_pct: 60 }).understeer_gradient > balanced.understeer_gradient);
  check('ref: stiffer front ARB → more understeer', calc({ front_arb: 400 }).understeer_gradient > balanced.understeer_gradient);
  check('ref: stiffer rear ARB → less understeer (toward oversteer)', calc({ rear_arb: 400 }).understeer_gradient < balanced.understeer_gradient);
  // published range: street sports-car roll gradient
  check('ref: street sports-car roll gradient in 2–6°/g', balanced.roll_gradient_deg_per_g >= 2 && balanced.roll_gradient_deg_per_g <= 6, `${balanced.roll_gradient_deg_per_g}°/g`);
  // formula cross-check: ride frequency f = (1/2π)·√(k_eff/m_corner)
  const rf = balanced.ride_frequency || (balanced.mechanical && balanced.mechanical.ride_frequency);
  const kEffF = balanced.front_wheel_rate_effective || (balanced.mechanical && balanced.mechanical.front_wheel_rate_effective);
  if (rf && kEffF) {
    const mCornerF = 1300 * 0.50 / 2;                       // kg
    const fExpected = (1 / (2 * Math.PI)) * Math.sqrt(kEffF * 1000 / mCornerF); // Hz
    check('ref: ride frequency matches f=(1/2π)√(k_eff/m)', Math.abs(rf.front_hz - fExpected) < 0.05, `model ${rf.front_hz} vs textbook ${fExpected.toFixed(2)}`);
  }
  // stiffer springs raise ride frequency (OptimumG)
  check('ref: stiffer springs raise ride frequency', (calc({ front_spring_rate: 160 }).ride_frequency || calc({ front_spring_rate: 160 }).mechanical.ride_frequency).front_hz > rf.front_hz);
}

// ─── 2-DOF transient bicycle model (step steer) — Gillespie / Milliken cross-check ───
{
  const mass = 1300, L = 2.6, wf = 0.52, a = (1 - wf) * L, bb = wf * L;
  const Cf = 1400 * 180 / Math.PI, Cr = 1500 * 180 / Math.PI;     // N/rad
  const V = 100 / 3.6, steer = 3 * Math.PI / 180;
  const tr = M.transient2DOF({ mass, Iz: M.estimateIz(mass, a, bb), a, b: bb, Cf, Cr, V, steer });
  const g = 9.81, Wf = mass * g * bb / L, Wr = mass * g * a / L, KusRad = Wf / Cf - Wr / Cr;
  const gainG = V / (L + KusRad * V * V / g);                      // Gillespie steady r/δ [1/s]
  check('trans: response is stable', tr.stable === true);
  check('trans: yaw response time 0.05–0.6s', tr.responseTime90_s > 0.03 && tr.responseTime90_s < 0.6, `${tr.responseTime90_s}`);
  check('trans: yaw-mode damping 0.3–1.2', tr.dampingRatio > 0.3 && tr.dampingRatio < 1.2, `${tr.dampingRatio}`);
  check('trans: yaw natural frequency 0.4–3Hz', tr.naturalFreq_hz > 0.4 && tr.naturalFreq_hz < 3, `${tr.naturalFreq_hz}`);
  check('trans: steady yaw gain matches Gillespie V/(L+Kus·V²/g) (<5%)', Math.abs(tr.yawGain_1_s - gainG) / gainG < 0.05, `model ${tr.yawGain_1_s} vs ${gainG.toFixed(3)}`);
  check('trans: invalid input returns null', M.transient2DOF({ mass: 0, Iz: 0, a: 1, b: 1, Cf: 1, Cr: 1, V: 0, steer: 0 }) === null);
}

// ─── .bmsbin (DarabImporter) telemetry channel-catalog parser — synthetic buffer (no proprietary data) ───
{
  const str = (s) => { const b = Buffer.from(s + '\0', 'ascii'); const L = Buffer.alloc(2); L.writeUInt16LE(b.length, 0); return Buffer.concat([L, b]); };
  const syn = Buffer.concat([
    Buffer.from('DarabImporter v.\0', 'ascii'), Buffer.alloc(8),
    str('TrackInfo'), Buffer.from([0x01, 0x02, 0x03, 0x04]), str('accy'), Buffer.from([0, 0]), str('MS5.8'), str('lateral acceleration'),
    str('TrackInfo'), Buffer.from([0x05, 0x06]), str('yaw'), str('MS5.8'), str('yaw rate'),
    str('TrackInfo'), Buffer.from([0x07, 0x08]), str('steer'), str('MS5.8'), str('steering angle'),
  ]);
  const bytes = new Uint8Array(syn);
  const h = M.parseBmsHeader(bytes);
  check('bms: header identifies DarabImporter', h.valid === true && /Darab/.test(h.importer), h.importer);
  const cat = M.parseBmsCatalog(bytes);
  check('bms: catalog finds all 3 channels', cat.length === 3, `got ${cat.length}`);
  check('bms: channel name/source/description parsed', cat[0].name === 'accy' && cat[0].source === 'MS5.8' && cat[0].description === 'lateral acceleration');
  const r = M.parseBms(bytes);
  check('bms: detects validation channels (accy/yaw/steer)', r.validationChannels.lateral_accel && r.validationChannels.yaw_rate && r.validationChannels.steering);
}

// ── Calibration 層：每個常數 == 原始 inline 值 (抽常數時值不可變) ──
console.log('\n[cal] Calibration 層：常數值鎖定 (calibration.js)');
{
  // 這些是被搬進 calibration.js 之前散落在 dynamics-model.js / lihpao-laptime.js
  // 裡的原始 inline 值。任何一項對不上 = 抽常數時不小心改了行為,測試擋下。
  const expected = {
    US_NEUTRAL_BAND: 0.5,
    US_NORM_SCALE: 4.0,
    CORNERING_STIFFNESS_AY_REF_G: 1.0,
    TIRE_GRIP_TO_US_GRADIENT_GAIN: 14,
    WEIGHT_SHIFT_TO_US_GRADIENT: 0.2,
    TIRE_WIDTH_GRIP_REF_MM: 245,
    TIRE_WIDTH_GRIP_EXPONENT: 0.5,
    PRESSURE_GRIP_LOSS_PER_BAR: 0.2,
    LIHPAO_RADIUS_SCALE: 1.1,
    TIRE_TEMP_TRACK_COEFF: 0.6,
    TIRE_TEMP_EQUIL_TAU_LAPS: 1.6,
    LAP_BALANCE_PENALTY_PER_DEGG: 0.012,
    LAP_BALANCE_PENALTY_CAP: 0.04,
    DRIVETRAIN_TRACTION_FRAC_2WD: 0.62,
  };
  for (const [k, v] of Object.entries(expected)) {
    check(`cal: CAL.${k} === ${v}`, M.CAL[k] === v, `got ${M.CAL[k]}`);
    check(`cal: CALIBRATION.${k}.value 對齊 CAL.${k}`,
      !!M.CALIBRATION[k] && M.CALIBRATION[k].value === M.CAL[k]);
  }
  // 鍵集合完全一致(沒有遺漏/多餘的常數未被測試鎖定)
  check('cal: CALIBRATION 鍵集合 == 測試預期',
    Object.keys(M.CALIBRATION).sort().join(',') === Object.keys(expected).sort().join(','),
    Object.keys(M.CALIBRATION).join(','));
  // 每個常數 metadata 完整,且 value 落在自己宣告的 validRange 內
  const TIERS = ['Physics', 'Model', 'Heuristic'];
  let metaOk = true, bad = '';
  for (const k of Object.keys(M.CALIBRATION)) {
    const m = M.CALIBRATION[k];
    const ok = typeof m.value === 'number' && m.unit && m.meaning
      && Array.isArray(m.validRange) && m.validRange.length === 2
      && TIERS.includes(m.tier)
      && m.value >= m.validRange[0] && m.value <= m.validRange[1];
    if (!ok) { metaOk = false; bad = k; }
  }
  check('cal: 每個常數 metadata 完整且 value 落在 validRange 內', metaOk, bad);
}

// ── corneringStiffnessScale 鉤子（供 UI 敏感度分析 ±重算用）──
console.log('\n[sens] corneringStiffnessScale 鉤子');
{
  const tp = { front_compound: 'semi_slick', rear_compound: 'semi_slick' };
  const base = new M.Tier2TireAware(gt3, tp).calculate();
  const one  = new M.Tier2TireAware(Object.assign({}, gt3, { corneringStiffnessScale: 1 }), tp).calculate();
  const s08  = new M.Tier2TireAware(Object.assign({}, gt3, { corneringStiffnessScale: 0.8 }), tp).calculate();
  // 帶 scale=1 與不帶完全一致 → 預設不影響正常預測(opt-in)
  check('sens: corneringStiffnessScale 預設(=1) 不改變 understeer_gradient',
    one.understeer_gradient === base.understeer_gradient,
    `base ${base.understeer_gradient} vs scale1 ${one.understeer_gradient}`);
  // K_us = W_f/(C_αf·s) − W_r/(C_αr·s) = K_us0/s → 縮 0.8 時 |Kus| 放大 1/0.8
  check('sens: cornering stiffness ×0.8 → Kus ≈ Kus0/0.8',
    approx(s08.understeer_gradient, base.understeer_gradient / 0.8, 2),
    `got ${s08.understeer_gradient}, want ${(base.understeer_gradient / 0.8).toFixed(3)}`);
}

console.log(`\n========= 結果: ${pass} passed, ${fail} failed =========`);
process.exit(fail > 0 ? 1 : 0);
