'use client'

import { useEffect, useRef } from 'react'
import {
  RigidBody,
  CapsuleCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import {
  registerCreature,
  unregisterCreature,
  type CreatureHandle,
} from '@/lib/creatureRegistry'

type Props = {
  id: string
  spawn: [number, number, number]
  arenaCenter: [number, number, number]
  arenaRadius: number
  color: string
}

const WANDER_SPEED = 2.2

export default function Creature({
  id,
  spawn,
  arenaCenter,
  arenaRadius,
  color,
}: Props) {
  const body = useRef<RapierRigidBody>(null)
  const visualGroup = useRef<Group>(null)
  const armsGroup = useRef<Group>(null)

  const targetDir = useRef(new Vector3(1, 0, 0))
  const changeDirAt = useRef(0)
  const isRagdoll = useRef(false)
  const ragdollStartT = useRef(0)
  const walkPhase = useRef(0)

  useEffect(() => {
    const handle: CreatureHandle = {
      id,
      getPos: () => {
        if (!body.current) return null
        const p = body.current.translation()
        return { x: p.x, y: p.y, z: p.z }
      },
      takeHit: (force) => {
        if (!body.current) return
        isRagdoll.current = true
        ragdollStartT.current = performance.now() / 1000
        body.current.setEnabledRotations(true, true, true, true)
        body.current.applyImpulse(
          { x: force[0], y: force[1], z: force[2] },
          true
        )
        body.current.applyTorqueImpulse(
          {
            x: (Math.random() - 0.5) * 6,
            y: (Math.random() - 0.5) * 6,
            z: (Math.random() - 0.5) * 6,
          },
          true
        )
      },
    }
    registerCreature(handle)
    return () => unregisterCreature(handle)
  }, [id])

  useFrame((state, delta) => {
    if (!body.current) return
    const now = state.clock.elapsedTime

    // Recovery
    if (isRagdoll.current) {
      const linvel = body.current.linvel()
      const speed = Math.hypot(linvel.x, linvel.y, linvel.z)
      if (speed < 0.8 && now - ragdollStartT.current > 2.5) {
        // Respawn-like recovery
        isRagdoll.current = false
        body.current.setEnabledRotations(false, true, false, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        const pos = body.current.translation()
        body.current.setTranslation(
          { x: pos.x, y: pos.y + 0.3, z: pos.z },
          true
        )
        changeDirAt.current = now + 0.4
      }
    }

    if (isRagdoll.current) {
      // Limb flail during ragdoll
      if (armsGroup.current) {
        armsGroup.current.rotation.z = Math.sin(now * 8) * 0.8
        armsGroup.current.rotation.x = Math.cos(now * 7) * 0.6
      }
      return
    }

    const pos = body.current.translation()

    // Change direction periodically
    if (now > changeDirAt.current) {
      const ang = Math.random() * Math.PI * 2
      targetDir.current.set(Math.cos(ang), 0, Math.sin(ang))
      changeDirAt.current = now + 1.5 + Math.random() * 2
    }

    // Stay in arena
    const dx = pos.x - arenaCenter[0]
    const dz = pos.z - arenaCenter[2]
    const distFromCenter = Math.hypot(dx, dz)
    if (distFromCenter > arenaRadius - 1.5) {
      targetDir.current.set(-dx, 0, -dz).normalize()
      changeDirAt.current = now + 2
    }

    // Move
    const linvel = body.current.linvel()
    body.current.setLinvel(
      {
        x: targetDir.current.x * WANDER_SPEED,
        y: linvel.y,
        z: targetDir.current.z * WANDER_SPEED,
      },
      true
    )

    // Face direction
    const yaw = Math.atan2(targetDir.current.x, targetDir.current.z)
    body.current.setRotation(
      { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
      true
    )

    // Simple walk bob
    walkPhase.current += delta * 6
    if (visualGroup.current) {
      visualGroup.current.position.y = Math.abs(Math.sin(walkPhase.current)) * 0.08
    }
    if (armsGroup.current) {
      armsGroup.current.rotation.z = Math.sin(walkPhase.current) * 0.4
      armsGroup.current.rotation.x = 0
    }
  })

  return (
    <RigidBody
      ref={body}
      position={spawn}
      colliders={false}
      enabledRotations={[false, true, false]}
      mass={0.8}
      linearDamping={0.6}
      angularDamping={0.8}
      friction={0.7}
    >
      <CapsuleCollider args={[0.3, 0.38]} />
      <group ref={visualGroup}>
        {/* Body */}
        <mesh castShadow>
          <capsuleGeometry args={[0.38, 0.4, 8, 12]} />
          <meshToonMaterial color={color} />
        </mesh>
        {/* Arms (rotated group for animation) */}
        <group ref={armsGroup}>
          <mesh position={[0.42, 0.05, 0]} rotation={[0, 0, 0.4]} castShadow>
            <capsuleGeometry args={[0.1, 0.28, 6, 10]} />
            <meshToonMaterial color={color} />
          </mesh>
          <mesh position={[-0.42, 0.05, 0]} rotation={[0, 0, -0.4]} castShadow>
            <capsuleGeometry args={[0.1, 0.28, 6, 10]} />
            <meshToonMaterial color={color} />
          </mesh>
        </group>
        {/* Head */}
        <mesh position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.42, 14, 14]} />
          <meshToonMaterial color={color} />
        </mesh>
        {/* Eyes — goofy big */}
        <mesh position={[0.16, 0.82, 0.32]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color="white" />
        </mesh>
        <mesh position={[-0.16, 0.82, 0.32]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshBasicMaterial color="white" />
        </mesh>
        <mesh position={[0.18, 0.84, 0.42]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshBasicMaterial color="black" />
        </mesh>
        <mesh position={[-0.14, 0.8, 0.42]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshBasicMaterial color="black" />
        </mesh>
        {/* Goofy mouth */}
        <mesh position={[0, 0.58, 0.4]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#1a1a1a" />
        </mesh>
      </group>
    </RigidBody>
  )
}
