# Codex C7 Round 5 — Tier 1 raw stdout capture

reviewedCandidateSha: a1a6988e16f2b2e70d6c385c9239f395d3359d26
branch: feat/r3.0c-c7-comparison-workspace
codexCliVersion: codex-cli 0.141.0
utcStartedAt: 2026-06-28T03:36:32Z
cwd: /Users/SKYLINE/Claude/projects/racing-setup-analyzer

---- BEGIN codex exec ----
OpenAI Codex v0.141.0
--------
workdir: /Users/SKYLINE/Claude/projects/racing-setup-analyzer
model: gpt-5.5
provider: openai
approval: never
sandbox: read-only
reasoning effort: none
reasoning summaries: none
session id: 019f0c4c-dedf-7ff2-ae31-f57519bde84c
--------
user
# Codex C7 Round 5 — Comparison Workspace UI · Adversarial Review

ROLE: Adversarial reviewer. TRY TO BREAK. Round 4 BLOCK on C6 _allowlistFrame TOCTOU is the most recent close.

REVIEWED CANDIDATE
- Repo: USADA-KARROT/racing-setup-analyzer (clone /Users/SKYLINE/Claude/projects/racing-setup-analyzer)
- Branch: feat/r3.0c-c7-comparison-workspace
- SHA: a1a6988e16f2b2e70d6c385c9239f395d3359d26
- Base SHA: 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9
- Round 4 evidence: governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md
- Round 3 evidence: governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md
- Round 2 evidence: governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md

NEW SCOPE in a1a6988 vs fc6ff8f:
- renderer/js/r3-0c-comparison-export.js _allowlistFrame now delegates to
  FIR.validateFramingEntry and consumes vr.sanitized; no raw frame.* re-reads.
- tests/r3-0c-comparison-export.test.js Z1-Z4 — registry-strict, get-trap, descriptor-trap,
  throwing accessor.

CHECKS — output BLOCK + attack if ANY hold.

1. SANITIZED EVERYWHERE
   • Grep the entire production tree (renderer/js/, contracts/r3.0c/, main.js, preload.js)
     for `frame.reasonCode`, `frame.i18nKey`, `frame.params`, `entry.reasonCode`,
     `entry.i18nKey`, `entry.params`, `v.reasonCode`, `v.i18nKey`, `v.params`,
     `e.reasonCode`, `e.i18nKey`, `e.params`, and any other re-read of a caller-supplied
     framing field after FIR.validateFramingEntry returned. Flag any unchecked re-read.
   • Verify that BOTH C6 and the orchestrator's framing handling are now sanitized-only.

2. C6 / C7 INTERACTION
   • The orchestrator's exportComparison delegates to C6 buildComparisonExport. Confirm the
     framing field passed from orchestrator → C6 carries SANITIZED entries (the orchestrator
     built them via vr.sanitized), so C6 doesn't need to defend at a layer the orchestrator
     already secured. But also confirm C6 still defends when invoked DIRECTLY with caller-
     controlled framing (e.g. by a test or by a future R3.0B integration that bypasses the
     orchestrator).

3. D1 / J1 / D / B / C closures HOLD
   • D1: no public registration on orchestrator; viewmodel cannot bestow authority.
   • J1: bundle equivalence test passes; index.html has 5 script tags in order; browser
     bundle evaluates cleanly and registers all R3_0C_* globals.
   • D (init structured failure): UI_INITIALIZATION_FAILED reachable.
   • B/C (getter tri-state + sanitized snapshot): every callsite consumes sanitized.

4. GOVERNANCE
   • authPathCount=14 (bundle included).
   • enabledCaps=12, currentCheckpoint=C7_UI, feature_registry_active=false, three R3.0C
     feature IDs deferred, phase_boundary_contract disabled, frozenDiff=0,
     R3.0B schema untouched, presetCount=501.

5. SCOPE
   • Frozen physics / dynamics / preset / R3.0B portable schema: untouched.

6. TESTS AT THE RIGHT LAYER
   • Z1-Z4 in r3-0c-comparison-export.test.js prove the C6 closure (descriptor-trap,
     get-trap, throwing accessor, registry-strict).
   • B25-B27 in r3-0c-comparison-workspace.test.js prove the framing-source closure.
   • G3/G3b/G3c prove D1 closure.

7. NEW FAILURE MODES INTRODUCED BY THE Round-4 FIX
   • Is FIR.validateFramingEntry a Node-side hot path that the C6 service now invokes per
     framing entry? Verify the per-entry cost is bounded and does not regress existing C6
     tests' throughput / memory.
   • Could a Proxy whose getOwnPropertyDescriptor returns invalid metadata (e.g.
     accessor descriptor for a key claimed as data) confuse FIR? The Round-2-3 fix
     classified accessor descriptors as THREW. Re-verify this still holds against the
     post-Round-4 codepath.

8. ANY REMAINING C7-SCOPE ISSUE — speak up.

EVIDENCE REQUIRED — same format. VERDICT: PASS or BLOCK on last line.

A clean PASS unlocks: persist Round 5 evidence, complete C7 manifest with
reviewedCandidateSha=a1a6988e, branch-to-branch PR (feat/r3.0c-c7-comparison-workspace →
feat/r3.0-integrated-delivery), CI run, Train merge, multi-source verify, memory update,
auto-start C8.

codex
I’ll audit the candidate against the stated base and prior evidence, trace every framing-validation callsite, then run the targeted and governance test suites. I’ll treat any unverifiable requirement or residual caller-controlled re-read as a BLOCK.
exec
/bin/bash -lc 'git status --short && git branch --show-current && git rev-parse HEAD && git rev-parse 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9 && rg --files governance/r3.0c renderer/js contracts/r3.0c tests | wc -l' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-o43ZoRuO' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-zQ3twxb7' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-kTal8iLu' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-JGKPSsIY' (errno=Operation not permitted)
feat/r3.0c-c7-comparison-workspace
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-GpjBPVXN' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-p7XRbDsI' (errno=Operation not permitted)
a1a6988e16f2b2e70d6c385c9239f395d3359d26
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-WBBJQbZv' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-lO4WjJ25' (errno=Operation not permitted)
9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9
     211

exec
/bin/bash -lc "git diff --stat 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..a1a6988e16f2b2e70d6c385c9239f395d3359d26 && git diff --stat fc6ff8f..a1a6988e && sed -n '1,240p' governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md && rg -n '\"(test|scripts)|r3-0c' package.json" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-NnFM69Mf' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-7sPydxER' (errno=Operation not permitted)
 contracts/r3.0c/framing-i18n-key-registry.js       |  213 +
 contracts/r3.0c/index.js                           |    6 +-
 contracts/r3.0c/reason-codes.js                    |   10 +
 .../r3.0c/viewmodel-state-transition-contract.js   |  136 +
 governance/r3.0/train.json                         |    4 +-
 governance/r3.0c/capabilities.json                 |   12 +-
 governance/r3.0c/checkpoints/C7.json               |   97 +
 .../C7/round-2-c51952a.md                          | 2096 ++++++++
 .../C7/round-3-ae039008.md                         | 5194 ++++++++++++++++++++
 .../C7/round-4-fc6ff8f8.md                         | 4737 ++++++++++++++++++
 governance/r3.0c/state.json                        |   16 +-
 package.json                                       |    2 +-
 renderer/index.html                                |  180 +-
 renderer/js/i18n-comparisons.js                    |  186 +
 renderer/js/r3-0c-comparison-export.js             |   61 +-
 renderer/js/r3-0c-comparison-orchestrator.js       |  351 ++
 renderer/js/r3-0c-comparison-viewmodel.js          |  277 ++
 renderer/js/r3-0c-contracts-bundle.js              | 1869 +++++++
 scripts/build-r3-0c-contracts-bundle.js            |  119 +
 tests/i18n-parity.test.js                          |   11 +
 tests/r3-0c-comparison-export.test.js              |   65 +
 tests/r3-0c-comparison-workspace.test.js           |  423 ++
 tests/r3-0c-contracts-bundle-equivalence.test.js   |   78 +
 tests/r3-0c-governance.test.js                     |    8 +-
 tests/r3-0c-no-consumer.test.js                    |   11 +-
 tests/r3.0a-ui.test.js                             |   12 +-
 tests/r3.0c-contract-foundation.test.js            |    4 +-
 27 files changed, 16118 insertions(+), 60 deletions(-)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-AwCAwNQD' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-S1PumJWY' (errno=Operation not permitted)
 .../C7/round-4-fc6ff8f8.md                         | 4737 ++++++++++++++++++++
 renderer/js/r3-0c-comparison-export.js             |   61 +-
 tests/r3-0c-comparison-export.test.js              |   65 +
 3 files changed, 4837 insertions(+), 26 deletions(-)
# Codex C7 Round 4 — Tier 1 raw stdout capture

reviewedCandidateSha: fc6ff8f81629593d24c6af7e3274e89607c34ed7
branch: feat/r3.0c-c7-comparison-workspace
codexCliVersion: codex-cli 0.141.0
utcStartedAt: 2026-06-28T03:29:53Z
cwd: /Users/SKYLINE/Claude/projects/racing-setup-analyzer
baseTrainSha: 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9

---- BEGIN codex exec ----
OpenAI Codex v0.141.0
--------
workdir: /Users/SKYLINE/Claude/projects/racing-setup-analyzer
model: gpt-5.5
provider: openai
approval: never
sandbox: read-only
reasoning effort: none
reasoning summaries: none
session id: 019f0c46-c9e2-7b40-8f8a-95e621e7ecba
--------
user
# Codex C7 Round 4 — Comparison Workspace UI · Adversarial Review (post-TOCTOU-fix)

ROLE: Adversarial reviewer. TRY TO BREAK; do not validate.

REVIEWED CANDIDATE
- Repo: USADA-KARROT/racing-setup-analyzer (local clone at /Users/SKYLINE/Claude/projects/racing-setup-analyzer)
- Branch: feat/r3.0c-c7-comparison-workspace
- SHA (must verify before reviewing): fc6ff8f81629593d24c6af7e3274e89607c34ed7
- Base SHA (Train integration target): 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9
- Round: 4 (Round 3 BLOCKER C7-R3-C-01 — Proxy descriptor TOCTOU — closed by this candidate).
- Prior raw evidence:
    governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md
    governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md

NEW SCOPE in fc6ff8f vs ae03900:
- contracts/r3.0c/framing-i18n-key-registry.js validateFramingEntry returns
  { valid: true, sanitized: <frozen plain-object snapshot> }. Sanitized is the ONLY safe
  surface for downstream consumption; callers must not re-read the raw entry.
- renderer/js/r3-0c-comparison-orchestrator.js _validateFramingOrFallback and _buildFraming
  now consume vr.sanitized / er.sanitized, never re-reading caller fields after validation.
- tests/r3-0c-comparison-workspace.test.js B25 / B26 / B27 — Proxy lying descriptor, sanitized
  frozen-snapshot contract, inner params lying descriptor.
- governance/r3.0c/state.json + checkpoints/C7.json add renderer/js/r3-0c-contracts-bundle.js
  to authorizedProductionPaths / authorizedPaths / newlyAuthorizedPaths (capability=ui_present).
- renderer/js/r3-0c-contracts-bundle.js regenerated (116,083 bytes).
- tests/r3-0c-governance.test.js A4 authPathCount assertion 13 → 14.

NON-NEGOTIABLE CHECKS — output BLOCK + concrete attack if ANY hold.

A. TOCTOU CLOSURE — sanitized snapshot is the only safe surface
   • Verify validateFramingEntry result.sanitized is deep-frozen and contains ONLY
     reasonCode (string), i18nKey (string), and optionally params (plain frozen object).
   • Verify no orchestrator code path re-reads `v.reasonCode`, `v.i18nKey`, `v.params`,
     `cd[i].*` after validation. The validator's sanitized is the only post-validation
     accessor.
   • Verify the C5 export service, the C6 export service, and ANY other downstream that
     consumes framing entries also use the sanitized surface (or do not re-read raw entries).
     Grep for `.reasonCode` and `.i18nKey` on caller-controlled objects across the
     production tree; flag any unchecked re-read.
   • Construct: a Proxy whose getOwnPropertyDescriptor lies AND a setter trap that mutates
     observed state when descriptor is queried. Even with sanitized in place, can any
     post-validation code path provoke a side effect via the original Proxy?
   • Construct: a getter that returns DIFFERENT values on consecutive descriptor reads
     (each call has side effects). Sanitized captures the value from the first descriptor
     read; the validator's safety relies on getOwnPropertyDescriptor's data descriptor
     not being read again. Confirm.
   • Verify inner params: sanitized.params is a fresh frozen plain object — NOT the original
     params object. Same descriptor-vs-property TOCTOU at the nested level should be
     defeated.

B. D1 closure must remain held
   • Public API of createOrchestrator return: still no registerAuthenticCaseRecord /
     isAuthenticCaseRecord.
   • The viewmodel still does NOT call any orchestrator registration method.
   • The renderer's _r3cC7AuthenticCaseRecords WeakSet is unreachable from viewmodel.

C. J1 closure must remain held
   • Bundle byte-for-byte equivalence test passes; bundle size = generator output.
   • The five script tags load in dependency order.
   • Browser-load probe (HTTP-served renderer/) yields R3_0C_Contracts /
     ComparisonOrchestrator / ComparisonViewModel / DeltaMetrics / ComparisonExport globals.
   • Reason codes count = 66; UI_INITIALIZATION_FAILED present.
   • Bundle is listed in state.json + C7.json authorizedProductionPaths.

D. D closure (structured init failure) must remain held.

E. Governance integrity
   • authPathCount = 14 (was 13; +1 bundle).
   • enabledCapabilities count = 12.
   • currentCheckpoint = C7_UI.
   • feature_registry_active = false.
   • Three R3.0C feature IDs remain availability=deferred.
   • phase_boundary_contract.enabled = false.

F. Frozen / persistence boundary
   • frozenDiffCount = 0.
   • R3.0B portable case schema: untouched.
   • presetCount = 501.

G. Tests at the right layer
   • Round 3's exact attack (the Proxy + accessor + lying descriptor) is in B25 and passes.
   • Sanitized contract (frozen, equal-to-validated-values) is in B26 a-d.
   • Inner params attack is in B27.

EVIDENCE REQUIRED IN VERDICT — same format as Round 3.

VERDICT (last line, exact form): "VERDICT: PASS" or "VERDICT: BLOCK".

A clean PASS unlocks: persist evidence + C7 manifest reviewedCandidateSha = fc6ff8f8 +
branch-to-branch PR (feat/r3.0c-c7-comparison-workspace → feat/r3.0-integrated-delivery) +
target-context CI + Train merge + memory update + C8 auto-start.

codex
I’m using the GitHub triage skill for review structure, while treating the local pinned SHAs and tests as the authoritative evidence. I’ll verify repository identity first, then inspect the diff, attack surfaces, governance, and runtime probes.
exec
/bin/bash -lc "sed -n '1,240p' '/Users/SKYLINE/.codex/plugins/cache/openai-curated-remote/github/0.1.5/skills/github/SKILL.md'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
---
name: github
description: Triage and orient GitHub repository, pull request, and issue work through the connected GitHub app. Use when the user asks for general GitHub help, wants PR or issue summaries, or needs repository context before choosing a more specific GitHub workflow.
---

# GitHub

## Overview

Use this skill as the umbrella entrypoint for general GitHub work in this plugin. It should decide whether the task stays in repo and PR triage or should be handed off to a more specific review, CI, or publish workflow.

This plugin is intentionally hybrid:

- Prefer the GitHub app from this plugin for repository, issue, pull request, comment, label, reaction, and PR creation workflows.
- Use local `git` and `gh` only when the connector does not cover the job well, especially for current-branch PR discovery, branch creation, commit and push, `gh auth status`, and GitHub Actions log inspection.
- Keep connector state and local checkout context aligned. If the request is about the current branch, resolve the local repo and branch before acting.

Once the intent is clear, route to the specialist skill immediately and do not keep broad GitHub triage in scope longer than needed.

## Connector-First Responsibilities

Handle these directly in this skill when the request does not need a narrower specialist workflow:

- repository orientation once the repo, PR, issue, or local checkout is identified
- recent PR or issue triage
- PR metadata summaries
- PR patch inspection
- PR comments, labels, and reactions
- issue lookup and summarization
- PR creation after a branch is already pushed

Prefer the GitHub app from this plugin for those flows because it provides structured PR, issue, and review-adjacent data without depending on a local checkout. If the repository is not already identifiable from the user request or local git context, ask for the repo instead of pretending there is a repo-search flow that may not exist.

## Routing Rules

1. Resolve the operating context first:
   - If the user provides a repository, PR number, issue number, or URL, use that.
   - If the request is about "this branch" or "the current PR", resolve local git context and use `gh` only as needed to discover the branch PR.
   - If the repository is still ambiguous after local inspection, ask for the repo identifier.
2. Classify the request before taking action:
   - `repo or PR triage`: summarize PRs, issues, patches, comments, labels, reactions, or repository state
   - `review follow-up`: unresolved review threads, requested changes, or inline review feedback
   - `CI debugging`: failing checks, Actions logs, or CI root-cause analysis
   - `publish changes`: create or switch branches, stage changes, commit, push, and open a draft PR
3. Route to the specialist skill as soon as the category is clear:
   - Review comments and requested changes: `../gh-address-comments/SKILL.md`
   - Failing GitHub Actions checks: `../gh-fix-ci/SKILL.md`
   - Commit, push, and open PR: `../yeet/SKILL.md`
4. Keep the hybrid model consistent after routing:
   - connector first for PR and issue data
   - local `git` and `gh` only for the specific gaps the connector does not cover

## Default Workflow

1. Resolve repository and item scope.
2. Gather structured PR or issue context through the GitHub app from this plugin.
3. Decide whether the task stays in connector-backed triage or needs a specialist skill.
4. Route immediately when the work becomes review follow-up, CI debugging, or publish workflow.
5. End with a clear summary of what was inspected, what changed, and what remains.

## Output Expectations

- For triage requests, return a concise summary of the repository, PR, or issue state and the next likely action.
- For mixed requests, tell the user which specialist path you are taking and why.
- For connector-backed write actions, restate the exact PR, issue, label, or reaction target before applying the change.
- Never imply that GitHub Actions logs are available through the connector alone. That remains a `gh` workflow.

## Examples

- "Use GitHub to summarize the open PRs in this repo and tell me what needs attention."
- "Help with this PR."
- "Review the latest comments on PR 482 and tell me what is actionable."
- "Debug the failing checks on this branch."
- "Commit these changes, push them, and open a draft PR."

exec
/bin/bash -lc "rg --files | sort | sed -n '1,240p'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
CITATION.cff
README.md
contracts/r3.0c/comparison-eligibility-contract.js
contracts/r3.0c/comparison-export-contract.js
contracts/r3.0c/credibility-contract.js
contracts/r3.0c/delta-metrics-contract.js
contracts/r3.0c/framing-i18n-key-registry.js
contracts/r3.0c/index.js
contracts/r3.0c/normalized-position-contract.js
contracts/r3.0c/reason-codes.js
contracts/r3.0c/reference-and-corner-contract.js
contracts/r3.0c/valid-lap-contract.js
contracts/r3.0c/viewmodel-state-transition-contract.js
docs/analysis-case-contract.md
docs/analysis-workspace-architecture.md
docs/bmsbin-channel-identity-confirmation.md
docs/bmsbin-channel-linking-notes.md
docs/bmsbin-confirmation-criteria.md
docs/bmsbin-extraction-eligibility-notes.md
docs/bmsbin-local-validation-summary.md
docs/bmsbin-local-validation-template.md
docs/bmsbin-measured-extraction-harness-notes.md
docs/bmsbin-physical-scaling-confirmation.md
docs/bmsbin-probe-notes.md
docs/bmsbin-raw-extraction-notes.md
docs/bmsbin-raw-stream-confirmation.md
docs/bmsbin-structure-discovery-notes.md
docs/bmsbin-telemetry-readiness.md
docs/bmsbin-timebase-confirmation.md
docs/canonical-parameter-contract.md
docs/credibility-and-trust.md
docs/fsae/知識文索引.md
docs/phase-3-trust-chain.md
docs/physics-notes.md
docs/product-positioning.md
docs/r2-capability-map.md
docs/r2.3-real-telemetry-validation.md
docs/r2.4-model-calibration-measured-metrics.md
docs/r2.5-setup-ab-quantitative-recommendation.md
docs/r2.6-track-intelligence-corner-coaching.md
docs/r3-0-train-governance.md
docs/r3-0c-integrated-delivery-governance.md
docs/r3-gate0-trusted-verification.md
6:  "scripts": {
8:    "test": "node tests/verify-dynamics.js && node tests/telemetry-core.test.js && node tests/telemetry-view.test.js && node tests/telemetry-plot.test.js && node tests/telemetry-interact.test.js && node tests/telemetry-yaw.test.js && node tests/canonical-parameters.test.js && node tests/parameter-conversions.test.js && node tests/vehicle-profile-f312.test.js && node tests/setup-snapshot.test.js && node tests/analysis-case.test.js && node tests/analysis-case-adversarial.test.js && node tests/suspension-input-normalizer.test.js && node tests/suspension-input-equivalence.test.js && node tests/suspension-input-adversarial.test.js && node tests/canonical-model-input.test.js && node tests/analysis-execution.test.js && node tests/telemetry-observation.test.js && node tests/model-telemetry-comparison.test.js && node tests/race-engineer-insight.test.js && node tests/driver-coach-insight.test.js && node tests/analysis-workspace.test.js && node tests/analysis-workspace-viewmodel.test.js && node tests/analysis-workspace-integration.test.js && node tests/analysis-workspace-ui.test.js && node tests/telemetry-import-adapter.test.js && node tests/channel-mapping.test.js && node tests/calibration-registry.test.js && node tests/analysis-window.test.js && node tests/canonical-telemetry-session.test.js && node tests/analysis-case-export.test.js && node tests/r2.3-real-telemetry-integration.test.js && node tests/r2.3-import-ui.test.js && node tests/measured-metrics.test.js && node tests/r2.4-measured-metrics-integration.test.js && node tests/r2.4-ui.test.js && node tests/setup-ab.test.js && node tests/quantitative-setup-recommendation.test.js && node tests/r2.5-setup-ab-quantitative-integration.test.js && node tests/r2.5-ui.test.js && node tests/track-intelligence.test.js && node tests/r2.6-track-intelligence-integration.test.js && node tests/r2.6-ui.test.js && node tests/case-shell.test.js && node tests/r3.0a-ui.test.js && node tests/storage-backend.test.js && node tests/schema-migration.test.js && node tests/case-record-schema.test.js && node tests/case-store.test.js && node tests/session-store.test.js && node tests/case-library-viewmodel.test.js && node tests/r3.0b-ui.test.js && node tests/r3.0b-persistence-integration.test.js && node tests/feature-registry.test.js && node tests/feature-router.test.js && node tests/vehicle-preset-pipeline.test.js && node tests/i18n-parity.test.js && node tests/r3.0c-contract-foundation.test.js && node tests/r3-0c-comparison-adapter.test.js && node tests/r3-0c-lap-authority.test.js && node tests/r3-0c-track-identity.test.js && node tests/r3-0c-distance-authority.test.js && node tests/r3-0c-normalized-distance.test.js && node tests/r3-0c-reference-selection.test.js && node tests/r3-0c-corner-segmentation.test.js && node tests/r3-0c-corner-pairing.test.js && node tests/r3-0c-delta-metrics.test.js && node tests/r3-0c-comparison-export.test.js && node tests/r3-0c-comparison-workspace.test.js && node tests/r3-0c-contracts-bundle-equivalence.test.js && node tests/r3-0c-governance.test.js && node tests/r3-0c-no-consumer.test.js && node tests/r3-0c-governance-integrity.test.js && node tests/r3-0-phase-governance.test.js && node tests/r3-0-phase-no-consumer.test.js && node tests/r3-0-phase-governance-integrity.test.js && node tests/r3-0-train.test.js && node tools/validate-against-telemetry.js --selftest",

codex
The checkout matches the requested branch and SHA. The Round-5 delta is confined to the C6 export helper and its tests; I’m now checking whether the helper’s new dependency is safely resolved in both Node and browser contexts and whether any raw-object access remains after validation.
exec
/bin/bash -lc "sed -n '1,260p' renderer/js/r3-0c-comparison-export.js && sed -n '1,430p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '1,300p' contracts/r3.0c/framing-i18n-key-registry.js && rg -n --glob '"'!r3-0c-contracts-bundle.js'"' '(frame|entry|v|e|cd\\[["'^]]+'"\\])\\.(reasonCode|i18nKey|params)' renderer/js contracts/r3.0c main.js preload.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
/**
 * renderer/js/r3-0c-comparison-export.js — R3.0C C6 · Comparison Export Service.
 *
 * Closed-allowlist gateway between authoritative C5 delta-metrics results and the bounded portable
 * export envelope defined by contracts/r3.0c/comparison-export-contract.js. This service does NOT
 * compute anything new — it validates input authority, rebuilds an explicit allowlist payload from
 * service output, applies bounded caps, calls the contract envelope builder, round-trips the JSON
 * representation (serialize → parse → re-validate), and returns a frozen envelope.
 *
 * The directive's allowlist (R3.0 Continuous Delivery §七 C6):
 *   Allowed: schema identity / version / generatedAt (envelope), comparisonStatus, referenceLap,
 *            comparisonLap, association, cumulativeDelta, corners, metricAvailability, credibility,
 *            confidence, provenance, limitations, blockers, cannotConclude, alternativeExplanations,
 *            nextValidationAction.
 *   Forbidden: raw telemetry, normalized grids, per-sample traces, channel arrays, full session
 *              objects, IndexedDB keys, filenames, private paths, arbitrary user metadata,
 *              reactive UI state, class instance, Date / Map / Set / typed arrays, callback /
 *              function, unbounded prose, the caller's complete result spread.
 *
 * Blocked export contract (directive): only current + authoritative + service-produced blocked
 * results may be exported. Blocked envelopes carry status / reasonCodes / limitations / minimal
 * identity / next validation action — never fabricated metrics.
 *
 * Authority discipline (the ten builder steps from the directive):
 *   1. Validate the result is shaped like a C5 service output (status + sign + metrics shape).
 *   2. Validate the association block (caseId / sessionId / track / layout / basis / direction).
 *   3. Validate the generation token is a non-empty string supplied by the caller (the orchestrator
 *      is responsible for token freshness — this service refuses an absent token).
 *   4. Explicit allowlist: only the directive-named fields land in the payload.
 *   5. Rebuild a plain object from scratch — never spread or assign the caller's result.
 *   6. Apply bounded item caps + per-string + total UTF-8 byte caps (delegated to the envelope
 *      contract's validator).
 *   7. Validate the constructed envelope.
 *   8. JSON.stringify the envelope (deterministic ordering follows the allowlist key order).
 *   9. JSON.parse the serialized string.
 *  10. Re-validate the parsed envelope — round-trip equivalence is the export's deterministic
 *      contract. Any round-trip drift fails closed.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonExport).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  var DeltaMetricsService = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
    // The C6 service consumes the C5 service's authenticity predicate (formal Codex C6 finding
    // F-C6-A1). Loading is best-effort: in fixture trees where C5 service is absent the export
    // service degrades to fail-closed on every authenticity check (no caller can fake it).
    try { DeltaMetricsService = require('./r3-0c-delta-metrics.js'); } catch (e) { DeltaMetricsService = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-export.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var EX = Contracts.comparisonExport;
  var CE = Contracts.comparisonEligibility;
  var CR = Contracts.credibility;
  var DM = Contracts.deltaMetrics;
  // Codex C7-R4-* closure: C6 framing entries are now validated through the framing-i18n-key
  // registry and consumed via the sanitized snapshot (TOCTOU defeat). FIR may be absent in
  // fixture trees where the contract aggregator is stubbed; _allowlistFrame fails closed when
  // FIR is missing.
  var FIR = Contracts.framingI18nKeyRegistry;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C6_EXPORT';
  var SIGN_FORMULA = 'comparison_minus_reference';

  // recognised authoritative C5 service status values; nothing else is treated as a service result.
  var ELIGIBLE_RESULT_STATUS = 'delta_metrics_computed';
  var BLOCKED_RESULT_STATUS = 'blocked';
  // closed payload key sets (eligible + blocked). The builder constructs these in fixed order so
  // JSON.stringify produces a deterministic byte stream for a given input.
  var ELIGIBLE_PAYLOAD_KEYS = Object.freeze([
    'comparisonStatus',
    'referenceLap',
    'comparisonLap',
    'association',
    'cumulativeDelta',
    'corners',
    'metricAvailability',
    'credibility',
    'confidence',
    'provenance',
    'limitations',
    'blockers',
    'cannotConclude',
    'alternativeExplanations',
    'nextValidationAction',
  ]);
  var BLOCKED_PAYLOAD_KEYS = Object.freeze([
    'comparisonStatus',
    'status',
    'reasonCodes',
    'limitations',
    'identity',
    'nextValidationAction',
  ]);
  // bounded caps that mirror the export envelope contract.
  var MAX_CORNERS = EX.MAX_BOUNDED_ARRAY; // 64
  var MAX_LIMITATIONS = EX.MAX_BOUNDED_ARRAY;
  var MAX_FRAMING_ENTRIES = EX.MAX_BOUNDED_ARRAY;
  var MAX_PARAM_STRING_BYTES = 256;       // matches FRAMING_KEY_SHAPE.paramsValueRule short_string
  var MAX_GENERAL_STRING_BYTES = EX.MAX_STRING_UTF8_BYTES; // 4096

  // C6 bounded identifier grammar (formal Codex C6 finding F-C6-A3 round 1 + round 2):
  // caller-supplied identifiers (caseId / sessionId / lapId / trackId / layoutId / cornerId) MUST
  // NOT carry path-, URI-, filename-, or whitespace-shaped content. The grammar accepts the small
  // ASCII set used by R2.6 / R3.0B identifiers (alphanumerics, underscore, hyphen, dot, colon) up
  // to 64 chars. Round 2 supplement: even a dotted ID can be filename-shaped (e.g. 'telemetry.csv').
  // We reject any ID ending in a recognized data / archive / config / key file extension while
  // keeping legitimate dotted IDs like 'lap.42', 'corner.T1', 'sess.alpha'.
  var ID_GRAMMAR = /^[A-Za-z0-9._:\-]{1,64}$/;
  var FORBIDDEN_FILENAME_EXTENSIONS = /\.(?:csv|tsv|xlsx?|sqlite|sqlite3|db|json|jsonl|ndjson|xml|yaml|yml|ini|conf|cfg|txt|log|dat|bin|bak|tmp|cache|key|pem|crt|cer|asc|gpg|p12|pfx|env|html?|md|pdf|zip|gz|tar|7z|rar|sql|map|min|wasm|exe|dll|so|dylib|app|dmg|iso|img|bmsbin|csv\.gz|tar\.gz)$/i;
  function _isBoundedId(s) {
    if (typeof s !== 'string') return false;
    if (!ID_GRAMMAR.test(s)) return false;
    if (FORBIDDEN_FILENAME_EXTENSIONS.test(s)) return false;
    return true;
  }

  // helpers
  function _isPlain(v) {
    // Defensive against malicious Proxy / accessor inputs (formal Codex C6 finding F-C6-A2):
    // any throw from Object.getPrototypeOf must be treated as "not plain" (fail-closed). The
    // try/catch boundary makes a Proxy with a throwing getPrototypeOf trap refuse to traverse.
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
    try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
    catch (e) { return false; }
  }
  // Safe Object.keys + property access for inputs that may carry malicious traps.
  function _safeKeys(o) { try { return Object.keys(o); } catch (e) { return null; } }
  function _safeGet(o, k) { try { return o[k]; } catch (e) { return undefined; } }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _isFiniteNumOrNull(v) { return v === null || _isFiniteNum(v); }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _utf8ByteLength(s) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }
  function _shortString(s, cap) {
    if (typeof s !== 'string') return null;
    return _utf8ByteLength(s) <= (cap || MAX_GENERAL_STRING_BYTES) ? s : null;
  }
  function _allowlistFrame(frame) {
    // Codex C7-R4-* closure (Proxy descriptor TOCTOU cascaded to C6). FRAMING_KEY_SHAPE
    // ({ reasonCode, i18nKey, params? }) is the framing-i18n-key-registry's domain. The previous
    // _allowlistFrame implementation re-read frame.reasonCode / frame.i18nKey / frame.params via
    // plain o[k] access AFTER (or instead of) validation — a Proxy can return different values
    // on each access, and the C6 caller-supplied framing field had NO i18nKey-registry check at
    // all. Both holes are now closed by delegating to FIR.validateFramingEntry, which returns a
    // deep-frozen sanitized snapshot built from descriptor-read values, AND by consuming ONLY
    // that snapshot.
    //
    // C6 also enforces stricter byte caps on i18nKey (MAX_GENERAL_STRING_BYTES) than the framing
    // registry's per-param cap (MAX_PARAM_STRING_BYTES). We re-validate the sanitized i18nKey's
    // byte length here — but the sanitized snapshot is the source of the bytes (frozen), so the
    // value cannot drift between the cap-check and the eventual use.
    if (!_isPlain(frame)) return null;
    if (!FIR || typeof FIR.validateFramingEntry !== 'function') return null;
    var vr = FIR.validateFramingEntry(frame);
    if (!vr || vr.valid !== true || !vr.sanitized) return null;
    var sanitized = vr.sanitized;
    var i18nKey = sanitized.i18nKey;
    if (!_nonEmptyStr(i18nKey)) return null;
    if (_utf8ByteLength(i18nKey) > MAX_GENERAL_STRING_BYTES) return null;
    var out = { reasonCode: sanitized.reasonCode, i18nKey: i18nKey };
    var sanitizedParams = sanitized.params;
    if (sanitizedParams !== undefined) {
      // sanitized.params is a frozen plain object with only number / boolean / null / string
      // values whose individual byte size has already been bounded by MAX_PARAM_STRING_BYTES
      // (framing-i18n-key-registry.js). Copy into a fresh plain object to avoid pinning the
      // frozen ancestor in the export envelope (which has its own deep-freeze at the envelope
      // boundary). No raw frame.params access here — sanitized is the only surface.
      var params = {};
      var pks = Object.keys(sanitizedParams);
      for (var i = 0; i < pks.length; i++) {
        var k = pks[i];
        if (typeof k !== 'string' || k.length === 0) return null;
        params[k] = sanitizedParams[k];
      }
      out.params = params;
    }
    return out;
  }
  function _allowlistFrameArray(arr, cap) {
    if (!Array.isArray(arr)) return [];
    if (arr.length > cap) return null; // bounded
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var f = _allowlistFrame(arr[i]);
      if (f === null) return null;
      out.push(f);
    }
    return out;
  }
  function _allowlistLimitations(arr) {
    if (!Array.isArray(arr)) return [];
    if (arr.length > MAX_LIMITATIONS) return null;
    var out = [];
    var seen = {};
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      if (!RC.isReasonCode(c)) return null;
      if (seen[c]) continue; // dedupe
      seen[c] = true;
      out.push(c);
    }
    return out;
  }

  function _blockedExport(reasonCodes, detail) {
    var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    var br = RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
    return Object.freeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: br.reasonCodes,
      explanationKeys: br.explanationKeys,
      detail: br.detail,
      envelope: null,
      serialized: null,
      result: null,
    });
  }

  // Authority shape gates (steps 1–3 of the directive). All caller-controlled property accesses go
  // through _safeGet so a Proxy with a throwing get trap (formal Codex C6 finding F-C6-A2 round 2)
  // fails closed without crashing the public builder.
  function _validateRequestShape(request) {
    if (!_isPlain(request)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'request not a plain object' };
    var token = _safeGet(request, 'generationToken');
    if (!_nonEmptyStr(token)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'missing generationToken' };
    if (_utf8ByteLength(token) > MAX_GENERAL_STRING_BYTES) return { ok: false, reasons: [CODES.EXPORT_PAYLOAD_STRING_TOO_LONG], detail: 'generationToken too long' };
    var result = _safeGet(request, 'result');
    if (!_isPlain(result)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result not a plain object' };
    // C6 authenticity gate (formal Codex C6 finding F-C6-A1 round 1 + round 2 + round 3 closure):
    // the result MUST have come from the C5 delta-metrics service's own production path AND every
    // node in the result graph must be authentic-and-frozen. Round 3 closure: the gate is now
    // FAIL-CLOSED even when the C5 service is unavailable (browser UMD environment where
    // R3_0C_DeltaMetrics is absent) — without the authenticity predicate we cannot verify
    // authority, so we MUST refuse the request rather than skip the check.
    if (!DeltaMetricsService || typeof DeltaMetricsService.isAuthenticResult !== 'function') {
      return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'C5 authenticity predicate unavailable — fail-closed' };
    }
    if (!DeltaMetricsService.isAuthenticResult(result)) {
/**
 * renderer/js/r3-0c-comparison-orchestrator.js — R3.0C C7 · Comparison Orchestrator service.
 *
 * Per SKYLINE Continuous Delivery Master Directive §七 C7: the orchestrator owns request-token
 * issuance + framing emission. It composes the C5 delta-metrics service, the C6 export service,
 * and the comparison-eligibility contract into a single synchronous run() call that the viewmodel
 * invokes per user-confirmed comparison request.
 *
 * The orchestrator is PURE — no DOM access, no Alpine binding, no global mutation beyond its own
 * monotonic token counter. It returns one of:
 *   - { status:'eligible', result:<C5 result>, framing:{...}, exportGate:bool, generationToken }
 *   - { status:'blocked', reasonCodes:[...], limitations:[...], framing:{...}, generationToken }
 *   - { status:'unavailable', reasonCodes:[...], framing:{...}, generationToken }
 *
 * Framing entries are validated against contracts/r3.0c/framing-i18n-key-registry.js BEFORE
 * emission; any orchestrator attempt to emit an unregistered i18nKey or free-form prose
 * fails-closed with INTERNAL_CONTRACT_VIOLATION.
 *
 * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
 * snapshot; when disabled, the orchestrator does NOT request entry/mid/exit_delta from the C5
 * service AND records PHASE_BOUNDARY_CONTRACT_UNAUTHORISED in limitations so the viewmodel /
 * UI can render the phase cards as unavailable.
 *
 * Authority discipline:
 *   - validateComparisonContextAgainstCase MUST pass (caseRecord ↔ context binding).
 *   - evaluateComparisonEligibility MUST pass (track/session/lap identity + position basis +
 *     credibility).
 *   - C5 service authenticity: the orchestrator passes the C5 result through verbatim;
 *     comparison-export-service runs its own authenticity check at export time.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  var DeltaMetricsService = null;
  var ComparisonExportService = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
    try { DeltaMetricsService = require('./r3-0c-delta-metrics.js'); } catch (e) { DeltaMetricsService = null; }
    try { ComparisonExportService = require('./r3-0c-comparison-export.js'); } catch (e) { ComparisonExportService = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-orchestrator.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var CE = Contracts.comparisonEligibility;
  var DMC = Contracts.deltaMetrics;
  var FIR = Contracts.framingI18nKeyRegistry;
  var VST = Contracts.viewmodelStateTransition;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C7_UI';
  var SIGN_FORMULA = 'comparison_minus_reference';

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  /**
   * createOrchestrator(deps) — factory. deps may supply alternative service implementations
   * (used by tests). Default to the production module-loaded services.
   *
   * deps = { deltaMetricsService?, exportService?, capabilities, authenticityPredicate }
   *   capabilities — a frozen snapshot of governance/r3.0c/capabilities.json relevant flags:
   *     { phaseBoundaryContractEnabled:bool, viewmodelStateTransitionContractEnabled:bool,
   *       framingSourceStructuredContractEnabled:bool }
   *   authenticityPredicate — REQUIRED. A function (caseRecord) → boolean that returns true ONLY
   *     for case records minted by an authoritative source (R3.0B case-store open boundary). The
   *     orchestrator NEVER exposes a way to add to this authority; the predicate is opaque to the
   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
   *     orchestrator's public API + had the viewmodel auto-register caller-controlled records on
   *     setAssociation — Codex C7-R2-A-01 broke that with a literal-built forged caseRecord
   *     escalating through setAssociation. Predicate injection makes the WeakSet (or whatever
   *     authority the integration uses) renderer-side and viewmodel-inaccessible.
   *
   * The capabilities snapshot is REQUIRED. The orchestrator refuses to run when
   * framingSourceStructuredContractEnabled is false (the C7 contract is gated by capability).
   *
   * Default authenticityPredicate (when not provided) is FAIL-CLOSED (returns false for every
   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
   * call with INTERNAL_CONTRACT_VIOLATION — exactly the property D1 needs to ship a test that
   * proves "forged record routed through setAssociation is refused without registration helpers".
   */
  function createOrchestrator(deps) {
    deps = _isPlain(deps) ? deps : {};
    var dm = deps.deltaMetricsService || DeltaMetricsService;
    var ex = deps.exportService || ComparisonExportService;
    var caps = _isPlain(deps.capabilities) ? deps.capabilities : null;
    if (!caps) throw new Error('createOrchestrator requires capabilities snapshot');
    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.

    // Codex C7-R2-A-01 closure: predicate-based authenticity check. The predicate is invoked once
    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
    var _externalAuthPredicate = typeof deps.authenticityPredicate === 'function' ? deps.authenticityPredicate : null;
    function _isAuthenticCaseRecord(caseRecord) {
      if (!_externalAuthPredicate) return false;
      if (!_isPlain(caseRecord)) return false;
      try { return _externalAuthPredicate(caseRecord) === true; } catch (e) { return false; }
    }

    var _generationCounter = 0;
    function _nextToken() { _generationCounter = _generationCounter + 1; return _generationCounter; }
    function currentToken() { return _generationCounter; }

    function _blockedResponse(reasonCodes, detail, framing, token) {
      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
      if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
      return Object.freeze({
        status: 'blocked',
        reasonCodes: Object.freeze(arr.slice()),
        limitations: Object.freeze([]),
        framing: _validateFramingOrFallback(framing),
        exportGate: false,
        detail: detail != null ? String(detail).slice(0, 200) : null,
        generationToken: token,
      });
    }
    function _unavailableResponse(reasonCodes, framing, token) {
      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
      if (arr.length === 0) arr = [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE];
      return Object.freeze({
        status: 'unavailable',
        reasonCodes: Object.freeze(arr.slice()),
        limitations: Object.freeze([]),
        framing: _validateFramingOrFallback(framing),
        exportGate: false,
        generationToken: token,
      });
    }

    function _validateFramingOrFallback(framing) {
      // Codex C7-R3-C-01 closure: NEVER re-read `framing[k]` / `v.reasonCode` / `v.i18nKey` /
      // `v.params` after validation. A Proxy can return a different value on each access; the
      // validator's `sanitized` snapshot (frozen, built from descriptor-read values only) is the
      // ONLY safe surface to consume downstream. Same TOCTOU applies to cannotDistinguish entries.
      var fallback = FIR.cannotDistinguishFallback();
      var out = {
        observedDelta: fallback,
        likelyDriverBehaviourDifference: fallback,
        possibleVehicleResponseDifference: fallback,
        cannotDistinguish: [],
        nextValidationAction: null,
      };
      if (!_isPlain(framing)) return Object.freeze(out);
      ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
        var v = framing[k];
        if (v === null || v === undefined) return; // keep fallback
        var vr = FIR.validateFramingEntry(v);
        if (vr.valid && vr.sanitized) out[k] = vr.sanitized;
        // else: leave fallback in place (defense in depth — orchestrator emit should have caught)
      });
      if (Array.isArray(framing.cannotDistinguish)) {
        var cd = [];
        for (var i = 0; i < framing.cannotDistinguish.length && i < 64; i++) {
          var e = framing.cannotDistinguish[i];
          var er = FIR.validateFramingEntry(e);
          if (er.valid && er.sanitized) cd.push(er.sanitized);
        }
        out.cannotDistinguish = Object.freeze(cd);
      } else {
        out.cannotDistinguish = Object.freeze([]);
      }
      return Object.freeze(out);
    }

    /**
     * requestComparison(input) — synchronous orchestrator entry point.
     *
     * input = {
     *   caseRecord, association,                       // F4/F5 binding inputs
     *   referenceLap, comparisonLap,                   // lap identities
     *   credibilityMetadata,                           // credibility ladder + provenance
     *   eligibilityInput,                              // shape for evaluateComparisonEligibility
     *   deltaMetricsRequest,                           // C5 service input (sans phase trio)
     *   framing                                        // OPTIONAL — orchestrator-built framing
     * }
     *
     * Returns one of the response shapes documented at module top.
     */
    function requestComparison(input) {
      var token = _nextToken();
      if (!caps.framingSourceStructuredContractEnabled || !caps.viewmodelStateTransitionContractEnabled) {
        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'framing or viewmodel-state-transition capability disabled', null, token);
      }
      if (!_isPlain(input)) return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'input not a plain object', null, token);

      // 1. case authenticity (Codex C7-R2-A-01 closure): the caseRecord MUST be vouched for by
      //    the injected authenticityPredicate. A literal-built caseRecord (even one whose
      //    associations consistently match the caller-supplied association + eligibility
      //    identities) fails closed here. The predicate is opaque to the viewmodel — there is no
      //    public API to add anything to it.
      if (!_isAuthenticCaseRecord(input.caseRecord)) {
        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not vouched for by authenticityPredicate — caller-controlled case authority refused', null, token);
      }

      // 2. case ↔ context binding (F4)
      var bindCheck = CE.validateComparisonContextAgainstCase(input.caseRecord, input.association);
      if (bindCheck && bindCheck.valid !== true) {
        return _blockedResponse(bindCheck.reasonCodes ? bindCheck.reasonCodes.slice() : [CODES.TRACK_IDENTITY_MISMATCH], 'case/context binding failed', null, token);
      }

      // 2. composite eligibility (F5 identity + lap + credibility)
      var elig = CE.evaluateComparisonEligibility(input.eligibilityInput);
      if (elig.eligible !== true) {
        return _blockedResponse(elig.reasonCodes ? elig.reasonCodes.slice() : [CODES.REFERENCE_LAP_UNAVAILABLE], 'eligibility failed', null, token);
      }

      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
      var dmReq = _isPlain(input.deltaMetricsRequest) ? Object.assign({}, input.deltaMetricsRequest) : null;
      if (!dmReq) return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'deltaMetricsRequest missing', null, token);
      var requested = Array.isArray(dmReq.requestedMetrics) ? dmReq.requestedMetrics.slice() : [];
      var phaseMetricRequested = false;
      if (!caps.phaseBoundaryContractEnabled) {
        var phaseSet = DMC.PHASE_SCOPE_METRICS;
        var filtered = requested.filter(function (m) {
          if (phaseSet.indexOf(m) !== -1) { phaseMetricRequested = true; return false; }
          return true;
        });
        dmReq.requestedMetrics = filtered;
        if (dmReq.policy && _isPlain(dmReq.policy)) {
          var pol = Object.assign({}, dmReq.policy);
          delete pol.phaseBoundaryAuthorisation;
          dmReq.policy = pol;
        }
      } else {
        dmReq.requestedMetrics = requested;
      }
      if (!dmReq.requestedMetrics.length) {
        return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'no requested metrics after phase gate', null, token);
      }

      var dmResult = dm.computeDeltaMetrics(dmReq);
      if (dmResult.eligible !== true) {
        return _blockedResponse(dmResult.reasonCodes ? dmResult.reasonCodes.slice() : [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE], 'delta-metrics blocked', null, token);
      }

      // 4. exportGate predicate: an eligible result + non-stale identity + association match
      //    is the precondition for the UI's export button. The viewmodel re-checks at click.
      var exportGate = !!(dmResult && dmResult.eligible && _isPlain(dmResult.identity) && dmResult.identity.caseId === input.association.caseId && dmResult.identity.sessionId === input.association.sessionId);

      // 5. orchestrator-emitted framing. We DERIVE these from the result (NOT free-form prose):
      var framing = _buildFraming(dmResult, phaseMetricRequested, input.framing);

      return Object.freeze({
        status: 'eligible',
        result: dmResult,
        framing: framing,
        exportGate: exportGate,
        generationToken: token,
        limitations: Object.freeze(phaseMetricRequested ? [CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED] : []),
      });
    }

    function _buildFraming(dmResult, phaseMetricRequested, callerFraming) {
      // The orchestrator deterministically maps the C5 result + flags into framing entries from
      // FRAMING_I18N_KEY_REGISTRY. Caller may NOT supply free-form prose — when callerFraming is
      // present we use _validateFramingOrFallback which rejects unregistered i18nKeys.
      var observed = null;
      var lapTimeMetric = dmResult.metrics && dmResult.metrics.lap_time;
      if (lapTimeMetric && _isFiniteNum(lapTimeMetric.value)) {
        if (lapTimeMetric.value < 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: lapTimeMetric.value } };
        else if (lapTimeMetric.value > 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.slower_overall', params: { ms: lapTimeMetric.value } };
        else observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.identical_lap' };
      }
      var cannotDistinguish = [];
      if (phaseMetricRequested) cannotDistinguish.push({ reasonCode: CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED, i18nKey: 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised' });
      var built = {
        observedDelta: observed,
        likelyDriverBehaviourDifference: null,
        possibleVehicleResponseDifference: null,
        cannotDistinguish: cannotDistinguish,
        nextValidationAction: null,
      };
      if (_isPlain(callerFraming)) {
        // Codex C7-R3-C-01 closure: assign vr.sanitized, NOT the raw `v`. The TOCTOU bypass via
        // Proxy.getOwnPropertyDescriptor lying about descriptors would otherwise let an accepted
        // entry yield different values on later access.
        ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
          var v = callerFraming[k];
          if (!v) return;
          var vr = FIR.validateFramingEntry(v);
          if (vr.valid && vr.sanitized) built[k] = vr.sanitized;
        });
        if (Array.isArray(callerFraming.cannotDistinguish)) {
          callerFraming.cannotDistinguish.forEach(function (e) {
            if (!e) return;
            var er = FIR.validateFramingEntry(e);
            if (er.valid && er.sanitized && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(er.sanitized);
          });
        }
      }
      return _validateFramingOrFallback(built);
    }

    /**
     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
     * The orchestrator does NOT bypass C6's own authenticity / closed-allowlist checks.
     */
    function exportComparison(eligibleResponse, extraInputs) {
      if (!ex || typeof ex.buildComparisonExport !== 'function') {
        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export service unavailable' };
      }
      if (!_isPlain(eligibleResponse) || eligibleResponse.status !== 'eligible' || eligibleResponse.exportGate !== true) {
        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export gate closed' };
      }
      if (!_isPlain(extraInputs)) extraInputs = {};
      return ex.buildComparisonExport({
        result: eligibleResponse.result,
        association: extraInputs.association,
        credibilityMetadata: extraInputs.credibilityMetadata,
        generationToken: 'orch-' + eligibleResponse.generationToken,
        referenceLap: extraInputs.referenceLap,
        comparisonLap: extraInputs.comparisonLap,
        framing: {
          cannotConclude: eligibleResponse.framing && eligibleResponse.framing.cannotDistinguish || [],
          alternativeExplanations: [],
          nextValidationAction: eligibleResponse.framing && eligibleResponse.framing.nextValidationAction || null,
        },
      });
    }

    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
    // exposed on the orchestrator's public API. Authenticity is supplied at construction via the
    // injected predicate. Tests provide their own predicate; production callers (R3.0B case-store
    // integration) inject a predicate backed by their own WeakSet / token / store-lineage check.
    return Object.freeze({
      SERVICE_VERSION: SERVICE_VERSION,
      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
      SIGN_FORMULA: SIGN_FORMULA,
      currentToken: currentToken,
      requestComparison: requestComparison,
      exportComparison: exportComparison,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    SIGN_FORMULA: SIGN_FORMULA,
    createOrchestrator: createOrchestrator,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonOrchestrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
/**
 * contracts/r3.0c/framing-i18n-key-registry.js — R3.0C C7 · Framing-source contract registry.
 *
 * Per SKYLINE Continuous Delivery Master Directive §七 C7 + docs/r3.0c-framing-source-contract.md:
 * every framing entry the C7 orchestrator emits MUST be a plain object
 * { reasonCode, i18nKey, params? } where reasonCode ∈ contracts/r3.0c/reason-codes.js
 * REASON_CODES AND i18nKey ∈ the frozen registry exported here. The renderer maps i18nKey to a
 * fixed wording table in renderer/js/i18n-comparisons.js — the orchestrator never authors UI
 * prose; the viewmodel never re-words; the UI calls only t(entry.i18nKey).
 *
 * The registry is a CLOSED ALLOWLIST. Anything outside fails closed at orchestrator emit time
 * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
 *
 * Capability gate: governance/r3.0c/capabilities.json framing_source_structured_contract.enabled
 * must be true for any orchestrator code path that emits framing entries. Until then this module
 * is loaded (so tests can pin the registry) but no production caller invokes the emitter.
 *
 * UMD: Node require / Electron renderer global (R3_0C_FramingI18nKeyRegistry).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
  if (!RC || !CE) throw new Error('framing-i18n-key-registry.js requires reason-codes.js + comparison-eligibility-contract.js');
  var CODES = RC.REASON_CODES;

  // The closed allowlist of framing i18nKeys. Every entry the orchestrator emits MUST use one of
  // these keys. The keys are stable string constants — renderer maps them to en/zh/ja wording.
  // Keys are organised by framing field (observed_delta / likely_driver_behaviour_difference /
  // possible_vehicle_response_difference / cannot_distinguish_reasons). A new framing entry
  // requires adding both the key here AND the en/zh/ja wording in renderer/js/i18n-comparisons.js
  // (the i18n-parity test fails closed on either gap).
  var FRAMING_I18N_KEY_REGISTRY = Object.freeze([
    // observed_delta (the comparison produced a finite cumulative or per-corner delta)
    'r3_0c.framing.observed_delta.cumulative',
    'r3_0c.framing.observed_delta.per_corner',
    'r3_0c.framing.observed_delta.faster_overall',
    'r3_0c.framing.observed_delta.slower_overall',
    'r3_0c.framing.observed_delta.identical_lap',

    // likely_driver_behaviour_difference (positionally aligned with confirmed driver input channel)
    'r3_0c.framing.likely_driver_behaviour_difference.brake_onset',
    'r3_0c.framing.likely_driver_behaviour_difference.throttle_application',
    'r3_0c.framing.likely_driver_behaviour_difference.steering_correction',
    'r3_0c.framing.likely_driver_behaviour_difference.none_detected',

    // possible_vehicle_response_difference (positionally aligned with vehicle-response channel,
    // NOT explainable by aligned driver input)
    'r3_0c.framing.possible_vehicle_response_difference.lat_accel',
    'r3_0c.framing.possible_vehicle_response_difference.yaw_rate',
    'r3_0c.framing.possible_vehicle_response_difference.exit_speed',
    'r3_0c.framing.possible_vehicle_response_difference.none_detected',

    // cannot_distinguish_reasons (always emitted even when empty — array of entries)
    'r3_0c.framing.cannot_distinguish',
    'r3_0c.framing.cannot_distinguish.insufficient_channel_coverage',
    'r3_0c.framing.cannot_distinguish.confounded_by_driver_input',
    'r3_0c.framing.cannot_distinguish.confounded_by_calibration_drift',
    'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised',

    // nextValidationAction (single entry per result; viewmodel renders as a single CTA)
    'r3_0c.framing.next_validation.confirm_channel_mapping',
    'r3_0c.framing.next_validation.confirm_track_identity',
    'r3_0c.framing.next_validation.select_different_reference',
    'r3_0c.framing.next_validation.repeat_lap_under_controlled_conditions',
  ]);

  // Bound a structurally valid framing-entry per FRAMING_KEY_SHAPE (already exposed on the
  // comparison-eligibility contract) AND the i18nKey appears in the registry above.
  // Adversarial: per-string UTF-8 byte cap of 256 on every param value (mirrors the F12 contract).
  var MAX_PARAM_STRING_BYTES = 256;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _safeOwnKeys(o) { try { return Reflect && typeof Reflect.ownKeys === 'function' ? Reflect.ownKeys(o) : Object.keys(o); } catch (e) { return null; } }

  // Codex C7-R2-C-01 closure: tri-state own-property read. Distinguishes ABSENT (no own key) from
  // VALUE (own data descriptor) from THREW (Proxy/accessor/descriptor lookup throws OR descriptor
  // is an accessor descriptor — accessors violate the plain-object framing contract regardless of
  // whether they happen to throw on this particular read). Callers MUST treat THREW as
  // fail-closed; the previous _safeGet swallowed throws into `undefined` which was laundered as
  // "optional field absent" further down.
  var READ_ABSENT = Object.freeze({ state: 'ABSENT' });
  var READ_THREW = Object.freeze({ state: 'THREW' });
  function _readOwn(o, k) {
    var desc;
    try { desc = Object.getOwnPropertyDescriptor(o, k); }
    catch (e) { return READ_THREW; }
    if (!desc) return READ_ABSENT;
    // accessor descriptor (get/set) — reject. Even a getter that returns a benign value can have
    // side effects, can throw on any future read, can return different values on each call. The
    // framing contract requires plain data; accessors are out of band.
    if (typeof desc.get === 'function' || typeof desc.set === 'function') return READ_THREW;
    // data descriptor — value already resolved, no observable side-effect read needed.
    return { state: 'VALUE', value: desc.value };
  }
  function _utf8ByteLength(s) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }

  /**
   * isRegisteredFramingI18nKey(key) — closed allowlist check. Anything outside fails.
   */
  function isRegisteredFramingI18nKey(key) {
    return typeof key === 'string' && FRAMING_I18N_KEY_REGISTRY.indexOf(key) !== -1;
  }

  /**
   * validateFramingEntry(entry) — structural + registry gate.
   *   • entry must be a plain object owning ONLY {reasonCode, i18nKey, params?} keys
   *   • reasonCode ∈ REASON_CODES
   *   • i18nKey ∈ FRAMING_I18N_KEY_REGISTRY
   *   • params, when present, plain object whose values are finite numbers / booleans / null /
   *     strings ≤ MAX_PARAM_STRING_BYTES. No arrays / exotic objects / functions / symbols.
   *
   * Returns { valid:true } or { valid:false, reasonCode, detail }.
   */
  function validateFramingEntry(entry) {
    try {
      if (!_isPlain(entry)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry not a plain object' };
      // Codex C7 finding C7-F1 closure: use Reflect.ownKeys so non-enumerable + Symbol-keyed extras
      // are detected. Object.keys missed both.
      var keys = _safeOwnKeys(entry);
      if (keys === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry own-key enumeration threw (Proxy)' };
      var ALLOWED = { reasonCode: true, i18nKey: true, params: true };
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (typeof key !== 'string') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has non-string (e.g. Symbol) own-key' };
        if (!ALLOWED[key]) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has unknown key: ' + String(key).slice(0, 60) };
      }
      // Codex C7-R2-C-01 closure: tri-state read on every own property. THREW = accessor descriptor
      // OR descriptor lookup throws — both fail-closed. The previous _safeGet swallowed throws and
      // returned undefined, which the params branch below treated as "optional field absent" — an
      // input with `Object.defineProperty(entry, 'params', { get(){throw} })` slipped through.
      var rcRead = _readOwn(entry, 'reasonCode');
      if (rcRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: rcRead.state === 'THREW' ? 'framing reasonCode is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing reasonCode missing' };
      if (!RC.isReasonCode(rcRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing reasonCode unregistered' };
      var keyRead = _readOwn(entry, 'i18nKey');
      if (keyRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: keyRead.state === 'THREW' ? 'framing i18nKey is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing i18nKey missing' };
      if (!isRegisteredFramingI18nKey(keyRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing i18nKey not in registry' };
      var paramsRead = _readOwn(entry, 'params');
      if (paramsRead.state === 'THREW') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params is accessor descriptor or descriptor lookup threw — fail-closed' };
      // Codex C7-R3-C-01 closure: build a sanitized canonical snapshot from the validated
      // descriptor values, not the original entry. A Proxy can lie via getOwnPropertyDescriptor
      // (returning a benign data descriptor while the real get-trap throws or mutates); after
      // validation accepted that lie, any downstream re-read via plain `v.foo` would see the
      // accessor side again. The orchestrator MUST consume the sanitized snapshot — never the
      // raw entry — for the validation result to be honoured. The snapshot is frozen so callers
      // cannot mutate it back into an unsafe shape post-validation.
      var sanitizedParams;
      if (paramsRead.state === 'VALUE' && paramsRead.value !== undefined) {
        var paramsRaw = paramsRead.value;
        if (!_isPlain(paramsRaw)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params not a plain object' };
        var pks = _safeOwnKeys(paramsRaw);
        if (pks === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params own-key enumeration threw (Proxy)' };
        sanitizedParams = {};
        for (var j = 0; j < pks.length; j++) {
          var k = pks[j];
          if (typeof k !== 'string' || k.length === 0) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has empty / non-string (e.g. Symbol) key' };
          // Inner-level tri-state read so a param-value accessor / Proxy is also rejected, not
          // laundered via plain o[k] access.
          var inner = _readOwn(paramsRaw, k);
          if (inner.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: inner.state === 'THREW' ? 'framing params value is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing params value missing for own key' };
          var v = inner.value;
          if (v === null || typeof v === 'boolean') { sanitizedParams[k] = v; continue; }
          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; sanitizedParams[k] = v; continue; }
          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; sanitizedParams[k] = v; continue; }
          return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has unsupported value type' };
        }
        sanitizedParams = Object.freeze(sanitizedParams);
      }
      var sanitized = sanitizedParams !== undefined
        ? Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value, params: sanitizedParams })
        : Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value });
      return { valid: true, sanitized: sanitized };
    } catch (e) {
      // Codex C7 finding C7-B1 closure: any throw from a Proxy / accessor / inherited trap
      // results in fail-closed at this top-level boundary.
      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing validation threw — fail-closed' };
    }
  }

  /**
   * cannotDistinguishFallback() — the canonical fallback framing entry the orchestrator emits
   * when a field cannot be populated. Matches docs/r3.0c-framing-source-contract.md rule
   * (params OMITTED — not null — to satisfy FRAMING_KEY_SHAPE optional-key discipline).
   */
  function cannotDistinguishFallback() {
    return Object.freeze({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
  }

  var api = {
    FRAMING_I18N_KEY_REGISTRY: FRAMING_I18N_KEY_REGISTRY,
    MAX_PARAM_STRING_BYTES: MAX_PARAM_STRING_BYTES,
    isRegisteredFramingI18nKey: isRegisteredFramingI18nKey,
    validateFramingEntry: validateFramingEntry,
    cannotDistinguishFallback: cannotDistinguishFallback,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_FramingI18nKeyRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
contracts/r3.0c/normalized-position-contract.js:109:      var merged = [].concat(rv.eligible ? [] : rv.reasonCodes, cv.eligible ? [] : cv.reasonCodes);
contracts/r3.0c/framing-i18n-key-registry.js:9: * prose; the viewmodel never re-words; the UI calls only t(entry.i18nKey).
renderer/js/r3-0c-normalized-distance.js:158:      return _blocked(shape.reasonCodes.slice(), shape.detail);
renderer/js/r3-0c-reference-selection.js:80:    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);
contracts/r3.0c/credibility-contract.js:66:    if (!v.valid) return RC.buildBlockedResult(v.reasonCodes);
renderer/js/r3-0c-comparison-viewmodel.js:111:        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [];
renderer/js/r3-0c-comparison-viewmodel.js:116:        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [CODES.INTERNAL_CONTRACT_VIOLATION];
renderer/js/r3-0c-comparison-orchestrator.js:139:      // Codex C7-R3-C-01 closure: NEVER re-read `framing[k]` / `v.reasonCode` / `v.i18nKey` /
renderer/js/r3-0c-comparison-orchestrator.js:140:      // `v.params` after validation. A Proxy can return a different value on each access; the
renderer/js/r3-0c-corner-pairing.js:88:    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);
renderer/js/r3-0c-delta-metrics.js:110:    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);
renderer/js/r3-0c-comparison-export.js:161:    // _allowlistFrame implementation re-read frame.reasonCode / frame.i18nKey / frame.params via
renderer/js/r3-0c-comparison-export.js:187:      // boundary). No raw frame.params access here — sanitized is the only surface.
renderer/js/r3-0c-comparison-export.js:535:      return _blockedExport(envelope.reasonCodes.slice(), envelope.detail);
renderer/js/r3-0c-corner-segmentation.js:130:    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);

exec
/bin/bash -lc "sed -n '115,215p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '280,390p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '430,590p' renderer/js/r3-0c-comparison-export.js && rg -n 'Z[1-4]|B2[5-7]|G3|UI_INITIALIZATION_FAILED|script src' tests/r3-0c-comparison-export.test.js tests/r3-0c-comparison-workspace.test.js renderer/index.html && git diff --name-only 9044a7f3..a1a6988e | rg '(physics|dynamics|preset|case-record-schema|portable|r3\\.0b)' || true" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
      return Object.freeze({
        status: 'blocked',
        reasonCodes: Object.freeze(arr.slice()),
        limitations: Object.freeze([]),
        framing: _validateFramingOrFallback(framing),
        exportGate: false,
        detail: detail != null ? String(detail).slice(0, 200) : null,
        generationToken: token,
      });
    }
    function _unavailableResponse(reasonCodes, framing, token) {
      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
      if (arr.length === 0) arr = [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE];
      return Object.freeze({
        status: 'unavailable',
        reasonCodes: Object.freeze(arr.slice()),
        limitations: Object.freeze([]),
        framing: _validateFramingOrFallback(framing),
        exportGate: false,
        generationToken: token,
      });
    }

    function _validateFramingOrFallback(framing) {
      // Codex C7-R3-C-01 closure: NEVER re-read `framing[k]` / `v.reasonCode` / `v.i18nKey` /
      // `v.params` after validation. A Proxy can return a different value on each access; the
      // validator's `sanitized` snapshot (frozen, built from descriptor-read values only) is the
      // ONLY safe surface to consume downstream. Same TOCTOU applies to cannotDistinguish entries.
      var fallback = FIR.cannotDistinguishFallback();
      var out = {
        observedDelta: fallback,
        likelyDriverBehaviourDifference: fallback,
        possibleVehicleResponseDifference: fallback,
        cannotDistinguish: [],
        nextValidationAction: null,
      };
      if (!_isPlain(framing)) return Object.freeze(out);
      ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
        var v = framing[k];
        if (v === null || v === undefined) return; // keep fallback
        var vr = FIR.validateFramingEntry(v);
        if (vr.valid && vr.sanitized) out[k] = vr.sanitized;
        // else: leave fallback in place (defense in depth — orchestrator emit should have caught)
      });
      if (Array.isArray(framing.cannotDistinguish)) {
        var cd = [];
        for (var i = 0; i < framing.cannotDistinguish.length && i < 64; i++) {
          var e = framing.cannotDistinguish[i];
          var er = FIR.validateFramingEntry(e);
          if (er.valid && er.sanitized) cd.push(er.sanitized);
        }
        out.cannotDistinguish = Object.freeze(cd);
      } else {
        out.cannotDistinguish = Object.freeze([]);
      }
      return Object.freeze(out);
    }

    /**
     * requestComparison(input) — synchronous orchestrator entry point.
     *
     * input = {
     *   caseRecord, association,                       // F4/F5 binding inputs
     *   referenceLap, comparisonLap,                   // lap identities
     *   credibilityMetadata,                           // credibility ladder + provenance
     *   eligibilityInput,                              // shape for evaluateComparisonEligibility
     *   deltaMetricsRequest,                           // C5 service input (sans phase trio)
     *   framing                                        // OPTIONAL — orchestrator-built framing
     * }
     *
     * Returns one of the response shapes documented at module top.
     */
    function requestComparison(input) {
      var token = _nextToken();
      if (!caps.framingSourceStructuredContractEnabled || !caps.viewmodelStateTransitionContractEnabled) {
        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'framing or viewmodel-state-transition capability disabled', null, token);
      }
      if (!_isPlain(input)) return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'input not a plain object', null, token);

      // 1. case authenticity (Codex C7-R2-A-01 closure): the caseRecord MUST be vouched for by
      //    the injected authenticityPredicate. A literal-built caseRecord (even one whose
      //    associations consistently match the caller-supplied association + eligibility
      //    identities) fails closed here. The predicate is opaque to the viewmodel — there is no
      //    public API to add anything to it.
      if (!_isAuthenticCaseRecord(input.caseRecord)) {
        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not vouched for by authenticityPredicate — caller-controlled case authority refused', null, token);
      }

      // 2. case ↔ context binding (F4)
      var bindCheck = CE.validateComparisonContextAgainstCase(input.caseRecord, input.association);
      if (bindCheck && bindCheck.valid !== true) {
        return _blockedResponse(bindCheck.reasonCodes ? bindCheck.reasonCodes.slice() : [CODES.TRACK_IDENTITY_MISMATCH], 'case/context binding failed', null, token);
      }

      // 2. composite eligibility (F5 identity + lap + credibility)
      var elig = CE.evaluateComparisonEligibility(input.eligibilityInput);
      if (elig.eligible !== true) {
        return _blockedResponse(elig.reasonCodes ? elig.reasonCodes.slice() : [CODES.REFERENCE_LAP_UNAVAILABLE], 'eligibility failed', null, token);
      }

      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
      };
      if (_isPlain(callerFraming)) {
        // Codex C7-R3-C-01 closure: assign vr.sanitized, NOT the raw `v`. The TOCTOU bypass via
        // Proxy.getOwnPropertyDescriptor lying about descriptors would otherwise let an accepted
        // entry yield different values on later access.
        ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
          var v = callerFraming[k];
          if (!v) return;
          var vr = FIR.validateFramingEntry(v);
          if (vr.valid && vr.sanitized) built[k] = vr.sanitized;
        });
        if (Array.isArray(callerFraming.cannotDistinguish)) {
          callerFraming.cannotDistinguish.forEach(function (e) {
            if (!e) return;
            var er = FIR.validateFramingEntry(e);
            if (er.valid && er.sanitized && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(er.sanitized);
          });
        }
      }
      return _validateFramingOrFallback(built);
    }

    /**
     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
     * The orchestrator does NOT bypass C6's own authenticity / closed-allowlist checks.
     */
    function exportComparison(eligibleResponse, extraInputs) {
      if (!ex || typeof ex.buildComparisonExport !== 'function') {
        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export service unavailable' };
      }
      if (!_isPlain(eligibleResponse) || eligibleResponse.status !== 'eligible' || eligibleResponse.exportGate !== true) {
        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export gate closed' };
      }
      if (!_isPlain(extraInputs)) extraInputs = {};
      return ex.buildComparisonExport({
        result: eligibleResponse.result,
        association: extraInputs.association,
        credibilityMetadata: extraInputs.credibilityMetadata,
        generationToken: 'orch-' + eligibleResponse.generationToken,
        referenceLap: extraInputs.referenceLap,
        comparisonLap: extraInputs.comparisonLap,
        framing: {
          cannotConclude: eligibleResponse.framing && eligibleResponse.framing.cannotDistinguish || [],
          alternativeExplanations: [],
          nextValidationAction: eligibleResponse.framing && eligibleResponse.framing.nextValidationAction || null,
        },
      });
    }

    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
    // exposed on the orchestrator's public API. Authenticity is supplied at construction via the
    // injected predicate. Tests provide their own predicate; production callers (R3.0B case-store
    // integration) inject a predicate backed by their own WeakSet / token / store-lineage check.
    return Object.freeze({
      SERVICE_VERSION: SERVICE_VERSION,
      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
      SIGN_FORMULA: SIGN_FORMULA,
      currentToken: currentToken,
      requestComparison: requestComparison,
      exportComparison: exportComparison,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    SIGN_FORMULA: SIGN_FORMULA,
    createOrchestrator: createOrchestrator,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonOrchestrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
      comparisonStatus: anyPartial ? 'partial' : 'success',
      referenceLap: ref,
      comparisonLap: cmp,
      association: assoc,
      cumulativeDelta: cumDelta,
      corners: corners,
      metricAvailability: availability,
      credibility: request.credibilityMetadata.credibility,
      confidence: request.credibilityMetadata.confidence,
      provenance: request.credibilityMetadata.provenance,
      limitations: limitations,
      blockers: blockers,
      cannotConclude: cannotConclude,
      alternativeExplanations: alternativeExplanations,
      nextValidationAction: nextValidationAction,
    };
    // Deterministic key order: rebuild in ELIGIBLE_PAYLOAD_KEYS order so JSON.stringify is stable.
    var ordered = {};
    for (var k = 0; k < ELIGIBLE_PAYLOAD_KEYS.length; k++) {
      var key = ELIGIBLE_PAYLOAD_KEYS[k];
      ordered[key] = payload[key];
    }
    return { ok: true, payload: ordered };
  }

  function _buildBlockedPayload(request) {
    var result = request.result;
    var assoc = request.association;
    var reasonCodes = Array.isArray(result.reasonCodes) ? result.reasonCodes.filter(function (c) { return RC.isReasonCode(c); }) : [];
    if (reasonCodes.length === 0) reasonCodes = [CODES.INTERNAL_CONTRACT_VIOLATION];
    var limitations = _allowlistLimitations(request.credibilityMetadata ? request.credibilityMetadata.limitations : []);
    if (limitations === null) limitations = [];
    var nextValidationAction = null;
    if (request.framing && request.framing.nextValidationAction) {
      nextValidationAction = _allowlistFrame(request.framing.nextValidationAction);
    }
    var payload = {
      comparisonStatus: 'blocked',
      status: 'blocked',
      reasonCodes: reasonCodes,
      limitations: limitations,
      identity: { caseId: assoc.caseId, sessionId: assoc.sessionId },
      nextValidationAction: nextValidationAction,
    };
    var ordered = {};
    for (var k = 0; k < BLOCKED_PAYLOAD_KEYS.length; k++) {
      ordered[BLOCKED_PAYLOAD_KEYS[k]] = payload[BLOCKED_PAYLOAD_KEYS[k]];
    }
    return { ok: true, payload: ordered };
  }

  /**
   * buildComparisonExport(request) — produces a closed-schema portable comparison envelope.
   *
   * request shape (caller MUST supply ALL five fields):
   *   {
   *     result: <C5 delta-metrics service result — eligible or blocked>,
   *     association: { caseId, sessionId, trackId, layoutId, positionBasis, positionDirection },
   *     credibilityMetadata: { credibility, provenance, confidence, limitations[], blockedReasons[] },
   *     generationToken: '<non-empty opaque token>',
   *     framing?: { cannotConclude?:[], alternativeExplanations?:[], nextValidationAction? }
   *   }
   *
   * Returns either:
   *   - frozen envelope { schemaIdentity, schemaVersion, generatedAt:null, payload },
   *     with a `.serialized` plain-string mirror produced by JSON.stringify + JSON.parse round trip;
   *   - or _blockedExport([reasonCodes]) — never a partial envelope.
   */
  function buildComparisonExport(request) {
    try { return _buildComparisonExportInner(request); }
    catch (e) {
      // Catch-all fail-closed boundary (formal Codex C6 finding F-C6-A2 round 2): any unhandled
      // throw from caller-controlled traversal (e.g. a Proxy with a throwing get trap on a top-
      // level field that the inner reads bypass) returns a blocked export rather than crashing.
      return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'unhandled throw in buildComparisonExport: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown'));
    }
  }
  function _buildComparisonExportInner(request) {
    // 1. shape gate
    var shape = _validateRequestShape(request);
    if (!shape.ok) return _blockedExport(shape.reasons, shape.detail);
    // 2. association gate
    var assoc = _validateAssociation(request.association);
    if (!assoc.ok) return _blockedExport(assoc.reasons, assoc.detail);
    // 3. credibility gate
    var cred = CR.validateCredibilityMetadata(request.credibilityMetadata);
    if (!cred.valid) return _blockedExport(cred.reasonCodes.slice(), 'credibilityMetadata invalid');

    // 4. eligible vs blocked branch
    var payloadBuilt;
    if (request.result.eligible === true) {
      // 4a. association ↔ result identity match (stale-result guard)
      var idCheck = _validateAssociationVsResultIdentity(request.result, request.association);
      if (!idCheck.ok) return _blockedExport(idCheck.reasons, idCheck.detail);
      var framing = _isPlain(request.framing) ? request.framing : {};
      payloadBuilt = _buildEligiblePayload(request, framing);
    } else {
      payloadBuilt = _buildBlockedPayload(request);
    }
    if (!payloadBuilt.ok) return _blockedExport(payloadBuilt.reasons, payloadBuilt.detail);

    // 5. build envelope via the contract
    var envelope = EX.buildComparisonExportEnvelope(payloadBuilt.payload);
    if (envelope.eligible === false) {
      // envelope construction failed (oversize / non-finite / etc.) — propagate the reason verbatim.
      return _blockedExport(envelope.reasonCodes.slice(), envelope.detail);
    }
    // 6. validate the constructed envelope (first pass — pre-serialize).
    var preCheck = EX.validateComparisonExportEnvelope(envelope);
    if (preCheck.eligible === false) return _blockedExport(preCheck.reasonCodes.slice(), preCheck.detail || 'envelope failed pre-serialize validation');

    // 7. serialize → 8. parse → 9. revalidate (round-trip determinism).
    var serialized;
    try { serialized = JSON.stringify(envelope); }
    catch (e) { return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.stringify threw: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown')); }
    if (typeof serialized !== 'string') return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.stringify produced non-string');
    var parsed;
    try { parsed = JSON.parse(serialized); }
    catch (e) { return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.parse threw: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown')); }
    var postCheck = EX.validateComparisonExportEnvelope(parsed);
    if (postCheck.eligible === false) return _blockedExport(postCheck.reasonCodes.slice(), postCheck.detail || 'envelope failed post-serialize validation');

    // 10. return the constructed envelope + its serialized + parsed mirrors. The parsed mirror is
    //     what a downstream consumer would actually receive after a true file round-trip.
    return Object.freeze({
      eligible: true,
      status: 'comparison_export_built',
      envelope: envelope,
      serialized: serialized,
      parsed: Object.freeze(parsed),
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    SIGN_FORMULA: SIGN_FORMULA,
    ELIGIBLE_PAYLOAD_KEYS: ELIGIBLE_PAYLOAD_KEYS,
    BLOCKED_PAYLOAD_KEYS: BLOCKED_PAYLOAD_KEYS,
    buildComparisonExport: buildComparisonExport,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
tests/r3-0c-comparison-workspace.test.js:179:    chk('B25 Proxy lying getOwnPropertyDescriptor + accessor get → sanitized snapshot is the only safe surface', (() => {
tests/r3-0c-comparison-workspace.test.js:186:    // B26 Sanitized snapshot is frozen — caller cannot mutate it back to an unsafe shape.
tests/r3-0c-comparison-workspace.test.js:188:    chk('B26 valid result carries a sanitized snapshot', ok26.valid === true && ok26.sanitized && typeof ok26.sanitized === 'object');
tests/r3-0c-comparison-workspace.test.js:189:    chk('B26b sanitized snapshot is frozen', ok26.sanitized && Object.isFrozen(ok26.sanitized));
tests/r3-0c-comparison-workspace.test.js:190:    chk('B26c sanitized.params is frozen', ok26.sanitized && ok26.sanitized.params && Object.isFrozen(ok26.sanitized.params));
tests/r3-0c-comparison-workspace.test.js:191:    chk('B26d sanitized values equal validated descriptor values', ok26.sanitized.reasonCode === CODES.CANNOT_DISTINGUISH && ok26.sanitized.i18nKey === 'r3_0c.framing.observed_delta.faster_overall' && ok26.sanitized.params.ms === -123);
tests/r3-0c-comparison-workspace.test.js:193:    // B27 Inner params Proxy descriptor TOCTOU.
tests/r3-0c-comparison-workspace.test.js:204:    chk('B27 inner params Proxy lying descriptor → sanitized snapshot captures only validated value (or reject)', (() => {
tests/r3-0c-comparison-workspace.test.js:315:// G3. Codex C7-R2-A-01: the previous candidate had viewmodel.setAssociation auto-register the
tests/r3-0c-comparison-workspace.test.js:335:  chk('G3 setAssociation cannot bestow authority — forged escalation blocked at viewmodel state', s.placeholder !== VST.PLACEHOLDER_STATES.READY && s.result === null && s.exportGate === false);
tests/r3-0c-comparison-workspace.test.js:336:  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
tests/r3-0c-comparison-workspace.test.js:337:  chk('G3c orchestrator public API does NOT expose isAuthenticCaseRecord', typeof orch.isAuthenticCaseRecord === 'undefined');
tests/r3-0c-comparison-export.test.js:171:(() => { const r = req(); r.association = association({ positionDirection: 'sideways' }); chk('G3 bogus positionDirection → MISSING_POSITION_DIRECTION', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_DIRECTION)); })();
tests/r3-0c-comparison-export.test.js:592:  chk('Z1 (C7-R4 closure) unregistered i18nKey at descriptor → blocked', out1.status === 'blocked' || (out1.envelope && out1.envelope.payload && (!out1.envelope.payload.cannotConclude || out1.envelope.payload.cannotConclude.length === 0)));
tests/r3-0c-comparison-export.test.js:607:  chk('Z2 (C7-R4 closure) Proxy get-trap lying about i18nKey → ATTACK.UNREGISTERED NOT in export', anyAttackKey === false);
tests/r3-0c-comparison-export.test.js:622:  chk('Z3 (C7-R4 closure) Proxy descriptor lying about i18nKey → registry-strict rejection', anyAttackKey3 === false);
tests/r3-0c-comparison-export.test.js:638:  chk('Z4 (C7-R4 closure) Proxy lying descriptor + throwing accessor → buildComparisonExport does NOT trigger accessor', threw4 === false && out4 !== undefined);
renderer/index.html:8:<script src="lib/tailwind.js"></script>
renderer/index.html:10:<script src="lib/chart.min.js"></script>
renderer/index.html:274:             (including the new UI_INITIALIZATION_FAILED) surface localized wording. -->
renderer/index.html:3184:<script src="js/i18n.js"></script>
renderer/index.html:3185:<script src="js/i18n-guide.js"></script>
renderer/index.html:3186:<script src="js/i18n-ui.js"></script>
renderer/index.html:3187:<script src="js/i18n-advisor.js"></script>
renderer/index.html:3188:<script src="js/i18n-csv.js"></script>
renderer/index.html:3189:<script src="js/i18n-shell.js"></script>
renderer/index.html:3190:<script src="js/i18n-workspace.js"></script>
renderer/index.html:3191:<script src="js/i18n-comparisons.js"></script>
renderer/index.html:3192:<script src="js/i18n-ux0.js"></script>
renderer/index.html:3193:<script src="js/calibration.js"></script>
renderer/index.html:3194:<script src="js/tire-data.js"></script>
renderer/index.html:3195:<script src="js/dynamics-model.js"></script>
renderer/index.html:3196:<script src="js/car-presets.js"></script>
renderer/index.html:3197:<script src="js/lihpao-laptime.js"></script>
renderer/index.html:3198:<script src="js/api.js"></script>
renderer/index.html:3199:<script src="js/tir-parser.js"></script>
renderer/index.html:3200:<script src="js/tire-metadata.js"></script>
renderer/index.html:3201:<script src="js/kinematics.js"></script>
renderer/index.html:3202:<script src="js/transient.js"></script>
renderer/index.html:3203:<script src="js/bms-parser.js"></script>
renderer/index.html:3204:<script src="js/telemetry-schema.js"></script>
renderer/index.html:3205:<script src="js/telemetry-core.js"></script>
renderer/index.html:3206:<script src="js/telemetry-yaw.js"></script>
renderer/index.html:3207:<script src="js/telemetry-view.js"></script>
renderer/index.html:3208:<script src="js/telemetry-plot.js"></script>
renderer/index.html:3209:<script src="js/telemetry-interact.js"></script>
renderer/index.html:3210:<script src="js/telemetry-metadata.js"></script>
renderer/index.html:3211:<script src="js/bms-probe.js"></script>
renderer/index.html:3212:<script src="js/bms-raw-extract.js"></script>
renderer/index.html:3213:<script src="js/bms-channel-link.js"></script>
renderer/index.html:3214:<script src="js/bms-confirmation.js"></script>
renderer/index.html:3215:<script src="js/bms-structure-discovery.js"></script>
renderer/index.html:3216:<script src="js/bms-raw-stream-confirmation.js"></script>
renderer/index.html:3217:<script src="js/bms-channel-identity-confirmation.js"></script>
renderer/index.html:3218:<script src="js/bms-timebase-confirmation.js"></script>
renderer/index.html:3219:<script src="js/bms-physical-scaling-confirmation.js"></script>
renderer/index.html:3220:<script src="js/bms-telemetry-readiness.js"></script>
renderer/index.html:3221:<script src="js/bms-extraction-eligibility.js"></script>
renderer/index.html:3222:<script src="js/bms-measured-extraction-harness.js"></script>
renderer/index.html:3223:<script src="js/bms-canonical-adapter-eligibility.js"></script>
renderer/index.html:3224:<script src="js/bms-private-corpus-boundary.js"></script>
renderer/index.html:3225:<script src="js/bms-sanitized-evidence-adapter.js"></script>
renderer/index.html:3226:<script src="js/bms-channel-dictionary.js"></script>
renderer/index.html:3228:<script src="js/canonical-parameters.js"></script>
renderer/index.html:3229:<script src="js/parameter-conversions.js"></script>
renderer/index.html:3230:<script src="js/setup-snapshot.js"></script>
renderer/index.html:3231:<script src="js/analysis-case.js"></script>
renderer/index.html:3232:<script src="js/suspension-input-normalizer.js"></script>
renderer/index.html:3233:<script src="js/canonical-model-input.js"></script>
renderer/index.html:3234:<script src="js/analysis-execution.js"></script>
renderer/index.html:3235:<script src="js/setup-ab.js"></script>
renderer/index.html:3236:<script src="js/quantitative-setup-recommendation.js"></script>
renderer/index.html:3237:<script src="js/telemetry-observation.js"></script>
renderer/index.html:3238:<script src="js/measured-metrics.js"></script>
renderer/index.html:3239:<script src="js/model-telemetry-comparison.js"></script>
renderer/index.html:3240:<script src="js/race-engineer-insight.js"></script>
renderer/index.html:3241:<script src="js/driver-coach-insight.js"></script>
renderer/index.html:3242:<script src="js/track-intelligence.js"></script>
renderer/index.html:3243:<script src="js/analysis-workspace.js"></script>
renderer/index.html:3244:<script src="js/analysis-workspace-viewmodel.js"></script>
renderer/index.html:3245:<script src="js/storage-backend.js"></script>
renderer/index.html:3246:<script src="js/schema-migration.js"></script>
renderer/index.html:3247:<script src="js/case-record-schema.js"></script>
renderer/index.html:3248:<script src="js/case-store.js"></script>
renderer/index.html:3249:<script src="js/session-store.js"></script>
renderer/index.html:3250:<script src="js/case-library-viewmodel.js"></script>
renderer/index.html:3251:<script src="js/feature-registry.js"></script>
renderer/index.html:3252:<script src="js/feature-router.js"></script>
renderer/index.html:3262:<script src="js/r3-0c-contracts-bundle.js"></script>
renderer/index.html:3263:<script src="js/r3-0c-delta-metrics.js"></script>
renderer/index.html:3264:<script src="js/r3-0c-comparison-export.js"></script>
renderer/index.html:3265:<script src="js/r3-0c-comparison-orchestrator.js"></script>
renderer/index.html:3266:<script src="js/r3-0c-comparison-viewmodel.js"></script>
renderer/index.html:3268:<script src="js/vehicle-preset-usecases.js"></script>
renderer/index.html:3269:<script src="js/vehicle-preset-viewmodel.js"></script>
renderer/index.html:3270:<script src="js/case-shell.js"></script>
renderer/index.html:3271:<script src="js/demo-analysis-case.js"></script>
renderer/index.html:3273:<script src="js/telemetry-import-adapter.js"></script>
renderer/index.html:3274:<script src="js/channel-mapping.js"></script>
renderer/index.html:3275:<script src="js/calibration-registry.js"></script>
renderer/index.html:3276:<script src="js/analysis-window.js"></script>
renderer/index.html:3277:<script src="js/canonical-telemetry-session.js"></script>
renderer/index.html:3278:<script src="js/analysis-case-export.js"></script>
renderer/index.html:3301:  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
renderer/index.html:3953:    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
renderer/index.html:3954:    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
renderer/index.html:3961:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
renderer/index.html:3962:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
renderer/index.html:3988:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
renderer/index.html:3989:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-jcsFke45' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-sUsAj51F' (errno=Operation not permitted)

codex
The targeted suite is blocked by the read-only sandbox before assertions run: the C6 test creates a temporary fixture directory. I’ll separate tests that are read-only, verify the fixture-dependent assertions by direct source/attack probes where possible, and report the execution limitation explicitly rather than treating it as a pass.
exec
/bin/bash -lc 'node tests/r3-0c-comparison-workspace.test.js; node tests/r3-0c-contracts-bundle-equivalence.test.js; node tests/r3-0c-governance.test.js; node tests/r3-0c-no-consumer.test.js; node tests/r3-0c-governance-integrity.test.js; node tests/r3-0-phase-governance.test.js; node tests/r3-0-train.test.js' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 exited 1 in 277ms:
node:fs:3022
  return binding.mkdtemp(prefix, options.encoding);
                 ^

Error: EPERM: operation not permitted, mkdtemp '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3c-noc-art-XXXXXX'
    at Object.mkdtempSync (node:fs:3022:18)
    at runValidator (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-no-consumer.test.js:26:18)
    at /Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-no-consumer.test.js:68:13
    at Object.<anonymous> (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-no-consumer.test.js:91:3)
    at Module._compile (node:internal/modules/cjs/loader:1803:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1934:10)
    at Module.load (node:internal/modules/cjs/loader:1524:32)
    at Module._load (node:internal/modules/cjs/loader:1326:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24) {
  errno: -1,
  code: 'EPERM',
  syscall: 'mkdtemp',
  path: '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3c-noc-art-XXXXXX'
}

Node.js v25.5.0
node:fs:3022
  return binding.mkdtemp(prefix, options.encoding);
                 ^

Error: EPERM: operation not permitted, mkdtemp '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3c-int-art-XXXXXX'
    at Object.mkdtempSync (node:fs:3022:18)
    at runValidator (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-governance-integrity.test.js:39:18)
    at /Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-governance-integrity.test.js:61:13
    at Object.<anonymous> (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-governance-integrity.test.js:67:3)
    at Module._compile (node:internal/modules/cjs/loader:1803:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1934:10)
    at Module.load (node:internal/modules/cjs/loader:1524:32)
    at Module._load (node:internal/modules/cjs/loader:1326:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24) {
  errno: -1,
  code: 'EPERM',
  syscall: 'mkdtemp',
  path: '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3c-int-art-XXXXXX'
}

Node.js v25.5.0
node:fs:3022
  return binding.mkdtemp(prefix, options.encoding);
                 ^

Error: EPERM: operation not permitted, mkdtemp '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3-phase-gov-art-XXXXXX'
    at Object.mkdtempSync (node:fs:3022:18)
    at runValidator (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0-phase-governance.test.js:29:18)
    at Object.<anonymous> (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0-phase-governance.test.js:95:13)
    at Module._compile (node:internal/modules/cjs/loader:1803:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1934:10)
    at Module.load (node:internal/modules/cjs/loader:1524:32)
    at Module._load (node:internal/modules/cjs/loader:1326:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5) {
  errno: -1,
  code: 'EPERM',
  syscall: 'mkdtemp',
  path: '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3-phase-gov-art-XXXXXX'
}

Node.js v25.5.0
node:fs:3022
  return binding.mkdtemp(prefix, options.encoding);
                 ^

Error: EPERM: operation not permitted, mkdtemp '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3-train-art-XXXXXX'
    at Object.mkdtempSync (node:fs:3022:18)
    at runValidator (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0-train.test.js:41:18)
    at Object.<anonymous> (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0-train.test.js:68:13)
    at Module._compile (node:internal/modules/cjs/loader:1803:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1934:10)
    at Module.load (node:internal/modules/cjs/loader:1524:32)
    at Module._load (node:internal/modules/cjs/loader:1326:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5) {
  errno: -1,
  code: 'EPERM',
  syscall: 'mkdtemp',
  path: '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3-train-art-XXXXXX'
}

Node.js v25.5.0

exec
/bin/bash -lc "node - <<'NODE'
const fs=require('fs'),vm=require('vm');
const s=JSON.parse(fs.readFileSync('governance/r3.0c/state.json'));
const c=JSON.parse(fs.readFileSync('governance/r3.0c/capabilities.json'));
const t=JSON.parse(fs.readFileSync('governance/r3.0/train.json'));
console.log(JSON.stringify({authPathCount:s.authorizedProductionPaths?.length,currentCheckpoint:s.currentCheckpoint,enabledCaps:Object.values(c.capabilities||c).filter(x=>x&&x.enabled===true).length,feature_registry_active:s.feature_registry_active,phase_boundary_contract:(c.capabilities||c).phase_boundary_contract},null,2));
console.log('state keys',Object.keys(s)); console.log('train keys',Object.keys(t));
NODE
node - <<'NODE'
const O=require('./renderer/js/r3-0c-comparison-orchestrator.js');
const o=O.createOrchestrator({capabilities:{framingSourceStructuredContractEnabled:true,viewmodelStateTransitionContractEnabled:true},authenticityPredicate:()=>true,exportService:{buildComparisonExport:()=>({ok:true})}});
let count=0; const evil=new Proxy({}, {getPrototypeOf(){return Object.prototype},get(t,k){count++;throw new Error('attack '+String(k))}});
try { const x=o.exportComparison(evil,{}); console.log('attack returned',x); } catch(e){ console.log('ATTACK_THROW',e.message,'getCount='+count); }
NODE
rg -n 'presetCount|501|frozenDiff|frozen_diff|availability.*deferred|feature_registry_active' governance scripts tests/r3-0c-governance.test.js tests/r3-0c-governance-integrity.test.js | head -100" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
/bin/bash: cannot create temp file for here document: Operation not permitted
/bin/bash: line 8: cannot create temp file for here document: Operation not permitted
tests/r3-0c-governance.test.js:47:    capabilities: ['contract_foundation_present', 'governance_bootstrap_present', 'production_adapter_present', 'lap_authority_present', 'feature_registry_active'],
tests/r3-0c-governance.test.js:49:    productionCapabilities: ['production_adapter_present', 'lap_authority_present', 'feature_registry_active'],
tests/r3-0c-governance.test.js:55:      feature_registry_active: 'C8_ACTIVATION',
tests/r3-0c-governance.test.js:73:      feature_registry_active: { kind: 'activation', unlockFloor: 'C8_ACTIVATION', description: 'x' },
governance/r3.0e/checkpoint-manifest.schema.json:21:    "frozenDiff",
governance/r3.0e/checkpoint-manifest.schema.json:47:    "frozenDiff": "Count of frozen-boundary diff entries (must be 0).",
scripts/check-r3-0c-guard.js:77:    return f && f.availability === 'deferred' && f.deferredReason === 'R3.0C' && !f.rendererAdapter;
governance/r3.0e/schema.json:36:    "feature_registry_active"
governance/r3.0e/schema.json:46:    "feature_registry_active"
governance/r3.0e/schema.json:54:    "feature_registry_active": "E5_ACTIVATION"
scripts/check-feature-registry.js:26:  const unreachable = ids.filter(id => FEATURES[id].availability !== 'deferred' && !R.isFeatureReachable(id));
scripts/check-feature-registry.js:33:    return f && f.availability === 'deferred' && f.deferredReason === 'R3.0C' && !f.rendererAdapter;
governance/r3.0e/checkpoints/E0.json:16:    "feature_registry_active"
governance/r3.0e/checkpoints/E0.json:23:  "frozenDiff": null,
governance/r3.0e/capabilities.json:32:    "feature_registry_active": {
governance/r3.0d/checkpoint-manifest.schema.json:21:    "frozenDiff",
governance/r3.0d/checkpoint-manifest.schema.json:46:    "frozenDiff": "Count of frozen-boundary diff entries (must be 0 unless explicitly authorized frozen-allow).",
scripts/check-preset-integrity.js:7: * does, then asserts: count === 501, IDs unique, and emits a STABILITY manifest (sorted-ID sha256 +
scripts/check-preset-integrity.js:21:const EXPECTED = 501;
scripts/check-preset-integrity.js:46:    presetCount: ids.length,
scripts/check-preset-integrity.js:59:catch (e) { result = { check: 'preset-integrity', fatalError: String((e && e.stack) || e), presetCount: -1, ok: false }; exitCode = 2; }
scripts/check-preset-integrity.js:62:console.log('PRESET ' + JSON.stringify({ presetCount: result.presetCount, apiCount: result.apiCount, idsUnique: result.idsUnique, ok: result.ok }));
scripts/check-frozen-boundary.js:69:      frozenDiffCount: violations.length,
scripts/check-frozen-boundary.js:78:catch (e) { result = { check: 'frozen-boundary', fatalError: String((e && e.stack) || e), frozenDiffCount: -1, ok: false }; text = 'ERROR: ' + result.fatalError + '\n'; exitCode = 2; }
scripts/check-frozen-boundary.js:82:console.log('FROZEN ' + JSON.stringify({ frozenDiffCount: result.frozenDiffCount, violations: result.violations, baseManifestAvailable: result.baseManifestAvailable, ok: result.ok }));
governance/r3.0d/capabilities.json:32:    "feature_registry_active": {
scripts/check-r3-0c-no-consumer.js:20: *      as deferred (availability='deferred', deferredReason='R3.0C', no rendererAdapter) until
scripts/check-r3-0c-no-consumer.js:168:    const okAvailability = f.availability === 'deferred';
scripts/check-r3-0c-no-consumer.js:174:    detail[id] = { present: true, availability: f.availability, deferredReason: f.deferredReason, rendererAdapter: !!f.rendererAdapter };
governance/r3.0f/checkpoint-manifest.schema.json:21:    "frozenDiff",
governance/r3.0f/checkpoint-manifest.schema.json:48:    "frozenDiff": "Count of frozen-boundary diff entries (must be 0).",
scripts/collect-evidence.js:172:  presetCount: preset ? preset.presetCount : -1,
scripts/collect-evidence.js:173:  frozenDiffCount: frozen ? frozen.frozenDiffCount : -1,
governance/r3.0c/checkpoint-manifest.schema.json:21:    "frozenDiff",
governance/r3.0c/checkpoint-manifest.schema.json:45:    "frozenDiff": "Count of frozen-boundary diff entries (must be 0 unless this checkpoint is an explicitly authorized frozen-allow).",
governance/r3.0d/checkpoints/D0.json:16:    "feature_registry_active"
governance/r3.0d/checkpoints/D0.json:23:  "frozenDiff": null,
governance/r3.0c/state.json:27:  "note": "R3.0C C7_UI state. Adds the Comparison Workspace UI: three new authorized renderer/js paths (r3-0c-comparison-orchestrator.js, r3-0c-comparison-viewmodel.js, i18n-comparisons.js) all bound to the new ui_present capability. The orchestrator owns request-token issuance + framing emission (composes C5 delta-metrics + C6 export); the viewmodel is the pure state machine consuming orchestrator output, implementing the 7 transition triggers + stale-token drop per contracts/r3.0c/viewmodel-state-transition-contract.js. The framing-source contract (contracts/r3.0c/framing-i18n-key-registry.js) is enabled: every framing entry the orchestrator emits is validated against a closed allowlist of i18nKeys before reaching the viewmodel; the viewmodel re-validates as defense in depth. uiAllowed flips true: the Comparison Workspace pane replaces the deferred placeholder in renderer/index.html. featureRegistryActivationAllowed remains false: the three R3.0C feature IDs (case_comparison, reference_lap, corner_delta) remain availability='deferred' with NO rendererAdapter until C8 authorizes activation — C7 ships the UI surface without activating the routes. phase_boundary_contract remains the only declared-but-disabled governance capability: phase metrics (entry/mid/exit_delta) are reported metricAvailability:false in both viewmodel and export until a future checkpoint authorizes a deterministic phase-boundary contract."
governance/r3.0d/schema.json:36:    "feature_registry_active"
governance/r3.0d/schema.json:46:    "feature_registry_active"
governance/r3.0d/schema.json:54:    "feature_registry_active": "D5_ACTIVATION"
governance/r3.0c/schema.json:55:    "feature_registry_active",
governance/r3.0c/schema.json:78:    "feature_registry_active"
governance/r3.0c/schema.json:93:    "feature_registry_active": "C8_ACTIVATION",
governance/r3.0c/checkpoints/C0.json:22:    "feature_registry_active"
governance/r3.0c/checkpoints/C0.json:29:  "frozenDiff": null,
governance/r3.0f/checkpoints/F0.json:24:  "frozenDiff": null,
governance/r3.0c/codex-ca-gate-evidence/round-4-cf28bed.md:105:suspension-input-equivalence              5020 passed (raw=1002, observable=501)
governance/r3.0c/codex-ca-gate-evidence/round-4-cf28bed.md:107:scripts/check-frozen-boundary.js          {"frozenDiffCount":0,"violations":[],"baseManifestAvailable":true,"ok":true}
governance/r3.0c/codex-ca-gate-evidence/round-3-2dab434.md:46:  - scripts/check-frozen-boundary.js artifact = {ok:true, frozenDiffCount:0}
governance/r3.0c/codex-ca-gate-evidence/round-3-2dab434.md:123:suspension-input-equivalence              5020 passed (raw=1002, observable=501)
governance/r3.0c/codex-ca-gate-evidence/round-3-2dab434.md:125:scripts/check-frozen-boundary.js          {"frozenDiffCount":0,"violations":[],"baseManifestAvailable":true,"ok":true}
governance/r3.0c/cp1-retrofit-matrix.md:62:7. **Run `npm test`**, confirm 0 failure, 501 preset and frozen-files diff still clean.
governance/r3.0c/checkpoints/C1.json:23:    "feature_registry_active"
governance/r3.0c/checkpoints/C1.json:42:  "frozenDiff": null,
governance/r3.0c/capabilities.json:67:    "feature_registry_active": {
governance/r3.0f/capabilities.json:35:      "description": "12-condition release gate script (preflight, tests, E2E, frozen 0, preset 501, i18n parity, reachability, no orphans, Electron build OK, release notes drafted, CHANGELOG, tag policy). MUST run fail-closed."
governance/r3.0c/codex-ca-gate-evidence/round-2-e3ac3d6.md:45:    {"frozenDiffCount":0,"violations":[],"baseManifestAvailable":true,"ok":true}
governance/r3.0c/codex-ca-gate-evidence/round-2-e3ac3d6.md:140:suspension-input-equivalence              5020 passed (raw=1002, observable=501)
governance/r3.0c/codex-ca-gate-evidence/round-2-e3ac3d6.md:142:scripts/check-frozen-boundary.js          {"frozenDiffCount":0,"violations":[],"baseManifestAvailable":true,"ok":true}
governance/r3.0c/checkpoints/C4.json:24:    "feature_registry_active"
governance/r3.0c/checkpoints/C4.json:51:  "frozenDiff": null,
governance/r3.0c/codex-checkpoint-evidence/C6/round-1-eff0d41.md:29:  - scripts/check-frozen-boundary.js: {ok:true, frozenDiffCount:0}
governance/r3.0c/codex-checkpoint-evidence/C6/round-1-eff0d41.md:30:  - suspension-input-equivalence: raw=1002, observable=501 intact
governance/r3.0c/codex-checkpoint-evidence/C6/round-2-2b6e568.md:25:  - scripts/check-frozen-boundary.js = {ok:true, frozenDiffCount:0}
governance/r3.0c/codex-checkpoint-evidence/C6/round-2-2b6e568.md:26:  - suspension-input-equivalence: raw=1002, observable=501 intact
governance/r3.0c/checkpoints/C6.json:39:    "feature_registry_active"
governance/r3.0c/checkpoints/C6.json:110:  "frozenDiff": 0,
governance/r3.0c/checkpoints/C2.json:24:    "feature_registry_active"
governance/r3.0c/checkpoints/C2.json:49:  "frozenDiff": null,
governance/r3.0c/checkpoints/C7.json:45:    "feature_registry_active"
governance/r3.0c/checkpoints/C7.json:83:  "frozenDiff": 0,
governance/r3.0c/checkpoints/C7.json:96:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/checkpoints/C3.json:24:    "feature_registry_active"
governance/r3.0c/checkpoints/C3.json:46:  "frozenDiff": null,
governance/r3.0c/checkpoints/C5R.json:38:    "feature_registry_active"
governance/r3.0c/checkpoints/C5R.json:48:    "presetEquivalence": { "raw": 1002, "observable": 501, "intact": true },
governance/r3.0c/checkpoints/C5R.json:92:  "frozenDiff": 0,
governance/r3.0c/checkpoints/C5.json:24:    "feature_registry_active"
governance/r3.0c/checkpoints/C5.json:47:  "frozenDiff": null,
governance/r3.0c/codex-checkpoint-evidence/C6/round-4-48be2c0-PASS.md:44:  - scripts/check-frozen-boundary.js = {ok:true, frozenDiffCount:0}
governance/r3.0c/codex-checkpoint-evidence/C6/round-4-48be2c0-PASS.md:93:suspension-input-equivalence              5020 passed (raw=1002, observable=501)
governance/r3.0c/codex-checkpoint-evidence/C6/round-4-48be2c0-PASS.md:95:scripts/check-frozen-boundary.js          {"frozenDiffCount":0,"violations":[],"baseManifestAvailable":true,"ok":true}
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:94:   • Verify governance/r3.0c/checkpoints/C7.json `enabledCapabilitiesAfter` includes `ui_present`, `viewmodel_state_transition_contract`, `framing_source_structured_contract` BUT does NOT include `case_comparison`, `reference_lap`, `corner_delta`, `feature_registry_active`.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:291:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:298:renderer/index.html:3256:     placeholder.idle state — the three R3.0C feature IDs remain availability='deferred' until
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:334:  3256	     placeholder.idle state — the three R3.0C feature IDs remain availability='deferred' until
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:959:  ✓ 501 台車全部輸出在物理合理範圍
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1491:suspension-input-equivalence: 5020 passed, 0 failed  (raw=1002, observable=501)
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1728:    43	    "feature_registry_active"
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1766:    81	  "frozenDiff": 0,
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1779:    94	  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1835:      - scripts/check-frozen-boundary.js: ok=true, frozenDiffCount=0
governance/r3.0c/codex-checkpoint-evidence/C6/round-3-a87c7d5.md:25:  - scripts/check-frozen-boundary.js = {ok:true, frozenDiffCount:0}
governance/r3.0c/codex-checkpoint-evidence/C6/round-3-a87c7d5.md:26:  - suspension-input-equivalence: raw=1002, observable=501 intact
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:93:   • feature_registry_active = false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:94:   • Three R3.0C feature IDs remain availability=deferred.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:98:   • frozenDiffCount = 0.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:100:   • presetCount = 501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2288:rg -n \"availability|feature_registry_active|phase_boundary_contract|portable|schema\" governance/r3.0c renderer/js/case-record-schema.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer

codex
A concrete C7-scope failure remains: `exportComparison` is not fail-closed for caller-controlled response/framing access. A plain object with `status: "eligible"` and `exportGate: true` but a throwing `framing` accessor escapes the public API as an exception before C6 can sanitize anything. I’m pinning the exact path and checking whether current tests cover this boundary.
exec
/bin/bash -lc "node -e \"const O=require('./renderer/js/r3-0c-comparison-orchestrator.js');let called=0;const o=O.createOrchestrator({capabilities:{framingSourceStructuredContractEnabled:true,viewmodelStateTransitionContractEnabled:true},authenticityPredicate:()=>true,exportService:{buildComparisonExport(){called++;return {eligible:false}}}});const r={status:'eligible',exportGate:true,result:{},generationToken:'1'};Object.defineProperty(r,'framing',{enumerable:true,get(){throw Error('framing accessor fired')}});try{o.exportComparison(r,{}) ;console.log('RETURNED')}catch(e){console.log('ESCAPED',e.message,'c6Called='+called)}\" && nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '350,385p' && rg -n 'exportComparison\\(|framing accessor|throwing.*framing|export gate closed' tests/r3-0c-comparison-workspace.test.js tests/r3-0c-comparison-export.test.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 exited 1 in 0ms:
ESCAPED framing accessor fired c6Called=0
   350	  if (root) root.R3_0C_ComparisonOrchestrator = api;
   351	})(typeof globalThis !== 'undefined' ? globalThis : this);

exec
/bin/bash -lc "nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '300,345p'; rg -n 'exportComparison\\(|framing accessor|throwing.*framing|export gate closed' tests/r3-0c-comparison-workspace.test.js tests/r3-0c-comparison-export.test.js || true; node -e \"const s=require('./governance/r3.0c/state.json'),c=require('./governance/r3.0c/capabilities.json'),f=require('./renderer/js/feature-registry.js'); console.log('authPathCount',s.authorizedProductionPaths.length,'checkpoint',s.currentCheckpoint,'featureRegistryAllowed',s.featureRegistryActivationAllowed); console.log('enabledCaps',Object.values(c.capabilities).filter(x=>x.enabled).length,'phase',c.capabilities.phase_boundary_contract.enabled); console.log(['case_comparison','reference_lap','corner_delta'].map(k=>[k,f.FEATURES[k]?.availability]));\"" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
   300	    }
   301	
   302	    /**
   303	     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
   304	     * The orchestrator does NOT bypass C6's own authenticity / closed-allowlist checks.
   305	     */
   306	    function exportComparison(eligibleResponse, extraInputs) {
   307	      if (!ex || typeof ex.buildComparisonExport !== 'function') {
   308	        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export service unavailable' };
   309	      }
   310	      if (!_isPlain(eligibleResponse) || eligibleResponse.status !== 'eligible' || eligibleResponse.exportGate !== true) {
   311	        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export gate closed' };
   312	      }
   313	      if (!_isPlain(extraInputs)) extraInputs = {};
   314	      return ex.buildComparisonExport({
   315	        result: eligibleResponse.result,
   316	        association: extraInputs.association,
   317	        credibilityMetadata: extraInputs.credibilityMetadata,
   318	        generationToken: 'orch-' + eligibleResponse.generationToken,
   319	        referenceLap: extraInputs.referenceLap,
   320	        comparisonLap: extraInputs.comparisonLap,
   321	        framing: {
   322	          cannotConclude: eligibleResponse.framing && eligibleResponse.framing.cannotDistinguish || [],
   323	          alternativeExplanations: [],
   324	          nextValidationAction: eligibleResponse.framing && eligibleResponse.framing.nextValidationAction || null,
   325	        },
   326	      });
   327	    }
   328	
   329	    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
   330	    // exposed on the orchestrator's public API. Authenticity is supplied at construction via the
   331	    // injected predicate. Tests provide their own predicate; production callers (R3.0B case-store
   332	    // integration) inject a predicate backed by their own WeakSet / token / store-lineage check.
   333	    return Object.freeze({
   334	      SERVICE_VERSION: SERVICE_VERSION,
   335	      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
   336	      SIGN_FORMULA: SIGN_FORMULA,
   337	      currentToken: currentToken,
   338	      requestComparison: requestComparison,
   339	      exportComparison: exportComparison,
   340	    });
   341	  }
   342	
   343	  var api = {
   344	    SERVICE_VERSION: SERVICE_VERSION,
   345	    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
authPathCount 14 checkpoint C7_UI featureRegistryAllowed false
enabledCaps 2 phase false
[
  [ 'case_comparison', 'deferred' ],
  [ 'reference_lap', 'deferred' ],
  [ 'corner_delta', 'deferred' ]
]

exec
/bin/bash -lc "node -e \"const j=require('./governance/r3.0c/checkpoints/C7.json'); console.log(j.enabledCapabilitiesAfter.length,j.enabledCapabilitiesAfter); console.log('frozenDiff',j.frozenDiff);\"; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..a1a6988e16f2b2e70d6c385c9239f395d3359d26 -- renderer/js/dynamics-model.js renderer/js/car-presets.js renderer/js/case-record-schema.js renderer/js/vehicle-preset-pipeline.js; git diff --numstat fc6ff8f..a1a6988e" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
12 [
  'production_adapter_present',
  'lap_authority_present',
  'track_identity_authoritative',
  'normalized_distance_present',
  'reference_selection_present',
  'corner_segmentation_present',
  'corner_pairing_present',
  'delta_metrics_present',
  'comparison_export_present',
  'ui_present',
  'viewmodel_state_transition_contract',
  'framing_source_structured_contract'
]
frozenDiff 0
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-piR98YgS' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-pgcDqStU' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-JGA9Nivz' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-aKsMe0pz' (errno=Operation not permitted)
4737	0	governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md
35	26	renderer/js/r3-0c-comparison-export.js
65	0	tests/r3-0c-comparison-export.test.js

codex
## C7-R5-01 — Orchestrator export boundary can throw

`exportComparison()` directly reads caller-controlled properties without a fail-closed boundary:

[renderer/js/r3-0c-comparison-orchestrator.js:306](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-orchestrator.js:306)

Concrete attack:

```js
const response = {
  status: 'eligible',
  exportGate: true,
  result: {},
  generationToken: '1'
};

Object.defineProperty(response, 'framing', {
  get() { throw new Error('framing accessor fired'); }
});

orchestrator.exportComparison(response, {});
```

Observed:

```text
ESCAPED framing accessor fired c6Called=0
```

The exception occurs at lines 322–324 before C6 receives the request. Z1–Z4 only prove C6’s direct framing validation; they do not cover this public orchestrator boundary.

Required closure: snapshot or safely read all `eligibleResponse`/`extraInputs` fields, reject accessor descriptors, and wrap the public export boundary so hostile inputs return a structured blocked result.

Other evidence:

- Candidate SHA and branch match.
- C6 now consumes only `vr.sanitized`; direct invocation remains registry-strict.
- C7 workspace: 88 passed, 0 failed.
- Bundle equivalence: 17 passed, 0 failed.
- B25–B27 and G3/G3b/G3c pass.
- Auth paths: 14.
- Enabled capabilities: 12.
- Checkpoint: `C7_UI`; frozenDiff: 0.
- Three feature IDs remain deferred; phase-boundary contract remains disabled.
- Frozen physics/preset/R3.0B schema paths show no diff.
- Remaining fixture/governance suites could not execute because the review sandbox forbids temporary/artifact writes.

VERDICT: BLOCK
tokens used
46,518
## C7-R5-01 — Orchestrator export boundary can throw

`exportComparison()` directly reads caller-controlled properties without a fail-closed boundary:

[renderer/js/r3-0c-comparison-orchestrator.js:306](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-orchestrator.js:306)

Concrete attack:

```js
const response = {
  status: 'eligible',
  exportGate: true,
  result: {},
  generationToken: '1'
};

Object.defineProperty(response, 'framing', {
  get() { throw new Error('framing accessor fired'); }
});

orchestrator.exportComparison(response, {});
```

Observed:

```text
ESCAPED framing accessor fired c6Called=0
```

The exception occurs at lines 322–324 before C6 receives the request. Z1–Z4 only prove C6’s direct framing validation; they do not cover this public orchestrator boundary.

Required closure: snapshot or safely read all `eligibleResponse`/`extraInputs` fields, reject accessor descriptors, and wrap the public export boundary so hostile inputs return a structured blocked result.

Other evidence:

- Candidate SHA and branch match.
- C6 now consumes only `vr.sanitized`; direct invocation remains registry-strict.
- C7 workspace: 88 passed, 0 failed.
- Bundle equivalence: 17 passed, 0 failed.
- B25–B27 and G3/G3b/G3c pass.
- Auth paths: 14.
- Enabled capabilities: 12.
- Checkpoint: `C7_UI`; frozenDiff: 0.
- Three feature IDs remain deferred; phase-boundary contract remains disabled.
- Frozen physics/preset/R3.0B schema paths show no diff.
- Remaining fixture/governance suites could not execute because the review sandbox forbids temporary/artifact writes.

VERDICT: BLOCK
---- END codex exec ----
utcEndedAt: 2026-06-28T03:38:09Z
