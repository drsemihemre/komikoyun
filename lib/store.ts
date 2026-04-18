import { create } from 'zustand'

type Vec2 = { x: number; y: number }

type GameState = {
  mobileMove: Vec2
  mobileJump: boolean
  isMobile: boolean
  setMobileMove: (v: Vec2) => void
  setMobileJump: (j: boolean) => void
  setIsMobile: (m: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  mobileMove: { x: 0, y: 0 },
  mobileJump: false,
  isMobile: false,
  setMobileMove: (mobileMove) => set({ mobileMove }),
  setMobileJump: (mobileJump) => set({ mobileJump }),
  setIsMobile: (isMobile) => set({ isMobile }),
}))
