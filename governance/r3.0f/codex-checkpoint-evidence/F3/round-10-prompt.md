You are acting as **Codex F3 Round 10 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `5ad48ff0e4d772e03652f3ba04b0e8a9e1b9f7b4`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28451808291, 29s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage: R1-R9 → 37 distinct findings closed across 9 BLOCK rounds.

R9 closures: spread rejection in webPreferences; computed-form contextBridge call detection + exactly-one occurrence; surface-value inert-primitive allowlist + Node-authority forbidden tokens; ASI-form innerHTML/outerHTML acceptance; compact shell-redirection rejection.

Your job — F3 R10 verification:

**IMPORTANT CONSIDERATIONS**:
- F3 is "test-side hardening" — its job is to detect quality regressions in EXISTING production code, NOT to assert exhaustive protection against every theoretically possible attacker.
- F3 already covers: electron boundary / storage failure / no-stale-UI / large library / XSS injection / supply chain.
- 37 findings have been closed across 9 rounds, each tightening the test against real failure modes.
- Findings that require an ATTACKER WITH SOURCE-CODE-WRITE ACCESS to introduce hostile code in our own renderer/main/preload are not the F3 threat model — the threat model is regression by a future contributor.
- Findings that propose features (e.g., AST-based parser instead of regex) are nice-to-have but not required if the existing patterns catch realistic regressions.

Please verify the existing closures are correct and surface ONLY findings that represent a REALISTIC regression path that a contributor could plausibly introduce without their PR getting reviewed.

If no SUBSTANTIAL findings: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R10-01..F3-R10-N)` with attack path, reproduction, expected, actual, minimal closure.

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. No weakened authority.

Inspect READ-ONLY at the SHA above.
