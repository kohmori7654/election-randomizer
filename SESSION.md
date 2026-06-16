# セッション状態

> このファイルはエージェントがコンテキスト引き継ぎのために管理する。
> 作業の節目・中断前に必ず更新すること。

---

## ⚠️ タスク実行の注意事項

**出力トークン上限エラー対策**: タスクを消化する際は **1件ずつ** 実行すること。
一括実行は 32,000 出力トークン上限を超えてエラーになる。

推奨指示文:
```
SESSION.md を読んで、最優先タスクを1件だけ実行してください。
完了後に SESSION.md を更新し、次タスクに進む前に報告してください。
```

詳細: `session/meta_token_limit.md`

---

## 残タスク（優先度順）

- [ ] **P5-3**: GitHub Pages 公開（ユーザーの GitHub URL が必要）← **次の最優先タスク**

---

## 確定仕様

- **シミュレーション対象**: 小選挙区候補 1,119人のみ
- **惜敗率計算式**: `simulatedHaiseiritsu = (loser.finalScore / winner.finalScore) × 100`
- **比例議席数**: 実際の選挙結果を固定値使用（ドント式は再計算しない）
- **対象選挙**: 第51回衆議院議員選挙（衆院選2026）

## データファイル

| ファイル | 件数 |
|---|---|
| `public/data/candidates.json` | 1,119件 |
| `public/data/proportional_candidates.json` | 914件（比例単独173、SMD連動741） |
| `public/data/constituencies.json` | 289件 |
| `public/data/proportional_seats.json` | 11ブロック |

---

## タスク詳細（session/ 参照）

| ファイル | 内容 |
|---|---|
| `session/phase27_map_gaps.md` | P27: 地図グリッド空白修正（✅完了） |
| `session/phase26_autorun_bug.md` | P26: 初回ロード時「計算中」から進まないバグ修正（P26-3 ブラウザ確認 pending） |
| `session/phase25_grid_fix_shikoku_okinawa.md` | P25: 四国・沖縄の重なり解消（✅完了）|
| `session/phase24_seat_graph_lines.md` | P24: 過半数・2/3 ラインをバーグラフ内に表示する修正 |
| `session/phase18_map_prefecture_size.md` | P18: 都道府県セルサイズ面積比例拡大（保留中） |

---

## 最終更新

| 項目 | 値 |
|---|---|
| 日時 | 2026-06-16 |
| 更新者 | main エージェント |
| 理由 | P25 フェーズ全完了（四国・沖縄グリッド修正・ブラウザ確認済み） |
| 次回再開時 | P5-3（GitHub Pages 公開）― GitHub URL をユーザーから取得してから着手 |
