import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'

const transparentTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
  },
})

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

const ProofreadEditor = forwardRef(function ProofreadEditor(
  { value, onChange, disabled, placeholder, height = 420, onCursorLineChange },
  ref,
) {
  const viewRef = useRef(null)

  const extensions = useMemo(() => {
    return [
      transparentTheme,
      EditorView.lineWrapping,
      EditorView.editable.of(!disabled),
      EditorView.updateListener.of((update) => {
        if (!onCursorLineChange) return
        if (!update.selectionSet) return
        const view = update.view
        const pos = view.state.selection.main.head
        const line = view.state.doc.lineAt(pos)
        const total = view.state.doc.lines
        onCursorLineChange(line.number, total)
      }),
    ]
  }, [disabled, onCursorLineChange])

  const handleChange = useCallback(
    (nextValue) => {
      onChange?.(nextValue)
    },
    [onChange],
  )

  useImperativeHandle(
    ref,
    () => ({
      focus() {
        viewRef.current?.focus?.()
      },
      insertText(text) {
        const view = viewRef.current
        const insert = String(text ?? '')
        if (!insert) return false

        if (!view) {
          // Fallback: append when the editor instance isn't ready yet.
          const current = String(value ?? '')
          onChange?.(current + insert)
          return true
        }

        const sel = view.state.selection?.main
        const from = clamp(sel?.from ?? view.state.doc.length, 0, view.state.doc.length)
        const to = clamp(sel?.to ?? view.state.doc.length, 0, view.state.doc.length)

        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
          scrollIntoView: true,
        })
        view.focus()
        return true
      },
    }),
    [onChange, value],
  )

  return (
    <CodeMirror
      value={value ?? ''}
      onChange={handleChange}
      height={typeof height === 'number' ? `${height}px` : height}
      editable={!disabled}
      placeholder={placeholder}
      theme="dark"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: false,
      }}
      extensions={extensions}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
    />
  )
})

export default ProofreadEditor
