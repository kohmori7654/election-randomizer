# Phase 18: 都道府県セルサイズの面積比例拡大

> 受付日: 2026-06-16
> 前提: P18-1（Playwright 目視確認）→ P18-2（サイズ実装）の順で実施

---

## タスク一覧

| ID | タスク | 状態 |
|---|---|---|
| P18-1 | Playwright MCP で現在の日本地図をブラウザ目視確認・スクリーンショット取得 | ✅完了 |
| P18-2 | 都道府県セルサイズを実際の面積に応じて拡大（最小=現行44px） | ✅完了 |

---

## 背景・要件

- 現状: 全都道府県が同一サイズ（CELL=44px 正方形）で違和感
- 要件:
  - 現在のサイズを **最小サイズ（1×1）** として、面積に応じて拡大
  - 地図全体は **最大1.3倍まで** 許容
  - 位置関係は現行グリッド座標を維持

---

## P18-1: Playwright MCP 目視確認

### 手順

1. `portless list` でフロントエンドの URL を確認
2. Playwright MCP でアクセスしてスクリーンショット取得
3. 確認ポイント:
   - 47都道府県が重複なく表示されているか
   - 位置関係が日本地図として自然か
   - クリック・ツールチップが動作するか

### 完了条件

- [ ] スクリーンショット取得済み
- [ ] 表示の問題点を SESSION.md に記録

---

## P18-2: セルサイズ面積比例実装

### 設計方針

**`PrefectureGridItem` にサイズフィールドを追加**:

```typescript
export interface PrefectureGridItem {
  name: string
  short: string
  row: number
  col: number
  w?: number  // 横方向セル数（デフォルト 1）
  h?: number  // 縦方向セル数（デフォルト 1）
}
```

**SVG セルの実サイズ計算**:

```typescript
const cellW = (w ?? 1) * CELL + ((w ?? 1) - 1) * GAP
const cellH = (h ?? 1) * CELL + ((h ?? 1) - 1) * GAP
```

**テキスト配置**: 拡大セルの中心 `(cellW/2, cellH/2)`

### 面積カテゴリ（km² 基準）

| カテゴリ | 面積 | セルサイズ | 該当都道府県 |
|---|---|---|---|
| S（最小） | ～5,000 km² | 1×1 | 大阪・東京・神奈川・沖縄・香川・佐賀・鳥取・埼玉・奈良・滋賀・山梨・徳島・福井・石川・富山・長崎・愛知・千葉・京都・和歌山・愛媛・熊本（※近隣都道府県の制約による） |
| M | 5,000～9,000 km² | 2×1 か 1×2 | 宮城・広島・岡山・高知・静岡・山口・福岡・大分・宮崎・群馬・栃木 等 |
| L | 9,000～15,000 km² | 2×2 | 青森・秋田・山形・岩手・新潟・長野・岐阜・鹿児島・兵庫・福島 |
| XL | 15,000 km²超 | 3×2（または 2×3） | 北海道 |

> **注意**: カテゴリはあくまで目安。グリッドの隣接関係で衝突が発生する場合は **1段階ダウンして M や S** に抑えること。
> 実装前に衝突チェックを必ず行うこと。

### 衝突チェックルール

拡大により占有されるセル範囲 `[row, row+h) × [col, col+w)` に、
別の都道府県（または VIEW_W/VIEW_H 外）が存在する場合は拡大不可。

チェック方法（実装時）:
1. 全都道府県の anchor 座標をマップに展開
2. 各都道府県の拡大候補セルが空きか確認
3. 衝突する場合はサイズを縮小して再チェック

### 変更ファイル

1. `src/data/prefectureGrid.ts` — `w`, `h` フィールド追加
2. `src/components/JapanMap.tsx` — `cellW`, `cellH` を用いた `rect`・`text` 描画に変更

### VIEW_W / VIEW_H の再計算

現行:
```typescript
const MAX_COL = Math.max(...PREFECTURE_GRID.map(p => p.col))
const MAX_ROW = Math.max(...PREFECTURE_GRID.map(p => p.row))
const VIEW_W = (MAX_COL + 1) * STEP
const VIEW_H = (MAX_ROW + 1) * STEP
```

変更後:
```typescript
const VIEW_W = Math.max(...PREFECTURE_GRID.map(p => p.col * STEP + (p.w ?? 1) * CELL + ((p.w ?? 1) - 1) * GAP))
const VIEW_H = Math.max(...PREFECTURE_GRID.map(p => p.row * STEP + (p.h ?? 1) * CELL + ((p.h ?? 1) - 1) * GAP))
```

### 完了条件

- [ ] `prefectureGrid.ts` に `w`/`h` フィールドを持つ都道府県を定義（衝突なし）
- [ ] `JapanMap.tsx` が可変サイズで描画し、大きな都道府県が視覚的に目立つ
- [ ] 全都道府県クリック・ツールチップが正常動作
- [ ] ビルド成功
- [ ] Playwright MCP でスクリーンショット確認
