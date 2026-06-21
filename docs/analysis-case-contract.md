# Minimal AnalysisCase Foundation (R2.1D)

**Status:** delivered for review on branch `feat/r2.1d-analysis-case-foundation` (base `9ac1430`).
Pure data/test layer — **changes no model/telemetry/UI behaviour, not committed, not merged.**

R2.1D builds the first **binding container** that ties VehicleProfile + SetupSnapshot +
TelemetrySessionRef + ModelSnapshot into one versioned, serializable, fail-closed analysis case. It is
**not an analysis engine**: no model run, no comparison, no measured K_us, no recommendation. Its only
job is to know *which car / which setup / which telemetry session / which model version* belong to one
analysis, and to state honestly *what is allowed, what is blocked, and why*.

## Input trust boundary (what the API accepts)

The public API accepts **plain, finite, JSON-compatible application data only** — plain objects/arrays,
finite numbers, strings, booleans, `null`. The following **exotic JS values are rejected** (not
accepted, not silently coerced): getters/accessors and any object carrying a `toJSON`, `Symbol`
own keys, non-enumerable own properties, `function`, `BigInt`, `Map`/`Set`/`Date`/`TypedArray`/host
objects, non-finite numbers (`NaN`/`Infinity`), and cyclic graphs. Private references are normalized
(percent- / `%uXXXX`-decoding, up to 3 passes; malformed valid-hex encodings fail closed) before the
path/scheme check; a bare literal `%` is not treated as an encoding.

This contract **does not claim to safely introspect arbitrary hostile JavaScript objects** — R2.1D is an
internal data layer whose caller is same-trust application code. What it **does** guarantee is that every
public entry point (`createAnalysisCase` / `validateAnalysisCase` / `serializeAnalysisCase` /
`parseAnalysisCase`; `makeSetupSnapshot` / `validateSetupSnapshot`) is **fail-closed** on unsupported
input: it returns an invalid result with an explicit error, **never throws and never silently changes a
value**. A getter/Proxy trap that throws during structural read is caught and becomes
`exotic_or_unreadable_input`; a rejected accessor's getter is never executed (the JSON-safety check uses
property descriptors, not reads, and short-circuits before any further access); a function passed to
serialize yields `null`, not an exception.

**Proxy note:** a `Proxy` whose structural read *throws* or *yields an exotic value* fails closed like any
other exotic object. A **fully transparent** `Proxy` that forwards every trap to a plain target is, by
construction, structurally indistinguishable from that plain target — we do **not** claim to detect it and
it is treated as the plain data it forwards to (no private data can pass that the underlying plain object
could not). Detecting transparent proxies would need a non-portable runtime hook and is out of scope.

---

## Files (all new, branch-only)

| File | Purpose |
|---|---|
| `renderer/js/setup-snapshot.js` | SetupSnapshot contract (what was actually run) + clean-room id guard |
| `renderer/js/analysis-case.js` | AnalysisCase contract: create / validate / derive capability / provenance / serialize / parse |
| `tests/fixtures/analysis-case-f312-synthetic.js` | sanitized synthetic F312/F317 case fixture |
| `tests/setup-snapshot.test.js` | 35 tests |
| `tests/analysis-case.test.js` | 43 tests (matrix A/B/C/D/E/G + serialize) |
| `tests/analysis-case-adversarial.test.js` | 78 tests (red-line + closed-schema + encoding + exotic-input) |
| `docs/analysis-case-contract.md` | this document |
| `package.json` | test-script wiring (3 new suites) |

Dependencies (each only on what it needs): `parameter-conversions` → canonical-parameters; `setup-snapshot`
→ canonical-parameters; `analysis-case` → canonical-parameters + parameter-conversions + setup-snapshot.
No module imports `dynamics-model.js` or any UI/telemetry runtime.

---

## SetupSnapshot (`setup-snapshot.js`)

"What was actually run" — **not** the VehicleProfile's option tables. Shape:
`snapshotId · schemaVersion · vehicleProfileId · selectedOptions[] · measuredSettings{} ·
electronicSettings{} · tyreContext · unresolvedSelections[] · provenanceSummary`.

- **selectedOptions** reference a profile option-table row by opaque `optionId` — they never copy a
  value (the option table and the actual selection stay separate).
- **measuredSettings** are `RawSourceValue`s (R2.1A): raw value + unit + basis + provenance preserved;
  a ratio is never a bare number; an unknown stays `null`/`unknown` — no generic fill.
- **unresolvedSelections** record a chosen option whose canonical value is still blocked (e.g. ARB with
  unknown motion ratio), each tagged with the `parameterKey` it would feed.
- Fail-closed: bad category / private id / malformed entry → `valid:false` + `errors[]`; never throws.

## AnalysisCase (`analysis-case.js`)

`AnalysisCaseV1`: `schemaVersion · caseId · caseMetadata · vehicleBinding · setupSnapshot ·
telemetryBinding · modelSnapshot · context · capabilityState · blockedReasons · provenanceSummary`.

- **schemaVersion** required; an unknown major version is rejected (no silent accept).
- **caseId / ids** opaque only — a path / filename / private folder / fingerprint is rejected
  (`isPrivateRef`). **createdAt is caller-provided** (no implicit clock → reproducible).
- **vehicleBinding** version-locks the profile (`profileVersion` or `profileDigest` required) so an old
  case stays reproducible; the bound `setupSnapshot.vehicleProfileId` must equal `vehicleBinding.profileId`.
- **telemetryBinding** is a reference only: `sessionId · adapterId · sourceFormat ·
  channelCapabilitySummary · qualitySummary · confirmationState`. Raw samples / binary / CSV text /
  paths are **rejected** (not silently dropped). `confirmationState` keeps the telemetry fail-closed
  philosophy: raw steering ≠ confirmed road-wheel angle; nominal steering ratio ≠ dynamic calibration.
- **modelSnapshot** is an INPUT + version snapshot: `modelId · modelVersion · calibrationVersion ·
  canonicalContractVersion · canonicalInputSnapshot`. It holds only canonical values produced by the
  R2.1A/B contract (or their blocked/unknown state) — **never** Tier-1/2/3 results, predicted K_us,
  yaw gain, lap time, or Advisor output.
- **context** is nullable (`trackProfileRef`/`weatherContext`/`sessionTyreContext` may be null) — an
  incomplete case is still assembled.
- The R2.1A three layers are never flattened (`frontSpringRate: 140.4` is not allowed — values live as
  `{value, unit, modelUsable, conversionRef, blockedReasons, …}`).

### Capability derivation (`deriveCapabilityState`, pure, no override)

The caller can **never** supply `capabilityState` (rejected at create); it is recomputed from data and
any tamper is rejected at validate. canonical-input `modelUsable` is **recomputed authoritatively** —
a hand-flagged `modelUsable:true` on a blocked value does not stick.

| flag | rule |
|---|---|
| `caseAssembled` | all four bindings structurally valid + setup bound to same profile |
| `vehicle/setup/telemetry/modelSnapshotLinked` | each binding present + opaque id |
| `modelInputEligible` | every required canonical input present **and** authoritatively `modelUsable` + conversionRef integrity ok + no unresolved selection |
| `telemetryInspectionEligible` | session ref + minimal quality (speed + one motion channel confirmed) — descriptive only |
| `modelTelemetryComparisonEligible` | **HARD false** (`MODEL_COMPARISON_NOT_IMPLEMENTED`) |
| `setupRecommendationEligible` | **HARD false** (`RECOMMENDATION_NOT_IMPLEMENTED`) |

Required canonical inputs: front/rear wheel rate, front/rear ARB roll stiffness, front/rear track,
wheelbase, mass, front weight %, CG height, front/rear roll-centre height.

### blockedReasons

Structured `{code, scope, severity, parameterKey, sourceRef, details}`. A non-array input fails closed
(`MALFORMED_BLOCKERS_INPUT`); a blocker missing `code` or `scope` is invalid; duplicates are deduped
deterministically; nothing is silently dropped. Codes include
`MISSING_REQUIRED_CANONICAL_PARAMETER · UNRESOLVED_SETUP_SELECTION · ARB_MOTION_RATIO_UNCONFIRMED ·
STEERING_CALIBRATION_UNCONFIRMED · TELEMETRY_TIMEBASE_UNCONFIRMED · MODEL_INPUT_INCOMPLETE ·
MODEL_COMPARISON_NOT_IMPLEMENTED · RECOMMENDATION_NOT_IMPLEMENTED · PRIVATE_SOURCE_REFERENCE_FORBIDDEN ·
CAPABILITY_TAMPERED · FORBIDDEN_FIELD_PRESENT`.

### API
`createAnalysisCase(input)` (clones input — no mutation, no model call, no generic fill) ·
`validateAnalysisCase(case)` → `{ok, errors, warnings}` (re-derives capability, recomputes usability,
rejects tampering) · `deriveCapabilityState(case)` · `summarizeCaseProvenance(case)` ·
`serializeAnalysisCase(case)` (a function / exotic value → `null`, never throws) · `parseAnalysisCase(json)` (re-validates).

---

## Synthetic F312/F317 fixture

`buildSyntheticF312Case()`: F312/F317 audit profile + synthetic setup selection + synthetic telemetry
session metadata + model version snapshot → a **valid, assembled** case that is honestly
`modelInputEligible: false`. It expresses the real structure: front wheel rate from a **ground**
identity, rear from a **spring-element × MR²** (mixed basis); ARB **blocked** on unknown MR; CG /
absolute RC / 13" tyre vertical **unknown**; steering ratio documented-nominal with road-wheel
calibration unavailable; telemetry has raw steering / yaw / speed but comparison stays blocked.
`privateSourceCount === 0`. No real filename / path / session id / raw data / generic fill.

---

## Tests & results

`npm test` → **exit 0**. Pre-existing suites unchanged (verify-dynamics 479; telemetry 67/105/48/52/84;
canonical 39 / conversions 38 / fixture 30; self-test 15). **New: setup-snapshot 35 · analysis-case 43
· analysis-case-adversarial 78 (= 156).** All red-line injections (measured K_us / recommendation /
overlay / fake road-wheel / "confirmed" calibration / generic CG / blocked-ARB-as-usable / path
injection / raw telemetry / manual comparison=true / manual recommendation=true / ghost conversionRef)
fail closed or are explicitly rejected.

### Fail-closed hardening (whole-object properties)

Beyond the per-field contract above, these whole-object properties hold (all regression-tested):
- **Closed schemas, not blacklists.** `canonicalInputSnapshot` is a fixed key set whose values are rebuilt
  via `makeCanonicalParameter` from a fixed field whitelist (an extra field or a key↔`parameter` mismatch
  → hard error; the caller object is never retained); telemetry summaries (`channelCapabilitySummary` /
  `qualitySummary` / `confirmationState`) are fixed key→type/enum schemas; `tyreContext` /
  `electronicSettings` are fixed allowlists. An unknown key is a hard error, never a silent drop.
- **One set of schema helpers** is shared by create, validate and parse (`_sanitizeBySchema`,
  `_sanitizeCanonicalInputSnapshot`, `_checkTyreContext`, `_checkElectronic`), so the rule cannot drift;
  validate re-runs the full structural schema and never trusts a nested `.valid` flag.
- **Capability + blocker integrity.** `capabilityState` is a closed vocabulary (an extra key is rejected);
  required structural blockers cannot be emptied post-build; blocker dedupe keeps the highest severity and
  merges details. A rate-like canonical value is only usable through a real, registry-resident `conversionRef`.
- **Prototype-safe.** Every object allowlist lookup uses `hasOwnProperty`, so `constructor` / `__proto__` /
  `prototype` are unknown keys, not inherited hits.
- **Private-reference normalization.** Paths/schemes are checked after percent- and `%uXXXX`-decoding (up to
  3 passes; malformed valid-hex fails closed); UNC, `file://`, `data:` and any `scheme://` are flagged; a
  bare literal `%` is not treated as an encoding.
- **Exotic-object boundary** (see "Input trust boundary"): non-finite numbers, Symbol keys, non-enumerable
  own properties, accessors (the getter is never executed), `Map`/`Set`/`Date`/`TypedArray`/function/BigInt
  and cyclic graphs are rejected; a getter/Proxy that throws becomes `exotic_or_unreadable_input`; serialize
  returns `null` rather than throwing. Transparent proxies are a documented limitation (see the Proxy note).
- **Forward-compatible.** An unknown `context` / `telemetryBinding` field is surfaced as a `warnings[]`
  entry, never silently erased; an incompatible `canonicalSessionSchemaVersion` raises a
  `TELEMETRY_SESSION_SCHEMA_INCOMPATIBLE` warning (the binding layer never hard-fails telemetry).

---

## Unresolved (carried forward)

1. **Schema cannot verify numeric truth.** A value mislabelled `documented` with a plausible number and
   a (real) sourceRef would pass — provenance/units/trail are enforced, the *number's* correctness is
   not. (Generic fills via `estimated`/`unknown` ARE caught.) Stays a known boundary.
2. **`vehicleBinding.profileDigest` is not yet computed/verified** against a canonical profile JSON
   (R2.1D only checks shape + version-lock presence). Digest computation is future work.
3. **TelemetryBinding is reference-only** — no Canonical Telemetry Session adapter yet (R2.3+).
4. **Track / weather / session-tyre context are stubs** (nullable), pending Track Intelligence (R2.5).
5. R2.1A/B unresolved items still apply (ARB MR unknown → ARB blocked; CG / absolute RC / tyre
   operating-point rate unknown; partial option tables).

---

## R2.1E migration proposal (NOT implemented)

**Goal:** let the physics core consume canonical per-axle wheel rates directly, retiring the global
`use_wheel_rate` boolean, without changing existing preset results.

```
legacy preset / input
   → normalizeLegacySuspensionInput()   // reproduces today's spring×MR² for existing presets, unchanged
   → canonical per-axle wheel rates / axle ARB roll stiffness   (the AnalysisCase canonicalInputSnapshot)
   → existing physics core (receives canonical; never re-applies MR²)
```

- New F312/F317 cases flow through the canonical path from day one; existing presets are byte-for-byte
  unchanged because the shim reproduces their current `spring×MR²` behaviour.
- `use_wheel_rate` becomes a legacy-compat note (already modelled that way in R2.1A).
- **Acceptance precondition (before any core wiring changes):** a synthetic equivalence test proving the
  shim reproduces current results for every existing preset, plus R2.1D/E suites green. This is a
  **proposal only** — it changes core dataflow and needs explicit go-ahead and its own work item.
