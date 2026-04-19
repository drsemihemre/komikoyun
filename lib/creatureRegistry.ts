export type CreatureHandle = {
  id: string
  getPos: () => { x: number; y: number; z: number } | null
  takeHit: (force: [number, number, number]) => void
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
