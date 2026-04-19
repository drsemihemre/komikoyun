'use client'

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import type { DirectionalLight, AmbientLight } from 'three'

type Props = {
  dirLightRef: React.RefObject<DirectionalLight | null>
  ambientRef: React.RefObject<AmbientLight | null>
}

// Hızlandırılmış döngü: 24 gerçek dakika = 1 oyun günü (24 oyun saati)
// Gündüz 18 dakika, gece 6 dakika (18 oyun saati gündüz, 6 oyun saati gece)
// Gündüz: 03:00 - 21:00 (18 saat)
// Gece: 21:00 - 03:00 (6 saat)
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
  return (((startHour + elapsedMin) % 24) + 24) % 24
}

const DAY_START = 3
const DAY_END = 21
const DAY_HOURS = DAY_END - DAY_START // 18

function sunPositionFromGameTime(): [number, number, number] {
  const h = currentGameHour()
  let angle: number
  if (h >= DAY_START && h <= DAY_END) {
    const progress = (h - DAY_START) / DAY_HOURS
    angle = progress * Math.PI
  } else {
    const nightH = h < DAY_START ? h + (24 - DAY_END) : h - DAY_END
    const progress = nightH / (24 - DAY_HOURS) // 6 hours
    angle = Math.PI + progress * Math.PI
  }
  const sunX = Math.cos(angle) * 80
  const sunY = Math.sin(angle) * 80
  return [sunX, sunY, 30]
}

// Ezan — gün doğumu ve gün batımında bir kere oynar
function playEzan() {
  if (typeof window === 'undefined') return
  if (!window.speechSynthesis) return
  try {
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance('Allahu ekber, Allahu ekber')
    utt.lang = 'ar-SA'
    utt.rate = 0.6
    utt.pitch = 0.85
    utt.volume = 0.9
    window.speechSynthesis.speak(utt)
  } catch {
    // ignore
  }
}

export default function DayNightCycle({ dirLightRef, ambientRef }: Props) {
  const [sunPos, setSunPos] = useState<[number, number, number]>(() =>
    sunPositionFromGameTime()
  )
  const [gameHour, setGameHour] = useState(() => currentGameHour())
  const lastHour = useRef<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      const h = currentGameHour()
      // Sunrise / sunset detection (saat crossing)
      if (lastHour.current !== null) {
        // Gün batımı: 21. saat'i geçti
        const wasBeforeSunset =
          lastHour.current < DAY_END && h >= DAY_END && h < DAY_END + 1
        // Gün doğumu: 3. saat'i geçti
        const crossedSunrise =
          lastHour.current < DAY_START &&
          h >= DAY_START &&
          h < DAY_START + 1
        if (wasBeforeSunset || crossedSunrise) {
          playEzan()
        }
      }
      lastHour.current = h
      setSunPos(sunPositionFromGameTime())
      setGameHour(h)
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
      <GameClock gameHour={gameHour} />
    </>
  )
}

let lastGameHour = 10
export function getGameHour() {
  return lastGameHour
}

function GameClock({ gameHour }: { gameHour: number }) {
  lastGameHour = gameHour
  return null
}
