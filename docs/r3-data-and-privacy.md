# R3.0 Data Flows & Privacy

This document is the authoritative reference for **where Racing Setup Analyzer's data lives, what is persisted, what is exported, and what is never sent over the network**. It also documents the Electron host security boundaries that enforce these guarantees.

The contract is conservative on purpose: the same fail-closed posture that governs the credibility ladder (Physics > Model > Measured > Derived > Heuristic > Unavailable) governs data handling. The product holds no remote copy of any value, so there is no remote surface from which a value could leak; a value the user did not explicitly export cannot leave the device through any of the three export paths below (comparison bundle, case bundle, or raw-telemetry archive).

R3.0F preserves all data invariants frozen at R3.0B (the case-record schema, frozen at v1.4.0) and adds the migration / E2E / hardening evidence that the same posture holds end-to-end.

The source files this document is derived from, and against which every claim below can be verified:

- `renderer/js/case-store.js` — R3.0B case CRUD (PURE logic; backend injected).
- `renderer/js/r3-0e-stores.js` — R3.0E experiment / outcome / timeline / follow-up-link stores (PRODUCTION; IndexedDB-backed).
- `renderer/js/r3-0f-migration-engine.js` — R3.0F F1 unified migration engine (PURE logic; backend injected).
- `contracts/r3.0f/migration-envelope.js` — R3.0F envelope schema (engineVersion, storageVersion, perStore targets).
- `scripts/migrators/{case,session,experiment,outcome,timeline,followup}-migrator.js` — the six per-store migrator modules registered with the engine.

---

## Storage locations

Racing Setup Analyzer runs in two host contexts. Both contexts use the same storage backend abstraction (`storage-backend.js`) so the contracts below hold in either.

| Host context | Backend | Where the bytes live | Lifetime |
|---|---|---|---|
| Browser (renderer in dev / web build) | IndexedDB | Per-origin IndexedDB database, owned by the browser profile | Until the user clears site data, or the app calls `caseStore.remove({ confirm: true })` plus the corresponding per-store calls described under "Removing a case" below — the outcome and timeline stores have no `remove()` (write-once / append-only) and the follow-up-link store only exposes `markParentStatus(linkId, 'deleted')`, a status transition, not a row deletion |
| Electron desktop | IndexedDB under Chromium, scoped to `app.getPath('userData')` | OS user-data folder (macOS: `~/Library/Application Support/<app>`, Windows: `%APPDATA%/<app>`, Linux: `~/.config/<app>`) | Until the user deletes `userData`, or the app calls the store-level removal APIs described under "Removing a case" below (which do not fully clear every store — see that section for the outcome/timeline/follow-up-link exceptions). Uninstalling the app does **not** delete `userData` under this app's current packaging (macOS `dmg`, Windows NSIS without `deleteAppDataOnUninstall`); `userData` must be removed manually or via OS-level app-data cleanup |
| Node test harness | In-memory `Map` shim | Process memory only | Discarded at process exit |

There is **no cloud database, no remote object store, no syncing service, no user account, no remote ID broker**. The product has no notion of a remote user. Two installations of the app on two machines share zero state.

### Object stores

The persistence layer is organized into logical stores introduced across three phases. Only the R3.0B case-record schema is frozen at v1.4.0; the R3.0E and R3.0F additions live in their own stores under their own contracts and are not part of the frozen schema.

**R3.0B stores (case-record schema frozen at v1.4.0; not modified by R3.0C, R3.0D, R3.0E, or R3.0F):**

| Store | Purpose | Identity | Mutation model |
|---|---|---|---|
| `cases` | R3 case records (vehicle + setup + optional imported telemetry summary) | `caseId` | Updatable in place via `caseStore.save` for `local_full` records; `imported_summary` records refuse updates (`CANNOT_OVERWRITE_IMPORTED`) |
| `caseIndex` | Single-key index document at key `__index` containing the case-list summary | Constant key `__index` | Rewritten atomically alongside every `cases` write |
| `sessions` | Per-case sessions; each session owns its laps, track identity, normalized distance frames | `sessionId` (scoped to a `caseId`) | Sessions grow during a run; a session cannot be re-parented across cases |

The `caseStore` public API is exactly `create`, `save`, `open`, `duplicate`, `archive`, `unarchive`, `setPinned`, `remove`, `list`, `exportCase`, `importBundle`, `compact`. Imported bundles are stored with `recordType: 'imported_summary'` and the update path throws `CANNOT_OVERWRITE_IMPORTED` to prevent silent promotion to `local_full`.

**R3.0E additions (separately versioned, schema-isolated; see the module's "schema isolation" ruling in `renderer/js/r3-0e-stores.js`):**

Per the SKYLINE D12/E1 ruling, R3.0E persistence lives in **separate versioned stores** and **must not** extend the frozen R3.0B portable case-record schema body. The R3.0E layer is therefore eight discrete object stores:

| Store name (exact) | Purpose | Key | Notes |
|---|---|---|---|
| `r3_0e_experiments` | Experiment records bound to a source case | `experimentId` | Payload keyed by `experimentId`; binding field is `sourceCaseId` |
| `r3_0e_experimentsIndex` | Summary index for experiments | `experimentId` | Index value: `{ experimentId, sourceCaseId, status, createdAt, updatedAt }` |
| `r3_0e_outcomes` | Outcome classifier outputs | `outcomeId` | Payload keyed by `outcomeId`; binding field is `experimentId` |
| `r3_0e_outcomesIndex` | Summary index for outcomes | `outcomeId` | Index value: `{ outcomeId, experimentId, class, createdAt }` |
| `r3_0e_timelines` | Per-case timeline document with `events: []` | `caseId` | The timeline doc itself is keyed by `caseId`; only the `events` array is append-only |
| `r3_0e_followupLinks` | Follow-up links between experiments | `linkId` | Binding fields: `parentCaseId`, `followUpCaseId`, `experimentId` |
| `r3_0e_followupLinksByCase` | **Reverse** index for follow-up links | `parentCaseId` | Value: `{ parentCaseId, linkIds: [linkId, ...] }` |
| `r3_0e_storeMetadata` | Schema-version map for the R3.0E layer | Constant key `__r3_0e_version` | Value: `{ versions: { experiment, outcome, timeline, followUpLink }, updatedAt }`; all four schema versions are `1` |

Persistence semantics shared by every R3.0E store:

- Every payload is validated by its E1 contract **before** the write (inside `compute()`).
- Every payload fetched through a **single-record read** (`get()` on `r3_0e_experiments`/`r3_0e_outcomes`, and the per-link payload reads inside `listForParent()` on `r3_0e_followupLinks`) is **re-validated on read**. A persisted record whose `schemaVersion` exceeds the current `SCHEMA_VERSIONS[kind]` value is rejected fail-closed with the corresponding `R3_0E_*_FUTURE_SCHEMA` reason; a corrupted payload is rejected with `R3_0E_*_CORRUPTED`. **Exception:** `experimentStore.list()` and `outcomeStore.listForExperiment()` read directly from the lightweight `r3_0e_experimentsIndex` / `r3_0e_outcomesIndex` summary stores (`renderer/js/r3-0e-stores.js:149`, `:213`) and return those index values as-is — no `schemaVersion` check and no shape validation is applied on these two list paths. A consumer that needs a validated payload must call the corresponding `get(id)` for each id returned by `list()`/`listForExperiment()`.
- Persisted records carry **no runtime authority**. The `WeakSet` identity that the live producer modules use to gate authority is closure-private and cannot survive reload. Any consumer that rehydrates an R3.0E record must re-validate it through the E1 contracts before treating its content as authoritative.

Per-store behavior worth being precise about:

- **`r3_0e_experiments`** — exposes `create`, `update`, `get`, `list`, `remove`. `remove(experimentId)` deletes the row in `r3_0e_experiments` and the matching row in `r3_0e_experimentsIndex`; it does **not** cascade into outcomes, timelines, or follow-up links. Error codes include `R3_0E_EXPERIMENT_INVALID`, `R3_0E_EXPERIMENT_SCHEMA_MISMATCH`, `R3_0E_EXPERIMENT_ID_COLLISION`, `R3_0E_EXPERIMENT_MISSING`, `R3_0E_EXPERIMENT_FUTURE_SCHEMA`, `R3_0E_EXPERIMENT_STALE_WRITE`, `R3_0E_EXPERIMENT_CORRUPTED`.
- **`r3_0e_outcomes`** — exposes `create`, `get`, `listForExperiment`. There is **no `remove()` method** on the outcome store; outcomes are write-once. Error codes include `R3_0E_OUTCOME_INVALID`, `R3_0E_OUTCOME_ID_COLLISION`, `R3_0E_OUTCOME_FUTURE_SCHEMA`, `R3_0E_OUTCOME_CORRUPTED`.
- **`r3_0e_timelines`** — exposes `getTimeline(caseId)` and `appendEvent(caseId, event)`. The timeline **document** is updated in place by appending to its `events` array (`existing.events.concat([event])`, never in-place mutation), so the document itself is rewritten on each append while the array is monotonic. Duplicate `eventId` is rejected with `R3_0E_TIMELINE_DUPLICATE_EVENT`; out-of-order timestamps (`Date.parse(event.createdAt) < Date.parse(prev.createdAt)`, or `NaN`) are rejected with `R3_0E_TIMELINE_OUT_OF_ORDER`; existing documents whose `schemaVersion` exceeds the current timeline schema are rejected with `R3_0E_TIMELINE_FUTURE_SCHEMA`. There is **no `remove()`**.
- **`r3_0e_followupLinks`** — exposes link creation, `listForParent(parentCaseId)`, and `markParentStatus(linkId, status)` where `status ∈ {present, archived, deleted}`. `markParentStatus` updates the `parentStatus` enum on the link record; it does **not** remove the record. There is no re-parent operation: links are keyed by `linkId` and the reverse index `r3_0e_followupLinksByCase` is keyed by `parentCaseId`. `listForParent` validates that the reverse-index entry's `parentCaseId` matches the caller-supplied `parentCaseId`, that `linkIds` is an array, and that each fetched link's `parentCaseId` matches; any mismatch is rejected fail-closed with `R3_0E_LINK_CORRUPTED` (this is the E2-R2-01 reverse-index parent-membership defense).

There is **no `caseAssociation` field** in any R3.0E record. The actual binding fields are: `experiment.sourceCaseId`, `outcome.experimentId`, `timeline.caseId` (used as the document key), and `followUpLink.parentCaseId` plus `linkId`.

**R3.0F additions (migration journal + state, NOT a dedicated store):**

R3.0F's F1 migration engine does **not** create a dedicated `migrations` object store. It writes its journal and its state as two **named keys inside an existing META store** that already lives in the backend. The defaults are:

| Key | Meta store | Default key name | Purpose |
|---|---|---|---|
| Migration journal | `meta` (configurable via `spec.metaStore`) | `__r3_0f_migration_journal__` (configurable via `spec.journalKey`) | Capped append ring buffer of per-record migration entries |
| Migration state | `meta` (same) | `__r3_0f_migration_state__` (configurable via `spec.stateKey`) | Latest engine/storage version reached, plus envelope summary |

The journal is **capped** at `MAX_JOURNAL_ENTRIES_DEF = 256` entries by default (`spec.maxJournalEntries` overrides it). A preflight rejects a migration that would exceed `MAX_JOURNAL × JOURNAL_OVERFLOW_FACTOR (= 4)` entries with the `JOURNAL_OVERFLOW` reason **before any mutation occurs** (F1-R1-05).

Each journal entry has the shape `{ schemaVersion: 1, recordedAt, store, key, fromVersion, toVersion, status, recordHash, migrationsApplied, limitations, reasonCode? }`. The entry is keyed by the `{store, key}` of the record being migrated; **there is no `migrationId`** and there is no separate audit-chain identity. `recordHash` is a non-cryptographic FNV-1a 64-bit fingerprint useful for audit comparison within one repository; it is **not** a tamper-proof signature.

The migration envelope (see `contracts/r3.0f/migration-envelope.js`) is fixed at:

```
{
  schemaVersion: 1,
  engineVersion: 1,
  storageVersion: 1,
  perStore: {
    cases:                1,
    sessions:             1,
    r3_0e_experiments:    1,
    r3_0e_outcomes:       1,
    r3_0e_timelines:      1,
    r3_0e_followupLinks:  1
  }
}
```

`engineVersion` mismatches against the envelope are rejected with `ENVELOPE_VERSION_MISMATCH`.

The closed enum of reason codes emitted by the engine is exactly:

`UNSUPPORTED_FUTURE_VERSION`, `NO_MIGRATION_PATH`, `RECORD_NOT_AN_OBJECT`, `RECORD_BAD_VERSION`, `RECORD_TOO_LARGE`, `RECORD_CIRCULAR`, `PROXY_INPUT_REJECTED`, `POST_MIGRATION_INVALID`, `MIGRATOR_THREW`, `BACKEND_REJECTED`, `CONFIRM_REQUIRED`, `ENVELOPE_VERSION_MISMATCH`, `JOURNAL_OVERFLOW`, `PRODUCER_ATTESTATION_REFUSED`.

Per-entry `status ∈ {migrated, no-op, rejected, failed}`. Per-report `status ∈ {complete, partial, halted, no-op}`.

---

## What is stored vs ephemeral

The general posture is: **persist what the user authored or imported, plus the system-produced records each phase is responsible for keeping as a durable record (R3.0E outcomes, R3.0E timeline events, the R3.0F migration journal/state); recompute everything else.** Authority itself is never stored — the closure-private WeakSet identity that marks a value as authoritative is re-derived from raw evidence on every run, even for objects (like an Outcome) whose persisted *content* does survive a restart.

### Persisted

These survive a process restart:

- The R3 case record (vehicle preset reference, setup levers, notes, free-text fields the user wrote) in `cases`, summarized in `caseIndex.__index`.
- The session container in `sessions` (track identity stamped by the user, lap boundaries computed and stored once per session, normalized distance frames stored once per lap because they are deterministic and expensive).
- The imported telemetry **summary** (channel inventory, mapping decisions, calibration confirmations, sample-quality flags, provenance markers). See "Raw telemetry is NEVER in case bundle" below.
- R3.0E records across `r3_0e_experiments`, `r3_0e_outcomes`, `r3_0e_timelines`, `r3_0e_followupLinks`, plus their index/reverse-index stores and the schema-version map in `r3_0e_storeMetadata`. Only the timeline `events` array is append-only as a contract; experiment records have `create`/`update`/`remove`, outcome records are write-once, follow-up-link records have `markParentStatus` for state transitions (present/archived/deleted).
- The R3.0F migration **journal** and **state** at `meta['__r3_0f_migration_journal__']` and `meta['__r3_0f_migration_state__']`. The journal records what each transition did (from-version → to-version, applied migrators, structured-clone fingerprint, fail-closed reason if any). It does **not** carry per-record producer-attestation; in fact F1 refuses migrated records that contain attestation-like field names (see "Migration boundary" below).

### Ephemeral

These live only in memory and are recomputed from persisted inputs on every run:

- Authority objects (lap authority, track identity authority, reference-selection authority, comparison authority, session authority). These are sealed in closure-private `WeakSet`s and are never serialized.
- Reason-code arrays attached to a run's blocked/eligible state.
- The R3.0D `LIMITATION_IMPORTED_SUMMARY` propagation chain — re-derived on every D2 → D3 → D5 traversal.
- Capability eligibility (`eligible` / `confirmed` / `validated`). A caller's flag is never trusted; eligibility is re-derived from raw evidence on every run.
- The R3.0D closure-private references `_authoritativeGraphs` (D2 WeakSet) and `_CAPTURED_EG_VERIFY_GRAPH` (D3 mandatory capture, established at the Formal D Gate) — closure-private and not serializable.
- The R3.0D Engineer Brief. `r3-0d-engineer-orchestrator.js` holds the current brief and viewmodel in module-level variables (`_currentEnvelope`, `_currentViewModel`) that are never written through `backend.transact()`. Neither `case-store.js`'s record shape (`metadata`/`associations`/`setupSnapshot`/`analysisResults`/`shellEvidence`) nor `session-store.js`'s (`schemaVersion`/`sessionId`/`summary`/`raw`/`createdAt`) has a field for it. The brief is regenerated from the D2–D4 chain each time it is needed and does not survive a process restart.

If a stored record contained an `eligible:true` flag, the runtime would still ignore it: **authority, not presence**.

---

## Raw telemetry is NEVER in case bundle (only summary)

This is the most load-bearing data rule in the product.

**Raw telemetry samples — the actual time-series rows of a CSV/binary import — are never persisted into a case record, and are never present in any exported comparison bundle.**

What is persisted instead is an **imported_summary**:

- Channel inventory (names, units the importer detected).
- Per-channel mapping decision (e.g. `steer_raw → road_wheel_angle` with explicit user mapping confirmation, or mapped-but-unconfirmed).
- Per-channel calibration state (verified / present-but-unverified / absent).
- Sample-quality flags (timebase monotonicity, sample density, gaps, clamp/saturation markers).
- Provenance (synthetic / real / unverified — machine-read, never inferred from presence).
- Window descriptors (lap boundaries, normalized-distance frame metadata).

The reasons for this rule:

1. **Provenance preservation.** A summary keeps the credibility ladder honest: a value carried into R3.0D's Engineer Brief is `Measured` only if the summary it came from is anchored in confirmed channels + verified calibration + acceptable sample quality. Carrying raw rows around makes it tempting to re-process them and silently promote the result — which is exactly the `imported_summary → measured` promotion the product forbids.
2. **Honest export.** A comparison bundle exported to a teammate must not let them re-derive a different measured number than the originating session derived. The bundle therefore carries the same summary + the same authoritative outputs; it does not carry the raw rows that would let a downstream tool recompute differently.
3. **Footprint and privacy.** A raw telemetry file can be very large and can contain identifying metadata (timestamps, file paths, vendor blobs). The summary is small, structured, and contains nothing the user did not explicitly map or confirm.

The raw telemetry file itself remains on the user's local filesystem at whatever path they imported it from. The product never copies it, never moves it, and never references it by absolute path inside the persisted case bundle.

---

## `imported_summary` is never promoted to `measured`

A separate, related invariant.

The credibility ladder distinguishes:

- `Measured` — derived from real telemetry, with the data + calibration to back it.
- `imported_summary` — a structured digest of an import, which may or may not satisfy the `Measured` preconditions.

**An `imported_summary` value is never promoted to `Measured` automatically.** Even within the same session, even if the channels look right, even if the user has previously confirmed a similar mapping in another case. Promotion requires:

- Confirmed channel mapping for this case.
- Verified calibration bound to this mapping and this session.
- Sample-quality gate passed for the window in question.
- Authority re-derived on this run (not a stored flag).

If any of those is missing, the value remains `imported_summary` and the capability that would have consumed it as `Measured` is blocked with a reason — never approximated. When the input cannot reach `Measured`, the credibility ladder still has lower rungs available: a `Derived` value (computed from `Measured` predecessors on the same run) or a `Heuristic` substitute (e.g. a directional tendency in place of a measured K_us) is offered explicitly labelled, never relabelled as `Measured`. If even those substitutes are not warranted, the capability is `Unavailable`.

This rule is enforced at the boundary of every consumer (R3.0C delta-metrics, R3.0D evidence-graph, R3.0E outcome classifier, R3.0F migration). It is **not** a UI-layer check — promotion would be impossible regardless of UI. The `caseStore` enforces a sibling invariant at the bundle layer: `importBundle` writes the record with `recordType: 'imported_summary'` and the `save` path throws `CANNOT_OVERWRITE_IMPORTED` if anything later tries to overwrite an imported record with a `local_full` payload.

---

## Comparison bundle export shape

Comparison export (R3.0C C6) is a user-initiated action. It produces a single structured artifact suitable for sharing with a teammate or archiving locally.

The envelope itself (`contracts/r3.0c/comparison-export-contract.js`) has exactly four keys: `{ schemaIdentity,
schemaVersion, generatedAt, payload }`. The production exporter (`renderer/js/r3-0c-comparison-export.js`,
`buildComparisonExport(request)`) builds `payload` with exactly these keys:

- `comparisonStatus` — `'success'` or `'partial'` (partial when any metric carries a `partial` flag).
- `referenceLap` / `comparisonLap` — each `{ sessionId, lapId, lapTimeMs }`. `lapTimeMs` is the lap's
  duration, not a selection timestamp — there is no separate "when the user selected this lap" field.
- `association` — `{ caseId, trackId, layoutId, positionBasis, positionDirection }`.
- `cumulativeDelta`, `corners`, `metricAvailability` — the delta-metrics summary and per-corner breakdown.
- `credibility`, `confidence`, `provenance` — echoed from the credibility metadata.
- `limitations`, `blockers` — allowlisted reason codes.
- `cannotConclude`, `alternativeExplanations`, `nextValidationAction` — the framing fields.

A comparison bundle does **not** contain:

- The R3 case record or the session container (the bundle is a derived summary, not a copy of either store).
- Raw telemetry rows.
- Normalized-distance frames, track-identity authority output, or corner-pairing authority output as
  separate fields — only the already-computed `corners`/`cumulativeDelta` summary travels.
- The R3.0D Engineer Brief or any R3.0E artefact (experiment, outcome, follow-up link, timeline). Those live
  in their own stores and have their own contracts; they are not co-bundled into the comparison-export
  envelope.
- App version, `engineVersion`, or `storageVersion` — the envelope's only metadata fields are
  `schemaIdentity`, `schemaVersion`, and `generatedAt`.
- A literal "comparison − reference" sign-convention string — the convention is structural (how
  `cumulativeDelta`/`corners` are computed upstream at C5), not a field stored in the export payload.
- Any authority object (WeakSet membership cannot be serialized; consumers re-derive authority on import).
- Any `eligible`/`confirmed`/`validated` flag that the importer should trust — the importer re-derives.
- Any path on the originating filesystem.
- Any user identifier — the product has none.
- Any field name from the producer-attestation sentinel list (see "Migration boundary"). The F1 engine refuses to write such fields into migrated records, and the bundle exporter likewise excludes them.

### Reference lap and delta sign

Two invariants hold for every bundle, even though neither is stored as a literal field in the payload:

- **Reference lap is EXPLICIT-USER-SELECTION only.** There is no `fastest_valid`, no `median`, no `best_sector_composite` auto-selection. The bundle records which session/lap the user selected (`referenceLap.sessionId`/`lapId`) — not a separate selection-event timestamp.
- **Delta sign convention is `(comparison − reference)`.** Never the other way. This is enforced by how `cumulativeDelta`/`corners` are computed upstream (C5 delta-metrics), not by a sign-convention string carried in the export payload.

### Same-case + same-session only

Comparison is **same-case + same-session only**. A bundle that attempted to compare laps from different cases or different sessions would be rejected at the C4 pairing boundary with a reason code; it cannot be produced and therefore cannot be exported. The R3.0E follow-up-link layer carries the same invariant from a different direction: a follow-up Case Link records a *navigational* relationship between two cases, but it carries **no comparison authority** — cross-case comparison is forbidden regardless of whether a follow-up link exists.

---

## Network egress

**There is no production network egress.**

- No telemetry is uploaded.
- No analytics, page-view tracking, or behavioural telemetry is collected.
- No crash reports are sent.
- No remote feature flags are fetched.
- No update server is contacted at runtime by the application code.
- No fonts, scripts, or stylesheets are loaded from CDNs at runtime; all assets are bundled.
- No cloud account, no login, no remote identity provider.

This is the product's invariant: no data leaves the host unless the user explicitly triggers one of three export paths — a comparison-export bundle (R3.0C C6, `buildComparisonExport`), a portable case bundle (`caseStore.exportCase`), or a raw-telemetry archive (`sessionStore.exportRawArchive`, an opt-in distinct from both bundle exports) — each returning an in-memory JS object/envelope that the caller must then persist or share itself; the preload surface (`preload.js`) exposes no filesystem, IPC, or save-dialog capability, so none of these functions write a file on their own. Persisting or sharing the returned data — e.g. copying it out, or a future UI affordance that saves it to a user-picked path — happens out-of-band, outside these functions.

How the invariant is enforced, in layers:

1. **Absence of call sites.** Production paths contain no `fetch`, `XMLHttpRequest`, `WebSocket`, or `navigator.sendBeacon` to remote origins. This is a code-shape property, auditable by grep.
2. **Electron Content Security Policy.** The renderer's CSP (see below) sets `default-src 'self'`; `connect-src` is not declared separately, so it falls back to `default-src 'self'`. So even if a third-party dependency attempted to open a remote connection, the browser engine would refuse it.
3. **R3.0F F3 supply-chain probe.** F3's hardening manifest includes a supply-chain probe (`tests/e2e/hardening-06-supply-chain.test.js`) that asserts `package.json` declares only the known Electron/electron-builder dependencies, no production renderer module pulls a bare third-party import via `require()`, no `package.json` script references untrusted external tooling, and no secrets/API keys/`.env` files are committed. It does not inspect outbound network origins or destinations directly — the no-egress invariant rests on layer 1 (no call sites) and layer 2 (CSP) above; this probe verifies the dependency surface stays closed, which is what would let a third-party call site sneak in. The probe passes at the F3 baseline that ships in this milestone.

The combination of "no call sites in our code" + "CSP refuses connections" + "supply-chain probe verifies the dependency surface" is what the contract rests on, rather than a single runtime interceptor.

---

## Electron host security

The Electron host is configured to deny the renderer any path to system resources beyond an explicitly enumerated preload surface.

`main.js`'s `BrowserWindow` `webPreferences` object literal explicitly sets exactly three keys:

| Setting | Value | Rationale |
|---|---|---|
| `preload` | path to `preload.js` | The only privileged surface. |
| `contextIsolation` | `true` | Renderer JavaScript runs in an isolated context; it cannot reach into the preload's Node scope. |
| `nodeIntegration` | `false` | The renderer has no `require`, no `process`, no Node globals. Renderer code cannot touch the filesystem, spawn processes, or load native modules. |

No other `webPreferences` key — `sandbox`, `webSecurity`, `allowRunningInsecureContent`,
`nodeIntegrationInWorker`, `nodeIntegrationInSubFrames`, `enableRemoteModule` — is present in the object
literal. They are absent, not explicitly hardened to a safe value; Electron's own defaults apply. The F3
electron-boundary probe (`tests/e2e/hardening-01-electron-boundary.test.js`) does not assert these are
explicitly set — it asserts `contextIsolation`/`nodeIntegration` are each declared exactly once with their
safe literal value, and that none of the other keys is ever explicitly flipped to an unsafe value (e.g.
`sandbox: false`, `webSecurity: false`, `nodeIntegration: true`).

`renderer/index.html` declares the Content Security Policy `default-src 'self' 'unsafe-inline'
'unsafe-eval'`. This restricts the default fetch directive — and therefore `connect-src`, which falls back
to `default-src` when unset — to the app's own origin, so no remote network destination is reachable from a
CSP standpoint; combined with the no-egress contract below, the renderer has no way to phone home even if
compromised. The policy does **not** block inline `<script>` tags or `eval()` (`'unsafe-inline'` and
`'unsafe-eval'` are explicitly allowed), and has no `object-src 'none'`, `base-uri 'self'`, or
`frame-ancestors 'none'` directive. The F3 probe only asserts `default-src 'self'` is present.

### Preload surface

The preload script exposes **exactly two properties** to the renderer via `contextBridge.exposeInMainWorld`:

```
{
  platform: string,   // 'darwin' | 'win32' | 'linux'
  version:  string    // app semver, e.g. '1.4.0'
}
```

Nothing else. No `require`, no `ipcRenderer`, no `fs`, no `path`, no `child_process`, no shell, no remote loader, no `webContents` handle.

The renderer therefore has no way to read or write the user's filesystem directly. Its only persistence mechanisms are IndexedDB (all case/session/R3.0E/R3.0F store data) and `localStorage` (a single non-authoritative UI preference, the `lang` key set by `setLang()` in `renderer/index.html`); both are scoped by Chromium to the app's `userData` origin, not to the raw filesystem.

### What this denies the renderer

Even if the renderer were fully compromised (e.g. via the kind of injection the R3.0F F3 XSS probe is designed to surface), the renderer cannot:

- Read files outside IndexedDB and `localStorage`.
- Write files outside IndexedDB and `localStorage`.
- Open network connections to anything but the same origin (and the same origin is a local `file://` or bundled `app://`, with no remote endpoints).
- Spawn child processes.
- Load native code.
- Escalate to the main process beyond the two preload properties.

R3.0F's F3 electron-boundary hardening probe asserts each of these denials and passes at this milestone. The XSS probe and the supply-chain probe (also part of the F3 six-probe manifest) cover the adjacent attack surfaces.

### Migration boundary (R3.0F F1)

R3.0F's migration engine (`renderer/js/r3-0f-migration-engine.js`) is a **pure-logic** module that is constructed via `createMigrationEngine({ backend, registry?, metaStore?, journalKey?, stateKey?, clock?, stamp?, maxJournalEntries?, maxRecordBytes? })` and returns `{ detect, plan, migrate, journal, envelope, knownStores }`.

The engine has three properties that are load-bearing for this section.

1. **Deterministic, idempotent, fail-closed.** Same inputs + same injected clock + same backend state produce the same writes and the same journal entries. Running `migrate()` against a fully-migrated store performs zero writes and zero journal appends. Future-version records (a record whose `schemaVersion` exceeds the per-store target in the envelope) are rejected with `UNSUPPORTED_FUTURE_VERSION` — never coerced.
2. **Atomic commit across stores + META.** Every successful `migrate()` call writes the migrated records to their owning stores **and** writes the journal append **and** writes the latest state, in a single `backend.transact()` (F1-R1-03). A backend transact failure rolls back all of them together, and the journal/state never become inconsistent with the data stores.
3. **Structured-clone-only firewall.** Any value crossing the migration boundary is first vetted by `structuredClone`. Values containing functions, symbols, `BigInt`, `Date`, `Map`, `Set`, typed arrays, non-plain prototypes, or proxies are rejected at the boundary (e.g. `PROXY_INPUT_REJECTED`, `RECORD_NOT_AN_OBJECT`, `RECORD_BAD_VERSION`). The internal JSON serializer (`_safeJsonStringify`) walks own enumerable keys directly without consulting `toJSON`, so a value with a side-effecting getter cannot fire arbitrary code during serialization. Records larger than `MAX_RECORD_BYTES_DEF = 8 000 000` bytes are rejected with `RECORD_TOO_LARGE`; cyclic records are rejected with `RECORD_CIRCULAR`.

**The engine never fabricates a producer attestation.** This is the inverse of what an older draft of this document claimed. The live producer modules (R3.0B, R3.0C, R3.0D, R3.0E) use closure-private `WeakSet` attestation that is never serialized. The migration engine therefore treats well-known attestation-shaped field names as **reserved sentinels** and refuses to write a migrated record that contains them. A migrated record carrying any of the following field names (case-insensitive substring match against the sentinel token list) is rejected with `PRODUCER_ATTESTATION_REFUSED` (F1-R1-09 / F1-R2-03):

- Reserved field names: `_authoritative`, `_producerAttested`, `_attested`, `__attested`, `_verified`, `__verified`, `_signature`, `__signature`, `_proof`, `__proof`, `_authority`, `__authority`, `_authoritativeSession`, `_authoritativeCase`, `_authoritativeOutcome`.
- Reserved tokens that trigger the substring match: `authoritative`, `producerattested`, `attested`, `verified`, `signature`, `proof`, `authority`.

A downstream auditor can therefore rely on "no migrated record in persisted data carries an attestation-like field name" as a hard property of the persisted state. The journal itself records *what producer version performed each transition* via the envelope's `engineVersion` / `storageVersion` and the per-entry `migrationsApplied` list — not via any in-record marker.

**Known stores and migrators.** `knownStores` appears in two places with the same six-element content but different shapes: as a **function** on the object `createMigrationEngine(...)` returns — call it as `engine.knownStores()` to get `['cases', 'sessions', 'r3_0e_experiments', 'r3_0e_outcomes', 'r3_0e_timelines', 'r3_0e_followupLinks']` — and as a plain **array** field on the object `detect()` resolves to (`(await engine.detect()).knownStores`), populated with the same six names. Each store has a per-store target of `1`. The six per-store migrator modules registered at the F1 baseline are:

- `scripts/migrators/case-migrator.js`
- `scripts/migrators/session-migrator.js`
- `scripts/migrators/experiment-migrator.js`
- `scripts/migrators/outcome-migrator.js`
- `scripts/migrators/timeline-migrator.js`
- `scripts/migrators/followup-migrator.js`

Migrator-returned reason codes outside the closed enum are mapped to `NO_MIGRATION_PATH` at the engine boundary (F1-R1-01), so a misbehaving migrator cannot introduce a novel reason code into the journal. A migrator that throws is recorded as `status: 'failed'` with reason `MIGRATOR_THREW`; a post-migration record that fails its target-version validator is recorded as `status: 'failed'` with `POST_MIGRATION_INVALID`; an unrecognized `confirm` requirement triggers `CONFIRM_REQUIRED`.

---

## User control

The product gives the user explicit, local control over their data. There is no remote account to manage, no support back-end to file requests with, no asynchronous deletion. Everything is local.

### Removing a case

A case is deleted via `caseStore.remove(caseId, { confirm: true })`. The `confirm: true` flag is **required**; without it the store returns `{ ok: false, code: 'CONFIRM_REQUIRED' }` as a fail-closed safeguard against accidental UI wiring.

Internally, `remove` runs a single atomic `backend.transact()` across the two stores it owns, namely `cases` and `caseIndex`. The writes are: delete the row at `cases[caseId]`, and write a new `caseIndex.__index` value with that `caseId` removed from the index summary. `remove` does **not** read the case row first, so it has no `CASE_NOT_FOUND` path — calling it with an unknown `caseId` deletes nothing from `cases` (there is no row to delete) but still rewrites `caseIndex.__index` and reports `{ ok: true }`. Its only error paths are `CONFIRM_REQUIRED` and `STORE_ERROR`. (`CASE_NOT_FOUND` is a real code elsewhere in this store — e.g. `setPinned` and `_setArchived` read-and-check the case row first — but `remove` itself does not use it.) The sibling guards on the import path (`ID_COLLISION`, `CANNOT_OVERWRITE_IMPORTED`, `CANNOT_OVERWRITE_FUTURE`, `CANNOT_DUPLICATE_IMPORTED_SUMMARY`, `RECORD_NOT_STORABLE`) belong to `importBundle`, not `remove`.

**`caseStore.remove` does not cascade.** It does not delete from `sessions`, it does not delete from any R3.0E store (`r3_0e_experiments`, `r3_0e_experimentsIndex`, `r3_0e_outcomes`, `r3_0e_outcomesIndex`, `r3_0e_timelines`, `r3_0e_followupLinks`, `r3_0e_followupLinksByCase`), and it does not delete R3.0D Engineer Brief artifacts. This is a deliberate boundary — the case store knows about cases, not about everything that has ever referenced a case — and there is no `caseAssociation` field on the dependent records that would let it cascade safely without a second pass.

A workspace-level UI that wants to fully retire a case is therefore responsible for issuing the additional removal calls in sequence after the case-store call has succeeded:

- Deletion of the case's sessions from the `sessions` store.
- Deletion of any R3.0E experiments tied to that case via the experiment store's `remove(experimentId)` — which itself deletes only the row in `r3_0e_experiments` plus the matching row in `r3_0e_experimentsIndex`, and does not cascade to outcomes, timelines, or follow-up links.
- Per-record cleanup of the dependent R3.0E artifacts, observing that the outcome store and the timeline store have **no `remove()` method** (outcomes are write-once; timelines are append-only per case). The follow-up-link store exposes `markParentStatus(linkId, 'deleted')`, which transitions the link's `parentStatus` enum but does not remove the row.
- Deletion of the R3.0D Engineer Brief artifacts associated with the case's sessions.

The R3.0F migration **journal** is unaffected by these removals. The journal is not a per-case ledger; it is a global record of schema/version transitions performed on the storage layer, keyed by `{store, key}` of the records that were migrated. Whether the underlying records still exist is independent of whether the engine recorded that it once migrated them.

A deletion is **immediate and local**. No tombstone is uploaded, no analytics event is emitted, no remote service is informed (because there are none).

### Full local deletion

A user who wants to wipe the product's state entirely — including the migration journal at `meta['__r3_0f_migration_journal__']` and the migration state at `meta['__r3_0f_migration_state__']` — has two equivalent options:

1. From within the app: remove each case via the workspace UI (which calls `caseStore.remove({ confirm: true })` per case) and the equivalent removal calls on `sessions` and the R3.0E stores. The migration journal/state inside the `meta` store remain afterward; they can only be wiped via option 2. This path also does not clear the `lang` UI-preference key in `localStorage`, since it is not part of any store's removal API.
2. From the OS: delete the Electron `userData` folder (paths under "Storage locations" above) while the app is closed. This discards every IndexedDB store, including the `meta` store that houses the migration journal and state, as well as the `lang` key in `localStorage`.

Either path leaves no case, session, R3.0E, or R3.0F data behind; only option 2 also clears the non-authoritative `lang` UI-preference key. There is no recovery service to ask, because there is no remote copy.

### What deletion does NOT do

- It does not delete the raw telemetry files the user originally imported — those are on the user's filesystem at the paths they chose. The product never owned them in the first place.
- It does not delete comparison bundles the user previously exported — those are files the user wrote to a location they chose. The product does not maintain a registry of past exports.

### Honesty about deletion

Deletion is what it claims to be: a removal of the local store entries. It is not a cryptographic wipe of the underlying storage device, and the documentation does not claim it is. A user with disk-level recovery concerns should use OS-level secure-delete tooling on the `userData` folder.

---

## R3.0F F2 end-to-end coverage

The F2 phase ships nine end-to-end flows under `tests/e2e/` — a Node-only logic harness (`tests/e2e/helpers/flow-harness.js`) that composes the production storage, migration, and R3.0E store modules over an in-memory `MemoryBackend()`, not a browser, DOM, Electron process, or IndexedDB. Each flow exercises the storage + migration pipeline for its scenario; not every flow invokes every producer end-to-end (for example flow-06 appends an `outcome_classified` timeline event directly rather than calling the R3.0E classifier). They are listed here so a reader of this document can trace any data-flow claim above to a concrete test:

| File | Purpose |
|---|---|
| `tests/e2e/flow-01-new-user.test.js` | A fresh `MemoryBackend()` instance (Node-only logic harness, not IndexedDB or a browser) produces a deterministic empty Case Library; F1 reports zero records; envelope is at v1; forbidden actions are disabled. |
| `tests/e2e/flow-02-real-telemetry.test.js` | A CSV-import-style telemetry session lands deterministically into `sessions`; F1 treats the session as at-target; no raw telemetry leaks into the case bundle. |
| `tests/e2e/flow-03-measured.test.js` | A case with measured-metric data preserves the credibility rung exactly `Measured` through storage roundtrip and migration; no credibility upgrade; qualifiers go in `limitations[]`, not the rung. |
| `tests/e2e/flow-04-reference-lap.test.js` | R3.0C reference-lap contract: explicit user selection only (no `fastestValid`, no `medianValid`, no `bestSectorComposite`); comparison authority requires same Case + same Session; delta sign = `comparison − reference`. |
| `tests/e2e/flow-05-vre.test.js` | R3.0D Engineer Brief: authoritative-only inputs; the brief does not classify, does not claim causation, does not blame the driver. |
| `tests/e2e/flow-06-setup-experiment.test.js` | R3.0E Experiment Loop end-to-end: create setup experiment, append an `outcome_classified` timeline event directly (does not call `classifyOutcome`), F1 sees the records as at-target. |
| `tests/e2e/flow-07-driver-experiment.test.js` | Driver-instruction-only experiment plus a follow-up Case-link `create` attempt (does not exercise `listForParent`/`markParentStatus`); follow-up Case Links carry no comparison authority (cross-case forbidden). |
| `tests/e2e/flow-08-export-import.test.js` | Case export produces an R3.0B-validated portable bundle with no raw telemetry; reimport creates an `imported_summary` record, never promoted to `local_full`. |
| `tests/e2e/flow-09-electron-smoke.test.js` | Reads `package.json` to confirm `electron` is declared as a devDependency with a valid semver range; does not invoke the Electron binary or launch a window. |

## R3.0F F3 hardening probes

The F3 phase ships six adversarial probes under `tests/e2e/hardening-{01..06}-*.test.js` covering 133 assertions total: the Electron host boundary (preload surface, `webPreferences`, CSP), storage-failure handling (`case-store.remove` confirm-guard, atomic `backend.transact` failure, oversized-record rejection), no-stale-UI invariants (case-id-bearing viewmodel fields after a Case/Session transition), large-library bounded-linear scaling (operation counts at `N` and `2N`), XSS surfaces (no unsafe DOM-injection patterns), and supply-chain integrity (dependency/script declaration allowlist, no committed secrets). The F3 manifest passes at the milestone baseline; the assertions are the canonical machine-readable counterpart to the prose in this document.

---

## Summary of guarantees

- All persistence is local. No cloud, no account, no remote ID.
- Raw telemetry is never in a case bundle. Only the structured `imported_summary` is.
- `imported_summary` is never promoted to `Measured` automatically. Promotion requires confirmed mapping + verified calibration + sample-quality gate + re-derived authority. When promotion is not warranted, a `Derived` or `Heuristic` substitute is offered explicitly, or the capability is `Unavailable`.
- Comparison is same-case + same-session, reference-lap explicit-user-only, delta sign `(comparison − reference)`. Follow-up Case Links never carry comparison authority.
- No production network egress. Enforced by CSP `default-src 'self' 'unsafe-inline' 'unsafe-eval'` (no `connect-src` declared, so it falls back to `default-src 'self'`) + absence of remote fetch call sites in production paths + R3.0F F3 supply-chain probe verification.
- Electron host explicitly sets `contextIsolation: true` and `nodeIntegration: false`; `sandbox`/`webSecurity`/`allowRunningInsecureContent`/etc. are absent (Electron defaults apply, never explicitly weakened) and the CSP allows `'unsafe-inline'`/`'unsafe-eval'` (not a strict policy). Preload surface is exactly `{ platform, version }` on `window.electronAPI`. R3.0F F3's electron-boundary probe asserts these properties; the XSS probe covers the adjacent DOM-injection attack surface and the supply-chain probe covers the adjacent dependency-surface attack vector — see "Electron host security" above for the exact contract.
- User control is local and immediate. `caseStore.remove({ confirm: true })` deletes the case row and rewrites `caseIndex.__index` atomically; it does **not** cascade. Sessions, R3.0E records (experiment/outcome/timeline/follow-up-link), and R3.0D briefs require separate removal calls; outcomes and timelines have no `remove()` (write-once / append-only by contract). The R3.0F migration journal and state live as two named keys inside the `meta` store and are wiped only by deleting `userData`.
- R3.0F F1 is deterministic, idempotent, fail-closed, structured-clone-only at the boundary, and **refuses to write producer-attestation field names** with `PRODUCER_ATTESTATION_REFUSED`. There is no `migrations` object store and no `migrationId`; the journal at `meta['__r3_0f_migration_journal__']` (capped at 256 entries by default) and the state at `meta['__r3_0f_migration_state__']` are the audit surface.
- All of the above held across R3.0F F1 migration, F2 nine E2E flows, and F3 six hardening probes (133 assertions) at the milestone baseline.

The same fail-closed posture that governs the credibility ladder governs the data layer: when a guarantee cannot be honoured on a given run, the operation is blocked with a reason, never approximated, never silently downgraded.
