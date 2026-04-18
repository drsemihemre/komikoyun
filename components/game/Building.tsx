import { RigidBody } from '@react-three/rapier'

type Props = {
  position: [number, number, number]
  height: number
}

const WIDTH = 10
const DEPTH = 8
const FLOOR_H = 4

export default function Building({ position, height }: Props) {
  const floors = Math.max(2, Math.floor(height / FLOOR_H))
  const walls = []
  const stairs = []
  const platforms = []

  for (let f = 0; f < floors; f++) {
    const y = f * FLOOR_H
    const leftSide = f % 2 === 0

    // Floor platform (except ground)
    if (f > 0) {
      platforms.push(
        <mesh
          key={`p${f}`}
          position={[0, y, leftSide ? DEPTH / 4 : -DEPTH / 4]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[WIDTH - 1, 0.3, DEPTH / 2 - 0.3]} />
          <meshToonMaterial color="#ffe5b4" />
        </mesh>
      )
    }

    // Stairs from floor f to f+1 (going along DEPTH axis)
    if (f < floors - 1) {
      const STEPS = 8
      const stepD = (DEPTH - 1) / STEPS
      const stepH = FLOOR_H / STEPS
      for (let s = 0; s < STEPS; s++) {
        const zOffset = leftSide
          ? -DEPTH / 2 + 0.5 + s * stepD
          : DEPTH / 2 - 0.5 - s * stepD
        stairs.push(
          <mesh
            key={`s${f}-${s}`}
            position={[
              leftSide ? -WIDTH / 4 : WIDTH / 4,
              y + s * stepH + stepH / 2,
              zOffset,
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[WIDTH / 2 - 0.5, stepH, stepD]} />
            <meshToonMaterial color="#d4a373" />
          </mesh>
        )
      }
    }
  }

  // Outer walls (open front for visibility)
  walls.push(
    <mesh
      key="back"
      position={[0, height / 2, -DEPTH / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[WIDTH, height, 0.3]} />
      <meshToonMaterial color="#fce38a" />
    </mesh>,
    <mesh
      key="left"
      position={[-WIDTH / 2, height / 2, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.3, height, DEPTH]} />
      <meshToonMaterial color="#f4a261" />
    </mesh>,
    <mesh
      key="right"
      position={[WIDTH / 2, height / 2, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.3, height, DEPTH]} />
      <meshToonMaterial color="#f4a261" />
    </mesh>,
    <mesh key="roof" position={[0, height + 0.15, 0]} castShadow>
      <boxGeometry args={[WIDTH + 0.4, 0.3, DEPTH + 0.4]} />
      <meshToonMaterial color="#e76f51" />
    </mesh>
  )

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid">
        {walls}
        {platforms}
        {stairs}
      </RigidBody>
    </group>
  )
}
