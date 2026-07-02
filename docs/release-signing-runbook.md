# Release signing & notarization runbook (macOS, Apple Silicon)

Operator: SKYLINE (local machine). **No secret ever goes into the repo, a log, or a chat.**
All commands run in a local terminal. The verification battery is
`scripts/release-verify/verify-signing.sh` — it reports `BLOCKED: …` codes until each
prerequisite exists, and never fabricates a PASS.

## One-time setup (credential boundary)

1. **Apple Developer Program** membership (Account holder or Admin).
2. **Developer ID Application certificate**
   - Xcode → Settings → Accounts → Manage Certificates → `+` → *Developer ID Application*, or
     create a CSR in Keychain Access and issue the cert at developer.apple.com/account/resources/certificates.
   - Install into the **login keychain** (double-click the downloaded `.cer`; the private key
     must live alongside it).
   - Verify: `security find-identity -v -p codesigning` → expect a line containing
     `Developer ID Application: <Your Name> (<TEAMID>)`.
3. **Team ID**: shown in the identity string above, and at developer.apple.com → Membership.
4. **Notarization credential** (pick ONE):
   - App Store Connect API key (recommended): App Store Connect → Users and Access →
     Integrations → App Store Connect API → Team key with *Developer* role. Download the
     `.p8` **once**, note Key ID + Issuer ID, then store it in the keychain:
     `xcrun notarytool store-credentials RSA_NOTARY --key /path/AuthKey_<KEYID>.p8 --key-id <KEYID> --issuer <ISSUER_UUID>`
   - or Apple ID + app-specific password (appleid.apple.com → App-Specific Passwords):
     `xcrun notarytool store-credentials RSA_NOTARY --apple-id <you@example.com> --team-id <TEAMID> --password <app-specific-password>`
   - Verify: `xcrun notarytool history --keychain-profile RSA_NOTARY` (empty history is fine;
     an auth error is not).

## Signed release build (after AUTHORIZATION PUBLISH prerequisites)

```bash
npm ci
# electron-builder auto-discovers the Developer ID identity in the keychain.
# Enable notarization for THIS build only (config keeps notarize:false by default):
export APPLE_TEAM_ID=<TEAMID>
npm run build:mac            # builds + signs (hardened runtime + minimal entitlements)
# Notarize + staple the DMG:
xcrun notarytool submit "build/Racing Setup Analyzer-<ver>-arm64.dmg" \
  --keychain-profile RSA_NOTARY --wait          # record the submission id + status
xcrun stapler staple "build/mac-arm64/Racing Setup Analyzer.app"
xcrun stapler staple "build/Racing Setup Analyzer-<ver>-arm64.dmg"
```

## Verification (must be ALL OK, zero BLOCKED, before any upload)

```bash
scripts/release-verify/verify-signing.sh \
  "build/mac-arm64/Racing Setup Analyzer.app" \
  "build/Racing Setup Analyzer-<ver>-arm64.dmg"
scripts/verify-app-identity.sh "build/mac-arm64/Racing Setup Analyzer.app" "build/Racing Setup Analyzer-<ver>-arm64.dmg"
```

Evidence to record (non-secret): notarytool submission id + status line, the final
`SIGNING-VERIFY {...}` summary, sha256 of the stapled .app and DMG.

## CI secret names (if signing ever moves to CI — names only, never values)

| Secret | Purpose |
|---|---|
| `CSC_LINK` / `CSC_KEY_PASSWORD` | base64 .p12 export of the Developer ID identity + its password |
| `APPLE_TEAM_ID` | team identifier |
| `APPLE_API_KEY` / `APPLE_API_KEY_ID` / `APPLE_API_ISSUER` | App Store Connect API key trio (or `APPLE_ID`+`APPLE_APP_SPECIFIC_PASSWORD`) |

## Failure handling

- `BLOCKED: DEVELOPER_ID_APPLICATION_MISSING` → step 2 above not done on this machine.
- `BLOCKED: NOTARY_CREDENTIAL_MISSING` → step 4 (`store-credentials RSA_NOTARY`).
- `notarytool submit` → `Invalid` status: `xcrun notarytool log <submission-id> --keychain-profile RSA_NOTARY` (the JSON log lists per-file issues; fix, rebuild, resubmit).
- Never work around a failure with an ad-hoc signature; never publish unsigned/unnotarized.
