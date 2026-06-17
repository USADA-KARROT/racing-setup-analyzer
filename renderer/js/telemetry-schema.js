/**
 * telemetry-schema.js — canonical telemetry channel vocabulary + mapping (Phase 3A)
 *
 * Source-agnostic mapping from a log's raw channel names to canonical names the model
 * cares about. Pure data + matching; it does NOT decode samples, scaling, or units.
 * Used by telemetry-metadata.js to describe an imported .bmsbin honestly (catalog only).
 *
 * Each canonical channel maps to an ordered list of patterns; the FIRST raw channel that
 * matches wins, and we keep the matched raw name (not just a boolean) so the UI can show
 * "lateral_accel ← accy".
 */

const TELEMETRY_CHANNEL_PATTERNS = {
  lateral_accel:      [/^accy$/i, /lat.*acc/i],
  longitudinal_accel: [/^accx$/i, /long.*acc/i],
  yaw_rate:           [/yaw/i],
  steering:           [/steer/i],
  speed:              [/^speed$/i, /vehicle.*speed/i, /car.?speed/i],
  wheel_speed_fl:     [/vwheel.*fl/i, /wheel.*speed.*fl/i],
  wheel_speed_fr:     [/vwheel.*fr/i, /wheel.*speed.*fr/i],
  wheel_speed_rl:     [/vwheel.*rl/i, /wheel.*speed.*rl/i],
  wheel_speed_rr:     [/vwheel.*rr/i, /wheel.*speed.*rr/i],
  damper_fl:          [/damper.*fl/i, /trvdam.*fl/i],
  damper_fr:          [/damper.*fr/i, /trvdam.*fr/i],
  damper_rl:          [/damper.*rl/i, /trvdam.*rl/i],
  damper_rr:          [/damper.*rr/i, /trvdam.*rr/i],
  ride_height_front:  [/r_h.*front/i, /ride.*height.*front/i],
  ride_height_rear:   [/r_h.*(rear|rl|rr)/i, /ride.*height.*(rear|rl|rr)/i],
};

// Channels needed before a model-vs-actual handling correlation is even attemptable.
const TELEMETRY_REQUIRED_FOR_CORRELATION = ['lateral_accel', 'yaw_rate', 'steering', 'speed'];

/** Pull raw channel name strings out of a catalog (array of {name} or array of strings). */
function _channelNames(channels) {
  if (!Array.isArray(channels)) return [];
  return channels.map(c => (typeof c === 'string' ? c : (c && c.name) || '')).filter(Boolean);
}

/**
 * Map a channel catalog to canonical channels.
 * @returns { canonicalName: { present: boolean, rawName: string|null } }
 */
function mapTelemetryChannels(channels) {
  const names = _channelNames(channels);
  const out = {};
  for (const canon of Object.keys(TELEMETRY_CHANNEL_PATTERNS)) {
    const pats = TELEMETRY_CHANNEL_PATTERNS[canon];
    let raw = null;
    for (const n of names) { if (pats.some(re => re.test(n))) { raw = n; break; } }
    out[canon] = { present: raw !== null, rawName: raw };
  }
  return out;
}

/**
 * Per-channel descriptor (Phase 3A: only the catalog identity is known — every numeric
 * field stays null until 3B decodes samples).
 */
function telemetryChannelDescriptor(canonicalName, rawName) {
  return {
    rawName: rawName || null,
    canonicalName,
    unit: null,
    sampleRateHz: null,
    scale: null,
    offset: null,
    sampleCount: null,
    confidence: rawName ? 'detected' : 'unknown', // detected = in catalog; not yet decoded
    notes: [],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TELEMETRY_CHANNEL_PATTERNS, TELEMETRY_REQUIRED_FOR_CORRELATION,
    mapTelemetryChannels, telemetryChannelDescriptor,
  };
}
