'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

// Gökyüzü trafiği: uçak, Süperman, roket
// Rastgele aralıklarla geçerler

type FlyerState = {
  active: boolean
  startT: number
  duration: number
  startPos: [number, number, number]
  endPos: [number, number, number]
  kind: 'plane' | 'superman' | 'rocket'
}

export default function SkyTraffic() {
  const [flyers, setFlyers] = useState<FlyerState[]>([])
  const nextPlaneAt = useRef(Date.now() / 1000 + 20)
  const nextSupermanAt = useRef(Date.now() / 1000 + 35)
  const nextRocketAt = useRef(Date.now() / 1000 + 60)

  useFrame((state) => {
    const now = Date.now() / 1000
    let triggered = false

    // Plane: every 35-55 seconds
    if (now > nextPlaneAt.current) {
      const startX = Math.random() > 0.5 ? -150 : 150
      const endX = -startX
      const y = 50 + Math.random() * 15
      const z = -80 + Math.random() * 160
      setFlyers((prev) => [
        ...prev,
        {
          active: true,
          startT: now,
          duration: 14,
          startPos: [startX, y, z],
          endPos: [endX, y, z],
          kind: 'plane',
        },
      ])
      nextPlaneAt.current = now + 35 + Math.random() * 20
      triggered = true
    }

    // Superman: every 45-70 seconds
    if (now > nextSupermanAt.current) {
      const dirX = Math.random() > 0.5 ? 1 : -1
      const y = 40 + Math.random() * 12
      const z = -60 + Math.random() * 120
      setFlyers((prev) => [
        ...prev,
        {
          active: true,
          startT: now,
          duration: 8,
          startPos: [-dirX * 140, y, z],
          endPos: [dirX * 140, y, z + (Math.random() - 0.5) * 20],
          kind: 'superman',
        },
      ])
      nextSupermanAt.current = now + 45 + Math.random() * 25
      triggered = true
    }

    // Rocket: every 70-110 seconds
    if (now > nextRocketAt.current) {
      const startX = -40 + Math.random() * 80
      const startZ = -40 + Math.random() * 80
      setFlyers((prev) => [
        ...prev,
        {
          active: true,
          startT: now,
          duration: 10,
          startPos: [startX, 0, startZ],
          endPos: [startX + (Math.random() - 0.5) * 20, 120, startZ + (Math.random() - 0.5) * 20],
          kind: 'rocket',
        },
      ])
      nextRocketAt.current = now + 70 + Math.random() * 40
      triggered = true
    }

    // Clean up expired
    if (triggered || Math.random() < 0.01) {
      setFlyers((prev) => prev.filter((f) => now - f.startT < f.duration))
    }

    void state
  })

  return (
    <>
      {flyers.map((f, i) => (
        <Flyer key={`${f.startT}-${i}`} flyer={f} />
      ))}
    </>
  )
}

function Flyer({ flyer }: { flyer: FlyerState }) {
  const groupRef = useRef<Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    const now = Date.now() / 1000
    const elapsed = now - flyer.startT
    const t = Math.min(1, elapsed / flyer.duration)
    const x = flyer.startPos[0] + (flyer.endPos[0] - flyer.startPos[0]) * t
    const y = flyer.startPos[1] + (flyer.endPos[1] - flyer.startPos[1]) * t
    const z = flyer.startPos[2] + (flyer.endPos[2] - flyer.startPos[2]) * t
    groupRef.current.position.set(x, y, z)

    if (flyer.kind === 'plane' || flyer.kind === 'superman') {
      const dx = flyer.endPos[0] - flyer.startPos[0]
      const dz = flyer.endPos[2] - flyer.startPos[2]
      // Plane/Superman mesh'inin forward yönü local +X (yana duran cylinder).
      // Movement yönüne +X hizalamak için atan2(dx,dz) - π/2 offset.
      groupRef.current.rotation.y = Math.atan2(dx, dz) - Math.PI / 2
    } else if (flyer.kind === 'rocket') {
      groupRef.current.rotation.x = 0
    }
  })

  if (flyer.kind === 'plane') return <Plane groupRef={groupRef} />
  if (flyer.kind === 'superman') return <Superman groupRef={groupRef} />
  if (flyer.kind === 'rocket') return <Rocket groupRef={groupRef} />
  return null
}

function Plane({ groupRef }: { groupRef: React.RefObject<Group | null> }) {
  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.6, 0.4, 7, 10]} />
        <meshToonMaterial color="#e5e7eb" />
      </mesh>
      {/* Nose cone */}
      <mesh position={[3.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.4, 1, 10]} />
        <meshToonMaterial color="#d1d5db" />
      </mesh>
      {/* Wings */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2, 0.2, 6]} />
        <meshToonMaterial color="#3b82f6" />
      </mesh>
      {/* Tail */}
      <mesh position={[-3, 0.5, 0]}>
        <boxGeometry args={[1.2, 1.2, 0.2]} />
        <meshToonMaterial color="#3b82f6" />
      </mesh>
      {/* Horizontal stabilizer */}
      <mesh position={[-3, 0, 0]}>
        <boxGeometry args={[1.2, 0.15, 2]} />
        <meshToonMaterial color="#3b82f6" />
      </mesh>
      {/* Cockpit windows */}
      <mesh position={[2.5, 0.35, 0]}>
        <boxGeometry args={[1, 0.3, 0.9]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
      {/* Contrail */}
      <mesh position={[-5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.4, 6, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

function Superman({ groupRef }: { groupRef: React.RefObject<Group | null> }) {
  return (
    <group ref={groupRef}>
      {/* Body horizontal (flying pose) */}
      <group rotation={[0, 0, Math.PI / 2]}>
        {/* Torso */}
        <mesh>
          <capsuleGeometry args={[0.5, 1, 6, 10]} />
          <meshToonMaterial color="#1e40af" />
        </mesh>
        {/* Red S on chest */}
        <mesh position={[0, 0, 0.52]}>
          <boxGeometry args={[0.4, 0.5, 0.05]} />
          <meshBasicMaterial color="#dc2626" />
        </mesh>
        {/* Head */}
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.45, 14, 14]} />
          <meshToonMaterial color="#ffd89c" />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 1.3, 0.1]}>
          <sphereGeometry args={[0.35, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color="#1f2937" />
        </mesh>
        {/* Fists forward */}
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, -0.3]}>
          <sphereGeometry args={[0.2, 10, 10]} />
          <meshToonMaterial color="#ffd89c" />
        </mesh>
        {/* Legs back */}
        <mesh position={[0, -1.1, 0]}>
          <capsuleGeometry args={[0.2, 0.6, 5, 8]} />
          <meshToonMaterial color="#1e40af" />
        </mesh>
      </group>
      {/* Red cape flowing behind */}
      <mesh position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[2, 1.8]} />
        <meshBasicMaterial color="#dc2626" side={2} />
      </mesh>
    </group>
  )
}

function Rocket({ groupRef }: { groupRef: React.RefObject<Group | null> }) {
  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.8, 4, 14]} />
        <meshToonMaterial color="#f3f4f6" />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 4.8, 0]} castShadow>
        <coneGeometry args={[0.6, 1.5, 14]} />
        <meshToonMaterial color="#dc2626" />
      </mesh>
      {/* Fins */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((ang, i) => (
        <mesh
          key={i}
          position={[Math.cos(ang) * 0.7, 0.5, Math.sin(ang) * 0.7]}
          rotation={[0, -ang, 0]}
          castShadow
        >
          <boxGeometry args={[0.1, 1, 0.6]} />
          <meshToonMaterial color="#ef4444" />
        </mesh>
      ))}
      {/* Window */}
      <mesh position={[0, 3, 0.82]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshBasicMaterial color="#60a5fa" />
      </mesh>
      {/* Exhaust flame */}
      <mesh position={[0, -1, 0]}>
        <coneGeometry args={[0.7, 2, 12]} />
        <meshBasicMaterial color="#fb923c" />
      </mesh>
      <mesh position={[0, -1.8, 0]}>
        <coneGeometry args={[0.4, 1.2, 10]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      {/* Smoke trail */}
      <mesh position={[0, -3.5, 0]}>
        <cylinderGeometry args={[0.3, 1.5, 3, 10]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>
    </group>
  )
}
