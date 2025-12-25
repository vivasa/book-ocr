import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { useTheme } from '@mui/material/styles'

const transparentTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
  },
})

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

const ProofreadEditor = forwardRef(function ProofreadEditor(
  {
    value,
    onChange,
    disabled,
    placeholder,
    height = 420,
    onCursorLineChange,
    onSelectionChange,
    fontSize = 15,
  },
  ref,
) {
  const muiTheme = useTheme()
  const viewRef = useRef(null)

  const extensions = useMemo(() => {
    return [
      transparentTheme,
      EditorView.theme({
        '&': {
          fontSize: `${fontSize}px`,
          fontFamily:
            '"Timmana", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          lineHeight: 1.55,
        },
        '.cm-scroller': {
          fontFamily:
            '"Timmana", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important',
        },
        '.cm-content': {
          fontFamily:
            '"Timmana", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important',
          caretColor: muiTheme.palette.primary.main,
        },
        '.cm-cursor, .cm-dropCursor': {
          borderLeftColor: muiTheme.palette.primary.main,
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
          backgroundColor: muiTheme.palette.action.selected,
        },
        '.cm-gutters': {
          fontFamily:
            '"Timmana", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important',
          backgroundColor: muiTheme.palette.background.paper,
          color: muiTheme.palette.text.secondary,
          borderRightColor: muiTheme.palette.divider,
        },
        '.cm-line.cm-activeLine': {
          backgroundColor: muiTheme.palette.action.selected,
          fontWeight: 700,
        },
        '.cm-activeLineGutter': {
          backgroundColor: muiTheme.palette.action.selected,
        },
      }),
      EditorView.lineWrapping,
      EditorView.editable.of(!disabled),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      EditorView.updateListener.of((update) => {
        if (!update.selectionSet) return

        if (onCursorLineChange) {
          const view = update.view
          const pos = view.state.selection.main.head
          const line = view.state.doc.lineAt(pos)
          const total = view.state.doc.lines
          onCursorLineChange(line.number, total)
        }

        if (onSelectionChange) {
          const sel = update.view.state.selection.main
          const selectedText = sel.from === sel.to ? '' : update.view.state.doc.sliceString(sel.from, sel.to)
          onSelectionChange({
            from: sel.from,
            to: sel.to,
            anchor: sel.anchor,
            head: sel.head,
            selectedText,
          })
        }
      }),
    ]
  }, [disabled, fontSize, muiTheme, onCursorLineChange, onSelectionChange])

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
      setSelection(anchor, head = anchor) {
        const view = viewRef.current
        if (!view) return false
        const docLen = view.state.doc.length
        const a = clamp(Number(anchor ?? 0), 0, docLen)
        const h = clamp(Number(head ?? anchor ?? 0), 0, docLen)
        view.dispatch({ selection: { anchor: a, head: h }, scrollIntoView: true })
        view.focus()
        return true
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
      theme={muiTheme.palette.mode === 'dark' ? 'dark' : 'light'}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
      }}
      extensions={extensions}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
    />
  )
})

export default ProofreadEditor
