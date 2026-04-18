'use client'

import { useEffect, useRef } from 'react'
import { useGameStore } from '@/lib/store'

type NippleCollection = {
  on: (event: string, handler: (evt: unknown) => void) => void
  destroy: () => void
}

type JoystickMoveEvent = {
  data: { vector: { x: number; y: number } }
}

export default function MobileJoystick() {
  const zoneRef = useRef<HTMLDivElement>(null)
  const managerRef = useRef<NippleCollection | null>(null)
  const isMobile = useGameStore((s) => s.isMobile)
  const setMobileMove = useGameStore((s) => s.setMobileMove)
  const setMobileJump = useGameStore((s) => s.setMobileJump)

  useEffect(() => {
    if (!isMobile || !zoneRef.current) return

    let destroyed = false
    import('nipplejs').then((mod) => {
      if (destroyed || !zoneRef.current) return
      const nipple = mod.create({
        zone: zoneRef.current,
        mode: 'static',
        position: { left: '80px', bottom: '90px' },
        color: 'white',
        size: 130,
        restOpacity: 0.6,
      }) as unknown as NippleCollection
      managerRef.current = nipple

      nipple.on('move', (evt) => {
        const data = (evt as JoystickMoveEvent).data
        if (data?.vector) {
          setMobileMove({ x: data.vector.x, y: -data.vector.y })
        }
      })
      nipple.on('end', () => {
        setMobileMove({ x: 0, y: 0 })
      })
    })

    return () => {
      destroyed = true
      managerRef.current?.destroy()
      managerRef.current = null
      setMobileMove({ x: 0, y: 0 })
      setMobileJump(false)
    }
  }, [isMobile, setMobileMove, setMobileJump])

  if (!isMobile) return null

  return (
    <>
      <div
        ref={zoneRef}
        className="absolute bottom-0 left-0 h-56 w-56 touch-none"
      />
      <button
        className="absolute bottom-12 right-12 h-24 w-24 touch-none rounded-full bg-white/40 text-3xl font-black text-white shadow-lg backdrop-blur-sm active:bg-white/70 transition"
        onTouchStart={(e) => {
          e.preventDefault()
          setMobileJump(true)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          setMobileJump(false)
        }}
        onTouchCancel={() => setMobileJump(false)}
      >
        ↑
      </button>
    </>
  )
}
