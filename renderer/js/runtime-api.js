/**
 * RuntimeApi — the ONE runtime abstraction between the renderer and its host.
 *
 * The renderer never talks to window.electronAPI directly (api.js consumes THIS
 * instead). Surface is intentionally minimal — exactly the two capabilities the
 * app actually needs today:
 *
 *   RuntimeApi.platform        'darwin' | 'win32' | 'linux' | ... (Electron) | 'web'
 *   RuntimeApi.getAppVersion() Promise<string>  — a strict-SemVer version or the
 *                              literal 'unavailable'. NEVER a fabricated version,
 *                              NEVER a throw.
 *
 * Electron host: delegates to the sandboxed preload bridge (window.electronAPI),
 * so app.getVersion() in the main process stays the single version authority and
 * the preload's fail-closed rules (strict SemVer, timeout, 'unavailable') apply
 * unchanged.
 *
 * Web host: platform is 'web' and the version comes from the static build
 * metadata (window.WEB_BUILD_INFO) stamped by the deploy pipeline. Missing or
 * malformed metadata resolves to 'unavailable' — observable on the console,
 * never masked by a fake version. No preload, no Node, no filesystem.
 *
 * UMD-ish: browser/Electron-renderer global (RuntimeApi) + Node require for tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RuntimeApi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Strict SemVer 2.0.0 — the same rule the Electron preload enforces, so both
  // hosts share one honesty contract for what counts as a real version string.
  var SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  function g(name) {
    try { return typeof window !== 'undefined' ? window[name] : undefined; } catch (_) { return undefined; }
  }

  var bridge = g('electronAPI');
  var isElectron = !!(bridge && typeof bridge.getAppVersion === 'function');

  function webVersion() {
    var info = g('WEB_BUILD_INFO');
    if (info && typeof info.version === 'string' && SEMVER.test(info.version)) return info.version;
    try { console.warn('[runtime-api] web build metadata missing/malformed — version reporting stays "unavailable"'); } catch (_) {}
    return 'unavailable';
  }

  return {
    // 'web' when no Electron bridge is present — a browser is the default host.
    platform: isElectron && typeof bridge.platform === 'string' ? bridge.platform : 'web',

    // Channel/build metadata passthrough for display layers (null in Electron).
    buildInfo: isElectron ? null : (g('WEB_BUILD_INFO') || null),

    getAppVersion: function () {
      if (isElectron) {
        // Preload already enforces strict SemVer + timeout + 'unavailable'.
        return bridge.getAppVersion().then(function (v) {
          return (typeof v === 'string' && v) ? v : 'unavailable';
        }).catch(function (err) {
          try { console.warn('[runtime-api] electron version query failed:', err && err.message); } catch (_) {}
          return 'unavailable';
        });
      }
      return Promise.resolve(webVersion());
    },
  };
});
