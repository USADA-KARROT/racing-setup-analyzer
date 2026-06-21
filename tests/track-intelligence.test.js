/**
 * tests/track-intelligence.test.js — R2.6: lap/corner segmentation + per-corner driver-behaviour coaching.
 * Re-derives confirmed-channel eligibility from mappingEntries (never trusts observation presence flags),
 * fail-closed without track_position / lap / steering, per-phase confidence ≤ low, credibility Heuristic.
 */
'use strict';
const IA = require('../renderer/js/telemetry-import-adapter.js');
const CM = require('../renderer/js/channel-mapping.js');
const CTS = require('../renderer/js/canonical-telemetry-session.js');
const OBS = require('../renderer/js/telemetry-observation.js');
const TI = require('../renderer/js/track-intelligence.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

const G = 9.80665, RAD2DEG = 180 / Math.PI, L = 2.8;
const gainFor = (k, V) => { const kRad = k / (G * RAD2DEG); return 1 / (L / V + kRad * V); };
const CANON = ['time', 'speed', 'yaw_rate', 'steering', 'lateral_accel', 'track_position', 'lap'];
// 2 laps × 4 corners; long low-lateral straights so the data-adaptive corner threshold sits at the floor.
function buildCornerCsv(opts) {
  opts = opts || {};
  const rows = ['time [s],speed [m/s],yaw_rate [rad/s],steering,lateral_accel [m/s2],track_position [m],lap']; let t = 0;
  for (let lap = 1; lap <= 2; lap++) {
    let dist = 0; const speeds = [24, 30, 36, 42];
    speeds.forEach((V, ci) => {
      for (let i = 0; i < 24; i++) { rows.push([t.toFixed(3), V.toFixed(2), '0.001', '0.002', '0.05', dist.toFixed(1), lap].join(',')); dist += V * 0.05; t += 0.05; }
      const st = (ci % 2 ? -0.05 : 0.05) * (opts.elevated ? 1 : 1);
      for (let i = 0; i < 18; i++) {
        const jitter = opts.elevated ? 0.4 * Math.sin(i * 2.0) : 0.01 * Math.sin(i);
        const stj = st * (1 + jitter); const yj = gainFor(2, V) * stj;
        rows.push([t.toFixed(3), V.toFixed(2), yj.toFixed(5), stj.toFixed(5), (yj * V).toFixed(5), dist.toFixed(1), lap].join(',')); dist += V * 0.05; t += 0.05;
      }
    });
  }
  return rows.join('\n');
}
function buildFlatCsv() { // confirmed channels but NO corners (low lateral throughout)
  const rows = ['time [s],speed [m/s],yaw_rate [rad/s],steering,lateral_accel [m/s2],track_position [m],lap']; let t = 0, dist = 0;
  for (let i = 0; i < 200; i++) { rows.push([t.toFixed(3), '30.0', '0.001', '0.002', '0.05', dist.toFixed(1), '1'].join(',')); dist += 1.5; t += 0.05; }
  return rows.join('\n');
}
function sessionFrom(csv, confirmFn) {
  const imp = IA.importTelemetry({ format: 'csv', text: csv }, { dataProvenance: 'synthetic' });
  const assigns = imp.rawChannels.map((c, i) => ({ rawColumnId: i, canonicalChannel: CANON[i], userConfirmed: confirmFn ? confirmFn(CANON[i]) : true }));
  const mapping = CM.buildChannelMapping(imp.rawChannels, assigns);
  const sess = CTS.buildCanonicalSession(imp, mapping, [], { startTime: 0, endTime: 99999 }, { sessionId: 'ti' });
  return { sess, obs: OBS.observeTelemetry(sess, null, {}) };
}

// ── eligible: full chain → corners ──
(() => {
  const { sess, obs } = sessionFrom(buildCornerCsv());
  const ti = TI.deriveTrackIntelligence(sess, obs, {}, {});
  chk('eligible', ti.eligible === true, ti.blockedReasons);
  chk('confirmed flags re-derived true', ti.trackPositionConfirmed === true && ti.lapSegmentationConfirmed === true && ti.steeringConfirmed === true);
  chk('lapCount = 2', ti.lapCount === 2, ti.lapCount);
  chk('corners detected (≥4)', ti.corners.length >= 4, ti.corners.length);
  chk('credibility Heuristic', ti.credibility === 'Heuristic');
  chk('provenance synthetic', ti.dataProvenance === 'synthetic');
  const c = ti.corners[0];
  chk('corner has entry/mid/exit phases', !!c.entry && !!c.mid && !!c.exit);
  chk('phase confidence ≤ low', c.entry.confidence === 'low' && c.confidence === 'low');
  chk('phase qualitative present (sufficient samples)', c.entry.sufficient === true && typeof c.entry.qualitative === 'string');
  chk('raw-steering note on phase', c.entry.note === 'raw_steering_input_not_road_wheel_angle');
  chk('trackPosRange + timeRange present', Array.isArray(c.trackPosRange) && Array.isArray(c.timeRange));
  chk('limitations: driver-behaviour-not-setup + provenance', ti.limitations.indexOf('driver_behaviour_not_a_corner_or_setup_finding') !== -1 && ti.limitations.indexOf('data_provenance_synthetic') !== -1);
  chk('corners bounded ≤ MAX_CORNERS', ti.corners.length <= TI.DEFAULTS.MAX_CORNERS);
})();

// ── elevated corrections detected qualitatively ──
(() => {
  const { sess, obs } = sessionFrom(buildCornerCsv({ elevated: true }));
  const ti = TI.deriveTrackIntelligence(sess, obs, {}, {});
  const anyElevated = ti.corners.some(c => [c.entry, c.mid, c.exit].some(p => p.qualitative === 'elevated_secondary_corrections'));
  chk('elevated corrections flagged in some phase', ti.eligible === true && anyElevated, ti.corners.map(c => [c.entry.qualitative, c.mid.qualitative, c.exit.qualitative]));
})();

// ── re-derived gate: unconfirmed track_position → blocked (presence flag would say available) ──
(() => {
  const { sess, obs } = sessionFrom(buildCornerCsv(), (c) => c !== 'track_position'); // track_position mapped but NOT confirmed
  chk('observation presence flag still true (mapped)', obs.driverInputs && obs.driverInputs.trackPositionAvailable === true);
  const ti = TI.deriveTrackIntelligence(sess, obs, {}, {});
  chk('unconfirmed track_position → blocked (re-derived gate)', ti.eligible === false && ti.blockedReasons.some(b => b.code === 'NO_TRACK_POSITION'));
  chk('blocked → trackPositionConfirmed false', ti.trackPositionConfirmed === false);
  chk('cannotConclude lists the reason', ti.cannotConclude.indexOf('per_corner_attribution_no_track_position') !== -1);
})();

// ── no lap channel confirmed → NO_LAP_SEGMENTATION ──
(() => {
  const { sess, obs } = sessionFrom(buildCornerCsv(), (c) => c !== 'lap');
  const ti = TI.deriveTrackIntelligence(sess, obs, {}, {});
  chk('unconfirmed lap → NO_LAP_SEGMENTATION', ti.eligible === false && ti.blockedReasons.some(b => b.code === 'NO_LAP_SEGMENTATION'));
})();

// ── no steering confirmed → NO_STEERING_CHANNEL ──
(() => {
  const { sess, obs } = sessionFrom(buildCornerCsv(), (c) => c !== 'steering');
  const ti = TI.deriveTrackIntelligence(sess, obs, {}, {});
  chk('unconfirmed steering → NO_STEERING_CHANNEL', ti.eligible === false && ti.blockedReasons.some(b => b.code === 'NO_STEERING_CHANNEL'));
})();

// ── confirmed channels but no corners → NO_CORNERS_DETECTED (channels confirmed, not eligible) ──
(() => {
  const { sess, obs } = sessionFrom(buildFlatCsv());
  const ti = TI.deriveTrackIntelligence(sess, obs, {}, {});
  chk('flat session → NO_CORNERS_DETECTED', ti.eligible === false && ti.blockedReasons.some(b => b.code === 'NO_CORNERS_DETECTED'));
  chk('flat session → channels still confirmed', ti.trackPositionConfirmed === true && ti.lapSegmentationConfirmed === true);
})();

// ── non-canonical session → blocked ──
(() => {
  const ti = TI.deriveTrackIntelligence({ kind: 'legacy' }, { valid: true }, {}, {});
  chk('non-canonical → NOT_CANONICAL_SESSION', ti.eligible === false && ti.blockedReasons.some(b => b.code === 'NOT_CANONICAL_SESSION'));
})();

// ── determinism + never throws + no mutation ──
(() => {
  const { sess, obs } = sessionFrom(buildCornerCsv());
  const before = JSON.stringify(sess);
  const a = TI.deriveTrackIntelligence(sess, obs, {}, {});
  const b = TI.deriveTrackIntelligence(sess, obs, {}, {});
  chk('deterministic', JSON.stringify(a) === JSON.stringify(b));
  chk('does not mutate session', JSON.stringify(sess) === before);
  let threw = false; try { TI.deriveTrackIntelligence({ kind: 'canonical_telemetry_session', mappingEntries: null, channels: null }, null, {}, {}); } catch (e) { threw = true; }
  chk('garbage → no throw, blocked', threw === false);
})();

// CP2 fix: a CONFIRMED but all-null track_position is blocked (data gate), not eligible with [null,null] ranges
(() => {
  const me = ['time','speed','yaw_rate','steering','lateral_accel','track_position','lap'].map((c,i)=>({rawColumnId:i,canonicalChannel:c,userConfirmed:true,projection:{scale:1,offset:0,sign:1}}));
  const N=30, arr=(v)=>Array.from({length:N},()=>v);
  const ch={time:{values:Array.from({length:N},(_,i)=>i*0.05)},speed:{values:arr(30)},yaw_rate:{values:arr(0.1)},steering:{values:arr(0.05)},lateral_accel:{values:arr(6)},track_position:{values:arr(null)},lap:{values:arr(1)}};
  const sess={kind:'canonical_telemetry_session',mappingEntries:me,channels:ch,time:ch.time.values,dataProvenance:'synthetic'};
  const ti = TI.deriveTrackIntelligence(sess,{valid:true},{},{});
  chk('null track_position → INSUFFICIENT_TRACK_POSITION_DATA', ti.eligible===false && ti.blockedReasons.some(b=>b.code==='INSUFFICIENT_TRACK_POSITION_DATA'));
})();
// CP2 fix: the driver-behaviour framing limitation is ALWAYS present, even when blocked
(() => {
  const { sess, obs } = sessionFrom(buildCornerCsv(), (c) => c !== 'lap'); // blocked (no lap)
  const ti = TI.deriveTrackIntelligence(sess, obs, {}, {});
  chk('blocked result carries framing limitation', ti.eligible===false && ti.limitations.indexOf('driver_behaviour_not_a_corner_or_setup_finding') !== -1 && ti.limitations.indexOf('raw_steering_input_not_road_wheel_angle') !== -1);
})();
// CP3 fix: MAX_CORNERS is a HARD universal cap — opts cannot raise it above 64
(() => {
  // build a canonical session with ~70 corners directly (corner=10 hi-lat samples + 6 lo-lat straight)
  const me = ['time','speed','yaw_rate','steering','lateral_accel','track_position','lap'].map((c,i)=>({rawColumnId:i,canonicalChannel:c,userConfirmed:true,projection:{scale:1,offset:0,sign:1}}));
  const time=[],speed=[],yaw=[],steer=[],latv=[],tp=[],lapv=[]; let t=0,dist=0;
  for (let k=0;k<70;k++){
    for (let i=0;i<6;i++){ time.push(t); speed.push(30); yaw.push(0.001); steer.push(0.002); latv.push(0.05); tp.push(dist); lapv.push(1); dist+=1.5; t+=0.05; }
    const st=(k%2?-0.05:0.05);
    for (let i=0;i<10;i++){ time.push(t); speed.push(30); yaw.push(0.27*st); steer.push(st); latv.push(8); tp.push(dist); lapv.push(1); dist+=1.5; t+=0.05; }
  }
  const sess={kind:'canonical_telemetry_session',mappingEntries:me,channels:{time:{values:time},speed:{values:speed},yaw_rate:{values:yaw},steering:{values:steer},lateral_accel:{values:latv},track_position:{values:tp},lap:{values:lapv}},time:time,dataProvenance:'synthetic'};
  const tiRaise = TI.deriveTrackIntelligence(sess,{valid:true},{},{ MAX_CORNERS: 100 });
  chk('opts.MAX_CORNERS=100 still capped at 64', tiRaise.eligible===true && tiRaise.corners.length === 64, tiRaise.corners.length);
  const tiLower = TI.deriveTrackIntelligence(sess,{valid:true},{},{ MAX_CORNERS: 3 });
  chk('opts.MAX_CORNERS=3 lowers the cap', tiLower.corners.length <= 3 && tiLower.corners.length >= 1, tiLower.corners.length);
})();
console.log(`track-intelligence: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
