import { describe, it, expect } from 'vitest'
import { calculateScore, calcVoteSplitPenalty, randomizeScoringParams, DEFAULT_SCORING_PARAMS } from '../engine/scoring'
import type { Candidate, Constituency, ScoringParams } from '../types/election'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 1,
    senkyokuId: 1,
    constituencyName: '東京1区',
    prefecture: '東京都',
    nameKanji: '候補一',
    nameKana: 'コウホイチ',
    partyId: 'ldp',
    isDual: false,
    status: '現職',
    age: 50,
    gender: '男',
    originalVoteRate: 0.5,
    votes: 50000,
    elected: 'lose',
    ...overrides,
  }
}

function makeConstituency(overrides: Partial<Constituency> = {}): Constituency {
  return {
    id: 1,
    name: '東京1区',
    prefecture: '東京都',
    bloc: '東京',
    lat: 35.6,
    lon: 139.7,
    voterTrend: 0.5,
    ...overrides,
  }
}

// homeWeight を有効にしたテスト用パラメータ（合計1.0）
const HOME_PARAMS: ScoringParams = {
  originalVoteRateWeight: 0.40,
  groundWeight:           0.20,
  ageWeight:              0.10,
  randomWeight:           0.10,
  homeWeight:             0.20,
}

describe('calculateScore', () => {
  it('スコアは 0〜1 の範囲に収まる', () => {
    const c = makeCandidate()
    const k = makeConstituency()
    const score = calculateScore(c, k, 0.5, DEFAULT_SCORING_PARAMS)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it('得票率が高いほどスコアが高い', () => {
    const k = makeConstituency()
    const high = makeCandidate({ originalVoteRate: 0.8 })
    const low = makeCandidate({ originalVoteRate: 0.2 })
    const rand = 0.5
    expect(calculateScore(high, k, rand, DEFAULT_SCORING_PARAMS))
      .toBeGreaterThan(calculateScore(low, k, rand, DEFAULT_SCORING_PARAMS))
  })

  it('地盤適合度が高いほどスコアが高い（ldp × 保守地盤 > ldp × 革新地盤）', () => {
    const ldpCandidate = makeCandidate({ partyId: 'ldp', originalVoteRate: 0.5 })
    const conservativeK = makeConstituency({ voterTrend: 0.9 })
    const progressiveK = makeConstituency({ voterTrend: 0.1 })
    const rand = 0.5
    expect(calculateScore(ldpCandidate, conservativeK, rand, DEFAULT_SCORING_PARAMS))
      .toBeGreaterThan(calculateScore(ldpCandidate, progressiveK, rand, DEFAULT_SCORING_PARAMS))
  })

  it('ランダム値が大きいほどスコアが高い', () => {
    const c = makeCandidate()
    const k = makeConstituency()
    const high = calculateScore(c, k, 0.9, DEFAULT_SCORING_PARAMS)
    const low = calculateScore(c, k, 0.1, DEFAULT_SCORING_PARAMS)
    expect(high).toBeGreaterThan(low)
  })

  it('得票率 5% の候補者は得票率 50% の候補者よりスコアが大幅に低い', () => {
    const k = makeConstituency({ voterTrend: 0.5 })
    const weak = makeCandidate({ originalVoteRate: 0.05, status: '新人' })
    const strong = makeCandidate({ originalVoteRate: 0.50, status: '現職' })
    const rand = 0.5
    const scoreWeak = calculateScore(weak, k, rand, DEFAULT_SCORING_PARAMS)
    const scoreStrong = calculateScore(strong, k, rand, DEFAULT_SCORING_PARAMS)
    expect(scoreWeak / scoreStrong).toBeLessThan(0.75)
  })
})

describe('calcVoteSplitPenalty', () => {
  it('競合なしはペナルティなし（1.0）', () => {
    expect(calcVoteSplitPenalty(0, 0)).toBe(1.0)
  })

  it('同一政党2人立候補: ペナルティ係数が 0.70〜0.80 の範囲に収まる', () => {
    // 固定random=0.0 → 0.70 (下限)
    expect(calcVoteSplitPenalty(1, 0, () => 0.0)).toBeCloseTo(0.70, 5)
    // 固定random=1.0 → 0.80 (上限)
    expect(calcVoteSplitPenalty(1, 0, () => 1.0)).toBeCloseTo(0.80, 5)
    // 中間値
    expect(calcVoteSplitPenalty(1, 0, () => 0.5)).toBeCloseTo(0.75, 5)
  })

  it('同一政党3人立候補: ペナルティ係数が 0.50〜0.70 の範囲に収まる', () => {
    // 固定random=0.0 → 0.50 (下限)
    expect(calcVoteSplitPenalty(2, 0, () => 0.0)).toBeCloseTo(0.50, 5)
    // 固定random=1.0 → 0.70 (上限)
    expect(calcVoteSplitPenalty(2, 0, () => 1.0)).toBeCloseTo(0.70, 5)
  })

  it('同一政党4人以上: 現行ロジック 1/(N+1) を維持', () => {
    expect(calcVoteSplitPenalty(3, 0)).toBeCloseTo(1 / 4, 5)
    expect(calcVoteSplitPenalty(4, 0)).toBeCloseTo(1 / 5, 5)
  })

  it('同一イデオロギーブロック内の競合は軽いペナルティ', () => {
    const penalty = calcVoteSplitPenalty(0, 2)
    expect(penalty).toBeLessThan(1.0)
    expect(penalty).toBeGreaterThan(0.85)
  })

  it('同一政党 + 同一ブロック競合: 単独政党ペナルティよりも低い', () => {
    const partyOnly = calcVoteSplitPenalty(1, 0, () => 0.5)  // 0.75
    const combined  = calcVoteSplitPenalty(1, 2, () => 0.5)  // 0.75 * 0.90 = 0.675
    expect(combined).toBeLessThan(partyOnly)
  })

  it('calculateScore に voteSplitContext を渡すと同一政党競合でスコアが低下する', () => {
    const c = makeCandidate({ originalVoteRate: 0.5 })
    const k = makeConstituency()
    const rand = 0.5
    const fixedRandom = () => 0.5
    const solo  = calculateScore(c, k, rand, DEFAULT_SCORING_PARAMS, undefined, undefined, fixedRandom)
    const split = calculateScore(c, k, rand, DEFAULT_SCORING_PARAMS, { samePartyCount: 1, sameBlocCount: 0 }, undefined, fixedRandom)
    expect(split).toBeLessThan(solo)
    // samePartyCount=1, random=0.5 → penalty=0.75
    expect(split / solo).toBeCloseTo(0.75, 1)
  })

  it('保守系3候補が集中する場合にもペナルティが入っている', () => {
    const c = makeCandidate({ originalVoteRate: 0.5 })
    const k = makeConstituency()
    const rand = 0.5
    const solo    = calculateScore(c, k, rand, DEFAULT_SCORING_PARAMS)
    const crowded = calculateScore(c, k, rand, DEFAULT_SCORING_PARAMS, { samePartyCount: 0, sameBlocCount: 2 })
    expect(crowded).toBeLessThan(solo)
  })
})

describe('HomeBonus（P8-1）', () => {
  const c = makeCandidate({ senkyokuId: 1, prefecture: '東京都' })

  it('本来の選挙区と同じ → homeScore = 1.0 に対応するスコアが最高', () => {
    // assigned と original が同一
    const assigned = makeConstituency({ id: 1, prefecture: '東京都', bloc: '東京' })
    const original = makeConstituency({ id: 1, prefecture: '東京都', bloc: '東京' })
    const score = calculateScore(c, assigned, 0.5, HOME_PARAMS, undefined, original)
    // homeScore=1.0 なので他条件と比較して高くなる
    const noHome = calculateScore(c, assigned, 0.5, { ...HOME_PARAMS, homeWeight: 0 })
    expect(score).toBeGreaterThan(noHome)
  })

  it('同じ都道府県 → homeScore = 0.7', () => {
    const assigned = makeConstituency({ id: 2, prefecture: '東京都', bloc: '東京' })
    const original = makeConstituency({ id: 1, prefecture: '東京都', bloc: '東京' })
    const score = calculateScore(c, assigned, 0.5, HOME_PARAMS, undefined, original)
    // homeScore=0.7: 同選挙区(1.0)より低いはず
    const sameConst = makeConstituency({ id: 1, prefecture: '東京都', bloc: '東京' })
    const scoreSame = calculateScore(c, sameConst, 0.5, HOME_PARAMS, undefined, original)
    expect(score).toBeLessThan(scoreSame)
  })

  it('同じブロック（異なる都道府県）→ homeScore = 0.4', () => {
    // candidate.prefecture = '東京都'、assigned.prefecture != '東京都' だが same bloc
    const cKanagawa = makeCandidate({ senkyokuId: 1, prefecture: '東京都' })
    const assigned = makeConstituency({ id: 10, prefecture: '神奈川県', bloc: '南関東' })
    const original = makeConstituency({ id: 1,  prefecture: '東京都',  bloc: '南関東' })
    const score = calculateScore(cKanagawa, assigned, 0.5, HOME_PARAMS, undefined, original)
    // homeScore=0.4: 同都道府県(0.7)より低いはず
    const samePref = makeConstituency({ id: 2, prefecture: '東京都', bloc: '南関東' })
    const scorePref = calculateScore(cKanagawa, samePref, 0.5, HOME_PARAMS, undefined, original)
    expect(score).toBeLessThan(scorePref)
  })

  it('最大距離（異なるブロック・約2200km以上）→ homeScore ≈ 0.0', () => {
    // 北海道 ↔ 沖縄: 約2400km
    const cHokkaido = makeCandidate({ senkyokuId: 1, prefecture: '北海道' })
    const assigned  = makeConstituency({ id: 99, prefecture: '沖縄県', bloc: '九州', lat: 26.2, lon: 127.7 })
    const original  = makeConstituency({ id: 1,  prefecture: '北海道', bloc: '北海道', lat: 43.0, lon: 141.4 })
    const score = calculateScore(cHokkaido, assigned, 0.5, HOME_PARAMS, undefined, original)
    // homeScore ≈ 0.0 なので homeWeight分のボーナスがほぼない
    const sameConst = makeConstituency({ id: 1, prefecture: '北海道', bloc: '北海道', lat: 43.0, lon: 141.4 })
    const scoreHome = calculateScore(cHokkaido, sameConst, 0.5, HOME_PARAMS, undefined, original)
    // 遠距離のほうが低い
    expect(score).toBeLessThan(scoreHome)
  })
})

describe('randomizeScoringParams（P8-3）', () => {
  it('出力ウェイトの合計が 1.0 になる', () => {
    const params = randomizeScoringParams(() => 0.5)
    const total = Object.values(params).reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1.0, 10)
  })

  it('各ウェイトは正の値', () => {
    const params = randomizeScoringParams(() => 0.0)
    for (const v of Object.values(params)) {
      expect(v).toBeGreaterThan(0)
    }
  })

  it('100回サンプリングで常に合計 ≈ 1.0', () => {
    for (let i = 0; i < 100; i++) {
      const params = randomizeScoringParams()
      const total = Object.values(params).reduce((s, v) => s + v, 0)
      expect(total).toBeCloseTo(1.0, 10)
    }
  })

  it('2回呼ぶと（Math.random使用時）異なるパラメータが返る可能性が高い', () => {
    // 同一のシード固定randを使えば同じ結果になることを確認（再現性）
    let counter = 0
    const seededRand = () => [0.1, 0.3, 0.5, 0.7, 0.9][counter++ % 5]
    const p1 = randomizeScoringParams(seededRand)
    counter = 0
    const p2 = randomizeScoringParams(seededRand)
    expect(p1.originalVoteRateWeight).toBeCloseTo(p2.originalVoteRateWeight, 10)
  })

  it('固定random=0.0 のとき各ウェイトの比率が期待通り（正規化前の最小値で決まる）', () => {
    // random=0.0 → raw: 0.45, 0.15, 0.03, 0.05, 0.15 → total=0.83
    const params = randomizeScoringParams(() => 0.0)
    expect(params.originalVoteRateWeight).toBeCloseTo(0.45 / 0.83, 5)
    expect(params.groundWeight).toBeCloseTo(0.15 / 0.83, 5)
    expect(params.ageWeight).toBeCloseTo(0.03 / 0.83, 5)
    expect(params.randomWeight).toBeCloseTo(0.05 / 0.83, 5)
    expect(params.homeWeight).toBeCloseTo(0.15 / 0.83, 5)
  })
})
