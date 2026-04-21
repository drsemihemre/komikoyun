'use client'

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/lib/store'

// FPV modunda mobile'da sağa sola/yukarı bakabilmek için touch bölgesi.
// mouseYaw/mousePitch yerine custom event tetikler; Player tarafı dinler.

const SENS = 0.006

export default function MobileLookZone() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const isMobile = useGameStore((s) => s.isMobile)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const activeTouchId = useRef<number | null>(null)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isMobile) return
    if (cameraMode !== 'first') return
    const el = zoneRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      if (activeTouchId.current !== null) return
      const t = e.changedTouches[0]
      if (!t) return
      activeTouchId.current = t.identifier
      lastPos.current = { x: t.clientX, y: t.clientY }
      e.preventDefault()
    }
    const onMove = (e: TouchEvent) => {
      if (activeTouchId.current === null) return
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier !== activeTouchId.current) continue
        const dx = t.clientX - lastPos.current.x
        const dy = t.clientY - lastPos.current.y
        lastPos.current = { x: t.clientX, y: t.clientY }
        // Custom event — Player component dinler
        window.dispatchEvent(
          new CustomEvent('mobile-look', {
            detail: { dx, dy },
          })
        )
        e.preventDefault()
        break
      }
    }
    const onEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === activeTouchId.current) {
          activeTouchId.current = null
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
      activeTouchId.current = null
    }
  }, [isMobile, cameraMode])

  if (!isMobile || cameraMode !== 'first') return null

  return (
    <div
      ref={zoneRef}
      className="pointer-events-auto absolute touch-none"
      // Sağ yarı ekran, alt butonlar dışında
      style={{
        right: 0,
        top: '30%',
        width: '45%',
        height: '50%',
      }}
    />
  )
}

// Constants export
export const MOBILE_LOOK_SENS = SENS
