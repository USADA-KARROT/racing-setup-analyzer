# `.bmsbin` Raw Time-Series Candidate Extraction (Phase 3B-1)

Scope notes. **This is raw candidate extraction, not a decoder.**

## What this is
Phase 3B-0 probed the binary and reported *where* sample data might live (candidate
regions / encodings / timebase clues). Phase 3B-1 takes the next small step: from those
candidate regions, attempt to **pull out raw sample-array candidates** and describe them
statistically — still **without** physical scaling, units, channel identity, or any
model-vs-actual use.

Success here is **not** "decode the `.bmsbin`" and **not** "draw a telemetry curve".
Success is: cleanly extract *raw series candidates* and honestly label them as
**raw-only, channel-unknown, timebase-unconfirmed, scaling-not-decoded**.

## Red lines (do NOT cross)
- No physical scaling, no units, no channel-specific physical interpretation.
- **Never** name a raw series `accy_values` etc. Series are `rawSeriesCandidates` with
  ids like `candidate_001`. Even if the catalog lists `accy`, a raw region is **not**
  mapped to it without explicit order/offset/metadata evidence.
  `channelMapping.status` stays `not_mapped` (at most
  `candidate_channel_count_matches_catalog` — still not a mapping).
- No telemetry chart, no lap segmentation, no steering/yaw/lateral-g correlation, no setup
  advice, no GT7/CSV adapter, no model changes, no release.

## Output: a raw-candidate report
`extractBmsRawCandidates(bytes, probeReport)` → `{ stage: 'raw_candidate_extraction',
status: 'raw_candidates_only', basedOnProbe, selectedRegions[], extractionAttempts[],
rawSeriesCandidates[], timebaseCandidate, channelMapping, capabilities, diagnostics[],
unknowns[] }`.

Each `rawSeriesCandidate` carries raw stats (sampleCount, min/max/mean, samplePreview) and
notes: `raw values only`, `not physically scaled`, `not mapped to canonical channel`.

## Capability state after 3B-1
```
capabilities: {
  channelCatalog: true,
  sampleProbe: true,
  rawTimeSeriesCandidates: true,   // ← new
  timeSeries: false,               // not confirmed usable telemetry
  physicalScaling: false,
  handlingCorrelation: false,
}
status: 'raw_candidates_only'      // never 'decoded' / 'samples_decoded' / 'time_series_ready'
```

## Architecture principle (unchanged)
`.bmsbin` is an adapter, not the system core:
```
adapter-specific extraction result  →  canonical telemetry descriptor  →  diagnostics / confidence
```
Extraction consumes the 3B-0 `probeReport`; its result flows back into the source-agnostic
descriptor. Future GT7 / CSV / MoTeC / AiM adapters plug into the same canonical shape.

## Clean-room rules (strict, unchanged)
Never commit a real `.bmsbin` or any Bosch/WinDarab/RaceCon proprietary file/schema/code.
Repo holds only clean-room logic + synthetic fixtures. Real `.bmsbin` is for local manual
inspection only.

## What extraction does
1. **Region selection** — pick the strongest probe candidate region (confidence / numeric
   density / size / near a timebase clue). Marked *selected candidate*, not confirmed.
2. **Encoding-specific extraction** — for int16le / uint16le / int32le / uint32le /
   float32le, compute raw stats only (count, min/max/mean/std, zeroRatio, continuity,
   smoothness, repeated-pattern). No units.
3. **Layout hypotheses** — single_series / interleaved / block_per_channel / unknown, as
   candidates with confidence (from stride autocorrelation). No confirmed channel mapping.
4. **Timebase relation** — relate a 3B-0 monotonic-counter clue to a candidate sample
   count / stable delta. Candidate only, never "confirmed timestamp".
5. **Channel identity** — left `not_mapped`. Counts matching the catalog is a *note*, not
   a mapping.

## Next (not this phase)
- **3C** — channel alignment, physical scaling / canonical telemetry values, model-vs-actual
  overlay, Kus/yaw-gain. Scaling is a 3C concern, not 3B-1.
