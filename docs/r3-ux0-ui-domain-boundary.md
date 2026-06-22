# R3-UX0 — UI / Domain Boundary

**UI state ≠ domain state.** Navigation, locale, search, filters, and previews are presentation concerns; they must
never be written into a domain record, an Analysis Case, a setup, persistence, or an export. This document fixes the
boundary so the registry/router/use-case work can be verified against it.

## UI-only state (presentation; never persisted; never enters a domain record)
- `currentFeature` / `currentTab` / `shellSection` / `caseSubview` — which feature/pane is shown.
- sidebar open/closed, breadcrumb state.
- `search` query, `libFilters` (vehicle/track/status/date/includeArchived), preset browser filters.
- display mode (e.g. metric tier shown, chart toggles).
- `lang` / locale.
- preview selection (a preset highlighted but not applied), draft-in-editor that has not been saved.
- transient `storageError` / busy flags / `importedSummaryOpen`.

These may be reset, defaulted, or discarded freely. They are NOT inputs to the model and NOT written to IndexedDB,
the case record, or any export.

## Domain state (authoritative; provenance-bearing; persisted/analysed)
- `presetId` and the preset's data (frozen; never mutated by UI).
- setup values (spring/ARB/geometry/…); the Analysis Case setup snapshot.
- vehicle identity (the chosen preset / custom), provenance, confidence, assumptions.
- telemetry associations (sessionId, channel mappings, calibration).
- Analysis Case data + analysis results (capability, measured metrics, comparisons).
- anything written to IndexedDB (R3.0B persistence) or a portable export.

## The crossing rules (verified by Phase-2 contract tests)
1. **Localized copy ≠ persisted data.** A localized string (label/description/disclaimer) is NEVER written into a
   setup draft, a case record, or an export. Domain records carry stable IDs + provenance codes; the UI renders
   their labels via i18n at display time.
2. **Browse ≠ apply.** Browsing a preset is read-only: it never creates a case, never writes persistence, never runs
   the model, never overwrites the current case, never changes locale.
3. **Draft ≠ persisted case.** Building a setup draft from a preset produces an in-memory structured draft only; it
   is not persisted, not analysed, and not a case until an explicit create action.
4. **Apply ≠ silent overwrite.** Applying a preset/draft to an existing case requires preview + explicit confirm;
   never a silent mutation.
5. **Navigation ≠ feature identity.** The feature shown is a UI concern; a feature's identity, availability, and
   capability come from the registry + the domain (case capability), not from which tab is active.
6. **Locale switch is domain-inert.** Changing `lang` re-renders labels only; it must not alter any setup value,
   case, preset selection, draft, persistence, or export. (Phase-2 test: snapshot a domain object, switch locale,
   assert byte-identical.)

## Anti-patterns this milestone removes
- Product code scattered with `currentTab='predict'` / `shellSection='setup_library'` (UI state set directly from
  many call sites) → replaced by `navigateToFeature(featureId)` through the router (only the router adapter knows
  `currentTab`/`shellSection`/`caseSubview`/legacy pane ids).
- Multiple independent navigation whitelists (`mainNav` / `setupLibraryTabs` / `showPane` inline arrays /
  `setShellSection` inline arrays) that can drift → replaced by the registry as the single source of truth.
- A feature reachable only as a side effect of another section's default (e.g. `predict` reachable only via
  `cases→setup_model`, orphaned in Setup Library) → every production feature has a registry entry point.

## Legacy `predict` adapter rule (browse ≠ mutate)
Today, selecting a preset directly calls the mutating `applyPreset()` (it writes the editor/model input state and
clears results). Under R3-UX0:
- **Browsing/selecting** a vehicle preset (in the Vehicle Presets browser) updates ONLY read-only browse/detail view
  state (the highlighted preset + its `getVehiclePresetDetail` projection). It MUST NOT call `applyPreset()`, MUST
  NOT mutate the editor `pred.*` inputs, MUST NOT clear results, MUST NOT create/overwrite a case, run the model, or
  persist anything.
- The ONLY path that mutates the editor is an explicit user action: **build a setup draft → load it into the
  editor** (`buildSetupDraftFromPreset` → `loadSetupDraftIntoEditor`). The legacy `applyPreset()` mutation is reached
  only through that explicit "load draft into editor" action, never as a side effect of browsing.
- Contract test: firing a preset selection / detail-view event (browse) leaves the current Analysis Case, the editor
  `pred.*` inputs, persistence, and the model result **byte-identical** (no mutation); only the explicit build/load
  action changes editor state.
