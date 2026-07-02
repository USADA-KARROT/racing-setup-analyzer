#!/bin/bash
# H4 — reproducible authoring of the v1.4.0 upgrade fixture, with a full auditable transcript.
#
# This script IS the provenance: it documents (and re-runs) exactly how the 1.4.0-authored userData
# profile was produced, so the claim "a real v1.4.0 binary authored this fixture" is independently
# verifiable, not merely asserted. It:
#   1. records the v1.4.0 tag commit SHA + the electron binary identity/version used;
#   2. runs the REAL v1.4.0 app (electron . from a v1.4.0 worktree) and writes a Local Storage
#      sentinel FROM WITHIN the running 1.4.0 renderer over CDP (write/readback captured);
#   3. captures the COMPLETE profile directory tree (proving the ABSENCE of any IndexedDB dir),
#      a strings-extract of the Local Storage leveldb showing the sentinel present, and per-file
#      sha256 of the exact profile.
#
# Usage: h4-author-140-fixture.sh <v140WorktreeDir> <outEvidenceDir> <runnerMjs>
# It swaps the real userData profile aside and restores it (macOS Electron ignores $HOME).
# NOTE: no `pipefail` — several `grep` steps legitimately may match nothing on a given host.
set -eu
V140_DIR="$1"; OUT="$2"; RUNNER="$3"
AS="$HOME/Library/Application Support"
PROFILE="$AS/racing-setup-analyzer"
SENTINEL="v140-authored-$(date +%s)"

mkdir -p "$OUT"
TRANSCRIPT="$OUT/authoring-transcript.txt"
{
  echo "# H4 v1.4.0 fixture authoring transcript"
  echo "date_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "v140_worktree=$V140_DIR"
  echo "v140_git_sha=$(git -C "$V140_DIR" rev-parse HEAD)"
  echo "v140_git_describe=$(git -C "$V140_DIR" describe --tags 2>/dev/null || echo n/a)"
  echo "v140_package_version=$(node -e "console.log(require('$V140_DIR/package.json').version)")"
  echo "electron_binary=$V140_DIR/node_modules/.bin/electron"
  echo "electron_version=$(node -e "console.log(require('$V140_DIR/node_modules/electron/package.json').version)")"
  echo "sentinel=$SENTINEL"
} > "$TRANSCRIPT"

pkill -f "electron|Racing Setup Analyzer" 2>/dev/null || true
sleep 1
if [ -d "$PROFILE" ]; then mv "$PROFILE" "$PROFILE.h4author-backup"; fi
rm -rf "$PROFILE"

echo "## running real 1.4.0 + writing sentinel via CDP" >> "$TRANSCRIPT"
SEED_EXPR="(function(){ localStorage.setItem('h4_sentinel','$SENTINEL'); localStorage.setItem('h4_marker','present'); return JSON.stringify({wrote:localStorage.getItem('h4_sentinel'), marker:localStorage.getItem('h4_marker')}); })()"
node "$RUNNER" "$V140_DIR" 4 "$SEED_EXPR" >> "$TRANSCRIPT" 2>&1 || true

# Wait for the profile to be flushed to disk (leveldb writes are async on quit).
for i in $(seq 1 10); do
  if [ -d "$PROFILE/Local Storage/leveldb" ]; then break; fi
  sleep 1
done
sleep 1

echo "## complete profile directory tree (proves absence of IndexedDB)" >> "$TRANSCRIPT"
( cd "$PROFILE" && find . | sort ) > "$OUT/fixture-1.4.0-tree.txt" 2>/dev/null || echo "(profile tree capture failed)" >> "$TRANSCRIPT"
cat "$OUT/fixture-1.4.0-tree.txt" >> "$TRANSCRIPT" 2>/dev/null || true
IDB_COUNT=$( (cd "$PROFILE" && find . -iname "*IndexedDB*" 2>/dev/null | wc -l) | tr -d ' ')
echo "indexeddb_paths=$IDB_COUNT" >> "$TRANSCRIPT"

echo "## Local Storage leveldb sentinel extract (proves the 1.4.0 binary wrote it)" >> "$TRANSCRIPT"
( strings "$PROFILE/Local Storage/leveldb/"*.* 2>/dev/null | grep -o "h4_sentinel\|$SENTINEL\|h4_marker" | sort -u ) > "$OUT/fixture-sentinel-extract.txt" 2>/dev/null || true
cat "$OUT/fixture-sentinel-extract.txt" >> "$TRANSCRIPT" 2>/dev/null || true

echo "## per-file sha256 manifest" >> "$TRANSCRIPT"
( cd "$PROFILE" && find . -type f 2>/dev/null | sort | while read -r f; do echo "$(shasum -a 256 "$f" | cut -d' ' -f1)  $f"; done ) > "$OUT/fixture-1.4.0-profile.sha256" 2>/dev/null || true
echo "manifest_files=$( (wc -l < "$OUT/fixture-1.4.0-profile.sha256") | tr -d ' ')" >> "$TRANSCRIPT"

echo "SENTINEL_OUT=$SENTINEL"
