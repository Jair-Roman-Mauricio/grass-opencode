import { useEffect } from 'react'
import { detectMobile } from './useIsMobile'

/** Intenta bloquear la orientación horizontal en móvil mientras el juego está activo. */
export function useLandscapeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !detectMobile()) return

    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>
      unlock?: () => void
    }
    if (!orientation?.lock) return

    const tryLock = () => {
      orientation.lock?.('landscape').catch(() => {})
    }

    tryLock()
    document.addEventListener('touchstart', tryLock, { once: true, passive: true })
    document.addEventListener('click', tryLock, { once: true })

    return () => {
      document.removeEventListener('touchstart', tryLock)
      document.removeEventListener('click', tryLock)
      try {
        orientation.unlock?.()
      } catch {
        /* algunos navegadores no permiten unlock */
      }
    }
  }, [active])
}
