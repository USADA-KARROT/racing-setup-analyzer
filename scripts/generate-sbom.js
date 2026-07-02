#!/usr/bin/env node
'use strict';
/**
 * H3 — SBOM generator (CycloneDX 1.5 JSON), dependency-free.
 *
 * Reads package-lock.json (the tracked reproducible-build authority) and emits a deterministic
 * CycloneDX Software Bill of Materials at supply-chain/sbom.cdx.json. Every npm component gets a
 * purl, version, and (when the lockfile records it) a license expression and integrity hash.
 * Vendored (non-npm) renderer libraries are read from supply-chain/vendor-manifest.json and added
 * as components with their sha256 hashes so the SBOM covers the WHOLE shipped surface, not just npm.
 *
 * Deterministic: components are sorted by (name, version); no timestamps, no random serials (a fixed
 * serial derived from the root name+version). `--check` mode regenerates in-memory and fails if the
 * on-disk SBOM differs (drift guard) instead of writing.
 *
 * Uses only Node builtins (fs, path, crypto) + relative reads — no third-party package, so it passes
 * the dependency-free audit gate.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const LOCK = path.join(REPO, 'package-lock.json');
const VENDOR = path.join(REPO, 'supply-chain', 'vendor-manifest.json');
const OUT = path.join(REPO, 'supply-chain', 'sbom.cdx.json');

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function licenseOf(entry) {
  if (typeof entry.license === 'string') return entry.license;
  if (Array.isArray(entry.licenses) && entry.licenses[0]) return entry.licenses[0].type || null;
  return null;
}

function buildSbom() {
  const lock = readJson(LOCK);
  const pkgs = lock.packages || {};
  const root = pkgs[''] || {};
  const components = [];

  for (const [key, entry] of Object.entries(pkgs)) {
    if (key === '') continue; // root is metadata.component, not a component
    // node_modules/<name> or node_modules/<a>/node_modules/<b> — take the last path segment pair
    const m = key.match(/node_modules\/((?:@[^/]+\/)?[^/]+)$/);
    if (!m) continue;
    const name = m[1];
    const version = entry.version || null;
    const comp = {
      type: 'library',
      'bom-ref': `pkg:npm/${name}@${version}`,
      name,
      version,
      purl: `pkg:npm/${name}@${version}`,
      scope: entry.dev ? 'optional' : 'required', // devDependencies are build-time only
    };
    const lic = licenseOf(entry);
    if (lic) comp.licenses = [{ license: { name: lic } }];
    if (typeof entry.integrity === 'string' && entry.integrity.startsWith('sha512-')) {
      comp.hashes = [{ alg: 'SHA-512', content: entry.integrity.slice('sha512-'.length) }];
    }
    components.push(comp);
  }

  // Vendored (non-npm) libraries — covered by their own hashes.
  let vendor = { libraries: [] };
  try { vendor = readJson(VENDOR); } catch (_) { /* generated after this on first run */ }
  for (const v of vendor.libraries || []) {
    components.push({
      type: 'library',
      'bom-ref': `vendored:${v.name}@${v.version}`,
      name: v.name,
      version: v.version,
      scope: 'required',
      licenses: v.license ? [{ license: { name: v.license } }] : undefined,
      hashes: v.sha256 ? [{ alg: 'SHA-256', content: v.sha256 }] : undefined,
      properties: [
        { name: 'vendored', value: 'true' },
        { name: 'source', value: v.source || '' },
        { name: 'shippedPath', value: v.shippedPath || '' },
      ],
    });
  }

  components.sort((a, b) => (a.name + '@' + a.version).localeCompare(b.name + '@' + b.version));

  // Deterministic serial from the root identity (no timestamps/random — reproducible).
  const serialSeed = crypto.createHash('sha256').update(`${root.name || 'root'}@${root.version || '0'}`).digest('hex');
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${serialSeed.slice(0, 8)}-${serialSeed.slice(8, 12)}-${serialSeed.slice(12, 16)}-${serialSeed.slice(16, 20)}-${serialSeed.slice(20, 32)}`,
    version: 1,
    metadata: {
      component: {
        type: 'application',
        'bom-ref': `pkg:npm/${root.name}@${root.version}`,
        name: root.name || 'racing-setup-analyzer',
        version: root.version || null,
      },
      properties: [
        { name: 'reproducibleFrom', value: 'package-lock.json (lockfileVersion ' + (lock.lockfileVersion || '?') + ')' },
        { name: 'generator', value: 'scripts/generate-sbom.js (dependency-free)' },
      ],
    },
    components,
  };
}

const check = process.argv.includes('--check');
const sbom = buildSbom();
const serialized = JSON.stringify(sbom, null, 2) + '\n';

if (check) {
  let onDisk = null;
  try { onDisk = fs.readFileSync(OUT, 'utf8'); } catch (_) { /* missing */ }
  if (onDisk !== serialized) {
    console.error('SBOM DRIFT: supply-chain/sbom.cdx.json is stale — run `node scripts/generate-sbom.js`');
    process.exit(1);
  }
  console.log('SBOM up to date (' + sbom.components.length + ' components)');
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, serialized);
console.log('SBOM written: ' + path.relative(REPO, OUT) + ' (' + sbom.components.length + ' components)');
