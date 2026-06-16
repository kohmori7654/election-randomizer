// ========== 政党 ==========
export type PartyId =
  | 'ldp'
  | 'crc'
  | 'ishin'
  | 'dpfp'
  | 'sansei'
  | 'tm'
  | 'jcp'
  | 'reiwa'
  | 'genzei'
  | 'nhk'
  | 'sdp'
  | 'ind'

export interface Party {
  id: PartyId
  name: string
  color: string
  shortName: string
}

// ========== 選挙区 ==========
export type BlocName =
  | '北海道'
  | '東北'
  | '北関東'
  | '南関東'
  | '東京'
  | '北陸信越'
  | '東海'
  | '近畿'
  | '中国'
  | '四国'
  | '九州'

export interface Constituency {
  id: number
  name: string
  prefecture: string
  bloc: BlocName
  lat: number
  lon: number
  voterTrend: number
}

// ========== 候補者（JSONデータ）==========
export type ElectedStatus = 'smd_win' | 'proportional_win' | 'lose'

export interface Candidate {
  id: number
  senkyokuId: number
  constituencyName: string
  prefecture: string
  nameKanji: string
  nameKana: string
  partyId: PartyId
  isDual: boolean
  status: '現職' | '元職' | '新人'
  age: number
  gender: '男' | '女'
  originalVoteRate: number
  votes: number
  elected: ElectedStatus
}

// ========== 比例候補者 ==========
export interface ProportionalCandidate {
  id: number
  bloc: BlocName
  partyId: PartyId
  listRank: number
  nameRaw: string
  nameCleaned: string
  isProportionalOnly: boolean
  smdCandidateId: number | null
  smdElected: boolean | null
}

// ========== 比例議席数（ブロック×政党）==========
export type ProportionalSeats = Record<BlocName, Partial<Record<PartyId, number>>>

// ========== シミュレーション入出力 ==========

/** 候補者にスコア・配置情報を付与した拡張型 */
export interface SimCandidate extends Candidate {
  assignedConstituencyId: number
  finalScore: number
}

/** 1選挙区のシミュレーション結果 */
export interface ConstituencyResult {
  constituencyId: number
  constituencyName: string
  prefecture: string
  bloc: BlocName
  winner: SimCandidate
  runnerUp: SimCandidate | null
  losers: SimCandidate[]
  candidates: SimCandidate[]
}

/** 比例復活当選者 */
export interface ProportionalRevival {
  candidate: SimCandidate
  bloc: BlocName
  partyId: PartyId
  haiseiritsu: number
  listRank: number
}

/** 比例名簿の当選順位変化（実際 vs シミュ）を1候補分記録するエントリ */
export interface ProportionalRankingEntry {
  listRank: number
  nameKanji: string
  partyId: PartyId
  bloc: BlocName
  smdCandidateId: number | null
  /** 比例単独候補か（true = 小選挙区非立候補） */
  isProportionalOnly: boolean
  /** 小選挙区の選挙区名（比例単独は null） */
  constituencyName: string | null
  /** 実際の選挙での惜敗率（小選挙区当選 = 1.0、供託没収相当 ≈ 0） */
  realHaiseiritsu: number
  /** シミュでの惜敗率（小選挙区当選 = null、資格外 = 0） */
  simHaiseiritsu: number | null
  /** 実際の実効順位（資格外は Infinity） */
  realEffectiveRank: number
  /** シミュの実効順位（資格外は Infinity） */
  simEffectiveRank: number
  /** 実際に比例当選したか */
  realElected: boolean
  /** シミュで比例当選したか */
  simElected: boolean
}

/** シミュレーション全体の結果 */
export interface SimulationResult {
  constituencies: ConstituencyResult[]
  proportionalRevivals: ProportionalRevival[]
  seatsByParty: Record<PartyId, { smd: number; pr: number; total: number }>
  deathGroups: DeathGroup[]
  constituencyRanking: ConstituencyRankingEntry[]
  proportionalRankingChanges: ProportionalRankingEntry[]
  timestamp: number
}

/** 死の組（有力候補同士の激突選挙区） */
export interface DeathGroup {
  constituencyId: number
  constituencyName: string
  prefecture: string
  candidates: SimCandidate[]
  intensity: number
  dominanceRatios?: Record<number, number>
}

/** 全選挙区強豪区ランキングの1エントリ */
export interface ConstituencyRankingEntry {
  rank: number
  constituencyId: number
  constituencyName: string
  prefecture: string
  intensity: number
  topCandidates: {
    name: string
    partyId: PartyId
    dominanceRatio: number
    originalVoteShare: number
  }[]
}

// ========== スコア計算パラメータ ==========
export interface ScoringParams {
  /** 0.0〜1.0: 実際の得票率の重み */
  originalVoteRateWeight: number
  /** 0.0〜1.0: 地盤との相性（voterTrend × 政党スコア）の重み */
  groundWeight: number
  /** 0.0〜1.0: 年齢の影響の重み */
  ageWeight: number
  /** 0.0〜1.0: ランダム成分の重み */
  randomWeight: number
  /** 0.0〜1.0: 地盤ボーナス（本来の選挙区との距離・一致度）の重み */
  homeWeight: number
}
