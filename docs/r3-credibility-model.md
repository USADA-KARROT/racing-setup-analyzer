# R3.0 Credibility Model

This document is the R3.0-specific extension of [`docs/credibility-and-trust.md`](./credibility-and-trust.md). It does not replace the ladder defined there; it pins down the **closed-rung enums** that each R3.0 producer must emit, the **conditions under which each rung may be granted**, what each rung **guarantees and explicitly does NOT guarantee**, and the governance rules — producer attestation, fail-closed defaults, cross-case + cross-session forbidden propagation — that prevent a rung from being upgraded by anything other than the producer that originally derived it.

The credibility ladder defined in `credibility-and-trust.md` (Physics > Model > Measured > Derived > Heuristic > Unavailable) is the higher-level taxonomy and remains the user-facing labelling throughout R3.0. The contracts that R3.0 producers consume are **closed enums defined in code**: the R3.0C comparison-authority contract (`contracts/r3.0c/credibility-contract.js`) and the R3.0D evidence/conclusion contracts (`contracts/r3.0d/credibility-contract.js`). Both contract modules carry the same opening statement in their headers: *credibility is OWNED by the domain/service (it is an INPUT here); a UI/consumer never derives it. This module only VALIDATES caller-supplied authority — it computes no new measurement and reads no telemetry.*

Nothing in this document permits a downstream consumer to **upgrade** a rung. A rung may only be **demoted** to `Unavailable` (blocked, with a reason) when a quality gate fails. Upgrade is structurally impossible by the producer-attestation contract: the producer that derived the value is the only authority for its rung, and that producer's attestation is verified, not trusted.

---

## The contract enums: three distinct closed enums, defined in code

There is no single universal three-rung enum in R3.0. There are **three distinct closed enums**, each defined in a contract module and consumed by a specific producer family. A pipeline boundary that crosses between two of them re-validates against the receiving contract; values are never silently re-tagged.

### R3.0C `CREDIBILITY_LADDER` — comparison-authority credibility (6 values)

Defined in `contracts/r3.0c/credibility-contract.js` (UMD global `R3_0C_CredibilityContract`). The header comment reads verbatim: *credibility ladder (docs/credibility-and-trust.md) + provenance (R3.0B case-record enums). Frozen.*

```
CREDIBILITY_LADDER = ["Physics", "Model", "Measured", "Derived", "Heuristic", "Unavailable"]
```

This is the same six-rung ladder that `credibility-and-trust.md` exposes as the user-facing taxonomy. R3.0C carries it across the comparison-authority boundary as a frozen closed enum. The contract's `REQUIRED_FIELDS` are `["credibility", "provenance", "confidence", "limitations", "blockedReasons"]`; any missing, blank, or out-of-enum field yields the reason code `INSUFFICIENT_CREDIBILITY_METADATA` and the validator returns `{ valid: false, reasonCodes: [...] }`. The companion `PROVENANCE` enum is `["synthetic", "real", "unverified"]` and the companion `CONFIDENCE` enum is `["low", "medium", "high"]`. The R3.0C normalizer (`normalizeCredibilityMetadata`) is a **pass-through assembler**: it validates and then returns a frozen copy of caller-supplied authority, or a blocked result; it derives nothing. `derivedHere: false` on every successful return.

### R3.0D `EVIDENCE_CREDIBILITY` — evidence-credibility ladder (4 values)

Defined in `contracts/r3.0d/credibility-contract.js` (UMD global `R3_0D_CredibilityContract`).

```
EVIDENCE_CREDIBILITY = ["measured", "derived", "heuristic", "synthetic"]
```

The contract's own header comment reads verbatim: *R3.0D credibility ladder. Directive §8 mandates `measured / derived / heuristic / synthetic` for EVIDENCE credibility (i.e., where the data came from). The five-step ladder from R3.0C is the CONCLUSION credibility (the strength of a downstream claim). D1 keeps both vocabularies cleanly separated so a heuristic source cannot be re-labelled as a measured conclusion.*

Two practical consequences of the two-vocabulary split:

1. In the R3.0D evidence layer, `'synthetic'` is a value in **two separate enums on the same EvidenceNode**: the 4-value `EVIDENCE_CREDIBILITY` rung (`measured`/`derived`/`heuristic`/`synthetic`) and the 3-value `PROVENANCE` field (`synthetic`/`real`/`unverified`) — they coexist as two distinct keys (`credibility`, `provenance`) on the node, not one flag wearing two names. The synthetic-honesty enforcement constraint is keyed specifically on **`provenance === 'synthetic'`**, not on `credibility`: `contracts/r3.0d/evidence-node-contract.js` checks `if (n.provenance === 'synthetic') { ... require LIMITATION_SYNTHETIC_ONLY ... }`. An evidence node sourced from the Demo Analysis Case is tagged `provenance: "synthetic"`, and that triggers the requirement to carry the `LIMITATION_SYNTHETIC_ONLY` marker among its limitations.
2. In R3.0C and at the R3.0D *conclusion* layer (see below), **`synthetic` is a provenance value**, not a rung. The same word names different things at different layers — and the validators at each boundary enforce the layer-correct enum.

### R3.0D `CONCLUSION_CREDIBILITY` — conclusion-credibility ladder (6 values)

Defined alongside `EVIDENCE_CREDIBILITY` in `contracts/r3.0d/credibility-contract.js`.

```
CONCLUSION_CREDIBILITY = ["Physics", "Model", "Measured", "Derived", "Heuristic", "Unavailable"]
```

Identical in members and ordering to R3.0C's `CREDIBILITY_LADDER`. The R3.0D contract uses it for the *strength of a downstream claim* — a hypothesis (`contracts/r3.0d/hypothesis-contract.js`) and the Engineer Brief (`contracts/r3.0d/engineer-brief-contract.js`) both carry a `credibility` field from this enum — separately from the evidence-layer ladder that names *where the data came from*. The R3.0E outcome class is **not** one of these: the Outcome object (`contracts/r3.0e/outcome-contract.js`) has no `credibility` field at all; the "Heuristic" rung assigned to Outcome Classification elsewhere in this document is a documentation-level classification of the producer stage, not a literal field the classifier emits (see `docs/r3-experiment-loop.md`). The split is what the D1 contract calls "cleanly separated so a heuristic source cannot be re-labelled as a measured conclusion."

### Confidence at D1: closed-state enum only, no numeric value

R3.0D's confidence at the **contract layer (D1)** is unusually strict: `CONFIDENCE_STATES` is the closed enum `["unresolved", "not_computed"]`, with the contract comment verbatim: *Confidence state at D1 — closed enum. There is NO numeric `value` field allowed at D1.* The discipline comment elaborates: *A caller CANNOT directly supply a numeric confidence at D1. Confidence is either: (a) UNRESOLVED — explicit `{ state: 'unresolved' }` marker, OR (b) NOT_COMPUTED — explicit `{ state: 'not_computed' }` marker.* `validateConfidenceShape(c)` therefore enforces a closed-key plain object whose only allowed own key is `state`; numeric `value`, `score`, `numeric`, or `probability` keys at the **D1 caller layer** are rejected.

The numeric confidence is computed **inside the R3.0D engines** — not at the D1 caller layer — under a strict D1 → D3 → D4 split:

| Layer | Producer | What it emits / accepts |
| --- | --- | --- |
| D1 | Caller-supplied input | Closed-state only: `{ state: 'unresolved' }` or `{ state: 'not_computed' }`. Numeric fields rejected. |
| **D3 — HypothesisEngine** | `renderer/js/r3-0d-hypothesis-engine.js` | Computes the numeric `confidenceScore` deterministically and emits `{ state, score }` on each Hypothesis it produces. This is the **first authoritative numeric confidence value** in the R3.0D pipeline. |
| **D4 — PriorityEngine** | `renderer/js/r3-0d-priority-engine.js` | Validates and consumes the D3 export (`verifyAuthoritativeHypothesisSet`); applies its prioritisation rules; emits a PrioritySet that references D3's confidences. D4 does not produce a new numeric confidence; it consumes D3's. |

The D1 contract module's own header comment that names "D4_PRIORITY_ENGINE" as the numeric producer is stale relative to the shipped D3/D4 split — D3 is where the numeric `confidenceScore` is actually computed. Any cap a downstream engine applies (e.g., a heuristic-source cap) lives in that engine's module, not in this contract layer.

### Availability at D1: closed evidence-graph enum

```
AVAILABILITY = ["available", "unavailable", "partial", "unconfirmed"]
```

Contract comment verbatim: *Availability enum — used by the evidence graph (whether a metric / channel is currently usable).* The validator (`validateAvailability`) rejects out-of-enum values with `EVIDENCE_OBSERVATION_INVALID`.

### Why the enums are closed

Each enum is **closed**: a producer whose output cannot fit one of the listed values **must emit `Unavailable`** at the conclusion layer (with a fail-closed reason) or fail its evidence validator (with an `EVIDENCE_*_INVALID` reason code). There is no "estimated", no "approximate", no "best-effort" path. The R3.0C and R3.0D validators are both `buildBlockedResult`-shaped: a failing input does not return a degraded value, it returns `{ valid: false, reasonCodes: [...] }` and the consumer fails closed.

---

## How values move between the enums

A value's rung at the evidence layer (`EVIDENCE_CREDIBILITY`) and its rung at the conclusion layer (`CONCLUSION_CREDIBILITY`) are **separately attested by separately validated emissions**. There is no implicit promotion path between them. The decision engine is what binds an evidence-layer rung to a conclusion-layer rung, and it does so under the authoritative-only-inputs rule (R3.0D's closure-private WeakSet verification): conclusions are admitted only when their evidence inputs were verified to originate from the live evidence-graph producer in the current run.

Two patterns this enables:

- **Evidence `measured` → Conclusion `Measured`** is the canonical "honest pass-through" path: the evidence-graph producer attested a `measured` evidence node on confirmed, calibrated channels in a same-case + same-session window; the conclusion producer consumed it through the WeakSet verifier and emitted a `Measured` conclusion. The synthetic-honesty constraint did not fire because the evidence rung was not `synthetic`.
- **Evidence `provenance: "synthetic"` → Conclusion at any rung, but with `LIMITATION_SYNTHETIC_ONLY`** is the Demo Analysis Case path: an evidence node carries `provenance: "synthetic"` plus the `LIMITATION_SYNTHETIC_ONLY` marker; any conclusion built on it carries the limitation forward and may never be presented as a real-world claim. The contract validators at both layers refuse to forget the synthetic origin.

A value emitted on a prior run, persisted, and rehydrated on a later run does **not** retain runtime authority. The R3.0E stores module header makes this explicit, verbatim: *Persisted records carry NO runtime authority (WeakSet identity is closure-private and cannot survive reload). Rehydration consumers MUST re-validate via the E1 contracts before treating values as authoritative.*

---

## R3.0C comparison authority: same-case + same-session, explicit reference only

R3.0C's comparison-authority contract carries the full six-rung `CREDIBILITY_LADDER` and validates caller-supplied credibility metadata in a single direction: it accepts a producer's emission and returns a frozen pass-through, or it returns a blocked result. The contract has no producer of its own — it is the authority gate between the comparison-authority pipeline and downstream consumers.

The comparison authority itself is structurally constrained by three rules that the contract validator presupposes:

1. **Same-case + same-session only.** Comparison and reference laps must both belong to the same Analysis Case and the same session of that case. Both checks are enforced by R3.0C's reference-selection module (`renderer/js/r3-0c-reference-selection.js`), which rejects a caseId mismatch with `CROSS_CASE_COMPARISON_UNSUPPORTED` and a sessionId mismatch with `CROSS_SESSION_COMPARISON_UNSUPPORTED` — `case-store` itself (R3.0B CRUD/import/export) has no comparison gate of its own.
2. **Reference lap = explicit user selection.** There is no `fastest_valid` auto-pick, no `median` auto-pick, no `best_sector_composite` auto-pick. The user names the reference lap by its identity in the current session.
3. **Delta = comparison − reference** with a fixed sign convention. The delta metric set is allowlisted (the six allowlisted delta metrics live in the R3.0C delta-metrics module). Segmentation is deterministic over the normalized-distance grid. Pairing is deterministic over the corner-identity assignment. Every emission carries `derivedHere: false` because the contract is a pass-through, but the upstream delta producer carries `Derived` on the rung field and `real` (or `synthetic`, preserved) on the provenance field.

When any of those preconditions fails, the comparison-authority pipeline emits an `Unavailable` envelope with one of the 55+ R3.0C reason codes. The blocked envelope still satisfies `REQUIRED_FIELDS` (the contract refuses to accept a missing `limitations` array even when blocked) and the consumer fails closed.

---

## R3.0D Engineer Brief: authoritative-only inputs, no LLM, no causation, no driver blame

R3.0D's Engineer Brief is the user-facing surface of the decision engine. `buildEngineerBrief` (`renderer/js/r3-0d-engineer-brief.js`) takes exactly two authoritative-only inputs: `{ hypothesisSet, prioritySet }`, each verified through the closure-private WeakSet pattern. (The applied-change record and controlled-variables record belong to a different stage — the R3.0E E3 outcome classifier — not to D5.) The brief is **deterministic** and contains **no runtime LLM call**: there is no model invocation, no external network call, no probabilistic sampling. Every sentence the brief surfaces is produced by a closed-form composition of the hypothesis/priority inputs through R3.0D's emit modules.

Three substantive constraints the brief honours on every emission:

- **No causation.** A correlation in the evidence graph is not promoted to a causal claim. The hypothesis engine surfaces directional and consistency observations; it does not assert "X caused Y." This is enforced structurally, not by a standing "no-causation" limitation marker: `contracts/r3.0d/engineer-brief-contract.js` and `recommendation-contract.js` scan every i18n-key string for causal-overclaim wording and reject the whole record with `HYPOTHESIS_CAUSAL_OVERCLAIM` if any is found — there is no `LIMITATION_NO_CAUSAL_CLAIM` code anywhere in the codebase.
- **No driver blame.** Driver-input observations are reported as driver observations and never re-framed as coaching directives. The Engineer Brief is a vehicle-and-setup surface; a coaching directive requires an entirely separate authority chain (which R3.0F does not enable).
- **Synthetic stays synthetic.** Evidence nodes with `provenance: "synthetic"` arrive carrying `LIMITATION_SYNTHETIC_ONLY` and the brief preserves the marker on every conclusion it builds from them. There is no "demo mode" that strips synthetic limitations.

The Engineer Brief also obeys the `limitations[]` propagation rule: `renderer/js/r3-0d-engineer-brief.js` builds `limitations` as the deduplicated union of `hypothesisSet.limitations` and every individual hypothesis's `limitations` — no brief-level limitation is added on top of that union, and there is no standing no-causation marker added to it (no-causation is enforced structurally at the contract layer, as described above, not via a limitation code).

---

## R3.0E stores: only the timeline is contractually append-only

The R3.0E stores live in `renderer/js/r3-0e-stores.js` (UMD global `R3_0E_Stores`). The module header lists four persistence semantics, verbatim:

- *Every payload validated by its E1 contract BEFORE write (in `compute()`).*
- *Every payload re-validated on read; future-schemaVersion → fail-closed reject.*
- *Timeline events append-only; duplicate eventId rejected; out-of-order timestamp rejected.*
- *Persisted records carry NO runtime authority (WeakSet identity is closure-private and cannot survive reload). Rehydration consumers MUST re-validate via the E1 contracts before treating values as authoritative.*

The four producer stores are distinct in their mutation discipline. Earlier drafts of this document spoke of "experiment, outcome, follow-up, and timeline stores all append-only with monotonic createdAt; no entry is mutated or reordered after emission." That is not what the code does. The accurate picture:

### Timeline store — true append-only (the only store with that contract)

`createTimelineStore(backend)` exposes `getTimeline(caseId)` and `appendEvent(caseId, event)`. The append path uses the non-mutating pattern `var nextEvents = existing.events.concat([event])` and enforces, on every append, the reason codes:

- `R3_0E_TIMELINE_FUTURE_SCHEMA` on schemaVersion overflow,
- `R3_0E_TIMELINE_DUPLICATE_EVENT` if `eventId` already exists in `events[]`,
- `R3_0E_TIMELINE_OUT_OF_ORDER` if a new `createdAt` is earlier than the previous event's `createdAt` (strict monotonic by createdAt),
- `R3_0E_TIMELINE_INVALID` on contract validation failure.

The E4 service `renderer/js/r3-0e-followup-timeline.js` makes the contract even stricter for the production entry points (`createFollowUpLink`, `appendTimelineEvent`, `projectTimeline`, `listFollowUpLinksForParent`). Its header reads verbatim:

- *Append-only timeline. Existing events are NEVER overwritten. Corrections are expressed as NEW events whose params reference the prior eventId.*
- *Timeline event eventIds are deterministic: hash(caseId, sequence, kind, i18nKey).*
- *Timeline strictly monotonic by createdAt; duplicate eventId rejected; clock rollback yielding a timestamp earlier than the previous event → reject.*
- *Every link / event / projection is deep-frozen and registered in a closure-private WeakSet. The exported verifiers check identity + structural witnesses.*
- *Clock invoked AT MOST ONCE per call, AFTER authority and contract gates. Forged input → zero clock invocations.*

### Experiment store — not append-only; supports `update()` and `remove()`

`createExperimentStore(backend)` exposes `create(rec)`, `update(rec)`, `get(experimentId)`, `list()`, and `remove(experimentId)`. Existing experiment definitions can be revised in place and deleted entirely. The store does enforce identity discipline and stale-write protection:

- `create()` rejects `R3_0E_EXPERIMENT_ID_COLLISION` if the key already exists, and rejects records whose `schemaVersion` does not match the contract.
- `update()` rejects `R3_0E_EXPERIMENT_MISSING` (no prior record), `R3_0E_EXPERIMENT_FUTURE_SCHEMA` (schemaVersion overflow), and `R3_0E_EXPERIMENT_STALE_WRITE` (the caller's `createdAt` does not match the persisted record). On success it writes a fresh `updatedAt` from the clock.
- `remove()` deletes both the `EXPERIMENTS` and `EXPERIMENTS_INDEX` entries.

The mutation discipline is therefore "identity-stable, schema-checked, stale-write-protected" — not append-only.

### Outcome store — no exposed mutator, but no contractual append-only assertion either

`createOutcomeStore(backend)` exposes `create(rec)`, `get(outcomeId)`, and `listForExperiment(experimentId)`. There is no `update` and no `remove`. The store is effectively append-only by the absence of mutating verbs, but the code does not declare append-only as a contract (no equivalent of the timeline's "append-only" header line), so the discipline is structural rather than asserted. `create()` rejects `R3_0E_OUTCOME_ID_COLLISION` on duplicate `outcomeId`.

### Follow-up link store — mutable via `markParentStatus()`

`createFollowUpLinkStore(backend)` exposes `create(link)`, `get(linkId)`, `listForParent(parentCaseId)`, and `markParentStatus(linkId, newStatus)`. The `markParentStatus()` method **mutates `parentStatus` on existing records** — it reads the current record, builds `Object.assign({}, cur, { parentStatus: newStatus })`, and writes the result back to the same key. Valid statuses are `['present', 'archived', 'deleted']`. `create()` rejects `R3_0E_LINK_ID_COLLISION` on duplicate `linkId` and updates the reverse index `r3_0e_followupLinksByCase` keyed by `parentCaseId`. `listForParent()` additionally closes two earlier Codex findings: (E2-R1-02) every fetched link is re-validated against its contract before being returned; (E2-R2-01) each validated link's `parentCaseId` must match the caller-supplied `parentCaseId`, otherwise the entry is rejected as corruption.

### Why the distinction matters

The append-only timeline is the audit substrate: every event's provenance is fixed at emit time, and a later observation of the same physical phenomenon produces an additional event with its own envelope rather than rewriting the prior one. Experiment definitions, by contrast, are editable artefacts in the user's working set — they are not history. The outcome store sits between the two: structurally history-shaped, but without the explicit contract gate the timeline carries. The follow-up link store's `markParentStatus` exists so a follow-up case's parent can be marked archived or deleted without rewriting the link itself; the link record's identity and `parentCaseId` are stable, the lifecycle marker is not.

Persistence-layer credibility discipline is independent of the store's mutation discipline. Every payload is validated by its E1 contract on write **and** on read; future-schemaVersion records fail closed on read; rehydrated values must be re-validated by the E1 contract before any consumer treats them as authoritative. The closure-private WeakSet identity that the runtime uses to recognise an authoritative emission does not survive reload, by design.

The R3.0E outcome classifier obeys the authoritative-only-inputs rule inherited from R3.0D: outcomes are classified from a closed five-key input wrapper — the Experiment record, the applied-change audit envelope, the follow-up's same-case/same-session/explicit-reference attestation, the observation (direction/magnitude/evidence ids), and the observed control variables — never from a live evidence-graph read or a caller-supplied outcome label. There is no separate credibility-floor gate in this classifier. An `invalid_comparison` outcome is emitted whenever the follow-up's attestation is not legitimate (cross-case, cross-session, no explicit reference, or low comparability), taking precedence over every other class. A `confirmed` outcome requires same-case, same-session, explicit reference, every declared control variable observed and in range, and the observed direction/magnitude to match the experiment's prediction — and even then it is `confirmed for this experiment's measurement window`, not a generalised vehicle claim. See `docs/r3-experiment-loop.md` "Outcome classes" for the full six-class enum and precedence order.

---

## R3.0F F1 migration: never fabricates attestation

R3.0F F1 is the schema-migration engine. It migrates each persisted store's records toward that store's integer `targetVersion` (currently `1` for every R3.0B/E store; per-store migrator steps live under `scripts/migrators/`). F1 emits **no credibility rung of its own**: it is not a producer that classifies anything on the ladder. The transform is **deterministic by mandate** — given the same input record byte-for-byte, the migrator's steps produce the same output record byte-for-byte. The migrator steps consume no clock, no random source, and no environment; the surrounding engine uses an injected stamp/clock only to write its own journal and state metadata records (not the migrated payloads). The underlying credibility envelope of each migrated record is preserved verbatim — the rung, provenance, limitations[], blockedReasons, and evidence references travel through unchanged.

The migration engine's central rule on credibility is that it **never fabricates attestation**. A v1.3 input record that lacks producer attestation fields does not gain them across the migration: the migrator does not invent a `producerId`, a `derivedHere` flag, a calibration binding, or a synthetic-vs-real provenance. Worse, an input record that arrives **carrying** attestation sentinel fields the migrator does not consider trustworthy is refused outright with the reason code `PRODUCER_ATTESTATION_REFUSED`. The migrator does not "best-effort coerce" attested-looking fields into a valid attestation shape; it refuses the record and surfaces the reason.

Two practical consequences:

1. The synthetic flag (in whichever field carries it) is preserved across the v1.3 → v1.4.0 transform. A `provenance: "synthetic"` value at R3.0C, or an R3.0D evidence node's `provenance: "synthetic"` field (the field the synthetic-honesty constraint is actually keyed on — see above), retains its tag and its `LIMITATION_SYNTHETIC_ONLY` marker after migration.
2. The `limitations[]` field is preserved verbatim. The migrator does not collapse, dedupe, or rewrite limitation codes — it carries them across in their stable-code form.

---

## R3.0F F2 end-to-end flows: nine production flows under `tests/e2e/`

R3.0F F2 is the end-to-end verification surface. Nine flows live under `tests/e2e/flow-{01..09}-*.test.js`. The flows are **heterogeneous** — each exercises a specific production path rather than all running the same R3.0B→C→D→E traversal on the same fixture. Concretely:

| Flow | Surface exercised |
| --- | --- |
| `flow-01-new-user.test.js` | Empty-state baseline on a fresh `MemoryBackend`; F1 idempotent skip on an empty backend. |
| `flow-02-real-telemetry.test.js` | Session-store roundtrip; raw telemetry never lands in the case bundle. |
| `flow-03-measured.test.js` | Credibility rung exact `measured`; limitations[] preserved end-to-end; closed-enum membership. |
| `flow-04-reference-lap.test.js` | R3.0C `selectReference` negative paths (forbidden auto modes, missing selection, forged user-selection, stale candidate lap). |
| `flow-05-vre.test.js` | R3.0D `buildEngineerBrief` authority gate; forged hypothesisSet rejected with `HYPOTHESIS_AUTHORITY_FORGED`. |
| `flow-06-setup-experiment.test.js` | R3.0E experiment create + timeline append; out-of-order timeline rejected. |
| `flow-07-driver-experiment.test.js` | Driver instruction + follow-up Case Link; cross-case + cross-session comparison forbidden; `assertNoStaleCaseRef` invoked. |
| `flow-08-export-import.test.js` | Bundle export with no raw telemetry; `imported_summary` never promoted; F1 sees imported records as at-target; `assertNoStaleCaseRef` invoked. |
| `flow-09-electron-smoke.test.js` | Static Electron smoke — `package.json` devDeps declaration, `main.js` contextIsolation/nodeIntegration, `preload.js` contextBridge surface. |

What is asserted on the **flows that actually surface a producer emission with the honesty-contract envelope** (flows 03/04/05/08 — rung, provenance, limitations preserved through storage/migration/export) is that envelope on each emission. Flows 06 and 07 exercise the R3.0E experiment/follow-up-link surface (experiment creation, a directly-appended `outcome_classified` timeline event, a follow-up-link `create` attempt, and stale-case-reference checks) but do not themselves assert a producer's rung/provenance/limitations/blockers/evidenceRefs envelope — see `docs/r3-data-and-privacy.md`'s flow table for what each of the nine flows actually covers. The synthetic marker rides through anywhere a Demo Analysis Case input was used; F1 sees that input verbatim and never promotes it. Same-case + same-session is asserted by attempting forbidden cross-boundaries and being rejected by the R3.0C contract.

---

## R3.0F F3 hardening probes: six probes, 133 assertions

R3.0F F3 is the hardening surface. Six probes live under `tests/e2e/hardening-{01..06}-*.test.js`, totalling 133 assertions:

- **Electron boundary.** `contextIsolation`/`nodeIntegration` are explicitly set and never weakened; preload exposes only the minimal `contextBridge` surface; the renderer CSP is never weakened.
- **Storage failure.** `case-store.remove` requires explicit `confirm:true`; an atomic `backend.transact` failure leaves the source record completely unchanged (no partial write); an oversized record is rejected by the record-bytes cap.
- **No-stale-UI.** No viewmodel retains a stale case-id reference (across the full documented set of case-id-bearing fields, including R3.0C/D/E `caseAssociation` fields) after a Case/Session transition, verified against a real R3.0E experiment record's production shape.
- **Large library.** The case-store + F1 migration engine scale bounded-linear, not quadratic, as library size grows.
- **XSS.** The renderer never pipes user-supplied or case-derived text into `innerHTML` or `document.write`.
- **Supply-chain.** `package.json` declares only the known Electron/electron-builder dependencies; no production renderer module pulls a bare third-party `require()`; no untrusted script references; no committed secrets/`.env` files.

These six probes do not exercise the closure-private WeakSet producer-attestation pattern, the structured-clone-only firewall, or `PRODUCER_ATTESTATION_REFUSED` on the migration path — those defences are real (see "Migration boundary" and the R3.0D/E sections of `docs/r3-experiment-loop.md`), but they are verified by their own phase's tests (e.g. `tests/r3.0e-outcome-classifier.test.js`'s WeakSet producer-attestation checks, `tests/r3.0f-migration-engine.test.js`'s `PRODUCER_ATTESTATION_REFUSED` checks), not by the F3 hardening-`{01..06}` files.

---

## Cross-case + cross-session forbidden propagation

R3.0 forbids three specific propagations of credibility-tagged values, all of which would, in different ways, launder a value's origin and break the honesty contract. The forbidden propagations are enforced by the producers themselves, not by convention.

**1. Cross-case propagation is forbidden.** An R3.0 Analysis Case is the unit of evidence boundary. A value emitted in Case A's session may not be consumed as evidence by Case B's producers, regardless of how similar the cases look on the surface. R3.0E's experiment loop is the most prominent enforcer: a follow-up case may *reference* a prior case as context, but its outcome classifier, timeline, and experiment store never aggregate values from a different case into authoritative inputs. The decision engine's evidence-graph (R3.0D) is keyed on the case identity; an evidence node from a different case identity fails the closure-private verification and is rejected.

**2. Cross-session propagation within a case is forbidden for comparison and decision authority.** R3.0C comparison is **same-case + same-session only**. A reference lap from a prior session — even from the same case, even from the same track, even from the same vehicle setup — is **not** an admissible reference. The reference lap must be **explicitly selected by the user** from the current session's laps; there is no fastest_valid auto-pick, no median auto-pick, no best_sector_composite auto-pick. R3.0D's hypothesis engine respects the same boundary: hypotheses are formed on evidence drawn from the current session's authoritative graph. Persistent stores (R3.0B) preserve cross-session history for the user to read; they do not feed it back into producer authority.

**3. Cross-rung promotion is forbidden.** A transform may consume an input and emit a new value at the input's rung or lower; it may never emit at a higher rung. At the R3.0D evidence layer the rule is enforced by the closed `EVIDENCE_CREDIBILITY` enum and the synthetic-honesty constraint (a `synthetic` evidence node never loses its `LIMITATION_SYNTHETIC_ONLY` marker). At the R3.0D conclusion layer the rule is enforced by the closed `CONCLUSION_CREDIBILITY` enum and the WeakSet identity check (a conclusion is admitted only when its evidence inputs were verified to originate from the live evidence-graph producer in the current run). At the R3.0C comparison layer the rule is enforced by the pass-through normalizer (which derives nothing and refuses to upgrade what the caller supplied).

The combined effect of the three forbidden propagations is that **the credibility envelope on a value is anchored to a specific case, a specific session, a specific producer, and a specific layer's enum**, and it cannot drift. A user comparing two runs across sessions is doing that comparison as a user action, with the surface labelling each value with its own envelope; the product never silently aggregates across the boundary and presents the result as a single producer's emission.

---

## The honesty-contract envelope

Every R3.0 producer emission — at every rung in whichever enum applies, including the `Unavailable` / blocked path — carries a `limitations[]` field. The field is an **array of machine-readable limitation codes** that name the honest scope caveats the producer attaches to the value. The field is always present (never absent/undefined), but it is **not** guaranteed non-empty on a clean emission: the R3.0E outcome classifier, for example, initializes `limitations = []` and only appends entries for specific conditions (invalid comparison, confounded control variables, data-quality issues) — a golden-path `confirmed` outcome with no caveats legitimately carries an empty `limitations[]`, not a synthesized baseline caveat. Some other producers do attach a standing scope caveat even on a clean run (e.g. "kinematic, confounded; not a professional-grade verdict" on a corner-delta computed from raw telemetry) — but that is a property of that specific producer's domain, not a blanket guarantee that `limitations[]` is never empty across all producers.

Rules on `limitations[]`:

1. **Append-only propagation across emissions.** A consumer of an emission appends its own limitations to the producer's; it never removes a producer's limitation. R3.0D's Engineer Brief carries the union of all upstream `limitations[]` lists from every evidence input that fed into the brief.
2. **Stable codes.** Each limitation is a stable identifier (an enum value, not a free-form string), so that surfaces, exports, and migrations can translate them without re-parsing English. The catalogs of stable codes live alongside each producer module (R3.0C delta-metrics codes; R3.0D hypothesis-engine and Engineer Brief codes; R3.0E outcome-classifier and follow-up codes).
3. **i18n via lookup, not via emission.** Producers emit codes; surfaces resolve codes to user-facing strings via the locale layer. A producer never emits a localised limitation string directly.
4. **Crosses every boundary.** `limitations[]` survives R3.0B persistence (it is part of the frozen v1.4.0 schema), R3.0C export, R3.0D evidence-graph traversal, the R3.0E Outcome object, and R3.0F migration. There is no boundary at which it is dropped. (The R3.0E Timeline's events have no `limitations[]` field of their own — `contracts/r3.0e/case-timeline-contract.js`'s event shape is `{eventId, kind, createdAt, i18nKey, params}` — so there is nothing to "survive" a timeline append; an outcome's limitations live on the Outcome object, not on the timeline event that references it.)
5. **No "limitations cleared" event.** A limitation is not a state; it is a fact about how the value was produced. Subsequent runs can produce new values with different limitations, but no run "clears" a prior value's limitations.

`limitations[]` is the one field present on essentially every conclusion. The fail-closed-reason, evidence-reference, and next-validation-step concepts also exist, but their exact field names are **not** universal — there is no single `blockedReasons[]`/`evidenceRefs[]`/`nextValidationStep` triple shared by every producer. Concretely: R3.0C's credibility contract uses `blockedReasons[]`; the R3.0D Engineer Brief uses `cannotConcludeReasonCodes[]` for the fail-closed-reason concept, `evidenceSummary[]` (an array of `{nodeId, i18nKey, params}`) for the evidence-reference concept, and `nextValidationAction` (`{actionId, kind, i18nKey} | null`) for the next-validation-step concept; the R3.0C C6 export payload uses `blockers[]` and `nextValidationAction`. The R3.0E Outcome object has none of these fields — no `credibility`, `confidence`, `provenance`, or next-validation field at all (see `docs/r3-experiment-loop.md` for its real 13-key shape). "Honesty-contract envelope" describes a recurring pattern across producers, not one fixed field-name contract.

---

## Summary: how to read a credibility-tagged value correctly

When an R3.0 surface renders a value, read it as a four-tuple plus the envelope, with the layer made explicit:

- **Which enum applies.** R3.0C comparison-authority values draw from the six-value `CREDIBILITY_LADDER`. R3.0D evidence nodes draw from the four-value `EVIDENCE_CREDIBILITY` (for their `credibility` key). R3.0D conclusions (Engineer Brief) draw from the six-value `CONCLUSION_CREDIBILITY`. Separately, `'synthetic'` is also a value in the three-value `PROVENANCE` enum (`synthetic`/`real`/`unverified`), which exists as its own `provenance` key on **both** evidence nodes and the Engineer Brief — `credibility` and `provenance` are two distinct keys at both layers, not one name that changes meaning per layer. The synthetic-honesty enforcement constraint is specifically keyed on the `provenance` field, at whichever layer it appears.
- **Provenance** (`real` / `synthetic` / `unverified`, at R3.0C and at the R3.0D conclusion layer) — what kind of data the value originated from. Synthetic origin is never stripped by any downstream transform and carries `LIMITATION_SYNTHETIC_ONLY` through the chain.
- **Limitations** — the honest caveats the producer attached, as stable codes.
- **Blockers** — present only when the conclusion rung is `Unavailable`; the machine-readable reason the capability failed closed on this run.
- **Evidence refs** — what raw inputs the value is anchored in.
- **Next validation step** — what the user would have to do to upgrade the claim's credibility.

A rung is **not** a trust score. It is a structural claim about how the value came to exist, drawn from a closed contract enum. The ladder in `credibility-and-trust.md` and the contract modules `contracts/r3.0c/credibility-contract.js` and `contracts/r3.0d/credibility-contract.js` together pin down what each rung in each enum permits a producer to claim and — more importantly — what it permits no one, downstream or upstream, to assume on the producer's behalf.

Fail-closed is the default. Authority is re-derived, not presented. Producer attestation is verified, not trusted. The synthetic marker stays attached at whichever layer it was applied. Cross-case and cross-session never propagate authority. These five rules, applied at every R3.0 producer boundary, are what the R3.0 credibility model amounts to.
