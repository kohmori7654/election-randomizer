import { useState, useMemo } from 'react'
import type { ConstituencyResult, BlocName } from '../types/election'
import { PARTIES } from '../data/parties'

interface ConstituencyListProps {
  results: ConstituencyResult[]
}

const BLOCS: BlocName[] = [
  '北海道', '東北', '北関東', '南関東', '東京',
  '北陸信越', '東海', '近畿', '中国', '四国', '九州',
]

export function ConstituencyList({ results }: ConstituencyListProps) {
  const [selectedBloc, setSelectedBloc] = useState<BlocName | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    return results.filter(r => {
      if (selectedBloc !== 'all' && r.bloc !== selectedBloc) return false
      if (searchQuery) {
        if (
          !r.constituencyName.includes(searchQuery) &&
          !r.winner.nameKanji.includes(searchQuery) &&
          !r.prefecture.includes(searchQuery)
        ) return false
      }
      return true
    })
  }, [results, selectedBloc, searchQuery])

  return (
    <section className="px-4 py-3">
      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          placeholder="選挙区・候補者名で絞り込み"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedBloc('all')}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              selectedBloc === 'all'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            全ブロック
          </button>
          {BLOCS.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBloc(b)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                selectedBloc === b
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-2">{filtered.length} 選挙区</p>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-left">
              <th className="px-3 py-2 font-medium">選挙区</th>
              <th className="px-3 py-2 font-medium">当選者</th>
              <th className="px-3 py-2 font-medium">政党</th>
              <th className="px-3 py-2 font-medium text-right">スコア</th>
              <th className="px-3 py-2 font-medium">惜敗</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const party = PARTIES[r.winner.partyId]
              const runnerUp = r.runnerUp
              const haiseiritsu = runnerUp
                ? ((runnerUp.finalScore / r.winner.finalScore) * 100).toFixed(1)
                : null
              const isExpanded = expandedId === r.constituencyId

              return (
                <>
                  <tr
                    key={r.constituencyId}
                    onClick={() => setExpandedId(isExpanded ? null : r.constituencyId)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 text-gray-600">
                      <span className="font-medium text-gray-800">{r.constituencyName}</span>
                      <span className="text-xs text-gray-400 ml-1">{r.bloc}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{r.winner.nameKanji}</span>
                      <span className="text-xs text-gray-400 ml-1">{r.winner.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-white text-xs font-medium"
                        style={{ backgroundColor: party.color }}
                      >
                        {party.shortName}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600 font-mono text-xs">
                      {r.winner.finalScore.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {haiseiritsu ? `${haiseiritsu}%` : '—'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${r.constituencyId}-detail`} className="bg-gray-50">
                      <td colSpan={5} className="px-3 py-2">
                        <div className="text-xs text-gray-600 space-y-1">
                          {r.candidates.map((c, idx) => {
                            const cp = PARTIES[c.partyId]
                            return (
                              <div key={c.id} className="flex items-center gap-2">
                                <span className="w-4 text-gray-400">{idx + 1}位</span>
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cp.color }}
                                />
                                <span className="font-medium">{c.nameKanji}</span>
                                <span className="text-gray-400">({cp.shortName})</span>
                                <span className="font-mono">{c.finalScore.toFixed(3)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
