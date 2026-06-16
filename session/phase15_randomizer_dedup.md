# Phase 15: ランダマイザー重複解消アルゴリズム改善

> 受付日: 2026-06-15

---

## タスク一覧

| ID | タスク | 対象ファイル | 状態 |
|---|---|---|---|
| P15-1 | post-processing swap で同一政党重複を解消 | `src/engine/simulator.ts` | ✅ 完了 |
| P15-2 | テスト追加 | `src/__tests__/simulator.test.ts` | ✅ 完了 |

---

## 背景・設計方針

### 問題

既存の `assignCandidatesWithPartyDistribution` は政党インターリーブを行うが、小政党が先に
枯渇するためインターリーブの周期が崩れ、同一政党が同じ選挙区に複数配置されていた。

計測結果（seed=42）:
- 重複のある選挙区数: **205件**（289選挙区中）
- 政党別: ldp 87, crc 52, sansei 27, jcp 19, dpfp 11, ishin 8, ind 1

### 解決策

インターリーブ後の配分結果に **post-processing swap** パスを追加。
- 重複のある選挙区を検出し、重複候補者を「その政党がいない他の選挙区」とスワップ
- 2パスで完全解消（0件）を確認

### 実装詳細

`resolvePartyConflicts(result, constituencyIds, rand, maxPasses=5)` を追加し、
`assignCandidatesWithPartyDistribution` の末尾で呼び出す。

---

## 完了内容

- `src/engine/simulator.ts` に `resolvePartyConflicts` 関数を追加
- `assignCandidatesWithPartyDistribution` 末尾で呼び出し
- `src/__tests__/simulator.test.ts` に同一政党重複ゼロのテストを追加
