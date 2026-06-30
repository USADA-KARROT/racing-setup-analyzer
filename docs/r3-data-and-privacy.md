# R3.0 Data Flows & Privacy

This document is the authoritative reference for **where Racing Setup Analyzer's data lives, what is persisted, what is exported, and what is never sent over the network**. It also documents the Electron host security boundaries that enforce these guarantees.

The contract is conservative on purpose: the same fail-closed posture that governs the credibility ladder (Physics > Model > Measured > Derived > Heuristic > Unavailable) governs data handling. The product holds no remote copy of any value, so there is no remote surface from which a value could leak; a value that the user did not explicitly export cannot escape the case bundle.

R3.0F preserves all data invariants frozen at R3.0B (the case-record schema, frozen at v1.4.0) and adds the migration / E2E / hardening evidence that the same posture holds end-to-end.

---

## Storage locations

Racing Setup Analyzer runs in two host contexts. Both contexts use the same storage backend abstraction (`storage-backend.js`) so the contracts below hold in either.

| Host context | Backend | Where the bytes live | Lifetime |
|---|---|---|---|
| Browser (renderer in dev / web build) | IndexedDB | Per-origin IndexedDB database, owned by the browser profile | Until the user clears site data, or the app calls `remove({ confirm: true })` |
| Electron desktop | IndexedDB under Chromium, scoped to `app.getPath('userData')` | OS user-data folder (macOS: `~/Library/Application Support/<app>`, Windows: `%APPDATA%/<app>`, Linux: `~/.config/<app>`) | Until the user deletes `userData`, uninstalls the app, or the app calls `remove({ confirm: true })` |
| Node test harness | In-memory `Map` shim | Process memory only | Discarded at process exit |

There is **no cloud database, no remote object store, no syncing service, no user account, no remote ID broker**. The product has no notion of a remote user. Two installations of the app on two machines share zero state.

### Object stores

The persistence layer is organized into logical stores introduced across three phases. Only the R3.0B case-record schema is frozen at v1.4.0; the R3.0E and R3.0F stores were added later under their own contracts and are not part of the frozen schema.

**R3.0B original stores (case-record schema frozen at v1.4.0; not modified by R3.0C, R3.0D, R3.0E, or R3.0F):**

| Store | Purpose | Identity | Append-only |
|---|---|---|---|
| `cases` | R3 case records (vehicle + setup + optional imported telemetry summary) | `caseId` | No (records can be updated by their owning case) |
| `sessions` | Per-case sessions; each session owns its laps, track identity, normalized distance frames | `sessionId` (scoped to a `caseId`) | No (a session's contents grow during a run, but a session cannot be re-parented) |

**R3.0E additions (append-only audit chain for the experiment loop):**

| Store | Purpose | Identity | Append-only |
|---|---|---|---|
| `experiments` | Experiment records bound to a case | Composite store-metadata key | **Yes** — monotonic `createdAt`, no in-place mutation |
| `outcomes` | Outcome classifier outputs (append-only) | Composite store-metadata key | **Yes** |
| `timelines` | Per-experiment timeline entries | Composite store-metadata key | **Yes** |
| `followUpLinks` | Follow-up links between experiments | Composite store-metadata key | **Yes** |

The R3.0E append-only stores additionally maintain a `storeMetadata` record with monotonic-clock invariants. Re-parenting a follow-up across cases is rejected at the store boundary (`caseAssociation` cross-case is forbidden).

**R3.0F additions (migration audit chain):**

| Store | Purpose | Identity | Append-only |
|---|---|---|---|
| `migrations` | Producer-attestation records for each schema/version transition | `migrationId` | **Yes** |

---

## What is stored vs ephemeral

The decision of what to persist follows a single rule: **persist what the user authored or imported; recompute everything else**. Authority is not stored — authority is re-derived from raw evidence on every run.

### Persisted

These survive a process restart:

- The R3 case record (vehicle preset reference, setup levers, notes, free-text fields the user wrote).
- The session container (track identity stamped by the user, lap boundaries computed and stored once per session, normalized distance frames stored once per lap because they are deterministic and expensive).
- The imported telemetry **summary** (channel inventory, mapping decisions, calibration confirmations, sample-quality flags, provenance markers). See "Raw telemetry is NEVER in case bundle" below.
- The R3.0D Engineer Brief artifacts (evidence-graph IDs, hypotheses, priorities, brief text) — these are append-only outputs of authoritative-only inputs and are stored alongside the session they were derived from.
- R3.0E append-only stores: experiments, outcomes, timelines, follow-up links — all with monotonic `createdAt` and no in-place mutation.
- R3.0F migration attestation records (which version produced what, structured-clone fingerprint, fail-closed reasons if any).

### Ephemeral

These live only in memory and are recomputed from persisted inputs on every run:

- Authority objects (lap authority, track identity authority, reference-selection authority, comparison authority, session authority). These are sealed in closure-private `WeakSet`s and are never serialized.
- Reason-code arrays attached to a run's blocked/eligible state.
- The R3.0D `LIMITATION_IMPORTED_SUMMARY` propagation chain — re-derived on every D2 → D3 → D5 traversal.
- Capability eligibility (`eligible` / `confirmed` / `validated`). A caller's flag is never trusted; eligibility is re-derived from raw evidence on every run.
- The R3.0D closure-private references `_authoritativeGraphs` (D2 WeakSet) and `_CAPTURED_EG_VERIFY_GRAPH` (D3 mandatory capture, established at the Formal D Gate) — these are closure-private and not serializable.

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

This rule is enforced at the boundary of every consumer (R3.0C delta-metrics, R3.0D evidence-graph, R3.0E outcome classifier, R3.0F migration). It is **not** a UI-layer check — promotion would be impossible regardless of UI.

---

## Comparison bundle export shape

Comparison export (R3.0C C6) is a user-initiated action. It produces a single structured artifact suitable for sharing with a teammate or archiving locally.

A comparison bundle contains:

- The R3 case record (the v1.4.0 frozen schema).
- The session container for the run being exported.
- The reference lap descriptor (explicit-user-selected; see below) and the comparison lap descriptor.
- Track identity authority output (the immutable identity stamped by the user, not auto-inferred).
- Normalized distance frames for the relevant laps.
- Corner segmentation and corner pairing authority outputs.
- Delta metrics (the six allowlisted metrics) with fixed sign convention.
- The imported_summary for any channels referenced by the delta metrics.
- The R3.0D Engineer Brief artifact for this session (if one exists), including evidence-graph IDs, hypotheses, priorities, reason codes, and limitations.
- Provenance metadata: app version, schema version, structured-clone fingerprint (R3.0F producer-attestation).

A comparison bundle does **not** contain:

- Raw telemetry rows.
- Any authority object (WeakSet membership cannot be serialized; consumers re-derive authority on import).
- Any `eligible`/`confirmed`/`validated` flag that the importer should trust — the importer re-derives.
- Any path on the originating filesystem.
- Any user identifier — the product has none.

### Reference lap and delta sign

Two invariants travel with every bundle:

- **Reference lap is EXPLICIT-USER-SELECTION only.** There is no `fastest_valid`, no `median`, no `best_sector_composite` auto-selection. The bundle records which lap the user explicitly selected and the timestamp of that selection.
- **Delta sign convention is `(comparison − reference)`.** Never the other way. The bundle records this string literally so a downstream consumer cannot quietly invert it.

### Same-case + same-session only

Comparison is **same-case + same-session only**. A bundle that attempted to compare laps from different cases or different sessions would be rejected at the C4 pairing boundary with a reason code; it cannot be produced and therefore cannot be exported.

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

This is the product's invariant: no data leaves the host unless the user explicitly exports a comparison bundle (a file written to a path the user picks) or shares it themselves out-of-band.

How the invariant is enforced, in layers:

1. **Absence of call sites.** Production paths contain no `fetch`, `XMLHttpRequest`, `WebSocket`, or `navigator.sendBeacon` to remote origins. This is a code-shape property, auditable by grep.
2. **Electron Content Security Policy.** The renderer's CSP (see below) restricts `connect-src` to `'self'`, so even if a third-party dependency attempted to open a remote connection, the browser engine would refuse it.
3. **R3.0F F3 supply-chain probe.** F3's hardening manifest includes a supply-chain probe that asserts the production build does not introduce a new outbound origin via a dependency update. The probe passes at the F3 baseline that ships in this milestone.

The combination of "no call sites in our code" + "CSP refuses connections" + "supply-chain probe verifies the dependency surface" is what the contract rests on, rather than a single runtime interceptor.

---

## Electron host security

The Electron host is configured to deny the renderer any path to system resources beyond an explicitly enumerated preload surface.

| Setting | Value | Rationale |
|---|---|---|
| `contextIsolation` | `true` | Renderer JavaScript runs in an isolated context; it cannot reach into the preload's Node scope. |
| `nodeIntegration` | `false` | The renderer has no `require`, no `process`, no Node globals. Renderer code cannot touch the filesystem, spawn processes, or load native modules. |
| `sandbox` | `true` (default for renderers) | OS-level sandbox; renderer cannot make arbitrary syscalls. |
| `webSecurity` | `true` | Same-origin policy enforced in renderer. |
| `allowRunningInsecureContent` | `false` | Mixed-content blocked. |
| Content Security Policy | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` | No remote origins. No inline scripts beyond hashed/nonced ones. No remote `connect-src` — combined with the no-egress contract, this means the renderer has no way to phone home even if compromised. |
| `nodeIntegrationInWorker` | `false` | Workers also have no Node. |
| `nodeIntegrationInSubFrames` | `false` | Sub-frames likewise. |
| `enableRemoteModule` | `false` / deprecated and not used | The `remote` module is never enabled. |

### Preload surface

The preload script exposes **exactly two properties** to the renderer via `contextBridge.exposeInMainWorld`:

```
{
  platform: string,   // 'darwin' | 'win32' | 'linux'
  version:  string    // app semver, e.g. '1.4.0'
}
```

Nothing else. No `require`, no `ipcRenderer`, no `fs`, no `path`, no `child_process`, no shell, no remote loader, no `webContents` handle.

The renderer therefore has no way to read or write the user's filesystem directly. IndexedDB is the only persistence mechanism it can reach, and IndexedDB is itself scoped by Chromium to `userData`.

### What this denies the renderer

Even if the renderer were fully compromised (e.g. via the kind of injection the R3.0F F3 XSS probe is designed to surface), the renderer cannot:

- Read files outside IndexedDB.
- Write files outside IndexedDB.
- Open network connections to anything but the same origin (and the same origin is a local `file://` or bundled `app://`, with no remote endpoints).
- Spawn child processes.
- Load native code.
- Escalate to the main process beyond the two preload properties.

R3.0F's F3 electron-boundary hardening probe asserts each of these denials and passes at this milestone. The XSS probe and the supply-chain probe (also part of the F3 six-probe manifest) cover the adjacent attack surfaces.

### Migration boundary (R3.0F F1)

R3.0F's migration engine runs inside the same renderer-side sandbox. It is **deterministic**, **fail-closed**, and uses a **structured-clone-only firewall** for any value crossing the migration boundary: a value that cannot be structured-cloned (functions, symbols, DOM nodes, class instances with non-cloneable internals) is rejected at the boundary, never silently dropped. The JSON serializer used inside the engine is trap-free (no getters with side effects can fire during serialization), and a producer-attestation record is written for every migration so that a future consumer can verify it was produced by a trusted version.

The migration attestation records live in the dedicated `migrations` store and form a **standalone audit chain**. They are retained even when the records they describe are later removed by the user (see "Removing a case"), because the chain's value is recording *what producer version performed each transition*; tying its lifetime to a single mutable referent would defeat the audit purpose. A user who wants to discard the migration audit chain can do so only by deleting the `userData` folder (see "Full local deletion").

---

## User control

The product gives the user explicit, local control over their data. There is no remote account to manage, no support back-end to file requests with, no asynchronous deletion. Everything is local.

### Removing a case

A case is deleted via `caseStore.remove(caseId, { confirm: true })`. The `confirm: true` flag is **required**; the store rejects a removal call without it as a fail-closed safeguard against accidental UI wiring. Removal:

- Deletes the case record from the `cases` store.
- Deletes all sessions owned by that case from the `sessions` store.
- Deletes all R3.0E append-only records (`experiments`, `outcomes`, `timelines`, `followUpLinks`) whose `caseAssociation` points at that case.
- Deletes all R3.0D Engineer Brief artifacts for that case.

R3.0F migration attestation records in the `migrations` store are **not** cascaded; they are retained as a standalone audit chain (see "Migration boundary"). The records they describe may be gone, but the attestation that "producer version X performed transition Y at time T" remains.

A deletion is **immediate and local**. No tombstone is uploaded, no analytics event is emitted, no remote service is informed (because there are none).

### Full local deletion

A user who wants to wipe the product's state entirely — including the migration audit chain — has two equivalent options:

1. From within the app: remove each case via the workspace UI (which calls `remove({ confirm: true })` per case), then delete the residual migration audit chain only by option 2 below.
2. From the OS: delete the Electron `userData` folder (paths under "Storage locations" above) while the app is closed. This discards every store, including `migrations`.

Either path leaves nothing behind. There is no recovery service to ask, because there is no remote copy.

### What deletion does NOT do

- It does not delete the raw telemetry files the user originally imported — those are on the user's filesystem at the paths they chose. The product never owned them in the first place.
- It does not delete comparison bundles the user previously exported — those are files the user wrote to a location they chose. The product does not maintain a registry of past exports.

### Honesty about deletion

Deletion is what it claims to be: a removal of the local store entries. It is not a cryptographic wipe of the underlying storage device, and the documentation does not claim it is. A user with disk-level recovery concerns should use OS-level secure-delete tooling on the `userData` folder.

---

## Summary of guarantees

- All persistence is local. No cloud, no account, no remote ID.
- Raw telemetry is never in a case bundle. Only the structured `imported_summary` is.
- `imported_summary` is never promoted to `Measured` automatically. Promotion requires confirmed mapping + verified calibration + sample-quality gate + re-derived authority. When promotion is not warranted, a `Derived` or `Heuristic` substitute is offered explicitly, or the capability is `Unavailable`.
- Comparison is same-case + same-session, reference-lap explicit-user-only, delta sign `(comparison − reference)`.
- No production network egress. Enforced by CSP `connect-src 'self'` + absence of remote fetch call sites in production paths + R3.0F F3 supply-chain probe verification.
- Electron host enforces `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, strict CSP, and a preload surface of exactly `{ platform, version }`. R3.0F F3 electron-boundary and XSS probes assert this surface.
- User control is local and immediate: `remove({ confirm: true })` per case, or delete `userData`. Migration attestation records are retained as a standalone audit chain; the only way to discard them is to delete `userData`.
- All of the above held across R3.0F F1 migration, F2 nine E2E flows, and F3 six hardening probes at the milestone baseline.

The same fail-closed posture that governs the credibility ladder governs the data layer: when a guarantee cannot be honoured on a given run, the operation is blocked with a reason, never approximated, never silently downgraded.
