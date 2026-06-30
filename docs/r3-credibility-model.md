# R3.0 Credibility Model

This document is the R3.0-specific extension of [`docs/credibility-and-trust.md`](./credibility-and-trust.md). It does not replace the ladder defined there; it pins down the **closed-rung enum** that every R3.0 producer must emit, the **conditions under which each rung may be granted**, what each rung **guarantees and explicitly does NOT guarantee**, and the governance rules — producer attestation, fail-closed defaults, cross-case + cross-session forbidden propagation — that prevent a rung from being upgraded by anything other than the producer that originally derived it.

The credibility ladder defined in `credibility-and-trust.md` (Physics > Model > Measured > Derived > Heuristic > Unavailable) is the higher-level taxonomy and remains the user-facing labelling throughout R3.0. R3.0 producers — case-store (R3.0B), comparison authority (R3.0C), decision engine (R3.0D), experiment loop (R3.0E), and integrated delivery (R3.0F) — emit values tagged with the closed-rung enum below, which maps directly onto the ladder rungs the producer is authorised to claim. The full ladder Physics > Model > Measured > Derived > Heuristic > Unavailable remains the user-facing taxonomy; the enum is the machine-level tag the producers emit.

Nothing in this document permits a downstream consumer to **upgrade** a rung. A rung may only be **demoted** to `Unavailable` (blocked, with a reason) when a quality gate fails. Upgrade is structurally impossible by the producer-attestation contract: the producer that derived the value is the only authority for its rung, and that producer's attestation is verified, not trusted.

---

## The closed rung enum: measured / derived / heuristic, plus the synthetic provenance flag

Every value an R3.0 producer emits carries a `credibility` field whose value is drawn from a **closed runtime enum of exactly three rungs**, and a separate `provenance` flag that may carry a `synthetic` tag travelling alongside the rung. The runtime enum and the provenance flag are independent fields on the emission envelope; together with `limitations[]`, `blockers[]`, `evidenceRefs[]`, and `nextValidationStep` they form the honesty-contract envelope mandatory on every R3.0 emission.

| Rung         | Ladder mapping                    | Producer authority                                                                                                                  |
|--------------|-----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| `measured`   | Measured (or Physics if closed-form on confirmed inputs) | A producer that consumed **real, confirmed, calibration-bound telemetry** and produced a magnitude.                                  |
| `derived`    | Derived                           | A producer that applied a **deterministic transform** to authoritative inputs whose rungs were already established.                  |
| `heuristic`  | Heuristic                         | A producer that emitted a **rule-of-thumb observation** — directional, bounded, never magnitude.                                     |

The full ladder Physics > Model > Measured > Derived > Heuristic > Unavailable remains the user-facing taxonomy. At the runtime-enum level, R3.0 producers collapse `Physics` and `Model` into `measured` (when the closed-form physical relation was evaluated on confirmed-measured inputs) or `derived` (when the model prediction is a deterministic transform of inputs) — they do not get their own runtime enum value because R3.0 producers never need to distinguish them at the credibility-field level. The ladder names remain the user-facing labels; the enum is the machine-level tag.

The enum is **closed**: a producer that cannot fit its output into one of these three rungs **must emit `Unavailable`** (the higher-level ladder rung, surfaced as a blocked capability with a fail-closed reason). There is no fourth rung, no "estimated", no "approximate", no "best-effort".

Alongside the rung, the **`provenance` flag** carries one of `real` / `synthetic` / `unverified`. The `synthetic` provenance tag is **not a rung** — it is an off-ladder provenance flag that travels alongside whichever rung the producer emits. A value derived from the Demo Analysis Case (the clean-room golden-path case shipped with the product) carries `provenance: "synthetic"` regardless of whether its rung is `measured`, `derived`, or `heuristic`, because the underlying data did not originate from a real measurement of the user's vehicle. The synthetic flag is the laundering-prevention mechanism: it never gets stripped by a downstream transform, and it forbids any consumer from claiming the value is a real-world result.

The enum is **monotonic on demotion only**. A pipeline step that consumes a `measured` input and applies a non-deterministic or calibration-loose transform must emit `heuristic` or `Unavailable` — it may **never** re-emit `measured`. A pipeline step that consumes a `provenance: "synthetic"` input emits a `provenance: "synthetic"` output; the synthetic flag travels through the entire chain. This is the no-laundering rule (see *Cross-case + cross-session forbidden propagation* below).

---

## measured: when, what calibration is required, what limitations apply

A producer may emit `credibility: "measured"` **only** when every one of the following gates is satisfied on the run that produced the value:

1. The underlying channel is **mapped and confirmed** in the active session's channel-map. A merely mapped channel is blocked. Confirmation is a user action, not an inference from presence.
2. The channel's **provenance is `real`** (machine-read from the source; not `synthetic` and not `unverified`). A value computed on a `provenance: "synthetic"` channel may still be rung-tagged but carries the synthetic flag forward; it does not produce a real-world `measured` magnitude.
3. The **timebase is monotonic and well-conditioned**: strictly increasing timestamps, sample density above the producer's per-capability floor, no gaps exceeding the producer's stated tolerance.
4. The required **calibration is present, valid, and bound to the active session + channel mapping**. A calibration imported under a different mapping or a different session is not transferable; it must be re-bound explicitly by the user. R3.0 carries no implicit cross-session calibration.
5. The window the value was computed over is **same-case + same-session** (see *Cross-case + cross-session forbidden propagation*). Aggregation across cases is forbidden. Aggregation across sessions within a case is forbidden.

If any gate fails, the producer emits `Unavailable` with a machine-readable reason code (one of the 55+ R3.0C reason codes, or its R3.0D/R3.0E equivalent — the reason-code catalogs live alongside each producer's module: `renderer/js/r3-0c-*.js` for comparison authority codes, `renderer/js/r3-0d-*.js` for decision-engine codes, and `renderer/js/r3-0e-*.js` for experiment-loop codes). The producer does **not** demote to `derived` or `heuristic` as a fallback — those rungs have their own input requirements that the failing run almost certainly does not satisfy. Silent demotion would launder a fail-closed condition into a soft answer, which violates the honesty contract.

**What `measured` guarantees**: the magnitude was produced by a calibration-bound transform of real telemetry on a monotonic timebase within a single same-case + same-session window. The producer attests to the calibration binding and the window boundary on every emission.

**What `measured` does NOT guarantee**:
- It is not a professional-grade verdict. It carries the standard handling-analysis confounds — tyre state, track state, driver input, sensor drift — that `credibility-and-trust.md` enumerates.
- It is not a vehicle characteristic. A measured magnitude in a corner is a *measurement on this run*; it does not generalise to other runs, other tyres, other track states, other drivers without the experiment loop (R3.0E) drawing that link explicitly.
- It is not a setup recommendation. A measured magnitude is evidence the decision engine (R3.0D) may consult; the recommendation, if any, is derived separately and may emit a lower rung.
- It is not a lap-time claim. R3.0 produces no lap-time gain quantities at any rung.

A specific named example: **measured K_us**. A measured K_us would only be emitted when (1) steering-angle channel confirmed, (2) road-wheel steering calibration imported and verified, (3) calibration bound to the active mapping + session, (4) yaw + lateral-acceleration + speed channels confirmed and monotonic, (5) same-case + same-session window — every condition satisfied. If any single condition fails, the producer emits `Unavailable` and the decision engine substitutes a `heuristic`-rung **directional tendency** observation — never a fabricated magnitude.

---

## derived: deterministic transform + what counts as deterministic

A producer may emit `credibility: "derived"` when its output is a **deterministic function of authoritative inputs whose rungs were already established by their respective producers**. "Deterministic" in R3.0 has a precise, narrow definition:

A transform is **deterministic** if and only if:

1. Given the same inputs, it produces the same output on every invocation, byte-equivalent. No timestamps in output. No `Date.now()` reads, no `Math.random()`, no environment reads, no clock drift, no I/O.
2. Its inputs are **authoritative**: they originated from a producer that emitted them with a rung already (`measured`, `derived`, or `heuristic`), and they passed the consumer's authority check. A caller-supplied `eligible: true` flag is **not** authoritative — eligibility is re-derived from raw evidence on every run (see *Authority, not presence* in `credibility-and-trust.md`).
3. The transform is a **closed-form composition** of arithmetic, comparison, indexing, and the producer's own pure helpers. It does **not** include a model run, a heuristic threshold, a tunable constant chosen at runtime, or any decision a human would call "judgement".
4. The output **does not exceed the rung floor of its lowest-rung input**. A transform consuming a `heuristic` input emits at most `heuristic`. A transform consuming a `provenance: "synthetic"` input emits a `provenance: "synthetic"` output at the same rung floor. The floor rule prevents upgrade by composition; the synthetic flag rule prevents laundering by composition.

R3.0C delta metrics are the canonical example. The delta sign convention is fixed: **delta = (comparison − reference)**. The delta metric set is allowlisted (the 6 allowlisted delta metrics live in the R3.0C delta-metrics module); the segmentation is deterministic over the normalized-distance grid; the pairing is deterministic over the corner-identity assignment. Every step is closed-form. Inputs are `measured` (real telemetry on confirmed channels with a same-case + same-session pair of laps **explicitly selected by the user** — there is no fastest_valid auto-pick, no median auto-pick, no best_sector_composite auto-pick). The delta-metric emission is therefore `derived`.

R3.0F migration outputs are another example. The v1.4.0 migration engine is deterministic by mandate — given the same input record byte-for-byte, it produces the same output record byte-for-byte. It consumes no clock, no random source, no environment. Its output rung is `derived` because the transform is closed-form over the R3.0B schema; the underlying values keep whatever rung they had pre-migration, and the synthetic flag (if any) is preserved across the v1.3 → v1.4.0 transform.

**What `derived` guarantees**: byte-equivalent reproducibility given the same inputs; rung-floor preservation; synthetic-flag preservation; producer attestation of determinism.

**What `derived` does NOT guarantee**:
- It is not a measurement. A derived value is a transform; if you want a magnitude tied to telemetry, look at the upstream `measured` input the transform consumed.
- It is not a vehicle fact. A derived corner-pair, a derived segmentation boundary, a derived delta — these are deterministic geometric/numeric facts about the inputs, not statements about the vehicle, the driver, or the setup.
- It is not a professional-grade verdict. The derivation is mechanical; it does no judgement.

---

## heuristic: rule-of-thumb + boundary

A producer may emit `credibility: "heuristic"` when its output is a **rule-of-thumb observation** — a directional, bounded statement that the producer can defend as informative without claiming magnitude, causation, or calibration. The boundary on `heuristic` is the strictest of the three rungs because it is the easiest to abuse.

Rules a `heuristic` emission must obey:

1. **Directional, never magnitude**. A `heuristic` emission may say "more understeer than reference" or "elevated steering corrections" or "front-bias trend"; it may **not** say "0.3 deg/g more understeer" or "12% more correction" or "0.4 N/mm stiffer". Any magnitude claim demands `measured` or `derived` rung and the gates that go with them.
2. **Bounded confidence**. R3.0D caps the confidence scalar on a heuristic observation at `medium` (verified against the R3.0D hypothesis-engine confidence-cap table; a heuristic observation cannot carry `high` confidence regardless of how strong the underlying signal looks). An `high`-confidence assertion would imply calibration-bounded magnitude, which is a different rung.
3. **Three-way separation**. A heuristic observation about driver input is **not** a vehicle characteristic and **not** a setup finding. The decision engine (R3.0D) will not promote a driver-behaviour heuristic to a vehicle hypothesis without multi-lap + multi-corner + measured-consistent + mapping-trusted + calibration-trusted evidence — and that evidence carries its own rung, not the heuristic's. R3.0D explicitly forbids driver-blame surfacing; a heuristic about driver input is reported as a driver observation, never as a coaching directive.
4. **Honest substitute role**. When `measured` is blocked, the honest substitute is the directional `heuristic`. The substitute is offered **with the blocker explicit**: the user sees that K_us is `Unavailable` because the calibration is missing, and that the directional tendency is offered in its place. The substitute does not replace the blocker; both are surfaced.
5. **No causation**. A heuristic correlates two observations or two windows. It does not assert that one caused the other. R3.0D explicitly enforces the no-causation rule on every hypothesis it raises, and a heuristic input cannot launder that constraint.

**What `heuristic` guarantees**: the producer has a defensible rule of thumb behind the emission, the rule is applied deterministically, the output is directional only, and the confidence is capped at `medium`.

**What `heuristic` does NOT guarantee**:
- It is not a vehicle fact. It is an observation.
- It is not a measured magnitude. Any UI surface that renders a `heuristic` value as a number with units is a bug in the surface, not in the producer.
- It is not a setup recommendation. The decision engine may consult heuristics, but it carries the consultation forward with the rung preserved.
- It is not exempt from driver-blame discipline. A heuristic about driver input is reported as a driver observation; it does **not** become a coaching directive without further authoritative-only inputs.

---

## The synthetic provenance flag: explicit synthetic-data tag, never promoted

The `provenance: "synthetic"` flag is **not a rung**; it is an off-ladder provenance tag whose entire purpose is to make the synthetic origin of a value **machine-readable and unforgeable** through the rest of the pipeline. A value with `provenance: "synthetic"` still carries one of the three runtime rungs (`measured`, `derived`, `heuristic`) describing how it was computed, but the synthetic flag rides alongside the rung and forbids any consumer from treating the value as a real-world measurement.

The R3.0 source of synthetic data is the **Demo Analysis Case** (the clean-room golden-path case shipped with the product), plus any fixture loaded under a `synthetic` provenance flag, plus any test-time payload the producer recognises as synthetic by its provenance — never by its shape and never by a caller's say-so.

Hard rules on the synthetic provenance flag:

1. **Synthetic is never stripped**. There is no transform — deterministic or otherwise — that can take a `provenance: "synthetic"` input and emit a `provenance: "real"` output. The output of any producer that consumes a synthetic input is also `provenance: "synthetic"`. This is the laundering-prevention rule and it has no exceptions.
2. **Synthetic travels with every value**. A field whose computation consumed even one synthetic input carries `provenance: "synthetic"` for its whole life in storage, in UI, in export, in migration output. R3.0F's migration engine preserves the synthetic flag across the v1.3 → v1.4.0 transform.
3. **Synthetic is visibly disclosed**. Every UI surface that renders a synthetic value renders the synthetic flag alongside it. There is no "demo mode" toggle that hides the flag. The Demo Analysis Case golden path is built from production code on synthetic inputs, and the synthetic flag rides along on every observation, hypothesis, brief, and experiment outcome in that path.
4. **Synthetic does not block production capabilities for its own consumers**, but it does forbid those consumers from claiming the value is real. A R3.0D hypothesis built on synthetic evidence is a valid hypothesis demonstration; it is not a vehicle claim about the user's actual car.
5. **Synthetic does not poison the producer's own real-data emissions**. Producers are pure modules; a synthetic invocation has no effect on a subsequent real-data invocation. The rule applies per-value, not per-producer.

**What the synthetic flag guarantees**: the value is machine-readable as synthetic, and that fact cannot be lost by any downstream transform or migration.

**What the synthetic flag does NOT guarantee**:
- It does not guarantee the underlying *model* is wrong. The Demo Analysis Case's model values may be physically reasonable; they are simply not measurements of a real vehicle.
- It does not protect a UI surface that ignores the flag from making a misleading claim. The flag is the contract; honouring it is the surface's responsibility.

---

## How limitations[] travels with every value

Every R3.0 producer emission — at every rung, including `Unavailable` — carries a `limitations[]` field. The field is an **array of machine-readable limitation codes** that name the honest scope caveats the producer attaches to the value. The field is never absent and never empty for non-trivial emissions: a clean run with no caveats still carries the producer's standard baseline limitations (e.g. "linear regime; not a full MBD", "kinematic, confounded; not a professional-grade verdict", "single representative session").

Rules on `limitations[]`:

1. **Append-only propagation**. A consumer of an emission appends its own limitations to the producer's; it never removes a producer's limitation. R3.0D's Engineer Brief carries the union of all upstream `limitations[]` lists from every evidence input that fed into the brief.
2. **Stable codes**. Each limitation is a stable identifier (an enum value, not a free-form string), so that surfaces, exports, and migrations can translate them without re-parsing English. The catalogs of stable codes live alongside each producer module (R3.0C delta-metrics codes; R3.0D hypothesis-engine and Engineer Brief codes; R3.0E outcome-classifier and follow-up codes).
3. **i18n via lookup, not via emission**. Producers emit codes; surfaces resolve codes to user-facing strings via the locale layer. A producer never emits a localised limitation string directly.
4. **Crosses every boundary**. `limitations[]` survives R3.0B persistence (it is part of the frozen v1.4.0 schema), R3.0C export, R3.0D evidence-graph traversal, R3.0E outcome and timeline append, and R3.0F migration. There is no boundary at which it is dropped.
5. **No "limitations cleared" event**. A limitation is not a state; it is a fact about how the value was produced. Subsequent runs can produce new values with different limitations, but no run "clears" a prior value's limitations.

The `limitations[]` field is paired with the `blockers[]` field (machine-readable fail-closed reasons when the rung is `Unavailable`), the `provenance` field (`real` / `synthetic` / `unverified`), the `evidenceRefs[]` field (identifiers of the raw inputs the value is anchored in), and the `nextValidationStep` field (what the user would have to do to upgrade the claim's credibility). Together these are the honesty-contract envelope, mandatory on every conclusion R3.0 surfaces.

---

## R3.0E append-only stores: experiment, outcome, follow-up, timeline

R3.0E builds the experiment loop on top of the comparison authority (R3.0C) and the decision engine (R3.0D). It comprises four producer modules — Experiment store, Outcome classifier, Follow-up store, Timeline store — plus the Experiment view-model that orchestrates the user's flow through them.

**R3.0E experiment, outcome, follow-up, and timeline stores are append-only with monotonic createdAt; no entry is mutated or reordered after emission.** Once an outcome is classified and persisted, its classification, its evidence refs, its reason codes, its `limitations[]`, and its `createdAt` timestamp are fixed in the store for the life of the record. A subsequent classification of the same underlying event produces a **new** entry with a later `createdAt`; it does not overwrite the prior one. The timeline likewise grows by append only — there is no reorder, no merge, no delete. The experiment store's experiment definitions are append-only at the experiment-identity grain; revisions create a new experiment, not a mutation of the existing one. Follow-up links are append-only and `caseAssociation` cross-case linkage is forbidden (a follow-up case may *reference* a prior case as context, but its outcome classifier, timeline, and experiment store never aggregate values from a different case into authoritative inputs).

The append-only discipline is what makes the R3.0E history auditable: every entry's provenance is fixed at emit time, every entry's credibility envelope is fixed at emit time, and a later observation of the same physical event produces an additional record with its own envelope rather than rewriting the prior one. The timeline UI surface reads the store in `createdAt` order and renders each entry with its own envelope (rung, provenance, limitations, blockers, evidence refs). No surface offers an "edit outcome" or "redate event" affordance — the only writes the store accepts are appends.

The R3.0E outcome classifier obeys the authoritative-only-inputs rule inherited from R3.0D: outcomes are classified from the live evidence graph plus the explicit reference-lap selection plus the applied-change record plus the controlled-variables record. Caller-supplied outcome labels are not accepted. An `invalid_comparison` outcome is emitted whenever the comparison authority for the experiment's measurement window is not legitimate, taking precedence over `inconclusive` or `confirmed`. A `confirmed` outcome requires same-case, same-session, explicit reference, controlled variables, and a minimum credibility floor on the underlying evidence — and even then it is `confirmed for this experiment's measurement window`, not a generalised vehicle claim.

---

## Producer attestation (R3.0F): no fabrication; live producer modules are the only authoritative source

R3.0F formalises the **producer-attestation defense**: the only authoritative source of an R3.0 value at runtime is the **live producer module** that derived it, executing in the current process, on the current load of the codebase. The migration engine, the case-store, the comparison-authority pipeline, the decision-engine pipeline, and the experiment-loop pipeline are each their own producer; each attests to the rung, the calibration binding, the determinism boundary, and the synthetic flag on every emission.

What producer attestation enforces:

1. **No fabrication**. A consumer may not synthesise a credibility-tagged value to "fill a gap". If the producer did not emit it on this run, it does not exist on this run. The R3.0D decision engine's authoritative-only-inputs rule (closure-private WeakSet verification) is the canonical implementation: hypotheses are admitted only when their inputs were verified to originate from the live evidence-graph producer in the current run.
2. **No replay**. A value emitted on a prior run, persisted, and rehydrated on a later run does not retain runtime authority — it retains its rung and its `limitations[]` as historical fact, but capability eligibility is **re-derived from raw evidence by the producers on the current run**. The shell, the view-model, and the migration engine never trust a stored `eligible: true` / `confirmed: true` flag.
3. **No cross-module forgery**. A producer's emission carries the producer's identity in its provenance trail. A different module cannot mint a value that claims to come from R3.0D's hypothesis engine, because the hypothesis engine's outputs are admitted only through its own closure-private verification path.
4. **Structured-clone-only firewall**. R3.0F's migration engine and storage backend pass values across persistence and IPC boundaries via structured clone only. Function references, prototypes, getters, and other live-object channels do not cross the firewall, so a stored value cannot smuggle in a fabricated producer identity on rehydrate.
5. **Trap-free JSON serializer**. R3.0F's JSON serializer rejects values whose serialization would require trapping an exotic property (proxy traps, throwing getters, non-enumerable side channels). A would-be-serialised value with a hostile shape is rejected at emit time, fail-closed, with a reason code — not silently coerced.
6. **Live module check at consumer boundaries**. R3.0F's integrated-delivery flows verify on every consumer boundary that the producer module loaded in the current process is the canonical one (path-identity + frozen-export check). A swapped or shadowed producer is treated as a corrupted-state fault and the affected capability fails closed.

The combined effect of producer attestation is that **no value's credibility tag can be upgraded by a downstream module, and no value can be fabricated by a downstream module to look like a producer's emission**. A consumer's only options are: pass the value through with its rung intact, demote it to `Unavailable` with a reason, or refuse it.

---

## Cross-case + cross-session forbidden propagation

R3.0 forbids three specific propagations of credibility-tagged values, all of which would, in different ways, launder a value's origin and break the honesty contract. The forbidden propagations are enforced by the producers themselves, not by convention.

**1. Cross-case propagation is forbidden.** An R3.0 Analysis Case is the unit of evidence boundary. A value emitted in Case A's session may not be consumed as evidence by Case B's producers, regardless of how similar the cases look on the surface. R3.0E's experiment loop is the most prominent enforcer: `caseAssociation` linkage across cases is explicitly forbidden — a follow-up case may *reference* a prior case as context, but its outcome classifier, timeline, and experiment store never aggregate values from a different case into authoritative inputs. The decision engine's evidence-graph (R3.0D) is keyed on the case identity; an evidence node from a different case identity fails the closure-private verification and is rejected.

**2. Cross-session propagation within a case is forbidden for comparison and decision authority.** R3.0C comparison is **same-case + same-session only**. A reference lap from a prior session — even from the same case, even from the same track, even from the same vehicle setup — is **not** an admissible reference. The reference lap must be **explicitly selected by the user** from the current session's laps; there is no fastest_valid auto-pick, no median auto-pick, no best_sector_composite auto-pick. R3.0D's hypothesis engine respects the same boundary: hypotheses are formed on evidence drawn from the current session's authoritative graph. Persistent stores (R3.0B) preserve cross-session history for the user to read; they do not feed it back into producer authority.

**3. Cross-rung promotion is forbidden.** Already covered above but worth repeating here as the third leg: no transform takes a `heuristic` to a `measured` or a `derived` to a `measured`, and the synthetic provenance flag is never stripped. The transform may consume the input and emit a new value at the input's rung or lower, with the synthetic flag preserved. There is no upgrade path; upgrade requires a fresh emission by the appropriate producer on fresh authoritative inputs.

The combined effect of the three forbidden propagations is that **the credibility envelope on a value is anchored to a specific case, a specific session, and a specific producer**, and it cannot drift. A user comparing two runs across sessions is doing that comparison as a user action, with the surface labelling each value with its own envelope; the product never silently aggregates across the boundary and presents the result as a single producer's emission.

---

## Summary: how to read a rung correctly

When an R3.0 surface renders a value, read it as a four-tuple plus the envelope:

- **Rung** (`measured` / `derived` / `heuristic`) — how the value was produced. The user-facing label may also include the higher ladder rungs (Physics / Model) when the producer's emission qualifies; the runtime enum is the three values above.
- **Provenance** (`real` / `synthetic` / `unverified`) — what kind of data the value originated from. The `synthetic` flag travels alongside the rung; it is never stripped.
- **Limitations** — the honest caveats the producer attached.
- **Blockers** — present only when the value is `Unavailable`; the machine-readable reason the capability failed closed on this run.
- **Evidence refs** — what raw inputs the value is anchored in.
- **Next validation step** — what the user would have to do to upgrade the value's rung.

A rung is **not** a trust score. It is a structural claim about how the value came to exist. The ladder (`credibility-and-trust.md`) and this document together pin down what each rung permits a producer to claim and — more importantly — what it permits no one, downstream or upstream, to assume on the producer's behalf.

Fail-closed is the default. Authority is re-derived, not presented. Producer attestation is verified, not trusted. The synthetic provenance flag stays attached. Cross-case and cross-session never propagate authority. These five rules, applied at every R3.0 producer boundary, are what the R3.0 credibility model amounts to.
