You are acting as **Codex F3 Round 3 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `94f662522be3daf77342b75e23f6f31048e70724`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28448171715, 40s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage:
- R1 BLOCK 6 findings → F3-R1-01..06 closures (regex strip + literal-only flags, full truthy-non-boolean class, expanded stale-ref + production-shape, instrumented N-doubling, complete XSS pattern coverage, anchored npm-script allowlist)
- R2 BLOCK 4 findings → F3-R2-01..04 closures (balanced-brace webPreferences extract, object-shape caseAssociation + all-own-property recursion at depth 4, migrator-invocation-count scaling probe, single/double/unquoted x-html scan)

Your job — F3 R3 verification:

Verify all R1 + R2 closures are correct and that F1+F2 closures remain intact. Adversarially probe each closure for remaining bypass surface.

Focus areas:
1. F3-R2-01 balanced-brace extract: handle template literals with `${...}` inside the webPreferences body? Handle escaped quotes inside strings?
2. F3-R2-02 stale-ref gate: depth=4 sufficient? Object.create(null) values handled? Symbol keys, Maps/Sets ignored or recursed into?
3. F3-R2-03 migrator-call count: catches re-call AND linear-scaling regressions; missing any other quadratic class? (e.g., quadratic work inside a single migrator call)
4. F3-R2-04 x-html: 3 patterns cover all HTML attribute forms — could a NON-HTML embedded template (e.g., inside a <script>...</script> with x-html string concatenation) bypass?
5. Did the R2 closures regress R1 closures?
6. Did the R2 closures regress F1 (R1-23) or F2 (R1-3) closures?
7. Did the R2 closures touch any frozen-path code (R3.0B persistence / R3.0C/D/E contracts)?
8. R4 scope creep / runtime LLM / new forbidden capability?
9. Are the test-side hardening probes themselves robust against a regression that adjusts the test rather than the production code?

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation. Do not require a real browser DOM harness.

If no findings AND all prior closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R3-01..F3-R3-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
