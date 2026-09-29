import { useEffect, useRef } from 'react'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

type Props = {
  value: string
  onChange: (value: string) => void
}

const theme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'var(--bg)', color: 'var(--fg)' },
    '.cm-scroller': { fontFamily: 'var(--mono)', fontSize: '0.8125rem', lineHeight: '1.6' },
    '.cm-content': { caretColor: 'var(--accent)' },
    '.cm-gutters': { backgroundColor: 'var(--bg)', color: '#5c5c5a', border: 'none' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: '#202020' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: '#2f3b36 !important' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: '#5fbf9b' },
  { tag: [t.string, t.special(t.string)], color: '#c9b88a' },
  { tag: [t.number, t.bool, t.null], color: '#d19a66' },
  { tag: [t.comment], color: '#6b6b69', fontStyle: 'italic' },
  { tag: [t.typeName, t.className], color: '#8fb3c9' },
  { tag: [t.tagName, t.angleBracket], color: '#8fb3c9' },
  { tag: [t.attributeName, t.propertyName], color: '#cfcfcc' },
])

export function CodeEditor({ value, onChange }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!host.current) return
    view.current = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          javascript({ jsx: true, typescript: true }),
          theme,
          syntaxHighlighting(highlight),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString())
          }),
        ],
      }),
    })
    return () => view.current?.destroy()
    // Mount once; external value changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Replace the document when the value changes from outside (e.g. picking an example).
  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  return <div className="editor" ref={host} />
}
