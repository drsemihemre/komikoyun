import { RigidBody } from '@react-three/rapier'

type Props = {
  position: [number, number, number]
  height: number
}

const RADIUS = 4
const STEPS_PER_TURN = 40
const STEP_RISE = 0.14

export default function SpiralStairs({ position, height }: Props) {
  const totalSteps = Math.floor(height / STEP_RISE)
  const steps = []

  // Tek sarmal (önceki 2 strand'dan tekine düşürüldü)
  for (let i = 0; i < totalSteps; i++) {
    const angle = (i / STEPS_PER_TURN) * Math.PI * 2
    const y = i * STEP_RISE + 0.18
    const x = Math.cos(angle) * RADIUS
    const z = Math.sin(angle) * RADIUS
    steps.push(
      <mesh
        key={i}
        position={[x, y, z]}
        rotation={[0, -angle + Math.PI / 2, 0]}
        castShadow={i % 4 === 0}
        receiveShadow
      >
        <boxGeometry args={[2.4, 0.3, 1.6]} />
        <meshToonMaterial color="#a8dadc" />
      </mesh>
    )
  }

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid" friction={2} restitution={0}>
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, height, 12]} />
          <meshToonMaterial color="#457b9d" />
        </mesh>
        {steps}
      </RigidBody>
    </group>
  )
}
