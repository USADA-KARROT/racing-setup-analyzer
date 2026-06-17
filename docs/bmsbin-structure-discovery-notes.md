# `.bmsbin` Sample-Structure Discovery (Phase 3D-1)

Scope notes. **This phase looks deeper at the bytes for *sample-structure* evidence and reports
it as HYPOTHESES. It is a discovery layer, NOT a decoder.** It does NOT decode telemetry, scale
values, name channels, build canonical streams, overlay model-vs-actual, or infer Kus.

The 65-file reality check (Phase 3C-1) showed the weakest link on real data is **sample
structure**: the catalog is confirmable, but 85 catalog channels currently surface only **1–2
raw series candidates**. Phase 3D-1 asks *how* those 85 channels might be laid out in the binary,
and *why* so few raw series appear — without claiming anything is decoded.

The chain so far:
`catalog → probe candidate regions → raw series candidates → linking/scaling hypotheses → confirmation criteria → structure discovery`.

## What success is (and is not)
- **Success is NOT** "we resolved accy's sample array."
- **Success IS** the system can push sample structure from *not confirmed* toward *stronger,
  checkable structure hypotheses*, and can answer — as a hypothesis, with a confidence — why
  only 1–2 raw series appear versus the catalog count. Nothing is upgraded to `confirmed` unless
  it passes the Phase 3D-0 confirmation criteria (which, on real single files, it cannot).

## What it looks for
`discoverBmsSampleStructure(bytes, bmsResult, probeReport, rawExtraction, linkingReport, confirmationReport, opts)`
returns structure **hypotheses** only. The detectors are generic structural probes (not
Bosch-specific):

- **Integer tables** near the catalog end / before candidate regions — a fixed-width LE run that
  is monotonic-increasing (an `offset_table` / pointer table), near-constant (a
  `sample_count_table`), or sequential (a `channel_index_table`). Entry counts are related to the
  catalog channel count (`matches` / `near` / `mismatch`). Offset targets are checked for being
  in-file, but are **never** asserted to be verified sample-block starts.
- **Per-channel blocks** via a length-prefixed block walk (`[len][payload]`, uint16 and uint32
  headers). A block-run count ≈ catalog count is a `per_channel_blocks` hypothesis.
- **Interleaved layout** — testing `stride = channelCount × sampleWidth`: region coverage plus a
  genuinely-smooth, genuinely-varying lane (a noise lane is rejected). Reported as "consistent
  with N lanes", with lane-to-channel identity explicitly **not** established.
- **Compressed / sparse** — when no dense structure holds and entropy is high or the numeric
  volume is too small for `channelCount × min samples`. This is an honest verdict, not a failure.
- **Container / pointer region** — when raw candidates exist but are far fewer than the catalog
  count and no other structure matches.

The "1–2 raw vs 85 catalog" gap is explained as a hypothesis: an interleaved layout read as 1–2
lanes, per-channel blocks merged into one region by the probe, or an unresolved structure.

## Red lines (do NOT cross)
- Structure hypotheses only — never decoded telemetry, never physical values/units, never a
  channel name on a raw offset/lane.
- `convergence.sampleStructureConverged` stays `false`: Phase 3D-1 never confirms structure.
- `capabilities.timeSeries` / `physicalScaling` / `handlingCorrelation` stay `false`.
- The `confirmationFeed` may hand structure evidence to the 3D-0 confirmation criteria, but the
  cross-file corpus requirement is mandatory — so real single-file data stays `not_confirmed`. A
  found 85-block / 85-entry-table pattern is a hypothesis, never a confirmation.

## Clean-room
`.bmsbin` is an adapter, not the system core; the output flows back to the source-agnostic
descriptor. No real `.bmsbin` and no proprietary code/schema are bundled; tests use synthetic
fixtures only. The local reality-check reporter (`tools/bmsbin-local-probe-report.js`) emits only
sanitized aggregate statistics (counts / ranges / histograms / flags) — never raw bytes, sample
values, exact byte offsets, or any proprietary layout.
