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

const integrity = {
  dependencyAudit: depAuditOk, manifest: manifestOk, i18n: i18nOk, featureRegistry: registryOk, preset: presetOk,
  frozenBoundary: frozenOk, versionPolicy: versionOk, r3_0cScopeGuard: r30cOk,
  r3cGovernance: r3cGovernanceOk, r3cNoConsumer: r3cNoConsumerOk, r3cGovernanceIntegrity: r3cGovernanceIntegrityOk,
  dependencyInstallPerformed, lockfileTracked, shaMatch,
  present: {
    'dependency-audit.json': !!depAudit, 'test-manifest.json': !!manifest, 'i18n-result.json': !!i18n,
    'feature-registry-result.json': !!registry, 'preset-integrity.json': !!preset,
    'frozen-boundary-result.json': !!frozen, 'version-policy.json': !!version, 'r3-0c-guard.json': !!r30c,
    'r3-0c-governance.json': !!r3cGovernance, 'r3-0c-no-consumer.json': !!r3cNoConsumer,
    'r3-0c-governance-integrity.json': !!r3cGovernanceIntegrity,
  },
};

const allOk = depAuditOk && manifestOk && i18nOk && registryOk && presetOk && frozenOk && versionOk && r30cOk
  && r3cGovernanceOk && r3cNoConsumerOk && r3cGovernanceIntegrityOk
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
