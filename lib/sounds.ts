// Prosedürel ses efektleri — Web Audio API ile sıfır asset
// Her ses bir oscillator + envelope ile anında üretilir

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      ctx = new AC()
      masterGain = ctx.createGain()
      masterGain.gain.value = 0.55
      masterGain.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(m: boolean) {
  muted = m
  if (masterGain) masterGain.gain.value = m ? 0 : 0.55
}

export function isMuted() {
  return muted
}

function envelope(
  c: AudioContext,
  dest: AudioNode,
  atk: number,
  dec: number,
  peak: number
): GainNode {
  const g = c.createGain()
  g.gain.setValueAtTime(0, c.currentTime)
  g.gain.linearRampToValueAtTime(peak, c.currentTime + atk)
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, peak * 0.001),
    c.currentTime + atk + dec
  )
  g.connect(dest)
  return g
}

function connectMaster(c: AudioContext, src: AudioNode) {
  src.connect(masterGain ?? c.destination)
}

export function playJump() {
  const c = getCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = 'triangle'
  const g = envelope(c, masterGain ?? c.destination, 0.005, 0.18, 0.25)
  osc.connect(g)
  osc.frequency.setValueAtTime(220, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(680, c.currentTime + 0.12)
  osc.start()
  osc.stop(c.currentTime + 0.2)
}

export function playLand(impactVel: number) {
  const c = getCtx()
  if (!c || muted) return
  const strength = Math.min(1, impactVel / 20)
  // Noise burst filtered low
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.15), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 180 + strength * 300
  const g = envelope(
    c,
    masterGain ?? c.destination,
    0.005,
    0.15,
    0.3 + strength * 0.3
  )
  src.connect(filter)
  filter.connect(g)
  src.start()
}

export function playHit() {
  const c = getCtx()
  if (!c || muted) return
  // Slap: short noise + pitched tone
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1200)
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 800
  filter.Q.value = 2
  const g = envelope(c, masterGain ?? c.destination, 0.002, 0.08, 0.45)
  src.connect(filter)
  filter.connect(g)
  src.start()

  // Pitched pop
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(420, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.1)
  const og = envelope(c, masterGain ?? c.destination, 0.001, 0.1, 0.2)
  osc.connect(og)
  osc.start()
  osc.stop(c.currentTime + 0.12)
  void connectMaster
}

export function playPotion(type: 'grow' | 'shrink' | 'speed' | 'slow') {
  const c = getCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = 'sine'
  const g = envelope(c, masterGain ?? c.destination, 0.005, 0.25, 0.2)
  osc.connect(g)
  const freqMap = {
    grow: [400, 800],
    shrink: [800, 400],
    speed: [500, 1200],
    slow: [600, 200],
  } as const
  const [a, b] = freqMap[type]
  osc.frequency.setValueAtTime(a, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(b, c.currentTime + 0.22)
  osc.start()
  osc.stop(c.currentTime + 0.28)

  // Sparkle overlay
  const osc2 = c.createOscillator()
  osc2.type = 'triangle'
  osc2.frequency.value = b * 2
  const g2 = envelope(c, masterGain ?? c.destination, 0.01, 0.15, 0.1)
  osc2.connect(g2)
  osc2.start(c.currentTime + 0.08)
  osc2.stop(c.currentTime + 0.25)
}

export function playLaunch() {
  const c = getCtx()
  if (!c || muted) return
  // Whoosh: filtered noise rising pitch
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.6), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.8
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 2
  filter.frequency.setValueAtTime(300, c.currentTime)
  filter.frequency.exponentialRampToValueAtTime(
    2500,
    c.currentTime + 0.5
  )
  const g = envelope(c, masterGain ?? c.destination, 0.01, 0.55, 0.5)
  src.connect(filter)
  filter.connect(g)
  src.start()
}

export function playKo() {
  const c = getCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = 'square'
  const g = envelope(c, masterGain ?? c.destination, 0.005, 0.35, 0.25)
  osc.connect(g)
  osc.frequency.setValueAtTime(600, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.3)
  osc.start()
  osc.stop(c.currentTime + 0.35)
}

export function playDamage() {
  const c = getCtx()
  if (!c || muted) return
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  const g = envelope(c, masterGain ?? c.destination, 0.002, 0.15, 0.3)
  osc.connect(g)
  osc.frequency.setValueAtTime(180, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.15)
  osc.start()
  osc.stop(c.currentTime + 0.18)
}

// ─── SİLAH SESLERİ ───

// Osuruk sesleri: her seferinde farklı — 20+ varyasyon random params'tan doğar
export function playFart() {
  const c = getCtx()
  if (!c || muted) return

  const baseFreq = 55 + Math.random() * 140 // 55-195 Hz
  const duration = 0.08 + Math.random() * 0.28
  const type: OscillatorType =
    Math.random() > 0.55 ? 'sawtooth' : 'square'
  const pitchMode = Math.floor(Math.random() * 4) // 0: flat, 1: fall, 2: wobble, 3: rise

  const osc = c.createOscillator()
  osc.type = type

  const g = envelope(c, masterGain ?? c.destination, 0.002, duration, 0.28)
  osc.connect(g)
  osc.frequency.setValueAtTime(baseFreq, c.currentTime)

  if (pitchMode === 1) {
    osc.frequency.exponentialRampToValueAtTime(
      baseFreq * 0.45,
      c.currentTime + duration
    )
  } else if (pitchMode === 2) {
    // Wobble: 3-5 pitch points
    const points = 3 + Math.floor(Math.random() * 3)
    for (let i = 1; i <= points; i++) {
      const t = (i / points) * duration
      const f = baseFreq * (0.6 + Math.random() * 0.9)
      osc.frequency.linearRampToValueAtTime(f, c.currentTime + t)
    }
  } else if (pitchMode === 3) {
    osc.frequency.exponentialRampToValueAtTime(
      baseFreq * 1.8,
      c.currentTime + duration
    )
  }

  osc.start()
  osc.stop(c.currentTime + duration + 0.02)

  // İkinci harmonik — yağlı ses
  if (Math.random() > 0.35) {
    const osc2 = c.createOscillator()
    osc2.type = Math.random() > 0.5 ? 'triangle' : 'sawtooth'
    osc2.frequency.value = baseFreq * (1.5 + Math.random() * 2)
    const g2 = envelope(c, masterGain ?? c.destination, 0.003, duration * 0.65, 0.12)
    osc2.connect(g2)
    osc2.start()
    osc2.stop(c.currentTime + duration + 0.02)
  }

  // Noise burst — "pffft" dokusu
  if (Math.random() > 0.4) {
    const bufDur = 0.04 + Math.random() * 0.08
    const buffer = c.createBuffer(1, Math.floor(c.sampleRate * bufDur), c.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.5))
    }
    const src = c.createBufferSource()
    src.buffer = buffer
    const filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 120 + Math.random() * 400
    filter.Q.value = 1.5
    const g3 = envelope(c, masterGain ?? c.destination, 0.002, bufDur, 0.18)
    src.connect(filter)
    filter.connect(g3)
    src.start()
  }
}

// Su tabancası — sürekli "shhhhh" spray
export function playWaterGun() {
  const c = getCtx()
  if (!c || muted) return
  const dur = 0.35
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (0.6 + Math.sin(i * 0.05) * 0.4)
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 2000
  filter.Q.value = 0.5
  const g = envelope(c, masterGain ?? c.destination, 0.02, dur, 0.35)
  src.connect(filter)
  filter.connect(g)
  src.start()

  // Yüksek tiz çizgi — "pssst"
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(3000, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(1500, c.currentTime + dur)
  const og = envelope(c, masterGain ?? c.destination, 0.01, dur, 0.06)
  osc.connect(og)
  osc.start()
  osc.stop(c.currentTime + dur + 0.05)
}

// Elektrik süpürgesi — uğultu
export function playVacuum() {
  const c = getCtx()
  if (!c || muted) return
  const dur = 0.6
  // Heavy low-mid noise
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.8
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(180, c.currentTime)
  filter.frequency.exponentialRampToValueAtTime(400, c.currentTime + dur)
  filter.Q.value = 4
  const g = envelope(c, masterGain ?? c.destination, 0.05, dur, 0.4)
  src.connect(filter)
  filter.connect(g)
  src.start()

  // Motor drone — sine düşük
  const osc = c.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(90, c.currentTime)
  const og = envelope(c, masterGain ?? c.destination, 0.03, dur, 0.18)
  osc.connect(og)
  osc.start()
  osc.stop(c.currentTime + dur + 0.05)
}

// Işınlama silahı — zap elektroniği
export function playTeleportGun() {
  const c = getCtx()
  if (!c || muted) return
  const dur = 0.35
  // Rising sweep
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(200, c.currentTime)
  osc.frequency.exponentialRampToValueAtTime(4000, c.currentTime + dur * 0.7)
  osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + dur)
  const g = envelope(c, masterGain ?? c.destination, 0.005, dur, 0.25)
  osc.connect(g)
  osc.start()
  osc.stop(c.currentTime + dur + 0.05)

  // Sparkle overtone
  const osc2 = c.createOscillator()
  osc2.type = 'triangle'
  osc2.frequency.setValueAtTime(3500, c.currentTime + 0.1)
  osc2.frequency.linearRampToValueAtTime(6000, c.currentTime + dur)
  const g2 = envelope(c, masterGain ?? c.destination, 0.02, dur * 0.7, 0.1)
  osc2.connect(g2)
  osc2.start(c.currentTime + 0.1)
  osc2.stop(c.currentTime + dur + 0.05)
}

// Balon silahı — şişme ıslığı
export function playBalloonGun() {
  const c = getCtx()
  if (!c || muted) return
  const dur = 0.55
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(300, c.currentTime)
  osc.frequency.linearRampToValueAtTime(900, c.currentTime + dur * 0.8)
  osc.frequency.exponentialRampToValueAtTime(1400, c.currentTime + dur)
  const g = envelope(c, masterGain ?? c.destination, 0.03, dur, 0.2)
  osc.connect(g)
  osc.start()
  osc.stop(c.currentTime + dur + 0.05)
}

// ─── Müzik sistemi: geliştirilmiş prosedürel loop ───
// 8 akor progresyon (double chorus), drums, daha neşeli BPM

let musicPlaying = false
let musicStartT = 0
let nextBeatT = 0
let musicLoopId: number | undefined
let musicGain: GainNode | null = null

const BPM = 108
const BEAT = 60 / BPM

type Chord = { root: number; third: number; fifth: number; seventh: number }

// 8 chord progression: C - Am - F - G - Em - Am - Dm - G (ii-V-I hareketi)
const CHORDS: Chord[] = [
  { root: 60, third: 64, fifth: 67, seventh: 71 }, // Cmaj7
  { root: 69, third: 72, fifth: 76, seventh: 79 }, // Am7
  { root: 65, third: 69, fifth: 72, seventh: 76 }, // Fmaj7
  { root: 67, third: 71, fifth: 74, seventh: 77 }, // G7
  { root: 64, third: 67, fifth: 71, seventh: 74 }, // Em7
  { root: 69, third: 72, fifth: 76, seventh: 79 }, // Am7
  { root: 62, third: 65, fifth: 69, seventh: 72 }, // Dm7
  { root: 67, third: 71, fifth: 74, seventh: 77 }, // G7
]

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

function musicEnvelope(
  c: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  type: OscillatorType,
  peakGain: number
) {
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.value = freq

  const g = c.createGain()
  const attack = Math.min(0.05, duration * 0.2)
  const release = Math.min(0.3, duration * 0.4)
  g.gain.setValueAtTime(0, startAt)
  g.gain.linearRampToValueAtTime(peakGain, startAt + attack)
  g.gain.setValueAtTime(peakGain, startAt + duration - release)
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, peakGain * 0.001),
    startAt + duration
  )

  osc.connect(g)
  g.connect(musicGain ?? c.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

function playDrum(
  c: AudioContext,
  kind: 'kick' | 'snare' | 'hihat',
  time: number
) {
  const dest = musicGain ?? c.destination
  if (kind === 'kick') {
    // Düşük sine + kısa noise click
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, time)
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.14)
    const g = c.createGain()
    g.gain.setValueAtTime(0, time)
    g.gain.linearRampToValueAtTime(0.42, time + 0.002)
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.18)
    osc.connect(g)
    g.connect(dest)
    osc.start(time)
    osc.stop(time + 0.2)
  } else if (kind === 'snare') {
    const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.14), c.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 1400)
    }
    const src = c.createBufferSource()
    src.buffer = buffer
    const filter = c.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1800
    filter.Q.value = 1.5
    const g = c.createGain()
    g.gain.setValueAtTime(0, time)
    g.gain.linearRampToValueAtTime(0.25, time + 0.002)
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.14)
    src.connect(filter)
    filter.connect(g)
    g.connect(dest)
    src.start(time)
    // Body thud
    const osc = c.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(220, time)
    osc.frequency.exponentialRampToValueAtTime(160, time + 0.08)
    const og = c.createGain()
    og.gain.setValueAtTime(0, time)
    og.gain.linearRampToValueAtTime(0.12, time + 0.003)
    og.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
    osc.connect(og)
    og.connect(dest)
    osc.start(time)
    osc.stop(time + 0.12)
  } else {
    // hihat
    const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 300)
    }
    const src = c.createBufferSource()
    src.buffer = buffer
    const filter = c.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 6000
    const g = c.createGain()
    g.gain.setValueAtTime(0, time)
    g.gain.linearRampToValueAtTime(0.08, time + 0.001)
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05)
    src.connect(filter)
    filter.connect(g)
    g.connect(dest)
    src.start(time)
  }
}

function scheduleBeat(beatIndex: number, time: number) {
  const c = getCtx()
  if (!c) return

  // 8 chord progression, 4 beats per chord = 32 beats total loop
  const chordIdx = Math.floor(beatIndex / 4) % CHORDS.length
  const chord = CHORDS[chordIdx]
  const beatInChord = beatIndex % 4
  const totalBar = Math.floor(beatIndex / 4)

  // Bass — root on beat 1, fifth on beat 3 (walking bass)
  if (beatInChord === 0) {
    musicEnvelope(
      c,
      midiToFreq(chord.root - 12),
      time,
      BEAT * 1.8,
      'sine',
      0.16
    )
  } else if (beatInChord === 2) {
    musicEnvelope(
      c,
      midiToFreq(chord.fifth - 12),
      time,
      BEAT * 1.8,
      'sine',
      0.14
    )
  }

  // Pad — full chord on beat 1 of each bar
  if (beatInChord === 0) {
    musicEnvelope(c, midiToFreq(chord.root), time, BEAT * 4, 'sine', 0.035)
    musicEnvelope(c, midiToFreq(chord.third), time, BEAT * 4, 'sine', 0.03)
    musicEnvelope(c, midiToFreq(chord.fifth), time, BEAT * 4, 'sine', 0.03)
  }

  // Drums
  // Kick on 1 & 3
  if (beatInChord === 0 || beatInChord === 2) playDrum(c, 'kick', time)
  // Snare on 2 & 4 (backbeat)
  if (beatInChord === 1 || beatInChord === 3) playDrum(c, 'snare', time)
  // Hi-hat on all 8th notes
  playDrum(c, 'hihat', time)
  playDrum(c, 'hihat', time + BEAT * 0.5)

  // Melody — pentatonic with pattern variation
  // Notes: chord + pentatonic scale tones above
  const pentatonic = [
    chord.root + 12,
    chord.third + 12,
    chord.fifth + 12,
    chord.seventh + 12,
    chord.root + 19, // octave + fifth
  ]
  const rhythmSeed = pseudoRand(beatIndex * 31 + totalBar * 7)
  // Every other beat, play a melody note
  if (beatInChord === 1 || beatInChord === 3 || rhythmSeed > 0.7) {
    const noteIdx = Math.floor(pseudoRand(beatIndex * 13 + 5) * pentatonic.length)
    const note = pentatonic[noteIdx]
    musicEnvelope(c, midiToFreq(note), time, BEAT * 0.9, 'triangle', 0.06)
  }

  // Sparkle decoration every 8 bars
  if (beatIndex % 32 === 20) {
    musicEnvelope(
      c,
      midiToFreq(chord.root + 24),
      time,
      BEAT * 1.5,
      'sine',
      0.035
    )
  }

  // Transition flair: on last bar of progression, extra snare flurry
  if (beatIndex % 32 === 30) {
    playDrum(c, 'snare', time + BEAT * 0.25)
    playDrum(c, 'snare', time + BEAT * 0.5)
    playDrum(c, 'snare', time + BEAT * 0.75)
  }
}

function pseudoRand(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function musicTick() {
  if (!musicPlaying) return
  const c = getCtx()
  if (!c) return
  while (nextBeatT < c.currentTime + 0.3) {
    const beatIndex = Math.round((nextBeatT - musicStartT) / BEAT)
    scheduleBeat(beatIndex, nextBeatT)
    nextBeatT += BEAT
  }
  musicLoopId = window.setTimeout(musicTick, 60)
}

export function startMusic() {
  if (musicPlaying) return
  const c = getCtx()
  if (!c) return
  if (!musicGain) {
    musicGain = c.createGain()
    // Silah ses efektleri öne çıksın diye müzik kısıldı
    musicGain.gain.value = 0.3
    musicGain.connect(masterGain ?? c.destination)
  }
  musicPlaying = true
  musicStartT = c.currentTime + 0.15
  nextBeatT = musicStartT
  musicTick()
}

export function stopMusic() {
  musicPlaying = false
  if (musicLoopId !== undefined) {
    clearTimeout(musicLoopId)
    musicLoopId = undefined
  }
}

export function setMusicEnabled(on: boolean) {
  if (!musicGain) return
  musicGain.gain.value = on ? 0.3 : 0
}

let musicEnabledFlag = true
export function toggleMusic() {
  musicEnabledFlag = !musicEnabledFlag
  setMusicEnabled(musicEnabledFlag)
  return musicEnabledFlag
}

export function isMusicEnabled() {
  return musicEnabledFlag
}

// ─── Ambient: rüzgar loop ───
let ambientGain: GainNode | null = null
let ambientStarted = false

export function startAmbient() {
  const c = getCtx()
  if (!c || ambientStarted) return
  ambientStarted = true
  // Looping noise buffer (2sn, seamless fade-in/out)
  const bufSec = 2
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * bufSec), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    // Brown noise — düşük frekans ağırlıklı
    data[i] =
      (Math.random() * 2 - 1) *
      (1 - Math.abs((i - data.length / 2) / (data.length / 2)) * 0.3)
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  src.loop = true

  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 380

  const filter2 = c.createBiquadFilter()
  filter2.type = 'highpass'
  filter2.frequency.value = 80

  ambientGain = c.createGain()
  ambientGain.gain.value = 0.08

  // Hafif volume modülasyonu (rüzgar dalgaları)
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.12
  const lfoGain = c.createGain()
  lfoGain.gain.value = 0.04
  lfo.connect(lfoGain)
  lfoGain.connect(ambientGain.gain)
  lfo.start()

  src.connect(filter)
  filter.connect(filter2)
  filter2.connect(ambientGain)
  ambientGain.connect(masterGain ?? c.destination)
  src.start()
}

export function setAmbientEnabled(on: boolean) {
  if (!ambientGain) return
  ambientGain.gain.value = on ? 0.08 : 0
}
