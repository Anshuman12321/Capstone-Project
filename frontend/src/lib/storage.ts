type StorageMode = 'local' | 'session' | 'auto'

const STORAGE_MODE = ((import.meta.env.VITE_AUTH_STORAGE as string | undefined) ?? 'auto').toLowerCase()

function resolveStorage(): Storage {
  const mode: StorageMode =
    STORAGE_MODE === 'local' || STORAGE_MODE === 'session' || STORAGE_MODE === 'auto'
      ? STORAGE_MODE
      : 'auto'

  if (mode === 'local') return window.localStorage
  if (mode === 'session') return window.sessionStorage
  // Auto: sessionStorage in dev, localStorage in non-dev.
  return import.meta.env.DEV ? window.sessionStorage : window.localStorage
}

export const authStorage = {
  getItem(key: string): string | null {
    return resolveStorage().getItem(key)
  },
  setItem(key: string, value: string): void {
    resolveStorage().setItem(key, value)
  },
  removeItem(key: string): void {
    resolveStorage().removeItem(key)
  },
}

