/**
 * i18n-csv.js — translations for the Telemetry CSV Evidence viewer (V1 Step 2B).
 * Merged into the master I18N at load time (same pattern as i18n-ui/guide/advisor).
 * EN primary / 繁中 / 日本語.
 */
const CSV_I18N = {
  en: {
    'tab.telemetry': 'Telemetry',
    'ui.telem.title': 'Telemetry CSV Evidence',
    'ui.telem.hint': 'Import a telemetry CSV (you load your own file at runtime; nothing is uploaded or stored). Channels are auto-mapped but stay PROVISIONAL until you confirm each definition. Observed analyses are fail-closed.',
    'ui.telem.profile': 'Vehicle profile',
    'ui.telem.unload': 'Unload',
    'ui.telem.rows': 'rows',
    'ui.telem.cols': 'cols',
    'ui.telem.map.title': 'Channel mapping (edit & confirm definitions)',
    'ui.telem.map.col': 'CSV column',
    'ui.telem.map.canonical': 'Canonical channel',
    'ui.telem.map.unit': 'Unit (raw → canonical)',
    'ui.telem.map.status': 'Definition status',
    'ui.telem.map.confirm': 'Confirm',
    'ui.telem.map.unmapped': '(unmapped)',
    'ui.telem.pf.title': 'Preflight (fail-closed)',
    'ui.telem.pf.grade': 'Overall',
    'ui.telem.cap.title': 'Available analyses',
    'ui.telem.plot.title': 'Curves',
    'ui.telem.plot.canonical': 'Convert to canonical units',
    'ui.telem.plot.raw': 'Raw units',
    'ui.telem.plot.empty': 'Select one or more channels above to plot.',
    'ui.telem.plot.note': 'Display is downsampled (peaks preserved); a selection still maps to full original rows.',
    'ui.telem.plot.at': 'at',
    'ui.telem.plot.selection': 'Selection',
    'ui.telem.plot.clear': 'Clear',
    'ui.telem.plot.hint2': 'Hover to read values · click to pin · drag to select a range',
    // — grade / definition status —
    'ui.telem.grade.definition_confirmed': 'Definition confirmed', 'ui.telem.grade.provisional': 'Provisional', 'ui.telem.grade.blocked': 'Blocked', 'ui.telem.grade.unknown': 'Unknown',
    // — mapping match type —
    'ui.telem.match.exact': 'exact', 'ui.telem.match.alias': 'alias', 'ui.telem.match.ambiguous': 'ambiguous',
    // — cursor readout + selection summary headers —
    'ui.telem.plot.row': 'row', 'ui.telem.sum.ch': 'ch', 'ui.telem.sum.min': 'min', 'ui.telem.sum.max': 'max', 'ui.telem.sum.mean': 'mean', 'ui.telem.sum.n': 'n',
    // — vehicle profiles —
    'ui.telem.profile.custom': 'Custom (no vehicle assumptions)', 'ui.telem.profile.f312_research': 'Dallara F312 (research profile)',
    // — available-analysis labels —
    'ui.telem.cap.synchronizedCurves': 'Synchronized curves', 'ui.telem.cap.observedYawResponse': 'Observed yaw-response distribution', 'ui.telem.cap.measuredKus': 'Official understeer gradient (K_us)', 'ui.telem.cap.bodyRollGradient': 'Body-roll gradient', 'ui.telem.cap.setupRecommendation': 'Setup recommendation',
    // — capability blocked / unavailable reasons —
    'ui.telem.cap.reason.kus': 'BLOCKED — not identifiable from this telemetry', 'ui.telem.cap.reason.roll': 'BLOCKED — damper sign/zero/motion-ratio scale chain not closed', 'ui.telem.cap.reason.setup': 'BLOCKED', 'ui.telem.cap.reason.timebaseBlocked': 'unavailable — timebase blocked', 'ui.telem.cap.reason.channelsMissing': 'unavailable — required channels not present',
    // — parser + preflight diagnostics ({…} = interpolated params) —
    'ui.telem.diag.EMPTY': 'empty input', 'ui.telem.diag.NO_ROWS': 'no data rows', 'ui.telem.diag.CSV_UNCLOSED_QUOTE': 'unterminated quoted field — file truncated at a stray quote; not a usable dataset', 'ui.telem.diag.BLANK_ROWS': '{count} blank row(s) skipped', 'ui.telem.diag.RAGGED_ROWS': '{count} row(s) had a column-count mismatch (→{expected} cols)', 'ui.telem.diag.DUP_HEADER': 'duplicate header "{name}"', 'ui.telem.diag.TB_NO_TIME': 'no time column — assuming rows are ordered co-samples', 'ui.telem.diag.TB_RESET': '{n} global timestamp reset(s) — synchronization blocked', 'ui.telem.diag.TB_DUP': '{n} duplicate timestamp(s)', 'ui.telem.diag.TB_GAP': '{n} large gap(s)', 'ui.telem.diag.TB_LAP_RESET': '{n} lap-timer reset(s) on "{name}" (normal — not a sync blocker)', 'ui.telem.diag.REQ_UNIT_UNSUPPORTED': '{req} unit "{unit}" not recognised', 'ui.telem.diag.REQ_UNIT_MISSING': '{req} unit not declared (no [unit] in header)', 'ui.telem.diag.REQ_NOT_CONFIRMED': '{req} mapping "{rawName}→{req}" not user-confirmed ({matchType})', 'ui.telem.diag.CH_AMBIGUOUS': 'channel "{rawName}" is ambiguous ({candidates}) — left unmapped', 'ui.telem.diag.WARNING': 'warning', 'ui.telem.diag.ERROR': 'error',
    // — V2 observed yaw-response —
    'ui.telem.yaw.title': 'Observed yaw-response', 'ui.telem.yaw.subtitle': 'Descriptive only · raw steering (not road-wheel) · no model, no K_us',
    'ui.telem.yaw.na': 'Not available', 'ui.telem.yaw.reason.unavailable': 'module unavailable', 'ui.telem.yaw.reason.channels_missing': 'needs yaw rate + steering + speed + lateral-accel channels', 'ui.telem.yaw.reason.insufficient_samples': 'not enough samples', 'ui.telem.yaw.reason.insufficient_valid': 'not enough valid samples', 'ui.telem.yaw.reason.insufficient_steady_state': 'not enough steady-state samples after filtering', 'ui.telem.yaw.reason.insufficient_steering': 'almost all steady samples are near centre — not enough actual steering',
    'ui.telem.yaw.strictness': 'Steadiness', 'ui.telem.yaw.strict.loose': 'Loose', 'ui.telem.yaw.strict.normal': 'Normal', 'ui.telem.yaw.strict.strict': 'Strict',
    'ui.telem.yaw.samples': 'Samples', 'ui.telem.yaw.total': 'total', 'ui.telem.yaw.valid': 'valid', 'ui.telem.yaw.steady': 'steady-state', 'ui.telem.yaw.passRate': 'pass rate',
    'ui.telem.yaw.excluded': 'Excluded', 'ui.telem.yaw.ex.invalid': 'invalid', 'ui.telem.yaw.ex.lowSpeed': 'low speed', 'ui.telem.yaw.ex.lowActivity': 'low lateral-g', 'ui.telem.yaw.ex.unsteadySteering': 'unsteady steering', 'ui.telem.yaw.ex.unsteadySpeed': 'unsteady speed', 'ui.telem.yaw.ex.shortSegment': 'short segment',
    'ui.telem.yaw.filters': 'Filters (data-adaptive)', 'ui.telem.yaw.th.lateralActivity': 'min |lateral g|', 'ui.telem.yaw.th.steeringRateMax': 'max |d steer/dt|', 'ui.telem.yaw.th.speedRateMax': 'max |d speed/dt|', 'ui.telem.yaw.th.speedFloor': 'min speed',
    'ui.telem.yaw.dispersion': 'Yaw rate per raw steering', 'ui.telem.yaw.median': 'median', 'ui.telem.yaw.iqr': 'IQR', 'ui.telem.yaw.mad': 'MAD', 'ui.telem.yaw.cv': 'CV', 'ui.telem.yaw.n': 'n',
    'ui.telem.yaw.cv.too_few': 'n/a (too few)', 'ui.telem.yaw.cv.mean_near_zero': 'n/a (mean≈0)', 'ui.telem.yaw.cv.sign_inconsistent': 'n/a (sign mixed)',
    'ui.telem.yaw.bins': 'Per speed bin', 'ui.telem.yaw.bin.speed': 'speed', 'ui.telem.yaw.bin.medYaw': 'med yaw', 'ui.telem.yaw.bin.medSteer': 'med steer', 'ui.telem.yaw.bin.medRatio': 'med yaw/steer',
    'ui.telem.yaw.dir.combined': 'Combined', 'ui.telem.yaw.dir.positive': 'Positive steering', 'ui.telem.yaw.dir.negative': 'Negative steering', 'ui.telem.yaw.dir.neutral': 'Near-centre (excluded)', 'ui.telem.yaw.dir.fewSide': 'too few for this side', 'ui.telem.yaw.bin.dir': 'direction', 'ui.telem.yaw.th.minAbsSteer': 'min |steering|', 'ui.telem.yaw.dirNote': 'Split by raw steering sign — positive/negative, not assumed left/right (source sign convention unknown).',
    'ui.telem.yaw.scatter': 'Yaw rate vs raw steering (steady-state, coloured by speed)', 'ui.telem.yaw.note': 'Descriptive filter settings, not vehicle identification criteria. Steering is raw — no road-wheel conversion, no model comparison.',
  },
  zh: {
    'tab.telemetry': '遙測',
    'ui.telem.title': '遙測 CSV 證據檢視',
    'ui.telem.hint': '匯入遙測 CSV（執行時載入你自己的檔，不上傳、不保存）。通道會自動對映，但在你逐一確認定義前一律為 PROVISIONAL。可用分析採 fail-closed。',
    'ui.telem.profile': '車輛 profile',
    'ui.telem.unload': '卸載',
    'ui.telem.rows': '列',
    'ui.telem.cols': '欄',
    'ui.telem.map.title': '通道對映（編輯並確認定義）',
    'ui.telem.map.col': 'CSV 欄',
    'ui.telem.map.canonical': '標準通道',
    'ui.telem.map.unit': '單位（原始 → 標準）',
    'ui.telem.map.status': '定義狀態',
    'ui.telem.map.confirm': '確認',
    'ui.telem.map.unmapped': '（未對映）',
    'ui.telem.pf.title': 'Preflight（fail-closed）',
    'ui.telem.pf.grade': '整體',
    'ui.telem.cap.title': '可用分析',
    'ui.telem.plot.title': '曲線',
    'ui.telem.plot.canonical': '換算為標準單位',
    'ui.telem.plot.raw': '原始單位',
    'ui.telem.plot.empty': '點選上方一個以上的通道以繪製曲線。',
    'ui.telem.plot.note': '顯示為降採樣（保留尖峰）；選取區段仍對應到完整的原始列。',
    'ui.telem.plot.at': '於',
    'ui.telem.plot.selection': '選取區段',
    'ui.telem.plot.clear': '清除',
    'ui.telem.plot.hint2': '游標移動讀值 · 點擊固定 · 拖曳選取區段',
    // — grade / definition status —
    'ui.telem.grade.definition_confirmed': '定義已確認', 'ui.telem.grade.provisional': '暫定', 'ui.telem.grade.blocked': '已封鎖', 'ui.telem.grade.unknown': '未知',
    // — mapping match type —
    'ui.telem.match.exact': '精確', 'ui.telem.match.alias': '別名', 'ui.telem.match.ambiguous': '模糊',
    // — cursor readout + selection summary headers —
    'ui.telem.plot.row': '列', 'ui.telem.sum.ch': '通道', 'ui.telem.sum.min': '最小', 'ui.telem.sum.max': '最大', 'ui.telem.sum.mean': '平均', 'ui.telem.sum.n': '筆數',
    // — vehicle profiles —
    'ui.telem.profile.custom': '自訂（無車輛假設）', 'ui.telem.profile.f312_research': 'Dallara F312（研究用 profile）',
    // — available-analysis labels —
    'ui.telem.cap.synchronizedCurves': '同步曲線', 'ui.telem.cap.observedYawResponse': '觀測 yaw 響應分佈', 'ui.telem.cap.measuredKus': '官方轉向不足梯度 (K_us)', 'ui.telem.cap.bodyRollGradient': '車身側傾梯度', 'ui.telem.cap.setupRecommendation': '設定建議',
    // — capability blocked / unavailable reasons —
    'ui.telem.cap.reason.kus': '已封鎖 — 無法從此遙測識別', 'ui.telem.cap.reason.roll': '已封鎖 — 阻尼器 正負號/零點/motion-ratio 比例鏈未閉合', 'ui.telem.cap.reason.setup': '已封鎖', 'ui.telem.cap.reason.timebaseBlocked': '不可用 — 時間基準已封鎖', 'ui.telem.cap.reason.channelsMissing': '不可用 — 缺少必要通道',
    // — parser + preflight diagnostics ({…} = 代入參數) —
    'ui.telem.diag.EMPTY': '空白輸入', 'ui.telem.diag.NO_ROWS': '無資料列', 'ui.telem.diag.CSV_UNCLOSED_QUOTE': '引號未閉合 — 檔案於多餘引號處截斷，非可用資料', 'ui.telem.diag.BLANK_ROWS': '已略過 {count} 列空白列', 'ui.telem.diag.RAGGED_ROWS': '{count} 列欄數不符（已對齊至 {expected} 欄）', 'ui.telem.diag.DUP_HEADER': '重複表頭「{name}」', 'ui.telem.diag.TB_NO_TIME': '無時間欄 — 假設各列為依序同步取樣', 'ui.telem.diag.TB_RESET': '{n} 次全域時間戳重置 — 同步已封鎖', 'ui.telem.diag.TB_DUP': '{n} 個重複時間戳', 'ui.telem.diag.TB_GAP': '{n} 處大間隙', 'ui.telem.diag.TB_LAP_RESET': '「{name}」上 {n} 次單圈計時重置（正常 — 非同步阻礙）', 'ui.telem.diag.REQ_UNIT_UNSUPPORTED': '{req} 單位「{unit}」無法辨識', 'ui.telem.diag.REQ_UNIT_MISSING': '{req} 未宣告單位（表頭無 [unit]）', 'ui.telem.diag.REQ_NOT_CONFIRMED': '{req} 對映「{rawName}→{req}」未經使用者確認（{matchType}）', 'ui.telem.diag.CH_AMBIGUOUS': '通道「{rawName}」不明確（{candidates}）— 未對映', 'ui.telem.diag.WARNING': '警告', 'ui.telem.diag.ERROR': '錯誤',
    // — V2 觀測 yaw 響應 —
    'ui.telem.yaw.title': '觀測 yaw 響應', 'ui.telem.yaw.subtitle': '純描述 · 原始轉向角（非路輪角）· 無模型、無 K_us',
    'ui.telem.yaw.na': '不可用', 'ui.telem.yaw.reason.unavailable': '模組不可用', 'ui.telem.yaw.reason.channels_missing': '需要 yaw rate + 轉向 + 速度 + 側向加速度 通道', 'ui.telem.yaw.reason.insufficient_samples': '樣本不足', 'ui.telem.yaw.reason.insufficient_valid': '有效樣本不足', 'ui.telem.yaw.reason.insufficient_steady_state': '篩選後穩態樣本不足', 'ui.telem.yaw.reason.insufficient_steering': '幾乎所有穩態樣本都接近中心 — 實際轉向不足',
    'ui.telem.yaw.strictness': '穩定度', 'ui.telem.yaw.strict.loose': '寬鬆', 'ui.telem.yaw.strict.normal': '正常', 'ui.telem.yaw.strict.strict': '嚴格',
    'ui.telem.yaw.samples': '樣本', 'ui.telem.yaw.total': '總計', 'ui.telem.yaw.valid': '有效', 'ui.telem.yaw.steady': '穩態', 'ui.telem.yaw.passRate': '通過率',
    'ui.telem.yaw.excluded': '排除', 'ui.telem.yaw.ex.invalid': '無效', 'ui.telem.yaw.ex.lowSpeed': '低速', 'ui.telem.yaw.ex.lowActivity': '低側向 g', 'ui.telem.yaw.ex.unsteadySteering': '轉向不穩', 'ui.telem.yaw.ex.unsteadySpeed': '速度不穩', 'ui.telem.yaw.ex.shortSegment': '段太短',
    'ui.telem.yaw.filters': '篩選門檻（資料自適應）', 'ui.telem.yaw.th.lateralActivity': '最小 |側向 g|', 'ui.telem.yaw.th.steeringRateMax': '最大 |d 轉向/dt|', 'ui.telem.yaw.th.speedRateMax': '最大 |d 速度/dt|', 'ui.telem.yaw.th.speedFloor': '最小速度',
    'ui.telem.yaw.dispersion': '每單位原始轉向的 yaw rate', 'ui.telem.yaw.median': '中位數', 'ui.telem.yaw.iqr': 'IQR', 'ui.telem.yaw.mad': 'MAD', 'ui.telem.yaw.cv': 'CV', 'ui.telem.yaw.n': 'n',
    'ui.telem.yaw.cv.too_few': '不適用（樣本太少）', 'ui.telem.yaw.cv.mean_near_zero': '不適用（均值≈0）', 'ui.telem.yaw.cv.sign_inconsistent': '不適用（正負混雜）',
    'ui.telem.yaw.bins': '各速度分箱', 'ui.telem.yaw.bin.speed': '速度', 'ui.telem.yaw.bin.medYaw': 'yaw 中位', 'ui.telem.yaw.bin.medSteer': '轉向中位', 'ui.telem.yaw.bin.medRatio': 'yaw/轉向 中位',
    'ui.telem.yaw.dir.combined': '合計', 'ui.telem.yaw.dir.positive': '正向轉向', 'ui.telem.yaw.dir.negative': '負向轉向', 'ui.telem.yaw.dir.neutral': '接近中心（排除）', 'ui.telem.yaw.dir.fewSide': '此側樣本不足', 'ui.telem.yaw.bin.dir': '方向', 'ui.telem.yaw.th.minAbsSteer': '最小 |轉向|', 'ui.telem.yaw.dirNote': '依原始轉向正負號分組——正/負，不假設為左/右（資料來源正負定義未知）。',
    'ui.telem.yaw.scatter': 'yaw rate vs 原始轉向（穩態、依速度著色）', 'ui.telem.yaw.note': '此為描述性篩選設定，非車輛識別判準。轉向為原始值——不做路輪角換算、不與模型比較。',
  },
  ja: {
    'tab.telemetry': 'テレメトリー',
    'ui.telem.title': 'テレメトリー CSV エビデンス',
    'ui.telem.hint': 'テレメトリー CSV をインポート（実行時に自分のファイルを読み込み、アップロード・保存はしません）。チャンネルは自動マッピングされますが、定義を確認するまで PROVISIONAL のままです。解析は fail-closed です。',
    'ui.telem.profile': '車両プロファイル',
    'ui.telem.unload': 'アンロード',
    'ui.telem.rows': '行',
    'ui.telem.cols': '列',
    'ui.telem.map.title': 'チャンネルマッピング（定義を編集・確認）',
    'ui.telem.map.col': 'CSV 列',
    'ui.telem.map.canonical': '正準チャンネル',
    'ui.telem.map.unit': '単位（生 → 正準）',
    'ui.telem.map.status': '定義ステータス',
    'ui.telem.map.confirm': '確認',
    'ui.telem.map.unmapped': '（未マッピング）',
    'ui.telem.pf.title': 'プリフライト（fail-closed）',
    'ui.telem.pf.grade': '総合',
    'ui.telem.cap.title': '利用可能な解析',
    'ui.telem.plot.title': 'カーブ',
    'ui.telem.plot.canonical': '正準単位に変換',
    'ui.telem.plot.raw': '生単位',
    'ui.telem.plot.empty': '上のチャンネルを1つ以上選択してください。',
    'ui.telem.plot.note': '表示はダウンサンプリング（ピーク保持）。選択範囲は元の全行に対応します。',
    'ui.telem.plot.at': '位置',
    'ui.telem.plot.selection': '選択範囲',
    'ui.telem.plot.clear': 'クリア',
    'ui.telem.plot.hint2': 'ホバーで値表示 · クリックで固定 · ドラッグで範囲選択',
    // — grade / definition status —
    'ui.telem.grade.definition_confirmed': '定義確認済み', 'ui.telem.grade.provisional': '暫定', 'ui.telem.grade.blocked': 'ブロック', 'ui.telem.grade.unknown': '不明',
    // — mapping match type —
    'ui.telem.match.exact': '完全一致', 'ui.telem.match.alias': 'エイリアス', 'ui.telem.match.ambiguous': '曖昧',
    // — cursor readout + selection summary headers —
    'ui.telem.plot.row': '行', 'ui.telem.sum.ch': 'ch', 'ui.telem.sum.min': '最小', 'ui.telem.sum.max': '最大', 'ui.telem.sum.mean': '平均', 'ui.telem.sum.n': '件数',
    // — vehicle profiles —
    'ui.telem.profile.custom': 'カスタム（車両前提なし）', 'ui.telem.profile.f312_research': 'Dallara F312（リサーチプロファイル）',
    // — available-analysis labels —
    'ui.telem.cap.synchronizedCurves': '同期カーブ', 'ui.telem.cap.observedYawResponse': '観測ヨー応答分布', 'ui.telem.cap.measuredKus': '公式アンダーステア勾配 (K_us)', 'ui.telem.cap.bodyRollGradient': 'ロール勾配', 'ui.telem.cap.setupRecommendation': 'セットアップ推奨',
    // — capability blocked / unavailable reasons —
    'ui.telem.cap.reason.kus': 'ブロック — このテレメトリーからは識別不可', 'ui.telem.cap.reason.roll': 'ブロック — ダンパーの符号/ゼロ点/モーションレシオのスケール連鎖が未確定', 'ui.telem.cap.reason.setup': 'ブロック', 'ui.telem.cap.reason.timebaseBlocked': '利用不可 — タイムベースがブロック', 'ui.telem.cap.reason.channelsMissing': '利用不可 — 必要なチャンネルがありません',
    // — parser + preflight diagnostics ({…} = 埋め込みパラメータ) —
    'ui.telem.diag.EMPTY': '空の入力', 'ui.telem.diag.NO_ROWS': 'データ行がありません', 'ui.telem.diag.CSV_UNCLOSED_QUOTE': '引用符が閉じていません — 不要な引用符で途切れており、使用できません', 'ui.telem.diag.BLANK_ROWS': '{count} 件の空行をスキップ', 'ui.telem.diag.RAGGED_ROWS': '{count} 行で列数不一致（{expected} 列に調整）', 'ui.telem.diag.DUP_HEADER': '重複ヘッダー「{name}」', 'ui.telem.diag.TB_NO_TIME': '時間列なし — 行は順序付き同時サンプルと仮定', 'ui.telem.diag.TB_RESET': 'グローバルタイムスタンプのリセット {n} 件 — 同期ブロック', 'ui.telem.diag.TB_DUP': '重複タイムスタンプ {n} 件', 'ui.telem.diag.TB_GAP': '大きなギャップ {n} 件', 'ui.telem.diag.TB_LAP_RESET': '「{name}」でラップタイマーリセット {n} 件（正常 — 同期阻害ではない）', 'ui.telem.diag.REQ_UNIT_UNSUPPORTED': '{req} の単位「{unit}」を認識できません', 'ui.telem.diag.REQ_UNIT_MISSING': '{req} の単位が未宣言（ヘッダーに [unit] なし）', 'ui.telem.diag.REQ_NOT_CONFIRMED': '{req} マッピング「{rawName}→{req}」はユーザー未確認（{matchType}）', 'ui.telem.diag.CH_AMBIGUOUS': 'チャンネル「{rawName}」が曖昧（{candidates}）— 未マッピング', 'ui.telem.diag.WARNING': '警告', 'ui.telem.diag.ERROR': 'エラー',
    // — V2 観測ヨー応答 —
    'ui.telem.yaw.title': '観測ヨー応答', 'ui.telem.yaw.subtitle': '記述のみ · 生のステア角（路面車輪角ではない）· モデルなし・K_us なし',
    'ui.telem.yaw.na': '利用不可', 'ui.telem.yaw.reason.unavailable': 'モジュール利用不可', 'ui.telem.yaw.reason.channels_missing': 'ヨーレート + ステア + 速度 + 横加速度 チャンネルが必要', 'ui.telem.yaw.reason.insufficient_samples': 'サンプル不足', 'ui.telem.yaw.reason.insufficient_valid': '有効サンプル不足', 'ui.telem.yaw.reason.insufficient_steady_state': 'フィルタ後の定常サンプル不足', 'ui.telem.yaw.reason.insufficient_steering': '定常サンプルのほぼ全てが中央付近 — 実際のステアリング不足',
    'ui.telem.yaw.strictness': '定常度', 'ui.telem.yaw.strict.loose': '緩い', 'ui.telem.yaw.strict.normal': '標準', 'ui.telem.yaw.strict.strict': '厳格',
    'ui.telem.yaw.samples': 'サンプル', 'ui.telem.yaw.total': '合計', 'ui.telem.yaw.valid': '有効', 'ui.telem.yaw.steady': '定常', 'ui.telem.yaw.passRate': '通過率',
    'ui.telem.yaw.excluded': '除外', 'ui.telem.yaw.ex.invalid': '無効', 'ui.telem.yaw.ex.lowSpeed': '低速', 'ui.telem.yaw.ex.lowActivity': '低横G', 'ui.telem.yaw.ex.unsteadySteering': 'ステア不安定', 'ui.telem.yaw.ex.unsteadySpeed': '速度不安定', 'ui.telem.yaw.ex.shortSegment': 'セグメント短',
    'ui.telem.yaw.filters': 'フィルタ（データ適応）', 'ui.telem.yaw.th.lateralActivity': '最小 |横G|', 'ui.telem.yaw.th.steeringRateMax': '最大 |d ステア/dt|', 'ui.telem.yaw.th.speedRateMax': '最大 |d 速度/dt|', 'ui.telem.yaw.th.speedFloor': '最小速度',
    'ui.telem.yaw.dispersion': '生ステア単位あたりのヨーレート', 'ui.telem.yaw.median': '中央値', 'ui.telem.yaw.iqr': 'IQR', 'ui.telem.yaw.mad': 'MAD', 'ui.telem.yaw.cv': 'CV', 'ui.telem.yaw.n': 'n',
    'ui.telem.yaw.cv.too_few': '該当なし（少なすぎ）', 'ui.telem.yaw.cv.mean_near_zero': '該当なし（平均≈0）', 'ui.telem.yaw.cv.sign_inconsistent': '該当なし（符号混在）',
    'ui.telem.yaw.bins': '速度ビン別', 'ui.telem.yaw.bin.speed': '速度', 'ui.telem.yaw.bin.medYaw': 'ヨー中央', 'ui.telem.yaw.bin.medSteer': 'ステア中央', 'ui.telem.yaw.bin.medRatio': 'ヨー/ステア 中央',
    'ui.telem.yaw.dir.combined': '合計', 'ui.telem.yaw.dir.positive': '正方向ステア', 'ui.telem.yaw.dir.negative': '負方向ステア', 'ui.telem.yaw.dir.neutral': '中央付近（除外）', 'ui.telem.yaw.dir.fewSide': 'この側はサンプル不足', 'ui.telem.yaw.bin.dir': '方向', 'ui.telem.yaw.th.minAbsSteer': '最小 |ステア|', 'ui.telem.yaw.dirNote': '生のステア符号で分類——正/負、左右とは仮定しない（ソースの符号定義は不明）。',
    'ui.telem.yaw.scatter': 'ヨーレート vs 生ステア（定常・速度で色分け）', 'ui.telem.yaw.note': 'これは記述的なフィルタ設定であり、車両同定基準ではありません。ステアは生値——路面車輪角換算なし、モデル比較なし。',
  },
};
if (typeof I18N !== 'undefined') {
  Object.assign(I18N.en, CSV_I18N.en);
  Object.assign(I18N.zh, CSV_I18N.zh);
  Object.assign(I18N.ja, CSV_I18N.ja);
}
if (typeof module !== 'undefined' && module.exports) module.exports = { CSV_I18N };
