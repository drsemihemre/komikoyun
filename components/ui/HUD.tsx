'use client'

import { useGameStore, PLAYER_HP_MAX } from '@/lib/store'

export default function HUD() {
  const isMobile = useGameStore((s) => s.isMobile)
  const hitCount = useGameStore((s) => s.hitCount)
  const playerHP = useGameStore((s) => s.playerHP)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const toggleCamera = useGameStore((s) => s.toggleCamera)

  const hpPct = Math.max(0, Math.min(100, (playerHP / PLAYER_HP_MAX) * 100))
  const hpColor =
    hpPct > 60
      ? 'from-emerald-400 to-green-600'
      : hpPct > 30
        ? 'from-yellow-400 to-orange-500'
        : 'from-red-500 to-rose-700'

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Title — desktop only */}
      {!isMobile && (
        <div className="absolute left-4 top-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-lg font-black tracking-wide">KOMİK OYUN</div>
          <div className="mt-1 text-xs opacity-80">Faz 5 · Dünya</div>
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

      {/* Top-right cluster: hit counter + camera toggle */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
          <span className="text-xl">👊</span>
          <span className="text-lg font-bold tabular-nums">{hitCount}</span>
        </div>
        <button
          onClick={() => toggleCamera()}
          onTouchStart={(e) => {
            e.preventDefault()
            toggleCamera()
          }}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-xl text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
          title={cameraMode === 'third' ? 'FPV moduna geç' : 'Üçüncü şahıs moduna geç'}
        >
          {cameraMode === 'third' ? '👁️' : '🎥'}
        </button>
      </div>

      {!isMobile && (
        <div className="absolute bottom-4 left-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-sm font-semibold">Kontroller</div>
          <div className="mt-1 text-xs leading-5 opacity-80">
            W A S D / Ok — Hareket · Space — Zıpla
            <br />
            F — Vur 👊 · V — Kamera {cameraMode === 'third' ? '(3. şahıs)' : '(FPV)'}
            <br />
            1-4 — İksir · 0 — Sıfırla
          </div>
        </div>
      )}
    </div>
  )
}
