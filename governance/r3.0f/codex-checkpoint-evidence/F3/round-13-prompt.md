You are acting as **Codex F3 Round 13 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `5687819973e8b338c9aba73cbf2806965e2624ff`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28452655884, 30s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage: R1-R12 → 42 distinct findings closed across 12 BLOCK rounds.

R12 closures: multiline DOM assignment scanning; badge-helper exact arg-chain allowlist.

Your job — F3 R13 verification.

If no SUBSTANTIAL findings: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R13-01..F3-R13-N)`.

Scope: R3.0F F3 only. No R4. No frozen R3.0B/C/D/E modification. Threat model: regression by future contributor.

Inspect READ-ONLY at the SHA above.
