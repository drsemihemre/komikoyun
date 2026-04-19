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

// ─── Müzik sistemi: prosedürel ambient loop ───
// Basit 4-akor progresyonu: C-G-Am-F (dört doğallı, pozitif his)
// Her akor 8 vuruş (yaklaşık 5sn), toplam loop 32 vuruş

let musicPlaying = false
let musicStartT = 0
let nextBeatT = 0
let musicLoopId: number | undefined
let musicGain: GainNode | null = null

const BPM = 84
const BEAT = 60 / BPM

type Chord = { root: number; third: number; fifth: number; seventh: number }

const CHORDS: Chord[] = [
  { root: 60, third: 64, fifth: 67, seventh: 71 }, // Cmaj7
  { root: 67, third: 71, fifth: 74, seventh: 77 }, // Gmaj7
  { root: 69, third: 72, fifth: 76, seventh: 79 }, // Amin7
  { root: 65, third: 69, fifth: 72, seventh: 76 }, // Fmaj7
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

function scheduleBeat(beatIndex: number, time: number) {
  const c = getCtx()
  if (!c) return

  const chordIdx = Math.floor(beatIndex / 8) % CHORDS.length
  const chord = CHORDS[chordIdx]
  const beatInChord = beatIndex % 8

  // Bass — kökü her 4 vuruşta
  if (beatInChord === 0 || beatInChord === 4) {
    musicEnvelope(
      c,
      midiToFreq(chord.root - 12),
      time,
      BEAT * 3.5,
      'sine',
      0.14
    )
  }

  // Pad — akor notaları, 8 vuruş boyunca sustain (her akor)
  if (beatInChord === 0) {
    musicEnvelope(c, midiToFreq(chord.root), time, BEAT * 8, 'sine', 0.035)
    musicEnvelope(c, midiToFreq(chord.third), time, BEAT * 8, 'sine', 0.03)
    musicEnvelope(c, midiToFreq(chord.fifth), time, BEAT * 8, 'sine', 0.03)
  }

  // Melody — beats 1, 3, 5, 7 (offbeat)
  if (beatInChord % 2 === 1) {
    const notes = [
      chord.root + 12,
      chord.third + 12,
      chord.fifth + 12,
      chord.seventh + 12,
    ]
    const note = notes[Math.floor(pseudoRand(beatIndex * 31) * notes.length)]
    musicEnvelope(c, midiToFreq(note), time, BEAT * 1.4, 'triangle', 0.05)
  }

  // Occasional sparkle (every 16 beats)
  if (beatIndex % 16 === 8) {
    musicEnvelope(
      c,
      midiToFreq(chord.root + 24),
      time,
      BEAT * 2,
      'sine',
      0.03
    )
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
    musicGain.gain.value = 0.8
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
  musicGain.gain.value = on ? 0.8 : 0
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
