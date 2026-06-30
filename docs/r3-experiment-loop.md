# R3.0E Experiment Loop

The experiment loop is the producer chain that turns a R3.0D Engineer Brief into a
concrete, append-only record of *what was tried, what was applied, what happened
next, and whether the next case could honestly tell us anything*. It is the part
of the product where the system stops *recommending* and starts *bookkeeping*.

Like every other layer in R3.0, the loop is fail-closed and authoritative-only.
It never decides on behalf of the engineer, never auto-applies a setup change,
never auto-selects a reference, never overwrites history, and never
cross-pollinates cases. When a required input is missing, the corresponding
capability is **blocked with a reason** — never approximated.

This document covers the R3.0E surface only. R3.0F integrated-delivery concerns
(migration, E2E, hardening) are described elsewhere.

**Scope note.** Runtime consumers may exercise the experiment loop; UI
activation of the E3/E4/E5 surfaces remains gated until F6_RELEASE
(`featureRegistryActivationAllowed = false`). Production code paths described
here are live behind the activation gate; user-visible panes are not yet lit.

## Producer chain: R3.0D engineer-brief → recommendation → experiment plan

The loop has a single, strict producer chain. Each stage consumes only the
**authoritative** output of the previous stage; no stage will read
caller-provided summary flags such as `eligible`, `confirmed`, `validated`, or
`final`. Eligibility is re-derived from raw evidence on every run.

The credibility ladder used throughout this document, top-to-bottom, is:
**Physics > Model > Measured > Derived > Heuristic > Unavailable**. A stage may
only *lower* the rung of an input as it propagates; it may never *raise* it.

| Stage | Producer | Consumer input | Output | Credibility (ceiling) |
|-------|----------|----------------|--------|-----------------------|
| Evidence graph | R3.0D D2 | R3.0C comparison authority + R3.0B case-record | Authoritative evidence nodes | Measured / Derived |
| Hypothesis | R3.0D D3 | Evidence graph (closure-private WeakSet verified) | Ranked hypotheses with reason-codes | Model / Derived / Heuristic |
| Priority | R3.0D D4 | Verified hypotheses | Ranked candidates | Heuristic |
| Engineer Brief | R3.0D D5 | Priority list + evidence graph | Authoritative brief (read-only) | Heuristic |
| Recommendation | R3.0E E3 | Engineer Brief (authoritative-only) | Physical-unit recommendation | Derived / Heuristic |
| Experiment Plan | R3.0E E1 | Recommendation + brief + case | Append-only experiment record | Derived |

*The rung shown is the maximum a stage can emit; actual rung is set per-run by
the underlying input credibility.* A Priority or Engineer Brief node whose
inputs are all Measured-rung still emerges at the **Heuristic** ceiling above,
because ranking and prose-style framing are themselves heuristic operations on
the underlying evidence.

E3 consumes the R3.0D Engineer Brief as authoritative-only input, verified
through the same closure-private WeakSet pattern (`_authoritativeGraphs` /
`verifyAuthoritativeGraph`) used by R3.0D. Caller-supplied brief contents are
rejected; only a brief object that was minted by D5 and is still resident in the
authoritative set will pass the gate.

The chain has two non-negotiable properties:

- **No runtime LLM authority.** Nothing in the chain calls an LLM at runtime to
  decide a hypothesis, a recommendation, or an outcome. Reason-codes are
  pre-enumerated; classifiers are deterministic.
- **No causation upgrade.** A correlation in the evidence graph never becomes a
  causation claim downstream. A hypothesis stays a hypothesis until an
  experiment outcome is **confirmed** with same-case + same-session evidence,
  and even then "confirmed" means *the predicted direction was observed under
  the stated control variables*, not *the setup caused the lap time*.

The recommendation stage emits **physical units only** (Nm/deg, N/mm, mm, %).
Hardware clicks are never emitted — no validated per-car click→rate mapping
exists, and fabricating one would silently bypass the credibility ladder.

A Heuristic-rung recommendation is informational only; an experiment authored
against it carries the Heuristic limitation verbatim, and any subsequent
`confirmed` outcome is capped at `confidence = medium` regardless of how clean
the follow-up comparison looks.

## Experiment shape (E1 schema)

The E1 store is the append-only ledger of plans. Every experiment record has
exactly the following authoritative fields. The record is deep-frozen at write
time and reads return structured clones; callers cannot mutate it in place.

| Field | Type | Authority | Meaning |
|-------|------|-----------|---------|
| `experimentId` | opaque id | Generated | Stable identity. Never reused, never overwritten. |
| `sourceCaseId` | case id | Producer-attested | The case the experiment was authored against. |
| `sourceHypothesisId` | hypothesis id | R3.0D D3 | The hypothesis being tested. Must exist in the source case's authoritative evidence graph. |
| `sourceRecommendationId` | recommendation id | R3.0E E3 | The recommendation that produced the plan. |
| `targetMetric` | enumerated code | Allowlist | Which **delta metric** (R3.0C C5) the experiment is targeting — e.g. `entry_understeer_delta`, `mid_balance_delta`. Free-form metric names are rejected. |
| `baselineValue` | `{ value, units, credibility, provenance }` | Measured / Derived | The baseline reading from the source case. Carries the credibility-ladder rung explicitly. |
| `expectedDirection` | `"increase" \| "decrease" \| "stay"` | Derived | The qualitative direction predicted by the model. Never a magnitude claim. |
| `expectedMagnitudeRange` | `{ min, max, units } \| null` | Model | Optional. When present, declared as a **predicted range**, not a guaranteed outcome. `null` when the model cannot bound it honestly. |
| `setupChange` | structured diff | Producer-attested | The setup lever(s) being moved, in physical units. No clicks. |
| `driverInstruction` | string \| null | Heuristic | Optional driver-facing note. Marked `Heuristic` and never treated as a vehicle fact. |
| `controlVariables` | array of declarations | Authoritative | Variables the engineer is asserting will be held constant (tyre set, fuel mass, track temp window, driver, session). Used by the outcome classifier; missing controls block confirmation. |
| `validationPlan` | structured | Authoritative | Which lap selection rule applies for the follow-up reference (still **EXPLICIT USER ONLY** at consumption time — the plan can describe *intent*, never auto-pick). |
| `stopConditions` | array of reason-codes | Allowlist | Pre-enumerated conditions that abort the experiment (e.g. `RAIN_DETECTED`, `TYRE_SET_CHANGED_UNDECLARED`). |
| `status` | enumerated | State machine | `draft` → `applied` → `awaiting_followup` → `classified` → `closed`. No back-transitions. |
| `followUpCaseIds` | append-only array | Producer-attested | Cases authored as the experimental follow-up. Each entry is a one-way link, validated against the link grammar. |
| `outcome` | classifier result \| null | E3 classifier | Set once, when classification runs. Never overwritten. |
| `createdAt` | monotonic timestamp | Authority | Monotonic per-store; out-of-order writes are rejected. |

Fields not in this list are silently dropped at write time — a recursive
descriptor audit on the input rejects future-schema bleed-through and overflow.
The store has a hard cap on field-shape and a fail-closed write path.

## Apply change → follow-up case

Applying a setup change is a **manual act by the engineer**. The system does
not push a setup to a car, does not modify the source case, and does not silently
clone evidence. The flow is:

1. The engineer reads the experiment plan (E1 record).
2. The engineer applies the change in the real world (or in the model, for a
   model-only experiment).
3. The engineer authors a **new follow-up case** in R3.0B persistence. The new
   case is an `AnalysisCase` in its own right, with its own case id, its own
   session, its own setup, and its own (optional) telemetry import.
4. The engineer creates a **Follow-up Link** (E2) from the source case + source
   experiment to the follow-up case.

The follow-up case carries no implicit trust from the source case. It is loaded
through the same R3.0B/R3.0C/R3.0D chain from scratch. R3.0B case-record schema
is frozen at v1.4.0 and is not modified by R3.0E.

The follow-up link itself has its own strict shape:

| Field | Meaning |
|-------|---------|
| `linkId` | Stable opaque id. |
| `parentCaseId` | The case the experiment was authored against. |
| `experimentId` | The experiment this follow-up is associated with. |
| `followUpCaseId` | The case that holds the post-change session. |
| `createdAt` | Monotonic per-store. |

The link store enforces:

- **Path grammar** on `linkId`, `parentCaseId`, `followUpCaseId`, `experimentId`.
- **Re-validation per fetched link** in `listForParent` — a presence-only check
  on the parent is never enough; the store re-derives membership from the
  authoritative reverse index.
- **Reverse-index parent-membership** check at read time, so a malformed write
  cannot leak follow-ups under the wrong parent.

There is intentionally no "merge" or "promote" operation. A follow-up case
never *becomes* the source case, and the source case is never edited to reflect
the follow-up's findings. The relationship is one-way and visible in the
Timeline (below).

## Case Link: cross-case comparison FORBIDDEN; follow-up links only

The single most important rule of the experiment loop:

**Comparison is SAME-CASE + SAME-SESSION only.**

The R3.0C comparison authority will refuse to compute a delta between two laps
that do not share a `caseId` and a `sessionId`. This is a hard, enforced
boundary, not a guideline. The honest reasons are:

- Tyre set, fuel mass, track surface, ambient conditions, driver state, and
  sensor calibration differ across sessions in ways the product cannot
  reconstruct after the fact.
- A "cross-case PB" comparison would silently launder unverified provenance
  into an apparently-measured delta.
- The credibility ladder requires *Measured* to mean a real-time observation
  inside a single, internally consistent telemetry window — not a stitched-up
  artifact across two cases.

Follow-up links are explicitly **not** comparison authority. A follow-up link
expresses "this later case exists *because* of that earlier experiment". It
does **not** authorize the comparison engine to delta the follow-up's laps
against the source case's laps. Inside the follow-up case, the engineer
performs a new, fresh, same-case + same-session comparison with an
**explicitly user-selected** reference lap.

Reference lap selection in the follow-up obeys the R3.0C C4 rule unchanged:
**explicit user selection only**. There is no `fastest_valid`,
`median`, `best_sector_composite`, or any other auto-pick. When the user has
not picked a reference, the comparison capability is blocked with
`REFERENCE_LAP_NOT_SELECTED`.

Delta sign in the follow-up case is, as always, `comparison − reference`.

## Outcome classifier authoritative-only inputs

The outcome classifier is a deterministic function. It takes only
authoritative inputs and emits a single classified outcome. It never accepts
a caller-supplied "final" outcome, never trusts an `eligible` / `confirmed`
flag, and never reads anything outside the producer chain.

Its inputs, in order:

1. **The Experiment record** (E1), retrieved by id from the append-only store
   and verified through a closure-private WeakSet (`_authoritativeGraphs` /
   `verifyAuthoritativeGraph` pattern from R3.0D, extended for E3).
2. **The applied change**, as declared in `experiment.setupChange`. The
   classifier does not re-derive what was changed — but it does reject the
   run when the follow-up case's setup does not reflect the declared change.
3. **The R3.0C comparison authority output** for the *follow-up case alone*
   (same-case + same-session), with an **explicitly user-selected reference
   lap**. Missing reference → `REFERENCE_LAP_NOT_SELECTED` → outcome blocked.
4. **The declared `controlVariables`** from the experiment. The classifier
   checks each one against the follow-up case's session metadata. An
   undeclared change (e.g. tyre set differs but `controlVariables` did not
   release it) is a hard fail.
5. **A minimum credibility floor** on the comparison output, set at the
   **Measured** rung. If any input on which the target delta depends is at
   `Heuristic` or `Unavailable`, the classifier emits `cannotConclude` — not
   a guess. (`Derived` rung is permitted but caps `confidence` at `medium`.)

Inputs the classifier explicitly **does not** read:

- Any cross-case comparison (forbidden by construction; see above).
- Any driver-behaviour observation as a vehicle finding. Driver behaviour
  ≠ vehicle characteristic ≠ setup finding.
- Any LLM-produced narrative. The classifier is reason-code-only.
- Any caller-provided summary flag.

The output shape is:

```
{
  class,                       // one of the five outcome classes (next section)
  reasonCodes,                 // allowlisted reason-codes; never free text
  supportingEvidenceIds,       // evidence-graph node ids that support the class
  contradictingEvidenceIds,    // evidence-graph node ids that contradict it
  controlledVariableIntegrity, // per-control-variable status; any 'violated' → not confirmed
  comparisonValidity,          // 'valid' | 'invalid' (drives invalid_comparison)
  expectedVsObserved,          // structured: directionMatch, magnitudeWithinPredictedRange?
  limitations,                 // honest scope caveats (always populated, even on confirmed)
  cannotConclude,              // boolean shortcut mirroring class === 'cannotConclude'
  provenance,                  // { syntheticOrReal, mappingTrusted, calibrationPresent }
  createdAt,                   // monotonic
  generationToken              // single-use token; bumped per case-transition
}
```

`comparisonValidity = "invalid"` forces `class = invalid_comparison` regardless
of other fields; see the precedence ordering in the outcome-classes table
below.

`generationToken` exists specifically to defend against retired-token replay:
a classifier result written under an old token (e.g. before a case transition)
is rejected on read.

## Outcome classes: confirmed / refuted / inconclusive / invalid_comparison / cannotConclude

The classifier emits exactly one of five classes. The classes are ordered by
precedence — when multiple conditions apply, the highest-precedence class wins.

| Class | When | What it does *not* mean |
|-------|------|--------------------------|
| `invalid_comparison` | The R3.0C comparison authority rejected the follow-up's comparison (e.g. no explicit reference lap, non-monotonic timebase, channel mapped-but-unconfirmed, degenerate normalized-distance). | Does **not** mean the experiment failed — only that *no honest comparison was possible*. The setup change is not judged. |
| `cannotConclude` | A required input is at credibility `Heuristic` or `Unavailable` (below the **Measured** credibility floor — see Authoritative-only inputs step 5); or a declared control variable is missing data; or the minimum credibility floor is not met. | Does **not** mean the experiment was inconclusive in the data — it means *the data does not let us conclude either way*. The next-validation step is populated. |
| `inconclusive` | All inputs were credible and controlled, the comparison was valid, but the predicted direction was neither observed nor reversed under the stated control variables at a credibility above the floor (e.g. within noise, mixed across the corner-pairing, or magnitude inside the model's predicted range and inside the noise band simultaneously). | Does **not** mean "try again with more aggressive change". |
| `refuted` | Comparison valid, controls intact, the **opposite** of `expectedDirection` was observed under the stated control variables at a credibility above the floor. | Does **not** mean the hypothesis is universally false — only that the predicted direction was not observed under these controls in this session. |
| `confirmed` | Comparison valid, controls intact, the predicted direction was observed under the stated control variables at a credibility above the floor. When `expectedMagnitudeRange` was supplied, the observed magnitude is reported alongside it but does not itself gate the class. | Does **not** mean "the setup change *caused* the lap time", does **not** mean "professionally validated", and does **not** unlock any auto-apply. Correlation ≠ causation, Prediction ≠ guaranteed result. |

Every outcome — including `confirmed` — carries:

- **credibility** of the underlying comparison (the ladder rung; e.g.
  `Measured (kinematic, confounded)` for a corner-delta on raw telemetry).
- **confidence**, an independent scalar capped at `medium` whenever any input
  rung is below `Measured`.
- **provenance** machine-read from the comparison output (synthetic stays
  synthetic; nothing presented as real that is not).
- **limitations**, always populated. A confirmed outcome that ran against
  synthetic data carries the synthetic limitation verbatim.
- **blockers** (empty when the class is one of the four classified outcomes;
  populated with reason-codes when the class is `invalid_comparison` /
  `cannotConclude`).
- **evidence references** to the supporting and contradicting evidence-graph
  nodes.
- **next validation step** — the explicit action the user would have to take
  to upgrade credibility (e.g. "import verified road-wheel steering
  calibration to upgrade directional → measured" / "run a second follow-up
  with the same tyre set to corroborate"). This field is required on every
  outcome, not just blocked ones.

## Append-only Timeline (monotonic createdAt, no overwrite, out-of-order rejected)

The Timeline is the canonical, ordered view of the experiment loop's history
for a given case lineage. It is its own store (E4 — the timeline-store) and
is **append-only** with the following hard invariants:

1. **Monotonic `createdAt` per store.** A write whose `createdAt` is not
   strictly greater than the latest entry's `createdAt` for the same parent
   lineage is rejected. There is no clock-skew tolerance and no "renumber on
   import" — out-of-order writes fail closed with a reason-code.
2. **No overwrite.** A timeline entry's id is single-write. A second write
   with the same id is rejected. There is no `PUT` semantics, only append.
3. **No deletion.** The store has no delete operation in the runtime API.
   Migrations (R3.0F F1) only ever *add* entries when upgrading older stores;
   they do not remove existing ones.
4. **Deep-freeze on write, structured-clone on read.** Callers cannot mutate
   an entry by holding its reference, and a returned entry cannot be used to
   smuggle a mutation back into the store.
5. **Pre-clone audit.** Every entry is recursively audited before clone — any
   non-allowlisted property, prototype-poisoning attempt, or accessor-throwing
   shape is rejected, not stripped.
6. **Producer attestation.** Each entry declares its producer (`E1` /
   `E2` / `E3` / `E4` viewmodel) and is verified through the same
   closure-private WeakSet pattern that R3.0D uses for evidence graphs. An
   entry whose producer attestation does not verify is invisible to the
   viewmodel.

The Timeline entry types are intentionally narrow:

| Entry type | Producer | Carries |
|-----------|----------|---------|
| `experiment_authored` | E1 | `experimentId`, `sourceCaseId`, `targetMetric`, `expectedDirection` |
| `change_applied` | E1 (status transition) | `experimentId`, declared `setupChange` summary |
| `followup_linked` | E2 | `linkId`, `experimentId`, `followUpCaseId` |
| `outcome_classified` | E3 | `experimentId`, `class`, `reasonCodes`, `controlledVariableIntegrity`, `credibility`, `limitations` |
| `experiment_closed` | E1 (status transition) | `experimentId` |

The Timeline never carries free-form narrative, and it never embeds a
caller-provided summary. The viewmodel renders each entry by reading its
reason-codes and lifting them through the same i18n code-resolution that the
rest of R3.0 uses.

Because the Timeline is the only ordered, append-only record of *what the
product told the engineer*, two product invariants follow:

- A classified outcome is visible in the Timeline exactly once. Re-running
  the classifier on the same experiment does not produce a second
  `outcome_classified` entry — the second run is rejected with
  `OUTCOME_ALREADY_CLASSIFIED`.
- A `cannotConclude` or `invalid_comparison` outcome is **not** silently
  upgraded by a later, better follow-up. The original outcome stays in the
  Timeline. A later follow-up is a new experiment with its own outcome — the
  history is preserved, not overwritten.

This is the experiment loop's honesty contract in storage form: the product
remembers what it could and could not honestly say, in the order it said it,
and it cannot rewrite that history to look better in hindsight.
