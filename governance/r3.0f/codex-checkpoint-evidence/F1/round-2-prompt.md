You are acting as **Codex F1 Round 2 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `fd1595c2fb7291ba2fdaddcf72f3ad4468fcdf0f`
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
PR #33 CI: trusted-verification PASS at this SHA
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

This is a **Round 2** review. The Round-1 review (at SHA `0b4219b6d3adbae9e5542fe808c73355e6346f35`) returned **BLOCK with 10 findings** (F1-R1-01..10). All 10 closures have been implemented at the SHA above:

- **F1-R1-01** closed reason-code enum + sanitized `migrationsApplied` at the engine boundary; unknown migrator reasons coerced to `NO_MIGRATION_PATH`; legacy R3.0B codes mapped to F1 contract codes.
- **F1-R1-02** structured-clone-only firewall; JSON-fallback on the original record REMOVED; engine factory throws if `structuredClone` is unavailable. Hostile `toJSON` cannot run inside the engine.
- **F1-R1-03** all writes commit in ONE atomic `backend.transact()` across every data store touched + META (journal + state). Backend rejection → nothing lands.
- **F1-R1-04** pure no-op runs (`migrated + rejected + failed === 0` AND `entries.length === 0`) skip META entirely; `report.idempotentSkipped === true`. No journal churn from repeat scans.
- **F1-R1-05** `JOURNAL_OVERFLOW` is a **preflight halt**: engine lists all stores first; if `total > MAX_JOURNAL × 4`, halts before any mutation.
- **F1-R1-06** `ENV.validateEnvelope()` runs at `migrate()` entry; any structural drift (engineVersion mismatch, per-store drift, missing `perStore`) → `ENVELOPE_VERSION_MISMATCH`.
- **F1-R1-07** `lifetimeJournalDropped` must satisfy `Number.isSafeInteger && >= 0`; otherwise halt.
- **F1-R1-08** `recordHash` prefixed `fnv1a64:` to make it visibly non-cryptographic; contract docstring updated.
- **F1-R1-09** producer-attestation defense: 14 well-known attestation field names (`_authoritative`, `_producerAttested`, `_attested`, `__attested`, `_verified`, `__verified`, `_signature`, `__signature`, `_proof`, `__proof`, `_authority`, `__authority`, `_authoritativeSession`, `_authoritativeCase`, `_authoritativeOutcome`) deeply scanned (depth ≤ 64) in migrator output → `PRODUCER_ATTESTATION_REFUSED`.
- **F1-R1-10** META transact return-shape validated strictly: `journalLen`, `dropped`, `dataWrites` all must be `Number.isSafeInteger && >= 0`, else `BACKEND_REJECTED`.

`tests/r3.0f-migration-engine.test.js` now has **129 assertions** including dedicated regression tests for each R1 closure.

---

**Your job — R2 verification:**

For each R1 closure, verify the fix is correct, complete, and not trivially bypassable. Then search for **new** failure modes Round 1 missed.

**Scope: R3.0F F1 only.** Do NOT suggest R4 features (no Analysis Cards / Adapter ecosystem / Context Broker / Slot Registry / Presentation Manifest / Mobile / Pluggable AI / Dockable workspace). Do NOT suggest modifying the frozen R3.0B portable case-record schema. Do NOT suggest weakening producer attestation. Do NOT propose treating rehydrated/migrated plain objects as authoritative.

**Frozen semantics F1 must not weaken:**
- R3.0B persistence modules (case-record-schema.js / storage-backend.js / schema-migration.js / case-store.js / session-store.js / case-library-viewmodel.js) untouched at this SHA
- Comparison authority = same Case + same Session + cross-lap only; cross-session forbidden; cross-case forbidden; explicit reference lap only; delta = `comparison - reference`
- Credibility rungs exactly `{measured, derived, heuristic, synthetic}`; warnings/qualifiers go in `limitations[]`
- Append-only timeline; correction events reference but never mutate prior events
- Migration must be deterministic, idempotent, failure-safe, journaled, version-aware, never silently drop data, never fabricate producer attestation
- No automatic reference-lap selection
- No automatic setup / calibration / model / preset change
- Follow-up Case Links do NOT grant comparison authority
- No cross-session comparison; no cross-case comparison
- No autonomous AI decision authority

**Adversarial focus areas (look hard for new issues):**

A. **TOCTOU between list and atomic transact.** Engine lists each store, computes migrations OUT of transact, then commits everything via one transact. Between list and commit, a concurrent writer could mutate a key. Engine then overwrites their change. The engine is presumed single-writer in the renderer process, but document or guard this.

B. **Atomic transact across data stores + META.** `IndexedDBBackend` opens ONE readwrite tx across multiple object stores. Does the engine guarantee META is ALWAYS included when any data write is included? If `allWrites.length === 0` AND `allEntries.length === 0`, idempotency skip path — does the META commit happen ONLY when needed?

C. **Producer-attestation field name allowlist** is 14 lowercase-prefix names. A migrator could use `_AUTHORITATIVE` (uppercase) or `auth0ritative` (zero-for-O) or unicode-confusable variants. Should this be case-insensitive? Should there be a structural marker check beyond exact-name match?

D. `_containsAttestationField` walks via `Object.keys` (own enumerable). Symbols, non-enumerable, and `__proto__` keys would survive structured-clone if the migrator constructs them. After `_sanitize` re-runs on the migrated record, those exotic constructs should be stripped. Verify this is true post-sanitize.

E. `_sanitize` calls structuredClone on the migrator's RETURN value. If the migrator returns a Proxy / accessor / Map / Date, what survives the JSON roundtrip? Are JSON-incompatible values rejected as `RECORD_CIRCULAR` or silently converted?

F. **Per-record `noop` count and pure-no-op skip**: a store with ONLY at-target records contributes `noop > 0` and `entries.length === 0` (since the per-record no-op does not journal). If ALL stores are like that, engine returns idempotentSkipped. Correct? Verify the boundary at "some records migrated, others no-op" still journals the migrated entries and writes META.

G. **`_journalEntry` deep-freezes the entry.** Backend `_clone(value)` will structuredClone the frozen entry. After read-back via `journal()`, entries are re-deep-frozen. Confirm mutation rejection.

H. **Closed reason-code map**: legacy `case_NOT_AN_OBJECT` etc. is explicit. But what about R3.0E migrator codes like `R3_0E_EXPERIMENT_FUTURE_SCHEMA` — those collapse to `NO_MIGRATION_PATH` (losing semantic info). Is that acceptable? (Probably yes, because the engine's reason is the closed-enum truth; the migrator's reason is informational.)

I. **`_commit` reads prior journal BEFORE the atomic transact.** Between read and transact, prior journal could change. Single-writer assumption; document or guard.

J. **`buildEnvelope` from contract: is per-store target version locked behind the contract?** A future contract bump (engine v2) MUST be acknowledged by every per-store migrator. Verify the drift guard at factory time still catches that.

K. **migrate() concurrent calls**: if two `migrate()` Promises are kicked off simultaneously (e.g., a buggy UI), can they both reach the atomic transact? The backend's transact mutex serializes them, but the pre-transact state read could be stale for the second one. Is this a real risk for F1 or a documented assumption?

L. **Reading R3.0E contract validators in migrators**: each R3.0E migrator imports its contract via literal require. If the contract path is missing or unrequirable in production, the migrator returns `NO_MIGRATION_PATH`. Confirm this is fail-closed and tested.

M. **Hostile listed key** — backend.list returns `{key, value}` arrays. What if `key` is an empty string, an object, or `__proto__`? Engine checks `typeof row.key === 'string'`. Empty string passes. Should we reject empty? Should we reject reserved names?

N. **Status derivation**: `anyMigrated && anyRejected → partial`; `anyMigrated alone → complete`; `anyRejected alone → partial`; `anyFailed → halted` (overrides). Is there a case where the report says `complete` but rejected records were present in some store? Map the matrix carefully.

O. **R3.0E experiment-migrator** runs `validateExperimentShape` AFTER any migration step. If the record was already at target and shape is invalid, migrate returns `POST_MIGRATION_INVALID`. But the migrator declares `migrations = []` in that path. Is the journal entry correct (`status='rejected'`, `migrationsApplied: []`)?

P. **PR #33 base is the Train branch**, not main. The diff Codex should review is `Train..F1`. Confirm by computing the diff yourself if necessary. The merge target is Train, not main.

Q. **`limitations[]` in journal**: engine caps to 16 entries × 200 chars each. A hostile migrator could pack 16 × 200 = 3200 chars per entry per record. Across 1000 records that's 3.2MB. Is the journal practical size bound elsewhere? (Bounded by `MAX_JOURNAL` × per-entry size; if `MAX_JOURNAL = 256` and per-entry ~3KB worst case, journal ≤ 768KB. Acceptable.)

R. **`buildEnvelope` is in contract** — verify the engine builds the SAME envelope every time within one engine session. Determinism check.

S. **structuredClone usage**: in Node 18+ it's a global. The engine assumes its presence in production (Electron renderer). Is there any code path where it could be undefined or shadowed? Verify the closure-captured `_StructuredClone` resists later global rebinding.

T. **State `envelope` field**: the engine writes the FRESH envelope into state on every migrate(). But the freshly-built envelope is deep-frozen; the backend will structuredClone it on write. Confirm the persisted envelope mirrors `ENV.buildEnvelope()` exactly.

Give each finding ID **F1-R2-NN** with:
- file + line range
- attack scenario or correctness failure
- engine's current behavior
- severity (BLOCK / NIT)
- specific minimal fix

If you find NO real failure modes AND verify all 10 R1 closures hold, give a single line:
`FINAL VERDICT: PASS`

Otherwise:
`FINAL VERDICT: BLOCK — N findings (F1-R2-01..F1-R2-N)`

Run as **read-only adversarial review**. Inspect the files at the SHA above.
