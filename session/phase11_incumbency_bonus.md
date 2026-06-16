# Phase 11: 現職・元職ボーナスの実装

> 受付日: 2026-06-15

---

## タスク一覧

| ID | タスク | 状態 |
|---|---|---|
| P11-1 | `calculateScore` に現職・元職ボーナスを追加（`scoring.ts` + `runner.ts`） | ✅ 完了（2026-06-15） |
| P11-2 | `AboutFormulas.tsx` を P11-1 実装後の仕様に更新 | ✅ 完了（2026-06-15） |

---

## 背景・設計方針

### データの実態

`candidates.json` の `status` × `elected` クロス集計：

| status | elected | 件数 | 意味 |
|---|---|---|---|
| 元職 | smd_win | 215 | 元職が小選挙区で当選 |
| 元職 | proportional_win | 41 | 元職が比例で復活当選 |
| 元職 | lose | 157 | 元職が落選 |
| 新人 | smd_win | 74 | 新人が小選挙区で当選 |
| 新人 | proportional_win | 51 | 新人が比例で復活当選 |
| 新人 | lose | 581 | 新人が落選 |

> `status === '現職'` のデータは 0 件（2026 年衆院選時点で議会解散中のため go2senkyo が全員を 元職/新人 で分類している）

### ボーナス定義（ユーザー要求）

| 区分 | 判定条件 | ボーナス範囲 |
|---|---|---|
| **現職** | `elected === 'smd_win' OR 'proportional_win'`（2026年に実際に当選） | **10〜20%** |
| **元職** | `status === '元職' AND elected === 'lose'`（議員経験あり・今回落選） | **5〜15%** |
| **新人** | 上記以外 | 0% |

> 優先順位: 現職 > 元職（当選した元職は現職扱い）

### ウェイト配分の方針（ユーザー指示）

ボーナス分は **VoteRate・GroundBonus・HomeBonus・Random の 4 因子から比例的に差し引く**。  
AgeBonus は対象外（変更しない）。

---

## P11-1: scoring.ts + runner.ts の実装

### 変更ファイル

- `src/engine/scoring.ts`（`calculateScore` のシグネチャ追加）
- `src/engine/runner.ts`（ボーナス計算・`calculateScore` 呼び出し変更）
- `src/types/election.ts`（不要なら変更なし）

### scoring.ts の変更

#### `calculateScore` にパラメータ追加

```typescript
export function calculateScore(
  candidate: Candidate,
  constituency: Constituency,
  randomValue: number,
  params: ScoringParams = DEFAULT_SCORING_PARAMS,
  voteSplitContext?: { samePartyCount: number; sameBlocCount: number },
  originalConstituency?: Constituency,
  random: () => number = Math.random,
  incumbencyBonus: number = 0,   // ← 追加（pre-computed / default 0）
): number
```

> `incumbencyBonus` は runner.ts 側で計算して渡す。`calculateScore` 内部では `random()` を追加呼び出ししない（既存テストの PRNG シーケンスを壊さないため）。

#### `calculateScore` 内部ロジック変更

```typescript
// 既存の 4 因子ウェイトから incumbencyBonus 分を比例的に差し引く
const otherTotal = originalVoteRateWeight + groundWeight + homeWeight + randomWeight
const scale = otherTotal > 0
  ? Math.max(0, otherTotal - incumbencyBonus) / otherTotal
  : 1

const baseScore =
  voteScore   * (originalVoteRateWeight * scale) +
  groundScore * (groundWeight          * scale) +
  ageScore    *  ageWeight                       +  // 変更なし
  randScore   * (randomWeight          * scale) +
  homeScore   * (homeWeight            * scale) +
  incumbencyBonus                                   // 現職/元職ボーナス（スコアは常に 1.0）
```

**合計ウェイトの整合性確認**:
```
合計 = (w_v + w_g + w_r + w_h) × scale + w_a + incumbencyBonus
     = (otherTotal - incumbencyBonus) + w_a + incumbencyBonus
     = otherTotal + w_a
     = 全ウェイト合計 = 1.0  ✓
```

---

### runner.ts の変更

#### ボーナス計算（各候補者ごとに PRNG で生成）

```typescript
// 各候補者のループ内（assignmentMap 処理中）
const rawInc = rand()   // 常に 1 回呼ぶ（PRNG シーケンス安定化）
const incumbencyBonus =
  c.elected === 'smd_win' || c.elected === 'proportional_win'
    ? 0.10 + rawInc * 0.10   // 現職: 0.10〜0.20
    : c.status === '元職'
    ? 0.05 + rawInc * 0.10   // 元職（落選）: 0.05〜0.15
    : 0.0                    // 新人: 0
```

> `rand()` を **常に 1 回** 呼ぶ（新人でも `rawInc` を消費する）ことで、
> 候補者の順番・構成が変わっても PRNG シーケンスが乱れないようにする。

#### `calculateScore` 呼び出し変更

```typescript
finalScore: calculateScore(
  c, constituency, rand(), params,
  { samePartyCount, sameBlocCount },
  originalConstituency, rand,
  incumbencyBonus,    // ← 追加
),
```

---

### テスト方針

既存テスト（43件）の PRNG シーケンスへの影響:
- `calculateScore` のシグネチャ変更はオプショナル引数なので、既存テストは `incumbencyBonus = 0` で動作する
- ただし `runner.ts` 内で `rand()` の呼び出し順が変わるため、runner 系の統合テストがある場合は確認が必要

> 新テストの追加候補:
> - `incumbencyBonus = 0.15` を渡したとき 4 因子ウェイトが正しく縮小されること
> - 現職候補の finalScore が新人候補より統計的に高くなる傾向があること

---

### 完了条件

- [ ] `calculateScore` が `incumbencyBonus` 引数を受け取り、4 因子ウェイトを比例縮小する
- [ ] `runner.ts` が各候補の区分（現職/元職/新人）に応じてボーナスを生成して渡す
- [ ] 現職ボーナス 10〜20%・元職ボーナス 5〜15% の範囲に収まっていること
- [ ] ビルド成功・既存テスト 43 件全通過

---

## P11-2: AboutFormulas.tsx の更新

P11-1 完了後、`src/components/AboutFormulas.tsx` のセクション1（FinalScore）を修正する。

### 変更内容

#### セクション1 計算式文字列

```diff
- FinalScore = (w₁×VoteRate + w₂×GroundBonus + w₃×AgeBonus + w₄×Random + w₅×HomeBonus) × VoteSplitPenalty
+ FinalScore = (w₁×VoteRate + w₂×GroundBonus + w₃×AgeBonus + w₄×Random + w₅×HomeBonus + IncumbencyBonus) × VoteSplitPenalty
```

#### 因子テーブルへの行追加

| 因子 | 重み（実効範囲） | 内容 |
|---|---|---|
| IncumbencyBonus | 0〜20%（候補者依存） | 現職 10〜20% / 元職 5〜15% / 新人 0%（他4因子から比例差引き） |

#### IncumbencyBonus の詳細説明セクション追加（新規）

```
現職（2026年当選: 小選挙区・比例復活含む）→ IncumbencyBonus = 0.10〜0.20（乱数）
元職（議員経験あり・2026年落選）         → IncumbencyBonus = 0.05〜0.15（乱数）
新人（議員経験なし）                     → IncumbencyBonus = 0

IncumbencyBonus 分は VoteRate・GroundBonus・HomeBonus・Random から比例的に差し引かれる。
AgeBonus は差引き対象外。
```

#### セクション1 ウェイト注記の更新

`IncumbencyBonus` は `ScoringParams` のグローバルウェイトではなく、
**各候補者ごとに PRNG から個別に生成**される点を明記する。

---

### 完了条件（P11-2）

- [ ] 計算式文字列に `IncumbencyBonus` が追加されている
- [ ] 因子テーブルに現職/元職/新人の 3 区分とボーナス範囲が掲載されている
- [ ] 他 4 因子から比例差引きされる旨が説明されている
- [ ] ビルド成功・テスト全通過
