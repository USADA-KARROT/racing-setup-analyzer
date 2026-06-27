# Codex C-A gate — round 4 · **PASS · authoritative CP1 round-2 verdict**

## Reviewed remote SHA

`cf28bed48f19c9909406cf645bed804195caf597`
Branch: `feat/r3.0-train-cp1-retrofit`
Lineage at gate time: 7 commits on top of Train HEAD `5f70aaf` (rounds 2–3
plus the `cp1r(F12)` doc-only fallback fix).

## Verdict

**PASS** — F1 / F2 / F3 / F4 / F5 / F6 / F7 / F9 / F10 / F11 / F12 all closed.
No new findings. This is the authoritative CP1 round-2 outcome for the
retrofit candidate SHA.

## Toolchain

- Codex CLI: `codex-cli 0.141.0`.
- Sub-agent: `codex:codex-rescue` (resumed via `SendMessage` to
  sub-agent ID `a1b4c4be8c3aa8786`).
- Wall-clock (this round): `77_023 ms` (per task-notification `<usage>`).
- Sub-agent token usage: `subagent_tokens: 82_244`; `tool_uses: 1`.

## Evidence tier

- Prompt: TIER 3 (verbatim below).
- Verdict block: TIER 2 (relayed verbatim below).
- Baseline: TIER 3 (Claude-verified).
- Raw `codex` CLI stdout/stderr: TIER 1 NOT CAPTURED.

## Prompt (TIER 3 — verbatim)

```
Resume — formal Codex C-A gate, round 4 against new remote HEAD.

New remote HEAD: cf28bed48f19c9909406cf645bed804195caf597
(your prior verdict was issued against 2dab434; this commit closes F12
round-3 inconsistency).

Single new commit on top: cf28bed cp1r(F12): close round-3 fallback
inconsistency — drop params:null sentinel.

Doc-only change. Tests, contracts, production code unchanged. Independently
verified:
  - npm test = 74 suites / 8130 tests / 0 failed
  - git rev-parse HEAD = cf28bed48f19c9909406cf645bed804195caf597
  - working tree clean

The fix: in docs/r3.0c-framing-source-contract.md
  (a) The rule section now explicitly says params is OPTIONAL and when
      supplied MUST be a plain object; the orchestrator MUST NOT supply
      params:null as a sentinel; to indicate "no params", omit the key
      entirely.
  (b) The CANNOT_DISTINGUISH fallback is rewritten as
      { reasonCode: 'CANNOT_DISTINGUISH', i18nKey:
        'r3_0c.framing.cannot_distinguish' }
      with params omitted.
  (c) The table row for cannot_distinguish_reasons is rewritten to say
      "array of { reasonCode, i18nKey, params? } entries (each entry
      follows FRAMING_KEY_SHAPE; params is OMITTED when the entry carries
      no parameters)".

This makes the framing-source contract internally satisfiable end-to-end:
  - reasonCode 'CANNOT_DISTINGUISH' ∈ REASON_CODES (registered last round).
  - i18nKey is the canonical r3_0c.framing.cannot_distinguish hook.
  - params is OPTIONAL per FRAMING_KEY_SHAPE.optionalKeys; omitting respects
    optionality.

Verify the doc is now consistent with itself AND with FRAMING_KEY_SHAPE as
exposed by contracts/r3.0c/comparison-eligibility-contract.js. If consistent,
issue PASS or PASS WITH NON-BLOCKING FINDINGS. If you find another real
hole, BLOCK with specific file:line + probe.

Same verdict format as your prior replies.
```

## Verdict (TIER 2 — relayed verbatim · authoritative)

```
== FORMAL CODEX C-A GATE VERDICT ==
RemoteHeadShaReviewed: cf28bed48f19c9909406cf645bed804195caf597
BaselineChecks: { tests: 74/8130/0 (coordinator-verified, sandbox EPERM bypassed),
                  r3-0c-guard: pass (coordinator-verified),
                  frozen-boundary: pass (coordinator-verified) }
FindingsClosed: [F1 closed, F2 closed, F3 closed, F4 closed, F5 closed,
                 F6 closed, F7 closed, F9 closed, F10 closed, F11 closed,
                 F12 closed]
NewFindings: []
Adjudication notes:
   - none
Verdict: PASS
Justification (1-3 sentences):
F12 is consistent across the documented rules
(`docs/r3.0c-framing-source-contract.md:16-28,49-57`), exported shape
(`comparison-eligibility-contract.js:53-62`), and registered reason code
(`reason-codes.js:130-149`); the in-process probe passed omission and `{}`
while rejecting `null` and arrays. `git show --stat cf28bed` confirmed the
commit modifies only that document.
```

## Baseline (TIER 3 — Claude-verified)

```
npm test                                  74 suites / 8130 passed / 0 failed
suspension-input-equivalence              5020 passed (raw=1002, observable=501)
scripts/check-r3-0c-guard.js              {"deferredStillDeferred":true,"productionDiff":0,"ok":true}
scripts/check-frozen-boundary.js          {"frozenDiffCount":0,"violations":[],"baseManifestAvailable":true,"ok":true}
git rev-parse HEAD                        cf28bed48f19c9909406cf645bed804195caf597
git status --short                        (empty)
git diff vs 5f70aaf for frozen files      (empty)
```

## Output hash

`sha256(verdict block)` is recorded in `verdict-hashes.txt` in this
directory. Future audits MUST verify the hash matches before treating the
quoted verdict block as the canonical record.

## Authoritative use

This file is the formal CP1 round-2 PASS evidence used by the C5R
checkpoint manifest (`governance/r3.0c/checkpoints/C5R.json` field
`reviewedCandidateSha`). The integration of this branch into the Train is
governed by a SEPARATE PR + CI cycle; that cycle MUST NOT reuse this
verdict to claim the post-merge Train HEAD has been Codex-reviewed.
