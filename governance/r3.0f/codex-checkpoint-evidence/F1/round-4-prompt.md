You are acting as **Codex F1 Round 4 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `a3bc0c46f9c8fe3f1f8f86bf3e06c3be3a1e8cc3`
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
PR #33 CI: trusted-verification PASS (pending — verify with `gh pr checks 33` if you have access).
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage: R1 BLOCK 10 → R1 closures → R2 BLOCK 3 → R2 closures → R3 BLOCK 1 → R3 closures at this SHA.

**R3 closure (F1-R3-01)**:
The producer-attestation token check is now sentinel-aware:
- exact (NFKC + lowercase) match to one of the 15 `PRODUCER_ATTESTATION_FIELDS` sentinel names → REJECT
- key starts with `_` AND normalized form contains an attestation TOKEN (`authoritative`, `producerattested`, `attested`, `verified`, `signature`, `proof`, `authority`) → REJECT
- otherwise → ACCEPT

This removes the false-positive risk against legitimate R3.0C field names like `lapAuthority`, `distanceAuthority`, `normalizationAuthority`, `projectionSignature`, `experimentVerified`, `signedAt`. Tests added: legitimate nested R3.0C-shaped record migrates; `_customAuthority` / `___signature` / `_fakeSignatureHere` still rejected.

**R3 verification notes from prior round (per the reviewer):**
- transaction read ordering correct for shipped backends
- migrateChain survives rejected runs
- sourceHash internal and stripped before persistence
- prior journal `{entries: []}` object form normalizes consistently for hashing
- R3.0E migrators all fail closed when validators unavailable

**Your job — R4 verification:**

1. Verify F1-R3-01 closure is correct, complete, not regressing earlier closures.
2. Sweep for any remaining failure modes in the engine, contract, migrators, governance state, and tests.
3. Particularly check:
   - Is the sentinel rule "key starts with `_`" sufficient? Could an attacker use a Unicode-confusable character that NFKC normalizes to `_` but whose original `k.charCodeAt(0)` is NOT 0x5F? The check `k.charCodeAt(0) !== 0x5F` is on the ORIGINAL key, before normalization. Should the check use the NORMALIZED first char instead?
   - Sentinel allowlist names like `_authoritativeSession` end in arbitrary suffix; the exact-name check looks for them post-normalize. But a hostile name like `_AUTHORITATIVESESSIONX` (extra suffix) would: (a) lowercase to `_authoritativesessionx`, (b) NOT exact-match `_authoritativesession`, (c) start with `_` so the token loop runs and `authoritative` matches inside → REJECT. Good. Verify by mental test.
   - The `_keyLooksLikeAttestation` returns false for empty key. Could an empty key ever appear in real data? (Object keys must be strings; an empty-string key is technically valid JSON.) Confirm no bypass.
   - **Re-verify all prior closures still hold** at this SHA.

4. Look for cross-store / cross-phase regression in the engine that previous rounds didn't probe.

Give each finding ID **F1-R4-NN** with file + line range, attack scenario, current behavior, severity, minimal fix.

End with single line: `FINAL VERDICT: PASS` or `FINAL VERDICT: BLOCK — N findings (F1-R4-01..F1-R4-N)`.

Inspect READ-ONLY at the SHA above.
