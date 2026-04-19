// Silah tanımları — her biri farklı ses, görsel, yaratık etkisi
// Shop ekleme: price (satın alma), upgradeCost (tier 2 ve tier 3 için)

export type WeaponId =
  | 'fist'
  | 'water'
  | 'fart'
  | 'teleportGun'
  | 'vacuum'
  | 'balloon'

export type WeaponDef = {
  id: WeaponId
  name: string
  emoji: string
  color: string
  range: number
  cooldown: number // saniye
  isRanged: boolean
  price: number // 0 = başlangıçta açık
  maxTier: number
}

export const WEAPONS: WeaponDef[] = [
  {
    id: 'fist',
    name: 'Yumruk',
    emoji: '👊',
    color: '#ffd60a',
    range: 3.5,
    cooldown: 0.35,
    isRanged: false,
    price: 0, // default
    maxTier: 3,
  },
  {
    id: 'water',
    name: 'Su Tabancası',
    emoji: '💧',
    color: '#4cc9f0',
    range: 9,
    cooldown: 0.45,
    isRanged: true,
    price: 50,
    maxTier: 3,
  },
  {
    id: 'fart',
    name: 'Osuruk Tabancası',
    emoji: '💨',
    color: '#a8e10c',
    range: 6,
    cooldown: 0.5,
    isRanged: true,
    price: 100,
    maxTier: 3,
  },
  {
    id: 'teleportGun',
    name: 'Işınlama Silahı',
    emoji: '🌀',
    color: '#c77dff',
    range: 12,
    cooldown: 0.8,
    isRanged: true,
    price: 200,
    maxTier: 3,
  },
  {
    id: 'vacuum',
    name: 'Elektrik Süpürgesi',
    emoji: '🌪️',
    color: '#4a5568',
    range: 7,
    cooldown: 0.7,
    isRanged: true,
    price: 300,
    maxTier: 3,
  },
  {
    id: 'balloon',
    name: 'Balon Silahı',
    emoji: '🎈',
    color: '#ff6b9d',
    range: 8,
    cooldown: 0.9,
    isRanged: true,
    price: 500,
    maxTier: 3,
  },
]

export function getWeapon(id: WeaponId): WeaponDef {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0]
}

// Tier 2 yükseltme bedeli, Tier 3 yükseltme bedeli
export function upgradeCostFor(tier: number): number {
  if (tier === 1) return 100 // 1 → 2
  if (tier === 2) return 400 // 2 → 3
  return Infinity
}

// Tier'a göre hasar / güç çarpanı
export function tierMultiplier(tier: number): number {
  return 1 + (tier - 1) * 0.35 // 1.0, 1.35, 1.7
}
