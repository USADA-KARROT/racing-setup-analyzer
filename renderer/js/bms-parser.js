/**
 * bms-parser.js — DarabImporter (.bmsbin) telemetry channel-catalog reader (clean-room)
 *
 * Reads the channel table of a Bosch-Motorsport "Darab" .bmsbin export (e.g. MS5.8 ECU logs):
 * the file header plus the length-prefixed channel definitions (name / source / description).
 * Structure observed: header "DarabImporter v…", then repeated entries delimited by a
 * length-prefixed "TrackInfo" token, each followed by 1–3 length-prefixed strings
 * (channel name, optional source e.g. "MS5.8", optional description).
 *
 * This lists WHAT is in a log (incl. accx/accy, yaw, steer, speed, wheel speeds, dampers…).
 * Extracting the sample time-series + physical scaling is a separate, larger step.
 * The user supplies their own .bmsbin at runtime — nothing is bundled with the app.
 */

function _u16le(b, i) { return b[i] | (b[i + 1] << 8); }

/** Header: returns { importer, valid }. bytes = Uint8Array | Buffer. */
function parseBmsHeader(bytes) {
  let s = '';
  for (let i = 0; i < 40 && bytes[i] >= 0x20 && bytes[i] < 0x7f; i++) s += String.fromCharCode(bytes[i]);
  return { importer: s.trim(), valid: /Darab/i.test(s) };
}

/** Extract [u16 len][printable…\0] tokens in order (scans up to maxBytes). */
function _readLenStrings(bytes, maxBytes) {
  const out = [];
  const n = Math.min(bytes.length, maxBytes || bytes.length);
  for (let i = 0; i + 2 < n;) {
    const len = _u16le(bytes, i);
    if (len >= 2 && len <= 128 && i + 2 + len <= n && bytes[i + 2 + len - 1] === 0) {
      let ok = true, str = '';
      for (let j = 0; j < len - 1; j++) {       // last byte is the null terminator
        const c = bytes[i + 2 + j];
        if (c < 0x20 || c > 0x7e) { ok = false; break; }
        str += String.fromCharCode(c);
      }
      if (ok && str.length >= 2) { out.push(str); i += 2 + len; continue; }
    }
    i++;
  }
  return out;
}

/**
 * Channel catalog: array of { name, source, description }.
 * @param bytes   Uint8Array | Buffer of the .bmsbin
 * @param maxBytes scan window (default 8 MB — the channel table sits at the start)
 */
function parseBmsCatalog(bytes, maxBytes = 8 * 1024 * 1024) {
  const toks = _readLenStrings(bytes, maxBytes);
  const channels = [];
  let cur = null;
  for (const s of toks) {
    if (s === 'TrackInfo') { if (cur && cur.name) channels.push(cur); cur = { name: null, source: null, description: null }; continue; }
    if (!cur) continue;
    if (cur.name === null) cur.name = s;
    else if (cur.source === null) cur.source = s;
    else if (cur.description === null) cur.description = s;
  }
  if (cur && cur.name) channels.push(cur);
  const seen = new Set(), uniq = [];
  for (const c of channels) { if (!seen.has(c.name)) { seen.add(c.name); uniq.push(c); } }
  return uniq;
}

/** Convenience: header + catalog + a flag for the key validation channels. */
function parseBms(bytes, maxBytes) {
  const header = parseBmsHeader(bytes);
  const channels = parseBmsCatalog(bytes, maxBytes);
  const names = channels.map(c => (c.name || '').toLowerCase());
  const has = (re) => names.some(n => re.test(n));
  const validation = {
    lateral_accel: has(/^accy$|lat.*accel/), longitudinal_accel: has(/^accx$|long.*accel/),
    yaw_rate: has(/yaw/), steering: has(/steer/), speed: has(/^speed$/),
    wheel_speeds: has(/^vwheel/), dampers: has(/damper/),
  };
  return { header, channelCount: channels.length, channels, validationChannels: validation };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseBmsHeader, parseBmsCatalog, parseBms };
}
