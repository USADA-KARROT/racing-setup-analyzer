# R3-GATE0 — Trusted Remote Verification Pipeline

Status: introduced by branch `chore/r3-gate0-trusted-ci`. This document is the contract for how the
project decides that a change is verified. It exists because **local signals proved untrustworthy**.

## 1. Why local output is no longer an authority

This repository has repeatedly seen a local environment produce *fabricated* signals: phantom commit
SHAs, non-existent git objects, fake branch switches, fake fast-forwards, fake `npm` exit codes, fake
test summaries, fake `gh pr merge` "success", and even fake values that survived being written to a
file. Any verdict derived from local `stdout`, a local `npm` aggregate exit code, `gh pr merge`
output, a shell `$?`, a single `git ls-remote`, or a locally hand-written "PASS" can therefore be a
hallucination. **None of these may gate a merge.**

Local runs remain useful for *development* (edit → quick check → commit → push). They are advisory only.

## 2. The authorities (and only these)

1. The GitHub repository **branch SHA** (via the GitHub API).
2. The GitHub **Pull Request head SHA** (via the GitHub API).
3. GitHub **Actions check conclusions**.
4. The **structured artifact** uploaded by GitHub Actions, bound to a concrete commit SHA.
5. **Codex** review performed against a fixed remote commit SHA (read-only).

A claim is only "verified" when it is backed by the artifact + Actions conclusion for the **exact**
PR head SHA, cross-checked against the GitHub API SHA.

## 3. How the remote SHA is pinned

- Every CI run records `repository`, `event`, `base SHA`, `head SHA`, the **checked-out SHA**, the
  ref, the Node version, and the npm version into `git-identity.json` / `environment.json`.
- On `pull_request` the workflow checks out the **PR HEAD commit** (`github.event.pull_request.head.sha`),
  **not** the synthetic merge ref, and records both so they can never be conflated.
- A dedicated step fails the run if the checked-out SHA ≠ the event-reported HEAD SHA.
- `summary.json.commitSha` is that checked-out SHA. Acceptance requires
  `summary.json.commitSha === PR head SHA (GitHub API) === artifact-bound SHA`.

## 4. What GitHub Actions runs

Workflow: `.github/workflows/ci.yml` — `trusted-verification-gate`, job `trusted-verification`.
Triggers: `pull_request`, `push` to `main`, `workflow_dispatch`.
Runner: `ubuntu-latest`, Node `22` (LTS). **Dependency-free lane**: this repo has never tracked a
lockfile and verification needs no third-party package, so the job installs nothing (no `npm ci`). The
dependency audit (A0) proves that contract — see §10.
Permissions: `contents: read` only. The workflow never commits, pushes, tags, releases, or mutates
the repo. Every third-party Action is pinned to a full commit SHA:

| Action | Version | Pinned SHA |
| --- | --- | --- |
| actions/checkout | v7.0.0 | `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` |
| actions/setup-node | v6.4.0 | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` |
| actions/upload-artifact | v7.0.1 | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |

Checks (each writes a structured JSON result; all run even if an earlier one fails, so the evidence is
complete; any failure fails the job):

- **A0 — Dependency audit** (`scripts/check-verification-dependencies.js`): a tokenizer-based traversal
  of the require()/import graph from the test entry points + all verification scripts. Every specifier
  must be a Node builtin or a repo-relative path; a bare third-party specifier or an unresolvable
  dynamic load fails the gate (fail-closed). Two safe dynamic forms — `path.join(__dirname, …literals)`
  and the UMD `_req(p)` helper that forwards only literal relative specifiers — are adjudicated
  statically and recorded (`dynamicResolvedStatically`); nothing is optimistically skipped. The
  tokenizer is comment-, string-, regex-, AND template-aware (a hidden `` `${require('x')}` `` is still
  seen); `path.join` is trusted only when the file binds `path` to `require('path')` (a shadowed `path`
  is not); forwarded-arg call sites are matched on the token stream, not raw text; and `--selftest`
  carries adversarial cases proving these.
- **A — Full per-file test manifest** (`scripts/run-tests-manifest.js`): deterministic discovery from
  `package.json scripts.test`, cross-checked against `tests/*.js` on disk. Each file runs in its own
  child process; **per-file PASS authority is the exit code** (never a grep of "PASS", never the test
  name). Fail-closed on timeout and on exit/assertion inconsistency. Requires
  `failedFiles = 0`, `timeoutFiles = 0`, `assertionsFailed = 0`, and an empty discovery diff.
- **B — i18n parity** (`scripts/check-i18n.js`): loads the production i18n modules in the same order as
  `tests/i18n-parity.test.js`; `i18nMissing` = keys missing from any of `en` / `zh` / `ja`. Requires 0.
- **C — Feature registry / reachability** (`scripts/check-feature-registry.js`): asks the production
  `feature-registry.js` (the single source of truth) for orphans, unreachable production features,
  duplicate routes, that Vehicle Presets + Handling Prediction are reachable, and that the deferred
  R3.0C IDs are still deferred and carry no renderer adapter. Requires 0 orphans / 0 unreachable.
- **D — Preset integrity** (`scripts/check-preset-integrity.js`): loads the real `car-presets.js` in a
  vm context; requires count `= 501`, unique IDs; emits a stability hash (drift tracking only — git +
  the frozen-boundary check remain the content authority).
- **E — Frozen-boundary** (`scripts/check-frozen-boundary.js`): intersects the PR's changed files
  (`git diff base...head`) with `scripts/frozen-files.json`. Any frozen file touched → fail. A milestone
  explicitly authorised to change a frozen file passes only those paths via `FROZEN_ALLOW`; the check is
  never disabled.
- **F — Version policy** (`scripts/check-version-policy.js`): `package.json` version must remain `1.4.0`
  unless `VERSION_BUMP_ALLOW` is set. CI never publishes/tags/releases.
- **G — R3.0C scope guard** (`scripts/check-r3-0c-guard.js`): the three deferred IDs stay deferred with
  no renderer adapter; the PR introduces no `renderer/js` module whose name implies those features; and
  any newly ADDED `renderer/js` module is content-scanned for R3.0C symbols (so a deferred-behaviour
  module with a neutral filename, e.g. `lap-analysis.js`, still fails).

`scripts/collect-evidence.js` aggregates everything and is the **final gate**: `overall = PASS` only if
every check passed AND the checked-out SHA matches the event-reported SHA.

## 5. Artifact: `trusted-verification-evidence`

Uploaded on every run (even on failure): every verifier has a step-level `timeout-minutes` below the
job timeout, so a single hung verifier is killed at the step (a failure, not a cancel) and the
collect + upload steps (`if: !cancelled()`) still run. Contents:

| File | Purpose |
| --- | --- |
| `dependency-audit.json` | dependency-free proof: entry points, files traversed, builtins, external imports, dynamic-unresolved, statically-resolved dynamics |
| `test-manifest.json` | per-file results + summary (discovered/ran/passed/failed/timeout/assertions, stdout/stderr digests) |
| `i18n-result.json` | locales, per-locale key counts, missing keys, `i18nMissing` |
| `feature-registry-result.json` | features, orphans, unreachable, deferred contract, duplicate routes |
| `preset-integrity.json` | `presetCount`, uniqueness, stability hashes |
| `frozen-boundary-result.json` + `frozen-diff.txt` | changed-vs-frozen intersection, `frozenDiffCount` |
| `version-policy.json` | `packageVersion`, expected, allow |
| `r3-0c-guard.json` | deferred-intact + R3.0C production diff |
| `environment.json` | node, npm, platform, runner |
| `git-identity.json` | repository, event, base/head/checked-out SHA, `shaMatch`, run id |
| `integrity-checks.json` | per-check ok roll-up + file presence |
| `summary.json` | the canonical machine verdict (see schema below) |

`summary.json` schema:

```json
{
  "commitSha": "...",
  "testFilesDiscovered": 58,
  "testFilesRan": 58,
  "failedFiles": 0,
  "timeoutFiles": 0,
  "assertionsFailed": 0,
  "i18nMissing": 0,
  "presetCount": 501,
  "frozenDiffCount": 0,
  "productionFeatureOrphans": 0,
  "unreachableFeatures": 0,
  "packageVersion": "1.4.0",
  "dependencyAuditExternalImports": 0,
  "dependencyAuditDynamicUnresolved": 0,
  "dependencyInstallPerformed": false,
  "shaMatch": true,
  "overall": "PASS"
}
```

`overall = PASS` additionally requires `dependencyAuditExternalImports = 0`,
`dependencyAuditDynamicUnresolved = 0`, and `dependencyInstallPerformed = false`.

## 6. How Codex binds to the remote SHA

The Codex architecture review (CP-GATE0) is run **only after** Actions is green for a fixed remote
commit SHA, and reviews **that** SHA (read-only) — never an un-pushed local state. Codex's before/after
working-tree fingerprint must be identical (it inspects, it does not edit). Codex asks whether the
workflow truly runs every test file, whether the manifest can miss a file or fake a PASS, whether the
timeout is fail-closed, whether the artifact SHA is bound to the PR head, whether the frozen guard can
be bypassed, whether any check is meaningless, whether CI mutates the repo or takes excessive
permissions or uses unpinned third-party Actions, and whether R3.0C remains unstarted.

## 7. Merge authority is separate from the building session

The session that builds/changes CI may **not** merge. It stops at `READY TO MERGE` (or a HARD STOP).
Merging happens only under a separate, explicit human authorization (`merge R3-GATE0 PR`). Branch
protection / required checks are configured by a human after this gate lands (see §8).

## 8. Governance enforcement & the self-referential trust boundary (post-merge admin action)

This gate runs from the PR checkout, so a PR that rewrites the gate itself (the workflow, a verifier
script, or `scripts/frozen-files.json`) could in principle make the gate pass itself. Two measures narrow
that inside the PR, and one closes it at the governance layer:

- **Base-anchored frozen set** — `check-frozen-boundary.js` reads the frozen manifest from BOTH the base
  commit (immutable within the PR) and the head, and uses their union, so a PR cannot drop an entry to
  slip a frozen file through.
- **CODEOWNERS** — `.github/CODEOWNERS` marks `.github/`, `scripts/`, and the frozen manifest as
  code-owner–owned, so edits to the gate require owner review.
- **Branch protection (the closing anchor)** — `main` currently has no branch protection. After this PR
  merges and the workflow runs green on `main`, an authorised human must, on `main`: (a) make
  `trusted-verification-gate / trusted-verification` a **required status check**; (b) enable **Require
  review from Code Owners**; and (c) require a PR before merging. Only then is it impossible to merge a PR
  that has rewritten the gate to pass itself. CI cannot and must not configure branch protection itself —
  it is a repo-admin / governance decision, deliberately left as a POST-MERGE action.

## 9. How R3.0C (and future milestones) use this pipeline

- Every R3.0C PR passes through this same gate. The test manifest, i18n, registry, preset, version, and
  frozen checks run unchanged.
- When R3.0C genuinely begins, enabling Reference Lap / Corner Delta means editing the registry
  contract and possibly a frozen file. That is allowed **only** via an explicit, reviewed allowlist
  (`FROZEN_ALLOW` for the specific paths; the registry guard updated deliberately) — never by disabling
  a check. The R3.0C scope guard is the canary that R3.0C has not started prematurely.
- The local-vs-CI split is permanent: even an all-green local run never substitutes for the GitHub
  Actions conclusion + artifact bound to the PR head SHA.

## 10. Why no `npm ci` (dependency-free lane)

This repository has never tracked a lockfile (`package-lock.json` is git-ignored and absent from the
remote tree), `package.json` declares **no** runtime dependencies, and the devDependencies
(Electron / electron-builder) are for packaging only — the 58 tests and the verification scripts use
**only** Node builtins and repo-relative `require()`. Running `npm ci` is therefore impossible
(no lockfile) and unnecessary, and synthesising a lockfile would silently change the project's existing
dependency governance. So the gate runs as a **dependency-free lane**: a fixed Node LTS, zero package
installation, and the A0 dependency audit proving nothing third-party is reachable. Not installing also
removes a whole class of network / registry / postinstall / supply-chain uncertainty from the gate.

**Scope of this gate.** It verifies tests, contracts, integrity, and static production behaviour. It is
**not** an Electron packaging / build pipeline. If a real build CI is ever needed, that is a separate
milestone which must decide — explicitly — whether to start tracking a lockfile, the Node/Electron
versions, the package manager, the dependency-update policy, and supply-chain controls. Those questions
must not be smuggled into R3-GATE0.

**Future third-party test dependency.** If the test/verification graph ever genuinely needs an npm
package, the A0 audit fails loudly (a bare specifier is reported with its file/line) rather than
degrading into a vague runtime "module not found" — forcing an explicit dependency-governance decision
before the lane changes.
