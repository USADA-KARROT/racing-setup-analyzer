# R3-UX0 — Stable Feature ID Contract

A feature's identity is a **stable string ID**, independent of how it is displayed. A Feature ID MUST NOT depend on
display text, language/locale, a DOM selector, a CSS class, the current tab ordering, or the current renderer name.
The ID is the join key between the Feature Registry, the router, breadcrumbs, reachability tests, and (future) a
replaceable renderer. Renaming a label, translating it, reordering tabs, or swapping the renderer must NOT change a
Feature ID.

## The IDs (canonical set)

### Area A — Vehicle & Setup
| Feature ID | Semantic purpose |
|---|---|
| `vehicle_presets` | The vehicle preset database browser (search / filter / list) |
| `vehicle_preset_detail` | A single preset's detail (summary + confidence + provenance + assumptions) |
| `custom_setup` | Manual setup input (no preset required) |
| `handling_prediction` | The Tier 1/2/3 understeer/oversteer balance prediction |
| `analysis_cases` | The saved Analysis Case library |
| `case_setup_model` | An Analysis Case's Setup & Model view |

### Area B — Engineering Tools
| Feature ID | Semantic purpose |
|---|---|
| `spring_calculator` | Ride-frequency ↔ spring-rate / wheel-rate calculator |
| `arb_calculator` | Anti-roll-bar sizing for a target roll gradient |
| `suspension_kinematics` | 2D front-view double-wishbone kinematics |
| `corner_weight` | Corner-weight / cross-weight / LLTD tooling |
| `tire_analysis` | Tyre temperature/pressure grip curves + tyre database |
| `wheel_upgrade` | Wheel/tyre upgrade comparison |

### Area C — Analysis & Support
| Feature ID | Semantic purpose |
|---|---|
| `setup_advisor` | Rule-based setup suggestions |
| `lihpao_simulator` | Lihpao GG-diagram lap-time + stint simulator |
| `telemetry_viewer` | The raw-CSV telemetry evidence viewer (V1, independent of the case pipeline) |
| `measured_metrics` | Case measured metrics (measured K_us, R2.4) |
| `model_vs_actual` | Case model-vs-actual comparison |
| `recommendations` | Case quantitative recommendation / setup A/B |
| `corner_coaching` | Case per-corner driver coaching (R2.6) |
| `evidence_trust` | Case evidence / provenance / trust drawer |

### Deferred (R3.0C — present as explicit non-actionable deferred, never a fake control)
| Feature ID | Semantic purpose |
|---|---|
| `case_comparison` | Cross-lap / cross-session case comparison |
| `reference_lap` | Reference-lap selection |
| `corner_delta` | Per-corner delta intelligence |

## Rules
- **23 IDs** total. Each is a lowercase snake_case string, unique, never reused for a different feature.
- A Feature ID is **locale-invariant**: the same ID in en / zh-TW / ja. Its label is a separate i18n key.
- A Feature ID is **renderer-invariant**: it maps to a route + a (possibly legacy) renderer *adapter*, never to a
  fixed `currentTab`/pane name in product code.
- `measured_metrics` / `model_vs_actual` / `recommendations` / `corner_coaching` / `evidence_trust` /
  `case_setup_model` are **case-scoped** (rendered inside an Analysis Case); their availability is derived from the
  case's capability (Physics/Model/Measured/…), never from navigation presence.
- The deferred IDs (`case_comparison` / `reference_lap` / `corner_delta`) carry `availability:'deferred'` +
  `deferredReason:'R3.0C'` and route to a non-actionable info panel — they are NOT removed and NOT faked.
- The registry maps each ID → `{ area, labelKey, descriptionKey, availability, route, legacyRendererAdapter,
  capabilities, allowedActions, entryPoints{desktop,mobile}, breadcrumb }`. The registry is the single source of
  truth; `mainNav` / `setupLibraryTabs` / `caseNav` / `showPane` whitelists are DERIVED from it (see
  `docs/r3-ux0-reachability-matrix.md` for the current duplication this replaces).
