/**
 * i18n-r3-0e.js — R3.0E E5 · Experiment Loop + Case Timeline three-language dictionary
 * (en / zh-TW / ja).
 *
 * Same pattern as i18n-r3-0d.js. Loaded AFTER i18n.js / i18n-ui.js / i18n-shell.js,
 * BEFORE the app script.
 *
 * Scope (UI layer only — E3 / E4 service codes stay FROZEN, this only maps display labels):
 *   - casenav.experiment_loop  / casenav.case_timeline — case-subview labels
 *   - feat.experiment_loop / feat.experiment_loop.desc — feature label + description
 *   - feat.case_timeline / feat.case_timeline.desc — feature label + description
 *   - r3.0e.outcome.class.<enum>   — outcome class display labels
 *   - r3.0e.timeline.kind.<enum>   — timeline event kind labels
 *   - r3.0e.activation.<ready|deferred>
 *   - r3.0e.state.<unavailable|available|loading|stale-cleared|error-sanitized>
 *
 * Directive: NO causal-overclaim, NO driver-blame phrasing. Every key audited by
 * tests/i18n-parity.test.js.
 */
const R3_0E_I18N = {
  en: {
    // —— case navigation ——
    'casenav.experiment_loop': 'Experiment Loop',
    'casenav.case_timeline': 'Case Timeline',
    'feat.experiment_loop': 'Experiment Loop',
    'feat.experiment_loop.desc': 'Track experiments through application, follow-up, and deterministic outcome classification with controlled-variable integrity.',
    'feat.case_timeline': 'Case Timeline',
    'feat.case_timeline.desc': 'Append-only chronological log of case events: baseline, hypothesis, recommendation, experiment, applied change, follow-up, outcome.',

    // —— display state labels ——
    'r3.0e.state.unavailable': 'Unavailable',
    'r3.0e.state.loading': 'Loading…',
    'r3.0e.state.available': 'Available',
    'r3.0e.state.stale-cleared': 'Cleared (state changed)',
    'r3.0e.state.error-sanitized': 'Internal error (sanitized)',

    // —— outcome class labels ——
    'r3.0e.outcome.class.confirmed': 'Confirmed (within expectation)',
    'r3.0e.outcome.class.partially_confirmed': 'Partially confirmed (direction match, magnitude outside range)',
    'r3.0e.outcome.class.contradicted': 'Contradicted (observation does not match expectation)',
    'r3.0e.outcome.class.inconclusive': 'Inconclusive (insufficient data quality or unclear direction)',
    'r3.0e.outcome.class.invalid_comparison': 'Invalid comparison (cross-case, cross-session, or comparability insufficient)',
    'r3.0e.outcome.class.inconclusive_due_to_confounders': 'Inconclusive — control variables missing or out of range',

    // —— timeline kind labels ——
    'r3.0e.timeline.kind.baseline_captured': 'Baseline captured',
    'r3.0e.timeline.kind.hypothesis_recorded': 'Hypothesis recorded',
    'r3.0e.timeline.kind.recommendation_made': 'Recommendation made',
    'r3.0e.timeline.kind.experiment_planned': 'Experiment planned',
    'r3.0e.timeline.kind.experiment_applied': 'Experiment applied',
    'r3.0e.timeline.kind.follow_up_case_created': 'Follow-up case created',
    'r3.0e.timeline.kind.outcome_classified': 'Outcome classified',
    'r3.0e.timeline.kind.experiment_abandoned': 'Experiment abandoned',

    // —— activation rationale ——
    'r3.0e.activation.ready': 'Experiment Loop + Case Timeline capabilities are active for this case.',
    'r3.0e.activation.deferred': 'Experiment Loop + Case Timeline capabilities are deferred — the case lacks an applied experiment record or has an outstanding linkage break.',
    'r3.0e.activation.rationale.case_required': 'Open a case to view its experiment loop and timeline.',
    'r3.0e.activation.rationale.applied_experiment_required': 'An experiment must reach status \'applied\' before the outcome classifier surface activates.',

    // —— honest disclaimers (always visible) ——
    'r3.0e.disclaimer.no_causation': 'Outcomes do not assert causation. Confirmed only means observation matched expectation under controlled variables in this single comparison.',
    'r3.0e.disclaimer.no_driver_blame': 'Outcomes never attribute results to driver action. Driver feedback (when present) is recorded as an i18n key only.',
    'r3.0e.disclaimer.no_auto_setup': 'No setup change is ever applied automatically. Applied Change records reflect user-initiated actions only.',
    'r3.0e.disclaimer.same_case_session_only': 'Comparison is restricted to the same case and same session; cross-session inferences are NOT supported.',
  },
  zh: {
    'casenav.experiment_loop': '實驗迴圈',
    'casenav.case_timeline': '案例時間軸',
    'feat.experiment_loop': '實驗迴圈',
    'feat.experiment_loop.desc': '追蹤實驗從套用、追蹤到結果分類，以對照變數完整性為基礎的確定性判定。',
    'feat.case_timeline': '案例時間軸',
    'feat.case_timeline.desc': '案例事件的僅追加時序紀錄：基線、假設、建議、實驗、套用變更、追蹤、結果。',

    'r3.0e.state.unavailable': '尚未可用',
    'r3.0e.state.loading': '載入中…',
    'r3.0e.state.available': '可用',
    'r3.0e.state.stale-cleared': '已清除（狀態變動）',
    'r3.0e.state.error-sanitized': '內部錯誤（已脫敏）',

    'r3.0e.outcome.class.confirmed': '確認（符合預期）',
    'r3.0e.outcome.class.partially_confirmed': '部分確認（方向相符、幅度超出範圍）',
    'r3.0e.outcome.class.contradicted': '矛盾（觀測與預期不符）',
    'r3.0e.outcome.class.inconclusive': '無結論（資料品質不足或方向不明）',
    'r3.0e.outcome.class.invalid_comparison': '比較無效（跨案例、跨工作階段或可比性不足）',
    'r3.0e.outcome.class.inconclusive_due_to_confounders': '無結論 — 對照變數缺失或超出範圍',

    'r3.0e.timeline.kind.baseline_captured': '基線擷取',
    'r3.0e.timeline.kind.hypothesis_recorded': '假設記錄',
    'r3.0e.timeline.kind.recommendation_made': '建議提出',
    'r3.0e.timeline.kind.experiment_planned': '實驗規劃',
    'r3.0e.timeline.kind.experiment_applied': '實驗套用',
    'r3.0e.timeline.kind.follow_up_case_created': '建立追蹤案例',
    'r3.0e.timeline.kind.outcome_classified': '結果分類',
    'r3.0e.timeline.kind.experiment_abandoned': '實驗放棄',

    'r3.0e.activation.ready': '此案例的實驗迴圈與時間軸功能已啟動。',
    'r3.0e.activation.deferred': '實驗迴圈與時間軸功能延後啟動 — 案例尚無已套用的實驗紀錄或有未解決的關聯斷裂。',
    'r3.0e.activation.rationale.case_required': '請開啟案例以檢視其實驗迴圈與時間軸。',
    'r3.0e.activation.rationale.applied_experiment_required': '實驗需先到達「已套用」狀態，結果分類介面才會啟動。',

    'r3.0e.disclaimer.no_causation': '結果不主張因果關係。「確認」僅代表在此次對照變數受控的單一比較中觀測符合預期。',
    'r3.0e.disclaimer.no_driver_blame': '結果絕不歸因於駕駛動作。駕駛回饋（若有）僅以 i18n 鍵紀錄。',
    'r3.0e.disclaimer.no_auto_setup': '系統絕不自動套用任何設定變更。套用變更紀錄僅反映使用者主動執行的動作。',
    'r3.0e.disclaimer.same_case_session_only': '比較僅限同案例同工作階段；不支援跨工作階段推論。',
  },
  ja: {
    'casenav.experiment_loop': '実験ループ',
    'casenav.case_timeline': 'ケースタイムライン',
    'feat.experiment_loop': '実験ループ',
    'feat.experiment_loop.desc': '実験を適用、フォローアップ、確定的な結果分類まで追跡し、対照変数の完全性を担保します。',
    'feat.case_timeline': 'ケースタイムライン',
    'feat.case_timeline.desc': 'ケースイベントの追記専用時系列ログ：ベースライン、仮説、推奨、実験、適用変更、フォローアップ、結果。',

    'r3.0e.state.unavailable': '利用不可',
    'r3.0e.state.loading': '読込中…',
    'r3.0e.state.available': '利用可能',
    'r3.0e.state.stale-cleared': 'クリア済み（状態変更）',
    'r3.0e.state.error-sanitized': '内部エラー（サニタイズ済み）',

    'r3.0e.outcome.class.confirmed': '確認済み（期待通り）',
    'r3.0e.outcome.class.partially_confirmed': '部分確認（方向は一致、振幅は範囲外）',
    'r3.0e.outcome.class.contradicted': '矛盾（観測が期待と一致しない）',
    'r3.0e.outcome.class.inconclusive': '結論なし（データ品質不足または方向不明）',
    'r3.0e.outcome.class.invalid_comparison': '比較無効（ケース・セッション横断または比較性不足）',
    'r3.0e.outcome.class.inconclusive_due_to_confounders': '結論なし — 対照変数が欠落または範囲外',

    'r3.0e.timeline.kind.baseline_captured': 'ベースライン取得',
    'r3.0e.timeline.kind.hypothesis_recorded': '仮説記録',
    'r3.0e.timeline.kind.recommendation_made': '推奨提示',
    'r3.0e.timeline.kind.experiment_planned': '実験計画',
    'r3.0e.timeline.kind.experiment_applied': '実験適用',
    'r3.0e.timeline.kind.follow_up_case_created': 'フォローアップケース作成',
    'r3.0e.timeline.kind.outcome_classified': '結果分類',
    'r3.0e.timeline.kind.experiment_abandoned': '実験中止',

    'r3.0e.activation.ready': 'このケースの実験ループとタイムライン機能はアクティブです。',
    'r3.0e.activation.deferred': '実験ループとタイムライン機能は保留中です — 適用された実験記録がないか、未解決のリンク破損があります。',
    'r3.0e.activation.rationale.case_required': 'ケースを開いて実験ループとタイムラインを表示してください。',
    'r3.0e.activation.rationale.applied_experiment_required': '結果分類サーフェスがアクティブになるには、実験が「適用済」状態に達する必要があります。',

    'r3.0e.disclaimer.no_causation': '結果は因果関係を主張しません。「確認済み」は、対照変数が制御された今回の比較において観測が期待と一致したことのみを意味します。',
    'r3.0e.disclaimer.no_driver_blame': '結果はドライバーの行為に起因するものとは絶対に判定しません。ドライバーフィードバック（存在する場合）は i18n キーとしてのみ記録されます。',
    'r3.0e.disclaimer.no_auto_setup': 'いかなるセットアップ変更も自動的に適用されません。適用変更記録はユーザー主導のアクションのみを反映します。',
    'r3.0e.disclaimer.same_case_session_only': '比較は同一ケース・同一セッションに限定されます。セッション横断的な推論はサポートされません。',
  },
};

// merge into the global I18N
(function () {
  var I = (typeof I18N !== 'undefined') ? I18N : null;
  if (!I && typeof globalThis !== 'undefined' && globalThis.I18N) I = globalThis.I18N;
  if (!I && typeof window !== 'undefined' && window.I18N) I = window.I18N;
  if (!I) return;
  Object.assign(I.en = I.en || {}, R3_0E_I18N.en);
  Object.assign(I.zh = I.zh || {}, R3_0E_I18N.zh);
  Object.assign(I.ja = I.ja || {}, R3_0E_I18N.ja);
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { R3_0E_I18N: R3_0E_I18N };
}
