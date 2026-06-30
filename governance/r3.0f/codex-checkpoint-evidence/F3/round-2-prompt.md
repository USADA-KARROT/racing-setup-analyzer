You are acting as **Codex F3 Round 2 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `6c61376c3c3c5e32753f191c183482d22758b509`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28447602959, 29s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 Round 1 returned BLOCK with 6 findings; closures at this SHA:

- **F3-R1-01**: hardening-01 now strips JS comments BEFORE running security regexes; extracts the webPreferences object body; asserts contextIsolation === literal `true` and nodeIntegration === literal `false`; rejects computed-key syntax (e.g. `['contextIsolation']:false`) for security flags; preload.js checks operate on post-strip source. 24 assertions (was 22).
- **F3-R1-02**: hardening-02 now exercises full truthy-non-boolean rejection class: 'yes' / 'true' / 1 / -1 / {} / [] / new Boolean(true) / null / explicit undefined — all must be CONFIRM_REQUIRED; only literal `true` succeeds. 19 assertions (was 11).
- **F3-R1-03**: harness assertNoStaleCaseRef expanded to scan ALL documented case-id-bearing fields with bounded depth-2 recursion + cycle-safe WeakSet; tests now drive a REAL R3.0E experimentStore.create with production-shape record and prove the gate catches stale refs against actual production data structures. 23 assertions (was 10).
- **F3-R1-04**: hardening-04 now uses an instrumented-backend N-doubling scaling check: counts list/get/put/transact ops at N=50 and N=100, asserts each ratio ≤ 3 (linear bound + fixed META overhead). A quadratic regression would inflate the ratio above the bound. 13 assertions (was 9).
- **F3-R1-05**: hardening-05 strips JS comments first, fail-closes on ALL forbidden DOM API patterns (not just document.write): document.write/writeln, new Function with non-literal arg, variable-RHS outerHTML, insertAdjacentHTML with non-literal text, DOMParser.parseFromString with non-literal first arg, setAttribute('on*', ...) injection. Single fail-closed assertion: unsafeApis.length === 0.
- **F3-R1-06**: hardening-06 npm-script check rewritten with anchored, segment-by-segment (split on && and ;) allowlist; forbidden tokens fail-closed anywhere: curl/wget/npx/fetch/eval/base64/ssh/scp/rsync/sh -c/https? URLs/$(...)/backticks/pipe to sh/redirect to /dev/. Only literal `node <path>` / `electron-builder ...` / `electron .` patterns allowed per segment.

**Your job — F3 R2 verification:**

Verify the 6 R1 closures are complete and correct; re-verify F1 closures (R1-23) and F2 closures (R1-3) are still intact; surface any REMAINING scope-contained F3 failure mode.

Focus areas:
1. F3-R1-01: comment-strip regex robustness — can a hostile main.js bypass the strip with nested `/*` or string-literal containing `//`? Does the webPreferences extraction handle multi-line nested objects?
2. F3-R1-02: 9 truthy-non-boolean cases sufficient? Are there other truthy values that should be in the matrix (Symbol(), function(){}, /regex/)?
3. F3-R1-03: bounded depth-2 recursion — is 2 enough to catch ALL real-world stale refs? Could a 3-level-deep nested ref slip through?
4. F3-R1-04: N=50 vs N=100 is a 2× ratio test. Is the LINEAR_BOUND of 3 tight enough (e.g., a 2.5× regression would still pass)? Should we use multiple N points or fit a curve?
5. F3-R1-05: comment-strip regex applies to JS but the test ALSO scans renderer/index.html — does the x-html check correctly handle multi-line attribute values?
6. F3-R1-06: anchored allowlist — does the test correctly handle scripts with multiple && segments where ONE segment is valid `node` but ANOTHER segment is a forbidden token?
7. Did the closures regress F1 closures (R1-23)?
8. Did the closures regress F2 closures (R1-3)?
9. Did the closures introduce any frozen-path mutation, R4 scope creep, runtime LLM, or other forbidden capability?
10. Are the test-side hardening probes themselves vulnerable to a determined regression (e.g., a future contributor could change the regex but the assertion still pass)?

**Scope: R3.0F F3 only.** No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation. Do not require a real browser DOM harness (that's deliberate F3 scope).

If no findings AND all prior closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R2-01..F3-R2-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
