const KEY = 'komikoyun_nickname_v1'

export function loadNickname(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveNickname(n: string): void {
  if (typeof window === 'undefined') return
  try {
    const clean = n.trim().slice(0, 20)
    window.localStorage.setItem(KEY, clean)
  } catch {
    // ignore
  }
}
