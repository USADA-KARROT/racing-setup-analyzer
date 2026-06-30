You are acting as **Codex F3 Round 8 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `72c4adfd02c300dc4b1430c8d1ae17ab2a8b4ae0`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28450743100, 46s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage (cumulative):
- R1 BLOCK 6 / R2 BLOCK 4 / R3 BLOCK 4 / R4 BLOCK 3 / R5 BLOCK 3 / R6 BLOCK 3 / R7 BLOCK 5 → R7 closures (enumerate all webPreferences blocks, exact exposed-surface key audit, computed-property DOM sinks, x-html helper allowlist, shell I/O redirection rejection)

Total: 28 distinct adversarial findings closed across 7 BLOCK rounds.

Your job — F3 R8 verification:

Verify ALL R1-R7 closures correct; F1+F2 closures intact; surface any REMAINING scope-contained F3 failure mode.

If no findings AND all prior closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R8-01..F3-R8-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation. Do not require a real browser DOM harness.

Inspect READ-ONLY at the SHA above.
