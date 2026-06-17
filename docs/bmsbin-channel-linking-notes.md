# `.bmsbin` Channel-Linking & Scaling Hypotheses (Phase 3C-0)

Scope notes. **This is a hypothesis layer, not a decoder, and not telemetry correlation.**

## What this is
The chain so far: `catalog → probe candidate regions → raw series candidates`. Phase 3C-0
takes one careful step: build a **checkable hypothesis layer** that relates raw series
candidates to (a) catalog channel identity, (b) a timebase, and (c) a scaling guess — each
tagged with confidence. It does **not** confirm any of them, and does **not** produce
physical values, overlays, or Kus.

`Phase 3C` is deliberately split. 3C-0 = identity / timebase / scaling *hypotheses* only.
Physical scaling of values, canonical telemetry, model-vs-actual overlay and inferred
Kus/yaw-gain are **later** (3D/3E), not here.

## Red lines (do NOT cross)
- Hypotheses only. Never claim decoded telemetry, confirmed channel mapping, physical
  values, telemetry-ready, or inferred Kus.
- **Channel identity stays unconfirmed** unless there is *explicit* evidence (a channel
  index / per-channel block header / offset table / an explicit mapping passed in — e.g.
  a synthetic fixture or a future manual-mapping UI). Catalog having `accy` does **not**
  let us name a raw series `lateral_accel`; at most `possibleCanonicalName: 'lateral_accel'`
  with `confidence: 'low'`, `method: 'catalog_order_hypothesis'`. The UI must not show it
  as confirmed lateral G.
- **No physical value conversion.** A scaling *hypothesis* may carry a candidate
  scale/offset/unit (e.g. from an explicit mapping), but raw values are never converted to
  g / deg·s⁻¹ / km·h⁻¹, and `capabilities.physicalScaling` stays `false`.
- No telemetry chart, no overlay, no lap segmentation, no setup advice, no GT7/CSV adapter,
  no model changes, no release.

## Output: a linking-hypothesis report
`linkBmsRawCandidates(bmsResult, probeReport, rawExtraction, opts)` →
`{ stage: 'channel_linking_hypothesis', status: 'linking_hypotheses_only', inputs,
channelIdentityHypotheses[], timebaseHypotheses[], scalingHypotheses[], canonicalPreview,
capabilities, diagnostics[], unknowns[] }`.

`canonicalPreview.available` stays `false` unless an **explicit** mapping confirms both
identity and scale for a series (the synthetic/metadata path that reserves the schema for a
future manual-mapping UI) — and even then `physicalScaling`/`handlingCorrelation` stay
`false` (it is not Bosch-format decoding).

## Capability state after 3C-0
```
capabilities: {
  channelCatalog: true, sampleProbe: true, rawTimeSeriesCandidates: true,
  channelLinkingHypotheses: true,   // ← new
  scalingHypotheses: true,          // ← new
  timeSeries: false, physicalScaling: false, handlingCorrelation: false,
}
status: 'linking_hypotheses_only'   // never telemetry_ready / decoded / physical_values_ready
```

## Architecture principle (unchanged)
`.bmsbin` is an adapter, not the system core:
`adapter-specific evidence → canonical telemetry descriptor → diagnostics / confidence`.
Linking consumes catalog + probe + raw extraction; output flows back to the source-agnostic
descriptor. Future GT7 / CSV / MoTeC / AiM adapters plug into the same canonical shape.

## Clean-room rules (strict, unchanged)
Never commit a real `.bmsbin` or proprietary file/schema/code. Synthetic fixtures only;
real `.bmsbin` is for local manual inspection. A synthetic explicit-mapping test proves the
module can *represent* a confirmed mapping — it does **not** mean the Bosch format is decoded.

## Next (not this phase)
- **3D/3E** — physical scaling of values / canonical telemetry, channel alignment to model
  outputs, model-vs-actual overlay, inferred Kus/yaw-gain. Only once identity + timebase +
  scaling are actually established (not hypotheses).
