# Canonical Engineering Parameter Contract (R2.1A / R2.1B / R2.1C)

**Status:** delivered for review — pure data/test layer, **changes no model result**.
**Scope decided by SKYLINE:** R2.1A (contract) + R2.1B (conversion proofs) + R2.1C (F312/F317 fixture).
R2.1D (Minimal AnalysisCase) and the `use_wheel_rate` main-dataflow change are **deferred** (the
latter is proposed at the end, not implemented).

This is the bottom-most layer of the "Analysis Case Foundation". It exists because the F3 audit found
that **values entered the model before their physical meaning was standardised** (rate basis, ratio
direction, unit). A `{value, provenance, confidence}` schema would only *structure* that mess; this
contract makes the *physical definition* and the *transform status* first-class, gating fields.

```
RawSourceValue   →   ConversionRecord   →   CanonicalModelParameter
(manual / sheet)     (provenance-aware)     (model-ready, fixed unit)
```

---

## Files

| File | Layer | Purpose |
|---|---|---|
| `renderer/js/canonical-parameters.js` | R2.1A | enums + three-layer constructors + fail-closed validation + `modelUsable` gate |
| `renderer/js/parameter-conversions.js` | R2.1B | 5 named, versioned conversions (the audit's verified math) |
| `renderer/js/vehicle-profile-f312.js` | R2.1C | F312/F317 audit fixture (not a UI preset, not fed to the model) |
| `tests/canonical-parameters.test.js` | R2.1A | 29 schema-contract tests |
| `tests/parameter-conversions.test.js` | R2.1B | 36 conversion proof tests |
| `tests/vehicle-profile-f312.test.js` | R2.1C | 28 fixture tests |

All three modules are pure UMD (Node require / renderer global), no DOM, no deps beyond each other.
None imports `dynamics-model.js`. Added to `npm test` after the telemetry suites.

---

## R2.1A — Schema contract

### Enums (controlled vocabularies)
- **`SOURCE_BASIS`** — where a raw number physically lives: `spring_element`, `wheel`, `ground`
  (manufacturer "ground stiffness" = wheel-referred), `arb_blade_component` (legacy, one end locked),
  `arb_droplink`, `arb_ground_anti_symmetric` (F320-style: 2×component, wheel-referred), `chassis`,
  `unknown`.
- **`TRAVEL_TERM`** — motion-ratio terms: `wheel_travel`, `spring_travel`, `droplink_travel`.
- **`PROVENANCE`** — `documented` · `derived` · `measured` · `estimated` · `unknown`.
- **`CONFIDENCE`** — `high` · `medium` · `low` · `unknown` (a *descriptor*, never a gate).
- **`APPLICABILITY`** — `f312` · `f317` · `both` · `unclear` · `na`.
- **`CONVERSION_STATUS`** — `verified` (proof-test-locked) · `unverified` · `blocked` · `not_required`
  (already canonical / identity) · `rejected` (illegal basis for the requested conversion).
- **`CANONICAL_PARAM` / `CANONICAL_UNIT`** — the fixed vocabulary the physics core consumes, each with
  exactly one unit. Mandated cores present: `frontWheelRateNmm`, `rearWheelRateNmm` (N/mm),
  `frontArbRollStiffnessNmDeg`, `rearArbRollStiffnessNmDeg` (Nm/deg). Plus track/wheelbase/mass/
  weight%/CG/roll-centre/tyre-vertical/steering-ratio.

### Layer 1 — `makeRawSource(o)`
Keeps `value` (null allowed = honestly unknown; missing key = invalid), `unit`, `definition`, `basis`,
`ratioDefinition {numerator, denominator}`, `source` (sanitized citation id), `provenance`,
`confidence`, `applicability`, `notes`. **Fail-closed:** bad enum / missing unit-or-definition /
non-finite value / **a ratio with unknown or equal terms** → `valid:false` + `errors[]` (never throws).
A motion-ratio value is therefore **never a bare number** — its travel numerator/denominator are explicit.

### Layer 2 — `makeConversionRecord(o)`
Self-describing transform record: `conversionId`, `version`, `formula`, `status`,
`inputs {rawValue, rawUnit, rawDefinition, rawBasis, ratioDefinition, auxiliary}`,
`output {parameter, value, unit, ratioDefinition}`, `source`, `ok`, `reason`. The full provenance
trail is preserved; `ok:false` ⇒ `output.value:null`.

### Layer 3 — `makeCanonicalParameter(o)` + the `modelUsable` gate
```
modelUsable ⇔ value is finite
            ∧ provenance ∈ {documented, derived, measured}
            ∧ conversionStatus ∈ {verified, not_required}
            ∧ no explicit blockers   (a non-array blockers input FAILS CLOSED, never silently dropped)
            ∧ provenance trail: derived ⇒ conversionRef ; rate/stiffness param ⇒ conversionRef
```
**Confidence is NOT in the gate.** A low-confidence *documented* value is usable; a high-confidence
*estimated* value is not. A `derived` value is model-grade **only when its transform is `verified`** —
mislabelling provenance as `documented` cannot rescue an `unverified`/`blocked`/`rejected` transform.
A **rate/stiffness** parameter (wheel rate / ARB / tyre vertical) can never be a bare documented number
— it is usable only *through a conversion* (so a raw lb/in or kgf/mm cannot masquerade as canonical
N/mm or Nm/deg). `checkConversionIntegrity(param, registry)` (injected registry — no circular dep)
verifies a derived value points at a real, registry-verified conversion. `legacyUseWheelRate` is a note only.

---

## R2.1B — Conversion registry (the audit's three-way-verified math)

| id | ver | input basis | formula | status |
|---|---|---|---|---|
| `manual_ratio_to_software_mr` | 1 | wheel/spring ratio | `MR_sw = 1 / ratio_manual` (manual = wheel/spring travel ⇒ software = spring/wheel) | verified |
| `spring_element_to_wheel_rate` | 1 | `spring_element` | `wheel[N/mm] = element[N/mm] × MR_sw²` | verified |
| `ground_rate_to_wheel_rate` | 1 | `ground`/`wheel` | `wheel[N/mm] = ground[N/mm]` (identity — **no MR² again**) | not_required |
| `arb_component_to_axle_roll_stiffness` | 1 | `arb_blade_component` | `axle[Nm/deg] = k_comp[kgf/mm]×9.80665 /MR_arb² ×1000 ×(track_m²/2) ×π/180` | verified* |
| `f320_ground_arb_to_axle_roll_stiffness` | 0 | `arb_ground_anti_symmetric` | `axle = kGround[N/mm] ×1000 ×(track_m²/2) ×π/180` (no /MR², no ×2) | **unverified** |

\* `arb_component_to_axle_roll_stiffness` is `verified` **only when `arbMr` is provenance-tagged
documented/measured**; a bare/guessed motion ratio yields `unverified` (the chain math is identical,
but a specific car's axle stiffness is only as trustworthy as its ARB motion ratio).

**Locked by the proof tests:**
- manual wheel/spring ratio and software MR are reciprocals (F308 1.131→0.884, 1.299→0.770; F312
  rear 1.30→0.769); a missing or reversed ratio definition is **rejected**.
- spring-element → wheel rate uses **MR²**; a `ground` value is rejected from this path (would double-count MR).
- the legacy ARB chain is **inverse-square in MR_arb** and **quadratic in track**, and `track²/2`
  **already carries both sides** — proven equal to `2·K·(t/2)²` and **not** equal to `K·t²` (no extra ×2).
- **F320 anti-symmetric "ground" stiffness through the legacy component chain → rejected.** F320's own
  conversion runs (convention-correct) but is deliberately **unverified** (no corpus to lock it).
- illegal basis / unrecognised unit / missing auxiliary → fail-closed (`ok:false`, `value:null`, no throw).
- a `derived` result is never `documented`.

> The ARB chain math is verified; **per-car trust is only as good as that car's `MR_arb`.** When the
> ARB motion ratio is unknown the canonical layer keeps the parameter `blocked` (see fixture).

---

## R2.1C — F312 / F317 audit fixture

`vehicle-profile-f312.js` → `buildF312Fixture()`. Layered: `identity · documentedSourceData(fixed +
optionTables + tyre) · canonicalModelParameters(fixed + optionTables) · unknowns · validationStatus`.
Only audit-verified manufacturer/setup-sheet values; **no illustrative chat numbers**.

**Fixed (documented, identity, model-usable):** front/rear track 1595/1540, wheelbase 2800, steering
12.5 (all `both`); mass 565, front weight 49.4% (`f312`; weight % is `measured`, sanitized from corner
weights). Rear software MR derived from the manual 1.30 ratio.

**Option tables kept in full (never reduced to one fixed value — that's a future SetupSnapshot):**
- `frontWheelRate` ← front torsion **ground** rows 71.8 / 81.6 N/mm (identity, derived, usable).
- `rearWheelRate` ← rear coil 850 / 950 lb/in × MR² → ≈88 / ≈98 N/mm (verified, derived, usable).
- `frontArb` / `rearArb` ← component 60 / 90 kgf/mm → **blocked** (`arb_motion_ratio_unknown`), value
  null, not usable. Raw component value is still preserved in the source row.

**Unknowns stay unknown (no placeholder):** CG height, absolute front/rear roll-centre, front/rear tyre
vertical operating-point rate (the 170/200 N/mm datasheet single points are kept as *documented raw*
but **not** promoted to canonical), third-element heave rate (no canonical parameter — the model has no
heave state).

**`validationStatus`:** 10 model-usable · 2 blocked (ARB) · 5 unknown. A note flags that `modelUsable`
means *canonical-contract* model-ready, **not** that the current renderer can ingest it (the
`use_wheel_rate` gap — see migration proposal).

---

## Tests & results

`npm test` → **exit 0**. Unchanged suites prove the model/telemetry were not touched:
`verify-dynamics 479` · `telemetry-core 67` · `view 105` · `plot 48` · `interact 52` · `yaw 84` ·
`validate self-test 15`. **New: `canonical-parameters 39` · `parameter-conversions 38` ·
`vehicle-profile-f312 30` (= 107, incl. 14 adversarial-review regressions).**

---

## Adversarial review & hardening

A 3-agent independent review ran after the first green build: (1) a math auditor re-derived all 5
conversions from first principles → **all correct** (ARB 1451.437 Nm/deg, `track²/2` not doubled);
(2) a clean-room/red-line auditor → **all red lines held** (pure additive, no private data, model byte-
for-byte untouched); (3) a schema-cohesion critic found the contract bit against its main threats but
flagged **1 high + 3 medium + 2 low** "looks-good-but-doesn't-bite" gaps. All were fixed (each with a
regression test):

| sev | gap | fix |
|---|---|---|
| high | non-array `blockers` silently dropped → fail-OPEN | malformed blockers → `malformed_blockers_input`, fails closed |
| med | rate value could skip the conversion (950 lb/in as 950 N/mm) | rate/stiffness param usable only with a `conversionRef` |
| med | `conversionRef`/`sourceRef` had no referential integrity | `checkConversionIntegrity()` vs the registry; derived ⇒ conversionRef |
| med | `NOT_REQUIRED` unconditional escape hatch | folded into the conversionRef trail gate |
| low | C4 stamped VERIFIED for any positive `arbMr` (even a guess) | `arbMr` must be provenance-tagged documented/measured for VERIFIED |
| low | "ratio never a bare number" enforced only at consumption | raw layer rejects a ratio-like datum lacking `ratioDefinition` |

---

## Unresolved (carried forward, not invented)

1. **Front torsion + rear spring option tables are PARTIAL** — only the rows transcribed in the audit
   are present (torsion 11.0→71.8, 12.5→81.6; coil 850/950). The full manufacturer tables need a
   targeted manual re-extraction before any "complete" option list is claimed.
2. **ARB motion ratio for this car is unknown** → all ARB canonical values are blocked. Needs the F312
   ARB blade MR (per blade designation) before `arb_component_to_axle_roll_stiffness` yields a usable value.
3. **F320 conversion is unverified** — convention is captured but there is no F320 real value / per-blade
   table to lock it. Out of F312 scope; flagged so it is never silently trusted.
4. **Tyre vertical operating-point rate** — only load-dependent single datasheet points exist (170/200
   N/mm @3kN). Canonical stays unknown.
5. **CG height, absolute roll-centre** — no measurement in the manual; both blocked.
6. **Third-element heave rate** — structural model gap (no heave state); no canonical parameter created.
7. **`use_wheel_rate` renderer gap** — documented wheel rates are canonical-contract usable but the
   current renderer cannot ingest a declared wheel rate (see proposal).

---

## Migration proposal — main dataflow canonicalisation (NOT implemented)

**Problem.** `use_wheel_rate` is a global boolean that exists only on the model side
(`dynamics-model.js`); the renderer never sets it (no UI / pred key / preset copy / calculator
signature), so springs are always re-multiplied by MR². A single global boolean is also too coarse for
mixed front/rear bases, F320, progressive springs, and third elements.

**Proposed target (per APP-GPT + the canonical contract).** Have the physics core ingest
`canonical.frontWheelRateNmm` / `canonical.rearWheelRateNmm` / `…ArbRollStiffnessNmDeg` directly,
through a normalisation shim, keeping the boolean only as backward compatibility:

```
legacy preset input
   → normalizeLegacySuspensionInput()   // existing spring×MR² path, unchanged for old presets
   → canonical wheel rates / axle ARB roll stiffness
   → physics core (receives canonical, never re-applies MR²)
```

- New F312/F317 profiles flow through the canonical path from day one; existing presets are untouched
  (the shim reproduces today's `spring×MR²` for them).
- `use_wheel_rate` is demoted to a legacy-compat note (already modelled that way in the canonical layer).

**Why not now.** This changes core dataflow and touches every existing preset → it needs SKYLINE's
explicit go-ahead and its own work item. **Acceptance precondition:** R2.1A/B/C tests + fixture green
(done), then a synthetic equivalence test proving the shim reproduces current results for existing
presets bit-for-bit **before** any core wiring is changed.
