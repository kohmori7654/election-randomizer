import type { Candidate, ConstituencyResult, DeathGroup } from '../types/election'

/**
 * 候補者ごとの「原選挙区支配度」を計算する。
 *
 * 当選者 (elected === 'smd_win'):
 *   dominanceRatio = winner.originalVoteRate / runnerUp.originalVoteRate  (>1.0)
 * 落選者・比例復活 (P6-10D):
 *   dominanceRatio = loser.originalVoteRate / winner.originalVoteRate  (0~1.0 = 惜敗率)
 *
 * votes フィールドは一部データが破損しているため使用しない。
 * originalVoteRate と elected は全候補者で正確な値が確認されている。
 */
export function buildDominanceMap(allCandidates: Candidate[]): Record<number, number> {
  const byOriginal: Record<number, Candidate[]> = {}
  for (const c of allCandidates) {
    if (!byOriginal[c.senkyokuId]) byOriginal[c.senkyokuId] = []
    byOriginal[c.senkyokuId].push(c)
  }

  const dominanceMap: Record<number, number> = {}

  for (const group of Object.values(byOriginal)) {
    const winner = group.find(c => c.elected === 'smd_win')

    if (!winner) {
      for (const c of group) dominanceMap[c.id] = 0
      continue
    }

    const runnerUp = [...group]
      .filter(c => c.id !== winner.id)
      .sort((a, b) => b.originalVoteRate - a.originalVoteRate)[0]

    dominanceMap[winner.id] = runnerUp && runnerUp.originalVoteRate > 0
      ? winner.originalVoteRate / runnerUp.originalVoteRate
      : 10

    for (const c of group) {
      if (c.id !== winner.id) {
        dominanceMap[c.id] = winner.originalVoteRate > 0
          ? c.originalVoteRate / winner.originalVoteRate
          : 0
      }
    }
  }

  return dominanceMap
}

/**
 * 1選挙区の強豪度スコアを計算する（detectDeathGroups と共有）。
 * intensity = avgDominance × (強豪候補の割合)
 *
 * 強豪候補の定義（P6-10D 変更）:
 *   当選者: 支配度 > 1.2  (20%以上の差で勝利)
 *   落選者: 惜敗率 > 0.8  (当選者の80%以上の票を獲得した僅差の落選)
 */
export function scoreConstituency(
  result: ConstituencyResult,
  dominanceMap: Record<number, number>,
): number {
  const sorted = [...result.candidates].sort((a, b) => b.finalScore - a.finalScore)
  const top3 = sorted.slice(0, 3)
  if (top3.length === 0) return 0
  const avgDominance = top3.reduce((s, c) => s + (dominanceMap[c.id] ?? 0), 0) / top3.length
  const strongCount = top3.filter(c => {
    const r = dominanceMap[c.id] ?? 0
    return r > 1.2 || (r > 0.8 && r < 1.0)
  }).length
  return avgDominance * (strongCount / top3.length)
}

/**
 * 「死の組」を検出する。
 * intensity = 圧勝候補同士の集中度（元選挙区での支配度ベース）
 * @param allCandidates シャッフル前の全候補者（支配度計算に使用）
 * @param topN 返す死の組の最大件数
 * @param minCandidates この人数以上がいる選挙区のみ対象
 */
export function detectDeathGroups(
  results: ConstituencyResult[],
  allCandidates: Candidate[],
  topN: number = 10,
  minCandidates: number = 3,
): DeathGroup[] {
  const dominanceMap = buildDominanceMap(allCandidates)
  const groups: DeathGroup[] = []

  for (const r of results) {
    if (r.candidates.length < minCandidates) continue

    const intensity = scoreConstituency(r, dominanceMap)
    const sorted = [...r.candidates].sort((a, b) => b.finalScore - a.finalScore)

    const dominanceRatios: Record<number, number> = {}
    for (const c of r.candidates) {
      dominanceRatios[c.id] = dominanceMap[c.id] ?? 0
    }

    groups.push({
      constituencyId: r.constituencyId,
      constituencyName: r.constituencyName,
      prefecture: r.prefecture,
      candidates: sorted,
      intensity,
      dominanceRatios,
    })
  }

  return groups
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, topN)
}
