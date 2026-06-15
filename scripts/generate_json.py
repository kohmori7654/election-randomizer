#!/usr/bin/env python3
"""
P0-4: raw データから React アプリ用の最終 JSON を生成。
出力:
  public/data/candidates.json
  public/data/constituencies.json
  public/data/proportional_candidates.json
  public/data/proportional_seats.json
"""

import json
from pathlib import Path
from collections import defaultdict

SCRIPTS_DIR = Path(__file__).parent
PUBLIC_DATA = SCRIPTS_DIR.parent / "public" / "data"

# 実際の選挙結果（議席の正確な配分）- 検証・補正用
ACTUAL_SEATS_TOTAL = {
    "ldp":    {"smd": 249, "pr": 67},
    "ishin":  {"smd": 20,  "pr": 16},
    "crc":    {"smd": 7,   "pr": 42},
    "dpfp":   {"smd": 8,   "pr": 20},
    "sansei": {"smd": 0,   "pr": 15},
    "tm":     {"smd": 0,   "pr": 11},
    "jcp":    {"smd": 0,   "pr": 4},
    "reiwa":  {"smd": 0,   "pr": 1},
    "genzei": {"smd": 0,   "pr": 1},
    "nhk":    {"smd": 0,   "pr": 0},
    "sdp":    {"smd": 0,   "pr": 0},
    "ind":    {"smd": 15,  "pr": 0},
}


def load_raw():
    paths = {
        "candidates":     SCRIPTS_DIR / "raw_candidates.json",
        "constituencies": SCRIPTS_DIR / "raw_constituencies.json",
        "pr_candidates":  SCRIPTS_DIR / "raw_proportional_candidates.json",
        "pr_seats":       SCRIPTS_DIR / "raw_proportional_seats.json",
    }
    data = {}
    for key, path in paths.items():
        with open(path, encoding="utf-8") as f:
            data[key] = json.load(f)
    return data


def build_candidates(raw_candidates: list) -> list:
    """
    candidates.json 用データを生成。
    各候補者にユニーク ID を付与し、originalVoteRate を正規化。
    """
    result = []
    for seq_id, c in enumerate(raw_candidates, start=1):
        result.append({
            "id":               seq_id,
            "senkyokuId":       c["senkyokuId"],
            "constituencyName": c["constituencyName"],
            "prefecture":       c["prefecture"],
            "nameKanji":        c["nameKanji"],
            "nameKana":         c["nameKana"],
            "partyId":          c["partyId"],
            "isDual":           c["isDual"],
            "status":           c["status"],          # 現職/元職/新人
            "age":              c["age"],
            "gender":           c["gender"],
            "originalVoteRate": c["voteRate"],        # 0.0〜1.0
            "votes":            c["votes"],
            "elected":          c["elected"],         # smd_win/proportional_win/lose
        })
    return result


def build_constituencies(raw_constituencies: list) -> list:
    """constituencies.json 用データを生成。"""
    return raw_constituencies  # そのまま使用


def build_proportional_candidates(
    raw_pr: list,
    candidates: list,
) -> list:
    """
    proportional_candidates.json 用データを生成。
    - smdCandidateKey からシミュレーション用の smdCandidateId に変換
    """
    # candidateId の逆引きマップ (partyId, normalizedName) → candidate.id
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    from parse_proportional_pdf import normalize_name
    cand_by_key = {}
    for c in candidates:
        norm = normalize_name(c["nameKanji"])
        key = f"{c['partyId']}_{norm}"
        cand_by_key[key] = c["id"]

    result = []
    for seq_id, e in enumerate(raw_pr, start=1):
        smd_id = None
        if e.get("smdCandidateKey"):
            smd_id = cand_by_key.get(e["smdCandidateKey"])

        result.append({
            "id":               seq_id,
            "bloc":             e["bloc"],
            "partyId":          e["partyId"],
            "listRank":         e["listRank"],
            "nameRaw":          e["nameRaw"],
            "nameCleaned":      e["nameCleaned"],
            "isProportionalOnly": e["isProportionalOnly"],
            "smdCandidateId":   smd_id,
            "smdElected":       e.get("smdElected"),
        })
    return result


def build_proportional_seats(raw_seats: dict) -> dict:
    """
    proportional_seats.json 用データを生成。
    PDF から取得した値に genzei の不足分（1席）を補正する。
    """
    seats = {}
    for bloc, parties in raw_seats.items():
        seats[bloc] = dict(parties)

    # genzei の合計確認と補正
    genzei_total = sum(v.get("genzei", 0) for v in seats.values())
    if genzei_total == 0:
        # 東海ブロックに genzei 1席を追加（実際は東海ブロックで当選）
        if "東海" in seats:
            seats["東海"]["genzei"] = 1
            print("  ※ genzei 1席を東海ブロックに手動補正")

    # 総合計の検証
    party_totals = defaultdict(int)
    for bloc_seats in seats.values():
        for party, n in bloc_seats.items():
            party_totals[party] += n

    print("  比例議席 政党別合計:")
    for party, total in sorted(party_totals.items()):
        expected = ACTUAL_SEATS_TOTAL.get(party, {}).get("pr", 0)
        match = "✓" if total == expected else f"✗ (期待値 {expected})"
        print(f"    {party}: {total} {match}")

    return seats


def main():
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)

    print("raw データを読み込み中...")
    raw = load_raw()

    print("\ncandidates.json を生成中...")
    candidates = build_candidates(raw["candidates"])
    print(f"  候補者数: {len(candidates)}")

    print("\nconstituencies.json を生成中...")
    constituencies = build_constituencies(raw["constituencies"])
    print(f"  選挙区数: {len(constituencies)}")

    print("\nproportional_candidates.json を生成中...")
    pr_candidates = build_proportional_candidates(raw["pr_candidates"], candidates)
    pr_only = sum(1 for e in pr_candidates if e["isProportionalOnly"])
    dual = sum(1 for e in pr_candidates if not e["isProportionalOnly"])
    print(f"  比例単独: {pr_only} 人 / 重複: {dual} 人 / 合計: {len(pr_candidates)} 人")

    print("\nproportional_seats.json を生成中...")
    pr_seats = build_proportional_seats(raw["pr_seats"])

    # 書き出し
    output_files = {
        "candidates.json":             candidates,
        "constituencies.json":         constituencies,
        "proportional_candidates.json": pr_candidates,
        "proportional_seats.json":     pr_seats,
    }

    for filename, data in output_files.items():
        path = PUBLIC_DATA / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        size_kb = path.stat().st_size / 1024
        print(f"\n出力: {path} ({size_kb:.1f} KB)")

    print("\n=== 完了 ===")


if __name__ == "__main__":
    main()
