You are acting as **Codex F3 Round 1 — Adversarial Review** for the R3.0F F3_QUALITY_HARDENING checkpoint.

**Exact remote SHA under review**: `adc4de11d42c4f4b831d90ce385d256fbcb8905a`
Branch: `feat/r3.0f-f3-hardening`
PR: #35 (base `feat/r3.0-integrated-delivery`)
PR #35 CI: trusted-verification PASS (run 28446801895, 38s).
Train HEAD (unchanged): `882816300d930dffa8ef24f14429c784f5d3c55d` (post F1+F2).
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F3 scope at this SHA — 6 hardening test files asserting production quality bars:

- tests/e2e/hardening-01-electron-boundary.test.js (22 assertions): main.js webPreferences strictness; preload.js minimal contextBridge surface; CSP meta declared; no external script src.
- tests/e2e/hardening-02-storage-failure.test.js (11): case-store remove confirm gate; backend transact rejection → BACKEND_REJECTED no partial write; oversized record rejection.
- tests/e2e/hardening-03-no-stale-ui.test.js (10): assertNoStaleCaseRef gate across 7 transition scenarios.
- tests/e2e/hardening-04-large-library.test.js (9): 200-case seed; F1 migration noop=200; deterministic linear scaling.
- tests/e2e/hardening-05-xss-injection.test.js (6): renderer/js scan for unsafe innerHTML/outerHTML/document.write/new Function; every renderer/index.html x-html binding is a function call into a named helper.
- tests/e2e/hardening-06-supply-chain.test.js (15): no runtime dependencies; devDependencies = {electron, electron-builder}; npm scripts use local toolchain only; no .env / .env.local; .gitignore excludes node_modules/+artifacts/; no bare third-party require in renderer/js.

NO new production renderer module is added in F3. All hardening is test-side validation that the existing R3.0B/C/D/E + F1 engine surfaces already satisfy the quality bar.

Governance:
- governance/r3.0f/state.json: currentCheckpoint=F3_QUALITY_HARDENING; +quality_hardening_present; uiAllowed=true (uiCheckpoint floor); featureRegistryActivationAllowed stays false.
- governance/r3.0f/checkpoints/F3.json: full F3 manifest (73 new assertions).
- governance/r3.0/train.json: currentPhaseCheckpoint advanced.

**Your job — F3 R1 verification:**

Adversarially review whether F3 hardening tests ACTUALLY catch real-world regressions in the quality bar, or whether they're shallow regex checks that a determined regression could slip past.

Focus areas:
1. hardening-01 (electron boundary): does the regex `/contextIsolation\s*:\s*true/` catch a regression where contextIsolation is set via a computed expression or dynamic key? Is the preload surface check robust against a future preload that has `// require('fs')` in a comment (false positive)?
2. hardening-02 (storage failure): does the test exercise the FULL fail-closed contract (CONFIRM_REQUIRED with non-boolean confirm)? Could a regression where remove() accepts confirm:1 (truthy non-boolean) slip past?
3. hardening-03 (no-stale-UI): the assertNoStaleCaseRef gate only checks lastSession.sourceCaseId and cachedCaseId. Are there OTHER fields where stale references could hide (e.g., viewmodel.sourceCaseId, lastSession.caseId, viewmodel.priorCaseId)?
4. hardening-04 (large library): does seeding 200 cases actually exercise quadratic-or-worse regressions, or is the codebase already O(n) and the test trivially passes? Is N=200 enough to detect a regression to N²?
5. hardening-05 (XSS): the x-html "is a function call" rule may accept `someUserVar()()()` — does the renderer have any such pattern? Are there OTHER unsafe DOM patterns (insertAdjacentHTML / DOMParser.parseFromString / setAttribute('onclick', user)) not scanned?
6. hardening-06 (supply chain): the test scans devDependencies but not transitive deps. Should it also check for the absence of postinstall scripts in node_modules? Or scan dependencies.lock if present?
7. Does any F3 test regress F1 closures (R1-R23) or F2 closures (R1-R3)?
8. Does any F3 test enable a forbidden capability or open a new R4 scope creep?
9. F3 flips uiAllowed=true. Is this floor change documented and consistent with schema.uiCheckpoint?
10. F2 assertNoStaleCaseRef is now exercised by F3 hardening-03 too — does this create circular validation (test asserts harness behaviour rather than production behaviour)?

**Scope: R3.0F F3 only.** No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation. Do not require a real browser DOM harness (that's deliberate F3 scope).

If no findings AND F1+F2 closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F3-R1-01..F3-R1-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
