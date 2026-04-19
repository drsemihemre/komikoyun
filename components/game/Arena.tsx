'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PointLight } from 'three'
import Creature, { type CreatureVariant } from './Creature'
import { ARENA } from '@/lib/store'

type Spawn = {
  id: string
  offset: [number, number]
  variant: CreatureVariant
  nocturnal?: boolean
}

// Oyuncu boyutuna yakın (1:1), tank 2x
// Not: player mesh ~1.5-1.8m, creature size=1 → ~1.2m. Yaklaşık eşitlemek için size=1.5
const BASE_SIZE = 1.5
const TANK_SIZE = 3.0

const CREATURES: Spawn[] = [
  {
    id: 'c1',
    offset: [5, 0],
    variant: {
      shape: 'round',
      color: '#f06292',
      hp: 1,
      speed: 2.5,
      size: BASE_SIZE,
    },
  },
  {
    id: 'c2',
    offset: [-5, 0],
    variant: {
      shape: 'horned',
      color: '#64b5f6',
      accentColor: '#0d47a1',
      hp: 2,
      speed: 2.3,
      size: BASE_SIZE * 1.05,
    },
  },
  {
    id: 'c3',
    offset: [0, 5],
    variant: {
      shape: 'jumper',
      color: '#81c784',
      accentColor: '#1b5e20',
      hp: 1,
      speed: 3.2,
      size: BASE_SIZE * 0.85,
    },
  },
  {
    id: 'c4',
    offset: [0, -5],
    variant: {
      shape: 'tank',
      color: '#ffb74d',
      accentColor: '#5d4037',
      hp: 3,
      speed: 1.6,
      size: TANK_SIZE,
    },
  },
  {
    id: 'c5',
    offset: [3.5, -3.5],
    variant: {
      shape: 'horned',
      color: '#ba68c8',
      accentColor: '#4a148c',
      hp: 2,
      speed: 2.4,
      size: BASE_SIZE,
    },
  },
  {
    id: 'c6',
    offset: [-3.5, 3.5],
    variant: {
      shape: 'jumper',
      color: '#ff8a65',
      accentColor: '#bf360c',
      hp: 1,
      speed: 3,
      size: BASE_SIZE * 0.9,
    },
  },
  {
    id: 'c7',
    offset: [7, 4],
    variant: {
      shape: 'round',
      color: '#4dd0e1',
      hp: 1,
      speed: 2.6,
      size: BASE_SIZE,
    },
  },
]

// Gece spesifik yaratıklar — 28 adet (toplam 7+28=35, yaklaşık 5×)
const NOCTURNAL_COLORS = [
  '#ef4444',
  '#f97316',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#eab308',
  '#ec4899',
  '#14b8a6',
]
const NOCTURNAL_SHAPES = ['round', 'horned', 'jumper'] as const

function generateNocturnal(): Spawn[] {
  let seed = 4321
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const list: Spawn[] = []
  for (let i = 0; i < 28; i++) {
    const ang = (i / 28) * Math.PI * 2
    const r = 3 + rand() * (ARENA.radius - 4)
    const shape = NOCTURNAL_SHAPES[Math.floor(rand() * NOCTURNAL_SHAPES.length)]
    const color = NOCTURNAL_COLORS[Math.floor(rand() * NOCTURNAL_COLORS.length)]
    const hp = shape === 'horned' ? 2 : 1
    const speed = shape === 'jumper' ? 2.8 + rand() * 0.8 : 2.2 + rand() * 0.8
    const size = BASE_SIZE * (0.8 + rand() * 0.45)
    list.push({
      id: `n${i}`,
      offset: [Math.cos(ang) * r, Math.sin(ang) * r],
      variant: {
        shape,
        color,
        accentColor: '#1a1a1a',
        hp,
        speed,
        size,
      },
      nocturnal: true,
    })
  }
  return list
}

const FENCE_POSTS = 18
const FENCE_RADIUS = ARENA.radius + 0.3
const FENCE_HEIGHT = 1.8
const STANDS_INNER_R = ARENA.radius + 1.2
const STANDS_OUTER_R = ARENA.radius + 6.5
const STANDS_TIERS = 3

const FLAG_COLORS = [
  '#ef476f',
  '#06d6a0',
  '#ffd166',
  '#118ab2',
  '#f4a261',
  '#c77dff',
]
const LIGHT_COLORS = ['#ff006e', '#8338ec', '#ffbe0b', '#3a86ff']

export default function Arena() {
  const [cx, , cz] = ARENA.center
  const nocturnal = useMemo(() => generateNocturnal(), [])

  return (
    <>
      {/* Floor */}
      <mesh
        position={[cx, 0.015, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[ARENA.radius, 48]} />
        <meshToonMaterial color="#f3d2f3" />
      </mesh>
      <mesh position={[cx, 0.025, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ARENA.radius - 0.5, ARENA.radius, 48]} />
        <meshBasicMaterial color="#7b2cbf" />
      </mesh>
      <mesh position={[cx, 0.05, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 1.2, 6]} />
        <meshBasicMaterial color="#7b2cbf" />
      </mesh>

      <Fence cx={cx} cz={cz} />
      <Stands cx={cx} cz={cz} />
      <LightPoles cx={cx} cz={cz} />
      <Banner cx={cx} cz={cz + ARENA.radius + 1.5} />

      {CREATURES.map((c) => (
        <Creature
          key={c.id}
          id={c.id}
          spawn={[cx + c.offset[0], 1.5, cz + c.offset[1]]}
          arenaCenter={[cx, 0, cz]}
          arenaRadius={ARENA.radius}
          variant={c.variant}
        />
      ))}

      {/* Nocturnal — sadece gece görünür, baştan havuz olarak yüklü */}
      {nocturnal.map((c) => (
        <Creature
          key={c.id}
          id={c.id}
          spawn={[cx + c.offset[0], 1.5, cz + c.offset[1]]}
          arenaCenter={[cx, 0, cz]}
          arenaRadius={ARENA.radius}
          variant={c.variant}
          nocturnal={c.nocturnal}
        />
      ))}
    </>
  )
}

function Fence({ cx, cz }: { cx: number; cz: number }) {
  const posts = []
  const bars = []
  const flags = []
  for (let i = 0; i < FENCE_POSTS; i++) {
    const angle = (i / FENCE_POSTS) * Math.PI * 2
    const isEntrance = angle > Math.PI * 0.45 && angle < Math.PI * 0.55
    if (isEntrance) continue

    const x = cx + Math.cos(angle) * FENCE_RADIUS
    const z = cz + Math.sin(angle) * FENCE_RADIUS

    posts.push(
      <mesh key={`p${i}`} position={[x, FENCE_HEIGHT / 2, z]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, FENCE_HEIGHT, 8]} />
        <meshToonMaterial color="#6f4518" />
      </mesh>
    )

    const flagColor = FLAG_COLORS[i % FLAG_COLORS.length]
    flags.push(
      <mesh
        key={`fl${i}`}
        position={[x + 0.15, FENCE_HEIGHT + 0.25, z]}
        rotation={[0, -angle, 0]}
        castShadow
      >
        <coneGeometry args={[0.12, 0.35, 3]} />
        <meshToonMaterial color={flagColor} />
      </mesh>
    )

    const nextI = (i + 1) % FENCE_POSTS
    const nextAngle = (nextI / FENCE_POSTS) * Math.PI * 2
    const nextIsEntrance =
      nextAngle > Math.PI * 0.45 && nextAngle < Math.PI * 0.55
    if (nextIsEntrance) continue
    const nx = cx + Math.cos(nextAngle) * FENCE_RADIUS
    const nz = cz + Math.sin(nextAngle) * FENCE_RADIUS
    const midX = (x + nx) / 2
    const midZ = (z + nz) / 2
    const barLen = Math.hypot(nx - x, nz - z)
    const barYaw = Math.atan2(nx - x, nz - z)
    bars.push(
      <group key={`b${i}`} position={[midX, 0, midZ]} rotation={[0, barYaw, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.1, 0.1, barLen]} />
          <meshToonMaterial color="#a0522d" />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <boxGeometry args={[0.1, 0.1, barLen]} />
          <meshToonMaterial color="#a0522d" />
        </mesh>
      </group>
    )
  }
  return (
    <group>
      {posts}
      {bars}
      {flags}
    </group>
  )
}

function Stands({ cx, cz }: { cx: number; cz: number }) {
  const elements = []
  const SEGMENTS = 28
  for (let i = 0; i < SEGMENTS; i++) {
    const t = i / SEGMENTS
    if (t > 0.4 && t < 0.6) continue
    const angle = t * Math.PI * 2
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)

    for (let tier = 0; tier < STANDS_TIERS; tier++) {
      const tierR =
        STANDS_INNER_R +
        (tier + 0.5) * ((STANDS_OUTER_R - STANDS_INNER_R) / STANDS_TIERS)
      const tierW = (STANDS_OUTER_R - STANDS_INNER_R) / STANDS_TIERS
      const tierH = 0.5 + tier * 0.7
      const x = cx + cosA * tierR
      const z = cz + sinA * tierR
      const segWidth = (2 * Math.PI * tierR) / SEGMENTS

      const tierColor =
        tier === 0 ? '#c77dff' : tier === 1 ? '#9d4edd' : '#7b2cbf'

      elements.push(
        <mesh
          key={`s${i}-${tier}`}
          position={[x, tierH / 2 + 0.1, z]}
          rotation={[0, -angle + Math.PI / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[tierW * 0.95, tierH, segWidth * 0.95]} />
          <meshToonMaterial color={tierColor} />
        </mesh>
      )
    }
  }
  return <group>{elements}</group>
}

function LightPoles({ cx, cz }: { cx: number; cz: number }) {
  const positions: [number, number, string][] = [
    [cx + STANDS_OUTER_R + 1, cz - STANDS_OUTER_R - 1, LIGHT_COLORS[0]],
    [cx - STANDS_OUTER_R - 1, cz - STANDS_OUTER_R - 1, LIGHT_COLORS[1]],
    [cx + STANDS_OUTER_R + 1, cz + STANDS_OUTER_R + 1, LIGHT_COLORS[2]],
    [cx - STANDS_OUTER_R + 1, cz + STANDS_OUTER_R + 1, LIGHT_COLORS[3]],
  ]

  return (
    <group>
      {positions.map((p, i) => (
        <LightPole
          key={`lp${i}`}
          x={p[0]}
          z={p[1]}
          color={p[2]}
          aimX={cx}
          aimZ={cz}
          withLight={i < 2}
        />
      ))}
    </group>
  )
}

function LightPole({
  x,
  z,
  color,
  aimX,
  aimZ,
  withLight,
}: {
  x: number
  z: number
  color: string
  aimX: number
  aimZ: number
  withLight: boolean
}) {
  const lightRef = useRef<PointLight>(null)
  const POLE_H = 13
  const yaw = Math.atan2(aimX - x, aimZ - z)

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity =
        4 + Math.sin(state.clock.elapsedTime * 3 + x) * 0.3
    }
  })

  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, POLE_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, POLE_H, 8]} />
        <meshToonMaterial color="#2b2d42" />
      </mesh>
      <mesh position={[0, POLE_H, 1]} castShadow>
        <boxGeometry args={[0.3, 0.3, 2]} />
        <meshToonMaterial color="#2b2d42" />
      </mesh>
      <mesh position={[0, POLE_H, 2]} castShadow>
        <boxGeometry args={[1.3, 0.8, 0.8]} />
        <meshToonMaterial color="#495057" />
      </mesh>
      <mesh position={[0, POLE_H - 0.25, 2.3]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      {withLight && (
        <pointLight
          ref={lightRef}
          position={[0, POLE_H - 0.25, 2.3]}
          color={color}
          intensity={4}
          distance={35}
          decay={2}
        />
      )}
    </group>
  )
}

function Banner({ cx, cz }: { cx: number; cz: number }) {
  return (
    <group position={[cx, 0, cz]}>
      <mesh position={[-4, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 5, 8]} />
        <meshToonMaterial color="#6f4518" />
      </mesh>
      <mesh position={[4, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 5, 8]} />
        <meshToonMaterial color="#6f4518" />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow>
        <boxGeometry args={[8.5, 1.4, 0.3]} />
        <meshToonMaterial color="#ef476f" />
      </mesh>
      <mesh position={[0, 4.2, 0.2]}>
        <boxGeometry args={[8, 1, 0.1]} />
        <meshBasicMaterial color="#ffd166" />
      </mesh>
      <mesh position={[0, 3.3, 0.25]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.5, 0.8, 0.05]} />
        <meshToonMaterial color="#7b2cbf" />
      </mesh>
    </group>
  )
}
