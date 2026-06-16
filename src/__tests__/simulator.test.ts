import { describe, it, expect } from 'vitest'
import { shuffleCandidates, assignCandidates, assignCandidatesWithPartyDistribution } from '../engine/simulator'
import type { Candidate, Constituency } from '../types/election'

// テスト用フィクスチャ
function makeCandidate(id: number, overrides: Partial<Candidate> = {}): Candidate {
  return {
    id,
    senkyokuId: id,
    constituencyName: `選挙区${id}`,
    prefecture: '東京都',
    nameKanji: `候補${id}`,
    nameKana: `コウホ${id}`,
    partyId: 'ldp',
    isDual: false,
    status: '新人',
    age: 40,
    gender: '男',
    originalVoteRate: 0.5,
    votes: 50000,
    elected: 'lose',
    ...overrides,
  }
}

function makeConstituency(id: number, overrides: Partial<Constituency> = {}): Constituency {
  return {
    id,
    name: `テスト${id}区`,
    prefecture: '東京都',
    bloc: '東京',
    lat: 35.6,
    lon: 139.7,
    voterTrend: 0.5,
    ...overrides,
  }
}

describe('shuffleCandidates', () => {
  it('同じ長さの配列を返す', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => makeCandidate(i + 1))
    const shuffled = shuffleCandidates(candidates)
    expect(shuffled).toHaveLength(candidates.length)
  })

  it('元の配列を変更しない（イミュータブル）', () => {
    const candidates = Array.from({ length: 5 }, (_, i) => makeCandidate(i + 1))
    const original = [...candidates]
    shuffleCandidates(candidates)
    expect(candidates.map(c => c.id)).toEqual(original.map(c => c.id))
  })

  it('同じ要素が含まれている', () => {
    const candidates = Array.from({ length: 20 }, (_, i) => makeCandidate(i + 1))
    const shuffled = shuffleCandidates(candidates)
    const ids = shuffled.map(c => c.id).sort((a, b) => a - b)
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  })

  it('固定シードで再現性がある', () => {
    const candidates = Array.from({ length: 100 }, (_, i) => makeCandidate(i + 1))
    const a = shuffleCandidates(candidates, 42)
    const b = shuffleCandidates(candidates, 42)
    expect(a.map(c => c.id)).toEqual(b.map(c => c.id))
  })

  it('異なるシードで異なる並びになる', () => {
    const candidates = Array.from({ length: 100 }, (_, i) => makeCandidate(i + 1))
    const a = shuffleCandidates(candidates, 1)
    const b = shuffleCandidates(candidates, 2)
    expect(a.map(c => c.id)).not.toEqual(b.map(c => c.id))
  })
})

describe('assignCandidates', () => {
  it('各選挙区に最低1人の候補者が割り当てられる', () => {
    const candidates = Array.from({ length: 289 * 3 }, (_, i) => makeCandidate(i + 1))
    const constituencies = Array.from({ length: 289 }, (_, i) => makeConstituency(i + 1))
    const result = assignCandidates(candidates, constituencies)
    for (const [, group] of Object.entries(result)) {
      expect(group.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('全候補者がいずれかの選挙区に割り当てられる', () => {
    const candidates = Array.from({ length: 20 }, (_, i) => makeCandidate(i + 1))
    const constituencies = Array.from({ length: 5 }, (_, i) => makeConstituency(i + 1))
    const result = assignCandidates(candidates, constituencies)
    const totalAssigned = Object.values(result).reduce((sum, g) => sum + g.length, 0)
    expect(totalAssigned).toBe(candidates.length)
  })

  it('候補者数と選挙区数が等しい場合、各区1人になる', () => {
    const n = 5
    const candidates = Array.from({ length: n }, (_, i) => makeCandidate(i + 1))
    const constituencies = Array.from({ length: n }, (_, i) => makeConstituency(i + 1))
    const result = assignCandidates(candidates, constituencies)
    for (const [, group] of Object.entries(result)) {
      expect(group).toHaveLength(1)
    }
  })

  it('返り値のキーは全選挙区の ID を含む', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => makeCandidate(i + 1))
    const constituencies = Array.from({ length: 4 }, (_, i) => makeConstituency(i + 1))
    const result = assignCandidates(candidates, constituencies)
    for (const c of constituencies) {
      expect(result[c.id]).toBeDefined()
    }
  })
})

describe('assignCandidatesWithPartyDistribution', () => {
  it('全候補者がいずれかの選挙区に割り当てられる', () => {
    const parties = ['ldp', 'crc', 'jcp'] as const
    const candidates = Array.from({ length: 30 }, (_, i) =>
      makeCandidate(i + 1, { partyId: parties[i % 3] }),
    )
    const constituencies = Array.from({ length: 10 }, (_, i) => makeConstituency(i + 1))
    const result = assignCandidatesWithPartyDistribution(candidates, constituencies, 42)
    const total = Object.values(result).reduce((s, g) => s + g.length, 0)
    expect(total).toBe(candidates.length)
  })

  it('同一政党が同一選挙区に重複しない（各政党6人・10選挙区）', () => {
    const parties = ['ldp', 'crc', 'jcp', 'dpfp', 'ishin'] as const
    // 各政党6人、10選挙区 → 1選挙区あたり3人、最大5政党 → 重複なく配置可能
    const candidates = Array.from({ length: 30 }, (_, i) =>
      makeCandidate(i + 1, { partyId: parties[i % 5] }),
    )
    const constituencies = Array.from({ length: 10 }, (_, i) => makeConstituency(i + 1))
    const result = assignCandidatesWithPartyDistribution(candidates, constituencies, 1)
    for (const [, group] of Object.entries(result)) {
      const partyIds = group.map(c => c.partyId)
      const unique = new Set(partyIds)
      expect(unique.size).toBe(partyIds.length)
    }
  })

  it('固定シードで再現性がある', () => {
    const candidates = Array.from({ length: 50 }, (_, i) =>
      makeCandidate(i + 1, { partyId: i % 2 === 0 ? 'ldp' : 'crc' }),
    )
    const constituencies = Array.from({ length: 10 }, (_, i) => makeConstituency(i + 1))
    const a = assignCandidatesWithPartyDistribution(candidates, constituencies, 99)
    const b = assignCandidatesWithPartyDistribution(candidates, constituencies, 99)
    for (const c of constituencies) {
      expect(a[c.id].map(x => x.id)).toEqual(b[c.id].map(x => x.id))
    }
  })
})
