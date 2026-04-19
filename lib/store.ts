import { create } from 'zustand'

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
  playerHP: number
  // Camera
  cameraMode: CameraMode

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
}

const SCALE_FACTOR = 1.12
const SCALE_MIN = 0.25
const SCALE_MAX = 12
const SPEED_FACTOR = 1.1
const SPEED_MIN = 0.3
const SPEED_MAX = 3.5

export const PLAYER_HP_MAX = 100

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
  playerHP: PLAYER_HP_MAX,
  cameraMode: 'third',

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
    set((s) => ({ hitCount: s.hitCount + 1, score: s.score + 10 })),
  addKo: () => set((s) => ({ koCount: s.koCount + 1, score: s.score + 50 })),
  addScore: (amount) => set((s) => ({ score: s.score + amount })),
  damagePlayer: (amount) =>
    set((s) => ({ playerHP: Math.max(0, s.playerHP - amount) })),
  healPlayer: (amount) =>
    set((s) => ({
      playerHP: Math.min(PLAYER_HP_MAX, s.playerHP + amount),
    })),
  setPlayerHP: (playerHP) => set({ playerHP }),
  toggleCamera: () =>
    set((s) => ({ cameraMode: s.cameraMode === 'third' ? 'first' : 'third' })),
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
