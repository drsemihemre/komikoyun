import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Mesh } from 'three'
import { SAFE_ZONE } from '@/lib/store'

export default function SafeZone() {
  const glowRef = useRef<Mesh>(null)

  useFrame((state) => {
    if (glowRef.current) {
      const t = state.clock.elapsedTime
      // Subtle pulse
      const s = 1 + Math.sin(t * 2.2) * 0.04
      glowRef.current.scale.set(s, s, 1)
    }
  })

  return (
    <group position={SAFE_ZONE.center}>
      {/* Floor */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[SAFE_ZONE.radius, 48]} />
        <meshToonMaterial color="#b7e4c7" />
      </mesh>
      {/* Outer ring */}
      <mesh ref={glowRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SAFE_ZONE.radius - 0.35, SAFE_ZONE.radius, 48]} />
        <meshBasicMaterial color="#2d6a4f" />
      </mesh>
      {/* Center logo - shield */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.0, 6]} />
        <meshBasicMaterial color="#2d6a4f" />
      </mesh>
    </group>
  )
}
