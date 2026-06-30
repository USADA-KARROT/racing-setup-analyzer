You are acting as **Codex F1 Round 13 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `069ab368a8c0235562395e5a8ecce2a92ab7a5f4`
PR #33 CI: trusted-verification PASS (run 28433100718, 36s).
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage (all closed at this SHA):
- R1 BLOCK 10 → closures
- R2 BLOCK 3 → closures
- R3 BLOCK 1 (sentinel-aware token check)
- R4 BLOCK 1 (normalized first-char)
- R5 BLOCK 1 (format-control strip)
- R6 BLOCK 1 (Unicode property classes)
- R7 BLOCK 1 (\\p{Default_Ignorable_Code_Point})
- R8 BLOCK 1 (whitespace + Braille blank)
- R9 BLOCK 1 (sourceHash via structuredClone)
- R10 BLOCK 2 (closure-captured charCodeAt/toString; _captureRow)
- R11 BLOCK 2 (Reflect.apply + String prototype captures)
- R12 BLOCK 1 (F1-R12-01: engine-level fromVersion > targetVersion hard gate BEFORE migrator runs) → closures at this SHA.

**R12 closure**:
`_computeStoreWork` now checks `if (fromVersion > mg.targetVersion)` immediately after `fromVersion` is validated, BEFORE calling `mg.migrate(san.value)`. On match: push rejected entry with `UNSUPPORTED_FUTURE_VERSION`, increment counts.rejected, `continue`. Migrator is never invoked. Custom hostile migrator returning `ok:true` with downgraded `schemaVersion` cannot overwrite future records. Tests verify: persisted record unchanged (still v99), journal entry rejected/UNSUPPORTED_FUTURE_VERSION, migrator not invoked.

**Your job — R13 verification:**

1. Verify F1-R12-01 closure is correct and complete; not regressing earlier closures.
2. Re-verify every prior closure is still intact at this SHA.
3. Search for any REMAINING scope-contained F1 failure mode.

**Scope: R3.0F F1 only.**

- Do NOT re-open R3.0C/D/E.
- Do NOT request R4 features.
- Do NOT list temp fixture leak as F1 product-logic BLOCK.
- Do NOT misclassify legitimate attestation vocabulary (`lapAuthority`, `distanceAuthority`, `projectionSignature`, `experimentVerified`, `signedAt`) as secrets.
- Do NOT issue BLOCK based on style, preference, or unproven speculation.

If no new findings AND all prior closures hold:
`FINAL VERDICT: PASS`

Otherwise:
`FINAL VERDICT: BLOCK — N findings (F1-R13-01..F1-R13-N)`

Inspect READ-ONLY at the SHA above.
