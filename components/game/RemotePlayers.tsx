'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { MathUtils, type Group } from 'three'
import { getRemotes, subscribeMP, type RemotePlayer } from '@/lib/multiplayer'
import { HatMesh } from './Player'
import HairMesh from './HairMesh'

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
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)
  const bodyTilt = useRef<Group>(null)
  const initialized = useRef(false)
  const target = useRef({
    x: player.x,
    y: player.y,
    z: player.z,
    yaw: player.yaw,
  })
  const prev = useRef({ x: player.x, z: player.z, t: performance.now() / 1000 })
  const walkPhase = useRef(0)
  const smoothSpeed = useRef(0)

  useEffect(() => {
    target.current = {
      x: player.x,
      y: player.y,
      z: player.z,
      yaw: player.yaw,
    }
  }, [player.x, player.y, player.z, player.yaw])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const g = groupRef.current
    // İlk frame'de anında snap et (uzak yerden lerping görünmesin)
    if (!initialized.current) {
      g.position.set(target.current.x, target.current.y, target.current.z)
      g.rotation.y = target.current.yaw
      prev.current = {
        x: target.current.x,
        z: target.current.z,
        t: state.clock.elapsedTime,
      }
      initialized.current = true
    }
    const t = 1 - Math.exp(-14 * delta)
    g.position.x += (target.current.x - g.position.x) * t
    g.position.y += (target.current.y - g.position.y) * t
    g.position.z += (target.current.z - g.position.z) * t
    const cur = g.rotation.y
    const diff =
      (((target.current.yaw - cur + Math.PI) % (Math.PI * 2)) +
        Math.PI * 2) %
        (Math.PI * 2) -
      Math.PI
    g.rotation.y = cur + diff * t
    g.scale.setScalar(player.scale)

    // Hareket hızını türet (remote mesh pozisyon değişiminden)
    const now = state.clock.elapsedTime
    const dt = Math.max(0.001, now - prev.current.t)
    const dx = g.position.x - prev.current.x
    const dz = g.position.z - prev.current.z
    const dist = Math.hypot(dx, dz)
    const instSpeed = dist / dt
    prev.current = { x: g.position.x, z: g.position.z, t: now }
    // Normalize to 0..1 walkIntensity (3 m/s full)
    const walkIntensity = Math.min(1, instSpeed / 3)
    smoothSpeed.current = MathUtils.damp(
      smoothSpeed.current,
      walkIntensity,
      8,
      delta
    )

    walkPhase.current += delta * 7 * smoothSpeed.current
    const swing = Math.sin(walkPhase.current) * 0.8 * smoothSpeed.current

    if (leftLeg.current && rightLeg.current) {
      leftLeg.current.rotation.x = swing
      rightLeg.current.rotation.x = -swing
    }
    if (leftArm.current && rightArm.current) {
      leftArm.current.rotation.x = -swing * 0.9
      rightArm.current.rotation.x = swing * 0.9
      leftArm.current.rotation.z = 0.3
      rightArm.current.rotation.z = -0.3
    }
    if (bodyTilt.current) {
      bodyTilt.current.rotation.x = -smoothSpeed.current * 0.15
      bodyTilt.current.position.y =
        Math.abs(Math.sin(walkPhase.current)) * 0.07 * smoothSpeed.current
    }
  })

  const hpPct = Math.max(0, Math.min(100, (player.hp / 100) * 100))
  const hatKind = (player.hatKind || 'none') as
    | 'none'
    | 'cone'
    | 'cylinder'
    | 'crown'
    | 'beanie'
  const bodyColor = player.bodyColor || '#ef476f'
  const hatColor = player.hatColor || '#1a1a1a'

  return (
    <group ref={groupRef}>
      <group ref={bodyTilt}>
        {/* Body */}
        <mesh position={[0, -0.1, 0]} castShadow>
          <capsuleGeometry args={[0.45, 0.5, 6, 12]} />
          <meshToonMaterial color={bodyColor} />
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
        {/* Saç + şapka — başın üstünde */}
        <group position={[0, 0.65, 0]}>
          <HairMesh
            gender={(player.gender || 'boy') as 'boy' | 'girl'}
            color={player.hairColor || '#3d2817'}
          />
          <HatMesh kind={hatKind} color={hatColor} />
        </group>
        {/* Legs — pivot gruplarıyla (sallanabilsin) */}
        <group ref={leftLeg} position={[0.22, -0.5, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.5, 10]} />
            <meshToonMaterial color="#118ab2" />
          </mesh>
          <mesh position={[0, -0.6, 0.1]} castShadow>
            <boxGeometry args={[0.28, 0.15, 0.4]} />
            <meshToonMaterial color="#1a1a1a" />
          </mesh>
        </group>
        <group ref={rightLeg} position={[-0.22, -0.5, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.22, 0.5, 10]} />
            <meshToonMaterial color="#118ab2" />
          </mesh>
          <mesh position={[0, -0.6, 0.1]} castShadow>
            <boxGeometry args={[0.28, 0.15, 0.4]} />
            <meshToonMaterial color="#1a1a1a" />
          </mesh>
        </group>
        {/* Arms */}
        <group ref={leftArm} position={[0.55, 0.25, 0]}>
          <mesh position={[0, -0.25, 0]} rotation={[0, 0, 0.3]} castShadow>
            <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
            <meshToonMaterial color={bodyColor} />
          </mesh>
        </group>
        <group ref={rightArm} position={[-0.55, 0.25, 0]}>
          <mesh position={[0, -0.25, 0]} rotation={[0, 0, -0.3]} castShadow>
            <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
            <meshToonMaterial color={bodyColor} />
          </mesh>
        </group>
      </group>
      {/* Nickname + HP */}
      <Html
        position={[0, 2.1, 0]}
        center
        distanceFactor={15}
        occlude={false}
        zIndexRange={[10, 0]}
      >
        <div className="pointer-events-none flex select-none flex-col items-center gap-0.5 whitespace-nowrap">
          <div className="rounded-full bg-black/60 px-3 py-0.5 text-sm font-bold text-white shadow-lg backdrop-blur-sm">
            {player.nickname || '?'}
          </div>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-green-500"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      </Html>
    </group>
  )
}
