# Phase 3: 高度な可視化コンポーネント

> 参照: `Implementation_Plan.md` § Phase 3
> Phase 2（基本UI）完了後に着手すること

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P3-1 | `src/components/DeathGroup.tsx` | P2-1 | 未着手 |
| P3-2 | `src/components/JapanMap.tsx` | P2-1 | 未着手 |
| P3-3 | `src/components/StatsSummary.tsx` | P2-1 | 未着手 |

---

## P3-1: `src/components/DeathGroup.tsx`

### Props

```typescript
interface DeathGroupProps {
  groups: DeathGroup[]  // 上位10件（detectDeathGroups の出力）
}
```

### 表示レイアウト（カード形式）

```
⚔ 死の組 TOP 10
──────────────────────────────────────────────
1位  東京5区  [死の組スコア: 1.82]
     🔴 田中 太郎（自由民主党）  本来の選挙区での得票率: 68%
     🟢 鈴木 一郎（中道改革連合）本来の選挙区での得票率: 71%
     🟠 佐藤 花子（維新）        本来の選挙区での得票率: 62%
     → 本来の選挙区ではいずれも圧倒的勝者だった候補者が激突

2位  大阪3区  [死の組スコア: 1.75]
     ...
```

### 実装ポイント
- カードは折りたたみ可能（`details/summary` または useState で open/close）
- 「強者」の定義（originalVoteRate >= 60%）を各カードに注記
- 各候補者に政党カラーのバッジを表示
- スコアが高いほど赤みが強いグラデーション（`border-red-500 bg-red-50` など）

### 完了条件
- [ ] 10件のカードが表示される
- [ ] 各カードに選挙区名・スコア・強者候補者一覧が表示される
- [ ] 政党カラーバッジが表示される

---

## P3-2: `src/components/JapanMap.tsx`

### Props

```typescript
interface JapanMapProps {
  result: SimulationResult
}
```

### 使用ライブラリ
```bash
npm install react-simple-maps
```

### GeoJSONデータ準備
```
public/data/japan-prefectures.geojson
取得元: https://github.com/dataofjapan/land
ファイル: japan.geojson（都道府県単位）
```

### 2段階ドリルダウン構造

```
【Level 1: 全国都道府県マップ（デフォルト）】
  - 47都道府県を「シミュレーションの最多当選政党カラー」で塗り分け
  - ホバー: ツールチップ（都道府県名・与党 X席 / 野党 Y席）
  - クリック: selectedPrefecture を更新 → Level 2 へ

【Level 2: 選挙区リスト（都道府県クリック後）】
  - 地図の右側 or 下部にパネル表示
  - 選択した都道府県内の選挙区カードを一覧表示:
      選挙区名 | 当選者名 | 政党カラーバッジ | 元の選挙区名 | 元得票率
  - 「← 全国マップに戻る」ボタン
```

### 内部状態

```typescript
const [selectedPrefecture, setSelectedPrefecture] = useState<string | null>(null)
```

### ヘルパー関数

```typescript
// 都道府県ごとの選挙区結果を取得
function getConstituenciesByPrefecture(
  prefecture: string,
  results: ConstituencyResult[]
): ConstituencyResult[]

// 都道府県の最多当選政党を取得（地図の塗り分けに使用）
function getDominantPartyColor(
  prefecture: string,
  results: ConstituencyResult[]
): string  // カラーコード

// 与党/野党の議席数を取得
function getRulingOppositionCount(
  prefecture: string,
  results: ConstituencyResult[]
): { ruling: number; opposition: number }
```

### 実装の注意点
- `react-simple-maps` の `geography.properties.name_ja` と都道府県名を紐付けること
- GeoJSON によっては `name` が英語の場合があるため、マッピングテーブルを用意する
- 地図が表示されない場合は Phase 3 を後回しにして Phase 4→5 を先行してよい（代替案: テーブル表示）

### 完了条件
- [ ] 47都道府県が政党カラーで塗り分けされている
- [ ] ホバーでツールチップが表示される
- [ ] クリックで選挙区リストが表示される
- [ ] 「戻る」ボタンで全国マップに戻れる

---

## P3-3: `src/components/StatsSummary.tsx`

### Props

```typescript
interface StatsSummaryProps {
  result: SimulationResult
}
```

### 表示内容

**1. 与野党逆転選挙区数**
```
実際は与党が勝ったがシミュレーションで野党が勝った選挙区: XX区
実際は野党が勝ったがシミュレーションで与党が勝った選挙区: XX区
```

**2. 最大の波乱 TOP5**（元々強かった候補者が落選した選挙区）
```
1. 北海道3区
   落選: 田中 太郎（自民 元得票率 72%）
   当選: 鈴木 花子（中道改革連合 元得票率 41%）
   ↑ 格下候補者による金星

2. ...
```

**3. 地方別集計テーブル**

| 地方 | 実際（与党/野党） | シミュ（与党/野党） |
|---|---|---|
| 北海道・東北 | | |
| 関東 | | |
| 中部 | | |
| 近畿 | | |
| 中国・四国 | | |
| 九州・沖縄 | | |

**4. 比例復活当選の変動**（Phase 1-7 の結果）
```
比例復活で当選が変わった候補者: XX人
  新たに当選: XX人
  当選を失った: XX人
```

### 地方区分マッピング

```typescript
const REGION_PREFECTURES: Record<string, string[]> = {
  '北海道・東北': ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  '関東':         ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  '中部':         ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  '近畿':         ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  '中国・四国':   ['鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県'],
  '九州・沖縄':   ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
}
```

### 完了条件
- [ ] 与野党逆転選挙区数が表示される
- [ ] 波乱TOP5が表示される
- [ ] 地方別テーブルが表示される
- [ ] 比例復活変動数が表示される
