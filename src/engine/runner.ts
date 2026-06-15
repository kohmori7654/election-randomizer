import type {
  Candidate,
  Constituency,
  ConstituencyResult,
  ConstituencyRankingEntry,
  ProportionalCandidate,
  ProportionalRankingEntry,
  ProportionalSeats,
  SimCandidate,
  SimulationResult,
  PartyId,
  BlocName,
} from '../types/election'
import { assignCandidatesWithPartyDistribution } from './simulator'
import { calculateScore, randomizeScoringParams } from './scoring'
import { buildDominanceMap, scoreConstituency, detectDeathGroups } from './deathGroup'
import { simulateProportionalRevival } from './proportional'
import { PARTIES, IDEOLOGICAL_BLOC } from '../data/parties'

/** mulberry32 PRNG（simulator.ts と同一実装） */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let z = s
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }
}

const KAKYAKU_THRESHOLD = 0.10

/**
 * 実際の選挙での惜敗率マップを構築する。
 * originalVoteRate ベース（votes よりも信頼性が高い）。
 * 小選挙区当選者は 1.0、落選者は当選者比率。
 */
function buildRealHaiseiritsuMap(candidates: Candidate[]): Map<number, number> {
  const bySenkyoku = new Map<number, Candidate[]>()
  for (const c of candidates) {
    const arr = bySenkyoku.get(c.senkyokuId) ?? []
    arr.push(c)
    bySenkyoku.set(c.senkyokuId, arr)
  }
  const map = new Map<number, number>()
  for (const group of bySenkyoku.values()) {
    const winner = group.find(c => c.elected === 'smd_win')
    if (!winner) continue
    map.set(winner.id, 1.0)
    for (const c of group) {
      if (c.id !== winner.id) {
        map.set(c.id, winner.originalVoteRate > 0
          ? c.originalVoteRate / winner.originalVoteRate
          : 0)
      }
    }
  }
  return map
}

/**
 * 比例名簿の当選順位変化を計算する。
 * ブロック×政党ごとに実際とシミュの実効順位を算出し、当落の変化を検出する。
 */
function buildRankingChanges(
  proportionalCandidates: ProportionalCandidate[],
  proportionalSeats: ProportionalSeats,
  candidateMap: Map<number, Candidate>,
  realHaiseiritsuMap: Map<number, number>,
  simHaiseiritsuMap: Map<number, number>,
  simWinnerIds: Set<number>,
): ProportionalRankingEntry[] {
  type Key = `${BlocName}::${PartyId}`
  const grouped = new Map<Key, ProportionalCandidate[]>()

  for (const pc of proportionalCandidates) {
    if (pc.isProportionalOnly || pc.smdCandidateId === null) continue
    const key: Key = `${pc.bloc}::${pc.partyId}`
    const arr = grouped.get(key) ?? []
    arr.push(pc)
    grouped.set(key, arr)
  }

  // ブロック×政党ごとに実効順位を計算
  const realRankMap = new Map<number, number>()  // smdCandidateId → 実際の実効順位
  const simRankMap = new Map<number, number>()   // smdCandidateId → シミュの実効順位

  for (const [, pcs] of grouped.entries()) {
    // 実際の実効順位
    const realEligible = pcs
      .filter(pc => {
        const smd = candidateMap.get(pc.smdCandidateId!)
        if (!smd || smd.elected === 'smd_win') return false
        const h = realHaiseiritsuMap.get(pc.smdCandidateId!) ?? 0
        return h >= KAKYAKU_THRESHOLD
      })
      .sort((a, b) => {
        const ha = realHaiseiritsuMap.get(a.smdCandidateId!) ?? 0
        const hb = realHaiseiritsuMap.get(b.smdCandidateId!) ?? 0
        return Math.abs(ha - hb) > 1e-9 ? hb - ha : a.listRank - b.listRank
      })
    realEligible.forEach((pc, i) => realRankMap.set(pc.smdCandidateId!, i + 1))

    // シミュの実効順位
    const simEligible = pcs
      .filter(pc => {
        if (simWinnerIds.has(pc.smdCandidateId!)) return false
        const h = simHaiseiritsuMap.get(pc.smdCandidateId!) ?? 0
        return h >= KAKYAKU_THRESHOLD
      })
      .sort((a, b) => {
        const ha = simHaiseiritsuMap.get(a.smdCandidateId!) ?? 0
        const hb = simHaiseiritsuMap.get(b.smdCandidateId!) ?? 0
        return Math.abs(ha - hb) > 1e-9 ? hb - ha : a.listRank - b.listRank
      })
    simEligible.forEach((pc, i) => simRankMap.set(pc.smdCandidateId!, i + 1))
  }

  // 全候補エントリを組み立て
  const entries: ProportionalRankingEntry[] = []
  for (const [key, pcs] of grouped.entries()) {
    const [bloc, partyId] = key.split('::') as [BlocName, PartyId]
    const seats = proportionalSeats[bloc]?.[partyId] ?? 0

    for (const pc of pcs) {
      const smdId = pc.smdCandidateId!
      const smd = candidateMap.get(smdId)
      if (!smd) continue

      const realH = realHaiseiritsuMap.get(smdId) ?? 0
      const simH = simWinnerIds.has(smdId) ? null : (simHaiseiritsuMap.get(smdId) ?? 0)

      const realRank = smd.elected === 'smd_win'
        ? Infinity
        : (realRankMap.get(smdId) ?? Infinity)
      const simRank = simWinnerIds.has(smdId)
        ? Infinity
        : (simRankMap.get(smdId) ?? Infinity)

      entries.push({
        listRank: pc.listRank,
        nameKanji: smd.nameKanji,
        partyId: partyId as PartyId,
        bloc: bloc as BlocName,
        smdCandidateId: smdId,
        realHaiseiritsu: realH,
        simHaiseiritsu: simH,
        realEffectiveRank: realRank,
        simEffectiveRank: simRank,
        realElected: realRank !== Infinity && realRank <= seats,
        simElected: simRank !== Infinity && simRank <= seats,
      })
    }
  }

  return entries.sort((a, b) =>
    a.bloc.localeCompare(b.bloc) ||
    a.partyId.localeCompare(b.partyId) ||
    a.listRank - b.listRank,
  )
}

export function runSimulation(
  candidates: Candidate[],
  constituencies: Constituency[],
  proportionalCandidates: ProportionalCandidate[],
  proportionalSeats: ProportionalSeats,
  seed?: number,
): SimulationResult {
  const rand = seed !== undefined ? mulberry32(seed + 1) : Math.random

  // シミュレーションごとにウェイトをランダム変動させる（P8-3）
  const params = randomizeScoringParams(rand)

  // 1. 政党分散配置で選挙区に割り当て（同一政党が集中しない）
  const assignmentMap = assignCandidatesWithPartyDistribution(candidates, constituencies, seed)

  // 選挙区IDマップ（HomeBonus計算用）
  const constituencyMap = new Map<number, Constituency>(constituencies.map(c => [c.id, c]))

  // 2. 各選挙区でスコア計算 → 勝者決定
  const constituencyResults: ConstituencyResult[] = []
  const allSimCandidates = new Map<number, SimCandidate>()

  for (const constituency of constituencies) {
    const assigned = assignmentMap[constituency.id] ?? []

    // 票割れ: 選挙区内の政党・イデオロギーブロックの競合数を事前集計
    const partyCountMap = new Map<PartyId, number>()
    const blocCountMap  = new Map<string, number>()
    for (const c of assigned) {
      partyCountMap.set(c.partyId, (partyCountMap.get(c.partyId) ?? 0) + 1)
      const bloc = IDEOLOGICAL_BLOC[c.partyId] ?? 'center'
      blocCountMap.set(bloc, (blocCountMap.get(bloc) ?? 0) + 1)
    }

    const simCandidates: SimCandidate[] = assigned.map(c => {
      const samePartyCount = (partyCountMap.get(c.partyId) ?? 1) - 1
      const bloc = IDEOLOGICAL_BLOC[c.partyId] ?? 'center'
      const sameBlocCount = ((blocCountMap.get(bloc) ?? 1) - 1) - samePartyCount
      const originalConstituency = constituencyMap.get(c.senkyokuId)
      return {
        ...c,
        assignedConstituencyId: constituency.id,
        finalScore: calculateScore(
          c, constituency, rand(), params,
          { samePartyCount, sameBlocCount },
          originalConstituency, rand,
        ),
      }
    })

    simCandidates.sort((a, b) => b.finalScore - a.finalScore)

    const [winner, runnerUp, ...rest] = simCandidates
    const losers = runnerUp ? [runnerUp, ...rest] : rest

    for (const sc of simCandidates) allSimCandidates.set(sc.id, sc)

    constituencyResults.push({
      constituencyId: constituency.id,
      constituencyName: constituency.name,
      prefecture: constituency.prefecture,
      bloc: constituency.bloc,
      winner: { ...winner, elected: 'smd_win' },
      runnerUp: runnerUp ?? null,
      losers,
      candidates: simCandidates,
    })
  }

  // 3. シミュ惜敗率マップ（比例名簿順位変化 + 比例復活で共用）
  const simHaiseiritsuMap = new Map<number, number>()
  const simWinnerIds = new Set<number>()
  for (const r of constituencyResults) {
    simWinnerIds.add(r.winner.id)
    const winnerScore = r.winner.finalScore
    for (const loser of r.losers) {
      simHaiseiritsuMap.set(loser.id, winnerScore > 0 ? loser.finalScore / winnerScore : 0)
    }
  }

  // 4. 比例復活
  const revivals = simulateProportionalRevival(
    constituencyResults,
    proportionalCandidates,
    proportionalSeats,
  )

  // 5. 議席集計
  const seatsByParty: SimulationResult['seatsByParty'] = {} as SimulationResult['seatsByParty']
  for (const id of Object.keys(PARTIES) as PartyId[]) {
    seatsByParty[id] = { smd: 0, pr: 0, total: 0 }
  }

  for (const r of constituencyResults) {
    seatsByParty[r.winner.partyId].smd++
  }
  for (const rv of revivals) {
    seatsByParty[rv.partyId].pr++
  }
  for (const id of Object.keys(seatsByParty) as PartyId[]) {
    seatsByParty[id].total = seatsByParty[id].smd + seatsByParty[id].pr
  }

  // 6. 支配度マップを構築（死の組 + 全選挙区ランキングで共用）
  const dominanceMap = buildDominanceMap(candidates)

  // 7. 死の組
  const deathGroups = detectDeathGroups(constituencyResults, candidates, 10)

  // 8. 全選挙区強豪区ランキング
  const constituencyRanking: ConstituencyRankingEntry[] = constituencyResults
    .map(result => {
      const intensity = scoreConstituency(result, dominanceMap)
      const sorted = [...result.candidates].sort((a, b) => b.finalScore - a.finalScore)
      const topCandidates = sorted.map(c => ({
        name: c.nameKanji,
        partyId: c.partyId,
        dominanceRatio: dominanceMap[c.id] ?? 0,
        originalVoteShare: c.originalVoteRate,
      }))
      return {
        rank: 0,
        constituencyId: result.constituencyId,
        constituencyName: result.constituencyName,
        prefecture: result.prefecture,
        intensity,
        topCandidates,
      }
    })
    .sort((a, b) => b.intensity - a.intensity)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))

  // 9. 比例名簿当選順位変化
  const candidateMap = new Map<number, Candidate>(candidates.map(c => [c.id, c]))
  const realHaiseiritsuMap = buildRealHaiseiritsuMap(candidates)
  const proportionalRankingChanges = buildRankingChanges(
    proportionalCandidates,
    proportionalSeats,
    candidateMap,
    realHaiseiritsuMap,
    simHaiseiritsuMap,
    simWinnerIds,
  )

  return {
    constituencies: constituencyResults,
    proportionalRevivals: revivals,
    seatsByParty,
    deathGroups,
    constituencyRanking,
    proportionalRankingChanges,
    timestamp: Date.now(),
  }
}
