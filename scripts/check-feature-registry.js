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
const DEFERRED_R30C = ['case_comparison', 'reference_lap', 'corner_delta'];

function run() {
  const R = require('../renderer/js/feature-registry.js'); // static relative (dependency-audit friendly)
  const FEATURES = R.FEATURES;
  const ids = Object.keys(FEATURES);

  // A production feature is unreachable/orphaned if it is NOT deferred yet has no navigation path.
  const unreachable = ids.filter(id => FEATURES[id].availability !== 'deferred' && !R.isFeatureReachable(id));
  const orphans = unreachable.slice();

  // Deferred R3.0C must still exist, be deferred for R3.0C, and carry NO rendererAdapter (not operable).
  const missingDeferred = DEFERRED_R30C.filter(id => !FEATURES[id]);
  const deferredIntact = DEFERRED_R30C.every(id => {
    const f = FEATURES[id];
    return f && f.availability === 'deferred' && f.deferredReason === 'R3.0C' && !f.rendererAdapter;
  });

  // Key production features must remain reachable.
  const vehiclePresetsReachable = !!(FEATURES['vehicle_presets'] && R.isFeatureReachable('vehicle_presets'));
  const handlingPredictionReachable = !!(FEATURES['handling_prediction'] && R.isFeatureReachable('handling_prediction'));

  // Registry self-validation (also surfaces duplicate ids / conflicting routes).
  const v = R.validateRegistry();
  const duplicateRoutes = (v.errors || []).filter(e => /^duplicate_id:/.test(e));

  const ok = unreachable.length === 0 && missingDeferred.length === 0 && deferredIntact
    && vehiclePresetsReachable && handlingPredictionReachable && v.ok && duplicateRoutes.length === 0;

  return {
    check: 'feature-registry',
    totalFeatures: ids.length,
    productionFeatureOrphans: orphans.length, orphans,
    unreachableFeatures: unreachable.length, unreachable,
    deferredR30cIds: DEFERRED_R30C, missingDeferred, deferredIntact,
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
console.log('REGISTRY ' + JSON.stringify({ orphans: result.productionFeatureOrphans, unreachable: result.unreachableFeatures, deferredIntact: result.deferredIntact, ok: result.ok }));
process.exit(exitCode);
