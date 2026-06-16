import type { Party, PartyId } from '../types/election'

export const PARTIES: Record<PartyId, Party> = {
  ldp:    { id: 'ldp',    name: '自由民主党',           shortName: '自民',   color: '#CC0000' },
  crc:    { id: 'crc',    name: '中道改革連合',          shortName: '中道',   color: '#1D6FA4' },
  ishin:  { id: 'ishin',  name: '日本維新の会',          shortName: '維新',   color: '#1DA462' },
  dpfp:   { id: 'dpfp',   name: '国民民主党',            shortName: '国民',   color: '#007BBB' },
  sansei: { id: 'sansei', name: '参政党',                shortName: '参政',   color: '#F05A28' },
  tm:     { id: 'tm',     name: 'チームみらい',           shortName: 'みらい', color: '#2196F3' },
  jcp:    { id: 'jcp',    name: '日本共産党',            shortName: '共産',   color: '#DB001B' },
  reiwa:  { id: 'reiwa',  name: 'れいわ新選組',          shortName: 'れいわ', color: '#E4007F' },
  genzei: { id: 'genzei', name: '減税日本・ゆうこく連合', shortName: '減税',   color: '#2C3F8C' },
  nhk:    { id: 'nhk',    name: '日本保守党',            shortName: '保守党', color: '#00A0E9' },
  sdp:    { id: 'sdp',    name: '社民党',               shortName: '社民',   color: '#00AA44' },
  ind:    { id: 'ind',    name: '無所属',               shortName: '無所属', color: '#888888' },
}

export const PARTY_LIST = Object.values(PARTIES)

export function getParty(id: PartyId): Party {
  return PARTIES[id]
}

export type IdeologicalBloc = 'conservative' | 'progressive' | 'center' | 'other'

/** 政党のイデオロギーブロック（票割れペナルティ計算用・一次ブロック） */
export const IDEOLOGICAL_BLOC: Record<PartyId, IdeologicalBloc> = {
  nhk:    'conservative',
  sansei: 'conservative',
  ishin:  'conservative',
  ldp:    'conservative',
  tm:     'center',
  dpfp:   'center',
  crc:    'center',        // 二次ブロックに progressive も持つ（SECONDARY_BLOC参照）
  reiwa:  'progressive',
  sdp:    'progressive',
  jcp:    'progressive',
  genzei: 'other',
  ind:    'other',
}

/** 複数ブロックに跨る政党の二次ブロック（票割れ計算時に強い方を採用） */
export const SECONDARY_BLOC: Partial<Record<PartyId, IdeologicalBloc>> = {
  crc: 'progressive',
}

/** 政党の「地盤スコア」（有権者傾向との親和性計算用） */
export const PARTY_POLITICAL_SCORE: Record<PartyId, number> = {
  nhk:    0.90,
  sansei: 0.80,
  ishin:  0.70,
  ldp:    0.65,
  ind:    0.50,
  genzei: 0.50,
  tm:     0.50,
  dpfp:   0.40,
  crc:    0.30,
  reiwa:  0.20,
  sdp:    0.10,
  jcp:    0.10,
}
