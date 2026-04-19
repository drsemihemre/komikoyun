'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { Mesh } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { spawnImpact } from '@/lib/particles'
import { playTeleportGun } from '@/lib/sounds'

// Mario tipi yeşil tüpler — paired portals
type Pipe = {
  id: string
  position: [number, number, number]
  pairId: string
}

const PIPES: Pipe[] = [
  { id: 'A', position: [-35, 0, -55], pairId: 'B' },
  { id: 'B', position: [40, 0, -55], pairId: 'A' },
]

const TRIGGER_R = 2.2
const COOLDOWN = 2.2

export default function MarioPipes() {
  return (
    <>
      {PIPES.map((p) => (
        <MarioPipe
          key={p.id}
          pipe={p}
          pair={PIPES.find((q) => q.id === p.pairId)!}
        />
      ))}
    </>
  )
}

function MarioPipe({ pipe, pair }: { pipe: Pipe; pair: Pipe }) {
  const lidRef = useRef<Mesh>(null)
  const lastUseRef = useRef(0)

  useFrame((state) => {
    const now = state.clock.elapsedTime
    if (lidRef.current) {
      lidRef.current.position.y =
        3.1 + Math.sin(now * 2 + pipe.position[0]) * 0.04
    }

    const player = getPlayerHandle()
    if (!player) return
    const pp = player.getPos()
    if (!pp) return
    if (now - lastUseRef.current < COOLDOWN) return

    const dx = pp.x - pipe.position[0]
    const dz = pp.z - pipe.position[2]
    const dist = Math.hypot(dx, dz)
    if (dist > TRIGGER_R) return
    if (pp.y > pipe.position[1] + 5.5) return
    if (pp.y < pipe.position[1] - 1) return

    lastUseRef.current = now
    spawnImpact(pipe.position[0], pipe.position[1] + 2, pipe.position[2], '#06d6a0', 1.5)
    spawnImpact(
      pair.position[0],
      pair.position[1] + 2,
      pair.position[2],
      '#06d6a0',
      1.5
    )
    playTeleportGun()

    // Eş tüpün üstüne ışınlan
    player.teleportTo(pair.position[0], pair.position[1] + 4, pair.position[2])
  })

  const [x, , z] = pipe.position

  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.0, 1.5, 1.0]} position={[0, 1.5, 0]} />
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1, 1, 3, 18]} />
          <meshToonMaterial color="#16a34a" />
        </mesh>
        <mesh position={[0, 2.95, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.3, 18]} />
          <meshToonMaterial color="#15803d" />
        </mesh>
        <mesh ref={lidRef} position={[0, 3.1, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 0.35, 20]} />
          <meshToonMaterial color="#22c55e" />
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.1, 16]} />
          <meshBasicMaterial color="#0a0a0a" />
        </mesh>
        {/* Side stripes */}
        <mesh position={[1.01, 2, 0]}>
          <boxGeometry args={[0.1, 0.25, 0.3]} />
          <meshToonMaterial color="#15803d" />
        </mesh>
        <mesh position={[-1.01, 2, 0]}>
          <boxGeometry args={[0.1, 0.25, 0.3]} />
          <meshToonMaterial color="#15803d" />
        </mesh>
      </RigidBody>
    </group>
  )
}
