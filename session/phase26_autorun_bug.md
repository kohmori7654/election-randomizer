# P26: 初回ロード時シミュレーション自動実行バグ修正

## 症状

`http://localhost:5173/election_randomizer/` を開くと「シミュレーション計算中…」
の表示から進まない。F5（ページ再読み込み）を行うとシミュレーション結果が正常表示される。

## 原因仮説

`src/App.tsx` の自動シミュレーション起動ロジックに競合がある。

```typescript
// handleSimulate は state に依存する useCallback
const handleSimulate = useCallback(() => { ... }, [state])

// auto-run effect の依存: [state.phase, handleSimulate]
useEffect(() => {
  if (state.phase === 'ready' && !autoRunRef.current) {
    autoRunRef.current = true
    handleSimulate()
  }
}, [state.phase, handleSimulate])
```

**問題点**: `handleSimulate` が `state` 全体に依存しているため、`state.phase` が `running` に
変わると `handleSimulate` が再生成され、effect が再発火する。
また React StrictMode では `useEffect` が 2 回実行されるため、`loadAppData()` の Promise が
2 本走り、後から完了した方が `setState({ phase: 'ready' })` で状態をリセットする
競合が起きる可能性がある。

## 修正方針

### 方針A（最小変更）: auto-run effect の依存から `handleSimulate` を除外

```typescript
const handleSimulateRef = useRef(handleSimulate)
useEffect(() => { handleSimulateRef.current = handleSimulate })

useEffect(() => {
  if (state.phase === 'ready' && !autoRunRef.current) {
    autoRunRef.current = true
    handleSimulateRef.current()
  }
}, [state.phase])  // handleSimulate を依存から除外
```

### 方針B（推奨）: loadAppData の then() で直接シミュレーションを起動

auto-run effect を廃止し、データロード完了後に直接シミュレーションを実行する。

```typescript
useEffect(() => {
  loadAppData()
    .then(data => {
      setState({ phase: 'ready', data })
      // ready への setState 後に非同期でシミュレーション起動
      setTimeout(() => {
        setState(prev => {
          if (prev.phase !== 'ready') return prev
          return { phase: 'running', data: prev.data }
        })
        // ...
      }, 0)
    })
    .catch(...)
}, [])
```

または、functional update で状態を安全に遷移させる。

### 方針C（最もシンプル）: handleSimulate の依存配列を安定化

```typescript
// data を state から分離して管理
const [appData, setAppData] = useState<AppData | null>(null)

// handleSimulate は appData のみに依存（state 全体ではない）
const handleSimulate = useCallback(() => {
  if (!appData) return
  setState({ phase: 'running' })
  setTimeout(() => {
    // ...
  }, 0)
}, [appData])

useEffect(() => {
  if (appData && !autoRunRef.current) {
    autoRunRef.current = true
    handleSimulate()
  }
}, [appData, handleSimulate])
```

## タスク

- [x] **P26-1**: 原因を特定（StrictMode 二重発火が原因）（✅完了）
- [x] **P26-2**: `cancelled` フラグ + `handleSimulateRef` 導入で修正実装（✅完了）
- [x] **P26-3**: ブラウザ確認（✅完了 2026-06-16 ユーザー確認済み）

## 受け入れ条件

- [x] ページを開いて数秒以内にシミュレーション結果が表示される
- [x] F5 なしで毎回正常動作する
- [x] 「再抽選」ボタンも引き続き正常動作する
