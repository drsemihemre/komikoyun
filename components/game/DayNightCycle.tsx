'use client'

import { useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import type { DirectionalLight, AmbientLight } from 'three'

type Props = {
  dirLightRef: React.RefObject<DirectionalLight | null>
  ambientRef: React.RefObject<AmbientLight | null>
}

// Hızlandırılmış döngü: 24 gerçek dakika = 1 oyun günü (24 saat)
// Başlangıç oyun saati = o anki yerel saat, sonra 60× hızla ilerle
let mountedAtMs: number | null = null
let startHour = 10

function ensureMounted() {
  if (mountedAtMs === null) {
    mountedAtMs = Date.now()
    const now = new Date()
    startHour = now.getHours() + now.getMinutes() / 60
  }
}

function currentGameHour(): number {
  ensureMounted()
  const elapsedMin = (Date.now() - (mountedAtMs ?? 0)) / 60000
  // 1 gerçek dakika = 1 oyun saati
  return ((startHour + elapsedMin) % 24 + 24) % 24
}

function sunPositionFromGameTime(): [number, number, number] {
  const h = currentGameHour()
  let angle: number
  if (h >= 6 && h <= 20) {
    const progress = (h - 6) / 14
    angle = progress * Math.PI
  } else {
    const nightH = h < 6 ? h + 4 : h - 20
    const progress = nightH / 10
    angle = Math.PI + progress * Math.PI
  }
  const sunX = Math.cos(angle) * 80
  const sunY = Math.sin(angle) * 80
  return [sunX, sunY, 30]
}

export default function DayNightCycle({ dirLightRef, ambientRef }: Props) {
  const [sunPos, setSunPos] = useState<[number, number, number]>(() =>
    sunPositionFromGameTime()
  )
  const [gameHour, setGameHour] = useState(() => currentGameHour())

  useEffect(() => {
    const id = setInterval(() => {
      setSunPos(sunPositionFromGameTime())
      setGameHour(currentGameHour())
    }, 1500)
    return () => clearInterval(id)
  }, [])

  useFrame(() => {
    const dir = dirLightRef.current
    const amb = ambientRef.current
    if (!dir || !amb) return
    const sunY = sunPos[1]
    const altitude = sunY / 80
    const daylight = Math.max(0, altitude)
    const isNight = altitude < -0.1

    if (isNight) {
      dir.color.setRGB(0.55, 0.65, 0.9)
      dir.intensity = 0.25
      amb.color.setRGB(0.35, 0.4, 0.6)
      amb.intensity = 0.3
    } else if (altitude < 0.2) {
      dir.color.setRGB(1, 0.75, 0.5)
      dir.intensity = daylight * 1.3 + 0.3
      amb.color.setRGB(1, 0.82, 0.7)
      amb.intensity = 0.35 + daylight * 0.5
    } else {
      dir.color.setRGB(1, 0.98, 0.93)
      dir.intensity = daylight * 1.3 + 0.1
      amb.color.setRGB(1, 1, 1)
      amb.intensity = 0.3 + daylight * 0.6
    }
  })

  const sunAlt = sunPos[1] / 80
  const isNight = sunAlt < -0.1

  return (
    <>
      <Sky
        sunPosition={sunPos}
        turbidity={isNight ? 10 : 2}
        rayleigh={isNight ? 0.1 : 0.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      {isNight && (
        <Stars
          radius={140}
          depth={60}
          count={1500}
          factor={5}
          saturation={0}
          fade
          speed={0.3}
        />
      )}
      {/* Game hour export to other components (Mosque etc.) */}
      <GameClock gameHour={gameHour} />
    </>
  )
}

// Oyun saati'ni tüm dünyaya yayın — mosque, NPC'ler vs. kullanabilir
let lastGameHour = 10
export function getGameHour() {
  return lastGameHour
}

function GameClock({ gameHour }: { gameHour: number }) {
  lastGameHour = gameHour
  return null
}
