You are acting as **Codex F1 Round 10 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `a25545885f3f8732512f144147b5e7f5fc6c9c31`
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
PR #33 CI: trusted-verification PASS (run 28428570037, 34s).
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage:
- R1 BLOCK 10 → closures
- R2 BLOCK 3 → closures
- R3 BLOCK 1 (sentinel-aware narrowing)
- R4 BLOCK 1 (normalized first-char)
- R5 BLOCK 1 (format-control strip)
- R6 BLOCK 1 (Unicode property classes)
- R7 BLOCK 1 (\\p{Default_Ignorable_Code_Point})
- R8 BLOCK 1 (whitespace + Braille blank)
- R9 BLOCK 1 (sourceHash via structuredClone — toJSON cannot fire) → closures at this SHA.

**R9 closure (F1-R9-01)**:
`_sanitizedHash(v)` replaces `_sourceHash`. structuredClone-clones the input BEFORE JSON.stringify so inherited `toJSON` traps cannot fire. Handles objects, arrays (priorJournal), plain objects (priorState), and null/undefined uniformly. Sanitization failure → null. Probe verified `fired=0` for prototype-chain toJSON on the list path.

**Your job — R10 verification:**

1. Verify F1-R9-01 closure is complete and correct.
2. Search hard for ANY remaining failure mode in the engine, contract, migrators, governance state, or tests:
   - Could a hostile migrator return a record whose POST-MIGRATION serialization triggers toJSON? Where in the engine does serialization happen on the migrator's return value? Verify each call site uses structuredClone first.
   - Could the engine read a value from the backend where the value is NOT cloned by the backend (some custom backend) AND we use it without structuredClone? Look at ALL callsites of `row.value` / `readValues[i]`.
   - Could `_hash()` itself be tampered with via String.prototype rebinding? It uses `str.charCodeAt(i)` — closure-captured?
   - Could the sentinel-token attestation check be bypassed via still-uncovered Unicode? (Final review.)
3. Re-verify EVERY prior closure (R1-01..10, R2-01..03, R3-01, R4-01, R5-01, R6-01, R7-01, R8-01) at this SHA.
4. Final sweep on the non-attestation surface:
   - TOCTOU sourceHash + engine-level migrateChain
   - atomic transact (data + META in one)
   - idempotency (pure no-op skips META)
   - JOURNAL_OVERFLOW preflight
   - envelope structural validation
   - lifetimeJournalDropped safe-integer
   - fnv1a64 hash prefix
   - META return shape
   - R3.0E migrators fail-closed without contract
   - frozen R3.0B persistence untouched
   - comparison authority untouched
   - timeline append-only untouched
   - no R4 scope
   - i18n / governance / CI integrity

**Scope: R3.0F F1 only.**

If no new findings AND all prior closures hold:
`FINAL VERDICT: PASS`

Otherwise:
`FINAL VERDICT: BLOCK — N findings (F1-R10-01..F1-R10-N)`

Inspect READ-ONLY at the SHA above.
