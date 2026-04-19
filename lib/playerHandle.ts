// Tek oyuncu dünyasında oyuncuya global erişim sağlar —
// yaratıklar hasar verebilsin diye oyuncu konumu sorgulanabilir

export type PlayerHandle = {
  getPos: () => { x: number; y: number; z: number } | null
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
