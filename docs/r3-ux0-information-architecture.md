# R3-UX0 — Information Architecture

The product IA, expressed in stable Feature IDs (see `docs/r3-ux0-feature-id-contract.md`). The Feature Registry
encodes this tree; navigation renders it. A feature appears in exactly one primary area; case-scoped features live
under an Analysis Case.

## Top level (workspace)
```
Dashboard
Analysis Cases        ← the case library + an open case's per-case nav
Import Telemetry      ← routes into the canonical case import
Setup Library         ← landing page (three areas, below)
Comparisons           ← DEFERRED (R3.0C): case_comparison / reference_lap / corner_delta
Settings              ← User Guide + language + (future preferences)
```

## Setup Library (landing page — three areas; never auto-drop into a tool)
```
A. Vehicle & Setup
   - vehicle_presets        (Vehicle Presets — browse the preset database)
       └── vehicle_preset_detail   (read-only CHILD route of vehicle_presets: a single preset's
                                    summary/confidence/provenance/assumptions; breadcrumb
                                    "Setup Library › Vehicle Presets › <preset name>"; Back returns
                                    to the browser preserving its search/filter state. Not a top-level
                                    menu entry — entryPoints.desktop=false, reached only from the browser.)
   - custom_setup           (Custom Setup — manual input)
   - handling_prediction    (Handling Prediction — Tier 1/2/3 balance)

B. Engineering Tools
   - spring_calculator      (Spring / Ride Frequency / Wheel Rate)
   - arb_calculator         (ARB Sizing)
   - suspension_kinematics  (Suspension Kinematics)
   - corner_weight          (Corner Weight / LLTD)
   - tire_analysis          (Tyre Analysis + tyre database)
   - wheel_upgrade          (Wheel/Tyre Upgrade)

C. Analysis & Support
   - setup_advisor          (Setup Advisor)
   - lihpao_simulator       (Lihpao Lap-Time Simulator)
   - telemetry_viewer       (Telemetry Viewer — raw CSV evidence)
```
Each card routes via `navigateToFeature(featureId)`. `vehicle_presets` / `handling_prediction` / `custom_setup`
route to the existing `predict` pane (legacy renderer adapter) — ending the current "predict orphaned in Setup
Library" defect. Engineering sub-tools (`arb_calculator` / `suspension_kinematics` / `corner_weight` /
`wheel_upgrade`) route to their existing pane/sub-section. No card auto-runs analysis or persists anything.

## Analysis Cases (per-case nav — case-scoped, availability-gated)
```
Analysis Case
├── case overview          (overview)
├── setup & model          (case_setup_model)
├── telemetry              (telemetry observation)
├── measured metrics       (measured_metrics)        [gated: needs calibration]
├── model vs actual        (model_vs_actual)
├── recommendations        (recommendations)          [quantitative + Setup A/B]
├── corner coaching        (corner_coaching)          [gated: needs confirmed track position]
└── evidence / trust       (evidence_trust)
```
These are reached through the case's per-case nav (derived from the registry's case-scoped entries); their
availability is derived from the case capability (Physics/Model/Measured/Heuristic/Unavailable), not from navigation
presence.

## Comparisons / R3.0C (deferred — explicit, non-actionable)
```
Comparisons (deferred R3.0C)
├── case_comparison   (cross-lap / cross-session)
├── reference_lap     (reference-lap selection)
└── corner_delta      (per-corner delta intelligence)
```
Rendered as an explicit deferred info panel (availability `deferred`, deferredReason `R3.0C`). NOT implemented in
R3-UX0; NOT a fake control. R3.0C remains paused.

## Terminology (R3-UX0 §9.3)
"Street Mode" → **Vehicle Preset** (車款預設 / 車種プリセット); "Pro Mode" → **Custom Setup** (自訂設定 / カスタム設定).
The terms describe the INPUT SOURCE (a preset vs manual entry), not the user's expertise level.

## Desktop vs mobile
The registry carries `entryPoints.desktop` and `entryPoints.mobile` per feature so the same IDs/routes drive both;
R3-UX0 ships the desktop landing/browser as the production path and records the mobile entry point in the registry
(a future mobile renderer consumes the same registry — no second whitelist).
