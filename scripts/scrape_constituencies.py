#!/usr/bin/env python3
"""
P0-2: raw_candidates.json から選挙区データを生成。
都道府県座標はハードコード。voterTrend は得票率×政治スコアで算出。
出力: scripts/raw_constituencies.json
"""

import json
from pathlib import Path
from collections import defaultdict

INPUT_PATH = Path(__file__).parent / "raw_candidates.json"
OUTPUT_PATH = Path(__file__).parent / "raw_constituencies.json"

# 都道府県中心座標（緯度・経度）
PREFECTURE_COORDS = {
    "北海道":   (43.064, 141.347),
    "青森県":   (40.824, 140.740),
    "岩手県":   (39.703, 141.153),
    "宮城県":   (38.268, 140.872),
    "秋田県":   (39.718, 140.103),
    "山形県":   (38.240, 140.363),
    "福島県":   (37.750, 140.468),
    "茨城県":   (36.342, 140.447),
    "栃木県":   (36.565, 139.883),
    "群馬県":   (36.391, 139.060),
    "埼玉県":   (35.857, 139.649),
    "千葉県":   (35.605, 140.123),
    "東京都":   (35.690, 139.692),
    "神奈川県": (35.447, 139.642),
    "新潟県":   (37.902, 139.023),
    "富山県":   (36.695, 137.211),
    "石川県":   (36.594, 136.626),
    "福井県":   (36.065, 136.222),
    "山梨県":   (35.664, 138.568),
    "長野県":   (36.651, 138.181),
    "岐阜県":   (35.391, 136.722),
    "静岡県":   (34.977, 138.383),
    "愛知県":   (35.180, 136.907),
    "三重県":   (34.730, 136.509),
    "滋賀県":   (35.004, 135.869),
    "京都府":   (35.021, 135.756),
    "大阪府":   (34.686, 135.520),
    "兵庫県":   (34.691, 135.183),
    "奈良県":   (34.685, 135.833),
    "和歌山県": (34.226, 135.167),
    "鳥取県":   (35.504, 134.238),
    "島根県":   (35.472, 133.051),
    "岡山県":   (34.661, 133.934),
    "広島県":   (34.396, 132.459),
    "山口県":   (34.186, 131.471),
    "徳島県":   (34.066, 134.559),
    "香川県":   (34.340, 134.043),
    "愛媛県":   (33.842, 132.766),
    "高知県":   (33.559, 133.531),
    "福岡県":   (33.607, 130.418),
    "佐賀県":   (33.249, 130.299),
    "長崎県":   (32.745, 129.874),
    "熊本県":   (32.790, 130.742),
    "大分県":   (33.238, 131.613),
    "宮崎県":   (31.911, 131.424),
    "鹿児島県": (31.560, 130.558),
    "沖縄県":   (26.212, 127.681),
}

# 政治スコア（政党の左右位置: 0=左 〜 1=右）
PARTY_POLITICAL_SCORE = {
    "ldp":    0.80,
    "ishin":  0.50,
    "crc":    0.30,
    "dpfp":   0.40,
    "sansei": 0.70,
    "tm":     0.45,
    "jcp":    0.10,
    "reiwa":  0.20,
    "nhk":    0.50,
    "sdp":    0.20,
    "genzei": 0.60,
    "ind":    0.50,
}

# 比例ブロックの対応（都道府県名 → ブロック名）
PREFECTURE_TO_BLOC = {
    "北海道":                                                       "北海道",
    "青森県": "東北", "岩手県": "東北", "宮城県": "東北",
    "秋田県": "東北", "山形県": "東北", "福島県": "東北",
    "茨城県": "北関東", "栃木県": "北関東", "群馬県": "北関東", "埼玉県": "北関東",
    "千葉県": "南関東", "神奈川県": "南関東",
    "東京都":                                                       "東京",
    "新潟県": "北陸信越", "富山県": "北陸信越", "石川県": "北陸信越",
    "福井県": "北陸信越", "長野県": "北陸信越",
    "岐阜県": "東海", "静岡県": "東海", "愛知県": "東海", "三重県": "東海",
    "滋賀県": "近畿", "京都府": "近畿", "大阪府": "近畿",
    "兵庫県": "近畿", "奈良県": "近畿", "和歌山県": "近畿",
    "鳥取県": "中国", "島根県": "中国", "岡山県": "中国",
    "広島県": "中国", "山口県": "中国",
    "徳島県": "四国", "香川県": "四国", "愛媛県": "四国", "高知県": "四国",
    "福岡県": "九州", "佐賀県": "九州", "長崎県": "九州",
    "熊本県": "九州", "大分県": "九州", "宮崎県": "九州",
    "鹿児島県": "九州", "沖縄県": "九州",
    "山梨県": "南関東",  # 山梨は南関東ブロック
}


def calc_voter_trend(candidates: list[dict]) -> float:
    """
    voterTrend = Σ(votes × politicalScore) / Σ(votes)
    候補者の得票数で加重平均した政治的傾向（0=左 〜 1=右）
    """
    total_votes = sum(c["votes"] for c in candidates)
    if total_votes == 0:
        return 0.5
    weighted = sum(
        c["votes"] * PARTY_POLITICAL_SCORE.get(c["partyId"], 0.5)
        for c in candidates
    )
    return round(weighted / total_votes, 4)


def main():
    with open(INPUT_PATH, encoding="utf-8") as f:
        raw = json.load(f)

    # 選挙区ごとに候補者をグループ化
    by_senkyoku: dict[int, list[dict]] = defaultdict(list)
    for c in raw:
        by_senkyoku[c["senkyokuId"]].append(c)

    constituencies = []
    for seq_id, (senkyoku_id, candidates) in enumerate(sorted(by_senkyoku.items()), start=1):
        if not candidates:
            continue
        first = candidates[0]
        pref = first["prefecture"]
        lat, lng = PREFECTURE_COORDS.get(pref, (35.0, 135.0))

        voter_trend = calc_voter_trend(candidates)
        winner = next((c for c in candidates if c["elected"] == "smd_win"), None)

        constituency = {
            "id": seq_id,
            "senkyokuId": senkyoku_id,
            "name": first["constituencyName"],
            "prefecture": pref,
            "bloc": PREFECTURE_TO_BLOC.get(pref, "東京"),
            "lat": lat,
            "lng": lng,
            "numCandidates": len(candidates),
            "voterTrend": voter_trend,
            "actualWinnerPartyId": winner["partyId"] if winner else "ind",
            "actualWinnerName": winner["nameKanji"] if winner else "",
        }
        constituencies.append(constituency)

    print(f"選挙区数: {len(constituencies)}")

    # ブロック別集計
    from collections import Counter
    bloc_counts = Counter(c["bloc"] for c in constituencies)
    print("ブロック別:")
    for bloc, cnt in sorted(bloc_counts.items()):
        print(f"  {bloc}: {cnt}区")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(constituencies, f, ensure_ascii=False, indent=2)
    print(f"出力: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
