import type { WeaponId } from './weapons'

const KEY = 'komikoyun_weapons_v1'

export type WeaponPersist = {
  unlocked: WeaponId[]
  levels: Record<string, number> // weaponId → 1/2/3
}

const DEFAULT: WeaponPersist = {
  unlocked: ['fist'],
  levels: { fist: 1 },
}

export function loadWeapons(): WeaponPersist {
  if (typeof window === 'undefined') return { ...DEFAULT }
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<WeaponPersist>
    return {
      unlocked: parsed.unlocked ?? DEFAULT.unlocked,
      levels: { ...DEFAULT.levels, ...(parsed.levels ?? {}) },
    }
  } catch {
    return { ...DEFAULT }
  }
}

export function saveWeapons(state: WeaponPersist) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {}
}

// Skin persist (nickname zaten ayrı key'de)
export type SkinPersist = {
  bodyColor: string
  hatKind: 'none' | 'cone' | 'cylinder' | 'crown' | 'beanie'
  hatColor: string
}

const SKIN_KEY = 'komikoyun_skin_v1'
const DEFAULT_SKIN: SkinPersist = {
  bodyColor: '#ef476f',
  hatKind: 'none',
  hatColor: '#1a1a1a',
}

export function loadSkin(): SkinPersist {
  if (typeof window === 'undefined') return { ...DEFAULT_SKIN }
  try {
    const raw = window.localStorage.getItem(SKIN_KEY)
    if (!raw) return { ...DEFAULT_SKIN }
    return { ...DEFAULT_SKIN, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SKIN }
  }
}

export function saveSkin(skin: SkinPersist) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SKIN_KEY, JSON.stringify(skin))
  } catch {}
}
