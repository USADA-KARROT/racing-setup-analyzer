You are acting as **Codex F3 Round 9 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `837d7a864c1259578a377629ce7c9014f6d52197`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28451402690, 41s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage (cumulative):
- R1 BLOCK 6 / R2 BLOCK 4 / R3 BLOCK 4 / R4 BLOCK 3 / R5 BLOCK 3 / R6 BLOCK 3 / R7 BLOCK 5 / R8 BLOCK 4 → R8 closures (sandbox:false rejected; exactly-one exposeInMainWorld; template literal interpolation rejected; x-html arg provenance — literal/bare-property-access/ternary)

Total: 32 distinct adversarial findings closed across 8 BLOCK rounds.

Your job — F3 R9 verification:

Verify ALL R1-R8 closures correct; F1+F2 closures intact; surface any REMAINING scope-contained F3 failure mode.

If no findings AND all prior closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R9-01..F3-R9-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation. Do not require a real browser DOM harness.

Inspect READ-ONLY at the SHA above.
