You are acting as **Codex F3 Round 4 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `c95442a8599dcbf8277a4d10be017f31a26331b9`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28448748765, 30s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage:
- R1 BLOCK 6 → R1 closures (regex+strip+literal-only, full truthy class, expanded stale-ref + production-shape, instrumented N-doubling, complete XSS pattern coverage, anchored npm-script allowlist)
- R2 BLOCK 4 → R2 closures (balanced-brace webPreferences, object-shape caseAssociation + all-own-property recursion depth 4, migrator-invocation-count scaling, single/double/unquoted x-html)
- R3 BLOCK 4 → R3 closures (lexical-scanner stripJsComments, Proxy-wrapped record-array reads, inline-script DOM-sink coverage, tighter node allowlist)

Total: 14 distinct adversarial findings closed across 3 BLOCK rounds.

Your job — F3 R4 verification:

Verify all R1+R2+R3 closures are correct; F1 (R1-23) + F2 (R1-3) closures intact; surface any REMAINING scope-contained F3 failure mode.

Focus areas:
1. F3-R3-01 stripJsComments lexical scanner: handles ', ", ` correctly; respects escape sequences; doesn't mishandle regex literals (e.g., `/foo\/bar/`); doesn't get confused by template-literal `${...}`?
2. F3-R3-02 Proxy-wrapped read-counter: does the Proxy itself slow the engine down such that the linear bound is unreliable? Could a quadratic regression skip array indexing via for...of iterator instead?
3. F3-R3-03 inline-script extraction: handles multi-script blocks; nested `</script>` in templates; mixed-content; attributes with attributes; preserves line numbering for error messages.
4. F3-R3-04 tightened node allowlist: covers `node tests/foo.js` (allowed) AND blocks `node -e require(...)` (denied); does the dash-flag rejection ALSO block `node-something` (no — only `node ` followed by `-`, so this is correct); confirm `node\t-e` (tab) is also blocked.
5. Did R3 closures regress R1 or R2 closures?
6. Did R3 closures regress F1 (R1-23) or F2 (R1-3) closures?
7. Did R3 closures touch any frozen-path code?
8. R4 scope creep / runtime LLM / new forbidden capability?

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation. Do not require a real browser DOM harness.

If no findings AND all prior closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R4-01..F3-R4-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
