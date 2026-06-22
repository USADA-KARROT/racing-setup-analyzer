# R3-UX0 — Feature Registry Contract (normative)

The Feature Registry is the **single source of truth** for navigation, reachability, and feature identity. ALL
navigation surfaces (desktop main nav, Setup Library landing, per-case nav, the `showPane`/`setShellSection`/
`setCaseSubview` routing, breadcrumbs, future mobile menus) are **projections** of this one structure. No second
whitelist may exist.

## Two registries, one structure

### 1. Features (`FEATURES`) — the 23 stable Feature IDs (see feature-id-contract.md)
Each entry is normative:
```
FEATURES[featureId] = {
  id,                 // === the key; stable snake_case; unique; locale/renderer-invariant
  area,               // 'vehicle_setup' | 'engineering_tools' | 'analysis_support' | 'case_scoped' | 'deferred'
  labelKey,           // i18n key (NOT a literal label)
  descriptionKey,     // i18n key
  availability,       // 'available' | 'available_conditional' | 'deferred' | 'unavailable'
  deferredReason,     // e.g. 'R3.0C' (required iff availability==='deferred')
  navNodeId,          // the navigation node this feature is mounted under (FK into NAV_NODES)
  rendererAdapter,    // { paneId, focusTarget? }  — legacy pane id + optional sub-section anchor; the ONLY pane coupling
  capabilities,       // [] capability tags the UI may read (derived, never authored)
  allowedActions,     // [] e.g. ['browse'] | ['browse','build_draft'] | [] (none → display-only)
  entryPoints,        // { desktop:true|false, mobile:true|false }  — is it a first-class menu entry on each surface
}
```
Required for every entry: `id, area, labelKey, availability, navNodeId, entryPoints`, AND
(`rendererAdapter` OR `deferredReason`). `id` unique across FEATURES. A feature with `availability:'deferred'` MUST
have `deferredReason` and MUST route to a non-actionable info panel (never a fake control). A feature with
`allowedActions:[]` renders display-only (no action buttons). Unsafe-but-future actions are `availability:
'unavailable'` (a real disabled+explained state), never omitted-but-faked.

### 2. Navigation nodes (`NAV_NODES`) — the navigation STRUCTURE (not features)
Navigation includes nodes that are NOT features (Dashboard, Import, Setup Library, Settings, Comparisons; case
subviews `overview`/`telemetry`). These are owned by the registry too:
```
NAV_NODES[nodeId] = {
  id,                 // 'dashboard'|'cases'|'import'|'setup_library'|'settings'|'comparisons'  (shell sections)
                      // | 'case:overview'|'case:setup_model'|...|'case:evidence_trust'        (case subviews)
                      // | 'setuplib:vehicle_setup'|'setuplib:engineering_tools'|'setuplib:analysis_support' (areas)
  kind,               // 'shell_section' | 'case_subview' | 'setuplib_area'
  labelKey,
  parentNodeId,       // for hierarchy (case subviews → 'cases'; setuplib areas → 'setup_library')
  order,              // deterministic ordering
  legacyRouting,      // { shellSection?, currentTab?, caseSubview? } — the ONLY place legacy UI-state names live
  availability,       // 'available' | 'deferred'
  deferredReason,
}
```

## The SINGLE derivation algorithm (all navigation is projected from the registry)
- `mainNav` = `NAV_NODES` where `kind==='shell_section'`, ordered by `order`.
- `caseNav` (and the former `caseSubviewIds`) = `NAV_NODES` where `kind==='case_subview'`, ordered. (`caseSubviewIds`
  is ELIMINATED — it was an exact duplicate; both derive from the same node set.)
- Setup Library landing areas = `NAV_NODES` where `kind==='setuplib_area'`; each area's cards = `FEATURES` where
  `area` matches and `entryPoints.desktop===true`, ordered.
- `setupLibraryTabs` (legacy tab strip, kept as a compatibility renderer) = the subset of Setup-Library features
  whose `rendererAdapter.paneId` is a standalone pane — DERIVED from `FEATURES`, not a separate array.
- `showPane(id)` / `setShellSection(id)` / `setCaseSubview(id)` routing = read `legacyRouting` / `rendererAdapter`
  from the registry; the inline `['spring','tire','advisor','lihpao','telemetry']` arrays are ELIMINATED (the
  membership comes from `FEATURES` filtered by area + adapter pane).
- A `feature-router.js` resolves `navigateToFeature(featureId)` → constructs the legacy route from the registry's
  declarative data (`getFeature`/`getNode`: `navNodeId.legacyRouting` + `rendererAdapter`). The router is the ONLY
  place featureId→`shellSection`/`currentTab`/`caseSubview` is constructed; the registry stays declarative data +
  navigation derivations (it does NOT build routes). Scattered inline `@click` navigation is
  routed through it (or, where it must stay inline for now, it calls `navigateToFeature` with a Feature/Nav ID, never
  a raw pane literal).

## Nested-target adapter responsibilities (finding 7)
For embedded tools whose renderer is a sub-section of a shared pane — `arb_calculator` / `suspension_kinematics`
(in the `spring` pane), `corner_weight` / `wheel_upgrade` (in the `predict` pane) — the `rendererAdapter` carries a
`focusTarget` (a stable element id/anchor). `navigateToFeature(featureId)` routes to the pane AND deterministically
focuses/scrolls to `focusTarget` (e.g. `el.scrollIntoView()` on `$nextTick`), so a registry entry point reaches the
sub-tool rather than dumping the user at the top of the pane. The adapter never duplicates the tool's logic — it only
shows the pane + focuses the section.

## Anti-drift guarantees (Phase-2 contract tests assert these)
- Exactly ONE `FEATURES` map and ONE `NAV_NODES` map; no other module hard-codes a feature/pane membership list.
- Every navigation surface is computed by the derivation algorithm above (test: deriving twice is deterministic;
  removing a registry entry removes it from every surface).
- No `FEATURES` id collides; every required field present; every non-deferred feature has a reachable entry point
  (test fails on orphan / unreachable / duplicate-conflicting route).
- `caseSubviewIds` and the three copies of the setup-library member array are gone (test: grep finds no second
  whitelist).
