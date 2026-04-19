'use client'

import { useRef } from 'react'
import {
  RigidBody,
  CapsuleCollider,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { MathUtils, Vector3, type Group } from 'three'
import { useGameStore } from '@/lib/store'

const BASE_SPEED = 10
const JUMP = 13
const DEADZONE = 0.12
const INPUT_SMOOTH = 16
const ROT_SMOOTH = 10
const WALK_HZ = 7 // adım frekansı

export default function Player() {
  const body = useRef<RapierRigidBody>(null)

  // Visual refs
  const visualRoot = useRef<Group>(null)
  const tiltGroup = useRef<Group>(null)
  const headPivot = useRef<Group>(null)
  const bodyPivot = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)

  // Frame-local state
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
  const groundedTime = useRef(0)
  const bodyBob = useRef(0)
  const [, getKeys] = useKeyboardControls()

  const scale = useGameStore((s) => s.scale)

  useFrame((state, delta) => {
    if (!body.current) return

    const { mobileMove, mobileJump, speedMult } = useGameStore.getState()
    const keys = getKeys()

    // Raw input
    const raw = rawInput.current.set(0, 0, 0)
    if (keys.forward) raw.z -= 1
    if (keys.backward) raw.z += 1
    if (keys.left) raw.x -= 1
    if (keys.right) raw.x += 1
    if (Math.abs(mobileMove.x) > DEADZONE) raw.x += mobileMove.x
    if (Math.abs(mobileMove.y) > DEADZONE) raw.z += mobileMove.y
    if (raw.lengthSq() > 1) raw.normalize()

    // Smooth input
    smoothInput.current.lerp(raw, 1 - Math.exp(-INPUT_SMOOTH * delta))
    const si = smoothInput.current
    const moveMag = si.length()

    // Apply velocity — big characters step proportionally further
    const speed = BASE_SPEED * speedMult * Math.pow(scale, 0.45)
    const linvel = body.current.linvel()
    body.current.setLinvel(
      { x: si.x * speed, y: linvel.y, z: si.z * speed },
      true
    )

    // Grounded detection (velocity-based)
    const grounded = Math.abs(linvel.y) < 0.5
    if (grounded) {
      airTime.current = 0
      groundedTime.current += delta
    } else {
      airTime.current += delta
      groundedTime.current = 0
    }

    // Jump — scaled for character size
    if ((keys.jump || mobileJump) && grounded) {
      const mass = body.current.mass()
      const jumpImpulse = JUMP * mass * Math.pow(scale, 0.55)
      body.current.applyImpulse({ x: 0, y: jumpImpulse, z: 0 }, true)
    }

    // Facing direction (yaw)
    if (raw.lengthSq() > 0.01) {
      targetYaw.current = Math.atan2(raw.x, raw.z)
    }
    currentYaw.current = lerpAngle(
      currentYaw.current,
      targetYaw.current,
      1 - Math.exp(-ROT_SMOOTH * delta)
    )

    // Body tilt — lean into direction (forward when moving, lateral on turns)
    const targetTiltX = -moveMag * 0.18 // forward lean
    const targetTiltZ = 0 // could add lateral tilt on turn, keep simple
    currentTilt.current.x = MathUtils.damp(
      currentTilt.current.x,
      targetTiltX,
      8,
      delta
    )
    currentTilt.current.z = MathUtils.damp(
      currentTilt.current.z,
      targetTiltZ,
      8,
      delta
    )

    // Walk cycle (legs + arms swing in opposition)
    walkPhase.current += delta * WALK_HZ * moveMag
    const walkAmp = moveMag * 0.85
    const swing = Math.sin(walkPhase.current) * walkAmp

    // Body bob
    bodyBob.current = Math.abs(Math.sin(walkPhase.current)) * 0.06 * moveMag

    // Apply animations
    const air = Math.min(1, airTime.current * 2)

    if (visualRoot.current) {
      visualRoot.current.rotation.y = currentYaw.current
      visualRoot.current.scale.setScalar(scale)
    }

    if (tiltGroup.current) {
      // Body leans forward when moving; tumbles when in air
      tiltGroup.current.rotation.x = MathUtils.lerp(
        currentTilt.current.x,
        -airTime.current * 1.5,
        air * 0.4
      )
      tiltGroup.current.rotation.z = currentTilt.current.z
      tiltGroup.current.position.y = bodyBob.current
    }

    if (headPivot.current) {
      // Head bobs opposite to body, gentle nod
      headPivot.current.rotation.x = -bodyBob.current * 2 + air * 0.3
      headPivot.current.rotation.z = Math.sin(walkPhase.current * 0.5) * 0.06 * moveMag
    }

    if (bodyPivot.current) {
      bodyPivot.current.rotation.y = Math.sin(walkPhase.current) * 0.12 * moveMag
    }

    // Legs swing opposite
    if (leftLeg.current && rightLeg.current) {
      if (air > 0.3) {
        leftLeg.current.rotation.x = MathUtils.lerp(leftLeg.current.rotation.x, -0.8 + air * 0.4, 0.2)
        rightLeg.current.rotation.x = MathUtils.lerp(rightLeg.current.rotation.x, -0.8 - air * 0.3, 0.2)
      } else {
        leftLeg.current.rotation.x = swing
        rightLeg.current.rotation.x = -swing
      }
    }

    // Arms swing opposite to legs
    if (leftArm.current && rightArm.current) {
      if (air > 0.3) {
        // Air: arms flail upward
        leftArm.current.rotation.z = MathUtils.lerp(leftArm.current.rotation.z, 1.4 + Math.sin(airTime.current * 8) * 0.3, 0.15)
        rightArm.current.rotation.z = MathUtils.lerp(rightArm.current.rotation.z, -1.4 - Math.sin(airTime.current * 7) * 0.3, 0.15)
        leftArm.current.rotation.x = Math.sin(airTime.current * 6) * 0.4
        rightArm.current.rotation.x = Math.cos(airTime.current * 5) * 0.4
      } else {
        leftArm.current.rotation.x = -swing * 0.9
        rightArm.current.rotation.x = swing * 0.9
        leftArm.current.rotation.z = MathUtils.lerp(leftArm.current.rotation.z, 0.3, 0.2)
        rightArm.current.rotation.z = MathUtils.lerp(rightArm.current.rotation.z, -0.3, 0.2)
      }
    }

    // Third-person camera — scales with character size
    const pos = body.current.translation()
    const camHeight = 6 + scale * 1.2
    const camBack = 12 + scale * 1.8
    camDesired.current.set(pos.x, pos.y + camHeight, pos.z + camBack)
    state.camera.position.lerp(camDesired.current, 1 - Math.exp(-6 * delta))

    camLookAt.current.set(pos.x, pos.y + 1.2 * scale, pos.z)
    camCurrentLook.current.lerp(camLookAt.current, 1 - Math.exp(-10 * delta))
    state.camera.lookAt(camCurrentLook.current)

    // Respawn
    if (pos.y < -30) {
      body.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      smoothInput.current.set(0, 0, 0)
    }
  })

  // Big characters can't fit inside narrow gaps — scale affects physics
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
        <group ref={tiltGroup} position={[0, 0, 0]}>
          {/* Body (torso) */}
          <group ref={bodyPivot}>
            <mesh position={[0, -0.1, 0]} castShadow>
              <capsuleGeometry args={[0.45, 0.5, 6, 12]} />
              <meshToonMaterial color="#ef476f" />
            </mesh>
          </group>

          {/* Head with face */}
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
            {/* White eye highlights */}
            <mesh position={[0.28, 0.3, 0.66]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh position={[-0.22, 0.3, 0.66]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Smile */}
            <mesh position={[0, -0.05, 0.62]} rotation={[0.2, 0, 0]}>
              <torusGeometry args={[0.22, 0.05, 6, 14, Math.PI]} />
              <meshBasicMaterial color="#b23a48" />
            </mesh>
          </group>

          {/* Left arm — pivot at shoulder */}
          <group ref={leftArm} position={[0.55, 0.25, 0]}>
            <mesh position={[0, -0.25, 0]} rotation={[0, 0, 0.3]} castShadow>
              <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
              <meshToonMaterial color="#ef476f" />
            </mesh>
          </group>

          {/* Right arm */}
          <group ref={rightArm} position={[-0.55, 0.25, 0]}>
            <mesh position={[0, -0.25, 0]} rotation={[0, 0, -0.3]} castShadow>
              <capsuleGeometry args={[0.13, 0.4, 6, 10]} />
              <meshToonMaterial color="#ef476f" />
            </mesh>
          </group>

          {/* Left leg — pivot at hip */}
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

          {/* Right leg */}
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
