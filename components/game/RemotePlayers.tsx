'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import { getRemotes, subscribeMP, type RemotePlayer } from '@/lib/multiplayer'

export default function RemotePlayers() {
  const [players, setPlayers] = useState<RemotePlayer[]>([])

  useEffect(() => {
    const update = () => setPlayers(getRemotes())
    update()
    return subscribeMP(update)
  }, [])

  return (
    <>
      {players.map((p) => (
        <RemotePlayerMesh key={p.id} player={p} />
      ))}
    </>
  )
}

function RemotePlayerMesh({ player }: { player: RemotePlayer }) {
  const groupRef = useRef<Group>(null)
  // Smooth interpolation toward latest target
  const target = useRef({ x: player.x, y: player.y, z: player.z, yaw: player.yaw })

  useEffect(() => {
    target.current = {
      x: player.x,
      y: player.y,
      z: player.z,
      yaw: player.yaw,
    }
  }, [player.x, player.y, player.z, player.yaw])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const g = groupRef.current
    const t = 1 - Math.exp(-14 * delta)
    g.position.x += (target.current.x - g.position.x) * t
    g.position.y += (target.current.y - g.position.y) * t
    g.position.z += (target.current.z - g.position.z) * t
    // Smooth yaw
    const cur = g.rotation.y
    let diff =
      ((target.current.yaw - cur + Math.PI) % (Math.PI * 2) +
        Math.PI * 2) %
        (Math.PI * 2) -
      Math.PI
    g.rotation.y = cur + diff * t
    g.scale.setScalar(player.scale)
  })

  return (
    <group ref={groupRef} position={[player.x, player.y, player.z]}>
      {/* Simple capsule body with unique color based on id */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <capsuleGeometry args={[0.45, 0.5, 6, 12]} />
        <meshToonMaterial color={colorFromId(player.id)} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.7, 14, 14]} />
        <meshToonMaterial color="#ffd89c" />
      </mesh>
      <mesh position={[0.25, 0.9, 0.58]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.25, 0.9, 0.58]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0.72, 0.63]} rotation={[Math.PI, 0, 0]}>
        <torusGeometry args={[0.22, 0.05, 6, 14, Math.PI]} />
        <meshBasicMaterial color="#b23a48" />
      </mesh>
      {/* Legs */}
      <mesh position={[0.22, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 10]} />
        <meshToonMaterial color="#118ab2" />
      </mesh>
      <mesh position={[-0.22, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 10]} />
        <meshToonMaterial color="#118ab2" />
      </mesh>
      {/* Arms */}
      <mesh position={[0.55, 0.05, 0]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
        <meshToonMaterial color={colorFromId(player.id)} />
      </mesh>
      <mesh position={[-0.55, 0.05, 0]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
        <meshToonMaterial color={colorFromId(player.id)} />
      </mesh>
      {/* Nickname label */}
      <Html
        position={[0, 1.9, 0]}
        center
        distanceFactor={15}
        occlude={false}
        zIndexRange={[10, 0]}
      >
        <div className="pointer-events-none select-none whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
          {player.nickname || '?'}
        </div>
      </Html>
    </group>
  )
}

function colorFromId(id: string): string {
  // Hash id → color from palette
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  const palette = [
    '#ef476f',
    '#06d6a0',
    '#118ab2',
    '#ffd166',
    '#c77dff',
    '#f4a261',
    '#fb5607',
    '#8338ec',
  ]
  return palette[Math.abs(h) % palette.length]
}
