import { create } from 'zustand'

type Vec2 = { x: number; y: number }

export type PotionType = 'grow' | 'shrink' | 'speed' | 'slow'

type GameState = {
  // Input state
  mobileMove: Vec2
  mobileJump: boolean
  isMobile: boolean
  // Potion-driven effects
  scale: number
  speedMult: number
  potionHits: Record<PotionType, number>

  // Setters
  setMobileMove: (v: Vec2) => void
  setMobileJump: (j: boolean) => void
  setIsMobile: (m: boolean) => void
  drinkPotion: (p: PotionType) => void
  resetPotions: () => void
}

const SCALE_STEP = 0.12
const SCALE_MIN = 0.35
const SCALE_MAX = 2.8
const SPEED_STEP = 0.12
const SPEED_MIN = 0.35
const SPEED_MAX = 2.4

export const useGameStore = create<GameState>((set) => ({
  mobileMove: { x: 0, y: 0 },
  mobileJump: false,
  isMobile: false,
  scale: 1,
  speedMult: 1,
  potionHits: { grow: 0, shrink: 0, speed: 0, slow: 0 },

  setMobileMove: (mobileMove) => set({ mobileMove }),
  setMobileJump: (mobileJump) => set({ mobileJump }),
  setIsMobile: (isMobile) => set({ isMobile }),

  drinkPotion: (p) =>
    set((state) => {
      const hits = { ...state.potionHits, [p]: state.potionHits[p] + 1 }
      switch (p) {
        case 'grow':
          return {
            scale: Math.min(SCALE_MAX, state.scale + SCALE_STEP),
            potionHits: hits,
          }
        case 'shrink':
          return {
            scale: Math.max(SCALE_MIN, state.scale - SCALE_STEP),
            potionHits: hits,
          }
        case 'speed':
          return {
            speedMult: Math.min(SPEED_MAX, state.speedMult + SPEED_STEP),
            potionHits: hits,
          }
        case 'slow':
          return {
            speedMult: Math.max(SPEED_MIN, state.speedMult - SPEED_STEP),
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
}))
