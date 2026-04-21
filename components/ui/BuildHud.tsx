'use client'

import { useGameStore } from '@/lib/store'
import { computeBuildTarget } from '@/components/game/PlacedBlocks'

const MATERIAL_LABELS: Record<string, { emoji: string; name: string; color: string }> = {
  stone: { emoji: '🪨', name: 'Taş', color: '#8d9196' },
  wood: { emoji: '🪵', name: 'Ahşap', color: '#8d6e63' },
  glass: { emoji: '🪟', name: 'Cam', color: '#a2d2ff' },
  brick: { emoji: '🧱', name: 'Tuğla', color: '#c0392b' },
  grass: { emoji: '🌿', name: 'Çim', color: '#4caf50' },
}

export default function BuildHud() {
  const buildMode = useGameStore((s) => s.buildMode)
  const material = useGameStore((s) => s.buildMaterial)
  const toggleBuildMode = useGameStore((s) => s.toggleBuildMode)
  const cycleMat = useGameStore((s) => s.cycleBuildMaterial)
  const placeBlock = useGameStore((s) => s.placeBlockAt)
  const removeBlock = useGameStore((s) => s.removeBlockAt)
  const clearBlocks = useGameStore((s) => s.clearBlocks)
  const isMobile = useGameStore((s) => s.isMobile)

  if (!buildMode) {
    return (
      <button
        onClick={() => toggleBuildMode()}
        onTouchStart={(e) => {
          e.preventDefault()
          toggleBuildMode()
        }}
        className={`pointer-events-auto absolute ${
          isMobile ? 'left-4 top-44' : 'left-4 top-36'
        } flex h-11 items-center gap-2 rounded-xl bg-black/40 px-3 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95`}
        title="İnşaat Modu (B)"
      >
        🏗️ İnşa et
      </button>
    )
  }

  const info = MATERIAL_LABELS[material]

  const onPlace = () => {
    const t = computeBuildTarget()
    if (t) placeBlock(t[0], t[1], t[2])
  }
  const onRemove = () => {
    const t = computeBuildTarget()
    if (t) removeBlock(t[0], t[1], t[2])
  }

  return (
    <div className="pointer-events-auto absolute bottom-40 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-black/70 px-4 py-3 text-white shadow-2xl backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <span className="text-2xl">{info.emoji}</span>
        <span className="text-xs font-bold">{info.name}</span>
      </div>
      <button
        onClick={cycleMat}
        onTouchStart={(e) => {
          e.preventDefault()
          cycleMat()
        }}
        className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25 active:scale-95"
      >
        ↻ Malzeme
      </button>
      <button
        onClick={onPlace}
        onTouchStart={(e) => {
          e.preventDefault()
          onPlace()
        }}
        className="rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-2 text-sm font-black hover:scale-105 active:scale-95"
      >
        🟩 Yerleştir
      </button>
      <button
        onClick={onRemove}
        onTouchStart={(e) => {
          e.preventDefault()
          onRemove()
        }}
        className="rounded-lg bg-gradient-to-r from-orange-400 to-red-500 px-4 py-2 text-sm font-black hover:scale-105 active:scale-95"
      >
        ❌ Sil
      </button>
      <button
        onClick={() => {
          if (confirm('Tüm blokları silmek istiyor musun?')) clearBlocks()
        }}
        className="rounded-lg bg-white/15 px-3 py-2 text-xs hover:bg-white/25 active:scale-95"
        title="Hepsini temizle"
      >
        🗑️
      </button>
      <button
        onClick={() => useGameStore.getState().toggleBuildMode()}
        onTouchStart={(e) => {
          e.preventDefault()
          useGameStore.getState().toggleBuildMode()
        }}
        className="ml-2 rounded-lg bg-white/15 px-3 py-2 text-sm hover:bg-white/25 active:scale-95"
      >
        ✕
      </button>
    </div>
  )
}
