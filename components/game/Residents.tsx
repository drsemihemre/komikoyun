'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import { getGameHour } from './DayNightCycle'

// Köy sakinleri — NPC'ler. Creature değiller, zarar verilemez
// Gündüz (06-19) haritayı gezerler, gece (19-06) evlerine dönüp içeri girerler (görünmez)

type Resident = {
  id: string
  color: string
  hatColor: string
  height: number
  home: [number, number]
  speed: number
}

const WANDER_TARGETS: [number, number][] = [
  [0, 0],
  [-15, 85],
  [-70, 55],
  [0, 26],
  [-42, 22],
  [12, 10],
  [30, 0],
]

// Her sakinin evi farklı bir ev konumunda
const RESIDENTS: Resident[] = [
  { id: 'r1', color: '#8d6e63', hatColor: '#3e2723', height: 1.65, home: [53, -12], speed: 2.6 },
  { id: 'r2', color: '#ef476f', hatColor: '#7b2cbf', height: 1.55, home: [60, -12], speed: 2.4 },
  { id: 'r3', color: '#118ab2', hatColor: '#023e8a', height: 1.1, home: [67, -12], speed: 2.9 },
  { id: 'r4', color: '#06d6a0', hatColor: '#f4a261', height: 0.95, home: [53, -5], speed: 3.1 },
  { id: 'r5', color: '#ffd166', hatColor: '#d62828', height: 1.45, home: [67, -5], speed: 2.5 },
  { id: 'r6', color: '#ba68c8', hatColor: '#1a5e8f', height: 1.5, home: [53, 2], speed: 2.6 },
  { id: 'r7', color: '#f4a261', hatColor: '#e63946', height: 1.6, home: [60, 2], speed: 2.7 },
  { id: 'r8', color: '#4dd0e1', hatColor: '#5a189a', height: 1.0, home: [67, 2], speed: 3.0 },
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
  const pos = useRef(
    new Vector3(resident.home[0], 0, resident.home[1])
  )
  const targetPos = useRef(
    new Vector3(resident.home[0], 0, resident.home[1])
  )
  const nextTargetAt = useRef(0)
  const walkPhase = useRef(Math.random() * Math.PI * 2)
  const atHome = useRef(true)
  const currentYaw = useRef(0)

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const now = state.clock.elapsedTime
    const hour = getGameHour()
    const goHome = hour < 7 || hour > 18

    // Target selection
    if (now > nextTargetAt.current) {
      if (goHome) {
        targetPos.current.set(resident.home[0], 0, resident.home[1])
        atHome.current = false
      } else {
        // Rastgele gezinti noktası
        const t =
          WANDER_TARGETS[Math.floor(Math.random() * WANDER_TARGETS.length)]
        targetPos.current.set(
          t[0] + (Math.random() - 0.5) * 10,
          0,
          t[1] + (Math.random() - 0.5) * 10
        )
        atHome.current = false
      }
      nextTargetAt.current = now + 5 + Math.random() * 8
    }

    // Walk toward target
    const dx = targetPos.current.x - pos.current.x
    const dz = targetPos.current.z - pos.current.z
    const dist = Math.hypot(dx, dz)
    const arriveDist = 1.2
    if (dist > arriveDist) {
      const nx = dx / dist
      const nz = dz / dist
      pos.current.x += nx * resident.speed * delta
      pos.current.z += nz * resident.speed * delta
      walkPhase.current += delta * 5.5
      const targetYaw = Math.atan2(dx, dz)
      // Yaw smoothing
      const diff =
        ((targetYaw - currentYaw.current + Math.PI) % (Math.PI * 2) +
          Math.PI * 2) %
          (Math.PI * 2) -
        Math.PI
      currentYaw.current += diff * 0.15
    } else {
      // Arrived
      if (goHome) {
        atHome.current = true
      }
      // Hemen yeni hedef seç (bekleme azalt)
      if (nextTargetAt.current > now + 2) {
        nextTargetAt.current = now + 0.5 + Math.random() * 2
      }
    }

    // Apply to group
    groupRef.current.position.x = pos.current.x
    groupRef.current.position.z = pos.current.z
    groupRef.current.position.y = atHome.current
      ? 0
      : Math.abs(Math.sin(walkPhase.current)) * 0.1 * resident.height
    groupRef.current.rotation.y = currentYaw.current

    // Ev içinde gece → görünmez, gündüz → görünür
    groupRef.current.visible = !(goHome && atHome.current)

    // Leg swing (children indices 2 and 3)
    const children = groupRef.current.children
    const legL = children[2] as Group | undefined
    const legR = children[3] as Group | undefined
    const swing = Math.sin(walkPhase.current) * 0.4 * (dist > arriveDist ? 1 : 0)
    if (legL) legL.rotation.x = swing
    if (legR) legR.rotation.x = -swing
  })

  const h = resident.height

  return (
    <group ref={groupRef}>
      {/* Body (index 0) */}
      <mesh position={[0, 0.6 * h, 0]} castShadow>
        <capsuleGeometry args={[0.2 * h, 0.6 * h, 6, 10]} />
        <meshToonMaterial color={resident.color} />
      </mesh>
      {/* Head (index 1) */}
      <mesh position={[0, 1.2 * h, 0]} castShadow>
        <sphereGeometry args={[0.22 * h, 14, 14]} />
        <meshToonMaterial color="#ffd89c" />
      </mesh>
      {/* Left leg (index 2) */}
      <group position={[0.1 * h, 0.3 * h, 0]}>
        <mesh position={[0, -0.15 * h, 0]} castShadow>
          <cylinderGeometry args={[0.08 * h, 0.08 * h, 0.4 * h, 6]} />
          <meshToonMaterial color="#2d3436" />
        </mesh>
      </group>
      {/* Right leg (index 3) */}
      <group position={[-0.1 * h, 0.3 * h, 0]}>
        <mesh position={[0, -0.15 * h, 0]} castShadow>
          <cylinderGeometry args={[0.08 * h, 0.08 * h, 0.4 * h, 6]} />
          <meshToonMaterial color="#2d3436" />
        </mesh>
      </group>
      {/* Arms (index 4, 5) */}
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
      {/* Hat ring */}
      <mesh position={[0, 1.24 * h, 0]}>
        <torusGeometry args={[0.26 * h, 0.04 * h, 6, 14]} />
        <meshToonMaterial color={resident.hatColor} />
      </mesh>
      {/* Güzel yüz — beyaz göz + siyah pupil + kıvrık gülüş + yanak pembe */}
      <mesh position={[0.09 * h, 1.22 * h, 0.2 * h]}>
        <sphereGeometry args={[0.06 * h, 10, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.09 * h, 1.22 * h, 0.2 * h]}>
        <sphereGeometry args={[0.06 * h, 10, 10]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.09 * h, 1.23 * h, 0.235 * h]}>
        <sphereGeometry args={[0.035 * h, 8, 8]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.09 * h, 1.23 * h, 0.235 * h]}>
        <sphereGeometry args={[0.035 * h, 8, 8]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Kıvrık gülüş */}
      <mesh
        position={[0, 1.12 * h, 0.21 * h]}
        rotation={[Math.PI, 0, 0]}
      >
        <torusGeometry
          args={[0.07 * h, 0.014 * h, 5, 12, Math.PI]}
        />
        <meshBasicMaterial color="#b23a48" />
      </mesh>
      {/* Pembe yanaklar */}
      <mesh position={[0.16 * h, 1.16 * h, 0.17 * h]}>
        <sphereGeometry args={[0.045 * h, 8, 8]} />
        <meshBasicMaterial color="#ff8fab" transparent opacity={0.55} />
      </mesh>
      <mesh position={[-0.16 * h, 1.16 * h, 0.17 * h]}>
        <sphereGeometry args={[0.045 * h, 8, 8]} />
        <meshBasicMaterial color="#ff8fab" transparent opacity={0.55} />
      </mesh>
      {/* Küçük burun */}
      <mesh position={[0, 1.17 * h, 0.22 * h]}>
        <sphereGeometry args={[0.03 * h, 8, 8]} />
        <meshToonMaterial color="#e8a27a" />
      </mesh>
    </group>
  )
}
