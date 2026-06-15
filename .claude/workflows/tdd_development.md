# ワークフロー：Vibe Coding TDD（Developer / QA 用）

## 前提条件

実行前に必ず以下を確認すること:
- `Implementation_Plan.md`（または明確な仕様）を読み込み、要件を完全に理解している
- `.claude/rules/security_governance.md` のタイムアウト規則を把握している

---

## TDD 実行ステップ

### 🔴 Phase 1: Red（Developer）

**目標**: 失敗するテストを先に作成する

```bash
# テスト実行例（必ずtimeoutを付与）
timeout 60s pytest tests/test_feature.py -v
timeout 60s npx vitest run src/feature.test.ts
```

**停止ルール**: テスト作成・実行後、**必ず一度停止**してユーザーに確認を促す。

```
🔴 Red フェーズ完了
テストが失敗していることを確認しました。
Green フェーズ（最小実装）に進んでよいですか？
```

**Git コミット**:
```bash
git commit -m "test: add failing test for [機能名]"
```

---

### 🟢 Phase 2: Green（Developer）

**目標**: 最小限の実装でテストを通す（きれいさより通すことを優先）

- 仮実装（ハードコード等）も許容する
- テストが全て通ったら即座に停止

```bash
timeout 60s pytest tests/test_feature.py -v
timeout 60s npx vitest run src/feature.test.ts
```

**Git コミット**:
```bash
git commit -m "feat: implement [機能名]"
```

---

### 🔵 Phase 3: Refactor（QA / Developer）

**目標**: コード品質の向上・テスト網羅性の確認

#### Developer の責務
- リファクタリング後もテストが全て通ることを確認
- ドキュメント・コメントの更新

#### QA の責務
- テストの網羅性再確認（境界値・異常系の追加）
- 静的解析の実行

```bash
# Python
timeout 60s ruff check .
timeout 60s mypy src/

# TypeScript / JavaScript
timeout 60s npx eslint src/
timeout 60s npx tsc --noEmit
```

**Git コミット**:
```bash
git commit -m "refactor: [変更内容]"
```

---

## Git コミットメッセージ規約まとめ

| フェーズ | プレフィックス | 例 |
|---|---|---|
| 🔴 Red | `test:` | `test: add failing test for ユーザー認証` |
| 🟢 Green | `feat:` | `feat: implement ユーザー認証` |
| 🔵 Refactor | `refactor:` | `refactor: 認証ロジックを関数に分離` |

---

## バグ修正ワークフロー

新機能開発の Red/Green/Refactor とは別に、バグ修正専用のフローに従うこと。

### 🔴 Step 1: 再現テスト（Reproduce）

**目標**: バグを再現する失敗テストを書き、再現性を確認する

- 既存テストに追加、または `tests/test_<対象モジュール>.py` に追記する
- テストが **失敗することを確認** してから次へ進む

```bash
timeout 60s pytest tests/test_target.py::test_bug_name -v
timeout 60s npx vitest run src/target.test.ts
```

**停止ルール**: 再現テスト作成・実行後、**必ず一度停止**してユーザーに確認を促す。

```
🔴 再現テスト完了
バグが再現することを確認しました（テスト失敗）。
修正計画を提示してよいですか？
```

**Git コミット**:
```bash
git commit -m "test: add regression test for [バグの概要]"
```

---

### 📋 Step 2: 修正計画の提示

**目標**: 根本原因と修正方針をユーザーに提示し、承認を得る

以下をユーザーに提示すること:
1. **根本原因**: なぜこのバグが発生しているか
2. **修正方針**: どのファイル・箇所をどう変更するか
3. **影響範囲**: 変更によって影響を受ける可能性がある箇所

**停止ルール**: ユーザーの承認を得てから実装に進む。

---

### 🟢 Step 3: 修正実装（Fix）

**目標**: Step 1 の再現テストが通るよう修正する

- 修正後、再現テストと既存テストが全て通ることを確認する

```bash
timeout 60s pytest -v
timeout 60s npx vitest run
```

**Git コミット**:
```bash
git commit -m "fix: [バグの概要]"
```

---

### バグ修正のコミットメッセージ規約

| フェーズ | プレフィックス | 例 |
|---|---|---|
| 再現テスト | `test:` | `test: add regression test for ログイン失敗時の無限ループ` |
| 修正実装 | `fix:` | `fix: ログイン失敗時の無限ループを修正` |
