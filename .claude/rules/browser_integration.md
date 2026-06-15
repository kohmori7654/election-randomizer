# ルール：ブラウザ連携とテスト実行の前提条件

## 1. ブラウザ操作の方式

**Playwright MCP 経由**でブラウザを操作する。CDP直接接続（旧 Antigravity 方式）は使用しない。

```
エージェント → Playwright MCP → ブラウザ
```

## 2. Playwright MCP の自動起動ルール

以下のキーワードを含む依頼を受けたら、**ユーザーへの確認なし・追加指示待ちなし**に、即座に Playwright MCP でブラウザを起動して対応する。

| トリガーキーワード | 対応 |
|---|---|
| 「〜を確認して」「〜を検証して」 | Playwright でアクセスしてスクリーンショット取得 |
| 「表示されるか確認」「正常に動くか確認」 | Playwright でページレンダリングを確認 |
| 「動作確認」「画面確認」「UI確認」 | Playwright で実際にブラウザ操作 |
| URL を直接指示された場合 | WebFetch ではなく Playwright MCP を優先使用 |

> **禁止事項**: 「Playwright MCP を有効化していただければ…」等の説明でお茶を濁すことは禁止。接続済みであれば即実行すること。

## 3. URL の指定ルール

**ポート番号を直接指定してはならない。** 必ず portless の名前付き URL を使うこと。

```bash
# 良い例
http://myapp.localhost:1355
http://api.myapp.localhost:1355

# 悪い例（禁止）
http://localhost:3000
http://localhost:8080
```

アクセス先が不明な場合は `portless list` で確認してからブラウザ操作を開始する。

## 4. ブラウザ操作フロー

```
portless list でサービスの起動を確認
    ↓
✅ 対象サービスが起動中 → Playwright MCP で名前付き URL にアクセス
❌ サービス未起動      → start-services.md の手順でサービスを起動してから実施
```

詳細手順: `.claude/workflows/start-services.md`

## 5. エラー時の行動規範

Playwright MCP でアクセスできない場合:
1. ブラウザ操作を**直ちに中断**する
2. `portless list` でサービス起動状態を確認する
3. 未起動なら `start-services.md` の手順で再起動を試みる
4. 解決しない場合はユーザーに状況を報告する
5. **ダミーテストの実行・代替手段によるごまかし禁止**
