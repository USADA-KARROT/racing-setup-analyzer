# Racing Setup Analyzer

**A vehicle-dynamics setup & lap-time tool that turns professional-grade chassis engineering into something you can actually play with.**

Predict understeer/oversteer balance, find your spring/ARB/damper numbers, and simulate a full tyre stint at Lihpao International Circuit — grounded in textbook vehicle dynamics (Milliken, Gillespie, OptimumG) and cross-checked against real-world engineering practice.

`🌐 Language:` **English** ｜ [繁體中文](#繁體中文) ｜ [日本語](#日本語)

---

## What it is

Most people learn the *formulas* of vehicle dynamics but never see how a professional team turns those formulas into decisions on track. This tool sits in that gap. You set up a car — springs, anti-roll bars, dampers, geometry, tyres, aero — and it tells you **which way the car will handle and why**, then predicts a **lap time** and how the tyres evolve over a stint.

It runs as an Electron desktop app or straight in a browser. No build step, no server — the physics runs locally in plain JavaScript.

## Features

- **3-tier handling balance prediction** — understeer gradient (deg/g) from a unified Milliken model that combines weight distribution, roll-stiffness distribution (LLTD) and tyre load sensitivity in one consistent calculation.
  - *Tier 1* — mechanical balance (springs, ARB, geometry, weight)
  - *Tier 2* — adds the tyre model (temperature / pressure / compound / width)
  - *Tier 3* — adds corner weights, aero, dampers, camber/toe, bump rubbers, plus a linear bicycle model (characteristic/critical speed, yaw gain)
- **Setup Advisor** — rule-based suggestions (ride frequency, LLTD vs weight, roll gradient, damping ratio, grip imbalance, cross weight, camber…) with concrete target values.
- **Spring & ARB Calculator** — ride-frequency ↔ spring-rate conversion (tyre-compliance aware), spring-rate tables, ARB sizing for a target roll gradient.
- **Tyre Analysis** — temperature/pressure grip curves and a **21-tyre track-day database** (Michelin, Yokohama, Bridgestone, Pirelli, Hankook, Federal, Nankang, Toyo… plus slicks) with optimal temps/pressures and peak-grip values.
- **Lihpao G2 Lap-Time Simulator** — a GG-diagram point-mass lap sim over the 3.500 km / 23-turn circuit, plus a **tyre stint model**: it predicts the **fastest lap, which lap the tyre-pressure sweet spot appears**, the peak-grip lap, recommended cold pressure, and a lap-by-lap evolution chart (temperature → pressure build-up → sweet spot → overheating/wear degradation).
- **501-car preset database** — load a car and its chassis baseline is filled in; tweak only what's adjustable.
- **Code as teaching material** — the source carries embedded "knowledge essays" (see `docs/fsae/`) written for FSAE / track-day engineers: intuition → physics → formula → which line of code → FSAE caveats.

## Physics basis & validation

The model is built on standard references — Milliken & Milliken *Race Car Vehicle Dynamics*, Gillespie *Fundamentals of Vehicle Dynamics*, OptimumG tech tips, Suspension Secrets — and cross-checked against real-world engineering practice: roll-stiffness and damping-ratio calculations, ride-height-based aero maps, and telemetry-derived workflows. Where the tool's formulas matched established engineering practice (e.g. critical damping `Cc = 2√(k·m)`, axle roll stiffness `k·t²/2`), that's noted; where they didn't, they were fixed. See [`docs/physics-notes.md`](docs/physics-notes.md).

> ⚠️ **Accuracy note.** Absolute lap times depend entirely on the inputs you give it (power, grip, aero, mass). Published circuit records are usually set by heavily-modified cars, so a stock-spec prediction being slower is correct, not a bug. The tool's strength is **relative** comparison (how a setup change moves the car) and the **tyre-stint sweet-spot** analysis. Methodology transfers across cars; absolute numbers do not — especially for FSAE, where you must fit your own tyre data.

## Quick start

```bash
# Desktop (Electron)
npm install
npm start

# Or just open it in a browser
open renderer/index.html        # macOS
# (no server needed — pure client-side JS)

# Run the physics regression tests (74 assertions)
npm test
```

## Project structure

```
renderer/
  index.html              UI (Alpine.js + Tailwind + Chart.js)
  js/
    dynamics-model.js      core vehicle-dynamics physics (3 tiers, advisor, calculators)
    tire-data.js           track-day tyre database
    car-presets.js         501-car preset database
    lihpao-laptime.js      Lihpao G2 lap-time + tyre-stint simulator
    api.js                 thin bridge layer
docs/
  physics-notes.md        formula derivations, units, references
  fsae/                   embedded teaching essays (knowledge index)
tests/
  verify-dynamics.js      physics regression tests
```

## Status

v1.4.0 · MIT-spirit personal/educational project · contributions and corrections welcome. Built in Taiwan, aimed at making serious chassis-engineering knowledge accessible to the next generation of FSAE students and track-day engineers.

---
---

## 繁體中文

# Racing Setup Analyzer — 賽車調校與單圈分析工具

**把職業級的底盤工程,變成你真的可以動手玩的東西。**

預測轉向不足/過度的平衡、算出你的彈簧/防傾桿/阻尼數值、模擬麗寶賽道一整段 stint 的輪胎演化——全部建立在標準車輛動力學教科書(Milliken、Gillespie、OptimumG)之上,並用真實世界的工程實務交叉驗證過。

`🌐 語言:` [English](#racing-setup-analyzer) ｜ **繁體中文** ｜ [日本語](#日本語)

### 這是什麼

多數人學了車輛動力學的「公式」,卻沒看過職業車隊怎麼把公式變成賽道上的決策。這個工具補的就是那個斷層。你設定一台車(彈簧、防傾桿、阻尼、幾何、輪胎、空力),它告訴你**車會往哪個方向操控、為什麼**,再預測**單圈時間**和輪胎在一段 stint 裡怎麼變化。可當 Electron 桌面 app,或直接用瀏覽器開——不需編譯、不需伺服器,物理全在本地 JavaScript 跑。

### 功能

- **三層轉向平衡預測** — 用統一的 Milliken 模型把配重、側傾剛性分配(LLTD)、輪胎負載敏感度合在一條公式裡,輸出 understeer gradient(deg/g)。Tier 1 機械平衡 / Tier 2 加輪胎模型 / Tier 3 加四角重量、空力、阻尼、Camber/Toe、bump rubber 與線性自行車模型(特徵/臨界速度、yaw gain)。
- **調校建議** — 規則式建議(ride frequency、LLTD vs 配重、roll gradient、阻尼比、抓地失衡、cross weight、camber…),附具體目標值。
- **彈簧 & ARB 計算器** — 頻率↔彈簧率互算(含輪胎柔度)、彈簧率對照表、目標 roll gradient 的 ARB sizing。
- **輪胎分析** — 溫度/壓力抓地曲線 + **21 款賽道胎資料庫**(含光頭胎),附最佳胎溫胎壓與峰值抓地。
- **麗寶 G2 單圈模擬器** — GG-diagram 點質量單圈模擬(3.500 km / 23 彎)+ **輪胎 stint 模型**:預測**最快單圈、胎壓甜蜜點在第幾圈**、峰值抓地圈、建議冷胎壓,以及逐圈演化圖(冷胎→升溫建壓→甜蜜點→過熱/磨耗退化)。
- **501 台車預設資料庫** — 選車自動帶入底盤基準,只調可調項目。
- **code 即教材** — 原始碼裡埋了寫給 FSAE/賽道工程師的「知識文」(見 `docs/fsae/`):直覺→物理→公式→對應哪段 code→FSAE 注意。

### 物理依據與驗證

建立在標準參考(Milliken《Race Car Vehicle Dynamics》、Gillespie《Fundamentals of Vehicle Dynamics》、OptimumG、Suspension Secrets)之上,並**用真實世界的工程實務交叉驗證**:側傾剛性與阻尼比計算、車高空力地圖、遙測車高工作流。公式與既有工程實務一致處(如臨界阻尼 `Cc = 2√(k·m)`、軸側傾剛性 `k·t²/2`)會註明,不一致處則修正。詳見 [`docs/physics-notes.md`](docs/physics-notes.md)。

> ⚠️ **準確度說明:** 絕對圈速完全取決於你輸入的規格(動力/抓地/空力/質量)。賽道紀錄多為大改車,所以原廠規格預測較慢是正確的、不是 bug。本工具的強項在**相對比較**(setup 改了車往哪邊動)與**胎壓甜蜜點**分析。方法論可跨車移植,絕對數值不行——FSAE 尤其必須換上你自己的輪胎數據。

### 快速開始

```bash
npm install && npm start      # 桌面 (Electron)
open renderer/index.html      # 或直接瀏覽器開,免伺服器
npm test                      # 物理迴歸測試 (74 項)
```

---

## 日本語

# Racing Setup Analyzer — 車両運動・ラップタイム解析ツール

**ファクトリーレベルのシャシーエンジニアリングを、実際に手で触れて遊べるものに。**

アンダー/オーバーステアのバランス予測、スプリング/アンチロールバー/ダンパーの数値算出、麗寶サーキットでのスティント全体のタイヤ挙動シミュレーション——すべて標準的な車両運動力学(Milliken、Gillespie、OptimumG)に基づき、実世界のエンジニアリング実務と照合済み。

`🌐 言語:` [English](#racing-setup-analyzer) ｜ [繁體中文](#繁體中文) ｜ **日本語**

### 概要

多くの人は車両運動力学の「数式」を学んでも、プロのチームがそれをどうコース上の判断に変えるかは見たことがない。このツールはそのギャップを埋める。車両をセットアップ(スプリング、アンチロールバー、ダンパー、ジオメトリー、タイヤ、エアロ)すると、**車がどちらに曲がる特性になるか・なぜそうなるか**を示し、さらに**ラップタイム**とスティント中のタイヤ変化を予測する。Electron デスクトップアプリ、またはブラウザで直接動作——ビルド不要・サーバー不要、物理計算はすべてローカルの JavaScript で実行。

### 主な機能

- **3 段階のハンドリングバランス予測** — 統一 Milliken モデルで重量配分・ロール剛性配分(LLTD)・タイヤ荷重感度を一つの式に統合し、アンダーステアグラジエント(deg/g)を出力。Tier 1 機械バランス / Tier 2 タイヤモデル追加 / Tier 3 コーナーウェイト・エアロ・ダンパー・キャンバー/トー・バンプラバー + 線形バイシクルモデル(特性/臨界速度、ヨーゲイン)。
- **セットアップアドバイザー** — ルールベースの提案(ライドフリクエンシー、LLTD 対 重量、ロールグラジエント、減衰比、グリップ不均衡、クロスウェイト、キャンバー…)、具体的な目標値付き。
- **スプリング & ARB 計算機** — 周波数↔スプリングレート換算(タイヤコンプライアンス考慮)、レート対照表、目標ロールグラジエントの ARB サイジング。
- **タイヤ解析** — 温度/空気圧グリップ曲線 + **21 銘柄のトラックデイタイヤDB**(スリック含む)、最適温度・空気圧・ピークグリップ付き。
- **麗寶 G2 ラップシミュレーター** — GG ダイアグラム質点ラップシム(3.500 km / 23 コーナー)+ **タイヤスティントモデル**:**ベストラップ・タイヤ空気圧のスイートスポットが何周目に来るか**・ピークグリップ周回・推奨冷間空気圧、周回ごとの推移グラフ(冷間→昇温・内圧上昇→スイートスポット→オーバーヒート/摩耗による低下)を予測。
- **501 台のプリセット車両DB** — 車を選べばシャシーの基準値が自動入力。
- **コードが教材** — ソース内に FSAE/サーキット走行エンジニア向けの「知識ノート」を埋め込み(`docs/fsae/` 参照)。

### 物理的根拠と検証

標準的な文献(Milliken『Race Car Vehicle Dynamics』、Gillespie『Fundamentals of Vehicle Dynamics』、OptimumG、Suspension Secrets)に基づき、**実世界のエンジニアリング実務と照合**:ロール剛性・減衰比の計算、車高ベースのエアロマップ、テレメトリーから導いた車高ワークフロー。式が既存の実務と一致する箇所(例:臨界減衰 `Cc = 2√(k·m)`、車軸ロール剛性 `k·t²/2`)は明記し、一致しない箇所は修正した。詳細は [`docs/physics-notes.md`](docs/physics-notes.md)。

> ⚠️ **精度に関する注意:** 絶対的なラップタイムは入力仕様(パワー/グリップ/エアロ/重量)に完全に依存する。サーキット記録は大幅改造車によるものが多いため、ノーマル仕様の予測が遅くなるのは正しく、バグではない。本ツールの強みは**相対比較**(セットアップ変更で車がどちらに動くか)と**タイヤスイートスポット**解析にある。方法論は車種を超えて移植できるが、絶対値はできない——特に FSAE では自分のタイヤデータが必須。

### クイックスタート

```bash
npm install && npm start      # デスクトップ (Electron)
open renderer/index.html      # またはブラウザで直接(サーバー不要)
npm test                      # 物理回帰テスト (74 項目)
```
