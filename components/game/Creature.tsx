'use client'

import { useEffect, useRef } from 'react'
import {
  RigidBody,
  CapsuleCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { Vector3, MathUtils, type Group } from 'three'
import {
  registerCreature,
  unregisterCreature,
  type CreatureHandle,
} from '@/lib/creatureRegistry'
import { getPlayerHandle } from '@/lib/playerHandle'

type Props = {
  id: string
  spawn: [number, number, number]
  arenaCenter: [number, number, number]
  arenaRadius: number
  color: string
}

const WANDER_SPEED = 2.2
const CHASE_SPEED = 3.4
const SIGHT_RANGE = 8
const ATTACK_RANGE = 1.8
const ATTACK_WINDUP = 0.25 // sn — yumruk kalkış
const ATTACK_STRIKE = 0.18 // sn — vuruş anı
const ATTACK_RECOVER = 0.45 // sn — toparlanma
const ATTACK_DAMAGE = 8
const ATTACK_COOLDOWN = 1.6

type AtkState = 'idle' | 'wind' | 'strike' | 'recover'

export default function Creature({
  id,
  spawn,
  arenaCenter,
  arenaRadius,
  color,
}: Props) {
  const body = useRef<RapierRigidBody>(null)
  const visualGroup = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const bodyTilt = useRef<Group>(null)

  const targetDir = useRef(new Vector3(1, 0, 0))
  const changeDirAt = useRef(0)
  const isRagdoll = useRef(false)
  const ragdollStartT = useRef(0)
  const walkPhase = useRef(0)

  // Attack state machine
  const atkState = useRef<AtkState>('idle')
  const atkT = useRef(0) // progress in current state
  const lastAtkEndT = useRef(-10)
  const hitAppliedThisAtk = useRef(false)

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
        atkState.current = 'idle'
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

    // --- Ragdoll recovery ---
    if (isRagdoll.current) {
      const linvel = body.current.linvel()
      const speed = Math.hypot(linvel.x, linvel.y, linvel.z)
      if (speed < 0.8 && now - ragdollStartT.current > 2.5) {
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

    // During ragdoll: flail visuals, skip logic
    if (isRagdoll.current) {
      if (leftArm.current) {
        leftArm.current.rotation.z = Math.sin(now * 8) * 0.8
        leftArm.current.rotation.x = Math.cos(now * 7) * 0.6
      }
      if (rightArm.current) {
        rightArm.current.rotation.z = -Math.sin(now * 9) * 0.8
        rightArm.current.rotation.x = Math.cos(now * 6) * 0.6
      }
      return
    }

    const pos = body.current.translation()
    const player = getPlayerHandle()
    const playerPos = player?.getPos()
    const playerDown = player?.isDown() ?? true

    // Distance to player
    let dx = 0,
      dz = 0,
      distToPlayer = Infinity
    if (playerPos && !playerDown) {
      dx = playerPos.x - pos.x
      dz = playerPos.z - pos.z
      distToPlayer = Math.hypot(dx, dz)
    }

    const canStartAttack =
      atkState.current === 'idle' &&
      distToPlayer < ATTACK_RANGE &&
      now - lastAtkEndT.current > ATTACK_COOLDOWN &&
      !playerDown

    // Attack state machine
    if (atkState.current === 'idle' && canStartAttack) {
      atkState.current = 'wind'
      atkT.current = 0
      hitAppliedThisAtk.current = false
    }

    if (atkState.current !== 'idle') {
      atkT.current += delta
      if (atkState.current === 'wind' && atkT.current >= ATTACK_WINDUP) {
        atkState.current = 'strike'
        atkT.current = 0
      } else if (atkState.current === 'strike') {
        // Apply hit once at mid-strike
        if (
          !hitAppliedThisAtk.current &&
          atkT.current > ATTACK_STRIKE * 0.4 &&
          player &&
          playerPos &&
          !playerDown &&
          distToPlayer < ATTACK_RANGE + 0.4
        ) {
          hitAppliedThisAtk.current = true
          const nx = dx / Math.max(distToPlayer, 0.01)
          const nz = dz / Math.max(distToPlayer, 0.01)
          player.takeHit(ATTACK_DAMAGE, [nx, 0.5, nz])
        }
        if (atkT.current >= ATTACK_STRIKE) {
          atkState.current = 'recover'
          atkT.current = 0
        }
      } else if (atkState.current === 'recover' && atkT.current >= ATTACK_RECOVER) {
        atkState.current = 'idle'
        atkT.current = 0
        lastAtkEndT.current = now
      }
    }

    // --- Movement ---
    let moveDir = targetDir.current
    const shouldChase =
      !playerDown &&
      distToPlayer < SIGHT_RANGE &&
      atkState.current === 'idle'

    if (shouldChase && distToPlayer > ATTACK_RANGE * 0.8) {
      // Head toward player
      const len = Math.max(distToPlayer, 0.01)
      targetDir.current.set(dx / len, 0, dz / len)
      changeDirAt.current = now + 0.3
    } else if (now > changeDirAt.current) {
      const ang = Math.random() * Math.PI * 2
      targetDir.current.set(Math.cos(ang), 0, Math.sin(ang))
      changeDirAt.current = now + 1.5 + Math.random() * 2
    }

    // Stay in arena when not chasing
    if (!shouldChase) {
      const ax = pos.x - arenaCenter[0]
      const az = pos.z - arenaCenter[2]
      const dc = Math.hypot(ax, az)
      if (dc > arenaRadius - 1.5) {
        targetDir.current.set(-ax, 0, -az).normalize()
        changeDirAt.current = now + 2
      }
    }

    // Velocity: slower during attack, 0 during strike
    const speedMult =
      atkState.current === 'strike'
        ? 0.2
        : atkState.current === 'wind'
          ? 0.4
          : atkState.current === 'recover'
            ? 0.3
            : shouldChase
              ? CHASE_SPEED / WANDER_SPEED
              : 1
    const linvel = body.current.linvel()
    const vSpeed = WANDER_SPEED * speedMult
    body.current.setLinvel(
      {
        x: moveDir.x * vSpeed,
        y: linvel.y,
        z: moveDir.z * vSpeed,
      },
      true
    )

    // Face direction (toward player when attacking/chasing)
    let faceDir = moveDir
    if (atkState.current !== 'idle' && playerPos) {
      const len = Math.max(distToPlayer, 0.01)
      faceDir = new Vector3(dx / len, 0, dz / len)
    }
    const yaw = Math.atan2(faceDir.x, faceDir.z)
    body.current.setRotation(
      { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
      true
    )

    // --- Walk + attack visuals ---
    walkPhase.current += delta * 6
    const bob = Math.abs(Math.sin(walkPhase.current)) * 0.08
    if (visualGroup.current) {
      visualGroup.current.position.y = atkState.current === 'idle' ? bob : 0
    }

    // Attack animation — both arms punch forward
    if (leftArm.current && rightArm.current && bodyTilt.current) {
      if (atkState.current === 'wind') {
        // Arms back + body lean back
        const p = atkT.current / ATTACK_WINDUP
        const amp = MathUtils.lerp(0, 0.9, p)
        leftArm.current.rotation.x = amp
        leftArm.current.rotation.z = 0.4
        rightArm.current.rotation.x = amp
        rightArm.current.rotation.z = -0.4
        bodyTilt.current.rotation.x = -amp * 0.3
      } else if (atkState.current === 'strike') {
        // Arms punch forward + body lunge
        const p = atkT.current / ATTACK_STRIKE
        const amp = MathUtils.lerp(0.9, -1.5, p)
        leftArm.current.rotation.x = amp
        leftArm.current.rotation.z = 0.4
        rightArm.current.rotation.x = amp
        rightArm.current.rotation.z = -0.4
        bodyTilt.current.rotation.x = MathUtils.lerp(-0.3, 0.4, p)
      } else if (atkState.current === 'recover') {
        const p = atkT.current / ATTACK_RECOVER
        const amp = MathUtils.lerp(-1.5, 0, p)
        leftArm.current.rotation.x = amp
        rightArm.current.rotation.x = amp
        bodyTilt.current.rotation.x = MathUtils.lerp(0.4, 0, p)
      } else {
        // Idle walk
        leftArm.current.rotation.x = 0
        leftArm.current.rotation.z = 0.4 + Math.sin(walkPhase.current) * 0.4
        rightArm.current.rotation.x = 0
        rightArm.current.rotation.z = -0.4 - Math.sin(walkPhase.current) * 0.4
        bodyTilt.current.rotation.x = 0
      }
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
        <group ref={bodyTilt}>
          {/* Body */}
          <mesh castShadow>
            <capsuleGeometry args={[0.38, 0.4, 8, 12]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Left arm — pivot at shoulder */}
          <group ref={leftArm} position={[0.42, 0.2, 0]}>
            <mesh position={[0, -0.2, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.28, 6, 10]} />
              <meshToonMaterial color={color} />
            </mesh>
          </group>
          <group ref={rightArm} position={[-0.42, 0.2, 0]}>
            <mesh position={[0, -0.2, 0]} castShadow>
              <capsuleGeometry args={[0.1, 0.28, 6, 10]} />
              <meshToonMaterial color={color} />
            </mesh>
          </group>
          {/* Head */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <sphereGeometry args={[0.42, 14, 14]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Goofy eyes */}
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
          {/* Angry mouth when attacking */}
          <mesh position={[0, 0.58, 0.4]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        </group>
      </group>
    </RigidBody>
  )
}
