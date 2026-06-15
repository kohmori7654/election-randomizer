"""
candidates.json の votes フィールドと originalVoteRate の整合性チェック。
各選挙区で最多票候補者のデータを基準に、他の候補者の期待票数を推計し、
実際の票数と比較して異常値を検出する。

正常: ratio ≈ 1.0
異常: ratio < 0.10 (期待値の 10% 以下)
"""
import json
import sys

candidates = json.load(open('public/data/candidates.json', encoding='utf-8'))

by_senkyoku: dict[int, list] = {}
for c in candidates:
    by_senkyoku.setdefault(c['senkyokuId'], []).append(c)

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

if anomalies:
    print('=== votes/rate 不整合スキャン ===')
    for a in sorted(anomalies, key=lambda x: x['ratio']):
        print(
            f"{a['district']:12} {a['name']:16} {a['party']:8} "
            f"実際={a['actual_votes']:>8,} 期待≈{a['expected_votes']:>8,} "
            f"ratio={a['ratio']:.4f} elected={a['elected']}"
        )
    print(f'\n異常件数: {len(anomalies)}件 / 全{len(candidates)}件')
    sys.exit(1)
else:
    print(f'OK: 異常なし（全{len(candidates)}件を検証済み）')
    sys.exit(0)
