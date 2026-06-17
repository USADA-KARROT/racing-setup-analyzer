/**
 * calibration.js — Calibration layer / 校準層
 *
 * 把分散在物理模型裡的「調味用魔術數字」集中到一處,並為每個值標上可信度等級
 * 與校準來源。核心理念(朋友的回饋,作者認同):一個工具最危險的不是算得不夠準,
 * 而是把三種不同可信度的東西用同一種外觀呈現 ——
 *
 *   Physics   — 教科書硬公式 (wheel rate、ride frequency、roll stiffness…),不在此層。
 *   Model     — 工程近似/模型假設 (需要時可校正,但有合理物理依據)。
 *   Heuristic — 啟發式調味 (對標真實數據手調出來的增益/倍率,最該被誠實標示)。
 *
 * 規則:
 *   - 物理函式從這裡 import 常數,**不再 inline 魔術數字**。
 *   - 抽出時「值保持不變」→ 既有 111 迴歸測試仍綠 (tests/verify-dynamics.js 另有
 *     一組斷言:CAL.X === 原 inline 值,防止日後手滑改動)。
 *   - 純物理常數 (G、空氣密度、傳動效率 0.9、滾阻 0.015 等) 刻意「不」搬進來 ——
 *     它們是 A 級教科書值,不是這層要曝光的「C 級調味」;混進來反而模糊了重點。
 *
 * 每個常數的 metadata:
 *   value          數值 (formula 真正用的就是這個)
 *   unit           單位
 *   meaning        一句話說明它在做什麼
 *   validRange     合理範圍 (UI/sanity check / 未來 sensitivity sweep 用)
 *   tier           'Physics' | 'Model' | 'Heuristic'
 *   calibratableBy 'telemetry' | 'tyreData' | 'none' — 未來拿到什麼資料能校正它
 *   usedIn         出現在哪個檔/函式 (給維護者對照)
 *
 * 載入順序:本檔必須在 dynamics-model.js / lihpao-laptime.js 之前載入
 * (index.html script tag + tests/verify-dynamics.js concat 順序皆已確保)。
 */

const CALIBRATION = {
  // ── Handling-balance scale (dynamics-model.js) ──────────────────────────
  US_NEUTRAL_BAND: {
    value: 0.5,
    unit: 'deg/g',
    meaning: 'Understeer gradient 在 ±此值內視為「中性」的判定帶寬',
    validRange: [0.3, 1.0],
    tier: 'Heuristic',
    calibratableBy: 'none',
    usedIn: 'dynamics-model.js usTendency()',
  },
  US_NORM_SCALE: {
    value: 4.0,
    unit: 'deg/g',
    meaning: '把 understeer gradient 正規化到 ±1 的滿刻度(僅供顯示/條狀圖)',
    validRange: [3.0, 6.0],
    tier: 'Heuristic',
    calibratableBy: 'none',
    usedIn: 'dynamics-model.js usNorm()',
  },
  CORNERING_STIFFNESS_AY_REF_G: {
    value: 1.0,
    unit: 'g',
    meaning: '評估荷重轉移、進而校準 cornering-stiffness 負載敏感度的參考側向加速度',
    validRange: [0.8, 1.2],
    tier: 'Model',
    calibratableBy: 'telemetry',
    usedIn: 'dynamics-model.js Tier2 understeer-gradient (ayRef)',
  },
  TIRE_GRIP_TO_US_GRADIENT_GAIN: {
    value: 14,
    unit: 'deg/g per unit grip-ratio',
    meaning: '前/後抓地比失衡 → understeer gradient 偏移的增益(前軸少 10% 抓地 ≈ +1.4 deg/g)',
    validRange: [8, 20],
    tier: 'Heuristic',
    calibratableBy: 'telemetry',
    usedIn: 'dynamics-model.js Tier2 tireUsShift',
  },
  WEIGHT_SHIFT_TO_US_GRADIENT: {
    value: 0.2,
    unit: 'deg/g per % effective-weight shift',
    meaning: '空力造成的有效配重前移 → understeer gradient 偏移(每 1% 前移 ≈ 0.2 deg/g)',
    validRange: [0.1, 0.35],
    tier: 'Heuristic',
    calibratableBy: 'telemetry',
    usedIn: 'dynamics-model.js Tier3 aeroUsShift',
  },

  // ── Tire grip factors (dynamics-model.js TireModel) ─────────────────────
  TIRE_WIDTH_GRIP_REF_MM: {
    value: 245,
    unit: 'mm',
    meaning: '胎寬抓地倍率的參考寬度(此寬度 = 1.0x)',
    validRange: [195, 295],
    tier: 'Heuristic',
    calibratableBy: 'tyreData',
    usedIn: 'dynamics-model.js TireModel.gripFactorWidth (REFERENCE_WIDTH)',
  },
  TIRE_WIDTH_GRIP_EXPONENT: {
    value: 0.5,
    unit: '—',
    meaning: '胎寬抓地倍率 = (width/ref)^此指數(0.5 = sqrt,遞減報酬)',
    validRange: [0.3, 0.7],
    tier: 'Heuristic',
    calibratableBy: 'tyreData',
    usedIn: 'dynamics-model.js TireModel.gripFactorWidth',
  },
  PRESSURE_GRIP_LOSS_PER_BAR: {
    value: 0.2,
    unit: 'grip-fraction per bar',
    meaning: '胎壓偏離最佳值每 1 bar 的抓地損失(≈ 每 0.1 bar −2%)',
    validRange: [0.1, 0.4],
    tier: 'Heuristic',
    calibratableBy: 'tyreData',
    usedIn: 'dynamics-model.js TireModel.gripFactorPressure',
  },

  // ── Lihpao lap-time simulator (lihpao-laptime.js) ───────────────────────
  LIHPAO_RADIUS_SCALE: {
    value: 1.1,
    unit: '—',
    meaning: '麗寶 G2 代表性彎道半徑的校準係數(對標 GR Yaris 1:50.89)',
    validRange: [0.9, 1.3],
    tier: 'Heuristic',
    calibratableBy: 'telemetry',
    usedIn: 'lihpao-laptime.js LIHPAO_G2.radius_scale',
  },
  TIRE_TEMP_TRACK_COEFF: {
    value: 0.6,
    unit: '°C per °C',
    meaning: '胎工作平衡溫對賽道溫的敏感度:Teq = optimal + (track−32)×此係數',
    validRange: [0.3, 0.9],
    tier: 'Heuristic',
    calibratableBy: 'telemetry',
    usedIn: 'lihpao-laptime.js LihpaoStintSim.tireTemp',
  },
  TIRE_TEMP_EQUIL_TAU_LAPS: {
    value: 1.6,
    unit: 'laps',
    meaning: '胎溫趨近工作平衡溫的一階時間常數(~3-4 圈到平衡)',
    validRange: [1.0, 3.0],
    tier: 'Heuristic',
    calibratableBy: 'telemetry',
    usedIn: 'lihpao-laptime.js LihpaoStintSim.tireTemp (tau)',
  },
  LAP_BALANCE_PENALTY_PER_DEGG: {
    value: 0.012,
    unit: 'lap-time fraction per deg/g',
    meaning: '平衡偏離中性每 1 deg/g 的單圈時間懲罰(駕駛要修正、無法全力)',
    validRange: [0.005, 0.02],
    tier: 'Heuristic',
    calibratableBy: 'telemetry',
    usedIn: 'lihpao-laptime.js simulateLihpao balance_penalty',
  },
  LAP_BALANCE_PENALTY_CAP: {
    value: 0.04,
    unit: 'lap-time fraction',
    meaning: '平衡懲罰的上限(最多拖慢 ~4%)',
    validRange: [0.02, 0.08],
    tier: 'Heuristic',
    calibratableBy: 'telemetry',
    usedIn: 'lihpao-laptime.js simulateLihpao balance_penalty (cap)',
  },
  DRIVETRAIN_TRACTION_FRAC_2WD: {
    value: 0.62,
    unit: '—',
    meaning: '兩驅(FWD/RWD)出彎牽引時可用的驅動軸荷重比(AWD = 1.0,全軸驅動)',
    validRange: [0.5, 0.75],
    tier: 'Heuristic',
    calibratableBy: 'telemetry',
    usedIn: 'lihpao-laptime.js LihpaoLapSim.accelAt',
  },
};

// Flat numeric accessor — formula 內就用這個,讀起來等同一個具名常數。
const CAL = {};
for (const k in CALIBRATION) CAL[k] = CALIBRATION[k].value;
Object.freeze(CAL);
Object.freeze(CALIBRATION);

// node / 測試用 (browser 下 module 為 undefined,此區塊跳過)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CALIBRATION, CAL };
}
