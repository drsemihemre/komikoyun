'use client'

import { useGameStore } from '@/lib/store'

export default function HUD() {
  const isMobile = useGameStore((s) => s.isMobile)
  const hitCount = useGameStore((s) => s.hitCount)

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {!isMobile && (
        <div className="absolute left-4 top-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-lg font-black tracking-wide">KOMİK OYUN</div>
          <div className="mt-1 text-xs opacity-80">Faz 4 · Arena</div>
        </div>
      )}

      {/* Hit counter */}
      <div className="absolute right-4 top-4 flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
        <span className="text-xl">👊</span>
        <span className="text-lg font-bold tabular-nums">{hitCount}</span>
      </div>

      {!isMobile && (
        <div className="absolute bottom-4 left-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-sm font-semibold">Kontroller</div>
          <div className="mt-1 text-xs leading-5 opacity-80">
            W A S D / Ok tuşları — Hareket
            <br />
            Space — Zıpla · F — Vur 👊
            <br />
            1 / 2 / 3 / 4 — İksir · 0 — Sıfırla
          </div>
        </div>
      )}
    </div>
  )
}
