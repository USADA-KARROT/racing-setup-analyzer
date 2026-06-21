'use strict';
const AW = require('../renderer/js/analysis-window.js');
const FX = require('./fixtures/synthetic-telemetry.js');
const TC = require('../renderer/js/telemetry-core.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// build a bundle from the understeer fixture
function bundle(scenario) {
  const parsed = TC.parseCsv(FX.syntheticYawCsv(scenario || 'understeer'));
  const tel = TC.columnMap(parsed);
  const col = (n, dim) => (tel.data[n] || []).map(v => v == null ? null : (dim ? TC.convertToCanonical(v, tel.units[n], dim) : v));
  return { time: col('time', 'time'), speed: col('speed', 'speed'), yawRate: col('yaw_rate', 'angular_rate'), steer: col('steering', null), lateralAccel: col('accy', 'acceleration'), steerUnit: 'deg', timebaseStatus: tel ? 'definition_confirmed' : null };
}
(() => {
  const b = bundle('understeer');
  const v = AW.validateAnalysisWindow(b, null, {});
  chk('full window valid', v.valid === true, v.rejectionReasons);
  chk('reports steady count', v.steadyStateCount > 0);
  chk('quality good/fair', ['good', 'fair'].indexOf(v.quality) !== -1);
})();
// timebase blocked → hard fail (independent of yaw)
(() => {
  const b = bundle('understeer'); b.timebaseStatus = 'blocked';
  const v = AW.validateAnalysisWindow(b, null, {});
  chk('timebase blocked → invalid', v.valid === false && v.rejectionReasons.indexOf('timebase_blocked') !== -1);
})();
// non-monotonic time → hard fail
(() => {
  const b = bundle('understeer'); b.time = b.time.slice(); b.time[50] = b.time[10];
  const v = AW.validateAnalysisWindow(b, null, {});
  chk('non-monotonic → invalid', v.valid === false && v.rejectionReasons.indexOf('timebase_non_monotonic') !== -1);
})();
// tiny window → insufficient qualifying samples (shares yaw engine)
(() => {
  const b = bundle('understeer');
  const v = AW.validateAnalysisWindow(b, { startTime: 0, endTime: 0.2 }, {});
  chk('tiny window → invalid (insufficient)', v.valid === false && v.rejectionReasons.some(r => r.indexOf('insufficient') === 0));
})();
// proposeAnalysisWindows returns candidates incl full session
(() => {
  const b = bundle('understeer');
  const cands = AW.proposeAnalysisWindows(b, {});
  chk('proposes full session', cands.some(c => c.source === 'full_session'));
})();
console.log(`analysis-window: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
