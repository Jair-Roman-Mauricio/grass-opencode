import * as Tone from 'tone'

// Música de fondo ambiental con 3 pistas que se alternan (A -> B -> C -> A...).
// Todas comparten tonalidad (Do mayor / La menor pentatónica) y tempo (~84 BPM)
// para que los cambios sean naturales. Cada pista tiene su propio gain; al rotar
// se hace crossfade para que no haya silencios ni cortes. Pensada como fondo
// suave (volumen bajo) que no canse.

interface Track {
  gain: Tone.Gain
  parts: Array<Tone.Sequence>
  synths: Array<{ dispose: () => void }>
}

const ROTATE_MEASURES = 8 // cada cuántos compases se cambia de pista
const CROSSFADE = 2.2 // segundos de mezcla entre pistas

export class MusicManager {
  private out: Tone.Gain
  private tracks: Track[] = []
  private active = 0
  private running = false
  private built = false
  private rotateId: number | null = null

  constructor(out: Tone.Gain) {
    this.out = out
  }

  private build(): void {
    if (this.built) return
    this.built = true
    Tone.getTransport().bpm.value = 84
    this.tracks = [this.buildTrackA(), this.buildTrackB(), this.buildTrackC()]
    // Sólo la primera pista suena al principio.
    this.tracks.forEach((tr, i) => (tr.gain.gain.value = i === 0 ? 1 : 0))
  }

  // Pista A — "Día tranquilo": arpegio pentatónico + pad cálido.
  private buildTrackA(): Track {
    const gain = new Tone.Gain(0).connect(this.out)

    const arp = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.05, release: 0.3 },
    })
    arp.volume.value = -16
    arp.connect(gain)

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.8, decay: 0.4, sustain: 0.6, release: 1.6 },
    })
    pad.volume.value = -20
    pad.connect(gain)

    const arpSeq = new Tone.Sequence(
      (time, note) => { if (note) arp.triggerAttackRelease(note as string, '8n', time, 0.6) },
      ['C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'E5'],
      '8n'
    ).start(0)

    const padSeq = new Tone.Sequence(
      (time, chord) => { if (chord) pad.triggerAttackRelease(chord.notes, '1m', time, 0.5) },
      [{ notes: ['C4', 'E4', 'G4'] }, { notes: ['A3', 'C4', 'E4'] }, { notes: ['F3', 'A3', 'C4'] }, { notes: ['G3', 'B3', 'D4'] }],
      '1m'
    ).start(0)

    return { gain, parts: [arpSeq, padSeq], synths: [arp, pad] }
  }

  // Pista B — "Paseo cálido": bajo + melodía tipo marimba.
  private buildTrackB(): Track {
    const gain = new Tone.Gain(0).connect(this.out)

    const bass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 0.3 },
    })
    bass.volume.value = -14
    bass.connect(gain)

    const marimba = new Tone.FMSynth({
      harmonicity: 2,
      modulationIndex: 4,
      envelope: { attack: 0.003, decay: 0.5, sustain: 0, release: 0.4 },
      modulationEnvelope: { attack: 0.003, decay: 0.2, sustain: 0, release: 0.2 },
    })
    marimba.volume.value = -16
    marimba.connect(gain)

    const bassSeq = new Tone.Sequence(
      (time, note) => { if (note) bass.triggerAttackRelease(note as string, '4n', time, 0.7) },
      ['C2', 'G2', 'A2', 'E2'],
      '2n'
    ).start(0)

    const melSeq = new Tone.Sequence(
      (time, note) => { if (note) marimba.triggerAttackRelease(note as string, '8n', time, 0.7) },
      ['E5', null, 'G5', 'A5', null, 'G5', 'E5', null, 'D5', 'E5', null, 'C5', null, 'D5', null, null],
      '8n'
    ).start(0)

    return { gain, parts: [bassSeq, melSeq], synths: [bass, marimba] }
  }

  // Pista C — "Ambiental": pad etéreo + campanas dispersas (descanso).
  private buildTrackC(): Track {
    const gain = new Tone.Gain(0).connect(this.out)
    const reverb = new Tone.Reverb({ decay: 4, wet: 0.4 }).connect(gain)

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 1.5, decay: 1, sustain: 0.7, release: 3 },
    })
    pad.volume.value = -18
    pad.connect(reverb)

    const bells = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.6, release: 0.4 },
      harmonicity: 4.1,
      resonance: 800,
      modulationIndex: 16,
    })
    bells.volume.value = -28
    bells.connect(reverb)

    const padSeq = new Tone.Sequence(
      (time, chord) => { if (chord) pad.triggerAttackRelease(chord.notes, '2m', time, 0.4) },
      [{ notes: ['C4', 'G4', 'E5'] }, { notes: ['A3', 'E4', 'C5'] }],
      '2m'
    ).start(0)

    const bellSeq = new Tone.Sequence(
      (time, note) => { if (note) bells.triggerAttackRelease(note as string, '8n', time, 0.3) },
      ['C6', null, null, 'G6', null, null, 'E6', null],
      '2n'
    ).start(0)

    return { gain, parts: [padSeq, bellSeq], synths: [pad, bells] }
  }

  start(): void {
    this.build()
    if (this.running) return
    this.running = true
    const tr = Tone.getTransport()
    // Reactivar la pista activa por si venía silenciada.
    this.tracks.forEach((t, i) => t.gain.gain.rampTo(i === this.active ? 1 : 0, 0.4))
    this.rotateId = tr.scheduleRepeat(() => this.rotate(), `${ROTATE_MEASURES}m`)
    if (tr.state !== 'started') tr.start('+0.1')
  }

  private rotate(): void {
    const next = (this.active + 1) % this.tracks.length
    this.tracks[this.active].gain.gain.rampTo(0, CROSSFADE)
    this.tracks[next].gain.gain.rampTo(1, CROSSFADE)
    this.active = next
  }

  stop(): void {
    if (!this.running) return
    this.running = false
    const tr = Tone.getTransport()
    if (this.rotateId !== null) {
      tr.clear(this.rotateId)
      this.rotateId = null
    }
    // Desvanecer todo y parar el transporte.
    this.tracks.forEach((t) => t.gain.gain.rampTo(0, 0.6))
    tr.stop('+0.7')
  }

  dispose(): void {
    this.stop()
    for (const tr of this.tracks) {
      tr.parts.forEach((p) => p.dispose())
      tr.synths.forEach((s) => s.dispose())
      tr.gain.dispose()
    }
    this.tracks = []
    this.built = false
  }
}
