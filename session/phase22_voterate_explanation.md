# Phase 22: VoteRate（originalVoteRate）算出根拠の明確化

## ユーザー質問

「VoteRateは何をもって算出されているのか説明してください」

## 現状の説明（コードから判明した事実）

`originalVoteRate` は **2024年衆院選（第50回）の実際の小選挙区得票率** である。

### データソース

`public/data/candidates.json` の各候補者レコードに直接格納されている実績値:

```json
{
  "id": 1,
  "senkyokuId": 51034,
  "constituencyName": "北海道1区",
  "nameKanji": "かとう 貴弘",
  "partyId": "ldp",
  "originalVoteRate": 0.436,   ← これ（43.6%）
  "votes": 112618,
  "elected": "smd_win"
}
```

### 算出式（推定）

```
originalVoteRate = 当該候補者の得票数 / 選挙区内の有効投票総数
```

例: かとう貴弘 = 112618票 / 北海道1区の総票数 ≈ 43.6%

### シミュレーション内での使われ方

1. **スコアリング（scoring.ts）**: FinalScore の 40〜55% の重みで使用
   ```
   FinalScore ≈ w₁×VoteRate + w₂×GroundBonus + ... + IncumbencyBonus
   ```

2. **惜敗率計算（runner.ts）**: 比例復活の惜敗率算出に使用
   ```
   実績惜敗率 = 落選者.originalVoteRate / 当選者.originalVoteRate
   ```

3. **落下傘・死に票グループ検出（deathGroup.ts）**: 実際の選挙の強さ判定に使用

### なぜ `votes` でなく `originalVoteRate` を使うか

- 選挙区によって有権者数が異なるため、票数の絶対値は比較できない
- 得票率（相対値）の方が「候補者の強さ」を正確に表現できる

## UI での現状説明

`src/components/AboutFormulas.tsx:182` に以下の記載がある:

```
VoteRate | 実際の得票率（originalVoteRate）
```

→ 「2024年衆院選の小選挙区実績得票率」という情報が欠けている

## タスク

### P22-1: AboutFormulas.tsx の VoteRate 説明を強化

**対象ファイル**: `src/components/AboutFormulas.tsx`

VoteRate の説明を以下のように更新:
- 現在: 「実際の得票率（`originalVoteRate`）」
- 改善後: 「2024年衆院選の小選挙区実績得票率（`votes ÷ 区内有効投票総数`）」

また、変数説明テーブルに補足を追加し、ランダマイザーの「基準値」であることを明示する。

## ステータス

- [ ] P22-1: AboutFormulas.tsx の説明強化
