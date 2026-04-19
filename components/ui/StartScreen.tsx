'use client'

import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store'
import { startMusic } from '@/lib/sounds'
import { loadNickname, saveNickname } from '@/lib/nickname'
import { connect } from '@/lib/multiplayer'

const BODY_COLORS = [
  '#ef476f',
  '#06d6a0',
  '#118ab2',
  '#ffd166',
  '#c77dff',
  '#f4a261',
  '#fb5607',
  '#8338ec',
]

const HAT_KINDS = [
  { id: 'none', label: '— Yok —' },
  { id: 'cone', label: '🧙 Sihirbaz' },
  { id: 'cylinder', label: '🎩 Silindir' },
  { id: 'crown', label: '👑 Taç' },
  { id: 'beanie', label: '🧢 Bere' },
] as const

export default function StartScreen() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const setGameStarted = useGameStore((s) => s.setGameStarted)
  const isMobile = useGameStore((s) => s.isMobile)
  const highScore = useGameStore((s) => s.highScore)
  const skin = useGameStore((s) => s.skin)
  const setSkin = useGameStore((s) => s.setSkin)
  const [nickname, setNickname] = useState('')

  useEffect(() => {
    setNickname(loadNickname())
  }, [])

  if (gameStarted) return null

  const onStart = () => {
    const final =
      nickname.trim().slice(0, 20) ||
      `Oyuncu${Math.floor(Math.random() * 1000)}`
    saveNickname(final)
    startMusic()
    connect(final, 'public', {
      bodyColor: skin.bodyColor,
      hatKind: skin.hatKind,
      hatColor: skin.hatColor,
    })
    setGameStarted(true)
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center overflow-auto bg-gradient-to-b from-sky-400/70 via-sky-500/60 to-indigo-700/70 backdrop-blur-sm">
      <div className="my-4 flex max-h-full flex-col items-center overflow-auto rounded-3xl bg-white/15 px-6 py-8 shadow-2xl backdrop-blur-lg md:px-12 md:py-10">
        <div className="text-5xl md:text-7xl">🤸</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white drop-shadow-lg md:text-6xl">
          KOMİK OYUN
        </h1>
        <div className="mt-1 text-sm font-semibold text-white/90">
          Ragdoll fizik · 🎮 Multiplayer
        </div>

        {highScore > 0 && (
          <div className="mt-3 rounded-full bg-yellow-400/90 px-4 py-1 text-xs font-bold text-yellow-900 shadow">
            🏆 En Yüksek: {highScore}
          </div>
        )}

        <div className="mt-4 flex flex-col items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-white/80">
            Takma Adın
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Ör. Mehmet"
            maxLength={20}
            className="w-64 rounded-xl border-2 border-white/40 bg-white/90 px-4 py-2 text-center text-lg font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-yellow-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') onStart()
            }}
          />
        </div>

        {/* Skin picker */}
        <div className="mt-4 w-full max-w-md">
          <label className="mb-1 block text-center text-xs font-semibold uppercase tracking-wide text-white/80">
            Renk
          </label>
          <div className="flex flex-wrap justify-center gap-2">
            {BODY_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setSkin({ bodyColor: c })}
                onTouchStart={(e) => {
                  e.preventDefault()
                  setSkin({ bodyColor: c })
                }}
                className={`h-9 w-9 rounded-full border-4 transition-transform active:scale-95 ${
                  skin.bodyColor === c
                    ? 'border-white ring-2 ring-white/80 scale-110'
                    : 'border-white/30'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <label className="mb-1 mt-4 block text-center text-xs font-semibold uppercase tracking-wide text-white/80">
            Şapka
          </label>
          <div className="flex flex-wrap justify-center gap-2">
            {HAT_KINDS.map((h) => (
              <button
                key={h.id}
                onClick={() => setSkin({ hatKind: h.id })}
                onTouchStart={(e) => {
                  e.preventDefault()
                  setSkin({ hatKind: h.id })
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
                  skin.hatKind === h.id
                    ? 'bg-white text-slate-900'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          {skin.hatKind !== 'none' && (
            <>
              <label className="mb-1 mt-3 block text-center text-xs font-semibold uppercase tracking-wide text-white/80">
                Şapka Rengi
              </label>
              <div className="flex flex-wrap justify-center gap-2">
                {BODY_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSkin({ hatColor: c })}
                    onTouchStart={(e) => {
                      e.preventDefault()
                      setSkin({ hatColor: c })
                    }}
                    className={`h-7 w-7 rounded-full border-2 transition-transform active:scale-95 ${
                      skin.hatColor === c
                        ? 'border-white ring-2 ring-white/80 scale-110'
                        : 'border-white/30'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onStart}
          onTouchStart={(e) => {
            e.preventDefault()
            onStart()
          }}
          className="mt-5 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 px-12 py-4 text-2xl font-black text-white shadow-2xl transition hover:scale-105 hover:from-orange-300 hover:to-pink-400 active:scale-95 md:text-3xl"
        >
          ▶ BAŞLA
        </button>

        <div className="mt-4 text-center text-[11px] text-white/70 md:text-xs">
          {isMobile ? (
            <>
              <div>📱 Joystick · ⬇️ Eğil · Butonlarla vur/zıpla</div>
              <div className="mt-0.5">Dükkanlara yaklaş → E</div>
            </>
          ) : (
            <>
              <div>
                <b>WASD</b> yürü · <b>Space</b> zıpla · <b>Shift</b> eğil ·{' '}
                <b>F/Q</b> yumruk · <b>R</b> silah
              </div>
              <div className="mt-0.5">
                <b>E</b> dükkan · <b>X</b> silah değiş · <b>V</b> kamera ·{' '}
                <b>1-4</b> iksir · <b>T</b> ışınlan
              </div>
              <div className="mt-1 opacity-60">
                Ezan: &quot;Adhan wiki&quot; by Jarih · CC BY-SA 3.0
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
