'use client'

import { useEffect } from 'react'
import { useGameStore, type PotionType } from '@/lib/store'
import { playPotion } from '@/lib/sounds'

type PotionDef = {
  type: PotionType
  emoji: string
  gradient: string
  label: string
  hotkey: string
}

const POTIONS: PotionDef[] = [
  {
    type: 'grow',
    emoji: '🌱',
    gradient: 'from-green-400 to-emerald-600',
    label: 'Büyü',
    hotkey: '1',
  },
  {
    type: 'shrink',
    emoji: '🔽',
    gradient: 'from-fuchsia-400 to-purple-600',
    label: 'Küçül',
    hotkey: '2',
  },
  {
    type: 'speed',
    emoji: '⚡',
    gradient: 'from-amber-400 to-orange-500',
    label: 'Hızlan',
    hotkey: '3',
  },
  {
    type: 'slow',
    emoji: '🐢',
    gradient: 'from-sky-400 to-cyan-600',
    label: 'Yavaşla',
    hotkey: '4',
  },
]

export default function PotionInventory() {
  const drinkPotionRaw = useGameStore((s) => s.drinkPotion)
  const drinkPotion = (p: PotionType) => {
    drinkPotionRaw(p)
    playPotion(p)
  }
  const scale = useGameStore((s) => s.scale)
  const speedMult = useGameStore((s) => s.speedMult)
  const potionHits = useGameStore((s) => s.potionHits)
  const resetPotions = useGameStore((s) => s.resetPotions)
  const isMobile = useGameStore((s) => s.isMobile)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === '1') drinkPotion('grow')
      else if (e.key === '2') drinkPotion('shrink')
      else if (e.key === '3') drinkPotion('speed')
      else if (e.key === '4') drinkPotion('slow')
      else if (e.key === '0') resetPotions()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drinkPotion, resetPotions])

  return (
    <>
      <div className="pointer-events-auto absolute left-1/2 top-4 flex -translate-x-1/2 gap-2 md:gap-3">
        {POTIONS.map((p) => (
          <button
            key={p.type}
            onClick={() => drinkPotion(p.type)}
            onTouchStart={(e) => {
              e.preventDefault()
              drinkPotion(p.type)
            }}
            className={`relative h-20 w-16 rounded-2xl border-2 border-white/40 bg-gradient-to-b ${p.gradient} flex flex-col items-center justify-center shadow-lg transition-transform active:scale-90 md:h-24 md:w-20`}
          >
            <div className="text-3xl drop-shadow md:text-4xl">{p.emoji}</div>
            <div className="mt-1 text-[10px] font-bold text-white drop-shadow md:text-xs">
              {p.label}
            </div>
            {!isMobile && (
              <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-black text-black shadow">
                {p.hotkey}
              </div>
            )}
            {potionHits[p.type] > 0 && (
              <div className="absolute -bottom-2 -right-2 min-w-[22px] rounded-full bg-black/70 px-1.5 py-0.5 text-center text-xs font-bold text-white shadow">
                {potionHits[p.type]}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="pointer-events-auto absolute left-1/2 top-[110px] flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/40 px-4 py-1.5 text-xs font-semibold text-white shadow backdrop-blur-sm md:top-[128px]">
        <span>Boyut: ×{scale.toFixed(1)}</span>
        <span className="opacity-50">|</span>
        <span>Hız: ×{speedMult.toFixed(1)}</span>
        <button
          onClick={() => resetPotions()}
          className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] hover:bg-white/30 active:scale-95"
        >
          sıfırla
        </button>
      </div>
    </>
  )
}
