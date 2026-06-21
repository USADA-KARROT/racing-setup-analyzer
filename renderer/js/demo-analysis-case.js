/**
 * demo-analysis-case.js — R2.2 §13: Demo Analysis Case provider (PURE, clean-room synthetic).
 *
 * buildDemoAnalysisCase(): a fully synthetic, text-only AnalysisCase + matching telemetry session that
 * traverse the REAL production pipeline (normalization → canonical → model → observation → comparison →
 * insight → view model). No private data, no paths, no binaries. The visible tendencies are PRODUCED by
 * the production code, not hardcoded:
 *   - mixed-basis suspension (front GROUND identity, rear SPRING-ELEMENT ×MR²) → all model-usable canonical
 *   - synthetic telemetry showing speed-dependent understeer + secondary steering corrections, with NO
 *     calibration, NO track position and NO lap segmentation (so measured K_us / corner attribution stay blocked)
 *
 * UMD: Node require / Electron renderer global (DemoAnalysisCase).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var CP = _req('./canonical-parameters.js', typeof CanonicalParameters !== 'undefined' ? CanonicalParameters : undefined);
  var PC = _req('./parameter-conversions.js', typeof ParameterConversions !== 'undefined' ? ParameterConversions : undefined);
  var SS = _req('./setup-snapshot.js', typeof SetupSnapshot !== 'undefined' ? SetupSnapshot : undefined);
  var AC = _req('./analysis-case.js', typeof AnalysisCase !== 'undefined' ? AnalysisCase : undefined);
  var TC = _req('./telemetry-core.js', typeof TelemetryCore !== 'undefined' ? TelemetryCore : undefined);
  var NRM = _req('./suspension-input-normalizer.js', typeof SuspensionInputNormalizer !== 'undefined' ? SuspensionInputNormalizer : undefined);
  if (!CP || !PC || !SS || !AC || !TC || !NRM) throw new Error('demo-analysis-case.js requires canonical/conversions/setup/case/telemetry/normalizer');

  var B = CP.SOURCE_BASIS, T = CP.TRAVEL_TERM, P = CP.PROVENANCE, C = CP.CONFIDENCE, A = CP.APPLICABILITY, S = CP.CONVERSION_STATUS, K = CP.CANONICAL_PARAM;
  var SRC = 'demo_synthetic_setup';

  function _raw(o) { return CP.makeRawSource(o); }
  function _canon(parameter, value, provenance, confidence, conversionStatus, extra) {
    return CP.makeCanonicalParameter(Object.assign({ parameter: parameter, value: value, provenance: provenance, confidence: confidence, conversionStatus: conversionStatus, applicability: A.BOTH }, extra || {}));
  }
  function _geo(parameter, value) { return _canon(parameter, value, P.DOCUMENTED, C.HIGH, S.NOT_REQUIRED, { sourceRef: SRC }); }

  // ── mixed-basis suspension → canonical wheel rates (front GROUND, rear SPRING-ELEMENT × MR²) ──
  // NOTE: a deliberately FRONT-BIASED synthetic setup (stiff front torsion + stiff front ARB + a
  // front-loaded weight split) so the model predicts a mild understeer — purely to exercise the demo
  // pipeline. It is NOT a representative real F3 baseline (a real F3 sits much closer to neutral).
  function buildCanonicalInputSnapshot() {
    // front: torsion-bar ground stiffness (already wheel-referred → identity)
    var frontGround = _raw({ value: 160, unit: 'N/mm', definition: 'front torsion ground stiffness (synthetic, stiff)', basis: B.GROUND, source: SRC, provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH });
    var frontConv = PC.groundRateToWheelRate(frontGround, K.FRONT_WHEEL_RATE);
    var frontWheelRate = _canon(K.FRONT_WHEEL_RATE, frontConv.output.value, P.DERIVED, C.HIGH, frontConv.status, { conversionRef: frontConv.conversionId, sourceRef: SRC, legacyUseWheelRate: true });

    // rear: coil element rate (lb/in) × MR² (software MR from a manual wheel/spring ratio) → softer rear
    var rearRatio = _raw({ value: 1.3, unit: 'dimensionless', definition: 'rear wheel/spring travel ratio (synthetic)', basis: B.WHEEL, ratioDefinition: { numerator: T.WHEEL, denominator: T.SPRING }, source: SRC, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH });
    var rearMr = PC.manualRatioToSoftwareMr(rearRatio);
    var rearSpring = _raw({ value: 700, unit: 'lb/in', definition: 'rear coil element rate (synthetic)', basis: B.SPRING_ELEMENT, source: SRC, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH });
    var rearConv = PC.springElementToWheelRate(rearSpring, rearMr.output.value, K.REAR_WHEEL_RATE);
    var rearWheelRate = _canon(K.REAR_WHEEL_RATE, rearConv.output.value, P.DERIVED, C.MEDIUM, rearConv.status, { conversionRef: rearConv.conversionId, sourceRef: SRC, legacyUseWheelRate: true });

    // ARB: blade component (kgf/mm) with a DOCUMENTED motion ratio → verified axle roll stiffness
    function arb(value, param, track) {
      var rawArb = _raw({ value: value, unit: 'kgf/mm', definition: 'arb blade component (synthetic)', basis: B.ARB_BLADE_COMPONENT, source: SRC, provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH });
      var conv = PC.arbComponentToAxleRollStiffness(rawArb, { value: 1.5, provenance: P.DOCUMENTED }, track, param);
      return _canon(param, conv.output.value, P.DERIVED, C.MEDIUM, conv.status, { conversionRef: conv.conversionId, sourceRef: SRC });
    }

    return {
      frontWheelRateNmm: frontWheelRate,
      rearWheelRateNmm: rearWheelRate,
      frontArbRollStiffnessNmDeg: arb(4.1, K.FRONT_ARB_ROLL_STIFFNESS, 1595),  // ~400 Nm/deg — stiff front ARB → front-biased roll stiffness
      rearArbRollStiffnessNmDeg: arb(1.0, K.REAR_ARB_ROLL_STIFFNESS, 1540),    // ~90 Nm/deg — soft rear
      frontTrackMm: _geo(K.FRONT_TRACK, 1595), rearTrackMm: _geo(K.REAR_TRACK, 1540), wheelbaseMm: _geo(K.WHEELBASE, 2800),
      massKg: _geo(K.MASS, 565), frontWeightPct: _geo(K.FRONT_WEIGHT_PCT, 58.0),
      cgHeightMm: _geo(K.CG_HEIGHT, 360), frontRollCentreHeightMm: _geo(K.FRONT_ROLL_CENTRE_HEIGHT, 28), rearRollCentreHeightMm: _geo(K.REAR_ROLL_CENTRE_HEIGHT, 40),
    };
  }

  // a transparent demo of the mixed-basis NORMALIZATION compatibility view (canonicalTrustUpgraded=false)
  function buildSuspensionNormalizationView() {
    return NRM.normalizeExplicitSuspensionInput({
      front: { rate: 95, basis: 'ground' },
      rear: { rate: 700 * PC.LBF_IN_TO_N_MM, basis: 'spring_element', motionRatio: 1 / 1.3, ratioDefinition: { numerator: 'spring_travel', denominator: 'wheel_travel' } },
    });
  }

  function buildSetupSnapshot() {
    return SS.makeSetupSnapshot({
      snapshotId: 'demo_setup_001', vehicleProfileId: 'demo_f3_profile',
      selectedOptions: [
        { category: SS.SETUP_OPTION_CATEGORY.TORSION_BAR, optionId: 'demo_front_torsion', appliesToParameter: 'frontWheelRateNmm' },
        { category: SS.SETUP_OPTION_CATEGORY.SPRING, optionId: 'demo_rear_coil', appliesToParameter: 'rearWheelRateNmm' },
        { category: SS.SETUP_OPTION_CATEGORY.ARB, optionId: 'demo_front_arb', appliesToParameter: 'frontArbRollStiffnessNmDeg' },
      ],
      measuredSettings: { front_ride_height: { value: 18, unit: 'mm', definition: 'front ride height (synthetic)', basis: CP.SOURCE_BASIS.CHASSIS, source: SRC, provenance: CP.PROVENANCE.MEASURED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.BOTH } },
      tyreContext: { compoundId: 'demo_slick', note: 'synthetic compound' },
    });
  }

  // ── synthetic telemetry: speed-dependent understeer + secondary steering corrections; no track/lap ──
  function buildDemoTelemetryCsv() {
    var ay = 8, speeds = [16, 19, 22, 25, 28, 31, 34, 37, 40], perSeg = 22, dt = 0.05;
    var yps = function (V) { return 0.0034 - 0.00004 * V; }; // ratio falls with speed → understeer
    var t = 0, rows = [];
    speeds.forEach(function (V) {
      var yaw = ay / V, steer = yaw / yps(V);
      for (var i = 0; i < perSeg; i++) {
        // a single brief secondary correction per segment (i=10 up, i=11 back): the yaw engine's
        // steady-state filter drops those 2 samples, but the Driver Coach counts the reversal — so the
        // bulk of each segment stays steady (yaw observable) AND the driver shows mid-corner corrections.
        var wob = (i === 10 ? Math.abs(steer) * 0.06 : (i === 11 ? -Math.abs(steer) * 0.06 : 0));
        rows.push([t.toFixed(3), V.toFixed(2), yaw.toFixed(6), (steer + wob).toFixed(4), ay.toFixed(4)]);
        t += dt;
      }
    });
    return 'time [s],speed [m/s],yaw_rate [rad/s],steering [deg],accy [m/s2]\n' + rows.map(function (r) { return r.join(','); }).join('\n') + '\n';
  }

  function buildTelemetrySession() {
    return {
      sessionId: 'demo_session_001',
      parsed: TC.parseCsv(buildDemoTelemetryCsv()),
      definitions: { channels: { speed: { confirmed: true, unit: 'm/s' }, yaw_rate: { confirmed: true, unit: 'rad/s' }, steering: { confirmed: true, unit: 'deg' }, lateral_accel: { confirmed: true, unit: 'm/s2' } } },
      sampleRateHz: 20,
    };
  }

  function buildDemoAnalysisCase() {
    var theCase = AC.createAnalysisCase({
      caseId: 'demo_case_001', schemaVersion: '1.0.0',
      caseMetadata: { title: 'Demo Analysis Case — synthetic F3-like', createdAt: '2026-06-21T00:00:00Z', notes: 'fully synthetic; no private data' },
      vehicleBinding: { profileId: 'demo_f3_profile', profileVersion: 'demo-v1', applicability: 'both' },
      setupSnapshot: buildSetupSnapshot(),
      telemetryBinding: {
        sessionId: 'demo_session_001', adapterId: 'csv_generic_v1', canonicalSessionSchemaVersion: '1', sourceFormat: 'csv',
        channelCapabilitySummary: { speed: 'confirmed', yawRate: 'confirmed', steeringRaw: 'confirmed', roadWheelAngle: 'unavailable', lateralAcceleration: 'confirmed' },
        qualitySummary: { sampleRateHz: 20, dropout: 'low' },
        confirmationState: { timebase: 'confirmed', steeringCalibration: 'unconfirmed' }, // no road-wheel calibration → measured K_us stays blocked
      },
      modelSnapshot: { modelId: 'dynamics-model', modelVersion: 'v1.6.0', calibrationVersion: 'baseline', canonicalContractVersion: '1.0.0', canonicalInputSnapshot: buildCanonicalInputSnapshot() },
      context: { trackProfileRef: null, weatherContext: null, sessionTyreContext: null },
    });
    return {
      analysisCase: theCase,
      telemetrySession: buildTelemetrySession(),
      window: null,
      suspensionNormalizationView: buildSuspensionNormalizationView(),
    };
  }

  // R2.6: a SEPARATE corner demo (lap + track_position + |lateral_accel| corners) — does NOT change
  // buildDemoTelemetryCsv, so existing suites stay byte-stable. Import + map + confirm → a canonical session
  // with confirmed lap/track_position, demonstrating per-corner driver coaching.
  function buildDemoCornerTelemetryCsv() {
    var G = 9.80665, RAD2DEG = 180 / Math.PI, L = 2.8;
    var gainFor = function (k, V) { var kRad = k / (G * RAD2DEG); return 1 / (L / V + kRad * V); };
    var rows = []; var t = 0;
    for (var lap = 1; lap <= 2; lap++) {
      var dist = 0; var speeds = [24, 30, 36, 42];
      for (var ci = 0; ci < speeds.length; ci++) {
        var V = speeds[ci];
        for (var sgn = 0; sgn < 24; sgn++) { rows.push([t.toFixed(3), V.toFixed(2), '0.001', '0.002', '0.05', dist.toFixed(1), lap]); dist += V * 0.05; t += 0.05; }
        var st = (ci % 2 ? -0.05 : 0.05);
        for (var i = 0; i < 18; i++) { var stj = st * (1 + 0.01 * Math.sin(i)); var yj = gainFor(2, V) * stj; rows.push([t.toFixed(3), V.toFixed(2), yj.toFixed(5), stj.toFixed(5), (yj * V).toFixed(5), dist.toFixed(1), lap]); dist += V * 0.05; t += 0.05; }
      }
    }
    return 'time [s],speed [m/s],yaw_rate [rad/s],steering,lateral_accel [m/s2],track_position [m],lap\n' + rows.map(function (r) { return r.join(','); }).join('\n') + '\n';
  }

  var api = { buildDemoAnalysisCase: buildDemoAnalysisCase, buildCanonicalInputSnapshot: buildCanonicalInputSnapshot, buildDemoTelemetryCsv: buildDemoTelemetryCsv, buildDemoCornerTelemetryCsv: buildDemoCornerTelemetryCsv, buildTelemetrySession: buildTelemetrySession };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.DemoAnalysisCase = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
