import { useState, useCallback, useEffect, useRef } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import type { SimulationResult, DeathGroup as DeathGroupType, ConstituencyRankingEntry, ProportionalRankingEntry } from './types/election'
import { loadAppData, type AppData } from './data/loader'
import { runSimulation } from './engine/runner'
import { Header } from './components/Header'
import { SeatSummary } from './components/SeatSummary'
import { DeathGroup } from './components/DeathGroup'
import { StatsSummary } from './components/StatsSummary'
import { ConstituencyList } from './components/ConstituencyList'
import { JapanMap } from './components/JapanMap'
import { ConstituencyRanking } from './components/ConstituencyRanking'
import { ProportionalRankingTable } from './components/ProportionalRankingTable'
import { AboutFormulas } from './components/AboutFormulas'

function RankingPage({ ranking, deathGroups }: { ranking: ConstituencyRankingEntry[]; deathGroups: DeathGroupType[] }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <Link to="/" className="text-sm text-blue-600 hover:underline">← メインページ</Link>
        <h1 className="text-base font-bold text-gray-700">🏆 全選挙区 強豪区ランキング</h1>
      </div>
      <ConstituencyRanking ranking={ranking} deathGroups={deathGroups} />
    </div>
  )
}

function ProportionalPage({ entries }: { entries: ProportionalRankingEntry[] }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <Link to="/" className="text-sm text-blue-600 hover:underline">← メインページ</Link>
        <h1 className="text-base font-bold text-gray-700">📊 比例名簿 当選順位変化</h1>
      </div>
      <ProportionalRankingTable entries={entries} />
    </div>
  )
}

type AppState =
  | { phase: 'loading' }
  | { phase: 'ready'; data: AppData }
  | { phase: 'running'; data: AppData }
  | { phase: 'done'; data: AppData; result: SimulationResult }
  | { phase: 'error'; message: string }

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'loading' })
  const [simulationCount, setSimulationCount] = useState(0)

  // StrictMode の二重発火でキャンセル済みの Promise が setState を呼ばないようにする
  useEffect(() => {
    let cancelled = false
    loadAppData()
      .then(data => { if (!cancelled) setState({ phase: 'ready', data }) })
      .catch(err => { if (!cancelled) setState({ phase: 'error', message: String(err) }) })
    return () => { cancelled = true }
  }, [])

  const handleSimulate = useCallback(() => {
    if (state.phase !== 'ready' && state.phase !== 'done') return
    const data = state.data
    setState({ phase: 'running', data })

    setTimeout(() => {
      try {
        const seed = Date.now()
        const result = runSimulation(
          data.candidates,
          data.constituencies,
          data.proportionalCandidates,
          data.proportionalSeats,
          seed,
        )
        setSimulationCount(n => n + 1)
        setState({ phase: 'done', data, result })
      } catch (err) {
        setState({ phase: 'error', message: String(err) })
      }
    }, 0)
  }, [state])

  // handleSimulate の最新版を ref で保持（auto-run effect の deps を state.phase のみに限定）
  const handleSimulateRef = useRef(handleSimulate)
  useEffect(() => { handleSimulateRef.current = handleSimulate })

  // 初回ロード完了時に自動シミュレーション実行
  const autoRunRef = useRef(false)
  useEffect(() => {
    if (state.phase === 'ready' && !autoRunRef.current) {
      autoRunRef.current = true
      handleSimulateRef.current()
    }
  }, [state.phase])

  const isLoading = state.phase === 'loading' || state.phase === 'ready' || state.phase === 'running'

  const mainContent = (
    <div className="min-h-screen bg-gray-50">
      <Header
        onSimulate={handleSimulate}
        isLoading={isLoading}
        simulationCount={simulationCount}
      />

      {(state.phase === 'loading' || state.phase === 'ready') && (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">データを読み込み中…</p>
        </div>
      )}

      {state.phase === 'error' && (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">エラー: {state.message}</p>
        </div>
      )}

      {state.phase === 'running' && (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">シミュレーション計算中…</p>
        </div>
      )}

      {state.phase === 'done' && (
        <main>
          <SeatSummary result={state.result} />
          <JapanMap result={state.result} />
          <DeathGroup groups={state.result.deathGroups} />
          <section className="bg-white border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-700 mb-2">詳細データページ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                to="/ranking"
                className="flex items-center gap-2 border border-gray-200 rounded p-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">🏆</span>
                <div>
                  <div className="text-sm font-medium text-gray-800">全選挙区 強豪区ランキング</div>
                  <div className="text-xs text-gray-500">289区を強豪スコアでランキング</div>
                </div>
              </Link>
              <Link
                to="/proportional"
                className="flex items-center gap-2 border border-gray-200 rounded p-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">📊</span>
                <div>
                  <div className="text-sm font-medium text-gray-800">比例名簿 当選順位変化</div>
                  <div className="text-xs text-gray-500">比例復活の当落変化を一覧表示</div>
                </div>
              </Link>
            </div>
          </section>
          <StatsSummary result={state.result} />
          <ConstituencyList results={state.result.constituencies} />
        </main>
      )}
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={mainContent} />
      <Route path="/about" element={<AboutFormulas />} />
      <Route path="/ranking" element={
        state.phase === 'done'
          ? <RankingPage ranking={state.result.constituencyRanking} deathGroups={state.result.deathGroups} />
          : <Navigate to="/" replace />
      } />
      <Route path="/proportional" element={
        state.phase === 'done'
          ? <ProportionalPage entries={state.result.proportionalRankingChanges} />
          : <Navigate to="/" replace />
      } />
    </Routes>
  )
}
