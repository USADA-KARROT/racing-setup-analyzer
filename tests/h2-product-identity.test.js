'use strict';
/**
 * tests/h2-product-identity.test.js — H2 icon + identity governance (static, install-free).
 * Verifies: icon assets exist and match the sha256 manifest; the generator (provenance) is
 * committed; package.json build config wires the icon/copyright/minimumSystemVersion/arm64 DMG;
 * appId/productName/name are UNCHANGED (userData + upgrade identity preserved).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; console.log('  \u2713 ' + n); } else { fail++; console.log('  \u2717 ' + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); } };
const REPO = path.resolve(__dirname, '..');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'build-resources', 'icon-manifest.json'), 'utf8'));
chk('icon manifest declares original design provenance', manifest.provenance && manifest.provenance.originalDesign === true && /generate-icon\.py/.test(manifest.provenance.generator));
let allMatch = true; let count = 0;
for (const [rel, expected] of Object.entries(manifest.files)) {
  count++;
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs) || sha(abs) !== expected) { allMatch = false; chk('asset hash: ' + rel, false, { exists: fs.existsSync(abs) }); }
}
chk('ALL ' + count + ' icon assets exist and match the manifest sha256', allMatch);

const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
chk('build.mac.icon wired to the committed icns', pkg.build.mac.icon === 'build-resources/icon.icns');
chk('build.copyright set', /USADA-KARROT/.test(pkg.build.copyright || ''));
chk('build.mac.minimumSystemVersion declared', pkg.build.mac.minimumSystemVersion === '12.0.0');
chk('dmg has Applications shortcut layout', Array.isArray(pkg.build.dmg.contents) && pkg.build.dmg.contents.some(c => c.type === 'link' && c.path === '/Applications'));
chk('appId UNCHANGED (upgrade identity)', pkg.build.appId === 'com.racingsetup.analyzer');
chk('productName UNCHANGED (userData identity)', pkg.build.productName === 'Racing Setup Analyzer');
chk('package name UNCHANGED (userData dir identity)', pkg.name === 'racing-setup-analyzer');
chk('mac target still arm64-only dmg', JSON.stringify(pkg.build.mac.target) === JSON.stringify([{ target: 'dmg', arch: ['arm64'] }]));

console.log('h2-product-identity: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
