# R3 User Workflow — End-to-End

This document traces a single user's path through the R3 application surface, from the empty-library first launch to exporting a comparison bundle. It is a workflow companion to `docs/credibility-and-trust.md`, `docs/product-positioning.md`, `docs/r2-capability-map.md`, `docs/analysis-workspace-architecture.md`, `docs/r3-experiment-loop.md`, and `docs/r3-credibility-model.md`. It does not repeat the credibility ladder definitions; it shows where each rung is enforced as the user moves through the screens.

The ladder, in shorthand, is the only basis for what the UI is allowed to render at each step:

> Physics > Model > Measured > Derived > Heuristic > Unavailable

Every conclusion described below carries `credibility` and `limitations` at minimum; most also carry `confidence` and `provenance`. The remaining honesty-contract fields (a fail-closed reason, the supporting evidence, what to do to upgrade the claim) exist on most producers but under different field names per producer — see `docs/r3-architecture.md`'s introduction for the exact names per layer. The R3.0E Outcome object specifically has no `credibility`/`confidence`/`provenance`/next-validation field at all (see `docs/r3-experiment-loop.md`). The product never approximates around a missing input; it blocks with a machine-readable reason.

A note on version numbers used in this document: "the case-record schema frozen at v1.4.0" is a human-readable label for "the on-disk shape of a Case record as it stood when the package version was 1.4.0" — it is **not** a literal version string stored in code. The actual schema-version field is `CASE_SCHEMA_VERSION` in `renderer/js/schema-migration.js`, a plain integer (`1` today), and F1's migrators compare against that integer, not against any `"v1.4.0"` string. The **package application version** is `1.4.0` today, with a target of `2.0.0` post-merge of the integrated delivery train. The two are related but distinct: a future application version bump does not, on its own, advance `CASE_SCHEMA_VERSION`.

---

## First launch (empty library)

On the very first launch the local store is empty. R3.0B has provisioned an IndexedDB-backed `storage-backend.js` with five stores — `cases`, `caseIndex`, `sessions`, `sessionIndex`, `meta` — that `case-store.js` and `session-store.js` build on; in Node test mode the same contracts run against an in-memory backend. There is no remote sync, no account, no cloud — every artefact lives on the user's device.

The application runs inside an Electron host whose `BrowserWindow` `webPreferences` explicitly set exactly three keys — `preload` (the bridge script path), `contextIsolation: true`, and `nodeIntegration: false` — with no safety-relevant key (`sandbox`, `webSecurity`, etc.) ever explicitly weakened; Electron's own defaults apply to everything not listed. The preload bridge exposes exactly two values to the renderer on `window.electronAPI` — `{platform, version}` — and nothing else. The renderer cannot reach Node, the file system, or arbitrary IPC; every privileged operation goes through the storage backend's typed contract. The R3.0B `backend.transact({ stores, reads, compute })` contract is the single channel for **atomic multi-step reads/writes**; single-key reads also go through `backend.get(ns, key)` and namespace-wide reads through `backend.list(ns)` directly (e.g. `case-store.js`'s `open`/`list`/`compact`) — `transact` is for the atomicity guarantee, not the only persistence entry point. (See `docs/r3-architecture.md` "Electron host boundaries" for the full webPreferences/CSP contract.)

Two activation flags govern what the runtime is allowed to do, and `featureRegistryActivationAllowed` is tracked **per phase**, not as one train-wide switch. `runtimeConsumersAllowed` has been `true` since F1 — production services bind to authoritative inputs and emit results. R3.0C, R3.0D, and R3.0E have each already flipped their own `featureRegistryActivationAllowed` to `true` at their respective activation checkpoints (`C8_ACTIVATION`, `D5_ENGINEER_BRIEF_ACTIVATION`, `E5_ACTIVATION`) — the Comparisons workspace, the Engineer Brief pane, and the Experiment Loop / Case Timeline panes are live in the navigation today. Only R3.0F's own flag remains `false` until `F6_RELEASE`, and R3.0F introduces no case-scoped pane of its own for that flag to gate. Any path that would activate a capability before its own phase's flag is true still fails closed with a named reason code, regardless of whether the underlying service is otherwise ready.

The Setup Library landing pane shows:

- A clean library state. No fabricated demo cases are listed in the user's library.
- The Vehicle Preset Browser surfaces the 501 frozen presets. Preset count is a CI/governance invariant enforced by `scripts/check-preset-integrity.js` and `tests/vehicle-preset-pipeline.test.js` — a drift fails the trusted-verification gate before merge. `main.js`'s production startup path has no runtime preset-count check; it does not refuse to start on drift.
- Two calls to action: **Load Demo Analysis Case** (the golden path; `renderer/js/i18n-workspace.js`'s `aw.label.load_demo_analysis_case`) or import telemetry and click **Build Case & Run Analysis** (`aw.label.build_case_run_analysis`) to create a new Case from real data. There is no separate bare "create an empty Case" button — a Case is created either from the demo or from an import.

The Demo Analysis Case is the only Case that ships pre-populated. Its narrative is produced by production code — the same services that run on a user's real Case — not by hardcoded copy. It exists so a user can see the full capability map exercised end-to-end before they have any telemetry of their own.

Nothing on the first-launch screen claims engineer-grade sign-off, lap-time gains, or measured handling. Capabilities that require telemetry or calibration are visibly marked blocked, with the reason code (`NO_ANALYSIS_CASE`, `NO_STEERING_CHANNEL`, `NO_SPEED_CHANNEL`, `NO_COMPARISON`, etc. — `renderer/js/case-shell.js` + `renderer/js/i18n-shell.js`) shown verbatim.

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

After import the canonical telemetry session carries a `dataProvenance` field of `synthetic`, `real`, or `unverified` (`renderer/js/canonical-telemetry-session.js`). This value is machine-read at the boundary; downstream code never re-infers it from presence.

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
| Comparison export | C6 | Any upstream step blocked, or the bounded comparison-summary envelope cannot be assembled within the contract's bounds (see "Export comparison summary" below). |
| Comparison workspace | C7 | No green comparison authority is in scope for the active Case + session. |
| Activation | C8 | Case transition (`_r3cBeginCaseTransition`) has bumped the session-authority token mid-flight. |

---

## Engineer Brief consumption

R3.0D produced the Engineer Brief through a four-stage pipeline that is authoritative-only end-to-end:

1. **Evidence graph (D2)** — captures the exact set of authoritative observations and comparison results that will be considered. The graph is deep-frozen on export; it sits inside a closure-private WeakSet (`_authoritativeGraphs`) so downstream stages cannot accept a forged graph.
2. **Hypothesis engine (D3)** — consumes only graphs that pass `verifyAuthoritativeGraph`. The verifier is the first thing every D3 entry point calls. Caller-provided "I promise this graph is authoritative" flags are ignored.
3. **Priority engine (D4)** — ranks the hypothesis list using only the authoritative graph's evidence references. No external priors, no learned weights, no LLM.
4. **Engineer Brief (D5)** — renders the prioritised hypotheses with their full honesty contract.

What the user sees in the brief, per item — these are the real fields of `contracts/r3.0d/engineer-brief-contract.js`'s closed key set:

- The hypothesis statement (`primaryIssueI18nKey`/`primaryIssueParams`, optionally a `secondaryIssueI18nKey`) — never a measured magnitude derived from raw steering, never a corner attribution from driver behaviour alone.
- `credibility` — the primary hypothesis's rung from the `CONCLUSION_CREDIBILITY` ladder (defaults to `Heuristic` when there is no primary hypothesis).
- `confidence` — at the D5 layer this is hardcoded to `{ state: 'not_computed' }`. D5 does **not** echo D3's internal quantitative confidence score into the brief; there is no "capped at medium" behavior at this layer.
- `provenance` — at the D5 layer this is hardcoded to `'unverified'`. D5 deliberately does not make a real/synthetic claim about evidence sources at the brief layer (that signal is consumed individually at the D2 evidence-node level); it is **not** propagated from the import path.
- `limitations` — the deduplicated union of `hypothesisSet.limitations` and every individual hypothesis's limitations (e.g. `LIMITATION_SYNTHETIC_ONLY`, `LIMITATION_SINGLE_LAP_SAMPLE`, `LIMITATION_HEURISTIC_ONLY` — whichever apply; no brief-level addition on top).
- `cannotConcludeReasonCodes` — the fail-closed-reason field, populated when a stronger claim could not be made.
- `evidenceSummary` — an array of `{ nodeId, i18nKey, params }`, naming the evidence-graph nodes the brief is anchored in.
- `nextValidationAction` — `{ actionId, kind, i18nKey } | null`, what the user would have to do to upgrade the claim (e.g. import a verified calibration, collect a controlled repeat).

Things the brief will never contain at runtime, by construction:

- A measured K_us magnitude without a bound calibration.
- A lap-time gain prediction.
- A causal claim derived from a correlation.
- A driver-blame claim. Driver behaviour, vehicle characteristic, and setup finding are three separate categories and the brief enforces that separation.
- A hardware setup-click recommendation.
- An engineer-grade sign-off framing.
- Any number derived from synthetic data presented as real — the provenance label rides with the value through every stage.

The brief is read-only. Acting on it requires the user to start an experiment. There is no runtime LLM authority anywhere in this pipeline; D3 and D4 are deterministic services over the verified evidence graph.

---

## Plan an experiment

R3.0E introduced the experiment loop. An experiment is a user-authored plan, not an automated recommendation execution. R3.0E persistence lives in separate versioned stores under the `r3_0e_*` namespace (`r3_0e_experiments`, `r3_0e_experimentsIndex`, `r3_0e_outcomes`, `r3_0e_outcomesIndex`, `r3_0e_timelines`, `r3_0e_followupLinks`, `r3_0e_followupLinksByCase`, `r3_0e_storeMetadata`) — these stores deliberately do not extend the frozen R3.0B portable case-record schema body, and they carry no runtime authority of their own. WeakSet identity is closure-private and cannot survive reload; rehydration consumers must re-validate via the E1 contracts before treating persisted values as authoritative.

The experiment store (`createExperimentStore`) is **not append-only**. Its public surface is `create` / `update` / `get` / `list` / `remove`. `update` requires an existing record, rejects future-schema writes (`R3_0E_EXPERIMENT_FUTURE_SCHEMA`), and rejects stale writes by createdAt mismatch (`R3_0E_EXPERIMENT_STALE_WRITE`). `get` re-validates and deep-freezes the record on every read; `remove` deletes from both the payload store and the index. Outcomes, by contrast, have a create-only public surface (`create` / `get` / `listForExperiment`): there is no `update` and no `remove` exposed on the outcome store, so once written an outcome is effectively immutable from the application's API, though this is "immutable through the public surface", not "strictly append-only across all stores". Only the timeline store, described later, is strictly append-only.

An experiment record carries:

- The parent Case ID (`sourceCaseId`) — id-grammar-checked only at the E1 contract layer. The experiment store writes without consulting `case-store`, so there is no live check that the referenced case actually exists or that a write is "same-case" at the store boundary; the constraint is structural (one `sourceCaseId` field, not a list), not a verified existence check.
- The applied-change descriptor (the setup lever or process change the user intends to make), in physical units only.
- The controlled variables the user pledges to hold constant (tyre set, fuel, track session, driver, weather window).
- The expected directional effect — a closed enum (`'increase' | 'decrease' | 'no_change'`), not free text. The product does not auto-populate this from the brief; the user must commit to one of the three values so the outcome classifier can later compare expected vs observed.
- Stop conditions, capped at the schema's `stopConditions` shape — these are user-defined and bounded.
- An outcome slot that must stay `null` while `status` is `'draft'`, `'planned'`, or `'applied'`; it may only become non-null once `status` reaches `'completed'`, `'abandoned'`, or `'invalid'`. The contract layer enforces this gating directly — a caller cannot attach a classification result to an experiment that has not concluded.

The schema is recursively audited. Future-schema fields are rejected at the store boundary; the E1 contract's recursive descriptor audit (`hasNonPlainNestedObject` in `contracts/r3.0e/reason-codes.js`) fails closed on traversal overflow (depth or node-count) and runs *before* the contract clones the input (`toCleanCopy`), not after — this audit-then-clone ordering applies to timeline events and control-variable payloads alike, and lives in the E1 contracts, not in the E2 stores.

Nothing in the experiment planner names a hardware click count, a "+N stiffness" delta, or a predicted lap time. The applied change is recorded as the user described it; the model does not silently re-quantify it.

---

## Apply the change, run the follow-up session

Outside the application — at the car, on the track — the user applies the change they described in the experiment, runs the follow-up session, exports the new telemetry, and returns to the app. The product does not automate, monitor, or guarantee that the user controlled the variables they pledged. It records the pledge and lets the outcome classifier flag inconsistency later.

The new session is imported as its own Case. This is the only way to bring follow-up telemetry into the workspace. There is no "append telemetry to existing Case" path, because that would let two physically different sessions silently merge into one comparison authority.

After import the follow-up Case goes through exactly the same gates as the original Case: import preflight, channel mapping, capability tier evaluation, provenance stamping.

**Same-session requirement.** The outcome classifier (below) requires the follow-up's `sessionId` to match its own `parentSessionId` attestation field (`followUp.sessionId !== followUp.parentSessionId` forces `class = 'invalid_comparison'`) — consistent with R3.0C's "same-case + same-session only" comparison rule applied at the experiment-outcome layer too. A genuinely new physical track session — a new `sessionId` distinct from any prior reference — will classify as `invalid_comparison` unless the caller constructs the follow-up attestation as a same-session re-analysis. Wiring a brand-new physical follow-up session into a classifiable outcome end-to-end is not yet exercised by the shipped UI surface; this document does not claim it is.

---

## Link the follow-up Case (same parent only)

R3.0E added the follow-up link store (`createFollowUpLinkStore`). Linking is the user's explicit act of saying "this new Case is the post-change measurement of that earlier experiment."

The link store enforces:

- **Path grammar, not parent-case existence.** The `followUpLink` record's `linkId`, `parentCaseId`, `followUpCaseId`, and `experimentId` are all grammar-validated. The link store never calls into `case-store`, so there is no live check that `parentCaseId` corresponds to a case that actually exists — the guarantee is shape/grammar consistency, not a verified cross-store existence check.
- **Re-validation on listForParent.** The reverse index `r3_0e_followupLinksByCase` is read first, but it is not trusted alone: the actual link record is then fetched, re-validated through the E1 contract, and rejected if its `parentCaseId` does not match the index key (the E2-R2-01 reverse-index parent-membership closure).
- **Parent-status mutation through a typed surface, not edits.** The link store exposes `create` / `get` / `listForParent` / `markParentStatus`. `markParentStatus(linkId, newStatus)` mutates only the `parentStatus` field in place, and only accepts values from a closed enum `['present', 'archived', 'deleted']` (any other value rejects with `R3_0E_LINK_PARENT_STATUS_INVALID`). Missing records reject with `R3_0E_LINK_MISSING`; the merged record is re-validated through the E1 contract (`R3_0E_LINK_INVALID`). There is no general-purpose `update` or `remove` on the link store — `markParentStatus` is the only mutation, and it is bounded to the closed enum above. Corrections that need to change other fields are made through new records that supersede.

Once linked, the follow-up Case is now eligible to be the subject of an outcome classification against its parent experiment.

---

## Classify the outcome

The Outcome Classifier (R3.0E E3, `renderer/js/r3-0e-outcome-classifier.js`) is the only place in the product where an experiment's result is named. Its input wrapper has exactly five keys:

- `experiment` — the parent Experiment record (deep-frozen, re-validated against the E1 contract).
- `appliedChange` — the applied-change audit envelope (`changeId`, `sourceExperimentId`, `appliedAt`).
- `followUp` — the R3.0B/R3.0C attestation for the follow-up: `followUpCaseId`, `parentCaseId`, `sessionId`, `parentSessionId`, `hasExplicitReference`, `comparabilityScore`.
- `observation` — observed direction/magnitude, driver feedback (i18n key only), data-quality issues, side effects, and supporting/contradicting evidence id arrays.
- `controlVariableObservations` — observed readings for the experiment's declared control variables.

The classifier never accepts a caller-provided final outcome — `class`, `confounders`, and `comparabilityScore` are derived, never read from the caller's outcome side. There is no credibility-floor gate in this classifier; classification is driven entirely by the structural checks above.

Possible outcome classes, in precedence order:

| Precedence | Class | Required conditions |
|---|---|---|
| 1 | `invalid_comparison` | Cross-case, OR cross-session (`followUp.sessionId !== followUp.parentSessionId`), OR no explicit reference, OR `comparabilityScore < 0.5`. |
| 2 | `inconclusive_due_to_confounders` | A declared control variable is missing from the observations, or an observed one is out of range. |
| 3 | `inconclusive` | Too many data-quality issues (more than 4), or no observed direction. |
| 4 | `contradicted` | Contradicting evidence present, or observed direction does not match the expected direction. |
| 5 | `confirmed` | Observed direction matches the expected direction AND observed magnitude falls within the expected range. |
| 6 | `partially_confirmed` | Observed direction matches the expected direction but observed magnitude falls outside the expected range. |

There is no `refuted` class and no `cannotConclude` class in the shipped classifier — see `docs/r3-experiment-loop.md` "Outcome classes" for the full precedence table and the exact reason codes each class can carry as `limitations`.

The Outcome record carries exactly thirteen fields: `schemaVersion`, `outcomeId`, `experimentId`, `class`, `observedDirection`, `observedMagnitude`, `comparabilityScore`, `confounders`, `driverFeedback`, `dataQualityIssues`, `sideEffects`, `limitations`, `createdAt`. There is no separate `reasonCodes`, `comparisonValidity`, `controlledVariableIntegrity`, `expectedVsObserved`, `provenance`, or `generationToken` field on the output.

The classifier never produces a measured K_us magnitude, a lap-time gain, a causal claim, or a setup-click recommendation. Its output is a typed directional + diagnostic record, attached to the experiment through a new outcome-store `create` (recall: outcomes are written once through the public surface; there is no update path), and the timeline store records the event separately.

---

## Inspect the append-only Timeline

The Timeline view shows the user an append-only record of the experiment-loop milestones the product recorded for a Case and its descendants — not a complete log of every user action. The event schema is closed to exactly eight `kind` values (`contracts/r3.0e/case-timeline-contract.js`'s `EVENT_KIND_ALLOWED`); there is no event kind for opening a case, importing telemetry, selecting a reference lap, running a comparison, or attaching free-text notes:

- Baseline captured (case admission into the experiment loop; `baseline_captured`).
- Hypothesis recorded (`hypothesis_recorded`).
- Recommendation made (`recommendation_made`).
- Experiments planned (`experiment_planned`).
- Experiments applied (`experiment_applied`).
- Follow-up Cases linked (`follow_up_case_created`).
- Outcomes classified (`outcome_classified`).
- Experiments abandoned (`experiment_abandoned`).

These are the only eight event kinds the timeline contract accepts. Case opening, telemetry import, reference-lap selection, comparison execution, and free-text notes are not recorded as timeline events — see `docs/r3-experiment-loop.md`'s Timeline event-kind table for the full list and each kind's plausible producer.

The timeline store (`createTimelineStore`) is the only R3.0E store that is strictly append-only. Its public surface is `getTimeline(caseId)` and `appendEvent(caseId, event)`; there is no `update` and no `remove`. Keying is per-case (`r3_0e_timelines` stores one timeline document per `caseId`). `appendEvent` rejects duplicate `eventId` (`R3_0E_TIMELINE_DUPLICATE_EVENT`), rejects out-of-order timestamps where the new event's createdAt is less than the previous event's or is unparseable (`R3_0E_TIMELINE_OUT_OF_ORDER`), rejects future-schema documents (`R3_0E_TIMELINE_FUTURE_SCHEMA`), and re-validates the resulting timeline before write (`R3_0E_TIMELINE_INVALID`). `appendEvent` itself performs no cloning: it concatenates the caller's `event` object directly (`existing.events.concat([event])`) and delegates all structural validation to the E1 contract (`TL.validateCaseTimelineShape`). That contract's recursive descriptor audit runs *before* it clones the input (`hasNonPlainNestedObject` before `toCleanCopy`, in `contracts/r3.0e/case-timeline-contract.js` and `contracts/r3.0e/reason-codes.js`), and fails closed on traversal overflow (`MAX_NODES = 4096` / `MAX_DEPTH = 32`) — this guarantee belongs to the E1 contract layer, not the store. (A genuine pre-validation snapshot of caller input does exist, but it is implemented in the separate E4 follow-up/timeline service, `renderer/js/r3-0e-followup-timeline.js`'s `appendTimelineEvent`/`_snapshotPlain`, not in `createTimelineStore`.)

The user cannot edit a past entry. Corrections are new entries. This is intentional: the timeline is the evidence chain that the Engineer Brief, Outcome Classifier, and any future export rely on. Mutability in the timeline would let earlier conclusions be silently re-justified by later edits — and it would conflict with the per-store `appendOnly: true` invariant the timeline contract is built around.

Reading the timeline is the user's audit interface for the experiment loop's own milestones. Every experiment-loop conclusion (hypothesis, recommendation, experiment plan/apply, follow-up link, outcome) is reproducible from the timeline plus the case-record + session-record + telemetry artefacts and the R3.0E payload stores — but the timeline itself does not record case-open, telemetry-import, reference-selection, or comparison-run events, so it is not a complete audit trail of every screen the user visited.

---

## Export comparison summary (R3.0C C6 bounded envelope)

R3.0C C6 produces the **Comparison Export**, defined by `contracts/r3.0c/comparison-export-contract.js` (module global `R3_0C_ComparisonExportContract`). It is a **bounded comparison-summary envelope**, not a full integrated case bundle. The contract is explicit about both its identity and its bounds.

The envelope shape is closed:

```
{ schemaIdentity: 'racing-analyzer/comparison-export',
  schemaVersion: 1,
  generatedAt: <ISO timestamp set by the production exporter, or null in CP1>,
  payload:     null | <bounded plain object> }
```

Only the own-keys `schemaIdentity`, `schemaVersion`, `generatedAt`, `payload` are allowed; any other own-key on the envelope fails closed with `EXPORT_ENVELOPE_UNKNOWN_KEY`. The schema identity is deliberately distinct from the R3.0B / R2.3 case-export identity — the contract exposes a helper `isDistinctFromCaseExportIdentity(caseExportIdentity)` that makes this requirement first-class so a comparison-export consumer cannot be fed a case-export bundle and vice versa.

The payload is bounded by the contract:

- `payload` may be `null` (the CP1 default) or a plain object — nothing else.
- Arrays inside the payload are capped at `MAX_BOUNDED_ARRAY = 64`, mirroring `MAX_CORNERS_COMPARED`. **No raw sample arrays.** If a payload is provided it must already be a bounded comparison *summary*, not a window of telemetry samples.
- Numeric scalars must be finite — `NaN`, `Infinity`, `-Infinity` reject with `EXPORT_PAYLOAD_NON_FINITE_NUMBER`.
- Each string field is capped at `MAX_STRING_UTF8_BYTES = 4 * 1024` (4 KiB) with `EXPORT_PAYLOAD_STRING_TOO_LONG`.
- The whole envelope's serialised UTF-8 size is capped at `MAX_ENVELOPE_UTF8_BYTES = 256 * 1024` (256 KiB) with `EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE`.
- Depth greater than 8 is refused.
- Exotic objects — `Date`, `Map`, `Set`, `RegExp`, `Proxy`, `Buffer`, typed arrays — are refused.
- Non-scalar values — `function`, `symbol`, `bigint`, `undefined` — are refused.

The public API surface for this envelope is exactly `buildComparisonExportEnvelope(payload)`, `validateComparisonExportEnvelope(env)`, `isDistinctFromCaseExportIdentity(caseExportIdentity)`, plus the named constants `COMPARISON_EXPORT_IDENTITY`, `COMPARISON_EXPORT_SCHEMA_VERSION`, `MAX_BOUNDED_ARRAY`, `MAX_STRING_UTF8_BYTES`, `MAX_ENVELOPE_UTF8_BYTES`, and `ENVELOPE_KEYS`.

The bare contract helper `buildComparisonExportEnvelope(payload)` defaults `payload` to `null` and `generatedAt` to `null` when called with no arguments — that is the CP1 (non-production) contract default, not the shipped behavior. The production exporter, `buildComparisonExport(request)` in `renderer/js/r3-0c-comparison-export.js`, is already implemented and wired through `r3-0c-comparison-adapter.js` into the C7 comparison orchestrator: it builds a populated, bounded payload from the upstream C2–C5 comparison result + association + credibility metadata, constructs the envelope via the contract, round-trips it through `JSON.stringify`/`JSON.parse` to verify it survives serialization, and returns `status: 'comparison_export_built'`. R3.0C's `featureRegistryActivationAllowed` flipped to `true` at `C8_ACTIVATION`, and the Comparisons workspace ships an export button (`renderer/index.html`, `data-r3c-c7="export-action"`) wired to this service; the button is enabled or disabled by a runtime `exportGate` condition (whether the current comparison is in an exportable state), not by feature-registry activation. **Whenever it runs, the envelope carries a bounded summary — not engineer briefs, not experiment records, not follow-up links, not outcomes, not the timeline.** Those R3.0D / R3.0E artefacts live in their own stores and have their own contracts; they are not co-bundled into the comparison-export envelope.

## Export and reimport a Case (R3.0B portable case bundle)

The Case-level export/import path is a **separate** path from the comparison export. It is verified end-to-end by `tests/e2e/flow-08-export-import.test.js` (header: *R3.0F F2 · Flow 08: case export + reimport*). The shape of the path:

- The producing instance calls `src.caseStore.exportCase(caseId)` and receives `{ ok, bundle }`. The bundle is **R3.0B schema-validated** and explicitly contains **no raw telemetry array** (the flow test asserts the bundle has no `"raw":[` substring).
- The bundle is producer-attestation-checked. R3.0F F1 never fabricates attestation, and refuses producer-attestation sentinel fields with `PRODUCER_ATTESTATION_REFUSED`. Imported records carry no producer attestation because the engine never fabricates one.
- The receiving instance calls `dst.caseStore.importBundle(bundle)` and receives `{ ok, caseId }`. The imported record's `recordType` is `imported_summary` and is **never** promoted to `local_full` — that promotion path does not exist by construction.
- `dst.caseStore.open(caseId)` on the imported record reports `degraded: true`. Imported records are degraded summaries; capability evaluation against them runs through the same fail-closed gates as any other degraded input.
- Calling `caseStore.duplicate()` on an already-imported case is refused: because its `recordType` is `imported_summary`, `duplicate()` returns a code matching `/IMPORTED_SUMMARY|IMPORTED/` (`CANNOT_DUPLICATE_IMPORTED_SUMMARY`) instead of cloning it. This is distinct from `importBundle()` itself: `importBundle()` has no bundle-identity dedup — re-importing the same bundle a second time via `dst.caseStore.importBundle(bundle)` succeeds again, minting a fresh `caseId` and creating a second, separate `imported_summary` record for the same source data.
- F1 migration sees `imported_summary` as **at-target** — running the migration engine on an already-imported case is a no-op (`noop = 1`).
- A stale `cachedCaseId` reference after import throws `STALE_CASE_REF` through `assertNoStaleCaseRef`; nothing downstream is allowed to keep operating on a no-longer-valid case handle.
- The roundtrip preserves the public fields the bundle is meant to carry (the flow test pins `metadata.title` as the explicit example), and ends with zero console errors.

Both paths — the bounded comparison-summary envelope (R3.0C C6) and the case-export bundle (R3.0B / flow-08) — are intentionally bounded. **Neither path roundtrips a full integrated C+D+E payload** containing engineer briefs, experiment records, follow-up links, outcomes, and the full timeline. The comparison export is bounded by its envelope contract; the case export is bounded by the R3.0B schema and the `imported_summary` degraded-rehydration semantics. Any consumer that wants the R3.0D/E artefacts has to query the producing instance's stores directly — those artefacts are not co-bundled into either export today.

What both exports deliberately do NOT carry:

- Any setting that would let the receiving instance auto-pick a reference lap. Reference selection on the receiving side remains user-explicit.
- Any hardware-click recommendation.
- Any measured K_us magnitude that was not eligible at production time.
- **A producer-attestation field, full stop.** Imported records carry no producer attestation: runtime producer attestation is held in non-serialisable WeakSets and is never persisted or exported; any serialised attestation sentinel field is refused by the migration engine with `PRODUCER_ATTESTATION_REFUSED`. The engine never fabricates one on the way in, and it never lets one survive on the way through.

Where a conclusion does cross a boundary (a comparison summary on the C6 path, or the public fields the R3.0B case bundle preserves), it carries its credibility / provenance / limitations metadata as part of the payload — the honesty contract is not stripped to fit either envelope's bounds.

The portable case-bundle schema (`renderer/js/case-record-schema.js`) carries no preset-count or application-version field, so `validatePortableBundle`/`caseStore.importBundle()` cannot compare the receiving instance's invariants against the producing side's — there is no cross-instance drift check on import, and the application does not refuse to start on a preset-count or version mismatch. Preset-count drift is caught at CI/governance time (see above), not at runtime import or startup.

---

## End-to-end verification posture

The workflow described above is exercised under R3.0F's verification harness.

**F2 ships nine end-to-end flows** under `tests/e2e/flow-{01..09}-*.test.js`, running as a Node-only logic harness (`tests/e2e/helpers/flow-harness.js`) over an in-memory `MemoryBackend()` — not a browser, DOM, Electron process, or IndexedDB, and not the first-launch surface a user would click through. Each flow drives the same production module surfaces a real session would call, in the same order, and each flow ends with zero console errors. The flows cover Case creation and persistence, telemetry import and preflight, capability tier evaluation, reference-lap selection and comparison authority, Engineer Brief production, experiment planning, follow-up linking, the timeline append-only invariant (flow-06 appends an `outcome_classified` event directly rather than invoking the R3.0E classifier), and — relevant to this section — `flow-08-export-import.test.js`, the case export + reimport flow described above.

**F3 hardens six probe areas** under `tests/e2e/hardening-{01..06}-*.test.js`, totalling 133 assertions: the Electron boundary (preload surface, `webPreferences` never weakened, CSP), storage-failure handling (`case-store.remove`'s confirm-guard, an atomic `backend.transact` failure leaving the source record unchanged, oversized-record rejection), no-stale-UI invariants (no case-id-bearing viewmodel field survives a Case/Session transition), large-library bounded-linear scaling (`backend` operation counts at `N` and `2N` library size), XSS surfaces (no unsafe DOM-injection pattern in the renderer), and supply-chain integrity (a locked dependency/script declaration allowlist and no committed secrets).

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
- A single export envelope that roundtrips the full integrated C+D+E payload. The comparison-export envelope is a bounded summary; the case-export bundle is bounded by R3.0B schema and `imported_summary` semantics. R3.0D/E artefacts are not co-bundled into either export.

Synthetic data never masquerades as real. Driver behaviour is never silently promoted to a vehicle characteristic. Correlation is never silently promoted to causation. Prediction is never silently promoted to a guaranteed result. Wherever any of those promotions would have to happen, the product blocks instead, with a named reason code and an honest substitute where one exists.
