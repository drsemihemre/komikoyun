'use client'

import { useGameStore } from '@/lib/store'

export default function HUD() {
  const isMobile = useGameStore((s) => s.isMobile)

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute left-4 top-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
        <div className="text-lg font-black tracking-wide">KOMİK OYUN</div>
        <div className="mt-1 text-xs opacity-80">Faz 2 · İksirler</div>
      </div>

      {!isMobile && (
        <div className="absolute bottom-4 left-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-sm font-semibold">Kontroller</div>
          <div className="mt-1 text-xs leading-5 opacity-80">
            W A S D / Ok tuşları — Hareket
            <br />
            Space — Zıpla
            <br />
            1 / 2 / 3 / 4 — İksir iç · 0 — Sıfırla
          </div>
        </div>
      )}
    </div>
  )
}
