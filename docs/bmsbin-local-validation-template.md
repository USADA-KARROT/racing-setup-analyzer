# `.bmsbin` Local Validation Report — Template (Phase 3C-1)

A reusable template for recording whether the hypothesis layer holds on **real** `.bmsbin`
files. Fill it from the sanitized output of
`node tools/bmsbin-local-probe-report.js <your-bmsbin-dir>`.

> ⚠️ Statistics only. **Never** paste raw bytes, sample values, byte offsets, channel raw
> data, or any proprietary content into this report or the repo. Real `.bmsbin` files stay
> on the local machine.

---

## Run context (no proprietary content)
- Date:
- Files tested: N
- Source: (describe generically, e.g. "local F3 logger exports" — no team/track identifiers needed)

## Aggregate results (paste the tool's sanitized JSON or fill below)
- Catalog detected: __ / N
- Candidate numeric region found: __ / N
- Raw series candidates found: __ / N
- Timebase candidate found: __ / N
- Best encoding hypothesis histogram: { int16le: __, … }
- Channel-count range: [min, max]
- Raw-series-count range: [min, max]
- Channel identity confirmed: __ / N  (expected 0 in 3C-0/3C-1)
- Canonical preview available: __ / N  (expected 0)
- Link-status histogram: { linking_hypotheses_only: __, … }

## The 8 reality-check questions
1. Catalog detected reliably across files?
2. Candidate region positions roughly consistent across files?
3. Raw series candidates appear reliably?
4. Encoding hypothesis consistent (e.g. int16le everywhere)?
5. Timebase clue stable?
6. Channel count vs raw-series count — any sensible relationship?
7. Do the link hypotheses look like noise, or is there a repeatable pattern?
8. Is it safe to move toward *confirmed* decoding yet, or still too early?

## Verdict
- [ ] Hypotheses hold up → consider Phase 3D-0 (confirmed-mapping criteria)
- [ ] Hypotheses shaky / inconsistent → stay in probe/hypothesis layer; do not build on top
- Notes (sanitized):
