/**
 * renderer/js/r3-0d-engineer-ui.js — R3.0D D5 · Engineer Brief UI integration (PRODUCTION, render-only).
 *
 * Authoritative entry: mountEngineerBriefPane(rootEl) — attaches the render-only Engineer Brief
 * UI to a DOM element. Subscribes to R3_0D_EngineerOrchestrator and re-renders on every
 * snapshot update.
 *
 * Hard contract (SKYLINE 2026-06-29 R3.0D D5 directive §13):
 *   • UI is RENDER-ONLY. The service decides; the viewmodel maps; the UI renders.
 *   • UI MUST NOT recompute hypothesis / confidence / credibility / priority / eligibility /
 *     contradiction status.
 *   • Display states (closed enum): unavailable / blocked / loading / available /
 *     inconclusive / stale-cleared / error-sanitized.
 *   • Safe rendering: textContent ONLY. NO innerHTML. NO arbitrary HTML from caller data.
 *     NO file paths, NO machine IDs, NO raw telemetry.
 *   • Forbidden phrases (directive §13.3) — NEVER appear in any rendered string:
 *     confirmed_cause / definitive_diagnosis / driver_fault / driver_error /
 *     guaranteed_improvement / fastest_setup / optimal_setup / theoretical_best /
 *     ai_diagnosis. Locale text is supplied by the i18n table (i18n-r3-0d.js) and
 *     audited in tests.
 *   • The mount is IDEMPOTENT and STATELESS — calling mountEngineerBriefPane on the same
 *     element multiple times is safe (each call re-binds the subscriber). The module does
 *     NOT keep any per-mount state beyond the Orchestrator subscription handle.
 *
 * UMD: Node require / Electron renderer global (R3_0D_EngineerUi).
 */
(function (root) {
  'use strict';

  // ---------- Module-init: dependencies --------------------------------------------------------
  var ORC = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { ORC = require('./r3-0d-engineer-orchestrator.js'); } catch (e) { ORC = null; }
  }
  if (ORC === null && typeof R3_0D_EngineerOrchestrator !== 'undefined') ORC = R3_0D_EngineerOrchestrator;
  if (!ORC) {
    throw new Error('r3-0d-engineer-ui.js: missing R3_0D_EngineerOrchestrator dependency');
  }

  // i18n function — falls back to a literal-key passthrough if the host renderer has no
  // i18n shell. Renderer code is expected to override this via mountEngineerBriefPane opts.
  function _defaultI18n(key, params) {
    // Render-only fallback. Never echoes params content (params are safe-stringified upstream).
    return key;
  }

  // ---------- Public API: mountEngineerBriefPane ----------------------------------------------
  /**
   * mountEngineerBriefPane(rootEl, opts) — attaches the render-only Engineer Brief UI.
   *
   * @param {Element} rootEl — DOM element to render into. Falsy → noop (returns null).
   * @param {Object} [opts] — { i18n: function(key, params)=>string, document: Document }
   * @returns {{ unmount: Function, render: Function }} — control handle
   */
  function mountEngineerBriefPane(rootEl, opts) {
    opts = opts || {};
    var doc = opts.document || (typeof document !== 'undefined' ? document : null);
    if (!rootEl || !doc) return null;

    var i18n = (typeof opts.i18n === 'function') ? opts.i18n : _defaultI18n;

    // ---------- Build inert pane skeleton --------------------------------------------------
    // Pure-DOM construction (NO innerHTML, NO arbitrary string parsing).
    // Codex D5 R1-02 closure: directive §13.4 forbids ANY innerHTML assignment in the
    // render-only UI surface, even a literal empty string. Clear via descendant removal.
    while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild);
    rootEl.setAttribute('data-r3-0d-engineer-brief', 'mounted');

    function _el(tag, cls, textKey, params) {
      var n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (textKey) n.textContent = i18n(textKey, params || {});
      return n;
    }

    var stateBadge = _el('div', 'r3d-state-badge');
    var titleEl = _el('h3', 'r3d-title', 'r3.0d.brief.title');
    var primaryIssueEl = _el('div', 'r3d-primary-issue');
    var primaryIssueLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.primary_issue.label');
    var primaryIssueText = _el('div', 'r3d-primary-text');
    primaryIssueEl.appendChild(primaryIssueLabel);
    primaryIssueEl.appendChild(primaryIssueText);

    var secondaryIssueEl = _el('div', 'r3d-secondary-issue hidden');
    var secondaryIssueLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.secondary_issue.label');
    var secondaryIssueText = _el('div', 'r3d-secondary-text');
    secondaryIssueEl.appendChild(secondaryIssueLabel);
    secondaryIssueEl.appendChild(secondaryIssueText);

    var contradictionsEl = _el('div', 'r3d-contradictions');
    var contradictionsLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.contradictions.label');
    var contradictionsList = _el('ul', 'r3d-contradictions-list');
    contradictionsEl.appendChild(contradictionsLabel);
    contradictionsEl.appendChild(contradictionsList);

    var cannotConcludeEl = _el('div', 'r3d-cannot-conclude');
    var cannotConcludeLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.cannot_conclude.label');
    var cannotConcludeList = _el('ul', 'r3d-cannot-conclude-list');
    cannotConcludeEl.appendChild(cannotConcludeLabel);
    cannotConcludeEl.appendChild(cannotConcludeList);

    var nextActionEl = _el('div', 'r3d-next-action');
    var nextActionLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.next_validation.label');
    var nextActionText = _el('div', 'r3d-next-text');
    nextActionEl.appendChild(nextActionLabel);
    nextActionEl.appendChild(nextActionText);

    var rollbackEl = _el('div', 'r3d-rollback');
    var rollbackLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.rollback.label');
    var rollbackText = _el('div', 'r3d-rollback-text');
    rollbackEl.appendChild(rollbackLabel);
    rollbackEl.appendChild(rollbackText);

    var stopEl = _el('div', 'r3d-stop');
    var stopLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.stop.label');
    var stopText = _el('div', 'r3d-stop-text');
    stopEl.appendChild(stopLabel);
    stopEl.appendChild(stopText);

    var credibilityEl = _el('div', 'r3d-credibility');
    var credibilityLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.credibility.label');
    var credibilityBadge = _el('span', 'r3d-credibility-badge');
    credibilityEl.appendChild(credibilityLabel);
    credibilityEl.appendChild(credibilityBadge);

    var provenanceEl = _el('div', 'r3d-provenance');
    var provenanceLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.provenance.label');
    var provenanceText = _el('span', 'r3d-provenance-text');
    provenanceEl.appendChild(provenanceLabel);
    provenanceEl.appendChild(provenanceText);

    var limitationsEl = _el('div', 'r3d-limitations');
    var limitationsLabel = _el('div', 'r3d-section-label', 'r3.0d.brief.limitations.label');
    var limitationsList = _el('ul', 'r3d-limitations-list');
    limitationsEl.appendChild(limitationsLabel);
    limitationsEl.appendChild(limitationsList);

    rootEl.appendChild(titleEl);
    rootEl.appendChild(stateBadge);
    rootEl.appendChild(primaryIssueEl);
    rootEl.appendChild(secondaryIssueEl);
    rootEl.appendChild(contradictionsEl);
    rootEl.appendChild(cannotConcludeEl);
    rootEl.appendChild(nextActionEl);
    rootEl.appendChild(stopEl);
    rootEl.appendChild(rollbackEl);
    rootEl.appendChild(credibilityEl);
    rootEl.appendChild(provenanceEl);
    rootEl.appendChild(limitationsEl);

    function _clearList(ul) { while (ul.firstChild) ul.removeChild(ul.firstChild); }

    // ---------- Render function ------------------------------------------------------------
    function render(snapshot) {
      try {
        // Reset all sections.
        stateBadge.setAttribute('data-state', snapshot ? snapshot.displayState : 'unavailable');
        stateBadge.textContent = i18n('r3.0d.state.' + (snapshot ? snapshot.displayState : 'unavailable'), {});

        if (!snapshot) {
          primaryIssueText.textContent = i18n('r3.0d.brief.no_data', {});
          secondaryIssueEl.classList.add('hidden');
          _clearList(contradictionsList);
          _clearList(cannotConcludeList);
          _clearList(limitationsList);
          nextActionText.textContent = '';
          rollbackText.textContent = '';
          stopText.textContent = '';
          credibilityBadge.textContent = '';
          provenanceText.textContent = '';
          return;
        }

        // For blocked / unavailable / stale-cleared states — show the state label only, no
        // brief content.
        var ds = snapshot.displayState;
        if (ds !== 'available' && ds !== 'inconclusive') {
          primaryIssueText.textContent = i18n('r3.0d.brief.state.' + ds, {});
          secondaryIssueEl.classList.add('hidden');
          _clearList(contradictionsList);
          _clearList(cannotConcludeList);
          _clearList(limitationsList);
          nextActionText.textContent = '';
          rollbackText.textContent = '';
          stopText.textContent = '';
          credibilityBadge.textContent = '';
          provenanceText.textContent = '';
          return;
        }

        // For 'available' or 'inconclusive', fetch the AUTHORITATIVE viewmodel reference
        // (subscriber snapshot does NOT carry brief content; the host wiring uses
        // getCurrentAuthoritativeViewModel to obtain the deep-frozen, attested object).
        var vm = ORC.getCurrentAuthoritativeViewModel();
        if (!vm) {
          // Race window: snapshot says 'available' but viewmodel cleared between events.
          primaryIssueText.textContent = i18n('r3.0d.brief.state.stale-cleared', {});
          return;
        }

        primaryIssueText.textContent = i18n(vm.primaryIssue.i18nKey, vm.primaryIssue.params || {});
        if (vm.secondaryIssue) {
          secondaryIssueText.textContent = i18n(vm.secondaryIssue.i18nKey, vm.secondaryIssue.params || {});
          secondaryIssueEl.classList.remove('hidden');
        } else {
          secondaryIssueEl.classList.add('hidden');
        }

        _clearList(contradictionsList);
        for (var ci = 0; ci < vm.contradictions.length; ci++) {
          var c = vm.contradictions[ci];
          var li = doc.createElement('li');
          li.textContent = i18n(c.i18nKey, c.params || {});
          contradictionsList.appendChild(li);
        }

        _clearList(cannotConcludeList);
        for (var cci = 0; cci < vm.cannotConcludeReasonCodes.length; cci++) {
          var ccLi = doc.createElement('li');
          ccLi.textContent = i18n('r3.0d.reason.' + vm.cannotConcludeReasonCodes[cci], {});
          cannotConcludeList.appendChild(ccLi);
        }

        _clearList(limitationsList);
        for (var li2 = 0; li2 < vm.limitations.length; li2++) {
          var limLi = doc.createElement('li');
          limLi.textContent = i18n('r3.0d.reason.' + vm.limitations[li2], {});
          limitationsList.appendChild(limLi);
        }

        if (vm.nextValidationAction) {
          nextActionText.textContent = i18n(vm.nextValidationAction.i18nKey, {});
        } else {
          nextActionText.textContent = i18n('r3.0d.brief.no_next_action', {});
        }

        // Stop + rollback derive from the next-validation action's i18n family.
        if (vm.nextValidationAction) {
          stopText.textContent = i18n(vm.nextValidationAction.i18nKey + '.stop', {});
          rollbackText.textContent = i18n(vm.nextValidationAction.i18nKey + '.rollback', {});
        } else {
          stopText.textContent = '';
          rollbackText.textContent = '';
        }

        credibilityBadge.textContent = i18n('r3.0d.credibility.' + vm.credibility, {});
        credibilityBadge.setAttribute('data-credibility', vm.credibility);
        provenanceText.textContent = i18n('r3.0d.provenance.' + vm.provenance, {});
      } catch (e) {
        // Render-only must never throw out — fail closed to a sanitized error state.
        stateBadge.setAttribute('data-state', 'error-sanitized');
        stateBadge.textContent = i18n('r3.0d.state.error-sanitized', {});
        primaryIssueText.textContent = i18n('r3.0d.brief.state.error-sanitized', {});
      }
    }

    // Initial render with whatever the orchestrator currently has (if anything).
    render(ORC.currentState());

    // Subscribe.
    var unsub = ORC.subscribe(function (snap) { render(snap); });

    return {
      unmount: function () {
        try { unsub(); } catch (e) { /* swallow */ }
        // Codex D5 R1-02 closure: directive §13.4 forbids ANY innerHTML assignment in the
    // render-only UI surface, even a literal empty string. Clear via descendant removal.
    while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild);
        rootEl.removeAttribute('data-r3-0d-engineer-brief');
      },
      render: render,
    };
  }

  // ---------- Public API ------------------------------------------------------------------------
  var api = {
    mountEngineerBriefPane: mountEngineerBriefPane,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.R3_0D_EngineerUi = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
