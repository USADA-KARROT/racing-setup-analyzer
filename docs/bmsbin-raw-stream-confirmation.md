# `.bmsbin` Raw Stream Confirmation Criteria (Phase 3D-2)

Scope notes. **This phase takes the Phase 3D-1 structure hypotheses and applies a STRICT bar to
decide whether a raw stream's STRUCTURE can be confirmed.** It is not a decoder. It does NOT
determine channel identity, does NOT name a stream `speed`/`accy`/`yaw`, does NOT scale values
or assign units, does NOT chart, overlay, or do model-vs-actual. Timebase is only a **pre-check**
here (never confirmed — that is Phase 3E-1).

```
structure hypotheses → raw stream confirmation criteria → confirmed / not-confirmed decision
```

## What "raw stream confirmed" is — and is not
- **It IS**: the system can say, against explicit criteria, that a raw stream's *structure* is
  confirmed (per-channel blocks with stable equal-length boundaries, or a validated interleaved
  layout) — backed by a cross-file corpus.
- **It is NOT**: channel identity, a physical/scaled value, a unit, a timebase, a chart, or
  telemetry. A confirmed raw stream *structure* is the most this phase can ever assert.

## The bar (strict, conservative)
A raw stream's structure can only reach `confirmed_structure` when ALL hold:
1. sample-structure evidence is strong (a per-channel-blocks or interleaved hypothesis from 3D-1);
2. raw stream boundaries are stable / reproducible;
3. the raw stream count relates sensibly to the catalog channel count (matches / near);
4. sample count is consistent (or explainable);
5. block length is consistent;
6. the encoding hypothesis is consistent;
7. **a cross-file corpus is present and stable** (≥ 2 files) — a single file can NEVER confirm a stream;
8. there is no competing, stronger, incompatible hypothesis.

Insufficient on their own (→ `candidate_only` / `confirmable` / `rejected`, never `confirmed`):
a single file; a raw candidate; an 85/85 block count without consistency; smoothness or entropy;
a table (a table is raw-stream *boundary* evidence, not a stream); a container/pointer region.

### Per-hypothesis criteria
- **per_channel_blocks**: count matches/near catalog, reproducible equal-length boundaries,
  consistent sample count & encoding, plus the corpus gate. Even confirmed → only "raw stream
  structure confirmed", never channel identity or physical values.
- **interleaved_channels**: relies on 3D-1's strict in-file checks (coverage, multi-lane
  smoothness, contiguous-jumpy, row count, lane count == channel count) plus the corpus gate.
- **offset / index table**: rejected as a raw stream — it is boundary evidence only.

### Status ladder
`candidate_only` (present, in-file incomplete) < `confirmable` (in-file strong, no corpus yet) <
`confirmed_structure` (in-file strong AND cross-file corpus). `rejected` = not itself a raw stream.

## Timebase is only a pre-check
This phase may report `timebaseRelationCandidate: true`. It must NOT report a confirmed timebase —
timebase confirmation is Phase 3E-1.

## Red lines (do NOT cross)
- No channel identity, no naming a stream `speed`/`accy`/`yaw`/`steer`.
- No physical scaling, no units, no telemetry chart, no overlay, no Kus, no lap segmentation, no
  setup recommendation.
- `capabilities.timeSeries` / `physicalScaling` / `handlingCorrelation` stay `false` on every path.
- The confirmation feed into `bms-confirmation.js` is corpus-gated (`opts.corpus.fileCount ≥ 2`) —
  a single real file (no corpus) can never flip raw streams to confirmed, and it never touches
  identity / scaling / decode-grade capabilities.

## Clean-room
`.bmsbin` is an adapter; the output flows back to the source-agnostic descriptor. No real
`.bmsbin`, raw bytes, sample values, byte offsets, or proprietary schema/layout are committed;
tests use synthetic fixtures only. The local reality-check reporter emits only sanitized
aggregate statistics (statuses / counts / ranges / flags), and a single real file (no corpus)
always reports zero confirmed raw streams — the honest single-file reality.
