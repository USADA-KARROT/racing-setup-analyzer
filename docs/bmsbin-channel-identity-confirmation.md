# `.bmsbin` Channel Identity Confirmation Criteria (Phase 3E-0)

Scope notes. **This phase defines the conservative CRITERIA for when a channel identity may be
called confirmed. It does NOT name any channel, NOT decode anything, and does NOT confirm any real
channel.** With no independent evidence — the real imported-file path — every channel identity is
`not_confirmed`, by design.

## Core principle
**Channel identity cannot be confirmed by waveform shape alone. It requires independent evidence.**
The module evaluates ONLY evidence handed to it (`opts.identityEvidence`); it never derives identity
from waveform shape, statistics, or the catalog on its own, and never guesses labels.

## The evidence ladder (conservative; never auto-confirmed)
```
not_confirmed < hypothesis_only < labeled_unverified < candidate < confirmable_identity < confirmed_identity
```
- **No evidence** → `not_confirmed`.
- **Shape / statistical signature** → `hypothesis_only` (never higher — shape alone is insufficient).
- **A label / metadata string only** (no proven stream relation) → `labeled_unverified`.
- **A repeatable label↔stream cross-reference** (still insufficient) → `candidate`.
- **An independent, corpus-stable mapping** (not relying on scaling / overlay / driving behaviour /
  setup) → `confirmable_identity`, and only with a **corpus-backed confirmed raw stream** (Phase
  3D-2 `canConfirmAnyRawStream`) → `confirmed_identity`.

`confirmed_identity` is reachable only with synthetic fixtures in 3E-0. A single real file can never
reach it (it requires a cross-file corpus and a corpus-confirmed raw-stream structure). Confirmed
identity still does **not** imply units, scaling, timebase, or physical values.

## Red lines (do NOT cross)
- No scaling, units, physical telemetry chart, overlay, Kus, setup recommendation, canonical
  telemetry, handling correlation, confirmed timebase, or confirmed physical values.
- No automatic channel naming from shape; no AI/heuristic label guessing.
- `capabilities.physicalScaling` / `canonicalTelemetry` / `timeSeries` / `handlingCorrelation` /
  `unitsConfirmed` / `setupRecommendation` stay `false` on every path.
- The feed into `bms-confirmation.js` is corpus-gated (`opts.corpus.fileCount ≥ 2`) and is a no-op
  when absent — a single real file can never flip channel identity confirmed, and it never opens
  any decode-grade capability.

## Clean-room
`.bmsbin` is an adapter; output flows back to the source-agnostic descriptor. No real `.bmsbin`,
raw bytes, sample values, byte offsets, decoded sequences, or proprietary label strings are
committed; tests use synthetic fixtures only. The local reporter emits only sanitized aggregate
statistics (statuses / counts / evidence-level histograms), and on real files (no evidence) it
always reports `not_confirmed` with zero confirmed identities and never surfaces a channel name.

## What 3E-0 delivers
> Channel Identity Confirmation Criteria implemented · Real channel identity still not confirmed ·
> No canonical telemetry · No scaling · No units · No overlay · No setup recommendation.
