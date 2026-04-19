export type CreatureHandle = {
  id: string
  getPos: () => { x: number; y: number; z: number } | null
  // Normal fiziksel vuruş (yumruk, osuruk tabancası) — tumble + respawn
  takeHit: (force: [number, number, number]) => void
  // Su tabancası — erit + spawn noktasına geri dön
  melt: () => void
  // Işınlama silahı — haritada rastgele bir noktaya ışınlan
  teleportAway: () => void
  // Elektrik süpürgesi — oyuncuya çek, sonra uzaklara fırlat
  suckAndLaunch: (playerX: number, playerZ: number) => void
  // Balon silahı — şiş, yükseğe uç, patla
  balloonify: () => void
}

const registry = new Set<CreatureHandle>()

export function registerCreature(h: CreatureHandle) {
  registry.add(h)
}

export function unregisterCreature(h: CreatureHandle) {
  registry.delete(h)
}

export function getCreatures(): Iterable<CreatureHandle> {
  return registry
}
