import { describe, it, expect } from 'vitest'
import { simulateProportionalRevival } from '../engine/proportional'
import type {
  SimCandidate,
  ConstituencyResult,
  ProportionalCandidate,
  ProportionalSeats,
} from '../types/election'

// ========== フィクスチャ ==========

function makeSimCandidate(
  id: number,
  partyId: SimCandidate['partyId'],
  finalScore: number,
  won: boolean = false,
): SimCandidate {
  return {
    id,
    senkyokuId: id,
    constituencyName: `選挙区${id}`,
    prefecture: '東京都',
    nameKanji: `候補${id}`,
    nameKana: `コウホ${id}`,
    partyId,
    isDual: true,
    status: '現職',
    age: 50,
    gender: '男',
    originalVoteRate: finalScore,
    votes: Math.floor(finalScore * 100000),
    elected: won ? 'smd_win' : 'lose',
    assignedConstituencyId: id,
    finalScore,
  }
}

function makeResult(
  id: number,
  winner: SimCandidate,
  losers: SimCandidate[],
): ConstituencyResult {
  return {
    constituencyId: id,
    constituencyName: `選挙区${id}`,
    prefecture: '東京都',
    bloc: '東京',
    winner,
    runnerUp: losers[0] ?? null,
    losers,
    candidates: [winner, ...losers],
  }
}

function makePrCandidate(
  id: number,
  smdId: number | null,
  partyId: SimCandidate['partyId'],
  rank: number,
  proportionalOnly: boolean = false,
): ProportionalCandidate {
  return {
    id,
    bloc: '東京',
    partyId,
    listRank: rank,
    nameRaw: `比例${id}`,
    nameCleaned: `比例${id}`,
    isProportionalOnly: proportionalOnly,
    smdCandidateId: smdId,
    smdElected: false,
  }
}

// ========== テスト ==========

describe('simulateProportionalRevival', () => {
  it('小選挙区当選者は比例復活しない', () => {
    const winner = makeSimCandidate(1, 'crc', 0.9, true)
    const loser = makeSimCandidate(2, 'ldp', 0.7, false)
    const results = [makeResult(1, winner, [loser])]

    const prCands = [
      makePrCandidate(1, 1, 'crc', 1), // 小選挙区当選者
      makePrCandidate(2, 2, 'ldp', 1),
    ]
    const seats: ProportionalSeats = { '東京': { crc: 1, ldp: 1 } } as unknown as ProportionalSeats

    const revivals = simulateProportionalRevival(results, prCands, seats)
    const winnerRevival = revivals.find(r => r.candidate.id === 1)
    expect(winnerRevival).toBeUndefined()
  })

  it('比例単独候補者は小選挙区の惜敗率でソートされない（名簿順）', () => {
    const winner = makeSimCandidate(1, 'ldp', 0.9, true)
    const results = [makeResult(1, winner, [])]

    const prOnlyCandidate = makePrCandidate(10, null, 'ldp', 1, true)
    const seats: ProportionalSeats = { '東京': { ldp: 1 } } as unknown as ProportionalSeats

    const revivals = simulateProportionalRevival(results, [prOnlyCandidate], seats)
    const revival = revivals.find(r => r.candidate.id === 10)
    // 比例単独は smdCandidateId が null のため別処理
    expect(revival).toBeUndefined() // smdCandidateId null は revivalに含まれない
  })

  it('供託物没収相当（惜敗率 < 10%）の候補者は復活しない', () => {
    const winner = makeSimCandidate(1, 'ldp', 1.0, true)
    const kakyaku = makeSimCandidate(2, 'crc', 0.05, false) // 惜敗率 5%
    const results = [makeResult(1, winner, [kakyaku])]

    const prCands = [makePrCandidate(1, 2, 'crc', 1)]
    const seats: ProportionalSeats = { '東京': { crc: 1 } } as unknown as ProportionalSeats

    const revivals = simulateProportionalRevival(results, prCands, seats)
    expect(revivals).toHaveLength(0)
  })

  it('議席数が 0 のブロックでは復活しない', () => {
    const winner = makeSimCandidate(1, 'ldp', 0.9, true)
    const loser = makeSimCandidate(2, 'crc', 0.7, false)
    const results = [makeResult(1, winner, [loser])]

    const prCands = [makePrCandidate(1, 2, 'crc', 1)]
    const seats: ProportionalSeats = { '東京': { crc: 0 } } as unknown as ProportionalSeats

    const revivals = simulateProportionalRevival(results, prCands, seats)
    expect(revivals).toHaveLength(0)
  })

  it('複数ブロックを独立して処理する', () => {
    const winner1 = makeSimCandidate(1, 'ldp', 0.9, true)
    const loser1 = makeSimCandidate(2, 'crc', 0.7, false)
    const winner2 = makeSimCandidate(3, 'ldp', 0.85, true)
    const loser2 = makeSimCandidate(4, 'crc', 0.75, false)

    const r1: ConstituencyResult = { ...makeResult(1, winner1, [loser1]), bloc: '東京' }
    const r2: ConstituencyResult = { ...makeResult(2, winner2, [loser2]), bloc: '東北' }

    const prCands = [
      { ...makePrCandidate(1, 2, 'crc', 1), bloc: '東京' as const },
      { ...makePrCandidate(2, 4, 'crc', 1), bloc: '東北' as const },
    ]
    const seats: ProportionalSeats = {
      '東京': { crc: 1 },
      '東北': { crc: 1 },
    } as unknown as ProportionalSeats

    const revivals = simulateProportionalRevival([r1, r2], prCands, seats)
    expect(revivals).toHaveLength(2)
  })

  it('同一ブロック同一政党内で惜敗率の高い順に当選する', () => {
    const winner = makeSimCandidate(1, 'ldp', 1.0, true)
    const loserHigh = makeSimCandidate(2, 'crc', 0.8, false) // 惜敗率 80%
    const loserLow = makeSimCandidate(3, 'crc', 0.5, false)  // 惜敗率 50%
    const results = [makeResult(1, winner, [loserHigh, loserLow])]

    const prCands = [
      makePrCandidate(1, 2, 'crc', 1),
      makePrCandidate(2, 3, 'crc', 2),
    ]
    const seats: ProportionalSeats = { '東京': { crc: 1 } } as unknown as ProportionalSeats

    const revivals = simulateProportionalRevival(results, prCands, seats)
    expect(revivals).toHaveLength(1)
    expect(revivals[0].candidate.id).toBe(2) // 惜敗率の高い候補が当選
  })
})
