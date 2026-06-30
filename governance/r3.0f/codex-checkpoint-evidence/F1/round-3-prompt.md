You are acting as **Codex F1 Round 3 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `acbc4e69623be810e8d6909d5145d1efbb123459`
PR #33 CI: trusted-verification PASS (run 28426389010, 39s).
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

This is Round 3. Round 1 returned BLOCK with 10 findings (F1-R1-01..10); Round 2 returned BLOCK with 3 findings (F1-R2-01..03). All 13 findings have closures at this SHA.

**Round 2 closures specifically:**

- **F1-R2-01** TOCTOU + concurrency: engine now captures a `sourceHash` per record at list time and re-verifies it inside the atomic `backend.transact().compute()` against the value the transact re-reads (declared in `reads:`). Prior journal/state hashes also re-checked atomically. Mismatch → throws `CONCURRENT_WRITE_DETECTED:store:key` (or `CONCURRENT_JOURNAL_WRITE_DETECTED` / `CONCURRENT_STATE_WRITE_DETECTED`) → engine returns `BACKEND_REJECTED`. Engine-level Promise mutex (`migrateChain`) also serializes concurrent `migrate()` calls. `sourceHash` is stripped from the actual writes before they land (engine-internal only, never persisted).
- **F1-R2-02** R3.0E migrators (experiment/outcome/timeline/followup) fail closed at `migrate()` entry when their contract validator is unavailable — return `{ok:false, reason:'NO_MIGRATION_PATH'}`. Regression tests use `child_process` to isolate the `Module._resolveFilename` mutation.
- **F1-R2-03** producer-attestation key check normalized via `String(k).normalize('NFKC').toLowerCase()` AND token-based (rejects any normalized key whose substring contains `authoritative`, `producerattested`, `attested`, `verified`, `signature`, `proof`, or `authority`). Case variants and token-bearing camelCase keys now refused with `PRODUCER_ATTESTATION_REFUSED`.

**Your job — R3 verification:**

1. For each R2 closure (and re-verifying each R1 closure is still intact), verify the fix is correct, complete, not trivially bypassable, and not introducing a NEW attack surface.
2. Look for previously-missed failure modes — particularly:
   - The new `reads:` array in `backend.transact()` includes both the data keys AND META keys. Does the engine guarantee the read order matches what `compute()` expects (`readValues[0..n-1]` = data keys, `readValues[n]` = journal, `readValues[n+1]` = state)?
   - Does the engine still correctly handle a write whose `sourceHash` is `null` (e.g., the original was undefined / corrupt)?
   - Can a hostile migrator return a record that mutates between sanitize and the persist write (since sanitize runs on plain JSON, this shouldn't happen, but verify)?
   - Token-based attestation key check: does any LEGITIMATE field name in R3.0B/R3.0C/R3.0D/R3.0E records contain one of the attestation tokens by coincidence (e.g., `experimentVerified`, `dataAuthority`, `signedAt`)? If so, those records would now be rejected unnecessarily — this is a NEW false-positive risk introduced by R2-03.
   - Engine-level `migrateChain`: if the prior `migrate()` rejects with an exception, does `next.then(()=>{}, ()=>{})` properly swallow the rejection so the chain keeps going?
   - The new `priorJournal` hash check inside `compute()`: priorJournal could be a normalized array (when it was an object `{entries: []}`) — verify the hash matches BOTH the engine's loaded form and the freshly-read form.

3. Search for new R3 issues across the engine, contract, migrators, governance state, and tests.

**Scope: R3.0F F1 only.** Do NOT suggest R4 features. Do NOT suggest modifying the frozen R3.0B portable case-record schema. Do NOT suggest weakening producer attestation. Do NOT treat rehydrated/migrated plain objects as authoritative.

**Frozen semantics F1 must not weaken** (same list as R2 prompt).

Give each finding ID **F1-R3-NN** with file + line range, attack scenario / correctness failure, current behavior, severity, specific minimal fix.

End with single line: `FINAL VERDICT: PASS` or `FINAL VERDICT: BLOCK — N findings (F1-R3-01..F1-R3-N)`.
