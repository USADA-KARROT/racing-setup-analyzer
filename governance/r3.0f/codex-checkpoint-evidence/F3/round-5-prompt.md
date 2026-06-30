You are acting as **Codex F3 Round 5 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `9207e946f0d2db38df5a17fcabc4a3bd775938fd`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28449263678, 34s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage (cumulative):
- R1 BLOCK 6 → R1 closures
- R2 BLOCK 4 → R2 closures
- R3 BLOCK 4 → R3 closures (lexical-scanner stripJsComments, Proxy-wrapped record-array reads, inline-script DOM-sink coverage, tighter node allowlist)
- R4 BLOCK 3 → R4 closures (regex-literal-aware scanner; same scanner now in hardening-05; Reflect.ownKeys + descriptor-only recursion in assertNoStaleCaseRef)

Total: 17 distinct adversarial findings closed across 4 BLOCK rounds.

Your job — F3 R5 verification:

Verify ALL R1+R2+R3+R4 closures are correct; F1 (R1-23) + F2 (R1-3) closures intact; surface any REMAINING scope-contained F3 failure mode.

Focus areas:
1. stripJsComments lexical scanner: regex-literal handling complete? Edge cases: `/=` could be div-equal OR regex; division like `a/b` correctly NOT treated as regex; unterminated regex bails out without consuming subsequent lines as regex; template-literal `${...}` interpolation handled?
2. assertNoStaleCaseRef Reflect.ownKeys + descriptor-only: covers all own-key kinds; doesn't fire accessors; Symbol keys included with path label; depth-4 sufficient for production data?
3. inline-script extractor: handles `<script>` with attributes like `type="module"` or `nomodule`; handles `<script>` containing `</script>` strings in templates?
4. node allowlist: `node tests/foo.js` allowed, but does `node tests/../../etc/passwd` (path traversal) pass the [\w@\-./]+ char class? Should we reject `..` segments?
5. Did any R4 closure regress R1/R2/R3 closures?
6. Did any R4 closure regress F1 (R1-23) or F2 (R1-3) closures?
7. Did any R4 closure touch any frozen-path code?
8. R4 scope creep / runtime LLM / new forbidden capability?

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation. Do not require a real browser DOM harness.

If no findings AND all prior closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R5-01..F3-R5-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
