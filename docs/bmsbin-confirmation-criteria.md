# `.bmsbin` Confirmation Criteria & Structure Convergence (Phase 3D-0)

Scope notes. **This phase defines and implements the rules for upgrading a *hypothesis* to
*confirmed*. It does NOT decode telemetry, scale values, build canonical streams, overlay
model-vs-actual, or infer Kus.** Its deliverable is a decision: *which evidence is currently
strong enough to confirm, and which is not — and therefore why we are not confirming.*

The chain so far:
`catalog → probe candidate regions → raw series candidates → linking/scaling hypotheses → local reality check`.
The 65-file reality check (Phase 3C-1) showed the foundational signals are stable but the
structure has **not** converged (candidate-region count 19–107; raw series 1–2 vs 85 catalog
channels; 0/65 identities confirmed). Phase 3D-0 writes down, in code, exactly what "converged"
and "confirmed" must mean — so nothing downstream is ever built on an unproven assumption.

## What success is (and is not)
- **Success is NOT** "we read accy out of the file."
- **Success IS** the system can state, per criterion, whether the evidence is sufficient to
  upgrade to `confirmed`, and otherwise reports the precise blockers and the next evidence
  needed. On the current real-data summary it must honestly land on: *catalog confirmable,
  sample structure / channel identity / timebase / physical scaling NOT confirmed.*

## Red lines (do NOT cross)
- No physical scaling of values. No telemetry chart. No model-vs-actual overlay. No Kus. No
  setup recommendation from telemetry.
- `capabilities.physicalScaling`, `capabilities.handlingCorrelation`, `capabilities.timeSeries`
  stay `false`. A low- or even high-confidence *hypothesis* is never treated as decoded.
- A confirmed *catalog* or confirmed *structure* is **not** confirmed *telemetry*. Even the
  top status (`confirmed_structure`) does not assert channel identity, timebase, or scaling.

## The evaluator
`evaluateBmsConfirmationEvidence(bmsResult, probeReport, rawExtraction, linkingReport, opts)` →
a **confirmation decision report** (never decoded telemetry):

```
{ sourceType:'bmsbin', stage:'confirmation_criteria',
  status:'not_confirmed' | 'partially_confirmed' | 'confirmed_structure',
  evidence{}, scores{}, decisions{}, blockers[], nextEvidenceNeeded[],
  capabilities{ …, confirmationCriteria:true, timeSeries:false,
                physicalScaling:false, handlingCorrelation:false },
  diagnostics[] }
```

`opts` carries the only paths that can supply cross-file or explicit evidence:
- `opts.corpus` — sanitized cross-file stats from the local reality-check tool
  (`{ channelCountStable, candidateRegionStable, … }`). A **single** in-app import cannot prove
  cross-file stability, so without a corpus those criteria stay unconfirmed by construction.
- `opts.explicitMapping` — a synthetic / future manual-mapping table. Catalog *order* alone is
  never explicit evidence.

## Confirmation criteria (what each level requires)

### Catalog confirmed — `canConfirmCatalog`
Achievable from a single file: Darab header valid, catalog parses, channel count > 0, channel
names deduped. This is the one thing real data already earns.

### Sample structure confirmed — `canConfirmSampleStructure`
Catalog confirmed **and** candidate-region layout stable across files (needs a corpus) **and**
raw-series count relates sensibly to channel count. The 65-file summary fails this: region
count swings 19–107 and raw series resolve only 1–2 against 85 channels.

### Raw streams confirmed — `canConfirmRawStreams`
Sample structure confirmed **and** the per-stream encoding/layout is reproducible (not a single
generic candidate). Not yet met.

### Channel identity confirmed — `canConfirmChannelIdentity`
Requires **confirmed sample structure** AND **explicit** evidence: a channel index / offset
table, a stable order with matching block count, a synthetic explicit mapping, or a
user-confirmed manual mapping. Catalog-order *guessing* never qualifies, and explicit evidence
alone is not sufficient — you cannot confirm a channel's identity without the structure it
labels (so a single file, with or without an explicit mapping, cannot reach this). Not yet met.

### Timebase confirmed — `canConfirmTimebase`
Requires confirmed sample structure **and** a monotonic counter whose sample count matches the
series (a stable Δ, no competing counter). A monotonic counter that appears in every file is a
stable *candidate*, not a confirmed *sample clock*, until the structure it clocks is resolved.
Not yet met.

### Physical scaling confirmed — `canConfirmPhysicalScaling`
Requires confirmed identity **and** an explicit scale/offset (metadata, user-supplied, exported
reference, or a known calibration table). Not yet met. → `capabilities.physicalScaling` `false`.

### Canonical telemetry prerequisites — `canonicalTelemetryPrerequisitesMet`
True only when sample structure + channel identity + timebase + physical scaling are **all**
confirmed. This is a *prerequisite* flag, **not** a directive to build telemetry and **not** a
"telemetry-ready" claim — Phase 3D-0 never builds canonical streams, and the decode-grade
capabilities stay `false` regardless. Not yet met on real data, and out of scope to *build*
even if it were.

## Status semantics
- `not_confirmed` — sample structure not confirmed (catalog may still be confirmable). The
  current real-data summary lands here.
- `partially_confirmed` — sample structure confirmed but raw streams not yet.
- `confirmed_structure` — sample structure + raw streams confirmed. **Still not telemetry.**

## Architecture principle (unchanged)
`.bmsbin` is an adapter, not the system core:
`adapter-specific evidence → canonical descriptor → confirmation decision`. The evaluator
consumes the existing hypothesis layer (catalog / probe / raw / linking) plus optional corpus
evidence, and its decision flows back into the source-agnostic telemetry descriptor. A future
GT7 / CSV / MoTeC / AiM adapter is judged by the same criteria.

## Clean-room rules (strict, unchanged)
Never commit a real `.bmsbin` or proprietary file/schema/code. The evaluator works only on
already-parsed reports (no raw bytes). Tests use synthetic fixtures; a synthetic *confirmed*
case proves the criteria engine can represent a confirmation — it does **not** mean the Bosch
format is decoded.

## Verdict carried into this phase (from the 65-file reality check)
- Catalog (85 ch), timebase clue, encoding lean, and "sample data is present" are stable.
- Candidate-region count is unstable (19–107) and raw series (1–2) ≪ catalog channels (85).
- Therefore: **catalog confirmable; structure / identity / timebase / scaling NOT confirmed.**

## Next (not this phase)
Physical scaling of values, canonical telemetry, channel alignment to model outputs,
model-vs-actual overlay, inferred Kus / yaw-gain — only once these criteria actually pass on
real data (corpus + explicit evidence), not before.
