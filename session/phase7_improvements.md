# Phase 7: UI改善・スコア計算式改革・票割れシミュレーション

> 受付日: 2026-06-15
> Phase 6 の後続タスク群。依頼1〜3に対応。

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P7-1 | 初回ロード時に自動シミュレーション実行 | P2-1（App.tsx） | ✅ 完了 |
| P7-2 | 「シミュレーション実行」→「シミュレーション再実行」ボタン変更 | P7-1 | ✅ 完了 |
| P7-3 | StatusBonus廃止（scoring.ts・テスト修正） | P1-5 | ✅ 完了 |
| P7-4 | GroundBonusのデータ根拠を AboutFormulas.tsx に記載 | P6-5 | ✅ 完了 |
| P7-5 | 票割れシミュレーション（同一政党・保守革新系） | P7-3 | ✅ 完了 |

---

## P7-1: 初回ロード時に自動シミュレーション実行

### 依頼内容
ページを開いた瞬間に1回目のシミュレーションが自動実行されるようにする。

### 現状
`App.tsx` でシミュレーションは「シミュレーション実行」ボタン押下時のみ実行される。
初期状態は `ready` フェーズで、ユーザーのボタン操作が必要。

### 実装方針

```tsx
// src/App.tsx
import { useEffect, useRef } from 'react'

// マウント時に1度だけ自動実行
const hasMounted = useRef(false)
useEffect(() => {
  if (!hasMounted.current) {
    hasMounted.current = true
    handleSimulate()   // 既存のシミュレーション実行関数を呼ぶ
  }
}, [])
```

- `useRef` で StrictMode の二重発火を防ぐ
- `handleSimulate` が非同期の場合は `void handleSimulate()` とする

### 完了条件
- [ ] ページをリロードした直後に自動でシミュレーション結果が表示される
- [ ] ボタン押下でも再実行可能（既存動作を壊さない）
- [ ] テストが全通過する

---

## P7-2: 「シミュレーション実行」→「シミュレーション再実行」

### 依頼内容
右上の「シミュレーション実行」ボタンのテキストを「シミュレーション再実行」に変更する。
（P7-1で初回実行が自動化されるため、ボタンは常に「再実行」扱い）

### 変更箇所
`src/components/Header.tsx` の該当ボタンテキスト。

```diff
- シミュレーション実行
+ シミュレーション再実行
```

### 完了条件
- [ ] ボタンテキストが「シミュレーション再実行」になっている
- [ ] ローディング中の表示文字列も一貫して変更（例:「実行中...」は維持でも可）

---

## P7-3: StatusBonus廃止

### 依頼内容
スコア計算式から `StatusBonus`（現職/元職/新人の補正）を廃止する。

### 現状（`src/engine/scoring.ts`）

```typescript
export const DEFAULT_SCORING_PARAMS: ScoringParams = {
  originalVoteRateWeight: 0.30,
  statusWeight:           0.20,   // ← 廃止
  groundWeight:           0.20,
  ageWeight:              0.05,
  randomWeight:           0.25,
}

const STATUS_SCORE: Record<Candidate['status'], number> = {
  '現職': 1.0,
  '元職': 0.6,
  '新人': 0.3,
}
```

### 修正方針

StatusBonus廃止後のウェイト再配分案（合計 1.0 を維持）:

| 因子 | 現状 | 廃止後（案） |
|---|---|---|
| originalVoteRate | 0.30 | 0.40 |
| status | 0.20 | **廃止** |
| ground | 0.20 | 0.25 |
| age | 0.05 | 0.10 |
| random | 0.25 | 0.25 |

> 最終的なウェイト値はユーザー確認後に確定する。

### 変更ファイル
- `src/engine/scoring.ts`: `STATUS_SCORE`・`statusScore`・`statusWeight` 削除、ウェイト更新
- `src/types/election.ts`: `ScoringParams` から `statusWeight` フィールド削除
- `src/engine/__tests__/scoring.test.ts`: StatusBonus に関するテストケース削除・更新
- `session/phase6_enhancements.md` P6-5 の AboutFormulas.tsx 記述も更新

### 完了条件
- [ ] `STATUS_SCORE`・`statusScore`・`statusWeight` が `scoring.ts` から削除されている
- [ ] ウェイトの合計が 1.0 になっている
- [ ] `ScoringParams` 型から `statusWeight` が削除されている
- [ ] 全 Vitest テストが通過する

---

## P7-4: GroundBonusのデータ根拠を AboutFormulas.tsx に記載

### 依頼内容（調査・説明）

GroundBonus（地盤補正）の元データについてユーザーから説明を求められた。
現状のデータ根拠を `AboutFormulas.tsx` に記載する。

### 現状のデータ根拠（調査結果）

#### 選挙区の政治的傾向（voterTrend）

**算出方法**: `scripts/scrape_constituencies.py` の `calc_voter_trend()` で生成。

```
voterTrend = Σ(候補者得票数 × 政党スコア) / Σ(候補者得票数)
```

**元データ**: 第51回衆院選の実際の得票数（`candidates.json` の `votes` フィールド）と
各政党の政治スコア（`PARTY_POLITICAL_SCORE`）を使い、
候補者の得票比率で加重平均した値。

> つまり「実際にどの政党がどれだけ票を集めたか」から逆算した選挙区の政治的重心。
> 選挙区に保守系候補が多く票を集めたほど 1.0 に近づく（範囲: 0.353〜0.763）。

#### 各政党の政治的傾向（PARTY_POLITICAL_SCORE）

**根拠**: 設計者が定性的に設定した値（0=左 〜 1=右）。
客観的な第三者調査や学術データに基づくものではなく、
一般的なイデオロギー配置のコンセンサスに基づく。

| 政党 | parties.ts | scrape_constituencies.py | 備考 |
|---|---|---|---|
| 自民 (ldp) | 0.80 | 0.70 | ⚠️ 値が異なる |
| 維新 (ishin) | 0.50 | 0.60 | ⚠️ 値が異なる |
| 中道改革連合 (crc) | 0.30 | 0.35 | 微差 |
| 国民 (dpfp) | 0.40 | 0.50 | ⚠️ 値が異なる |
| 参政党 (sansei) | 0.70 | 0.90 | ⚠️ 値が異なる |
| みらい (tm) | 0.45 | 0.50 | 微差 |
| 共産 (jcp) | 0.10 | 0.10 | 一致 |
| れいわ (reiwa) | 0.20 | 0.15 | 微差 |
| 減税 (genzei) | 0.60 | 0.30 | ⚠️ 大きく乖離 |
| NHK党 (nhk) | 0.50 | 0.85 | ⚠️ 大きく乖離 |
| 社民 (sdp) | 0.20 | 0.05 | 微差 |
| 無所属 (ind) | 0.50 | 0.50 | 一致 |

**問題点**: `parties.ts`（フロントエンド側）と `scrape_constituencies.py`（データ生成側）で
値が一致していない。スコアの根拠を統一・明文化する必要がある。

### タスク内容

1. 上記の不一致を解消し、両ファイルのスコアを統一する
2. `AboutFormulas.tsx` にGroundBonusの説明を追加
   - voterTrendの算出方法
   - PARTY_POLITICAL_SCOREの根拠・各政党の値
   - 「あくまでシミュレーション上の近似値であり、公式データではない」旨の免責文を追記

### 完了条件
- [ ] `parties.ts` と `scrape_constituencies.py` の `PARTY_POLITICAL_SCORE` が統一されている
- [ ] `AboutFormulas.tsx` にGroundBonusのデータ根拠が記載されている
- [ ] 免責文が表示されている

---

## P7-5: 票割れシミュレーション

### 依頼内容

以下のケースでの票の分裂をシミュレーションに組み込む：

1. **同一政党からの複数候補立候補**: 同じ選挙区に同一政党の候補が2人以上いる場合、
   票を分け合う（共食い）現象をスコアに反映する
2. **保守系・革新系の複数候補立候補**: 同一イデオロギーブロック内で複数候補が立候補した場合、
   互いにスコアが下がる

### 現状

`src/engine/scoring.ts` の `calculateScore` は個別候補者のスコアを算出するが、
同一選挙区内の他候補者を考慮しない。

### 設計方針（案）

#### ブロック定義

```typescript
// src/data/parties.ts に追加
export const IDEOLOGICAL_BLOC: Record<PartyId, 'conservative' | 'progressive' | 'center'> = {
  ldp:    'conservative',  // 保守
  sansei: 'conservative',  // 保守
  genzei: 'conservative',  // 保守（民族主義系）
  nhk:    'conservative',  // 保守
  ishin:  'center',        // 改革中道
  dpfp:   'center',        // 中道
  tm:     'center',        // 中道
  crc:    'progressive',   // 革新寄り中道
  jcp:    'progressive',   // 革新
  reiwa:  'progressive',   // 革新
  sdp:    'progressive',   // 革新
  ind:    'center',        // 中立
}
```

#### 票割れ係数（VoteSplitPenalty）

```typescript
/**
 * 同一選挙区内の競合候補数に応じてスコアにペナルティを与える。
 * @param samePartyCount 同一政党の競合数（自分を除く）
 * @param sameBlocCount  同一イデオロギーブロックの競合数（自分を除く・同一政党を含まない）
 */
export function calcVoteSplitPenalty(
  samePartyCount: number,
  sameBlocCount: number,
): number {
  const partyPenalty = samePartyCount > 0 ? 1 / (samePartyCount + 1) : 1.0
  const blocPenalty  = sameBlocCount  > 0 ? 1 - 0.05 * sameBlocCount : 1.0  // 緩め
  return Math.min(1, partyPenalty * blocPenalty)
}
```

#### `calculateScore` のシグネチャ変更

```typescript
export function calculateScore(
  candidate: Candidate,
  constituency: Constituency,
  randomValue: number,
  params: ScoringParams = DEFAULT_SCORING_PARAMS,
  voteSplitContext?: {          // 追加（省略可能）
    samePartyCount: number
    sameBlocCount: number
  }
): number {
  // ...既存ロジック...

  const voteSplitPenalty = voteSplitContext
    ? calcVoteSplitPenalty(voteSplitContext.samePartyCount, voteSplitContext.sameBlocCount)
    : 1.0

  const raw = (... 既存の加重和 ...) * voteSplitPenalty
  return Math.min(1, Math.max(0, raw))
}
```

#### `runner.ts` での呼び出し変更

`runSimulation` 内で選挙区ごとのスコア計算ループに以下を追加:

```typescript
// 選挙区内の政党・イデオロギーブロックの競合数を事前集計
for (const [constId, assignedCandidates] of entries) {
  // partyId ごとの候補者数
  const partyCountMap = Map<PartyId, number>
  const blocCountMap  = Map<string, number>

  for (const c of assignedCandidates) {
    partyCountMap.set(c.partyId, (partyCountMap.get(c.partyId) ?? 0) + 1)
    const bloc = IDEOLOGICAL_BLOC[c.partyId] ?? 'center'
    blocCountMap.set(bloc, (blocCountMap.get(bloc) ?? 0) + 1)
  }

  for (const c of assignedCandidates) {
    const samePartyCount = (partyCountMap.get(c.partyId) ?? 1) - 1
    const bloc = IDEOLOGICAL_BLOC[c.partyId] ?? 'center'
    const sameBlocCount = ((blocCountMap.get(bloc) ?? 1) - 1) - samePartyCount
    const score = calculateScore(c, constituency, rand(), params, { samePartyCount, sameBlocCount })
    // ...
  }
}
```

### 完了条件
- [ ] `IDEOLOGICAL_BLOC` を `parties.ts` に追加
- [ ] `calcVoteSplitPenalty` を `scoring.ts` に追加
- [ ] `calculateScore` のシグネチャに `voteSplitContext` を追加（省略可能で後方互換）
- [ ] `runner.ts` で選挙区内の競合数を集計してスコア計算に渡している
- [ ] 同一政党2候補が同一選挙区に入る場合、それぞれのスコアが単独立候補時の約50%になる（テスト）
- [ ] 保守系3候補が集中する場合にもペナルティが入っている（テスト）
- [ ] 全 Vitest テストが通過する
