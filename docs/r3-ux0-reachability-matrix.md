# R3-UX0 — Reachability Matrix (current main `bc8fe2f0`)

Objective audit of every production feature: where it lives, how it is reached **today**, and whether it is
reachable / orphaned / buried. Inputs: a 4-explorer inventory (48 rows) + direct inspection of the nav whitelists.
This matrix is the evidence base for the Feature Registry (single source of truth) that replaces the duplicated
whitelists.

## A. Feature reachability (canonical Feature ID ← current implementation)

| Feature ID | Current renderer pane | Current entry point | Reachability today |
|---|---|---|---|
| `vehicle_presets` | `predict` (preset `<select>`, lines ~244-268) | "Street Mode" toggle → `<select streetCar>` | **ORPHANED in Setup Library** — `showPane('setup_library')` whitelist = `['spring','tire','advisor','lihpao','telemetry']` (no `predict`). Reachable ONLY via `cases→setup_model` |
| `vehicle_preset_detail` | `predict` (spec cards, lines ~259-297) | shown after preset select | **ORPHANED** (same as above) |
| `custom_setup` | `predict` (manual inputs, lines ~351-400) | `!streetMode \|\| !streetCar` | **ORPHANED in Setup Library** — only via `cases→setup_model→predict` |
| `handling_prediction` | `predict` (gauge + Tier1/2/3, lines ~937-967) | tier tabs / gauge | **ORPHANED in Setup Library** — `predict` excluded from `showPane('setup_library')` |
| `spring_calculator` | `spring` pane | `setupLibraryTabs` tab `spring` | **REACHABLE** (own tab) — but `setShellSection('setup_library')` defaults `currentTab='spring'` (drops straight into Spring Calc) |
| `arb_calculator` (ARB sizing) | `spring` pane sub-section | none (scroll within spring) | **BURIED** — no independent entry; only by scrolling the spring pane |
| `suspension_kinematics` | `spring` pane sub-section | none (scroll within spring) | **BURIED** — no independent entry |
| `corner_weight` (+ LLTD) | `predict` pane Tier-3 output | none | **ORPHANED** — embedded in predict Tier-3 results; predict unreachable in Setup Library |
| `tire_analysis` | `tire` pane | `setupLibraryTabs` tab `tire` | **REACHABLE** (own tab); tire DB is a scroll sub-section |
| `wheel_upgrade` | `predict` pane Pro-mode sub-section | checkbox (line ~480) | **ORPHANED** — buried in predict Pro-mode; predict unreachable in Setup Library |
| `setup_advisor` | `advisor` pane | `setupLibraryTabs` tab `advisor` | **REACHABLE** (own tab) |
| `lihpao_simulator` | `lihpao` pane | `setupLibraryTabs` tab `lihpao` | **REACHABLE** (own tab) |
| `telemetry_viewer` | `telemetry` pane | `setupLibraryTabs` tab `telemetry` | **REACHABLE** (own tab) |
| `analysis_cases` | cases shell sidebar (lines 128-189) | `mainNav` → `cases` | **REACHABLE** |
| `case_setup_model` | `analysis` pane (Section C) | `caseNav` → `setup_model` | **REACHABLE** (case-scoped) |
| `measured_metrics` | `analysis` pane (F2) | `caseNav` → `measured_metrics` | **REACHABLE** (case-scoped; availability-gated) |
| `model_vs_actual` | `analysis` pane (F) | `caseNav` → `model_vs_actual` | **REACHABLE** (case-scoped) |
| `recommendations` | `analysis` pane (F3/F4, incl. Setup A/B) | `caseNav` → `recommendations` | **REACHABLE** (case-scoped) |
| `corner_coaching` | `analysis` pane (J) | `caseNav` → `corner_coaching` | **REACHABLE** (case-scoped) |
| `evidence_trust` | `analysis` pane (I) | `caseNav` → `evidence_trust` | **REACHABLE** (case-scoped) |
| `case_comparison` / `reference_lap` / `corner_delta` | `comparisons` pane | `mainNav` → `comparisons` (deferred) | **DEFERRED R3.0C** — explicit non-actionable panel (correct) |

(ride frequency / wheel rate are computed outputs of `spring_calculator` / `handling_prediction`, not standalone
tools; they are surfaced inside those panes and need no separate entry — but `corner_weight`/`LLTD`/`wheel_upgrade`
DO appear as §4.1 features and are orphaned via `predict`.)

## B. Orphaned / unreachable production features (the core defect)
- **`predict` pane is orphaned in Setup Library**: `vehicle_presets`, `vehicle_preset_detail`, `custom_setup`,
  `handling_prediction`, `corner_weight`(+LLTD), `wheel_upgrade` are reachable ONLY via `cases→setup_model`. A user
  in Setup Library cannot reach vehicle presets or handling prediction at all.
- **Setup Library has no landing page**: `setShellSection('setup_library')` forces `currentTab='spring'` → the user
  is dropped straight into the Spring Calculator (R3-UX0 §9.1 forbids this).
- **Buried sub-tools with no entry**: `arb_calculator`, `suspension_kinematics` (in `spring`); `corner_weight`,
  `wheel_upgrade` (in `predict`) — reachable only by knowing to scroll a parent pane.

## C. Navigation whitelist duplication (≥6 independent sources of truth that can drift)
| # | Whitelist | Location | Content / problem |
|---|---|---|---|
| 1 | `mainNav` | line ~3566 | dashboard/cases/import/setup_library/comparisons/settings |
| 2 | `caseNav` | line ~3567 | 8 case subviews |
| 3 | `setupLibraryTabs` | line ~3568 | spring/tire/advisor/lihpao/telemetry |
| 4 | `caseSubviewIds` | line ~3565 | **EXACT DUPLICATE of caseNav ids** |
| 5 | `setShellSection` inline | line ~3575 | `['spring','tire','advisor','lihpao','telemetry']` (mirrors #3) |
| 6 | `showPane` inline | line ~3586 | `['spring','tire','advisor','lihpao','telemetry']` (mirrors #3, #5) |
| — | scattered routing | `setShellSection`/`showPane`/`setCaseSubview` per-id conditionals (3572-3587) | each id→pane mapping hardcoded; can drift from #1/#2 |
| — | inline `@click` nav | dashboard buttons (200/206/207), lihpao "lap detail" (1027 `setShellSection('setup_library'); currentTab='lihpao'`) | navigation set directly from markup, bypassing any registry |

The Setup-Library member list exists in **three** copies (#3, #5, #6) and the case-subview list in **two** (#2, #4).
Any edit must touch all copies or they drift — this is the R3-UX0 root cause.

## D. Fix direction (drives Phase 2)
1. A **Feature Registry** (`feature-registry.js`) keyed by the 23 stable Feature IDs becomes the single source of
   truth; `mainNav` / `setupLibraryTabs` / `caseNav` / `caseSubviewIds` / the `showPane`/`setShellSection` inline
   arrays are DERIVED from it (no second whitelist).
2. A **Feature Router** (`feature-router.js`) is the ONLY place that knows `currentTab`/`shellSection`/`caseSubview`/
   legacy pane ids; product code calls `navigateToFeature(featureId)` instead of setting UI state directly. Scattered
   inline `@click="currentTab=…"` / `setShellSection(…)` are routed through it (or derived).
3. **Setup Library gains a registry-generated landing page** (Vehicle & Setup / Engineering Tools / Analysis &
   Support) — never auto-dropping into Spring Calculator; `vehicle_presets` + `handling_prediction` + `custom_setup`
   become first-class Setup-Library entries (the `predict` pane reachable as a registry route, ending the orphan).
4. Every production feature has a registry **entry point** (desktop + mobile metadata); reachability tests fail on
   any orphan / unreachable / duplicate-conflicting route.
5. `corner_weight` / `arb_calculator` / `suspension_kinematics` / `wheel_upgrade` get registry entries that route to
   their existing pane (legacy renderer adapter) — minimum integration, not a redesign.
