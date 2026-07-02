// WEB_BUILD_INFO — static web-build metadata slot.
//
// SOURCE TREE / ELECTRON: this file is intentionally a no-op placeholder. It
// defines NOTHING, so RuntimeApi keeps its fail-closed 'unavailable' behaviour
// when no real metadata was stamped, and the Electron path (preload bridge →
// app.getVersion()) stays the version authority.
//
// WEB DEPLOY: scripts/build-web-dist.js REPLACES this file in web-dist/ with a
// generated one that sets a frozen window.WEB_BUILD_INFO {version, channel,
// commit, builtAt} taken from package.json + git — the single stamping point.
// Never hand-edit a version into this file.
