'use client'

import { useRef, useEffect } from 'react'
import {
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { useGameStore } from '@/lib/store'
import { getPlayerHandle } from '@/lib/playerHandle'

const KART_ID = 'main-kart'
const INTERACT_R = 3.5
const KART_POSITION: [number, number, number] = [48, 1, 80] // pit area

export default function DriveableKart() {
  const body = useRef<RapierRigidBody>(null)
  const [, getKeys] = useKeyboardControls()

  // E tuşu dinleyici — yaklaşınca bin/in
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if (e.repeat) return
      const player = getPlayerHandle()
      if (!player) return
      const pp = player.getPos()
      if (!pp || !body.current) return

      const isDriving =
        useGameStore.getState().drivingKart === KART_ID
      if (isDriving) {
        // İn
        useGameStore.getState().setDrivingKart(null)
        const kp = body.current.translation()
        player.teleportTo(kp.x + 2.5, kp.y + 1, kp.z)
      } else if (useGameStore.getState().drivingKart === null) {
        const kp = body.current.translation()
        const dist = Math.hypot(pp.x - kp.x, pp.z - kp.z)
        if (dist < INTERACT_R) {
          useGameStore.getState().setDrivingKart(KART_ID)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useFrame(() => {
    if (!body.current) return
    const isDriving =
      useGameStore.getState().drivingKart === KART_ID
    if (!isDriving) return

    const keys = getKeys()
    const rot = body.current.rotation()
    const yaw = 2 * Math.atan2(rot.y, rot.w)
    const fwdX = Math.sin(yaw)
    const fwdZ = Math.cos(yaw)

    const linvel = body.current.linvel()

    if (keys.forward) {
      body.current.applyImpulse(
        { x: fwdX * 25, y: 0, z: fwdZ * 25 },
        true
      )
    }
    if (keys.backward) {
      body.current.applyImpulse(
        { x: -fwdX * 15, y: 0, z: -fwdZ * 15 },
        true
      )
    }
    if (keys.left) {
      body.current.applyTorqueImpulse({ x: 0, y: 12, z: 0 }, true)
    }
    if (keys.right) {
      body.current.applyTorqueImpulse({ x: 0, y: -12, z: 0 }, true)
    }

    // Max speed limiter
    const speed = Math.hypot(linvel.x, linvel.z)
    const MAX_SPEED = 22
    if (speed > MAX_SPEED) {
      const s = MAX_SPEED / speed
      body.current.setLinvel(
        { x: linvel.x * s, y: linvel.y, z: linvel.z * s },
        true
      )
    }

    // Oyuncuyu karta yapıştır
    const pos = body.current.translation()
    const player = getPlayerHandle()
    if (player) {
      player.teleportTo(pos.x, pos.y + 0.8, pos.z)
    }
  })

  return (
    <RigidBody
      ref={body}
      position={KART_POSITION}
      colliders={false}
      mass={40}
      linearDamping={1.2}
      angularDamping={3}
      enabledRotations={[false, true, false]}
      friction={0.8}
    >
      <CuboidCollider args={[0.6, 0.3, 1]} />
      {/* Kart görseli */}
      <KartMesh />
      {/* Yaklaşınca prompt */}
      <KartPrompt />
    </RigidBody>
  )
}

function KartMesh() {
  return (
    <group>
      {/* Gövde */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.1, 0.35, 1.9]} />
        <meshToonMaterial color="#dc2626" />
      </mesh>
      {/* Koltuk */}
      <mesh position={[0, 0.65, -0.25]} castShadow>
        <boxGeometry args={[0.6, 0.3, 0.7]} />
        <meshToonMaterial color="#1a1a1a" />
      </mesh>
      {/* Koltuk arkası */}
      <mesh position={[0, 1, -0.55]} castShadow>
        <boxGeometry args={[0.6, 0.6, 0.15]} />
        <meshToonMaterial color="#1a1a1a" />
      </mesh>
      {/* Direksiyon */}
      <mesh position={[0, 0.9, 0.45]} rotation={[0.8, 0, 0]} castShadow>
        <torusGeometry args={[0.15, 0.03, 6, 12]} />
        <meshToonMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0.8, 0.35]} rotation={[0.8, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
        <meshToonMaterial color="#1a1a1a" />
      </mesh>
      {/* Tekerler */}
      {[
        [-0.6, 0.2, 0.7],
        [0.6, 0.2, 0.7],
        [-0.6, 0.2, -0.7],
        [0.6, 0.2, -0.7],
      ].map((w, i) => (
        <mesh
          key={i}
          position={[w[0], w[1], w[2]]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.25, 0.25, 0.18, 14]} />
          <meshToonMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {/* Ön tampon */}
      <mesh position={[0, 0.3, 1.05]} castShadow>
        <boxGeometry args={[0.85, 0.25, 0.3]} />
        <meshToonMaterial color="#ffd166" />
      </mesh>
      {/* Egzoz */}
      <mesh position={[0.45, 0.5, -0.95]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
        <meshToonMaterial color="#6c757d" />
      </mesh>
      {/* Numara */}
      <mesh position={[0, 0.7, 0.86]}>
        <boxGeometry args={[0.6, 0.2, 0.02]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  )
}

function KartPrompt() {
  const isDriving = useGameStore((s) => s.drivingKart === KART_ID)
  if (isDriving) return null
  return (
    <mesh position={[0, 2.5, 0]}>
      <sphereGeometry args={[0.3, 10, 10]} />
      <meshStandardMaterial
        color="#ffd60a"
        emissive="#ffd60a"
        emissiveIntensity={1.2}
      />
    </mesh>
  )
}
