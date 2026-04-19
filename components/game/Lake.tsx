'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { MeshReflectorMaterial } from '@react-three/drei'
import type { Mesh } from 'three'
import { useGameStore } from '@/lib/store'

const LAKE_CENTER: [number, number, number] = [-70, 0, 55]
const LAKE_R = 22

export default function Lake() {
  const waterRef = useRef<Mesh>(null)
  const isMobile = useGameStore((s) => s.isMobile)

  useFrame((state) => {
    if (!waterRef.current) return
    const t = state.clock.elapsedTime
    waterRef.current.rotation.z = Math.sin(t * 0.4) * 0.008
    waterRef.current.position.y = 0.06 + Math.sin(t * 0.7) * 0.04
  })

  const [cx, , cz] = LAKE_CENTER

  return (
    <group position={[cx, 0, cz]}>
      {/* Sand/grass transition ring */}
      <mesh
        position={[0, 0.016, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[LAKE_R + 3, 48]} />
        <meshToonMaterial color="#d7cba7" />
      </mesh>
      {/* Water surface — reflective! */}
      <mesh
        ref={waterRef}
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[LAKE_R, 48]} />
        {isMobile ? (
          <meshStandardMaterial
            color="#4aa3df"
            roughness={0.3}
            metalness={0.2}
            emissive="#1a5e8f"
            emissiveIntensity={0.15}
            transparent
            opacity={0.9}
          />
        ) : (
          <MeshReflectorMaterial
            blur={[300, 80]}
            resolution={512}
            mixBlur={1}
            mixStrength={40}
            roughness={0.7}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#4aa3df"
            metalness={0.4}
            mirror={0.6}
          />
        )}
      </mesh>
      {/* Lily pads */}
      {[
        [6, -4, '#4caf50'],
        [-8, 7, '#66bb6a'],
        [10, 9, '#4caf50'],
        [-4, -10, '#81c784'],
        [2, 12, '#66bb6a'],
      ].map((p, i) => (
        <group key={i} position={[p[0] as number, 0.09, p[1] as number]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.9, 10]} />
            <meshToonMaterial color={p[2] as string} />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshToonMaterial color="#ffafcc" />
          </mesh>
        </group>
      ))}

      {/* Dock */}
      <group position={[LAKE_R - 2, 0, 0]}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[3, 0.15, 1.2]} position={[2, 0.3, 0]} />
          <mesh position={[2, 0.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[6, 0.3, 2.4]} />
            <meshToonMaterial color="#8d6e63" />
          </mesh>
          <mesh position={[-0.6, -0.4, 1]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 1.4, 6]} />
            <meshToonMaterial color="#5d4037" />
          </mesh>
          <mesh position={[-0.6, -0.4, -1]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 1.4, 6]} />
            <meshToonMaterial color="#5d4037" />
          </mesh>
          <mesh position={[4.6, -0.4, 1]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 1.4, 6]} />
            <meshToonMaterial color="#5d4037" />
          </mesh>
          <mesh position={[4.6, -0.4, -1]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 1.4, 6]} />
            <meshToonMaterial color="#5d4037" />
          </mesh>
        </RigidBody>
      </group>

      {/* Boat */}
      <group position={[-5, 0, 8]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[3, 0.4, 1.2]} />
          <meshToonMaterial color="#fb5607" />
        </mesh>
        <mesh position={[-1.6, 0.3, 0]} rotation={[0, 0, -0.3]} castShadow>
          <boxGeometry args={[0.8, 0.3, 1]} />
          <meshToonMaterial color="#fb5607" />
        </mesh>
        <mesh position={[1.6, 0.3, 0]} rotation={[0, 0, 0.3]} castShadow>
          <boxGeometry args={[0.8, 0.3, 1]} />
          <meshToonMaterial color="#fb5607" />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[2, 0.1, 0.5]} />
          <meshToonMaterial color="#5d4037" />
        </mesh>
      </group>

      {/* Rocks around the lake */}
      {[
        [LAKE_R + 1, 0, -3, 0.6],
        [-LAKE_R - 1, 0, 4, 0.8],
        [-2, 0, LAKE_R + 2, 0.5],
        [3, 0, -LAKE_R - 2, 0.7],
      ].map((r, i) => (
        <mesh
          key={`rock${i}`}
          position={[r[0], r[3] * 0.3, r[2]]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[r[3]]} />
          <meshToonMaterial color="#6c757d" />
        </mesh>
      ))}
    </group>
  )
}
