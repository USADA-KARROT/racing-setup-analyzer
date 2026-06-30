You are acting as **Codex F3 Round 14 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `1132d67eca73ed20a382ce0d422f30e5eceb333d`
Branch: `feat/r3.0f-f3-hardening`
PR #35 CI: trusted-verification PASS (run 28452869795, 37s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage: R1-R13 → 43 distinct findings closed across 13 BLOCK rounds.

R13 closure: bidirectional newline collapse around `=` for multi-line DOM assignment scanning.

Your job — F3 R14 verification.

If no SUBSTANTIAL findings: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R14-01..F3-R14-N)`.

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. Threat model: regression by future contributor.

Inspect READ-ONLY at the SHA above.
