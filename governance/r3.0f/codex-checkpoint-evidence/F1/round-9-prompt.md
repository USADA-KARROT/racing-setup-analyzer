You are acting as **Codex F1 Round 9 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `dcbe06c2ce3bac54eb608561004075db9cba93cb`
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
PR #33 CI: trusted-verification PASS (run 28428241620, 25s).
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage:
- R1 BLOCK 10 → closures
- R2 BLOCK 3 → closures
- R3 BLOCK 1 (sentinel-aware narrowing)
- R4 BLOCK 1 (normalized first-char)
- R5 BLOCK 1 (format-control strip)
- R6 BLOCK 1 (\\p{Cf}+\\p{Mn}+Hangul-fillers)
- R7 BLOCK 1 (\\p{Default_Ignorable_Code_Point})
- R8 BLOCK 1 (whitespace + Braille blank) → at this SHA.

**R8 closure (F1-R8-01)**:
`_DEFANG_RE = /[\\p{Default_Ignorable_Code_Point}\\p{Mn}\\p{Cc}\\p{Cs}\\p{White_Space}⠀]/gu`. Smoke-verified SPACE / NBSP / NNBSP / ideographic space / Braille blank U+2800 / line separator U+2028 all rejected; legitimate `lapAuthority` / `distanceAuthority` / `experimentVerified` still accepted.

**Your job — R9 verification:**

1. Verify F1-R8-01 closure is complete and correct.
2. Look hard for any REMAINING Unicode key-obfuscation vector:
   - Any visually-blank or token-splitting characters NOT in DICP/Mn/Cc/Cs/White_Space/U+2800?
   - Could a hostile migrator use a NUL-terminated buffer trick to truncate the key client-side?
   - Could overlong UTF-8 / lone-surrogate JSON escapes (`"\uD800"`) bypass — though our path goes through structuredClone+JSON.stringify(JSON.parse(...)) which normalizes.
3. Cross-check ALL prior closures (R1-01..10, R2-01..03, R3-01, R4-01, R5-01, R6-01, R7-01) are still intact at this SHA.
4. Final sweep on non-attestation aspects:
   - TOCTOU sourceHash and engine-level migrateChain
   - atomic transact (data + META in one transact)
   - idempotency (pure no-op runs skip META)
   - JOURNAL_OVERFLOW preflight
   - envelope structural validation
   - lifetimeJournalDropped safe-integer
   - fnv1a64 hash prefix
   - META return shape validation
   - R3.0E migrators fail-closed without contract
   - R3.0B persistence untouched
   - comparison authority untouched
   - timeline append-only untouched
   - no R4 scope
   - i18n parity preserved
   - CI integrity preserved

**Scope: R3.0F F1 only.**

If no new findings AND all prior closures hold:
`FINAL VERDICT: PASS`

Otherwise:
`FINAL VERDICT: BLOCK — N findings (F1-R9-01..F1-R9-N)`

Inspect READ-ONLY at the SHA above.
