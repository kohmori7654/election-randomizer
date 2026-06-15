# Phase 0 追加: candidates.json データ品質修正

> 追加日: 2026-06-15
> 優先度: **最高**（P6-10A+D のアルゴリズム修正より先に実施すること）
> 理由: データ修正後にアルゴリズムの正確な動作を確認できる

---

## 問題の全容

### スキャン結果（全1,119候補者を調査済み）

`votes` フィールドが `originalVoteRate × 推定総票数` の **1/10 以下** になっている候補者:

| 選挙区 | senkyokuId | 候補者 | 政党 | votes(現在) | votes(期待値) | ratio | elected |
|---|---|---|---|---|---|---|---|
| 愛知7区 | 51011 | 鈴木 じゅんじ | ldp | 898 | 94,836 | 0.0095 | proportional_win |
| 愛知7区 | 51011 | 鈴木 こういち | jcp | 96 | 14,356 | 0.0067 | lose |
| 愛知10区 | 51015 | 三嶋 りょうへい | dpfp | 837 | 21,071 | 0.0397 | lose |
| 愛知10区 | 51015 | 山内 りょうへい | sansei | 162 | 17,815 | 0.0091 | lose |
| 兵庫6区 | 51096 | いちむら 浩一郎 | ishin | 590 | 63,556 | 0.0093 | proportional_win |
| 兵庫6区 | 51096 | 谷 浩一郎 | sansei | 409 | 26,879 | 0.0152 | proportional_win |
| 熊本4区 | 51169 | 植田 たかとし | sansei | 673 | 17,980 | 0.0374 | lose |
| 熊本4区 | 51169 | 上田 いたる | dpfp | 307 | 16,482 | 0.0186 | lose |
| 茨城2区 | 51238 | 小沼 たくみ | crc | 83 | 30,511 | 0.0027 | lose |
| 茨城2区 | 51238 | 宮内 たくみ | sansei | 910 | 16,080 | 0.0566 | lose |
| 石川3区 | 51249 | にしだ 昭二 | ldp | 720 | 73,057 | 0.0099 | smd_win |
| 石川3区 | 51249 | 南 しょうじ | jcp | 274 | 2,815 | 0.0973 | lose |
| 東京3区 | 51264 | 石原 ひろたか | ldp | 548 | 93,171 | 0.0059 | smd_win |
| 東京3区 | 51264 | 植木 ひろたか | sansei | 450 | 17,497 | 0.0257 | lose |
| 東京10区 | 51276 | 鈴木 隼人 | ldp | 286 | 126,443 | 0.0023 | smd_win |
| 東京10区 | 51276 | 鈴木 ようすけ | crc | 712 | 67,728 | 0.0105 | lose |

**合計: 8選挙区・16候補者**

### スキャン実行コマンド（再現用）

```bash
python3 -c "
import json
candidates = json.load(open('public/data/candidates.json'))
by_senkyoku = {}
for c in candidates:
    by_senkyoku.setdefault(c['senkyokuId'], []).append(c)
for sid, group in by_senkyoku.items():
    ref = max(group, key=lambda x: x['votes'])
    if ref['originalVoteRate'] == 0: continue
    est = ref['votes'] / ref['originalVoteRate']
    for c in group:
        exp = c['originalVoteRate'] * est
        if exp > 0 and c['votes'] / exp < 0.10:
            print(c['constituencyName'], c['nameKanji'], c['votes'], round(exp))
"
```

### バグパターンの分析

各選挙区で必ず **2件ずつ** 発生しており、下記の規則性がある:

| 選挙区 | 共通する特徴 |
|---|---|
| 東京3区 | 2人とも名前が「ひろたか」（石原 ひろたか / 植木 ひろたか） |
| 東京10区 | 2人とも名字が「鈴木」（鈴木 隼人 / 鈴木 ようすけ） |
| 愛知7区 | 2人とも名字が「鈴木」（鈴木 じゅんじ / 鈴木 こういち） |
| 愛知10区 | 2人とも名前が「りょうへい」（三嶋 りょうへい / 山内 りょうへい） |
| 兵庫6区 | 2人とも名前が「浩一郎」（いちむら 浩一郎 / 谷 浩一郎） |
| 茨城2区 | 2人とも名前が「たくみ」（小沼 たくみ / 宮内 たくみ） |
| 熊本4区 | 2人とも名前が「たかとし / いたる」（別名前だが同パターン） |
| 石川3区 | 特定パターンなし（当選者 + JCP 候補が異常） |

**推定原因**: `scrape_candidates.py` が HTML テーブルを行ごとにパースする際、
同じ選挙区内に同じ名前（名字または名前）を持つ複数の候補者がいると、
票数列のデータを別の候補者の行と混同してスクレイピングしてしまう。
その結果、「最多票数の候補者のデータは正しいが、同名の候補者のvotesが誤り」になる。

---

## タスク一覧

| ID | タスク | 優先度 | 依存 | 状態 |
|---|---|---|---|---|
| P0-6A | 検証スクリプト `scripts/validate_votes.py` 作成 | 中（スキャン結果は既判明） | なし | 未着手 |
| **P0-6B** | **8選挙区16候補の正しい票数を複数ソースで照合** | **最高** | なし | **未着手** |
| **P0-6C** | **`candidates.json` の votes フィールドを正しい値に修正** | **最高** | P0-6B | **未着手** |
| P0-6D | `scripts/scrape_candidates.py` のバグ修正（同名候補者問題） | 中 | P0-6B | 未着手 |

---

## P0-6A: 検証スクリプト作成

### ファイル: `scripts/validate_votes.py`

```python
"""
candidates.json の votes フィールドと originalVoteRate の整合性チェック。
各選挙区で最大득票候補者のデータを基準に、他の候補者の期待票数を推計し、
実際の票数と比較して異常値を検出する。
"""
import json

candidates = json.load(open('public/data/candidates.json'))

by_senkyoku = {}
for c in candidates:
    by_senkyoku.setdefault(c['senkyokuId'], []).append(c)

print('=== votes/rate 不整合スキャン ===')
anomalies = []
for sid, group in by_senkyoku.items():
    ref = max(group, key=lambda x: x['votes'])
    if ref['originalVoteRate'] == 0:
        continue
    estimated_total = ref['votes'] / ref['originalVoteRate']

    for c in group:
        expected = c['originalVoteRate'] * estimated_total
        if expected > 0 and c['originalVoteRate'] > 0:
            ratio = c['votes'] / expected
            if ratio < 0.10:
                anomalies.append({
                    'district': c['constituencyName'],
                    'senkyokuId': c['senkyokuId'],
                    'name': c['nameKanji'],
                    'party': c['partyId'],
                    'actual_votes': c['votes'],
                    'expected_votes': round(expected),
                    'ratio': ratio,
                    'elected': c['elected'],
                })

for a in sorted(anomalies, key=lambda x: x['ratio']):
    print(
        f"{a['district']:12} {a['name']:16} {a['party']:8} "
        f"実際={a['actual_votes']:>8,} 期待≈{a['expected_votes']:>8,} "
        f"ratio={a['ratio']:.4f} elected={a['elected']}"
    )

print(f'\n異常件数: {len(anomalies)}件 / 全{len(candidates)}件')
print('正常に終了')
```

```bash
# 実行コマンド
python3 scripts/validate_votes.py
```

### 完了条件

- [ ] スクリプトが `scripts/validate_votes.py` に存在する
- [ ] 実行結果で 0件 (修正完了後)

---

## P0-6B: 正しい票数の複数ソース照合

### 照合対象

下記 16 候補者の正しい票数を、**2ソース以上で確認**してから修正すること。

### 照合ソース（優先順）

| 優先度 | ソース | 用途 |
|---|---|---|
| 1 | **go2senkyo 個別選挙区ページ** | 一次ソース（スクレイピング元）を目視確認 |
| 2 | **総務省 選挙結果データ** | 公式確定値（最も信頼性が高い） |
| 3 | **NHK 選挙特設サイト** | クロスチェック |
| 4 | **Wikipedia** 各選挙区記事 | クロスチェック（二次情報）|

### 照合方法（選挙区ごと）

#### ① go2senkyo 確認
各選挙区の URL パターン: `https://go2senkyo.com/senkyoku/...`
スクレイパーのログや候補者情報から、当該選挙区の URL を特定して目視確認。

#### ② 総務省確認
第51回衆議院議員総選挙 確定結果:
- トップ: `https://www.soumu.go.jp/senkyo/senkyo_s/data/shugiin/`
- 選挙区ごとの得票数 Excel ファイルから確認

#### ③ 照合シート（修正前後を記録）

| 選挙区 | 候補者 | 現在の votes | go2senkyo 確認値 | 総務省 確認値 | 採用値 | ソース |
|---|---|---|---|---|---|---|
| 愛知7区 | 鈴木 じゅんじ | 898 | ? | ? | ? | ? |
| 愛知7区 | 鈴木 こういち | 96 | ? | ? | ? | ? |
| 愛知10区 | 三嶋 りょうへい | 837 | ? | ? | ? | ? |
| 愛知10区 | 山内 りょうへい | 162 | ? | ? | ? | ? |
| 兵庫6区 | いちむら 浩一郎 | 590 | ? | ? | ? | ? |
| 兵庫6区 | 谷 浩一郎 | 409 | ? | ? | ? | ? |
| 熊本4区 | 植田 たかとし | 673 | ? | ? | ? | ? |
| 熊本4区 | 上田 いたる | 307 | ? | ? | ? | ? |
| 茨城2区 | 小沼 たくみ | 83 | ? | ? | ? | ? |
| 茨城2区 | 宮内 たくみ | 910 | ? | ? | ? | ? |
| 石川3区 | にしだ 昭二 | 720 | ? | ? | ? | ? |
| 石川3区 | 南 しょうじ | 274 | ? | ? | ? | ? |
| 東京3区 | 石原 ひろたか | 548 | ? | ? | ? | ? |
| 東京3区 | 植木 ひろたか | 450 | ? | ? | ? | ? |
| 東京10区 | 鈴木 隼人 | 286 | ? | ? | ? | ? |
| 東京10区 | 鈴木 ようすけ | 712 | ? | ? | ? | ? |

> この照合シートを埋めてから P0-6C に進むこと。
> ソースが1件しか確認できない場合は「未確認」として記録し、作業ログに残す。

### 完了条件

- [ ] 全16件について go2senkyo または総務省のいずれかで正しい値を確認済み
- [ ] 全16件についてもう1ソースでクロスチェック済み（または理由を記録）
- [ ] 照合シートに採用値とソースが記入されている

---

## P0-6C: `candidates.json` の修正

### 修正スクリプト（P0-6B の照合シート記入後に実行）

```python
"""
scripts/fix_votes.py
P0-6B の照合結果を反映して candidates.json の votes を修正する。
実行前に照合シートで全件確認済みであること。
"""
import json

# P0-6B 照合シートから確定した正しい票数（候補者ID → 正しいvotes）
CORRECTIONS = {
    # 候補者ID: 正しい票数（P0-6B 照合後に埋める）
    # 例: 544: 64893,  # こんどう 和也（これは正しいので修正不要）
    # 例: 543: 73057,  # にしだ 昭二（仮の期待値。実際の確認値で上書き）
}

candidates = json.load(open('public/data/candidates.json'))

modified = []
for c in candidates:
    if c['id'] in CORRECTIONS:
        old_votes = c['votes']
        c['votes'] = CORRECTIONS[c['id']]
        modified.append(f"ID={c['id']} {c['nameKanji']} {old_votes:,} → {c['votes']:,}")
    
json.dump(candidates, open('public/data/candidates.json', 'w'), ensure_ascii=False, indent=2)
print(f'修正件数: {len(modified)}件')
for m in modified:
    print(' ', m)
```

```bash
# 実行コマンド（照合シート記入後）
python3 scripts/fix_votes.py

# 修正後の検証
python3 scripts/validate_votes.py  # 0件になることを確認
```

### 完了条件

- [ ] `scripts/fix_votes.py` が実行済み
- [ ] `scripts/validate_votes.py` の実行結果が 0件
- [ ] `git diff public/data/candidates.json` で修正内容が確認できる

---

## P0-6D: `scripts/scrape_candidates.py` のバグ修正

### バグの推定原因

同一選挙区内で同じ名前または名字を持つ候補者（同名候補者）がいる場合、
HTML テーブルのパース時に票数データが別行と混同される。

### 調査手順

1. go2senkyo の東京3区（石原 ひろたか / 植木 ひろたか）のHTMLソースを確認
2. スクレイパーが票数を取得する処理（行のどのカラムを参照しているか）を特定
3. 同名候補者が存在する場合の行識別ロジックを修正

### 修正指針

- 名前ではなく **行番号または候補者ID** で行を一意に識別する
- スクレイピング後に `validate_votes.py` を自動実行し、異常を検出する CI チェックを追加

### 完了条件

- [ ] バグの原因がコードレベルで特定されている
- [ ] 修正後、東京3区・東京10区などの選挙区を再スクレイピングして正常値が取れる
- [ ] `validate_votes.py` で 0件になる

---

## 実装順序と依存関係

```
P0-6B（照合シート記入）
  ↓
P0-6C（candidates.json 修正）
  ↓
P0-6A（validate_votes.py で 0件確認）
  ↓
P6-10A+D（buildDominanceMap アルゴリズム修正）← 正しいデータで動作確認できる
  ↓
P0-6D（スクレイピングバグ修正・オプション）
```

> P0-6B/C 完了前に P6-10A+D を実装しても動作確認が不完全になる。
> データ修正 → アルゴリズム修正 → 解説HTML の順序を厳守。

---

## 参考: 期待値の推計方法

`originalVoteRate` は go2senkyo から取得した得票率で、全候補者で正しい値が入っている（検証済み）。
各選挙区で最多票数の候補者を基準に推定総票数を算出し、他候補の期待票数を計算する。

```
推定総有効票数 = max(votes) / max_candidate.originalVoteRate
期待票数[i] = candidate[i].originalVoteRate × 推定総有効票数
整合性比率 = 実際のvotes / 期待票数  → 1.0 に近いほど正確
```

実際のデータでは、各選挙区の「正常な候補者」の整合性比率は 0.99〜1.01 の範囲に収まっている。
