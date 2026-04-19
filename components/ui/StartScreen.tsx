'use client'

import { useGameStore } from '@/lib/store'
import { startMusic } from '@/lib/sounds'

export default function StartScreen() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const setGameStarted = useGameStore((s) => s.setGameStarted)
  const isMobile = useGameStore((s) => s.isMobile)
  const highScore = useGameStore((s) => s.highScore)

  if (gameStarted) return null

  const onStart = () => {
    startMusic()
    setGameStarted(true)
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-sky-400/70 via-sky-500/60 to-indigo-700/70 backdrop-blur-sm">
      <div className="flex flex-col items-center rounded-3xl bg-white/15 px-10 py-12 shadow-2xl backdrop-blur-lg md:px-16 md:py-14">
        <div className="text-6xl md:text-8xl">🤸</div>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-white drop-shadow-lg md:text-7xl">
          KOMİK OYUN
        </h1>
        <div className="mt-2 text-lg font-semibold text-white/90 md:text-xl">
          Ragdoll fizik macerası
        </div>

        {highScore > 0 && (
          <div className="mt-4 rounded-full bg-yellow-400/90 px-4 py-1 text-sm font-bold text-yellow-900 shadow">
            🏆 En Yüksek Skor: {highScore}
          </div>
        )}

        <button
          onClick={onStart}
          onTouchStart={(e) => {
            e.preventDefault()
            onStart()
          }}
          className="mt-8 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 px-12 py-5 text-2xl font-black text-white shadow-2xl transition hover:scale-105 hover:from-orange-300 hover:to-pink-400 active:scale-95 md:text-3xl"
        >
          ▶ BAŞLA
        </button>

        <div className="mt-6 text-center text-xs text-white/80 md:text-sm">
          {isMobile ? (
            <>
              <div>📱 Joystick ile yürü, butonlarla zıpla / vur</div>
              <div className="mt-1">Üst ortada iksirler, 👁️ kamera değiştir</div>
            </>
          ) : (
            <>
              <div>
                <span className="font-bold">WASD</span> yürü ·{' '}
                <span className="font-bold">Space</span> zıpla ·{' '}
                <span className="font-bold">F/Q</span> vur 👊
              </div>
              <div className="mt-1">
                <span className="font-bold">V</span> kamera ·{' '}
                <span className="font-bold">1-4</span> iksir ·{' '}
                <span className="font-bold">ESC</span> durdur
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
