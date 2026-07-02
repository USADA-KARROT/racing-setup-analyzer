'use strict';
/**
 * tests/h6-signing-readiness.test.js — H6 signing/notarization readiness (static, install-free).
 * Verifies the NON-CREDENTIAL half of the signing story is complete and honest:
 *   - minimal entitlements plists exist, are valid-shaped, contain EXACTLY the two required
 *     hardened-runtime entitlements, and NONE of the forbidden ones;
 *   - electron-builder config wires hardenedRuntime + both entitlements files, notarize=false
 *     (env-gated by the runbook, never silently on);
 *   - the verifier script exists, is executable, and its source implements the honest
 *     semantics: BLOCKED codes for missing identity/credential/ticket + ad-hoc, FAIL for
 *     forbidden entitlements, and NEVER prints a PASS for a blocked state;
 *   - the runbook exists and never asks for a secret to be pasted/committed.
 */
const fs = require('fs');
const path = require('path');
let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); } };
const REPO = path.resolve(__dirname, '..');

// entitlements
const REQUIRED = ['com.apple.security.cs.allow-jit', 'com.apple.security.cs.allow-unsigned-executable-memory'];
const FORBIDDEN = ['disable-library-validation', 'allow-dyld-environment-variables', 'network.server', 'device.', 'personal-information', 'files.all'];
for (const f of ['entitlements.mac.plist', 'entitlements.mac.inherit.plist']) {
  const p = path.join(REPO, 'build-resources', f);
  const ok = fs.existsSync(p);
  chk(f + ' exists', ok);
  if (!ok) continue;
  // strip XML comments first — the rationale comments legitimately NAME the forbidden
  // entitlements while explaining their absence.
  const src = fs.readFileSync(p, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  chk(f + ' contains EXACTLY the two required entitlements', REQUIRED.every(e => src.includes('<key>' + e + '</key>')) && (src.match(/<key>/g) || []).length === 2);
  chk(f + ' contains NO forbidden entitlement (comment-stripped)', !FORBIDDEN.some(e => src.includes(e)));
}

// builder config
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
chk('mac.hardenedRuntime = true', pkg.build.mac.hardenedRuntime === true);
chk('mac.entitlements wired', pkg.build.mac.entitlements === 'build-resources/entitlements.mac.plist');
chk('mac.entitlementsInherit wired', pkg.build.mac.entitlementsInherit === 'build-resources/entitlements.mac.inherit.plist');
chk('mac.notarize explicitly false (env-gated by the runbook, never silently on)', pkg.build.mac.notarize === false);

// verifier script semantics
const vp = path.join(REPO, 'scripts', 'release-verify', 'verify-signing.sh');
chk('verify-signing.sh exists + executable', fs.existsSync(vp) && !!(fs.statSync(vp).mode & 0o111));
const vs = fs.readFileSync(vp, 'utf8');
chk('verifier reports DEVELOPER_ID_APPLICATION_MISSING as BLOCKED', /BLOCKED[^\n]*DEVELOPER_ID_APPLICATION_MISSING/.test(vs));
chk('verifier reports NOTARY_CREDENTIAL_MISSING as BLOCKED', /BLOCKED[^\n]*NOTARY_CREDENTIAL_MISSING/.test(vs));
chk('verifier reports NOTARIZATION_TICKET_MISSING as BLOCKED', /BLOCKED[^\n]*NOTARIZATION_TICKET_MISSING/.test(vs));
chk('verifier treats ad-hoc as BLOCKED (never a release PASS)', /ADHOC_ONLY_NO_DEVELOPER_ID/.test(vs));
chk('verifier checks deep+strict codesign', /--verify --deep --strict/.test(vs));
chk('verifier checks hardened runtime flag', /flags=.*runtime/.test(vs));
chk('verifier checks spctl Gatekeeper', /spctl --assess/.test(vs));
chk('verifier checks stapler validate', /stapler validate/.test(vs));
chk('verifier enumerates nested executables', /unsigned nested/.test(vs));
chk('verifier rejects forbidden entitlements as FAIL', /forbidden entitlement present/.test(vs));
chk('verifier never reads/prints secrets', !/password=|PRIVATE KEY|\.p8|\.p12/.test(vs));

// runbook
const rb = fs.readFileSync(path.join(REPO, 'docs', 'release-signing-runbook.md'), 'utf8');
chk('runbook exists with credential-boundary steps', /Developer ID Application/.test(rb) && /store-credentials/.test(rb));
chk('runbook forbids secrets in repo/log/chat', /No secret ever goes into the repo/.test(rb));
chk('runbook documents CI secret NAMES only', /CSC_LINK/.test(rb) && !/CSC_LINK\s*[:=]\s*\S+[A-Za-z0-9+/]{20}/.test(rb));

console.log('h6-signing-readiness: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
