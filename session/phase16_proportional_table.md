# Phase 16: 比例名簿テーブル表示改善

> 受付日: 2026-06-15

---

## タスク一覧

| ID | タスク | 対象ファイル | 状態 |
|---|---|---|---|
| P16-1 | `ProportionalRankingEntry` に `constituencyName` / `isProportionalOnly` 追加 | `src/types/election.ts` | ✅ 完了 |
| P16-2 | `buildRankingChanges` で選挙区名をエントリに含める | `src/engine/runner.ts` | ✅ 完了 |
| P16-3 | テーブルに「選挙区」列を追加 + 当落列をテキストラベル化 | `src/components/ProportionalRankingTable.tsx` | ✅ 完了 |

---

## 背景・設計方針

### 問題

- 「実際」「シミュ」列が ○/✗/小 の記号のみで意味が分かりにくい
- 小選挙区の選挙区名が表示されていない

### 変更内容

1. **選挙区列の追加**
   - 小選挙区兼任候補: 元の選挙区名（例: `北海道1区`）を表示
   - 比例単独候補: 「比例単独」と表示

2. **当落列のラベル変更**

   | 旧表示 | 新表示 |
   |---|---|
   | `小`（smdWin） | `小選挙区当選` |
   | `○`（比例当選） | `比例復活` or `比例単独当選` |
   | `✗`（落選） | `落選` |

3. **型の変更** (`ProportionalRankingEntry`)
   - `constituencyName: string | null` を追加（小選挙区の選挙区名、比例単独は null）
   - `isProportionalOnly: boolean` を追加（runner.ts 側で設定）

---

## 完了内容

- `src/types/election.ts`: `ProportionalRankingEntry` に `constituencyName`, `isProportionalOnly` 追加
- `src/engine/runner.ts`: `buildRankingChanges` で `constituencyName` と `isProportionalOnly` をセット
- `src/components/ProportionalRankingTable.tsx`: 「選挙区」列追加、`ElectedBadge` をテキストラベルに変更
