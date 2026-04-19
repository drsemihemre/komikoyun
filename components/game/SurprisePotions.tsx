'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, type Mesh } from 'three'
import { getPlayerPos } from '@/lib/playerHandle'
import { useGameStore } from '@/lib/store'
import { spawnImpact } from '@/lib/particles'
import { playPotion } from '@/lib/sounds'

type PotionKind = 'jump' | 'teleport'

type PotionSpawn = {
  id: string
  position: [number, number, number]
  kind: PotionKind
}

const SPAWNS: PotionSpawn[] = [
  // Jump potions (yeşil)
  { id: 'j1', position: [8, 1.2, 0], kind: 'jump' },
  { id: 'j2', position: [-16, 16.4, -4], kind: 'jump' },
  { id: 'j3', position: [42, 1.2, 18], kind: 'jump' },
  { id: 'j4', position: [0, 30, -70], kind: 'jump' }, // balon sarayında
  // Teleport potions (mor)
  { id: 't1', position: [12, 1.2, 26], kind: 'teleport' },
  { id: 't2', position: [-15, 1.2, 85], kind: 'teleport' },
  { id: 't3', position: [-70, 1.2, 55], kind: 'teleport' },
]

const PICKUP_RADIUS = 1.8
const RESPAWN_COOLDOWN = 35 // saniye

export default function SurprisePotions() {
  return (
    <>
      {SPAWNS.map((s) => (
        <PotionItem key={s.id} spawn={s} />
      ))}
    </>
  )
}

function PotionItem({ spawn }: { spawn: PotionSpawn }) {
  const groupRef = useRef<Group>(null)
  const bottleRef = useRef<Mesh>(null)
  const [availableAt, setAvailableAt] = useState(0)
  const activateJumpBoost = useGameStore((s) => s.activateJumpBoost)
  const grantTeleport = useGameStore((s) => s.grantTeleport)

  const color = spawn.kind === 'jump' ? '#06d6a0' : '#c77dff'
  const emissive = spawn.kind === 'jump' ? '#0fd78f' : '#9d4edd'
  const labelEmoji = spawn.kind === 'jump' ? '⬆️' : '✨'

  useFrame((state) => {
    const nowS = state.clock.elapsedTime
    const available = nowS >= availableAt
    const group = groupRef.current
    if (!group) return

    group.visible = available
    if (!available) return

    // Float bob + rotate
    group.position.y = spawn.position[1] + Math.sin(nowS * 2) * 0.18
    group.rotation.y += 0.03

    // Pickup check
    const pp = getPlayerPos()
    if (!pp) return
    const dx = pp.x - spawn.position[0]
    const dz = pp.z - spawn.position[2]
    const dy = pp.y - spawn.position[1]
    if (Math.abs(dy) > 3) return
    if (Math.hypot(dx, dz) > PICKUP_RADIUS) return

    // Pickup!
    if (spawn.kind === 'jump') {
      activateJumpBoost(15)
      playPotion('speed')
    } else {
      grantTeleport(3)
      playPotion('grow')
    }
    spawnImpact(
      spawn.position[0],
      spawn.position[1] + 0.5,
      spawn.position[2],
      color,
      1.2
    )
    setAvailableAt(nowS + RESPAWN_COOLDOWN)
  })

  return (
    <group ref={groupRef} position={spawn.position}>
      {/* Emissive halo */}
      <mesh scale={1.4}>
        <sphereGeometry args={[0.35, 10, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>

      {/* Bottle body */}
      <mesh ref={bottleRef} position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.55, 14]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.6}
          metalness={0.2}
          roughness={0.3}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Bottle neck */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 0.2, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Cork */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.11, 0.12, 8]} />
        <meshToonMaterial color="#8d6e63" />
      </mesh>

      {/* Floating icon label */}
      <IconLabel emoji={labelEmoji} />
    </group>
  )
}

function IconLabel({ emoji }: { emoji: string }) {
  // Use a small sphere as an "icon background" visible from distance
  return (
    <group position={[0, 1.05, 0]}>
      <mesh>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.22]}>
        <sphereGeometry args={[0.001, 4, 4]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <group position={[0, 0, 0.23]}>
        {/* Emoji via very tiny transparent plane is hard; use colored marker instead */}
        {emoji === '⬆️' ? (
          <>
            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[0.08, 0.14, 0.01]} />
              <meshBasicMaterial color="#0fd78f" />
            </mesh>
            <mesh position={[0, 0.06, 0]}>
              <coneGeometry args={[0.1, 0.12, 3]} />
              <meshBasicMaterial color="#0fd78f" />
            </mesh>
          </>
        ) : (
          <>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.18, 0.04, 0.01]} />
              <meshBasicMaterial color="#c77dff" />
            </mesh>
            <mesh rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.18, 0.04, 0.01]} />
              <meshBasicMaterial color="#c77dff" />
            </mesh>
            <mesh>
              <boxGeometry args={[0.22, 0.05, 0.01]} />
              <meshBasicMaterial color="#c77dff" />
            </mesh>
          </>
        )}
      </group>
    </group>
  )
}

// Teleport destinations for random teleport
export const TELEPORT_POINTS: [number, number, number][] = [
  [0, 3, 0], // safe zone
  [0, 3, 26], // arena center
  [18, 5, -6], // building base
  [-16, 5, -4], // spiral stairs
  [-42, 5, 22], // hupa lupa
  [60, 3, -5], // village
  [-15, 3, 85], // beach
  [-70, 3, 55], // lake
  [0, 32, -70], // balloon palace
  [42, 3, 18], // balloon landing
]
