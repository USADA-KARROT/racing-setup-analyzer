You are acting as **Codex F1 Round 7 — Adversarial Review** for the R3.0F F1_MIGRATION_ENGINE checkpoint.

**Exact remote SHA under review**: `1e5fe886a78ec0986f78d2790fca584f25af5476`
Branch: `feat/r3.0f-f1-migration-engine`
PR: #33 (base `feat/r3.0-integrated-delivery`)
Train HEAD (unchanged): `49bdaad9e157b182debc18da667d6bc07b716d83`
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`

Lineage:
- R1 BLOCK 10 → closures
- R2 BLOCK 3 → closures
- R3 BLOCK 1 (sentinel-aware token check) → closures
- R4 BLOCK 1 (normalized first-char check; U+FF3F/U+FE33) → closures
- R5 BLOCK 1 (strip Unicode format controls before NFKC) → closures
- R6 BLOCK 1 (Unicode property classes \\p{Cf}+\\p{Mn}+Hangul fillers) → closures at this SHA.

**R6 closure (F1-R6-01)**:
`_DEFANG_RE = /[\\p{Cf}\\p{Mn}\\u115F\\u1160\\u3164\\uFFA0]/gu` strips ALL format characters (Cf), ALL nonspacing marks (Mn, including CGJ U+034F + combining acute U+0301 + variation selectors supplement), AND the four explicit Hangul fillers, BEFORE NFKC. Smoke tests confirm:
- U+E0020 tag char prefix + splice → rejected
- U+034F CGJ splice → rejected
- U+3164 Hangul filler prefix → rejected
- U+0301 combining acute splice → rejected
- legitimate `lapAuthority`/`distanceAuthority`/`projectionSignature`/`experimentVerified` → accepted

**Your job — R7 verification:**

1. Verify F1-R6-01 closure is complete and correct.
2. Look for any REMAINING Unicode bypass not covered by `\\p{Cf}+\\p{Mn}+Hangul-fillers`:
   - Mongolian Free Variation Selectors U+180B-U+180D (Mn — covered).
   - Other Lo category default-ignorables (Lo is the catch-all "other letter"; the only known default-ignorable Lo chars are the four Hangul fillers and a couple of CJK reserved code points).
   - Surrogate pairs forming default-ignorable supplementary characters: e.g. U+E0020 is in the SMP (supplementary multilingual plane). JS regex `\\p{Cf}` with `u` flag SHOULD match supplementary code points correctly. Verify.
   - Mid-grapheme split via ZWJ between an emoji sequence — irrelevant for attestation key names, but verify the regex is non-destructive on legitimate non-ASCII labels (e.g., a hypothetical i18n key in CJK — but field NAMES are ASCII-only in practice).
3. Re-verify ALL prior closures (R1-01..10, R2-01..03, R3-01, R4-01, R5-01) at this SHA.
4. Final sweep:
   - producer attestation
   - migration determinism
   - idempotency
   - atomic transact
   - hostile migrator return
   - cross-store contamination
   - frozen R3.0B / R3.0C / R3.0D / R3.0E paths untouched
   - comparison authority untouched
   - timeline append-only untouched
   - i18n / governance / CI integrity

If you find no new failure modes AND all prior closures hold:
`FINAL VERDICT: PASS`

Otherwise:
`FINAL VERDICT: BLOCK — N findings (F1-R7-01..F1-R7-N)`

Inspect READ-ONLY at the SHA above. **Scope: R3.0F F1 only.** No R4 scope creep. No frozen R3.0B modifications. No weakened authority.
