You are acting as **Codex F1 Round 8 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `791cc9275ee293a91970085e38ed053b71a1ed41`
PR #33 CI: trusted-verification PASS (run 28427942308, 33s).
Note: in addition to R7-01 closure, this SHA also pre-emptively closes the C0/C1 ASCII control + isolated-surrogate vector by extending the defang to `[\p{Default_Ignorable_Code_Point}\p{Mn}\p{Cc}\p{Cs}]`. 4 new regression tests confirm NULL/ESC/DEL/C1 splices are rejected.
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage:
- R1 BLOCK 10 → closures
- R2 BLOCK 3 → closures
- R3 BLOCK 1 (sentinel-aware token check)
- R4 BLOCK 1 (normalized first-char check)
- R5 BLOCK 1 (strip format controls before NFKC)
- R6 BLOCK 1 (Unicode property classes)
- R7 BLOCK 1 (\\p{Default_Ignorable_Code_Point} replaces hand-picked ranges) → at this SHA.

**R7 closure (F1-R7-01)**:
`_DEFANG_RE` now uses `\\p{Default_Ignorable_Code_Point}` which by definition covers ALL Unicode-spec default-ignorable code points (Cf format chars + Hangul fillers + Cn unassigned DICPs U+2065/U+FFF0..U+FFF8/U+E0000/U+E0002..U+E001F/U+E0080..U+E00FF/U+E01F0..U+E0FFF + a few others), PLUS `\\p{Mn}` for combining marks not in DICP. Smoke-verified 6 newly-uncovered ranges plus all prior R5/R6 cases plus 4 legitimate camelCase contract fields.

**Your job — R8 verification:**

1. Verify F1-R7-01 closure is complete and correct.
2. Check whether there are ANY remaining Unicode bypass vectors:
   - Are there code points that are NEITHER in DICP NOR in Mn but could still be invisible / used to break tokens? (Look for Lo / Cc / Cs categories that survive both filters.)
   - Could a hostile migrator use ASCII control characters U+0000..U+001F (NULL, BEL, ESC) which are NOT in DICP/Mn? These are in Cc category. They survive the strip; would they bypass the sentinel check? E.g. `_authoritative` — the `_` prefix is preserved, the token isn't matched because `_authoritative` doesn't contain `authoritative`. **THIS IS A REAL BYPASS.**
   - Could C0 (U+0000..U+001F) and C1 (U+0080..U+009F) controls survive both DICP and Mn checks?
   - Should the engine ALSO strip `\\p{Cc}` (control characters)?

3. Re-verify all prior closures at this SHA.

4. Final sweep on the non-attestation aspects: TOCTOU, atomic transact, idempotency, no R4 scope, no comparison-authority creep, no frozen-path modification, governance integrity, i18n parity, CI.

**Scope: R3.0F F1 only.** Producer-attestation defense must catch ALL hostile Unicode key obfuscations.

If new bypasses found:
`FINAL VERDICT: BLOCK — N findings (F1-R8-01..F1-R8-N)`

Otherwise:
`FINAL VERDICT: PASS`

Inspect READ-ONLY at the SHA above.
