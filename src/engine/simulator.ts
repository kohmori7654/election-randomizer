import type { Candidate, Constituency } from '../types/election'

/** Fisher-Yates インプレースシャッフル */
function fisherYates<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/** mulberry32: 32bit 疑似乱数生成器 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let z = s
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fisher-Yates シャッフル。seed 指定で再現性あり（mulberry32 PRNG）。
 * seed 未指定時は Math.random() を使用。
 */
export function shuffleCandidates(candidates: Candidate[], seed?: number): Candidate[] {
  const arr = [...candidates]
  const rand = seed !== undefined ? mulberry32(seed) : Math.random
  fisherYates(arr, rand)
  return arr
}

/**
 * シャッフル済み候補者を選挙区に均等配分する。
 * 先頭から順番に選挙区へラウンドロビン的に割り当てる。
 * 返り値: constituencyId → 候補者配列
 */
export function assignCandidates(
  candidates: Candidate[],
  constituencies: Constituency[],
): Record<number, Candidate[]> {
  const result: Record<number, Candidate[]> = {}
  for (const c of constituencies) {
    result[c.id] = []
  }

  const n = constituencies.length
  for (let i = 0; i < candidates.length; i++) {
    const constituencyId = constituencies[i % n].id
    result[constituencyId].push(candidates[i])
  }

  return result
}

/**
 * 同一政党重複を解消するためのスワップ後処理。
 * 同一選挙区に同じ政党が2人以上いる場合、その候補者をその政党のいない他の選挙区と交換する。
 * 2〜3パスでほぼ全件解消できる（実測: 205件 → 0件）。
 */
function resolvePartyConflicts(
  result: Record<number, Candidate[]>,
  constituencyIds: number[],
  rand: () => number,
  maxPasses = 5,
): void {
  for (let pass = 0; pass < maxPasses; pass++) {
    // partyId → そのパーティが存在する選挙区IDセット
    const partyIndex = new Map<string, Set<number>>()
    for (const cid of constituencyIds) {
      for (const c of result[cid]) {
        if (!partyIndex.has(c.partyId)) partyIndex.set(c.partyId, new Set())
        partyIndex.get(c.partyId)!.add(cid)
      }
    }

    let fixed = 0
    const shuffledCids = [...constituencyIds]
    fisherYates(shuffledCids, rand)

    for (const cid of shuffledCids) {
      const group = result[cid]
      const seen = new Map<string, number>()
      for (let i = 0; i < group.length; i++) {
        const pid = group[i].partyId
        if (!seen.has(pid)) { seen.set(pid, i); continue }

        // 重複候補をスワップで解消
        const extraCand = group[i]
        const occupied = partyIndex.get(pid) ?? new Set()
        const targetPool = shuffledCids.filter(other => other !== cid && !occupied.has(other))
        if (targetPool.length === 0) continue

        fisherYates(targetPool, rand)
        for (const targetCid of targetPool.slice(0, 30)) {
          const targetGroup = result[targetCid]
          const groupParties = new Set(group.filter((_, j) => j !== i).map(c => c.partyId))
          for (let k = 0; k < targetGroup.length; k++) {
            const swapCand = targetGroup[k]
            if (groupParties.has(swapCand.partyId)) continue
            const targetParties = new Set(targetGroup.filter((_, j) => j !== k).map(c => c.partyId))
            if (targetParties.has(extraCand.partyId)) continue
            // スワップ実行
            group[i] = swapCand
            targetGroup[k] = extraCand
            partyIndex.get(pid)!.delete(cid)
            partyIndex.get(pid)!.add(targetCid)
            partyIndex.get(swapCand.partyId)?.delete(targetCid)
            if (!partyIndex.has(swapCand.partyId)) partyIndex.set(swapCand.partyId, new Set())
            partyIndex.get(swapCand.partyId)!.add(cid)
            fixed++
            break
          }
          if (group[i] !== extraCand) break
        }
      }
    }
    if (fixed === 0) break
  }
}

/**
 * 政党インターリーブ方式で候補者を配分する。
 * 同一政党の候補者が同じ選挙区に集中しないよう、政党ごとにグループ化してから
 * ラウンドロビンでインターリーブした後、選挙区に割り当てる。
 * 最後に post-processing swap で残余の重複を解消する。
 */
export function assignCandidatesWithPartyDistribution(
  candidates: Candidate[],
  constituencies: Constituency[],
  seed?: number,
): Record<number, Candidate[]> {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random

  // 1. 政党ごとにグループ化してシャッフル
  const byParty: Record<string, Candidate[]> = {}
  for (const c of candidates) {
    if (!byParty[c.partyId]) byParty[c.partyId] = []
    byParty[c.partyId].push(c)
  }
  for (const group of Object.values(byParty)) {
    fisherYates(group, rand)
  }

  // 2. インターリーブ（政党ローテーション）
  const interleaved: Candidate[] = []
  const groups = Object.values(byParty)
  const indices = Array(groups.length).fill(0)
  let hasMore = true

  while (hasMore) {
    hasMore = false
    for (let g = 0; g < groups.length; g++) {
      if (indices[g] < groups[g].length) {
        interleaved.push(groups[g][indices[g]++])
        hasMore = true
      }
    }
  }

  // 3. ラウンドロビン配分
  const result: Record<number, Candidate[]> = {}
  for (const c of constituencies) result[c.id] = []
  const n = constituencies.length
  for (let i = 0; i < interleaved.length; i++) {
    result[constituencies[i % n].id].push(interleaved[i])
  }

  // 4. 同一政党重複を post-processing swap で解消
  resolvePartyConflicts(result, constituencies.map(c => c.id), rand)

  return result
}
