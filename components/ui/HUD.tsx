'use client'

import { useEffect, useState } from 'react'
import { useGameStore, PLAYER_HP_MAX } from '@/lib/store'
import { setMuted, isMuted } from '@/lib/sounds'

export default function HUD() {
  const isMobile = useGameStore((s) => s.isMobile)
  const hitCount = useGameStore((s) => s.hitCount)
  const koCount = useGameStore((s) => s.koCount)
  const score = useGameStore((s) => s.score)
  const playerHP = useGameStore((s) => s.playerHP)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const toggleCamera = useGameStore((s) => s.toggleCamera)

  const [pointerLocked, setPointerLocked] = useState(false)
  const [muted, setMutedLocal] = useState(false)

  useEffect(() => {
    const onChange = () => setPointerLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  useEffect(() => {
    setMutedLocal(isMuted())
  }, [])

  const hpPct = Math.max(0, Math.min(100, (playerHP / PLAYER_HP_MAX) * 100))
  const hpColor =
    hpPct > 60
      ? 'from-emerald-400 to-green-600'
      : hpPct > 30
        ? 'from-yellow-400 to-orange-500'
        : 'from-red-500 to-rose-700'

  const onCameraToggle = () => {
    const next = cameraMode === 'third' ? 'first' : 'third'
    if (next === 'first') {
      document.body.requestPointerLock?.()
    } else {
      if (document.pointerLockElement) document.exitPointerLock?.()
    }
    toggleCamera()
  }

  const onMuteToggle = () => {
    const next = !muted
    setMuted(next)
    setMutedLocal(next)
  }

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {!isMobile && (
        <div className="absolute left-4 top-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-lg font-black tracking-wide">KOMİK OYUN</div>
          <div className="mt-1 text-xs opacity-80">Faz 8 · İçerik</div>
        </div>
      )}

      {/* HP bar */}
      <div
        className={`absolute ${isMobile ? 'left-4 top-4' : 'left-4 top-20'} w-48 rounded-xl bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur-sm`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">❤️</span>
          <div className="flex-1">
            <div className="h-3 w-full overflow-hidden rounded-full bg-black/40">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${hpColor} transition-all duration-200 ease-out`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <div className="mt-0.5 text-[10px] font-bold tabular-nums opacity-80">
              {Math.round(playerHP)} / {PLAYER_HP_MAX}
            </div>
          </div>
        </div>
      </div>

      {/* Score panel + buttons (top right) */}
      <div className="absolute right-4 top-4 flex items-start gap-2">
        <div className="flex flex-col rounded-xl bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌟</span>
            <span className="text-2xl font-black tabular-nums">{score}</span>
          </div>
          <div className="mt-0.5 flex gap-3 text-[11px] opacity-80">
            <span>👊 {hitCount}</span>
            <span>💥 {koCount}</span>
          </div>
        </div>
        <button
          onClick={onCameraToggle}
          onTouchStart={(e) => {
            e.preventDefault()
            onCameraToggle()
          }}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-xl text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
          title={cameraMode === 'third' ? 'FPV moduna geç' : 'Üçüncü şahıs moduna geç'}
        >
          {cameraMode === 'third' ? '👁️' : '🎥'}
        </button>
        <button
          onClick={onMuteToggle}
          onTouchStart={(e) => {
            e.preventDefault()
            onMuteToggle()
          }}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-xl text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
          title={muted ? 'Sesi aç' : 'Sesi kapat'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* FPV crosshair */}
      {cameraMode === 'first' && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-4 w-4 rounded-full border-2 border-white/80 shadow-lg" />
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      )}

      {/* FPV pointer lock hint */}
      {cameraMode === 'first' && !pointerLocked && !isMobile && (
        <div className="pointer-events-none absolute left-1/2 top-[60%] -translate-x-1/2 rounded-xl bg-black/70 px-4 py-2 text-center text-white shadow-xl backdrop-blur-sm">
          <div className="text-sm font-bold">Ekrana tıkla → fare ile bak</div>
          <div className="mt-1 text-xs opacity-80">ESC — kilidi bırak</div>
        </div>
      )}

      {!isMobile && (
        <div className="absolute bottom-4 left-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-sm font-semibold">Kontroller</div>
          <div className="mt-1 text-xs leading-5 opacity-80">
            W A S D — Hareket · Space — Zıpla
            <br />
            F / Q — Vur 👊 · V — Kamera
            <br />
            1-4 — İksir · 0 — Sıfırla
          </div>
        </div>
      )}
    </div>
  )
}
