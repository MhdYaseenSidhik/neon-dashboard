import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'
const read = (): Theme => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(read()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  const toggle = useCallback(() => {
    const next: Theme = read() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch { /* storage unavailable */ }
  }, [])
  return { theme, toggle }
}
