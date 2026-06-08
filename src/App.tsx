import { useState, useEffect } from 'react'
import { MainMenu } from './components/MainMenu'
import { Game3DScreen } from './screens/Game3DScreen'
import { useGameStore } from './store/gameStore'

export default function App() {
  const [playing, setPlaying] = useState(false)
  const init = useGameStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  if (playing) {
    return <Game3DScreen onBack={() => setPlaying(false)} />
  }

  return <MainMenu onStart={() => setPlaying(true)} />
}
