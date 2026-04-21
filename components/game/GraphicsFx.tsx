'use client'

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Environment } from '@react-three/drei'
import { useGameStore } from '@/lib/store'
import { getGameHour } from './DayNightCycle'
import { useEffect, useState } from 'react'

// Grafik seviyelerine göre efekt paketi
// low: sadece Sky (mevcut)
// medium: Sky + çevresel HDRI aydınlatma (yansıma için)
// high: Sky + HDRI + Bloom + Vignette post-processing

export default function GraphicsFx() {
  const level = useGameStore((s) => s.graphicsLevel)
  const [hour, setHour] = useState(() => getGameHour())

  useEffect(() => {
    const id = setInterval(() => setHour(getGameHour()), 3000)
    return () => clearInterval(id)
  }, [])

  if (level === 'low') return null

  // Saate göre HDRI preset — gece "night", alacakaranlık "sunset", gündüz "park"
  const preset: 'night' | 'sunset' | 'park' =
    hour < 5 || hour > 21 ? 'night' : hour < 7 || hour > 19 ? 'sunset' : 'park'

  return (
    <>
      <Environment preset={preset} background={false} />
      {level === 'high' && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.45} />
        </EffectComposer>
      )}
    </>
  )
}
