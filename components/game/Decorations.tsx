'use client'

import { useMemo } from 'react'

const FLOWER_COUNT = 55
const ROCK_COUNT = 18
const TREE_COUNT = 14
const SPREAD = 95 // half-field
const NEAR_CENTER_AVOID = 10 // safe zone etrafı

const FLOWER_COLORS = [
  '#ffd166',
  '#ef476f',
  '#c77dff',
  '#06d6a0',
  '#f4a261',
  '#fb5607',
]

export default function Decorations() {
  const { flowers, rocks, trees } = useMemo(() => {
    let seed = 314
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }

    const randomPos = (): [number, number] => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const x = (rand() - 0.5) * SPREAD * 2
        const z = (rand() - 0.5) * SPREAD * 2
        // Avoid center (safe zone)
        if (Math.hypot(x, z) < NEAR_CENTER_AVOID) continue
        // Avoid arena area
        if (Math.hypot(x, z - 26) < 14) continue
        // Avoid road
        if (z > -60 && z < -50) continue
        return [x, z]
      }
      return [SPREAD * (rand() - 0.5) * 2, SPREAD * (rand() - 0.5) * 2]
    }

    const flowers = Array.from({ length: FLOWER_COUNT }).map((_, i) => {
      const [x, z] = randomPos()
      return {
        id: i,
        x,
        z,
        color: FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)],
        size: 0.2 + rand() * 0.15,
      }
    })

    const rocks = Array.from({ length: ROCK_COUNT }).map((_, i) => {
      const [x, z] = randomPos()
      return {
        id: i,
        x,
        z,
        size: 0.5 + rand() * 0.6,
        rotY: rand() * Math.PI * 2,
      }
    })

    const trees = Array.from({ length: TREE_COUNT }).map((_, i) => {
      const [x, z] = randomPos()
      return {
        id: i,
        x,
        z,
        size: 1 + rand() * 0.5,
      }
    })

    return { flowers, rocks, trees }
  }, [])

  return (
    <>
      {flowers.map((f) => (
        <group key={`f${f.id}`} position={[f.x, 0, f.z]}>
          {/* Stem */}
          <mesh position={[0, 0.25 * f.size, 0]}>
            <cylinderGeometry
              args={[0.04 * f.size, 0.04 * f.size, 0.5 * f.size, 5]}
            />
            <meshToonMaterial color="#4d7c0f" />
          </mesh>
          {/* Petal blob */}
          <mesh position={[0, 0.55 * f.size, 0]} castShadow>
            <sphereGeometry args={[f.size, 8, 8]} />
            <meshToonMaterial color={f.color} />
          </mesh>
          {/* Center */}
          <mesh position={[0, 0.55 * f.size, 0.05]}>
            <sphereGeometry args={[0.07 * f.size, 6, 6]} />
            <meshToonMaterial color="#ffd60a" />
          </mesh>
        </group>
      ))}

      {rocks.map((r) => (
        <mesh
          key={`r${r.id}`}
          position={[r.x, r.size * 0.25, r.z]}
          rotation={[0, r.rotY, 0]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[r.size]} />
          <meshToonMaterial color="#6c757d" />
        </mesh>
      ))}

      {trees.map((t) => (
        <group key={`t${t.id}`} position={[t.x, 0, t.z]}>
          {/* Trunk */}
          <mesh position={[0, 1 * t.size, 0]} castShadow>
            <cylinderGeometry
              args={[0.25 * t.size, 0.35 * t.size, 2 * t.size, 8]}
            />
            <meshToonMaterial color="#6f4518" />
          </mesh>
          {/* Foliage — stacked cones */}
          <mesh position={[0, 2.2 * t.size, 0]} castShadow>
            <coneGeometry args={[1.2 * t.size, 1.5 * t.size, 8]} />
            <meshToonMaterial color="#2d6a4f" />
          </mesh>
          <mesh position={[0, 3.1 * t.size, 0]} castShadow>
            <coneGeometry args={[0.9 * t.size, 1.2 * t.size, 8]} />
            <meshToonMaterial color="#2d6a4f" />
          </mesh>
          <mesh position={[0, 3.8 * t.size, 0]} castShadow>
            <coneGeometry args={[0.6 * t.size, 0.9 * t.size, 8]} />
            <meshToonMaterial color="#2d6a4f" />
          </mesh>
        </group>
      ))}
    </>
  )
}
