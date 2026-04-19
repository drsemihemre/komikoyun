'use client'

import { useGameStore, PLAYER_HP_MAX } from '@/lib/store'
import { resetPlayer } from '@/lib/playerHandle'

export default function PauseMenu() {
  const paused = useGameStore((s) => s.paused)
  const gameStarted = useGameStore((s) => s.gameStarted)
  const setPaused = useGameStore((s) => s.setPaused)
  const resetGame = useGameStore((s) => s.resetGame)
  const score = useGameStore((s) => s.score)
  const highScore = useGameStore((s) => s.highScore)
  const koCount = useGameStore((s) => s.koCount)
  const hitCount = useGameStore((s) => s.hitCount)

  if (!paused || !gameStarted) return null

  const onResume = () => {
    setPaused(false)
    void PLAYER_HP_MAX
  }

  const onReset = () => {
    resetGame()
    resetPlayer()
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center rounded-3xl bg-white/10 px-10 py-10 shadow-2xl backdrop-blur-lg md:px-14 md:py-12">
        <div className="text-5xl">⏸️</div>
        <h2 className="mt-2 text-4xl font-black tracking-tight text-white drop-shadow">
          DURAKLADI
        </h2>

        <div className="mt-5 flex gap-4 text-center text-white">
          <div className="rounded-xl bg-white/10 px-4 py-2">
            <div className="text-[11px] uppercase opacity-70">Skor</div>
            <div className="text-2xl font-black text-yellow-300">{score}</div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2">
            <div className="text-[11px] uppercase opacity-70">Rekor</div>
            <div className="text-2xl font-black">🏆 {highScore}</div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2">
            <div className="text-[11px] uppercase opacity-70">KO</div>
            <div className="text-2xl font-black">💥 {koCount}</div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2">
            <div className="text-[11px] uppercase opacity-70">Yumruk</div>
            <div className="text-2xl font-black">👊 {hitCount}</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 md:flex-row">
          <button
            onClick={onResume}
            onTouchStart={(e) => {
              e.preventDefault()
              onResume()
            }}
            className="rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 px-8 py-4 text-xl font-black text-white shadow-xl transition hover:scale-105 active:scale-95"
          >
            ▶ DEVAM
          </button>
          <button
            onClick={onReset}
            onTouchStart={(e) => {
              e.preventDefault()
              onReset()
            }}
            className="rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 px-8 py-4 text-xl font-black text-white shadow-xl transition hover:scale-105 active:scale-95"
          >
            🔄 SIFIRLA
          </button>
        </div>

        <div className="mt-4 text-xs text-white/70">
          ESC veya ⏸️ ile devam et
        </div>
      </div>
    </div>
  )
}
