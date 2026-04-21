'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import type { Mesh } from 'three'
import { useGameStore } from '@/lib/store'
import { getPlayerHandle } from '@/lib/playerHandle'

const MATERIAL_COLORS: Record<string, string> = {
  stone: '#8d9196',
  wood: '#8d6e63',
  glass: '#a2d2ff',
  brick: '#c0392b',
  grass: '#4caf50',
}

// Oyuncunun önünde hedef blok pozisyonu (shared utility)
export function computeBuildTarget(): [number, number, number] | null {
  const player = getPlayerHandle()
  if (!player) return null
  const pp = player.getPos()
  if (!pp) return null
  const yaw = player.getYaw()
  const fx = Math.sin(yaw)
  const fz = Math.cos(yaw)
  const gx = Math.round(pp.x + fx * 3)
  const gy = Math.round(Math.max(0, pp.y))
  const gz = Math.round(pp.z + fz * 3)
  return [gx, Math.max(0, gy), gz]
}

export default function PlacedBlocks() {
  const blocks = useGameStore((s) => s.placedBlocks)
  return (
    <>
      {blocks.map((b) => (
        <RigidBody key={b.id} type="fixed" colliders={false}>
          <CuboidCollider args={[0.5, 0.5, 0.5]} position={[b.x, b.y, b.z]} />
          <mesh position={[b.x, b.y, b.z]} castShadow receiveShadow>
            <boxGeometry args={[1, 1, 1]} />
            {b.material === 'glass' ? (
              <meshStandardMaterial
                color={MATERIAL_COLORS[b.material]}
                transparent
                opacity={0.5}
                metalness={0.2}
                roughness={0.1}
              />
            ) : (
              <meshToonMaterial color={MATERIAL_COLORS[b.material]} />
            )}
          </mesh>
        </RigidBody>
      ))}
      <BuildGhost />
    </>
  )
}

function BuildGhost() {
  const buildMode = useGameStore((s) => s.buildMode)
  const material = useGameStore((s) => s.buildMaterial)
  const ghostRef = useRef<Mesh>(null)

  useFrame(() => {
    const g = ghostRef.current
    if (!g) return
    if (!buildMode) {
      g.visible = false
      return
    }
    const target = computeBuildTarget()
    if (!target) {
      g.visible = false
      return
    }
    g.visible = true
    g.position.set(target[0], target[1] + 0.5, target[2])
  })

  return (
    <mesh ref={ghostRef}>
      <boxGeometry args={[1.02, 1.02, 1.02]} />
      <meshBasicMaterial
        color={MATERIAL_COLORS[material]}
        transparent
        opacity={0.5}
        wireframe
      />
    </mesh>
  )
}
