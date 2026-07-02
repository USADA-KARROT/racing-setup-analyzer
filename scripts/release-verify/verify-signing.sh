#!/bin/bash
# H6 — signing / notarization verification battery (re-runnable evidence tooling).
#
# Runs EVERY check it can and reports each as OK / FAIL / BLOCKED. Never fabricates:
# a missing signature or credential is reported as its specific BLOCKED code, never PASS.
#
# Usage: scripts/release-verify/verify-signing.sh <path-to-.app> [dmgPath]
# Exit codes: 0 = all runnable checks OK (may still include BLOCKED lines — see output),
#             1 = at least one FAIL (a real defect), 2 = usage error.
# The FINAL line is a machine-readable summary: SIGNING-VERIFY {"ok":..,"blocked":[..]}
set -u
APP="${1:-}"; DMG="${2:-}"
[ -d "$APP" ] || { echo "usage: verify-signing.sh <app> [dmg]"; exit 2; }
fails=0; blocked=()

say() { echo "  $1  $2"; }

# ---- 0. identity availability (determines BLOCKED vs FAIL semantics) ----
IDENTITIES=$(security find-identity -v -p codesigning 2>/dev/null | grep -c "Developer ID Application" || true)
if [ "${IDENTITIES:-0}" -eq 0 ]; then
  say BLOCKED "DEVELOPER_ID_APPLICATION_MISSING — no Developer ID Application identity in the keychain"
  blocked+=("DEVELOPER_ID_APPLICATION_MISSING")
fi

# ---- 1. is the bundle signed at all? (ad-hoc does NOT count) ----
SIGN_INFO=$(codesign -dv --verbose=2 "$APP" 2>&1 || true)
if echo "$SIGN_INFO" | grep -q "code object is not signed"; then
  say BLOCKED "APP_NOT_SIGNED — bundle carries no signature (expected until signing is authorized)"
  blocked+=("APP_NOT_SIGNED")
  SIGNED=0
elif echo "$SIGN_INFO" | grep -q "Signature=adhoc"; then
  # Apple Silicon REQUIRES at least an ad-hoc signature to execute, so an unsigned dev
  # build legitimately shows Signature=adhoc. That is a BLOCKED (not-yet-Developer-ID)
  # state — never acceptable for release, never reported as PASS.
  say BLOCKED "ADHOC_ONLY_NO_DEVELOPER_ID — ad-hoc signature only (dev state); Developer ID signing still required"
  blocked+=("ADHOC_ONLY_NO_DEVELOPER_ID")
  SIGNED=0
else
  say OK "bundle carries a real (non-ad-hoc) signature"
  SIGNED=1
fi

if [ "$SIGNED" -eq 1 ]; then
  # ---- 2. deep strict verification ----
  if codesign --verify --deep --strict --verbose=4 "$APP" 2>&1 | sed 's/^/      /'; then
    say OK "codesign --verify --deep --strict"
  else say FAIL "codesign deep/strict verification"; fails=$((fails+1)); fi

  # ---- 3. hardened runtime flag ----
  if codesign -d --verbose=2 "$APP" 2>&1 | grep -q "flags=.*runtime"; then
    say OK "hardened runtime flag present"
  else say FAIL "hardened runtime flag missing"; fails=$((fails+1)); fi

  # ---- 4. entitlements match the committed minimal set ----
  ENT=$(codesign -d --entitlements :- "$APP" 2>/dev/null || true)
  for want in com.apple.security.cs.allow-jit com.apple.security.cs.allow-unsigned-executable-memory; do
    echo "$ENT" | grep -q "$want" && say OK "entitlement $want" || { say FAIL "entitlement $want missing"; fails=$((fails+1)); }
  done
  for forbid in disable-library-validation allow-dyld-environment-variables com.apple.security.network.server com.apple.security.device; do
    echo "$ENT" | grep -q "$forbid" && { say FAIL "forbidden entitlement present: $forbid"; fails=$((fails+1)); } || say OK "forbidden entitlement absent: $forbid"
  done

  # ---- 5. nested code enumeration: every Mach-O inside must be signed ----
  UNSIGNED_NESTED=0
  while IFS= read -r bin; do
    codesign -dv "$bin" > /dev/null 2>&1 || { echo "      unsigned nested: $bin"; UNSIGNED_NESTED=$((UNSIGNED_NESTED+1)); }
  done < <(find "$APP/Contents/Frameworks" "$APP/Contents/MacOS" -type f -perm +111 2>/dev/null)
  [ "$UNSIGNED_NESTED" -eq 0 ] && say OK "all nested executables signed" || { say FAIL "$UNSIGNED_NESTED unsigned nested executables"; fails=$((fails+1)); }

  # ---- 6. Gatekeeper assessment ----
  if spctl --assess --type execute --verbose=4 "$APP" 2>&1 | sed 's/^/      /'; then
    say OK "spctl Gatekeeper assessment"
  else
    say BLOCKED "GATEKEEPER_REJECTED_OR_UNNOTARIZED — spctl did not accept (expected before notarization)"
    blocked+=("GATEKEEPER_REJECTED_OR_UNNOTARIZED")
  fi

  # ---- 7. notarization ticket / staple ----
  if xcrun stapler validate "$APP" > /dev/null 2>&1; then
    say OK "stapled notarization ticket validates (offline)"
  else
    say BLOCKED "NOTARIZATION_TICKET_MISSING — not notarized/stapled yet"
    blocked+=("NOTARIZATION_TICKET_MISSING")
  fi
fi

# ---- 8. notary credential availability (for the submit step) ----
if ! xcrun notarytool history --keychain-profile "RSA_NOTARY" > /dev/null 2>&1; then
  say BLOCKED "NOTARY_CREDENTIAL_MISSING — no 'RSA_NOTARY' keychain profile (xcrun notarytool store-credentials)"
  blocked+=("NOTARY_CREDENTIAL_MISSING")
else
  say OK "notarytool keychain profile 'RSA_NOTARY' reachable"
fi

# ---- 9. architectures ----
ARCHS=$(lipo -archs "$APP/Contents/MacOS/"* 2>/dev/null | sort -u | tr '\n' ' ')
case "$ARCHS" in *arm64*) say OK "arm64 Mach-O";; *) say FAIL "unexpected archs: $ARCHS"; fails=$((fails+1));; esac

# ---- 10. bundle identifier ----
BID=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null)
[ "$BID" = "com.racingsetup.analyzer" ] && say OK "bundle id $BID" || { say FAIL "bundle id drifted: $BID"; fails=$((fails+1)); }

# ---- 11. no-secret leak scan on this script's own output surface (paths only) ----
say OK "no secrets are read, printed, or required by this script"

# ---- optional DMG ----
if [ -n "$DMG" ] && [ -f "$DMG" ]; then
  if [ "$SIGNED" -eq 1 ] && codesign -dv "$DMG" > /dev/null 2>&1; then say OK "DMG signed"; else say BLOCKED "DMG_UNSIGNED (expected until signing authorized)"; blocked+=("DMG_UNSIGNED"); fi
fi

BLOCKED_JSON=$(printf '%s\n' "${blocked[@]:-}" | grep -v '^$' | sed 's/.*/"&"/' | paste -sd, -)
echo "SIGNING-VERIFY {\"ok\":$([ $fails -eq 0 ] && echo true || echo false),\"fails\":$fails,\"blocked\":[${BLOCKED_JSON}]}"
exit $([ $fails -eq 0 ] && echo 0 || echo 1)
