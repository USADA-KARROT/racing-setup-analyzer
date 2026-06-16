/**
 * i18n — Setup Advisor 引擎訊息字典 (English primary / 繁體中文 / 日本語)
 * SetupAdvisor.analyze(...) 在計算時用注入的 translator 取這些 key 組出本地化建議。
 * {placeholder} 由 analyze() 內的 fmt() 以實際數值替換。
 * 載入順序：在 i18n.js 之後、app script 之前。
 */
const ADV_I18N = {
  en: {
    // categories
    'adv.cat.spring': 'Spring', 'adv.cat.arb': 'ARB', 'adv.cat.geometry': 'Geometry',
    'adv.cat.damper': 'Damper', 'adv.cat.tire': 'Tire', 'adv.cat.aero': 'Aero',
    'adv.cat.weight': 'Weight', 'adv.cat.balance': 'Balance',
    // delta-vs-baseline tendency
    'dtnd.more_understeer': 'More understeer than baseline', 'dtnd.more_oversteer': 'More oversteer than baseline', 'dtnd.similar': 'Similar to baseline',
    // fragments
    'adv.frag.front': 'Front', 'adv.frag.rear': 'Rear',
    'adv.frag.severeUnderdamped': 'severely underdamped', 'adv.frag.underdamped': 'underdamped',
    'adv.frag.listSep': ', ',
    'adv.corner.fl': 'FL', 'adv.corner.fr': 'FR', 'adv.corner.rl': 'RL', 'adv.corner.rr': 'RR',
    // Rule 1
    'adv.r1.msg': 'Rear/front ride-frequency ratio {ratio} (front {front} Hz / rear {rear} Hz) is outside the usual range. Comfort-biased (Olley flat ride) wants the rear 10–20% higher than the front (ratio 1.10–1.20); track / aero-platform setups often run the front higher (0.90–1.00).',
    'adv.r1.sug': 'For a flat ride, a rear spring rate of about {spring} N/mm (currently {cur} N/mm) reaches a ratio of {ratio}.',
    // Rule 2
    'adv.r2.msg': '{axle} ride frequency {hz} Hz is low; track use wants 2.0–3.5 Hz.',
    'adv.r2.sug': 'Raise the {axle} spring rate to increase frequency. Use the Spring Calculator to size it precisely.',
    // Rule 3
    'adv.r3.msg': '{axle} ride frequency {hz} Hz is high (> 4.0 Hz), which may hurt mechanical grip.',
    'adv.r3.sug': 'Consider a softer {axle} spring or a softer tire.',
    // Rule 4
    'adv.r4.msg': 'LLTD {lltd}% vs weight distribution {wpct}%, a {diff}% gap — a clear {dir} tendency.',
    'adv.r4.fixUnder': 'Soften the front ARB or stiffen the rear ARB.',
    'adv.r4.fixOver': 'Stiffen the front ARB or soften the rear ARB.',
    // Rule 5
    'adv.r5.msg': 'Roll gradient {rg}°/g is high; track use wants < 2.0°/g.',
    'adv.r5.sug': 'Stiffer ARBs or higher spring rates reduce roll.',
    // Rule 6
    'adv.r6.msg': 'Geometric load transfer is {pct}% of the total (a relatively high roll center).',
    'adv.r6.sug': 'Faster transient response, but less spring/ARB adjustability. For more tuning range, consider lowering the roll center.',
    // Rule 7
    'adv.r7.msg': '{axle} damping ratio {ratio} ({sev}); the body rebounds too much.',
    'adv.r7.sug': 'Raise the {axle} average damper force (@{refV} m/s) to ~{kgf} kgf (target ζ={zeta}).',
    'adv.r7.sugNoData': 'Increasing the {axle} damper force helps (no effective wheel-rate data, so a specific target can\'t be computed).',
    // Rule 8
    'adv.r8.msg': 'Front/rear damping-ratio gap {diff} (front {f} / rear {r}) may cause pitch oscillation.',
    'adv.r8.sug': 'Keep the front/rear damping-ratio gap within 0.25.',
    // Rule 9
    'adv.r9.msg': 'Front/rear grip ratio {gr}; the {weak} axle is relatively grip-limited.',
    'adv.r9.sug': 'Adjust the {weak} tire pressure (off-optimum loses grip) or change compound.',
    // Rule 10
    'adv.r10.msg': '{corner} grip is only {pct}%; the tire may be outside its temperature or pressure window.',
    'adv.r10.sug': 'Check that tire temp and pressure are in this tire\'s optimal range.',
    // Rule 11
    'adv.r11.msg': 'Aero balance {aero}% vs weight distribution {wpct}%, a {diff}% gap.',
    'adv.r11.sug': 'Handling at speed will differ from low speed. Adjust front/rear downforce coefficients to improve it.',
    // Rule 12
    'adv.r12.msg': 'Cross weight deviates {dev}% ({pct}%); the car is left/right asymmetric.',
    'adv.r12.sug': 'Adjust corner weights (shims, spring preload) to bring cross weight toward 50%.',
    // Rule 13
    'adv.r13.detFront': 'front camber {fc}° is off the suggested −3.0°',
    'adv.r13.detRear': 'rear camber {rc}° is off the suggested −2.0°',
    'adv.r13.msg': 'Camber is off the track-recommended values: {details}.',
    'adv.r13.sug': 'Track use suggests front −2.5° to −3.5°, rear −1.5° to −2.5°.',
    // Rule 14 (tier 3)
    'adv.r14.msg': 'The car shows oversteer (US gradient = {usg}).',
    'adv.r14.sugCritPre': 'The linear model estimates a critical speed around {kmh} km/h, beyond which yaw gain diverges. ',
    'adv.r14.sugNoCritPre': 'Yaw gain keeps rising at speed and needs driver correction. ',
    'adv.r14.sugSuffix': 'Adding front load transfer (front ARB, front spring) helps.',
    // Rule 14 (tier < 3)
    'adv.r14b.msg': 'The car shows clear oversteer (US gradient = {usg} deg/g).',
    'adv.r14b.sug': 'Stiffer front ARB or front spring adds front load transfer and improves balance.',
  },
  zh: {
    'adv.cat.spring': '彈簧', 'adv.cat.arb': '防傾桿', 'adv.cat.geometry': '幾何',
    'adv.cat.damper': '阻尼', 'adv.cat.tire': '輪胎', 'adv.cat.aero': '空力',
    'adv.cat.weight': '重量', 'adv.cat.balance': '平衡',
    'dtnd.more_understeer': '比基準更轉向不足', 'dtnd.more_oversteer': '比基準更轉向過度', 'dtnd.similar': '與基準相近',
    'adv.frag.front': '前', 'adv.frag.rear': '後',
    'adv.frag.severeUnderdamped': '嚴重欠阻尼', 'adv.frag.underdamped': '欠阻尼',
    'adv.frag.listSep': '、',
    'adv.corner.fl': '左前', 'adv.corner.fr': '右前', 'adv.corner.rl': '左後', 'adv.corner.rr': '右後',
    'adv.r1.msg': '後/前 Ride Frequency 比值 {ratio}（前 {front} Hz / 後 {rear} Hz）偏離常見範圍。舒適取向（Olley Flat Ride）建議後軸比前軸高 10-20%（比值 1.10-1.20）；賽道/空力平台取向常用前高後低（0.90-1.00）',
    'adv.r1.sug': '若以 Flat Ride 為目標，後彈簧率約 {spring} N/mm（目前 {cur} N/mm）可達到比值 {ratio}',
    'adv.r2.msg': '{axle}軸 Ride Frequency {hz} Hz 偏低，賽道使用建議 2.0-3.5 Hz',
    'adv.r2.sug': '提高{axle}彈簧率可增加頻率。使用「彈簧計算器」可精確計算所需彈簧率',
    'adv.r3.msg': '{axle}軸 Ride Frequency {hz} Hz 偏高（> 4.0 Hz），可能影響機械抓地力',
    'adv.r3.sug': '考慮降低{axle}彈簧率或使用較軟的輪胎',
    'adv.r4.msg': 'LLTD {lltd}% vs 重量分佈 {wpct}%，差距 {diff}% — {dir}傾向明顯',
    'adv.r4.fixUnder': '降低前 ARB 或增加後 ARB 剛性',
    'adv.r4.fixOver': '增加前 ARB 或降低後 ARB 剛性',
    'adv.r5.msg': 'Roll Gradient {rg}°/g 偏大，賽道建議 < 2.0°/g',
    'adv.r5.sug': '增加 ARB 剛性或提高彈簧率可減小側傾',
    'adv.r6.msg': '幾何荷重轉移佔總荷重轉移的 {pct}%（Roll Center 較高）',
    'adv.r6.sug': '過渡反應較快但彈簧/ARB 可調範圍較小。如需更大調整空間，可考慮降低 Roll Center 高度',
    'adv.r7.msg': '{axle}軸阻尼比 {ratio}（{sev}），車身回彈過多',
    'adv.r7.sug': '建議{axle}軸平均阻尼力（@{refV} m/s）增加到 ~{kgf} kgf（目標 ζ={zeta}）',
    'adv.r7.sugNoData': '提高{axle}軸阻尼力可改善（缺少有效輪率資料，無法計算具體目標值）',
    'adv.r8.msg': '前後阻尼比差距 {diff}（前 {f} / 後 {r}），可能造成 pitch 振盪',
    'adv.r8.sug': '建議前後阻尼比保持在 0.25 以內的差距',
    'adv.r9.msg': '前後抓地力比 {gr}，{weak}軸抓地力相對不足',
    'adv.r9.sug': '調整{weak}軸胎壓（偏離最佳值會降低抓地力）或更換胎種',
    'adv.r10.msg': '{corner} 抓地力僅 {pct}%，輪胎可能不在工作溫度或壓力範圍',
    'adv.r10.sug': '確認胎溫和胎壓是否在該輪胎的最佳區間',
    'adv.r11.msg': '空力平衡 {aero}% vs 重量分佈 {wpct}%，差距 {diff}%',
    'adv.r11.sug': '高速時轉向特性會與低速不同。調整前後下壓力係數可改善',
    'adv.r12.msg': 'Cross Weight 偏差 {dev}%（{pct}%），車輛左右不對稱',
    'adv.r12.sug': '調整角落重量（墊片、彈簧預載）使 Cross Weight 趨近 50%',
    'adv.r13.detFront': '前 Camber {fc}° 偏離建議值 -3.0°',
    'adv.r13.detRear': '後 Camber {rc}° 偏離建議值 -2.0°',
    'adv.r13.msg': 'Camber 設定偏離賽道建議值：{details}',
    'adv.r13.sug': '賽道使用建議前 -2.5°~-3.5°、後 -1.5°~-2.5°',
    'adv.r14.msg': '車輛呈現轉向過度特性（US gradient = {usg}）',
    'adv.r14.sugCritPre': '線性模型估算臨界速度約 {kmh} km/h，超過後轉向增益發散。',
    'adv.r14.sugNoCritPre': '高速時轉向增益持續上升，需要駕駛技術修正。',
    'adv.r14.sugSuffix': '增加前軸荷重轉移（前 ARB、前彈簧）可改善',
    'adv.r14b.msg': '車輛呈現明顯轉向過度特性（US gradient = {usg} deg/g）',
    'adv.r14b.sug': '增加前 ARB 或前彈簧率可增加前軸荷重轉移，改善平衡',
  },
  ja: {
    'adv.cat.spring': 'スプリング', 'adv.cat.arb': 'ARB', 'adv.cat.geometry': 'ジオメトリー',
    'adv.cat.damper': 'ダンパー', 'adv.cat.tire': 'タイヤ', 'adv.cat.aero': 'エアロ',
    'adv.cat.weight': '重量', 'adv.cat.balance': 'バランス',
    'dtnd.more_understeer': '基準よりアンダー寄り', 'dtnd.more_oversteer': '基準よりオーバー寄り', 'dtnd.similar': '基準とほぼ同じ',
    'adv.frag.front': 'フロント', 'adv.frag.rear': 'リア',
    'adv.frag.severeUnderdamped': '深刻な減衰不足', 'adv.frag.underdamped': '減衰不足',
    'adv.frag.listSep': '、',
    'adv.corner.fl': '左前', 'adv.corner.fr': '右前', 'adv.corner.rl': '左後', 'adv.corner.rr': '右後',
    'adv.r1.msg': 'リア/フロントのライドフリクエンシー比 {ratio}（フロント {front} Hz / リア {rear} Hz）が一般的な範囲から外れています。快適志向（Olley フラットライド）はリアをフロントより10〜20%高く（比 1.10〜1.20）、サーキット/エアロ志向はフロント高め（0.90〜1.00）が一般的です。',
    'adv.r1.sug': 'フラットライドを狙うなら、リアレート約 {spring} N/mm（現在 {cur} N/mm）で比 {ratio} に到達します。',
    'adv.r2.msg': '{axle}のライドフリクエンシー {hz} Hz は低めです。サーキット使用は 2.0〜3.5 Hz を推奨。',
    'adv.r2.sug': '{axle}のレートを上げると周波数が上がります。「スプリング計算機」で必要レートを正確に算出できます。',
    'adv.r3.msg': '{axle}のライドフリクエンシー {hz} Hz は高め（> 4.0 Hz）で、メカニカルグリップに影響する可能性があります。',
    'adv.r3.sug': '{axle}のレートを下げるか、より柔らかいタイヤを検討してください。',
    'adv.r4.msg': 'LLTD {lltd}% vs 重量配分 {wpct}%、差 {diff}% — {dir}傾向が明確です。',
    'adv.r4.fixUnder': 'フロントARBを緩めるか、リアARBを強める。',
    'adv.r4.fixOver': 'フロントARBを強めるか、リアARBを緩める。',
    'adv.r5.msg': 'ロール勾配 {rg}°/g は大きめです。サーキットは < 2.0°/g を推奨。',
    'adv.r5.sug': 'ARBを強めるかレートを上げるとロールが減ります。',
    'adv.r6.msg': '幾何的荷重移動が全体の {pct}%（ロールセンターが高め）。',
    'adv.r6.sug': '過渡応答は速いがスプリング/ARBの調整幅は小さめ。調整余地を増やすにはロールセンターを下げることを検討。',
    'adv.r7.msg': '{axle}の減衰比 {ratio}（{sev}）で、車体の戻りが過大です。',
    'adv.r7.sug': '{axle}の平均減衰力（@{refV} m/s）を ~{kgf} kgf に増やすことを推奨（目標 ζ={zeta}）。',
    'adv.r7.sugNoData': '{axle}の減衰力を上げると改善します（有効ホイールレートのデータがなく、具体的な目標値は算出不可）。',
    'adv.r8.msg': '前後の減衰比差 {diff}（フロント {f} / リア {r}）はピッチ振動を招く可能性があります。',
    'adv.r8.sug': '前後の減衰比差は 0.25 以内に保つことを推奨。',
    'adv.r9.msg': '前後グリップ比 {gr}、{weak}側のグリップが相対的に不足。',
    'adv.r9.sug': '{weak}側の空気圧を調整（最適から外れるとグリップ低下）するか、銘柄を変更。',
    'adv.r10.msg': '{corner}のグリップが {pct}% しかなく、タイヤが作動温度/空気圧の範囲外の可能性があります。',
    'adv.r10.sug': 'タイヤ温度と空気圧がそのタイヤの最適範囲にあるか確認してください。',
    'adv.r11.msg': 'エアロバランス {aero}% vs 重量配分 {wpct}%、差 {diff}%。',
    'adv.r11.sug': '高速時のハンドリングは低速と異なります。前後のダウンフォース係数を調整すると改善します。',
    'adv.r12.msg': 'クロスウェイトの偏差 {dev}%（{pct}%）で、左右非対称です。',
    'adv.r12.sug': 'コーナーウェイト（シム、プリロード）を調整し、クロスウェイトを 50% に近づけてください。',
    'adv.r13.detFront': 'フロントキャンバー {fc}° が推奨値 −3.0° から外れている',
    'adv.r13.detRear': 'リアキャンバー {rc}° が推奨値 −2.0° から外れている',
    'adv.r13.msg': 'キャンバーがサーキット推奨値から外れています：{details}。',
    'adv.r13.sug': 'サーキット使用は フロント −2.5°〜−3.5°、リア −1.5°〜−2.5° を推奨。',
    'adv.r14.msg': 'クルマはオーバーステア特性です（US gradient = {usg}）。',
    'adv.r14.sugCritPre': '線形モデルでは臨界速度は約 {kmh} km/h と推定され、超えるとヨーゲインが発散します。',
    'adv.r14.sugNoCritPre': '高速でヨーゲインが上昇し続け、ドライバーの修正が必要です。',
    'adv.r14.sugSuffix': '前軸の荷重移動（前ARB・前スプリング）を増やすと改善します。',
    'adv.r14b.msg': 'クルマは明確なオーバーステア特性です（US gradient = {usg} deg/g）。',
    'adv.r14b.sug': 'フロントARBまたはフロントレートを上げると前軸の荷重移動が増え、バランスが改善します。',
  },
};

if (typeof I18N !== 'undefined') {
  Object.assign(I18N.en, ADV_I18N.en);
  Object.assign(I18N.zh, ADV_I18N.zh);
  Object.assign(I18N.ja, ADV_I18N.ja);
}
if (typeof module !== 'undefined' && module.exports) module.exports = { ADV_I18N };
