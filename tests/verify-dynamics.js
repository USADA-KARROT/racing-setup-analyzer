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
  fs.readFileSync(path.join(jsDir, 'tire-metadata.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'kinematics.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'transient.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-parser.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'telemetry-schema.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'telemetry-metadata.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-probe.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-raw-extract.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-channel-link.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-confirmation.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-structure-discovery.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-raw-stream-confirmation.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-channel-identity-confirmation.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-timebase-confirmation.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-physical-scaling-confirmation.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-telemetry-readiness.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-extraction-eligibility.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'bms-measured-extraction-harness.js'), 'utf8') + '\n' +
  'this.__exports = { Tier1BasicBalance, Tier2TireAware, Tier3Complete, TireModel, ' +
  'PacejkaTireModel, SetupAdvisor, SpringCalculator, TireSpringEstimator, ' +
  'compareWithBaseline, roundN, TRACKDAY_TIRES, ' +
  'parseTIR, mfFy0, tireCharacteristics, ' +
  'buildTireModelMetadata, genericTireMetadata, importedTirMetadata, validateTirModel, tirCoverage, ' +
  'solveStatic, solveAtTravel, kinematicsSweep, ' +
  'transient2DOF, estimateIz, ' +
  'parseBmsHeader, parseBmsCatalog, parseBms, ' +
  'mapTelemetryChannels, telemetryChannelDescriptor, buildTelemetryMetadata, validateTelemetryCatalog, ' +
  'probeBmsBinary, extractBmsRawCandidates, linkBmsRawCandidates, evaluateBmsConfirmationEvidence, discoverBmsSampleStructure, evaluateBmsRawStreamConfirmation, evaluateBmsChannelIdentityConfirmation, evaluateBmsTimebaseConfirmation, evaluateBmsPhysicalScalingConfirmation, evaluateBmsTelemetryReadiness, evaluateBmsExtractionEligibility, EXTRACTION_INPUT_CONTRACT, EXTRACTION_OUTPUT_CONTRACT, evaluateBmsMeasuredExtraction, ' +
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
  // Phase 2E curve-data generator: fyCurve drives the Fy-vs-slip chart
  check('tir: fyCurve generated (0–15°, |Fy| rises from ~0 toward peak)',
    Array.isArray(c.fyCurve) && c.fyCurve.length > 10
    && c.fyCurve[0].alpha_deg === 0
    && Math.abs(c.fyCurve[0].fy_N) < Math.abs(c.fyCurve[c.fyCurve.length - 1].fy_N));
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

// ── Phase 2B: tyre-model credibility metadata (source / coverage / per-output tier) ──
console.log('\n[tmeta] 輪胎模型 metadata');
{
  // generic (no import): Cα is a model (generic Pacejka), grip factors are heuristic
  const g = M.buildTireModelMetadata({ useTir: false, tirParsed: null, compoundId: 'michelin_cup2' });
  check('tmeta: generic → sourceType/overallStatus generic', g.sourceType === 'generic' && g.overallStatus === 'generic');
  check('tmeta: generic → Cα = model/generic_pacejka',
    g.contributions.corneringStiffness.tier === 'model' && g.contributions.corneringStiffness.source === 'generic_pacejka');
  check('tmeta: generic → pressure/temp/width grip are heuristic',
    g.contributions.pressureGripCorrection.tier === 'heuristic'
    && g.contributions.temperatureGripCorrection.tier === 'heuristic'
    && g.contributions.widthGripCorrection.tier === 'heuristic');
  check('tmeta: generic → no fallback flags (nothing better was expected)',
    Object.values(g.fallbackUsed).every(v => v === false));

  // imported .tir (valid): lateral + load + camber + vertical stiffness present
  const validTir = { name: 'SynA', mfVersion: '6.2', nomPres_pa: 230000, verticalStiffness_Npm: 250000,
    raw: { PCY1: 1.6, PDY1: 1.5, PDY2: -0.1, PKY1: -30, PKY2: 1.8, PKY3: 0.5, PKY4: 2.0, VERTICAL_STIFFNESS: 250000, PPY1: 0.5, NOMPRES: 230000 } };
  const i = M.buildTireModelMetadata({ useTir: true, tirParsed: validTir });
  check('tmeta: imported → sourceType imported_tir, status valid',
    i.sourceType === 'imported_tir' && i.overallStatus === 'imported_valid');
  check('tmeta: imported → Cα & peak μ upgraded to model/imported_tir',
    i.contributions.corneringStiffness.tier === 'model' && i.contributions.corneringStiffness.source === 'imported_tir'
    && i.contributions.peakMu.tier === 'model' && i.contributions.peakMu.source === 'imported_tir');
  check('tmeta: imported → pressure/temp/width/tireUsShift STILL heuristic + fallback',
    ['pressureGripCorrection', 'temperatureGripCorrection', 'widthGripCorrection', 'tireUsShift'].every(k =>
      i.contributions[k].tier === 'heuristic' && i.contributions[k].fallback === true && i.fallbackUsed[k] === true));
  check('tmeta: imported → coverage lateral true; Fx/Mz/combined false',
    i.coverage.lateralPureSlip === true && i.coverage.longitudinalForce === false
    && i.coverage.aligningMoment === false && i.coverage.combinedSlip === false);
  check('tmeta: imported → emits "grip still heuristic" honesty diagnostic',
    i.diagnostics.some(d => d.code === 'TIR_GRIP_STILL_HEURISTIC'));

  // imported .tir (partial): missing camber + vertical stiffness + pressure
  const partialTir = { name: 'SynB', nomPres_pa: 0, verticalStiffness_Npm: 0,
    raw: { PCY1: 1.5, PDY1: 1.4, PDY2: -0.1, PKY1: -28, PKY2: 1.7, PKY4: 2.0 } };
  const p = M.buildTireModelMetadata({ useTir: true, tirParsed: partialTir });
  check('tmeta: partial .tir → overallStatus imported_partial', p.overallStatus === 'imported_partial');
  check('tmeta: partial .tir → camber + lateral-only warnings',
    p.diagnostics.some(d => d.code === 'TIR_NO_CAMBER_MODEL' && d.severity === 'warning')
    && p.diagnostics.some(d => d.code === 'TIR_LATERAL_ONLY' && d.severity === 'warning'));
  check('tmeta: partial .tir → missing pressure-model diagnostic',
    p.diagnostics.some(d => d.code === 'TIR_NO_PRESSURE_MODEL'));

  // end-to-end: a real parseTIR feeds the descriptor
  const MINI_TIR = "[LATERAL]\nPCY1 = 1.6\nPDY1 = 1.5\nPDY2 = -0.1\nPKY1 = -30\nPKY2 = 1.8\nPKY3 = 0.5\nPKY4 = 2.0\nVERTICAL_STIFFNESS = 250000\nNOMPRES = 230000\nPPY1 = 0.5\n";
  const r = M.buildTireModelMetadata({ useTir: true, tirParsed: M.parseTIR(MINI_TIR) });
  check('tmeta: parseTIR → imported_tir descriptor', r.sourceType === 'imported_tir' && r.overallStatus === 'imported_valid');

  // purity: building the descriptor must not change predictions
  const carP2 = { front_spring_rate: 60, rear_spring_rate: 60, front_arb: 0, rear_arb: 0, front_track: 1500, rear_track: 1500, front_motion_ratio: 1, rear_motion_ratio: 1, weight_front_pct: 55, total_weight: 1300, cg_height: 500, wheelbase: 2600 };
  const before = new M.Tier1BasicBalance(carP2).calculate().understeer_gradient;
  M.buildTireModelMetadata({ useTir: true, tirParsed: validTir, compoundId: 'x' });
  check('tmeta: descriptor is pure — no prediction drift',
    new M.Tier1BasicBalance(carP2).calculate().understeer_gradient === before);
}

// ── Phase 2D: .tir validation diagnostics (error / warning / info) ──
console.log('\n[tval] .tir validation diagnostics');
{
  const code = (arr, c) => arr.find(d => d.code === c);
  const valid = { Fnom: 4000, name: 'V', nomPres_pa: 230000, verticalStiffness_Npm: 250000,
    raw: { PCY1: 1.6, PDY1: 1.5, PDY2: -0.1, PKY1: -30, PKY2: 1.8, PKY3: 0.5, PKY4: 2.0, VERTICAL_STIFFNESS: 250000, PPY1: 0.5, NOMPRES: 230000 } };
  const dv = M.validateTirModel(valid);
  check('tval: valid → no error severity', !dv.some(d => d.severity === 'error'));
  check('tval: valid → lateral-only is a warning (not an error)',
    !!code(dv, 'TIR_LATERAL_ONLY') && code(dv, 'TIR_LATERAL_ONLY').severity === 'warning');
  check('tval: valid → grip-still-heuristic is a warning',
    !!code(dv, 'TIR_GRIP_STILL_HEURISTIC') && code(dv, 'TIR_GRIP_STILL_HEURISTIC').severity === 'warning');
  check('tval: valid → vertical stiffness reported as info',
    !!code(dv, 'TIR_VERTICAL_STIFFNESS_AVAILABLE') && code(dv, 'TIR_VERTICAL_STIFFNESS_AVAILABLE').severity === 'info');
  check('tval: valid → load-sensitivity reported as info', !!code(dv, 'TIR_LOAD_SENSITIVITY_AVAILABLE'));
  check('tval: valid → pressure-unused note is info (file has PPY)',
    !!code(dv, 'TIR_PRESSURE_MODEL_UNUSED') && code(dv, 'TIR_PRESSURE_MODEL_UNUSED').severity === 'info');
  check('tval: lateral-only flags combined slip + Mz + Fx',
    code(dv, 'TIR_LATERAL_ONLY').affectedOutputs.includes('combinedSlip')
    && code(dv, 'TIR_LATERAL_ONLY').affectedOutputs.includes('aligningMoment')
    && code(dv, 'TIR_LATERAL_ONLY').affectedOutputs.includes('longitudinalForce'));

  // errors: only when truly unusable
  const dNull = M.validateTirModel(null);
  check('tval: null → error TIR_PARSE_FAILED only', dNull.length === 1 && dNull[0].code === 'TIR_PARSE_FAILED' && dNull[0].severity === 'error');
  const dNoLat = M.validateTirModel({ raw: { PDY1: 1.5 } });
  check('tval: missing PCY1 → error TIR_MISSING_LATERAL (returns early)',
    dNoLat.length === 1 && dNoLat[0].code === 'TIR_MISSING_LATERAL' && dNoLat[0].severity === 'error');
  const dNoPeak = M.validateTirModel({ Fnom: 4000, raw: { PCY1: 1.6, PKY1: -30, PKY2: 1.8 } });
  check('tval: missing PDY1 → error TIR_NO_PEAK', dNoPeak.some(d => d.code === 'TIR_NO_PEAK' && d.severity === 'error'));

  // partial: narrow coverage → specific neutral diagnostics, no error
  const partial = { nomPres_pa: 0, verticalStiffness_Npm: 0, raw: { PCY1: 1.5, PDY1: 1.4, PDY2: -0.1, PKY1: -28, PKY2: 1.7, PKY4: 2.0 } };
  const dp = M.validateTirModel(partial);
  check('tval: partial → no error severity', !dp.some(d => d.severity === 'error'));
  check('tval: partial → no-camber warning + no-pressure/no-vertical info',
    !!code(dp, 'TIR_NO_CAMBER_MODEL') && code(dp, 'TIR_NO_CAMBER_MODEL').severity === 'warning'
    && !!code(dp, 'TIR_NO_PRESSURE_MODEL') && code(dp, 'TIR_NO_PRESSURE_MODEL').severity === 'info'
    && !!code(dp, 'TIR_NO_VERTICAL_STIFFNESS') && code(dp, 'TIR_NO_VERTICAL_STIFFNESS').severity === 'info');

  // degenerate: PCY1+PDY1 present but no PKY stiffness terms → Fy0 ≡ 0 (result-driven reject)
  const degenerate = { Fnom: 4000, raw: { PCY1: 1.6, PDY1: 1.5, PDY2: -0.1 } };
  const dd = M.validateTirModel(degenerate);
  check('tval: degenerate (Fy0≡0) → error TIR_NO_EFFECTIVE_LATERAL_FORCE',
    dd.some(d => d.code === 'TIR_NO_EFFECTIVE_LATERAL_FORCE' && d.severity === 'error'));
  check('tval: degenerate → importedTirMetadata overallStatus imported_error (never imported_valid)',
    M.importedTirMetadata(degenerate).overallStatus === 'imported_error');
  check('tval: valid (non-degenerate) → NO effective-lateral-force error',
    !M.validateTirModel(valid).some(d => d.code === 'TIR_NO_EFFECTIVE_LATERAL_FORCE'));

  // wiring: metadata derives status from validation, and reuses its diagnostics
  const metaErr = M.importedTirMetadata({ Fnom: 4000, raw: { PCY1: 1.6, PKY1: -30, PKY2: 1.8 } });
  check('tval: importedTirMetadata(no PDY1) → overallStatus imported_error', metaErr.overallStatus === 'imported_error');
  const bm = M.buildTireModelMetadata({ useTir: true, tirParsed: valid });
  check('tval: buildTireModelMetadata diagnostics come from validateTirModel',
    bm.diagnostics.some(d => d.code === 'TIR_LATERAL_ONLY'));
}

// ── Phase 3A: telemetry catalog metadata + diagnostics (catalog-only, clean-room) ──
console.log('\n[telemetry] .bmsbin catalog metadata + diagnostics');
{
  const mk = (names, valid = true) => ({ header: { importer: valid ? 'DarabImporter v.' : 'XYZ', valid }, channelCount: names.length, channels: names.map(n => ({ name: n })) });

  // canonical mapping returns the matched RAW name, not just a boolean
  const map = M.mapTelemetryChannels([{ name: 'accy' }, { name: 'yaw' }, { name: 'steer' }, { name: 'speed' }, { name: 'vwheel_fl' }, { name: 'trvdam_rl' }, { name: 'R_H_Front' }]);
  check('telemetry: canonical mapping returns matched raw name',
    map.lateral_accel.rawName === 'accy' && map.yaw_rate.rawName === 'yaw' && map.steering.rawName === 'steer' && map.speed.rawName === 'speed');
  check('telemetry: maps wheel-speed / damper / ride-height',
    map.wheel_speed_fl.rawName === 'vwheel_fl' && map.damper_rl.rawName === 'trvdam_rl' && map.ride_height_front.rawName === 'R_H_Front');

  // full catalog → catalog_only, capabilities limited to channelCatalog
  const full = M.buildTelemetryMetadata(mk(['accy', 'accx', 'yaw', 'steer', 'speed', 'vwheel_fl', 'trvdam_fl', 'R_H_Front']));
  check('telemetry: valid catalog → status catalog_only', full.status === 'catalog_only');
  check('telemetry: capabilities — catalog true, all decoding false',
    full.capabilities.channelCatalog === true && full.capabilities.timeSeries === false
    && full.capabilities.physicalScaling === false && full.capabilities.handlingCorrelation === false);
  check('telemetry: required channels carry raw names',
    full.requiredChannels.lateral_accel.rawName === 'accy' && full.requiredChannels.speed.rawName === 'speed');
  check('telemetry: catalog-only emits time-series-not-decoded warning',
    full.diagnostics.some(d => d.code === 'TELEM_TIMESERIES_NOT_DECODED' && d.severity === 'warning'));
  check('telemetry: full core → validation-detected + ready-for-3B info',
    full.diagnostics.some(d => d.code === 'TELEM_VALIDATION_CHANNELS_DETECTED' && d.severity === 'info')
    && full.diagnostics.some(d => d.code === 'TELEM_READY_FOR_3B'));

  // missing core channels → individual warnings (accy present → no lateral warning)
  const partial = M.buildTelemetryMetadata(mk(['accy']));
  check('telemetry: missing yaw/steer/speed → warnings; lateral present → no lateral warning',
    partial.diagnostics.some(d => d.code === 'TELEM_NO_YAW_RATE' && d.severity === 'warning')
    && partial.diagnostics.some(d => d.code === 'TELEM_NO_STEERING')
    && partial.diagnostics.some(d => d.code === 'TELEM_NO_SPEED')
    && !partial.diagnostics.some(d => d.code === 'TELEM_NO_LATERAL_ACCEL'));
  check('telemetry: partial still catalog_only (no time-series)',
    partial.status === 'catalog_only' && partial.capabilities.timeSeries === false);

  // non-Darab → single error, decode_error status
  const bad = M.buildTelemetryMetadata(mk(['accy'], false));
  check('telemetry: non-Darab → error TELEM_NOT_DARAB + decode_error',
    bad.status === 'decode_error' && bad.diagnostics.length === 1
    && bad.diagnostics[0].code === 'TELEM_NOT_DARAB' && bad.diagnostics[0].severity === 'error');
  // zero channels → error
  const empty = M.buildTelemetryMetadata(mk([]));
  check('telemetry: zero channels → error TELEM_NO_CHANNELS',
    empty.diagnostics.some(d => d.code === 'TELEM_NO_CHANNELS' && d.severity === 'error'));

  // integrates with the parseBms-shaped object
  check('telemetry: consumes parseBms shape (header/channelCount/channels)',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'steer' }] }).requiredChannels.steering.rawName === 'steer');
}

// ── Phase 3B-0: .bmsbin binary sample-block probe (synthetic fixtures, clean-room) ──
console.log('\n[probe] .bmsbin binary sample-block probe');
{
  const strTok = (s) => { const b = Buffer.from(s + '\0', 'ascii'); const L = Buffer.alloc(2); L.writeUInt16LE(b.length, 0); return Buffer.concat([L, b]); };
  // synthetic .bmsbin-like buffer — NO real telemetry data, only structure
  function makeBms({ channels = ['accy', 'yaw', 'steer', 'speed'], int16 = 0, counter = 0, randomBytes = 0, darab = true } = {}) {
    const parts = [Buffer.from(darab ? 'DarabImporter v.\0' : 'XYZImporter v.\0', 'ascii'), Buffer.alloc(8)];
    for (const c of channels) parts.push(strTok('TrackInfo'), Buffer.from([1, 2, 3, 4]), strTok(c), strTok('MS5.8'), strTok(c + ' desc'));
    if (int16 > 0) { const b = Buffer.alloc(int16 * 2); for (let k = 0; k < int16; k++) b.writeInt16LE(Math.round(2000 * Math.sin(k / 20)), k * 2); parts.push(b); }
    if (counter > 0) { const b = Buffer.alloc(counter * 4); for (let k = 0; k < counter; k++) b.writeUInt32LE(1000 + k * 10, k * 4); parts.push(b); }
    if (randomBytes > 0) { const b = Buffer.alloc(randomBytes); let x = 12345; for (let i = 0; i < randomBytes; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; b[i] = (x >> 16) & 0xff; } parts.push(b); }
    return new Uint8Array(Buffer.concat(parts));
  }
  const code = (r, c) => r.diagnostics.some(d => d.code === c);

  // 1. empty → error
  check('probe: empty file → error BMS_PROBE_EMPTY_FILE',
    code(M.probeBmsBinary(new Uint8Array(0)), 'BMS_PROBE_EMPTY_FILE'));
  // 2. non-Darab header → error
  check('probe: non-Darab header → error BMS_PROBE_INVALID_HEADER',
    code(M.probeBmsBinary(makeBms({ darab: false, int16: 800 })), 'BMS_PROBE_INVALID_HEADER'));
  // 3. catalog only → catalog found + no sample region
  const catOnly = M.probeBmsBinary(makeBms({ int16: 0 }));
  check('probe: catalog-only → catalog found + no-sample-region warning + no regions',
    code(catOnly, 'BMS_PROBE_CATALOG_REGION_FOUND') && code(catOnly, 'BMS_PROBE_NO_SAMPLE_REGION_FOUND') && catOnly.candidateRegions.length === 0);
  // 4. catalog + numeric int16 region → candidate region + int16 encoding
  const withNum = M.probeBmsBinary(makeBms({ int16: 2000 }));
  check('probe: catalog + numeric region → candidate binary region found',
    withNum.candidateRegions.length > 0 && code(withNum, 'BMS_PROBE_BINARY_REGION_FOUND'));
  check('probe: numeric region → int16le encoding flagged plausible',
    !!withNum.candidateEncodings.int16le && withNum.candidateEncodings.int16le.plausible === true);
  // 5. monotonic counter region → timebase clue candidate
  const withCounter = M.probeBmsBinary(makeBms({ int16: 0, counter: 600 }));
  check('probe: monotonic counter → timebase clue candidate',
    withCounter.timebaseClues.some(c => c.type === 'monotonic_counter_candidate'));
  // 6. random region → no decoded claim, still probe_only
  const withRandom = M.probeBmsBinary(makeBms({ int16: 0, randomBytes: 6000 }));
  check('probe: random region → probe_only + scaling-not-decoded warning',
    withRandom.status === 'probe_only' && code(withRandom, 'BMS_PROBE_SCALING_NOT_DECODED'));
  // 7. schema stable + never claims decoded
  check('probe: report schema stable (probe_only, arrays, unknowns)',
    withNum.status === 'probe_only' && Array.isArray(withNum.candidateRegions) && typeof withNum.candidateEncodings === 'object'
    && Array.isArray(withNum.timebaseClues) && Array.isArray(withNum.unknowns) && withNum.unknowns.length > 0);
  check('probe: always honest — probe-only + time-series-not-confirmed diagnostics',
    code(withNum, 'BMS_PROBE_ONLY') && code(withNum, 'BMS_PROBE_TIMESERIES_NOT_CONFIRMED'));

  // probe → telemetry metadata integration (status advances conservatively, no decode claim)
  const tmeta = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: [{ name: 'accy' }, { name: 'yaw' }, { name: 'steer' }, { name: 'speed' }], probe: withNum });
  check('probe→metadata: status probe_available + sampleProbe true, decoding still false',
    tmeta.status === 'probe_available' && tmeta.capabilities.sampleProbe === true
    && tmeta.capabilities.timeSeries === false && tmeta.capabilities.handlingCorrelation === false);
  check('probe→metadata: probe summary attached (regionCount + diagnostics)',
    !!tmeta.probe && tmeta.probe.regionCount > 0 && Array.isArray(tmeta.probe.diagnostics));
  check('probe→metadata: no probe → stays catalog_only, sampleProbe false',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).status === 'catalog_only');
}

// ── Phase 3B-1: raw time-series candidate extraction (synthetic; raw-only, no decode) ──
console.log('\n[raw] .bmsbin raw time-series candidate extraction');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const mkInt16 = (vals) => { const b = Buffer.alloc(vals.length * 2); vals.forEach((v, i) => b.writeInt16LE(v, i * 2)); return new Uint8Array(b); };
  const probeOf = (bytes, opts = {}) => ({
    probeVersion: '3B-0',
    candidateRegions: [{ start: 0, end: bytes.length, length: bytes.length, confidence: opts.conf || 'high', evidence: {} }],
    timebaseClues: opts.timebase ? [{ type: 'monotonic_counter_candidate', runLength: opts.timebase, medianDelta: 10, confidence: 'medium' }] : [],
  });

  // 1. no probe report → error
  check('raw: no probe report → error', code(M.extractBmsRawCandidates(mkInt16([1, 2, 3]), null), 'BMS_RAW_NO_PROBE_REPORT'));
  // 2. probe with no candidate region → error + no extraction
  const noRegion = M.extractBmsRawCandidates(mkInt16([1, 2, 3]), { probeVersion: '3B-0', candidateRegions: [], timebaseClues: [] });
  check('raw: no candidate region → error + no series', code(noRegion, 'BMS_RAW_NO_CANDIDATE_REGION') && noRegion.rawSeriesCandidates.length === 0);
  // 3+4. int16 ramp 0..999 → candidate found + stats correct
  const ramp = []; for (let i = 0; i < 1000; i++) ramp.push(i); const rb = mkInt16(ramp);
  const rr = M.extractBmsRawCandidates(rb, probeOf(rb));
  check('raw: numeric region → raw series candidate found', rr.rawSeriesCandidates.length > 0 && code(rr, 'BMS_RAW_SERIES_CANDIDATES_FOUND'));
  const c1 = rr.rawSeriesCandidates[0];
  check('raw: int16le stats correct (min/max/mean of 0..999)',
    c1.encoding === 'int16le' && c1.minRaw === 0 && c1.maxRaw === 999 && Math.abs(c1.meanRaw - 499.5) < 0.01);
  check('raw: series carries raw-only notes (no scaling / no mapping)',
    c1.notes.includes('raw values only') && c1.notes.includes('not physically scaled') && c1.notes.includes('not mapped to canonical channel'));
  // 5. timebase clue → candidate only
  const tb = M.extractBmsRawCandidates(rb, probeOf(rb, { timebase: 600 }));
  check('raw: timebase clue → candidate only (not a confirmed timestamp)',
    tb.timebaseCandidate.present === true && tb.timebaseCandidate.notes.some(n => /not a confirmed timestamp/.test(n)) && tb.capabilities.timeSeries === false);
  // 6. interleaved data → interleaved layout hypothesis
  const recs = 500; const ibuf = Buffer.alloc(recs * 8);
  for (let k = 0; k < recs; k++) { ibuf.writeInt16LE(k, k * 8); ibuf.writeInt16LE(0x0500, k * 8 + 2); ibuf.writeInt16LE(Math.round(1000 * Math.sin(k / 15)), k * 8 + 4); ibuf.writeInt16LE(0, k * 8 + 6); }
  const ir = M.extractBmsRawCandidates(new Uint8Array(ibuf), probeOf(new Uint8Array(ibuf)));
  check('raw: interleaved data → interleaved layout hypothesis (≥2 channels)',
    ir.extractionAttempts.some(a => a.layoutHypothesis === 'interleaved' && a.evidence.plausibleSeriesCount >= 2));
  // 7-9. red lines hold
  check('raw: channel mapping stays not_mapped', rr.channelMapping.status === 'not_mapped');
  check('raw: physicalScaling + handlingCorrelation + timeSeries stay false',
    rr.capabilities.physicalScaling === false && rr.capabilities.handlingCorrelation === false && rr.capabilities.timeSeries === false);
  check('raw: rawTimeSeriesCandidates true + status raw_candidates_only',
    rr.capabilities.rawTimeSeriesCandidates === true && rr.status === 'raw_candidates_only');
  // end-to-end: real probe → extract
  const strTok = (s) => { const b = Buffer.from(s + '\0', 'ascii'); const L = Buffer.alloc(2); L.writeUInt16LE(b.length, 0); return Buffer.concat([L, b]); };
  const sineB = Buffer.alloc(4000); for (let k = 0; k < 2000; k++) sineB.writeInt16LE(Math.round(2000 * Math.sin(k / 20)), k * 2);
  const full = new Uint8Array(Buffer.concat([Buffer.from('DarabImporter v.\0', 'ascii'), Buffer.alloc(8), strTok('TrackInfo'), Buffer.from([1, 2, 3, 4]), strTok('accy'), strTok('MS5.8'), sineB]));
  const er = M.extractBmsRawCandidates(full, M.probeBmsBinary(full));
  check('raw: end-to-end probe→extract yields candidates', er.rawSeriesCandidates.length > 0 && er.status === 'raw_candidates_only');

  // raw → telemetry metadata integration (status advances, but never claims decoded)
  const tm = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: [{ name: 'accy' }, { name: 'yaw' }, { name: 'steer' }, { name: 'speed' }], probe: probeOf(rb), raw: rr });
  check('raw→metadata: status raw_candidates_only + rawTimeSeriesCandidates true; physical/handling false',
    tm.status === 'raw_candidates_only' && tm.capabilities.rawTimeSeriesCandidates === true
    && tm.capabilities.physicalScaling === false && tm.capabilities.handlingCorrelation === false && tm.capabilities.timeSeries === false);
  check('raw→metadata: rawExtraction summary attached (seriesCount + channelMapping not_mapped)',
    !!tm.rawExtraction && tm.rawExtraction.seriesCount > 0 && tm.rawExtraction.channelMapping === 'not_mapped');
}

// ── Phase 3C-0: channel-linking / scaling hypotheses (synthetic; hypotheses only) ──
console.log('\n[link] .bmsbin channel-linking hypotheses');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const bmsStub = (names) => ({ channels: names.map(nm => ({ name: nm })), channelCount: names.length });
  const rawStub = (n, sampleCount = 600) => ({
    rawSeriesCandidates: Array.from({ length: n }, (_, i) => ({ id: 'candidate_' + String(i + 1).padStart(3, '0'), encoding: 'int16le', sampleCount, samplePreview: [0, 1, 2, 3, 4], minRaw: 0, maxRaw: 100, meanRaw: 50, confidence: 'medium', notes: ['raw values only', 'not physically scaled', 'not mapped to canonical channel'] })),
    timebaseCandidate: { present: true, sampleCount, medianDelta: 10, confidence: 'medium' },
  });

  // 1. no raw extraction → error
  check('link: no raw extraction → error', code(M.linkBmsRawCandidates(bmsStub(['accy']), null, null), 'BMS_LINK_NO_RAW_EXTRACTION'));
  // 2. no catalog → warning (raw still present)
  check('link: no catalog → warning', code(M.linkBmsRawCandidates({ channels: [], channelCount: 0 }, null, rawStub(3)), 'BMS_LINK_NO_CATALOG'));

  // 3. count match → count-match hypothesis (low-confidence order hypothesis)
  const four = M.linkBmsRawCandidates(bmsStub(['accy', 'yaw', 'steer', 'speed']), { timebaseClues: [] }, rawStub(4));
  check('link: count match → count-match info + low-confidence order hypothesis',
    code(four, 'BMS_LINK_CHANNEL_COUNT_MATCH_CANDIDATE') && four.channelIdentityHypotheses[0].confidence === 'low' && four.channelIdentityHypotheses[0].possibleRawChannelName === 'accy');
  // 5. no explicit mapping → identity unconfirmed
  check('link: no explicit mapping → channel identity not confirmed',
    code(four, 'BMS_LINK_CHANNEL_IDENTITY_NOT_CONFIRMED') && four.channelIdentityHypotheses.every(h => h.confidence !== 'high'));

  // 4. explicit mapping → high-confidence identity (synthetic only)
  const exMap = { candidate_001: { rawChannelName: 'accy', canonicalName: 'lateral_accel', scale: 0.01, offset: 0, unit: 'g' } };
  const exr = M.linkBmsRawCandidates(bmsStub(['accy', 'yaw', 'steer', 'speed']), { timebaseClues: [] }, rawStub(4), { explicitMapping: exMap });
  check('link: explicit mapping → high-confidence identity (synthetic case only)',
    exr.channelIdentityHypotheses[0].confidence === 'high' && exr.channelIdentityHypotheses[0].possibleCanonicalName === 'lateral_accel');
  // 6. explicit scale → scaling hypothesis (not validated)
  check('link: explicit scale → scaling hypothesis (metadata_candidate)',
    exr.scalingHypotheses[0].scale === 0.01 && exr.scalingHypotheses[0].method === 'metadata_candidate' && code(exr, 'BMS_LINK_SCALING_HYPOTHESIS_AVAILABLE'));
  // 7. no scale → manual_required, physicalScaling false
  check('link: no scale → manual_required + physicalScaling false',
    four.scalingHypotheses[0].method === 'manual_required' && four.capabilities.physicalScaling === false);
  // 8. canonicalPreview only with explicit identity+scale
  check('link: canonicalPreview available only with explicit identity+scale',
    four.canonicalPreview.available === false && exr.canonicalPreview.available === true);
  // 9. handlingCorrelation / timeSeries / physicalScaling stay false even with explicit mapping
  check('link: decode-grade capabilities stay false even with explicit mapping',
    exr.capabilities.handlingCorrelation === false && exr.capabilities.timeSeries === false && exr.capabilities.physicalScaling === false);
  // timebase hypothesis (candidate only, sample-count match)
  check('link: timebase hypothesis formed (candidate only, sample-count match)',
    four.timebaseHypotheses.length > 0 && four.timebaseHypotheses[0].sampleCountMatch === true && code(four, 'BMS_LINK_TIMEBASE_HYPOTHESIS_AVAILABLE'));

  // link → telemetry metadata integration (status advances, decode-grade caps stay false)
  const tlm = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: [{ name: 'accy' }, { name: 'yaw' }, { name: 'steer' }, { name: 'speed' }], probe: { candidateRegions: [{ start: 0, end: 100, length: 100, confidence: 'high' }], timebaseClues: [] }, raw: rawStub(4), link: four });
  check('link→metadata: status linking_hypotheses_only + linking/scaling caps true; decode-grade false',
    tlm.status === 'linking_hypotheses_only' && tlm.capabilities.channelLinkingHypotheses === true && tlm.capabilities.scalingHypotheses === true
    && tlm.capabilities.physicalScaling === false && tlm.capabilities.handlingCorrelation === false && tlm.capabilities.timeSeries === false);
  check('link→metadata: linking summary attached (identity not confirmed, no canonical preview)',
    !!tlm.linking && tlm.linking.channelIdentityConfirmed === false && tlm.linking.canonicalPreviewAvailable === false);
}

// ── Phase 3C-1: local validation reporter stays fixture-safe (sanitized by construction) ──
console.log('\n[tool] local validation reporter — fixture-safe / sanitized output');
{
  const reporter = require(path.join(__dirname, '..', 'tools', 'bmsbin-local-probe-report.js'));
  const strTok = (s) => { const b = Buffer.from(s + '\0', 'ascii'); const L = Buffer.alloc(2); L.writeUInt16LE(b.length, 0); return Buffer.concat([L, b]); };
  // synthetic .bmsbin-like fixture — NO real telemetry, only a catalog token + a sine int16 region
  const sine = Buffer.alloc(4000); for (let k = 0; k < 2000; k++) sine.writeInt16LE(Math.round(2000 * Math.sin(k / 20)), k * 2);
  const fixture = new Uint8Array(Buffer.concat([
    Buffer.from('DarabImporter v.\0', 'ascii'), Buffer.alloc(8),
    strTok('TrackInfo'), Buffer.from([1, 2, 3, 4]), strTok('accy'), strTok('MS5.8'), sine,
  ]));
  // names that would betray raw-content leakage (sample values, raw bytes, byte offsets)
  const FORBIDDEN = ['samplePreview', 'sampleValues', 'rawBytes', 'bytes', 'offset', 'minRaw', 'maxRaw', 'meanRaw', 'preview', 'samples'];
  const hasForbidden = (str) => FORBIDDEN.some(bad => str.toLowerCase().includes(bad.toLowerCase()));

  // 1. the whitelist itself can never name a raw-content field
  check('tool: REPORT_FIELDS whitelist names no raw-content field',
    reporter.REPORT_FIELDS.length > 0 && reporter.REPORT_FIELDS.every(f => !hasForbidden(f)));

  // 2. summarizeFile emits only whitelisted keys
  const s = reporter.summarizeFile(fixture, M, { scanWindowBytes: 64 * 1024 });
  const keys = Object.keys(s);
  check('tool: summarizeFile emits only whitelisted REPORT_FIELDS',
    keys.length > 0 && keys.every(k => reporter.REPORT_FIELDS.includes(k)));

  // 3. every summary value is a sanitized scalar — no array/object can carry a raw series
  check('tool: summary values are scalars only (no raw arrays/objects)',
    keys.every(k => { const v = s[k]; return v === null || ['boolean', 'number', 'string'].includes(typeof v); }));

  // 4. the summary still reflects a real pipeline run, and never claims decoding
  check('tool: summary reflects pipeline run + claims no decode',
    s.catalogDetected === true && typeof s.linkStatus === 'string'
    && s.channelIdentityConfirmed === false && s.canonicalAvailable === false);

  // 5. aggregate is statistics only — counts / 2-element ranges / name→count histograms
  const agg = reporter.aggregate([s, s]);
  const aggOk = Object.values(agg).every(v => {
    if (Array.isArray(v)) return v.length <= 2 && v.every(x => typeof x === 'number');      // ranges
    if (v && typeof v === 'object') return Object.values(v).every(x => typeof x === 'number'); // histograms
    return v === null || ['number', 'string', 'boolean'].includes(typeof v);
  });
  check('tool: aggregate emits counts/ranges/histograms only (no raw arrays)', aggOk && agg.filesTested === 2);

  // 6. defense-in-depth — serialized output carries no raw-content field name at all
  check('tool: serialized summary+aggregate names no raw-content field',
    !hasForbidden(JSON.stringify(s) + JSON.stringify(agg)));

  // 7. Phase 3D-0 confirmation fields present, sanitized scalars, and honest (catalog yes / structure no without a corpus)
  check('tool: summary carries sanitized confirmation decision (catalog confirmed, structure not, no decode)',
    typeof s.confirmationStatus === 'string' && s.confirmedCatalog === true && s.confirmedStructure === false
    && s.canonicalTelemetry === false && typeof s.confirmationScore === 'number');

  // 8. aggregate reports confirmation counts + cross-file corpus evidence as scalars/histograms (still sanitized)
  check('tool: aggregate reports confirmation counts + corpus booleans (sanitized)',
    typeof agg.confirmedCatalog === 'number' && agg.confirmedStructure === 0
    && typeof agg.corpusChannelCountStable === 'boolean' && typeof agg.corpusCandidateRegionStable === 'boolean'
    && agg.confirmationStatusHistogram && Object.values(agg.confirmationStatusHistogram).every(x => typeof x === 'number'));

  // 9. Phase 3G-0A extraction eligibility present, sanitized scalars, honest (real single file never eligible)
  check('tool: summary carries sanitized extraction eligibility (not eligible, 0 eligible, no measured values)',
    typeof s.extractionEligibilityStatus === 'string' && s.extractionEligibilityStatus === 'not_eligible'
    && s.extractionEligibleCount === 0 && typeof s.extractionEligibleChannelCount === 'number'
    && typeof agg.eligibleForExtractionFiles === 'number' && agg.eligibleForExtractionFiles === 0
    && agg.extractionEligibilityStatusHistogram && Object.values(agg.extractionEligibilityStatusHistogram).every(x => typeof x === 'number'));

  // 10. Phase 3G-0B measured extraction present, sanitized scalars, honest (real file blocked, never extracted, realDataUsed false)
  check('tool: summary carries sanitized measured extraction (real file blocked, 0 corners, realDataUsed false, no tendency)',
    typeof s.measuredExtractionStatus === 'string' && s.measuredExtractionStatus !== 'extracted_synthetic'
    && s.measuredExtractionCornerCount === 0 && s.measuredExtractionRealDataUsed === false
    && typeof agg.measuredExtractionSyntheticFiles === 'number' && agg.measuredExtractionSyntheticFiles === 0
    && agg.measuredExtractionStatusHistogram && Object.values(agg.measuredExtractionStatusHistogram).every(x => typeof x === 'number'));
}

// ── Phase 3D-0: hypothesis→confirmed criteria (synthetic; decisions, never decoded values) ──
console.log('\n[confirm] .bmsbin hypothesis→confirmed criteria');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const bmsStub = (names) => ({ header: { valid: true }, channels: names.map(nm => ({ name: nm })), channelCount: names.length });
  const rawStub = (n, sampleCount = 600) => ({
    rawSeriesCandidates: Array.from({ length: n }, (_, i) => ({ id: 'candidate_' + String(i + 1).padStart(3, '0'), encoding: 'int16le', sampleCount, minRaw: 0, maxRaw: 100, meanRaw: 50, confidence: 'medium' })),
    timebaseCandidate: { present: true, sampleCount, medianDelta: 10, confidence: 'medium' },
  });
  const probeMono = { timebaseClues: [{ type: 'monotonic_counter_candidate', runLength: 600, medianDelta: 10, confidence: 'medium' }] };
  const STABLE = { channelCountStable: true, candidateRegionStable: true, catalogDetectedAll: true };
  const names4 = ['accy', 'yaw', 'steer', 'speed'];
  const exMap = { candidate_001: { rawChannelName: 'accy', canonicalName: 'lateral_accel', scale: 0.01, offset: 0, unit: 'g' } };
  const exMapNoScale = { candidate_001: { rawChannelName: 'accy', canonicalName: 'lateral_accel' } };

  // 1. catalog-only → catalog confirmed, sample structure not confirmed
  const c1 = M.evaluateBmsConfirmationEvidence(bmsStub(names4), null, null, null, {});
  check('confirm: catalog-only → catalog confirmed, structure not, status not_confirmed',
    c1.decisions.canConfirmCatalog === true && c1.decisions.canConfirmSampleStructure === false
    && c1.status === 'not_confirmed' && code(c1, 'BMS_CONFIRM_CATALOG_CONFIRMED'));

  const raw4 = rawStub(4);
  const link4 = M.linkBmsRawCandidates(bmsStub(names4), probeMono, raw4, {});

  // 2. unstable candidate regions (matching counts, but region layout not stable) → structure not confirmed
  const c2 = M.evaluateBmsConfirmationEvidence(bmsStub(names4), probeMono, raw4, link4, { corpus: { channelCountStable: true, candidateRegionStable: false, catalogDetectedAll: true } });
  check('confirm: unstable candidate regions → sample structure not confirmed',
    c2.decisions.canConfirmSampleStructure === false && code(c2, 'BMS_CONFIRM_STRUCTURE_NOT_CONFIRMED'));

  // 3. stable per-channel structure (corpus stable + raw count matches catalog) → structure can be confirmed
  const c3 = M.evaluateBmsConfirmationEvidence(bmsStub(names4), probeMono, raw4, link4, { corpus: STABLE });
  check('confirm: stable regions + matching raw count → sample structure can be confirmed',
    c3.decisions.canConfirmSampleStructure === true && (c3.status === 'partially_confirmed' || c3.status === 'confirmed_structure'));

  // 4. explicit synthetic channel mapping → channel identity can be confirmed
  const linkEx = M.linkBmsRawCandidates(bmsStub(names4), probeMono, raw4, { explicitMapping: exMap });
  const c4 = M.evaluateBmsConfirmationEvidence(bmsStub(names4), probeMono, raw4, linkEx, { corpus: STABLE });
  check('confirm: explicit mapping → channel identity can be confirmed (synthetic)',
    c4.decisions.canConfirmChannelIdentity === true);

  // 5. no explicit mapping → channel identity remains false (catalog order is not enough)
  check('confirm: no explicit mapping → channel identity stays false',
    c3.decisions.canConfirmChannelIdentity === false && code(c3, 'BMS_CONFIRM_CHANNEL_IDENTITY_NOT_CONFIRMED'));

  // 6. monotonic counter with sample-count match (+ resolved structure) → timebase can be confirmed
  check('confirm: monotonic counter + sample-count match → timebase can be confirmed',
    c3.evidence.timebaseConfirmed === true && c3.decisions.canConfirmTimebase === true);

  // 7. no scale table → physicalScaling remains false (even with confirmed identity)
  const linkNoScale = M.linkBmsRawCandidates(bmsStub(names4), probeMono, raw4, { explicitMapping: exMapNoScale });
  const c7 = M.evaluateBmsConfirmationEvidence(bmsStub(names4), probeMono, raw4, linkNoScale, { corpus: STABLE });
  check('confirm: no scale table → physical scaling stays false',
    c7.decisions.canConfirmChannelIdentity === true && c7.decisions.canConfirmPhysicalScaling === false
    && c7.capabilities.physicalScaling === false);

  // 8. explicit synthetic scale table → scaling criteria can be confirmed (synthetic); cap stays false
  check('confirm: explicit scale → scaling criteria confirmed (synthetic), physicalScaling cap still false',
    c4.decisions.canConfirmPhysicalScaling === true && c4.capabilities.physicalScaling === false);

  // 9. real-data-like aggregate (85 catalog / 2 raw, no corpus, no explicit) → not confirmed
  const names85 = Array.from({ length: 85 }, (_, i) => 'ch' + i);
  const raw2 = rawStub(2);
  const link85 = M.linkBmsRawCandidates(bmsStub(names85), probeMono, raw2, {});
  const c9 = M.evaluateBmsConfirmationEvidence(bmsStub(names85), probeMono, raw2, link85, {});
  check('confirm: real-data-like (85 ch / 2 raw, no corpus) → catalog only, status not_confirmed',
    c9.decisions.canConfirmCatalog === true && c9.decisions.canConfirmSampleStructure === false
    && c9.decisions.canConfirmChannelIdentity === false && c9.decisions.canonicalTelemetryPrerequisitesMet === false
    && c9.status === 'not_confirmed');

  // 9b. (regression) single file + explicit mapping (high-conf id + metadata scale) but NO corpus
  // → identity / scaling / canonical-prereq stay false because sample structure is unconfirmed.
  const cNoCorpus = M.evaluateBmsConfirmationEvidence(bmsStub(names4), probeMono, raw4, linkEx, {});
  check('confirm: explicit mapping but NO corpus → identity/scaling/canonical stay false (structure gates them)',
    cNoCorpus.decisions.canConfirmSampleStructure === false && cNoCorpus.decisions.canConfirmChannelIdentity === false
    && cNoCorpus.decisions.canConfirmPhysicalScaling === false && cNoCorpus.decisions.canonicalTelemetryPrerequisitesMet === false
    && cNoCorpus.status === 'not_confirmed');

  // 10. handlingCorrelation / timeSeries / physicalScaling stay false even at confirmed_structure
  check('confirm: decode-grade capabilities stay false even when structure is confirmed',
    c4.capabilities.handlingCorrelation === false && c4.capabilities.timeSeries === false
    && c4.capabilities.physicalScaling === false && c4.capabilities.confirmationCriteria === true);

  // schema: scores present, canonical blocked, blockers + next-evidence emitted
  check('confirm: report schema (scores + blockers + nextEvidenceNeeded + canonical blocked)',
    typeof c9.scores.overallScore === 'number' && Array.isArray(c9.blockers) && c9.blockers.length > 0
    && Array.isArray(c9.nextEvidenceNeeded) && code(c9, 'BMS_CONFIRM_CANONICAL_NOT_AVAILABLE'));

  // confirmation → telemetry metadata integration (surfaced, but never changes decode-grade caps)
  const cm = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: names4.map(n => ({ name: n })), probe: { candidateRegions: [{ start: 0, end: 100, length: 100, confidence: 'high' }], timebaseClues: [] }, raw: raw4, link: link4, confirmation: c9 });
  check('confirm→metadata: confirmation summary surfaced + confirmationCriteria cap true; decode-grade false',
    !!cm.confirmation && cm.confirmation.status === 'not_confirmed' && cm.capabilities.confirmationCriteria === true
    && cm.capabilities.timeSeries === false && cm.capabilities.physicalScaling === false && cm.capabilities.handlingCorrelation === false);
  check('confirm→metadata: no confirmation → confirmationCriteria false, confirmation null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).capabilities.confirmationCriteria === false);
}

// ── Phase 3D-1: sample-structure discovery (synthetic; hypotheses only, never converged) ──
console.log('\n[struct] .bmsbin sample-structure discovery');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const strTok = (s) => { const b = Buffer.from(s + '\0', 'ascii'); const L = Buffer.alloc(2); L.writeUInt16LE(b.length, 0); return Buffer.concat([L, b]); };
  // synthetic catalog (NO real telemetry) — header + N TrackInfo-delimited channel tokens
  const catalog = (names) => {
    const parts = [Buffer.from('DarabImporter v.\0', 'ascii'), Buffer.alloc(8)];
    for (const c of names) parts.push(strTok('TrackInfo'), Buffer.from([1, 2, 3, 4]), strTok(c), strTok('MS5.8'), strTok(c + ' d'));
    return parts;
  };
  const u32arr = (vals) => { const b = Buffer.alloc(vals.length * 4); vals.forEach((v, i) => b.writeUInt32LE(v >>> 0, i * 4)); return b; };
  const names85 = Array.from({ length: 85 }, (_, i) => 'ch' + i);
  const pipeline = (bytes) => {
    const r = M.parseBms(bytes);
    const probe = M.probeBmsBinary(bytes);
    const raw = M.extractBmsRawCandidates(bytes, probe, { catalogChannelCount: r.channelCount });
    const link = M.linkBmsRawCandidates(r, probe, raw, {});
    const conf = M.evaluateBmsConfirmationEvidence(r, probe, raw, link, {});
    const structure = M.discoverBmsSampleStructure(bytes, r, probe, raw, link, conf, { catalogChannelCount: r.channelCount });
    return { r, probe, raw, link, conf, structure };
  };

  // 1. catalog-only (no sample region / no raw series) → hypotheses only, not converged
  const co = pipeline(new Uint8Array(Buffer.concat(catalog(names85))));
  check('struct: catalog-only (no raw) → hypotheses-only + not converged + warning',
    co.structure.status === 'structure_hypotheses_only' && co.structure.inputs.rawSeriesCandidateCount === 0
    && co.structure.convergence.sampleStructureConverged === false && code(co.structure, 'BMS_STRUCT_HYPOTHESES_ONLY'));

  // 2. 85-entry monotonic in-range offset table → offset_table candidate matching catalog count
  const catParts = catalog(names85);
  const catLen = Buffer.concat(catParts).length;
  const dataStart = catLen + 85 * 4;
  const dataBlob = Buffer.alloc(85 * 200);                       // in-range targets live here (zeros)
  const offsets = []; for (let i = 0; i < 85; i++) offsets.push(dataStart + i * 200);
  const offFx = new Uint8Array(Buffer.concat([...catParts, u32arr(offsets), dataBlob]));
  const offRes = pipeline(offFx);
  const ot = offRes.structure.channelTableCandidates.find(t => t.kind === 'offset_table');
  check('struct: 85-entry in-range offset table → candidate matches catalog (targets plausible)',
    !!ot && ot.entryCount === 85 && ot.relationToCatalogCount === 'matches' && ot.targetsPlausible === true
    && offRes.structure.structureHypotheses.some(h => h.type === 'offset_table') && code(offRes.structure, 'BMS_STRUCT_OFFSET_TABLE_CANDIDATE'));

  // 3. offset table whose targets fall outside the file → candidate present but NOT confirmed
  const badOffsets = []; for (let i = 0; i < 85; i++) badOffsets.push(1000000000 + i * 1000);
  const badFx = new Uint8Array(Buffer.concat([...catParts, u32arr(badOffsets)]));
  const badRes = pipeline(badFx);
  const badOt = badRes.structure.channelTableCandidates.find(t => t.kind === 'offset_table');
  check('struct: offset table with out-of-file targets → not confirmed (targetsPlausible false)',
    !!badOt && badOt.targetsPlausible === false && code(badRes.structure, 'BMS_STRUCT_OFFSET_TABLE_NOT_CONFIRMED')
    && badRes.structure.convergence.sampleStructureConverged === false
    && badRes.structure.confirmationFeed.perChannelBlockCountCandidate === false);

  // 4. 85 length-prefixed blocks → per_channel_blocks hypothesis (count matches catalog)
  const blkParts = catalog(names85);
  for (let c = 0; c < 85; c++) { const L = 200; const blk = Buffer.alloc(2 + L); blk.writeUInt16LE(L, 0); for (let k = 0; k < L / 2; k++) blk.writeInt16LE(Math.round(1000 * Math.sin((c * 7 + k) / 15)), 2 + k * 2); blkParts.push(blk); }
  const blkRes = pipeline(new Uint8Array(Buffer.concat(blkParts)));
  check('struct: 85 length-prefixed blocks → per_channel_blocks hypothesis matching catalog',
    blkRes.structure.structureHypotheses.some(h => h.type === 'per_channel_blocks')
    && blkRes.structure.perChannelEvidence.candidateChannelBlocks === 85 && blkRes.structure.perChannelEvidence.countRelation === 'matches'
    && blkRes.structure.confirmationFeed.perChannelBlockCountCandidate === true && code(blkRes.structure, 'BMS_STRUCT_PER_CHANNEL_NOT_CONFIRMED'));

  // 5. interleaved 85-lane data → interleaved_channels hypothesis. Each lane (channel) is a smooth
  // sine over rows, but lanes have very different DC offsets so reading CONTIGUOUSLY is jumpy —
  // that is what distinguishes genuine interleaving from a single contiguous smooth series.
  const ilParts = catalog(names85); const rows = 200, N = 85, stride = N * 2; const ilBuf = Buffer.alloc(rows * stride);
  const laneOffset = []; for (let c = 0; c < N; c++) laneOffset.push((((c * 101) % 64) - 32) * 40);
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < N; c++) ilBuf.writeInt16LE(laneOffset[c] + Math.round(300 * Math.sin(rr / 11)), rr * stride + c * 2);
  ilParts.push(ilBuf);
  const ilRes = pipeline(new Uint8Array(Buffer.concat(ilParts)));
  check('struct: interleaved 85-lane data → interleaved_channels hypothesis',
    ilRes.structure.structureHypotheses.some(h => h.type === 'interleaved_channels') && code(ilRes.structure, 'BMS_STRUCT_INTERLEAVED_NOT_CONFIRMED'));

  // 6. random region → compressed_or_sparse hypothesis (honest "no stable structure")
  const rndParts = catalog(names85); const rb = Buffer.alloc(20000); let x = 987654321;
  for (let i = 0; i < rb.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; rb[i] = (x >> 16) & 0xff; }
  rndParts.push(rb);
  const rndRes = pipeline(new Uint8Array(Buffer.concat(rndParts)));
  check('struct: random region → compressed_or_sparse hypothesis',
    rndRes.structure.structureHypotheses.some(h => h.type === 'compressed_or_sparse'));

  // 7. confirmation feed WITHOUT a corpus → sample structure stays not-confirmed, caps false
  const cNoCorpus = M.evaluateBmsConfirmationEvidence(blkRes.r, blkRes.probe, blkRes.raw, blkRes.link, { structure: blkRes.structure });
  check('struct→confirm: per-channel feed but NO corpus → structure NOT confirmed, decode caps false',
    cNoCorpus.decisions.canConfirmSampleStructure === false
    && cNoCorpus.capabilities.timeSeries === false && cNoCorpus.capabilities.physicalScaling === false && cNoCorpus.capabilities.handlingCorrelation === false);

  // 8. confirmation feed WITH a corpus → structure CAN be confirmed (feed substitutes for raw-count); caps still false
  const STABLE = { channelCountStable: true, candidateRegionStable: true, catalogDetectedAll: true };
  const cCorpus = M.evaluateBmsConfirmationEvidence(blkRes.r, blkRes.probe, blkRes.raw, blkRes.link, { corpus: STABLE, structure: blkRes.structure });
  check('struct→confirm: per-channel feed + corpus → structure can confirm; decode-grade caps still false',
    cCorpus.decisions.canConfirmSampleStructure === true
    && cCorpus.capabilities.timeSeries === false && cCorpus.capabilities.physicalScaling === false && cCorpus.capabilities.handlingCorrelation === false);

  // 9. red lines across every fixture: discovery cap on, decode-grade caps off, never converged
  check('struct: decode-grade caps false + sampleStructureDiscovery true + never converged (all fixtures)',
    [co, offRes, badRes, blkRes, ilRes, rndRes].every(o =>
      o.structure.capabilities.sampleStructureDiscovery === true
      && o.structure.capabilities.timeSeries === false && o.structure.capabilities.physicalScaling === false && o.structure.capabilities.handlingCorrelation === false
      && o.structure.convergence.sampleStructureConverged === false));

  // 10. never names a canonical channel (structure is layout-only)
  check('struct: report never names a canonical channel / decoded series',
    !/canonicalName|lateral_accel|"accy"|accy_values/.test(JSON.stringify(blkRes.structure)));

  // 11. structure → telemetry metadata integration (surfaced; decode-grade caps stay false)
  const sm = M.buildTelemetryMetadata(Object.assign({}, blkRes.r, { probe: blkRes.probe, raw: blkRes.raw, link: blkRes.link, confirmation: blkRes.conf, structure: blkRes.structure }));
  check('struct→metadata: structure summary surfaced + sampleStructureDiscovery cap true; decode caps false',
    !!sm.structure && sm.structure.perChannelBlockCandidate === true && sm.capabilities.sampleStructureDiscovery === true
    && sm.capabilities.timeSeries === false && sm.capabilities.physicalScaling === false && sm.capabilities.handlingCorrelation === false);
  check('struct→metadata: no structure → sampleStructureDiscovery false, structure null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).capabilities.sampleStructureDiscovery === false);

  // ── regression coverage for the adversarial-review findings ──

  // R1 (finding #1): per-channel blocks that do NOT start byte-aligned to the catalog-end estimate
  // (a coincidental junk prefix in between) must STILL be found — the block walk searches all starts.
  const misParts = catalog(names85);
  misParts.push(new Uint8Array([2, 0, 0xAA, 0xBB, 0, 0]));  // u16 len=2, payload, then len=0 → 1-block coincidental walk
  for (let c = 0; c < 85; c++) { const L = 200; const blk = new Uint8Array(2 + L); blk[0] = L & 0xff; blk[1] = (L >> 8) & 0xff; const dv = new DataView(blk.buffer); for (let k = 0; k < L / 2; k++) dv.setInt16(2 + k * 2, Math.round(1000 * Math.sin((c * 7 + k) / 15)), true); misParts.push(blk); }
  const misRes = pipeline(new Uint8Array(Buffer.concat(misParts.map(p => Buffer.from(p)))));
  check('struct(R1): misaligned per-channel blocks (junk prefix) still found via full start search',
    misRes.structure.perChannelEvidence.candidateChannelBlocks === 85 && misRes.structure.perChannelEvidence.countRelation === 'matches'
    && misRes.structure.structureHypotheses.some(h => h.type === 'per_channel_blocks'));

  // R2 (finding #2): a 0-based sequential index table must be a channel_index_table, NOT a
  // 'matches' offset_table (a pure +1 run is an index, not a byte-offset/pointer table).
  const idxParts = catalog(names85); const idxBuf = Buffer.alloc(85 * 4); for (let i = 0; i < 85; i++) idxBuf.writeUInt32LE(i, i * 4);
  idxParts.push(idxBuf, Buffer.alloc(2000));
  const idxRes = pipeline(new Uint8Array(Buffer.concat(idxParts)));
  check('struct(R2): sequential index run → channel_index_table, not a matches offset_table',
    idxRes.structure.channelTableCandidates.some(t => t.kind === 'channel_index_table')
    && !idxRes.structure.channelTableCandidates.some(t => t.kind === 'offset_table' && t.targetsPlausible && t.relationToCatalogCount === 'matches'));

  // R3 (finding #3): a SINGLE contiguous smooth series (not interleaved) must NOT be reported as
  // interleaved_channels — contiguous reading of a single series is smooth, so the discriminator rejects it.
  const sglParts = catalog(names85); const sgl = Buffer.alloc(30000); for (let k = 0; k < 15000; k++) sgl.writeInt16LE(Math.round(8000 * Math.sin(k / 500)), k * 2);
  sglParts.push(sgl);
  const sglRes = pipeline(new Uint8Array(Buffer.concat(sglParts)));
  check('struct(R3): single contiguous smooth series → NOT mislabelled interleaved_channels',
    !sglRes.structure.structureHypotheses.some(h => h.type === 'interleaved_channels'));

  // R4 (finding #4): random data must NOT yield a plausible offset_table (min run length 16 cuts
  // chance increasing runs); it should land on compressed_or_sparse, not a spurious pointer table.
  check('struct(R4): random region yields no targetsPlausible offset_table candidate',
    !rndRes.structure.channelTableCandidates.some(t => t.kind === 'offset_table' && t.targetsPlausible));
}

// ── Phase 3D-2: raw stream confirmation criteria (synthetic; structure only, corpus-gated) ──
console.log('\n[raw-stream] .bmsbin raw stream confirmation criteria');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const strTok = (s) => { const b = Buffer.from(s + '\0', 'ascii'); const L = Buffer.alloc(2); L.writeUInt16LE(b.length, 0); return Buffer.concat([L, b]); };
  const catalog = (names) => { const parts = [Buffer.from('DarabImporter v.\0', 'ascii'), Buffer.alloc(8)]; for (const c of names) parts.push(strTok('TrackInfo'), Buffer.from([1, 2, 3, 4]), strTok(c), strTok('MS5.8'), strTok(c + ' d')); return parts; };
  const names85 = Array.from({ length: 85 }, (_, i) => 'ch' + i);
  const CORPUS = { fileCount: 3, candidateRegionStable: true, channelCountStable: true };
  const pipe = (bytes, opts = {}) => {
    const r = M.parseBms(bytes);
    const probe = M.probeBmsBinary(bytes);
    const raw = M.extractBmsRawCandidates(bytes, probe, { catalogChannelCount: r.channelCount });
    const link = M.linkBmsRawCandidates(r, probe, raw, {});
    const structure = M.discoverBmsSampleStructure(bytes, r, probe, raw, link, null, { catalogChannelCount: r.channelCount });
    const rs = M.evaluateBmsRawStreamConfirmation(r, probe, raw, structure, opts);
    return { r, probe, raw, link, structure, rs };
  };
  const perChannelEqual = () => { const parts = catalog(names85); for (let c = 0; c < 85; c++) { const L = 200; const blk = Buffer.alloc(2 + L); blk.writeUInt16LE(L, 0); for (let k = 0; k < L / 2; k++) blk.writeInt16LE(Math.round(1000 * Math.sin((c * 7 + k) / 15)), 2 + k * 2); parts.push(blk); } return new Uint8Array(Buffer.concat(parts)); };
  const perChannelVariable = () => { const parts = catalog(names85); for (let c = 0; c < 85; c++) { const L = 100 + (c % 5) * 40; const blk = Buffer.alloc(2 + L); blk.writeUInt16LE(L, 0); for (let k = 0; k < L / 2; k++) blk.writeInt16LE(Math.round(1000 * Math.sin((c * 7 + k) / 15)), 2 + k * 2); parts.push(blk); } return new Uint8Array(Buffer.concat(parts)); };
  const interleaved = () => { const parts = catalog(names85); const rows = 200, N = 85, stride = N * 2; const buf = Buffer.alloc(rows * stride); const off = []; for (let c = 0; c < N; c++) off.push((((c * 101) % 64) - 32) * 40); for (let rr = 0; rr < rows; rr++) for (let c = 0; c < N; c++) buf.writeInt16LE(off[c] + Math.round(300 * Math.sin(rr / 11)), rr * stride + c * 2); parts.push(buf); return new Uint8Array(Buffer.concat(parts)); };
  const singleSmooth = () => { const parts = catalog(names85); const sgl = Buffer.alloc(30000); for (let k = 0; k < 15000; k++) sgl.writeInt16LE(Math.round(8000 * Math.sin(k / 500)), k * 2); parts.push(sgl); return new Uint8Array(Buffer.concat(parts)); };
  const badOffsetTable = () => { const cat = catalog(names85); const b = Buffer.alloc(85 * 4); for (let i = 0; i < 85; i++) b.writeUInt32LE((1000000000 + i * 1000) >>> 0, i * 4); return new Uint8Array(Buffer.concat([...cat, b])); };
  const catalogOnly = () => new Uint8Array(Buffer.concat(catalog(names85)));

  // 1. catalog-only (no stream-bearing hypothesis) → not confirmed
  const co = pipe(catalogOnly());
  check('rawstream: catalog-only → not confirmed, no confirmable stream',
    co.rs.aggregateDecision.canConfirmAnyRawStream === false && co.rs.status !== 'raw_stream_structure_confirmed');

  // 2. single-file per-channel blocks (strong in-file, NO corpus) → confirmable but aggregate NOT confirmed
  const pcNoCorpus = pipe(perChannelEqual());
  const pcCand = pcNoCorpus.rs.rawStreamCandidates.find(c => c.sourceHypothesisType === 'per_channel_blocks');
  check('rawstream: single-file per-channel blocks → confirmable, aggregate not confirmed (corpus required)',
    !!pcCand && pcCand.status === 'confirmable' && pcNoCorpus.rs.aggregateDecision.canConfirmAnyRawStream === false
    && code(pcNoCorpus.rs, 'BMS_RAW_STREAM_CROSS_FILE_REQUIRED'));

  // 3. corpus + per-channel + consistent block length → confirmed_structure
  const pcCorpus = pipe(perChannelEqual(), { corpus: CORPUS });
  const pcCand2 = pcCorpus.rs.rawStreamCandidates.find(c => c.sourceHypothesisType === 'per_channel_blocks');
  check('rawstream: corpus + consistent per-channel blocks → confirmed_structure + raw_stream_structure_confirmed',
    !!pcCand2 && pcCand2.status === 'confirmed_structure' && pcCorpus.rs.aggregateDecision.canConfirmAnyRawStream === true
    && pcCorpus.rs.status === 'raw_stream_structure_confirmed');

  // 4. per-channel count matches but block length inconsistent (even WITH corpus) → not confirmed
  const pcVar = pipe(perChannelVariable(), { corpus: CORPUS });
  const pcVarCand = pcVar.rs.rawStreamCandidates.find(c => c.sourceHypothesisType === 'per_channel_blocks');
  check('rawstream: matching count but inconsistent block length → candidate_only, not confirmed',
    !!pcVarCand && pcVarCand.status === 'candidate_only' && pcVar.rs.aggregateDecision.canConfirmAnyRawStream === false);

  // 5. corpus + interleaved layout → confirmed_structure
  const ilCorpus = pipe(interleaved(), { corpus: CORPUS });
  const ilCand = ilCorpus.rs.rawStreamCandidates.find(c => c.sourceHypothesisType === 'interleaved_channels');
  check('rawstream: corpus + interleaved layout → confirmed_structure',
    !!ilCand && ilCand.status === 'confirmed_structure' && ilCorpus.rs.aggregateDecision.canConfirmAnyRawStream === true);

  // 6. single contiguous smooth series (3D-1 rejects interleaved here) → no stream confirmed
  const sgl = pipe(singleSmooth(), { corpus: CORPUS });
  check('rawstream: single contiguous smooth series → no interleaved stream, not confirmed',
    !sgl.rs.rawStreamCandidates.some(c => c.sourceHypothesisType === 'interleaved_channels' && c.status !== 'rejected')
    && sgl.rs.aggregateDecision.canConfirmAnyRawStream === false);

  // 7. offset table is boundary evidence → rejected as a raw stream, not confirmed
  const bot = pipe(badOffsetTable(), { corpus: CORPUS });
  const botCand = bot.rs.rawStreamCandidates.find(c => c.sourceHypothesisType === 'offset_table');
  check('rawstream: offset table → rejected as raw stream (boundary evidence), not confirmed',
    (!botCand || botCand.status === 'rejected') && bot.rs.aggregateDecision.canConfirmAnyRawStream === false);

  // 8. red lines: decode-grade capabilities false on every path; rawStreamConfirmation cap true
  check('rawstream: decode-grade capabilities stay false (timeSeries/physicalScaling/handlingCorrelation)',
    [co, pcNoCorpus, pcCorpus, pcVar, ilCorpus, sgl, bot].every(o =>
      o.rs.capabilities.timeSeries === false && o.rs.capabilities.physicalScaling === false && o.rs.capabilities.handlingCorrelation === false
      && o.rs.capabilities.rawStreamConfirmation === true));
  // 9. no overclaim: always warns identity + physical values, never names a channel / scaled value
  check('rawstream: always warns identity + physical values unavailable; never names a channel/value',
    code(pcCorpus.rs, 'BMS_RAW_STREAM_CHANNEL_IDENTITY_NOT_CONFIRMED') && code(pcCorpus.rs, 'BMS_RAW_STREAM_PHYSICAL_VALUES_NOT_AVAILABLE')
    && !/lateral_accel|"accy"|canonicalName|"scaled"/.test(JSON.stringify(pcCorpus.rs)));

  // 10. bms-confirmation integration — the raw-stream feed helps ONLY with a corpus (fileCount ≥ 2)
  const linkPc = M.linkBmsRawCandidates(pcCorpus.r, pcCorpus.probe, pcCorpus.raw, {});
  const confNoCorpus = M.evaluateBmsConfirmationEvidence(pcCorpus.r, pcCorpus.probe, pcCorpus.raw, linkPc, { structure: pcCorpus.structure, rawStreamConfirmation: pcCorpus.rs });
  const confCorpus = M.evaluateBmsConfirmationEvidence(pcCorpus.r, pcCorpus.probe, pcCorpus.raw, linkPc, { structure: pcCorpus.structure, rawStreamConfirmation: pcCorpus.rs, corpus: CORPUS });
  check('rawstream→confirm: feed WITHOUT corpus → raw streams not confirmed; decode caps false',
    confNoCorpus.decisions.canConfirmRawStreams === false
    && confNoCorpus.capabilities.timeSeries === false && confNoCorpus.capabilities.physicalScaling === false && confNoCorpus.capabilities.handlingCorrelation === false);
  check('rawstream→confirm: feed + corpus (fileCount≥2) → raw streams can confirm; decode caps still false',
    confCorpus.decisions.canConfirmRawStreams === true
    && confCorpus.capabilities.timeSeries === false && confCorpus.capabilities.physicalScaling === false && confCorpus.capabilities.handlingCorrelation === false);

  // 11. real-data-like (no corpus, no clean per-channel/interleaved structure) → not confirmed
  const realish = pipe(singleSmooth());
  check('rawstream: real-data-like (no corpus, no clean structure) → not confirmed',
    realish.rs.status === 'not_confirmed' && realish.rs.aggregateDecision.canConfirmAnyRawStream === false);

  // 12. telemetry metadata integration (surfaced; decode caps false)
  const meta = M.buildTelemetryMetadata(Object.assign({}, pcCorpus.r, { probe: pcCorpus.probe, raw: pcCorpus.raw, link: linkPc, structure: pcCorpus.structure, rawStreamConfirmation: pcCorpus.rs }));
  check('rawstream→metadata: summary surfaced + rawStreamConfirmation cap true; decode caps false',
    !!meta.rawStreamConfirmation && meta.capabilities.rawStreamConfirmation === true
    && meta.capabilities.timeSeries === false && meta.capabilities.physicalScaling === false && meta.capabilities.handlingCorrelation === false);
  check('rawstream→metadata: no raw stream confirmation → cap false, summary null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).capabilities.rawStreamConfirmation === false);

  // R1 (adversarial review): a stream whose FIRST 8 blocks are equal-length but whose tail varies
  // wildly must NOT reach confirmed_structure — block-length consistency is judged over the WHOLE run.
  const eqPrefixVarTail = () => {
    const parts = catalog(names85);
    for (let c = 0; c < 85; c++) {
      const L = c < 8 ? 200 : (60 + 2 * ((c * 37) % 450));   // first 8 equal, rest highly variable (even)
      const blk = Buffer.alloc(2 + L); blk.writeUInt16LE(L, 0);
      for (let k = 0; k < L / 2; k++) blk.writeInt16LE(Math.round(1000 * Math.sin((c * 7 + k) / 15)), 2 + k * 2);
      parts.push(blk);
    }
    return new Uint8Array(Buffer.concat(parts));
  };
  const evt = pipe(eqPrefixVarTail(), { corpus: CORPUS });
  const evtCand = evt.rs.rawStreamCandidates.find(c => c.sourceHypothesisType === 'per_channel_blocks');
  check('rawstream(R1): equal-prefix / variable-tail blocks → NOT confirmed_structure (whole-run length check)',
    !!evtCand && evtCand.status !== 'confirmed_structure' && evt.rs.aggregateDecision.canConfirmAnyRawStream === false);
}

// ── Phase 3E-0: channel identity confirmation CRITERIA (synthetic; real data never confirmed) ──
console.log('\n[channel-identity] .bmsbin channel identity confirmation criteria');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const bms = { channelCount: 85 };
  const bmsNamed = { channelCount: 4, channels: [{ name: 'accy' }, { name: 'yaw' }, { name: 'steer' }, { name: 'speed' }] };
  const struct = {};
  const rsConfirmed = { aggregateDecision: { canConfirmAnyRawStream: true } };
  const rsConfirmable = { aggregateDecision: { canConfirmAnyRawStream: false } };
  const CORPUS = { fileCount: 3, candidateRegionStable: true, channelCountStable: true };
  const ev = (e) => ({ identityEvidence: [e] });
  const indep = { ref: 's1', kind: 'independent_mapping', mappingStable: true, independentOfScaling: true, independentOfOverlay: true, independentOfSetup: true, label: 'syntheticA' };

  // A. shape-only → hypothesis_only (never higher), not confirmed
  const a = M.evaluateBmsChannelIdentityConfirmation(bms, rsConfirmed, struct, Object.assign({ corpus: CORPUS }, ev({ ref: 's1', kind: 'shape', label: 'looksLikeSpeed' })));
  check('identity(A): shape-only → hypothesis_only, not confirmed',
    a.status === 'hypothesis_only' && a.capabilities.channelIdentityConfirmed === false && code(a, 'BMS_IDENTITY_SHAPE_INSUFFICIENT'));

  // B. label-only (no proven stream relation) → labeled_unverified, not confirmed
  const b = M.evaluateBmsChannelIdentityConfirmation(bms, rsConfirmed, struct, Object.assign({ corpus: CORPUS }, ev({ ref: 's1', kind: 'label_string', label: 'ch_throttle' })));
  check('identity(B): label-only → labeled_unverified, not confirmed',
    b.status === 'labeled_unverified' && b.capabilities.channelIdentityConfirmed === false && code(b, 'BMS_IDENTITY_LABEL_UNVERIFIED'));

  // C. independent mapping but raw stream NOT confirmed → confirmable_identity, not confirmed
  const c = M.evaluateBmsChannelIdentityConfirmation(bms, rsConfirmable, struct, Object.assign({ corpus: CORPUS }, ev(indep)));
  check('identity(C): independent mapping but raw stream not confirmed → confirmable_identity, not confirmed',
    c.status === 'confirmable_identity' && c.aggregateDecision.canConfirmAnyChannelIdentity === false);

  // D. corpus + confirmed raw stream + independent mapping (synthetic) → confirmed_identity; decode caps false
  const d = M.evaluateBmsChannelIdentityConfirmation(bms, rsConfirmed, struct, Object.assign({ corpus: CORPUS }, ev(indep)));
  check('identity(D): corpus + confirmed raw stream + independent mapping → confirmed_identity (synthetic); decode caps false',
    d.status === 'confirmed_identity' && d.aggregateDecision.canConfirmAnyChannelIdentity === true
    && d.capabilities.physicalScaling === false && d.capabilities.canonicalTelemetry === false && d.capabilities.timeSeries === false && d.capabilities.handlingCorrelation === false);
  // R1 (adversarial review): unknowns[0] must agree with the decision — never assert "not confirmed" when confirmed,
  // but still always disclaim physical values / canonical telemetry on every path.
  check('identity(R1): unknowns[] is consistent with the decision on both paths',
    !/not confirmed/.test(d.unknowns[0]) && d.unknowns.includes('no canonical telemetry produced')
    && /not confirmed/.test(c.unknowns[0]) && c.unknowns.includes('physical values not available'));

  // E. single file (no corpus) even with independent mapping + confirmed raw stream → never confirmed
  const e = M.evaluateBmsChannelIdentityConfirmation(bms, rsConfirmed, struct, ev(indep));
  check('identity(E): no corpus (single file) → never confirmed_identity',
    e.status !== 'confirmed_identity' && e.aggregateDecision.canConfirmAnyChannelIdentity === false);

  // E2. mapping that depends on scaling → not independent → candidate at most
  const nonIndep = { ref: 's1', kind: 'independent_mapping', mappingStable: true, independentOfScaling: false, independentOfOverlay: true, independentOfSetup: true };
  const e2 = M.evaluateBmsChannelIdentityConfirmation(bms, rsConfirmed, struct, Object.assign({ corpus: CORPUS }, ev(nonIndep)));
  check('identity(E2): mapping depends on scaling → candidate at most, not confirmed',
    e2.status === 'candidate' && e2.aggregateDecision.canConfirmAnyChannelIdentity === false);

  // F. physical/canonical/handling/setup/units caps pinned false even at confirmed_identity
  check('identity(F): physical/canonical/handling/setup/units caps pinned false (even confirmed_identity)',
    d.capabilities.physicalScaling === false && d.capabilities.canonicalTelemetry === false && d.capabilities.handlingCorrelation === false
    && d.capabilities.setupRecommendation === false && d.capabilities.unitsConfirmed === false && d.capabilities.channelIdentityConfirmation === true);

  // G. real path (catalog has names, NO identity evidence) → not_confirmed, no candidates, no channel names leaked
  const real = M.evaluateBmsChannelIdentityConfirmation(bmsNamed, rsConfirmable, struct, {});
  check('identity(G): real path (no evidence) → not_confirmed, 0 candidates',
    real.status === 'not_confirmed' && real.identityCandidates.length === 0 && code(real, 'BMS_IDENTITY_NOT_CONFIRMED'));
  check('identity(G): real path never names a channel (no speed/brake/throttle/steering/accy from catalog)',
    !/speed|brake|throttle|steering|accy|accx|yaw_rate/i.test(JSON.stringify(real)));

  // bms-confirmation integration — identity feed helps ONLY with a corpus; never opens decode caps
  const link4 = M.linkBmsRawCandidates(bmsNamed, { timebaseClues: [] }, { rawSeriesCandidates: [{ id: 'candidate_001', encoding: 'int16le', sampleCount: 600 }], timebaseCandidate: { present: true, sampleCount: 600 } }, {});
  const rawStub = { rawSeriesCandidates: [{ id: 'candidate_001', encoding: 'int16le', sampleCount: 600 }], timebaseCandidate: { present: true, sampleCount: 600 } };
  const STABLE = { channelCountStable: true, candidateRegionStable: true, catalogDetectedAll: true, fileCount: 3 };
  const structFeed = { confirmationFeed: { perChannelBlockCountCandidate: true } };
  const confNoCorpus = M.evaluateBmsConfirmationEvidence({ header: { valid: true }, channels: bmsNamed.channels, channelCount: 4 }, { timebaseClues: [] }, rawStub, link4, { channelIdentity: d });
  check('identity→confirm: feed WITHOUT corpus → channel identity not confirmed; decode caps false',
    confNoCorpus.decisions.canConfirmChannelIdentity === false
    && confNoCorpus.capabilities.timeSeries === false && confNoCorpus.capabilities.physicalScaling === false && confNoCorpus.capabilities.handlingCorrelation === false);
  const confCorpus = M.evaluateBmsConfirmationEvidence({ header: { valid: true }, channels: bmsNamed.channels, channelCount: 4 }, { timebaseClues: [] }, rawStub, link4, { structure: structFeed, channelIdentity: d, corpus: STABLE });
  check('identity→confirm: feed + corpus → channel identity can confirm; decode caps still false',
    confCorpus.decisions.canConfirmChannelIdentity === true
    && confCorpus.capabilities.timeSeries === false && confCorpus.capabilities.physicalScaling === false && confCorpus.capabilities.handlingCorrelation === false);

  // telemetry metadata integration (real path → conservative)
  const meta = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: bmsNamed.channels, channelIdentity: real });
  check('identity→metadata: surfaced + channelIdentityConfirmed false; physical/canonical/handling/setup caps false',
    !!meta.channelIdentity && meta.capabilities.channelIdentityConfirmation === true && meta.capabilities.channelIdentityConfirmed === false
    && meta.capabilities.physicalScaling === false && meta.capabilities.canonicalTelemetry === false && meta.capabilities.handlingCorrelation === false && meta.capabilities.setupRecommendation === false);
  check('identity→metadata: no identity → cap false, summary null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).capabilities.channelIdentityConfirmation === false);
}

// ── Phase 3E-1: timebase confirmation CRITERIA (synthetic; structural only, real never confirmed) ──
console.log('\n[timebase] .bmsbin timebase confirmation criteria');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const rsConfirmed = { aggregateDecision: { canConfirmAnyRawStream: true }, confirmationFeed: {} };
  const rsConfirmable = { aggregateDecision: { canConfirmAnyRawStream: false }, confirmationFeed: {} };
  const structNoCounter = { confirmationFeed: { timebaseRelationCandidate: false } };
  const CORPUS = { fileCount: 3, candidateRegionStable: true, channelCountStable: true };
  const allStruct = { sampleCountStable: true, monotonicCounterStable: true, deltaStable: true, channelSyncStable: true, gapCount: 0, dropoutCount: 0 };
  const tb = (rs, struct, opts) => M.evaluateBmsTimebaseConfirmation(rs, struct, opts || {});

  // A. no evidence → not_confirmed
  const a = tb(rsConfirmable, structNoCounter, {});
  check('timebase(A): no evidence → not_confirmed, confirmed false',
    a.status === 'not_confirmed' && a.capabilities.timebaseConfirmed === false && code(a, 'BMS_TIMEBASE_NOT_CONFIRMED'));

  // B. sample-count only → sample_count_candidate
  const b = tb(rsConfirmable, structNoCounter, { corpus: CORPUS, timebaseEvidence: { sampleCountStable: true } });
  check('timebase(B): sample-count only → sample_count_candidate, confirmed false',
    b.status === 'sample_count_candidate' && b.aggregateDecision.canConfirmTimebase === false);

  // C. monotonic counter only → monotonic_candidate
  const c = tb(rsConfirmable, structNoCounter, { corpus: CORPUS, timebaseEvidence: { monotonicCounterStable: true } });
  check('timebase(C): monotonic counter only → monotonic_candidate, confirmed false',
    c.status === 'monotonic_candidate' && c.aggregateDecision.canConfirmTimebase === false);

  // D. delta stable but no corpus → delta_candidate
  const d = tb(rsConfirmable, structNoCounter, { timebaseEvidence: { deltaStable: true } });
  check('timebase(D): delta stable, no corpus → delta_candidate, confirmed false',
    d.status === 'delta_candidate' && d.aggregateDecision.canConfirmTimebase === false);

  // E. manual sample-rate only → insufficient_evidence (fallback hint), confirmed/units/scaling/timeSeries false
  const e = tb(rsConfirmable, structNoCounter, { manualSampleRate: 1000 });
  check('timebase(E): manual sample-rate only → fallback hint, not confirmed; units/scaling/timeSeries false',
    e.status === 'insufficient_evidence' && !!e.manualSampleRateHint && e.manualSampleRateHint.confirmed === false
    && e.capabilities.timebaseConfirmed === false && e.capabilities.unitsConfirmed === false
    && e.capabilities.physicalScaling === false && e.capabilities.timeSeries === false && code(e, 'BMS_TIMEBASE_MANUAL_FALLBACK_ONLY'));

  // F. raw stream NOT confirmed → even all-structural + corpus → confirmable at most, not confirmed
  const f = tb(rsConfirmable, structNoCounter, { corpus: CORPUS, timebaseEvidence: allStruct });
  check('timebase(F): raw stream not confirmed → confirmable_timebase at most, not confirmed',
    f.status === 'confirmable_timebase' && f.aggregateDecision.canConfirmTimebase === false);

  // G. corpus-backed synthetic confirmed_timebase; decode/units/canonical/handling/setup caps false
  const g = tb(rsConfirmed, structNoCounter, { corpus: CORPUS, timebaseEvidence: allStruct });
  check('timebase(G): corpus + confirmed raw stream + full structural → confirmed_timebase (synthetic); caps false',
    g.status === 'confirmed_timebase' && g.aggregateDecision.canConfirmTimebase === true
    && g.capabilities.physicalScaling === false && g.capabilities.unitsConfirmed === false && g.capabilities.canonicalTelemetry === false
    && g.capabilities.timeSeries === false && g.capabilities.handlingCorrelation === false && g.capabilities.setupRecommendation === false);

  // H. dropout / gap → blocks confirmed even with corpus + confirmed raw stream
  const h = tb(rsConfirmed, structNoCounter, { corpus: CORPUS, timebaseEvidence: Object.assign({}, allStruct, { gapCount: 2 }) });
  check('timebase(H): gaps/dropouts → not confirmed_timebase + gaps-detected diagnostic',
    h.status !== 'confirmed_timebase' && h.aggregateDecision.canConfirmTimebase === false && code(h, 'BMS_TIMEBASE_GAPS_DETECTED'));

  // H2 (adversarial review): a non-finite gap/dropout count means "gaps unknown" and must NOT
  // collapse to 0 / confirm — the guard whose only job is to block must fail closed.
  const hNaN = tb(rsConfirmed, structNoCounter, { corpus: CORPUS, timebaseEvidence: Object.assign({}, allStruct, { gapCount: NaN }) });
  const hDropNaN = tb(rsConfirmed, structNoCounter, { corpus: CORPUS, timebaseEvidence: Object.assign({}, allStruct, { dropoutCount: NaN }) });
  check('timebase(H2): NaN gap/dropout count → fails closed (not confirmed), never coerced to 0',
    hNaN.status !== 'confirmed_timebase' && hNaN.aggregateDecision.canConfirmTimebase === false && hNaN.criteria.gapsClear === false
    && hDropNaN.aggregateDecision.canConfirmTimebase === false);

  // I. single-file (no corpus) → never confirmed; no inferred Hz / rate emitted
  const i = tb(rsConfirmed, structNoCounter, { timebaseEvidence: allStruct });
  // no rate VALUE leaks: manualSampleRateHint stays null (none supplied) and no numeric "<n>Hz" token appears
  check('timebase(I): single file (no corpus) → never confirmed; no inferred Hz/rate value emitted',
    i.aggregateDecision.canConfirmTimebase === false && i.status !== 'confirmed_timebase'
    && i.manualSampleRateHint === null && !/\d+\s*hz/i.test(JSON.stringify(i)));

  // F2/red-line: capabilities pinned false on EVERY path (incl. confirmed)
  check('timebase(red-line): physical/units/canonical/timeSeries/handling/setup caps pinned false (all paths)',
    [a, b, c, d, e, f, g, h, i].every(o => o.capabilities.physicalScaling === false && o.capabilities.unitsConfirmed === false
      && o.capabilities.canonicalTelemetry === false && o.capabilities.timeSeries === false
      && o.capabilities.handlingCorrelation === false && o.capabilities.setupRecommendation === false
      && o.capabilities.timebaseConfirmation === true));

  // bms-confirmation integration — feed helps ONLY with corpus; never opens decode caps
  const bmsStub = { header: { valid: true }, channels: ['accy', 'yaw', 'steer', 'speed'].map(n => ({ name: n })), channelCount: 4 };
  const rawStub = { rawSeriesCandidates: [{ id: 'candidate_001', encoding: 'int16le', sampleCount: 600 }], timebaseCandidate: { present: true, sampleCount: 600 } };
  const probeMono = { timebaseClues: [{ type: 'monotonic_counter_candidate', runLength: 600, medianDelta: 10, confidence: 'medium' }] };
  const link4 = M.linkBmsRawCandidates(bmsStub, probeMono, rawStub, {});
  const STABLE = { channelCountStable: true, candidateRegionStable: true, catalogDetectedAll: true, fileCount: 3 };
  const structFeed = { confirmationFeed: { perChannelBlockCountCandidate: true } };
  const tConfNoCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, link4, { timebase: g });
  check('timebase→confirm: feed WITHOUT corpus → timebase not confirmed; decode caps false',
    tConfNoCorpus.decisions.canConfirmTimebase === false
    && tConfNoCorpus.capabilities.timeSeries === false && tConfNoCorpus.capabilities.physicalScaling === false && tConfNoCorpus.capabilities.handlingCorrelation === false);
  const tConfCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, link4, { structure: structFeed, timebase: g, corpus: STABLE });
  check('timebase→confirm: feed + corpus → timebase can confirm; decode caps still false',
    tConfCorpus.decisions.canConfirmTimebase === true
    && tConfCorpus.capabilities.timeSeries === false && tConfCorpus.capabilities.physicalScaling === false && tConfCorpus.capabilities.handlingCorrelation === false);

  // J. telemetry metadata integration (real path → conservative)
  const real = tb(rsConfirmable, structNoCounter, {});
  const meta = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: bmsStub.channels, timebase: real });
  check('timebase→metadata: summary surfaced + timebaseConfirmed false; physical/units/canonical/handling caps false',
    !!meta.timebase && meta.capabilities.timebaseConfirmation === true && meta.capabilities.timebaseConfirmed === false
    && meta.capabilities.physicalScaling === false && meta.capabilities.unitsConfirmed === false && meta.capabilities.canonicalTelemetry === false && meta.capabilities.handlingCorrelation === false);
  check('timebase→metadata: no timebase → cap false, summary null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).capabilities.timebaseConfirmation === false);
}

// ── Phase 3F-0: physical scaling / units / canonical-value CRITERIA (synthetic; real never usable) ──
console.log('\n[physical-scaling] .bmsbin physical scaling confirmation criteria');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const rsConfirmed = { aggregateDecision: { canConfirmAnyRawStream: true } };
  const rsConfirmable = { aggregateDecision: { canConfirmAnyRawStream: false } };
  const idConfirmed = { status: 'confirmed_identity', aggregateDecision: { canConfirmAnyChannelIdentity: true } };
  const idNot = { status: 'not_confirmed', aggregateDecision: { canConfirmAnyChannelIdentity: false } };
  const tbConfirmed = { aggregateDecision: { canConfirmTimebase: true } };
  const tbNot = { aggregateDecision: { canConfirmTimebase: false } };
  const CORPUS = { fileCount: 3, candidateRegionStable: true, channelCountStable: true };
  const scaleFull = { source: 'independent', independent: true, stable: true, transformType: 'linear', transformConfirmed: true };
  const unitFull = { source: 'independent', independent: true, stable: true, unit: 'g' };
  const ps = (rs, id, tb, opts) => M.evaluateBmsPhysicalScalingConfirmation(rs, id, tb, opts || {});

  // A. no evidence → not_confirmed; physical/units/canonical caps false
  const a = ps(rsConfirmable, idNot, tbNot, {});
  check('scaling(A): no evidence → not_confirmed; physical/units caps false',
    a.status === 'not_confirmed' && a.capabilities.physicalScaling === false && a.capabilities.unitsConfirmed === false
    && a.capabilities.canonicalTelemetry === false && code(a, 'BMS_SCALING_NOT_CONFIRMED'));

  // B. raw stream not confirmed (even with full scale+unit evidence) → not confirmed
  const b = ps(rsConfirmable, idConfirmed, tbConfirmed, { corpus: CORPUS, scalingEvidence: scaleFull, unitEvidence: unitFull });
  check('scaling(B): raw stream not confirmed → not confirmed; physicalScaling false',
    b.aggregateDecision.canConfirmPhysicalScaling === false && b.capabilities.physicalScaling === false);

  // C. channel identity not confirmed (even with scale evidence) → identity_missing, not confirmed
  const c = ps(rsConfirmed, idNot, tbConfirmed, { corpus: CORPUS, scalingEvidence: scaleFull, unitEvidence: unitFull });
  check('scaling(C): channel identity not confirmed → identity_missing, not confirmed',
    c.status === 'identity_missing' && c.aggregateDecision.canConfirmPhysicalScaling === false);

  // D. timebase missing for a time-indexed value → timebase_missing, not confirmed
  const d = ps(rsConfirmed, idConfirmed, tbNot, { corpus: CORPUS, scalingEvidence: scaleFull, unitEvidence: unitFull });
  check('scaling(D): timebase missing (time-indexed) → timebase_missing, not confirmed',
    d.status === 'timebase_missing' && d.aggregateDecision.canConfirmPhysicalScaling === false);

  // E. manual scale only → scale_hint_only; not confirmed; units/canonical false
  const e = ps(rsConfirmable, idNot, tbNot, { manualScale: 0.01 });
  check('scaling(E): manual scale only → scale_hint_only (fallback); not confirmed; units false',
    e.status === 'scale_hint_only' && !!e.manualScaleHint && e.manualScaleHint.confirmed === false
    && e.capabilities.physicalScaling === false && e.capabilities.unitsConfirmed === false && code(e, 'BMS_SCALING_MANUAL_FALLBACK_ONLY'));

  // F. unit label only → unit_hint_only; not confirmed
  const f = ps(rsConfirmable, idNot, tbNot, { unitEvidence: { source: 'channel_name', independent: false, unit: 'g' } });
  check('scaling(F): unit label only → unit_hint_only, not confirmed',
    f.status === 'unit_hint_only' && f.aggregateDecision.canConfirmPhysicalScaling === false);

  // G. plausible range only → at most scale_candidate; never confirmed
  const g = ps(rsConfirmed, idConfirmed, tbConfirmed, { corpus: CORPUS, plausibleRange: true });
  check('scaling(G): plausible range only → candidate at most, not confirmed (range is supporting only)',
    g.status === 'scale_candidate' && g.aggregateDecision.canConfirmPhysicalScaling === false && code(g, 'BMS_SCALING_PLAUSIBLE_RANGE_NOT_ENOUGH'));

  // H. scale transform proposed but not stable/verified → transform_candidate, not confirmed
  const h = ps(rsConfirmed, idConfirmed, tbConfirmed, { corpus: CORPUS, scalingEvidence: { source: 'independent', independent: true, stable: false, transformType: 'linear', transformConfirmed: false }, unitEvidence: unitFull });
  check('scaling(H): transform proposed but not verified/stable → transform_candidate, not confirmed',
    h.status === 'transform_candidate' && h.aggregateDecision.canConfirmPhysicalScaling === false);

  // I. corpus-backed synthetic confirmed_scaling → confirmed; units + physical values (synthetic); overlay/Kus/handling/setup/canonical/timeSeries false
  const i = ps(rsConfirmed, idConfirmed, tbConfirmed, { corpus: CORPUS, scalingEvidence: scaleFull, unitEvidence: unitFull });
  check('scaling(I): all prereqs + independent scale + unit + verified transform → confirmed_scaling (synthetic); usable caps still false',
    i.status === 'confirmed_scaling' && i.aggregateDecision.canConfirmPhysicalScaling === true
    && i.unitsConfirmed === true && i.physicalValuesAvailable === true
    && i.capabilities.canonicalTelemetry === false && i.capabilities.timeSeries === false
    && i.capabilities.handlingCorrelation === false && i.capabilities.setupRecommendation === false && i.capabilities.overlayEnabled === false);

  // J. canonical value eligibility (synthetic) — eligible but NOT produced/usable; no overlay/setup
  check('scaling(J): synthetic confirmed → canonicalValueEligibility true but canonicalValues NOT available; no overlay',
    i.canonicalValueEligibility === true && i.canonicalValuesAvailable === false && i.capabilities.overlayEnabled === false);

  // R1 (adversarial review): the identity prereq must trust the authoritative aggregate decision, not
  // a status string — an inconsistent identity object (status confirmed but aggregate false) must NOT confirm.
  const idInconsistent = { status: 'confirmed_identity', aggregateDecision: { canConfirmAnyChannelIdentity: false } };
  const r1 = ps(rsConfirmed, idInconsistent, tbConfirmed, { corpus: CORPUS, scalingEvidence: scaleFull, unitEvidence: unitFull });
  check('scaling(R1): identity status string cannot override a false aggregate decision → not confirmed',
    r1.status !== 'confirmed_scaling' && r1.aggregateDecision.canConfirmPhysicalScaling === false && r1.capabilities.physicalScaling === false);

  // K. real/imported single-file path (no corpus) → never confirmed; physical/units/canonical false
  const k = ps(rsConfirmable, idNot, tbNot, { scalingEvidence: scaleFull, unitEvidence: unitFull });
  check('scaling(K): real single-file (no corpus) → never confirmed; physical/units/canonical caps false',
    k.aggregateDecision.canConfirmPhysicalScaling === false && k.physicalValuesAvailable === false
    && k.capabilities.physicalScaling === false && k.capabilities.unitsConfirmed === false && k.capabilities.canonicalTelemetry === false);

  // L. manual scale cannot upgrade the real path
  const l = ps(rsConfirmable, idNot, tbNot, { manualScale: 0.01, scalingEvidence: null });
  check('scaling(L): real path + manual scale → fallback hint only; physicalScaling/units false',
    l.status === 'scale_hint_only' && l.capabilities.physicalScaling === false && l.capabilities.unitsConfirmed === false);

  // M. caps pinned false on every path (handling/setup/overlay/Kus/timeSeries/canonical)
  check('scaling(M): handling/setup/overlay/timeSeries/canonical caps pinned false (all paths)',
    [a, b, c, d, e, f, g, h, i, k, l].every(o => o.capabilities.handlingCorrelation === false && o.capabilities.setupRecommendation === false
      && o.capabilities.overlayEnabled === false && o.capabilities.timeSeries === false && o.capabilities.canonicalTelemetry === false
      && o.capabilities.physicalScalingConfirmation === true));

  // bms-confirmation integration — feed helps ONLY with corpus; never opens decode caps
  const bmsStub = { header: { valid: true }, channels: ['accy', 'yaw', 'steer', 'speed'].map(n => ({ name: n })), channelCount: 4 };
  const rawStub = { rawSeriesCandidates: [{ id: 'candidate_001', encoding: 'int16le', sampleCount: 600 }], timebaseCandidate: { present: true, sampleCount: 600 } };
  const probeMono = { timebaseClues: [{ type: 'monotonic_counter_candidate', runLength: 600, medianDelta: 10, confidence: 'medium' }] };
  const exMap = { candidate_001: { rawChannelName: 'accy', canonicalName: 'lateral_accel', scale: 0.01, offset: 0, unit: 'g' } };
  const linkEx = M.linkBmsRawCandidates(bmsStub, probeMono, rawStub, { explicitMapping: exMap });
  const STABLE = { channelCountStable: true, candidateRegionStable: true, catalogDetectedAll: true, fileCount: 3 };
  const structFeed = { confirmationFeed: { perChannelBlockCountCandidate: true } };
  const sConfNoCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, linkEx, { physicalScaling: i });
  check('scaling→confirm: feed WITHOUT corpus → physical scaling not confirmed; decode caps false',
    sConfNoCorpus.decisions.canConfirmPhysicalScaling === false
    && sConfNoCorpus.capabilities.physicalScaling === false && sConfNoCorpus.capabilities.timeSeries === false && sConfNoCorpus.capabilities.handlingCorrelation === false);
  const sConfCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, linkEx, { structure: structFeed, physicalScaling: i, corpus: STABLE });
  check('scaling→confirm: feed + corpus → physical scaling can confirm; decode-grade caps still false',
    sConfCorpus.decisions.canConfirmPhysicalScaling === true
    && sConfCorpus.capabilities.physicalScaling === false && sConfCorpus.capabilities.timeSeries === false && sConfCorpus.capabilities.handlingCorrelation === false);

  // metadata integration (real path → conservative)
  const real = ps(rsConfirmable, idNot, tbNot, {});
  const meta = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: bmsStub.channels, physicalScaling: real });
  check('scaling→metadata: summary surfaced + physicalScaling/units/canonical caps false; overlay false',
    !!meta.physicalScaling && meta.capabilities.physicalScalingConfirmation === true && meta.capabilities.physicalScaling === false
    && meta.capabilities.unitsConfirmed === false && meta.capabilities.canonicalTelemetry === false && meta.capabilities.overlayEnabled === false && meta.capabilities.handlingCorrelation === false);
  check('scaling→metadata: no scaling → cap false, summary null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).capabilities.physicalScalingConfirmation === false);
}

// ── Phase 3F-1: telemetry readiness GATE (synthetic; real never ready; readiness ≠ analysis) ──
console.log('\n[telemetry-readiness] .bmsbin telemetry readiness gate');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const rsC = { aggregateDecision: { canConfirmAnyRawStream: true } }, rsN = { aggregateDecision: { canConfirmAnyRawStream: false } };
  const idC = { aggregateDecision: { canConfirmAnyChannelIdentity: true } }, idN = { aggregateDecision: { canConfirmAnyChannelIdentity: false } };
  const tbC = { aggregateDecision: { canConfirmTimebase: true } }, tbN = { aggregateDecision: { canConfirmTimebase: false } };
  const psC = { aggregateDecision: { canConfirmPhysicalScaling: true }, unitsConfirmed: true, canonicalValueEligibility: true };
  const psN = { aggregateDecision: { canConfirmPhysicalScaling: false }, unitsConfirmed: false, canonicalValueEligibility: false };
  const CORPUS = { fileCount: 3, candidateRegionStable: true, channelCountStable: true };
  const chans = ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel'];
  const qualGood = { sampleRateAdequate: true, syncQualityAdequate: true, dropoutOk: true, noiseOk: true };
  const rd = (rs, id, tb, ps, opts) => M.evaluateBmsTelemetryReadiness(rs, id, tb, ps, opts || {});

  // A. no evidence → not_ready
  const a = rd(rsN, idN, tbN, psN, {});
  check('readiness(A): no evidence → not_ready; readiness/handlingAnalysis caps false',
    a.status === 'not_ready' && a.capabilities.telemetryReadiness === false && a.capabilities.handlingAnalysis === false && code(a, 'BMS_READINESS_NOT_READY'));

  // B. canonical/scaling missing (even with quality + channels) → insufficient_prerequisites
  const b = rd(rsC, idC, tbC, psN, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: qualGood });
  check('readiness(B): canonical/scaling missing → insufficient_prerequisites, not ready',
    b.status === 'insufficient_prerequisites' && b.aggregateDecision.canBeReadyForAnalysis === false);

  // C. required channels missing → missing_required_channels
  const c = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: [], qualityEvidence: qualGood });
  check('readiness(C): required channels missing → missing_required_channels, not ready',
    c.status === 'missing_required_channels' && c.aggregateDecision.canBeReadyForAnalysis === false);

  // E. timebase missing → insufficient_prerequisites
  const e = rd(rsC, idC, tbN, psN, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: qualGood });
  check('readiness(E): timebase missing → insufficient_prerequisites, not ready',
    e.status === 'insufficient_prerequisites' && e.aggregateDecision.canBeReadyForAnalysis === false);

  // F/G/H/I. quality blocked → quality_blocked (ready false)
  const fq = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: { sampleRateAdequate: false, syncQualityAdequate: true, dropoutOk: true, noiseOk: true } });
  const gq = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: { sampleRateAdequate: true, syncQualityAdequate: false, dropoutOk: true, noiseOk: true } });
  const hq = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: { sampleRateAdequate: true, syncQualityAdequate: true, dropoutOk: false, noiseOk: true } });
  const iq = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: { sampleRateAdequate: true, syncQualityAdequate: true, dropoutOk: true, noiseOk: false } });
  check('readiness(F-I): sample-rate / sync / dropout / noise blocked → quality_blocked, not ready',
    [fq, gq, hq, iq].every(o => o.status === 'quality_blocked' && o.aggregateDecision.canBeReadyForAnalysis === false));

  // H2 (fail-closed): dropout/quality UNKNOWN must not be ready
  const unk = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: { sampleRateAdequate: true, syncQualityAdequate: true } });
  check('readiness(H2): unknown dropout/noise quality → fail-closed, not ready',
    unk.dropoutQuality === 'unknown' && unk.aggregateDecision.canBeReadyForAnalysis === false);

  // R1 (adversarial review): any single confirmation prerequisite present (incl. units-only) → reports
  // insufficient_prerequisites, never the lower not_ready — the ladder must be symmetric across prereqs.
  const r1 = rd(rsN, idN, tbN, { aggregateDecision: { canConfirmPhysicalScaling: false }, unitsConfirmed: true, canonicalValueEligibility: false }, {});
  check('readiness(R1): units-only prereq → insufficient_prerequisites (ladder symmetric), still not ready',
    r1.status === 'insufficient_prerequisites' && r1.aggregateDecision.canBeReadyForAnalysis === false);

  // J. partial readiness (some channels confirmed)
  const j = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: ['speed', 'steering', 'lateral_accel'], qualityEvidence: qualGood });
  check('readiness(J): some required channels confirmed → partial_readiness, not ready',
    j.status === 'partial_readiness' && j.readyChannelCount === 3 && j.missingRequiredChannelCount === 2 && j.aggregateDecision.canBeReadyForAnalysis === false);

  // K. confirmable_readiness — prereqs + channels met, quality not fully confirmed (none blocked)
  const k = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: { sampleRateAdequate: true } });
  check('readiness(K): prereqs + channels met, quality not fully confirmed → confirmable_readiness, not ready',
    k.status === 'confirmable_readiness' && k.aggregateDecision.canBeReadyForAnalysis === false);

  // L. real single-file → not_ready; no handling/overlay
  const l = rd(rsN, idN, tbN, psN, {});
  check('readiness(L): real single-file → not_ready; handlingAnalysis/overlay caps false',
    l.aggregateDecision.canBeReadyForAnalysis === false && l.capabilities.handlingAnalysis === false && l.capabilities.overlayEnabled === false);

  // M. synthetic ready_for_analysis; downstream analysis/overlay/Kus/handling/setup caps false
  const m = rd(rsC, idC, tbC, psC, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: qualGood });
  check('readiness(M): all prereqs + channels + quality pass → ready_for_analysis (synthetic); analysis caps false',
    m.status === 'ready_for_analysis' && m.aggregateDecision.canBeReadyForAnalysis === true
    && m.capabilities.handlingAnalysis === false && m.capabilities.overlayEnabled === false && m.capabilities.kus === false
    && m.capabilities.handlingCorrelation === false && m.capabilities.setupRecommendation === false && m.capabilities.canonicalTelemetry === false);

  // N. caps pinned false on every path (analysis/overlay/Kus/handling/setup)
  check('readiness(N): handlingAnalysis/overlay/Kus/handling/setup caps pinned false (all paths)',
    [a, b, c, e, fq, j, k, l, m].every(o => o.capabilities.handlingAnalysis === false && o.capabilities.overlayEnabled === false
      && o.capabilities.kus === false && o.capabilities.handlingCorrelation === false && o.capabilities.setupRecommendation === false
      && o.capabilities.telemetryReadiness === (o.status === 'ready_for_analysis')));

  // bms-confirmation integration — readiness feed only flips telemetryReadyForAnalysis with full prereqs + corpus
  const bmsStub = { header: { valid: true }, channels: ['accy', 'yaw', 'steer', 'speed'].map(n => ({ name: n })), channelCount: 4 };
  const rawStub = { rawSeriesCandidates: [{ id: 'candidate_001', encoding: 'int16le', sampleCount: 600 }], timebaseCandidate: { present: true, sampleCount: 600 } };
  const probeMono = { timebaseClues: [{ type: 'monotonic_counter_candidate', runLength: 600, medianDelta: 10, confidence: 'medium' }] };
  const exMap = { candidate_001: { rawChannelName: 'accy', canonicalName: 'lateral_accel', scale: 0.01, offset: 0, unit: 'g' } };
  const linkEx = M.linkBmsRawCandidates(bmsStub, probeMono, rawStub, { explicitMapping: exMap });
  const STABLE = { channelCountStable: true, candidateRegionStable: true, catalogDetectedAll: true, fileCount: 3 };
  const structFeed = { confirmationFeed: { perChannelBlockCountCandidate: true } };
  const idFeed = { status: 'confirmed_identity', aggregateDecision: { canConfirmAnyChannelIdentity: true }, capabilities: { channelIdentityConfirmed: true } };
  const tbFeed = { status: 'confirmed_timebase', aggregateDecision: { canConfirmTimebase: true }, capabilities: { timebaseConfirmed: true } };
  const psFeed = { status: 'confirmed_scaling', aggregateDecision: { canConfirmPhysicalScaling: true }, unitsConfirmed: true, canonicalValueEligibility: true, capabilities: { physicalScaling: true } };
  const rConfNoCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, linkEx, { readiness: m });
  check('readiness→confirm: feed WITHOUT corpus → telemetryReadyForAnalysis false; decode caps false',
    rConfNoCorpus.decisions.telemetryReadyForAnalysis === false
    && rConfNoCorpus.capabilities.timeSeries === false && rConfNoCorpus.capabilities.physicalScaling === false && rConfNoCorpus.capabilities.handlingCorrelation === false);
  const rConfCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, linkEx, { structure: structFeed, channelIdentity: idFeed, timebase: tbFeed, physicalScaling: psFeed, readiness: m, corpus: STABLE });
  check('readiness→confirm: feed + full prereqs + corpus → telemetryReadyForAnalysis true; decode caps still false',
    rConfCorpus.decisions.telemetryReadyForAnalysis === true
    && rConfCorpus.capabilities.timeSeries === false && rConfCorpus.capabilities.physicalScaling === false && rConfCorpus.capabilities.handlingCorrelation === false);

  // O. telemetry metadata integration (real path → conservative)
  const real = rd(rsN, idN, tbN, psN, {});
  const meta = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: bmsStub.channels, readiness: real });
  check('readiness→metadata: summary surfaced + telemetryReady false; handlingAnalysis/overlay/Kus/setup caps false',
    !!meta.readiness && meta.capabilities.telemetryReadinessConfirmation === true && meta.capabilities.telemetryReady === false
    && meta.capabilities.handlingAnalysis === false && meta.capabilities.overlayEnabled === false && meta.capabilities.kus === false
    && meta.capabilities.setupRecommendation === false && meta.capabilities.canonicalTelemetry === false);
  check('readiness→metadata: no readiness → cap false, summary null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).readiness === null);
}

// ── Phase 3G-0A: measured handling-response extraction-eligibility GATE (input contract, not
//    extraction; synthetic-only eligible; real never eligible; eligibility ≠ extraction) ──
console.log('\n[extract-eligibility] .bmsbin measured handling-response extraction eligibility gate');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const CORPUS = { fileCount: 3, candidateRegionStable: true, channelCountStable: true };
  const chans = ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel'];
  const qualGood = { sampleRateAdequate: true, syncQualityAdequate: true, dropoutOk: true, noiseOk: true };
  // a synthetic ready_for_analysis readiness — the only state eligibility can gate on
  const readyRd = M.evaluateBmsTelemetryReadiness(
    { aggregateDecision: { canConfirmAnyRawStream: true } }, { aggregateDecision: { canConfirmAnyChannelIdentity: true } },
    { aggregateDecision: { canConfirmTimebase: true } }, { aggregateDecision: { canConfirmPhysicalScaling: true }, unitsConfirmed: true, canonicalValueEligibility: true },
    { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: qualGood });
  // a real single-file readiness — never ready
  const notReadyRd = M.evaluateBmsTelemetryReadiness(
    { aggregateDecision: { canConfirmAnyRawStream: false } }, { aggregateDecision: { canConfirmAnyChannelIdentity: false } },
    { aggregateDecision: { canConfirmTimebase: false } }, { aggregateDecision: { canConfirmPhysicalScaling: false }, unitsConfirmed: false, canonicalValueEligibility: false }, {});
  const ex = (rd, opts) => M.evaluateBmsExtractionEligibility(rd, opts || {});
  const fullCse = { canonicalChannels: chans, timeAligned: true, gapFree: true, knownSampleRate: true };
  const fullSeg = { cornerEventsDetectable: true, cornerEventCount: 6, entryMidExitSeparable: true, steadyStateIdentifiable: true };

  // A. real not-ready readiness → not_eligible; all extraction/analysis caps false
  const a = ex(notReadyRd, {});
  check('extract(A): real not-ready readiness → not_eligible; extraction/measuredHandlingResponse/handling caps false',
    a.status === 'not_eligible' && a.capabilities.extractionEligible === false && a.capabilities.measuredHandlingResponse === false
    && a.capabilities.handlingAnalysis === false && a.aggregateDecision.canBeEligibleForExtraction === false && code(a, 'BMS_EXTRACT_NOT_ELIGIBLE'));

  // B. ready but no canonical series evidence → canonical_series_unavailable
  const b = ex(readyRd, { corpus: CORPUS });
  check('extract(B): ready but no canonical measured series → canonical_series_unavailable, not eligible',
    b.status === 'canonical_series_unavailable' && b.aggregateDecision.canBeEligibleForExtraction === false);

  // C. ready + canonical series but required channels absent → required_channels_unavailable
  const c = ex(readyRd, { corpus: CORPUS, canonicalSeriesEvidence: { canonicalChannels: ['throttle'], timeAligned: true, gapFree: true, knownSampleRate: true } });
  check('extract(C): ready + canonical series but required channels absent → required_channels_unavailable',
    c.status === 'required_channels_unavailable' && c.eligibleChannelCount === 0 && c.aggregateDecision.canBeEligibleForExtraction === false);

  // C2. partial required channels → partial_eligibility
  const c2 = ex(readyRd, { corpus: CORPUS, canonicalSeriesEvidence: { canonicalChannels: ['speed', 'steering', 'lateral_accel'], timeAligned: true, gapFree: true, knownSampleRate: true } });
  check('extract(C2): ready + canonical series + some required channels → partial_eligibility',
    c2.status === 'partial_eligibility' && c2.eligibleChannelCount === 3 && c2.missingRequiredChannelCount === 2 && c2.aggregateDecision.canBeEligibleForExtraction === false);

  // D. channels present but too few corner events → segmentation_prerequisites_unmet
  const d = ex(readyRd, { corpus: CORPUS, canonicalSeriesEvidence: fullCse, segmentationEvidence: { cornerEventsDetectable: true, cornerEventCount: 1, entryMidExitSeparable: true, steadyStateIdentifiable: true } });
  check('extract(D): channels present but too few corner events → segmentation_prerequisites_unmet',
    d.status === 'segmentation_prerequisites_unmet' && d.aggregateDecision.canBeEligibleForExtraction === false);

  // E. segmentation ok but entry/mid/exit windows not separable → window_prerequisites_unmet
  const e = ex(readyRd, { corpus: CORPUS, canonicalSeriesEvidence: fullCse, segmentationEvidence: { cornerEventsDetectable: true, cornerEventCount: 6, entryMidExitSeparable: false, steadyStateIdentifiable: true } });
  check('extract(E): segmentation ok but windows not separable → window_prerequisites_unmet',
    e.status === 'window_prerequisites_unmet' && e.aggregateDecision.canBeEligibleForExtraction === false);

  // F. fully satisfied (synthetic) → eligible_for_extraction; extraction/analysis caps STILL false
  const f = ex(readyRd, { corpus: CORPUS, canonicalSeriesEvidence: fullCse, segmentationEvidence: fullSeg });
  check('extract(F): all prerequisites satisfied (synthetic) → eligible_for_extraction; extraction/analysis caps false',
    f.status === 'eligible_for_extraction' && f.aggregateDecision.canBeEligibleForExtraction === true && f.capabilities.extractionEligible === true
    && f.capabilities.measuredHandlingResponse === false && f.capabilities.handlingAnalysis === false && f.capabilities.kus === false
    && f.capabilities.overlayEnabled === false && f.capabilities.modelVsActual === false && f.capabilities.canonicalTelemetry === false);

  // F2 (review R1/L1 regression): full evidence but no corpus → corpus_unavailable — the nearest-to-
  // eligible, monotonic rung (not the lower prerequisites_unmet); still not eligible, candidate counted,
  // with actionable next-evidence + a corpus diagnostic instead of an empty / mislabelled report.
  const f2 = ex(readyRd, { canonicalSeriesEvidence: fullCse, segmentationEvidence: fullSeg });
  check('extract(F2): full evidence but no corpus → corpus_unavailable (not eligible, candidate=1, next-evidence + diag)',
    f2.status === 'corpus_unavailable' && f2.capabilities.extractionEligible === false
    && f2.aggregateDecision.canBeEligibleForExtraction === false && f2.aggregateDecision.candidateCount === 1
    && f2.nextEvidenceNeeded.includes('cross-file corpus evidence') && code(f2, 'BMS_EXTRACT_CORPUS_REQUIRED'));

  // G. caps pinned false on every path
  check('extract(G): measuredHandlingResponse/handling/overlay/Kus/modelVsActual caps pinned false (all paths)',
    [a, b, c, c2, d, e, f, f2].every(o => o.capabilities.measuredHandlingResponse === false && o.capabilities.handlingAnalysis === false
      && o.capabilities.overlayEnabled === false && o.capabilities.kus === false && o.capabilities.handlingCorrelation === false
      && o.capabilities.setupRecommendation === false && o.capabilities.modelVsActual === false && o.capabilities.canonicalTelemetry === false
      && o.capabilities.extractionEligible === (o.status === 'eligible_for_extraction')));

  // H. input/output contract schema exported and measured-only (proxy, not Kus / model-vs-actual)
  const inC = M.EXTRACTION_INPUT_CONTRACT, outC = M.EXTRACTION_OUTPUT_CONTRACT;
  check('extract(H): input contract names required channels (abstract) + segmentation prerequisites',
    !!inC && Array.isArray(inC.canonicalSeries.requiredChannels) && inC.canonicalSeries.requiredChannels.includes('lateral_accel')
    && Array.isArray(inC.segmentation.prerequisites) && inC.segmentation.prerequisites.includes('entry_mid_exit_separable'));
  check('extract(H2): output contract is measured-only proxy — not full Kus / model-vs-actual / setup',
    !!outC && outC.measuredTendency.metric === 'understeer_oversteer_proxy'
    && outC.redLines.includes('not_full_kus') && outC.redLines.includes('not_model_vs_actual') && outC.redLines.includes('not_setup_recommendation'));

  // I. bms-confirmation integration — feed only flips measuredExtractionEligible with full prereqs + corpus
  const bmsStub = { header: { valid: true }, channels: ['accy', 'yaw', 'steer', 'speed'].map(n => ({ name: n })), channelCount: 4 };
  const rawStub = { rawSeriesCandidates: [{ id: 'candidate_001', encoding: 'int16le', sampleCount: 600 }], timebaseCandidate: { present: true, sampleCount: 600 } };
  const probeMono = { timebaseClues: [{ type: 'monotonic_counter_candidate', runLength: 600, medianDelta: 10, confidence: 'medium' }] };
  const exMap = { candidate_001: { rawChannelName: 'accy', canonicalName: 'lateral_accel', scale: 0.01, offset: 0, unit: 'g' } };
  const linkEx = M.linkBmsRawCandidates(bmsStub, probeMono, rawStub, { explicitMapping: exMap });
  const STABLE = { channelCountStable: true, candidateRegionStable: true, catalogDetectedAll: true, fileCount: 3 };
  const structFeed = { confirmationFeed: { perChannelBlockCountCandidate: true } };
  const idFeed = { status: 'confirmed_identity', aggregateDecision: { canConfirmAnyChannelIdentity: true }, capabilities: { channelIdentityConfirmed: true } };
  const tbFeed = { status: 'confirmed_timebase', aggregateDecision: { canConfirmTimebase: true }, capabilities: { timebaseConfirmed: true } };
  const psFeed = { status: 'confirmed_scaling', aggregateDecision: { canConfirmPhysicalScaling: true }, unitsConfirmed: true, canonicalValueEligibility: true, capabilities: { physicalScaling: true } };
  const exNoCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, linkEx, { extractionEligibility: f });
  check('extract→confirm: feed WITHOUT corpus → measuredExtractionEligible false; decode caps false',
    exNoCorpus.decisions.measuredExtractionEligible === false
    && exNoCorpus.capabilities.timeSeries === false && exNoCorpus.capabilities.physicalScaling === false && exNoCorpus.capabilities.handlingCorrelation === false);
  const exCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, linkEx, { structure: structFeed, channelIdentity: idFeed, timebase: tbFeed, physicalScaling: psFeed, readiness: readyRd, extractionEligibility: f, corpus: STABLE });
  check('extract→confirm: feed + full prereqs + corpus → measuredExtractionEligible true; decode caps still false',
    exCorpus.decisions.measuredExtractionEligible === true
    && exCorpus.capabilities.timeSeries === false && exCorpus.capabilities.physicalScaling === false && exCorpus.capabilities.handlingCorrelation === false);

  // J. telemetry metadata integration (real path → conservative)
  const meta = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: bmsStub.channels, extractionEligibility: a });
  check('extract→metadata: summary surfaced + extractionEligible false; measuredHandlingResponse/handling/overlay caps false',
    !!meta.extractionEligibility && meta.capabilities.extractionEligibilityCriteria === true && meta.capabilities.extractionEligible === false
    && meta.capabilities.measuredHandlingResponse === false && meta.capabilities.handlingAnalysis === false && meta.capabilities.overlayEnabled === false);
  check('extract→metadata: no extraction → cap false, summary null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).extractionEligibility === null);
}

// ── Phase 3G-0B: SYNTHETIC measured-extraction harness (gate-first; real path always blocked;
//    synthetic-only; tendency is a proxy, never Kus/model-vs-actual/setup) ──
console.log('\n[measured-extraction] .bmsbin synthetic measured-extraction harness');
{
  const code = (r, c) => r.diagnostics.some(d => d.code === c);
  const CORPUS = { fileCount: 3, candidateRegionStable: true, channelCountStable: true };
  const chans = ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel'];
  const qualGood = { sampleRateAdequate: true, syncQualityAdequate: true, dropoutOk: true, noiseOk: true };
  const readyRd = M.evaluateBmsTelemetryReadiness(
    { aggregateDecision: { canConfirmAnyRawStream: true } }, { aggregateDecision: { canConfirmAnyChannelIdentity: true } },
    { aggregateDecision: { canConfirmTimebase: true } }, { aggregateDecision: { canConfirmPhysicalScaling: true }, unitsConfirmed: true, canonicalValueEligibility: true },
    { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: qualGood });
  const eligible = M.evaluateBmsExtractionEligibility(readyRd, { corpus: CORPUS, canonicalSeriesEvidence: { canonicalChannels: chans, timeAligned: true, gapFree: true, knownSampleRate: true }, segmentationEvidence: { cornerEventsDetectable: true, cornerEventCount: 6, entryMidExitSeparable: true, steadyStateIdentifiable: true } });
  const notReadyRd = M.evaluateBmsTelemetryReadiness({ aggregateDecision: { canConfirmAnyRawStream: false } }, { aggregateDecision: { canConfirmAnyChannelIdentity: false } }, { aggregateDecision: { canConfirmTimebase: false } }, { aggregateDecision: { canConfirmPhysicalScaling: false }, unitsConfirmed: false, canonicalValueEligibility: false }, {});
  const notEligible = M.evaluateBmsExtractionEligibility(notReadyRd, {});
  const mx = (elig, opts) => M.evaluateBmsMeasuredExtraction(elig, opts || {});
  const caps = ['measuredExtraction', 'measuredHandlingResponse', 'handlingAnalysis', 'overlayEnabled', 'kus', 'handlingCorrelation', 'setupRecommendation', 'modelVsActual', 'canonicalTelemetry', 'timeSeries'];
  const capsFalse = o => caps.every(k => o.capabilities[k] === false);
  // synthetic canonical series builder (SYNTHETIC fixture only — straight + corner with a steady mid)
  const mkSeries = (corners, ratio) => { const speed = [], steering = [], lateral_accel = [], yaw_rate = [], timeIndex = []; let t = 0; for (let c = 0; c < corners; c++) { for (let i = 0; i < 5; i++) { timeIndex.push(t++); speed.push(100); steering.push(0); lateral_accel.push(0); yaw_rate.push(0); } for (let i = 0; i < 15; i++) { timeIndex.push(t++); let lg; if (i < 4) lg = 0.4 + 0.05 * i; else if (i < 11) lg = 0.55; else lg = 0.55 - 0.1 * (i - 10); lateral_accel.push(lg); speed.push(80); steering.push(lg * ratio); yaw_rate.push(lg * 0.5); } } return { timeIndex, speed, steering, lateral_accel, yaw_rate }; };
  const series = mkSeries(3, 1.0);
  const SYN = opts => Object.assign({ syntheticOnly: true, corpus: CORPUS }, opts);

  // A. no eligibility / not eligible → not_available / blocked_by_eligibility
  const a = mx(null, {});
  check('measext(A): no eligibility → not_available; harness/analysis caps false; realDataUsed false',
    a.status === 'not_available' && a.capabilities.measuredExtractionSynthetic === false && capsFalse(a) && a.realDataUsed === false && code(a, 'BMS_MEXT_NOT_AVAILABLE'));
  const a2 = mx(notEligible, {});
  check('measext(A2): not eligible → blocked_by_eligibility; no segments/tendency; caps false',
    a2.status === 'blocked_by_eligibility' && a2.cornerCount === 0 && a2.measuredTendencyProxy === null && capsFalse(a2));

  // B. real path: eligible but not flagged synthetic, even WITH a series → blocked_real_path
  const b = mx(eligible, { syntheticCanonicalSeries: series });
  check('measext(B): eligible but not syntheticOnly (real path) → blocked_real_path; empty segments; null tendency; realDataUsed false',
    b.status === 'blocked_real_path' && b.cornerSegments.length === 0 && b.measuredTendencyProxy === null && b.realDataUsed === false && capsFalse(b));

  // C. eligible + syntheticOnly but no series → insufficient_synthetic_series
  const c = mx(eligible, { syntheticOnly: true, corpus: CORPUS });
  check('measext(C): syntheticOnly but no series → insufficient_synthetic_series; null tendency; caps false',
    c.status === 'insufficient_synthetic_series' && c.measuredTendencyProxy === null && capsFalse(c));

  // D. synthetic segmentation → full extraction on this series
  const d = mx(eligible, SYN({ syntheticCanonicalSeries: series }));
  check('measext(D): synthetic series → segmented; cornerCount>0; syntheticOnly true; realDataUsed false',
    d.cornerCount > 0 && d.syntheticOnly === true && d.realDataUsed === false);
  check('measext(D2): full synthetic series → extracted_synthetic',
    d.status === 'extracted_synthetic');

  // E. entry/mid/exit windows
  check('measext(E): entry/mid/exit window counts > 0',
    d.entryWindowCount > 0 && d.midWindowCount > 0 && d.exitWindowCount > 0);

  // F. steady-state pass
  check('measext(F): steady-state windows > 0; confidence present',
    d.steadyStateWindowCount > 0 && d.confidence !== 'none');

  // G. steady-state insufficient (unstable mid speed) → not extracted, no steady windows
  const unstable = (() => { const s = mkSeries(3, 1.0); for (let i = 0; i < s.speed.length; i++) s.speed[i] = 80 + (i % 2 ? 40 : 0); return s; })();
  const g = mx(eligible, SYN({ syntheticCanonicalSeries: unstable }));
  check('measext(G): unstable mid → steady-state blocked (0 steady windows; not extracted_synthetic); caps false',
    g.steadyStateWindowCount === 0 && g.status !== 'extracted_synthetic' && capsFalse(g));

  // H. tendency proxy synthetic-only & explicitly not Kus/setup/model-vs-actual
  check('measext(H): tendency proxy marked syntheticOnly/notKus/notSetupAdvice/notModelVsActual; count>0',
    !!d.measuredTendencyProxy && d.measuredTendencyProxy.syntheticOnly === true && d.measuredTendencyProxy.notKus === true
    && d.measuredTendencyProxy.notSetupAdvice === true && d.measuredTendencyProxy.notModelVsActual === true && d.tendencyProxyCount > 0);
  // H2. synthetic ratio drives understeer_like / oversteer_like proxy label
  const us = mx(eligible, SYN({ syntheticCanonicalSeries: mkSeries(3, 1.4) }));
  const os = mx(eligible, SYN({ syntheticCanonicalSeries: mkSeries(3, 0.6) }));
  check('measext(H2): synthetic ratio → understeer_like / oversteer_like proxy (synthetic proxy only)',
    us.measuredTendencyProxy.label === 'understeer_like_proxy' && os.measuredTendencyProxy.label === 'oversteer_like_proxy');

  // I. synthetic extracted but downstream caps remain false
  check('measext(I): extracted_synthetic → measuredExtractionSynthetic true; all analysis/real caps false',
    d.status === 'extracted_synthetic' && d.capabilities.measuredExtractionSynthetic === true && d.capabilities.measuredExtraction === false && capsFalse(d));

  // J. real/blocked path leaks nothing (no segments, no tendency, syntheticOnly false)
  check('measext(J): real/blocked path → empty segments, null tendency, syntheticOnly false',
    b.cornerSegments.length === 0 && b.measuredTendencyProxy === null && b.syntheticOnly === false
    && a2.cornerSegments.length === 0 && a2.measuredTendencyProxy === null);

  // confirmation integration — feed only flips measuredExtractionSynthetic with full prereqs + corpus
  const bmsStub = { header: { valid: true }, channels: ['accy', 'yaw', 'steer', 'speed'].map(n => ({ name: n })), channelCount: 4 };
  const rawStub = { rawSeriesCandidates: [{ id: 'candidate_001', encoding: 'int16le', sampleCount: 600 }], timebaseCandidate: { present: true, sampleCount: 600 } };
  const probeMono = { timebaseClues: [{ type: 'monotonic_counter_candidate', runLength: 600, medianDelta: 10, confidence: 'medium' }] };
  const exMap = { candidate_001: { rawChannelName: 'accy', canonicalName: 'lateral_accel', scale: 0.01, offset: 0, unit: 'g' } };
  const linkEx = M.linkBmsRawCandidates(bmsStub, probeMono, rawStub, { explicitMapping: exMap });
  const STABLE = { channelCountStable: true, candidateRegionStable: true, catalogDetectedAll: true, fileCount: 3 };
  const structFeed = { confirmationFeed: { perChannelBlockCountCandidate: true } };
  const idFeed = { status: 'confirmed_identity', aggregateDecision: { canConfirmAnyChannelIdentity: true }, capabilities: { channelIdentityConfirmed: true } };
  const tbFeed = { status: 'confirmed_timebase', aggregateDecision: { canConfirmTimebase: true }, capabilities: { timebaseConfirmed: true } };
  const psFeed = { status: 'confirmed_scaling', aggregateDecision: { canConfirmPhysicalScaling: true }, unitsConfirmed: true, canonicalValueEligibility: true, capabilities: { physicalScaling: true } };
  const mxNoCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, linkEx, { measuredExtraction: d });
  check('measext→confirm: feed WITHOUT corpus/prereqs → measuredExtractionSynthetic false; decode caps false',
    mxNoCorpus.decisions.measuredExtractionSynthetic === false
    && mxNoCorpus.capabilities.timeSeries === false && mxNoCorpus.capabilities.physicalScaling === false && mxNoCorpus.capabilities.handlingCorrelation === false);
  const mxCorpus = M.evaluateBmsConfirmationEvidence(bmsStub, probeMono, rawStub, linkEx, { structure: structFeed, channelIdentity: idFeed, timebase: tbFeed, physicalScaling: psFeed, readiness: readyRd, extractionEligibility: eligible, measuredExtraction: d, corpus: STABLE });
  check('measext→confirm: feed + full prereqs + corpus → measuredExtractionSynthetic true; decode caps still false',
    mxCorpus.decisions.measuredExtractionSynthetic === true
    && mxCorpus.capabilities.timeSeries === false && mxCorpus.capabilities.physicalScaling === false && mxCorpus.capabilities.handlingCorrelation === false);

  // metadata integration (real path → conservative)
  const realMx = mx(notEligible, {});
  const meta = M.buildTelemetryMetadata({ header: { importer: 'DarabImporter v.', valid: true }, channelCount: 4, channels: bmsStub.channels, measuredExtraction: realMx });
  check('measext→metadata: summary surfaced + measuredExtractionSynthetic false; harness/real/handling/overlay caps false',
    !!meta.measuredExtraction && meta.capabilities.measuredExtractionHarness === true && meta.capabilities.measuredExtractionSynthetic === false
    && meta.capabilities.measuredExtraction === false && meta.capabilities.measuredHandlingResponse === false && meta.capabilities.overlayEnabled === false);
  check('measext→metadata: no measuredExtraction → cap false, summary null',
    M.buildTelemetryMetadata({ header: { importer: 'DarabImporter', valid: true }, channelCount: 1, channels: [{ name: 'accy' }] }).measuredExtraction === null);

  // M. prior-phase regression (real path unchanged)
  check('measext(M): prior phases real path unchanged (eligibility not_eligible, readiness not_ready)',
    notEligible.status === 'not_eligible' && notEligible.capabilities.extractionEligible === false && notReadyRd.status === 'not_ready');

  // N (review B1 regression): degenerate requiredChannels must not bypass validation / crash
  let nCrashed = false, nStatus = null;
  try { nStatus = mx(eligible, { syntheticOnly: true, corpus: CORPUS, syntheticCanonicalSeries: {}, extractionProfile: { requiredChannels: [] } }).status; }
  catch (e) { nCrashed = true; }
  check('measext(N): empty requiredChannels + empty series → insufficient_synthetic_series (no crash)',
    nCrashed === false && nStatus === 'insufficient_synthetic_series');

  // O (review B3 regression): NaN-interleaved mid speed must fail steady-state (fail-closed)
  const nanSeries = (() => { const s = mkSeries(3, 1.0); for (let i = 0; i < s.speed.length; i++) if (i % 2) s.speed[i] = NaN; return s; })();
  const o = mx(eligible, SYN({ syntheticCanonicalSeries: nanSeries }));
  check('measext(O): NaN-interleaved mid speed → steady-state fail-closed (0 steady; not extracted); caps false',
    o.steadyStateWindowCount === 0 && o.status !== 'extracted_synthetic' && capsFalse(o));

  // P (review A2/B2 regression): out-of-range / negative segmentHints rejected; only in-bounds hint kept
  const hintSeries = Object.assign(mkSeries(2, 1.0), { segmentHints: [{ cornerId: 1, startIdx: 5, endIdx: 18 }, { cornerId: 2, startIdx: 100, endIdx: 100000 }, { cornerId: 3, startIdx: -5, endIdx: 8 }] });
  const p = mx(eligible, SYN({ syntheticCanonicalSeries: hintSeries }));
  const seriesLen = hintSeries.lateral_accel.length;
  check('measext(P): out-of-range/negative segmentHints rejected; segments stay within bounds; realDataUsed false',
    p.cornerSegments.length === 1 && p.cornerSegments.every(c => c.startIdx >= 0 && c.endIdx <= seriesLen && c.sampleCount <= seriesLen) && p.realDataUsed === false);

  // Q (review A1/B4 regression): confidence collapses to medium|low only (dead ternary removed)
  const big = mx(eligible, SYN({ syntheticCanonicalSeries: mkSeries(5, 1.0) }));
  check('measext(Q): extracted confidence is medium|low only',
    ['low', 'medium'].includes(d.confidence) && ['low', 'medium'].includes(big.confidence));
}

// ── Phase 3R-0: trust-chain INVARIANTS (regression guards locking the Phase 3 red lines) ──
console.log('\n[invariants] Phase 3 trust-chain red-line invariants');
{
  const GATED = ['physicalScaling', 'unitsConfirmed', 'canonicalTelemetry', 'telemetryReady', 'telemetryReadiness',
    'extractionEligible', 'measuredExtraction', 'measuredExtractionSynthetic', 'measuredHandlingResponse',
    'handlingAnalysis', 'overlayEnabled', 'kus', 'handlingCorrelation', 'setupRecommendation', 'modelVsActual',
    'timeSeries', 'lapSegmentation'];
  const noGated = o => !!(o && o.capabilities) && GATED.every(k => o.capabilities[k] === undefined || o.capabilities[k] === false);

  // real/imported single-file path: build the whole chain with empty opts (the importBms / reporter call shape)
  const realBms = { header: { valid: true }, channels: ['accy', 'yaw', 'steer', 'speed'].map(n => ({ name: n })), channelCount: 4 };
  const probe = {}, rawX = { rawSeriesCandidates: [] };
  const link = M.linkBmsRawCandidates(realBms, probe, rawX, {});
  const rawStream = M.evaluateBmsRawStreamConfirmation(realBms, probe, rawX, null, {});
  const identity = M.evaluateBmsChannelIdentityConfirmation(realBms, rawStream, null, {});
  const timebase = M.evaluateBmsTimebaseConfirmation(rawStream, null, {});
  const scaling = M.evaluateBmsPhysicalScalingConfirmation(rawStream, identity, timebase, {});
  const readiness = M.evaluateBmsTelemetryReadiness(rawStream, identity, timebase, scaling, {});
  const eligibility = M.evaluateBmsExtractionEligibility(readiness, {});
  const measext = M.evaluateBmsMeasuredExtraction(eligibility, {});
  const hub = M.evaluateBmsConfirmationEvidence(realBms, probe, rawX, link, { readiness, extractionEligibility: eligibility, measuredExtraction: measext });
  const meta = M.buildTelemetryMetadata(Object.assign({}, realBms, { rawStreamConfirmation: rawStream, channelIdentity: identity, timebase, physicalScaling: scaling, readiness, extractionEligibility: eligibility, measuredExtraction: measext, confirmation: hub, probe, raw: rawX, link }));

  // A. real path fail-closed at every layer (gates + hub decisions)
  check('invariant(A): real path fail-closed (readiness not_ready / eligibility not_eligible / measext blocked / hub not_confirmed)',
    readiness.status === 'not_ready' && eligibility.status === 'not_eligible' && measext.status === 'blocked_by_eligibility' && hub.status === 'not_confirmed'
    && hub.decisions.canConfirmSampleStructure === false && hub.decisions.canConfirmRawStreams === false
    && hub.decisions.canConfirmChannelIdentity === false && hub.decisions.canConfirmTimebase === false
    && hub.decisions.canConfirmPhysicalScaling === false && hub.decisions.canonicalTelemetryPrerequisitesMet === false
    && hub.decisions.telemetryReadyForAnalysis === false && hub.decisions.measuredExtractionEligible === false && hub.decisions.measuredExtractionSynthetic === false);

  // B. no gated capability true on the real path — at any layer or in the merged metadata
  check('invariant(B): no gated capability true on real path (all layers + merged metadata)',
    [rawStream, identity, timebase, scaling, readiness, eligibility, measext, hub].every(noGated) && noGated(meta)
    && meta.capabilities.timeSeries === false && meta.capabilities.canonicalTelemetry === false && meta.capabilities.handlingAnalysis === false
    && meta.capabilities.measuredHandlingResponse === false && meta.capabilities.telemetryReady === false && meta.capabilities.extractionEligible === false
    && meta.capabilities.measuredExtraction === false && meta.capabilities.measuredExtractionSynthetic === false && meta.capabilities.physicalScaling === false);

  // C. confirmation hub pins decode caps false literally on every path
  check('invariant(C): hub pins timeSeries/physicalScaling/handlingCorrelation false',
    hub.capabilities.timeSeries === false && hub.capabilities.physicalScaling === false && hub.capabilities.handlingCorrelation === false);

  // D. robustness: bad/empty input is fail-closed (no throw; no gated cap)
  let robustOk = true;
  const badCalls = [
    () => M.evaluateBmsExtractionEligibility(null, {}),
    () => M.evaluateBmsExtractionEligibility(undefined, {}),
    () => M.evaluateBmsMeasuredExtraction(null, {}),
    () => M.evaluateBmsMeasuredExtraction({ status: 'eligible_for_extraction', capabilities: { extractionEligible: true } }, { syntheticOnly: true, syntheticCanonicalSeries: null }),
    () => M.evaluateBmsTelemetryReadiness(null, null, null, null, {}),
  ];
  for (const fn of badCalls) { try { const r = fn(); if (r && !noGated(r)) robustOk = false; } catch (e) { robustOk = false; } }
  check('invariant(D): bad/empty input fail-closed (no throw, no gated cap)', robustOk);

  // E. reporter: summarizeFile output key set === REPORT_FIELDS, all scalar
  const reporter = require(path.join(__dirname, '..', 'tools', 'bmsbin-local-probe-report.js'));
  const strTok = (s) => { const b = Buffer.from(s + '\0', 'ascii'); const L = Buffer.alloc(2); L.writeUInt16LE(b.length, 0); return Buffer.concat([L, b]); };
  const sine = Buffer.alloc(4000); for (let k = 0; k < 2000; k++) sine.writeInt16LE(Math.round(2000 * Math.sin(k / 20)), k * 2);
  const fixture = new Uint8Array(Buffer.concat([Buffer.from('DarabImporter v.\0', 'ascii'), Buffer.alloc(8), strTok('TrackInfo'), Buffer.from([1, 2, 3, 4]), strTok('accy'), strTok('MS5.8'), sine]));
  const sm = reporter.summarizeFile(fixture, M, { scanWindowBytes: 64 * 1024 });
  const smKeys = new Set(Object.keys(sm)), rf = new Set(reporter.REPORT_FIELDS);
  check('invariant(E): reporter summary key set === REPORT_FIELDS; all scalar',
    smKeys.size === rf.size && [...rf].every(k => smKeys.has(k)) && Object.keys(sm).every(k => { const v = sm[k]; return v === null || ['string', 'number', 'boolean'].includes(typeof v); }));

  // F. reporter error-fallback literal key set === REPORT_FIELDS (drift guard; static check, no refactor)
  const repSrc = fs.readFileSync(path.join(__dirname, '..', 'tools', 'bmsbin-local-probe-report.js'), 'utf8');
  const fbMatch = repSrc.match(/catch \(e\) \{ return \{([\s\S]*?)\}; \}/);
  const fbKeys = fbMatch ? new Set([...fbMatch[1].matchAll(/(\w+):/g)].map(x => x[1])) : new Set();
  check('invariant(F): reporter error-fallback key set === REPORT_FIELDS (drift guard)',
    fbKeys.size === rf.size && [...rf].every(k => fbKeys.has(k)));

  // G. synthetic extracted_synthetic opens ONLY measuredExtractionSynthetic/Harness; realDataUsed false
  const CORPUS = { fileCount: 3, candidateRegionStable: true, channelCountStable: true };
  const chans = ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel'];
  const readyRd = M.evaluateBmsTelemetryReadiness({ aggregateDecision: { canConfirmAnyRawStream: true } }, { aggregateDecision: { canConfirmAnyChannelIdentity: true } }, { aggregateDecision: { canConfirmTimebase: true } }, { aggregateDecision: { canConfirmPhysicalScaling: true }, unitsConfirmed: true, canonicalValueEligibility: true }, { corpus: CORPUS, confirmedChannels: chans, qualityEvidence: { sampleRateAdequate: true, syncQualityAdequate: true, dropoutOk: true, noiseOk: true } });
  const elig = M.evaluateBmsExtractionEligibility(readyRd, { corpus: CORPUS, canonicalSeriesEvidence: { canonicalChannels: chans, timeAligned: true, gapFree: true, knownSampleRate: true }, segmentationEvidence: { cornerEventsDetectable: true, cornerEventCount: 6, entryMidExitSeparable: true, steadyStateIdentifiable: true } });
  const mk = (c, ratio) => { const speed = [], steering = [], lateral_accel = [], yaw_rate = [], timeIndex = []; let t = 0; for (let k = 0; k < c; k++) { for (let i = 0; i < 5; i++) { timeIndex.push(t++); speed.push(100); steering.push(0); lateral_accel.push(0); yaw_rate.push(0); } for (let i = 0; i < 15; i++) { timeIndex.push(t++); let lg; if (i < 4) lg = 0.4 + 0.05 * i; else if (i < 11) lg = 0.55; else lg = 0.55 - 0.1 * (i - 10); lateral_accel.push(lg); speed.push(80); steering.push(lg * ratio); yaw_rate.push(lg * 0.5); } } return { timeIndex, speed, steering, lateral_accel, yaw_rate }; };
  const synEx = M.evaluateBmsMeasuredExtraction(elig, { syntheticOnly: true, corpus: CORPUS, syntheticCanonicalSeries: mk(3, 1.0) });
  const onlySynthFlip = synEx.capabilities.measuredExtractionSynthetic === true && synEx.capabilities.measuredExtractionHarness === true
    && synEx.capabilities.measuredHandlingResponse === false && synEx.capabilities.handlingAnalysis === false && synEx.capabilities.overlayEnabled === false
    && synEx.capabilities.kus === false && synEx.capabilities.handlingCorrelation === false && synEx.capabilities.setupRecommendation === false
    && synEx.capabilities.modelVsActual === false && synEx.capabilities.canonicalTelemetry === false && synEx.capabilities.timeSeries === false && synEx.capabilities.measuredExtraction === false;
  check('invariant(G): synthetic extracted_synthetic opens only measuredExtractionSynthetic/Harness; realDataUsed false',
    synEx.status === 'extracted_synthetic' && synEx.realDataUsed === false && onlySynthFlip);

  // H. dual-gate adversarial: only-status/only-cap → blocked_by_eligibility; eligible+series w/o syntheticOnly → blocked_real_path
  const onlyStatus = M.evaluateBmsMeasuredExtraction({ status: 'eligible_for_extraction', capabilities: { extractionEligible: false } }, { syntheticOnly: true, corpus: CORPUS, syntheticCanonicalSeries: mk(3, 1.0) });
  const onlyCap = M.evaluateBmsMeasuredExtraction({ status: 'not_eligible', capabilities: { extractionEligible: true } }, { syntheticOnly: true, corpus: CORPUS, syntheticCanonicalSeries: mk(3, 1.0) });
  const realSeries = M.evaluateBmsMeasuredExtraction(elig, { syntheticCanonicalSeries: mk(3, 1.0) });
  check('invariant(H): dual-gate — only-status/only-cap → blocked_by_eligibility; eligible+series w/o syntheticOnly → blocked_real_path',
    onlyStatus.status === 'blocked_by_eligibility' && onlyCap.status === 'blocked_by_eligibility' && realSeries.status === 'blocked_real_path'
    && [onlyStatus, onlyCap, realSeries].every(o => o.realDataUsed === false && noGated(o)));

  // I. shape-contract: canonical gate shape present on 3E-0..3G-0B
  check('invariant(I): canonical gate shape on 3E-0..3G-0B (status/aggregateDecision/confirmationFeed/capabilities/diagnostics/unknowns)',
    [identity, timebase, scaling, readiness, eligibility, measext].every(o => typeof o.status === 'string' && o.aggregateDecision && typeof o.aggregateDecision === 'object'
      && o.confirmationFeed && o.capabilities && Array.isArray(o.diagnostics) && Array.isArray(o.unknowns)));
}

console.log(`\n========= 結果: ${pass} passed, ${fail} failed =========`);
process.exit(fail > 0 ? 1 : 0);
