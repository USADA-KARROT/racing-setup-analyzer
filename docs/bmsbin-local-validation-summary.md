# `.bmsbin` Local Validation Summary — Phase 3C-1

Reality check of the clean-room hypothesis pipeline
(`parseBms → probeBmsBinary → extractBmsRawCandidates → linkBmsRawCandidates →
buildTelemetryMetadata`) against a **real** local `.bmsbin` dataset, to decide whether the
hypothesis layer holds on real data before anything is built on top of it.

> ⚠️ **Statistics only.** No raw bytes, no sample values, no byte offsets, no channel raw
> data, no team/track/car identifiers. Real `.bmsbin` files were read locally and were
> **not** committed. Everything below is aggregate counts / ranges / histograms produced by
> `tools/bmsbin-local-probe-report.js`.

---

## Run context (no proprietary content)
- Date: 2026-06-17
- Files tested: **65**
- Source: a single local F3 chassis-logger export set (one logger configuration)
- Method: per file, read only a 2 MB head and analyse a 1 MB post-catalog scan window
  (representative sample; keeps the whole-dataset run ~30 s). Output is the sanitized
  aggregate; per-file raw output was never persisted.

## Aggregate results (sanitized)
- Catalog detected: **65 / 65**
- Channel-count range: **[85, 85]** (identical across every file → one fixed logger config)
- Candidate numeric region found: **65 / 65**
- Candidate-region *count* per file: **min 19, max 107, mean ≈ 41.8** (high variance)
- Raw series candidates found: **65 / 65**
- Raw-series-count range: **[1, 2]**
- Timebase candidate found: **65 / 65**
- Best encoding hypothesis histogram: **{ int16le: 62, int32le: 3 }**
- Channel identity confirmed: **0 / 65** (expected 0 at this stage)
- Canonical preview available: **0 / 65** (expected 0)
- Link-status histogram: **{ linking_hypotheses_only: 65 }**

## The 8 reality-check questions
1. **Catalog detected reliably across files?** Yes — 65/65, and the channel count is *exactly*
   85 in every file. The catalog reader is rock-solid on this dataset.
2. **Candidate region positions roughly consistent across files?** Partly. A numeric region is
   found in 65/65, but the *number* of candidate regions swings from 19 to 107 (mean ≈ 42).
   Region detection fires everywhere but does not yet converge on a stable structural layout.
3. **Raw series candidates appear reliably?** Yes — at least one in every file (1–2 per file).
4. **Encoding hypothesis consistent?** Strongly. `int16le` dominates (62/65); 3 files prefer
   `int32le`. Consistent enough to treat int16le as the leading hypothesis, not yet a fact.
5. **Timebase clue stable?** Yes — a monotonic-counter timebase candidate appears in 65/65.
6. **Channel count vs raw-series count — sensible relationship?** This is the key gap. The
   catalog advertises **85** channels, but the raw layer surfaces only **1–2** coarse series
   candidates. We are detecting *that* sample data exists, not resolving individual channels.
   No claim of per-channel extraction is justified.
7. **Do the link hypotheses look like noise, or repeatable?** Repeatable in *status* — all 65
   land in `linking_hypotheses_only` with identical structure and zero confirmed identities.
   That uniformity is the honesty layer working, not evidence of decoding.
8. **Safe to move toward confirmed decoding yet?** No. Identity confirmed 0/65, canonical
   preview 0/65, region count unstable, and raw-series ≪ channel count. Still too early.

## Verdict
- [x] **Foundational signals are stable; structural resolution is not.** Catalog (85 ch),
      timebase, encoding lean, and "sample data is present" are consistent across all 65 files.
      But candidate-region count is highly variable (19–107) and the raw layer resolves only
      1–2 coarse series against 85 catalog channels.
- [x] **Stay in the probe / hypothesis layer. Do not build decoding on top of this yet.** The
      honesty discipline held perfectly on real data (0 confirmed identities, 0 canonical
      previews, status pinned to `linking_hypotheses_only`), which is exactly the desired
      outcome for a reality check.
- Recommended next focus (Phase 3D-0, *criteria only*): tighten candidate-region stability and
  move from "a region exists" toward "N stable per-channel series," and write down the explicit
  criteria a mapping must meet before it could ever be called *confirmed*. No value conversion,
  no model-vs-actual overlay, no Kus until those criteria exist and are met on real data.

## Tooling note
`tools/bmsbin-local-probe-report.js` reads only a 2 MB file head and caps the probe scan to a
1 MB window (`scanWindowBytes`), so the full 65-file dataset runs in ~30 s without loading any
multi-MB log in full. A handful of files (6/65) take 2–4 s each; the rest are sub-second. The
tool emits only the sanitized fields whitelisted in `REPORT_FIELDS`.
