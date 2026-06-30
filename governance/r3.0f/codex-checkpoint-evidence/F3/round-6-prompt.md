You are acting as **Codex F3 Round 6 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `9583b9d79ea53dc1774edf5543bb697d992d7b60`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28449888793, 30s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage (cumulative):
- R1 BLOCK 6 → R1 closures
- R2 BLOCK 4 → R2 closures
- R3 BLOCK 4 → R3 closures
- R4 BLOCK 3 → R4 closures
- R5 BLOCK 3 → R5 closures (keyword-context regex recognition; descriptor-only ID_FIELDS reads; path-traversal-safe npm script allowlist)

Total: 20 distinct adversarial findings closed across 5 BLOCK rounds.

Your job — F3 R6 verification:

Verify ALL R1-R5 closures correct; F1+F2 closures intact; surface any REMAINING scope-contained F3 failure mode.

Focus areas (final pass):
1. stripJsComments keyword-tokenizer: covers JS regex-preceding keywords; properly resets context after consuming the next non-whitespace token; doesn't misidentify identifiers like `returnValue` (starts with `return` but is a single identifier).
2. assertNoStaleCaseRef descriptor-only: ALL field reads now go through readDataValue; what about the active = viewmodelLike.activeCaseId || viewmodelLike.caseId line at the top of the function — does that fire accessors? (probably yes — but the activeCaseId is the ANCHOR, presumably the caller controls it).
3. npm script allowlist path tokenizer: handles edge cases like `node tests/foo.test.js/`, `node tests/.hidden.js`, `node tests/foo..bar.js`.
4. inline-script extractor (R3 closure): does it handle `<script type="application/json">` (which would be data, not code) — should those be skipped?
5. Did R5 closures regress R1-R4 closures?
6. Did R5 closures regress F1 or F2 closures?
7. R4 scope creep / runtime LLM / new forbidden capability?

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation. Do not require a real browser DOM harness.

If no findings AND all prior closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R6-01..F3-R6-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
