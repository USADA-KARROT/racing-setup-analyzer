# R3.0C Integrated Delivery Governance (C0 — Bootstrap)

R3.0C CP1 (Contract Foundation) is present in `main`. R3.0C C0 (Governance Bootstrap) is present in `main`. **Neither statement means the R3.0C feature is active.** This document explains why a governance scaffold needed to land before any production checkpoint, and how the scaffold prevents premature activation.

## Why a separate Governance Bootstrap

The Integrated Delivery Train that follows C0 will eventually build a production adapter, a lap-validity authority, normalized-distance handling, corner segmentation and pairing, delta metrics, an export schema, a UI, and finally feature activation. Each of those is a real production change with real failure modes. We want a single integrated delivery branch — not nine half-merged features — but inside that branch each checkpoint must still be reviewable, gated, and revocable.

C0 establishes the rails that let the train run on a single branch without losing review accountability:

1. **Machine-readable truth in the repo.** Authorized production paths, enabled capabilities, the active checkpoint, and every `*Allowed` switch live in committed JSON under `governance/r3.0c/`. CI env vars never override or replace these — they may only read them. Reviewers diff governance JSON like any other code.
2. **Exact-path authorization.** Production paths are authorized one exact repo-relative path at a time. Wildcards, regex, globs, `..`, and absolute paths are refused. There is no way to "open up `renderer/js/*.js`" by accident.
3. **Capability ledger with unlock floors.** Each future capability is named and tied to the earliest checkpoint at which it may unlock. Enabling a capability below its floor is a fail-closed violation.
4. **Activation floors for the four switches.** `runtimeConsumersAllowed`, `algorithmsAllowed`, `uiAllowed`, and `featureRegistryActivationAllowed` each have a checkpoint floor in `schema.json`. Tripping a switch below its floor fails the governance validator. At C0, all four are `false`.
5. **Fail-closed validators.** Three new validators (governance state, no-runtime-consumer, governance integrity) each fail-closed on internal exception (exit code 2, `INTERNAL_VALIDATOR_FAILURE` violation, `ok: false`). They run unconditionally on every PR and every push to `main` — there is no "this PR didn't touch R3.0C" short-circuit.
6. **Evidence binding by SHA.** The trusted-verification gate continues to bind its artifact to a concrete commit SHA. The new C0 evidence (governance / no-consumer / governance-integrity) folds directly into `allOk` and is surfaced in `summary.json`.
7. **Governance-change visibility.** `check-r3-0c-governance-integrity.js` computes a SHA-256 inventory of every file that *defines* governance — schema, state, ledger, manifest schema, per-checkpoint manifests, the three new validators, the original `check-r3-0c-guard.js`, the CI workflow, and `collect-evidence.js`. C0 only emits the baseline inventory. Future checkpoints that change any of these files must declare `governanceChanged: true` in their checkpoint manifest so Codex scope includes governance review. The change is never silent.

## What C0 explicitly does NOT do

- C0 adds **no** runtime consumer of `contracts/r3.0c/`. No file in `renderer/js/`, `main.js`, `preload.js`, or `renderer/index.html` requires or links the contracts at runtime.
- C0 adds **no** algorithm. The contracts are descriptive only.
- C0 adds **no** UI. `renderer/index.html` is unchanged.
- C0 does **not** flip any feature in `renderer/js/feature-registry.js`. `case_comparison`, `reference_lap`, and `corner_delta` remain `availability: 'deferred'`, `deferredReason: 'R3.0C'`, with **no** `rendererAdapter`.
- C0 does **not** widen `scripts/check-r3-0c-guard.js`. Its filename pattern, content pattern, deferred-feature assertion, and exit semantics are preserved byte-for-byte.
- C0 does **not** add a production allowlist. `authorizedProductionPaths` is `[]` at C0 and the governance validator pins that explicitly (`C0_AUTH_PATHS_NONEMPTY` is a fail code).
- C0 does **not** bump `package.json` version (still `1.4.0`), introduce a lockfile, add a dependency, or change the CI install lane (still dependency-free).

## File layout

```
governance/r3.0c/
  schema.json                       — legal checkpoint IDs, capabilities, transitions, floors
  state.json                        — current checkpoint + enabled state (C0 = all-zero)
  capabilities.json                 — capability ledger (defined != enabled)
  checkpoint-manifest.schema.json   — format for per-checkpoint evidence manifests
  checkpoints/
    C0.json                         — C0's own manifest (status: pending in-commit)

scripts/
  check-r3-0c-governance.js              — state validator (fail-closed)
  check-r3-0c-no-consumer.js             — production consumer scanner (fail-closed)
  check-r3-0c-governance-integrity.js    — SHA-256 inventory (fail-closed, visibility)
  check-r3-0c-guard.js                   — UNCHANGED (preserves blocking semantics)
  collect-evidence.js                    — extended to fold C0 checks into allOk

.github/workflows/ci.yml          — adds steps H/I/J before the evidence collector
tests/
  r3-0c-governance.test.js              — 46 cases
  r3-0c-no-consumer.test.js             — 21 cases
  r3-0c-governance-integrity.test.js    — 14 cases
```

## Checkpoint roadmap (intent only; nothing below C0 is authorized yet)

| ID | Title | Unlocks |
|----|-------|---------|
| C0 | Governance Bootstrap | governance scaffold + visibility |
| C1 | Production Adapter | first authorized `renderer/js/` path; `runtimeConsumersAllowed` floor |
| C2 | Lap Authority | lap-validity + track-identity services; `algorithmsAllowed` floor |
| C3 | Normalized Distance | distance/position contract impl |
| C4 | Reference & Corner | reference-lap selection + corner segmentation + pairing |
| C5 | Delta Metrics | per-corner / per-lap deltas |
| C6 | Export | comparison-export schema implementation |
| C7 | UI | renderer UI surface; `uiAllowed` floor |
| C8 | Activation | Feature Registry flips deferred IDs; `featureRegistryActivationAllowed` floor |

## Status authority

A checkpoint manifest may carry `status: 'pending'` or `status: 'candidate'`. It may carry `status: 'PASS'` **only as a post-merge mirror** of a trusted-verification artifact that was bound to its `headSha`. C0's `checkpoints/C0.json` ships as `pending` — the PASS authority for C0 is the trusted-verification artifact on this PR's head commit.

## Reading order for reviewers

1. `governance/r3.0c/state.json` — confirm everything is zero/false.
2. `governance/r3.0c/schema.json` — confirm the legal universe is bounded.
3. `governance/r3.0c/capabilities.json` — confirm every future capability has a checkpoint floor.
4. `scripts/check-r3-0c-governance.js` — confirm the validator fails closed on every documented violation class.
5. `scripts/check-r3-0c-no-consumer.js` — confirm working-tree (not diff) consumer scan.
6. `scripts/check-r3-0c-governance-integrity.js` — confirm the inventory is exhaustive.
7. `scripts/collect-evidence.js` — confirm the three new ok flags fold into `allOk`.
8. `.github/workflows/ci.yml` — confirm the three new steps run unconditionally before evidence collection.
9. `tests/r3-0c-governance.test.js`, `tests/r3-0c-no-consumer.test.js`, `tests/r3-0c-governance-integrity.test.js` — confirm fixtures cover both PASS and FAIL paths.
