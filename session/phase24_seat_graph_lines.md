# Phase 24: 議席グラフ内ライン表示修正

## 概要

過半数ライン（233）と3分の2ライン（310）が議席バーグラフの**下**に表示されてしまっている。
グラフ内（バーに重なる縦線）として表示されるよう修正する。

## タスク

| ID | 内容 | 状態 |
|---|---|---|
| P24-1 | ラインをバーグラフ内に重ねて表示 | ✅ 完了 |

## 現状の問題

`SeatSummary.tsx` の構造が以下のようになっており、ラインが**グラフ外の別要素**として配置されている：

```tsx
{/* 議席棒グラフ */}
<div className="flex h-8 w-full rounded overflow-hidden mb-3">
  {/* 各政党バー */}
</div>

{/* 過半数・2/3 ライン ← グラフの下に別で存在している */}
<div className="relative h-1 mb-3">
  <div style={{ left: `${(MAJORITY / totalSeats) * 100}%` }} ... />
  ...
</div>
```

`overflow-hidden` が付いたバーグラフコンテナとラインが**別々の div** なため、ラインはグラフ下に表示される。

## 修正方針

バーグラフコンテナを `relative` な wrapper で包み、ラインを `absolute` で内部に重ねる。

```tsx
{/* wrapper: relative で包む */}
<div className="relative mb-3">
  {/* 議席棒グラフ */}
  <div className="flex h-8 w-full rounded overflow-hidden">
    {/* 各政党バー */}
  </div>

  {/* 過半数ライン（グラフ上に absolute 重ね） */}
  <div
    className="absolute top-0 w-0.5 h-8 bg-gray-800 pointer-events-none"
    style={{ left: `${(MAJORITY / totalSeats) * 100}%` }}
  />
  <span
    className="absolute text-xs text-gray-700 -translate-x-1/2 font-bold"
    style={{ left: `${(MAJORITY / totalSeats) * 100}%`, top: '100%', marginTop: '2px' }}
  >
    過半数 {MAJORITY}
  </span>

  {/* 2/3 ライン（グラフ上に absolute 重ね） */}
  <div
    className="absolute top-0 w-0.5 h-8 bg-red-600 pointer-events-none"
    style={{ left: `${(TWO_THIRDS / totalSeats) * 100}%` }}
  />
  <span
    className="absolute text-xs text-red-600 -translate-x-1/2 font-bold"
    style={{ left: `${(TWO_THIRDS / totalSeats) * 100}%`, top: '100%', marginTop: '2px' }}
  >
    2/3 {TWO_THIRDS}
  </span>
</div>
```

**ポイント**:
- wrapper を `relative` にすることで子の `absolute` 要素がグラフ基準で配置される
- `overflow-hidden` はバーグラフ div のみに残す（wrapper から外す）
- ラインの高さ (`h-8`) はバーグラフと同じにして全体を貫通する縦線にする
- ラベルは `top: '100%'` でグラフ直下に配置

## 対象ファイル

- `src/components/SeatSummary.tsx`

## 完了条件

- 過半数ライン（233）がバーグラフ内を貫通する縦線として表示される
- 2/3 ライン（310）がバーグラフ内を貫通する縦線として表示される
- ラベルはグラフ直下に見やすく表示される
- 既存のバーグラフ表示・政党テーブル・バッジに崩れがないこと
- ビルドが通ること
