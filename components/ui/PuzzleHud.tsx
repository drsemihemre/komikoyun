'use client'

import { useGameStore } from '@/lib/store'

const KEY_DEFS: { color: string; hex: string }[] = [
  { color: 'red', hex: '#ef4444' },
  { color: 'blue', hex: '#3b82f6' },
  { color: 'green', hex: '#22c55e' },
  { color: 'yellow', hex: '#eab308' },
]

const ITEM_DEFS: { id: string; emoji: string; title: string }[] = [
  { id: 'crowbar', emoji: '🪓', title: 'Levye' },
  { id: 'wrench', emoji: '🔧', title: 'İngiliz anahtarı' },
  { id: 'slipper', emoji: '🩴', title: 'Komşunun terliği' },
]

export default function PuzzleHud() {
  const active = useGameStore((s) => s.puzzleActive)
  const keys = useGameStore((s) => s.puzzle.keys)
  const items = useGameStore((s) => s.puzzle.items)
  const solved = useGameStore((s) => s.puzzle.solved)
  const prompt = useGameStore((s) => s.puzzlePrompt)
  const isMobile = useGameStore((s) => s.isMobile)

  if (!active) return null

  const objective = solved
    ? '🎉 Akrabanı kurtardın! Dünyaya dönebilirsin.'
    : keys.length >= 4
      ? '🔓 Tüm anahtarlar tamam — 3. kattaki kafese git!'
      : '🔑 4 renkli anahtarı bul (3 kat). Aletler: 🪓 levye, 🔧 İngiliz anahtarı.'

  return (
    <>
      {/* Üst-orta görev paneli */}
      <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2">
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-black/70 px-4 py-2 text-white shadow-xl backdrop-blur-sm">
          <div className="text-xs font-black uppercase tracking-wide text-amber-300">
            😈 Kaçırılan Akraba — 3 Kat
          </div>
          <div className="flex items-center gap-2">
            {KEY_DEFS.map((k) => {
              const have = keys.includes(k.color)
              return (
                <div
                  key={k.color}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition"
                  style={{
                    backgroundColor: have ? k.hex : 'rgba(255,255,255,0.12)',
                    filter: have ? 'none' : 'grayscale(1)',
                    opacity: have ? 1 : 0.4,
                  }}
                  title={k.color}
                >
                  {have ? '🔑' : '🔒'}
                </div>
              )
            })}
            <div className="mx-0.5 h-7 w-px bg-white/25" />
            {ITEM_DEFS.map((t) => {
              const have = items.includes(t.id)
              return (
                <div
                  key={t.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                  style={{
                    backgroundColor: have ? 'rgba(245,158,11,0.85)' : 'rgba(255,255,255,0.12)',
                    opacity: have ? 1 : 0.4,
                  }}
                  title={t.title}
                >
                  {t.emoji}
                </div>
              )
            })}
          </div>
          <div className="text-[11px] font-semibold text-white/80">
            {objective} ({keys.length}/4)
          </div>
        </div>
      </div>

      {/* Mobil: bağlamsal E (Etkileşim) butonu */}
      {isMobile && prompt && (
        <button
          onClick={() =>
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))
          }
          onTouchStart={(e) => {
            e.preventDefault()
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))
          }}
          className="pointer-events-auto absolute bottom-28 left-1/2 z-30 flex max-w-[60vw] -translate-x-1/2 items-center gap-2 rounded-2xl bg-yellow-400/95 px-4 py-3 text-sm font-black text-black shadow-2xl ring-2 ring-white/70 transition active:scale-95"
        >
          <span className="rounded border border-black bg-white px-1.5">E</span>
          <span className="truncate">{prompt}</span>
        </button>
      )}
    </>
  )
}
