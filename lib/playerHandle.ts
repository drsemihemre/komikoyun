// Tek oyuncu dünyasında oyuncuya global erişim sağlar —
// yaratıklar oyuncu konumunu sorgulayıp saldırabilsin diye
// Mancınık gibi dış etkiler Player'a impulse uygulayabilsin diye

export type PlayerHandle = {
  getPos: () => { x: number; y: number; z: number } | null
  takeHit: (damage: number, knockbackDir: [number, number, number]) => void
  isDown: () => boolean
  launch: (impulse: [number, number, number]) => void
}

let handle: PlayerHandle | null = null

export function registerPlayer(h: PlayerHandle) {
  handle = h
}

export function unregisterPlayer() {
  handle = null
}

export function getPlayerPos() {
  return handle?.getPos() ?? null
}

export function getPlayerHandle() {
  return handle
}
