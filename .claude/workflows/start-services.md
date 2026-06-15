# ワークフロー：開発サービスの起動とブラウザ検証（WSL2 環境）

> 旧: `start-browser.md`（CDP直接接続）→ 新: portless + Playwright MCP 方式に移行

---

## 構成概要

```
Claude Code（Playwright MCP）
        ↓ MCP 経由でブラウザ操作
Playwright
        ↓
portless proxy（port 1355）
        ↓ ドメイン名でルーティング
┌─────────────────────────────┐
│ myapp.localhost     → :4123 │  ← frontend
│ api.myapp.localhost → :4567 │  ← API
└─────────────────────────────┘
```

---

## Step 1: portless のセットアップ（初回のみ）

```bash
# グローバルインストール（プロジェクト依存には追加しない）
npm install -g portless

# HTTPS を使う場合（推奨）：証明書を生成してシステムに信頼させる
portless proxy start --https
# → 初回のみ sudo パスワードを求められる

# HTTP でよい場合（シンプル）
portless proxy start
```

### WSL2 固有の注意

`.localhost` サブドメインが解決されない場合は `/etc/hosts` に同期する:

```bash
sudo portless hosts sync
# → /etc/hosts に myapp.localhost 等が追記される

# 不要になったら削除
sudo portless hosts clean
```

---

## Step 2: サービスを起動する

```bash
# フロントエンド（Next.js / Vite / Nuxt 等）
portless myapp next dev
# → http://myapp.localhost:1355  （内部: 自動割り当て 4000-4999）

# API サーバー（Express / FastAPI 等）
portless api.myapp pnpm start
# → http://api.myapp.localhost:1355

# ドキュメントサイト
portless docs.myapp next dev
# → http://docs.myapp.localhost:1355
```

### 起動確認

```bash
portless list
# 出力例:
# myapp       http://myapp.localhost:1355       → :4123
# api.myapp   http://api.myapp.localhost:1355   → :4567
```

---

## Step 3: Playwright MCP でブラウザ検証

### MCP の登録（初回のみ）

```bash
claude mcp add --transport stdio playwright -- npx @playwright/mcp@latest
```

### エージェントへの指示例

```
「http://myapp.localhost:1355 を開いて、
  ログインフォームに test@example.com / password123 を入力し、
  ログインボタンを押した後のリダイレクト先を確認して」
```

```
「http://api.myapp.localhost:1355/health にアクセスして
  レスポンスのステータスコードと本文を確認して」
```

---

## エラー対応

### portless の URL にアクセスできない場合

```bash
# 1. プロキシが起動しているか確認
portless list

# 2. 起動していなければ再起動
portless proxy start

# 3. .localhost が解決されない（WSL2 / Safari）
sudo portless hosts sync
```

### Playwright MCP が動かない場合

```bash
# MCP サーバーの状態確認
claude mcp list

# 再登録
claude mcp remove playwright
claude mcp add --transport stdio playwright -- npx @playwright/mcp@latest
```

### vite / webpack が API をプロキシしている場合の注意

フロントエンドの dev サーバーが `/api` を `api.myapp.localhost:1355` へプロキシする場合、
**Host ヘッダーの書き換えが必要**。書き換えなしだと portless がフロントエンドへループする。

```ts
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://api.myapp.localhost:1355',
        changeOrigin: true,  // ← Host ヘッダーを書き換える（必須）
      },
    },
  },
}
```

---

## package.json への組み込み（推奨）

```json
{
  "scripts": {
    "dev":     "portless myapp next dev",
    "dev:api": "portless api.myapp pnpm start",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:api\""
  }
}
```

---

## portless を使わず直接起動したい場合（エスケープハッチ）

```bash
PORTLESS=0 npm run dev
# → 通常の localhost:3000 で起動（portless をバイパス）
```
