# 物理模型說明與公式依據

2026-06 修正版。本文件記錄 `dynamics-model.js` 各計算的公式、單位約定與文獻依據。
迴歸測試：`npm test`（tests/verify-dynamics.js，35 項斷言含 501 台車掃描）。

## 單位約定

| 量 | 單位 |
|---|---|
| 側傾剛性 | **Nm/deg**（全程式統一，包括 ARB 輸入） |
| Roll gradient | deg/g |
| 彈簧率/輪端剛性 | N/mm |
| 阻尼力 | kgf @ 參考速度（預設 0.3 m/s，UI 可調） |
| 滑移角/K_us | deg、deg/g |

## Tier 1 — 機械平衡

**輪端剛性**：`K_wheel = K_spring × MR²`

**軸側傾剛性**（每軸兩支彈簧，力臂 t/2）：
```
K_φ = 2 × K_wheel × (t/2)² = K_wheel × t²/2   [Nm/rad] → ×π/180 → Nm/deg
```
依據：Milliken RCVD、OptimumG Tech Tip 2、Suspension Secrets。

**輪胎串聯**：懸吊側傾剛性（彈簧+ARB）與輪胎對的側傾剛性串聯：
```
K_axle = 1 / (1/(K_spring_roll + K_arb) + 1/K_tire_roll)
```
側傾時輪胎是懸吊與地面之間的最後一道彈簧，ARB 同樣要過輪胎。

**Roll gradient**：
```
φ/a_y = m·g·(h_cg − h_roll_axis) / K_total   [deg/g]
```
力臂用 CG 到 roll axis 的距離（按前後軸質量加權），不是整個 CG 高。
參考值：高下壓力賽車 0.2-0.7°/g、賽道改裝車 1-2°/g、街車 3-6°/g、軟懸吊越野車可到 12+°/g（OptimumG）。

**Ride frequency**：`f = (1/2π)√(K_eff/m_corner)`，K_eff 為彈簧與輪胎串聯（OptimumG ride rate 慣例）。已知限制：m_corner 用軸重/2（含簧下質量），頻率略低估 ~5%。

**LLTD 分解**：幾何項 `m_axle·h_RC/t` + 彈性項 `(K_axle/ΣK)·m·(h_cg−h_RA)/t`（簡化 Milliken，忽略簧下質量項）。

## Tier 3 — 完整動態

**線性自行車模型**（Gillespie ch.6）：
- 軸荷重：有輸入角落重量時以磅秤值為準，否則用總重 × 配重比
- 軸 cornering stiffness：Pacejka '89 BCD 在靜態單胎荷重下取值 ×2（每軸兩胎）× 胎寬係數（√width ratio）
- **荷重敏感度膝點校準**：發布的 a4（峰值荷重 ≈1.8-2.0 kN/胎）是 1980 年代輕車胎的擬合值；
  本工具以 `a4_eff = max(a4, 平均單胎靜載)` 把膝點校準到該車（輪胎依 load index 選型，
  剛性峰值落在工作荷重附近），否則所有 >750 kg 的車都會被誤判為遠超峰值、
  後重車的轉向過度被嚴重誇大（修正前 GT3 會顯示臨界速度 75 km/h）
- `K_us = W_f/C_αf − W_r/C_αr` [deg/g]（eq. 6-10）
- 特徵速度（K>0.1 deg/g）/ 臨界速度（K<−0.1 deg/g）：`V = √(g·L/|K_us|)`；
  |K|<0.1 視為中性不顯示（避免數千 km/h 的無意義數字）
- Yaw gain：`r/δ = V/(L + K_us·V²/g)` [1/s]，超過臨界速度回傳 null
- 已知限制：未含定位（toe/compliance steer）補償，真實後重車靠寬後胎+後束角穩定，
  模型對後重車的 OS 傾向仍偏保守誇大；UI 已標註理論參考

**Pacejka '89**：係數以「度」擬合（BCD 單位 N/deg），slip angle 直接用度帶入 Magic Formula；a5 camber 項以 radians 套用（-3° camber → C_α 約 -1%，per-degree 套用會錯誤地砍掉 >60%）。

**空力**：下壓力增加抓地力但不增加質量 → 前偏空力（相對機械配重）= 高速**轉向過度**；後偏 = 高速轉向不足/穩定。`aero_us_shift` 正值 = 轉向不足。

**阻尼比**：
```
c = F(kgf)×9.81 / v_ref × MR²   [N·s/m at wheel]
ζ = c / (2√(K_eff·m_corner))
```
v_ref 預設 0.3 m/s（TEIN 等規格表慣例；Öhlins 部分用 0.1）。參考值：街車 ζ≈0.3-0.5、賽車 ≈0.65-0.7（OptimumG Tech Tip 2）。

**側傾阻尼比**：
```
C_roll = c_f·t_f²/2 + c_r·t_r²/2   [N·m·s/rad]
I_roll ≈ m·(0.3·t_avg)²            （側傾迴轉半徑 ≈ 30% 輪距，近似）
ζ_roll = C_roll / (2√(K_roll[Nm/rad]·I_roll))
```

**縱向荷重轉移**：`ΔW = W·a·h_cg/L`（Gillespie）。

**Toe 慣例**：正值 = toe-in。前 toe-in → 穩定/轉向不足；前 toe-out → 進彎銳利/減少轉向不足。後 toe-in → 後軸穩定。

**Cross weight**：本工具**刻意採用 FL+RR 對角**作為分析視角（非對稱賽道/偏置配重時直接觀察右前輪負載），與磅秤常見的 RF+LR 互補：`FL+RR% = 100% − RF+LR%`，對照磅秤讀值時請換算。FL+RR > 50% → 右彎較穩定、左彎偏轉向過度。

## SetupAdvisor 重點規則

- **Rule 1（頻率比）**：後/前比值。舒適取向（Olley Flat Ride）目標 1.10-1.20（**後高於前**，pitch 收斂成 bounce）；賽道/空力平台取向 0.90-1.00 同屬合理，僅在 <0.85 或 >1.35 提示。
- **Rule 5（roll gradient）**：>3°/g 提示（修正單位後此規則才會正常觸發）。
- **Rule 7（阻尼）**：目標 ζ=0.5 的建議阻尼力以 v_ref 與 MR 換算回規格表數值。

## 彈簧計算器

`arbSizing`：全程 Nm/deg。`K_needed = m·g·h_cg / target[deg/g]`。h 用整個 CG 高（此工具無 roll center 輸入），略保守。
可選參數 tireRollFront/Rear：提供時會把輪胎柔度串聯進來反推懸吊端需求
`K_susp = 1/(1/K_axle − 1/K_tire)`，與 Tier 1 模型一致（否則裝上建議 ARB 後實際側傾比目標大 ~10-15%）；
輪胎柔度低於軸需求時回報 unreachable。「從預測帶入」會自動填彈簧端（非 total）剛性與輪胎剛性。

## 輪胎垂直彈簧率估算

```
K ≈ 220 × (55/aspect)^0.35 × (width/205)^0.3 × (0.15 + 0.85·P/2.2)   [N/mm]
```
胎壓為主導因素（實測約 80-90% 由胎壓決定）。校準點：205/55R16 @2.2bar ≈ 220；255/40R17 RE-71R 實測 ≈250（本式估 263）。乘用車實測範圍約 188-320 N/mm。

## 已知簡化（非 bug）

- LLTD 忽略簧下質量項
- Ride frequency 質量含簧下
- 阻尼 MR 假設與彈簧相同
- 各項 US shift 的縮放係數（×30/×20/×1.5/×0.1/×0.3、/15 正規化）為啟發式調校值，
  合成的 US gradient 是定性指標，不是可量測的 deg/g
- **兩個平衡指標的差異**：Tier 1 的 `understeer_gradient`（LLTD% − 配重%）是
  「側傾剛性分配 vs 配重」的相對平衡指標；Tier 3 的線性 K_us 是荷重敏感度驅動的
  絕對理論值。前重 FF 車兩者可能一正一負（LLTD 指標說 OS、線性 K_us 說 US）——
  前者回答「setup 相對這台車偏哪邊」，後者回答「這台車先天偏哪邊」，並不矛盾
- Pacejka 的 race 與 semi_slick 係數目前相同（占位值，待有實測資料再分化）
- 線性模型的 camber 效應極小（~1%/3°），主要 camber 影響由 camberGripFactor 啟發式承擔

## 參考文獻

- Milliken & Milliken, *Race Car Vehicle Dynamics*, SAE, 1995
- Gillespie, *Fundamentals of Vehicle Dynamics*, SAE, 1992（ch.6）
- OptimumG Tech Tips: Springs & Dampers Part 1 & 2 (optimumg.com)
- Suspension Secrets: Wheel Rate & Chassis Roll Stiffness
- Bakker, Pacejka, Lidner, SAE 890087（Pacejka '89）
- kktse.github.io: RE-71R 255/40R17 vertical stiffness measurement
