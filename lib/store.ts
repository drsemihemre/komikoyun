import { create } from 'zustand'
import { loadStats, saveStats } from './highScore'

type Vec2 = { x: number; y: number }

export type PotionType = 'grow' | 'shrink' | 'speed' | 'slow'
export type CameraMode = 'third' | 'first'

type GameState = {
  // Input state
  mobileMove: Vec2
  mobileJump: boolean
  mobileAttack: boolean
  isMobile: boolean
  // Potion-driven effects
  scale: number
  speedMult: number
  potionHits: Record<PotionType, number>
  // Combat stats
  hitCount: number
  koCount: number
  score: number
  highScore: number
  playerHP: number
  // Camera
  cameraMode: CameraMode
  // Game flow
  gameStarted: boolean
  paused: boolean
  resetNonce: number
  // Surprise potions
  jumpBoostUntil: number // AudioContext / performance time (s) when boost ends
  teleportCharges: number
  pendingTeleport: [number, number, number] | null

  // Setters
  setMobileMove: (v: Vec2) => void
  setMobileJump: (j: boolean) => void
  setMobileAttack: (a: boolean) => void
  setIsMobile: (m: boolean) => void
  drinkPotion: (p: PotionType) => void
  resetPotions: () => void
  incrementHitCount: () => void
  addKo: () => void
  addScore: (amount: number) => void
  damagePlayer: (amount: number) => void
  healPlayer: (amount: number) => void
  setPlayerHP: (hp: number) => void
  toggleCamera: () => void
  setGameStarted: (b: boolean) => void
  setPaused: (b: boolean) => void
  togglePause: () => void
  resetGame: () => void
  activateJumpBoost: (durationSec: number) => void
  grantTeleport: (charges: number) => void
  consumeTeleport: () => boolean
  setPendingTeleport: (pos: [number, number, number] | null) => void
}

const SCALE_FACTOR = 1.12
const SCALE_MIN = 0.25
const SCALE_MAX = 12
const SPEED_FACTOR = 1.1
const SPEED_MIN = 0.3
const SPEED_MAX = 3.5

export const PLAYER_HP_MAX = 100

const initialStats = loadStats()

function persistIfHigh(score: number, hitCount: number, koCount: number) {
  const cur = loadStats()
  const patch: Record<string, number> = {
    totalHits: cur.totalHits + 1,
    totalKos: cur.totalKos,
  }
  if (score > cur.highScore) patch.highScore = score
  saveStats(patch)
  void hitCount
  void koCount
}

export const useGameStore = create<GameState>((set) => ({
  mobileMove: { x: 0, y: 0 },
  mobileJump: false,
  mobileAttack: false,
  isMobile: false,
  scale: 1,
  speedMult: 1,
  potionHits: { grow: 0, shrink: 0, speed: 0, slow: 0 },
  hitCount: 0,
  koCount: 0,
  score: 0,
  highScore: initialStats.highScore,
  playerHP: PLAYER_HP_MAX,
  cameraMode: 'third',
  gameStarted: false,
  paused: false,
  resetNonce: 0,
  jumpBoostUntil: 0,
  teleportCharges: 0,
  pendingTeleport: null,

  setMobileMove: (mobileMove) => set({ mobileMove }),
  setMobileJump: (mobileJump) => set({ mobileJump }),
  setMobileAttack: (mobileAttack) => set({ mobileAttack }),
  setIsMobile: (isMobile) => set({ isMobile }),

  drinkPotion: (p) =>
    set((state) => {
      const hits = { ...state.potionHits, [p]: state.potionHits[p] + 1 }
      switch (p) {
        case 'grow':
          return {
            scale: Math.min(SCALE_MAX, state.scale * SCALE_FACTOR),
            potionHits: hits,
          }
        case 'shrink':
          return {
            scale: Math.max(SCALE_MIN, state.scale / SCALE_FACTOR),
            potionHits: hits,
          }
        case 'speed':
          return {
            speedMult: Math.min(SPEED_MAX, state.speedMult * SPEED_FACTOR),
            potionHits: hits,
          }
        case 'slow':
          return {
            speedMult: Math.max(SPEED_MIN, state.speedMult / SPEED_FACTOR),
            potionHits: hits,
          }
      }
    }),

  resetPotions: () =>
    set({
      scale: 1,
      speedMult: 1,
      potionHits: { grow: 0, shrink: 0, speed: 0, slow: 0 },
    }),

  incrementHitCount: () =>
    set((s) => {
      const newScore = s.score + 10
      const newHigh = Math.max(s.highScore, newScore)
      if (newHigh > s.highScore) {
        persistIfHigh(newScore, s.hitCount + 1, s.koCount)
      } else {
        saveStats({ totalHits: loadStats().totalHits + 1 })
      }
      return {
        hitCount: s.hitCount + 1,
        score: newScore,
        highScore: newHigh,
      }
    }),
  addKo: () =>
    set((s) => {
      const newScore = s.score + 50
      const newHigh = Math.max(s.highScore, newScore)
      const cur = loadStats()
      saveStats({
        totalKos: cur.totalKos + 1,
        highScore: newHigh,
      })
      return { koCount: s.koCount + 1, score: newScore, highScore: newHigh }
    }),
  addScore: (amount) =>
    set((s) => {
      const newScore = s.score + amount
      const newHigh = Math.max(s.highScore, newScore)
      if (newHigh > s.highScore) saveStats({ highScore: newHigh })
      return { score: newScore, highScore: newHigh }
    }),
  damagePlayer: (amount) =>
    set((s) => ({ playerHP: Math.max(0, s.playerHP - amount) })),
  healPlayer: (amount) =>
    set((s) => ({
      playerHP: Math.min(PLAYER_HP_MAX, s.playerHP + amount),
    })),
  setPlayerHP: (playerHP) => set({ playerHP }),
  toggleCamera: () =>
    set((s) => ({ cameraMode: s.cameraMode === 'third' ? 'first' : 'third' })),

  setGameStarted: (gameStarted) => set({ gameStarted }),
  setPaused: (paused) => set({ paused }),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  resetGame: () =>
    set((s) => ({
      hitCount: 0,
      koCount: 0,
      score: 0,
      scale: 1,
      speedMult: 1,
      potionHits: { grow: 0, shrink: 0, speed: 0, slow: 0 },
      playerHP: PLAYER_HP_MAX,
      paused: false,
      resetNonce: s.resetNonce + 1,
      jumpBoostUntil: 0,
      teleportCharges: 0,
      pendingTeleport: null,
    })),

  activateJumpBoost: (durationSec) =>
    set((s) => {
      const nowS = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000
      // Extend if already active
      const base = Math.max(s.jumpBoostUntil, nowS)
      return { jumpBoostUntil: base + durationSec }
    }),
  grantTeleport: (charges) =>
    set((s) => ({ teleportCharges: s.teleportCharges + charges })),
  consumeTeleport: () => {
    const s = useGameStore.getState()
    if (s.teleportCharges <= 0) return false
    useGameStore.setState({ teleportCharges: s.teleportCharges - 1 })
    return true
  },
  setPendingTeleport: (pendingTeleport) => set({ pendingTeleport }),
}))

// Safe zone configuration
export const SAFE_ZONE = {
  center: [0, 0, 0] as [number, number, number],
  radius: 6,
}

// Arena
export const ARENA = {
  center: [0, 0, 26] as [number, number, number],
  radius: 13,
}

// Map dimensions (world square, half-extent)
export const MAP_HALF = 115 // 230x230 playing field (2× önceki)
