# Release Notes — 2.0.1 (Public Release Candidate)

> **Status: RELEASE CANDIDATE — prepared for the v2.0.1 public release; publication
> pending explicit authorization.** v2.0.1 is the first PUBLIC build line: it is 2.0.0
> (the R3.0 Integrated Delivery Train — see `docs/release-notes-2.0.0.md`) plus the
> public-release hardening phases H1–H6. The `v2.0.1` tag, the public GitHub Release,
> and any binary upload do **not** exist yet — each requires explicit authorization.
> The pre-existing `v2.0.0` tag and its unpublished draft Release are historical
> snapshots and stay untouched.

## What 2.0.1 adds over 2.0.0 (the hardening line)

- **H1 — Packaged runtime integrity.** The since-v1.0.0 preload defect is FIXED:
  `window.electronAPI` now works in the packaged app; the app version is served by the
  main process (`app.getVersion()`) over a single allowlisted IPC channel; version
  reporting fail-closes to `unavailable` (never a fabricated value); packaged/dev CDP
  verification 12/12 each.
- **H3 — Reproducible build + supply chain.** Tracked `package-lock.json` (npm ci
  reproducible), exact electron/electron-builder pins, CycloneDX SBOM (419 components),
  vendored-library manifest with sha256 pinning (Alpine 3.14.8 / Chart.js 4.4.7 /
  Tailwind Play 3.4.17, all MIT), `THIRD_PARTY_NOTICES.md`, permissive-only license
  audit (zero copyleft), a dedicated supply-chain CI lane.
- **H4 — Real upgrade qualification.** A REAL v1.4.0-binary-authored profile opens
  correctly under the new build (upgrade 9/9, reopen 9/9; sentinel-proven Local Storage
  preservation; deterministic future-schema/downgrade/corruption suite 14/14). Honest
  finding: v1.4.0 had no case-persistence layer, so the upgrade is a fresh IndexedDB
  initialization — no legacy case data exists to migrate.
- **H2 — Product identity.** Original programmatic app icon (abstract R monogram with
  katakana-レ leg, 賽-hint negative space, vermilion apex dot, checkered block; 13
  assets sha256-pinned with an original-design declaration), copyright, minimum macOS
  12.0, DMG volume icon + /Applications layout. Bundle identity (appId/productName)
  unchanged — upgrades and userData continuity preserved.
- **H5 — UI delivery truth.** Engineer Brief is now LIVE (navigable, rendered,
  packaged-E2E-verified). Experiment Loop and Case Timeline are DEFERRED and removed
  from public navigation. 15 previously packaged-but-never-loaded modules are excluded
  from the app package (asar-verified). See
  `governance/hardening/h5-ui-truth-matrix.json`.
- **H6 — Signing readiness.** Hardened-runtime + minimal entitlements config, honest
  BLOCKED-semantics verification battery, operator signing/notarization runbook.
  **Signing/notarization execute only after the Apple credentials are installed** —
  until then builds are unsigned dev artifacts and are not distributed.

## Platform support

**Apple Silicon (arm64) macOS 12.0+ ONLY.** No Intel build, no universal binary, no
Windows build. Build targets and tooling enforce this (`scripts/check-supply-chain.js`).

## License / distribution

**UNLICENSED — all rights reserved.** Source visibility on GitHub does **not** grant
redistribution or reuse rights. Use of compiled binaries is permitted only under the
project-provided terms in the Release. Third-party components retain their own licenses —
`THIRD_PARTY_NOTICES.md` is authoritative. The GitHub-generated source archive attached
to any Release does not itself grant reuse rights.

## Installation status: not code-signed and not notarized (yet)

The current candidate build is **not code-signed and not notarized** — signing executes
only after the Apple credentials are installed (see `docs/release-signing-runbook.md`),
and unsigned artifacts are never published. The published v2.0.1 DMG will be Developer
ID-signed, notarized, and stapled before upload; the release checklist enforces this.

## Upgrade guidance

- From any 1.x: 1.x had no case-persistence layer; 2.0.1 initializes IndexedDB fresh on
  first launch over an existing profile and preserves prior Local Storage
  (H4-qualified with a real 1.4.0-authored profile: upgrade 9/9, reopen 9/9).
- From a 2.0.0 dev build: same frozen schema v1; records are read as-is (per-read
  migration pass-through); future-schema records are rejected fail-closed, never coerced.
- No downgrade path: once a future version writes data, 2.0.1 refuses it.

## Backup and rollback guidance

- All persistent state lives in the Electron `userData` profile
  (`~/Library/Application Support/racing-setup-analyzer`) — IndexedDB plus one
  `localStorage` key. Backing up that folder with the app closed is a complete backup;
  restoring it is a complete restore.
- In-app case export produces a portable partial backup (no raw telemetry samples).
- Rollback = reinstall the previous build + restore the backed-up `userData`.

## Release boundary (current state)

- DONE: hardening H1–H6 merged to the integration branch; version staged at 2.0.1.
- NOT DONE (each requires explicit authorization): `v2.0.1` tag, public GitHub Release,
  DMG upload, signing/notarization execution, `release_executed=true`.
- The legacy `v2.0.0` tag + unpublished draft Release are frozen history: never moved,
  never deleted, never published as the final version.

## Known limitations (2.0.1)

1. Experiment Loop and Case Timeline panes are deferred (not in this release).
2. IndexedDB-specific failure paths (quota, tx.onabort) remain covered at the contract
   level only (Node tests run on MemoryBackend).
3. No professional-engineering validation: outputs are advisory with explicit
   credibility/limitations metadata.
4. Signing/notarization pending credentials; unsigned artifacts are never published.
5. No auto-update channel; the app never contacts any server.
