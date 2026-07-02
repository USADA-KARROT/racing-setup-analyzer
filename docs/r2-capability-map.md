# Capability Map (R2 series → R3.0A shell)

What the analyzer can and cannot do today, classified as **Available** / **Conditionally Available** / **Blocked** /
**Deferred**. Every capability lists its required input, the credibility of its output, the fail-closed conditions
that block it, and its limitations. This is the canonical, contradiction-free statement of capability — the shell's
Context/Trust panel surfaces the same facts at runtime (re-derived from evidence by `case-shell.js`, never hard-coded).

Credibility ladder: **Physics** (a closed-form physical relation) → **Model** (a model prediction) → **Measured**
(derived from real data, still confounded) → **Derived** (a transform of inputs) → **Heuristic** (a rule-of-thumb
observation) → **Unavailable**. See `docs/credibility-and-trust.md`.

## Available (works on model inputs alone)

| Capability | Required input | Credibility | Fail-closed when | Limitations |
|---|---|---|---|---|
| Handling balance prediction (understeer gradient, LLTD, roll gradient, ride freq) | A setup + vehicle profile | Physics / Model | setup parameters unresolved | linear regime; not a full MBD; no hardpoint kinematics beyond 2D front-view |
| Setup Advisor (rule-based targets) | A setup | Heuristic | — | rules of thumb, not measured per-car |
| Spring / ARB calculator | Ride-freq or rate inputs | Physics / Derived | — | software MR (spring travel / wheel travel); no hardware clicks |
| Tyre analysis + 21-tyre DB | Tyre/condition inputs | Model / Derived | — | coefficients estimated unless a `.tir` is imported |
| Lihpao lap-time + stint | Power/track inputs | Model | — | one representative track; point-mass GG |
| 501-car preset DB | — | per-parameter (`confirmed`/`documented`/`estimated`/`unknown`) | — | chassis baselines graded; many `estimated` |
| Analysis Case model prediction + directional tendency | A Demo or imported case | Model / Heuristic | case invalid / model inputs unresolved | directional, not measured |

## Conditionally Available (need real telemetry and/or calibration; gated)

| Capability | Required input | Credibility | Fail-closed when | Limitations |
|---|---|---|---|---|
| Telemetry observation (directional tendency from data) | CSV/canonical telemetry, channels **confirmed** | Heuristic | a required channel is unmapped or mapped-but-unconfirmed; non-monotonic timebase; sparse samples | calibration-independent; directional only |
| **Measured understeer gradient K_us** (R2.4) | Confirmed telemetry **+ a verified road-wheel steering calibration** bound to the mapping & session | **Measured** (bare rung; the qualifier lives in `limitations[]`, not the rung string) | no calibration; negative/low yaw gain; too few speed bins / span; across-bin or left/right inconsistency; implausible band | kinematic, confounded (standing `kinematic_confounded` + per-confounder codes in `limitations[]`); provenance synthetic/real/unverified; not professionally validated |
| Model-vs-actual comparison (R2.4) | Model prediction + a valid observation | Heuristic / Measured | observation blocked, or magnitude comparison gate fails | directional always; magnitude only when measured K_us passes |
| Setup A/B (R2.5) | Two setups (one may be a hypothetical override) | Model | model can't run a side | predicted balance deltas only — never a lap-time claim |
| Quantitative setup recommendation (R2.5) | A case + a finite-range balance lever | Model | degenerate/zero-sensitivity lever; baseline or recommendation out of range | physical units (Nm/deg, N/mm, %); a *what-if* override, not provenance-validated |
| Corner coaching (R2.6) | Confirmed `track_position` + `lap` channels | Heuristic (low confidence) | track position / lap not confirmed; too few samples; no corners detected | the **driver's** raw-steering behaviour — never a corner characteristic, a measured magnitude, or a setup finding; raw steering ≠ road-wheel angle |

## Blocked (fail-closed; never fabricated)

- **Hardware setup clicks** — no validated per-car click→rate mapping exists, so clicks are never emitted (physical
  units only).
- **Measured K_us without a calibration** — never claimed; the directional tendency is offered instead.
- **Any measured number from synthetic data presented as real** — provenance is machine-read; synthetic stays synthetic.
- **Corner/setup attribution from driver behaviour** — driver behaviour ≠ vehicle characteristic ≠ setup finding.

## Deferred (planned, explicitly not built yet)

- **Cross-lap / cross-session reference-lap & corner-delta comparison** → R3.0C (the Comparisons nav is a deferred panel).
- **Persistent case library / save-reopen** → R3.0B.
- **Virtual Race Engineer decision engine (primary issue + alternatives + next experiment)** → R3.0D.
- **Recommendation experiment & outcome loop** → R3.0E.
- Still out of scope entirely: professional validation, full MBD, a complete tyre model, GPS racing line, automatic
  physics calibration, cloud collaboration, multi-user.
