You are acting as **Codex F3 Round 18 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `cd71e19a61dc95ad883158d6dcf1cae9f08db266`
Branch: `feat/r3.0f-f3-hardening`
PR #35 CI: trusted-verification PASS (run 28453875736, 37s).
Train HEAD: `882816300d930dffa8ef24f14429c784f5d3c55d`. main: `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage: R1-R17 → 48 distinct findings closed across 17 BLOCK rounds.

R17 closures: compound assignment operators (+=, ||=, ??=); backtick-template-literal attribute names in setAttribute.

The hardening tests have grown substantially. Verify that:
1. All R1-R17 closures are intact.
2. F1+F2 closures are intact.
3. No frozen-path mutation.
4. The hardening tests reliably FAIL CLOSED for a realistic regression by a future contributor.

If no SUBSTANTIAL findings: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R18-01..F3-R18-N)`.

Scope: R3.0F F3 only.

Inspect READ-ONLY at the SHA above.
