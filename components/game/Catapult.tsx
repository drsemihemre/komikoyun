'use client'

import { useRef } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { type Mesh, type Group, MathUtils } from 'three'
import { getPlayerHandle } from '@/lib/playerHandle'
import { playLaunch } from '@/lib/sounds'

const POS: [number, number, number] = [0, 0, -14]
// Launch vector: strong upward + northward (toward balloon palace at z=-75)
const LAUNCH_IMPULSE: [number, number, number] = [0, 32, -26]
const PAD_RADIUS = 2.6
const CHARGE_DURATION = 0.8
const COOLDOWN = 1.8

export default function Catapult() {
  const glowRef = useRef<Mesh>(null)
  const armRef = useRef<Group>(null)
  const chargeStart = useRef(-1)
  const lastLaunch = useRef(-10)

  useFrame((state) => {
    const now = state.clock.elapsedTime
    const player = getPlayerHandle()
    const pp = player?.getPos()
    const playerDown = player?.isDown() ?? true

    let onPad = false
    if (pp && !playerDown) {
      const dx = pp.x - POS[0]
      const dz = pp.z - POS[2]
      const d = Math.hypot(dx, dz)
      onPad = d < PAD_RADIUS && pp.y < POS[1] + 4 && pp.y > POS[1] - 1
    }

    const canCharge =
      onPad && chargeStart.current < 0 && now - lastLaunch.current > COOLDOWN

    if (canCharge) {
      chargeStart.current = now
    }

    let chargeProgress = 0
    if (chargeStart.current >= 0) {
      chargeProgress = Math.min(1, (now - chargeStart.current) / CHARGE_DURATION)

      if (!onPad) {
        // Aborted by stepping off
        chargeStart.current = -1
        chargeProgress = 0
      } else if (chargeProgress >= 1) {
        // LAUNCH!
        if (player) player.launch(LAUNCH_IMPULSE)
        playLaunch()
        chargeStart.current = -1
        lastLaunch.current = now
        chargeProgress = 0
      }
    }

    // Visual feedback
    if (glowRef.current) {
      const mat = glowRef.current.material as {
        emissiveIntensity?: number
        opacity?: number
      }
      if (mat && 'emissiveIntensity' in mat) {
        mat.emissiveIntensity = chargeProgress * 2
      }
      if (mat && 'opacity' in mat) {
        mat.opacity = 0.4 + chargeProgress * 0.5
      }
      // Subtle pulse
      const s = 1 + chargeProgress * 0.25 + Math.sin(now * 4) * 0.03
      glowRef.current.scale.set(s, 1 + chargeProgress * 0.6, s)
    }

    // Cannon arm tilts up when charging
    if (armRef.current) {
      const targetTilt = -0.6 - chargeProgress * 0.4
      armRef.current.rotation.x = MathUtils.damp(
        armRef.current.rotation.x,
        targetTilt,
        6,
        state.clock.getDelta() || 0.016
      )
    }
  })

  return (
    <group position={POS}>
      <RigidBody type="fixed" colliders={false}>
        {/* Stone base — player stands on this */}
        <CuboidCollider args={[PAD_RADIUS, 0.5, PAD_RADIUS]} position={[0, 0.5, 0]} />
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <cylinderGeometry
            args={[PAD_RADIUS + 0.2, PAD_RADIUS + 0.5, 1, 20]}
          />
          <meshToonMaterial color="#6c757d" />
        </mesh>
        {/* Rim */}
        <mesh position={[0, 1, 0]} castShadow>
          <torusGeometry args={[PAD_RADIUS + 0.15, 0.2, 8, 24]} />
          <meshToonMaterial color="#343a40" />
        </mesh>

        {/* Cannon barrel — mounted on back, angled */}
        <group ref={armRef} position={[0, 1.2, 1.5]} rotation={[-0.6, 0, 0]}>
          <mesh position={[0, 0, -1]} castShadow>
            <cylinderGeometry args={[0.6, 0.9, 3, 18]} />
            <meshToonMaterial color="#2d3436" />
          </mesh>
          {/* Barrel rim */}
          <mesh position={[0, 0, 0.5]} castShadow>
            <cylinderGeometry args={[0.75, 0.75, 0.4, 18]} />
            <meshToonMaterial color="#495057" />
          </mesh>
          {/* Barrel bands */}
          <mesh position={[0, 0, -0.5]} castShadow>
            <cylinderGeometry args={[0.7, 0.7, 0.15, 16]} />
            <meshToonMaterial color="#adb5bd" />
          </mesh>
        </group>

        {/* Support frame */}
        <mesh position={[0.8, 1.1, 1.5]} rotation={[0, 0, 0.3]} castShadow>
          <boxGeometry args={[0.3, 2.2, 0.3]} />
          <meshToonMaterial color="#8d6e63" />
        </mesh>
        <mesh position={[-0.8, 1.1, 1.5]} rotation={[0, 0, -0.3]} castShadow>
          <boxGeometry args={[0.3, 2.2, 0.3]} />
          <meshToonMaterial color="#8d6e63" />
        </mesh>
      </RigidBody>

      {/* Glowing launch pad (visual only) */}
      <mesh
        ref={glowRef}
        position={[0, 1.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.5, PAD_RADIUS - 0.1, 36]} />
        <meshBasicMaterial
          color="#ffd60a"
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* Center target */}
      <mesh position={[0, 1.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#fb5607" />
      </mesh>

      {/* Sign */}
      <mesh position={[0, 2.8, 3]} castShadow>
        <boxGeometry args={[3, 0.8, 0.2]} />
        <meshToonMaterial color="#fb5607" />
      </mesh>
    </group>
  )
}
