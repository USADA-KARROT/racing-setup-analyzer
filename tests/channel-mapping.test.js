'use strict';
const CM = require('../renderer/js/channel-mapping.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const raw = [{ rawColumnId: 0, rawName: 'time', rawUnit: 's' }, { rawColumnId: 1, rawName: 'speed', rawUnit: 'm/s' }, { rawColumnId: 2, rawName: 'col_x', rawUnit: 'deg/s' }, { rawColumnId: 3, rawName: 'accy', rawUnit: 'm/s2' }];

// user can assign an UNKNOWN raw name (col_x) to a canonical channel (mapChannels couldn't)
(() => {
  const m = CM.buildChannelMapping(raw, [{ rawColumnId: 2, canonicalChannel: 'yaw_rate', userConfirmed: true }]);
  chk('manual assign unknown name', m.ok === true && m.mappingEntries.length === 1 && m.mappingEntries[0].canonicalChannel === 'yaw_rate');
  chk('identity projection default', m.entries[0].scale === 1 && m.entries[0].offset === 0 && m.entries[0].sign === 1);
  chk('userConfirmed → confirmed status', m.entries[0].identityStatus === 'confirmed' && m.entries[0].userConfirmed === true);
})();
// duplicate canonical / column reported as ambiguity
(() => {
  const m = CM.buildChannelMapping(raw, [{ rawColumnId: 1, canonicalChannel: 'speed', userConfirmed: true }, { rawColumnId: 3, canonicalChannel: 'speed', userConfirmed: true }]);
  chk('duplicate canonical reported', m.ambiguities.some(a => a.code === 'DUPLICATE_CANONICAL'));
})();
// unknown canonical / column rejected
(() => {
  const m = CM.buildChannelMapping(raw, [{ rawColumnId: 99, canonicalChannel: 'speed', userConfirmed: true }, { rawColumnId: 1, canonicalChannel: 'nope', userConfirmed: true }]);
  chk('unknown column rejected', m.errors.some(e => e.code === 'ASSIGNMENT_UNKNOWN_COLUMN'));
  chk('unknown canonical rejected', m.errors.some(e => e.code === 'ASSIGNMENT_UNKNOWN_CANONICAL'));
})();
// auto-suggest for unassigned
(() => {
  const m = CM.buildChannelMapping(raw, []);
  chk('auto-suggest speed', m.suggestions.some(s => s.canonicalChannel === 'speed' && s.identityStatus === 'auto_detected'));
  chk('suggestions not userConfirmed', m.suggestions.every(s => s.userConfirmed === false));
})();
console.log(`channel-mapping: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
