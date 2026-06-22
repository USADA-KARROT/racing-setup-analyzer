# R3-UX0 — Vehicle Preset Use-Case Design

A renderer-independent read/draft pipeline for vehicle presets, so the UI consumes presets through use cases + a
view model — never by reading `CAR_PRESETS` directly. Browse is read-only; a draft is non-persistent and never runs
analysis; applying to a case is preview + confirm (never a silent overwrite). Actions that cannot yet be implemented
SAFELY are surfaced as `unavailable` (a real disabled/explained state), never a fake button.

These live in a pure module (proposed `renderer/js/vehicle-preset-usecases.js`) + a view model (proposed
`renderer/js/vehicle-preset-viewmodel.js`). They **read** the frozen `car-presets.js` (via `api.js` where it already
wraps it) and MUST NOT mutate preset data or change `PRESET_BASELINE_COUNT` (501) / preset IDs.

## Read pipeline (READ-ONLY + immutable returns)
- `listVehiclePresets(filters)` → `[summary]` — search (name/manufacturer/layout), manufacturer filter, layout
  filter. Pure; sourced from the existing preset summary API; never mutates a preset; never touches a case.
- `getVehiclePresetDetail(presetId)` → `{ identity, setupInputs, tireDefaults, geometryDefaults, provenance,
  confidence, assumptions, warnings }` — a read-only detail **projection/deep-copy**. The read pipeline MUST return a
  projection or deep copy, NEVER the live `CAR_PRESETS` object (today `api.getPreset()` returns the live reference),
  so a UI consumer cannot mutate preset data by reference. Contract test verifies preset **content** (deep-equal),
  not only count/IDs, is unchanged before/after the read pipeline runs.
- Browsing/selecting is the read path only — it never calls the mutating legacy `applyPreset()` (see
  `docs/r3-ux0-ui-domain-boundary.md` "Legacy predict adapter rule").
- `buildVehiclePresetSummary(preset)` → a small card/list view model `{ presetId, name, manufacturer, layout,
  confidenceGrade, provenanceBadge }`. Pure transform; no I/O.
- The view model exposes a `confidenceView` + `provenanceView` (per the existing per-parameter
  confirmed/documented/estimated/unknown grading) so the UI renders credibility honestly (Preset ≠ complete measured
  vehicle model).

## Draft contract (NON-PERSISTENT)
- `buildSetupDraftFromPreset(presetId)` → a structured draft `{ presetId, vehicleIdentity, setupInputs, tireDefaults,
  geometryDefaults, provenance, confidence, assumptions, warnings }`.
  Building a draft MUST NOT: write IndexedDB, create a case, overwrite the current case, run the model, change locale,
  or write a UI label. It is an in-memory object only.
- `loadSetupDraftIntoEditor(draft)` → maps a draft into the existing (legacy `predict`-pane) editor form state. ONLY
  on an explicit user action; never auto-run on browse; never auto-persist; never pretend a case was created.

## Case actions (FAIL-CLOSED; preview + confirm)
- `createCaseFromSetupDraft(draft, metadata)` → creates a NEW Analysis Case from a draft (explicit user action).
  Until this is wired safely through the existing R3.0B case-store, it is surfaced as `unavailable` (no fake button).
- `previewApplyPresetToCase(caseId, presetId)` → a NON-mutating preview `{ previewToken, diff, provenance,
  confidence }`; writes nothing. The `previewToken` is an OPAQUE ephemeral token bound to `caseId` + the case's
  current `baseRevision` + a hash of the `(draft/preset)` content + an `expiry`.
- `confirmApplyPresetToCase(preview)` → applies ONLY a preview whose `previewToken` still matches the case's current
  revision and content hash and has not expired; a stale, expired, fabricated, or wrong-case token is REJECTED
  fail-closed (no apply). Never a silent overwrite. Until this is safely wired through the (frozen) R3.0B case-store,
  the apply actions surface as `unavailable` (a real disabled+explained state), not a fake button.

## Invariants (Phase-2 contract tests)
- `CAR_PRESETS` count + preset IDs are identical before and after (read-only pipeline; no mutation).
- `listVehiclePresets` / `getVehiclePresetDetail` are pure (same input → same output; no case/persistence side
  effect).
- A draft carries `provenance` + `confidence` and is NOT found in IndexedDB after building (non-persistent).
- Browsing/selecting a preset leaves the current Analysis Case state unchanged.
- Two distinct UI consumers (a list/select consumer and a card/summary consumer) both use the SAME view model and
  neither reads `CAR_PRESETS` directly — proving renderer replaceability.
- No localized string enters a setup draft, a case, or an export.
