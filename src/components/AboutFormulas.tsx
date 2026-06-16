import { Link } from 'react-router-dom'

export function AboutFormulas() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-gray-300 hover:text-white text-sm">← 戻る</Link>
        <h1 className="text-sm font-bold">このページについて — 選挙区ランダムシミュレーター</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8 text-sm text-gray-800">

        {/* このシミュレーターについて */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-gray-600 pb-1 mb-3">
            このシミュレーターについて
          </h2>
          <p className="mb-3 text-gray-700 leading-relaxed">
            <strong>選挙区ランダムシミュレーター</strong>は、2026年衆院選（第51回衆議院議員総選挙）のデータを用いて、
            1,119人の小選挙区候補者をランダムに全国289選挙区へ再配置し、
            「もし違う選挙区に立候補していたら？」というシミュレーションを行うツールです。
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
            <li>実際の得票率・政治的地盤・年齢・地元度などをスコアに換算して当落を判定します</li>
            <li>比例代表の復活当選や名簿順位変化も実際の議席数データに基づいて計算します</li>
            <li>シミュレーションごとにスコアのウェイトがランダムに変動します（シードで再現可能）</li>
          </ul>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r text-xs text-blue-800">
            ※ このシミュレーターは仮想シナリオの可視化を目的としており、実際の選挙結果を予測するものではありません。
          </div>
        </section>

        {/* 各項目の見かた */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-gray-600 pb-1 mb-3">
            各項目の見かた
          </h2>

          <h3 className="font-bold text-gray-800 mt-4 mb-2">● 議席サマリー（上部）</h3>
          <table className="w-full border-collapse text-xs mb-4">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">項目</th>
                <th className="text-left px-3 py-2">意味</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-medium">小（小選挙区）</td>
                <td className="px-3 py-1.5 text-gray-600">シミュで当該選挙区の最高スコアを獲得した議席数</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-medium">比（比例代表）</td>
                <td className="px-3 py-1.5 text-gray-600">比例名簿の復活当選・単独当選を合算した議席数（実際の議席配分ベース）</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-medium">計</td>
                <td className="px-3 py-1.5 text-gray-600">小＋比の合計議席数</td>
              </tr>
            </tbody>
          </table>

          <h3 className="font-bold text-gray-800 mt-4 mb-2">● 地図パネル</h3>
          <table className="w-full border-collapse text-xs mb-4">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">操作</th>
                <th className="text-left px-3 py-2">動作</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5">都道府県タイルをクリック</td>
                <td className="px-3 py-1.5 text-gray-600">右パネルにその都道府県の選挙区一覧が表示される</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5">選挙区行をクリック</td>
                <td className="px-3 py-1.5 text-gray-600">全候補者の当落・氏名・政党・シミュ票数・惜敗率が展開表示される</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5">タイル色</td>
                <td className="px-3 py-1.5 text-gray-600">その都道府県で最多議席を獲得した政党の色</td>
              </tr>
            </tbody>
          </table>

          <h3 className="font-bold text-gray-800 mt-4 mb-2">● 選挙区ドリルダウン（当落アイコン）</h3>
          <table className="w-full border-collapse text-xs mb-4">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">アイコン</th>
                <th className="text-left px-3 py-2">意味</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono text-lg">◎</td>
                <td className="px-3 py-1.5 text-gray-600">当選（スコア1位）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-mono text-lg">△</td>
                <td className="px-3 py-1.5 text-gray-600">次点（スコア2位）</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono text-lg">−</td>
                <td className="px-3 py-1.5 text-gray-600">落選（スコア3位以下）</td>
              </tr>
            </tbody>
          </table>

          <h3 className="font-bold text-gray-800 mt-4 mb-2">● 比例名簿 当選順位変化テーブル</h3>
          <table className="w-full border-collapse text-xs mb-4">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">列</th>
                <th className="text-left px-3 py-2">意味</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-medium">名簿</td>
                <td className="px-3 py-1.5 text-gray-600">比例名簿での登載順位</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-medium">選挙区</td>
                <td className="px-3 py-1.5 text-gray-600">小選挙区立候補の場合はその選挙区名、比例単独の場合は「比例単独」と表示</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-medium">実際の惜敗率</td>
                <td className="px-3 py-1.5 text-gray-600">実際の選挙結果に基づく惜敗率（当選者比）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-medium">シミュ惜敗率</td>
                <td className="px-3 py-1.5 text-gray-600">シミュレーション結果に基づく惜敗率</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-medium">実際 / シミュ（当落）</td>
                <td className="px-3 py-1.5 text-gray-600">
                  <span className="inline-block px-1 rounded bg-blue-600 text-white mr-1">小選挙区当選</span>
                  <span className="inline-block px-1 rounded bg-green-600 text-white mr-1">比例復活</span>
                  <span className="inline-block px-1 rounded bg-purple-500 text-white mr-1">比例単独当選</span>
                  <span className="text-gray-400 mr-1">落選</span>
                </td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5">行の背景色（赤）</td>
                <td className="px-3 py-1.5 text-gray-600">実際は当選 → シミュでは落選に変化した候補者</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5">行の背景色（緑）</td>
                <td className="px-3 py-1.5 text-gray-600">実際は落選 → シミュでは当選に変化した候補者</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* スコア計算式 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            1. スコア計算式（FinalScore）
          </h2>
          <p className="mb-3 text-gray-600">
            各候補者の「この選挙区でどれだけ勝てるか」を 0〜1 の数値で表します。
            実際の選挙の得票率を基準に、地盤との相性・地元度・年齢・ランダム成分を加味します。
            <strong>各因子の重みはシミュレーション実行ごとにランダムに変動します。</strong>
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            FinalScore = (w₁×VoteRate + w₂×GroundBonus + w₃×AgeBonus + w₄×Random + w₅×HomeBonus + IncumbencyBonus) × VoteSplitPenalty
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">因子</th>
                <th className="text-right px-3 py-2">重み（実効範囲）</th>
                <th className="text-left px-3 py-2">内容</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono">VoteRate</td>
                <td className="text-right px-3 py-1.5">約 35〜59%</td>
                <td className="px-3 py-1.5">
                  第51回衆院選（2026年）の小選挙区実績得票率
                  （<code>votes ÷ 区内有効投票総数</code>）
                </td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-mono">GroundBonus</td>
                <td className="text-right px-3 py-1.5">約 12〜27%</td>
                <td className="px-3 py-1.5">選挙区の政治的傾向と政党の相性（voterTrend × 政党スコア）</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono">AgeBonus</td>
                <td className="text-right px-3 py-1.5">約 2〜11%</td>
                <td className="px-3 py-1.5">年齢補正（30〜60歳が最高、若すぎ/高齢は低下）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-mono">Random</td>
                <td className="text-right px-3 py-1.5">約 4〜24%</td>
                <td className="px-3 py-1.5">シミュレーションごとに変化するランダム成分（シードで再現可能）</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono">HomeBonus</td>
                <td className="text-right px-3 py-1.5">約 12〜27%</td>
                <td className="px-3 py-1.5">本来の選挙区との地理的近さ（同区 &gt; 同都道府県 &gt; 同ブロック &gt; 距離補正）</td>
              </tr>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-1.5 font-mono">IncumbencyBonus</td>
                <td className="text-right px-3 py-1.5">0〜20%（候補者依存）</td>
                <td className="px-3 py-1.5">現職 10〜20% / 元職 5〜15% / 新人 0%（他4因子から比例差引き）</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-3 py-1.5 font-mono">VoteSplitPenalty</td>
                <td className="text-right px-3 py-1.5">乗算</td>
                <td className="px-3 py-1.5">票割れ補正（同一政党・同一イデオロギーブロック内の競合数で減少）</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
            <strong>重みのランダム変動について:</strong><br/>
            各 w はシミュレーション実行のたびに変動し、合計が 1 になるよう正規化されます。<br/>
            raw 変動範囲: VoteRate 0.45〜0.55 / GroundBonus 0.15〜0.25 / AgeBonus 0.03〜0.10 / Random 0.05〜0.25 / HomeBonus 0.15〜0.25<br/>
            「実効範囲」は正規化後のおよその値です。<br/>
            <strong>IncumbencyBonus は ScoringParams のグローバルウェイトではなく、各候補者ごとに PRNG から個別に生成されます。</strong>
            IncumbencyBonus 分は VoteRate・GroundBonus・Random・HomeBonus から比例的に差し引かれるため、全ウェイトの合計は常に 1.0 に保たれます（AgeBonus は差引き対象外）。
          </div>

          {/* IncumbencyBonus 詳細 */}
          <div className="mt-4 bg-green-50 border border-green-200 rounded p-3 text-xs text-green-900">
            <strong>IncumbencyBonus（現職・元職補正）:</strong><br/><br/>
            現職（2026年当選: 小選挙区・比例復活含む）<br/>
            　→ IncumbencyBonus = 0.10〜0.20（乱数）<br/>
            元職（議員経験あり・2026年落選）<br/>
            　→ IncumbencyBonus = 0.05〜0.15（乱数）<br/>
            新人（議員経験なし）<br/>
            　→ IncumbencyBonus = 0<br/><br/>
            優先順位: 現職 &gt; 元職（当選した元職は現職扱い）。
            IncumbencyBonus 分は VoteRate・GroundBonus・HomeBonus・Random から比例的に差し引かれます。AgeBonus は差引き対象外です。
          </div>
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
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">日本保守党</td><td className="text-right px-3 py-1.5">0.90</td><td className="px-3 py-1.5">保守</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">参政党</td><td className="text-right px-3 py-1.5">0.80</td><td className="px-3 py-1.5">保守</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">日本維新の会</td><td className="text-right px-3 py-1.5">0.70</td><td className="px-3 py-1.5">保守</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">自由民主党</td><td className="text-right px-3 py-1.5">0.65</td><td className="px-3 py-1.5">保守</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">無所属</td><td className="text-right px-3 py-1.5">0.50</td><td className="px-3 py-1.5">その他</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">減税日本・ゆうこく連合</td><td className="text-right px-3 py-1.5">0.50</td><td className="px-3 py-1.5">その他</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">チームみらい</td><td className="text-right px-3 py-1.5">0.50</td><td className="px-3 py-1.5">中道</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">国民民主党</td><td className="text-right px-3 py-1.5">0.40</td><td className="px-3 py-1.5">中道</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">中道改革連合</td><td className="text-right px-3 py-1.5">0.30</td><td className="px-3 py-1.5">中道・革新</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">れいわ新選組</td><td className="text-right px-3 py-1.5">0.20</td><td className="px-3 py-1.5">革新</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">社民党</td><td className="text-right px-3 py-1.5">0.10</td><td className="px-3 py-1.5">革新</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">日本共産党</td><td className="text-right px-3 py-1.5">0.10</td><td className="px-3 py-1.5">革新</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-400 border border-gray-200 rounded p-2 bg-gray-50">
            ⚠️ 免責: 上記スコアは「実際の政党の政治的立場を公式に評価したもの」ではありません。
            シミュレーションの計算に使用する近似値であり、特定の政治的立場を推奨・批判するものでもありません。
          </p>
        </section>

        {/* HomeBonus 詳細 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            3. HomeBonus（地元補正）
          </h2>
          <p className="mb-3 text-gray-600">
            候補者が「本来の選挙区」からどれだけ離れた選挙区に配置されたかで決まります。
            地元に近いほど高いスコアが加算され、地盤の強さを反映します。
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            同じ選挙区（senkyokuId 一致） → HomeBonus = 1.0<br/>
            同じ都道府県                  → HomeBonus = 0.7<br/>
            同じ比例ブロック              → HomeBonus = 0.4<br/>
            それ以外                      → HomeBonus = max(0, 0.3 × (1 − 距離 km ÷ 2200))
          </div>
          <table className="w-full border-collapse text-xs mb-2">
            <thead>
              <tr className="bg-gray-100 text-gray-600">
                <th className="text-left px-3 py-2">配置状況</th>
                <th className="text-right px-3 py-2">HomeBonus</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">本来の選挙区と同一</td><td className="text-right px-3 py-1.5 font-bold text-green-700">1.00（最高）</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">同じ都道府県の別選挙区</td><td className="text-right px-3 py-1.5">0.70</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">同じ比例ブロックの別都道府県</td><td className="text-right px-3 py-1.5">0.40</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">別ブロック・距離 0 km</td><td className="text-right px-3 py-1.5">0.30</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">別ブロック・距離 1,100 km</td><td className="text-right px-3 py-1.5">0.15</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">別ブロック・距離 2,200 km 以上</td><td className="text-right px-3 py-1.5 text-red-700">0.00（最低）</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">
            ※ 距離はハバーサイン式（球面上の最短距離）で計算。日本の最大端間距離（稚内〜石垣）は約 3,000 km ですが、選挙区の緯度経度の範囲では最大 2,200 km 程度を想定しています。
          </p>
        </section>

        {/* 票割れ補正 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            4. 票割れ補正（VoteSplitPenalty）
          </h2>
          <p className="mb-3 text-gray-600">
            同じ選挙区に同一政党・同一イデオロギーブロックの候補者が複数配置された場合、
            票を食い合う（共食い）現象をスコアに反映します。
          </p>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r font-mono text-xs leading-relaxed mb-3">
            同一政党ペナルティ:<br/>
            　競合 0 人 → 1.00<br/>
            　競合 1 人 → 0.70〜0.80（乱数）<br/>
            　競合 2 人 → 0.50〜0.70（乱数）<br/>
            　競合 3 人以上 → 1 ÷ (競合数 + 1)<br/><br/>
            同一ブロックペナルティ = 1 − 0.05 × 同一ブロック競合数<br/><br/>
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
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">同一政党から 2 人立候補</td><td className="text-right px-3 py-1.5">×0.70〜0.80（乱数）</td></tr>
              <tr className="border-t border-gray-200"><td className="px-3 py-1.5">同一政党から 3 人立候補</td><td className="text-right px-3 py-1.5">×0.50〜0.70（乱数）</td></tr>
              <tr className="border-t border-gray-200 bg-gray-50"><td className="px-3 py-1.5">同一ブロック競合 2 人（別政党）</td><td className="text-right px-3 py-1.5">×0.90（軽微）</td></tr>
            </tbody>
          </table>
          <h3 className="font-bold text-gray-700 mt-3 mb-1">イデオロギーブロック</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded">保守: 日本保守党・参政・維新・自民</span>
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">中道: みらい・国民・中道改革</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">革新: 中道改革・れいわ・社民・共産</span>
            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">その他: 無所属・減税（ブロックペナルティなし）</span>
          </div>
        </section>

        {/* 惜敗率 */}
        <section>
          <h2 className="text-base font-bold text-gray-900 border-b-2 border-red-600 pb-1 mb-3">
            5. シミュレーション惜敗率
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
            6. 元選挙区支配度（死の組・強豪区スコア）
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
            7. データについて
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
