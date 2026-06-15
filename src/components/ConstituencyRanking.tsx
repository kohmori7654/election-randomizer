import { useState, useMemo } from 'react'
import type { ConstituencyRankingEntry, DeathGroup } from '../types/election'
import { PARTIES } from '../data/parties'

interface ConstituencyRankingProps {
  ranking: ConstituencyRankingEntry[]
  deathGroups: DeathGroup[]
}

const PREFECTURES = [
  '全国',
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

const LIMIT_OPTIONS = [30, 50, 100, 289]

export function ConstituencyRanking({ ranking, deathGroups }: ConstituencyRankingProps) {
  const [prefecture, setPrefecture] = useState('全国')
  const [limit, setLimit] = useState(50)

  const deathGroupIds = useMemo(
    () => new Set(deathGroups.map(g => g.constituencyId)),
    [deathGroups],
  )

  const filtered = useMemo(() => {
    const list = prefecture === '全国'
      ? ranking
      : ranking.filter(e => e.prefecture === prefecture)
    return list.slice(0, limit)
  }, [ranking, prefecture, limit])

  return (
    <section id="constituency-ranking" className="bg-white border-b border-gray-200 px-4 py-3">
      <h2 className="text-sm font-bold text-gray-700 mb-2">
        🏆 全選挙区 強豪区ランキング（全 {ranking.length} 区）
      </h2>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={prefecture}
          onChange={e => setPrefecture(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          {PREFECTURES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={limit}
          onChange={e => setLimit(Number(e.target.value))}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          {LIMIT_OPTIONS.map(n => (
            <option key={n} value={n}>上位 {n} 件</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 self-center">
          {filtered.length} 件表示
        </span>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600">
              <th className="text-right px-2 py-1 w-8">順位</th>
              <th className="text-left px-2 py-1">選挙区</th>
              <th className="text-left px-2 py-1 hidden sm:table-cell">都道府県</th>
              <th className="text-right px-2 py-1 w-16">強豪スコア</th>
              <th className="text-left px-2 py-1">候補者（元支配度）</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => {
              const isDeathGroup = deathGroupIds.has(entry.constituencyId)
              return (
                <tr
                  key={entry.constituencyId}
                  className={`border-t border-gray-100 ${
                    isDeathGroup ? 'bg-red-50' : entry.rank % 2 === 0 ? 'bg-gray-50' : ''
                  }`}
                >
                  <td className="text-right px-2 py-1 text-gray-500 font-mono">
                    {entry.rank}
                  </td>
                  <td className="px-2 py-1 font-medium text-gray-800">
                    {isDeathGroup && <span title="死の組TOP10">🔥 </span>}
                    {entry.constituencyName}
                  </td>
                  <td className="px-2 py-1 text-gray-500 hidden sm:table-cell">
                    {entry.prefecture}
                  </td>
                  <td
                    className="text-right px-2 py-1 font-bold font-mono"
                    style={{ color: scoreColor(entry.intensity) }}
                  >
                    {entry.intensity.toFixed(2)}
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex flex-wrap gap-1">
                      {entry.topCandidates.map((c, idx) => {
                        const p = PARTIES[c.partyId]
                        return (
                          <span key={idx} className="flex items-center gap-0.5">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="text-gray-700">{c.name}</span>
                            <span className="text-gray-400">
                              ({c.dominanceRatio > 1.0
                                ? `${c.dominanceRatio.toFixed(2)}倍`
                                : `惜${(c.dominanceRatio * 100).toFixed(0)}%`})
                            </span>
                            {idx < entry.topCandidates.length - 1 && (
                              <span className="text-gray-300 mx-0.5">/</span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function scoreColor(intensity: number): string {
  if (intensity >= 5.0) return '#DC2626'
  if (intensity >= 2.0) return '#EA580C'
  return '#CA8A04'
}
