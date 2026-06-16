# META: 出力トークン上限エラー対策

## ステータス

- [x] ✅ 完了（2026-06-16）
  - `.claude/settings.json` の `env` セクションに `CLAUDE_CODE_MAX_OUTPUT_TOKENS: "100000"` を追加（対策A）
  - `CLAUDE.md` の「タスク実行の鉄則」セクションに1件ずつ実行ルールを追記（対策B）
  - `.claude/settings.json` に `SessionStart` フックを追加（セッション開始時にルールを自動注入）

## 問題

SESSION.md と session/ 配下のタスクを一括読み込みして優先度順に消化する指示を出したところ、以下のエラーが発生した。

```
● API Error: Claude's response exceeded the 32000 output token maximum.
  To configure this behavior, set the CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.
```

**原因**: 複数フェーズのタスクを一度に実行しようとして、1レスポンスの出力トークンが 32,000 を超えた。

---

## 対策方針

### A. 環境変数による上限引き上げ（即効性高・リスク低）

`.env` または shell 設定に以下を追記する。

```bash
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=100000
```

またはセッション開始時に明示的に指定：

```bash
CLAUDE_CODE_MAX_OUTPUT_TOKENS=100000 claude
```

**メリット**: 即時解決。既存ワークフロー変更不要。  
**デメリット**: 大量トークン消費による速度低下・コスト増の可能性。

---

### B. タスク実行の粒度ルール化（根本対策）

SESSION.md のタスク消化指示を「1フェーズずつ」に制限するルールを設ける。

#### 推奨指示文テンプレート

```
SESSION.md を読んで、最優先タスクを**1件だけ**実行してください。
完了後に SESSION.md を更新し、次のタスクに進む前に報告してください。
```

**メリット**: トークン超過を構造的に防止。  
**デメリット**: ユーザーが手動で都度指示を送る手間が増える。

---

### C. 実行計画を先にリストアップしてからユーザー承認（安全策）

タスク消化の前に実行予定リストだけを出力し、ユーザーが「実行」と返信してから着手するワークフロー。

```
1. 実行予定タスク一覧を出力（実装なし）
2. ユーザー承認
3. 1件ずつ実行 → SESSION.md 更新 → 次タスクへ
```

---

## 推奨アクション

| 優先度 | アクション |
|---|---|
| 高 | `.env` に `CLAUDE_CODE_MAX_OUTPUT_TOKENS=100000` を追加（対策A） |
| 中 | SESSION.md の「タスク消化方針」セクションに対策Bのテンプレートを記載 |
| 低 | CLAUDE.md の「コマンド実行権限」セクションに注意書きを追加 |

---

## 完了条件

- [ ] `CLAUDE_CODE_MAX_OUTPUT_TOKENS` 設定追加または SESSION.md へのルール記載
- [ ] 再発防止のための推奨指示文が SESSION.md に記載されている
