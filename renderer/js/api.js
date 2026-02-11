/**
 * API Bridge Layer - 取代 Flask REST API
 * 所有計算在本地 JS 直接執行，不需要 server
 *
 * 原本的 fetch('/api/...') 呼叫全部替換成 api.xxx() 同步/非同步呼叫
 */

const api = {
  // === Prediction ===

  /** Tier 1: Basic mechanical balance (internally uses Tier 2 with auto tire defaults) */
  predictTier1(params) {
    return new Tier1BasicBalance(params).calculate();
  },

  /** Tier 2: Tire-aware balance prediction */
  predictTier2(params, tireParams) {
    return new Tier2TireAware(params, tireParams).calculate();
  },

  /** Tier 3: Complete vehicle dynamics */
  predictTier3(params, tireParams, advancedParams) {
    return new Tier3Complete(params, tireParams, advancedParams).calculate();
  },

  /** Compare current setup vs baseline (歸零校正) */
  compare(tier, baselineInputs, currentInputs) {
    return compareWithBaseline(tier, baselineInputs, currentInputs);
  },

  // === Car Presets ===

  /** Get all car presets summary */
  getPresets() {
    return getAllPresetsSummary();
  },

  /** Get full preset data for specific car */
  getPreset(carId) {
    return getPreset(carId);
  },

  /** Get adjustable fields for street mode */
  getStreetFields(carId) {
    return getStreetModeFields(carId);
  },

  /** Get GR Yaris aftermarket spring options */
  getAftermarketGRYaris() {
    return typeof GR_YARIS_AFTERMARKET !== 'undefined' ? GR_YARIS_AFTERMARKET : {};
  },

  // === Tires ===

  /** Get all trackday tires as array */
  getTires() {
    return getAllTires();
  },

  /** Get specific tire by ID */
  getTire(tireId) {
    return getTire(tireId);
  },

  /** Get tire compounds (legacy + trackday) */
  getCompounds() {
    const compounds = {};
    // Legacy compounds
    for (const [key, val] of Object.entries(TireModel.COMPOUNDS)) {
      compounds[key] = {
        optimal_temp: val[0],
        temp_window: val[1],
        peak_grip: val[2],
      };
    }
    // Trackday tires
    if (typeof TRACKDAY_TIRES !== 'undefined') {
      for (const [key, val] of Object.entries(TRACKDAY_TIRES)) {
        compounds[key] = {
          name: val.name,
          name_zh: val.name_zh,
          optimal_temp: val.optimal_temp,
          temp_window: val.temp_window,
          peak_grip: val.peak_grip,
          compound_type: val.compound_type,
        };
      }
    }
    return compounds;
  },

  /** Calculate tire grip for given conditions */
  calcTireGrip(temp, pressure, compound, optimalPressure) {
    return {
      grip: TireModel.effectiveGrip(temp, pressure, compound, optimalPressure),
      temp_factor: TireModel.gripFactorTemperature(temp, compound),
      pressure_factor: TireModel.gripFactorPressure(pressure, optimalPressure),
    };
  },

  // === Weight ===

  /** Calculate weight distribution from corner weights */
  calcWeight(fl, fr, rl, rr) {
    const total = fl + fr + rl + rr;
    if (total <= 0) return { error: 'Total weight must be > 0' };

    const frontTotal = fl + fr;
    const rearTotal = rl + rr;
    const leftTotal = fl + rl;
    const rightTotal = fr + rr;
    const crossWeight = fl + rr;

    return {
      total: roundN(total, 1),
      front_pct: roundN(frontTotal / total * 100, 1),
      rear_pct: roundN(rearTotal / total * 100, 1),
      left_pct: roundN(leftTotal / total * 100, 1),
      right_pct: roundN(rightTotal / total * 100, 1),
      cross_weight_pct: roundN(crossWeight / total * 100, 1),
      front_total: roundN(frontTotal, 1),
      rear_total: roundN(rearTotal, 1),
    };
  },

  // === Setup Advisor ===

  /** Analyze setup and generate tuning suggestions */
  analyzeSetup(result, tier, params, advParams) {
    return SetupAdvisor.analyze(result, tier, params, advParams);
  },

  // === Spring Calculator ===

  /** Calculate spring rate from target frequency */
  calcSpringFromFreq(targetHz, cornerMass, motionRatio, tireSpringRate) {
    return SpringCalculator.freqToSpring(targetHz, cornerMass, motionRatio, tireSpringRate);
  },

  /** Calculate frequency from spring rate */
  calcFreqFromSpring(springRate, cornerMass, motionRatio, tireSpringRate) {
    return SpringCalculator.springToFreq(springRate, cornerMass, motionRatio, tireSpringRate);
  },

  /** Generate spring rate reference table */
  calcSpringTable(cornerMass, motionRatio, tireSpringRate, rates) {
    return SpringCalculator.springTable(cornerMass, motionRatio, tireSpringRate, rates);
  },

  /** Calculate ARB sizing for target roll gradient */
  calcArbSizing(totalWeight, cgHeight, targetRollGrad, frontPct, springRollFront, springRollRear) {
    return SpringCalculator.arbSizing(totalWeight, cgHeight, targetRollGrad, frontPct, springRollFront, springRollRear);
  },

  // === Tire Spring Rate Estimation ===

  /** Estimate tire spring rate from dimensions */
  estimateTireSpring(width, aspectRatio) {
    return TireSpringEstimator.estimate(width, aspectRatio);
  },

  /** Parse tire size string into structured specs */
  parseTireSize(sizeStr) {
    return TireSpringEstimator.parseTireSize(sizeStr);
  },

  /** Estimate tire spring rates from OEM size string */
  estimateTireSpringFromString(sizeStr) {
    return TireSpringEstimator.estimateFromString(sizeStr);
  },

  /** Calculate wheel upgrade impact */
  calcWheelUpgrade(originalSpec, newRimSize, newWidth) {
    return TireSpringEstimator.calculateWheelUpgrade(originalSpec, newRimSize, newWidth);
  },

  /** Get suggested rim sizes for upgrades */
  suggestRimSizes(originalRim) {
    return TireSpringEstimator.suggestRimSizes(originalRim);
  },

  // === Stats ===

  /** Get app stats */
  getStats() {
    return {
      trackday_tires: typeof TRACKDAY_TIRES !== 'undefined' ? Object.keys(TRACKDAY_TIRES).length : 0,
      car_presets: typeof CAR_PRESETS !== 'undefined' ? Object.keys(CAR_PRESETS).length : 0,
      version: typeof electronAPI !== 'undefined' ? electronAPI.version : '1.0.0',
    };
  },
};
