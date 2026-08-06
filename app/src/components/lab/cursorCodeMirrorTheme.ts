import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import type { Extension } from '@codemirror/state'

/**
 * CodeMirror theme matching Cursor / VS Code Dark+ (see cursorCodeTheme).
 */
const editorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--code-bg)',
      color: '#d4d4d4',
      fontSize: 'var(--lab-font-mono)',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.45',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '16px',
      caretColor: '#d4d4d4',
      minHeight: '11rem',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#d4d4d4',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: '#264f78 !important',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--code-bg)',
      color: 'var(--text-faint)',
      border: 'none',
    },
    '&.cm-focused': {
      outline: 'none',
    },
  },
  { dark: true },
)

const highlightStyle = HighlightStyle.define([
  { tag: t.comment, color: '#6a9955' },
  { tag: t.lineComment, color: '#6a9955' },
  { tag: t.blockComment, color: '#6a9955' },
  { tag: t.keyword, color: '#569cd6' },
  { tag: t.controlKeyword, color: '#c586c0' },
  { tag: t.operatorKeyword, color: '#569cd6' },
  { tag: t.definitionKeyword, color: '#569cd6' },
  { tag: t.moduleKeyword, color: '#c586c0' },
  { tag: t.string, color: '#ce9178' },
  { tag: t.special(t.string), color: '#ce9178' },
  { tag: t.regexp, color: '#d16969' },
  { tag: t.number, color: '#b5cea8' },
  { tag: t.bool, color: '#569cd6' },
  { tag: t.null, color: '#569cd6' },
  { tag: t.variableName, color: '#9cdcfe' },
  { tag: t.definition(t.variableName), color: '#9cdcfe' },
  { tag: t.function(t.variableName), color: '#dcdcaa' },
  { tag: t.function(t.propertyName), color: '#dcdcaa' },
  { tag: t.propertyName, color: '#9cdcfe' },
  { tag: t.className, color: '#4ec9b0' },
  { tag: t.typeName, color: '#4ec9b0' },
  { tag: t.namespace, color: '#4ec9b0' },
  { tag: t.operator, color: '#d4d4d4' },
  { tag: t.punctuation, color: '#d4d4d4' },
  { tag: t.bracket, color: '#d4d4d4' },
  { tag: t.meta, color: '#9cdcfe' },
  { tag: t.invalid, color: '#f14c4c' },
])

export const cursorCodeMirrorExtensions: Extension[] = [
  editorTheme,
  syntaxHighlighting(highlightStyle),
]
