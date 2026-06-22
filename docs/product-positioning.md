# Product Positioning

## What this is
A **case-centric vehicle-dynamics workspace** for learning and for honest, evidence-bounded setup analysis. You
build an **Analysis Case** (a vehicle + a setup + optionally real telemetry), the tool runs a transparent physics
model, optionally compares the model against your telemetry, and tells you **which way the car tends to handle and
why** — with every number labelled by how it was derived and every blocked feature stating its reason.

## Who it is for
- FSAE / track-day / sim engineers who know the formulas but want to see how they turn into decisions.
- Anyone validating a setup hypothesis against real data without overclaiming.

## What it is NOT
- **Not a professional race-engineer replacement.** It produces structured observations and model-grounded
  suggestions; it does not replace an engineer's judgement, and it never presents itself as professionally validated.
- **Not a full multi-body-dynamics (MBD) simulator.** The model is a transparent linear/quasi-static balance model,
  not a transient MBD solver.
- **Not a complete tyre model.** Tyre coefficients are estimated unless you import your own `.tir`.
- **Not a GPS racing-line / lap-optimization tool.** No racing line, no exact apex from position alone.
- **Not a telemetry decoder for arbitrary binary formats.** The production import path is CSV / canonical-JSON.

## The product loop (target across R3)
Create Analysis Case → import & validate telemetry → model + measured analysis → cross-lap/session/setup comparison
→ find the primary issue + likely cause → separate **car / driver / data / environment** → propose a verifiable next
experiment → record the applied change → link the follow-up session → compare expected vs observed → accumulate
traceable engineering evidence. R3.0A delivers the **shell** for this loop; later milestones fill in persistence
(R3.0B), comparison (R3.0C), the decision engine (R3.0D), and the experiment/outcome loop (R3.0E).

## Two telemetry paths (intentionally separate)
- **Production path — CSV / canonical-JSON import** (R2.3+): the only route that yields a Canonical Telemetry
  Session, directional analysis, and (with a verified calibration) a measured K_us.
- **Legacy research path — `.bmsbin` clean-room investigation**: a historical binary-format study that decodes
  nothing beyond a channel catalog and produces no canonical telemetry. See `docs/phase-3-trust-chain.md`. It is
  kept for provenance, not used by the product analysis flow.

## Honesty contract
Every conclusion carries credibility, confidence, provenance, limitations, blockers, evidence references, and a next
validation step. Nothing measured is claimed without the data + calibration to back it; nothing is fabricated to
fill a gap. See `docs/credibility-and-trust.md` and `docs/r2-capability-map.md`.
