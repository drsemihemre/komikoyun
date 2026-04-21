'use client'

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { Group, Mesh } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { spawnImpact } from '@/lib/particles'
import { playLaunch } from '@/lib/sounds'
import { useGameStore } from '@/lib/store'

// Ana dünyada portal (pembe-mor ring) + uzakta ayrı "sürpriz oyun alanı"
// Walk-in → teleport (+150 Y, farklı coord)
// Dönüş portalı gerisine ışınlar

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
        position={[ZONE_CENTER[0], ZONE_CENTER[1] + 1.5, ZONE_CENTER[2]]}
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
      {/* Oval çerçeve */}
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <torusGeometry args={[2, 0.3, 12, 32]} />
        <meshStandardMaterial
          color={frameColor}
          emissive={frameColor}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {/* İç "portal" yüzeyi — renkli düzlem */}
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

// Brainrot-benzeri ayrı alan: yukarıda yüzen platform + komik karakterler
function BrainrotZone({ center }: { center: [number, number, number] }) {
  const [cx, cy, cz] = center

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
  useFrame((state) => {
    if (!platformRef.current) return
    const t = state.clock.elapsedTime
    platformRef.current.position.y = Math.sin(t * 0.4) * 0.3
    platformRef.current.rotation.y = t * 0.05
  })

  return (
    <group position={[cx, cy, cz]}>
      <group ref={platformRef}>
        {/* Uçan ada zemini */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[14, 0.5, 14]} position={[0, -0.5, 0]} />
          <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[16, 14, 1, 32]} />
            <meshToonMaterial color="#ff00ff" />
          </mesh>
          {/* Alt dekoratif sarkıklar */}
          <mesh position={[0, -2, 0]} castShadow>
            <coneGeometry args={[12, 6, 24]} />
            <meshToonMaterial color="#9d4edd" />
          </mesh>
        </RigidBody>

        {/* Sign */}
        <mesh position={[0, 6, -10]} castShadow>
          <boxGeometry args={[8, 2, 0.3]} />
          <meshToonMaterial color="#ff006e" />
        </mesh>
        <Html position={[0, 6, -9.8]} center distanceFactor={16} zIndexRange={[10, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded-lg bg-black/0 px-2 text-2xl font-black text-white drop-shadow-[2px_2px_0_#000]">
            🎮 SÜRPRİZ DÜNYA
          </div>
        </Html>

        {/* Komik koleksiyon figürleri */}
        {figures.map((f, i) => (
          <BrainrotFigure key={i} {...f} />
        ))}

        {/* Dekoratif renkli topaç */}
        <mesh position={[0, 2, 0]} castShadow>
          <sphereGeometry args={[1, 18, 18]} />
          <meshStandardMaterial
            color="#ffd60a"
            emissive="#ffd60a"
            emissiveIntensity={0.8}
            toneMapped={false}
          />
        </mesh>

        {/* Ses simgesi notaları — yüzer */}
        {[...Array(8)].map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <Html
              key={`n${i}`}
              position={[Math.cos(a) * 6, 3 + Math.sin(a * 3) * 0.5, Math.sin(a) * 6]}
              center
              distanceFactor={12}
              zIndexRange={[10, 0]}
            >
              <div className="pointer-events-none select-none text-3xl">
                🎵
              </div>
            </Html>
          )
        })}
      </group>
    </group>
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

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.position.y = Math.sin(t * 2 + x) * 0.2
    groupRef.current.rotation.y = t * 0.5

    if (picked) return
    const player = getPlayerHandle()
    const pp = player?.getPos()
    if (!pp) return
    const dx = pp.x - (x + 400)
    const dz = pp.z - (z + 400)
    // Absolute check — zone is at (400, 150, 400); figure positions are local
    // Convert local to world: add parent group position
    const worldX = groupRef.current.parent?.parent?.position.x ?? 0
    const worldZ = groupRef.current.parent?.parent?.position.z ?? 0
    const dx2 = pp.x - (worldX + x)
    const dz2 = pp.z - (worldZ + z)
    if (Math.hypot(dx2, dz2) < 1.5 && Math.abs(pp.y - 150) < 4) {
      setPicked(true)
      useGameStore.getState().addScore(30)
    }
    void dx
    void dz
    void hue
  })

  if (picked) return null

  const color = `hsl(${hue}, 80%, 60%)`

  return (
    <group ref={groupRef} position={[x, 2, z]}>
      {/* Gövde — shape'e göre farklı */}
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
      {/* Büyük komik gözler */}
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
