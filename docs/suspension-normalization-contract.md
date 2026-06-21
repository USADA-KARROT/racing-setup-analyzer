# Suspension Input Normalization Contract (R2.2 §5)

`renderer/js/suspension-input-normalizer.js` — a PURE, dependency-free compatibility layer that turns a
suspension input (legacy whole-car OR explicit per-axle) into normalized per-axle **wheel rates** (N/mm,
already motion-ratio folded). It reproduces the physics core's single spring→wheel rule **bit-for-bit**
and carries a self-describing provenance trail. It is a *numerical* compatibility shim, **not** a
canonical-evidence upgrade.

## Public API
- `normalizeLegacySuspensionInput(input)` — legacy whole-car `{front_spring_rate, rear_spring_rate,
  front_motion_ratio, rear_motion_ratio, use_wheel_rate}`.
- `normalizeExplicitSuspensionInput(input)` — explicit per-axle `{front:{rate,basis,motionRatio,
  ratioDefinition}, rear:{…}}`, front and rear may use **different** bases.

Both return one shape:
```js
{
  valid, errors: [{code, scope, axle, field, fatal}],
  normalized: { frontWheelRateNmm: number|null, rearWheelRateNmm: number|null },  // raw, un-rounded
  semantics: { frontBasis, rearBasis, frontRatioDefinition, rearRatioDefinition, compatibilityMode },
  provenance: { source: 'legacy_input'|'explicit_input', canonicalTrustUpgraded: false }
}
```

## Ratio direction (authority)
`software motion ratio MR = spring_travel / wheel_travel`; `wheelRate = elementRate × MR²`. Only this
(software) direction is accepted. A **reverse** definition (`numerator: wheel_travel`, i.e. the manual
wheel/spring ratio) is **rejected** (`UNSUPPORTED_RATIO_DIRECTION`) — never silently reciprocated.

## Formulas (faithful reproduction of `dynamics-model.js` `wheelRate()`)
- legacy `use_wheel_rate===true` → identity (basis `legacy_wheel_rate`, ratioDefinition `null`).
- legacy `false`/`undefined` (or key absent) → `spring × Math.pow(MR, 2)` (basis `legacy_spring_element`,
  ratioDefinition `{spring_travel, wheel_travel, source:'legacy_implicit'}`). `undefined ≡ false`.
- explicit `spring_element` → `rate × Math.pow(MR, 2)` (motionRatio + software ratioDefinition required).
- explicit `wheel` / `ground` → identity (motionRatio/ratioDefinition must NOT be carried).

> **`Math.pow(MR, 2)`, not `MR*MR`.** IEEE-754 `Math.pow(x,2)` ≠ `x*x` for some values; the core uses
> `Math.pow`, so the shim must too, or an off-by-1-ulp wheel rate would diverge in the rounded model
> output. The 501-preset *observable* equivalence test (`deepStrictEqual` of `Tier1/Tier2.calculate()`)
> is what pins this.

## Trust boundary (the point of the layer)
```
normalization success  ≠  canonical evidence verification
provenance.canonicalTrustUpgraded = false   (HARD literal; no caller field can flip it)
```
- A normalized legacy/explicit input never becomes `measured`/`documented`/`verified`/`modelUsable`
  canonical truth. Numerical compatibility and evidence trust are separate concerns.
- An injected `canonicalTrustUpgraded:true` / `modelUsable:true` is an **unknown top-level field** →
  rejected (`UNKNOWN_TOP_LEVEL_FIELD`); the output's `canonicalTrustUpgraded` stays the module's literal `false`.
- `legacy_implicit` on a legacy ratio means "reuses the model's implicit software direction" — it is **not**
  a claim that the source was verified.

## Fail-closed / input boundary
- Any contract violation → `{valid:false}` + structured `errors[]` (fixed `ERROR_CODE` enum); **both**
  normalized rates `null` (never a half-usable result); never throws.
- Stricter than the legacy model: a missing/≤0/non-finite rate or motion ratio is rejected (the model's
  `?? 1.0` default-fill is NOT reproduced). This does not affect equivalence — all 501 presets carry
  complete finite fields; the difference only bites malformed input, which is rejected anyway.
- Plain JSON-compatible input only. Exotic/unreadable values (NaN/Infinity, function, BigInt, Symbol key,
  Map/Set/Date/TypedArray, cyclic graph, or a getter/accessor — never executed) → `EXOTIC_OR_UNREADABLE_INPUT`.
  **Documented limitation:** a fully transparent Proxy forwarding to a plain target is indistinguishable
  from that target and is treated as the plain data it forwards (consistent with R2.1D).

## Error vocabulary (frozen)
`INVALID_INPUT_TYPE · UNKNOWN_TOP_LEVEL_FIELD · MISSING_FRONT_AXLE · MISSING_REAR_AXLE · MISSING_RATE ·
NON_FINITE_RATE · NON_POSITIVE_RATE · UNKNOWN_BASIS · MISSING_MOTION_RATIO · NON_FINITE_MOTION_RATIO ·
NON_POSITIVE_MOTION_RATIO · MISSING_RATIO_DEFINITION · INVALID_RATIO_DEFINITION ·
UNSUPPORTED_RATIO_DIRECTION · LEGACY_FLAG_INVALID_TYPE · EXOTIC_OR_UNREADABLE_INPUT`. All fatal.

## Equivalence proof (`tests/suspension-input-equivalence.test.js`)
For all **501** presets (count asserted before iterating):
- **RAW exact** (`Object.is`, bit-for-bit): normalizer vs an **independent literal oracle** (no import of
  the normalizer, no reuse of its constants/helpers) → ≥1002 assertions.
- **OBSERVABLE** (`deepStrictEqual`): `Tier1/Tier2.calculate()` is identical whether fed the legacy input
  (spring×MR²) or the normalized wheel rate with `use_wheel_rate=true` (+ `tire_spring_rate` three-state).
No skip / no `.filter(Boolean)` / no sampling / no shim-vs-shim. Any inequality is a hard failure.

## Non-goals (this layer)
Does not touch runtime/model/preset/UI/telemetry; does not retire `use_wheel_rate`; does not upgrade
canonical trust; does no recommendation/comparison. The explicit per-axle API is forward-looking — it is
consumed by R2.2's canonical-model-input adapter and demo, not by the legacy preset path.
