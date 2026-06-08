'use client'

import {
  EffectComposer,
  Bloom,
  Vignette,
  SMAA,
  SSAO,
  ToneMapping,
  HueSaturation,
} from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Environment } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store'
import { getGameHour } from './DayNightCycle'

// ═══════════════════════════════════════════════════════════════
//   GRAFIK PIPELINE — kalite + akıcılık dengesi
// ─────────────────────────────────────────────────────────────
//   low:    HDRI IBL + SMAA (en hafif)
//   medium: + SSAO (8 örnek) + Bloom + Vignette
//   high:   + SSAO (12 örnek) + Bloom + ACES + doygunluk + Vignette
//   NOT: Canvas antialias kapalı (SMAA zaten AA sağlıyor — çift AA yok).
//   DOF / ChromaticAberration / Noise kaldırıldı (en pahalı geçişler;
//   hızlı 3.şahıs oyunda görseli bulanıklaştırıyor + kasma yapıyordu).
// ═══════════════════════════════════════════════════════════════

export default function GraphicsFx() {
  const level = useGameStore((s) => s.graphicsLevel)
  const [hour, setHour] = useState(() => getGameHour())

  useEffect(() => {
    const id = setInterval(() => setHour(getGameHour()), 3000)
    return () => clearInterval(id)
  }, [])

  // Saate göre HDRI preset
  const preset: 'night' | 'sunset' | 'park' | 'dawn' =
    hour < 5
      ? 'night'
      : hour < 7
        ? 'dawn'
        : hour >= 21
          ? 'night'
          : hour >= 19
            ? 'sunset'
            : 'park'

  if (level === 'low') {
    return (
      <>
        <Environment preset={preset} background={false} environmentIntensity={0.6} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <SMAA />
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.65}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
        </EffectComposer>
      </>
    )
  }

  if (level === 'medium') {
    return (
      <>
        <Environment preset={preset} background={false} environmentIntensity={0.85} />
        <EffectComposer multisampling={0} enableNormalPass>
          <SMAA />
          <SSAO
            blendFunction={BlendFunction.MULTIPLY}
            samples={8}
            radius={0.08}
            intensity={18}
            luminanceInfluence={0.5}
            worldDistanceThreshold={50}
            worldDistanceFalloff={10}
            worldProximityThreshold={10}
            worldProximityFalloff={2}
          />
          <Bloom
            intensity={0.65}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={0.5} />
        </EffectComposer>
      </>
    )
  }

  // HIGH — zengin ama akıcı pipeline (6 geçiş)
  return (
    <>
      <Environment preset={preset} background={false} environmentIntensity={1.0} />
      <EffectComposer multisampling={0} enableNormalPass>
        <SMAA />
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={12}
          radius={0.1}
          intensity={26}
          luminanceInfluence={0.6}
          worldDistanceThreshold={60}
          worldDistanceFalloff={12}
          worldProximityThreshold={12}
          worldProximityFalloff={3}
        />
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.75}
        />
        <HueSaturation hue={0} saturation={0.14} />
        <ToneMapping
          mode={ToneMappingMode.ACES_FILMIC}
          averageLuminance={1.0}
          adaptationRate={1.0}
          maxLuminance={16.0}
        />
        <Vignette eskil={false} offset={0.25} darkness={0.5} />
      </EffectComposer>
    </>
  )
}
