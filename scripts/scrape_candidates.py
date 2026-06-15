#!/usr/bin/env python3
"""
P0-1: go2senkyo から第51回衆院選（2026年2月8日）の小選挙区候補者データを取得。
出力: scripts/raw_candidates.json
"""

import json
import re
import time
import sys
from pathlib import Path
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://go2senkyo.com"
ELECTION_ID = "28030"
OUTPUT_PATH = Path(__file__).parent / "raw_candidates.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# 47都道府県コード（go2senkyo の prefecture コード）
PREFECTURE_NAMES = {
    1: "北海道", 2: "青森県", 3: "岩手県", 4: "宮城県", 5: "秋田県",
    6: "山形県", 7: "福島県", 8: "茨城県", 9: "栃木県", 10: "群馬県",
    11: "埼玉県", 12: "千葉県", 13: "東京都", 14: "神奈川県", 15: "新潟県",
    16: "富山県", 17: "石川県", 18: "福井県", 19: "山梨県", 20: "長野県",
    21: "岐阜県", 22: "静岡県", 23: "愛知県", 24: "三重県", 25: "滋賀県",
    26: "京都府", 27: "大阪府", 28: "兵庫県", 29: "奈良県", 30: "和歌山県",
    31: "鳥取県", 32: "島根県", 33: "岡山県", 34: "広島県", 35: "山口県",
    36: "徳島県", 37: "香川県", 38: "愛媛県", 39: "高知県", 40: "福岡県",
    41: "佐賀県", 42: "長崎県", 43: "熊本県", 44: "大分県", 45: "宮崎県",
    46: "鹿児島県", 47: "沖縄県",
}

# 政党名の正規化マップ
PARTY_NORMALIZE = {
    "自由民主党": "ldp",
    "日本維新の会": "ishin",
    "中道改革連合": "crc",
    "国民民主党": "dpfp",
    "参政党": "sansei",
    "チームみらい": "tm",
    "日本共産党": "jcp",
    "れいわ新選組": "reiwa",
    "日本保守党": "nhk",
    "社会民主党": "sdp",
    "減税日本・ゆうこく連合": "genzei",
    "無所属": "ind",
}

# 部分一致で正規化するプレフィックスマップ
PARTY_PREFIX_NORMALIZE = {
    "日本保守党": "nhk",
    "減税日本": "genzei",
}


def get_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def get_constituencies_for_prefecture(session, pref_code: int) -> list[dict]:
    """都道府県ページから選挙区IDと名前を取得（重複除去済み）"""
    url = f"{BASE_URL}/shugiin/{ELECTION_ID}/prefecture/{pref_code}"
    resp = session.get(url, timeout=30)
    if resp.status_code != 200:
        print(f"  警告: 都道府県{pref_code}ページが取得できません (HTTP {resp.status_code})", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    links = soup.find_all("a", href=re.compile(r"/shugiin/\d+/senkyoku/(\d+)"))

    seen_ids = set()
    constituencies = []
    for a in links:
        m = re.search(r"/senkyoku/(\d+)", a["href"])
        if not m:
            continue
        senkyoku_id = int(m.group(1))
        if senkyoku_id in seen_ids:
            continue
        text = a.get_text(strip=True)
        # 選挙区名（例: 北海道1区）のリンクのみ拾う
        if re.search(r"[都道府県]?\d+区", text):
            seen_ids.add(senkyoku_id)
            constituencies.append({"id": senkyoku_id, "name": text})

    return constituencies


def parse_age_gender_status(para_text: str) -> dict:
    """
    '43歳  (男)[新人]' → {'age': 43, 'gender': '男', 'status': '新人'}
    """
    age = None
    gender = None
    status = None

    m = re.search(r"(\d+)歳", para_text)
    if m:
        age = int(m.group(1))

    m = re.search(r"\((男|女)\)", para_text)
    if m:
        gender = m.group(1)

    m = re.search(r"\[(新人|前職|現職)\]", para_text)
    if m:
        status = m.group(1)
    # 「元職」は go2senkyo では「前職」と表記されることがある
    if status == "前職":
        status = "元職"

    return {"age": age, "gender": gender, "status": status}


def parse_votes(votes_text: str) -> tuple[int, float]:
    """
    '112,618 票(43.6 %)' → (112618, 43.6)
    """
    votes = 0
    pct = 0.0
    # go2senkyoが同名候補者の選挙区で "93,158.548 票" のように小数付きで表示する場合があるため
    # (?:\.\d+)? で小数部を読み飛ばす
    m = re.search(r"([\d,]+)(?:\.\d+)?\s*票", votes_text)
    if m:
        votes = int(m.group(1).replace(",", ""))
    m = re.search(r"\(([\d.]+)\s*%\)", votes_text)
    if m:
        pct = float(m.group(1))
    return votes, pct


def scrape_constituency(session, senkyoku_id: int, prefecture: str, constituency_name: str) -> list[dict]:
    """選挙区ページから候補者データを取得"""
    url = f"{BASE_URL}/shugiin/{ELECTION_ID}/senkyoku/{senkyoku_id}"
    resp = session.get(url, timeout=30)
    if resp.status_code != 200:
        print(f"  警告: 選挙区{senkyoku_id}ページが取得できません (HTTP {resp.status_code})", file=sys.stderr)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    result_block = soup.find(class_="m_senkyo_result")
    if not result_block:
        print(f"  警告: 選挙区{senkyoku_id} に候補者データが見つかりません", file=sys.stderr)
        return []

    table = result_block.find("table")
    if not table:
        return []

    rows = table.find_all("tr")
    candidates = []

    for rank, row in enumerate(rows):
        cells = row.find_all(["td", "th"])
        if len(cells) < 2:
            continue

        # セル0: 当落ステータス（空=SMD候補、'比例'=比例復活）
        status_cell = cells[0]
        info_cell = cells[1] if len(cells) > 1 else None
        votes_cell = cells[2] if len(cells) > 2 else None

        win_status = status_cell.get_text(strip=True)  # '', '比例', '当選' など

        if not info_cell:
            continue

        section = info_cell.find(class_="m_senkyo_result_data")
        if not section:
            continue

        # 名前（漢字）
        ttl = section.find(class_="m_senkyo_result_data_ttl")
        kana_el = section.find(class_="m_senkyo_result_data_kana")

        if not ttl:
            continue

        full_ttl = ttl.get_text(strip=True)
        kana = kana_el.get_text(strip=True) if kana_el else ""
        # 漢字名 = ttlテキストからカナを除去
        name_kanji = full_ttl.replace(kana, "").strip()

        # 政党
        bottom_left = section.find(class_="m_senkyo_result_data_bottom_left")
        party_raw = bottom_left.get_text(strip=True) if bottom_left else ""

        # 詳細（重複・役職・年齢性別・ステータス）
        bottom_right = section.find(class_="m_senkyo_result_data_bottom_right")
        is_dual = False
        age = None
        gender = None
        candidate_status = None

        if bottom_right:
            paras = bottom_right.find_all("p", class_="m_senkyo_result_data_para")
            for p in paras:
                text = p.get_text(strip=True)
                if "重複" in text:
                    is_dual = True
                elif re.search(r"\d+歳", text):
                    parsed = parse_age_gender_status(text)
                    age = parsed["age"]
                    gender = parsed["gender"]
                    candidate_status = parsed["status"]

        # 票数・得票率
        votes = 0
        vote_rate = 0.0
        if votes_cell:
            votes, vote_rate = parse_votes(votes_cell.get_text(strip=True))

        # 当落
        if rank == 0 and win_status == "":
            elected = "smd_win"  # 小選挙区当選（1位）
        elif win_status == "比例":
            elected = "proportional_win"  # 比例復活当選
        else:
            elected = "lose"

        party_id = PARTY_NORMALIZE.get(party_raw)
        if party_id is None:
            # 部分一致フォールバック
            party_id = next(
                (v for k, v in PARTY_PREFIX_NORMALIZE.items() if party_raw.startswith(k)),
                "ind"
            )

        candidate = {
            "senkyokuId": senkyoku_id,
            "prefecture": prefecture,
            "constituencyName": constituency_name,
            "rank": rank + 1,
            "nameKanji": name_kanji,
            "nameKana": kana,
            "partyRaw": party_raw,
            "partyId": party_id,
            "isDual": is_dual,
            "age": age,
            "gender": gender,
            "status": candidate_status or "新人",
            "votes": votes,
            "voteRate": vote_rate / 100.0,  # 0.0〜1.0 に正規化
            "elected": elected,
        }
        candidates.append(candidate)

    return candidates


def main():
    session = get_session()
    all_candidates = []
    constituency_count = 0

    for pref_code in range(1, 48):
        pref_name = PREFECTURE_NAMES[pref_code]
        print(f"[{pref_code:02d}/47] {pref_name} の選挙区を取得中...")

        constituencies = get_constituencies_for_prefecture(session, pref_code)
        print(f"  選挙区数: {len(constituencies)}")
        time.sleep(0.5)  # 礼儀的なレート制限

        for c in constituencies:
            senkyoku_id = c["id"]
            constituency_name = c["name"]
            print(f"  　→ {constituency_name} (id={senkyoku_id})")

            candidates = scrape_constituency(session, senkyoku_id, pref_name, constituency_name)
            all_candidates.extend(candidates)
            constituency_count += 1
            time.sleep(0.8)

        print(f"  累計候補者数: {len(all_candidates)}")

    print(f"\n完了: {constituency_count} 選挙区 / {len(all_candidates)} 候補者")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_candidates, f, ensure_ascii=False, indent=2)

    print(f"出力: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
