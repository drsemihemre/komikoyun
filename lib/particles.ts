// Basit darbe / patlama efekti havuzu — pool pattern, minimum GC
export type Impact = {
  active: boolean
  x: number
  y: number
  z: number
  t0: number
  color: string
  size: number
}

const POOL_SIZE = 12
let nextSlot = 0
const slots: Impact[] = Array.from({ length: POOL_SIZE }, () => ({
  active: false,
  x: 0,
  y: 0,
  z: 0,
  t0: 0,
  color: '#ffd60a',
  size: 1,
}))

export function spawnImpact(
  x: number,
  y: number,
  z: number,
  color: string = '#ffd60a',
  size: number = 1
) {
  const s = slots[nextSlot]
  s.active = true
  s.x = x
  s.y = y
  s.z = z
  s.t0 = performance.now() / 1000
  s.color = color
  s.size = size
  nextSlot = (nextSlot + 1) % POOL_SIZE
}

export function getImpactSlots() {
  return slots
}

export const IMPACT_DURATION = 0.45
