# Release Notes — 2.0.0 (DRAFT)

> **Status: DRAFT.** This document is the release-notes draft required by the R3.0F
> F5_RELEASE_GATE checkpoint (condition 10 of the 12-condition release gate,
> `governance/r3.0f/capabilities.json` → `release_gate_present`). The release itself —
> the single `package.json` version bump 1.4.0 → 2.0.0, the Train merge to `main`, the
> `v2.0.0` tag, and the GitHub Release — happens only at **F6_RELEASE**, after explicit
> user authorization. Nothing in this document implies any of those steps has occurred.

## What 2.0.0 is

2.0.0 is the R3.0 Integrated Delivery Train: everything from R3.0A through R3.0F merged
as one release on top of the 1.4.0 baseline. The authoritative per-milestone record is
[CHANGELOG.md](../CHANGELOG.md) (its `[Unreleased] — 2.0.0 candidate` section is the
canonical summary and is intentionally not duplicated here).

Highlights, briefly:

- **Case-centric workspace (R3.0A/B)** — persistent Case Library over IndexedDB with a
  frozen portable case-record schema (v1.4.0), export/import bundles, session storage.
- **Comparison foundation (R3.0C)** — same-case + same-session comparison authority,
  explicit-user-selection reference laps, six allowlisted delta metrics with the fixed
  `comparison − reference` sign convention, bounded comparison export. The Comparisons
  pane is live in the app.
- **Decision engine (R3.0D)** — evidence graph → hypothesis → priority → Engineer Brief
  producer chain, authoritative-only inputs (closure-private WeakSet verification),
  advisory-only output in physical units, no runtime LLM, no causation claims, no driver
  blame.
- **Experiment loop (R3.0E)** — experiment / outcome / follow-up-link / timeline stores
  and contracts, append-only timeline, fail-closed outcome classification.
- **Hardening, migration & E2E (R3.0F)** — per-store migration engine (tooling layer),
  nine Node-level E2E flows, six adversarial hardening probes (133 assertions),
  documentation set, and the 12-condition release gate.

## Installation status: unsigned and unnotarized

**The macOS build is not code-signed and not notarized. The Windows build is not
code-signed.** This is a deliberate, documented state for 2.0.0:

- On **macOS**, Gatekeeper will block a plain double-click on first launch. Open via
  right-click → Open (or `System Settings → Privacy & Security → Open Anyway`). The DMG
  carries the default Electron icon — no custom app icon ships in 2.0.0.
- On **Windows**, SmartScreen will warn about an unrecognized app. "More info → Run
  anyway" is required on first launch.
- No auto-update channel exists. The app never contacts an update server (see
  `docs/r3-data-and-privacy.md`, "Network egress").

## Upgrade guidance (from 1.4.0)

- 2.0.0 preserves the frozen R3.0B portable case-record schema **v1.4.0 unchanged** —
  existing case data in IndexedDB is read as-is; the runtime upgrade path is the
  per-read migration in `renderer/js/case-store.js` (`migrateCaseRecord` on `open`),
  which currently passes v1 records through unchanged and fail-closes on
  future-version records (`CANNOT_OVERWRITE_FUTURE` guards on every write path).
- The R3.0F F1 migration engine (`renderer/js/r3-0f-migration-engine.js`) ships in the
  package but is **not loaded by the renderer page** — it is exercised at the
  Node-test/tooling layer only in 2.0.0 (see "Known limitations").
- Records written by a FUTURE schema version are rejected fail-closed, never coerced.
- There is no downgrade path: once a future version writes data, 2.0.0 will refuse it.

## Backup and rollback guidance

- All persistent state lives in the Electron `userData` profile (IndexedDB) plus one
  `localStorage` key (`lang`). Backing up the `userData` folder while the app is closed
  is a complete backup; restoring it is a complete restore.
- The app itself provides case-level export (`Export` button → JSON bundle download)
  as a portable, partial backup; comparison summaries export separately. Neither export
  contains raw telemetry samples (see `docs/r3-data-and-privacy.md`).
- Rollback = reinstall the previous app version + restore the backed-up `userData`
  folder. In-app data deletion is partial by design (outcome/timeline stores are
  write-once/append-only); only deleting `userData` wipes everything.

## Privacy

Local-first; no designed cloud sync; no active product telemetry; no account; no remote
identity. Data leaves the machine only through user-initiated export downloads. The app
cannot control OS-level backups or other local processes. Full statement:
`docs/r3-data-and-privacy.md`.

## Known limitations (2.0.0)

1. **Pane wiring is partial.** The Comparisons pane is live and usable. The Engineer
   Brief, Experiment Loop, and Case Timeline **nav nodes** are live in navigation, but
   their pane content is not wired into `renderer/index.html` (the D5 Engineer Brief
   mount ships hidden/inert; the page loads no R3.0E viewmodel script). The underlying
   services and contracts ship, run under Node-level tests, and are documented, but a
   user cannot open those panes in 2.0.0.
2. **Packaged-but-not-loaded modules.** 15 files under `renderer/js/` ship inside the
   package but are never loaded by the page (the R3.0E module family, the R3.0C
   authority-pipeline modules superseded by the bundled contracts, the F1 migration
   engine, `vehicle-profile-f312.js`, `i18n-r3-0e.js`). They are inert in the packaged
   app: nothing executes them at runtime.
3. **No custom app icon.** `package.json`'s build config intentionally declares no icon;
   platforms show the default Electron icon.
4. **No license granted.** `package.json` declares `"license": "UNLICENSED"` and the
   repository carries no LICENSE file: all rights reserved; this public repository does
   not currently grant reuse rights. Adopting a license is a product decision deferred
   past 2.0.0.
5. **No tracked lockfile (by policy).** The repository's verification lane is
   dependency-free and `scripts/check-version-policy.js` enforces that
   `package-lock.json` stays untracked. A fresh `npm install` resolves
   `electron ^33.0.0` / `electron-builder ^25.0.0` by semver range; build reproducibility
   is bounded by those ranges, not a pinned lock. This is an accepted, documented
   trade-off of the dependency-free governance lane.
6. **Vendored renderer libraries.** Three third-party libraries ship vendored under
   `renderer/lib/`, outside npm governance: `alpine.min.js` (Alpine.js), `chart.min.js`
   (Chart.js 4.4.7), `tailwind.js` (Tailwind CSS browser build). They load from disk
   only (no CDN at runtime); no integrity hashes are recorded in-repo.
7. **Electron boot smoke is structural.** `tests/e2e/flow-09` validates declaration-level
   Electron structure (main/preload/webPreferences) without launching a window; no test
   boots the real Electron binary in CI (CI is install-free by policy).
8. **IndexedDB-specific failure paths untested in Node.** Quota-exceeded mapping and
   `tx.onabort` in `renderer/js/storage-backend.js` have no automated coverage (Node
   tests run on MemoryBackend); storage-failure semantics are covered at the transact
   contract level (`hardening-02`).
9. **No professional validation.** The product is not a professional race-engineer
   replacement; outputs are advisory, in physical units, with explicit credibility and
   limitations metadata (see `docs/r3-credibility-model.md`).

## Release boundary (what F5 explicitly does NOT do)

- No `package.json` version change (stays 1.4.0 until F6).
- No merge of the Train PR to `main`.
- No git tag, no GitHub Release, no deployment.
- No code signing, no notarization.
