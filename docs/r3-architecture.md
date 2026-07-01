# R3.0 — Architecture

The R3.0 series turns the analyzer from a setup calculator into a **case-centric, evidence-bounded analysis
workspace** with local persistence, an explicit-only comparison pipeline, an authoritative-only decision engine,
a per-store experiment / outcome / timeline / follow-up record set, and a hardening + migration layer.

This document is the runtime map: what the modules are, how they fit together, where the trust boundaries sit,
and which checks are fail-closed. Every conclusion the product surfaces carries **credibility and
limitations** at minimum; most also carry **confidence** and **provenance**. The remaining fields — what
names a fail-closed reason, what names the supporting evidence, what tells the user how to upgrade the
claim — exist on most producers but under **different field names per producer**, not one universal name:
`blockedReasons[]` (R3.0C credibility contract), `cannotConcludeReasonCodes[]` + `evidenceSummary[]` +
`nextValidationAction` (R3.0D Engineer Brief), `blockers[]` + `nextValidationAction` (R3.0C C6 export). The
R3.0E Outcome object is a structural exception: it carries `limitations[]` and `confounders[]` but has no
`credibility`, `confidence`, `provenance`, or "next validation step" field at all (see
`docs/r3-experiment-loop.md`). None of these fields is produced by the shell or view models.

The credibility ladder used throughout is:

> **Physics > Model > Measured > Derived > Heuristic > Unavailable.**

`Unavailable` is not a failure mode the UI hides — it is a named outcome with a machine-readable reason code.

---

## Topology

R3.0 is a single Electron app that is **also** a regular browser page. The two environments share one production
tree and one persistence contract; the host differences are confined to a small Electron boundary.

```
+----------------------------------- Electron Host (main.js / preload.js) -----------------------------------+
|  - contextIsolation: true, nodeIntegration: false explicitly set; no unsafe flag ever flipped on            |
|  - preload exposes EXACTLY { platform, version } on window.electronAPI — no IPC, no FS, no shell            |
|  - File:// origin loads renderer/index.html; CSP default-src 'self' 'unsafe-inline' 'unsafe-eval'           |
+-------------------------------------------------------------------------------------------------------------+
            |
            v
+--------------------------------------- Renderer / Production Tree ------------------------------------------+
|                                                                                                             |
|  R3.0A SHELL                                                                                                |
|     renderer/index.html  +  case-shell.js  (Alpine view-model + feature registry navigation)                |
|       - non-reactive caseDataHolder for raw / large state (sessions, imported bundles)                      |
|       - per-case nav availability re-derived from the capability the services compute                       |
|                                                                                                             |
|  R3.0B PERSISTENCE  (renderer/js/r3-0b-*.js)                                                                |
|     case-store, session-store, case-record-schema, schema-migration, storage-backend, case-library-vm       |
|       - IndexedDB in browser/Electron; MemoryBackend in Node tests                                          |
|       - atomic transact({stores, reads, compute})  — one readwrite txn per mutation                         |
|                                                                                                             |
|  R3.0C COMPARISON AUTHORITY  (contracts/r3.0c/* + renderer/js/r3-0c-*.js)                                   |
|     C2 lap + track identity                                                                                 |
|     C3 normalized distance authority                                                                        |
|     C4 reference selection (EXPLICIT user only) + corner segmentation + corner pairing                      |
|     C5 delta metrics (allowlisted; sign = comparison - reference)                                           |
|     C6 comparison export envelope                                                                           |
|     C7 comparison workspace view model                                                                      |
|     C8 activation (Feature Registry wiring)                                                                 |
|                                                                                                             |
|  R3.0D DECISION ENGINE  (contracts/r3.0d/* + renderer/js/r3-0d-*.js)                                        |
|     D2 evidence-graph builder (closure-private WeakSet authority)                                           |
|     D3 hypothesis engine (authoritative-only inputs)                                                        |
|     D4 priority engine                                                                                      |
|     D5 engineer brief generator                                                                             |
|                                                                                                             |
|  R3.0E EXPERIMENT / OUTCOME / TIMELINE / FOLLOW-UP STORES  (contracts/r3.0e/* + renderer/js/r3-0e-stores.js)|
|     experiment-store, outcome-store, timeline-store, followup-link-store, outcome-classifier, viewmodel     |
|       - independent versioned IndexedDB namespaces (r3_0e_*)                                                |
|       - append-only property is PER STORE (timeline-store), not per phase — see §R3.0E                      |
|                                                                                                             |
|  R3.0F INTEGRATED DELIVERY                                                                                  |
|     F1 r3-0f-migration-engine.js  (sanitize / structured-clone firewall / trap-free serializer / atomic txn)|
|     F2 e2e-harness               (9 flows: tests/e2e/flow-01..09-*.test.js)                                 |
|     F3 hardening probes          (6 probes: tests/e2e/hardening-01..06-*.test.js)                           |
|                                                                                                             |
+-------------------------------------------------------------------------------------------------------------+
```

A few invariants are global to the topology:

- **One process tree, two hosts.** The same module set is loaded under Electron and under a plain browser tab.
  No code path is conditional on `process` / `window.require` / `node:` — the shell never touches Node APIs.
- **No runtime LLM.** No phase calls a model at runtime. The decision engine, classifier, and brief generator
  are deterministic transforms of authoritative-only inputs.
- **No cloud, no multi-user, no telemetry beacon.** Persistence is local-first; nothing is
  auto-uploaded and the portable case bundle never carries raw telemetry. Raw telemetry CAN
  leave the device, but only through the explicit, opt-in `exportRawArchive(sessionId)` call
  (`session-store`, see below) — a separate user action from the case-bundle export.
- **Feature Registry is the navigation truth source.** A capability is reachable only if its feature ID is
  registered and `featureRegistryActivationAllowed` is `true` **for its own phase's governance state**. This
  is a per-phase flag, not one train-wide switch: R3.0C (`C8_ACTIVATION`), R3.0D
  (`D5_ENGINEER_BRIEF_ACTIVATION`), and R3.0E (`E5_ACTIVATION`) have each already flipped their own flag to
  `true` — the Comparisons pane, the Engineer Brief pane, and the Experiment Loop / Case Timeline panes are
  live in the shipped registry today. Only R3.0F's own flag remains `false` until `F6_RELEASE` (R3.0F has no
  case-scoped pane of its own to gate).

---

## Storage backends + R3.0B persistence

R3.0B is the layer that turns an Analysis Case from a transient view model into a **persistable, reopenable,
duplicable, archivable** local-first engineering record. Browser and Electron share one contract.

### Backend abstraction (`storage-backend.js`)

A namespaced async KV with one atomic primitive:

| API | Behaviour |
| --- | --- |
| `get(ns, key)` | Returns the stored value, or `undefined`. Never throws on missing. |
| `put(ns, key, value)` | Overwrite. |
| `add(ns, key, value)` | Create-if-absent; aborts on id collision. |
| `del(ns, key)` | Idempotent. |
| `list(ns)` | Returns the full `[{ key, value }]` array for the namespace. No `opts` parameter, no cursor/pagination API. |
| `estimateBytes(ns)` | Best-effort size accounting for quota probes. |
| `update(ns, key, fn)` | Single-key compare-and-set helper built atop `transact`. |
| `transact({ stores, reads, compute })` | All reads declared up-front; `compute(readValues)` is **synchronous and pure**; returns the writes + a result that are applied in ONE `readwrite` transaction. Commit-or-abort; quota → typed `STORAGE_QUOTA_EXCEEDED`. |

Two implementations:

- **`MemoryBackend`** — used by Node tests and any SSR-shaped environment. A global mutex + structured-clone at
  every boundary guarantees the test backend behaves like IndexedDB w.r.t. clone semantics and concurrency.
- **`IndexedDBBackend`** — used in the browser and Electron renderer. There is no silent fallback to memory:
  if IndexedDB is unavailable, the layer surfaces `STORAGE_UNAVAILABLE` and the UI blocks the relevant capability
  with a reason. A renderer that "looks empty" because IndexedDB silently degraded is exactly the failure mode
  this contract refuses.

### Case record + portable bundle (`case-record-schema.js`)

Two strictly different shapes:

- **Local record** — full sanitized analysis view model. `sanitizeForStorage` is **all-or-nothing**: JSON-safe;
  cyclic / non-plain / function values are rejected; bounded enumeration and size caps are enforced. Any node
  that violates → the save is **rejected**, never lossily stored. Raw telemetry sample arrays can never be
  written even locally — they exceed the bounds by construction.
- **Portable bundle** — a curated, strictly-allowlisted, value-constrained closed schema with enum vocabularies,
  code/id patterns, and length caps. Any off-allowlist or constraint-failing field is **excluded and logged**;
  required fields are validated; a future bundle version is rejected fail-closed. An imported bundle is stored
  as an explicitly-degraded `imported_summary` and is **never** promoted into a full local analysis.

### Schema migration (`schema-migration.js`)

`migrateCaseRecord` / `migrateSessionRecord` migrate older versions step-by-step. A **future** schema version is
**rejected fail-closed**, never coerced. Unknown fields on an older record are preserved on the local side
(silently dropping a field is treated as evidence loss). Migration is deterministic and produces a logged trace.

**Frozen v1.4.0 baseline.** The R3.0B `case-record-schema` was frozen at v1.4.0 and **has not been modified
through R3.0F**. Every downstream phase (D / E / F) carries an explicit `r3bCaseRecordSchemaUntouched: true`
governance assertion. R3.0E experiment / outcome / timeline / follow-up state lives in **independent versioned
IndexedDB namespaces** (`r3_0e_*`), not on the case record.

### Stores

| Store | Namespace | Notes |
| --- | --- | --- |
| `case-store` | `cases` + `caseIndex` (one atomic txn) | `create / save / open / duplicate / archive / unarchive / setPinned / remove(confirm:true) / list / exportCase / importBundle / compact`. `save`-update requires an existing entry — a deleted case is **not** resurrected. `delete` is fail-closed without `confirm:true`. |
| `session-store` | separate namespace | Raw telemetry is **byte-bounded** (`maxSessionBytes` / `maxRawBytes`); oldest-evicted with a bounded eviction log embedded in the index envelope so index/log can't diverge. Never auto-uploaded. Never in a portable case bundle. `exportRawArchive(id)` is an explicit opt-in distinct from the case export. |
| `experiment-store` | `r3_0e_experiments` + `r3_0e_experimentsIndex` | R3.0E — **mutable** (`create / update / get / list / remove`). See §R3.0E. |
| `outcome-store` | `r3_0e_outcomes` + `r3_0e_outcomesIndex` | R3.0E — API surface is `create / get / listForExperiment` (no update or remove API exposed). |
| `timeline-store` | `r3_0e_timelines` | R3.0E — **append-only** per-case event document. See §R3.0E. |
| `followup-link-store` | `r3_0e_followupLinks` + `r3_0e_followupLinksByCase` (reverse index) | R3.0E — `create / get / listForParent / markParentStatus`. **Not** append-only. |
| `store-metadata` | `r3_0e_storeMetadata` (key `__r3_0e_version`) | Per-namespace schema-version map: `experiment / outcome / timeline / followUpLink → 1`. |

### Honesty boundary

Persistence stores and restores the **services' outputs**. It never recomputes physics, never re-decides
eligibility, and never upgrades trust. Library indicators (telemetry-present, calibration-present, corner-eligible)
read **stored evidence** — they do not re-run the pipeline against the saved record.

---

## R3.0C — Comparison authority pipeline

R3.0C turns "two laps on the same track" into a defensible comparison. Every step here is
**authority, not presence**: a field merely existing on a lap is never treated as authoritative; eligibility is
re-derived from raw evidence on every run.

```
session laps  ─►  C2 lap authority ─►  C2 track identity  ─►  C3 normalized distance
                                                                      │
                                                                      v
                       C4 explicit reference selection  ─►  C4 corner segmentation
                                                                      │
                                                                      v
                                              C4 corner pairing  ─►  C5 delta metrics
                                                                      │
                                                                      v
                                            C6 comparison export envelope  /  C7 view model
                                                                      │
                                                                      v
                                                              C8 Feature Registry activation
```

### C2 — Lap and track identity

A lap is **valid** only if all five authorities agree:

1. **Lap identity** — a stable, declared lap id (no inference from filename / case title / channel name).
2. **Completeness** — the lap covers a full normalized lap window per its declared lap-distance authority.
3. **Timing validity** — non-monotonic timebase, gaps exceeding policy, or zero-duration laps → blocked.
4. **Track identity** — a declared track identity for the session. Track is **never inferred** from titles,
   filenames, or channel names.
5. **Sample continuity** — sample density and gap policies are evaluated against the supplied policy.

Any failure produces a frozen reason code (one of the 55+ in the R3.0C reason-code table) and no value.

### C3 — Normalized distance

The single authority for "where on a lap" is **lap-distance**. The C3 layer translates a declared lap-distance
series into a `[0, 1)` normalized axis after exhausting a 16-code refusal list (empty input, single sample, NaN /
Infinity, unsupported unit, unknown direction, non-monotonic in a non-wrap region, multiple wraps, insufficient
samples / coverage, gap too large in normalized or time domain, extrapolation requested, identity mismatch,
forged authority …). A series that fails any one is **blocked**, never smoothed.

GPS, lap-time fraction, sample index, and other proxies are not accepted as distance authority. They may exist
as channels; they are not promoted to a normalized axis.

### C4 — Reference selection, segmentation, pairing

**Reference selection is EXPLICIT USER SELECTION only.** There is no `fastest_valid`, no `median_valid`, no
`best_sector_composite`, no auto-fallback. The user picks a reference lap by id; absent a selection, the
comparison is **blocked with a reason**, not silently filled. This is a frozen scope-pin enforced by the train
validator.

**Corner segmentation** uses the normalized-distance axis and declared corner descriptors (when available) to
partition each lap into corner windows. Segmentation is fail-closed: a degenerate or absent descriptor leaves
the lap **unsegmented for that corner**, never approximated.

**Corner pairing** pairs reference corners to comparison corners by normalized-distance identity, not by index
or by name. A missing corner in one lap reduces aggregate coverage; below the minimum coverage threshold this
is recorded as the limitation `CORNER_PAIRING_PARTIAL_COVERAGE` (non-blocking — downstream consumers see the
limitation). Other corner-pairing failure modes have their own codes:
`CORNER_PAIRING_UNAVAILABLE`, `CORNER_PAIRING_INSUFFICIENT_OVERLAP`, `CORNER_PAIRING_AMBIGUOUS`, and
`CORNER_PAIRING_ORDINAL_FORBIDDEN`. There is no `CORNER_PAIRING_UNRESOLVED` code.

### C5 — Delta metrics

Allowlisted, signed metrics only:

| Metric | Sign convention | Credibility | Blocked when |
| --- | --- | --- | --- |
| Entry / mid / exit delta (per-corner) | comparison − reference | Derived | Required channels unavailable / pairing unresolved / normalization blocked |
| Speed / time deltas on shared normalized window | comparison − reference | Derived | Either side blocked upstream |
| Inputs delta (steering, throttle, brake) over shared window | comparison − reference | Derived | Channel missing or unconfirmed |

`delta = comparison − reference` is the **single convention**. The UI may never swap operands; the export
envelope carries the operand order verbatim. No metric reports a magnitude where any upstream gate is open.

### C6 / C7 — Export envelope and workspace view model

The comparison export envelope carries a fixed identity string `racing-analyzer/comparison-export`, distinct
from the R3.0B case-export schemas. The envelope validator **forbids raw / oversized arrays by construction**;
an envelope that fails validation cannot be emitted. The comparison view model assembled at C7 binds only to
service outputs; it never recomputes a delta, never re-decides eligibility, and surfaces every blocked metric
with its reason code.

### C8 — Activation

The Feature Registry's `case_comparison` / `reference_lap` / `corner_delta` IDs are registered with renderer
adapters at C8. The activation is gated by `featureRegistryActivationAllowed` in `governance/r3.0c/state.json`
— and that flag is **already `true`** (`C8_ACTIVATION`). The Comparisons surface is live in the registry
today (`availability: 'available'`, `rendererAdapter.paneId: 'comparisons'`, no `deferredReason`); it is not
deferred. R3.0F's own, separate `featureRegistryActivationAllowed` flag remains `false` until F6, but that
flag governs R3.0F's own (nonexistent) pane, not the already-activated R3.0C surface.

---

## R3.0D — Decision engine pipeline

R3.0D consumes authoritative R3.0C output (and the case context) and produces a structured **Engineer Brief**.
It does **not** run a model, does **not** call an LLM, does **not** claim causation from correlation, and does
**not** blame the driver.

```
authoritative case context  +  C5 delta metrics  +  observation
                              │
                              v
                 D2 evidence-graph builder   (closure-private WeakSet authority)
                              │
                              v
                 D3 hypothesis engine        (authoritative-only inputs verified)
                              │
                              v
                 D4 priority engine          (deterministic ordering)
                              │
                              v
                 D5 engineer brief           (frozen export; deep-frozen graph)
```

### D2 — Evidence graph

The evidence-graph builder ingests **only** values that pass authority verification. Once the graph is fully
validated, sanitized, and deep-frozen, the single materialized `graph` object is registered once in a
**closure-private WeakSet** (`_authoritativeGraphs`) — not per node; the WeakSet's only members are whole graph
objects, one per successful `buildEvidenceGraph` call. Downstream stages verify graph identity through a
`verifyAuthoritativeGraph` helper (checking WeakSet membership of the candidate graph object itself, plus
structural checks such as `schemaVersion`, `graphId`, and `Array.isArray(candidate.nodes)`) before reading any
field. A graph object constructed outside the builder cannot re-enter the pipeline — the WeakSet identity check
rejects it.

The graph carries an explicit `LIMITATION_IMPORTED_SUMMARY` propagation: a case opened from an imported bundle
carries the limitation forward through D2 → D3 → D5 so the Brief can't silently upgrade an `imported_summary`
into a full analysis.

`Array.isArray` (and other type predicates) are **captured at module load** so a later prototype tamper cannot
shift authority. The exported graph object is deep-frozen; the module's browser global is installed via
`Object.defineProperty` to refuse silent reassignment.

### D3 — Hypothesis engine

Hypotheses are derived deterministically from the verified graph. Each hypothesis carries the credibility ladder
rung supporting it (typically Derived or Heuristic for hypotheses, Physics or Model for the inputs cited as
evidence), the evidence references it depends on, and the limitations attached.

Forbidden hypothesis shapes:

- A causal claim from a correlation. Hypotheses use "consistent with" / "would be reduced by" framing; never
  "caused by".
- A driver-attribution claim about the vehicle. Driver behaviour ≠ vehicle characteristic ≠ setup finding.
- A magnitude that requires calibration the case does not carry. A hypothesis about understeer never quotes
  measured K_us absent the canonical 5-condition prerequisite set (see
  [r3-credibility-model.md](./r3-credibility-model.md) — same-case steady-state segment + verified road-wheel
  steering calibration + lateral-acceleration channel verified + speed channel verified + minimum sample / range
  coverage); it falls back to a directional tendency. Likewise a hypothesis about roll gradient never quotes a
  measured deg/g value absent a verified suspension installation ratio and a verified roll-rate channel — it
  remains a directional tendency, not a magnitude.

### D4 — Priority engine

A deterministic ordering of D3 hypotheses by a fixed scoring contract (evidence count, credibility rung,
limitation severity, comparison validity). The ordering is reproducible across runs given the same inputs; it
does **not** weight by user history, "interestingness", or any opaque signal. A tie-break order is declared and
covered by tests.

### D5 — Engineer brief

The Brief is the structured authoritative output: ordered hypotheses, evidence references, limitations,
blockers, comparison validity status, and a deferred-evidence list. It is **frozen** on emit; the consumer
cannot mutate it. A blocked Brief (e.g. comparison-invalid upstream) carries a reason code and no hypotheses;
an empty hypothesis list is not coerced into a "no issues" claim.

The Brief carries a generation token bound to the inputs; a stale Brief cannot be replayed against a different
case. Token-poisoning, retired-token replay, and blocked-prepare poisoning are explicit closure-tested
adversarial cases.

### What R3.0D refuses to be

- It is not a recommendation engine that applies a setup. No code path mutates a setup record from a Brief.
- It is not a measurement engine. Every magnitude in a Brief came from upstream services with their own
  credibility metadata, which the Brief carries forward verbatim.
- It is not a professional race-engineer replacement. This is a product-level positioning statement, not a
  Brief `limitations[]` entry: the closed `LIMITATION_*` reason-code enum (`contracts/r3.0d/reason-codes.js`)
  has no code for it, and `buildEngineerBrief`'s `limitations` union (`renderer/js/r3-0d-engineer-brief.js`)
  only ever admits values that pass `RC.isReasonCode`. The equivalent guarantee is enforced structurally
  instead: the causal-overclaim lexical scanner (`contracts/r3.0d/hypothesis-contract.js`
  `CAUSAL_OVERCLAIM_TERMS`, which includes `professional_diagnosis`) rejects the whole record with
  `HYPOTHESIS_CAUSAL_OVERCLAIM` if a Brief's text ever claims professional-diagnosis authority.
- **Setup-related recommendations are emitted in physical units (Nm/deg, N/mm, mm, %) only. Hardware-click
  counts are never emitted — no validated per-car click-to-rate mapping exists.** A user mapping clicks to
  physical rates is a manual, out-of-engine step.

---

## R3.0E — Experiment / outcome / timeline / follow-up stores

R3.0E records what the user **did about** a Brief: ran an experiment, observed an outcome, walked the case
timeline, scheduled a follow-up to another case. The four stores live in **independent versioned IndexedDB
namespaces** and are implemented in `renderer/js/r3-0e-stores.js`. The module header is explicit about the
boundary:

> R3.0E persistence lives in SEPARATE versioned stores and MUST NOT extend the frozen R3.0B portable
> case-record schema body.

Every payload is validated by its E1 contract **before write** inside `compute()`, re-validated on read, and
a future `schemaVersion` is rejected fail-closed. Persisted records carry **no runtime authority** — the D2
WeakSet identity is closure-private and cannot survive reload, so rehydration consumers must re-validate against
the E1 contracts before treating any value as authoritative. Writes go through the same
`backend.transact({ stores, reads, compute })` primitive as R3.0B.

### Per-store mutability — the append-only property is per store, not per phase

| Store | Mutation API | Append-only? | Cross-case allowed? |
| --- | --- | --- | --- |
| `experiment-store` (`r3_0e_experiments`) | `create / update / get / list / remove` | **No** | No |
| `outcome-store` (`r3_0e_outcomes`) | `create / get / listForExperiment` (no `update` / `remove` exposed) | API surface is **append-only by omission**; the store does not advertise itself as append-only the way `timeline-store` does | No (bound to an experiment within the same case) |
| `timeline-store` (`r3_0e_timelines`) | `getTimeline(caseId) / appendEvent(caseId, event)` | **Yes — strictly append-only** | No (per case) |
| `followup-link-store` (`r3_0e_followupLinks` + `r3_0e_followupLinksByCase`) | `create / get / listForParent / markParentStatus` | **No** — `markParentStatus(linkId, newStatus)` mutates state | No cross-case authority (see below) |

#### `experiment-store` — mutable, schema-guarded, stale-write-guarded

Records are keyed by `experimentId`; the index is keyed by `experimentId` and carries
`{ experimentId, sourceCaseId, status, createdAt, updatedAt }`. `update` enforces two guards:

- `existing.schemaVersion > SCHEMA_VERSIONS.experiment` → reject with `R3_0E_EXPERIMENT_FUTURE_SCHEMA`.
- `existing.createdAt !== rec.createdAt` → reject with `R3_0E_EXPERIMENT_STALE_WRITE`.

Reason codes: `R3_0E_EXPERIMENT_INVALID`, `R3_0E_EXPERIMENT_SCHEMA_MISMATCH`, `R3_0E_EXPERIMENT_ID_COLLISION`,
`R3_0E_EXPERIMENT_MISSING`, `R3_0E_EXPERIMENT_FUTURE_SCHEMA`, `R3_0E_EXPERIMENT_STALE_WRITE`,
`R3_0E_EXPERIMENT_CORRUPTED`.

#### `outcome-store` — create-only API surface

`outcomeStore.create / get / listForExperiment`. There is no `update` and no `remove` API exposed; in
practice the API surface is append-only, but the module does not declare itself with the strict append-only
invariants `timeline-store` uses. Reason codes: `R3_0E_OUTCOME_INVALID`, `R3_0E_OUTCOME_ID_COLLISION`,
`R3_0E_OUTCOME_FUTURE_SCHEMA`, `R3_0E_OUTCOME_CORRUPTED`.

#### `timeline-store` — the only strictly append-only store

`timeline-store` is keyed per case (`r3_0e_timelines`); the document shape is
`{ schemaVersion, caseId, events: [] }`. `appendEvent(caseId, event)` enforces, in order:

- **Duplicate `eventId`** within the same case → `R3_0E_TIMELINE_DUPLICATE_EVENT`.
- **Out-of-order timestamp** — `Date.parse(event.createdAt) < Date.parse(lastEvent.createdAt)` (or NaN on
  either side) → `R3_0E_TIMELINE_OUT_OF_ORDER`.
- **Future `schemaVersion`** → `R3_0E_TIMELINE_FUTURE_SCHEMA`.
- **Re-validation** of the resulting document shape via `validateCaseTimelineShape` before write.

A correction is therefore a **new event**, never a mutation of an existing event. Reason codes:
`R3_0E_TIMELINE_FUTURE_SCHEMA`, `R3_0E_TIMELINE_CORRUPTED`, `R3_0E_TIMELINE_DUPLICATE_EVENT`,
`R3_0E_TIMELINE_OUT_OF_ORDER`, `R3_0E_TIMELINE_INVALID`.

#### `followup-link-store` — mutable parent-status, reverse-index integrity

A link carries `linkId / parentCaseId / followUpCaseId / experimentId`. The reverse index is keyed by
`parentCaseId` and stores a `linkIds[]` payload. `listForParent(parentCaseId)` re-validates membership on every
read:

- Reverse-index row's `parentCaseId` must equal the caller-supplied `parentCaseId`, otherwise
  `R3_0E_LINK_CORRUPTED` `'reverse-index parentCaseId mismatch'`.
- Reverse-index `linkIds` must be an array, otherwise `R3_0E_LINK_CORRUPTED` `'reverse-index linkIds not array'`.
- Every fetched link's `parentCaseId` must equal the caller's `parentCaseId`, otherwise
  `R3_0E_LINK_CORRUPTED` `'reverse-index points at link with mismatched parentCaseId'`.

`markParentStatus(linkId, newStatus)` is a **mutation API**: the allowed statuses are exactly
`'present' / 'archived' / 'deleted'`; any other value is rejected with `R3_0E_LINK_PARENT_STATUS_INVALID`. The
follow-up link **never** carries comparison authority — cross-case comparison is forbidden by R3.0C.

Reason codes: `R3_0E_LINK_INVALID`, `R3_0E_LINK_ID_COLLISION`, `R3_0E_LINK_FUTURE_SCHEMA`,
`R3_0E_LINK_CORRUPTED`, `R3_0E_LINK_MISSING`, `R3_0E_LINK_PARENT_STATUS_INVALID`.

#### `store-metadata` — per-namespace schema-version map

`storeMetadata.readVersion() / writeVersion(versionMap)` against the metadata key `__r3_0e_version`. The
authoritative schema versions are `{ experiment: 1, outcome: 1, timeline: 1, followUpLink: 1 }`.

### Outcome classifier

`r3-0e-outcome-classifier.js` (authoritative entry `classifyOutcome(input, opts)`) accepts a **closed five-key
input wrapper** — `experiment`, `appliedChange`, `followUp` (same-case/same-session/explicit-reference/
comparability attestation), `observation` (direction/magnitude/evidence ids), and
`controlVariableObservations`. It never accepts a caller-provided `class`, `confounders`, or
`comparabilityScore`. The Outcome output has exactly thirteen keys, matching
`contracts/r3.0e/outcome-contract.js`'s `OUTCOME_KEYS`:

```
{ schemaVersion, outcomeId, experimentId, class, observedDirection, observedMagnitude,
  comparabilityScore, confounders, driverFeedback, dataQualityIssues, sideEffects,
  limitations, createdAt }
```

`class` is one of six values, ordered by precedence:

1. **`invalid_comparison`** — cross-case, cross-session (`followUp.sessionId !== followUp.parentSessionId`),
   no explicit reference, or `comparabilityScore < 0.5`. Takes precedence over every other class.
2. **`inconclusive_due_to_confounders`** — a control variable declared in `experiment.controlVariables` is
   missing from the observed set, or an observed one has `withinRange !== true`.
3. **`inconclusive`** — `observation.dataQualityIssues.length` exceeds a fixed threshold (4), or
   `observation.observedDirection === null`.
4. **`contradicted`** — `observation.contradictingEvidenceIds` is non-empty, or the observed direction does
   not match `experiment.expectedDirection`.
5. **`confirmed`** — observed direction matches the expected direction AND `observedMagnitude` falls within
   `experiment.expectedMagnitudeRange`.
6. **`partially_confirmed`** (fallback) — observed direction matches but the magnitude falls outside the
   expected range.

There is no `refuted` class, no `cannotConclude` class, and no credibility-floor gate in this classifier —
classification is driven entirely by the structural checks above. See `docs/r3-experiment-loop.md` "Outcome
classes" for the full table with file:line grounding.

### Honesty contract for the experiment loop

The experiment + outcome + timeline + follow-up stores record intent and observation. They do **not** validate
that a setup change "worked" beyond what the comparison authority and controlled-variable bookkeeping can
support. A `confirmed` outcome is a structured statement that *the controlled change is consistent with the
observed comparison delta within declared limitations* — not a measured performance gain.

---

## R3.0F — Migration engine, e2e flows, hardening probes

R3.0F is three things in one phase: the migration engine that bridges persisted records to the runtime, the
end-to-end flow harness that exercises the full product path, and the hardening probes that assert the
fail-closed boundaries hold under pressure.

### F1 — Migration engine

The migration engine (`renderer/js/r3-0f-migration-engine.js`) is **deterministic**, **fail-closed**, and
assumes nothing about the provenance of its input. The public factory is:

```
createMigrationEngine({ backend, registry?, metaStore?, journalKey?, stateKey?,
                        clock?, stamp?, maxJournalEntries?, maxRecordBytes? })
  -> { detect, plan, migrate, journal, envelope, knownStores }
```

- `detect()` → frozen `{ ok, currentEnvelope?, targetEnvelope, perStoreStatus, knownStores, envelopeMismatch }`.
- `plan()` → frozen `{ ok, generatedAt, steps, blockers, perStoreSummary }`.
- `migrate({ confirm: true })` → frozen `{ ok, report | reasonCode }`. `confirm:true` is required;
  any other value short-circuits with `CONFIRM_REQUIRED`.
- `journal()` → frozen array of journal entries (most recent last).
- `envelope()` → frozen target envelope.
- `knownStores()` covers `cases`, `sessions`, `r3_0e_experiments`, `r3_0e_outcomes`, `r3_0e_timelines`,
  `r3_0e_followupLinks`. (`detect()`'s return value also carries a separate `knownStores` array field with
  the same contents.)

Meta is persisted in the `meta` store under `__r3_0f_migration_journal__` (journal) and
`__r3_0f_migration_state__` (state); journals retain `MAX_JOURNAL_ENTRIES_DEF = 256` entries (overflow factor
4 → `JOURNAL_OVERFLOW`), and `maxJournalEntries` is overridable via constructor. Record-integrity hashes are
FNV-1a 64 (non-cryptographic) per F1-R1-08.

The engine is built from four layered defences, in order.

#### 1. `_sanitize` — JSON-safe shape gate (actual limits)

`_sanitize` is run on every record before it touches a downstream module. The actual structural limits, read
from `renderer/js/r3-0f-migration-engine.js`, are:

| Walker | Depth cap | Effect at cap |
| --- | --- | --- |
| `_isJsonSafe` | **256** | `if (depth > 256) return false;` — record rejected as not JSON-safe. |
| `_isAccessorFreeDescriptorTree` | **256** | `if (depth > 256) return false;` — descriptor walk fails closed. |
| `_safeJsonStringify` | **256** | `if (depth > 256) return null;` — serializer fails closed. |
| `_containsAttestationField` | **64** | `if (depth > 64) return true;` — depth-bomb defence treats the input as attestation-suspect. |

There is **no universal `Array.length ≤ 256` cap and no depth-12 cap** anywhere in `_sanitize` /
`_isJsonSafe` / `_safeJsonStringify`. Arrays are walked element-by-element, bounded only by the depth-256
ceiling above and by the byte cap below. The effective size ceiling is the byte cap:

- `MAX_RECORD_BYTES_DEF = 8_000_000` (**8 MB**), enforced by `_safeJsonStringify` length against
  the engine's captured `String.prototype` methods. Override via the `maxRecordBytes` constructor option.
  Exceeding the cap → `RECORD_TOO_LARGE`.

`_isJsonSafe` rejects:

- `BigInt`, `function`, `symbol`,
- `NaN` / `Infinity` (non-finite numbers),
- `Date` / `Map` / `Set` / `RegExp` / typed arrays — any value whose prototype is not `Object.prototype` and
  not `null`,
- accessor descriptors and any descriptor lacking the `value` key (pre-clone walk via
  `_isAccessorFreeDescriptorTree`),
- `Proxy` inputs (caught by the structured-clone firewall below).

`undefined` **on a property** is JSON-safe — it is stripped by JSON serialization per ECMA-262 §25.5.2, and
the R3.0B `importBundle` already relies on this (`schema: undefined`).

A sanitize failure is a typed error with a path pointer; the migration aborts, the existing record stays
intact, and the UI surfaces a readable block. Sanitize reason codes: `RECORD_NOT_AN_OBJECT`,
`PROXY_INPUT_REJECTED`, `RECORD_CIRCULAR`, `RECORD_TOO_LARGE`.

#### 2. Structured-clone-only firewall

After sanitize passes, every record crosses module boundaries through a **structured-clone-only firewall**.
The engine refuses to construct at module load if `structuredClone` is unavailable, and rejects an input that
`structuredClone` throws on (`PROXY_INPUT_REJECTED`). A caller cannot retain a live reference into the engine's
internal graph and a producer cannot pass a captured prototype through. The clone semantics are exactly the
ones `MemoryBackend` already used at every R3.0B boundary, lifted to a per-call contract.

#### 3. Trap-free serializer

When the engine has to emit a string (export envelopes, debug artifacts, integrity hashes), it routes through
the **trap-free `_safeJsonStringify`** built on the closure-captured `Array.isArray`, captured
`Object.prototype.hasOwnProperty`, captured `String.prototype` / `Number.prototype` methods invoked through
`_ReflectApply`, and own-enumerable-key enumeration that ignores accessors. A `toJSON` method on an input is
**not honoured** — the serializer is producer-attestation-defended: the producer does not get to decide what
its own bytes look like. `JSON.stringify` is intentionally **not** used post-clone, to neutralize hostile
`Object.prototype.toJSON` hooks added after engine load.

The engine also defends a producer-attestation field-name allowlist. The 15 sentinel field names are:
`_authoritative`, `_producerAttested`, `_attested`, `__attested`, `_verified`, `__verified`, `_signature`,
`__signature`, `_proof`, `__proof`, `_authority`, `__authority`, `_authoritativeSession`, `_authoritativeCase`,
`_authoritativeOutcome`. The 7 tokens are `authoritative`, `producerattested`, `attested`, `verified`,
`signature`, `proof`, `authority`. A key is refused if its NFKC-lowercased form exactly matches a sentinel name
**or** the key starts with `_` (normalized) and contains one of the tokens. Ordinary fields such as
`lapAuthority` / `projectionSignature` / `experimentVerified` pass — the rule is a sentinel match, not a
keyword scan. Defang is via the regex
`/[\p{Default_Ignorable_Code_Point}\p{Mn}\p{Cc}\p{Cs}\p{White_Space}⠀]/gu`. A refused field surfaces
`PRODUCER_ATTESTATION_REFUSED`. **F1 never fabricates an attestation field on its own output.**

#### 4. Atomic `transact` with TOCTOU defence

All migration writes go through the R3.0B `transact({ stores, reads, compute })` primitive. `reads` are
declared up front; `compute` is synchronous and pure; the writes are committed or aborted as one. Per
F1-R1-03, the commit covers the store writes AND the journal AND the migration state in **one atomic
`backend.transact()`** across all stores + META — there is no in-between state where two writers can race.

The migrator-result boundary further enforces an explicit closed enum: `ok` must be an explicit boolean;
`migrationsApplied` must be an array of plain strings; `reason` must be one of the envelope reason codes (or
mapped to `NO_MIGRATION_PATH`). The full envelope reason-code set is `UNSUPPORTED_FUTURE_VERSION`,
`NO_MIGRATION_PATH`, `RECORD_NOT_AN_OBJECT`, `RECORD_BAD_VERSION`, `RECORD_TOO_LARGE`, `RECORD_CIRCULAR`,
`PROXY_INPUT_REJECTED`, `POST_MIGRATION_INVALID`, `MIGRATOR_THREW`, `BACKEND_REJECTED`, `CONFIRM_REQUIRED`,
`ENVELOPE_VERSION_MISMATCH`, `JOURNAL_OVERFLOW`, `PRODUCER_ATTESTATION_REFUSED`. Envelope `status` is one of
`migrated / no-op / rejected / failed`.

The migration engine is the first F-phase module with `runtimeConsumersAllowed = true` and
`algorithmsAllowed = true`. R3.0F's own `featureRegistryActivationAllowed` remains `false` until F6 —
the migration engine has no case-scoped pane of its own to gate. (This is separate from R3.0C/D/E's own
activation flags, which have already flipped to `true` for their respective phases — see "Feature Registry
is the navigation truth source" above.)

### F2 — End-to-end flow harness (9 flows)

Nine flows under `tests/e2e/flow-{01..09}-*.test.js` drive the production tree from cold start through
import, comparison, brief, experiment, follow-up, and Electron smoke. The exact filenames and purposes are:

| File | Purpose |
| --- | --- |
| `tests/e2e/flow-01-new-user.test.js` | New-user empty-state journey. A fresh `MemoryBackend()` instance (Node-only logic harness, not IndexedDB or a browser — see `tests/e2e/helpers/flow-harness.js:44`) produces a deterministic empty Case Library; F1 reports zero records; envelope at v1; forbidden actions (auto reference lap / auto setup apply / runtime-LLM authority / causation / driver blame) disabled. Zero console error. |
| `tests/e2e/flow-02-real-telemetry.test.js` | Real telemetry import. |
| `tests/e2e/flow-03-measured.test.js` | Measured-metrics flow. |
| `tests/e2e/flow-04-reference-lap.test.js` | Reference-lap explicit selection (no auto fastest / median / best-sector composite). |
| `tests/e2e/flow-05-vre.test.js` | VRE / R3.0D Engineer Brief on authoritative-only inputs. The brief does **not** classify, claim causation, blame the driver, or take runtime-LLM authority — it is a **read projection** of upstream services. |
| `tests/e2e/flow-06-setup-experiment.test.js` | Setup experiment create + timeline append-only. Appends an `outcome_classified` timeline event directly (does not call `classifyOutcome`). A correction is a NEW timeline event, not a mutation of an existing one. |
| `tests/e2e/flow-07-driver-experiment.test.js` | Driver experiment with follow-up Case link. Follow-up Case Links carry **no comparison authority** (cross-case forbidden). Attempts `followupLinkStore.create(link)`; does not exercise `listForParent` or `markParentStatus`. |
| `tests/e2e/flow-08-export-import.test.js` | Case export + reimport. |
| `tests/e2e/flow-09-electron-smoke.test.js` | Electron startup smoke. Reads `package.json` to confirm `electron` is a declared devDependency with a valid semver range; `main.js` has a stable entry shape; the preload exposes only the minimal `contextBridge` surface; no `nodeIntegration` leak. Does **not** invoke the `electron` binary, launch a window, or render UI. |

### F3 — Hardening probes (6 probes)

Six adversarial probes under `tests/e2e/hardening-{01..06}-*.test.js` (133 assertions across the suite)
target the fail-closed boundaries identified earlier in this document:

| File | Target |
| --- | --- |
| `tests/e2e/hardening-01-electron-boundary.test.js` | Electron preload surface is exactly `{ platform, version }`; no IPC channel, no FS, no shell spawn, no `webContents` exposure. Drift fails the gate. |
| `tests/e2e/hardening-02-storage-failure.test.js` | `case-store.remove` requires explicit `confirm:true` (`CONFIRM_REQUIRED` otherwise); a `backend.transact` failure leaves the source record completely unchanged (`BACKEND_REJECTED`, status `halted`, no partial write); an oversized record is rejected by the record-bytes cap. |
| `tests/e2e/hardening-03-no-stale-ui.test.js` | After a Case/Session transition, no viewmodel retains a stale case-id reference, across the full documented set of case-id-bearing fields (`lastSession.*`, `cachedCaseId`/`sourceCaseId`/`priorCaseId`/`parentCaseId`/`followUpCaseId`, R3.0C C8 `lastReassertion.caseId`, R3.0D `currentBrief.caseAssociation`, R3.0E `currentExperiment`/`currentOutcome`/`currentTimeline.caseAssociation`) — verified against a real R3.0E experiment record's production shape, not just a synthetic object. |
| `tests/e2e/hardening-04-large-library.test.js` | The case-store + F1 migration engine scale **bounded-linear**, not quadratic, as library size grows — verified by counting `backend.list`/`get`/`transact` operations at `N` and `2N`. |
| `tests/e2e/hardening-05-xss-injection.test.js` | Static scan confirming the renderer never pipes user-supplied or case-derived text into `innerHTML` or `document.write`. |
| `tests/e2e/hardening-06-supply-chain.test.js` | `package.json` declares only the known Electron/electron-builder dependencies; no production renderer module pulls a bare third-party `require()`; no `package.json` script references untrusted tooling; no committed secrets/API keys/`.env` files. (The probe also checks for `CHANGELOG.md`'s presence, but that check is hardcoded non-fatal — `chk('CHANGELOG.md presence check is non-fatal at F3', true)` — and passes unconditionally regardless of whether the file exists.) |

---

## Electron host boundaries

The Electron host is deliberately thin.

```
main.js       — creates a BrowserWindow; webPreferences below
preload.js    — exposes exactly { platform, version } onto window.electronAPI
renderer/     — runs as if it were a browser tab; never imports node:* / electron / fs / child_process
```

`main.js`'s `BrowserWindow` `webPreferences` object literal explicitly sets exactly three keys:

| Option | Value | Why |
| --- | --- | --- |
| `preload` | path to `preload.js` | The only privileged surface. |
| `contextIsolation` | `true` | Renderer cannot reach into the preload's realm. |
| `nodeIntegration` | `false` | No `require` / `process` / `Buffer` in the renderer. |

No other `webPreferences` key (`sandbox`, `webSecurity`, `allowRunningInsecureContent`,
`nodeIntegrationInWorker`, `nodeIntegrationInSubFrames`, `enableRemoteModule`) is present in the object
literal — they are absent, not explicitly hardened, and Electron's own defaults apply. The F3 boundary
probe (`tests/e2e/hardening-01-electron-boundary.test.js`) does not assert these are explicitly set; it
asserts `contextIsolation`/`nodeIntegration` are each declared exactly once with their safe literal value,
and that none of the other keys is ever explicitly flipped to an unsafe value (e.g. `sandbox: false`,
`webSecurity: false`, `nodeIntegration: true`) — a regression that adds an explicit unsafe flag fails
closed; a contributor who never touches these keys does not.

`renderer/index.html` declares `Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval'`.
This restricts the default fetch directive — and therefore `connect-src`, which falls back to `default-src`
when unset — to the app's own origin, so no remote network destination is reachable from a CSP standpoint.
It does **not** block inline `<script>` tags or `eval()` (`'unsafe-inline'`/`'unsafe-eval'` are explicitly
allowed), and the policy has no `object-src 'none'`, `base-uri 'self'`, or `frame-ancestors 'none'`
directive. The F3 probe only asserts `default-src 'self'` is present in the declared policy.

The preload surface is **exactly** `{ platform, version }` exposed via `contextBridge.exposeInMainWorld`
under the name `electronAPI` (`window.electronAPI`). There is no `ipcRenderer.invoke` channel, no FS
access, no shell spawn, no `webContents` exposure. A renderer-side feature that "would need a native API" is
either solved without one or stays out of scope. The F3 boundary hardening probe
(`hardening-01-electron-boundary.test.js`) verifies this no-IPC contract byte by byte against an expected
schema and fails closed on any drift — a preload that grew an unexpected property would block the release
gate.

---

## Determinism + fail-closed contracts

### Determinism

R3.0 production paths are deterministic by construction:

- **No `Math.random` in analysis/decision paths.** Sampling, ordering, and pairing are deterministic. Where a
  random source would be tempting (tie-breaking, jitter), an explicit declared rule replaces it. The sole
  exception is opaque local storage key generation — `case-store.js`'s and `session-store.js`'s `_newId()`
  helpers use `Math.random()` (mixed with `Date.now()`) to mint `caseId`/`sessionId` strings when the caller
  does not supply one; these ids are never inputs to sampling, ordering, pairing, or any credibility/decision
  computation, only opaque storage keys.
- **No wall-clock dependence in decision logic.** Time values consumed by the decision engine come from
  declared monotonic record timestamps, not `Date.now()`. R3.0E records use a monotonic `createdAt` derived
  from the platform clock at insertion, never re-evaluated downstream — and `timeline-store` rejects
  out-of-order timestamps with `R3_0E_TIMELINE_OUT_OF_ORDER`.
- **No floating-point ordering drift.** Comparators carry an explicit tie-break rule; integer-key sort orders
  are preferred where one is available.
- **Captured intrinsics.** D2 captures `Array.isArray` and similar predicates at module load so a later tamper
  cannot retroactively shift authority. The migration engine captures `Object.*` / `Array.*` / `JSON.*` /
  `String.*` / `Number.*` at module load for the same reason, and requires `structuredClone` to be available
  at module load or it refuses to construct.

### Fail-closed contracts (consolidated)

| Layer | Open the gate when | Fail-closed when | Substitute offered |
| --- | --- | --- | --- |
| Storage | IndexedDB available + quota present | `STORAGE_UNAVAILABLE` / `STORAGE_QUOTA_EXCEEDED` | Block save; readable error in UI. |
| Case record | Sanitize all-or-nothing pass | Any unbounded value / unsupported type / cycle / prototype drift | Reject save; existing record untouched. |
| Portable bundle | Strict allowlist + value constraints satisfied | Off-allowlist or constraint failure | Field excluded + logged; required-field failure rejects the bundle. |
| Migration (`_sanitize`) | All four walks pass: `_isJsonSafe` (depth ≤ 256), `_isAccessorFreeDescriptorTree` (depth ≤ 256), `_safeJsonStringify` (depth ≤ 256), byte size ≤ `MAX_RECORD_BYTES_DEF` (8 MB or override) | Depth exceeded, non-plain prototype, accessor descriptor, BigInt/symbol/function/non-finite number, cyclic, Proxy input, byte cap exceeded | `RECORD_NOT_AN_OBJECT` / `PROXY_INPUT_REJECTED` / `RECORD_CIRCULAR` / `RECORD_TOO_LARGE`; record stays at prior schema; UI blocks the capability with a reason. |
| Migration envelope | Migrator result is well-shaped + writes commit atomically | Future version, missing path, post-migration invalid, migrator threw, backend rejected, confirm missing, envelope-version mismatch, journal overflow, producer-attestation field | One of the 14 envelope reason codes; envelope `status ∈ { migrated, no-op, rejected, failed }`. |
| C2 lap | All 5 authorities pass | Any single authority blocks | Reason code, no value. |
| C3 distance | Declared lap-distance authority + policy pass | Any of 16 distance reason codes | Reason code, no normalized axis. |
| C4 reference | Explicit user selection present | No selection (no auto fastest_valid / median / best_sector_composite) | `REFERENCE_NOT_SELECTED`; comparison blocked. |
| C4 segmentation / pairing | Corner descriptor present and unambiguous | Degenerate / missing / unresolved pairing | Per-corner block; other corners unaffected. |
| C5 delta | Pairing + normalization + channel availability | Any upstream gate open | Per-metric block. |
| C6 export | Envelope validator passes | Raw / oversized arrays / off-allowlist fields | Envelope refused; no emission. |
| D2 graph | Authoritative inputs verified via WeakSet | Any input not WeakSet-member | Graph build aborts. |
| D3 hypothesis | Verified graph + inputs satisfy hypothesis preconditions | Any precondition fails (e.g. no calibration for a magnitude claim) | Hypothesis downgraded to directional or omitted. |
| D5 brief | Deep-frozen emit; generation token bound to inputs | Token stale / retired / replayed against a different case | Brief refused. |
| R3.0E timeline | Append-only invariants pass (unique `eventId`, monotonic `createdAt`, current schema, shape re-validated) | Duplicate / out-of-order / future schema / shape mismatch | Reason code, no append. |
| R3.0E follow-up link | `parentCaseId` matches reverse index AND link; `markParentStatus` in `{present, archived, deleted}` | Reverse-index mismatch / non-array / status off-allowlist | `R3_0E_LINK_CORRUPTED` / `R3_0E_LINK_PARENT_STATUS_INVALID`. |
| Outcome classifier | Same-case/same-session/explicit-reference attestation + control-variable observations | Cross-case, cross-session, no reference, low comparability, or a missing/out-of-range control variable | `invalid_comparison` (highest precedence) or `inconclusive_due_to_confounders` with the specific limitation code. |
| Feature Registry | `featureRegistryActivationAllowed === true` | Otherwise | Feature deferred (navigation hidden / disabled). |

### What this means for the user

The product never invents a number to fill a gap. When a metric or recommendation is unavailable, the UI says
**why** in concrete terms ("no explicit reference lap selected", "lap-distance authority missing on this
session", "no road-wheel steering calibration — directional tendency offered instead"). The directional /
qualitative substitute is offered where it is honestly available; otherwise the capability is blocked.

### Frozen invariants summarized

- **R3.0B case-record schema** — frozen at v1.4.0, untouched through R3.0F. Every D / E / F phase carries an
  explicit `r3bCaseRecordSchemaUntouched: true` governance assertion.
- **Preset count** — 501. The R2 preset library equivalence guard remains green through every R3 phase.
- **`package.json` version** — `1.4.0`. The version bump to `2.0.0` is staged at F6 (Release Gate). Until F6,
  any version drift fails the train validator closed.
- **`featureRegistryActivationAllowed`** is a per-phase flag, not one train-wide switch. R3.0C, R3.0D, and
  R3.0E have each already flipped their own flag to `true` at their respective `*_ACTIVATION` checkpoints —
  the Comparisons, Engineer Brief, Experiment Loop, and Case Timeline panes are reachable to the user today.
  Only R3.0F's own flag remains `false` until `F6_RELEASE` (R3.0F introduces no case-scoped pane of its own).
- **`runtimeConsumersAllowed`** — `true` since F1. The migration engine is the first F-phase runtime consumer.
- **Comparison scope** — same-case + same-session only. Cross-case and cross-session are permanently forbidden.
- **Delta sign** — `comparison − reference`. Single convention. No alternate.
- **Reference selection** — explicit user only. `fastest_valid / median_valid / best_sector_composite` are
  permanently disabled.
- **R3.0E append-only is per store, not per phase.** Only `timeline-store` is strictly append-only.
  `experiment-store` exposes `create / update / remove`; `follow-up-link-store` exposes `markParentStatus`;
  `outcome-store` exposes `create / get / listForExperiment` only. The honesty contract is preserved through
  schema-version, stale-write, duplicate-event, out-of-order, and reverse-index guards.
- **No intermediate release, and no branch protection bypass.** No tag, no GitHub release, no semver bump
  between R3.0C and F6; the R3-GATE0 ruleset on `main` (required PR + required `trusted-verification` check +
  no force-push + no deletion, 0 bypass actors) holds across every R3 phase. A force-merge or rule-bypass would
  fail the governance verification step that every phase asserts.
- **R4 is out of scope for this release.** Any capability id whose name matches `^r4_` / `^r40_` / `^r4.0_` /
  `^r4.` is refused at the schema layer — the regex list is an enforcement mechanism, not a teaser. The R3.0
  release does not reference, ship, or pre-wire R4 features.

### What this architecture is NOT

- **Not a professional race-engineer replacement.** This is a product-level positioning statement, not a
  Brief `limitations[]` entry — see "What R3.0D refuses to be" above for the structural (causal-overclaim
  scanner) mechanism that enforces the equivalent guarantee.
- **Not a full multi-body-dynamics simulator.** The physics core remains the steady-state single-point model
  R2 established.
- **Not a complete tyre model.** Tyre evidence is consumed where it exists; tyre state is not synthesized.
- **Not a GPS racing-line / lap-optimization tool.** GPS is not promoted to a distance authority.
- **Not a telemetry decoder for arbitrary binary formats.** The supported import paths are the ones R2.3+
  declared; the rest are blocked.
- **Not a measurement device.** Nothing measured is claimed without the data + calibration to back it; nothing
  is fabricated to fill a gap. Synthetic stays synthetic.

The R3.0 phases compose into a workflow that records what the user has, what the services could conclude from
it, what they refused to conclude and why, what the user tried next, and what happened. That composition is
the entire runtime and topology contract of the R3.0 release; conclusions about what the user *should do next*
remain the user's, informed by the structured evidence the services surface.
