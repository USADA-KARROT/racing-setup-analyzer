# Telemetry Catalog Decoding Gap Map (Phase 3A)

A read-only audit of the current `.bmsbin` (Bosch/Darab) telemetry reader, written before
the Phase 3A groundwork. Phase 3 (telemetry correlation) is split:

- **3A (this phase)** — make the app *honest* about the catalog it can read vs. the
  time-series it cannot yet decode. Canonical channel schema + metadata + diagnostics + a
  status panel. **No** sample decoding, **no** model-vs-actual overlay.
- **3B (later)** — sample-block probing, sample rate, scale/offset, raw int16 → physical.
- **3C (later)** — channel alignment, Kus/yaw-gain trends, model-vs-actual overlay.

Clean-room: the project has real F3 `.bmsbin` logs, but **none are committed**. Tests use a
synthetic minimal fixture that mimics only the catalog structure — no proprietary data,
no Bosch/WinDarab/RaceCon code or schema.

Baseline: `main` HEAD `1a1e262` (v1.6.0), `npm test` = 175 passing.

---

## What the current reader does (`renderer/js/bms-parser.js`)

| Question | Answer (current behaviour) |
|---|---|
| **1. How is the header validated?** | `parseBmsHeader` reads up to 40 leading printable bytes → `{ importer, valid }`; `valid = /Darab/i.test(...)`. (`bms-parser.js:18`) |
| **2. How is the channel catalog parsed?** | `parseBmsCatalog` scans up to 8 MB for `[u16 len][printable bytes…\0]` tokens (`_readLenStrings`), groups them by a `TrackInfo` delimiter into `{ name, source, description }`, and dedups by name. (`bms-parser.js:25,49`) |
| **3. What validation-channel detection exists?** | `parseBms` lowercases names and regex-tests for: lateral_accel `/^accy$\|lat.*accel/`, longitudinal_accel `/^accx$\|long.*accel/`, yaw_rate `/yaw/`, steering `/steer/`, speed `/^speed$/`, wheel_speeds `/^vwheel/`, dampers `/damper/`. Returns **booleans only** — no matched raw channel name. (`bms-parser.js:72`) |
| **4. Is there sample-block probing?** | **No.** Only the channel table at the start of the file is read. |
| **5. Is there a time axis?** | **No.** |
| **6. Are channel units parsed?** | **No.** The free-text `description` may mention a unit, but nothing is parsed into a unit field. |
| **7. Is there scale / offset?** | **No.** |
| **8. What is catalog-only (not telemetry data)?** | **Everything.** The output describes *which* channels exist (name / source / description) plus boolean validation flags. There are **no samples, no time-series, no physical values**. |

## UI today (`renderer/index.html` `.bmsbin` card)

- `importBms` reads the file, calls `parseBms`, rejects if `!header.valid`.
- Shows: channel count + importer string; a ✓/– badge row over `validationChannels`
  (boolean); a free-text "ready" line; a collapsible "show all channels" list.
- The "ready" line currently implies the file is ready to validate the model — which
  **over-states** the catalog-only reality (no time-series is decoded). 3A fixes the
  messaging.

## Tests today (`tests/verify-dynamics.js`, `[bms]`)

A synthetic `DarabImporter` buffer with 3 channels (accy/yaw/steer). Asserts: header
identifies DarabImporter, catalog finds 3 channels, name/source/description parsed,
validation channels detected. No metadata / diagnostics / canonical-mapping coverage yet.

## README today

Only the methodology line ("telemetry-derived workflows"). No `.bmsbin` boundary statement.

---

## Phase 3A scope (what this groundwork adds)

1. **Canonical telemetry schema** (`telemetry-schema.js`) — a source-agnostic channel
   vocabulary + pattern map that returns the **matched raw channel name**, not just a
   boolean.
2. **Telemetry metadata + diagnostics** (`telemetry-metadata.js`) — `buildTelemetryMetadata`
   / `validateTelemetryCatalog`, mirroring the Phase 2 tyre-metadata pattern: status
   (`catalog_only` / `decode_error`), per-channel descriptors (unit/scale/offset/sampleRate
   all `null` for now, confidence `detected`), capabilities (only `channelCatalog: true`),
   and error/warning/info diagnostics worded as capability statements.
3. **Status panel** — surfaces "channel catalog only; time-series and physical scaling not
   decoded yet", the detected validation channels (with raw names), missing required
   channels, and diagnostics. Trilingual.
4. **Tests** — synthetic fixtures only; no real `.bmsbin`.

Explicitly **out of scope for 3A**: sample blocks, sample rate, scale/offset, physical
values, lap segmentation, GPS/distance alignment, Kus/yaw-gain, model-vs-actual overlay,
Pi `.pds`, WinDarab compatibility.

Success criterion: after importing a `.bmsbin`, the app can honestly state which channels
it found, which correlation-required channels are present, and **why it cannot yet do
model-vs-actual** — not "draw a telemetry curve".
