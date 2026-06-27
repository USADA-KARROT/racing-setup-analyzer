# R3.0C CP1 round-2 — Formal Codex C-A gate evidence

This directory persists the formal Codex C-A gate evidence for the R3.0C CP1
round-2 retrofit. The round-2 BLOCK adjudication was closed by the retrofit
branch `feat/r3.0-train-cp1-retrofit` through three successive formal Codex
gate rounds, the third of which returned PASS at SHA
`cf28bed48f19c9909406cf645bed804195caf597`.

Per the SKYLINE 2026-06-28 ruling, this directory exists so the PASS verdict
is not held only in conversation memory or Claude's relay — it must be
re-readable from the repository.

## Evidence-tier disclosure (REQUIRED — do not strip from artifact)

The Codex CLI subprocess was driven through the `codex:codex-rescue`
sub-agent inside Claude Code. The raw `codex` CLI stdout was not captured
into this repository; the subprocess output was consumed by the Claude Code
runtime and relayed back as a task-notification message containing the
agent's structured verdict block.

Three tiers therefore apply across the artifacts in this directory:

| Tier | Definition | Status here |
|------|------------|-------------|
| 1 — RAW | The unedited stdout / stderr of the `codex` subprocess invocation. | **NOT CAPTURED.** No artifact in this directory carries the literal CLI bytes. |
| 2 — RELAYED-STRUCTURED | The Codex sub-agent's structured verdict block, delivered to Claude Code through the task-notification channel. | **CAPTURED VERBATIM.** Each `round-*.md` file quotes the verdict block as it appeared in the task-notification, with no rewording. |
| 3 — CO-AUTHORED | Claude's prompt to the sub-agent (the gate-driving instructions) and Claude-verified baseline values. | **CAPTURED VERBATIM.** Each `round-*.md` file quotes the prompt text and the baseline command results. |

A future auditor MUST treat tier-2 + tier-3 evidence as the formal record for
this gate cycle. If a tier-1 audit is later required, the gate MUST be
re-executed with `codex` stdout captured to a side-channel artifact. The
absence of tier-1 capture is intentional record-keeping limitation, not a
suppression.

## Toolchain captured at evidence time

```
codex CLI version: codex-cli 0.141.0
codex binary path: /opt/homebrew/bin/codex
codex binary mtime: 2026-06-21 14:35:52 (local)
host:              macOS Darwin 25.5.0 / Apple Silicon
node:              (matches racing-setup-analyzer package.json engines.node)
sub-agent type:    codex:codex-rescue
sub-agent runner:  Claude Code sub-agent harness
evidence captured: 2026-06-27T23:28:33Z (UTC)
```

## Index

| Round | Reviewed SHA | Verdict | File |
|-------|---------------|---------|------|
| 2 | `e3ac3d627decb53151037cc8e850c73ba18bbd95` | BLOCK · F4/F10/F12 partial | `round-2-e3ac3d6.md` |
| 3 | `2dab434b301664894061ad33768c1025c9f233a6` | BLOCK · F12 partial only | `round-3-2dab434.md` |
| 4 | `cf28bed48f19c9909406cf645bed804195caf597` | **PASS · F1–F12 all closed** | `round-4-cf28bed.md` |

The authoritative PASS verdict for this CP1 round-2 cycle is the round-4
file. The earlier rounds are retained for full audit traceability of the
retrofit / re-gate cycle (each round's BLOCK reasoning produced the next
commit on the retrofit branch).

## What is NOT in this directory

- Codex CLI raw stdout (see tier-1 disclosure above).
- Claude's own pre-Codex GPT-5.4 quick adversarial probe. Per the SKYLINE
  ruling, that earlier GPT probe MUST NOT be recorded here as a formal
  Codex verdict; it informed the retrofit-design phase but did not gate it.
- Any subsequent C-A re-gate of an integration SHA (post-merge into Train).
  When PR #16 reaches the post-merge Train target HEAD, that gate's evidence
  belongs in a new directory keyed by the integration SHA.
