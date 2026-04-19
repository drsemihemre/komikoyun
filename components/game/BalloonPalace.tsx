'use client'

import { useRef } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

// Pozisyon: mancınığın fırlatma hedefi (z=-14, y=0'dan 32, -26 impulse → yaklaşık burası)
const PALACE_POS: [number, number, number] = [0, 28, -70]
const PLATFORM_R = 7

const BALLOON_CONFIGS: {
  offset: [number, number, number]
  radius: number
  color: string
}[] = [
  { offset: [5, 5, 0], radius: 2.2, color: '#ef476f' },
  { offset: [-5, 5.5, 0], radius: 2.4, color: '#06d6a0' },
  { offset: [0, 6, 5], radius: 2.3, color: '#ffd166' },
  { offset: [0, 5.5, -5], radius: 2.2, color: '#118ab2' },
  { offset: [4, 6.5, 4], radius: 1.8, color: '#f4a261' },
  { offset: [-4, 6.5, -4], radius: 1.8, color: '#c780fa' },
  { offset: [4, 7, -3], radius: 1.6, color: '#fb5607' },
  { offset: [-4, 7, 3], radius: 1.6, color: '#a8dadc' },
]

export default function BalloonPalace() {
  const visualGroup = useRef<Group>(null)

  useFrame((state) => {
    if (!visualGroup.current) return
    // Gentle sway
    const t = state.clock.elapsedTime
    visualGroup.current.rotation.z = Math.sin(t * 0.35) * 0.02
    visualGroup.current.rotation.x = Math.cos(t * 0.28) * 0.015
    visualGroup.current.position.y = Math.sin(t * 0.5) * 0.4
  })

  return (
    <group position={PALACE_POS}>
      <group ref={visualGroup}>
        <RigidBody type="fixed" colliders={false}>
          {/* Octagonal platform */}
          <CuboidCollider
            args={[PLATFORM_R, 0.3, PLATFORM_R]}
            position={[0, 0, 0]}
            friction={1.5}
          />
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[PLATFORM_R, PLATFORM_R, 0.6, 8]} />
            <meshToonMaterial color="#f1c0e8" />
          </mesh>
          {/* Platform edge trim */}
          <mesh position={[0, 0.4, 0]} castShadow>
            <torusGeometry args={[PLATFORM_R - 0.1, 0.25, 8, 32]} />
            <meshToonMaterial color="#c77dff" />
          </mesh>

          {/* Palace walls */}
          <CuboidCollider
            args={[0.15, 1.6, 1.8]}
            position={[-1.8, 1.9, 0]}
          />
          <CuboidCollider
            args={[0.15, 1.6, 1.8]}
            position={[1.8, 1.9, 0]}
          />
          <CuboidCollider
            args={[1.8, 1.6, 0.15]}
            position={[0, 1.9, -1.8]}
          />
          {/* Front with doorway (two small walls) */}
          <CuboidCollider args={[0.7, 1.6, 0.15]} position={[-1.15, 1.9, 1.8]} />
          <CuboidCollider args={[0.7, 1.6, 0.15]} position={[1.15, 1.9, 1.8]} />

          {/* Palace walls visual */}
          <mesh position={[-1.8, 1.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 3.2, 3.6]} />
            <meshToonMaterial color="#ffd6ff" />
          </mesh>
          <mesh position={[1.8, 1.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 3.2, 3.6]} />
            <meshToonMaterial color="#ffd6ff" />
          </mesh>
          <mesh position={[0, 1.9, -1.8]} castShadow receiveShadow>
            <boxGeometry args={[3.6, 3.2, 0.3]} />
            <meshToonMaterial color="#ffd6ff" />
          </mesh>
          <mesh position={[-1.15, 1.9, 1.8]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 3.2, 0.3]} />
            <meshToonMaterial color="#ffd6ff" />
          </mesh>
          <mesh position={[1.15, 1.9, 1.8]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 3.2, 0.3]} />
            <meshToonMaterial color="#ffd6ff" />
          </mesh>

          {/* Pyramid roof */}
          <mesh position={[0, 4.2, 0]} castShadow>
            <coneGeometry args={[2.8, 1.8, 4]} />
            <meshToonMaterial color="#7b2cbf" />
          </mesh>
          {/* Spire */}
          <mesh position={[0, 5.4, 0]} castShadow>
            <coneGeometry args={[0.3, 1, 8]} />
            <meshToonMaterial color="#ffd60a" />
          </mesh>
          {/* Flag */}
          <mesh position={[0.6, 5.6, 0]} castShadow>
            <boxGeometry args={[0.8, 0.5, 0.05]} />
            <meshToonMaterial color="#ef476f" />
          </mesh>
          {/* Two small turrets on corners */}
          {[
            [-1.8, 0, -1.8],
            [1.8, 0, -1.8],
          ].map((p, i) => (
            <group key={`t${i}`} position={[p[0], p[1], p[2]]}>
              <mesh position={[0, 2, 0]} castShadow>
                <cylinderGeometry args={[0.55, 0.55, 4, 12]} />
                <meshToonMaterial color="#ffafcc" />
              </mesh>
              <mesh position={[0, 4.4, 0]} castShadow>
                <coneGeometry args={[0.65, 0.8, 12]} />
                <meshToonMaterial color="#7b2cbf" />
              </mesh>
            </group>
          ))}
        </RigidBody>

        {/* Balloons holding the palace up — decorative */}
        {BALLOON_CONFIGS.map((b, i) => (
          <group key={`b${i}`}>
            <mesh position={b.offset} castShadow>
              <sphereGeometry args={[b.radius, 18, 18]} />
              <meshToonMaterial color={b.color} />
            </mesh>
            {/* Rope from balloon to platform edge */}
            <mesh
              position={[b.offset[0] * 0.5, b.offset[1] * 0.4, b.offset[2] * 0.5]}
              rotation={[0, 0, 0]}
            >
              <cylinderGeometry args={[0.04, 0.04, b.offset[1] * 0.8, 6]} />
              <meshToonMaterial color="#3a2e1a" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
