'use client'

import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'

const VILLAGE_CENTER: [number, number, number] = [60, 0, -5]

type House = {
  x: number
  z: number
  rotY: number
  w: number
  d: number
  h: number
  wall: string
  roof: string
  door: string
}

const WALLS = ['#ffdab9', '#fad0c4', '#e8f5e9', '#fffacd', '#b2dfdb']
const ROOFS = ['#c62828', '#6d4c41', '#1b5e20', '#ad1457', '#4527a0']

export default function Village() {
  const houses = useMemo<House[]>(() => {
    let seed = 222
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const list: House[] = []
    const SPREAD = 18
    for (let i = 0; i < 9; i++) {
      // Grid-ish layout with jitter
      const gx = (i % 3) - 1
      const gz = Math.floor(i / 3) - 1
      const x = gx * 7 + (rand() - 0.5) * 2
      const z = gz * 7 + (rand() - 0.5) * 2
      list.push({
        x,
        z,
        rotY: rand() * Math.PI * 2,
        w: 3 + rand() * 1.5,
        d: 3 + rand() * 1.5,
        h: 2.5 + rand() * 1.2,
        wall: WALLS[Math.floor(rand() * WALLS.length)],
        roof: ROOFS[Math.floor(rand() * ROOFS.length)],
        door: '#6d4c41',
      })
    }
    void SPREAD
    return list
  }, [])

  const [cx, , cz] = VILLAGE_CENTER

  return (
    <group position={[cx, 0, cz]}>
      {/* Plaza floor */}
      <mesh
        position={[0, 0.016, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[22, 32]} />
        <meshToonMaterial color="#d7cba7" />
      </mesh>
      {/* Plaza ring */}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[21.5, 22, 32]} />
        <meshBasicMaterial color="#a68759" />
      </mesh>

      {/* Welcome sign */}
      <group position={[0, 0, 19]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[5, 1.5, 0.3]} />
          <meshToonMaterial color="#8d6e63" />
        </mesh>
        <mesh position={[0, 1.5, 0.2]}>
          <boxGeometry args={[4.5, 1.1, 0.1]} />
          <meshBasicMaterial color="#ffd166" />
        </mesh>
        <mesh position={[-2.2, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.15, 2.5, 8]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
        <mesh position={[2.2, 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.15, 2.5, 8]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
      </group>

      {houses.map((h, i) => (
        <House key={i} {...h} />
      ))}
    </group>
  )
}

function House({
  x,
  z,
  rotY,
  w,
  d,
  h,
  wall,
  roof,
  door,
}: House) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {/* Body collider */}
        <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
        {/* Body visual */}
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshToonMaterial color={wall} />
        </mesh>
        {/* Roof — pyramid */}
        <mesh position={[0, h + 0.8, 0]} castShadow>
          <coneGeometry args={[Math.max(w, d) * 0.75, 1.6, 4]} />
          <meshToonMaterial color={roof} />
        </mesh>
        {/* Roof tip */}
        <mesh position={[0, h + 1.7, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshToonMaterial color="#ffd60a" />
        </mesh>
        {/* Door */}
        <mesh position={[0, 0.75, d / 2 + 0.01]}>
          <boxGeometry args={[0.8, 1.5, 0.05]} />
          <meshBasicMaterial color={door} />
        </mesh>
        {/* Door knob */}
        <mesh position={[0.25, 0.75, d / 2 + 0.05]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ffd60a" />
        </mesh>
        {/* Windows */}
        <mesh position={[-w / 3, h * 0.65, d / 2 + 0.01]}>
          <boxGeometry args={[0.7, 0.7, 0.05]} />
          <meshBasicMaterial color="#90e0ef" />
        </mesh>
        <mesh position={[w / 3, h * 0.65, d / 2 + 0.01]}>
          <boxGeometry args={[0.7, 0.7, 0.05]} />
          <meshBasicMaterial color="#90e0ef" />
        </mesh>
        {/* Chimney */}
        <mesh position={[w / 3, h + 1.2, d / 4]} castShadow>
          <boxGeometry args={[0.4, 1, 0.4]} />
          <meshToonMaterial color="#795548" />
        </mesh>
      </RigidBody>
    </group>
  )
}
