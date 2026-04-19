'use client'

import { useMemo } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'

const TRACK_CENTER: [number, number, number] = [72, 0, 82]
// Oval track: X radius > Z radius → horizontal oval
const RX = 22
const RZ = 14
const TRACK_WIDTH = 5
const KART_COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#c780fa']

export default function GoKartTrack() {
  const tireData = useMemo(() => {
    let seed = 7001
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const COUNT = 64
    // Outer tire barrier + inner tire barrier
    return Array.from({ length: COUNT }).map((_, i) => {
      const ang = (i / COUNT) * Math.PI * 2
      const color = ['#1a1a1a', '#2d2d2d'][i % 2]
      return {
        outer: {
          x: Math.cos(ang) * (RX + TRACK_WIDTH / 2 + 0.8),
          z: Math.sin(ang) * (RZ + TRACK_WIDTH / 2 + 0.8),
          color,
        },
        inner: {
          x: Math.cos(ang) * (RX - TRACK_WIDTH / 2 - 0.8),
          z: Math.sin(ang) * (RZ - TRACK_WIDTH / 2 - 0.8),
          color,
        },
        jitter: rand() * 0.15,
      }
    })
  }, [])

  const [cx, , cz] = TRACK_CENTER

  return (
    <group position={[cx, 0, cz]}>
      {/* Outer zone (grass/sand) */}
      <mesh
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry args={[Math.max(RX, RZ) - 3, Math.max(RX, RZ) + 7, 64]} />
        <meshToonMaterial color="#9fc17d" />
      </mesh>

      {/* Track itself — drawn as 64 segments for smooth oval */}
      <TrackRing rx={RX} rz={RZ} width={TRACK_WIDTH} color="#3d3d3d" />
      {/* Racing line stripe */}
      <TrackStripe rx={RX - TRACK_WIDTH * 0.15} rz={RZ - TRACK_WIDTH * 0.15} segments={64} color="#ffd60a" />

      {/* Inner grass area */}
      <mesh
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[Math.min(RX, RZ) - TRACK_WIDTH / 2 - 0.5, 48]} />
        <meshToonMaterial color="#7cc576" />
      </mesh>

      {/* Start/finish line */}
      <mesh position={[RX, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, TRACK_WIDTH]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Check pattern */}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh
          key={`ck${i}`}
          position={[RX + 0.01, 0.05, -TRACK_WIDTH / 2 + (i + 0.5) * (TRACK_WIDTH / 5)]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.4, TRACK_WIDTH / 5]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#000' : '#fff'} />
        </mesh>
      ))}

      {/* Tire barriers */}
      <RigidBody type="fixed" colliders={false}>
        {tireData.map((t, i) => (
          <group key={`t${i}`}>
            <CuboidCollider
              args={[0.45, 0.4, 0.45]}
              position={[t.outer.x, 0.4, t.outer.z]}
            />
            <mesh
              position={[t.outer.x, 0.4, t.outer.z]}
              rotation={[0, 0, t.jitter]}
              castShadow
            >
              <torusGeometry args={[0.4, 0.18, 8, 14]} />
              <meshToonMaterial color={t.outer.color} />
            </mesh>
            <CuboidCollider
              args={[0.45, 0.4, 0.45]}
              position={[t.inner.x, 0.4, t.inner.z]}
            />
            <mesh
              position={[t.inner.x, 0.4, t.inner.z]}
              rotation={[0, 0, -t.jitter]}
              castShadow
            >
              <torusGeometry args={[0.4, 0.18, 8, 14]} />
              <meshToonMaterial color={t.inner.color} />
            </mesh>
          </group>
        ))}
      </RigidBody>

      {/* Pit area with parked karts */}
      <group position={[-RX - 2, 0, 0]}>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[6, 8]} />
          <meshToonMaterial color="#888" />
        </mesh>
        {KART_COLORS.slice(0, 3).map((color, i) => (
          <Kart key={`k${i}`} x={0} z={-3 + i * 3} color={color} />
        ))}
        {/* Pit banner */}
        <mesh position={[0, 3, -5]} castShadow>
          <boxGeometry args={[5, 1, 0.2]} />
          <meshToonMaterial color="#ef476f" />
        </mesh>
        <mesh position={[2.3, 1.5, -5]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 3, 8]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
        <mesh position={[-2.3, 1.5, -5]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 3, 8]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
      </group>

      {/* Corner floodlight poles */}
      {[
        [RX + 8, 0, RZ + 4],
        [-RX - 8, 0, RZ + 4],
        [RX + 8, 0, -RZ - 4],
        [-RX - 8, 0, -RZ - 4],
      ].map((p, i) => (
        <group key={`fl${i}`} position={[p[0], 0, p[2]]}>
          <mesh position={[0, 4, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 8, 8]} />
            <meshToonMaterial color="#2b2d42" />
          </mesh>
          <mesh position={[0, 8, 0]}>
            <sphereGeometry args={[0.5, 10, 10]} />
            <meshStandardMaterial
              color="#fffacd"
              emissive="#ffd60a"
              emissiveIntensity={1.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// 64-segment oval track — flat tiled boxes
function TrackRing({
  rx,
  rz,
  width,
  color,
}: {
  rx: number
  rz: number
  width: number
  color: string
}) {
  const SEG = 64
  const items = []
  for (let i = 0; i < SEG; i++) {
    const ang = (i / SEG) * Math.PI * 2
    const nextAng = ((i + 1) / SEG) * Math.PI * 2
    const cx = Math.cos(ang) * rx
    const cz = Math.sin(ang) * rz
    const nx = Math.cos(nextAng) * rx
    const nz = Math.sin(nextAng) * rz
    const mx = (cx + nx) / 2
    const mz = (cz + nz) / 2
    const len = Math.hypot(nx - cx, nz - cz) + 0.12
    // Direction of tangent
    const tang = Math.atan2(nx - cx, nz - cz)
    items.push(
      <mesh
        key={i}
        position={[mx, 0.02, mz]}
        rotation={[-Math.PI / 2, 0, -tang]}
        receiveShadow
      >
        <planeGeometry args={[width, len]} />
        <meshToonMaterial color={color} />
      </mesh>
    )
  }
  return <>{items}</>
}

function TrackStripe({
  rx,
  rz,
  segments,
  color,
}: {
  rx: number
  rz: number
  segments: number
  color: string
}) {
  const items = []
  for (let i = 0; i < segments; i += 2) {
    // dotted
    const ang = (i / segments) * Math.PI * 2
    const nextAng = ((i + 1) / segments) * Math.PI * 2
    const cx = Math.cos(ang) * rx
    const cz = Math.sin(ang) * rz
    const nx = Math.cos(nextAng) * rx
    const nz = Math.sin(nextAng) * rz
    const mx = (cx + nx) / 2
    const mz = (cz + nz) / 2
    const len = Math.hypot(nx - cx, nz - cz)
    const tang = Math.atan2(nx - cx, nz - cz)
    items.push(
      <mesh
        key={`st${i}`}
        position={[mx, 0.04, mz]}
        rotation={[-Math.PI / 2, 0, -tang]}
      >
        <planeGeometry args={[0.3, len * 0.8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    )
  }
  return <>{items}</>
}

function Kart({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]}>
      {/* Body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.3, 1.8]} />
        <meshToonMaterial color={color} />
      </mesh>
      {/* Seat */}
      <mesh position={[0, 0.58, -0.2]} castShadow>
        <boxGeometry args={[0.55, 0.2, 0.6]} />
        <meshToonMaterial color="#1a1a1a" />
      </mesh>
      {/* Steering wheel */}
      <mesh position={[0, 0.7, 0.5]} rotation={[0.6, 0, 0]} castShadow>
        <torusGeometry args={[0.12, 0.03, 6, 12]} />
        <meshToonMaterial color="#1a1a1a" />
      </mesh>
      {/* Wheels */}
      {[
        [-0.5, 0.25, 0.7],
        [0.5, 0.25, 0.7],
        [-0.5, 0.25, -0.7],
        [0.5, 0.25, -0.7],
      ].map((w, i) => (
        <mesh
          key={i}
          position={[w[0], w[1], w[2]]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.24, 0.24, 0.15, 14]} />
          <meshToonMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Front bumper */}
      <mesh position={[0, 0.35, 0.95]} castShadow>
        <boxGeometry args={[0.7, 0.2, 0.25]} />
        <meshToonMaterial color="#ffd166" />
      </mesh>
    </group>
  )
}

