# Codex C-A gate — round 3

## Reviewed remote SHA

`2dab434b301664894061ad33768c1025c9f233a6`
Branch: `feat/r3.0-train-cp1-retrofit`
Lineage at gate time: 6 commits on top of Train HEAD `5f70aaf` (round-2
verdict plus the `cp1r(F4,F10,F12)` close commit).

## Verdict

**BLOCK** — F4 / F10 closed; F12 still partial (internal inconsistency
between the documented `params` plain-object rule and the prescribed
`CANNOT_DISTINGUISH` fallback supplying `params:null`).

## Toolchain

- Codex CLI: `codex-cli 0.141.0`.
- Sub-agent: `codex:codex-rescue` (resumed via `SendMessage` to the same
  sub-agent ID `a1b4c4be8c3aa8786`).
- Wall-clock (this round): `97_972 ms` (per task-notification `<usage>`).
- Sub-agent token usage: `subagent_tokens: 74_757`; `tool_uses: 1`.

## Evidence tier

- Prompt: TIER 3 (verbatim below).
- Verdict block: TIER 2 (relayed verbatim below).
- Baseline: TIER 3 (Claude-verified).
- Raw `codex` CLI stdout/stderr: TIER 1 NOT CAPTURED.

## Prompt (TIER 3 — verbatim)

```
Resume — formal Codex C-A gate, round 3 against new remote HEAD.

New remote HEAD: 2dab434b301664894061ad33768c1025c9f233a6
(your prior verdict was issued against e3ac3d6; this commit closes F4/F10/F12).

Single new commit on top: 2dab434 cp1r(F4,F10,F12): close formal Codex round-2
partials.

I have independently verified in the non-sandboxed environment:
  - npm test = 74 suites / 8130 tests / 0 failed
  - scripts/check-r3-0c-guard.js artifact =
    {ok:true, productionDiff:0, deferredStillDeferred:true}
  - scripts/check-frozen-boundary.js artifact = {ok:true, frozenDiffCount:0}
  - git rev-parse HEAD = 2dab434b301664894061ad33768c1025c9f233a6
  - git status --short = empty (clean)
  - git diff vs 5f70aaf for frozen files: empty

Take these as VERIFIED — do NOT attempt to write artifacts; just do the
substantive read-only review of the THREE specific changes:

  1. contracts/r3.0c/comparison-eligibility-contract.js
     — validateComparisonContextAgainstCase now has SPLIT gates: if assoc
       carries the field but the value is out-of-allowlist, INCOMPATIBLE_*
       is emitted; only with a VALID assoc value do we proceed to compare
       against the context. Re-attempt your prior probe with assoc
       positionBasis = 'bogus' + valid context; it MUST now block.
       Re-attempt with assoc positionDirection = 'sideways'; it MUST now
       block. Also: try assoc with valid basis but invalid direction;
       confirm direction code emits.

  2. renderer/js/r3-0c-corner-segmentation.js
     — overlap detection is now an all-pairs O(n^2) scan over kept[]
       segments. Re-attempt your prior probe with a shaped non-monotonic
       positions array that places three runs at normalized ranges
       [0.10..0.30], [0.40..0.50], [0.15..0.25]; it MUST now fail-closed
       with CORNER_SEGMENTATION_OVERLAPPING_SEGMENTS. Also: confirm a
       genuinely non-overlapping three-run lap still passes.

  3. contracts/r3.0c/reason-codes.js + docs/r3.0c-framing-source-contract.md
     — CANNOT_DISTINGUISH is now a registered REASON_CODES member with the
       standard explanationKey hook. The framing-source contract document
       references it as registered. Confirm: read both files; verify the
       fallback { reasonCode:'CANNOT_DISTINGUISH', i18nKey:..., params:null }
       is now structurally satisfiable per the FRAMING_KEY_SHAPE rules
       (which require reasonCode ∈ REASON_CODES, i18nKey present, optional
       params); confirm the doc no longer documents an impossible state.
       Reason-code total should be 65.

If you find no new substantive hole, the verdict must be PASS or PASS WITH
NON-BLOCKING FINDINGS. If you find another real hole, BLOCK with the
specific code locations and probe inputs.

Same verdict format as your prior reply.
```

## Verdict (TIER 2 — relayed verbatim)

```
== FORMAL CODEX C-A GATE VERDICT ==
RemoteHeadShaReviewed: 2dab434b301664894061ad33768c1025c9f233a6
BaselineChecks: { tests: 74/8130/0 (coordinator-verified, sandbox EPERM bypassed),
                  r3-0c-guard: pass (coordinator-verified),
                  frozen-boundary: pass (coordinator-verified) }
FindingsClosed: [F1 closed, F2 closed, F3 closed, F4 closed, F5 closed,
                 F6 closed, F7 closed, F9 closed, F10 closed, F11 closed,
                 F12 partial]
NewFindings: []
Adjudication notes:
   - F4 closed: split gates block both invalid association values and permit
     valid matches (`comparison-eligibility-contract.js:107-126`; direct probes).
   - F10 closed: all-pairs scanning blocks non-adjacent overlap while the
     non-overlapping control passes (`r3-0c-corner-segmentation.js:153-167`;
     direct probes).
   - F12 remains partial: `CANNOT_DISTINGUISH` is registered, but the
     mandatory fallback supplies `params:null` despite the rule requiring
     supplied `params` to be a plain object
     (`comparison-eligibility-contract.js:53-62`;
     `r3.0c-framing-source-contract.md:16-23,46-50`).
Verdict: BLOCK
Justification (1-3 sentences):
The round-3 changes close F4 and F10 and resolve F12's missing reason code.
F12 remains internally inconsistent because its prescribed fallback still
violates its declared `params` container rule.
```

## Baseline (TIER 3 — Claude-verified)

```
npm test                                  74 suites / 8130 passed / 0 failed
suspension-input-equivalence              5020 passed (raw=1002, observable=501)
scripts/check-r3-0c-guard.js              {"deferredStillDeferred":true,"productionDiff":0,"ok":true}
scripts/check-frozen-boundary.js          {"frozenDiffCount":0,"violations":[],"baseManifestAvailable":true,"ok":true}
git rev-parse HEAD                        2dab434b301664894061ad33768c1025c9f233a6
git status --short                        (empty)
```

## Driven action

The single remaining F12 inconsistency produced the doc-only commit
`cf28bed cp1r(F12): close round-3 fallback inconsistency — drop params:null
sentinel`. See `round-4-cf28bed.md` for the PASS verdict.
