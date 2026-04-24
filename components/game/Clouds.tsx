'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Clouds as DreiClouds, Cloud } from '@react-three/drei'
import { MeshBasicMaterial, type Group } from 'three'
import { useGameStore } from '@/lib/store'

const CLOUD_COUNT = 10
const CLOUD_Y_MIN = 42
const CLOUD_Y_MAX = 62
const FIELD = 220

// Volumetric noise-tabanlı bulut sistemi (drei)
// Unreal Engine'in VolumetricCloud component'ine benzer hissiyat verir
export default function Clouds() {
  const graphicsLevel = useGameStore((s) => s.graphicsLevel)
  const isMobile = useGameStore((s) => s.isMobile)
  const groupRef = useRef<Group>(null)

  const clouds = useMemo(() => {
    let seed = 1337
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const count = graphicsLevel === 'low' || isMobile ? 5 : CLOUD_COUNT
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: (rand() - 0.5) * FIELD,
      z: (rand() - 0.5) * FIELD,
      y: CLOUD_Y_MIN + rand() * (CLOUD_Y_MAX - CLOUD_Y_MIN),
      scale: 1.5 + rand() * 1.5,
      drift: 0.3 + rand() * 0.5,
      seed: rand() * 100,
      opacity: 0.55 + rand() * 0.25,
      color: rand() > 0.7 ? '#fff5e6' : '#ffffff',
    }))
  }, [graphicsLevel, isMobile])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const c = clouds[i]
      if (!c) return
      child.position.x = ((c.x + t * c.drift + FIELD / 2) % FIELD) - FIELD / 2
      child.position.z = c.z
      child.position.y = c.y + Math.sin(t * 0.2 + i) * 0.6
    })
  })

  // Low mode — basit sphere puffs (performans)
  if (graphicsLevel === 'low') {
    return (
      <group ref={groupRef}>
        {clouds.map((c) => (
          <group key={c.id} scale={c.scale}>
            {[0, 1, 2, 3].map((j) => (
              <mesh
                key={j}
                position={[
                  Math.cos(j * 1.5) * 1.5,
                  Math.sin(j * 0.7) * 0.6,
                  Math.sin(j * 1.5) * 1.2,
                ]}
                castShadow
              >
                <sphereGeometry args={[1.3 + (j % 2) * 0.4, 8, 8]} />
                <meshBasicMaterial color={c.color} transparent opacity={c.opacity} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    )
  }

  // Medium/High — drei volumetric Clouds
  return (
    <group ref={groupRef}>
      <DreiClouds material={MeshBasicMaterial} limit={400}>
        {clouds.map((c) => (
          <Cloud
            key={c.id}
            seed={c.seed}
            segments={isMobile ? 16 : 24}
            bounds={[6, 2.5, 4]}
            volume={c.scale * 3}
            color={c.color}
            opacity={c.opacity}
            growth={2}
            speed={0.08}
            fade={18}
          />
        ))}
      </DreiClouds>
    </group>
  )
}
