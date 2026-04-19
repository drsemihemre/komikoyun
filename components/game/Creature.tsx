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
import { useGameStore } from '@/lib/store'
import { playKo } from '@/lib/sounds'

export type CreatureShape = 'round' | 'horned' | 'jumper' | 'tank'

export type CreatureVariant = {
  shape: CreatureShape
  color: string
  accentColor?: string
  hp: number
  speed: number
  size: number // 0.8 - 1.6
}

type Props = {
  id: string
  spawn: [number, number, number]
  arenaCenter: [number, number, number]
  arenaRadius: number
  variant: CreatureVariant
}

const ATTACK_RANGE_BASE = 1.6
const ATTACK_WINDUP = 0.25
const ATTACK_STRIKE = 0.18
const ATTACK_RECOVER = 0.45
const ATTACK_DAMAGE = 7
const ATTACK_COOLDOWN = 1.6
const SIGHT_RANGE = 9

type AtkState = 'idle' | 'wind' | 'strike' | 'recover'

export default function Creature({
  id,
  spawn,
  arenaCenter,
  arenaRadius,
  variant,
}: Props) {
  const body = useRef<RapierRigidBody>(null)
  const visualGroup = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const bodyTilt = useRef<Group>(null)

  const targetDir = useRef(new Vector3(1, 0, 0))
  const changeDirAt = useRef(0)
  const nextJumpAt = useRef(2 + Math.random() * 3)
  const isRagdoll = useRef(false)
  const ragdollStartT = useRef(0)
  const hp = useRef(variant.hp)
  const walkPhase = useRef(Math.random() * Math.PI * 2)

  const atkState = useRef<AtkState>('idle')
  const atkT = useRef(0)
  const lastAtkEndT = useRef(-10)
  const hitAppliedThisAtk = useRef(false)

  const { size, color, speed } = variant
  const attackRange = ATTACK_RANGE_BASE * size

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
        hp.current -= 1
        const willKo = hp.current <= 0
        // Always brief ragdoll from hit
        isRagdoll.current = true
        ragdollStartT.current = performance.now() / 1000
        atkState.current = 'idle'
        body.current.setEnabledRotations(true, true, true, true)
        const forceMult = willKo ? 1 : 0.4 // lighter knock on non-KO
        body.current.applyImpulse(
          {
            x: force[0] * forceMult,
            y: force[1] * forceMult,
            z: force[2] * forceMult,
          },
          true
        )
        body.current.applyTorqueImpulse(
          {
            x: (Math.random() - 0.5) * (willKo ? 6 : 2),
            y: (Math.random() - 0.5) * (willKo ? 6 : 2),
            z: (Math.random() - 0.5) * (willKo ? 6 : 2),
          },
          true
        )
        if (willKo) {
          useGameStore.getState().addKo()
          playKo()
        }
      },
    }
    registerCreature(handle)
    return () => unregisterCreature(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useFrame((state, delta) => {
    if (!body.current) return
    const now = state.clock.elapsedTime

    // Ragdoll recovery
    if (isRagdoll.current) {
      const linvel = body.current.linvel()
      const sp = Math.hypot(linvel.x, linvel.y, linvel.z)
      const recoverTime = hp.current <= 0 ? 4 : 1.8
      if (sp < 0.8 && now - ragdollStartT.current > recoverTime) {
        // KO'd creatures respawn with full HP
        if (hp.current <= 0) {
          hp.current = variant.hp
          // Respawn at random location within arena
          const ang = Math.random() * Math.PI * 2
          const r = Math.random() * (arenaRadius - 3)
          body.current.setTranslation(
            {
              x: arenaCenter[0] + Math.cos(ang) * r,
              y: 1.5,
              z: arenaCenter[2] + Math.sin(ang) * r,
            },
            true
          )
        }
        isRagdoll.current = false
        body.current.setEnabledRotations(false, true, false, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        changeDirAt.current = now + 0.4
      }
    }

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

    let dx = 0,
      dz = 0,
      distToPlayer = Infinity
    if (playerPos && !playerDown) {
      dx = playerPos.x - pos.x
      dz = playerPos.z - pos.z
      distToPlayer = Math.hypot(dx, dz)
    }

    // Jumper random jumps
    if (variant.shape === 'jumper' && now > nextJumpAt.current) {
      const linvel = body.current.linvel()
      if (Math.abs(linvel.y) < 0.5) {
        body.current.applyImpulse(
          { x: 0, y: 5 * size * variant.hp, z: 0 },
          true
        )
        nextJumpAt.current = now + 2 + Math.random() * 3
      }
    }

    // Attack state machine
    const canStartAttack =
      atkState.current === 'idle' &&
      distToPlayer < attackRange &&
      now - lastAtkEndT.current > ATTACK_COOLDOWN &&
      !playerDown
    if (canStartAttack) {
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
        if (
          !hitAppliedThisAtk.current &&
          atkT.current > ATTACK_STRIKE * 0.4 &&
          player &&
          playerPos &&
          !playerDown &&
          distToPlayer < attackRange + 0.4
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
      } else if (
        atkState.current === 'recover' &&
        atkT.current >= ATTACK_RECOVER
      ) {
        atkState.current = 'idle'
        atkT.current = 0
        lastAtkEndT.current = now
      }
    }

    // Movement
    const shouldChase =
      !playerDown && distToPlayer < SIGHT_RANGE && atkState.current === 'idle'

    if (shouldChase && distToPlayer > attackRange * 0.8) {
      const len = Math.max(distToPlayer, 0.01)
      targetDir.current.set(dx / len, 0, dz / len)
      changeDirAt.current = now + 0.3
    } else if (now > changeDirAt.current) {
      const ang = Math.random() * Math.PI * 2
      targetDir.current.set(Math.cos(ang), 0, Math.sin(ang))
      changeDirAt.current = now + 1.5 + Math.random() * 2
    }

    if (!shouldChase) {
      const ax = pos.x - arenaCenter[0]
      const az = pos.z - arenaCenter[2]
      const dc = Math.hypot(ax, az)
      if (dc > arenaRadius - 1.5) {
        targetDir.current.set(-ax, 0, -az).normalize()
        changeDirAt.current = now + 2
      }
    }

    const speedMult =
      atkState.current === 'strike'
        ? 0.2
        : atkState.current === 'wind'
          ? 0.4
          : atkState.current === 'recover'
            ? 0.3
            : shouldChase
              ? 1.4
              : 1
    const linvel = body.current.linvel()
    const vSpeed = speed * speedMult
    body.current.setLinvel(
      {
        x: targetDir.current.x * vSpeed,
        y: linvel.y,
        z: targetDir.current.z * vSpeed,
      },
      true
    )

    let faceDir = targetDir.current
    if (atkState.current !== 'idle' && playerPos) {
      const len = Math.max(distToPlayer, 0.01)
      faceDir = new Vector3(dx / len, 0, dz / len)
    }
    const yaw = Math.atan2(faceDir.x, faceDir.z)
    body.current.setRotation(
      { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
      true
    )

    // Visuals
    walkPhase.current += delta * 6
    const bob = Math.abs(Math.sin(walkPhase.current)) * 0.08
    if (visualGroup.current) {
      visualGroup.current.position.y = atkState.current === 'idle' ? bob : 0
    }

    if (leftArm.current && rightArm.current && bodyTilt.current) {
      if (atkState.current === 'wind') {
        const p = atkT.current / ATTACK_WINDUP
        const amp = MathUtils.lerp(0, 0.9, p)
        leftArm.current.rotation.x = amp
        leftArm.current.rotation.z = 0.4
        rightArm.current.rotation.x = amp
        rightArm.current.rotation.z = -0.4
        bodyTilt.current.rotation.x = -amp * 0.3
      } else if (atkState.current === 'strike') {
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
        leftArm.current.rotation.x = 0
        leftArm.current.rotation.z = 0.4 + Math.sin(walkPhase.current) * 0.4
        rightArm.current.rotation.x = 0
        rightArm.current.rotation.z =
          -0.4 - Math.sin(walkPhase.current) * 0.4
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
      mass={0.8 * size * size}
      linearDamping={0.6}
      angularDamping={0.8}
      friction={0.7}
    >
      <CapsuleCollider args={[0.3 * size, 0.38 * size]} />
      <group ref={visualGroup} scale={size}>
        <CreatureMesh variant={variant} bodyTilt={bodyTilt} leftArm={leftArm} rightArm={rightArm} />
      </group>
    </RigidBody>
  )
}

function CreatureMesh({
  variant,
  bodyTilt,
  leftArm,
  rightArm,
}: {
  variant: CreatureVariant
  bodyTilt: React.RefObject<Group | null>
  leftArm: React.RefObject<Group | null>
  rightArm: React.RefObject<Group | null>
}) {
  const { shape, color, accentColor = '#1a1a1a' } = variant

  const bodyHeight = shape === 'tank' ? 0.5 : shape === 'jumper' ? 0.3 : 0.4
  const bodyRadius =
    shape === 'tank' ? 0.5 : shape === 'jumper' ? 0.3 : 0.38

  return (
    <group ref={bodyTilt}>
      {/* Body */}
      <mesh castShadow>
        <capsuleGeometry args={[bodyRadius, bodyHeight, 8, 12]} />
        <meshToonMaterial color={color} />
      </mesh>

      {/* Arms — pivot at shoulder */}
      <group ref={leftArm} position={[bodyRadius + 0.08, 0.2, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry
            args={[shape === 'tank' ? 0.14 : 0.1, 0.28, 6, 10]}
          />
          <meshToonMaterial color={color} />
        </mesh>
      </group>
      <group ref={rightArm} position={[-(bodyRadius + 0.08), 0.2, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry
            args={[shape === 'tank' ? 0.14 : 0.1, 0.28, 6, 10]}
          />
          <meshToonMaterial color={color} />
        </mesh>
      </group>

      {/* Head */}
      <mesh
        position={[0, shape === 'tank' ? 0.75 : shape === 'jumper' ? 0.5 : 0.7, 0]}
        castShadow
      >
        <sphereGeometry
          args={[shape === 'tank' ? 0.55 : 0.42, 14, 14]}
        />
        <meshToonMaterial color={color} />
      </mesh>

      {/* Goofy eyes */}
      <mesh position={[0.16, shape === 'tank' ? 0.85 : 0.82, 0.32]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[-0.16, shape === 'tank' ? 0.85 : 0.82, 0.32]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh position={[0.18, shape === 'tank' ? 0.87 : 0.84, 0.42]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="black" />
      </mesh>
      <mesh position={[-0.14, shape === 'tank' ? 0.83 : 0.8, 0.42]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="black" />
      </mesh>

      {/* Mouth */}
      <mesh position={[0, shape === 'tank' ? 0.6 : 0.58, 0.4]}>
        <sphereGeometry args={[shape === 'tank' ? 0.11 : 0.08, 8, 8]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* Shape-specific decorations */}
      {shape === 'horned' && (
        <>
          <mesh
            position={[0.2, 1.15, -0.1]}
            rotation={[0.2, 0, 0.3]}
            castShadow
          >
            <coneGeometry args={[0.12, 0.45, 8]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          <mesh
            position={[-0.2, 1.15, -0.1]}
            rotation={[0.2, 0, -0.3]}
            castShadow
          >
            <coneGeometry args={[0.12, 0.45, 8]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          {/* Spikes on back */}
          <mesh position={[0, 0.3, -0.3]} rotation={[0.3, 0, 0]} castShadow>
            <coneGeometry args={[0.1, 0.3, 6]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
        </>
      )}

      {shape === 'jumper' && (
        <>
          {/* Springy feet */}
          <mesh position={[0.15, -0.35, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.15, 10]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          <mesh position={[-0.15, -0.35, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.15, 10]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          {/* Antenna */}
          <mesh position={[0, 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.25, 6]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
        </>
      )}

      {shape === 'tank' && (
        <>
          {/* Shoulder pads */}
          <mesh position={[0.5, 0.3, 0]} castShadow>
            <boxGeometry args={[0.25, 0.15, 0.4]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          <mesh position={[-0.5, 0.3, 0]} castShadow>
            <boxGeometry args={[0.25, 0.15, 0.4]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          {/* Belt */}
          <mesh position={[0, -0.05, 0]} castShadow>
            <torusGeometry args={[0.5, 0.06, 6, 16]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
        </>
      )}
    </group>
  )
}
