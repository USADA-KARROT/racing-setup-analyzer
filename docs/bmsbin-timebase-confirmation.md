# `.bmsbin` Timebase Confirmation Criteria (Phase 3E-1)

Scope notes. **This phase defines the conservative CRITERIA for when a timebase may be called
confirmed — where a timebase is purely STRUCTURAL (sample ordering / sample count / interval
stability / per-channel synchronisation).** It does NOT produce physical time, units, a
seconds/Hz chart, overlay, or any usable telemetry.

## Core principle
**Timebase confirmation is not physical scaling.** A confirmed timebase means only that sample
ordering / sample intervals / synchronisation are structurally supported. It does **not** mean
channel identity is confirmed, units are confirmed, values are physical, telemetry is canonical,
overlay is valid, or setup advice can be made.

## The status ladder (conservative)
```
not_confirmed < insufficient_evidence < sample_count_candidate < monotonic_candidate
              < delta_candidate < sync_candidate < confirmable_timebase < confirmed_timebase
```
`confirmed_timebase` requires ALL of: a corpus-backed **confirmed raw stream** (Phase 3D-2), a
stable sample count across the corpus, monotonic sample ordering, a stable interval/stride, stable
per-channel synchronisation, and **no unhandled gaps/dropouts** — and it does not depend on physical
scaling, channel identity, driving behaviour, overlay, or setup. It is reachable only with synthetic
fixtures in 3E-1. A single real file can never reach it (no corpus). Even confirmed, the timebase is
**structural only** — values are not physical and units are not confirmed.

- **A manual sample rate** is only a **fallback hint**: it never confirms the timebase, never opens
  units, and never produces a seconds/Hz chart.
- Shape-only / value-pattern-only evidence is at most a `candidate`.
- If the raw stream is not corpus-confirmed, the timebase is at most `confirmable_timebase`.
- Gaps / dropouts block `confirmed_timebase`.

## Red lines (do NOT cross)
- No physical scaling, units conversion, physical telemetry / seconds chart, overlay, Kus, setup
  recommendation, canonical telemetry, handling correlation, confirmed physical values, channel
  naming, or auto sample-rate guessing that becomes confirmed.
- `capabilities.physicalScaling` / `unitsConfirmed` / `canonicalTelemetry` / `timeSeries` /
  `handlingCorrelation` / `setupRecommendation` stay `false` on every path (even `confirmed_timebase`).
- The feed into `bms-confirmation.js` is corpus-gated (`opts.corpus.fileCount ≥ 2`), a no-op when
  absent, does not change 3D-2 / 3E-0 semantics, and never opens a decode-grade capability.

## Clean-room
`.bmsbin` is an adapter; output flows back to the source-agnostic descriptor. No real `.bmsbin`,
raw bytes, sample values, byte offsets, exact timestamps, or inferred sample rates from real files
are committed; tests use synthetic fixtures only. The local reporter emits only sanitized aggregate
statistics (statuses / counts / structural flags) and never an inferred Hz/rate from a real file.

## What 3E-1 delivers
> Timebase Confirmation Criteria implemented · Real/imported single-file timebase still not
> confirmed · Manual sample rate only a fallback hint · No physical scaling · No units · No
> seconds-based physical chart · No canonical telemetry · No overlay · No Kus · No setup recommendation.
