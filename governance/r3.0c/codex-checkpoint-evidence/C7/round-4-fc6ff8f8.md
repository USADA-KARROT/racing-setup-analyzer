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
docs/r3-ux0-feature-id-contract.md
docs/r3-ux0-feature-registry-contract.md
docs/r3-ux0-information-architecture.md
docs/r3-ux0-reachability-matrix.md
docs/r3-ux0-ui-domain-boundary.md
docs/r3-ux0-vehicle-preset-usecases.md
docs/r3.0b-case-library-persistence.md
docs/r3.0c-contract-foundation.md
docs/r3.0c-framing-source-contract.md
docs/r3.0c-state-transition-contract.md
docs/suspension-normalization-contract.md
docs/telemetry-catalog-gap-map.md
docs/tyre-workflow-gap-map.md
governance/r3.0/train.json
governance/r3.0/train.schema.json
governance/r3.0c/capabilities.json
governance/r3.0c/checkpoint-manifest.schema.json
governance/r3.0c/checkpoints/C0.json
governance/r3.0c/checkpoints/C1.json
governance/r3.0c/checkpoints/C2.json
governance/r3.0c/checkpoints/C3.json
governance/r3.0c/checkpoints/C4.json
governance/r3.0c/checkpoints/C5.json
governance/r3.0c/checkpoints/C5R.json
governance/r3.0c/checkpoints/C6.json
governance/r3.0c/checkpoints/C7.json
governance/r3.0c/codex-ca-gate-evidence/README.md
governance/r3.0c/codex-ca-gate-evidence/round-2-e3ac3d6.md
governance/r3.0c/codex-ca-gate-evidence/round-3-2dab434.md
governance/r3.0c/codex-ca-gate-evidence/round-4-cf28bed.md
governance/r3.0c/codex-ca-gate-evidence/verdict-hashes.txt
governance/r3.0c/codex-checkpoint-evidence/C6/README.md
governance/r3.0c/codex-checkpoint-evidence/C6/round-1-eff0d41.md
governance/r3.0c/codex-checkpoint-evidence/C6/round-2-2b6e568.md
governance/r3.0c/codex-checkpoint-evidence/C6/round-3-a87c7d5.md
governance/r3.0c/codex-checkpoint-evidence/C6/round-4-48be2c0-PASS.md
governance/r3.0c/codex-checkpoint-evidence/C6/verdict-hashes.txt
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md
governance/r3.0c/cp1-retrofit-matrix.md
governance/r3.0c/schema.json
governance/r3.0c/state.json
governance/r3.0d/capabilities.json
governance/r3.0d/checkpoint-manifest.schema.json
governance/r3.0d/checkpoints/D0.json
governance/r3.0d/schema.json
governance/r3.0d/state.json
governance/r3.0e/capabilities.json
governance/r3.0e/checkpoint-manifest.schema.json
governance/r3.0e/checkpoints/E0.json
governance/r3.0e/schema.json
governance/r3.0e/state.json
governance/r3.0f/capabilities.json
governance/r3.0f/checkpoint-manifest.schema.json
governance/r3.0f/checkpoints/F0.json
governance/r3.0f/schema.json
governance/r3.0f/state.json
llms.txt
main.js
package.json
preload.js
renderer/index.html
renderer/js/analysis-case-export.js
renderer/js/analysis-case.js
renderer/js/analysis-execution.js
renderer/js/analysis-window.js
renderer/js/analysis-workspace-viewmodel.js
renderer/js/analysis-workspace.js
renderer/js/api.js
renderer/js/bms-canonical-adapter-eligibility.js
renderer/js/bms-channel-dictionary.js
renderer/js/bms-channel-identity-confirmation.js
renderer/js/bms-channel-link.js
renderer/js/bms-confirmation.js
renderer/js/bms-extraction-eligibility.js
renderer/js/bms-measured-extraction-harness.js
renderer/js/bms-parser.js
renderer/js/bms-physical-scaling-confirmation.js
renderer/js/bms-private-corpus-boundary.js
renderer/js/bms-probe.js
renderer/js/bms-raw-extract.js
renderer/js/bms-raw-stream-confirmation.js
renderer/js/bms-sanitized-evidence-adapter.js
renderer/js/bms-structure-discovery.js
renderer/js/bms-telemetry-readiness.js
renderer/js/bms-timebase-confirmation.js
renderer/js/calibration-registry.js
renderer/js/calibration.js
renderer/js/canonical-model-input.js
renderer/js/canonical-parameters.js
renderer/js/canonical-telemetry-session.js
renderer/js/car-presets.js
renderer/js/case-library-viewmodel.js
renderer/js/case-record-schema.js
renderer/js/case-shell.js
renderer/js/case-store.js
renderer/js/channel-mapping.js
renderer/js/demo-analysis-case.js
renderer/js/driver-coach-insight.js
renderer/js/dynamics-model.js
renderer/js/feature-registry.js
renderer/js/feature-router.js
renderer/js/i18n-advisor.js
renderer/js/i18n-comparisons.js
renderer/js/i18n-csv.js
renderer/js/i18n-guide.js
renderer/js/i18n-shell.js
renderer/js/i18n-ui.js
renderer/js/i18n-ux0.js
renderer/js/i18n-workspace.js
renderer/js/i18n.js
renderer/js/kinematics.js
renderer/js/lihpao-laptime.js
renderer/js/measured-metrics.js
renderer/js/model-telemetry-comparison.js
renderer/js/parameter-conversions.js
renderer/js/quantitative-setup-recommendation.js
renderer/js/r3-0c-comparison-adapter.js
renderer/js/r3-0c-comparison-export.js
renderer/js/r3-0c-comparison-orchestrator.js
renderer/js/r3-0c-comparison-viewmodel.js
renderer/js/r3-0c-contracts-bundle.js
renderer/js/r3-0c-corner-pairing.js
renderer/js/r3-0c-corner-segmentation.js
renderer/js/r3-0c-delta-metrics.js
renderer/js/r3-0c-distance-authority.js
renderer/js/r3-0c-lap-authority.js
renderer/js/r3-0c-normalized-distance.js
renderer/js/r3-0c-reference-selection.js
renderer/js/r3-0c-track-identity.js
renderer/js/race-engineer-insight.js
renderer/js/schema-migration.js
renderer/js/session-store.js
renderer/js/setup-ab.js
renderer/js/setup-snapshot.js
renderer/js/storage-backend.js
renderer/js/suspension-input-normalizer.js
renderer/js/telemetry-core.js
renderer/js/telemetry-import-adapter.js
renderer/js/telemetry-interact.js
renderer/js/telemetry-metadata.js
renderer/js/telemetry-observation.js
renderer/js/telemetry-plot.js
renderer/js/telemetry-schema.js
renderer/js/telemetry-view.js
renderer/js/telemetry-yaw.js
renderer/js/tir-parser.js
renderer/js/tire-data.js
renderer/js/tire-metadata.js
renderer/js/track-intelligence.js
renderer/js/transient.js
renderer/js/vehicle-preset-usecases.js
renderer/js/vehicle-preset-viewmodel.js
renderer/js/vehicle-profile-f312.js
renderer/lib/alpine.min.js
renderer/lib/chart.min.js
renderer/lib/tailwind.js
scripts/build-r3-0c-contracts-bundle.js
scripts/check-feature-registry.js
scripts/check-frozen-boundary.js
scripts/check-i18n.js
scripts/check-preset-integrity.js
scripts/check-r3-0-train.js
scripts/check-r3-0c-governance-integrity.js
scripts/check-r3-0c-governance.js
scripts/check-r3-0c-guard.js
scripts/check-r3-0c-no-consumer.js
scripts/check-r3-phase-governance-integrity.js
scripts/check-r3-phase-governance.js
scripts/check-r3-phase-no-consumer.js
scripts/check-verification-dependencies.js
scripts/check-version-policy.js
scripts/collect-evidence.js
scripts/frozen-files.json
scripts/run-tests-manifest.js
tests/analysis-case-adversarial.test.js
tests/analysis-case-export.test.js
tests/analysis-case.test.js
tests/analysis-execution.test.js
tests/analysis-window.test.js
tests/analysis-workspace-integration.test.js
tests/analysis-workspace-ui.test.js
tests/analysis-workspace-viewmodel.test.js
tests/analysis-workspace.test.js
tests/calibration-registry.test.js
tests/canonical-model-input.test.js
tests/canonical-parameters.test.js
tests/canonical-telemetry-session.test.js
tests/case-library-viewmodel.test.js
tests/case-record-schema.test.js
tests/case-shell.test.js
tests/case-store.test.js
tests/channel-mapping.test.js
tests/driver-coach-insight.test.js
tests/feature-registry.test.js
tests/feature-router.test.js
tests/fixtures/analysis-case-f312-synthetic.js

exec
/bin/bash -lc 'git diff --stat 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..fc6ff8f81629593d24c6af7e3274e89607c34ed7 && git diff --name-status ae03900..fc6ff8f81629593d24c6af7e3274e89607c34ed7' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-FH2dHQ6m' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-h3FtqzTR' (errno=Operation not permitted)
 contracts/r3.0c/framing-i18n-key-registry.js       |  213 +
 contracts/r3.0c/index.js                           |    6 +-
 contracts/r3.0c/reason-codes.js                    |   10 +
 .../r3.0c/viewmodel-state-transition-contract.js   |  136 +
 governance/r3.0/train.json                         |    4 +-
 governance/r3.0c/capabilities.json                 |   12 +-
 governance/r3.0c/checkpoints/C7.json               |   97 +
 .../C7/round-2-c51952a.md                          | 2096 ++++++++
 .../C7/round-3-ae039008.md                         | 5194 ++++++++++++++++++++
 governance/r3.0c/state.json                        |   16 +-
 package.json                                       |    2 +-
 renderer/index.html                                |  180 +-
 renderer/js/i18n-comparisons.js                    |  186 +
 renderer/js/r3-0c-comparison-orchestrator.js       |  351 ++
 renderer/js/r3-0c-comparison-viewmodel.js          |  277 ++
 renderer/js/r3-0c-contracts-bundle.js              | 1869 +++++++
 scripts/build-r3-0c-contracts-bundle.js            |  119 +
 tests/i18n-parity.test.js                          |   11 +
 tests/r3-0c-comparison-workspace.test.js           |  423 ++
 tests/r3-0c-contracts-bundle-equivalence.test.js   |   78 +
 tests/r3-0c-governance.test.js                     |    8 +-
 tests/r3-0c-no-consumer.test.js                    |   11 +-
 tests/r3.0a-ui.test.js                             |   12 +-
 tests/r3.0c-contract-foundation.test.js            |    4 +-
 24 files changed, 11281 insertions(+), 34 deletions(-)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-IkVbtVRP' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-kxLlKXXy' (errno=Operation not permitted)
M	contracts/r3.0c/framing-i18n-key-registry.js
M	governance/r3.0c/checkpoints/C7.json
A	governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md
M	governance/r3.0c/state.json
M	renderer/js/r3-0c-comparison-orchestrator.js
M	renderer/js/r3-0c-contracts-bundle.js
M	tests/r3-0c-comparison-workspace.test.js
M	tests/r3-0c-governance.test.js

exec
/bin/bash -lc "node -e \"const p=require('./package.json'); console.log(JSON.stringify(p.scripts,null,2))\"" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
exec
/bin/bash -lc 'git rev-parse HEAD && git branch --show-current && git remote -v && git status --short && git cat-file -t fc6ff8f81629593d24c6af7e3274e89607c34ed7 && git cat-file -t 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
{
  "start": "electron .",
  "test": "node tests/verify-dynamics.js && node tests/telemetry-core.test.js && node tests/telemetry-view.test.js && node tests/telemetry-plot.test.js && node tests/telemetry-interact.test.js && node tests/telemetry-yaw.test.js && node tests/canonical-parameters.test.js && node tests/parameter-conversions.test.js && node tests/vehicle-profile-f312.test.js && node tests/setup-snapshot.test.js && node tests/analysis-case.test.js && node tests/analysis-case-adversarial.test.js && node tests/suspension-input-normalizer.test.js && node tests/suspension-input-equivalence.test.js && node tests/suspension-input-adversarial.test.js && node tests/canonical-model-input.test.js && node tests/analysis-execution.test.js && node tests/telemetry-observation.test.js && node tests/model-telemetry-comparison.test.js && node tests/race-engineer-insight.test.js && node tests/driver-coach-insight.test.js && node tests/analysis-workspace.test.js && node tests/analysis-workspace-viewmodel.test.js && node tests/analysis-workspace-integration.test.js && node tests/analysis-workspace-ui.test.js && node tests/telemetry-import-adapter.test.js && node tests/channel-mapping.test.js && node tests/calibration-registry.test.js && node tests/analysis-window.test.js && node tests/canonical-telemetry-session.test.js && node tests/analysis-case-export.test.js && node tests/r2.3-real-telemetry-integration.test.js && node tests/r2.3-import-ui.test.js && node tests/measured-metrics.test.js && node tests/r2.4-measured-metrics-integration.test.js && node tests/r2.4-ui.test.js && node tests/setup-ab.test.js && node tests/quantitative-setup-recommendation.test.js && node tests/r2.5-setup-ab-quantitative-integration.test.js && node tests/r2.5-ui.test.js && node tests/track-intelligence.test.js && node tests/r2.6-track-intelligence-integration.test.js && node tests/r2.6-ui.test.js && node tests/case-shell.test.js && node tests/r3.0a-ui.test.js && node tests/storage-backend.test.js && node tests/schema-migration.test.js && node tests/case-record-schema.test.js && node tests/case-store.test.js && node tests/session-store.test.js && node tests/case-library-viewmodel.test.js && node tests/r3.0b-ui.test.js && node tests/r3.0b-persistence-integration.test.js && node tests/feature-registry.test.js && node tests/feature-router.test.js && node tests/vehicle-preset-pipeline.test.js && node tests/i18n-parity.test.js && node tests/r3.0c-contract-foundation.test.js && node tests/r3-0c-comparison-adapter.test.js && node tests/r3-0c-lap-authority.test.js && node tests/r3-0c-track-identity.test.js && node tests/r3-0c-distance-authority.test.js && node tests/r3-0c-normalized-distance.test.js && node tests/r3-0c-reference-selection.test.js && node tests/r3-0c-corner-segmentation.test.js && node tests/r3-0c-corner-pairing.test.js && node tests/r3-0c-delta-metrics.test.js && node tests/r3-0c-comparison-export.test.js && node tests/r3-0c-comparison-workspace.test.js && node tests/r3-0c-contracts-bundle-equivalence.test.js && node tests/r3-0c-governance.test.js && node tests/r3-0c-no-consumer.test.js && node tests/r3-0c-governance-integrity.test.js && node tests/r3-0-phase-governance.test.js && node tests/r3-0-phase-no-consumer.test.js && node tests/r3-0-phase-governance-integrity.test.js && node tests/r3-0-train.test.js && node tools/validate-against-telemetry.js --selftest",
  "build:mac": "electron-builder --mac",
  "build:win": "electron-builder --win",
  "build:all": "electron-builder --mac --win"
}

 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-gZ3WtFyO' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-ik7xR56A' (errno=Operation not permitted)
fc6ff8f81629593d24c6af7e3274e89607c34ed7
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-BUT3HLqD' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-L8rZnElA' (errno=Operation not permitted)
feat/r3.0c-c7-comparison-workspace
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-z2IMKI1U' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-tZUv6drd' (errno=Operation not permitted)
origin	https://github.com/USADA-KARROT/racing-setup-analyzer (fetch)
origin	https://github.com/USADA-KARROT/racing-setup-analyzer (push)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-YxEjlojC' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-VueeSyJk' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-Pcbi26a5' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-26aE8R6P' (errno=Operation not permitted)
commit
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-6zk4Usgr' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-6AdIuw29' (errno=Operation not permitted)
commit

codex
Repository identity matches the requested branch and SHA; the worktree is clean. I’m now tracing every framing-entry consumer, including C5/C6 export paths, and comparing the generated bundle against source rather than relying only on the supplied tests.
exec
/bin/bash -lc "rg -n \"r3-0c-(contracts-bundle|comparison-orchestrator|comparison-viewmodel|delta-metrics|comparison-export)\\.js\" renderer/index.html" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
3256:     directly. The auto-generated r3-0c-contracts-bundle.js below (in renderer/js/, name does NOT
3262:<script src="js/r3-0c-contracts-bundle.js"></script>
3263:<script src="js/r3-0c-delta-metrics.js"></script>
3264:<script src="js/r3-0c-comparison-export.js"></script>
3265:<script src="js/r3-0c-comparison-orchestrator.js"></script>
3266:<script src="js/r3-0c-comparison-viewmodel.js"></script>

exec
/bin/bash -lc 'git diff --find-renames ae03900..fc6ff8f81629593d24c6af7e3274e89607c34ed7 -- contracts/r3.0c/framing-i18n-key-registry.js renderer/js/r3-0c-comparison-orchestrator.js tests/r3-0c-comparison-workspace.test.js governance/r3.0c/state.json governance/r3.0c/checkpoints/C7.json tests/r3-0c-governance.test.js' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-HdiyEWfX' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-QJ7XPtDw' (errno=Operation not permitted)
diff --git a/contracts/r3.0c/framing-i18n-key-registry.js b/contracts/r3.0c/framing-i18n-key-registry.js
index 56da560..edc8e18 100644
--- a/contracts/r3.0c/framing-i18n-key-registry.js
+++ b/contracts/r3.0c/framing-i18n-key-registry.js
@@ -152,11 +152,20 @@
       if (!isRegisteredFramingI18nKey(keyRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing i18nKey not in registry' };
       var paramsRead = _readOwn(entry, 'params');
       if (paramsRead.state === 'THREW') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params is accessor descriptor or descriptor lookup threw — fail-closed' };
+      // Codex C7-R3-C-01 closure: build a sanitized canonical snapshot from the validated
+      // descriptor values, not the original entry. A Proxy can lie via getOwnPropertyDescriptor
+      // (returning a benign data descriptor while the real get-trap throws or mutates); after
+      // validation accepted that lie, any downstream re-read via plain `v.foo` would see the
+      // accessor side again. The orchestrator MUST consume the sanitized snapshot — never the
+      // raw entry — for the validation result to be honoured. The snapshot is frozen so callers
+      // cannot mutate it back into an unsafe shape post-validation.
+      var sanitizedParams;
       if (paramsRead.state === 'VALUE' && paramsRead.value !== undefined) {
         var paramsRaw = paramsRead.value;
         if (!_isPlain(paramsRaw)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params not a plain object' };
         var pks = _safeOwnKeys(paramsRaw);
         if (pks === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params own-key enumeration threw (Proxy)' };
+        sanitizedParams = {};
         for (var j = 0; j < pks.length; j++) {
           var k = pks[j];
           if (typeof k !== 'string' || k.length === 0) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has empty / non-string (e.g. Symbol) key' };
@@ -165,13 +174,17 @@
           var inner = _readOwn(paramsRaw, k);
           if (inner.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: inner.state === 'THREW' ? 'framing params value is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing params value missing for own key' };
           var v = inner.value;
-          if (v === null || typeof v === 'boolean') continue;
-          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; continue; }
-          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; continue; }
+          if (v === null || typeof v === 'boolean') { sanitizedParams[k] = v; continue; }
+          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; sanitizedParams[k] = v; continue; }
+          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; sanitizedParams[k] = v; continue; }
           return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has unsupported value type' };
         }
+        sanitizedParams = Object.freeze(sanitizedParams);
       }
-      return { valid: true };
+      var sanitized = sanitizedParams !== undefined
+        ? Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value, params: sanitizedParams })
+        : Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value });
+      return { valid: true, sanitized: sanitized };
     } catch (e) {
       // Codex C7 finding C7-B1 closure: any throw from a Proxy / accessor / inherited trap
       // results in fail-closed at this top-level boundary.
diff --git a/governance/r3.0c/checkpoints/C7.json b/governance/r3.0c/checkpoints/C7.json
index 8f71c90..bbc1c18 100644
--- a/governance/r3.0c/checkpoints/C7.json
+++ b/governance/r3.0c/checkpoints/C7.json
@@ -27,13 +27,15 @@
     { "path": "renderer/js/r3-0c-comparison-export.js", "capability": "comparison_export_present" },
     { "path": "renderer/js/r3-0c-comparison-orchestrator.js", "capability": "ui_present" },
     { "path": "renderer/js/r3-0c-comparison-viewmodel.js", "capability": "ui_present" },
-    { "path": "renderer/js/i18n-comparisons.js", "capability": "ui_present" }
+    { "path": "renderer/js/i18n-comparisons.js", "capability": "ui_present" },
+    { "path": "renderer/js/r3-0c-contracts-bundle.js", "capability": "ui_present" }
   ],
 
   "newlyAuthorizedPaths": [
     "renderer/js/r3-0c-comparison-orchestrator.js",
     "renderer/js/r3-0c-comparison-viewmodel.js",
-    "renderer/js/i18n-comparisons.js"
+    "renderer/js/i18n-comparisons.js",
+    "renderer/js/r3-0c-contracts-bundle.js"
   ],
   "newlyEnabledCapabilities": ["ui_present", "viewmodel_state_transition_contract", "framing_source_structured_contract"],
 
diff --git a/governance/r3.0c/state.json b/governance/r3.0c/state.json
index da27058..91296a0 100644
--- a/governance/r3.0c/state.json
+++ b/governance/r3.0c/state.json
@@ -15,7 +15,8 @@
     { "path": "renderer/js/r3-0c-comparison-export.js", "capability": "comparison_export_present" },
     { "path": "renderer/js/r3-0c-comparison-orchestrator.js", "capability": "ui_present" },
     { "path": "renderer/js/r3-0c-comparison-viewmodel.js", "capability": "ui_present" },
-    { "path": "renderer/js/i18n-comparisons.js", "capability": "ui_present" }
+    { "path": "renderer/js/i18n-comparisons.js", "capability": "ui_present" },
+    { "path": "renderer/js/r3-0c-contracts-bundle.js", "capability": "ui_present" }
   ],
   "enabledCapabilities": ["production_adapter_present", "lap_authority_present", "track_identity_authoritative", "normalized_distance_present", "reference_selection_present", "corner_segmentation_present", "corner_pairing_present", "delta_metrics_present", "comparison_export_present", "ui_present", "viewmodel_state_transition_contract", "framing_source_structured_contract"],
   "declaredButDisabledGovernanceCapabilities": ["phase_boundary_contract"],
diff --git a/renderer/js/r3-0c-comparison-orchestrator.js b/renderer/js/r3-0c-comparison-orchestrator.js
index 38a9532..bdb7791 100644
--- a/renderer/js/r3-0c-comparison-orchestrator.js
+++ b/renderer/js/r3-0c-comparison-orchestrator.js
@@ -136,6 +136,10 @@
     }
 
     function _validateFramingOrFallback(framing) {
+      // Codex C7-R3-C-01 closure: NEVER re-read `framing[k]` / `v.reasonCode` / `v.i18nKey` /
+      // `v.params` after validation. A Proxy can return a different value on each access; the
+      // validator's `sanitized` snapshot (frozen, built from descriptor-read values only) is the
+      // ONLY safe surface to consume downstream. Same TOCTOU applies to cannotDistinguish entries.
       var fallback = FIR.cannotDistinguishFallback();
       var out = {
         observedDelta: fallback,
@@ -149,7 +153,7 @@
         var v = framing[k];
         if (v === null || v === undefined) return; // keep fallback
         var vr = FIR.validateFramingEntry(v);
-        if (vr.valid) out[k] = Object.freeze({ reasonCode: v.reasonCode, i18nKey: v.i18nKey, params: v.params ? Object.freeze(Object.assign({}, v.params)) : undefined });
+        if (vr.valid && vr.sanitized) out[k] = vr.sanitized;
         // else: leave fallback in place (defense in depth — orchestrator emit should have caught)
       });
       if (Array.isArray(framing.cannotDistinguish)) {
@@ -157,7 +161,7 @@
         for (var i = 0; i < framing.cannotDistinguish.length && i < 64; i++) {
           var e = framing.cannotDistinguish[i];
           var er = FIR.validateFramingEntry(e);
-          if (er.valid) cd.push(Object.freeze({ reasonCode: e.reasonCode, i18nKey: e.i18nKey, params: e.params ? Object.freeze(Object.assign({}, e.params)) : undefined }));
+          if (er.valid && er.sanitized) cd.push(er.sanitized);
         }
         out.cannotDistinguish = Object.freeze(cd);
       } else {
@@ -275,14 +279,20 @@
         nextValidationAction: null,
       };
       if (_isPlain(callerFraming)) {
-        // caller may suggest framing — we validate every entry and replace only valid ones.
+        // Codex C7-R3-C-01 closure: assign vr.sanitized, NOT the raw `v`. The TOCTOU bypass via
+        // Proxy.getOwnPropertyDescriptor lying about descriptors would otherwise let an accepted
+        // entry yield different values on later access.
         ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
           var v = callerFraming[k];
-          if (v && FIR.validateFramingEntry(v).valid) built[k] = v;
+          if (!v) return;
+          var vr = FIR.validateFramingEntry(v);
+          if (vr.valid && vr.sanitized) built[k] = vr.sanitized;
         });
         if (Array.isArray(callerFraming.cannotDistinguish)) {
           callerFraming.cannotDistinguish.forEach(function (e) {
-            if (e && FIR.validateFramingEntry(e).valid && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(e);
+            if (!e) return;
+            var er = FIR.validateFramingEntry(e);
+            if (er.valid && er.sanitized && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(er.sanitized);
           });
         }
       }
diff --git a/tests/r3-0c-comparison-workspace.test.js b/tests/r3-0c-comparison-workspace.test.js
index ceeb99a..2216cf5 100644
--- a/tests/r3-0c-comparison-workspace.test.js
+++ b/tests/r3-0c-comparison-workspace.test.js
@@ -153,6 +153,59 @@ chk('A7 cannotDistinguishFallback returns valid entry', FIR.validateFramingEntry
     // existing orchestrator output (`params: v.params ? ... : undefined`) keeps working.
     const e24 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: undefined };
     chk('B24 params explicit-undefined → valid (back-compat)', FIR.validateFramingEntry(e24).valid === true);
+
+    // Codex C7-R3-C-01 closure: Proxy descriptor TOCTOU. A Proxy can lie via
+    // getOwnPropertyDescriptor (returning a benign data descriptor while the real get-trap
+    // throws or returns side-effecting values). The validator must (a) detect this via a
+    // sanitized snapshot return contract that callers consume INSTEAD of the raw entry, OR
+    // (b) reject the entry outright. Both stances are tested.
+    const target25 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' };
+    Object.defineProperty(target25, 'params', {
+      configurable: true,
+      enumerable: true,
+      get() { throw new Error('ACCESSOR EXECUTED ON GET'); },
+    });
+    const attack25 = new Proxy(target25, {
+      getOwnPropertyDescriptor(t, k) {
+        if (k === 'params') return { configurable: true, enumerable: true, writable: true, value: undefined };
+        return Reflect.getOwnPropertyDescriptor(t, k);
+      },
+    });
+    const res25 = FIR.validateFramingEntry(attack25);
+    // Either the validator rejects (sufficient) OR the sanitized snapshot is the safe
+    // surface and re-reading the raw entry would still throw — in which case downstream
+    // consumers must use sanitized. We require sanitized to be present AND to be free of
+    // the accessor side-effect.
+    chk('B25 Proxy lying getOwnPropertyDescriptor + accessor get → sanitized snapshot is the only safe surface', (() => {
+      if (res25.valid !== true) return true; // reject is acceptable
+      if (!res25.sanitized) return false; // valid without sanitized is unsafe
+      // sanitized must NOT have params (the get-trap throws on the real entry)
+      try { var p = res25.sanitized.params; return p === undefined; } catch (_) { return false; }
+    })());
+
+    // B26 Sanitized snapshot is frozen — caller cannot mutate it back to an unsafe shape.
+    const ok26 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123 } });
+    chk('B26 valid result carries a sanitized snapshot', ok26.valid === true && ok26.sanitized && typeof ok26.sanitized === 'object');
+    chk('B26b sanitized snapshot is frozen', ok26.sanitized && Object.isFrozen(ok26.sanitized));
+    chk('B26c sanitized.params is frozen', ok26.sanitized && ok26.sanitized.params && Object.isFrozen(ok26.sanitized.params));
+    chk('B26d sanitized values equal validated descriptor values', ok26.sanitized.reasonCode === CODES.CANNOT_DISTINGUISH && ok26.sanitized.i18nKey === 'r3_0c.framing.observed_delta.faster_overall' && ok26.sanitized.params.ms === -123);
+
+    // B27 Inner params Proxy descriptor TOCTOU.
+    const innerTarget27 = {};
+    Object.defineProperty(innerTarget27, 'ms', { configurable: true, enumerable: true, get() { throw new Error('INNER ACCESSOR'); } });
+    const innerAttack27 = new Proxy(innerTarget27, {
+      getOwnPropertyDescriptor(t, k) {
+        if (k === 'ms') return { configurable: true, enumerable: true, writable: true, value: 999 };
+        return Reflect.getOwnPropertyDescriptor(t, k);
+      },
+    });
+    const e27 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: innerAttack27 };
+    const res27 = FIR.validateFramingEntry(e27);
+    chk('B27 inner params Proxy lying descriptor → sanitized snapshot captures only validated value (or reject)', (() => {
+      if (res27.valid !== true) return true; // reject is acceptable
+      if (!res27.sanitized) return false;
+      try { var ms = res27.sanitized.params && res27.sanitized.params.ms; return ms === 999 || ms === undefined; } catch (_) { return false; }
+    })());
   })();
 })();
 
diff --git a/tests/r3-0c-governance.test.js b/tests/r3-0c-governance.test.js
index a0458ae..dd68735 100644
--- a/tests/r3-0c-governance.test.js
+++ b/tests/r3-0c-governance.test.js
@@ -112,7 +112,7 @@ function writeFixture(opts) {
   chk('A1 real-repo validator exits 0', r.status === 0, r.stderr);
   chk('A2 real-repo ok===true', !!(r.artifact && r.artifact.ok === true), r.artifact && r.artifact.violations);
   chk('A3 real-repo checkpoint=C7_UI', !!(r.artifact && r.artifact.currentCheckpoint === 'C7_UI'));
-  chk('A4 real-repo authPathCount=13 (C1..C6 + 3 C7 paths: orchestrator, viewmodel, i18n-comparisons)', !!(r.artifact && r.artifact.authorizedProductionPathCount === 13));
+  chk('A4 real-repo authPathCount=14 (C1..C6 + 4 C7 paths: orchestrator, viewmodel, i18n-comparisons, contracts-bundle)', !!(r.artifact && r.artifact.authorizedProductionPathCount === 14));
   chk('A5 real-repo enabledCapCount=12 (C1..C6 capabilities + ui_present + 2 C7 governance capabilities)', !!(r.artifact && r.artifact.enabledCapabilityCount === 12));
   chk('A6 real-repo runtimeConsumers=true (C1 floor)', r.artifact && r.artifact.runtimeConsumersAllowed === true);
   chk('A7 real-repo uiAllowed=true (C7 reached)', r.artifact && r.artifact.uiAllowed === true);

exec
/bin/bash -lc "rg -n \"reasonCode|i18nKey|validateFramingEntry|\\.sanitized\" contracts renderer/js --glob '*.js'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
contracts/r3.0c/framing-i18n-key-registry.js:6: * { reasonCode, i18nKey, params? } where reasonCode ∈ contracts/r3.0c/reason-codes.js
contracts/r3.0c/framing-i18n-key-registry.js:7: * REASON_CODES AND i18nKey ∈ the frozen registry exported here. The renderer maps i18nKey to a
contracts/r3.0c/framing-i18n-key-registry.js:9: * prose; the viewmodel never re-words; the UI calls only t(entry.i18nKey).
contracts/r3.0c/framing-i18n-key-registry.js:12: * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
contracts/r3.0c/framing-i18n-key-registry.js:29:  // The closed allowlist of framing i18nKeys. Every entry the orchestrator emits MUST use one of
contracts/r3.0c/framing-i18n-key-registry.js:71:  // comparison-eligibility contract) AND the i18nKey appears in the registry above.
contracts/r3.0c/framing-i18n-key-registry.js:121:   * validateFramingEntry(entry) — structural + registry gate.
contracts/r3.0c/framing-i18n-key-registry.js:122:   *   • entry must be a plain object owning ONLY {reasonCode, i18nKey, params?} keys
contracts/r3.0c/framing-i18n-key-registry.js:123:   *   • reasonCode ∈ REASON_CODES
contracts/r3.0c/framing-i18n-key-registry.js:124:   *   • i18nKey ∈ FRAMING_I18N_KEY_REGISTRY
contracts/r3.0c/framing-i18n-key-registry.js:128:   * Returns { valid:true } or { valid:false, reasonCode, detail }.
contracts/r3.0c/framing-i18n-key-registry.js:130:  function validateFramingEntry(entry) {
contracts/r3.0c/framing-i18n-key-registry.js:132:      if (!_isPlain(entry)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry not a plain object' };
contracts/r3.0c/framing-i18n-key-registry.js:136:      if (keys === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry own-key enumeration threw (Proxy)' };
contracts/r3.0c/framing-i18n-key-registry.js:137:      var ALLOWED = { reasonCode: true, i18nKey: true, params: true };
contracts/r3.0c/framing-i18n-key-registry.js:140:        if (typeof key !== 'string') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has non-string (e.g. Symbol) own-key' };
contracts/r3.0c/framing-i18n-key-registry.js:141:        if (!ALLOWED[key]) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has unknown key: ' + String(key).slice(0, 60) };
contracts/r3.0c/framing-i18n-key-registry.js:147:      var rcRead = _readOwn(entry, 'reasonCode');
contracts/r3.0c/framing-i18n-key-registry.js:148:      if (rcRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: rcRead.state === 'THREW' ? 'framing reasonCode is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing reasonCode missing' };
contracts/r3.0c/framing-i18n-key-registry.js:149:      if (!RC.isReasonCode(rcRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing reasonCode unregistered' };
contracts/r3.0c/framing-i18n-key-registry.js:150:      var keyRead = _readOwn(entry, 'i18nKey');
contracts/r3.0c/framing-i18n-key-registry.js:151:      if (keyRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: keyRead.state === 'THREW' ? 'framing i18nKey is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing i18nKey missing' };
contracts/r3.0c/framing-i18n-key-registry.js:152:      if (!isRegisteredFramingI18nKey(keyRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing i18nKey not in registry' };
contracts/r3.0c/framing-i18n-key-registry.js:154:      if (paramsRead.state === 'THREW') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params is accessor descriptor or descriptor lookup threw — fail-closed' };
contracts/r3.0c/framing-i18n-key-registry.js:165:        if (!_isPlain(paramsRaw)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params not a plain object' };
contracts/r3.0c/framing-i18n-key-registry.js:167:        if (pks === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params own-key enumeration threw (Proxy)' };
contracts/r3.0c/framing-i18n-key-registry.js:171:          if (typeof k !== 'string' || k.length === 0) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has empty / non-string (e.g. Symbol) key' };
contracts/r3.0c/framing-i18n-key-registry.js:175:          if (inner.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: inner.state === 'THREW' ? 'framing params value is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing params value missing for own key' };
contracts/r3.0c/framing-i18n-key-registry.js:178:          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; sanitizedParams[k] = v; continue; }
contracts/r3.0c/framing-i18n-key-registry.js:179:          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; sanitizedParams[k] = v; continue; }
contracts/r3.0c/framing-i18n-key-registry.js:180:          return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has unsupported value type' };
contracts/r3.0c/framing-i18n-key-registry.js:185:        ? Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value, params: sanitizedParams })
contracts/r3.0c/framing-i18n-key-registry.js:186:        : Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value });
contracts/r3.0c/framing-i18n-key-registry.js:191:      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing validation threw — fail-closed' };
contracts/r3.0c/framing-i18n-key-registry.js:201:    return Object.freeze({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
contracts/r3.0c/framing-i18n-key-registry.js:208:    validateFramingEntry: validateFramingEntry,
contracts/r3.0c/reference-and-corner-contract.js:90:      reasonCodes: Object.freeze([]),
contracts/r3.0c/reference-and-corner-contract.js:136:      reasonCodes: Object.freeze([]),
contracts/r3.0c/reference-and-corner-contract.js:167:      reasonCodes: Object.freeze([]),
renderer/js/i18n-ui.js:383:    'ui.telem.pcorpus.sanitizedOnly': 'Only sanitized aggregate evidence may be used',
renderer/js/i18n-ui.js:391:    'ui.telem.sadapter.sanitizedOnly': 'Only sanitized aggregate evidence is adapted into a dry-run shape',
renderer/js/i18n-ui.js:982:    'ui.telem.pcorpus.sanitizedOnly': '只允許 sanitized aggregate evidence',
renderer/js/i18n-ui.js:990:    'ui.telem.sadapter.sanitizedOnly': '只把 sanitized aggregate evidence 轉接成 dry-run shape',
renderer/js/i18n-ui.js:1575:    'ui.telem.pcorpus.sanitizedOnly': 'sanitized aggregate evidence のみ利用可能',
renderer/js/i18n-ui.js:1583:    'ui.telem.sadapter.sanitizedOnly': 'sanitized aggregate evidence のみを dry-run shape に変換します',
contracts/r3.0c/viewmodel-state-transition-contract.js:89:      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'generationToken not a positive integer' };
contracts/r3.0c/viewmodel-state-transition-contract.js:92:      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'generationToken not monotonically increasing' };
renderer/js/telemetry-metadata.js:335:  const sadapter = (bmsResult && bmsResult.sanitizedEvidenceAdapter) || null;
contracts/r3.0c/reason-codes.js:132:    // code lets the framing entry remain a {reasonCode, i18nKey, params} triple (per
contracts/r3.0c/reason-codes.js:162:  function _normCodes(reasonCodes) {
contracts/r3.0c/reason-codes.js:163:    var arr = Array.isArray(reasonCodes) ? reasonCodes : (reasonCodes == null ? [] : [reasonCodes]);
contracts/r3.0c/reason-codes.js:169:  function buildBlockedResult(reasonCodes, opts) {
contracts/r3.0c/reason-codes.js:171:    var codes = _normCodes(reasonCodes);
contracts/r3.0c/reason-codes.js:175:      reasonCodes: Object.freeze(codes.slice()),
renderer/js/bms-sanitized-evidence-adapter.js:108:  const ev = (opts.sanitizedEvidence && typeof opts.sanitizedEvidence === 'object' && !Array.isArray(opts.sanitizedEvidence)) ? opts.sanitizedEvidence : null;
renderer/js/bms-sanitized-evidence-adapter.js:111:  const sanitizedOnly = !!(ev && ev.sanitizedOnly === true);
renderer/js/r3-0c-lap-authority.js:10: *   deriveLapAuthority(lapEvidence, options)         — primary entry; returns a descriptor + reasonCodes
renderer/js/r3-0c-lap-authority.js:60:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-lap-authority.js:315:        reasonCodes: contractResult.reasonCodes,
renderer/js/r3-0c-lap-authority.js:333:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-lap-authority.js:369:        reasonCodes: res.reasonCodes,
renderer/js/r3-0c-lap-authority.js:381:      reasonCodes: Object.freeze([]),
contracts/r3.0c/comparison-eligibility-contract.js:55:  // Renderer maps i18nKey to a fixed frozen-table wording — the source never authors UI prose.
contracts/r3.0c/comparison-eligibility-contract.js:57:    requiredKeys: Object.freeze(['reasonCode', 'i18nKey']),
contracts/r3.0c/comparison-eligibility-contract.js:73:    return Object.freeze({ eligible: true, status: 'metric_supported', metric: metricName, reasonCodes: Object.freeze([]), result: null });
contracts/r3.0c/comparison-eligibility-contract.js:94:   * Returns { valid:true, status:'context_case_binding_valid', reasonCodes:[] }
contracts/r3.0c/comparison-eligibility-contract.js:130:      reasonCodes: Object.freeze([]),
contracts/r3.0c/comparison-eligibility-contract.js:184:      if (!refBind.valid && Array.isArray(refBind.reasonCodes)) refBind.reasonCodes.forEach(function (c) { reasons.push(c); });
contracts/r3.0c/comparison-eligibility-contract.js:186:      if (!cmpBind.valid && Array.isArray(cmpBind.reasonCodes)) cmpBind.reasonCodes.forEach(function (c) { reasons.push(c); });
contracts/r3.0c/comparison-eligibility-contract.js:197:    if (!norm.eligible) norm.reasonCodes.forEach(function (c) { reasons.push(c); });
contracts/r3.0c/comparison-eligibility-contract.js:201:    if (!cred.valid) cred.reasonCodes.forEach(function (c) { reasons.push(c); });
contracts/r3.0c/comparison-eligibility-contract.js:216:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-comparison-export.js:21: * results may be exported. Blocked envelopes carry status / reasonCodes / limitations / minimal
renderer/js/r3-0c-comparison-export.js:57:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-comparison-export.js:93:    'reasonCodes',
renderer/js/r3-0c-comparison-export.js:154:    // FRAMING_KEY_SHAPE: { reasonCode, i18nKey, params? } — params is plain object or OMITTED.
renderer/js/r3-0c-comparison-export.js:158:    var reasonCode = _safeGet(frame, 'reasonCode');
renderer/js/r3-0c-comparison-export.js:159:    if (!RC.isReasonCode(reasonCode)) return null;
renderer/js/r3-0c-comparison-export.js:160:    var i18nKey = _safeGet(frame, 'i18nKey');
renderer/js/r3-0c-comparison-export.js:161:    if (!_nonEmptyStr(i18nKey)) return null;
renderer/js/r3-0c-comparison-export.js:162:    if (_utf8ByteLength(i18nKey) > MAX_GENERAL_STRING_BYTES) return null;
renderer/js/r3-0c-comparison-export.js:163:    var out = { reasonCode: reasonCode, i18nKey: i18nKey };
renderer/js/r3-0c-comparison-export.js:216:  function _blockedExport(reasonCodes, detail) {
renderer/js/r3-0c-comparison-export.js:217:    var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
renderer/js/r3-0c-comparison-export.js:223:      reasonCodes: br.reasonCodes,
renderer/js/r3-0c-comparison-export.js:449:    var reasonCodes = Array.isArray(result.reasonCodes) ? result.reasonCodes.filter(function (c) { return RC.isReasonCode(c); }) : [];
renderer/js/r3-0c-comparison-export.js:450:    if (reasonCodes.length === 0) reasonCodes = [CODES.INTERNAL_CONTRACT_VIOLATION];
renderer/js/r3-0c-comparison-export.js:460:      reasonCodes: reasonCodes,
renderer/js/r3-0c-comparison-export.js:487:   *   - or _blockedExport([reasonCodes]) — never a partial envelope.
renderer/js/r3-0c-comparison-export.js:507:    if (!cred.valid) return _blockedExport(cred.reasonCodes.slice(), 'credibilityMetadata invalid');
renderer/js/r3-0c-comparison-export.js:526:      return _blockedExport(envelope.reasonCodes.slice(), envelope.detail);
renderer/js/r3-0c-comparison-export.js:530:    if (preCheck.eligible === false) return _blockedExport(preCheck.reasonCodes.slice(), preCheck.detail || 'envelope failed pre-serialize validation');
renderer/js/r3-0c-comparison-export.js:541:    if (postCheck.eligible === false) return _blockedExport(postCheck.reasonCodes.slice(), postCheck.detail || 'envelope failed post-serialize validation');
renderer/js/r3-0c-comparison-export.js:551:      reasonCodes: Object.freeze([]),
contracts/r3.0c/credibility-contract.js:35:   * metadata. Returns { valid:boolean, reasonCodes:[...] }. It NEVER fabricates or upgrades credibility:
contracts/r3.0c/credibility-contract.js:42:    if (!_isPlain(meta)) return { valid: false, reasonCodes: [CODES.INSUFFICIENT_CREDIBILITY_METADATA] };
contracts/r3.0c/credibility-contract.js:57:    return { valid: out.length === 0, reasonCodes: out };
contracts/r3.0c/credibility-contract.js:66:    if (!v.valid) return RC.buildBlockedResult(v.reasonCodes);
renderer/js/bms-private-corpus-boundary.js:94:  const sanitizedOnly = !!(manifest && manifest.sanitizedOnly === true);
renderer/js/bms-private-corpus-boundary.js:112:  const ev = (opts.sanitizedEvidence && typeof opts.sanitizedEvidence === 'object') ? opts.sanitizedEvidence : null;
renderer/js/bms-private-corpus-boundary.js:174:    candidateCount: (_PC_RANK[status] >= _PC_RANK.sanitized_evidence_candidate && !boundaryReady) ? 1 : 0,
renderer/js/r3-0c-delta-metrics.js:36:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-delta-metrics.js:56:      reasonCodes: br.reasonCodes,
renderer/js/r3-0c-delta-metrics.js:98:   *     identity, sign, limitations, evidence, reasonCodes:[], result:null }
renderer/js/r3-0c-delta-metrics.js:110:    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);
renderer/js/r3-0c-delta-metrics.js:127:          ? { blocked: true, reasonCodes: [CODES.DELTA_METRIC_NUMERIC_INVALID], scope: 'lap' }
renderer/js/r3-0c-delta-metrics.js:137:            ? { blocked: true, reasonCodes: [CODES.DELTA_METRIC_NUMERIC_INVALID], scope: 'lap' }
renderer/js/r3-0c-delta-metrics.js:145:            reasonCodes: perFull.any ? [] : [CODES.DELTA_METRIC_NUMERIC_INVALID],
renderer/js/r3-0c-delta-metrics.js:156:          reasonCodes: per.any ? [] : [CODES.DELTA_METRIC_NUMERIC_INVALID],
renderer/js/r3-0c-delta-metrics.js:178:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-track-identity.js:51:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-track-identity.js:94:   *   { authoritative:true, identity:{trackId, layoutId}, reasonCodes:[], evidence:{...} }
renderer/js/r3-0c-track-identity.js:112:        reasonCodes: b0.reasonCodes,
renderer/js/r3-0c-track-identity.js:125:        reasonCodes: b1.reasonCodes,
renderer/js/r3-0c-track-identity.js:138:        reasonCodes: b2.reasonCodes,
renderer/js/r3-0c-track-identity.js:155:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-track-identity.js:199:        reasonCodes: bm.reasonCodes,
renderer/js/r3-0c-track-identity.js:211:        reasonCodes: mm.reasonCodes,
renderer/js/r3-0c-track-identity.js:222:      reasonCodes: Object.freeze([]),
contracts/r3.0c/index.js:28:    reasonCodes: RC,
renderer/js/r3-0c-comparison-orchestrator.js:12: *   - { status:'blocked', reasonCodes:[...], limitations:[...], framing:{...}, generationToken }
renderer/js/r3-0c-comparison-orchestrator.js:13: *   - { status:'unavailable', reasonCodes:[...], framing:{...}, generationToken }
renderer/js/r3-0c-comparison-orchestrator.js:16: * emission; any orchestrator attempt to emit an unregistered i18nKey or free-form prose
renderer/js/r3-0c-comparison-orchestrator.js:49:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-comparison-orchestrator.js:112:    function _blockedResponse(reasonCodes, detail, framing, token) {
renderer/js/r3-0c-comparison-orchestrator.js:113:      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
renderer/js/r3-0c-comparison-orchestrator.js:117:        reasonCodes: Object.freeze(arr.slice()),
renderer/js/r3-0c-comparison-orchestrator.js:125:    function _unavailableResponse(reasonCodes, framing, token) {
renderer/js/r3-0c-comparison-orchestrator.js:126:      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
renderer/js/r3-0c-comparison-orchestrator.js:130:        reasonCodes: Object.freeze(arr.slice()),
renderer/js/r3-0c-comparison-orchestrator.js:139:      // Codex C7-R3-C-01 closure: NEVER re-read `framing[k]` / `v.reasonCode` / `v.i18nKey` /
renderer/js/r3-0c-comparison-orchestrator.js:155:        var vr = FIR.validateFramingEntry(v);
renderer/js/r3-0c-comparison-orchestrator.js:156:        if (vr.valid && vr.sanitized) out[k] = vr.sanitized;
renderer/js/r3-0c-comparison-orchestrator.js:163:          var er = FIR.validateFramingEntry(e);
renderer/js/r3-0c-comparison-orchestrator.js:164:          if (er.valid && er.sanitized) cd.push(er.sanitized);
renderer/js/r3-0c-comparison-orchestrator.js:206:        return _blockedResponse(bindCheck.reasonCodes ? bindCheck.reasonCodes.slice() : [CODES.TRACK_IDENTITY_MISMATCH], 'case/context binding failed', null, token);
renderer/js/r3-0c-comparison-orchestrator.js:212:        return _blockedResponse(elig.reasonCodes ? elig.reasonCodes.slice() : [CODES.REFERENCE_LAP_UNAVAILABLE], 'eligibility failed', null, token);
renderer/js/r3-0c-comparison-orchestrator.js:241:        return _blockedResponse(dmResult.reasonCodes ? dmResult.reasonCodes.slice() : [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE], 'delta-metrics blocked', null, token);
renderer/js/r3-0c-comparison-orchestrator.js:264:      // present we use _validateFramingOrFallback which rejects unregistered i18nKeys.
renderer/js/r3-0c-comparison-orchestrator.js:268:        if (lapTimeMetric.value < 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: lapTimeMetric.value } };
renderer/js/r3-0c-comparison-orchestrator.js:269:        else if (lapTimeMetric.value > 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.slower_overall', params: { ms: lapTimeMetric.value } };
renderer/js/r3-0c-comparison-orchestrator.js:270:        else observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.identical_lap' };
renderer/js/r3-0c-comparison-orchestrator.js:273:      if (phaseMetricRequested) cannotDistinguish.push({ reasonCode: CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED, i18nKey: 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised' });
renderer/js/r3-0c-comparison-orchestrator.js:282:        // Codex C7-R3-C-01 closure: assign vr.sanitized, NOT the raw `v`. The TOCTOU bypass via
renderer/js/r3-0c-comparison-orchestrator.js:288:          var vr = FIR.validateFramingEntry(v);
renderer/js/r3-0c-comparison-orchestrator.js:289:          if (vr.valid && vr.sanitized) built[k] = vr.sanitized;
renderer/js/r3-0c-comparison-orchestrator.js:294:            var er = FIR.validateFramingEntry(e);
renderer/js/r3-0c-comparison-orchestrator.js:295:            if (er.valid && er.sanitized && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(er.sanitized);
renderer/js/r3-0c-comparison-orchestrator.js:308:        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export service unavailable' };
renderer/js/r3-0c-comparison-orchestrator.js:311:        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export gate closed' };
renderer/js/r3-0c-distance-authority.js:56:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-distance-authority.js:118:        reasonCodes: b0.reasonCodes,
renderer/js/r3-0c-distance-authority.js:157:        reasonCodes: bx.reasonCodes,
renderer/js/r3-0c-distance-authority.js:180:      reasonCodes: Object.freeze([]),
contracts/r3.0c/delta-metrics-contract.js:139:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-reference-selection.js:36:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-reference-selection.js:52:      reasonCodes: br.reasonCodes,
renderer/js/r3-0c-reference-selection.js:64:   *     reasonCodes:[], result:null }
renderer/js/r3-0c-reference-selection.js:80:    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);
renderer/js/r3-0c-reference-selection.js:103:        var matchedReasons = Array.isArray(eq.reasonCodes) ? eq.reasonCodes.slice() : [CODES.MISSING_TRACK_IDENTITY];
renderer/js/r3-0c-reference-selection.js:121:        return _blocked([CODES.REFERENCE_LAP_UNAVAILABLE].concat(lapResult.reasonCodes), 'candidate lap rejected by lap-authority');
renderer/js/r3-0c-reference-selection.js:149:      reasonCodes: Object.freeze([]),
contracts/r3.0c/comparison-export-contract.js:178:      reasonCodes: Object.freeze([]),
contracts/r3.0c/valid-lap-contract.js:40:   * { eligible:true, status:'lap_authority_complete', evaluation:'contract_structural', reasonCodes:[] }.
contracts/r3.0c/valid-lap-contract.js:59:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-comparison-viewmodel.js:26:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-comparison-viewmodel.js:111:        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [];
renderer/js/r3-0c-comparison-viewmodel.js:116:        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [CODES.INTERNAL_CONTRACT_VIOLATION];
contracts/r3.0c/normalized-position-contract.js:96:      reasonCodes: Object.freeze([]),
contracts/r3.0c/normalized-position-contract.js:109:      var merged = [].concat(rv.eligible ? [] : rv.reasonCodes, cv.eligible ? [] : cv.reasonCodes);
contracts/r3.0c/normalized-position-contract.js:118:      reasonCodes: Object.freeze([]),
contracts/r3.0c/normalized-position-contract.js:209:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-corner-segmentation.js:34:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-corner-segmentation.js:60:      reasonCodes: br.reasonCodes,
renderer/js/r3-0c-corner-segmentation.js:125:   *     identity, trackIdentity, algorithmVersion, evidence, reasonCodes:[] }
renderer/js/r3-0c-corner-segmentation.js:130:    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);
renderer/js/r3-0c-corner-segmentation.js:232:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-normalized-distance.js:55:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-normalized-distance.js:110:      reasonCodes: br.reasonCodes,
renderer/js/r3-0c-normalized-distance.js:146:   *     identity, authority, policy, evidence, reasonCodes:[], result:null }
renderer/js/r3-0c-normalized-distance.js:158:      return _blocked(shape.reasonCodes.slice(), shape.detail);
renderer/js/r3-0c-normalized-distance.js:390:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-normalized-distance.js:406:   *     fraction, interpolated:true|false, gap, reasonCodes:[] }
renderer/js/r3-0c-normalized-distance.js:462:      reasonCodes: Object.freeze([]),
renderer/js/telemetry-core.js:193:    // `reasonCodes` = a PARALLEL [{code,params,message}] list (same entries/order) for the UI to
renderer/js/telemetry-core.js:195:    let status = GRADE.DEFINITION_CONFIRMED; const reason = [], reasonCodes = [];
renderer/js/telemetry-core.js:196:    const addReason = (msg, code, params) => { reason.push(msg); reasonCodes.push({ code, params: params || {}, message: msg }); };
renderer/js/telemetry-core.js:202:    return { hasTime: !!timeCol, timeName, dt, sampleRateHz, monotonic, dups, resets, gaps, lapResets, lapName, perCh, status, reason, reasonCodes };
renderer/js/telemetry-core.js:282:    // (parser carries its own code; timebase reuses tb.reasonCodes 1:1 with tb.reason), so
renderer/js/telemetry-core.js:287:    if (tb.status === GRADE.BLOCKED) blockers.push(...tb.reasonCodes);
renderer/js/telemetry-core.js:288:    else if (tb.status === GRADE.PROVISIONAL) assumptions.push(...tb.reasonCodes);
renderer/js/r3-0c-contracts-bundle.js:145:    // code lets the framing entry remain a {reasonCode, i18nKey, params} triple (per
renderer/js/r3-0c-contracts-bundle.js:175:  function _normCodes(reasonCodes) {
renderer/js/r3-0c-contracts-bundle.js:176:    var arr = Array.isArray(reasonCodes) ? reasonCodes : (reasonCodes == null ? [] : [reasonCodes]);
renderer/js/r3-0c-contracts-bundle.js:182:  function buildBlockedResult(reasonCodes, opts) {
renderer/js/r3-0c-contracts-bundle.js:184:    var codes = _normCodes(reasonCodes);
renderer/js/r3-0c-contracts-bundle.js:188:      reasonCodes: Object.freeze(codes.slice()),
renderer/js/r3-0c-contracts-bundle.js:245:   * metadata. Returns { valid:boolean, reasonCodes:[...] }. It NEVER fabricates or upgrades credibility:
renderer/js/r3-0c-contracts-bundle.js:252:    if (!_isPlain(meta)) return { valid: false, reasonCodes: [CODES.INSUFFICIENT_CREDIBILITY_METADATA] };
renderer/js/r3-0c-contracts-bundle.js:267:    return { valid: out.length === 0, reasonCodes: out };
renderer/js/r3-0c-contracts-bundle.js:276:    if (!v.valid) return RC.buildBlockedResult(v.reasonCodes);
renderer/js/r3-0c-contracts-bundle.js:343:   * { eligible:true, status:'lap_authority_complete', evaluation:'contract_structural', reasonCodes:[] }.
renderer/js/r3-0c-contracts-bundle.js:362:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:474:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:487:      var merged = [].concat(rv.eligible ? [] : rv.reasonCodes, cv.eligible ? [] : cv.reasonCodes);
renderer/js/r3-0c-contracts-bundle.js:496:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:587:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:668:  // Renderer maps i18nKey to a fixed frozen-table wording — the source never authors UI prose.
renderer/js/r3-0c-contracts-bundle.js:670:    requiredKeys: Object.freeze(['reasonCode', 'i18nKey']),
renderer/js/r3-0c-contracts-bundle.js:686:    return Object.freeze({ eligible: true, status: 'metric_supported', metric: metricName, reasonCodes: Object.freeze([]), result: null });
renderer/js/r3-0c-contracts-bundle.js:707:   * Returns { valid:true, status:'context_case_binding_valid', reasonCodes:[] }
renderer/js/r3-0c-contracts-bundle.js:743:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:797:      if (!refBind.valid && Array.isArray(refBind.reasonCodes)) refBind.reasonCodes.forEach(function (c) { reasons.push(c); });
renderer/js/r3-0c-contracts-bundle.js:799:      if (!cmpBind.valid && Array.isArray(cmpBind.reasonCodes)) cmpBind.reasonCodes.forEach(function (c) { reasons.push(c); });
renderer/js/r3-0c-contracts-bundle.js:810:    if (!norm.eligible) norm.reasonCodes.forEach(function (c) { reasons.push(c); });
renderer/js/r3-0c-contracts-bundle.js:814:    if (!cred.valid) cred.reasonCodes.forEach(function (c) { reasons.push(c); });
renderer/js/r3-0c-contracts-bundle.js:829:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:1030:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:1147:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:1193:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:1224:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:1431:      reasonCodes: Object.freeze([]),
renderer/js/r3-0c-contracts-bundle.js:1470: * { reasonCode, i18nKey, params? } where reasonCode ∈ contracts/r3.0c/reason-codes.js
renderer/js/r3-0c-contracts-bundle.js:1471: * REASON_CODES AND i18nKey ∈ the frozen registry exported here. The renderer maps i18nKey to a
renderer/js/r3-0c-contracts-bundle.js:1473: * prose; the viewmodel never re-words; the UI calls only t(entry.i18nKey).
renderer/js/r3-0c-contracts-bundle.js:1476: * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
renderer/js/r3-0c-contracts-bundle.js:1493:  // The closed allowlist of framing i18nKeys. Every entry the orchestrator emits MUST use one of
renderer/js/r3-0c-contracts-bundle.js:1535:  // comparison-eligibility contract) AND the i18nKey appears in the registry above.
renderer/js/r3-0c-contracts-bundle.js:1585:   * validateFramingEntry(entry) — structural + registry gate.
renderer/js/r3-0c-contracts-bundle.js:1586:   *   • entry must be a plain object owning ONLY {reasonCode, i18nKey, params?} keys
renderer/js/r3-0c-contracts-bundle.js:1587:   *   • reasonCode ∈ REASON_CODES
renderer/js/r3-0c-contracts-bundle.js:1588:   *   • i18nKey ∈ FRAMING_I18N_KEY_REGISTRY
renderer/js/r3-0c-contracts-bundle.js:1592:   * Returns { valid:true } or { valid:false, reasonCode, detail }.
renderer/js/r3-0c-contracts-bundle.js:1594:  function validateFramingEntry(entry) {
renderer/js/r3-0c-contracts-bundle.js:1596:      if (!_isPlain(entry)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry not a plain object' };
renderer/js/r3-0c-contracts-bundle.js:1600:      if (keys === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry own-key enumeration threw (Proxy)' };
renderer/js/r3-0c-contracts-bundle.js:1601:      var ALLOWED = { reasonCode: true, i18nKey: true, params: true };
renderer/js/r3-0c-contracts-bundle.js:1604:        if (typeof key !== 'string') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has non-string (e.g. Symbol) own-key' };
renderer/js/r3-0c-contracts-bundle.js:1605:        if (!ALLOWED[key]) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has unknown key: ' + String(key).slice(0, 60) };
renderer/js/r3-0c-contracts-bundle.js:1611:      var rcRead = _readOwn(entry, 'reasonCode');
renderer/js/r3-0c-contracts-bundle.js:1612:      if (rcRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: rcRead.state === 'THREW' ? 'framing reasonCode is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing reasonCode missing' };
renderer/js/r3-0c-contracts-bundle.js:1613:      if (!RC.isReasonCode(rcRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing reasonCode unregistered' };
renderer/js/r3-0c-contracts-bundle.js:1614:      var keyRead = _readOwn(entry, 'i18nKey');
renderer/js/r3-0c-contracts-bundle.js:1615:      if (keyRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: keyRead.state === 'THREW' ? 'framing i18nKey is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing i18nKey missing' };
renderer/js/r3-0c-contracts-bundle.js:1616:      if (!isRegisteredFramingI18nKey(keyRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing i18nKey not in registry' };
renderer/js/r3-0c-contracts-bundle.js:1618:      if (paramsRead.state === 'THREW') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params is accessor descriptor or descriptor lookup threw — fail-closed' };
renderer/js/r3-0c-contracts-bundle.js:1629:        if (!_isPlain(paramsRaw)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params not a plain object' };
renderer/js/r3-0c-contracts-bundle.js:1631:        if (pks === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params own-key enumeration threw (Proxy)' };
renderer/js/r3-0c-contracts-bundle.js:1635:          if (typeof k !== 'string' || k.length === 0) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has empty / non-string (e.g. Symbol) key' };
renderer/js/r3-0c-contracts-bundle.js:1639:          if (inner.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: inner.state === 'THREW' ? 'framing params value is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing params value missing for own key' };
renderer/js/r3-0c-contracts-bundle.js:1642:          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; sanitizedParams[k] = v; continue; }
renderer/js/r3-0c-contracts-bundle.js:1643:          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; sanitizedParams[k] = v; continue; }
renderer/js/r3-0c-contracts-bundle.js:1644:          return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has unsupported value type' };
renderer/js/r3-0c-contracts-bundle.js:1649:        ? Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value, params: sanitizedParams })
renderer/js/r3-0c-contracts-bundle.js:1650:        : Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value });
renderer/js/r3-0c-contracts-bundle.js:1655:      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing validation threw — fail-closed' };
renderer/js/r3-0c-contracts-bundle.js:1665:    return Object.freeze({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
renderer/js/r3-0c-contracts-bundle.js:1672:    validateFramingEntry: validateFramingEntry,
renderer/js/r3-0c-contracts-bundle.js:1770:      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'generationToken not a positive integer' };
renderer/js/r3-0c-contracts-bundle.js:1773:      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'generationToken not monotonically increasing' };
renderer/js/r3-0c-contracts-bundle.js:1849:    reasonCodes: RC,
renderer/js/r3-0c-corner-pairing.js:31:  var RC = Contracts.reasonCodes;
renderer/js/r3-0c-corner-pairing.js:49:      reasonCodes: br.reasonCodes,
renderer/js/r3-0c-corner-pairing.js:73:   *     identity, trackIdentity, evidence, reasonCodes:[], result:null }
renderer/js/r3-0c-corner-pairing.js:88:    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);
renderer/js/r3-0c-corner-pairing.js:176:      reasonCodes: Object.freeze([]),
renderer/js/i18n-comparisons.js:5: * the closed wording table the renderer maps every framing.i18nKey to. The orchestrator emits
renderer/js/i18n-comparisons.js:6: * structured { reasonCode, i18nKey, params? } entries (validated against
renderer/js/r3-0c-comparison-adapter.js:108:  function reasonCodes() { return Contracts.reasonCodes.REASON_CODES; }
renderer/js/r3-0c-comparison-adapter.js:109:  function allReasonCodes() { return Contracts.reasonCodes.ALL_REASON_CODES; }
renderer/js/r3-0c-comparison-adapter.js:270:    reasonCodes: reasonCodes,

exec
/bin/bash -lc "nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '1,430p'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
     1	/**
     2	 * renderer/js/r3-0c-comparison-orchestrator.js — R3.0C C7 · Comparison Orchestrator service.
     3	 *
     4	 * Per SKYLINE Continuous Delivery Master Directive §七 C7: the orchestrator owns request-token
     5	 * issuance + framing emission. It composes the C5 delta-metrics service, the C6 export service,
     6	 * and the comparison-eligibility contract into a single synchronous run() call that the viewmodel
     7	 * invokes per user-confirmed comparison request.
     8	 *
     9	 * The orchestrator is PURE — no DOM access, no Alpine binding, no global mutation beyond its own
    10	 * monotonic token counter. It returns one of:
    11	 *   - { status:'eligible', result:<C5 result>, framing:{...}, exportGate:bool, generationToken }
    12	 *   - { status:'blocked', reasonCodes:[...], limitations:[...], framing:{...}, generationToken }
    13	 *   - { status:'unavailable', reasonCodes:[...], framing:{...}, generationToken }
    14	 *
    15	 * Framing entries are validated against contracts/r3.0c/framing-i18n-key-registry.js BEFORE
    16	 * emission; any orchestrator attempt to emit an unregistered i18nKey or free-form prose
    17	 * fails-closed with INTERNAL_CONTRACT_VIOLATION.
    18	 *
    19	 * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
    20	 * snapshot; when disabled, the orchestrator does NOT request entry/mid/exit_delta from the C5
    21	 * service AND records PHASE_BOUNDARY_CONTRACT_UNAUTHORISED in limitations so the viewmodel /
    22	 * UI can render the phase cards as unavailable.
    23	 *
    24	 * Authority discipline:
    25	 *   - validateComparisonContextAgainstCase MUST pass (caseRecord ↔ context binding).
    26	 *   - evaluateComparisonEligibility MUST pass (track/session/lap identity + position basis +
    27	 *     credibility).
    28	 *   - C5 service authenticity: the orchestrator passes the C5 result through verbatim;
    29	 *     comparison-export-service runs its own authenticity check at export time.
    30	 *
    31	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
    32	 */
    33	(function (root) {
    34	  'use strict';
    35	
    36	  var Contracts = null;
    37	  var DeltaMetricsService = null;
    38	  var ComparisonExportService = null;
    39	  if (typeof module !== 'undefined' && module.exports) {
    40	    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
    41	    try { DeltaMetricsService = require('./r3-0c-delta-metrics.js'); } catch (e) { DeltaMetricsService = null; }
    42	    try { ComparisonExportService = require('./r3-0c-comparison-export.js'); } catch (e) { ComparisonExportService = null; }
    43	  }
    44	  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
    45	  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
    46	  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
    47	  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-orchestrator.js requires contracts/r3.0c/index.js');
    48	
    49	  var RC = Contracts.reasonCodes;
    50	  var CODES = RC.REASON_CODES;
    51	  var CE = Contracts.comparisonEligibility;
    52	  var DMC = Contracts.deltaMetrics;
    53	  var FIR = Contracts.framingI18nKeyRegistry;
    54	  var VST = Contracts.viewmodelStateTransition;
    55	
    56	  var SERVICE_VERSION = 1;
    57	  var CHECKPOINT_FLOOR = 'C7_UI';
    58	  var SIGN_FORMULA = 'comparison_minus_reference';
    59	
    60	  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
    61	  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
    62	  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
    63	
    64	  /**
    65	   * createOrchestrator(deps) — factory. deps may supply alternative service implementations
    66	   * (used by tests). Default to the production module-loaded services.
    67	   *
    68	   * deps = { deltaMetricsService?, exportService?, capabilities, authenticityPredicate }
    69	   *   capabilities — a frozen snapshot of governance/r3.0c/capabilities.json relevant flags:
    70	   *     { phaseBoundaryContractEnabled:bool, viewmodelStateTransitionContractEnabled:bool,
    71	   *       framingSourceStructuredContractEnabled:bool }
    72	   *   authenticityPredicate — REQUIRED. A function (caseRecord) → boolean that returns true ONLY
    73	   *     for case records minted by an authoritative source (R3.0B case-store open boundary). The
    74	   *     orchestrator NEVER exposes a way to add to this authority; the predicate is opaque to the
    75	   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
    76	   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
    77	   *     orchestrator's public API + had the viewmodel auto-register caller-controlled records on
    78	   *     setAssociation — Codex C7-R2-A-01 broke that with a literal-built forged caseRecord
    79	   *     escalating through setAssociation. Predicate injection makes the WeakSet (or whatever
    80	   *     authority the integration uses) renderer-side and viewmodel-inaccessible.
    81	   *
    82	   * The capabilities snapshot is REQUIRED. The orchestrator refuses to run when
    83	   * framingSourceStructuredContractEnabled is false (the C7 contract is gated by capability).
    84	   *
    85	   * Default authenticityPredicate (when not provided) is FAIL-CLOSED (returns false for every
    86	   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
    87	   * call with INTERNAL_CONTRACT_VIOLATION — exactly the property D1 needs to ship a test that
    88	   * proves "forged record routed through setAssociation is refused without registration helpers".
    89	   */
    90	  function createOrchestrator(deps) {
    91	    deps = _isPlain(deps) ? deps : {};
    92	    var dm = deps.deltaMetricsService || DeltaMetricsService;
    93	    var ex = deps.exportService || ComparisonExportService;
    94	    var caps = _isPlain(deps.capabilities) ? deps.capabilities : null;
    95	    if (!caps) throw new Error('createOrchestrator requires capabilities snapshot');
    96	    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
    97	    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
    98	
    99	    // Codex C7-R2-A-01 closure: predicate-based authenticity check. The predicate is invoked once
   100	    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
   101	    var _externalAuthPredicate = typeof deps.authenticityPredicate === 'function' ? deps.authenticityPredicate : null;
   102	    function _isAuthenticCaseRecord(caseRecord) {
   103	      if (!_externalAuthPredicate) return false;
   104	      if (!_isPlain(caseRecord)) return false;
   105	      try { return _externalAuthPredicate(caseRecord) === true; } catch (e) { return false; }
   106	    }
   107	
   108	    var _generationCounter = 0;
   109	    function _nextToken() { _generationCounter = _generationCounter + 1; return _generationCounter; }
   110	    function currentToken() { return _generationCounter; }
   111	
   112	    function _blockedResponse(reasonCodes, detail, framing, token) {
   113	      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
   114	      if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
   115	      return Object.freeze({
   116	        status: 'blocked',
   117	        reasonCodes: Object.freeze(arr.slice()),
   118	        limitations: Object.freeze([]),
   119	        framing: _validateFramingOrFallback(framing),
   120	        exportGate: false,
   121	        detail: detail != null ? String(detail).slice(0, 200) : null,
   122	        generationToken: token,
   123	      });
   124	    }
   125	    function _unavailableResponse(reasonCodes, framing, token) {
   126	      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
   127	      if (arr.length === 0) arr = [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE];
   128	      return Object.freeze({
   129	        status: 'unavailable',
   130	        reasonCodes: Object.freeze(arr.slice()),
   131	        limitations: Object.freeze([]),
   132	        framing: _validateFramingOrFallback(framing),
   133	        exportGate: false,
   134	        generationToken: token,
   135	      });
   136	    }
   137	
   138	    function _validateFramingOrFallback(framing) {
   139	      // Codex C7-R3-C-01 closure: NEVER re-read `framing[k]` / `v.reasonCode` / `v.i18nKey` /
   140	      // `v.params` after validation. A Proxy can return a different value on each access; the
   141	      // validator's `sanitized` snapshot (frozen, built from descriptor-read values only) is the
   142	      // ONLY safe surface to consume downstream. Same TOCTOU applies to cannotDistinguish entries.
   143	      var fallback = FIR.cannotDistinguishFallback();
   144	      var out = {
   145	        observedDelta: fallback,
   146	        likelyDriverBehaviourDifference: fallback,
   147	        possibleVehicleResponseDifference: fallback,
   148	        cannotDistinguish: [],
   149	        nextValidationAction: null,
   150	      };
   151	      if (!_isPlain(framing)) return Object.freeze(out);
   152	      ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
   153	        var v = framing[k];
   154	        if (v === null || v === undefined) return; // keep fallback
   155	        var vr = FIR.validateFramingEntry(v);
   156	        if (vr.valid && vr.sanitized) out[k] = vr.sanitized;
   157	        // else: leave fallback in place (defense in depth — orchestrator emit should have caught)
   158	      });
   159	      if (Array.isArray(framing.cannotDistinguish)) {
   160	        var cd = [];
   161	        for (var i = 0; i < framing.cannotDistinguish.length && i < 64; i++) {
   162	          var e = framing.cannotDistinguish[i];
   163	          var er = FIR.validateFramingEntry(e);
   164	          if (er.valid && er.sanitized) cd.push(er.sanitized);
   165	        }
   166	        out.cannotDistinguish = Object.freeze(cd);
   167	      } else {
   168	        out.cannotDistinguish = Object.freeze([]);
   169	      }
   170	      return Object.freeze(out);
   171	    }
   172	
   173	    /**
   174	     * requestComparison(input) — synchronous orchestrator entry point.
   175	     *
   176	     * input = {
   177	     *   caseRecord, association,                       // F4/F5 binding inputs
   178	     *   referenceLap, comparisonLap,                   // lap identities
   179	     *   credibilityMetadata,                           // credibility ladder + provenance
   180	     *   eligibilityInput,                              // shape for evaluateComparisonEligibility
   181	     *   deltaMetricsRequest,                           // C5 service input (sans phase trio)
   182	     *   framing                                        // OPTIONAL — orchestrator-built framing
   183	     * }
   184	     *
   185	     * Returns one of the response shapes documented at module top.
   186	     */
   187	    function requestComparison(input) {
   188	      var token = _nextToken();
   189	      if (!caps.framingSourceStructuredContractEnabled || !caps.viewmodelStateTransitionContractEnabled) {
   190	        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'framing or viewmodel-state-transition capability disabled', null, token);
   191	      }
   192	      if (!_isPlain(input)) return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'input not a plain object', null, token);
   193	
   194	      // 1. case authenticity (Codex C7-R2-A-01 closure): the caseRecord MUST be vouched for by
   195	      //    the injected authenticityPredicate. A literal-built caseRecord (even one whose
   196	      //    associations consistently match the caller-supplied association + eligibility
   197	      //    identities) fails closed here. The predicate is opaque to the viewmodel — there is no
   198	      //    public API to add anything to it.
   199	      if (!_isAuthenticCaseRecord(input.caseRecord)) {
   200	        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not vouched for by authenticityPredicate — caller-controlled case authority refused', null, token);
   201	      }
   202	
   203	      // 2. case ↔ context binding (F4)
   204	      var bindCheck = CE.validateComparisonContextAgainstCase(input.caseRecord, input.association);
   205	      if (bindCheck && bindCheck.valid !== true) {
   206	        return _blockedResponse(bindCheck.reasonCodes ? bindCheck.reasonCodes.slice() : [CODES.TRACK_IDENTITY_MISMATCH], 'case/context binding failed', null, token);
   207	      }
   208	
   209	      // 2. composite eligibility (F5 identity + lap + credibility)
   210	      var elig = CE.evaluateComparisonEligibility(input.eligibilityInput);
   211	      if (elig.eligible !== true) {
   212	        return _blockedResponse(elig.reasonCodes ? elig.reasonCodes.slice() : [CODES.REFERENCE_LAP_UNAVAILABLE], 'eligibility failed', null, token);
   213	      }
   214	
   215	      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
   216	      var dmReq = _isPlain(input.deltaMetricsRequest) ? Object.assign({}, input.deltaMetricsRequest) : null;
   217	      if (!dmReq) return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'deltaMetricsRequest missing', null, token);
   218	      var requested = Array.isArray(dmReq.requestedMetrics) ? dmReq.requestedMetrics.slice() : [];
   219	      var phaseMetricRequested = false;
   220	      if (!caps.phaseBoundaryContractEnabled) {
   221	        var phaseSet = DMC.PHASE_SCOPE_METRICS;
   222	        var filtered = requested.filter(function (m) {
   223	          if (phaseSet.indexOf(m) !== -1) { phaseMetricRequested = true; return false; }
   224	          return true;
   225	        });
   226	        dmReq.requestedMetrics = filtered;
   227	        if (dmReq.policy && _isPlain(dmReq.policy)) {
   228	          var pol = Object.assign({}, dmReq.policy);
   229	          delete pol.phaseBoundaryAuthorisation;
   230	          dmReq.policy = pol;
   231	        }
   232	      } else {
   233	        dmReq.requestedMetrics = requested;
   234	      }
   235	      if (!dmReq.requestedMetrics.length) {
   236	        return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'no requested metrics after phase gate', null, token);
   237	      }
   238	
   239	      var dmResult = dm.computeDeltaMetrics(dmReq);
   240	      if (dmResult.eligible !== true) {
   241	        return _blockedResponse(dmResult.reasonCodes ? dmResult.reasonCodes.slice() : [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE], 'delta-metrics blocked', null, token);
   242	      }
   243	
   244	      // 4. exportGate predicate: an eligible result + non-stale identity + association match
   245	      //    is the precondition for the UI's export button. The viewmodel re-checks at click.
   246	      var exportGate = !!(dmResult && dmResult.eligible && _isPlain(dmResult.identity) && dmResult.identity.caseId === input.association.caseId && dmResult.identity.sessionId === input.association.sessionId);
   247	
   248	      // 5. orchestrator-emitted framing. We DERIVE these from the result (NOT free-form prose):
   249	      var framing = _buildFraming(dmResult, phaseMetricRequested, input.framing);
   250	
   251	      return Object.freeze({
   252	        status: 'eligible',
   253	        result: dmResult,
   254	        framing: framing,
   255	        exportGate: exportGate,
   256	        generationToken: token,
   257	        limitations: Object.freeze(phaseMetricRequested ? [CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED] : []),
   258	      });
   259	    }
   260	
   261	    function _buildFraming(dmResult, phaseMetricRequested, callerFraming) {
   262	      // The orchestrator deterministically maps the C5 result + flags into framing entries from
   263	      // FRAMING_I18N_KEY_REGISTRY. Caller may NOT supply free-form prose — when callerFraming is
   264	      // present we use _validateFramingOrFallback which rejects unregistered i18nKeys.
   265	      var observed = null;
   266	      var lapTimeMetric = dmResult.metrics && dmResult.metrics.lap_time;
   267	      if (lapTimeMetric && _isFiniteNum(lapTimeMetric.value)) {
   268	        if (lapTimeMetric.value < 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: lapTimeMetric.value } };
   269	        else if (lapTimeMetric.value > 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.slower_overall', params: { ms: lapTimeMetric.value } };
   270	        else observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.identical_lap' };
   271	      }
   272	      var cannotDistinguish = [];
   273	      if (phaseMetricRequested) cannotDistinguish.push({ reasonCode: CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED, i18nKey: 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised' });
   274	      var built = {
   275	        observedDelta: observed,
   276	        likelyDriverBehaviourDifference: null,
   277	        possibleVehicleResponseDifference: null,
   278	        cannotDistinguish: cannotDistinguish,
   279	        nextValidationAction: null,
   280	      };
   281	      if (_isPlain(callerFraming)) {
   282	        // Codex C7-R3-C-01 closure: assign vr.sanitized, NOT the raw `v`. The TOCTOU bypass via
   283	        // Proxy.getOwnPropertyDescriptor lying about descriptors would otherwise let an accepted
   284	        // entry yield different values on later access.
   285	        ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
   286	          var v = callerFraming[k];
   287	          if (!v) return;
   288	          var vr = FIR.validateFramingEntry(v);
   289	          if (vr.valid && vr.sanitized) built[k] = vr.sanitized;
   290	        });
   291	        if (Array.isArray(callerFraming.cannotDistinguish)) {
   292	          callerFraming.cannotDistinguish.forEach(function (e) {
   293	            if (!e) return;
   294	            var er = FIR.validateFramingEntry(e);
   295	            if (er.valid && er.sanitized && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(er.sanitized);
   296	          });
   297	        }
   298	      }
   299	      return _validateFramingOrFallback(built);
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
   346	    SIGN_FORMULA: SIGN_FORMULA,
   347	    createOrchestrator: createOrchestrator,
   348	  };
   349	  if (typeof module !== 'undefined' && module.exports) module.exports = api;
   350	  if (root) root.R3_0C_ComparisonOrchestrator = api;
   351	})(typeof globalThis !== 'undefined' ? globalThis : this);

exec
/bin/bash -lc "nl -ba contracts/r3.0c/framing-i18n-key-registry.js | sed -n '1,280p'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
     1	/**
     2	 * contracts/r3.0c/framing-i18n-key-registry.js — R3.0C C7 · Framing-source contract registry.
     3	 *
     4	 * Per SKYLINE Continuous Delivery Master Directive §七 C7 + docs/r3.0c-framing-source-contract.md:
     5	 * every framing entry the C7 orchestrator emits MUST be a plain object
     6	 * { reasonCode, i18nKey, params? } where reasonCode ∈ contracts/r3.0c/reason-codes.js
     7	 * REASON_CODES AND i18nKey ∈ the frozen registry exported here. The renderer maps i18nKey to a
     8	 * fixed wording table in renderer/js/i18n-comparisons.js — the orchestrator never authors UI
     9	 * prose; the viewmodel never re-words; the UI calls only t(entry.i18nKey).
    10	 *
    11	 * The registry is a CLOSED ALLOWLIST. Anything outside fails closed at orchestrator emit time
    12	 * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
    13	 *
    14	 * Capability gate: governance/r3.0c/capabilities.json framing_source_structured_contract.enabled
    15	 * must be true for any orchestrator code path that emits framing entries. Until then this module
    16	 * is loaded (so tests can pin the registry) but no production caller invokes the emitter.
    17	 *
    18	 * UMD: Node require / Electron renderer global (R3_0C_FramingI18nKeyRegistry).
    19	 */
    20	(function (root) {
    21	  'use strict';
    22	
    23	  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
    24	  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
    25	  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
    26	  if (!RC || !CE) throw new Error('framing-i18n-key-registry.js requires reason-codes.js + comparison-eligibility-contract.js');
    27	  var CODES = RC.REASON_CODES;
    28	
    29	  // The closed allowlist of framing i18nKeys. Every entry the orchestrator emits MUST use one of
    30	  // these keys. The keys are stable string constants — renderer maps them to en/zh/ja wording.
    31	  // Keys are organised by framing field (observed_delta / likely_driver_behaviour_difference /
    32	  // possible_vehicle_response_difference / cannot_distinguish_reasons). A new framing entry
    33	  // requires adding both the key here AND the en/zh/ja wording in renderer/js/i18n-comparisons.js
    34	  // (the i18n-parity test fails closed on either gap).
    35	  var FRAMING_I18N_KEY_REGISTRY = Object.freeze([
    36	    // observed_delta (the comparison produced a finite cumulative or per-corner delta)
    37	    'r3_0c.framing.observed_delta.cumulative',
    38	    'r3_0c.framing.observed_delta.per_corner',
    39	    'r3_0c.framing.observed_delta.faster_overall',
    40	    'r3_0c.framing.observed_delta.slower_overall',
    41	    'r3_0c.framing.observed_delta.identical_lap',
    42	
    43	    // likely_driver_behaviour_difference (positionally aligned with confirmed driver input channel)
    44	    'r3_0c.framing.likely_driver_behaviour_difference.brake_onset',
    45	    'r3_0c.framing.likely_driver_behaviour_difference.throttle_application',
    46	    'r3_0c.framing.likely_driver_behaviour_difference.steering_correction',
    47	    'r3_0c.framing.likely_driver_behaviour_difference.none_detected',
    48	
    49	    // possible_vehicle_response_difference (positionally aligned with vehicle-response channel,
    50	    // NOT explainable by aligned driver input)
    51	    'r3_0c.framing.possible_vehicle_response_difference.lat_accel',
    52	    'r3_0c.framing.possible_vehicle_response_difference.yaw_rate',
    53	    'r3_0c.framing.possible_vehicle_response_difference.exit_speed',
    54	    'r3_0c.framing.possible_vehicle_response_difference.none_detected',
    55	
    56	    // cannot_distinguish_reasons (always emitted even when empty — array of entries)
    57	    'r3_0c.framing.cannot_distinguish',
    58	    'r3_0c.framing.cannot_distinguish.insufficient_channel_coverage',
    59	    'r3_0c.framing.cannot_distinguish.confounded_by_driver_input',
    60	    'r3_0c.framing.cannot_distinguish.confounded_by_calibration_drift',
    61	    'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised',
    62	
    63	    // nextValidationAction (single entry per result; viewmodel renders as a single CTA)
    64	    'r3_0c.framing.next_validation.confirm_channel_mapping',
    65	    'r3_0c.framing.next_validation.confirm_track_identity',
    66	    'r3_0c.framing.next_validation.select_different_reference',
    67	    'r3_0c.framing.next_validation.repeat_lap_under_controlled_conditions',
    68	  ]);
    69	
    70	  // Bound a structurally valid framing-entry per FRAMING_KEY_SHAPE (already exposed on the
    71	  // comparison-eligibility contract) AND the i18nKey appears in the registry above.
    72	  // Adversarial: per-string UTF-8 byte cap of 256 on every param value (mirrors the F12 contract).
    73	  var MAX_PARAM_STRING_BYTES = 256;
    74	
    75	  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
    76	  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
    77	  function _safeOwnKeys(o) { try { return Reflect && typeof Reflect.ownKeys === 'function' ? Reflect.ownKeys(o) : Object.keys(o); } catch (e) { return null; } }
    78	
    79	  // Codex C7-R2-C-01 closure: tri-state own-property read. Distinguishes ABSENT (no own key) from
    80	  // VALUE (own data descriptor) from THREW (Proxy/accessor/descriptor lookup throws OR descriptor
    81	  // is an accessor descriptor — accessors violate the plain-object framing contract regardless of
    82	  // whether they happen to throw on this particular read). Callers MUST treat THREW as
    83	  // fail-closed; the previous _safeGet swallowed throws into `undefined` which was laundered as
    84	  // "optional field absent" further down.
    85	  var READ_ABSENT = Object.freeze({ state: 'ABSENT' });
    86	  var READ_THREW = Object.freeze({ state: 'THREW' });
    87	  function _readOwn(o, k) {
    88	    var desc;
    89	    try { desc = Object.getOwnPropertyDescriptor(o, k); }
    90	    catch (e) { return READ_THREW; }
    91	    if (!desc) return READ_ABSENT;
    92	    // accessor descriptor (get/set) — reject. Even a getter that returns a benign value can have
    93	    // side effects, can throw on any future read, can return different values on each call. The
    94	    // framing contract requires plain data; accessors are out of band.
    95	    if (typeof desc.get === 'function' || typeof desc.set === 'function') return READ_THREW;
    96	    // data descriptor — value already resolved, no observable side-effect read needed.
    97	    return { state: 'VALUE', value: desc.value };
    98	  }
    99	  function _utf8ByteLength(s) {
   100	    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
   101	    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
   102	    var n = 0;
   103	    for (var i = 0; i < s.length; i++) {
   104	      var c = s.charCodeAt(i);
   105	      if (c < 0x80) n += 1;
   106	      else if (c < 0x800) n += 2;
   107	      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
   108	      else n += 3;
   109	    }
   110	    return n;
   111	  }
   112	
   113	  /**
   114	   * isRegisteredFramingI18nKey(key) — closed allowlist check. Anything outside fails.
   115	   */
   116	  function isRegisteredFramingI18nKey(key) {
   117	    return typeof key === 'string' && FRAMING_I18N_KEY_REGISTRY.indexOf(key) !== -1;
   118	  }
   119	
   120	  /**
   121	   * validateFramingEntry(entry) — structural + registry gate.
   122	   *   • entry must be a plain object owning ONLY {reasonCode, i18nKey, params?} keys
   123	   *   • reasonCode ∈ REASON_CODES
   124	   *   • i18nKey ∈ FRAMING_I18N_KEY_REGISTRY
   125	   *   • params, when present, plain object whose values are finite numbers / booleans / null /
   126	   *     strings ≤ MAX_PARAM_STRING_BYTES. No arrays / exotic objects / functions / symbols.
   127	   *
   128	   * Returns { valid:true } or { valid:false, reasonCode, detail }.
   129	   */
   130	  function validateFramingEntry(entry) {
   131	    try {
   132	      if (!_isPlain(entry)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry not a plain object' };
   133	      // Codex C7 finding C7-F1 closure: use Reflect.ownKeys so non-enumerable + Symbol-keyed extras
   134	      // are detected. Object.keys missed both.
   135	      var keys = _safeOwnKeys(entry);
   136	      if (keys === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry own-key enumeration threw (Proxy)' };
   137	      var ALLOWED = { reasonCode: true, i18nKey: true, params: true };
   138	      for (var i = 0; i < keys.length; i++) {
   139	        var key = keys[i];
   140	        if (typeof key !== 'string') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has non-string (e.g. Symbol) own-key' };
   141	        if (!ALLOWED[key]) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has unknown key: ' + String(key).slice(0, 60) };
   142	      }
   143	      // Codex C7-R2-C-01 closure: tri-state read on every own property. THREW = accessor descriptor
   144	      // OR descriptor lookup throws — both fail-closed. The previous _safeGet swallowed throws and
   145	      // returned undefined, which the params branch below treated as "optional field absent" — an
   146	      // input with `Object.defineProperty(entry, 'params', { get(){throw} })` slipped through.
   147	      var rcRead = _readOwn(entry, 'reasonCode');
   148	      if (rcRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: rcRead.state === 'THREW' ? 'framing reasonCode is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing reasonCode missing' };
   149	      if (!RC.isReasonCode(rcRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing reasonCode unregistered' };
   150	      var keyRead = _readOwn(entry, 'i18nKey');
   151	      if (keyRead.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: keyRead.state === 'THREW' ? 'framing i18nKey is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing i18nKey missing' };
   152	      if (!isRegisteredFramingI18nKey(keyRead.value)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing i18nKey not in registry' };
   153	      var paramsRead = _readOwn(entry, 'params');
   154	      if (paramsRead.state === 'THREW') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params is accessor descriptor or descriptor lookup threw — fail-closed' };
   155	      // Codex C7-R3-C-01 closure: build a sanitized canonical snapshot from the validated
   156	      // descriptor values, not the original entry. A Proxy can lie via getOwnPropertyDescriptor
   157	      // (returning a benign data descriptor while the real get-trap throws or mutates); after
   158	      // validation accepted that lie, any downstream re-read via plain `v.foo` would see the
   159	      // accessor side again. The orchestrator MUST consume the sanitized snapshot — never the
   160	      // raw entry — for the validation result to be honoured. The snapshot is frozen so callers
   161	      // cannot mutate it back into an unsafe shape post-validation.
   162	      var sanitizedParams;
   163	      if (paramsRead.state === 'VALUE' && paramsRead.value !== undefined) {
   164	        var paramsRaw = paramsRead.value;
   165	        if (!_isPlain(paramsRaw)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params not a plain object' };
   166	        var pks = _safeOwnKeys(paramsRaw);
   167	        if (pks === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params own-key enumeration threw (Proxy)' };
   168	        sanitizedParams = {};
   169	        for (var j = 0; j < pks.length; j++) {
   170	          var k = pks[j];
   171	          if (typeof k !== 'string' || k.length === 0) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has empty / non-string (e.g. Symbol) key' };
   172	          // Inner-level tri-state read so a param-value accessor / Proxy is also rejected, not
   173	          // laundered via plain o[k] access.
   174	          var inner = _readOwn(paramsRaw, k);
   175	          if (inner.state !== 'VALUE') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: inner.state === 'THREW' ? 'framing params value is accessor descriptor or descriptor lookup threw — fail-closed' : 'framing params value missing for own key' };
   176	          var v = inner.value;
   177	          if (v === null || typeof v === 'boolean') { sanitizedParams[k] = v; continue; }
   178	          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; sanitizedParams[k] = v; continue; }
   179	          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; sanitizedParams[k] = v; continue; }
   180	          return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has unsupported value type' };
   181	        }
   182	        sanitizedParams = Object.freeze(sanitizedParams);
   183	      }
   184	      var sanitized = sanitizedParams !== undefined
   185	        ? Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value, params: sanitizedParams })
   186	        : Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value });
   187	      return { valid: true, sanitized: sanitized };
   188	    } catch (e) {
   189	      // Codex C7 finding C7-B1 closure: any throw from a Proxy / accessor / inherited trap
   190	      // results in fail-closed at this top-level boundary.
   191	      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing validation threw — fail-closed' };
   192	    }
   193	  }
   194	
   195	  /**
   196	   * cannotDistinguishFallback() — the canonical fallback framing entry the orchestrator emits
   197	   * when a field cannot be populated. Matches docs/r3.0c-framing-source-contract.md rule
   198	   * (params OMITTED — not null — to satisfy FRAMING_KEY_SHAPE optional-key discipline).
   199	   */
   200	  function cannotDistinguishFallback() {
   201	    return Object.freeze({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
   202	  }
   203	
   204	  var api = {
   205	    FRAMING_I18N_KEY_REGISTRY: FRAMING_I18N_KEY_REGISTRY,
   206	    MAX_PARAM_STRING_BYTES: MAX_PARAM_STRING_BYTES,
   207	    isRegisteredFramingI18nKey: isRegisteredFramingI18nKey,
   208	    validateFramingEntry: validateFramingEntry,
   209	    cannotDistinguishFallback: cannotDistinguishFallback,
   210	  };
   211	  if (typeof module !== 'undefined' && module.exports) module.exports = api;
   212	  if (root) root.R3_0C_FramingI18nKeyRegistry = api;
   213	})(typeof globalThis !== 'undefined' ? globalThis : this);

exec
/bin/bash -lc 'tail -n 160 governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
   365	  chk('N2 metricAvailability.mid_delta = false (phase gate)', s.metricAvailability.mid_delta === false);
   366	  chk('N3 metricAvailability.exit_delta = false (phase gate)', s.metricAvailability.exit_delta === false);
   367	})();
   368	
   369	console.log('r3-0c-comparison-workspace: ' + pass + ' passed, ' + fail + ' failed');
   370	if (fail) process.exit(1);
    45	//    (which uses module.exports) is NOT what's tested — we want the BROWSER path. We simulate
    46	//    that by evaluating the bundle in a context where `module` is undefined.
    47	const vm = require('vm');
    48	const sandbox = { console, Buffer };
    49	sandbox.globalThis = sandbox;
    50	sandbox.Reflect = Reflect;
    51	sandbox.Object = Object;
    52	sandbox.Array = Array;
    53	sandbox.Number = Number;
    54	sandbox.Math = Math;
    55	sandbox.JSON = JSON;
    56	sandbox.String = String;
    57	sandbox.Symbol = Symbol;
    58	sandbox.Error = Error;
    59	sandbox.WeakSet = WeakSet;
    60	sandbox.Set = Set;
    61	sandbox.TextEncoder = TextEncoder;
    62	vm.createContext(sandbox);
    63	let evalErr = null;
    64	try { vm.runInContext(expected, sandbox); } catch (e) { evalErr = e; }
    65	chk('D1 bundle evaluates cleanly in a browser-like sandbox (no module/exports)', evalErr === null, evalErr && String(evalErr));
    66	chk('D2 R3_0C_ReasonCodes global registered', typeof sandbox.R3_0C_ReasonCodes === 'object' && sandbox.R3_0C_ReasonCodes !== null);
    67	chk('D3 R3_0C_FramingI18nKeyRegistry global registered', typeof sandbox.R3_0C_FramingI18nKeyRegistry === 'object' && sandbox.R3_0C_FramingI18nKeyRegistry !== null);
    68	chk('D4 R3_0C_ViewmodelStateTransitionContract global registered', typeof sandbox.R3_0C_ViewmodelStateTransitionContract === 'object' && sandbox.R3_0C_ViewmodelStateTransitionContract !== null);
    69	chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
    70	chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
    71	chk('D7 ALL_REASON_CODES.length === 66', sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length === 66, sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length);
    72	
    73	// E. Bundle header carries the auto-generated banner so a human editing the file is warned.
    74	chk('E1 bundle starts with AUTO-GENERATED banner', /^\/\/ AUTO-GENERATED by scripts\/build-r3-0c-contracts-bundle\.js/.test(expected));
    75	chk('E2 bundle names the C7-R2-B-01 closure context', expected.indexOf('C7-R2-B-01 closure') !== -1);
    76	
    77	console.log('r3-0c-contracts-bundle-equivalence: ' + pass + ' passed, ' + fail + ' failed');
    78	if (fail) process.exit(1);

codex
C7-R3-C-01  
SEVERITY: BLOCKER  
FILE: [framing-i18n-key-registry.js:87](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/contracts/r3.0c/framing-i18n-key-registry.js:87), [r3-0c-comparison-orchestrator.js:151](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-orchestrator.js:151)

ATTACK STEPS:

```js
const target = {
  reasonCode: CODES.CANNOT_DISTINGUISH,
  i18nKey: 'r3_0c.framing.cannot_distinguish'
};

Object.defineProperty(target, 'params', {
  configurable: true,
  enumerable: true,
  get() { throw new Error('ACCESSOR EXECUTED'); }
});

const attack = new Proxy(target, {
  getOwnPropertyDescriptor(t, key) {
    if (key === 'params') {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: undefined
      };
    }
    return Reflect.getOwnPropertyDescriptor(t, key);
  }
});

validateFramingEntry(attack); // { valid: true }
attack.params;                // throws "ACCESSOR EXECUTED"
```

The reproduced validator result was `{ valid: true }`.

WHY current code fails to block it:

`_readOwn()` trusts the proxy-controlled descriptor. After validation, `_validateFramingOrFallback()` rereads `v.reasonCode`, `v.i18nKey`, and `v.params` directly. This is a descriptor-validation/use TOCTOU: an accepted proxy can execute accessors, throw, or return values different from those validated. The same unsafe reread exists for `cannotDistinguish` entries at line 160.

WHAT minimal fix would close it:

Return a canonical, frozen snapshot from validation—constructed exclusively from the validated descriptor values—and make the orchestrator consume that snapshot without rereading the untrusted object. Add this exact proxy/accessor attack to the tests for both top-level fields and inner parameter values.

Other evidence:

- Reviewed HEAD is exactly `ae039008addad384e27c66fb6bd524ab512666ff`.
- Focused workspace tests: 82 passed.
- Browser bundle equivalence tests: 17 passed.
- Bundle order, browser UMD evaluation, structured initialization failure, D1 public API removal, fail-closed predicate behavior, phase gating, governance values, frozen boundaries, and preset count were otherwise consistent.
- Full `npm test` could not complete because the read-only environment forbids `mkdtemp`; execution reached the R3.0C foundation suite before failing with `EPERM`, not an assertion failure.

This leaves Round-2 C closure partial.

VERDICT: BLOCK
tokens used
137,421
C7-R3-C-01  
SEVERITY: BLOCKER  
FILE: [framing-i18n-key-registry.js:87](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/contracts/r3.0c/framing-i18n-key-registry.js:87), [r3-0c-comparison-orchestrator.js:151](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-orchestrator.js:151)

ATTACK STEPS:

```js
const target = {
  reasonCode: CODES.CANNOT_DISTINGUISH,
  i18nKey: 'r3_0c.framing.cannot_distinguish'
};

Object.defineProperty(target, 'params', {
  configurable: true,
  enumerable: true,
  get() { throw new Error('ACCESSOR EXECUTED'); }
});

const attack = new Proxy(target, {
  getOwnPropertyDescriptor(t, key) {
    if (key === 'params') {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: undefined
      };
    }
    return Reflect.getOwnPropertyDescriptor(t, key);
  }
});

validateFramingEntry(attack); // { valid: true }
attack.params;                // throws "ACCESSOR EXECUTED"
```

The reproduced validator result was `{ valid: true }`.

WHY current code fails to block it:

`_readOwn()` trusts the proxy-controlled descriptor. After validation, `_validateFramingOrFallback()` rereads `v.reasonCode`, `v.i18nKey`, and `v.params` directly. This is a descriptor-validation/use TOCTOU: an accepted proxy can execute accessors, throw, or return values different from those validated. The same unsafe reread exists for `cannotDistinguish` entries at line 160.

WHAT minimal fix would close it:

Return a canonical, frozen snapshot from validation—constructed exclusively from the validated descriptor values—and make the orchestrator consume that snapshot without rereading the untrusted object. Add this exact proxy/accessor attack to the tests for both top-level fields and inner parameter values.

Other evidence:

- Reviewed HEAD is exactly `ae039008addad384e27c66fb6bd524ab512666ff`.
- Focused workspace tests: 82 passed.
- Browser bundle equivalence tests: 17 passed.
- Bundle order, browser UMD evaluation, structured initialization failure, D1 public API removal, fail-closed predicate behavior, phase gating, governance values, frozen boundaries, and preset count were otherwise consistent.
- Full `npm test` could not complete because the read-only environment forbids `mkdtemp`; execution reached the R3.0C foundation suite before failing with `EPERM`, not an assertion failure.

This leaves Round-2 C closure partial.

VERDICT: BLOCK
---- END codex exec ----
utcEndedAt: 2026-06-28T03:24:24Z

exec
/bin/bash -lc "sed -n '1,520p' tests/r3-0c-comparison-workspace.test.js; sed -n '1,180p' tests/r3-0c-contracts-bundle-equivalence.test.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
/**
 * tests/r3-0c-comparison-workspace.test.js — R3.0C C7 Comparison Workspace tests.
 *
 * Covers:
 *   - framing-i18n-key-registry contract (closed allowlist + validateFramingEntry adversarial)
 *   - viewmodel-state-transition contract (closed-allowlist triggers + token discipline)
 *   - orchestrator service (capability gate + token monotonicity + framing enforcement + phase
 *     gate + case binding + export gate)
 *   - viewmodel service (7 transition triggers clear+placeholder, stale-token drop,
 *     latest-token commit, phase metricAvailability forced false)
 *   - adversarial: free-form prose injection, unregistered i18nKey, oversized strings, nested
 *     array params, Date in params, Proxy in params, oversized cannotDistinguish array,
 *     phase metric request without capability, cross-case + cross-session refusal,
 *     stale token after fresh dropped
 */
'use strict';
const Contracts = require('../contracts/r3.0c/index.js');
const FIR = Contracts.framingI18nKeyRegistry;
const VST = Contracts.viewmodelStateTransition;
const CODES = Contracts.reasonCodes.REASON_CODES;
const CE = Contracts.comparisonEligibility;
const DMC = Contracts.deltaMetrics;
const OrchService = require('../renderer/js/r3-0c-comparison-orchestrator.js');
const VMService = require('../renderer/js/r3-0c-comparison-viewmodel.js');
const DeltaMetricsService = require('../renderer/js/r3-0c-delta-metrics.js');
const ExportService = require('../renderer/js/r3-0c-comparison-export.js');

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (r, c) => !!(r && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(c) !== -1);

const allCapsOn = { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: true };
const capsWithPhase = Object.assign({}, allCapsOn, { phaseBoundaryContractEnabled: true });

// ─────────────────────────────────────────────────────────────────────────────
// A. Framing i18n key registry
chk('A1 FRAMING_I18N_KEY_REGISTRY frozen + non-empty', Object.isFrozen(FIR.FRAMING_I18N_KEY_REGISTRY) && FIR.FRAMING_I18N_KEY_REGISTRY.length > 0);
chk('A2 includes cannot_distinguish base key', FIR.FRAMING_I18N_KEY_REGISTRY.indexOf('r3_0c.framing.cannot_distinguish') !== -1);
chk('A3 includes observed_delta.faster_overall', FIR.FRAMING_I18N_KEY_REGISTRY.indexOf('r3_0c.framing.observed_delta.faster_overall') !== -1);
chk('A4 isRegisteredFramingI18nKey accepts registered', FIR.isRegisteredFramingI18nKey('r3_0c.framing.cannot_distinguish') === true);
chk('A5 isRegisteredFramingI18nKey rejects unregistered', FIR.isRegisteredFramingI18nKey('r3_0c.framing.totally_made_up') === false);
chk('A6 isRegisteredFramingI18nKey rejects non-string', FIR.isRegisteredFramingI18nKey(42) === false);
chk('A7 cannotDistinguishFallback returns valid entry', FIR.validateFramingEntry(FIR.cannotDistinguishFallback()).valid === true);

// B. validateFramingEntry adversarial
(() => {
  // valid: minimal
  const ok1 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
  chk('B1 minimal valid', ok1.valid === true);
  // valid: with params
  const ok2 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123, channel: 'speed', flag: true, none: null } });
  chk('B2 with valid params', ok2.valid === true);
  // invalid: unknown reasonCode
  chk('B3 unknown reasonCode → invalid', FIR.validateFramingEntry({ reasonCode: 'NOT_REAL', i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === false);
  // invalid: unregistered i18nKey
  chk('B4 unregistered i18nKey → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil' }).valid === false);
  // invalid: extra own-key
  chk('B5 extra own-key → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', secret: 'x' }).valid === false);
  // invalid: free-form prose (string instead of object)
  chk('B6 free-form string → invalid', FIR.validateFramingEntry('driver was late on brakes').valid === false);
  // invalid: params with array value
  chk('B7 params with array → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { arr: [1, 2] } }).valid === false);
  // invalid: params with Date
  chk('B8 params with Date → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { when: new Date() } }).valid === false);
  // invalid: params with NaN
  chk('B9 params with NaN → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { x: NaN } }).valid === false);
  // invalid: params with oversized string
  chk('B10 params with oversized string → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { s: 'x'.repeat(300) } }).valid === false);
  // invalid: params as null sentinel (round-3 F12 rule — must be plain object when supplied)
  chk('B11 params:null → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: null }).valid === false);

  // Codex C7-R2-C-01 closure: tri-state ABSENT / VALUE / THREW + accessor descriptor rejection.
  // The previous _safeGet swallowed throws into `undefined`, which the params branch treated as
  // "optional field absent" — letting a Proxy / accessor getter slip through. Each test below
  // probes one channel the directive enumerates.
  (() => {
    const validBase = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' };

    // B12 ABSENT: genuinely absent optional params → accept (regression guard).
    chk('B12 absent params → valid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === true);

    // B13 THREW: getter on `params` throws → reject (the primary regression Codex flagged).
    const e13 = Object.assign({}, validBase);
    Object.defineProperty(e13, 'params', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
    chk('B13 params getter throws → invalid', FIR.validateFramingEntry(e13).valid === false);

    // B14 THREW: getter on `reasonCode` throws → reject.
    const e14 = { i18nKey: 'r3_0c.framing.cannot_distinguish' };
    Object.defineProperty(e14, 'reasonCode', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
    chk('B14 reasonCode getter throws → invalid', FIR.validateFramingEntry(e14).valid === false);

    // B15 THREW: getter on `i18nKey` throws → reject.
    const e15 = { reasonCode: CODES.CANNOT_DISTINGUISH };
    Object.defineProperty(e15, 'i18nKey', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
    chk('B15 i18nKey getter throws → invalid', FIR.validateFramingEntry(e15).valid === false);

    // B16 accessor returning a benign value is still rejected. Plain data is the contract.
    const e16 = Object.assign({}, validBase);
    Object.defineProperty(e16, 'params', { enumerable: true, configurable: true, get() { return { ms: 1 }; } });
    chk('B16 params accessor (no throw, benign value) → invalid', FIR.validateFramingEntry(e16).valid === false);

    // B17 inherited getter: define on prototype, not own → entry's own getOwnPropertyDescriptor
    // returns undefined → treated as ABSENT for optional `params` → accept (the entry is
    // structurally plain at the own-property level; inheritance via Object.prototype is the only
    // chain accepted by _isPlain).
    const inheritedProto = Object.create(Object.prototype);
    Object.defineProperty(inheritedProto, 'params', { enumerable: true, configurable: true, get() { return { ms: 1 }; } });
    // Note: setting __proto__ to inheritedProto means _isPlain would reject (proto !== Object.prototype).
    // The realistic threat is a plain entry that someone tried to mutate to gain a getter — already
    // covered by B13/B16. Document the chain via comment only.

    // B18 Proxy on the entry itself with throwing get trap on ownKeys-listed key.
    const target = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' };
    const proxy18 = new Proxy(target, {
      getOwnPropertyDescriptor(t, k) {
        if (k === 'params') return { enumerable: true, configurable: true, get() { throw new Error('proxy-boom'); } };
        return Object.getOwnPropertyDescriptor(t, k);
      },
      ownKeys() { return ['reasonCode', 'i18nKey', 'params']; },
    });
    chk('B18 Proxy advertises params via accessor descriptor → invalid', FIR.validateFramingEntry(proxy18).valid === false);

    // B19 Proxy with throwing ownKeys trap → invalid (already covered by Round 1 B1; regression
    // guard at this layer).
    const proxy19 = new Proxy({}, { ownKeys() { throw new Error('boom'); } });
    chk('B19 Proxy ownKeys throws → invalid', FIR.validateFramingEntry(proxy19).valid === false);

    // B20 inner-param getter: params is a plain object whose key has an accessor descriptor →
    // inner _readOwn must also reject. The previous validator used plain o[k] in the inner loop;
    // for a getter that throws, the outer try/catch would still catch — but a getter that returns
    // a benign value would have slipped silently into the accepted path.
    const e20 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: {} };
    Object.defineProperty(e20.params, 'ms', { enumerable: true, configurable: true, get() { return 42; } });
    chk('B20 inner params value via accessor → invalid', FIR.validateFramingEntry(e20).valid === false);

    // B21 inner-param getter that throws.
    const e21 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: {} };
    Object.defineProperty(e21.params, 'ms', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
    chk('B21 inner params value getter throws → invalid', FIR.validateFramingEntry(e21).valid === false);

    // B22 non-enumerable own key on entry (Reflect.ownKeys still surfaces it; ALLOWED check rejects).
    const e22 = Object.assign({}, validBase);
    Object.defineProperty(e22, 'secret', { enumerable: false, configurable: true, value: 'x' });
    chk('B22 non-enumerable extra own-key → invalid', FIR.validateFramingEntry(e22).valid === false);

    // B23 Symbol-keyed entry (Reflect.ownKeys surfaces Symbols; non-string check rejects).
    const e23 = Object.assign({}, validBase);
    e23[Symbol.for('r3.0c.attack')] = 'x';
    chk('B23 Symbol-keyed extra → invalid', FIR.validateFramingEntry(e23).valid === false);

    // B24 ABSENT vs explicit-undefined sanity: an entry with params explicitly set to undefined
    // (data descriptor with value undefined) should still be accepted as "absent semantics" so
    // existing orchestrator output (`params: v.params ? ... : undefined`) keeps working.
    const e24 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: undefined };
    chk('B24 params explicit-undefined → valid (back-compat)', FIR.validateFramingEntry(e24).valid === true);

    // Codex C7-R3-C-01 closure: Proxy descriptor TOCTOU. A Proxy can lie via
    // getOwnPropertyDescriptor (returning a benign data descriptor while the real get-trap
    // throws or returns side-effecting values). The validator must (a) detect this via a
    // sanitized snapshot return contract that callers consume INSTEAD of the raw entry, OR
    // (b) reject the entry outright. Both stances are tested.
    const target25 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' };
    Object.defineProperty(target25, 'params', {
      configurable: true,
      enumerable: true,
      get() { throw new Error('ACCESSOR EXECUTED ON GET'); },
    });
    const attack25 = new Proxy(target25, {
      getOwnPropertyDescriptor(t, k) {
        if (k === 'params') return { configurable: true, enumerable: true, writable: true, value: undefined };
        return Reflect.getOwnPropertyDescriptor(t, k);
      },
    });
    const res25 = FIR.validateFramingEntry(attack25);
    // Either the validator rejects (sufficient) OR the sanitized snapshot is the safe
    // surface and re-reading the raw entry would still throw — in which case downstream
    // consumers must use sanitized. We require sanitized to be present AND to be free of
    // the accessor side-effect.
    chk('B25 Proxy lying getOwnPropertyDescriptor + accessor get → sanitized snapshot is the only safe surface', (() => {
      if (res25.valid !== true) return true; // reject is acceptable
      if (!res25.sanitized) return false; // valid without sanitized is unsafe
      // sanitized must NOT have params (the get-trap throws on the real entry)
      try { var p = res25.sanitized.params; return p === undefined; } catch (_) { return false; }
    })());

    // B26 Sanitized snapshot is frozen — caller cannot mutate it back to an unsafe shape.
    const ok26 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123 } });
    chk('B26 valid result carries a sanitized snapshot', ok26.valid === true && ok26.sanitized && typeof ok26.sanitized === 'object');
    chk('B26b sanitized snapshot is frozen', ok26.sanitized && Object.isFrozen(ok26.sanitized));
    chk('B26c sanitized.params is frozen', ok26.sanitized && ok26.sanitized.params && Object.isFrozen(ok26.sanitized.params));
    chk('B26d sanitized values equal validated descriptor values', ok26.sanitized.reasonCode === CODES.CANNOT_DISTINGUISH && ok26.sanitized.i18nKey === 'r3_0c.framing.observed_delta.faster_overall' && ok26.sanitized.params.ms === -123);

    // B27 Inner params Proxy descriptor TOCTOU.
    const innerTarget27 = {};
    Object.defineProperty(innerTarget27, 'ms', { configurable: true, enumerable: true, get() { throw new Error('INNER ACCESSOR'); } });
    const innerAttack27 = new Proxy(innerTarget27, {
      getOwnPropertyDescriptor(t, k) {
        if (k === 'ms') return { configurable: true, enumerable: true, writable: true, value: 999 };
        return Reflect.getOwnPropertyDescriptor(t, k);
      },
    });
    const e27 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: innerAttack27 };
    const res27 = FIR.validateFramingEntry(e27);
    chk('B27 inner params Proxy lying descriptor → sanitized snapshot captures only validated value (or reject)', (() => {
      if (res27.valid !== true) return true; // reject is acceptable
      if (!res27.sanitized) return false;
      try { var ms = res27.sanitized.params && res27.sanitized.params.ms; return ms === 999 || ms === undefined; } catch (_) { return false; }
    })());
  })();
})();

// ─────────────────────────────────────────────────────────────────────────────
// C. Viewmodel state-transition contract
chk('C1 TRANSITION_TRIGGERS frozen + 7 entries', Object.isFrozen(VST.TRANSITION_TRIGGERS) && VST.TRANSITION_TRIGGERS.length === 7);
chk('C2 PLACEHOLDER_STATES frozen', Object.isFrozen(VST.PLACEHOLDER_STATES));
chk('C3 TOKEN_INVARIANTS frozen', Object.isFrozen(VST.TOKEN_INVARIANTS));
chk('C4 isTransitionTrigger accepts known', VST.isTransitionTrigger('reference_selection_changed') === true);
chk('C5 isTransitionTrigger rejects unknown', VST.isTransitionTrigger('arbitrary_trigger') === false);
chk('C6 isPlaceholderState accepts known', VST.isPlaceholderState(VST.PLACEHOLDER_STATES.SELECTING) === true);
chk('C7 isPlaceholderState rejects unknown', VST.isPlaceholderState('arbitrary_placeholder') === false);
chk('C8 validateGenerationToken accepts monotonic', VST.validateGenerationToken(5, 4).valid === true);
chk('C9 validateGenerationToken rejects equal', VST.validateGenerationToken(5, 5).valid === false);
chk('C10 validateGenerationToken rejects reverse', VST.validateGenerationToken(3, 5).valid === false);
chk('C11 validateGenerationToken rejects zero', VST.validateGenerationToken(0).valid === false);
chk('C12 validateGenerationToken rejects NaN', VST.validateGenerationToken(NaN).valid === false);
chk('C13 isResultStale true on mismatch', VST.isResultStale(3, 5) === true);
chk('C14 isResultStale false on match', VST.isResultStale(5, 5) === false);
chk('C15 placeholderForTrigger reference → SELECTING', VST.placeholderForTrigger('reference_selection_changed') === VST.PLACEHOLDER_STATES.SELECTING);
chk('C16 placeholderForTrigger case_reopen → IDLE', VST.placeholderForTrigger('case_reopen') === VST.PLACEHOLDER_STATES.IDLE);
chk('C17 placeholderForTrigger eligibility_revoked → BLOCKED', VST.placeholderForTrigger('orchestrator_eligibility_revoked') === VST.PLACEHOLDER_STATES.BLOCKED);
chk('C18 placeholderForTrigger unknown → BLOCKED (fail-closed)', VST.placeholderForTrigger('unknown_trigger') === VST.PLACEHOLDER_STATES.BLOCKED);

// ─────────────────────────────────────────────────────────────────────────────
// D. Orchestrator — capability gate
(() => {
  const orch1 = OrchService.createOrchestrator({ capabilities: { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: false, framingSourceStructuredContractEnabled: true } });
  const r1 = orch1.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
  chk('D1 viewmodel contract disabled → blocked', r1.status === 'blocked');
  const orch2 = OrchService.createOrchestrator({ capabilities: { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: false } });
  const r2 = orch2.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
  chk('D2 framing contract disabled → blocked', r2.status === 'blocked');
})();
// E. Orchestrator — token monotonicity
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const t0 = orch.currentToken();
  const r1 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
  const r2 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
  const r3 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
  chk('E1 token increments on every request', r1.generationToken === t0 + 1 && r2.generationToken === t0 + 2 && r3.generationToken === t0 + 3);
  chk('E2 currentToken matches last issued', orch.currentToken() === t0 + 3);
})();

// F. Orchestrator — full eligible path (drives real C5)
function caseRecord() { return { caseId: 'case_A', associations: { trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } }; }
// Codex C7-R2-A-01 closure: the orchestrator no longer exposes registerAuthenticCaseRecord; the
// authoritative authenticityPredicate is injected at construction. A test-side WeakSet stands in
// for the production R3.0B case-store boundary — production wiring (in renderer/index.html
// app().init()) supplies a predicate backed by its own renderer-private WeakSet that is
// populated only via the case-store-open path. The viewmodel cannot reach either WeakSet, so a
// caller routing a forged caseRecord through setAssociation reaches the orchestrator and is
// refused by the predicate.
const TEST_AUTH_SET = new WeakSet();
function authOrch(caps) {
  return OrchService.createOrchestrator({ capabilities: caps, authenticityPredicate: function (cr) { return TEST_AUTH_SET.has(cr); } });
}
function regCase(_orch, cr) { TEST_AUTH_SET.add(cr); return cr; }
function association() { return { caseId: 'case_A', sessionId: 'sess_1', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing', analysisCaseId: 'case_A', credibilityMetadata: { credibility: 'Heuristic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] } }; }
function eligibilityInput() {
  return {
    analysisCaseId: 'case_A',
    reference: { identity: { analysisCaseId: 'case_A', sessionId: 'sess_1', lapId: 'lap_3', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' }, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } },
    comparison: { identity: { analysisCaseId: 'case_A', sessionId: 'sess_1', lapId: 'lap_5', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' }, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } },
    credibilityMetadata: { credibility: 'Heuristic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] },
  };
}
function deltaMetricsRequest() {
  return {
    identity: { caseId: 'case_A', sessionId: 'sess_1' },
    referenceLap: { lapTimeMs: 90000 },
    comparisonLap: { lapTimeMs: 89500 },
    pairing: { pairs: [
      { referenceCorner: { id: 'C1', fullTimeMs: 10000, entryTimeMs: 3000, midTimeMs: 4000, exitTimeMs: 3000 }, comparisonCorner: { id: 'C1', fullTimeMs: 9900, entryTimeMs: 2950, midTimeMs: 4000, exitTimeMs: 2950 } },
    ] },
    requestedMetrics: ['lap_time', 'delta_cumulative', 'sector_delta'],
    policy: { deltaSign: 'comparison_minus_reference' },
  };
}
(() => {
  const orch = authOrch(allCapsOn);
  const cr = caseRecord(); regCase(orch, cr);
  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
  chk('F1 eligible end-to-end', r.status === 'eligible');
  chk('F2 framing is structured (not prose)', r.framing && typeof r.framing.observedDelta === 'object');
  chk('F3 framing.observedDelta.faster_overall', r.framing.observedDelta && r.framing.observedDelta.i18nKey === 'r3_0c.framing.observed_delta.faster_overall');
  chk('F4 framing.cannotDistinguish is array', Array.isArray(r.framing.cannotDistinguish));
  chk('F5 exportGate true when identity matches', r.exportGate === true);
})();
// G. Orchestrator — case binding mismatch
(() => {
  const orch = authOrch(allCapsOn);
  const caseRec = { caseId: 'case_A', associations: { trackId: 'imola', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } };
  regCase(orch, caseRec);
  const r = orch.requestComparison({ caseRecord: caseRec, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
  chk('G1 case associations trackId mismatch → blocked', r.status === 'blocked' && hasCode(r, CODES.TRACK_IDENTITY_MISMATCH));
})();
// G2. Codex C7-R2-A-01: orchestrator constructed with proper authenticityPredicate but caller
// supplies a freshly-built caseRecord NOT in the authoritative set → blocked at authenticity gate.
// This proves the predicate is the only authority check; no registration helper is reachable.
(() => {
  const orch = authOrch(allCapsOn);
  const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
  chk('G2 caller-forged caseRecord (not in auth set) → blocked', r.status === 'blocked' && hasCode(r, CODES.INTERNAL_CONTRACT_VIOLATION));
})();
// G3. Codex C7-R2-A-01: the previous candidate had viewmodel.setAssociation auto-register the
// caller-supplied caseRecord via a public orchestrator API — a literal-built forged record
// passed end-to-end. This test drives the FULL setAssociation → requestComparison escalation
// path against an orchestrator constructed with an authenticityPredicate that ONLY trusts the
// pre-registered record. The forged record is constructed locally and NEVER touched by any
// helper — there is no public registration API to abuse. setAssociation must NOT bestow
// authority. The eligible-path result rendered by the viewmodel must remain blocked /
// not-ready, NOT ready.
(() => {
  const orch = authOrch(allCapsOn);
  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
  const forgedRecord = { caseId: 'case_A', associations: { trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } };
  // ABSOLUTELY DO NOT call regCase(orch, forgedRecord) — the threat model is exactly the absence
  // of any caller-reachable registration helper.
  const assoc = Object.assign({}, association(), { caseRecord: forgedRecord });
  vm.setAssociation(assoc);
  vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
  vm.setReference({ lapId: 'lap_3', lapTimeMs: 90000, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  vm.setComparison({ lapId: 'lap_5', lapTimeMs: 89500, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  const s = vm.getState();
  chk('G3 setAssociation cannot bestow authority — forged escalation blocked at viewmodel state', s.placeholder !== VST.PLACEHOLDER_STATES.READY && s.result === null && s.exportGate === false);
  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
  chk('G3c orchestrator public API does NOT expose isAuthenticCaseRecord', typeof orch.isAuthenticCaseRecord === 'undefined');
})();
// H. Orchestrator — phase metric requested without capability → filtered out + limitation
(() => {
  const orch = authOrch(allCapsOn);
  const cr = caseRecord(); regCase(orch, cr);
  const dm = deltaMetricsRequest();
  dm.requestedMetrics = ['lap_time', 'delta_cumulative', 'entry_delta'];
  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: dm });
  chk('H1 phase metric without capability → still eligible (filtered)', r.status === 'eligible');
  chk('H2 limitations include PHASE_BOUNDARY_CONTRACT_UNAUTHORISED', r.limitations.indexOf(CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED) !== -1);
  chk('H3 framing.cannotDistinguish names phase_metric_unauthorised', r.framing.cannotDistinguish.some(e => e.i18nKey === 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised'));
})();
// I. Orchestrator — caller smuggled prose framing → fall back to validated/fallback
(() => {
  const orch = authOrch(allCapsOn);
  const cr = caseRecord(); regCase(orch, cr);
  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { observedDelta: 'driver was late on brakes' } });
  chk('I1 caller-smuggled prose dropped (observedDelta is structured)', r.status === 'eligible' && typeof r.framing.observedDelta === 'object' && r.framing.observedDelta.i18nKey !== undefined);
})();
// J. Orchestrator — caller-smuggled unregistered i18nKey → dropped
(() => {
  const orch = authOrch(allCapsOn);
  const cr = caseRecord(); regCase(orch, cr);
  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { nextValidationAction: { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil_made_up_key' } } });
  chk('J1 unregistered i18nKey in nextValidationAction → not committed', r.framing.nextValidationAction === null);
})();

// ─────────────────────────────────────────────────────────────────────────────
// K. Viewmodel — capability gate
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  let threw = false;
  try { VMService.createComparisonViewModel({ orchestrator: orch, capabilities: { viewmodelStateTransitionContractEnabled: false } }); }
  catch (e) { threw = true; }
  chk('K1 viewmodel refuses when capability disabled', threw);
})();
// L. Viewmodel — initial state
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
  const s = vm.getState();
  chk('L1 initial placeholder=IDLE', s.placeholder === VST.PLACEHOLDER_STATES.IDLE);
  chk('L2 initial result null', s.result === null);
  chk('L3 initial exportGate false', s.exportGate === false);
  chk('L4 latestToken 0', s.latestToken === 0);
})();
// M. Viewmodel — 7 transition triggers each clear+placeholder
const allTriggers = ['setReference', 'setComparison', 'setAssociation', 'setChannelMapping', 'notifyCaseReopen', 'notifyAuthorityRevoked', 'notifyEligibilityRevoked'];
allTriggers.forEach((triggerFn, i) => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
  // pre-populate so we can confirm clear
  vm.setAssociation(association());
  vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
  vm.setReference({ lapId: 'lap_3', lapTimeMs: 90000, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  vm.setComparison({ lapId: 'lap_5', lapTimeMs: 89500, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  const beforeState = vm.getState();
  // fire the trigger:
  if (triggerFn === 'setReference') vm.setReference({ lapId: 'lap_new', lapTimeMs: 91000 });
  else if (triggerFn === 'setComparison') vm.setComparison({ lapId: 'lap_new2', lapTimeMs: 91000 });
  else if (triggerFn === 'setAssociation') vm.setAssociation(association());
  else if (triggerFn === 'setChannelMapping') vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
  else if (triggerFn === 'notifyCaseReopen') vm.notifyCaseReopen();
  else if (triggerFn === 'notifyAuthorityRevoked') vm.notifyAuthorityRevoked();
  else if (triggerFn === 'notifyEligibilityRevoked') vm.notifyEligibilityRevoked();
  const afterState = vm.getState();
  const cleared = afterState.placeholder !== beforeState.placeholder || afterState.result === null;
  chk('M' + (i + 1) + ' trigger ' + triggerFn + ' resets placeholder/result', cleared);
});

// N. Viewmodel — phase metricAvailability forced false
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
  vm.setAssociation(association());
  vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
  vm.setReference({ lapId: 'lap_3', lapTimeMs: 90000, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  vm.setComparison({ lapId: 'lap_5', lapTimeMs: 89500, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  const s = vm.getState();
  chk('N1 metricAvailability.entry_delta = false (phase gate)', s.metricAvailability.entry_delta === false);
  chk('N2 metricAvailability.mid_delta = false (phase gate)', s.metricAvailability.mid_delta === false);
  chk('N3 metricAvailability.exit_delta = false (phase gate)', s.metricAvailability.exit_delta === false);
})();

console.log('r3-0c-comparison-workspace: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
'use strict';
/**
 * tests/r3-0c-contracts-bundle-equivalence.test.js — R3.0C C7 (Codex C7-R2-B-01, J1) bundle drift guard.
 *
 * The browser loads contracts via renderer/js/r3-0c-contracts-bundle.js, an auto-generated
 * concatenation of contracts/r3.0c/*.js produced by scripts/build-r3-0c-contracts-bundle.js. If a
 * contract source file is edited but the bundle is not regenerated, the browser sees stale
 * contract code while Node tests see fresh code — and the divergence would only surface in
 * actual user behaviour. This test re-runs the generator and asserts the committed bundle is
 * byte-for-byte equal. CI / pre-merge fails closed on any drift.
 *
 * Output: process.exit(1) on any failure; process.exit(0) on success.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Bundle = require('../scripts/build-r3-0c-contracts-bundle.js');

let pass = 0, fail = 0;
function chk(name, cond, detail) { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } }

const OUT = Bundle.OUT_FILE;

// A. Bundle file exists.
chk('A1 bundle file exists', fs.existsSync(OUT));

// B. Re-running the generator produces the exact bytes committed.
const expected = fs.readFileSync(OUT, 'utf8');
const regenerated = Bundle.buildBundle();
chk('B1 regenerated length matches committed', regenerated.length === expected.length, { committed: expected.length, regenerated: regenerated.length });
chk('B2 regenerated content matches committed byte-for-byte', regenerated === expected);
const expectedHash = crypto.createHash('sha256').update(expected).digest('hex');
const regenHash = crypto.createHash('sha256').update(regenerated).digest('hex');
chk('B3 regenerated sha256 matches committed sha256', expectedHash === regenHash, { committed: expectedHash, regenerated: regenHash });

// C. Source order honors dependency direction. The bundle must list reason-codes.js BEFORE every
//    contract that depends on it (which is all of them), and index.js LAST.
const order = Bundle.SOURCE_ORDER;
chk('C1 source order starts with reason-codes.js', order[0] === 'reason-codes.js');
chk('C2 source order ends with index.js', order[order.length - 1] === 'index.js');
chk('C3 source order includes framing-i18n-key-registry.js', order.indexOf('framing-i18n-key-registry.js') !== -1);
chk('C4 source order includes viewmodel-state-transition-contract.js', order.indexOf('viewmodel-state-transition-contract.js') !== -1);

// D. Bundle is loadable from a fresh global. We sandbox via the vm module so a Node-side require
//    (which uses module.exports) is NOT what's tested — we want the BROWSER path. We simulate
//    that by evaluating the bundle in a context where `module` is undefined.
const vm = require('vm');
const sandbox = { console, Buffer };
sandbox.globalThis = sandbox;
sandbox.Reflect = Reflect;
sandbox.Object = Object;
sandbox.Array = Array;
sandbox.Number = Number;
sandbox.Math = Math;
sandbox.JSON = JSON;
sandbox.String = String;
sandbox.Symbol = Symbol;
sandbox.Error = Error;
sandbox.WeakSet = WeakSet;
sandbox.Set = Set;
sandbox.TextEncoder = TextEncoder;
vm.createContext(sandbox);
let evalErr = null;
try { vm.runInContext(expected, sandbox); } catch (e) { evalErr = e; }
chk('D1 bundle evaluates cleanly in a browser-like sandbox (no module/exports)', evalErr === null, evalErr && String(evalErr));
chk('D2 R3_0C_ReasonCodes global registered', typeof sandbox.R3_0C_ReasonCodes === 'object' && sandbox.R3_0C_ReasonCodes !== null);
chk('D3 R3_0C_FramingI18nKeyRegistry global registered', typeof sandbox.R3_0C_FramingI18nKeyRegistry === 'object' && sandbox.R3_0C_FramingI18nKeyRegistry !== null);
chk('D4 R3_0C_ViewmodelStateTransitionContract global registered', typeof sandbox.R3_0C_ViewmodelStateTransitionContract === 'object' && sandbox.R3_0C_ViewmodelStateTransitionContract !== null);
chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
chk('D7 ALL_REASON_CODES.length === 66', sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length === 66, sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length);

// E. Bundle header carries the auto-generated banner so a human editing the file is warned.
chk('E1 bundle starts with AUTO-GENERATED banner', /^\/\/ AUTO-GENERATED by scripts\/build-r3-0c-contracts-bundle\.js/.test(expected));
chk('E2 bundle names the C7-R2-B-01 closure context', expected.indexOf('C7-R2-B-01 closure') !== -1);

console.log('r3-0c-contracts-bundle-equivalence: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);

exec
/bin/bash -lc "nl -ba renderer/js/r3-0c-comparison-export.js | sed -n '1,360p'; nl -ba contracts/r3.0c/comparison-export-contract.js | sed -n '1,260p'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
exec
/bin/bash -lc "node - <<'NODE'
const fs=require('fs'); for(const f of ['governance/r3.0c/state.json','governance/r3.0c/checkpoints/C7.json','governance/r3.0/train.json']){const x=JSON.parse(fs.readFileSync(f)); console.log(f,JSON.stringify(x,null,2))}
NODE
rg -n \"availability|feature_registry_active|phase_boundary_contract|portable|schema\" governance/r3.0c renderer/js/case-record-schema.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
     1	/**
     2	 * renderer/js/r3-0c-comparison-export.js — R3.0C C6 · Comparison Export Service.
     3	 *
     4	 * Closed-allowlist gateway between authoritative C5 delta-metrics results and the bounded portable
     5	 * export envelope defined by contracts/r3.0c/comparison-export-contract.js. This service does NOT
     6	 * compute anything new — it validates input authority, rebuilds an explicit allowlist payload from
     7	 * service output, applies bounded caps, calls the contract envelope builder, round-trips the JSON
     8	 * representation (serialize → parse → re-validate), and returns a frozen envelope.
     9	 *
    10	 * The directive's allowlist (R3.0 Continuous Delivery §七 C6):
    11	 *   Allowed: schema identity / version / generatedAt (envelope), comparisonStatus, referenceLap,
    12	 *            comparisonLap, association, cumulativeDelta, corners, metricAvailability, credibility,
    13	 *            confidence, provenance, limitations, blockers, cannotConclude, alternativeExplanations,
    14	 *            nextValidationAction.
    15	 *   Forbidden: raw telemetry, normalized grids, per-sample traces, channel arrays, full session
    16	 *              objects, IndexedDB keys, filenames, private paths, arbitrary user metadata,
    17	 *              reactive UI state, class instance, Date / Map / Set / typed arrays, callback /
    18	 *              function, unbounded prose, the caller's complete result spread.
    19	 *
    20	 * Blocked export contract (directive): only current + authoritative + service-produced blocked
    21	 * results may be exported. Blocked envelopes carry status / reasonCodes / limitations / minimal
    22	 * identity / next validation action — never fabricated metrics.
    23	 *
    24	 * Authority discipline (the ten builder steps from the directive):
    25	 *   1. Validate the result is shaped like a C5 service output (status + sign + metrics shape).
    26	 *   2. Validate the association block (caseId / sessionId / track / layout / basis / direction).
    27	 *   3. Validate the generation token is a non-empty string supplied by the caller (the orchestrator
    28	 *      is responsible for token freshness — this service refuses an absent token).
    29	 *   4. Explicit allowlist: only the directive-named fields land in the payload.
    30	 *   5. Rebuild a plain object from scratch — never spread or assign the caller's result.
    31	 *   6. Apply bounded item caps + per-string + total UTF-8 byte caps (delegated to the envelope
    32	 *      contract's validator).
    33	 *   7. Validate the constructed envelope.
    34	 *   8. JSON.stringify the envelope (deterministic ordering follows the allowlist key order).
    35	 *   9. JSON.parse the serialized string.
    36	 *  10. Re-validate the parsed envelope — round-trip equivalence is the export's deterministic
    37	 *      contract. Any round-trip drift fails closed.
    38	 *
    39	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonExport).
    40	 */
    41	(function (root) {
    42	  'use strict';
    43	
    44	  var Contracts = null;
    45	  var DeltaMetricsService = null;
    46	  if (typeof module !== 'undefined' && module.exports) {
    47	    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
    48	    // The C6 service consumes the C5 service's authenticity predicate (formal Codex C6 finding
    49	    // F-C6-A1). Loading is best-effort: in fixture trees where C5 service is absent the export
    50	    // service degrades to fail-closed on every authenticity check (no caller can fake it).
    51	    try { DeltaMetricsService = require('./r3-0c-delta-metrics.js'); } catch (e) { DeltaMetricsService = null; }
    52	  }
    53	  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
    54	  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
    55	  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-export.js requires contracts/r3.0c/index.js');
    56	
    57	  var RC = Contracts.reasonCodes;
    58	  var CODES = RC.REASON_CODES;
    59	  var EX = Contracts.comparisonExport;
    60	  var CE = Contracts.comparisonEligibility;
    61	  var CR = Contracts.credibility;
    62	  var DM = Contracts.deltaMetrics;
    63	
    64	  var SERVICE_VERSION = 1;
    65	  var CHECKPOINT_FLOOR = 'C6_EXPORT';
    66	  var SIGN_FORMULA = 'comparison_minus_reference';
    67	
    68	  // recognised authoritative C5 service status values; nothing else is treated as a service result.
    69	  var ELIGIBLE_RESULT_STATUS = 'delta_metrics_computed';
    70	  var BLOCKED_RESULT_STATUS = 'blocked';
    71	  // closed payload key sets (eligible + blocked). The builder constructs these in fixed order so
    72	  // JSON.stringify produces a deterministic byte stream for a given input.
    73	  var ELIGIBLE_PAYLOAD_KEYS = Object.freeze([
    74	    'comparisonStatus',
    75	    'referenceLap',
    76	    'comparisonLap',
    77	    'association',
    78	    'cumulativeDelta',
    79	    'corners',
    80	    'metricAvailability',
    81	    'credibility',
    82	    'confidence',
    83	    'provenance',
    84	    'limitations',
    85	    'blockers',
    86	    'cannotConclude',
    87	    'alternativeExplanations',
    88	    'nextValidationAction',
    89	  ]);
    90	  var BLOCKED_PAYLOAD_KEYS = Object.freeze([
    91	    'comparisonStatus',
    92	    'status',
    93	    'reasonCodes',
    94	    'limitations',
    95	    'identity',
    96	    'nextValidationAction',
    97	  ]);
    98	  // bounded caps that mirror the export envelope contract.
    99	  var MAX_CORNERS = EX.MAX_BOUNDED_ARRAY; // 64
   100	  var MAX_LIMITATIONS = EX.MAX_BOUNDED_ARRAY;
   101	  var MAX_FRAMING_ENTRIES = EX.MAX_BOUNDED_ARRAY;
   102	  var MAX_PARAM_STRING_BYTES = 256;       // matches FRAMING_KEY_SHAPE.paramsValueRule short_string
   103	  var MAX_GENERAL_STRING_BYTES = EX.MAX_STRING_UTF8_BYTES; // 4096
   104	
   105	  // C6 bounded identifier grammar (formal Codex C6 finding F-C6-A3 round 1 + round 2):
   106	  // caller-supplied identifiers (caseId / sessionId / lapId / trackId / layoutId / cornerId) MUST
   107	  // NOT carry path-, URI-, filename-, or whitespace-shaped content. The grammar accepts the small
   108	  // ASCII set used by R2.6 / R3.0B identifiers (alphanumerics, underscore, hyphen, dot, colon) up
   109	  // to 64 chars. Round 2 supplement: even a dotted ID can be filename-shaped (e.g. 'telemetry.csv').
   110	  // We reject any ID ending in a recognized data / archive / config / key file extension while
   111	  // keeping legitimate dotted IDs like 'lap.42', 'corner.T1', 'sess.alpha'.
   112	  var ID_GRAMMAR = /^[A-Za-z0-9._:\-]{1,64}$/;
   113	  var FORBIDDEN_FILENAME_EXTENSIONS = /\.(?:csv|tsv|xlsx?|sqlite|sqlite3|db|json|jsonl|ndjson|xml|yaml|yml|ini|conf|cfg|txt|log|dat|bin|bak|tmp|cache|key|pem|crt|cer|asc|gpg|p12|pfx|env|html?|md|pdf|zip|gz|tar|7z|rar|sql|map|min|wasm|exe|dll|so|dylib|app|dmg|iso|img|bmsbin|csv\.gz|tar\.gz)$/i;
   114	  function _isBoundedId(s) {
   115	    if (typeof s !== 'string') return false;
   116	    if (!ID_GRAMMAR.test(s)) return false;
   117	    if (FORBIDDEN_FILENAME_EXTENSIONS.test(s)) return false;
   118	    return true;
   119	  }
   120	
   121	  // helpers
   122	  function _isPlain(v) {
   123	    // Defensive against malicious Proxy / accessor inputs (formal Codex C6 finding F-C6-A2):
   124	    // any throw from Object.getPrototypeOf must be treated as "not plain" (fail-closed). The
   125	    // try/catch boundary makes a Proxy with a throwing getPrototypeOf trap refuse to traverse.
   126	    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
   127	    try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
   128	    catch (e) { return false; }
   129	  }
   130	  // Safe Object.keys + property access for inputs that may carry malicious traps.
   131	  function _safeKeys(o) { try { return Object.keys(o); } catch (e) { return null; } }
   132	  function _safeGet(o, k) { try { return o[k]; } catch (e) { return undefined; } }
   133	  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
   134	  function _isFiniteNumOrNull(v) { return v === null || _isFiniteNum(v); }
   135	  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
   136	  function _utf8ByteLength(s) {
   137	    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
   138	    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
   139	    var n = 0;
   140	    for (var i = 0; i < s.length; i++) {
   141	      var c = s.charCodeAt(i);
   142	      if (c < 0x80) n += 1;
   143	      else if (c < 0x800) n += 2;
   144	      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
   145	      else n += 3;
   146	    }
   147	    return n;
   148	  }
   149	  function _shortString(s, cap) {
   150	    if (typeof s !== 'string') return null;
   151	    return _utf8ByteLength(s) <= (cap || MAX_GENERAL_STRING_BYTES) ? s : null;
   152	  }
   153	  function _allowlistFrame(frame) {
   154	    // FRAMING_KEY_SHAPE: { reasonCode, i18nKey, params? } — params is plain object or OMITTED.
   155	    // All property accesses go through the safe boundary so a Proxy with throwing or surprising
   156	    // traps cannot crash buildComparisonExport or leak through (formal Codex C6 finding F-C6-A2).
   157	    if (!_isPlain(frame)) return null;
   158	    var reasonCode = _safeGet(frame, 'reasonCode');
   159	    if (!RC.isReasonCode(reasonCode)) return null;
   160	    var i18nKey = _safeGet(frame, 'i18nKey');
   161	    if (!_nonEmptyStr(i18nKey)) return null;
   162	    if (_utf8ByteLength(i18nKey) > MAX_GENERAL_STRING_BYTES) return null;
   163	    var out = { reasonCode: reasonCode, i18nKey: i18nKey };
   164	    var rawParams = _safeGet(frame, 'params');
   165	    if (rawParams !== undefined) {
   166	      if (!_isPlain(rawParams)) return null;
   167	      var keys = _safeKeys(rawParams);
   168	      if (keys === null) return null;
   169	      var params = {};
   170	      for (var i = 0; i < keys.length; i++) {
   171	        var k = keys[i];
   172	        if (typeof k !== 'string' || k.length === 0) return null;
   173	        var v = _safeGet(rawParams, k);
   174	        if (v === null || typeof v === 'boolean') { params[k] = v; continue; }
   175	        if (typeof v === 'number') {
   176	          if (!_isFiniteNum(v)) return null;
   177	          params[k] = v; continue;
   178	        }
   179	        if (typeof v === 'string') {
   180	          var s = _shortString(v, MAX_PARAM_STRING_BYTES);
   181	          if (s === null) return null;
   182	          params[k] = s; continue;
   183	        }
   184	        return null; // arrays / exotic objects / functions / symbols / bigints / proxies → reject
   185	      }
   186	      out.params = params;
   187	    }
   188	    return out;
   189	  }
   190	  function _allowlistFrameArray(arr, cap) {
   191	    if (!Array.isArray(arr)) return [];
   192	    if (arr.length > cap) return null; // bounded
   193	    var out = [];
   194	    for (var i = 0; i < arr.length; i++) {
   195	      var f = _allowlistFrame(arr[i]);
   196	      if (f === null) return null;
   197	      out.push(f);
   198	    }
   199	    return out;
   200	  }
   201	  function _allowlistLimitations(arr) {
   202	    if (!Array.isArray(arr)) return [];
   203	    if (arr.length > MAX_LIMITATIONS) return null;
   204	    var out = [];
   205	    var seen = {};
   206	    for (var i = 0; i < arr.length; i++) {
   207	      var c = arr[i];
   208	      if (!RC.isReasonCode(c)) return null;
   209	      if (seen[c]) continue; // dedupe
   210	      seen[c] = true;
   211	      out.push(c);
   212	    }
   213	    return out;
   214	  }
   215	
   216	  function _blockedExport(reasonCodes, detail) {
   217	    var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
   218	    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
   219	    var br = RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
   220	    return Object.freeze({
   221	      eligible: false,
   222	      status: 'blocked',
   223	      reasonCodes: br.reasonCodes,
   224	      explanationKeys: br.explanationKeys,
   225	      detail: br.detail,
   226	      envelope: null,
   227	      serialized: null,
   228	      result: null,
   229	    });
   230	  }
   231	
   232	  // Authority shape gates (steps 1–3 of the directive). All caller-controlled property accesses go
   233	  // through _safeGet so a Proxy with a throwing get trap (formal Codex C6 finding F-C6-A2 round 2)
   234	  // fails closed without crashing the public builder.
   235	  function _validateRequestShape(request) {
   236	    if (!_isPlain(request)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'request not a plain object' };
   237	    var token = _safeGet(request, 'generationToken');
   238	    if (!_nonEmptyStr(token)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'missing generationToken' };
   239	    if (_utf8ByteLength(token) > MAX_GENERAL_STRING_BYTES) return { ok: false, reasons: [CODES.EXPORT_PAYLOAD_STRING_TOO_LONG], detail: 'generationToken too long' };
   240	    var result = _safeGet(request, 'result');
   241	    if (!_isPlain(result)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result not a plain object' };
   242	    // C6 authenticity gate (formal Codex C6 finding F-C6-A1 round 1 + round 2 + round 3 closure):
   243	    // the result MUST have come from the C5 delta-metrics service's own production path AND every
   244	    // node in the result graph must be authentic-and-frozen. Round 3 closure: the gate is now
   245	    // FAIL-CLOSED even when the C5 service is unavailable (browser UMD environment where
   246	    // R3_0C_DeltaMetrics is absent) — without the authenticity predicate we cannot verify
   247	    // authority, so we MUST refuse the request rather than skip the check.
   248	    if (!DeltaMetricsService || typeof DeltaMetricsService.isAuthenticResult !== 'function') {
   249	      return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'C5 authenticity predicate unavailable — fail-closed' };
   250	    }
   251	    if (!DeltaMetricsService.isAuthenticResult(result)) {
   252	      return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result not produced by C5 service (authenticity check failed)' };
   253	    }
   254	    var eligibleFlag = _safeGet(result, 'eligible');
   255	    if (typeof eligibleFlag !== 'boolean') return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result.eligible not boolean' };
   256	    var st = _safeGet(result, 'status');
   257	    if (typeof st !== 'string') return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result.status not string' };
   258	    if (eligibleFlag === true && st !== ELIGIBLE_RESULT_STATUS) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'eligible result must carry status delta_metrics_computed' };
   259	    if (eligibleFlag === false && st !== BLOCKED_RESULT_STATUS) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'blocked result must carry status blocked' };
   260	    var resultSign = _safeGet(result, 'sign');
   261	    if (eligibleFlag === true && resultSign !== SIGN_FORMULA) return { ok: false, reasons: [CODES.DELTA_METRIC_SIGN_FORBIDDEN], detail: 'eligible result sign mismatch' };
   262	    return { ok: true };
   263	  }
   264	
   265	  function _validateAssociation(association) {
   266	    if (!_isPlain(association)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'association not a plain object' };
   267	    if (!_isBoundedId(association.caseId)) return { ok: false, reasons: [CODES.CROSS_CASE_COMPARISON_UNSUPPORTED], detail: 'association caseId not bounded-id' };
   268	    if (!_isBoundedId(association.sessionId)) return { ok: false, reasons: [CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED], detail: 'association sessionId not bounded-id' };
   269	    if (!_isBoundedId(association.trackId) || !_isBoundedId(association.layoutId)) return { ok: false, reasons: [CODES.MISSING_TRACK_IDENTITY], detail: 'association track/layout id not bounded-id' };
   270	    if (CE.ACCEPTED_POSITION_BASES.indexOf(association.positionBasis) === -1) return { ok: false, reasons: [CODES.MISSING_POSITION_BASIS], detail: 'association positionBasis invalid' };
   271	    if (CE.ACCEPTED_POSITION_DIRECTIONS.indexOf(association.positionDirection) === -1) return { ok: false, reasons: [CODES.MISSING_POSITION_DIRECTION], detail: 'association positionDirection invalid' };
   272	    return { ok: true };
   273	  }
   274	
   275	  function _validateAssociationVsResultIdentity(result, association) {
   276	    // result.identity is { caseId, sessionId }; association must match. This catches a stale result
   277	    // (the C5 service was called against a different case/session than the orchestrator's current
   278	    // association). Stale results MUST NOT export — directive §七 C6 "blocked export only when
   279	    // current + authoritative".
   280	    if (!_isPlain(result.identity)) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'result.identity not plain' };
   281	    if (result.identity.caseId !== association.caseId) return { ok: false, reasons: [CODES.CROSS_CASE_COMPARISON_UNSUPPORTED], detail: 'result.identity caseId stale vs association' };
   282	    if (result.identity.sessionId !== association.sessionId) return { ok: false, reasons: [CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED], detail: 'result.identity sessionId stale vs association' };
   283	    return { ok: true };
   284	  }
   285	
   286	  // Allowlist rebuild of bounded summaries (step 4–5).
   287	  // ID-shaped fields (sessionId / lapId) are validated against ID_GRAMMAR so a path-, URI-,
   288	  // filename- or whitespace-shaped string cannot occupy them (formal Codex C6 finding F-C6-A3).
   289	  function _buildReferenceLapSummary(request) {
   290	    var ref = request.referenceLap;
   291	    if (!_isPlain(ref)) return null;
   292	    var lapTimeMs = (_safeGet(ref, 'lapTimeMs') === undefined || _safeGet(ref, 'lapTimeMs') === null) ? null : _safeGet(ref, 'lapTimeMs');
   293	    if (lapTimeMs !== null && (!_isFiniteNum(lapTimeMs) || lapTimeMs <= 0)) return null;
   294	    var sessionId = _safeGet(ref, 'sessionId');
   295	    var lapId = _safeGet(ref, 'lapId');
   296	    if (!_isBoundedId(sessionId)) return null;
   297	    if (lapId !== null && lapId !== undefined && !_isBoundedId(lapId)) return null;
   298	    return { sessionId: sessionId, lapId: lapId === undefined ? null : lapId, lapTimeMs: lapTimeMs };
   299	  }
   300	  function _buildComparisonLapSummary(request) {
   301	    var cmp = request.comparisonLap;
   302	    if (!_isPlain(cmp)) return null;
   303	    var lapTimeMs = (_safeGet(cmp, 'lapTimeMs') === undefined || _safeGet(cmp, 'lapTimeMs') === null) ? null : _safeGet(cmp, 'lapTimeMs');
   304	    if (lapTimeMs !== null && (!_isFiniteNum(lapTimeMs) || lapTimeMs <= 0)) return null;
   305	    var sessionId = _safeGet(cmp, 'sessionId');
   306	    var lapId = _safeGet(cmp, 'lapId');
   307	    if (!_isBoundedId(sessionId)) return null;
   308	    if (lapId !== null && lapId !== undefined && !_isBoundedId(lapId)) return null;
   309	    return { sessionId: sessionId, lapId: lapId === undefined ? null : lapId, lapTimeMs: lapTimeMs };
   310	  }
   311	  function _buildAssociationSummary(association) {
   312	    return {
   313	      caseId: association.caseId,
   314	      trackId: association.trackId,
   315	      layoutId: association.layoutId,
   316	      positionBasis: association.positionBasis,
   317	      positionDirection: association.positionDirection,
   318	    };
   319	  }
   320	  function _buildCumulativeDelta(metrics) {
   321	    if (!_isPlain(metrics) || !_isPlain(metrics.delta_cumulative)) {
   322	      return { value: null, unit: 'ms', available: false, reason: CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE };
   323	    }
   324	    var dc = metrics.delta_cumulative;
   325	    if (!_isFiniteNumOrNull(dc.value) || dc.value === null) {
   326	      return { value: null, unit: 'ms', available: false, reason: CODES.DELTA_METRIC_NUMERIC_INVALID };
   327	    }
   328	    return { value: dc.value, unit: 'ms', available: true };
   329	  }
   330	  function _buildCorners(metrics) {
   331	    // The corners array is the per-corner sector_delta projection. C5 emits per-pair entries with
   332	    // shape { pairIndex, value, referenceCornerId, comparisonCornerId }. We take referenceCornerId
   333	    // as the export's canonical bounded ID. entry/mid/exit phase metrics are NOT included here;
   334	    // they remain governance-locked until phase_boundary_contract.enabled.
   335	    if (!_isPlain(metrics) || !_isPlain(metrics.sector_delta) || !Array.isArray(metrics.sector_delta.perCorner)) {
   336	      return []; // no corners → bounded empty array is valid
   337	    }
   338	    var pc = metrics.sector_delta.perCorner;
   339	    if (pc.length > MAX_CORNERS) return null;
   340	    var out = [];
   341	    for (var i = 0; i < pc.length; i++) {
   342	      var e = pc[i];
   343	      if (e === null || e === undefined) { out.push({ cornerId: null, sectorDelta: null, available: false, reason: CODES.DELTA_METRIC_NUMERIC_INVALID }); continue; }
   344	      if (!_isPlain(e)) return null;
   345	      var cornerId = _safeGet(e, 'referenceCornerId');
   346	      if (!_isBoundedId(cornerId)) return null;
   347	      var value = _safeGet(e, 'value');
   348	      if (value === null || value === undefined || !_isFiniteNum(value)) {
   349	        out.push({ cornerId: cornerId, sectorDelta: null, available: false, reason: CODES.DELTA_METRIC_NUMERIC_INVALID });
   350	      } else {
   351	        out.push({ cornerId: cornerId, sectorDelta: value, available: true });
   352	      }
   353	    }
   354	    return out;
   355	  }
   356	  function _buildMetricAvailability(metrics) {
   357	    var names = CE.SUPPORTED_METRICS;
   358	    var out = {};
   359	    for (var i = 0; i < names.length; i++) {
   360	      var n = names[i];
     1	/**
     2	 * contracts/r3.0c/comparison-export-contract.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
     3	 *
     4	 * Defines the SEPARATE, opt-in comparison export ENVELOPE: a fixed schema identity
     5	 * ('racing-analyzer/comparison-export') that is deliberately DISTINCT from the R3.0B / R2.3 case-export
     6	 * schemas, an envelope constructor, and a fail-closed validator. CP1 wires NO real export command and embeds
     7	 * NO data — the envelope structure forbids raw sample arrays BY CONSTRUCTION. No telemetry, no algorithm.
     8	 *
     9	 * CP1 round-2 retrofit (governance/r3.0c/cp1-retrofit-matrix.md F1 / F2 / F3):
    10	 *   • the envelope OWNS exactly { schemaIdentity, schemaVersion, generatedAt, payload } — any other
    11	 *     own-key on the envelope fails closed (EXPORT_ENVELOPE_UNKNOWN_KEY) so a caller cannot smuggle
    12	 *     fields past the validator;
    13	 *   • payload numeric scalars must be finite — NaN / Infinity / -Infinity reject
    14	 *     (EXPORT_PAYLOAD_NON_FINITE_NUMBER) so a JSON round-trip cannot silently coerce them to null
    15	 *     and so a sender cannot encode a sentinel as a finite-looking value;
    16	 *   • payload strings are capped per-string (MAX_STRING_UTF8_BYTES) and the whole envelope is capped
    17	 *     by its serialised UTF-8 byte size (MAX_ENVELOPE_UTF8_BYTES) — these close the
    18	 *     "raw-telemetry-as-base64-string" + "summary-grows-unbounded" smuggling vectors that the
    19	 *     array-only bound did not catch (EXPORT_PAYLOAD_STRING_TOO_LONG /
    20	 *     EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE).
    21	 *
    22	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonExportContract).
    23	 */
    24	(function (root) {
    25	  'use strict';
    26	
    27	  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
    28	  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
    29	  if (!RC) throw new Error('comparison-export-contract.js requires reason-codes.js');
    30	  var CODES = RC.REASON_CODES;
    31	
    32	  // fixed, distinct schema identity for the comparison export (NOT the case bundle).
    33	  var COMPARISON_EXPORT_IDENTITY = 'racing-analyzer/comparison-export';
    34	  var COMPARISON_EXPORT_SCHEMA_VERSION = 1;
    35	  // a bounded envelope: any array nested in the payload must be ≤ this (defensive raw-sample guard). No
    36	  // legitimate CP1 comparison-summary field is longer; raw telemetry (thousands of samples) is rejected.
    37	  var MAX_BOUNDED_ARRAY = 64; // mirrors the architecture's MAX_CORNERS_COMPARED bound
    38	  var MAX_DEPTH = 8;
    39	  // CP1 round-2 retrofit byte caps (F3). Per-string is small enough to forbid base64-smuggled raw
    40	  // telemetry; envelope total is large enough for the bounded summary architecture v3 §(7) describes
    41	  // but small enough to fail closed if the summary grows unbounded.
    42	  var MAX_STRING_UTF8_BYTES = 4 * 1024;        // 4 KiB per individual string field
    43	  var MAX_ENVELOPE_UTF8_BYTES = 256 * 1024;    // 256 KiB total envelope serialised size
    44	
    45	  // closed own-key set for the envelope (F1). Anything else on the envelope object fails closed.
    46	  var ENVELOPE_KEYS = Object.freeze(['schemaIdentity', 'schemaVersion', 'generatedAt', 'payload']);
    47	  var ENVELOPE_KEY_SET = (function () { var s = Object.create(null); ENVELOPE_KEYS.forEach(function (k) { s[k] = true; }); return s; })();
    48	
    49	  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
    50	  function _isFiniteNumber(n) { return typeof n === 'number' && n === n && n !== Infinity && n !== -Infinity; }
    51	  function _utf8ByteLength(s) {
    52	    // Node Buffer is the cheapest accurate count; fall back to TextEncoder; final fallback walks code units.
    53	    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
    54	    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
    55	    var n = 0;
    56	    for (var i = 0; i < s.length; i++) {
    57	      var c = s.charCodeAt(i);
    58	      if (c < 0x80) n += 1;
    59	      else if (c < 0x800) n += 2;
    60	      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
    61	      else n += 3;
    62	    }
    63	    return n;
    64	  }
    65	
    66	  // structural (NOT telemetry) scan: reject any array longer than the bound, a node deeper than MAX_DEPTH,
    67	  // a non-finite number, an oversized string, an exotic object, or a non-scalar value.
    68	  function _payloadBounded(node, depth, errors, at) {
    69	    if (depth > MAX_DEPTH) { errors.push({ kind: 'too_deep', at: at }); return; }
    70	    if (Array.isArray(node)) {
    71	      if (node.length > MAX_BOUNDED_ARRAY) { errors.push({ kind: 'oversized_array', at: at }); return; }
    72	      for (var i = 0; i < node.length; i++) _payloadBounded(node[i], depth + 1, errors, at + '[' + i + ']');
    73	      return;
    74	    }
    75	    if (_isPlain(node)) { Object.keys(node).forEach(function (k) { _payloadBounded(node[k], depth + 1, errors, at + '.' + k); }); return; }
    76	    // numeric fields must be FINITE — NaN / Infinity / -Infinity all reject (F2).
    77	    if (typeof node === 'number') {
    78	      if (!_isFiniteNumber(node)) errors.push({ kind: 'non_finite_number', at: at });
    79	      return;
    80	    }
    81	    // string fields are length-capped per-field (F3).
    82	    if (typeof node === 'string') {
    83	      if (_utf8ByteLength(node) > MAX_STRING_UTF8_BYTES) errors.push({ kind: 'string_too_long', at: at });
    84	      return;
    85	    }
    86	    // boolean / null are always fine.
    87	    if (node === null || typeof node === 'boolean') return;
    88	    // exotic objects (Date / Map / Set / RegExp / class instances / Proxy / Buffer / typed arrays)
    89	    // — anything object-shaped but not plain and not Array is refused.
    90	    if (typeof node === 'object') { errors.push({ kind: 'exotic_object', at: at }); return; }
    91	    // anything else (function / symbol / bigint / undefined) refuses.
    92	    errors.push({ kind: 'non_scalar', at: at });
    93	  }
    94	
    95	  // map a _payloadBounded error kind to its public reason code.
    96	  function _reasonForErrorKind(kind) {
    97	    if (kind === 'non_finite_number') return CODES.EXPORT_PAYLOAD_NON_FINITE_NUMBER;
    98	    if (kind === 'string_too_long') return CODES.EXPORT_PAYLOAD_STRING_TOO_LONG;
    99	    return CODES.INTERNAL_CONTRACT_VIOLATION; // too_deep / oversized_array / exotic_object / non_scalar
   100	  }
   101	
   102	  // strict envelope own-key check (F1). Returns null when ok or the offending key name.
   103	  function _firstUnknownEnvelopeKey(env) {
   104	    var ks = Object.keys(env);
   105	    for (var i = 0; i < ks.length; i++) if (!ENVELOPE_KEY_SET[ks[i]]) return ks[i];
   106	    return null;
   107	  }
   108	
   109	  // total-envelope-size guard (F3). Serialise the envelope and measure UTF-8 bytes. We only do this
   110	  // when payload is non-null; the empty envelope is trivially small.
   111	  function _envelopeWithinTotalByteCap(env) {
   112	    try {
   113	      var json = JSON.stringify(env);
   114	      if (typeof json !== 'string') return false; // unserialisable — fail closed
   115	      return _utf8ByteLength(json) <= MAX_ENVELOPE_UTF8_BYTES;
   116	    } catch (e) {
   117	      return false; // serialisation threw (e.g. a getter in payload) — fail closed
   118	    }
   119	  }
   120	
   121	  /**
   122	   * buildComparisonExportEnvelope(payload) — envelope constructor (plain-object builder). CP1 does not run a
   123	   * real export, so `payload` defaults to null; if provided it must already be a bounded comparison SUMMARY
   124	   * (no raw arrays). Returns a blocked result if the payload violates the bound.
   125	   */
   126	  function buildComparisonExportEnvelope(payload) {
   127	    if (payload === undefined) payload = null;
   128	    if (payload !== null) {
   129	      if (!_isPlain(payload)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'export payload not an object' });
   130	      var perrs = [];
   131	      _payloadBounded(payload, 0, perrs, '');
   132	      if (perrs.length) return RC.buildBlockedResult([_reasonForErrorKind(perrs[0].kind)], { detail: perrs[0].kind + ':' + perrs[0].at });
   133	    }
   134	    var env = Object.freeze({
   135	      schemaIdentity: COMPARISON_EXPORT_IDENTITY,
   136	      schemaVersion: COMPARISON_EXPORT_SCHEMA_VERSION,
   137	      generatedAt: null, // CP1 stamps no time; a production exporter sets this
   138	      payload: payload,   // null in CP1 — no comparison data is produced yet
   139	    });
   140	    // total-envelope byte cap (F3). A constructed envelope must still fit within the total cap.
   141	    if (!_envelopeWithinTotalByteCap(env)) return RC.buildBlockedResult([CODES.EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE], { detail: 'envelope exceeds MAX_ENVELOPE_UTF8_BYTES' });
   142	    return env;
   143	  }
   144	
   145	  /**
   146	   * validateComparisonExportEnvelope(env) — fail-closed validator.
   147	   *   • non-object / wrong schemaIdentity → INTERNAL_CONTRACT_VIOLATION;
   148	   *   • any schemaVersion other than EXACTLY the current one (−1 / 0 / 0.5 / future / non-number) →
   149	   *     INTERNAL_CONTRACT_VIOLATION (fail-closed; never silently downgraded);
   150	   *   • any unknown envelope own-key → EXPORT_ENVELOPE_UNKNOWN_KEY (F1);
   151	   *   • payload containing a raw/oversized array → INTERNAL_CONTRACT_VIOLATION;
   152	   *   • payload containing non-finite numbers → EXPORT_PAYLOAD_NON_FINITE_NUMBER (F2);
   153	   *   • payload containing oversized strings → EXPORT_PAYLOAD_STRING_TOO_LONG (F3);
   154	   *   • envelope exceeding MAX_ENVELOPE_UTF8_BYTES → EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE (F3).
   155	   */
   156	  function validateComparisonExportEnvelope(env) {
   157	    if (!_isPlain(env)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'envelope not an object' });
   158	    // closed envelope own-key set (F1) — check BEFORE field-by-field so a smuggled secret never reaches
   159	    // the per-field validators on a structurally-plausible envelope.
   160	    var unknown = _firstUnknownEnvelopeKey(env);
   161	    if (unknown !== null) return RC.buildBlockedResult([CODES.EXPORT_ENVELOPE_UNKNOWN_KEY], { detail: 'unknown envelope key: ' + String(unknown).slice(0, 60) });
   162	    if (env.schemaIdentity !== COMPARISON_EXPORT_IDENTITY) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'wrong schema identity' });
   163	    // fail-closed: CP1 recognises EXACTLY this schema version; -1 / 0 / 0.5 / future / non-number all reject.
   164	    if (env.schemaVersion !== COMPARISON_EXPORT_SCHEMA_VERSION) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'unsupported schema version' });
   165	    if (env.payload !== null && env.payload !== undefined) {
   166	      if (!_isPlain(env.payload)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'payload not an object' });
   167	      var errors = [];
   168	      _payloadBounded(env.payload, 0, errors, '');
   169	      if (errors.length) return RC.buildBlockedResult([_reasonForErrorKind(errors[0].kind)], { detail: errors[0].kind + ':' + errors[0].at });
   170	    }
   171	    // total-envelope byte cap (F3).
   172	    if (!_envelopeWithinTotalByteCap(env)) return RC.buildBlockedResult([CODES.EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE], { detail: 'envelope exceeds MAX_ENVELOPE_UTF8_BYTES' });
   173	    return Object.freeze({
   174	      valid: true,
   175	      status: 'comparison_export_envelope_valid',
   176	      schemaIdentity: COMPARISON_EXPORT_IDENTITY,
   177	      schemaVersion: COMPARISON_EXPORT_SCHEMA_VERSION,
   178	      reasonCodes: Object.freeze([]),
   179	    });
   180	  }
   181	
   182	  // the comparison export identity MUST differ from a case-export identity (asserted by the contract tests
   183	  // against the real frozen case-export modules). This helper makes that requirement first-class.
   184	  function isDistinctFromCaseExportIdentity(caseExportIdentity) {
   185	    return caseExportIdentity !== COMPARISON_EXPORT_IDENTITY;
   186	  }
   187	
   188	  var api = {
   189	    COMPARISON_EXPORT_IDENTITY: COMPARISON_EXPORT_IDENTITY,
   190	    COMPARISON_EXPORT_SCHEMA_VERSION: COMPARISON_EXPORT_SCHEMA_VERSION,
   191	    MAX_BOUNDED_ARRAY: MAX_BOUNDED_ARRAY,
   192	    MAX_STRING_UTF8_BYTES: MAX_STRING_UTF8_BYTES,
   193	    MAX_ENVELOPE_UTF8_BYTES: MAX_ENVELOPE_UTF8_BYTES,
   194	    ENVELOPE_KEYS: Object.freeze(ENVELOPE_KEYS.slice()),
   195	    buildComparisonExportEnvelope: buildComparisonExportEnvelope,
   196	    validateComparisonExportEnvelope: validateComparisonExportEnvelope,
   197	    isDistinctFromCaseExportIdentity: isDistinctFromCaseExportIdentity,
   198	  };
   199	  if (typeof module !== 'undefined' && module.exports) module.exports = api;
   200	  if (root) root.R3_0C_ComparisonExportContract = api;
   201	})(typeof globalThis !== 'undefined' ? globalThis : this);

 succeeded in 0ms:
/bin/bash: cannot create temp file for here document: Operation not permitted
renderer/js/case-record-schema.js:2: * case-record-schema.js — R3.0B: local-record sanitization + portable-bundle build/validate (PURE).
renderer/js/case-record-schema.js:11: * logged in meta.excludedFields (schema-owned tokens, never source keys); >EXCL_CAP exclusions → reject.
renderer/js/case-record-schema.js:12: * validatePortableBundle(bundle) re-enforces on import AND fail-closes on an unsupported FUTURE schemaVersion
renderer/js/case-record-schema.js:96:    top: ['caseId', 'recordType', 'schemaVersion', 'metadata', 'associations', 'setupSnapshot', 'setupSnapshotSummary', 'analysisResults', 'shellEvidence', 'sanitizedEvidenceSummary', 'telemetrySourceRef'],
renderer/js/case-record-schema.js:122:      meta: { schemaVersion: BUNDLE_SCHEMA_VERSION, recordType: recordType, excludedFields: [] },
renderer/js/case-record-schema.js:147:    meta: ['schemaVersion', 'recordType', 'excludedFields'],
renderer/js/case-record-schema.js:181:    if (!(b.meta && Number.isInteger(b.meta.schemaVersion))) return 'meta.schemaVersion';
renderer/js/case-record-schema.js:222:    var v = bundle.meta.schemaVersion;
governance/r3.0c/checkpoint-manifest.schema.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoint-manifest.schema.json:4:  "title": "R3.0C Checkpoint Evidence Manifest — schema",
governance/r3.0c/checkpoint-manifest.schema.json:5:  "note": "Format for governance/r3.0c/checkpoints/<CHECKPOINT_ID>.json. C0 establishes the schema and writes its own manifest as 'pending'; final PASS is expressed by the trusted-verification artifact bound to artifactBoundSha. The checkpoint manifest never self-asserts PASS — only the CI artifact does.",
governance/r3.0c/checkpoint-manifest.schema.json:32:    "checkpoint": "ID present in schema.json.checkpoints.",
governance/r3.0c/schema.json:2:  "schemaVersion": 1,
governance/r3.0c/schema.json:4:  "title": "R3.0C Integrated Delivery Governance — schema",
governance/r3.0c/schema.json:5:  "note": "Defines the legal universe of checkpoints, capabilities, and transitions for the R3.0C Integrated Delivery Train. A checkpoint or capability whose ID is not listed here is unknown and must FAIL validation. C0 establishes the schema; checkpoints C1..C8 are NOT yet authorized — they describe future intent so the validator can refuse premature activation.",
governance/r3.0c/schema.json:55:    "feature_registry_active",
governance/r3.0c/schema.json:56:    "phase_boundary_contract",
governance/r3.0c/schema.json:63:    "phase_boundary_contract",
governance/r3.0c/schema.json:78:    "feature_registry_active"
governance/r3.0c/schema.json:93:    "feature_registry_active": "C8_ACTIVATION",
governance/r3.0c/schema.json:94:    "phase_boundary_contract": "C5R_CP1_RETROFIT",
governance/r3.0c/codex-checkpoint-evidence/C6/round-1-eff0d41.md:52:D. F6 phase gate preservation [phase metrics with values still report availability:false]
governance/r3.0c/codex-checkpoint-evidence/C6/round-1-eff0d41.md:60:I. Schema closure [envelope still has ONLY {schemaIdentity, schemaVersion, generatedAt, payload}]
governance/r3.0c/codex-checkpoint-evidence/C6/round-4-48be2c0-PASS.md:14:bounded data, G numerics, H adapter delegation, I schema closure,
governance/r3.0c/codex-checkpoint-evidence/C6/round-4-48be2c0-PASS.md:86:The C5 authenticity predicate is now mandatory and fails closed when unavailable. All prior authority, mutation, Proxy, identifier, schema, determinism, adapter, and governance probes remain closed.
governance/r3.0c/codex-checkpoint-evidence/C6/round-2-2b6e568.md:66:   - The listed path and URI examples are blocked; standalone filenames remain exportable.
governance/r3.0c/codex-checkpoint-evidence/C6/round-2-2b6e568.md:69:Round-one lenses B/C/D/E/G/H/I/J remain closed, and the phase gate, schema closure, determinism, adapter delegation, and governance integrity remain intact. The authenticity and hostile-object boundaries are still bypassable, and the stated filename privacy rule is incomplete.
governance/r3.0c/checkpoints/C4.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C4.json:24:    "feature_registry_active"
governance/r3.0c/checkpoints/C4.json:62:  "note": "C4 reference-and-corner: three new renderer/js production services (reference-selection, corner-segmentation, corner-pairing) plus a new contract module (contracts/r3.0c/reference-and-corner-contract.js, registered in index.js). Sixteen new reason codes split the reference / corner-segmentation / corner-pairing / corner-confirmation refusal semantics (35 → 51 total). Three new capabilities (reference_selection_present, corner_segmentation_present, corner_pairing_present) unlocked at C4_REFERENCE_AND_CORNER. Reference-selection refuses any non-user selection mode per the scope pin (governance/r3.0/train.schema.json :: referenceSelectionPolicy.explicitUserSelectionOnly === true) and refuses caller-forged authoritative flags lacking lapId/sourceId/selectedAt. Corner segmentation is a deterministic data-driven PROPOSAL with full-vs-reduced authority tiers, fingerprint identities (algorithmVersion + rounded normalized start/end), short/overlapping/wrap-spanning candidate fail-closed, and applyUserConfirmation that lifts ONLY proposal authority (telemetry credibility never upgraded — CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY). Corner pairing requires ≥50% normalized overlap, refuses ordinal pairing and one-to-many ambiguity, surfaces partial coverage (<80%) as a limitation. Adapter gains pure-passthrough selectReference / segmentCorners / applyCornerUserConfirmation / pairCorners / referenceAndCornerForbiddenSelectionModes. State-aware validators (scripts/check-r3-0c-no-consumer.js, scripts/check-r3-0c-guard.js) generalised at C1 automatically extend allowance to the three new renderer/js paths — NO validator weakening at C4. The trusted-verification artifact bound to headSha is the PASS authority; headSha / workflowRunId / artifactId / artifactBoundSha / codexVerdict / createdAt are intentionally null in-commit."
governance/r3.0c/checkpoints/C0.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C0.json:22:    "feature_registry_active"
governance/r3.0c/checkpoints/C3.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C3.json:24:    "feature_registry_active"
governance/r3.0c/capabilities.json:2:  "schemaVersion": 1,
governance/r3.0c/capabilities.json:15:      "description": "R3.0C Integrated Delivery Governance scaffold present: schema, state, capabilities, checkpoint-manifest schema, three fail-closed validators, and trusted-verification integration."
governance/r3.0c/capabilities.json:60:      "description": "Comparison export schema implementation honouring comparison-export-contract."
governance/r3.0c/capabilities.json:67:    "feature_registry_active": {
governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/cp1-retrofit-matrix.md:29:| F1 | Critical | **OPEN-HIGH** | `contracts/r3.0c/comparison-export-contract.js` (validateComparisonExportEnvelope: closed envelope own-key set; closed payload top-level shape) | `tests/r3.0c-contract-foundation.test.js` (envelope closed-key + smuggled-secret reject) | C5R (this retrofit) | envelope currently only knows `schemaIdentity / schemaVersion / generatedAt / payload`; reject any other own-key fail-closed |
governance/r3.0c/cp1-retrofit-matrix.md:33:| F5 | Critical | **OPEN-HIGH** | `contracts/r3.0c/comparison-eligibility-contract.js` (identity schema: add `positionBasis`, `positionDirection`; hard-block missing / mismatched); `contracts/r3.0c/reason-codes.js` (new: `MISSING_POSITION_BASIS`, `INCOMPATIBLE_POSITION_BASIS`, `MISSING_POSITION_DIRECTION`, `INCOMPATIBLE_POSITION_DIRECTION`) | `tests/r3.0c-contract-foundation.test.js` (each new code triggered exactly when expected; existing codes unaffected) | C5R | brings v2 contract identity in line with architecture v3 §(1) |
governance/r3.0c/cp1-retrofit-matrix.md:34:| F6 | Major | **OPEN-HIGH (governance lock)** | `contracts/r3.0c/delta-metrics-contract.js` (the four corner-scope metrics — `sector_delta / entry_delta / mid_delta / exit_delta` — gated by `phaseBoundaryContractAuthorised` capability; without it → fail-closed `PHASE_BOUNDARY_CONTRACT_UNAUTHORISED`); `governance/r3.0c/capabilities.json` (add `phase_boundary_contract`: `enabled: false` until a real boundary contract ships) | `tests/r3-0c-delta-metrics.test.js` (phase-scope metrics blocked when capability `false`; allowed when `true` AND a phase-boundary payload is provided) | C5R | conditional: corner-scope metrics not blocked entirely; sector_delta still permissive once a corner pair exists, but entry/mid/exit specifically require the boundary contract |
governance/r3.0c/codex-ca-gate-evidence/round-2-e3ac3d6.md:62:  4. Read governance/r3.0c/{capabilities,schema}.json.
governance/r3.0c/codex-ca-gate-evidence/round-2-e3ac3d6.md:70:  - F1 envelope: try { schemaIdentity, schemaVersion, generatedAt,
governance/r3.0c/checkpoints/C2.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C2.json:24:    "feature_registry_active"
governance/r3.0c/checkpoints/C2.json:60:  "note": "C2 lap authority: three new renderer/js production services (lap-authority, track-identity, distance-authority) re-derive the comparison contract's authority claims from raw lap evidence rather than trusting caller-supplied descriptors. The contract layer is the single source of truth for reason-code emission; services only produce the descriptor shapes the contract validates. ONE new reason code is added to contracts/r3.0c/reason-codes.js as a third documented extension — METRIC_REQUIRED_CHANNEL_UNAVAILABLE — to express partial-channel gating per metric (the metric is in SUPPORTED_METRICS but the raw channels the lap evidence carries do not include the ones the metric requires). algorithmsAllowed flips true (C2 is the algorithmCheckpoint per schema.json). No UI, no feature activation, no normalization-distance algorithm, no corner segmentation, no delta metric computation, no reference-lap selection, no export — those remain locked behind C3..C8. Thresholds (coverage 0.95 / minimumSamples 200 / normalizedMaxGap 0.02 / timeGapSeconds 0.5) are the directive's candidate values, fixture-validated across the 16-fixture matrix in tests/r3-0c-lap-authority.test.js, and labelled calibrationStatus='fixture_derived_pending_field_validation'. Every eligible lap-authority result carries the limitation string 'thresholds_fixture_calibrated_not_field_validated' on its evidence side-channel so the downstream credibility layer cannot upgrade the calibration claim beyond what the fixture matrix supports. The state-aware validators (scripts/check-r3-0c-no-consumer.js, scripts/check-r3-0c-guard.js) were generalized at C1 and automatically extend the allowance to the three new renderer/js paths — NO validator weakening at C2. The trusted-verification artifact bound to headSha is the PASS authority — headSha / workflowRunId / artifactId / artifactBoundSha / codexVerdict / createdAt are intentionally null in-commit."
governance/r3.0c/state.json:2:  "schemaVersion": 1,
governance/r3.0c/state.json:22:  "declaredButDisabledGovernanceCapabilities": ["phase_boundary_contract"],
governance/r3.0c/state.json:27:  "note": "R3.0C C7_UI state. Adds the Comparison Workspace UI: three new authorized renderer/js paths (r3-0c-comparison-orchestrator.js, r3-0c-comparison-viewmodel.js, i18n-comparisons.js) all bound to the new ui_present capability. The orchestrator owns request-token issuance + framing emission (composes C5 delta-metrics + C6 export); the viewmodel is the pure state machine consuming orchestrator output, implementing the 7 transition triggers + stale-token drop per contracts/r3.0c/viewmodel-state-transition-contract.js. The framing-source contract (contracts/r3.0c/framing-i18n-key-registry.js) is enabled: every framing entry the orchestrator emits is validated against a closed allowlist of i18nKeys before reaching the viewmodel; the viewmodel re-validates as defense in depth. uiAllowed flips true: the Comparison Workspace pane replaces the deferred placeholder in renderer/index.html. featureRegistryActivationAllowed remains false: the three R3.0C feature IDs (case_comparison, reference_lap, corner_delta) remain availability='deferred' with NO rendererAdapter until C8 authorizes activation — C7 ships the UI surface without activating the routes. phase_boundary_contract remains the only declared-but-disabled governance capability: phase metrics (entry/mid/exit_delta) are reported metricAvailability:false in both viewmodel and export until a future checkpoint authorizes a deterministic phase-boundary contract."
governance/r3.0c/checkpoints/C5.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C5.json:24:    "feature_registry_active"
governance/r3.0c/checkpoints/C5R.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C5R.json:34:  "newlyDeclaredCapabilitiesDisabled": ["phase_boundary_contract", "viewmodel_state_transition_contract", "framing_source_structured_contract"],
governance/r3.0c/checkpoints/C5R.json:38:    "feature_registry_active"
governance/r3.0c/checkpoints/C5R.json:84:    "F6": { "lens": "G_corner+H_honesty", "title": "phase metrics derivable without service-owned boundary contract", "fix": "PHASE_SCOPE_METRICS gated by policy.phaseBoundaryAuthorisation; capability disabled; sector_delta unaffected", "files": ["contracts/r3.0c/delta-metrics-contract.js", "governance/r3.0c/capabilities.json", "governance/r3.0c/schema.json"] },
governance/r3.0c/checkpoints/C5R.json:102:  "schemaSurface": {
governance/r3.0c/checkpoints/C5R.json:115:  "createdAtNote": "Filled with the PR #17 merge timestamp (gh pulls/17 mergedAt) so the value is bound to a CI-verifiable moment, not to a local clock. The original draft of this manifest at commit 2390df4 carried null per checkpoint-manifest.schema convention.",
governance/r3.0c/checkpoints/C5R.json:120:  "note": "C5R is a retrofit checkpoint. It does NOT advance any productionCapability beyond C5; enabledCapabilitiesBefore === enabledCapabilitiesAfter. It brings the C1-C5 surface into honesty alignment with the formal Codex C-A round-2 BLOCK adjudication (F1-F12 closure detailed above). The retrofit modifies one already-authorised production file (renderer/js/r3-0c-corner-segmentation.js — bounded O(n^2) overlap-scan extension, no algorithm replacement) and four contracts; declares three new governance-capabilities (phase_boundary_contract / viewmodel_state_transition_contract / framing_source_structured_contract — all DISABLED) that gate the deferred C7_UI surface; persists Codex C-A evidence in tiered form under governance/r3.0c/codex-ca-gate-evidence/; and explicitly separates reviewedCandidateSha / manifestCommitSha / integrationSha so future audits cannot conflate them. The trusted-verification artifact bound to the eventual Train integrationSha is the PASS authority for THAT integration; reviewedCandidateSha is the PASS authority only for the pre-merge retrofit candidate. headSha / workflowRunId / artifactId / artifactBoundSha / createdAt are intentionally null in-commit, mirroring the existing C0-C5 manifest convention. status='pending' per the same convention; PASS lives in the trusted-verification artifact, not in this file."
governance/r3.0c/checkpoints/C1.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C1.json:23:    "feature_registry_active"
governance/r3.0c/checkpoints/C7.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C7.json:45:    "feature_registry_active"
governance/r3.0c/checkpoints/C7.json:71:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/checkpoints/C7.json:96:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/checkpoints/C6.json:2:  "schemaVersion": 1,
governance/r3.0c/checkpoints/C6.json:39:    "feature_registry_active"
governance/r3.0c/checkpoints/C6.json:77:    "envelopeKeys": ["schemaIdentity", "schemaVersion", "generatedAt", "payload"],
governance/r3.0c/checkpoints/C6.json:107:    "phaseGatePreservation": "PHASE_SCOPE_METRICS (entry/mid/exit_delta) are reported metricAvailability:false in the export while phase_boundary_contract.enabled is false (F6 governance gate carried from CP1R)."
governance/r3.0c/checkpoints/C6.json:123:  "note": "C6 Comparison Export. Adds ONE production capability (comparison_export_present) backed by renderer/js/r3-0c-comparison-export.js. The service is a closed-allowlist gateway: it validates input authority, rebuilds a plain payload from explicit allowlist fields (never spreads the caller's result), invokes contracts/r3.0c/comparison-export-contract.js for envelope construction + bounds, then JSON.serialize → parse → re-validate for deterministic round-trip equivalence. Stale-result guard: result.identity must match association. F6 governance gate preserved: phase metrics report metricAvailability:false until phase_boundary_contract.enabled becomes true. Blocked-result export contains only status / reasonCodes / limitations / identity / nextValidationAction — no fabricated metrics, no raw telemetry, no per-sample arrays, no exotic objects. No UI activation. No feature-registry change. C6 adversarial Codex review + Train target-context CI will fill the null SHA / verdict / artifact fields per the SHA-separation discipline before integration."
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:89:   • `phase_boundary_contract.enabled` must remain false at C7.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:94:   • Verify governance/r3.0c/checkpoints/C7.json `enabledCapabilitiesAfter` includes `ui_present`, `viewmodel_state_transition_contract`, `framing_source_structured_contract` BUT does NOT include `case_comparison`, `reference_lap`, `corner_delta`, `feature_registry_active`.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:96:   • Verify `phase_boundary_contract.enabled` is still false in governance/r3.0c/capabilities.json.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:102:J. Frozen physics + R3.0B persistence schema must remain untouched
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:103:   • Grep for any modification to physics/dynamics/preset definitions or R3.0B portable case schema. None permitted.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:177:/bin/bash -lc "rg -n \"registerAuthentic|setAssociation|_safeGet|paramsRaw|latestToken|_clearAndPlaceholder|R3_0C_Comparison|UI_INITIALIZATION|catch \\(e\\)|phase|placeholder\\.idle\" renderer/index.html renderer/js/r3-0c-comparison-{orchestrator,viewmodel}.js contracts/r3.0c/framing-i18n-key-registry.js tests/r3-0c-comparison-workspace.test.js governance/r3.0c/{checkpoints/C7.json,capabilities.json} governance/r3.0/train.json && git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a | rg \"physics|dynamics|preset|schema|r3.0b\" || true" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:218:renderer/js/r3-0c-comparison-viewmodel.js:126:        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:241:governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:258:renderer/js/r3-0c-comparison-orchestrator.js:19: * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:275:renderer/js/r3-0c-comparison-orchestrator.js:211:      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:289:governance/r3.0c/checkpoints/C7.json:69:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:291:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:292:renderer/index.html:256:  <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:298:renderer/index.html:3256:     placeholder.idle state — the three R3.0C feature IDs remain availability='deferred' until
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:316:/bin/bash -lc "nl -ba renderer/index.html | sed -n '3240,3310p;3895,3935p' && rg -n \"<script["'^>]+src=" renderer/index.html | tail -40 && nl -ba renderer/js/r3-0c-comparison-viewmodel.js | sed -n '"'45,180p;205,270p' && nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '80,120p;185,205p;315,330p' && nl -ba contracts/r3.0c/framing-i18n-key-registry.js | sed -n '70,150p' && jq '{currentCheckpoint,phaseStates}' governance/r3.0/train.json; jq '{enabledCapabilitiesAfter,status}' governance/r3.0c/checkpoints/C7.json; jq '.capabilities.phase_boundary_contract // .phase_boundary_contract' governance/r3.0c/capabilities.json" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:321:  3243	<script src="js/schema-migration.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:322:  3244	<script src="js/case-record-schema.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:334:  3256	     placeholder.idle state — the three R3.0C feature IDs remain availability='deferred' until
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:453:3243:<script src="js/schema-migration.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:454:3244:<script src="js/case-record-schema.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:551:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1172:  ✓ probe: report schema stable (probe_only, arrays, unknowns)
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1233:  ✓ confirm: report schema (scores + blockers + nextEvidenceNeeded + canonical blocked)
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1478:=== canonical-parameters schema tests ===
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1524:schema-migration: 9 passed, 0 failed
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1525:case-record-schema: 63 passed, 0 failed
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1728:    43	    "feature_registry_active"
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1754:    69	    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1779:    94	  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1848:- Frozen physics/dynamics/presets and R3.0B persistence schema are untouched.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1975:- Frozen physics/dynamics/presets and R3.0B persistence schema are untouched.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:82:   • Phase metrics still forced unavailable while phase_boundary_contract.enabled === false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:89:   • governance/r3.0c/checkpoints/C7.json enabledCapabilitiesAfter includes ui_present, viewmodel_state_transition_contract, framing_source_structured_contract; does NOT include case_comparison / reference_lap / corner_delta / feature_registry_active.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:90:   • governance/r3.0c/capabilities.json phase_boundary_contract.enabled is still false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:95:   • R3.0B portable case schema: untouched.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:556:-    "test": "node tests/verify-dynamics.js && node tests/telemetry-core.test.js && node tests/telemetry-view.test.js && node tests/telemetry-plot.test.js && node tests/telemetry-interact.test.js && node tests/telemetry-yaw.test.js && node tests/canonical-parameters.test.js && node tests/parameter-conversions.test.js && node tests/vehicle-profile-f312.test.js && node tests/setup-snapshot.test.js && node tests/analysis-case.test.js && node tests/analysis-case-adversarial.test.js && node tests/suspension-input-normalizer.test.js && node tests/suspension-input-equivalence.test.js && node tests/suspension-input-adversarial.test.js && node tests/canonical-model-input.test.js && node tests/analysis-execution.test.js && node tests/telemetry-observation.test.js && node tests/model-telemetry-comparison.test.js && node tests/race-engineer-insight.test.js && node tests/driver-coach-insight.test.js && node tests/analysis-workspace.test.js && node tests/analysis-workspace-viewmodel.test.js && node tests/analysis-workspace-integration.test.js && node tests/analysis-workspace-ui.test.js && node tests/telemetry-import-adapter.test.js && node tests/channel-mapping.test.js && node tests/calibration-registry.test.js && node tests/analysis-window.test.js && node tests/canonical-telemetry-session.test.js && node tests/analysis-case-export.test.js && node tests/r2.3-real-telemetry-integration.test.js && node tests/r2.3-import-ui.test.js && node tests/measured-metrics.test.js && node tests/r2.4-measured-metrics-integration.test.js && node tests/r2.4-ui.test.js && node tests/setup-ab.test.js && node tests/quantitative-setup-recommendation.test.js && node tests/r2.5-setup-ab-quantitative-integration.test.js && node tests/r2.5-ui.test.js && node tests/track-intelligence.test.js && node tests/r2.6-track-intelligence-integration.test.js && node tests/r2.6-ui.test.js && node tests/case-shell.test.js && node tests/r3.0a-ui.test.js && node tests/storage-backend.test.js && node tests/schema-migration.test.js && node tests/case-record-schema.test.js && node tests/case-store.test.js && node tests/session-store.test.js && node tests/case-library-viewmodel.test.js && node tests/r3.0b-ui.test.js && node tests/r3.0b-persistence-integration.test.js && node tests/feature-registry.test.js && node tests/feature-router.test.js && node tests/vehicle-preset-pipeline.test.js && node tests/i18n-parity.test.js && node tests/r3.0c-contract-foundation.test.js && node tests/r3-0c-comparison-adapter.test.js && node tests/r3-0c-lap-authority.test.js && node tests/r3-0c-track-identity.test.js && node tests/r3-0c-distance-authority.test.js && node tests/r3-0c-normalized-distance.test.js && node tests/r3-0c-reference-selection.test.js && node tests/r3-0c-corner-segmentation.test.js && node tests/r3-0c-corner-pairing.test.js && node tests/r3-0c-delta-metrics.test.js && node tests/r3-0c-comparison-export.test.js && node tests/r3-0c-comparison-workspace.test.js && node tests/r3-0c-governance.test.js && node tests/r3-0c-no-consumer.test.js && node tests/r3-0c-governance-integrity.test.js && node tests/r3-0-phase-governance.test.js && node tests/r3-0-phase-no-consumer.test.js && node tests/r3-0-phase-governance-integrity.test.js && node tests/r3-0-train.test.js && node tools/validate-against-telemetry.js --selftest",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:557:+    "test": "node tests/verify-dynamics.js && node tests/telemetry-core.test.js && node tests/telemetry-view.test.js && node tests/telemetry-plot.test.js && node tests/telemetry-interact.test.js && node tests/telemetry-yaw.test.js && node tests/canonical-parameters.test.js && node tests/parameter-conversions.test.js && node tests/vehicle-profile-f312.test.js && node tests/setup-snapshot.test.js && node tests/analysis-case.test.js && node tests/analysis-case-adversarial.test.js && node tests/suspension-input-normalizer.test.js && node tests/suspension-input-equivalence.test.js && node tests/suspension-input-adversarial.test.js && node tests/canonical-model-input.test.js && node tests/analysis-execution.test.js && node tests/telemetry-observation.test.js && node tests/model-telemetry-comparison.test.js && node tests/race-engineer-insight.test.js && node tests/driver-coach-insight.test.js && node tests/analysis-workspace.test.js && node tests/analysis-workspace-viewmodel.test.js && node tests/analysis-workspace-integration.test.js && node tests/analysis-workspace-ui.test.js && node tests/telemetry-import-adapter.test.js && node tests/channel-mapping.test.js && node tests/calibration-registry.test.js && node tests/analysis-window.test.js && node tests/canonical-telemetry-session.test.js && node tests/analysis-case-export.test.js && node tests/r2.3-real-telemetry-integration.test.js && node tests/r2.3-import-ui.test.js && node tests/measured-metrics.test.js && node tests/r2.4-measured-metrics-integration.test.js && node tests/r2.4-ui.test.js && node tests/setup-ab.test.js && node tests/quantitative-setup-recommendation.test.js && node tests/r2.5-setup-ab-quantitative-integration.test.js && node tests/r2.5-ui.test.js && node tests/track-intelligence.test.js && node tests/r2.6-track-intelligence-integration.test.js && node tests/r2.6-ui.test.js && node tests/case-shell.test.js && node tests/r3.0a-ui.test.js && node tests/storage-backend.test.js && node tests/schema-migration.test.js && node tests/case-record-schema.test.js && node tests/case-store.test.js && node tests/session-store.test.js && node tests/case-library-viewmodel.test.js && node tests/r3.0b-ui.test.js && node tests/r3.0b-persistence-integration.test.js && node tests/feature-registry.test.js && node tests/feature-router.test.js && node tests/vehicle-preset-pipeline.test.js && node tests/i18n-parity.test.js && node tests/r3.0c-contract-foundation.test.js && node tests/r3-0c-comparison-adapter.test.js && node tests/r3-0c-lap-authority.test.js && node tests/r3-0c-track-identity.test.js && node tests/r3-0c-distance-authority.test.js && node tests/r3-0c-normalized-distance.test.js && node tests/r3-0c-reference-selection.test.js && node tests/r3-0c-corner-segmentation.test.js && node tests/r3-0c-corner-pairing.test.js && node tests/r3-0c-delta-metrics.test.js && node tests/r3-0c-comparison-export.test.js && node tests/r3-0c-comparison-workspace.test.js && node tests/r3-0c-contracts-bundle-equivalence.test.js && node tests/r3-0c-governance.test.js && node tests/r3-0c-no-consumer.test.js && node tests/r3-0c-governance-integrity.test.js && node tests/r3-0-phase-governance.test.js && node tests/r3-0-phase-no-consumer.test.js && node tests/r3-0-phase-governance-integrity.test.js && node tests/r3-0-train.test.js && node tools/validate-against-telemetry.js --selftest",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:586:           "target": "portable",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:629:      availability='deferred' until C8_ACTIVATION wires the rendererAdapter). The pane is gated by
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:670:   <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:803: <script src="js/telemetry-schema.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:845: <script src="js/schema-migration.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:846: <script src="js/case-record-schema.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:858:-     placeholder.idle state — the three R3.0C feature IDs remain availability='deferred' until
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1435:  * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1657:       // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2567:    19	 * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2759:   211	      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2934:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3522:  3246	<script src="js/schema-migration.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3523:  3247	<script src="js/case-record-schema.js"></script>
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3739:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4265:  ✓ probe: report schema stable (probe_only, arrays, unknowns)
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4326:  ✓ confirm: report schema (scores + blockers + nextEvidenceNeeded + canonical blocked)
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4571:=== canonical-parameters schema tests ===
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4617:schema-migration: 9 passed, 0 failed
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4618:case-record-schema: 63 passed, 0 failed
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4652:/bin/bash -lc "node tests/r3-0c-comparison-workspace.test.js; node tests/r3-0c-contracts-bundle-equivalence.test.js; node tests/r3-0c-governance.test.js; node tests/r3-0c-no-consumer.test.js; node tests/r3-0c-governance-integrity.test.js; node tests/r3-0-train.test.js; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..ae039008 | rg '("'^|/)(physics|dynamics|preset|case-record-schema|portable)'"' || true; node - <<'NODE'
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4653:const c=require('./governance/r3.0c/checkpoints/C7.json'); const caps=require('./governance/r3.0c/capabilities.json'); const train=require('./governance/r3.0/train.json'); console.log(JSON.stringify({enabledCapabilitiesAfter:c.enabledCapabilitiesAfter,phase:caps.phase_boundary_contract,train:{currentPhaseCheckpoint:train.currentPhaseCheckpoint,trainStatus:train.trainStatus}},null,2));
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4767:/bin/bash -lc "node -e \"const F=require('./contracts/r3.0c/framing-i18n-key-registry'); const R=require('./contracts/r3.0c/reason-codes').REASON_CODES; const target={reasonCode:R.CANNOT_DISTINGUISH,i18nKey:'r3_0c.framing.cannot_distinguish'}; Object.defineProperty(target,'params',{configurable:true,enumerable:true,get(){throw Error('ACCESSOR EXECUTED')}}); const p=new Proxy(target,{getOwnPropertyDescriptor(t,k){if(k==='params')return {configurable:true,enumerable:true,writable:true,value:undefined}; return Reflect.getOwnPropertyDescriptor(t,k)}}); console.log(F.validateFramingEntry(p)); try{console.log(p.params)}catch(e){console.log(e.message)}\"; node -e \"const c=require('./governance/r3.0c/checkpoints/C7.json'),p=require('./governance/r3.0c/capabilities.json'),t=require('./governance/r3.0/train.json'); console.log(c.enabledCapabilitiesAfter); console.log(p.phase_boundary_contract); console.log(t.currentPhaseCheckpoint,t.trainStatus)\"; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..ae039008 | rg '("'^|/)(physics|dynamics|preset|case-record-schema|portable)'"' || true; nl -ba contracts/r3.0c/framing-i18n-key-registry.js | sed -n '70,165p'; nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '145,165p'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4910:/bin/bash -lc "rg -n 'phase_boundary_contract|\"enabled\"|case_comparison|reference_lap|corner_delta|feature_registry_active' governance/r3.0c/capabilities.json governance/r3.0c/checkpoints/C7.json; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..ae039008 | rg '("'^|/)(core|physics|dynamics|presets?|case-record-schema|portable)'"' || true; git status --short; node tests/vehicle-preset-pipeline.test.js | tail -n 2" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4912:governance/r3.0c/checkpoints/C7.json:43:    "feature_registry_active"
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4913:governance/r3.0c/checkpoints/C7.json:69:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4916:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4917:governance/r3.0c/capabilities.json:67:    "feature_registry_active": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4919:governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4959:    43	    "feature_registry_active"
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4967:    60	      "description": "Comparison export schema implementation honouring comparison-export-contract."
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4974:    67	    "feature_registry_active": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4979:    72	    "phase_boundary_contract": {

exec
/bin/bash -lc "nl -ba renderer/js/r3-0c-comparison-viewmodel.js | sed -n '1,360p'; rg -n \"registerAuthentic|isAuthentic|_r3cC7Authentic|createOrchestrator|return Object.freeze\" renderer/js/r3-0c-comparison-{orchestrator,viewmodel}.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
     1	/**
     2	 * renderer/js/r3-0c-comparison-viewmodel.js — R3.0C C7 · Comparison Workspace ViewModel.
     3	 *
     4	 * Per SKYLINE Continuous Delivery Master Directive §七 C7 + docs/r3.0c-state-transition-contract.md:
     5	 * pure state machine consuming orchestrator output. Implements the 7 transition triggers, the
     6	 * generation-token discipline, the placeholder shapes, and the stale-token drop rule from
     7	 * contracts/r3.0c/viewmodel-state-transition-contract.js.
     8	 *
     9	 * PURE: no DOM access, no Alpine binding, no global mutation. The Alpine layer calls
    10	 * createComparisonViewModel({orchestrator}) once, stores the reference in a non-reactive holder,
    11	 * and reads getState() during render. setReference / setComparison / setAssociation /
    12	 * setChannelMapping / notifyCaseReopen / notifyAuthorityRevoked are the only mutators.
    13	 *
    14	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
    15	 */
    16	(function (root) {
    17	  'use strict';
    18	
    19	  var Contracts = null;
    20	  if (typeof module !== 'undefined' && module.exports) {
    21	    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
    22	  }
    23	  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
    24	  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-viewmodel.js requires contracts/r3.0c/index.js');
    25	
    26	  var RC = Contracts.reasonCodes;
    27	  var CODES = RC.REASON_CODES;
    28	  var VST = Contracts.viewmodelStateTransition;
    29	  var DMC = Contracts.deltaMetrics;
    30	
    31	  var SERVICE_VERSION = 1;
    32	  var CHECKPOINT_FLOOR = 'C7_UI';
    33	
    34	  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
    35	
    36	  /**
    37	   * createComparisonViewModel(deps) — factory. deps = { orchestrator, capabilities }.
    38	   * The viewmodel refuses to operate when capabilities.viewmodelStateTransitionContractEnabled
    39	   * is false (the contract is gated by capability — until C7 ships it is disabled).
    40	   */
    41	  function createComparisonViewModel(deps) {
    42	    if (!_isPlain(deps)) throw new Error('createComparisonViewModel requires deps');
    43	    if (!_isPlain(deps.orchestrator) || typeof deps.orchestrator.requestComparison !== 'function') throw new Error('createComparisonViewModel requires orchestrator');
    44	    if (!_isPlain(deps.capabilities)) throw new Error('createComparisonViewModel requires capabilities');
    45	    var orch = deps.orchestrator;
    46	    var caps = deps.capabilities;
    47	    if (!caps.viewmodelStateTransitionContractEnabled) throw new Error('viewmodel_state_transition_contract capability disabled — viewmodel must not be instantiated');
    48	
    49	    // Internal state (PRIVATE — never exposed; getState() returns a defensive copy).
    50	    var _state = {
    51	      placeholder: VST.PLACEHOLDER_STATES.IDLE,
    52	      reference: null,         // user-selected reference lap descriptor
    53	      comparison: null,        // user-selected comparison lap descriptor
    54	      association: null,       // case + session + track + layout + basis + direction
    55	      channelMapping: null,    // confirmed channel mapping snapshot
    56	      caseRecord: null,        // R3.0B case record (for context binding)
    57	      latestToken: 0,          // last token issued (commit gate)
    58	      result: null,            // committed orchestrator response
    59	      framing: null,           // committed framing (orchestrator-validated)
    60	      blockedReasons: [],
    61	      limitations: [],
    62	      exportGate: false,
    63	      metricAvailability: _defaultMetricAvailability(),
    64	    };
    65	
    66	    function _defaultMetricAvailability() {
    67	      var out = {};
    68	      DMC.SUPPORTED_DELTA_METRICS.forEach(function (m) { out[m] = false; });
    69	      return out;
    70	    }
    71	
    72	    function _clearAndPlaceholder(triggerName) {
    73	      // Codex C7 finding C7-A1 closure: advance latestToken on EVERY trigger so that any
    74	      // in-flight orchestrator response that hasn't committed yet is invalidated. Without this,
    75	      // a trigger like notifyAuthorityRevoked that does not itself issue a new request would
    76	      // leave latestToken unchanged, allowing a delayed eligible response to overwrite the
    77	      // revoked-placeholder state.
    78	      _state.latestToken = _state.latestToken + 1;
    79	      var placeholder = VST.placeholderForTrigger(triggerName);
    80	      _state.placeholder = placeholder;
    81	      _state.result = null;
    82	      _state.framing = null;
    83	      _state.blockedReasons = [];
    84	      _state.limitations = [];
    85	      _state.exportGate = false;
    86	      _state.metricAvailability = _defaultMetricAvailability();
    87	    }
    88	
    89	    function _commit(response) {
    90	      if (!_isPlain(response)) {
    91	        _state.placeholder = VST.PLACEHOLDER_STATES.BLOCKED;
    92	        _state.blockedReasons = [CODES.INTERNAL_CONTRACT_VIOLATION];
    93	        _state.result = null;
    94	        _state.framing = null;
    95	        _state.exportGate = false;
    96	        return;
    97	      }
    98	      // Stale-token drop rule (defense in depth — orchestrator already echoes back the token).
    99	      if (VST.isResultStale(response.generationToken, _state.latestToken)) return;
   100	      _state.framing = response.framing || null;
   101	      _state.limitations = response.limitations ? response.limitations.slice() : [];
   102	      if (response.status === 'eligible') {
   103	        _state.placeholder = VST.PLACEHOLDER_STATES.READY;
   104	        _state.result = response.result || null;
   105	        _state.blockedReasons = [];
   106	        _state.exportGate = response.exportGate === true;
   107	        _state.metricAvailability = _buildMetricAvailability(response.result);
   108	      } else if (response.status === 'unavailable') {
   109	        _state.placeholder = VST.PLACEHOLDER_STATES.UNAVAILABLE;
   110	        _state.result = null;
   111	        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [];
   112	        _state.exportGate = false;
   113	      } else {
   114	        _state.placeholder = VST.PLACEHOLDER_STATES.BLOCKED;
   115	        _state.result = null;
   116	        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [CODES.INTERNAL_CONTRACT_VIOLATION];
   117	        _state.exportGate = false;
   118	      }
   119	    }
   120	
   121	    function _buildMetricAvailability(result) {
   122	      var out = _defaultMetricAvailability();
   123	      if (!_isPlain(result) || !_isPlain(result.metrics)) return out;
   124	      DMC.SUPPORTED_DELTA_METRICS.forEach(function (cn) {
   125	        // Phase metrics are governance-locked (mirrors C6 export behaviour). When
   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
   127	        // regardless of what the orchestrator returned.
   128	        if (DMC.PHASE_SCOPE_METRICS.indexOf(cn) !== -1 && !caps.phaseBoundaryContractEnabled) {
   129	          out[cn] = false;
   130	          return;
   131	        }
   132	        var m = result.metrics[cn];
   133	        if (!_isPlain(m)) { out[cn] = false; return; }
   134	        if (m.blocked === true) { out[cn] = false; return; }
   135	        if (m.partial === true) { out[cn] = false; return; }
   136	        if (m.value === undefined && !Array.isArray(m.perCorner)) { out[cn] = false; return; }
   137	        out[cn] = true;
   138	      });
   139	      return out;
   140	    }
   141	
   142	    function _runRequest() {
   143	      // Requires the four input slots — reference / comparison / association / channelMapping —
   144	      // to be filled. If any is missing, stay in SELECTING.
   145	      if (!_state.reference || !_state.comparison || !_state.association || !_state.channelMapping) {
   146	        _state.placeholder = VST.PLACEHOLDER_STATES.SELECTING;
   147	        return;
   148	      }
   149	      // Issue a new token BEFORE the orchestrator call so any in-flight prior request becomes
   150	      // stale at commit time. (The orchestrator's own token monotonicity is independent of the
   151	      // viewmodel counter — what matters is that this viewmodel commit checks `latestToken`.)
   152	      _state.latestToken += 1;
   153	      var thisToken = _state.latestToken;
   154	      _state.placeholder = VST.PLACEHOLDER_STATES.COMPUTING;
   155	      var response = orch.requestComparison({
   156	        caseRecord: _state.caseRecord,
   157	        association: _state.association,
   158	        referenceLap: _state.reference,
   159	        comparisonLap: _state.comparison,
   160	        eligibilityInput: _buildEligibilityInput(),
   161	        deltaMetricsRequest: _buildDeltaMetricsRequest(),
   162	        framing: null,
   163	        credibilityMetadata: _state.association.credibilityMetadata || null,
   164	      });
   165	      // The orchestrator returned synchronously. If the viewmodel's latestToken has already
   166	      // advanced (e.g. via a re-entrant setReference triggered during this call), drop.
   167	      if (response && response.generationToken !== undefined) {
   168	        // Override the orchestrator's token with the viewmodel's local token so the stale-drop
   169	        // rule is consistent.
   170	        var responseWithLocalToken = Object.assign({}, response, { generationToken: thisToken });
   171	        if (responseWithLocalToken.generationToken !== _state.latestToken) return; // stale
   172	        _commit(responseWithLocalToken);
   173	      }
   174	    }
   175	
   176	    function _buildEligibilityInput() {
   177	      // Convert the viewmodel's confirmed selections into the comparison-eligibility input shape.
   178	      var assoc = _state.association;
   179	      function idShape(lap, basis, direction, caseId, sessionId) {
   180	        return { analysisCaseId: caseId, sessionId: sessionId, lapId: lap.lapId, trackId: assoc.trackId, layoutId: assoc.layoutId, positionBasis: basis, positionDirection: direction };
   181	      }
   182	      return {
   183	        analysisCaseId: assoc.caseId,
   184	        caseRecord: _state.caseRecord,
   185	        reference: {
   186	          identity: idShape(_state.reference, assoc.positionBasis, assoc.positionDirection, assoc.caseId, assoc.sessionId),
   187	          lapAuthority: _state.reference.lapAuthority || {},
   188	          normalizationAuthority: _state.reference.normalizationAuthority || {},
   189	        },
   190	        comparison: {
   191	          identity: idShape(_state.comparison, assoc.positionBasis, assoc.positionDirection, assoc.caseId, assoc.sessionId),
   192	          lapAuthority: _state.comparison.lapAuthority || {},
   193	          normalizationAuthority: _state.comparison.normalizationAuthority || {},
   194	        },
   195	        credibilityMetadata: assoc.credibilityMetadata || {},
   196	      };
   197	    }
   198	    function _buildDeltaMetricsRequest() {
   199	      var assoc = _state.association;
   200	      var pairing = _state.channelMapping.pairing || { pairs: [] };
   201	      return {
   202	        identity: { caseId: assoc.caseId, sessionId: assoc.sessionId },
   203	        referenceLap: { lapTimeMs: _state.reference.lapTimeMs },
   204	        comparisonLap: { lapTimeMs: _state.comparison.lapTimeMs },
   205	        pairing: pairing,
   206	        requestedMetrics: ['lap_time', 'delta_cumulative', 'sector_delta'].concat(caps.phaseBoundaryContractEnabled ? ['entry_delta', 'mid_delta', 'exit_delta'] : []),
   207	        policy: caps.phaseBoundaryContractEnabled ? { deltaSign: 'comparison_minus_reference', phaseBoundaryAuthorisation: { contractRef: 'r3.0c/phase-boundary-test-fixture', serviceOwned: true, deterministic: true } } : { deltaSign: 'comparison_minus_reference' },
   208	      };
   209	    }
   210	
   211	    // ── Public mutators (the 7 transition triggers) ──
   212	    function setReference(sel) { _clearAndPlaceholder('reference_selection_changed'); _state.reference = _isPlain(sel) ? Object.freeze(Object.assign({}, sel)) : null; _runRequest(); }
   213	    function setComparison(sel) { _clearAndPlaceholder('comparison_selection_changed'); _state.comparison = _isPlain(sel) ? Object.freeze(Object.assign({}, sel)) : null; _runRequest(); }
   214	    function setAssociation(assoc) {
   215	      _clearAndPlaceholder('case_association_changed');
   216	      _state.association = _isPlain(assoc) ? Object.freeze(Object.assign({}, assoc)) : null;
   217	      if (_isPlain(assoc) && _isPlain(assoc.caseRecord)) {
   218	        // Codex C7-R2-A-01 closure: the viewmodel NO LONGER registers the caseRecord with the
   219	        // orchestrator. The viewmodel is renderer-accessible (any caller can invoke
   220	        // setAssociation with a forged caseRecord); treating that path as an authoritative
   221	        // boundary was the D1 vulnerability. We still hold a private reference to the record so
   222	        // requestComparison can pass it to the orchestrator, but the orchestrator's
   223	        // authenticityPredicate (injected at construction) is what grants authority — NOT this
   224	        // viewmodel. A forged caller-built caseRecord routed through setAssociation will reach
   225	        // the orchestrator and be refused by the predicate.
   226	        var cr = Object.assign({}, assoc.caseRecord);
   227	        if (_isPlain(assoc.caseRecord.associations)) cr.associations = Object.assign({}, assoc.caseRecord.associations);
   228	        _state.caseRecord = cr;
   229	      } else {
   230	        _state.caseRecord = null;
   231	      }
   232	      _runRequest();
   233	    }
   234	    function setChannelMapping(mapping) { _clearAndPlaceholder('channel_mapping_changed'); _state.channelMapping = _isPlain(mapping) ? Object.freeze(Object.assign({}, mapping)) : null; _runRequest(); }
   235	    function notifyCaseReopen() { _clearAndPlaceholder('case_reopen'); _state.reference = null; _state.comparison = null; _state.association = null; _state.channelMapping = null; _state.caseRecord = null; }
   236	    function notifyAuthorityRevoked() { _clearAndPlaceholder('user_confirmed_authority_revoked'); }
   237	    function notifyEligibilityRevoked() { _clearAndPlaceholder('orchestrator_eligibility_revoked'); }
   238	
   239	    // ── Read-only state accessor ──
   240	    function getState() {
   241	      return Object.freeze({
   242	        placeholder: _state.placeholder,
   243	        reference: _state.reference,
   244	        comparison: _state.comparison,
   245	        association: _state.association,
   246	        result: _state.result,
   247	        framing: _state.framing,
   248	        blockedReasons: _state.blockedReasons.slice(),
   249	        limitations: _state.limitations.slice(),
   250	        exportGate: _state.exportGate,
   251	        metricAvailability: Object.assign({}, _state.metricAvailability),
   252	        latestToken: _state.latestToken,
   253	      });
   254	    }
   255	
   256	    return Object.freeze({
   257	      SERVICE_VERSION: SERVICE_VERSION,
   258	      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
   259	      setReference: setReference,
   260	      setComparison: setComparison,
   261	      setAssociation: setAssociation,
   262	      setChannelMapping: setChannelMapping,
   263	      notifyCaseReopen: notifyCaseReopen,
   264	      notifyAuthorityRevoked: notifyAuthorityRevoked,
   265	      notifyEligibilityRevoked: notifyEligibilityRevoked,
   266	      getState: getState,
   267	    });
   268	  }
   269	
   270	  var api = {
   271	    SERVICE_VERSION: SERVICE_VERSION,
   272	    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
   273	    createComparisonViewModel: createComparisonViewModel,
   274	  };
   275	  if (typeof module !== 'undefined' && module.exports) module.exports = api;
   276	  if (root) root.R3_0C_ComparisonViewModel = api;
   277	})(typeof globalThis !== 'undefined' ? globalThis : this);
renderer/js/r3-0c-comparison-viewmodel.js:241:      return Object.freeze({
renderer/js/r3-0c-comparison-viewmodel.js:256:    return Object.freeze({
renderer/js/r3-0c-comparison-orchestrator.js:65:   * createOrchestrator(deps) — factory. deps may supply alternative service implementations
renderer/js/r3-0c-comparison-orchestrator.js:76:   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
renderer/js/r3-0c-comparison-orchestrator.js:90:  function createOrchestrator(deps) {
renderer/js/r3-0c-comparison-orchestrator.js:95:    if (!caps) throw new Error('createOrchestrator requires capabilities snapshot');
renderer/js/r3-0c-comparison-orchestrator.js:96:    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
renderer/js/r3-0c-comparison-orchestrator.js:102:    function _isAuthenticCaseRecord(caseRecord) {
renderer/js/r3-0c-comparison-orchestrator.js:115:      return Object.freeze({
renderer/js/r3-0c-comparison-orchestrator.js:128:      return Object.freeze({
renderer/js/r3-0c-comparison-orchestrator.js:151:      if (!_isPlain(framing)) return Object.freeze(out);
renderer/js/r3-0c-comparison-orchestrator.js:170:      return Object.freeze(out);
renderer/js/r3-0c-comparison-orchestrator.js:199:      if (!_isAuthenticCaseRecord(input.caseRecord)) {
renderer/js/r3-0c-comparison-orchestrator.js:251:      return Object.freeze({
renderer/js/r3-0c-comparison-orchestrator.js:329:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
renderer/js/r3-0c-comparison-orchestrator.js:333:    return Object.freeze({
renderer/js/r3-0c-comparison-orchestrator.js:347:    createOrchestrator: createOrchestrator,

exec
/bin/bash -lc "rg -n \"_allowlistFrame|alternativeExplanations|nextValidationAction|cannotConclude|framing\" renderer/js/r3-0c-comparison-export.js renderer/js/r3-0c-delta-metrics.js renderer/js/r3-0c-comparison-orchestrator.js contracts/r3.0c/comparison-export-contract.js && nl -ba renderer/js/r3-0c-comparison-export.js | sed -n '330,620p' && nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '90,360p'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
renderer/js/r3-0c-comparison-export.js:13: *            confidence, provenance, limitations, blockers, cannotConclude, alternativeExplanations,
renderer/js/r3-0c-comparison-export.js:14: *            nextValidationAction.
renderer/js/r3-0c-comparison-export.js:86:    'cannotConclude',
renderer/js/r3-0c-comparison-export.js:87:    'alternativeExplanations',
renderer/js/r3-0c-comparison-export.js:88:    'nextValidationAction',
renderer/js/r3-0c-comparison-export.js:96:    'nextValidationAction',
renderer/js/r3-0c-comparison-export.js:153:  function _allowlistFrame(frame) {
renderer/js/r3-0c-comparison-export.js:190:  function _allowlistFrameArray(arr, cap) {
renderer/js/r3-0c-comparison-export.js:195:      var f = _allowlistFrame(arr[i]);
renderer/js/r3-0c-comparison-export.js:402:    var cannotConclude = _allowlistFrameArray(allowedFraming.cannotConclude || [], MAX_FRAMING_ENTRIES);
renderer/js/r3-0c-comparison-export.js:403:    if (cannotConclude === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.cannotConclude invalid' };
renderer/js/r3-0c-comparison-export.js:404:    var alternativeExplanations = _allowlistFrameArray(allowedFraming.alternativeExplanations || [], MAX_FRAMING_ENTRIES);
renderer/js/r3-0c-comparison-export.js:405:    if (alternativeExplanations === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.alternativeExplanations invalid' };
renderer/js/r3-0c-comparison-export.js:406:    var nextValidationAction = null;
renderer/js/r3-0c-comparison-export.js:407:    if (allowedFraming.nextValidationAction !== undefined && allowedFraming.nextValidationAction !== null) {
renderer/js/r3-0c-comparison-export.js:408:      nextValidationAction = _allowlistFrame(allowedFraming.nextValidationAction);
renderer/js/r3-0c-comparison-export.js:409:      if (nextValidationAction === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.nextValidationAction invalid' };
renderer/js/r3-0c-comparison-export.js:433:      cannotConclude: cannotConclude,
renderer/js/r3-0c-comparison-export.js:434:      alternativeExplanations: alternativeExplanations,
renderer/js/r3-0c-comparison-export.js:435:      nextValidationAction: nextValidationAction,
renderer/js/r3-0c-comparison-export.js:453:    var nextValidationAction = null;
renderer/js/r3-0c-comparison-export.js:454:    if (request.framing && request.framing.nextValidationAction) {
renderer/js/r3-0c-comparison-export.js:455:      nextValidationAction = _allowlistFrame(request.framing.nextValidationAction);
renderer/js/r3-0c-comparison-export.js:463:      nextValidationAction: nextValidationAction,
renderer/js/r3-0c-comparison-export.js:481:   *     framing?: { cannotConclude?:[], alternativeExplanations?:[], nextValidationAction? }
renderer/js/r3-0c-comparison-export.js:515:      var framing = _isPlain(request.framing) ? request.framing : {};
renderer/js/r3-0c-comparison-export.js:516:      payloadBuilt = _buildEligiblePayload(request, framing);
renderer/js/r3-0c-comparison-orchestrator.js:5: * issuance + framing emission. It composes the C5 delta-metrics service, the C6 export service,
renderer/js/r3-0c-comparison-orchestrator.js:11: *   - { status:'eligible', result:<C5 result>, framing:{...}, exportGate:bool, generationToken }
renderer/js/r3-0c-comparison-orchestrator.js:12: *   - { status:'blocked', reasonCodes:[...], limitations:[...], framing:{...}, generationToken }
renderer/js/r3-0c-comparison-orchestrator.js:13: *   - { status:'unavailable', reasonCodes:[...], framing:{...}, generationToken }
renderer/js/r3-0c-comparison-orchestrator.js:15: * Framing entries are validated against contracts/r3.0c/framing-i18n-key-registry.js BEFORE
renderer/js/r3-0c-comparison-orchestrator.js:53:  var FIR = Contracts.framingI18nKeyRegistry;
renderer/js/r3-0c-comparison-orchestrator.js:71:   *       framingSourceStructuredContractEnabled:bool }
renderer/js/r3-0c-comparison-orchestrator.js:83:   * framingSourceStructuredContractEnabled is false (the C7 contract is gated by capability).
renderer/js/r3-0c-comparison-orchestrator.js:112:    function _blockedResponse(reasonCodes, detail, framing, token) {
renderer/js/r3-0c-comparison-orchestrator.js:119:        framing: _validateFramingOrFallback(framing),
renderer/js/r3-0c-comparison-orchestrator.js:125:    function _unavailableResponse(reasonCodes, framing, token) {
renderer/js/r3-0c-comparison-orchestrator.js:132:        framing: _validateFramingOrFallback(framing),
renderer/js/r3-0c-comparison-orchestrator.js:138:    function _validateFramingOrFallback(framing) {
renderer/js/r3-0c-comparison-orchestrator.js:139:      // Codex C7-R3-C-01 closure: NEVER re-read `framing[k]` / `v.reasonCode` / `v.i18nKey` /
renderer/js/r3-0c-comparison-orchestrator.js:149:        nextValidationAction: null,
renderer/js/r3-0c-comparison-orchestrator.js:151:      if (!_isPlain(framing)) return Object.freeze(out);
renderer/js/r3-0c-comparison-orchestrator.js:152:      ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
renderer/js/r3-0c-comparison-orchestrator.js:153:        var v = framing[k];
renderer/js/r3-0c-comparison-orchestrator.js:159:      if (Array.isArray(framing.cannotDistinguish)) {
renderer/js/r3-0c-comparison-orchestrator.js:161:        for (var i = 0; i < framing.cannotDistinguish.length && i < 64; i++) {
renderer/js/r3-0c-comparison-orchestrator.js:162:          var e = framing.cannotDistinguish[i];
renderer/js/r3-0c-comparison-orchestrator.js:182:     *   framing                                        // OPTIONAL — orchestrator-built framing
renderer/js/r3-0c-comparison-orchestrator.js:189:      if (!caps.framingSourceStructuredContractEnabled || !caps.viewmodelStateTransitionContractEnabled) {
renderer/js/r3-0c-comparison-orchestrator.js:190:        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'framing or viewmodel-state-transition capability disabled', null, token);
renderer/js/r3-0c-comparison-orchestrator.js:248:      // 5. orchestrator-emitted framing. We DERIVE these from the result (NOT free-form prose):
renderer/js/r3-0c-comparison-orchestrator.js:249:      var framing = _buildFraming(dmResult, phaseMetricRequested, input.framing);
renderer/js/r3-0c-comparison-orchestrator.js:254:        framing: framing,
renderer/js/r3-0c-comparison-orchestrator.js:262:      // The orchestrator deterministically maps the C5 result + flags into framing entries from
renderer/js/r3-0c-comparison-orchestrator.js:268:        if (lapTimeMetric.value < 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: lapTimeMetric.value } };
renderer/js/r3-0c-comparison-orchestrator.js:269:        else if (lapTimeMetric.value > 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.slower_overall', params: { ms: lapTimeMetric.value } };
renderer/js/r3-0c-comparison-orchestrator.js:270:        else observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.identical_lap' };
renderer/js/r3-0c-comparison-orchestrator.js:273:      if (phaseMetricRequested) cannotDistinguish.push({ reasonCode: CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED, i18nKey: 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised' });
renderer/js/r3-0c-comparison-orchestrator.js:279:        nextValidationAction: null,
renderer/js/r3-0c-comparison-orchestrator.js:285:        ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
renderer/js/r3-0c-comparison-orchestrator.js:321:        framing: {
renderer/js/r3-0c-comparison-orchestrator.js:322:          cannotConclude: eligibleResponse.framing && eligibleResponse.framing.cannotDistinguish || [],
renderer/js/r3-0c-comparison-orchestrator.js:323:          alternativeExplanations: [],
renderer/js/r3-0c-comparison-orchestrator.js:324:          nextValidationAction: eligibleResponse.framing && eligibleResponse.framing.nextValidationAction || null,
   330	  function _buildCorners(metrics) {
   331	    // The corners array is the per-corner sector_delta projection. C5 emits per-pair entries with
   332	    // shape { pairIndex, value, referenceCornerId, comparisonCornerId }. We take referenceCornerId
   333	    // as the export's canonical bounded ID. entry/mid/exit phase metrics are NOT included here;
   334	    // they remain governance-locked until phase_boundary_contract.enabled.
   335	    if (!_isPlain(metrics) || !_isPlain(metrics.sector_delta) || !Array.isArray(metrics.sector_delta.perCorner)) {
   336	      return []; // no corners → bounded empty array is valid
   337	    }
   338	    var pc = metrics.sector_delta.perCorner;
   339	    if (pc.length > MAX_CORNERS) return null;
   340	    var out = [];
   341	    for (var i = 0; i < pc.length; i++) {
   342	      var e = pc[i];
   343	      if (e === null || e === undefined) { out.push({ cornerId: null, sectorDelta: null, available: false, reason: CODES.DELTA_METRIC_NUMERIC_INVALID }); continue; }
   344	      if (!_isPlain(e)) return null;
   345	      var cornerId = _safeGet(e, 'referenceCornerId');
   346	      if (!_isBoundedId(cornerId)) return null;
   347	      var value = _safeGet(e, 'value');
   348	      if (value === null || value === undefined || !_isFiniteNum(value)) {
   349	        out.push({ cornerId: cornerId, sectorDelta: null, available: false, reason: CODES.DELTA_METRIC_NUMERIC_INVALID });
   350	      } else {
   351	        out.push({ cornerId: cornerId, sectorDelta: value, available: true });
   352	      }
   353	    }
   354	    return out;
   355	  }
   356	  function _buildMetricAvailability(metrics) {
   357	    var names = CE.SUPPORTED_METRICS;
   358	    var out = {};
   359	    for (var i = 0; i < names.length; i++) {
   360	      var n = names[i];
   361	      // map SUPPORTED_METRICS (UI/eligibility names) to delta-metrics names where appropriate.
   362	      // The export's metricAvailability lists THE export's view of which delta metrics carry a
   363	      // value. We only mark true when the metric exists in the result AND is not blocked AND
   364	      // not partial.
   365	      var key = n === 'speedDelta' ? null : null; // C5 doesn't carry speedDelta in metrics (deferred)
   366	      // For C6 export, the present canonical metrics in C5 result are lap_time / delta_cumulative
   367	      // / sector_delta / entry_delta / mid_delta / exit_delta. We expose availability for these
   368	      // names directly so the export consumer can read availability per the C5 vocabulary.
   369	      out[n] = false;
   370	    }
   371	    // Direct exposure for the C5 canonical metric vocabulary. C5 marks an entry blocked:true /
   372	    // partial:true / both when relevant; availability is true only when the metric carries usable
   373	    // data AND is neither blocked nor partial.
   374	    var canonical = DM.SUPPORTED_DELTA_METRICS;
   375	    for (var j = 0; j < canonical.length; j++) {
   376	      var cn = canonical[j];
   377	      var m = _isPlain(metrics) ? metrics[cn] : null;
   378	      var phaseGated = DM.PHASE_SCOPE_METRICS.indexOf(cn) !== -1;
   379	      if (phaseGated) { out[cn] = false; continue; }
   380	      if (!_isPlain(m)) { out[cn] = false; continue; }
   381	      if (m.blocked === true) { out[cn] = false; continue; }
   382	      if (m.partial === true) { out[cn] = false; continue; }
   383	      if (m.value === undefined && !Array.isArray(m.perCorner)) { out[cn] = false; continue; }
   384	      out[cn] = true;
   385	    }
   386	    return out;
   387	  }
   388	
   389	  function _buildEligiblePayload(request, allowedFraming) {
   390	    var ref = _buildReferenceLapSummary(request); if (ref === null) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'referenceLap summary invalid' };
   391	    var cmp = _buildComparisonLapSummary(request); if (cmp === null) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'comparisonLap summary invalid' };
   392	    var assoc = _buildAssociationSummary(request.association);
   393	    var metrics = request.result.metrics;
   394	    var cumDelta = _buildCumulativeDelta(metrics);
   395	    var corners = _buildCorners(metrics);
   396	    if (corners === null) return { ok: false, reasons: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'corners summary invalid' };
   397	    var availability = _buildMetricAvailability(metrics);
   398	    var limitations = _allowlistLimitations(request.credibilityMetadata.limitations);
   399	    if (limitations === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'limitations contain unknown codes or exceed cap' };
   400	    var blockers = _allowlistLimitations(request.credibilityMetadata.blockedReasons);
   401	    if (blockers === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'blockedReasons contain unknown codes or exceed cap' };
   402	    var cannotConclude = _allowlistFrameArray(allowedFraming.cannotConclude || [], MAX_FRAMING_ENTRIES);
   403	    if (cannotConclude === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.cannotConclude invalid' };
   404	    var alternativeExplanations = _allowlistFrameArray(allowedFraming.alternativeExplanations || [], MAX_FRAMING_ENTRIES);
   405	    if (alternativeExplanations === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.alternativeExplanations invalid' };
   406	    var nextValidationAction = null;
   407	    if (allowedFraming.nextValidationAction !== undefined && allowedFraming.nextValidationAction !== null) {
   408	      nextValidationAction = _allowlistFrame(allowedFraming.nextValidationAction);
   409	      if (nextValidationAction === null) return { ok: false, reasons: [CODES.INSUFFICIENT_CREDIBILITY_METADATA], detail: 'framing.nextValidationAction invalid' };
   410	    }
   411	    // any per-metric partial → comparisonStatus = 'partial' rather than 'success'.
   412	    var anyPartial = false;
   413	    if (_isPlain(metrics)) {
   414	      var ks = Object.keys(metrics);
   415	      for (var i = 0; i < ks.length; i++) {
   416	        var m = metrics[ks[i]];
   417	        if (_isPlain(m) && m.partial === true) { anyPartial = true; break; }
   418	      }
   419	    }
   420	    var payload = {
   421	      comparisonStatus: anyPartial ? 'partial' : 'success',
   422	      referenceLap: ref,
   423	      comparisonLap: cmp,
   424	      association: assoc,
   425	      cumulativeDelta: cumDelta,
   426	      corners: corners,
   427	      metricAvailability: availability,
   428	      credibility: request.credibilityMetadata.credibility,
   429	      confidence: request.credibilityMetadata.confidence,
   430	      provenance: request.credibilityMetadata.provenance,
   431	      limitations: limitations,
   432	      blockers: blockers,
   433	      cannotConclude: cannotConclude,
   434	      alternativeExplanations: alternativeExplanations,
   435	      nextValidationAction: nextValidationAction,
   436	    };
   437	    // Deterministic key order: rebuild in ELIGIBLE_PAYLOAD_KEYS order so JSON.stringify is stable.
   438	    var ordered = {};
   439	    for (var k = 0; k < ELIGIBLE_PAYLOAD_KEYS.length; k++) {
   440	      var key = ELIGIBLE_PAYLOAD_KEYS[k];
   441	      ordered[key] = payload[key];
   442	    }
   443	    return { ok: true, payload: ordered };
   444	  }
   445	
   446	  function _buildBlockedPayload(request) {
   447	    var result = request.result;
   448	    var assoc = request.association;
   449	    var reasonCodes = Array.isArray(result.reasonCodes) ? result.reasonCodes.filter(function (c) { return RC.isReasonCode(c); }) : [];
   450	    if (reasonCodes.length === 0) reasonCodes = [CODES.INTERNAL_CONTRACT_VIOLATION];
   451	    var limitations = _allowlistLimitations(request.credibilityMetadata ? request.credibilityMetadata.limitations : []);
   452	    if (limitations === null) limitations = [];
   453	    var nextValidationAction = null;
   454	    if (request.framing && request.framing.nextValidationAction) {
   455	      nextValidationAction = _allowlistFrame(request.framing.nextValidationAction);
   456	    }
   457	    var payload = {
   458	      comparisonStatus: 'blocked',
   459	      status: 'blocked',
   460	      reasonCodes: reasonCodes,
   461	      limitations: limitations,
   462	      identity: { caseId: assoc.caseId, sessionId: assoc.sessionId },
   463	      nextValidationAction: nextValidationAction,
   464	    };
   465	    var ordered = {};
   466	    for (var k = 0; k < BLOCKED_PAYLOAD_KEYS.length; k++) {
   467	      ordered[BLOCKED_PAYLOAD_KEYS[k]] = payload[BLOCKED_PAYLOAD_KEYS[k]];
   468	    }
   469	    return { ok: true, payload: ordered };
   470	  }
   471	
   472	  /**
   473	   * buildComparisonExport(request) — produces a closed-schema portable comparison envelope.
   474	   *
   475	   * request shape (caller MUST supply ALL five fields):
   476	   *   {
   477	   *     result: <C5 delta-metrics service result — eligible or blocked>,
   478	   *     association: { caseId, sessionId, trackId, layoutId, positionBasis, positionDirection },
   479	   *     credibilityMetadata: { credibility, provenance, confidence, limitations[], blockedReasons[] },
   480	   *     generationToken: '<non-empty opaque token>',
   481	   *     framing?: { cannotConclude?:[], alternativeExplanations?:[], nextValidationAction? }
   482	   *   }
   483	   *
   484	   * Returns either:
   485	   *   - frozen envelope { schemaIdentity, schemaVersion, generatedAt:null, payload },
   486	   *     with a `.serialized` plain-string mirror produced by JSON.stringify + JSON.parse round trip;
   487	   *   - or _blockedExport([reasonCodes]) — never a partial envelope.
   488	   */
   489	  function buildComparisonExport(request) {
   490	    try { return _buildComparisonExportInner(request); }
   491	    catch (e) {
   492	      // Catch-all fail-closed boundary (formal Codex C6 finding F-C6-A2 round 2): any unhandled
   493	      // throw from caller-controlled traversal (e.g. a Proxy with a throwing get trap on a top-
   494	      // level field that the inner reads bypass) returns a blocked export rather than crashing.
   495	      return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'unhandled throw in buildComparisonExport: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown'));
   496	    }
   497	  }
   498	  function _buildComparisonExportInner(request) {
   499	    // 1. shape gate
   500	    var shape = _validateRequestShape(request);
   501	    if (!shape.ok) return _blockedExport(shape.reasons, shape.detail);
   502	    // 2. association gate
   503	    var assoc = _validateAssociation(request.association);
   504	    if (!assoc.ok) return _blockedExport(assoc.reasons, assoc.detail);
   505	    // 3. credibility gate
   506	    var cred = CR.validateCredibilityMetadata(request.credibilityMetadata);
   507	    if (!cred.valid) return _blockedExport(cred.reasonCodes.slice(), 'credibilityMetadata invalid');
   508	
   509	    // 4. eligible vs blocked branch
   510	    var payloadBuilt;
   511	    if (request.result.eligible === true) {
   512	      // 4a. association ↔ result identity match (stale-result guard)
   513	      var idCheck = _validateAssociationVsResultIdentity(request.result, request.association);
   514	      if (!idCheck.ok) return _blockedExport(idCheck.reasons, idCheck.detail);
   515	      var framing = _isPlain(request.framing) ? request.framing : {};
   516	      payloadBuilt = _buildEligiblePayload(request, framing);
   517	    } else {
   518	      payloadBuilt = _buildBlockedPayload(request);
   519	    }
   520	    if (!payloadBuilt.ok) return _blockedExport(payloadBuilt.reasons, payloadBuilt.detail);
   521	
   522	    // 5. build envelope via the contract
   523	    var envelope = EX.buildComparisonExportEnvelope(payloadBuilt.payload);
   524	    if (envelope.eligible === false) {
   525	      // envelope construction failed (oversize / non-finite / etc.) — propagate the reason verbatim.
   526	      return _blockedExport(envelope.reasonCodes.slice(), envelope.detail);
   527	    }
   528	    // 6. validate the constructed envelope (first pass — pre-serialize).
   529	    var preCheck = EX.validateComparisonExportEnvelope(envelope);
   530	    if (preCheck.eligible === false) return _blockedExport(preCheck.reasonCodes.slice(), preCheck.detail || 'envelope failed pre-serialize validation');
   531	
   532	    // 7. serialize → 8. parse → 9. revalidate (round-trip determinism).
   533	    var serialized;
   534	    try { serialized = JSON.stringify(envelope); }
   535	    catch (e) { return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.stringify threw: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown')); }
   536	    if (typeof serialized !== 'string') return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.stringify produced non-string');
   537	    var parsed;
   538	    try { parsed = JSON.parse(serialized); }
   539	    catch (e) { return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'JSON.parse threw: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown')); }
   540	    var postCheck = EX.validateComparisonExportEnvelope(parsed);
   541	    if (postCheck.eligible === false) return _blockedExport(postCheck.reasonCodes.slice(), postCheck.detail || 'envelope failed post-serialize validation');
   542	
   543	    // 10. return the constructed envelope + its serialized + parsed mirrors. The parsed mirror is
   544	    //     what a downstream consumer would actually receive after a true file round-trip.
   545	    return Object.freeze({
   546	      eligible: true,
   547	      status: 'comparison_export_built',
   548	      envelope: envelope,
   549	      serialized: serialized,
   550	      parsed: Object.freeze(parsed),
   551	      reasonCodes: Object.freeze([]),
   552	      result: null,
   553	    });
   554	  }
   555	
   556	  var api = {
   557	    SERVICE_VERSION: SERVICE_VERSION,
   558	    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
   559	    SIGN_FORMULA: SIGN_FORMULA,
   560	    ELIGIBLE_PAYLOAD_KEYS: ELIGIBLE_PAYLOAD_KEYS,
   561	    BLOCKED_PAYLOAD_KEYS: BLOCKED_PAYLOAD_KEYS,
   562	    buildComparisonExport: buildComparisonExport,
   563	  };
   564	  if (typeof module !== 'undefined' && module.exports) module.exports = api;
   565	  if (root) root.R3_0C_ComparisonExport = api;
   566	})(typeof globalThis !== 'undefined' ? globalThis : this);
    90	  function createOrchestrator(deps) {
    91	    deps = _isPlain(deps) ? deps : {};
    92	    var dm = deps.deltaMetricsService || DeltaMetricsService;
    93	    var ex = deps.exportService || ComparisonExportService;
    94	    var caps = _isPlain(deps.capabilities) ? deps.capabilities : null;
    95	    if (!caps) throw new Error('createOrchestrator requires capabilities snapshot');
    96	    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
    97	    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
    98	
    99	    // Codex C7-R2-A-01 closure: predicate-based authenticity check. The predicate is invoked once
   100	    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
   101	    var _externalAuthPredicate = typeof deps.authenticityPredicate === 'function' ? deps.authenticityPredicate : null;
   102	    function _isAuthenticCaseRecord(caseRecord) {
   103	      if (!_externalAuthPredicate) return false;
   104	      if (!_isPlain(caseRecord)) return false;
   105	      try { return _externalAuthPredicate(caseRecord) === true; } catch (e) { return false; }
   106	    }
   107	
   108	    var _generationCounter = 0;
   109	    function _nextToken() { _generationCounter = _generationCounter + 1; return _generationCounter; }
   110	    function currentToken() { return _generationCounter; }
   111	
   112	    function _blockedResponse(reasonCodes, detail, framing, token) {
   113	      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
   114	      if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
   115	      return Object.freeze({
   116	        status: 'blocked',
   117	        reasonCodes: Object.freeze(arr.slice()),
   118	        limitations: Object.freeze([]),
   119	        framing: _validateFramingOrFallback(framing),
   120	        exportGate: false,
   121	        detail: detail != null ? String(detail).slice(0, 200) : null,
   122	        generationToken: token,
   123	      });
   124	    }
   125	    function _unavailableResponse(reasonCodes, framing, token) {
   126	      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
   127	      if (arr.length === 0) arr = [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE];
   128	      return Object.freeze({
   129	        status: 'unavailable',
   130	        reasonCodes: Object.freeze(arr.slice()),
   131	        limitations: Object.freeze([]),
   132	        framing: _validateFramingOrFallback(framing),
   133	        exportGate: false,
   134	        generationToken: token,
   135	      });
   136	    }
   137	
   138	    function _validateFramingOrFallback(framing) {
   139	      // Codex C7-R3-C-01 closure: NEVER re-read `framing[k]` / `v.reasonCode` / `v.i18nKey` /
   140	      // `v.params` after validation. A Proxy can return a different value on each access; the
   141	      // validator's `sanitized` snapshot (frozen, built from descriptor-read values only) is the
   142	      // ONLY safe surface to consume downstream. Same TOCTOU applies to cannotDistinguish entries.
   143	      var fallback = FIR.cannotDistinguishFallback();
   144	      var out = {
   145	        observedDelta: fallback,
   146	        likelyDriverBehaviourDifference: fallback,
   147	        possibleVehicleResponseDifference: fallback,
   148	        cannotDistinguish: [],
   149	        nextValidationAction: null,
   150	      };
   151	      if (!_isPlain(framing)) return Object.freeze(out);
   152	      ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
   153	        var v = framing[k];
   154	        if (v === null || v === undefined) return; // keep fallback
   155	        var vr = FIR.validateFramingEntry(v);
   156	        if (vr.valid && vr.sanitized) out[k] = vr.sanitized;
   157	        // else: leave fallback in place (defense in depth — orchestrator emit should have caught)
   158	      });
   159	      if (Array.isArray(framing.cannotDistinguish)) {
   160	        var cd = [];
   161	        for (var i = 0; i < framing.cannotDistinguish.length && i < 64; i++) {
   162	          var e = framing.cannotDistinguish[i];
   163	          var er = FIR.validateFramingEntry(e);
   164	          if (er.valid && er.sanitized) cd.push(er.sanitized);
   165	        }
   166	        out.cannotDistinguish = Object.freeze(cd);
   167	      } else {
   168	        out.cannotDistinguish = Object.freeze([]);
   169	      }
   170	      return Object.freeze(out);
   171	    }
   172	
   173	    /**
   174	     * requestComparison(input) — synchronous orchestrator entry point.
   175	     *
   176	     * input = {
   177	     *   caseRecord, association,                       // F4/F5 binding inputs
   178	     *   referenceLap, comparisonLap,                   // lap identities
   179	     *   credibilityMetadata,                           // credibility ladder + provenance
   180	     *   eligibilityInput,                              // shape for evaluateComparisonEligibility
   181	     *   deltaMetricsRequest,                           // C5 service input (sans phase trio)
   182	     *   framing                                        // OPTIONAL — orchestrator-built framing
   183	     * }
   184	     *
   185	     * Returns one of the response shapes documented at module top.
   186	     */
   187	    function requestComparison(input) {
   188	      var token = _nextToken();
   189	      if (!caps.framingSourceStructuredContractEnabled || !caps.viewmodelStateTransitionContractEnabled) {
   190	        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'framing or viewmodel-state-transition capability disabled', null, token);
   191	      }
   192	      if (!_isPlain(input)) return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'input not a plain object', null, token);
   193	
   194	      // 1. case authenticity (Codex C7-R2-A-01 closure): the caseRecord MUST be vouched for by
   195	      //    the injected authenticityPredicate. A literal-built caseRecord (even one whose
   196	      //    associations consistently match the caller-supplied association + eligibility
   197	      //    identities) fails closed here. The predicate is opaque to the viewmodel — there is no
   198	      //    public API to add anything to it.
   199	      if (!_isAuthenticCaseRecord(input.caseRecord)) {
   200	        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not vouched for by authenticityPredicate — caller-controlled case authority refused', null, token);
   201	      }
   202	
   203	      // 2. case ↔ context binding (F4)
   204	      var bindCheck = CE.validateComparisonContextAgainstCase(input.caseRecord, input.association);
   205	      if (bindCheck && bindCheck.valid !== true) {
   206	        return _blockedResponse(bindCheck.reasonCodes ? bindCheck.reasonCodes.slice() : [CODES.TRACK_IDENTITY_MISMATCH], 'case/context binding failed', null, token);
   207	      }
   208	
   209	      // 2. composite eligibility (F5 identity + lap + credibility)
   210	      var elig = CE.evaluateComparisonEligibility(input.eligibilityInput);
   211	      if (elig.eligible !== true) {
   212	        return _blockedResponse(elig.reasonCodes ? elig.reasonCodes.slice() : [CODES.REFERENCE_LAP_UNAVAILABLE], 'eligibility failed', null, token);
   213	      }
   214	
   215	      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
   216	      var dmReq = _isPlain(input.deltaMetricsRequest) ? Object.assign({}, input.deltaMetricsRequest) : null;
   217	      if (!dmReq) return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'deltaMetricsRequest missing', null, token);
   218	      var requested = Array.isArray(dmReq.requestedMetrics) ? dmReq.requestedMetrics.slice() : [];
   219	      var phaseMetricRequested = false;
   220	      if (!caps.phaseBoundaryContractEnabled) {
   221	        var phaseSet = DMC.PHASE_SCOPE_METRICS;
   222	        var filtered = requested.filter(function (m) {
   223	          if (phaseSet.indexOf(m) !== -1) { phaseMetricRequested = true; return false; }
   224	          return true;
   225	        });
   226	        dmReq.requestedMetrics = filtered;
   227	        if (dmReq.policy && _isPlain(dmReq.policy)) {
   228	          var pol = Object.assign({}, dmReq.policy);
   229	          delete pol.phaseBoundaryAuthorisation;
   230	          dmReq.policy = pol;
   231	        }
   232	      } else {
   233	        dmReq.requestedMetrics = requested;
   234	      }
   235	      if (!dmReq.requestedMetrics.length) {
   236	        return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'no requested metrics after phase gate', null, token);
   237	      }
   238	
   239	      var dmResult = dm.computeDeltaMetrics(dmReq);
   240	      if (dmResult.eligible !== true) {
   241	        return _blockedResponse(dmResult.reasonCodes ? dmResult.reasonCodes.slice() : [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE], 'delta-metrics blocked', null, token);
   242	      }
   243	
   244	      // 4. exportGate predicate: an eligible result + non-stale identity + association match
   245	      //    is the precondition for the UI's export button. The viewmodel re-checks at click.
   246	      var exportGate = !!(dmResult && dmResult.eligible && _isPlain(dmResult.identity) && dmResult.identity.caseId === input.association.caseId && dmResult.identity.sessionId === input.association.sessionId);
   247	
   248	      // 5. orchestrator-emitted framing. We DERIVE these from the result (NOT free-form prose):
   249	      var framing = _buildFraming(dmResult, phaseMetricRequested, input.framing);
   250	
   251	      return Object.freeze({
   252	        status: 'eligible',
   253	        result: dmResult,
   254	        framing: framing,
   255	        exportGate: exportGate,
   256	        generationToken: token,
   257	        limitations: Object.freeze(phaseMetricRequested ? [CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED] : []),
   258	      });
   259	    }
   260	
   261	    function _buildFraming(dmResult, phaseMetricRequested, callerFraming) {
   262	      // The orchestrator deterministically maps the C5 result + flags into framing entries from
   263	      // FRAMING_I18N_KEY_REGISTRY. Caller may NOT supply free-form prose — when callerFraming is
   264	      // present we use _validateFramingOrFallback which rejects unregistered i18nKeys.
   265	      var observed = null;
   266	      var lapTimeMetric = dmResult.metrics && dmResult.metrics.lap_time;
   267	      if (lapTimeMetric && _isFiniteNum(lapTimeMetric.value)) {
   268	        if (lapTimeMetric.value < 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: lapTimeMetric.value } };
   269	        else if (lapTimeMetric.value > 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.slower_overall', params: { ms: lapTimeMetric.value } };
   270	        else observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.identical_lap' };
   271	      }
   272	      var cannotDistinguish = [];
   273	      if (phaseMetricRequested) cannotDistinguish.push({ reasonCode: CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED, i18nKey: 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised' });
   274	      var built = {
   275	        observedDelta: observed,
   276	        likelyDriverBehaviourDifference: null,
   277	        possibleVehicleResponseDifference: null,
   278	        cannotDistinguish: cannotDistinguish,
   279	        nextValidationAction: null,
   280	      };
   281	      if (_isPlain(callerFraming)) {
   282	        // Codex C7-R3-C-01 closure: assign vr.sanitized, NOT the raw `v`. The TOCTOU bypass via
   283	        // Proxy.getOwnPropertyDescriptor lying about descriptors would otherwise let an accepted
   284	        // entry yield different values on later access.
   285	        ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
   286	          var v = callerFraming[k];
   287	          if (!v) return;
   288	          var vr = FIR.validateFramingEntry(v);
   289	          if (vr.valid && vr.sanitized) built[k] = vr.sanitized;
   290	        });
   291	        if (Array.isArray(callerFraming.cannotDistinguish)) {
   292	          callerFraming.cannotDistinguish.forEach(function (e) {
   293	            if (!e) return;
   294	            var er = FIR.validateFramingEntry(e);
   295	            if (er.valid && er.sanitized && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(er.sanitized);
   296	          });
   297	        }
   298	      }
   299	      return _validateFramingOrFallback(built);
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
   346	    SIGN_FORMULA: SIGN_FORMULA,
   347	    createOrchestrator: createOrchestrator,
   348	  };
   349	  if (typeof module !== 'undefined' && module.exports) module.exports = api;
   350	  if (root) root.R3_0C_ComparisonOrchestrator = api;
   351	})(typeof globalThis !== 'undefined' ? globalThis : this);

codex
A second framing boundary is materially weaker: the public C6 export service rebuilds framing with direct property reads and never invokes `validateFramingEntry`. I’m constructing a direct export request with an authentic C5 result to determine whether a proxy can trigger side effects or inject an unregistered key through that path.
exec
/bin/bash -lc "sed -n '1,260p' tests/r3-0c-comparison-export.test.js; rg -n \"computeDeltaMetrics\\(|function .*Request|validRequest|baseRequest|make.*Request\" tests/r3-0c-comparison-export.test.js tests/r3-0c-delta-metrics.test.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
/**
 * tests/r3-0c-comparison-export.test.js — R3.0C C6 · Comparison Export Service.
 *
 * Verifies the closed-allowlist gateway between authoritative C5 results and the bounded portable
 * envelope: happy path with deterministic JSON round-trip; blocked-result export carries no
 * fabricated metrics; stale-result guard rejects mismatched case/session; adversarial inputs
 * (unknown reason codes, non-finite numbers, oversized strings, exotic objects, future schema)
 * fail-closed without leaking through the envelope; authority bypass attempts (missing token,
 * wrong status string, sign mismatch, caller spreading raw fields) refused.
 */
'use strict';
const Service = require('../renderer/js/r3-0c-comparison-export.js');
const Adapter = require('../renderer/js/r3-0c-comparison-adapter.js');
const DeltaMetricsService = require('../renderer/js/r3-0c-delta-metrics.js');
const Contracts = require('../contracts/r3.0c/index.js');
const CODES = Contracts.reasonCodes.REASON_CODES;
const EX = Contracts.comparisonExport;
const CE = Contracts.comparisonEligibility;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (r, c) => !!(r && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(c) !== -1);

function freezeResult(o) { return Object.freeze(o); }

// Authentic eligible C5 result — driven through the real production service so the C6
// authenticity gate accepts it (formal Codex C6 finding F-C6-A1 closure).
function eligibleResultFixture(overrides) {
  overrides = overrides || {};
  return DeltaMetricsService.computeDeltaMetrics({
    identity: overrides.identity || { caseId: 'caseA', sessionId: 'sess1' },
    referenceLap: overrides.referenceLap || { lapTimeMs: 90000 },
    comparisonLap: overrides.comparisonLap || { lapTimeMs: 89500 },
    pairing: overrides.pairing || { pairs: [
      { referenceCorner: { id: 'C1', fullTimeMs: 10000, entryTimeMs: 3000, midTimeMs: 4000, exitTimeMs: 3000 },
        comparisonCorner: { id: 'C1', fullTimeMs: 9900, entryTimeMs: 2950, midTimeMs: 4000, exitTimeMs: 2950 } },
      { referenceCorner: { id: 'C2', fullTimeMs: 15000, entryTimeMs: 5000, midTimeMs: 5000, exitTimeMs: 5000 },
        comparisonCorner: { id: 'C2', fullTimeMs: 14800, entryTimeMs: 4900, midTimeMs: 5000, exitTimeMs: 4900 } },
      { referenceCorner: { id: 'C3', fullTimeMs: 12000, entryTimeMs: 4000, midTimeMs: 4000, exitTimeMs: 4000 },
        comparisonCorner: { id: 'C3', fullTimeMs: 11800, entryTimeMs: 3900, midTimeMs: 4000, exitTimeMs: 3900 } },
    ] },
    requestedMetrics: overrides.requestedMetrics || ['lap_time', 'delta_cumulative', 'sector_delta'],
    policy: { deltaSign: 'comparison_minus_reference' },
  });
}

// Authentic blocked C5 result — produced by the real service so authenticity passes.
function blockedResultFixture() {
  // Make the request shape gate fail by omitting requestedMetrics so the service returns _blocked.
  return DeltaMetricsService.computeDeltaMetrics({
    identity: { caseId: 'caseA', sessionId: 'sess1' },
    referenceLap: { lapTimeMs: 90000 },
    comparisonLap: { lapTimeMs: 89500 },
    pairing: { pairs: [] },
    requestedMetrics: [],
    policy: { deltaSign: 'comparison_minus_reference' },
  });
}

function association(over) {
  return Object.assign({
    caseId: 'caseA', sessionId: 'sess1', trackId: 'silverstone', layoutId: 'gp',
    positionBasis: 'lap_distance', positionDirection: 'increasing',
  }, over || {});
}

function credibility(over) {
  return Object.assign({
    credibility: 'Heuristic', provenance: 'real', confidence: 'low',
    limitations: [], blockedReasons: [],
  }, over || {});
}

function req(over) {
  return Object.assign({
    result: eligibleResultFixture(),
    association: association(),
    credibilityMetadata: credibility(),
    generationToken: 'gen-token-001',
    referenceLap: { sessionId: 'sess1', lapId: 'lap_ref', lapTimeMs: 90000 },
    comparisonLap: { sessionId: 'sess1', lapId: 'lap_cmp', lapTimeMs: 89500 },
    framing: { cannotConclude: [], alternativeExplanations: [], nextValidationAction: null },
  }, over || {});
}

// A. constants
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 CHECKPOINT_FLOOR === C6_EXPORT', Service.CHECKPOINT_FLOOR === 'C6_EXPORT');
chk('A3 SIGN_FORMULA === comparison_minus_reference', Service.SIGN_FORMULA === 'comparison_minus_reference');
chk('A4 ELIGIBLE_PAYLOAD_KEYS frozen + 15 keys', Object.isFrozen(Service.ELIGIBLE_PAYLOAD_KEYS) && Service.ELIGIBLE_PAYLOAD_KEYS.length === 15);
chk('A5 BLOCKED_PAYLOAD_KEYS frozen + 6 keys', Object.isFrozen(Service.BLOCKED_PAYLOAD_KEYS) && Service.BLOCKED_PAYLOAD_KEYS.length === 6);

// B. happy path: eligible result → envelope built, serialized, parsed, re-validated
(() => {
  const out = Service.buildComparisonExport(req());
  chk('B1 eligible result → status=comparison_export_built', out.eligible === true && out.status === 'comparison_export_built');
  chk('B2 envelope frozen + identity correct', Object.isFrozen(out.envelope) && out.envelope.schemaIdentity === 'racing-analyzer/comparison-export' && out.envelope.schemaVersion === 1);
  chk('B3 serialized is a string', typeof out.serialized === 'string' && out.serialized.length > 0);
  chk('B4 parsed mirror frozen', Object.isFrozen(out.parsed));
  chk('B5 payload has comparisonStatus=success', out.envelope.payload.comparisonStatus === 'success');
  chk('B6 cumulativeDelta available', out.envelope.payload.cumulativeDelta.available === true && out.envelope.payload.cumulativeDelta.value === -500);
  chk('B7 corners has 3 entries', out.envelope.payload.corners.length === 3 && out.envelope.payload.corners.every(c => c.available === true));
  chk('B8 metricAvailability for sector_delta = true', out.envelope.payload.metricAvailability.sector_delta === true);
  // F6 governance: phase metrics MUST be reported unavailable while phase_boundary_contract is disabled.
  chk('B9 metricAvailability for phase trio = false (governance gate)', out.envelope.payload.metricAvailability.entry_delta === false && out.envelope.payload.metricAvailability.mid_delta === false && out.envelope.payload.metricAvailability.exit_delta === false);
  chk('B10 association mirrors caller', out.envelope.payload.association.trackId === 'silverstone' && out.envelope.payload.association.positionBasis === 'lap_distance');
})();

// C. deterministic JSON round-trip — same input → same serialized bytes
(() => {
  const out1 = Service.buildComparisonExport(req());
  const out2 = Service.buildComparisonExport(req());
  chk('C1 same input → identical serialized', out1.serialized === out2.serialized);
})();

// D. blocked result → only minimal fields exported, no fabricated metrics
(() => {
  const r = req({ result: blockedResultFixture() });
  const out = Service.buildComparisonExport(r);
  chk('D1 blocked result → export built', out.eligible === true && out.status === 'comparison_export_built');
  chk('D2 payload.comparisonStatus=blocked', out.envelope.payload.comparisonStatus === 'blocked');
  chk('D3 payload has reasonCodes', Array.isArray(out.envelope.payload.reasonCodes) && out.envelope.payload.reasonCodes.length === 1);
  chk('D4 payload.identity only has caseId+sessionId', Object.keys(out.envelope.payload.identity).length === 2);
  // No metrics / cumulativeDelta / corners / metricAvailability in blocked export.
  chk('D5 no cumulativeDelta in blocked payload', out.envelope.payload.cumulativeDelta === undefined);
  chk('D6 no corners in blocked payload', out.envelope.payload.corners === undefined);
  chk('D7 no metricAvailability in blocked payload', out.envelope.payload.metricAvailability === undefined);
})();

// E. authority bypass: caller spreads a literal fake result (authenticity gate catches this first
// — formal Codex C6 finding F-C6-A1 closure). The downstream shape checks remain in code as
// defense-in-depth but caller-driven probes are blocked by authenticity, NOT by them.
(() => {
  const r = req(); r.result = freezeResult({ eligible: true, status: 'totally_fake_status', sign: 'comparison_minus_reference', identity: { caseId: 'caseA', sessionId: 'sess1' }, metrics: {} });
  const out = Service.buildComparisonExport(r);
  chk('E1 forged result (wrong status) → blocked by authenticity', out.eligible === false && hasCode(out, CODES.INTERNAL_CONTRACT_VIOLATION));
})();
(() => {
  const r = req(); r.result = freezeResult({ eligible: true, status: 'delta_metrics_computed', sign: 'reference_minus_comparison', identity: { caseId: 'caseA', sessionId: 'sess1' }, metrics: {} });
  const out = Service.buildComparisonExport(r);
  chk('E2 forged result (reversed sign) → blocked by authenticity', out.eligible === false && hasCode(out, CODES.INTERNAL_CONTRACT_VIOLATION));
})();
(() => {
  // missing generationToken
  const r = req(); delete r.generationToken;
  const out = Service.buildComparisonExport(r);
  chk('E3 missing generationToken → blocked', out.eligible === false);
})();
(() => {
  // empty generationToken
  const r = req(); r.generationToken = '';
  const out = Service.buildComparisonExport(r);
  chk('E4 empty generationToken → blocked', out.eligible === false);
})();

// F. stale result: association vs result.identity mismatch → fail closed
(() => {
  const r = req(); r.association = association({ caseId: 'caseB' });
  const out = Service.buildComparisonExport(r);
  chk('F1 stale caseId → CROSS_CASE_COMPARISON_UNSUPPORTED', out.eligible === false && hasCode(out, CODES.CROSS_CASE_COMPARISON_UNSUPPORTED));
})();
(() => {
  const r = req(); r.association = association({ sessionId: 'sess99' });
  const out = Service.buildComparisonExport(r);
  chk('F2 stale sessionId → CROSS_SESSION_COMPARISON_UNSUPPORTED', out.eligible === false && hasCode(out, CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED));
})();

// G. association validation
(() => { const r = req(); r.association = association({ trackId: '' }); chk('G1 missing trackId → MISSING_TRACK_IDENTITY', hasCode(Service.buildComparisonExport(r), CODES.MISSING_TRACK_IDENTITY)); })();
(() => { const r = req(); r.association = association({ positionBasis: 'bogus' }); chk('G2 bogus positionBasis → MISSING_POSITION_BASIS', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_BASIS)); })();
(() => { const r = req(); r.association = association({ positionDirection: 'sideways' }); chk('G3 bogus positionDirection → MISSING_POSITION_DIRECTION', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_DIRECTION)); })();

// H. credibility validation
(() => { const r = req(); r.credibilityMetadata = {}; chk('H1 empty credibility → INSUFFICIENT_CREDIBILITY_METADATA', hasCode(Service.buildComparisonExport(r), CODES.INSUFFICIENT_CREDIBILITY_METADATA)); })();
(() => { const r = req(); r.credibilityMetadata = credibility({ provenance: 'synthetic' }); chk('H2 synthetic without SYNTHETIC_ONLY_LIMITATION → blocked', !Service.buildComparisonExport(r).eligible); })();
(() => {
  const r = req(); r.credibilityMetadata = credibility({ provenance: 'synthetic', limitations: [CODES.SYNTHETIC_ONLY_LIMITATION] });
  const out = Service.buildComparisonExport(r);
  chk('H3 synthetic with SYNTHETIC_ONLY_LIMITATION → eligible', out.eligible === true);
  chk('H4 export carries provenance=synthetic', out.envelope.payload.provenance === 'synthetic');
})();

// I. adversarial payload contents
(() => {
  // Caller mutates a copy of the C5 result (now non-authentic) → blocked by authenticity.
  const r = req();
  const result = JSON.parse(JSON.stringify(r.result));
  result.metrics.delta_cumulative.value = NaN;
  r.result = freezeResult(result);
  const out = Service.buildComparisonExport(r);
  chk('I1 mutated C5 result (NaN injected) → blocked by authenticity', out.eligible === false);
})();
(() => {
  // unknown reason code in credibility.limitations → blocked
  const r = req(); r.credibilityMetadata = credibility({ limitations: ['NOT_A_REAL_CODE'] });
  const out = Service.buildComparisonExport(r);
  chk('I2 unknown limitation code → blocked', out.eligible === false);
})();
(() => {
  // oversized framing array → blocked
  const r = req();
  r.framing = { cannotConclude: new Array(EX.MAX_BOUNDED_ARRAY + 1).fill({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' }) };
  const out = Service.buildComparisonExport(r);
  chk('I3 oversized cannotConclude array → blocked', out.eligible === false);
})();
(() => {
  // free-form prose in framing entry → rejected (not a plain {reasonCode,i18nKey,params?})
  const r = req();
  r.framing = { cannotConclude: ['driver was late on brakes'] };
  const out = Service.buildComparisonExport(r);
  chk('I4 free-form framing string → blocked', out.eligible === false);
})();
(() => {
  // params with array value → rejected
  const r = req();
  r.framing = { cannotConclude: [{ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { arr: [1, 2, 3] } }] };
  const out = Service.buildComparisonExport(r);
  chk('I5 framing params with array value → blocked', out.eligible === false);
})();
(() => {
  // params with exotic Date → rejected
  const r = req();
  r.framing = { cannotConclude: [{ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { when: new Date() } }] };
  const out = Service.buildComparisonExport(r);
  chk('I6 framing params with Date → blocked', out.eligible === false);
})();

// J. authority bypass via corner injection — all caller mutations to result land on a
// non-authentic object and fail-closed at the authenticity gate.
(() => {
  const r = req();
  const overSized = new Array(EX.MAX_BOUNDED_ARRAY + 1).fill(null).map((_, i) => Object.freeze({ cornerId: 'C' + i, value: 0, available: true }));
  r.result = freezeResult(Object.assign({}, r.result, { metrics: Object.assign({}, r.result.metrics, { sector_delta: Object.freeze({ scope: 'corner', partial: false, perCorner: Object.freeze(overSized) }) }) }));
  chk('J1 mutated result (oversized corners) → blocked', Service.buildComparisonExport(r).eligible === false);
})();
(() => {
  const r = req();
  const bad = [Object.freeze({ cornerId: 'C1', value: Infinity, available: true })];
  r.result = freezeResult(Object.assign({}, r.result, { metrics: Object.assign({}, r.result.metrics, { sector_delta: Object.freeze({ scope: 'corner', partial: false, perCorner: Object.freeze(bad) }) }) }));
  chk('J2 mutated result (corner Infinity) → blocked', Service.buildComparisonExport(r).eligible === false);
})();
(() => {
  const r = req();
  const bad = [Object.freeze({ value: -100, available: true })];
  r.result = freezeResult(Object.assign({}, r.result, { metrics: Object.assign({}, r.result.metrics, { sector_delta: Object.freeze({ scope: 'corner', partial: false, perCorner: Object.freeze(bad) }) }) }));
  chk('J3 mutated result (no cornerId) → blocked', Service.buildComparisonExport(r).eligible === false);
})();

// K. allowlist closure: caller cannot smuggle extra keys via reference lap summary
(() => {
  const r = req();
  r.referenceLap = { sessionId: 'sess1', lapId: 'lap_ref', lapTimeMs: 90000, secretRawTelemetry: 'x'.repeat(100), unknownField: 42 };
  const out = Service.buildComparisonExport(r);
  chk('K1 caller smuggle in referenceLap → built but extras dropped', out.eligible === true);
  chk('K1 referenceLap own-keys = sessionId,lapId,lapTimeMs only', Object.keys(out.envelope.payload.referenceLap).sort().join(',') === 'lapId,lapTimeMs,sessionId');
})();

// L. envelope is closed (F1 closure preserved at the C6 layer)
(() => {
  const r = req();
tests/r3-0c-comparison-export.test.js:30:  return DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:50:  return DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:334:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:372:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:397:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:421:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:446:  const real = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:471:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:497:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-delta-metrics.test.js:50:  const out = Service.computeDeltaMetrics(req());
tests/r3-0c-delta-metrics.test.js:65:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:76:  const a = Service.computeDeltaMetrics(req());
tests/r3-0c-delta-metrics.test.js:82:  const b = Service.computeDeltaMetrics(swap);
tests/r3-0c-delta-metrics.test.js:93:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:101:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:109:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:117:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:128:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:142:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:150:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:158:  const out = Service.computeDeltaMetrics(r);
tests/r3-0c-delta-metrics.test.js:165:  const out = Service.computeDeltaMetrics(req());
tests/r3-0c-delta-metrics.test.js:172:  const r = Service.computeDeltaMetrics(bad);
tests/r3-0c-delta-metrics.test.js:185:  const out1 = Service.computeDeltaMetrics(r1);
tests/r3-0c-delta-metrics.test.js:193:  const out2 = Service.computeDeltaMetrics(r2);
tests/r3-0c-delta-metrics.test.js:201:  const out3 = Service.computeDeltaMetrics(r3);
tests/r3-0c-delta-metrics.test.js:209:  const out4 = Service.computeDeltaMetrics(r4);
tests/r3-0c-delta-metrics.test.js:218:  const out5 = Service.computeDeltaMetrics(r5);

exec
/bin/bash -lc "node - <<'NODE'
const Service=require('./renderer/js/r3-0c-comparison-export');
const DM=require('./renderer/js/r3-0c-delta-metrics');
const C=require('./contracts/r3.0c');
const result=DM.computeDeltaMetrics({identity:{caseId:'caseA',sessionId:'sess1'},referenceLap:{lapTimeMs:90000},comparisonLap:{lapTimeMs:89500},pairing:{pairs:[{referenceCorner:{id:'C1',fullTimeMs:10000},comparisonCorner:{id:'C1',fullTimeMs:9900}}]},requestedMetrics:['lap_time','delta_cumulative','sector_delta'],policy:{deltaSign:'comparison_minus_reference'}});
let reads=[]; let n=0;
const raw={reasonCode:C.reasonCodes.REASON_CODES.CANNOT_DISTINGUISH,i18nKey:'r3_0c.framing.cannot_distinguish'};
const attack=new Proxy(raw,{getOwnPropertyDescriptor(t,k){reads.push('desc:'+String(k)); return Reflect.getOwnPropertyDescriptor(t,k)},get(t,k,r){reads.push('get:'+String(k)); if(k==='i18nKey') return ++n===1?'ATTACK.UNREGISTERED':'DIFFERENT.SECOND'; return Reflect.get(t,k,r)}});
const out=Service.buildComparisonExport({result,association:{caseId:'caseA',sessionId:'sess1',trackId:'silverstone',layoutId:'gp',positionBasis:'lap_distance',positionDirection:'increasing'},credibilityMetadata:{credibility:'Heuristic',provenance:'real',confidence:'low',limitations:[],blockedReasons:[]},generationToken:'g',referenceLap:{sessionId:'sess1',lapId:'r',lapTimeMs:90000},comparisonLap:{sessionId:'sess1',lapId:'c',lapTimeMs:89500},framing:{cannotConclude:[attack],alternativeExplanations:[],nextValidationAction:null}});
console.log(JSON.stringify({eligible:out.eligible,exported:out.envelope&&out.envelope.payload.cannotConclude,reads},null,2));
NODE
node tests/r3-0c-comparison-workspace.test.js
node tests/r3-0c-contracts-bundle-equivalence.test.js
node tests/r3-0c-comparison-export.test.js
node tests/r3-0c-governance.test.js
node tests/r3-0c-no-consumer.test.js
node tests/r3-0c-governance-integrity.test.js
node tests/r3-0-train.test.js
node tests/vehicle-preset-pipeline.test.js
node scripts/check-frozen-boundary.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 exited 1 in 441ms:
node:fs:3022
  return binding.mkdtemp(prefix, options.encoding);
                 ^

Error: EPERM: operation not permitted, mkdtemp '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/c6-shim-XXXXXX'
    at Object.mkdtempSync (node:fs:3022:18)
    at /Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-comparison-export.test.js:546:21
    at Object.<anonymous> (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-comparison-export.test.js:574:3)
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
  path: '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/c6-shim-XXXXXX'
}

Node.js v25.5.0
node:fs:3022
  return binding.mkdtemp(prefix, options.encoding);
                 ^

Error: EPERM: operation not permitted, mkdtemp '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3c-gov-art-XXXXXX'
    at Object.mkdtempSync (node:fs:3022:18)
    at runValidator (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-governance.test.js:26:18)
    at /Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-governance.test.js:111:13
    at Object.<anonymous> (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-governance.test.js:121:3)
    at Module._compile (node:internal/modules/cjs/loader:1803:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1934:10)
    at Module.load (node:internal/modules/cjs/loader:1524:32)
    at Module._load (node:internal/modules/cjs/loader:1326:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24) {
  errno: -1,
  code: 'EPERM',
  syscall: 'mkdtemp',
  path: '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3c-gov-art-XXXXXX'
}

Node.js v25.5.0
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
vehicle-preset-pipeline: 27 passed, 0 failed
node:fs:2397
    return binding.writeFileUtf8(
                   ^

Error: EPERM: operation not permitted, open '/Users/SKYLINE/Claude/projects/racing-setup-analyzer/artifacts/frozen-diff.txt'
    at Object.writeFileSync (node:fs:2397:20)
    at Object.<anonymous> (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/scripts/check-frozen-boundary.js:80:4)
    at Module._compile (node:internal/modules/cjs/loader:1803:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1934:10)
    at Module.load (node:internal/modules/cjs/loader:1524:32)
    at Module._load (node:internal/modules/cjs/loader:1326:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24)
    at Module.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:154:5)
    at node:internal/main/run_main_module:33:47 {
  errno: -1,
  code: 'EPERM',
  syscall: 'open',
  path: '/Users/SKYLINE/Claude/projects/racing-setup-analyzer/artifacts/frozen-diff.txt'
}

Node.js v25.5.0

exec
/bin/bash -lc "node -e '
const Service=require(\"./renderer/js/r3-0c-comparison-export\");
const DM=require(\"./renderer/js/r3-0c-delta-metrics\");
const C=require(\"./contracts/r3.0c\");
const result=DM.computeDeltaMetrics({identity:{caseId:\"caseA\",sessionId:\"sess1\"},referenceLap:{lapTimeMs:90000},comparisonLap:{lapTimeMs:89500},pairing:{pairs:[{referenceCorner:{id:\"C1\",fullTimeMs:10000},comparisonCorner:{id:\"C1\",fullTimeMs:9900}}]},requestedMetrics:[\"lap_time\",\"delta_cumulative\",\"sector_delta\"],policy:{deltaSign:\"comparison_minus_reference\"}});
let reads=[];
const raw={reasonCode:C.reasonCodes.REASON_CODES.CANNOT_DISTINGUISH,i18nKey:\"ignored\"};
const attack=new Proxy(raw,{get(t,k,r){reads.push(\"get:\"+String(k)); if(k===\"i18nKey\") return \"ATTACK.UNREGISTERED\"; return Reflect.get(t,k,r)}});
const out=Service.buildComparisonExport({result,association:{caseId:\"caseA\",sessionId:\"sess1\",trackId:\"silverstone\",layoutId:\"gp\",positionBasis:\"lap_distance\",positionDirection:\"increasing\"},credibilityMetadata:{credibility:\"Heuristic\",provenance:\"real\",confidence:\"low\",limitations:[],blockedReasons:[]},generationToken:\"g\",referenceLap:{sessionId:\"sess1\",lapId:\"r\",lapTimeMs:90000},comparisonLap:{sessionId:\"sess1\",lapId:\"c\",lapTimeMs:89500},framing:{cannotConclude:[attack],alternativeExplanations:[],nextValidationAction:null}});
console.log(JSON.stringify({eligible:out.eligible,exported:out.envelope&&out.envelope.payload.cannotConclude,reads},null,2));
'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
{
  "eligible": true,
  "exported": [
    {
      "reasonCode": "CANNOT_DISTINGUISH",
      "i18nKey": "ATTACK.UNREGISTERED"
    }
  ],
  "reads": [
    "get:reasonCode",
    "get:i18nKey",
    "get:params"
  ]
}

exec
/bin/bash -lc "rg -n \"browser|HTTP|R3_0C_Contracts|UI_INITIALIZATION_FAILED|registerAuthentic|B25|B26|B27|structured init|initialization\" tests/r3-0c-comparison-workspace.test.js tests/r3-0c-contracts-bundle-equivalence.test.js renderer/js/r3-0c-comparison-viewmodel.js renderer/index.html; node -e '
const fs=require(\"fs\"),s=require(\"./governance/r3.0c/state.json\"),c=require(\"./governance/r3.0c/checkpoints/C7.json\"),caps=require(\"./governance/r3.0c/capabilities.json\"),train=require(\"./governance/r3.0/train.json\"),rc=require(\"./contracts/r3.0c/reason-codes\");
const featureIds=[\"case_comparison\",\"reference_lap\",\"corner_delta\"]; const html=fs.readFileSync(\"renderer/index.html\",\"utf8\");
console.log(JSON.stringify({authPaths:s.authorizedProductionPaths.length,enabledCaps:s.enabledCapabilities.length,currentCheckpoint:s.currentCheckpoint,feature_registry_active:caps.feature_registry_active,phase_boundary_contract:caps.phase_boundary_contract,featureIds:featureIds.map(id=>({id,match:(html.match(new RegExp("'`id: .${id}.['"\\\\s\\\\S]{0,250}?availability: .(["'^.]*)`))||[])[1]})),reasonCount:rc.ALL_REASON_CODES.length,uiInit:rc.REASON_CODES.UI_INITIALIZATION_FAILED,bundleState:s.authorizedProductionPaths.some(x=>x.path==="renderer/js/r3-0c-contracts-bundle.js"),bundleC7:c.authorizedPaths.some(x=>x.path==="renderer/js/r3-0c-contracts-bundle.js"),reviewed:c.reviewedCandidateSha},null,2));
'"'; wc -c renderer/js/r3-0c-contracts-bundle.js; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..fc6ff8f81629593d24c6af7e3274e89607c34ed7 -- renderer/js/case-record-schema.js; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..fc6ff8f81629593d24c6af7e3274e89607c34ed7 -- "'$(node -e '"'const x=require(\"./scripts/frozen-files.json\"); console.log((Array.isArray(x)?x:(x.files||x.frozenFiles)).join(\" \"))')" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
renderer/js/r3-0c-comparison-viewmodel.js:23:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
tests/r3-0c-contracts-bundle-equivalence.test.js:5: * The browser loads contracts via renderer/js/r3-0c-contracts-bundle.js, an auto-generated
tests/r3-0c-contracts-bundle-equivalence.test.js:7: * contract source file is edited but the bundle is not regenerated, the browser sees stale
tests/r3-0c-contracts-bundle-equivalence.test.js:65:chk('D1 bundle evaluates cleanly in a browser-like sandbox (no module/exports)', evalErr === null, evalErr && String(evalErr));
tests/r3-0c-contracts-bundle-equivalence.test.js:69:chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
tests/r3-0c-contracts-bundle-equivalence.test.js:70:chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
tests/r3-0c-comparison-workspace.test.js:179:    chk('B25 Proxy lying getOwnPropertyDescriptor + accessor get → sanitized snapshot is the only safe surface', (() => {
tests/r3-0c-comparison-workspace.test.js:186:    // B26 Sanitized snapshot is frozen — caller cannot mutate it back to an unsafe shape.
tests/r3-0c-comparison-workspace.test.js:188:    chk('B26 valid result carries a sanitized snapshot', ok26.valid === true && ok26.sanitized && typeof ok26.sanitized === 'object');
tests/r3-0c-comparison-workspace.test.js:189:    chk('B26b sanitized snapshot is frozen', ok26.sanitized && Object.isFrozen(ok26.sanitized));
tests/r3-0c-comparison-workspace.test.js:190:    chk('B26c sanitized.params is frozen', ok26.sanitized && ok26.sanitized.params && Object.isFrozen(ok26.sanitized.params));
tests/r3-0c-comparison-workspace.test.js:191:    chk('B26d sanitized values equal validated descriptor values', ok26.sanitized.reasonCode === CODES.CANNOT_DISTINGUISH && ok26.sanitized.i18nKey === 'r3_0c.framing.observed_delta.faster_overall' && ok26.sanitized.params.ms === -123);
tests/r3-0c-comparison-workspace.test.js:193:    // B27 Inner params Proxy descriptor TOCTOU.
tests/r3-0c-comparison-workspace.test.js:204:    chk('B27 inner params Proxy lying descriptor → sanitized snapshot captures only validated value (or reject)', (() => {
tests/r3-0c-comparison-workspace.test.js:256:// Codex C7-R2-A-01 closure: the orchestrator no longer exposes registerAuthenticCaseRecord; the
tests/r3-0c-comparison-workspace.test.js:336:  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
renderer/index.html:274:             (including the new UI_INITIALIZATION_FAILED) surface localized wording. -->
renderer/index.html:317:  <button class="px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 mr-1" @click="backToSetupLibrary()" x-text="t('ux0.browser.back')"></button>
renderer/index.html:326:<div id="vp-browser" x-show="shellSection==='setup_library'" x-cloak class="mb-4 rounded-lg border border-slate-700 bg-slate-800/40 p-3" x-init="$nextTick(()=>{ if(shellSection==='setup_library' && !vpView) ensureVehiclePresets(); })">
renderer/index.html:329:    <span class="text-[11px] text-slate-500" x-text="(vpView?vpView.count:0)+' '+t('ux0.browser.count')"></span>
renderer/index.html:333:    <input x-model="vpFilters.search" @input="refreshVehiclePresets()" :placeholder="t('ux0.browser.search')" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 flex-1 min-w-[8rem]">
renderer/index.html:335:      <option value="" x-text="t('ux0.browser.manufacturer')+' · '+t('ux0.browser.all')"></option>
renderer/index.html:339:      <option value="" x-text="t('ux0.browser.layout')+' · '+t('ux0.browser.all')"></option>
renderer/index.html:345:      <template x-if="vpView && vpView.rows.length===0"><div class="text-slate-500 p-2" x-text="t('ux0.browser.no_results')"></div></template>
renderer/index.html:353:      <template x-if="!vpDetail"><div class="text-slate-500 p-2" x-text="t('ux0.browser.select_hint')"></div></template>
renderer/index.html:358:          <div><span class="text-slate-500" x-text="t('ux0.browser.confidence')+': '"></span><b x-text="vpDetail.confidence.grade"></b></div>
renderer/index.html:359:          <div><span class="text-slate-500" x-text="t('ux0.browser.provenance')+': '"></span><span x-text="vpDetail.provenance.badge"></span> <span x-html="credBadge('Derived')"></span></div>
renderer/index.html:361:          <button class="mt-1 px-2 py-1 rounded bg-sky-700 hover:bg-sky-600 text-xs" @click="loadPresetAsDraft()" x-text="t('ux0.browser.load_draft')"></button>
renderer/index.html:3253:<!-- R3.0C C7 Comparison Workspace browser wiring — Codex C7-R2-B-01 (J1) closure.
renderer/index.html:3298:  // Codex C7-R2-D-01 closure: structured init-failure surface. When init() detects the C7 UMD
renderer/index.html:3301:  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
renderer/index.html:3953:    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
renderer/index.html:3954:    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
renderer/index.html:3961:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
renderer/index.html:3962:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
renderer/index.html:3988:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
renderer/index.html:3989:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}
{
  "authPaths": 14,
  "enabledCaps": 12,
  "currentCheckpoint": "C7_UI",
  "featureIds": [
    {
      "id": "case_comparison"
    },
    {
      "id": "reference_lap"
    },
    {
      "id": "corner_delta"
    }
  ],
  "reasonCount": 66,
  "uiInit": "UI_INITIALIZATION_FAILED",
  "bundleState": true,
  "bundleC7": true
}
  119869 renderer/js/r3-0c-contracts-bundle.js
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-6ynckZXy' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-JAaYIj82' (errno=Operation not permitted)
[eval]:1
const x=require("./scripts/frozen-files.json"); console.log((Array.isArray(x)?x:(x.files||x.frozenFiles)).join(" "))
                                                                                                          ^

TypeError: Cannot read properties of undefined (reading 'join')
    at [eval]:1:107
    at runScriptInThisContext (node:internal/vm:219:10)
    at node:internal/process/execution:451:12
    at [eval]-wrapper:6:24
    at runScriptInContext (node:internal/process/execution:449:60)
    at evalFunction (node:internal/process/execution:283:30)
    at evalTypeScript (node:internal/process/execution:295:3)
    at node:internal/main/eval_string:71:3

Node.js v25.5.0
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-Z5Z0RTSh' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-F0w5nUgS' (errno=Operation not permitted)
contracts/r3.0c/framing-i18n-key-registry.js
contracts/r3.0c/index.js
contracts/r3.0c/reason-codes.js
contracts/r3.0c/viewmodel-state-transition-contract.js
governance/r3.0/train.json
governance/r3.0c/capabilities.json
governance/r3.0c/checkpoints/C7.json
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md
governance/r3.0c/state.json
package.json
renderer/index.html
renderer/js/i18n-comparisons.js
renderer/js/r3-0c-comparison-orchestrator.js
renderer/js/r3-0c-comparison-viewmodel.js
renderer/js/r3-0c-contracts-bundle.js
scripts/build-r3-0c-contracts-bundle.js
tests/i18n-parity.test.js
tests/r3-0c-comparison-workspace.test.js
tests/r3-0c-contracts-bundle-equivalence.test.js
tests/r3-0c-governance.test.js
tests/r3-0c-no-consumer.test.js
tests/r3.0a-ui.test.js
tests/r3.0c-contract-foundation.test.js

exec
/bin/bash -lc "node -e 'const f=require(\"./scripts/frozen-files.json\"); console.log(JSON.stringify(f,null,2))'; rg -n -C 3 'case_comparison|reference_lap|corner_delta|feature_registry_active|phase_boundary_contract' governance/r3.0c/capabilities.json governance/r3.0c/checkpoints/C7.json renderer/index.html; git diff --numstat 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..fc6ff8f81629593d24c6af7e3274e89607c34ed7 -- renderer/js/case-record-schema.js renderer/js/dynamics-model.js renderer/js/car-presets.js renderer/js/vehicle-profile-f312.js; node -e 'const fs=require(\"fs\"),b=fs.readFileSync(\"renderer/js/r3-0c-contracts-bundle.js\",\"utf8\"),g=require(\"./scripts/build-r3-0c-contracts-bundle.js\"); console.log({chars:b.length,bytes:Buffer.byteLength(b)})'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
{
  "version": 1,
  "description": "R3-GATE0 frozen-boundary manifest. These production modules + data are contracts/schemas/physics that MUST NOT change in ordinary maintenance PRs. A milestone explicitly authorised to change one of these must add it to an allowlist (FROZEN_ALLOW env, comma-separated repo-relative paths) — the whole check is never disabled. Authority is git history, not any derived hash.",
  "frozen": [
    {
      "path": "renderer/js/dynamics-model.js",
      "concept": "physics_dynamics_model"
    },
    {
      "path": "renderer/js/telemetry-core.js",
      "concept": "telemetry_authority"
    },
    {
      "path": "renderer/js/canonical-telemetry-session.js",
      "concept": "canonical_telemetry_core"
    },
    {
      "path": "renderer/js/telemetry-schema.js",
      "concept": "telemetry_authority"
    },
    {
      "path": "renderer/js/channel-mapping.js",
      "concept": "telemetry_authority"
    },
    {
      "path": "renderer/js/calibration-registry.js",
      "concept": "telemetry_authority"
    },
    {
      "path": "renderer/js/analysis-case.js",
      "concept": "analysis_case_schema"
    },
    {
      "path": "renderer/js/setup-snapshot.js",
      "concept": "analysis_case_schema"
    },
    {
      "path": "renderer/js/canonical-parameters.js",
      "concept": "canonical_parameter_contract"
    },
    {
      "path": "renderer/js/parameter-conversions.js",
      "concept": "canonical_parameter_contract"
    },
    {
      "path": "renderer/js/canonical-model-input.js",
      "concept": "canonical_parameter_contract"
    },
    {
      "path": "renderer/js/suspension-input-normalizer.js",
      "concept": "suspension_normalization_contract"
    },
    {
      "path": "renderer/js/analysis-case-export.js",
      "concept": "case_export_schema"
    },
    {
      "path": "renderer/js/storage-backend.js",
      "concept": "persistence_schema"
    },
    {
      "path": "renderer/js/schema-migration.js",
      "concept": "persistence_schema"
    },
    {
      "path": "renderer/js/case-record-schema.js",
      "concept": "persistence_schema"
    },
    {
      "path": "renderer/js/case-store.js",
      "concept": "persistence_schema"
    },
    {
      "path": "renderer/js/session-store.js",
      "concept": "persistence_schema"
    },
    {
      "path": "renderer/js/case-library-viewmodel.js",
      "concept": "r3_0b_contract"
    },
    {
      "path": "renderer/js/feature-registry.js",
      "concept": "r3_0a_product_shell_contract"
    },
    {
      "path": "renderer/js/feature-router.js",
      "concept": "r3_0a_product_shell_contract"
    },
    {
      "path": "renderer/js/car-presets.js",
      "concept": "car_preset_data"
    },
    {
      "path": "renderer/js/vehicle-profile-f312.js",
      "concept": "vehicle_profile_data"
    }
  ]
}
governance/r3.0c/capabilities.json-64-      "unlockFloor": "C7_UI",
governance/r3.0c/capabilities.json-65-      "description": "Comparison UI surface in renderer/index.html and supporting renderer/js modules."
governance/r3.0c/capabilities.json-66-    },
governance/r3.0c/capabilities.json:67:    "feature_registry_active": {
governance/r3.0c/capabilities.json-68-      "kind": "activation",
governance/r3.0c/capabilities.json-69-      "unlockFloor": "C8_ACTIVATION",
governance/r3.0c/capabilities.json:70:      "description": "Feature Registry flips the deferred R3.0C feature IDs (case_comparison, reference_lap, corner_delta) to available, attaching their rendererAdapter. Only valid at C8."
governance/r3.0c/capabilities.json-71-    },
governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/capabilities.json-73-      "kind": "contract",
governance/r3.0c/capabilities.json-74-      "unlockFloor": "C5R_CP1_RETROFIT",
governance/r3.0c/capabilities.json-75-      "enabled": false,
--
governance/r3.0c/checkpoints/C7.json-42-  "enabledCapabilitiesBefore": ["production_adapter_present", "lap_authority_present", "track_identity_authoritative", "normalized_distance_present", "reference_selection_present", "corner_segmentation_present", "corner_pairing_present", "delta_metrics_present", "comparison_export_present"],
governance/r3.0c/checkpoints/C7.json-43-  "enabledCapabilitiesAfter": ["production_adapter_present", "lap_authority_present", "track_identity_authoritative", "normalized_distance_present", "reference_selection_present", "corner_segmentation_present", "corner_pairing_present", "delta_metrics_present", "comparison_export_present", "ui_present", "viewmodel_state_transition_contract", "framing_source_structured_contract"],
governance/r3.0c/checkpoints/C7.json-44-  "forbiddenCapabilities": [
governance/r3.0c/checkpoints/C7.json:45:    "feature_registry_active"
governance/r3.0c/checkpoints/C7.json-46-  ],
governance/r3.0c/checkpoints/C7.json-47-
governance/r3.0c/checkpoints/C7.json-48-  "tests": {
--
governance/r3.0c/checkpoints/C7.json-68-    ],
governance/r3.0c/checkpoints/C7.json-69-    "stateTransitionContract": "contracts/r3.0c/viewmodel-state-transition-contract.js",
governance/r3.0c/checkpoints/C7.json-70-    "framingSourceContract": "contracts/r3.0c/framing-i18n-key-registry.js",
governance/r3.0c/checkpoints/C7.json:71:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/checkpoints/C7.json-72-    "exportButtonGate": "viewmodel exportGate predicate — disabled binding on the button + click-time recheck"
governance/r3.0c/checkpoints/C7.json-73-  },
governance/r3.0c/checkpoints/C7.json-74-
--
governance/r3.0c/checkpoints/C7.json-76-    "frozenFilesUntouched": true,
governance/r3.0c/checkpoints/C7.json-77-    "r30bPersistenceUntouched": true,
governance/r3.0c/checkpoints/C7.json-78-    "featureRegistryUnchanged": true,
governance/r3.0c/checkpoints/C7.json:79:    "deferredFeatureIdsStillDeferred": ["case_comparison", "reference_lap", "corner_delta"],
governance/r3.0c/checkpoints/C7.json-80-    "phaseBoundaryContractEnabled": false
governance/r3.0c/checkpoints/C7.json-81-  },
governance/r3.0c/checkpoints/C7.json-82-
--
governance/r3.0c/checkpoints/C7.json-84-  "productionDiff": null,
governance/r3.0c/checkpoints/C7.json-85-  "runtimeConsumerCount": null,
governance/r3.0c/checkpoints/C7.json-86-  "featureRegistryState": {
governance/r3.0c/checkpoints/C7.json:87:    "expectedDeferredIds": ["case_comparison", "reference_lap", "corner_delta"],
governance/r3.0c/checkpoints/C7.json-88-    "expectedRendererAdapter": false
governance/r3.0c/checkpoints/C7.json-89-  },
governance/r3.0c/checkpoints/C7.json-90-
--
governance/r3.0c/checkpoints/C7.json-93-  "status": "pending",
governance/r3.0c/checkpoints/C7.json-94-  "governanceChanged": true,
governance/r3.0c/checkpoints/C7.json-95-
governance/r3.0c/checkpoints/C7.json:96:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/checkpoints/C7.json-97-}
--
renderer/index.html-253-    </div>
renderer/index.html-254-  </div>
renderer/index.html-255-
renderer/index.html:256:  <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
renderer/index.html-257-       `comparisonVMState().metricAvailability.entry_delta` (mid / exit) values are forced to
renderer/index.html-258-       false by the viewmodel so this branch never enters until a future checkpoint authorizes
renderer/index.html-259-       phase-boundary derivation. -->
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-XdX4mYIA' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-B5FT9MtF' (errno=Operation not permitted)
{ chars: 116083, bytes: 119869 }

codex
C7-R4-A-01  
SEVERITY: BLOCKER  
FILE: [r3-0c-comparison-export.js:153](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-export.js:153), [r3-0c-comparison-export.js:402](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-export.js:402)

ATTACK STEPS:

```js
const attack = new Proxy({
  reasonCode: CODES.CANNOT_DISTINGUISH
}, {
  get(target, key) {
    if (key === 'i18nKey') return 'ATTACK.UNREGISTERED';
    return Reflect.get(target, key);
  }
});

request.framing.cannotConclude = [attack];
const out = Service.buildComparisonExport(request);
```

Using an authentic C5 result, the reproduced output was:

```json
{
  "eligible": true,
  "cannotConclude": [{
    "reasonCode": "CANNOT_DISTINGUISH",
    "i18nKey": "ATTACK.UNREGISTERED"
  }]
}
```

WHY current code fails:

C6 `_allowlistFrame()` directly reads caller-controlled `frame.reasonCode`, `frame.i18nKey`, and `frame.params`. It neither calls `validateFramingEntry()` nor consumes its sanitized snapshot. It also checks only that `i18nKey` is non-empty, not that it belongs to `FRAMING_I18N_KEY_REGISTRY`.

Therefore the non-negotiable requirement that C5/C6 and every downstream framing consumer use the sanitized surface—or avoid unchecked raw reads—is not met. A public C6 caller can invoke proxy side effects and export an unregistered framing key.

Minimal fix:

Make `_allowlistFrame()` call `FIR.validateFramingEntry(frame)` exactly once and rebuild solely from `vr.sanitized`, without subsequently accessing `frame`. Add a C6 regression test using an authentic C5 result and a proxy whose raw getters throw, mutate state, or return an unregistered key.

Other evidence:

- HEAD and branch match: `fc6ff8f81629593d24c6af7e3274e89607c34ed7`, `feat/r3.0c-c7-comparison-workspace`; worktree clean.
- Orchestrator TOCTOU fix itself uses `vr.sanitized`/`er.sanitized`; no post-validation entry-field reread found there.
- B25/B26/B27 exist; workspace suite: 88 passed.
- Bundle equivalence suite: 17 passed. Generated size is 116,083 characters / 119,869 UTF-8 bytes.
- Script dependency order is bundle → delta metrics → export → orchestrator → viewmodel.
- Reason-code count is 66; `UI_INITIALIZATION_FAILED` is present.
- D1 public registration APIs remain absent; viewmodel has no registration call.
- Structured initialization failure remains present.
- Governance: 14 authorized paths, 12 enabled capabilities, `C7_UI`, three deferred feature IDs, feature-registry activation forbidden, phase boundary disabled.
- Bundle is authorized in both `state.json` and `C7.json`.
- Frozen-file and R3.0B schema diffs are empty; preset suite reports 27 passed and retains the 501-preset assertion.
- Filesystem-dependent governance/full-suite checks could not complete because the review environment rejects `mkdtemp` and artifact writes with `EPERM`.

VERDICT: BLOCK
tokens used
75,425
C7-R4-A-01  
SEVERITY: BLOCKER  
FILE: [r3-0c-comparison-export.js:153](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-export.js:153), [r3-0c-comparison-export.js:402](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-export.js:402)

ATTACK STEPS:

```js
const attack = new Proxy({
  reasonCode: CODES.CANNOT_DISTINGUISH
}, {
  get(target, key) {
    if (key === 'i18nKey') return 'ATTACK.UNREGISTERED';
    return Reflect.get(target, key);
  }
});

request.framing.cannotConclude = [attack];
const out = Service.buildComparisonExport(request);
```

Using an authentic C5 result, the reproduced output was:

```json
{
  "eligible": true,
  "cannotConclude": [{
    "reasonCode": "CANNOT_DISTINGUISH",
    "i18nKey": "ATTACK.UNREGISTERED"
  }]
}
```

WHY current code fails:

C6 `_allowlistFrame()` directly reads caller-controlled `frame.reasonCode`, `frame.i18nKey`, and `frame.params`. It neither calls `validateFramingEntry()` nor consumes its sanitized snapshot. It also checks only that `i18nKey` is non-empty, not that it belongs to `FRAMING_I18N_KEY_REGISTRY`.

Therefore the non-negotiable requirement that C5/C6 and every downstream framing consumer use the sanitized surface—or avoid unchecked raw reads—is not met. A public C6 caller can invoke proxy side effects and export an unregistered framing key.

Minimal fix:

Make `_allowlistFrame()` call `FIR.validateFramingEntry(frame)` exactly once and rebuild solely from `vr.sanitized`, without subsequently accessing `frame`. Add a C6 regression test using an authentic C5 result and a proxy whose raw getters throw, mutate state, or return an unregistered key.

Other evidence:

- HEAD and branch match: `fc6ff8f81629593d24c6af7e3274e89607c34ed7`, `feat/r3.0c-c7-comparison-workspace`; worktree clean.
- Orchestrator TOCTOU fix itself uses `vr.sanitized`/`er.sanitized`; no post-validation entry-field reread found there.
- B25/B26/B27 exist; workspace suite: 88 passed.
- Bundle equivalence suite: 17 passed. Generated size is 116,083 characters / 119,869 UTF-8 bytes.
- Script dependency order is bundle → delta metrics → export → orchestrator → viewmodel.
- Reason-code count is 66; `UI_INITIALIZATION_FAILED` is present.
- D1 public registration APIs remain absent; viewmodel has no registration call.
- Structured initialization failure remains present.
- Governance: 14 authorized paths, 12 enabled capabilities, `C7_UI`, three deferred feature IDs, feature-registry activation forbidden, phase boundary disabled.
- Bundle is authorized in both `state.json` and `C7.json`.
- Frozen-file and R3.0B schema diffs are empty; preset suite reports 27 passed and retains the 501-preset assertion.
- Filesystem-dependent governance/full-suite checks could not complete because the review environment rejects `mkdtemp` and artifact writes with `EPERM`.

VERDICT: BLOCK
---- END codex exec ----
utcEndedAt: 2026-06-28T03:32:01Z
