'use client'

import { useEffect } from 'react'
import { useGameStore } from '@/lib/store'
import { WEAPONS, upgradeCostFor, tierMultiplier } from '@/lib/weapons'

export default function ShopModal() {
  const shopOpen = useGameStore((s) => s.shopOpen)
  const openShop = useGameStore((s) => s.openShop)
  const unlockedWeapons = useGameStore((s) => s.unlockedWeapons)
  const weaponLevels = useGameStore((s) => s.weaponLevels)
  const score = useGameStore((s) => s.score)
  const buyWeapon = useGameStore((s) => s.buyWeapon)
  const upgradeWeapon = useGameStore((s) => s.upgradeWeapon)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && shopOpen) {
        e.preventDefault()
        openShop(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shopOpen, openShop])

  if (!shopOpen) return null

  const isBuy = shopOpen === 'buy'
  const title = isBuy ? '🔫 Silah Dükkanı' : '⚡ Silah Güçlendirme'

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[min(560px,94vw)] rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">{title}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-white/80">
              <span className="text-xl">🌟</span>
              <span className="font-bold tabular-nums text-yellow-300">
                {score}
              </span>
              <span>puan</span>
            </div>
          </div>
          <button
            onClick={() => openShop(null)}
            onTouchStart={(e) => {
              e.preventDefault()
              openShop(null)
            }}
            className="rounded-lg bg-white/10 px-3 py-1 text-white hover:bg-white/20 active:scale-95"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {WEAPONS.filter((w) => w.id !== 'fist' || !isBuy).map((w) => {
            const owned = unlockedWeapons.includes(w.id)
            const tier = weaponLevels[w.id] ?? 1
            const atMax = tier >= w.maxTier

            if (isBuy) {
              // BUY mode
              const canBuy = !owned && score >= w.price
              return (
                <div
                  key={w.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                    owned ? 'bg-emerald-900/40' : 'bg-white/5'
                  }`}
                >
                  <div className="text-4xl">{w.emoji}</div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-white">{w.name}</div>
                    <div className="text-xs text-white/60">
                      Menzil {w.range}m · Cooldown {w.cooldown}s
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    {owned ? (
                      <span className="rounded-lg bg-emerald-500 px-3 py-1 text-sm font-bold text-white">
                        ✓ Sahip
                      </span>
                    ) : (
                      <>
                        <div className="text-sm font-bold text-yellow-300">
                          🌟 {w.price}
                        </div>
                        <button
                          onClick={() => buyWeapon(w.id)}
                          onTouchStart={(e) => {
                            e.preventDefault()
                            buyWeapon(w.id)
                          }}
                          disabled={!canBuy}
                          className={`mt-1 rounded-lg px-4 py-1 text-sm font-bold transition ${
                            canBuy
                              ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:scale-105 active:scale-95'
                              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          Satın Al
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            }

            // UPGRADE mode — only show owned
            if (!owned) {
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 opacity-50"
                >
                  <div className="text-4xl grayscale">{w.emoji}</div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-white/70">
                      {w.name}
                    </div>
                    <div className="text-xs text-white/50">
                      🔒 Önce silah dükkanından satın al
                    </div>
                  </div>
                </div>
              )
            }
            const cost = atMax ? Infinity : upgradeCostFor(tier)
            const canUpgrade = !atMax && score >= cost
            const dmg = tierMultiplier(tier)
            const nextDmg = atMax ? dmg : tierMultiplier(tier + 1)
            return (
              <div
                key={w.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
              >
                <div className="text-4xl">{w.emoji}</div>
                <div className="flex-1">
                  <div className="text-lg font-bold text-white">
                    {w.name}{' '}
                    <span className="text-yellow-300">Tier {tier}</span>
                  </div>
                  <div className="text-xs text-white/60">
                    Hasar ×{dmg.toFixed(2)}
                    {!atMax && (
                      <>
                        {' → '}
                        <span className="text-green-300">
                          ×{nextDmg.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  {atMax ? (
                    <span className="rounded-lg bg-purple-500 px-3 py-1 text-sm font-bold text-white">
                      ⭐ Max
                    </span>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-yellow-300">
                        🌟 {cost}
                      </div>
                      <button
                        onClick={() => upgradeWeapon(w.id)}
                        onTouchStart={(e) => {
                          e.preventDefault()
                          upgradeWeapon(w.id)
                        }}
                        disabled={!canUpgrade}
                        className={`mt-1 rounded-lg px-4 py-1 text-sm font-bold transition ${
                          canUpgrade
                            ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:scale-105 active:scale-95'
                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Yükselt
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 text-center text-xs text-white/50">
          ESC ile kapat
        </div>
      </div>
    </div>
  )
}
