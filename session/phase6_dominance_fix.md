# Phase 6: 支配度計算バグ修正 + 解説HTML作成

> 追加日: 2026-06-15
> 優先度: **高**（P6-7/P6-9 で実装した支配度ランキングの結果が全面的に誤っている）

---

## 発見された問題

### 症状

「全選挙区強豪区ランキング」に以下の異常な支配度が表示される:

| 候補者 | 表示倍率 | 実際の第51回惜敗率 | 期待倍率 |
|---|---|---|---|
| こんどう 和也（石川3区） | **90.1倍** | 79.37%（2024）← 僅差 | ≈ 1.1倍 |
| 日野 さりあ（愛知7区） | **120.6倍** | 87.68%（2026）← 僅差 | ≈ 1.1倍 |

東京3区・東京10区でも同様の異常値が確認されている（最大 150.4倍）。

---

## 根本原因

### バグの所在: `public/data/candidates.json` の `votes` フィールド

スクレイピング（`scripts/scrape_candidates.py`）のバグにより、
一部候補者の `votes`（得票数）が正しい値の **約 1/100〜1/500 以下** になっている。

#### 石川3区（senkyokuId=51249）の実態

| 候補者 | votes (JSON) | originalVoteRate | 期待値 (rate×推定総票) | 比率 | elected |
|---|---|---|---|---|---|
| こんどう 和也 | **64,893** ← 正しい | 0.461 | 64,893 | 1.000 | proportional_win |
| にしだ 昭二 | **720** ← **誤り** | 0.519 | **73,057** | 0.010 | smd_win |
| 南 しょうじ | 274 | 0.020 | 2,815 | 0.097 | lose |

→ `buildDominanceMap` は votes 降順ソートするため **こんどうを「当選者」と誤判定**
→ 支配度 = 64,893 ÷ 720 = **90.1倍**（本来: 0.519÷0.461 ≈ 1.13倍）

#### 愛知7区（senkyokuId=51011）の実態

| 候補者 | votes (JSON) | originalVoteRate | 期待値 | 比率 | elected |
|---|---|---|---|---|---|
| 日野 さりあ | **108,322** ← 正しい | 0.498 | 108,322 | 1.000 | smd_win |
| 鈴木 じゅんじ | **898** ← **誤り** | 0.436 | **94,836** | 0.009 | proportional_win |
| 鈴木 こういち | 96 | 0.066 | 14,356 | 0.007 | lose |

→ 支配度 = 108,322 ÷ 898 = **120.6倍**（本来: 0.498÷0.436 ≈ 1.14倍）

#### 確認されたすべての矛盾選挙区

| 選挙区 | 当選者 (elected=smd_win) | 当選者votes(誤) | 落選者最大votes | 誤倍率 |
|---|---|---|---|---|
| 東京10区 | 鈴木 隼人 | 286 | 梶原 みずほ 43,006 | 150.4倍 |
| 東京3区 | 石原 ひろたか | 548 | あべ 祐美子 53,584 | 97.8倍 |
| 石川3区 | にしだ 昭二 | 720 | こんどう 和也 64,893 | 90.1倍 |

---

## タスク一覧

| ID | タスク | 優先度 | 依存 | 状態 |
|---|---|---|---|---|
| P6-10A | `buildDominanceMap` アルゴリズム修正（当選者判定バグ） | 必須 | なし | 未着手 |
| **P6-10D** | **落選者の支配度を惜敗率で計算（ユーザー依頼）** | **必須** | P6-10A と同時実装 | **未着手** |
| P6-10B | データ品質検証スクリプト作成 | 推奨 | なし | 未着手 |
| P6-10C | 支配度計算式の解説 HTML 作成 | 依頼 | P6-10A+D | 未着手 |

> **P6-10A と P6-10D は同じ関数 `buildDominanceMap` を修正するため、1回の実装で両方を完成させること**

---

## P6-10A: `buildDominanceMap` アルゴリズム修正

### 修正方針

`votes` での降順ソートをやめ、`elected === 'smd_win'` を使って当選者を特定する。
得票率の比率（`originalVoteRate`）を支配度の基準にする。

`votes` は一部データで破損しているが、`originalVoteRate` は全候補者で正しい値が入っている
（選挙区内で合計が 1.0 に近い値になっていることで確認済み）。

### 修正コード（`src/engine/deathGroup.ts`）

```typescript
// Before（現行コード）
export function buildDominanceMap(allCandidates: Candidate[]): Record<number, number> {
  const byOriginal: Record<number, Candidate[]> = {}
  for (const c of allCandidates) {
    if (!byOriginal[c.senkyokuId]) byOriginal[c.senkyokuId] = []
    byOriginal[c.senkyokuId].push(c)
  }

  const dominanceMap: Record<number, number> = {}

  for (const group of Object.values(byOriginal)) {
    const sorted = [...group].sort((a, b) => b.votes - a.votes)  // ← votes で判定（バグの原因）
    const winner = sorted[0]
    const runnerUp = sorted[1]

    if (winner && runnerUp && runnerUp.votes > 0) {
      dominanceMap[winner.id] = winner.votes / runnerUp.votes
    } else if (winner) {
      dominanceMap[winner.id] = 10
    }

    for (let i = 1; i < sorted.length; i++) {
      dominanceMap[sorted[i].id] = 0
    }
  }

  return dominanceMap
}
```

```typescript
// After（修正後）
export function buildDominanceMap(allCandidates: Candidate[]): Record<number, number> {
  const byOriginal: Record<number, Candidate[]> = {}
  for (const c of allCandidates) {
    if (!byOriginal[c.senkyokuId]) byOriginal[c.senkyokuId] = []
    byOriginal[c.senkyokuId].push(c)
  }

  const dominanceMap: Record<number, number> = {}

  for (const group of Object.values(byOriginal)) {
    // elected フィールドで小選挙区当選者を特定（votes は一部データが破損しているため不使用）
    const winner = group.find(c => c.elected === 'smd_win')

    if (!winner) {
      // smd_win がいない選挙区（比例単独・データ欠損）はスキップ
      for (const c of group) dominanceMap[c.id] = 0
      continue
    }

    // originalVoteRate ベースで降順ソート（rates は全候補で信頼性が高い）
    const sortedByRate = [...group]
      .filter(c => c.id !== winner.id)
      .sort((a, b) => b.originalVoteRate - a.originalVoteRate)

    const runnerUp = sortedByRate[0]

    // 支配度 = 当選者得票率 / 次点得票率
    if (runnerUp && runnerUp.originalVoteRate > 0) {
      dominanceMap[winner.id] = winner.originalVoteRate / runnerUp.originalVoteRate
    } else {
      dominanceMap[winner.id] = 10  // 対立候補なし（無投票当選相当）
    }

    // 落選者・比例復活当選者の支配度は 0
    for (const c of group) {
      if (c.id !== winner.id) {
        dominanceMap[c.id] = 0
      }
    }
  }

  return dominanceMap
}
```

### 修正後の期待値

| 選挙区 | 当選者 | 修正後の支配度 | 根拠 |
|---|---|---|---|
| 石川3区 | にしだ 昭二 | 0.519÷0.461 ≈ **1.13倍** | 得票率比 |
| 愛知7区 | 日野 さりあ | 0.498÷0.436 ≈ **1.14倍** | 得票率比 |
| 東京3区 | 石原 ひろたか | 0.426÷0.245 ≈ **1.74倍** | 得票率比 |
| 東京10区 | 鈴木 隼人 | 0.491÷0.263 ≈ **1.87倍** | 得票率比 |

こんどう 和也・日野 さりあは `elected = proportional_win（比例復活）` のため支配度 = **0** となり、
「圧勝候補」として誤選出されなくなる。

### テスト修正

`src/__tests__/deathGroup.test.ts` のテスト用 `makeSimCandidate` は現在 `elected: 'lose'` をデフォルトにしている。
修正後の `buildDominanceMap` は `elected === 'smd_win'` を参照するため、
テストで支配度を持つ候補者は `elected: 'smd_win'` に設定する必要がある。

```typescript
// テスト用ヘルパーに elected パラメータを追加
function makeSimCandidate(
  id: number,
  partyId: SimCandidate['partyId'],
  score: number,
  elected: ElectedStatus = 'lose'
): SimCandidate { ... }

// 「圧勝候補が集まる選挙区」テスト: winner に 'smd_win' を設定
makeSimCandidate(1, 'ldp', 0.9, 'smd_win')
makeSimCandidate(2, 'crc', 0.85, 'smd_win')
```

---

## P6-10D: 落選者の支配度を惜敗率で計算

### 依頼内容

「全選挙区競合区ランキングにおいて、選挙の勝者は支配度のままで良いですが、
選挙の落選者は支配度を惜敗率で計算するようにしてください」

### 現行の動作（P6-10A 修正後の状態）

```
当選者: dominanceRatio = winner.originalVoteRate / runnerUp.originalVoteRate  (>1.0)
落選者: dominanceRatio = 0
```

### 変更後の動作

```
当選者: dominanceRatio = winner.originalVoteRate / runnerUp.originalVoteRate  (>1.0)  ← 変更なし
落選者: dominanceRatio = loser.originalVoteRate / winner.originalVoteRate  (0~1.0)  ← 惜敗率
```

### 修正コード（`src/engine/deathGroup.ts` の P6-10A 修正に統合）

P6-10A の修正コードの「落選者の支配度は 0」の部分を置き換える:

```typescript
// P6-10A + P6-10D 統合後の buildDominanceMap（最終形）
export function buildDominanceMap(allCandidates: Candidate[]): Record<number, number> {
  const byOriginal: Record<number, Candidate[]> = {}
  for (const c of allCandidates) {
    if (!byOriginal[c.senkyokuId]) byOriginal[c.senkyokuId] = []
    byOriginal[c.senkyokuId].push(c)
  }

  const dominanceMap: Record<number, number> = {}

  for (const group of Object.values(byOriginal)) {
    const winner = group.find(c => c.elected === 'smd_win')

    if (!winner) {
      for (const c of group) dominanceMap[c.id] = 0
      continue
    }

    const sortedByRate = [...group]
      .filter(c => c.id !== winner.id)
      .sort((a, b) => b.originalVoteRate - a.originalVoteRate)

    const runnerUp = sortedByRate[0]

    // 当選者の支配度 = 当選者得票率 / 次点得票率（>1.0）
    dominanceMap[winner.id] = runnerUp && runnerUp.originalVoteRate > 0
      ? winner.originalVoteRate / runnerUp.originalVoteRate
      : 10

    // 落選者の「支配度」= 惜敗率（落選者得票率 / 当選者得票率）（0~1.0）
    // ← P6-10D: 旧実装では 0 固定だったが、惜敗率に変更
    for (const c of group) {
      if (c.id !== winner.id) {
        dominanceMap[c.id] = winner.originalVoteRate > 0
          ? c.originalVoteRate / winner.originalVoteRate
          : 0
      }
    }
  }

  return dominanceMap
}
```

### 計算値の確認（シミュレーション済み）

| 選挙区 | 候補者 | elected | 旧値 | 新値（P6-10D後） |
|---|---|---|---|---|
| 石川3区 | にしだ 昭二 | smd_win | 0（バグ） | **1.13倍** |
| 石川3区 | こんどう 和也 | proportional_win | 90.1倍（バグ） | **0.888（88.8%）** |
| 石川3区 | 南 しょうじ | lose | 0 | **0.039（3.9%）** |
| 愛知7区 | 日野 さりあ | smd_win | 120.6倍（バグ） | **1.14倍** |
| 愛知7区 | 鈴木 じゅんじ | proportional_win | 0（バグ） | **0.876（87.6%）** |

---

### `scoreConstituency` の閾値変更（連動して必要）

#### 問題

現行の `scoreConstituency` の「強い候補」閾値は `> 1.5` のみ:

```typescript
const dominantCount = top3.filter(c => (dominanceMap[c.id] ?? 0) > 1.5).length
const intensity = avgDominance * (dominantCount / top3.length)
```

落選者の値が `0→惜敗率（0~1.0）` に変わっても、この閾値では落選者は永遠にカウントされない。
（例: こんどう 0.888 → 1.5 未満 → dominantCount に加算されない）

#### 実データでの影響確認

| 選挙区 | 当選者支配度 | 次点惜敗率 | 旧score | 新score（案A） |
|---|---|---|---|---|
| 北海道8区 | 1.24x | 81% | 0.000 | **1.023** |
| 北海道5区 | 1.35x | 74% | 0.000 | **0.523** |
| 石川3区 | 1.13x | 88.8% | 0.000 | ?(閾値次第) |
| 北海道6区 | 1.52x | 66% | 0.168 | **0.255** |
| 北海道7区 | 1.92x | 52% | 0.479 | **0.609** |

（新scoreはメモ内の `> 1.2 OR (0.8~1.0)` 条件での試算）

#### 推奨修正（`scoreConstituency` の閾値変更）

```typescript
// After（P6-10D 統合後の scoreConstituency）
export function scoreConstituency(
  result: ConstituencyResult,
  dominanceMap: Record<number, number>,
): number {
  const sorted = [...result.candidates].sort((a, b) => b.finalScore - a.finalScore)
  const top3 = sorted.slice(0, 3)
  if (top3.length === 0) return 0

  const avgDominance = top3.reduce((s, c) => s + (dominanceMap[c.id] ?? 0), 0) / top3.length

  // 強い候補の定義（P6-10D 変更）:
  //   当選者: 支配度 > 1.2 (20%以上の差で勝利)
  //   落選者: 惜敗率 > 0.8 (当選者の80%以上の票を獲得)
  const strongCount = top3.filter(c => {
    const r = dominanceMap[c.id] ?? 0
    return r > 1.2 || (r > 0.8 && r < 1.0)
  }).length

  return avgDominance * (strongCount / top3.length)
}
```

#### 閾値の根拠

| 閾値 | 意味 | 根拠 |
|---|---|---|
| 当選者 > 1.2 | 20%以上の差で勝利 | 実データの支配度分布: 中央値1.64、平均2.69。1.2は「標準的な競争区」の下限 |
| 落選者 > 0.8 | 惜敗率80%以上 = 当選者に近い票を獲得 | 一般に惜敗率80%超は「僅差の落選」と呼ばれる |

---

### UI表示の変更

#### `src/components/DeathGroup.tsx`

```tsx
// Before: 支配度の表示
{dominance > 0
  ? `${dominance.toFixed(1)}倍`
  : `${(c.originalVoteRate * 100).toFixed(1)}%`}

// After: 当選者と落選者で表示を切り替え
{dominance > 1.0
  ? `${dominance.toFixed(2)}倍`           // 当選者: 「1.13倍」
  : `惜${(dominance * 100).toFixed(1)}%`} // 落選者: 「惜88.8%」
```

#### `src/components/ConstituencyRanking.tsx`

同様に落選者の列表示を `惜XX%` 形式に変更。

---

### P6-10A との実装統合注意事項

- P6-10A と P6-10D は **必ず同一のコミットで実装する**
- 片方だけ実装すると `scoreConstituency` の閾値が一方の値域にしか対応しない中間状態になる
- 実装順: `buildDominanceMap` 修正 → `scoreConstituency` 閾値変更 → UI更新 → テスト実行

### 完了条件

- [ ] `buildDominanceMap` で落選者の値が `惜敗率（0~1.0）` になっている
- [ ] `scoreConstituency` の閾値が新値域（当選>1.2、落選>0.8）に更新されている
- [ ] `DeathGroup.tsx` で当選者は「X.XX倍」、落選者は「惜XX.X%」と表示される
- [ ] `ConstituencyRanking.tsx` でも同様の表示切り替えが適用されている
- [ ] テスト: `detectDeathGroups` のテストで落選者に `intsensity` が反映されている（旧: 0固定）
- [ ] 全 Vitest テストが通過する

---

## P6-10B: データ品質検証スクリプト作成

> **重要**: このタスクは `session/phase0_data_quality.md` の P0-6A/B/C に統合・拡張された。
> 詳細はそちらを参照。8選挙区16候補者の異常は既にスキャン済み。

### 目的

`votes` フィールドの信頼性を `originalVoteRate` で検証するスクリプトを作成し、
スクレイピングバグの全容を把握する。

### スクリプト仕様（`scripts/validate_votes.py`）

```python
import json

candidates = json.load(open('public/data/candidates.json'))

by_senkyoku = {}
for c in candidates:
    by_senkyoku.setdefault(c['senkyokuId'], []).append(c)

print('=== votes/rate 不整合の疑いがある候補者 ===')
anomalies = []
for sid, group in by_senkyoku.items():
    # 最多득票候補から推定総有効票数を算出
    ref = max(group, key=lambda x: x['votes'])
    if ref['originalVoteRate'] == 0:
        continue
    estimated_total = ref['votes'] / ref['originalVoteRate']
    
    for c in group:
        expected = c['originalVoteRate'] * estimated_total
        if expected > 0:
            ratio = c['votes'] / expected
            # 期待値の 10% 以下を「異常」と判定
            if ratio < 0.10 and c['votes'] < 10000:
                anomalies.append({
                    'district': c['constituencyName'],
                    'name': c['nameKanji'],
                    'actual_votes': c['votes'],
                    'expected_votes': int(expected),
                    'ratio': ratio,
                    'elected': c['elected'],
                })

for a in sorted(anomalies, key=lambda x: x['ratio']):
    print(f"{a['district']}: {a['name']} "
          f"実際={a['actual_votes']:,} 期待={a['expected_votes']:,} "
          f"比={a['ratio']:.3f} elected={a['elected']}")

print(f'\n異常件数: {len(anomalies)}件 / 全{len(candidates)}件')
```

### 実行と確認

```bash
python3 scripts/validate_votes.py
```

---

## P6-10C: 支配度計算式の解説 HTML 作成

### 依頼内容

ユーザーが質問した「なぜこんな数字になるのか」を答えるための解説 HTML を作成する。

### 対象ファイル

`public/dominance_explanation.html`（または `src/components/AboutFormulas.tsx` の一部）

### 内容構成

#### 1. 支配度（dominanceRatio）の定義

```
元選挙区支配度 = 当選者得票率 / 次点者得票率

例:
  石川3区（第51回）: にしだ 昭二 51.9% / こんどう 和也 46.1% = 1.13倍
  ※「1.5倍以上」を「圧勝」と定義（閾値は deathGroup.ts の定数）
```

#### 2. データソースと注意事項

- 対象: 第51回衆議院議員総選挙（2026年）データ
- `originalVoteRate`: go2senkyo から取得した得票率（信頼性 高）
- `votes`: go2senkyo から取得した絶対票数（一部に**スクレイピングエラーあり**）
- 修正 P6-10A 適用後は `originalVoteRate` で計算するため誤差は解消済み

#### 3. 「死の組」判定のフロー

```
STEP 1: 全候補者の元選挙区支配度を計算
   当選者: 支配度 = 当選者得票率 / 次点者得票率（>1.5倍 が「圧勝」）
   落選者: 支配度 = 0

STEP 2: シミュレーション選挙区の強豪スコアを計算
   上位3候補の平均支配度 × 圧勝候補の割合（3人中何人が1.5倍超か）

STEP 3: 全289区をスコアで降順ソート → 上位10区が「死の組」
```

#### 4. バグ修正前後の比較表（例示用）

| 候補者 | 修正前の支配度 | 修正後の支配度 | 実際の惜敗率 |
|---|---|---|---|
| こんどう 和也 | 90.1倍（誤） | 0（落選者） | - |
| 日野 さりあ | 120.6倍（誤） | 1.14倍 | 87.7%（僅差） |
| にしだ 昭二 | 0（誤判定） | 1.13倍（正） | - |

### 実装先の選択肢

**案A**: P6-5（計算式解説ページ）の中に「支配度」セクションを追加
**案B**: `public/dominance_explanation.html` として単独 HTML を生成

ユーザーの依頼は「html形式で文章化」なので **案B** を優先し、
後から P6-5 に組み込む。

### 完了条件

- [ ] HTML ファイルが `public/` 以下に生成されている
- [ ] 「なぜ 90倍・120倍になったか」の原因説明が含まれる
- [ ] 修正後の正しい計算式が示されている
- [ ] 「圧勝」閾値（1.5倍）の根拠が説明されている
- [ ] ブラウザでそのまま開いて読める静的 HTML になっている

---

## 実装順序

> ⚠️ データ修正（P0-6B/C）を先に完了してから、アルゴリズム修正に着手すること。
> 誤ったデータでアルゴリズムを検証しても正確な動作確認ができない。

1. **P0-6B**: 8選挙区16候補者の正しい票数を複数ソースで照合（`session/phase0_data_quality.md` 参照）
2. **P0-6C**: `candidates.json` の votes フィールドを修正
3. **P6-10A + P6-10D を同時実装**（`buildDominanceMap` + `scoreConstituency` + UI 一括修正）
4. テスト全通過を確認（`npm test`）
5. **P6-10C** で解説 HTML を作成（修正後の正しい計算式を記述）
6. **P0-6B の照合シート**を P6-10C の HTML に参考資料として組み込む（バグ発見の経緯）

---

## 参考: votes フィールドが信頼できる理由・できない理由

| フィールド | 信頼性 | 根拠 |
|---|---|---|
| `originalVoteRate` | 高 | 選挙区内で概ね合計≒1.0、全候補で整合 |
| `votes` | 部分的に低 | 3選挙区以上で当選者の票数が期待値の1/100以下 |
| `elected` | 高 | smd_win/proportional_win/lose の整合性が取れている |
| `senkyokuId` | 高 | 選挙区名と一致 |
