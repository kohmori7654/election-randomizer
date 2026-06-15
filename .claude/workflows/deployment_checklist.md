# ワークフロー：デプロイ前チェックリスト

git push / デプロイ実行前に必ず確認するチェックリスト。
qa エージェントの検証完了後、またはユーザーから push/deploy を依頼された際に実行する。

---

## Push 前チェック

### コード品質
```bash
# Lint（タイムアウト必須）
timeout 60s npx eslint src/          # TypeScript/JavaScript
timeout 60s ruff check .             # Python

# 型チェック
timeout 60s npx tsc --noEmit        # TypeScript
timeout 60s mypy src/               # Python

# テスト全通過確認
timeout 120s npm test                # または pytest
```

- [ ] Lint エラーがゼロ
- [ ] 型エラーがゼロ
- [ ] テストがすべて通過

### セキュリティ
- [ ] `.env` / `.env.local` がコミットに含まれていない
- [ ] APIキー・シークレットがソースコードに直書きされていない
- [ ] `npm audit` / `pip-audit` で高リスク脆弱性がない

```bash
timeout 60s npm audit --audit-level=high
```

### Git 状態
```bash
git status        # 意図しないファイルが含まれていないか確認
git diff HEAD     # コミット内容の最終確認
git log --oneline -5  # コミットメッセージが Conventional Commits 規約に沿っているか
```

- [ ] コミットメッセージが `feat:` / `fix:` / `test:` 等の規約に従っている
- [ ] 意図しないファイル（ログ、一時ファイル等）がコミットされていない
- [ ] `CLAUDE.md` や `SESSION.md` の機密情報が含まれていない

---

## デプロイ前チェック（本番環境向け）

### 環境変数・設定
- [ ] 本番用の環境変数が正しく設定されている
- [ ] 開発用の設定（ダミーデータ、デバッグフラグ等）が無効になっている
- [ ] portless の設定は本番では不要（直接ポートを使う）

### データベース
- [ ] マイグレーションが最新か確認
- [ ] バックアップが取られているか確認（破壊的マイグレーションの場合）

### 動作確認
- [ ] ステージング環境で動作確認済み（存在する場合）
- [ ] 主要な正常系フローが通ることを手動確認

---

## デプロイ後の懸念点ピックアップ

デプロイ完了後に以下を確認してユーザーに報告する:

### 即時確認（デプロイ直後）
```bash
# ヘルスチェック
curl -s http://api.${APP_NAME}.localhost:${PORTLESS_PORT}/health

# ログ確認（エラーが出ていないか）
# ※本番環境のログ確認コマンドはプロジェクト固有
```

### 報告フォーマット

```
## デプロイ完了レポート

### 確認済み
- [ テストがすべて通過 ]
- [ Lint/型エラーなし ]

### 懸念点
- [発見した懸念点を箇条書きで記載]

### 次回以降の改善提案
- [今回のデプロイで気づいた改善点]
```

---

## 参考：よくある問題と対処

| 問題 | 確認コマンド | 対処 |
|---|---|---|
| portless URLにアクセスできない | `portless list` | `portless proxy start` で再起動 |
| WSLでサブドメインが解決されない | `cat /etc/hosts | grep localhost` | `sudo portless hosts sync` |
| テストが通るのに本番で失敗 | 環境変数を確認 | `.env.example` と本番の差分を確認 |
