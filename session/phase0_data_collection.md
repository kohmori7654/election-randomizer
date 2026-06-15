# Phase 0: データ収集タスク詳細

> 参照: `Implementation_Plan.md` § Phase 0

---

## タスク一覧

| ID | タスク | 依存 | 状態 |
|---|---|---|---|
| P0-1 | `scripts/scrape_candidates.py` 実装 | なし | 未着手 |
| P0-2 | `scripts/scrape_constituencies.py` 実装 | なし | 未着手 |
| P0-3 | `scripts/parse_proportional_pdf.py` 実装 | なし | 未着手 |
| P0-4 | `scripts/generate_json.py` 実装 | P0-1, P0-2, P0-3 | 未着手 |
| P0-5 | スクレイピング実行・データ検証 | P0-4 | 未着手 |

---

## P0-1: `scripts/scrape_candidates.py`

### 概要
go2senkyo.com から小選挙区候補者 1,119人のデータを取得する。
スクレイピング失敗時は `parse_soumu_excel()` にフォールバックする。

### 出力
`scripts/raw_candidates.json`（generate_json.py の入力）

### 取得フィールド

| フィールド | 取得元 | 備考 |
|---|---|---|
| name | 候補者名（漢字） | |
| party | 政党名テキスト | generate_json.py で partyId に正規化 |
| originalConstituencyId | 選挙区番号（1〜289） | |
| originalConstituencyName | 選挙区名（例: 北海道1区） | |
| prefecture | 都道府県名 | |
| status | 現職/元職/新人 | |
| originalVotes | 得票数（整数） | |
| originalTotalVotes | 有効投票総数 | |
| won | 当落（boolean） | |

### 実装のポイント
- `REQUEST_DELAY = 2.0` 秒（サーバー負荷軽減）
- 最大3回リトライ
- 個別選挙区の失敗は `continue` でスキップし、ログ出力
- `HEADERS = {'User-Agent': 'ElectionSimulator/1.0 (educational)'}` を設定

### フォールバック: `parse_soumu_excel(filepath)`
```
取得元: https://www.soumu.go.jp/senkyo/51syusokuhou/index.html
ファイル名: 候補者別開票結果（.xlsx）
列構成: 選挙区名, 候補者名, 政党名, 得票数, 当落, 現元新
```

### 完了条件
- [ ] 1,119人（±5人以内の誤差許容）が取得できている
- [ ] 全289選挙区分のデータが揃っている
- [ ] `won=true` の件数が 289件（各区1人）
- [ ] `raw_candidates.json` が生成されている

---

## P0-2: `scripts/scrape_constituencies.py`

### 概要
289選挙区の基本データ（座標・有権者傾向）を収集する。

### 出力
`scripts/raw_constituencies.json`（generate_json.py の入力）

### 取得フィールド

| フィールド | 取得方法 | 備考 |
|---|---|---|
| id | 連番（1〜289） | |
| name | 選挙区名 | go2senkyo または raw_candidates から抽出 |
| prefecture | 都道府県名 | |
| lat / lng | 都道府県庁所在地座標（ハードコード） | 都道府県代表座標を使用 |
| totalVoters | 有権者数 | go2senkyo または総務省から取得 |
| historicalWinnerParty | 直近選挙の当選政党名 | raw_candidates の won=true から抽出 |
| isRulingPartyStronghold | 与党が当選 → true | raw_candidates から計算 |
| voterTrend | 有権者傾向スコア（0.0〜1.0） | 下記計算式で自動算出 |

### voterTrend 計算式
```python
voterTrend = Σ(各候補者の得票数 × politicalScore) / 総得票数
```
例: 自民60,000票(score=0.70) + 野党40,000票(score=0.35) → 0.56

### 都道府県座標テーブル（ハードコード）
```python
PREFECTURE_COORDS = {
    '北海道': (43.06, 141.35), '青森県': (40.82, 140.74),
    '岩手県': (39.70, 141.15), '宮城県': (38.26, 140.87),
    '秋田県': (39.72, 140.10), '山形県': (38.24, 140.36),
    '福島県': (37.75, 140.47), '茨城県': (36.34, 140.44),
    '栃木県': (36.56, 139.88), '群馬県': (36.39, 139.06),
    '埼玉県': (35.86, 139.64), '千葉県': (35.60, 140.12),
    '東京都': (35.69, 139.69), '神奈川県': (35.45, 139.64),
    '新潟県': (37.90, 139.02), '富山県': (36.69, 137.21),
    '石川県': (36.59, 136.62), '福井県': (36.06, 136.22),
    '山梨県': (35.66, 138.57), '長野県': (36.65, 138.18),
    '岐阜県': (35.39, 136.72), '静岡県': (34.97, 138.38),
    '愛知県': (35.18, 136.90), '三重県': (34.73, 136.50),
    '滋賀県': (35.00, 135.86), '京都府': (35.02, 135.75),
    '大阪府': (34.69, 135.50), '兵庫県': (34.69, 135.18),
    '奈良県': (34.68, 135.83), '和歌山県': (34.22, 135.17),
    '鳥取県': (35.50, 134.23), '島根県': (35.47, 133.06),
    '岡山県': (34.66, 133.93), '広島県': (34.39, 132.46),
    '山口県': (34.18, 131.47), '徳島県': (34.07, 134.55),
    '香川県': (34.34, 134.04), '愛媛県': (33.84, 132.77),
    '高知県': (33.56, 133.53), '福岡県': (33.60, 130.40),
    '佐賀県': (33.25, 130.30), '長崎県': (32.74, 129.87),
    '熊本県': (32.79, 130.74), '大分県': (33.24, 131.61),
    '宮崎県': (31.91, 131.42), '鹿児島県': (31.56, 130.56),
    '沖縄県': (26.21, 127.68),
}
```

### 完了条件
- [ ] 289選挙区分が揃っている
- [ ] 全選挙区に `lat` / `lng` が設定されている
- [ ] `voterTrend` が 0.0〜1.0 の範囲内
- [ ] `raw_constituencies.json` が生成されている

---

## P0-3: `scripts/parse_proportional_pdf.py`

### 概要
総務省 PDF（001055096.pdf）から比例代表名簿データを取得する。
PDFは pypdf でテキスト抽出可能であることを確認済み（33ページ）。

### PDF取得先
```
https://www.soumu.go.jp/main_content/001055096.pdf
```

### 出力
`scripts/raw_proportional.json`（generate_json.py の入力）

### PDFデータ構造（確認済み）
```
各ページ: ブロック名 × 政党ごとの表
各行: 名簿順位 | 氏名 | 性別 | 小選挙区結果
  小選挙区結果の種類:
    空欄         → 比例単独候補（isProportionalOnly=true）
    "当 100.000" → 小選挙区当選（wonSmd=true）
    "落 XX.XXX"  → 小選挙区落選（actualHaiseiritsu=XX.XXX）
    "落 ×"       → 供託物没収点未達（belowThreshold=true）
```

### 取得フィールド

| フィールド | 内容 |
|---|---|
| bloc | 比例ブロック名（北海道/東北/...） |
| party | 政党名（ページヘッダーから取得） |
| listRank | 名簿順位（整数、同順位あり） |
| name | 候補者名 |
| isProportionalOnly | 小選挙区に立候補していない |
| wonSmd | 小選挙区で当選した |
| belowThreshold | 供託物没収点未達（×） |
| actualHaiseiritsu | 実際の惜敗率（%、比例単独は null） |

### 重複立候補者と小選挙区候補者のリンク方法
- `generate_json.py` で候補者名のマッチングにより `smdCandidateId` を付与する
- 名前の表記ゆれ（ひらがな・漢字）があるため、ひらがな読みで照合する

### 完了条件
- [ ] 全11ブロックのデータが取得されている
- [ ] 比例単独候補の `isProportionalOnly=true` が正しく判定されている
- [ ] 重複立候補者の `actualHaiseiritsu` が設定されている
- [ ] `raw_proportional.json` が生成されている

---

## P0-4: `scripts/generate_json.py`

### 概要
raw_*.json を読み込み、フロントエンドが使用する最終JSONを生成する。

### 出力ファイル

| ファイル | 内容 |
|---|---|
| `public/data/candidates.json` | 小選挙区候補者 1,119件 |
| `public/data/proportional_candidates.json` | 比例単独候補 〜166件 |
| `public/data/constituencies.json` | 選挙区 289件 |
| `public/data/proportional_seats.json` | ブロック×政党の実際の比例議席数 |

### 処理フロー
```
1. raw_candidates.json を読み込む
2. party名 → partyId に正規化（PARTY_NAME_MAP で変換）
3. 一意IDを付与: "smd-{区番号3桁}-{連番4桁}"
4. proportional_info: raw_proportional.json と名前でマッチングして付与
5. candidates.json に書き出す

6. raw_constituencies.json を読み込む
7. voterTrend を計算して付与
8. constituencies.json に書き出す

9. raw_proportional.json から比例単独候補のみ抽出
10. proportional_candidates.json に書き出す

11. proportional_seats.json をハードコードで生成（実際の選挙結果）
```

### バリデーション基準
- `originalVoteRate` が 0.0〜1.0 の範囲内
- `originalConstituencyId` が 1〜289 の範囲内
- `party` が PARTY_DEFINITIONS のいずれかに対応（未知は 'ind' に丸める）
- `lat` / `lng` が日本の緯度経度範囲内（lat: 24〜46、lng: 122〜146）

### `proportional_seats.json` の内容（ハードコード）
```json
{
  "北海道":   { "ldp": 4, "crc": 3, "ishin": 0, "dpfp": 1, "jcp": 0, "reiwa": 0, "sansei": 0, "tm": 0 },
  "東北":     { "ldp": 6, "crc": 3, "ishin": 0, "dpfp": 1, "jcp": 0, "reiwa": 0, "sansei": 1, "tm": 1 },
  ...（全11ブロック）
}
```
※ 実際の議席数は Implementation_Plan.md の ACTUAL_SEATS から転記

### 完了条件
- [ ] `candidates.json` の件数が 1,119件（±5）
- [ ] 全フィールドのバリデーションが通過
- [ ] `constituencies.json` の件数が 289件
- [ ] `proportional_seats.json` の全ブロックの合計が 176議席

---

## P0-5: スクレイピング実行・データ検証

### 実行手順
```bash
cd /home/takamim/repos/election_randomizer
pip install requests beautifulsoup4 openpyxl pypdf

# 小選挙区候補者取得（go2senkyo）
timeout 3600s python scripts/scrape_candidates.py

# 選挙区データ取得
timeout 600s python scripts/scrape_constituencies.py

# 比例名簿PDF解析
timeout 120s python scripts/parse_proportional_pdf.py

# JSON生成
timeout 60s python scripts/generate_json.py
```

### 検証コマンド
```bash
# 候補者数確認
python3 -c "import json; d=json.load(open('public/data/candidates.json')); print(f'候補者数: {len(d)}')"

# 当選者数確認（289のはず）
python3 -c "import json; d=json.load(open('public/data/candidates.json')); print(f'当選者数: {sum(1 for c in d if c[\"wonSmd\"])}')"

# 選挙区数確認（289のはず）
python3 -c "import json; d=json.load(open('public/data/constituencies.json')); print(f'選挙区数: {len(d)}')"
```

### 完了条件
- [ ] 全データファイルが `public/data/` に生成されている
- [ ] 候補者数: 1,100〜1,130件（多少の欠損は許容）
- [ ] 当選者数: 289件ちょうど
- [ ] 選挙区数: 289件ちょうど
- [ ] 比例単独候補: 150〜170件
