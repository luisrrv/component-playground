/**
 * @kit/ui: a deliberately tiny component set available to user code.
 * Styling lives in sandbox.css (class names prefixed `kit-`), driven by theme
 * tokens (see ../theme.ts).
 *
 * The kit is read-only for user code: it's customized through theme tokens
 * and `slots`, never by editing or patching the components themselves.
 */
import { Component, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { reportSlotError } from './slotErrors'

type Children = { children?: ReactNode }

/**
 * Wraps each slot in its own error boundary: if user-provided slot content
 * throws, only that slot is replaced with a placeholder and the rest of the
 * component keeps rendering.
 */
class Slot extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    reportSlotError(this.props.name, error)
  }

  render() {
    if (this.state.failed) return <span className="kit-slot-error">slot “{this.props.name}” failed</span>
    return this.props.children
  }
}

const slot = (name: string, content: ReactNode) =>
  content === undefined || content === null || content === false ? null : <Slot name={name}>{content}</Slot>

export type CardSlots = {
  /** Replaces the title row. */
  header?: ReactNode
  /** Right side of the title row, e.g. a Badge. */
  aside?: ReactNode
  /** Below the content, separated by a rule. */
  footer?: ReactNode
}

export function Card({ title, slots = {}, children }: Children & { title?: string; slots?: CardSlots }) {
  const head = slots.header !== undefined ? slot('header', slots.header) : title && <h3 className="kit-card-title">{title}</h3>
  return (
    <section className="kit-card">
      {(head || slots.aside) && (
        <div className="kit-card-head">
          {head}
          {slots.aside !== undefined && <span className="kit-card-aside">{slot('aside', slots.aside)}</span>}
        </div>
      )}
      {children}
      {slots.footer !== undefined && <div className="kit-card-footer">{slot('footer', slots.footer)}</div>}
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

export type ButtonSlots = {
  /** Before the label. */
  icon?: ReactNode
  /** After the label, e.g. a count. */
  end?: ReactNode
}

export function Button({
  variant = 'primary',
  slots = {},
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost'; slots?: ButtonSlots }) {
  return (
    <button {...props} className={`kit-button kit-button-${variant}`}>
      {slots.icon !== undefined && <span className="kit-button-icon">{slot('icon', slots.icon)}</span>}
      {children}
      {slots.end !== undefined && <span className="kit-button-end">{slot('end', slots.end)}</span>}
    </button>
  )
}

export function Badge({ tone = 'neutral', children }: Children & { tone?: 'neutral' | 'success' | 'warning' }) {
  return <span className={`kit-badge kit-badge-${tone}`}>{children}</span>
}
