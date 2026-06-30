# R3.0E Experiment Loop

The experiment loop is the producer chain that turns a R3.0D Engineer Brief into a
concrete, append-only record of *what was tried, what was applied, what happened
next, and whether the next case could honestly tell us anything*. It is the part
of the product where the system stops *recommending* and starts *bookkeeping*.

Like every other layer in R3.0, the loop is fail-closed and authoritative-only.
It never decides on behalf of the engineer, never auto-applies a setup change,
never auto-selects a reference, never overwrites the timeline, and never
cross-pollinates cases. When a required input is missing, the corresponding
capability is **blocked with a reason** — never approximated.

This document covers the R3.0E surface only. R3.0F integrated-delivery concerns
(migration, E2E, hardening) are described elsewhere.

**Scope note.** R3.0E's own `featureRegistryActivationAllowed` flipped to `true`
at `E5_ACTIVATION` (`governance/r3.0e/state.json`). The Experiment Loop and
Case Timeline panes (`case:experiment_loop`, `case:case_timeline` in
`renderer/js/feature-registry.js`) are registered as `available_conditional`
— live in the navigation, but each pane's viewmodel returns an `unavailable`
display state for a given case until that case actually carries an
authoritative E3 outcome / E4 timeline projection. This is a per-case data
gate, not a feature-registry gate.

## Producer chain: R3.0D engineer-brief → recommendation → experiment plan

The chain that precedes an experiment plan spans two programs. **R3.0D owns the
recommendation**; **R3.0E owns the experiment, its application, and its
classification.** There is no R3.0E-side "recommendation producer" — the
Recommendation shape itself is defined and validated by the non-production
contract `contracts/r3.0d/recommendation-contract.js` and consumed inside
R3.0D's own D4 Priority Engine / D5 Engineer Brief, not by an R3.0E module.

Each stage consumes only the **authoritative** output of the previous stage;
no stage will read caller-provided summary flags such as `eligible`,
`confirmed`, `validated`, or `final`. Eligibility is re-derived from raw
evidence on every run.

The credibility ladder used throughout this document, top-to-bottom, is:
**Physics > Model > Measured > Derived > Heuristic > Unavailable**. A stage may
only *lower* the rung of an input as it propagates; it may never *raise* it.

| Stage | Producer | Consumer input | Output | Credibility (ceiling) |
|-------|----------|----------------|--------|-----------------------|
| Evidence graph | R3.0D D2 | R3.0C comparison authority + R3.0B case-record | Authoritative evidence nodes | Measured / Derived |
| Hypothesis | R3.0D D3 | Evidence graph (closure-private WeakSet verified) | Ranked hypotheses with reason-codes | Model / Derived / Heuristic |
| Priority / Recommendation | R3.0D D4 | Verified hypotheses | Ranked candidates + a Recommendation (`contracts/r3.0d/recommendation-contract.js` shape: `priorityKey`, `applyMode` restricted to `driver_action`/`user_initiated`, no `auto_*`) | Heuristic |
| Engineer Brief | R3.0D D5 | Priority list + evidence graph | Authoritative brief (read-only) | Heuristic |
| Experiment Plan | R3.0E E1 | Engineer authors the plan, referencing the brief/recommendation by id | Experiment record (mutable via `create`/`update`/`get`/`list`/`remove`; the Timeline is the append-only audit trail — see below) | Derived |
| Outcome Classification | R3.0E E3 | Experiment + applied change + follow-up comparison + control-variable observations | Outcome record (see "Outcome classifier" below) | Derived (capped) |

*The rung shown is the maximum a stage can emit; actual rung is set per-run by
the underlying input credibility.* A Priority or Engineer Brief node whose
inputs are all Measured-rung still emerges at the **Heuristic** ceiling above,
because ranking and prose-style framing are themselves heuristic operations on
the underlying evidence.

The Experiment record's `sourceHypothesisId` and `sourceRecommendationId`
fields are **id-grammar-validated string references only** (`contracts/r3.0e/
experiment-contract.js`) — there is no closure-private WeakSet that verifies
an R3.0D-minted Recommendation or Engineer Brief object crossed the R3.0D→
R3.0E boundary intact. The engineer is the one who reads the D5 brief and
authors the E1 experiment record referencing it by id; R3.0E does not
re-verify the brief's authoritative provenance at experiment-creation time.

The chain has two non-negotiable properties:

- **No runtime LLM authority.** Nothing in the chain calls an LLM at runtime to
  decide a hypothesis, a recommendation, or an outcome. Reason-codes are
  pre-enumerated; classifiers are deterministic.
- **No causation upgrade.** A correlation in the evidence graph never becomes a
  causation claim downstream. A hypothesis stays a hypothesis until an
  experiment outcome is **confirmed** with same-case + same-session evidence,
  and even then "confirmed" means *the predicted direction was observed under
  the stated control variables*, not *the setup caused the lap time*, and never
  *the driver caused the result*. Driver behaviour is not a vehicle finding.

The recommendation stage emits **physical units only** (Nm/deg, N/mm, mm, %).
Hardware clicks are never emitted — no validated per-car click→rate mapping
exists, and fabricating one would silently bypass the credibility ladder.

A Heuristic-rung recommendation is informational only; an experiment authored
against it carries the Heuristic limitation verbatim, and any subsequent
`confirmed` outcome is capped at `confidence = medium` regardless of how clean
the follow-up comparison looks.

## Experiment shape (E1 schema)

The E1 store is the ledger of experiment plans. It is **mutable** — its
`createExperimentStore` exposes `create(rec)`, `update(rec)`, `get(experimentId)`,
`list()`, and `remove(experimentId)`. `update` enforces a stale-write check by
comparing the persisted `createdAt` against the candidate; `remove` deletes both
the payload and the index entry. The append-only ledger of *what the product
told the engineer* lives in the Timeline store (see below), not here.

Every experiment record has the following authoritative fields. The record is
deep-frozen at write time and reads return structured clones; callers cannot
mutate it in place.

This table reflects the actual closed key set and validation in
`contracts/r3.0e/experiment-contract.js`:

| Field | Type | Validation | Meaning |
|-------|------|-----------|---------|
| `experimentId` | string, `exp_<16-32 hex>` | Grammar-checked | Stable identity. Never reused. |
| `sourceCaseId` | string | Id-grammar-checked only | The case the experiment was authored against. No live cross-check against R3.0B at the contract layer. |
| `sourceHypothesisId` | string | Id-grammar-checked only | Reference to the R3.0D D3 hypothesis being tested. Not re-verified against the evidence graph at write time. |
| `sourceRecommendationId` | string | Id-grammar-checked only | Reference to the R3.0D D4/D5 recommendation that produced the plan. Not re-verified against an authoritative R3.0D producer set. |
| `targetMetric` | non-empty string (≤512 bytes) | Length-checked only | Which metric the experiment is targeting (e.g. a R3.0C C5 delta-metric name). **Not an allowlist** — any non-empty string under the byte cap is accepted at this layer. |
| `baselineValue` | finite number | `Number.isFinite` | The baseline reading from the source case. A plain number — no `{ value, units, credibility, provenance }` wrapper. |
| `expectedDirection` | `'increase' \| 'decrease' \| 'no_change'` | Closed enum | The qualitative direction predicted by the model. (Not `"stay"` — the literal enum value is `'no_change'`.) |
| `expectedMagnitudeRange` | `{ min: number, max: number }`, `min <= max` | Required, not nullable | A plain object with finite `min`/`max`. There is no `units` key in this object and no `null` escape hatch — the contract rejects a non-plain or missing range. |
| `setupChange` | plain object | `_isPlain` only | The setup lever(s) being moved. The contract checks it is a plain object; it does not enforce a specific physical-unit shape. |
| `driverInstruction` | string \| `null` | Optional | Optional driver-facing note when non-null. |
| `controlVariables` | array, ≤32 entries | `Array.isArray` + length cap only | Declared control variables. The E1 contract does not validate per-element shape; the E3 classifier reads each element's `.name` at runtime to compare against observed control variables. |
| `validationPlan` | non-empty string (≤512 bytes) | Length-checked only | An i18n-key-style string naming the validation procedure. **Not a structured object.** |
| `stopConditions` | array, 1–32 entries, each `{ i18nKey: string, params?: object }` | Shape-checked | Pre-enumerated guard conditions. The contract enforces the `{i18nKey, params}` shape and a non-empty `i18nKey`; it does not enforce a fixed catalogue of `i18nKey` values. |
| `status` | enumerated | Closed enum | `'draft' \| 'planned' \| 'applied' \| 'completed' \| 'abandoned' \| 'invalid'`. The contract does not enforce transition order — that is left to the calling code. |
| `followUpCaseIds` | array, ≤32 entries | `Array.isArray` + length cap only | Cases authored as the experimental follow-up. |
| `outcome` | Outcome object \| `null` | Status-gated | Must be `null` while `status` is `'draft'`, `'planned'`, or `'applied'`. May be a plain object only when `status` is `'completed'`, `'abandoned'`, or `'invalid'` — this prevents a caller from attaching a classification result before the experiment has actually concluded. |
| `createdAt` | ISO-8601 string | Non-empty string | Used as the stale-write guard on `update` (compared for exact equality, not freshness). |

A field not in this list does **not** get silently dropped — the contract
rejects the whole record fail-closed with `EXPERIMENT_INVALID`/
`UNKNOWN_OWN_KEY` (`contracts/r3.0e/experiment-contract.js`'s
`_hasOnlyAllowedKeys` check), and the store surfaces that as
`R3_0E_EXPERIMENT_INVALID`. There is no silent-truncation path; an unknown
field is a write failure, not a write-with-fields-removed.

## Persistence semantics (R3.0E E2 stores)

The E2 surface is a set of IndexedDB-backed stores reached through the R3.0B
storage backend contract: `backend.transact({ stores, reads, compute })`. The
production module is `renderer/js/r3-0e-stores.js` (UMD export
`R3_0E_Stores`), which composes five factories — `createExperimentStore`,
`createOutcomeStore`, `createTimelineStore`, `createFollowUpLinkStore`, and
`createStoreMetadata`. Per the D12/E1 ruling, R3.0E persistence lives in
**separate versioned stores**; it does not extend the frozen R3.0B portable
case-record schema body (which remains at v1.4.0).

| Object store name | Keyed by | Holds |
|-------------------|----------|-------|
| `r3_0e_experiments` | `experimentId` | Experiment payload (E1 schemaVersion 1) |
| `r3_0e_experimentsIndex` | `experimentId` | Summary index for `list()` |
| `r3_0e_outcomes` | `outcomeId` | Outcome payload (schemaVersion 1) |
| `r3_0e_outcomesIndex` | `outcomeId` | Summary index for `listForExperiment` |
| `r3_0e_timelines` | `caseId` | One append-only timeline doc per case (schemaVersion 1) |
| `r3_0e_followupLinks` | `linkId` | Follow-up link payload (schemaVersion 1) |
| `r3_0e_followupLinksByCase` | `parentCaseId` | Reverse index, `Array<linkId>` |
| `r3_0e_storeMetadata` | constant key `__r3_0e_version` | Migration / schema-version marker |

Mutability is **per store**, not global:

- **`createExperimentStore`** — mutable. `create / update / get / list / remove`.
  `update` enforces equality of the persisted `createdAt` against the candidate
  and otherwise emits `R3_0E_EXPERIMENT_STALE_WRITE`. `remove` deletes both
  payload and index in one transaction.
- **`createOutcomeStore`** — write-once-ish. Exposes only `create`, `get`, and
  `listForExperiment`. There is no `update` and no `remove` — an outcome is
  classified once.
- **`createTimelineStore`** — **append-only**. Exposes only `getTimeline(caseId)`
  and `appendEvent(caseId, event)`. No `update`, no `remove`. See the next
  section for the append rules.
- **`createFollowUpLinkStore`** — mutable in a constrained way. Exposes
  `create`, `get`, `listForParent`, and `markParentStatus(linkId, newStatus)`.
  `markParentStatus` accepts only `'present' | 'archived' | 'deleted'`; any
  other value is rejected with `R3_0E_LINK_PARENT_STATUS_INVALID`.
- **`createStoreMetadata`** — `readVersion()` and `writeVersion(versionMap)`,
  used by the F1 migration runner.

Across every store the contract is the same:

- Every payload is validated by its E1 contract **before** write inside the
  `compute()` of the `transact` call.
- Every payload is re-validated on read; a payload with a `schemaVersion`
  greater than the current supported version (`1` for every E2 store today)
  fails closed with `R3_0E_*_FUTURE_SCHEMA`.
- Persisted records carry **no runtime authority**: the closure-private
  WeakSets that R3.0D and R3.0E E3 use to verify authoritative inputs cannot
  survive a reload. Rehydration consumers must re-validate via the E1 contracts
  before treating a payload as authoritative again.
- Reason-codes are pre-enumerated. The full E2 set includes the
  `R3_0E_EXPERIMENT_*` family (invalid, schema mismatch, id collision, missing,
  future schema, stale write, corrupted), the `R3_0E_OUTCOME_*` family
  (invalid, id collision, future schema, corrupted), the `R3_0E_TIMELINE_*`
  family (future schema, corrupted, duplicate event, out of order, invalid),
  the `R3_0E_LINK_*` family (invalid, id collision, future schema, corrupted,
  missing, parent status invalid), plus `R3_0E_STORE_BACKEND_INVALID` and
  `R3_0E_VERSION_INVALID`.

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
| `createdAt` | ISO-8601 timestamp. |

The link store enforces:

- **Path grammar** on `linkId`, `parentCaseId`, `followUpCaseId`, `experimentId`
  (Codex E2-R1-03 closure).
- **Re-validation per fetched link** in `listForParent` — a presence-only check
  on the parent is never enough; every link is re-validated as it is fetched
  (Codex E2-R1-02 closure).
- **Reverse-index parent-membership** check (`r3_0e_followupLinksByCase` →
  `r3_0e_followupLinks`), so a malformed write cannot leak follow-ups under the
  wrong parent (Codex E2-R2-01 closure).
- **Parent status mutation only via `markParentStatus(linkId, newStatus)`**,
  with `newStatus` restricted to `'present' | 'archived' | 'deleted'`.

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
`median`, `best_sector_composite`, or any other auto-pick. At the R3.0C
comparison-authority layer, an unselected reference is rejected with
`REFERENCE_NOT_SELECTED` (`contracts/r3.0c/reference-and-corner-contract.js`).
At the R3.0E outcome-classifier layer (below), the follow-up's
`hasExplicitReference !== true` flag folds into the `invalid_comparison` class
with the limitation `OUTCOME_COMPARABILITY_INSUFFICIENT` — there is no
`REFERENCE_LAP_NOT_SELECTED` code in the shipped R3.0E path.

Delta sign in the follow-up case is, as always, `comparison − reference`.

## Outcome classifier authoritative-only inputs

The outcome classifier (`renderer/js/r3-0e-outcome-classifier.js`,
authoritative entry `classifyOutcome(input, opts)`) is a deterministic
function. It takes only the fields declared in its closed input-key set and
emits a single classified Outcome. It never accepts a caller-supplied "final"
outcome, never trusts an `eligible`/`confirmed` flag, and never reads a field
outside its allowlisted input shape.

The input wrapper has exactly five keys:

1. **`experiment`** — the Experiment record (E1). The classifier requires it
   to be deep-frozen and re-validates it against
   `EXP.validateExperimentShape`. This is a **shape + immutability** check, not
   a producer-identity WeakSet check — there is no cross-program authority
   registry verifying the experiment was minted by a specific R3.0D/R3.0E
   producer.
2. **`appliedChange`** — `{ changeId, sourceExperimentId, appliedAt }`,
   id-grammar- and timestamp-checked. The classifier does not re-derive what
   was changed from `experiment.setupChange`; it only validates this small
   envelope's shape and freshness.
3. **`followUp`** — `{ followUpCaseId, parentCaseId, sessionId,
   parentSessionId, hasExplicitReference, comparabilityScore }`. The
   classifier derives `crossCase` (`followUp.parentCaseId !==
   experiment.sourceCaseId`), `crossSession`
   (`followUp.sessionId !== followUp.parentSessionId`), `noExplicitReference`
   (`followUp.hasExplicitReference !== true`), and `lowComparability`
   (`comparabilityScore < 0.5`) from this object. Any one of the four forces
   `class = 'invalid_comparison'` — this is the highest-precedence outcome.
4. **`observation`** — `{ observedDirection, observedMagnitude,
   driverFeedback, dataQualityIssues, sideEffects, contradictingEvidenceIds,
   supportingEvidenceIds }`. `observedDirection`/`observedMagnitude` drive the
   confirmed/partially_confirmed/contradicted decision (see below);
   `dataQualityIssues.length` above a fixed threshold (4) forces
   `'inconclusive'`; a non-empty `contradictingEvidenceIds` forces
   `'contradicted'` regardless of direction match.
5. **`controlVariableObservations`** — an array of observed control-variable
   readings. The classifier compares this against `experiment.controlVariables`
   (declared by name): a declared variable missing from the observations, or
   an observed variable flagged `withinRange !== true`, becomes a confounder
   and forces `class = 'inconclusive_due_to_confounders'`.

There is **no credibility-rung gate** in this classifier (no "Measured floor",
no `Heuristic`/`Unavailable` rejection) and **no `cannotConclude` class** —
that vocabulary does not exist in the shipped code. The six real classes are
listed in the next section.

Inputs the classifier explicitly **does not** read:

- Any cross-case comparison (forbidden by construction; see above).
- Any driver-behaviour observation as a vehicle finding. Driver behaviour
  ≠ vehicle characteristic ≠ setup finding.
- Any LLM-produced narrative. The classifier is reason-code-only.
- Any caller-provided summary flag (`eligible`, `confirmed`, `class`, etc.).

The output Outcome object has exactly thirteen keys, matching
`contracts/r3.0e/outcome-contract.js`'s `OUTCOME_KEYS`:

```
{
  schemaVersion,        // integer, currently 1
  outcomeId,            // derived from experimentId + appliedChange.changeId
  experimentId,         // echoes experiment.experimentId
  class,                // one of six outcome classes (next section)
  observedDirection,    // echoed from the observation input
  observedMagnitude,    // echoed from the observation input
  comparabilityScore,   // echoed from the followUp input
  confounders,          // control-variable names that drifted/are missing (see step 5 above)
  driverFeedback,       // echoed from the observation input
  dataQualityIssues,    // echoed from the observation input
  sideEffects,          // echoed from the observation input
  limitations,          // reason codes accumulated during classification (always present, may be empty)
  createdAt,            // ISO-8601, resolved from opts.clock / appliedChange.appliedAt / experiment.createdAt
}
```

There is no `reasonCodes`, `supportingEvidenceIds`, `contradictingEvidenceIds`,
`controlledVariableIntegrity`, `comparisonValidity`, `expectedVsObserved`,
`cannotConclude`, `provenance`, or `generationToken` key on the output —
those are either input-only fields (`supportingEvidenceIds`/
`contradictingEvidenceIds` belong to the `observation` input) or do not exist
in the shipped classifier at all.

## Outcome classes: confirmed / partially_confirmed / contradicted / inconclusive / invalid_comparison / inconclusive_due_to_confounders

The classifier emits exactly one of **six** classes
(`contracts/r3.0e/outcome-contract.js`'s `OUTCOME_CLASS_ALLOWED`). The classes
are evaluated in a fixed precedence order — when multiple conditions apply,
the highest-precedence class wins:

| Precedence | Class | When (from `renderer/js/r3-0e-outcome-classifier.js`) | What it does *not* mean |
|---|-------|------|--------------------------|
| 1 (highest) | `invalid_comparison` | `crossCase` (follow-up's `parentCaseId` ≠ experiment's `sourceCaseId`), OR `crossSession` (follow-up's `sessionId` ≠ `parentSessionId`), OR `noExplicitReference` (`hasExplicitReference !== true`), OR `lowComparability` (`comparabilityScore < 0.5`). | Does **not** mean the experiment failed — only that *no honest comparison was possible*. The setup change is not judged. |
| 2 | `inconclusive_due_to_confounders` | A control variable declared in `experiment.controlVariables` is missing from the observed set, OR an observed control variable has `withinRange !== true`. | Does **not** mean the hypothesis is wrong — it means a variable the engineer promised to hold constant did not stay constant (or was never observed). |
| 3 | `inconclusive` | `observation.dataQualityIssues.length` exceeds a fixed threshold (4), OR `observation.observedDirection === null`. | Does **not** mean "try again with more aggressive change" — it means the observation itself was too noisy or incomplete to classify. |
| 4 | `contradicted` | `observation.contradictingEvidenceIds` is non-empty, OR the observed direction does not match `experiment.expectedDirection`. | Does **not** mean the hypothesis is universally false — only that the predicted direction was not observed under these controls in this session. |
| 5 | `confirmed` | Observed direction matches `expectedDirection` AND `observedMagnitude` falls within `expectedMagnitudeRange` (`min`–`max`, inclusive). | Does **not** mean "the setup change *caused* the lap time", does **not** mean "professionally validated", and does **not** unlock any auto-apply. Correlation ≠ causation, Prediction ≠ guaranteed result. |
| 6 (fallback) | `partially_confirmed` | Observed direction matches `expectedDirection`, but `observedMagnitude` falls outside `expectedMagnitudeRange` (or is not a finite number). | Does **not** mean "confirmed at a lower confidence" with a numeric score — there is no separate confidence scalar; `partially_confirmed` is itself the honest signal that direction matched but magnitude did not. |

There is no `refuted` or `cannotConclude` class, and there is no separate
`credibility`/`confidence`/`provenance`/`blockers`/`evidence references`/
`next validation step` field on the Outcome object — the thirteen fields
listed in the output-shape block above are the entire output. The closest
analogues that do exist are: `limitations` (reason codes accumulated during
classification, e.g. `LIMITATION_CROSS_SESSION_FOLLOW_UP`,
`OUTCOME_COMPARABILITY_INSUFFICIENT`, `CONTROL_VARIABLE_MISSING`,
`CONTROL_VARIABLE_OUT_OF_RANGE`, `LIMITATION_NO_CONTROL_VARIABLES`, or the
echoed `dataQualityIssues` codes when `'inconclusive'` is blocking-triggered),
and `confounders` (the names of control variables that drifted or went
unobserved, populated only for `'inconclusive_due_to_confounders'`).

## Append-only Timeline (non-decreasing `createdAt`, no overwrite, out-of-order rejected)

The Timeline is the canonical, ordered view of the experiment loop's history
for a given case lineage. It is **its own store** —
`createTimelineStore` in `renderer/js/r3-0e-stores.js`, with the contract in
`contracts/r3.0e/case-timeline-contract.js` (UMD export
`R3_0E_CaseTimelineContract`). It is the **only** append-only store in
R3.0E. The other R3.0E stores expose different mutation surfaces: the
**experiment store** allows targeted mutation through its public `create`,
`update`, and `remove` methods; the **follow-up-link store** allows only the
narrow `markParentStatus` mutation on an existing link record; the
**outcome store** is create-only through its public API (`create`, `get`,
`listForExperiment`), with duplicate-id rejection and no update or remove
method. The timeline-store has no mutation surface at all.

The store keys timelines by `caseId`: the persisted document for a case is
`{ schemaVersion, caseId, events }`, with `schemaVersion = 1` (the constant
`SUPPORTED_SCHEMA_VERSION`) and `events.length` hard-capped at the constant
`ARRAY_CAP = 64`. Each event is a plain object with exactly the keys
`{ eventId, kind, createdAt, i18nKey, params }`.

The runtime API is just two methods: `getTimeline(caseId)` and
`appendEvent(caseId, event)`. Append enforces:

1. **Non-decreasing `createdAt`.** The append path runs
   `if (isNaN(newMs) || newMs < prevMs) throw R3_0E_TIMELINE_OUT_OF_ORDER;`
   against the most-recent event. **Equal timestamps are accepted**; only a
   strictly-earlier timestamp is rejected. The contract validator follows the
   same rule — `if (msNow < prevTime) reasons.push(TIMELINE_ORDERING_INVALID);
   else prevTime = msNow;`. There is no clock-skew tolerance beyond the
   equality case and no "renumber on import".
2. **No duplicate `eventId`.** `appendEvent` rejects when any existing event's
   `eventId` matches the new event's `eventId` with
   `R3_0E_TIMELINE_DUPLICATE_EVENT`. Single-write per id, full stop.
3. **No deletion / no update.** The store has no delete and no update operation
   in its runtime API. F1 migration (R3.0F) does **not** add, remove,
   reorder, or rewrite timeline events: the migrator at
   `scripts/migrators/timeline-migrator.js` exports `STEPS = []` and its
   header states verbatim *"R3.0F F1 timeline migrator. v1 only; never
   fabricates events."* Migration validates the existing v1 shape and
   passes records through unchanged.
4. **Deep-freeze on write, structured-clone on read.** Callers cannot mutate
   an entry by holding its reference, and a returned entry cannot be used to
   smuggle a mutation back into the store.
5. **Recursive descriptor audit before clone.** The contract walks the
   timeline and each event recursively, rejecting any non-allowlisted
   property, prototype-poisoning attempt, or accessor-throwing shape — the
   audit runs *before* `toCleanCopy` (Codex E1-R2-02 closure), not after.
6. **Future-schema fail-closed.** `schemaVersion > 1` →
   `UNSUPPORTED_FUTURE_SCHEMA`; `schemaVersion < 1` or non-integer →
   `TIMELINE_INVALID`.
7. **Producer attestation (R3.0F F1).** F1 never fabricates timeline events
   (`STEPS = []` in the timeline migrator) and also refuses any input record
   carrying attestation sentinel fields anywhere in its shape — see the
   R3.0F migration doc for the `PRODUCER_ATTESTATION_REFUSED` contract.
   Runtime producer attestation is held in non-serialisable WeakSets and is
   never persisted or exported.

The Timeline event-kind enum (`EVENT_KIND_ALLOWED` in
`contracts/r3.0e/case-timeline-contract.js`) is closed and has exactly eight
values. The contract itself only validates the generic event shape
`{ eventId, kind, createdAt, i18nKey, params }` — `params` must be `null` or
a plain object; **there is no per-kind field schema enforced by the
contract.** The table below shows the plausible producer and a suggested
`params` payload per kind — illustrative usage, not a contract-enforced
shape:

| `kind` | Plausible producer | Suggested `params` content (not contract-enforced) |
|--------|----------|---------|
| `baseline_captured` | Case admission into the experiment loop | A case-record snapshot reference |
| `hypothesis_recorded` | R3.0D D3 | `hypothesisId`, target metric, expected direction |
| `recommendation_made` | R3.0D D4/D5 (recommendation/brief, not an R3.0E module) | `recommendationId`, physical-unit setup lever(s), expected direction/range |
| `experiment_planned` | R3.0E E1 (`status: 'draft'`) | `experimentId`, `sourceCaseId`, `targetMetric`, `expectedDirection` |
| `experiment_applied` | R3.0E E1 (`status: 'applied'`) | `experimentId`, declared `setupChange` summary |
| `follow_up_case_created` | R3.0E E2 link store | `linkId`, `experimentId`, `followUpCaseId`, `parentCaseId` |
| `outcome_classified` | R3.0E E3 classifier | `experimentId`, `class`, and a subset of the real 13-key Outcome object (e.g. `limitations`, `confounders`) — not `reasonCodes`/`controlledVariableIntegrity`/`credibility`, which are not real Outcome fields (see "Outcome classes" above) |
| `experiment_abandoned` | R3.0E E1 (stop-condition or explicit abandon) | `experimentId`, abandon reason-code |

No other `kind` values exist. A timeline event whose `kind` is not in this
list is rejected with `TIMELINE_INVALID`; there is no `experiment_authored`,
no `change_applied`, no `followup_linked`, no `experiment_closed`, no future
extension by free text.

The Timeline never carries free-form narrative, and it never embeds a
caller-provided summary. The viewmodel renders each entry by reading its
reason-codes and `i18nKey` and lifting them through the same i18n code
resolution that the rest of R3.0 uses.

Because the Timeline is the only ordered, append-only record of *what the
product told the engineer*, two product invariants follow:

- A classified outcome appears in the Timeline exactly once. Re-running the
  classifier on the same experiment does not produce a second
  `outcome_classified` event — the second append is rejected by the
  duplicate-`eventId` rule. The experiment store may itself update other
  fields, but it cannot rewrite history.
- An `inconclusive`, `inconclusive_due_to_confounders`, or `invalid_comparison`
  outcome is **not** silently upgraded by a later, better follow-up. The
  original `outcome_classified` event stays in the Timeline. A later
  follow-up is a new experiment with its own outcome — the history is
  preserved, not overwritten.

This is the experiment loop's honesty contract in storage form: the product
remembers what it could and could not honestly say, in the order it said it,
and it cannot rewrite that history to look better in hindsight.
