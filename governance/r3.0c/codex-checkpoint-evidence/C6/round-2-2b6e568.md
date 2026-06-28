# Codex C6 review — round 2 (BLOCK)

- **Reviewed SHA**: `2b6e568d2b24b40ab68dc6b3a81a5f66c1f13e99`
- **Branch**: `feat/r3.0c-c6-comparison-export`
- **Verdict**: BLOCK — F-C6-A1-R2 / F-C6-A2-R2 / F-C6-A3-R2 (3 upgraded findings)
- **Tool**: codex-cli 0.141.0 via `codex:codex-rescue`
- **Wall-clock**: `92_427 ms`; tokens: `subagent_tokens: 39_499`, `tool_uses: 1`

## Evidence tier

Same disclosure as round 1 (TIER 1 raw stdout NOT CAPTURED).

## Prompt (TIER 3 — verbatim)

```
Resume — formal R3.0C C6 adversarial review, round 2 against new remote HEAD.

New remote candidate SHA: 2b6e568d2b24b40ab68dc6b3a81a5f66c1f13e99
(your prior verdict at eff0d41 returned BLOCK on F-C6-A1 / F-C6-A2 / F-C6-A3;
single new commit on top closes them).

Coordinator-verified baseline (sandbox EPERM bypassed — take as VERIFIED):
  - npm test = 75 suites / 8210 passed / 0 failed
  - scripts/check-r3-0c-guard.js = {ok:true, productionDiff:0, deferredStillDeferred:true}
  - scripts/check-frozen-boundary.js = {ok:true, frozenDiffCount:0}
  - suspension-input-equivalence: raw=1002, observable=501 intact
  - git rev-parse HEAD = 2b6e568d2b24b40ab68dc6b3a81a5f66c1f13e99
  - working tree clean
  - frozen files diff vs Train HEAD 4d3f219: empty

The fixes (read-only review them):

  F-C6-A1 — renderer/js/r3-0c-delta-metrics.js
    Module-private WeakSet records every result computeDeltaMetrics produces
    (both eligible and blocked); isAuthenticResult(r) exposes membership.
    C6 export requires DeltaMetricsService.isAuthenticResult(request.result)
    === true before reading any field.

  F-C6-A2 — renderer/js/r3-0c-comparison-export.js
    _isPlain wraps Object.getPrototypeOf in try/catch (refuses on throw);
    _safeKeys wraps Object.keys; _safeGet wraps property access.

  F-C6-A3 — renderer/js/r3-0c-comparison-export.js
    ID_GRAMMAR /^[A-Za-z0-9._:\\-]{1,64}$/ enforced on caseId / sessionId /
    lapId / trackId / layoutId / cornerId.

Also confirm round-1 PASS lenses (B/C/D/E/F/G/H/I/J) remain PASS at the new
SHA. Issue PASS or BLOCK per verdict format.
```

## Verdict (TIER 2 — relayed verbatim)

```
== C6 ADVERSARIAL REVIEW VERDICT ==
RemoteCandidateShaReviewed: 2b6e568d2b24b40ab68dc6b3a81a5f66c1f13e99
BaselineChecks: { tests: 75/8210/0 (coordinator-verified), guard: pass, frozen: pass }
Lenses: A open, B closed, C closed, D closed, E closed, F open, G closed, H closed, I closed, J closed
Findings: [
  "renderer/js/r3-0c-delta-metrics.js:124-181 — WeakSet authenticates only the top-level result, while metric records and perCorner arrays remain mutable. After computeDeltaMetrics(), setting result.metrics.delta_cumulative.value=777777 and result.metrics.sector_delta.perCorner[0].value=888888 exports both forged values successfully. Minimum fix: recursively freeze the complete result graph before registering it as authentic.",
  "renderer/js/r3-0c-comparison-export.js:226-255,473-493 — safe traversal is incomplete. A plain-target Proxy whose generationToken getter throws passes _isPlain and crashes buildComparisonExport instead of returning blocked. Minimum fix: use guarded property reads throughout all caller-controlled traversal and retain a catch-all fail-closed boundary around the public builder.",
  "renderer/js/r3-0c-comparison-export.js:105-112,273-293 — ID_GRAMMAR still accepts filename-shaped identifiers such as referenceLap.lapId='telemetry.csv', which is exported verbatim despite filenames being forbidden. Minimum fix: supplement the identifier grammar with rejection of recognized filename extensions while retaining required IDs such as 'lap.42'."
]
Adjudication notes:
   - Literal result forgery is closed, but post-registration mutation bypasses the authenticity guarantee.
   - The specified getPrototypeOf and ownKeys Proxy probes close, but throwing property-access traps remain uncaught.
   - The listed path and URI examples are blocked; standalone filenames remain exportable.
Verdict: BLOCK
Justification (1-3 sentences):
Round-one lenses B/C/D/E/G/H/I/J remain closed, and the phase gate, schema closure, determinism, adapter delegation, and governance integrity remain intact. The authenticity and hostile-object boundaries are still bypassable, and the stated filename privacy rule is incomplete.
```

## Driven action

Closure commit `a87c7d5 cp1r(c6): close formal Codex C6 round-2 findings — deep-freeze +
outer try/catch + filename grammar`. See `round-3-a87c7d5.md`.
