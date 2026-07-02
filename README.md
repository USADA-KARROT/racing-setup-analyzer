# Racing Setup Analyzer

**A case-centric vehicle-dynamics workspace that predicts handling balance, sizes your spring / ARB / damper numbers, simulates a tyre stint, and — when you bring real telemetry and a verified calibration — reports honestly-gated measured metrics. Every number is labelled by how it was derived; every blocked feature says why.**

`🌐 Language:` **English** ｜ [繁體中文](#繁體中文) ｜ [日本語](#日本語)

Grounded in textbook vehicle dynamics (Milliken, Gillespie, OptimumG) and cross-checked against real-world engineering practice. Runs as an Electron desktop app or straight in a browser — no build step, no server, no account; the physics runs locally in plain JavaScript.

## Core value

- **Transparent balance prediction** — an understeer-gradient model that combines weight distribution, roll-stiffness distribution (LLTD) and tyre load sensitivity, with every output badged **Physics / Model / Heuristic**.
- **Honest, fail-closed telemetry analysis** — import a CSV, map channels, confirm identity; a *measured* understeer gradient (K_us) is produced **only** when a verified steering calibration *and* the data quality pass every gate — otherwise it stays blocked with a reason.
- **Local-first case workspace** — build an Analysis Case (vehicle + setup + optional telemetry), save / reopen / duplicate / archive / export — all in a local Case Library. No cloud, no accounts; raw telemetry never leaves your device.
- **Trilingual UI** — English / 繁體中文（台灣）/ 日本語, switchable at runtime across the app shell and the full analysis workspace.
- **Source as teaching material** — embedded "knowledge essays" (`docs/fsae/`) walk intuition → physics → formula → code for FSAE / track-day engineers.

## Current status

| Milestone | Scope | State |
|---|---|---|
| R1 / R2.0–R2.2 | Handling prediction, advisor, spring/ARB, tyre analysis, Lihpao lap+stint, 501-car presets, Analysis Workspace slice | ✅ complete |
| R2.3 | Real/imported CSV → canonical telemetry session, channel mapping + confirmation, closed-schema case export | ✅ complete |
| R2.4 | Honestly-gated **measured** understeer gradient K_us (needs a verified steering calibration) + model-vs-actual | ✅ complete |
| R2.5 | Setup A/B (predicted balance deltas) + quantitative recommendation in physical units | ✅ complete |
| R2.6 | Track intelligence + per-corner driver steering-behaviour coaching (Heuristic, low-confidence) | ✅ complete |
| R3.0A | Case-centric app shell (nav / Case Context / Trust panel) + documentation consolidation | ✅ complete |
| R3.0B | Local-first Case Library & persistence (save / reopen / duplicate / archive / export-import) | ✅ complete |
| R3.0C | Reference lap & corner-delta intelligence (same-case, same-session, cross-lap comparison; explicit user-selected reference only) | ✅ complete — Comparisons pane live |
| R3.0D | Race-engineer decision engine (evidence graph → hypothesis → priority → advisory Engineer Brief; no runtime LLM, no causation, no driver blame) | ✅ complete — services shipped; Brief pane not yet wired into the page (nav node live, mount inert) |
| R3.0E | Experiment-outcome loop (experiment / outcome / follow-up link / append-only timeline stores + contracts) | ✅ complete — services shipped; Experiment Loop / Case Timeline panes not yet wired into the page (nav nodes live) |
| R3.0F | Migration engine, E2E flows, hardening probes, documentation, release gate | ✅ complete; Train merged to `main`; v2.0.0 release candidate staged (tag/Release pending authorization) |

Version 2.0.1 (public release candidate — the v2.0.1 tag and public GitHub Release are pending explicit authorization). The Comparisons pane and the Engineer Brief are live; Experiment Loop / Case Timeline are deferred (see `docs/release-notes-2.0.1.md`). Apple Silicon (arm64) macOS 12+ only.

## What it can do

**Works on model inputs alone**
- Handling-balance prediction (understeer gradient, LLTD, roll gradient, ride frequency) — *Physics / Model*
- Setup Advisor with concrete target values — *Heuristic*
- Spring / ARB calculator (ride-freq ↔ rate, ARB sizing) — *Physics / Derived*
- Tyre analysis + 21-tyre track-day database — *Model / Derived*
- Lihpao G2 lap-time + tyre-stint simulation — *Model*
- 501-car preset database (each parameter graded `confirmed` / `documented` / `estimated` / `unknown`)
- Analysis Case model prediction + directional tendency — *Model / Heuristic*

**Conditionally available (need real telemetry and/or calibration; gated)**
- Telemetry observation (directional tendency from data) — needs **confirmed** channels
- **Measured understeer gradient K_us** — needs confirmed telemetry **+ a verified road-wheel steering calibration**
- Model-vs-actual comparison — directional always; magnitude only when measured K_us passes its gates
- Setup A/B (predicted balance deltas — never a lap-time claim)
- Quantitative setup recommendation in physical units (Nm/deg, N/mm, %)
- Corner coaching (the **driver's** raw-steering behaviour per entry/mid/exit — never a vehicle or setup finding)

See [`docs/r2-capability-map.md`](docs/r2-capability-map.md) for the full Available / Conditionally-Available / Blocked / Deferred matrix with each capability's required input, credibility, fail-closed conditions and limitations.

## What it does not claim

This tool is deliberately honest about its limits. It is **not**:

- a professional race-engineer replacement, and it is never presented as professionally validated;
- a full multi-body-dynamics (MBD) simulator — the model is a transparent linear/quasi-static balance model;
- a complete tyre model — coefficients are estimated unless you import your own `.tir` (pure-slip lateral only);
- a GPS racing-line / lap-optimization tool — no racing line, no exact apex from position alone;
- a telemetry decoder for arbitrary binary formats — the production path is CSV / canonical-JSON;
- a source of hardware "clicks" — there is no validated per-car click→rate mapping, so output stays in physical units;
- a MoTeC / commercial-analysis replacement.

Measured numbers are never claimed without the data **and** calibration to back them, and nothing is fabricated to fill a gap.

## Credibility model

Every value carries a badge for **how it was derived**, and every conclusion carries trust metadata (credibility · confidence · provenance · limitations · blockers · evidence references · next validation step). This is enforced in the services, not the UI.

- **◆ Physics** — closed-form physical relation (exact for the inputs given). *≠ Model.*
- **◈ Model** — a model prediction built from physics relations. *≠ Measured.*
- **Measured** — derived from real telemetry; still confounded (tyre/track/driver/sensor), with machine-read provenance (synthetic / real / unverified). *≠ fully validated.*
- **Derived** — a deterministic transform of inputs. *≠ direct measurement.*
- **◇ Heuristic** — a rule-of-thumb observation. *≠ a vehicle fact.*
- **Unavailable** — not derivable from the present evidence (shown blocked, with a reason).

**Fail-closed, always:** when a required input or quality gate is missing, the capability is blocked with a reason, never approximated. Driver behaviour ≠ vehicle characteristic ≠ setup finding; correlation ≠ causation; prediction ≠ guaranteed result. See [`docs/credibility-and-trust.md`](docs/credibility-and-trust.md).

## Main workflow

1. **Create an Analysis Case** — pick a vehicle + setup (or load the synthetic Demo Case).
2. **(Optional) Import telemetry** — CSV / canonical-JSON → map raw columns to canonical channels → confirm identity.
3. **Run the analysis** — model prediction + (if telemetry is confirmed) a directional observation.
4. **(Optional) Add a steering calibration** — unlocks the honestly-gated measured K_us and magnitude comparison.
5. **Review** — model-vs-actual, measured metrics, Setup A/B, quantitative recommendation, corner coaching — each with its credibility and blockers.
6. **Save to the Case Library** — reopen-identical, duplicate, archive, or export a portable (curated, raw-free) bundle.

## UI overview

A case-centric shell: a left **Workspace** nav (Dashboard / Analysis Cases / Import Telemetry / Setup Library / Comparisons / Settings), a per-case nav (Overview / Setup & Model / Telemetry / Measured Metrics / Model vs Actual / Recommendations / Corner Coaching / Evidence & Trust), a **Case Context** bar, and a fixed **Context/Trust** panel that re-reads the services' capability and surfaces status, credibility, blockers and the next action. The Setup Library hosts the original calculators (Spring / Tyre / Advisor / Lihpao Lap / raw-CSV Telemetry Viewer).

## Installation / run

```bash
# Desktop (Electron)
npm install
npm start

# Or open it in a browser (no server needed — pure client-side JS)
open renderer/index.html        # macOS

# Run the full test suite (physics regression + telemetry + persistence + UI contract + i18n parity)
npm test
```

## Data and privacy

- **Local-first.** Cases and sessions are stored in the browser/Electron IndexedDB on your machine. No cloud, no accounts, no sign-in.
- **No tracking.** No analytics, no third-party telemetry, no tracking pixels, no cookies.
- **Raw telemetry stays on device.** It lives in a capacity-bounded local session store and is **never** included in a portable export. A portable case bundle is a curated, value-constrained, raw-free summary; an imported bundle opens as an explicitly degraded "imported summary".
- **Imported `.tir` / CSV files are read locally** and never uploaded or bundled.

## Documentation map

- [`docs/product-positioning.md`](docs/product-positioning.md) — what this is / is not, who it's for, the product loop.
- [`docs/credibility-and-trust.md`](docs/credibility-and-trust.md) — the credibility ladder and honesty contract.
- [`docs/r2-capability-map.md`](docs/r2-capability-map.md) — the canonical capability matrix.
- [`docs/analysis-workspace-architecture.md`](docs/analysis-workspace-architecture.md) — the end-to-end production pipeline.
- [`docs/r3.0b-case-library-persistence.md`](docs/r3.0b-case-library-persistence.md) — local-first persistence design.
- [`docs/physics-notes.md`](docs/physics-notes.md) — formula derivations, units, references.
- [`docs/fsae/`](docs/fsae/) — embedded teaching essays.
- [`docs/phase-3-trust-chain.md`](docs/phase-3-trust-chain.md) — the legacy `.bmsbin` research path (see below).

## Delivery status (R3.0 Train)

- **R3.0C** — reference lap & corner-delta intelligence: a normalized track-position axis, per-corner + entry/mid/exit deltas, with a hard comparability gate. *Shipped; the Comparisons pane is live in the app.*
- **R3.0D** — a deterministic, evidence-backed virtual race-engineer decision engine (primary issue + alternatives + a verifiable next experiment; never a free-text LLM conclusion). *Services shipped; the Brief pane is not yet wired into the page (nav node live, mount inert).*
- **R3.0E** — a recommendation experiment & outcome loop (expected vs observed; local evidence history only). *Services and stores shipped; the Experiment Loop / Case Timeline panes are not yet wired into the page (nav nodes live).*
- **R3.0F** — product hardening, schema migration, documentation and the release gate. *Complete; the Train is merged to `main` and the 2.0.0 version bump is staged; the v2.0.0 tag and GitHub Release remain pending explicit authorization.*

Anything not yet wired is never presented in the app as if it already works — unwired panes stay behind inert mounts or nav-only nodes (see `docs/release-notes-2.0.0.md`, "Known limitations").

## Validation and limitations

- The model is validated against textbook formulas and real-world engineering practice (e.g. critical damping `Cc = 2√(k·m)`, axle roll stiffness `k·t²/2`); see [`docs/physics-notes.md`](docs/physics-notes.md). The automated tests are **synthetic** regression/contract tests — they are not real-world track validation.
- **Absolute lap times depend entirely on your inputs.** Published circuit records are usually set by heavily-modified cars, so a stock-spec prediction being slower is correct, not a bug. The tool's strength is **relative** comparison and tyre-stint sweet-spot analysis; methodology transfers across cars, absolute numbers do not — especially for FSAE, where you must fit your own tyre data.
- **Known boundaries:** no suspension hardpoint kinematics beyond the 2D front-view double-wishbone calculator; no transient model beyond a linear 2-DOF step-steer; one representative track for lap simulation; tyre coefficients estimated unless a `.tir` is imported.

> **⚠️ Legacy / historical research path.** The `.bmsbin` clean-room binary investigation (`docs/phase-3-trust-chain.md` + the `bmsbin-*` notes) is a **historical research path** that decodes nothing beyond a channel catalog and produces no canonical telemetry. The **production telemetry path is CSV / canonical-JSON import** (R2.3+) — the only route that yields a Canonical Telemetry Session, directional analysis and (with a verified calibration) a measured K_us. The two are intentionally separate.

## License / contributing

Open-source under the **MIT License** (see [LICENSE](LICENSE)) — you may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies, provided the original copyright and license notice are retained. Third-party components retain their own licenses; `THIRD_PARTY_NOTICES.md` is the authoritative list for bundled third-party software. Contributions and corrections are welcome. Built in Taiwan, aimed at making serious chassis-engineering knowledge accessible to the next generation of FSAE students and track-day engineers.

---
---

## 繁體中文

# Racing Setup Analyzer — 賽車調校與單圈分析工具

**以「分析案例」為核心的車輛動力學工作台：預測操控平衡、算出彈簧／防傾桿／阻尼數值、模擬輪胎 stint；當你帶入真實遙測與一份經驗證的校正時，輸出誠實受閘門控管的量測指標。每個數字都標示它是怎麼推導出來的，每個被擋下的功能都說明原因。**

`🌐 語言:` [English](#racing-setup-analyzer) ｜ **繁體中文** ｜ [日本語](#日本語)

建立在標準車輛動力學教科書（Milliken、Gillespie、OptimumG）之上，並用真實世界的工程實務交叉驗證。可作為 Electron 桌面 app，或直接用瀏覽器開——免編譯、免伺服器、免帳號，物理全在本地 JavaScript 執行。

### 核心價值

- **透明的平衡預測** — 轉向不足梯度模型整合配重、側傾剛度分配（LLTD）與輪胎負載敏感度，每個輸出都標 **物理計算（Physics）／模型結果（Model）／啟發式判定（Heuristic）**。
- **誠實、fail-closed 的遙測分析** — 匯入 CSV、對應通道、確認身分；**唯有**當一份經驗證的轉向校正*與*資料品質全數通過閘門，才會輸出*量測所得*的轉向不足梯度（K_us）——否則維持「無法執行」並附原因。
- **本機優先的案例工作台** — 建立分析案例（車輛＋設定＋可選遙測），可儲存／重新開啟／建立副本／封存／匯出，全在本機案例庫。無雲端、無帳號；原始遙測資料絕不離開你的裝置。
- **三語介面** — English／繁體中文（台灣）／日本語，可即時切換，涵蓋 app 外殼與完整分析工作台。
- **原始碼即教材** — 內嵌寫給 FSAE／賽道工程師的「知識文」（`docs/fsae/`）：直覺 → 物理 → 公式 → 程式碼。

### 目前狀態

| 里程碑 | 範圍 | 狀態 |
|---|---|---|
| R1 / R2.0–R2.2 | 操控預測、調校建議、彈簧／ARB、輪胎分析、麗寶單圈+stint、501 車預設、分析工作台切片 | ✅ 完成 |
| R2.3 | 真實／匯入 CSV → 標準化遙測 session、通道對應+確認、封閉 schema 案例匯出 | ✅ 完成 |
| R2.4 | 誠實受閘門控管的*量測*轉向不足梯度 K_us（需經驗證的轉向校正）+ model-vs-actual | ✅ 完成 |
| R2.5 | Setup A/B（預測平衡差）+ 物理單位的量化建議 | ✅ 完成 |
| R2.6 | 賽道情報 + 逐彎駕駛轉向行為教練（啟發式、低信心） | ✅ 完成 |
| R3.0A | 案例為核心的 app 外殼（導覽／Case Context／可信度面板）+ 文件整併 | ✅ 完成 |
| R3.0B | 本機優先案例庫與持久化（儲存／重開／副本／封存／匯出匯入） | ✅ 完成 |
| R3.0C | 參考圈與逐彎差異情報（同案例、同 session、跨圈比較；參考圈僅限使用者明確選取） | ✅ 完成 — Comparisons 面板已上線 |
| R3.0D | 賽車工程師決策引擎（證據圖 → 假設 → 優先序 → 諮詢性 Engineer Brief；無執行期 LLM、不下因果結論、不歸咎車手） | ✅ 完成 — 服務已出貨；Brief 面板尚未接進頁面（導覽節點已上線、掛載點為隱藏待接線） |
| R3.0E | 實驗-結果迴圈（實驗／結果／後續連結／僅追加時間軸的儲存層與契約） | ✅ 完成 — 服務已出貨；Experiment Loop / Case Timeline 面板尚未接進頁面（導覽節點已上線） |
| R3.0F | 遷移引擎、E2E 流程、硬化探針、文件、發佈閘門 | ✅ 完成；Train 已合併進 `main`；v2.0.0 release candidate 已就緒（tag/Release 待授權） |

版本 2.0.1（public release candidate —— v2.0.1 tag 與公開 GitHub Release 待明確授權後發佈）。Comparisons 面板與 Engineer Brief 已上線；Experiment Loop / Case Timeline 延後交付（見 `docs/release-notes-2.0.1.md`）。僅支援 Apple Silicon (arm64) macOS 12+。

### 它能做什麼

**只靠模型輸入即可運作**
- 操控平衡預測（轉向不足梯度、LLTD、roll gradient、ride frequency）— *物理／模型*
- 附具體目標值的調校建議 — *啟發式*
- 彈簧／ARB 計算器（頻率 ↔ 彈簧率、ARB sizing）— *物理／推導值*
- 輪胎分析 + 21 款賽道胎資料庫 — *模型／推導值*
- 麗寶 G2 單圈時間 + 輪胎 stint 模擬 — *模型*
- 501 車預設資料庫（每個參數標示 `confirmed`／`documented`／`estimated`／`unknown`）
- 分析案例模型預測 + 方向性傾向 — *模型／啟發式*

**有條件提供（需真實遙測且／或校正；受閘門控管）**
- 遙測觀測（從資料得到方向性傾向）— 需**已確認**的通道
- **量測所得的轉向不足梯度 K_us** — 需已確認遙測 **+ 一份經驗證的車輪轉角轉向校正**
- Model-vs-actual 比較 — 方向性恆有；幅值僅在量測 K_us 通過閘門時提供
- Setup A/B（預測平衡差——絕不宣稱圈速）
- 物理單位（Nm/deg、N/mm、%）的量化調校建議
- 逐彎教練（**駕駛**在入彎／彎中／出彎的原始轉向行為——絕非車輛或調校結論）

完整的「可用／有條件可用／已阻擋／延後」矩陣（含各能力的必要輸入、可信度、fail-closed 條件與限制）見 [`docs/r2-capability-map.md`](docs/r2-capability-map.md)。

### 它不宣稱什麼

本工具刻意對自己的邊界誠實。它**不是**：

- 職業賽車工程師的替代品，也從不以「經專業驗證」自居；
- 完整的多體動力學（MBD）模擬器——模型是透明的線性／準靜態平衡模型；
- 完整的輪胎模型——未匯入你自己的 `.tir`（僅純側向）時，係數為估算；
- GPS 賽車線／單圈最佳化工具——無賽車線，無法僅憑位置得出精確 apex；
- 任意二進位格式的遙測解碼器——正式路徑是 CSV／canonical-JSON；
- 硬體「咔數（clicks）」的來源——無經驗證的逐車 click→rate 對應，故輸出維持物理單位；
- MoTeC／商用分析軟體的替代品。

沒有資料**且**校正佐證，絕不宣稱任何量測數字；也絕不為了補洞而捏造。

### 可信度模型

每個值都帶有「如何推導」的標籤，每個結論都附信任 metadata（可信度 · 信心水準 · 資料來源 · 限制 · 阻擋原因 · 證據參照 · 下一步驗證）。這是在服務層強制執行，而非 UI。

- **◆ 物理計算（Physics）** — 封閉形式的物理關係（對給定輸入精確）。*≠ 模型。*
- **◈ 模型結果（Model）** — 由物理關係建立的模型預測。*≠ 量測。*
- **量測所得（Measured）** — 由真實遙測推導；仍受干擾（胎/路/駕駛/感測器），附機器可讀的資料來源（合成／真實／未驗證）。*≠ 完全驗證。*
- **推導值（Derived）** — 對輸入的確定性轉換。*≠ 直接量測。*
- **◇ 啟發式判定（Heuristic）** — 經驗法則式的觀察。*≠ 車輛事實。*
- **無法提供（Unavailable）** — 以現有證據無法推導（顯示為已阻擋並附原因）。

**永遠 fail-closed：** 缺少必要輸入或品質閘門時，該能力會被「無法執行」並附原因，絕不近似帶過。駕駛行為 ≠ 車輛特性 ≠ 調校結論；相關 ≠ 因果；預測 ≠ 保證結果。詳見 [`docs/credibility-and-trust.md`](docs/credibility-and-trust.md)。

### 主要工作流程

1. **建立分析案例** — 選車輛＋設定（或載入合成 Demo 案例）。
2. **（可選）匯入遙測** — CSV／canonical-JSON → 將原始欄位對應到標準通道 → 確認身分。
3. **執行分析** — 模型預測 +（若遙測已確認）方向性觀測。
4. **（可選）加入轉向校正** — 解鎖誠實受閘門控管的量測 K_us 與幅值比較。
5. **檢視** — model-vs-actual、量測指標、Setup A/B、量化建議、逐彎教練——各自附可信度與阻擋原因。
6. **存入案例庫** — 可重開還原、建立副本、封存，或匯出可攜（精選、不含原始資料）的 bundle。

### 介面總覽

以案例為核心的外殼：左側 **Workspace** 導覽（Dashboard／Analysis Cases／Import Telemetry／Setup Library／Comparisons／Settings）、per-case 導覽（Overview／Setup & Model／Telemetry／Measured Metrics／Model vs Actual／Recommendations／Corner Coaching／Evidence & Trust）、**Case Context** 列，以及固定的**可信度面板**（重新讀取服務的能力，呈現狀態、可信度、阻擋原因與下一步）。Setup Library 收納原本的計算器（彈簧／輪胎／調校建議／麗寶單圈／原始 CSV 遙測檢視器）。

### 安裝／執行

```bash
# 桌面 (Electron)
npm install
npm start

# 或直接用瀏覽器開（免伺服器——純前端 JS）
open renderer/index.html        # macOS

# 執行完整測試套件（物理迴歸 + 遙測 + 持久化 + UI 契約 + i18n parity）
npm test
```

### 資料與隱私

- **本機優先。** 案例與 session 儲存在你機器上的瀏覽器／Electron IndexedDB。無雲端、無帳號、無登入。
- **不追蹤。** 無分析工具、無第三方遙測、無追蹤像素、無 cookie。
- **原始遙測資料留在裝置上。** 它存在容量受限的本機 session store，**絕不**進入可攜匯出。可攜案例 bundle 是精選、值受限、不含原始資料的摘要；匯入的 bundle 會以明確的「匯入摘要」降級狀態開啟。
- **匯入的 `.tir`／CSV 檔皆在本機讀取**，不上傳、不打包。

### 文件地圖

- [`docs/product-positioning.md`](docs/product-positioning.md) — 它是什麼／不是什麼、為誰而做、產品迴圈。
- [`docs/credibility-and-trust.md`](docs/credibility-and-trust.md) — 可信度階梯與誠實契約。
- [`docs/r2-capability-map.md`](docs/r2-capability-map.md) — 權威能力矩陣。
- [`docs/analysis-workspace-architecture.md`](docs/analysis-workspace-architecture.md) — 端到端正式管線。
- [`docs/r3.0b-case-library-persistence.md`](docs/r3.0b-case-library-persistence.md) — 本機優先持久化設計。
- [`docs/physics-notes.md`](docs/physics-notes.md) — 公式推導、單位、參考文獻。
- [`docs/fsae/`](docs/fsae/) — 內嵌教學文。
- [`docs/phase-3-trust-chain.md`](docs/phase-3-trust-chain.md) — 舊的 `.bmsbin` 研究路徑（見下）。

### 交付狀態（R3.0 Train）

- **R3.0C** — 參考圈與逐彎差異情報：正規化賽道位置軸、逐彎＋入彎／彎中／出彎差異，含嚴格的可比較性閘門。*已出貨；Comparisons 面板已在 app 內上線。*
- **R3.0D** — 確定性、以證據為本的虛擬賽車工程師決策引擎（主要問題＋替代解釋＋可驗證的下一步實驗；絕非自由文字 LLM 結論）。*服務已出貨；Brief 面板尚未接進頁面（導覽節點已上線、掛載點為隱藏待接線）。*
- **R3.0E** — 建議實驗與結果迴圈（預期 vs 觀測；僅累積本機證據歷史）。*服務與儲存層已出貨；Experiment Loop / Case Timeline 面板尚未接進頁面（導覽節點已上線）。*
- **R3.0F** — 產品硬化、schema 遷移、文件與發佈閘門。*已完成；Train 已合併進 `main`、2.0.0 版本升級已就緒；v2.0.0 tag 與 GitHub Release 仍待明確授權。*

尚未接線的功能絕不會在 app 內被呈現成已可運作——未接線面板一律停留在隱藏掛載點或僅導覽節點（見 `docs/release-notes-2.0.0.md` 的 Known limitations）。

### 驗證與限制

- 模型對標教科書公式與真實工程實務（如臨界阻尼 `Cc = 2√(k·m)`、軸側傾剛性 `k·t²/2`），見 [`docs/physics-notes.md`](docs/physics-notes.md)。自動化測試是**合成的**迴歸／契約測試——並非真實賽道驗證。
- **絕對圈速完全取決於你的輸入。** 賽道紀錄多由大改車創下，原廠規格預測較慢是正確的、不是 bug。本工具強項在**相對**比較與輪胎 stint 甜蜜點分析；方法論可跨車移植，絕對數值不行——FSAE 尤其必須換上你自己的輪胎數據。
- **已知邊界：** 除 2D 前視雙 A 臂計算器外無懸吊硬點運動學；除線性 2-DOF step-steer 外無瞬態模型；單圈模擬僅一條代表性賽道；未匯入 `.tir` 時胎係數為估算。

> **⚠️ 舊／歷史研究路徑。** `.bmsbin` clean-room 二進位研究（`docs/phase-3-trust-chain.md` 與 `bmsbin-*` 筆記）是**歷史研究路徑**，除通道目錄外不解碼任何東西，也不產生 canonical telemetry。**正式遙測路徑是 CSV／canonical-JSON 匯入**（R2.3+）——那才是產生 Canonical Telemetry Session、方向性分析、以及（具備驗證校正時）量測 K_us 的唯一途徑。兩者刻意分離。

### 授權／貢獻

以 **MIT License** 開源（見 [LICENSE](LICENSE)）——可自由使用、複製、修改、合併、發布、散布、再授權與銷售，惟須保留原始 copyright 與授權聲明。第三方元件仍各自適用其原授權；`THIRD_PARTY_NOTICES.md` 為隨附第三方軟體的授權權威清單。歡迎貢獻與指正。在台灣打造，志在讓嚴肅的底盤工程知識，能被下一代 FSAE 學生與賽道工程師接觸到。

---
---

## 日本語

# Racing Setup Analyzer — 車両運動・ラップタイム解析ツール

**「解析ケース」を中核とした車両運動ワークスペース。ハンドリングバランスを予測し、スプリング／アンチロールバー／ダンパーの数値を算出し、タイヤスティントをシミュレートする。実テレメトリと検証済みキャリブレーションを与えれば、誠実にゲート管理された計測指標も出力する。すべての数値は「どう導かれたか」がラベル付けされ、ブロックされた機能はその理由を示す。**

`🌐 言語:` [English](#racing-setup-analyzer) ｜ [繁體中文](#繁體中文) ｜ **日本語**

標準的な車両運動力学（Milliken、Gillespie、OptimumG）に基づき、実世界のエンジニアリング実務と照合済み。Electron デスクトップアプリ、またはブラウザで直接動作——ビルド不要・サーバー不要・アカウント不要、物理計算はすべてローカルの JavaScript で実行。

### コアバリュー

- **透明なバランス予測** — 重量配分・ロール剛性配分（LLTD）・タイヤ荷重感度を統合したアンダーステア勾配モデル。各出力に **物理計算（Physics）／モデル推定（Model）／ヒューリスティック（Heuristic）** のバッジ。
- **誠実な fail-closed テレメトリ解析** — CSV を読み込み、チャンネルを対応付け、識別を確認する。検証済みステアリングキャリブレーション*と*データ品質がすべてのゲートを通過した場合**のみ**、*計測値*のアンダーステア勾配（K_us）を出力する——そうでなければ理由付きで実行不可のまま。
- **ローカルファーストのケースワークスペース** — 解析ケース（車両＋セットアップ＋任意のテレメトリ）を作成し、保存／再オープン／複製／アーカイブ／エクスポートできる。クラウドなし・アカウントなし；生テレメトリはデバイスから出ない。
- **3 言語 UI** — English／繁體中文（台湾）／日本語、実行時に切替可能（アプリシェルと解析ワークスペース全体に対応）。
- **コードが教材** — FSAE／サーキット走行エンジニア向けの「知識ノート」（`docs/fsae/`）を同梱：直感 → 物理 → 数式 → コード。

### 現在のステータス

| マイルストーン | 範囲 | 状態 |
|---|---|---|
| R1 / R2.0–R2.2 | ハンドリング予測、アドバイザー、スプリング／ARB、タイヤ解析、麗寶ラップ+スティント、501 台プリセット、解析ワークスペース切片 | ✅ 完了 |
| R2.3 | 実／インポート CSV → 正規化テレメトリ session、チャンネルマッピング+確認、クローズドスキーマのケース書き出し | ✅ 完了 |
| R2.4 | 誠実にゲート管理された*計測*アンダーステア勾配 K_us（検証済みステアリングキャリブレーションが必要）+ model-vs-actual | ✅ 完了 |
| R2.5 | Setup A/B（予測バランス差）+ 物理単位の定量推奨 | ✅ 完了 |
| R2.6 | トラックインテリジェンス + コーナーごとのドライバー操舵挙動コーチング（ヒューリスティック、低確信度） | ✅ 完了 |
| R3.0A | ケース中核のアプリシェル（ナビ／Case Context／信頼性パネル）+ ドキュメント統合 | ✅ 完了 |
| R3.0B | ローカルファーストのケースライブラリと永続化（保存／再オープン／複製／アーカイブ／入出力） | ✅ 完了 |
| R3.0C | リファレンスラップとコーナーデルタ解析（同一ケース・同一 session 内のラップ間比較；リファレンスはユーザー明示選択のみ） | ✅ 完了 — Comparisons パネル稼働中 |
| R3.0D | レースエンジニア意思決定エンジン（エビデンスグラフ → 仮説 → 優先度 → 助言型 Engineer Brief；実行時 LLM なし・因果断定なし・ドライバー非難なし） | ✅ 完了 — サービス出荷済み；Brief パネルは未配線（ナビノードは稼働、マウントは不活性） |
| R3.0E | 実験-結果ループ（実験／結果／フォローアップリンク／追記専用タイムラインのストアと契約） | ✅ 完了 — サービス出荷済み；Experiment Loop / Case Timeline パネルは未配線（ナビノードは稼働） |
| R3.0F | マイグレーションエンジン、E2E フロー、ハードニングプローブ、ドキュメント、リリースゲート | ✅ 完了；Train は `main` にマージ済み；v2.0.0 release candidate 準備完了（タグ/Release は承認待ち） |

バージョン 2.0.1（public release candidate —— v2.0.1 タグと公開 GitHub Release は明示承認待ち）。Comparisons パネルと Engineer Brief は稼働中；Experiment Loop / Case Timeline は延期（`docs/release-notes-2.0.1.md` 参照）。Apple Silicon (arm64) macOS 12+ のみ対応。

### できること

**モデル入力だけで動作**
- ハンドリングバランス予測（アンダーステア勾配、LLTD、ロール勾配、ライドフリクエンシー）— *物理／モデル*
- 具体的な目標値付きセットアップアドバイザー — *ヒューリスティック*
- スプリング／ARB 計算機（周波数 ↔ レート、ARB サイジング）— *物理／算出値*
- タイヤ解析 + 21 銘柄のトラックデイタイヤ DB — *モデル／算出値*
- 麗寶 G2 ラップタイム + タイヤスティントシミュレーション — *モデル*
- 501 台プリセット DB（各パラメータに `confirmed`／`documented`／`estimated`／`unknown`）
- 解析ケースのモデル予測 + 方向性傾向 — *モデル／ヒューリスティック*

**条件付きで利用可能（実テレメトリおよび／またはキャリブレーションが必要；ゲート管理）**
- テレメトリ観測（データからの方向性傾向）— **確認済み**チャンネルが必要
- **計測アンダーステア勾配 K_us** — 確認済みテレメトリ **+ 検証済みの実舵角ステアリングキャリブレーション**が必要
- Model-vs-actual 比較 — 方向性は常に；大きさは計測 K_us がゲートを通過したときのみ
- Setup A/B（予測バランス差——ラップタイムの主張は決してしない）
- 物理単位（Nm/deg、N/mm、%）の定量セットアップ推奨
- コーナーコーチング（進入／旋回中／立ち上がりにおける**ドライバー**の生操舵挙動——車両やセットアップの結論ではない）

「利用可能／条件付き利用可能／ブロック／保留」の全マトリクス（各能力の必要入力・信頼性・fail-closed 条件・制約）は [`docs/r2-capability-map.md`](docs/r2-capability-map.md) を参照。

### 主張しないこと

本ツールは自らの限界について意図的に正直である。以下では**ない**：

- プロのレースエンジニアの代替ではなく、「専門的に検証済み」を称することもない；
- 完全なマルチボディダイナミクス（MBD）シミュレータではない——モデルは透明な線形／準静的バランスモデル；
- 完全なタイヤモデルではない——自分の `.tir`（純スリップ横方向のみ）を読み込まない限り係数は推定値；
- GPS レーシングライン／ラップ最適化ツールではない——レーシングラインなし、位置だけから正確なエイペックスは出さない；
- 任意のバイナリ形式のテレメトリデコーダではない——本番経路は CSV／canonical-JSON；
- ハードウェアの「クリック」の供給源ではない——検証済みの車種別 click→rate 対応がないため、出力は物理単位のまま；
- MoTeC／商用解析ソフトの代替ではない。

データ**と**キャリブレーションの裏付けなしに計測値を主張することはなく、ギャップを埋めるための捏造もしない。

### 信頼性モデル

すべての値に「どう導かれたか」のバッジが付き、すべての結論に信頼メタデータ（信頼性 · 確信度 · データ由来 · 制約事項 · ブロッカー · 証拠参照 · 次の検証手順）が付く。これは UI ではなくサービス層で強制される。

- **◆ 物理計算（Physics）** — 閉形式の物理関係（与えた入力に対して正確）。*≠ モデル。*
- **◈ モデル推定（Model）** — 物理関係から構築したモデル予測。*≠ 計測。*
- **計測値（Measured）** — 実テレメトリから導出；依然として交絡あり（タイヤ/路面/ドライバー/センサー）、機械可読のデータ由来（合成／実／未検証）付き。*≠ 完全検証。*
- **算出値（Derived）** — 入力の決定的な変換。*≠ 直接計測。*
- **◇ ヒューリスティック（Heuristic）** — 経験則的な観測。*≠ 車両の事実。*
- **提供不可（Unavailable）** — 現在の証拠からは導けない（理由付きでブロック表示）。

**常に fail-closed：** 必要な入力や品質ゲートが欠けると、その能力は理由付きでブロックされ、決して近似しない。ドライバー挙動 ≠ 車両特性 ≠ セットアップの結論；相関 ≠ 因果；予測 ≠ 保証された結果。詳細は [`docs/credibility-and-trust.md`](docs/credibility-and-trust.md)。

### 主なワークフロー

1. **解析ケースを作成** — 車両＋セットアップを選ぶ（または合成 Demo ケースを読み込む）。
2. **（任意）テレメトリをインポート** — CSV／canonical-JSON → 生カラムを正規チャンネルに対応付け → 識別を確認。
3. **解析を実行** — モデル予測 +（テレメトリが確認済みなら）方向性観測。
4. **（任意）ステアリングキャリブレーションを追加** — 誠実にゲート管理された計測 K_us と大きさ比較を解放。
5. **レビュー** — model-vs-actual、計測指標、Setup A/B、定量推奨、コーナーコーチング——それぞれ信頼性とブロッカー付き。
6. **ケースライブラリに保存** — 同一再オープン、複製、アーカイブ、または可搬（精選・生データなし）バンドルのエクスポート。

### UI 概要

ケース中核のシェル：左の **Workspace** ナビ（Dashboard／Analysis Cases／Import Telemetry／Setup Library／Comparisons／Settings）、ケースごとのナビ（Overview／Setup & Model／Telemetry／Measured Metrics／Model vs Actual／Recommendations／Corner Coaching／Evidence & Trust）、**Case Context** バー、そしてサービスの能力を読み直して状態・信頼性・ブロッカー・次のアクションを示す固定の**信頼性パネル**。Setup Library には元の計算機（スプリング／タイヤ／アドバイザー／麗寶ラップ／生 CSV テレメトリビューア）が入る。

### インストール／実行

```bash
# デスクトップ (Electron)
npm install
npm start

# またはブラウザで直接（サーバー不要——純粋なクライアント側 JS）
open renderer/index.html        # macOS

# 全テストスイートを実行（物理回帰 + テレメトリ + 永続化 + UI 契約 + i18n parity）
npm test
```

### データとプライバシー

- **ローカルファースト。** ケースと session はあなたのマシンのブラウザ／Electron IndexedDB に保存される。クラウドなし、アカウントなし、サインインなし。
- **トラッキングなし。** アナリティクスなし、第三者テレメトリなし、トラッキングピクセルなし、Cookie なし。
- **生テレメトリはデバイス内に留まる。** 容量制限付きのローカル session ストアに存在し、可搬エクスポートには**決して**含まれない。可搬ケースバンドルは精選・値制約付き・生データなしの要約；インポートしたバンドルは明示的に降格した「インポート要約」として開く。
- **読み込んだ `.tir`／CSV はローカルで読まれ**、アップロードも同梱もされない。

### ドキュメントマップ

- [`docs/product-positioning.md`](docs/product-positioning.md) — 何であり何でないか、対象者、プロダクトループ。
- [`docs/credibility-and-trust.md`](docs/credibility-and-trust.md) — 信頼性ラダーと誠実契約。
- [`docs/r2-capability-map.md`](docs/r2-capability-map.md) — 正準の能力マトリクス。
- [`docs/analysis-workspace-architecture.md`](docs/analysis-workspace-architecture.md) — エンドツーエンドの本番パイプライン。
- [`docs/r3.0b-case-library-persistence.md`](docs/r3.0b-case-library-persistence.md) — ローカルファースト永続化設計。
- [`docs/physics-notes.md`](docs/physics-notes.md) — 数式導出、単位、参考文献。
- [`docs/fsae/`](docs/fsae/) — 同梱の教材エッセイ。
- [`docs/phase-3-trust-chain.md`](docs/phase-3-trust-chain.md) — レガシー `.bmsbin` 研究経路（下記参照）。

### デリバリー状況（R3.0 Train）

- **R3.0C** — リファレンスラップとコーナーデルタ解析：正規化コース位置軸、コーナーごと＋進入／旋回中／立ち上がりのデルタ、厳格な比較可能性ゲート付き。*出荷済み；Comparisons パネルはアプリ内で稼働中。*
- **R3.0D** — 決定的で証拠に基づく仮想レースエンジニア意思決定エンジン（主要課題＋代替説明＋検証可能な次の実験；自由文の LLM 結論ではない）。*サービス出荷済み；Brief パネルは未配線（ナビノードは稼働、マウントは不活性）。*
- **R3.0E** — 推奨の実験・結果ループ（期待 vs 観測；ローカル証拠履歴のみ）。*サービスとストアは出荷済み；Experiment Loop / Case Timeline パネルは未配線（ナビノードは稼働）。*
- **R3.0F** — プロダクトのハードニング、スキーマ移行、ドキュメント、リリースゲート。*完了；Train は `main` にマージ済みで 2.0.0 バンプは準備完了；v2.0.0 タグと GitHub Release は明示承認待ち。*

未配線の機能がアプリ内で動作済みのように提示されることはない——未配線パネルは不活性マウントまたはナビ専用ノードに留まる（`docs/release-notes-2.0.0.md` の Known limitations 参照）。

### 検証と制約

- モデルは教科書の数式と実世界のエンジニアリング実務（例：臨界減衰 `Cc = 2√(k·m)`、車軸ロール剛性 `k·t²/2`）に対して検証されている。[`docs/physics-notes.md`](docs/physics-notes.md) を参照。自動テストは**合成の**回帰／契約テストであり、実走行による検証ではない。
- **絶対的なラップタイムは入力に完全に依存する。** サーキット記録は大幅改造車によるものが多いため、ノーマル仕様の予測が遅くなるのは正しく、バグではない。本ツールの強みは**相対**比較とタイヤスティントのスイートスポット解析にある；方法論は車種を超えて移植できるが絶対値はできない——特に FSAE では自分のタイヤデータが必須。
- **既知の境界：** 2D 前面ダブルウィッシュボーン計算機を超えるサスペンション・ハードポイント運動学なし；線形 2-DOF ステアステップを超える過渡モデルなし；ラップシミュレーションは代表的な 1 コースのみ；`.tir` 未読込時はタイヤ係数は推定値。

> **⚠️ レガシー／歴史的リサーチ経路。** `.bmsbin` クリーンルーム・バイナリ調査（`docs/phase-3-trust-chain.md` と `bmsbin-*` ノート）は**歴史的リサーチ経路**であり、チャンネル目録以外は何もデコードせず、canonical telemetry も生成しない。**本番のテレメトリ経路は CSV／canonical-JSON インポート**（R2.3+）——Canonical Telemetry Session・方向性解析・（検証済みキャリブレーションがある場合の）計測 K_us を生むのはこの経路のみ。両者は意図的に分離されている。

### ライセンス／コントリビュート

**MIT License** のオープンソース（[LICENSE](LICENSE) 参照）——原著作権表示とライセンス表示を保持する限り、使用・複製・改変・結合・公開・頒布・サブライセンス・販売が可能。サードパーティ製コンポーネントはそれぞれ元のライセンスに従う；`THIRD_PARTY_NOTICES.md` が同梱サードパーティソフトウェアの権威リスト。コントリビュートと修正を歓迎。台湾発、真剣なシャシーエンジニアリングの知識を次世代の FSAE 学生とサーキット走行エンジニアに届けることを目指す。
