/**
 * renderer/js/r3-0e-stores.js — R3.0E E2 · IndexedDB-backed experiment / outcome / timeline /
 * follow-up-link stores (PRODUCTION).
 *
 * Uses the R3.0B storage-backend.js contract for atomic transactions:
 *   backend.transact({ stores:[ns...], reads:[{store,key}...], compute:(readValues)=>({writes, result}) })
 *
 * Per SKYLINE D12/E1 ruling: R3.0E persistence lives in SEPARATE versioned stores and MUST
 * NOT extend the frozen R3.0B portable case-record schema body.
 *
 * Stores:
 *   - r3_0e_experiments       payload by experimentId
 *   - r3_0e_experimentsIndex  summary index by experimentId
 *   - r3_0e_outcomes          payload by outcomeId
 *   - r3_0e_outcomesIndex     summary index by outcomeId
 *   - r3_0e_timelines         payload by caseId (timeline-per-case append-only doc)
 *   - r3_0e_followupLinks     payload by linkId
 *   - r3_0e_followupLinksByCase  reverse index by parentCaseId (Array<linkId>)
 *   - r3_0e_storeMetadata     migration / schema-version marker
 *
 * Persistence semantics:
 *   - Every payload validated by its E1 contract BEFORE write (in compute()).
 *   - Every payload re-validated on read; future-schemaVersion → fail-closed reject.
 *   - Timeline events append-only; duplicate eventId rejected; out-of-order timestamp
 *     rejected.
 *   - Persisted records carry NO runtime authority (WeakSet identity is closure-private
 *     and cannot survive reload). Rehydration consumers MUST re-validate via the E1
 *     contracts before treating values as authoritative.
 *
 * UMD: Node require / Electron renderer global (R3_0E_Stores).
 */
(function (root) {
  'use strict';

  // E1 contracts — REQUIRED for validation. Literal-string require specifiers.
  var EXP = null, OUT = null, TL = null, FU = null, CV = null, RC_E = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { EXP = require('../../contracts/r3.0e/experiment-contract.js'); } catch (e) { EXP = null; }
    try { OUT = require('../../contracts/r3.0e/outcome-contract.js'); } catch (e) { OUT = null; }
    try { TL = require('../../contracts/r3.0e/case-timeline-contract.js'); } catch (e) { TL = null; }
    try { FU = require('../../contracts/r3.0e/follow-up-link-contract.js'); } catch (e) { FU = null; }
    try { CV = require('../../contracts/r3.0e/control-variables-contract.js'); } catch (e) { CV = null; }
    try { RC_E = require('../../contracts/r3.0e/reason-codes.js'); } catch (e) { RC_E = null; }
  }
  if (EXP === null && typeof R3_0E_ExperimentContract !== 'undefined') EXP = R3_0E_ExperimentContract;
  if (OUT === null && typeof R3_0E_OutcomeContract !== 'undefined') OUT = R3_0E_OutcomeContract;
  if (TL === null && typeof R3_0E_CaseTimelineContract !== 'undefined') TL = R3_0E_CaseTimelineContract;
  if (FU === null && typeof R3_0E_FollowUpLinkContract !== 'undefined') FU = R3_0E_FollowUpLinkContract;
  if (CV === null && typeof R3_0E_ControlVariablesContract !== 'undefined') CV = R3_0E_ControlVariablesContract;
  if (RC_E === null && typeof R3_0E_ReasonCodes !== 'undefined') RC_E = R3_0E_ReasonCodes;
  if (!EXP || !OUT || !TL || !FU || !CV || !RC_E) {
    throw new Error('r3-0e-stores.js: requires R3.0E E1 contracts');
  }

  var STORE_NAMES = Object.freeze({
    EXPERIMENTS: 'r3_0e_experiments',
    EXPERIMENTS_INDEX: 'r3_0e_experimentsIndex',
    OUTCOMES: 'r3_0e_outcomes',
    OUTCOMES_INDEX: 'r3_0e_outcomesIndex',
    TIMELINES: 'r3_0e_timelines',
    FOLLOWUP_LINKS: 'r3_0e_followupLinks',
    FOLLOWUP_LINKS_BY_CASE: 'r3_0e_followupLinksByCase',
    STORE_METADATA: 'r3_0e_storeMetadata',
  });

  var SCHEMA_VERSIONS = Object.freeze({
    experiment: 1,
    outcome: 1,
    timeline: 1,
    followUpLink: 1,
  });

  function _now(stamp) { return stamp || (typeof Date !== 'undefined' ? new Date().toISOString() : '1970-01-01T00:00:00.000Z'); }
  function _err(code, extra) { var e = new Error(code); e.code = code; if (extra) Object.assign(e, extra); return e; }
  function _deepFreeze(v) {
    if (v === null || typeof v !== 'object') return v;
    try { Object.freeze(v); } catch (e) { /* swallow */ }
    var keys = Object.getOwnPropertyNames(v);
    for (var i = 0; i < keys.length; i++) _deepFreeze(v[keys[i]]);
    return v;
  }

  // ========================================================================================
  // Experiment store
  // ========================================================================================
  function createExperimentStore(backend) {
    if (!backend || typeof backend.transact !== 'function') throw _err('R3_0E_STORE_BACKEND_INVALID');
    return {
      create: function (rec) {
        var v = EXP.validateExperimentShape(rec);
        if (v.valid !== true) return Promise.reject(_err('R3_0E_EXPERIMENT_INVALID', { reasonCodes: v.reasonCodes }));
        if (rec.schemaVersion !== SCHEMA_VERSIONS.experiment) return Promise.reject(_err('R3_0E_EXPERIMENT_SCHEMA_MISMATCH'));
        return backend.transact({
          stores: [STORE_NAMES.EXPERIMENTS, STORE_NAMES.EXPERIMENTS_INDEX],
          reads: [{ store: STORE_NAMES.EXPERIMENTS, key: rec.experimentId }],
          compute: function (reads) {
            if (reads[0] !== undefined && reads[0] !== null) throw _err('R3_0E_EXPERIMENT_ID_COLLISION');
            return {
              writes: [
                { store: STORE_NAMES.EXPERIMENTS, key: rec.experimentId, value: rec },
                { store: STORE_NAMES.EXPERIMENTS_INDEX, key: rec.experimentId, value: {
                  experimentId: rec.experimentId, sourceCaseId: rec.sourceCaseId,
                  status: rec.status, createdAt: rec.createdAt, updatedAt: rec.createdAt,
                } },
              ],
              result: rec.experimentId,
            };
          },
        });
      },
      update: function (rec) {
        var v = EXP.validateExperimentShape(rec);
        if (v.valid !== true) return Promise.reject(_err('R3_0E_EXPERIMENT_INVALID', { reasonCodes: v.reasonCodes }));
        return backend.transact({
          stores: [STORE_NAMES.EXPERIMENTS, STORE_NAMES.EXPERIMENTS_INDEX],
          reads: [{ store: STORE_NAMES.EXPERIMENTS, key: rec.experimentId }],
          compute: function (reads) {
            var existing = reads[0];
            if (existing === undefined || existing === null) throw _err('R3_0E_EXPERIMENT_MISSING');
            if (existing.schemaVersion > SCHEMA_VERSIONS.experiment) throw _err('R3_0E_EXPERIMENT_FUTURE_SCHEMA');
            if (existing.createdAt !== rec.createdAt) throw _err('R3_0E_EXPERIMENT_STALE_WRITE');
            return {
              writes: [
                { store: STORE_NAMES.EXPERIMENTS, key: rec.experimentId, value: rec },
                { store: STORE_NAMES.EXPERIMENTS_INDEX, key: rec.experimentId, value: {
                  experimentId: rec.experimentId, sourceCaseId: rec.sourceCaseId,
                  status: rec.status, createdAt: rec.createdAt, updatedAt: _now(),
                } },
              ],
              result: rec.experimentId,
            };
          },
        });
      },
      get: function (experimentId) {
        return backend.transact({
          stores: [STORE_NAMES.EXPERIMENTS],
          reads: [{ store: STORE_NAMES.EXPERIMENTS, key: experimentId }],
          compute: function (reads) {
            var rec = reads[0];
            if (rec === undefined || rec === null) return { writes: [], result: null };
            if (rec.schemaVersion > SCHEMA_VERSIONS.experiment) throw _err('R3_0E_EXPERIMENT_FUTURE_SCHEMA');
            var v = EXP.validateExperimentShape(rec);
            if (v.valid !== true) throw _err('R3_0E_EXPERIMENT_CORRUPTED', { reasonCodes: v.reasonCodes });
            return { writes: [], result: _deepFreeze(rec) };
          },
        });
      },
      list: function () {
        return backend.list ? backend.list(STORE_NAMES.EXPERIMENTS_INDEX).then(function (rows) {
          return rows.map(function (r) { return r.value; });
        }) : Promise.resolve([]);
      },
      remove: function (experimentId) {
        return backend.transact({
          stores: [STORE_NAMES.EXPERIMENTS, STORE_NAMES.EXPERIMENTS_INDEX],
          reads: [],
          compute: function () {
            return {
              writes: [
                { store: STORE_NAMES.EXPERIMENTS, key: experimentId, op: 'delete' },
                { store: STORE_NAMES.EXPERIMENTS_INDEX, key: experimentId, op: 'delete' },
              ],
              result: experimentId,
            };
          },
        });
      },
    };
  }

  // ========================================================================================
  // Outcome store
  // ========================================================================================
  function createOutcomeStore(backend) {
    if (!backend || typeof backend.transact !== 'function') throw _err('R3_0E_STORE_BACKEND_INVALID');
    return {
      create: function (rec) {
        var v = OUT.validateOutcomeShape(rec);
        if (v.valid !== true) return Promise.reject(_err('R3_0E_OUTCOME_INVALID', { reasonCodes: v.reasonCodes }));
        return backend.transact({
          stores: [STORE_NAMES.OUTCOMES, STORE_NAMES.OUTCOMES_INDEX],
          reads: [{ store: STORE_NAMES.OUTCOMES, key: rec.outcomeId }],
          compute: function (reads) {
            if (reads[0] !== undefined && reads[0] !== null) throw _err('R3_0E_OUTCOME_ID_COLLISION');
            return {
              writes: [
                { store: STORE_NAMES.OUTCOMES, key: rec.outcomeId, value: rec },
                { store: STORE_NAMES.OUTCOMES_INDEX, key: rec.outcomeId, value: {
                  outcomeId: rec.outcomeId, experimentId: rec.experimentId,
                  class: rec['class'], createdAt: rec.createdAt,
                } },
              ],
              result: rec.outcomeId,
            };
          },
        });
      },
      get: function (outcomeId) {
        return backend.transact({
          stores: [STORE_NAMES.OUTCOMES],
          reads: [{ store: STORE_NAMES.OUTCOMES, key: outcomeId }],
          compute: function (reads) {
            var rec = reads[0];
            if (rec === undefined || rec === null) return { writes: [], result: null };
            if (rec.schemaVersion > SCHEMA_VERSIONS.outcome) throw _err('R3_0E_OUTCOME_FUTURE_SCHEMA');
            var v = OUT.validateOutcomeShape(rec);
            if (v.valid !== true) throw _err('R3_0E_OUTCOME_CORRUPTED', { reasonCodes: v.reasonCodes });
            return { writes: [], result: _deepFreeze(rec) };
          },
        });
      },
      listForExperiment: function (experimentId) {
        if (!backend.list) return Promise.resolve([]);
        return backend.list(STORE_NAMES.OUTCOMES_INDEX).then(function (rows) {
          return rows.map(function (r) { return r.value; }).filter(function (r) { return r && r.experimentId === experimentId; });
        });
      },
    };
  }

  // ========================================================================================
  // Timeline store (append-only per-case)
  // ========================================================================================
  function createTimelineStore(backend) {
    if (!backend || typeof backend.transact !== 'function') throw _err('R3_0E_STORE_BACKEND_INVALID');
    return {
      getTimeline: function (caseId) {
        return backend.transact({
          stores: [STORE_NAMES.TIMELINES],
          reads: [{ store: STORE_NAMES.TIMELINES, key: caseId }],
          compute: function (reads) {
            var rec = reads[0];
            if (rec === undefined || rec === null) {
              return { writes: [], result: { schemaVersion: SCHEMA_VERSIONS.timeline, caseId: caseId, events: [] } };
            }
            if (rec.schemaVersion > SCHEMA_VERSIONS.timeline) throw _err('R3_0E_TIMELINE_FUTURE_SCHEMA');
            var v = TL.validateCaseTimelineShape(rec);
            if (v.valid !== true) throw _err('R3_0E_TIMELINE_CORRUPTED', { reasonCodes: v.reasonCodes });
            return { writes: [], result: _deepFreeze(rec) };
          },
        });
      },
      appendEvent: function (caseId, event) {
        return backend.transact({
          stores: [STORE_NAMES.TIMELINES],
          reads: [{ store: STORE_NAMES.TIMELINES, key: caseId }],
          compute: function (reads) {
            var existing = reads[0] || { schemaVersion: SCHEMA_VERSIONS.timeline, caseId: caseId, events: [] };
            if (existing.schemaVersion > SCHEMA_VERSIONS.timeline) throw _err('R3_0E_TIMELINE_FUTURE_SCHEMA');
            for (var i = 0; i < existing.events.length; i++) {
              if (existing.events[i].eventId === event.eventId) throw _err('R3_0E_TIMELINE_DUPLICATE_EVENT');
            }
            if (existing.events.length > 0) {
              var prevMs = Date.parse(existing.events[existing.events.length - 1].createdAt);
              var newMs = Date.parse(event.createdAt);
              if (isNaN(newMs) || newMs < prevMs) throw _err('R3_0E_TIMELINE_OUT_OF_ORDER');
            }
            var nextEvents = existing.events.concat([event]);
            var next = { schemaVersion: SCHEMA_VERSIONS.timeline, caseId: caseId, events: nextEvents };
            var v = TL.validateCaseTimelineShape(next);
            if (v.valid !== true) throw _err('R3_0E_TIMELINE_INVALID', { reasonCodes: v.reasonCodes });
            return { writes: [{ store: STORE_NAMES.TIMELINES, key: caseId, value: next }], result: event.eventId };
          },
        });
      },
    };
  }

  // ========================================================================================
  // Follow-up link store
  // ========================================================================================
  function createFollowUpLinkStore(backend) {
    if (!backend || typeof backend.transact !== 'function') throw _err('R3_0E_STORE_BACKEND_INVALID');

    function _validateOne(rec) {
      if (rec === undefined || rec === null) return null;
      if (rec.schemaVersion > SCHEMA_VERSIONS.followUpLink) throw _err('R3_0E_LINK_FUTURE_SCHEMA');
      var v = FU.validateFollowUpLinkShape(rec);
      if (v.valid !== true) throw _err('R3_0E_LINK_CORRUPTED', { reasonCodes: v.reasonCodes });
      return _deepFreeze(rec);
    }

    return {
      create: function (link) {
        var v = FU.validateFollowUpLinkShape(link);
        if (v.valid !== true) return Promise.reject(_err('R3_0E_LINK_INVALID', { reasonCodes: v.reasonCodes }));
        return backend.transact({
          stores: [STORE_NAMES.FOLLOWUP_LINKS, STORE_NAMES.FOLLOWUP_LINKS_BY_CASE],
          reads: [
            { store: STORE_NAMES.FOLLOWUP_LINKS, key: link.linkId },
            { store: STORE_NAMES.FOLLOWUP_LINKS_BY_CASE, key: link.parentCaseId },
          ],
          compute: function (reads) {
            if (reads[0] !== undefined && reads[0] !== null) throw _err('R3_0E_LINK_ID_COLLISION');
            var idx = reads[1];
            var arr = (idx && idx.linkIds) ? idx.linkIds.slice() : [];
            if (arr.indexOf(link.linkId) === -1) arr.push(link.linkId);
            return {
              writes: [
                { store: STORE_NAMES.FOLLOWUP_LINKS, key: link.linkId, value: link },
                { store: STORE_NAMES.FOLLOWUP_LINKS_BY_CASE, key: link.parentCaseId, value: { parentCaseId: link.parentCaseId, linkIds: arr } },
              ],
              result: link.linkId,
            };
          },
        });
      },
      get: function (linkId) {
        return backend.transact({
          stores: [STORE_NAMES.FOLLOWUP_LINKS],
          reads: [{ store: STORE_NAMES.FOLLOWUP_LINKS, key: linkId }],
          compute: function (reads) {
            return { writes: [], result: _validateOne(reads[0]) };
          },
        });
      },
      listForParent: function (parentCaseId) {
        // 1. Read the reverse index.
        return backend.transact({
          stores: [STORE_NAMES.FOLLOWUP_LINKS_BY_CASE],
          reads: [{ store: STORE_NAMES.FOLLOWUP_LINKS_BY_CASE, key: parentCaseId }],
          compute: function (reads) {
            var idx = reads[0];
            // Codex E2-R2-01 closure: validate the reverse-index row itself.
            if (idx === undefined || idx === null) return { writes: [], result: [] };
            if (idx.parentCaseId !== parentCaseId) throw _err('R3_0E_LINK_CORRUPTED', { detail: 'reverse-index parentCaseId mismatch' });
            if (!Array.isArray(idx.linkIds)) throw _err('R3_0E_LINK_CORRUPTED', { detail: 'reverse-index linkIds not array' });
            return { writes: [], result: idx.linkIds.slice() };
          },
        }).then(function (linkIds) {
          if (!linkIds.length) return [];
          // 2. Read every link in one transact (atomic snapshot).
          var readSpec = linkIds.map(function (id) { return { store: STORE_NAMES.FOLLOWUP_LINKS, key: id }; });
          return backend.transact({
            stores: [STORE_NAMES.FOLLOWUP_LINKS],
            reads: readSpec,
            compute: function (reads) {
              // Codex E2-R1-02 closure: validate every fetched link before returning.
              // Codex E2-R2-01 closure: ALSO verify each validated link's parentCaseId
              // matches the caller-supplied parentCaseId. A poisoned reverse index that
              // points at another parent's valid link is rejected as corruption rather
              // than silently leaked across parent boundaries.
              var out = [];
              for (var i = 0; i < reads.length; i++) {
                var validated = _validateOne(reads[i]);
                if (validated === null) continue;
                if (validated.parentCaseId !== parentCaseId) {
                  throw _err('R3_0E_LINK_CORRUPTED', { detail: 'reverse-index points at link with mismatched parentCaseId' });
                }
                out.push(validated);
              }
              return { writes: [], result: out };
            },
          });
        });
      },
      markParentStatus: function (linkId, newStatus) {
        if (['present', 'archived', 'deleted'].indexOf(newStatus) === -1) {
          return Promise.reject(_err('R3_0E_LINK_PARENT_STATUS_INVALID'));
        }
        return backend.transact({
          stores: [STORE_NAMES.FOLLOWUP_LINKS],
          reads: [{ store: STORE_NAMES.FOLLOWUP_LINKS, key: linkId }],
          compute: function (reads) {
            var cur = reads[0];
            if (cur === undefined || cur === null) throw _err('R3_0E_LINK_MISSING');
            var next = Object.assign({}, cur, { parentStatus: newStatus });
            var v = FU.validateFollowUpLinkShape(next);
            if (v.valid !== true) throw _err('R3_0E_LINK_INVALID', { reasonCodes: v.reasonCodes });
            return { writes: [{ store: STORE_NAMES.FOLLOWUP_LINKS, key: linkId, value: next }], result: linkId };
          },
        });
      },
    };
  }

  // ========================================================================================
  // Store metadata
  // ========================================================================================
  function createStoreMetadata(backend) {
    if (!backend || typeof backend.transact !== 'function') throw _err('R3_0E_STORE_BACKEND_INVALID');
    return {
      readVersion: function () {
        return backend.transact({
          stores: [STORE_NAMES.STORE_METADATA],
          reads: [{ store: STORE_NAMES.STORE_METADATA, key: '__r3_0e_version' }],
          compute: function (reads) {
            return { writes: [], result: reads[0] || null };
          },
        });
      },
      writeVersion: function (versionMap) {
        if (!versionMap || typeof versionMap !== 'object') return Promise.reject(_err('R3_0E_VERSION_INVALID'));
        return backend.transact({
          stores: [STORE_NAMES.STORE_METADATA],
          reads: [],
          compute: function () {
            return {
              writes: [{ store: STORE_NAMES.STORE_METADATA, key: '__r3_0e_version', value: { versions: versionMap, updatedAt: _now() } }],
              result: true,
            };
          },
        });
      },
    };
  }

  var api = {
    STORE_NAMES: STORE_NAMES,
    SCHEMA_VERSIONS: SCHEMA_VERSIONS,
    createExperimentStore: createExperimentStore,
    createOutcomeStore: createOutcomeStore,
    createTimelineStore: createTimelineStore,
    createFollowUpLinkStore: createFollowUpLinkStore,
    createStoreMetadata: createStoreMetadata,
  };
  try { Object.freeze(api); } catch (e) { /* swallow */ }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { Object.defineProperty(root, 'R3_0E_Stores', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_Stores = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
