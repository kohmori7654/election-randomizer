# Phase 4: スタイリング仕上げ

> 参照: `Implementation_Plan.md` § Phase 4
> Phase 3（可視化）完了後に着手すること

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P4-1 | 選挙中継デザイン全面適用 | P3-1〜P3-3 | 未着手 |
| P4-2 | レスポンシブ対応・ブラウザ動作確認 | P4-1 | 未着手 |

---

## P4-1: 選挙中継デザイン全面適用

### デザインコンセプト
NHK選挙速報を参考にした「公益性・可読性・リッチ感」を兼ね備えた白ベースのUI。

### カラーパレット

| 要素 | Tailwindクラス / カラーコード |
|---|---|
| ページ背景 | `bg-white` |
| ヘッダー背景 | `bg-gray-900` |
| ヘッダーテキスト | `text-white` |
| セクション区切り | `border-b-2 border-gray-200` |
| セクションタイトル | `text-gray-800 font-bold text-xl border-l-4 border-blue-600 pl-3` |
| 与党テキスト | `text-red-600 font-bold` |
| 野党テキスト | `text-blue-600 font-bold` |
| 差分プラス | `text-green-600 font-bold` |
| 差分マイナス | `text-red-500 font-bold` |
| 実行ボタン | `bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow` |
| ローディング | `bg-gray-400 text-white font-bold py-3 px-8 rounded-lg cursor-not-allowed` |
| テーブルヘッダー | `bg-gray-100 text-gray-700 font-semibold text-sm` |
| テーブル行（偶数） | `bg-gray-50` |
| テーブル行ホバー | `hover:bg-blue-50` |
| 死の組カード | `border-2 border-red-400 bg-red-50 rounded-lg` |
| 波乱バッジ | `bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold` |

### 政党バッジコンポーネント

```typescript
// src/components/PartyBadge.tsx
interface PartyBadgeProps {
  partyId: string
  showName?: boolean
  size?: 'sm' | 'md'
}

// 例: <span style={{ backgroundColor: party.color }} className="inline-block px-2 py-0.5 text-white text-xs font-bold rounded">自民</span>
```

### タイポグラフィ
- 見出し: `font-bold`、大きさは `text-2xl` / `text-xl` / `text-lg` の3段階
- 本文: `text-sm text-gray-700`
- 数字強調: `text-3xl font-bold tabular-nums`（議席数など）
- 選挙区名: `font-medium text-gray-900`

### セクション構成のスタイル
各セクションは以下の構造を統一する:
```html
<section className="py-8 px-4 md:px-8 border-b border-gray-200">
  <h2 className="text-xl font-bold text-gray-800 border-l-4 border-blue-600 pl-3 mb-6">
    セクションタイトル
  </h2>
  <!-- コンテンツ -->
</section>
```

### 完了条件
- [ ] 全コンポーネントに Tailwind クラスが適用されている
- [ ] 政党カラーが全箇所で一致している（`parties.ts` の `color` を参照している）
- [ ] ボタンのホバー・disabled 状態が視覚的に明確
- [ ] NHK選挙速報らしい「重厚感のある白ベース」のデザインになっている

---

## P4-2: レスポンシブ対応・ブラウザ動作確認

### 対応ブレークポイント
- PC優先（1280px以上）
- タブレット（768px〜1280px）: 一部レイアウト変更
- スマートフォン（768px未満）: 最低限閲覧可能

### 各コンポーネントの対応

| コンポーネント | PC | タブレット | スマートフォン |
|---|---|---|---|
| Header | 横並び | 横並び | 縦並び |
| SeatSummary | 2カラム | 2カラム | 1カラム |
| DeathGroup | 2カラムカード | 1カラムカード | 1カラムカード |
| JapanMap | 左:地図 右:リスト | 上:地図 下:リスト | 地図省略→テーブルのみ |
| ConstituencyList | フルテーブル | スクロールテーブル | スクロールテーブル |
| StatsSummary | 3カラム | 2カラム | 1カラム |

### ブラウザ動作確認チェックリスト

```
対象ブラウザ: Chrome最新, Firefox最新, Safari最新

確認項目:
- [ ] シミュレーション実行が正常に動作する
- [ ] 全289区が ConstituencyList に表示される
- [ ] DeathGroup TOP10が表示される
- [ ] JapanMap の都道府県クリックが動作する
- [ ] フィルター・ソートが正常に動作する
- [ ] 実行時間が 150ms 以内（Chrome DevTools Performance で確認）
- [ ] コンソールエラーが 0件
```

### 完了条件
- [ ] 3ブラウザで確認チェックリストが全通過
- [ ] モバイルビューで崩れが許容範囲内
