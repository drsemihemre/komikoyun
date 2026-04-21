'use client'

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Html } from '@react-three/drei'
import type { Mesh, Group } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { useGameStore } from '@/lib/store'
import { spawnImpact } from '@/lib/particles'

// Zorluk bölgeleri — her biri basit bir yapı.

export default function Challenges() {
  return (
    <>
      <ParkourTower position={[120, 0, 90]} />
      <BossArena position={[-130, 0, 100]} />
      <ObstacleCourse position={[130, 0, -90]} />
      <SwimmingPool position={[180, 0, 20]} />
      <Maze position={[0, 0, 180]} />
      <Dungeon position={[0, 0, -150]} />
      <CannonRange position={[-180, 0, -10]} />
      <IceRink position={[-180, 0, 140]} />
      <CastleSiege position={[180, 0, -130]} />
    </>
  )
}

function ZoneSign({ label, emoji }: { label: string; emoji: string }) {
  return (
    <Html
      position={[0, 6, 0]}
      center
      distanceFactor={18}
      zIndexRange={[10, 0]}
    >
      <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/70 px-4 py-1.5 text-sm font-black text-white shadow-xl backdrop-blur-sm">
        {emoji} {label}
      </div>
    </Html>
  )
}

/** 🏃 Parkour Tower — yükseğe platformlarla tırmanılabilir kule */
function ParkourTower({ position }: { position: [number, number, number] }) {
  const platforms = []
  const PLATFORM_COUNT = 14
  for (let i = 0; i < PLATFORM_COUNT; i++) {
    const y = 2 + i * 2.8
    const ang = (i / PLATFORM_COUNT) * Math.PI * 4
    const r = 3
    const x = Math.cos(ang) * r
    const z = Math.sin(ang) * r
    const color = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#c77dff'][
      i % 5
    ]
    platforms.push(
      <group key={i} position={[x, y, z]}>
        <CuboidCollider args={[1.2, 0.2, 1.2]} friction={1.2} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.4, 2.4]} />
          <meshToonMaterial color={color} />
        </mesh>
      </group>
    )
  }
  platforms.push(
    <group key="flag" position={[0, 2 + PLATFORM_COUNT * 2.8 + 0.6, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
        <meshToonMaterial color="#ffd60a" />
      </mesh>
      <mesh position={[0.6, 1.2, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.05]} />
        <meshToonMaterial color="#ef4444" />
      </mesh>
    </group>
  )
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {platforms}
      </RigidBody>
      <ZoneSign label="Parkur Kulesi" emoji="🏃" />
    </group>
  )
}

/** 👹 Boss Arena — animasyonlu hareket eden ve oyuncuya saldıran boss */
function BossArena({ position }: { position: [number, number, number] }) {
  const bossGroup = useRef<Group>(null)
  const eye = useRef<Mesh>(null)
  const lastAttackT = useRef(0)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (bossGroup.current) {
      bossGroup.current.position.y = 4 + Math.sin(t * 0.8) * 0.6
      bossGroup.current.rotation.y = t * 0.4
    }
    if (eye.current) {
      // Gözü oyuncuya takip ettir
      const player = getPlayerHandle()
      const pp = player?.getPos()
      if (pp) {
        const dx = pp.x - position[0]
        const dz = pp.z - position[2]
        const ang = Math.atan2(dx, dz)
        // Pupil gözün içinde hareket et
        eye.current.position.x = 1.2 + Math.sin(ang) * 0.15
        eye.current.position.z = Math.cos(ang) * 0.15
      }
    }

    // Boss arena içindeyken oyuncuya periyodik saldırı (her 4sn)
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - position[0]
    const dz = pp.z - position[2]
    const dist = Math.hypot(dx, dz)
    if (dist < 18 && t - lastAttackT.current > 4 && !player?.isDown()) {
      lastAttackT.current = t
      // Explosion efekti + hasar
      const nx = dx / Math.max(dist, 0.01)
      const nz = dz / Math.max(dist, 0.01)
      spawnImpact(pp.x, pp.y + 0.5, pp.z, '#ff0000', 2)
      player?.takeHit(12, [nx * 8, 5, nz * 8])
    }
  })

  return (
    <group position={position}>
      {/* Arena zemini — darker */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[22, 48]} />
        <meshToonMaterial color="#2d0000" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[21.5, 22, 48]} />
        <meshBasicMaterial color="#8b0000" />
      </mesh>
      {/* Kızıl ışık noktaları — emisyonlu dikenler */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2
        const x = Math.cos(a) * 17
        const z = Math.sin(a) * 17
        return (
          <mesh key={`torch${i}`} position={[x, 2, z]}>
            <sphereGeometry args={[0.3, 10, 10]} />
            <meshStandardMaterial
              color="#ff2200"
              emissive="#ff0000"
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
        )
      })}

      <RigidBody type="fixed" colliders={false}>
        {Array.from({ length: 28 }).map((_, i) => {
          const ang = (i / 28) * Math.PI * 2
          if (ang > Math.PI * 0.47 && ang < Math.PI * 0.53) return null
          const x = Math.cos(ang) * 22.5
          const z = Math.sin(ang) * 22.5
          return (
            <group key={i}>
              <CuboidCollider
                args={[0.3, 2, 2.5]}
                position={[x, 2, z]}
                rotation={[0, -ang, 0]}
              />
              <mesh
                position={[x, 2, z]}
                rotation={[0, -ang, 0]}
                castShadow
              >
                <boxGeometry args={[0.6, 4, 5]} />
                <meshToonMaterial color="#1a1a1a" />
              </mesh>
            </group>
          )
        })}
      </RigidBody>

      {/* Boss — büyük dönen gövde */}
      <group ref={bossGroup} position={[0, 4, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[2.8, 32, 24]} />
          <meshToonMaterial color="#8b0000" />
        </mesh>
        {/* Ana göz */}
        <mesh position={[0, 0.6, 1.8]}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh ref={eye} position={[1.2, 0.6, 2.3]}>
          <sphereGeometry args={[0.4, 12, 12]} />
          <meshBasicMaterial color="#000" />
        </mesh>
        <mesh position={[1.2, 0.6, 2.55]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
        {/* Dişler */}
        {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
          <mesh key={`t${i}`} position={[x, -0.8, 2]}>
            <coneGeometry args={[0.1, 0.35, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
        {/* Boynuzlar */}
        <mesh position={[-1, 2.2, 0.8]} rotation={[0.2, 0, 0.4]} castShadow>
          <coneGeometry args={[0.4, 2, 10]} />
          <meshToonMaterial color="#2a0000" />
        </mesh>
        <mesh position={[1, 2.2, 0.8]} rotation={[0.2, 0, -0.4]} castShadow>
          <coneGeometry args={[0.4, 2, 10]} />
          <meshToonMaterial color="#2a0000" />
        </mesh>
      </group>

      <ZoneSign label="Boss Arenası" emoji="👹" />
    </group>
  )
}

/** 🪤 Obstacle Course */
function ObstacleCourse({ position }: { position: [number, number, number] }) {
  const swingRef = useRef<Group>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (swingRef.current) {
      swingRef.current.rotation.z = Math.sin(t * 2) * 0.8
    }
  })
  return (
    <group position={position}>
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[8, 60]} />
        <meshToonMaterial color="#ffb347" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {[-20, -10, 0, 10, 20].map((z, i) => (
          <group key={i} position={[0, 0.5, z]}>
            <CuboidCollider args={[3, 0.5, 0.3]} />
            <mesh castShadow>
              <boxGeometry args={[6, 1, 0.6]} />
              <meshToonMaterial color="#ef476f" />
            </mesh>
          </group>
        ))}
        <CuboidCollider args={[0.2, 1.5, 30]} position={[-4, 1.5, 0]} />
        <CuboidCollider args={[0.2, 1.5, 30]} position={[4, 1.5, 0]} />
        <mesh position={[-4, 1.5, 0]} castShadow>
          <boxGeometry args={[0.4, 3, 60]} />
          <meshToonMaterial color="#6f4518" />
        </mesh>
        <mesh position={[4, 1.5, 0]} castShadow>
          <boxGeometry args={[0.4, 3, 60]} />
          <meshToonMaterial color="#6f4518" />
        </mesh>
      </RigidBody>
      {/* Sallanan balta — animasyonlu engel */}
      <group position={[0, 4, 5]}>
        <group ref={swingRef}>
          <mesh position={[0, -2, 0]} castShadow>
            <boxGeometry args={[0.2, 4, 0.2]} />
            <meshToonMaterial color="#6b6b6b" />
          </mesh>
          <mesh position={[0, -4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <coneGeometry args={[1, 1.5, 6]} />
            <meshStandardMaterial
              color="#c0c0c0"
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>
      <mesh position={[0, 0.1, 28]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 1]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`f${i}`}
          position={[-3.5 + i, 0.11, 28]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#fff' : '#000'} />
        </mesh>
      ))}
      <ZoneSign label="Engel Kursu" emoji="🪤" />
    </group>
  )
}

/** 🏊 Swimming Pool — belirgin mavi su + yüzerken yavaşlama */
function SwimmingPool({ position }: { position: [number, number, number] }) {
  const waterRef = useRef<Mesh>(null)
  const lastBuoyT = useRef(0)

  useFrame((state) => {
    if (!waterRef.current) return
    const t = state.clock.elapsedTime
    // Yüzey hafif bob
    waterRef.current.position.y = -0.25 + Math.sin(t * 0.6) * 0.04

    // Buoyancy: oyuncu suya düştüyse yavaşlat + yukarı itme
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - position[0]
    const dz = pp.z - position[2]
    if (Math.abs(dx) < 15 && Math.abs(dz) < 9 && pp.y < 0 && pp.y > -2) {
      if (t - lastBuoyT.current > 0.1) {
        lastBuoyT.current = t
        // Yüzey ulaşana kadar yukarı it + yavaşlat
        player?.launch([0, 2, 0])
      }
    }
  })
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[20, 0.5, 14]} position={[0, -0.5, 0]} />
        <CuboidCollider args={[16, 0.5, 10]} position={[0, -1.5, 0]} />
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[40, 1, 28]} />
          <meshToonMaterial color="#f4d35e" />
        </mesh>
        {/* Havuz duvarları — yan kenarlar belirgin mavi */}
        <mesh position={[0, -1, 0]} receiveShadow>
          <boxGeometry args={[32, 2, 20]} />
          <meshToonMaterial color="#0077b6" />
        </mesh>
      </RigidBody>
      {/* Su yüzeyi — gözle görünür mavi, dalgalı */}
      <mesh
        ref={waterRef}
        position={[0, -0.25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[31, 19]} />
        <meshStandardMaterial
          color="#4dbbff"
          emissive="#1e90ff"
          emissiveIntensity={0.5}
          transparent
          opacity={0.85}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
      {/* Köşe yüzdürücüler (renkli şişme simitler) */}
      {[
        [-12, 6],
        [12, -6],
        [-8, -6],
      ].map((p, i) => (
        <mesh
          key={`b${i}`}
          position={[p[0], -0.25, p[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[0.8, 0.3, 10, 20]} />
          <meshToonMaterial
            color={['#ef4444', '#10b981', '#facc15'][i]}
          />
        </mesh>
      ))}
      {/* Şezlong + şemsiye */}
      <mesh position={[-14, 0.3, 8]} castShadow>
        <boxGeometry args={[3, 0.4, 1.2]} />
        <meshToonMaterial color="#ffd166" />
      </mesh>
      <group position={[-11, 0, 8]}>
        <mesh position={[0, 1.5, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
          <meshToonMaterial color="#8d6e63" />
        </mesh>
        <mesh position={[0, 3, 0]} castShadow>
          <coneGeometry args={[1.5, 1, 10]} />
          <meshToonMaterial color="#ef4444" />
        </mesh>
      </group>
      <ZoneSign label="Yüzme Havuzu" emoji="🏊" />
    </group>
  )
}

/** 🌀 Maze */
function Maze({ position }: { position: [number, number, number] }) {
  const SIZE = 8
  const CELL = 3
  const walls: React.ReactNode[] = []
  const pattern = [
    [0, 1, 1, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 1, 1, 0],
    [1, 1, 0, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [1, 0, 0, 1, 0, 0, 0, 1],
    [0, 1, 0, 0, 1, 1, 0, 0],
    [1, 0, 1, 1, 0, 0, 1, 1],
    [0, 0, 0, 0, 1, 1, 0, 0],
  ]
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (pattern[r][c]) {
        const x = (c - SIZE / 2 + 0.5) * CELL
        const z = (r - SIZE / 2 + 0.5) * CELL
        walls.push(
          <group key={`${r}-${c}`} position={[x, 1.5, z]}>
            <CuboidCollider args={[CELL / 2, 1.5, CELL / 2]} />
            <mesh castShadow receiveShadow>
              <boxGeometry args={[CELL, 3, CELL]} />
              <meshToonMaterial color="#2d6a4f" />
            </mesh>
          </group>
        )
      }
    }
  }
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SIZE * CELL + 2, SIZE * CELL + 2]} />
        <meshToonMaterial color="#95d5b2" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {walls}
      </RigidBody>
      {/* Merkezdeki hazine */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#ffd60a"
          emissive="#ffd60a"
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      <ZoneSign label="Labirent" emoji="🌀" />
    </group>
  )
}

/** 🕳️ Dungeon — diken tuzaklar + sandıklar + düşmanlar */
function Dungeon({ position }: { position: [number, number, number] }) {
  const torchRef = useRef<Group>(null)
  const spikeRef = useRef<Group>(null)
  const lastHitT = useRef(0)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (torchRef.current) {
      torchRef.current.children.forEach((c, i) => {
        c.scale.setScalar(0.9 + Math.sin(t * 8 + i) * 0.15)
      })
    }
    if (spikeRef.current) {
      // Dikenlerin inip çıkması
      spikeRef.current.position.y = 0.5 + Math.abs(Math.sin(t * 1.5)) * 0.8
    }
    // Oyuncu diken üstündeyse hasar
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const cx = position[0]
    const cz = position[2]
    // Dikenler merkezde (0, 0) — 4x4m alan
    const lx = pp.x - cx
    const lz = pp.z - cz
    if (Math.abs(lx) < 2 && Math.abs(lz) < 2 && pp.y < 2) {
      const spikeHeight = spikeRef.current?.position.y ?? 0
      if (spikeHeight > 1 && t - lastHitT.current > 1) {
        lastHitT.current = t
        player?.takeHit(8, [0, 3, 0])
        spawnImpact(pp.x, pp.y, pp.z, '#ff0000', 1)
      }
    }
  })

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {[
          [0, 5, -8, 20, 10, 0.6],
          [0, 5, 8, 20, 10, 0.6],
          [-8, 5, 0, 0.6, 10, 16],
          [8, 5, 0, 0.6, 10, 16],
        ].map((w, i) => (
          <group key={i} position={[w[0], w[1], w[2]]}>
            <CuboidCollider args={[w[3] / 2, w[4] / 2, w[5] / 2]} />
            <mesh castShadow receiveShadow>
              <boxGeometry args={[w[3], w[4], w[5]]} />
              <meshToonMaterial color="#343a40" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 10.2, 0]} castShadow>
          <boxGeometry args={[17, 0.4, 17]} />
          <meshToonMaterial color="#1a1a1a" />
        </mesh>
        {/* Sandıklar */}
        {[
          [-6, 0, -6],
          [6, 0, -6],
          [-6, 0, 6],
          [6, 0, 6],
        ].map((p, i) => (
          <group key={`chest${i}`} position={[p[0], 0.4, p[2]]}>
            <CuboidCollider args={[0.6, 0.4, 0.4]} position={[0, 0, 0]} />
            <mesh castShadow receiveShadow>
              <boxGeometry args={[1.2, 0.8, 0.8]} />
              <meshToonMaterial color="#8d6e63" />
            </mesh>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[1.2, 0.3, 0.8]} />
              <meshToonMaterial color="#6d4c41" />
            </mesh>
            {/* Altın şerit */}
            <mesh position={[0, 0.3, 0.41]}>
              <boxGeometry args={[1.3, 0.15, 0.04]} />
              <meshStandardMaterial
                color="#ffd60a"
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        ))}
      </RigidBody>
      {/* Tuzak dikenler — ortada yukarı-aşağı */}
      <group ref={spikeRef} position={[0, 0.5, 0]}>
        {Array.from({ length: 16 }).map((_, i) => {
          const x = (i % 4) - 1.5
          const z = Math.floor(i / 4) - 1.5
          return (
            <mesh
              key={`sp${i}`}
              position={[x * 1, 0, z * 1]}
              castShadow
            >
              <coneGeometry args={[0.3, 1.2, 6]} />
              <meshStandardMaterial
                color="#c0c0c0"
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
          )
        })}
      </group>
      {/* Meşaleler */}
      <group ref={torchRef}>
        {[
          [-7, 4, -7],
          [7, 4, -7],
          [-7, 4, 7],
          [7, 4, 7],
        ].map((p, i) => (
          <mesh key={`tch${i}`} position={[p[0], p[1], p[2]]}>
            <sphereGeometry args={[0.35, 10, 10]} />
            <meshStandardMaterial
              color="#ff6b35"
              emissive="#ff6b35"
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <ZoneSign label="Zindan" emoji="🕳️" />
    </group>
  )
}

/** 🎯 Cannon Range */
function CannonRange({ position }: { position: [number, number, number] }) {
  const ballRefs = useRef<(Mesh | null)[]>([])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Hedefler dönerek kalkıp inerler
    ballRefs.current.forEach((m, i) => {
      if (!m) return
      m.position.y = 1.5 + Math.sin(t * 2 + i * 0.6) * 0.5
      m.rotation.y += 0.02
    })
  })
  return (
    <group position={position}>
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 40]} />
        <meshToonMaterial color="#dda15e" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {[-8, -4, 0, 4, 8].map((x, i) => (
          <group key={`c${i}`} position={[x, 0, -18]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.6, 0.8, 1, 14]} />
              <meshToonMaterial color="#495057" />
            </mesh>
            <mesh position={[0, 1, 0.5]} rotation={[-0.8, 0, 0]} castShadow>
              <cylinderGeometry args={[0.4, 0.6, 2, 14]} />
              <meshToonMaterial color="#343a40" />
            </mesh>
          </group>
        ))}
        {[-8, -4, 0, 4, 8].map((x, i) => (
          <group key={`t${i}`} position={[x, 0, 18]}>
            <CuboidCollider args={[1, 1.5, 0.1]} position={[0, 1.5, 0]} />
            <mesh
              position={[0, 1.5, 0]}
              ref={(m) => {
                ballRefs.current[i] = m
              }}
              castShadow
            >
              <boxGeometry args={[2, 3, 0.2]} />
              <meshToonMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, 1.5, 0.11]}>
              <ringGeometry args={[0.7, 1, 24]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0, 1.5, 0.12]}>
              <circleGeometry args={[0.25, 16]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        ))}
      </RigidBody>
      <ZoneSign label="Hedef Poligonu" emoji="🎯" />
    </group>
  )
}

/** 🎢 Ice Rink — düşük friction + visible slip */
function IceRink({ position }: { position: [number, number, number] }) {
  const lastSlipCheck = useRef(0)

  useFrame((state) => {
    // Oyuncuya hafif random kayma uygular — tam kontrol edemesin
    const t = state.clock.elapsedTime
    if (t - lastSlipCheck.current < 0.1) return
    lastSlipCheck.current = t

    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - position[0]
    const dz = pp.z - position[2]
    if (Math.abs(dx) < 15 && Math.abs(dz) < 12 && Math.abs(pp.y) < 2) {
      // Rastgele küçük itme (kaymak gibi)
      const ang = Math.random() * Math.PI * 2
      player?.launch([Math.cos(ang) * 0.8, 0, Math.sin(ang) * 0.8])
    }
  })

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* Buz yüzeyi — çok düşük friction */}
        <CuboidCollider
          args={[15, 0.2, 12]}
          position={[0, -0.2, 0]}
          friction={0}
          restitution={0.1}
        />
        <mesh position={[0, -0.2, 0]} receiveShadow>
          <boxGeometry args={[30, 0.4, 24]} />
          <meshStandardMaterial
            color="#c5e3ff"
            metalness={0.6}
            roughness={0.1}
            emissive="#7ab8dd"
            emissiveIntensity={0.25}
          />
        </mesh>
        {/* Kenar bantları */}
        {[
          [0, 0.2, -12, 30, 0.6, 0.5],
          [0, 0.2, 12, 30, 0.6, 0.5],
          [-15, 0.2, 0, 0.5, 0.6, 24],
          [15, 0.2, 0, 0.5, 0.6, 24],
        ].map((w, i) => (
          <group key={i} position={[w[0], w[1], w[2]]}>
            <CuboidCollider args={[w[3] / 2, w[4] / 2, w[5] / 2]} />
            <mesh>
              <boxGeometry args={[w[3], w[4], w[5]]} />
              <meshToonMaterial color="#fff" />
            </mesh>
          </group>
        ))}
      </RigidBody>
      {/* Kar taneleri — dekoratif */}
      {Array.from({ length: 20 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 28
        const z = (Math.random() - 0.5) * 22
        return (
          <mesh key={`sn${i}`} position={[x, 0.15, z]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        )
      })}
      <ZoneSign label="Buz Pateni (kayıyor!)" emoji="🎢" />
    </group>
  )
}

/** 🏰 Castle Siege — kulelerde muhafızlar + içte bayrak */
function CastleSiege({ position }: { position: [number, number, number] }) {
  const guardsRef = useRef<Group>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (guardsRef.current) {
      guardsRef.current.children.forEach((g, i) => {
        g.rotation.y = Math.sin(t * 0.5 + i) * 0.5
      })
    }
  })
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* Duvarlar */}
        <CuboidCollider args={[12, 4, 0.5]} position={[0, 4, -12]} />
        <mesh position={[0, 4, -12]} castShadow receiveShadow>
          <boxGeometry args={[24, 8, 1]} />
          <meshToonMaterial color="#8d9196" />
        </mesh>
        <CuboidCollider args={[0.5, 4, 12]} position={[-12, 4, 0]} />
        <mesh position={[-12, 4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 8, 24]} />
          <meshToonMaterial color="#8d9196" />
        </mesh>
        <CuboidCollider args={[0.5, 4, 12]} position={[12, 4, 0]} />
        <mesh position={[12, 4, 0]} castShadow receiveShadow>
          <boxGeometry args={[1, 8, 24]} />
          <meshToonMaterial color="#8d9196" />
        </mesh>
        <CuboidCollider args={[4, 4, 0.5]} position={[-8, 4, 12]} />
        <mesh position={[-8, 4, 12]} castShadow receiveShadow>
          <boxGeometry args={[8, 8, 1]} />
          <meshToonMaterial color="#8d9196" />
        </mesh>
        <CuboidCollider args={[4, 4, 0.5]} position={[8, 4, 12]} />
        <mesh position={[8, 4, 12]} castShadow receiveShadow>
          <boxGeometry args={[8, 8, 1]} />
          <meshToonMaterial color="#8d9196" />
        </mesh>
        <CuboidCollider args={[4, 2, 0.5]} position={[0, 6, 12]} />
        <mesh position={[0, 6, 12]} castShadow receiveShadow>
          <boxGeometry args={[8, 4, 1]} />
          <meshToonMaterial color="#8d9196" />
        </mesh>
        {[
          [-12, 0, -12],
          [12, 0, -12],
          [-12, 0, 12],
          [12, 0, 12],
        ].map((p, i) => (
          <group key={i} position={[p[0], 0, p[2]]}>
            <CuboidCollider args={[1.5, 6, 1.5]} position={[0, 6, 0]} />
            <mesh position={[0, 6, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[2, 2, 12, 12]} />
              <meshToonMaterial color="#6c757d" />
            </mesh>
            <mesh position={[0, 12.5, 0]} castShadow>
              <coneGeometry args={[2.2, 2, 12]} />
              <meshToonMaterial color="#dc143c" />
            </mesh>
          </group>
        ))}
      </RigidBody>

      {/* Muhafızlar — kule tepelerinde küçük figürler */}
      <group ref={guardsRef}>
        {[
          [-12, 12, -12],
          [12, 12, -12],
          [-12, 12, 12],
          [12, 12, 12],
        ].map((p, i) => (
          <group key={`g${i}`} position={[p[0], p[1], p[2]]}>
            {/* Gövde */}
            <mesh position={[0, 0.8, 0]} castShadow>
              <capsuleGeometry args={[0.3, 0.8, 6, 10]} />
              <meshToonMaterial color="#4a5568" />
            </mesh>
            {/* Kafa */}
            <mesh position={[0, 1.6, 0]} castShadow>
              <sphereGeometry args={[0.35, 12, 12]} />
              <meshToonMaterial color="#ffd89c" />
            </mesh>
            {/* Kask */}
            <mesh position={[0, 1.8, 0]} castShadow>
              <cylinderGeometry args={[0.4, 0.4, 0.35, 12]} />
              <meshToonMaterial color="#495057" />
            </mesh>
            {/* Mızrak */}
            <mesh position={[0.4, 1, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 2.5, 6]} />
              <meshToonMaterial color="#8d6e63" />
            </mesh>
            <mesh position={[0.4, 2.2, 0]} castShadow>
              <coneGeometry args={[0.12, 0.4, 6]} />
              <meshStandardMaterial
                color="#c0c0c0"
                metalness={0.7}
                roughness={0.2}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Merkezdeki bayrak — hazine */}
      <mesh position={[0, 4, 0]} castShadow>
        <boxGeometry args={[0.2, 8, 0.2]} />
        <meshToonMaterial color="#6d4c41" />
      </mesh>
      <mesh position={[1, 7, 0]} castShadow>
        <boxGeometry args={[2, 1.2, 0.05]} />
        <meshStandardMaterial
          color="#ffd60a"
          emissive="#ffd60a"
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 13, 12]} castShadow>
        <boxGeometry args={[0.1, 2, 0.1]} />
        <meshToonMaterial color="#6d4c41" />
      </mesh>
      <mesh position={[0.6, 13.5, 12]}>
        <boxGeometry args={[1, 0.7, 0.05]} />
        <meshToonMaterial color="#ef4444" />
      </mesh>
      <ZoneSign label="Kale" emoji="🏰" />
    </group>
  )
}
