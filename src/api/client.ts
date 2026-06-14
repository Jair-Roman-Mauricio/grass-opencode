let cached: boolean | null = null

export async function isApiAvailable(): Promise<boolean> {
  if (cached !== null) return cached
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) })
    cached = res.ok
  } catch {
    cached = false
  }
  return cached
}

export function resetApiAvailabilityCache(): void {
  cached = null
}
