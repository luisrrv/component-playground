import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  onError: (error: Error) => void
  children: ReactNode
}

type State = { failed: boolean }

/**
 * Catches errors thrown while rendering user components.
 * The parent gives it a new `key` on every successful compile, which resets it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
