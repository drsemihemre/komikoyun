import { RigidBody } from '@react-three/rapier'

type Props = {
  position: [number, number, number]
  height: number
}

const RADIUS = 3.2
const STEPS_PER_TURN = 16
const STEP_RISE = 0.4

export default function SpiralStairs({ position, height }: Props) {
  const totalSteps = Math.floor(height / STEP_RISE)
  const steps = []

  // Two intertwined spirals (DNA-like), each 180° apart
  for (let strand = 0; strand < 2; strand++) {
    const phaseOffset = strand * Math.PI
    for (let i = 0; i < totalSteps; i++) {
      const angle = (i / STEPS_PER_TURN) * Math.PI * 2 + phaseOffset
      const y = i * STEP_RISE + 0.1
      const x = Math.cos(angle) * RADIUS
      const z = Math.sin(angle) * RADIUS
      const color = strand === 0 ? '#a8dadc' : '#f1c0e8'
      steps.push(
        <mesh
          key={`${strand}-${i}`}
          position={[x, y, z]}
          rotation={[0, -angle + Math.PI / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.2, 0.22, 1.2]} />
          <meshToonMaterial color={color} />
        </mesh>
      )
    }
  }

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid">
        {/* Central column */}
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, height, 16]} />
          <meshToonMaterial color="#457b9d" />
        </mesh>
        {steps}
      </RigidBody>
    </group>
  )
}
