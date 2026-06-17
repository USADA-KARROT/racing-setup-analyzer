# `.bmsbin` Physical Scaling / Units / Canonical-Value Confirmation Criteria (Phase 3F-0)

Scope notes. **This is the most safety-critical layer: it defines WHEN a raw value may be called a
physical value with a unit. It does NOT decode, does NOT make real data usable, and does NOT produce
canonical telemetry.** It evaluates ONLY evidence handed to it; it never infers scaling from waveform
shape / range plausibility, and never infers units from a channel name.

## Core principle
**A value that looks plausible is not a credible physical value.** Physical scaling confirmation
requires *independent* evidence. A physical value is only credible when ALL of these hold:
1. raw stream confirmed (Phase 3D-2)
2. channel identity confirmed (Phase 3E-0)
3. timebase confirmed if the value is time-indexed (Phase 3E-1)
4. scale source independently confirmed
5. unit source independently confirmed
6. transform explicitly known and verified (and stable across the corpus)
7. mapping stable across a cross-file corpus
8. no dependence on overlay, driving behaviour, Kus, or setup interpretation

Identity confirmed ≠ scaling confirmed. Timebase confirmed ≠ units confirmed. Manual scale ≠
confirmed scale. A plausible range ≠ a confirmed physical value. Channel name "speed" ≠ km/h confirmed.

## The status ladder (conservative)
```
not_confirmed < insufficient_evidence < identity_missing < timebase_missing < scale_hint_only
              < unit_hint_only < scale_candidate < unit_candidate < transform_candidate
              < confirmable_scaling < confirmed_scaling
```
`confirmed_scaling` is reachable only with synthetic fixtures in 3F-0, and only when every criterion
above holds. A single real file can never reach it (no corpus → no confirmed raw stream / identity /
timebase). Even then, this phase establishes **eligibility** — it does **not** produce usable canonical
telemetry, and never enables overlay, Kus, handling correlation, or setup recommendation.

- **A manual scale** is only a `scale_hint_only` fallback — it never confirms scaling, units, or values.
- **A unit label** (e.g. from a channel name) is only `unit_hint_only` — never independent evidence.
- **A plausible value range** is supporting evidence only — at most `scale_candidate`, never confirmed.

## Red lines (do NOT cross)
- No overlay, lap comparison, Kus, setup recommendation, handling correlation, driving-behaviour
  interpretation; no auto scaling from waveform shape; no auto units from channel name.
- `capabilities.physicalScaling` / `unitsConfirmed` are true ONLY on a synthetic strict confirmed case;
  they are false on all real/imported data.
- `capabilities.canonicalTelemetry` / `timeSeries` / `handlingCorrelation` / `setupRecommendation` /
  `overlayEnabled` stay false on EVERY path (even a synthetic confirmed case — eligibility ≠ usable).
- The feed into `bms-confirmation.js` is corpus-gated (`opts.corpus.fileCount ≥ 2`), a no-op when absent,
  does not change 3D-2 / 3E-0 / 3E-1 semantics, and never opens a decode-grade capability.

## Clean-room
`.bmsbin` is an adapter; output flows back to the source-agnostic descriptor. No real `.bmsbin`, raw
bytes, sample values, byte offsets, scale factors, unit tables, transform constants, inferred
km/h·g·deg·% values, or proprietary fingerprints are committed; tests use synthetic fixtures only. The
local reporter emits only sanitized aggregate statistics (statuses / counts / evidence levels) and
never an inferred scale, unit, or physical value from a real file.

## What 3F-0 delivers
> Physical Scaling Confirmation Criteria implemented · Real/imported single-file physical values still
> not available · Manual scale only a fallback hint · Plausible range not enough · No units confirmed
> for real data · No canonical usable telemetry for real data · No overlay · No Kus · No setup recommendation.
