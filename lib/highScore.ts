// localStorage ile kalıcı istatistikler

export type Stats = {
  highScore: number
  totalKos: number
  totalHits: number
  sessions: number
  maxScale: number
  maxSpeed: number
  lastPlayed: number
}

const KEY = 'komikoyun_stats_v1'

const DEFAULT: Stats = {
  highScore: 0,
  totalKos: 0,
  totalHits: 0,
  sessions: 0,
  maxScale: 1,
  maxSpeed: 1,
  lastPlayed: 0,
}

export function loadStats(): Stats {
  if (typeof window === 'undefined') return DEFAULT
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT, ...parsed }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveStats(stats: Partial<Stats>) {
  if (typeof window === 'undefined') return
  try {
    const current = loadStats()
    const merged = { ...current, ...stats, lastPlayed: Date.now() }
    window.localStorage.setItem(KEY, JSON.stringify(merged))
  } catch {
    // quota / incognito
  }
}

export function resetStats() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {}
}
