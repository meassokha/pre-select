import type { TargetAndTransition, Transition, Variants } from 'motion/react'

/* Motion tokens. Style: clay, intensity: expressive (see design-brief.md). */
export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 34, mass: 0.6 },
  smooth: { type: 'spring', stiffness: 320, damping: 32 },
  bouncy: { type: 'spring', stiffness: 420, damping: 16 },
} satisfies Record<string, Transition>

export const ease = { out: [0.16, 1, 0.3, 1], in: [0.7, 0, 0.84, 0] } as const
export const duration = { fast: 0.12, base: 0.2, slow: 0.32, countUp: 1.1 }

/** Clay hover vocabulary. Bouncy springs for buttons and icons only; never for numbers, rows or charts. */
export const hover: Record<'card' | 'button' | 'tap' | 'icon', TargetAndTransition> = {
  card: { y: -3 },
  button: { scale: 1.04 },
  tap: { scale: 0.94 },
  icon: { scale: 1.15, rotate: 8 },
}
export const hoverTransition: Transition = spring.bouncy

export const stagger: Variants = { show: { transition: { staggerChildren: 0.06 } } }
export const rise: Variants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: ease.out } } }
