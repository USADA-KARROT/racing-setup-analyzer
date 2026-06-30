# R3.0 — Architecture

The R3.0 series turns the analyzer from a setup calculator into a **case-centric, evidence-bounded analysis
workspace** with local persistence, an explicit-only comparison pipeline, an authoritative-only decision engine,
an append-only experiment loop, and a hardening + migration layer.

This document is the runtime map: what the modules are, how they fit together, where the trust boundaries sit,
and which checks are fail-closed. Every conclusion the product surfaces carries
**credibility · confidence · provenance · limitations · blockers · evidence references · next validation step**;
those fields are produced by the services described here, never by the shell or view models.

The credibility ladder used throughout is:

> **Physics > Model > Measured > Derived > Heuristic > Unavailable.**

`Unavailable` is not a failure mode the UI hides — it is a named outcome with a machine-readable reason code.

---

## Topology

R3.0 is a single Electron app that is **also** a regular browser page. The two environments share one production
tree and one persistence contract; the host differences are confined to a small Electron boundary.

```
+----------------------------------- Electron Host (main.js / preload.js) -----------------------------------+
|  - contextIsolation: true, nodeIntegration: false, sandbox: true (default)                                  |
|  - preload exposes EXACTLY { platform, version } — no IPC, no FS, no shell, no module require               |
|  - File:// origin loads renderer/index.html; no remote module loader; CSP enforced                          |
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
|  R3.0E EXPERIMENT LOOP  (contracts/r3.0e/* + renderer/js/r3-0e-*.js)                                        |
|     experiment-store, outcome-store, timeline-store, followup-link-store, outcome-classifier, viewmodel     |
|       - independent IndexedDB namespaces; append-only; monotonic createdAt; case-scoped                     |
|                                                                                                             |
|  R3.0F INTEGRATED DELIVERY                                                                                  |
|     F1 migration-engine.js  (sanitize / structured-clone-only firewall / trap-free serializer / atomic txn) |
|     F2 e2e-harness         (9 flows, browser + Electron)                                                    |
|     F3 hardening probes    (boundary / storage failure / no-stale-UI / large library / XSS / supply-chain)  |
|                                                                                                             |
+-------------------------------------------------------------------------------------------------------------+
```

A few invariants are global to the topology:

- **One process tree, two hosts.** The same module set is loaded under Electron and under a plain browser tab.
  No code path is conditional on `process` / `window.require` / `node:` — the shell never touches Node APIs.
- **No runtime LLM.** No phase calls a model at runtime. The decision engine, classifier, and brief generator
  are deterministic transforms of authoritative-only inputs.
- **No cloud, no multi-user, no telemetry beacon.** Persistence is local-first; raw telemetry never leaves the
  device through any export path.
- **Feature Registry is the navigation truth source.** A capability is reachable only if its feature ID is
  registered and `featureRegistryActivationAllowed` is `true` for its phase. Until F6, that flag is `false`.

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
| `list(ns, opts)` | Bounded enumeration; opaque cursors only. |
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
  cyclic / non-plain / function values are rejected; every array bounded at 256 elements; depth ≤ 12; total
  size capped. Any node that violates → the save is **rejected**, never lossily stored. Raw telemetry sample
  arrays can never be written even locally — they exceed the bounds by construction.
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
governance assertion. Hypothesis / experiment / outcome / follow-up / timeline state lives in **independent
IndexedDB namespaces**, not on the case record.

### Stores

| Store | Namespace | Notes |
| --- | --- | --- |
| `case-store` | `cases` + `caseIndex` (one atomic txn) | `create / save / open / duplicate / archive / unarchive / remove(confirm:true) / list / exportCase / importBundle / compact`. `save`-update requires an existing entry — a deleted case is **not** resurrected. `delete` is fail-closed without `confirm:true`. |
| `session-store` | separate namespace | Raw telemetry is **byte-bounded** (`maxSessionBytes` / `maxRawBytes`); oldest-evicted with a bounded eviction log embedded in the index envelope so index/log can't diverge. Never auto-uploaded. Never in a portable case bundle. `exportRawArchive(id)` is an explicit opt-in distinct from the case export. |
| `experiment-store` | `r3_0e_experiments` + `Index` | R3.0E — see below. |
| `outcome-store` | `r3_0e_outcomes` + `Index` | R3.0E — append-only. |
| `timeline-store` | `r3_0e_timelines` | R3.0E — append-only per case. |
| `followup-link-store` | `r3_0e_followupLinks` + reverse index | R3.0E — case-scoped link graph. |

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
or by name. Mis-paired corners (e.g. a missing corner in one lap) are surfaced as `CORNER_PAIRING_UNRESOLVED`
and excluded from delta computation.

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
adapters at C8. The activation is gated by `featureRegistryActivationAllowed` in the phase governance state.
Until F6, that flag is `false` and the Comparisons surface is deferred at the registry layer even though the
production modules exist and pass tests.

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

The evidence-graph builder ingests **only** values that pass authority verification. Each accepted node is
recorded in a **closure-private WeakSet** (`_authoritativeGraphs`); downstream stages verify membership through
a `verifyAuthoritativeGraph` helper before reading any field. A graph constructed outside the builder cannot
re-enter the pipeline — the WeakSet identity check rejects it.

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
- It is not a professional race-engineer replacement. The Brief states this in its limitations.
- **Setup-related recommendations are emitted in physical units (Nm/deg, N/mm, mm, %) only. Hardware-click
  counts are never emitted — no validated per-car click-to-rate mapping exists.** A user mapping clicks to
  physical rates is a manual, out-of-engine step.

---

## R3.0E — Experiment loop stores

R3.0E records what the user **did about** a Brief: ran an experiment, observed an outcome, scheduled a follow-up.
The stores are append-only, case-scoped, and live in independent IndexedDB namespaces.

| Store | Append-only? | Cross-case allowed? | Notes |
| --- | --- | --- | --- |
| `experiment-store` (`r3_0e_experiments`) | Yes | No | Each experiment carries a parent caseId, a snapshot of inputs, applied change, control variables, stop conditions, and a monotonic `createdAt`. |
| `outcome-store` (`r3_0e_outcomes`) | Yes | No | An outcome is bound to an experiment id within the same case. `outcome-on-draft` rejection guards against attaching an outcome to a not-yet-final experiment. |
| `timeline-store` (`r3_0e_timelines`) | Yes | No | Per-case timeline entries; ordered by monotonic `createdAt`. |
| `followup-link-store` (`r3_0e_followupLinks` + reverse index) | Yes | No (cross-case forbidden) | Each link carries `linkId / parentCaseId / followUpCaseId / experimentId`. `caseAssociation` cross-case is forbidden; the store validates parent membership per fetched link via the reverse index. |

### Outcome classifier

`outcome-classifier.js` accepts **authoritative-only inputs** (the Experiment record, the applied-change record,
the comparison authority, the controlled variables). It never accepts a caller-provided final outcome. The
output shape is:

```
{ class, reasonCodes, supportingEvidenceIds, contradictingEvidenceIds,
  controlledVariableIntegrity, comparisonValidity, expectedVsObserved,
  limitations, cannotConclude, provenance, createdAt, generationToken }
```

`class` is one of five values: **`confirmed` / `refuted` / `inconclusive` / `invalid_comparison` /
`cannotConclude`**. The classes are mutually exclusive and ordered by precedence:

- **`invalid_comparison`** takes precedence over every other class whenever the comparison authority is not
  valid (reference not selected, normalized-distance authority blocked, track identity mismatch, …).
- **`cannotConclude`** is emitted whenever the comparison authority is valid but a downstream precondition
  (controlled-variable integrity, minimum credibility, same-session, explicit reference) is not satisfied. The
  `cannotConclude: true` flag in the output is always co-present with `class === 'cannotConclude'`, and the
  reason is carried in `reasonCodes`.
- **`confirmed` / `refuted` / `inconclusive`** are reachable only when all preconditions are satisfied; the
  three differ by what the comparison + controlled-variable evidence actually shows.

`confirmed` is **never** emitted without:

- same-case + same-session,
- explicit reference selection,
- controlled-variables integrity verified,
- minimum credibility threshold satisfied.

Absent any one of those, the classifier emits `cannotConclude` with the reason — it does not downgrade to
`inconclusive` (which is reserved for "preconditions met, evidence does not support either direction").

### Honesty contract for the experiment loop

The experiment loop records intent and observation. It does **not** validate that a setup change "worked"
beyond what the comparison authority and controlled-variable bookkeeping can support. A `confirmed` outcome is
a structured statement that *the controlled change is consistent with the observed comparison delta within
declared limitations* — not a measured performance gain.

---

## R3.0F — Migration engine

R3.0F's migration engine is the bridge between persisted records produced under R3.0B/C/D/E and the
in-memory shapes the runtime consumes. It is **deterministic**, **fail-closed**, and assumes nothing about the
provenance of its input.

The engine is built from four layered defences.

### 1. `sanitize` — JSON-safe shape gate

`sanitize` is run on every record before it touches a downstream module. It enforces:

- JSON-safe primitives only. Functions, symbols, BigInts, class instances, getters, and `Proxy`/Reflect-trapped
  objects are **rejected** — not stripped silently.
- Plain-object / plain-array invariants. A prototype other than `Object.prototype` / `Array.prototype` is a
  rejection, not a coercion.
- Universal array / depth / size caps inherited from R3.0B (≤ 256, depth ≤ 12, size cap).
- Cyclic structure → rejection.

A sanitize failure is a typed error with a path pointer; the migration aborts, the existing record stays
intact, and the UI surfaces a readable block.

### 2. Structured-clone-only firewall

After sanitize passes, every record crosses module boundaries through a **structured-clone-only firewall**.
Direct reference passing is disallowed by contract: the engine `structuredClone`s on entry and on emit, so a
caller cannot retain a live reference into the engine's internal graph and a producer cannot pass a captured
prototype through. The clone semantics are exactly the ones MemoryBackend already used at every R3.0B
boundary, lifted to a per-call contract.

### 3. Trap-free serializer

When the engine has to emit a string (export envelopes, debug artifacts, integrity hashes), it routes through a
**trap-free JSON serializer** built on the captured `Array.isArray`, captured `Object.prototype.hasOwnProperty`,
and a hand-walked enumeration that ignores accessors. A `toJSON` method on an input is **not honoured** — the
serializer is producer-attestation-defended: the producer does not get to decide what its own bytes look like.

### 4. Atomic `transact` with TOCTOU defence

All migration writes go through the R3.0B `transact({ stores, reads, compute })` primitive. `reads` are
declared up front; `compute` is synchronous and pure; the writes are committed or aborted as one. This closes
the TOCTOU window that would otherwise exist between "read the old record, decide what to migrate to, write the
new record" — there is no in-between state where two writers can race.

The migration engine is the first F-phase module with `runtimeConsumersAllowed = true` and
`algorithmsAllowed = true`; **UI activation and Feature Registry activation remain blocked until F6**.

---

## Electron host boundaries

The Electron host is deliberately thin.

```
main.js       — creates a BrowserWindow with the locked-down webPreferences below
preload.js    — exposes exactly { platform, version } onto window.<appBridge>
renderer/     — runs as if it were a browser tab; never imports node:* / electron / fs / child_process
```

Frozen `webPreferences`:

| Option | Value | Why |
| --- | --- | --- |
| `contextIsolation` | `true` | Renderer cannot reach into the preload's realm. |
| `nodeIntegration` | `false` | No `require` / `process` / `Buffer` in the renderer. |
| `nodeIntegrationInSubFrames` | `false` | Same for iframes. |
| `sandbox` | `true` (default) | OS-level sandbox. |
| `webSecurity` | `true` | Same-origin enforcement. |
| `allowRunningInsecureContent` | `false` | No mixed content. |
| `enableRemoteModule` | `false` / absent | No remote module loader. |

The preload surface is **exactly** `{ platform, version }`. There is no `ipcRenderer.invoke` channel, no FS
access, no shell spawn, no `webContents` exposure. A renderer-side feature that "would need a native API" is
either solved without one or stays out of scope. The **F3-boundary hardening probe** (see below) verifies this
no-IPC contract byte by byte against an expected schema and fails closed on any drift — a preload that grew an
unexpected property would block the release gate.

R3.0F hardening probe F3-large-library asserts that opening a library with the bounded ceiling number of cases
does not exceed declared memory or freeze the renderer. F3-storage-failure injects `STORAGE_UNAVAILABLE` /
`STORAGE_QUOTA_EXCEEDED` and confirms the UI blocks the affected capability with a reason — not a partial save,
not a silent skip. F3-no-stale-UI verifies that after a fail-closed block the view does not retain a previous
"success" cell. F3-XSS verifies sanitization at every place a user-supplied string crosses into the DOM (case
title, vehicle name, custom notes). F3-supply-chain verifies the dependency-free CI lane: a transitive
dependency added under cover would fail the install-lane assertion.

---

## Determinism + fail-closed contracts

### Determinism

R3.0 production paths are deterministic by construction:

- **No `Math.random` in production paths.** Sampling, ordering, and pairing are deterministic. Where a random
  source would be tempting (tie-breaking, jitter), an explicit declared rule replaces it.
- **No wall-clock dependence in decision logic.** Time values consumed by the decision engine come from
  declared monotonic record timestamps, not `Date.now()`. The append-only stores use a monotonic `createdAt`
  derived from the platform clock at insertion, never re-evaluated downstream.
- **No floating-point ordering drift.** Comparators carry an explicit tie-break rule; integer-key sort orders
  are preferred where one is available.
- **Captured intrinsics.** D2 captures `Array.isArray` and similar predicates at module load so a later tamper
  cannot retroactively shift authority. The migration engine captures its serialization intrinsics for the
  same reason.

### Fail-closed contracts (consolidated)

| Layer | Open the gate when | Fail-closed when | Substitute offered |
| --- | --- | --- | --- |
| Storage | IndexedDB available + quota present | `STORAGE_UNAVAILABLE` / `STORAGE_QUOTA_EXCEEDED` | Block save; readable error in UI. |
| Case record | Sanitize all-or-nothing pass | Any unbounded array / unsupported type / cycle / prototype drift | Reject save; existing record untouched. |
| Portable bundle | Strict allowlist + value constraints satisfied | Off-allowlist or constraint failure | Field excluded + logged; required-field failure rejects the bundle. |
| Migration | sanitize + structured-clone + trap-free serialize all pass | Any layer fails | Reject migration; record stays at prior schema; UI blocks the capability with a reason. |
| C2 lap | All 5 authorities pass | Any single authority blocks | Reason code, no value. |
| C3 distance | Declared lap-distance authority + policy pass | Any of 16 distance reason codes | Reason code, no normalized axis. |
| C4 reference | Explicit user selection present | No selection (no auto fastest_valid / median / best_sector_composite) | `REFERENCE_NOT_SELECTED`; comparison blocked. |
| C4 segmentation / pairing | Corner descriptor present and unambiguous | Degenerate / missing / unresolved pairing | Per-corner block; other corners unaffected. |
| C5 delta | Pairing + normalization + channel availability | Any upstream gate open | Per-metric block. |
| C6 export | Envelope validator passes | Raw / oversized arrays / off-allowlist fields | Envelope refused; no emission. |
| D2 graph | Authoritative inputs verified via WeakSet | Any input not WeakSet-member | Graph build aborts. |
| D3 hypothesis | Verified graph + inputs satisfy hypothesis preconditions | Any precondition fails (e.g. no calibration for a magnitude claim) | Hypothesis downgraded to directional or omitted. |
| D5 brief | Deep-frozen emit; generation token bound to inputs | Token stale / retired / replayed against a different case | Brief refused. |
| Outcome classifier | Authority + same-case/same-session + controlled-variables + min credibility | Any precondition fails | `cannotConclude` with reason; `invalid_comparison` takes precedence when the comparison authority itself is invalid. |
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
- **`featureRegistryActivationAllowed`** — `false` until F6_RELEASE. Production modules may pass tests and be
  authorized in `authorizedProductionPaths`; they are reachable to the user only after F6.
- **`runtimeConsumersAllowed`** — `true` since F1. The migration engine is the first F-phase runtime consumer.
- **Comparison scope** — same-case + same-session only. Cross-case and cross-session are permanently forbidden.
- **Delta sign** — `comparison − reference`. Single convention. No alternate.
- **Reference selection** — explicit user only. `fastest_valid / median_valid / best_sector_composite` are
  permanently disabled.
- **No intermediate release, and no branch protection bypass.** No tag, no GitHub release, no semver bump
  between R3.0C and F6; the R3-GATE0 ruleset on `main` (required PR + required `trusted-verification` check +
  no force-push + no deletion, 0 bypass actors) holds across every R3 phase. A force-merge or rule-bypass would
  fail the governance verification step that every phase asserts.
- **R4 is out of scope for this release.** Any capability id whose name matches `^r4_` / `^r40_` / `^r4.0_` /
  `^r4.` is refused at the schema layer — the regex list is an enforcement mechanism, not a teaser. The R3.0
  release does not reference, ship, or pre-wire R4 features.

### What this architecture is NOT

- **Not a professional race-engineer replacement.** The Engineer Brief carries this in its limitations.
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
