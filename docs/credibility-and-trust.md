# Credibility & Trust Model

Every value the analyzer surfaces is labelled by **how it was derived**, and every conclusion carries a small bundle
of trust metadata. This is enforced in the services (not the UI) and re-surfaced by the R3.0A shell's Context/Trust
panel via the pure `case-shell.js` deriver, which **re-reads** the services' capability/observation and never
re-decides eligibility or recomputes physics.

## The credibility ladder (and what each rung does NOT mean)
- **Physics** — a closed-form physical relation (e.g. roll stiffness from rate + track). *≠ Model.*
- **Model** — a model prediction built from physics relations. *≠ Measured:* a prediction is not a measurement.
- **Measured** — derived from real telemetry. *≠ fully validated:* still confounded (tyre/track/driver/sensor) and
  carries a machine-read provenance (synthetic / real / unverified).
- **Derived** — a deterministic transform of inputs. *≠ direct measurement.*
- **Heuristic** — a rule-of-thumb observation. *≠ a vehicle fact.*
- **Unavailable** — not derivable from the present evidence (shown blocked, with a reason).

## Non-negotiable distinctions
- **Synthetic ≠ Real** — provenance is machine-read; synthetic data never masquerades as real.
- **Driver behaviour ≠ vehicle characteristic ≠ setup finding** — elevated steering corrections are a *driver*
  observation first; a vehicle/setup hypothesis is only raised with multi-lap + multi-corner + measured-consistent +
  mapping/calibration-trusted + comparable evidence.
- **Correlation ≠ causation**, **Prediction ≠ guaranteed result.**

## Every conclusion carries
credibility · confidence · provenance · limitations · blockers · evidence references · next validation step.

## Fail-closed, always
When any required input or quality gate is missing, the capability is **blocked with a reason**, never approximated.
Examples: no steering calibration → no measured K_us (directional tendency offered instead); a mapped-but-unconfirmed
channel → blocked (not trusted); a non-monotonic timebase or too-sparse samples → observation blocked; a degenerate
setup lever → no quantitative recommendation; no confirmed `track_position`/`lap` → no corner coaching; no validated
click→rate mapping → no hardware clicks (physical units only).

## Authority, not presence
Eligibility is **re-derived from raw evidence** by the services on every run. The shell and view model never trust a
caller's `eligible`/`confirmed`/`validated` flag, and a value merely being *present* is never treated as authoritative.
This is why, in the shell, the per-case nav availability (e.g. Corner Coaching) flips purely on the actual capability
the pipeline computed from the data — not on whether a field exists.

## What stays out of scope (and is never implied)
professional validation · full MBD · a complete tyre model · GPS racing line · hardware click mapping · automatic
physics calibration · cloud collaboration · multi-user.
