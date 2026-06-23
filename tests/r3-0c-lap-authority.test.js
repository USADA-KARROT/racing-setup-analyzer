/**
 * tests/r3-0c-lap-authority.test.js — R3.0C C2 · Lap Authority service.
 *
 * Exercises the 16-fixture matrix mandated by the C2 directive (every combination of nominal /
 * sparse / gap / irregular timebase / wrap / channel-missing / synthetic / real-imported) and
 * verifies for each: descriptor satisfaction per slot, reason-code routing through the contract
 * layer, threshold-application transparency in the evidence side-channel, fail-closed behaviour
 * for malformed input, partial-channel-gating per metric, and field-calibration limitation
 * propagation.
 *
 * Oracle independence: the contract layer is required directly to derive expected reason codes;
 * the SUT is required from its renderer/js path so the same artefact the validator counts as an
 * authorized consumer is the one under test.
 */
'use strict';
const path = require('path');
const REPO = path.resolve(__dirname, '..');

const Service = require('../renderer/js/r3-0c-lap-authority.js');
const Contracts = require('../contracts/r3.0c/index.js');
const RC = Contracts.reasonCodes;
const CODES = RC.REASON_CODES;
const VL = Contracts.validLap;
const CE = Contracts.comparisonEligibility;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (res, code) => !!(res && Array.isArray(res.reasonCodes) && res.reasonCodes.indexOf(code) !== -1);

// ── nominal lap fixture builder — every fixture starts from this and mutates ONE dimension. ──
function nominalLap(over) {
  const base = {
    caseId: 'case_1', sessionId: 'sess_1', lapId: 'lap_5', sourceId: 'csv_import:foo.csv',
    provenance: 'real',
    trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
    timing: { lapStartTime: 100, lapEndTime: 160, lapTimeMs: 60000 },
    samples: { count: 600, timebaseMedianSeconds: 0.1, timebaseMaxGapSeconds: 0.15 },
    distance: {
      authority: { sourceChannel: 'lap_distance', unit: 'm', direction: 'forward', wrapSemantics: 'no_wrap', authorityStatus: 'channel_source_declared', limitations: [] },
      samples: { count: 600, normalizedMaxGap: 0.005, monotonic: true },
    },
    channelsAvailable: ['time', 'speed', 'lateral_accel', 'steering', 'throttle', 'brake', 'yaw_rate', 'lap_distance'],
  };
  return Object.assign(base, over || {});
}

// ── A. constants ──
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 CHECKPOINT_FLOOR === C2_LAP_AUTHORITY', Service.CHECKPOINT_FLOOR === 'C2_LAP_AUTHORITY');
chk('A3 AUTHORITY_KEYS identity-equal to contract REQUIRED_LAP_AUTHORITIES', Service.AUTHORITY_KEYS === VL.REQUIRED_LAP_AUTHORITIES);
chk('A4 SUPPORTED_PROVENANCES contains real/synthetic/unverified', Service.SUPPORTED_PROVENANCES.length === 3
  && Service.SUPPORTED_PROVENANCES.indexOf('real') !== -1
  && Service.SUPPORTED_PROVENANCES.indexOf('synthetic') !== -1
  && Service.SUPPORTED_PROVENANCES.indexOf('unverified') !== -1);
chk('A5 DEFAULT_THRESHOLDS coverage=0.95', Service.DEFAULT_THRESHOLDS.coverage === 0.95);
chk('A6 DEFAULT_THRESHOLDS minimumSamples=200', Service.DEFAULT_THRESHOLDS.minimumSamples === 200);
chk('A7 DEFAULT_THRESHOLDS normalizedMaxGap=0.02', Service.DEFAULT_THRESHOLDS.normalizedMaxGap === 0.02);
chk('A8 DEFAULT_THRESHOLDS timeGapSeconds=0.5', Service.DEFAULT_THRESHOLDS.timeGapSeconds === 0.5);
chk('A9 DEFAULT_THRESHOLDS calibrationStatus=fixture_derived_pending_field_validation',
  Service.DEFAULT_THRESHOLDS.calibrationStatus === 'fixture_derived_pending_field_validation');
chk('A10 DEFAULT_THRESHOLDS frozen', Object.isFrozen(Service.DEFAULT_THRESHOLDS));
chk('A11 METRIC_REQUIRED_CHANNELS frozen', Object.isFrozen(Service.METRIC_REQUIRED_CHANNELS));
chk('A12 every SUPPORTED_METRIC has a required-channel map entry',
  CE.SUPPORTED_METRICS.every(m => Object.prototype.hasOwnProperty.call(Service.METRIC_REQUIRED_CHANNELS, m)));

// ── B. nominal high-rate lap — fixture 1 ──
(() => {
  const ev = nominalLap();
  const r = Service.deriveLapAuthority(ev);
  chk('B1.nominal-high-rate eligible', r.eligible === true);
  chk('B1.nominal-high-rate descriptor all satisfied',
    r.descriptor.lapIdentity.satisfied && r.descriptor.completeness.satisfied
    && r.descriptor.timingValidity.satisfied && r.descriptor.trackIdentity.satisfied
    && r.descriptor.sampleContinuity.satisfied);
  chk('B1.nominal-high-rate descriptor sampleContinuity not discontinuous', r.descriptor.sampleContinuity.discontinuous === false);
  chk('B1.nominal-high-rate evidence carries field-calibration limitation',
    r.evidence.limitations.indexOf(Service.FIELD_CALIBRATION_LIMITATION) !== -1);
  chk('B1.nominal-high-rate evidence appliedThresholds === DEFAULT_THRESHOLDS', r.evidence.appliedThresholds === Service.DEFAULT_THRESHOLDS);
  chk('B1.nominal-high-rate evidence coverage in [0,1]', r.evidence.samples.coverage >= 0 && r.evidence.samples.coverage <= 1);
})();

// ── B2. nominal low-rate lap (10Hz) ──
(() => {
  const ev = nominalLap({ samples: { count: 600, timebaseMedianSeconds: 0.1, timebaseMaxGapSeconds: 0.12 } });
  const r = Service.deriveLapAuthority(ev);
  chk('B2.nominal-low-rate eligible', r.eligible === true);
})();

// ── B3. sparse-but-complete coverage (5Hz, 300 samples) ──
(() => {
  const ev = nominalLap({ samples: { count: 300, timebaseMedianSeconds: 0.2, timebaseMaxGapSeconds: 0.3 } });
  const r = Service.deriveLapAuthority(ev);
  chk('B3.sparse-complete eligible (count above threshold, gap below threshold)', r.eligible === true);
})();

// ── B4. sparse with middle gap (single 3s gap exceeds time threshold) ──
(() => {
  const ev = nominalLap({ samples: { count: 600, timebaseMedianSeconds: 0.1, timebaseMaxGapSeconds: 3.0 } });
  const r = Service.deriveLapAuthority(ev);
  chk('B4.sparse-middle-gap blocked', r.eligible === false);
  chk('B4.sparse-middle-gap routes DISCONTINUOUS_SAMPLES (not INSUFFICIENT_SAMPLE_COVERAGE)',
    hasCode(r, CODES.DISCONTINUOUS_SAMPLES) && !hasCode(r, CODES.INSUFFICIENT_SAMPLE_COVERAGE));
  chk('B4.sparse-middle-gap descriptor sampleContinuity discontinuous=true', r.descriptor.sampleContinuity.discontinuous === true);
})();

// ── B5. many-samples uneven distribution (count high but distance gap exceeds normalized) ──
(() => {
  const ev = nominalLap({
    samples: { count: 5000, timebaseMedianSeconds: 0.012, timebaseMaxGapSeconds: 0.1 },
    distance: {
      authority: { sourceChannel: 'lap_distance', unit: 'm', direction: 'forward', wrapSemantics: 'no_wrap', authorityStatus: 'channel_source_declared', limitations: [] },
      samples: { count: 5000, normalizedMaxGap: 0.08, monotonic: true },
    },
  });
  const r = Service.deriveLapAuthority(ev);
  chk('B5.many-uneven blocked by normalized-distance gap', r.eligible === false);
  chk('B5.many-uneven routes DISCONTINUOUS_SAMPLES', hasCode(r, CODES.DISCONTINUOUS_SAMPLES));
})();

// ── B6. irregular timebase (median 0.05s but max gap 1.2s — discontinuous) ──
(() => {
  const ev = nominalLap({ samples: { count: 1200, timebaseMedianSeconds: 0.05, timebaseMaxGapSeconds: 1.2 } });
  const r = Service.deriveLapAuthority(ev);
  chk('B6.irregular-timebase blocked', r.eligible === false);
  chk('B6.irregular-timebase routes DISCONTINUOUS_SAMPLES', hasCode(r, CODES.DISCONTINUOUS_SAMPLES));
})();

// ── B7. duplicate positions — distance.monotonic=false ──
(() => {
  const ev = nominalLap({
    distance: {
      authority: nominalLap().distance.authority,
      samples: { count: 600, normalizedMaxGap: 0.005, monotonic: false }, // duplicate positions break monotonicity
    },
  });
  const r = Service.deriveLapAuthority(ev);
  chk('B7.duplicate-positions blocked', r.eligible === false);
  chk('B7.duplicate-positions routes DISCONTINUOUS_SAMPLES', hasCode(r, CODES.DISCONTINUOUS_SAMPLES));
})();

// ── B8. reverse positions — also non-monotonic ──
(() => {
  const ev = nominalLap({
    distance: {
      authority: nominalLap().distance.authority,
      samples: { count: 600, normalizedMaxGap: 0.005, monotonic: false },
    },
  });
  const r = Service.deriveLapAuthority(ev);
  chk('B8.reverse-positions blocked (non-monotonic)', r.eligible === false);
})();

// ── B9. wrap crossing (wraps_at_lap_end) — still authoritative; distance.monotonic remains true ──
(() => {
  const ev = nominalLap({
    distance: {
      authority: { sourceChannel: 'lap_distance', unit: 'm', direction: 'forward', wrapSemantics: 'wraps_at_lap_end', authorityStatus: 'channel_source_declared', limitations: [] },
      samples: { count: 600, normalizedMaxGap: 0.005, monotonic: true },
    },
  });
  const r = Service.deriveLapAuthority(ev);
  chk('B9.wrap-crossing eligible (wrap semantics declared, monotonic within-segment)', r.eligible === true);
  chk('B9.wrap-crossing evidence wrapSemantics preserved', r.evidence.distance.wrapSemantics === 'wraps_at_lap_end');
})();

// ── B10. non-monotonic corruption (huge normalizedMaxGap) ──
(() => {
  const ev = nominalLap({
    distance: {
      authority: nominalLap().distance.authority,
      samples: { count: 600, normalizedMaxGap: 0.5, monotonic: false },
    },
  });
  const r = Service.deriveLapAuthority(ev);
  chk('B10.non-monotonic-corruption blocked', r.eligible === false);
  chk('B10.non-monotonic-corruption routes DISCONTINUOUS_SAMPLES', hasCode(r, CODES.DISCONTINUOUS_SAMPLES));
})();

// ── B11. missing distance authority — lap still eligible (distance authority is checked elsewhere) ──
(() => {
  const ev = nominalLap({ distance: null });
  const r = Service.deriveLapAuthority(ev);
  chk('B11.missing-distance eligible (lap-level authority does NOT require distance — that gate is downstream)',
    r.eligible === true);
  chk('B11.missing-distance evidence distance is null', r.evidence.distance === null);
})();

// ── B12. missing optional channel (brake) — lap still eligible; brakingOnsetDelta blocked ──
(() => {
  const ev = nominalLap({ channelsAvailable: ['time', 'speed', 'lateral_accel', 'steering', 'throttle', 'yaw_rate', 'lap_distance'] });
  const r = Service.deriveLapAuthority(ev);
  chk('B12.missing-optional eligible (brake missing does NOT poison the lap)', r.eligible === true);
  const m = Service.assessMetricChannelRequirements('brakingOnsetDelta', ev);
  chk('B12.missing-optional brakingOnsetDelta blocked + METRIC_REQUIRED_CHANNEL_UNAVAILABLE',
    m.eligible === false && hasCode(m, CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE));
  chk('B12.missing-optional speedDelta still eligible (orthogonal metric not poisoned)',
    Service.assessMetricChannelRequirements('speedDelta', ev).eligible === true);
})();

// ── B13. missing REQUIRED channel (speed) — lap completeness fails ──
(() => {
  const ev = nominalLap({ channelsAvailable: ['time', 'lateral_accel', 'steering'] });
  const r = Service.deriveLapAuthority(ev);
  chk('B13.missing-speed blocked', r.eligible === false);
  chk('B13.missing-speed completeness false', r.descriptor.completeness.satisfied === false);
  chk('B13.missing-speed routes INCOMPLETE_LAP', hasCode(r, CODES.INCOMPLETE_LAP));
})();

// ── B14. one extreme outlier gap (single 3s gap in otherwise nominal lap) — DISCONTINUOUS_SAMPLES ──
(() => {
  const ev = nominalLap({ samples: { count: 600, timebaseMedianSeconds: 0.1, timebaseMaxGapSeconds: 3.0 } });
  const r = Service.deriveLapAuthority(ev);
  chk('B14.outlier-gap routes DISCONTINUOUS_SAMPLES', hasCode(r, CODES.DISCONTINUOUS_SAMPLES));
})();

// ── B15. synthetic lap — eligible BUT evidence.limitations carries SYNTHETIC_ONLY_LIMITATION ──
(() => {
  const ev = nominalLap({ provenance: 'synthetic' });
  const r = Service.deriveLapAuthority(ev);
  chk('B15.synthetic eligible structurally', r.eligible === true);
  chk('B15.synthetic evidence carries SYNTHETIC_ONLY_LIMITATION',
    r.evidence.limitations.indexOf(CODES.SYNTHETIC_ONLY_LIMITATION) !== -1);
  chk('B15.synthetic evidence still carries field-calibration limitation',
    r.evidence.limitations.indexOf(Service.FIELD_CALIBRATION_LIMITATION) !== -1);
})();

// ── B16. real-imported representative lap (lower sample density but otherwise valid) ──
(() => {
  const ev = nominalLap({ sourceId: 'csv_import:silverstone-2024-q3.csv', samples: { count: 300, timebaseMedianSeconds: 0.2, timebaseMaxGapSeconds: 0.25 } });
  const r = Service.deriveLapAuthority(ev);
  chk('B16.real-imported eligible', r.eligible === true);
  chk('B16.real-imported sourceId preserved', r.evidence.sourceId === 'csv_import:silverstone-2024-q3.csv');
})();

// ── C. malformed-input fail-closed ──
[null, undefined, 'lap', 42, [], true, false].forEach((bad, i) => {
  const r = Service.deriveLapAuthority(bad);
  chk('C.malformed-' + i + ' blocked + INTERNAL_CONTRACT_VIOLATION', r.eligible === false && hasCode(r, CODES.INTERNAL_CONTRACT_VIOLATION));
});

// ── D. requireProvenance gate ──
(() => {
  const ev = nominalLap({ provenance: 'synthetic' });
  const r = Service.deriveLapAuthority(ev, { requireProvenance: ['real'] });
  chk('D1 requireProvenance=real rejects synthetic via INTERNAL_CONTRACT_VIOLATION', r.eligible === false && hasCode(r, CODES.INTERNAL_CONTRACT_VIOLATION));
})();

// ── E. lap identity slot ──
[
  ['E1 missing caseId', { caseId: '' }],
  ['E2 missing sessionId', { sessionId: '' }],
  ['E3 missing lapId', { lapId: '' }],
  ['E4 missing sourceId', { sourceId: '' }],
].forEach(([name, override]) => {
  const r = Service.deriveLapAuthority(nominalLap(override));
  chk(name + ' → blocked + MISSING_LAP_IDENTITY', r.eligible === false && hasCode(r, CODES.MISSING_LAP_IDENTITY));
});

// ── F. timing validity ──
[
  ['F1 lapStartTime > lapEndTime', { timing: { lapStartTime: 200, lapEndTime: 100, lapTimeMs: 60000 } }],
  ['F2 lapTimeMs <= 0', { timing: { lapStartTime: 100, lapEndTime: 160, lapTimeMs: 0 } }],
  ['F3 lapTimeMs disagrees with end-start', { timing: { lapStartTime: 100, lapEndTime: 160, lapTimeMs: 30000 } }],
].forEach(([name, override]) => {
  const r = Service.deriveLapAuthority(nominalLap(override));
  chk(name + ' → blocked + INVALID_TIMING', r.eligible === false && hasCode(r, CODES.INVALID_TIMING));
});

// ── G. track identity slot ──
[
  ['G1 trackIdentity missing', { trackIdentity: null }],
  ['G2 trackIdentity wrong source', { trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'name_match' } }],
  ['G3 trackIdentity missing layoutId', { trackIdentity: { trackId: 'silverstone', layoutId: '', source: 'explicit' } }],
].forEach(([name, override]) => {
  const r = Service.deriveLapAuthority(nominalLap(override));
  chk(name + ' → blocked + MISSING_TRACK_IDENTITY', r.eligible === false && hasCode(r, CODES.MISSING_TRACK_IDENTITY));
});

// ── H. partial-channel gating per metric (full coverage of SUPPORTED_METRICS) ──
CE.SUPPORTED_METRICS.forEach(m => {
  const req = Service.METRIC_REQUIRED_CHANNELS[m];
  // case 1: all channels present → eligible
  const evOk = { channelsAvailable: req.concat(['time', 'speed']) };
  chk('H.' + m + ' all channels present → eligible', Service.assessMetricChannelRequirements(m, evOk).eligible === true);
  // case 2: every required channel removed → blocked
  const evMissing = { channelsAvailable: [] };
  const r = Service.assessMetricChannelRequirements(m, evMissing);
  chk('H.' + m + ' channels missing → blocked + METRIC_REQUIRED_CHANNEL_UNAVAILABLE',
    r.eligible === false && hasCode(r, CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE));
  chk('H.' + m + ' blocked response lists missingChannels=requiredChannels',
    Array.isArray(r.missingChannels) && req.every(c => r.missingChannels.indexOf(c) !== -1));
});

// ── I. assessMetricChannelRequirements: unsupported metric → contract pass-through ──
(() => {
  const r = Service.assessMetricChannelRequirements('madeUpMetric', { channelsAvailable: ['speed'] });
  chk('I1 unsupported metric → blocked + UNSUPPORTED_METRIC', r.eligible === false && hasCode(r, CODES.UNSUPPORTED_METRIC));
})();

// ── J. caller-supplied thresholds — calibrationStatus reflects caller_supplied ──
(() => {
  const ev = nominalLap();
  const r = Service.deriveLapAuthority(ev, { thresholds: { coverage: 0.5, minimumSamples: 50, normalizedMaxGap: 0.1, timeGapSeconds: 2.0 } });
  chk('J1 caller-supplied thresholds applied', r.evidence.appliedThresholds.minimumSamples === 50);
  chk('J1b caller-supplied calibrationStatus marked', r.evidence.appliedThresholds.calibrationStatus === 'caller_supplied');
})();

// ── K. descriptor compatibility with contract VL.evaluateLapAuthority — feeding the descriptor back to the contract reproduces eligibility ──
(() => {
  const ev = nominalLap();
  const r = Service.deriveLapAuthority(ev);
  const contractResult = VL.evaluateLapAuthority(r.descriptor);
  chk('K1 service descriptor accepted by contract eligibility', contractResult.eligible === true);
})();
(() => {
  const ev = nominalLap({ samples: { count: 50, timebaseMedianSeconds: 0.1, timebaseMaxGapSeconds: 0.15 } });
  const r = Service.deriveLapAuthority(ev);
  // not eligible due to low sample count
  chk('K2 below-min-samples → not eligible + INSUFFICIENT_SAMPLE_COVERAGE', r.eligible === false && hasCode(r, CODES.INSUFFICIENT_SAMPLE_COVERAGE));
  const contractResult = VL.evaluateLapAuthority(r.descriptor);
  chk('K2b service descriptor on failure refused by contract too', contractResult.eligible === false);
})();

// ── L. honest evaluation label — eligible result claims evidence_derived (not contract_structural) ──
(() => {
  const r = Service.deriveLapAuthority(nominalLap());
  chk('L1 eligible evaluation label === evidence_derived (honest scope, not contract_structural)', r.evaluation === 'evidence_derived');
})();

console.log('r3-0c-lap-authority: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
