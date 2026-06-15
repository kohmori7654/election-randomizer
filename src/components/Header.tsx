import { Link } from 'react-router-dom'

interface HeaderProps {
  onSimulate: () => void
  isLoading: boolean
  simulationCount: number
}

export function Header({ onSimulate, isLoading, simulationCount }: HeaderProps) {
  return (
    <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div>
        <h1 className="text-lg font-bold tracking-tight">
          第51回衆院選シミュレーター
        </h1>
        <p className="text-gray-400 text-xs mt-0.5">
          2026年2月8日施行 · 小選挙区1,119人をランダム配置 ·{' '}
          <Link to="/about" className="hover:text-white underline">計算式について</Link>
        </p>
      </div>
      <div className="flex items-center gap-3">
        {simulationCount > 0 && (
          <span className="text-gray-400 text-sm">
            {simulationCount}回目
          </span>
        )}
        <button
          onClick={onSimulate}
          disabled={isLoading}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold px-5 py-2 rounded transition-colors text-sm"
        >
          {isLoading ? '計算中…' : 'シミュレーション再実行'}
        </button>
      </div>
    </header>
  )
}
