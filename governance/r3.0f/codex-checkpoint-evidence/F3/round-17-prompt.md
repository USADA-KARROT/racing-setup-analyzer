You are acting as **Codex F3 Round 17 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `d6440b01567d03bf824b4b767a080447e61bf1a9`
Branch: `feat/r3.0f-f3-hardening`
PR #35 CI: trusted-verification PASS (run 28453585194, 38s).
Train HEAD: `882816300d930dffa8ef24f14429c784f5d3c55d`. main: `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 review lineage: R1-R16 → 46 distinct findings closed across 16 BLOCK rounds.

R16 closure: template-literal interpolation lexical handling (comments inside `${...}` now stripped).

**META-NOTE**: F3 is "test-side hardening detection". The threat model is REGRESSION BY A FUTURE CONTRIBUTOR, not an active attacker crafting deliberate bypasses against the scanner itself. After 16 rounds, the F3 tests now detect:
- Variable-RHS innerHTML/outerHTML (dot, computed, multi-line, comment-separated, template-interpolated)
- document.write/writeln (dot + computed)
- new Function with non-literal arg
- insertAdjacentHTML with non-literal text
- DOMParser.parseFromString with non-literal
- setAttribute('on*', X)
- Dynamic x-html attribute construction
- x-html bindings (all 3 quote forms; safe helper allowlist with arg-shape rules; literal-only for t(); enum-chain allowlist for badge helpers; template-interp rejection in branches)

Verify the existing closures are intact. If you find any further bypass, evaluate it against the realistic-regression threat model. Bypasses requiring exotic JS syntax that a future contributor would NOT naturally write should not BLOCK; substantive realistic bypasses should.

If no SUBSTANTIAL findings: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R17-01..F3-R17-N)`.

Scope: R3.0F F3 only.

Inspect READ-ONLY at the SHA above.
