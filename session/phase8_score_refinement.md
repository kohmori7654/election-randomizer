# Phase 8: スコア計算式精緻化

> 受付日: 2026-06-15
> 依頼1〜3に対応。すべて未着手。

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P8-1 | 地盤スコア（HomeBonus）追加 — 20%影響度 | P7-5 | ✅ 完了 (2026-06-15) |
| P8-2 | 票割れ補正をランダム係数に変更 | P7-5 | ✅ 完了 (2026-06-15) |
| P8-3 | スコアウェイトを毎シミュレーションごとランダム変動に | P8-1, P8-2 | ✅ 完了 (2026-06-15) |

---

## P8-1: 地盤スコア（HomeBonus）追加

### 依頼内容

本来の選挙区と割り当て先選挙区との距離・一致度でスコアが変わる「地盤」要素を追加する。
影響度はスコア全体の **20%程度**（P8-3で最終ウェイトを調整）。

### 判定ロジック（4段階）

| 条件 | 係数（案） |
|---|---|
| 本来の選挙区と同じ（`assignedConstituencyId === candidate.senkyokuId`） | 1.0 |
| 同じ都道府県（`assigned.prefecture === candidate.prefecture`） | 0.7 |
| 同じブロック（`assigned.bloc === candidate.bloc`） | 0.4 |
| 異なるブロック → 距離に応じて減衰 | 0.0 〜 0.3（距離ベース） |

異なるブロックの場合は既存の `haversine` 距離計算を流用し、最遠2,200kmを下限0.0にマッピングする：

```typescript
// 異なるブロック時
const distKm = haversineDistance(origLat, origLng, assignedLat, assignedLng)
const homeScore = Math.max(0.0, 0.3 * (1 - distKm / 2200))
```

### 変更ファイル

- `src/engine/scoring.ts`
  - `calculateScore` の引数に `assignedConstituency: Constituency`（割り当て先）を追加
  - `candidate.senkyokuId` と `constituency.id` で4段階判定
  - ウェイトは `params.homeWeight` で受け取る
- `src/types/election.ts`
  - `ScoringParams` に `homeWeight: number` を追加
- `src/engine/__tests__/scoring.test.ts`
  - HomeBonus のテストケースを追加

### 前提確認

- `Candidate.senkyokuId`: 本来の選挙区ID（既存フィールド）
- `Constituency.prefecture` / `Constituency.bloc`: 都道府県・ブロック（既存フィールド）
- `Constituency.lat` / `Constituency.lon`: 緯度経度（既存フィールド）
- `runner.ts` では `calculateScore` を呼ぶ際に「候補者の本来の選挙区情報」も渡す必要がある

### 完了条件

- [ ] `HomeBonus` が4段階で正しく計算される（テスト）
- [ ] 本来の選挙区 = 1.0、異なるブロック（距離最大）= 0.0 付近（テスト）
- [ ] `runner.ts` で `calculateScore` を呼ぶ際に割り当て先選挙区を正しく渡している
- [ ] 全 Vitest テストが通過する

---

## P8-2: 票割れ補正をランダム係数に変更

### 依頼内容

現状の `calcVoteSplitPenalty` における同一政党ペナルティを、固定係数からランダム範囲に変更する。

### 変更仕様

| 状況 | 現状 | 変更後 |
|---|---|---|
| 同一政党2人立候補 | `× 0.5`（固定） | `× random(0.70, 0.80)` |
| 同一政党3人立候補 | `× 0.33`（固定） | `× random(0.50, 0.70)` |
| 同一政党4人以上 | `× 1/(N)` | 変更なし（現行ロジック維持） |
| イデオロギーブロックペナルティ | `1 - 0.05 × count` | 変更なし |

> 2人・3人の場合のみランダム係数に変更。4人以上は既存ロジックのまま。

### 変更箇所

```typescript
// src/engine/scoring.ts
export function calcVoteSplitPenalty(
  samePartyCount: number,
  sameBlocCount: number,
  random: () => number = Math.random,  // ← 外部注入でテスト可能に
): number {
  let partyPenalty: number
  if (samePartyCount === 1) {
    partyPenalty = 0.70 + random() * 0.10  // 0.70〜0.80
  } else if (samePartyCount === 2) {
    partyPenalty = 0.50 + random() * 0.20  // 0.50〜0.70
  } else if (samePartyCount > 2) {
    partyPenalty = 1 / (samePartyCount + 1)  // 現行ロジック
  } else {
    partyPenalty = 1.0
  }

  const blocPenalty = sameBlocCount > 0 ? 1 - 0.05 * sameBlocCount : 1.0
  return Math.min(1, partyPenalty * blocPenalty)
}
```

> `runner.ts` で `calcVoteSplitPenalty` を呼ぶ際は既存の乱数生成器（`rand`）を渡す。

### 完了条件

- [ ] `samePartyCount=1` のとき結果が `[0.70, 0.80]` の範囲に収まる（テスト: 複数回実行）
- [ ] `samePartyCount=2` のとき結果が `[0.50, 0.70]` の範囲に収まる（テスト）
- [ ] `samePartyCount=3` 以上のとき現行ロジック（`1/(N+1)`）が適用される（テスト）
- [ ] イデオロギーブロックペナルティは変更なし（既存テスト継続通過）
- [ ] 全 Vitest テストが通過する

---

## P8-3: スコアウェイトを毎シミュレーションごとランダム変動

### 依頼内容

各シミュレーション実行時に `ScoringParams` のウェイトがランダムに変動するようにする。
各要素の範囲は以下（依頼3の参考値）：

| 因子 | 変動範囲 |
|---|---|
| VoteRate (`originalVoteRateWeight`) | 45〜55% |
| GroundBonus（既存の `groundWeight`） | 15〜25% |
| AgeBonus（`ageWeight`） | 3〜10% |
| Random（`randomWeight`） | 5〜25% |
| HomeBonus（`homeWeight`、P8-1で追加） | 15〜25% |

> 合計が必ずしも 100% になる保証は不要だが、スコアは最後に `Math.min(1, Math.max(0, ...))` でクランプするため問題ない。
> ただし加重和の設計上は合計≒1.0 に近づけておくことが望ましい。  
> → 各ウェイトを独立にランダムサンプリングし、合計で除して正規化する方式を推奨。

### 実装方針

```typescript
// src/engine/scoring.ts に追加
export function randomizeScoringParams(random: () => number = Math.random): ScoringParams {
  const raw = {
    originalVoteRateWeight: 0.45 + random() * 0.10,  // 0.45〜0.55
    groundWeight:           0.15 + random() * 0.10,  // 0.15〜0.25
    ageWeight:              0.03 + random() * 0.07,  // 0.03〜0.10
    randomWeight:           0.05 + random() * 0.20,  // 0.05〜0.25
    homeWeight:             0.15 + random() * 0.10,  // 0.15〜0.25
  }
  // 正規化（合計1.0に）
  const total = Object.values(raw).reduce((s, v) => s + v, 0)
  return {
    originalVoteRateWeight: raw.originalVoteRateWeight / total,
    groundWeight:           raw.groundWeight / total,
    ageWeight:              raw.ageWeight / total,
    randomWeight:           raw.randomWeight / total,
    homeWeight:             raw.homeWeight / total,
  }
}
```

`runner.ts` の `runSimulation` 内でシミュレーション開始時に `randomizeScoringParams()` を呼び、全選挙区で同一のパラメータを使う。

### 変更ファイル

- `src/engine/scoring.ts`: `randomizeScoringParams` 関数を追加
- `src/engine/runner.ts`（または `simulator.ts`）: `runSimulation` 冒頭で `randomizeScoringParams()` を呼び出す
- `src/engine/__tests__/scoring.test.ts`: `randomizeScoringParams` のテストを追加

### 完了条件

- [ ] `randomizeScoringParams` の出力ウェイト合計が 1.0 になる（テスト）
- [ ] 各ウェイトが指定範囲内に収まる（テスト: 100回サンプリング）
- [ ] `runSimulation` を2回呼ぶと異なるウェイトが使われる（スナップショット確認）
- [ ] 全 Vitest テストが通過する

---

## 実装順序（推奨）

```
P8-1（HomeBonus追加）→ P8-2（票割れランダム化）→ P8-3（ウェイトランダム化）
```

P8-2はP8-1と独立しているが、P8-3はP8-1で `homeWeight` が追加された後に実装する。
