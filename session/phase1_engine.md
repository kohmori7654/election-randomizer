# Phase 1: プロジェクト基盤＋シミュレーションエンジン（TDD）

> 参照: `Implementation_Plan.md` § Phase 1
> TDD（Red → Green → Refactor）で実装すること

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P1-1 | Reactプロジェクト初期化 | なし | 未着手 |
| P1-2 | `src/types/election.ts` 全型定義 | P1-1 | 未着手 |
| P1-3 | `src/data/parties.ts` 政党マスタ | P1-1 | 未着手 |
| P1-4 | `src/engine/simulator.ts` シャッフル・割り振り | P1-2 | 未着手 |
| P1-5 | `src/engine/scoring.ts` スコア計算5因子 | P1-2 | 未着手 |
| P1-6 | `src/engine/deathGroup.ts` 死の組判定 | P1-2 | 未着手 |
| P1-7 | `src/engine/proportional.ts` 比例復活 | P1-2, P1-5 | 未着手 |

---

## P1-1: Reactプロジェクト初期化

### 実行コマンド
```bash
cd /home/takamim/repos/election_randomizer
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui @testing-library/react
npx tailwindcss init -p
```

### 設定ファイル

**`vite.config.ts`**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/election_randomizer/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

**`package.json` scripts 追加**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

**`tsconfig.json`**: `"strict": true` を確認

### 完了条件
- [ ] `npm run dev` でVite開発サーバーが起動する
- [ ] `npm test` でVitestが起動する（テストなしで0件合格）
- [ ] Tailwind CSS がビルドに適用される

---

## P1-2: `src/types/election.ts` 全型定義

### 実装すべき型（`Implementation_Plan.md` §1-1 参照）

- `CandidateStatus`: `'現職' | '元職' | '新人'`
- `Camp`: `'ruling' | 'opposition_left' | 'opposition_center' | 'right'`
- `ProportionalBloc`: 11ブロックのユニオン型
- `Candidate`: 小選挙区候補者（proportionalInfo フィールド含む）
- `ProportionalEntry`: 比例名簿登載情報
- `ProportionalOnlyCandidate`: 比例単独候補
- `Constituency`: 小選挙区データ
- `ConstituencyResult`: シミュレーション結果（選挙区単位）
- `ScoredCandidate`: スコア付き候補者
- `DeathGroup`: 死の組情報
- `ProportionalRevivalResult`: 比例復活判定結果
- `SimulationResult`: シミュレーション全体結果
- `SeatCount`: 政党別議席数
- `ACTUAL_SEATS`: 実際の選挙結果定数
- `BLOC_COORDS`: 比例ブロック中心座標

### 完了条件
- [ ] TypeScript のコンパイルエラーが 0件
- [ ] 全型が `export` されている

---

## P1-3: `src/data/parties.ts` 政党マスタ

### 実装内容
`PARTY_DEFINITIONS` 配列（12政党 + 無所属）を実装する。

```typescript
// 確定値（変更禁止）
{ id: 'ldp',    name: '自由民主党',         politicalScore: 0.70, isRulingParty: true,  camp: 'ruling',            color: '#CC0000' }
{ id: 'ishin',  name: '日本維新の会',       politicalScore: 0.60, isRulingParty: true,  camp: 'ruling',            color: '#00A960' }
{ id: 'crc',    name: '中道改革連合',       politicalScore: 0.35, isRulingParty: false, camp: 'opposition_left',   color: '#009944' }
{ id: 'dpfp',   name: '国民民主党',         politicalScore: 0.50, isRulingParty: false, camp: 'opposition_center', color: '#F39800' }
{ id: 'sansei', name: '参政党',             politicalScore: 0.90, isRulingParty: false, camp: 'right',             color: '#FF6600' }
{ id: 'tm',     name: 'チームみらい',       politicalScore: 0.50, isRulingParty: false, camp: 'opposition_center', color: '#00A0E9' }
{ id: 'jcp',    name: '日本共産党',         politicalScore: 0.10, isRulingParty: false, camp: 'opposition_left',   color: '#E60012' }
{ id: 'reiwa',  name: 'れいわ新選組',       politicalScore: 0.15, isRulingParty: false, camp: 'opposition_left',   color: '#E4007F' }
{ id: 'nhk',    name: '日本保守党',         politicalScore: 0.85, isRulingParty: false, camp: 'right',             color: '#0083DE' }
{ id: 'sdp',    name: '社会民主党',         politicalScore: 0.05, isRulingParty: false, camp: 'opposition_left',   color: '#CC0066' }
{ id: 'genzei', name: '減税日本・ゆうこく連合', politicalScore: 0.30, isRulingParty: false, camp: 'opposition_left', color: '#2C3F8C' }
{ id: 'ind',    name: '無所属',             politicalScore: 0.50, isRulingParty: false, camp: 'right',             color: '#888888' }
```

ヘルパー関数も実装する:
```typescript
export function getPartyById(id: string): PartyDefinition | undefined
export function getPartyByName(name: string): PartyDefinition | undefined
export const RULING_PARTY_IDS: string[]  // ['ldp', 'ishin']
```

### 完了条件
- [ ] 全12政党 + 無所属が定義されている
- [ ] `getPartyById` / `getPartyByName` が正しく動作する

---

## P1-4: `src/engine/simulator.ts`

### 実装関数

```typescript
export function fisherYatesShuffle<T>(array: T[], rng?: () => number): T[]
export function assignCandidatesToConstituencies(
  candidates: Candidate[],
  constituencies: Constituency[]
): Map<number, Candidate[]>
export function runSimulation(
  candidates: Candidate[],
  constituencies: Constituency[],
  proportionalEntries: ProportionalEntry[],
  proportionalSeats: ProportionalSeatAllocation
): SimulationResult
```

### TDD テスト仕様

**`src/engine/simulator.test.ts`**

```typescript
describe('fisherYatesShuffle', () => {
  it('出力配列の長さが入力と同じ', () => { ... })
  it('同じシード乱数なら同じ結果', () => {
    const rng = createSeededRng(42)
    const a = fisherYatesShuffle([1,2,3,4,5], rng)
    const rng2 = createSeededRng(42)
    const b = fisherYatesShuffle([1,2,3,4,5], rng2)
    expect(a).toEqual(b)
  })
  it('全要素が元の配列に存在する（重複・欠損なし）', () => { ... })
})

describe('assignCandidatesToConstituencies', () => {
  it('全1,119候補者が過不足なく割り当てられる', () => { ... })
  it('候補者の重複がない', () => { ... })
  it('各選挙区の割当数が元の候補者数と一致する', () => { ... })
})

describe('runSimulation', () => {
  it('全289選挙区に当選者が存在する', () => { ... })
  it('政党別議席数の合計が289', () => { ... })
  it('実行時間が 150ms 以内', () => {
    const start = performance.now()
    runSimulation(mockCandidates, mockConstituencies, mockPR, mockPRSeats)
    expect(performance.now() - start).toBeLessThan(150)
  })
})
```

### 完了条件
- [ ] 全テストが Green
- [ ] 150ms 以内のパフォーマンステストが通過

---

## P1-5: `src/engine/scoring.ts`

### 実装関数

```typescript
export function calcBaseRate(candidate: Candidate): number
export function calcPartyCompetitionFactor(candidate: Candidate, all: Candidate[]): number
export function calcPositionFactor(candidate: Candidate, constituency: Constituency): number
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number
export function calcDistanceFactor(origLat: number, origLng: number, targetLat: number, targetLng: number): number
export function calcFameFactor(status: CandidateStatus): number
export function calcFinalScore(candidate: Candidate, constituency: Constituency, all: Candidate[], origLat: number, origLng: number): ScoredCandidate
```

### スコア計算式（確定）

```
FinalScore = BaseRate × PartyCompetitionFactor × PositionFactor × DistanceFactor × FameFactor

BaseRate               = originalVoteRate
PartyCompetitionFactor = 1.0 / N^0.7   （N = 同陣営候補者数）
PositionFactor         = clamp(0.7 + 0.6 × (1 - |politicalScore - voterTrend|), 0.7, 1.3)
DistanceFactor         = max(0.5, 1.0 - dist_km / 2000)
FameFactor             = 現職:1.3 / 元職:1.1 / 新人:0.8
```

### TDD テスト仕様（`src/engine/scoring.test.ts`）

各関数について最低以下をテスト:

| テスト対象 | ケース |
|---|---|
| calcBaseRate | originalVoteRate をそのまま返す |
| calcPartyCompetitionFactor | 単独=1.0、2人=1/2^0.7、3人=1/3^0.7 |
| calcPositionFactor | 完全マッチ=1.3、完全不一致=0.7、中間値が範囲内 |
| haversineDistance | 同一地点=0、北海道〜沖縄≈2,200km |
| calcDistanceFactor | 0km=1.0、2000km以上=0.5 |
| calcFameFactor | 現職=1.3、元職=1.1、新人=0.8 |
| calcFinalScore | NaN/Infinity が発生しない |

### 完了条件
- [ ] 全テストが Green
- [ ] `calcFinalScore` が `NaN` / `Infinity` を返さない

---

## P1-6: `src/engine/deathGroup.ts`

### 実装関数

```typescript
export const STRONG_CANDIDATE_THRESHOLD = 0.60

export function calcDeathGroupScore(
  constituency: Constituency,
  assignedCandidates: Candidate[]
): { strongCandidates: Candidate[]; deathGroupScore: number } | null

export function detectDeathGroups(
  constituencyResults: ConstituencyResult[],
  topN?: number
): DeathGroup[]
```

### 判定ロジック
- 強者 = `originalVoteRate >= 0.60` の候補者
- 強者が2人以上いる選挙区 = 死の組
- `deathGroupScore` = 強者の `originalVoteRate` 合計
- 上位 `topN`（デフォルト10）件をスコア降順で返す

### TDD テスト仕様（`src/engine/deathGroup.test.ts`）

```typescript
describe('detectDeathGroups', () => {
  it('強者が1人以下の選挙区は除外される')
  it('スコア降順で並んでいる')
  it('デフォルト topN=10 で最大10件')
  it('rank が 1 から連番')
  it('強者が3人いる選挙区は3人分のVoteRateが合計される')
})
```

### 完了条件
- [ ] 全テストが Green

---

## P1-7: `src/engine/proportional.ts`

### 実装関数

```typescript
export function calcSimulatedHaiseiritsu(
  loser: ScoredCandidate,
  winner: ScoredCandidate,
  allCandidates: ScoredCandidate[]
): { haiseiritsu: number; isEligible: boolean }

export function simulateProportionalRevival(
  constituencyResults: ConstituencyResult[],
  proportionalEntries: ProportionalEntry[],
  proportionalSeats: ProportionalSeatAllocation
): ProportionalRevivalResult[]
```

### 惜敗率計算式（確定）

```
simulatedHaiseiritsu = (loser.finalScore / winner.finalScore) × 100

供託物没収点代理判定:
estimatedVoteShare = FinalScore_i / Σ(全候補者のFinalScore in constituency)
isEligible = estimatedVoteShare >= 0.10
```

### 比例復活の決定アルゴリズム
1. 各 bloc × partyId ごとに処理
2. 比例単独候補 → `simulatedHaiseiritsu = null`, `isEligible = true`（変動なし）
3. 重複立候補者で小選挙区当選 → 比例不適格（除外）
4. 重複立候補者で小選挙区落選 → 新惜敗率で再ランク
5. 名簿順位（昇順）→ 同順位内は惜敗率（降順）でソート
6. 上位 N 人（`proportionalSeats[bloc][partyId]`）を当選とする

### TDD テスト仕様（`src/engine/proportional.test.ts`）

```typescript
describe('calcSimulatedHaiseiritsu', () => {
  it('loser.finalScore === winner.finalScore のとき 100.0')
  it('loser が winner の半分のスコアのとき 50.0')
  it('FinalScore比率 < 10% のとき isEligible=false')
  it('FinalScore比率 >= 10% のとき isEligible=true')
})

describe('simulateProportionalRevival', () => {
  it('比例単独候補は常に isEligible=true')
  it('小選挙区当選候補は wonProportional=false')
  it('各 bloc×party の当選者数が proportionalSeats と一致')
  it('同順位内で惜敗率が高い方が先に当選する')
})
```

### 完了条件
- [ ] 全テストが Green
- [ ] 各 bloc×party の当選者数が実際の議席数と一致

---

## モックデータ

`src/__tests__/fixtures/` に以下を作成してから各テストを書くこと:

- `mockCandidates.ts`: 10〜20件の候補者サンプル（現職・元職・新人・各政党を含む）
- `mockConstituencies.ts`: 5〜10件の選挙区サンプル（voterTrend 各種を含む）
- `mockProportionalEntries.ts`: 比例名簿サンプル（比例単独・重複立候補・各状態を含む）
