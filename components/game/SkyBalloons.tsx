'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

const COUNT = 18
const COLORS = [
  '#ef476f',
  '#ffd166',
  '#06d6a0',
  '#118ab2',
  '#c780fa',
  '#f4a261',
  '#fb5607',
  '#a8dadc',
]

type Balloon = {
  x: number
  y: number
  z: number
  color: string
  accent: string
  r: number
  speed: number
  phase: number
}

const FIELD = 200

export default function SkyBalloons() {
  const balloons = useMemo<Balloon[]>(() => {
    let seed = 77
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    return Array.from({ length: COUNT }).map((_, i) => ({
      x: (rand() - 0.5) * FIELD,
      z: (rand() - 0.5) * FIELD,
      y: 18 + rand() * 22,
      color: COLORS[i % COLORS.length],
      accent: COLORS[(i + 3) % COLORS.length],
      r: 1.1 + rand() * 1.5,
      speed: 0.6 + rand() * 1.4,
      phase: rand() * Math.PI * 2,
    }))
  }, [])

  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const b = balloons[i]
      if (!b) return
      // Slow drift + bob
      child.position.x =
        ((b.x + Math.sin(t * 0.1 + b.phase) * 3 + FIELD / 2) % FIELD) -
        FIELD / 2
      child.position.y = b.y + Math.sin(t * 0.6 + b.phase) * 0.8
      child.position.z =
        ((b.z + t * b.speed * 0.08 + FIELD / 2) % FIELD) - FIELD / 2
      child.rotation.z = Math.sin(t * 0.4 + b.phase) * 0.08
    })
  })

  return (
    <group ref={groupRef}>
      {balloons.map((b, i) => (
        <group key={i}>
          {/* Balloon */}
          <mesh scale={b.r} castShadow>
            <sphereGeometry args={[1, 14, 14]} />
            <meshToonMaterial color={b.color} />
          </mesh>
          {/* Neck */}
          <mesh position={[0, -b.r * 0.95, 0]}>
            <coneGeometry args={[b.r * 0.15, b.r * 0.3, 6]} />
            <meshToonMaterial color={b.accent} />
          </mesh>
          {/* String */}
          <mesh position={[0, -b.r * 1.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, b.r * 0.8, 4]} />
            <meshBasicMaterial color="#3a2e1a" />
          </mesh>
          {/* Highlight */}
          <mesh position={[-b.r * 0.35, b.r * 0.3, b.r * 0.55]} scale={b.r * 0.25}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
