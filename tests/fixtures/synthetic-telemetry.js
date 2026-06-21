/**
 * tests/fixtures/synthetic-telemetry.js — clean-room synthetic telemetry generator (text-only, no real data).
 *
 * Builds steady-state cornering CSV at a set of speeds with a CONSTANT lateral acceleration (so the yaw
 * engine's lateral-activity filter doesn't bias toward fast/slow corners) and a DIRECTLY CONTROLLED
 * yaw_rate÷raw_steering ratio vs speed:
 *   understeer → ratio falls with speed   ·   oversteer → rises   ·   neutral → flat.
 * Each speed is a held steady segment; segment-to-segment jumps are filtered out as transients.
 */
'use strict';
const TC = require('../../renderer/js/telemetry-core.js');

const YPS = {
  understeer: (V) => 0.0034 - 0.00004 * V,  // ratio falls with speed
  oversteer: (V) => 0.0018 + 0.00004 * V,   // ratio rises with speed
  neutral: (V) => 0.0026,                    // flat
};

function syntheticYawCsv(scenario, opts) {
  opts = opts || {};
  const ay = opts.ay != null ? opts.ay : 8;              // m/s² constant lateral
  const speeds = opts.speeds || [15, 18, 21, 24, 27, 30, 33, 36, 39];
  const perSeg = opts.perSeg != null ? opts.perSeg : 22;
  const dt = opts.dt != null ? opts.dt : 0.05;
  const sign = opts.negativeSteer ? -1 : 1;             // raw-steer sign (left/right corner family)
  const ypsFn = YPS[scenario] || YPS.neutral;
  let t = 0;
  const rows = [];
  speeds.forEach((V) => {
    const yaw = sign * ay / V;                           // rad/s (sign mirrors steering direction)
    const steerDeg = yaw / ypsFn(V);                     // raw steering [deg], yields the target ratio
    for (let i = 0; i < perSeg; i++) {
      // optional deterministic steering oscillation (secondary corrections, for the Driver Coach layer)
      const wob = opts.corrections ? (((i % 4) - 1.5) * Math.abs(steerDeg) * 0.06) : 0;
      rows.push([t.toFixed(3), V.toFixed(2), yaw.toFixed(6), (steerDeg + wob).toFixed(4), (sign * ay).toFixed(4)]);
      t += dt;
    }
  });
  const header = 'time [s],speed [m/s],yaw_rate [rad/s],steering [deg],accy [m/s2]';
  return header + '\n' + rows.map((r) => r.join(',')).join('\n') + '\n';
}

// a CSV whose timebase has a GLOBAL reset (should block dynamic observation)
function timebaseResetCsv() {
  return 'time [s],speed [m/s],yaw_rate [rad/s],steering [deg],accy [m/s2]\n' +
    '0.0,20,0.4,100,8\n0.05,20,0.4,100,8\n0.10,20,0.4,100,8\n' +
    '0.0,25,0.32,90,8\n0.05,25,0.32,90,8\n0.10,25,0.32,90,8\n';  // time jumps backward → reset
}

// a CSV that additionally carries pedal + lap + track-position channels (for the Driver Coach gates)
function richChannelsCsv() {
  const header = 'time [s],speed [m/s],yaw_rate [rad/s],steering [deg],accy [m/s2],throttle [%],brake [bar],lap,lap_dist [m]';
  const rows = [];
  let t = 0; let dist = 0; let lap = 1;
  [18, 22, 26, 30, 34, 38].forEach((V) => {
    const yaw = 8 / V; const steer = yaw / 0.0026;
    for (let i = 0; i < 16; i++) {
      const wob = ((i % 4) - 1.5) * Math.abs(steer) * 0.05;
      const thr = 40 + (i % 5) * 6; const brk = i < 3 ? 5 : 0;
      dist += V * 0.05; if (dist > 1000) { dist = 0; lap++; }
      rows.push([t.toFixed(3), V.toFixed(2), yaw.toFixed(6), (steer + wob).toFixed(4), '8', thr.toFixed(1), brk.toFixed(2), String(lap), dist.toFixed(1)]);
      t += 0.05;
    }
  });
  return header + '\n' + rows.map((r) => r.join(',')).join('\n') + '\n';
}

// a CSV missing the yaw_rate channel entirely
function missingYawCsv() {
  return 'time [s],speed [m/s],steering [deg],accy [m/s2]\n' +
    '0.0,20,100,8\n0.05,22,98,8\n0.10,24,96,8\n0.15,26,94,8\n0.20,28,92,8\n';
}

const DEFINITIONS = {
  channels: {
    speed: { confirmed: true, unit: 'm/s' }, yaw_rate: { confirmed: true, unit: 'rad/s' },
    steering: { confirmed: true, unit: 'deg' }, lateral_accel: { confirmed: true, unit: 'm/s2' },
  },
};

function buildSession(csvText, sessionId, definitions) {
  return { sessionId: sessionId || 'syn_session', parsed: TC.parseCsv(csvText), definitions: definitions || DEFINITIONS };
}

module.exports = { syntheticYawCsv, timebaseResetCsv, missingYawCsv, richChannelsCsv, buildSession, DEFINITIONS, YPS };
