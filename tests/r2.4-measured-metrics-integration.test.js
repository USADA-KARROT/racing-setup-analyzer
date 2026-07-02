/**
 * tests/r2.4-measured-metrics-integration.test.js — R2.4: calibrated telemetry → MEASURED K_us through the
 * SAME runAnalysisWorkspace orchestrator. Synthetic telemetry encodes a known understeer gradient (K=2 deg/g,
 * L=2.8 m); with a verified, session-applicable, binding-matched steering ratio the chain recovers it; without
 * calibration (or with a stale/other-session/conflicting one) the magnitude is fail-closed while the
 * directional layer is byte-identical (calibration-independent).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const IA = require('../renderer/js/telemetry-import-adapter.js');
const CM = require('../renderer/js/channel-mapping.js');
const CR = require('../renderer/js/calibration-registry.js');
const CTS = require('../renderer/js/canonical-telemetry-session.js');
const WS = require('../renderer/js/analysis-workspace.js');
const VM = require('../renderer/js/analysis-workspace-viewmodel.js');
const DEMO = require('../renderer/js/demo-analysis-case.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'r24' });
const runner = (p) => new ctx.__h.Tier1BasicBalance(p).calculate();
const demoCase = DEMO.buildDemoAnalysisCase().analysisCase; // wheelbase 2.8 m, predicted K_us ≈ 0.51 deg/g

// synthetic telemetry for a known K_us = 2 deg/g at L = 2.8 m; raw steering IS road-wheel radians (ratio = 1)
const G = 9.80665, RAD2DEG = 180 / Math.PI, L = 2.8;
const gainFor = (kDegg, V) => { const kRad = kDegg / (G * RAD2DEG); return 1 / (L / V + kRad * V); };
function buildSyntheticCsv(kDegg) {
  const speeds = [18, 24, 30, 36, 42]; const dt = 0.05;
  const rows = ['time [s],speed [m/s],yaw_rate [rad/s],steering,lateral_accel [m/s2]']; let t = 0;
  speeds.forEach((V) => { [0.05, -0.05, 0.055, -0.055].forEach((st) => { const y = gainFor(kDegg, V) * st; for (let i = 0; i < 20; i++) { rows.push([t.toFixed(3), V.toFixed(3), y.toFixed(5), st.toFixed(5), (y * V).toFixed(5)].join(',')); t += dt; } }); });
  return rows.join('\n');
}
const imported = IA.importTelemetry({ format: 'csv', text: buildSyntheticCsv(2) }, { dataProvenance: 'synthetic' });
const assigns = [0, 1, 2, 3, 4].map((id, i) => ({ rawColumnId: id, canonicalChannel: ['time', 'speed', 'yaw_rate', 'steering', 'lateral_accel'][i], userConfirmed: true }));
const mapping = CM.buildChannelMapping(imported.rawChannels, assigns);
const SIG = CM.projectionSignature({ scale: 1, offset: 0, sign: 1 });
const BIND = { rawColumnId: 3, projectionSignature: SIG };
const T = CR.CALIBRATION_TYPE;
function steeringCals(o) { o = o || {}; const bind = o.binding || BIND; const sessions = o.sessions; const ratio = o.ratio !== undefined ? o.ratio : 1; const base = (ty, value) => ({ calibrationType: ty, value: value, source: 'rig', confidence: 'high', verified: true, createdAt: '2026-06-21T00:00:00Z', channelBinding: bind, applicableSessionIds: sessions }); const out = [base(T.STEERING_SIGN), base(T.STEERING_ZERO), base(T.STEERING_RATIO, ratio)]; if (o.extraRatio !== undefined) out.push(base(T.STEERING_RATIO, o.extraRatio)); return out; }
const session = (cals, sessId) => CTS.buildCanonicalSession(imported, mapping, cals || [], { startTime: 0, endTime: 9999 }, { sessionId: sessId || 's1' });

// ── 1) full chain WITH calibration → measured K_us ≈ 2 via runAnalysisWorkspace ──
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase, session(steeringCals()), null, { modelRunner: runner });
  chk('same orchestrator: workspace ran', ws.execution.valid === true && ws.observation.valid === true);
  chk('calibratedMagnitude attached', !!ws.observation.calibratedMagnitude && ws.observation.calibratedMagnitude.bins.length >= 3, ws.observation.calibratedMagnitude);
  chk('capability calibratedMagnitudeEligible', ws.capability.calibratedMagnitudeEligible === true);
  chk('capability measuredKUsEligible', ws.capability.measuredKUsEligible === true);
  const mc = ws.comparison.magnitudeComparison;
  chk('measured K_us available', mc.available === true, mc);
  chk('measured K_us ≈ 2', Math.abs(mc.measuredKUsDegG - 2) < 0.25, mc.measuredKUsDegG);
  chk('predicted K_us surfaced', typeof mc.predictedKUsDegG === 'number');
  chk('agreement = measured_more_understeer (2 vs ~0.51)', mc.agreementClass === 'measured_more_understeer', [mc.measuredKUsDegG, mc.predictedKUsDegG, mc.agreementClass]);
  chk('credibility is the bare Measured rung', mc.credibility === 'Measured');
  chk('kinematic/confounded qualifier carried in limitations', Array.isArray(mc.limitations) && mc.limitations.indexOf('kinematic_confounded') !== -1);
  chk('provenance carried (synthetic)', mc.dataProvenance === 'synthetic');
})();

// ── 2) WITHOUT calibration → magnitude fail-closed; directional still works ──
let directionalWithoutCal;
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase, session([]), null, { modelRunner: runner });
  chk('no-cal: observation still valid (directional)', ws.observation.valid === true);
  directionalWithoutCal = ws.observation.observedTendency;
  chk('no-cal: calibratedMagnitude null', ws.observation.calibratedMagnitude === null);
  chk('no-cal: calibratedMagnitudeEligible false', ws.capability.calibratedMagnitudeEligible === false);
  chk('no-cal: measuredKUsEligible false', ws.capability.measuredKUsEligible === false);
  chk('no-cal: magnitudeComparison blocked', ws.comparison.magnitudeComparison.available === false && ws.comparison.magnitudeComparison.reason === 'calibration_or_geometry_unavailable');
})();

// ── 3) directional tendency is calibration-INDEPENDENT (identical with/without calibration) ──
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase, session(steeringCals()), null, { modelRunner: runner });
  chk('directional identical with/without calibration', ws.observation.observedTendency === directionalWithoutCal, [ws.observation.observedTendency, directionalWithoutCal]);
})();

// ── 4) STALE calibration (different projection signature) → magnitude blocked ──
(() => {
  const staleBind = { rawColumnId: 3, projectionSignature: CM.projectionSignature({ scale: 2, offset: 0, sign: 1 }) };
  const ws = WS.runAnalysisWorkspace(demoCase, session(steeringCals({ binding: staleBind })), null, { modelRunner: runner });
  chk('stale binding: calibratedMagnitudeEligible false', ws.capability.calibratedMagnitudeEligible === false);
  chk('stale binding: measuredKUsEligible false', ws.capability.measuredKUsEligible === false);
})();

// ── 5) OTHER-session calibration → magnitude blocked ──
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase, session(steeringCals({ sessions: ['other'] })), null, { modelRunner: runner });
  chk('other-session: calibratedMagnitudeEligible false', ws.capability.calibratedMagnitudeEligible === false);
})();

// ── 6) CONFLICTING ratio values → fail closed ──
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase, session(steeringCals({ ratio: 1, extraRatio: 2 })), null, { modelRunner: runner });
  chk('conflicting ratio: calibratedMagnitudeEligible false', ws.capability.calibratedMagnitudeEligible === false);
})();

// ── 7) view model Measured Metrics section reflects available / blocked ──
(() => {
  const wsCal = WS.runAnalysisWorkspace(demoCase, session(steeringCals()), null, { modelRunner: runner });
  const vCal = VM.buildAnalysisWorkspaceViewModel(wsCal, demoCase, {});
  chk('viewmodel: measuredMetrics available', vCal.measuredMetrics.available === true && Math.abs(vCal.measuredMetrics.measuredKUs.value - 2) < 0.25, vCal.measuredMetrics);
  chk('viewmodel: measured credibility tag', vCal.measuredMetrics.measuredKUs.credibility === 'Measured');
  chk('viewmodel: qualifier carried in limitations', vCal.measuredMetrics.limitations.indexOf('kinematic_confounded') !== -1);
  chk('viewmodel: capability rows include the two R2.4 flags', vCal.capabilitySummary.some(r => r.key === 'calibratedMagnitudeEligible') && vCal.capabilitySummary.some(r => r.key === 'measuredKUsEligible'));
  const wsNo = WS.runAnalysisWorkspace(demoCase, session([]), null, { modelRunner: runner });
  const vNo = VM.buildAnalysisWorkspaceViewModel(wsNo, demoCase, {});
  chk('viewmodel: measuredMetrics blocked w/o calibration', vNo.measuredMetrics.available === false && vNo.measuredMetrics.measuredKUs.value === null);
})();

// ── 8) stale-binding guard is AUTHORITATIVE: observation re-derives the steering binding from mappingEntries,
//        never trusting a forged/stale session.steeringBinding ──
(() => {
  const sess = session(steeringCals());
  sess.steeringBinding = { rawColumnId: 99, projectionSignature: 'forged' }; // forge the advisory binding to garbage
  const ws = WS.runAnalysisWorkspace(demoCase, sess, null, { modelRunner: runner });
  chk('forged s.steeringBinding ignored — measured still works (re-derived from mappingEntries)', ws.capability.measuredKUsEligible === true);
})();
(() => {
  // calibration bound to a WRONG projection signature, with session.steeringBinding forged to MATCH it →
  // observation re-derives the real binding from mappingEntries and blocks (the forged binding cannot unlock it)
  const wrongBind = { rawColumnId: 3, projectionSignature: CM.projectionSignature({ scale: 7, offset: 0, sign: 1 }) };
  const sess = session(steeringCals({ binding: wrongBind }));
  sess.steeringBinding = wrongBind; // forge advisory to match the wrong calibration
  const ws = WS.runAnalysisWorkspace(demoCase, sess, null, { modelRunner: runner });
  chk('forged binding matching a wrong calibration → still blocked', ws.capability.calibratedMagnitudeEligible === false && ws.capability.measuredKUsEligible === false);
})();

console.log(`r2.4-measured-metrics-integration: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
