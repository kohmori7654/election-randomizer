#!/usr/bin/env python3
"""
P0-3: 総務省PDF(001055096.pdf)から比例代表候補者データを生成。
出力:
  scripts/raw_proportional_candidates.json  - 比例名簿全候補者
  scripts/raw_proportional_seats.json       - ブロック×政党の議席配分
"""

import json
import re
from pathlib import Path
from collections import defaultdict

import pdfplumber

PDF_PATH = Path(__file__).parent / "001055096.pdf"
CAND_OUTPUT = Path(__file__).parent / "raw_proportional_candidates.json"
SEATS_OUTPUT = Path(__file__).parent / "raw_proportional_seats.json"
RAW_CANDIDATES_PATH = Path(__file__).parent / "raw_candidates.json"

# ブロック名の正規化（PDF表記 → システム内部名）
BLOC_NORMALIZE = {
    "北海道選挙区": "北海道",
    "東北選挙区":   "東北",
    "北関東選挙区": "北関東",
    "南関東選挙区": "南関東",
    "東京都選挙区": "東京",
    "北陸信越選挙区": "北陸信越",
    "東海選挙区":   "東海",
    "近畿選挙区":   "近畿",
    "中国選挙区":   "中国",
    "四国選挙区":   "四国",
    "九州選挙区":   "九州",
}

# 政党名 → partyId
PARTY_NORMALIZE = {
    "自由民主党":          "ldp",
    "日本維新の会":        "ishin",
    "中道改革連合":        "crc",
    "国民民主党":          "dpfp",
    "参政党":              "sansei",
    "チームみらい":        "tm",
    "日本共産党":          "jcp",
    "れいわ新選組":        "reiwa",
    "日本保守党":          "nhk",
    "社会民主党":          "sdp",
    "減税日本・ゆうこく連合": "genzei",
    "安楽死制度を考える会": "ind",  # 少数政党は ind として扱う
}


def normalize_name(name: str) -> str:
    """
    名前を正規化。
    - NFKC正規化（﨑→崎等の互換異体字を標準形に変換）
    - Unicode異体字セレクタ（U+FE00-U+FE0F, U+E0100-U+E01EF）除去
    - スペース・全角スペース除去
    - 小書き片仮名→通常片仮名（ッ→ツ、ァ→ア等）
    """
    import unicodedata
    # NFKC正規化（CJK互換漢字を正規漢字に変換）
    name = unicodedata.normalize("NFKC", name)
    # 異体字セレクタを除去
    name = "".join(
        c for c in name
        if not (0xFE00 <= ord(c) <= 0xFE0F or 0xE0100 <= ord(c) <= 0xE01EF)
    )
    # スペース除去
    name = re.sub(r"[\s　]+", "", name)
    # 小書き片仮名→通常片仮名
    small_to_normal = str.maketrans("ァィゥェォッャュョヮヵヶ", "アイウエオツヤユヨワカケ")
    name = name.translate(small_to_normal)
    return name


def kata_to_hira(text: str) -> str:
    """カタカナ→ひらがな変換"""
    return "".join(
        chr(ord(c) - 0x60) if "ァ" <= c <= "ン" else c
        for c in text
    )


def get_bloc_from_page(page) -> str:
    """ページテキストからブロック名を取得"""
    text = page.extract_text() or ""
    for line in text.split("\n"):
        stripped = line.strip()
        if "選挙区" in stripped and "比例" not in stripped and "※" not in stripped and len(stripped) < 15:
            for bloc_raw, bloc_norm in BLOC_NORMALIZE.items():
                if bloc_raw in stripped:
                    return bloc_norm
    return "不明"


def parse_party_column(table_rows: list, col_offset: int) -> dict:
    """
    7カラム単位の政党データを解析する。
    col_offset: 0, 7, 14, 21 のいずれか（4政党分）

    Returns:
        {
          'partyName': str,
          'partyId': str,
          'seats': int,
          'candidates': [{'listRank', 'name', 'smdResult', 'haiseiritsu'}]
        }
    """
    c = col_offset

    # 行0: 党派名
    party_name = ""
    for row in table_rows[:4]:
        cell = row[c + 2] if len(row) > c + 2 else None
        if cell:
            party_name = cell.strip()
            break

    if not party_name:
        return None

    party_id = PARTY_NORMALIZE.get(party_name, "ind")

    # 当選人数を取得（"N 人" という形式の行）
    seats = 0
    for row in table_rows[:5]:
        cell = row[c + 2] if len(row) > c + 2 else None
        if cell and "人" in cell:
            m = re.search(r"(\d+)\s*人", cell)
            if m:
                seats = int(m.group(1))
                break

    # データ行（ヘッダー行=行4の後から）の候補者を取得
    # ヘッダー行のインデックスを検出
    header_row_idx = None
    for i, row in enumerate(table_rows):
        cell = row[c] if len(row) > c else None
        if cell and "名簿" in cell:
            header_row_idx = i
            break

    if header_row_idx is None:
        return {"partyName": party_name, "partyId": party_id, "seats": seats, "candidates": []}

    # データ収集（ヘッダー行の次の行から）
    list_ranks_raw = []
    names_raw = []
    smd_results_raw = []
    haiseiritsu_raw = []

    for row in table_rows[header_row_idx + 1:]:
        if len(row) <= c:
            continue

        lr = row[c] if len(row) > c else None
        nm = row[c + 1] if len(row) > c + 1 else None
        sr = row[c + 5] if len(row) > c + 5 else None
        hr = row[c + 6] if len(row) > c + 6 else None

        if lr:
            list_ranks_raw.append(lr)
        if nm:
            names_raw.append(nm)
        if sr:
            smd_results_raw.append(sr)
        if hr:
            haiseiritsu_raw.append(hr)

    # 改行で分割してフラット化
    def split_cell(cell: str | None) -> list[str]:
        if not cell:
            return []
        return [s.strip() for s in cell.split("\n") if s.strip()]

    all_ranks = []
    all_names = []
    for lr, nm in zip(list_ranks_raw, names_raw):
        ranks_in_cell = split_cell(lr)
        names_in_cell = split_cell(nm)
        for r, n in zip(ranks_in_cell, names_in_cell):
            if re.match(r"^\d+$", r):
                all_ranks.append(int(r))
                all_names.append(n)

    # SMD結果・惜敗率（dual候補のみ存在）
    all_smd = []
    all_haiseiritsu = []
    for sr in smd_results_raw:
        all_smd.extend(split_cell(sr))
    for hr in haiseiritsu_raw:
        all_haiseiritsu.extend(split_cell(hr))

    # 候補者リストを構築
    # dual候補（SMD結果あり）と比例単独（なし）を判定
    # 戦略: 名前数 >= SMD結果数。smd_results のインデックスは dual 候補の登場順
    candidates = []
    smd_idx = 0

    for rank, name in zip(all_ranks, all_names):
        # 当落マーカー（当/落/×）かどうか確認
        # smd_results_raw の次のエントリを先読みして、この候補に対応するか判定
        # → 判定ロジック: 名前ベースで raw_candidates.json とマッチングする
        candidates.append({
            "listRank": rank,
            "nameRaw": name,
            "nameCleaned": normalize_name(name),
        })

    # smd_results と haiseiritsu は候補者リストの中でどれが dual か確定後に割り当てる
    # ここでは raw として保持する
    return {
        "partyName": party_name,
        "partyId": party_id,
        "seats": seats,
        "candidates": candidates,
        "smdResults": all_smd,
        "haiseiritsuList": all_haiseiritsu,
    }


def parse_pdf() -> tuple[list, dict]:
    """PDFを全ページパースして比例候補データを返す"""
    all_entries = []  # {bloc, partyId, listRank, nameCleaned, nameRaw, seats, ...}
    seats_map = defaultdict(lambda: defaultdict(int))  # seats_map[bloc][partyId] = seats

    with pdfplumber.open(PDF_PATH) as pdf:
        for page_num, page in enumerate(pdf.pages):
            bloc = get_bloc_from_page(page)
            if bloc == "不明":
                print(f"  警告: ページ{page_num+1} のブロックが不明")
                continue

            tables = page.extract_tables()
            if not tables:
                continue

            table_rows = tables[0]
            num_cols = len(table_rows[0]) if table_rows else 0
            # 4政党分（7列×4=28列）または少ない場合
            num_parties = min(4, num_cols // 7)

            for party_idx in range(num_parties):
                col_offset = party_idx * 7
                party_data = parse_party_column(table_rows, col_offset)
                if not party_data:
                    continue

                party_id = party_data["partyId"]
                seats = party_data["seats"]

                if seats > 0:
                    seats_map[bloc][party_id] += seats

                for cand in party_data["candidates"]:
                    all_entries.append({
                        "bloc": bloc,
                        "partyId": party_id,
                        "partyName": party_data["partyName"],
                        "listRank": cand["listRank"],
                        "nameRaw": cand["nameRaw"],
                        "nameCleaned": cand["nameCleaned"],
                    })

    return all_entries, seats_map


# PDF表記とgo2senkyo表記が一致しない候補の手動マッピング
# キー: (partyId, pdf_nameCleaned), 値: go2senkyo_nameKanji正規化形
MANUAL_NAME_MAP: dict[tuple[str, str], str] = {
    ("ishin", "石﨑とおる"):      "石崎とおる",
    ("dpfp",  "武藤ゆうだい"):    "武藤雄大",
    ("crc",   "柳家東三楼"):      "やなぎや東三楼",
    ("crc",   "げんまけんたろう"): "源馬謙太郎",
    ("crc",   "下野幸助"):        "しもの幸助",
    ("crc",   "吉田つねひこ"):    "吉田統彦",
    ("ldp",   "杉田みお"):        "杉田水脈",
    ("crc",   "伊藤しゅんすけ"):  "伊藤俊輔",
    ("crc",   "まぶちすみお"):    "馬淵澄夫",
    ("crc",   "萩原旭人"):        "はぎわらあきひと",
    ("crc",   "丸尾けいすけ"):    "丸尾圭祐",
    ("dpfp",  "花岡あきひさ"):    "花岡明久",
    ("ishin", "山田博司"):        "山田ひろし",
}


def match_with_smd_candidates(pr_entries: list, smd_candidates: list) -> list:
    """
    比例名簿エントリをSMD候補と突合。
    一致優先順位:
      1. (partyId, normalize(nameKanji)) の完全一致
      2. (partyId, kata_to_hira(nameKana_family) + nameKanji_given) でのひらがな氏マッチ
    """
    # 主キー: (partyId, normalized nameKanji)
    smd_by_kanji_key = {}
    # 副キー: (partyId, hiragana_family + kanji_given) → go2senkyo名から生成
    smd_by_hira_key = {}

    for c in smd_candidates:
        kanji_norm = normalize_name(c["nameKanji"])
        key1 = (c["partyId"], kanji_norm)
        smd_by_kanji_key[key1] = c

        # nameKana = "アオヤギ ヒトシ" → family_hira = "あおやぎ"
        # nameKanji = "青柳 仁士" → given = "仁士"
        kana_parts = c["nameKana"].split()
        kanji_parts = c["nameKanji"].split()
        if kana_parts and kanji_parts:
            family_hira = kata_to_hira(normalize_name(kana_parts[0]))
            given_kanji = normalize_name(" ".join(kanji_parts[1:])) if len(kanji_parts) > 1 else ""
            hira_key = (c["partyId"], family_hira + given_kanji)
            smd_by_hira_key[hira_key] = c

    result = []
    for entry in pr_entries:
        key1 = (entry["partyId"], entry["nameCleaned"])
        smd = smd_by_kanji_key.get(key1)

        # フォールバック1: ひらがな氏 + 漢字名マッチ
        if smd is None:
            name = entry["nameCleaned"]
            m = re.match(r"^([ぁ-ん]+)(.*)$", name)
            if m:
                family_hira = m.group(1)
                given_part = normalize_name(m.group(2))
                hira_key = (entry["partyId"], family_hira + given_part)
                smd = smd_by_hira_key.get(hira_key)

        # フォールバック2: 手動マッピング
        if smd is None:
            manual_kanji_norm = MANUAL_NAME_MAP.get((entry["partyId"], entry["nameCleaned"]))
            if manual_kanji_norm:
                smd = smd_by_kanji_key.get((entry["partyId"], manual_kanji_norm))

        is_proportional_only = smd is None
        smd_elected = smd.get("elected") if smd else None

        result.append({
            "bloc":               entry["bloc"],
            "partyId":            entry["partyId"],
            "partyName":          entry["partyName"],
            "listRank":           entry["listRank"],
            "nameRaw":            entry["nameRaw"],
            "nameCleaned":        entry["nameCleaned"],
            "isProportionalOnly": is_proportional_only,
            "smdCandidateKey":    f"{entry['partyId']}_{normalize_name(smd['nameKanji'])}" if smd else None,
            "smdElected":         smd_elected,
        })

    return result


def main():
    print("PDFパース中...")
    pr_entries, seats_map = parse_pdf()
    print(f"比例名簿エントリ数（重複あり）: {len(pr_entries)}")

    # 重複エントリを排除（同一ブロック×政党×名前）
    seen = set()
    unique_entries = []
    for e in pr_entries:
        key = (e["bloc"], e["partyId"], e["nameCleaned"])
        if key not in seen:
            seen.add(key)
            unique_entries.append(e)
    print(f"重複排除後: {len(unique_entries)}")

    # SMD候補との突合
    print("SMD候補と突合中...")
    with open(RAW_CANDIDATES_PATH, encoding="utf-8") as f:
        smd_candidates = json.load(f)

    matched = match_with_smd_candidates(unique_entries, smd_candidates)

    # 統計
    pr_only = sum(1 for e in matched if e["isProportionalOnly"])
    dual = sum(1 for e in matched if not e["isProportionalOnly"])
    print(f"  比例単独: {pr_only} 人")
    print(f"  重複候補: {dual} 人")
    print(f"  合計: {len(matched)} 人")

    # ブロック×政党の議席数
    seats_output = {}
    for bloc, parties in sorted(seats_map.items()):
        seats_output[bloc] = {}
        for party_id, n in sorted(parties.items()):
            seats_output[bloc][party_id] = n

    total_seats = sum(n for parties in seats_output.values() for n in parties.values())
    print(f"\n比例議席合計: {total_seats}")
    for bloc, parties in seats_output.items():
        print(f"  {bloc}: {sum(parties.values())}席 → {dict(parties)}")

    # 出力
    with open(CAND_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(matched, f, ensure_ascii=False, indent=2)
    print(f"\n出力: {CAND_OUTPUT}")

    with open(SEATS_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(seats_output, f, ensure_ascii=False, indent=2)
    print(f"出力: {SEATS_OUTPUT}")


if __name__ == "__main__":
    main()
