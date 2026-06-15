import type { Candidate, Constituency, ScoringParams } from '../types/election'
import { PARTY_POLITICAL_SCORE } from '../data/parties'

export const DEFAULT_SCORING_PARAMS: ScoringParams = {
  originalVoteRateWeight: 0.40,
  groundWeight:           0.25,
  ageWeight:              0.10,
  randomWeight:           0.25,
  homeWeight:             0.0,  // 既存テスト互換のためデフォルト0
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * 同一選挙区内の競合候補数に応じてスコアにペナルティを与える。
 * @param samePartyCount 同一政党の競合数（自分を除く）
 * @param sameBlocCount  同一イデオロギーブロックの競合数（自分を除く・同一政党を含まない）
 * @param random         乱数生成器（デフォルト: Math.random）
 */
export function calcVoteSplitPenalty(
  samePartyCount: number,
  sameBlocCount: number,
  random: () => number = Math.random,
): number {
  let partyPenalty: number
  if (samePartyCount === 0) {
    partyPenalty = 1.0
  } else if (samePartyCount === 1) {
    partyPenalty = 0.70 + random() * 0.10  // 0.70〜0.80
  } else if (samePartyCount === 2) {
    partyPenalty = 0.50 + random() * 0.20  // 0.50〜0.70
  } else {
    partyPenalty = 1 / (samePartyCount + 1)  // 4人以上は現行ロジック
  }
  const blocPenalty = sameBlocCount > 0 ? 1 - 0.05 * sameBlocCount : 1.0
  return Math.min(1, partyPenalty * blocPenalty)
}

/**
 * 候補者のシミュレーションスコアを計算する（0〜1）。
 * @param randomValue          0〜1 の乱数（外部から注入して再現性を確保）
 * @param voteSplitContext     同一選挙区内の競合数（省略可能）
 * @param originalConstituency 候補者の本来の選挙区（HomeBonus計算に使用）
 * @param random               票割れペナルティ用乱数生成器
 */
export function calculateScore(
  candidate: Candidate,
  constituency: Constituency,
  randomValue: number,
  params: ScoringParams = DEFAULT_SCORING_PARAMS,
  voteSplitContext?: { samePartyCount: number; sameBlocCount: number },
  originalConstituency?: Constituency,
  random: () => number = Math.random,
): number {
  const { originalVoteRateWeight, groundWeight, ageWeight, randomWeight, homeWeight } = params

  // 1. 実際の得票率
  const voteScore = candidate.originalVoteRate

  // 2. 地盤との相性: 政党スコアと有権者傾向の近さ
  const partyScore = PARTY_POLITICAL_SCORE[candidate.partyId] ?? 0.5
  const groundScore = 1 - Math.abs(partyScore - constituency.voterTrend)

  // 3. 年齢スコア（30〜60歳が最高、若すぎ/高齢は下がる）
  const age = candidate.age
  const ageScore = age >= 30 && age <= 60
    ? 1.0
    : age < 30
      ? 0.7 + (age - 20) * 0.03
      : Math.max(0.3, 1.0 - (age - 60) * 0.02)

  // 4. ランダム成分
  const randScore = randomValue

  // 5. 地盤ボーナス（HomeBonus）: 本来の選挙区との距離・一致度
  let homeScore = 0.0
  if (homeWeight > 0 && originalConstituency) {
    if (constituency.id === candidate.senkyokuId) {
      homeScore = 1.0
    } else if (constituency.prefecture === candidate.prefecture) {
      homeScore = 0.7
    } else if (constituency.bloc === originalConstituency.bloc) {
      homeScore = 0.4
    } else {
      const distKm = haversineDistance(
        originalConstituency.lat, originalConstituency.lon,
        constituency.lat, constituency.lon,
      )
      homeScore = Math.max(0.0, 0.3 * (1 - distKm / 2200))
    }
  }

  const baseScore =
    voteScore  * originalVoteRateWeight +
    groundScore * groundWeight +
    ageScore   * ageWeight +
    randScore  * randomWeight +
    homeScore  * homeWeight

  const splitPenalty = voteSplitContext
    ? calcVoteSplitPenalty(voteSplitContext.samePartyCount, voteSplitContext.sameBlocCount, random)
    : 1.0

  return Math.min(1, Math.max(0, baseScore * splitPenalty))
}

/**
 * 毎シミュレーションごとにウェイトをランダム変動させ、正規化した ScoringParams を返す。
 */
export function randomizeScoringParams(random: () => number = Math.random): ScoringParams {
  const raw = {
    originalVoteRateWeight: 0.45 + random() * 0.10,  // 0.45〜0.55
    groundWeight:           0.15 + random() * 0.10,  // 0.15〜0.25
    ageWeight:              0.03 + random() * 0.07,  // 0.03〜0.10
    randomWeight:           0.05 + random() * 0.20,  // 0.05〜0.25
    homeWeight:             0.15 + random() * 0.10,  // 0.15〜0.25
  }
  const total = Object.values(raw).reduce((s, v) => s + v, 0)
  return {
    originalVoteRateWeight: raw.originalVoteRateWeight / total,
    groundWeight:           raw.groundWeight / total,
    ageWeight:              raw.ageWeight / total,
    randomWeight:           raw.randomWeight / total,
    homeWeight:             raw.homeWeight / total,
  }
}
