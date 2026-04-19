import { RigidBody, CuboidCollider } from '@react-three/rapier'

type Props = {
  position: [number, number, number]
  height: number
}

// Daha sığ eğim için FLOOR_H düşük, DEPTH uzun, WIDTH geniş
const WIDTH = 12
const DEPTH = 12
const FLOOR_H = 3
const WALL_T = 0.3
const STAIR_INSET = 0.8 // rampa uçlarının duvarlara göre boşluğu

export default function Building({ position, height }: Props) {
  const floors = Math.max(2, Math.floor(height / FLOOR_H))

  const rampColliders: React.ReactNode[] = []
  const platformColliders: React.ReactNode[] = []
  const stepVisuals: React.ReactNode[] = []
  const platformVisuals: React.ReactNode[] = []

  for (let f = 0; f < floors; f++) {
    const leftSide = f % 2 === 0
    const yBase = f * FLOOR_H

    // Kat platformu (yer hariç)
    if (f > 0) {
      const pz = leftSide ? DEPTH / 4 : -DEPTH / 4
      platformColliders.push(
        <CuboidCollider
          key={`pc${f}`}
          args={[(WIDTH - 0.6) / 2, 0.12, (DEPTH / 2 - 0.3) / 2]}
          position={[0, yBase, pz]}
          friction={1.5}
        />
      )
      platformVisuals.push(
        <mesh key={`pv${f}`} position={[0, yBase, pz]} receiveShadow>
          <boxGeometry args={[WIDTH - 0.6, 0.24, DEPTH / 2 - 0.3]} />
          <meshToonMaterial color="#ffe5b4" />
        </mesh>
      )
    }

    // f katından f+1'e rampa
    if (f < floors - 1) {
      const zStart = leftSide ? -DEPTH / 2 + STAIR_INSET : DEPTH / 2 - STAIR_INSET
      const zEnd = -zStart
      const xPos = leftSide ? -WIDTH / 4 : WIDTH / 4
      const dz = zEnd - zStart
      const dy = FLOOR_H
      const length = Math.sqrt(dy * dy + dz * dz)
      const rotX = -Math.atan2(dy, dz)
      const midY = yBase + dy / 2
      const rampWidth = WIDTH / 2 - 0.8

      // Görünmez rampa collider (yüksek friction = kaymaz)
      rampColliders.push(
        <CuboidCollider
          key={`rc${f}`}
          args={[rampWidth / 2, 0.15, length / 2]}
          position={[xPos, midY, 0]}
          rotation={[rotX, 0, 0]}
          friction={2.5}
        />
      )

      // Dekoratif basamaklar (fiziksiz, rampa üstünde)
      const STEP_COUNT = 18
      for (let s = 0; s < STEP_COUNT; s++) {
        const t = (s + 0.5) / STEP_COUNT
        const sx = xPos
        const sy = yBase + t * dy
        const sz = zStart + t * dz
        stepVisuals.push(
          <mesh
            key={`sv${f}-${s}`}
            position={[sx, sy, sz]}
            rotation={[rotX, 0, 0]}
          >
            <boxGeometry args={[rampWidth, 0.16, length / STEP_COUNT]} />
            <meshToonMaterial color={leftSide ? '#d4a373' : '#cdb4db'} />
          </mesh>
        )
      }
    }
  }

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* Duvar collider'ları */}
        <CuboidCollider
          args={[WIDTH / 2, height / 2, WALL_T / 2]}
          position={[0, height / 2, -DEPTH / 2]}
        />
        <CuboidCollider
          args={[WALL_T / 2, height / 2, DEPTH / 2]}
          position={[-WIDTH / 2, height / 2, 0]}
        />
        <CuboidCollider
          args={[WALL_T / 2, height / 2, DEPTH / 2]}
          position={[WIDTH / 2, height / 2, 0]}
        />
        {/* Çatı */}
        <CuboidCollider
          args={[WIDTH / 2 + 0.2, 0.15, DEPTH / 2 + 0.2]}
          position={[0, height + 0.15, 0]}
        />
        {platformColliders}
        {rampColliders}

        {/* Duvar görselleri */}
        <mesh position={[0, height / 2, -DEPTH / 2]} receiveShadow>
          <boxGeometry args={[WIDTH, height, WALL_T]} />
          <meshToonMaterial color="#fce38a" />
        </mesh>
        <mesh position={[-WIDTH / 2, height / 2, 0]} receiveShadow>
          <boxGeometry args={[WALL_T, height, DEPTH]} />
          <meshToonMaterial color="#f4a261" />
        </mesh>
        <mesh position={[WIDTH / 2, height / 2, 0]} receiveShadow>
          <boxGeometry args={[WALL_T, height, DEPTH]} />
          <meshToonMaterial color="#f4a261" />
        </mesh>
        <mesh position={[0, height + 0.15, 0]} castShadow>
          <boxGeometry args={[WIDTH + 0.4, 0.3, DEPTH + 0.4]} />
          <meshToonMaterial color="#e76f51" />
        </mesh>
        {platformVisuals}
        {stepVisuals}
      </RigidBody>
    </group>
  )
}
