You are acting as **Codex F2 Round 1 — Adversarial Review** for the R3.0F F2_E2E_AUTOMATION checkpoint.

**Exact remote SHA under review**: `39a48744e33f5cec9d3e0d96bb942f06dd23431c`
Branch: `feat/r3.0f-f2-e2e`
PR: #34 (base `feat/r3.0-integrated-delivery`)
PR #34 CI: trusted-verification PASS (run 28445271192, 29s).
Train HEAD: `f143b9fcfd5bfbb65cf2c04130c9eeef9853abb9` (post F1 merge).
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

**F2 scope at this SHA:**

Newly authorized:
- `tests/e2e/helpers/flow-harness.js` (deterministic harness; console-error guard; forbidden-actions gate; assertNoStaleCaseRef gate; reuses MemoryBackend + R3.0B/C/D/E/F stores)
- `tests/e2e/flow-01-new-user.test.js` (13 assertions) — empty backend baseline + F1 idempotent skip
- `tests/e2e/flow-02-real-telemetry.test.js` (17) — session store, raw telemetry excluded from bundle
- `tests/e2e/flow-03-measured.test.js` (15) — credibility rung exact `measured`, limitations[] preserved, closed enum
- `tests/e2e/flow-04-reference-lap.test.js` (11) — scope-pin: explicit only, no auto fastest/median/best-sector
- `tests/e2e/flow-05-vre.test.js` (8) — R3.0D engineer brief authoritative-only; no causation; no driver blame; no LLM authority; no auto setup apply
- `tests/e2e/flow-06-setup-experiment.test.js` (14) — experiment create + append-only timeline monotonic; out-of-order rejected
- `tests/e2e/flow-07-driver-experiment.test.js` (8) — driver instruction + follow-up Case Link; cross-case + cross-session comparison forbidden
- `tests/e2e/flow-08-export-import.test.js` (14) — bundle has no raw telemetry; imported_summary never promoted; F1 sees imported as at-target
- `tests/e2e/flow-09-electron-smoke.test.js` (10) — package.json devDeps declaration + main.js contextIsolation=true + nodeIntegration=false + preload.js contextBridge only (no ipcRenderer/fs/child_process/net/http)

Production code change (defensive, scope-contained):
- `renderer/js/r3-0f-migration-engine.js`: `_isJsonSafe` now treats undefined property values as JSON-safe (JSON.stringify omits them per ECMA-262 §25.5.2). `_safeJsonStringify` omits undefined-valued object properties; emits 'null' for undefined array elements. Required to flow R3.0B importBundle output (which sets `schema: undefined`) through F1 sanitize+serialize. R3.0B persistence modules NOT modified.

CI/infrastructure adjustments:
- `scripts/run-tests-manifest.js`: discovery now walks one level into `tests/e2e/` (per schema allowedRoots which lists tests/e2e/ explicitly). Recursion is restricted to the `e2e` subdir to keep deterministic.

Governance:
- `governance/r3.0f/state.json`: F2_E2E_AUTOMATION; +e2e_automation_present; +10 authorized paths
- `governance/r3.0f/checkpoints/F2.json`: full F2 manifest
- `governance/r3.0/train.json`: phase checkpoint advanced

**Your job — F2 R1 verification:**

Adversarially review whether this F2 checkpoint correctly delivers the e2e_automation_present capability while preserving all R3.0F F1 closures (R1-R23) and frozen invariants.

Focus areas:
1. Do the 9 flows actually exercise the surfaces they claim? Or are they shallow assertions that miss real behaviour?
2. Does flow-04 reference-lap test actually drive `R3.0C reference-selection` API, or just assert scope-pin JSON? Could a reference-lap regression slip through?
3. Does flow-05 VRE actually exercise R3.0D engineer-brief, or just module-loadable + scope checks?
4. Does flow-06 setup experiment's "out-of-order rejected" test correctly establish the negative path?
5. Are the harness contracts (console-error guard / no-stale-ref / forbidden-actions) ACTUALLY enforced by every flow, or only by some?
6. Does the harness leak state between flows (the dispose() helper restores console.error but not unhandledRejection — is this safe across the npm-test sequential run?)
7. Does the `_isJsonSafe` change (undefined property tolerance) regress any F1 R1-R23 closure? Particularly:
   - F1-R14-01 BigInt rejection still works?
   - F1-R19-01 toJSON-trap-free serialization still holds?
   - F1-R20-01 descriptor-only preflight still rejects accessors?
   - F1-R9-01 sourceHash still doesn't fire inherited toJSON?
   - The new `omit-undefined-property` rule doesn't open any new bypass vector?
8. CI infrastructure update to scripts/run-tests-manifest.js: are there any side effects on R3.0C/D/E test discovery? Could a future tests/{c,d}/... be missed?
9. Does the package.json test-script sequence run flows in an order that depends on state? (Should be no — each flow creates a fresh harness.)
10. F1 atomic transact, TOCTOU sourceHash, _safePush, ambient-prototype hardening — all still in effect.
11. Frozen R3.0B persistence + R3.0C/D/E contracts NOT modified.
12. Producer attestation NEVER fabricated.
13. Comparison authority untouched (same Case + same Session + cross-lap only).
14. Credibility rungs untouched (measured/derived/heuristic/synthetic; warnings in limitations[]).
15. No R4 scope creep.
16. No runtime LLM decision authority.

**Scope: R3.0F F2 only.** No R4. No frozen R3.0B / C / D / E modification. No weakened authority. Do not BLOCK based on style, preference, or unproven speculation. Do not list known-deferred items (e.g., F2 doesn't ship a real browser DOM harness — that's deliberate logic-level scope) as BLOCK.

If no findings AND F1 closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F2-R1-01..F2-R1-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
