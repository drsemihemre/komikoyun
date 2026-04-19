import { RigidBody, CuboidCollider } from '@react-three/rapier'

type Props = {
  position: [number, number, number]
  size?: number
}

export default function Trampoline({ position, size = 6 }: Props) {
  const half = size / 2
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* Bouncy mat */}
        <CuboidCollider
          args={[half, 0.12, half]}
          position={[0, 0.6, 0]}
          restitution={1.4}
          friction={0.2}
        />
        {/* Mat visual */}
        <mesh position={[0, 0.6, 0]} receiveShadow>
          <boxGeometry args={[size, 0.24, size]} />
          <meshToonMaterial color="#06d6a0" />
        </mesh>
        {/* Frame */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[size + 0.5, 0.3, size + 0.5]} />
          <meshToonMaterial color="#1b263b" />
        </mesh>
        {/* Legs */}
        {[
          [half, -0.4, half],
          [-half, -0.4, half],
          [half, -0.4, -half],
          [-half, -0.4, -half],
        ].map((p, i) => (
          <mesh
            key={`l${i}`}
            position={p as [number, number, number]}
            castShadow
          >
            <cylinderGeometry args={[0.15, 0.15, 0.8, 10]} />
            <meshToonMaterial color="#1b263b" />
          </mesh>
        ))}
        {/* Springs (decorative) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const t = i / 12
          const ang = t * Math.PI * 2
          const r = half + 0.2
          return (
            <mesh
              key={`s${i}`}
              position={[Math.cos(ang) * r, 0.55, Math.sin(ang) * r]}
            >
              <cylinderGeometry args={[0.05, 0.05, 0.15, 6]} />
              <meshToonMaterial color="#adb5bd" />
            </mesh>
          )
        })}
      </RigidBody>
    </group>
  )
}
