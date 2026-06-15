import { useState, useMemo } from 'react'
import type { ProportionalRankingEntry, BlocName, PartyId } from '../types/election'
import { PARTIES } from '../data/parties'

interface Props {
  entries: ProportionalRankingEntry[]
}

const BLOCS: BlocName[] = [
  '北海道', '東北', '北関東', '南関東', '東京',
  '北陸信越', '東海', '近畿', '中国', '四国', '九州',
]

type ChangeFilter = 'all' | 'changed'

export function ProportionalRankingTable({ entries }: Props) {
  const [bloc, setBloc] = useState<BlocName | '全国'>('全国')
  const [partyFilter, setPartyFilter] = useState<PartyId | '全政党'>('全政党')
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('changed')

  const parties = useMemo(() => {
    const ids = new Set(entries.map(e => e.partyId))
    return [...ids].sort()
  }, [entries])

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (bloc !== '全国' && e.bloc !== bloc) return false
      if (partyFilter !== '全政党' && e.partyId !== partyFilter) return false
      if (changeFilter === 'changed' && e.realElected === e.simElected) return false
      return true
    })
  }, [entries, bloc, partyFilter, changeFilter])

  const changedCount = useMemo(
    () => entries.filter(e => e.realElected !== e.simElected).length,
    [entries],
  )

  return (
    <section className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-700">
          📋 比例名簿 当選順位変化（実際 vs シミュ）
        </h2>
        <span className="text-xs text-gray-400">
          当落変化: {changedCount}件
        </span>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={bloc}
          onChange={e => setBloc(e.target.value as BlocName | '全国')}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="全国">ブロック: 全国</option>
          {BLOCS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          value={partyFilter}
          onChange={e => setPartyFilter(e.target.value as PartyId | '全政党')}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="全政党">政党: 全政党</option>
          {parties.map(p => (
            <option key={p} value={p}>{PARTIES[p]?.shortName ?? p}</option>
          ))}
        </select>

        <select
          value={changeFilter}
          onChange={e => setChangeFilter(e.target.value as ChangeFilter)}
          className="text-xs border border-gray-300 rounded px-2 py-1"
        >
          <option value="changed">当落変化あり のみ</option>
          <option value="all">全件表示</option>
        </select>

        <span className="text-xs text-gray-400 self-center">{filtered.length} 件</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">
          {changeFilter === 'changed' ? '当落変化なし（このシミュでは比例名簿の当落に影響なし）' : '対象データなし'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-right px-2 py-1 w-8">名簿</th>
                <th className="text-left px-2 py-1">氏名</th>
                <th className="text-left px-2 py-1 hidden sm:table-cell">政党</th>
                <th className="text-left px-2 py-1 hidden md:table-cell">ブロック</th>
                <th className="text-right px-2 py-1">実際の惜敗率</th>
                <th className="text-right px-2 py-1">シミュ惜敗率</th>
                <th className="text-center px-2 py-1">実際</th>
                <th className="text-center px-2 py-1">シミュ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const p = PARTIES[e.partyId]
                const fell = e.realElected && !e.simElected
                const rose = !e.realElected && e.simElected
                const rowClass = fell
                  ? 'bg-red-50'
                  : rose
                  ? 'bg-green-50'
                  : i % 2 === 0 ? 'bg-gray-50' : ''

                return (
                  <tr key={`${e.bloc}-${e.partyId}-${e.listRank}`} className={`border-t border-gray-100 ${rowClass}`}>
                    <td className="text-right px-2 py-1 text-gray-500 font-mono">{e.listRank}</td>
                    <td className="px-2 py-1 font-medium text-gray-800">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1 flex-shrink-0"
                        style={{ backgroundColor: p?.color ?? '#888' }}
                      />
                      {e.nameKanji}
                    </td>
                    <td className="px-2 py-1 text-gray-500 hidden sm:table-cell">
                      {p?.shortName ?? e.partyId}
                    </td>
                    <td className="px-2 py-1 text-gray-500 hidden md:table-cell">{e.bloc}</td>
                    <td className="text-right px-2 py-1 font-mono text-gray-600">
                      {e.realHaiseiritsu >= 1.0
                        ? '小選挙区当選'
                        : `${(e.realHaiseiritsu * 100).toFixed(1)}%`}
                    </td>
                    <td className="text-right px-2 py-1 font-mono text-gray-600">
                      {e.simHaiseiritsu === null
                        ? '小選挙区当選'
                        : e.simHaiseiritsu === 0
                        ? '—'
                        : `${(e.simHaiseiritsu * 100).toFixed(1)}%`}
                    </td>
                    <td className="text-center px-2 py-1">
                      <ElectedBadge elected={e.realElected} smdWin={e.realHaiseiritsu >= 1.0} />
                    </td>
                    <td className="text-center px-2 py-1">
                      <ElectedBadge elected={e.simElected} smdWin={e.simHaiseiritsu === null} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-400 space-y-0.5">
        <div><span className="inline-block w-3 h-3 bg-red-100 border border-red-200 mr-1" />実際は当選 → シミュでは落選</div>
        <div><span className="inline-block w-3 h-3 bg-green-100 border border-green-200 mr-1" />実際は落選 → シミュでは当選</div>
      </div>
    </section>
  )
}

function ElectedBadge({ elected, smdWin }: { elected: boolean; smdWin: boolean }) {
  if (smdWin) return <span className="text-blue-600 font-bold">小</span>
  if (elected) return <span className="text-green-600 font-bold">○</span>
  return <span className="text-gray-400">✗</span>
}
