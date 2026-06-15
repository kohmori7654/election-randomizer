# Implementation Plan: 衆院選ランダム配置シミュレーター

## 確定仕様

### 1. 既存システムとの連携

本プロジェクトは新規リポジトリであり、既存システムとの連携は存在しない。
外部依存関係は以下のとおり：

- **データソース（オフライン取得）**: go2senkyo.com（スクレイピング）、総務省Excelファイル
- **静的ホスティング**: GitHub Pages（`gh-pages` ブランチへの自動デプロイ）
- **CI/CD**: GitHub Actions（`main` ブランチへのpushでトリガー）

---

### 2. 制約事項

| 制約 | 詳細 |
|---|---|
| バックエンド不要 | ランタイムに動的APIを呼び出さない。すべてビルド時生成済みJSONを使用 |
| パフォーマンス | 1,119人のシャッフル＋スコア計算＋比例復活計算が 150ms 以内に完了すること |
| ブラウザ対応 | Chrome / Firefox / Safari 最新版 |
| コスト | GitHub Pages / GitHub Actions 無料枠のみ使用 |
| Pythonスクリプト | データ収集はオフライン（手動実行）。CIには含めない |
| モバイル対応 | PC優先。最低限のレスポンシブ対応でOK |
| 比例単独候補 | 小選挙区に配置しない。ただし惜敗率変動に伴う比例当選変化を計算する |
| データソース優先順位 | go2senkyo.com を第1候補、失敗時は総務省Excel/PDF（001055096.pdf）を使用 |

---

### 3. 入出力と挙動

#### 正常系

- ユーザーが「シミュレーション実行」ボタンを押す
- `candidates.json`（1,119件：小選挙区候補者）と `constituencies.json`（289件）と `proportional_candidates.json`（比例名簿全候補者）を静的JSONから読み込む（初期化時にロード済み）
- Fisher-Yatesアルゴリズムで小選挙区候補者1,119人をシャッフルする
- 289選挙区に候補者を割り振る（各区の定員は元の候補者数と同数）
- **[小選挙区フェーズ]** 各選挙区でスコア計算を実行し、最高スコアの候補者を当選とする
- **[比例復活フェーズ]** 小選挙区シミュレーション結果をもとに惜敗率を再計算し、比例当選者を決定する
  1. 各選挙区の当選スコアを基準に、落選候補者のシミュレーション惜敗率を算出
  2. 供託物没収点（全スコア合計の10%未満）に達しなかった候補者を比例不適格とする（×扱い）
  3. 各ブロック×政党の比例議席数は実際の選挙結果を固定値として使用
  4. 重複立候補者の新惜敗率で比例順位を再確定し、当選者を決定する
- 画面が以下の順で更新される：
  1. 議席サマリー（実際 vs シミュレーション比較）
  2. 死の組TOP10
  3. 日本地図（都道府県単位・クリックで各選挙区ドリルダウン）
  4. 選挙区一覧テーブル（289行）
  5. 統計サマリー

#### 異常系

- JSONロード失敗時：エラーメッセージを画面表示し、ボタンを無効化する
- JSONのスキーマ不正（フィールド欠損等）：バリデーションエラーをコンソールに出力し、該当候補者をスキップ（全体処理は継続）
- スコア計算で `NaN` / `Infinity` が発生：該当候補者のスコアを 0 に丸めて処理継続

#### エッジケース

- 同スコア（同点）が発生した場合：`Math.random()` による乱数でタイブレーク
- 候補者数が選挙区定員に満たない区：そのまま割り当て（全員当選にはしない。スコアで勝者を決める）
- 候補者数が選挙区定員を超える区：余剰候補は落選扱い
- `originalVoteRate` が 0 の候補者（新人等）：スコア計算は継続（FameFactor = 0.8 が適用）

---

### 4. 検証・テスト基準

TDD（Red/Green/Refactorサイクル）で各モジュールを実装する。
テストフレームワーク：**Vitest**（Viteとの親和性が高いため）

#### テスト基準一覧

| テスト対象 | テスト基準 |
|---|---|
| Fisher-Yatesシャッフル | 出力長が入力長と等しい。同じシードで同じ結果。元の配列と異なる並びになる（統計的に） |
| 候補者割り振り | 全候補者が必ずいずれかの選挙区に割り当てられる。候補者の重複なし |
| スコア計算（BaseRate） | `originalVoteRate` の値がそのまま返る |
| スコア計算（PartyCompetitionFactor） | 同陣営N人のとき `1/N^0.7` の値。単独のとき `1.0` |
| スコア計算（PositionFactor） | 値が 0.7〜1.3 の範囲内に収まる |
| スコア計算（DistanceFactor） | dist=0km のとき `1.0`。dist=2000km 以上のとき `0.5` |
| スコア計算（FameFactor） | 現職=1.3、元職=1.1、新人=0.8 の値が返る |
| FinalScore合成 | 各因子の積が正しく計算される |
| 死の組判定 | 得票率60%以上の強者が2人以上いる選挙区を正しく検出する |
| 死の組スコア | 強者のoriginalVoteRate合計が正しく計算される |
| 死の組TOP10 | スコア降順で上位10件を返す |
| SimulationResult | 全289選挙区分の当選者が存在する |
| 議席カウント | 政党別当選数の合計が289になる |

---

### 5. 出力要件

以下のファイルを**新規作成**する（差分でなく全ファイル出力）：

```
election-randomizer/
├── scripts/
│   ├── scrape_candidates.py
│   ├── scrape_constituencies.py
│   └── generate_json.py
├── public/
│   └── data/
│       ├── candidates.json       （スクリプト実行後に生成）
│       └── constituencies.json  （スクリプト実行後に生成）
├── src/
│   ├── types/
│   │   └── election.ts
│   ├── data/
│   │   └── parties.ts
│   ├── engine/
│   │   ├── simulator.ts
│   │   ├── scoring.ts
│   │   └── deathGroup.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── SeatSummary.tsx
│   │   ├── DeathGroup.tsx
│   │   ├── JapanMap.tsx
│   │   ├── ConstituencyList.tsx
│   │   └── StatsSummary.tsx
│   └── App.tsx
├── .github/
│   └── workflows/
│       └── deploy.yml
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## アーキテクチャ概観

### フロントエンドとデータパイプラインの分離

```
【データパイプライン（開発時・手動実行）】
go2senkyo.com
    ↓
scripts/scrape_candidates.py    → 候補者生データ取得
scripts/scrape_constituencies.py → 選挙区・座標データ取得
    ↓
scripts/generate_json.py
    ↓
public/data/candidates.json (1,119件)
public/data/constituencies.json (289件)
    ↓  （Gitにコミット）

【フロントエンド（ランタイム）】
GitHub Pages から静的配信
    ↓
React App 初期化 → fetch("/data/candidates.json") + fetch("/data/constituencies.json")
    ↓
ユーザー操作（シミュレーション実行ボタン）
    ↓
engine/simulator.ts（シャッフル + 割り振り）
    ↓
engine/scoring.ts（スコア計算）
    ↓
engine/deathGroup.ts（死の組判定）
    ↓
React State 更新 → 画面再描画
```

### 静的JSONアプローチの理由

- バックエンドサーバーが不要のため、運用コストゼロでGitHub Pages上で完結する
- 選挙データは本質的に静的（投票結果は変わらない）であり、リアルタイム取得の必要がない
- スクレイピングをランタイムから切り離すことで、Webアプリ側がスクレイピングブロックの影響を受けない
- JSON総データ量が約500KB以内に収まり、初期ロード時間が許容範囲内

---

## Phase 0: データ収集（Python scripts/）

### 0-1. 政党マスタデータ（ハードコード定義）

`src/data/parties.ts` に定義する（TypeScriptのソースとしてバンドル）。

```typescript
// src/data/parties.ts
export type Camp = 'ruling' | 'opposition_left' | 'opposition_center' | 'right';

export interface PartyDefinition {
  id: string;
  name: string;
  politicalScore: number;    // 0.0(左派)〜1.0(右派)
  isRulingParty: boolean;
  camp: Camp;
  color: string;             // CSSカラーコード（政党カラー）
}

export const PARTY_DEFINITIONS: PartyDefinition[] = [
  { id: 'sdp',    name: '社会民主党',               politicalScore: 0.05, isRulingParty: false, camp: 'opposition_left',   color: '#CC0066' },
  { id: 'jcp',    name: '日本共産党',               politicalScore: 0.10, isRulingParty: false, camp: 'opposition_left',   color: '#E60012' },
  { id: 'reiwa',  name: 'れいわ新選組',             politicalScore: 0.15, isRulingParty: false, camp: 'opposition_left',   color: '#E4007F' },
  { id: 'genzei', name: '減税日本・ゆうこく連合',   politicalScore: 0.30, isRulingParty: false, camp: 'opposition_left',   color: '#2C3F8C' },
  { id: 'crc',    name: '中道改革連合',             politicalScore: 0.35, isRulingParty: false, camp: 'opposition_left',   color: '#009944' },
  { id: 'dpfp',   name: '国民民主党',               politicalScore: 0.50, isRulingParty: false, camp: 'opposition_center', color: '#F39800' },
  { id: 'tm',     name: 'チームみらい',             politicalScore: 0.50, isRulingParty: false, camp: 'opposition_center', color: '#00A0E9' },
  { id: 'ishin',  name: '日本維新の会',             politicalScore: 0.60, isRulingParty: true,  camp: 'ruling',            color: '#00A960' },
  { id: 'ldp',    name: '自由民主党',               politicalScore: 0.70, isRulingParty: true,  camp: 'ruling',            color: '#CC0000' },
  { id: 'nhk',    name: '日本保守党',               politicalScore: 0.85, isRulingParty: false, camp: 'right',             color: '#0083DE' },
  { id: 'sansei', name: '参政党',                   politicalScore: 0.90, isRulingParty: false, camp: 'right',             color: '#FF6600' },
  { id: 'ind',    name: '無所属',                   politicalScore: 0.50, isRulingParty: false, camp: 'right',             color: '#888888' },
];

/** 陣営ごとの camp 定義 */
export const RULING_CAMPS: Camp[] = ['ruling'];
export const OPPOSITION_LEFT_CAMPS: Camp[] = ['opposition_left'];
export const OPPOSITION_CENTER_CAMPS: Camp[] = ['opposition_center'];
```

---

### 0-2. `scripts/scrape_candidates.py`

#### 対象URL

```
https://go2senkyo.com/shugiin/28030
```

#### URL構造

- 選挙区一覧ページ: `https://go2senkyo.com/shugiin/28030`
- 各選挙区ページ: `https://go2senkyo.com/shugiin/28030/{prefecture_code}/`
- 候補者詳細: `https://go2senkyo.com/seijika/{candidate_id}/`

#### 取得フィールド

| フィールド | 取得元 | 処理 |
|---|---|---|
| `name` | 候補者名（漢字） | テキスト抽出 |
| `party` | 政党名テキスト | PARTY_DEFINITIONSで正規化 |
| `partyId` | 上記から導出 | 正規化マッピング |
| `originalConstituencyId` | 選挙区番号（1〜289） | 整数変換 |
| `originalConstituencyName` | 選挙区名 | テキスト抽出 |
| `prefecture` | 都道府県名 | テキスト抽出 |
| `status` | 「現職」「元職」「新人」 | テキスト正規化 |
| `originalVotes` | 得票数（整数） | カンマ除去して整数変換 |
| `originalTotalVotes` | 有効投票数 | カンマ除去して整数変換 |
| `originalVoteRate` | 得票率 | `originalVotes / originalTotalVotes` で計算 |
| `won` | 当落 | 「当選」フラグから bool 変換 |

#### 実装仕様（疑似コード）

```python
import requests
from bs4 import BeautifulSoup
import time
import json

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; ElectionSimulator/1.0; +educational)'
}
REQUEST_DELAY = 2.0  # 秒（サーバー負荷軽減のため必ず待機）

def fetch_page(url: str) -> BeautifulSoup:
    """ページを取得し BeautifulSoup オブジェクトを返す。失敗時は最大3回リトライ。"""
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            time.sleep(REQUEST_DELAY)
            return BeautifulSoup(resp.text, 'html.parser')
        except requests.RequestException as e:
            print(f"取得失敗 ({attempt+1}/3): {url} - {e}")
            time.sleep(REQUEST_DELAY * 2)
    raise RuntimeError(f"ページ取得に失敗しました: {url}")

def parse_candidate(row_element) -> dict:
    """テーブル行要素から候補者データを抽出して辞書を返す。"""
    ...

def scrape_all_constituencies() -> list[dict]:
    """全289選挙区をループし、全候補者を返す。"""
    candidates = []
    for constituency_id in range(1, 290):
        url = f"https://go2senkyo.com/shugiin/28030/{constituency_id}/"
        try:
            soup = fetch_page(url)
            rows = soup.select('.p-search_senkyo_list_item')  # セレクターは実際のHTMLに合わせて調整
            for row in rows:
                candidate = parse_candidate(row)
                candidate['originalConstituencyId'] = constituency_id
                candidates.append(candidate)
        except RuntimeError as e:
            print(f"選挙区 {constituency_id} のスクレイピングを失敗しました: {e}")
            continue  # スキップして次の選挙区へ
    return candidates

if __name__ == '__main__':
    candidates = scrape_all_constituencies()
    print(f"取得完了: {len(candidates)}人")
    # generate_json.py が読み込む中間ファイルに保存
    with open('scripts/raw_candidates.json', 'w', encoding='utf-8') as f:
        json.dump(candidates, f, ensure_ascii=False, indent=2)
```

#### エラーハンドリング方針

- 個別選挙区の取得失敗は `continue` でスキップし、後続の処理を継続する
- 取得できなかった選挙区IDをリストアップしてログ出力する
- スクレイピング失敗時のフォールバック：総務省Excelファイルを手動ダウンロードし、`parse_soumu_excel(filepath)` で処理する

---

### 0-2b. 比例単独候補のデータ収集

#### 比例名簿PDFの解析仕様

総務省PDFファイル（https://www.soumu.go.jp/main_content/001055096.pdf）から比例名簿データを取得する。
このPDFは全33ページ（11ブロック × 複数ページ）の構成。

**PDFのデータ構造（確認済み）**:
```
ページ構成: ブロック名（北海道/東北/...）× 政党ごとの表
各行のデータ:
  - 名簿順位    : 数値（同順位あり = 惜敗率で決定）
  - 氏名        : 候補者名（ひらがな＋漢字）
  - 性別        : 男/女（列で分かれている）
  - 小選挙区結果: 
      空欄        → 比例単独候補
      "当 100.000" → 小選挙区で当選（比例不適格）
      "落 XX.XXX"  → 小選挙区で落選（惜敗率 = XX.XXX%）
      "落 ×"       → 落選かつ供託物没収点未達（比例不適格）
```

```python
def parse_proportional_pdf(pdf_path: str) -> list[dict]:
    """
    総務省の比例代表党派別当選人数PDFを解析して比例名簿データを返す。
    使用ライブラリ: pypdf (pip install pypdf)
    """
    import pypdf, re
    reader = pypdf.PdfReader(pdf_path)
    entries = []
    current_bloc = None
    
    BLOC_KEYWORDS = ['北海道', '東北', '北関東', '南関東', '東京',
                     '北陸信越', '東海', '近畿', '中国', '四国', '九州']
    
    for page in reader.pages:
        text = page.extract_text()
        # ブロック名を検出
        for bloc in BLOC_KEYWORDS:
            if f'{bloc}選挙区' in text:
                current_bloc = bloc
        
        # 各行をパース（正規表現で名簿順位・氏名・惜敗率を抽出）
        # 形式: "3 緑川 たかし 落 81.967"
        # 形式: "1 稲原 むねよし" (比例単独 = 惜敗率なし)
        pattern = re.compile(r'(\d+)\s+([^\d]+?)\s+(?:(当|落)\s+([\d.]+|×))?$', re.MULTILINE)
        for m in pattern.finditer(text):
            rank, name, result, rate = m.groups()
            is_proportional_only = (result is None)
            won_smd = (result == '当')
            below_threshold = (rate == '×')
            haiseiritsu = float(rate) if rate and rate != '×' else None
            entries.append({
                'bloc': current_bloc,
                'listRank': int(rank),
                'name': name.strip(),
                'isProportionalOnly': is_proportional_only,
                'wonSmd': won_smd,
                'belowThreshold': below_threshold,
                'actualHaiseiritsu': haiseiritsu,
            })
    return entries
```

**注意**: PDFのテキスト抽出は政党名の特定が難しい。政党名はページヘッダーから取得し、各テーブルブロックに紐付ける処理が必要。

#### 比例単独候補の概要

| 政党 | 比例単独候補数 |
|---|---|
| 自由民主党 | 52 |
| 中道改革連合 | 34 |
| 日本保守党 | 14 |
| 日本共産党 | 18 |
| れいわ新選組 | 13 |
| チームみらい | 9 |
| 参政党 | 8 |
| 社会民主党 | 7 |
| 減税日本・ゆうこく連合 | 5 |
| 国民民主党 | 2 |
| 日本維新の会 | 2 |
| **合計** | **164〜166** |

#### originalVoteRate の計算方法

比例単独候補は小選挙区の得票実績がないため、**政党比例得票率の分配値**を使用する。

```python
# 政党の全国比例得票率（第51回実績）
PARTY_PROPORTIONAL_VOTE_RATE = {
    'ldp':     0.3672,
    'crc':     0.1823,
    'dpfp':    0.0973,
    'sansei':  0.0744,
    'tm':      0.0666,
    'ishin':   0.0863,
    'jcp':     0.05,    # 概算
    'reiwa':   0.03,    # 概算
    'nhk':     0.02,    # 概算
    'sdp':     0.01,    # 概算
    'genzei':  0.015,   # 概算
}

def calc_proportional_vote_rate(party_id: str, bloc_candidate_count: int) -> float:
    """
    比例単独候補の基準得票率を計算する。
    = 政党全国比例得票率 ÷ ブロック内の当該政党の比例候補者数
    最低値は 0.05（新人相当）で下限設定
    """
    base = PARTY_PROPORTIONAL_VOTE_RATE.get(party_id, 0.05)
    return max(0.05, base / max(1, bloc_candidate_count))
```

#### 元拠点座標の設定

比例単独候補の `originalLat` / `originalLng` は所属比例ブロックの中心座標を使用する（`BLOC_COORDS` 参照）。

---

### 0-3. `scripts/scrape_constituencies.py`

#### 取得フィールド

| フィールド | 取得方法 |
|---|---|
| `id` | 選挙区番号（1〜289、連番） |
| `name` | 選挙区名（「北海道1区」等） |
| `prefecture` | 都道府県名 |
| `lat` / `lng` | 都道府県庁所在地の代表座標（ハードコードテーブルで代替） |
| `voterTrend` | 直近選挙の政党別得票率から計算（後述） |
| `totalVoters` | 有権者数（go2senkyoまたは総務省から取得） |
| `historicalWinnerParty` | 直近選挙の当選政党名 |
| `isRulingPartyStronghold` | 与党が過去2回以上勝利していれば `true` |

#### voterTrend の計算方法

```
voterTrend = Σ(各政党得票数 × politicalScore) / 総得票数
```

具体例：
- 自民候補得票 60,000（score=0.70）、野党候補得票 40,000（score=0.35）の場合
- voterTrend = (60,000 × 0.70 + 40,000 × 0.35) / 100,000 = 0.56

#### 座標データの取得方法

都道府県庁所在地の緯度経度をハードコードテーブルとして保持する。
実際の小選挙区単位のGeoJSONは容量が大きいため、当初は都道府県代表座標で代替する。

```python
PREFECTURE_COORDS = {
    '北海道': (43.06, 141.35),
    '青森県': (40.82, 140.74),
    '岩手県': (39.70, 141.15),
    # ... 47都道府県分
}
```

---

### 0-4. `scripts/generate_json.py`

#### 処理フロー

```python
1. raw_candidates.json を読み込む
2. candidates の各レコードを Candidate スキーマに変換・検証する
3. party 名を partyId にマッピングする
4. 各候補者に一意の id を付与する（"smd-{区番号3桁}-{連番4桁}"）
5. public/data/candidates.json に書き出す（ensure_ascii=False）

6. raw_constituencies.json を読み込む（または内部生成）
7. constituencies の各レコードを Constituency スキーマに変換・検証する
8. public/data/constituencies.json に書き出す
```

#### バリデーション基準

- `originalVoteRate` が 0.0〜1.0 の範囲内であること
- `originalConstituencyId` が 1〜289 の範囲内であること
- `party` が PARTY_DEFINITIONS のいずれかに対応すること（未知の場合は `'ind'` に丸める）
- `lat` / `lng` が日本の緯度経度範囲内（lat: 24〜46、lng: 122〜146）であること

---

## Phase 1: 型定義とシミュレーションエンジン

### 1-1. `src/types/election.ts` の全型定義

```typescript
// src/types/election.ts

/** 候補者のステータス */
export type CandidateStatus = '現職' | '元職' | '新人';

/** 陣営区分 */
export type Camp = 'ruling' | 'opposition_left' | 'opposition_center' | 'right';

/** 比例ブロック名 */
export type ProportionalBloc =
  | '北海道' | '東北' | '北関東' | '南関東' | '東京'
  | '北陸信越' | '東海' | '近畿' | '中国' | '四国' | '九州';

/** 小選挙区候補者（candidates.json · 1,119人） */
export interface Candidate {
  id: string;                          // "smd-001-0001"
  name: string;                        // "山田太郎"
  party: string;                       // "自由民主党"
  partyId: string;                     // "ldp"
  isRulingParty: boolean;
  camp: Camp;
  politicalScore: number;              // 0.0〜1.0
  originalConstituencyId: number;      // 1〜289
  originalConstituencyName: string;    // "北海道1区"
  prefecture: string;                  // "北海道"
  status: CandidateStatus;
  originalVotes: number;
  originalTotalVotes: number;
  originalVoteRate: number;            // 0.0〜1.0
  wonSmd: boolean;                     // 小選挙区で実際に当選したか
  // 重複立候補情報（比例名簿にも登録されている場合）
  proportionalInfo: ProportionalEntry | null;
}

/**
 * 比例名簿登載情報（重複立候補者の Candidate に付与）
 * および比例単独候補者（proportional_candidates.json）のベース型
 */
export interface ProportionalEntry {
  bloc: ProportionalBloc;              // 比例ブロック
  partyId: string;                     // "ldp"
  listRank: number;                    // 名簿順位（1〜N、同順位あり）
  actualHaiseiritsu: number | null;    // 実際の惜敗率（%）。比例単独は null
  isProportionalOnly: boolean;         // true = 比例単独候補
  smdCandidateId: string | null;       // 重複候補の場合、対応する Candidate.id
  name: string;                        // 候補者名
  status: CandidateStatus;
  wonActual: boolean;                  // 実際の選挙で当選したか（SMD/比例どちらかでも）
}

/**
 * proportional_candidates.json に格納される比例単独候補
 * （ProportionalEntry の isProportionalOnly=true のもの）
 */
export type ProportionalOnlyCandidate = ProportionalEntry & {
  id: string;                          // "pr-ldp-hkd-001"
  party: string;                       // 正式党名
  camp: Camp;
  politicalScore: number;
};

/** 小選挙区（静的JSONから読み込まれる元データ） */
export interface Constituency {
  id: number;                          // 1〜289
  name: string;                        // "北海道1区"
  prefecture: string;
  lat: number;
  lng: number;
  voterTrend: number;                  // 0.0(左派)〜1.0(右派)
  totalVoters: number;
  historicalWinnerParty: string;
  isRulingPartyStronghold: boolean;
}

/** 各選挙区のシミュレーション結果 */
export interface ConstituencyResult {
  constituency: Constituency;
  candidates: ScoredCandidate[];       // スコア降順ソート済み
  winner: ScoredCandidate;
}

/** スコア付き候補者（シミュレーション中間データ） */
export interface ScoredCandidate {
  candidate: Candidate;
  finalScore: number;
  baseRate: number;
  partyCompetitionFactor: number;
  positionFactor: number;
  distanceFactor: number;
  fameFactor: number;
}

/** 「死の組」情報 */
export interface DeathGroup {
  constituency: Constituency;
  strongCandidates: Candidate[];       // originalVoteRate >= 0.6 の候補者
  deathGroupScore: number;             // strongCandidates の originalVoteRate 合計
  rank: number;                        // 1〜10
}

/** 比例復活当選の判定結果 */
export interface ProportionalRevivalResult {
  entry: ProportionalEntry;
  simulatedHaiseiritsu: number | null; // null = 比例単独（変動なし）
  isEligible: boolean;                 // 供託物没収点クリアか
  wonProportional: boolean;            // シミュレーション比例当選か
  actuallyWonProportional: boolean;    // 実際の比例当選か（比較用）
}

/** シミュレーション全体の結果 */
export interface SimulationResult {
  constituencyResults: ConstituencyResult[];  // 289件
  proportionalResults: ProportionalRevivalResult[]; // 比例復活シミュレーション
  seatCounts: SeatCount[];                    // 政党別議席数（SMD+比例合計）
  deathGroups: DeathGroup[];                  // 上位10件
  executedAt: Date;
}

/** 政党別議席数 */
export interface SeatCount {
  partyId: string;
  party: string;
  isRulingParty: boolean;
  simulatedSmdSeats: number;           // シミュレーション小選挙区
  simulatedProportionalSeats: number;  // シミュレーション比例
  simulatedTotal: number;
  actualSmdSeats: number;              // 実際の小選挙区
  actualProportionalSeats: number;     // 実際の比例
  actualTotal: number;
  diff: number;                        // simulatedTotal - actualTotal
}

/** 実際の選挙結果（定数・比較用） */
export const ACTUAL_SEATS: Record<string, { smd: number; proportional: number }> = {
  ldp:     { smd: 249, proportional: 67 },
  ishin:   { smd:  20, proportional: 16 },
  crc:     { smd:   7, proportional: 42 },
  dpfp:    { smd:   8, proportional: 20 },
  sansei:  { smd:   0, proportional: 15 },
  tm:      { smd:   0, proportional: 11 },
  jcp:     { smd:   0, proportional:  4 },
  reiwa:   { smd:   0, proportional:  1 },
  genzei:  { smd:   0, proportional:  1 },
  nhk:     { smd:   0, proportional:  0 },
  sdp:     { smd:   0, proportional:  0 },
  ind:     { smd:   5, proportional:  0 },
};
```

---

### 1-2. `src/engine/simulator.ts` のシャッフル・割り振りアルゴリズム

#### 関数シグネチャ

```typescript
/**
 * Fisher-Yates アルゴリズムで配列をシャッフルする（破壊的）。
 * テスト時はシード付き乱数に差し替え可能にするため、rng 引数を受け取る。
 */
export function fisherYatesShuffle<T>(array: T[], rng: () => number = Math.random): T[]

/**
 * シャッフルされた候補者を選挙区に割り振る。
 * @param candidates - シャッフル済み候補者リスト（1,119人）
 * @param constituencies - 選挙区リスト（289区）
 * @returns 各選挙区と割り当てられた候補者のマッピング
 */
export function assignCandidatesToConstituencies(
  candidates: Candidate[],
  constituencies: Constituency[]
): Map<number, Candidate[]>

/**
 * メインのシミュレーション実行関数。
 * @param candidates - 全候補者データ
 * @param constituencies - 全選挙区データ
 * @returns シミュレーション結果
 */
export function runSimulation(
  candidates: Candidate[],
  constituencies: Constituency[]
): SimulationResult
```

#### 割り振りアルゴリズム詳細（小選挙区候補 1,119人のみ）

```
1. smdCandidates（1,119人）を fisherYatesShuffle でシャッフル
2. 各選挙区の「元の候補者数」を集計したマップを作成
   originalCounts: Map<constituencyId, number>
   （スクレイピングで取得した実際の候補者数を使用）
3. シャッフル済み候補者を先頭から順に割り振る
   - cursor = 0
   - for each constituency of constituencies:
       count = originalCounts.get(constituency.id) ?? 4  // デフォルト4人
       assigned = shuffled.slice(cursor, cursor + count)
       cursor += count
       result.set(constituency.id, assigned)
4. cursor が smdCandidates.length と一致することを確認
```

**テスト基準**：
- `fisherYatesShuffle` の出力長が入力長と等しい
- `assignCandidatesToConstituencies` で全1,119候補者が過不足なく割り当てられる（重複なし）
- 合計候補者数の合計 = 1,119 ✓

---

### 1-3b. `src/engine/proportional.ts` の比例復活シミュレーション

#### 概要

実際の選挙で使用された比例ブロック×政党の議席数は固定とし、重複立候補者の惜敗率のみを変動させる。

```
実際の比例議席数（固定） + 新しい惜敗率による当選者の組み合わせ変化 = 比例復活シミュレーション結果
```

#### 惜敗率の計算

```typescript
/**
 * 小選挙区シミュレーション結果から、各落選候補の惜敗率を計算する。
 *
 * 【惜敗率の定義】
 * 惜敗率 = (落選した候補者の得票数 ÷ 同一選挙区の最多得票当選者の得票数) × 100
 *
 * シミュレーションでは FinalScore を得票数の代理変数として使用する。
 * simulatedHaiseiritsu = (loser.finalScore / winner.finalScore) × 100
 *
 * 【供託物没収点の判定】
 * 実際の選挙: 有効投票総数 × 1/10 未満の得票 → ×（比例不適格）
 * シミュレーション: FinalScore_i / Σ(全候補者のFinalScore) < 0.10 → isEligible=false
 */
export function calcSimulatedHaiseiritsu(
  loser: ScoredCandidate,
  winner: ScoredCandidate,
  allCandidates: ScoredCandidate[]
): { haiseiritsu: number; isEligible: boolean }
```

#### 比例復活当選の決定

```typescript
/**
 * 比例復活当選者を決定する。
 * @param constituencyResults - 小選挙区シミュレーション結果（289件）
 * @param proportionalEntries - 全比例名簿（重複立候補者含む）
 * @param proportionalSeats   - 各ブロック×政党の比例議席数（実際値・固定）
 */
export function simulateProportionalRevival(
  constituencyResults: ConstituencyResult[],
  proportionalEntries: ProportionalEntry[],
  proportionalSeats: ProportionalSeatAllocation
): ProportionalRevivalResult[]

/**
 * ブロック×政党の比例議席数マップ
 * 例: { '北海道': { ldp: 4, crc: 3, ... }, '東北': { ... }, ... }
 */
export type ProportionalSeatAllocation = Record<ProportionalBloc, Record<string, number>>
```

#### 復活当選の決定アルゴリズム

```typescript
function simulateProportionalRevival(...) {
  for (const bloc of ALL_BLOCS) {
    for (const partyId of partyIds) {
      const seats = proportionalSeats[bloc][partyId] ?? 0;
      if (seats === 0) continue;

      // この bloc×party の名簿候補者を取得
      const entries = getEntriesForBlocAndParty(bloc, partyId, proportionalEntries);

      // 1. 比例単独候補はシミュレーションで惜敗率が変わらないため、
      //    実際の名簿順位をそのまま使用
      // 2. 重複立候補者は、シミュレーション結果から新惜敗率を取得
      //    - 小選挙区で当選 → 比例対象外
      //    - 落選かつ isEligible=true → 新惜敗率で再ランク
      //    - 落選かつ isEligible=false (×) → 比例対象外

      const eligibleEntries = entries.map(e => {
        if (e.isProportionalOnly) {
          return { entry: e, simulatedHaiseiritsu: null, isEligible: true };
        }
        const result = getSimulatedResult(e.smdCandidateId, constituencyResults);
        if (!result) return null;  // データなし（スキップ）
        if (result.wonSmd) return null;  // 小選挙区当選 → 比例不適格
        const { haiseiritsu, isEligible } = calcSimulatedHaiseiritsu(
          result.loser, result.winner, result.allCandidates
        );
        if (!isEligible) return { entry: e, simulatedHaiseiritsu: haiseiritsu, isEligible: false };
        return { entry: e, simulatedHaiseiritsu: haiseiritsu, isEligible: true };
      }).filter(Boolean);

      // 名簿順位 + 惜敗率でソート（同順位内は惜敗率降順）
      // 比例単独は固定順位として先行
      const ranked = rankProportionalEntries(eligibleEntries);

      // 上位 seats 人を当選とする
      ranked.forEach((item, i) => {
        item.wonProportional = i < seats && item.isEligible;
      });
    }
  }
}
```

#### テスト仕様

```typescript
describe('calcSimulatedHaiseiritsu', () => {
  it('loser.finalScore === winner.finalScore のとき 100.0 を返す（タイブレーク前）', () => { ... });
  it('loser.finalScore が winner の半分のとき 50.0 を返す', () => { ... });
  it('FinalScore比率が 10% 未満のとき isEligible=false（供託物没収点未達）', () => { ... });
  it('FinalScore比率が 10% 以上のとき isEligible=true', () => { ... });
  it('winner 自身は calcSimulatedHaiseiritsu の対象外（100%扱いで比例不適格）', () => { ... });
});

describe('simulateProportionalRevival', () => {
  it('比例単独候補は常に isEligible=true', () => { ... });
  it('小選挙区当選候補は比例対象外', () => { ... });
  it('各ブロック×政党の当選者数が actualSeats と一致する', () => { ... });
  it('同順位内で惜敗率が高い方が先に当選する', () => { ... });
});
```

---

### 1-3. `src/engine/scoring.ts` のスコア計算式

#### 関数シグネチャ

```typescript
/** BaseRate を計算する */
export function calcBaseRate(candidate: Candidate): number
// → candidate.originalVoteRate をそのまま返す

/** PartyCompetitionFactor を計算する */
export function calcPartyCompetitionFactor(
  candidate: Candidate,
  allCandidatesInConstituency: Candidate[]
): number
// 同陣営候補が N 人のとき: 1.0 / N^0.7
// 単独のとき: 1.0

/** PositionFactor を計算する */
export function calcPositionFactor(
  candidate: Candidate,
  constituency: Constituency
): number
// match = 1 - |candidate.politicalScore - constituency.voterTrend|
// raw = 0.7 + 0.6 × match
// return Math.min(1.3, Math.max(0.7, raw))

/** DistanceFactor を計算する（Haversine距離を使用） */
export function calcDistanceFactor(
  candidateOriginalLat: number,
  candidateOriginalLng: number,
  targetLat: number,
  targetLng: number
): number
// dist = haversineDistance(...)
// return Math.max(0.5, 1.0 - dist / 2000)

/** Haversine公式で2点間の距離（km）を計算する */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number

/** FameFactor を計算する */
export function calcFameFactor(status: CandidateStatus): number
// 現職=1.3、元職=1.1、新人=0.8

/** FinalScore を計算する（全因子の積） */
export function calcFinalScore(
  candidate: Candidate,
  constituency: Constituency,
  allCandidatesInConstituency: Candidate[],
  originalLat: number,
  originalLng: number
): ScoredCandidate
```

#### テスト仕様（Vitest）

```typescript
// src/engine/scoring.test.ts

describe('calcBaseRate', () => {
  it('originalVoteRate をそのまま返す', () => {
    const c = { ...mockCandidate, originalVoteRate: 0.567 };
    expect(calcBaseRate(c)).toBe(0.567);
  });
});

describe('calcPartyCompetitionFactor', () => {
  it('同陣営が1人（単独）のとき 1.0 を返す', () => {
    expect(calcPartyCompetitionFactor(mockRulingCandidate, [mockRulingCandidate])).toBe(1.0);
  });
  it('同陣営が2人のとき 1/2^0.7 ≈ 0.616 を返す', () => {
    const factor = calcPartyCompetitionFactor(mockRulingCandidate, [mockRulingCandidate, mockRulingCandidate2]);
    expect(factor).toBeCloseTo(1 / Math.pow(2, 0.7), 5);
  });
});

describe('calcPositionFactor', () => {
  it('完全マッチ（差=0）のとき 1.3 を返す', () => {
    const c = { ...mockCandidate, politicalScore: 0.5 };
    const constituency = { ...mockConstituency, voterTrend: 0.5 };
    expect(calcPositionFactor(c, constituency)).toBeCloseTo(1.3, 5);
  });
  it('完全不一致（差=1）のとき 0.7 を返す', () => {
    const c = { ...mockCandidate, politicalScore: 0.0 };
    const constituency = { ...mockConstituency, voterTrend: 1.0 };
    expect(calcPositionFactor(c, constituency)).toBeCloseTo(0.7, 5);
  });
  it('結果が常に 0.7〜1.3 の範囲内に収まる', () => {
    for (let score = 0; score <= 1; score += 0.1) {
      for (let trend = 0; trend <= 1; trend += 0.1) {
        const factor = calcPositionFactor({ ...mockCandidate, politicalScore: score }, { ...mockConstituency, voterTrend: trend });
        expect(factor).toBeGreaterThanOrEqual(0.7);
        expect(factor).toBeLessThanOrEqual(1.3);
      }
    }
  });
});

describe('calcDistanceFactor', () => {
  it('同一地点（距離=0）のとき 1.0 を返す', () => {
    expect(calcDistanceFactor(35.0, 135.0, 35.0, 135.0)).toBe(1.0);
  });
  it('距離 2000km 以上のとき 0.5 を返す', () => {
    // 北海道〜沖縄はおよそ 2,200km
    expect(calcDistanceFactor(43.06, 141.35, 26.21, 127.68)).toBe(0.5);
  });
});

describe('calcFameFactor', () => {
  it('現職は 1.3', () => expect(calcFameFactor('現職')).toBe(1.3));
  it('元職は 1.1', () => expect(calcFameFactor('元職')).toBe(1.1));
  it('新人は 0.8', () => expect(calcFameFactor('新人')).toBe(0.8));
});
```

---

### 1-4. `src/engine/deathGroup.ts` の死の組判定ロジック

#### 関数シグネチャ

```typescript
/** 「強者候補者」と判定する得票率閾値 */
export const STRONG_CANDIDATE_THRESHOLD = 0.60;

/**
 * 指定選挙区の「死の組スコア」を計算する。
 * 強者候補（originalVoteRate >= 0.60）が2人以上いる場合のみ対象。
 * @returns 強者が2人未満の場合は null
 */
export function calcDeathGroupScore(
  constituency: Constituency,
  assignedCandidates: Candidate[]
): { strongCandidates: Candidate[]; deathGroupScore: number } | null

/**
 * 全289選挙区から「死の組」を検出し、スコア降順で上位 topN 件を返す。
 */
export function detectDeathGroups(
  constituencyResults: ConstituencyResult[],
  topN: number = 10
): DeathGroup[]
```

#### 判定ロジック詳細（疑似コード）

```typescript
function calcDeathGroupScore(constituency, assignedCandidates) {
  const strongCandidates = assignedCandidates.filter(
    c => c.originalVoteRate >= STRONG_CANDIDATE_THRESHOLD
  );
  if (strongCandidates.length < 2) return null;

  const deathGroupScore = strongCandidates.reduce(
    (sum, c) => sum + c.originalVoteRate, 0
  );
  return { strongCandidates, deathGroupScore };
}

function detectDeathGroups(constituencyResults, topN = 10) {
  const groups = constituencyResults
    .map(result => {
      const candidates = result.candidates.map(sc => sc.candidate);
      const dg = calcDeathGroupScore(result.constituency, candidates);
      if (!dg) return null;
      return {
        constituency: result.constituency,
        strongCandidates: dg.strongCandidates,
        deathGroupScore: dg.deathGroupScore,
        rank: 0,
      };
    })
    .filter(Boolean);

  return groups
    .sort((a, b) => b.deathGroupScore - a.deathGroupScore)
    .slice(0, topN)
    .map((g, i) => ({ ...g, rank: i + 1 }));
}
```

#### テスト仕様

```typescript
describe('detectDeathGroups', () => {
  it('強者が2人以上いる選挙区のみを返す', () => { ... });
  it('スコア降順で並んでいる', () => { ... });
  it('topN=10 のとき最大10件を返す', () => { ... });
  it('強者が1人しかいない選挙区は含まれない', () => { ... });
  it('rank が 1 から連番で付与される', () => { ... });
});
```

---

## Phase 2: UIコンポーネント基本構造

### 2-1. `src/App.tsx` の全体レイアウト

```typescript
// src/App.tsx
interface AppState {
  candidates: Candidate[] | null;
  constituencies: Constituency[] | null;
  simulationResult: SimulationResult | null;
  isLoading: boolean;
  error: string | null;
}

export default function App() {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [constituencies, setConstituencies] = useState<Constituency[] | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初期化時にJSONをフェッチ
  useEffect(() => {
    Promise.all([
      fetch('/data/candidates.json').then(r => r.json()),
      fetch('/data/constituencies.json').then(r => r.json()),
    ])
      .then(([c, k]) => {
        setCandidates(c);
        setConstituencies(k);
      })
      .catch(e => setError(`データ読み込みエラー: ${e.message}`));
  }, []);

  const handleRunSimulation = () => {
    if (!candidates || !constituencies) return;
    setIsLoading(true);
    // setTimeout で非同期化（UIブロック防止）
    setTimeout(() => {
      const result = runSimulation(candidates, constituencies);
      setSimulationResult(result);
      setIsLoading(false);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onRun={handleRunSimulation} isLoading={isLoading} disabled={!candidates} />
      {error && <ErrorBanner message={error} />}
      {simulationResult && (
        <>
          <SeatSummary result={simulationResult} />
          <DeathGroup groups={simulationResult.deathGroups} />
          <JapanMap result={simulationResult} />
          <ConstituencyList results={simulationResult.constituencyResults} />
          <StatsSummary result={simulationResult} />
        </>
      )}
    </div>
  );
}
```

---

### 2-2. `src/components/Header.tsx`

```typescript
interface HeaderProps {
  onRun: () => void;
  isLoading: boolean;
  disabled: boolean;
}

// 表示内容:
// - タイトル: "衆院選ランダム配置シミュレーター"
// - サブタイトル: "第51回衆議院議員総選挙（2026年2月8日）"
// - 「シミュレーション実行」ボタン
//   - isLoading=true のとき「計算中...」と表示し disabled
//   - disabled=true のとき「データ読み込み中」と表示し disabled
```

---

### 2-3. `src/components/SeatSummary.tsx`

```typescript
interface SeatSummaryProps {
  result: SimulationResult;
}

// 表示内容:
// - 与党計（自民＋維新）：実際 vs シミュレーション（差分 ±）
// - 野党計：実際 vs シミュレーション（差分 ±）
// - 政党別内訳テーブル（Rechartsの横棒グラフ or テーブル）
// - 政党カラーコードで色付け
```

---

### 2-4. `src/components/ConstituencyList.tsx`

```typescript
interface ConstituencyListProps {
  results: ConstituencyResult[];
}

// テーブル列:
// 1. 選挙区名（例：北海道1区）
// 2. 当選者名
// 3. 政党（政党カラーでバッジ表示）
// 4. 元の選挙区
// 5. 元得票率（%表示）
// 6. 配置スコア（小数点3桁）

// 機能:
// - 列ヘッダークリックでソート（昇順/降順トグル）
// - テキスト入力で選挙区名・候補者名・政党名をフィルター
// - 「与党のみ」「野党のみ」ラジオボタンフィルター
```

---

## Phase 3: 高度な可視化

### 3-1. `src/components/DeathGroup.tsx`

```typescript
interface DeathGroupProps {
  groups: DeathGroup[];  // 上位10件
}

// 表示内容（カード形式）:
// ランク、選挙区名、死の組スコア
// 強者候補者ごとに: 候補者名、政党バッジ、元得票率（%）
// 「本来であれば全員が圧勝していた」という注釈テキスト
```

---

### 3-2. `src/components/JapanMap.tsx`

#### 使用ライブラリ

`react-simple-maps`（SVGベース、軽量）を採用する。
GeoJSONデータは `public/data/japan-prefectures.geojson` に配置する。
GeoJSONソース: https://github.com/dataofjapan/land （都道府県単位、パブリックドメイン）

代替案：react-simple-mapsが困難な場合は都道府県SVGをインライン定義する。

#### 2段階ドリルダウン構造

```
【レベル1: 都道府県マップ（デフォルト）】
- 47都道府県を当選政党の最多政党カラーで塗り分け
- ホバー: ツールチップ（都道府県名、与党X席/野党Y席）
- クリック: selectedPrefecture を更新 → レベル2へ遷移

【レベル2: 選挙区ドリルダウン（都道府県クリック後）】
- 選択された都道府県の各選挙区を一覧表示（カード形式）
  - 選挙区名
  - 当選者名・政党バッジ
  - 元の選挙区との違い（「本来は○○区出身」）
  - 元得票率
- 「← 全国へ戻る」ボタン
```

```typescript
interface JapanMapProps {
  result: SimulationResult;
}

// 内部状態:
// selectedPrefecture: string | null = null
//   → null のとき全国マップ表示
//   → 都道府県名が設定されたときドリルダウン表示

// ヘルパー関数:
// getConstituenciesByPrefecture(prefecture: string, results: ConstituencyResult[]): ConstituencyResult[]
// getDominantParty(results: ConstituencyResult[]): string
// getRulingVsOppositionCount(results: ConstituencyResult[]): { ruling: number; opposition: number }
```

---

### 3-3. `src/components/StatsSummary.tsx`

```typescript
interface StatsSummaryProps {
  result: SimulationResult;
}

// 表示内容:
// - 与野党の転換選挙区数
//   （実際は与党が勝ったが、シミュレーションで野党が勝った区、またはその逆）
// - 最大の「波乱」選挙区トップ5
//   （元得票率が最も高い候補者が敗れた区）
// - 地方別傾向テーブル（北海道・東北・関東・中部・近畿・中国・四国・九州）
```

---

## Phase 4: スタイリング

### Tailwind CSS クラスの方針

テーマ：選挙中継（NHK選挙速報）風

| 要素 | Tailwindクラス例 |
|---|---|
| 背景 | `bg-white` |
| ヘッダー | `bg-gray-900 text-white` |
| セクション区切り | `border-b border-gray-200` |
| 政党バッジ | `inline-block px-2 py-1 text-xs font-bold text-white rounded` + 政党カラー `style` |
| 与党強調 | `text-red-600 font-bold` |
| 野党強調 | `text-blue-600 font-bold` |
| 死の組カード | `border-2 border-red-500 bg-red-50` |
| ボタン | `bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg` |
| テーブル | `w-full text-sm border-collapse` |
| テーブルヘッダー | `bg-gray-100 text-gray-700 font-semibold` |

### 政党カラーコード一覧

| 政党 | カラーコード |
|---|---|
| 自由民主党 | `#CC0000` |
| 日本維新の会 | `#00A960` |
| 中道改革連合 | `#009944` |
| 国民民主党 | `#F39800` |
| チームみらい | `#00A0E9` |
| 参政党 | `#FF6600` |
| 日本保守党 | `#0083DE` |
| 日本共産党 | `#E60012` |
| れいわ新選組 | `#E4007F` |
| 社会民主党 | `#CC0066` |
| 減税日本・ゆうこく連合 | `#2C3F8C` |
| 無所属 | `#888888` |

---

## Phase 5: GitHub Actions設定

### `.github/workflows/deploy.yml`

```yaml
name: Build and Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4

      - name: Node.js をセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 依存関係をインストール
        run: npm ci

      - name: ビルド
        run: npm run build

      - name: GitHub Pages アーティファクトをアップロード
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: GitHub Pages にデプロイ
        id: deployment
        uses: actions/deploy-pages@v4
```

### `vite.config.ts` の注意点

GitHub Pages ではリポジトリ名がサブパスになるため、`base` を設定する必要がある。

```typescript
// vite.config.ts
export default defineConfig({
  base: '/election_randomizer/',  // リポジトリ名に合わせる
  plugins: [react()],
})
```

---

## リスクと対策

### リスク1: go2senkyo.comのスクレイピング失敗

データソースの優先順位：
1. **第1候補**: go2senkyo.com スクレイピング
2. **フォールバック**: 総務省公式Excelファイル（必ず実装すること）

| 状況 | 対策 |
|---|---|
| アクセスブロック（403/429） | User-Agentを適切に設定。リクエスト間隔を2秒以上確保 |
| HTMLの構造変更 | CSSセレクターを定数として一箇所に集約し、変更箇所を最小化 |
| 全面的なブロック | 総務省の公式Excelファイルを使用（後述の `parse_soumu_excel` を実行） |

#### 総務省Excelフォールバックの仕様（必須実装）

```python
def parse_soumu_excel(filepath: str) -> list[dict]:
    """
    総務省の開票結果Excelファイルを解析して候補者リストを返す。
    取得元: https://www.soumu.go.jp/senkyo/51syusokuhou/index.html
    ファイル: 候補者別開票結果（Excelファイル）をダウンロードして使用
    """
    import openpyxl
    wb = openpyxl.load_workbook(filepath)
    candidates = []
    for sheet in wb.worksheets:
        # シート名 = 都道府県名または選挙区名
        for row in sheet.iter_rows(min_row=2, values_only=True):
            # 列構成は実際のExcelに合わせて調整
            # 総務省Excelの標準列: 選挙区名, 候補者名, 政党名, 得票数, 当落, 現元新
            name, party, votes, result, status = row[1], row[2], row[3], row[4], row[5]
            candidates.append({
                'name': name,
                'party': party,
                'originalVotes': int(str(votes).replace(',', '')) if votes else 0,
                'won': result == '当',
                'status': {'現': '現職', '元': '元職', '新': '新人'}.get(str(status), '新人'),
            })
    return candidates

def scrape_proportional_candidates() -> list[dict]:
    """
    比例単独候補166人のデータを生成する。
    go2senkyoまたは各政党の公式サイトから取得。
    取得困難な場合は、政党・ブロック・政党内順位のみのサンプルデータで代替し、
    originalVoteRate は当該ブロックの政党比例得票率 ÷ ブロック内候補者数 で計算する。
    """
    ...
```

### リスク2: 地図データの代替案

| 優先順位 | 方法 | 概要 |
|---|---|---|
| 第1案 | react-simple-maps + 都道府県GeoJSON | 軽量なSVG地図。ファイル容量は約50〜100KB |
| 第2案 | SVGインライン定義（47都道府県） | ライブラリなしで動作。メンテナンスコストが高い |
| 第3案 | 地図なし（テーブルとグラフのみ） | Phase 3 を後回しにして Phase 2 まで先にデプロイ |

GeoJSONデータソース：
- https://github.com/dataofjapan/land （パブリックドメイン、都道府県単位）

### リスク3: voterTrend データの精度

手動推定を避けるため、スクレイピングで取得した選挙区別の得票データから自動計算する：

```python
def calc_voter_trend(constituency_id: int, candidates: list[dict]) -> float:
    """
    選挙区内の全候補者の政治スコアを得票数で加重平均して voterTrend を計算。
    """
    total_votes = sum(c['originalVotes'] for c in candidates)
    if total_votes == 0:
        return 0.5  # データなしの場合は中央値
    weighted_sum = sum(
        c['originalVotes'] * PARTY_SCORE_MAP.get(c['partyId'], 0.5)
        for c in candidates
    )
    return weighted_sum / total_votes
```

---

## Developer への引き継ぎ事項

### TDD開始に必要な情報

1. **テストフレームワーク**: Vitest を使用する（`npm install -D vitest @vitest/ui`）
2. **実装順序**:
   - Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 の順で実装する
   - Phase 0（Pythonスクリプト）はPhase 1と並行して進めてよいが、フロントエンドのテストはモックデータで実施する
3. **モックデータ**: `src/__tests__/fixtures/` 以下に `mockCandidates.ts` / `mockConstituencies.ts` を用意してから各エンジンのテストを書くこと
4. **テストファイル配置**: 各実装ファイルと同階層に `*.test.ts` を配置する（例: `src/engine/scoring.test.ts`）
5. **Red/Green/Refactor サイクル**:
   - まずテストを書いて失敗させる（Red）
   - 最小限の実装でテストを通す（Green）
   - コードを整理する（Refactor）
6. **パフォーマンス検証**: `runSimulation` のテストに `performance.now()` で実行時間を計測し、150ms 以内であることを assert するテストケースを含めること（小選挙区フェーズ＋比例復活フェーズ合計）
7. **型の厳格化**: `tsconfig.json` で `"strict": true` を有効にすること

### 重要な注意事項

- `fisherYatesShuffle` は引数 `rng` を受け取ることで、テスト時に決定論的な乱数（シード固定）を使えるようにすること
- `calcDistanceFactor` には元の選挙区の緯度経度が必要なため、`Constituency` データを候補者IDから引けるよう `Map<number, Constituency>` を事前に構築すること
- GitHub Pages のベースパスは `/election_randomizer/` であるため、`fetch('/data/candidates.json')` ではなく `import.meta.env.BASE_URL + 'data/candidates.json'` を使うこと
- 政党名は確定済み（2026年2月8日第51回選挙時点の名称）でハードコードする。「中道改革連合」等の正式名称はエイリアスなしで使用する
- 惜敗率の計算式: `simulatedHaiseiritsu = (loser.finalScore / winner.finalScore) × 100`
  供託物没収点の代理判定: `FinalScore_i / Σ(全候補者のFinalScore) < 0.10` → 比例不適格
