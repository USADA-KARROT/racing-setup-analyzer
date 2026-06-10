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
  fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' +
  'this.__exports = { Tier1BasicBalance, Tier2TireAware, Tier3Complete, TireModel, ' +
  'PacejkaTireModel, SetupAdvisor, SpringCalculator, TireSpringEstimator, ' +
  'compareWithBaseline, roundN, TRACKDAY_TIRES };';

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

console.log(`\n========= 結果: ${pass} passed, ${fail} failed =========`);
process.exit(fail > 0 ? 1 : 0);
