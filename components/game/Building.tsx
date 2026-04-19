import { RigidBody, CuboidCollider } from '@react-three/rapier'

type Props = {
  position: [number, number, number]
  height: number
}

const WIDTH = 10
const DEPTH = 8
const FLOOR_H = 4
const WALL_T = 0.3

export default function Building({ position, height }: Props) {
  const floors = Math.max(2, Math.floor(height / FLOOR_H))

  const ramps: React.ReactNode[] = []
  const platformColliders: React.ReactNode[] = []
  const stepVisuals: React.ReactNode[] = []
  const platformVisuals: React.ReactNode[] = []

  for (let f = 0; f < floors; f++) {
    const leftSide = f % 2 === 0
    const yBase = f * FLOOR_H

    // Floor platform (skip ground)
    if (f > 0) {
      const pz = leftSide ? DEPTH / 4 : -DEPTH / 4
      platformColliders.push(
        <CuboidCollider
          key={`pc${f}`}
          args={[(WIDTH - 0.6) / 2, 0.12, (DEPTH / 2 - 0.3) / 2]}
          position={[0, yBase, pz]}
        />
      )
      platformVisuals.push(
        <mesh
          key={`pv${f}`}
          position={[0, yBase, pz]}
          receiveShadow
        >
          <boxGeometry args={[WIDTH - 0.6, 0.24, DEPTH / 2 - 0.3]} />
          <meshToonMaterial color="#ffe5b4" />
        </mesh>
      )
    }

    // Flight from f → f+1 (ramp + visual steps on top)
    if (f < floors - 1) {
      const zStart = leftSide ? -DEPTH / 2 + 0.6 : DEPTH / 2 - 0.6
      const zEnd = -zStart
      const xPos = leftSide ? -WIDTH / 4 : WIDTH / 4
      const dz = zEnd - zStart
      const dy = FLOOR_H
      const length = Math.sqrt(dy * dy + dz * dz)
      const rotX = -Math.atan2(dy, dz)
      const midY = yBase + dy / 2
      const rampWidth = WIDTH / 2 - 0.6

      // Invisible smooth ramp collider
      ramps.push(
        <CuboidCollider
          key={`rc${f}`}
          args={[rampWidth / 2, 0.15, length / 2]}
          position={[xPos, midY, 0]}
          rotation={[rotX, 0, 0]}
        />
      )

      // Decorative step visuals (no physics) sitting on top of ramp
      const STEP_COUNT = 14
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
            <boxGeometry args={[rampWidth, 0.18, length / STEP_COUNT]} />
            <meshToonMaterial color={leftSide ? '#d4a373' : '#cdb4db'} />
          </mesh>
        )
      }
    }
  }

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* Wall colliders */}
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
        {/* Roof collider */}
        <CuboidCollider
          args={[WIDTH / 2 + 0.2, 0.15, DEPTH / 2 + 0.2]}
          position={[0, height + 0.15, 0]}
        />
        {platformColliders}
        {ramps}

        {/* Wall visuals */}
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
