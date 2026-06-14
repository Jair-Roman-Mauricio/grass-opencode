import { useEffect, useState } from 'react'

const MOBILE_MIN_DIM = 768

export function detectMobile(): boolean {
  if (typeof window === 'undefined') return false
  const touch =
    window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
  const minDim = Math.min(window.innerWidth, window.innerHeight)
  return touch && minDim <= MOBILE_MIN_DIM
}

export function detectLandscape(): boolean {
  if (typeof window === 'undefined') return true
  return window.innerWidth > window.innerHeight
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(detectMobile)

  useEffect(() => {
    const update = () => setIsMobile(detectMobile())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return isMobile
}

export function useIsLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(detectLandscape)

  useEffect(() => {
    const update = () => setIsLandscape(detectLandscape())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return isLandscape
}
