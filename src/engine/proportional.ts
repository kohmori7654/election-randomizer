import type {
  ConstituencyResult,
  ProportionalCandidate,
  ProportionalSeats,
  ProportionalRevival,
  SimCandidate,
  BlocName,
  PartyId,
} from '../types/election'

/** 供託物没収とみなす惜敗率の閾値 */
const KAKYAKU_THRESHOLD = 0.10

/**
 * 比例復活当選をシミュレーションする。
 * - 小選挙区当選者は除外
 * - 供託物没収相当（惜敗率 < 10%）は除外
 * - 比例単独（smdCandidateId = null）は別管理（本関数の対象外）
 * - 同一ブロック・政党内で惜敗率降順→名簿順で当選者を決定
 */
export function simulateProportionalRevival(
  constituencyResults: ConstituencyResult[],
  proportionalCandidates: ProportionalCandidate[],
  proportionalSeats: ProportionalSeats,
): ProportionalRevival[] {
  // 候補者IDで結果を引けるマップ
  const candidateById = new Map<number, SimCandidate>()
  const winnerIds = new Set<number>()
  const haiseiritsuMap = new Map<number, number>()

  for (const r of constituencyResults) {
    const winnerScore = r.winner.finalScore
    candidateById.set(r.winner.id, r.winner)
    winnerIds.add(r.winner.id)

    for (const loser of r.losers) {
      candidateById.set(loser.id, loser)
      const haiseiritsu = winnerScore > 0 ? loser.finalScore / winnerScore : 0
      haiseiritsuMap.set(loser.id, haiseiritsu)
    }
  }

  // ブロック × 政党 ごとに比例名簿候補をグループ化
  type Key = `${BlocName}::${PartyId}`
  const grouped = new Map<Key, ProportionalCandidate[]>()

  for (const pc of proportionalCandidates) {
    if (pc.isProportionalOnly || pc.smdCandidateId === null) continue
    const key: Key = `${pc.bloc}::${pc.partyId}`
    const arr = grouped.get(key) ?? []
    arr.push(pc)
    grouped.set(key, arr)
  }

  const revivals: ProportionalRevival[] = []

  for (const [key, candidates] of grouped.entries()) {
    const [bloc, partyId] = key.split('::') as [BlocName, PartyId]
    const availableSeats = (proportionalSeats[bloc]?.[partyId] ?? 0)
    if (availableSeats <= 0) continue

    // 当選資格のある候補者をフィルタ（小選挙区未当選 + 惜敗率 >= 10%）
    const eligible = candidates.filter(pc => {
      const smdId = pc.smdCandidateId!
      if (winnerIds.has(smdId)) return false
      const haiseiritsu = haiseiritsuMap.get(smdId) ?? 0
      return haiseiritsu >= KAKYAKU_THRESHOLD
    })

    // 惜敗率降順 → 名簿順でソート
    eligible.sort((a, b) => {
      const ha = haiseiritsuMap.get(a.smdCandidateId!) ?? 0
      const hb = haiseiritsuMap.get(b.smdCandidateId!) ?? 0
      if (Math.abs(ha - hb) > 1e-9) return hb - ha
      return a.listRank - b.listRank
    })

    const winners = eligible.slice(0, availableSeats)
    for (const pc of winners) {
      const candidate = candidateById.get(pc.smdCandidateId!)!
      revivals.push({
        candidate,
        bloc,
        partyId,
        haiseiritsu: haiseiritsuMap.get(pc.smdCandidateId!) ?? 0,
        listRank: pc.listRank,
      })
    }
  }

  return revivals
}
