# R3.0 Integrated Delivery Train Governance (G1 — Train Extension)

R3.0C C0 (Governance Bootstrap) is present in `main`. **G1 extends that bootstrap pattern across R3.0D, R3.0E, R3.0F so the four phases can run on one feature branch + one Draft PR + one final merge — without losing per-phase review accountability, without weakening the C0 fail-closed guarantees, and without opening any production switch.** This document explains what G1 adds, why each piece is required, and what G1 explicitly does NOT do.

## Why a separate Train Extension Bootstrap

The Integrated Delivery Train spans four production phases:

- **R3.0C** — Reference Lap & Corner Delta Intelligence (already C0/CP1 in `main`; C1..C8 not yet started).
- **R3.0D** — Virtual Race Engineer Decision Engine.
- **R3.0E** — Recommendation Experiment & Outcome Loop.
- **R3.0F** — Product Hardening, Migration & Release.

Each phase introduces its own production surface, runtime consumers, algorithms, UI, and (for R3.0F) the final semver bump from `1.4.0` to `2.0.0`. We want a single feature branch — not four sequentially-merged feature branches — but inside that branch each phase checkpoint must remain reviewable, gated, revocable, and unable to grant capability above its floor.

G1 establishes the rails that let four phases share one branch without losing review accountability:

1. **Per-phase governance dirs.** Each of R3.0D / E / F gets its own `governance/r3.0X/` (schema, state, capabilities, checkpoint-manifest schema, bootstrap checkpoint manifest). Identical pattern to `governance/r3.0c/`. Each phase's state.json starts every production switch off: zero authorized paths, zero enabled capabilities, all four `*Allowed` flags `false`.
2. **Train-level manifest.** `governance/r3.0/train.{schema,}.json` records phase ordering, cross-phase advancement rules, the scope pin SKYLINE/ChatGPT froze (same case, same session, cross-session forbidden, delta sign comparison-reference, reference selection explicit-only, hypothesis storage in independent IndexedDB namespaces, no intermediate release, target version `2.0.0` / tag `v2.0.0`, R4.0 excluded), capability monotonicity invariants, and historical-checkpoint policy.
3. **Shared parameterized validators.** `scripts/check-r3-phase-governance.js`, `check-r3-phase-no-consumer.js`, `check-r3-phase-governance-integrity.js` accept env `R3_PHASE_PROGRAM` (one of `R3.0D` / `R3.0E` / `R3.0F`) and validate that phase's governance dir against the same invariants the existing R3.0C validators enforce on R3.0C. The R3.0C validators themselves are unchanged — G1 does not refactor them and does not weaken their floors.
4. **Train validator.** `scripts/check-r3-0-train.js` enforces cross-phase invariants that no single-phase validator can: (a) D non-bootstrap requires R3.0C at C8; E non-bootstrap requires R3.0D at D5; F non-bootstrap requires R3.0E at E5. (b) capability monotonicity across each phase's checkpoint manifest history (no shrinking enabledCapabilities, no removing authorized paths). (c) scope-pin enforcement against both the schema and the state mirror — cross-session, reference auto-selection, intermediate release, target version drift, R3.0B case-record schema modification, R4 capability injection, governanceChanged flag omission, and PASS-without-bound-SHA all fail fail-closed.
5. **CI integration.** The trusted-verification workflow gains steps K / K2 / K3 / L / L2 / L3 / M / M2 / M3 / N — three per-phase validators for D/E/F plus the train-level validator. All are unconditional: they run on every PR and every push to `main`, never short-circuited by "this PR did not touch R3.0D/E/F". `scripts/collect-evidence.js` folds each new `ok` flag into `allOk` and surfaces the per-phase counts + train-level state in `summary.json`.
6. **Tests.** Four new test files (`tests/r3-0-phase-governance.test.js`, `r3-0-phase-no-consumer.test.js`, `r3-0-phase-governance-integrity.test.js`, `r3-0-train.test.js`) cover the PASS path on the real repo and a battery of adversarial FAIL fixtures: unknown checkpoint, bootstrap with enabled capability, wildcard / absolute / parent-segment / outside-allowed-root authorized paths, schema/program mismatch, ledger missing entry, enabled production capability without authorized path, missing `R3_PHASE_PROGRAM`, synthetic production-tree consuming a phase contract, missing required governance file (per phase), phase-before-its-upstream-final-activation (D / E / F), capability regression, authorized-path removal, governanceChanged flag missing when changedFiles touches governance, artifactBoundSha mismatch, PASS without bound SHA, intermediateReleaseAllowed=true, targetVersion/targetTag drift, scope-pin drift (same case / same session / cross-session / fastest_valid / median_valid / best_sector_composite / hypothesis storage / R4 exclusion), R4 capability injection, authorized path touching R3.0B frozen module, R3.0E missing `r3bCaseRecordSchemaUntouched=true`, R3.0F packageVersion drift before F6, train state missing required field, phase checkpoint mirror mismatch, invalid trainStatus enum.
7. **Governance-change visibility.** The R3.0C governance-integrity check continues to inventory its own dependencies. G1 adds per-phase integrity checks for D/E/F that include the shared train-level files and the new validators in their REQUIRED list. Any future commit that touches a listed file changes the bundle SHA, surfacing the change in the artifact — and the per-checkpoint manifest must declare `governanceChanged: true` so Codex scope includes governance review.

## Frozen product decisions (scope pin)

The scope pin lives in both `governance/r3.0/train.schema.json:scopePin` (authoritative) and `governance/r3.0/train.json:scopePinMirror` (state mirror). The train validator fails closed if either drifts. The pin is:

- **Comparison scope.** Same Analysis Case only. Same session only. Cross-session permanently forbidden. Cross-case permanently forbidden. (Per R3.0C CP1 contracts.)
- **Delta sign.** `comparison - reference`, single convention, no alternate. (Per R3.0C CP1 contracts.)
- **Reference-lap policy.** Explicit user selection only. `fastestValidEnabled=false`. `medianValidEnabled=false`. `bestSectorCompositeEnabled=false`. No selection → blocked.
- **Hypothesis storage.** Independent versioned IndexedDB namespaces (`hypothesis`, `experiment`, `outcome`, `follow-up`). MUST NOT extend the frozen R3.0B `case-record-schema`. Per checkpoint, R3.0E and R3.0F manifests must carry `r3bCaseRecordSchemaUntouched: true`.
- **Release.** No intermediate release. Target version `2.0.0`. Target tag `v2.0.0`. Current version pinned at `1.4.0` until F6 stages the bump. Tag and GitHub Release are created AFTER merge and AFTER the new `main` trusted-verification PASS.
- **R4 exclusion.** `r4Excluded=true`. Phase schemas may not contain capabilities whose names match `^r4_`, `^r40_`, `^r4.0_`, or `^r4.`.

## Cross-phase advancement rules

The train validator enforces (with `crossPhaseAdvanceRequires` from `train.schema.json`):

| Downstream phase | Allowed to leave bootstrap iff upstream phase state is |
|---|---|
| R3.0D | R3.0C `state.currentCheckpoint === 'C8_ACTIVATION'` |
| R3.0E | R3.0D `state.currentCheckpoint === 'D5_ENGINEER_BRIEF_ACTIVATION'` |
| R3.0F | R3.0E `state.currentCheckpoint === 'E5_ACTIVATION'` |

Bootstrap-to-bootstrap states (D0 with R3.0C at any state, E0 with R3.0D at any state, F0 with R3.0E at any state) are always allowed — bootstrap simply declares the scaffold exists.

## Capability + path monotonicity

The train validator iterates every phase's checkpoint manifests in order and enforces:

- `enabledCapabilitiesAfter[k] ⊇ enabledCapabilitiesAfter[k-1]` — once enabled, a capability never disappears from the recorded history. Aborting a phase is expressed via `trainStatus=ABORTED` at the train level, not by erasing per-phase history.
- `authorizedPaths` of checkpoint `k` ⊇ paths surface of checkpoint `k-1` — once authorized, an exact path is never silently removed (the audit trail would otherwise lose track of which capability that path served).

## Historical checkpoint policy

- `status: 'PASS'` requires `artifactBoundSha === headSha`. A checkpoint manifest cannot self-declare PASS; only a trusted-verification artifact bound to the head SHA may.
- `artifactBoundSha` and `headSha` must agree when both are non-null.
- The PR's final head SHA must re-verify all prior phases (the manifest CI step runs the per-file test manifest at the head, including every phase's governance test).

## What G1 explicitly does NOT do

- G1 adds **no** runtime consumer. No file under `renderer/js/`, `main.js`, `preload.js`, or `renderer/index.html` requires or imports anything from `contracts/r3.0d/`, `contracts/r3.0e/`, or `contracts/r3.0f/` (those contract dirs don't yet exist).
- G1 adds **no** algorithm. The phase schemas describe future capability surface; no functional code is added.
- G1 adds **no** UI. `renderer/index.html` is unchanged.
- G1 does **not** flip any feature in `renderer/js/feature-registry.js`. `case_comparison`, `reference_lap`, and `corner_delta` remain `availability: 'deferred'`, `deferredReason: 'R3.0C'`, with no `rendererAdapter`. No R3.0D / R3.0E / R3.0F feature IDs are introduced.
- G1 does **not** modify `scripts/check-r3-0c-guard.js`, `scripts/check-r3-0c-governance.js`, `scripts/check-r3-0c-no-consumer.js`, or `scripts/check-r3-0c-governance-integrity.js`. The R3.0C scaffold is preserved byte-for-byte.
- G1 does **not** authorize any production path. `authorizedProductionPaths` is `[]` in every phase state at the bootstrap checkpoint, and the phase governance validators pin that explicitly (`BOOTSTRAP_AUTH_PATHS_NONEMPTY` is a fail code).
- G1 does **not** bump `package.json` version (still `1.4.0`), introduce a lockfile, add a dependency, or change the CI install lane (still dependency-free).
- G1 does **not** create a feature branch, open a feature PR, create a tag, create a release, or merge anything. After G1 merges and SKYLINE issues the next authorization, `feat/r3.0-integrated-delivery` will be created from the new `main` SHA.

## File layout

```
governance/
  r3.0/
    train.schema.json                — phases, ordering, scope pin, cross-phase rules, status enum
    train.json                        — train state (GOVERNANCE_READY at G1)
  r3.0c/                              — unchanged (R3.0C C0 + CP1 already merged)
  r3.0d/
    schema.json                       — D0..D5 checkpoint universe, capabilities, floors
    state.json                        — D0_BOOTSTRAP, all-zero
    capabilities.json                 — capability ledger
    checkpoint-manifest.schema.json
    checkpoints/D0.json               — D0 manifest (status: pending in-commit)
  r3.0e/                              — same layout, E0_BOOTSTRAP all-zero, schema/manifest pin R3.0B-untouched
  r3.0f/                              — same layout, F0_BOOTSTRAP all-zero, schema pins targetVersion=2.0.0

scripts/
  check-r3-phase-governance.js              — per-phase state validator (D / E / F via env)
  check-r3-phase-no-consumer.js             — per-phase production consumer scanner
  check-r3-phase-governance-integrity.js    — per-phase SHA-256 inventory
  check-r3-0-train.js                       — train-level cross-phase + scope-pin + historical lineage
  check-r3-0c-*.js                          — UNCHANGED (preserves R3.0C invariants)
  collect-evidence.js                       — extended to fold the 10 new ok flags into allOk + summary

.github/workflows/ci.yml                    — adds steps K / K2 / K3 / L / L2 / L3 / M / M2 / M3 / N
tests/
  r3-0-phase-governance.test.js             — 59 cases (PASS real repo × 3 phases + adversarial FAILs)
  r3-0-phase-no-consumer.test.js            — 23 cases
  r3-0-phase-governance-integrity.test.js   — 20 cases
  r3-0-train.test.js                        — 34 cases (full adversarial battery + scope pin)
```

## Phase checkpoint intent (nothing below the bootstrap is authorized yet)

### R3.0D
| ID | Title | Unlocks |
|----|-------|---------|
| D0 | Governance Bootstrap | governance scaffold + visibility |
| D1 | Contract Foundation | contracts/r3.0d/ (Evidence / Hypothesis / Recommendation / Engineer Brief / Categories) |
| D2 | Hypothesis Engine | first authorized renderer/js/ path; runtimeConsumersAllowed floor |
| D3 | Priority Engine | priority ranking module; algorithmsAllowed floor |
| D4 | Engineer Brief | structured Engineer Brief generator; uiAllowed floor |
| D5 | Activation | Feature Registry registers R3.0D feature IDs; featureRegistryActivationAllowed floor |

### R3.0E
| ID | Title | Unlocks |
|----|-------|---------|
| E0 | Governance Bootstrap | governance scaffold + visibility |
| E1 | Contract Foundation | contracts/r3.0e/ (Experiment / Outcome / Control Variables / Case Timeline / follow-up) |
| E2 | Experiment Store | independent IndexedDB ns; runtimeConsumersAllowed floor |
| E3 | Outcome Classifier | expected-vs-observed engine; algorithmsAllowed floor |
| E4 | Case Timeline | UI surface; uiAllowed floor |
| E5 | Activation | Feature Registry registers R3.0E feature IDs; featureRegistryActivationAllowed floor |

### R3.0F
| ID | Title | Unlocks |
|----|-------|---------|
| F0 | Governance Bootstrap | governance scaffold + visibility |
| F1 | Migration Engine | unified schema migration; runtimeConsumersAllowed + algorithmsAllowed floors |
| F2 | E2E Automation | 8 E2E flows (browser + Electron) |
| F3 | Quality Hardening | keyboard nav / responsive / busy states / no console error; uiAllowed floor |
| F4 | Documentation | README / positioning / capability-map / r3-architecture / r3-user-workflow / r3-data-and-privacy / r3-credibility-model / r3-experiment-loop / CHANGELOG |
| F5 | Release Gate | 12-condition release gate script |
| F6 | Release | package.json 1.4.0 → 2.0.0; tag v2.0.0 and GitHub Release created AFTER merge + new main CI PASS |

## Status authority

A checkpoint manifest may carry `status: 'pending'` or `status: 'candidate'`. It may carry `status: 'PASS'` **only as a post-merge mirror** of a trusted-verification artifact bound to its `headSha`. Bootstrap manifests (D0/E0/F0) ship as `pending` — the PASS authority for each is the trusted-verification artifact on the G1 PR's head commit.

## Reading order for reviewers

1. `governance/r3.0/train.schema.json` — confirm scope pin literal values, phase ordering, cross-phase rules.
2. `governance/r3.0/train.json` — confirm `trainStatus=GOVERNANCE_READY`, `targetVersion=2.0.0`, `intermediateReleaseAllowed=false`, `r4Excluded=true`, every phase state mirror at its bootstrap.
3. `governance/r3.0d/{schema,state,capabilities,checkpoint-manifest.schema}.json` — confirm everything zero / false at D0.
4. `governance/r3.0e/...` — confirm same + `r3bCaseRecordSchemaUntouched=true` in E0 manifest.
5. `governance/r3.0f/...` — confirm same + packageVersion `1.4.0` in F0 manifest.
6. `scripts/check-r3-phase-governance.js` — confirm validator fails closed on every documented violation class.
7. `scripts/check-r3-phase-no-consumer.js` — confirm working-tree (not diff) consumer scan.
8. `scripts/check-r3-phase-governance-integrity.js` — confirm REQUIRED list includes train-level files.
9. `scripts/check-r3-0-train.js` — confirm cross-phase rules + scope pin + historical lineage all fail closed.
10. `scripts/collect-evidence.js` — confirm the 10 new ok flags fold into `allOk` and that no flag can be omitted via env.
11. `.github/workflows/ci.yml` — confirm K..N steps run unconditionally before evidence collection.
12. `tests/r3-0-phase-*.test.js`, `tests/r3-0-train.test.js` — confirm fixtures cover both PASS and FAIL paths for every documented violation.
