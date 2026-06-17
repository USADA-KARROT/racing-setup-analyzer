# `.bmsbin` Binary Sample-Block Probe (Phase 3B-0)

Scope notes for the clean-room binary probe. **This is a probe, not a decoder.**

## What this is
Phase 3A made the app honest about the *channel catalog* ("I can list the channels, I
haven't decoded the data"). Phase 3B-0 takes the next, deliberately small step: a
**clean-room binary inspection** of a `.bmsbin` that reports *evidence* of where the
sample/time-series data might live and how it might be encoded — with confidence levels and
diagnostics — **without claiming any of it is decoded**.

Success here is **not** "draw a telemetry curve". Success is: identify candidate sample
regions, candidate numeric encodings, and timebase clues, and report them honestly so
Phase 3B-1 / 3C have a grounded starting point.

## What it explicitly does NOT do
- No real decoder; no physical values (accy/yaw/speed curves).
- No scale / offset / units.
- No lap segmentation, no model-vs-actual, no handling correlation, no setup advice.
- No telemetry chart.
- No changes to the vehicle-dynamics or tyre models.

## Output: a probe *report* (not decoder output)
`probeBmsBinary(bytes)` → `{ status: 'probe_only', header, catalog, candidateRegions[],
candidateEncodings, candidateStructures[], timebaseClues[], diagnostics[], unknowns[] }`.
Everything is a *candidate* with a `confidence` (low/medium/high); nothing is asserted as
decoded.

## Architecture principle — `.bmsbin` is an adapter, not the system core
```
.bmsbin adapter probe  →  canonical telemetry descriptor  →  diagnostics / confidence
```
The probe is `.bmsbin`-specific, but its result flows back into the source-agnostic
descriptor built in Phase 3A (`telemetry-schema.js` / `telemetry-metadata.js`,
`sourceType`-decoupled). Future adapters — GT7 / CSV / RaceChrono / MoTeC / AiM /
friends' exports — must be able to plug into the same canonical descriptor + diagnostics.
Do **not** let the app become a Bosch-`.bmsbin` project.

## Clean-room rules (strict)
- Never commit a real `.bmsbin`, nor any Bosch / WinDarab / RaceCon proprietary file.
- Never copy commercial software code, schema, or decompiled content.
- No Honda / Dallara / Bosch raw data in the repo.
- Repo holds only: clean-room probe code, generic binary-inspection logic, **synthetic**
  fixtures, observations/diagnostics, the source-agnostic descriptor.
- Real `.bmsbin` is used **only** for local manual inspection of whether the probe finds
  meaningful candidate regions — never as a committed test fixture.

## What the probe looks for (evidence, not conclusions)
1. **Catalog-end candidates** — where the printable `[len][string]`/`TrackInfo` catalog
   stops and binary-heavy data begins.
2. **Numeric-density windows** — post-catalog windows with low printable ratio, moderate
   entropy, and int16/float32 plausibility → candidate sample regions.
3. **Repeating stride candidates** — byte autocorrelation at strides 2/4/8/16/32 (possible
   record size / block-per-channel vs interleaved).
4. **Encoding plausibility** — int16le / uint16le / int32le / float32le, judged on
   *binary* sanity (smoothness, finite/sane floats) — never on physical scale.
5. **Timebase clues** — monotonic uint32 counters with roughly constant delta (candidate
   only; not asserted to be a timestamp).

## Telemetry capability after 3B-0
`capabilities.sampleProbe` may become `true`, but `timeSeries`, `physicalScaling`,
`handlingCorrelation` stay **false**. Status may advance to a conservative
`probe_available` / `candidate_sample_regions` — never `samples_detected` unless evidence
is strong. The UI must not imply decoded telemetry.

## Next (not this phase)
- **3B-1** — actual sample decoding (per-channel sample arrays, time base, scale/offset,
  raw int → physical), built on the probe's grounded candidates.
- **3C** — channel alignment, Kus/yaw-gain trends, model-vs-actual overlay.
