# `.bmsbin` measured handling-response extraction — input contract & eligibility gate (Phase 3G-0A)

## Why this layer exists

Phases 3D–3F build a **confirmation / readiness** chain over imported `.bmsbin` telemetry. That
chain is entirely **metadata-level**: it decides *whether* a dataset's structure, identity,
timebase and physical scaling could be trusted, and *whether* the data is ready to enter a later
analysis phase. It never produces an actual time-series.

The next milestone — Phase 3G "measured handling response extraction" (corner segmentation,
entry/mid/exit windows, steady-state filtering, steering-vs-lateral-G, yaw response,
brake-release / throttle-pickup, understeer/oversteer proxy) — is the first step that would
actually **compute numbers** from telemetry. Jumping straight to it would skip the missing layer
between *"is the data trustworthy?"* and *"use the data to compute a handling tendency"*: the
**canonical measured series / analysis input contract**. Skipping it would quietly make 3G the
first place that invents numbers, breaking the credibility framework the earlier phases built.

So 3G is split:

| Step | Scope |
|---|---|
| **3G-0A** (this doc) | Define the extraction **input contract** + an **eligibility gate**. No extraction. |
| **3G-0B** | Synthetic measured-extraction harness (corner segmentation / windows / tendency) — synthetic only. |
| later | Real canonical-series extraction. |
| later | Measured handling response (and only then 3G-1 model-vs-actual). |

## What 3G-0A does

`evaluateBmsExtractionEligibility(readiness, opts)` (`renderer/js/bms-extraction-eligibility.js`)
consumes the Phase 3F-1 readiness report and answers one question: **does this (already
readiness-gated) telemetry satisfy the input contract required to later extract a measured
handling response?** If not, what is missing?

It is a **contract + gate**, not extraction. It segments no corner, computes no
steering-vs-lateral-G / yaw response, and produces no measured tendency / understeer-oversteer
proxy.

### Input contract (`EXTRACTION_INPUT_CONTRACT`)

Abstract profile schema — never a named channel found in real data.

- **Canonical measured series** over the required (abstract) channels — `speed`, `steering`,
  `lateral_accel`, `yaw_rate`, `brake_or_longitudinal_accel` — each *confirmed canonical*
  (identity + scaling + units + timebase), **time-aligned**, **gap-free**, **known sample rate**.
- **Corner-segmentation prerequisites** — corner events detectable, a minimum corner-event count,
  entry/mid/exit windows separable, steady-state identifiable.
- **Corpus-backed** — a single file can never establish eligibility.

### Output contract (`EXTRACTION_OUTPUT_CONTRACT`)

The *shape* Phase 3G-0B will produce **if** eligible — 3G-0A produces none of it. Per-corner
entry/mid/exit windows and a per-window **measured tendency** that is an explicit
`understeer_oversteer_proxy` (basis: steering-vs-lateral-G, yaw response, brake-release,
throttle-pickup) with per-output confidence. It is **measured-only**: not a full Kus, not
model-vs-actual, not a setup recommendation.

### Eligibility ladder (fail-closed)

```
not_eligible
  < prerequisites_unmet            (readiness has progressed but is not ready_for_analysis)
  < canonical_series_unavailable   (ready, but no time-aligned/gap-free/known-rate canonical series)
  < required_channels_unavailable  (canonical series present, but required channels all missing)
  < partial_eligibility            (some — not all — required channels canonical)
  < segmentation_prerequisites_unmet
  < window_prerequisites_unmet
  < eligible_for_extraction        (synthetic only)
```

`eligible_for_extraction` requires telemetry readiness (`ready_for_analysis`), a canonical
measured series, all required channels, corner-segmentation and entry/mid/exit-window
prerequisites, **and** a cross-file corpus. Because a real/imported single file is never
`ready_for_analysis` (its raw stream / identity / timebase / scaling are never confirmed), real
data is **never** eligible.

## Red lines (always held)

- Eligibility is an **input contract**, not extraction — no corner segmentation, steady-state
  result, measured tendency, understeer/oversteer proxy, Kus, overlay, model-vs-actual, setup
  recommendation, or driving-behaviour interpretation is produced on any path.
- A real/imported single file can **never** reach `eligible_for_extraction`.
- Required-channel keys are an **abstract profile schema** — never displayed as a named channel
  found in real data; the gate never claims to have "found speed" in a file.
- capabilities `measuredHandlingResponse` / `handlingAnalysis` / `overlayEnabled` / `kus` /
  `handlingCorrelation` / `setupRecommendation` / `modelVsActual` / `canonicalTelemetry` stay
  **false on every path** (even synthetic `eligible_for_extraction`).
- Clean-room: the evaluator consumes only the already-evaluated readiness report (no raw bytes);
  the local reporter emits only sanitized scalars (status / level / counts) — never a measured
  value, corner timing, window position, tendency, or real channel name. Real `.bmsbin` files
  never enter the repo.

## Wiring

- `bms-confirmation.js` gains a one-way `measuredExtractionEligible` decision (fed by
  `opts.extractionEligibility`, only true with `eligible_for_extraction` + full prerequisites +
  corpus). It opens no decode-grade capability.
- `telemetry-metadata.js` surfaces an `extractionEligibility` summary + `extractionEligibilityCriteria`
  / `extractionEligible` / `measuredHandlingResponse` capabilities (the last two never true on real data).
- `index.html` runs the gate in the import pipeline and shows a conservative
  "measured handling extraction: not available" panel.
- `tools/bmsbin-local-probe-report.js` reports sanitized eligibility scalars only.

## Next (3G-0B)

Build the synthetic measured-extraction harness against this contract: corner segmentation,
entry/mid/exit windows, steady-state filtering, and a measured understeer/oversteer **proxy** —
synthetic only, still no overlay / Kus / model-vs-actual / setup, real data still unavailable.
