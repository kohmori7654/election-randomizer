import { Link } from 'react-router-dom'

export function AboutFormulas() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-gray-300 hover:text-white text-sm">← 戻る</Link>
        <h1 className="text-sm font-bold">計算式について — 衆院選2026シミュレーター</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 text-sm text-gray-800">

        {/* スコア計算式 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            1. スコア計算式（FinalScore）
          </h2>
          <p className="mb-3 text-gray-600">
            各候補者の「この選挙区でどれだけ勝てるか」を 0〜1 の数値で表します。
            実際の選挙の得票率を基準に、選挙区の特性・ランダム成分を加味します。
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            FinalScore = (w₁ × VoteRate + w₂ × GroundBonus + w₃ × AgeBonus + w₄ × Random) × VoteSplitPenalty
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">因子</th>
                <th className="text-right px-3 py-2">重み</th>
                <th className="text-left px-3 py-2">内容</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono">VoteRate</td>
                <td className="text-right px-3 py-1.5">40%</td>
                <td className="px-3 py-1.5">実際の得票率（<code>originalVoteRate</code>）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-mono">GroundBonus</td>
                <td className="text-right px-3 py-1.5">25%</td>
                <td className="px-3 py-1.5">選挙区の政治的傾向と政党の相性（voterTrend × 政党スコア）</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono">AgeBonus</td>
                <td className="text-right px-3 py-1.5">10%</td>
                <td className="px-3 py-1.5">年齢補正（30〜60歳が最高、若すぎ/高齢は低下）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-mono">Random</td>
                <td className="text-right px-3 py-1.5">25%</td>
                <td className="px-3 py-1.5">シミュレーションごとに変化するランダム成分（シードで再現可能）</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono">VoteSplitPenalty</td>
                <td className="text-right px-3 py-1.5">乗算</td>
                <td className="px-3 py-1.5">票割れ補正（同一政党・同一イデオロギーブロック内の競合数で減少）</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">
            ※ 各因子は 0〜1 に正規化した後、重み付きで合算。最終スコアも 0〜1 の範囲に収まります。
          </p>
        </section>

        {/* GroundBonus 詳細 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            2. GroundBonus（地盤補正）のデータ根拠
          </h2>
          <p className="mb-3 text-gray-600">
            GroundBonus は「政党の政治的立場」と「選挙区の有権者傾向」の近さで決まります。
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            GroundBonus = 1 − |PARTY_POLITICAL_SCORE[政党] − voterTrend[選挙区]|
          </div>
          <h3 className="font-bold text-gray-700 mt-4 mb-2">選挙区の有権者傾向（voterTrend）</h3>
          <p className="text-gray-600 mb-2">
            実際の選挙結果から逆算した「選挙区の政治的重心」。
            各候補者の得票数を重みとして PARTY_POLITICAL_SCORE の加重平均で算出します。
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            voterTrend = Σ(候補者得票数 × 政党スコア) ÷ Σ(候補者得票数)
          </div>
          <p className="text-xs text-gray-500 mb-4">
            保守系候補が多く票を集めた選挙区ほど 1.0 に近づきます。実際のデータ範囲は約 0.35〜0.76。
          </p>
          <h3 className="font-bold text-gray-700 mt-4 mb-2">各政党の政治スコア（PARTY_POLITICAL_SCORE）</h3>
          <p className="text-gray-600 mb-2">
            0（左）〜1（右）のスペクトラム上に各政党を配置したスコア。
            一般的なイデオロギー配置のコンセンサスに基づく設計者の主観値であり、
            公式調査・学術データに基づくものではありません。
          </p>
          <table className="w-full border-collapse text-xs mb-3">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">政党</th>
                <th className="text-right px-3 py-2">スコア</th>
                <th className="text-left px-3 py-2">位置づけ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">自由民主党</td><td className="text-right px-3 py-1.5">0.80</td><td className="px-3 py-1.5">保守</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">参政党</td><td className="text-right px-3 py-1.5">0.70</td><td className="px-3 py-1.5">保守</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">減税日本・ゆうこく連合</td><td className="text-right px-3 py-1.5">0.60</td><td className="px-3 py-1.5">保守系改革</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">日本維新の会</td><td className="text-right px-3 py-1.5">0.50</td><td className="px-3 py-1.5">改革中道</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">NHK党</td><td className="text-right px-3 py-1.5">0.50</td><td className="px-3 py-1.5">中道</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">無所属</td><td className="text-right px-3 py-1.5">0.50</td><td className="px-3 py-1.5">中立</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">チームみらい</td><td className="text-right px-3 py-1.5">0.45</td><td className="px-3 py-1.5">中道</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">国民民主党</td><td className="text-right px-3 py-1.5">0.40</td><td className="px-3 py-1.5">中道</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">中道改革連合</td><td className="text-right px-3 py-1.5">0.30</td><td className="px-3 py-1.5">中道革新</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">れいわ新選組</td><td className="text-right px-3 py-1.5">0.20</td><td className="px-3 py-1.5">革新</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">社民党</td><td className="text-right px-3 py-1.5">0.20</td><td className="px-3 py-1.5">革新</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">日本共産党</td><td className="text-right px-3 py-1.5">0.10</td><td className="px-3 py-1.5">革新</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-400 border border-gray-200 rounded p-2 bg-gray-50">
            ⚠️ 免責: 上記スコアは「実際の政党の政治的立場を公式に評価したもの」ではありません。
            シミュレーションの計算に使用する近似値であり、特定の政治的立場を推奨・批判するものでもありません。
          </p>
        </section>

        {/* 票割れ補正 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            3. 票割れ補正（VoteSplitPenalty）
          </h2>
          <p className="mb-3 text-gray-600">
            同じ選挙区に同一政党・同一イデオロギーブロックの候補者が複数配置された場合、
            票を食い合う（共食い）現象をスコアに反映します。
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            同一政党ペナルティ = 1 ÷ (同一政党の競合数 + 1)<br/>
            同一ブロックペナルティ = 1 − 0.05 × 同一ブロックの競合数<br/>
            VoteSplitPenalty = 同一政党ペナルティ × 同一ブロックペナルティ
          </div>
          <table className="w-full border-collapse text-xs mb-2">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">状況</th>
                <th className="text-right px-3 py-2">ペナルティ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">単独立候補</td><td className="text-right px-3 py-1.5">×1.00（影響なし）</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">同一政党から2人立候補</td><td className="text-right px-3 py-1.5">×0.50（半減）</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">同一政党から3人立候補</td><td className="text-right px-3 py-1.5">×0.33（1/3）</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">同一ブロック競合2人（別政党）</td><td className="text-right px-3 py-1.5">×0.90（軽微）</td></tr>
            </tbody>
          </table>
          <h3 className="font-bold text-gray-700 mt-3 mb-1">イデオロギーブロック</h3>
          <div className="flex gap-3 text-xs">
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">保守: 自民・参政・減税・NHK</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">中道: 維新・国民・みらい・無所属</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">革新: 中道改革・共産・れいわ・社民</span>
          </div>
        </section>

        {/* 惜敗率 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            4. シミュレーション惜敗率
          </h2>
          <p className="mb-3 text-gray-600">
            比例復活当選の可否を決定する指標です。実際の選挙の票数ではなく、
            シミュレーションのスコアから計算します。
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs mb-3">
            シミュ惜敗率 = 落選者の FinalScore ÷ 当選者の FinalScore × 100 (%)
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">条件</th>
                <th className="text-left px-3 py-2">結果</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5">惜敗率 ≥ 10%<br/>かつ比例名簿に登載</td>
                <td className="px-3 py-1.5 text-green-700 font-medium">比例復活資格あり（名簿順位でソート後、上位 N 枠が当選）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5">惜敗率 &lt; 10%</td>
                <td className="px-3 py-1.5 text-red-700">供託物没収相当 → 比例復活資格なし</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5">小選挙区当選</td>
                <td className="px-3 py-1.5">比例名簿から除外（重複当選なし）</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500">
            ※ 比例議席数は第51回衆院選（2026年）の実際の結果をハードコードしています（ドント式は再計算しません）。
          </p>
        </section>

        {/* 支配度 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            5. 元選挙区支配度（死の組・強豪区スコア）
          </h2>
          <p className="mb-3 text-gray-600">
            各候補者が「実際の選挙区でどれだけ圧倒的に強かったか」を示す指標です。
            シャッフル前の実際の選挙結果から計算します。
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            【当選者】支配度 = 当選者の得票率 ÷ 次点者の得票率　（結果: &gt;1.0）<br/>
            【落選者】支配度 = 自分の得票率 ÷ 当選者の得票率　（結果: 0〜1.0 = 惜敗率に相当）
          </div>
          <h3 className="font-bold text-gray-700 mt-3 mb-1">強豪区スコアの計算式</h3>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            強豪スコア = 上位3候補の平均支配度 × （強豪候補の人数 ÷ 3）<br/><br/>
            強豪候補 = 当選者で支配度 &gt; 1.2 (20%以上差をつけて勝利)<br/>
            　　　　　または 落選者で惜敗率 &gt; 80% (僅差の落選)
          </div>
          <p className="text-xs text-gray-500">
            全289区をこのスコアで降順ソートしたのが「全選挙区強豪区ランキング」。
            上位10区が「死の組」です。
            計算式の詳細・バグ修正の経緯は
            <a href="/election_randomizer/dominance_explanation.html" target="_blank" className="text-blue-600 hover:underline ml-1">
              支配度計算式解説 →
            </a>
          </p>
        </section>

        {/* データ */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            6. データについて
          </h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">項目</th>
                <th className="text-left px-3 py-2">内容</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-medium">対象選挙</td>
                <td className="px-3 py-1.5">第51回衆議院議員総選挙（2026年2月8日執行）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-medium">候補者数</td>
                <td className="px-3 py-1.5">小選挙区候補 1,119人（比例単独候補は対象外）</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-medium">得票率ソース</td>
                <td className="px-3 py-1.5">go2senkyo（選挙ドットコム）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-medium">比例議席数</td>
                <td className="px-3 py-1.5">実際の確定結果をハードコード（全シミュレーション共通）</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div className="pt-4 border-t border-gray-200 text-center">
          <Link to="/" className="text-blue-600 hover:underline text-sm">
            ← シミュレーターに戻る
          </Link>
        </div>
      </main>
    </div>
  )
}
