import { Link } from 'react-router-dom'
import type { DeathGroup as DeathGroupType } from '../types/election'
import { PARTIES } from '../data/parties'

interface DeathGroupProps {
  groups: DeathGroupType[]
}

export function DeathGroup({ groups }: DeathGroupProps) {
  if (groups.length === 0) return null

  return (
    <section className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-700">
          ⚔️ 死の組 TOP10（有力候補同士の激突選挙区）
        </h2>
        <Link
          to="/ranking"
          className="text-xs text-blue-600 hover:underline"
        >
          全ランキングへ →
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {groups.map((g, i) => (
          <div
            key={g.constituencyId}
            className="border border-gray-200 rounded p-2 flex gap-2 items-start"
          >
            <span className="text-gray-400 font-bold text-sm w-5 flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-medium text-sm text-gray-800">{g.constituencyName}</span>
                <span className="text-xs text-gray-400">{g.prefecture}</span>
                <span
                  className="ml-auto text-xs font-bold"
                  style={{ color: intensityColor(g.intensity) }}
                  title="強豪スコア（高いほど元選挙区での有力候補が集中）"
                >
                  {g.intensity.toFixed(2)}
                </span>
              </div>
              <div className="space-y-0.5">
                {g.candidates.map(c => {
                  const p = PARTIES[c.partyId]
                  const dominance = g.dominanceRatios?.[c.id] ?? 0
                  return (
                    <div key={c.id} className="flex items-center gap-1 text-xs">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-gray-800 font-medium">{c.nameKanji}</span>
                      <span className="text-gray-500">（{p.shortName}）</span>
                      <span className="text-gray-400 ml-auto">
                        {dominance > 1.0
                          ? `${dominance.toFixed(2)}倍`
                          : `惜${(dominance * 100).toFixed(1)}%`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function intensityColor(intensity: number): string {
  if (intensity >= 5.0) return '#DC2626'
  if (intensity >= 2.0) return '#EA580C'
  return '#CA8A04'
}
