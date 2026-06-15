# Phase 2: UIコンポーネント基本

> 参照: `Implementation_Plan.md` § Phase 2
> Phase 1（エンジン）完了後に着手すること

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P2-1 | `src/App.tsx` 全体レイアウト・状態管理 | P1-4〜P1-7 | 未着手 |
| P2-2 | `src/components/Header.tsx` | P2-1 | 未着手 |
| P2-3 | `src/components/SeatSummary.tsx` | P2-1 | 未着手 |
| P2-4 | `src/components/ConstituencyList.tsx` | P2-1 | 未着手 |

---

## P2-1: `src/App.tsx`

### 状態管理

```typescript
interface AppState {
  candidates: Candidate[] | null
  constituencies: Constituency[] | null
  proportionalEntries: ProportionalEntry[] | null
  proportionalSeats: ProportionalSeatAllocation | null
  simulationResult: SimulationResult | null
  isLoading: boolean
  error: string | null
}
```

### データロード（useEffect）

```typescript
// 初期化時に4つのJSONを並行フェッチ
Promise.all([
  fetch(BASE + 'data/candidates.json').then(r => r.json()),
  fetch(BASE + 'data/constituencies.json').then(r => r.json()),
  fetch(BASE + 'data/proportional_candidates.json').then(r => r.json()),
  fetch(BASE + 'data/proportional_seats.json').then(r => r.json()),
])

// BASE = import.meta.env.BASE_URL
```

### シミュレーション実行（handleRunSimulation）

```typescript
const handleRunSimulation = () => {
  setIsLoading(true)
  // setTimeout(0) でUIブロック防止（Reactレンダリングを先に通す）
  setTimeout(() => {
    const result = runSimulation(candidates, constituencies, proportionalEntries, proportionalSeats)
    setSimulationResult(result)
    setIsLoading(false)
  }, 0)
}
```

### レイアウト

```
<div className="min-h-screen bg-white">
  <Header />
  {error && <ErrorBanner />}
  {simulationResult && (
    <>
      <SeatSummary />
      <DeathGroup />      ← Phase 3
      <JapanMap />        ← Phase 3
      <ConstituencyList />
      <StatsSummary />    ← Phase 3
    </>
  )}
</div>
```

### 完了条件
- [ ] データロード成功時に「シミュレーション実行」ボタンが有効化される
- [ ] ロード失敗時にエラーバナーが表示される
- [ ] シミュレーション実行後に結果コンポーネントが表示される
- [ ] 実行中はローディング状態が表示される

---

## P2-2: `src/components/Header.tsx`

### Props

```typescript
interface HeaderProps {
  onRun: () => void
  isLoading: boolean
  disabled: boolean   // JSONデータ未ロード時 true
}
```

### 表示内容

```
┌──────────────────────────────────────────────────────┐
│  [選挙ロゴ]  衆院選ランダム配置シミュレーター          │
│             第51回衆議院議員総選挙（2026年2月8日）     │
│                              [シミュレーション実行 ▶] │
└──────────────────────────────────────────────────────┘
```

### ボタン状態

| 状態 | ラベル | 有効/無効 |
|---|---|---|
| データ未ロード | 「データ読み込み中...」 | disabled |
| 準備完了 | 「シミュレーション実行」 | enabled |
| 実行中 | 「計算中...」 | disabled |

### デザイン方針
- 背景: `bg-gray-900 text-white`（NHK選挙速報風ダークヘッダー）
- ボタン: `bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded`

### 完了条件
- [ ] 3つのボタン状態が正しく切り替わる
- [ ] `onRun` がボタンクリックで呼ばれる

---

## P2-3: `src/components/SeatSummary.tsx`

### Props

```typescript
interface SeatSummaryProps {
  result: SimulationResult
}
```

### 表示内容

**与野党サマリー（大見出し）**

```
与党（自民＋維新）
  実際: 352議席  →  シミュレーション: 241議席  (▼111)

野党・その他
  実際: 113議席  →  シミュレーション: 224議席  (▲111)
```

**政党別テーブル**

| 政党 | 実際（小） | 実際（比） | 実際（計） | シミュ（小） | シミュ（比） | シミュ（計） | 差分 |
|---|---|---|---|---|---|---|---|
| 自由民主党 🔴 | 249 | 67 | 316 | XX | XX | XX | ±XX |
| ...（全政党） |

- 政党名の左に政党カラーのドット（●）表示
- 差分: プラスは緑・マイナスは赤で表示
- Recharts の `BarChart` または HTML テーブルで実装

### 完了条件
- [ ] 与党合計・野党合計が正しく集計される
- [ ] 差分の正負でテキスト色が変わる
- [ ] 全政党が表示される

---

## P2-4: `src/components/ConstituencyList.tsx`

### Props

```typescript
interface ConstituencyListProps {
  results: ConstituencyResult[]  // 289件
}
```

### テーブル列

| # | 列名 | 内容 |
|---|---|---|
| 1 | 選挙区 | 例: 北海道1区 |
| 2 | 当選者 | 氏名 |
| 3 | 政党 | カラーバッジ付き |
| 4 | 元の選挙区 | 候補者の元の選挙区名 |
| 5 | 元得票率 | XX.X% 表示 |
| 6 | 惜敗率（比例復活） | 比例当選した場合のみ表示 |

### フィルター・ソート機能

```typescript
// フィルター状態
const [searchText, setSearchText] = useState('')    // 選挙区名/候補者名/政党名
const [campFilter, setCampFilter] = useState<'all' | 'ruling' | 'opposition'>('all')
const [sortKey, setSortKey] = useState<string>('constituencyId')
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
```

- テキスト検索: 選挙区名・候補者名・政党名をすべて対象
- 陣営フィルター: 全て / 与党当選 / 野党当選
- ソート: 各列ヘッダークリックで昇順/降順トグル

### 完了条件
- [ ] 289行が表示される
- [ ] テキスト検索が機能する
- [ ] ソートが機能する
- [ ] 陣営フィルターが機能する
