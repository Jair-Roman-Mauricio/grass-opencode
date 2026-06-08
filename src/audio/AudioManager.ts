export class AudioManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private engineNodes: {
    osc: OscillatorNode
    gain: GainNode
    lfo: OscillatorNode
    lfoGain: GainNode
    sub: OscillatorNode
    subGain: GainNode
  } | null = null
  private enabled = true
  private _initialized = false
  private _volume = 1.0

  init(): void {
    if (this._initialized) return
    this._initialized = true
    // AudioContext se crea perezosamente en initCtx() al primer gesto del usuario
  }

  private initCtx(): void {
    if (this.ctx) return
    try {
      this.ctx = new AudioContext()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 1.0
      this.masterGain.connect(this.ctx.destination)
    } catch {
      this.enabled = false
    }
  }

  resume(): void {
    this.initCtx()
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume()
    }
  }

  private ensureResumed(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume()
    }
  }

  startEngine(): void {
    if (!this.ctx || !this.masterGain || !this.enabled || this.engineNodes) return
    this.ensureResumed()

    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 80

    const gain = this.ctx.createGain()
    gain.gain.value = 0.12

    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 5
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 10
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    lfo.start()

    const sub = this.ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = 55
    const subGain = this.ctx.createGain()
    subGain.gain.value = 0.06

    osc.connect(gain)
    gain.connect(this.masterGain)
    sub.connect(subGain)
    subGain.connect(this.masterGain)
    osc.start()
    sub.start()

    this.engineNodes = { osc, gain, lfo, lfoGain, sub, subGain }
  }

  stopEngine(): void {
    if (!this.engineNodes) return
    try {
      this.engineNodes.osc.stop()
      this.engineNodes.osc.disconnect()
      this.engineNodes.lfo.stop()
      this.engineNodes.lfo.disconnect()
      this.engineNodes.sub.stop()
      this.engineNodes.sub.disconnect()
    } catch {}
    this.engineNodes = null
  }

  playLoadChime(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return
    this.ensureResumed()
    const t = this.ctx.currentTime

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 3000
    filter.Q.value = 0.7
    filter.connect(this.masterGain)

    const osc1 = this.ctx.createOscillator()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(660, t)
    osc1.frequency.exponentialRampToValueAtTime(990, t + 0.05)

    const osc2 = this.ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1320, t + 0.005)
    osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.055)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.85, t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.15)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(filter)

    osc1.start(t)
    osc1.stop(t + 0.1)
    osc2.start(t + 0.005)
    osc2.stop(t + 0.1)
  }

  playLoadFullChime(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return
    this.ensureResumed()
    const t = this.ctx.currentTime

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 4000
    filter.Q.value = 0.5
    filter.connect(this.masterGain)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.85, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.35)
    gain.connect(filter)

    const freqs = [880, 1108, 1318]
    const oscs: OscillatorNode[] = []
    for (const f of freqs) {
      const o = this.ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.setValueAtTime(f, t)
      o.frequency.exponentialRampToValueAtTime(f * 1.02, t + 0.15)
      o.connect(gain)
      o.start(t)
      o.stop(t + 0.3)
      oscs.push(o)
    }
  }

  playStep(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return
    this.ensureResumed()
    const t = this.ctx.currentTime

    const noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    }
    const noise = this.ctx.createBufferSource()
    noise.buffer = noiseBuf

    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 400
    bp.Q.value = 2

    const noiseGain = this.ctx.createGain()
    noiseGain.gain.setValueAtTime(0.65, t)
    noiseGain.gain.exponentialRampToValueAtTime(0.005, t + 0.06)

    noise.connect(bp)
    bp.connect(noiseGain)
    noiseGain.connect(this.masterGain)
    noise.start(t)
    noise.stop(t + 0.05)

    const pitchVar = 1 + (Math.random() * 0.08 - 0.04)
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(110 * pitchVar, t)
    osc.frequency.exponentialRampToValueAtTime(70 * pitchVar, t + 0.05)

    const oscGain = this.ctx.createGain()
    oscGain.gain.setValueAtTime(0.35, t)
    oscGain.gain.exponentialRampToValueAtTime(0.005, t + 0.10)

    osc.connect(oscGain)
    oscGain.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + 0.09)
  }

  playCash(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return
    this.ensureResumed()

    const osc1 = this.ctx.createOscillator()
    osc1.type = 'triangle'
    osc1.frequency.setValueAtTime(800, this.ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.08)

    const gain1 = this.ctx.createGain()
    gain1.gain.setValueAtTime(1.0, this.ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.15)

    osc1.connect(gain1)
    gain1.connect(this.masterGain)
    osc1.start()
    osc1.stop(this.ctx.currentTime + 0.15)

    const osc2 = this.ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.06)
    osc2.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.15)

    const gain2 = this.ctx.createGain()
    gain2.gain.setValueAtTime(0.85, this.ctx.currentTime + 0.06)
    gain2.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.25)

    osc2.connect(gain2)
    gain2.connect(this.masterGain)
    osc2.start(this.ctx.currentTime + 0.06)
    osc2.stop(this.ctx.currentTime + 0.2)
  }

  playHit(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return
    this.ensureResumed()

    const osc1 = this.ctx.createOscillator()
    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(200, this.ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.2)

    const gain1 = this.ctx.createGain()
    gain1.gain.setValueAtTime(1.0, this.ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.3)

    osc1.connect(gain1)
    gain1.connect(this.masterGain)
    osc1.start()
    osc1.stop(this.ctx.currentTime + 0.25)

    const osc2 = this.ctx.createOscillator()
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(100, this.ctx.currentTime + 0.05)

    const gain2 = this.ctx.createGain()
    gain2.gain.setValueAtTime(0.65, this.ctx.currentTime + 0.05)
    gain2.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.2)

    osc2.connect(gain2)
    gain2.connect(this.masterGain)
    osc2.start(this.ctx.currentTime + 0.05)
    osc2.stop(this.ctx.currentTime + 0.15)
  }

  playMount(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return
    this.ensureResumed()

    const osc = this.ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(200, this.ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.12)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.85, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.25)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.2)
  }

  playClick(): void {
    if (!this.ctx || !this.masterGain || !this.enabled) return
    this.ensureResumed()

    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 1000

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.65, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.06)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.04)
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) this.stopEngine()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setVolume(value: number): void {
    const v = Math.max(0, Math.min(1, value))
    this._volume = v
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.value = v
    }
  }

  getVolume(): number {
    return this._volume
  }

  destroy(): void {
    this.stopEngine()
    if (this.ctx) {
      this.ctx.close()
      this.ctx = null
    }
  }
}

export const audioManager = new AudioManager()
