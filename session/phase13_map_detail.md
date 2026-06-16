# Phase 13: 選挙区ドリルダウン詳細パネル強化

> 受付日: 2026-06-15

---

## タスク一覧

| ID | タスク | 状態 |
|---|---|---|
| P13-1 | 選挙区リスト行に当選者の政党名を明示表示 | 未着手 |
| P13-2 | ドリルダウン展開時に全候補者（氏名・政党・惜敗率・スコア）を一覧表示 | 未着手 |

---

## 背景・現状の問題

`JapanMap.tsx` のドリルダウン部分（`isSelected` 時）は当選者と次点のみ表示。
- 選挙区行をクリックするまで当選者の政党が分からない（カラードットはあるが政党名なし）
- 展開後も「次点 1 名」しか見えず、落選者全員の情報がない

---

## P13-1: 当選者政党名の明示表示

### 変更箇所

`JapanMap.tsx` の選挙区リスト行（現 `<div key={r.constituencyId}>`）。

#### 現在の表示

```
● 東京1区  [自民]
```

#### 変更後の表示

```
● 東京1区  山田 太郎（自由民主党）
```

具体的には、選挙区名の右側にすでに `party.shortName` バッジが表示されているが、
**当選者氏名**を追加する（折り畳み前から見える状態にする）。

```tsx
// 選挙区行の右側に「当選者名 [政党]」を常時表示
<span className="text-xs text-gray-500 flex-shrink-0">
  {r.winner.nameKanji}
</span>
<span className="text-xs px-1.5 py-0.5 rounded text-white ..." style={{...}}>
  {party.shortName}
</span>
```

---

## P13-2: 全候補者一覧の表示

### 変更箇所

`JapanMap.tsx` の `isSelected` 展開ブロック（現在の当選者・次点表示部分）を全面改修。

### 表示仕様

選挙区クリック後のドリルダウンに、全候補者をテーブル形式で表示する。

| 列 | 内容 |
|---|---|
| 当落アイコン | ◎当選 / △次点 / - 落選 |
| 氏名 | `nameKanji` |
| 政党 | `PARTIES[partyId].shortName`（政党色バッジ） |
| 惜敗率 | `(candidate.finalScore / winner.finalScore * 100).toFixed(1)` % |
| スコア | `finalScore.toFixed(3)` |

- 当選者の惜敗率は「—」（100% ではなく意味が違うので）
- 候補者は `finalScore` 降順でソート済み（`r.candidates` は既にソート済み）

### 実装例（概略）

```tsx
{isSelected && (
  <div className="mt-2 ml-2 border-t pt-2">
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400">
          <th>当落</th><th>氏名</th><th>政党</th><th>惜敗率</th><th>スコア</th>
        </tr>
      </thead>
      <tbody>
        {r.candidates.map((c, i) => {
          const isWinner = c.id === r.winner.id
          const haiseiritsu = isWinner
            ? '—'
            : (c.finalScore / r.winner.finalScore * 100).toFixed(1) + '%'
          const party = PARTIES[c.partyId]
          return (
            <tr key={c.id} className={isWinner ? 'font-bold' : ''}>
              <td>{i === 0 ? '◎' : i === 1 ? '△' : '−'}</td>
              <td>{c.nameKanji}</td>
              <td>
                <span style={{ backgroundColor: party.color }} className="px-1 rounded text-white">
                  {party.shortName}
                </span>
              </td>
              <td>{haiseiritsu}</td>
              <td>{c.finalScore.toFixed(3)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)}
```

### 完了条件

- [ ] 選挙区行（折り畳み前）に当選者氏名と政党バッジが表示される
- [ ] 展開時に全候補者が当落アイコン・氏名・政党・惜敗率・スコアで表示される
- [ ] 当選者は太字など視覚的に区別される
- [ ] ビルド成功
