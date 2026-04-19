'use client'

import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/lib/store'
import { getWeapon } from '@/lib/weapons'

const BASE = 150
const STICK = 68

export default function MobileJoystick() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const isMobile = useGameStore((s) => s.isMobile)
  const setMobileMove = useGameStore((s) => s.setMobileMove)
  const setMobileJump = useGameStore((s) => s.setMobileJump)
  const setMobileAttack = useGameStore((s) => s.setMobileAttack)
  const setMobileWeaponFire = useGameStore((s) => s.setMobileWeaponFire)
  const setMobileCrouch = useGameStore((s) => s.setMobileCrouch)
  const cycleWeapon = useGameStore((s) => s.cycleWeapon)
  const currentWeapon = useGameStore((s) => s.currentWeapon)

  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 })
  const activeTouchId = useRef<number | null>(null)

  useEffect(() => {
    if (!isMobile) return
    const el = zoneRef.current
    if (!el) return

    const getVec = (cx: number, cy: number) => {
      const rect = el.getBoundingClientRect()
      const ox = rect.left + rect.width / 2
      const oy = rect.top + rect.height / 2
      const dx = cx - ox
      const dy = cy - oy
      const maxR = rect.width / 2 - STICK / 3
      const dist = Math.min(maxR, Math.hypot(dx, dy))
      const ang = Math.atan2(dy, dx)
      return {
        px: Math.cos(ang) * dist,
        py: Math.sin(ang) * dist,
        vx: maxR ? (Math.cos(ang) * dist) / maxR : 0,
        vy: maxR ? (Math.sin(ang) * dist) / maxR : 0,
      }
    }

    const onStart = (e: TouchEvent) => {
      if (activeTouchId.current !== null) return
      const t = e.changedTouches[0]
      if (!t) return
      activeTouchId.current = t.identifier
      const v = getVec(t.clientX, t.clientY)
      setStickOffset({ x: v.px, y: v.py })
      setMobileMove({ x: v.vx, y: v.vy })
      e.preventDefault()
    }

    const onMove = (e: TouchEvent) => {
      if (activeTouchId.current === null) return
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === activeTouchId.current) {
          const v = getVec(t.clientX, t.clientY)
          setStickOffset({ x: v.px, y: v.py })
          setMobileMove({ x: v.vx, y: v.vy })
          e.preventDefault()
          break
        }
      }
    }

    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === activeTouchId.current) {
          activeTouchId.current = null
          setStickOffset({ x: 0, y: 0 })
          setMobileMove({ x: 0, y: 0 })
          e.preventDefault()
          break
        }
      }
    }

    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: false })
    el.addEventListener('touchcancel', onEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      setMobileMove({ x: 0, y: 0 })
      setMobileJump(false)
      setMobileAttack(false)
      setMobileWeaponFire(false)
    }
  }, [isMobile, setMobileMove, setMobileJump, setMobileAttack, setMobileWeaponFire])

  if (!isMobile) return null

  const weapon = getWeapon(currentWeapon)

  return (
    <>
      {/* Joystick */}
      <div
        ref={zoneRef}
        className="pointer-events-auto absolute bottom-10 left-10 touch-none rounded-full border-4 border-white/70 bg-white/30 shadow-2xl backdrop-blur-sm"
        style={{ width: BASE, height: BASE }}
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-4 border-white bg-gradient-to-br from-white/95 to-white/75 shadow-xl"
          style={{
            width: STICK,
            height: STICK,
            transform: `translate(calc(-50% + ${stickOffset.x}px), calc(-50% + ${stickOffset.y}px))`,
            transition:
              activeTouchId.current === null ? 'transform 120ms ease-out' : 'none',
          }}
        />
      </div>

      {/* Cycle weapon button — top of right cluster */}
      <button
        className="absolute bottom-48 right-10 h-14 w-14 touch-none rounded-full border-4 border-white/80 bg-gradient-to-br from-slate-500 to-slate-700 text-2xl font-black text-white shadow-2xl active:scale-95"
        onTouchStart={(e) => {
          e.preventDefault()
          cycleWeapon()
        }}
        title="Silah değiştir"
      >
        🔄
      </button>

      {/* Weapon fire button */}
      {currentWeapon !== 'fist' && (
        <button
          className="absolute bottom-28 right-36 h-16 w-16 touch-none rounded-full border-4 border-white/80 bg-gradient-to-br from-indigo-500 to-purple-700 text-2xl font-black text-white shadow-2xl active:scale-95"
          onTouchStart={(e) => {
            e.preventDefault()
            setMobileWeaponFire(true)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            setMobileWeaponFire(false)
          }}
          onTouchCancel={() => setMobileWeaponFire(false)}
          title={weapon.name}
        >
          {weapon.emoji}
        </button>
      )}

      {/* Fist/attack button */}
      <button
        className={`absolute ${currentWeapon !== 'fist' ? 'bottom-28 right-56' : 'bottom-28 right-36'} h-16 w-16 touch-none rounded-full border-4 border-white/80 bg-gradient-to-br from-red-500 to-rose-600 text-2xl font-black text-white shadow-2xl active:scale-95`}
        onTouchStart={(e) => {
          e.preventDefault()
          setMobileAttack(true)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          setMobileAttack(false)
        }}
        onTouchCancel={() => setMobileAttack(false)}
        title="Yumruk"
      >
        👊
      </button>

      {/* Crouch button — joystick'in üstünde sol alt */}
      <button
        className="absolute bottom-48 left-24 h-14 w-14 touch-none rounded-full border-4 border-white/80 bg-gradient-to-br from-slate-500 to-slate-700 text-xl font-black text-white shadow-2xl active:scale-95"
        onTouchStart={(e) => {
          e.preventDefault()
          setMobileCrouch(true)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          setMobileCrouch(false)
        }}
        onTouchCancel={() => setMobileCrouch(false)}
        title="Eğil"
      >
        ⬇️
      </button>

      {/* Jump button */}
      <button
        className="absolute bottom-14 right-10 h-24 w-24 touch-none rounded-full border-4 border-white/80 bg-gradient-to-br from-orange-400 to-pink-500 text-3xl font-black text-white shadow-2xl active:scale-95"
        onTouchStart={(e) => {
          e.preventDefault()
          setMobileJump(true)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          setMobileJump(false)
        }}
        onTouchCancel={() => setMobileJump(false)}
        title="Zıpla"
      >
        ↑
      </button>
    </>
  )
}
