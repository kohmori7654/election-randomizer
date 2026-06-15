# Phase 5: デプロイ設定

> 参照: `Implementation_Plan.md` § Phase 5
> Phase 4（スタイリング）完了後に着手すること

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P5-1 | `vite.config.ts` base パス設定 | P1-1 | 未着手 |
| P5-2 | `.github/workflows/deploy.yml` 作成 | P5-1 | 未着手 |
| P5-3 | GitHub リポジトリ設定・初回デプロイ | P5-2 | 未着手 |
| P5-4 | 公開後の動作確認 | P5-3 | 未着手 |

---

## P5-1: `vite.config.ts` base パス設定

### 設定内容

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages のリポジトリ名をサブパスとして設定
  // 例: https://[username].github.io/election_randomizer/
  base: '/election_randomizer/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

### fetch パスの設定（App.tsx）

```typescript
// NG: 絶対パスはGitHub Pages で404になる
fetch('/data/candidates.json')

// OK: BASE_URL を使う
const BASE = import.meta.env.BASE_URL  // → '/election_randomizer/'
fetch(`${BASE}data/candidates.json`)
```

### 完了条件
- [ ] `npm run build` が成功する
- [ ] `dist/` に `data/` フォルダが含まれている（`public/data/` がコピーされている）

---

## P5-2: `.github/workflows/deploy.yml` 作成

### ファイル内容

```yaml
name: Build and Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4

      - name: Node.js をセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 依存関係をインストール
        run: npm ci

      - name: ビルド
        run: npm run build

      - name: GitHub Pages アーティファクトをアップロード
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: GitHub Pages にデプロイ
        id: deployment
        uses: actions/deploy-pages@v4
```

### 注意事項
- `public/data/*.json` は Git にコミット済みであること（スクリプトで生成後にコミット）
- Node.js のバージョンは 20 を使用（Vite 6.x の要件）

### 完了条件
- [ ] ファイルが `.github/workflows/deploy.yml` に存在する
- [ ] YAML 構文エラーがない

---

## P5-3: GitHub リポジトリ設定・初回デプロイ

### 前提
- GitHub リポジトリ名: `election_randomizer`
- ユーザーが GitHub にリポジトリを作成済みであること

### GitHub Pages 設定手順（ユーザーが実施）
```
1. GitHub リポジトリ → Settings → Pages
2. Source: "GitHub Actions" を選択
3. 保存
```

### 初回デプロイ手順

```bash
# 1. Gitの初期化（まだの場合）
git init
git add .
git commit -m "初期コミット: 衆院選ランダム配置シミュレーター"

# 2. リモートリポジトリを追加（ユーザーのリポジトリURLに合わせる）
git remote add origin https://github.com/[username]/election_randomizer.git
git branch -M main

# 3. プッシュ（GitHub Actions がトリガーされる）
git push -u origin main
```

### デプロイ確認
```
GitHub Actions タブ → "Build and Deploy to GitHub Pages" ワークフローを確認
成功すると: https://[username].github.io/election_randomizer/ でアクセス可能
```

### 完了条件
- [ ] GitHub Actions が成功（グリーン）
- [ ] `https://[username].github.io/election_randomizer/` でアプリが表示される

---

## P5-4: 公開後の動作確認

### 確認チェックリスト

**データロード**
- [ ] `/data/candidates.json` が 200 で返る（DevTools Network タブで確認）
- [ ] `/data/constituencies.json` が 200 で返る
- [ ] `/data/proportional_candidates.json` が 200 で返る
- [ ] `/data/proportional_seats.json` が 200 で返る

**シミュレーション**
- [ ] 「シミュレーション実行」ボタンが有効化される
- [ ] ボタンクリックで結果が表示される
- [ ] 再実行で異なる結果が表示される（ランダム性の確認）

**各コンポーネント**
- [ ] SeatSummary: 政党別議席数が表示される
- [ ] DeathGroup: TOP10カードが表示される
- [ ] JapanMap: 都道府県が塗り分けられている
- [ ] JapanMap: 都道府県クリックで選挙区リストが表示される
- [ ] ConstituencyList: 289行が表示される
- [ ] ConstituencyList: 検索・フィルター・ソートが動作する
- [ ] StatsSummary: 統計情報が表示される

**パフォーマンス**
- [ ] 初期ロード: 3秒以内（LCP）
- [ ] シミュレーション実行: 150ms 以内

### 完了条件
- [ ] 全チェックリスト通過
- [ ] コンソールエラー 0件
- [ ] プロジェクト完成
