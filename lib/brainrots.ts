// Brainrot tanımları — Italian-brainrot ilhamlı, orijinal karakter isimleri
// Rarity'e göre renk + fiyat + dakikalık gelir

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export type BrainrotDef = {
  id: string
  name: string
  rarity: Rarity
  price: number // coin
  income: number // $/s
  color: string
  accent: string
  shape: 'tall' | 'round' | 'wide' | 'spiky'
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f97316',
  mythic: '#ec4899',
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Sıradan',
  rare: 'Nadir',
  epic: 'Epik',
  legendary: 'Efsanevi',
  mythic: 'Mitik',
}

export const BRAINROTS: BrainrotDef[] = [
  {
    id: 'pizzanello',
    name: 'Pizzanello',
    rarity: 'common',
    price: 50,
    income: 2,
    color: '#e63946',
    accent: '#ffd60a',
    shape: 'round',
  },
  {
    id: 'bananinho',
    name: 'Bananinho',
    rarity: 'common',
    price: 75,
    income: 3,
    color: '#ffd60a',
    accent: '#86400c',
    shape: 'tall',
  },
  {
    id: 'spagettino',
    name: 'Spagettino',
    rarity: 'common',
    price: 120,
    income: 5,
    color: '#f4a261',
    accent: '#e63946',
    shape: 'wide',
  },
  {
    id: 'captuccino',
    name: 'Captuccino Ninjano',
    rarity: 'rare',
    price: 250,
    income: 10,
    color: '#8d6e63',
    accent: '#fff',
    shape: 'tall',
  },
  {
    id: 'tungtung',
    name: 'Tungtung Tamburo',
    rarity: 'rare',
    price: 400,
    income: 15,
    color: '#a0522d',
    accent: '#2d6a4f',
    shape: 'round',
  },
  {
    id: 'crocogatto',
    name: 'Crocogatto',
    rarity: 'epic',
    price: 1000,
    income: 45,
    color: '#2d6a4f',
    accent: '#facc15',
    shape: 'wide',
  },
  {
    id: 'bombardini',
    name: 'Bombardini Krokodilo',
    rarity: 'epic',
    price: 2500,
    income: 100,
    color: '#1e293b',
    accent: '#64748b',
    shape: 'tall',
  },
  {
    id: 'mozzarellino',
    name: 'Mozzarellino Mostro',
    rarity: 'legendary',
    price: 6000,
    income: 220,
    color: '#fef3c7',
    accent: '#f97316',
    shape: 'round',
  },
  {
    id: 'tralala',
    name: 'Tralala Kapralo',
    rarity: 'legendary',
    price: 12000,
    income: 400,
    color: '#38bdf8',
    accent: '#facc15',
    shape: 'spiky',
  },
  {
    id: 'tuktukbombas',
    name: 'Tuktukbombas Mytik',
    rarity: 'mythic',
    price: 30000,
    income: 900,
    color: '#c77dff',
    accent: '#ffd60a',
    shape: 'spiky',
  },
]

// Rarity spawn chances (common daha çok, mytik nadir)
export const SPAWN_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  rare: 22,
  epic: 12,
  legendary: 5,
  mythic: 1,
}

export function randomBrainrot(): BrainrotDef {
  const totalWeight = Object.values(SPAWN_WEIGHTS).reduce((a, b) => a + b, 0)
  let r = Math.random() * totalWeight
  let rarity: Rarity = 'common'
  for (const [rar, w] of Object.entries(SPAWN_WEIGHTS) as [Rarity, number][]) {
    if (r < w) {
      rarity = rar
      break
    }
    r -= w
  }
  const candidates = BRAINROTS.filter((b) => b.rarity === rarity)
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function getBrainrotDef(id: string): BrainrotDef | undefined {
  return BRAINROTS.find((b) => b.id === id)
}
