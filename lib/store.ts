import { create } from 'zustand'
import { loadStats, saveStats } from './highScore'
import type { WeaponId } from './weapons'
import { WEAPONS, upgradeCostFor } from './weapons'
import {
  loadWeapons,
  saveWeapons,
  loadSkin,
  saveSkin,
  type SkinPersist,
} from './weaponStore'

type Vec2 = { x: number; y: number }

export type PotionType = 'grow' | 'shrink' | 'speed' | 'slow'
export type CameraMode = 'third' | 'first'

type GameState = {
  // Input state
  mobileMove: Vec2
  mobileJump: boolean
  mobileAttack: boolean
  mobileWeaponFire: boolean
  isMobile: boolean
  // Weapons
  currentWeapon: WeaponId
  unlockedWeapons: WeaponId[]
  weaponLevels: Record<string, number>
  // Skin
  skin: SkinPersist
  // Shop UI
  shopOpen: 'buy' | 'upgrade' | null
  // Crouch
  crouching: boolean
  mobileCrouch: boolean
  // Graphics
  graphicsLevel: 'low' | 'medium' | 'high'
  // Build mode
  buildMode: boolean
  buildMaterial: 'stone' | 'wood' | 'glass' | 'brick' | 'grass'
  placedBlocks: Array<{
    id: string
    x: number
    y: number
    z: number
    material: string
  }>
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
  drivingKart: string | null
  // Surprise potions
  jumpBoostUntil: number // AudioContext / performance time (s) when boost ends
  teleportCharges: number
  pendingTeleport: [number, number, number] | null

  // Setters
  setMobileMove: (v: Vec2) => void
  setMobileJump: (j: boolean) => void
  setMobileAttack: (a: boolean) => void
  setMobileWeaponFire: (a: boolean) => void
  setIsMobile: (m: boolean) => void
  cycleWeapon: () => void
  setWeapon: (w: WeaponId) => void
  buyWeapon: (w: WeaponId) => boolean // satın al
  upgradeWeapon: (w: WeaponId) => boolean // tier yükselt
  setSkin: (s: Partial<SkinPersist>) => void
  openShop: (kind: 'buy' | 'upgrade' | null) => void
  setCrouching: (b: boolean) => void
  setMobileCrouch: (b: boolean) => void
  setGraphicsLevel: (l: 'low' | 'medium' | 'high') => void
  cycleGraphicsLevel: () => void
  toggleBuildMode: () => void
  cycleBuildMaterial: () => void
  placeBlockAt: (x: number, y: number, z: number) => void
  removeBlockAt: (x: number, y: number, z: number) => void
  clearBlocks: () => void
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
  setDrivingKart: (id: string | null) => void
  activateJumpBoost: (durationSec: number) => void
  grantTeleport: (charges: number) => void
  consumeTeleport: () => boolean
  setPendingTeleport: (pos: [number, number, number] | null) => void
}

const SCALE_FACTOR = 1.12
const SCALE_MIN = 0.25
const SCALE_MAX = 100
const SPEED_FACTOR = 1.1
const SPEED_MIN = 0.3
const SPEED_MAX = 3.5

export const PLAYER_HP_MAX = 100

const initialStats = loadStats()
const initialWeapons = loadWeapons()
const initialSkin = loadSkin()

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
  mobileWeaponFire: false,
  isMobile: false,
  currentWeapon: 'fist',
  unlockedWeapons: initialWeapons.unlocked,
  weaponLevels: initialWeapons.levels,
  skin: initialSkin,
  shopOpen: null,
  crouching: false,
  mobileCrouch: false,
  graphicsLevel:
    typeof window !== 'undefined'
      ? ((window.localStorage.getItem('komikoyun_graphics') as
          | 'low'
          | 'medium'
          | 'high'
          | null) ?? 'medium')
      : 'medium',
  buildMode: false,
  buildMaterial: 'stone',
  placedBlocks:
    typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = window.localStorage.getItem('komikoyun_blocks_v1')
            return raw ? JSON.parse(raw) : []
          } catch {
            return []
          }
        })()
      : [],
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
  drivingKart: null,
  jumpBoostUntil: 0,
  teleportCharges: 0,
  pendingTeleport: null,

  setMobileMove: (mobileMove) => set({ mobileMove }),
  setMobileJump: (mobileJump) => set({ mobileJump }),
  setMobileAttack: (mobileAttack) => set({ mobileAttack }),
  setMobileWeaponFire: (mobileWeaponFire) => set({ mobileWeaponFire }),
  setIsMobile: (isMobile) => set({ isMobile }),
  cycleWeapon: () =>
    set((s) => {
      const unlocked = s.unlockedWeapons
      if (unlocked.length <= 1) return {}
      const idx = WEAPONS.findIndex((w) => w.id === s.currentWeapon)
      // Bir sonraki unlocked silahı bul
      for (let i = 1; i <= WEAPONS.length; i++) {
        const next = WEAPONS[(idx + i) % WEAPONS.length]
        if (unlocked.includes(next.id)) return { currentWeapon: next.id }
      }
      return {}
    }),
  setWeapon: (w) => set({ currentWeapon: w }),

  buyWeapon: (id) => {
    const s = useGameStore.getState()
    const def = WEAPONS.find((w) => w.id === id)
    if (!def) return false
    if (s.unlockedWeapons.includes(id)) return false
    if (s.score < def.price) return false
    const newUnlocked = [...s.unlockedWeapons, id]
    const newLevels = { ...s.weaponLevels, [id]: 1 }
    saveWeapons({ unlocked: newUnlocked, levels: newLevels })
    useGameStore.setState({
      score: s.score - def.price,
      unlockedWeapons: newUnlocked,
      weaponLevels: newLevels,
      currentWeapon: id, // otomatik bu silaha geç
    })
    return true
  },
  upgradeWeapon: (id) => {
    const s = useGameStore.getState()
    if (!s.unlockedWeapons.includes(id)) return false
    const tier = s.weaponLevels[id] ?? 1
    const cost = upgradeCostFor(tier)
    const def = WEAPONS.find((w) => w.id === id)
    if (!def || tier >= def.maxTier) return false
    if (s.score < cost) return false
    const newLevels = { ...s.weaponLevels, [id]: tier + 1 }
    saveWeapons({ unlocked: s.unlockedWeapons, levels: newLevels })
    useGameStore.setState({
      score: s.score - cost,
      weaponLevels: newLevels,
    })
    return true
  },
  setSkin: (patch) =>
    set((s) => {
      const next = { ...s.skin, ...patch }
      saveSkin(next)
      return { skin: next }
    }),
  openShop: (shopOpen) => set({ shopOpen }),
  setCrouching: (crouching) => set({ crouching }),
  setMobileCrouch: (mobileCrouch) => set({ mobileCrouch }),
  setGraphicsLevel: (graphicsLevel) => {
    try {
      window.localStorage.setItem('komikoyun_graphics', graphicsLevel)
    } catch {}
    set({ graphicsLevel })
  },
  cycleGraphicsLevel: () => {
    const cur = useGameStore.getState().graphicsLevel
    const next: 'low' | 'medium' | 'high' =
      cur === 'low' ? 'medium' : cur === 'medium' ? 'high' : 'low'
    useGameStore.getState().setGraphicsLevel(next)
  },
  toggleBuildMode: () =>
    set((s) => ({ buildMode: !s.buildMode })),
  cycleBuildMaterial: () =>
    set((s) => {
      const order: Array<'stone' | 'wood' | 'glass' | 'brick' | 'grass'> = [
        'stone',
        'wood',
        'glass',
        'brick',
        'grass',
      ]
      const idx = order.indexOf(s.buildMaterial)
      return { buildMaterial: order[(idx + 1) % order.length] }
    }),
  placeBlockAt: (x, y, z) =>
    set((s) => {
      // Grid snap
      const gx = Math.round(x)
      const gy = Math.round(y)
      const gz = Math.round(z)
      // Aynı pozisyonda blok varsa koyma
      if (
        s.placedBlocks.some((b) => b.x === gx && b.y === gy && b.z === gz)
      ) {
        return {}
      }
      const newBlocks = [
        ...s.placedBlocks,
        {
          id: `b${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          x: gx,
          y: gy,
          z: gz,
          material: s.buildMaterial,
        },
      ]
      try {
        window.localStorage.setItem(
          'komikoyun_blocks_v1',
          JSON.stringify(newBlocks)
        )
      } catch {}
      return { placedBlocks: newBlocks }
    }),
  removeBlockAt: (x, y, z) =>
    set((s) => {
      const gx = Math.round(x)
      const gy = Math.round(y)
      const gz = Math.round(z)
      const idx = s.placedBlocks.findIndex(
        (b) => b.x === gx && b.y === gy && b.z === gz
      )
      if (idx === -1) return {}
      const newBlocks = s.placedBlocks.filter((_, i) => i !== idx)
      try {
        window.localStorage.setItem(
          'komikoyun_blocks_v1',
          JSON.stringify(newBlocks)
        )
      } catch {}
      return { placedBlocks: newBlocks }
    }),
  clearBlocks: () =>
    set(() => {
      try {
        window.localStorage.removeItem('komikoyun_blocks_v1')
      } catch {}
      return { placedBlocks: [] }
    }),

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
  setDrivingKart: (drivingKart) => set({ drivingKart }),
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
export const MAP_HALF = 230 // 460x460 playing field (bir kat daha büyüdü)
