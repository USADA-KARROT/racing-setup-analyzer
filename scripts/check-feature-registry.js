#!/usr/bin/env node
'use strict';
/**
 * R3-GATE0 — Feature Registry / reachability check (structured evidence).
 *
 * Requires the production feature-registry.js (the single source of truth) and asks IT — via the same
 * public API the app and tests use (FEATURES, isFeatureReachable, validateRegistry) — for orphans,
 * unreachable production features, duplicate routes, and the deferred-R3.0C contract. No re-derivation
 * of routing logic; if the registry changes shape, this reflects it.
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/feature-registry-result.json   (exit non-zero on any violation)
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
const R30C_FEATURE_IDS = ['case_comparison', 'reference_lap', 'corner_delta'];

function readActivationAllowed() {
  // Fail-closed: any IO / parse failure leaves activation=false (deferred contract still enforced).
  try {
    const st = JSON.parse(fs.readFileSync(path.join(REPO, 'governance', 'r3.0c', 'state.json'), 'utf8'));
    return st && st.featureRegistryActivationAllowed === true;
  } catch (_) { return false; }
}

function run() {
  const R = require('../renderer/js/feature-registry.js'); // static relative (dependency-audit friendly)
  const FEATURES = R.FEATURES;
  const ids = Object.keys(FEATURES);

  // A production feature is unreachable/orphaned if it is NOT deferred yet has no navigation path.
  const unreachable = ids.filter(id => FEATURES[id].availability !== 'deferred' && !R.isFeatureReachable(id));
  const orphans = unreachable.slice();

  // R3.0C feature contract — state-aware. While featureRegistryActivationAllowed=false (C0–C7) the
  // three IDs MUST be deferred without a rendererAdapter. Once activation is allowed (C8+) they MUST
  // be available with a rendererAdapter pointing at paneId='comparisons'. A missing state.json
  // collapses to activation=false (fail-closed), so the deferred contract continues to hold.
  const activationAllowed = readActivationAllowed();
  const missingR30c = R30C_FEATURE_IDS.filter(id => !FEATURES[id]);
  const r30cContractIntact = R30C_FEATURE_IDS.every(id => {
    const f = FEATURES[id];
    if (!f) return false;
    if (activationAllowed) {
      return f.availability === 'available'
        && !!f.rendererAdapter
        && f.rendererAdapter.paneId === 'comparisons'
        && f.deferredReason === undefined;
    }
    return f.availability === 'deferred' && f.deferredReason === 'R3.0C' && !f.rendererAdapter;
  });
  // Back-compat: surface both the legacy "deferredIntact" flag and the new "r30cContractIntact" so
  // existing CI / governance artifacts that grep on the old key continue to work.
  const missingDeferred = activationAllowed ? [] : missingR30c;
  const deferredIntact = activationAllowed ? true : r30cContractIntact;

  // Key production features must remain reachable.
  const vehiclePresetsReachable = !!(FEATURES['vehicle_presets'] && R.isFeatureReachable('vehicle_presets'));
  const handlingPredictionReachable = !!(FEATURES['handling_prediction'] && R.isFeatureReachable('handling_prediction'));

  // Registry self-validation (also surfaces duplicate ids / conflicting routes).
  const v = R.validateRegistry();
  const duplicateRoutes = (v.errors || []).filter(e => /^duplicate_id:/.test(e));

  const ok = unreachable.length === 0 && missingR30c.length === 0 && r30cContractIntact
    && vehiclePresetsReachable && handlingPredictionReachable && v.ok && duplicateRoutes.length === 0;

  return {
    check: 'feature-registry',
    totalFeatures: ids.length,
    productionFeatureOrphans: orphans.length, orphans,
    unreachableFeatures: unreachable.length, unreachable,
    r30cFeatureIds: R30C_FEATURE_IDS,
    activationAllowed,
    r30cContractIntact,
    missingR30c,
    // legacy keys kept for downstream artifacts that still read them
    deferredR30cIds: R30C_FEATURE_IDS,
    missingDeferred,
    deferredIntact,
    vehiclePresetsReachable, handlingPredictionReachable,
    validateRegistry: { ok: v.ok, errors: v.errors || [] },
    duplicateRoutes,
    ok,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) { result = { check: 'feature-registry', fatalError: String((e && e.stack) || e), ok: false, productionFeatureOrphans: -1, unreachableFeatures: -1 }; exitCode = 2; }
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'feature-registry-result.json'), JSON.stringify(result, null, 2));
console.log('REGISTRY ' + JSON.stringify({ orphans: result.productionFeatureOrphans, unreachable: result.unreachableFeatures, activationAllowed: result.activationAllowed, r30cContractIntact: result.r30cContractIntact, ok: result.ok }));
process.exit(exitCode);
