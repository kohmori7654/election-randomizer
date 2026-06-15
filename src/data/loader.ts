import type {
  Candidate,
  Constituency,
  ProportionalCandidate,
  ProportionalSeats,
} from '../types/election'

const BASE = import.meta.env.BASE_URL

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export interface AppData {
  candidates: Candidate[]
  constituencies: Constituency[]
  proportionalCandidates: ProportionalCandidate[]
  proportionalSeats: ProportionalSeats
}

export async function loadAppData(): Promise<AppData> {
  const [candidates, constituencies, proportionalCandidates, proportionalSeats] =
    await Promise.all([
      fetchJson<Candidate[]>('candidates.json'),
      fetchJson<Constituency[]>('constituencies.json'),
      fetchJson<ProportionalCandidate[]>('proportional_candidates.json'),
      fetchJson<ProportionalSeats>('proportional_seats.json'),
    ])
  return { candidates, constituencies, proportionalCandidates, proportionalSeats }
}
