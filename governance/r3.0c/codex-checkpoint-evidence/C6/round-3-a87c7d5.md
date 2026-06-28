# Codex C6 review — round 3 (BLOCK)

- **Reviewed SHA**: `a87c7d580f7b290aaac4e6879a17b7665b692d81`
- **Branch**: `feat/r3.0c-c6-comparison-export`
- **Verdict**: BLOCK — F-C6-A4 (1 finding: authenticity gate fail-open when C5 predicate absent)
- **Tool**: codex-cli 0.141.0 via `codex:codex-rescue`
- **Wall-clock**: `90_490 ms`; tokens: `subagent_tokens: 47_121`, `tool_uses: 1`

## Evidence tier

Same disclosure as prior rounds (TIER 1 raw stdout NOT CAPTURED).

## Prompt (TIER 3 — verbatim)

```
Resume — formal R3.0C C6 adversarial review, round 3 against new remote HEAD.

New remote candidate SHA: a87c7d580f7b290aaac4e6879a17b7665b692d81
(your prior verdict at 2b6e568 returned BLOCK on F-C6-A1-R2 / F-C6-A2-R2 /
F-C6-A3-R2; single new commit on top closes them).

Coordinator-verified baseline (sandbox EPERM bypassed — take as VERIFIED):
  - npm test = 75 suites / 8231 passed / 0 failed
  - scripts/check-r3-0c-guard.js = {ok:true, productionDiff:0, deferredStillDeferred:true}
  - scripts/check-frozen-boundary.js = {ok:true, frozenDiffCount:0}
  - suspension-input-equivalence: raw=1002, observable=501 intact
  - git rev-parse HEAD = a87c7d580f7b290aaac4e6879a17b7665b692d81
  - working tree clean
  - frozen files diff vs Train HEAD 4d3f219: empty

Fixes (read-only review):

  F-C6-A1-R2 — renderer/js/r3-0c-delta-metrics.js
    _deepFreezeAndRegister now walks the ENTIRE result graph, Object.freezes
    every plain object + array, AND adds every node to the WeakSet.

  F-C6-A2-R2 — renderer/js/r3-0c-comparison-export.js
    (1) _validateRequestShape now uses _safeGet for top-level request reads.
    (2) buildComparisonExport is split into a public wrapper + inner; the
        wrapper try/catches the entire pipeline.

  F-C6-A3-R2 — renderer/js/r3-0c-comparison-export.js
    A new FORBIDDEN_FILENAME_EXTENSIONS regex matches canonical file suffixes.
    _isBoundedId rejects any ID matching.

Issue PASS or BLOCK per verdict format.
```

## Verdict (TIER 2 — relayed verbatim)

```
== C6 ADVERSARIAL REVIEW VERDICT ==
RemoteCandidateShaReviewed: a87c7d580f7b290aaac4e6879a17b7665b692d81
BaselineChecks: { tests: 75/8231/0 (coordinator-verified), guard: pass, frozen: pass }
Lenses: A open, B closed, C closed, D closed, E closed, F closed, G closed, H closed, I closed, J closed
Findings: [
  "renderer/js/r3-0c-comparison-export.js:235-241 — the authenticity check is skipped when DeltaMetricsService or isAuthenticResult is unavailable, contradicting the documented fail-closed fallback. In a browser UMD context with R3_0C_Contracts loaded but R3_0C_DeltaMetrics absent, a forged eligible result passes the authority gate and reaches credibility validation. Minimum fix: return INTERNAL_CONTRACT_VIOLATION unless the service and predicate exist, then require isAuthenticResult(result) === true."
]
Adjudication notes:
   - Deep freezing closes post-registration metric mutation.
   - Throwing Proxy access now returns a blocked result without crashing.
   - Path-, URI-, and recognized filename-shaped identifiers are blocked while legitimate dotted IDs pass.
   - The remaining anomaly is the missing-service fail-open branch.
Verdict: BLOCK
Justification (1-3 sentences):
All previously closed lenses remain closed, and all three requested round-three runtime probes pass. However, the UMD fallback still permits forged results past the authority gate when the C5 service is unavailable, so authority remains fail-open in a supported runtime mode.
```

## Driven action

Closure commit `48be2c0 cp1r(c6): close formal Codex C6 round-3 finding — authenticity gate
fail-closed when C5 predicate absent`. See `round-4-48be2c0-PASS.md`.
