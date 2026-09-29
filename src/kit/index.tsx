/**
 * @kit/ui: a deliberately tiny component set available to user code.
 * Styling lives in sandbox.css (class names prefixed `kit-`).
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Children = { children?: ReactNode }

export function Card({ title, children }: Children & { title?: string }) {
  return (
    <section className="kit-card">
      {title && <h3 className="kit-card-title">{title}</h3>}
      {children}
    </section>
  )
}

export function Stack({
  gap = 8,
  direction = 'column',
  children,
}: Children & { gap?: number; direction?: 'row' | 'column' }) {
  return (
    <div className="kit-stack" style={{ gap, flexDirection: direction, alignItems: direction === 'row' ? 'center' : 'flex-start' }}>
      {children}
    </div>
  )
}

export function Text({ tone = 'default', children }: Children & { tone?: 'default' | 'muted' }) {
  return <p className={tone === 'muted' ? 'kit-text kit-text-muted' : 'kit-text'}>{children}</p>
}

export function Button({
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return <button {...props} className={`kit-button kit-button-${variant}`} />
}

export function Badge({ tone = 'neutral', children }: Children & { tone?: 'neutral' | 'success' | 'warning' }) {
  return <span className={`kit-badge kit-badge-${tone}`}>{children}</span>
}
