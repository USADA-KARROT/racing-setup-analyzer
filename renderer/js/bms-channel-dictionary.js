/**
 * bms-channel-dictionary.js — Bosch (WinDarab / Darab .bmsbin) channel dictionary
 *                              + L1 Identity / Channel-Inventory card builder.
 *
 * PURPOSE (D1-0B): map the catalog channel NAMES the parser already reads to canonical
 * diagnostic concepts, so the app can tell the user WHICH Bosch telemetry channels a file
 * contains. This is an IDENTITY / INVENTORY layer only.
 *
 * HARD RED LINES — this module NEVER:
 *   - decodes raw sample values            - produces time-series
 *   - guesses physical scaling / units     - computes Kus / model-vs-actual
 *   - draws a telemetry trace              - recommends setup from raw .bmsbin
 * It only answers "is this channel present, and what does its NAME/DESCRIPTION say it is?".
 *
 * Seed dictionary derived from REAL Bosch MS5.8 (ECU) + C60 (logger) F3 catalogs — channel
 * NAMES and Bosch-authored DESCRIPTIONS only. Clean-room: no proprietary data bundled; the
 * user supplies their own .bmsbin at runtime.
 *
 * Confidence:
 *   high    = name matches AND description clearly corroborates the concept
 *   medium  = name matches but description is missing/empty
 *   low     = inferred from name only (no corroborating description, or meaning uncertain)
 *   unknown = channel not mapped to any concept (still listed, never an error)
 */

const CONF_RANK = { unknown: 0, low: 1, medium: 2, high: 3 };
function _capConf(conf, cap) { return (CONF_RANK[conf] <= CONF_RANK[cap]) ? conf : cap; }

// Canonical concept → { names (exact, lowercase), patterns (optional regex on raw name),
//                        desc (optional regex corroborating the description),
//                        inferred (name-only, no description expected), cap (max confidence) }
const BOSCH_CHANNEL_DICTIONARY = [
  { key: 'vehicle_speed',            names: ['speed', 'vfz_w', 'vfzg', 'vcar'],            desc: [/car speed|vehicle speed/i] },
  { key: 'steering_angle',           names: ['steer', 'steerangle', 'steeringangle', 'swa'], desc: [/steering angle|steering/i] },
  { key: 'throttle',                 names: ['ath', 'aps', 'tps', 'throttle', 'rped'],     desc: [/throttle|pedal position|accelerator/i] },
  { key: 'brake_pressure_front',     names: ['pbrake_f', 'pbrakef'], patterns: [/^p_?brake_?f(ront)?$/i], desc: [/brake pressure front|front brake/i] },
  { key: 'brake_pressure_rear',      names: ['pbrake_r', 'pbraker'], patterns: [/^p_?brake_?r(ear)?$/i],  desc: [/brake pressure rear|rear brake/i] },
  { key: 'engine_rpm',               names: ['nmot', 'rpm', 'n_eng', 'engrpm'],            desc: [/engine speed|engine rpm/i] },
  { key: 'lateral_acceleration',     names: ['accy', 'ay', 'alat', 'glat'],                desc: [/lateral accel/i] },
  { key: 'longitudinal_acceleration',names: ['accx', 'ax', 'along', 'glong'],              desc: [/longitudinal accel/i] },
  { key: 'yaw_rate',                 names: ['yaw', 'yawrate', 'gyroz', 'yaw_rate'],       desc: [/yaw rate|yaw/i] },
  { key: 'wheel_speed_FL',           names: ['vwheel_fl', 'nwheel_fl', 'wspd_fl', 'vradfl'], desc: [/wheel speed front left|front left wheel/i] },
  { key: 'wheel_speed_FR',           names: ['vwheel_fr', 'nwheel_fr', 'wspd_fr', 'vradfr'], desc: [/wheel speed front right|front right wheel/i] },
  { key: 'wheel_speed_RL',           names: ['vwheel_rl', 'nwheel_rl', 'wspd_rl', 'vradrl'], desc: [/wheel speed rear left|rear left wheel/i] },
  { key: 'wheel_speed_RR',           names: ['vwheel_rr', 'nwheel_rr', 'wspd_rr', 'vradrr'], desc: [/wheel speed rear right|rear right wheel/i] },
  { key: 'lap_time',                 names: ['laptime', 'lap_time', 't_lap'],              desc: [/lap time/i] },
  { key: 'gear',                     names: ['gear', 'gearpos', 'gangi', 'ggear'],         desc: [/selected gear|gear position|^gear$/i] },
  { key: 'engine_temperature',       names: ['tmot', 't_eng', 'tengine', 'twater', 'ect'], desc: [/engine temp|coolant temp/i] },
  { key: 'oil_temperature',          names: ['toil', 't_oil', 'toilengine'],              desc: [/oil temp/i] },
  { key: 'damper_position_FL',       names: ['trvdam_fl', 'damper_fl', 'xdamp_fl'],        desc: [/damper.*front left|damper position front left/i] },
  { key: 'damper_position_FR',       names: ['trvdam_fr', 'damper_fr', 'xdamp_fr'],        desc: [/damper.*front right|damper position front right/i] },
  { key: 'damper_position_RL',       names: ['trvdam_rl', 'damper_rl', 'xdamp_rl'],        desc: [/damper.*rear left|damper position rear left/i] },
  { key: 'damper_position_RR',       names: ['trvdam_rr', 'damper_rr', 'xdamp_rr'],        desc: [/damper.*rear right|damper position rear right/i] },
  // name-only inference — no Bosch description present; do NOT over-claim physical meaning
  { key: 'ride_height',              names: ['r_h_front', 'r_h_rear', 'r_h_fl', 'r_h_fr', 'r_h_rl', 'r_h_rr'], patterns: [/^r_h_/i], inferred: true, cap: 'low' },
  { key: 'road_suspension',          names: ['road_fl', 'road_fr', 'road_rl', 'road_rr'],  patterns: [/^road_/i], inferred: true, cap: 'low' },
];

// English fallback labels (i18n keys are 'ui.bmsid.concept.<key>'; tests use these directly)
const CONCEPT_LABELS = {
  vehicle_speed: 'Vehicle speed', steering_angle: 'Steering angle', throttle: 'Throttle',
  brake_pressure_front: 'Brake pressure (front)', brake_pressure_rear: 'Brake pressure (rear)',
  engine_rpm: 'Engine RPM', lateral_acceleration: 'Lateral acceleration',
  longitudinal_acceleration: 'Longitudinal acceleration', yaw_rate: 'Yaw rate',
  wheel_speed_FL: 'Wheel speed FL', wheel_speed_FR: 'Wheel speed FR',
  wheel_speed_RL: 'Wheel speed RL', wheel_speed_RR: 'Wheel speed RR',
  lap_time: 'Lap time', gear: 'Gear', engine_temperature: 'Engine temperature',
  oil_temperature: 'Oil temperature',
  damper_position_FL: 'Damper position FL', damper_position_FR: 'Damper position FR',
  damper_position_RL: 'Damper position RL', damper_position_RR: 'Damper position RR',
  damper_position: 'Damper position (FL/FR/RL/RR)', ride_height: 'Ride height',
  road_suspension: 'Road / suspension related',
};

// Diagnostic-coverage display groups (one row each); damper rolls up its 4 corners.
const DIAGNOSTIC_COVERAGE_GROUPS = [
  { key: 'vehicle_speed', concepts: ['vehicle_speed'] },
  { key: 'steering_angle', concepts: ['steering_angle'] },
  { key: 'throttle', concepts: ['throttle'] },
  { key: 'brake_pressure_front', concepts: ['brake_pressure_front'] },
  { key: 'brake_pressure_rear', concepts: ['brake_pressure_rear'] },
  { key: 'engine_rpm', concepts: ['engine_rpm'] },
  { key: 'lateral_acceleration', concepts: ['lateral_acceleration'] },
  { key: 'longitudinal_acceleration', concepts: ['longitudinal_acceleration'] },
  { key: 'yaw_rate', concepts: ['yaw_rate'] },
  { key: 'wheel_speed_FL', concepts: ['wheel_speed_FL'] },
  { key: 'wheel_speed_FR', concepts: ['wheel_speed_FR'] },
  { key: 'wheel_speed_RL', concepts: ['wheel_speed_RL'] },
  { key: 'wheel_speed_RR', concepts: ['wheel_speed_RR'] },
  { key: 'lap_time', concepts: ['lap_time'] },
  { key: 'gear', concepts: ['gear'] },
  { key: 'engine_temperature', concepts: ['engine_temperature'] },
  { key: 'oil_temperature', concepts: ['oil_temperature'] },
  { key: 'damper_position', concepts: ['damper_position_FL', 'damper_position_FR', 'damper_position_RL', 'damper_position_RR'] },
  { key: 'ride_height', concepts: ['ride_height'] },
  { key: 'road_suspension', concepts: ['road_suspension'] },
];

// Standing honesty block surfaced on every identity card (presence-only, never values).
const BMS_IDENTITY_LIMITATIONS = {
  rawSamplesDecoded: false,
  timeSeriesAvailable: false,
  physicalScalingDecoded: false,
  unitsDecoded: false,
  presenceConfirmedOnly: true,
  exportHint: 'WinDarab CSV / MDF export',
};

/** Classify ONE channel {name, source, description} against ONE dictionary entry. */
function _classify(entry, ch) {
  const rawName = (ch && ch.name) || '';
  const name = rawName.toLowerCase();
  const desc = ((ch && ch.description) || '').trim();
  const nameHit = entry.names.indexOf(name) !== -1 || (entry.patterns || []).some(p => p.test(rawName));
  if (!nameHit) return null;
  let conf;
  if (entry.inferred) {
    conf = entry.cap || 'low';                       // name-only inference
  } else if (desc && (entry.desc || []).some(p => p.test(desc))) {
    conf = 'high';                                   // name + description agree
  } else if (!desc) {
    conf = 'medium';                                 // name matches, description missing
  } else {
    conf = 'low';                                    // name matches, description does not corroborate
  }
  if (entry.cap) conf = _capConf(conf, entry.cap);
  return conf;
}

/** Map one channel to its best canonical concept. Returns {concept, confidence} or null. */
function matchBmsChannel(ch) {
  for (const entry of BOSCH_CHANNEL_DICTIONARY) {
    const conf = _classify(entry, ch);
    if (conf) return { concept: entry.key, confidence: conf };
  }
  return null;
}

/**
 * Build the L1 "Bosch BMS Identity / Channel Inventory" card from an already-parsed bmsResult.
 * Pure / fail-closed: bad input → a card with formatDetected:null, empty coverage(all missing),
 * and every forbidden capability hard-false. Decodes nothing.
 */
function buildBmsIdentityCard(bmsResult, opts = {}) {
  const o = opts || {};
  const safe = bmsResult && typeof bmsResult === 'object';
  const header = (safe && bmsResult.header && typeof bmsResult.header === 'object') ? bmsResult.header : {};
  const headerValid = header.valid === true;
  const channels = (safe && Array.isArray(bmsResult.channels)) ? bmsResult.channels : [];

  const fileIdentity = {
    formatDetected: headerValid ? 'Bosch WinDarab / DarabImporter' : null,
    headerString: header.importer || null,
    fileName: o.fileName || (safe && bmsResult.fileName) || null,
    fileSize: (typeof o.fileSize === 'number') ? o.fileSize
      : (safe && typeof bmsResult.fileSize === 'number' ? bmsResult.fileSize : null),
    headerValid,
  };

  const sources = [];
  for (const c of channels) { const s = c && c.source; if (s && sources.indexOf(s) === -1) sources.push(s); }
  const sourceSummary = { sources, channelCount: channels.length };

  const channelInventory = channels.map(c => {
    const m = matchBmsChannel(c);
    return {
      name: (c && c.name) || '', source: (c && c.source) || '', description: (c && c.description) || '',
      concept: m ? m.concept : null,
      conceptLabel: m ? (CONCEPT_LABELS[m.concept] || m.concept) : null,
      confidence: m ? m.confidence : 'unknown',
    };
  });

  const diagnosticCoverage = DIAGNOSTIC_COVERAGE_GROUPS.map(g => {
    const matched = channelInventory.filter(i => i.concept && g.concepts.indexOf(i.concept) !== -1);
    let status = 'missing';
    if (matched.some(i => i.confidence === 'high' || i.confidence === 'medium')) status = 'found';
    else if (matched.some(i => i.confidence === 'low')) status = 'uncertain';
    return {
      key: g.key, label: CONCEPT_LABELS[g.key] || g.key, status,
      matched: matched.map(i => ({ name: i.name, confidence: i.confidence })),
    };
  });

  return {
    sourceType: 'bmsbin',
    cardVersion: 'D1-0B',
    fileIdentity,
    sourceSummary,
    diagnosticCoverage,
    channelInventory,
    limitations: Object.assign({}, BMS_IDENTITY_LIMITATIONS),
    // The ONLY capability this card grants is identity/inventory. Everything that would imply
    // decoded telemetry is hard-pinned false on every path (presence ≠ values).
    capabilities: {
      channelIdentityInventory: true,
      timeSeries: false,
      physicalValues: false,
      scaling: false,
      units: false,
      modelVsActual: false,
      kus: false,
      measuredHandlingAnalysis: false,
      setupRecommendationFromRaw: false,
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BOSCH_CHANNEL_DICTIONARY, CONCEPT_LABELS, DIAGNOSTIC_COVERAGE_GROUPS, BMS_IDENTITY_LIMITATIONS,
    matchBmsChannel, buildBmsIdentityCard,
  };
}
