# プロジェクト：AI-Driven TDD Development

## 環境

- **実行環境**: WSL2 上の DevContainer
- **パス規則**: Linux形式（`/`区切り）のみ。`C:\`等のWindowsパスは禁止
- **新規リポジトリ**: `repos/` 配下に作成

## コンテキスト管理

Your context window will be auto-compacted. Do not stop tasks early due to
token budget concerns. Continue working until the task is fully complete.

## エージェント構成

| エージェント | 役割 | ワークフロー |
|---|---|---|
| `architect` | 要件定義・設計 | `requirement_analysis.md` |
| `developer` | TDD実装（Red/Green） | `tdd_development.md` |
| `qa` | テスト・静的解析・ブラウザ検証 | `tdd_development.md` |

## 共通規範

- **人格・レビュー**: `.claude/rules/persona.md` 厳守
- **セキュリティ**: `.claude/rules/security_governance.md` 厳守
- **ブラウザ連携**: `.claude/rules/browser_integration.md` 厳守

## ローカル開発 URL（portless）

ポート番号直接使用禁止。名前付き URL のみ使用。

| サービス | URL |
|---|---|
| フロントエンド | `http://${APP_NAME}.localhost:${PORTLESS_PORT}` |
| API | `http://api.${APP_NAME}.localhost:${PORTLESS_PORT}` |
| ドキュメント | `http://docs.${APP_NAME}.localhost:${PORTLESS_PORT}` |

設定: `.env.portless` / 起動手順: `.claude/workflows/start-services.md`

## セッション継続性

- **作業開始時**: `SESSION.md` を読み、前回の進捗を把握してから着手
- **節目ごと**: タスク完了・方針決定・フェーズ移行のたびに更新
- **コンテキスト逼迫時**: 中断前に必ず `SESSION.md` を書き出す

詳細: `.claude/workflows/session_handoff.md`

## コマンド実行権限

**ユーザーによる事前許可済み（確認不要・即実行）**:
- **ファイルの削除以外のすべての Bash コマンド**（許可を求めずに実行）
- `for` / `while` ループ、パイプ、`&&` 連結等の複合シェルコマンドも同様
- Python スクリプトの実行（`python3` / `pip3` / `-c` インラインスクリプト含む）
- npm / npx / node コマンド
- curl コマンド（HTTP リクエスト全般）
- git コマンド（`push --force` / `reset --hard` 等の破壊的操作は除く）

詳細: `.claude/rules/command_permissions.md`

## 優先事項

1. **完全日本語化**: コード・固有名詞以外はすべて日本語
2. **検証プロセスの提示**: 操作提示時は必ず成功確認コマンドをセットにする
3. **役割の逸脱禁止**: 自身の役割外の作業は行わず、適切なエージェントに引き継ぐ
4. **品質優先**: 速度より品質を優先する。時間をかけてでも正確・堅牢・保守性の高い実装を目指す
5. **コマンド確認時の説明**: Bash コマンドの実行許可をユーザーに求める際は、`description` フィールドにコマンドの目的を日本語で簡潔に記述する
