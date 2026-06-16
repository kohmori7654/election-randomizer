# Phase 14: スコアの票数換算表示

> 受付日: 2026-06-15

---

## タスク一覧

| ID | タスク | 状態 |
|---|---|---|
| P14-1 | スコア→シミュ票数の換算ロジック実装（ユーティリティ関数） | 未着手 |
| P14-2 | `JapanMap.tsx` のドリルダウンにシミュ票数列を追加 | 未着手（P14-1 後） |
| P14-3 | `ConstituencyList.tsx` のテーブルにシミュ票数列を追加（オプション） | 未着手（P14-1 後） |

---

## 背景・設計方針

`finalScore`（0〜1）は直感的に分かりにくい。
その選挙区の**実際の総票数を基準**にスコアを比例配分した「シミュ票数」を表示する。

### 換算式

```
シミュ票数(候補者i) = round(
  finalScore_i / Σ(finalScore_j for all j in constituency)
  × Σ(realVotes_j for all j in constituency)
)
```

- 分母は「選挙区内の全候補者のスコア合計」（スコア按分）
- 乗数は「選挙区内の全候補者の実際の票数合計」（`votes` フィールドの合計）
- 結果は整数に丸める

### データの確認

- `candidates.json` に `votes` フィールドあり（1選挙区の総票数: 約 10〜27 万票）
- `runner.ts` では `Candidate` の `votes` はそのまま `SimCandidate` に引き継がれる
- `ConstituencyResult.candidates` から選挙区内の全候補者の `votes` 合計が取れる

### 例（北海道1区）

| 候補者 | finalScore | 按分率 | 実票合計 | シミュ票数 |
|---|---|---|---|---|
| かとう貴弘 | 0.612 | 38.5% | 258,242 | 99,423 |
| 道下大樹 | 0.481 | 30.2% | 258,242 | 78,057 |
| 臼木ひでたけ | 0.287 | 18.0% | 258,242 | 46,533 |
| ... | ... | ... | ... | ... |

---

## P14-1: 換算ユーティリティ関数

### 実装場所

`src/engine/scoring.ts` または新ファイル `src/utils/votes.ts`。

### 実装

```typescript
/**
 * 選挙区内の全候補者のスコアを実票数総量に按分してシミュ票数を返す。
 * @param candidates 1選挙区の全 SimCandidate
 * @returns candidateId → シミュ票数 のマップ
 */
export function calcSimVotes(
  candidates: SimCandidate[]
): Map<number, number> {
  const totalScore = candidates.reduce((s, c) => s + c.finalScore, 0)
  const totalRealVotes = candidates.reduce((s, c) => s + c.votes, 0)
  const result = new Map<number, number>()
  for (const c of candidates) {
    const ratio = totalScore > 0 ? c.finalScore / totalScore : 1 / candidates.length
    result.set(c.id, Math.round(ratio * totalRealVotes))
  }
  return result
}
```

---

## P14-2: JapanMap.tsx のドリルダウンへの追加

P13-2 の全候補者テーブルに「シミュ票数」列を追加する（P13 実装後に実施）。

```tsx
// ドリルダウン展開時に計算
const simVotes = useMemo(() => calcSimVotes(r.candidates), [r])

// テーブル列追加
<th>シミュ票数</th>
...
<td>{(simVotes.get(c.id) ?? 0).toLocaleString()}</td>
```

表示順: 当落 / 氏名 / 政党 / シミュ票数 / 惜敗率 / スコア

---

## P14-3: ConstituencyList.tsx への追加（オプション）

`ConstituencyList.tsx` の各行展開時や全行表示にもシミュ票数を追加できるが、
列数が増えすぎる懸念があるためユーザーに確認してから実施する。

---

## 完了条件

- [ ] `calcSimVotes` 関数が正しく票数を按分計算する（合計が実際の総票数と一致）
- [ ] JapanMap のドリルダウンでシミュ票数が表示される
- [ ] カンマ区切り（`toLocaleString()`）で表示される
- [ ] ビルド成功・テスト全通過
