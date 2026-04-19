'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { Group } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { useGameStore } from '@/lib/store'

type Props = {
  kind: 'buy' | 'upgrade'
  position: [number, number, number]
}

const INTERACT_R = 3.2

export default function Shop({ kind, position }: Props) {
  const groupRef = useRef<Group>(null)
  const [nearby, setNearby] = useState(false)
  const isOpen = useGameStore((s) => s.shopOpen) === kind
  const openShop = useGameStore((s) => s.openShop)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const g = groupRef.current
    if (g) g.position.y = Math.sin(t * 1.5) * 0.03

    const p = getPlayerHandle()?.getPos()
    if (!p) {
      if (nearby) setNearby(false)
      return
    }
    const dx = p.x - position[0]
    const dz = p.z - position[2]
    const d = Math.hypot(dx, dz)
    const isNear = d < INTERACT_R
    if (isNear !== nearby) setNearby(isNear)
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if (e.repeat) return
      if (!nearby) return
      const s = useGameStore.getState()
      if (s.paused || !s.gameStarted) return
      // Toggle shop
      openShop(isOpen ? null : kind)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [nearby, isOpen, kind, openShop])

  const color = kind === 'buy' ? '#ef476f' : '#118ab2'
  const sign = kind === 'buy' ? '🔫 Silah Dükkanı' : '⚡ Güçlendirme'
  const [x, , z] = position

  return (
    <group position={[x, 0, z]}>
      <group ref={groupRef}>
        <RigidBody type="fixed" colliders={false}>
          {/* Dükkan tezgahı */}
          <CuboidCollider args={[1.5, 0.6, 0.8]} position={[0, 0.6, 0]} />
          <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[3, 1.2, 1.6]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Ön panel */}
          <mesh position={[0, 0.6, 0.82]} castShadow>
            <boxGeometry args={[2.8, 1, 0.1]} />
            <meshToonMaterial color="#fff0ea" />
          </mesh>
          {/* Çatı direkleri */}
          <mesh position={[-1.4, 1.9, -0.7]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 2.6, 8]} />
            <meshToonMaterial color="#6d4c41" />
          </mesh>
          <mesh position={[1.4, 1.9, -0.7]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 2.6, 8]} />
            <meshToonMaterial color="#6d4c41" />
          </mesh>
          <mesh position={[-1.4, 1.9, 0.7]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 2.6, 8]} />
            <meshToonMaterial color="#6d4c41" />
          </mesh>
          <mesh position={[1.4, 1.9, 0.7]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 2.6, 8]} />
            <meshToonMaterial color="#6d4c41" />
          </mesh>
          {/* Çizgili çatı */}
          <mesh position={[0, 3.3, 0]} castShadow>
            <coneGeometry args={[2.2, 1.4, 4]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Tezgah üstü: renk dalgalı geniş tepsi */}
          <mesh position={[0, 1.25, 0]}>
            <boxGeometry args={[2.7, 0.1, 1.4]} />
            <meshToonMaterial color="#ffd166" />
          </mesh>
          {/* Tabela */}
          <mesh position={[0, 2.6, 0.9]} castShadow>
            <boxGeometry args={[2.6, 0.6, 0.2]} />
            <meshToonMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 2.6, 1.01]}>
            <boxGeometry args={[2.5, 0.5, 0.02]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </RigidBody>

        {/* Floating label */}
        <Html
          position={[0, 3.5, 1]}
          center
          distanceFactor={16}
          zIndexRange={[10, 0]}
        >
          <div
            className="pointer-events-none whitespace-nowrap rounded-xl bg-black/75 px-4 py-2 text-base font-black text-white shadow-xl backdrop-blur-sm"
            style={{ color: '#fff' }}
          >
            {sign}
          </div>
        </Html>

        {/* Nearby: E prompt */}
        {nearby && !isOpen && (
          <Html
            position={[0, 2, 1]}
            center
            distanceFactor={10}
            zIndexRange={[10, 0]}
          >
            <div className="pointer-events-none flex items-center gap-2 whitespace-nowrap rounded-lg bg-yellow-400/95 px-3 py-1 text-sm font-black text-black shadow-xl">
              <span className="rounded border border-black bg-white px-1.5">
                E
              </span>
              <span>Dükkana gir</span>
            </div>
          </Html>
        )}
      </group>
    </group>
  )
}
