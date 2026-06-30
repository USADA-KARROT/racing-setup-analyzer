You are acting as **Codex F1 Round 6 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `b0317822df3cbec3ddc41e1d20525f919d2df24d`
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage:
- R1 BLOCK 10 → closures
- R2 BLOCK 3 → closures
- R3 BLOCK 1 (sentinel-aware token check) → closures
- R4 BLOCK 1 (normalized first-char check; U+FF3F/U+FE33) → closures
- R5 BLOCK 1 (strip Unicode format controls before NFKC) → closures at this SHA.

**R5 closure (F1-R5-01)**:
`_normalizeKey` now pre-strips `[­؜᠎​-‏‪-‮⁠-⁯︀-️﻿]` BEFORE NFKC. Format controls (ZWJ/ZWNJ/RTL/LTR marks, bidi isolates, variation selectors, BOM, soft hyphen) no longer hide before/inside the sentinel token. Regression tests added: U+200F prefix, ZWJ spliced inside `_authoritative`, ZWSP prefix, BOM prefix — all rejected.

**Your job — R6 verification:**

1. Verify F1-R5-01 closure correctness:
   - Are there OTHER Unicode bypass vectors not in the stripped set? (Tag characters U+E0020-U+E007F? Mongolian Vowel Separator U+180E is in set; what about Hangul fillers U+115F, U+1160, U+3164?)
   - Could a hostile migrator use a combining mark (category Mn) splice to break tokens, e.g. `_áuthoritative`? (Combining acute accent.) NFKC may or may not collapse this.
   - The regex literal contains the actual code points inline — does the engine still parse correctly on all target Node versions?

2. **Final sweep**: re-verify ALL prior closures still hold at this SHA. Look for anything missed in F1's design beyond attestation:
   - Cross-store / cross-phase regression
   - Determinism (clock injection, no Math.random in engine paths)
   - Storage isolation (engine does not touch any frozen R3.0B path)
   - Comparison-authority semantics still untouched
   - Append-only timeline still untouched
   - R4 scope creep absent
   - i18n parity unaffected
   - Frozen contracts (R3.0C/D/E) unaffected

3. If you find no new failure modes AND all prior closures hold, give `FINAL VERDICT: PASS`.

Otherwise, list `F1-R6-NN` findings and final verdict BLOCK.

**Scope: R3.0F F1 only.** No R4 scope creep. No frozen R3.0B modifications. No weakened authority. Producer-attestation defense must keep working for documented hostile cases.

Inspect READ-ONLY at the SHA above.
