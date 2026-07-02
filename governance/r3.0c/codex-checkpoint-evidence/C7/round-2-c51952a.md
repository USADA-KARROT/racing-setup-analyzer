# Codex C7 Round 2 — Tier 1 raw stdout capture

reviewedCandidateSha: c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a
branch: feat/r3.0c-c7-comparison-workspace
codexCliVersion: codex-cli 0.141.0
utcStartedAt: 2026-06-28T02:54:11Z
cwd: /Users/SKYLINE/Claude/projects/racing-setup-analyzer
remoteVerification:
  origin/feat/r3.0c-c7-comparison-workspace: c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a
  origin/feat/r3.0-integrated-delivery: 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9
  origin/main: 506012afea7b0296f2c1506cc77d4b39ffdf6ccb
  workingTreeStatus: 0 changed files

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
session id: 019f0c26-668f-7ac2-935c-91a111012439
--------
user
# Codex C7 Round 2 — Comparison Workspace UI · Adversarial Review

ROLE: You are an adversarial code reviewer. Your job is to TRY TO BREAK the change, not to validate it.

REVIEWED CANDIDATE
- Repo: USADA-KARROT/racing-setup-analyzer (local clone at /Users/SKYLINE/Claude/projects/racing-setup-analyzer)
- Branch: feat/r3.0c-c7-comparison-workspace
- SHA (must verify before reviewing): c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a
- Base SHA (Train integration target): 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9
- Checkpoint: R3.0C C7 (Comparison Workspace UI)
- Round: 2 (Round 1 BLOCK at 7a3be55 closed with 5 BLOCKER + 2 NON-BLOCKING fixes; this candidate is the Round-1-fix commit)

REVIEW SCOPE — files changed in c51952a (verify with `git show --stat c51952a`):
- contracts/r3.0c/framing-i18n-key-registry.js
- governance/r3.0/train.json
- renderer/index.html
- renderer/js/r3-0c-comparison-orchestrator.js
- renderer/js/r3-0c-comparison-viewmodel.js
- tests/i18n-parity.test.js
- tests/r3-0c-comparison-workspace.test.js
PLUS the entire 7a3be55 + c51952a delta (both commits constitute C7).

NON-NEGOTIABLE CHECKS — output BLOCK + concrete attack if ANY of the following hold.

A. Case authenticity must NOT be self-registered by the viewmodel
   • Find: `registerAuthenticCaseRecord` exposed as PUBLIC API on the orchestrator factory return value.
   • Find: viewmodel `setAssociation` calls `orch.registerAuthenticCaseRecord(_state.caseRecord)` automatically with a caller-provided object.
   • Threat model: any caller able to invoke `viewmodel.setAssociation({caseRecord: <forged>, ...})` gains authoritative case authority.
   • Counterexample to construct: a literal-built caseRecord with self-consistent caseId / sessionId / associations passed via setAssociation reaches requestComparison and `isAuthenticCaseRecord(input.caseRecord)` returns true.
   • This must be BLOCKED. Registration must require an authoritative, viewmodel-inaccessible entrypoint (e.g. an integration adapter that the renderer cannot call without the case-store boundary).

B. Browser wiring must actually be complete at this checkpoint
   • Find: index.html script-tag list. Verify `renderer/js/r3-0c-comparison-orchestrator.js` and `renderer/js/r3-0c-comparison-viewmodel.js` are present alongside `i18n-comparisons.js`.
   • Find: `typeof R3_0C_ComparisonOrchestrator !== 'undefined'` guard in `app().init()`. If the guard CAN fail because the scripts aren't loaded, the pane silently stays at placeholder.idle — this is the J1 BLOCKER unclosed.
   • The reviewed candidate documents this as a "Partial closure → C7.1". This is NOT a valid closure for a UI checkpoint. Either:
     – the scripts are loaded (and the no-consumer governance rule is met by a browser-safe production facade / generated frozen registry / mirror with equivalence test / DI / bundle), OR
     – J1 remains a BLOCKER.
   • If the candidate still ships placeholder.idle as completion state for the workspace, BLOCK.

C. Getter / Proxy throw must NOT be laundered as "field absent"
   • Find: `_safeGet(entry, 'params')` returns `undefined` on throw, then `if (paramsRaw !== undefined)` skips validation.
   • Attack: an input where `Object.defineProperty(entry, 'params', { get() { throw new Error('boom'); }, configurable: true, enumerable: true })`. The own-keys check passes (params is an own key), the params validation is skipped, the framing entry is accepted.
   • The directive requires distinguishing ABSENT vs VALUE vs THREW. THREW must fail-closed.
   • Required tests: optional getter throws → reject; genuinely absent optional field → accept; inherited getter → reject; Proxy get trap → reject; Proxy ownKeys trap → reject; descriptor accessor → reject; non-enumerable unknown key → reject; symbol key → reject.

D. Initialization failure must NOT be silently swallowed
   • Find: `try { ... } catch (e) { this._r3cC7VM = null; this._r3cC7Orch = null; }` in app().init().
   • Find: the `typeof !== 'undefined'` guard followed by no else clause — guard miss is indistinguishable from successful init returning null state.
   • Required: on init failure (or on scripts not loaded), set a structured unavailable state with a registered reason code (e.g. UI_INITIALIZATION_FAILED), fixed i18n key, export disabled, no fake "idle" appearance. DO NOT leak stack / private paths.

E. State-transition + async race must hold
   • Verify `_clearAndPlaceholder` advances `latestToken` for every trigger (Round 1 fix).
   • Construct: request A starts → request B starts → B commits → A commits later → A must NOT overwrite B. Check this both inside the synchronous viewmodel implementation AND if any path adds asynchrony (microtask, Promise resolution, requestAnimationFrame).
   • Construct: request A starts → notifyAuthorityRevoked → A commits later → state must remain revoked, NOT restore old result.
   • Construct: request A starts → mapping changes → A commits later → dependent metrics must be unavailable.
   • Blocked / stale must clear: chart, corner cards, metrics, confidence, provenance, limitations, export payload, previous selection result, phase values, next validation action.

F. UI may not author truth
   • UI must NOT recompute delta, flip sign, recompute confidence/credibility, derive corner pairing, derive phase entry/mid/exit boundaries, treat presence-of-number as available, render blocked as warning, generate causal sentences, accept caller free-form framing prose.
   • Delta sign formula must remain `comparison - reference` with the documented sign convention.

G. Phase cards governance
   • `phase_boundary_contract.enabled` must remain false at C7.
   • Phase cards (entry/mid/exit_delta) must NEVER display non-fallback values while disabled.
   • Verify the viewmodel forces metricAvailability=false for phase metrics regardless of orchestrator output.

H. Capability / governance integrity
   • Verify governance/r3.0c/checkpoints/C7.json `enabledCapabilitiesAfter` includes `ui_present`, `viewmodel_state_transition_contract`, `framing_source_structured_contract` BUT does NOT include `case_comparison`, `reference_lap`, `corner_delta`, `feature_registry_active`.
   • Verify train.json advances currentCheckpoint to C7_UI but does NOT mark C7 complete.
   • Verify `phase_boundary_contract.enabled` is still false in governance/r3.0c/capabilities.json.

I. Tests must be at the right layer
   • A forged-caseRecord test that passes by registering the record first does NOT prove D1 closure. The real D1 test must drive setAssociation with a forged caseRecord and verify it is rejected — without test helpers reaching into orchestrator.registerAuthenticCaseRecord.
   • A "static HTML regex" parity test is not equivalent to an actual browser load.

J. Frozen physics + R3.0B persistence schema must remain untouched
   • Grep for any modification to physics/dynamics/preset definitions or R3.0B portable case schema. None permitted.

EVIDENCE REQUIRED IN VERDICT
For each finding:
- ID (e.g. C7-R2-A-01)
- SEVERITY (BLOCKER / MAJOR / MINOR / NON-BLOCKING / FALSE-POSITIVE-of-Round-1)
- FILE:LINE
- ATTACK STEPS (concrete inputs to reproduce)
- WHY current code fails to block it
- WHAT minimal fix would close it

VERDICT (last line, exact form)
- "VERDICT: PASS" — only if zero BLOCKER findings AND no Round-1 partial closures remain
- "VERDICT: BLOCK"  — otherwise

Do NOT defer to "follow-up C7.1". Do NOT accept "placeholder.idle is acceptable for a UI checkpoint". Do NOT downgrade J1 from BLOCKER on governance grounds.

codex
I’ll verify the exact commit/base and inspect the two-commit C7 delta, then run targeted adversarial probes and the relevant test suite.
exec
/bin/bash -lc 'git status --short && git rev-parse HEAD && git branch --show-current && git show --stat --oneline --decorate --no-renames c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a && git diff --stat 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-o3DGSsSM' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-AGYVQTBB' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-pBo2TF6z' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-BekFKT2J' (errno=Operation not permitted)
c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-ld3XBo5p' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-jEYwWHaG' (errno=Operation not permitted)
feat/r3.0c-c7-comparison-workspace
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-gVdMF21M' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-JY4oeukv' (errno=Operation not permitted)
c51952a (HEAD -> feat/r3.0c-c7-comparison-workspace, origin/feat/r3.0c-c7-comparison-workspace) cp1r(c7): close Codex C7 round-1 findings — token race / Proxy / case authenticity / train.json / parity / Reflect.ownKeys
 contracts/r3.0c/framing-i18n-key-registry.js | 55 +++++++++++++++++++---------
 governance/r3.0/train.json                   |  4 +-
 renderer/index.html                          | 22 +++++++++++
 renderer/js/r3-0c-comparison-orchestrator.js | 36 +++++++++++++++++-
 renderer/js/r3-0c-comparison-viewmodel.js    | 26 ++++++++++++-
 tests/i18n-parity.test.js                    | 10 +++++
 tests/r3-0c-comparison-workspace.test.js     | 27 ++++++++++++--
 7 files changed, 154 insertions(+), 26 deletions(-)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-n8c3oi9m' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-ppPcNYDj' (errno=Operation not permitted)
 contracts/r3.0c/framing-i18n-key-registry.js       | 168 ++++++++++
 contracts/r3.0c/index.js                           |   6 +-
 .../r3.0c/viewmodel-state-transition-contract.js   | 136 +++++++++
 governance/r3.0/train.json                         |   4 +-
 governance/r3.0c/capabilities.json                 |  12 +-
 governance/r3.0c/checkpoints/C7.json               |  95 ++++++
 governance/r3.0c/state.json                        |  15 +-
 package.json                                       |   2 +-
 renderer/index.html                                | 114 ++++++-
 renderer/js/i18n-comparisons.js                    | 181 +++++++++++
 renderer/js/r3-0c-comparison-orchestrator.js       | 339 +++++++++++++++++++++
 renderer/js/r3-0c-comparison-viewmodel.js          | 276 +++++++++++++++++
 tests/i18n-parity.test.js                          |  11 +
 tests/r3-0c-comparison-workspace.test.js           | 254 +++++++++++++++
 tests/r3-0c-governance.test.js                     |   8 +-
 tests/r3-0c-no-consumer.test.js                    |  11 +-
 tests/r3.0a-ui.test.js                             |  12 +-
 tests/r3.0c-contract-foundation.test.js            |   2 +-
 18 files changed, 1613 insertions(+), 33 deletions(-)

exec
/bin/bash -lc "rg -n \"registerAuthentic|setAssociation|_safeGet|paramsRaw|latestToken|_clearAndPlaceholder|R3_0C_Comparison|UI_INITIALIZATION|catch \\(e\\)|phase|placeholder\\.idle\" renderer/index.html renderer/js/r3-0c-comparison-{orchestrator,viewmodel}.js contracts/r3.0c/framing-i18n-key-registry.js tests/r3-0c-comparison-workspace.test.js governance/r3.0c/{checkpoints/C7.json,capabilities.json} governance/r3.0/train.json && git diff --name-only 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a | rg \"physics|dynamics|preset|schema|r3.0b\" || true" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
governance/r3.0/train.json:4:  "phases": ["R3.0C", "R3.0D", "R3.0E", "R3.0F"],
governance/r3.0/train.json:7:  "phaseStates": {
governance/r3.0/train.json:61:  "note": "R3.0 Integrated Delivery Train state. IN_PROGRESS means SKYLINE has authorized the feature train; feat/r3.0-integrated-delivery has been opened from main at the G1 head SHA. No production code is added by this commit and no capability is enabled — opening the branch is the only state change. Per-phase currentCheckpoint advances under separately-authorized Train checkpoints (C1..C8, D1..D5, E1..E5, F1..F5). Final merge happens once at R3.0F F6_RELEASE; v2.0.0 tag + GitHub Release are created post-merge after the new main trusted-verification PASS. trainStatus then becomes MERGED."
tests/r3-0c-comparison-workspace.test.js:7: *   - orchestrator service (capability gate + token monotonicity + framing enforcement + phase
tests/r3-0c-comparison-workspace.test.js:10: *     latest-token commit, phase metricAvailability forced false)
tests/r3-0c-comparison-workspace.test.js:13: *     phase metric request without capability, cross-case + cross-session refusal,
tests/r3-0c-comparison-workspace.test.js:32:const allCapsOn = { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: true };
tests/r3-0c-comparison-workspace.test.js:33:const capsWithPhase = Object.assign({}, allCapsOn, { phaseBoundaryContractEnabled: true });
tests/r3-0c-comparison-workspace.test.js:97:  const orch1 = OrchService.createOrchestrator({ capabilities: { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: false, framingSourceStructuredContractEnabled: true } });
tests/r3-0c-comparison-workspace.test.js:100:  const orch2 = OrchService.createOrchestrator({ capabilities: { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: false } });
tests/r3-0c-comparison-workspace.test.js:124:function regCase(orch, cr) { orch.registerAuthenticCaseRecord(cr); return cr; }
tests/r3-0c-comparison-workspace.test.js:148:  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
tests/r3-0c-comparison-workspace.test.js:160:  orch.registerAuthenticCaseRecord(caseRec);
tests/r3-0c-comparison-workspace.test.js:170:// H. Orchestrator — phase metric requested without capability → filtered out + limitation
tests/r3-0c-comparison-workspace.test.js:173:  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
tests/r3-0c-comparison-workspace.test.js:177:  chk('H1 phase metric without capability → still eligible (filtered)', r.status === 'eligible');
tests/r3-0c-comparison-workspace.test.js:179:  chk('H3 framing.cannotDistinguish names phase_metric_unauthorised', r.framing.cannotDistinguish.some(e => e.i18nKey === 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised'));
tests/r3-0c-comparison-workspace.test.js:184:  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
tests/r3-0c-comparison-workspace.test.js:191:  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
tests/r3-0c-comparison-workspace.test.js:202:  catch (e) { threw = true; }
tests/r3-0c-comparison-workspace.test.js:213:  chk('L4 latestToken 0', s.latestToken === 0);
tests/r3-0c-comparison-workspace.test.js:216:const allTriggers = ['setReference', 'setComparison', 'setAssociation', 'setChannelMapping', 'notifyCaseReopen', 'notifyAuthorityRevoked', 'notifyEligibilityRevoked'];
tests/r3-0c-comparison-workspace.test.js:221:  vm.setAssociation(association());
tests/r3-0c-comparison-workspace.test.js:229:  else if (triggerFn === 'setAssociation') vm.setAssociation(association());
tests/r3-0c-comparison-workspace.test.js:239:// N. Viewmodel — phase metricAvailability forced false
tests/r3-0c-comparison-workspace.test.js:243:  vm.setAssociation(association());
tests/r3-0c-comparison-workspace.test.js:248:  chk('N1 metricAvailability.entry_delta = false (phase gate)', s.metricAvailability.entry_delta === false);
tests/r3-0c-comparison-workspace.test.js:249:  chk('N2 metricAvailability.mid_delta = false (phase gate)', s.metricAvailability.mid_delta === false);
tests/r3-0c-comparison-workspace.test.js:250:  chk('N3 metricAvailability.exit_delta = false (phase gate)', s.metricAvailability.exit_delta === false);
renderer/js/r3-0c-comparison-viewmodel.js:11: * and reads getState() during render. setReference / setComparison / setAssociation /
renderer/js/r3-0c-comparison-viewmodel.js:14: * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
renderer/js/r3-0c-comparison-viewmodel.js:21:    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
renderer/js/r3-0c-comparison-viewmodel.js:34:  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
renderer/js/r3-0c-comparison-viewmodel.js:57:      latestToken: 0,          // last token issued (commit gate)
renderer/js/r3-0c-comparison-viewmodel.js:72:    function _clearAndPlaceholder(triggerName) {
renderer/js/r3-0c-comparison-viewmodel.js:73:      // Codex C7 finding C7-A1 closure: advance latestToken on EVERY trigger so that any
renderer/js/r3-0c-comparison-viewmodel.js:76:      // leave latestToken unchanged, allowing a delayed eligible response to overwrite the
renderer/js/r3-0c-comparison-viewmodel.js:78:      _state.latestToken = _state.latestToken + 1;
renderer/js/r3-0c-comparison-viewmodel.js:99:      if (VST.isResultStale(response.generationToken, _state.latestToken)) return;
renderer/js/r3-0c-comparison-viewmodel.js:126:        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
renderer/js/r3-0c-comparison-viewmodel.js:128:        if (DMC.PHASE_SCOPE_METRICS.indexOf(cn) !== -1 && !caps.phaseBoundaryContractEnabled) {
renderer/js/r3-0c-comparison-viewmodel.js:151:      // viewmodel counter — what matters is that this viewmodel commit checks `latestToken`.)
renderer/js/r3-0c-comparison-viewmodel.js:152:      _state.latestToken += 1;
renderer/js/r3-0c-comparison-viewmodel.js:153:      var thisToken = _state.latestToken;
renderer/js/r3-0c-comparison-viewmodel.js:165:      // The orchestrator returned synchronously. If the viewmodel's latestToken has already
renderer/js/r3-0c-comparison-viewmodel.js:171:        if (responseWithLocalToken.generationToken !== _state.latestToken) return; // stale
renderer/js/r3-0c-comparison-viewmodel.js:206:        requestedMetrics: ['lap_time', 'delta_cumulative', 'sector_delta'].concat(caps.phaseBoundaryContractEnabled ? ['entry_delta', 'mid_delta', 'exit_delta'] : []),
renderer/js/r3-0c-comparison-viewmodel.js:207:        policy: caps.phaseBoundaryContractEnabled ? { deltaSign: 'comparison_minus_reference', phaseBoundaryAuthorisation: { contractRef: 'r3.0c/phase-boundary-test-fixture', serviceOwned: true, deterministic: true } } : { deltaSign: 'comparison_minus_reference' },
renderer/js/r3-0c-comparison-viewmodel.js:212:    function setReference(sel) { _clearAndPlaceholder('reference_selection_changed'); _state.reference = _isPlain(sel) ? Object.freeze(Object.assign({}, sel)) : null; _runRequest(); }
renderer/js/r3-0c-comparison-viewmodel.js:213:    function setComparison(sel) { _clearAndPlaceholder('comparison_selection_changed'); _state.comparison = _isPlain(sel) ? Object.freeze(Object.assign({}, sel)) : null; _runRequest(); }
renderer/js/r3-0c-comparison-viewmodel.js:214:    function setAssociation(assoc) {
renderer/js/r3-0c-comparison-viewmodel.js:215:      _clearAndPlaceholder('case_association_changed');
renderer/js/r3-0c-comparison-viewmodel.js:223:        // pass through THIS authoritative path; a caller bypassing setAssociation cannot get a
renderer/js/r3-0c-comparison-viewmodel.js:225:        if (typeof orch.registerAuthenticCaseRecord === 'function') {
renderer/js/r3-0c-comparison-viewmodel.js:226:          try { orch.registerAuthenticCaseRecord(_state.caseRecord); } catch (e) { /* no-op */ }
renderer/js/r3-0c-comparison-viewmodel.js:233:    function setChannelMapping(mapping) { _clearAndPlaceholder('channel_mapping_changed'); _state.channelMapping = _isPlain(mapping) ? Object.freeze(Object.assign({}, mapping)) : null; _runRequest(); }
renderer/js/r3-0c-comparison-viewmodel.js:234:    function notifyCaseReopen() { _clearAndPlaceholder('case_reopen'); _state.reference = null; _state.comparison = null; _state.association = null; _state.channelMapping = null; _state.caseRecord = null; }
renderer/js/r3-0c-comparison-viewmodel.js:235:    function notifyAuthorityRevoked() { _clearAndPlaceholder('user_confirmed_authority_revoked'); }
renderer/js/r3-0c-comparison-viewmodel.js:236:    function notifyEligibilityRevoked() { _clearAndPlaceholder('orchestrator_eligibility_revoked'); }
renderer/js/r3-0c-comparison-viewmodel.js:251:        latestToken: _state.latestToken,
renderer/js/r3-0c-comparison-viewmodel.js:260:      setAssociation: setAssociation,
renderer/js/r3-0c-comparison-viewmodel.js:275:  if (root) root.R3_0C_ComparisonViewModel = api;
governance/r3.0c/capabilities.json:72:    "phase_boundary_contract": {
governance/r3.0c/capabilities.json:76:      "description": "CP1 round-2 retrofit (cp1-retrofit-matrix.md F6). Service-owned deterministic phase-boundary contract authorising the three phase delta metrics (entry_delta, mid_delta, exit_delta). Disabled at C5R: any production caller requesting a phase metric without a registered, service-owned, deterministic phase-boundary authorisation MUST be refused with PHASE_BOUNDARY_CONTRACT_UNAUTHORISED. Test fixtures may declare a test-only authorisation (contractRef = 'r3.0c/phase-boundary-test-fixture') strictly inside test files; a governance test asserts no renderer/js path supplies a phase-boundary authorisation while this capability is disabled."
contracts/r3.0c/framing-i18n-key-registry.js:23:  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
contracts/r3.0c/framing-i18n-key-registry.js:25:  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
contracts/r3.0c/framing-i18n-key-registry.js:61:    'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised',
contracts/r3.0c/framing-i18n-key-registry.js:75:  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
contracts/r3.0c/framing-i18n-key-registry.js:77:  function _safeOwnKeys(o) { try { return Reflect && typeof Reflect.ownKeys === 'function' ? Reflect.ownKeys(o) : Object.keys(o); } catch (e) { return null; } }
contracts/r3.0c/framing-i18n-key-registry.js:78:  function _safeGet(o, k) { try { return o[k]; } catch (e) { return undefined; } }
contracts/r3.0c/framing-i18n-key-registry.js:81:    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
contracts/r3.0c/framing-i18n-key-registry.js:123:      var reasonCode = _safeGet(entry, 'reasonCode');
contracts/r3.0c/framing-i18n-key-registry.js:125:      var i18nKey = _safeGet(entry, 'i18nKey');
contracts/r3.0c/framing-i18n-key-registry.js:127:      var paramsRaw = _safeGet(entry, 'params');
contracts/r3.0c/framing-i18n-key-registry.js:128:      if (paramsRaw !== undefined) {
contracts/r3.0c/framing-i18n-key-registry.js:129:        if (!_isPlain(paramsRaw)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params not a plain object' };
contracts/r3.0c/framing-i18n-key-registry.js:130:        var pks = _safeOwnKeys(paramsRaw);
contracts/r3.0c/framing-i18n-key-registry.js:135:          var v = _safeGet(paramsRaw, k);
contracts/r3.0c/framing-i18n-key-registry.js:143:    } catch (e) {
renderer/js/r3-0c-comparison-orchestrator.js:19: * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
renderer/js/r3-0c-comparison-orchestrator.js:22: * UI can render the phase cards as unavailable.
renderer/js/r3-0c-comparison-orchestrator.js:31: * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
renderer/js/r3-0c-comparison-orchestrator.js:40:    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
renderer/js/r3-0c-comparison-orchestrator.js:41:    try { DeltaMetricsService = require('./r3-0c-delta-metrics.js'); } catch (e) { DeltaMetricsService = null; }
renderer/js/r3-0c-comparison-orchestrator.js:42:    try { ComparisonExportService = require('./r3-0c-comparison-export.js'); } catch (e) { ComparisonExportService = null; }
renderer/js/r3-0c-comparison-orchestrator.js:46:  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
renderer/js/r3-0c-comparison-orchestrator.js:60:  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
renderer/js/r3-0c-comparison-orchestrator.js:70:   *     { phaseBoundaryContractEnabled:bool, viewmodelStateTransitionContractEnabled:bool,
renderer/js/r3-0c-comparison-orchestrator.js:93:    // task); for unit tests + manual integration, the explicit registerAuthenticCaseRecord
renderer/js/r3-0c-comparison-orchestrator.js:97:    function registerAuthenticCaseRecord(caseRecord) {
renderer/js/r3-0c-comparison-orchestrator.js:102:      try { if (!Object.isFrozen(caseRecord)) Object.freeze(caseRecord); } catch (e) { /* no-op */ }
renderer/js/r3-0c-comparison-orchestrator.js:103:      try { if (_isPlain(caseRecord.associations) && !Object.isFrozen(caseRecord.associations)) Object.freeze(caseRecord.associations); } catch (e) { /* no-op */ }
renderer/js/r3-0c-comparison-orchestrator.js:104:      if (_authenticCaseRecords) { try { _authenticCaseRecords.add(caseRecord); } catch (e) { return false; } }
renderer/js/r3-0c-comparison-orchestrator.js:110:      try { return _authenticCaseRecords.has(caseRecord); } catch (e) { return false; }
renderer/js/r3-0c-comparison-orchestrator.js:178:     *   deltaMetricsRequest,                           // C5 service input (sans phase trio)
renderer/js/r3-0c-comparison-orchestrator.js:196:        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not registered via registerAuthenticCaseRecord — caller-controlled case authority refused', null, token);
renderer/js/r3-0c-comparison-orchestrator.js:211:      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
renderer/js/r3-0c-comparison-orchestrator.js:215:      var phaseMetricRequested = false;
renderer/js/r3-0c-comparison-orchestrator.js:216:      if (!caps.phaseBoundaryContractEnabled) {
renderer/js/r3-0c-comparison-orchestrator.js:217:        var phaseSet = DMC.PHASE_SCOPE_METRICS;
renderer/js/r3-0c-comparison-orchestrator.js:219:          if (phaseSet.indexOf(m) !== -1) { phaseMetricRequested = true; return false; }
renderer/js/r3-0c-comparison-orchestrator.js:225:          delete pol.phaseBoundaryAuthorisation;
renderer/js/r3-0c-comparison-orchestrator.js:232:        return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'no requested metrics after phase gate', null, token);
renderer/js/r3-0c-comparison-orchestrator.js:245:      var framing = _buildFraming(dmResult, phaseMetricRequested, input.framing);
renderer/js/r3-0c-comparison-orchestrator.js:253:        limitations: Object.freeze(phaseMetricRequested ? [CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED] : []),
renderer/js/r3-0c-comparison-orchestrator.js:257:    function _buildFraming(dmResult, phaseMetricRequested, callerFraming) {
renderer/js/r3-0c-comparison-orchestrator.js:269:      if (phaseMetricRequested) cannotDistinguish.push({ reasonCode: CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED, i18nKey: 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised' });
renderer/js/r3-0c-comparison-orchestrator.js:324:      registerAuthenticCaseRecord: registerAuthenticCaseRecord,
renderer/js/r3-0c-comparison-orchestrator.js:338:  if (root) root.R3_0C_ComparisonOrchestrator = api;
governance/r3.0c/checkpoints/C7.json:61:    "stateAccessor": "app().comparisonVMState() — returns the viewmodel state or placeholder.idle default",
governance/r3.0c/checkpoints/C7.json:69:    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
governance/r3.0c/checkpoints/C7.json:78:    "phaseBoundaryContractEnabled": false
governance/r3.0c/checkpoints/C7.json:94:  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
renderer/index.html:256:  <!-- Phase cards — governance-locked while phase_boundary_contract.enabled === false. The
renderer/index.html:259:       phase-boundary derivation. -->
renderer/index.html:261:    <div data-r3c-c7-phase="entry"><div class="text-[11px] uppercase text-slate-500" x-text="t('ui.comp.metric.entry_delta')"></div></div>
renderer/index.html:262:    <div data-r3c-c7-phase="mid"><div class="text-[11px] uppercase text-slate-500" x-text="t('ui.comp.metric.mid_delta')"></div></div>
renderer/index.html:263:    <div data-r3c-c7-phase="exit"><div class="text-[11px] uppercase text-slate-500" x-text="t('ui.comp.metric.exit_delta')"></div></div>
renderer/index.html:3155:              <div class="text-[11px] text-slate-500"><span x-text="t('aw.phase.entry')"></span>: <span x-text="c.entry.sufficient ? tCode('aw.qual', c.entry.qualitative) : tCode('aw.reason', c.entry.reason)"></span> &middot; <span x-text="t('aw.phase.mid')"></span>: <span x-text="c.mid.sufficient ? tCode('aw.qual', c.mid.qualitative) : tCode('aw.reason', c.mid.reason)"></span> &middot; <span x-text="t('aw.phase.exit')"></span>: <span x-text="c.exit.sufficient ? tCode('aw.qual', c.exit.qualitative) : tCode('aw.reason', c.exit.reason)"></span></div>
renderer/index.html:3256:     placeholder.idle state — the three R3.0C feature IDs remain availability='deferred' until
renderer/index.html:3285:  // then the pane renders placeholder.idle. Codex C7 review focuses on the orchestrator +
renderer/index.html:3291:    return { placeholder: 'idle', reference: null, comparison: null, association: null, result: null, framing: null, blockedReasons: [], limitations: [], exportGate: false, metricAvailability: { lap_time: false, delta_cumulative: false, sector_delta: false, entry_delta: false, mid_delta: false, exit_delta: false }, latestToken: 0 };
renderer/index.html:3417:        if(p.indexOf('corrections_elevated_in_')===0) return this.t('aw.summary.corrections_elevated')+' '+p.slice(24).split('_').map(function(x){return self.tCode('aw.phase',x);}).join('/');
renderer/index.html:3913:    // globals are loaded. Capabilities mirror governance/r3.0c/capabilities.json — phase
renderer/index.html:3918:      if (typeof R3_0C_ComparisonOrchestrator !== 'undefined' && typeof R3_0C_ComparisonViewModel !== 'undefined') {
renderer/index.html:3919:        const caps = { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: true };
renderer/index.html:3920:        const _orch = R3_0C_ComparisonOrchestrator.createOrchestrator({ capabilities: caps });
renderer/index.html:3921:        this._r3cC7VM = R3_0C_ComparisonViewModel.createComparisonViewModel({ orchestrator: _orch, capabilities: caps });
renderer/index.html:3924:    } catch (e) { this._r3cC7VM = null; this._r3cC7Orch = null; }
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-jYhPHsDl' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-tyG70KuG' (errno=Operation not permitted)

codex
The first pass already reproduces three mandated blocker patterns: public authenticity registration plus automatic viewmodel registration, getter exceptions treated as absence, and silent initialization fallback. I’m checking browser loading and state-clearing completeness before finalizing findings.
exec
/bin/bash -lc "nl -ba renderer/index.html | sed -n '3240,3310p;3895,3935p' && rg -n \"<script["'^>]+src=" renderer/index.html | tail -40 && nl -ba renderer/js/r3-0c-comparison-viewmodel.js | sed -n '"'45,180p;205,270p' && nl -ba renderer/js/r3-0c-comparison-orchestrator.js | sed -n '80,120p;185,205p;315,330p' && nl -ba contracts/r3.0c/framing-i18n-key-registry.js | sed -n '70,150p' && jq '{currentCheckpoint,phaseStates}' governance/r3.0/train.json; jq '{enabledCapabilitiesAfter,status}' governance/r3.0c/checkpoints/C7.json; jq '.capabilities.phase_boundary_contract // .phase_boundary_contract' governance/r3.0c/capabilities.json" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
  3240	<script src="js/analysis-workspace.js"></script>
  3241	<script src="js/analysis-workspace-viewmodel.js"></script>
  3242	<script src="js/storage-backend.js"></script>
  3243	<script src="js/schema-migration.js"></script>
  3244	<script src="js/case-record-schema.js"></script>
  3245	<script src="js/case-store.js"></script>
  3246	<script src="js/session-store.js"></script>
  3247	<script src="js/case-library-viewmodel.js"></script>
  3248	<script src="js/feature-registry.js"></script>
  3249	<script src="js/feature-router.js"></script>
  3250	<!-- R3.0C C7 note: The Comparison Workspace orchestrator + viewmodel are NOT loaded via
  3251	     <script> tags in this checkpoint. The contracts/r3.0c/ directory is governance-classified
  3252	     NON-PRODUCTION (no UI consumer); the no-consumer validator forbids index.html from loading
  3253	     them, and the renderer service modules depend on the contracts global. Browser-side wiring
  3254	     of the C7 UMD stack is a follow-up integration task (likely via a bundler or a dedicated
  3255	     contracts-globals shim). At C7 the production pane is reachable via the deferred
  3256	     placeholder.idle state — the three R3.0C feature IDs remain availability='deferred' until
  3257	     C8_ACTIVATION, so this absence is consistent with the deferred-feature contract. -->
  3258	
  3259	<script src="js/vehicle-preset-usecases.js"></script>
  3260	<script src="js/vehicle-preset-viewmodel.js"></script>
  3261	<script src="js/case-shell.js"></script>
  3262	<script src="js/demo-analysis-case.js"></script>
  3263	<!-- R2.3 real-telemetry validation modules (dependency order) -->
  3264	<script src="js/telemetry-import-adapter.js"></script>
  3265	<script src="js/channel-mapping.js"></script>
  3266	<script src="js/calibration-registry.js"></script>
  3267	<script src="js/analysis-window.js"></script>
  3268	<script src="js/canonical-telemetry-session.js"></script>
  3269	<script src="js/analysis-case-export.js"></script>
  3270	<script>
  3271	const COLORS=['#38bdf8','#f472b6','#34d399','#facc15','#a78bfa','#fb923c','#22d3ee','#e879f9','#84cc16','#f87171'];
  3272	
  3273	// Telemetry CSV viewer (V1 Step 2B): heavy parsed arrays (9000×N values) live HERE, OUTSIDE Alpine's
  3274	// reactive proxy — only small view-models are exposed to Alpine. importToken cancels stale async reads.
  3275	const telemetryDataHolder = { session: null, importToken: 0, ro: null, lastW: null,
  3276	  layout: null, timeValues: null, timeIndex: null, laneReaders: null, cursorTime: null, selection: null,
  3277	  dragging: false, dragStartPx: null, dragCurrPx: null, pointerInside: false, raf: 0 };
  3278	// R3.0B: analysis working state incl. RAW telemetry (session/imported bundle) lives HERE, OUTSIDE Alpine's
  3279	// reactive proxy — Alpine holds only ids + small summaries. (No raw sample arrays in the reactive tree.)
  3280	const caseDataHolder = { lastCase: null, lastSession: null, lastSessionId: null, lastWindow: null, lastVmOpts: null, importedBundle: null, caseStore: null, sessionStore: null, sessionOpToken: 0, sessionPersistPromise: null, autosaveTimer: 0 };
  3281	
  3282	function app(){return{
  3283	  // === R3.0C C7 Comparison Workspace state accessor (placeholder-only initial state). ===
  3284	  // The viewmodel + orchestrator are instantiated by init() when their UMD globals load; until
  3285	  // then the pane renders placeholder.idle. Codex C7 review focuses on the orchestrator +
  3286	  // viewmodel implementation and contracts, not the HTML wiring breadth — full data feeds
  3287	  // (case-store, session-store linkage) land in follow-up work.
  3288	  _r3cC7VM: null,
  3289	  comparisonVMState(){
  3290	    if (this._r3cC7VM && typeof this._r3cC7VM.getState === 'function') return this._r3cC7VM.getState();
  3291	    return { placeholder: 'idle', reference: null, comparison: null, association: null, result: null, framing: null, blockedReasons: [], limitations: [], exportGate: false, metricAvailability: { lap_time: false, delta_cumulative: false, sector_delta: false, entry_delta: false, mid_delta: false, exit_delta: false }, latestToken: 0 };
  3292	  },
  3293	  // === R2.2 Analysis Workspace (consumes production service output via the pure view-model builder) ===
  3294	  analysisView: null,
  3295	  analysisError: null,
  3296	  loadDemoAnalysisCase(){
  3297	    try {
  3298	      if (typeof DemoAnalysisCase==='undefined' || typeof AnalysisWorkspace==='undefined' || typeof AnalysisWorkspaceViewModel==='undefined'){ this.analysisError='modules_not_loaded'; this.analysisView=null; this._shellEvidence=null; return; }
  3299	      const demo = DemoAnalysisCase.buildDemoAnalysisCase();
  3300	      const ws = AnalysisWorkspace.runAnalysisWorkspace(demo.analysisCase, demo.telemetrySession, demo.window, {}); // global Tier1BasicBalance as the model runner
  3301	      caseDataHolder.lastCase = demo.analysisCase; caseDataHolder.lastSession = demo.telemetrySession; caseDataHolder.lastWindow = demo.window; caseDataHolder.lastVmOpts = { suspensionNormalizationView: demo.suspensionNormalizationView }; this._persistSession(demo.telemetrySession);
  3302	      this.analysisView = AnalysisWorkspaceViewModel.buildAnalysisWorkspaceViewModel(ws, demo.analysisCase, { suspensionNormalizationView: demo.suspensionNormalizationView }); this._shellEvidence=this._mkShellEvidence(ws,'demo_case');
  3303	      this.analysisError = null;
  3304	    } catch(e){ this.analysisError = String((e&&e.message)||e); this.analysisView=null; this._shellEvidence=null; }
  3305	  },
  3306	  // R2.3 import workflow — UI calls services only; no physics recompute, no UI-side capability derivation
  3307	  importCsvText: '',
  3308	  importError: null,
  3309	  importSteeringRatio: '',
  3310	  importSteeringConfirmed: false,
  3895	  },
  3896	  switchPressureUnit(u){ this.pressureUnit=u; },
  3897	
  3898	  tendencyColor(t){
  3899	    if(t==='Understeer') return 'text-red-400';
  3900	    if(t==='Oversteer') return 'text-sky-400';
  3901	    return 'text-green-400';
  3902	  },
  3903	  gripColor(v){
  3904	    if(!v) return 'text-slate-400';
  3905	    if(v>=0.95) return 'text-green-400';
  3906	    if(v>=0.85) return 'text-yellow-400';
  3907	    return 'text-red-400';
  3908	  },
  3909	
  3910	  init(){
  3911	    this.tireOptions = api.getTires();
  3912	    // R3.0C C7 Comparison Workspace: instantiate the orchestrator + viewmodel once the UMD
  3913	    // globals are loaded. Capabilities mirror governance/r3.0c/capabilities.json — phase
  3914	    // boundary contract remains disabled at C7. The viewmodel is stored in a non-reactive
  3915	    // holder (_r3cC7VM) so async commits never trigger Alpine reactive re-derivation during
  3916	    // an in-flight comparison. Codex C7 finding C7-J1 closure.
  3917	    try {
  3918	      if (typeof R3_0C_ComparisonOrchestrator !== 'undefined' && typeof R3_0C_ComparisonViewModel !== 'undefined') {
  3919	        const caps = { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: true };
  3920	        const _orch = R3_0C_ComparisonOrchestrator.createOrchestrator({ capabilities: caps });
  3921	        this._r3cC7VM = R3_0C_ComparisonViewModel.createComparisonViewModel({ orchestrator: _orch, capabilities: caps });
  3922	        this._r3cC7Orch = _orch;
  3923	      }
  3924	    } catch (e) { this._r3cC7VM = null; this._r3cC7Orch = null; }
  3925	  },
  3926	
  3927	  // === OEM Specs 統一介面 ===
  3928	  getOemSpecs(){
  3929	    if(this.streetCarDetail?.oem_tire_specs) return this.streetCarDetail.oem_tire_specs;
  3930	    if(this.proOem.enabled) return {
  3931	      front:{width:this.proOem.front_width, aspect:this.proOem.front_aspect, rim:this.proOem.front_rim},
  3932	      rear:{width:this.proOem.rear_width, aspect:this.proOem.rear_aspect, rim:this.proOem.rear_rim},
  3933	    };
  3934	    return null;
  3935	  },
3219:<script src="js/bms-measured-extraction-harness.js"></script>
3220:<script src="js/bms-canonical-adapter-eligibility.js"></script>
3221:<script src="js/bms-private-corpus-boundary.js"></script>
3222:<script src="js/bms-sanitized-evidence-adapter.js"></script>
3223:<script src="js/bms-channel-dictionary.js"></script>
3225:<script src="js/canonical-parameters.js"></script>
3226:<script src="js/parameter-conversions.js"></script>
3227:<script src="js/setup-snapshot.js"></script>
3228:<script src="js/analysis-case.js"></script>
3229:<script src="js/suspension-input-normalizer.js"></script>
3230:<script src="js/canonical-model-input.js"></script>
3231:<script src="js/analysis-execution.js"></script>
3232:<script src="js/setup-ab.js"></script>
3233:<script src="js/quantitative-setup-recommendation.js"></script>
3234:<script src="js/telemetry-observation.js"></script>
3235:<script src="js/measured-metrics.js"></script>
3236:<script src="js/model-telemetry-comparison.js"></script>
3237:<script src="js/race-engineer-insight.js"></script>
3238:<script src="js/driver-coach-insight.js"></script>
3239:<script src="js/track-intelligence.js"></script>
3240:<script src="js/analysis-workspace.js"></script>
3241:<script src="js/analysis-workspace-viewmodel.js"></script>
3242:<script src="js/storage-backend.js"></script>
3243:<script src="js/schema-migration.js"></script>
3244:<script src="js/case-record-schema.js"></script>
3245:<script src="js/case-store.js"></script>
3246:<script src="js/session-store.js"></script>
3247:<script src="js/case-library-viewmodel.js"></script>
3248:<script src="js/feature-registry.js"></script>
3249:<script src="js/feature-router.js"></script>
3259:<script src="js/vehicle-preset-usecases.js"></script>
3260:<script src="js/vehicle-preset-viewmodel.js"></script>
3261:<script src="js/case-shell.js"></script>
3262:<script src="js/demo-analysis-case.js"></script>
3264:<script src="js/telemetry-import-adapter.js"></script>
3265:<script src="js/channel-mapping.js"></script>
3266:<script src="js/calibration-registry.js"></script>
3267:<script src="js/analysis-window.js"></script>
3268:<script src="js/canonical-telemetry-session.js"></script>
3269:<script src="js/analysis-case-export.js"></script>
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
   218	        var cr = Object.assign({}, assoc.caseRecord);
   219	        if (_isPlain(assoc.caseRecord.associations)) cr.associations = Object.assign({}, assoc.caseRecord.associations);
   220	        _state.caseRecord = cr;
   221	        // Codex C7 finding C7-D1: the viewmodel registers the caseRecord with the orchestrator
   222	        // before any request can fire. The orchestrator's WeakSet only accepts records that
   223	        // pass through THIS authoritative path; a caller bypassing setAssociation cannot get a
   224	        // forged caseRecord into the orchestrator.
   225	        if (typeof orch.registerAuthenticCaseRecord === 'function') {
   226	          try { orch.registerAuthenticCaseRecord(_state.caseRecord); } catch (e) { /* no-op */ }
   227	        }
   228	      } else {
   229	        _state.caseRecord = null;
   230	      }
   231	      _runRequest();
   232	    }
   233	    function setChannelMapping(mapping) { _clearAndPlaceholder('channel_mapping_changed'); _state.channelMapping = _isPlain(mapping) ? Object.freeze(Object.assign({}, mapping)) : null; _runRequest(); }
   234	    function notifyCaseReopen() { _clearAndPlaceholder('case_reopen'); _state.reference = null; _state.comparison = null; _state.association = null; _state.channelMapping = null; _state.caseRecord = null; }
   235	    function notifyAuthorityRevoked() { _clearAndPlaceholder('user_confirmed_authority_revoked'); }
   236	    function notifyEligibilityRevoked() { _clearAndPlaceholder('orchestrator_eligibility_revoked'); }
   237	
   238	    // ── Read-only state accessor ──
   239	    function getState() {
   240	      return Object.freeze({
   241	        placeholder: _state.placeholder,
   242	        reference: _state.reference,
   243	        comparison: _state.comparison,
   244	        association: _state.association,
   245	        result: _state.result,
   246	        framing: _state.framing,
   247	        blockedReasons: _state.blockedReasons.slice(),
   248	        limitations: _state.limitations.slice(),
   249	        exportGate: _state.exportGate,
   250	        metricAvailability: Object.assign({}, _state.metricAvailability),
   251	        latestToken: _state.latestToken,
   252	      });
   253	    }
   254	
   255	    return Object.freeze({
   256	      SERVICE_VERSION: SERVICE_VERSION,
   257	      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
   258	      setReference: setReference,
   259	      setComparison: setComparison,
   260	      setAssociation: setAssociation,
   261	      setChannelMapping: setChannelMapping,
   262	      notifyCaseReopen: notifyCaseReopen,
   263	      notifyAuthorityRevoked: notifyAuthorityRevoked,
   264	      notifyEligibilityRevoked: notifyEligibilityRevoked,
   265	      getState: getState,
   266	    });
   267	  }
   268	
   269	  var api = {
   270	    SERVICE_VERSION: SERVICE_VERSION,
    80	    var caps = _isPlain(deps.capabilities) ? deps.capabilities : null;
    81	    if (!caps) throw new Error('createOrchestrator requires capabilities snapshot');
    82	    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
    83	    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.
    84	
    85	    var _generationCounter = 0;
    86	    function _nextToken() { _generationCounter = _generationCounter + 1; return _generationCounter; }
    87	    function currentToken() { return _generationCounter; }
    88	
    89	    // Codex C7 finding C7-D1 closure: case binding required a caller-controlled caseRecord
    90	    // matched against caller-controlled association — self-consistent forgery passed. The fix is
    91	    // an orchestrator-private WeakSet of case records that have been REGISTERED via an
    92	    // authoritative path. The expected caller is the R3.0B case-store integration (a follow-up
    93	    // task); for unit tests + manual integration, the explicit registerAuthenticCaseRecord
    94	    // entrypoint registers a freshly-loaded caseRecord. Any caseRecord that did NOT pass through
    95	    // this entry point is refused at requestComparison time.
    96	    var _authenticCaseRecords = (typeof WeakSet !== 'undefined') ? new WeakSet() : null;
    97	    function registerAuthenticCaseRecord(caseRecord) {
    98	      if (!_isPlain(caseRecord)) return false;
    99	      // Defensive freeze so the registered object cannot be mutated post-registration to swap
   100	      // associations under the orchestrator. Shallow freeze is sufficient because the
   101	      // associations sub-object is also frozen by the case-store boundary (R3.0B convention).
   102	      try { if (!Object.isFrozen(caseRecord)) Object.freeze(caseRecord); } catch (e) { /* no-op */ }
   103	      try { if (_isPlain(caseRecord.associations) && !Object.isFrozen(caseRecord.associations)) Object.freeze(caseRecord.associations); } catch (e) { /* no-op */ }
   104	      if (_authenticCaseRecords) { try { _authenticCaseRecords.add(caseRecord); } catch (e) { return false; } }
   105	      return true;
   106	    }
   107	    function isAuthenticCaseRecord(caseRecord) {
   108	      if (!_authenticCaseRecords) return false;
   109	      if (!_isPlain(caseRecord)) return false;
   110	      try { return _authenticCaseRecords.has(caseRecord); } catch (e) { return false; }
   111	    }
   112	
   113	    function _blockedResponse(reasonCodes, detail, framing, token) {
   114	      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
   115	      if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
   116	      return Object.freeze({
   117	        status: 'blocked',
   118	        reasonCodes: Object.freeze(arr.slice()),
   119	        limitations: Object.freeze([]),
   120	        framing: _validateFramingOrFallback(framing),
   185	      var token = _nextToken();
   186	      if (!caps.framingSourceStructuredContractEnabled || !caps.viewmodelStateTransitionContractEnabled) {
   187	        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'framing or viewmodel-state-transition capability disabled', null, token);
   188	      }
   189	      if (!_isPlain(input)) return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'input not a plain object', null, token);
   190	
   191	      // 1. case authenticity (Codex C7 finding C7-D1): the caseRecord MUST have been registered
   192	      //    via the authoritative entrypoint. A literal-built caseRecord (even one whose
   193	      //    associations consistently match the caller-supplied association + eligibility
   194	      //    identities) fails closed here.
   195	      if (!isAuthenticCaseRecord(input.caseRecord)) {
   196	        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not registered via registerAuthenticCaseRecord — caller-controlled case authority refused', null, token);
   197	      }
   198	
   199	      // 2. case ↔ context binding (F4)
   200	      var bindCheck = CE.validateComparisonContextAgainstCase(input.caseRecord, input.association);
   201	      if (bindCheck && bindCheck.valid !== true) {
   202	        return _blockedResponse(bindCheck.reasonCodes ? bindCheck.reasonCodes.slice() : [CODES.TRACK_IDENTITY_MISMATCH], 'case/context binding failed', null, token);
   203	      }
   204	
   205	      // 2. composite eligibility (F5 identity + lap + credibility)
   315	        },
   316	      });
   317	    }
   318	
   319	    return Object.freeze({
   320	      SERVICE_VERSION: SERVICE_VERSION,
   321	      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
   322	      SIGN_FORMULA: SIGN_FORMULA,
   323	      currentToken: currentToken,
   324	      registerAuthenticCaseRecord: registerAuthenticCaseRecord,
   325	      isAuthenticCaseRecord: isAuthenticCaseRecord,
   326	      requestComparison: requestComparison,
   327	      exportComparison: exportComparison,
   328	    });
   329	  }
   330	
    70	  // Bound a structurally valid framing-entry per FRAMING_KEY_SHAPE (already exposed on the
    71	  // comparison-eligibility contract) AND the i18nKey appears in the registry above.
    72	  // Adversarial: per-string UTF-8 byte cap of 256 on every param value (mirrors the F12 contract).
    73	  var MAX_PARAM_STRING_BYTES = 256;
    74	
    75	  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
    76	  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
    77	  function _safeOwnKeys(o) { try { return Reflect && typeof Reflect.ownKeys === 'function' ? Reflect.ownKeys(o) : Object.keys(o); } catch (e) { return null; } }
    78	  function _safeGet(o, k) { try { return o[k]; } catch (e) { return undefined; } }
    79	  function _utf8ByteLength(s) {
    80	    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
    81	    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
    82	    var n = 0;
    83	    for (var i = 0; i < s.length; i++) {
    84	      var c = s.charCodeAt(i);
    85	      if (c < 0x80) n += 1;
    86	      else if (c < 0x800) n += 2;
    87	      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
    88	      else n += 3;
    89	    }
    90	    return n;
    91	  }
    92	
    93	  /**
    94	   * isRegisteredFramingI18nKey(key) — closed allowlist check. Anything outside fails.
    95	   */
    96	  function isRegisteredFramingI18nKey(key) {
    97	    return typeof key === 'string' && FRAMING_I18N_KEY_REGISTRY.indexOf(key) !== -1;
    98	  }
    99	
   100	  /**
   101	   * validateFramingEntry(entry) — structural + registry gate.
   102	   *   • entry must be a plain object owning ONLY {reasonCode, i18nKey, params?} keys
   103	   *   • reasonCode ∈ REASON_CODES
   104	   *   • i18nKey ∈ FRAMING_I18N_KEY_REGISTRY
   105	   *   • params, when present, plain object whose values are finite numbers / booleans / null /
   106	   *     strings ≤ MAX_PARAM_STRING_BYTES. No arrays / exotic objects / functions / symbols.
   107	   *
   108	   * Returns { valid:true } or { valid:false, reasonCode, detail }.
   109	   */
   110	  function validateFramingEntry(entry) {
   111	    try {
   112	      if (!_isPlain(entry)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry not a plain object' };
   113	      // Codex C7 finding C7-F1 closure: use Reflect.ownKeys so non-enumerable + Symbol-keyed extras
   114	      // are detected. Object.keys missed both.
   115	      var keys = _safeOwnKeys(entry);
   116	      if (keys === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry own-key enumeration threw (Proxy)' };
   117	      var ALLOWED = { reasonCode: true, i18nKey: true, params: true };
   118	      for (var i = 0; i < keys.length; i++) {
   119	        var key = keys[i];
   120	        if (typeof key !== 'string') return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has non-string (e.g. Symbol) own-key' };
   121	        if (!ALLOWED[key]) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing entry has unknown key: ' + String(key).slice(0, 60) };
   122	      }
   123	      var reasonCode = _safeGet(entry, 'reasonCode');
   124	      if (!RC.isReasonCode(reasonCode)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing reasonCode unregistered' };
   125	      var i18nKey = _safeGet(entry, 'i18nKey');
   126	      if (!isRegisteredFramingI18nKey(i18nKey)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing i18nKey not in registry' };
   127	      var paramsRaw = _safeGet(entry, 'params');
   128	      if (paramsRaw !== undefined) {
   129	        if (!_isPlain(paramsRaw)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params not a plain object' };
   130	        var pks = _safeOwnKeys(paramsRaw);
   131	        if (pks === null) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params own-key enumeration threw (Proxy)' };
   132	        for (var j = 0; j < pks.length; j++) {
   133	          var k = pks[j];
   134	          if (typeof k !== 'string' || k.length === 0) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has empty / non-string (e.g. Symbol) key' };
   135	          var v = _safeGet(paramsRaw, k);
   136	          if (v === null || typeof v === 'boolean') continue;
   137	          if (typeof v === 'number') { if (!_isFiniteNum(v)) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has non-finite number' }; continue; }
   138	          if (typeof v === 'string') { if (_utf8ByteLength(v) > MAX_PARAM_STRING_BYTES) return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has oversized string' }; continue; }
   139	          return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing params has unsupported value type' };
   140	        }
   141	      }
   142	      return { valid: true };
   143	    } catch (e) {
   144	      // Codex C7 finding C7-B1 closure: any throw from a Proxy / accessor / inherited trap
   145	      // results in fail-closed at this top-level boundary.
   146	      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'framing validation threw — fail-closed' };
   147	    }
   148	  }
   149	
   150	  /**
{
  "currentCheckpoint": null,
  "phaseStates": {
    "R3.0C": {
      "governanceDir": "governance/r3.0c",
      "currentCheckpoint": "C7_UI",
      "finalActivationCheckpoint": "C8_ACTIVATION",
      "started": true,
      "finalActivationReached": false
    },
    "R3.0D": {
      "governanceDir": "governance/r3.0d",
      "currentCheckpoint": "D0_BOOTSTRAP",
      "finalActivationCheckpoint": "D5_ACTIVATION",
      "started": false,
      "finalActivationReached": false
    },
    "R3.0E": {
      "governanceDir": "governance/r3.0e",
      "currentCheckpoint": "E0_BOOTSTRAP",
      "finalActivationCheckpoint": "E5_ACTIVATION",
      "started": false,
      "finalActivationReached": false
    },
    "R3.0F": {
      "governanceDir": "governance/r3.0f",
      "currentCheckpoint": "F0_BOOTSTRAP",
      "finalActivationCheckpoint": "F6_RELEASE",
      "started": false,
      "finalActivationReached": false
    }
  }
}
{
  "enabledCapabilitiesAfter": [
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
  "status": "pending"
}
{
  "kind": "contract",
  "unlockFloor": "C5R_CP1_RETROFIT",
  "enabled": false,
  "description": "CP1 round-2 retrofit (cp1-retrofit-matrix.md F6). Service-owned deterministic phase-boundary contract authorising the three phase delta metrics (entry_delta, mid_delta, exit_delta). Disabled at C5R: any production caller requesting a phase metric without a registered, service-owned, deterministic phase-boundary authorisation MUST be refused with PHASE_BOUNDARY_CONTRACT_UNAUTHORISED. Test fixtures may declare a test-only authorisation (contractRef = 'r3.0c/phase-boundary-test-fixture') strictly inside test files; a governance test asserts no renderer/js path supplies a phase-boundary authorisation while this capability is disabled."
}

exec
/bin/bash -lc "sed -n '1,220p' tests/r3-0c-comparison-workspace.test.js && node - <<'NODE'
const F=require('./contracts/r3.0c/framing-i18n-key-registry.js');
const e={reasonCode:'INTERNAL_CONTRACT_VIOLATION',i18nKey:F.FRAMING_I18N_KEY_REGISTRY[0]};
Object.defineProperty(e,'params',{enumerable:true,configurable:true,get(){throw new Error('boom')}});
console.log('getter attack', F.validateFramingEntry(e));
NODE
npm test -- --runInBand" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 exited 1 in 4059ms:

[1] 軸側傾剛性 K = k_w·t²/2 (Milliken / Suspension Secrets)
  ✓ 前彈簧側傾剛性 = k·t²/2
  ✓ 輪胎串聯後總剛性 < 懸吊剛性

[2] Roll gradient 量級 (OptimumG: 街車 ~3-6°/g, 高下壓力賽車 0.2-0.7°/g)
  ✓ GT3 roll gradient 在 1.5-5 °/g 合理區間
  ✓ 軟彈簧 → roll gradient 更大

[3] ARB sizing 單位一致性 (Nm/deg)
  ✓ total_roll_needed ≈ m·g·h/target
  ✓ front_arb_needed 在現實範圍 (< 3000 Nm/deg)
  ✓ current_roll_gradient 在現實範圍 (< 15 °/g)

[4] 線性自行車模型 (Gillespie ch.6)
  ✓ 滑移角@1g 在 2-10° 物理範圍
  ✓ K_us = W_f/C_f − W_r/C_r
  ✓ 臨界速度 = √(g·L/|K_us|)
  ✓ K_us<0 時無特徵速度
  ✓ 超過臨界速度時 yaw gain = null
  ✓ 50/50 車 K_us ≈ 0

[5] 阻尼比 (OptimumG Tech Tip 2: 賽車 ζ ≈ 0.65-0.7)
  ✓ heave 阻尼比在 0.2-1.2 現實範圍
  ✓ 側傾阻尼比在 0.1-1.5 現實範圍
  ✓ 參考速度加倍 → ζ 減半

[6] 空力方向 (front-biased downforce → 高速轉向過度)
  ✓ 前偏空力 → aero_us_shift < 0 (轉向過度)
  ✓ 後偏空力 → aero_us_shift > 0 (轉向不足)

[7] Toe 慣例 (+ = toe-in)
  ✓ 前 toe-in → 更轉向不足
  ✓ 後 toe-in → 更轉向不足(穩定)

[8] Cross weight (FL+RR 分析對角，作者刻意設計)
  ✓ cross = (FL+RR)/total

[9] Flat ride 規則 (Olley: 後/前 ≈ 1.10-1.20)
  ✓ 後/前比值過低觸發建議
  ✓ 目標比值 = 1.10 (後高於前)
  ✓ 建議調整「後」彈簧

[10] 輪胎垂直彈簧率估算 (實測校準)
  ✓ 255/40 估算 ≈ 250 N/mm (±10%)
  ✓ 205/55 ≈ 220 N/mm 基準
  ✓ 胎壓越高剛性越高
  ✓ 295/30 在 250-320 N/mm 合理範圍

[11] Pacejka 模型
  ✓ C_α 峰值在 Fz = a4
  ✓ -3° camber 降低 C_α < 3%
  ✓ 峰值 μ 在 0.8-1.3

[12] Load sensitivity 形狀
  ✓ Fz=Fz0 時 = 1.0 (峰值)
  ✓ Fz>Fz0 時下降

[13] 縱向荷重轉移 ΔW = W·a·h/L (Gillespie)
  ✓ 1g 煞車轉移量

[14] 全車種資料庫掃描（Tier 1 輸出健全性）
  ✓ 501 台車全部輸出在物理合理範圍

[15] Pacejka 荷重敏感度膝點隨車重校準 (a4 scaling)
  ✓ GT3 臨界速度不再低得離譜 (>90 km/h 或無)
  ✓ 62/38 前重車 → K_us > 0 (轉向不足)
  ✓ 有角落重量時軸荷重以磅秤值為準

[16] 阻尼參考速度防呆 (0/''/負值 → 退回 0.3)
  ✓ damper_ref_speed=0 → ζ 有限且等於 0.3 預設
  ✓ damper_ref_speed="" → ζ 有限且等於 0.3 預設
  ✓ damper_ref_speed=-1 → ζ 有限且等於 0.3 預設
  ✓ damper_ref_speed=null → ζ 有限且等於 0.3 預設
  ✓ damper_ref_speed=undefined → ζ 有限且等於 0.3 預設

[17] arbSizing 輪胎柔度補償（軸級閉合）
  ✓ series(spring+ARB, tire) 總和 = 所需總剛性
  ✓ 無輪胎參數時維持舊行為

[18] 統一機械平衡 (Tier1 understeer_gradient, deg/g) — 配重 + LLTD
  ✓ 車頭重(62%F) → 轉向不足 (US>0)
  ✓ 50/50 → 近中性 (|US|<0.3)
  ✓ 車尾重(40%F) → 轉向過度 (US<0)
  ✓ 配重單調: 62%F 比 50%F 更US, 40%F 更OS
  ✓ US 在 deg/g 合理範圍 (|US|<8)
  ✓ 前 ARB 硬 → 轉向不足方向
  ✓ 後 ARB 硬 → 轉向過度方向
  ✓ 前硬 vs 後硬 方向相反且對稱

[19] 預設車庫傾向分佈合理性 (回歸「全部轉向過度」bug)
  ✓ OS 不超過 50% (修正前幾乎全 OS)
  ✓ 三種傾向都有合理數量(各>10%)
  ✓ FF 前驅車 轉向不足 > 轉向過度 (物理正確)

[20] 麗寶單圈模擬器 — GG 點質量 lap sim
  ✓ 賽道段落總長 ≈ 3500m (±200)
  ✓ 改裝 GR Yaris 圈速 ≈ 110.9s (1:50, ±6s)
  ✓ 極速合理 (180-260 km/h)
  ✓ 抓地↑ → 圈速更快
  ✓ 動力↑ → 圈速更快
  ✓ 質量↑ → 圈速更慢

[21] 麗寶 stint 演化 — 胎壓甜蜜點 / 最快圈 / 退化
  ✓ 產生 12 圈逐圈資料
  ✓ 最快單圈時間字串格式 m:ss.mmm
  ✓ 甜蜜點在 stint 早段 (第1-5圈)
  ✓ 最快圈 ≈ 峰值抓地圈 (±1)
  ✓ 第1圈(冷胎)比最快圈慢
  ✓ 熱胎壓 > 冷胎壓 (升溫建壓)
  ✓ 建議冷胎壓 < 熱胎甜蜜點
  ✓ 峰值後抓地退化

[22] 胎種抓地排序 — 光頭胎應比街胎快 (回歸「光頭胎變慢」bug)
  ✓ 光頭軟胎 比 街胎(PS4S) 快
  ✓ 光頭軟胎 比 半熱熔(A052) 快
  ✓ 半熱熔 比 街胎 快
  ✓ 光頭胎在熱賽道達工作窗口 (峰值抓地>85%)
  ✓ tir: FNOMIN parsed
  ✓ tir: vertical stiffness → N/mm
  ✓ tir: dims (width) parsed
  ✓ tir: lateral coeff PCY1 parsed
  ✓ tir: comment stripped from value
  ✓ tir: ISO sign (α>0 → Fy<0)
  ✓ tir: Fy rises toward peak (|Fy(2°)|<|Fy(6°)|)
  ✓ tir: peak μ ≈ PDY1 (1.3–1.7)
  ✓ tir: optimal slip angle 3–12°
  ✓ tir: cornering stiffness > 0
  ✓ tir: load sensitivity (μ falls as Fz rises)
  ✓ tir: fyCurve generated (0–15°, |Fy| rises from ~0 toward peak)
  ✓ tir: imported tire feeds handling model (K_us shifts)
  ✓ tir: default prediction unaffected without tireModel
  ✓ tir: peak μ feeds lap-sim base_mu (override)
  ✓ tir: lap sim unaffected without tirePeakMu
  ✓ kin: roll-center height in 0–150mm
  ✓ kin: ride height (dz=0) returns static camber
  ✓ kin: camber gain negative (more neg camber in bump)
  ✓ kin: camber gain magnitude sane (<0.1°/mm)
  ✓ kin: camber curve smooth/monotonic (no branch-jump spike)
  ✓ kin: roll center migrates with travel
  ✓ ref: front-heavy car is more understeer (Milliken K_us)
  ✓ ref: stiffer front ARB → more understeer
  ✓ ref: stiffer rear ARB → less understeer (toward oversteer)
  ✓ ref: street sports-car roll gradient in 2–6°/g
  ✓ ref: ride frequency matches f=(1/2π)√(k_eff/m)
  ✓ ref: stiffer springs raise ride frequency
  ✓ trans: response is stable
  ✓ trans: yaw response time 0.05–0.6s
  ✓ trans: yaw-mode damping 0.3–1.2
  ✓ trans: yaw natural frequency 0.4–3Hz
  ✓ trans: steady yaw gain matches Gillespie V/(L+Kus·V²/g) (<5%)
  ✓ trans: invalid input returns null
  ✓ bms: header identifies DarabImporter
  ✓ bms: catalog finds all 3 channels
  ✓ bms: channel name/source/description parsed
  ✓ bms: detects validation channels (accy/yaw/steer)

[bmsid] D1-0B Bosch channel dictionary + identity card
  ✓ bmsid: card built from synthetic Darab catalog
  ✓ bmsid: format detected = Bosch WinDarab / DarabImporter
  ✓ bmsid: file identity carries name + size
  ✓ bmsid: source summary lists MS5.8 + C60
  ✓ bmsid: speed → vehicle_speed (high)
  ✓ bmsid: steer → steering_angle (high)
  ✓ bmsid: accy → lateral_acceleration (high)
  ✓ bmsid: accx → longitudinal_acceleration (high)
  ✓ bmsid: yaw → yaw_rate (high)
  ✓ bmsid: nmot → engine_rpm (high)
  ✓ bmsid: pbrake_f → brake_pressure_front (high)
  ✓ bmsid: pbrake_r → brake_pressure_rear (high)
  ✓ bmsid: vwheel_* → wheel_speed_FL/FR/RL/RR (high)
  ✓ bmsid: unmapped channel → unknown (no fail)
  ✓ bmsid: ugs NOT treated as gear value
  ✓ bmsid: ags_*_engine_speed NOT treated as engine_rpm (name-gated)
  ✓ bmsid: R_H_Front → ride_height, low-confidence inferred
  ✓ bmsid: Road_FL → road_suspension, low-confidence inferred
  ✓ bmsid: coverage marks vehicle_speed/yaw_rate found
  ✓ bmsid: coverage marks ride_height uncertain (low only)
  ✓ bmsid: forbidden caps all false (timeSeries/physicalValues/scaling/units/modelVsActual/kus/handlingAnalysis/setupFromRaw)
  ✓ bmsid: limitations pin presence-only / nothing decoded
  ✓ bmsid: null input → fail-closed (format null, caps false, 0 channels)

[cal] Calibration 層：常數值鎖定 (calibration.js)
  ✓ cal: CAL.US_NEUTRAL_BAND === 0.5
  ✓ cal: CALIBRATION.US_NEUTRAL_BAND.value 對齊 CAL.US_NEUTRAL_BAND
  ✓ cal: CAL.US_NORM_SCALE === 4
  ✓ cal: CALIBRATION.US_NORM_SCALE.value 對齊 CAL.US_NORM_SCALE
  ✓ cal: CAL.CORNERING_STIFFNESS_AY_REF_G === 1
  ✓ cal: CALIBRATION.CORNERING_STIFFNESS_AY_REF_G.value 對齊 CAL.CORNERING_STIFFNESS_AY_REF_G
  ✓ cal: CAL.TIRE_GRIP_TO_US_GRADIENT_GAIN === 14
  ✓ cal: CALIBRATION.TIRE_GRIP_TO_US_GRADIENT_GAIN.value 對齊 CAL.TIRE_GRIP_TO_US_GRADIENT_GAIN
  ✓ cal: CAL.WEIGHT_SHIFT_TO_US_GRADIENT === 0.2
  ✓ cal: CALIBRATION.WEIGHT_SHIFT_TO_US_GRADIENT.value 對齊 CAL.WEIGHT_SHIFT_TO_US_GRADIENT
  ✓ cal: CAL.TIRE_WIDTH_GRIP_REF_MM === 245
  ✓ cal: CALIBRATION.TIRE_WIDTH_GRIP_REF_MM.value 對齊 CAL.TIRE_WIDTH_GRIP_REF_MM
  ✓ cal: CAL.TIRE_WIDTH_GRIP_EXPONENT === 0.5
  ✓ cal: CALIBRATION.TIRE_WIDTH_GRIP_EXPONENT.value 對齊 CAL.TIRE_WIDTH_GRIP_EXPONENT
  ✓ cal: CAL.PRESSURE_GRIP_LOSS_PER_BAR === 0.2
  ✓ cal: CALIBRATION.PRESSURE_GRIP_LOSS_PER_BAR.value 對齊 CAL.PRESSURE_GRIP_LOSS_PER_BAR
  ✓ cal: CAL.LIHPAO_RADIUS_SCALE === 1.1
  ✓ cal: CALIBRATION.LIHPAO_RADIUS_SCALE.value 對齊 CAL.LIHPAO_RADIUS_SCALE
  ✓ cal: CAL.TIRE_TEMP_TRACK_COEFF === 0.6
  ✓ cal: CALIBRATION.TIRE_TEMP_TRACK_COEFF.value 對齊 CAL.TIRE_TEMP_TRACK_COEFF
  ✓ cal: CAL.TIRE_TEMP_EQUIL_TAU_LAPS === 1.6
  ✓ cal: CALIBRATION.TIRE_TEMP_EQUIL_TAU_LAPS.value 對齊 CAL.TIRE_TEMP_EQUIL_TAU_LAPS
  ✓ cal: CAL.LAP_BALANCE_PENALTY_PER_DEGG === 0.012
  ✓ cal: CALIBRATION.LAP_BALANCE_PENALTY_PER_DEGG.value 對齊 CAL.LAP_BALANCE_PENALTY_PER_DEGG
  ✓ cal: CAL.LAP_BALANCE_PENALTY_CAP === 0.04
  ✓ cal: CALIBRATION.LAP_BALANCE_PENALTY_CAP.value 對齊 CAL.LAP_BALANCE_PENALTY_CAP
  ✓ cal: CAL.DRIVETRAIN_TRACTION_FRAC_2WD === 0.62
  ✓ cal: CALIBRATION.DRIVETRAIN_TRACTION_FRAC_2WD.value 對齊 CAL.DRIVETRAIN_TRACTION_FRAC_2WD
  ✓ cal: CALIBRATION 鍵集合 == 測試預期
  ✓ cal: 每個常數 metadata 完整且 value 落在 validRange 內

[sens] corneringStiffnessScale 鉤子
  ✓ sens: corneringStiffnessScale 預設(=1) 不改變 understeer_gradient
  ✓ sens: cornering stiffness ×0.8 → Kus ≈ Kus0/0.8

[tmeta] 輪胎模型 metadata
  ✓ tmeta: generic → sourceType/overallStatus generic
  ✓ tmeta: generic → Cα = model/generic_pacejka
  ✓ tmeta: generic → pressure/temp/width grip are heuristic
  ✓ tmeta: generic → no fallback flags (nothing better was expected)
  ✓ tmeta: imported → sourceType imported_tir, status valid
  ✓ tmeta: imported → Cα & peak μ upgraded to model/imported_tir
  ✓ tmeta: imported → pressure/temp/width/tireUsShift STILL heuristic + fallback
  ✓ tmeta: imported → coverage lateral true; Fx/Mz/combined false
  ✓ tmeta: imported → emits "grip still heuristic" honesty diagnostic
  ✓ tmeta: partial .tir → overallStatus imported_partial
  ✓ tmeta: partial .tir → camber + lateral-only warnings
  ✓ tmeta: partial .tir → missing pressure-model diagnostic
  ✓ tmeta: parseTIR → imported_tir descriptor
  ✓ tmeta: descriptor is pure — no prediction drift

[tval] .tir validation diagnostics
  ✓ tval: valid → no error severity
  ✓ tval: valid → lateral-only is a warning (not an error)
  ✓ tval: valid → grip-still-heuristic is a warning
  ✓ tval: valid → vertical stiffness reported as info
  ✓ tval: valid → load-sensitivity reported as info
  ✓ tval: valid → pressure-unused note is info (file has PPY)
  ✓ tval: lateral-only flags combined slip + Mz + Fx
  ✓ tval: null → error TIR_PARSE_FAILED only
  ✓ tval: missing PCY1 → error TIR_MISSING_LATERAL (returns early)
  ✓ tval: missing PDY1 → error TIR_NO_PEAK
  ✓ tval: partial → no error severity
  ✓ tval: partial → no-camber warning + no-pressure/no-vertical info
  ✓ tval: degenerate (Fy0≡0) → error TIR_NO_EFFECTIVE_LATERAL_FORCE
  ✓ tval: degenerate → importedTirMetadata overallStatus imported_error (never imported_valid)
  ✓ tval: valid (non-degenerate) → NO effective-lateral-force error
  ✓ tval: importedTirMetadata(no PDY1) → overallStatus imported_error
  ✓ tval: buildTireModelMetadata diagnostics come from validateTirModel

[telemetry] .bmsbin catalog metadata + diagnostics
  ✓ telemetry: canonical mapping returns matched raw name
  ✓ telemetry: maps wheel-speed / damper / ride-height
  ✓ telemetry: valid catalog → status catalog_only
  ✓ telemetry: capabilities — catalog true, all decoding false
  ✓ telemetry: required channels carry raw names
  ✓ telemetry: catalog-only emits time-series-not-decoded warning
  ✓ telemetry: full core → validation-detected + ready-for-3B info
  ✓ telemetry: missing yaw/steer/speed → warnings; lateral present → no lateral warning
  ✓ telemetry: partial still catalog_only (no time-series)
  ✓ telemetry: non-Darab → error TELEM_NOT_DARAB + decode_error
  ✓ telemetry: zero channels → error TELEM_NO_CHANNELS
  ✓ telemetry: consumes parseBms shape (header/channelCount/channels)

[probe] .bmsbin binary sample-block probe
  ✓ probe: empty file → error BMS_PROBE_EMPTY_FILE
  ✓ probe: non-Darab header → error BMS_PROBE_INVALID_HEADER
  ✓ probe: catalog-only → catalog found + no-sample-region warning + no regions
  ✓ probe: catalog + numeric region → candidate binary region found
  ✓ probe: numeric region → int16le encoding flagged plausible
  ✓ probe: monotonic counter → timebase clue candidate
  ✓ probe: random region → probe_only + scaling-not-decoded warning
  ✓ probe: report schema stable (probe_only, arrays, unknowns)
  ✓ probe: always honest — probe-only + time-series-not-confirmed diagnostics
  ✓ probe→metadata: status probe_available + sampleProbe true, decoding still false
  ✓ probe→metadata: probe summary attached (regionCount + diagnostics)
  ✓ probe→metadata: no probe → stays catalog_only, sampleProbe false

[raw] .bmsbin raw time-series candidate extraction
  ✓ raw: no probe report → error
  ✓ raw: no candidate region → error + no series
  ✓ raw: numeric region → raw series candidate found
  ✓ raw: int16le stats correct (min/max/mean of 0..999)
  ✓ raw: series carries raw-only notes (no scaling / no mapping)
  ✓ raw: timebase clue → candidate only (not a confirmed timestamp)
  ✓ raw: interleaved data → interleaved layout hypothesis (≥2 channels)
  ✓ raw: channel mapping stays not_mapped
  ✓ raw: physicalScaling + handlingCorrelation + timeSeries stay false
  ✓ raw: rawTimeSeriesCandidates true + status raw_candidates_only
  ✓ raw: end-to-end probe→extract yields candidates
  ✓ raw→metadata: status raw_candidates_only + rawTimeSeriesCandidates true; physical/handling false
  ✓ raw→metadata: rawExtraction summary attached (seriesCount + channelMapping not_mapped)

[link] .bmsbin channel-linking hypotheses
  ✓ link: no raw extraction → error
  ✓ link: no catalog → warning
  ✓ link: count match → count-match info + low-confidence order hypothesis
  ✓ link: no explicit mapping → channel identity not confirmed
  ✓ link: explicit mapping → high-confidence identity (synthetic case only)
  ✓ link: explicit scale → scaling hypothesis (metadata_candidate)
  ✓ link: no scale → manual_required + physicalScaling false
  ✓ link: canonicalPreview available only with explicit identity+scale
  ✓ link: decode-grade capabilities stay false even with explicit mapping
  ✓ link: timebase hypothesis formed (candidate only, sample-count match)
  ✓ link→metadata: status linking_hypotheses_only + linking/scaling caps true; decode-grade false
  ✓ link→metadata: linking summary attached (identity not confirmed, no canonical preview)

[tool] local validation reporter — fixture-safe / sanitized output
  ✓ tool: REPORT_FIELDS whitelist names no raw-content field
  ✓ tool: summarizeFile emits only whitelisted REPORT_FIELDS
  ✓ tool: summary values are scalars only (no raw arrays/objects)
  ✓ tool: summary reflects pipeline run + claims no decode
  ✓ tool: aggregate emits counts/ranges/histograms only (no raw arrays)
  ✓ tool: serialized summary+aggregate names no raw-content field
  ✓ tool: summary carries sanitized confirmation decision (catalog confirmed, structure not, no decode)
  ✓ tool: aggregate reports confirmation counts + corpus booleans (sanitized)
  ✓ tool: summary carries sanitized extraction eligibility (not eligible, 0 eligible, no measured values)
  ✓ tool: summary carries sanitized measured extraction (real file blocked, 0 corners, realDataUsed false, no tendency)
  ✓ tool: summary carries sanitized canonical-adapter eligibility (real file blocked, never ready, realDataUsed false)
  ✓ tool: summary carries sanitized private-corpus boundary (not available on single file, realDataUsed false)

[confirm] .bmsbin hypothesis→confirmed criteria
  ✓ confirm: catalog-only → catalog confirmed, structure not, status not_confirmed
  ✓ confirm: unstable candidate regions → sample structure not confirmed
  ✓ confirm: stable regions + matching raw count → sample structure can be confirmed
  ✓ confirm: explicit mapping → channel identity can be confirmed (synthetic)
  ✓ confirm: no explicit mapping → channel identity stays false
  ✓ confirm: monotonic counter + sample-count match → timebase can be confirmed
  ✓ confirm: no scale table → physical scaling stays false
  ✓ confirm: explicit scale → scaling criteria confirmed (synthetic), physicalScaling cap still false
  ✓ confirm: real-data-like (85 ch / 2 raw, no corpus) → catalog only, status not_confirmed
  ✓ confirm: explicit mapping but NO corpus → identity/scaling/canonical stay false (structure gates them)
  ✓ confirm: decode-grade capabilities stay false even when structure is confirmed
  ✓ confirm: report schema (scores + blockers + nextEvidenceNeeded + canonical blocked)
  ✓ confirm→metadata: confirmation summary surfaced + confirmationCriteria cap true; decode-grade false
  ✓ confirm→metadata: no confirmation → confirmationCriteria false, confirmation null

[struct] .bmsbin sample-structure discovery
  ✓ struct: catalog-only (no raw) → hypotheses-only + not converged + warning
  ✓ struct: 85-entry in-range offset table → candidate matches catalog (targets plausible)
  ✓ struct: offset table with out-of-file targets → not confirmed (targetsPlausible false)
  ✓ struct: 85 length-prefixed blocks → per_channel_blocks hypothesis matching catalog
  ✓ struct: interleaved 85-lane data → interleaved_channels hypothesis
  ✓ struct: random region → compressed_or_sparse hypothesis
  ✓ struct→confirm: per-channel feed but NO corpus → structure NOT confirmed, decode caps false
  ✓ struct→confirm: per-channel feed + corpus → structure can confirm; decode-grade caps still false
  ✓ struct: decode-grade caps false + sampleStructureDiscovery true + never converged (all fixtures)
  ✓ struct: report never names a canonical channel / decoded series
  ✓ struct→metadata: structure summary surfaced + sampleStructureDiscovery cap true; decode caps false
  ✓ struct→metadata: no structure → sampleStructureDiscovery false, structure null
  ✓ struct(R1): misaligned per-channel blocks (junk prefix) still found via full start search
  ✓ struct(R2): sequential index run → channel_index_table, not a matches offset_table
  ✓ struct(R3): single contiguous smooth series → NOT mislabelled interleaved_channels
  ✓ struct(R4): random region yields no targetsPlausible offset_table candidate

[raw-stream] .bmsbin raw stream confirmation criteria
  ✓ rawstream: catalog-only → not confirmed, no confirmable stream
  ✓ rawstream: single-file per-channel blocks → confirmable, aggregate not confirmed (corpus required)
  ✓ rawstream: corpus + consistent per-channel blocks → confirmed_structure + raw_stream_structure_confirmed
  ✓ rawstream: matching count but inconsistent block length → candidate_only, not confirmed
  ✓ rawstream: corpus + interleaved layout → confirmed_structure
  ✓ rawstream: single contiguous smooth series → no interleaved stream, not confirmed
  ✓ rawstream: offset table → rejected as raw stream (boundary evidence), not confirmed
  ✓ rawstream: decode-grade capabilities stay false (timeSeries/physicalScaling/handlingCorrelation)
  ✓ rawstream: always warns identity + physical values unavailable; never names a channel/value
  ✓ rawstream→confirm: feed WITHOUT corpus → raw streams not confirmed; decode caps false
  ✓ rawstream→confirm: feed + corpus (fileCount≥2) → raw streams can confirm; decode caps still false
  ✓ rawstream: real-data-like (no corpus, no clean structure) → not confirmed
  ✓ rawstream→metadata: summary surfaced + rawStreamConfirmation cap true; decode caps false
  ✓ rawstream→metadata: no raw stream confirmation → cap false, summary null
  ✓ rawstream(R1): equal-prefix / variable-tail blocks → NOT confirmed_structure (whole-run length check)

[channel-identity] .bmsbin channel identity confirmation criteria
  ✓ identity(A): shape-only → hypothesis_only, not confirmed
  ✓ identity(B): label-only → labeled_unverified, not confirmed
  ✓ identity(C): independent mapping but raw stream not confirmed → confirmable_identity, not confirmed
  ✓ identity(D): corpus + confirmed raw stream + independent mapping → confirmed_identity (synthetic); decode caps false
  ✓ identity(R1): unknowns[] is consistent with the decision on both paths
  ✓ identity(E): no corpus (single file) → never confirmed_identity
  ✓ identity(E2): mapping depends on scaling → candidate at most, not confirmed
  ✓ identity(F): physical/canonical/handling/setup/units caps pinned false (even confirmed_identity)
  ✓ identity(G): real path (no evidence) → not_confirmed, 0 candidates
  ✓ identity(G): real path never names a channel (no speed/brake/throttle/steering/accy from catalog)
  ✓ identity→confirm: feed WITHOUT corpus → channel identity not confirmed; decode caps false
  ✓ identity→confirm: feed + corpus → channel identity can confirm; decode caps still false
  ✓ identity→metadata: surfaced + channelIdentityConfirmed false; physical/canonical/handling/setup caps false
  ✓ identity→metadata: no identity → cap false, summary null

[timebase] .bmsbin timebase confirmation criteria
  ✓ timebase(A): no evidence → not_confirmed, confirmed false
  ✓ timebase(B): sample-count only → sample_count_candidate, confirmed false
  ✓ timebase(C): monotonic counter only → monotonic_candidate, confirmed false
  ✓ timebase(D): delta stable, no corpus → delta_candidate, confirmed false
  ✓ timebase(E): manual sample-rate only → fallback hint, not confirmed; units/scaling/timeSeries false
  ✓ timebase(F): raw stream not confirmed → confirmable_timebase at most, not confirmed
  ✓ timebase(G): corpus + confirmed raw stream + full structural → confirmed_timebase (synthetic); caps false
  ✓ timebase(H): gaps/dropouts → not confirmed_timebase + gaps-detected diagnostic
  ✓ timebase(H2): NaN gap/dropout count → fails closed (not confirmed), never coerced to 0
  ✓ timebase(I): single file (no corpus) → never confirmed; no inferred Hz/rate value emitted
  ✓ timebase(red-line): physical/units/canonical/timeSeries/handling/setup caps pinned false (all paths)
  ✓ timebase→confirm: feed WITHOUT corpus → timebase not confirmed; decode caps false
  ✓ timebase→confirm: feed + corpus → timebase can confirm; decode caps still false
  ✓ timebase→metadata: summary surfaced + timebaseConfirmed false; physical/units/canonical/handling caps false
  ✓ timebase→metadata: no timebase → cap false, summary null

[physical-scaling] .bmsbin physical scaling confirmation criteria
  ✓ scaling(A): no evidence → not_confirmed; physical/units caps false
  ✓ scaling(B): raw stream not confirmed → not confirmed; physicalScaling false
  ✓ scaling(C): channel identity not confirmed → identity_missing, not confirmed
  ✓ scaling(D): timebase missing (time-indexed) → timebase_missing, not confirmed
  ✓ scaling(E): manual scale only → scale_hint_only (fallback); not confirmed; units false
  ✓ scaling(F): unit label only → unit_hint_only, not confirmed
  ✓ scaling(G): plausible range only → candidate at most, not confirmed (range is supporting only)
  ✓ scaling(H): transform proposed but not verified/stable → transform_candidate, not confirmed
  ✓ scaling(I): all prereqs + independent scale + unit + verified transform → confirmed_scaling (synthetic); usable caps still false
  ✓ scaling(J): synthetic confirmed → canonicalValueEligibility true but canonicalValues NOT available; no overlay
  ✓ scaling(R1): identity status string cannot override a false aggregate decision → not confirmed
  ✓ scaling(K): real single-file (no corpus) → never confirmed; physical/units/canonical caps false
  ✓ scaling(L): real path + manual scale → fallback hint only; physicalScaling/units false
  ✓ scaling(M): handling/setup/overlay/timeSeries/canonical caps pinned false (all paths)
  ✓ scaling→confirm: feed WITHOUT corpus → physical scaling not confirmed; decode caps false
  ✓ scaling→confirm: feed + corpus → physical scaling can confirm; decode-grade caps still false
  ✓ scaling→metadata: summary surfaced + physicalScaling/units/canonical caps false; overlay false
  ✓ scaling→metadata: no scaling → cap false, summary null

[telemetry-readiness] .bmsbin telemetry readiness gate
  ✓ readiness(A): no evidence → not_ready; readiness/handlingAnalysis caps false
  ✓ readiness(B): canonical/scaling missing → insufficient_prerequisites, not ready
  ✓ readiness(C): required channels missing → missing_required_channels, not ready
  ✓ readiness(E): timebase missing → insufficient_prerequisites, not ready
  ✓ readiness(F-I): sample-rate / sync / dropout / noise blocked → quality_blocked, not ready
  ✓ readiness(H2): unknown dropout/noise quality → fail-closed, not ready
  ✓ readiness(R1): units-only prereq → insufficient_prerequisites (ladder symmetric), still not ready
  ✓ readiness(J): some required channels confirmed → partial_readiness, not ready
  ✓ readiness(K): prereqs + channels met, quality not fully confirmed → confirmable_readiness, not ready
  ✓ readiness(L): real single-file → not_ready; handlingAnalysis/overlay caps false
  ✓ readiness(M): all prereqs + channels + quality pass → ready_for_analysis (synthetic); analysis caps false
  ✓ readiness(N): handlingAnalysis/overlay/Kus/handling/setup caps pinned false (all paths)
  ✓ readiness→confirm: feed WITHOUT corpus → telemetryReadyForAnalysis false; decode caps false
  ✓ readiness→confirm: feed + full prereqs + corpus → telemetryReadyForAnalysis true; decode caps still false
  ✓ readiness→metadata: summary surfaced + telemetryReady false; handlingAnalysis/overlay/Kus/setup caps false
  ✓ readiness→metadata: no readiness → cap false, summary null

[extract-eligibility] .bmsbin measured handling-response extraction eligibility gate
  ✓ extract(A): real not-ready readiness → not_eligible; extraction/measuredHandlingResponse/handling caps false
  ✓ extract(B): ready but no canonical measured series → canonical_series_unavailable, not eligible
  ✓ extract(C): ready + canonical series but required channels absent → required_channels_unavailable
  ✓ extract(C2): ready + canonical series + some required channels → partial_eligibility
  ✓ extract(D): channels present but too few corner events → segmentation_prerequisites_unmet
  ✓ extract(E): segmentation ok but windows not separable → window_prerequisites_unmet
  ✓ extract(F): all prerequisites satisfied (synthetic) → eligible_for_extraction; extraction/analysis caps false
  ✓ extract(F2): full evidence but no corpus → corpus_unavailable (not eligible, candidate=1, next-evidence + diag)
  ✓ extract(G): measuredHandlingResponse/handling/overlay/Kus/modelVsActual caps pinned false (all paths)
  ✓ extract(H): input contract names required channels (abstract) + segmentation prerequisites
  ✓ extract(H2): output contract is measured-only proxy — not full Kus / model-vs-actual / setup
  ✓ extract→confirm: feed WITHOUT corpus → measuredExtractionEligible false; decode caps false
  ✓ extract→confirm: feed + full prereqs + corpus → measuredExtractionEligible true; decode caps still false
  ✓ extract→metadata: summary surfaced + extractionEligible false; measuredHandlingResponse/handling/overlay caps false
  ✓ extract→metadata: no extraction → cap false, summary null

[measured-extraction] .bmsbin synthetic measured-extraction harness
  ✓ measext(A): no eligibility → not_available; harness/analysis caps false; realDataUsed false
  ✓ measext(A2): not eligible → blocked_by_eligibility; no segments/tendency; caps false
  ✓ measext(B): eligible but not syntheticOnly (real path) → blocked_real_path; empty segments; null tendency; realDataUsed false
  ✓ measext(C): syntheticOnly but no series → insufficient_synthetic_series; null tendency; caps false
  ✓ measext(D): synthetic series → segmented; cornerCount>0; syntheticOnly true; realDataUsed false
  ✓ measext(D2): full synthetic series → extracted_synthetic
  ✓ measext(E): entry/mid/exit window counts > 0
  ✓ measext(F): steady-state windows > 0; confidence present
  ✓ measext(G): unstable mid → steady-state blocked (0 steady windows; not extracted_synthetic); caps false
  ✓ measext(H): tendency proxy marked syntheticOnly/notKus/notSetupAdvice/notModelVsActual; count>0
  ✓ measext(H2): synthetic ratio → understeer_like / oversteer_like proxy (synthetic proxy only)
  ✓ measext(I): extracted_synthetic → measuredExtractionSynthetic true; all analysis/real caps false
  ✓ measext(J): real/blocked path → empty segments, null tendency, syntheticOnly false
  ✓ measext→confirm: feed WITHOUT corpus/prereqs → measuredExtractionSynthetic false; decode caps false
  ✓ measext→confirm: feed + full prereqs + corpus → measuredExtractionSynthetic true; decode caps still false
  ✓ measext→metadata: summary surfaced + measuredExtractionSynthetic false; harness/real/handling/overlay caps false
  ✓ measext→metadata: no measuredExtraction → cap false, summary null
  ✓ measext(M): prior phases real path unchanged (eligibility not_eligible, readiness not_ready)
  ✓ measext(N): empty requiredChannels + empty series → insufficient_synthetic_series (no crash)
  ✓ measext(O): NaN-interleaved mid speed → steady-state fail-closed (0 steady; not extracted); caps false
  ✓ measext(P): out-of-range/negative segmentHints rejected; segments stay within bounds; realDataUsed false
  ✓ measext(Q): extracted confidence is medium|low only

[canonical-adapter] .bmsbin real canonical-series adapter boundary / eligibility gate
  ✓ cadapter(A): no inputs → not_available; canEnter false; caps false; realDataUsed false
  ✓ cadapter(B): real path → raw_stream_missing; not eligible; canonicalTelemetry/timeSeries/measuredExtraction false; realDataUsed false
  ✓ cadapter(C): missing raw stream → raw_stream_missing
  ✓ cadapter(D): missing identity → identity_missing
  ✓ cadapter(E): missing timebase → timebase_missing
  ✓ cadapter(F): missing scaling → scaling_missing
  ✓ cadapter(G): missing units → units_missing
  ✓ cadapter(H): missing cross-file corpus → corpus_missing
  ✓ cadapter(I): all prereqs but not syntheticOnly → adapter_contract_candidate; not eligible; canonicalTelemetry false; realDataUsed false
  ✓ cadapter(J): all prereqs + corpus + syntheticOnly → synthetic_adapter_ready; eligible true; realDataUsed false; analysis caps false
  ✓ cadapter(K): NaN/invalid evidence → fail-closed (not synthetic_adapter_ready); caps false
  ✓ cadapter(L): one-way feed — adapter does not mutate readiness / extraction-eligibility
  ✓ cadapter→metadata: summary surfaced + canonicalAdapterEligible false; canonicalTelemetry/timeSeries/modelVsActual false
  ✓ cadapter→metadata: no canonicalAdapter → cap false, summary null
  ✓ cadapter(N): null/garbage opts → fail-closed (no throw; not synthetic_adapter_ready)
  ✓ cadapter(O): non-numeric corpus.fileCount → not synthetic_adapter_ready; numeric still works

[private-corpus] .bmsbin private real-corpus boundary / evidence-ingestion policy
  ✓ pcorpus(A): no inputs → not_available; canUse false; caps false; realDataUsed false
  ✓ pcorpus(B): manifest but policy disabled → private_corpus_disabled
  ✓ pcorpus(C): policy on, no manifest → manifest_missing
  ✓ pcorpus(D): manifest without sanitizedOnly → manifest_invalid
  ✓ pcorpus(E): rawFilesCommitted → unsafe_manifest
  ✓ pcorpus(F): rawBytesExposed → unsafe_manifest
  ✓ pcorpus(G): decodedSequencesExposed → unsafe_manifest
  ✓ pcorpus(H): fileNamesExposed → unsafe_manifest
  ✓ pcorpus(I): offsetsExposed → unsafe_manifest
  ✓ pcorpus(J): fingerprintsExposed → unsafe_manifest
  ✓ pcorpus(K): fileCount<2 → insufficient_file_count
  ✓ pcorpus(L): no sanitizedEvidence → sanitized_evidence_missing
  ✓ pcorpus(M): partial evidence → sanitized_evidence_candidate; no confirmation; caps false
  ✓ pcorpus(N): safe manifest + complete evidence + policy → private_corpus_boundary_ready; evidence available; ALL confirm/canonical/analysis caps false; realDataUsed false
  ✓ pcorpus(O): hash / path / fileName / channelNames → manifest_invalid
  ✓ pcorpus(P): NaN / non-numeric fileCount → fail-closed (not boundary_ready)
  ✓ pcorpus(Q): one-way — does not mutate manifest / sanitized-evidence inputs
  ✓ pcorpus→metadata: summary surfaced + privateCorpusEvidenceAvailable false; canonicalTelemetry/timeSeries/modelVsActual false
  ✓ pcorpus→metadata: no privateCorpus → cap false, summary null
  ✓ pcorpus(S): truthy non-boolean exposure flag (1 / "true" / {}) → unsafe_manifest
  ✓ pcorpus(T): path / hash / file-ext in formatFamily / sourceType → manifest_invalid; plain token still ready

[sanitized-evidence-adapter] .bmsbin sanitized-evidence adapter dry-run shape
  ✓ sadapter(A): no inputs → not_available; canProvide false; caps false; realDataUsed false
  ✓ sadapter(B): 3G-2 boundary not ready → boundary_not_ready
  ✓ sadapter(C): boundary ready, no evidence → evidence_missing
  ✓ sadapter(D): evidence without sanitizedOnly → evidence_invalid
  ✓ sadapter(E): rawBytesExposed → unsafe_evidence
  ✓ sadapter(F): decodedSequencesExposed → unsafe_evidence
  ✓ sadapter(G): fileNamesExposed → unsafe_evidence
  ✓ sadapter(H): pathsExposed → unsafe_evidence
  ✓ sadapter(I): offsetsExposed → unsafe_evidence
  ✓ sadapter(J): fingerprintsExposed → unsafe_evidence
  ✓ sadapter(K): sampleValuesExposed → unsafe_evidence
  ✓ sadapter(L): channelNamesExposed → unsafe_evidence
  ✓ sadapter(M): timingExposed → unsafe_evidence
  ✓ sadapter(N): hashesExposed → unsafe_evidence
  ✓ sadapter(O): no scope present → insufficient_scope
  ✓ sadapter(P): only one scope → partial_adapter_shape; no confirmation; caps false
  ✓ sadapter(Q): core scopes present, not all → adapter_shape_candidate; no confirmation; caps false
  ✓ sadapter(R): all scopes + safe + boundary ready → dry_run_ready; shape available; ALL confirm/canonical/analysis caps false; realDataUsed false
  ✓ sadapter(S): hash / fileName / channelNames key OR leaky/unknown scope → evidence_invalid
  ✓ sadapter(T): malformed evidence → fail-closed (not dry_run_ready)
  ✓ sadapter(T2): only-status / only-feed forged boundary → boundary_not_ready (dual check)
  ✓ sadapter(U): one-way — does not mutate boundary / sanitized-evidence inputs
  ✓ sadapter→metadata: summary surfaced + adapterEvidenceShapeAvailable false; canonicalTelemetry/timeSeries/modelVsActual false
  ✓ sadapter→metadata: no sanitizedEvidenceAdapter → cap false, summary null
  ✓ sadapter(W): canonical gate shape present on every path
  ✓ sadapter(X): all diagnostic + UI panel keys resolve in EN/繁中/JA (3 each)
  ✓ sadapter(Y): reporter sanitized — boundary_not_ready, shape-available 0, realDataUsed false, scalar histogram
  ✓ sadapter(Z): one-way downstream — 3G-2 boundary result unchanged after adapter runs

[invariants] Phase 3 trust-chain red-line invariants
  ✓ invariant(A): real path fail-closed (readiness not_ready / eligibility not_eligible / measext blocked / hub not_confirmed)
  ✓ invariant(B): no gated capability true on real path (all layers + every merged-metadata red-line cap === false)
  ✓ invariant(C): hub pins timeSeries/physicalScaling/handlingCorrelation false
  ✓ invariant(D): bad/empty input fail-closed (no throw, no gated cap)
  ✓ invariant(E): reporter summary key set === REPORT_FIELDS; all scalar
  ✓ invariant(F): reporter error-fallback key set === REPORT_FIELDS (drift guard)
  ✓ invariant(G): synthetic extracted_synthetic opens only measuredExtractionSynthetic/Harness; realDataUsed false
  ✓ invariant(H): dual-gate — only-status/only-cap → blocked_by_eligibility; eligible+series w/o syntheticOnly → blocked_real_path
  ✓ invariant(I): canonical gate shape on 3E-0..3G-0B (status/aggregateDecision/confirmationFeed/capabilities/diagnostics/unknowns)
  ✓ invariant(J): no proprietary telemetry / vendor binary (.bmsbin/.tir/.pds/...) in repo tree (clean-room #5)

========= 結果: 479 passed, 0 failed =========
=== telemetry-core synthetic tests ===
telemetry-core: 67 passed, 0 failed
=== telemetry-view synthetic tests ===
telemetry-view: 105 passed, 0 failed
=== telemetry-plot geometry tests ===
telemetry-plot: 48 passed, 0 failed
=== telemetry-interact geometry tests ===
telemetry-interact: 52 passed, 0 failed
=== telemetry-yaw synthetic tests ===
telemetry-yaw: 84 passed, 0 failed
=== canonical-parameters schema tests ===
canonical-parameters: 39 passed, 0 failed
=== parameter-conversions proof tests ===
parameter-conversions: 38 passed, 0 failed
=== vehicle-profile-f312 fixture tests ===
vehicle-profile-f312: 30 passed, 0 failed
=== setup-snapshot tests ===
setup-snapshot: 35 passed, 0 failed
=== analysis-case tests ===
analysis-case: 43 passed, 0 failed
=== analysis-case adversarial tests ===
analysis-case-adversarial: 78 passed, 0 failed
suspension-input-normalizer: 96 passed, 0 failed
suspension-input-equivalence: 5020 passed, 0 failed  (raw=1002, observable=501)
suspension-input-adversarial: 54 passed, 0 failed
canonical-model-input: 33 passed, 0 failed
analysis-execution: 29 passed, 0 failed
telemetry-observation: 33 passed, 0 failed
model-telemetry-comparison: 24 passed, 0 failed
race-engineer-insight: 26 passed, 0 failed
driver-coach-insight: 22 passed, 0 failed
analysis-workspace: 19 passed, 0 failed
analysis-workspace-viewmodel: 20 passed, 0 failed
analysis-workspace-integration: 47 passed, 0 failed
analysis-workspace-ui: 39 passed, 0 failed
telemetry-import-adapter: 16 passed, 0 failed
channel-mapping: 8 passed, 0 failed
calibration-registry: 26 passed, 0 failed
analysis-window: 7 passed, 0 failed
canonical-telemetry-session: 9 passed, 0 failed
analysis-case-export: 45 passed, 0 failed
r2.3-real-telemetry-integration: 17 passed, 0 failed
r2.3-import-ui: 16 passed, 0 failed
measured-metrics: 16 passed, 0 failed
r2.4-measured-metrics-integration: 26 passed, 0 failed
r2.4-ui: 23 passed, 0 failed
setup-ab: 20 passed, 0 failed
quantitative-setup-recommendation: 32 passed, 0 failed
r2.5-setup-ab-quantitative-integration: 25 passed, 0 failed
r2.5-ui: 36 passed, 0 failed
track-intelligence: 30 passed, 0 failed
r2.6-track-intelligence-integration: 22 passed, 0 failed
r2.6-ui: 15 passed, 0 failed
case-shell: 24 passed, 0 failed
r3.0a-ui: 66 passed, 0 failed
storage-backend: 15 passed, 0 failed
schema-migration: 9 passed, 0 failed
case-record-schema: 63 passed, 0 failed
case-store: 36 passed, 0 failed
session-store: 12 passed, 0 failed
case-library-viewmodel: 16 passed, 0 failed
r3.0b-ui: 55 passed, 0 failed
r3.0b-persistence-integration: 16 passed, 0 failed
feature-registry: 21 passed, 0 failed
feature-router: 20 passed, 0 failed
vehicle-preset-pipeline: 27 passed, 0 failed
i18n-parity: 105 passed, 0 failed
node:fs:3022
  return binding.mkdtemp(prefix, options.encoding);
                 ^

Error: EPERM: operation not permitted, mkdtemp '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3c-cp1-XXXXXX'
    at Object.mkdtempSync (node:fs:3022:18)
    at runScript (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3.0c-contract-foundation.test.js:518:18)
    at /Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3.0c-contract-foundation.test.js:524:20
    at Object.<anonymous> (/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3.0c-contract-foundation.test.js:524:355)
    at Module._compile (node:internal/modules/cjs/loader:1803:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1934:10)
    at Module.load (node:internal/modules/cjs/loader:1524:32)
    at Module._load (node:internal/modules/cjs/loader:1326:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:245:24) {
  errno: -1,
  code: 'EPERM',
  syscall: 'mkdtemp',
  path: '/var/folders/bw/dy9my1ls5sz2fnpxk_yrc0k80000gn/T/r3c-cp1-XXXXXX'
}

Node.js v25.5.0

exec
/bin/bash -lc "node -e \"const F=require('./contracts/r3.0c/framing-i18n-key-registry.js'); const C=require('./contracts/r3.0c/reason-codes.js').REASON_CODES; const e={reasonCode:C.CANNOT_DISTINGUISH,i18nKey:'r3_0c.framing.cannot_distinguish'}; Object.defineProperty(e,'params',{enumerable:true,configurable:true,get(){throw new Error('boom')}}); console.log(JSON.stringify(F.validateFramingEntry(e)))\" && node tests/r3-0c-comparison-workspace.test.js && git diff --name-status 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9..c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a" in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
{"valid":true}
r3-0c-comparison-workspace: 67 passed, 0 failed
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-5FxmcgDm' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-79eQT1ps' (errno=Operation not permitted)
A	contracts/r3.0c/framing-i18n-key-registry.js
M	contracts/r3.0c/index.js
A	contracts/r3.0c/viewmodel-state-transition-contract.js
M	governance/r3.0/train.json
M	governance/r3.0c/capabilities.json
A	governance/r3.0c/checkpoints/C7.json
M	governance/r3.0c/state.json
M	package.json
M	renderer/index.html
A	renderer/js/i18n-comparisons.js
A	renderer/js/r3-0c-comparison-orchestrator.js
A	renderer/js/r3-0c-comparison-viewmodel.js
M	tests/i18n-parity.test.js
A	tests/r3-0c-comparison-workspace.test.js
M	tests/r3-0c-governance.test.js
M	tests/r3-0c-no-consumer.test.js
M	tests/r3.0a-ui.test.js
M	tests/r3.0c-contract-foundation.test.js

exec
/bin/bash -lc "nl -ba tests/i18n-parity.test.js | tail -35; nl -ba tests/r3-0c-comparison-workspace.test.js | sed -n '115,165p;210,255p'; nl -ba governance/r3.0c/checkpoints/C7.json | sed -n '35,100p'; git show --format=fuller --no-patch c51952a; git merge-base --is-ancestor 9044a7f3c880d4d85dfaaca3d7cca9c0b124eaa9 c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a; echo ancestor:"'$?' in /Users/SKYLINE/Claude/projects/racing-setup-analyzer
 succeeded in 0ms:
   134	const blockerCodes = uniq([...svcSrc.matchAll(/_blocker\(['"]([A-Z0-9_]+)['"]/g)].map(m => m[1]));
   135	const cannotCodes = uniq([...svcSrc.matchAll(/cannotConclude\.push\(['"]([a-z0-9_]+)['"]/g)].map(m => m[1]));
   136	const missBlocker = blockerCodes.filter(c => !INTERNAL.test(c) && !tri('ui.blocker', c));
   137	const missCannot = cannotCodes.filter(c => !tri('ui.cannot', c));
   138	chk('every production blocker code has a 3-lang key (internal/exception allowlisted)', missBlocker.length === 0, missBlocker);
   139	chk('every cannotConclude code has a 3-lang key', missCannot.length === 0, missCannot);
   140	// limitation + confounder closure (CP-I18N-3 round2): measured-metric confounders render via ui.confounder,
   141	// quantitative-recommendation limitations via ui.limitation -- both namespaces must carry every emitted code.
   142	const collectArr = re => uniq([].concat(...[...svcSrc.matchAll(re)].map(m => (m[1].match(/'[a-z0-9_]+'/g) || []).map(s => s.slice(1, -1)))));
   143	const limCodes = uniq([...collectArr(/\bLIMITATIONS\s*=\s*\[([^\]]*)\]/g), ...[...svcSrc.matchAll(/limitations\.push\(['"]([a-z0-9_]+)['"]/g)].map(m => m[1])]);
   144	const confCodes = collectArr(/\bCONFOUNDERS\s*=\s*\[([^\]]*)\]/g);
   145	const missLim = limCodes.filter(c => !tri('ui.limitation', c));
   146	const missConf = confCodes.filter(c => !tri('ui.confounder', c));
   147	chk('every limitation code has a 3-lang ui.limitation key', missLim.length === 0, missLim);
   148	chk('every confounder code has a 3-lang ui.confounder key', missConf.length === 0, missConf);
   149	
   150	// 8) CP-I18N-3: UI-layer helpers (tCode recorder + tErr) + a11y lang are wired in index.html
   151	const idxHtml = fs.readFileSync(path.join(__dirname, '../renderer/index.html'), 'utf8');
   152	chk('tCode records unknown codes (dev detection, not silent)', /tCode\(prefix, code\)\{[\s\S]{0,500}__i18nMissingCodes/.test(idxHtml));
   153	chk('tCode humanizes unknown codes as a last resort', /tCode\(prefix, code\)\{[\s\S]{0,900}toUpperCase/.test(idxHtml));
   154	chk('tErr maps error codes with a localized generic fallback', /tErr\(v\)\{[\s\S]{0,500}ui\.err\.generic/.test(idxHtml) && tri.length && has(en, 'ui.err.generic') && has(zh, 'ui.err.generic') && has(ja, 'ui.err.generic'));
   155	chk('error displays route through tErr (no raw importError/analysisError/storageError)', /x-text="tErr\(importError\)"/.test(idxHtml) && /x-text="tErr\(analysisError\)"/.test(idxHtml) && /tErr\(storageError\)/.test(idxHtml));
   156	chk('document lang bound to the active locale (a11y)', /documentElement\.lang=\(l==='zh'\?'zh-TW':l\)/.test(idxHtml));
   157	chk('document.title localized on locale switch', /document\.title=this\.t\('ui\.appTitle'\)/.test(idxHtml) && tri('ui', 'appTitle'));
   158	chk('wheel-upgrade error re-localized (no raw frozen-service message)', /t\('ui\.err\.wheelAspectRange'\)/.test(idxHtml) && !/wheelUpgrade\.(front|rear)_result\.message/.test(idxHtml) && tri('ui.err','wheelAspectRange'));
   159	// CP-I18N-3 round3: trust-panel evidence layer + deleteCase confirm must not leak English
   160	chk('trust-panel evidence layer localized (not raw b.layer)', /\(b\.layer\?tCode\('aw\.layer',b\.layer\)/.test(idxHtml));
   161	chk('deleteCase confirm localized (no raw English prompt)', /confirm\(this\.t\('ui\.case\.deleteConfirm'\)\)/.test(idxHtml) && !/Delete this case\? This cannot be undone\./.test(idxHtml) && tri('ui.case', 'deleteConfirm'));
   162	// CP-I18N-3 #1: legacy .bmsbin viewer adapter titles are no longer English in zh/ja
   163	['ui.telem.cadapter.title', 'ui.telem.sadapter.title'].forEach(k => {
   164	  chk('legacy adapter title localized: ' + k, has(en, k) && zh[k] !== en[k] && ja[k] !== en[k]);
   165	});
   166	
   167	console.log('i18n-parity: ' + pass + ' passed, ' + fail + ' failed');
   168	if (fail > 0) process.exit(1);
   115	// F. Orchestrator — full eligible path (drives real C5)
   116	function caseRecord() { return { caseId: 'case_A', associations: { trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } }; }
   117	// helper: build an orchestrator AND register the caseRecord so requestComparison can pass the
   118	// authenticity gate (Codex C7 finding C7-D1 closure). Tests that want to probe the unauth path
   119	// skip this helper and supply a literal caseRecord.
   120	function authOrch(caps) {
   121	  const o = OrchService.createOrchestrator({ capabilities: caps });
   122	  return o;
   123	}
   124	function regCase(orch, cr) { orch.registerAuthenticCaseRecord(cr); return cr; }
   125	function association() { return { caseId: 'case_A', sessionId: 'sess_1', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing', analysisCaseId: 'case_A', credibilityMetadata: { credibility: 'Heuristic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] } }; }
   126	function eligibilityInput() {
   127	  return {
   128	    analysisCaseId: 'case_A',
   129	    reference: { identity: { analysisCaseId: 'case_A', sessionId: 'sess_1', lapId: 'lap_3', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' }, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } },
   130	    comparison: { identity: { analysisCaseId: 'case_A', sessionId: 'sess_1', lapId: 'lap_5', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' }, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } },
   131	    credibilityMetadata: { credibility: 'Heuristic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] },
   132	  };
   133	}
   134	function deltaMetricsRequest() {
   135	  return {
   136	    identity: { caseId: 'case_A', sessionId: 'sess_1' },
   137	    referenceLap: { lapTimeMs: 90000 },
   138	    comparisonLap: { lapTimeMs: 89500 },
   139	    pairing: { pairs: [
   140	      { referenceCorner: { id: 'C1', fullTimeMs: 10000, entryTimeMs: 3000, midTimeMs: 4000, exitTimeMs: 3000 }, comparisonCorner: { id: 'C1', fullTimeMs: 9900, entryTimeMs: 2950, midTimeMs: 4000, exitTimeMs: 2950 } },
   141	    ] },
   142	    requestedMetrics: ['lap_time', 'delta_cumulative', 'sector_delta'],
   143	    policy: { deltaSign: 'comparison_minus_reference' },
   144	  };
   145	}
   146	(() => {
   147	  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
   148	  const cr = caseRecord(); orch.registerAuthenticCaseRecord(cr);
   149	  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
   150	  chk('F1 eligible end-to-end', r.status === 'eligible');
   151	  chk('F2 framing is structured (not prose)', r.framing && typeof r.framing.observedDelta === 'object');
   152	  chk('F3 framing.observedDelta.faster_overall', r.framing.observedDelta && r.framing.observedDelta.i18nKey === 'r3_0c.framing.observed_delta.faster_overall');
   153	  chk('F4 framing.cannotDistinguish is array', Array.isArray(r.framing.cannotDistinguish));
   154	  chk('F5 exportGate true when identity matches', r.exportGate === true);
   155	})();
   156	// G. Orchestrator — case binding mismatch
   157	(() => {
   158	  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
   159	  const caseRec = { caseId: 'case_A', associations: { trackId: 'imola', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } };
   160	  orch.registerAuthenticCaseRecord(caseRec);
   161	  const r = orch.requestComparison({ caseRecord: caseRec, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
   162	  chk('G1 case associations trackId mismatch → blocked', r.status === 'blocked' && hasCode(r, CODES.TRACK_IDENTITY_MISMATCH));
   163	})();
   164	// G2. Orchestrator — caseRecord NOT registered → blocked by authenticity (Codex C7-D1 closure)
   165	(() => {
   210	  chk('L1 initial placeholder=IDLE', s.placeholder === VST.PLACEHOLDER_STATES.IDLE);
   211	  chk('L2 initial result null', s.result === null);
   212	  chk('L3 initial exportGate false', s.exportGate === false);
   213	  chk('L4 latestToken 0', s.latestToken === 0);
   214	})();
   215	// M. Viewmodel — 7 transition triggers each clear+placeholder
   216	const allTriggers = ['setReference', 'setComparison', 'setAssociation', 'setChannelMapping', 'notifyCaseReopen', 'notifyAuthorityRevoked', 'notifyEligibilityRevoked'];
   217	allTriggers.forEach((triggerFn, i) => {
   218	  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
   219	  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
   220	  // pre-populate so we can confirm clear
   221	  vm.setAssociation(association());
   222	  vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
   223	  vm.setReference({ lapId: 'lap_3', lapTimeMs: 90000, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
   224	  vm.setComparison({ lapId: 'lap_5', lapTimeMs: 89500, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
   225	  const beforeState = vm.getState();
   226	  // fire the trigger:
   227	  if (triggerFn === 'setReference') vm.setReference({ lapId: 'lap_new', lapTimeMs: 91000 });
   228	  else if (triggerFn === 'setComparison') vm.setComparison({ lapId: 'lap_new2', lapTimeMs: 91000 });
   229	  else if (triggerFn === 'setAssociation') vm.setAssociation(association());
   230	  else if (triggerFn === 'setChannelMapping') vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
   231	  else if (triggerFn === 'notifyCaseReopen') vm.notifyCaseReopen();
   232	  else if (triggerFn === 'notifyAuthorityRevoked') vm.notifyAuthorityRevoked();
   233	  else if (triggerFn === 'notifyEligibilityRevoked') vm.notifyEligibilityRevoked();
   234	  const afterState = vm.getState();
   235	  const cleared = afterState.placeholder !== beforeState.placeholder || afterState.result === null;
   236	  chk('M' + (i + 1) + ' trigger ' + triggerFn + ' resets placeholder/result', cleared);
   237	});
   238	
   239	// N. Viewmodel — phase metricAvailability forced false
   240	(() => {
   241	  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
   242	  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
   243	  vm.setAssociation(association());
   244	  vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
   245	  vm.setReference({ lapId: 'lap_3', lapTimeMs: 90000, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
   246	  vm.setComparison({ lapId: 'lap_5', lapTimeMs: 89500, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
   247	  const s = vm.getState();
   248	  chk('N1 metricAvailability.entry_delta = false (phase gate)', s.metricAvailability.entry_delta === false);
   249	  chk('N2 metricAvailability.mid_delta = false (phase gate)', s.metricAvailability.mid_delta === false);
   250	  chk('N3 metricAvailability.exit_delta = false (phase gate)', s.metricAvailability.exit_delta === false);
   251	})();
   252	
   253	console.log('r3-0c-comparison-workspace: ' + pass + ' passed, ' + fail + ' failed');
   254	if (fail) process.exit(1);
    35	    "renderer/js/r3-0c-comparison-viewmodel.js",
    36	    "renderer/js/i18n-comparisons.js"
    37	  ],
    38	  "newlyEnabledCapabilities": ["ui_present", "viewmodel_state_transition_contract", "framing_source_structured_contract"],
    39	
    40	  "enabledCapabilitiesBefore": ["production_adapter_present", "lap_authority_present", "track_identity_authoritative", "normalized_distance_present", "reference_selection_present", "corner_segmentation_present", "corner_pairing_present", "delta_metrics_present", "comparison_export_present"],
    41	  "enabledCapabilitiesAfter": ["production_adapter_present", "lap_authority_present", "track_identity_authoritative", "normalized_distance_present", "reference_selection_present", "corner_segmentation_present", "corner_pairing_present", "delta_metrics_present", "comparison_export_present", "ui_present", "viewmodel_state_transition_contract", "framing_source_structured_contract"],
    42	  "forbiddenCapabilities": [
    43	    "feature_registry_active"
    44	  ],
    45	
    46	  "tests": {
    47	    "command": "npm test",
    48	    "newSuiteForThisCheckpoint": "tests/r3-0c-comparison-workspace.test.js",
    49	    "newSuiteAssertions": 66,
    50	    "evidenceTier": "TIER 3 — Claude-verified on C7 branch HEAD; CI re-run on integrationSha is the authority for the Train target context."
    51	  },
    52	
    53	  "workflowRunId": null,
    54	  "artifactId": null,
    55	  "artifactBoundSha": null,
    56	
    57	  "codexVerdict": null,
    58	
    59	  "uiSurface": {
    60	    "paneTemplate": "renderer/index.html data-r3c-c7-pane=\"comparison-workspace\" region",
    61	    "stateAccessor": "app().comparisonVMState() — returns the viewmodel state or placeholder.idle default",
    62	    "scriptLoadOrder": [
    63	      "renderer/js/i18n-comparisons.js (after i18n-workspace, before i18n-ux0)",
    64	      "renderer/js/r3-0c-comparison-orchestrator.js (loaded by app() init when UMD globals available)",
    65	      "renderer/js/r3-0c-comparison-viewmodel.js (same)"
    66	    ],
    67	    "stateTransitionContract": "contracts/r3.0c/viewmodel-state-transition-contract.js",
    68	    "framingSourceContract": "contracts/r3.0c/framing-i18n-key-registry.js",
    69	    "phaseCardsBehavior": "Hidden by metricAvailability.entry_delta || mid_delta || exit_delta; viewmodel forces all three to false while phase_boundary_contract.enabled === false",
    70	    "exportButtonGate": "viewmodel exportGate predicate — disabled binding on the button + click-time recheck"
    71	  },
    72	
    73	  "scopeBoundary": {
    74	    "frozenFilesUntouched": true,
    75	    "r30bPersistenceUntouched": true,
    76	    "featureRegistryUnchanged": true,
    77	    "deferredFeatureIdsStillDeferred": ["case_comparison", "reference_lap", "corner_delta"],
    78	    "phaseBoundaryContractEnabled": false
    79	  },
    80	
    81	  "frozenDiff": 0,
    82	  "productionDiff": null,
    83	  "runtimeConsumerCount": null,
    84	  "featureRegistryState": {
    85	    "expectedDeferredIds": ["case_comparison", "reference_lap", "corner_delta"],
    86	    "expectedRendererAdapter": false
    87	  },
    88	
    89	  "packageVersion": "1.4.0",
    90	  "createdAt": null,
    91	  "status": "pending",
    92	  "governanceChanged": true,
    93	
    94	  "note": "C7 Comparison Workspace UI. Adds the ui_present production capability + flips the two CP1R-declared governance capabilities (viewmodel_state_transition_contract and framing_source_structured_contract) to enabled:true. Three new authorized renderer/js paths: r3-0c-comparison-orchestrator.js (request-token issuer + framing emitter), r3-0c-comparison-viewmodel.js (pure state machine implementing the 7 transition triggers + stale-token drop), i18n-comparisons.js (en/zh/ja closed wording table for FRAMING_I18N_KEY_REGISTRY). Two new contract modules: framing-i18n-key-registry.js + viewmodel-state-transition-contract.js. UI lives in renderer/index.html — the deferred comparisons placeholder is replaced with a real pane gated by showPane('comparisons'). Phase cards (entry/mid/exit_delta) are hidden by the viewmodel forcing metricAvailability=false while phase_boundary_contract.enabled === false. Three R3.0C feature IDs (case_comparison / reference_lap / corner_delta) REMAIN availability='deferred' — feature_registry_active is forbidden until C8. Frozen physics / R3.0B persistence schema / feature-registry: untouched."
    95	}
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-uQOh3SPs' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-kyDeqelQ' (errno=Operation not permitted)
commit c51952aa1d7aa3a16d5e5ee14bee33e2ec94b46a
Author:     USADA-KARROT <skyline.fkd@gmail.com>
AuthorDate: Sun Jun 28 09:50:17 2026 +0800
Commit:     USADA-KARROT <skyline.fkd@gmail.com>
CommitDate: Sun Jun 28 09:50:17 2026 +0800

    cp1r(c7): close Codex C7 round-1 findings — token race / Proxy / case authenticity / train.json / parity / Reflect.ownKeys
    
    Formal Codex C7 adversarial review at SHA 7a3be55 returned BLOCK with 5 BLOCKER + 2
    NON-BLOCKING findings; this commit closes them.
    
    C7-A1 (BLOCKER) — viewmodel transition triggers without follow-up requests left
      latestToken unchanged, letting a delayed eligible response overwrite revoked state.
      Fix: _clearAndPlaceholder now advances latestToken on every trigger.
    
    C7-B1 (BLOCKER) — Proxy / accessor traps in framing entries escaped validateFramingEntry.
      Fix: wrap the entire validateFramingEntry body in try/catch; use _safeOwnKeys (Reflect.ownKeys
      with guarded fallback) and _safeGet (try/catch wrap) for every read.
    
    C7-D1 (BLOCKER) — case binding compared two caller-controlled objects.
      Fix: orchestrator now exposes registerAuthenticCaseRecord(caseRecord) + isAuthenticCaseRecord;
      requestComparison refuses any caseRecord not registered via that entrypoint. The viewmodel
      setAssociation auto-registers the caseRecord at the authoritative boundary. R3.0B case-store
      integration is the long-term entrypoint; this WeakSet pattern mirrors C5/C6.
    
    C7-E1 (BLOCKER) — governance/r3.0/train.json still pinned to C6_EXPORT.
      Fix: currentPhaseCheckpoint + phaseStates.R3.0C.currentCheckpoint advance to C7_UI.
    
    C7-F1 (NON-BLOCKING) — Object.keys missed non-enumerable / Symbol-keyed extras.
      Fix: Reflect.ownKeys (via _safeOwnKeys) detects them; non-string own keys reject.
    
    C7-H1 (NON-BLOCKING) — i18n-parity only compared locales to each other; a registry key
      absent from all three locales would slip.
      Fix: tests/i18n-parity.test.js now iterates FRAMING_I18N_KEY_REGISTRY and asserts each key
      exists in en + zh + ja.
    
    C7-J1 (BLOCKER) — orchestrator/viewmodel scripts not loaded in index.html.
      Partial closure: contracts/r3.0c is governance-classified NON-PRODUCTION (no-consumer
      validator forbids index.html from loading them; the renderer services depend on the contracts
      global). The C7 UMD stack remains Node-side only at this checkpoint; the deferred-feature
      contract semantics permit the browser pane to sit at placeholder.idle. A documented note
      in renderer/index.html explains the deferral. Full browser wiring is a follow-up integration
      task (likely C7.1 with a contracts-globals shim or a bundler).
    
    Tests: r3-0c-comparison-workspace.test.js gains G2 (forged caseRecord blocked) and updates
    G/H/I/J to register the caseRecord first. Total: 67 assertions (was 66 +1 new).
    
    Verification:
      - npm test: 76 suites / 8384 passed / 0 failed
      - scripts/check-r3-0c-guard.js: ok=true, productionDiff=0, deferredStillDeferred=true
      - scripts/check-frozen-boundary.js: ok=true, frozenDiffCount=0
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-BM2cGod7' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-iUFRxVhr' (errno=Operation not permitted)
ancestor:0

codex
Verified:

- HEAD/branch: `c51952aa…` on `feat/r3.0c-c7-comparison-workspace`
- Base `9044a7f…` is an ancestor.
- Reviewed full base-to-candidate delta.
- Frozen physics/dynamics/presets and R3.0B persistence schema are untouched.

## Findings

### C7-R2-A-01

SEVERITY: BLOCKER  
FILE: [r3-0c-comparison-orchestrator.js:97](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-orchestrator.js:97), [r3-0c-comparison-orchestrator.js:324](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-orchestrator.js:324), [r3-0c-comparison-viewmodel.js:214](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-viewmodel.js:214)

ATTACK STEPS:

1. Create an orchestrator and viewmodel.
2. Build a literal `caseRecord` whose `caseId` and associations match attacker-controlled reference/comparison data.
3. Pass it through:
   `vm.setAssociation({...association, caseRecord: forgedRecord})`.
4. Supply mapping, reference, and comparison selections.
5. `setAssociation` clones and registers the forged object at lines 217–226.
6. `requestComparison()` then sees `isAuthenticCaseRecord(input.caseRecord) === true`.

WHY CURRENT CODE FAILS:

The renderer-accessible viewmodel is treated as an “authoritative path,” but its input is entirely caller-controlled. The WeakSet proves only that the viewmodel previously saw the object, not that it came from the case store. Both registration methods are also public orchestrator APIs.

The test at [r3-0c-comparison-workspace.test.js:164](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-comparison-workspace.test.js:164) tests direct unregistered access; it does not exercise the actual `setAssociation` escalation path.

MINIMAL FIX:

Remove both registration methods from the public orchestrator return object and remove automatic registration from `setAssociation`. Inject an authenticity predicate or opaque case-store authority into the orchestrator through a renderer-inaccessible integration boundary. Add a test that passes a forged record through `setAssociation` and confirms refusal without registration helpers.

### C7-R2-B-01

SEVERITY: BLOCKER  
FILE: [index.html:3250](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/index.html:3250), [index.html:3917](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/index.html:3917)

ATTACK STEPS:

1. Load `renderer/index.html` normally.
2. Inspect the loaded scripts.
3. `i18n-comparisons.js`, the orchestrator, and the viewmodel are absent.
4. The `typeof` guard fails.
5. Open the comparison workspace.
6. `comparisonVMState()` returns the fabricated `placeholder: 'idle'` state.

WHY CURRENT CODE FAILS:

The source explicitly documents J1 as deferred to “C7.1.” The UI checkpoint therefore ships without its production implementation, while presenting an idle workspace rather than an unavailable state. Static HTML tests cannot substitute for browser execution.

MINIMAL FIX:

Provide a browser-safe facade/bundle or frozen contract mirror with equivalence tests, then load `i18n-comparisons.js`, orchestrator, and viewmodel in dependency order. Add an actual browser-load test that asserts successful construction.

### C7-R2-C-01

SEVERITY: BLOCKER  
FILE: [framing-i18n-key-registry.js:78](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/contracts/r3.0c/framing-i18n-key-registry.js:78), [framing-i18n-key-registry.js:127](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/contracts/r3.0c/framing-i18n-key-registry.js:127)

ATTACK STEPS:

```js
const entry = {
  reasonCode: CODES.CANNOT_DISTINGUISH,
  i18nKey: 'r3_0c.framing.cannot_distinguish'
};

Object.defineProperty(entry, 'params', {
  enumerable: true,
  configurable: true,
  get() { throw new Error('boom'); }
});

FIR.validateFramingEntry(entry);
```

Observed result:

```js
{ valid: true }
```

WHY CURRENT CODE FAILS:

`Reflect.ownKeys()` sees `params`, but `_safeGet()` converts the thrown getter into `undefined`. The optional-field branch then treats the thrown read as absence. Accessor descriptors returning benign values are also accepted instead of rejected.

Required accessor/Proxy tests are absent.

MINIMAL FIX:

Use a tri-state read result (`ABSENT`, `VALUE`, `THREW`) and reject `THREW`. Inspect own property descriptors and reject accessors before reading. Add every required getter, inherited getter, Proxy, non-enumerable, and symbol test.

### C7-R2-D-01

SEVERITY: BLOCKER  
FILE: [index.html:3289](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/index.html:3289), [index.html:3917](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/index.html:3917)

ATTACK STEPS:

1. Load the current page, where required globals are absent; alternatively make either factory throw.
2. The missing-global branch has no `else`.
3. Factory exceptions are caught and discarded.
4. `comparisonVMState()` returns `placeholder.idle`, empty reasons, and no structured failure.

WHY CURRENT CODE FAILS:

Script absence and initialization exceptions are indistinguishable from successful idle initialization. No registered reason code, localized message, or explicit unavailable state is produced.

MINIMAL FIX:

On either guard failure or caught exception, set a structured unavailable state using a registered `UI_INITIALIZATION_FAILED` reason and fixed i18n key. Keep export disabled and sanitize diagnostic details.

## Checks that held

- `_clearAndPlaceholder()` advances `latestToken`.
- Phase metrics are forced unavailable while the phase contract is disabled.
- C7 governance capabilities and pending status are correct.
- Train checkpoint advances to `C7_UI`.
- Forbidden feature capabilities remain disabled.
- Targeted C7 suite reports `67 passed`.
- Full `npm test` reached the R3.0C foundation suite but could not finish because the read-only environment denied `mkdtemp`; earlier suites passed.

VERDICT: BLOCK
tokens used
48,204
Verified:

- HEAD/branch: `c51952aa…` on `feat/r3.0c-c7-comparison-workspace`
- Base `9044a7f…` is an ancestor.
- Reviewed full base-to-candidate delta.
- Frozen physics/dynamics/presets and R3.0B persistence schema are untouched.

## Findings

### C7-R2-A-01

SEVERITY: BLOCKER  
FILE: [r3-0c-comparison-orchestrator.js:97](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-orchestrator.js:97), [r3-0c-comparison-orchestrator.js:324](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-orchestrator.js:324), [r3-0c-comparison-viewmodel.js:214](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/js/r3-0c-comparison-viewmodel.js:214)

ATTACK STEPS:

1. Create an orchestrator and viewmodel.
2. Build a literal `caseRecord` whose `caseId` and associations match attacker-controlled reference/comparison data.
3. Pass it through:
   `vm.setAssociation({...association, caseRecord: forgedRecord})`.
4. Supply mapping, reference, and comparison selections.
5. `setAssociation` clones and registers the forged object at lines 217–226.
6. `requestComparison()` then sees `isAuthenticCaseRecord(input.caseRecord) === true`.

WHY CURRENT CODE FAILS:

The renderer-accessible viewmodel is treated as an “authoritative path,” but its input is entirely caller-controlled. The WeakSet proves only that the viewmodel previously saw the object, not that it came from the case store. Both registration methods are also public orchestrator APIs.

The test at [r3-0c-comparison-workspace.test.js:164](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/tests/r3-0c-comparison-workspace.test.js:164) tests direct unregistered access; it does not exercise the actual `setAssociation` escalation path.

MINIMAL FIX:

Remove both registration methods from the public orchestrator return object and remove automatic registration from `setAssociation`. Inject an authenticity predicate or opaque case-store authority into the orchestrator through a renderer-inaccessible integration boundary. Add a test that passes a forged record through `setAssociation` and confirms refusal without registration helpers.

### C7-R2-B-01

SEVERITY: BLOCKER  
FILE: [index.html:3250](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/index.html:3250), [index.html:3917](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/index.html:3917)

ATTACK STEPS:

1. Load `renderer/index.html` normally.
2. Inspect the loaded scripts.
3. `i18n-comparisons.js`, the orchestrator, and the viewmodel are absent.
4. The `typeof` guard fails.
5. Open the comparison workspace.
6. `comparisonVMState()` returns the fabricated `placeholder: 'idle'` state.

WHY CURRENT CODE FAILS:

The source explicitly documents J1 as deferred to “C7.1.” The UI checkpoint therefore ships without its production implementation, while presenting an idle workspace rather than an unavailable state. Static HTML tests cannot substitute for browser execution.

MINIMAL FIX:

Provide a browser-safe facade/bundle or frozen contract mirror with equivalence tests, then load `i18n-comparisons.js`, orchestrator, and viewmodel in dependency order. Add an actual browser-load test that asserts successful construction.

### C7-R2-C-01

SEVERITY: BLOCKER  
FILE: [framing-i18n-key-registry.js:78](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/contracts/r3.0c/framing-i18n-key-registry.js:78), [framing-i18n-key-registry.js:127](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/contracts/r3.0c/framing-i18n-key-registry.js:127)

ATTACK STEPS:

```js
const entry = {
  reasonCode: CODES.CANNOT_DISTINGUISH,
  i18nKey: 'r3_0c.framing.cannot_distinguish'
};

Object.defineProperty(entry, 'params', {
  enumerable: true,
  configurable: true,
  get() { throw new Error('boom'); }
});

FIR.validateFramingEntry(entry);
```

Observed result:

```js
{ valid: true }
```

WHY CURRENT CODE FAILS:

`Reflect.ownKeys()` sees `params`, but `_safeGet()` converts the thrown getter into `undefined`. The optional-field branch then treats the thrown read as absence. Accessor descriptors returning benign values are also accepted instead of rejected.

Required accessor/Proxy tests are absent.

MINIMAL FIX:

Use a tri-state read result (`ABSENT`, `VALUE`, `THREW`) and reject `THREW`. Inspect own property descriptors and reject accessors before reading. Add every required getter, inherited getter, Proxy, non-enumerable, and symbol test.

### C7-R2-D-01

SEVERITY: BLOCKER  
FILE: [index.html:3289](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/index.html:3289), [index.html:3917](/Users/SKYLINE/Claude/projects/racing-setup-analyzer/renderer/index.html:3917)

ATTACK STEPS:

1. Load the current page, where required globals are absent; alternatively make either factory throw.
2. The missing-global branch has no `else`.
3. Factory exceptions are caught and discarded.
4. `comparisonVMState()` returns `placeholder.idle`, empty reasons, and no structured failure.

WHY CURRENT CODE FAILS:

Script absence and initialization exceptions are indistinguishable from successful idle initialization. No registered reason code, localized message, or explicit unavailable state is produced.

MINIMAL FIX:

On either guard failure or caught exception, set a structured unavailable state using a registered `UI_INITIALIZATION_FAILED` reason and fixed i18n key. Keep export disabled and sanitize diagnostic details.

## Checks that held

- `_clearAndPlaceholder()` advances `latestToken`.
- Phase metrics are forced unavailable while the phase contract is disabled.
- C7 governance capabilities and pending status are correct.
- Train checkpoint advances to `C7_UI`.
- Forbidden feature capabilities remain disabled.
- Targeted C7 suite reports `67 passed`.
- Full `npm test` reached the R3.0C foundation suite but could not finish because the read-only environment denied `mkdtemp`; earlier suites passed.

VERDICT: BLOCK
---- END codex exec ----
utcEndedAt: 2026-06-28T02:55:42Z
