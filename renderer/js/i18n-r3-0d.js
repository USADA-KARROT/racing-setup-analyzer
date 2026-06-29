/**
 * i18n-r3-0d.js — R3.0D D5 · Engineer Brief three-language dictionary (en / zh-TW / ja).
 *
 * Same pattern as i18n-shell.js / i18n-workspace.js: keys merged into global I18N via
 * Object.assign at load time. Load order: AFTER i18n.js / i18n-ui.js / i18n-shell.js,
 * BEFORE the app script.
 *
 * Scope (UI layer only — D5 service codes stay FROZEN, their reason codes are mapped here):
 *   - casenav.engineer_brief — case-subview label (matches NAV_NODES['case:engineer_brief'].labelKey)
 *   - feat.engineer_brief / feat.engineer_brief.desc — feature label + description
 *   - r3.0d.state.* — display-state labels (closed enum: unavailable / blocked / loading /
 *                     available / inconclusive / stale-cleared / error-sanitized)
 *   - r3.0d.brief.* — brief section labels (title, primary issue, secondary issue,
 *                     contradictions, cannot-conclude, next validation, stop, rollback,
 *                     credibility, provenance, limitations, no_primary_action, no_next_action,
 *                     no_data, state.<displayState>)
 *   - r3.0d.credibility.* — CONCLUSION_CREDIBILITY enum
 *   - r3.0d.provenance.* — PROVENANCE enum (mirrors R3.0B/R3.0C)
 *   - r3.0d.activation.* — activation gate rationale (ready / deferred)
 *   - r3.0d.evidence.* — evidence-summary entry labels
 *   - r3.0d.alternative.* — alternative-explanation labels (catch-all; specific ids fall back)
 *   - r3.0d.reason.* — reason-code mapping (subset; full set humanized via tCode())
 *
 * Directive §13.3 invariant: NO causal-overclaim or driver-blame phrasing. Every key audited
 * in tests/r3.0d-engineer-brief.test.js Section R + tests/i18n-parity.test.js.
 */
const R3_0D_I18N = {
  en: {
    // —— case navigation ——
    'casenav.engineer_brief': 'Engineer Brief',
    'feat.engineer_brief': 'Engineer Brief',
    'feat.engineer_brief.desc': 'Structured race-engineering insight: primary issue, contradictions, next validation, with credibility and limitations preserved.',

    // —— display state labels ——
    'r3.0d.state.unavailable': 'Unavailable',
    'r3.0d.state.blocked': 'Blocked',
    'r3.0d.state.loading': 'Loading…',
    'r3.0d.state.available': 'Available',
    'r3.0d.state.inconclusive': 'Inconclusive',
    'r3.0d.state.stale-cleared': 'Cleared (state changed)',
    'r3.0d.state.error-sanitized': 'Internal error (sanitized)',

    // —— brief section labels ——
    'r3.0d.brief.title': 'Engineer Brief',
    'r3.0d.brief.primary_issue.label': 'Primary issue',
    'r3.0d.brief.secondary_issue.label': 'Secondary issue',
    'r3.0d.brief.contradictions.label': 'Contradictions',
    'r3.0d.brief.cannot_conclude.label': 'Cannot conclude',
    'r3.0d.brief.next_validation.label': 'Next validation action',
    'r3.0d.brief.stop.label': 'Stop condition',
    'r3.0d.brief.rollback.label': 'Rollback condition',
    'r3.0d.brief.credibility.label': 'Credibility',
    'r3.0d.brief.provenance.label': 'Data provenance',
    'r3.0d.brief.limitations.label': 'Limitations',
    'r3.0d.brief.no_primary_action': 'No primary action recommended at this time.',
    'r3.0d.brief.no_next_action': 'No further validation action proposed.',
    'r3.0d.brief.no_data': 'No engineer brief available yet — load or build a case to begin.',
    'r3.0d.brief.state.unavailable': 'Engineer brief is not yet available for this case.',
    'r3.0d.brief.state.blocked': 'Engineer brief is blocked — upstream evidence is incomplete or contradicted.',
    'r3.0d.brief.state.loading': 'Engineer brief is being prepared.',
    'r3.0d.brief.state.stale-cleared': 'Engineer brief cleared — case, session, mapping, calibration, or telemetry changed.',
    'r3.0d.brief.state.error-sanitized': 'Engineer brief encountered an internal error and was sanitized.',

    // —— credibility ladder ——
    'r3.0d.credibility.Physics': 'Physics',
    'r3.0d.credibility.Model': 'Model',
    'r3.0d.credibility.Measured': 'Measured',
    'r3.0d.credibility.Derived': 'Derived',
    'r3.0d.credibility.Heuristic': 'Heuristic',
    'r3.0d.credibility.Unavailable': 'Unavailable',

    // —— provenance ——
    'r3.0d.provenance.synthetic': 'Synthetic',
    'r3.0d.provenance.real': 'Real',
    'r3.0d.provenance.unverified': 'Unverified',

    // —— activation rationale ——
    'r3.0d.activation.ready': 'Engineer Brief capability is active for this case.',
    'r3.0d.activation.deferred': 'Engineer Brief capability is deferred — the case lacks an actionable primary or has unresolved contradictions.',

    // —— evidence-summary entry ——
    'r3.0d.evidence.supporting': 'Supporting evidence from hypothesis {hypothesisId}',
  },

  zh: {
    // —— case navigation ——
    'casenav.engineer_brief': '工程師簡報',
    'feat.engineer_brief': '工程師簡報',
    'feat.engineer_brief.desc': '結構化的工程診斷：主要議題、矛盾、下一步驗證行動，並保留可信度與限制資訊。',

    // —— display state labels ——
    'r3.0d.state.unavailable': '尚未可用',
    'r3.0d.state.blocked': '已封鎖',
    'r3.0d.state.loading': '載入中…',
    'r3.0d.state.available': '可用',
    'r3.0d.state.inconclusive': '無法下定論',
    'r3.0d.state.stale-cleared': '已清空（狀態改變）',
    'r3.0d.state.error-sanitized': '內部錯誤（已淨化）',

    // —— brief section labels ——
    'r3.0d.brief.title': '工程師簡報',
    'r3.0d.brief.primary_issue.label': '主要議題',
    'r3.0d.brief.secondary_issue.label': '次要議題',
    'r3.0d.brief.contradictions.label': '矛盾證據',
    'r3.0d.brief.cannot_conclude.label': '無法下定論',
    'r3.0d.brief.next_validation.label': '下一步驗證行動',
    'r3.0d.brief.stop.label': '停止條件',
    'r3.0d.brief.rollback.label': '回退條件',
    'r3.0d.brief.credibility.label': '可信度',
    'r3.0d.brief.provenance.label': '資料來源',
    'r3.0d.brief.limitations.label': '限制',
    'r3.0d.brief.no_primary_action': '目前沒有建議的主要行動。',
    'r3.0d.brief.no_next_action': '沒有建議的後續驗證行動。',
    'r3.0d.brief.no_data': '尚未有工程師簡報——請載入或建立一個案例。',
    'r3.0d.brief.state.unavailable': '此案例尚未可建立工程師簡報。',
    'r3.0d.brief.state.blocked': '工程師簡報已被封鎖——上游證據不完整或彼此矛盾。',
    'r3.0d.brief.state.loading': '工程師簡報準備中。',
    'r3.0d.brief.state.stale-cleared': '工程師簡報已清空——案例、Session、通道對應、校準或遙測有變動。',
    'r3.0d.brief.state.error-sanitized': '工程師簡報發生內部錯誤，已淨化。',

    // —— credibility ladder ——
    'r3.0d.credibility.Physics': '物理',
    'r3.0d.credibility.Model': '模型',
    'r3.0d.credibility.Measured': '量測',
    'r3.0d.credibility.Derived': '推導',
    'r3.0d.credibility.Heuristic': '啟發式',
    'r3.0d.credibility.Unavailable': '不可用',

    // —— provenance ——
    'r3.0d.provenance.synthetic': '合成',
    'r3.0d.provenance.real': '真實',
    'r3.0d.provenance.unverified': '未驗證',

    // —— activation rationale ——
    'r3.0d.activation.ready': '此案例的工程師簡報能力已啟用。',
    'r3.0d.activation.deferred': '工程師簡報能力延後啟用——案例尚未具備可行動的主要結論或仍有未解的矛盾。',

    // —— evidence-summary entry ——
    'r3.0d.evidence.supporting': '來自假設 {hypothesisId} 的支持證據',
  },

  ja: {
    // —— case navigation ——
    'casenav.engineer_brief': 'エンジニアブリーフ',
    'feat.engineer_brief': 'エンジニアブリーフ',
    'feat.engineer_brief.desc': '構造化されたレースエンジニアリング診断：主な問題、矛盾、次の検証アクション、信頼性と制限を保持。',

    // —— display state labels ——
    'r3.0d.state.unavailable': '利用不可',
    'r3.0d.state.blocked': 'ブロック',
    'r3.0d.state.loading': '読み込み中…',
    'r3.0d.state.available': '利用可能',
    'r3.0d.state.inconclusive': '結論不可',
    'r3.0d.state.stale-cleared': 'クリア（状態変更）',
    'r3.0d.state.error-sanitized': '内部エラー（サニタイズ済み）',

    // —— brief section labels ——
    'r3.0d.brief.title': 'エンジニアブリーフ',
    'r3.0d.brief.primary_issue.label': '主な問題',
    'r3.0d.brief.secondary_issue.label': '副次的な問題',
    'r3.0d.brief.contradictions.label': '矛盾',
    'r3.0d.brief.cannot_conclude.label': '結論不可',
    'r3.0d.brief.next_validation.label': '次の検証アクション',
    'r3.0d.brief.stop.label': '停止条件',
    'r3.0d.brief.rollback.label': 'ロールバック条件',
    'r3.0d.brief.credibility.label': '信頼性',
    'r3.0d.brief.provenance.label': 'データの出所',
    'r3.0d.brief.limitations.label': '制限事項',
    'r3.0d.brief.no_primary_action': '現時点で推奨される主要なアクションはありません。',
    'r3.0d.brief.no_next_action': '後続の検証アクションは提案されていません。',
    'r3.0d.brief.no_data': 'エンジニアブリーフはまだありません — ケースを読み込むか作成してください。',
    'r3.0d.brief.state.unavailable': 'このケースではまだエンジニアブリーフを利用できません。',
    'r3.0d.brief.state.blocked': 'エンジニアブリーフはブロックされています — 上流の証拠が不完全または矛盾しています。',
    'r3.0d.brief.state.loading': 'エンジニアブリーフを準備中です。',
    'r3.0d.brief.state.stale-cleared': 'エンジニアブリーフがクリアされました — ケース、セッション、マッピング、キャリブレーション、テレメトリのいずれかが変更されました。',
    'r3.0d.brief.state.error-sanitized': 'エンジニアブリーフで内部エラーが発生し、サニタイズされました。',

    // —— credibility ladder ——
    'r3.0d.credibility.Physics': '物理',
    'r3.0d.credibility.Model': 'モデル',
    'r3.0d.credibility.Measured': '計測',
    'r3.0d.credibility.Derived': '導出',
    'r3.0d.credibility.Heuristic': 'ヒューリスティック',
    'r3.0d.credibility.Unavailable': '利用不可',

    // —— provenance ——
    'r3.0d.provenance.synthetic': '合成',
    'r3.0d.provenance.real': '実測',
    'r3.0d.provenance.unverified': '未検証',

    // —— activation rationale ——
    'r3.0d.activation.ready': 'このケースのエンジニアブリーフ機能はアクティブです。',
    'r3.0d.activation.deferred': 'エンジニアブリーフ機能は保留中です — ケースに実行可能な主要結論がないか、未解決の矛盾があります。',

    // —— evidence-summary entry ——
    'r3.0d.evidence.supporting': '仮説 {hypothesisId} からの支持証拠',
  },
};

// merge into the global I18N (mirrors i18n-shell.js / i18n-workspace.js pattern)
(function () {
  var I = (typeof I18N !== 'undefined') ? I18N : null;
  if (!I && typeof globalThis !== 'undefined' && globalThis.I18N) I = globalThis.I18N;
  if (!I && typeof window !== 'undefined' && window.I18N) I = window.I18N;
  if (!I) return;
  Object.assign(I.en = I.en || {}, R3_0D_I18N.en);
  Object.assign(I.zh = I.zh || {}, R3_0D_I18N.zh);
  Object.assign(I.ja = I.ja || {}, R3_0D_I18N.ja);
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { R3_0D_I18N: R3_0D_I18N };
}
