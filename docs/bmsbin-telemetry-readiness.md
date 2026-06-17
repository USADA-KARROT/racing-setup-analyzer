# `.bmsbin` Telemetry Readiness / Data-Quality Gate (Phase 3F-1)

Scope notes. **This is a GATE, not an analysis.** It answers one question: is this telemetry
sufficiently confirmed and complete to support a LATER handling-analysis phase? If not, what is
missing? It performs no analysis, builds no telemetry series / chart, and enables no overlay, Kus,
setup recommendation, handling correlation, or model-vs-actual.

## Core principle
**Readiness is not analysis.** `ready_for_analysis` only means the prerequisites and data quality are
confirmed enough to ENTER a later phase — it does not tell the user how the car drives or how to set
it up. A dataset cannot be ready unless ALL of these hold:
1. canonical-telemetry eligibility is confirmed (Phase 3F-0)
2. required channels are confirmed (not guessed), with confirmed scaling + units
3. timebase is confirmed (Phase 3E-1)
4. sample-rate adequacy is confirmed
5. sync quality is confirmed
6. dropout / gap quality passes (unknown → fail-closed)
7. noise quality passes
8. the evidence is corpus-backed
9. no overlay / Kus / setup is produced

## The status ladder (conservative)
```
not_ready < insufficient_prerequisites < missing_required_channels < quality_blocked
         < partial_readiness < candidate_readiness < confirmable_readiness < ready_for_analysis
```
`ready_for_analysis` is reachable only with synthetic fixtures in 3F-1. A real/imported single file
can never reach it (its raw stream / identity / timebase / scaling are not confirmed — no corpus).

## Analysis profiles & required channels
Profiles (`basicTelemetryReadiness`, `handlingReadiness`, `advancedVehicleDynamicsReadiness`) define
**abstract required-channel keys only** (e.g. `speed`, `steering`, `lateral_accel`, `yaw_rate`,
`brake_or_longitudinal_accel`). These are a checklist SCHEMA — they are never displayed as a named
channel found in real data, and the gate never executes any analysis.

## Quality
Sample-rate / sync / dropout / noise are evaluated as adequacy / quality buckets only, from provided
evidence (synthetic in tests). Unknown dropout/noise quality is **fail-closed** (treated as not
passing). No exact inferred rate, dropout sample position, or raw sequence is produced.

## Red lines (do NOT cross)
- No overlay, lap comparison, Kus, setup recommendation, handling correlation, model-vs-actual,
  driving-behaviour interpretation, physical telemetry chart, automatic channel naming, automatic
  scaling/units, inferred physical values.
- `capabilities.handlingAnalysis` / `overlayEnabled` / `kus` / `handlingCorrelation` /
  `setupRecommendation` / `canonicalTelemetry` stay false on EVERY path (even synthetic ready).
  `telemetryReadiness`/`telemetryReady` are true ONLY on a synthetic strict ready case.
- The feed into `bms-confirmation.js` (`opts.readiness`) is corpus-gated, a no-op when absent, does
  not change 3D-2 / 3E-0 / 3E-1 / 3F-0 semantics, and never enables analysis/overlay/Kus/setup.

## Clean-room
`.bmsbin` is an adapter; output flows back to the source-agnostic descriptor. No real `.bmsbin`, raw
bytes, sample values, byte offsets, channel mapping, inferred Hz, physical values, analysis results,
or proprietary fingerprints are committed; tests use synthetic fixtures only. The local reporter emits
only sanitized aggregate statistics (statuses / levels / counts / quality buckets) and never a real
channel name, exact rate, or analysis result.

## What 3F-1 delivers
> Telemetry Readiness Criteria implemented · Real/imported single-file still not ready · Readiness is
> a gate, not analysis · No handling analysis · No overlay · No Kus · No setup recommendation · No
> model-vs-actual · No physical chart.
