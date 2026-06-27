# R3.0C CP1 Round 2 — Retrofit Matrix (Train as authoritative delivery path)

**Anchor commit (Train HEAD at matrix authorship): `5f70aafa82d4539dda5229da4a288ebaca62767d`**
**Branch: `feat/r3.0-train-cp1-retrofit` (off `feat/r3.0-integrated-delivery`)**
**Scope (per SKYLINE 2026-06-28 裁示): same-case, same-session, cross-lap.**

CP1 Round 2 BLOCK verdict (Adjudication file: scratchpad/r3c-cp1r2/ADJUDICATION.md)
produced 12 real findings + 4 false positives. Per Train-authoritative decision, the
findings are mapped to Train production code / tests / governance below.

## Mapping legend

- **State**:
  - **OPEN-HIGH** — must be fixed this round (high-risk contract fix).
  - **OPEN-DEFER** — real gap but lives in a deferred checkpoint (C6/C7/C8); add contract
    surface or governance lock now, full fix when that checkpoint authorises it.
  - **HANDLED** — Train HEAD already enforces with equal-or-stronger policy; add
    adversarial test only (if missing) and document.
  - **DOC-ONLY** — wording / cross-reference / matrix entry; no behaviour change.
- **F6 conditional rule** (SKYLINE裁示): without service-owned deterministic phase
  boundaries, UI must NOT derive or display entry/mid/exit results. Phase metrics
  remain in the contract enum but are governance-locked until C7+ ships a deterministic
  phase-boundary contract that is independently testable.

## Matrix

| F | Severity | State | Target file(s) | Test | Checkpoint | Note |
|---|----------|-------|----------------|------|------------|------|
| F1 | Critical | **OPEN-HIGH** | `contracts/r3.0c/comparison-export-contract.js` (validateComparisonExportEnvelope: closed envelope own-key set; closed payload top-level shape) | `tests/r3.0c-contract-foundation.test.js` (envelope closed-key + smuggled-secret reject) | C5R (this retrofit) | envelope currently only knows `schemaIdentity / schemaVersion / generatedAt / payload`; reject any other own-key fail-closed |
| F2 | Major | **OPEN-HIGH** | `contracts/r3.0c/comparison-export-contract.js` (`_payloadBounded`: non-finite number → fail-closed) | `tests/r3.0c-contract-foundation.test.js` (NaN / Infinity / -Infinity each rejected) | C5R | unavailable values must be `null`, not non-finite |
| F3 | Major | **OPEN-HIGH** | `contracts/r3.0c/comparison-export-contract.js` (`_payloadBounded`: MAX_STRING_UTF8_BYTES + MAX_ENVELOPE_UTF8_BYTES) | `tests/r3.0c-contract-foundation.test.js` (long-string smuggling reject; aggregate-byte cap) | C5R | per-string ≤ 4096 UTF-8 bytes; total envelope ≤ 256 KiB |
| F4 | Critical | **OPEN-DEFER (contract surface now)** | `contracts/r3.0c/comparison-eligibility-contract.js` (add `validateComparisonContextAgainstCase(case, context)`); `contracts/r3.0c/reason-codes.js` (no new code — reuses `TRACK_IDENTITY_MISMATCH`) | `tests/r3.0c-contract-foundation.test.js` (self-consistent forged context with mismatched case associations → blocked) | C5R contract surface; full wiring at C6 (orchestrator) | adapter / orchestrator deferred to C6; contract surface declared NOW so future orchestrator must compose it |
| F5 | Critical | **OPEN-HIGH** | `contracts/r3.0c/comparison-eligibility-contract.js` (identity schema: add `positionBasis`, `positionDirection`; hard-block missing / mismatched); `contracts/r3.0c/reason-codes.js` (new: `MISSING_POSITION_BASIS`, `INCOMPATIBLE_POSITION_BASIS`, `MISSING_POSITION_DIRECTION`, `INCOMPATIBLE_POSITION_DIRECTION`) | `tests/r3.0c-contract-foundation.test.js` (each new code triggered exactly when expected; existing codes unaffected) | C5R | brings v2 contract identity in line with architecture v3 §(1) |
| F6 | Major | **OPEN-HIGH (governance lock)** | `contracts/r3.0c/delta-metrics-contract.js` (the four corner-scope metrics — `sector_delta / entry_delta / mid_delta / exit_delta` — gated by `phaseBoundaryContractAuthorised` capability; without it → fail-closed `PHASE_BOUNDARY_CONTRACT_UNAUTHORISED`); `governance/r3.0c/capabilities.json` (add `phase_boundary_contract`: `enabled: false` until a real boundary contract ships) | `tests/r3-0c-delta-metrics.test.js` (phase-scope metrics blocked when capability `false`; allowed when `true` AND a phase-boundary payload is provided) | C5R | conditional: corner-scope metrics not blocked entirely; sector_delta still permissive once a corner pair exists, but entry/mid/exit specifically require the boundary contract |
| F7 | Major | **HANDLED** | `renderer/js/r3-0c-normalized-distance.js` (Phase 7: duplicatePositions = 'reject' / 'collapse' / 'retain', with `_classifyDuplicates`) | `tests/r3-0c-normalized-distance.test.js` (existing covers `reject`); confirm default is `reject` (no implicit accept) | already at C3 | verify default + add a test where caller omits policy → reject path; doc only |
| F8 | Medium | **OPEN-DEFER** | `renderer/js/r3-0c-delta-metrics.js` (future: add `MIN_ABS_RANGE_*` per onset channel before metric goes Derived-available) | follow-up | C7 (onset implementation) | onset implementation itself deferred past C5R; matrix entry only |
| F9 | Medium | **HANDLED (stronger policy)** | `renderer/js/r3-0c-corner-pairing.js` (multi-overlap → `CORNER_PAIRING_AMBIGUOUS` fail-closed, no "best" tie pick) | `tests/r3-0c-corner-pairing.test.js` (existing covers ambiguous block) | already at C4 | Train policy is more conservative than CP1-adjudicated "highest-overlap"; accept Train policy as the canonical R3.0C convention |
| F10 | Major | **HANDLED** | `renderer/js/r3-0c-corner-segmentation.js` (`CORNER_SEGMENTATION_OVERLAPPING_SEGMENTS` fail-closed on same-lap overlap) | `tests/r3-0c-corner-segmentation.test.js` (existing covers reject path) | already at C4 | doc only |
| F11 | Major | **OPEN-DEFER (state-transition contract now)** | new `docs/r3.0c-state-transition-contract.md`; `governance/r3.0c/capabilities.json` add `viewmodel_state_transition_contract`: `enabled: false` | C6 viewmodel cannot ship without this contract being enabled | C5R declare contract; C6 ship | viewmodel does not exist yet on Train; pre-declare the rule so C6 implementer cannot ship UI that overlays stale results |
| F12 | Major | **OPEN-DEFER (framing-source contract now)** | new `docs/r3.0c-framing-source-contract.md`; `contracts/r3.0c/comparison-eligibility-contract.js` (FRAMING_KEY_SHAPE: must be array of `{reasonCode, i18nKey, params:{}}`; never free-form prose) | C7 orchestrator cannot emit `framing` strings; tests will assert at orchestrator landing | C5R declare contract; C7 ship | architecture v3 §(6) gave ownership; this matrix entry adds the structural rule |

## False-positive entries (for completeness; no action this round)

- **GPT spot #1** (MAX_BOUNDED_ARRAY=64 vs GRID_N=200) — non-blocking; add export test asserting
  `grid` is summarised (not raw) when exporter ships at C7+.
- **GPT spot #5** (valid-lap structural-only) — non-blocking; add governance test at C6 that no
  production R3.0C module treats `evaluation:'contract_structural'` alone as evidence eligibility.
- **GPT spot #15** (lapTime vs timingValidity) — non-blocking; architecture-already-binds.
- **GPT spot #16** (caller-supplied credibility) — non-blocking; CP1 honest scope.

## Order of operations this round

1. **Reason-code extensions** — add 4 new codes (F5) to `contracts/r3.0c/reason-codes.js`.
2. **Export contract hardening** (F1 + F2 + F3) — `contracts/r3.0c/comparison-export-contract.js`.
3. **Eligibility identity hardening** (F5 + F4 contract surface + F12 framing shape) —
   `contracts/r3.0c/comparison-eligibility-contract.js`.
4. **Delta-metrics phase gate** (F6) — `contracts/r3.0c/delta-metrics-contract.js` +
   `governance/r3.0c/capabilities.json`.
5. **Tests** — extend `tests/r3.0c-contract-foundation.test.js` (and `tests/r3-0c-delta-metrics.test.js`
   for F6); each new fix carries an adversarial case that exercises the closed boundary.
6. **State-transition + framing-source docs** (F11 + F12 deferred contracts) — `docs/r3.0c-*`.
7. **Run `npm test`**, confirm 0 failure, 501 preset and frozen-files diff still clean.
8. **Push** sub-branch; formal Codex C-A review against the precise pushed HEAD SHA.

## Out of scope

- Cross-session / cross-case comparison (Train scope is same-case same-session per裁示).
- viewmodel / UI build (deferred to C6+; F11 contract declared, no code).
- Orchestrator (deferred to C6 / C7; F4 wiring + F12 framing emitter declared, no code).
- Onset implementation (deferred past C5R; F8 matrix entry only).
- The four false-positive items above (no action).

## Governance bookkeeping

- The matrix file itself does NOT modify production code, frozen physics, R3.0B persistence,
  feature registry, or any Train checkpoint state. The subsequent fixes do.
- Each fix commit will carry the form `cp1r(<F-id>): <short>` and reference this matrix.
- A new checkpoint `C5R_CP1_RETROFIT` will be authored in `governance/r3.0c/checkpoints/` when
  all OPEN-HIGH items land, summarising scope + evidence + Codex verdict.

**End of matrix.**
