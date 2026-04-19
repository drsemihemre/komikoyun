'use client'

import { useRef } from 'react'
import {
  RigidBody,
  CapsuleCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { Vector3, MathUtils, type Group } from 'three'
import { useGameStore } from '@/lib/store'

const BASE_SPEED = 10
const JUMP = 12
const DEADZONE = 0.12
const INPUT_SMOOTH = 14 // higher = more responsive
const ROT_SMOOTH = 12

export default function Player() {
  const body = useRef<RapierRigidBody>(null)
  const visualRef = useRef<Group>(null)
  const [, getKeys] = useKeyboardControls()

  const input = useRef(new Vector3())
  const smoothInput = useRef(new Vector3())
  const camDesired = useRef(new Vector3())
  const camLookAt = useRef(new Vector3())
  const camCurrentLook = useRef(new Vector3(0, 1, 0))
  const targetYaw = useRef(0)
  const currentYaw = useRef(0)

  useFrame((state, delta) => {
    if (!body.current) return

    const { mobileMove, mobileJump, scale, speedMult } = useGameStore.getState()
    const keys = getKeys()

    // Build raw input
    const raw = input.current.set(0, 0, 0)
    if (keys.forward) raw.z -= 1
    if (keys.backward) raw.z += 1
    if (keys.left) raw.x -= 1
    if (keys.right) raw.x += 1
    if (Math.abs(mobileMove.x) > DEADZONE) raw.x += mobileMove.x
    if (Math.abs(mobileMove.y) > DEADZONE) raw.z += mobileMove.y
    if (raw.lengthSq() > 1) raw.normalize()

    // Smooth input for non-jerky movement
    const tLerp = 1 - Math.exp(-INPUT_SMOOTH * delta)
    smoothInput.current.lerp(raw, tLerp)
    const si = smoothInput.current

    // Apply velocity
    const speed = BASE_SPEED * speedMult * Math.sqrt(scale) // bigger = slightly faster physical step
    const linvel = body.current.linvel()
    body.current.setLinvel(
      { x: si.x * speed, y: linvel.y, z: si.z * speed },
      true
    )

    // Jump (grounded check via vertical velocity)
    const grounded = Math.abs(linvel.y) < 0.3
    if ((keys.jump || mobileJump) && grounded) {
      body.current.applyImpulse(
        { x: 0, y: JUMP * Math.max(0.7, scale * 0.9) * body.current.mass(), z: 0 },
        true
      )
    }

    // Orient character visual toward movement direction (smoothed yaw)
    if (raw.lengthSq() > 0.01) {
      targetYaw.current = Math.atan2(raw.x, raw.z)
    }
    currentYaw.current = lerpAngle(
      currentYaw.current,
      targetYaw.current,
      1 - Math.exp(-ROT_SMOOTH * delta)
    )
    if (visualRef.current) {
      visualRef.current.rotation.y = currentYaw.current
      visualRef.current.scale.setScalar(scale)
    }

    // Third-person camera with smooth follow and look-at
    const pos = body.current.translation()
    const camHeight = 6 + scale * 1.5
    const camBack = 13 + scale * 2
    camDesired.current.set(pos.x, pos.y + camHeight, pos.z + camBack)
    const camT = 1 - Math.exp(-6 * delta)
    state.camera.position.lerp(camDesired.current, camT)

    camLookAt.current.set(pos.x, pos.y + 1.2 * scale, pos.z)
    camCurrentLook.current.lerp(camLookAt.current, 1 - Math.exp(-10 * delta))
    state.camera.lookAt(camCurrentLook.current)

    // Respawn safeguard
    if (pos.y < -25) {
      body.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      smoothInput.current.set(0, 0, 0)
    }
  })

  const scale = useGameStore((s) => s.scale)

  return (
    <RigidBody
      ref={body}
      position={[0, 3, 0]}
      colliders={false}
      enabledRotations={[false, false, false]}
      mass={1.4}
      linearDamping={1.2}
      angularDamping={1.5}
      friction={0.6}
    >
      <CapsuleCollider args={[0.5 * scale, 0.55 * scale]} />
      <group ref={visualRef}>
        <CharacterMesh />
      </group>
    </RigidBody>
  )
}

function lerpAngle(a: number, b: number, t: number) {
  const diff = MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI
  return a + diff * t
}

function CharacterMesh() {
  return (
    <group>
      {/* Big head */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.7, 18, 18]} />
        <meshToonMaterial color="#ffd89c" />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.25, 0.9, 0.58]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.25, 0.9, 0.58]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Smile */}
      <mesh position={[0, 0.6, 0.62]}>
        <torusGeometry args={[0.2, 0.04, 6, 14, Math.PI]} />
        <meshBasicMaterial color="#b23a48" />
      </mesh>
      {/* Small body */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <capsuleGeometry args={[0.45, 0.5, 6, 12]} />
        <meshToonMaterial color="#ef476f" />
      </mesh>
      {/* Short fat legs */}
      <mesh position={[0.22, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.4, 10]} />
        <meshToonMaterial color="#118ab2" />
      </mesh>
      <mesh position={[-0.22, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.4, 10]} />
        <meshToonMaterial color="#118ab2" />
      </mesh>
      {/* Arms */}
      <mesh position={[0.55, 0.05, 0]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
        <meshToonMaterial color="#ef476f" />
      </mesh>
      <mesh position={[-0.55, 0.05, 0]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
        <meshToonMaterial color="#ef476f" />
      </mesh>
    </group>
  )
}
