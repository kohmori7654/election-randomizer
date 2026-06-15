import { describe, it, expect } from 'vitest'
import { detectDeathGroups } from '../engine/deathGroup'
import type { SimCandidate, ConstituencyResult } from '../types/election'

// senkyokuId は id と同値にして各候補が独自の原選挙区を持つようにする
// 各候補は独立した原選挙区でのみ行動するため、デフォルトで 'smd_win'（その区の当選者）とする
function makeSimCandidate(
  id: number,
  partyId: SimCandidate['partyId'],
  score: number,
  elected: SimCandidate['elected'] = 'smd_win',
): SimCandidate {
  return {
    id,
    senkyokuId: id,
    constituencyName: '東京1区',
    prefecture: '東京都',
    nameKanji: `候補${id}`,
    nameKana: `コウホ${id}`,
    partyId,
    isDual: false,
    status: '現職',
    age: 50,
    gender: '男',
    originalVoteRate: score,
    votes: Math.floor(score * 100000),
    elected,
    assignedConstituencyId: 1,
    finalScore: score,
  }
}

function makeConstituencyResult(
  id: number,
  candidates: SimCandidate[],
): ConstituencyResult {
  const sorted = [...candidates].sort((a, b) => b.finalScore - a.finalScore)
  return {
    constituencyId: id,
    constituencyName: `選挙区${id}`,
    prefecture: '東京都',
    bloc: '東京',
    winner: sorted[0],
    runnerUp: sorted[1] ?? null,
    losers: sorted.slice(1),
    candidates: sorted,
  }
}

describe('detectDeathGroups', () => {
  it('候補者が少ない選挙区は死の組にならない', () => {
    const results = [
      makeConstituencyResult(1, [
        makeSimCandidate(1, 'ldp', 0.8),
        makeSimCandidate(2, 'crc', 0.3),
      ]),
    ]
    const allCandidates = results.flatMap(r => r.candidates)
    const groups = detectDeathGroups(results, allCandidates, 3)
    expect(groups).toHaveLength(0)
  })

  it('圧勝候補が多数集まる選挙区は死の組になる', () => {
    const results = [
      makeConstituencyResult(1, [
        makeSimCandidate(1, 'ldp',   0.9),
        makeSimCandidate(2, 'crc',   0.85),
        makeSimCandidate(3, 'ishin', 0.8),
        makeSimCandidate(4, 'dpfp',  0.75),
      ]),
    ]
    // 各候補は独自の senkyokuId でランナーアップなし → 支配度 10 → 全員が圧勝候補
    const allCandidates = results.flatMap(r => r.candidates)
    const groups = detectDeathGroups(results, allCandidates, 3)
    expect(groups.length).toBeGreaterThanOrEqual(1)
  })

  it('intensity は 0 以上の非負数', () => {
    const results = [
      makeConstituencyResult(1, [
        makeSimCandidate(1, 'ldp',   0.9),
        makeSimCandidate(2, 'crc',   0.85),
        makeSimCandidate(3, 'ishin', 0.8),
        makeSimCandidate(4, 'dpfp',  0.75),
      ]),
    ]
    const allCandidates = results.flatMap(r => r.candidates)
    const groups = detectDeathGroups(results, allCandidates, 1)
    for (const g of groups) {
      expect(g.intensity).toBeGreaterThanOrEqual(0)
    }
  })

  it('topN 件を返す', () => {
    const makeResult = (id: number, score: number) =>
      makeConstituencyResult(id, [
        makeSimCandidate(id * 10 + 1, 'ldp',   score),
        makeSimCandidate(id * 10 + 2, 'crc',   score * 0.95),
        makeSimCandidate(id * 10 + 3, 'ishin', score * 0.9),
        makeSimCandidate(id * 10 + 4, 'dpfp',  score * 0.85),
      ])

    const results = Array.from({ length: 20 }, (_, i) => makeResult(i + 1, 0.7 + i * 0.01))
    const allCandidates = results.flatMap(r => r.candidates)
    const groups = detectDeathGroups(results, allCandidates, 5)
    expect(groups).toHaveLength(5)
  })

  it('intensity の降順でソートされている', () => {
    const makeResult = (id: number, score: number) =>
      makeConstituencyResult(id, [
        makeSimCandidate(id * 10 + 1, 'ldp',   score),
        makeSimCandidate(id * 10 + 2, 'crc',   score * 0.95),
        makeSimCandidate(id * 10 + 3, 'ishin', score * 0.9),
        makeSimCandidate(id * 10 + 4, 'dpfp',  score * 0.85),
      ])

    const results = Array.from({ length: 10 }, (_, i) => makeResult(i + 1, 0.6 + i * 0.03))
    const allCandidates = results.flatMap(r => r.candidates)
    const groups = detectDeathGroups(results, allCandidates, 10)
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i - 1].intensity).toBeGreaterThanOrEqual(groups[i].intensity)
    }
  })

  it('dominanceRatios が結果に含まれている', () => {
    const results = [
      makeConstituencyResult(1, [
        makeSimCandidate(1, 'ldp',   0.9),
        makeSimCandidate(2, 'crc',   0.85),
        makeSimCandidate(3, 'ishin', 0.8),
      ]),
    ]
    const allCandidates = results.flatMap(r => r.candidates)
    const groups = detectDeathGroups(results, allCandidates, 1)
    expect(groups[0].dominanceRatios).toBeDefined()
  })
})
