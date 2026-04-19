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
import {
  playJump,
  playLand,
  playHit,
  playDamage,
  playLaunch,
  playFart,
  playWaterGun,
  playVacuum,
  playTeleportGun,
  playBalloonGun,
} from '@/lib/sounds'
import { spawnImpact } from '@/lib/particles'
import { TELEPORT_POINTS } from './SurprisePotions'
import { getWeapon, type WeaponId } from '@/lib/weapons'
import { sendState } from '@/lib/multiplayer'

const BASE_SPEED = 10
const JUMP = 13
const DEADZONE = 0.12
const INPUT_SMOOTH = 16
const ROT_SMOOTH = 10
const WALK_HZ = 7

const FALL_AIRTIME = 0.9
const FALL_VEL_Y = -18
const RAGDOLL_MIN_DURATION = 1.5
const RAGDOLL_SETTLE_TIME = 0.7

const MOUSE_SENS = 0.0028
const PITCH_MIN = -1.2
const PITCH_MAX = 1.2

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
  const pendingLaunch = useRef<[number, number, number] | null>(null)
  const peakFallVel = useRef(0) // en küçük (negatif) vy havada
  const wasGrounded = useRef(true)

  const attackProgress = useRef(-1)
  const lastAttackT = useRef(0)
  const lastWeaponFireT = useRef(0)
  const wasAttackPressed = useRef(false)
  const wasWeaponFirePressed = useRef(false)

  // FPV mouse look
  const mouseYaw = useRef(0)
  const mousePitch = useRef(0)

  const [, getKeys] = useKeyboardControls()
  const scale = useGameStore((s) => s.scale)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const currentWeapon = useGameStore((s) => s.currentWeapon)

  // Register player handle for creatures to attack us
  useEffect(() => {
    registerPlayer({
      getPos: () => {
        if (!body.current) return null
        const p = body.current.translation()
        return { x: p.x, y: p.y, z: p.z }
      },
      takeHit: (damage, knockbackDir) => {
        const { playerHP, damagePlayer } = useGameStore.getState()
        if (playerHP <= 0) return
        damagePlayer(damage)
        playDamage()
        if (body.current) {
          const k = 5 * scale
          body.current.applyImpulse(
            {
              x: knockbackDir[0] * k,
              y: 3.5 * scale + knockbackDir[1] * k,
              z: knockbackDir[2] * k,
            },
            true
          )
        }
      },
      isDown: () => {
        const hp = useGameStore.getState().playerHP
        return hp <= 0 || isRagdoll.current
      },
      launch: (impulse) => {
        pendingLaunch.current = impulse
      },
      teleportTo: (x, y, z) => {
        if (!body.current) return
        body.current.setTranslation({ x, y, z }, true)
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      },
      reset: () => {
        if (!body.current) return
        body.current.setTranslation({ x: 0, y: 3, z: 0 }, true)
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        body.current.setEnabledRotations(false, false, false, true)
        isRagdoll.current = false
        settleStartT.current = 0
        pendingLaunch.current = null
        airTime.current = 0
        peakFallVel.current = 0
        currentYaw.current = 0
        targetYaw.current = 0
        mouseYaw.current = 0
        mousePitch.current = 0
        smoothInput.current.set(0, 0, 0)
      },
    })
    return () => unregisterPlayer()
  }, [scale])

  // Keyboard X → cycle weapon
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'x' && e.key !== 'X' && e.key !== 'Tab') return
      if (e.repeat) return
      if (e.key === 'Tab') e.preventDefault()
      const state = useGameStore.getState()
      if (!state.gameStarted || state.paused) return
      state.cycleWeapon()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Keyboard T → teleport (consume charge, random destination)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 't' && e.key !== 'T') return
      if (e.repeat) return
      const state = useGameStore.getState()
      if (!state.gameStarted || state.paused) return
      if (!body.current) return
      if (state.teleportCharges <= 0) return
      if (!state.consumeTeleport()) return

      const from = body.current.translation()
      const idx = Math.floor(Math.random() * TELEPORT_POINTS.length)
      const dest = TELEPORT_POINTS[idx]
      // Avoid teleporting to same spot
      const d2 =
        (dest[0] - from.x) * (dest[0] - from.x) +
        (dest[2] - from.z) * (dest[2] - from.z)
      const finalDest =
        d2 < 100
          ? TELEPORT_POINTS[(idx + 1) % TELEPORT_POINTS.length]
          : dest

      // Visual burst at both ends
      spawnImpact(from.x, from.y + 0.5, from.z, '#c77dff', 1.3)
      spawnImpact(
        finalDest[0],
        finalDest[1] + 0.3,
        finalDest[2],
        '#c77dff',
        1.3
      )
      playLaunch()

      body.current.setTranslation(
        { x: finalDest[0], y: finalDest[1] + 1, z: finalDest[2] },
        true
      )
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Keyboard V → toggle camera + pointer lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'v' && e.key !== 'V') return
      if (e.repeat) return
      const nextMode =
        useGameStore.getState().cameraMode === 'third' ? 'first' : 'third'
      if (nextMode === 'first') {
        // Sync mouse yaw to current yaw so camera doesn't snap
        mouseYaw.current = currentYaw.current
        mousePitch.current = 0
        document.body.requestPointerLock?.()
      } else {
        if (document.pointerLockElement) document.exitPointerLock?.()
      }
      useGameStore.getState().toggleCamera()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Pointer lock change → if user exits lock (ESC), switch back to 3rd person
  useEffect(() => {
    const onLockChange = () => {
      if (
        !document.pointerLockElement &&
        useGameStore.getState().cameraMode === 'first'
      ) {
        useGameStore.getState().toggleCamera()
      }
    }
    document.addEventListener('pointerlockchange', onLockChange)
    return () =>
      document.removeEventListener('pointerlockchange', onLockChange)
  }, [])

  // Mouse look — FPV'de karakter yönü, 3. şahıs'ta kamera orbit
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!document.pointerLockElement) return
      mouseYaw.current -= e.movementX * MOUSE_SENS
      mousePitch.current = MathUtils.clamp(
        mousePitch.current - e.movementY * MOUSE_SENS,
        PITCH_MIN,
        PITCH_MAX
      )
    }
    document.addEventListener('mousemove', onMouseMove)
    return () => document.removeEventListener('mousemove', onMouseMove)
  }, [])

  // Canvas/document tıklama → pointer lock aktif et (her iki modda da)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.closest('button') || target.closest('input')))
        return
      const s = useGameStore.getState()
      if (!s.gameStarted || s.paused) return
      if (document.pointerLockElement) return
      document.body.requestPointerLock?.()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // When cameraMode changes via button (not keyboard), also handle pointer lock
  useEffect(() => {
    if (cameraMode === 'first') {
      mouseYaw.current = currentYaw.current
      mousePitch.current = 0
      if (!document.pointerLockElement) {
        document.body.requestPointerLock?.()
      }
    } else {
      // 3. şahıs'a geçişte kamera orbit sıfırlanır (kamera arkada)
      mouseYaw.current = 0
      mousePitch.current = 0
      // pointer lock bu modda da kullanılabilir (orbit için)
    }
  }, [cameraMode])

  useFrame((state, delta) => {
    if (!body.current) return

    const {
      mobileMove,
      mobileJump,
      mobileAttack,
      speedMult,
      playerHP,
      setPlayerHP,
      paused,
      gameStarted,
    } = useGameStore.getState()
    const keys = getKeys()
    const now = state.clock.elapsedTime

    // Kartta ise: oyuncu hareketini ve yumruk/silah atla, sadece kamera takibi
    const isDriving = useGameStore.getState().drivingKart !== null
    if (isDriving) {
      const pos = body.current.translation()
      if (cameraMode !== 'first') {
        const camHeight = 6 + scale * 1.2
        const camBack = 12 + scale * 1.8
        camDesired.current.set(pos.x, pos.y + camHeight, pos.z + camBack)
        state.camera.position.lerp(
          camDesired.current,
          1 - Math.exp(-6 * delta)
        )
        camLookAt.current.set(pos.x, pos.y + 1.2 * scale, pos.z)
        camCurrentLook.current.lerp(
          camLookAt.current,
          1 - Math.exp(-10 * delta)
        )
        state.camera.lookAt(camCurrentLook.current)
      }
      return
    }

    // Oyun duraklatıldı veya başlamadıysa: sadece kamera takibini koru, mantığı atla
    if (paused || !gameStarted) {
      const pos = body.current.translation()
      if (cameraMode !== 'first') {
        const camHeight = 6 + scale * 1.2
        const camBack = 12 + scale * 1.8
        camDesired.current.set(pos.x, pos.y + camHeight, pos.z + camBack)
        state.camera.position.lerp(
          camDesired.current,
          1 - Math.exp(-6 * delta)
        )
        camLookAt.current.set(pos.x, pos.y + 1.2 * scale, pos.z)
        camCurrentLook.current.lerp(
          camLookAt.current,
          1 - Math.exp(-10 * delta)
        )
        state.camera.lookAt(camCurrentLook.current)
      }
      wasAttackPressed.current = false
      wasGrounded.current = true
      return
    }

    const pos = body.current.translation()
    const linvel = body.current.linvel()

    const grounded = Math.abs(linvel.y) < 0.5
    if (grounded) airTime.current = 0
    else airTime.current += delta

    // Track peak fall velocity for damage calc
    if (!grounded && linvel.y < peakFallVel.current) {
      peakFallVel.current = linvel.y
    }

    // Landing detection → fall damage + land sound (azaltılmış)
    if (grounded && !wasGrounded.current) {
      const impact = -peakFallVel.current
      if (impact > 3) {
        playLand(impact)
        if (impact > 9 && !isRagdoll.current) {
          // Yumuşak ramp: 9 altı hasarsız, yavaş artan, max 25
          const dmg = Math.min(25, Math.floor((impact - 9) * 1.1 + 1))
          if (dmg > 0) {
            useGameStore.getState().damagePlayer(dmg)
            playDamage()
          }
        }
      }
      peakFallVel.current = 0
    }
    wasGrounded.current = grounded

    // --- PENDING LAUNCH (from catapult) ---
    if (pendingLaunch.current) {
      const [lx, ly, lz] = pendingLaunch.current
      pendingLaunch.current = null
      if (!isRagdoll.current) enterRagdoll()
      const mass = body.current.mass()
      body.current.applyImpulse(
        { x: lx * mass, y: ly * mass, z: lz * mass },
        true
      )
    }

    // --- RAGDOLL TRIGGER ---
    if (
      !isRagdoll.current &&
      (airTime.current > FALL_AIRTIME || linvel.y < FALL_VEL_Y) &&
      pos.y > -25
    ) {
      enterRagdoll()
    }

    // HP=0 → ragdoll + respawn (tamamen sıfırla)
    if (playerHP <= 0 && !isRagdoll.current) {
      enterRagdoll()
      setTimeout(() => {
        if (!body.current) return
        body.current.setTranslation({ x: 0, y: 3, z: 0 }, true)
        body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
        body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
        body.current.setEnabledRotations(false, false, false, true)
        isRagdoll.current = false
        settleStartT.current = 0
        pendingLaunch.current = null
        airTime.current = 0
        peakFallVel.current = 0
        currentYaw.current = 0
        targetYaw.current = 0
        mouseYaw.current = 0
        mousePitch.current = 0
        smoothInput.current.set(0, 0, 0)
        rawInput.current.set(0, 0, 0)
        wasAttackPressed.current = false
        wasWeaponFirePressed.current = false
        wasGrounded.current = true
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

    // RAGDOLL RECOVERY
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
          // Body identity — visualRoot yaw controls facing direction
          body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
          body.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
          // Yaw'ı mevcut harekete göre sıfırla (kontrol geri gelsin)
          currentYaw.current = 0
          targetYaw.current = 0
          body.current.setTranslation(
            { x: pos.x, y: pos.y + 0.4 * scale, z: pos.z },
            true
          )
        }
      } else {
        settleStartT.current = 0
      }
    }

    // --- INPUT ---
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

    // --- MOVEMENT + YAW ---
    if (!isRagdoll.current) {
      const speed = BASE_SPEED * speedMult * Math.pow(scale, 0.45)

      if (cameraMode === 'first') {
        // FPV: yaw driven by mouse; movement is forward/strafe relative to yaw
        currentYaw.current = mouseYaw.current
        targetYaw.current = mouseYaw.current
        const sinY = Math.sin(currentYaw.current)
        const cosY = Math.cos(currentYaw.current)
        // si.z negative = forward (W), si.x positive = right (D) — strafe
        const worldVx = -si.z * sinY + si.x * cosY
        const worldVz = -si.z * cosY - si.x * sinY
        body.current.setLinvel(
          { x: worldVx * speed, y: linvel.y, z: worldVz * speed },
          true
        )
      } else {
        // 3rd person: input-based yaw, move in input direction
        body.current.setLinvel(
          { x: si.x * speed, y: linvel.y, z: si.z * speed },
          true
        )
        if (raw.lengthSq() > 0.01) {
          targetYaw.current = Math.atan2(raw.x, raw.z)
        }
        currentYaw.current = lerpAngle(
          currentYaw.current,
          targetYaw.current,
          1 - Math.exp(-ROT_SMOOTH * delta)
        )
      }

      if ((keys.jump || mobileJump) && grounded) {
        const mass = body.current.mass()
        const nowSec = performance.now() / 1000
        const jumpBoost = useGameStore.getState().jumpBoostUntil > nowSec ? 1.9 : 1
        body.current.applyImpulse(
          { x: 0, y: JUMP * mass * Math.pow(scale, 0.55) * jumpBoost, z: 0 },
          true
        )
        playJump()
      }

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
            spawnImpact(cp.x, cp.y + 0.5, cp.z, '#ffd60a', 0.8 + scale * 0.15)
            hits++
          }
          if (hits > 0) {
            useGameStore.getState().incrementHitCount()
            playHit()
          }
        }
      }

      // WEAPON FIRE (R key / mobile fire button) — current weapon
      const weaponHeld =
        (keys as Record<string, boolean>).weaponFire ||
        useGameStore.getState().mobileWeaponFire
      const weaponEdge = weaponHeld && !wasWeaponFirePressed.current
      wasWeaponFirePressed.current = weaponHeld

      if (weaponEdge && currentWeapon !== 'fist') {
        const w = getWeapon(currentWeapon)
        if (now - lastWeaponFireT.current > w.cooldown) {
          const dxS = pos.x - SAFE_ZONE.center[0]
          const dzS = pos.z - SAFE_ZONE.center[2]
          const inSafe = Math.hypot(dxS, dzS) < SAFE_ZONE.radius
          if (!inSafe) {
            lastWeaponFireT.current = now
            attackProgress.current = 0

            const fwdX = Math.sin(currentYaw.current)
            const fwdZ = Math.cos(currentYaw.current)
            const fwdY = cameraMode === 'first' ? -mousePitch.current * 0.3 : 0

            // Fire sound
            if (currentWeapon === 'water') playWaterGun()
            else if (currentWeapon === 'fart') playFart()
            else if (currentWeapon === 'teleportGun') playTeleportGun()
            else if (currentWeapon === 'vacuum') playVacuum()
            else if (currentWeapon === 'balloon') playBalloonGun()

            // Muzzle flash at player's hand position
            const muzzleX = pos.x + fwdX * 0.8
            const muzzleY = pos.y + 0.4 * scale
            const muzzleZ = pos.z + fwdZ * 0.8
            spawnImpact(muzzleX, muzzleY, muzzleZ, w.color, 0.5)

            // Projectile trail — chain of small impacts along trajectory
            if (w.isRanged) {
              const steps = 6
              for (let i = 1; i <= steps; i++) {
                const t = i / steps
                const tx = muzzleX + fwdX * w.range * t
                const ty = muzzleY + fwdY * w.range * t
                const tz = muzzleZ + fwdZ * w.range * t
                setTimeout(
                  () => spawnImpact(tx, ty, tz, w.color, 0.35 + t * 0.3),
                  i * 30
                )
              }
            }

            // Hit detection — creatures in cone within range
            let hits = 0
            for (const c of getCreatures()) {
              const cp = c.getPos()
              if (!cp) continue
              const ddx = cp.x - pos.x
              const ddz = cp.z - pos.z
              const dist = Math.hypot(ddx, ddz)
              if (dist > w.range || dist < 0.2) continue
              const ndx = ddx / dist
              const ndz = ddz / dist
              const dot = ndx * fwdX + ndz * fwdZ
              if (dot < 0.5) continue

              const hitForce = 22 * scale
              switch (currentWeapon) {
                case 'water':
                  c.melt()
                  spawnImpact(cp.x, cp.y + 0.5, cp.z, w.color, 1.3)
                  break
                case 'fart':
                  c.takeHit([
                    ndx * hitForce * 1.6,
                    12 * scale,
                    ndz * hitForce * 1.6,
                  ])
                  spawnImpact(cp.x, cp.y + 0.5, cp.z, w.color, 1.1)
                  break
                case 'teleportGun':
                  c.teleportAway()
                  spawnImpact(cp.x, cp.y + 0.5, cp.z, w.color, 1.4)
                  break
                case 'vacuum':
                  c.suckAndLaunch(pos.x, pos.z)
                  spawnImpact(cp.x, cp.y + 0.5, cp.z, w.color, 1.2)
                  break
                case 'balloon':
                  c.balloonify()
                  spawnImpact(cp.x, cp.y + 0.5, cp.z, w.color, 1.3)
                  break
              }
              hits++
            }
            if (hits > 0) useGameStore.getState().incrementHitCount()
          }
        }
      }
    }

    // Tick attack animation
    if (attackProgress.current >= 0) {
      attackProgress.current += delta / 0.28
      if (attackProgress.current >= 1) attackProgress.current = -1
    }

    // --- CAMERA ---
    const headHeight = 0.85 * scale
    if (cameraMode === 'first') {
      const yawC = currentYaw.current
      const pitchC = mousePitch.current
      const camPos = camDesired.current.set(
        pos.x,
        pos.y + headHeight,
        pos.z
      )
      state.camera.position.copy(camPos)
      // Look vector from yaw + pitch
      const lookX = Math.sin(yawC) * Math.cos(pitchC)
      const lookY = Math.sin(pitchC)
      const lookZ = Math.cos(yawC) * Math.cos(pitchC)
      camLookAt.current.set(
        pos.x + lookX * 5,
        pos.y + headHeight + lookY * 5,
        pos.z + lookZ * 5
      )
      state.camera.lookAt(camLookAt.current)
    } else {
      // 3. şahıs — mouseYaw/mousePitch ile orbit
      const camHeight = 6 + scale * 1.2
      const camBack = 12 + scale * 1.8
      const yaw = mouseYaw.current
      const pitch = mousePitch.current
      const horizontalDist = camBack * Math.cos(pitch)
      const vertOffset = -camBack * Math.sin(pitch)
      camDesired.current.set(
        pos.x + Math.sin(yaw) * horizontalDist,
        pos.y + camHeight + vertOffset,
        pos.z + Math.cos(yaw) * horizontalDist
      )
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
      visualRoot.current.visible = true // FPV'de de gövde/kol/bacak görünür
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
      // FPV'de kafayı gizle (kamera içinde) ama ragdoll'da görünür
      headPivot.current.visible =
        cameraMode !== 'first' || isRagdoll.current
    }

    if (bodyPivot.current) {
      bodyPivot.current.rotation.y =
        Math.sin(walkPhase.current) * 0.12 * moveMag
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

    // Multiplayer: state'i sunucuya gönder (80ms throttled)
    sendState({
      x: pos.x,
      y: pos.y,
      z: pos.z,
      yaw: currentYaw.current,
      scale: scale,
      hp: useGameStore.getState().playerHP,
      currentWeapon: useGameStore.getState().currentWeapon,
    })

    // Fail-safe
    if (pos.y < -45) {
      body.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
      body.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      body.current.setEnabledRotations(false, false, false, true)
      isRagdoll.current = false
      settleStartT.current = 0
      smoothInput.current.set(0, 0, 0)
      rawInput.current.set(0, 0, 0)
      currentYaw.current = 0
      targetYaw.current = 0
      peakFallVel.current = 0
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
            {/* Basit gülüş */}
            <mesh position={[0, -0.05, 0.65]} rotation={[Math.PI, 0, 0]}>
              <torusGeometry args={[0.22, 0.05, 6, 16, Math.PI]} />
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
            <WeaponMesh id={currentWeapon} />
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

// Sağ elde tutulan silah görseli — currentWeapon'a göre şekil değişir
function WeaponMesh({ id }: { id: WeaponId }) {
  // Position: arm'ın altında el seviyesi; namlu ileri doğru
  // Arm group at [-0.55, 0.25, 0], mesh at [0, -0.25, 0] → hand at local [0, -0.4, 0]
  const basePos: [number, number, number] = [0, -0.5, 0.3]

  if (id === 'fist') return null

  if (id === 'water') {
    return (
      <group position={basePos} rotation={[0.4, 0, 0]}>
        {/* Tank */}
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.32, 0.4]} />
          <meshToonMaterial color="#4cc9f0" />
        </mesh>
        {/* Barrel */}
        <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.07, 0.5, 10]} />
          <meshToonMaterial color="#1a5e8f" />
        </mesh>
        {/* Water window */}
        <mesh position={[0, 0.05, -0.15]}>
          <boxGeometry args={[0.12, 0.15, 0.08]} />
          <meshBasicMaterial color="#a8dadc" />
        </mesh>
      </group>
    )
  }

  if (id === 'fart') {
    return (
      <group position={basePos} rotation={[0.3, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.2, 0.25, 0.35]} />
          <meshToonMaterial color="#a8e10c" />
        </mesh>
        {/* Dark nozzle */}
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.12, 0.3, 10]} />
          <meshToonMaterial color="#2d3436" />
        </mesh>
        {/* Green cloud bauble */}
        <mesh position={[0, 0.15, -0.12]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshToonMaterial color="#a8e10c" />
        </mesh>
      </group>
    )
  }

  if (id === 'teleportGun') {
    return (
      <group position={basePos} rotation={[0.4, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.25, 0.3, 0.35]} />
          <meshToonMaterial color="#c77dff" />
        </mesh>
        {/* Emitter ring */}
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.04, 6, 14]} />
          <meshStandardMaterial
            color="#c77dff"
            emissive="#c77dff"
            emissiveIntensity={1.5}
          />
        </mesh>
        {/* Glow core */}
        <mesh position={[0, 0, 0.3]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#c77dff"
            emissiveIntensity={2}
          />
        </mesh>
      </group>
    )
  }

  if (id === 'vacuum') {
    return (
      <group position={basePos} rotation={[0.35, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.3, 0.4]} />
          <meshToonMaterial color="#4a5568" />
        </mesh>
        {/* Hose */}
        <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.2, 0.4, 12]} />
          <meshToonMaterial color="#1a202c" />
        </mesh>
        {/* Intake ring */}
        <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.04, 6, 14]} />
          <meshToonMaterial color="#718096" />
        </mesh>
      </group>
    )
  }

  if (id === 'balloon') {
    return (
      <group position={basePos} rotation={[0.4, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.3, 0.35]} />
          <meshToonMaterial color="#ff6b9d" />
        </mesh>
        {/* Barrel wider at tip */}
        <mesh position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.06, 0.3, 10]} />
          <meshToonMaterial color="#ffafcc" />
        </mesh>
        {/* Tiny balloon loaded */}
        <mesh position={[0, 0.02, 0.42]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshToonMaterial color="#ffd166" />
        </mesh>
      </group>
    )
  }

  return null
}
