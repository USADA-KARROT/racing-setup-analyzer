/**
 * tests/r3-0c-distance-authority.test.js — R3.0C C2 · Distance Authority.
 *
 * Verifies the narrow channel-source rule: only authorityStatus='channel_source_declared'
 * proposals with valid direction + wrapSemantics + unit are accepted. EVERY inferential
 * authorityStatus (sample-index, elapsed-time ratio, speed integral, GPS proximity, track-length
 * guess) is enumerated and explicitly refused, even when the rest of the channel descriptor
 * looks fine.
 *
 * The test also covers: multi-proposal first-eligible deterministic ordering, evidence trail of
 * rejected proposals + rejected fallback inferences, fail-closed behaviour for malformed input,
 * and frozen output.
 */
'use strict';
const Service = require('../renderer/js/r3-0c-distance-authority.js');
const Contracts = require('../contracts/r3.0c/index.js');
const CODES = Contracts.reasonCodes.REASON_CODES;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (res, code) => !!(res && Array.isArray(res.reasonCodes) && res.reasonCodes.indexOf(code) !== -1);

function validProp(over) {
  return Object.assign({
    channelName: 'lap_distance', unit: 'm', direction: 'forward',
    wrapSemantics: 'no_wrap', authorityStatus: 'channel_source_declared', limitations: [],
  }, over || {});
}

// ── A. constants ──
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 CHECKPOINT_FLOOR === C2_LAP_AUTHORITY', Service.CHECKPOINT_FLOOR === 'C2_LAP_AUTHORITY');
chk('A3 ACCEPTED_AUTHORITY_STATUSES contains only channel_source_declared',
  Service.ACCEPTED_AUTHORITY_STATUSES.length === 1 && Service.ACCEPTED_AUTHORITY_STATUSES[0] === 'channel_source_declared');
chk('A4 ACCEPTED_DIRECTIONS = [forward, reverse]',
  Service.ACCEPTED_DIRECTIONS.length === 2
  && Service.ACCEPTED_DIRECTIONS.indexOf('forward') !== -1
  && Service.ACCEPTED_DIRECTIONS.indexOf('reverse') !== -1);
chk('A5 ACCEPTED_WRAP_SEMANTICS covers no_wrap + wraps_at_lap_end + wraps_at_value',
  Service.ACCEPTED_WRAP_SEMANTICS.length === 3);
chk('A6 FORBIDDEN_INFERENCE_SOURCES includes the 5 enumerated rejections',
  Service.FORBIDDEN_INFERENCE_SOURCES.indexOf('inferred_from_sample_index') !== -1
  && Service.FORBIDDEN_INFERENCE_SOURCES.indexOf('inferred_from_elapsed_time_ratio') !== -1
  && Service.FORBIDDEN_INFERENCE_SOURCES.indexOf('inferred_from_speed_integral') !== -1
  && Service.FORBIDDEN_INFERENCE_SOURCES.indexOf('inferred_from_gps_proximity') !== -1
  && Service.FORBIDDEN_INFERENCE_SOURCES.indexOf('inferred_from_track_length_guess') !== -1);
chk('A7 ACCEPTED_AUTHORITY_STATUSES frozen', Object.isFrozen(Service.ACCEPTED_AUTHORITY_STATUSES));
chk('A8 FORBIDDEN_INFERENCE_SOURCES frozen', Object.isFrozen(Service.FORBIDDEN_INFERENCE_SOURCES));

// ── B. happy path ──
(() => {
  const r = Service.deriveDistanceAuthority({ proposedChannels: [validProp()] });
  chk('B1 eligible=true', r.eligible === true);
  chk('B1b status=distance_authority_declared', r.status === 'distance_authority_declared');
  chk('B1c authority.sourceChannel=lap_distance', r.authority.sourceChannel === 'lap_distance');
  chk('B1d authority.unit=m', r.authority.unit === 'm');
  chk('B1e authority.direction=forward', r.authority.direction === 'forward');
  chk('B1f authority.wrapSemantics=no_wrap', r.authority.wrapSemantics === 'no_wrap');
  chk('B1g authority.authorityStatus=channel_source_declared', r.authority.authorityStatus === 'channel_source_declared');
  chk('B1h proposedCount=1', r.proposedCount === 1);
  chk('B1i rejectedProposals empty', r.rejectedProposals.length === 0);
  chk('B1j reasonCodes empty', r.reasonCodes.length === 0);
})();

// ── C. each forbidden inference status is rejected — even with valid unit/direction/wrap ──
Service.FORBIDDEN_INFERENCE_SOURCES.forEach(badStatus => {
  const r = Service.deriveDistanceAuthority({
    proposedChannels: [validProp({ authorityStatus: badStatus })],
  });
  chk('C.' + badStatus + ' rejected', r.eligible === false && hasCode(r, CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY));
  chk('C.' + badStatus + ' rejectedProposals[0].rejectedReason === authority_status_inferential_rejected',
    r.rejectedProposals.length === 1 && r.rejectedProposals[0].rejectedReason === 'authority_status_inferential_rejected');
});

// ── D. invalid direction / wrapSemantics / unit / channelName — each fails closed independently ──
[
  ['D1 invalid direction', validProp({ direction: 'sideways' }), 'direction_invalid'],
  ['D2 invalid wrapSemantics', validProp({ wrapSemantics: 'wraps_in_circles' }), 'wrap_semantics_invalid'],
  ['D3 empty unit', validProp({ unit: '' }), 'unit_missing'],
  ['D4 empty channelName', validProp({ channelName: '' }), 'channel_name_missing'],
  ['D5 unknown non-inferential authority status', validProp({ authorityStatus: 'derived_from_something' }), 'authority_status_invalid'],
].forEach(([name, prop, expectedReason]) => {
  const r = Service.deriveDistanceAuthority({ proposedChannels: [prop] });
  chk(name + ' blocked', r.eligible === false && hasCode(r, CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY));
  chk(name + ' rejectedReason=' + expectedReason, r.rejectedProposals.length === 1 && r.rejectedProposals[0].rejectedReason === expectedReason);
});

// ── E. multi-proposal ordering — first VALID wins, earlier invalid ones recorded ──
(() => {
  const r = Service.deriveDistanceAuthority({
    proposedChannels: [
      validProp({ channelName: 'fake_inferred', authorityStatus: 'inferred_from_sample_index' }),
      validProp({ channelName: 'fake_invalid_direction', direction: 'sideways' }),
      validProp({ channelName: 'real_lap_distance' }),
      validProp({ channelName: 'second_real_distance' }),
    ],
  });
  chk('E1 first valid wins', r.authority.sourceChannel === 'real_lap_distance');
  chk('E1b rejectedProposals=2 (skipped before the first valid)', r.rejectedProposals.length === 2);
  chk('E1c proposedCount=4 (records all four offered)', r.proposedCount === 4);
})();

// ── F. fallbackInferences recorded but NEVER accepted ──
(() => {
  const r = Service.deriveDistanceAuthority({
    proposedChannels: [],
    fallbackInferences: ['inferred_from_speed_integral', 'inferred_from_sample_index', 'inferred_from_track_length_guess', 'random_other'],
  });
  chk('F1 no valid proposals → blocked', r.eligible === false);
  chk('F1b rejectedInferentialSources records 3 known forbidden (random_other not enumerated)',
    r.rejectedInferentialSources.length === 3
    && r.rejectedInferentialSources.indexOf('random_other') === -1);
})();

// ── G. malformed evidence input ──
[null, undefined, 'm', 42, true, []].forEach((bad, i) => {
  const r = Service.deriveDistanceAuthority(bad);
  chk('G.malformed-' + i + ' blocked + MISSING_NORMALIZED_DISTANCE_AUTHORITY', r.eligible === false && hasCode(r, CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY));
});

// ── H. proposedChannels empty array OR missing ──
[{}, { proposedChannels: [] }, { proposedChannels: 'not-an-array' }].forEach((ev, i) => {
  const r = Service.deriveDistanceAuthority(ev);
  chk('H.empty-' + i + ' blocked', r.eligible === false && hasCode(r, CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY));
});

// ── I. channel limitations propagate through ──
(() => {
  const r = Service.deriveDistanceAuthority({
    proposedChannels: [validProp({ limitations: ['gps_assisted', 'first_sector_low_density'] })],
  });
  chk('I1 limitations propagated', r.authority.limitations.length === 2
    && r.authority.limitations.indexOf('gps_assisted') !== -1
    && r.authority.limitations.indexOf('first_sector_low_density') !== -1);
})();

// ── J. result objects are frozen ──
(() => {
  const r = Service.deriveDistanceAuthority({ proposedChannels: [validProp()] });
  chk('J1 eligible result frozen', Object.isFrozen(r));
  chk('J1b authority frozen', Object.isFrozen(r.authority));
  const r2 = Service.deriveDistanceAuthority({});
  chk('J2 blocked result frozen', Object.isFrozen(r2));
})();

// ── K. wraps_at_lap_end + wraps_at_value both accepted as valid wrap semantics ──
['wraps_at_lap_end', 'wraps_at_value', 'no_wrap'].forEach(ws => {
  const r = Service.deriveDistanceAuthority({ proposedChannels: [validProp({ wrapSemantics: ws })] });
  chk('K.wrap=' + ws + ' accepted', r.eligible === true && r.authority.wrapSemantics === ws);
});

// ── L. reverse direction accepted ──
(() => {
  const r = Service.deriveDistanceAuthority({ proposedChannels: [validProp({ direction: 'reverse' })] });
  chk('L1 reverse direction accepted', r.eligible === true && r.authority.direction === 'reverse');
})();

// ── M. mixing several different forbidden statuses in proposedChannels ──
(() => {
  const r = Service.deriveDistanceAuthority({
    proposedChannels: [
      validProp({ channelName: 'a', authorityStatus: 'inferred_from_sample_index' }),
      validProp({ channelName: 'b', authorityStatus: 'inferred_from_speed_integral' }),
      validProp({ channelName: 'c', authorityStatus: 'inferred_from_gps_proximity' }),
    ],
  });
  chk('M1 all-inferential proposals → blocked', r.eligible === false);
  chk('M1b all 3 recorded as rejected with inferential reason',
    r.rejectedProposals.length === 3 && r.rejectedProposals.every(p => p.rejectedReason === 'authority_status_inferential_rejected'));
})();

console.log('r3-0c-distance-authority: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
