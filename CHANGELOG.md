# Changelog

All notable changes to the Racing Setup Analyzer are documented in this file.

The format follows a conventional changelog layout (Keep-a-Changelog style) tailored to the
R3.0 Integrated Delivery Train. Each entry preserves the honesty contract: every shipped
capability is described with credibility, provenance, fail-closed boundaries, and limitations.
The credibility ladder used throughout is:

**Physics > Model > Measured > Derived > Heuristic > Unavailable**

No conclusion documented below claims a credibility rung higher than the evidence supports.
When any required input or quality gate is missing, the capability is **blocked with a reason**,
never approximated.

---

## [Unreleased] — 2.0.0 candidate

The R3.0 Integrated Delivery Train (A through F) ships as a single release candidate.
`package.json` remains pinned at `1.4.0` until the release gate flips; the post-merge target
is `2.0.0`.

### Frozen invariants carried into the 2.0.0 candidate

- The R3 case-record schema introduced in R3.0B is **frozen** and was not modified by any
  later milestone (R3.0C through R3.0F).
- Preset count = **501**, byte-for-byte unchanged through the train.
- `featureRegistryActivationAllowed` is tracked **per phase**, not as one train-wide
  switch. R3.0C, R3.0D, and R3.0E have each already flipped their own flag to `true`
  (Comparisons, Engineer Brief, Experiment Loop, Case Timeline are live in navigation
  today); only R3.0F's own flag remains **false** until the release gate, and R3.0F
  introduces no case-scoped pane of its own. `runtimeConsumersAllowed` has been `true`
  since F1.
- `canonicalTrustUpgraded` remains a hard literal `false`. Suspension normalization is numeric
  compatibility, not evidence.
- Electron host `webPreferences` explicitly sets exactly three keys — `preload`,
  `contextIsolation: true`, `nodeIntegration: false`; no safety-relevant key (`sandbox`,
  `webSecurity`, etc.) is ever explicitly weakened, so Electron's own defaults apply to
  everything else. The preload bridge exposes exactly `{ platform, version }` on
  `window.electronAPI` — nothing else.
- **Comparison is same-case + same-session only.** Cross-case comparison and cross-session
  comparison within a single case are both **permanently forbidden** at every layer
  (authority, view model, export, decision engine, experiment loop).

### Honesty boundaries reaffirmed

- The product is not a professional race-engineer replacement.
- The product is not a complete multi-body-dynamics simulator and not a complete tyre model.
- No runtime LLM holds decision authority. No causation claim is made from correlation.
- No driver blame is emitted by any service.
- No automatic setup application. All Engineer Brief output is **authoritative-only** input.

---

## R3.0F — Integrated delivery (summary)

R3.0F integrates the prior milestones (A through E) into a shippable workspace, with a
deterministic migration path from the 1.4.0 baseline, end-to-end flow coverage, and a
hardening sweep. R3.0F adds no new capability ladders of its own; it ratifies and guards the
ladders that A through E established.

### F1 — Migration engine

- **Deterministic migration from the 1.4.0 baseline toward the 2.0.0 release candidate; the
  version remains pinned at 1.4.0 until the release gate flips.** Same inputs + same
  injected clock + same backend state → identical writes and identical journal entries.
- **Idempotent.** Running `migrate({confirm:true})` against a fully-migrated store performs
  zero writes and zero journal appends.
- **Fail-closed**: any unrecognized record shape, any schema drift outside the R3.0B-frozen
  surface, or any future-version record → migration blocked with a reason code; no silent
  best-effort upgrade. Future-version records are **rejected** with
  `UNSUPPORTED_FUTURE_VERSION` — never coerced.
- **Structured-clone-only firewall** at the persistence boundary. `structuredClone` is
  required at module load; the engine refuses to construct without it. Inputs that cannot be
  structured-cloned are rejected at the door with `PROXY_INPUT_REJECTED`; nothing crosses
  the trust boundary as a live reference.
- **Trap-free JSON serializer.** `_safeJsonStringify` walks own enumerable keys directly and
  **never invokes any `toJSON` hook**, defending against a hostile `Object.prototype.toJSON`
  installed after engine load. Getters, proxies, and throwing accessors cannot be used to
  exfiltrate state or poison output during serialization.
- **Producer-attestation refusal.** The migration engine **never fabricates or persists
  runtime producer authority**. Live producer modules (R3.0B / R3.0C / R3.0D / R3.0E) use
  closure-private `WeakSet` attestation that is never serialized; persisted data must remain
  attestation-free so downstream auditors can trust that those sentinel field names are
  *not* present after migration. The engine therefore **rejects** any migrated record whose
  top-level *or* nested object contains an attestation sentinel field (allowlist of
  15 well-known names such as `_authoritative`, `_producerAttested`, `_attested`,
  `_verified`, `_signature`, `_proof`, `_authority`, `_authoritativeSession`,
  `_authoritativeCase`, `_authoritativeOutcome`, and their double-underscore variants;
  rejection also covers any key beginning with one or more underscores whose
  NFKC+lowercase form contains one of seven reserved tokens: `authoritative`,
  `producerattested`, `attested`, `verified`, `signature`, `proof`, `authority`). Records
  carrying those sentinels are rejected with reason code
  **`PRODUCER_ATTESTATION_REFUSED`**. Ordinary contract fields such as `lapAuthority`,
  `projectionSignature`, and `experimentVerified` are *not* sentinels and pass through.
  Depth-bomb guard: any object nested deeper than 64 levels is treated as
  attestation-suspect and rejected.
- **Closed reason-code enum.** Any migrator-supplied reason that is not in the
  `REASON_CODES` set declared in `contracts/r3.0f/migration-envelope.js` is mapped to
  `NO_MIGRATION_PATH`. Malformed envelopes produce `ENVELOPE_VERSION_MISMATCH`.
- **Atomic commit.** Store writes, the journal append, and the META state are committed in
  a single `backend.transact()` across all six known stores plus META. A journal-overflow
  preflight (`MAX_JOURNAL × 4`) halts before any mutation if the journal would exceed its
  bound.
- **Non-cryptographic fingerprint.** `recordHash` uses FNV-1a and is *not* a tamper-proof
  signature; it is a deterministic content fingerprint for journal correlation only.
- **Public surface.** `createMigrationEngine({ backend, registry?, metaStore?, journalKey?,
  stateKey?, clock?, stamp?, maxJournalEntries?, maxRecordBytes? })` returns
  `{ detect, plan, migrate, journal, envelope, knownStores }`. The six known stores are
  `cases`, `sessions`, `r3_0e_experiments`, `r3_0e_outcomes`, `r3_0e_timelines`, and
  `r3_0e_followupLinks`.
- `runtimeConsumersAllowed = true` is enabled at F1 entry; UI activation remains gated.

### F2 — End-to-end flow coverage

Nine E2E flows exercise production code (no UI stubs, no mocked engines). The F2 governance
checkpoint lives at **`governance/r3.0f/checkpoints/F2.json`**. The flow files live at
**`tests/e2e/flow-{01..09}-*.test.js`**, each bound to production services at setup:

1. **`flow-01-new-user.test.js`** — New-user empty-state journey. A fresh `MemoryBackend()`
   instance in the Node-only F2 logic harness (not IndexedDB, not a browser) produces a
   deterministic empty Case Library state; the F1 migration engine reports zero records;
   the F1 envelope is at v1; and the forbidden actions (auto reference-lap, auto setup
   apply, runtime-LLM authority, causation inference, driver blame) are not enabled.
2. **`flow-02-real-telemetry.test.js`** — Real telemetry import. A CSV-import-style
   telemetry session lands deterministically into the session store; the F1 migration
   engine treats the session as at-target (no migration needed); the session is
   retrievable; no raw telemetry leaks into a case bundle.
3. **`flow-03-measured.test.js`** — Measured-metrics flow. A Case with a measured metric
   (e.g. K_us measured against a verified steering calibration) preserves the credibility
   rung **exactly** = `measured` across a storage round-trip and through migration. No
   credibility upgrade occurs. Qualifiers stay in `limitations[]`, never in the rung
   itself.
4. **`flow-04-reference-lap.test.js`** — Reference-lap explicit selection. The R3.0C
   reference-lap selection contract enforces explicit user selection only (no
   `fastest_valid`, no `median_valid`, no `best_sector_composite`); comparison authority
   requires same Case + same Session; the delta sign convention is
   `(comparison − reference)`.
5. **`flow-05-vre.test.js`** — Engineer Brief (R3.0D) authoritative-only inputs. Inputs are
   the **verified** outputs of the R3.0D hypothesis and priority modules; the brief does
   not classify outcomes, does not claim causation, does not blame the driver; no runtime
   LLM holds decision authority; the brief is a **read projection**, never a
   re-classification. A forged `HypothesisSet` is rejected by the `WeakSet` authority gate.
6. **`flow-06-setup-experiment.test.js`** — Setup experiment create + timeline append.
   Drives the R3.0E Experiment Loop end-to-end: create a setup experiment in the store,
   append an `outcome_classified` timeline event (the flow appends the event directly; it
   does not invoke `classifyOutcome`), and verify the F1 migration engine sees the records
   as at-target. The append-only timeline contract is enforced — a correction is a *new*
   timeline event, never a mutation of a prior one.
7. **`flow-07-driver-experiment.test.js`** — Driver experiment with follow-up case link.
   Same Experiment Loop as Flow 06 but for a driver-instruction-only experiment.
   `setupChange` is a required plain-object field on every Experiment (the E1 contract
   rejects a missing one) — for this driver-only flow it carries a placeholder noting no
   mechanical change (`{ component: 'driver_only', note: 'no mechanical change' }`), while
   `driverInstruction` carries the actual instruction; also exercises the follow-up-link
   store's `create` path. Follow-up case links carry **no comparison authority**; cross-case
   comparison is forbidden. The flow's link write uses `parentStatus: 'follow_up_required'`,
   which is outside the contract's allowed enum (`'present' | 'archived' | 'deleted'`); the
   assertion tolerates either a successful create or a rejection carrying an `R3_0E_LINK_*`
   reason code — it does not assert that `listForParent` or a `markParentStatus` transition
   succeeds.
8. **`flow-08-export-import.test.js`** — Case export + re-import. Case export produces a
   portable bundle (R3.0B schema-validated, no raw telemetry); importing the bundle into a
   fresh backend creates an `imported_summary` record that is **never** promoted to
   `local_full`; the imported record carries no producer attestation (the engine never
   fabricates one); the F1 migration engine sees `imported_summary` as at-target; the
   round-trip preserves the public fields.
9. **`flow-09-electron-smoke.test.js`** — Electron startup smoke. Reads `package.json` to
   confirm `electron` is declared as a devDependency with a valid semver-range string;
   `main.js` exposes a stable Electron-compatible entry shape; `preload.js` exposes only
   the minimal `contextBridge` surface (`nodeIntegration: false`, `contextIsolation: true`).
   The flow does not invoke the `electron` binary or launch a window — it is a
   declaration-level smoke check, not a process-launch check.

Each flow asserts the same fail-closed rules at runtime that the unit tests assert in
isolation. Flow output is never used to widen a credibility rung.

### F3 — Hardening probes (six)

Six hardening probes live at **`tests/e2e/hardening-{01..06}-*.test.js`**, carrying
**133 assertions** in aggregate against production code paths:

| Probe | Scope | Fail-closed assertion |
|---|---|---|
| Electron boundary | Preload surface, `contextIsolation`, `nodeIntegration`, CSP | Preload exposes EXACTLY `{platform, version}`; no Node/Electron primitives reach the renderer; no unsafe `webPreferences` flag is ever flipped on |
| Storage failure | `case-store.remove` confirm-guard, `backend.transact` failure, oversized record | `remove` without `confirm:true` is `CONFIRM_REQUIRED`; a backend failure leaves the source record completely unchanged (`BACKEND_REJECTED`, no partial write); an oversized record is rejected by the record-bytes cap |
| No-stale-UI | Case-id-bearing viewmodel fields across reopen / migration / transition (incl. R3.0C/D/E `caseAssociation` fields) | No stale case-id reference survives a Case/Session transition, verified against a real R3.0E experiment record's production shape |
| Large library | Case-store + F1 migration engine at `N` and `2N` library size | `backend.list`/`get`/`transact` operation counts grow bounded-linear, not quadratic |
| XSS | Any text rendered from a case / telemetry / Engineer Brief | Renderer never pipes user-supplied or case-derived text into `innerHTML` or `document.write` |
| Supply-chain | `package.json` dependency/script declarations, committed secrets | Only known Electron/electron-builder deps declared; no bare third-party `require()` in production renderer modules; no untrusted script references; no committed secrets/`.env` files |

### Documentation sweep

Existing docs (`credibility-and-trust.md`, `product-positioning.md`, `r2-capability-map.md`,
`analysis-workspace-architecture.md`, `r3-0c-integrated-delivery-governance.md`) are
unchanged in tone and untouched in their normative claims. This `CHANGELOG.md` is added as
the single timeline of record.

### Release readiness

Version bump to `2.0.0` is deferred until the release gate flips. Until then,
`package.json` stays at `1.4.0` and the activation gate stays closed.

### Release gate (pending)

When the release gate flips `featureRegistryActivationAllowed = true`, the version pins to
`2.0.0`. No tag, no GitHub release, no `main` merge is performed by the train itself.

---

## R3.0E — Experiment loop

R3.0E adds the experiment / outcome / follow-up / timeline ladder on top of the decision
engine. The mutation surfaces are deliberately heterogeneous: **only the timeline store
is append-only with monotonic `createdAt`** and exposes no mutation surface; the
**experiment store** allows targeted mutation through `create`, `update`, and `remove`;
the **follow-up-link store** allows only the narrow `markParentStatus` on existing links;
the **outcome store** is **create-only through its public API** (`create`, `get`,
`listForExperiment`) with duplicate-id rejection and no `update` or `remove`. None of
these stores ever promote comparison authority across cases. `caseAssociation` cross-case
writes are forbidden — a follow-up case is a new case linked by ID, not a mutation of a
prior case.

| Capability | Credibility | Required input | Fail-closed when |
|---|---|---|---|
| Experiment proposal | Derived | `sourceHypothesisId`/`sourceRecommendationId` (id-grammar-checked string references — not a live-verified brief token) | Malformed/missing required field per the E1 contract; `outcome` set before `status` reaches a terminal state |
| Outcome classification | Heuristic | Same-case + same-session comparison authority + controlled-variable witness | Comparison authority degraded; controlled variables not held; final-outcome flag from caller (never trusted) |
| Follow-up case link | Derived | Parent case ID + link grammar (`parentCaseId`, `followUpCaseId`, `experimentId`) | Reverse-index parent membership fails; path grammar violated; cross-case comparison authority attempted |
| Timeline append | Derived | Outcome + follow-up records with monotonic `createdAt` | Duplicate `eventId`; out-of-order `createdAt`; mutation of a prior entry attempted |

Store contract reminders:

- **Experiments**: `create`, `update`, `remove` permitted; `EXPERIMENTS` and
  `EXPERIMENTS_INDEX` are kept in lockstep on delete.
- **Outcomes**: create-only through the public API (`create`, `get`, `listForExperiment`);
  no `update`, no `remove`. An outcome is classified once.
- **Timeline**: append-only per case; duplicate `eventId` rejected; out-of-order timestamps
  rejected; a correction is a new event, not a mutation.
- **Follow-up links**: `create`, `listForParent`, `markParentStatus` permitted; the link
  itself carries no comparison authority.

Outcomes are classified into one of six classes, in precedence order: `invalid_comparison`,
`inconclusive_due_to_confounders`, `inconclusive`, `contradicted`, `confirmed`,
`partially_confirmed`. `invalid_comparison` takes precedence over every other class
whenever the follow-up's same-case / same-session / explicit-reference / comparability
attestation is not valid; `inconclusive_due_to_confounders` is next whenever a declared
control variable is missing or out of range. There is no `refuted` class and no
`cannotConclude` class — see `docs/r3-experiment-loop.md` "Outcome classes" for the full
table. The Outcome classifier sits at **Heuristic** on the ladder because its class
assignment is a structured judgment over authoritative inputs, not a measured magnitude.

---

## R3.0D — Decision engine

R3.0D adds an evidence graph, a hypothesis engine, a priority engine, and an Engineer Brief
generator. **No runtime LLM.** **No causation claim from correlation.** **No driver blame.**
**No automatic setup application. Setup recommendations are emitted in physical units only;
hardware clicks are never emitted.**

| Stage | Credibility ceiling | Authoritative-only input | Fail-closed when |
|---|---|---|---|
| Evidence graph (D2) | Derived | Closure-private `WeakSet` verifies every node before admission | Caller-provided `eligible`/`confirmed`/`validated` flags are never trusted |
| Hypothesis engine (D3) | Derived | D2-verified graph only; verifier-first | Graph identity check fails; `_authoritativeGraphs` membership absent |
| Priority engine (D4) | Heuristic | Hypotheses + capability availability + fail-closed reason codes | Hypothesis input not D3-issued |
| Engineer Brief (D5) | Heuristic | Priorities + provenance + limitations | Brief is regenerated on every prepare; no retired-token replay; no blocked-prepare poisoning |

The Engineer Brief is the **authoritative-only input** to R3.0E experiments. It is never
presented as a measured magnitude, never as a guaranteed result, never as setup clicks, and
never as a lap-time claim. Any actionable recommendation surfaces in physical units
(spring rate change in N/mm, ride-height delta in mm, ARB stiffness in Nm/deg, etc.) with
explicit provenance and limitations attached; mapping those physical-unit recommendations
to a specific car's adjustment hardware (clicks, turns, shim packs) is **out of scope** and
is never performed by the brief.

---

## R3.0C — Comparison authority

R3.0C is the comparison spine. All deltas, all reference selection, all corner pairing, and
all comparison exports are **same-case + same-session only**. Reference-lap selection is
**explicit user selection only** — there is no `fastest_valid`, no `median`, no
`best_sector_composite`, no auto-pick. Cross-case comparison and cross-session comparison
within a case are both permanently forbidden at the authority, view-model, export, and
decision-engine layers.

| Component | Credibility | Notes |
|---|---|---|
| Lap authority (C2) | Derived | Lap closure derived from confirmed `lap` channel only |
| Track identity (C2) | Derived | Track identity derived from confirmed inputs; no fuzzy match |
| Normalized distance (C3) | Derived | Per-lap normalization with monotonic-timebase guard |
| Reference selection (C4) | Derived | **Explicit user selection only.** No auto-pick. |
| Corner segmentation (C4) | Derived | Sign-based grouping with near-centre log-gap guard |
| Corner pairing (C4) | Derived | Same-corner / same-direction / same-distance band |
| Delta metrics (C5) | Derived | Sign convention: `(comparison − reference)`. Six allowlisted metrics. |
| Comparison export (C6) | Derived | Bounded comparison-summary envelope (not append-only); reason codes carried through |
| Comparison workspace (C7) | Derived | View model never trusts a `confirmed` flag from a caller |
| Activation (C8) | Derived | Closure-private session authority; second WeakSet defends against session-ID string-match |

The full set of fail-closed reason codes is enumerated in the comparison reason-code
contract module at `contracts/r3.0c/reason-codes.js` (the count there is the
authoritative figure; the changelog deliberately does not duplicate it). Every reason code
is **machine-readable** and accompanies the blocked capability in the UI. The comparison
surface refuses to emit a measured magnitude; "observed_more_understeer" is **directional,
not measured**.

---

## R3.0B — Persistence (reference)

R3.0B introduced the R3 case-record schema and two stores:

- **case-store** — case records keyed by case ID.
- **session-store** — session records keyed by session ID, linked to case ID.

Backed by `storage-backend.js` (IndexedDB in the browser, in-memory in Node tests). The R3
case-record schema introduced here is **frozen at v1.4.0** and was not modified by R3.0C,
R3.0D, R3.0E, or R3.0F. Persistence boundary is structured-clone-only since F1.

## R3.0A — Workspace shell (reference)

R3.0A introduced the case-centric workspace shell — a navigation surface organized around
the Analysis Case primary object. R3.0A added no new measurement capability; it relocated
R2-era capabilities into a case-centric layout and preserved their credibility / blocking
behaviour intact.

---

## Pre-2.0 baseline — 1.4.0

The 1.4.0 baseline is the R2 series final state, integrated through the R2.2 End-to-End
Analysis Workspace work. The 1.4.0 capability map is documented in
`docs/r2-capability-map.md` and is summarized here for changelog continuity:

- **Available** (works on model inputs alone) — closed-form physics summaries, model-side
  setup deltas in physical units, eligibility re-derived on every run.
- **Conditionally Available** (need real telemetry and/or calibration; gated) — directional
  tendency observations, reference-relative comparison surfaces, lap-window observations.
- **Blocked** (fail-closed; never fabricated) — measured K_us without a verified steering
  calibration, hardware setup clicks, lap-time guarantees, causation claims from
  correlation, professional-grade validation claims.
- **Deferred** — the R3.0A through R3.0F surface that this changelog records as arrived.

**Out of scope, never implied:** professional validation · full MBD · a complete tyre
model · GPS racing line · hardware click mapping · automatic physics calibration · cloud
collaboration · multi-user.

---

## Notes on this changelog

- This file is the single timeline of record for the R3.0 Integrated Delivery Train.
- Section ordering is newest-first by milestone; within each milestone, capability tables
  carry credibility, required input, and fail-closed conditions in the same columns the
  capability maps use.
- Nothing in this changelog upgrades a credibility rung. A capability that was Derived in
  its milestone is Derived here; a capability that was Heuristic in its milestone is
  Heuristic here.
- For the full credibility ladder and honesty contract, see `docs/credibility-and-trust.md`.
- For product positioning and out-of-scope statements, see `docs/product-positioning.md`.
- For R3.0 Train governance, see `docs/r3-0c-integrated-delivery-governance.md`.
