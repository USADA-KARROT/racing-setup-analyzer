# R2.2 — End-to-End Analysis Workspace (architecture + contracts)

The first end-to-end **analysis vertical slice**: it turns the app from a setup calculator into a
case-centric analysis workspace. A synthetic Demo Analysis Case traverses the whole production chain and
every visible conclusion is labelled by *how it was derived*; blocked features state *why*.

```
legacy/canonical setup → suspension normalization → canonical model inputs → AnalysisCase (R2.1D)
  → physics model execution → telemetry observation → model-vs-telemetry comparison
  → gated setup insight (Race Engineer) → driving insight (Driver Coach) → case view model → UI
```

## Runtime dataflow & modules (all PURE, UMD: Node require + renderer global)

| Module | Contract | Notes |
|---|---|---|
| `suspension-input-normalizer.js` | `normalizeLegacySuspensionInput(input)`, `normalizeExplicitSuspensionInput(input)` → `{valid, errors, normalized{front/rearWheelRateNmm}, semantics, provenance{canonicalTrustUpgraded:false}}` | §5. Reproduces `dynamics-model` wheelRate() bit-for-bit (`Math.pow(MR,2)`). Trust boundary: numeric compat ≠ canonical verification. |
| `canonical-model-input.js` | `buildModelParamsFromCanonical(canonicalInputSnapshot)` → `{resolved, params|null, blockedReasons, usedParameters, missingParameters, provenance}` | §6. Maps canonical wheel rates → `dynamics-model` params with `use_wheel_rate:true`. Resolves ONLY authoritatively `modelUsable` values. |
| `analysis-execution.js` | `runAnalysisCase(analysisCase, opts)` → `{valid, analysisCaseId, modelVersion, modelResultSnapshot, predictedTendency, capabilityState{caseValid,modelInputResolved,modelRan}, blockedReasons, provenanceSummary, warnings, credibility}` | §7. Validates the R2.1D case, runs the physics core (injected `modelRunner` / global `Tier1BasicBalance`; `MODEL_ENGINE_UNAVAILABLE` / `MODEL_RUN_FAILED` fail-closed), freezes the result. NEVER writes back to the case. |
| `telemetry-observation.js` | `observeTelemetry(session, window, opts)` → `{valid, quality, channels, selectedWindow, observedTendency, observedMetrics, driverInputs, evidence, confidence, method, limitations, confounders, blockedReasons, warnings, credibility}` | §8. Directional tendency from the yaw/steer-vs-speed trend (raw steering only). Heuristic/Derived, confidence capped at `medium`. Emits `driverInputs` for the Driver Coach. |
| `model-telemetry-comparison.js` | `compareModelToTelemetry(modelResult, observation, opts)` → `{valid, predictedTendency, observedTendency, differenceClass, confidence, evidence, assumptions, blockedReasons, warnings, modelTelemetryComparisonEligible, credibility}` | §9. Qualitative direction comparison (six classes). Eligibility condition-derived. |
| `race-engineer-insight.js` | `deriveRaceEngineerInsight(comparison, caseContext, opts)` → `{eligible{inspection,directional,quantitative}, summary, likelySubsystems, inspectionPriorities, setupDirections, trialOrder, missingEvidence, confidence, evidence, blockedReasons, credibility}` | §10. Inspection/directional/quantitative split; quantitative=false. Consumes the comparison + vehicle context only (never driver evidence). |
| `driver-coach-insight.js` | `deriveDriverCoachingInsight(observation, caseContext, opts)` → `{eligible, observations, practicePriorities, cannotConclude, evidence, confidence, blockedReasons, credibility}` | §11. Independent layer — output has NO setup field. Pedal/track/lap claims gated on channel availability. |
| `analysis-workspace.js` | `runAnalysisWorkspace(case, session, window, opts)` → `{caseContext, execution, observation, comparison, raceEngineer, driverCoach, capability}`; `deriveWorkspaceCapability(...)` | §7/§12. Orchestrator + pure capability aggregation (downstream eligibility derived AFTER observation, never written back to the case). |
| `analysis-workspace-viewmodel.js` | `buildAnalysisWorkspaceViewModel(workspaceResult, analysisCase, opts)` → 9-section view model (A–I) | §12. Pure builder; consumes service output only; NEVER recomputes physics; unavailable/blocked surfaced with reasons. |
| `demo-analysis-case.js` | `buildDemoAnalysisCase()` → `{analysisCase, telemetrySession, window, suspensionNormalizationView}` | §13. Clean-room synthetic. Mixed-basis suspension (front ground, rear spring-element×MR²), all model-usable. |

UI: `renderer/index.html` gains an **Analysis Workspace** tab + **Load Demo Analysis Case** button + a
9-section panel that binds the view model only (no physics recompute).

## Capability matrix (workspace capability, aggregated)

| Capability | Becomes true when | Demo |
|---|---|---|
| `caseAssembled` | R2.1D case valid | ✓ |
| `modelRunnable` | all required canonical inputs model-usable | ✓ |
| `modelRan` | physics core ran + output structurally valid | ✓ |
| `telemetryInspectable` | speed + steering channels present | ✓ |
| `telemetryObservable` | observation produced a result (valid) | ✓ |
| `modelTelemetryComparisonEligible` | model valid + observation valid + conclusive (or speed-dependent) | ✓ |
| `raceEngineerInspectionEligible` | a model prediction exists | ✓ |
| `raceEngineerDirectionalEligible` | comparison eligible + actionable difference | ✓ |
| `driverCoachingEligible` | steering channel + driver inputs present | ✓ |
| `quantitativeSetupRecommendationEligible` | **R2.5**: a non-degenerate balance lever exists (probed); model-grounded PHYSICAL-unit recommendations (Nm/deg, N/mm, %). Hardware *clicks* stay gated (no validated click→rate mapping). | ✓ (R2.5) |
| `setupAbEligible` | **R2.5**: model runnable → a two-setup what-if comparison (predicted deltas, credibility Model, no lap-time claim) | ✓ (R2.5) |

## Trust boundary & honesty constraints

- **R2.1D AnalysisCase is immutable.** Results and new eligibility live in the SEPARATE execution /
  workspace objects, never written onto the case (so the R2.1D tamper / forbidden-capability validation
  is never tripped). `analysis-case.js` is unchanged.
- **Suspension normalization is numeric compatibility, not evidence.** `canonicalTrustUpgraded` is a hard
  literal `false`; an injected trust flag is rejected.
- **No measured magnitude from raw steering.** The observation never names / serializes / implies K_us,
  road-wheel gain, or any calibrated magnitude. The trend is honest only because a fixed steering ratio is
  a constant scale that does not change whether the ratio rises or falls with speed. Method, confounders,
  and limitations are always attached; confidence is capped at `medium`.
- **Comparison is qualitative.** "observed_more_understeer" means the telemetry shows speed-dependent
  understeer the steady-state single-point model cannot capture — NOT a measured-magnitude gap.
- **Quantitative setup advice is blocked.** No clicks / N·mm / lap-time / guaranteed causation.

## Demo Analysis Case (golden path)

`Load Demo Analysis Case` runs the full pipeline on synthetic, text-only data (no private data / paths /
binaries). The visible narrative is PRODUCED by production code, not hardcoded:

```
Model: mild understeer (Kus ≈ 0.51, tendency Understeer)
Telemetry: speed-dependent understeer (yaw/steer falls with speed) → understeer_tendency, medium confidence
Comparison: observed_more_understeer
Race Engineer: inspect front tyre state + front effective roll stiffness; directional trials; quantitative blocked
Driver Coach: secondary steering corrections observed; cannot attribute to a corner (no track position)
```

## Known limitations (first version)

- Quantitative setup recommendation, measured K_us, and road-wheel calibration are out of scope (blocked).
- The observation tendency is a directional heuristic over a single telemetry window; confidence ≤ medium.
- Tyre vertical rate is not yet mapped from canonical front/rear into the model's single `tire_spring_rate`
  (the core default applies); recorded as a limitation in `canonical-model-input.js`.
- Real imported telemetry remains gated by the existing readiness chain; the demo uses synthetic data only.
- The demo setup is deliberately front-biased to illustrate understeer; it is not a representative real F3 baseline.

## Prohibited claims (must not appear)

Not a full professional race-engineer replacement · not complete measured handling analysis · not all
telemetry formats · not reliable precise setup clicks. These are presented as runtime blocked/unavailable.
