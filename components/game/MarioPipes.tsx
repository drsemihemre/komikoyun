'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { Mesh } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { spawnImpact } from '@/lib/particles'
import { playTeleportGun } from '@/lib/sounds'

// Mario tüpler — tek yönlü: A girişi → B çıkışı
type Pipe = {
  id: string
  position: [number, number, number]
  destination?: [number, number, number] // doluysa girişte oraya ışınlar
  color: string
}

const PIPES: Pipe[] = [
  {
    id: 'A',
    position: [-35, 0, -55],
    destination: [40, 0, -55],
    color: '#16a34a', // yeşil giriş
  },
  {
    id: 'B',
    position: [40, 0, -55],
    color: '#dc2626', // kırmızı çıkış (tıkla → bir yere gitmez)
  },
]

const TRIGGER_R = 2.2
const COOLDOWN = 2.5

export default function MarioPipes() {
  return (
    <>
      {PIPES.map((p) => (
        <MarioPipe key={p.id} pipe={p} />
      ))}
    </>
  )
}

function MarioPipe({ pipe }: { pipe: Pipe }) {
  const lidRef = useRef<Mesh>(null)
  const lastUseRef = useRef(0)

  useFrame((state) => {
    const now = state.clock.elapsedTime
    if (lidRef.current) {
      lidRef.current.position.y =
        3.1 + Math.sin(now * 2 + pipe.position[0]) * 0.04
    }

    // Sadece destination'ı olan tüpler (giriş) ışınlar
    if (!pipe.destination) return

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
    spawnImpact(
      pipe.position[0],
      pipe.position[1] + 2,
      pipe.position[2],
      pipe.color,
      1.5
    )
    spawnImpact(
      pipe.destination[0],
      pipe.destination[1] + 2,
      pipe.destination[2],
      pipe.color,
      1.5
    )
    playTeleportGun()

    // Çıkış tüpünün yanına ışınla (üstüne değil — tetik tekrar etmesin)
    // Destination'ın 3m doğusuna
    player.teleportTo(
      pipe.destination[0] + 3,
      pipe.destination[1] + 2,
      pipe.destination[2]
    )
  })

  const [x, , z] = pipe.position

  return (
    <group position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[1.0, 1.5, 1.0]} position={[0, 1.5, 0]} />
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1, 1, 3, 18]} />
          <meshToonMaterial color={pipe.color} />
        </mesh>
        <mesh position={[0, 2.95, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.3, 18]} />
          <meshToonMaterial color={darkShade(pipe.color)} />
        </mesh>
        <mesh ref={lidRef} position={[0, 3.1, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 0.35, 20]} />
          <meshToonMaterial color={lightShade(pipe.color)} />
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.85, 0.85, 0.1, 16]} />
          <meshBasicMaterial color="#0a0a0a" />
        </mesh>
        {/* Giriş/çıkış ok işareti */}
        {pipe.destination ? (
          <>
            <mesh position={[0, 4, 0]} rotation={[0, 0, 0]}>
              <coneGeometry args={[0.25, 0.5, 3]} />
              <meshBasicMaterial color="#ffd60a" />
            </mesh>
          </>
        ) : (
          <mesh position={[0, 4, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.25, 0.5, 3]} />
            <meshBasicMaterial color="#ffd60a" />
          </mesh>
        )}
        {/* Yan şeritler */}
        <mesh position={[1.01, 2, 0]}>
          <boxGeometry args={[0.1, 0.25, 0.3]} />
          <meshToonMaterial color={darkShade(pipe.color)} />
        </mesh>
        <mesh position={[-1.01, 2, 0]}>
          <boxGeometry args={[0.1, 0.25, 0.3]} />
          <meshToonMaterial color={darkShade(pipe.color)} />
        </mesh>
      </RigidBody>
    </group>
  )
}

function darkShade(hex: string): string {
  // #16a34a → koyu varyant
  if (hex === '#16a34a') return '#15803d'
  if (hex === '#dc2626') return '#991b1b'
  return '#0f172a'
}

function lightShade(hex: string): string {
  if (hex === '#16a34a') return '#22c55e'
  if (hex === '#dc2626') return '#ef4444'
  return '#475569'
}
