#!/bin/bash
# H2 — packaged app identity verifier (re-runnable evidence tooling; needs a built .app).
# Verifies: bundle plist identity, icon presence + exact hash vs the committed asset,
# arm64-only Mach-O, and (if the DMG exists) mount/volume-name/Applications-shortcut.
# Exit 0 = all checks pass; non-zero = failure (fail-closed).
set -eu
APP="${1:-build/mac-arm64/Racing Setup Analyzer.app}"
DMG="${2:-}"
fail=0
chk() { if [ "$2" = "$3" ]; then echo "  OK  $1 = $2"; else echo "  FAIL $1 = '$2' (want '$3')"; fail=1; fi; }

PLIST="$APP/Contents/Info.plist"
[ -f "$PLIST" ] || { echo "FAIL: $PLIST missing"; exit 1; }
pb() { /usr/libexec/PlistBuddy -c "Print :$1" "$PLIST" 2>/dev/null || echo ABSENT; }

chk CFBundleName             "$(pb CFBundleName)"             "Racing Setup Analyzer"
chk CFBundleDisplayName      "$(pb CFBundleDisplayName)"      "Racing Setup Analyzer"
chk CFBundleIdentifier       "$(pb CFBundleIdentifier)"       "com.racingsetup.analyzer"
chk CFBundleExecutable       "$(pb CFBundleExecutable)"       "Racing Setup Analyzer"
chk CFBundleIconFile         "$(pb CFBundleIconFile)"         "icon.icns"
chk LSMinimumSystemVersion   "$(pb LSMinimumSystemVersion)"   "12.0.0"
VER="$(pb CFBundleShortVersionString)"
chk "CFBundleVersion==Short"  "$(pb CFBundleVersion)"          "$VER"
PKGV="$(node -e "console.log(require('./package.json').version)")"
chk "plist version==package"  "$VER"                           "$PKGV"
case "$(pb NSHumanReadableCopyright)" in *"USADA-KARROT"*) echo "  OK  copyright mentions USADA-KARROT";; *) echo "  FAIL copyright"; fail=1;; esac

# icon: present AND byte-identical to the committed asset
ICNS_APP="$APP/Contents/Resources/icon.icns"
[ -f "$ICNS_APP" ] || { echo "  FAIL bundle icon.icns missing"; fail=1; }
H1s=$(shasum -a 256 "$ICNS_APP" | cut -d' ' -f1); H2s=$(shasum -a 256 build-resources/icon.icns | cut -d' ' -f1)
chk "bundle icon == committed icon (sha256)" "$H1s" "$H2s"
# NOT the Electron default icon (known default is ~such different size/hash; assert non-empty + our hash suffices)

# arch: arm64 only
ARCHS=$(lipo -archs "$APP/Contents/MacOS/Racing Setup Analyzer")
chk "Mach-O archs" "$ARCHS" "arm64"

# DMG (optional arg): mount, volume name, Applications shortcut
if [ -n "$DMG" ] && [ -f "$DMG" ]; then
  hdiutil attach "$DMG" -nobrowse -quiet
  VOL="/Volumes/Racing Setup Analyzer $PKGV"
  [ -d "$VOL" ] && echo "  OK  DMG volume '$VOL'" || { echo "  FAIL DMG volume name"; fail=1; }
  [ -L "$VOL/Applications" ] && echo "  OK  Applications symlink" || { echo "  FAIL Applications symlink"; fail=1; }
  [ -d "$VOL/Racing Setup Analyzer.app" ] && echo "  OK  app present in DMG" || { echo "  FAIL app missing in DMG"; fail=1; }
  hdiutil detach "$VOL" -quiet
fi

[ $fail -eq 0 ] && echo "APP-IDENTITY: PASS" || echo "APP-IDENTITY: FAIL"
exit $fail
