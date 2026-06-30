You are acting as **Codex F1 Round 14 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `b5acabbb1818e7fe9c9c4ef80a9e027aa20c02c2`
PR #33 CI: trusted-verification PASS (run 28433386979, 26s).
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage (all closed at this SHA): R1 (10) → R2 (3) → R3 (1) → R4 (1) → R5 (1) → R6 (1) → R7 (1) → R8 (1) → R9 (1) → R10 (2) → R11 (2) → R12 (1) → R13 (1) → closed.

**R13 closure (F1-R13-01)**:
After the producer-attestation check, the engine now requires `postSan.value.schemaVersion` to be a finite non-negative integer EQUAL to `mg.targetVersion`. Missing/non-numeric/fractional/negative/below-target all journal `POST_MIGRATION_INVALID` with specific limitation tags (`post_migration_schema_version_invalid` / `post_migration_schema_version_below_target` / `version_overshoot`). The source record is never overwritten with a corrupted schemaVersion.

**Your job — R14 verification:**

1. Verify F1-R13-01 closure is complete and correct.
2. Re-verify every prior closure (R1-01..R12-01) is intact at this SHA.
3. Look for any REMAINING scope-contained failure mode in the engine, contract, migrators, governance state, or tests.

**Scope: R3.0F F1 only.** No R4 scope creep. No frozen R3.0B modification. No weakened authority. Do not list temp fixture leak as F1 BLOCK. Do not misclassify legitimate camelCase attestation vocabulary as secrets.

If no new findings AND all prior closures hold:
`FINAL VERDICT: PASS`

Otherwise:
`FINAL VERDICT: BLOCK — N findings (F1-R14-01..F1-R14-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
