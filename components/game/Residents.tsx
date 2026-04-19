'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import { getGameHour } from './DayNightCycle'

// Köy sakinleri — NPC'ler. Oyuncu zarar veremez (creatureRegistry'de değiller)
// Gündüz dünyada gezer, akşam (18:00+) evlerine döner

type Resident = {
  id: string
  color: string
  hatColor: string
  height: number
  home: [number, number]
  speed: number
}

const VILLAGE_CENTER: [number, number] = [60, -5]
const WANDER_TARGETS: [number, number][] = [
  [0, 0], // safe zone
  [-15, 85], // beach
  [-70, 55], // lake
  [0, 26], // arena outskirts
  [-42, 22], // hupa lupa
]

const RESIDENTS: Resident[] = [
  { id: 'r1', color: '#8d6e63', hatColor: '#3e2723', height: 1.6, home: [62, -3], speed: 1.6 },
  { id: 'r2', color: '#ef476f', hatColor: '#7b2cbf', height: 1.55, home: [58, -2], speed: 1.5 },
  { id: 'r3', color: '#118ab2', hatColor: '#023e8a', height: 1.0, home: [60, -6], speed: 1.8 },
  { id: 'r4', color: '#06d6a0', hatColor: '#f4a261', height: 0.9, home: [64, -5], speed: 1.9 },
  { id: 'r5', color: '#ffd166', hatColor: '#d62828', height: 1.4, home: [56, -7], speed: 1.5 },
  { id: 'r6', color: '#ba68c8', hatColor: '#1a5e8f', height: 1.5, home: [62, -8], speed: 1.6 },
]

export default function Residents() {
  return (
    <>
      {RESIDENTS.map((r) => (
        <ResidentFigure key={r.id} resident={r} />
      ))}
    </>
  )
}

function ResidentFigure({ resident }: { resident: Resident }) {
  const groupRef = useRef<Group>(null)
  const pos = useRef(new Vector3(resident.home[0], 0, resident.home[1]))
  const targetPos = useRef(new Vector3(resident.home[0], 0, resident.home[1]))
  const nextTargetAt = useRef(0)
  const walkPhase = useRef(Math.random() * Math.PI * 2)
  const isHome = useRef(true)

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const now = state.clock.elapsedTime
    const hour = getGameHour()
    const goHome = hour < 7 || hour > 18

    // Target selection
    if (now > nextTargetAt.current) {
      if (goHome) {
        targetPos.current.set(resident.home[0], 0, resident.home[1])
        isHome.current = false
      } else {
        // Pick a random wander target
        const t = WANDER_TARGETS[Math.floor(Math.random() * WANDER_TARGETS.length)]
        // Small jitter
        targetPos.current.set(
          t[0] + (Math.random() - 0.5) * 6,
          0,
          t[1] + (Math.random() - 0.5) * 6
        )
      }
      nextTargetAt.current = now + 8 + Math.random() * 12
    }

    // Walk toward target
    const dx = targetPos.current.x - pos.current.x
    const dz = targetPos.current.z - pos.current.z
    const dist = Math.hypot(dx, dz)
    const arriveDist = 1.5
    if (dist > arriveDist) {
      const nx = dx / dist
      const nz = dz / dist
      pos.current.x += nx * resident.speed * delta
      pos.current.z += nz * resident.speed * delta
      walkPhase.current += delta * 5
    } else if (goHome) {
      isHome.current = true
    }

    // Face direction
    const yaw = Math.atan2(dx, dz)

    // Apply to group
    groupRef.current.position.x = pos.current.x
    groupRef.current.position.z = pos.current.z
    groupRef.current.position.y = isHome.current
      ? 0
      : Math.abs(Math.sin(walkPhase.current)) * 0.1 * resident.height
    groupRef.current.rotation.y = yaw

    // Leg swing
    const legL = groupRef.current.children[2] as Group | undefined
    const legR = groupRef.current.children[3] as Group | undefined
    const swing = Math.sin(walkPhase.current) * 0.4 * (dist > arriveDist ? 1 : 0)
    if (legL) legL.rotation.x = swing
    if (legR) legR.rotation.x = -swing
  })

  const h = resident.height

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0.6 * h, 0]} castShadow>
        <capsuleGeometry args={[0.2 * h, 0.6 * h, 6, 10]} />
        <meshToonMaterial color={resident.color} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.2 * h, 0]} castShadow>
        <sphereGeometry args={[0.22 * h, 14, 14]} />
        <meshToonMaterial color="#ffd89c" />
      </mesh>
      {/* Left leg (group for rotation) */}
      <group position={[0.1 * h, 0.3 * h, 0]}>
        <mesh position={[0, -0.15 * h, 0]} castShadow>
          <cylinderGeometry args={[0.08 * h, 0.08 * h, 0.4 * h, 6]} />
          <meshToonMaterial color="#2d3436" />
        </mesh>
      </group>
      {/* Right leg */}
      <group position={[-0.1 * h, 0.3 * h, 0]}>
        <mesh position={[0, -0.15 * h, 0]} castShadow>
          <cylinderGeometry args={[0.08 * h, 0.08 * h, 0.4 * h, 6]} />
          <meshToonMaterial color="#2d3436" />
        </mesh>
      </group>
      {/* Arms */}
      <mesh position={[0.25 * h, 0.7 * h, 0]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.06 * h, 0.35 * h, 5, 8]} />
        <meshToonMaterial color={resident.color} />
      </mesh>
      <mesh position={[-0.25 * h, 0.7 * h, 0]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.06 * h, 0.35 * h, 5, 8]} />
        <meshToonMaterial color={resident.color} />
      </mesh>
      {/* Hat */}
      <mesh position={[0, 1.4 * h, 0]} castShadow>
        <coneGeometry args={[0.24 * h, 0.35 * h, 8]} />
        <meshToonMaterial color={resident.hatColor} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.08 * h, 1.23 * h, 0.19 * h]}>
        <sphereGeometry args={[0.04 * h, 8, 8]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.08 * h, 1.23 * h, 0.19 * h]}>
        <sphereGeometry args={[0.04 * h, 8, 8]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Mouth — tiny smile */}
      <mesh position={[0, 1.13 * h, 0.2 * h]}>
        <boxGeometry args={[0.08 * h, 0.02 * h, 0.01]} />
        <meshBasicMaterial color="#b23a48" />
      </mesh>
    </group>
  )
}
