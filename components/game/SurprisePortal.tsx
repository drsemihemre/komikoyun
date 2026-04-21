'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { Group, Mesh } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { spawnImpact } from '@/lib/particles'
import { playLaunch, playKo } from '@/lib/sounds'
import { useGameStore } from '@/lib/store'

// Ana dünyada portal + uzak uçan adada brainrot-benzeri mini oyun
// 2 mod: Klasik (topla+skor) ve Tsunami (su dalgasından kaç)

const MAIN_PORTAL: [number, number, number] = [0, 1.5, 60]
const ZONE_CENTER: [number, number, number] = [400, 150, 400]

export default function SurprisePortal() {
  return (
    <>
      <Portal
        position={MAIN_PORTAL}
        destination={[
          ZONE_CENTER[0],
          ZONE_CENTER[1] + 1,
          ZONE_CENTER[2] + 3,
        ]}
        label="🌀 SÜRPRİZ OYUN PORTALI"
        frameColor="#c77dff"
        innerColor="#ff00ff"
      />
      <BrainrotZone center={ZONE_CENTER} />
      <Portal
        position={[ZONE_CENTER[0], ZONE_CENTER[1] + 1.5, ZONE_CENTER[2] - 13]}
        destination={[MAIN_PORTAL[0], MAIN_PORTAL[1] + 1.5, MAIN_PORTAL[2] + 3]}
        label="🚪 Dünyaya Dön"
        frameColor="#ffd60a"
        innerColor="#4cc9f0"
      />
    </>
  )
}

function Portal({
  position,
  destination,
  label,
  frameColor,
  innerColor,
}: {
  position: [number, number, number]
  destination: [number, number, number]
  label: string
  frameColor: string
  innerColor: string
}) {
  const ringRef = useRef<Mesh>(null)
  const lastTriggerAt = useRef(-10)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.5
    }
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - position[0]
    const dy = pp.y - position[1]
    const dz = pp.z - position[2]
    const dist = Math.hypot(dx, dy, dz)
    if (dist < 2.5 && t - lastTriggerAt.current > 3) {
      lastTriggerAt.current = t
      spawnImpact(position[0], position[1], position[2], frameColor, 2)
      spawnImpact(destination[0], destination[1], destination[2], frameColor, 2)
      playLaunch()
      player?.teleportTo(destination[0], destination[1], destination[2])
    }
  })

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <torusGeometry args={[2, 0.3, 12, 32]} />
        <meshStandardMaterial
          color={frameColor}
          emissive={frameColor}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial color={innerColor} transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[1.8, 32]} />
        <meshBasicMaterial color={frameColor} transparent opacity={0.3} />
      </mesh>
      <Html position={[0, 2.8, 0]} center distanceFactor={16} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-4 py-2 text-sm font-black text-white shadow-xl">
          {label}
        </div>
      </Html>
    </group>
  )
}

type Mode = 'classic' | 'tsunami'

function BrainrotZone({ center }: { center: [number, number, number] }) {
  const [cx, cy, cz] = center
  const [mode, setMode] = useState<Mode>('classic')
  const [waveT, setWaveT] = useState(0)

  const figures = useMemo(() => {
    let seed = 42
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const names = [
      'Kaplanpizza',
      'Robotbalık',
      'Uzaylıpapyon',
      'Muzkopter',
      'Zebraaçı',
      'Baykuşbotu',
      'Timsahkuyruk',
      'Kedikesekoltuk',
      'Firavunfaresi',
      'Dondurma-Fil',
      'Gergedan-Spor',
      'Kanarya-Roket',
    ]
    return names.map((n, i) => {
      const ang = (i / names.length) * Math.PI * 2
      const r = 8 + rand() * 2
      return {
        name: n,
        x: Math.cos(ang) * r,
        z: Math.sin(ang) * r,
        hue: (i / names.length) * 360,
        shape: ['cube', 'sphere', 'cone', 'cyl'][Math.floor(rand() * 4)],
      }
    })
  }, [])

  const platformRef = useRef<Group>(null)
  useFrame((state, delta) => {
    if (!platformRef.current) return
    const t = state.clock.elapsedTime
    platformRef.current.position.y = Math.sin(t * 0.4) * 0.3
    platformRef.current.rotation.y = t * 0.03
    if (mode === 'tsunami') {
      setWaveT((prev) => (prev + delta / 10) % 1)
    }
  })

  return (
    <group position={[cx, cy, cz]}>
      <group ref={platformRef}>
        {/* Uçan ada zemini — geniş platform */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[20, 0.5, 20]} position={[0, -0.5, 0]} />
          <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[22, 20, 1, 40]} />
            <meshToonMaterial color="#ff77ee" />
          </mesh>
          <mesh position={[0, -2, 0]} castShadow>
            <coneGeometry args={[16, 7, 32]} />
            <meshToonMaterial color="#a84ed0" />
          </mesh>
        </RigidBody>

        {/* Ana başlık */}
        <mesh position={[0, 7, -17]} castShadow>
          <boxGeometry args={[14, 3, 0.4]} />
          <meshToonMaterial color="#ff006e" />
        </mesh>
        <Html position={[0, 7, -16.8]} center distanceFactor={18} zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap px-2 text-3xl font-black text-white drop-shadow-[3px_3px_0_#000]">
            🎮 STEAL A BRAINROT
          </div>
        </Html>

        {/* Mod seçim tabelaları — iki tabla */}
        <ModeSign
          label="🎯 Klasik Mod"
          desc="Yaratıkları topla"
          active={mode === 'classic'}
          position={[-10, 2, -8]}
          onClick={() => setMode('classic')}
        />
        <ModeSign
          label="🌊 Tsunami Modu"
          desc="Dalgadan kaç!"
          active={mode === 'tsunami'}
          position={[10, 2, -8]}
          onClick={() => setMode('tsunami')}
        />

        {/* Mode-specific content */}
        {mode === 'classic' && (
          <ClassicMode figures={figures} />
        )}
        {mode === 'tsunami' && <TsunamiMode waveT={waveT} />}
      </group>
    </group>
  )
}

function ModeSign({
  label,
  desc,
  active,
  position,
  onClick,
}: {
  label: string
  desc: string
  active: boolean
  position: [number, number, number]
  onClick: () => void
}) {
  const ref = useRef<Group>(null)
  const lastTapT = useRef(-10)
  const glowRef = useRef<Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ref.current) ref.current.position.y = position[1] + Math.sin(t * 1.5) * 0.1
    if (glowRef.current && active) {
      const s = 1 + Math.sin(t * 3) * 0.1
      glowRef.current.scale.set(s, s, s)
    }
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    // Parent pozisyonu dahil etmek için world position kullan
    if (ref.current) {
      const worldPos = ref.current.getWorldPosition(
        ref.current.position.clone()
      )
      const dx = pp.x - worldPos.x
      const dz = pp.z - worldPos.z
      if (Math.hypot(dx, dz) < 2 && Math.abs(pp.y - worldPos.y) < 3) {
        if (t - lastTapT.current > 1.5) {
          lastTapT.current = t
          if (!active) onClick()
        }
      }
    }
  })

  return (
    <group ref={ref} position={position}>
      <mesh ref={glowRef} castShadow>
        <boxGeometry args={[4, 1.4, 0.3]} />
        <meshStandardMaterial
          color={active ? '#ffd60a' : '#4a5568'}
          emissive={active ? '#ffd60a' : '#000'}
          emissiveIntensity={active ? 0.8 : 0}
          toneMapped={false}
        />
      </mesh>
      <Html position={[0, 0, 0.2]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div
          className={`pointer-events-none flex flex-col items-center whitespace-nowrap px-2 py-0.5 text-sm font-bold ${
            active ? 'text-black' : 'text-white'
          }`}
        >
          <div>{label}</div>
          <div className="text-[10px] opacity-80">{desc}</div>
        </div>
      </Html>
    </group>
  )
}

function ClassicMode({
  figures,
}: {
  figures: Array<{
    name: string
    x: number
    z: number
    hue: number
    shape: string
  }>
}) {
  return (
    <>
      {/* Merkez koleksiyon kaidesi */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[2, 2.3, 1, 20]} />
        <meshToonMaterial color="#ffd60a" />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial
          color="#ffd60a"
          emissive="#ffd60a"
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      {figures.map((f, i) => (
        <BrainrotFigure key={i} {...f} />
      ))}
    </>
  )
}

function TsunamiMode({ waveT }: { waveT: number }) {
  // Dalga -22 → +22 arası ilerler, 10sn döngü
  const waveX = -22 + waveT * 44
  const waveRef = useRef<Mesh>(null)
  const lastHitT = useRef(0)

  useFrame((state) => {
    if (!waveRef.current) return
    const t = state.clock.elapsedTime
    waveRef.current.position.x = waveX
    waveRef.current.scale.y = 1 + Math.sin(t * 4) * 0.15

    // Oyuncu dalganın içinde mi?
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    // World pos hesapla - zone center bilmiyoruz ama parent zaten konumlandırılmış
    if (waveRef.current) {
      const wp = waveRef.current.getWorldPosition(
        waveRef.current.position.clone()
      )
      const dx = pp.x - wp.x
      if (Math.abs(dx) < 2 && Math.abs(pp.y - wp.y) < 4) {
        if (t - lastHitT.current > 1) {
          lastHitT.current = t
          player?.takeHit(10, [Math.sign(waveX + 0.01) * 12, 4, 0])
          spawnImpact(pp.x, pp.y + 0.5, pp.z, '#4aa3df', 2)
          playKo()
        }
      }
    }
  })

  return (
    <>
      {/* Dev su dalgası — hareket eden duvar */}
      <mesh ref={waveRef} position={[-22, 3, 0]} castShadow>
        <boxGeometry args={[3, 6, 40]} />
        <meshStandardMaterial
          color="#4aa3df"
          emissive="#1e90ff"
          emissiveIntensity={0.4}
          transparent
          opacity={0.85}
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
      {/* Dalganın üstünde köpük */}
      <mesh position={[waveX, 6.5, 0]}>
        <boxGeometry args={[3.5, 0.8, 41]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>

      {/* Hayatta kalma talimatı */}
      <Html
        position={[0, 5, 0]}
        center
        distanceFactor={12}
        zIndexRange={[10, 0]}
      >
        <div className="pointer-events-none whitespace-nowrap rounded-xl bg-black/80 px-4 py-2 text-xl font-black text-white shadow-xl">
          🌊 DALGADAN KAÇ! Zıpla veya koş!
        </div>
      </Html>
    </>
  )
}

function BrainrotFigure({
  name,
  x,
  z,
  hue,
  shape,
}: {
  name: string
  x: number
  z: number
  hue: number
  shape: string
}) {
  const groupRef = useRef<Group>(null)
  const [picked, setPicked] = useState(false)
  const [respawnAt, setRespawnAt] = useState(0)

  useEffect(() => {
    if (picked) {
      const at = performance.now() / 1000 + 15
      setRespawnAt(at)
    }
  }, [picked])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    if (picked) {
      if (t > respawnAt) {
        setPicked(false)
        groupRef.current.visible = true
      } else {
        groupRef.current.visible = false
      }
      return
    }
    groupRef.current.position.y = Math.sin(t * 2 + x) * 0.2 + 1
    groupRef.current.rotation.y = t * 0.5

    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    // world pos
    const wp = groupRef.current.getWorldPosition(
      groupRef.current.position.clone()
    )
    if (
      Math.hypot(pp.x - wp.x, pp.z - wp.z) < 1.5 &&
      Math.abs(pp.y - wp.y) < 4
    ) {
      setPicked(true)
      useGameStore.getState().addScore(30)
    }
    void hue
  })

  const color = `hsl(${hue}, 80%, 60%)`

  return (
    <group ref={groupRef} position={[x, 1, z]}>
      {shape === 'cube' && (
        <mesh castShadow>
          <boxGeometry args={[1, 1.2, 1]} />
          <meshToonMaterial color={color} />
        </mesh>
      )}
      {shape === 'sphere' && (
        <mesh castShadow>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshToonMaterial color={color} />
        </mesh>
      )}
      {shape === 'cone' && (
        <mesh castShadow>
          <coneGeometry args={[0.7, 1.4, 14]} />
          <meshToonMaterial color={color} />
        </mesh>
      )}
      {shape === 'cyl' && (
        <mesh castShadow>
          <cylinderGeometry args={[0.5, 0.7, 1.3, 14]} />
          <meshToonMaterial color={color} />
        </mesh>
      )}
      <mesh position={[0.3, 0.35, 0.5]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[-0.3, 0.35, 0.5]}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[0.35, 0.4, 0.65]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <mesh position={[-0.25, 0.3, 0.65]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <Html position={[0, 1.4, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white shadow">
          {name}
        </div>
      </Html>
    </group>
  )
}
