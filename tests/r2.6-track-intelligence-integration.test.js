/**
 * tests/r2.6-track-intelligence-integration.test.js — R2.6: lap/corner segmentation + per-corner driver
 * coaching through the SAME runAnalysisWorkspace orchestrator + view model + closed export. Re-derives
 * confirmed-channel eligibility (never trusts presence flags); fail-closed without track_position / lap.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const IA = require('../renderer/js/telemetry-import-adapter.js');
const CM = require('../renderer/js/channel-mapping.js');
const CTS = require('../renderer/js/canonical-telemetry-session.js');
const WS = require('../renderer/js/analysis-workspace.js');
const VM = require('../renderer/js/analysis-workspace-viewmodel.js');
const EX = require('../renderer/js/analysis-case-export.js');
const DEMO = require('../renderer/js/demo-analysis-case.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'r26' });
const runner = (p) => new ctx.__h.Tier1BasicBalance(p).calculate();
const demoCase = () => DEMO.buildDemoAnalysisCase().analysisCase;
const CANON = ['time', 'speed', 'yaw_rate', 'steering', 'lateral_accel', 'track_position', 'lap'];
function cornerSession(confirmFn) {
  const imp = IA.importTelemetry({ format: 'csv', text: DEMO.buildDemoCornerTelemetryCsv() }, { dataProvenance: 'synthetic' });
  const assigns = imp.rawChannels.map((c, i) => ({ rawColumnId: i, canonicalChannel: CANON[i], userConfirmed: confirmFn ? confirmFn(CANON[i]) : true }));
  return CTS.buildCanonicalSession(imp, CM.buildChannelMapping(imp.rawChannels, assigns), [], { startTime: 0, endTime: 99999 }, { sessionId: 'corner_demo' });
}

// ── 1) full chain via the SAME orchestrator → corner coaching ──
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase(), cornerSession(), null, { modelRunner: runner });
  chk('same orchestrator: model ran', ws.execution.valid === true);
  chk('trackIntelligence eligible', ws.trackIntelligence && ws.trackIntelligence.eligible === true, ws.trackIntelligence && ws.trackIntelligence.blockedReasons);
  chk('capability cornerCoachingEligible', ws.capability.cornerCoachingEligible === true);
  chk('capability track/lap confirmed (re-derived)', ws.capability.trackPositionConfirmed === true && ws.capability.lapSegmentationConfirmed === true);
  chk('lapCount = 2', ws.trackIntelligence.lapCount === 2);
  chk('corners present', ws.trackIntelligence.corners.length >= 4);
  chk('credibility Heuristic', ws.trackIntelligence.credibility === 'Heuristic');
  chk('driver-behaviour-not-setup limitation', ws.trackIntelligence.limitations.indexOf('driver_behaviour_not_a_corner_or_setup_finding') !== -1);
})();

// ── 2) view model surfaces the corner cards + capability rows ──
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase(), cornerSession(), null, { modelRunner: runner });
  const v = VM.buildAnalysisWorkspaceViewModel(ws, demoCase(), {});
  chk('viewmodel: trackIntelligence available', v.trackIntelligence.available === true);
  const card = v.trackIntelligence.corners[0];
  chk('viewmodel: corner card phases', !!card.entry && !!card.mid && !!card.exit && card.confidence === 'low');
  chk('viewmodel: capability rows include corner coaching', v.capabilitySummary.some(r => r.key === 'cornerCoachingEligible') && v.capabilitySummary.some(r => r.key === 'trackPositionConfirmed'));
})();

// ── 3) no track position / lap (the regular demo telemetry) → fail-closed, inspectable ──
(() => {
  const demo = DEMO.buildDemoAnalysisCase();
  const ws = WS.runAnalysisWorkspace(demo.analysisCase, demo.telemetrySession, demo.window, { modelRunner: runner });
  chk('no track/lap: cornerCoachingEligible false', ws.capability.cornerCoachingEligible === false);
  chk('no track/lap: trackIntelligence blocked', ws.trackIntelligence.eligible === false && ws.trackIntelligence.blockedReasons.length >= 1);
  chk('no track/lap: directional analysis still works (orchestrator intact)', ws.observation.valid === true);
})();

// ── 4) re-derived gate: track_position MAPPED but not user-confirmed → blocked ──
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase(), cornerSession((c) => c !== 'track_position'), null, { modelRunner: runner });
  chk('unconfirmed track_position → cornerCoachingEligible false', ws.capability.cornerCoachingEligible === false);
  chk('unconfirmed track_position → NO_TRACK_POSITION', ws.trackIntelligence.blockedReasons.some(b => b.code === 'NO_TRACK_POSITION'));
  chk('unconfirmed track_position → trackPositionConfirmed false (re-derived, not presence)', ws.capability.trackPositionConfirmed === false);
})();

// ── 5) closed export round-trip with the trackIntelligence section ──
(() => {
  const ws = WS.runAnalysisWorkspace(demoCase(), cornerSession(), null, { modelRunner: runner });
  const r = EX.exportAnalysisCase({ meta: {}, trackIntelligence: ws.trackIntelligence, capability: ws.capability });
  chk('export: trackIntelligence + capability accepted (closed)', r.ok === true, r.errors);
  const p = EX.parseAnalysisCaseExport(JSON.stringify(r.bundle));
  chk('export: round-trips', p.ok === true);
  chk('export: no raw sample arrays leaked', JSON.stringify(r.bundle).indexOf('"values"') === -1);
  chk('export: still rejects an unknown trackIntelligence key', EX.exportAnalysisCase({ meta: {}, trackIntelligence: Object.assign({}, ws.trackIntelligence, { secret: true }) }).ok === false);
  const wsBlocked = WS.runAnalysisWorkspace(demoCase(), cornerSession((c) => c !== 'lap'), null, { modelRunner: runner });
  chk('export: a BLOCKED trackIntelligence also round-trips (closed)', EX.exportAnalysisCase({ meta: {}, trackIntelligence: wsBlocked.trackIntelligence }).ok === true, wsBlocked.trackIntelligence.blockedReasons);
})();

console.log(`r2.6-track-intelligence-integration: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
