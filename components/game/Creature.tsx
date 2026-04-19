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
import { useGameStore, MAP_HALF } from '@/lib/store'
import { playKo } from '@/lib/sounds'
import { getGameHour } from './DayNightCycle'

export type CreatureShape = 'round' | 'horned' | 'jumper' | 'tank'

export type CreatureVariant = {
  shape: CreatureShape
  color: string
  accentColor?: string
  hp: number
  speed: number
  size: number
}

type Props = {
  id: string
  spawn: [number, number, number]
  arenaCenter: [number, number, number]
  arenaRadius: number
  variant: CreatureVariant
  nocturnal?: boolean // true: sadece gece aktif
}

const ATTACK_RANGE_BASE = 1.6
const ATTACK_WINDUP = 0.25
const ATTACK_STRIKE = 0.18
const ATTACK_RECOVER = 0.45
const ATTACK_DAMAGE = 7
const ATTACK_COOLDOWN = 1.6
const SIGHT_RANGE = 9

type AtkState = 'idle' | 'wind' | 'strike' | 'recover'
type SpecialState = 'none' | 'melting' | 'balloon' | 'sucking'

export default function Creature({
  id,
  spawn,
  arenaCenter,
  arenaRadius,
  variant,
  nocturnal = false,
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

  // Özel durumlar (silah etkileri)
  const specialState = useRef<SpecialState>('none')
  const specialStartT = useRef(0)
  const specialData = useRef<{ px: number; pz: number } | null>(null)

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
        isRagdoll.current = true
        ragdollStartT.current = performance.now() / 1000
        atkState.current = 'idle'
        body.current.setEnabledRotations(true, true, true, true)
        const forceMult = willKo ? 1 : 0.4
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
      melt: () => {
        if (!body.current) return
        specialState.current = 'melting'
        specialStartT.current = performance.now() / 1000
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        useGameStore.getState().incrementHitCount()
        // visualGroup scale animates down in useFrame
      },
      teleportAway: () => {
        if (!body.current) return
        // Random location in map
        const x = (Math.random() - 0.5) * (MAP_HALF - 20) * 2
        const z = (Math.random() - 0.5) * (MAP_HALF - 20) * 2
        body.current.setTranslation({ x, y: 4, z }, true)
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        useGameStore.getState().incrementHitCount()
      },
      suckAndLaunch: (playerX, playerZ) => {
        if (!body.current) return
        specialState.current = 'sucking'
        specialStartT.current = performance.now() / 1000
        specialData.current = { px: playerX, pz: playerZ }
        useGameStore.getState().incrementHitCount()
      },
      balloonify: () => {
        if (!body.current) return
        specialState.current = 'balloon'
        specialStartT.current = performance.now() / 1000
        body.current.setEnabledRotations(true, true, true, true)
        // Gradual upward lift handled in useFrame
        useGameStore.getState().incrementHitCount()
      },
    }
    registerCreature(handle)
    return () => unregisterCreature(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useFrame((state, delta) => {
    if (!body.current) return
    const now = state.clock.elapsedTime

    // Day/night kontrolü
    const hour = getGameHour()
    const isNight = hour < 7 || hour > 18
    const canLeaveArena = isNight // gece arenadan çıkabilirler

    // Nocturnal davranış: gündüz gizle + pause
    if (nocturnal) {
      if (!isNight) {
        if (visualGroup.current) visualGroup.current.visible = false
        const pos = body.current.translation()
        if (pos.y > -30) {
          body.current.setTranslation({ x: pos.x, y: -60, z: pos.z }, true)
          body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        }
        return
      } else {
        if (visualGroup.current) visualGroup.current.visible = true
        const pos = body.current.translation()
        if (pos.y < -20) {
          // Just came from the depths → spawn in arena
          const ang = Math.random() * Math.PI * 2
          const r = Math.random() * (arenaRadius - 2)
          body.current.setTranslation(
            {
              x: arenaCenter[0] + Math.cos(ang) * r,
              y: 2,
              z: arenaCenter[2] + Math.sin(ang) * r,
            },
            true
          )
          body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
          hp.current = variant.hp
        }
      }
    }

    // --- Special state animations ---
    if (specialState.current === 'melting') {
      const elapsed = performance.now() / 1000 - specialStartT.current
      const shrink = 1 - Math.min(1, elapsed / 1.2)
      if (visualGroup.current) {
        visualGroup.current.scale.setScalar(shrink * size)
      }
      if (elapsed > 1.3) {
        // Respawn at spawn
        body.current.setTranslation(
          { x: spawn[0], y: spawn[1], z: spawn[2] },
          true
        )
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        if (visualGroup.current) visualGroup.current.scale.setScalar(size)
        specialState.current = 'none'
        hp.current = variant.hp
      }
      return
    }

    if (specialState.current === 'balloon') {
      const elapsed = performance.now() / 1000 - specialStartT.current
      // Float up with gentle rotation
      const lift = Math.min(1, elapsed / 0.5) * 8 - elapsed * 2
      const linvel = body.current.linvel()
      body.current.setLinvel(
        {
          x: Math.sin(now * 2) * 2,
          y: Math.max(linvel.y + 0.3, lift),
          z: Math.cos(now * 1.5) * 2,
        },
        true
      )
      body.current.applyTorqueImpulse(
        { x: 0, y: 0.3, z: 0 },
        true
      )
      // Visual: stretch vertically
      if (visualGroup.current) {
        const puff = 1 + Math.min(0.8, elapsed * 0.3)
        visualGroup.current.scale.set(size * puff, size * (1 + elapsed * 0.4), size * puff)
      }
      if (elapsed > 3.5) {
        // Pop — respawn
        body.current.setTranslation(
          { x: spawn[0], y: spawn[1], z: spawn[2] },
          true
        )
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        body.current.setEnabledRotations(false, true, false, true)
        if (visualGroup.current) visualGroup.current.scale.setScalar(size)
        specialState.current = 'none'
        hp.current = variant.hp
        playKo()
      }
      return
    }

    if (specialState.current === 'sucking') {
      const elapsed = performance.now() / 1000 - specialStartT.current
      const target = specialData.current!
      const pos = body.current.translation()
      if (elapsed < 0.6) {
        // Suck toward player (accelerate inward)
        const dx = target.px - pos.x
        const dz = target.pz - pos.z
        const dist = Math.hypot(dx, dz)
        const pull = 14
        const nx = dx / Math.max(dist, 0.1)
        const nz = dz / Math.max(dist, 0.1)
        body.current.setLinvel(
          {
            x: nx * pull,
            y: 1.5,
            z: nz * pull,
          },
          true
        )
      } else if (elapsed < 0.75) {
        // Brief pause at player
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      } else if (elapsed < 0.85) {
        // Launch in random direction
        const ang = Math.random() * Math.PI * 2
        body.current.applyImpulse(
          {
            x: Math.cos(ang) * 18,
            y: 14,
            z: Math.sin(ang) * 18,
          },
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
        body.current.setEnabledRotations(true, true, true, true)
      } else if (elapsed > 2.5) {
        // Recover
        body.current.setEnabledRotations(false, true, false, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        specialState.current = 'none'
      }
      return
    }

    // --- Ragdoll recovery ---
    if (isRagdoll.current) {
      const linvel = body.current.linvel()
      const sp = Math.hypot(linvel.x, linvel.y, linvel.z)
      const recoverTime = hp.current <= 0 ? 4 : 1.8
      if (sp < 0.8 && now - ragdollStartT.current > recoverTime) {
        const pos = body.current.translation()
        const dc = Math.hypot(
          pos.x - arenaCenter[0],
          pos.z - arenaCenter[2]
        )
        // Arena dışına savruldu veya KO → arenanın ortasına respawn
        if (hp.current <= 0 || dc > arenaRadius) {
          hp.current = variant.hp
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

    // Gündüz: çok uzaklaştılarsa arenaya geri ışınla
    if (!canLeaveArena) {
      const ax = pos.x - arenaCenter[0]
      const az = pos.z - arenaCenter[2]
      const dc = Math.hypot(ax, az)
      if (dc > arenaRadius + 6) {
        const ang = Math.random() * Math.PI * 2
        const r = Math.random() * (arenaRadius - 3)
        body.current.setTranslation(
          {
            x: arenaCenter[0] + Math.cos(ang) * r,
            y: 2,
            z: arenaCenter[2] + Math.sin(ang) * r,
          },
          true
        )
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        return
      }
    }

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
      // Gündüz arena sınırına zorla, gece serbest roam
      if (!canLeaveArena && dc > arenaRadius - 1.5) {
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

    walkPhase.current += delta * 6
    const bob = Math.abs(Math.sin(walkPhase.current)) * 0.08
    if (visualGroup.current && specialState.current === 'none') {
      visualGroup.current.position.y = atkState.current === 'idle' ? bob : 0
      visualGroup.current.scale.setScalar(size)
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
      <mesh castShadow>
        <capsuleGeometry args={[bodyRadius, bodyHeight, 8, 12]} />
        <meshToonMaterial color={color} />
      </mesh>

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

      <mesh
        position={[0, shape === 'tank' ? 0.75 : shape === 'jumper' ? 0.5 : 0.7, 0]}
        castShadow
      >
        <sphereGeometry
          args={[shape === 'tank' ? 0.55 : 0.42, 14, 14]}
        />
        <meshToonMaterial color={color} />
      </mesh>

      {/* Yüz — tank için daha dışarı (büyük kafaya uygun) */}
      {(() => {
        const faceOut = shape === 'tank' ? 0.5 : 0.32
        const eyeY = shape === 'tank' ? 0.88 : 0.82
        const eyeSpread = shape === 'tank' ? 0.22 : 0.16
        const pupilOut = shape === 'tank' ? 0.62 : 0.42
        const mouthY = shape === 'tank' ? 0.6 : 0.58
        const mouthOut = shape === 'tank' ? 0.55 : 0.4
        return (
          <>
            <mesh position={[eyeSpread, eyeY, faceOut]}>
              <sphereGeometry
                args={[shape === 'tank' ? 0.18 : 0.14, 12, 12]}
              />
              <meshBasicMaterial color="white" />
            </mesh>
            <mesh position={[-eyeSpread, eyeY, faceOut]}>
              <sphereGeometry
                args={[shape === 'tank' ? 0.18 : 0.14, 12, 12]}
              />
              <meshBasicMaterial color="white" />
            </mesh>
            <mesh position={[eyeSpread + 0.02, eyeY + 0.02, pupilOut]}>
              <sphereGeometry args={[0.09, 10, 10]} />
              <meshBasicMaterial color="black" />
            </mesh>
            <mesh position={[-eyeSpread + 0.02, eyeY - 0.02, pupilOut]}>
              <sphereGeometry args={[0.09, 10, 10]} />
              <meshBasicMaterial color="black" />
            </mesh>
            <mesh position={[0, mouthY, mouthOut]}>
              <sphereGeometry
                args={[shape === 'tank' ? 0.13 : 0.08, 8, 8]}
              />
              <meshBasicMaterial color="#1a1a1a" />
            </mesh>
          </>
        )
      })()}

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
          <mesh position={[0, 0.3, -0.3]} rotation={[0.3, 0, 0]} castShadow>
            <coneGeometry args={[0.1, 0.3, 6]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
        </>
      )}

      {shape === 'jumper' && (
        <>
          <mesh position={[0.15, -0.35, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.15, 10]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          <mesh position={[-0.15, -0.35, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 0.15, 10]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
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
          <mesh position={[0.5, 0.3, 0]} castShadow>
            <boxGeometry args={[0.25, 0.15, 0.4]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          <mesh position={[-0.5, 0.3, 0]} castShadow>
            <boxGeometry args={[0.25, 0.15, 0.4]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
          <mesh position={[0, -0.05, 0]} castShadow>
            <torusGeometry args={[0.5, 0.06, 6, 16]} />
            <meshToonMaterial color={accentColor} />
          </mesh>
        </>
      )}
    </group>
  )
}
