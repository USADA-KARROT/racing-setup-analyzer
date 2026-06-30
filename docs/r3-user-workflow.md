# R3 User Workflow — End-to-End

This document traces a single user's path through the R3 application surface, from the empty-library first launch to exporting a comparison bundle. It is a workflow companion to `docs/credibility-and-trust.md`, `docs/product-positioning.md`, `docs/r2-capability-map.md`, `docs/analysis-workspace-architecture.md`, `docs/r3-experiment-loop.md`, and `docs/r3-credibility-model.md`. It does not repeat the credibility ladder definitions; it shows where each rung is enforced as the user moves through the screens.

The ladder, in shorthand, is the only basis for what the UI is allowed to render at each step:

> Physics > Model > Measured > Derived > Heuristic > Unavailable

Every conclusion described below carries credibility, confidence (where relevant), provenance, limitations, blockers, evidence references, and a next validation step. The product never approximates around a missing input; it blocks with a machine-readable reason.

A note on version numbers used in this document: the **R3 case-record schema version** is `v1.4.0` and is frozen — that string identifies the on-disk shape of a Case record and has not been modified through R3.0F. The **package application version** is also `1.4.0` today, with a target of `2.0.0` post-merge of the integrated delivery train. These two versions are related but distinct: a future application version bump does not, on its own, advance the case-record schema. F1 migration treats `v1.4.0` as the baseline regardless of which application version is reading it.

---

## First launch (empty library)

On the very first launch the local store is empty. R3.0B has provisioned an IndexedDB-backed `case-store`, `session-store`, and `caseAssociation` index through `storage-backend.js`; in Node test mode the same contracts run against an in-memory backend. There is no remote sync, no account, no cloud — every artefact lives on the user's device.

The application runs inside an Electron host configured with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true` by default; the preload bridge exposes exactly two values to the renderer — `{platform, version}` — and nothing else. The renderer cannot reach Node, the file system, or arbitrary IPC; every privileged operation goes through the storage backend's typed contract.

Across the entire R3.0F surface, two activation flags govern what the runtime is allowed to do today. `runtimeConsumersAllowed` has been `true` since F1 — production services bind to authoritative inputs and emit results. `featureRegistryActivationAllowed` is `false` and remains `false` until `F6_RELEASE`; any path that would activate a deferred capability through the feature registry fails closed with a named reason code, regardless of whether the underlying service is otherwise ready.

The Setup Library landing pane shows:

- A clean library state. No fabricated demo cases are listed in the user's library.
- The Vehicle Preset Browser surfaces the 501 frozen presets (preset count is an invariant; the UI will refuse to start if it drifts).
- A single call to action: **Create a new Case** or **Open the Demo Analysis Case** (the golden path).

The Demo Analysis Case is the only Case that ships pre-populated. Its narrative is produced by production code — the same services that run on a user's real Case — not by hardcoded copy. It exists so a user can see the full capability map exercised end-to-end before they have any telemetry of their own.

Nothing on the first-launch screen claims engineer-grade sign-off, lap-time gains, or measured handling. Capabilities that require telemetry or calibration are visibly marked blocked, with the reason code (`NO_TELEMETRY_IMPORTED`, `NO_CALIBRATION_BOUND`, etc.) shown verbatim.

---

## Create or open a Case

A Case is the case-centric primary object defined in R3.0A and persisted under the R3 case-record schema frozen at `v1.4.0` in R3.0B. The schema has not been modified through R3.0F and will not be modified until a future major; F1 migration treats `v1.4.0` as the baseline.

When the user creates a Case they supply:

- A vehicle preset (one of 501 frozen presets, or a user-edited copy).
- A setup (the active setup snapshot at Case creation; mutations after import are tracked, not silently rewritten).
- An optional descriptive label and track identity. Track identity is later used by R3.0C to refuse cross-track comparison.

Opening an existing Case rehydrates the workspace through `_r3cBeginCaseTransition`, which is the single transition helper introduced in R3.0C C8. It bumps the session-authority token, clears any prior reference selection, clears the cached comparison authority, and notifies the rest of the shell that a Case has been re-opened. The view model never trusts a caller-provided `eligible` / `confirmed` / `validated` flag — authority is re-derived from raw evidence on every open.

The Case record carries no measured handling number at this stage. Anything the UI shows is either Physics (closed-form from preset geometry) or Model (a prediction). No measured K_us value, no lap-time figure, no causation language appears.

---

## Import telemetry (CSV / canonical)

Telemetry import is intentionally a separate path from setup. Two import flows are available:

1. **CSV import** — the universal Telemetry CSV Viewer path. The user picks a CSV; the importer runs preflight diagnostics, surfaces unmapped columns, refuses non-monotonic timebases, and refuses files whose quoting is unclosed. Each diagnostic is a structured `{code, params, message}` entry — codes are language-neutral, the rendered message is localised.
2. **Canonical-format import** — for telemetry already produced by an upstream tool in the project's canonical JSON shape.

The importer enforces a hard set of fail-closed conditions before the data is admitted into a Case:

| Condition | Behaviour |
|---|---|
| Unmapped channel | Surfaced; blocks any capability that requires that channel. Mapping is explicit, never inferred. |
| Mapped-but-unconfirmed channel | Blocked. A mapping is not a confirmation. |
| Non-monotonic timebase | Block. The observation services refuse to run. |
| Too-sparse samples | Block with reason code; no resampling-as-rescue. |
| Quoting / structural errors | Fatal at parse — no partial admission. |
| Provenance unknown | Stamped `unverified`. Synthetic stays synthetic; the importer will not relabel synthetic as real. |

After import the Case carries a `telemetryProvenance` field of `synthetic`, `real`, or `unverified`. This value is machine-read at the boundary; downstream code never re-infers it from presence.

The act of importing telemetry does NOT, on its own, unlock the Measured rung. It unlocks eligibility *checks* — each capability is then evaluated against its own gate.

---

## Review measured / observable capability tier

After import, the workspace surfaces the per-capability evaluation. This is the same Capability Map architecture described in `docs/r2-capability-map.md`, now embedded inside the Case-centric shell. Each capability resolves to one of:

- **Available** — works on model inputs alone; the credibility rung is Physics or Model.
- **Conditionally Available** — gated on confirmed channels + calibration + sample quality; the credibility rung, once gates pass, is Measured or Derived.
- **Blocked** — fail-closed; the UI shows the reason code and offers the honest substitute, never an approximation.
- **Deferred** — planned for a later milestone; the UI says so explicitly.

The two most-commonly-blocked capabilities at this stage:

- **Measured K_us** — requires confirmed telemetry **and** a verified road-wheel steering calibration bound to the mapping and session. Without that calibration, the directional tendency observation is offered instead, capped at confidence `medium`. The UI never serialises a K_us magnitude when the calibration is absent. The reasoning for why this number is never named in the directional yaw context — including the F312 yaw-response validation that demonstrated the kinematic-only signal-to-noise gap — is documented in `docs/credibility-and-trust.md` under the F312 yaw-response section.
- **Quantitative setup advice in clicks** — blocked product-wide. There is no validated per-car click-to-rate mapping. Setup-related recommendations downstream are emitted in physical units (Nm/deg, N/mm, %) only. The user will not see a "+2 clicks rear" recommendation anywhere.

For each Conditionally Available capability the UI shows the same five-column matrix as the R2 capability map: capability, required input, credibility once eligible, fail-closed conditions, and limitations. The user can audit, before going further, exactly why a number is or is not allowed.

The yaw response observation, where eligible, is the only response observation in this version. It separates left- and right-hand turns by raw steering sign, never assumes a symmetric vehicle, and uses the log-gap near-centre guard to keep micro-steer noise out of the ratio. The reported number is a directional yaw gain ratio with confidence; it is never converted to a road-wheel ratio without a user-confirmed steering ratio, and it never names K_us. See `docs/credibility-and-trust.md` for the F312 calibration finding that this restriction encodes.

---

## Explicit reference lap selection (same case + same session)

R3.0C C4 introduced reference selection. The product makes one rule loudly explicit:

> The reference lap is chosen by the user, explicitly, and only from laps in the **same Case** and the **same session** as the comparison lap.

The UI does not offer "fastest valid", "median", "best sector composite", or any automatic reference. Those modes do not exist in the product. The reasoning is in `docs/credibility-and-trust.md`: a "best" lap chosen by the tool would silently substitute the tool's judgement for the user's, and would let cross-session or cross-Case comparisons sneak in where tyre, track, and weather context differ.

Selection flow:

1. The user picks the comparison lap from the session lap list.
2. The user picks the reference lap from the same session's lap list.
3. The Case-authority + session-authority WeakSets verify the laps belong to the open Case and open session. A `sessionId` string match alone is not enough — the C8 second WeakSet refuses sessionId-string forgery.
4. Corner segmentation (C4) runs over both laps using the Case's track identity (C2) and normalized distance (C3).
5. Corner pairing (C4) produces (reference corner, comparison corner) pairs.
6. Delta metrics (C5) compute the allowlisted six metrics with the fixed delta sign:

> delta = (comparison − reference)

Never the reverse. The sign is constant across every metric, every export, every brief.

If any step in this chain fails — track identity mismatch, missing normalized-distance support on the track, degenerate corner segmentation, lap-authority degraded, session-authority token bumped during selection — the entire comparison is blocked with the corresponding reason code. The user sees the reason, not a half-built comparison.

| Step | Service | Blocks when |
|---|---|---|
| Lap authority | C2 | Lap object has `degraded !== false`. Strict literal check; `1` / `'yes'` / throwing accessors all fail-closed. |
| Track identity | C2 | Tracks differ between reference and comparison. |
| Normalized distance | C3 | Track has no normalized-distance support. |
| Reference selection | C4 | Reference and comparison are from different Cases or different sessions, or selection is not user-explicit. |
| Corner segmentation | C4 | Distance-based segmentation degenerate. |
| Corner pairing | C4 | Corner counts/identities disagree between laps. |
| Delta metrics | C5 | Any pre-requisite (lap-auth / track / distance / pairing) blocked. |
| Comparison export | C6 | Any upstream step blocked, or the exporter cannot structured-clone the payload. |
| Comparison workspace | C7 | No green comparison authority is in scope for the active Case + session. |
| Activation | C8 | Case transition (`_r3cBeginCaseTransition`) has bumped the session-authority token mid-flight. |

---

## Engineer Brief consumption

R3.0D produced the Engineer Brief through a four-stage pipeline that is authoritative-only end-to-end:

1. **Evidence graph (D2)** — captures the exact set of authoritative observations and comparison results that will be considered. The graph is deep-frozen on export; it sits inside a closure-private WeakSet (`_authoritativeGraphs`) so downstream stages cannot accept a forged graph.
2. **Hypothesis engine (D3)** — consumes only graphs that pass `verifyAuthoritativeGraph`. The verifier is the first thing every D3 entry point calls. Caller-provided "I promise this graph is authoritative" flags are ignored.
3. **Priority engine (D4)** — ranks the hypothesis list using only the authoritative graph's evidence references. No external priors, no learned weights, no LLM.
4. **Engineer Brief (D5)** — renders the prioritised hypotheses with their full honesty contract.

What the user sees in the brief, per item:

- The hypothesis statement (never a measured magnitude derived from raw steering, never a corner attribution from driver behaviour alone).
- Credibility (ladder rung).
- Confidence (capped at `medium` for directional / raw-steering observations).
- Provenance (synthetic / real / unverified, propagated unchanged from import).
- Limitations (linear regime, single representative track, kinematic and confounded — whichever apply).
- Blockers, if any related stronger claim was blocked, including the reason code.
- Evidence references (which laps / corners / channels / windows the brief is anchored in).
- Next validation step (what the user would have to do to upgrade the claim — typically "import a verified steering calibration" or "collect a multi-lap, multi-corner repeat at confirmed-channel quality").

Things the brief will never contain at runtime, by construction:

- A measured K_us magnitude without a bound calibration.
- A lap-time gain prediction.
- A causal claim derived from a correlation.
- A driver-blame claim. Driver behaviour, vehicle characteristic, and setup finding are three separate categories and the brief enforces that separation.
- A hardware setup-click recommendation.
- An engineer-grade sign-off framing.
- Any number derived from synthetic data presented as real — the provenance label rides with the value through every stage.

The brief is read-only. Acting on it requires the user to start an experiment.

---

## Plan an experiment

R3.0E introduced the experiment loop. An experiment is a user-authored plan, not an automated recommendation execution. The experiment store is append-only with monotonic `createdAt`; experiments cannot be edited in place, only superseded by new experiments that reference them.

An experiment record carries:

- The parent Case ID (same-case constraint; cross-case association is rejected at the store boundary).
- The applied-change descriptor (the setup lever or process change the user intends to make), in physical units only.
- The controlled variables the user pledges to hold constant (tyre set, fuel, track session, driver, weather window).
- The expected directional effect, in the user's own words. The product does not auto-populate this from the brief; the user must commit to the prediction so the outcome classifier can later compare expected vs observed.
- Stop conditions, capped at the schema's `stopConditions` shape — these are user-defined and bounded.
- A draft outcome slot, explicitly empty. An outcome on a draft experiment is rejected; the experiment must be ran before an outcome can be attached.

The schema is recursively audited. Future-schema fields are rejected at the store boundary; an audit overflow fails closed; pre-clone audits run before timeline and control-variable mutations.

Nothing in the experiment planner names a hardware click count, a "+N stiffness" delta, or a predicted lap time. The applied change is recorded as the user described it; the model does not silently re-quantify it.

---

## Apply the change, run the follow-up session

Outside the application — at the car, on the track — the user applies the change they described in the experiment, runs the follow-up session, exports the new telemetry, and returns to the app. The product does not automate, monitor, or guarantee that the user controlled the variables they pledged. It records the pledge and lets the outcome classifier flag inconsistency later.

The new session is imported as its own Case. This is the only way to bring follow-up telemetry into the workspace. There is no "append telemetry to existing Case" path, because that would let two physically different sessions silently merge into one comparison authority.

After import the follow-up Case goes through exactly the same gates as the original Case: import preflight, channel mapping, capability tier evaluation, provenance stamping.

---

## Link the follow-up Case (same parent only)

R3.0E added the follow-up link store. Linking is the user's explicit act of saying "this new Case is the post-change measurement of that earlier experiment."

The link store enforces:

- **Same parent only.** The followUpLink record's `parentCaseId` is path-grammar-validated and re-checked against the parent Case's existence on every fetch. Cross-case association where the new Case's parent differs from the experiment's parent Case is rejected at the store boundary — `caseAssociation cross-case forbidden`.
- **Re-validation on listForParent.** Each fetched link is re-validated; a stale or tampered link surfaces as a failed lookup, not a silent acceptance.
- **Reverse-index parent-membership check.** The reverse index is not trusted alone; the actual parent-membership relationship is verified.
- **Append-only.** The link record is never edited; corrections are new records that supersede.

Once linked, the follow-up Case is now eligible to be the subject of an outcome classification against its parent experiment.

---

## Classify the outcome

The Outcome Classifier (R3.0E) is the only place in the product where an experiment's result is named. It accepts authoritative-only inputs:

- The parent Experiment record.
- The parent Case's applied-change descriptor.
- The comparison authority (same-case, same-session, explicit-reference, with the C2–C5 chain green).
- The pledged controlled variables.
- A minimum credibility floor on the underlying observations.

The classifier never accepts a caller-provided final outcome. Confirmation requires *all* of: same-case, same-session, explicit-reference, controlled-variables pledge intact, and the minimum credibility floor met. If any of these fail, the outcome is `cannotConclude` with the specific reason codes — not "inconclusive as a soft hedge", but a hard fail-closed result with named blockers.

Possible outcome classes:

| Class | Meaning | Required conditions |
|---|---|---|
| `confirmed` | The expected directional effect was observed within the credibility floor. | All authoritative-input gates pass; expected vs observed agree in direction. |
| `refuted` | The observed direction is opposite the expected direction. | All authoritative-input gates pass; expected vs observed disagree in direction. |
| `inconclusive` | Gates pass but the observed effect is not directionally separable from noise at the configured floor. | All authoritative-input gates pass; expected vs observed not separable. |
| `invalid_comparison` | The comparison authority itself is not valid (track identity / lap authority / explicit-reference / controlled-variables broken). | Takes precedence over `inconclusive` and `cannotConclude` when the comparison itself is not legal. |
| `cannotConclude` | Any required input is missing or below the credibility floor. | Default fail-closed. |

The outcome class names — including `refuted` rather than any softer term — match the vocabulary used in `docs/r3-experiment-loop.md` and `docs/r3-credibility-model.md`.

The classifier output record carries: class, reason codes, supporting and contradicting evidence IDs, controlled-variable integrity result, comparison validity result, expected-vs-observed direction summary, limitations, `cannotConclude` flag where applicable, provenance, `createdAt`, and a generation token tying the outcome to the exact authoritative inputs used.

The classifier never produces a measured K_us magnitude, a lap-time gain, a causal claim, or a setup-click recommendation. Its output is a typed directional + diagnostic record, attached to the experiment in the append-only timeline.

---

## Inspect the append-only Timeline

The Timeline view shows the user the complete chronological record of work on a Case and its descendants:

- Case opened.
- Telemetry imported (with provenance).
- Reference lap selected, comparison run, delta metrics computed.
- Engineer Brief generated.
- Experiments planned.
- Follow-up Cases linked.
- Outcomes classified.
- Notes (free text the user attached at any step).

Timeline entries are append-only. `createdAt` is monotonic per store — a new entry's timestamp is strictly greater than the previous entry's. The timeline store pre-clones inputs before audit so callers cannot mutate fields underneath the audit. The audit itself fail-closes on overflow.

The user cannot edit a past entry. Corrections are new entries. This is intentional: the timeline is the evidence chain that the Engineer Brief, Outcome Classifier, and any future export rely on. Mutability in the timeline would let earlier conclusions be silently re-justified by later edits.

Reading the timeline is the user's audit interface. Every conclusion they ever saw is reproducible from the timeline plus the case-record + session-record + telemetry artefacts.

---

## Export comparison bundle / import roundtrip

R3.0C C6 produces the Comparison Export. It is a self-contained, fail-closed-validated bundle that captures everything needed to reproduce a comparison authority on another machine running the same application version:

- Case identity and case record (schema-versioned at `v1.4.0`).
- Session identity and session record.
- Track identity and normalized-distance support metadata.
- Reference lap ID, comparison lap ID, and the user-explicit-selection marker.
- Corner segmentation result and corner pairing result.
- The six allowlisted delta metrics with the fixed `(comparison − reference)` sign.
- Provenance of every contributing telemetry artefact.
- Engineer Brief, where one was generated, with full credibility / confidence / provenance / limitations / blockers / evidence references / next validation step.
- Experiments, follow-up links, outcomes, and timeline entries reachable from the Case.

The export is structured-clone-safe (R3.0F F1's structured-clone-only firewall) and serialised by a trap-free JSON serializer; producer-attestation defends against tampering at the producer side. On reimport, F1 migration treats the bundle as a `v1.4.0` baseline and runs deterministic migration if the schema baseline ever advances. Today the baseline is `v1.4.0` and the migration is a no-op identity; this is not an accident — the schema has not been modified through R3.0F and will not be until a major.

What the export deliberately does NOT carry:

- Any setting that would let the receiving instance auto-pick a reference lap. Reference selection on the receiving side remains user-explicit.
- Any hardware-click recommendation.
- Any measured K_us magnitude that was not eligible at production time.
- Any conclusion stripped of its credibility / provenance / limitations metadata. The honesty contract is part of the payload, not optional decoration.

Roundtripping a Case (export, reimport into a clean library) produces an equivalent capability evaluation. If the receiving instance has the same vehicle preset (one of 501) and the same application version, the Engineer Brief and Outcome Classifier produce the same substantive record — with timestamps and generation tokens naturally differing per run, since each invocation regenerates its own time-anchored identity. If the preset count or version do not match, the application refuses to start rather than running with drifted invariants.

---

## End-to-end verification posture

The workflow described above is exercised under R3.0F's verification harness. F2 ships nine end-to-end flows that walk the full path from first-launch through Case creation, telemetry import, capability evaluation, reference selection, comparison, Engineer Brief, experiment planning, follow-up linking, outcome classification, and bundle export / roundtrip. F3 hardens six probe areas: the Electron boundary (preload surface, IPC contract, sandbox posture), storage-backend failure modes (write rejection, quota exhaustion, partial-write detection), no-stale-UI invariants (the UI never renders a derived value that was produced from inputs since invalidated), large-library behaviour (the 501-preset browser and case lists at realistic scale), XSS surfaces (the rendered Engineer Brief, timeline notes, and CSV-derived strings are untrusted-by-default), and supply-chain integrity (build reproducibility and dependency provenance at packaging time).

These flows and probes are the empirical floor under every fail-closed promise made in this workflow document. When the workflow says a step blocks with a named reason code, F2 walks the user-visible path that hits that block; when it says a boundary is enforced, F3 attacks the boundary directly.

---

## What stays out of scope across this workflow

The workflow described above is exhaustive for R3.0F. The following remain explicitly out of scope and the UI never implies them:

- Engineer-grade sign-off or replacement of a race engineer.
- Full multi-body-dynamics simulation.
- A complete tyre model.
- GPS racing-line / lap-optimisation.
- Telemetry decoder for arbitrary binary formats.
- A validated per-car click-to-rate mapping (hardware clicks are never emitted).
- Automatic steering or sensor calibration.
- Runtime LLM decision authority of any kind.
- Cloud collaboration, multi-user, or remote sync.

Synthetic data never masquerades as real. Driver behaviour is never silently promoted to a vehicle characteristic. Correlation is never silently promoted to causation. Prediction is never silently promoted to a guaranteed result. Wherever any of those promotions would have to happen, the product blocks instead, with a named reason code and an honest substitute where one exists.
