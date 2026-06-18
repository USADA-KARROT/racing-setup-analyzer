# `.bmsbin` synthetic measured-extraction harness (Phase 3G-0B)

## What this is — and is not

Phase 3G-0A defines the extraction **input contract** and an **eligibility gate** but builds no
extraction. Phase 3G-0B adds a **synthetic measured-extraction harness**: it proves the SHAPE and
gate logic of a future measured handling-response extraction — corner segmentation → entry/mid/exit
windows → steady-state filter → a measured-tendency proxy — by running it **only on a synthetic
canonical series supplied explicitly in `opts`**.

It is **the harness, not the analysis**. It does **not**:

- extract real/imported data,
- produce a real measured handling response,
- segment real corners or emit real entry/mid/exit tendency,
- map real channels, decode physical values, or expose exact Hz / sample index / corner timing,
- enable overlay, Kus / understeer gradient, handling correlation, setup recommendation,
  model-vs-actual, driving-behaviour interpretation, or any chart.

The measured-tendency **PROXY** is synthetic-only and is explicitly **not a Kus, not model-vs-actual,
not a setup recommendation**.

## Module

`renderer/js/bms-measured-extraction-harness.js` —
`evaluateBmsMeasuredExtraction(extractionEligibility, opts)`.

### Two hard gates (both must pass before any harness step runs)

1. **Eligibility gate** — `extractionEligibility.status` must be `eligible_for_extraction`
   (Phase 3G-0A). Otherwise → `blocked_by_eligibility` (or `not_available` if none supplied).
2. **Synthetic gate** — `opts.syntheticOnly` must be `true` AND a synthetic series
   (`opts.syntheticCanonicalSeries` / `opts.measuredSeriesFixture`) must be supplied and valid.
   - eligible but not flagged synthetic (even WITH a series) → `blocked_real_path`
   - eligible + synthetic flag but no/short series → `insufficient_synthetic_series`

`realDataUsed` is **always false** — the harness only ever touches the synthetic fixture in `opts`.
A real/imported path produces NO corner segments, NO entry/mid/exit windows, and NO tendency proxy.

### Status ladder (synthetic; nearest-to-complete first)

```
not_available
  < blocked_by_eligibility        (eligibility gate not passed)
  < blocked_real_path             (eligible but not a synthetic fixture → real path blocked)
  < insufficient_synthetic_series (synthetic flag set but series missing / too short / no corners)
  < segmentation_candidate        (corners found, windows not formed)
  < windows_candidate             (entry/mid/exit formed, no steady-state)
  < steady_state_candidate        (steady-state found, no usable tendency proxy)
  < tendency_proxy_candidate      (proxy produced, not a full extraction)
  < extracted_synthetic           (full synthetic harness: segments → windows → steady-state → proxy)
```

### Harness steps (synthetic only)

- **Corner segmentation** — explicit synthetic `segmentHints`, else runs of `|lateral_accel|` over an
  abstract threshold. Output is synthetic indices only.
- **Entry / mid / exit windows** — thirds of each synthetic corner.
- **Steady-state filter** — stable speed + lateral_accel buckets and a minimum sample count over the
  mid window.
- **Measured-tendency proxy** — from the synthetic steering-vs-lateral-g ratio on steady-state
  windows: `understeer_like_proxy` / `oversteer_like_proxy` / `neutral_like_proxy` /
  `insufficient_quality`, with a confidence level. Flagged `syntheticOnly` / `notKus` /
  `notSetupAdvice` / `notModelVsActual`.

## Red lines (always held)

- Real/imported data is **never** extracted; only the synthetic fixture is touched; `realDataUsed`
  is always false.
- capabilities `measuredExtraction` / `measuredHandlingResponse` / `handlingAnalysis` /
  `overlayEnabled` / `kus` / `handlingCorrelation` / `setupRecommendation` / `modelVsActual` /
  `canonicalTelemetry` / `timeSeries` stay **false on every path** (even synthetic
  `extracted_synthetic`). Only `measuredExtractionHarness` (criteria present) and
  `measuredExtractionSynthetic` (synthetic-only) can be true.
- The tendency is a synthetic **proxy** — never presented as a Kus, model-vs-actual, or setup advice.
- Required canonical channels are an abstract schema; channel names only ever appear in the synthetic
  fixture / tests, never shown as a channel found in real data.
- Clean-room: the reporter emits only sanitized scalars (status / level / counts + `realDataUsed`
  false) — never a corner segment, window, sample index, corner timing, tendency, channel name, or
  physical value. Real `.bmsbin` files never enter the repo; tests use synthetic fixtures only.

## Wiring

- `bms-confirmation.js` gains a one-way `measuredExtractionSynthetic` decision (fed by
  `opts.measuredExtraction`, only true with `extracted_synthetic` + measured-extraction eligibility +
  corpus). Real imported data never reaches `extracted_synthetic` (and never becomes
  measured-extraction eligible), so it stays false on real data. Opens no decode/analysis capability.
- `telemetry-metadata.js` surfaces a `measuredExtraction` summary + `measuredExtractionHarness` /
  `measuredExtractionSynthetic` / `measuredExtraction` capabilities (the last is always false; the
  middle is synthetic-only).
- `index.html` runs the harness in the import pipeline (no synthetic series → real path is blocked)
  and shows a conservative "Measured extraction: not available — synthetic harness only" panel.
- `tools/bmsbin-local-probe-report.js` reports sanitized measured-extraction scalars only.

## Next

Real canonical-series extraction (much later), then a real measured handling response, then 3G-1
model-vs-actual — none of which this phase touches.
