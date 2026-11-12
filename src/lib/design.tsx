import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

type Theme = 'light' | 'dark'
interface Design {
  theme: Theme
  setTheme: (t: Theme) => void
}
const Ctx = createContext<Design | null>(null)

const read = (): Theme => {
  try {
    const t = localStorage.getItem('lms-theme')
    if (t === 'dark' || t === 'light') return t
  } catch {
    /* storage blocked */
  }
  return 'light'
}

export function DesignProvider({ children }: { children: ReactNode }) {
  const [theme, set] = useState<Theme>(read)
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.style = 'clay'
  }, [theme])
  const setTheme = (t: Theme) => {
    set(t)
    try {
      localStorage.setItem('lms-theme', t)
    } catch {
      /* ignore */
    }
  }
  return (
    <Ctx.Provider value={{ theme, setTheme }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </Ctx.Provider>
  )
}

export function useDesign() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDesign outside provider')
  return c
}
