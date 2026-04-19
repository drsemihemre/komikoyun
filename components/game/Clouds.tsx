'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

type Cloud = {
  x: number
  z: number
  y: number
  scale: number
  drift: number // drift speed
  puffs: { dx: number; dy: number; dz: number; r: number }[]
}

const CLOUD_COUNT = 14
const CLOUD_Y_MIN = 42
const CLOUD_Y_MAX = 58
const FIELD = 180

export default function Clouds() {
  const clouds = useMemo<Cloud[]>(() => {
    let seed = 1337
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const list: Cloud[] = []
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const puffCount = 4 + Math.floor(rand() * 4)
      const puffs: Cloud['puffs'] = []
      for (let j = 0; j < puffCount; j++) {
        puffs.push({
          dx: (rand() - 0.5) * 4,
          dy: (rand() - 0.5) * 1.2,
          dz: (rand() - 0.5) * 3,
          r: 1.2 + rand() * 1.8,
        })
      }
      list.push({
        x: (rand() - 0.5) * FIELD,
        z: (rand() - 0.5) * FIELD,
        y: CLOUD_Y_MIN + rand() * (CLOUD_Y_MAX - CLOUD_Y_MIN),
        scale: 1 + rand() * 1.2,
        drift: 0.4 + rand() * 0.6,
        puffs,
      })
    }
    return list
  }, [])

  const groupRef = useRef<Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    // Slow horizontal drift
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const c = clouds[i]
      if (!c) return
      child.position.x =
        ((c.x + t * c.drift + FIELD / 2) % FIELD) - FIELD / 2
      child.position.z = c.z
      child.position.y = c.y + Math.sin(t * 0.3 + i) * 0.4
    })
  })

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <group key={i} scale={c.scale}>
          {c.puffs.map((p, j) => (
            <mesh key={j} position={[p.dx, p.dy, p.dz]} castShadow>
              <sphereGeometry args={[p.r, 10, 10]} />
              <meshToonMaterial color="#ffffff" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
