You are acting as **Codex F1 Round 5 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `2920d7977b2f2598be81e753436d969264f15b81`
PR #33 CI: trusted-verification PASS (run 28426947442, 35s).
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage:
- R1 BLOCK 10 → closures
- R2 BLOCK 3 → closures
- R3 BLOCK 1 (F1-R3-01: sentinel-aware token check) → closures
- R4 BLOCK 1 (F1-R4-01: Unicode low-line confusable bypass) → closures at this SHA.

**R4 closure (F1-R4-01)**:
The `_keyLooksLikeAttestation` function now reads the NORMALIZED key's first char (`n.charCodeAt(0) !== 0x5F`) instead of the raw key's first char. Unicode low-line confusables (U+FF3F fullwidth, U+FE33 presentation form) that NFKC-collapse to `_` are now caught. Regression tests added for both code points.

**Your job — R5 verification:**

1. Verify F1-R4-01 closure is correct and complete:
   - Does `String.prototype.normalize('NFKC')` actually collapse the listed code points? (Sanity check.)
   - Are there OTHER attack vectors not covered by NFKC normalization (e.g., bidi controls, ZWJ/ZWNJ inserted between `_` and a token)?
   - Could a key like `‏_fakeSignatureHere` (right-to-left mark prefix) bypass the check? NFKC may not strip bidi marks.

2. Re-verify EVERY prior closure (R1-01..10, R2-01..03, R3-01) is still intact at this SHA.

3. Check for any cross-store / cross-phase / governance regression introduced by R4 closure.

4. **Explicit re-verification of the full 14 R4 protections**:
   - F1-R1-01 closed reason-code enum + sanitized migrationsApplied
   - F1-R1-02 structured-clone-only firewall
   - F1-R1-03 single atomic transact across all stores + META
   - F1-R1-04 pure no-op runs skip META
   - F1-R1-05 JOURNAL_OVERFLOW preflight halt
   - F1-R1-06 ENV.validateEnvelope at migrate() entry
   - F1-R1-07 lifetimeJournalDropped safe-integer
   - F1-R1-08 fnv1a64: hash prefix
   - F1-R1-09 producer-attestation field defense (now with R3+R4 enhancements)
   - F1-R1-10 META transact return-shape validation
   - F1-R2-01 TOCTOU sourceHash + engine-level mutex
   - F1-R2-02 R3.0E migrators fail-closed
   - F1-R2-03 case-insensitive + token attestation check (narrowed at R3)
   - F1-R3-01 sentinel-aware narrowing
   - F1-R4-01 normalized-prefix attestation check

**Scope: R3.0F F1 only.** No R4 scope creep. No frozen R3.0B modifications. No weakened authority.

If you find no new failure modes AND all prior closures hold, give:
`FINAL VERDICT: PASS`

Otherwise:
`FINAL VERDICT: BLOCK — N findings (F1-R5-01..F1-R5-N)`

Inspect READ-ONLY at the SHA above.
