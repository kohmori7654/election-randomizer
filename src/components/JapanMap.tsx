import { useState, useEffect, useRef, useMemo } from 'react'
import * as d3geo from 'd3-geo'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { SimulationResult, ConstituencyResult, PartyId } from '../types/election'
import { PARTIES } from '../data/parties'

interface JapanMapProps {
  result: SimulationResult
}

interface PrefStats {
  prefName: string
  constituencies: ConstituencyResult[]
  dominantParty: PartyId
  partyCounts: Partial<Record<PartyId, number>>
}

interface GeoFeature {
  type: 'Feature'
  properties: { id: number; nam_ja: string; nam: string }
  geometry: d3geo.GeoGeometryObjects
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

export function JapanMap({ result }: JapanMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [features, setFeatures] = useState<GeoFeature[]>([])
  const [selectedPref, setSelectedPref] = useState<string | null>(null)
  const [hoveredPref, setHoveredPref] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)
  const [selectedConstituency, setSelectedConstituency] = useState<ConstituencyResult | null>(null)

  const W = 600
  const H = 700

  useEffect(() => {
    fetch('./data/japan.topojson')
      .then(r => r.json())
      .then((topo: Topology) => {
        const collection = topojson.feature(
          topo,
          (topo.objects as Record<string, GeometryCollection>)['japan'],
        ) as unknown as { features: GeoFeature[] }
        setFeatures(collection.features)
      })
      .catch(console.error)
  }, [])

  const { pathGen } = useMemo(() => {
    if (features.length === 0) return { projection: null, pathGen: null }
    const proj = d3geo.geoMercator().fitSize([W, H], {
      type: 'FeatureCollection',
      features,
    } as d3geo.ExtendedFeatureCollection)
    const gen = d3geo.geoPath().projection(proj)
    return { pathGen: gen }
  }, [features])

  const prefStats = useMemo(() => buildPrefStats(result), [result])

  const selectedPrefStats = selectedPref ? prefStats.get(selectedPref) : null

  function handlePrefClick(nam_ja: string) {
    setSelectedPref(prev => (prev === nam_ja ? null : nam_ja))
    setSelectedConstituency(null)
  }

  function handleMouseMove(e: React.MouseEvent<SVGPathElement>, nam_ja: string) {
    const stats = prefStats.get(nam_ja)
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
    setTooltip({ x, y, text: `${nam_ja} — ${party.shortName} 優勢 (${wins})` })
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">
        都道府県別結果マップ
        <span className="text-sm font-normal text-gray-500 ml-2">
          （クリックで選挙区ドリルダウン）
        </span>
      </h2>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* SVG 地図 */}
        <div className="relative flex-shrink-0">
          <svg
            ref={svgRef}
            width={W}
            height={H}
            className="border border-gray-100 rounded"
            onMouseLeave={() => { setHoveredPref(null); setTooltip(null) }}
          >
            {pathGen && features.map(f => {
              const nam = f.properties.nam_ja
              const stats = prefStats.get(nam)
              const party = stats ? PARTIES[stats.dominantParty] : null
              const baseColor = party?.color ?? '#ccc'
              const isSelected = selectedPref === nam
              const isHovered = hoveredPref === nam

              return (
                <path
                  key={f.properties.id}
                  d={pathGen(f as unknown as d3geo.GeoPermissibleObjects) ?? undefined}
                  fill={baseColor}
                  fillOpacity={isSelected ? 1.0 : isHovered ? 0.85 : 0.65}
                  stroke={isSelected ? '#000' : '#fff'}
                  strokeWidth={isSelected ? 1.5 : 0.5}
                  style={{ cursor: 'pointer', transition: 'fill-opacity 0.1s' }}
                  onClick={() => handlePrefClick(nam)}
                  onMouseEnter={() => setHoveredPref(nam)}
                  onMouseMove={e => handleMouseMove(e, nam)}
                  onMouseLeave={() => { setHoveredPref(null); setTooltip(null) }}
                />
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
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
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
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: party.color }}
                        />
                        <span className="text-sm font-medium text-gray-700 flex-1">
                          {r.constituencyName}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded text-white font-medium flex-shrink-0"
                          style={{ backgroundColor: party.color }}
                        >
                          {party.shortName}
                        </span>
                      </div>

                      {/* ドリルダウン詳細 */}
                      {isSelected && (
                        <div className="mt-2 ml-4 border-l-2 pl-2 space-y-1" style={{ borderColor: party.color }}>
                          <p className="text-xs text-gray-500">当選者</p>
                          <p className="text-sm font-bold text-gray-800">
                            {r.winner.nameKanji}
                            <span className="font-normal text-gray-500 ml-1 text-xs">
                              ({r.winner.status} / スコア {r.winner.finalScore.toFixed(3)})
                            </span>
                          </p>
                          {r.runnerUp && (
                            <>
                              <p className="text-xs text-gray-400 mt-1">次点</p>
                              <p className="text-xs text-gray-600">
                                {r.runnerUp.nameKanji}
                                <span className="text-gray-400 ml-1">
                                  [{PARTIES[r.runnerUp.partyId]?.shortName}]
                                </span>
                                <span className="text-gray-400 ml-1">
                                  惜敗率 {(r.runnerUp.finalScore / r.winner.finalScore * 100).toFixed(1)}%
                                </span>
                              </p>
                            </>
                          )}
                        </div>
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
                style={{ backgroundColor: p.color, opacity: 0.65 }}
              />
              {p.shortName}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
