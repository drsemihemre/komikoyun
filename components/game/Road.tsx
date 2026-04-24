'use client'

import { MeshReflectorMaterial } from '@react-three/drei'
import { useGameStore } from '@/lib/store'

// Ana yol — kuzey-güney z=-55'te uzanıyor
// Yüksek grafikte ıslak asfalt yansıması (fake SSR benzeri)

const Z_ROAD = -55
const ROAD_WIDTH = 8
const ROAD_LENGTH = 140

export default function Road() {
  const level = useGameStore((s) => s.graphicsLevel)
  const isMobile = useGameStore((s) => s.isMobile)
  const reflective = level === 'high' && !isMobile

  return (
    <>
      {/* Ana asfalt */}
      <mesh
        position={[0, 0.015, Z_ROAD]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROAD_LENGTH, ROAD_WIDTH]} />
        {reflective ? (
          <MeshReflectorMaterial
            blur={[400, 100]}
            resolution={512}
            mixBlur={2.2}
            mixStrength={7}
            roughness={0.55}
            depthScale={1}
            minDepthThreshold={0.6}
            maxDepthThreshold={1.4}
            color="#2a2e36"
            metalness={0.6}
            mirror={0.45}
          />
        ) : (
          <meshStandardMaterial
            color="#2e333d"
            roughness={0.7}
            metalness={0.35}
          />
        )}
      </mesh>
      {/* Orta çizgi — sarı kesikli */}
      {Array.from({ length: 28 }).map((_, i) => {
        const x = -ROAD_LENGTH / 2 + i * (ROAD_LENGTH / 28) + 2.5
        return (
          <mesh
            key={`m${i}`}
            position={[x, 0.025, Z_ROAD]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[2, 0.35]} />
            <meshStandardMaterial
              color="#ffdd00"
              emissive="#ffdd00"
              emissiveIntensity={0.25}
              roughness={0.7}
            />
          </mesh>
        )
      })}

      {/* Yol kenarı şeritleri */}
      {[-ROAD_WIDTH / 2 - 0.25, ROAD_WIDTH / 2 + 0.25].map((zOff, i) => (
        <mesh
          key={`edge${i}`}
          position={[0, 0.018, Z_ROAD + zOff]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[ROAD_LENGTH, 0.3]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.15}
            roughness={0.6}
          />
        </mesh>
      ))}
    </>
  )
}
