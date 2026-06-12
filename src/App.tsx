import { useState, useEffect } from 'react'
import { MainMenu } from './components/MainMenu'
import { IntroCinematic } from './components/IntroCinematic'
import { Game3DScreen } from './screens/Game3DScreen'
import { useGameStore } from './store/gameStore'

type Phase = 'menu' | 'intro' | 'game'

export default function App() {
  const [phase, setPhase] = useState<Phase>('menu')
  const init = useGameStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  if (phase === 'game') {
    return <Game3DScreen onBack={() => setPhase('menu')} />
  }

  if (phase === 'intro') {
    return <IntroCinematic onDone={() => setPhase('game')} />
  }

  return <MainMenu onStart={(withIntro) => setPhase(withIntro ? 'intro' : 'game')} />
}
