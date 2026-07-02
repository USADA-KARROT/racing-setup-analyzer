#!/usr/bin/env node
'use strict';
/**
 * R3.0 Integrated Delivery Train — train-level validator.
 *
 * Reads governance/r3.0/train.{schema,}.json plus every phase's governance/r3.0X/state.json and
 * checkpoints/ directory and enforces fail-closed:
 *
 *   1. train.schema.json structural sanity (phases, ordering, scope pin keys, status enum, required fields).
 *   2. train.json structural sanity (matches schema, required fields present, status from allowed enum).
 *   3. phase consistency: train.phaseStates[X].currentCheckpoint must equal governance/r3.0X/state.json.currentCheckpoint.
 *   4. cross-phase advancement: D non-bootstrap requires R3.0C state.currentCheckpoint === C8_ACTIVATION
 *      (and equivalently for E vs R3.0D D5, F vs R3.0E E5). Bootstrap checkpoint advancement does not.
 *   5. capability monotonicity across the union of all checkpoint manifests of a phase:
 *        enabledCapabilitiesAfter[k] ⊇ enabledCapabilitiesAfter[k-1]  (never shrink)
 *        and authorizedPaths of checkpoint k ⊇ authorizedPaths surface of checkpoint k-1 (never remove).
 *   6. scope pin checks: same-case + same-session + cross-session forbidden; delta sign comparison-reference;
 *      reference selection explicit-only (auto-fastest / median / composite must remain false); hypothesis
 *      storage uses independent namespaces and does NOT extend the R3.0B case-record schema;
 *      intermediate release disallowed; target version = 2.0.0; target tag = v2.0.0; R4.0 excluded.
 *   7. governance-change visibility: a per-checkpoint manifest that lists changes touching any governance
 *      file MUST set governanceChanged=true. Same-commit weakening-and-feature-addition is rejected
 *      heuristically (see GUARD_AND_FEATURE_SAME_COMMIT).
 *   8. historical lineage: each checkpoint manifest's artifactBoundSha (when non-null) must equal its
 *      headSha; status PASS requires artifactBoundSha === headSha.
 *
 * Unconditional: runs every PR and every push to main. Internal exceptions fail closed
 * (ok=false, INTERNAL_VALIDATOR_FAILURE, exit code 2).
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-0-train.json   (exit 1 on violation; exit 2 on internal error)
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
const BASE = process.env.R3_TRAIN_BASE_OVERRIDE ? path.resolve(process.env.R3_TRAIN_BASE_OVERRIDE) : REPO;

const TRAIN_DIR = path.join(BASE, 'governance', 'r3.0');
const FROZEN_R3B_PATHS = [
  'renderer/js/case-record-schema.js',
  'renderer/js/storage-backend.js',
  'renderer/js/schema-migration.js',
  'renderer/js/case-store.js',
  'renderer/js/session-store.js',
  'renderer/js/case-library-viewmodel.js',
];

const R4_PREFIX_PATTERNS = [/^r4_/i, /^r40_/i, /^r4\.0_/i, /^r4\./i];

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function listJson(dir) {
  try { return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort(); }
  catch (_) { return []; }
}

function indexOf(order, id) { return order.indexOf(id); }

function finish(payload) { return Object.assign({ check: 'r3-0-train' }, payload); }

function run() {
  const violations = [];
  const fail = (code, msg, extra) => violations.push(Object.assign({ code, message: msg }, extra || {}));

  // ---- read train schema + state ----
  let trainSchema, train;
  try { trainSchema = readJson(path.join(TRAIN_DIR, 'train.schema.json')); }
  catch (e) { fail('TRAIN_SCHEMA_UNREADABLE', 'governance/r3.0/train.schema.json could not be read: ' + e.message); }
  try { train = readJson(path.join(TRAIN_DIR, 'train.json')); }
  catch (e) { fail('TRAIN_STATE_UNREADABLE', 'governance/r3.0/train.json could not be read: ' + e.message); }
  if (!trainSchema || !train) return finish({ ok: false, violations, trainStatus: null });

  // ---- train schema sanity ----
  if (trainSchema.schemaVersion !== 1) fail('TRAIN_SCHEMA_VERSION_UNSUPPORTED', 'schemaVersion ' + trainSchema.schemaVersion);
  if (trainSchema.program !== 'R3.0') fail('TRAIN_SCHEMA_PROGRAM_MISMATCH', 'program=' + trainSchema.program);
  if (!Array.isArray(trainSchema.phases) || trainSchema.phases.length === 0) fail('TRAIN_SCHEMA_PHASES_EMPTY', 'phases missing');
  if (!Array.isArray(trainSchema.phaseOrder)) fail('TRAIN_SCHEMA_PHASE_ORDER_MISSING', 'phaseOrder missing');
  if (!trainSchema.phaseGovernanceDirs || typeof trainSchema.phaseGovernanceDirs !== 'object') fail('TRAIN_SCHEMA_PHASE_DIRS_MISSING', 'phaseGovernanceDirs missing');
  if (!trainSchema.crossPhaseAdvanceRequires || typeof trainSchema.crossPhaseAdvanceRequires !== 'object') fail('TRAIN_SCHEMA_CROSS_PHASE_RULES_MISSING', 'crossPhaseAdvanceRequires missing');
  if (!trainSchema.scopePin || typeof trainSchema.scopePin !== 'object') fail('TRAIN_SCHEMA_SCOPE_PIN_MISSING', 'scopePin missing');
  if (!Array.isArray(trainSchema.trainStatusValues)) fail('TRAIN_SCHEMA_STATUS_VALUES_MISSING', 'trainStatusValues missing');
  if (!Array.isArray(trainSchema.trainStateRequired)) fail('TRAIN_SCHEMA_REQUIRED_LIST_MISSING', 'trainStateRequired missing');

  // ---- train state required fields ----
  const required = Array.isArray(trainSchema.trainStateRequired) ? trainSchema.trainStateRequired : [];
  for (const k of required) if (!(k in train)) fail('TRAIN_STATE_REQUIRED_FIELD_MISSING', 'train.json missing required field: ' + k, { field: k });

  // ---- phases consistency ----
  if (!Array.isArray(train.phases) || train.phases.join('|') !== trainSchema.phases.join('|')) fail('TRAIN_PHASES_MISMATCH', 'train.phases vs schema.phases differ');
  if (!Array.isArray(trainSchema.trainStatusValues) || !trainSchema.trainStatusValues.includes(train.trainStatus)) fail('TRAIN_STATUS_INVALID', 'trainStatus=' + train.trainStatus);

  // ---- scope pin (state mirror) — fail-closed on any drift from schema.scopePin ----
  const pin = trainSchema.scopePin || {};
  // comparisonScope
  if (!pin.comparisonScope || pin.comparisonScope.sameAnalysisCaseOnly !== true) fail('SCOPE_PIN_SCHEMA_SAME_CASE_NOT_TRUE', 'schema.scopePin.comparisonScope.sameAnalysisCaseOnly must be true');
  if (!pin.comparisonScope || pin.comparisonScope.sameSessionOnly !== true) fail('SCOPE_PIN_SCHEMA_SAME_SESSION_NOT_TRUE', 'schema.scopePin.comparisonScope.sameSessionOnly must be true');
  if (!pin.comparisonScope || pin.comparisonScope.crossSessionForbidden !== true) fail('SCOPE_PIN_SCHEMA_CROSS_SESSION_ALLOWED', 'schema.scopePin.comparisonScope.crossSessionForbidden must be true');
  if (pin.deltaSign !== 'comparison-reference') fail('SCOPE_PIN_DELTA_SIGN_WRONG', 'schema.scopePin.deltaSign must be comparison-reference; got ' + pin.deltaSign);
  // referenceSelectionPolicy
  if (!pin.referenceSelectionPolicy || pin.referenceSelectionPolicy.explicitUserSelectionOnly !== true) fail('SCOPE_PIN_REFERENCE_NOT_EXPLICIT_ONLY', 'schema.scopePin.referenceSelectionPolicy.explicitUserSelectionOnly must be true');
  if (!pin.referenceSelectionPolicy || pin.referenceSelectionPolicy.fastestValidEnabled !== false) fail('SCOPE_PIN_FASTEST_VALID_ENABLED', 'fastestValidEnabled must be false');
  if (!pin.referenceSelectionPolicy || pin.referenceSelectionPolicy.medianValidEnabled !== false) fail('SCOPE_PIN_MEDIAN_VALID_ENABLED', 'medianValidEnabled must be false');
  if (!pin.referenceSelectionPolicy || pin.referenceSelectionPolicy.bestSectorCompositeEnabled !== false) fail('SCOPE_PIN_BEST_SECTOR_COMPOSITE_ENABLED', 'bestSectorCompositeEnabled must be false');
  // hypothesisStorage
  if (!pin.hypothesisStorage || pin.hypothesisStorage.useIndependentNamespaces !== true) fail('SCOPE_PIN_HYPOTHESIS_STORAGE_WRONG', 'useIndependentNamespaces must be true');
  if (!pin.hypothesisStorage || pin.hypothesisStorage.extendR3bCaseRecordSchema !== false) fail('SCOPE_PIN_HYPOTHESIS_STORAGE_EXTENDS_R3B', 'extendR3bCaseRecordSchema must be false');
  // release
  if (!pin.release || pin.release.intermediateReleaseAllowed !== false) fail('SCOPE_PIN_INTERMEDIATE_RELEASE_ALLOWED', 'intermediateReleaseAllowed must be false');
  if (!pin.release || pin.release.targetVersion !== '2.0.0') fail('SCOPE_PIN_TARGET_VERSION_WRONG', 'targetVersion must be 2.0.0; got ' + (pin.release && pin.release.targetVersion));
  if (!pin.release || pin.release.targetTag !== 'v2.0.0') fail('SCOPE_PIN_TARGET_TAG_WRONG', 'targetTag must be v2.0.0; got ' + (pin.release && pin.release.targetTag));
  // r4 exclusion
  if (!pin.r4Exclusion || pin.r4Exclusion.r4Excluded !== true) fail('SCOPE_PIN_R4_NOT_EXCLUDED', 'r4Excluded must be true');

  // ---- train state mirror checks ----
  if (train.intermediateReleaseAllowed !== false) fail('TRAIN_INTERMEDIATE_RELEASE_ALLOWED', 'train.intermediateReleaseAllowed must be false');
  if (train.targetVersion !== '2.0.0') fail('TRAIN_TARGET_VERSION_WRONG', 'train.targetVersion must be 2.0.0; got ' + train.targetVersion);
  if (train.targetTag !== 'v2.0.0') fail('TRAIN_TARGET_TAG_WRONG', 'train.targetTag must be v2.0.0; got ' + train.targetTag);
  if (train.r4Excluded !== true) fail('TRAIN_R4_NOT_EXCLUDED', 'train.r4Excluded must be true');
  if (train.scopePinMirror) {
    if (!train.scopePinMirror.comparisonScope || train.scopePinMirror.comparisonScope.sameAnalysisCaseOnly !== true) fail('TRAIN_SCOPE_PIN_MIRROR_SAME_CASE_NOT_TRUE', 'state.scopePinMirror.comparisonScope.sameAnalysisCaseOnly must be true');
    if (!train.scopePinMirror.comparisonScope || train.scopePinMirror.comparisonScope.sameSessionOnly !== true) fail('TRAIN_SCOPE_PIN_MIRROR_SAME_SESSION_NOT_TRUE', 'state.scopePinMirror.comparisonScope.sameSessionOnly must be true');
    if (!train.scopePinMirror.comparisonScope || train.scopePinMirror.comparisonScope.crossSessionForbidden !== true) fail('TRAIN_SCOPE_PIN_MIRROR_CROSS_SESSION_ALLOWED', 'state.scopePinMirror.comparisonScope.crossSessionForbidden must be true');
    if (train.scopePinMirror.deltaSign !== 'comparison-reference') fail('TRAIN_SCOPE_PIN_MIRROR_DELTA_SIGN_WRONG', 'state.scopePinMirror.deltaSign must be comparison-reference');
    if (!train.scopePinMirror.referenceSelectionPolicy || train.scopePinMirror.referenceSelectionPolicy.explicitUserSelectionOnly !== true) fail('TRAIN_SCOPE_PIN_MIRROR_REFERENCE_NOT_EXPLICIT', 'state.scopePinMirror.referenceSelectionPolicy.explicitUserSelectionOnly must be true');
    if (!train.scopePinMirror.referenceSelectionPolicy || train.scopePinMirror.referenceSelectionPolicy.fastestValidEnabled !== false) fail('TRAIN_SCOPE_PIN_MIRROR_FASTEST_ENABLED', 'fastestValidEnabled must be false');
    if (!train.scopePinMirror.referenceSelectionPolicy || train.scopePinMirror.referenceSelectionPolicy.medianValidEnabled !== false) fail('TRAIN_SCOPE_PIN_MIRROR_MEDIAN_ENABLED', 'medianValidEnabled must be false');
    if (!train.scopePinMirror.referenceSelectionPolicy || train.scopePinMirror.referenceSelectionPolicy.bestSectorCompositeEnabled !== false) fail('TRAIN_SCOPE_PIN_MIRROR_COMPOSITE_ENABLED', 'bestSectorCompositeEnabled must be false');
    if (!train.scopePinMirror.hypothesisStorage || train.scopePinMirror.hypothesisStorage.useIndependentNamespaces !== true) fail('TRAIN_SCOPE_PIN_MIRROR_HYPOTHESIS_STORAGE_WRONG', 'useIndependentNamespaces must be true');
    if (!train.scopePinMirror.hypothesisStorage || train.scopePinMirror.hypothesisStorage.extendR3bCaseRecordSchema !== false) fail('TRAIN_SCOPE_PIN_MIRROR_HYPOTHESIS_EXTENDS_R3B', 'extendR3bCaseRecordSchema must be false');
  } else {
    fail('TRAIN_SCOPE_PIN_MIRROR_MISSING', 'train.scopePinMirror missing');
  }

  // ---- phase consistency ----
  const phaseStates = train.phaseStates || {};
  const phaseSummary = {};
  const phaseManifests = {};
  for (const phase of trainSchema.phases) {
    const dir = trainSchema.phaseGovernanceDirs[phase];
    const phaseDirAbs = path.join(BASE, dir);
    let phaseState = null;
    try { phaseState = readJson(path.join(phaseDirAbs, 'state.json')); }
    catch (e) { fail('PHASE_STATE_UNREADABLE', phase + ' state unreadable: ' + e.message, { phase }); continue; }
    let phaseSchema = null;
    try { phaseSchema = readJson(path.join(phaseDirAbs, 'schema.json')); }
    catch (e) { fail('PHASE_SCHEMA_UNREADABLE', phase + ' schema unreadable: ' + e.message, { phase }); continue; }
    if (phaseState.program !== phase) fail('PHASE_STATE_PROGRAM_MISMATCH', phase + ' state.program=' + phaseState.program, { phase });
    if (phaseSchema.program !== phase) fail('PHASE_SCHEMA_PROGRAM_MISMATCH', phase + ' schema.program=' + phaseSchema.program, { phase });
    const trainView = phaseStates[phase];
    if (!trainView) { fail('TRAIN_MISSING_PHASE_STATE', phase, { phase }); continue; }
    if (trainView.currentCheckpoint !== phaseState.currentCheckpoint) fail('TRAIN_PHASE_CHECKPOINT_MISMATCH', phase + ' train=' + trainView.currentCheckpoint + ' state=' + phaseState.currentCheckpoint, { phase });
    if (trainView.governanceDir !== dir) fail('TRAIN_PHASE_DIR_MISMATCH', phase, { phase });
    if (trainView.finalActivationCheckpoint !== trainSchema.phaseFinalActivationCheckpoint[phase]) fail('TRAIN_PHASE_FINAL_ACTIVATION_MISMATCH', phase, { phase });

    // ---- forbid R4 capabilities ----
    for (const cap of phaseSchema.capabilities) {
      for (const re of R4_PREFIX_PATTERNS) if (re.test(cap)) fail('R4_CAPABILITY_PRESENT', phase + ' capability ' + cap + ' looks like R4', { phase, capability: cap });
    }

    // ---- collect checkpoint manifests ----
    const manifestNames = listJson(path.join(phaseDirAbs, 'checkpoints'));
    const manifests = [];
    for (const f of manifestNames) {
      try { manifests.push(readJson(path.join(phaseDirAbs, 'checkpoints', f))); }
      catch (e) { fail('PHASE_CHECKPOINT_MANIFEST_UNREADABLE', phase + '/' + f + ': ' + e.message, { phase, file: f }); }
    }
    phaseManifests[phase] = manifests;

    phaseSummary[phase] = {
      currentCheckpoint: phaseState.currentCheckpoint,
      finalActivationCheckpoint: trainSchema.phaseFinalActivationCheckpoint[phase],
      authorizedProductionPathCount: Array.isArray(phaseState.authorizedProductionPaths) ? phaseState.authorizedProductionPaths.length : -1,
      enabledCapabilityCount: Array.isArray(phaseState.enabledCapabilities) ? phaseState.enabledCapabilities.length : -1,
      runtimeConsumersAllowed: !!phaseState.runtimeConsumersAllowed,
      uiAllowed: !!phaseState.uiAllowed,
      featureRegistryActivationAllowed: !!phaseState.featureRegistryActivationAllowed,
      algorithmsAllowed: !!phaseState.algorithmsAllowed,
      checkpointManifestCount: manifests.length,
    };
  }

  // ---- cross-phase advancement rules ----
  const rules = trainSchema.crossPhaseAdvanceRequires || {};
  for (const downstream of Object.keys(rules)) {
    const phaseState = readJsonSafe(path.join(BASE, trainSchema.phaseGovernanceDirs[downstream], 'state.json'));
    const phaseSchema = readJsonSafe(path.join(BASE, trainSchema.phaseGovernanceDirs[downstream], 'schema.json'));
    if (!phaseState || !phaseSchema) continue;
    if (phaseState.currentCheckpoint === phaseSchema.bootstrapCheckpoint) continue; // bootstrap allowed
    const requirement = rules[downstream];
    const [upstream, upstreamCheckpoint] = requirement.split(':');
    const upstreamState = readJsonSafe(path.join(BASE, trainSchema.phaseGovernanceDirs[upstream], 'state.json'));
    if (!upstreamState) { fail('CROSS_PHASE_UPSTREAM_STATE_UNREADABLE', downstream + ' requires ' + upstream + ' state', { phase: downstream }); continue; }
    if (upstreamState.currentCheckpoint !== upstreamCheckpoint) {
      fail('CROSS_PHASE_PREMATURE_ADVANCE', downstream + ' current=' + phaseState.currentCheckpoint + ' but ' + upstream + ' is ' + upstreamState.currentCheckpoint + ' (required ' + upstreamCheckpoint + ')', { downstream, upstream, requiredUpstreamCheckpoint: upstreamCheckpoint, actualUpstreamCheckpoint: upstreamState.currentCheckpoint });
    }
  }

  // ---- capability + path monotonicity (per phase checkpoint history) ----
  for (const phase of Object.keys(phaseManifests)) {
    const phaseSchema = readJsonSafe(path.join(BASE, trainSchema.phaseGovernanceDirs[phase], 'schema.json'));
    if (!phaseSchema) continue;
    const order = phaseSchema.checkpointOrder;
    const sorted = phaseManifests[phase].slice().filter(m => order.includes(m.checkpoint)).sort((a, b) => indexOf(order, a.checkpoint) - indexOf(order, b.checkpoint));
    let prevCaps = new Set();
    let prevPaths = new Set();
    for (const m of sorted) {
      const after = Array.isArray(m.enabledCapabilitiesAfter) ? m.enabledCapabilitiesAfter : [];
      for (const cap of prevCaps) if (!after.includes(cap)) fail('CAPABILITY_REGRESSION', phase + ' checkpoint ' + m.checkpoint + ' drops capability ' + cap, { phase, checkpoint: m.checkpoint, capability: cap });
      prevCaps = new Set(after);
      const paths = (Array.isArray(m.authorizedPaths) ? m.authorizedPaths : []).map(e => (e && (typeof e === 'string' ? e : e.path)) || null).filter(Boolean);
      for (const p of prevPaths) if (!paths.includes(p)) fail('AUTHORIZED_PATH_REMOVED', phase + ' checkpoint ' + m.checkpoint + ' removed path ' + p, { phase, checkpoint: m.checkpoint, path: p });
      for (const p of paths) prevPaths.add(p);
      // governance change visibility heuristic: if manifest declared changes to governance dirs/files and governanceChanged is false, fail.
      const declaredFiles = collectMaybeFiles(m);
      const touchesGovernance = declaredFiles.some(touchesGovernanceFile);
      if (touchesGovernance && m.governanceChanged !== true) fail('GOVERNANCE_CHANGED_FLAG_MISSING', phase + ' checkpoint ' + m.checkpoint + ' touches governance files but governanceChanged != true', { phase, checkpoint: m.checkpoint });
      // historical lineage: artifactBoundSha (if set) must equal headSha; PASS requires bound SHA match.
      if (m.artifactBoundSha && m.headSha && m.artifactBoundSha !== m.headSha) fail('ARTIFACT_BOUND_SHA_MISMATCH', phase + ' checkpoint ' + m.checkpoint + ' artifactBoundSha=' + m.artifactBoundSha + ' headSha=' + m.headSha, { phase, checkpoint: m.checkpoint });
      if (m.status === 'PASS' && (!m.artifactBoundSha || !m.headSha || m.artifactBoundSha !== m.headSha)) fail('PASS_REQUIRES_ARTIFACT_BOUND_SHA', phase + ' checkpoint ' + m.checkpoint + ' status PASS without SHA-bound artifact', { phase, checkpoint: m.checkpoint });
      // R3.0B case-record schema untouched (E/F only — D has no flag)
      if ((phase === 'R3.0E' || phase === 'R3.0F') && m.r3bCaseRecordSchemaUntouched !== true) fail('R3B_CASE_RECORD_SCHEMA_FLAG_NOT_TRUE', phase + ' checkpoint ' + m.checkpoint + ' r3bCaseRecordSchemaUntouched must be true', { phase, checkpoint: m.checkpoint });
      // R3.0F: package version pin until F6
      if (phase === 'R3.0F' && m.checkpoint !== 'F6_RELEASE' && m.packageVersion !== '1.4.0') fail('R3F_PACKAGE_VERSION_DRIFT', phase + ' checkpoint ' + m.checkpoint + ' packageVersion=' + m.packageVersion + ' (must remain 1.4.0 until F6_RELEASE)', { phase, checkpoint: m.checkpoint });
      if (phase === 'R3.0F' && m.checkpoint === 'F6_RELEASE' && m.packageVersion && m.packageVersion !== '2.0.0' && m.packageVersion !== '1.4.0') fail('R3F_RELEASE_PACKAGE_VERSION_WRONG', 'F6_RELEASE packageVersion must be 1.4.0 (staged) or 2.0.0 (bumped); got ' + m.packageVersion, { phase, checkpoint: m.checkpoint });
      // R3.0F F6 release-mirror consistency: release_executed means PUBLISHED ONLY (semantic
      // ruling recorded in capabilities.json + schema releaseStages). Fail-closed on any
      // record that could pass a tag-only or draft-only state off as an executed release.
      if (phase === 'R3.0F' && m.checkpoint === 'F6_RELEASE') {
        const rr = m.releaseRecord || {};
        const gr = rr.githubRelease || null;
        const stages = (phaseSchema.releaseStages && Array.isArray(phaseSchema.releaseStages.order)) ? phaseSchema.releaseStages.order : [];
        const phaseStateNow = readJsonSafe(path.join(BASE, trainSchema.phaseGovernanceDirs[phase], 'state.json')) || {};
        const capOn = Array.isArray(phaseStateNow.enabledCapabilities) && phaseStateNow.enabledCapabilities.includes('release_executed');
        const isSha = s => typeof s === 'string' && /^[0-9a-f]{40}$/.test(s);
        // publishedAt must be a real ISO-8601 UTC/offset timestamp whose calendar fields
        // survive round-trip (rejects Date.parse rollover like 2026-02-30) — junk never counts
        const isIsoTs = s => {
          const t = typeof s === 'string' && s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
          if (!t) return false;
          const y = +t[1], mo = +t[2], da = +t[3], h = +t[4], mi = +t[5], se = +t[6];
          const d = new Date(Date.UTC(y, mo - 1, da, h, mi, se));
          return d.getUTCFullYear() === y && d.getUTCMonth() === mo - 1 && d.getUTCDate() === da && d.getUTCHours() === h && d.getUTCMinutes() === mi && d.getUTCSeconds() === se;
        };
        // the state field is MANDATORY on a recorded Release (it is a declared
        // publishForwardFields member) and must corroborate draft/published exactly
        if (gr && gr.state == null) fail('R3F_RELEASE_STATE_FIELD_MISSING', 'githubRelease is recorded but has no state field — the DRAFT/PUBLISHED state advance is mandatory evidence and may not be omitted', { phase });
        const stateFieldOk = !!(gr && (
          (gr.state === 'DRAFT' && gr.draft === true && gr.published !== true) ||
          (gr.state === 'PUBLISHED' && gr.draft === false && gr.published === true)));
        if (gr && gr.state != null && !stateFieldOk) fail('R3F_RELEASE_STATE_FIELD_MISMATCH', 'githubRelease.state contradicts draft/published flags (state=' + gr.state + ', draft=' + gr.draft + ', published=' + gr.published + ')', { phase, state: gr.state, draft: gr.draft, published: gr.published });
        const published = !!(gr && gr.draft === false && gr.published === true && isIsoTs(gr.publishedAt) && stateFieldOk);
        // fail-closed on the stage machinery itself: the schema list and the checkpoint stage are mandatory
        if (!stages.length) fail('R3F_RELEASE_STAGES_SCHEMA_MISSING', 'F6_RELEASE requires schema.json releaseStages.order (missing/unreadable — cannot validate the stage fail-closed)', { phase });
        if (typeof m.releaseStage !== 'string' || !m.releaseStage) fail('R3F_RELEASE_STAGE_MISSING', 'F6_RELEASE checkpoint must declare releaseStage', { phase });
        else if (stages.length && !stages.includes(m.releaseStage)) fail('R3F_RELEASE_STAGE_UNKNOWN', 'F6_RELEASE releaseStage ' + m.releaseStage + ' is not in schema releaseStages.order', { phase, releaseStage: m.releaseStage });
        // release_executed (capability OR record flag) requires an actually-published Release
        if ((capOn || rr.releaseExecuted === true) && (!published || m.releaseStage !== 'RELEASE_PUBLISHED')) fail('R3F_RELEASE_EXECUTED_WITHOUT_PUBLISH', 'release_executed asserted but the GitHub Release is not published (draft/publishedAt/stage mismatch) — a tag alone or a draft Release alone never counts', { phase, capOn, recordFlag: rr.releaseExecuted === true, releaseStage: m.releaseStage, draft: gr && gr.draft, publishedAt: gr && gr.publishedAt });
        // a draft Release on record forbids release_executed in BOTH places
        if (gr && gr.draft === true && (capOn || rr.releaseExecuted === true)) fail('R3F_RELEASE_EXECUTED_ON_DRAFT', 'githubRelease.draft=true but release_executed is asserted', { phase, capOn, recordFlag: rr.releaseExecuted === true });
        // dmgUploaded must corroborate with assets; a recorded Release MUST carry an
        // assets array (missing/non-array is itself a violation — no silent skip), and
        // every entry must be a {name: string} object — bare strings are rejected outright
        if (gr && !Array.isArray(gr.assets)) fail('R3F_RELEASE_ASSETS_MISSING', 'githubRelease is recorded but assets is missing or not an array — asset evidence must be explicit', { phase, assets: gr.assets === undefined ? 'missing' : gr.assets });
        const assets = gr && Array.isArray(gr.assets) ? gr.assets : null;
        const assetsWellFormed = !!(assets && assets.every(a => a && typeof a === 'object' && !Array.isArray(a) && typeof a.name === 'string' && a.name.length > 0));
        if (assets && assets.length > 0 && !assetsWellFormed) fail('R3F_RELEASE_ASSETS_MALFORMED', 'githubRelease.assets entries must be {name: string} objects (bare strings/malformed entries rejected)', { phase, assets });
        const hasDmgAsset = !!(assets && assetsWellFormed && assets.some(a => /\.dmg$/i.test(a.name)));
        if (rr.dmgUploaded === true && !hasDmgAsset) fail('R3F_DMG_FLAG_WITHOUT_ASSET', 'releaseRecord.dmgUploaded=true but githubRelease.assets contains no well-formed .dmg entry', { phase, assets: assets || 'missing' });
        if (gr && assets && assets.length === 0 && rr.dmgUploaded !== false) fail('R3F_DMG_FLAG_NOT_FALSE_ON_EMPTY_ASSETS', 'githubRelease.assets is empty but releaseRecord.dmgUploaded is not exactly false', { phase, dmgUploaded: rr.dmgUploaded });
        // once a tag is recorded: it must be v2.0.0, annotated-with-object, and point exactly at the recorded main merge SHA
        if (rr.tag != null) {
          if (rr.tag !== 'v2.0.0') fail('R3F_RELEASE_TAG_WRONG', 'releaseRecord.tag must be v2.0.0; got ' + rr.tag, { phase, tag: rr.tag });
          if (!isSha(rr.tagTarget) || !isSha(rr.mainMergeSha) || rr.tagTarget !== rr.mainMergeSha) fail('R3F_TAG_TARGET_MISMATCH', 'releaseRecord.tagTarget must be the exact recorded mainMergeSha (both 40-hex)', { phase, tagTarget: rr.tagTarget, mainMergeSha: rr.mainMergeSha });
          if (rr.tagType !== 'annotated' || !isSha(rr.tagObjectSha) || rr.tagObjectSha === rr.tagTarget) fail('R3F_TAG_NOT_ANNOTATED', 'recorded tag must be annotated with its own tag-object SHA distinct from the peeled commit', { phase, tagType: rr.tagType, tagObjectSha: rr.tagObjectSha });
        }
        if (gr && gr.tagName != null && gr.tagName !== rr.tag) fail('R3F_RELEASE_TAG_NAME_MISMATCH', 'githubRelease.tagName differs from releaseRecord.tag', { phase, tagName: gr.tagName, tag: rr.tag });
        // stage/evidence coherence (monotonic, no history rewrite)
        if (m.releaseStage === 'RELEASE_TAGGED_DRAFT' && rr.tag == null && !gr) fail('R3F_RELEASE_STAGE_EVIDENCE_MISMATCH', 'releaseStage RELEASE_TAGGED_DRAFT but neither a tag nor a githubRelease is recorded', { phase });
        if (m.releaseStage === 'RELEASE_PREPARED' && (rr.tag != null || gr)) fail('R3F_RELEASE_STAGE_EVIDENCE_MISMATCH', 'releaseStage RELEASE_PREPARED but tag/Release evidence already recorded (stage may not lag evidence)', { phase });
        if (m.releaseStage === 'RELEASE_PUBLISHED' && !published) fail('R3F_RELEASE_STAGE_EVIDENCE_MISMATCH', 'releaseStage RELEASE_PUBLISHED but githubRelease is not published', { phase });
      }
    }
  }

  // ---- production guard: no R3.0B frozen module modification declared ----
  // (Static check: train validator just asserts that none of the per-checkpoint manifests declare any of
  //  the frozen R3.0B paths as authorizedPaths. The frozen-boundary check separately catches actual diff.)
  for (const phase of Object.keys(phaseManifests)) {
    for (const m of phaseManifests[phase]) {
      const paths = (Array.isArray(m.authorizedPaths) ? m.authorizedPaths : []).map(e => (e && (typeof e === 'string' ? e : e.path)) || null).filter(Boolean);
      for (const p of paths) if (FROZEN_R3B_PATHS.includes(p)) fail('AUTH_PATH_TOUCHES_R3B_FROZEN', phase + ' checkpoint ' + m.checkpoint + ' authorizes frozen R3.0B path ' + p, { phase, checkpoint: m.checkpoint, path: p });
    }
  }

  return finish({
    ok: violations.length === 0,
    violations,
    trainStatus: train.trainStatus,
    currentPhase: train.currentPhase,
    currentPhaseCheckpoint: train.currentPhaseCheckpoint,
    targetVersion: train.targetVersion,
    targetTag: train.targetTag,
    intermediateReleaseAllowed: train.intermediateReleaseAllowed,
    r4Excluded: train.r4Excluded,
    phases: phaseSummary,
    historicalCheckpointsByPhase: Object.keys(phaseManifests).reduce(function (acc, p) { acc[p] = phaseManifests[p].map(function (m) { return { checkpoint: m.checkpoint, headSha: m.headSha, status: m.status, governanceChanged: !!m.governanceChanged }; }); return acc; }, {}),
  });
}

function readJsonSafe(p) { try { return readJson(p); } catch (_) { return null; } }

function collectMaybeFiles(m) {
  // best-effort heuristic: per-checkpoint manifests may carry an optional changedFiles[] list. If absent
  // we cannot detect (and we don't false-fail). When present, we use it to enforce governanceChanged.
  if (Array.isArray(m.changedFiles)) return m.changedFiles.filter(s => typeof s === 'string');
  return [];
}

function touchesGovernanceFile(rel) {
  if (!rel || typeof rel !== 'string') return false;
  if (rel.startsWith('governance/')) return true;
  if (rel.startsWith('scripts/check-r3-0c-')) return true;
  if (rel.startsWith('scripts/check-r3-phase-')) return true;
  if (rel === 'scripts/check-r3-0-train.js') return true;
  if (rel === 'scripts/collect-evidence.js') return true;
  if (rel === '.github/workflows/ci.yml') return true;
  return false;
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) {
  result = {
    check: 'r3-0-train',
    ok: false,
    violations: [{ code: 'INTERNAL_VALIDATOR_FAILURE', message: String((e && e.stack) || e) }],
    trainStatus: null,
    currentPhase: null,
    currentPhaseCheckpoint: null,
    targetVersion: null,
    targetTag: null,
    intermediateReleaseAllowed: null,
    r4Excluded: null,
    phases: {},
  };
  exitCode = 2;
}
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'r3-0-train.json'), JSON.stringify(result, null, 2));
console.log('R3.0-TRAIN ' + JSON.stringify({
  trainStatus: result.trainStatus,
  currentPhase: result.currentPhase,
  currentPhaseCheckpoint: result.currentPhaseCheckpoint,
  targetVersion: result.targetVersion,
  intermediateReleaseAllowed: result.intermediateReleaseAllowed,
  r4Excluded: result.r4Excluded,
  violations: (result.violations || []).length,
  ok: result.ok,
}));
process.exit(exitCode);
