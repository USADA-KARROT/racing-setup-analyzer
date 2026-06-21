'use strict';
const IA = require('../renderer/js/telemetry-import-adapter.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// CSV import
(() => {
  const r = IA.importTelemetry({ format: 'csv', text: 'time [s],speed [km/h],yaw_rate [deg/s]\n0,72,5\n0.05,73,5.2\n0.1,74,5.1\n' });
  chk('csv: ok', r.ok === true, r.parseErrors);
  chk('csv: 3 channels', r.rawChannels.length === 3);
  chk('csv: stable rawColumnId', r.rawChannels[0].rawColumnId === 0 && r.rawChannels[2].rawColumnId === 2);
  chk('csv: rawUnit parsed', r.rawChannels[1].rawUnit === 'km/h');
  chk('csv: sampleCount', r.sampleCount === 3);
  chk('csv: timebase present', r.timebase.hasTime === true);
})();
// duplicate header REJECTED (finding 2)
(() => {
  const r = IA.importTelemetry({ format: 'csv', text: 'time,speed,speed\n0,10,11\n0.05,12,13\n' });
  chk('dup header: rejected', r.ok === false && r.parseErrors.some(e => e.code === 'CSV_DUPLICATE_HEADER'));
})();
// malformed / empty
(() => {
  chk('empty: rejected', IA.importTelemetry({ format: 'csv', text: '' }).ok === false);
  chk('unclosed quote: rejected', IA.importTelemetry({ format: 'csv', text: 'a,b\n"x,1\n' }).ok === false);
  chk('bad format: rejected', IA.importTelemetry({ format: 'motec_binary', text: 'x' }).ok === false);
  chk('null source: rejected, no throw', IA.importTelemetry(null).ok === false);
})();
// canonical_json import
(() => {
  const obj = { schemaVersion: '1.0.0', sampleRateHz: 20, time: [0, 0.05, 0.1], channels: { speed: { values: [20, 21, 22], unit: 'm/s' }, yaw_rate: { values: [0.4, 0.41, 0.42], unit: 'rad/s' } } };
  const r = IA.importTelemetry({ format: 'canonical_json', object: obj });
  chk('json: ok', r.ok === true, r.parseErrors);
  chk('json: 2 channels', r.rawChannels.length === 2);
  chk('json: time carried', Array.isArray(r.time) && r.time.length === 3);
  const bad = IA.importTelemetry({ format: 'canonical_json', object: { schemaVersion: '1.0.0', time: [0, 1], channels: { speed: { values: [1], unit: 'm/s' } } } });
  chk('json: length mismatch rejected', bad.ok === false && bad.parseErrors.some(e => e.code === 'CANONICAL_JSON_LENGTH_MISMATCH'));
  const unk = IA.importTelemetry({ format: 'canonical_json', object: { schemaVersion: '1.0.0', time: [], channels: {}, junk: 1 } });
  chk('json: unknown top key rejected', unk.ok === false && unk.parseErrors.some(e => e.code === 'CANONICAL_JSON_UNKNOWN_KEY'));
})();
console.log(`telemetry-import-adapter: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
