import { useState, useMemo, useRef, useEffect, memo } from 'react'
import type { SimulationResult, ConstituencyResult, PartyId, SimCandidate } from '../types/election'
import { PARTIES } from '../data/parties'
import { PREFECTURE_GRID } from '../data/prefectureGrid'

const CELL = 44
const GAP = 2
const STEP = CELL + GAP

interface JapanMapProps {
  result: SimulationResult
}

interface PrefStats {
  prefName: string
  constituencies: ConstituencyResult[]
  dominantParty: PartyId
  partyCounts: Partial<Record<PartyId, number>>
}

function buildPrefStats(result: SimulationResult): Map<string, PrefStats> {
  const map = new Map<string, PrefStats>()

  for (const r of result.constituencies) {
    const pref = r.prefecture
    if (!map.has(pref)) {
      map.set(pref, {
        prefName: pref,
        constituencies: [],
        dominantParty: 'ind',
        partyCounts: {},
      })
    }
    const stats = map.get(pref)!
    stats.constituencies.push(r)
    stats.partyCounts[r.winner.partyId] = (stats.partyCounts[r.winner.partyId] ?? 0) + 1
  }

  for (const stats of map.values()) {
    let maxCount = 0
    let dominant: PartyId = 'ind'
    for (const [pid, cnt] of Object.entries(stats.partyCounts) as [PartyId, number][]) {
      if (cnt > maxCount) {
        maxCount = cnt
        dominant = pid
      }
    }
    stats.dominantParty = dominant
  }

  return map
}

// 九州が負の offsetX を持つため、最小 x を求めて全体をシフトする余白を確保する
const LEFT_MARGIN = Math.max(0, -Math.min(...PREFECTURE_GRID.map(p => p.col * STEP + (p.offsetX ?? 0))))
const VIEW_W = Math.max(...PREFECTURE_GRID.map(p =>
  p.col * STEP + (p.offsetX ?? 0) + (p.w ?? 1) * CELL + ((p.w ?? 1) - 1) * GAP
)) + LEFT_MARGIN
const VIEW_H = Math.max(...PREFECTURE_GRID.map(p => p.row * STEP + (p.h ?? 1) * CELL + ((p.h ?? 1) - 1) * GAP))

export function JapanMap({ result }: JapanMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedPref, setSelectedPref] = useState<string | null>(null)
  const [hoveredPref, setHoveredPref] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [selectedConstituency, setSelectedConstituency] = useState<ConstituencyResult | null>(null)

  const prefStats = useMemo(() => buildPrefStats(result), [result])
  const selectedPrefStats = selectedPref ? prefStats.get(selectedPref) : null

  useEffect(() => {
    const top = result.constituencyRanking[0]
    if (!top) return
    const topResult = result.constituencies.find(c => c.constituencyId === top.constituencyId)
    if (!topResult) return
    setSelectedPref(topResult.prefecture)
    setSelectedConstituency(topResult)
  }, [result])

  function handlePrefClick(prefName: string) {
    setSelectedPref(prev => (prev === prefName ? null : prefName))
    setSelectedConstituency(null)
  }

  function updateTooltip(e: React.MouseEvent<SVGElement>, prefName: string) {
    const stats = prefStats.get(prefName)
    if (!stats) return
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    const x = e.clientX - svgRect.left
    const y = e.clientY - svgRect.top
    const party = PARTIES[stats.dominantParty]
    const wins = Object.entries(stats.partyCounts)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([pid, cnt]) => `${PARTIES[pid as PartyId]?.shortName ?? pid}:${cnt}`)
      .join(' / ')
    setTooltip({ x, y, text: `${prefName} — ${party.shortName} 優勢 (${wins})` })
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">
        都道府県別結果マップ
        <span className="text-sm font-normal text-gray-500 ml-2">
          （クリックで選挙区の各結果表示）
        </span>
      </h2>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* SVG デフォルメ地図 */}
        <div className="relative flex-shrink-0 w-full lg:w-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="w-full max-w-xl border border-gray-100 rounded"
            onMouseLeave={() => { setHoveredPref(null); setTooltip(null) }}
          >
            {PREFECTURE_GRID.map(({ name, short, row, col, w = 1, h = 1, offsetX = 0 }) => {
              const x = col * STEP + offsetX + LEFT_MARGIN
              const y = row * STEP
              const cellW = w * CELL + (w - 1) * GAP
              const cellH = h * CELL + (h - 1) * GAP
              const stats = prefStats.get(name)
              const party = stats ? PARTIES[stats.dominantParty] : null
              const fillColor = party?.color ?? '#ccc'
              const isSelected = selectedPref === name
              const isHovered = hoveredPref === name
              const fontSize = short.length >= 3 ? 11 : 13

              return (
                <g
                  key={name}
                  transform={`translate(${x}, ${y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePrefClick(name)}
                  onMouseEnter={e => { setHoveredPref(name); updateTooltip(e, name) }}
                  onMouseMove={e => updateTooltip(e, name)}
                  onMouseLeave={() => { setHoveredPref(null); setTooltip(null) }}
                >
                  <rect
                    width={cellW}
                    height={cellH}
                    rx={3}
                    fill={fillColor}
                    fillOpacity={isSelected ? 1.0 : isHovered ? 0.9 : 0.75}
                    stroke={isSelected ? '#111' : isHovered ? '#555' : '#fff'}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x={cellW / 2}
                    y={cellH / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={fontSize}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    fill="#fff"
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    {short}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* ツールチップ */}
          {tooltip && (
            <div
              className="absolute pointer-events-none bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10"
              style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
            >
              {tooltip.text}
            </div>
          )}
        </div>

        {/* 右パネル：選択した都道府県の詳細 */}
        <div className="flex-1 min-w-0">
          {!selectedPref && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm py-8">
              都道府県をクリックすると<br />選挙区一覧が表示されます
            </div>
          )}

          {selectedPrefStats && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800 text-lg">{selectedPref}</h3>
                <button
                  className="text-gray-400 hover:text-gray-600 text-sm"
                  onClick={() => { setSelectedPref(null); setSelectedConstituency(null) }}
                >
                  ✕ 閉じる
                </button>
              </div>

              {/* 政党別議席サマリー */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(selectedPrefStats.partyCounts)
                  .sort((a, b) => (b[1] as number) - (a[1] as number))
                  .map(([pid, cnt]) => {
                    const party = PARTIES[pid as PartyId]
                    return (
                      <span
                        key={pid}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-white text-xs font-medium"
                        style={{ backgroundColor: party.color }}
                      >
                        {party.shortName} {cnt}
                      </span>
                    )
                  })}
              </div>

              {/* 選挙区リスト */}
              <div className="space-y-1 max-h-[560px] overflow-y-auto">
                {selectedPrefStats.constituencies.map(r => {
                  const party = PARTIES[r.winner.partyId]
                  const isSelected = selectedConstituency?.constituencyId === r.constituencyId
                  return (
                    <div
                      key={r.constituencyId}
                      className={`rounded p-2 cursor-pointer border transition-colors ${
                        isSelected
                          ? 'border-gray-400 bg-gray-50'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedConstituency(isSelected ? null : r)}
                    >
                      {/* 選挙区行: 常時表示（当選者氏名＋政党バッジ） */}
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: party.color }}
                        />
                        <span className="text-sm font-medium text-gray-700 flex-1">
                          {r.constituencyName}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {r.winner.nameKanji}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded text-white font-medium flex-shrink-0"
                          style={{ backgroundColor: party.color }}
                        >
                          {party.shortName}
                        </span>
                      </div>

                      {/* ドリルダウン: 全候補者テーブル */}
                      {isSelected && (
                        <ConstituencyDrilldown r={r} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 凡例 */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">凡例（優勢政党）</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(PARTIES).map(p => (
            <span key={p.id} className="inline-flex items-center gap-1 text-xs text-gray-700">
              <span
                className="w-3 h-3 rounded-sm inline-block"
                style={{ backgroundColor: p.color, opacity: 0.75 }}
              />
              {p.shortName}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/** 選挙区ドリルダウン: 全候補者をテーブルで表示 */
const ConstituencyDrilldown = memo(function ConstituencyDrilldown({ r }: { r: ConstituencyResult }) {
  const winnerScore = r.winner.finalScore

  function calcSimVotesLocal(candidates: SimCandidate[]): Map<number, number> {
    const totalScore = candidates.reduce((s, c) => s + c.finalScore, 0)
    const totalRealVotes = candidates.reduce((s, c) => s + c.votes, 0)
    const map = new Map<number, number>()
    for (const c of candidates) {
      const ratio = totalScore > 0 ? c.finalScore / totalScore : 1 / candidates.length
      map.set(c.id, Math.round(ratio * totalRealVotes))
    }
    return map
  }

  const simVotes = calcSimVotesLocal(r.candidates)
  const winnerParty = PARTIES[r.winner.partyId]

  return (
    <div className="mt-2 ml-2 border-l-2 pl-2" style={{ borderColor: winnerParty.color }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-200">
              <th className="text-center px-1 py-1">当落</th>
              <th className="text-left px-1 py-1">氏名</th>
              <th className="text-left px-1 py-1">政党</th>
              <th className="text-right px-1 py-1">シミュ票数</th>
              <th className="text-right px-1 py-1">惜敗率</th>
              <th className="text-right px-1 py-1 hidden sm:table-cell">スコア</th>
            </tr>
          </thead>
          <tbody>
            {r.candidates.map((c, i) => {
              const isWinner = c.id === r.winner.id
              const party = PARTIES[c.partyId]
              const haiseiritsu = isWinner
                ? '—'
                : `${(c.finalScore / winnerScore * 100).toFixed(1)}%`
              const icon = i === 0 ? '◎' : i === 1 ? '△' : '−'
              return (
                <tr
                  key={c.id}
                  className={`border-t border-gray-100 ${isWinner ? 'font-semibold bg-yellow-50' : ''}`}
                >
                  <td className="text-center px-1 py-1 text-gray-500">{icon}</td>
                  <td className="px-1 py-1 text-gray-800">{c.nameKanji}</td>
                  <td className="px-1 py-1">
                    <span
                      className="inline-block px-1 rounded text-white text-xs"
                      style={{ backgroundColor: party?.color ?? '#888' }}
                    >
                      {party?.shortName ?? c.partyId}
                    </span>
                  </td>
                  <td className="text-right px-1 py-1 font-mono text-gray-600">
                    {(simVotes.get(c.id) ?? 0).toLocaleString()}
                  </td>
                  <td className="text-right px-1 py-1 font-mono text-gray-600">{haiseiritsu}</td>
                  <td className="text-right px-1 py-1 font-mono text-gray-400 hidden sm:table-cell">
                    {c.finalScore.toFixed(3)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
})
