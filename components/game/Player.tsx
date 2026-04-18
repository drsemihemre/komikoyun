'use client'

import { useRef } from 'react'
import {
  RigidBody,
  CapsuleCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { Vector3 } from 'three'
import { useGameStore } from '@/lib/store'

const SPEED = 9
const JUMP = 11
const DEADZONE = 0.12

export default function Player() {
  const body = useRef<RapierRigidBody>(null)
  const [, getKeys] = useKeyboardControls()
  const tmp = useRef(new Vector3())
  const camTarget = useRef(new Vector3(0, 5, 12))

  useFrame((state, delta) => {
    if (!body.current) return

    const mobileMove = useGameStore.getState().mobileMove
    const mobileJump = useGameStore.getState().mobileJump
    const keys = getKeys()

    const input = tmp.current.set(0, 0, 0)
    if (keys.forward) input.z -= 1
    if (keys.backward) input.z += 1
    if (keys.left) input.x -= 1
    if (keys.right) input.x += 1
    if (Math.abs(mobileMove.x) > DEADZONE) input.x += mobileMove.x
    if (Math.abs(mobileMove.y) > DEADZONE) input.z += mobileMove.y

    if (input.lengthSq() > 1) input.normalize()

    const linvel = body.current.linvel()
    body.current.setLinvel(
      { x: input.x * SPEED, y: linvel.y, z: input.z * SPEED },
      true
    )

    const grounded = Math.abs(linvel.y) < 0.2
    if ((keys.jump || mobileJump) && grounded) {
      body.current.applyImpulse({ x: 0, y: JUMP, z: 0 }, true)
    }

    // Orient visual toward movement
    if (input.lengthSq() > 0.01) {
      const angle = Math.atan2(input.x, input.z)
      body.current.setRotation(
        { x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) },
        true
      )
    }

    // Third-person camera follow
    const pos = body.current.translation()
    const desired = camTarget.current.set(pos.x, pos.y + 6, pos.z + 14)
    state.camera.position.lerp(desired, 1 - Math.pow(0.001, delta))
    state.camera.lookAt(pos.x, pos.y + 1, pos.z)

    // Respawn if fell off world
    if (pos.y < -25) {
      body.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  })

  return (
    <RigidBody
      ref={body}
      position={[0, 3, 0]}
      colliders={false}
      enabledRotations={[false, true, false]}
      mass={1.4}
      linearDamping={0.4}
      angularDamping={0.6}
      friction={0.7}
      ccd
    >
      <CapsuleCollider args={[0.5, 0.55]} position={[0, 0, 0]} />
      <CharacterMesh />
    </RigidBody>
  )
}

function CharacterMesh() {
  return (
    <group>
      {/* Big head */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshToonMaterial color="#ffd89c" />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.25, 0.9, 0.58]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.25, 0.9, 0.58]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>
      {/* Smile */}
      <mesh position={[0, 0.6, 0.62]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.2, 0.04, 8, 16, Math.PI]} />
        <meshBasicMaterial color="#b23a48" />
      </mesh>
      {/* Small body */}
      <mesh position={[0, -0.1, 0]} castShadow>
        <capsuleGeometry args={[0.45, 0.5, 8, 16]} />
        <meshToonMaterial color="#ef476f" />
      </mesh>
      {/* Short fat legs */}
      <mesh position={[0.22, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.4, 12]} />
        <meshToonMaterial color="#118ab2" />
      </mesh>
      <mesh position={[-0.22, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.4, 12]} />
        <meshToonMaterial color="#118ab2" />
      </mesh>
      {/* Arms */}
      <mesh position={[0.55, 0.05, 0]} rotation={[0, 0, 0.3]} castShadow>
        <capsuleGeometry args={[0.13, 0.4, 6, 12]} />
        <meshToonMaterial color="#ef476f" />
      </mesh>
      <mesh position={[-0.55, 0.05, 0]} rotation={[0, 0, -0.3]} castShadow>
        <capsuleGeometry args={[0.13, 0.4, 6, 12]} />
        <meshToonMaterial color="#ef476f" />
      </mesh>
    </group>
  )
}
