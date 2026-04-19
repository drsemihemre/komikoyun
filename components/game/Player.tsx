'use client'

import { useEffect, useRef } from 'react'
import {
  RigidBody,
  CapsuleCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { MathUtils, Vector3, type Group } from 'three'
import { useGameStore, SAFE_ZONE, PLAYER_HP_MAX } from '@/lib/store'
import { getCreatures } from '@/lib/creatureRegistry'
import { registerPlayer, unregisterPlayer } from '@/lib/playerHandle'

const BASE_SPEED = 10
const JUMP = 13
const DEADZONE = 0.12
const INPUT_SMOOTH = 16
const ROT_SMOOTH = 10
const WALK_HZ = 7

// Ragdoll
const FALL_AIRTIME = 0.9
const FALL_VEL_Y = -18
const RAGDOLL_MIN_DURATION = 1.5
const RAGDOLL_SETTLE_TIME = 0.7

// Creature damage
const CREATURE_TOUCH_RANGE = 1.6 // * scale
const CREATURE_DAMAGE = 8
const CREATURE_DAMAGE_COOLDOWN = 1.2 // per creature

export default function Player() {
  const body = useRef<RapierRigidBody>(null)

  const visualRoot = useRef<Group>(null)
  const tiltGroup = useRef<Group>(null)
  const headPivot = useRef<Group>(null)
  const bodyPivot = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)

  const rawInput = useRef(new Vector3())
  const smoothInput = useRef(new Vector3())
  const camDesired = useRef(new Vector3())
  const camLookAt = useRef(new Vector3())
  const camCurrentLook = useRef(new Vector3(0, 1, 0))
  const targetYaw = useRef(0)
  const currentYaw = useRef(0)
  const currentTilt = useRef({ x: 0, z: 0 })
  const walkPhase = useRef(0)
  const airTime = useRef(0)
  const bodyBob = useRef(0)

  const isRagdoll = useRef(false)
  const ragdollStartT = useRef(0)
  const settleStartT = useRef(0)

  const attackProgress = useRef(-1)
  const lastAttackT = useRef(0)
  const wasAttackPressed = useRef(false)
  const wasCameraPressed = useRef(false)

  // Per-creature damage cooldowns
  const creatureHitCooldowns = useRef(new Map<string, number>())

  const [, getKeys] = useKeyboardControls()
  const scale = useGameStore((s) => s.scale)
  const cameraMode = useGameStore((s) => s.cameraMode)

  // Register player for global access (creatures, etc.)
  useEffect(() => {
    registerPlayer({
      getPos: () => {
        if (!body.current) return null
        const p = body.current.translation()
        return { x: p.x, y: p.y, z: p.z }
      },
    })
    return () => unregisterPlayer()
  }, [])

  useFrame((state, delta) => {
    if (!body.current) return

    const {
      mobileMove,
      mobileJump,
      mobileAttack,
      speedMult,
      playerHP,
      damagePlayer,
      setPlayerHP,
      toggleCamera,
    } = useGameStore.getState()
    const keys = getKeys()
    const now = state.clock.elapsedTime

    const pos = body.current.translation()
    const linvel = body.current.linvel()

    // Camera toggle (rising edge)
    const camPressed = !!keys.camera
    if (camPressed && !wasCameraPressed.current) toggleCamera()
    wasCameraPressed.current = camPressed

    // Grounded + airTime
    const grounded = Math.abs(linvel.y) < 0.5
    if (grounded) airTime.current = 0
    else airTime.current += delta

    // --- RAGDOLL TRIGGER ---
    if (
      !isRagdoll.current &&
      (airTime.current > FALL_AIRTIME || linvel.y < FALL_VEL_Y) &&
      pos.y > -25
    ) {
      enterRagdoll()
    }

    // Death → ragdoll + respawn
    if (playerHP <= 0 && !isRagdoll.current) {
      enterRagdoll()
      // Queue full respawn after duration
      setTimeout(() => {
        if (!body.current) return
        body.current.setTranslation(
          { x: 0, y: 3, z: 0 },
          true
        )
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        body.current.setEnabledRotations(false, false, false, true)
        isRagdoll.current = false
        settleStartT.current = 0
        setPlayerHP(PLAYER_HP_MAX)
      }, 2500)
    }

    function enterRagdoll() {
      if (!body.current) return
      isRagdoll.current = true
      ragdollStartT.current = now
      settleStartT.current = 0
      body.current.setEnabledRotations(true, true, true, true)
      const spin = 14 * scale
      body.current.applyTorqueImpulse(
        {
          x: (Math.random() - 0.5) * spin,
          y: (Math.random() - 0.5) * spin,
          z: (Math.random() - 0.5) * spin,
        },
        true
      )
    }

    // --- RAGDOLL RECOVERY ---
    if (isRagdoll.current) {
      const totalSpeed = Math.hypot(linvel.x, linvel.y, linvel.z)
      if (totalSpeed < 0.6 && grounded) {
        if (settleStartT.current === 0) settleStartT.current = now
        if (
          now - settleStartT.current > RAGDOLL_SETTLE_TIME &&
          now - ragdollStartT.current > RAGDOLL_MIN_DURATION &&
          playerHP > 0
        ) {
          isRagdoll.current = false
          settleStartT.current = 0
          body.current.setEnabledRotations(false, false, false, true)
          body.current.setRotation(
            {
              x: 0,
              y: Math.sin(currentYaw.current / 2),
              z: 0,
              w: Math.cos(currentYaw.current / 2),
            },
            true
          )
          body.current.setTranslation(
            { x: pos.x, y: pos.y + 0.4 * scale, z: pos.z },
            true
          )
        }
      } else {
        settleStartT.current = 0
      }
    }

    // --- INPUT (skipped during ragdoll) ---
    const raw = rawInput.current.set(0, 0, 0)
    if (!isRagdoll.current) {
      if (keys.forward) raw.z -= 1
      if (keys.backward) raw.z += 1
      if (keys.left) raw.x -= 1
      if (keys.right) raw.x += 1
      if (Math.abs(mobileMove.x) > DEADZONE) raw.x += mobileMove.x
      if (Math.abs(mobileMove.y) > DEADZONE) raw.z += mobileMove.y
      if (raw.lengthSq() > 1) raw.normalize()
    }

    smoothInput.current.lerp(raw, 1 - Math.exp(-INPUT_SMOOTH * delta))
    const si = smoothInput.current
    const moveMag = si.length()

    if (!isRagdoll.current) {
      const speed = BASE_SPEED * speedMult * Math.pow(scale, 0.45)
      body.current.setLinvel(
        { x: si.x * speed, y: linvel.y, z: si.z * speed },
        true
      )

      if ((keys.jump || mobileJump) && grounded) {
        const mass = body.current.mass()
        body.current.applyImpulse(
          { x: 0, y: JUMP * mass * Math.pow(scale, 0.55), z: 0 },
          true
        )
      }

      if (raw.lengthSq() > 0.01) {
        targetYaw.current = Math.atan2(raw.x, raw.z)
      }
      currentYaw.current = lerpAngle(
        currentYaw.current,
        targetYaw.current,
        1 - Math.exp(-ROT_SMOOTH * delta)
      )

      // ATTACK
      const attackHeld = keys.attack || mobileAttack
      const attackEdge = attackHeld && !wasAttackPressed.current
      wasAttackPressed.current = attackHeld

      if (attackEdge && now - lastAttackT.current > 0.35) {
        const dxS = pos.x - SAFE_ZONE.center[0]
        const dzS = pos.z - SAFE_ZONE.center[2]
        const inSafe = Math.hypot(dxS, dzS) < SAFE_ZONE.radius
        if (!inSafe) {
          lastAttackT.current = now
          attackProgress.current = 0

          const fwdX = Math.sin(currentYaw.current)
          const fwdZ = Math.cos(currentYaw.current)
          const hitRange = 3.5 * scale
          const hitForce = 22 * scale

          let hits = 0
          for (const c of getCreatures()) {
            const cp = c.getPos()
            if (!cp) continue
            const dx = cp.x - pos.x
            const dz = cp.z - pos.z
            const dist = Math.hypot(dx, dz)
            if (dist > hitRange || dist < 0.1) continue
            const nx = dx / dist
            const nz = dz / dist
            const dot = nx * fwdX + nz * fwdZ
            if (dot < 0.35) continue
            c.takeHit([nx * hitForce, 9 * scale, nz * hitForce])
            hits++
          }
          if (hits > 0) useGameStore.getState().incrementHitCount()
        }
      }

      // CREATURE PROXIMITY DAMAGE
      const dxS = pos.x - SAFE_ZONE.center[0]
      const dzS = pos.z - SAFE_ZONE.center[2]
      const inSafe = Math.hypot(dxS, dzS) < SAFE_ZONE.radius
      if (!inSafe) {
        const range = CREATURE_TOUCH_RANGE * scale
        for (const c of getCreatures()) {
          const cp = c.getPos()
          if (!cp) continue
          const dx = cp.x - pos.x
          const dz = cp.z - pos.z
          const dist = Math.hypot(dx, dz)
          if (dist > range) continue
          const last = creatureHitCooldowns.current.get(c.id) ?? -10
          if (now - last < CREATURE_DAMAGE_COOLDOWN) continue
          creatureHitCooldowns.current.set(c.id, now)
          damagePlayer(CREATURE_DAMAGE)
          // Small knockback
          const nx = -dx / Math.max(dist, 0.01)
          const nz = -dz / Math.max(dist, 0.01)
          const k = 6 * scale
          body.current.applyImpulse(
            { x: nx * k, y: 4 * scale, z: nz * k },
            true
          )
        }
      }
    }

    // Attack animation tick
    if (attackProgress.current >= 0) {
      attackProgress.current += delta / 0.28
      if (attackProgress.current >= 1) attackProgress.current = -1
    }

    // --- CAMERA ---
    const headHeight = 0.85 * scale
    if (cameraMode === 'first') {
      // FPV — inside head, looking forward
      const forwardX = Math.sin(currentYaw.current)
      const forwardZ = Math.cos(currentYaw.current)
      // Camera slightly forward from eye center so we don't see inside our own head
      const camPos = camDesired.current.set(
        pos.x + forwardX * 0.15 * scale,
        pos.y + headHeight,
        pos.z + forwardZ * 0.15 * scale
      )
      state.camera.position.lerp(camPos, 1 - Math.exp(-20 * delta))
      camLookAt.current.set(
        pos.x + forwardX * 5,
        pos.y + headHeight,
        pos.z + forwardZ * 5
      )
      state.camera.lookAt(camLookAt.current)
    } else {
      // Third person
      const camHeight = 6 + scale * 1.2
      const camBack = 12 + scale * 1.8
      camDesired.current.set(pos.x, pos.y + camHeight, pos.z + camBack)
      state.camera.position.lerp(camDesired.current, 1 - Math.exp(-6 * delta))
      camLookAt.current.set(pos.x, pos.y + 1.2 * scale, pos.z)
      camCurrentLook.current.lerp(camLookAt.current, 1 - Math.exp(-10 * delta))
      state.camera.lookAt(camCurrentLook.current)
    }

    // --- VISUALS ---
    if (visualRoot.current) {
      if (isRagdoll.current) {
        visualRoot.current.rotation.set(0, 0, 0)
      } else {
        visualRoot.current.rotation.y = currentYaw.current
      }
      visualRoot.current.scale.setScalar(scale)
      // FPV: hide character (we're inside the head)
      visualRoot.current.visible = cameraMode !== 'first' || isRagdoll.current
    }

    const air = Math.min(1, airTime.current * 2)

    if (!isRagdoll.current) {
      const targetTiltX = -moveMag * 0.18
      currentTilt.current.x = MathUtils.damp(
        currentTilt.current.x,
        targetTiltX,
        8,
        delta
      )
    }
    if (tiltGroup.current) {
      tiltGroup.current.rotation.x = MathUtils.lerp(
        currentTilt.current.x,
        -airTime.current * 1.2,
        air * 0.4
      )
      tiltGroup.current.rotation.z = currentTilt.current.z
      tiltGroup.current.position.y = isRagdoll.current ? 0 : bodyBob.current
    }

    walkPhase.current += delta * WALK_HZ * moveMag
    const walkAmp = moveMag * 0.85
    const swing = Math.sin(walkPhase.current) * walkAmp
    bodyBob.current = Math.abs(Math.sin(walkPhase.current)) * 0.06 * moveMag

    if (headPivot.current) {
      headPivot.current.rotation.x = isRagdoll.current
        ? Math.sin(now * 7) * 0.3
        : -bodyBob.current * 2 + air * 0.3
      headPivot.current.rotation.z = isRagdoll.current
        ? Math.cos(now * 5) * 0.3
        : Math.sin(walkPhase.current * 0.5) * 0.06 * moveMag
    }

    if (bodyPivot.current) {
      bodyPivot.current.rotation.y = Math.sin(walkPhase.current) * 0.12 * moveMag
    }

    if (leftLeg.current && rightLeg.current) {
      if (isRagdoll.current) {
        leftLeg.current.rotation.x = Math.sin(now * 9) * 1.2
        leftLeg.current.rotation.z = Math.cos(now * 7) * 0.5
        rightLeg.current.rotation.x = Math.cos(now * 8) * 1.2
        rightLeg.current.rotation.z = Math.sin(now * 6) * 0.5
      } else if (air > 0.3) {
        leftLeg.current.rotation.x = MathUtils.lerp(
          leftLeg.current.rotation.x,
          -0.8 + air * 0.4,
          0.2
        )
        rightLeg.current.rotation.x = MathUtils.lerp(
          rightLeg.current.rotation.x,
          -0.8 - air * 0.3,
          0.2
        )
      } else {
        leftLeg.current.rotation.x = swing
        leftLeg.current.rotation.z = 0
        rightLeg.current.rotation.x = -swing
        rightLeg.current.rotation.z = 0
      }
    }

    if (leftArm.current && rightArm.current) {
      if (isRagdoll.current) {
        leftArm.current.rotation.x = Math.cos(now * 8 + 1) * 1.3
        leftArm.current.rotation.z = 1.2 + Math.sin(now * 6) * 0.6
        rightArm.current.rotation.x = Math.sin(now * 9) * 1.3
        rightArm.current.rotation.z = -1.2 - Math.cos(now * 7) * 0.6
      } else if (attackProgress.current >= 0) {
        const p = attackProgress.current
        const swingAmp = p < 0.5 ? p * 2 : 2 - p * 2
        rightArm.current.rotation.x = -swingAmp * 2.4
        rightArm.current.rotation.z = -0.3 + swingAmp * 1.1
        leftArm.current.rotation.x = -swing * 0.9
        leftArm.current.rotation.z = 0.3
      } else if (air > 0.3) {
        leftArm.current.rotation.z = MathUtils.lerp(
          leftArm.current.rotation.z,
          1.4 + Math.sin(airTime.current * 8) * 0.3,
          0.15
        )
        rightArm.current.rotation.z = MathUtils.lerp(
          rightArm.current.rotation.z,
          -1.4 - Math.sin(airTime.current * 7) * 0.3,
          0.15
        )
        leftArm.current.rotation.x = Math.sin(airTime.current * 6) * 0.4
        rightArm.current.rotation.x = Math.cos(airTime.current * 5) * 0.4
      } else {
        leftArm.current.rotation.x = -swing * 0.9
        rightArm.current.rotation.x = swing * 0.9
        leftArm.current.rotation.z = MathUtils.lerp(
          leftArm.current.rotation.z,
          0.3,
          0.2
        )
        rightArm.current.rotation.z = MathUtils.lerp(
          rightArm.current.rotation.z,
          -0.3,
          0.2
        )
      }
    }

    // Fail-safe respawn if fell off world
    if (pos.y < -45) {
      body.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      body.current.setEnabledRotations(false, false, false, true)
      isRagdoll.current = false
      settleStartT.current = 0
      smoothInput.current.set(0, 0, 0)
      if (useGameStore.getState().playerHP <= 0) {
        useGameStore.getState().setPlayerHP(PLAYER_HP_MAX)
      }
    }
  })

  const colliderHalfH = 0.5 * scale
  const colliderRadius = 0.55 * scale

  return (
    <RigidBody
      ref={body}
      position={[0, 3, 0]}
      colliders={false}
      enabledRotations={[false, false, false]}
      mass={1.4 * scale * scale}
      linearDamping={0.3}
      angularDamping={1.5}
      friction={1.2}
    >
      <CapsuleCollider args={[colliderHalfH, colliderRadius]} friction={1.2} />
      <group ref={visualRoot}>
        <group ref={tiltGroup}>
          <group ref={bodyPivot}>
            <mesh position={[0, -0.1, 0]} castShadow>
              <capsuleGeometry args={[0.45, 0.5, 6, 12]} />
              <meshToonMaterial color="#ef476f" />
            </mesh>
          </group>
          <group ref={headPivot} position={[0, 0.65, 0]}>
            <mesh position={[0, 0.15, 0]} castShadow>
              <sphereGeometry args={[0.7, 18, 18]} />
              <meshToonMaterial color="#ffd89c" />
            </mesh>
            <mesh position={[0.25, 0.25, 0.58]}>
              <sphereGeometry args={[0.12, 10, 10]} />
              <meshBasicMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[-0.25, 0.25, 0.58]}>
              <sphereGeometry args={[0.12, 10, 10]} />
              <meshBasicMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0.28, 0.3, 0.66]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.22, 0.3, 0.66]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[0, -0.05, 0.62]} rotation={[0.2, 0, 0]}>
              <torusGeometry args={[0.22, 0.05, 6, 14, Math.PI]} />
              <meshBasicMaterial color="#b23a48" />
            </mesh>
          </group>
          <group ref={leftArm} position={[0.55, 0.25, 0]}>
            <mesh position={[0, -0.25, 0]} rotation={[0, 0, 0.3]} castShadow>
              <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
              <meshToonMaterial color="#ef476f" />
            </mesh>
          </group>
          <group ref={rightArm} position={[-0.55, 0.25, 0]}>
            <mesh position={[0, -0.25, 0]} rotation={[0, 0, -0.3]} castShadow>
              <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
              <meshToonMaterial color="#ef476f" />
            </mesh>
          </group>
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
        </group>
      </group>
    </RigidBody>
  )
}

function lerpAngle(a: number, b: number, t: number) {
  const diff = MathUtils.euclideanModulo(b - a + Math.PI, Math.PI * 2) - Math.PI
  return a + diff * t
}
