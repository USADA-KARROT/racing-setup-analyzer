#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — evidence collector + final gate.
 *
 * Reads every structured check result already written to ARTIFACT_DIR, records the runtime environment
 * and the git/remote identity (binding the artifact to a concrete commit SHA), and emits the canonical
 * summary.json (the machine-readable verdict). overall === 'PASS' only if every check passed AND the
 * checked-out SHA matches the SHA GitHub Actions reported. Exits non-zero on FAIL so the job fails.
 *
 * Always writes summary.json / environment.json / git-identity.json / integrity-checks.json.
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');

function readJson(name) {
  try { return JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, name), 'utf8')); }
  catch (_) { return null; }
}
function gitOut(args) {
  const r = cp.spawnSync('git', args, { cwd: REPO, encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim() : null;
}
function cmdOut(cmd, args) {
  const r = cp.spawnSync(cmd, args, { cwd: REPO, encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim() : null;
}

const manifest = readJson('test-manifest.json');
const i18n = readJson('i18n-result.json');
const registry = readJson('feature-registry-result.json');
const preset = readJson('preset-integrity.json');
const frozen = readJson('frozen-boundary-result.json');
const version = readJson('version-policy.json');
const r30c = readJson('r3-0c-guard.json');
const depAudit = readJson('dependency-audit.json');
// R3.0C C0 — Integrated Delivery Governance evidence (each folds into allOk below).
const r3cGovernance = readJson('r3-0c-governance.json');
const r3cNoConsumer = readJson('r3-0c-no-consumer.json');
const r3cGovernanceIntegrity = readJson('r3-0c-governance-integrity.json');
// R3.0 G1 — Integrated Delivery Train per-phase governance (D/E/F) + train-level evidence (each folds into allOk).
const r3dGovernance = readJson('r3-0d-governance.json');
const r3dNoConsumer = readJson('r3-0d-no-consumer.json');
const r3dGovernanceIntegrity = readJson('r3-0d-governance-integrity.json');
const r3eGovernance = readJson('r3-0e-governance.json');
const r3eNoConsumer = readJson('r3-0e-no-consumer.json');
const r3eGovernanceIntegrity = readJson('r3-0e-governance-integrity.json');
const r3fGovernance = readJson('r3-0f-governance.json');
const r3fNoConsumer = readJson('r3-0f-no-consumer.json');
const r3fGovernanceIntegrity = readJson('r3-0f-governance-integrity.json');
const r3Train = readJson('r3-0-train.json');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const dependencyInstallPerformed = false; // dependency-free lane: CI installs nothing (version-policy enforces the workflow has no install step)
const lockfileTracked = !!gitOut(['ls-files', 'package-lock.json']);

// ---- environment ----
const environment = {
  verificationMode: 'dependency-free',
  dependencyInstallPerformed,
  lockfileTracked,
  nodeVersion: process.version,
  npmVersion: cmdOut('npm', ['-v']),
  node: process.version,
  npm: cmdOut('npm', ['-v']),
  platform: process.platform,
  arch: process.arch,
  ci: process.env.CI || null,
  runnerOs: process.env.RUNNER_OS || null,
  runnerArch: process.env.RUNNER_ARCH || null,
  generatedAtEnv: process.env.GITHUB_RUN_STARTED_AT || null,
};

// ---- git / remote identity ----
const checkedOutSha = gitOut(['rev-parse', 'HEAD']);
const ghHeadSha = process.env.HEAD_SHA || null;       // PR head SHA (workflow-supplied)
const ghBaseSha = process.env.BASE_SHA || null;       // PR/base SHA (workflow-supplied)
const githubSha = process.env.GITHUB_SHA || null;     // event SHA (merge ref on PRs)
const eventName = process.env.GITHUB_EVENT_NAME || null;
// On pull_request, the meaningful identity is the PR HEAD commit, not the synthetic merge ref.
const expectedSha = ghHeadSha || githubSha;
const shaMatch = !!(checkedOutSha && expectedSha && checkedOutSha === expectedSha);
const gitIdentity = {
  repository: process.env.GITHUB_REPOSITORY || null,
  event: eventName,
  ref: process.env.GITHUB_REF || gitOut(['rev-parse', '--abbrev-ref', 'HEAD']),
  baseSha: ghBaseSha,
  headSha: ghHeadSha,
  githubSha,
  checkedOutSha,
  expectedSha,
  shaMatch,
  note: 'On pull_request the artifact is bound to the PR HEAD commit (headSha), not the merge ref (githubSha).',
  runId: process.env.GITHUB_RUN_ID || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  workflow: process.env.GITHUB_WORKFLOW || null,
};

// ---- per-check ok derivation ----
const manifestOk = !!(manifest && manifest.summary
  && manifest.summary.failedFiles === 0 && manifest.summary.timeoutFiles === 0
  && manifest.summary.assertionsFailed === 0
  && (manifest.summary.discoveryMissing || []).length === 0
  && (manifest.summary.discoveryGhost || []).length === 0
  && !manifest.fatalError);
const i18nOk = !!(i18n && i18n.ok);
const registryOk = !!(registry && registry.ok);
const presetOk = !!(preset && preset.ok);
const frozenOk = !!(frozen && frozen.ok);
const versionOk = !!(version && version.ok);
const r30cOk = !!(r30c && r30c.ok);
const depAuditOk = !!(depAudit && depAudit.ok);
const r3cGovernanceOk = !!(r3cGovernance && r3cGovernance.ok);
const r3cNoConsumerOk = !!(r3cNoConsumer && r3cNoConsumer.ok);
const r3cGovernanceIntegrityOk = !!(r3cGovernanceIntegrity && r3cGovernanceIntegrity.ok);
const r3dGovernanceOk = !!(r3dGovernance && r3dGovernance.ok);
const r3dNoConsumerOk = !!(r3dNoConsumer && r3dNoConsumer.ok);
const r3dGovernanceIntegrityOk = !!(r3dGovernanceIntegrity && r3dGovernanceIntegrity.ok);
const r3eGovernanceOk = !!(r3eGovernance && r3eGovernance.ok);
const r3eNoConsumerOk = !!(r3eNoConsumer && r3eNoConsumer.ok);
const r3eGovernanceIntegrityOk = !!(r3eGovernanceIntegrity && r3eGovernanceIntegrity.ok);
const r3fGovernanceOk = !!(r3fGovernance && r3fGovernance.ok);
const r3fNoConsumerOk = !!(r3fNoConsumer && r3fNoConsumer.ok);
const r3fGovernanceIntegrityOk = !!(r3fGovernanceIntegrity && r3fGovernanceIntegrity.ok);
const r3TrainOk = !!(r3Train && r3Train.ok);

const integrity = {
  dependencyAudit: depAuditOk, manifest: manifestOk, i18n: i18nOk, featureRegistry: registryOk, preset: presetOk,
  frozenBoundary: frozenOk, versionPolicy: versionOk, r3_0cScopeGuard: r30cOk,
  r3cGovernance: r3cGovernanceOk, r3cNoConsumer: r3cNoConsumerOk, r3cGovernanceIntegrity: r3cGovernanceIntegrityOk,
  r3dGovernance: r3dGovernanceOk, r3dNoConsumer: r3dNoConsumerOk, r3dGovernanceIntegrity: r3dGovernanceIntegrityOk,
  r3eGovernance: r3eGovernanceOk, r3eNoConsumer: r3eNoConsumerOk, r3eGovernanceIntegrity: r3eGovernanceIntegrityOk,
  r3fGovernance: r3fGovernanceOk, r3fNoConsumer: r3fNoConsumerOk, r3fGovernanceIntegrity: r3fGovernanceIntegrityOk,
  r3Train: r3TrainOk,
  dependencyInstallPerformed, lockfileTracked, shaMatch,
  present: {
    'dependency-audit.json': !!depAudit, 'test-manifest.json': !!manifest, 'i18n-result.json': !!i18n,
    'feature-registry-result.json': !!registry, 'preset-integrity.json': !!preset,
    'frozen-boundary-result.json': !!frozen, 'version-policy.json': !!version, 'r3-0c-guard.json': !!r30c,
    'r3-0c-governance.json': !!r3cGovernance, 'r3-0c-no-consumer.json': !!r3cNoConsumer,
    'r3-0c-governance-integrity.json': !!r3cGovernanceIntegrity,
    'r3-0d-governance.json': !!r3dGovernance, 'r3-0d-no-consumer.json': !!r3dNoConsumer,
    'r3-0d-governance-integrity.json': !!r3dGovernanceIntegrity,
    'r3-0e-governance.json': !!r3eGovernance, 'r3-0e-no-consumer.json': !!r3eNoConsumer,
    'r3-0e-governance-integrity.json': !!r3eGovernanceIntegrity,
    'r3-0f-governance.json': !!r3fGovernance, 'r3-0f-no-consumer.json': !!r3fNoConsumer,
    'r3-0f-governance-integrity.json': !!r3fGovernanceIntegrity,
    'r3-0-train.json': !!r3Train,
  },
};

const allOk = depAuditOk && manifestOk && i18nOk && registryOk && presetOk && frozenOk && versionOk && r30cOk
  && r3cGovernanceOk && r3cNoConsumerOk && r3cGovernanceIntegrityOk
  && r3dGovernanceOk && r3dNoConsumerOk && r3dGovernanceIntegrityOk
  && r3eGovernanceOk && r3eNoConsumerOk && r3eGovernanceIntegrityOk
  && r3fGovernanceOk && r3fNoConsumerOk && r3fGovernanceIntegrityOk
  && r3TrainOk
  && dependencyInstallPerformed === false && shaMatch;

const summary = {
  commitSha: checkedOutSha,
  testFilesDiscovered: manifest && manifest.summary ? manifest.summary.discovered : -1,
  testFilesRan: manifest && manifest.summary ? manifest.summary.ran : -1,
  failedFiles: manifest && manifest.summary ? manifest.summary.failedFiles : -1,
  timeoutFiles: manifest && manifest.summary ? manifest.summary.timeoutFiles : -1,
  assertionsFailed: manifest && manifest.summary ? manifest.summary.assertionsFailed : -1,
  assertionsPassed: manifest && manifest.summary ? manifest.summary.assertionsPassed : -1,
  i18nMissing: i18n ? i18n.i18nMissing : -1,
  presetCount: preset ? preset.presetCount : -1,
  frozenDiffCount: frozen ? frozen.frozenDiffCount : -1,
  productionFeatureOrphans: registry ? registry.productionFeatureOrphans : -1,
  unreachableFeatures: registry ? registry.unreachableFeatures : -1,
  packageVersion: pkg.version,
  dependencyAuditExternalImports: depAudit ? (depAudit.externalImports || []).length : -1,
  dependencyAuditDynamicUnresolved: depAudit ? (depAudit.dynamicUnresolved || []).length : -1,
  // R3.0C C0 — Integrated Delivery Governance surface (each contributes to allOk above).
  r3cGovernanceCheckpoint: r3cGovernance ? (r3cGovernance.currentCheckpoint || null) : null,
  r3cGovernanceSchemaVersion: r3cGovernance ? (r3cGovernance.schemaVersion || null) : null,
  r3cAuthorizedProductionPathCount: r3cGovernance ? (typeof r3cGovernance.authorizedProductionPathCount === 'number' ? r3cGovernance.authorizedProductionPathCount : -1) : -1,
  r3cEnabledCapabilityCount: r3cGovernance ? (typeof r3cGovernance.enabledCapabilityCount === 'number' ? r3cGovernance.enabledCapabilityCount : -1) : -1,
  r3cRuntimeConsumersAllowed: r3cGovernance ? !!r3cGovernance.runtimeConsumersAllowed : null,
  r3cUiAllowed: r3cGovernance ? !!r3cGovernance.uiAllowed : null,
  r3cFeatureActivationAllowed: r3cGovernance ? !!r3cGovernance.featureRegistryActivationAllowed : null,
  r3cAlgorithmsAllowed: r3cGovernance ? !!r3cGovernance.algorithmsAllowed : null,
  r3cNoConsumer: r3cNoConsumerOk,
  r3cNoConsumerCount: r3cNoConsumer ? (typeof r3cNoConsumer.runtimeConsumerCount === 'number' ? r3cNoConsumer.runtimeConsumerCount : -1) : -1,
  r3cGovernanceIntegrity: r3cGovernanceIntegrityOk,
  r3cGovernanceIntegrityBundleSha256: r3cGovernanceIntegrity ? (r3cGovernanceIntegrity.bundleSha256 || null) : null,
  r3cDeferredStillDeferred: r30c ? !!r30c.deferredStillDeferred : (r3cNoConsumer ? !!r3cNoConsumer.deferredStillDeferred : false),
  r3cProductionDiff: r30c && typeof r30c.r3_0c_production_diff === 'number' ? r30c.r3_0c_production_diff : -1,
  // R3.0 G1 — Integrated Delivery Train per-phase + train-level surface.
  r3dGovernanceCheckpoint: r3dGovernance ? (r3dGovernance.currentCheckpoint || null) : null,
  r3dAuthorizedProductionPathCount: r3dGovernance ? (typeof r3dGovernance.authorizedProductionPathCount === 'number' ? r3dGovernance.authorizedProductionPathCount : -1) : -1,
  r3dEnabledCapabilityCount: r3dGovernance ? (typeof r3dGovernance.enabledCapabilityCount === 'number' ? r3dGovernance.enabledCapabilityCount : -1) : -1,
  r3dRuntimeConsumersAllowed: r3dGovernance ? !!r3dGovernance.runtimeConsumersAllowed : null,
  r3dUiAllowed: r3dGovernance ? !!r3dGovernance.uiAllowed : null,
  r3dFeatureActivationAllowed: r3dGovernance ? !!r3dGovernance.featureRegistryActivationAllowed : null,
  r3dAlgorithmsAllowed: r3dGovernance ? !!r3dGovernance.algorithmsAllowed : null,
  r3dNoConsumerCount: r3dNoConsumer ? (typeof r3dNoConsumer.runtimeConsumerCount === 'number' ? r3dNoConsumer.runtimeConsumerCount : -1) : -1,
  r3dGovernanceIntegrityBundleSha256: r3dGovernanceIntegrity ? (r3dGovernanceIntegrity.bundleSha256 || null) : null,
  r3eGovernanceCheckpoint: r3eGovernance ? (r3eGovernance.currentCheckpoint || null) : null,
  r3eAuthorizedProductionPathCount: r3eGovernance ? (typeof r3eGovernance.authorizedProductionPathCount === 'number' ? r3eGovernance.authorizedProductionPathCount : -1) : -1,
  r3eEnabledCapabilityCount: r3eGovernance ? (typeof r3eGovernance.enabledCapabilityCount === 'number' ? r3eGovernance.enabledCapabilityCount : -1) : -1,
  r3eRuntimeConsumersAllowed: r3eGovernance ? !!r3eGovernance.runtimeConsumersAllowed : null,
  r3eUiAllowed: r3eGovernance ? !!r3eGovernance.uiAllowed : null,
  r3eFeatureActivationAllowed: r3eGovernance ? !!r3eGovernance.featureRegistryActivationAllowed : null,
  r3eAlgorithmsAllowed: r3eGovernance ? !!r3eGovernance.algorithmsAllowed : null,
  r3eNoConsumerCount: r3eNoConsumer ? (typeof r3eNoConsumer.runtimeConsumerCount === 'number' ? r3eNoConsumer.runtimeConsumerCount : -1) : -1,
  r3eGovernanceIntegrityBundleSha256: r3eGovernanceIntegrity ? (r3eGovernanceIntegrity.bundleSha256 || null) : null,
  r3fGovernanceCheckpoint: r3fGovernance ? (r3fGovernance.currentCheckpoint || null) : null,
  r3fAuthorizedProductionPathCount: r3fGovernance ? (typeof r3fGovernance.authorizedProductionPathCount === 'number' ? r3fGovernance.authorizedProductionPathCount : -1) : -1,
  r3fEnabledCapabilityCount: r3fGovernance ? (typeof r3fGovernance.enabledCapabilityCount === 'number' ? r3fGovernance.enabledCapabilityCount : -1) : -1,
  r3fRuntimeConsumersAllowed: r3fGovernance ? !!r3fGovernance.runtimeConsumersAllowed : null,
  r3fUiAllowed: r3fGovernance ? !!r3fGovernance.uiAllowed : null,
  r3fFeatureActivationAllowed: r3fGovernance ? !!r3fGovernance.featureRegistryActivationAllowed : null,
  r3fAlgorithmsAllowed: r3fGovernance ? !!r3fGovernance.algorithmsAllowed : null,
  r3fNoConsumerCount: r3fNoConsumer ? (typeof r3fNoConsumer.runtimeConsumerCount === 'number' ? r3fNoConsumer.runtimeConsumerCount : -1) : -1,
  r3fGovernanceIntegrityBundleSha256: r3fGovernanceIntegrity ? (r3fGovernanceIntegrity.bundleSha256 || null) : null,
  trainStatus: r3Train ? (r3Train.trainStatus || null) : null,
  trainCurrentPhase: r3Train ? (r3Train.currentPhase || null) : null,
  trainCurrentPhaseCheckpoint: r3Train ? (r3Train.currentPhaseCheckpoint || null) : null,
  trainTargetVersion: r3Train ? (r3Train.targetVersion || null) : null,
  trainTargetTag: r3Train ? (r3Train.targetTag || null) : null,
  trainIntermediateReleaseAllowed: r3Train ? r3Train.intermediateReleaseAllowed : null,
  trainR4Excluded: r3Train ? r3Train.r4Excluded : null,
  dependencyInstallPerformed,
  shaMatch,
  overall: allOk ? 'PASS' : 'FAIL',
};

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'environment.json'), JSON.stringify(environment, null, 2));
fs.writeFileSync(path.join(ARTIFACT_DIR, 'git-identity.json'), JSON.stringify(gitIdentity, null, 2));
fs.writeFileSync(path.join(ARTIFACT_DIR, 'integrity-checks.json'), JSON.stringify(integrity, null, 2));
fs.writeFileSync(path.join(ARTIFACT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('SUMMARY ' + JSON.stringify(summary));
process.exit(allOk ? 0 : 1);
