import { GRASS_BUYER_LINES } from './grassBuyerLines'

const VOICE_KEY = 'stoneGrassVoiceEnabled'
const COOLDOWN_MS = 4000

class VoiceManager {
  private enabled = true
  private lastPlayedAt = 0
  private currentAudio: HTMLAudioElement | null = null
  private lastLineId = ''

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(VOICE_KEY)
      if (stored !== null) this.enabled = stored === 'true'
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    localStorage.setItem(VOICE_KEY, String(on))
    if (!on) this.stop()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  private stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  private pickLine() {
    const pool = GRASS_BUYER_LINES.filter((l) => l.id !== this.lastLineId)
    const line = pool[Math.floor(Math.random() * pool.length)] ?? GRASS_BUYER_LINES[0]
    this.lastLineId = line.id
    return line
  }

  playGrassBuyerLine(onSubtitle?: (text: string) => void): void {
    if (!this.enabled || typeof window === 'undefined') return
    const now = Date.now()
    if (now - this.lastPlayedAt < COOLDOWN_MS) return
    this.lastPlayedAt = now

    const line = this.pickLine()
    onSubtitle?.(line.subtitle)

    const tryPlay = (ext: string, onFail: () => void) => {
      const audio = new Audio(`/voice/grass-buyer/${line.id}.${ext}`)
      this.currentAudio = audio
      audio.volume = 1
      audio.playbackRate = 1.02
      audio.addEventListener('error', onFail, { once: true })
      void audio.play().catch(onFail)
    }

    tryPlay('mp3', () => tryPlay('m4a', () => this.speakFallback(line.voice)))
  }

  private speakFallback(text: string): void {
    if (typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-US'
    utter.rate = 1.12
    utter.pitch = 1.05
    utter.volume = 1
    const voices = synth.getVoices()
    const male =
      voices.find((v) => v.lang.startsWith('en') && /male|daniel|james|fred|david/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith('en') && !/female|samantha|victoria|karen/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith('en'))
    if (male) utter.voice = male
    synth.speak(utter)
  }
}

export const voiceManager = new VoiceManager()

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { /* precarga voces */ }
}
