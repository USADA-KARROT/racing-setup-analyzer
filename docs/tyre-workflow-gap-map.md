# Tyre Workflow Gap Map (Phase 2A)

A read-only audit of the current tyre modelling pipeline, written before any Phase 2
code changes. Goal of Phase 2: move imported real-tyre data from "can be imported" to
"can be trusted, traced, validated, and visualised" — without mixing the generic model,
the imported model, and the heuristic corrections.

Baseline at audit time: `main` HEAD `e5ccda2`, `npm test` = 143 passing.

---

## Current architecture — three parallel tyre subsystems

There is no single "tyre model". Three subsystems run in parallel, and an imported
`.tir` only replaces **one and a half** of them:

| # | Subsystem | Code | Drives | Data source | Credibility today |
|---|-----------|------|--------|-------------|-------------------|
| **A** | Grip-factor layer | `dynamics-model.js` `TireModel` (`COMPOUNDS`, `gripFactorTemperature/Pressure/Width`, `effectiveGrip`) | The per-corner tyre-grip % card and the **front/rear grip ratio → `tireUsShift`** | `TRACKDAY_TIRES` peak/temp/pressure (`tire-data.js`) + heuristic factors (`calibration.js`) | ◇ Heuristic |
| **B** | Cornering-stiffness layer | `dynamics-model.js` `PacejkaTireModel` ('89 14-param `COEFFICIENTS` by category) | Cα → understeer gradient | Hard-coded category coefficients | ◈ Model |
| **C** | Imported `.tir` layer | `tir-parser.js` (`parseTIR`, `mfFy0`, `tireCharacteristics`) | When `useTir`: **overrides B's Cα** and the **lap-sim peak μ** | User-supplied MF6.x `.tir` at runtime | ◈ Model (pure-slip lateral only) |

**The core hazard:** importing a `.tir` swaps subsystem **B** (cornering stiffness) and
the lap peak μ, but subsystem **A** (temperature / pressure / width grip and the
grip-balance `tireUsShift`) keeps running on the generic compound + heuristics — with no
visible indication. A user who imports a "real tyre" reasonably assumes the whole tyre
model is now measured; in fact only the lateral cornering stiffness and the lap peak μ are.

---

## The 8 audit questions, answered

**1. Where is `.tir` read?**
`importTir()` in `renderer/index.html:2050`, triggered by the file input in the Tire
Analysis tab (`index.html:1401`). It calls `parseTIR()` (`tir-parser.js:19`), then
`tireCharacteristics()` for the display summary, and sets `tirParsed` / `tirResult` /
`useTir=true`.

**2. Which Pacejka parameters are actually used after import?**
Only the **pure-slip lateral set** via `mfFy0()` (`tir-parser.js:67`): `PCY1`, `PDY1-3`,
`PEY1-5`, `PHY1-2`, `PKY1-5`, `PVY1-4`, `PPY1-4`, plus `L*` scaling factors, `FNOMIN`,
`NOMPRES/INFLPRES`. Plus `VERTICAL_STIFFNESS` (→ tyre spring rate). From these, two
numbers reach the prediction:
- Cornering stiffness `Cα` (finite-difference of `mfFy0`, `corneringStiffnessNdeg`) →
  consumed in `axlePairCorneringStiffness` (`dynamics-model.js:122`) and Tier 3
  (`dynamics-model.js:946`).
- Peak μ (`tireCharacteristics.peakMu`) → lap-sim `base_mu` via `setup.tirePeakMu`
  (`index.html:2740`, `lihpao-laptime.js`).
**Not used at all:** longitudinal `Fx`, aligning moment `Mz`, combined slip, any thermal
model. These are out of scope of the parser by design (`tir-parser.js:10`).

**3. If the `.tir` is missing parameters, where does it fall back?**
Two very different behaviours, neither of which warns the user:
- **Missing `PCY1`** → import is *rejected* outright (`index.html:2056`): `tirResult={error:true}`,
  `useTir` stays off. Generic subsystems A+B remain.
- **Missing any other coefficient** → `mfFy0`'s `C(key, default)` silently substitutes
  `0` (or `1` for scaling factors). The file "imports successfully" but the affected term
  is silently zeroed. No diagnostic, no flag.
- **Temperature / pressure / width grip** never fall back *to* the `.tir` — they are
  *always* subsystem A (generic heuristics), `.tir` imported or not.

**4. Is there a clear boundary between generic and imported models?**
Barely. The only switch is the binary `tireModel.raw.PCY1 !== undefined`, checked at two
call sites (`dynamics-model.js:122`, `:945`). There is **no "partial" concept**, and
subsystem A never switches at all. So "generic vs imported" is a hidden per-call boolean,
not a first-class, inspectable state.

**5. Does the UI tell the user which model is active (generic / imported / partial / fallback)?**
Partially, and only in one place. The Tire Analysis tab shows the imported tyre's summary
+ a "Use this tyre in the handling prediction" checkbox (`index.html:1428`). But:
- The **prediction results** never say whether the current numbers used a generic or
  imported tyre.
- There is **no "partial import" or "fallback" status** anywhere.
- The Phase-1 ◇ Heuristic badge on the tyre-grip card does not change when a `.tir` is
  imported — so it never communicates "Cα is now measured, but temp/pressure grip is still
  heuristic."

**6. Are there tests locking `.tir` behaviour?**
Yes, and better than expected (`tests/verify-dynamics.js:440-491`):
- Parser-level: `FNOMIN`, vertical stiffness → N/mm, dims, `PCY1`, comment stripping,
  ISO sign, Fy rising toward peak, `peakMu`, optimal slip angle, Cα > 0, load sensitivity.
- Integration: imported tyre shifts Tier-1 K_us; default prediction unaffected without
  `tireModel`; peak μ overrides lap `base_mu`; lap unaffected without `tirePeakMu`.
There is **no** test for partial coverage, fallback flags, or any metadata (those concepts
don't exist yet).

**7. Is there curve visualisation?**
No chart. `tireCharacteristics` *generates* two curve datasets — `muVsLoad` and `fyCurve`
(`tir-parser.js:138,148`). Only `muVsLoad` is rendered, as a **text table**
(`index.html:1420`). `fyCurve` (Fy vs slip angle) is computed but **never used anywhere**
(confirmed: no references outside `tir-parser.js`). The `drawTireGrip`/`drawTirePress`
charts (`index.html:3093,3105`) plot the *generic* compound grip curves, not the `.tir`.

**8. Is there metadata (source / confidence / coverage / unit)?**
No. `tirResult` carries descriptive fields (name, `mfVersion`, dims, peakMu, …) but **no**
`sourceType`, `confidence`, `coverage`, `fallbackUsed`, or unit metadata. The generic
subsystems have no metadata object either. This is the central missing layer for Phase 2.

---

## Gap map by Phase 2 stage

| Stage | Goal | Exists today | Gap | Severity |
|-------|------|-------------|-----|----------|
| **2B** Metadata / coverage | Every tyre model self-describes source + coverage + fallback | Nothing — no metadata anywhere | Build a `sourceType / confidence / coverage / fallbackUsed` descriptor for all three subsystems (generic, imported, partial). Must be readable by both UI and tests. | **High** |
| **2C** Status UI | User sees current model + coverage + fallback warnings | Only the import summary + a checkbox; prediction results say nothing | A status panel/badge near the tyre section + prediction result: current model, confidence, coverage flags, fallback warnings ("pressure effect is heuristic", "no combined-slip"), trilingual | **High** |
| **2D** Import validation / diagnostics | Imports are *diagnosed*, not just parsed | Binary accept/reject on `PCY1`; silent zero-fill for everything else | Structured diagnostics (severity / code / messageKey / affectedOutputs / credibility); surface partial coverage instead of silent success | **High** |
| **2E** Curve preview | Tyre model is not a black box | `muVsLoad` (text table only); `fyCurve` generated but unused; no pressure/temp curve | Render Fy-vs-α and Cα-vs-Fz; label each curve Physics/Model/Heuristic/Generic; the pressure/temp curve must be marked Heuristic (it's subsystem A, not the `.tir`) | **Medium** |
| **2F** Docs | README explains the tyre workflow honestly | README mentions `.tir` import + "tyre coefficients are estimated unless you import your own `.tir`" (line 44) but not partial/fallback or the A/B/C split | Document generic vs imported vs partial, pressure/temp correction limits, how to read tyre confidence, why tyre data dominates predictions | **Medium** |

---

## Top risks to watch in Phase 2

1. **Don't let the metadata imply more than `mfFy0` delivers.** An imported `.tir` is
   *pure-slip lateral + vertical stiffness*. `coverage.longitudinalForce` and
   `aligningMoment` must be `false`; combined-slip must be flagged as not modelled.
2. **Subsystem A stays heuristic even with `.tir` imported.** Pressure/temperature/width
   grip and `tireUsShift` are *not* upgraded by an import. The status UI must say so, or
   we recreate the exact "credibility mixing" problem Phase 1 fixed.
3. **Silent zero-fill of missing coefficients (`mfFy0` `C(k,0)`) is invisible today.** 2D
   should detect and report it rather than letting a sparse `.tir` look complete.
4. **No behaviour drift.** 2B/2C/2D are additive (metadata + UI + diagnostics). Existing
   default predictions and the 143 tests must stay green unless a change is intentional
   and re-baselined.

---

## Found more complete than expected (report-first, do not refactor)

Per the Phase 2 brief, flagging where reality is ahead of the gap-map assumptions:

- **Integration tests already exist** for the two paths a `.tir` actually drives
  (Cα → K_us, peak μ → lap `base_mu`), including "default unaffected" guards
  (`verify-dynamics.js:481-491`). 2B/2D tests build *on top of* these, not from scratch.
- **Curve data is already generated** — `fyCurve` and `muVsLoad` exist in
  `tireCharacteristics`. 2E is mostly a *rendering + labelling* task, not new physics.
- **Vertical stiffness path already works** (`applyTirSpring`, `index.html:2065`).
- **A real boundary check already exists** at import (`PCY1` required) — 2D extends it
  into graded diagnostics rather than replacing it.

Net: Phase 2 is primarily a **metadata + honesty + visualisation** effort layered on a
working import, not a re-implementation of the tyre maths. Recommend keeping `tir-parser.js`
maths untouched and adding a descriptor/diagnostics layer around it.
