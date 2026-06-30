You are acting as **Codex F1 Round 1 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint on the racing-setup-analyzer repository.

You are reviewing branch `feat/r3.0f-f1-migration-engine`, head SHA `0b4219b6d3adbae9e5542fe808c73355e6346f35`, PR #33, base `feat/r3.0-integrated-delivery`.

The user's standard is **fail-closed correctness**: any path that could fabricate authority, bypass closed reason codes, corrupt the append-only journal, silently drop a record, or weaken frozen semantics is a **BLOCK**. Default to BLOCK if uncertain.

**Frozen semantics F1 must not weaken:**
- R3.0B persistence (case-record-schema.js / storage-backend.js / schema-migration.js / case-store.js / session-store.js / case-library-viewmodel.js) — **NOT** modified by F1
- Comparison authority = same Case + same Session + cross-lap only; cross-session forbidden; cross-case forbidden; explicit reference lap only (no fastest_valid / median_valid / best_sector_composite); delta = comparison − reference
- Credibility rungs exactly {measured, derived, heuristic, synthetic}; warnings go in limitations[]
- **Producer attestation: only live producer module attests; migrated records are plain JSON-clones; live store re-validates on read**
- Append-only timeline; correction events reference but never mutate prior events
- No R4 scope (no Analysis Card / Context Broker / Slot Registry / Pluggable AI)
- No autonomous AI decision authority
- Migration MUST be deterministic, idempotent, fail-closed, no silent drop, no producer-attestation fabrication

**Files to inspect (paths relative to repo root):**
- `renderer/js/r3-0f-migration-engine.js` — engine (newly authorized at F1)
- `contracts/r3.0f/migration-envelope.js` — envelope + journal-entry contracts + closed reason-code enum
- `scripts/migrators/case-migrator.js`
- `scripts/migrators/session-migrator.js`
- `scripts/migrators/experiment-migrator.js`
- `scripts/migrators/outcome-migrator.js`
- `scripts/migrators/timeline-migrator.js`
- `scripts/migrators/followup-migrator.js`
- `tests/r3.0f-migration-engine.test.js` — 105 adversarial assertions
- `governance/r3.0f/state.json` — state after F1
- `governance/r3.0f/checkpoints/F1.json` — F1 checkpoint manifest
- `governance/r3.0/train.json` — train state

**Adversarial focus areas:**
1. Could a malicious migrator return value fabricate producer attestation? Bypass the closed reason-code enum? Corrupt the journal?
2. Could a hostile record (Proxy, accessor, symbol, sparse array, non-enumerable, `__proto__` pollution, hostile toJSON, BigInt, cycle, oversized) sneak past the input firewall?
3. Could JS intrinsic rebinding (Object.* / Array.* / JSON.*) cause misclassification, silent drop, or mis-route?
4. Per-store batch atomicity: backend.transact() rejection mid-batch → partial writes possible? Journal inconsistent with what landed?
5. Idempotency: full journal + repeat migrate() with no new data = spurious writes?
6. ENVELOPE_VERSION_MISMATCH bypass with crafted state?
7. JOURNAL_OVERFLOW used to silently lose data?
8. Closed reason-code enum: any typo / drift between engine + contract + tests?
9. After BACKEND_REJECTED, engine left in a consistent state (no half-applied journal)?
10. recordHash determinism — hostile producer forging "successful migration" via hash collision (FNV-1a is small; can an attacker craft a same-hash record to fake authority?)
11. Backend transact() returning wrong shape (missing result / missing writes)?
12. Cross-store contamination: failure in store A rolls back already-committed writes to store B?
13. Does the engine touch any frozen R3.0B file, R3.0C/D/E contract, or any secondary index it should not?
14. Cross-phase: F1 silently enabling something it shouldn't (e.g., comparison authority, feature registry)?
15. Does the engine fabricate authority anywhere?
16. Does the engine respect "comparison authority untouched" (it shouldn't reach comparison-related code at all)?
17. Per-store batch where some entries are "no-op" and some are "migrated": is the journal entry order deterministic? Could a hostile order trick downstream auditors?
18. Per-store migrator returning result with `migrations` array containing fabricated step labels — engine just copies through. Does that mislead the journal audit?
19. `lifetimeJournalDropped` arithmetic: could overflow / hostile prior state corrupt this counter?
20. The engine's `compactedJournal.slice(...)` retains the NEWEST entries. Is the comment / behavior aligned with "append-only"? (A ring buffer that drops oldest is fine; verify the drop counter actually reflects what was lost.)

Give each finding an ID `F1-R1-NN` with:
- file path + line range
- attack scenario
- engine's current behavior
- why it's a BLOCK
- specific fix recommendation

If you find no real failure modes, give a single FINAL VERDICT: PASS line. Otherwise FINAL VERDICT: BLOCK — N findings (F1-R1-01..F1-R1-N).
