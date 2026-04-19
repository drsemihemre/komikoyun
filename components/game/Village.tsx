'use client'

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Html } from '@react-three/drei'
import { Vector3, type Group } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { useGameStore } from '@/lib/store'
import { playPotion } from '@/lib/sounds'
import { spawnImpact } from '@/lib/particles'

const VILLAGE_CENTER: [number, number, number] = [60, 0, -5]

type House = {
  x: number
  z: number
  rotY: number
  w: number // width
  d: number // depth
  h: number // height
  wall: string
  roof: string
  doorRot: number // 0=front, π/2=right, π=back, 3π/2=left
  pickupKind: 'score' | 'hp' | 'potion'
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
    for (let i = 0; i < 8; i++) {
      // Ring layout — houses spaced on a circle around village center
      const ang = (i / 8) * Math.PI * 2
      const r = 12
      const x = Math.cos(ang) * r
      const z = Math.sin(ang) * r
      // Door faces village center
      const rotY = ang + Math.PI // face outward body, but door on village-center side
      const doorRot = Math.PI // door on the front (facing village center after rotY applied)
      list.push({
        x,
        z,
        rotY,
        w: 6,
        d: 6,
        h: 4,
        wall: WALLS[i % WALLS.length],
        roof: ROOFS[(i + 2) % ROOFS.length],
        doorRot,
        pickupKind: (['score', 'hp', 'potion'] as const)[i % 3],
      })
    }
    void rand
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
        <circleGeometry args={[26, 40]} />
        <meshToonMaterial color="#d7cba7" />
      </mesh>
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[25.5, 26, 40]} />
        <meshBasicMaterial color="#a68759" />
      </mesh>

      {/* Welcome sign */}
      <group position={[0, 0, -22]}>
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
        <House key={i} {...h} id={`h${i}`} />
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
  pickupKind,
  id,
}: House & { id: string }) {
  const WALL_T = 0.25
  const DOOR_W = 2.0

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {/* 4 duvar — ön cephede (z=+d/2) kapı boşluğu */}
        {/* Arka duvar (−z) */}
        <CuboidCollider
          args={[w / 2, h / 2, WALL_T / 2]}
          position={[0, h / 2, -d / 2]}
        />
        <mesh position={[0, h / 2, -d / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, WALL_T]} />
          <meshToonMaterial color={wall} />
        </mesh>
        {/* Sol duvar (−x) */}
        <CuboidCollider
          args={[WALL_T / 2, h / 2, d / 2]}
          position={[-w / 2, h / 2, 0]}
        />
        <mesh position={[-w / 2, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WALL_T, h, d]} />
          <meshToonMaterial color={wall} />
        </mesh>
        {/* Sağ duvar (+x) */}
        <CuboidCollider
          args={[WALL_T / 2, h / 2, d / 2]}
          position={[w / 2, h / 2, 0]}
        />
        <mesh position={[w / 2, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WALL_T, h, d]} />
          <meshToonMaterial color={wall} />
        </mesh>
        {/* Ön duvar iki parça + kapı üstü — kapı boşluğu ortada */}
        <CuboidCollider
          args={[(w - DOOR_W) / 4, h / 2, WALL_T / 2]}
          position={[-(w + DOOR_W) / 4, h / 2, d / 2]}
        />
        <mesh
          position={[-(w + DOOR_W) / 4, h / 2, d / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[(w - DOOR_W) / 2, h, WALL_T]} />
          <meshToonMaterial color={wall} />
        </mesh>
        <CuboidCollider
          args={[(w - DOOR_W) / 4, h / 2, WALL_T / 2]}
          position={[(w + DOOR_W) / 4, h / 2, d / 2]}
        />
        <mesh
          position={[(w + DOOR_W) / 4, h / 2, d / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[(w - DOOR_W) / 2, h, WALL_T]} />
          <meshToonMaterial color={wall} />
        </mesh>
        {/* Kapı üstü — kapı boşluğunun üst kısmı */}
        <CuboidCollider
          args={[DOOR_W / 2, (h - 2.2) / 2, WALL_T / 2]}
          position={[0, h - (h - 2.2) / 2, d / 2]}
        />
        <mesh
          position={[0, h - (h - 2.2) / 2, d / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[DOOR_W, h - 2.2, WALL_T]} />
          <meshToonMaterial color={wall} />
        </mesh>

        {/* Çatı */}
        <mesh position={[0, h + 0.9, 0]} castShadow>
          <coneGeometry args={[Math.max(w, d) * 0.8, 1.8, 4]} />
          <meshToonMaterial color={roof} />
        </mesh>
        <mesh position={[0, h + 1.9, 0]}>
          <sphereGeometry args={[0.18, 8, 8]} />
          <meshToonMaterial color="#ffd60a" />
        </mesh>

        {/* Pencereler — yan duvarlarda */}
        <mesh position={[-w / 2 + 0.01, h * 0.6, -d / 4]}>
          <boxGeometry args={[0.02, 1, 1.2]} />
          <meshBasicMaterial color="#90e0ef" />
        </mesh>
        <mesh position={[-w / 2 + 0.01, h * 0.6, d / 4]}>
          <boxGeometry args={[0.02, 1, 1.2]} />
          <meshBasicMaterial color="#90e0ef" />
        </mesh>
        <mesh position={[w / 2 - 0.01, h * 0.6, -d / 4]}>
          <boxGeometry args={[0.02, 1, 1.2]} />
          <meshBasicMaterial color="#90e0ef" />
        </mesh>
        <mesh position={[w / 2 - 0.01, h * 0.6, d / 4]}>
          <boxGeometry args={[0.02, 1, 1.2]} />
          <meshBasicMaterial color="#90e0ef" />
        </mesh>

        {/* Baca */}
        <mesh position={[w / 3, h + 1.2, d / 4]} castShadow>
          <boxGeometry args={[0.5, 1.2, 0.5]} />
          <meshToonMaterial color="#795548" />
        </mesh>

        {/* İç zemin — halı */}
        <mesh
          position={[0, 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[w - 0.5, d - 0.5]} />
          <meshToonMaterial color="#8b4513" />
        </mesh>

        {/* Kapı çerçevesi (görsel) */}
        <mesh position={[0, 1, d / 2 + 0.01]}>
          <boxGeometry args={[DOOR_W, 2.2, 0.05]} />
          <meshBasicMaterial color="#8b4513" transparent opacity={0.2} />
        </mesh>
      </RigidBody>

      {/* İç pickup — her ev farklı tip */}
      <HousePickup kind={pickupKind} localPos={[0, 0.6, 0]} id={id} />
    </group>
  )
}

function HousePickup({
  kind,
  localPos,
  id,
}: {
  kind: 'score' | 'hp' | 'potion'
  localPos: [number, number, number]
  id: string
}) {
  const groupRef = useRef<Group>(null)
  const [pickedAt, setPickedAt] = useState(-999)
  const worldPosRef = useRef(new Vector3())

  const color =
    kind === 'score' ? '#ffd60a' : kind === 'hp' ? '#ef476f' : '#c77dff'
  const icon = kind === 'score' ? '⭐' : kind === 'hp' ? '❤️' : '🎁'

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const g = groupRef.current
    if (!g) return

    const available = t - pickedAt > 60
    g.visible = available
    if (!available) return

    g.rotation.y += 0.02
    g.position.y = localPos[1] + Math.sin(t * 2.2) * 0.15

    g.getWorldPosition(worldPosRef.current)
    const wp = worldPosRef.current

    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - wp.x
    const dz = pp.z - wp.z
    const dy = Math.abs(pp.y - wp.y)
    if (dy > 2.5) return
    if (Math.hypot(dx, dz) > 1.8) return

    setPickedAt(t)
    spawnImpact(wp.x, wp.y + 0.3, wp.z, color, 1.2)
    const store = useGameStore.getState()
    if (kind === 'score') {
      store.addScore(100)
      playPotion('grow')
    } else if (kind === 'hp') {
      store.healPlayer(40)
      playPotion('shrink')
    } else {
      if (Math.random() > 0.5) {
        store.grantTeleport(3)
      } else {
        store.activateJumpBoost(20)
      }
      playPotion('speed')
    }
  })

  return (
    <group ref={groupRef} position={localPos}>
      <mesh>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.5}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
      <Html
        position={[0, 0.7, 0]}
        center
        distanceFactor={8}
        zIndexRange={[10, 0]}
      >
        <div className="pointer-events-none whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-sm text-white shadow">
          {icon} {kind === 'score' ? '+100' : kind === 'hp' ? 'HP+40' : '🎁'}
        </div>
      </Html>
      {/* id silently used for React key stability */}
      <mesh visible={false}>
        <boxGeometry args={[0.001, 0.001, 0.001]} />
        <meshBasicMaterial />
      </mesh>
      <group userData={{ id }} />
    </group>
  )
}
