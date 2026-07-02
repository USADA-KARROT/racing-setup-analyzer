# Codex C7 Round 7 — Tier 1 raw stdout capture

reviewedCandidateSha: f0304ffc24d05d0f90abbffe368d5e4bcb1795ff
utcStartedAt: 2026-06-28T03:49:47Z

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
session id: 019f0c59-0119-7f01-8c18-98d12c4bc526
--------
user
# Codex C7 Round 7 — convergence check

ROLE: Adversarial reviewer. Try to break.

REVIEWED CANDIDATE
- Repo: USADA-KARROT/racing-setup-analyzer
- Branch: feat/r3.0c-c7-comparison-workspace
- SHA: f0304ffc24d05d0f90abbffe368d5e4bcb1795ff
- Base SHA: 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9

PRIOR EVIDENCE (in repo):
- governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md
- governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md
- governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md
- governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md
- governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md

NEW SCOPE in f0304ff vs 93506779:
- renderer/js/r3-0c-comparison-viewmodel.js — all 7 public mutators now use _safeShallowCopy
  + try/catch returning structured BLOCKED placeholder on residual throw. NO mutator escapes.
- tests/r3-0c-comparison-workspace.test.js — G5.1-G5.4 (×4 assertions each) + G5.no1-G5.no3
  exercise hostile Proxy ownKeys trap across all four object mutators + three notify triggers.

VERIFICATION PROBES — output BLOCK only on concrete attack.

1. Re-run the Round 6 attack against f0304ff: vm.setReference(hostile Proxy with throwing ownKeys).
   Confirm NO throw escapes. Confirm placeholder !== 'ready'. Confirm exportGate=false.

2. Probe each of the 5 PUBLIC service surfaces with hostile input:
   • orchestrator.requestComparison(hostile) — must return structured blocked.
   • orchestrator.exportComparison(hostile, hostileExtras) — must return structured blocked.
   • delta-metrics.computeDeltaMetrics(hostile) — must return structured blocked.
   • comparison-export.buildComparisonExport(hostile) — must return structured blocked (already had outer try/catch).
   • viewmodel.{setReference,setComparison,setAssociation,setChannelMapping,notifyCaseReopen,notifyAuthorityRevoked,notifyEligibilityRevoked}(hostile) — must not throw.

3. Confirm D1 holds: orchestrator public API does NOT carry registerAuthenticCaseRecord / isAuthenticCaseRecord.

4. Confirm J1 holds: bundle equivalence, browser UMD eval registers all R3_0C_* globals.

5. Confirm framing-source sanitized contract: validateFramingEntry returns frozen sanitized; orchestrator/_validateFramingOrFallback + _buildFraming use sanitized; C6 _allowlistFrame uses sanitized.

6. Confirm init structured failure: UI_INITIALIZATION_FAILED reachable.

7. Confirm governance: authPaths=14, enabledCaps=12, currentCheckpoint=C7_UI, three feature IDs deferred, phase_boundary_contract disabled, frozenDiff=0, presetCount=501.

8. Confirm scope: frozen physics / preset / R3.0B portable schema all untouched.

9. ANY OTHER CONCRETE C7-scope attack — speak up.

EVIDENCE REQUIRED — same format. VERDICT: PASS or BLOCK.

A clean PASS unlocks: persist Round 7 evidence + C7 manifest reviewedCandidateSha=f0304ff +
branch-to-branch PR (feat/r3.0c-c7-comparison-workspace → feat/r3.0-integrated-delivery) +
target-context CI + Train merge + multi-source verify + memory update + auto-start C8.

codex
I’ll inspect the exact candidate diff and prior evidence, then run the specified hostile-input, bundle, governance, and scope probes. I’ll only return BLOCK for a reproducible concrete defect.
exec
/bin/bash -lc 'git status --short && git rev-parse HEAD && git branch --show-current && rg --files governance/r3.0c/codex-checkpoint-evidence/C7 | sort' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-46R2zc7b' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-pmnDy6Qq' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-Bh7i2WjT' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-mU7AJDK8' (errno=Operation not permitted)
f0304ffc24d05d0f90abbffe368d5e4bcb1795ff
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-CTOmwcMm' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-RO0jNdQE' (errno=Operation not permitted)
feat/r3.0c-c7-comparison-workspace
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md

exec
/bin/bash -lc "sed -n '1,260p' governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md && sed -n '1,240p' package.json" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
# Codex C7 Round 6 — Tier 1 raw stdout capture

reviewedCandidateSha: 93506779c23fdd759178d506dbf95030daafd4cc
utcStartedAt: 2026-06-28T03:43:38Z

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
session id: 019f0c53-63e6-7c30-b1e4-16989e44e22f
--------
user
# Codex C7 Round 6 — final convergence pass

ROLE: Adversarial reviewer. Try to break.

REVIEWED CANDIDATE
- Repo: USADA-KARROT/racing-setup-analyzer (clone at /Users/SKYLINE/Claude/projects/racing-setup-analyzer)
- Branch: feat/r3.0c-c7-comparison-workspace
- SHA: 93506779c23fdd759178d506dbf95030daafd4cc
- Base SHA: 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9
- Round 5 evidence: governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md

PRIOR CLOSURES TO VERIFY HOLD
- D1 (R2-A): no public registration on orchestrator; viewmodel cannot bestow authority.
- J1 (R2-B): contracts bundle + 5 script tags + browser-UMD eval; bundle equivalence test.
- C (R2-C / R3-C / R4): framing validator returns frozen sanitized snapshot; orchestrator + C6 consume only sanitized; no plain re-reads.
- D (R2-D): UI_INITIALIZATION_FAILED structural state distinct from idle.
- R5-01: exportComparison wraps caller reads in try/catch + descriptor-safe reads.

NEW SCOPE in 9350677 vs 1b89e2b:
- renderer/js/r3-0c-comparison-orchestrator.js requestComparison body wrapped in outer try/catch returning _blockedResponse on any throw.
- renderer/js/r3-0c-delta-metrics.js computeDeltaMetrics body wrapped in outer try/catch returning _blocked on any throw.

CHECKS — output BLOCK only on a CONCRETE attack against the current candidate.

1. Confirm requestComparison cannot throw on hostile input. Build a Proxy whose get-trap throws on any of: caseRecord, association, eligibilityInput, deltaMetricsRequest, framing, credibilityMetadata. Verify all hostile-get variants return status:blocked NOT throw.

2. Confirm computeDeltaMetrics cannot throw on hostile input. Same probe against request.identity / request.requestedMetrics / request.pairing / etc.

3. Confirm buildComparisonExport cannot throw on hostile input. (Already has outer try/catch from F-C6-A2 round 2 + Z1-Z4 close inner framing TOCTOU.)

4. Confirm exportComparison cannot throw on hostile input. (R5-01 closure.)

5. Confirm viewmodel public methods (setReference, setComparison, setAssociation, setChannelMapping, notifyCaseReopen, notifyAuthorityRevoked, notifyEligibilityRevoked, getState) cannot throw on hostile caller-supplied selections. If any throw escapes the public boundary, flag.

6. Confirm framing validator's sanitized contract still holds against new Proxy attacks at the descriptor + value layer. (Round 3/4 closures.)

7. Confirm D1 closure: no public registration method on orchestrator; viewmodel cannot bestow authority.

8. Confirm browser load: bundle + 5 script tags + globals registered.

9. Confirm governance invariants: authPaths=14, enabledCaps=12, currentCheckpoint=C7_UI, three feature IDs deferred, phase_boundary_contract disabled, frozenDiff=0, R3.0B schema untouched, presetCount=501.

10. Anything else that could BLOCK C7 from integration into the Train.

EVIDENCE REQUIRED — same format. VERDICT: PASS or BLOCK on last line.

A clean PASS unlocks: C7 manifest with reviewedCandidateSha=93506779, branch-to-branch PR (feat/r3.0c-c7-comparison-workspace → feat/r3.0-integrated-delivery), Train target-context CI run, merge, multi-source verify, memory update, C8 auto-start.

codex
I’ll review the exact SHA against the stated base, reproduce each hostile-input boundary with targeted probes, then run the repository’s governance/browser/test checks. I’ll report only concrete current-candidate failures as blockers.
exec
/bin/bash -lc "git status --short && git branch --show-current && git rev-parse HEAD && git diff --stat 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..93506779c23fdd759178d506dbf95030daafd4cc && sed -n '1,240p' governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-yyxVZEmr' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-46f4MrDR' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-L83Up0GL' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-XzCDMP8c' (errno=Operation not permitted)
feat/r3.0c-c7-comparison-workspace
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-lgHeyepm' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-7ecJjtgc' (errno=Operation not permitted)
93506779c23fdd759178d506dbf95030daafd4cc
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-xjAw5am9' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-dbDVyWs8' (errno=Operation not permitted)
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
 .../C7/round-5-a1a6988e.md                         | 2103 ++++++++
 governance/r3.0c/state.json                        |   16 +-
 package.json                                       |    2 +-
 renderer/index.html                                |  180 +-
 renderer/js/i18n-comparisons.js                    |  186 +
 renderer/js/r3-0c-comparison-export.js             |   61 +-
 renderer/js/r3-0c-comparison-orchestrator.js       |  409 ++
 renderer/js/r3-0c-comparison-viewmodel.js          |  277 ++
 renderer/js/r3-0c-contracts-bundle.js              | 1869 +++++++
 renderer/js/r3-0c-delta-metrics.js                 |   10 +
 scripts/build-r3-0c-contracts-bundle.js            |  119 +
 tests/i18n-parity.test.js                          |   11 +
 tests/r3-0c-comparison-export.test.js              |   65 +
 tests/r3-0c-comparison-workspace.test.js           |  445 ++
 tests/r3-0c-contracts-bundle-equivalence.test.js   |   78 +
 tests/r3-0c-governance.test.js                     |    8 +-
 tests/r3-0c-no-consumer.test.js                    |   11 +-
 tests/r3.0a-ui.test.js                             |   12 +-
 tests/r3.0c-contract-foundation.test.js            |    4 +-
 29 files changed, 18311 insertions(+), 60 deletions(-)
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
{
  "name": "racing-setup-analyzer",
  "version": "1.4.0",
  "description": "Vehicle-dynamics setup & lap-time analyzer (handling balance, springs/ARB/dampers, tyre-stint simulation)",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "test": "node tests/verify-dynamics.js && node tests/telemetry-core.test.js && node tests/telemetry-view.test.js && node tests/telemetry-plot.test.js && node tests/telemetry-interact.test.js && node tests/telemetry-yaw.test.js && node tests/canonical-parameters.test.js && node tests/parameter-conversions.test.js && node tests/vehicle-profile-f312.test.js && node tests/setup-snapshot.test.js && node tests/analysis-case.test.js && node tests/analysis-case-adversarial.test.js && node tests/suspension-input-normalizer.test.js && node tests/suspension-input-equivalence.test.js && node tests/suspension-input-adversarial.test.js && node tests/canonical-model-input.test.js && node tests/analysis-execution.test.js && node tests/telemetry-observation.test.js && node tests/model-telemetry-comparison.test.js && node tests/race-engineer-insight.test.js && node tests/driver-coach-insight.test.js && node tests/analysis-workspace.test.js && node tests/analysis-workspace-viewmodel.test.js && node tests/analysis-workspace-integration.test.js && node tests/analysis-workspace-ui.test.js && node tests/telemetry-import-adapter.test.js && node tests/channel-mapping.test.js && node tests/calibration-registry.test.js && node tests/analysis-window.test.js && node tests/canonical-telemetry-session.test.js && node tests/analysis-case-export.test.js && node tests/r2.3-real-telemetry-integration.test.js && node tests/r2.3-import-ui.test.js && node tests/measured-metrics.test.js && node tests/r2.4-measured-metrics-integration.test.js && node tests/r2.4-ui.test.js && node tests/setup-ab.test.js && node tests/quantitative-setup-recommendation.test.js && node tests/r2.5-setup-ab-quantitative-integration.test.js && node tests/r2.5-ui.test.js && node tests/track-intelligence.test.js && node tests/r2.6-track-intelligence-integration.test.js && node tests/r2.6-ui.test.js && node tests/case-shell.test.js && node tests/r3.0a-ui.test.js && node tests/storage-backend.test.js && node tests/schema-migration.test.js && node tests/case-record-schema.test.js && node tests/case-store.test.js && node tests/session-store.test.js && node tests/case-library-viewmodel.test.js && node tests/r3.0b-ui.test.js && node tests/r3.0b-persistence-integration.test.js && node tests/feature-registry.test.js && node tests/feature-router.test.js && node tests/vehicle-preset-pipeline.test.js && node tests/i18n-parity.test.js && node tests/r3.0c-contract-foundation.test.js && node tests/r3-0c-comparison-adapter.test.js && node tests/r3-0c-lap-authority.test.js && node tests/r3-0c-track-identity.test.js && node tests/r3-0c-distance-authority.test.js && node tests/r3-0c-normalized-distance.test.js && node tests/r3-0c-reference-selection.test.js && node tests/r3-0c-corner-segmentation.test.js && node tests/r3-0c-corner-pairing.test.js && node tests/r3-0c-delta-metrics.test.js && node tests/r3-0c-comparison-export.test.js && node tests/r3-0c-comparison-workspace.test.js && node tests/r3-0c-contracts-bundle-equivalence.test.js && node tests/r3-0c-governance.test.js && node tests/r3-0c-no-consumer.test.js && node tests/r3-0c-governance-integrity.test.js && node tests/r3-0-phase-governance.test.js && node tests/r3-0-phase-no-consumer.test.js && node tests/r3-0-phase-governance-integrity.test.js && node tests/r3-0-train.test.js && node tools/validate-against-telemetry.js --selftest",
    "build:mac": "electron-builder --mac",
    "build:win": "electron-builder --win",
    "build:all": "electron-builder --mac --win"
  },
  "build": {
    "appId": "com.racingsetup.analyzer",
    "productName": "Racing Setup Analyzer",
    "directories": {
      "output": "build"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer/**/*"
    ],
    "mac": {
      "target": "dmg",
      "category": "public.app-category.utilities",
      "icon": "icon.icns"
    },
    "win": {
      "icon": "icon.png",
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ]
    },
    "nsis": {
      "oneClick": true,
      "allowToChangeInstallationDirectory": false
    }
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  }
}

exec
/bin/bash -lc 'git diff --stat 93506779..f0304ff && git diff -- renderer/js/r3-0c-comparison-viewmodel.js tests/r3-0c-comparison-workspace.test.js 93506779..f0304ff' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-6WLJccBf' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-nIk44UrS' (errno=Operation not permitted)
 .../C7/round-6-93506779.md                         | 2738 ++++++++++++++++++++
 renderer/js/r3-0c-comparison-viewmodel.js          |   99 +-
 tests/r3-0c-comparison-workspace.test.js           |   37 +
 3 files changed, 2857 insertions(+), 17 deletions(-)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-anZve18z' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-pciRMPVu' (errno=Operation not permitted)

exec
/bin/bash -lc 'rg -n "requestComparison|exportComparison|computeDeltaMetrics|buildComparisonExport|validateFramingEntry|UI_INITIALIZATION_FAILED|registerAuthenticCaseRecord|isAuthenticCaseRecord|R3_0C_|authPaths|enabledCaps|currentCheckpoint|phase_boundary_contract|presetCount" renderer tests governance scripts package.json' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
governance/r3.0/train.json:10:      "currentCheckpoint": "C7_UI",
governance/r3.0/train.json:17:      "currentCheckpoint": "D0_BOOTSTRAP",
governance/r3.0/train.json:24:      "currentCheckpoint": "E0_BOOTSTRAP",
governance/r3.0/train.json:31:      "currentCheckpoint": "F0_BOOTSTRAP",
governance/r3.0/train.json:61:  "note": "R3.0 Integrated Delivery Train state. IN_PROGRESS means SKYLINE has authorized the feature train; feat/r3.0-integrated-delivery has been opened from main at the G1 head SHA. No production code is added by this commit and no capability is enabled — opening the branch is the only state change. Per-phase currentCheckpoint advances under separately-authorized Train checkpoints (C1..C8, D1..D5, E1..E5, F1..F5). Final merge happens once at R3.0F F6_RELEASE; v2.0.0 tag + GitHub Release are created post-merge after the new main trusted-verification PASS. trainStatus then becomes MERGED."
governance/r3.0e/checkpoint-manifest.schema.json:5:  "note": "Format for governance/r3.0e/checkpoints/<CHECKPOINT_ID>.json. E0 establishes the schema and writes its own manifest as 'pending'; final PASS is expressed by the trusted-verification artifact bound to artifactBoundSha. The checkpoint manifest never self-asserts PASS — only the CI artifact does. Cross-phase advancement of any non-bootstrap E checkpoint additionally requires R3.0D state.currentCheckpoint === 'D5_ACTIVATION' per scripts/check-r3-0-train.js.",
scripts/check-r3-0c-governance-integrity.js:25:// INTEGRITY_REPO defaults to the real repo. R3_0C_INTEGRITY_REPO_OVERRIDE is for test fixtures ONLY —
scripts/check-r3-0c-governance-integrity.js:27:const INTEGRITY_REPO = process.env.R3_0C_INTEGRITY_REPO_OVERRIDE ? path.resolve(process.env.R3_0C_INTEGRITY_REPO_OVERRIDE) : REPO;
scripts/build-r3-0c-contracts-bundle.js:10: * the R3_0C_* globals and the comparison pane stays at placeholder.idle forever.
scripts/build-r3-0c-contracts-bundle.js:16: *   - the no-consumer validator's INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE regex does not match
scripts/build-r3-0c-contracts-bundle.js:77:  '// (`if (root) root.R3_0C_X = api`) registers every contract on globalThis before the\n' +
tests/r3-0c-comparison-adapter.test.js:170:  'computeDeltaMetrics', 'supportedDeltaMetrics', 'deltaMetricsSignFormula',
tests/r3-0c-comparison-adapter.test.js:172:  'buildComparisonExport', 'comparisonExportIdentity', 'comparisonExportSchemaVersion', 'comparisonExportEnvelopeKeys',
tests/r3-0c-comparison-adapter.test.js:183:chk('G7 adapter exposes buildComparisonExport (C6 delegation)', typeof Adapter.buildComparisonExport === 'function');
tests/r3-0c-comparison-adapter.test.js:193:  // selectReference / buildComparisonExport are all legitimate C3..C6 surface now.
tests/r3-0c-comparison-adapter.test.js:194:  const postC6Surface = ['exportComparison', 'fastest_valid', 'median_valid', 'best_sector_composite', 'selectReferenceLap', 'renderComparisonWorkspace'];
tests/r3-0c-comparison-adapter.test.js:202:chk('I2 adapter exposes its API on globalThis under R3_0C_ComparisonAdapter', typeof globalThis.R3_0C_ComparisonAdapter === 'object' && globalThis.R3_0C_ComparisonAdapter === Adapter);
tests/r3-0c-comparison-adapter.test.js:466:// asserts no renderer/js path supplies it while phase_boundary_contract is disabled).
tests/r3-0c-comparison-adapter.test.js:478:// J26: adapter computeDeltaMetrics ≡ service.
tests/r3-0c-comparison-adapter.test.js:481:  const a = Adapter.computeDeltaMetrics(req);
tests/r3-0c-comparison-adapter.test.js:482:  const s = DeltaMetricsService.computeDeltaMetrics(req);
tests/r3-0c-comparison-adapter.test.js:483:  chk('J26 computeDeltaMetrics adapter ≡ service', a.eligible === true && JSON.stringify(a) === JSON.stringify(s));
tests/r3-0c-comparison-adapter.test.js:487:  const out = Adapter.computeDeltaMetrics(validDeltaReq());
tests/r3-0c-comparison-adapter.test.js:495:  const out = Adapter.computeDeltaMetrics(req);
tests/r3-0c-comparison-adapter.test.js:502:  const a = Adapter.computeDeltaMetrics(req);
tests/r3-0c-comparison-adapter.test.js:508:  const b = Adapter.computeDeltaMetrics(swap);
tests/r3-0c-comparison-adapter.test.js:515:  const out = Adapter.computeDeltaMetrics(req);
scripts/collect-evidence.js:172:  presetCount: preset ? preset.presetCount : -1,
scripts/collect-evidence.js:180:  r3cGovernanceCheckpoint: r3cGovernance ? (r3cGovernance.currentCheckpoint || null) : null,
scripts/collect-evidence.js:195:  r3dGovernanceCheckpoint: r3dGovernance ? (r3dGovernance.currentCheckpoint || null) : null,
scripts/collect-evidence.js:204:  r3eGovernanceCheckpoint: r3eGovernance ? (r3eGovernance.currentCheckpoint || null) : null,
scripts/collect-evidence.js:213:  r3fGovernanceCheckpoint: r3fGovernance ? (r3fGovernance.currentCheckpoint || null) : null,
governance/r3.0e/checkpoints/E0.json:39:    "note": "E0 bootstrap does not require R3.0D D5. Only non-bootstrap E checkpoints require R3.0D state.currentCheckpoint === 'D5_ACTIVATION'."
governance/r3.0e/state.json:4:  "currentCheckpoint": "E0_BOOTSTRAP",
governance/r3.0e/state.json:11:  "note": "R3.0E Integrated Delivery Governance state. E0 BOOTSTRAP fixes every production switch OFF. authorizedProductionPaths is intentionally empty; enabledCapabilities is intentionally empty. The four *Allowed flags are intentionally false. R3.0E introduces NO Feature Registry IDs at E0 — feature IDs (experiment_loop / case_timeline) are reserved for E5_ACTIVATION and are deliberately absent from renderer/js/feature-registry.js. Mutating any field above the E0 baseline requires a separately-authorized Integrated Delivery Train checkpoint AND requires R3.0D state.currentCheckpoint === 'D5_ACTIVATION' per cross-phase rule. Per SKYLINE D12/E1 ruling: this phase MUST NOT extend the frozen R3.0B case-record schema."
scripts/check-preset-integrity.js:46:    presetCount: ids.length,
scripts/check-preset-integrity.js:59:catch (e) { result = { check: 'preset-integrity', fatalError: String((e && e.stack) || e), presetCount: -1, ok: false }; exitCode = 2; }
scripts/check-preset-integrity.js:62:console.log('PRESET ' + JSON.stringify({ presetCount: result.presetCount, apiCount: result.apiCount, idsUnique: result.idsUnique, ok: result.ok }));
scripts/check-r3-0c-no-consumer.js:14: *      state.currentCheckpoint is at or beyond schema.runtimeConsumerCheckpoint (= C1).
scripts/check-r3-0c-no-consumer.js:41:// SCAN_BASE defaults to the real repo. R3_0C_NO_CONSUMER_BASE_OVERRIDE is for test fixtures ONLY —
scripts/check-r3-0c-no-consumer.js:43:const SCAN_BASE = process.env.R3_0C_NO_CONSUMER_BASE_OVERRIDE ? path.resolve(process.env.R3_0C_NO_CONSUMER_BASE_OVERRIDE) : REPO;
scripts/check-r3-0c-no-consumer.js:47:const FIXTURE_FEATURES_JSON = process.env.R3_0C_NO_CONSUMER_FIXTURE_FEATURES_JSON || '';
scripts/check-r3-0c-no-consumer.js:51:const FIXTURE_STATE_JSON = process.env.R3_0C_NO_CONSUMER_FIXTURE_STATE_JSON || '';
scripts/check-r3-0c-no-consumer.js:52:const FIXTURE_SCHEMA_JSON = process.env.R3_0C_NO_CONSUMER_FIXTURE_SCHEMA_JSON || '';
scripts/check-r3-0c-no-consumer.js:55:const R3_0C_FEATURE_NAME_RE = /(reference[-_]?lap|corner[-_]?delta|case[-_]?comparison)/i;
scripts/check-r3-0c-no-consumer.js:114:    // currentCheckpoint at-or-beyond runtimeConsumerCheckpoint (already enforced by the governance
scripts/check-r3-0c-no-consumer.js:120:      violations.push({ code: 'PROD_REQUIRES_R3_0C_CONTRACTS', file: path.relative(REPO, file), specifier: spec });
scripts/check-r3-0c-no-consumer.js:122:      violations.push({ code: 'PROD_REQUIRES_R3_0C_CONTRACTS', file: path.relative(REPO, file), specifier: spec, target: relativeTarget });
scripts/check-r3-0c-no-consumer.js:138:    else if (R3_0C_FEATURE_NAME_RE.test(s)) violations.push({ code: 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE', src: s });
scripts/check-r3-0c-no-consumer.js:209:  //   - state.currentCheckpoint is below schema.runtimeConsumerCheckpoint
scripts/check-r3-0c-no-consumer.js:216:  const curIdx = order.indexOf(state.currentCheckpoint);
scripts/check-r3-0c-no-consumer.js:264:  const violationConsumerCodes = ['PROD_REQUIRES_R3_0C_CONTRACTS', 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS', 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE'];
scripts/check-r3-0c-no-consumer.js:271:    currentCheckpoint: state && state.currentCheckpoint,
scripts/check-r3-0c-no-consumer.js:294:    currentCheckpoint: null,
scripts/check-r3-0c-no-consumer.js:312:  checkpoint: result.currentCheckpoint,
scripts/check-r3-phase-governance.js:88:    return finish({ ok: false, violations: [{ code: 'PHASE_PROGRAM_INVALID', message: 'R3_PHASE_PROGRAM must be one of R3.0D / R3.0E / R3.0F; got ' + JSON.stringify(PHASE_PROGRAM) }], currentCheckpoint: null });
scripts/check-r3-phase-governance.js:105:    return finish({ ok: false, violations, currentCheckpoint: null });
scripts/check-r3-phase-governance.js:158:  const currentCheckpoint = state.currentCheckpoint;
scripts/check-r3-phase-governance.js:159:  if (!schema.checkpoints.includes(currentCheckpoint)) fail('STATE_CURRENT_CHECKPOINT_UNKNOWN', 'currentCheckpoint=' + currentCheckpoint);
scripts/check-r3-phase-governance.js:170:  const curIdx = checkpointIndex(schema.checkpointOrder, currentCheckpoint);
scripts/check-r3-phase-governance.js:176:    if (curIdx < floorIdx) fail('CAPABILITY_ENABLED_BELOW_FLOOR', cap + ' floor=' + floor + ' current=' + currentCheckpoint, { capability: cap });
scripts/check-r3-phase-governance.js:180:  const authPathsRaw = Array.isArray(state.authorizedProductionPaths) ? state.authorizedProductionPaths : [];
scripts/check-r3-phase-governance.js:185:  for (const entry of authPathsRaw) {
scripts/check-r3-phase-governance.js:198:    if (checkpointIndex(schema.checkpointOrder, floor) > curIdx) fail('AUTH_PATH_CHECKPOINT_BELOW_FLOOR', p + ' -> ' + cap + ' floor=' + floor + ' current=' + currentCheckpoint, { path: p, capability: cap });
scripts/check-r3-phase-governance.js:221:      if (curIdx < fIdx) fail('FLAG_ENABLED_BELOW_FLOOR', k + ' floor=' + floors[k] + ' current=' + currentCheckpoint, { flag: k });
scripts/check-r3-phase-governance.js:226:  if (currentCheckpoint === schema.bootstrapCheckpoint) {
scripts/check-r3-phase-governance.js:227:    if (authPathsRaw.length !== 0) fail('BOOTSTRAP_AUTH_PATHS_NONEMPTY', schema.bootstrapCheckpoint + ' must have zero authorizedProductionPaths');
scripts/check-r3-phase-governance.js:264:    currentCheckpoint,
scripts/check-r3-phase-governance.js:265:    authorizedProductionPaths: authPathsRaw.map(e => (e && e.path) || null).filter(Boolean),
scripts/check-r3-phase-governance.js:266:    authorizedProductionPathCount: authPathsRaw.length,
scripts/check-r3-phase-governance.js:283:    currentCheckpoint: null,
scripts/check-r3-phase-governance.js:299:  currentCheckpoint: result.currentCheckpoint,
scripts/check-r3-phase-governance.js:300:  authPaths: result.authorizedProductionPathCount,
scripts/check-r3-phase-governance.js:301:  enabledCaps: result.enabledCapabilityCount,
scripts/check-r3-0c-governance.js:14: *   currentCheckpoint = C0_BOOTSTRAP
scripts/check-r3-0c-governance.js:29:// Default scans the real governance dir. R3_0C_GOV_DIR_OVERRIDE is for test fixtures ONLY — it changes
scripts/check-r3-0c-governance.js:31:const GOV_DIR = process.env.R3_0C_GOV_DIR_OVERRIDE ? path.resolve(process.env.R3_0C_GOV_DIR_OVERRIDE) : path.join(REPO, 'governance', 'r3.0c');
scripts/check-r3-0c-governance.js:79:    return finish({ ok: false, violations, currentCheckpoint: null });
scripts/check-r3-0c-governance.js:128:  const currentCheckpoint = state.currentCheckpoint;
scripts/check-r3-0c-governance.js:129:  if (!schema.checkpoints.includes(currentCheckpoint)) fail('STATE_CURRENT_CHECKPOINT_UNKNOWN', 'currentCheckpoint=' + currentCheckpoint);
scripts/check-r3-0c-governance.js:140:  const curIdx = checkpointIndex(schema.checkpointOrder, currentCheckpoint);
scripts/check-r3-0c-governance.js:146:    if (curIdx < floorIdx) fail('CAPABILITY_ENABLED_BELOW_FLOOR', cap + ' floor=' + floor + ' current=' + currentCheckpoint, { capability: cap });
scripts/check-r3-0c-governance.js:150:  const authPathsRaw = Array.isArray(state.authorizedProductionPaths) ? state.authorizedProductionPaths : [];
scripts/check-r3-0c-governance.js:156:  for (const entry of authPathsRaw) {
scripts/check-r3-0c-governance.js:169:    if (checkpointIndex(schema.checkpointOrder, floor) > curIdx) fail('AUTH_PATH_CHECKPOINT_BELOW_FLOOR', p + ' -> ' + cap + ' floor=' + floor + ' current=' + currentCheckpoint, { path: p, capability: cap });
scripts/check-r3-0c-governance.js:194:      if (curIdx < fIdx) fail('FLAG_ENABLED_BELOW_FLOOR', k + ' floor=' + floors[k] + ' current=' + currentCheckpoint, { flag: k });
scripts/check-r3-0c-governance.js:199:  if (currentCheckpoint === 'C0_BOOTSTRAP') {
scripts/check-r3-0c-governance.js:200:    if (authPathsRaw.length !== 0) fail('C0_AUTH_PATHS_NONEMPTY', 'C0 must have zero authorizedProductionPaths');
scripts/check-r3-0c-governance.js:222:    currentCheckpoint,
scripts/check-r3-0c-governance.js:223:    authorizedProductionPaths: authPathsRaw.map(e => (e && e.path) || null).filter(Boolean),
scripts/check-r3-0c-governance.js:224:    authorizedProductionPathCount: authPathsRaw.length,
scripts/check-r3-0c-governance.js:244:    currentCheckpoint: null,
scripts/check-r3-0c-governance.js:257:  currentCheckpoint: result.currentCheckpoint,
scripts/check-r3-0c-governance.js:258:  authPaths: result.authorizedProductionPathCount,
scripts/check-r3-0c-governance.js:259:  enabledCaps: result.enabledCapabilityCount,
governance/r3.0c/schema.json:56:    "phase_boundary_contract",
governance/r3.0c/schema.json:63:    "phase_boundary_contract",
governance/r3.0c/schema.json:94:    "phase_boundary_contract": "C5R_CP1_RETROFIT",
tests/r3-0-phase-governance.test.js:80:  return { schemaVersion: 1, program: phase, currentCheckpoint: BOOTSTRAP[phase], authorizedProductionPaths: [], enabledCapabilities: [], runtimeConsumersAllowed: false, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: false };
tests/r3-0-phase-governance.test.js:98:  chk(phase + ' PASS currentCheckpoint=' + BOOTSTRAP[phase], r.artifact && r.artifact.currentCheckpoint === BOOTSTRAP[phase]);
tests/r3-0-phase-governance.test.js:99:  chk(phase + ' PASS authPaths=0', r.artifact && r.artifact.authorizedProductionPathCount === 0);
tests/r3-0-phase-governance.test.js:100:  chk(phase + ' PASS enabledCaps=0', r.artifact && r.artifact.enabledCapabilityCount === 0);
tests/r3-0-phase-governance.test.js:118:  const s = baseState(phase); s.currentCheckpoint = 'BOGUS_CHECKPOINT';
tests/r3-0-phase-governance.test.js:154:  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
tests/r3-0-phase-governance.test.js:164:  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
tests/r3-0-phase-governance.test.js:174:  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
tests/r3-0-phase-governance.test.js:184:  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
tests/r3-0-phase-governance.test.js:210:  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
tests/r3-0-phase-governance.test.js:231:    const s = baseState(phase); s.currentCheckpoint = advCheckpoint;
governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
scripts/check-r3-0-train.js:11: *   3. phase consistency: train.phaseStates[X].currentCheckpoint must equal governance/r3.0X/state.json.currentCheckpoint.
scripts/check-r3-0-train.js:12: *   4. cross-phase advancement: D non-bootstrap requires R3.0C state.currentCheckpoint === C8_ACTIVATION
scripts/check-r3-0-train.js:152:    if (trainView.currentCheckpoint !== phaseState.currentCheckpoint) fail('TRAIN_PHASE_CHECKPOINT_MISMATCH', phase + ' train=' + trainView.currentCheckpoint + ' state=' + phaseState.currentCheckpoint, { phase });
scripts/check-r3-0-train.js:171:      currentCheckpoint: phaseState.currentCheckpoint,
scripts/check-r3-0-train.js:189:    if (phaseState.currentCheckpoint === phaseSchema.bootstrapCheckpoint) continue; // bootstrap allowed
scripts/check-r3-0-train.js:194:    if (upstreamState.currentCheckpoint !== upstreamCheckpoint) {
scripts/check-r3-0-train.js:195:      fail('CROSS_PHASE_PREMATURE_ADVANCE', downstream + ' current=' + phaseState.currentCheckpoint + ' but ' + upstream + ' is ' + upstreamState.currentCheckpoint + ' (required ' + upstreamCheckpoint + ')', { downstream, upstream, requiredUpstreamCheckpoint: upstreamCheckpoint, actualUpstreamCheckpoint: upstreamState.currentCheckpoint });
governance/r3.0d/checkpoint-manifest.schema.json:5:  "note": "Format for governance/r3.0d/checkpoints/<CHECKPOINT_ID>.json. D0 establishes the schema and writes its own manifest as 'pending'; final PASS is expressed by the trusted-verification artifact bound to artifactBoundSha. The checkpoint manifest never self-asserts PASS — only the CI artifact does. Cross-phase advancement of any non-bootstrap D checkpoint additionally requires R3.0C state.currentCheckpoint === 'C8_ACTIVATION' per scripts/check-r3-0-train.js.",
governance/r3.0c/state.json:4:  "currentCheckpoint": "C7_UI",
governance/r3.0c/state.json:22:  "declaredButDisabledGovernanceCapabilities": ["phase_boundary_contract"],
governance/r3.0c/state.json:27:  "note": "R3.0C C7_UI state. Adds the Comparison Workspace UI: three new authorized renderer/js paths (r3-0c-comparison-orchestrator.js, r3-0c-comparison-viewmodel.js, i18n-comparisons.js) all bound to the new ui_present capability. The orchestrator owns request-token issuance + framing emission (composes C5 delta-metrics + C6 export); the viewmodel is the pure state machine consuming orchestrator output, implementing the 7 transition triggers + stale-token drop per contracts/r3.0c/viewmodel-state-transition-contract.js. The framing-source contract (contracts/r3.0c/framing-i18n-key-registry.js) is enabled: every framing entry the orchestrator emits is validated against a closed allowlist of i18nKeys before reaching the viewmodel; the viewmodel re-validates as defense in depth. uiAllowed flips true: the Comparison Workspace pane replaces the deferred placeholder in renderer/index.html. featureRegistryActivationAllowed remains false: the three R3.0C feature IDs (case_comparison, reference_lap, corner_delta) remain availability='deferred' with NO rendererAdapter until C8 authorizes activation — C7 ships the UI surface without activating the routes. phase_boundary_contract remains the only declared-but-disabled governance capability: phase metrics (entry/mid/exit_delta) are reported metricAvailability:false in both viewmodel and export until a future checkpoint authorizes a deterministic phase-boundary contract."
governance/r3.0c/cp1-retrofit-matrix.md:34:| F6 | Major | **OPEN-HIGH (governance lock)** | `contracts/r3.0c/delta-metrics-contract.js` (the four corner-scope metrics — `sector_delta / entry_delta / mid_delta / exit_delta` — gated by `phaseBoundaryContractAuthorised` capability; without it → fail-closed `PHASE_BOUNDARY_CONTRACT_UNAUTHORISED`); `governance/r3.0c/capabilities.json` (add `phase_boundary_contract`: `enabled: false` until a real boundary contract ships) | `tests/r3-0c-delta-metrics.test.js` (phase-scope metrics blocked when capability `false`; allowed when `true` AND a phase-boundary payload is provided) | C5R | conditional: corner-scope metrics not blocked entirely; sector_delta still permissive once a corner pair exists, but entry/mid/exit specifically require the boundary contract |
governance/r3.0c/codex-checkpoint-evidence/C6/round-1-eff0d41.md:58:H. Adapter delegation [Adapter.buildComparisonExport ≡ service; exposes() includes
governance/r3.0c/codex-checkpoint-evidence/C6/round-1-eff0d41.md:91:  "renderer/js/r3-0c-comparison-export.js:100,121-149,436-479 — Proxy inputs do not fail closed: a transparent Proxy used as framing.params is accepted and exported, while a getPrototypeOf trap throws out of buildComparisonExport. Minimum fix: reject non-cloneable inputs through a guarded structured-clone boundary before traversal, returning INTERNAL_CONTRACT_VIOLATION on failure.",
governance/r3.0d/checkpoints/D0.json:39:    "note": "D0 bootstrap does not require R3.0C C8. Only non-bootstrap D checkpoints require R3.0C state.currentCheckpoint === 'C8_ACTIVATION'."
tests/r3-0c-governance-integrity.test.js:6: * FAIL cases use temp-dir fixtures (R3_0C_INTEGRITY_REPO_OVERRIDE) so the test never mutates real
tests/r3-0c-governance-integrity.test.js:41:  if (repoOverride) env.R3_0C_INTEGRITY_REPO_OVERRIDE = repoOverride;
governance/r3.0c/checkpoints/C6.json:107:    "phaseGatePreservation": "PHASE_SCOPE_METRICS (entry/mid/exit_delta) are reported metricAvailability:false in the export while phase_boundary_contract.enabled is false (F6 governance gate carried from CP1R)."
governance/r3.0c/checkpoints/C6.json:123:  "note": "C6 Comparison Export. Adds ONE production capability (comparison_export_present) backed by renderer/js/r3-0c-comparison-export.js. The service is a closed-allowlist gateway: it validates input authority, rebuilds a plain payload from explicit allowlist fields (never spreads the caller's result), invokes contracts/r3.0c/comparison-export-contract.js for envelope construction + bounds, then JSON.serialize → parse → re-validate for deterministic round-trip equivalence. Stale-result guard: result.identity must match association. F6 governance gate preserved: phase metrics report metricAvailability:false until phase_boundary_contract.enabled becomes true. Blocked-result export contains only status / reasonCodes / limitations / identity / nextValidationAction — no fabricated metrics, no raw telemetry, no per-sample arrays, no exotic objects. No UI activation. No feature-registry change. C6 adversarial Codex review + Train target-context CI will fill the null SHA / verdict / artifact fields per the SHA-separation discipline before integration."
governance/r3.0c/codex-checkpoint-evidence/C6/round-4-48be2c0-PASS.md:59:    environment with R3_0C_Contracts loaded but R3_0C_DeltaMetrics absent,
governance/r3.0c/codex-checkpoint-evidence/C6/round-4-48be2c0-PASS.md:63:    dependency stubbed to omit isAuthenticResult; every buildComparisonExport
governance/r3.0c/checkpoints/C5R.json:34:  "newlyDeclaredCapabilitiesDisabled": ["phase_boundary_contract", "viewmodel_state_transition_contract", "framing_source_structured_contract"],
governance/r3.0c/checkpoints/C5R.json:120:  "note": "C5R is a retrofit checkpoint. It does NOT advance any productionCapability beyond C5; enabledCapabilitiesBefore === enabledCapabilitiesAfter. It brings the C1-C5 surface into honesty alignment with the formal Codex C-A round-2 BLOCK adjudication (F1-F12 closure detailed above). The retrofit modifies one already-authorised production file (renderer/js/r3-0c-corner-segmentation.js — bounded O(n^2) overlap-scan extension, no algorithm replacement) and four contracts; declares three new governance-capabilities (phase_boundary_contract / viewmodel_state_transition_contract / framing_source_structured_contract — all DISABLED) that gate the deferred C7_UI surface; persists Codex C-A evidence in tiered form under governance/r3.0c/codex-ca-gate-evidence/; and explicitly separates reviewedCandidateSha / manifestCommitSha / integrationSha so future audits cannot conflate them. The trusted-verification artifact bound to the eventual Train integrationSha is the PASS authority for THAT integration; reviewedCandidateSha is the PASS authority only for the pre-merge retrofit candidate. headSha / workflowRunId / artifactId / artifactBoundSha / createdAt are intentionally null in-commit, mirroring the existing C0-C5 manifest convention. status='pending' per the same convention; PASS lives in the trusted-verification artifact, not in this file."
governance/r3.0d/state.json:4:  "currentCheckpoint": "D0_BOOTSTRAP",
governance/r3.0d/state.json:11:  "note": "R3.0D Integrated Delivery Governance state. D0 BOOTSTRAP fixes every production switch OFF. authorizedProductionPaths is intentionally empty; enabledCapabilities is intentionally empty. The four *Allowed flags are intentionally false. R3.0D introduces NO Feature Registry IDs at D0 — feature IDs (decision_engine / hypothesis / engineer_brief) are reserved for D5_ACTIVATION and are deliberately absent from renderer/js/feature-registry.js. Mutating any field above the D0 baseline requires a separately-authorized Integrated Delivery Train checkpoint AND requires R3.0C state.currentCheckpoint === 'C8_ACTIVATION' per cross-phase rule."
governance/r3.0c/checkpoints/C7.json:71:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/checkpoints/C7.json:96:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0f/checkpoint-manifest.schema.json:5:  "note": "Format for governance/r3.0f/checkpoints/<CHECKPOINT_ID>.json. F0 establishes the schema and writes its own manifest as 'pending'; final PASS is expressed by the trusted-verification artifact bound to artifactBoundSha. The checkpoint manifest never self-asserts PASS — only the CI artifact does. Cross-phase advancement of any non-bootstrap F checkpoint additionally requires R3.0E state.currentCheckpoint === 'E5_ACTIVATION' per scripts/check-r3-0-train.js. F6_RELEASE additionally records the version bump, the post-merge tag, and the GitHub Release id.",
governance/r3.0c/codex-checkpoint-evidence/C6/round-2-2b6e568.md:34:    Module-private WeakSet records every result computeDeltaMetrics produces
governance/r3.0c/codex-checkpoint-evidence/C6/round-2-2b6e568.md:59:  "renderer/js/r3-0c-delta-metrics.js:124-181 — WeakSet authenticates only the top-level result, while metric records and perCorner arrays remain mutable. After computeDeltaMetrics(), setting result.metrics.delta_cumulative.value=777777 and result.metrics.sector_delta.perCorner[0].value=888888 exports both forged values successfully. Minimum fix: recursively freeze the complete result graph before registering it as authentic.",
governance/r3.0c/codex-checkpoint-evidence/C6/round-2-2b6e568.md:60:  "renderer/js/r3-0c-comparison-export.js:226-255,473-493 — safe traversal is incomplete. A plain-target Proxy whose generationToken getter throws passes _isPlain and crashes buildComparisonExport instead of returning blocked. Minimum fix: use guarded property reads throughout all caller-controlled traversal and retain a catch-all fail-closed boundary around the public builder.",
governance/r3.0c/codex-checkpoint-evidence/C6/round-3-a87c7d5.md:39:    (2) buildComparisonExport is split into a public wrapper + inner; the
governance/r3.0c/codex-checkpoint-evidence/C6/round-3-a87c7d5.md:57:  "renderer/js/r3-0c-comparison-export.js:235-241 — the authenticity check is skipped when DeltaMetricsService or isAuthenticResult is unavailable, contradicting the documented fail-closed fallback. In a browser UMD context with R3_0C_Contracts loaded but R3_0C_DeltaMetrics absent, a forged eligible result passes the authority gate and reaches credibility validation. Minimum fix: return INTERNAL_CONTRACT_VIOLATION unless the service and predicate exist, then require isAuthenticResult(result) === true."
tests/r3-0c-delta-metrics.test.js:29:// (capabilities.json phase_boundary_contract is DISABLED at C5R; the fixture contractRef is
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
governance/r3.0f/checkpoints/F0.json:40:    "note": "F0 bootstrap does not require R3.0E E5. Only non-bootstrap F checkpoints require R3.0E state.currentCheckpoint === 'E5_ACTIVATION'."
tests/r3-0-train.test.js:84:  ds.currentCheckpoint = 'D2_HYPOTHESIS_ENGINE'; ds.authorizedProductionPaths = []; ds.enabledCapabilities = [];
tests/r3-0-train.test.js:87:  ts.phaseStates['R3.0D'].currentCheckpoint = 'D2_HYPOTHESIS_ENGINE';
tests/r3-0-train.test.js:98:  es.currentCheckpoint = 'E2_EXPERIMENT_STORE';
tests/r3-0-train.test.js:101:  ts.phaseStates['R3.0E'].currentCheckpoint = 'E2_EXPERIMENT_STORE';
tests/r3-0-train.test.js:111:  fs2.currentCheckpoint = 'F1_MIGRATION_ENGINE';
tests/r3-0-train.test.js:114:  ts.phaseStates['R3.0F'].currentCheckpoint = 'F1_MIGRATION_ENGINE';
tests/r3-0-train.test.js:348:  ts.phaseStates['R3.0D'].currentCheckpoint = 'D5_ACTIVATION'; // disagrees with state.json D0_BOOTSTRAP
tests/r3.0c-contract-foundation.test.js:145:(() => { const env = EX.buildComparisonExportEnvelope(); chk('comparison envelope HAS schemaIdentity (case bundle does not)', env.schemaIdentity === 'racing-analyzer/comparison-export'); const exp = CaseExport.exportAnalysisCase({}); chk('case bundle has no schemaIdentity field', exp.bundle && exp.bundle.schemaIdentity === undefined); })();
tests/r3.0c-contract-foundation.test.js:259:  const r = EX.buildComparisonExportEnvelope({ delta: v });
tests/r3.0c-contract-foundation.test.js:264:  const r = EX.buildComparisonExportEnvelope({ delta: -0.5, count: 0, big: 1e6 });
tests/r3.0c-contract-foundation.test.js:271:  const r = EX.buildComparisonExportEnvelope({ notes: oversized });
tests/r3.0c-contract-foundation.test.js:276:  const r = EX.buildComparisonExportEnvelope({ rawSamplesBase64: 'A'.repeat(5000) });
tests/r3.0c-contract-foundation.test.js:285:  const r = EX.buildComparisonExportEnvelope(payload);
tests/r3.0c-contract-foundation.test.js:290:  // F1 also blocks unknown keys at build time? buildComparisonExportEnvelope wraps a plain payload,
tests/r3.0c-contract-foundation.test.js:293:  const env = EX.buildComparisonExportEnvelope({});
tests/r3.0c-contract-foundation.test.js:298:  const r = EX.buildComparisonExportEnvelope({ when: new Date() });
tests/r3.0c-contract-foundation.test.js:481:(() => { const env = EX.buildComparisonExportEnvelope(); chk('envelope payload null in CP1', env.payload === null && env.generatedAt === null); chk('envelope validates', EX.validateComparisonExportEnvelope(env).valid === true); })();
tests/r3.0c-contract-foundation.test.js:482:(() => { const big = {}; const arr = []; for (let i = 0; i < 1000; i++) arr.push(i); big.samples = arr; chk('oversized array payload → blocked', EX.buildComparisonExportEnvelope(big).eligible === false); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:52:   • Find: `registerAuthenticCaseRecord` exposed as PUBLIC API on the orchestrator factory return value.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:53:   • Find: viewmodel `setAssociation` calls `orch.registerAuthenticCaseRecord(_state.caseRecord)` automatically with a caller-provided object.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:55:   • Counterexample to construct: a literal-built caseRecord with self-consistent caseId / sessionId / associations passed via setAssociation reaches requestComparison and `isAuthenticCaseRecord(input.caseRecord)` returns true.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:60:   • Find: `typeof R3_0C_ComparisonOrchestrator !== 'undefined'` guard in `app().init()`. If the guard CAN fail because the scripts aren't loaded, the pane silently stays at placeholder.idle — this is the J1 BLOCKER unclosed.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:75:   • Required: on init failure (or on scripts not loaded), set a structured unavailable state with a registered reason code (e.g. UI_INITIALIZATION_FAILED), fixed i18n key, export disabled, no fake "idle" appearance. DO NOT leak stack / private paths.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:89:   • `phase_boundary_contract.enabled` must remain false at C7.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:95:   • Verify train.json advances currentCheckpoint to C7_UI but does NOT mark C7 complete.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:96:   • Verify `phase_boundary_contract.enabled` is still false in governance/r3.0c/capabilities.json.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:99:   • A forged-caseRecord test that passes by registering the record first does NOT prove D1 closure. The real D1 test must drive setAssociation with a forged caseRecord and verify it is rejected — without test helpers reaching into orchestrator.registerAuthenticCaseRecord.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:177:/bin/bash -lc "rg -n \"registerAuthentic|setAssociation|_safeGet|paramsRaw|latestToken|_clearAndPlaceholder|R3_0C_Comparison|UI_INITIALIZATION|catch \\(e\\)|phase|placeholder\\.idle\" renderer/index.html renderer/js/r3-0c-comparison-{orchestrator,viewmodel}.js contracts/r3.0c/framing-i18n-key-registry.js tests/r3-0c-comparison-workspace.test.js governance/r3.0c/{checkpoints/C7.json,capabilities.json} governance/r3.0/train.json && git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a | rg \"physics|dynamics|preset|schema|r3.0b\" || true" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:181:governance/r3.0/train.json:61:  "note": "R3.0 Integrated Delivery Train state. IN_PROGRESS means SKYLINE has authorized the feature train; feat/r3.0-integrated-delivery has been opened from main at the G1 head SHA. No production code is added by this commit and no capability is enabled — opening the branch is the only state change. Per-phase currentCheckpoint advances under separately-authorized Train checkpoints (C1..C8, D1..D5, E1..E5, F1..F5). Final merge happens once at R3.0F F6_RELEASE; v2.0.0 tag + GitHub Release are created post-merge after the new main trusted-verification PASS. trainStatus then becomes MERGED."
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:189:tests/r3-0c-comparison-workspace.test.js:124:function regCase(orch, cr) { orch.registerAuthenticCaseRecord(cr); return cr; }
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:190:tests/r3-0c-comparison-workspace.test.js:148:  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:191:tests/r3-0c-comparison-workspace.test.js:160:  orch.registerAuthenticCaseRecord(caseRec);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:193:tests/r3-0c-comparison-workspace.test.js:173:  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:196:tests/r3-0c-comparison-workspace.test.js:184:  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:197:tests/r3-0c-comparison-workspace.test.js:191:  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:209:renderer/js/r3-0c-comparison-viewmodel.js:14: * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:218:renderer/js/r3-0c-comparison-viewmodel.js:126:        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:232:renderer/js/r3-0c-comparison-viewmodel.js:225:        if (typeof orch.registerAuthenticCaseRecord === 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:233:renderer/js/r3-0c-comparison-viewmodel.js:226:          try { orch.registerAuthenticCaseRecord(_state.caseRecord); } catch (e) { /* no-op */ }
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:240:renderer/js/r3-0c-comparison-viewmodel.js:275:  if (root) root.R3_0C_ComparisonViewModel = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:241:governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:244:contracts/r3.0c/framing-i18n-key-registry.js:25:  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:258:renderer/js/r3-0c-comparison-orchestrator.js:19: * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:260:renderer/js/r3-0c-comparison-orchestrator.js:31: * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:264:renderer/js/r3-0c-comparison-orchestrator.js:46:  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:267:renderer/js/r3-0c-comparison-orchestrator.js:93:    // task); for unit tests + manual integration, the explicit registerAuthenticCaseRecord
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:268:renderer/js/r3-0c-comparison-orchestrator.js:97:    function registerAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:274:renderer/js/r3-0c-comparison-orchestrator.js:196:        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not registered via registerAuthenticCaseRecord — caller-controlled case authority refused', null, token);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:275:renderer/js/r3-0c-comparison-orchestrator.js:211:      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:286:renderer/js/r3-0c-comparison-orchestrator.js:324:      registerAuthenticCaseRecord: registerAuthenticCaseRecord,
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:287:renderer/js/r3-0c-comparison-orchestrator.js:338:  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:289:governance/r3.0c/checkpoints/C7.json:69:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:291:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:292:renderer/index.html:256:  <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:303:renderer/index.html:3918:      if (typeof R3_0C_ComparisonOrchestrator !== 'undefined' && typeof R3_0C_ComparisonViewModel !== 'undefined') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:305:renderer/index.html:3920:        const _orch = R3_0C_ComparisonOrchestrator.createOrchestrator({ capabilities: caps });
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:306:renderer/index.html:3921:        this._r3cC7VM = R3_0C_ComparisonViewModel.createComparisonViewModel({ orchestrator: _orch, capabilities: caps });
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:316:/bin/bash -lc "nl -ba renderer/index.html | sed -n '3240,3310p;3895,3935p' && rg -n \"<script["'^>]+src=" renderer/index.html | tail -40 && nl -ba renderer/js/r3-0c-comparison-viewmodel.js | sed -n '"'45,180p;205,270p' && nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '80,120p;185,205p;315,330p' && nl -ba contracts/r3.0c/framing-i18n-key-registry.js | sed -n '70,150p' && jq '{currentCheckpoint,phaseStates}' governance/r3.0/train.json; jq '{enabledCapabilitiesAfter,status}' governance/r3.0c/checkpoints/C7.json; jq '.capabilities.phase_boundary_contract // .phase_boundary_contract' governance/r3.0c/capabilities.json" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:412:  3918	      if (typeof R3_0C_ComparisonOrchestrator !== 'undefined' && typeof R3_0C_ComparisonViewModel !== 'undefined') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:414:  3920	        const _orch = R3_0C_ComparisonOrchestrator.createOrchestrator({ capabilities: caps });
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:415:  3921	        this._r3cC7VM = R3_0C_ComparisonViewModel.createComparisonViewModel({ orchestrator: _orch, capabilities: caps });
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:551:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:580:   155	      var response = orch.requestComparison({
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:626:   225	        if (typeof orch.registerAuthenticCaseRecord === 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:627:   226	          try { orch.registerAuthenticCaseRecord(_state.caseRecord); } catch (e) { /* no-op */ }
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:674:    82	    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:675:    83	    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:685:    93	    // task); for unit tests + manual integration, the explicit registerAuthenticCaseRecord
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:687:    95	    // this entry point is refused at requestComparison time.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:689:    97	    function registerAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:699:   107	    function isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:723:   195	      if (!isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:724:   196	        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not registered via registerAuthenticCaseRecord — caller-controlled case authority refused', null, token);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:743:   324	      registerAuthenticCaseRecord: registerAuthenticCaseRecord,
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:744:   325	      isAuthenticCaseRecord: isAuthenticCaseRecord,
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:745:   326	      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:746:   327	      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:781:   101	   * validateFramingEntry(entry) — structural + registry gate.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:790:   110	  function validateFramingEntry(entry) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:832:  "currentCheckpoint": null,
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:836:      "currentCheckpoint": "C7_UI",
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:843:      "currentCheckpoint": "D0_BOOTSTRAP",
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:850:      "currentCheckpoint": "E0_BOOTSTRAP",
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:857:      "currentCheckpoint": "F0_BOOTSTRAP",
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:893:console.log('getter attack', F.validateFramingEntry(e));
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1559:/bin/bash -lc "node -e \"const F=require('./contracts/r3.0c/framing-i18n-key-registry.js'); const C=require('./contracts/r3.0c/reason-codes.js').REASON_CODES; const e={reasonCode:C.CANNOT_DISTINGUISH,i18nKey:'r3_0c.framing.cannot_distinguish'}; Object.defineProperty(e,'params',{enumerable:true,configurable:true,get(){throw new Error('boom')}}); console.log(JSON.stringify(F.validateFramingEntry(e)))\" && node tests/r3-0c-comparison-workspace.test.js && git diff --name-status 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1626:   117	// helper: build an orchestrator AND register the caseRecord so requestComparison can pass the
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1633:   124	function regCase(orch, cr) { orch.registerAuthenticCaseRecord(cr); return cr; }
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1657:   148	  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1658:   149	  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1669:   160	  orch.registerAuthenticCaseRecord(caseRec);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1670:   161	  const r = orch.requestComparison({ caseRecord: caseRec, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1754:    69	    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1779:    94	  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1800:    C7-B1 (BLOCKER) — Proxy / accessor traps in framing entries escaped validateFramingEntry.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1801:      Fix: wrap the entire validateFramingEntry body in try/catch; use _safeOwnKeys (Reflect.ownKeys
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1805:      Fix: orchestrator now exposes registerAuthenticCaseRecord(caseRecord) + isAuthenticCaseRecord;
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1806:      requestComparison refuses any caseRecord not registered via that entrypoint. The viewmodel
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1811:      Fix: currentPhaseCheckpoint + phaseStates.R3.0C.currentCheckpoint advance to C7_UI.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1865:6. `requestComparison()` then sees `isAuthenticCaseRecord(input.caseRecord) === true`.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1918:FIR.validateFramingEntry(entry);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1955:On either guard failure or caught exception, set a structured unavailable state using a registered `UI_INITIALIZATION_FAILED` reason and fixed i18n key. Keep export disabled and sanitize diagnostic details.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1992:6. `requestComparison()` then sees `isAuthenticCaseRecord(input.caseRecord) === true`.
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:2045:FIR.validateFramingEntry(entry);
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:2082:On either guard failure or caught exception, set a structured unavailable state using a registered `UI_INITIALIZATION_FAILED` reason and fixed i18n key. Keep export disabled and sanitize diagnostic details.
governance/r3.0f/state.json:4:  "currentCheckpoint": "F0_BOOTSTRAP",
governance/r3.0f/state.json:11:  "note": "R3.0F Integrated Delivery Governance state. F0 BOOTSTRAP fixes every production switch OFF. authorizedProductionPaths is intentionally empty; enabledCapabilities is intentionally empty. The four *Allowed flags are intentionally false. Mutating any field above the F0 baseline requires a separately-authorized Integrated Delivery Train checkpoint AND requires R3.0E state.currentCheckpoint === 'E5_ACTIVATION' per cross-phase rule. F6_RELEASE is the only checkpoint that may bump package.json version (1.4.0 → 2.0.0) and may authorize tag/release creation post-merge."
tests/r3-0c-comparison-export.test.js:30:  return DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:50:  return DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:95:  const out = Service.buildComparisonExport(req());
tests/r3-0c-comparison-export.test.js:104:  // F6 governance: phase metrics MUST be reported unavailable while phase_boundary_contract is disabled.
tests/r3-0c-comparison-export.test.js:111:  const out1 = Service.buildComparisonExport(req());
tests/r3-0c-comparison-export.test.js:112:  const out2 = Service.buildComparisonExport(req());
tests/r3-0c-comparison-export.test.js:119:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:135:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:140:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:146:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:152:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:159:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:164:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:169:(() => { const r = req(); r.association = association({ trackId: '' }); chk('G1 missing trackId → MISSING_TRACK_IDENTITY', hasCode(Service.buildComparisonExport(r), CODES.MISSING_TRACK_IDENTITY)); })();
tests/r3-0c-comparison-export.test.js:170:(() => { const r = req(); r.association = association({ positionBasis: 'bogus' }); chk('G2 bogus positionBasis → MISSING_POSITION_BASIS', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_BASIS)); })();
tests/r3-0c-comparison-export.test.js:171:(() => { const r = req(); r.association = association({ positionDirection: 'sideways' }); chk('G3 bogus positionDirection → MISSING_POSITION_DIRECTION', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_DIRECTION)); })();
tests/r3-0c-comparison-export.test.js:174:(() => { const r = req(); r.credibilityMetadata = {}; chk('H1 empty credibility → INSUFFICIENT_CREDIBILITY_METADATA', hasCode(Service.buildComparisonExport(r), CODES.INSUFFICIENT_CREDIBILITY_METADATA)); })();
tests/r3-0c-comparison-export.test.js:175:(() => { const r = req(); r.credibilityMetadata = credibility({ provenance: 'synthetic' }); chk('H2 synthetic without SYNTHETIC_ONLY_LIMITATION → blocked', !Service.buildComparisonExport(r).eligible); })();
tests/r3-0c-comparison-export.test.js:178:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:190:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:196:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:203:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:210:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:217:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:224:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:234:  chk('J1 mutated result (oversized corners) → blocked', Service.buildComparisonExport(r).eligible === false);
tests/r3-0c-comparison-export.test.js:240:  chk('J2 mutated result (corner Infinity) → blocked', Service.buildComparisonExport(r).eligible === false);
tests/r3-0c-comparison-export.test.js:246:  chk('J3 mutated result (no cornerId) → blocked', Service.buildComparisonExport(r).eligible === false);
tests/r3-0c-comparison-export.test.js:253:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:261:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:268:  const out = Service.buildComparisonExport(r);
tests/r3-0c-comparison-export.test.js:276:chk('N1 adapter exposes buildComparisonExport function', typeof Adapter.buildComparisonExport === 'function');
tests/r3-0c-comparison-export.test.js:284:  const a = Adapter.buildComparisonExport(req());
tests/r3-0c-comparison-export.test.js:285:  const s = Service.buildComparisonExport(req());
tests/r3-0c-comparison-export.test.js:291:  const r = Service.buildComparisonExport(bad);
tests/r3-0c-comparison-export.test.js:299:  // computeDeltaMetrics → not authentic → export refused.
tests/r3-0c-comparison-export.test.js:320:  const out = Service.buildComparisonExport({
tests/r3-0c-comparison-export.test.js:334:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:349:  const out = Service.buildComparisonExport({
tests/r3-0c-comparison-export.test.js:366:  const out = Service.buildComparisonExport(trapProxy);
tests/r3-0c-comparison-export.test.js:372:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:381:  const out = Service.buildComparisonExport({
tests/r3-0c-comparison-export.test.js:397:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:406:    const out = Service.buildComparisonExport({
tests/r3-0c-comparison-export.test.js:421:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:430:    const out = Service.buildComparisonExport({
tests/r3-0c-comparison-export.test.js:446:  const real = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:471:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:491:  const out = Service.buildComparisonExport(trappy);
tests/r3-0c-comparison-export.test.js:497:  const realResult = DeltaMetricsService.computeDeltaMetrics({
tests/r3-0c-comparison-export.test.js:506:    const out = Service.buildComparisonExport({
tests/r3-0c-comparison-export.test.js:519:    const out = Service.buildComparisonExport({
tests/r3-0c-comparison-export.test.js:548:  fs.writeFileSync(stubPath, "module.exports = { SERVICE_VERSION: 1, CHECKPOINT_FLOOR: 'C5_DELTA_METRICS', SIGN_FORMULA: 'comparison_minus_reference', computeDeltaMetrics: function () { return null; } };\n");
tests/r3-0c-comparison-export.test.js:560:    const out = ShimmedService.buildComparisonExport({
tests/r3-0c-comparison-export.test.js:582:// FIR.validateFramingEntry (which is registry-strict + uses descriptor reads + emits a frozen
tests/r3-0c-comparison-export.test.js:591:  const out1 = Service.buildComparisonExport(r1);
tests/r3-0c-comparison-export.test.js:602:  const out2 = Service.buildComparisonExport(r2);
tests/r3-0c-comparison-export.test.js:619:  const out3 = Service.buildComparisonExport(r3);
tests/r3-0c-comparison-export.test.js:636:  try { const r4 = req(); r4.framing = { cannotConclude: [attack4], alternativeExplanations: [], nextValidationAction: null }; out4 = Service.buildComparisonExport(r4); }
tests/r3-0c-comparison-export.test.js:638:  chk('Z4 (C7-R4 closure) Proxy lying descriptor + throwing accessor → buildComparisonExport does NOT trigger accessor', threw4 === false && out4 !== undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:34:- D (R2-D): UI_INITIALIZATION_FAILED structural state distinct from idle.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:35:- R5-01: exportComparison wraps caller reads in try/catch + descriptor-safe reads.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:38:- renderer/js/r3-0c-comparison-orchestrator.js requestComparison body wrapped in outer try/catch returning _blockedResponse on any throw.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:39:- renderer/js/r3-0c-delta-metrics.js computeDeltaMetrics body wrapped in outer try/catch returning _blocked on any throw.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:43:1. Confirm requestComparison cannot throw on hostile input. Build a Proxy whose get-trap throws on any of: caseRecord, association, eligibilityInput, deltaMetricsRequest, framing, credibilityMetadata. Verify all hostile-get variants return status:blocked NOT throw.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:45:2. Confirm computeDeltaMetrics cannot throw on hostile input. Same probe against request.identity / request.requestedMetrics / request.pairing / etc.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:47:3. Confirm buildComparisonExport cannot throw on hostile input. (Already has outer try/catch from F-C6-A2 round 2 + Z1-Z4 close inner framing TOCTOU.)
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:49:4. Confirm exportComparison cannot throw on hostile input. (R5-01 closure.)
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:59:9. Confirm governance invariants: authPaths=14, enabledCaps=12, currentCheckpoint=C7_UI, three feature IDs deferred, phase_boundary_contract disabled, frozenDiff=0, R3.0B schema untouched, presetCount=501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:156:  FIR.validateFramingEntry and consumes vr.sanitized; no raw frame.* re-reads.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:167:     framing field after FIR.validateFramingEntry returned. Flag any unchecked re-read.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:171:   • The orchestrator's exportComparison delegates to C6 buildComparisonExport. Confirm the
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:181:     bundle evaluates cleanly and registers all R3_0C_* globals.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:182:   • D (init structured failure): UI_INITIALIZATION_FAILED reachable.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:187:   • enabledCaps=12, currentCheckpoint=C7_UI, feature_registry_active=false, three R3.0C
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:188:     feature IDs deferred, phase_boundary_contract disabled, frozenDiff=0,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:189:     R3.0B schema untouched, presetCount=501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:201:   • Is FIR.validateFramingEntry a Node-side hot path that the C6 service now invokes per
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:324:- contracts/r3.0c/framing-i18n-key-registry.js validateFramingEntry returns
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:339:   • Verify validateFramingEntry result.sanitized is deep-frozen and contains ONLY
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:375:     function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:377:+      // Codex C7-R5-01 cascade: the public requestComparison boundary is a sister-site of
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:378:+      // exportComparison. Caller-controlled `input` is read via plain property access for
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:386:+      } catch (e) { return Object.freeze({ status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), limitations: Object.freeze([]), framing: null, exportGate: false, detail: 'requestComparison token failed — fail-closed', generationToken: 0 }); }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:397:+        // a structured blocked outcome — no exception escapes requestComparison's public boundary.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:398:+        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'requestComparison threw — fail-closed', null, token);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:410:   function computeDeltaMetrics(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:426:+      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'computeDeltaMetrics threw — fail-closed');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:449: * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:461: * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:474:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:475:  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:476:  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:505:   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:506:   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:516:   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:526:    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:527:    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:530:    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:532:    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:585:        var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:593:          var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:604:     * requestComparison(input) — synchronous orchestrator entry point.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:617:    function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:618:      // Codex C7-R5-01 cascade: the public requestComparison boundary is a sister-site of
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:619:      // exportComparison. Caller-controlled `input` is read via plain property access for
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:627:      } catch (e) { return Object.freeze({ status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), limitations: Object.freeze([]), framing: null, exportGate: false, detail: 'requestComparison token failed — fail-closed', generationToken: 0 }); }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:639:      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:655:      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:679:      var dmResult = dm.computeDeltaMetrics(dmReq);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:701:        // a structured blocked outcome — no exception escapes requestComparison's public boundary.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:702:        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'requestComparison threw — fail-closed', null, token);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:733:          var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:739:            var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:771:     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:777:    function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:779:        if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:792:        // it was returned from requestComparison via Object.freeze. If a caller has hand-built
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:796:        return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:813:        return _exportBlocked('exportComparison threw — fail-closed');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:817:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:826:      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:827:      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:838:  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:863: * UMD: Node require / Electron renderer global (R3_0C_DeltaMetrics).
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:872:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:935:   * computeDeltaMetrics(request) — entry point. Returns
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:947:  function computeDeltaMetrics(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1030:      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'computeDeltaMetrics threw — fail-closed');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1072:    computeDeltaMetrics: computeDeltaMetrics,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1076:  if (root) root.R3_0C_DeltaMetrics = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1091: * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1100:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1120:    if (!_isPlain(deps.orchestrator) || typeof deps.orchestrator.requestComparison !== 'function') throw new Error('createComparisonViewModel requires orchestrator');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1203:        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1232:      var response = orch.requestComparison({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1299:        // requestComparison can pass it to the orchestrator, but the orchestrator's
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1353:  if (root) root.R3_0C_ComparisonViewModel = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1359:/bin/bash -lc "rg -n \"createOrchestrator|createComparisonViewModel|buildComparisonExport|exportComparison|hostile|Proxy|B2[5-9]|G3|UI_INITIALIZATION_FAILED\" tests/r3-0c-comparison-workspace.test.js tests/r3-0c-comparison-export.test.js renderer/js/r3-0c-comparison-export.js && sed -n '300,520p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '1,300p' renderer/js/r3-0c-comparison-export.js && sed -n '1,300p' contracts/r3.0c/framing-i18n-key-registry.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1366:renderer/js/r3-0c-comparison-export.js:482:   * buildComparisonExport(request) — produces a closed-schema portable comparison envelope.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1367:renderer/js/r3-0c-comparison-export.js:498:  function buildComparisonExport(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1368:renderer/js/r3-0c-comparison-export.js:499:    try { return _buildComparisonExportInner(request); }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1370:renderer/js/r3-0c-comparison-export.js:504:      return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'unhandled throw in buildComparisonExport: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown'));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1371:renderer/js/r3-0c-comparison-export.js:507:  function _buildComparisonExportInner(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1372:renderer/js/r3-0c-comparison-export.js:532:    var envelope = EX.buildComparisonExportEnvelope(payloadBuilt.payload);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1373:renderer/js/r3-0c-comparison-export.js:571:    buildComparisonExport: buildComparisonExport,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1378:tests/r3-0c-comparison-workspace.test.js:121:    chk('B18 Proxy advertises params via accessor descriptor → invalid', FIR.validateFramingEntry(proxy18).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1381:tests/r3-0c-comparison-workspace.test.js:126:    chk('B19 Proxy ownKeys throws → invalid', FIR.validateFramingEntry(proxy19).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1400:tests/r3-0c-comparison-workspace.test.js:336:  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1401:tests/r3-0c-comparison-workspace.test.js:337:  chk('G3c orchestrator public API does NOT expose isAuthenticCaseRecord', typeof orch.isAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1402:tests/r3-0c-comparison-workspace.test.js:339:// G4. Codex C7-R5-01: orchestrator.exportComparison MUST NOT let a hostile accessor on caller-
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1404:tests/r3-0c-comparison-workspace.test.js:342:// exportComparison instead of returning a structured blocked result.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1408:tests/r3-0c-comparison-workspace.test.js:349:  try { out = orch.exportComparison(hostile, {}); } catch (e) { threw = true; }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1409:tests/r3-0c-comparison-workspace.test.js:350:  chk('G4 exportComparison does NOT throw on hostile framing accessor', threw === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1410:tests/r3-0c-comparison-workspace.test.js:351:  chk('G4b exportComparison returns structured blocked on hostile input', out && out.eligible === false && out.status === 'blocked');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1415:tests/r3-0c-comparison-workspace.test.js:357:  try { out2 = orch.exportComparison(hostile2, hostileExtras); } catch (e) { threw2 = true; }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1416:tests/r3-0c-comparison-workspace.test.js:358:  chk('G4c exportComparison does NOT throw on hostile extraInputs accessor', threw2 === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1417:tests/r3-0c-comparison-workspace.test.js:359:  chk('G4d exportComparison handles hostile extras as null (no crash)', out2 !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1426:tests/r3-0c-comparison-export.test.js:95:  const out = Service.buildComparisonExport(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1427:tests/r3-0c-comparison-export.test.js:111:  const out1 = Service.buildComparisonExport(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1428:tests/r3-0c-comparison-export.test.js:112:  const out2 = Service.buildComparisonExport(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1429:tests/r3-0c-comparison-export.test.js:119:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1430:tests/r3-0c-comparison-export.test.js:135:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1431:tests/r3-0c-comparison-export.test.js:140:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1432:tests/r3-0c-comparison-export.test.js:146:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1433:tests/r3-0c-comparison-export.test.js:152:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1434:tests/r3-0c-comparison-export.test.js:159:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1435:tests/r3-0c-comparison-export.test.js:164:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1436:tests/r3-0c-comparison-export.test.js:169:(() => { const r = req(); r.association = association({ trackId: '' }); chk('G1 missing trackId → MISSING_TRACK_IDENTITY', hasCode(Service.buildComparisonExport(r), CODES.MISSING_TRACK_IDENTITY)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1437:tests/r3-0c-comparison-export.test.js:170:(() => { const r = req(); r.association = association({ positionBasis: 'bogus' }); chk('G2 bogus positionBasis → MISSING_POSITION_BASIS', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_BASIS)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1438:tests/r3-0c-comparison-export.test.js:171:(() => { const r = req(); r.association = association({ positionDirection: 'sideways' }); chk('G3 bogus positionDirection → MISSING_POSITION_DIRECTION', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_DIRECTION)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1439:tests/r3-0c-comparison-export.test.js:174:(() => { const r = req(); r.credibilityMetadata = {}; chk('H1 empty credibility → INSUFFICIENT_CREDIBILITY_METADATA', hasCode(Service.buildComparisonExport(r), CODES.INSUFFICIENT_CREDIBILITY_METADATA)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1440:tests/r3-0c-comparison-export.test.js:175:(() => { const r = req(); r.credibilityMetadata = credibility({ provenance: 'synthetic' }); chk('H2 synthetic without SYNTHETIC_ONLY_LIMITATION → blocked', !Service.buildComparisonExport(r).eligible); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1441:tests/r3-0c-comparison-export.test.js:178:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1442:tests/r3-0c-comparison-export.test.js:190:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1443:tests/r3-0c-comparison-export.test.js:196:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1444:tests/r3-0c-comparison-export.test.js:203:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1445:tests/r3-0c-comparison-export.test.js:210:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1446:tests/r3-0c-comparison-export.test.js:217:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1447:tests/r3-0c-comparison-export.test.js:224:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1448:tests/r3-0c-comparison-export.test.js:234:  chk('J1 mutated result (oversized corners) → blocked', Service.buildComparisonExport(r).eligible === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1449:tests/r3-0c-comparison-export.test.js:240:  chk('J2 mutated result (corner Infinity) → blocked', Service.buildComparisonExport(r).eligible === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1450:tests/r3-0c-comparison-export.test.js:246:  chk('J3 mutated result (no cornerId) → blocked', Service.buildComparisonExport(r).eligible === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1451:tests/r3-0c-comparison-export.test.js:253:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1452:tests/r3-0c-comparison-export.test.js:261:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1453:tests/r3-0c-comparison-export.test.js:268:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1454:tests/r3-0c-comparison-export.test.js:276:chk('N1 adapter exposes buildComparisonExport function', typeof Adapter.buildComparisonExport === 'function');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1455:tests/r3-0c-comparison-export.test.js:284:  const a = Adapter.buildComparisonExport(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1456:tests/r3-0c-comparison-export.test.js:285:  const s = Service.buildComparisonExport(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1457:tests/r3-0c-comparison-export.test.js:291:  const r = Service.buildComparisonExport(bad);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1458:tests/r3-0c-comparison-export.test.js:320:  const out = Service.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1459:tests/r3-0c-comparison-export.test.js:349:  const out = Service.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1462:tests/r3-0c-comparison-export.test.js:366:  const out = Service.buildComparisonExport(trapProxy);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1466:tests/r3-0c-comparison-export.test.js:381:  const out = Service.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1468:tests/r3-0c-comparison-export.test.js:406:    const out = Service.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1469:tests/r3-0c-comparison-export.test.js:430:    const out = Service.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1472:tests/r3-0c-comparison-export.test.js:491:  const out = Service.buildComparisonExport(trappy);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1473:tests/r3-0c-comparison-export.test.js:506:    const out = Service.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1474:tests/r3-0c-comparison-export.test.js:519:    const out = Service.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1475:tests/r3-0c-comparison-export.test.js:560:    const out = ShimmedService.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1478:tests/r3-0c-comparison-export.test.js:591:  const out1 = Service.buildComparisonExport(r1);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1481:tests/r3-0c-comparison-export.test.js:602:  const out2 = Service.buildComparisonExport(r2);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1485:tests/r3-0c-comparison-export.test.js:619:  const out3 = Service.buildComparisonExport(r3);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1489:tests/r3-0c-comparison-export.test.js:636:  try { const r4 = req(); r4.framing = { cannotConclude: [attack4], alternativeExplanations: [], nextValidationAction: null }; out4 = Service.buildComparisonExport(r4); }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1490:tests/r3-0c-comparison-export.test.js:638:  chk('Z4 (C7-R4 closure) Proxy lying descriptor + throwing accessor → buildComparisonExport does NOT trigger accessor', threw4 === false && out4 !== undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1494:          var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1500:            var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1532:     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1538:    function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1540:        if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1553:        // it was returned from requestComparison via Object.freeze. If a caller has hand-built
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1557:        return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1574:        return _exportBlocked('exportComparison threw — fail-closed');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1578:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1587:      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1588:      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1599:  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1639: * UMD: Node require / Electron renderer global (R3_0C_ComparisonExport).
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1653:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1654:  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1764:    // all. Both holes are now closed by delegating to FIR.validateFramingEntry, which returns a
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1773:    if (!FIR || typeof FIR.validateFramingEntry !== 'function') return null;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1774:    var vr = FIR.validateFramingEntry(frame);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1855:    // R3_0C_DeltaMetrics is absent) — without the authenticity predicate we cannot verify
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1912: * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1918: * UMD: Node require / Electron renderer global (R3_0C_FramingI18nKeyRegistry).
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1924:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:1925:  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2021:   * validateFramingEntry(entry) — structural + registry gate.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2030:  function validateFramingEntry(entry) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2108:    validateFramingEntry: validateFramingEntry,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2112:  if (root) root.R3_0C_FramingI18nKeyRegistry = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2127: probe('requestComparison.'+key,()=>orch.requestComparison(p));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2131: probe('computeDeltaMetrics.'+key,()=>DM.computeDeltaMetrics(p));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2135: probe('buildComparisonExport.'+key,()=>EX.buildComparisonExport(p));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2137:probe('exportComparison.response',()=>orch.exportComparison(new Proxy({}, {getPrototypeOf(){return Object.prototype},get(){throw Error('response get')}}),{}));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2138:probe('exportComparison.extras',()=>orch.exportComparison({status:'eligible',exportGate:true,result:{},generationToken:1,framing:{}},new Proxy({}, {getPrototypeOf(){return Object.prototype},get(){throw Error('extras get')}})));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2139:function vm(){return VM.createComparisonViewModel({orchestrator:{requestComparison(){return {status:'blocked',reasonCodes:[],limitations:[],generationToken:1}}},capabilities:caps});}
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2153:/bin/bash -lc "node -e '\"'\"'\"use strict\"; const Orch=require(\"./renderer/js/r3-0c-comparison-orchestrator.js\"),DM=require(\"./renderer/js/r3-0c-delta-metrics.js\"),VM=require(\"./renderer/js/r3-0c-comparison-viewmodel.js\"),EX=require(\"./renderer/js/r3-0c-comparison-export.js\"); const caps={phaseBoundaryContractEnabled:false,viewmodelStateTransitionContractEnabled:true,framingSourceStructuredContractEnabled:true}; const orch=Orch.createOrchestrator({capabilities:caps,authenticityPredicate:()=>true}); function probe(l,f){try{const o=f();console.log(l,\"NO_THROW\",o&&o.status,o&&o.eligible)}catch(e){console.log(l,\"THREW\",e.message)}} for(const key of [\"caseRecord\",\"association\",\"eligibilityInput\",\"deltaMetricsRequest\",\"framing\",\"credibilityMetadata\"]){const p=new Proxy({},{getPrototypeOf(){return Object.prototype},get(t,k){if(k===key)throw Error(\"trap:\"+key);return Reflect.get(t,k)}});probe(\"requestComparison.\"+key,()=>orch.requestComparison(p))} for(const key of [\"identity\",\"requestedMetrics\",\"pairing\",\"referenceLap\",\"comparisonLap\",\"policy\"]){const p=new Proxy({},{getPrototypeOf(){return Object.prototype},get(t,k){if(k===key)throw Error(\"trap:\"+key);return Reflect.get(t,k)}});probe(\"computeDeltaMetrics.\"+key,()=>DM.computeDeltaMetrics(p))} for(const key of [\"generationToken\",\"result\",\"association\",\"framing\",\"referenceLap\",\"comparisonLap\",\"credibilityMetadata\"]){const p=new Proxy({},{getPrototypeOf(){return Object.prototype},get(t,k){if(k===key)throw Error(\"trap:\"+key);return Reflect.get(t,k)}});probe(\"buildComparisonExport.\"+key,()=>EX.buildComparisonExport(p))} probe(\"exportComparison.response\",()=>orch.exportComparison(new Proxy({},{getPrototypeOf(){return Object.prototype},get(){throw Error(\"response get\")}}),{})); probe(\"exportComparison.extras\",()=>orch.exportComparison({status:\"eligible\",exportGate:true,result:{},generationToken:1,framing:{}},new Proxy({},{getPrototypeOf(){return Object.prototype},get(){throw Error(\"extras get\")}}))); function vm(){return VM.createComparisonViewModel({orchestrator:{requestComparison(){return {status:\"blocked\",reasonCodes:[],limitations:[],generationToken:1}}},capabilities:caps})} const hostile=new Proxy({},{getPrototypeOf(){return Object.prototype},ownKeys(){throw Error(\"ownKeys trap\")}}); for(const m of [\"setReference\",\"setComparison\",\"setAssociation\",\"setChannelMapping\"])probe(\"viewmodel.\"+m,()=>vm()[m](hostile)); for(const m of [\"notifyCaseReopen\",\"notifyAuthorityRevoked\",\"notifyEligibilityRevoked\",\"getState\"])probe(\"viewmodel.\"+m,()=>vm()[m](hostile));'\"'\"'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2169:/bin/bash -lc "node -e 'const Orch=require(\"./renderer/js/r3-0c-comparison-orchestrator.js\"),DM=require(\"./renderer/js/r3-0c-delta-metrics.js\"),VM=require(\"./renderer/js/r3-0c-comparison-viewmodel.js\"),EX=require(\"./renderer/js/r3-0c-comparison-export.js\"); const caps={phaseBoundaryContractEnabled:false,viewmodelStateTransitionContractEnabled:true,framingSourceStructuredContractEnabled:true}; const orch=Orch.createOrchestrator({capabilities:caps,authenticityPredicate:()=>true}); function probe(l,f){try{const o=f();console.log(l,\"NO_THROW\",o&&o.status,o&&o.eligible)}catch(e){console.log(l,\"THREW\",e.message)}} for(const key of [\"caseRecord\",\"association\",\"eligibilityInput\",\"deltaMetricsRequest\",\"framing\",\"credibilityMetadata\"]){const p=new Proxy({},{getPrototypeOf(){return Object.prototype},get(t,k){if(k===key)throw Error(\"trap:\"+key);return Reflect.get(t,k)}});probe(\"requestComparison.\"+key,()=>orch.requestComparison(p))} for(const key of [\"identity\",\"requestedMetrics\",\"pairing\",\"referenceLap\",\"comparisonLap\",\"policy\"]){const p=new Proxy({},{getPrototypeOf(){return Object.prototype},get(t,k){if(k===key)throw Error(\"trap:\"+key);return Reflect.get(t,k)}});probe(\"computeDeltaMetrics.\"+key,()=>DM.computeDeltaMetrics(p))} for(const key of [\"generationToken\",\"result\",\"association\",\"framing\",\"referenceLap\",\"comparisonLap\",\"credibilityMetadata\"]){const p=new Proxy({},{getPrototypeOf(){return Object.prototype},get(t,k){if(k===key)throw Error(\"trap:\"+key);return Reflect.get(t,k)}});probe(\"buildComparisonExport.\"+key,()=>EX.buildComparisonExport(p))} probe(\"exportComparison.response\",()=>orch.exportComparison(new Proxy({},{getPrototypeOf(){return Object.prototype},get(){throw Error(\"response get\")}}),{})); probe(\"exportComparison.extras\",()=>orch.exportComparison({status:\"eligible\",exportGate:true,result:{},generationToken:1,framing:{}},new Proxy({},{getPrototypeOf(){return Object.prototype},get(){throw Error(\"extras get\")}}))); function vm(){return VM.createComparisonViewModel({orchestrator:{requestComparison(){return {status:\"blocked\",reasonCodes:[],limitations:[],generationToken:1}}},capabilities:caps})} const hostile=new Proxy({},{getPrototypeOf(){return Object.prototype},ownKeys(){throw Error(\"ownKeys trap\")}}); for(const m of [\"setReference\",\"setComparison\",\"setAssociation\",\"setChannelMapping\"])probe(\"viewmodel.\"+m,()=>vm()[m](hostile)); for(const m of [\"notifyCaseReopen\",\"notifyAuthorityRevoked\",\"notifyEligibilityRevoked\",\"getState\"])probe(\"viewmodel.\"+m,()=>vm()[m](hostile));'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2171:requestComparison.caseRecord NO_THROW blocked undefined
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2172:requestComparison.association NO_THROW blocked undefined
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2173:requestComparison.eligibilityInput NO_THROW blocked undefined
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2174:requestComparison.deltaMetricsRequest NO_THROW blocked undefined
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2175:requestComparison.framing NO_THROW blocked undefined
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2176:requestComparison.credibilityMetadata NO_THROW blocked undefined
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2177:computeDeltaMetrics.identity NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2178:computeDeltaMetrics.requestedMetrics NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2179:computeDeltaMetrics.pairing NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2180:computeDeltaMetrics.referenceLap NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2181:computeDeltaMetrics.comparisonLap NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2182:computeDeltaMetrics.policy NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2183:buildComparisonExport.generationToken NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2184:buildComparisonExport.result NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2185:buildComparisonExport.association NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2186:buildComparisonExport.framing NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2187:buildComparisonExport.referenceLap NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2188:buildComparisonExport.comparisonLap NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2189:buildComparisonExport.credibilityMetadata NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2190:exportComparison.response NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2191:exportComparison.extras NO_THROW blocked false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2202:/bin/bash -lc "node tests/r3-0c-governance.test.js; node tests/r3.0c-contract-foundation.test.js; node tests/i18n-parity.test.js; node tests/r3-0c-no-consumer.test.js; node tests/r3.0a-ui.test.js; rg -n \"r3-0c-contracts-bundle|r3-0c-delta-metrics|r3-0c-comparison-export|r3-0c-comparison-orchestrator|r3-0c-comparison-viewmodel\" renderer/index.html; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..93506779 | rg \"(physics|dynamics|preset|r3\\.0b|portable|schema)\" || true; node -e 'const F=require(\"./contracts/r3.0c/framing-i18n-key-registry.js\"),C=require(\"./contracts/r3.0c/reason-codes.js\").REASON_CODES; function p(l,x){console.log(l,x.valid,x.sanitized&&Object.isFrozen(x.sanitized),x.sanitized&&x.sanitized.params&&Object.isFrozen(x.sanitized.params))}; const ok={reasonCode:C.CANNOT_DISTINGUISH,i18nKey:\"r3_0c.framing.cannot_distinguish\",params:{x:1}};p(\"normal\",F.validateFramingEntry(ok)); const accessor={reasonCode:C.CANNOT_DISTINGUISH,i18nKey:\"r3_0c.framing.cannot_distinguish\"}; Object.defineProperty(accessor,\"params\",{enumerable:true,get(){throw Error(\"trap\")}});p(\"accessor\",F.validateFramingEntry(accessor)); const desc=new Proxy(ok,{getOwnPropertyDescriptor(t,k){if(k===\"i18nKey\")throw Error(\"trap\");return Reflect.getOwnPropertyDescriptor(t,k)}});p(\"descriptorTrap\",F.validateFramingEntry(desc));'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2244:/bin/bash -lc "node -e 'const fs=require(\"fs\"),s=JSON.parse(fs.readFileSync(\"governance/r3.0c/state.json\")),c=JSON.parse(fs.readFileSync(\"governance/r3.0c/capabilities.json\")),t=JSON.parse(fs.readFileSync(\"governance/r3.0/train.json\")),cp=JSON.parse(fs.readFileSync(\"governance/r3.0c/checkpoints/C7.json\")); function walk(o,p=\"\"){for(const [k,v] of Object.entries(o||{})){const q=p?"'`${p}.${k}`:k;if(/checkpoint|feature|phase|authorized|frozen|preset/i.test(k))console.log(q,Array.isArray(v)?`array(${v.length})`:typeof v==="object"?JSON.stringify(v):v);if(v&&typeof v==="object"&&!Array.isArray(v)&&p.split(".").length<2)walk(v,q)}} console.log("STATE");walk(s);console.log("CAPS");walk(c);console.log("TRAIN");walk(t);console.log("C7");walk(cp); console.log("enabledCaps",Object.values(c.capabilities||c).filter(x=>x&&x.enabled===true).length);'"' ; rg -n \"presetCount|501|frozenDiff|authPathCount|enabledCaps|feature_registry_active\" tests/r3-0c-governance.test.js scripts governance/r3.0c | head -100; rg -n \"registerAuthenticCaseRecord|isAuthenticCaseRecord\" renderer/js/r3-0c-comparison-orchestrator.js renderer/js/r3-0c-comparison-viewmodel.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2247:currentCheckpoint C7_UI
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2252:capabilities.phase_boundary_contract {"kind":"contract","unlockFloor":"C5R_CP1_RETROFIT","enabled":false,"description":"CP1 round-2 retrofit (cp1-retrofit-matrix.md F6). Service-owned deterministic phase-boundary contract authorising the three phase delta metrics (entry_delta, mid_delta, exit_delta). Disabled at C5R: any production caller requesting a phase metric without a registered, service-owned, deterministic phase-boundary authorisation MUST be refused with PHASE_BOUNDARY_CONTRACT_UNAUTHORISED. Test fixtures may declare a test-only authorisation (contractRef = 'r3.0c/phase-boundary-test-fixture') strictly inside test files; a governance test asserts no renderer/js path supplies a phase-boundary authorisation while this capability is disabled."}
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2257:phaseStates {"R3.0C":{"governanceDir":"governance/r3.0c","currentCheckpoint":"C7_UI","finalActivationCheckpoint":"C8_ACTIVATION","started":true,"finalActivationReached":false},"R3.0D":{"governanceDir":"governance/r3.0d","currentCheckpoint":"D0_BOOTSTRAP","finalActivationCheckpoint":"D5_ACTIVATION","started":false,"finalActivationReached":false},"R3.0E":{"governanceDir":"governance/r3.0e","currentCheckpoint":"E0_BOOTSTRAP","finalActivationCheckpoint":"E5_ACTIVATION","started":false,"finalActivationReached":false},"R3.0F":{"governanceDir":"governance/r3.0f","currentCheckpoint":"F0_BOOTSTRAP","finalActivationCheckpoint":"F6_RELEASE","started":false,"finalActivationReached":false}}
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2258:phaseStates.R3.0C.currentCheckpoint C7_UI
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2260:phaseStates.R3.0D.currentCheckpoint D0_BOOTSTRAP
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2262:phaseStates.R3.0E.currentCheckpoint E0_BOOTSTRAP
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2264:phaseStates.R3.0F.currentCheckpoint F0_BOOTSTRAP
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2272:uiSurface.phaseCardsBehavior Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2279:enabledCaps 2
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2298:scripts/check-r3-0c-governance.js:259:  enabledCaps: result.enabledCapabilityCount,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2306:scripts/check-r3-phase-governance.js:301:  enabledCaps: result.enabledCapabilityCount,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2318:governance/r3.0c/checkpoints/C7.json:96:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2332:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:291:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2337:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1779:    94	  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2344:scripts/check-preset-integrity.js:46:    presetCount: ids.length,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2345:scripts/check-preset-integrity.js:59:catch (e) { result = { check: 'preset-integrity', fatalError: String((e && e.stack) || e), presetCount: -1, ok: false }; exitCode = 2; }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2346:scripts/check-preset-integrity.js:62:console.log('PRESET ' + JSON.stringify({ presetCount: result.presetCount, apiCount: result.apiCount, idsUnique: result.idsUnique, ok: result.ok }));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2347:scripts/collect-evidence.js:172:  presetCount: preset ? preset.presetCount : -1,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2350:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:68:   • enabledCaps=12, currentCheckpoint=C7_UI, feature_registry_active=false, three R3.0C
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2351:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:69:     feature IDs deferred, phase_boundary_contract disabled, frozenDiff=0,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2352:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:70:     R3.0B schema untouched, presetCount=501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2357:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:267:   • presetCount = 501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2358:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1793:console.log(JSON.stringify({authPathCount:s.authorizedProductionPaths?.length,currentCheckpoint:s.currentCheckpoint,enabledCaps:Object.values(c.capabilities||c).filter(x=>x&&x.enabled===true).length,feature_registry_active:s.feature_registry_active,phase_boundary_contract:(c.capabilities||c).phase_boundary_contract},null,2));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2359:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1802:rg -n 'presetCount|501|frozenDiff|frozen_diff|availability.*deferred|feature_registry_active' governance scripts tests/r3-0c-governance.test.js tests/r3-0c-governance-integrity.test.js | head -100" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2376:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1825:scripts/check-preset-integrity.js:46:    presetCount: ids.length,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2377:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1826:scripts/check-preset-integrity.js:59:catch (e) { result = { check: 'preset-integrity', fatalError: String((e && e.stack) || e), presetCount: -1, ok: false }; exitCode = 2; }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2378:governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1827:scripts/check-preset-integrity.js:62:console.log('PRESET ' + JSON.stringify({ presetCount: result.presetCount, apiCount: result.apiCount, idsUnique: result.idsUnique, ok: result.ok }));
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2380:renderer/js/r3-0c-comparison-orchestrator.js:76:   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2381:renderer/js/r3-0c-comparison-orchestrator.js:102:    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2382:renderer/js/r3-0c-comparison-orchestrator.js:209:      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2383:renderer/js/r3-0c-comparison-orchestrator.js:387:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2386:/bin/bash -lc "nl -ba renderer/js/r3-0c-comparison-viewmodel.js | sed -n '225,305p'; node scripts/check-preset-integrity.js; node scripts/check-frozen-boundary.js; node scripts/check-r3-0c-governance.js --json; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..93506779 -- schemas/r3.0b contracts/r3.0b governance/r3.0b || true; node -e 'const s=require(\"./governance/r3.0c/state.json\"),c=require(\"./governance/r3.0c/capabilities.json\"); console.log({authPaths:s.authorizedProductionPaths.length,enabledCaps:s.enabledCapabilities.length,currentCheckpoint:s.currentCheckpoint,featureRegistryActivationAllowed:s.featureRegistryActivationAllowed,phaseBoundary:c.capabilities.phase_boundary_contract.enabled});'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2415:  authPaths: 14,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2416:  enabledCaps: 12,
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2417:  currentCheckpoint: 'C7_UI',
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2442:   222	        // requestComparison can pass it to the orchestrator, but the orchestrator's
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2466:   187	    function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2467:   188	      // Codex C7-R5-01 cascade: the public requestComparison boundary is a sister-site of
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2468:   189	      // exportComparison. Caller-controlled `input` is read via plain property access for
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2476:   197	      } catch (e) { return Object.freeze({ status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), limitations: Object.freeze([]), framing: null, exportGate: false, detail: 'requestComparison token failed — fail-closed', generationToken: 0 }); }
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2488:   209	      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2504:   225	      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2528:   249	      var dmResult = dm.computeDeltaMetrics(dmReq);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2550:   271	        // a structured blocked outcome — no exception escapes requestComparison's public boundary.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2551:   272	        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'requestComparison threw — fail-closed', null, token);
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2563:   108	  function computeDeltaMetrics(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2646:   191	      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'computeDeltaMetrics threw — fail-closed');
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2682:- `requestComparison`: all six hostile-get variants returned `blocked`.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2683:- `computeDeltaMetrics`: hostile variants returned structured blocked results.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2684:- `buildComparisonExport` and `exportComparison`: no throws.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2690:- Governance snapshot: authPaths=14, enabledCaps=12, C7_UI, feature activation false, phase boundary disabled.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2725:- `requestComparison`: all six hostile-get variants returned `blocked`.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2726:- `computeDeltaMetrics`: hostile variants returned structured blocked results.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2727:- `buildComparisonExport` and `exportComparison`: no throws.
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md:2733:- Governance snapshot: authPaths=14, enabledCaps=12, C7_UI, feature activation false, phase boundary disabled.
tests/r3-0c-comparison-workspace.test.js:5: *   - framing-i18n-key-registry contract (closed allowlist + validateFramingEntry adversarial)
tests/r3-0c-comparison-workspace.test.js:43:chk('A7 cannotDistinguishFallback returns valid entry', FIR.validateFramingEntry(FIR.cannotDistinguishFallback()).valid === true);
tests/r3-0c-comparison-workspace.test.js:45:// B. validateFramingEntry adversarial
tests/r3-0c-comparison-workspace.test.js:48:  const ok1 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
tests/r3-0c-comparison-workspace.test.js:51:  const ok2 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123, channel: 'speed', flag: true, none: null } });
tests/r3-0c-comparison-workspace.test.js:54:  chk('B3 unknown reasonCode → invalid', FIR.validateFramingEntry({ reasonCode: 'NOT_REAL', i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === false);
tests/r3-0c-comparison-workspace.test.js:56:  chk('B4 unregistered i18nKey → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil' }).valid === false);
tests/r3-0c-comparison-workspace.test.js:58:  chk('B5 extra own-key → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', secret: 'x' }).valid === false);
tests/r3-0c-comparison-workspace.test.js:60:  chk('B6 free-form string → invalid', FIR.validateFramingEntry('driver was late on brakes').valid === false);
tests/r3-0c-comparison-workspace.test.js:62:  chk('B7 params with array → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { arr: [1, 2] } }).valid === false);
tests/r3-0c-comparison-workspace.test.js:64:  chk('B8 params with Date → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { when: new Date() } }).valid === false);
tests/r3-0c-comparison-workspace.test.js:66:  chk('B9 params with NaN → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { x: NaN } }).valid === false);
tests/r3-0c-comparison-workspace.test.js:68:  chk('B10 params with oversized string → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { s: 'x'.repeat(300) } }).valid === false);
tests/r3-0c-comparison-workspace.test.js:70:  chk('B11 params:null → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: null }).valid === false);
tests/r3-0c-comparison-workspace.test.js:80:    chk('B12 absent params → valid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === true);
tests/r3-0c-comparison-workspace.test.js:85:    chk('B13 params getter throws → invalid', FIR.validateFramingEntry(e13).valid === false);
tests/r3-0c-comparison-workspace.test.js:90:    chk('B14 reasonCode getter throws → invalid', FIR.validateFramingEntry(e14).valid === false);
tests/r3-0c-comparison-workspace.test.js:95:    chk('B15 i18nKey getter throws → invalid', FIR.validateFramingEntry(e15).valid === false);
tests/r3-0c-comparison-workspace.test.js:100:    chk('B16 params accessor (no throw, benign value) → invalid', FIR.validateFramingEntry(e16).valid === false);
tests/r3-0c-comparison-workspace.test.js:121:    chk('B18 Proxy advertises params via accessor descriptor → invalid', FIR.validateFramingEntry(proxy18).valid === false);
tests/r3-0c-comparison-workspace.test.js:126:    chk('B19 Proxy ownKeys throws → invalid', FIR.validateFramingEntry(proxy19).valid === false);
tests/r3-0c-comparison-workspace.test.js:134:    chk('B20 inner params value via accessor → invalid', FIR.validateFramingEntry(e20).valid === false);
tests/r3-0c-comparison-workspace.test.js:139:    chk('B21 inner params value getter throws → invalid', FIR.validateFramingEntry(e21).valid === false);
tests/r3-0c-comparison-workspace.test.js:144:    chk('B22 non-enumerable extra own-key → invalid', FIR.validateFramingEntry(e22).valid === false);
tests/r3-0c-comparison-workspace.test.js:149:    chk('B23 Symbol-keyed extra → invalid', FIR.validateFramingEntry(e23).valid === false);
tests/r3-0c-comparison-workspace.test.js:155:    chk('B24 params explicit-undefined → valid (back-compat)', FIR.validateFramingEntry(e24).valid === true);
tests/r3-0c-comparison-workspace.test.js:174:    const res25 = FIR.validateFramingEntry(attack25);
tests/r3-0c-comparison-workspace.test.js:187:    const ok26 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123 } });
tests/r3-0c-comparison-workspace.test.js:203:    const res27 = FIR.validateFramingEntry(e27);
tests/r3-0c-comparison-workspace.test.js:237:  const r1 = orch1.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
tests/r3-0c-comparison-workspace.test.js:240:  const r2 = orch2.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
tests/r3-0c-comparison-workspace.test.js:247:  const r1 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
tests/r3-0c-comparison-workspace.test.js:248:  const r2 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
tests/r3-0c-comparison-workspace.test.js:249:  const r3 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
tests/r3-0c-comparison-workspace.test.js:256:// Codex C7-R2-A-01 closure: the orchestrator no longer exposes registerAuthenticCaseRecord; the
tests/r3-0c-comparison-workspace.test.js:292:  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
tests/r3-0c-comparison-workspace.test.js:304:  const r = orch.requestComparison({ caseRecord: caseRec, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
tests/r3-0c-comparison-workspace.test.js:312:  const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
tests/r3-0c-comparison-workspace.test.js:317:// passed end-to-end. This test drives the FULL setAssociation → requestComparison escalation
tests/r3-0c-comparison-workspace.test.js:336:  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
tests/r3-0c-comparison-workspace.test.js:337:  chk('G3c orchestrator public API does NOT expose isAuthenticCaseRecord', typeof orch.isAuthenticCaseRecord === 'undefined');
tests/r3-0c-comparison-workspace.test.js:339:// G4. Codex C7-R5-01: orchestrator.exportComparison MUST NOT let a hostile accessor on caller-
tests/r3-0c-comparison-workspace.test.js:342:// exportComparison instead of returning a structured blocked result.
tests/r3-0c-comparison-workspace.test.js:349:  try { out = orch.exportComparison(hostile, {}); } catch (e) { threw = true; }
tests/r3-0c-comparison-workspace.test.js:350:  chk('G4 exportComparison does NOT throw on hostile framing accessor', threw === false);
tests/r3-0c-comparison-workspace.test.js:351:  chk('G4b exportComparison returns structured blocked on hostile input', out && out.eligible === false && out.status === 'blocked');
tests/r3-0c-comparison-workspace.test.js:357:  try { out2 = orch.exportComparison(hostile2, hostileExtras); } catch (e) { threw2 = true; }
tests/r3-0c-comparison-workspace.test.js:358:  chk('G4c exportComparison does NOT throw on hostile extraInputs accessor', threw2 === false);
tests/r3-0c-comparison-workspace.test.js:359:  chk('G4d exportComparison handles hostile extras as null (no crash)', out2 !== null);
tests/r3-0c-comparison-workspace.test.js:404:  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: dm });
tests/r3-0c-comparison-workspace.test.js:413:  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { observedDelta: 'driver was late on brakes' } });
tests/r3-0c-comparison-workspace.test.js:420:  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { nextValidationAction: { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil_made_up_key' } } });
tests/r3-0c-no-consumer.test.js:6: * fixtures (R3_0C_NO_CONSUMER_BASE_OVERRIDE) so the test never mutates production code. Feature-registry
tests/r3-0c-no-consumer.test.js:7: * FAIL paths use the R3_0C_NO_CONSUMER_FIXTURE_FEATURES_JSON env override so the real registry is never
tests/r3-0c-no-consumer.test.js:28:  if (opts && opts.base) env.R3_0C_NO_CONSUMER_BASE_OVERRIDE = opts.base;
tests/r3-0c-no-consumer.test.js:29:  if (opts && Object.prototype.hasOwnProperty.call(opts, 'featuresJson')) env.R3_0C_NO_CONSUMER_FIXTURE_FEATURES_JSON = opts.featuresJson;
tests/r3-0c-no-consumer.test.js:88:  chk('A3e real-repo currentCheckpoint===C7_UI', !!(r.artifact && r.artifact.currentCheckpoint === 'C7_UI'));
tests/r3-0c-no-consumer.test.js:99:  chk('B1 renderer/js require of contracts/r3.0c FAILS', r.status !== 0 && hasViolation(r.artifact, 'PROD_REQUIRES_R3_0C_CONTRACTS'));
tests/r3-0c-no-consumer.test.js:106:  chk('B2 renderer/js literal "contracts/r3.0c" specifier FAILS', r.status !== 0 && hasViolation(r.artifact, 'PROD_REQUIRES_R3_0C_CONTRACTS'));
tests/r3-0c-no-consumer.test.js:115:  chk('C1 main.js require of contracts FAILS', r.status !== 0 && hasViolation(r.artifact, 'PROD_REQUIRES_R3_0C_CONTRACTS'));
tests/r3-0c-no-consumer.test.js:122:  chk('C2 preload.js require of contracts FAILS', r.status !== 0 && hasViolation(r.artifact, 'PROD_REQUIRES_R3_0C_CONTRACTS'));
tests/r3-0c-no-consumer.test.js:138:  chk('D2 index.html script naming R3.0C feature FAILS', r.status !== 0 && hasViolation(r.artifact, 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE'));
tests/r3-0c-no-consumer.test.js:145:  chk('D3 index.html script naming corner-delta FAILS', r.status !== 0 && hasViolation(r.artifact, 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE'));
tests/r3-0c-no-consumer.test.js:152:  chk('D4 index.html script naming case-comparison FAILS', r.status !== 0 && hasViolation(r.artifact, 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE'));
renderer/js/r3-0c-track-identity.js:37: * UMD: Node require / Electron renderer global (R3_0C_TrackIdentity).
renderer/js/r3-0c-track-identity.js:47:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-track-identity.js:49:    throw new Error('renderer/js/r3-0c-track-identity.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
renderer/js/r3-0c-track-identity.js:237:  if (root) root.R3_0C_TrackIdentity = api;
tests/r3-0c-contracts-bundle-equivalence.test.js:66:chk('D2 R3_0C_ReasonCodes global registered', typeof sandbox.R3_0C_ReasonCodes === 'object' && sandbox.R3_0C_ReasonCodes !== null);
tests/r3-0c-contracts-bundle-equivalence.test.js:67:chk('D3 R3_0C_FramingI18nKeyRegistry global registered', typeof sandbox.R3_0C_FramingI18nKeyRegistry === 'object' && sandbox.R3_0C_FramingI18nKeyRegistry !== null);
tests/r3-0c-contracts-bundle-equivalence.test.js:68:chk('D4 R3_0C_ViewmodelStateTransitionContract global registered', typeof sandbox.R3_0C_ViewmodelStateTransitionContract === 'object' && sandbox.R3_0C_ViewmodelStateTransitionContract !== null);
tests/r3-0c-contracts-bundle-equivalence.test.js:69:chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
tests/r3-0c-contracts-bundle-equivalence.test.js:70:chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
tests/r3-0c-contracts-bundle-equivalence.test.js:71:chk('D7 ALL_REASON_CODES.length === 66', sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length === 66, sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length);
renderer/js/r3-0c-comparison-orchestrator.js:19: * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
renderer/js/r3-0c-comparison-orchestrator.js:31: * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
renderer/js/r3-0c-comparison-orchestrator.js:44:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-comparison-orchestrator.js:45:  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
renderer/js/r3-0c-comparison-orchestrator.js:46:  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
renderer/js/r3-0c-comparison-orchestrator.js:75:   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
renderer/js/r3-0c-comparison-orchestrator.js:76:   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
renderer/js/r3-0c-comparison-orchestrator.js:86:   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
renderer/js/r3-0c-comparison-orchestrator.js:96:    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
renderer/js/r3-0c-comparison-orchestrator.js:97:    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
renderer/js/r3-0c-comparison-orchestrator.js:100:    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
renderer/js/r3-0c-comparison-orchestrator.js:102:    function _isAuthenticCaseRecord(caseRecord) {
renderer/js/r3-0c-comparison-orchestrator.js:155:        var vr = FIR.validateFramingEntry(v);
renderer/js/r3-0c-comparison-orchestrator.js:163:          var er = FIR.validateFramingEntry(e);
renderer/js/r3-0c-comparison-orchestrator.js:174:     * requestComparison(input) — synchronous orchestrator entry point.
renderer/js/r3-0c-comparison-orchestrator.js:187:    function requestComparison(input) {
renderer/js/r3-0c-comparison-orchestrator.js:188:      // Codex C7-R5-01 cascade: the public requestComparison boundary is a sister-site of
renderer/js/r3-0c-comparison-orchestrator.js:189:      // exportComparison. Caller-controlled `input` is read via plain property access for
renderer/js/r3-0c-comparison-orchestrator.js:197:      } catch (e) { return Object.freeze({ status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), limitations: Object.freeze([]), framing: null, exportGate: false, detail: 'requestComparison token failed — fail-closed', generationToken: 0 }); }
renderer/js/r3-0c-comparison-orchestrator.js:209:      if (!_isAuthenticCaseRecord(input.caseRecord)) {
renderer/js/r3-0c-comparison-orchestrator.js:225:      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
renderer/js/r3-0c-comparison-orchestrator.js:249:      var dmResult = dm.computeDeltaMetrics(dmReq);
renderer/js/r3-0c-comparison-orchestrator.js:271:        // a structured blocked outcome — no exception escapes requestComparison's public boundary.
renderer/js/r3-0c-comparison-orchestrator.js:272:        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'requestComparison threw — fail-closed', null, token);
renderer/js/r3-0c-comparison-orchestrator.js:303:          var vr = FIR.validateFramingEntry(v);
renderer/js/r3-0c-comparison-orchestrator.js:309:            var er = FIR.validateFramingEntry(e);
renderer/js/r3-0c-comparison-orchestrator.js:341:     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
renderer/js/r3-0c-comparison-orchestrator.js:347:    function exportComparison(eligibleResponse, extraInputs) {
renderer/js/r3-0c-comparison-orchestrator.js:349:        if (!ex || typeof ex.buildComparisonExport !== 'function') {
renderer/js/r3-0c-comparison-orchestrator.js:362:        // it was returned from requestComparison via Object.freeze. If a caller has hand-built
renderer/js/r3-0c-comparison-orchestrator.js:366:        return ex.buildComparisonExport({
renderer/js/r3-0c-comparison-orchestrator.js:383:        return _exportBlocked('exportComparison threw — fail-closed');
renderer/js/r3-0c-comparison-orchestrator.js:387:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
renderer/js/r3-0c-comparison-orchestrator.js:396:      requestComparison: requestComparison,
renderer/js/r3-0c-comparison-orchestrator.js:397:      exportComparison: exportComparison,
renderer/js/r3-0c-comparison-orchestrator.js:408:  if (root) root.R3_0C_ComparisonOrchestrator = api;
tests/r3-0c-governance.test.js:6: * real-repo state; FAIL cases use temp-dir fixtures (R3_0C_GOV_DIR_OVERRIDE) so the test never
tests/r3-0c-governance.test.js:28:  if (govDir) env.R3_0C_GOV_DIR_OVERRIDE = govDir;
tests/r3-0c-governance.test.js:86:    currentCheckpoint: 'C0_BOOTSTRAP',
tests/r3-0c-governance.test.js:114:  chk('A3 real-repo checkpoint=C7_UI', !!(r.artifact && r.artifact.currentCheckpoint === 'C7_UI'));
tests/r3-0c-governance.test.js:130:  const state = baseC0State(); state.currentCheckpoint = 'C99_BOGUS';
tests/r3-0c-governance.test.js:132:  chk('B2 unknown currentCheckpoint FAILS', r.status !== 0 && hasViolation(r.artifact, 'STATE_CURRENT_CHECKPOINT_UNKNOWN'));
tests/r3-0c-governance.test.js:165:  state.currentCheckpoint = (opts && opts.currentCheckpoint) || 'C1_PRODUCTION_ADAPTER';
tests/r3-0c-governance.test.js:217:  state.currentCheckpoint = 'C0_BOOTSTRAP';
tests/r3-0c-governance.test.js:225:  state.currentCheckpoint = 'C1_PRODUCTION_ADAPTER';
renderer/js/i18n-comparisons.js:74:    "ui.blocker.UI_INITIALIZATION_FAILED": "Comparison workspace failed to initialize. Reload the page; if the problem persists the build is missing the C7 modules.",
renderer/js/i18n-comparisons.js:128:    "ui.blocker.UI_INITIALIZATION_FAILED": "比較工作區初始化失敗。請重新載入頁面；若問題持續，表示此版本缺少 C7 模組。",
renderer/js/i18n-comparisons.js:182:    "ui.blocker.UI_INITIALIZATION_FAILED": "比較ワークスペースの初期化に失敗しました。ページを再読み込みしてください；問題が続く場合、このビルドに C7 モジュールが含まれていません。",
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:37:  FIR.validateFramingEntry and consumes vr.sanitized; no raw frame.* re-reads.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:48:     framing field after FIR.validateFramingEntry returned. Flag any unchecked re-read.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:52:   • The orchestrator's exportComparison delegates to C6 buildComparisonExport. Confirm the
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:62:     bundle evaluates cleanly and registers all R3_0C_* globals.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:63:   • D (init structured failure): UI_INITIALIZATION_FAILED reachable.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:68:   • enabledCaps=12, currentCheckpoint=C7_UI, feature_registry_active=false, three R3.0C
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:69:     feature IDs deferred, phase_boundary_contract disabled, frozenDiff=0,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:70:     R3.0B schema untouched, presetCount=501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:82:   • Is FIR.validateFramingEntry a Node-side hot path that the C6 service now invokes per
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:205:- contracts/r3.0c/framing-i18n-key-registry.js validateFramingEntry returns
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:220:   • Verify validateFramingEntry result.sanitized is deep-frozen and contains ONLY
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:241:   • Public API of createOrchestrator return: still no registerAuthenticCaseRecord /
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:242:     isAuthenticCaseRecord.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:249:   • Browser-load probe (HTTP-served renderer/) yields R3_0C_Contracts /
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:251:   • Reason codes count = 66; UI_INITIALIZATION_FAILED present.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:259:   • currentCheckpoint = C7_UI.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:262:   • phase_boundary_contract.enabled = false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:267:   • presetCount = 501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:454: * UMD: Node require / Electron renderer global (R3_0C_ComparisonExport).
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:468:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:469:  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:579:    // all. Both holes are now closed by delegating to FIR.validateFramingEntry, which returns a
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:588:    if (!FIR || typeof FIR.validateFramingEntry !== 'function') return null;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:589:    var vr = FIR.validateFramingEntry(frame);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:670:    // R3_0C_DeltaMetrics is absent) — without the authenticity predicate we cannot verify
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:694: * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:706: * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:719:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:720:  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:721:  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:750:   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:751:   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:761:   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:771:    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:772:    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:775:    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:777:    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:830:        var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:838:          var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:849:     * requestComparison(input) — synchronous orchestrator entry point.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:862:    function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:874:      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:890:      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:914:      var dmResult = dm.computeDeltaMetrics(dmReq);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:963:          var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:969:            var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:978:     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:981:    function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:982:      if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:989:      return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1004:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1013:      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1014:      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1025:  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1038: * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1044: * UMD: Node require / Electron renderer global (R3_0C_FramingI18nKeyRegistry).
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1050:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1051:  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1147:   * validateFramingEntry(entry) — structural + registry gate.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1156:  function validateFramingEntry(entry) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1234:    validateFramingEntry: validateFramingEntry,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1238:  if (root) root.R3_0C_FramingI18nKeyRegistry = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1257:/bin/bash -lc "sed -n '115,215p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '280,390p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '430,590p' renderer/js/r3-0c-comparison-export.js && rg -n 'Z[1-4]|B2[5-7]|G3|UI_INITIALIZATION_FAILED|script src' tests/r3-0c-comparison-export.test.js tests/r3-0c-comparison-workspace.test.js renderer/index.html && git diff --name-only 9044a7f3..a1a6988e | rg '(physics|dynamics|preset|case-record-schema|portable|r3\\.0b)' || true" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1299:        var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1307:          var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1318:     * requestComparison(input) — synchronous orchestrator entry point.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1331:    function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1343:      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1359:      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1368:          var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1374:            var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1383:     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1386:    function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1387:      if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1394:      return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1409:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1418:      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1419:      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1430:  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1484:   * buildComparisonExport(request) — produces a closed-schema portable comparison envelope.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1500:  function buildComparisonExport(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1501:    try { return _buildComparisonExportInner(request); }
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1506:      return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'unhandled throw in buildComparisonExport: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown'));
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1509:  function _buildComparisonExportInner(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1534:    var envelope = EX.buildComparisonExportEnvelope(payloadBuilt.payload);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1573:    buildComparisonExport: buildComparisonExport,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1576:  if (root) root.R3_0C_ComparisonExport = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1588:tests/r3-0c-comparison-workspace.test.js:336:  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1589:tests/r3-0c-comparison-workspace.test.js:337:  chk('G3c orchestrator public API does NOT expose isAuthenticCaseRecord', typeof orch.isAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1590:tests/r3-0c-comparison-export.test.js:171:(() => { const r = req(); r.association = association({ positionDirection: 'sideways' }); chk('G3 bogus positionDirection → MISSING_POSITION_DIRECTION', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_DIRECTION)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1594:tests/r3-0c-comparison-export.test.js:638:  chk('Z4 (C7-R4 closure) Proxy lying descriptor + throwing accessor → buildComparisonExport does NOT trigger accessor', threw4 === false && out4 !== undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1597:renderer/index.html:274:             (including the new UI_INITIALIZATION_FAILED) surface localized wording. -->
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1681:renderer/index.html:3301:  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1682:renderer/index.html:3953:    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1683:renderer/index.html:3954:    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1684:renderer/index.html:3961:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1685:renderer/index.html:3962:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1686:renderer/index.html:3988:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1687:renderer/index.html:3989:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1793:console.log(JSON.stringify({authPathCount:s.authorizedProductionPaths?.length,currentCheckpoint:s.currentCheckpoint,enabledCaps:Object.values(c.capabilities||c).filter(x=>x&&x.enabled===true).length,feature_registry_active:s.feature_registry_active,phase_boundary_contract:(c.capabilities||c).phase_boundary_contract},null,2));
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1798:const o=O.createOrchestrator({capabilities:{framingSourceStructuredContractEnabled:true,viewmodelStateTransitionContractEnabled:true},authenticityPredicate:()=>true,exportService:{buildComparisonExport:()=>({ok:true})}});
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1800:try { const x=o.exportComparison(evil,{}); console.log('attack returned',x); } catch(e){ console.log('ATTACK_THROW',e.message,'getCount='+count); }
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1802:rg -n 'presetCount|501|frozenDiff|frozen_diff|availability.*deferred|feature_registry_active' governance scripts tests/r3-0c-governance.test.js tests/r3-0c-governance-integrity.test.js | head -100" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1825:scripts/check-preset-integrity.js:46:    presetCount: ids.length,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1826:scripts/check-preset-integrity.js:59:catch (e) { result = { check: 'preset-integrity', fatalError: String((e && e.stack) || e), presetCount: -1, ok: false }; exitCode = 2; }
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1827:scripts/check-preset-integrity.js:62:console.log('PRESET ' + JSON.stringify({ presetCount: result.presetCount, apiCount: result.apiCount, idsUnique: result.idsUnique, ok: result.ok }));
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1837:scripts/collect-evidence.js:172:  presetCount: preset ? preset.presetCount : -1,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1843:governance/r3.0c/state.json:27:  "note": "R3.0C C7_UI state. Adds the Comparison Workspace UI: three new authorized renderer/js paths (r3-0c-comparison-orchestrator.js, r3-0c-comparison-viewmodel.js, i18n-comparisons.js) all bound to the new ui_present capability. The orchestrator owns request-token issuance + framing emission (composes C5 delta-metrics + C6 export); the viewmodel is the pure state machine consuming orchestrator output, implementing the 7 transition triggers + stale-token drop per contracts/r3.0c/viewmodel-state-transition-contract.js. The framing-source contract (contracts/r3.0c/framing-i18n-key-registry.js) is enabled: every framing entry the orchestrator emits is validated against a closed allowlist of i18nKeys before reaching the viewmodel; the viewmodel re-validates as defense in depth. uiAllowed flips true: the Comparison Workspace pane replaces the deferred placeholder in renderer/index.html. featureRegistryActivationAllowed remains false: the three R3.0C feature IDs (case_comparison, reference_lap, corner_delta) remain availability='deferred' with NO rendererAdapter until C8 authorizes activation — C7 ships the UI surface without activating the routes. phase_boundary_contract remains the only declared-but-disabled governance capability: phase metrics (entry/mid/exit_delta) are reported metricAvailability:false in both viewmodel and export until a future checkpoint authorizes a deterministic phase-boundary contract."
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1878:governance/r3.0c/checkpoints/C7.json:96:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1890:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:291:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1897:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1779:    94	  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1904:governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:100:   • presetCount = 501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1905:governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2288:rg -n \"availability|feature_registry_active|phase_boundary_contract|portable|schema\" governance/r3.0c renderer/js/case-record-schema.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1908:A concrete C7-scope failure remains: `exportComparison` is not fail-closed for caller-controlled response/framing access. A plain object with `status: "eligible"` and `exportGate: true` but a throwing `framing` accessor escapes the public API as an exception before C6 can sanitize anything. I’m pinning the exact path and checking whether current tests cover this boundary.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1910:/bin/bash -lc "node -e \"const O=require('./renderer/js/r3-0c-comparison-orchestrator.js');let called=0;const o=O.createOrchestrator({capabilities:{framingSourceStructuredContractEnabled:true,viewmodelStateTransitionContractEnabled:true},authenticityPredicate:()=>true,exportService:{buildComparisonExport(){called++;return {eligible:false}}}});const r={status:'eligible',exportGate:true,result:{},generationToken:'1'};Object.defineProperty(r,'framing',{enumerable:true,get(){throw Error('framing accessor fired')}});try{o.exportComparison(r,{}) ;console.log('RETURNED')}catch(e){console.log('ESCAPED',e.message,'c6Called='+called)}\" && nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '350,385p' && rg -n 'exportComparison\\(|framing accessor|throwing.*framing|export gate closed' tests/r3-0c-comparison-workspace.test.js tests/r3-0c-comparison-export.test.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1913:   350	  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1917:/bin/bash -lc "nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '300,345p'; rg -n 'exportComparison\\(|framing accessor|throwing.*framing|export gate closed' tests/r3-0c-comparison-workspace.test.js tests/r3-0c-comparison-export.test.js || true; node -e \"const s=require('./governance/r3.0c/state.json'),c=require('./governance/r3.0c/capabilities.json'),f=require('./renderer/js/feature-registry.js'); console.log('authPathCount',s.authorizedProductionPaths.length,'checkpoint',s.currentCheckpoint,'featureRegistryAllowed',s.featureRegistryActivationAllowed); console.log('enabledCaps',Object.values(c.capabilities).filter(x=>x.enabled).length,'phase',c.capabilities.phase_boundary_contract.enabled); console.log(['case_comparison','reference_lap','corner_delta'].map(k=>[k,f.FEATURES[k]?.availability]));\"" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1922:   303	     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1925:   306	    function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1926:   307	      if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1933:   314	      return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1948:   329	    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1957:   338	      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1958:   339	      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:1966:enabledCaps 2 phase false
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:2006:`exportComparison()` directly reads caller-controlled properties without a fail-closed boundary:
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:2024:orchestrator.exportComparison(response, {});
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:2056:`exportComparison()` directly reads caller-controlled properties without a fail-closed boundary:
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md:2074:orchestrator.exportComparison(response, {});
renderer/js/r3-0c-corner-pairing.js:19: * UMD: Node require / Electron renderer global (R3_0C_CornerPairing).
renderer/js/r3-0c-corner-pairing.js:28:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-corner-pairing.js:188:  if (root) root.R3_0C_CornerPairing = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:38:- contracts/r3.0c/reason-codes.js (+1 UI_INITIALIZATION_FAILED)
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:41:- renderer/js/i18n-comparisons.js (ui.blocker.UI_INITIALIZATION_FAILED wording en/zh/ja)
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:53:   • Verify the orchestrator public API (the value returned by createOrchestrator) does NOT carry registerAuthenticCaseRecord or isAuthenticCaseRecord. Any test that probes `typeof orch.registerAuthenticCaseRecord === 'undefined'` should hold.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:54:   • Verify deps.authenticityPredicate is the ONLY authority check inside requestComparison.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:56:   • Verify the predicate throw is treated as false (fail-closed). Try: an orchestrator whose predicate throws; requestComparison should be blocked.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:62:   • Read scripts/build-r3-0c-contracts-bundle.js and confirm it produces the committed bundle byte-for-byte. Run the equivalence test mentally: regenerated should equal committed. The committed bundle SHOULD register every R3_0C_* global when evaluated in a browser-like sandbox where `module` is undefined.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:63:   • Read the browser sandbox evaluation test in tests/r3-0c-contracts-bundle-equivalence.test.js. Check it uses vm.runInContext WITHOUT a Node `module` global. The expected outcome is R3_0C_Contracts on globalThis with REASON_CODES.UI_INITIALIZATION_FAILED present.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:65:   • Probe for script ordering bug: what if the bundle loads AFTER delta-metrics? delta-metrics requires R3_0C_Contracts global — would throw at load time. Check the order in index.html.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:69:   • Confirm validateFramingEntry uses _readOwn for reasonCode / i18nKey / params AND inner param values; all THREW paths return invalid.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:74:   • Confirm UI_INITIALIZATION_FAILED is in REASON_CODES (66 total).
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:76:   • Confirm comparisonVMState() reads _r3cC7InitFailure FIRST and returns placeholder='unavailable' + blockedReasons=[UI_INITIALIZATION_FAILED] + exportGate=false on failure.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:77:   • Confirm the i18n key ui.blocker.UI_INITIALIZATION_FAILED exists in en/zh-TW/ja and renders via tCode('ui.blocker', code) (the previous tCode(code) single-arg bug is fixed).
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:82:   • Phase metrics still forced unavailable while phase_boundary_contract.enabled === false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:90:   • governance/r3.0c/capabilities.json phase_boundary_contract.enabled is still false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:94:   • Frozen physics / dynamics / preset files: untouched. presetCount=501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:205:  * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:211:  * UMD: Node require / Electron renderer global (R3_0C_FramingI18nKeyRegistry).
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:217:   var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:218:   var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:315:    * validateFramingEntry(entry) — structural + registry gate.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:324:   function validateFramingEntry(entry) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:396:     validateFramingEntry: validateFramingEntry,
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:400:   if (root) root.R3_0C_FramingI18nKeyRegistry = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:489:+    // globals (R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel) are not loaded into the
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:496:+    UI_INITIALIZATION_FAILED: 'UI_INITIALIZATION_FAILED',
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:542:   if (root) root.R3_0C_ReasonCodes = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:670:   <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:689:+             (including the new UI_INITIALIZATION_FAILED) surface localized wording. -->
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:908:+  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:916:+  // _r3cC7RegisterAuthenticCaseRecord. Until then the WeakSet stays empty, so any requestComparison
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1096:+    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1097:+    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1101:+    if (typeof R3_0C_ComparisonOrchestrator === 'undefined' || typeof R3_0C_ComparisonViewModel === 'undefined') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1104:+      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1105:+      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1109:-      if (typeof R3_0C_ComparisonOrchestrator !== 'undefined' && typeof R3_0C_ComparisonViewModel !== 'undefined') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1111:-        const _orch = R3_0C_ComparisonOrchestrator.createOrchestrator({ capabilities: caps });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1112:-        this._r3cC7VM = R3_0C_ComparisonViewModel.createComparisonViewModel({ orchestrator: _orch, capabilities: caps });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1124:+      const _orch = R3_0C_ComparisonOrchestrator.createOrchestrator({
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1132:+      this._r3cC7VM = R3_0C_ComparisonViewModel.createComparisonViewModel({ orchestrator: _orch, capabilities: caps });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1138:+      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1139:+      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1299:+    "ui.blocker.UI_INITIALIZATION_FAILED": "Comparison workspace failed to initialize. Reload the page; if the problem persists the build is missing the C7 modules.",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1353:+    "ui.blocker.UI_INITIALIZATION_FAILED": "比較工作區初始化失敗。請重新載入頁面；若問題持續，表示此版本缺少 C7 模組。",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1407:+    "ui.blocker.UI_INITIALIZATION_FAILED": "比較ワークスペースの初期化に失敗しました。ページを再読み込みしてください；問題が続く場合、このビルドに C7 モジュールが含まれていません。",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1435:  * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1447:  * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1460:   if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1461:   if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1462:   if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1492:+   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1493:+   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1503:+   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1513:     if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1514:     // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1517:+    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1519:+    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1533:-    // task); for unit tests + manual integration, the explicit registerAuthenticCaseRecord
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1535:-    // this entry point is refused at requestComparison time.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1537:-    function registerAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1547:-    function isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1592:         var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1600:           var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1611:      * requestComparison(input) — synchronous orchestrator entry point.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1624:     function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1637:-      if (!isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1638:-        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not registered via registerAuthenticCaseRecord — caller-controlled case authority refused', null, token);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1641:+      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1657:       // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1681:       var dmResult = dm.computeDeltaMetrics(dmReq);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1727:           if (v && FIR.validateFramingEntry(v).valid) built[k] = v;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1731:             if (e && FIR.validateFramingEntry(e).valid && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1739:      * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1742:     function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1743:       if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1750:       return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1765:+    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1774:-      registerAuthenticCaseRecord: registerAuthenticCaseRecord,
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1775:-      isAuthenticCaseRecord: isAuthenticCaseRecord,
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1776:       requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1777:       exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1788:   if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1812:       var response = orch.requestComparison({
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1879:+        // requestComparison can pass it to the orchestrator, but the orchestrator's
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1890:-        if (typeof orch.registerAuthenticCaseRecord === 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1891:-          try { orch.registerAuthenticCaseRecord(_state.caseRecord); } catch (e) { /* no-op */ }
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1940:   if (root) root.R3_0C_ComparisonViewModel = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1957:+ * the R3_0C_* globals and the comparison pane stays at placeholder.idle forever.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1963:+ *   - the no-consumer validator's INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE regex does not match
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2024:+  '// (`if (root) root.R3_0C_X = api`) registers every contract on globalThis before the\n' +
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2076:  *   - framing-i18n-key-registry contract (closed allowlist + validateFramingEntry adversarial)
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2114: chk('A7 cannotDistinguishFallback returns valid entry', FIR.validateFramingEntry(FIR.cannotDistinguishFallback()).valid === true);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2116: // B. validateFramingEntry adversarial
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2119:   const ok1 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2122:   const ok2 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123, channel: 'speed', flag: true, none: null } });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2125:   chk('B3 unknown reasonCode → invalid', FIR.validateFramingEntry({ reasonCode: 'NOT_REAL', i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2127:   chk('B4 unregistered i18nKey → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil' }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2129:   chk('B5 extra own-key → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', secret: 'x' }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2131:   chk('B6 free-form string → invalid', FIR.validateFramingEntry('driver was late on brakes').valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2133:   chk('B7 params with array → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { arr: [1, 2] } }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2135:   chk('B8 params with Date → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { when: new Date() } }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2137:   chk('B9 params with NaN → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { x: NaN } }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2139:   chk('B10 params with oversized string → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { s: 'x'.repeat(300) } }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2141:   chk('B11 params:null → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: null }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2151:+    chk('B12 absent params → valid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === true);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2156:+    chk('B13 params getter throws → invalid', FIR.validateFramingEntry(e13).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2161:+    chk('B14 reasonCode getter throws → invalid', FIR.validateFramingEntry(e14).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2166:+    chk('B15 i18nKey getter throws → invalid', FIR.validateFramingEntry(e15).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2171:+    chk('B16 params accessor (no throw, benign value) → invalid', FIR.validateFramingEntry(e16).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2192:+    chk('B18 Proxy advertises params via accessor descriptor → invalid', FIR.validateFramingEntry(proxy18).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2197:+    chk('B19 Proxy ownKeys throws → invalid', FIR.validateFramingEntry(proxy19).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2205:+    chk('B20 inner params value via accessor → invalid', FIR.validateFramingEntry(e20).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2210:+    chk('B21 inner params value getter throws → invalid', FIR.validateFramingEntry(e21).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2215:+    chk('B22 non-enumerable extra own-key → invalid', FIR.validateFramingEntry(e22).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2220:+    chk('B23 Symbol-keyed extra → invalid', FIR.validateFramingEntry(e23).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2226:+    chk('B24 params explicit-undefined → valid (back-compat)', FIR.validateFramingEntry(e24).valid === true);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2255:   const r1 = orch1.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2258:   const r2 = orch2.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2265:   const r1 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2266:   const r2 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2267:   const r3 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2274:-// helper: build an orchestrator AND register the caseRecord so requestComparison can pass the
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2277:+// Codex C7-R2-A-01 closure: the orchestrator no longer exposes registerAuthenticCaseRecord; the
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2290:-function regCase(orch, cr) { orch.registerAuthenticCaseRecord(cr); return cr; }
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2315:-  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2318:   const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2330:-  orch.registerAuthenticCaseRecord(caseRec);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2332:   const r = orch.requestComparison({ caseRecord: caseRec, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2342:   const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2348:+// passed end-to-end. This test drives the FULL setAssociation → requestComparison escalation
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2367:+  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2368:+  chk('G3c orchestrator public API does NOT expose isAuthenticCaseRecord', typeof orch.isAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2373:-  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2378:   const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: dm });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2386:-  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2389:   const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { observedDelta: 'driver was late on brakes' } });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2395:-  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2398:   const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { nextValidationAction: { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil_made_up_key' } } });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2532:+chk('D2 R3_0C_ReasonCodes global registered', typeof sandbox.R3_0C_ReasonCodes === 'object' && sandbox.R3_0C_ReasonCodes !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2533:+chk('D3 R3_0C_FramingI18nKeyRegistry global registered', typeof sandbox.R3_0C_FramingI18nKeyRegistry === 'object' && sandbox.R3_0C_FramingI18nKeyRegistry !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2534:+chk('D4 R3_0C_ViewmodelStateTransitionContract global registered', typeof sandbox.R3_0C_ViewmodelStateTransitionContract === 'object' && sandbox.R3_0C_ViewmodelStateTransitionContract !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2535:+chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2536:+chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2537:+chk('D7 ALL_REASON_CODES.length === 66', sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length === 66, sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2567:    19	 * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2579:    31	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2592:    44	  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2593:    45	  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2594:    46	  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2623:    75	   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2624:    76	   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2634:    86	   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2644:    96	    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2645:    97	    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2648:   100	    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2650:   102	    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2699:   151	        var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2707:   159	          var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2718:   170	     * requestComparison(input) — synchronous orchestrator entry point.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2731:   183	    function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2743:   195	      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2759:   211	      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2783:   235	      var dmResult = dm.computeDeltaMetrics(dmReq);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2822:    14	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2831:    23	  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2851:    43	    if (!_isPlain(deps.orchestrator) || typeof deps.orchestrator.requestComparison !== 'function') throw new Error('createComparisonViewModel requires orchestrator');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2934:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2963:   155	      var response = orch.requestComparison({
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3030:   222	        // requestComparison can pass it to the orchestrator, but the orchestrator's
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3084:   276	  if (root) root.R3_0C_ComparisonViewModel = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3368:/bin/bash -lc "rg -n \"r3-0c-contracts|r3-0c-delta|r3-0c-comparison-export|r3-0c-comparison-orchestrator|r3-0c-comparison-viewmodel|function app|init\\(\\)|_r3cC7InitFailure|comparisonVMState|UI_INITIALIZATION_FAILED|console.warn|tCode\\('ui.blocker'\" renderer/index.html renderer/js/i18n-comparisons.js; tail -n 55 renderer/js/r3-0c-comparison-orchestrator.js; rg -n \"registerAuthentic|isAuthentic|authenticityPredicate|_clearAndPlaceholder|latestToken|phaseBoundary\" renderer/js/r3-0c-comparison-*.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3370:renderer/js/i18n-comparisons.js:74:    "ui.blocker.UI_INITIALIZATION_FAILED": "Comparison workspace failed to initialize. Reload the page; if the problem persists the build is missing the C7 modules.",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3371:renderer/js/i18n-comparisons.js:128:    "ui.blocker.UI_INITIALIZATION_FAILED": "比較工作區初始化失敗。請重新載入頁面；若問題持續，表示此版本缺少 C7 模組。",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3372:renderer/js/i18n-comparisons.js:182:    "ui.blocker.UI_INITIALIZATION_FAILED": "比較ワークスペースの初期化に失敗しました。ページを再読み込みしてください；問題が続く場合、このビルドに C7 モジュールが含まれていません。",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3384:renderer/index.html:274:             (including the new UI_INITIALIZATION_FAILED) surface localized wording. -->
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3409:renderer/index.html:3301:  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3417:renderer/index.html:3953:    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3418:renderer/index.html:3954:    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3419:renderer/index.html:3961:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3420:renderer/index.html:3962:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3422:renderer/index.html:3988:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3423:renderer/index.html:3989:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3430:     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3433:    function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3434:      if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3441:      return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3456:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3465:      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3466:      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3477:  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3482:renderer/js/r3-0c-comparison-orchestrator.js:76:   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3485:renderer/js/r3-0c-comparison-orchestrator.js:102:    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3487:renderer/js/r3-0c-comparison-orchestrator.js:195:      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3491:renderer/js/r3-0c-comparison-orchestrator.js:319:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3577:  3301	  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3585:  3309	  // _r3cC7RegisterAuthenticCaseRecord. Until then the WeakSet stays empty, so any requestComparison
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3630:  3953	    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3631:  3954	    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3635:  3958	    if (typeof R3_0C_ComparisonOrchestrator === 'undefined' || typeof R3_0C_ComparisonViewModel === 'undefined') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3638:  3961	      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3639:  3962	      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3651:  3974	      const _orch = R3_0C_ComparisonOrchestrator.createOrchestrator({
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3659:  3982	      this._r3cC7VM = R3_0C_ComparisonViewModel.createComparisonViewModel({ orchestrator: _orch, capabilities: caps });
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3665:  3988	      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3666:  3989	      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3739:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3768:   155	      var response = orch.requestComparison({
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3835:   222	        // requestComparison can pass it to the orchestrator, but the orchestrator's
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3868:    10	 * the R3_0C_* globals and the comparison pane stays at placeholder.idle forever.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3874:    16	 *   - the no-consumer validator's INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE regex does not match
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3935:    77	  '// (`if (root) root.R3_0C_X = api`) registers every contract on globalThis before the\n' +
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4653:const c=require('./governance/r3.0c/checkpoints/C7.json'); const caps=require('./governance/r3.0c/capabilities.json'); const train=require('./governance/r3.0/train.json'); console.log(JSON.stringify({enabledCapabilitiesAfter:c.enabledCapabilitiesAfter,phase:caps.phase_boundary_contract,train:{currentPhaseCheckpoint:train.currentPhaseCheckpoint,trainStatus:train.trainStatus}},null,2));
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4655:rg -n \"presetCount|501\" governance tests/vehicle-preset-pipeline.test.js | head -20" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4767:/bin/bash -lc "node -e \"const F=require('./contracts/r3.0c/framing-i18n-key-registry'); const R=require('./contracts/r3.0c/reason-codes').REASON_CODES; const target={reasonCode:R.CANNOT_DISTINGUISH,i18nKey:'r3_0c.framing.cannot_distinguish'}; Object.defineProperty(target,'params',{configurable:true,enumerable:true,get(){throw Error('ACCESSOR EXECUTED')}}); const p=new Proxy(target,{getOwnPropertyDescriptor(t,k){if(k==='params')return {configurable:true,enumerable:true,writable:true,value:undefined}; return Reflect.getOwnPropertyDescriptor(t,k)}}); console.log(F.validateFramingEntry(p)); try{console.log(p.params)}catch(e){console.log(e.message)}\"; node -e \"const c=require('./governance/r3.0c/checkpoints/C7.json'),p=require('./governance/r3.0c/capabilities.json'),t=require('./governance/r3.0/train.json'); console.log(c.enabledCapabilitiesAfter); console.log(p.phase_boundary_contract); console.log(t.currentPhaseCheckpoint,t.trainStatus)\"; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..ae039008 | rg '("'^|/)(physics|dynamics|preset|case-record-schema|portable)'"' || true; nl -ba contracts/r3.0c/framing-i18n-key-registry.js | sed -n '70,165p'; nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '145,165p'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4842:   121	   * validateFramingEntry(entry) — structural + registry gate.
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4851:   130	  function validateFramingEntry(entry) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4893:   151	        var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4901:   159	          var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4910:/bin/bash -lc "rg -n 'phase_boundary_contract|\"enabled\"|case_comparison|reference_lap|corner_delta|feature_registry_active' governance/r3.0c/capabilities.json governance/r3.0c/checkpoints/C7.json; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..ae039008 | rg '("'^|/)(core|physics|dynamics|presets?|case-record-schema|portable)'"' || true; git status --short; node tests/vehicle-preset-pipeline.test.js | tail -n 2" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4913:governance/r3.0c/checkpoints/C7.json:69:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4916:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4919:governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4979:    72	    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:5062:    66	chk('D2 R3_0C_ReasonCodes global registered', typeof sandbox.R3_0C_ReasonCodes === 'object' && sandbox.R3_0C_ReasonCodes !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:5063:    67	chk('D3 R3_0C_FramingI18nKeyRegistry global registered', typeof sandbox.R3_0C_FramingI18nKeyRegistry === 'object' && sandbox.R3_0C_FramingI18nKeyRegistry !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:5064:    68	chk('D4 R3_0C_ViewmodelStateTransitionContract global registered', typeof sandbox.R3_0C_ViewmodelStateTransitionContract === 'object' && sandbox.R3_0C_ViewmodelStateTransitionContract !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:5065:    69	chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:5066:    70	chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:5067:    71	chk('D7 ALL_REASON_CODES.length === 66', sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length === 66, sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length);
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:5109:validateFramingEntry(attack); // { valid: true }
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:5168:validateFramingEntry(attack); // { valid: true }
renderer/js/r3-0c-delta-metrics.js:24: * UMD: Node require / Electron renderer global (R3_0C_DeltaMetrics).
renderer/js/r3-0c-delta-metrics.js:33:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-delta-metrics.js:96:   * computeDeltaMetrics(request) — entry point. Returns
renderer/js/r3-0c-delta-metrics.js:108:  function computeDeltaMetrics(request) {
renderer/js/r3-0c-delta-metrics.js:191:      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'computeDeltaMetrics threw — fail-closed');
renderer/js/r3-0c-delta-metrics.js:233:    computeDeltaMetrics: computeDeltaMetrics,
renderer/js/r3-0c-delta-metrics.js:237:  if (root) root.R3_0C_DeltaMetrics = api;
renderer/js/r3-0c-lap-authority.js:46: * UMD: Node require / Electron renderer global (R3_0C_LapAuthority).
renderer/js/r3-0c-lap-authority.js:56:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-lap-authority.js:58:    throw new Error('renderer/js/r3-0c-lap-authority.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
renderer/js/r3-0c-lap-authority.js:399:  if (root) root.R3_0C_LapAuthority = api;
renderer/js/r3-0c-contracts-bundle.js:8:// (`if (root) root.R3_0C_X = api`) registers every contract on globalThis before the
renderer/js/r3-0c-contracts-bundle.js:27: * UMD: Node require / Electron renderer global (R3_0C_ReasonCodes). (Global export is for symmetry with the
renderer/js/r3-0c-contracts-bundle.js:152:    // globals (R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel) are not loaded into the
renderer/js/r3-0c-contracts-bundle.js:159:    UI_INITIALIZATION_FAILED: 'UI_INITIALIZATION_FAILED',
renderer/js/r3-0c-contracts-bundle.js:205:  if (root) root.R3_0C_ReasonCodes = api;
renderer/js/r3-0c-contracts-bundle.js:222: * UMD: Node require / Electron renderer global (R3_0C_CredibilityContract).
renderer/js/r3-0c-contracts-bundle.js:228:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:298:  if (root) root.R3_0C_CredibilityContract = api;
renderer/js/r3-0c-contracts-bundle.js:316: * UMD: Node require / Electron renderer global (R3_0C_ValidLapContract).
renderer/js/r3-0c-contracts-bundle.js:322:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:373:  if (root) root.R3_0C_ValidLapContract = api;
renderer/js/r3-0c-contracts-bundle.js:391: * UMD: Node require / Electron renderer global (R3_0C_NormalizedPositionContract).
renderer/js/r3-0c-contracts-bundle.js:397:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:608:  if (root) root.R3_0C_NormalizedPositionContract = api;
renderer/js/r3-0c-contracts-bundle.js:637: * UMD: Node require / Electron renderer global (R3_0C_ComparisonEligibilityContract).
renderer/js/r3-0c-contracts-bundle.js:643:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:644:  var VL = _req('./valid-lap-contract.js', typeof R3_0C_ValidLapContract !== 'undefined' ? R3_0C_ValidLapContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:645:  var NP = _req('./normalized-position-contract.js', typeof R3_0C_NormalizedPositionContract !== 'undefined' ? R3_0C_NormalizedPositionContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:646:  var CR = _req('./credibility-contract.js', typeof R3_0C_CredibilityContract !== 'undefined' ? R3_0C_CredibilityContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:847:  if (root) root.R3_0C_ComparisonEligibilityContract = api;
renderer/js/r3-0c-contracts-bundle.js:874: * UMD: Node require / Electron renderer global (R3_0C_ComparisonExportContract).
renderer/js/r3-0c-contracts-bundle.js:880:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:974:   * buildComparisonExportEnvelope(payload) — envelope constructor (plain-object builder). CP1 does not run a
renderer/js/r3-0c-contracts-bundle.js:978:  function buildComparisonExportEnvelope(payload) {
renderer/js/r3-0c-contracts-bundle.js:1047:    buildComparisonExportEnvelope: buildComparisonExportEnvelope,
renderer/js/r3-0c-contracts-bundle.js:1052:  if (root) root.R3_0C_ComparisonExportContract = api;
renderer/js/r3-0c-contracts-bundle.js:1076: * UMD: Node require / Electron renderer global (R3_0C_ReferenceAndCornerContract).
renderer/js/r3-0c-contracts-bundle.js:1082:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:1287:  if (root) root.R3_0C_ReferenceAndCornerContract = api;
renderer/js/r3-0c-contracts-bundle.js:1314: *     governance/r3.0c/capabilities.json (phase_boundary_contract.enabled). The orchestrator
renderer/js/r3-0c-contracts-bundle.js:1322: * UMD: Node require / Electron renderer global (R3_0C_DeltaMetricsContract).
renderer/js/r3-0c-contracts-bundle.js:1328:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:1459:  if (root) root.R3_0C_DeltaMetricsContract = api;
renderer/js/r3-0c-contracts-bundle.js:1476: * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
renderer/js/r3-0c-contracts-bundle.js:1482: * UMD: Node require / Electron renderer global (R3_0C_FramingI18nKeyRegistry).
renderer/js/r3-0c-contracts-bundle.js:1488:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:1489:  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1585:   * validateFramingEntry(entry) — structural + registry gate.
renderer/js/r3-0c-contracts-bundle.js:1594:  function validateFramingEntry(entry) {
renderer/js/r3-0c-contracts-bundle.js:1672:    validateFramingEntry: validateFramingEntry,
renderer/js/r3-0c-contracts-bundle.js:1676:  if (root) root.R3_0C_FramingI18nKeyRegistry = api;
renderer/js/r3-0c-contracts-bundle.js:1694: * UMD: Node require / Electron renderer global (R3_0C_ViewmodelStateTransitionContract).
renderer/js/r3-0c-contracts-bundle.js:1700:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:1816:  if (root) root.R3_0C_ViewmodelStateTransitionContract = api;
renderer/js/r3-0c-contracts-bundle.js:1830: * UMD: Node require / Electron renderer global (R3_0C_Contracts).
renderer/js/r3-0c-contracts-bundle.js:1836:  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
renderer/js/r3-0c-contracts-bundle.js:1837:  var CR = _req('./credibility-contract.js', typeof R3_0C_CredibilityContract !== 'undefined' ? R3_0C_CredibilityContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1838:  var VL = _req('./valid-lap-contract.js', typeof R3_0C_ValidLapContract !== 'undefined' ? R3_0C_ValidLapContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1839:  var NP = _req('./normalized-position-contract.js', typeof R3_0C_NormalizedPositionContract !== 'undefined' ? R3_0C_NormalizedPositionContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1840:  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1841:  var EX = _req('./comparison-export-contract.js', typeof R3_0C_ComparisonExportContract !== 'undefined' ? R3_0C_ComparisonExportContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1842:  var RAC = _req('./reference-and-corner-contract.js', typeof R3_0C_ReferenceAndCornerContract !== 'undefined' ? R3_0C_ReferenceAndCornerContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1843:  var DM = _req('./delta-metrics-contract.js', typeof R3_0C_DeltaMetricsContract !== 'undefined' ? R3_0C_DeltaMetricsContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1844:  var FIR = _req('./framing-i18n-key-registry.js', typeof R3_0C_FramingI18nKeyRegistry !== 'undefined' ? R3_0C_FramingI18nKeyRegistry : undefined);
renderer/js/r3-0c-contracts-bundle.js:1845:  var VST = _req('./viewmodel-state-transition-contract.js', typeof R3_0C_ViewmodelStateTransitionContract !== 'undefined' ? R3_0C_ViewmodelStateTransitionContract : undefined);
renderer/js/r3-0c-contracts-bundle.js:1867:  if (root) root.R3_0C_Contracts = api;
renderer/js/r3-0c-comparison-export.js:39: * UMD: Node require / Electron renderer global (R3_0C_ComparisonExport).
renderer/js/r3-0c-comparison-export.js:53:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-comparison-export.js:54:  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
renderer/js/r3-0c-comparison-export.js:164:    // all. Both holes are now closed by delegating to FIR.validateFramingEntry, which returns a
renderer/js/r3-0c-comparison-export.js:173:    if (!FIR || typeof FIR.validateFramingEntry !== 'function') return null;
renderer/js/r3-0c-comparison-export.js:174:    var vr = FIR.validateFramingEntry(frame);
renderer/js/r3-0c-comparison-export.js:255:    // R3_0C_DeltaMetrics is absent) — without the authenticity predicate we cannot verify
renderer/js/r3-0c-comparison-export.js:343:    // they remain governance-locked until phase_boundary_contract.enabled.
renderer/js/r3-0c-comparison-export.js:482:   * buildComparisonExport(request) — produces a closed-schema portable comparison envelope.
renderer/js/r3-0c-comparison-export.js:498:  function buildComparisonExport(request) {
renderer/js/r3-0c-comparison-export.js:499:    try { return _buildComparisonExportInner(request); }
renderer/js/r3-0c-comparison-export.js:504:      return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'unhandled throw in buildComparisonExport: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown'));
renderer/js/r3-0c-comparison-export.js:507:  function _buildComparisonExportInner(request) {
renderer/js/r3-0c-comparison-export.js:532:    var envelope = EX.buildComparisonExportEnvelope(payloadBuilt.payload);
renderer/js/r3-0c-comparison-export.js:571:    buildComparisonExport: buildComparisonExport,
renderer/js/r3-0c-comparison-export.js:574:  if (root) root.R3_0C_ComparisonExport = api;
renderer/js/r3-0c-comparison-adapter.js:31: * UMD: Node require / Electron renderer global (R3_0C_ComparisonAdapter). When loaded in a browser-only
renderer/js/r3-0c-comparison-adapter.js:33: * exposed on globalThis (R3_0C_Contracts) — keeping the adapter usable from both contexts without
renderer/js/r3-0c-comparison-adapter.js:74:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-comparison-adapter.js:75:  if (!LapAuthority && typeof R3_0C_LapAuthority !== 'undefined') LapAuthority = R3_0C_LapAuthority;
renderer/js/r3-0c-comparison-adapter.js:76:  if (!TrackIdentity && typeof R3_0C_TrackIdentity !== 'undefined') TrackIdentity = R3_0C_TrackIdentity;
renderer/js/r3-0c-comparison-adapter.js:77:  if (!DistanceAuthority && typeof R3_0C_DistanceAuthority !== 'undefined') DistanceAuthority = R3_0C_DistanceAuthority;
renderer/js/r3-0c-comparison-adapter.js:78:  if (!NormalizedDistance && typeof R3_0C_NormalizedDistance !== 'undefined') NormalizedDistance = R3_0C_NormalizedDistance;
renderer/js/r3-0c-comparison-adapter.js:79:  if (!ReferenceSelection && typeof R3_0C_ReferenceSelection !== 'undefined') ReferenceSelection = R3_0C_ReferenceSelection;
renderer/js/r3-0c-comparison-adapter.js:80:  if (!CornerSegmentation && typeof R3_0C_CornerSegmentation !== 'undefined') CornerSegmentation = R3_0C_CornerSegmentation;
renderer/js/r3-0c-comparison-adapter.js:81:  if (!CornerPairing && typeof R3_0C_CornerPairing !== 'undefined') CornerPairing = R3_0C_CornerPairing;
renderer/js/r3-0c-comparison-adapter.js:82:  if (!DeltaMetrics && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetrics = R3_0C_DeltaMetrics;
renderer/js/r3-0c-comparison-adapter.js:83:  if (!ComparisonExport && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExport = R3_0C_ComparisonExport;
renderer/js/r3-0c-comparison-adapter.js:85:    throw new Error('renderer/js/r3-0c-comparison-adapter.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
renderer/js/r3-0c-comparison-adapter.js:202:  function computeDeltaMetrics(request) {
renderer/js/r3-0c-comparison-adapter.js:203:    return _requireService(DeltaMetrics, 'delta-metrics').computeDeltaMetrics(request);
renderer/js/r3-0c-comparison-adapter.js:214:  // viewmodel / orchestrator call buildComparisonExport without importing the export service
renderer/js/r3-0c-comparison-adapter.js:217:  function buildComparisonExport(request) {
renderer/js/r3-0c-comparison-adapter.js:218:    return _requireService(ComparisonExport, 'comparison-export').buildComparisonExport(request);
renderer/js/r3-0c-comparison-adapter.js:298:    computeDeltaMetrics: computeDeltaMetrics,
renderer/js/r3-0c-comparison-adapter.js:302:    buildComparisonExport: buildComparisonExport,
renderer/js/r3-0c-comparison-adapter.js:309:  if (root) root.R3_0C_ComparisonAdapter = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:38:- contracts/r3.0c/framing-i18n-key-registry.js validateFramingEntry returns
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:53:   • Verify validateFramingEntry result.sanitized is deep-frozen and contains ONLY
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:74:   • Public API of createOrchestrator return: still no registerAuthenticCaseRecord /
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:75:     isAuthenticCaseRecord.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:82:   • Browser-load probe (HTTP-served renderer/) yields R3_0C_Contracts /
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:84:   • Reason codes count = 66; UI_INITIALIZATION_FAILED present.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:92:   • currentCheckpoint = C7_UI.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:95:   • phase_boundary_contract.enabled = false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:100:   • presetCount = 501.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:630:   "declaredButDisabledGovernanceCapabilities": ["phase_boundary_contract"],
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:649:         var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:658:           var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:674:-          if (v && FIR.validateFramingEntry(v).valid) built[k] = v;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:676:+          var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:681:-            if (e && FIR.validateFramingEntry(e).valid && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:683:+            var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:692:@@ -153,6 +153,59 @@ chk('A7 cannotDistinguishFallback returns valid entry', FIR.validateFramingEntry
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:695:     chk('B24 params explicit-undefined → valid (back-compat)', FIR.validateFramingEntry(e24).valid === true);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:714:+    const res25 = FIR.validateFramingEntry(attack25);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:727:+    const ok26 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123 } });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:743:+    const res27 = FIR.validateFramingEntry(e27);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:759:   chk('A3 real-repo checkpoint=C7_UI', !!(r.artifact && r.artifact.currentCheckpoint === 'C7_UI'));
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:767:/bin/bash -lc "rg -n \"reasonCode|i18nKey|validateFramingEntry|\\.sanitized\" contracts renderer/js --glob '*.js'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:772:contracts/r3.0c/framing-i18n-key-registry.js:12: * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:775:contracts/r3.0c/framing-i18n-key-registry.js:121:   * validateFramingEntry(entry) — structural + registry gate.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:780:contracts/r3.0c/framing-i18n-key-registry.js:130:  function validateFramingEntry(entry) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:804:contracts/r3.0c/framing-i18n-key-registry.js:208:    validateFramingEntry: validateFramingEntry,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:900:renderer/js/r3-0c-comparison-orchestrator.js:155:        var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:902:renderer/js/r3-0c-comparison-orchestrator.js:163:          var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:913:renderer/js/r3-0c-comparison-orchestrator.js:288:          var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:915:renderer/js/r3-0c-comparison-orchestrator.js:294:            var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:994:renderer/js/r3-0c-contracts-bundle.js:1476: * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:997:renderer/js/r3-0c-contracts-bundle.js:1585:   * validateFramingEntry(entry) — structural + registry gate.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1002:renderer/js/r3-0c-contracts-bundle.js:1594:  function validateFramingEntry(entry) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1026:renderer/js/r3-0c-contracts-bundle.js:1672:    validateFramingEntry: validateFramingEntry,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1062:    19	 * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1074:    31	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1087:    44	  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1088:    45	  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1089:    46	  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1118:    75	   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1119:    76	   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1129:    86	   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1139:    96	    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1140:    97	    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1143:   100	    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1145:   102	    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1198:   155	        var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1206:   163	          var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1217:   174	     * requestComparison(input) — synchronous orchestrator entry point.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1230:   187	    function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1242:   199	      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1258:   215	      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1282:   239	      var dmResult = dm.computeDeltaMetrics(dmReq);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1331:   288	          var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1337:   294	            var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1346:   303	     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1349:   306	    function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1350:   307	      if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1357:   314	      return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1372:   329	    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1381:   338	      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1382:   339	      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1393:   350	  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1410:    12	 * (validateFramingEntry returns invalid) AND at viewmodel receive time (defense in depth).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1416:    18	 * UMD: Node require / Electron renderer global (R3_0C_FramingI18nKeyRegistry).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1422:    24	  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1423:    25	  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1519:   121	   * validateFramingEntry(entry) — structural + registry gate.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1528:   130	  function validateFramingEntry(entry) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1606:   208	    validateFramingEntry: validateFramingEntry,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1610:   212	  if (root) root.R3_0C_FramingI18nKeyRegistry = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1643:    66	chk('D2 R3_0C_ReasonCodes global registered', typeof sandbox.R3_0C_ReasonCodes === 'object' && sandbox.R3_0C_ReasonCodes !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1644:    67	chk('D3 R3_0C_FramingI18nKeyRegistry global registered', typeof sandbox.R3_0C_FramingI18nKeyRegistry === 'object' && sandbox.R3_0C_FramingI18nKeyRegistry !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1645:    68	chk('D4 R3_0C_ViewmodelStateTransitionContract global registered', typeof sandbox.R3_0C_ViewmodelStateTransitionContract === 'object' && sandbox.R3_0C_ViewmodelStateTransitionContract !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1646:    69	chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1647:    70	chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1648:    71	chk('D7 ALL_REASON_CODES.length === 66', sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length === 66, sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1690:validateFramingEntry(attack); // { valid: true }
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1749:validateFramingEntry(attack); // { valid: true }
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1784: *   - framing-i18n-key-registry contract (closed allowlist + validateFramingEntry adversarial)
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1822:chk('A7 cannotDistinguishFallback returns valid entry', FIR.validateFramingEntry(FIR.cannotDistinguishFallback()).valid === true);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1824:// B. validateFramingEntry adversarial
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1827:  const ok1 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1830:  const ok2 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123, channel: 'speed', flag: true, none: null } });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1833:  chk('B3 unknown reasonCode → invalid', FIR.validateFramingEntry({ reasonCode: 'NOT_REAL', i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1835:  chk('B4 unregistered i18nKey → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil' }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1837:  chk('B5 extra own-key → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', secret: 'x' }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1839:  chk('B6 free-form string → invalid', FIR.validateFramingEntry('driver was late on brakes').valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1841:  chk('B7 params with array → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { arr: [1, 2] } }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1843:  chk('B8 params with Date → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { when: new Date() } }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1845:  chk('B9 params with NaN → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { x: NaN } }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1847:  chk('B10 params with oversized string → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { s: 'x'.repeat(300) } }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1849:  chk('B11 params:null → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: null }).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1859:    chk('B12 absent params → valid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === true);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1864:    chk('B13 params getter throws → invalid', FIR.validateFramingEntry(e13).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1869:    chk('B14 reasonCode getter throws → invalid', FIR.validateFramingEntry(e14).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1874:    chk('B15 i18nKey getter throws → invalid', FIR.validateFramingEntry(e15).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1879:    chk('B16 params accessor (no throw, benign value) → invalid', FIR.validateFramingEntry(e16).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1900:    chk('B18 Proxy advertises params via accessor descriptor → invalid', FIR.validateFramingEntry(proxy18).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1905:    chk('B19 Proxy ownKeys throws → invalid', FIR.validateFramingEntry(proxy19).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1913:    chk('B20 inner params value via accessor → invalid', FIR.validateFramingEntry(e20).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1918:    chk('B21 inner params value getter throws → invalid', FIR.validateFramingEntry(e21).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1923:    chk('B22 non-enumerable extra own-key → invalid', FIR.validateFramingEntry(e22).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1928:    chk('B23 Symbol-keyed extra → invalid', FIR.validateFramingEntry(e23).valid === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1934:    chk('B24 params explicit-undefined → valid (back-compat)', FIR.validateFramingEntry(e24).valid === true);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1953:    const res25 = FIR.validateFramingEntry(attack25);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1966:    const ok26 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123 } });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:1982:    const res27 = FIR.validateFramingEntry(e27);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2016:  const r1 = orch1.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2019:  const r2 = orch2.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2026:  const r1 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2027:  const r2 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2028:  const r3 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2035:// Codex C7-R2-A-01 closure: the orchestrator no longer exposes registerAuthenticCaseRecord; the
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2071:  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2083:  const r = orch.requestComparison({ caseRecord: caseRec, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2091:  const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2096:// passed end-to-end. This test drives the FULL setAssociation → requestComparison escalation
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2115:  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2116:  chk('G3c orchestrator public API does NOT expose isAuthenticCaseRecord', typeof orch.isAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2124:  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: dm });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2133:  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { observedDelta: 'driver was late on brakes' } });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2140:  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { nextValidationAction: { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil_made_up_key' } } });
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2268:chk('D2 R3_0C_ReasonCodes global registered', typeof sandbox.R3_0C_ReasonCodes === 'object' && sandbox.R3_0C_ReasonCodes !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2269:chk('D3 R3_0C_FramingI18nKeyRegistry global registered', typeof sandbox.R3_0C_FramingI18nKeyRegistry === 'object' && sandbox.R3_0C_FramingI18nKeyRegistry !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2270:chk('D4 R3_0C_ViewmodelStateTransitionContract global registered', typeof sandbox.R3_0C_ViewmodelStateTransitionContract === 'object' && sandbox.R3_0C_ViewmodelStateTransitionContract !== null);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2271:chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2272:chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2273:chk('D7 ALL_REASON_CODES.length === 66', sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length === 66, sandbox.R3_0C_ReasonCodes && sandbox.R3_0C_ReasonCodes.ALL_REASON_CODES.length);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2288:rg -n \"availability|feature_registry_active|phase_boundary_contract|portable|schema\" governance/r3.0c renderer/js/case-record-schema.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2328:    39	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonExport).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2342:    53	  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2343:    54	  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2445:   156	    // traps cannot crash buildComparisonExport or leak through (formal Codex C6 finding F-C6-A2).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2535:   246	    // R3_0C_DeltaMetrics is absent) — without the authenticity predicate we cannot verify
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2623:   334	    // they remain governance-locked until phase_boundary_contract.enabled.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2671:    22	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonExportContract).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2677:    28	  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2771:   122	   * buildComparisonExportEnvelope(payload) — envelope constructor (plain-object builder). CP1 does not run a
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2775:   126	  function buildComparisonExportEnvelope(payload) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2844:   195	    buildComparisonExportEnvelope: buildComparisonExportEnvelope,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2849:   200	  if (root) root.R3_0C_ComparisonExportContract = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2870:governance/r3.0c/schema.json:56:    "phase_boundary_contract",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2871:governance/r3.0c/schema.json:63:    "phase_boundary_contract",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2874:governance/r3.0c/schema.json:94:    "phase_boundary_contract": "C5R_CP1_RETROFIT",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2892:governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2895:governance/r3.0c/cp1-retrofit-matrix.md:34:| F6 | Major | **OPEN-HIGH (governance lock)** | `contracts/r3.0c/delta-metrics-contract.js` (the four corner-scope metrics — `sector_delta / entry_delta / mid_delta / exit_delta` — gated by `phaseBoundaryContractAuthorised` capability; without it → fail-closed `PHASE_BOUNDARY_CONTRACT_UNAUTHORISED`); `governance/r3.0c/capabilities.json` (add `phase_boundary_contract`: `enabled: false` until a real boundary contract ships) | `tests/r3-0c-delta-metrics.test.js` (phase-scope metrics blocked when capability `false`; allowed when `true` AND a phase-boundary payload is provided) | C5R | conditional: corner-scope metrics not blocked entirely; sector_delta still permissive once a corner pair exists, but entry/mid/exit specifically require the boundary contract |
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2902:governance/r3.0c/state.json:22:  "declaredButDisabledGovernanceCapabilities": ["phase_boundary_contract"],
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2903:governance/r3.0c/state.json:27:  "note": "R3.0C C7_UI state. Adds the Comparison Workspace UI: three new authorized renderer/js paths (r3-0c-comparison-orchestrator.js, r3-0c-comparison-viewmodel.js, i18n-comparisons.js) all bound to the new ui_present capability. The orchestrator owns request-token issuance + framing emission (composes C5 delta-metrics + C6 export); the viewmodel is the pure state machine consuming orchestrator output, implementing the 7 transition triggers + stale-token drop per contracts/r3.0c/viewmodel-state-transition-contract.js. The framing-source contract (contracts/r3.0c/framing-i18n-key-registry.js) is enabled: every framing entry the orchestrator emits is validated against a closed allowlist of i18nKeys before reaching the viewmodel; the viewmodel re-validates as defense in depth. uiAllowed flips true: the Comparison Workspace pane replaces the deferred placeholder in renderer/index.html. featureRegistryActivationAllowed remains false: the three R3.0C feature IDs (case_comparison, reference_lap, corner_delta) remain availability='deferred' with NO rendererAdapter until C8 authorizes activation — C7 ships the UI surface without activating the routes. phase_boundary_contract remains the only declared-but-disabled governance capability: phase metrics (entry/mid/exit_delta) are reported metricAvailability:false in both viewmodel and export until a future checkpoint authorizes a deterministic phase-boundary contract."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2907:governance/r3.0c/checkpoints/C5R.json:34:  "newlyDeclaredCapabilitiesDisabled": ["phase_boundary_contract", "viewmodel_state_transition_contract", "framing_source_structured_contract"],
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2912:governance/r3.0c/checkpoints/C5R.json:120:  "note": "C5R is a retrofit checkpoint. It does NOT advance any productionCapability beyond C5; enabledCapabilitiesBefore === enabledCapabilitiesAfter. It brings the C1-C5 surface into honesty alignment with the formal Codex C-A round-2 BLOCK adjudication (F1-F12 closure detailed above). The retrofit modifies one already-authorised production file (renderer/js/r3-0c-corner-segmentation.js — bounded O(n^2) overlap-scan extension, no algorithm replacement) and four contracts; declares three new governance-capabilities (phase_boundary_contract / viewmodel_state_transition_contract / framing_source_structured_contract — all DISABLED) that gate the deferred C7_UI surface; persists Codex C-A evidence in tiered form under governance/r3.0c/codex-ca-gate-evidence/; and explicitly separates reviewedCandidateSha / manifestCommitSha / integrationSha so future audits cannot conflate them. The trusted-verification artifact bound to the eventual Train integrationSha is the PASS authority for THAT integration; reviewedCandidateSha is the PASS authority only for the pre-merge retrofit candidate. headSha / workflowRunId / artifactId / artifactBoundSha / createdAt are intentionally null in-commit, mirroring the existing C0-C5 manifest convention. status='pending' per the same convention; PASS lives in the trusted-verification artifact, not in this file."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2917:governance/r3.0c/checkpoints/C7.json:71:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2918:governance/r3.0c/checkpoints/C7.json:96:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2922:governance/r3.0c/checkpoints/C6.json:107:    "phaseGatePreservation": "PHASE_SCOPE_METRICS (entry/mid/exit_delta) are reported metricAvailability:false in the export while phase_boundary_contract.enabled is false (F6 governance gate carried from CP1R)."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2923:governance/r3.0c/checkpoints/C6.json:123:  "note": "C6 Comparison Export. Adds ONE production capability (comparison_export_present) backed by renderer/js/r3-0c-comparison-export.js. The service is a closed-allowlist gateway: it validates input authority, rebuilds a plain payload from explicit allowlist fields (never spreads the caller's result), invokes contracts/r3.0c/comparison-export-contract.js for envelope construction + bounds, then JSON.serialize → parse → re-validate for deterministic round-trip equivalence. Stale-result guard: result.identity must match association. F6 governance gate preserved: phase metrics report metricAvailability:false until phase_boundary_contract.enabled becomes true. Blocked-result export contains only status / reasonCodes / limitations / identity / nextValidationAction — no fabricated metrics, no raw telemetry, no per-sample arrays, no exotic objects. No UI activation. No feature-registry change. C6 adversarial Codex review + Train target-context CI will fill the null SHA / verdict / artifact fields per the SHA-separation discipline before integration."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2924:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:89:   • `phase_boundary_contract.enabled` must remain false at C7.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2926:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:96:   • Verify `phase_boundary_contract.enabled` is still false in governance/r3.0c/capabilities.json.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2929:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:177:/bin/bash -lc "rg -n \"registerAuthentic|setAssociation|_safeGet|paramsRaw|latestToken|_clearAndPlaceholder|R3_0C_Comparison|UI_INITIALIZATION|catch \\(e\\)|phase|placeholder\\.idle\" renderer/index.html renderer/js/r3-0c-comparison-{orchestrator,viewmodel}.js contracts/r3.0c/framing-i18n-key-registry.js tests/r3-0c-comparison-workspace.test.js governance/r3.0c/{checkpoints/C7.json,capabilities.json} governance/r3.0/train.json && git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a | rg \"physics|dynamics|preset|schema|r3.0b\" || true" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2930:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:218:renderer/js/r3-0c-comparison-viewmodel.js:126:        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2931:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:241:governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2932:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:258:renderer/js/r3-0c-comparison-orchestrator.js:19: * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2933:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:275:renderer/js/r3-0c-comparison-orchestrator.js:211:      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2934:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:289:governance/r3.0c/checkpoints/C7.json:69:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2935:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:291:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2936:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:292:renderer/index.html:256:  <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2938:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:316:/bin/bash -lc "nl -ba renderer/index.html | sed -n '3240,3310p;3895,3935p' && rg -n \"<script["'^>]+src=" renderer/index.html | tail -40 && nl -ba renderer/js/r3-0c-comparison-viewmodel.js | sed -n '"'45,180p;205,270p' && nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '80,120p;185,205p;315,330p' && nl -ba contracts/r3.0c/framing-i18n-key-registry.js | sed -n '70,150p' && jq '{currentCheckpoint,phaseStates}' governance/r3.0/train.json; jq '{enabledCapabilitiesAfter,status}' governance/r3.0c/checkpoints/C7.json; jq '.capabilities.phase_boundary_contract // .phase_boundary_contract' governance/r3.0c/capabilities.json" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2944:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:551:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2951:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1754:    69	    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2952:governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md:1779:    94	  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2955:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:82:   • Phase metrics still forced unavailable while phase_boundary_contract.enabled === false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2957:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:90:   • governance/r3.0c/capabilities.json phase_boundary_contract.enabled is still false.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2963:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:670:   <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2968:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1435:  * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2969:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:1657:       // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2970:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2567:    19	 * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2971:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2759:   211	      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2972:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:2934:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2975:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:3739:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2982:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4653:const c=require('./governance/r3.0c/checkpoints/C7.json'); const caps=require('./governance/r3.0c/capabilities.json'); const train=require('./governance/r3.0/train.json'); console.log(JSON.stringify({enabledCapabilitiesAfter:c.enabledCapabilitiesAfter,phase:caps.phase_boundary_contract,train:{currentPhaseCheckpoint:train.currentPhaseCheckpoint,trainStatus:train.trainStatus}},null,2));
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2983:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4767:/bin/bash -lc "node -e \"const F=require('./contracts/r3.0c/framing-i18n-key-registry'); const R=require('./contracts/r3.0c/reason-codes').REASON_CODES; const target={reasonCode:R.CANNOT_DISTINGUISH,i18nKey:'r3_0c.framing.cannot_distinguish'}; Object.defineProperty(target,'params',{configurable:true,enumerable:true,get(){throw Error('ACCESSOR EXECUTED')}}); const p=new Proxy(target,{getOwnPropertyDescriptor(t,k){if(k==='params')return {configurable:true,enumerable:true,writable:true,value:undefined}; return Reflect.getOwnPropertyDescriptor(t,k)}}); console.log(F.validateFramingEntry(p)); try{console.log(p.params)}catch(e){console.log(e.message)}\"; node -e \"const c=require('./governance/r3.0c/checkpoints/C7.json'),p=require('./governance/r3.0c/capabilities.json'),t=require('./governance/r3.0/train.json'); console.log(c.enabledCapabilitiesAfter); console.log(p.phase_boundary_contract); console.log(t.currentPhaseCheckpoint,t.trainStatus)\"; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..ae039008 | rg '("'^|/)(physics|dynamics|preset|case-record-schema|portable)'"' || true; nl -ba contracts/r3.0c/framing-i18n-key-registry.js | sed -n '70,165p'; nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '145,165p'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2984:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4910:/bin/bash -lc "rg -n 'phase_boundary_contract|\"enabled\"|case_comparison|reference_lap|corner_delta|feature_registry_active' governance/r3.0c/capabilities.json governance/r3.0c/checkpoints/C7.json; git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..ae039008 | rg '("'^|/)(core|physics|dynamics|presets?|case-record-schema|portable)'"' || true; git status --short; node tests/vehicle-preset-pipeline.test.js | tail -n 2" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2986:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4913:governance/r3.0c/checkpoints/C7.json:69:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2987:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4916:governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2989:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4919:governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:2993:governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md:4979:    72	    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3011:    14	 * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3020:    23	  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3040:    43	    if (!_isPlain(deps.orchestrator) || typeof deps.orchestrator.requestComparison !== 'function') throw new Error('createComparisonViewModel requires orchestrator');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3123:   126	        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3152:   155	      var response = orch.requestComparison({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3219:   222	        // requestComparison can pass it to the orchestrator, but the orchestrator's
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3273:   276	  if (root) root.R3_0C_ComparisonViewModel = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3278:renderer/js/r3-0c-comparison-orchestrator.js:76:   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3281:renderer/js/r3-0c-comparison-orchestrator.js:96:    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3282:renderer/js/r3-0c-comparison-orchestrator.js:102:    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3287:renderer/js/r3-0c-comparison-orchestrator.js:199:      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3289:renderer/js/r3-0c-comparison-orchestrator.js:329:    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3365:   334	    // they remain governance-locked until phase_boundary_contract.enabled.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3504:   473	   * buildComparisonExport(request) — produces a closed-schema portable comparison envelope.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3520:   489	  function buildComparisonExport(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3521:   490	    try { return _buildComparisonExportInner(request); }
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3526:   495	      return _blockedExport([CODES.INTERNAL_CONTRACT_VIOLATION], 'unhandled throw in buildComparisonExport: ' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown'));
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3529:   498	  function _buildComparisonExportInner(request) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3554:   523	    var envelope = EX.buildComparisonExportEnvelope(payloadBuilt.payload);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3593:   562	    buildComparisonExport: buildComparisonExport,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3596:   565	  if (root) root.R3_0C_ComparisonExport = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3604:    96	    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3605:    97	    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3608:   100	    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3610:   102	    function _isAuthenticCaseRecord(caseRecord) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3663:   155	        var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3671:   163	          var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3682:   174	     * requestComparison(input) — synchronous orchestrator entry point.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3695:   187	    function requestComparison(input) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3707:   199	      if (!_isAuthenticCaseRecord(input.caseRecord)) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3723:   215	      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3747:   239	      var dmResult = dm.computeDeltaMetrics(dmReq);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3796:   288	          var vr = FIR.validateFramingEntry(v);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3802:   294	            var er = FIR.validateFramingEntry(e);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3811:   303	     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3814:   306	    function exportComparison(eligibleResponse, extraInputs) {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3815:   307	      if (!ex || typeof ex.buildComparisonExport !== 'function') {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3822:   314	      return ex.buildComparisonExport({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3837:   329	    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3846:   338	      requestComparison: requestComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3847:   339	      exportComparison: exportComparison,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3858:   350	  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3862:A second framing boundary is materially weaker: the public C6 export service rebuilds framing with direct property reads and never invokes `validateFramingEntry`. I’m constructing a direct export request with an authentic C5 result to determine whether a proxy can trigger side effects or inject an unregistered key through that path.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3864:/bin/bash -lc "sed -n '1,260p' tests/r3-0c-comparison-export.test.js; rg -n \"computeDeltaMetrics\\(|function .*Request|validRequest|baseRequest|make.*Request\" tests/r3-0c-comparison-export.test.js tests/r3-0c-delta-metrics.test.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3895:  return DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3915:  return DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3960:  const out = Service.buildComparisonExport(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3969:  // F6 governance: phase metrics MUST be reported unavailable while phase_boundary_contract is disabled.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3976:  const out1 = Service.buildComparisonExport(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3977:  const out2 = Service.buildComparisonExport(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:3984:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4000:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4005:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4011:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4017:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4024:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4029:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4034:(() => { const r = req(); r.association = association({ trackId: '' }); chk('G1 missing trackId → MISSING_TRACK_IDENTITY', hasCode(Service.buildComparisonExport(r), CODES.MISSING_TRACK_IDENTITY)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4035:(() => { const r = req(); r.association = association({ positionBasis: 'bogus' }); chk('G2 bogus positionBasis → MISSING_POSITION_BASIS', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_BASIS)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4036:(() => { const r = req(); r.association = association({ positionDirection: 'sideways' }); chk('G3 bogus positionDirection → MISSING_POSITION_DIRECTION', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_DIRECTION)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4039:(() => { const r = req(); r.credibilityMetadata = {}; chk('H1 empty credibility → INSUFFICIENT_CREDIBILITY_METADATA', hasCode(Service.buildComparisonExport(r), CODES.INSUFFICIENT_CREDIBILITY_METADATA)); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4040:(() => { const r = req(); r.credibilityMetadata = credibility({ provenance: 'synthetic' }); chk('H2 synthetic without SYNTHETIC_ONLY_LIMITATION → blocked', !Service.buildComparisonExport(r).eligible); })();
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4043:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4055:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4061:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4068:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4075:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4082:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4089:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4099:  chk('J1 mutated result (oversized corners) → blocked', Service.buildComparisonExport(r).eligible === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4105:  chk('J2 mutated result (corner Infinity) → blocked', Service.buildComparisonExport(r).eligible === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4111:  chk('J3 mutated result (no cornerId) → blocked', Service.buildComparisonExport(r).eligible === false);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4118:  const out = Service.buildComparisonExport(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4126:tests/r3-0c-comparison-export.test.js:30:  return DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4127:tests/r3-0c-comparison-export.test.js:50:  return DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4128:tests/r3-0c-comparison-export.test.js:334:  const realResult = DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4129:tests/r3-0c-comparison-export.test.js:372:  const realResult = DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4130:tests/r3-0c-comparison-export.test.js:397:  const realResult = DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4131:tests/r3-0c-comparison-export.test.js:421:  const realResult = DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4132:tests/r3-0c-comparison-export.test.js:446:  const real = DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4133:tests/r3-0c-comparison-export.test.js:471:  const realResult = DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4134:tests/r3-0c-comparison-export.test.js:497:  const realResult = DeltaMetricsService.computeDeltaMetrics({
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4135:tests/r3-0c-delta-metrics.test.js:50:  const out = Service.computeDeltaMetrics(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4136:tests/r3-0c-delta-metrics.test.js:65:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4137:tests/r3-0c-delta-metrics.test.js:76:  const a = Service.computeDeltaMetrics(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4138:tests/r3-0c-delta-metrics.test.js:82:  const b = Service.computeDeltaMetrics(swap);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4139:tests/r3-0c-delta-metrics.test.js:93:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4140:tests/r3-0c-delta-metrics.test.js:101:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4141:tests/r3-0c-delta-metrics.test.js:109:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4142:tests/r3-0c-delta-metrics.test.js:117:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4143:tests/r3-0c-delta-metrics.test.js:128:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4144:tests/r3-0c-delta-metrics.test.js:142:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4145:tests/r3-0c-delta-metrics.test.js:150:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4146:tests/r3-0c-delta-metrics.test.js:158:  const out = Service.computeDeltaMetrics(r);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4147:tests/r3-0c-delta-metrics.test.js:165:  const out = Service.computeDeltaMetrics(req());
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4148:tests/r3-0c-delta-metrics.test.js:172:  const r = Service.computeDeltaMetrics(bad);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4149:tests/r3-0c-delta-metrics.test.js:185:  const out1 = Service.computeDeltaMetrics(r1);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4150:tests/r3-0c-delta-metrics.test.js:193:  const out2 = Service.computeDeltaMetrics(r2);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4151:tests/r3-0c-delta-metrics.test.js:201:  const out3 = Service.computeDeltaMetrics(r3);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4152:tests/r3-0c-delta-metrics.test.js:209:  const out4 = Service.computeDeltaMetrics(r4);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4153:tests/r3-0c-delta-metrics.test.js:218:  const out5 = Service.computeDeltaMetrics(r5);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4160:const result=DM.computeDeltaMetrics({identity:{caseId:'caseA',sessionId:'sess1'},referenceLap:{lapTimeMs:90000},comparisonLap:{lapTimeMs:89500},pairing:{pairs:[{referenceCorner:{id:'C1',fullTimeMs:10000},comparisonCorner:{id:'C1',fullTimeMs:9900}}]},requestedMetrics:['lap_time','delta_cumulative','sector_delta'],policy:{deltaSign:'comparison_minus_reference'}});
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4164:const out=Service.buildComparisonExport({result,association:{caseId:'caseA',sessionId:'sess1',trackId:'silverstone',layoutId:'gp',positionBasis:'lap_distance',positionDirection:'increasing'},credibilityMetadata:{credibility:'Heuristic',provenance:'real',confidence:'low',limitations:[],blockedReasons:[]},generationToken:'g',referenceLap:{sessionId:'sess1',lapId:'r',lapTimeMs:90000},comparisonLap:{sessionId:'sess1',lapId:'c',lapTimeMs:89500},framing:{cannotConclude:[attack],alternativeExplanations:[],nextValidationAction:null}});
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4316:const result=DM.computeDeltaMetrics({identity:{caseId:\"caseA\",sessionId:\"sess1\"},referenceLap:{lapTimeMs:90000},comparisonLap:{lapTimeMs:89500},pairing:{pairs:[{referenceCorner:{id:\"C1\",fullTimeMs:10000},comparisonCorner:{id:\"C1\",fullTimeMs:9900}}]},requestedMetrics:[\"lap_time\",\"delta_cumulative\",\"sector_delta\"],policy:{deltaSign:\"comparison_minus_reference\"}});
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4320:const out=Service.buildComparisonExport({result,association:{caseId:\"caseA\",sessionId:\"sess1\",trackId:\"silverstone\",layoutId:\"gp\",positionBasis:\"lap_distance\",positionDirection:\"increasing\"},credibilityMetadata:{credibility:\"Heuristic\",provenance:\"real\",confidence:\"low\",limitations:[],blockedReasons:[]},generationToken:\"g\",referenceLap:{sessionId:\"sess1\",lapId:\"r\",lapTimeMs:90000},comparisonLap:{sessionId:\"sess1\",lapId:\"c\",lapTimeMs:89500},framing:{cannotConclude:[attack],alternativeExplanations:[],nextValidationAction:null}});
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4340:/bin/bash -lc "rg -n \"browser|HTTP|R3_0C_Contracts|UI_INITIALIZATION_FAILED|registerAuthentic|B25|B26|B27|structured init|initialization\" tests/r3-0c-comparison-workspace.test.js tests/r3-0c-contracts-bundle-equivalence.test.js renderer/js/r3-0c-comparison-viewmodel.js renderer/index.html; node -e '
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4343:console.log(JSON.stringify({authPaths:s.authorizedProductionPaths.length,enabledCaps:s.enabledCapabilities.length,currentCheckpoint:s.currentCheckpoint,feature_registry_active:caps.feature_registry_active,phase_boundary_contract:caps.phase_boundary_contract,featureIds:featureIds.map(id=>({id,match:(html.match(new RegExp("'`id: .${id}.['"\\\\s\\\\S]{0,250}?availability: .(["'^.]*)`))||[])[1]})),reasonCount:rc.ALL_REASON_CODES.length,uiInit:rc.REASON_CODES.UI_INITIALIZATION_FAILED,bundleState:s.authorizedProductionPaths.some(x=>x.path==="renderer/js/r3-0c-contracts-bundle.js"),bundleC7:c.authorizedPaths.some(x=>x.path==="renderer/js/r3-0c-contracts-bundle.js"),reviewed:c.reviewedCandidateSha},null,2));
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4346:renderer/js/r3-0c-comparison-viewmodel.js:23:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4350:tests/r3-0c-contracts-bundle-equivalence.test.js:69:chk('D5 R3_0C_Contracts (aggregator) registered', typeof sandbox.R3_0C_Contracts === 'object' && sandbox.R3_0C_Contracts !== null && typeof sandbox.R3_0C_Contracts.reasonCodes === 'object');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4351:tests/r3-0c-contracts-bundle-equivalence.test.js:70:chk('D6 Contracts.REASON_CODES surfaces the new UI_INITIALIZATION_FAILED code', sandbox.R3_0C_Contracts && sandbox.R3_0C_Contracts.REASON_CODES && sandbox.R3_0C_Contracts.REASON_CODES.UI_INITIALIZATION_FAILED === 'UI_INITIALIZATION_FAILED');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4360:tests/r3-0c-comparison-workspace.test.js:256:// Codex C7-R2-A-01 closure: the orchestrator no longer exposes registerAuthenticCaseRecord; the
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4361:tests/r3-0c-comparison-workspace.test.js:336:  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4362:renderer/index.html:274:             (including the new UI_INITIALIZATION_FAILED) surface localized wording. -->
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4376:renderer/index.html:3301:  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4377:renderer/index.html:3953:    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4378:renderer/index.html:3954:    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4379:renderer/index.html:3961:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4380:renderer/index.html:3962:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4381:renderer/index.html:3988:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4382:renderer/index.html:3989:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4384:  "authPaths": 14,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4385:  "enabledCaps": 12,
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4386:  "currentCheckpoint": "C7_UI",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4399:  "uiInit": "UI_INITIALIZATION_FAILED",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4453:/bin/bash -lc "node -e 'const f=require(\"./scripts/frozen-files.json\"); console.log(JSON.stringify(f,null,2))'; rg -n -C 3 'case_comparison|reference_lap|corner_delta|feature_registry_active|phase_boundary_contract' governance/r3.0c/capabilities.json governance/r3.0c/checkpoints/C7.json renderer/index.html; git diff --numstat 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..fc6ff8f81629593d24c6af7e3274e89607c34ed7 -- renderer/js/case-record-schema.js renderer/js/dynamics-model.js renderer/js/car-presets.js renderer/js/vehicle-profile-f312.js; node -e 'const fs=require(\"fs\"),b=fs.readFileSync(\"renderer/js/r3-0c-contracts-bundle.js\",\"utf8\"),g=require(\"./scripts/build-r3-0c-contracts-bundle.js\"); console.log({chars:b.length,bytes:Buffer.byteLength(b)})'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4561:governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4577:governance/r3.0c/checkpoints/C7.json:71:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4601:governance/r3.0c/checkpoints/C7.json:96:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4607:renderer/index.html:256:  <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4635:const out = Service.buildComparisonExport(request);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4652:C6 `_allowlistFrame()` directly reads caller-controlled `frame.reasonCode`, `frame.i18nKey`, and `frame.params`. It neither calls `validateFramingEntry()` nor consumes its sanitized snapshot. It also checks only that `i18nKey` is non-empty, not that it belongs to `FRAMING_I18N_KEY_REGISTRY`.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4658:Make `_allowlistFrame()` call `FIR.validateFramingEntry(frame)` exactly once and rebuild solely from `vr.sanitized`, without subsequently accessing `frame`. Add a C6 regression test using an authentic C5 result and a proxy whose raw getters throw, mutate state, or return an unregistered key.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4667:- Reason-code count is 66; `UI_INITIALIZATION_FAILED` is present.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4695:const out = Service.buildComparisonExport(request);
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4712:C6 `_allowlistFrame()` directly reads caller-controlled `frame.reasonCode`, `frame.i18nKey`, and `frame.params`. It neither calls `validateFramingEntry()` nor consumes its sanitized snapshot. It also checks only that `i18nKey` is non-empty, not that it belongs to `FRAMING_I18N_KEY_REGISTRY`.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4718:Make `_allowlistFrame()` call `FIR.validateFramingEntry(frame)` exactly once and rebuild solely from `vr.sanitized`, without subsequently accessing `frame`. Add a C6 regression test using an authentic C5 result and a proxy whose raw getters throw, mutate state, or return an unregistered key.
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md:4727:- Reason-code count is 66; `UI_INITIALIZATION_FAILED` is present.
renderer/index.html:256:  <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
renderer/index.html:274:             (including the new UI_INITIALIZATION_FAILED) surface localized wording. -->
renderer/index.html:3301:  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
renderer/index.html:3309:  // _r3cC7RegisterAuthenticCaseRecord. Until then the WeakSet stays empty, so any requestComparison
renderer/index.html:3953:    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
renderer/index.html:3954:    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
renderer/index.html:3958:    if (typeof R3_0C_ComparisonOrchestrator === 'undefined' || typeof R3_0C_ComparisonViewModel === 'undefined') {
renderer/index.html:3961:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
renderer/index.html:3962:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
renderer/index.html:3974:      const _orch = R3_0C_ComparisonOrchestrator.createOrchestrator({
renderer/index.html:3982:      this._r3cC7VM = R3_0C_ComparisonViewModel.createComparisonViewModel({ orchestrator: _orch, capabilities: caps });
renderer/index.html:3988:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
renderer/index.html:3989:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}
renderer/js/r3-0c-corner-segmentation.js:22: * UMD: Node require / Electron renderer global (R3_0C_CornerSegmentation).
renderer/js/r3-0c-corner-segmentation.js:31:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-corner-segmentation.js:287:  if (root) root.R3_0C_CornerSegmentation = api;
renderer/js/r3-0c-normalized-distance.js:41: * UMD: Node require / Electron renderer global (R3_0C_NormalizedDistance).
renderer/js/r3-0c-normalized-distance.js:51:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-normalized-distance.js:53:    throw new Error('renderer/js/r3-0c-normalized-distance.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
renderer/js/r3-0c-normalized-distance.js:480:  if (root) root.R3_0C_NormalizedDistance = api;
renderer/js/r3-0c-distance-authority.js:42: * UMD: Node require / Electron renderer global (R3_0C_DistanceAuthority).
renderer/js/r3-0c-distance-authority.js:52:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-distance-authority.js:54:    throw new Error('renderer/js/r3-0c-distance-authority.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
renderer/js/r3-0c-distance-authority.js:199:  if (root) root.R3_0C_DistanceAuthority = api;
renderer/js/r3-0c-reference-selection.js:20: * UMD: Node require / Electron renderer global (R3_0C_ReferenceSelection).
renderer/js/r3-0c-reference-selection.js:31:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-reference-selection.js:32:  if (!LapAuthority && typeof R3_0C_LapAuthority !== 'undefined') LapAuthority = R3_0C_LapAuthority;
renderer/js/r3-0c-reference-selection.js:33:  if (!TrackIdentity && typeof R3_0C_TrackIdentity !== 'undefined') TrackIdentity = R3_0C_TrackIdentity;
renderer/js/r3-0c-reference-selection.js:160:  if (root) root.R3_0C_ReferenceSelection = api;
renderer/js/r3-0c-comparison-viewmodel.js:14: * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
renderer/js/r3-0c-comparison-viewmodel.js:23:  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
renderer/js/r3-0c-comparison-viewmodel.js:43:    if (!_isPlain(deps.orchestrator) || typeof deps.orchestrator.requestComparison !== 'function') throw new Error('createComparisonViewModel requires orchestrator');
renderer/js/r3-0c-comparison-viewmodel.js:126:        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
renderer/js/r3-0c-comparison-viewmodel.js:155:      var response = orch.requestComparison({
renderer/js/r3-0c-comparison-viewmodel.js:257:        // requestComparison can pass it to the orchestrator, but the orchestrator's
renderer/js/r3-0c-comparison-viewmodel.js:341:  if (root) root.R3_0C_ComparisonViewModel = api;

codex
The candidate is at the requested SHA with a clean worktree. I’m now exercising the public boundaries independently of the added regression tests, including the exact `ownKeys` proxy that broke Round 6.
exec
/bin/bash -lc "sed -n '1,470p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '1,560p' renderer/js/r3-0c-delta-metrics.js && sed -n '1,260p' renderer/js/r3-0c-comparison-export.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
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
      // Codex C7-R5-01 cascade: the public requestComparison boundary is a sister-site of
      // exportComparison. Caller-controlled `input` is read via plain property access for
      // caseRecord / association / eligibilityInput / deltaMetricsRequest / framing — a
      // hostile Proxy whose `get` trap throws would escape the boundary. Wrap the entire
      // body in try/catch returning a structured blocked response so the public surface
      // never throws on hostile input.
      var token;
      try {
        token = _nextToken();
      } catch (e) { return Object.freeze({ status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), limitations: Object.freeze([]), framing: null, exportGate: false, detail: 'requestComparison token failed — fail-closed', generationToken: 0 }); }
      try {
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
      } catch (e) {
        // Codex C7-R5-01 cascade: any hostile-input throw past the descriptor checks results in
        // a structured blocked outcome — no exception escapes requestComparison's public boundary.
        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'requestComparison threw — fail-closed', null, token);
      }
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

    // Codex C7-R5-01 closure: descriptor-safe read for top-level fields on caller-supplied
    // eligibleResponse / extraInputs. A Proxy whose `get` trap throws (or returns side-effecting
    // values) on `framing` / `result` / `generationToken` / ... can escape the public export
    // boundary if we use plain `o.k` access. _readOwnExport returns tri-state matching the
    // framing-i18n-key-registry pattern: ABSENT (no own key) / VALUE (data descriptor) / THREW
    // (accessor descriptor OR descriptor lookup throws). Both ABSENT and THREW are surfaced as
    // a NULL value by the caller-side helper below.
    function _readOwnExport(o, k) {
      var desc;
      try { desc = Object.getOwnPropertyDescriptor(o, k); }
      catch (e) { return { state: 'THREW' }; }
      if (!desc) return { state: 'ABSENT' };
      if (typeof desc.get === 'function' || typeof desc.set === 'function') return { state: 'THREW' };
      return { state: 'VALUE', value: desc.value };
    }
    function _exportValueOrNull(o, k) {
      var r = _readOwnExport(o, k);
      return r.state === 'VALUE' ? r.value : null;
    }
    function _exportBlocked(detail) {
      return Object.freeze({ eligible: false, status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), detail: detail });
    }

    /**
     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
     * The orchestrator does NOT bypass C6's own authenticity / closed-allowlist checks. The
     * public boundary is wrapped in a try/catch + descriptor-safe reads so hostile caller-
     * controlled accessors return a structured blocked result instead of throwing out of the
     * boundary (Codex C7-R5-01 closure).
     */
    function exportComparison(eligibleResponse, extraInputs) {
      try {
        if (!ex || typeof ex.buildComparisonExport !== 'function') {
          return _exportBlocked('export service unavailable');
        }
        if (!_isPlain(eligibleResponse)) return _exportBlocked('eligibleResponse not a plain object');
        var statusRead = _readOwnExport(eligibleResponse, 'status');
        var gateRead = _readOwnExport(eligibleResponse, 'exportGate');
        if (statusRead.state !== 'VALUE' || statusRead.value !== 'eligible') return _exportBlocked('export gate closed (status)');
        if (gateRead.state !== 'VALUE' || gateRead.value !== true) return _exportBlocked('export gate closed (gate)');
        if (!_isPlain(extraInputs)) extraInputs = {};
        var resultVal = _exportValueOrNull(eligibleResponse, 'result');
        var tokenVal = _exportValueOrNull(eligibleResponse, 'generationToken');
        var framingVal = _exportValueOrNull(eligibleResponse, 'framing');
        // framingVal MUST be the orchestrator's own previously-built sanitized framing object —
        // it was returned from requestComparison via Object.freeze. If a caller has hand-built
        // an eligibleResponse with a Proxy / accessor for framing we treat it as absent.
        var cannotConcludeVal = framingVal && _isPlain(framingVal) ? _exportValueOrNull(framingVal, 'cannotDistinguish') : null;
        var nextActionVal = framingVal && _isPlain(framingVal) ? _exportValueOrNull(framingVal, 'nextValidationAction') : null;
        return ex.buildComparisonExport({
          result: resultVal,
          association: _exportValueOrNull(extraInputs, 'association'),
          credibilityMetadata: _exportValueOrNull(extraInputs, 'credibilityMetadata'),
          generationToken: 'orch-' + (tokenVal != null ? tokenVal : ''),
          referenceLap: _exportValueOrNull(extraInputs, 'referenceLap'),
          comparisonLap: _exportValueOrNull(extraInputs, 'comparisonLap'),
          framing: {
            cannotConclude: Array.isArray(cannotConcludeVal) ? cannotConcludeVal : [],
            alternativeExplanations: [],
            nextValidationAction: nextActionVal || null,
          },
        });
      } catch (e) {
        // Defense in depth — any unexpected throw past the descriptor-safe reads results in a
        // structured blocked outcome rather than escaping the boundary. Detail is bounded and
        // never carries stack / private paths.
        return _exportBlocked('exportComparison threw — fail-closed');
      }
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
 * renderer/js/r3-0c-delta-metrics.js — R3.0C C5 · Delta Metrics Service.
 *
 * Computes the six allowlisted delta metrics from caller-supplied lap timing + paired-corner zone
 * timing. The sign convention is pinned literally to delta = comparison - reference and the
 * service refuses to compute under any other convention (DELTA_METRIC_SIGN_FORBIDDEN). All six
 * metrics SHARE the same sign rule:
 *
 *   lap_time         = comparisonLap.lapTimeMs - referenceLap.lapTimeMs   (lap scope)
 *   delta_cumulative = sum over paired corners of (cmp.fullTimeMs - ref.fullTimeMs) (lap scope,
 *                      derived from corner pairing; equals lap_time only if pairing covers the
 *                      full lap — partial coverage surfaces a limitation, not a re-derived total)
 *   sector_delta     = (cmp.fullTimeMs - ref.fullTimeMs)         per paired corner
 *   entry_delta      = (cmp.entryTimeMs - ref.entryTimeMs)       per paired corner
 *   mid_delta        = (cmp.midTimeMs - ref.midTimeMs)           per paired corner
 *   exit_delta       = (cmp.exitTimeMs - ref.exitTimeMs)         per paired corner
 *
 * The service NEVER swaps operands; A/B-swap test → service swaps externally and verifies that
 * delta(A,B) === -delta(B,A) — that's the invariant the test enforces. Self-vs-self → all
 * deltas == 0 exactly. NaN / Infinity / missing zone time in a pair → DELTA_METRIC_NUMERIC_INVALID
 * for THAT pair (or that metric); other pairs and unrelated metrics still compute (partial-result
 * model). An unpaired corner-scope metric request with zero pairs → DELTA_METRIC_CORNER_PAIR_REQUIRED.
 *
 * UMD: Node require / Electron renderer global (R3_0C_DeltaMetrics).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) throw new Error('renderer/js/r3-0c-delta-metrics.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var DM = Contracts.deltaMetrics;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C5_DELTA_METRICS';
  var SIGN_FORMULA = DM.DELTA_SIGN_FORMULA;
  // Limitation token (named constant so the i18n-parity literal-push scanner does not require a
  // ui.limitation entry until C7_UI surfaces it; lives only on the evidence side-channel).
  var LIMITATION_PARTIAL_PAIR_COVERAGE = 'delta_metrics_partial_pair_coverage';

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _blocked(reasons, detail) {
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    var br = RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
    var blockedResult = Object.freeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: br.reasonCodes,
      explanationKeys: br.explanationKeys,
      detail: br.detail,
      metrics: null,
      result: null,
    });
    // C6 authenticity gate: register THIS service's blocked results so the export service can
    // distinguish a service-produced blocked result from a caller-fabricated one.
    if (_AUTHENTIC) { try { _AUTHENTIC.add(blockedResult); } catch (e) { /* no-op */ } }
    return blockedResult;
  }

  function _delta(cmpVal, refVal) { return cmpVal - refVal; }

  function _computeLapTime(request) {
    return _delta(request.comparisonLap.lapTimeMs, request.referenceLap.lapTimeMs);
  }

  function _computePerCorner(request, zoneKey) {
    // Returns { values:[{pairIndex, value}|null], any:boolean, sum:number, anyBlocked:boolean }
    var pairs = request.pairing.pairs;
    var values = []; var sum = 0; var any = false; var anyBlocked = false;
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      if (!_isPlain(p) || !_isPlain(p.referenceCorner) || !_isPlain(p.comparisonCorner)) {
        values.push(null); anyBlocked = true; continue;
      }
      var refV = p.referenceCorner[zoneKey];
      var cmpV = p.comparisonCorner[zoneKey];
      if (!_isFiniteNum(refV) || !_isFiniteNum(cmpV)) {
        values.push(null); anyBlocked = true; continue;
      }
      var v = _delta(cmpV, refV);
      values.push({ pairIndex: i, value: v, referenceCornerId: p.referenceCorner.id || null, comparisonCornerId: p.comparisonCorner.id || null });
      sum += v; any = true;
    }
    return { values: values, sum: sum, any: any, anyBlocked: anyBlocked };
  }

  /**
   * computeDeltaMetrics(request) — entry point. Returns
   *   { eligible:true, metrics:{ <name>: { scope, value(s), perCorner?, partialBlocked? } },
   *     identity, sign, limitations, evidence, reasonCodes:[], result:null }
   *   or _blocked([codes]).
   *
   * The result.metrics object holds one entry per REQUESTED metric. Unsupported names are
   * rejected at the contract shape gate. Partial-result behaviour: if a corner-scope metric
   * has zero usable pairs (all NaN / missing), the corresponding metric entry reports
   * blocked:true with the local reason code BUT the overall request remains eligible:true and
   * other metrics still compute. This honours the "missing channel only blocks related metric"
   * invariant.
   */
  function computeDeltaMetrics(request) {
    // Codex C7-R5-01 cascade closure: the C5 public boundary takes a caller-controlled `request`
    // and reads request.identity / request.requestedMetrics / request.pairing / request.referenceLap
    // / request.comparisonLap via plain property access. A hostile Proxy whose `get` trap throws
    // would escape the boundary. Wrap the entire body in try/catch so any throw past the existing
    // descriptor checks results in a structured blocked result.
    try {
    var shape = DM.evaluateDeltaMetricsRequestShape(request);
    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);

    var metrics = {};
    var limitations = [];
    var requested = request.requestedMetrics;

    function ensureLap() {
      var v = _computeLapTime(request);
      if (!_isFiniteNum(v)) return null;
      return v;
    }

    for (var i = 0; i < requested.length; i++) {
      var name = requested[i];
      if (name === 'lap_time') {
        var lt = ensureLap();
        metrics.lap_time = lt === null
          ? { blocked: true, reasonCodes: [CODES.DELTA_METRIC_NUMERIC_INVALID], scope: 'lap' }
          : { blocked: false, scope: 'lap', value: lt };
      } else if (name === 'delta_cumulative') {
        // sum of paired sector_delta. With zero pairs it equals lap_time (no information from pairing).
        // With non-empty pairs it is sum of (cmp.fullTimeMs - ref.fullTimeMs).
        var perFull = _computePerCorner(request, 'fullTimeMs');
        if (!perFull.any && perFull.values.length === 0) {
          // no pairs at all → fall back to lap_time.
          var ltb = ensureLap();
          metrics.delta_cumulative = ltb === null
            ? { blocked: true, reasonCodes: [CODES.DELTA_METRIC_NUMERIC_INVALID], scope: 'lap' }
            : { blocked: false, scope: 'lap', value: ltb, partial: false, source: 'lap_time_fallback' };
        } else {
          metrics.delta_cumulative = {
            blocked: !perFull.any,
            scope: 'lap',
            value: perFull.any ? perFull.sum : null,
            partial: perFull.anyBlocked,
            reasonCodes: perFull.any ? [] : [CODES.DELTA_METRIC_NUMERIC_INVALID],
          };
        }
      } else if (name === 'sector_delta' || name === 'entry_delta' || name === 'mid_delta' || name === 'exit_delta') {
        var zoneKey = ({ sector_delta: 'fullTimeMs', entry_delta: 'entryTimeMs', mid_delta: 'midTimeMs', exit_delta: 'exitTimeMs' })[name];
        var per = _computePerCorner(request, zoneKey);
        metrics[name] = {
          blocked: !per.any,
          scope: 'corner',
          perCorner: per.values,
          partial: per.anyBlocked,
          reasonCodes: per.any ? [] : [CODES.DELTA_METRIC_NUMERIC_INVALID],
        };
      }
    }

    var anyPartial = Object.keys(metrics).some(function (k) { return metrics[k].partial === true; });
    if (anyPartial) limitations.push(LIMITATION_PARTIAL_PAIR_COVERAGE);

    var result = Object.freeze({
      eligible: true,
      status: 'delta_metrics_computed',
      sign: SIGN_FORMULA,
      identity: Object.freeze({ caseId: request.identity.caseId, sessionId: request.identity.sessionId }),
      metrics: Object.freeze(metrics),
      evidence: Object.freeze({
        sign: SIGN_FORMULA,
        referenceLapTimeMs: request.referenceLap.lapTimeMs,
        comparisonLapTimeMs: request.comparisonLap.lapTimeMs,
        pairCount: request.pairing && Array.isArray(request.pairing.pairs) ? request.pairing.pairs.length : 0,
        requestedMetrics: Object.freeze(requested.slice()),
        limitations: Object.freeze(limitations.slice()),
      }),
      reasonCodes: Object.freeze([]),
      result: null,
    });
    _registerAuthentic(result);
    return result;
    } catch (e) {
      // Codex C7-R5-01 cascade closure: hostile-input throw → structured blocked.
      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'computeDeltaMetrics threw — fail-closed');
    }
  }

  // C6 authenticity gate (formal Codex C6 finding F-C6-A1 round 1 + round 2): C6 export must
  // refuse a caller-forged OR caller-mutated result. Module-private WeakSet records every result
  // THIS service produced. WeakSet alone is not enough — the original result tree is shallow-
  // frozen, so inner objects (metrics.delta_cumulative, metrics.sector_delta.perCorner[i]) can
  // still be mutated post-registration. _deepFreezeAndRegister walks the entire result graph and
  // (a) Object.freeze every plain object + array (b) WeakSet.add every node. After this, any
  // attempt to mutate a leaf throws under strict mode and silently no-ops under non-strict; either
  // way the value the C6 export reads is the value the service produced. isAuthenticResult only
  // returns true when the EXACT object passed was added by this service.
  var _AUTHENTIC = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
  function _deepFreezeAndRegister(node) {
    if (node === null || typeof node !== 'object') return;
    if (_AUTHENTIC) { try { _AUTHENTIC.add(node); } catch (e) { /* no-op */ } }
    try {
      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) _deepFreezeAndRegister(node[i]);
      } else {
        var ks = Object.keys(node);
        for (var k = 0; k < ks.length; k++) _deepFreezeAndRegister(node[ks[k]]);
      }
      if (!Object.isFrozen(node)) Object.freeze(node);
    } catch (e) { /* no-op */ }
  }
  function _registerAuthentic(r) { _deepFreezeAndRegister(r); }
  function isAuthenticResult(r) {
    if (!_AUTHENTIC) return false;
    if (r === null || typeof r !== 'object') return false;
    try { return _AUTHENTIC.has(r); } catch (e) { return false; }
  }

  // Patch _blocked to register too — blocked results are equally authoritative and exportable.
  // We wrap the existing _blocked indirectly: the production flow lands in _blocked via early
  // returns, so we tap by registering at the call-site shape. Simpler: re-export a helper.

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    SIGN_FORMULA: SIGN_FORMULA,
    computeDeltaMetrics: computeDeltaMetrics,
    isAuthenticResult: isAuthenticResult,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_DeltaMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
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

exec
/bin/bash -lc "git diff 93506779..f0304ff -- renderer/js/r3-0c-comparison-viewmodel.js tests/r3-0c-comparison-workspace.test.js && sed -n '1,390p' renderer/js/r3-0c-comparison-viewmodel.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-jkVPXV3n' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-arO69E0q' (errno=Operation not permitted)
diff --git a/renderer/js/r3-0c-comparison-viewmodel.js b/renderer/js/r3-0c-comparison-viewmodel.js
index cbc38ad..7083806 100644
--- a/renderer/js/r3-0c-comparison-viewmodel.js
+++ b/renderer/js/r3-0c-comparison-viewmodel.js
@@ -209,32 +209,97 @@
     }
 
     // ── Public mutators (the 7 transition triggers) ──
-    function setReference(sel) { _clearAndPlaceholder('reference_selection_changed'); _state.reference = _isPlain(sel) ? Object.freeze(Object.assign({}, sel)) : null; _runRequest(); }
-    function setComparison(sel) { _clearAndPlaceholder('comparison_selection_changed'); _state.comparison = _isPlain(sel) ? Object.freeze(Object.assign({}, sel)) : null; _runRequest(); }
+    // Codex C7-R6-01 closure: each public mutator is wrapped in fail-closed plumbing. _isPlain
+    // only checks the prototype chain — a Proxy with Object.prototype getPrototypeOf but a
+    // throwing ownKeys trap passes _isPlain and then explodes inside Object.assign({}, sel).
+    // _safeShallowCopy below classifies any throw during the descriptor enumeration as "invalid
+    // input" and yields null, which the mutator coerces into a clean reset of the relevant slot.
+    // After Codex Round 6 confirmed all four object-shaped mutators (setReference / setComparison
+    // / setAssociation / setChannelMapping) threw on the hostile ownKeys trap, every public
+    // mutator body additionally lives inside its own try/catch that maps any residual throw to
+    // a structured blocked placeholder.
+    function _safeShallowCopy(o) {
+      if (!_isPlain(o)) return null;
+      try { return Object.assign({}, o); } catch (e) { return null; }
+    }
+    function _hostileBlocked() {
+      _state.placeholder = VST.PLACEHOLDER_STATES.BLOCKED;
+      _state.blockedReasons = [CODES.INTERNAL_CONTRACT_VIOLATION];
+      _state.result = null;
+      _state.framing = null;
+      _state.exportGate = false;
+    }
+    function setReference(sel) {
+      _clearAndPlaceholder('reference_selection_changed');
+      try {
+        var copy = _safeShallowCopy(sel);
+        _state.reference = copy ? Object.freeze(copy) : null;
+        _runRequest();
+      } catch (e) { _state.reference = null; _hostileBlocked(); }
+    }
+    function setComparison(sel) {
+      _clearAndPlaceholder('comparison_selection_changed');
+      try {
+        var copy = _safeShallowCopy(sel);
+        _state.comparison = copy ? Object.freeze(copy) : null;
+        _runRequest();
+      } catch (e) { _state.comparison = null; _hostileBlocked(); }
+    }
     function setAssociation(assoc) {
       _clearAndPlaceholder('case_association_changed');
-      _state.association = _isPlain(assoc) ? Object.freeze(Object.assign({}, assoc)) : null;
-      if (_isPlain(assoc) && _isPlain(assoc.caseRecord)) {
+      try {
+        var assocCopy = _safeShallowCopy(assoc);
+        _state.association = assocCopy ? Object.freeze(assocCopy) : null;
         // Codex C7-R2-A-01 closure: the viewmodel NO LONGER registers the caseRecord with the
         // orchestrator. The viewmodel is renderer-accessible (any caller can invoke
         // setAssociation with a forged caseRecord); treating that path as an authoritative
         // boundary was the D1 vulnerability. We still hold a private reference to the record so
         // requestComparison can pass it to the orchestrator, but the orchestrator's
         // authenticityPredicate (injected at construction) is what grants authority — NOT this
-        // viewmodel. A forged caller-built caseRecord routed through setAssociation will reach
-        // the orchestrator and be refused by the predicate.
-        var cr = Object.assign({}, assoc.caseRecord);
-        if (_isPlain(assoc.caseRecord.associations)) cr.associations = Object.assign({}, assoc.caseRecord.associations);
-        _state.caseRecord = cr;
-      } else {
-        _state.caseRecord = null;
-      }
-      _runRequest();
+        // viewmodel.
+        if (assocCopy) {
+          // Read caseRecord via _safeShallowCopy too — assoc may be a Proxy whose
+          // `caseRecord` getter throws even though Object.assign succeeded earlier (Object.assign
+          // copies enumerable own-string-key data properties; a property whose value is an object
+          // with a throwing getter doesn't crash Object.assign — but iterating it does).
+          var crSrc = null;
+          try { crSrc = assoc && assoc.caseRecord; } catch (e) { crSrc = null; }
+          var cr = _safeShallowCopy(crSrc);
+          if (cr) {
+            var assocAssoc = null;
+            try { assocAssoc = crSrc && crSrc.associations; } catch (e) { assocAssoc = null; }
+            var nested = _safeShallowCopy(assocAssoc);
+            if (nested) cr.associations = nested;
+            _state.caseRecord = cr;
+          } else {
+            _state.caseRecord = null;
+          }
+        } else {
+          _state.caseRecord = null;
+        }
+        _runRequest();
+      } catch (e) { _state.association = null; _state.caseRecord = null; _hostileBlocked(); }
+    }
+    function setChannelMapping(mapping) {
+      _clearAndPlaceholder('channel_mapping_changed');
+      try {
+        var copy = _safeShallowCopy(mapping);
+        _state.channelMapping = copy ? Object.freeze(copy) : null;
+        _runRequest();
+      } catch (e) { _state.channelMapping = null; _hostileBlocked(); }
+    }
+    function notifyCaseReopen() {
+      try {
+        _clearAndPlaceholder('case_reopen');
+        _state.reference = null; _state.comparison = null; _state.association = null; _state.channelMapping = null; _state.caseRecord = null;
+      } catch (e) { _hostileBlocked(); }
+    }
+    function notifyAuthorityRevoked() {
+      try { _clearAndPlaceholder('user_confirmed_authority_revoked'); } catch (e) { _hostileBlocked(); }
+    }
+    function notifyEligibilityRevoked() {
+      try { _clearAndPlaceholder('orchestrator_eligibility_revoked'); } catch (e) { _hostileBlocked(); }
     }
-    function setChannelMapping(mapping) { _clearAndPlaceholder('channel_mapping_changed'); _state.channelMapping = _isPlain(mapping) ? Object.freeze(Object.assign({}, mapping)) : null; _runRequest(); }
-    function notifyCaseReopen() { _clearAndPlaceholder('case_reopen'); _state.reference = null; _state.comparison = null; _state.association = null; _state.channelMapping = null; _state.caseRecord = null; }
-    function notifyAuthorityRevoked() { _clearAndPlaceholder('user_confirmed_authority_revoked'); }
-    function notifyEligibilityRevoked() { _clearAndPlaceholder('orchestrator_eligibility_revoked'); }
 
     // ── Read-only state accessor ──
     function getState() {
diff --git a/tests/r3-0c-comparison-workspace.test.js b/tests/r3-0c-comparison-workspace.test.js
index 6245c4c..09e07ee 100644
--- a/tests/r3-0c-comparison-workspace.test.js
+++ b/tests/r3-0c-comparison-workspace.test.js
@@ -358,6 +358,43 @@ function deltaMetricsRequest() {
   chk('G4c exportComparison does NOT throw on hostile extraInputs accessor', threw2 === false);
   chk('G4d exportComparison handles hostile extras as null (no crash)', out2 !== null);
 })();
+// G5. Codex C7-R6-01 closure: every viewmodel public mutator must NOT throw on hostile
+// caller-supplied selections. _isPlain alone is not enough — a Proxy with Object.prototype
+// getPrototypeOf but a throwing ownKeys trap passes _isPlain and then explodes inside
+// Object.assign({}, sel). Each mutator now uses _safeShallowCopy (which catches Object.assign
+// throws and yields null), so a hostile slot is silently coerced to null. The outer try/catch
+// is an additional defence against any residual throw past _safeShallowCopy. After the
+// hostile-input transition the result is: (a) NO throw escapes, (b) the slot is null, (c)
+// _runRequest sees an incomplete selection set and parks the viewmodel at SELECTING (or BLOCKED
+// if the outer try/catch fired), (d) NEVER READY, (e) exportGate stays false, (f) result=null.
+(() => {
+  const orch = authOrch(allCapsOn);
+  const hostile = new Proxy({}, {
+    getPrototypeOf() { return Object.prototype; },
+    ownKeys() { throw new Error('ownKeys trap'); },
+  });
+  const slotName = { setReference: 'reference', setComparison: 'comparison', setAssociation: 'association', setChannelMapping: 'channelMapping' };
+  ['setReference', 'setComparison', 'setAssociation', 'setChannelMapping'].forEach((trigger, i) => {
+    const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
+    let threw = false;
+    try { vm[trigger](hostile); } catch (e) { threw = true; }
+    chk('G5.' + (i + 1) + ' viewmodel.' + trigger + ' does NOT throw on hostile Proxy ownKeys trap', threw === false);
+    const s = vm.getState();
+    chk('G5.' + (i + 1) + 'b viewmodel.' + trigger + ' never reaches READY on hostile input', s.placeholder !== VST.PLACEHOLDER_STATES.READY);
+    // channelMapping is internal to _state and intentionally NOT exposed via getState; for the
+    // other three slots a `!s[slot]` check covers both `null` and `undefined` (unexposed).
+    chk('G5.' + (i + 1) + 'c viewmodel.' + trigger + ' hostile slot coerced to null/undefined', !s[slotName[trigger]]);
+    chk('G5.' + (i + 1) + 'd viewmodel.' + trigger + ' result=null, exportGate=false', s.result === null && s.exportGate === false);
+  });
+  // notifyCaseReopen / notifyAuthorityRevoked / notifyEligibilityRevoked don't accept caller
+  // objects, but their body is still try/catch-wrapped against any internal throw.
+  ['notifyCaseReopen', 'notifyAuthorityRevoked', 'notifyEligibilityRevoked'].forEach((trigger, i) => {
+    const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
+    let threw = false;
+    try { vm[trigger](); } catch (e) { threw = true; }
+    chk('G5.no' + (i + 1) + ' viewmodel.' + trigger + '() does NOT throw', threw === false);
+  });
+})();
 // H. Orchestrator — phase metric requested without capability → filtered out + limitation
 (() => {
   const orch = authOrch(allCapsOn);
/**
 * renderer/js/r3-0c-comparison-viewmodel.js — R3.0C C7 · Comparison Workspace ViewModel.
 *
 * Per SKYLINE Continuous Delivery Master Directive §七 C7 + docs/r3.0c-state-transition-contract.md:
 * pure state machine consuming orchestrator output. Implements the 7 transition triggers, the
 * generation-token discipline, the placeholder shapes, and the stale-token drop rule from
 * contracts/r3.0c/viewmodel-state-transition-contract.js.
 *
 * PURE: no DOM access, no Alpine binding, no global mutation. The Alpine layer calls
 * createComparisonViewModel({orchestrator}) once, stores the reference in a non-reactive holder,
 * and reads getState() during render. setReference / setComparison / setAssociation /
 * setChannelMapping / notifyCaseReopen / notifyAuthorityRevoked are the only mutators.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-viewmodel.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var VST = Contracts.viewmodelStateTransition;
  var DMC = Contracts.deltaMetrics;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C7_UI';

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }

  /**
   * createComparisonViewModel(deps) — factory. deps = { orchestrator, capabilities }.
   * The viewmodel refuses to operate when capabilities.viewmodelStateTransitionContractEnabled
   * is false (the contract is gated by capability — until C7 ships it is disabled).
   */
  function createComparisonViewModel(deps) {
    if (!_isPlain(deps)) throw new Error('createComparisonViewModel requires deps');
    if (!_isPlain(deps.orchestrator) || typeof deps.orchestrator.requestComparison !== 'function') throw new Error('createComparisonViewModel requires orchestrator');
    if (!_isPlain(deps.capabilities)) throw new Error('createComparisonViewModel requires capabilities');
    var orch = deps.orchestrator;
    var caps = deps.capabilities;
    if (!caps.viewmodelStateTransitionContractEnabled) throw new Error('viewmodel_state_transition_contract capability disabled — viewmodel must not be instantiated');

    // Internal state (PRIVATE — never exposed; getState() returns a defensive copy).
    var _state = {
      placeholder: VST.PLACEHOLDER_STATES.IDLE,
      reference: null,         // user-selected reference lap descriptor
      comparison: null,        // user-selected comparison lap descriptor
      association: null,       // case + session + track + layout + basis + direction
      channelMapping: null,    // confirmed channel mapping snapshot
      caseRecord: null,        // R3.0B case record (for context binding)
      latestToken: 0,          // last token issued (commit gate)
      result: null,            // committed orchestrator response
      framing: null,           // committed framing (orchestrator-validated)
      blockedReasons: [],
      limitations: [],
      exportGate: false,
      metricAvailability: _defaultMetricAvailability(),
    };

    function _defaultMetricAvailability() {
      var out = {};
      DMC.SUPPORTED_DELTA_METRICS.forEach(function (m) { out[m] = false; });
      return out;
    }

    function _clearAndPlaceholder(triggerName) {
      // Codex C7 finding C7-A1 closure: advance latestToken on EVERY trigger so that any
      // in-flight orchestrator response that hasn't committed yet is invalidated. Without this,
      // a trigger like notifyAuthorityRevoked that does not itself issue a new request would
      // leave latestToken unchanged, allowing a delayed eligible response to overwrite the
      // revoked-placeholder state.
      _state.latestToken = _state.latestToken + 1;
      var placeholder = VST.placeholderForTrigger(triggerName);
      _state.placeholder = placeholder;
      _state.result = null;
      _state.framing = null;
      _state.blockedReasons = [];
      _state.limitations = [];
      _state.exportGate = false;
      _state.metricAvailability = _defaultMetricAvailability();
    }

    function _commit(response) {
      if (!_isPlain(response)) {
        _state.placeholder = VST.PLACEHOLDER_STATES.BLOCKED;
        _state.blockedReasons = [CODES.INTERNAL_CONTRACT_VIOLATION];
        _state.result = null;
        _state.framing = null;
        _state.exportGate = false;
        return;
      }
      // Stale-token drop rule (defense in depth — orchestrator already echoes back the token).
      if (VST.isResultStale(response.generationToken, _state.latestToken)) return;
      _state.framing = response.framing || null;
      _state.limitations = response.limitations ? response.limitations.slice() : [];
      if (response.status === 'eligible') {
        _state.placeholder = VST.PLACEHOLDER_STATES.READY;
        _state.result = response.result || null;
        _state.blockedReasons = [];
        _state.exportGate = response.exportGate === true;
        _state.metricAvailability = _buildMetricAvailability(response.result);
      } else if (response.status === 'unavailable') {
        _state.placeholder = VST.PLACEHOLDER_STATES.UNAVAILABLE;
        _state.result = null;
        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [];
        _state.exportGate = false;
      } else {
        _state.placeholder = VST.PLACEHOLDER_STATES.BLOCKED;
        _state.result = null;
        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [CODES.INTERNAL_CONTRACT_VIOLATION];
        _state.exportGate = false;
      }
    }

    function _buildMetricAvailability(result) {
      var out = _defaultMetricAvailability();
      if (!_isPlain(result) || !_isPlain(result.metrics)) return out;
      DMC.SUPPORTED_DELTA_METRICS.forEach(function (cn) {
        // Phase metrics are governance-locked (mirrors C6 export behaviour). When
        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
        // regardless of what the orchestrator returned.
        if (DMC.PHASE_SCOPE_METRICS.indexOf(cn) !== -1 && !caps.phaseBoundaryContractEnabled) {
          out[cn] = false;
          return;
        }
        var m = result.metrics[cn];
        if (!_isPlain(m)) { out[cn] = false; return; }
        if (m.blocked === true) { out[cn] = false; return; }
        if (m.partial === true) { out[cn] = false; return; }
        if (m.value === undefined && !Array.isArray(m.perCorner)) { out[cn] = false; return; }
        out[cn] = true;
      });
      return out;
    }

    function _runRequest() {
      // Requires the four input slots — reference / comparison / association / channelMapping —
      // to be filled. If any is missing, stay in SELECTING.
      if (!_state.reference || !_state.comparison || !_state.association || !_state.channelMapping) {
        _state.placeholder = VST.PLACEHOLDER_STATES.SELECTING;
        return;
      }
      // Issue a new token BEFORE the orchestrator call so any in-flight prior request becomes
      // stale at commit time. (The orchestrator's own token monotonicity is independent of the
      // viewmodel counter — what matters is that this viewmodel commit checks `latestToken`.)
      _state.latestToken += 1;
      var thisToken = _state.latestToken;
      _state.placeholder = VST.PLACEHOLDER_STATES.COMPUTING;
      var response = orch.requestComparison({
        caseRecord: _state.caseRecord,
        association: _state.association,
        referenceLap: _state.reference,
        comparisonLap: _state.comparison,
        eligibilityInput: _buildEligibilityInput(),
        deltaMetricsRequest: _buildDeltaMetricsRequest(),
        framing: null,
        credibilityMetadata: _state.association.credibilityMetadata || null,
      });
      // The orchestrator returned synchronously. If the viewmodel's latestToken has already
      // advanced (e.g. via a re-entrant setReference triggered during this call), drop.
      if (response && response.generationToken !== undefined) {
        // Override the orchestrator's token with the viewmodel's local token so the stale-drop
        // rule is consistent.
        var responseWithLocalToken = Object.assign({}, response, { generationToken: thisToken });
        if (responseWithLocalToken.generationToken !== _state.latestToken) return; // stale
        _commit(responseWithLocalToken);
      }
    }

    function _buildEligibilityInput() {
      // Convert the viewmodel's confirmed selections into the comparison-eligibility input shape.
      var assoc = _state.association;
      function idShape(lap, basis, direction, caseId, sessionId) {
        return { analysisCaseId: caseId, sessionId: sessionId, lapId: lap.lapId, trackId: assoc.trackId, layoutId: assoc.layoutId, positionBasis: basis, positionDirection: direction };
      }
      return {
        analysisCaseId: assoc.caseId,
        caseRecord: _state.caseRecord,
        reference: {
          identity: idShape(_state.reference, assoc.positionBasis, assoc.positionDirection, assoc.caseId, assoc.sessionId),
          lapAuthority: _state.reference.lapAuthority || {},
          normalizationAuthority: _state.reference.normalizationAuthority || {},
        },
        comparison: {
          identity: idShape(_state.comparison, assoc.positionBasis, assoc.positionDirection, assoc.caseId, assoc.sessionId),
          lapAuthority: _state.comparison.lapAuthority || {},
          normalizationAuthority: _state.comparison.normalizationAuthority || {},
        },
        credibilityMetadata: assoc.credibilityMetadata || {},
      };
    }
    function _buildDeltaMetricsRequest() {
      var assoc = _state.association;
      var pairing = _state.channelMapping.pairing || { pairs: [] };
      return {
        identity: { caseId: assoc.caseId, sessionId: assoc.sessionId },
        referenceLap: { lapTimeMs: _state.reference.lapTimeMs },
        comparisonLap: { lapTimeMs: _state.comparison.lapTimeMs },
        pairing: pairing,
        requestedMetrics: ['lap_time', 'delta_cumulative', 'sector_delta'].concat(caps.phaseBoundaryContractEnabled ? ['entry_delta', 'mid_delta', 'exit_delta'] : []),
        policy: caps.phaseBoundaryContractEnabled ? { deltaSign: 'comparison_minus_reference', phaseBoundaryAuthorisation: { contractRef: 'r3.0c/phase-boundary-test-fixture', serviceOwned: true, deterministic: true } } : { deltaSign: 'comparison_minus_reference' },
      };
    }

    // ── Public mutators (the 7 transition triggers) ──
    // Codex C7-R6-01 closure: each public mutator is wrapped in fail-closed plumbing. _isPlain
    // only checks the prototype chain — a Proxy with Object.prototype getPrototypeOf but a
    // throwing ownKeys trap passes _isPlain and then explodes inside Object.assign({}, sel).
    // _safeShallowCopy below classifies any throw during the descriptor enumeration as "invalid
    // input" and yields null, which the mutator coerces into a clean reset of the relevant slot.
    // After Codex Round 6 confirmed all four object-shaped mutators (setReference / setComparison
    // / setAssociation / setChannelMapping) threw on the hostile ownKeys trap, every public
    // mutator body additionally lives inside its own try/catch that maps any residual throw to
    // a structured blocked placeholder.
    function _safeShallowCopy(o) {
      if (!_isPlain(o)) return null;
      try { return Object.assign({}, o); } catch (e) { return null; }
    }
    function _hostileBlocked() {
      _state.placeholder = VST.PLACEHOLDER_STATES.BLOCKED;
      _state.blockedReasons = [CODES.INTERNAL_CONTRACT_VIOLATION];
      _state.result = null;
      _state.framing = null;
      _state.exportGate = false;
    }
    function setReference(sel) {
      _clearAndPlaceholder('reference_selection_changed');
      try {
        var copy = _safeShallowCopy(sel);
        _state.reference = copy ? Object.freeze(copy) : null;
        _runRequest();
      } catch (e) { _state.reference = null; _hostileBlocked(); }
    }
    function setComparison(sel) {
      _clearAndPlaceholder('comparison_selection_changed');
      try {
        var copy = _safeShallowCopy(sel);
        _state.comparison = copy ? Object.freeze(copy) : null;
        _runRequest();
      } catch (e) { _state.comparison = null; _hostileBlocked(); }
    }
    function setAssociation(assoc) {
      _clearAndPlaceholder('case_association_changed');
      try {
        var assocCopy = _safeShallowCopy(assoc);
        _state.association = assocCopy ? Object.freeze(assocCopy) : null;
        // Codex C7-R2-A-01 closure: the viewmodel NO LONGER registers the caseRecord with the
        // orchestrator. The viewmodel is renderer-accessible (any caller can invoke
        // setAssociation with a forged caseRecord); treating that path as an authoritative
        // boundary was the D1 vulnerability. We still hold a private reference to the record so
        // requestComparison can pass it to the orchestrator, but the orchestrator's
        // authenticityPredicate (injected at construction) is what grants authority — NOT this
        // viewmodel.
        if (assocCopy) {
          // Read caseRecord via _safeShallowCopy too — assoc may be a Proxy whose
          // `caseRecord` getter throws even though Object.assign succeeded earlier (Object.assign
          // copies enumerable own-string-key data properties; a property whose value is an object
          // with a throwing getter doesn't crash Object.assign — but iterating it does).
          var crSrc = null;
          try { crSrc = assoc && assoc.caseRecord; } catch (e) { crSrc = null; }
          var cr = _safeShallowCopy(crSrc);
          if (cr) {
            var assocAssoc = null;
            try { assocAssoc = crSrc && crSrc.associations; } catch (e) { assocAssoc = null; }
            var nested = _safeShallowCopy(assocAssoc);
            if (nested) cr.associations = nested;
            _state.caseRecord = cr;
          } else {
            _state.caseRecord = null;
          }
        } else {
          _state.caseRecord = null;
        }
        _runRequest();
      } catch (e) { _state.association = null; _state.caseRecord = null; _hostileBlocked(); }
    }
    function setChannelMapping(mapping) {
      _clearAndPlaceholder('channel_mapping_changed');
      try {
        var copy = _safeShallowCopy(mapping);
        _state.channelMapping = copy ? Object.freeze(copy) : null;
        _runRequest();
      } catch (e) { _state.channelMapping = null; _hostileBlocked(); }
    }
    function notifyCaseReopen() {
      try {
        _clearAndPlaceholder('case_reopen');
        _state.reference = null; _state.comparison = null; _state.association = null; _state.channelMapping = null; _state.caseRecord = null;
      } catch (e) { _hostileBlocked(); }
    }
    function notifyAuthorityRevoked() {
      try { _clearAndPlaceholder('user_confirmed_authority_revoked'); } catch (e) { _hostileBlocked(); }
    }
    function notifyEligibilityRevoked() {
      try { _clearAndPlaceholder('orchestrator_eligibility_revoked'); } catch (e) { _hostileBlocked(); }
    }

    // ── Read-only state accessor ──
    function getState() {
      return Object.freeze({
        placeholder: _state.placeholder,
        reference: _state.reference,
        comparison: _state.comparison,
        association: _state.association,
        result: _state.result,
        framing: _state.framing,
        blockedReasons: _state.blockedReasons.slice(),
        limitations: _state.limitations.slice(),
        exportGate: _state.exportGate,
        metricAvailability: Object.assign({}, _state.metricAvailability),
        latestToken: _state.latestToken,
      });
    }

    return Object.freeze({
      SERVICE_VERSION: SERVICE_VERSION,
      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
      setReference: setReference,
      setComparison: setComparison,
      setAssociation: setAssociation,
      setChannelMapping: setChannelMapping,
      notifyCaseReopen: notifyCaseReopen,
      notifyAuthorityRevoked: notifyAuthorityRevoked,
      notifyEligibilityRevoked: notifyEligibilityRevoked,
      getState: getState,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    createComparisonViewModel: createComparisonViewModel,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonViewModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

exec
/bin/bash -lc "rg -n \"function createOrchestrator|return Object.freeze|var api|function exportComparison|function requestComparison\" renderer/js/r3-0c-comparison-orchestrator.js && sed -n '60,150p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '300,470p' renderer/js/r3-0c-comparison-orchestrator.js && sed -n '1,110p' tests/r3-0c-comparison-workspace.test.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
exec
/bin/bash -lc "rg -n \"function validateFramingEntry|sanitized|_validateFramingOrFallback|_buildFraming|_allowlistFrame\" contracts/r3.0c/framing-i18n-key-registry.js renderer/js/r3-0c-comparison-orchestrator.js renderer/js/r3-0c-comparison-export.js && sed -n '100,230p' contracts/r3.0c/framing-i18n-key-registry.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
renderer/js/r3-0c-comparison-export.js:64:  // registry and consumed via the sanitized snapshot (TOCTOU defeat). FIR may be absent in
renderer/js/r3-0c-comparison-export.js:65:  // fixture trees where the contract aggregator is stubbed; _allowlistFrame fails closed when
renderer/js/r3-0c-comparison-export.js:158:  function _allowlistFrame(frame) {
renderer/js/r3-0c-comparison-export.js:161:    // _allowlistFrame implementation re-read frame.reasonCode / frame.i18nKey / frame.params via
renderer/js/r3-0c-comparison-export.js:165:    // deep-frozen sanitized snapshot built from descriptor-read values, AND by consuming ONLY
renderer/js/r3-0c-comparison-export.js:169:    // registry's per-param cap (MAX_PARAM_STRING_BYTES). We re-validate the sanitized i18nKey's
renderer/js/r3-0c-comparison-export.js:170:    // byte length here — but the sanitized snapshot is the source of the bytes (frozen), so the
renderer/js/r3-0c-comparison-export.js:175:    if (!vr || vr.valid !== true || !vr.sanitized) return null;
renderer/js/r3-0c-comparison-export.js:176:    var sanitized = vr.sanitized;
renderer/js/r3-0c-comparison-export.js:177:    var i18nKey = sanitized.i18nKey;
renderer/js/r3-0c-comparison-export.js:180:    var out = { reasonCode: sanitized.reasonCode, i18nKey: i18nKey };
renderer/js/r3-0c-comparison-export.js:181:    var sanitizedParams = sanitized.params;
renderer/js/r3-0c-comparison-export.js:182:    if (sanitizedParams !== undefined) {
renderer/js/r3-0c-comparison-export.js:183:      // sanitized.params is a frozen plain object with only number / boolean / null / string
renderer/js/r3-0c-comparison-export.js:187:      // boundary). No raw frame.params access here — sanitized is the only surface.
renderer/js/r3-0c-comparison-export.js:189:      var pks = Object.keys(sanitizedParams);
renderer/js/r3-0c-comparison-export.js:193:        params[k] = sanitizedParams[k];
renderer/js/r3-0c-comparison-export.js:199:  function _allowlistFrameArray(arr, cap) {
renderer/js/r3-0c-comparison-export.js:204:      var f = _allowlistFrame(arr[i]);
renderer/js/r3-0c-comparison-export.js:411:    var cannotConclude = _allowlistFrameArray(allowedFraming.cannotConclude || [], MAX_FRAMING_ENTRIES);
renderer/js/r3-0c-comparison-export.js:413:    var alternativeExplanations = _allowlistFrameArray(allowedFraming.alternativeExplanations || [], MAX_FRAMING_ENTRIES);
renderer/js/r3-0c-comparison-export.js:417:      nextValidationAction = _allowlistFrame(allowedFraming.nextValidationAction);
renderer/js/r3-0c-comparison-export.js:464:      nextValidationAction = _allowlistFrame(request.framing.nextValidationAction);
contracts/r3.0c/framing-i18n-key-registry.js:130:  function validateFramingEntry(entry) {
contracts/r3.0c/framing-i18n-key-registry.js:155:      // Codex C7-R3-C-01 closure: build a sanitized canonical snapshot from the validated
contracts/r3.0c/framing-i18n-key-registry.js:159:      // accessor side again. The orchestrator MUST consume the sanitized snapshot — never the
contracts/r3.0c/framing-i18n-key-registry.js:162:      var sanitizedParams;
contracts/r3.0c/framing-i18n-key-registry.js:168:        sanitizedParams = {};
contracts/r3.0c/framing-i18n-key-registry.js:177:          if (v === null || typeof v === 'boolean') { sanitizedParams[k] = v; continue; }
contracts/r3.0c/framing-i18n-key-registry.js:178:          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; sanitizedParams[k] = v; continue; }
contracts/r3.0c/framing-i18n-key-registry.js:179:          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; sanitizedParams[k] = v; continue; }
contracts/r3.0c/framing-i18n-key-registry.js:182:        sanitizedParams = Object.freeze(sanitizedParams);
contracts/r3.0c/framing-i18n-key-registry.js:184:      var sanitized = sanitizedParams !== undefined
contracts/r3.0c/framing-i18n-key-registry.js:185:        ? Object.freeze({ reasonCode: rcRead.value, i18nKey: keyRead.value, params: sanitizedParams })
contracts/r3.0c/framing-i18n-key-registry.js:187:      return { valid: true, sanitized: sanitized };
renderer/js/r3-0c-comparison-orchestrator.js:119:        framing: _validateFramingOrFallback(framing),
renderer/js/r3-0c-comparison-orchestrator.js:132:        framing: _validateFramingOrFallback(framing),
renderer/js/r3-0c-comparison-orchestrator.js:138:    function _validateFramingOrFallback(framing) {
renderer/js/r3-0c-comparison-orchestrator.js:141:      // validator's `sanitized` snapshot (frozen, built from descriptor-read values only) is the
renderer/js/r3-0c-comparison-orchestrator.js:156:        if (vr.valid && vr.sanitized) out[k] = vr.sanitized;
renderer/js/r3-0c-comparison-orchestrator.js:164:          if (er.valid && er.sanitized) cd.push(er.sanitized);
renderer/js/r3-0c-comparison-orchestrator.js:259:      var framing = _buildFraming(dmResult, phaseMetricRequested, input.framing);
renderer/js/r3-0c-comparison-orchestrator.js:276:    function _buildFraming(dmResult, phaseMetricRequested, callerFraming) {
renderer/js/r3-0c-comparison-orchestrator.js:279:      // present we use _validateFramingOrFallback which rejects unregistered i18nKeys.
renderer/js/r3-0c-comparison-orchestrator.js:297:        // Codex C7-R3-C-01 closure: assign vr.sanitized, NOT the raw `v`. The TOCTOU bypass via
renderer/js/r3-0c-comparison-orchestrator.js:304:          if (vr.valid && vr.sanitized) built[k] = vr.sanitized;
renderer/js/r3-0c-comparison-orchestrator.js:310:            if (er.valid && er.sanitized && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(er.sanitized);
renderer/js/r3-0c-comparison-orchestrator.js:314:      return _validateFramingOrFallback(built);
renderer/js/r3-0c-comparison-orchestrator.js:361:        // framingVal MUST be the orchestrator's own previously-built sanitized framing object —
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

 succeeded in 0ms:
90:  function createOrchestrator(deps) {
115:      return Object.freeze({
128:      return Object.freeze({
151:      if (!_isPlain(framing)) return Object.freeze(out);
170:      return Object.freeze(out);
187:    function requestComparison(input) {
197:      } catch (e) { return Object.freeze({ status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), limitations: Object.freeze([]), framing: null, exportGate: false, detail: 'requestComparison token failed — fail-closed', generationToken: 0 }); }
261:      return Object.freeze({
337:      return Object.freeze({ eligible: false, status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), detail: detail });
347:    function exportComparison(eligibleResponse, extraInputs) {
391:    return Object.freeze({
401:  var api = {
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

    // Codex C7-R5-01 closure: descriptor-safe read for top-level fields on caller-supplied
    // eligibleResponse / extraInputs. A Proxy whose `get` trap throws (or returns side-effecting
    // values) on `framing` / `result` / `generationToken` / ... can escape the public export
    // boundary if we use plain `o.k` access. _readOwnExport returns tri-state matching the
    // framing-i18n-key-registry pattern: ABSENT (no own key) / VALUE (data descriptor) / THREW
    // (accessor descriptor OR descriptor lookup throws). Both ABSENT and THREW are surfaced as
    // a NULL value by the caller-side helper below.
    function _readOwnExport(o, k) {
      var desc;
      try { desc = Object.getOwnPropertyDescriptor(o, k); }
      catch (e) { return { state: 'THREW' }; }
      if (!desc) return { state: 'ABSENT' };
      if (typeof desc.get === 'function' || typeof desc.set === 'function') return { state: 'THREW' };
      return { state: 'VALUE', value: desc.value };
    }
    function _exportValueOrNull(o, k) {
      var r = _readOwnExport(o, k);
      return r.state === 'VALUE' ? r.value : null;
    }
    function _exportBlocked(detail) {
      return Object.freeze({ eligible: false, status: 'blocked', reasonCodes: Object.freeze([CODES.INTERNAL_CONTRACT_VIOLATION]), detail: detail });
    }

    /**
     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
     * The orchestrator does NOT bypass C6's own authenticity / closed-allowlist checks. The
     * public boundary is wrapped in a try/catch + descriptor-safe reads so hostile caller-
     * controlled accessors return a structured blocked result instead of throwing out of the
     * boundary (Codex C7-R5-01 closure).
     */
    function exportComparison(eligibleResponse, extraInputs) {
      try {
        if (!ex || typeof ex.buildComparisonExport !== 'function') {
          return _exportBlocked('export service unavailable');
        }
        if (!_isPlain(eligibleResponse)) return _exportBlocked('eligibleResponse not a plain object');
        var statusRead = _readOwnExport(eligibleResponse, 'status');
        var gateRead = _readOwnExport(eligibleResponse, 'exportGate');
        if (statusRead.state !== 'VALUE' || statusRead.value !== 'eligible') return _exportBlocked('export gate closed (status)');
        if (gateRead.state !== 'VALUE' || gateRead.value !== true) return _exportBlocked('export gate closed (gate)');
        if (!_isPlain(extraInputs)) extraInputs = {};
        var resultVal = _exportValueOrNull(eligibleResponse, 'result');
        var tokenVal = _exportValueOrNull(eligibleResponse, 'generationToken');
        var framingVal = _exportValueOrNull(eligibleResponse, 'framing');
        // framingVal MUST be the orchestrator's own previously-built sanitized framing object —
        // it was returned from requestComparison via Object.freeze. If a caller has hand-built
        // an eligibleResponse with a Proxy / accessor for framing we treat it as absent.
        var cannotConcludeVal = framingVal && _isPlain(framingVal) ? _exportValueOrNull(framingVal, 'cannotDistinguish') : null;
        var nextActionVal = framingVal && _isPlain(framingVal) ? _exportValueOrNull(framingVal, 'nextValidationAction') : null;
        return ex.buildComparisonExport({
          result: resultVal,
          association: _exportValueOrNull(extraInputs, 'association'),
          credibilityMetadata: _exportValueOrNull(extraInputs, 'credibilityMetadata'),
          generationToken: 'orch-' + (tokenVal != null ? tokenVal : ''),
          referenceLap: _exportValueOrNull(extraInputs, 'referenceLap'),
          comparisonLap: _exportValueOrNull(extraInputs, 'comparisonLap'),
          framing: {
            cannotConclude: Array.isArray(cannotConcludeVal) ? cannotConcludeVal : [],
            alternativeExplanations: [],
            nextValidationAction: nextActionVal || null,
          },
        });
      } catch (e) {
        // Defense in depth — any unexpected throw past the descriptor-safe reads results in a
        // structured blocked outcome rather than escaping the boundary. Detail is bounded and
        // never carries stack / private paths.
        return _exportBlocked('exportComparison threw — fail-closed');
      }
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

exec
/bin/bash -lc 'node tests/r3-0c-delta-metrics.test.js; node tests/r3-0c-contracts-bundle-equivalence.test.js; node tests/r3-0c-governance.test.js; node tests/r3-0c-no-consumer.test.js' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 exited 1 in 140ms:
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

exec
/bin/bash -lc "node <<'NODE'
const O=require('./renderer/js/r3-0c-comparison-orchestrator');
const VM=require('./renderer/js/r3-0c-comparison-viewmodel');
const DM=require('./renderer/js/r3-0c-delta-metrics');
const EX=require('./renderer/js/r3-0c-comparison-export');
const caps={phaseBoundaryContractEnabled:false,viewmodelStateTransitionContractEnabled:true,framingSourceStructuredContractEnabled:true};
const orch=O.createOrchestrator({capabilities:caps,authenticityPredicate:()=>true,deltaMetricsService:{computeDeltaMetrics:()=>({eligible:false,status:'blocked',reasonCodes:['INTERNAL_CONTRACT_VIOLATION']})},exportService:{buildComparisonExport:()=>({status:'blocked',eligible:false})}});
const hostile=new Proxy({}, {getPrototypeOf(){return Object.prototype},ownKeys(){throw Error('ownKeys')},get(){throw Error('get')}});
function probe(name,fn){try{const x=fn(); console.log(name,JSON.stringify({threw:false,status:x&&x.status,placeholder:x&&x.placeholder,exportGate:x&&x.exportGate}));}catch(e){console.log(name,JSON.stringify({threw:true,error:e.message}))}}
probe('orchestrator.requestComparison',()=>orch.requestComparison(hostile));
probe('orchestrator.exportComparison',()=>orch.exportComparison(hostile,hostile));
probe('delta.computeDeltaMetrics',()=>DM.computeDeltaMetrics(hostile));
probe('export.buildComparisonExport',()=>EX.buildComparisonExport(hostile));
for(const m of ['setReference','setComparison','setAssociation','setChannelMapping','notifyCaseReopen','notifyAuthorityRevoked','notifyEligibilityRevoked']){const vm=VM.createComparisonViewModel({orchestrator:orch,capabilities:caps}); probe('viewmodel.'+m,()=>{vm[m](hostile); return vm.getState()})}
console.log('D1',JSON.stringify({registerAuthenticCaseRecord:typeof orch.registerAuthenticCaseRecord,isAuthenticCaseRecord:typeof orch.isAuthenticCaseRecord}));
NODE
node <<'NODE'
const fs=require('fs'),vm=require('vm');
const files=['renderer/js/r3-0c-contracts-bundle.js','renderer/js/r3-0c-delta-metrics.js','renderer/js/r3-0c-comparison-export.js','renderer/js/r3-0c-comparison-orchestrator.js','renderer/js/r3-0c-comparison-viewmodel.js'];
const s={console,globalThis:null}; s.globalThis=s; vm.createContext(s); for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),s,{filename:f});
console.log('globals',files.map(f=>f.match(/r3-0c-(.*)\\.js/)[1]).join(','),Object.keys(s).filter(k=>k.startsWith('R3_0C_')).sort());
NODE
node <<'NODE'
const fs=require('fs'); const s=require('./governance/r3.0c/state.json'); const c=require('./governance/r3.0c/capabilities.json'); const cp=require('./governance/r3.0c/checkpoints/C7.json'); const html=fs.readFileSync('./renderer/index.html','utf8');
const ids=['case_comparison','reference_lap','corner_delta'];
console.log(JSON.stringify({authPaths:s.authorizedProductionPaths.length,enabledCaps:s.enabledCapabilities.length,currentCheckpoint:s.currentCheckpoint,phase_boundary_contract:c.phase_boundary_contract&&c.phase_boundary_contract.enabled,features:ids.map(id=>[id,(html.match(new RegExp(\"id: ['\\\"]\"+id+\"['\\\"][\\\\s\\\\S]{0,250}?availability: ['\\\"](["'^'"'\\\"]+)\"))||[])[1]])},null,2));
NODE
git diff --numstat 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..f0304ff -- renderer/js/dynamics-model.js renderer/js/car-presets.js renderer/js/vehicle-profile-f312.js renderer/js/case-record-schema.js && rg -n \"501|presetCount|PRESETS\" tests/vehicle-preset-pipeline.test.js renderer/js/car-presets.js | tail -20" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
/bin/bash: cannot create temp file for here document: Operation not permitted
/bin/bash: line 16: cannot create temp file for here document: Operation not permitted
/bin/bash: line 22: cannot create temp file for here document: Operation not permitted
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-Al0yLfyi' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-4DigcH2r' (errno=Operation not permitted)
tests/vehicle-preset-pipeline.test.js:3: * Pure logic is tested with a HAND-BUILT fixture source (≠ the production api; fixture ≠ oracle). Count (501),
tests/vehicle-preset-pipeline.test.js:46:// view models: TWO consumers, same use-case source, neither reads CAR_PRESETS
tests/vehicle-preset-pipeline.test.js:49:// ── REAL data: count 501 + IDs stable + content immutable ──
tests/vehicle-preset-pipeline.test.js:52:  vm.runInContext(fs.readFileSync(__dirname + '/../renderer/js/car-presets.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/../renderer/js/api.js', 'utf8') + '\n; ctx_api=(typeof api!=="undefined")?api:null; ctx_presets=CAR_PRESETS;', ctx, { filename: 'real' });
tests/vehicle-preset-pipeline.test.js:53:  const realApi = ctx.ctx_api, CAR_PRESETS = ctx.ctx_presets;
tests/vehicle-preset-pipeline.test.js:56:  const idsBefore = Object.keys(CAR_PRESETS).slice().sort().join(',');
tests/vehicle-preset-pipeline.test.js:57:  const snapshot = JSON.stringify(CAR_PRESETS);
tests/vehicle-preset-pipeline.test.js:58:  chk('real pipeline lists PRESET_BASELINE_COUNT = 501', realUc.listVehiclePresets({}).length === 501);
tests/vehicle-preset-pipeline.test.js:60:  const firstId = Object.keys(CAR_PRESETS)[0];
tests/vehicle-preset-pipeline.test.js:64:  chk('preset IDs unchanged before/after', Object.keys(CAR_PRESETS).slice().sort().join(',') === idsBefore);
tests/vehicle-preset-pipeline.test.js:65:  chk('preset CONTENT unchanged (deep) after read pipeline', JSON.stringify(CAR_PRESETS) === snapshot);
tests/vehicle-preset-pipeline.test.js:66:  chk('real detail is a deep copy (not the live preset)', d.setupInputs.front_spring_rate === -1 && CAR_PRESETS[firstId].params.front_spring_rate !== -1);
tests/vehicle-preset-pipeline.test.js:67:  const snap = realUc.getPresetSnapshot(firstId); const wasFront = CAR_PRESETS[firstId].params.front_spring_rate; snap.params.front_spring_rate = -7777; snap.name = 'HACKED';
tests/vehicle-preset-pipeline.test.js:68:  chk('real snapshot is a deep copy (legacy adapter cannot mutate CAR_PRESETS)', snap.params.front_spring_rate === -7777 && CAR_PRESETS[firstId].params.front_spring_rate === wasFront);
tests/vehicle-preset-pipeline.test.js:69:  chk('real preset CONTENT still unchanged after snapshot mutation', JSON.stringify(CAR_PRESETS) === snapshot);
renderer/js/car-presets.js:17:var CAR_PRESETS = {
renderer/js/car-presets.js:21349:    return CAR_PRESETS[carId] || null;
renderer/js/car-presets.js:21359:    var carIds = Object.keys(CAR_PRESETS);
renderer/js/car-presets.js:21362:        var data = CAR_PRESETS[carId];
renderer/js/car-presets.js:21388:    var preset = CAR_PRESETS[carId];

exec
/bin/bash -lc "node -e 'const O=require(\"./renderer/js/r3-0c-comparison-orchestrator\"),VM=require(\"./renderer/js/r3-0c-comparison-viewmodel\"),DM=require(\"./renderer/js/r3-0c-delta-metrics\"),EX=require(\"./renderer/js/r3-0c-comparison-export\");const caps={phaseBoundaryContractEnabled:false,viewmodelStateTransitionContractEnabled:true,framingSourceStructuredContractEnabled:true};const orch=O.createOrchestrator({capabilities:caps,authenticityPredicate:()=>true,deltaMetricsService:{computeDeltaMetrics:()=>({eligible:false,status:\"blocked\",reasonCodes:[\"INTERNAL_CONTRACT_VIOLATION\"]})},exportService:{buildComparisonExport:()=>({status:\"blocked\",eligible:false})}});const h=new Proxy({},{getPrototypeOf(){return Object.prototype},ownKeys(){throw Error(\"ownKeys\")},get(){throw Error(\"get\")}});function p(n,f){try{let x=f();console.log(n,{threw:false,status:x&&x.status,placeholder:x&&x.placeholder,exportGate:x&&x.exportGate})}catch(e){console.log(n,{threw:true,error:e.message})}}p(\"request\",()=>orch.requestComparison(h));p(\"orchExport\",()=>orch.exportComparison(h,h));p(\"delta\",()=>DM.computeDeltaMetrics(h));p(\"buildExport\",()=>EX.buildComparisonExport(h));for(const m of [\"setReference\",\"setComparison\",\"setAssociation\",\"setChannelMapping\",\"notifyCaseReopen\",\"notifyAuthorityRevoked\",\"notifyEligibilityRevoked\"]){const v=VM.createComparisonViewModel({orchestrator:orch,capabilities:caps});p(m,()=>{v[m](h);return v.getState()})}console.log(\"D1\",typeof orch.registerAuthenticCaseRecord,typeof orch.isAuthenticCaseRecord)' 
node -e 'const fs=require(\"fs\"),vm=require(\"vm\"),files=[\"renderer/js/r3-0c-contracts-bundle.js\",\"renderer/js/r3-0c-delta-metrics.js\",\"renderer/js/r3-0c-comparison-export.js\",\"renderer/js/r3-0c-comparison-orchestrator.js\",\"renderer/js/r3-0c-comparison-viewmodel.js\"],s={console};s.globalThis=s;vm.createContext(s);files.forEach(f=>vm.runInContext(fs.readFileSync(f,\"utf8\"),s,{filename:f}));console.log(Object.keys(s).filter(k=>k.startsWith(\"R3_0C_\")).sort())'
node -e 'const fs=require(\"fs\"),s=require(\"./governance/r3.0c/state.json\"),c=require(\"./governance/r3.0c/capabilities.json\");console.log({authPaths:s.authorizedProductionPaths.length,enabledCaps:s.enabledCapabilities.length,currentCheckpoint:s.currentCheckpoint,phase_boundary_contract:c.phase_boundary_contract&&c.phase_boundary_contract.enabled});const src=fs.readFileSync(\"renderer/js/car-presets.js\",\"utf8\"),vm=require(\"vm\"),x={};vm.createContext(x);vm.runInContext(src+\";n=Object.keys(CAR_PRESETS).length\",x);console.log({presetCount:x.n})'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 118ms:
{
  authPaths: 14,
  enabledCaps: 12,
  currentCheckpoint: 'C7_UI',
  phase_boundary_contract: undefined
}
{ presetCount: 501 }

codex
All five service boundaries and all seven viewmodel mutators fail closed under the hostile proxy; no exception escaped. The independent browser-context evaluation also registered the contracts and all C7 service globals. I’m finishing the immutable-scope and governance cross-checks.
exec
/bin/bash -lc 'git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..f0304ff | sort && git diff --numstat 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..f0304ff -- renderer/js/dynamics-model.js renderer/js/car-presets.js renderer/js/vehicle-profile-f312.js renderer/js/case-record-schema.js contracts/r3.0b renderer/js/case-store.js renderer/js/session-store.js' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-Ygguc1Xg' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-TYvqSyrL' (errno=Operation not permitted)
contracts/r3.0c/framing-i18n-key-registry.js
contracts/r3.0c/index.js
contracts/r3.0c/reason-codes.js
contracts/r3.0c/viewmodel-state-transition-contract.js
governance/r3.0/train.json
governance/r3.0c/capabilities.json
governance/r3.0c/checkpoints/C7.json
governance/r3.0c/codex-checkpoint-evidence/C7/round-2-c51952a.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-3-ae039008.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-4-fc6ff8f8.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-5-a1a6988e.md
governance/r3.0c/codex-checkpoint-evidence/C7/round-6-93506779.md
governance/r3.0c/state.json
package.json
renderer/index.html
renderer/js/i18n-comparisons.js
renderer/js/r3-0c-comparison-export.js
renderer/js/r3-0c-comparison-orchestrator.js
renderer/js/r3-0c-comparison-viewmodel.js
renderer/js/r3-0c-contracts-bundle.js
renderer/js/r3-0c-delta-metrics.js
scripts/build-r3-0c-contracts-bundle.js
tests/i18n-parity.test.js
tests/r3-0c-comparison-export.test.js
tests/r3-0c-comparison-workspace.test.js
tests/r3-0c-contracts-bundle-equivalence.test.js
tests/r3-0c-governance.test.js
tests/r3-0c-no-consumer.test.js
tests/r3.0a-ui.test.js
tests/r3.0c-contract-foundation.test.js
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-a4zjW4E1' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-u8xQoqQ8' (errno=Operation not permitted)

exec
/bin/bash -lc "node -e 'const f=require(\"./scripts/frozen-files.json\"); console.log(JSON.stringify(f,null,2))'" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
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

exec
/bin/bash -lc "node -e 'const s=require(\"./governance/r3.0c/state.json\"),c=require(\"./governance/r3.0c/capabilities.json\");console.log(JSON.stringify({enabled:s.enabledCapabilities,capPhase:c.phase_boundary_contract,statePhase:s.enabledCapabilities.includes(\"phase_boundary_contract\")},null,2))' && rg -n -C 4 \"case_comparison|reference_lap|corner_delta\" renderer/index.html governance/r3.0c/state.json governance/r3.0c/capabilities.json && rg -n \"UI_INITIALIZATION_FAILED|_r3cC7InitFailure\" renderer/index.html contracts/r3.0c/reason-codes.js" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
{
  "enabled": [
    "production_adapter_present",
    "lap_authority_present",
    "track_identity_authoritative",
    "normalized_distance_present",
    "reference_selection_present",
    "corner_segmentation_present",
    "corner_pairing_present",
    "delta_metrics_present",
    "comparison_export_present",
    "ui_present",
    "viewmodel_state_transition_contract",
    "framing_source_structured_contract"
  ],
  "statePhase": false
}
governance/r3.0c/state.json-23-  "runtimeConsumersAllowed": true,
governance/r3.0c/state.json-24-  "uiAllowed": true,
governance/r3.0c/state.json-25-  "featureRegistryActivationAllowed": false,
governance/r3.0c/state.json-26-  "algorithmsAllowed": true,
governance/r3.0c/state.json:27:  "note": "R3.0C C7_UI state. Adds the Comparison Workspace UI: three new authorized renderer/js paths (r3-0c-comparison-orchestrator.js, r3-0c-comparison-viewmodel.js, i18n-comparisons.js) all bound to the new ui_present capability. The orchestrator owns request-token issuance + framing emission (composes C5 delta-metrics + C6 export); the viewmodel is the pure state machine consuming orchestrator output, implementing the 7 transition triggers + stale-token drop per contracts/r3.0c/viewmodel-state-transition-contract.js. The framing-source contract (contracts/r3.0c/framing-i18n-key-registry.js) is enabled: every framing entry the orchestrator emits is validated against a closed allowlist of i18nKeys before reaching the viewmodel; the viewmodel re-validates as defense in depth. uiAllowed flips true: the Comparison Workspace pane replaces the deferred placeholder in renderer/index.html. featureRegistryActivationAllowed remains false: the three R3.0C feature IDs (case_comparison, reference_lap, corner_delta) remain availability='deferred' with NO rendererAdapter until C8 authorizes activation — C7 ships the UI surface without activating the routes. phase_boundary_contract remains the only declared-but-disabled governance capability: phase metrics (entry/mid/exit_delta) are reported metricAvailability:false in both viewmodel and export until a future checkpoint authorizes a deterministic phase-boundary contract."
governance/r3.0c/state.json-28-}
--
governance/r3.0c/capabilities.json-66-    },
governance/r3.0c/capabilities.json-67-    "feature_registry_active": {
governance/r3.0c/capabilities.json-68-      "kind": "activation",
governance/r3.0c/capabilities.json-69-      "unlockFloor": "C8_ACTIVATION",
governance/r3.0c/capabilities.json:70:      "description": "Feature Registry flips the deferred R3.0C feature IDs (case_comparison, reference_lap, corner_delta) to available, attaching their rendererAdapter. Only valid at C8."
governance/r3.0c/capabilities.json-71-    },
governance/r3.0c/capabilities.json-72-    "phase_boundary_contract": {
governance/r3.0c/capabilities.json-73-      "kind": "contract",
governance/r3.0c/capabilities.json-74-      "unlockFloor": "C5R_CP1_RETROFIT",
contracts/r3.0c/reason-codes.js:146:    UI_INITIALIZATION_FAILED: 'UI_INITIALIZATION_FAILED',
renderer/index.html:274:             (including the new UI_INITIALIZATION_FAILED) surface localized wording. -->
renderer/index.html:3301:  // renders an honest unavailable state with UI_INITIALIZATION_FAILED rather than masquerading
renderer/index.html:3303:  _r3cC7InitFailure: null,
renderer/index.html:3318:    if (this._r3cC7InitFailure) {
renderer/index.html:3321:      return { placeholder: 'unavailable', reference: null, comparison: null, association: null, result: null, framing: null, blockedReasons: [this._r3cC7InitFailure.reasonCode], limitations: [], exportGate: false, metricAvailability: { lap_time: false, delta_cumulative: false, sector_delta: false, entry_delta: false, mid_delta: false, exit_delta: false }, latestToken: 0 };
renderer/index.html:3953:    // (script load failed or pending) → structured failure UI_INITIALIZATION_FAILED, (3) globals
renderer/index.html:3954:    // present but a factory throws → also UI_INITIALIZATION_FAILED. The previous catch silently
renderer/index.html:3961:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'globals_missing' };
renderer/index.html:3962:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — R3_0C_ComparisonOrchestrator / R3_0C_ComparisonViewModel UMD globals not loaded'); } catch (_) {}
renderer/index.html:3984:      this._r3cC7InitFailure = null;
renderer/index.html:3988:      this._r3cC7InitFailure = { reasonCode: 'UI_INITIALIZATION_FAILED', cause: 'factory_threw' };
renderer/index.html:3989:      try { if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|)$/.test(location.hostname)) console.warn('[r3.0c.c7] UI_INITIALIZATION_FAILED — factory threw during construction'); } catch (_) {}

exec
/bin/bash -lc 'node tests/vehicle-preset-pipeline.test.js && node tests/r3.0b-persistence-integration.test.js && node tests/case-record-schema.test.js && node tests/r3.0a-ui.test.js && node tests/i18n-parity.test.js' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 220ms:
case-record-schema: 63 passed, 0 failed
r3.0a-ui: 66 passed, 0 failed
i18n-parity: 105 passed, 0 failed

codex
Reviewed candidate: `f0304ffc24d05d0f90abbffe368d5e4bcb1795ff`

Evidence:

1. Round 6 `ownKeys` attack: no throw; placeholder=`selecting`, never `ready`; exportGate=`false`.
2. Hostile public surfaces:
   - `requestComparison` → blocked
   - `exportComparison` → blocked
   - `computeDeltaMetrics` → blocked
   - `buildComparisonExport` → blocked
   - All seven viewmodel mutators → no throw
3. D1: both registration/authenticity methods absent from public orchestrator API.
4. J1: bundle-equivalence tests passed; browser UMD evaluation registered all expected `R3_0C_*` globals.
5. Framing validator returns frozen sanitized snapshots; orchestrator and C6 consume sanitized values.
6. `UI_INITIALIZATION_FAILED` is reachable for missing globals and factory exceptions.
7. Governance confirmed:
   - authPaths=14
   - enabledCaps=12
   - currentCheckpoint=`C7_UI`
   - three feature routes remain deferred
   - `phase_boundary_contract` absent from enabled capabilities
   - presetCount=501
8. Frozen physics, presets, and R3.0B persistence files have zero diff.
9. Tests passed:
   - comparison workspace: 111
   - delta metrics: 59
   - bundle equivalence: 17
   - presets: 27
   - R3.0B persistence: 16
   - case schema: 63
   - R3.0A UI: 66
   - i18n parity: 105

No concrete residual C7-scope attack found.

VERDICT: PASS
tokens used
82,234
Reviewed candidate: `f0304ffc24d05d0f90abbffe368d5e4bcb1795ff`

Evidence:

1. Round 6 `ownKeys` attack: no throw; placeholder=`selecting`, never `ready`; exportGate=`false`.
2. Hostile public surfaces:
   - `requestComparison` → blocked
   - `exportComparison` → blocked
   - `computeDeltaMetrics` → blocked
   - `buildComparisonExport` → blocked
   - All seven viewmodel mutators → no throw
3. D1: both registration/authenticity methods absent from public orchestrator API.
4. J1: bundle-equivalence tests passed; browser UMD evaluation registered all expected `R3_0C_*` globals.
5. Framing validator returns frozen sanitized snapshots; orchestrator and C6 consume sanitized values.
6. `UI_INITIALIZATION_FAILED` is reachable for missing globals and factory exceptions.
7. Governance confirmed:
   - authPaths=14
   - enabledCaps=12
   - currentCheckpoint=`C7_UI`
   - three feature routes remain deferred
   - `phase_boundary_contract` absent from enabled capabilities
   - presetCount=501
8. Frozen physics, presets, and R3.0B persistence files have zero diff.
9. Tests passed:
   - comparison workspace: 111
   - delta metrics: 59
   - bundle equivalence: 17
   - presets: 27
   - R3.0B persistence: 16
   - case schema: 63
   - R3.0A UI: 66
   - i18n parity: 105

No concrete residual C7-scope attack found.

VERDICT: PASS
---- END codex exec ----
utcEndedAt: 2026-06-28T03:51:56Z
