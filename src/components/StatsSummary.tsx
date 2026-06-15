import type { SimulationResult } from '../types/election'
import { PARTIES } from '../data/parties'

interface StatsSummaryProps {
  result: SimulationResult
}

export function StatsSummary({ result }: StatsSummaryProps) {
  const { constituencies, proportionalRevivals } = result

  const totalCandidates = constituencies.reduce((s, r) => s + r.candidates.length, 0)
  const totalConst = constituencies.length

  // 比例復活者の政党別集計
  const revivalByParty = proportionalRevivals.reduce(
    (acc, rv) => {
      acc[rv.partyId] = (acc[rv.partyId] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // 平均候補者数
  const avgCandidates = (totalCandidates / totalConst).toFixed(1)

  // 最激戦区（最小惜敗率差）
  const closestRace = [...constituencies]
    .filter(r => r.runnerUp !== null)
    .sort((a, b) => {
      const ha = a.runnerUp!.finalScore / a.winner.finalScore
      const hb = b.runnerUp!.finalScore / b.winner.finalScore
      return hb - ha
    })[0]

  return (
    <section className="bg-gray-50 border-b border-gray-200 px-4 py-3">
      <h2 className="text-sm font-bold text-gray-700 mb-2">📊 統計サマリー</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="候補者総数" value={`${totalCandidates}人`} />
        <StatCard label="選挙区数" value={`${totalConst}区`} />
        <StatCard label="平均候補者数/区" value={`${avgCandidates}人`} />
        <StatCard label="比例復活当選" value={`${proportionalRevivals.length}人`} />
      </div>

      {closestRace && (
        <div className="mt-2 text-xs text-gray-500">
          最接戦: {closestRace.constituencyName}（惜敗率{' '}
          {((closestRace.runnerUp!.finalScore / closestRace.winner.finalScore) * 100).toFixed(2)}%）
        </div>
      )}

      {proportionalRevivals.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-600 mb-1 font-medium">比例復活 政党別</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(revivalByParty)
              .sort((a, b) => b[1] - a[1])
              .map(([partyId, count]) => {
                const p = PARTIES[partyId as keyof typeof PARTIES]
                return (
                  <span
                    key={partyId}
                    className="text-xs px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.shortName} {count}
                  </span>
                )
              })}
          </div>
        </div>
      )}
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded border border-gray-200 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-800">{value}</p>
    </div>
  )
}
