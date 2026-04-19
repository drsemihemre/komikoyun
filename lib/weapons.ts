// Silah tanımları — her biri farklı ses, görsel, yaratık etkisi

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
  isRanged: boolean // projectile trail gösterir
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
  },
  {
    id: 'water',
    name: 'Su Tabancası',
    emoji: '💧',
    color: '#4cc9f0',
    range: 9,
    cooldown: 0.45,
    isRanged: true,
  },
  {
    id: 'fart',
    name: 'Osuruk Tabancası',
    emoji: '💨',
    color: '#a8e10c',
    range: 6,
    cooldown: 0.5,
    isRanged: true,
  },
  {
    id: 'teleportGun',
    name: 'Işınlama Silahı',
    emoji: '🌀',
    color: '#c77dff',
    range: 12,
    cooldown: 0.8,
    isRanged: true,
  },
  {
    id: 'vacuum',
    name: 'Elektrik Süpürgesi',
    emoji: '🌪️',
    color: '#4a5568',
    range: 7,
    cooldown: 0.7,
    isRanged: true,
  },
  {
    id: 'balloon',
    name: 'Balon Silahı',
    emoji: '🎈',
    color: '#ff6b9d',
    range: 8,
    cooldown: 0.9,
    isRanged: true,
  },
]

export function getWeapon(id: WeaponId): WeaponDef {
  return WEAPONS.find((w) => w.id === id) ?? WEAPONS[0]
}
