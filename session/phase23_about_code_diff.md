# Phase 23: About ページとソースコードの差異修正

> 受付日: 2026-06-16

---

## 背景

`http://localhost:5173/election_randomizer/#/about` の表示内容を
現行ソースコード（`scoring.ts` / `runner.ts` / `parties.ts`）と照合した結果、
以下の差異が判明した。

---

## 差異一覧

### 差異①: VoteRate の説明が不足（P22-1と統合）

| | 内容 |
|---|---|
| About現状 | `実際の得票率（originalVoteRate）` |
| ソースコード | `candidates.json` に格納された第51回衆院選（2026年）の小選挙区実績得票率 |
| 修正方針 | 「第51回衆院選（2026年2月8日）の小選挙区実績得票率（votes ÷ 区内有効投票総数）」と明記 |

**対象箇所**: `src/components/AboutFormulas.tsx:182`

---

### 差異②: 実効重み範囲の数値が不正確

`randomizeScoringParams` のraw範囲から計算した正確な実効範囲:

| 因子 | About記載 | 正確な値 | 誤差 |
|---|---|---|---|
| VoteRate | 約35〜55% | 約35〜59% | max+4%pt |
| GroundBonus | 約11〜22% | 約12〜27% | max+5%pt |
| AgeBonus | **約2〜8%** | **約2〜11%** | max+3%pt ← 最大誤差 |
| Random | 約4〜20% | 約4〜24% | max+4%pt |
| HomeBonus | 約11〜22% | 約12〜27% | max+5%pt |

**計算根拠**:
- 正規化後のmin = `raw_min(i)` / (`raw_max(全other)` + `raw_min(i)`)
- 正規化後のmax = `raw_max(i)` / (`raw_min(全other)` + `raw_max(i)`)

**対象箇所**: `src/components/AboutFormulas.tsx:181〜215`（テーブルと青いノート）

---

## タスク

| ID | タスク | 状態 |
|---|---|---|
| P23-1 | VoteRate の説明強化（差異①）← P22-1を取り込んで実施 | ✅完了 |
| P23-2 | 実効重み範囲の数値修正（差異②）| ✅完了 |

---

### P23-1 実装詳細

**対象**: `src/components/AboutFormulas.tsx`

テーブル行:
```tsx
// 変更前
<td className="px-3 py-1.5">実際の得票率（<code>originalVoteRate</code>）</td>

// 変更後
<td className="px-3 py-1.5">
  第51回衆院選（2026年）の小選挙区実績得票率
  （<code>votes ÷ 区内有効投票総数</code>）
</td>
```

---

### P23-2 実装詳細

**対象**: `src/components/AboutFormulas.tsx`

テーブルの「重み（実効範囲）」列を修正:

| 因子 | 変更前 | 変更後 |
|---|---|---|
| VoteRate | 約 35〜55% | 約 35〜59% |
| GroundBonus | 約 11〜22% | 約 12〜27% |
| AgeBonus | 約 2〜8% | 約 2〜11% |
| Random | 約 4〜20% | 約 4〜24% |
| HomeBonus | 約 11〜22% | 約 12〜27% |

青いノート（`mt-3 bg-blue-50...`）内のraw範囲テキストは現行コードと一致しているため変更不要:
- `raw 変動範囲: VoteRate 0.45〜0.55 / GroundBonus 0.15〜0.25 / AgeBonus 0.03〜0.10 / Random 0.05〜0.25 / HomeBonus 0.15〜0.25`

---

## ステータス

- [x] P23-1: VoteRate 説明強化
- [x] P23-2: 実効重み範囲修正
