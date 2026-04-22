// Brainrot tanımları — Italian-brainrot ilhamlı, 55 orijinal karakter
// 7 Rarity tier: common → god
// 9 Shape varyantı karakteri belirgin kılar

export type Rarity =
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'secret'
  | 'god'

export type Shape =
  | 'round'
  | 'tall'
  | 'wide'
  | 'spiky'
  | 'serpentine'
  | 'winged'
  | 'quadruped'
  | 'floating'
  | 'tiny'

export type BrainrotDef = {
  id: string
  name: string
  rarity: Rarity
  price: number // satın alma fiyatı (coin)
  income: number // $/s — pasif gelir
  color: string
  accent: string
  shape: Shape
  /** opsiyonel — özel aksesuar render (figürde switch edilir) */
  accessory?:
    | 'pizza'
    | 'banana'
    | 'sword'
    | 'drum'
    | 'pilot-helmet'
    | 'cake-layers'
    | 'rocket'
    | 'coffee-cup'
    | 'crown'
    | 'halo'
    | 'fire-crown'
    | 'ice-crystal'
    | 'star-aura'
    | 'shield'
    | 'trunk'
    | 'horn'
    | 'long-neck'
    | 'tentacles'
    | 'snake-head'
    | 'stripes'
    | 'wings-angel'
    | 'wings-dragon'
    | 'galaxy-ring'
    | 'neon-glow'
    | 'glass-aperol'
    | 'dulce-dots'
    | 'pasta-coils'
    | 'berry-dots'
    | 'pepperoni-top'
    | 'cherry-pair'
    | 'eyepatch'
    | 'mustache'
    | 'suit-tie'
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f97316',
  mythic: '#ec4899',
  secret: '#00ffcc',
  god: '#ffd700',
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Sıradan',
  rare: 'Nadir',
  epic: 'Epik',
  legendary: 'Efsanevi',
  mythic: 'Mitik',
  secret: 'Gizli',
  god: 'Tanrı',
}

export const RARITY_GLOW: Record<Rarity, number> = {
  common: 0,
  rare: 0.3,
  epic: 0.6,
  legendary: 0.9,
  mythic: 1.4,
  secret: 2.0,
  god: 3.0,
}

export const BRAINROTS: BrainrotDef[] = [
  // ─────────── COMMON (15) ───────────
  { id: 'pizzanello', name: 'Pizzanello', rarity: 'common', price: 50, income: 2, color: '#e63946', accent: '#ffd60a', shape: 'round', accessory: 'pizza' },
  { id: 'bananinho', name: 'Bananinho', rarity: 'common', price: 75, income: 3, color: '#ffd60a', accent: '#86400c', shape: 'tall', accessory: 'banana' },
  { id: 'spagettino', name: 'Spagettino', rarity: 'common', price: 120, income: 5, color: '#f4a261', accent: '#e63946', shape: 'wide', accessory: 'pasta-coils' },
  { id: 'caramellaro', name: 'Caramellaro Dulce', rarity: 'common', price: 55, income: 2, color: '#c77d30', accent: '#fde68a', shape: 'round', accessory: 'dulce-dots' },
  { id: 'pastafio', name: 'Pastafio Rigato', rarity: 'common', price: 90, income: 4, color: '#fde68a', accent: '#f97316', shape: 'wide', accessory: 'pasta-coils' },
  { id: 'mozzalino', name: 'Mozzalino', rarity: 'common', price: 100, income: 4, color: '#fef9c3', accent: '#a3e635', shape: 'round' },
  { id: 'panettone', name: 'Panettone Dolce', rarity: 'common', price: 140, income: 6, color: '#fbbf24', accent: '#b45309', shape: 'tall', accessory: 'cake-layers' },
  { id: 'ravioliano', name: 'Ravioliano', rarity: 'common', price: 80, income: 3, color: '#fef08a', accent: '#dc2626', shape: 'wide' },
  { id: 'gelatina', name: 'Gelatina Flopper', rarity: 'common', price: 60, income: 2, color: '#ec4899', accent: '#fdf2f8', shape: 'round' },
  { id: 'biscottino', name: 'Biscottino', rarity: 'common', price: 40, income: 1, color: '#c2410c', accent: '#fef3c7', shape: 'tiny' },
  { id: 'limonado', name: 'Limonado Frizzato', rarity: 'common', price: 70, income: 3, color: '#fde047', accent: '#65a30d', shape: 'round' },
  { id: 'melonato', name: 'Melonato', rarity: 'common', price: 85, income: 3, color: '#65a30d', accent: '#ec4899', shape: 'round' },
  { id: 'fragolino', name: 'Fragolino', rarity: 'common', price: 45, income: 2, color: '#e11d48', accent: '#65a30d', shape: 'tiny', accessory: 'berry-dots' },
  { id: 'ciliegino', name: 'Ciliegino Gemello', rarity: 'common', price: 55, income: 2, color: '#b91c1c', accent: '#065f46', shape: 'tiny', accessory: 'cherry-pair' },
  { id: 'arancelo', name: 'Arancelo Frizzo', rarity: 'common', price: 180, income: 7, color: '#f97316', accent: '#22c55e', shape: 'round' },

  // ─────────── RARE (12) ───────────
  { id: 'captuccino', name: 'Captuccino Ninjano', rarity: 'rare', price: 250, income: 10, color: '#8d6e63', accent: '#fff', shape: 'tall', accessory: 'sword' },
  { id: 'tungtung', name: 'Tungtung Tamburo', rarity: 'rare', price: 400, income: 15, color: '#a0522d', accent: '#2d6a4f', shape: 'round', accessory: 'drum' },
  { id: 'espressino', name: 'Espressino Rocketino', rarity: 'rare', price: 550, income: 20, color: '#3e2723', accent: '#fdd835', shape: 'tall', accessory: 'rocket' },
  { id: 'risottio', name: 'Risottio Cremoso', rarity: 'rare', price: 320, income: 12, color: '#fef3c7', accent: '#f97316', shape: 'wide' },
  { id: 'tiramisu', name: 'Tiramisu Boomis', rarity: 'rare', price: 480, income: 18, color: '#6b4423', accent: '#fef3c7', shape: 'round', accessory: 'cake-layers' },
  { id: 'lasagnardo', name: 'Lasagnardo', rarity: 'rare', price: 600, income: 22, color: '#c2410c', accent: '#fef08a', shape: 'wide', accessory: 'cake-layers' },
  { id: 'calzonito', name: 'Calzonito Pieno', rarity: 'rare', price: 380, income: 14, color: '#d97706', accent: '#fbbf24', shape: 'round' },
  { id: 'focaccino', name: 'Focaccino Olivino', rarity: 'rare', price: 290, income: 11, color: '#fbbf24', accent: '#064e3b', shape: 'wide' },
  { id: 'limonetto', name: 'Limonetto Ninjo', rarity: 'rare', price: 720, income: 27, color: '#facc15', accent: '#334155', shape: 'tall', accessory: 'sword' },
  { id: 'parmigiano', name: 'Parmigiano Guardiano', rarity: 'rare', price: 800, income: 30, color: '#fde68a', accent: '#1e40af', shape: 'wide', accessory: 'shield' },
  { id: 'aperollo', name: 'Aperollo Spritzolo', rarity: 'rare', price: 650, income: 24, color: '#f97316', accent: '#fcd34d', shape: 'tall', accessory: 'glass-aperol' },
  { id: 'bruschetta', name: 'Bruschetta Briganto', rarity: 'rare', price: 430, income: 16, color: '#ea580c', accent: '#b91c1c', shape: 'wide', accessory: 'eyepatch' },

  // ─────────── EPIC (10) ───────────
  { id: 'crocogatto', name: 'Crocogatto Felino', rarity: 'epic', price: 1000, income: 45, color: '#2d6a4f', accent: '#facc15', shape: 'quadruped' },
  { id: 'bombardini', name: 'Bombardini Krokodilo', rarity: 'epic', price: 2500, income: 100, color: '#1e293b', accent: '#64748b', shape: 'winged', accessory: 'pilot-helmet' },
  { id: 'elefantico', name: 'Elefantico Trompano', rarity: 'epic', price: 1800, income: 75, color: '#6b7280', accent: '#f3e8ff', shape: 'quadruped', accessory: 'trunk' },
  { id: 'giraffino', name: 'Giraffino Altello', rarity: 'epic', price: 2100, income: 85, color: '#fbbf24', accent: '#78350f', shape: 'quadruped', accessory: 'long-neck' },
  { id: 'rinoceroso', name: 'Rinoceroso Forza', rarity: 'epic', price: 3200, income: 130, color: '#57534e', accent: '#292524', shape: 'quadruped', accessory: 'horn' },
  { id: 'delfinello', name: 'Delfinello Marino', rarity: 'epic', price: 1500, income: 60, color: '#60a5fa', accent: '#dbeafe', shape: 'serpentine' },
  { id: 'octopinho', name: 'Octopinho Tentacolo', rarity: 'epic', price: 4000, income: 160, color: '#a855f7', accent: '#f0abfc', shape: 'wide', accessory: 'tentacles' },
  { id: 'serpentio', name: 'Serpentio Velenoso', rarity: 'epic', price: 2800, income: 115, color: '#15803d', accent: '#fde047', shape: 'serpentine', accessory: 'snake-head' },
  { id: 'tigrini', name: 'Tigrini Furioso', rarity: 'epic', price: 5000, income: 200, color: '#f97316', accent: '#18181b', shape: 'quadruped', accessory: 'stripes' },
  { id: 'koalabombo', name: 'Koalabombo Dormiglio', rarity: 'epic', price: 1300, income: 52, color: '#78716c', accent: '#3f3f46', shape: 'round' },

  // ─────────── LEGENDARY (8) ───────────
  { id: 'mozzarellino', name: 'Mozzarellino Mostro', rarity: 'legendary', price: 6000, income: 220, color: '#fef3c7', accent: '#f97316', shape: 'round', accessory: 'fire-crown' },
  { id: 'tralala', name: 'Tralala Kapralo', rarity: 'legendary', price: 12000, income: 400, color: '#38bdf8', accent: '#facc15', shape: 'spiky' },
  { id: 'dragonetto', name: 'Dragonetto Rosso', rarity: 'legendary', price: 18000, income: 560, color: '#dc2626', accent: '#fbbf24', shape: 'winged', accessory: 'wings-dragon' },
  { id: 'fenixino', name: 'Fenixino Eterno', rarity: 'legendary', price: 15000, income: 470, color: '#f59e0b', accent: '#dc2626', shape: 'winged', accessory: 'fire-crown' },
  { id: 'unicornino', name: 'Unicornino Magnifico', rarity: 'legendary', price: 9000, income: 310, color: '#fbcfe8', accent: '#fef3c7', shape: 'quadruped', accessory: 'horn' },
  { id: 'grifonetto', name: 'Grifonetto Guerriero', rarity: 'legendary', price: 14000, income: 440, color: '#ca8a04', accent: '#78350f', shape: 'winged' },
  { id: 'phoenixaro', name: 'Phoenixaro Supremo', rarity: 'legendary', price: 22000, income: 680, color: '#ef4444', accent: '#fbbf24', shape: 'winged', accessory: 'wings-angel' },
  { id: 'drakinaro', name: 'Drakinaro Primordiale', rarity: 'legendary', price: 25000, income: 780, color: '#15803d', accent: '#84cc16', shape: 'quadruped', accessory: 'wings-dragon' },

  // ─────────── MYTHIC (5) ───────────
  { id: 'tuktukbombas', name: 'Tuktukbombas Mytik', rarity: 'mythic', price: 30000, income: 900, color: '#c77dff', accent: '#ffd60a', shape: 'spiky' },
  { id: 'kristallinka', name: 'Kristallinka Dorada', rarity: 'mythic', price: 55000, income: 1500, color: '#f0f9ff', accent: '#3b82f6', shape: 'floating', accessory: 'ice-crystal' },
  { id: 'galaksitto', name: 'Galaksitto Supremo', rarity: 'mythic', price: 90000, income: 2200, color: '#1e1b4b', accent: '#a855f7', shape: 'floating', accessory: 'galaxy-ring' },
  { id: 'neonello', name: 'Neonello Mistico', rarity: 'mythic', price: 75000, income: 1900, color: '#ec4899', accent: '#06b6d4', shape: 'winged', accessory: 'neon-glow' },
  { id: 'voidworrior', name: 'Voidworrior Oscuro', rarity: 'mythic', price: 150000, income: 3500, color: '#000000', accent: '#6d28d9', shape: 'serpentine' },

  // ─────────── SECRET (3) ───────────
  { id: 'anthropicus', name: 'Anthropicus Maximus', rarity: 'secret', price: 350000, income: 6500, color: '#cbd5e1', accent: '#f97316', shape: 'floating', accessory: 'halo' },
  { id: 'opusaro', name: 'Opusaro Hegemon', rarity: 'secret', price: 680000, income: 11000, color: '#fbbf24', accent: '#fef3c7', shape: 'spiky', accessory: 'crown' },
  { id: 'sonnetino', name: 'Sonnetino Virtuoso', rarity: 'secret', price: 500000, income: 9000, color: '#e5e7eb', accent: '#a855f7', shape: 'winged', accessory: 'wings-angel' },

  // ─────────── GOD (2) ───────────
  { id: 'padrinolo', name: 'Il Padrinolo Italiano', rarity: 'god', price: 3000000, income: 25000, color: '#18181b', accent: '#dc2626', shape: 'tall', accessory: 'suit-tie' },
  { id: 'imperatorello', name: 'Dioimperatorello', rarity: 'god', price: 10000000, income: 50000, color: '#ffffff', accent: '#fbbf24', shape: 'floating', accessory: 'crown' },
]

// Rarity spawn chances — altın kural: ortak çok, tanrı çok az
export const SPAWN_WEIGHTS: Record<Rarity, number> = {
  common: 55,
  rare: 25,
  epic: 12,
  legendary: 5,
  mythic: 2,
  secret: 0.8,
  god: 0.2,
}

// Satış fiyatı çarpanı — satın alma fiyatının %60'ı geri alınır
export const SELL_MULT = 0.6

export function sellPriceFor(def: BrainrotDef): number {
  return Math.floor(def.price * SELL_MULT)
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
  if (candidates.length === 0) {
    // fallback common
    const commons = BRAINROTS.filter((b) => b.rarity === 'common')
    return commons[Math.floor(Math.random() * commons.length)]
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function getBrainrotDef(id: string): BrainrotDef | undefined {
  return BRAINROTS.find((b) => b.id === id)
}
