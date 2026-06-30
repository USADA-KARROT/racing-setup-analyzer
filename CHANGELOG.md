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
- `featureRegistryActivationAllowed` remains **false** until the release gate; runtime
  consumers have been allowed since F1 but UI activation is governed phase-by-phase.
- `canonicalTrustUpgraded` remains a hard literal `false`. Suspension normalization is numeric
  compatibility, not evidence.
- Electron host posture is `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
  by default. The preload bridge exposes exactly `{ platform, version }` — nothing else.
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
  version remains pinned at 1.4.0 until the release gate flips.** Every transform is pure
  and replayable.
- **Fail-closed**: any unrecognized record shape, any producer attestation mismatch, any
  schema drift outside the R3.0B-frozen surface → migration blocked with a reason code; no
  silent best-effort upgrade.
- **Structured-clone-only firewall** at the persistence boundary. Inputs that cannot be
  structured-cloned are rejected at the door; nothing crosses the trust boundary as a live
  reference.
- **Trap-free JSON serializer**: getters, proxies, and throwing accessors cannot be used to
  exfiltrate state or poison output during serialization.
- **Producer-attestation defense**: migrated records carry a producer attestation; records
  whose attestation does not match the migration engine's identity are quarantined.
- `runtimeConsumersAllowed = true` enabled at F1 entry; UI activation remains gated.

### F2 — End-to-end flow coverage

Nine E2E flows exercised against production code (no UI stubs, no mocked engines — see the
E2E harness governance manifest at `governance/r3.0f/F2/manifest.json` and the harness
entrypoint under `test/e2e/r3-0f-flows/` for the enforcement that production services, not
mocks, are bound at flow setup):

1. Demo Analysis Case → load → run → observe (golden path).
2. Setup edit → re-run → comparison authority refresh.
3. Telemetry import → channel mapping → preflight → observation gating.
4. Reference-lap explicit selection → corner segmentation → corner pairing → delta metrics.
5. Comparison export → workspace persistence → reopen.
6. Decision engine: evidence graph → hypothesis → priority → Engineer Brief.
7. Experiment proposal → follow-up case linkage → timeline append.
8. Outcome classification → append-only timeline write.
9. Cross-session reopen → frozen-schema replay → no capability regression.

Each flow asserts the same fail-closed rules at runtime that the unit tests assert in
isolation. Flow output is never used to widen a credibility rung.

### F3 — Hardening probes (six)

| Probe | Scope | Fail-closed assertion |
|---|---|---|
| Electron boundary | Preload surface, contextIsolation, nodeIntegration | Preload exposes EXACTLY `{platform, version}`; no Node/Electron primitives reach the renderer |
| Storage failure | IndexedDB quota / corruption / version mismatch | Capability blocks with reason; in-flight state is not partially written |
| No-stale-UI | View-model identity across reopen / migration / refresh | Stale-eligibility flags from a prior session never re-authorize a capability |
| Large library | 501-preset catalogue + extended case history | No O(n²) regressions; persistence boundary remains structured-clone-only |
| XSS | Any text rendered from a case / telemetry / Engineer Brief | Renderer never interprets case content as HTML; no innerHTML on untrusted payloads |
| Supply-chain | Producer attestation + structured-clone boundary | Foreign-origin records are quarantined; no live-reference smuggling |

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
engine. All four stores are **append-only with monotonic `createdAt`**. `caseAssociation`
cross-case writes are forbidden — a follow-up case is a new case linked by ID, not a mutation
of a prior case.

| Capability | Credibility | Required input | Fail-closed when |
|---|---|---|---|
| Experiment proposal | Derived | Authoritative Engineer Brief priority item | Brief absent or stale token; cross-case association attempted |
| Outcome classification | Heuristic | Same-case + same-session comparison authority + controlled-variable witness | Comparison authority degraded; controlled variables not held; final-outcome flag from caller (never trusted) |
| Follow-up case link | Derived | Parent case ID + link grammar (parentCaseId, followUpCaseId, experimentId) | Reverse-index parent membership fails; path grammar violated |
| Timeline append | Derived | Outcome + follow-up records with monotonic `createdAt` | Out-of-order `createdAt`; mutation of a prior entry attempted |

Outcomes are classified into one of the following classes: `confirmed`, `refuted`,
`inconclusive`, `invalid_comparison`, `cannotConclude`. `invalid_comparison` takes
precedence over `inconclusive` and `cannotConclude` whenever the comparison authority
itself is not valid for this experiment; `cannotConclude` is the explicit terminal class
when the controlled-variable witness, credibility floor, or evidence linkage is missing
even though comparison authority is otherwise valid. The Outcome classifier is Heuristic
because its class assignment is a structured judgment over authoritative inputs, not a
measured magnitude — consistent with `docs/r3-experiment-loop.md`.

---

## R3.0D — Decision engine

R3.0D adds an evidence graph, a hypothesis engine, a priority engine, and an Engineer Brief
generator. **No runtime LLM.** **No causation claim from correlation.** **No driver blame.**
**No automatic setup application. Setup recommendations are emitted in physical units only;
hardware clicks are never emitted.**

| Stage | Credibility ceiling | Authoritative-only input | Fail-closed when |
|---|---|---|---|
| Evidence graph (D2) | Derived | Closure-private WeakSet verifies every node before admission | Caller-provided `eligible`/`confirmed`/`validated` flags are never trusted |
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
| Comparison export (C6) | Derived | Append-only export; reason codes carried through |
| Comparison workspace (C7) | Derived | View model never trusts a `confirmed` flag from a caller |
| Activation (C8) | Derived | Closure-private session authority; second WeakSet defends against session-ID string-match |

The full set of fail-closed reason codes is enumerated in the comparison reason-code
registry at `governance/r3.0c/reason-codes/registry.json` (the count reported there is the
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
