// Brainrot tanımları — 50 orijinal İtalyan-brainrot karakter
// 7 Rarity tier: siradan → göksel
// Spawn ağırlıkları toplamı 85 (kalan %15 boş geçer, konveyor bazen boş kalır)

export type Rarity =
  | 'common' // Sıradan
  | 'rare' // Ender
  | 'epic' // Epik
  | 'legendary' // Efsanevi
  | 'mythic' // Gizemli
  | 'brainrot_king' // Brainrot Kralı
  | 'celestial' // Göksel

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
  price: number
  income: number // $/s
  color: string
  accent: string
  shape: Shape
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
    | 'number-67'   // Six Seven
    | 'lucky-block' // Şans Bloğu
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f97316',
  mythic: '#ec4899',
  brainrot_king: '#fbbf24',
  celestial: '#00ffff',
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Sıradan',
  rare: 'Ender',
  epic: 'Epik',
  legendary: 'Efsanevi',
  mythic: 'Gizemli',
  brainrot_king: 'Brainrot Kralı',
  celestial: 'Göksel',
}

export const RARITY_GLOW: Record<Rarity, number> = {
  common: 0,
  rare: 0.3,
  epic: 0.6,
  legendary: 0.9,
  mythic: 1.4,
  brainrot_king: 2.2,
  celestial: 3.5,
}

// Spawn ihtimalleri (toplam 85, kalan %15 boş spawn)
export const SPAWN_WEIGHTS: Record<Rarity, number> = {
  common: 45,
  rare: 15,
  epic: 10,
  legendary: 6.5,
  mythic: 5,
  brainrot_king: 2.5,
  celestial: 1,
}
export const EMPTY_SPAWN_WEIGHT = 15 // %15 boş

// Satış çarpanı — satın alma fiyatının yarısı geri alınır
export const SELL_MULT = 0.5
export function sellPriceFor(def: BrainrotDef): number {
  return Math.floor(def.price * SELL_MULT)
}

// ══════════════════════════════════════════════════════════════
//   50 KARAKTER — Fiyat aralıklarına uygun yerleştirme:
//     Sıradan:         $0 – $500
//     Ender:           $1.000 – $5.000
//     Epik:            $5.000 – $10.000
//     Efsanevi:        $50.000 – $100.000
//     Gizemli:         $1.000.000 – $5.000.000
//     Brainrot Kralı:  $15.000.000 – $30.000.000
//     Göksel:          $50.000.000 – $100.000.000
// ══════════════════════════════════════════════════════════════

export const BRAINROTS: BrainrotDef[] = [
  // ─── SIRADAN (15 karakter, $0-500) ───
  { id: 'pizzanello', name: 'Pizzanello', rarity: 'common', price: 50, income: 2, color: '#e63946', accent: '#ffd60a', shape: 'round', accessory: 'pizza' },
  { id: 'bananinho', name: 'Bananinho', rarity: 'common', price: 85, income: 4, color: '#ffd60a', accent: '#86400c', shape: 'tall', accessory: 'banana' },
  { id: 'spagettino', name: 'Spagettino', rarity: 'common', price: 120, income: 5, color: '#f4a261', accent: '#e63946', shape: 'wide', accessory: 'pasta-coils' },
  { id: 'caramellaro', name: 'Caramellaro Dulce', rarity: 'common', price: 55, income: 2, color: '#c77d30', accent: '#fde68a', shape: 'round', accessory: 'dulce-dots' },
  { id: 'pastafio', name: 'Pastafio Rigato', rarity: 'common', price: 95, income: 4, color: '#fde68a', accent: '#f97316', shape: 'wide', accessory: 'pasta-coils' },
  { id: 'mozzalino', name: 'Mozzalino', rarity: 'common', price: 180, income: 8, color: '#fef9c3', accent: '#a3e635', shape: 'round' },
  { id: 'panettone', name: 'Panettone Dolce', rarity: 'common', price: 260, income: 12, color: '#fbbf24', accent: '#b45309', shape: 'tall', accessory: 'cake-layers' },
  { id: 'ravioliano', name: 'Ravioliano', rarity: 'common', price: 200, income: 9, color: '#fef08a', accent: '#dc2626', shape: 'wide' },
  { id: 'gelatina', name: 'Gelatina Flopper', rarity: 'common', price: 65, income: 2, color: '#ec4899', accent: '#fdf2f8', shape: 'round' },
  { id: 'biscottino', name: 'Biscottino', rarity: 'common', price: 40, income: 1, color: '#c2410c', accent: '#fef3c7', shape: 'tiny' },
  { id: 'limonado', name: 'Limonado Frizzato', rarity: 'common', price: 130, income: 5, color: '#fde047', accent: '#65a30d', shape: 'round' },
  { id: 'melonato', name: 'Melonato', rarity: 'common', price: 220, income: 10, color: '#65a30d', accent: '#ec4899', shape: 'round' },
  { id: 'fragolino', name: 'Fragolino', rarity: 'common', price: 48, income: 1, color: '#e11d48', accent: '#65a30d', shape: 'tiny', accessory: 'berry-dots' },
  { id: 'ciliegino', name: 'Ciliegino Gemello', rarity: 'common', price: 95, income: 4, color: '#b91c1c', accent: '#065f46', shape: 'tiny', accessory: 'cherry-pair' },
  { id: 'arancelo', name: 'Arancelo Frizzo', rarity: 'common', price: 480, income: 22, color: '#f97316', accent: '#22c55e', shape: 'round' },

  // ─── ENDER (10 karakter, $1.000-5.000) ───
  { id: 'captuccino', name: 'Captuccino Ninjano', rarity: 'rare', price: 1100, income: 55, color: '#8d6e63', accent: '#ffffff', shape: 'tall', accessory: 'sword' },
  { id: 'tungtung', name: 'Tungtung Tamburo', rarity: 'rare', price: 1450, income: 72, color: '#a0522d', accent: '#2d6a4f', shape: 'round', accessory: 'drum' },
  { id: 'espressino', name: 'Espressino Rocketino', rarity: 'rare', price: 1900, income: 95, color: '#3e2723', accent: '#fdd835', shape: 'tall', accessory: 'rocket' },
  { id: 'risottio', name: 'Risottio Cremoso', rarity: 'rare', price: 1250, income: 62, color: '#fef3c7', accent: '#f97316', shape: 'wide' },
  { id: 'tiramisu', name: 'Tiramisu Boomis', rarity: 'rare', price: 2400, income: 120, color: '#6b4423', accent: '#fef3c7', shape: 'round', accessory: 'cake-layers' },
  { id: 'lasagnardo', name: 'Lasagnardo', rarity: 'rare', price: 2800, income: 140, color: '#c2410c', accent: '#fef08a', shape: 'wide', accessory: 'cake-layers' },
  { id: 'calzonito', name: 'Calzonito Pieno', rarity: 'rare', price: 1700, income: 85, color: '#d97706', accent: '#fbbf24', shape: 'round' },
  { id: 'aperollo', name: 'Aperollo Spritzolo', rarity: 'rare', price: 3500, income: 175, color: '#f97316', accent: '#fcd34d', shape: 'tall', accessory: 'glass-aperol' },
  { id: 'parmigiano', name: 'Parmigiano Guardiano', rarity: 'rare', price: 4200, income: 210, color: '#fde68a', accent: '#1e40af', shape: 'wide', accessory: 'shield' },
  { id: 'bruschetta', name: 'Bruschetta Briganto', rarity: 'rare', price: 4800, income: 240, color: '#ea580c', accent: '#b91c1c', shape: 'wide', accessory: 'eyepatch' },

  // ─── EPİK (8 karakter, $5.000-10.000) ───
  { id: 'crocogatto', name: 'Crocogatto Felino', rarity: 'epic', price: 5200, income: 310, color: '#2d6a4f', accent: '#facc15', shape: 'quadruped' },
  { id: 'elefantico', name: 'Elefantico Trompano', rarity: 'epic', price: 6400, income: 385, color: '#6b7280', accent: '#f3e8ff', shape: 'quadruped', accessory: 'trunk' },
  { id: 'giraffino', name: 'Giraffino Altello', rarity: 'epic', price: 7200, income: 430, color: '#fbbf24', accent: '#78350f', shape: 'quadruped', accessory: 'long-neck' },
  { id: 'rinoceroso', name: 'Rinoceroso Forza', rarity: 'epic', price: 8500, income: 510, color: '#57534e', accent: '#292524', shape: 'quadruped', accessory: 'horn' },
  { id: 'delfinello', name: 'Delfinello Marino', rarity: 'epic', price: 5600, income: 340, color: '#60a5fa', accent: '#dbeafe', shape: 'serpentine' },
  { id: 'octopinho', name: 'Octopinho Tentacolo', rarity: 'epic', price: 7800, income: 470, color: '#a855f7', accent: '#f0abfc', shape: 'wide', accessory: 'tentacles' },
  { id: 'tigrini', name: 'Tigrini Furioso', rarity: 'epic', price: 9500, income: 570, color: '#f97316', accent: '#18181b', shape: 'quadruped', accessory: 'stripes' },
  { id: 'koalabombo', name: 'Koalabombo Dormiglio', rarity: 'epic', price: 9900, income: 600, color: '#78716c', accent: '#3f3f46', shape: 'round' },

  // ─── EFSANEVİ (7 karakter, $50.000-100.000) ───
  { id: 'bombardini', name: 'Bombardini Krokodilo', rarity: 'legendary', price: 52000, income: 2600, color: '#1e293b', accent: '#64748b', shape: 'winged', accessory: 'pilot-helmet' },
  { id: 'mozzarellino', name: 'Mozzarellino Mostro', rarity: 'legendary', price: 65000, income: 3300, color: '#fef3c7', accent: '#f97316', shape: 'round', accessory: 'fire-crown' },
  { id: 'dragonetto', name: 'Dragonetto Rosso', rarity: 'legendary', price: 75000, income: 3800, color: '#dc2626', accent: '#fbbf24', shape: 'winged', accessory: 'wings-dragon' },
  { id: 'fenixino', name: 'Fenixino Eterno', rarity: 'legendary', price: 82000, income: 4200, color: '#f59e0b', accent: '#dc2626', shape: 'winged', accessory: 'fire-crown' },
  { id: 'unicornino', name: 'Unicornino Magnifico', rarity: 'legendary', price: 58000, income: 3000, color: '#fbcfe8', accent: '#fef3c7', shape: 'quadruped', accessory: 'horn' },
  { id: 'grifonetto', name: 'Grifonetto Guerriero', rarity: 'legendary', price: 90000, income: 4600, color: '#ca8a04', accent: '#78350f', shape: 'winged' },
  { id: 'drakinaro', name: 'Drakinaro Primordiale', rarity: 'legendary', price: 99000, income: 5100, color: '#15803d', accent: '#84cc16', shape: 'quadruped', accessory: 'wings-dragon' },

  // ─── GİZEMLİ (5 karakter, $1.000.000-5.000.000) ───
  { id: 'tralala', name: 'Tralala Kapralo', rarity: 'mythic', price: 1200000, income: 75000, color: '#38bdf8', accent: '#facc15', shape: 'spiky' },
  { id: 'tuktukbombas', name: 'Tuktukbombas Mytik', rarity: 'mythic', price: 2100000, income: 135000, color: '#c77dff', accent: '#ffd60a', shape: 'spiky' },
  { id: 'kristallinka', name: 'Kristallinka Dorada', rarity: 'mythic', price: 3000000, income: 190000, color: '#f0f9ff', accent: '#3b82f6', shape: 'floating', accessory: 'ice-crystal' },
  { id: 'galaksitto', name: 'Galaksitto Supremo', rarity: 'mythic', price: 4100000, income: 265000, color: '#1e1b4b', accent: '#a855f7', shape: 'floating', accessory: 'galaxy-ring' },
  { id: 'sixseven', name: 'Six Seven', rarity: 'mythic', price: 4900000, income: 320000, color: '#8b5cf6', accent: '#ffffff', shape: 'tall', accessory: 'number-67' },

  // ─── ŞANS BLOĞU VARYANTLARı (7 rarity, %10 toplam spawn, rarity ağırlıklı) ───
  { id: 'sansblogu_common',    name: 'Sıradan Şans Bloğu',      rarity: 'common',       price: 200,       income: 5,       color: '#9ca3af', accent: '#374151', shape: 'floating', accessory: 'lucky-block' },
  { id: 'sansblogu_rare',      name: 'Ender Şans Bloğu',        rarity: 'rare',         price: 2500,      income: 30,      color: '#3b82f6', accent: '#1e40af', shape: 'floating', accessory: 'lucky-block' },
  { id: 'sansblogu_epic',      name: 'Epik Şans Bloğu',         rarity: 'epic',         price: 8888,      income: 100,     color: '#fbbf24', accent: '#78350f', shape: 'floating', accessory: 'lucky-block' },
  { id: 'sansblogu_legendary', name: 'Efsanevi Şans Bloğu',     rarity: 'legendary',    price: 75000,     income: 500,     color: '#f97316', accent: '#7c2d12', shape: 'floating', accessory: 'lucky-block' },
  { id: 'sansblogu_mythic',    name: 'Gizemli Şans Bloğu',      rarity: 'mythic',       price: 2500000,   income: 20000,   color: '#ec4899', accent: '#831843', shape: 'floating', accessory: 'lucky-block' },
  { id: 'sansblogu_king',      name: 'Brainrot Kralı Şans Bloğu', rarity: 'brainrot_king', price: 20000000, income: 150000, color: '#fbbf24', accent: '#92400e', shape: 'floating', accessory: 'lucky-block' },
  { id: 'sansblogu_celestial', name: 'Göksel Şans Bloğu',       rarity: 'celestial',    price: 60000000,  income: 500000,  color: '#06b6d4', accent: '#164e63', shape: 'floating', accessory: 'lucky-block' },

  // ─── BRAINROT KRALI (5 karakter: 3 original + 2 etkinlik ödülü) ───
  { id: 'anthropicus',  name: 'Anthropicus Maximus',   rarity: 'brainrot_king', price: 16000000, income: 950000,  color: '#cbd5e1', accent: '#f97316', shape: 'floating', accessory: 'halo' },
  { id: 'opusaro',      name: 'Opusaro Hegemon',       rarity: 'brainrot_king', price: 22000000, income: 1300000, color: '#fbbf24', accent: '#fef3c7', shape: 'spiky',    accessory: 'crown' },
  { id: 'padrinolo',    name: 'Il Padrinolo Italiano', rarity: 'brainrot_king', price: 29000000, income: 1750000, color: '#18181b', accent: '#dc2626', shape: 'tall',     accessory: 'suit-tie' },
  // Etkinlik kill ödülleri (konveyorda çıkmaz, sadece boss öldürünce kazanılır):
  { id: 'bebek_ejderha', name: 'Bebek Ejderha', rarity: 'brainrot_king', price: 18000000, income: 1100000, color: '#dc2626', accent: '#fbbf24', shape: 'winged',    accessory: 'wings-dragon' },
  { id: 'bebek_dinozor', name: 'Bebek Dinozor', rarity: 'brainrot_king', price: 17000000, income: 1050000, color: '#16a34a', accent: '#86efac', shape: 'quadruped' },

  // ─── GÖKSEL (2 karakter, $50.000.000-100.000.000) ───
  { id: 'sonnetino',     name: 'Sonnetino Virtuoso', rarity: 'celestial', price: 55000000, income: 3300000, color: '#e5e7eb', accent: '#a855f7', shape: 'winged',   accessory: 'wings-angel' },
  { id: 'imperatorello', name: 'Dioimperatorello',   rarity: 'celestial', price: 99000000, income: 5900000, color: '#ffffff', accent: '#fbbf24', shape: 'floating', accessory: 'crown' },
]

// ─── ÖZEL GRUPLAR ─────────────────────────────────────────────
// Şans Bloğu ID seti — konveyorda ayrı mantıkla spawn eder
export const LUCKY_BLOCK_IDS = new Set([
  'sansblogu_common', 'sansblogu_rare', 'sansblogu_epic',
  'sansblogu_legendary', 'sansblogu_mythic', 'sansblogu_king', 'sansblogu_celestial',
])
export function isLuckyBlock(defId: string): boolean {
  return LUCKY_BLOCK_IDS.has(defId)
}

// Etkinlik ödülü ID seti — konveyorda çıkmaz, LB reveal'dan da çıkmaz
export const EVENT_REWARD_IDS = new Set(['bebek_ejderha', 'bebek_dinozor'])

// Şans Bloğu spawn ağırlıkları (rarity başına, toplam içindeki payları)
export const LUCKY_BLOCK_SPAWN_WEIGHTS: Record<Rarity, number> = {
  common:       20,
  rare:         15,
  epic:         10,
  legendary:    5,
  mythic:       2.5,
  brainrot_king: 1,
  celestial:    0.5,
}
const LB_TOTAL = Object.values(LUCKY_BLOCK_SPAWN_WEIGHTS).reduce((a, b) => a + b, 0) // ≈ 54

// ─── KARAKTER SAYISI KONTROLÜ ──────────────────────────────────
// 50 original + 6 new LBs (replacing sansblogu) → 57 + sansblogu_epic counts as +7 = 57
// Detay: 50 (existing) - 0 removed + 7 LB + 2 event = 59
if (BRAINROTS.length !== 59) {
  console.warn(`[brainrots] Expected 59 characters, got ${BRAINROTS.length}`)
}

// ─── SPAWN FONKSİYONLARI ──────────────────────────────────────

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic', 'brainrot_king', 'celestial']

// Aynı rarity'den rastgele bir normal brainrot — LB ve etkinlik ödülü hariç
export function randomBrainrotOfRarity(rarity: Rarity): BrainrotDef | null {
  const candidates = BRAINROTS.filter(
    (b) => b.rarity === rarity && !LUCKY_BLOCK_IDS.has(b.id) && !EVENT_REWARD_IDS.has(b.id)
  )
  if (candidates.length === 0) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// randomBrainrot — konveyor spawn:
//   5%  → boş
//   10% → Şans Bloğu (LUCKY_BLOCK_SPAWN_WEIGHTS ile rarity seçimi)
//   85% → Normal brainrot (SPAWN_WEIGHTS, LB ve etkinlik ödülü hariç)
export function randomBrainrot(): BrainrotDef | null {
  const r = Math.random() * 100

  // 5% boş spawn
  if (r < 5) return null

  // 10% Şans Bloğu spawn — rarity ağırlıklarına göre
  if (r < 15) {
    let lbR = Math.random() * LB_TOTAL
    for (const rar of RARITY_ORDER) {
      const w = LUCKY_BLOCK_SPAWN_WEIGHTS[rar]
      if (lbR < w) {
        const lbId = rar === 'brainrot_king' ? 'sansblogu_king' : `sansblogu_${rar}`
        return BRAINROTS.find((b) => b.id === lbId) ?? null
      }
      lbR -= w
    }
    return null
  }

  // 85% Normal brainrot
  let regR = r - 15 // 0..85 aralığı (SPAWN_WEIGHTS toplamı = 85)
  for (const rar of RARITY_ORDER) {
    const w = SPAWN_WEIGHTS[rar]
    if (regR < w) {
      const candidates = BRAINROTS.filter(
        (b) => b.rarity === rar && !LUCKY_BLOCK_IDS.has(b.id) && !EVENT_REWARD_IDS.has(b.id)
      )
      if (candidates.length === 0) return null
      return candidates[Math.floor(Math.random() * candidates.length)]
    }
    regR -= w
  }
  return null
}

export function getBrainrotDef(id: string): BrainrotDef | undefined {
  return BRAINROTS.find((b) => b.id === id)
}
