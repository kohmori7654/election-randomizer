# Phase 17: 政治スコア・イデオロギーブロック調整

## 概要

`parties.ts` の `PARTY_POLITICAL_SCORE` と `IDEOLOGICAL_BLOC` を依頼仕様に合わせて更新する。
あわせて `nhk` の政党名表記誤り（`'NHK党'` → `'日本保守党'`）を修正する。

---

## 前提調査結果

`nhk` という partyId は **設計当初から日本保守党を指す ID**（`phase1_engine.md` 参照）。
ただし現在の `parties.ts` では `name: 'NHK党'` と誤記されているため、あわせて修正が必要。

---

## タスク一覧

### P17-0: parties.ts の政党名表記修正（nhk）

**対象ファイル**: `src/data/parties.ts`

```ts
// 修正前
nhk: { id: 'nhk', name: 'NHK党', shortName: 'NHK', color: '#00A0E9' },

// 修正後
nhk: { id: 'nhk', name: '日本保守党', shortName: '保守党', color: '#00A0E9' },
```

---

### P17-1: PARTY_POLITICAL_SCORE の更新

**対象ファイル**: `src/data/parties.ts`

| 政党名 | partyId | 現在値 | 新しい値 | 変更有無 |
|---|---|---|---|---|
| 日本保守党 | nhk    | 0.5  | **0.90** | ✏️ 変更 |
| 参政党       | sansei | 0.7  | **0.80** | ✏️ 変更 |
| 日本維新の会 | ishin  | 0.5  | **0.70** | ✏️ 変更 |
| 自民党       | ldp    | 0.8  | **0.65** | ✏️ 変更 |
| 無所属       | ind    | 0.5  | **0.50** | 変更なし |
| 減税日本・ゆうこく連合 | genzei | 0.6 | **0.50** | ✏️ 変更 |
| チームみらい | tm     | 0.45 | **0.50** | ✏️ 変更 |
| 国民民主党   | dpfp   | 0.4  | **0.40** | 変更なし |
| 中道改革連合 | crc    | 0.3  | **0.30** | 変更なし |
| れいわ新選組 | reiwa  | 0.2  | **0.20** | 変更なし |
| 社民党       | sdp    | 0.2  | **0.10** | ✏️ 変更 |
| 共産党       | jcp    | 0.1  | **0.10** | 変更なし |

---

### P17-2: IDEOLOGICAL_BLOC の再設計

**対象ファイル**: `src/data/parties.ts`、`src/engine/scoring.ts`、`src/engine/runner.ts`、関連テスト

#### 新しいブロック分類

| ブロック | 政党 | partyId |
|---|---|---|
| 保守 (conservative) | 日本保守党、参政党、日本維新の会、自民党 | nhk, sansei, ishin, ldp |
| 中道 (center) | チームみらい、国民民主党、中道改革連合 | tm, dpfp, crc |
| 革新 (progressive) | 中道改革連合、れいわ新選組、社民党、共産党 | crc, reiwa, sdp, jcp |
| その他 (other) | 無所属、減税日本・ゆうこく連合 | ind, genzei |

#### 特殊仕様

1. **中道改革連合 (crc)** は「中道」と「革新」の両ブロックに属する
   - 実装：sameBlocCount を中道・革新の双方で算出し、**大きい値（ペナルティが強い方）を採用**

2. **その他カテゴリは bloc ペナルティ無効**
   - `ind`（無所属）・`genzei`（減税日本・ゆうこく連合）は `sameBlocCount = 0` として扱う
   - 同一政党内の競合は従来通り `samePartyCount` でペナルティあり（無所属同士は影響しない）

#### 型定義の変更

```ts
// 現在
'conservative' | 'progressive' | 'center'

// 新しい型
'conservative' | 'progressive' | 'center' | 'other'
```

#### 影響範囲

| ファイル | 変更内容 |
|---|---|
| `src/data/parties.ts` | `IDEOLOGICAL_BLOC` 定義更新、型に `'other'` 追加 |
| `src/engine/runner.ts` | `sameBlocCount` 計算ロジック（crc 二重所属、other 除外） |
| `src/engine/scoring.ts` | `calcVoteSplitPenalty`（`other` ブロック時の `blocPenalty = 1.0` 固定） |
| `src/types/election.ts` | `IdeologicalBloc` 型の更新（型定義ファイルがある場合） |
| `src/__tests__/scoring.test.ts` | テスト更新 |

---

## 実装順序

1. P17-0: nhk の政党名修正（`NHK党` → `日本保守党`）
2. P17-1: PARTY_POLITICAL_SCORE の数値更新
3. P17-2-a: 型定義に `'other'` を追加
4. P17-2-b: `IDEOLOGICAL_BLOC` の再分類
5. P17-2-c: `runner.ts` の sameBlocCount 計算更新（crc 二重所属・other 除外）
6. P17-2-d: `scoring.ts` で other ブロックの blocPenalty を 1.0 固定
7. P17-2-e: テスト更新・`npm test` 全件パス確認

---

## ステータス

- [x] P17-0: nhk 政党名修正（NHK党 → 日本保守党, shortName: NHK → 保守党）
- [x] P17-1: PARTY_POLITICAL_SCORE 更新
- [x] P17-2: IDEOLOGICAL_BLOC 再設計（IdeologicalBloc 型追加、SECONDARY_BLOC 追加、runner.ts 更新）

## 完了確認

- `npm test`: 46/46 パス ✅
- `npm run build`: エラーなし ✅
- 完了日: 2026-06-15
