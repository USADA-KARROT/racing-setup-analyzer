/**
 * renderer/js/r3-0e-stores.js — R3.0E E2 · IndexedDB-backed experiment / outcome / timeline /
 * follow-up-link stores (PRODUCTION).
 *
 * Mirrors the R3.0B case-store / session-store pattern: pure logic over an injected
 * storage backend (`backend.transact(stores, mode, work)`). Each store factory returns a
 * narrow CRUD-ish API. Per SKYLINE D12/E1 ruling: R3.0E persistence lives in SEPARATE
 * versioned stores and MUST NOT extend the frozen R3.0B portable case-record schema body.
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
 *   - Every payload carries a schemaVersion. Future-schemaVersion is fail-closed: a read
 *     of a record whose schemaVersion > currentSchemaVersion returns null with a
 *     surfaced reason (the caller MUST treat it as unreadable, not as an empty record).
 *   - Persisted records DO NOT carry runtime authority (WeakSet identity is a runtime
 *     concept that cannot survive reload). Rehydration MUST re-validate via the E1
 *     contracts and re-register with the appropriate runtime authority registry BEFORE
 *     a downstream consumer treats the rehydrated value as authoritative.
 *   - Append-only timeline: timeline.events is append-only; existing events are NEVER
 *     overwritten. A correction is a NEW event referencing the prior event id.
 *   - Idempotent re-write: writing a payload whose schemaVersion/id matches a stored
 *     record is permitted (acts as no-op except for updatedAt) unless the digest
 *     differs (stale generation rejected).
 *
 * UMD: Node require / Electron renderer global (R3_0E_Stores).
 */
(function (root) {
  'use strict';
  // E1 contracts — REQUIRED for validation. Module fail-loud if missing. Literal-string
  // require specifiers per the no-consumer scanner convention; browser fallback via
  // R3_0E_* globals.
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
    throw new Error('r3-0e-stores.js: requires R3.0E E1 contracts (experiment / outcome / timeline / follow-up / control-variables / reason-codes)');
  }
  var CODES_E = RC_E.REASON_CODES;

  // Store names — versioned namespace per directive §8 (independent from R3.0B/R3.0C).
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

  // Current schema versions per payload class.
  var SCHEMA_VERSIONS = Object.freeze({
    experiment: 1,
    outcome: 1,
    timeline: 1,
    followUpLink: 1,
  });

  function _now(stamp) { return stamp || (typeof Date !== 'undefined' ? new Date().toISOString() : '1970-01-01T00:00:00.000Z'); }
  function _err(code, extra) { var e = new Error(code); e.code = code; if (extra) Object.assign(e, extra); return e; }

  function _frozenClone(obj) {
    // Defensive: store callers' input by deep-freezing a structuredClone so subsequent
    // mutation of the input does NOT bleed into the persisted record. Persisted records
    // are themselves frozen on read.
    var clone;
    try { clone = (typeof structuredClone === 'function') ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)); }
    catch (e) { return null; }
    function deepFreeze(v) {
      if (v === null || typeof v !== 'object') return v;
      try { Object.freeze(v); } catch (e) { /* swallow */ }
      var keys = Object.getOwnPropertyNames(v);
      for (var i = 0; i < keys.length; i++) deepFreeze(v[keys[i]]);
      return v;
    }
    return deepFreeze(clone);
  }

  // ========================================================================================
  // Experiment store
  // ========================================================================================
  function createExperimentStore(backend, opts) {
    opts = opts || {};
    if (!backend || typeof backend.transact !== 'function') throw _err('R3_0E_STORE_BACKEND_INVALID');
    return {
      create: function (rec) {
        // E1 validate; reject on structural fail.
        var v = EXP.validateExperimentShape(rec);
        if (v.valid !== true) return Promise.reject(_err('R3_0E_EXPERIMENT_INVALID', { reasonCodes: v.reasonCodes }));
        if (rec.schemaVersion !== SCHEMA_VERSIONS.experiment) return Promise.reject(_err('R3_0E_EXPERIMENT_SCHEMA_MISMATCH'));
        return backend.transact([STORE_NAMES.EXPERIMENTS, STORE_NAMES.EXPERIMENTS_INDEX], 'readwrite', function (tx) {
          var existing = tx.get(STORE_NAMES.EXPERIMENTS, rec.experimentId);
          return Promise.resolve(existing).then(function (cur) {
            if (cur) return Promise.reject(_err('R3_0E_EXPERIMENT_ID_COLLISION'));
            var payload = _frozenClone(rec);
            tx.put(STORE_NAMES.EXPERIMENTS, rec.experimentId, payload);
            tx.put(STORE_NAMES.EXPERIMENTS_INDEX, rec.experimentId, {
              experimentId: rec.experimentId,
              sourceCaseId: rec.sourceCaseId,
              status: rec.status,
              createdAt: rec.createdAt,
              updatedAt: rec.createdAt,
            });
            return rec.experimentId;
          });
        });
      },
      update: function (rec) {
        var v = EXP.validateExperimentShape(rec);
        if (v.valid !== true) return Promise.reject(_err('R3_0E_EXPERIMENT_INVALID', { reasonCodes: v.reasonCodes }));
        return backend.transact([STORE_NAMES.EXPERIMENTS, STORE_NAMES.EXPERIMENTS_INDEX], 'readwrite', function (tx) {
          var cur = tx.get(STORE_NAMES.EXPERIMENTS, rec.experimentId);
          return Promise.resolve(cur).then(function (existing) {
            if (!existing) return Promise.reject(_err('R3_0E_EXPERIMENT_MISSING'));
            if (existing.schemaVersion > SCHEMA_VERSIONS.experiment) return Promise.reject(_err('R3_0E_EXPERIMENT_FUTURE_SCHEMA'));
            // Stale generation: createdAt mismatch is treated as a stale write.
            if (existing.createdAt !== rec.createdAt) return Promise.reject(_err('R3_0E_EXPERIMENT_STALE_WRITE'));
            var payload = _frozenClone(rec);
            tx.put(STORE_NAMES.EXPERIMENTS, rec.experimentId, payload);
            tx.put(STORE_NAMES.EXPERIMENTS_INDEX, rec.experimentId, {
              experimentId: rec.experimentId,
              sourceCaseId: rec.sourceCaseId,
              status: rec.status,
              createdAt: rec.createdAt,
              updatedAt: _now(),
            });
            return rec.experimentId;
          });
        });
      },
      get: function (experimentId) {
        return backend.transact([STORE_NAMES.EXPERIMENTS], 'readonly', function (tx) {
          return Promise.resolve(tx.get(STORE_NAMES.EXPERIMENTS, experimentId)).then(function (rec) {
            if (!rec) return null;
            if (rec.schemaVersion > SCHEMA_VERSIONS.experiment) {
              // Future schema → unreadable; surface as null + reason on the surface contract.
              return Promise.reject(_err('R3_0E_EXPERIMENT_FUTURE_SCHEMA'));
            }
            // Re-validate on read (defensive against corrupted record).
            var v = EXP.validateExperimentShape(rec);
            if (v.valid !== true) return Promise.reject(_err('R3_0E_EXPERIMENT_CORRUPTED', { reasonCodes: v.reasonCodes }));
            return _frozenClone(rec);
          });
        });
      },
      list: function () {
        return backend.transact([STORE_NAMES.EXPERIMENTS_INDEX], 'readonly', function (tx) {
          return Promise.resolve(tx.list ? tx.list(STORE_NAMES.EXPERIMENTS_INDEX) : []);
        });
      },
      remove: function (experimentId) {
        return backend.transact([STORE_NAMES.EXPERIMENTS, STORE_NAMES.EXPERIMENTS_INDEX], 'readwrite', function (tx) {
          tx.del(STORE_NAMES.EXPERIMENTS, experimentId);
          tx.del(STORE_NAMES.EXPERIMENTS_INDEX, experimentId);
          return experimentId;
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
        return backend.transact([STORE_NAMES.OUTCOMES, STORE_NAMES.OUTCOMES_INDEX], 'readwrite', function (tx) {
          var cur = tx.get(STORE_NAMES.OUTCOMES, rec.outcomeId);
          return Promise.resolve(cur).then(function (existing) {
            if (existing) return Promise.reject(_err('R3_0E_OUTCOME_ID_COLLISION'));
            var payload = _frozenClone(rec);
            tx.put(STORE_NAMES.OUTCOMES, rec.outcomeId, payload);
            tx.put(STORE_NAMES.OUTCOMES_INDEX, rec.outcomeId, {
              outcomeId: rec.outcomeId,
              experimentId: rec.experimentId,
              class: rec['class'],
              createdAt: rec.createdAt,
            });
            return rec.outcomeId;
          });
        });
      },
      get: function (outcomeId) {
        return backend.transact([STORE_NAMES.OUTCOMES], 'readonly', function (tx) {
          return Promise.resolve(tx.get(STORE_NAMES.OUTCOMES, outcomeId)).then(function (rec) {
            if (!rec) return null;
            if (rec.schemaVersion > SCHEMA_VERSIONS.outcome) return Promise.reject(_err('R3_0E_OUTCOME_FUTURE_SCHEMA'));
            var v = OUT.validateOutcomeShape(rec);
            if (v.valid !== true) return Promise.reject(_err('R3_0E_OUTCOME_CORRUPTED', { reasonCodes: v.reasonCodes }));
            return _frozenClone(rec);
          });
        });
      },
      listForExperiment: function (experimentId) {
        return backend.transact([STORE_NAMES.OUTCOMES_INDEX], 'readonly', function (tx) {
          return Promise.resolve(tx.list ? tx.list(STORE_NAMES.OUTCOMES_INDEX) : []).then(function (rows) {
            return (rows || []).filter(function (r) { return r && r.experimentId === experimentId; });
          });
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
        return backend.transact([STORE_NAMES.TIMELINES], 'readonly', function (tx) {
          return Promise.resolve(tx.get(STORE_NAMES.TIMELINES, caseId)).then(function (rec) {
            if (!rec) return { schemaVersion: SCHEMA_VERSIONS.timeline, caseId: caseId, events: [] };
            if (rec.schemaVersion > SCHEMA_VERSIONS.timeline) return Promise.reject(_err('R3_0E_TIMELINE_FUTURE_SCHEMA'));
            var v = TL.validateCaseTimelineShape(rec);
            if (v.valid !== true) return Promise.reject(_err('R3_0E_TIMELINE_CORRUPTED', { reasonCodes: v.reasonCodes }));
            return _frozenClone(rec);
          });
        });
      },
      appendEvent: function (caseId, event) {
        // Append-only: read current, append, write back. Existing events are NEVER mutated.
        return backend.transact([STORE_NAMES.TIMELINES], 'readwrite', function (tx) {
          var curP = tx.get(STORE_NAMES.TIMELINES, caseId);
          return Promise.resolve(curP).then(function (cur) {
            var existing = cur || { schemaVersion: SCHEMA_VERSIONS.timeline, caseId: caseId, events: [] };
            if (existing.schemaVersion > SCHEMA_VERSIONS.timeline) return Promise.reject(_err('R3_0E_TIMELINE_FUTURE_SCHEMA'));
            // Reject duplicate eventId.
            for (var i = 0; i < existing.events.length; i++) {
              if (existing.events[i].eventId === event.eventId) return Promise.reject(_err('R3_0E_TIMELINE_DUPLICATE_EVENT'));
            }
            // Reject out-of-order timestamp.
            if (existing.events.length > 0) {
              var prevMs = Date.parse(existing.events[existing.events.length - 1].createdAt);
              var newMs = Date.parse(event.createdAt);
              if (isNaN(newMs) || newMs < prevMs) return Promise.reject(_err('R3_0E_TIMELINE_OUT_OF_ORDER'));
            }
            var nextEvents = existing.events.concat([event]);
            var next = { schemaVersion: SCHEMA_VERSIONS.timeline, caseId: caseId, events: nextEvents };
            var v = TL.validateCaseTimelineShape(next);
            if (v.valid !== true) return Promise.reject(_err('R3_0E_TIMELINE_INVALID', { reasonCodes: v.reasonCodes }));
            tx.put(STORE_NAMES.TIMELINES, caseId, _frozenClone(next));
            return event.eventId;
          });
        });
      },
    };
  }

  // ========================================================================================
  // Follow-up link store
  // ========================================================================================
  function createFollowUpLinkStore(backend) {
    if (!backend || typeof backend.transact !== 'function') throw _err('R3_0E_STORE_BACKEND_INVALID');
    return {
      create: function (link) {
        var v = FU.validateFollowUpLinkShape(link);
        if (v.valid !== true) return Promise.reject(_err('R3_0E_LINK_INVALID', { reasonCodes: v.reasonCodes }));
        return backend.transact([STORE_NAMES.FOLLOWUP_LINKS, STORE_NAMES.FOLLOWUP_LINKS_BY_CASE], 'readwrite', function (tx) {
          var cur = tx.get(STORE_NAMES.FOLLOWUP_LINKS, link.linkId);
          return Promise.resolve(cur).then(function (existing) {
            if (existing) return Promise.reject(_err('R3_0E_LINK_ID_COLLISION'));
            var payload = _frozenClone(link);
            tx.put(STORE_NAMES.FOLLOWUP_LINKS, link.linkId, payload);
            // Reverse index: append linkId to parent case's list.
            var idxP = tx.get(STORE_NAMES.FOLLOWUP_LINKS_BY_CASE, link.parentCaseId);
            return Promise.resolve(idxP).then(function (idxRec) {
              var arr = (idxRec && idxRec.linkIds) ? idxRec.linkIds.slice() : [];
              if (arr.indexOf(link.linkId) === -1) arr.push(link.linkId);
              tx.put(STORE_NAMES.FOLLOWUP_LINKS_BY_CASE, link.parentCaseId, { parentCaseId: link.parentCaseId, linkIds: arr });
              return link.linkId;
            });
          });
        });
      },
      get: function (linkId) {
        return backend.transact([STORE_NAMES.FOLLOWUP_LINKS], 'readonly', function (tx) {
          return Promise.resolve(tx.get(STORE_NAMES.FOLLOWUP_LINKS, linkId)).then(function (rec) {
            if (!rec) return null;
            if (rec.schemaVersion > SCHEMA_VERSIONS.followUpLink) return Promise.reject(_err('R3_0E_LINK_FUTURE_SCHEMA'));
            var v = FU.validateFollowUpLinkShape(rec);
            if (v.valid !== true) return Promise.reject(_err('R3_0E_LINK_CORRUPTED', { reasonCodes: v.reasonCodes }));
            return _frozenClone(rec);
          });
        });
      },
      listForParent: function (parentCaseId) {
        return backend.transact([STORE_NAMES.FOLLOWUP_LINKS, STORE_NAMES.FOLLOWUP_LINKS_BY_CASE], 'readonly', function (tx) {
          return Promise.resolve(tx.get(STORE_NAMES.FOLLOWUP_LINKS_BY_CASE, parentCaseId)).then(function (idx) {
            if (!idx || !idx.linkIds) return [];
            var promises = [];
            for (var i = 0; i < idx.linkIds.length; i++) {
              promises.push(Promise.resolve(tx.get(STORE_NAMES.FOLLOWUP_LINKS, idx.linkIds[i])));
            }
            return Promise.all(promises).then(function (records) {
              return records.filter(function (r) { return r !== null && r !== undefined; });
            });
          });
        });
      },
      markParentStatus: function (linkId, newStatus) {
        // Update parentStatus without rewriting other fields (idempotent for present→archived→deleted).
        if (['present', 'archived', 'deleted'].indexOf(newStatus) === -1) {
          return Promise.reject(_err('R3_0E_LINK_PARENT_STATUS_INVALID'));
        }
        return backend.transact([STORE_NAMES.FOLLOWUP_LINKS], 'readwrite', function (tx) {
          return Promise.resolve(tx.get(STORE_NAMES.FOLLOWUP_LINKS, linkId)).then(function (cur) {
            if (!cur) return Promise.reject(_err('R3_0E_LINK_MISSING'));
            var next = Object.assign({}, cur, { parentStatus: newStatus });
            var v = FU.validateFollowUpLinkShape(next);
            if (v.valid !== true) return Promise.reject(_err('R3_0E_LINK_INVALID', { reasonCodes: v.reasonCodes }));
            tx.put(STORE_NAMES.FOLLOWUP_LINKS, linkId, _frozenClone(next));
            return linkId;
          });
        });
      },
    };
  }

  // ========================================================================================
  // Store metadata (migration markers)
  // ========================================================================================
  function createStoreMetadata(backend) {
    if (!backend || typeof backend.transact !== 'function') throw _err('R3_0E_STORE_BACKEND_INVALID');
    return {
      readVersion: function () {
        return backend.transact([STORE_NAMES.STORE_METADATA], 'readonly', function (tx) {
          return Promise.resolve(tx.get(STORE_NAMES.STORE_METADATA, '__r3_0e_version'));
        });
      },
      writeVersion: function (versionMap) {
        // Map of payload-class → schemaVersion. Idempotent.
        if (!versionMap || typeof versionMap !== 'object') return Promise.reject(_err('R3_0E_VERSION_INVALID'));
        return backend.transact([STORE_NAMES.STORE_METADATA], 'readwrite', function (tx) {
          tx.put(STORE_NAMES.STORE_METADATA, '__r3_0e_version', {
            versions: versionMap,
            updatedAt: _now(),
          });
          return true;
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
