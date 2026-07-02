# Third-Party Notices

Racing Setup Analyzer bundles third-party software. This file records the components and their
licenses. The application itself is **UNLICENSED (all rights reserved)** — see the README; that
status governs *this project's* code, NOT the third-party components below, each of which is
distributed under its own permissive license.

## Vendored runtime libraries (renderer/lib/, non-npm)

These ship inside the packaged app and load from disk only (no CDN at runtime). Pinned by sha256 in
`supply-chain/vendor-manifest.json`.

### Alpine.js 3.14.8

- License: **MIT**
- Source: https://unpkg.com/alpinejs@3.14.8/dist/cdn.min.js
- Upstream: https://github.com/alpinejs/alpine
- Shipped: `renderer/lib/alpine.min.js` (sha256 `b600e363d99d95444db54acbfb2deffec9ae792aa99a09229bcda078e5b55643`)

### Chart.js 4.4.7

- License: **MIT**
- Source: https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js
- Upstream: https://github.com/chartjs/Chart.js
- Shipped: `renderer/lib/chart.min.js` (sha256 `206b6e8bb00fc7bba2c7ee80ca41db3e9e05ba7be0aa35abeba9cfd5357f5d0e`)

### Tailwind CSS (Play CDN browser build) 3.4.17

- License: **MIT**
- Source: https://cdn.tailwindcss.com (standalone Play CDN browser build)
- Upstream: https://github.com/tailwindlabs/tailwindcss
- Shipped: `renderer/lib/tailwind.js` (sha256 `176e894661aa9cdc9a5cba6c720044cbbf7b8bd80d1c9a142a7c24b1b6c50d15`)

## npm build-toolchain dependencies (devDependencies, build-time only)

The `electron` and `electron-builder` toolchains and their transitive dependencies are used only to
BUILD the packaged app; they are not shipped inside the application bundle. The full pinned tree is in
`package-lock.json` and enumerated in the CycloneDX SBOM at `supply-chain/sbom.cdx.json`
(416 components). All are permissive-licensed:

| License | Component count |
|---|---|
| MIT | 309 |
| ISC | 73 |
| Apache-2.0 | 10 |
| BlueOak-1.0.0 | 8 |
| BSD-2-Clause | 6 |
| BSD-3-Clause | 5 |
| Python-2.0 | 1 |
| WTFPL OR ISC | 1 |
| WTFPL | 1 |
| (MIT OR CC0-1.0) | 1 |
| (WTFPL OR MIT) | 1 |

No copyleft (GPL/LGPL/AGPL/MPL/EPL/CDDL) licenses are present; `scripts/check-supply-chain.js`
fails closed if any non-allowlisted license appears.

## Electron / Chromium / Node.js

The packaged app embeds the Electron runtime (Chromium + Node.js), distributed by the Electron project
under the MIT license, which itself bundles Chromium (BSD-style) and Node.js (MIT). Full upstream
notices ship with the Electron distribution inside the app bundle.
