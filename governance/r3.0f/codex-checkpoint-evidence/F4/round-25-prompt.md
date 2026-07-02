You are auditing exact commit b94f4f66082f8ddfdaf58af5c95262e4b62236c1 on branch feat/r3.0f-f4-documentation of the racing-setup-analyzer repository. This is Codex Round 25 of the R3.0F F4_DOCUMENTATION checkpoint. Since the last Codex round, a proactive exhaustive sweep fixed 18 additional findings across record-shape and UI-behavior domains (commit b94f4f6's message lists them all). Scope is documentation-only.

Perform a final claim-level audit across all six F4 documentation deliverables and CHANGELOG:
- docs/r3-architecture.md
- docs/r3-user-workflow.md
- docs/r3-data-and-privacy.md
- docs/r3-credibility-model.md
- docs/r3-experiment-loop.md
- CHANGELOG.md

For every factual claim:

1. Classify it as one of: production runtime behavior / test-only behavior / CI enforcement / governance policy / schema fact / user workflow guidance / advisory documentation.

2. Verify it against the exact authoritative implementation, test, CI configuration, or governance source at this commit. For store/contract record-shape claims, read the literal field construction in the code. PRIORITY ANGLE for this round (not yet systematically swept): verify every code-like expression in the docs — function-call examples with their argument lists, named-constant values, reason-code strings, store names, file paths, UMD global names — against the actual definitions. Wrong arity, wrong argument order, misspelled identifiers, constant drift, nonexistent codes/paths, and wrong module attribution are all findings.

3. Flag only materially false, overstated, stale, ambiguous, or cross-document-inconsistent claims.

4. Group duplicate manifestations of the same root claim into one finding and list every affected location across ALL SIX docs + CHANGELOG.

5. Do not infer runtime guarantees from tests, CI, validators, governance policy, fixtures, or adversarial coverage.

6. Do not infer assertion counts using static grep where loops, parameterized execution, or repeated phases exist.

7. The hardening total of 133 assertions has been verified dynamically: 41 + 19 + 30 + 21 + 7 + 15 = 133. Do not repeat a "133 vs 120" finding without new runtime execution evidence.

8. Already fixed and verified accurate as of this commit (do not re-flag unless genuinely new location/angle):
   - F2 harness Node-only over MemoryBackend(); scenario-specific coverage
   - Math.random() in _newId() is the sole randomness exception
   - The three export functions return in-memory objects; the UI-layer _downloadJson (Blob + a.download browser download) is the shipped download affordance
   - "Re-validated on read" scoped to get()/listForParent(); list()/listForExperiment() unvalidated
   - Timeline: 8-kind closed enum; appendEvent order = future-schema, duplicate, out-of-order (NaN only on new side), re-validate; non-decreasing ordering; audit-before-clone at E1
   - Engineer Brief: authoritative D2-D5 construction vs grammar-only R3.0E reference; never persisted; UI mount ships hidden/inert with no producer call site
   - Only the Comparisons pane is reachable today; Engineer Brief / Experiment Loop / Case Timeline have live nav nodes but no wired pane content (index.html loads no R3.0E script)
   - Blocked reason codes render via tCode localization, not verbatim
   - session-store NOT case-linked; record { schemaVersion, sessionId, summary, raw, createdAt }
   - case-store record is 8 fields; case creation auto-derives title and stores track:null
   - setupChange is recursively-plain with no unit/vocabulary enforcement
   - C5 metric allowlist = lap_time / delta_cumulative / sector_delta / entry_delta / mid_delta / exit_delta
   - E1 experiment table lists all 18 EXPERIMENT_KEYS incl. schemaVersion
   - importBundle can only surface ID_COLLISION from the case-store sibling-guard set
   - caseStore.remove(caseId, { confirm: true }) two-argument signature
   - Full local deletion: in-app path is partial retirement; only userData deletion is complete
   - Producer-attestation sentinel: exact match or underscore-prefix+token

9. Review the exact remote candidate SHA only (b94f4f66082f8ddfdaf58af5c95262e4b62236c1).

10. Return an explicit verdict: PASS, or BLOCK with numbered findings (file, line, exact quoted claim, why wrong, authoritative source, suggested fix).

If, after a genuinely thorough pass including the priority api-signature angle, you cannot find any new, materially significant, independently-verifiable factual error, return PASS. Do not manufacture marginal or stylistic findings.

Work directory: /Users/SKYLINE/Claude/projects/racing-setup-analyzer (already checked out at the target commit with a clean working tree matching origin).
