'use client'

import { useEffect, useState } from 'react'
import { useGameStore, PLAYER_HP_MAX } from '@/lib/store'
import { setMuted, isMuted, toggleMusic, isMusicEnabled } from '@/lib/sounds'
import { WEAPONS, getWeapon } from '@/lib/weapons'
import {
  isConnected as isMPConnected,
  subscribeMP,
  getRemotes,
  getLeaderboard,
  type LeaderboardEntry,
} from '@/lib/multiplayer'
import { loadNickname } from '@/lib/nickname'

export default function HUD() {
  const isMobile = useGameStore((s) => s.isMobile)
  const hitCount = useGameStore((s) => s.hitCount)
  const koCount = useGameStore((s) => s.koCount)
  const score = useGameStore((s) => s.score)
  const highScore = useGameStore((s) => s.highScore)
  const playerHP = useGameStore((s) => s.playerHP)
  const cameraMode = useGameStore((s) => s.cameraMode)
  const toggleCamera = useGameStore((s) => s.toggleCamera)
  const togglePause = useGameStore((s) => s.togglePause)
  const gameStarted = useGameStore((s) => s.gameStarted)
  const jumpBoostUntil = useGameStore((s) => s.jumpBoostUntil)
  const teleportCharges = useGameStore((s) => s.teleportCharges)
  const currentWeapon = useGameStore((s) => s.currentWeapon)
  const cycleWeapon = useGameStore((s) => s.cycleWeapon)

  const [pointerLocked, setPointerLocked] = useState(false)
  const [muted, setMutedLocal] = useState(false)
  const [musicOn, setMusicOn] = useState(true)
  const [showCongrats, setShowCongrats] = useState(false)
  const [lastHighCheck, setLastHighCheck] = useState(0)
  const [jumpBoostLeft, setJumpBoostLeft] = useState(0)
  const [mpConnected, setMpConnected] = useState(false)
  const [mpPeers, setMpPeers] = useState(0)
  const [nickname, setNickname] = useState('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    setNickname(loadNickname())
    const update = () => {
      setMpConnected(isMPConnected())
      setMpPeers(getRemotes().length)
      setLeaderboard(getLeaderboard())
    }
    update()
    return subscribeMP(update)
  }, [])

  // Jump boost timer tick
  useEffect(() => {
    const id = setInterval(() => {
      const nowS = performance.now() / 1000
      const left = Math.max(0, jumpBoostUntil - nowS)
      setJumpBoostLeft(left)
    }, 250)
    return () => clearInterval(id)
  }, [jumpBoostUntil])

  useEffect(() => {
    const onChange = () => setPointerLocked(!!document.pointerLockElement)
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  useEffect(() => {
    setMutedLocal(isMuted())
    setMusicOn(isMusicEnabled())
  }, [])

  // Yeni high score!
  useEffect(() => {
    if (
      score > 0 &&
      score === highScore &&
      score > lastHighCheck &&
      score - lastHighCheck >= 20
    ) {
      setShowCongrats(true)
      setLastHighCheck(score)
      const t = setTimeout(() => setShowCongrats(false), 2000)
      return () => clearTimeout(t)
    }
  }, [score, highScore, lastHighCheck])

  const hpPct = Math.max(0, Math.min(100, (playerHP / PLAYER_HP_MAX) * 100))
  const hpColor =
    hpPct > 60
      ? 'from-emerald-400 to-green-600'
      : hpPct > 30
        ? 'from-yellow-400 to-orange-500'
        : 'from-red-500 to-rose-700'

  const isNewHigh = score > 0 && score === highScore

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

  const onMusicToggle = () => {
    const on = toggleMusic()
    setMusicOn(on)
  }

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {!isMobile && (
        <div className="absolute left-4 top-4 rounded-xl bg-black/40 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="text-lg font-black tracking-wide">KOMİK OYUN</div>
          <div className="mt-1 flex items-center gap-2 text-xs opacity-80">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                mpConnected ? 'bg-green-400' : 'bg-red-400'
              }`}
              title={mpConnected ? 'Online' : 'Offline'}
            />
            <span>{nickname || 'Oyuncu'}</span>
            {mpConnected && (
              <span className="opacity-60">· {mpPeers} oyuncu</span>
            )}
          </div>
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

      {/* Surprise potion effects */}
      {(jumpBoostLeft > 0 || teleportCharges > 0) && (
        <div
          className={`absolute ${isMobile ? 'left-4 top-[88px]' : 'left-4 top-[104px]'} flex w-48 flex-col gap-1 rounded-xl bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur-sm`}
        >
          {jumpBoostLeft > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-base">⬆️</span>
              <span className="flex-1">Zıplama ×1.9</span>
              <span className="tabular-nums text-green-300">
                {jumpBoostLeft.toFixed(1)}s
              </span>
            </div>
          )}
          {teleportCharges > 0 && (
            <button
              onClick={() => {
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'T' })
                )
              }}
              onTouchStart={(e) => {
                e.preventDefault()
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'T' })
                )
              }}
              className="pointer-events-auto flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500/60 to-fuchsia-500/60 px-2 py-1 text-xs font-bold text-white transition active:scale-95"
            >
              <span className="text-base">✨</span>
              <span className="flex-1 text-left">
                Işınlan{' '}
                {!isMobile && (
                  <span className="opacity-60 font-normal">(T)</span>
                )}
              </span>
              <span className="tabular-nums text-purple-100">
                ×{teleportCharges}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Score + high score + buttons (top right) */}
      <div className="absolute right-4 top-4 flex items-start gap-2">
        <div className="flex flex-col rounded-xl bg-black/40 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌟</span>
            <span
              className={`text-2xl font-black tabular-nums ${isNewHigh ? 'text-yellow-300' : ''}`}
            >
              {score}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3 text-[11px] opacity-80">
            <div className="flex gap-3">
              <span>👊 {hitCount}</span>
              <span>💥 {koCount}</span>
            </div>
            <span className="text-yellow-300 font-semibold">
              🏆 {highScore}
            </span>
          </div>
        </div>
        <button
          onClick={onCameraToggle}
          onTouchStart={(e) => {
            e.preventDefault()
            onCameraToggle()
          }}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-xl text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
          title={cameraMode === 'third' ? 'FPV' : '3. şahıs'}
        >
          {cameraMode === 'third' ? '👁️' : '🎥'}
        </button>
        <button
          onClick={onMusicToggle}
          onTouchStart={(e) => {
            e.preventDefault()
            onMusicToggle()
          }}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-xl text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
          title={musicOn ? 'Müzik kapat' : 'Müzik aç'}
        >
          {musicOn ? '🎵' : '🎶'}
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
        {gameStarted && (
          <button
            onClick={() => togglePause()}
            onTouchStart={(e) => {
              e.preventDefault()
              togglePause()
            }}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-xl text-white shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
            title="Duraklat"
          >
            ⏸️
          </button>
        )}
      </div>

      {/* Leaderboard — sağ alt, desktop only */}
      {!isMobile && mpConnected && leaderboard.length > 0 && (
        <div className="absolute bottom-24 right-4 w-48 rounded-xl bg-black/50 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
          <div className="mb-1 flex items-center gap-1 text-xs font-bold opacity-80">
            🏆 Liderlik
          </div>
          <div className="space-y-0.5">
            {leaderboard.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-xs tabular-nums"
              >
                <span className="w-4 opacity-60">{i + 1}.</span>
                <span className="flex-1 truncate font-semibold">
                  {p.nickname}
                </span>
                <span className="font-bold text-yellow-300">{p.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current weapon badge — bottom center */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl bg-black/50 px-4 py-2 text-white shadow-xl backdrop-blur-sm">
        <button
          onClick={() => cycleWeapon()}
          onTouchStart={(e) => {
            e.preventDefault()
            cycleWeapon()
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg transition hover:bg-white/20 active:scale-95"
          title="Silah değiştir (X)"
        >
          🔄
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{getWeapon(currentWeapon).emoji}</span>
            <span className="text-sm font-bold">
              {getWeapon(currentWeapon).name}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] opacity-60">
            {WEAPONS.findIndex((w) => w.id === currentWeapon) + 1} /{' '}
            {WEAPONS.length}
            {!isMobile && (
              <span className="ml-2">X=döngü · R=ateşle</span>
            )}
          </div>
        </div>
      </div>

      {/* New high score toast */}
      {showCongrats && (
        <div className="pointer-events-none absolute left-1/2 top-32 -translate-x-1/2 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-center text-white shadow-2xl animate-pulse">
          <div className="text-xl font-black">🏆 YENİ REKOR!</div>
          <div className="text-sm font-bold">{score} puan</div>
        </div>
      )}

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
            F / Q — Yumruk 👊 · R — Silah 🔫
            <br />
            X — Silah değiştir · V — Kamera
            <br />
            1-4 — İksir · T — Işınlan
          </div>
        </div>
      )}
    </div>
  )
}
