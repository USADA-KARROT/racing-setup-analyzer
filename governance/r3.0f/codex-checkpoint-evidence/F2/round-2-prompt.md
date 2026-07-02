You are acting as **Codex F2 Round 2 — Adversarial Review** for the R3.0F F2_E2E_AUTOMATION checkpoint.

**Exact remote SHA under review**: `8bcceec7bd7c81a2a3adcee5a413e7d923749a16`
Branch: `feat/r3.0f-f2-e2e`
PR: #34 (base `feat/r3.0-integrated-delivery`)
PR #34 CI: trusted-verification PASS (run 28445791084, 29s).
Train HEAD (unchanged): `f143b9fcfd5bfbb65cf2c04130c9eeef9853abb9`.
main HEAD (unchanged): `506012afea7b0296f2c1506cc77d4b39ffdf6ccb`.

F2 Round 1 returned BLOCK with 3 findings; closures at this SHA:
- **F2-R1-01**: flow-04 now drives `R3.0C selectReference()` with 6 negative-path assertions (selectedBy='fastestValid' / 'medianValid' / 'bestSectorComposite' / null selection / forged user-selection with empty lapId / stale candidate lap). 24 assertions (was 11).
- **F2-R1-02**: flow-05 now exercises `R3.0D buildEngineerBrief()` authority gate with 3 negative-path assertions (caller-fabricated hypothesisSet → HYPOTHESIS_AUTHORITY_FORGED; null/null → rejected; Object.create(null) wrapper → rejected). 12 assertions (was 8).
- **F2-R1-03**: harness `assertNoStaleCaseRef` gate is now invoked in flow-07 (driver-experiment transition) AND flow-08 (export→import transition). Both stale + coherent paths covered.

**Your job — F2 R2 verification:**

Verify the 3 R1 closures are complete and correct; re-verify R3.0F F1 closures (R1-23) are still intact; surface any REMAINING scope-contained F2 failure mode.

Focus areas:
1. Do the new selectReference negative paths cover the most critical regression surfaces, or are there other reachable failure modes (e.g., explicitly-supplied auto fallback hidden behind a flag)?
2. Does the engineer-brief negative path adequately gate D3/D4 authority? Could a hostile caller still slip a PROXY-wrapped HypothesisSet through (the contract uses closure-private WeakSet; verify the WeakSet check rejects Proxy traps)?
3. assertNoStaleCaseRef gate — is it now sufficient, or should additional flows (e.g., flow-02 which references a sessionId) also exercise it?
4. Did the closures regress any prior F1 closure? Particularly:
   - F1 atomic transact, TOCTOU sourceHash, _safePush
   - F1-R14 BigInt rejection
   - F1-R19 toJSON trap-free
   - F1-R20 descriptor-only preflight
5. Did the closures introduce any frozen-path mutation, R4 scope creep, runtime LLM, or other forbidden capability?

**Scope: R3.0F F2 only.** No R4. No frozen R3.0B/C/D/E modification. No weakened authority. Do not BLOCK based on style or unproven speculation.

If no findings AND all prior closures intact: `FINAL VERDICT: PASS`

Otherwise: `FINAL VERDICT: BLOCK — N findings (F2-R2-01..F2-R2-N)` with file, attack path, reproduction, expected behavior, actual behavior, minimal closure direction.

Inspect READ-ONLY at the SHA above.
