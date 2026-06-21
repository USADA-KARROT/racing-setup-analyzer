'use strict';
const CTS = require('../renderer/js/canonical-telemetry-session.js');
const IA = require('../renderer/js/telemetry-import-adapter.js');
const CM = require('../renderer/js/channel-mapping.js');
const OBS = require('../renderer/js/telemetry-observation.js');
const FX = require('./fixtures/synthetic-telemetry.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

function mapped(scenario) {
  const imported = IA.importTelemetry({ format: 'csv', text: FX.syntheticYawCsv(scenario || 'understeer') });
  const byName = {}; imported.rawChannels.forEach(c => byName[c.rawName.toLowerCase()] = c.rawColumnId);
  const A = [['time', 'time'], ['speed', 'speed'], ['yaw_rate', 'yaw_rate'], ['steering', 'steering'], ['accy', 'lateral_accel']].map(p => ({ rawColumnId: byName[p[0]], canonicalChannel: p[1], userConfirmed: true }));
  return { imported, mapping: CM.buildChannelMapping(imported.rawChannels, A) };
}

// build canonical session + observe
(() => {
  const m = mapped('understeer');
  const s = CTS.buildCanonicalSession(m.imported, m.mapping, [], null, { sessionId: 'x' });
  chk('build ok', s.ok === true && CTS.isCanonicalSession(s));
  chk('channels projected', Array.isArray(s.channels.speed.values) && s.channels.speed.values.length === s.sampleCount);
  chk('mappingEntries immutable list', Array.isArray(s.mappingEntries) && s.mappingEntries.length === 5);
  const o = OBS.observeTelemetry(s, null, {});
  chk('observe understeer', o.valid === true && o.observedTendency === 'understeer_tendency', o.blockedReasons);
})();

// COERCE EQUIVALENCE: legacy {parsed,definitions} observation === coerced canonical session observation
(() => {
  const sess = FX.buildSession(FX.syntheticYawCsv('understeer'));
  const legacy = OBS.observeTelemetry({ parsed: sess.parsed, definitions: sess.definitions }, null, {});
  const coerced = CTS.coerceLegacySession({ parsed: sess.parsed, definitions: sess.definitions }, null);
  const viaCanon = OBS.observeTelemetry(coerced, null, {});
  chk('coerce: same tendency', legacy.observedTendency === viaCanon.observedTendency, [legacy.observedTendency, viaCanon.observedTendency]);
  chk('coerce: same relativeChange (byte)', legacy.evidence.relativeChange === viaCanon.evidence.relativeChange, [legacy.evidence.relativeChange, viaCanon.evidence.relativeChange]);
  chk('coerce: same confidence', legacy.confidence === viaCanon.confidence);
})();

// structural validation: a post-build length mismatch fails closed
(() => {
  const m = mapped('understeer');
  const s = CTS.buildCanonicalSession(m.imported, m.mapping, [], null, {});
  s.channels.speed.values = s.channels.speed.values.slice(0, 5); // tamper
  const o = OBS.observeTelemetry(s, null, {});
  chk('tampered length → malformed blocked', o.valid === false && o.blockedReasons.some(b => b.code === 'MALFORMED_CANONICAL_SESSION'));
})();

// sign projection is sign-agnostic for directional (flipping steering sign keeps understeer)
(() => {
  const imported = IA.importTelemetry({ format: 'csv', text: FX.syntheticYawCsv('understeer') });
  const byName = {}; imported.rawChannels.forEach(c => byName[c.rawName.toLowerCase()] = c.rawColumnId);
  const A = [['time', 'time', 1], ['speed', 'speed', 1], ['yaw_rate', 'yaw_rate', 1], ['steering', 'steering', -1], ['accy', 'lateral_accel', 1]].map(p => ({ rawColumnId: byName[p[0]], canonicalChannel: p[1], userConfirmed: true, sign: p[2] }));
  const s = CTS.buildCanonicalSession(imported, CM.buildChannelMapping(imported.rawChannels, A), [], null, {});
  const o = OBS.observeTelemetry(s, null, {});
  chk('sign-flipped steering still understeer (sign-agnostic)', o.observedTendency === 'understeer_tendency', o.observedTendency);
})();
console.log(`canonical-telemetry-session: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
