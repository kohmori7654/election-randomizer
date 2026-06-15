# Phase 6: 機能改善・UI改善（エンハンスメント）

> 受付日: 2026-06-15
> Phase 4/5 と並行して、またはそれら完了後に着手すること

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P6-1 | 死の組 TOP10 に立候補者名表示 | P3-1（実装済み） | ✅ 完了 |
| P6-2 | 都道府県別マップをデフォルメ地図に変更 | P3-2（実装済み） | 未着手 |
| P6-4 | 「TM」= チームみらい確認 + 略称「みらい」統一 | なし | ✅ 完了 |
| P6-5 | スコア・惜敗率の計算式を別ページで表示 | P2-1 | ✅ 完了 |
| P6-6 | 政党ごとに候補者を分散配置（同一政党の集中を回避） | P1-4 | ✅ 完了 |
| P6-7 | 死の組の選出基準を「圧勝候補同士の対決」に変更 | P1-6 | ✅ 完了 |
| P6-8 | 比例名簿内の当選順位変化一覧 | P1-7 | ✅ 完了 |
| P6-9 | 全選挙区強豪区ランキング + 死の組TOP10からのリンク | P6-7 | ✅ 完了 |
| **P6-10A+D** | `buildDominanceMap` バグ修正＋落選者→惜敗率（同時実装） | なし | ✅ 完了 |
| P6-10B | データ品質検証スクリプト（votes 破損範囲特定） | なし | ✅ 完了 |
| P6-10C | 支配度計算式の解説 HTML 作成 | P6-10A+D | ✅ 完了 |
| P6-11 | 強豪区ランキング・比例名簿 当選順位変化を別ページ化 | P6-8, P6-9 | 未着手 |
| P6-12 | 死の組 TOP10 文言変更（圧勝候補同士 → 有力候補同士） | P3-1 | 未着手 |
| P6-13 | 死の組・強豪区ランキングで全候補表示（上位3件制限を撤廃） | P6-9 | 未着手 |

> 詳細: `session/phase6_dominance_fix.md`

---

## P6-1: 死の組 TOP10 に立候補者名表示

### 依頼内容
政党だけでなく、立候補者名も死の組カードに表示する。

### 現状
`src/components/DeathGroup.tsx` では政党名（バッジ）は表示されているが、
候補者名が表示されていない。

### 修正方針
- `DeathGroup.tsx` のカード内にある各候補者の行に候補者名を追加
- 表示フォーマット（案）:
  ```
  🔴 田中 太郎（自由民主党）  元得票率: 68%
  🟢 鈴木 一郎（立憲民主党）  元得票率: 71%
  ```
- `Candidate` 型の `name` フィールドを参照（`src/types/election.ts` 確認）
- `DeathGroupProps` に渡される `groups` の型に `candidates` 情報が含まれているか確認
  - 含まれていなければ型定義・エンジン側も修正が必要

### 完了条件
- [ ] 死の組カードに候補者名が表示される
- [ ] 表示は「氏名（政党名）元得票率 XX%」形式
- [ ] TOP10 全カードに適用されている

---

## P6-2: 都道府県別マップをデフォルメ地図に変更

### 依頼内容
東京など面積の小さい都道府県がクリックしづらい。
実際の地形に縛られないデフォルメ地図（各都道府県が均等に近いサイズ）に変更し、操作性を向上させる。

### 選択肢

#### 案A: `japan-map` ライブラリ（推奨）
- `react-simple-maps` を廃止し、`@react-japan-map/core` 等の専用ライブラリを使用
- 各都道府県が均等サイズの六角形や正方形で表現される
- 参考: `japan-map` npm パッケージ（デフォルメ地図専用）

#### 案B: SVGデフォルメ地図（タイルマップ形式）
- 各都道府県を均等グリッド上に配置した SVG を手動実装
- 4×12 グリッド等に 47 都道府県を配置
- 完全カスタマイズ可能だが実装コストが高い

#### 案C: 現行 GeoJSON + ズーム機能追加
- 地図自体はそのままで、東京・大阪などの密集地域にズームボタンを追加
- 実装コストが最も低いが、根本解決にはならない

### 推奨: 案B（SVG タイルマップ）
外部依存を増やさず、視認性が高い。47 都道府県の配置は広く使われているデフォルメ配置を参考にする。

```
デフォルメ配置の例（実装時に調整）:
     [北海道]
[青森][岩手]
[秋田][宮城]
...（略）
[東京][神奈川]  ← 均等サイズで視認性確保
...
[沖縄]
```

### 実装方針
1. `src/data/prefectureGrid.ts` に 47 都道府県のグリッド座標（row, col）を定義
2. `src/components/JapanMap.tsx` を SVG グリッドマップに書き換え
3. 各セルに政党カラーを塗り分け、ホバー・クリックイベントは維持
4. `react-simple-maps` / d3-geo は不要になる場合は削除検討（`package.json` 整理）

### 完了条件
- [ ] 47都道府県がすべてクリック可能なサイズで表示される
- [ ] 東京・大阪等の小規模都道府県が同等のクリック領域を持つ
- [ ] 政党カラーの塗り分け・ホバーツールチップ・ドリルダウンは従来と同等
- [ ] モバイルでも操作可能

---

## P6-4: 「TM」= チームみらい確認 + 略称「みらい」統一

### 依頼内容
コード中の `TM` 表記がチームみらいを指しているか確認し、
正しければ今後の略称を「みらい」に統一する。

### 確認手順
```bash
# TM が使われている箇所を全探索
grep -rn '"TM"' src/ public/data/ scripts/
grep -rn "'TM'" src/ public/data/ scripts/
grep -rn "TM" src/data/parties.ts
```

### 修正範囲（確認後に実施）
- `src/data/parties.ts` の `id: 'TM'` → `id: 'みらい'` または表示名のみ変更
- `public/data/candidates.json` の `partyId: 'TM'` → 全件置換
- `public/data/proportional_candidates.json` の同様箇所
- テスト・型定義も追従

### 注意点
- 内部IDの変更はデータ整合性リスクがある
- **推奨**: 内部ID `'TM'` は維持し、`party.shortName = 'みらい'` の表示名のみ変更
- `parties.ts` の `shortName` / `name` フィールドを確認して方針確定

### 完了条件
- [ ] TM が チームみらい であることを確認（またはコード中の出典を特定）
- [ ] UI 上の表示が「みらい」に統一されている
- [ ] 内部IDの変更をした場合は全データファイルの整合性を確認

---

## P6-5: スコア・惜敗率の計算式を別ページで表示

### 依頼内容
シミュレーションで使用するスコアと惜敗率の計算式を、
別ページ（ルート）に遷移して解説するページを追加する。

### 実装方針

#### ルーティング追加
```bash
npm install react-router-dom
```

| ルート | コンポーネント | 内容 |
|---|---|---|
| `/election_randomizer/` | `App.tsx` | メインシミュレーター |
| `/election_randomizer/about` | `AboutFormulas.tsx` | 計算式解説ページ |

#### `src/components/AboutFormulas.tsx` の内容

**1. スコア計算式**
```
FinalScore = BaseScore × RandomFactor × PartyBonus × ConstituencyBonus × HistoryBonus

各因子の説明:
- BaseScore      : 元の得票率を基にした基礎スコア
- RandomFactor   : ランダム要素（シミュレーションの揺らぎ）
- PartyBonus     : 政党の支持率補正
- ConstituencyBonus: 選挙区特性補正
- HistoryBonus   : 過去の当選実績補正
```

**2. 惜敗率計算式**
```
惜敗率 = (落選者のFinalScore / 当選者のFinalScore) × 100 (%)

比例復活条件:
- 惜敗率 ≥ 10% （供託物没収点以上）
- 比例名簿に登載されている
- 名簿順位が議席数以内
```

**3. 死の組スコア計算式**
```
DeathGroupScore = Σ(各候補者の元得票率) / 候補者数 × 強者密度係数

強者の定義: 元の選挙区での得票率 ≥ 60%
強者密度係数: 強者候補者数 / 全候補者数
```

#### リンク配置
- ヘッダー（`Header.tsx`）に「計算式について」リンクを追加
- メインページのスコア表示箇所に `(?)` アイコン → `AboutFormulas` へのリンク

#### `vite.config.ts` の対応
SPA のため、`react-router-dom` の `HashRouter` を使用（GitHub Pages 対応）。
または既存の `BrowserRouter` に `basename="/election_randomizer"` を設定。

### 完了条件
- [ ] `/election_randomizer/about`（または `#/about`）でページが開く
- [ ] スコア計算式・惜敗率計算式・死の組スコア式が表示される
- [ ] 各因子に説明文が付いている
- [ ] ヘッダーからリンクで遷移できる
- [ ] ブラウザの「戻る」ボタンでメインページに戻れる

---

## P6-6: 政党ごとに候補者を分散配置（同一政党の集中を回避）

### 依頼内容
現行のランダムシャッフル + ラウンドロビン配分では、偶然同一政党の候補者が同じ選挙区に集中することがある。
政党ごとに候補者ができる限り分散するよう、割り当てアルゴリズムを改善する。

### 現状分析

`src/engine/simulator.ts` の現行ロジック:
```typescript
// 1. 全候補者をランダムシャッフル（政党を考慮しない）
const shuffled = shuffleCandidates(candidates, seed)
// 2. 先頭から順にラウンドロビン（i % 289区）
const assignmentMap = assignCandidates(shuffled, constituencies)
```

問題: シャッフル後の並びが [自民, 自民, 自民, 立民, ...] の場合、
最初の3選挙区に自民が2〜3人集中する可能性がある。

### 改善方針: 政党インターリーブ方式

#### アルゴリズム
1. 政党ごとに候補者グループを作成し、各グループ内でシャッフル
2. グループをラウンドロビンでインターリーブ（[A党1, B党1, C党1, A党2, B党2, ...]）
3. インターリーブ済みシーケンスをラウンドロビンで選挙区に配分

```typescript
// 新関数: src/engine/simulator.ts に追加
export function assignCandidatesWithPartyDistribution(
  candidates: Candidate[],
  constituencies: Constituency[],
  seed?: number,
): Record<number, Candidate[]> {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random

  // 1. 政党ごとにグループ化してシャッフル
  const byParty: Record<string, Candidate[]> = {}
  for (const c of candidates) {
    if (!byParty[c.partyId]) byParty[c.partyId] = []
    byParty[c.partyId].push(c)
  }
  for (const group of Object.values(byParty)) {
    fisherYates(group, rand)  // 各グループ内でシャッフル
  }

  // 2. インターリーブ（政党ローテーション）
  const interleaved: Candidate[] = []
  const groups = Object.values(byParty)
  let idx = Array(groups.length).fill(0)
  let remaining = groups.length

  while (remaining > 0) {
    for (let g = 0; g < groups.length; g++) {
      if (idx[g] < groups[g].length) {
        interleaved.push(groups[g][idx[g]++])
      } else {
        remaining--
      }
    }
  }

  // 3. ラウンドロビン配分（既存の assignCandidates と同様）
  const result: Record<number, Candidate[]> = {}
  for (const c of constituencies) result[c.id] = []
  const n = constituencies.length
  for (let i = 0; i < interleaved.length; i++) {
    result[constituencies[i % n].id].push(interleaved[i])
  }
  return result
}
```

#### `runner.ts` の修正
```typescript
// Before
const assignmentMap = assignCandidates(shuffled, constituencies)

// After
const assignmentMap = assignCandidatesWithPartyDistribution(candidates, constituencies, seed)
// ※ shuffleCandidates は assignCandidatesWithPartyDistribution 内で処理するため不要になる
```

### 検証方法
```typescript
// テスト: 各選挙区の同一政党候補者数を集計
const collision = Object.entries(assignmentMap).map(([cId, candidates]) => {
  const partyCounts = candidates.reduce((acc, c) => {
    acc[c.partyId] = (acc[c.partyId] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
  const maxSameParty = Math.max(...Object.values(partyCounts))
  return { constituencyId: cId, maxSameParty }
})
// 全選挙区で maxSameParty === 1 であれば完全分散
```

### 完了条件
- [ ] `assignCandidatesWithPartyDistribution` を `simulator.ts` に追加
- [ ] 同一政党候補者が同じ選挙区に配置される選挙区数が最小化されている
- [ ] シードを固定した場合、同一の分散結果が再現される（決定論的）
- [ ] 既存の Vitest テストが通過する

---

## P6-7: 死の組の選出基準を「圧勝候補同士の対決」に変更

### 依頼内容
現行の死の組 TOP10 は「シミュレーションスコアが拮抗した選挙区」を選出しているが、
実際の第51回衆院選において圧勝した候補同士が激突する選挙区をピックアップするよう基準を変更する。

具体的な指標:
- 実際の選挙で「2位の惜敗率が低かった」候補（= 大差で勝利）
- 「1位と2位の得票比率が大きかった」候補（= 圧倒的勝利）

これらの「圧勝候補」が同じシミュレーション選挙区に複数配置されたとき = 真の「死の組」と定義する。

### 現行ロジックとの対比

| 項目 | 現行 | 変更後 |
|---|---|---|
| intensityの意味 | シミュレーションスコアの拮抗度 | 実際選挙での圧勝候補の集中度 |
| 「強者」の定義 | finalScore が高い | 実際選挙での votes 比率が高い |
| 拮抗の概念 | 必要（minScore/maxScore） | 不要（強者が多いほど高い） |

### 実装方針

#### Step 1: 各候補の「原選挙区支配度」を事前計算

`senkyokuId`（元の選挙区ID）でグループ化し、1位/2位の票差から支配度を算出する。

```typescript
// src/engine/deathGroup.ts に追加する事前計算関数

/**
 * 候補者ごとの「原選挙区支配度」を計算する。
 * dominanceRatio = winner.votes / runnerUp.votes
 * 当選者のみを対象とし、落選者は 0 とする。
 * allCandidates: Candidate[] (シャッフル前の全候補者)
 */
export function buildDominanceMap(allCandidates: Candidate[]): Record<number, number> {
  // 1. 元選挙区ごとにグループ化
  const byOriginal: Record<number, Candidate[]> = {}
  for (const c of allCandidates) {
    if (!byOriginal[c.senkyokuId]) byOriginal[c.senkyokuId] = []
    byOriginal[c.senkyokuId].push(c)
  }

  const dominanceMap: Record<number, number> = {}

  for (const group of Object.values(byOriginal)) {
    const sorted = [...group].sort((a, b) => b.votes - a.votes)
    const winner = sorted[0]
    const runnerUp = sorted[1]

    // 1位の支配度 = 1位票数 / 2位票数（2位がいる場合）
    if (winner && runnerUp && runnerUp.votes > 0) {
      dominanceMap[winner.id] = winner.votes / runnerUp.votes
    } else if (winner) {
      dominanceMap[winner.id] = 10 // 無投票当選扱い
    }

    // 落選者は支配度 0
    for (let i = 1; i < sorted.length; i++) {
      dominanceMap[sorted[i].id] = 0
    }
  }

  return dominanceMap
}
```

#### Step 2: `detectDeathGroups` のシグネチャ変更

```typescript
// Before
export function detectDeathGroups(
  results: ConstituencyResult[],
  topN: number = 10,
  minCandidates: number = 3,
): DeathGroup[]

// After
export function detectDeathGroups(
  results: ConstituencyResult[],
  allCandidates: Candidate[],   // 追加: 支配度計算のために元データ必要
  topN: number = 10,
  minCandidates: number = 3,
): DeathGroup[]
```

#### Step 3: intensity 計算式の変更

```typescript
// Before: シミュレーションスコアの拮抗度
const closeness = maxScore > 0 ? minScore / maxScore : 0
const intensity = Math.min(1, avgScore * closeness)

// After: 圧勝候補の集中度
// dominanceMap は buildDominanceMap(allCandidates) で事前計算
const dominanceMap = buildDominanceMap(allCandidates)

// top3 の各候補の原選挙区支配度の平均
const top3 = sorted.slice(0, 3)
const avgDominance = top3.reduce((s, c) => s + (dominanceMap[c.id] ?? 0), 0) / top3.length

// 上位候補の中に落選者が混じっている場合はペナルティ
const dominantCount = top3.filter(c => (dominanceMap[c.id] ?? 0) > 1.5).length
const intensity = avgDominance * (dominantCount / top3.length)
```

#### Step 4: `runner.ts` の呼び出し変更

```typescript
// Before
const deathGroups = detectDeathGroups(constituencyResults, 10)

// After
const deathGroups = detectDeathGroups(constituencyResults, candidates, 10)
// ※ candidates は runSimulation の引数（元データ）をそのまま渡す
```

### `DeathGroup` 型への追加（任意）
UI表示（P6-1）のために、各候補の支配度を型に持たせておくと便利:

```typescript
// src/types/election.ts の DeathGroup に追加
export interface DeathGroup {
  constituencyId: number
  constituencyName: string
  prefecture: string
  candidates: SimCandidate[]
  intensity: number           // 圧勝候補の集中度（変更後の意味）
  dominanceRatios?: Record<number, number>  // 候補者ID → 支配度（任意・UI用）
}
```

### P6-1 との関係
P6-1（立候補者名表示）と組み合わせると、カードに以下を表示できる:
```
1位  東京5区  [圧勝スコア: 3.21]
     🔴 田中 太郎（自民）  元選挙区での支配度: 3.8倍  元得票率: 71%
     🟢 鈴木 一郎（立民）  元選挙区での支配度: 2.1倍  元得票率: 65%
     🟠 佐藤 花子（維新）  元選挙区での支配度: 1.9倍  元得票率: 62%
```

**推奨実装順**: P6-7（アルゴリズム変更） → P6-1（UI表示）

### `votes` データの確認
実装前に `candidates.json` に `votes` フィールドが全候補者に含まれているか確認が必要:
```bash
python3 -c "
import json
c = json.load(open('public/data/candidates.json'))
missing = [x for x in c if not x.get('votes')]
print(f'votes欠損: {len(missing)}件 / 全{len(c)}件')
print('サンプル:', c[0])
"
```

### 完了条件
- [ ] `buildDominanceMap` 関数を `deathGroup.ts` に追加
- [ ] `detectDeathGroups` が `allCandidates` を受け取り、支配度ベースの `intensity` を返す
- [ ] TOP10 の選挙区が「圧勝候補同士の対決」となっている（目視確認）
- [ ] 同一シードで結果が再現される（決定論的）
- [ ] 既存の Vitest テストを更新・通過
- [ ] `runner.ts` の `detectDeathGroups` 呼び出しを更新

---

## P6-8: 比例名簿内の当選順位変化一覧

### 依頼内容
シミュレーションによって惜敗率が変化するため、比例名簿内の実効的な当選順位も変わる。
実際の選挙結果と比べて「誰が繰り上がり、誰が落選に転じたか」を一覧で確認できるようにする。

### 背景：比例復活の仕組み

`src/engine/proportional.ts` の現行ロジック:
```
ブロック × 政党 単位で、以下の順に並び替えて上位 N 枠を当選とする
  1位優先: 惜敗率（finalScore / 当選者 finalScore）降順
  同率時:  比例名簿順位（listRank）昇順
```

実際の選挙では惜敗率が固定だが、シミュレーションでは候補者が別の選挙区に配置されるため
各候補の惜敗率が変動し、名簿内の実効順位が入れ替わる。

### 表示する情報

各政党 × 各ブロックの比例名簿について、以下を列挙する:

| 名簿順 | 氏名 | 実際の惜敗率 | シミュ惜敗率 | 実際の実効順位 | シミュ実効順位 | 変化 | 実際の当落 | シミュ当落 |
|---|---|---|---|---|---|---|---|---|
| 1 | 田中 太郎 | 82.3% | 91.0% | 1位 | 1位 | ±0 | ○当選 | ○当選 |
| 2 | 鈴木 一郎 | 79.1% | 55.4% | 2位 | 4位 | -2 | ○当選 | ✗落選 |
| 3 | 佐藤 花子 | 71.2% | 88.5% | 3位 | 2位 | +1 | ✗落選 | ○当選 |

### データ設計

#### 事前計算：実際の惜敗率マップ
実際の選挙での惜敗率は `candidates.json` の `votes` から算出する（P6-7 の `buildDominanceMap` と同じ要領）。

```typescript
// src/engine/proportional.ts に追加

/**
 * 実際の選挙での惜敗率マップを構築する。
 * key: 小選挙区候補者ID, value: 実際の惜敗率（0〜1）
 * 当選者は 1.0、供託没収相当は 0 とする。
 */
export function buildRealHaiseiritsuMap(allCandidates: Candidate[]): Record<number, number> {
  // 元選挙区ごとにグループ化
  const byOriginal: Record<number, Candidate[]> = {}
  for (const c of allCandidates) {
    if (!byOriginal[c.senkyokuId]) byOriginal[c.senkyokuId] = []
    byOriginal[c.senkyokuId].push(c)
  }

  const map: Record<number, number> = {}
  for (const group of Object.values(byOriginal)) {
    const sorted = [...group].sort((a, b) => b.votes - a.votes)
    const winner = sorted[0]
    if (!winner) continue

    map[winner.id] = 1.0  // 当選者は惜敗率 100%

    for (let i = 1; i < sorted.length; i++) {
      map[sorted[i].id] = winner.votes > 0 ? sorted[i].votes / winner.votes : 0
    }
  }
  return map
}
```

#### 型定義：順位変化エントリ

```typescript
// src/types/election.ts に追加

export interface ProportionalRankingEntry {
  listRank: number              // 名簿順位（固定）
  nameRaw: string               // 氏名
  partyId: PartyId
  bloc: BlocName
  smdCandidateId: number | null

  realHaiseiritsu: number       // 実際の惜敗率
  simHaiseiritsu: number        // シミュ惜敗率（0 = 小選挙区当選 or 資格外）

  realEffectiveRank: number     // 実際の実効順位（資格外は Infinity）
  simEffectiveRank: number      // シミュの実効順位（資格外は Infinity）

  realElected: boolean          // 実際に比例当選したか
  simElected: boolean           // シミュで比例当選したか
}
```

#### `SimulationResult` に追加

```typescript
// src/types/election.ts の SimulationResult に追加
proportionalRankingChanges: ProportionalRankingEntry[]
```

#### 計算ロジック

`src/engine/proportional.ts` の `simulateProportionalRevival` を拡張するか、
`runner.ts` で呼び出し後に `buildRankingChanges` を別途呼ぶ。

```typescript
export function buildRankingChanges(
  proportionalCandidates: ProportionalCandidate[],
  proportionalSeats: ProportionalSeats,
  realHaiseiritsuMap: Record<number, number>,    // 実際
  simHaiseiritsuMap: Map<number, number>,         // シミュ（proportional.ts 内で計算済み）
  simWinnerIds: Set<number>,                       // シミュで小選挙区当選した候補者
): ProportionalRankingEntry[]
```

### UIコンポーネント: `src/components/ProportionalRankingTable.tsx`

#### フィルター
- ブロック選択（プルダウン: 全国 / 北海道 / 東北 / …）
- 政党選択（プルダウン: 全政党 / 自民 / 立民 / …）
- 変化フィルター（全件 / 当落変化あり のみ）

#### 表示レイアウト
```
比例名簿 当選順位変化

[ ブロック: 東京 ▼ ] [ 政党: 自民 ▼ ] [ 表示: 当落変化あり ▼ ]

名簿  氏名          実際惜敗率  シミュ惜敗率  実効順位変化  実際当落  シミュ当落
 1   田中 太郎       82.3%       91.0%         ±0           ○        ○
 2   鈴木 一郎       79.1%       55.4%         -2 ↓         ○        ✗  ← 赤ハイライト
 3   佐藤 花子       71.2%       88.5%         +1 ↑         ✗        ○  ← 緑ハイライト
```

#### 色分け
- 実際 ○ → シミュ ✗（落選に転じた）: 赤背景
- 実際 ✗ → シミュ ○（当選に転じた）: 緑背景
- 変化なし: デフォルト背景

### `runner.ts` の変更点

```typescript
// runner.ts の runSimulation に追記

// 実際の惜敗率マップを構築
const realHaiseiritsuMap = buildRealHaiseiritsuMap(candidates)

// 順位変化を計算
const proportionalRankingChanges = buildRankingChanges(
  proportionalCandidates,
  proportionalSeats,
  realHaiseiritsuMap,
  haiseiritsuMap,    // simulateProportionalRevival 内から export
  winnerIds,         // 同上
)

return {
  constituencies: constituencyResults,
  proportionalRevivals: revivals,
  seatsByParty,
  deathGroups,
  proportionalRankingChanges,   // 追加
  timestamp: Date.now(),
}
```

### 注意：内部 Map の export
現在 `simulateProportionalRevival` は `haiseiritsuMap` と `winnerIds` を内部変数として持つ。
`buildRankingChanges` がこれを必要とするため、以下のいずれかを選択する:
- **案A**: `simulateProportionalRevival` の戻り値に `{ revivals, haiseiritsuMap, winnerIds }` を含める
- **案B**: `simulateProportionalRevival` を分解し、マップ構築 → 当選判定 → ランキング構築 の3ステップに分割

推奨は **案A**（既存のテストへの影響が最小）。

### 完了条件
- [ ] `buildRealHaiseiritsuMap` を `proportional.ts` に追加
- [ ] `ProportionalRankingEntry` 型を `election.ts` に追加
- [ ] `SimulationResult` に `proportionalRankingChanges` フィールドを追加
- [ ] `runner.ts` で `buildRankingChanges` を呼び出し結果を返す
- [ ] `ProportionalRankingTable.tsx` コンポーネントを実装
- [ ] ブロック・政党・当落変化フィルターが動作する
- [ ] 当落が変化した行が色ハイライトされる
- [ ] メインページ（`App.tsx`）に新コンポーネントを組み込む

---

## P6-9: 全選挙区強豪区ランキング + 死の組TOP10からのリンク

### 依頼内容
死の組 TOP10 と同じ計算式（P6-7 で実装する `intensity` スコア）を使い、
全 289 選挙区の強豪度スコアを一覧できる「全選挙区強豪区ランキング」ページを追加する。
また、死の組 TOP10 カードからこのランキングページへ遷移できるリンクを設ける。

### P6-7 との依存関係
- P6-7 の `buildDominanceMap` と `intensity` 計算式が先に実装されている前提
- P6-7 完了後に着手すること
- `intensity` の計算は P6-7 の `detectDeathGroups` 内ロジックを再利用するため、
  スコア計算を `detectDeathGroups` の外に切り出す必要がある（詳細は下記）

### 実装方針

#### Step 1: スコア計算の汎用関数切り出し

`src/engine/deathGroup.ts` に `scoreConstituency` を追加し、
`detectDeathGroups` と新ランキング生成の両方から呼べるようにする。

```typescript
/**
 * 1選挙区の強豪度スコアを計算する（P6-7 の intensity 計算式と同一）。
 * dominanceMap: buildDominanceMap(allCandidates) の結果
 */
export function scoreConstituency(
  result: ConstituencyResult,
  dominanceMap: Record<number, number>,
): number {
  const sorted = [...result.candidates].sort((a, b) => b.finalScore - a.finalScore)
  const top3 = sorted.slice(0, 3)
  if (top3.length === 0) return 0
  const avgDominance = top3.reduce((s, c) => s + (dominanceMap[c.id] ?? 0), 0) / top3.length
  const dominantCount = top3.filter(c => (dominanceMap[c.id] ?? 0) > 1.5).length
  return avgDominance * (dominantCount / top3.length)
}
```

#### Step 2: 全選挙区スコア一覧を `SimulationResult` に追加

```typescript
// src/types/election.ts

export interface ConstituencyRankingEntry {
  rank: number
  constituencyId: number
  constituencyName: string
  prefecture: string
  intensity: number                    // 強豪度スコア
  topCandidates: {                     // 上位3候補の情報
    name: string
    partyId: PartyId
    dominanceRatio: number             // 元選挙区支配度
    originalVoteShare: number          // 元得票率（0〜1）
  }[]
}

// SimulationResult に追加
constituencyRanking: ConstituencyRankingEntry[]
```

#### Step 3: `runner.ts` でランキングを生成

```typescript
// runner.ts の runSimulation に追記

const dominanceMap = buildDominanceMap(candidates)  // P6-7 で追加済みのはず

const constituencyRanking: ConstituencyRankingEntry[] = constituencyResults
  .map(result => {
    const score = scoreConstituency(result, dominanceMap)
    const sorted = [...result.candidates].sort((a, b) => b.finalScore - a.finalScore)
    const top3 = sorted.slice(0, 3).map(c => ({
      name: c.name,
      partyId: c.partyId,
      dominanceRatio: dominanceMap[c.id] ?? 0,
      originalVoteShare: c.voteShare ?? 0,
    }))
    return {
      rank: 0, // 後でソート後に付番
      constituencyId: result.constituencyId,
      constituencyName: result.constituencyName,
      prefecture: result.prefecture,
      intensity: score,
      topCandidates: top3,
    }
  })
  .sort((a, b) => b.intensity - a.intensity)
  .map((entry, i) => ({ ...entry, rank: i + 1 }))

return {
  ...,
  constituencyRanking,
}
```

#### Step 4: `src/components/ConstituencyRanking.tsx` の新規作成

```
全選挙区 強豪区ランキング（全289区）

[ 都道府県フィルター: 全国 ▼ ]  [ 上位N件: 50件 ▼ ]

順位  選挙区名      都道府県  強豪スコア  上位3候補（元支配度）
  1   東京5区       東京都    3.21       田中太郎（自民）3.8倍 / 鈴木一郎（立民）2.1倍 / ...
  2   大阪3区       大阪府    3.10       ...
  ...
289   鳥取2区       鳥取県    0.12       ...
```

- 死の組 TOP10 に含まれる選挙区は行をハイライト（🔥 マーク等）
- 各行に選挙区詳細へのリンク（`ConstituencyList` と連動）を設ける
- ページネーション or 「もっと見る」ボタンで全289件を表示

#### Step 5: 死の組 TOP10 カードへのリンク追加

`src/components/DeathGroup.tsx` の各カードに「全ランキングで見る →」ボタンを追加し、
`ConstituencyRanking` コンポーネントへスクロール or モーダルでランキングを表示する。

実装案:
- **案A（推奨）**: `App.tsx` に `ConstituencyRanking` セクションを追加し、
  死の組TOP10カードの「全ランキングへ」ボタンで同ページ内スクロール（`#ranking`）
- **案B**: `react-router-dom` の新ルートとして `/ranking` を追加し、
  TOP10カードのリンクで遷移

P6-5（react-router-dom 導入）が完了していれば案B が綺麗。
未完了の場合は案A（スクロールリンク）で即対応可能。

### 完了条件
- [ ] `scoreConstituency` 関数を `deathGroup.ts` に追加（`detectDeathGroups` と共有）
- [ ] `ConstituencyRankingEntry` 型を `election.ts` に追加
- [ ] `SimulationResult` に `constituencyRanking` フィールドを追加
- [ ] `runner.ts` でランキングを生成・返す
- [ ] `ConstituencyRanking.tsx` コンポーネントを実装（全289区一覧・フィルター付き）
- [ ] 死の組TOP10に含まれる行がハイライトされる
- [ ] 死の組 TOP10 カードに「全ランキングへ」リンクが存在し、ランキングセクションへ遷移できる
- [ ] ブラウザで TOP10 → ランキング の画面遷移を目視確認

---

## P6-11: 強豪区ランキング・比例名簿 当選順位変化を別ページ化

### 依頼内容
「全選挙区 強豪区ランキング」と「比例名簿 当選順位変化（実際 vs シミュ）」は
データ量が多くメインページが長くなるため、別ページに分離する。

### 実装方針

#### 新規ルート
HashRouter を使用中なので、`#/ranking` と `#/proportional` を追加する。

| ルート | コンポーネント | 内容 |
|---|---|---|
| `#/` | メインページ | 現行のメインコンテンツ（DeathGroupまで） |
| `#/about` | `AboutFormulas.tsx` | 計算式解説（既存） |
| `#/ranking` | `ConstituencyRanking.tsx` | 全選挙区強豪区ランキング（別ページ） |
| `#/proportional` | `ProportionalRankingTable.tsx` | 比例名簿 当選順位変化（別ページ） |

#### App.tsx の変更
- `state.phase === 'done'` の場合のみ `/ranking`・`/proportional` にアクセス可能
- 未実行（`ready` など）の場合は `<Navigate to="/" />` でメインに戻す
- メインページ（done状態）から `ConstituencyRanking` と `ProportionalRankingTable` を削除し、
  代わりにリンクカードを設置

#### メインページのリンクカード
```tsx
<section className="bg-white border-b border-gray-200 px-4 py-3">
  <div className="flex flex-wrap gap-3">
    <a href="#/ranking" className="...">🏆 全選挙区 強豪区ランキング → 別ページで見る</a>
    <a href="#/proportional" className="...">📋 比例名簿 当選順位変化 → 別ページで見る</a>
  </div>
</section>
```

#### DeathGroup.tsx のリンク変更
既存の「全ランキングへ ↓」リンク先を `#constituency-ranking` から `#/ranking` に変更。

#### 別ページのレイアウト
- Header（シミュレーションボタン付き）を再表示
- 「← メインに戻る」リンク
- 対象コンポーネント

### 完了条件
- [ ] `#/ranking` で `ConstituencyRanking` が表示される
- [ ] `#/proportional` で `ProportionalRankingTable` が表示される
- [ ] メインページにリンクカードが表示される
- [ ] シミュレーション未実行時は `#/ranking`・`#/proportional` でメインに誘導される
- [ ] DeathGroup の「全ランキングへ」リンクが `#/ranking` に遷移する

---

## P6-12: 死の組 TOP10 文言変更

### 依頼内容
「圧勝候補同士の激突選挙区」という表現を「有力候補同士の激突選挙区」に変更する。

### 変更箇所
1. `src/components/DeathGroup.tsx` の `h2` テキスト
2. `src/types/election.ts` の `DeathGroup` 型コメント

### 変更内容
```diff
- ⚔️ 死の組 TOP10（圧勝候補同士の激突選挙区）
+ ⚔️ 死の組 TOP10（有力候補同士の激突選挙区）
```

```diff
- /** 死の組（圧勝候補同士の激突選挙区） */
+ /** 死の組（有力候補同士の激突選挙区） */
```

### 完了条件
- [ ] UI上の表示が「有力候補同士の激突選挙区」に変更されている
- [ ] 型コメントも同様に変更されている

---

## P6-13: 死の組・強豪区ランキングで全候補表示（上位3件制限を撤廃）

### 依頼内容
現状、死の組 TOP10 カードおよび全選挙区 強豪区ランキングで
「上位3候補のみ」表示されている。全候補を表示するよう変更する。

### 変更箇所

#### runner.ts（全候補をtopCandidatesに含める）
```diff
- const topCandidates = sorted.slice(0, 3).map(c => ({
+ const topCandidates = sorted.map(c => ({
```

#### DeathGroup.tsx（全候補を表示）
```diff
- {g.candidates.slice(0, 3).map(c => {
+ {g.candidates.map(c => {
```

#### ConstituencyRanking.tsx（ヘッダーテキスト修正）
```diff
- <th className="text-left px-2 py-1">上位3候補（元支配度）</th>
+ <th className="text-left px-2 py-1">全候補（元支配度）</th>
```

### 完了条件
- [ ] 死の組 TOP10 の各カードに全候補者が表示される
- [ ] 全選挙区 強豪区ランキングのテーブルに全候補者が表示される
- [ ] ビルドが通過する
- [ ] テストが全通過する
