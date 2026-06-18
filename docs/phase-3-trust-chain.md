# Phase 3 Trust Chain — overview & invariants

This is the single map of the Phase 3 `.bmsbin` telemetry **trust chain**: a catalog →
evidence/hypothesis → gate/confirmation pipeline that decides, conservatively, *what may be
trusted* about an imported telemetry file. It is the reference for Phase 3R-0 onward.

**What Phase 3 IS:** a credibility framework over imported `.bmsbin` data — read the channel
catalog, form hypotheses about the binary layout, and apply explicit confirmation criteria that
decide what could be upgraded from *hypothesis* to *confirmed*, plus a synthetic harness that
proves the *shape* of a future extraction.

**What Phase 3 is NOT (yet):** it does **not** decode real telemetry into physical values, does
**not** extract a real measured handling response, and does **not** do any analysis (no
overlay / Kus / model-vs-actual / setup recommendation). On a real, imported single file every
layer is **fail-closed**.

> **Core principle:** *looks plausible ≠ trustworthy.* A real single file stays
> not_confirmed / not_ready / not_eligible / blocked at every layer; only an explicit, synthetic,
> corpus-backed fixture can reach a "confirmed/ready/eligible/extracted" state — and even then no
> analysis capability opens.

---

## Pipeline order (canonical)

```
parseBms (3A)
  → probeBmsBinary (3B-0)
  → extractBmsRawCandidates (3B-1)
  → linkBmsRawCandidates (3C-0)
  → discoverBmsSampleStructure (3D-1)
  → evaluateBmsRawStreamConfirmation (3D-2)
  → evaluateBmsChannelIdentityConfirmation (3E-0)
  → evaluateBmsTimebaseConfirmation (3E-1)
  → evaluateBmsPhysicalScalingConfirmation (3F-0)
  → evaluateBmsTelemetryReadiness (3F-1)
  → evaluateBmsExtractionEligibility (3G-0A)
  → evaluateBmsMeasuredExtraction (3G-0B)
  → evaluateBmsConfirmationEvidence (3D-0 HUB — runs LAST, aggregates all feeds)
  → evaluateBmsCanonicalAdapterEligibility (3G-1 — canonical-adapter BOUNDARY gate; after the hub, one-way, NOT fed back upstream)
  → buildTelemetryMetadata (3A — merged, UI-facing descriptor)
```

Call sites differ in detail but share the load-bearing invariant: `renderer/index.html`
`importBms()` runs the full chain and passes every gate feed into the 3D-0 hub **last**, but with
**no `corpus`** and **no synthetic series**; `tools/bmsbin-local-probe-report.js` (`summarizeFile`)
runs the same modules over user-pointed real files but calls the hub **early with empty opts `{}`**
(feeds omitted). The invariant that matters is that **neither call site ever passes a `corpus`** —
so a single real file is fail-closed by construction regardless of feed wiring.

## Module catalog

| File (`renderer/js/`) | Phase | Tier | Role |
|---|---|---|---|
| `bms-parser.js` | 3A | supporting | parse Darab catalog (header, channels) |
| `telemetry-schema.js` | 3A | supporting | abstract canonical-channel mapping |
| `bms-probe.js` | 3B-0 | evidence | clean-room binary probe (candidate regions) |
| `bms-raw-extract.js` | 3B-1 | evidence | raw series candidates (unnamed) |
| `bms-channel-link.js` | 3C-0 | evidence | identity/timebase/scaling **hypotheses** |
| `bms-structure-discovery.js` | 3D-1 | evidence | sample-structure **hypotheses** |
| `bms-raw-stream-confirmation.js` | 3D-2 | gate | raw-stream structure confirmation criteria |
| `bms-channel-identity-confirmation.js` | 3E-0 | gate | channel-identity confirmation criteria |
| `bms-timebase-confirmation.js` | 3E-1 | gate | timebase confirmation criteria (structural) |
| `bms-physical-scaling-confirmation.js` | 3F-0 | gate | physical-scaling confirmation criteria |
| `bms-telemetry-readiness.js` | 3F-1 | gate | data-quality / readiness GATE |
| `bms-extraction-eligibility.js` | 3G-0A | gate | extraction input-contract + eligibility GATE |
| `bms-measured-extraction-harness.js` | 3G-0B | gate | **synthetic** measured-extraction harness |
| `bms-canonical-adapter-eligibility.js` | 3G-1 | gate | real canonical-series adapter **boundary** / eligibility (after hub; one-way, not fed back) |
| `bms-confirmation.js` | 3D-0 | **hub** | aggregates all feeds → confirmation decision |
| `telemetry-metadata.js` | 3A | aggregation | merges everything into the UI-facing descriptor |

Supporting (non-chain): `tools/bmsbin-local-probe-report.js` (sanitized reporter),
`renderer/index.html` (UI panels + pipeline), `renderer/js/i18n-ui.js` (en/zh/ja),
`tests/verify-dynamics.js` (`[…]` blocks per phase + `[invariants]`).

## Canonical gate shape + three INTENTIONAL deviations

Gate-tier modules **3E-0 … 3G-0B** return the canonical shape:

```js
{ sourceType, stage, status, reason, <level>,          // <level> = evidenceLevel / eligibilityLevel / extractionLevel
  inputs, …,
  aggregateDecision,    // authoritative booleans (canConfirm* / canBe* / canExtract*)
  confirmationFeed,     // the one-way signal the 3D-0 hub consumes
  capabilities,         // decode/analysis flags, pinned false on real data
  diagnostics, unknowns }
```

Three modules deviate **by design** — do **not** "normalize" them:

1. **3D-0 hub** (`bms-confirmation.js`): emits `decisions / evidence / scores / blockers /
   nextEvidenceNeeded`; has **no** `reason / aggregateDecision / confirmationFeed / unknowns`
   (it is the aggregator, not a feed).
2. **3D-1 discovery** (`bms-structure-discovery.js`): emits `convergence / structureHypotheses`
   plus `confirmationFeed / capabilities / unknowns`; **no** `reason / aggregateDecision`
   (it is a hypothesis layer, not a gate).
3. **3D-2** (`bms-raw-stream-confirmation.js`): has `aggregateDecision / confirmationFeed /
   unknowns` but **no** top-level `reason / evidenceLevel`.

These shapes are locked by `[invariants] (I)` (canonical shape on 3E-0…3G-0B) so an accidental
shape change fails a test rather than silently spreading.

## Status ladders (reference)

- **3D-2 raw stream:** `not_confirmed < candidate_only < confirmable < confirmed_structure` (+ `rejected`)
- **3E-0 identity:** `not_confirmed < hypothesis_only < labeled_unverified < candidate < confirmable_identity < confirmed_identity`
- **3E-1 timebase:** `not_confirmed < … < confirmable_timebase < confirmed_timebase` (8 rungs)
- **3F-0 scaling:** `not_confirmed < … < confirmable_scaling < confirmed_scaling` (11 rungs)
- **3F-1 readiness:** `not_ready < insufficient_prerequisites < missing_required_channels < quality_blocked < partial_readiness < candidate_readiness < confirmable_readiness < ready_for_analysis`
- **3G-0A eligibility:** `not_eligible < prerequisites_unmet < canonical_series_unavailable < required_channels_unavailable < partial_eligibility < segmentation_prerequisites_unmet < window_prerequisites_unmet < corpus_unavailable < eligible_for_extraction`
- **3G-0B measured extraction:** `not_available < blocked_by_eligibility < blocked_real_path < insufficient_synthetic_series < segmentation_candidate < windows_candidate < steady_state_candidate < tendency_proxy_candidate < extracted_synthetic`
- **3G-1 canonical adapter:** `not_available < blocked_by_prerequisites < raw_stream_missing < identity_missing < timebase_missing < scaling_missing < units_missing < corpus_missing < adapter_contract_candidate < synthetic_adapter_ready`
- **3D-0 hub:** `not_confirmed < partially_confirmed < confirmed_structure`

The top of every ladder (`confirmed_*` / `ready_for_analysis` / `eligible_for_extraction` /
`extracted_synthetic`) is **synthetic-only** — unreachable on a real single file.

## Feed-trust contract & asymmetry — ⚠️ #1 regression watch point

The 3D-0 hub and the late gates each trust upstream evidence through a one-way `confirmationFeed`,
but the *trust check* is not uniform:

- **3D-0 hub** trusts each feed via **status string + capability flag + corpus** (e.g. a feed must
  report `status === 'confirmed_*'` AND `capabilities.<x> === true` AND `opts.corpus.fileCount ≥ 2`).
- **3F-0 / 3F-1** trust upstream via **`aggregateDecision` booleans** (e.g.
  `physicalScaling.aggregateDecision.canConfirmPhysicalScaling === true`).
- **3G-0B** uses a **dual gate**: `extractionEligibility.status === 'eligible_for_extraction'`
  **AND** `capabilities.extractionEligible === true`.

This **string-vs-boolean asymmetry** is the single most likely regression when the real-canonical
extraction phase adds a *new* status value that satisfies a string check but not the intended
boolean (or vice-versa). It is locked by `[invariants] (H)` (only-status / only-cap forged →
blocked). Preserve both halves of every dual gate.

## Capabilities model

Leaf modules pin their decode/analysis caps false; `telemetry-metadata.js` merges everything into
the **single authoritative `capabilities` block the UI reads**. The hub additionally pins
`timeSeries / physicalScaling / handlingCorrelation` to literal `false` on every path.

## RED LINES (the contract that must never break)

1. The real/imported single-file path is **fail-closed at every layer**
   (not_confirmed / not_ready / not_eligible / blocked).
2. These capabilities stay **false on real data** at every layer and in the merged metadata:
   `physicalScaling, unitsConfirmed, canonicalTelemetry, telemetryReady, extractionEligible,
   measuredExtraction, measuredExtractionSynthetic, measuredHandlingResponse, handlingAnalysis,
   overlayEnabled, kus, handlingCorrelation, setupRecommendation, modelVsActual, timeSeries,
   lapSegmentation, canonicalAdapterEligible`.
3. A synthetic `extracted_synthetic` opens **only** `measuredExtractionSynthetic` /
   `measuredExtractionHarness`, and a synthetic `synthetic_adapter_ready` (3G-1) opens **only**
   `canonicalAdapterEligible`; in both cases `realDataUsed` stays false, NO real canonical series is
   built, and **no** canonicalTelemetry / timeSeries / measuredExtraction / analysis / overlay / Kus /
   setup / model-vs-actual cap flips.
4. The reporter emits **only sanitized scalars** (the `REPORT_FIELDS` whitelist) — never a real
   sample, sample index, exact timing, corner window, tendency, channel name, physical value, raw
   byte, decoded sequence, or proprietary fingerprint.
5. Real `.bmsbin` files (and any proprietary binary) **never** enter the repo; tests use synthetic
   fixtures only.

## Synthetic vs real boundary

`syntheticOnly` / `realDataUsed === false` originate in the 3G-0B harness. `extracted_synthetic`
means the harness ran end-to-end **on a synthetic fixture** — it is *the harness, not an analysis
result*. The measured-tendency output is an explicit proxy — one of `understeer_like_proxy` /
`oversteer_like_proxy` / `neutral_like_proxy` / `insufficient_quality` — flagged
`notKus / notSetupAdvice / notModelVsActual`; the UI/i18n surface the honest disclaimer and show no
green badge for a real path.

Phase 3G-1 adds the canonical-adapter **boundary** — whether real data is even eligible to enter a
future canonical measured-series adapter. On a real single file it is always blocked
(`raw_stream_missing` / … / `corpus_missing`); only a synthetic, fully-confirmed, corpus-backed
fixture reaches `synthetic_adapter_ready`, and even then NO real canonical series is built and
`canonicalTelemetry` / `timeSeries` / `measuredExtraction` stay false (`realDataUsed` always false).
The adapter runs AFTER the hub and is one-way — it never feeds back into the upstream gates.

## Reporter (`tools/bmsbin-local-probe-report.js`)

Single-file, no-corpus stance: a single real file can confirm a catalog but never cross-file
stability, so every `confirmed*` count is 0 and `confirmationStatus` is `not_confirmed`. Output is
the sanitized scalar `REPORT_FIELDS` whitelist only. The per-file error fallback must keep the
**same key set** as `REPORT_FIELDS` (locked by `[invariants] (F)` as a drift guard, so the inline
literal needs no refactor). Runs only over files the user explicitly points at.

## Invariant test index (`tests/verify-dynamics.js` → `[invariants]`)

| Test | Locks |
|---|---|
| A | real path fail-closed at every layer (gates + hub decisions) |
| B | no gated cap true on real path (all layers + merged metadata) |
| C | hub pins timeSeries/physicalScaling/handlingCorrelation false |
| D | bad/empty input fail-closed (no throw, no gated cap) |
| E | reporter summary key set === REPORT_FIELDS; all scalar |
| F | reporter error-fallback key set === REPORT_FIELDS (drift guard) |
| G | synthetic extracted_synthetic opens only harness caps; realDataUsed false |
| H | dual-gate: forged status/cap → blocked; eligible+series w/o syntheticOnly → blocked_real_path |
| I | canonical gate shape on 3E-0…3G-0B |
| J | clean-room: no proprietary telemetry / vendor binary in the repo tree (red line #5; backed by `.gitignore`) |

Per-phase behavior is additionally covered by the `[telemetry-readiness]`,
`[extract-eligibility]`, `[measured-extraction]`, `[tool]`, etc. blocks.

## Forward note — real-canonical-extraction phase

Phase 3G-1 has already built the canonical-adapter **boundary** (the doorway), but real extraction
itself has not started. When it does, it will edit the gate modules and `telemetry-metadata.js`.
Preserve: the fail-closed real path (no corpus on a single file ⇒ nothing confirmed); the
string-vs-boolean dual gates (don't let a new status satisfy a check the boolean shouldn't); and
the capability pins — a decode/analysis cap (`canonicalTelemetry` / `timeSeries` / `measuredExtraction`
/ `canonicalAdapterEligible` on real data) may turn true **only** once real decode is genuinely
proven (confirmed canonical values + corpus), never merely because a summary surfaced or the adapter
boundary was reached. Until then, real data stays unavailable, and `v1.7.0 — Telemetry Validation
Workflow` waits.
