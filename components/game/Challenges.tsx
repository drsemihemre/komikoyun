'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Html } from '@react-three/drei'
import type { Mesh, Group } from 'three'

// Zorluk bölgeleri — her biri basit bir yapı. Detaylar ileride derinleştirilir.

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
    // Spiral
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
  // Tepe zafer bayrağı
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

/** 👹 Boss Arena — daha büyük yaratık, yüksek HP, arena boyutlu */
function BossArena({ position }: { position: [number, number, number] }) {
  const boss = useRef<Mesh>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (boss.current) {
      boss.current.position.y = 3 + Math.sin(t * 0.8) * 0.4
      boss.current.rotation.y = t * 0.4
    }
  })
  return (
    <group position={position}>
      {/* Arena zemini */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[22, 48]} />
        <meshToonMaterial color="#3d0000" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[21.5, 22, 48]} />
        <meshBasicMaterial color="#8b0000" />
      </mesh>

      {/* Duvar halkası */}
      <RigidBody type="fixed" colliders={false}>
        {Array.from({ length: 28 }).map((_, i) => {
          const ang = (i / 28) * Math.PI * 2
          if (ang > Math.PI * 0.47 && ang < Math.PI * 0.53) return null // giriş
          const x = Math.cos(ang) * 22.5
          const z = Math.sin(ang) * 22.5
          return (
            <group key={i}>
              <CuboidCollider args={[0.3, 2, 2.5]} position={[x, 2, z]} rotation={[0, -ang, 0]} />
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

      {/* Boss — kocaman dönen gözlü yaratık */}
      <mesh ref={boss} position={[0, 3, 0]} castShadow>
        <sphereGeometry args={[2.5, 28, 22]} />
        <meshToonMaterial color="#8b0000" />
      </mesh>
      <mesh position={[1.2, 3.4, 0]}>
        <sphereGeometry args={[0.6, 14, 14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[1.2, 3.4, 1]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[1.2, 3.4, 1.3]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      {/* Boynuzlar */}
      <mesh position={[-0.8, 5.2, 0.5]} rotation={[0.2, 0, 0.4]} castShadow>
        <coneGeometry args={[0.4, 1.8, 10]} />
        <meshToonMaterial color="#2a0000" />
      </mesh>
      <mesh position={[-0.8, 5.2, -0.5]} rotation={[0.2, 0, -0.4]} castShadow>
        <coneGeometry args={[0.4, 1.8, 10]} />
        <meshToonMaterial color="#2a0000" />
      </mesh>

      <ZoneSign label="Boss Arenası" emoji="👹" />
    </group>
  )
}

/** 🪤 Obstacle Course — engelli koşu hattı */
function ObstacleCourse({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Başlangıç */}
      <mesh
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[8, 60]} />
        <meshToonMaterial color="#ffb347" />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        {/* Zıplama engelleri */}
        {[-20, -10, 0, 10, 20].map((z, i) => (
          <group key={i} position={[0, 0.5, z]}>
            <CuboidCollider args={[3, 0.5, 0.3]} />
            <mesh castShadow>
              <boxGeometry args={[6, 1, 0.6]} />
              <meshToonMaterial color="#ef476f" />
            </mesh>
          </group>
        ))}
        {/* Yanlardan duvar — dışarı çıkamaz */}
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
      {/* Bitiş çizgisi */}
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

/** 🏊 Swimming Pool — büyük mavi havuz, renkli kenarlarla */
function SwimmingPool({ position }: { position: [number, number, number] }) {
  const waterRef = useRef<Mesh>(null)
  useFrame((state) => {
    if (!waterRef.current) return
    const t = state.clock.elapsedTime
    waterRef.current.position.y = -0.4 + Math.sin(t * 0.6) * 0.05
  })
  return (
    <group position={position}>
      {/* Plaka deck */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[20, 0.5, 14]} position={[0, -0.5, 0]} />
        {/* Havuz içi — deck katmanından aşağı */}
        <CuboidCollider args={[16, 0.5, 10]} position={[0, -1.5, 0]} />
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[40, 1, 28]} />
          <meshToonMaterial color="#f4d35e" />
        </mesh>
        <mesh position={[0, -1.5, 0]} receiveShadow>
          <boxGeometry args={[32, 1, 20]} />
          <meshToonMaterial color="#1e90ff" />
        </mesh>
      </RigidBody>
      {/* Su yüzeyi */}
      <mesh
        ref={waterRef}
        position={[0, -0.4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[31, 19]} />
        <meshStandardMaterial
          color="#4aa3df"
          emissive="#1a5e8f"
          emissiveIntensity={0.3}
          transparent
          opacity={0.75}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
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

/** 🌀 Maze — labirent (grid walls) */
function Maze({ position }: { position: [number, number, number] }) {
  // 8×8 grid labirent, basit sabit pattern
  const SIZE = 8
  const CELL = 3
  const walls: React.ReactNode[] = []
  // H walls (x-axis)
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
      <ZoneSign label="Labirent" emoji="🌀" />
    </group>
  )
}

/** 🕳️ Dungeon — yer altı gibi koyu alan (yüzeyde karanlık kule) */
function Dungeon({ position }: { position: [number, number, number] }) {
  const torchRef = useRef<Group>(null)
  useFrame((state) => {
    if (!torchRef.current) return
    const t = state.clock.elapsedTime
    torchRef.current.children.forEach((c, i) => {
      c.scale.setScalar(0.9 + Math.sin(t * 8 + i) * 0.15)
    })
  })
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* Kule duvarları - 4 yüzeyli kare */}
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
        {/* Çatı */}
        <mesh position={[0, 10.2, 0]} castShadow>
          <boxGeometry args={[17, 0.4, 17]} />
          <meshToonMaterial color="#1a1a1a" />
        </mesh>
      </RigidBody>
      {/* Meşaleler (içeride) */}
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

/** 🎯 Cannon Range — hedef atış alanı */
function CannonRange({ position }: { position: [number, number, number] }) {
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
        {/* Mancınıklar sırası */}
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
        {/* Hedefler */}
        {[-8, -4, 0, 4, 8].map((x, i) => (
          <group key={`t${i}`} position={[x, 0, 18]}>
            <CuboidCollider args={[1, 1.5, 0.1]} position={[0, 1.5, 0]} />
            <mesh position={[0, 1.5, 0]} castShadow>
              <boxGeometry args={[2, 3, 0.2]} />
              <meshToonMaterial color="#ffffff" />
            </mesh>
            {/* Kırmızı halka */}
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

/** 🎢 Ice Rink — buz pateni alanı (düşük friction) */
function IceRink({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[15, 0.2, 12]}
          position={[0, -0.2, 0]}
          friction={0.05}
          restitution={0.1}
        />
        <mesh position={[0, -0.2, 0]} receiveShadow>
          <boxGeometry args={[30, 0.4, 24]} />
          <meshStandardMaterial
            color="#a2d2ff"
            metalness={0.5}
            roughness={0.15}
            emissive="#5085b8"
            emissiveIntensity={0.15}
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
      <ZoneSign label="Buz Pateni" emoji="🎢" />
    </group>
  )
}

/** 🏰 Castle Siege — kale duvarları + ana kapı */
function CastleSiege({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {/* 4 duvar — güney kapıda boşluk */}
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
        {/* Ön yüz — iki yarım duvar + üst, ortada kapı açıklığı */}
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
        {/* Köşe kuleleri */}
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
        {/* Bayrak */}
        <mesh position={[0, 13, 12]} castShadow>
          <boxGeometry args={[0.1, 2, 0.1]} />
          <meshToonMaterial color="#6d4c41" />
        </mesh>
        <mesh position={[0.6, 13.5, 12]}>
          <boxGeometry args={[1, 0.7, 0.05]} />
          <meshToonMaterial color="#ef4444" />
        </mesh>
      </RigidBody>
      <ZoneSign label="Kale" emoji="🏰" />
    </group>
  )
}
