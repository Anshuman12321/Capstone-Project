const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN as string | undefined) ?? ''

export function apiUrl(path: string): string {
  // In dev, leave as a relative URL so Vite's proxy can forward it to the backend.
  if (!API_ORIGIN) return path
  return new URL(path, API_ORIGIN).toString()
}

