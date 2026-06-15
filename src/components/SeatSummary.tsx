import type { SimulationResult, PartyId } from '../types/election'
import { PARTY_LIST } from '../data/parties'

interface SeatSummaryProps {
  result: SimulationResult
}

const MAJORITY = 233

export function SeatSummary({ result }: SeatSummaryProps) {
  const { seatsByParty } = result
  const totalSeats = Object.values(seatsByParty).reduce((s, p) => s + p.total, 0)

  const sortedParties = PARTY_LIST
    .filter(p => (seatsByParty[p.id]?.total ?? 0) > 0)
    .sort((a, b) => (seatsByParty[b.id]?.total ?? 0) - (seatsByParty[a.id]?.total ?? 0))

  const ldpTotal = seatsByParty['ldp']?.total ?? 0
  const coalitionTotal = (['ldp', 'sansei'] as PartyId[]).reduce(
    (s, id) => s + (seatsByParty[id]?.total ?? 0), 0
  )
  const hasMajority = coalitionTotal >= MAJORITY

  return (
    <section className="bg-white border-b border-gray-200 px-4 py-3">
      {/* 議席棒グラフ */}
      <div className="flex h-8 w-full rounded overflow-hidden mb-3">
        {sortedParties.map(p => {
          const seats = seatsByParty[p.id]?.total ?? 0
          const pct = (seats / totalSeats) * 100
          return (
            <div
              key={p.id}
              style={{ width: `${pct}%`, backgroundColor: p.color }}
              title={`${p.name}: ${seats}議席`}
              className="flex items-center justify-center text-white text-xs font-bold overflow-hidden"
            >
              {pct >= 3 ? seats : ''}
            </div>
          )
        })}
      </div>

      {/* 過半数ライン */}
      <div className="relative h-1 mb-3">
        <div
          className="absolute top-0 w-0.5 h-4 bg-gray-800"
          style={{ left: `${(MAJORITY / totalSeats) * 100}%` }}
        />
        <span
          className="absolute text-xs text-gray-500 -translate-x-1/2"
          style={{ left: `${(MAJORITY / totalSeats) * 100}%`, top: '1rem' }}
        >
          過半数 {MAJORITY}
        </span>
      </div>

      {/* 政党別議席数テーブル */}
      <div className="flex flex-wrap gap-2 mt-5">
        {sortedParties.map(p => {
          const s = seatsByParty[p.id]
          return (
            <div
              key={p.id}
              className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1 text-sm"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-medium text-gray-800">{p.shortName}</span>
              <span className="font-bold text-gray-900">{s?.total ?? 0}</span>
              <span className="text-gray-400 text-xs">
                ({s?.smd ?? 0}+{s?.pr ?? 0})
              </span>
            </div>
          )
        })}
      </div>

      {/* 過半数バッジ */}
      <div className={`mt-2 text-sm font-bold ${hasMajority ? 'text-red-600' : 'text-blue-600'}`}>
        {hasMajority
          ? `自民 ${ldpTotal}議席 — 過半数確保（連立 ${coalitionTotal}議席）`
          : `自民 ${ldpTotal}議席 — 過半数割れ（連立 ${coalitionTotal}議席）`}
      </div>

      {/* 制約説明 */}
      <p className="mt-2 text-xs text-gray-400">
        ※ 比例代表議席数は第51回衆院選（2026年）の実際の選挙結果を固定値として使用しています。
        小選挙区の結果はシミュレーションごとに変わりますが、比例議席の総数は常に一定です。
      </p>
    </section>
  )
}
