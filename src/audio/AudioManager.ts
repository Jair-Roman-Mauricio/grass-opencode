import * as Tone from 'tone'
import { MusicManager } from './MusicManager'

// Capa de audio 100% sintetizada con Tone.js. No carga archivos: cada efecto se
// genera con synths y se dispara con variación de tono/timing para que no canse.
// Buses:  synths -> sfxBus  ┐
//         música  -> musicBus┤-> masterGain -> destino
// setVolume escala masterGain; setEnabled silencia todo.

export class AudioManager {
  private started = false
  private enabled = true
  private _initialized = false
  private _volume = 1.0

  private masterGain: Tone.Gain | null = null
  private sfxBus: Tone.Gain | null = null
  private musicBus: Tone.Gain | null = null

  // Synths reutilizables
  private pluck!: Tone.PluckSynth      // monedas / clicks
  private bell!: Tone.FMSynth          // chimes / recompensa
  private membrane!: Tone.MembraneSynth // golpes graves (siembra, montar, depósito)
  private noise!: Tone.NoiseSynth      // pasos / corte de pasto
  private blip!: Tone.Synth            // UI / seleccionar
  private poly!: Tone.PolySynth        // acordes (compra, error, fanfarrias)

  // Motor de la cortadora (drone en bucle)
  private engineOsc: Tone.Oscillator | null = null
  private engineFilter: Tone.Filter | null = null
  private engineGain: Tone.Gain | null = null
  private engineLfo: Tone.LFO | null = null

  // Drone ambiental de la cinemática de introducción
  private cineOsc: Tone.Oscillator | null = null
  private cineSub: Tone.Oscillator | null = null
  private cineGain: Tone.Gain | null = null
  private cineFilter: Tone.Filter | null = null
  private cineLfo: Tone.LFO | null = null

  private music: MusicManager | null = null
  private musicEnabled = true
  private sfxEnabled = true
  private musicPending = false
  private gestureBound = false
  private onVisibility: (() => void) | null = null

  init(): void {
    if (this._initialized) return
    this._initialized = true
    this.bindUserGesture()
  }

  isStarted(): boolean {
    return this.started
  }

  /** Registra el primer gesto del usuario para desbloquear el AudioContext. */
  private bindUserGesture(): void {
    if (this.gestureBound || typeof window === 'undefined') return
    this.gestureBound = true
    const onGesture = () => { void this.resume() }
    window.addEventListener('pointerdown', onGesture, { once: true, capture: true, passive: true })
    window.addEventListener('keydown', onGesture, { once: true, capture: true })
  }

  /** Arranca Tone y construye el grafo de audio tras un gesto del usuario. */
  async resume(): Promise<void> {
    try {
      if (Tone.getContext().state !== 'running') {
        await Tone.start()
      }
    } catch {
      return
    }

    if (!this.started) {
      this.started = true
      this.buildGraph()
    }

    if (this.musicPending && this.enabled && this.musicEnabled) {
      this.musicPending = false
      this.music?.start()
    }
  }

  private buildGraph(): void {
    this.masterGain = new Tone.Gain(this._volume).toDestination()
    this.sfxBus = new Tone.Gain(0.9).connect(this.masterGain)
    this.musicBus = new Tone.Gain(0.5).connect(this.masterGain)

    // Reverb suave compartido para campanas/acordes.
    const reverb = new Tone.Reverb({ decay: 1.6, wet: 0.18 }).connect(this.sfxBus)

    this.pluck = new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9 })
    this.pluck.connect(this.sfxBus)

    this.bell = new Tone.FMSynth({
      harmonicity: 3.01,
      modulationIndex: 6,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.6 },
      modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
    })
    this.bell.connect(reverb)

    this.membrane = new Tone.MembraneSynth({
      pitchDecay: 0.04,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.2 },
    })
    this.membrane.connect(this.sfxBus)

    this.noise = new Tone.NoiseSynth({
      noise: { type: 'brown' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.02 },
    })
    const noiseFilter = new Tone.Filter({ type: 'bandpass', frequency: 500, Q: 1.2 }).connect(this.sfxBus)
    this.noise.connect(noiseFilter)

    this.blip = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.04 },
    })
    this.blip.volume.value = -8
    this.blip.connect(this.sfxBus)

    this.poly = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.3 },
    })
    this.poly.volume.value = -6
    this.poly.connect(reverb)

    this.music = new MusicManager(this.musicBus)
    if (!this.enabled) {
      this.masterGain.gain.value = 0
    }

    // En segundo plano el navegador estrangula el AudioContext y produce
    // distorsión. Suspenderlo al ocultar la pestaña y reanudarlo al volver.
    if (!this.onVisibility && typeof document !== 'undefined') {
      this.onVisibility = () => {
        const raw = Tone.getContext().rawContext as AudioContext
        try {
          if (document.hidden) raw.suspend?.()
          else raw.resume?.()
        } catch { /* ignorar */ }
      }
      document.addEventListener('visibilitychange', this.onVisibility)
    }
  }

  private get ready(): boolean {
    return this.started && this.enabled && !!this.sfxBus
  }

  // Tiempo de scheduling estrictamente creciente: Tone exige que cada evento sea
  // posterior al anterior; con StrictMode (doble montaje) o disparos rápidos dos
  // eventos pueden caer en el mismo instante. Avanzamos un epsilon para evitarlo.
  private lastT = 0
  private t(offset = 0): number {
    const now = Tone.now() + offset
    this.lastT = Math.max(now, this.lastT + 0.01)
    return this.lastT
  }

  /** Dispara un synth de forma segura: si Tone lanza por timing, se ignora (no crashea). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tone(synth: { triggerAttackRelease: (...a: any[]) => unknown }, ...args: any[]): void {
    try { synth.triggerAttackRelease(...args) } catch { /* colisión de scheduling: omitir */ }
  }

  // --- Eventos de juego (interfaz pública estable) ---

  playStep(): void {
    if (!this.ready) return
    this.tone(this.noise, 0.05, this.t(), 0.5 + Math.random() * 0.2)
  }

  /** Siembra: golpe terroso suave + crujido corto (estilo Minecraft). */
  playPlant(): void {
    if (!this.ready) return
    const t = this.t()
    this.tone(this.membrane, `G${1 + (Math.random() < 0.5 ? 0 : 1)}`, '16n', t, 0.7)
    this.tone(this.noise, 0.07, t, 0.6)
  }

  /** Corte de pasto: swish de ruido con tono variable. */
  playCut(): void {
    if (!this.ready) return
    this.tone(this.noise, 0.06, this.t(), 0.35 + Math.random() * 0.2)
  }

  playMount(): void {
    if (!this.ready) return
    const t = this.t()
    this.tone(this.blip, 'C4', '16n', t, 0.7)
    this.tone(this.blip, 'G4', '16n', t + 0.07, 0.7)
  }

  playLoadChime(): void {
    if (!this.ready) return
    const note = ['C6', 'E6', 'G6'][Math.floor(Math.random() * 3)]
    this.tone(this.pluck, note, '16n', this.t())
  }

  playLoadFullChime(): void {
    if (!this.ready) return
    const t = this.t()
    ;['C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone(this.bell, n, '8n', t + i * 0.08))
  }

  /** Venta / depósito: "ka-ching" satisfactorio (campana ascendente + golpe). */
  playSell(): void {
    if (!this.ready) return
    const t = this.t()
    this.tone(this.membrane, 'C2', '16n', t, 0.6)
    this.tone(this.bell, 'C6', '16n', t + 0.02)
    this.tone(this.bell, 'G6', '8n', t + 0.12)
    this.tone(this.pluck, 'C7', '16n', t + 0.12)
  }

  playCash(): void {
    if (!this.ready) return
    const t = this.t()
    this.tone(this.pluck, 'E6', '32n', t)
    this.tone(this.pluck, 'A6', '32n', t + 0.06)
  }

  playClick(): void {
    if (!this.ready) return
    this.tone(this.blip, 'A4', '32n', this.t(), 0.5)
  }

  playSelect(): void {
    if (!this.ready) return
    this.tone(this.blip, 'E5', '32n', this.t(), 0.6)
  }

  /** Acción denegada: dos notas descendentes apagadas. */
  playError(): void {
    if (!this.ready) return
    const t = this.t()
    this.tone(this.poly, 'A3', '16n', t, 0.5)
    this.tone(this.poly, 'Eb3', '8n', t + 0.1, 0.5)
  }

  playOpen(): void {
    if (!this.ready) return
    const t = this.t()
    ;['C5', 'E5', 'G5'].forEach((n, i) => this.tone(this.blip, n, '32n', t + i * 0.05, 0.5))
  }

  playClose(): void {
    if (!this.ready) return
    const t = this.t()
    ;['G5', 'E5', 'C5'].forEach((n, i) => this.tone(this.blip, n, '32n', t + i * 0.05, 0.5))
  }

  /** Compra exitosa: acorde mayor alegre. */
  playPurchase(): void {
    if (!this.ready) return
    const t = this.t()
    this.tone(this.poly, ['C5', 'E5', 'G5'], '8n', t, 0.6)
    this.tone(this.pluck, 'C6', '16n', t + 0.02)
  }

  /** Desbloqueo: fanfarria ascendente más notable. */
  playUnlock(): void {
    if (!this.ready) return
    const t = this.t()
    ;['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(this.bell, n, '8n', t + i * 0.09))
    this.tone(this.poly, ['C5', 'G5'], '4n', t + 0.36, 0.5)
  }

  // --- Motor de la cortadora (drone en bucle) ---

  startEngine(): void {
    if (!this.ready || this.engineOsc) return
    this.engineGain = new Tone.Gain(0.06).connect(this.sfxBus!)
    this.engineFilter = new Tone.Filter({ type: 'lowpass', frequency: 300, Q: 2 }).connect(this.engineGain)
    this.engineOsc = new Tone.Oscillator({ type: 'sawtooth', frequency: 70 }).connect(this.engineFilter)
    this.engineLfo = new Tone.LFO({ frequency: 6, min: 60, max: 95 }).start()
    this.engineLfo.connect(this.engineOsc.frequency)
    this.engineOsc.start()
  }

  stopEngine(): void {
    try {
      this.engineOsc?.stop()
      this.engineOsc?.dispose()
      this.engineLfo?.dispose()
      this.engineFilter?.dispose()
      this.engineGain?.dispose()
    } catch {}
    this.engineOsc = null
    this.engineLfo = null
    this.engineFilter = null
    this.engineGain = null
  }

  // --- Cinemática de introducción ---

  /** Drone ambiental MUY suave durante toda la intro (no debe aturdir ni tapar la voz). */
  startCinematic(): void {
    if (!this.ready || this.cineOsc) return
    this.cineGain = new Tone.Gain(0).connect(this.sfxBus!)
    this.cineGain.gain.rampTo(0.035, 2.5)
    // Filtro cerrado: solo deja pasar el grave, sin el zumbido de la sierra.
    this.cineFilter = new Tone.Filter({ type: 'lowpass', frequency: 360, Q: 0.6 }).connect(this.cineGain)
    this.cineOsc = new Tone.Oscillator({ type: 'triangle', frequency: 55 }).connect(this.cineFilter)
    this.cineSub = new Tone.Oscillator({ type: 'sine', frequency: 36.7 }).connect(this.cineFilter)
    this.cineSub.volume.value = -10
    this.cineLfo = new Tone.LFO({ frequency: 0.08, min: 280, max: 440 }).start()
    this.cineLfo.connect(this.cineFilter.frequency)
    this.cineOsc.start()
    this.cineSub.start()
  }

  /** Aparición de un panel: golpe muy suave (no debe pegar). */
  playCinePanel(): void {
    if (!this.ready) return
    const t = this.t()
    this.tone(this.membrane, 'C2', '16n', t, 0.35)
    this.tone(this.noise, 0.1, t, 0.18)
  }

  /** Tick corto del typewriter (el throttle lo gestiona el componente). */
  playCineType(): void {
    if (!this.ready) return
    this.tone(this.blip, 'C6', '64n', this.t(), 0.18)
  }

  /** Acorde dramático breve y discreto para los remates cómicos. */
  playCineStinger(): void {
    if (!this.ready) return
    const t = this.t()
    this.tone(this.poly, ['C4', 'Eb4', 'G4'], '8n', t, 0.22)
    this.tone(this.bell, 'Eb5', '16n', t + 0.04, 0.3)
  }

  /** Para el drone y resuelve con un acorde ascendente al entrar al juego. */
  endCinematic(): void {
    if (this.cineGain) this.cineGain.gain.rampTo(0, 0.8)
    const osc = this.cineOsc, sub = this.cineSub, lfo = this.cineLfo, filt = this.cineFilter, g = this.cineGain
    this.cineOsc = this.cineSub = this.cineLfo = null
    this.cineFilter = null
    this.cineGain = null
    setTimeout(() => {
      try {
        osc?.stop(); osc?.dispose()
        sub?.stop(); sub?.dispose()
        lfo?.dispose(); filt?.dispose(); g?.dispose()
      } catch {}
    }, 1000)
    if (this.ready) {
      const t = this.t()
      ;['C5', 'E5', 'G5', 'C6'].forEach((n, i) => this.tone(this.bell, n, '8n', t + i * 0.08))
      this.tone(this.poly, ['C4', 'G4'], '2n', t + 0.32, 0.5)
    }
  }

  // --- Música de fondo ---

  startMusic(): void {
    if (!this.enabled || !this.musicEnabled) return
    if (!this.started) {
      this.musicPending = true
      return
    }
    this.music?.start()
  }

  stopMusic(): void {
    this.music?.stop()
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on
    if (on) this.music?.start()
    else this.music?.stop()
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled
  }

  // Silenciar SOLO los efectos (el bus de SFX), sin tocar la música.
  setSfxEnabled(on: boolean): void {
    this.sfxEnabled = on
    if (this.sfxBus) this.sfxBus.gain.rampTo(on ? 0.9 : 0, 0.1)
    if (!on) this.stopEngine()
  }

  isSfxEnabled(): boolean {
    return this.sfxEnabled
  }

  // --- Control global ---

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (this.masterGain) this.masterGain.gain.rampTo(enabled ? this._volume : 0, 0.1)
    if (!enabled) {
      this.stopEngine()
      this.music?.stop()
    } else if (this.musicEnabled) {
      this.music?.start()
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setVolume(value: number): void {
    const v = Math.max(0, Math.min(1, value))
    this._volume = v
    if (this.masterGain && this.enabled) this.masterGain.gain.rampTo(v, 0.05)
  }

  getVolume(): number {
    return this._volume
  }

  destroy(): void {
    this.stopEngine()
    this.endCinematic()
    if (this.onVisibility && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility)
      this.onVisibility = null
    }
    this.music?.dispose()
    try {
      this.masterGain?.dispose()
      this.sfxBus?.dispose()
      this.musicBus?.dispose()
    } catch {}
  }
}

export const audioManager = new AudioManager()
