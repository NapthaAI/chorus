import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { python } from '@codemirror/lang-python'
import type { Extension } from '@codemirror/state'

// Map file extensions to language identifiers
const extensionToLanguage: Record<string, string> = {
  // JavaScript family
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  // Data formats
  json: 'json',
  jsonc: 'json',
  // Markup
  md: 'markdown',
  mdx: 'markdown',
  html: 'html',
  htm: 'html',
  // Styles
  css: 'css',
  scss: 'css',
  less: 'css',
  // Python
  py: 'python',
  pyw: 'python',
  // Config files (treat as their actual format)
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  // Other languages (no CodeMirror support yet, will be plain text)
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  rb: 'ruby',
  php: 'php',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  xml: 'xml',
  svg: 'xml'
}

// Languages that have CodeMirror support
const supportedLanguages = new Set([
  'javascript',
  'jsx',
  'typescript',
  'tsx',
  'json',
  'markdown',
  'html',
  'css',
  'python'
])

/**
 * Get the language identifier from a file extension
 */
export function getLanguageFromExtension(extension: string): string {
  const ext = extension.toLowerCase().replace(/^\./, '')
  return extensionToLanguage[ext] || 'text'
}

/**
 * Check if a language has CodeMirror syntax highlighting support
 */
export function isLanguageSupported(language: string): boolean {
  return supportedLanguages.has(language)
}

/**
 * Get CodeMirror language extension for a given language identifier
 * Returns null for unsupported languages (they will still be editable, just without highlighting)
 */
export function getLanguageExtension(language: string): Extension | null {
  switch (language) {
    case 'javascript':
      return javascript({ jsx: false })
    case 'jsx':
      return javascript({ jsx: true })
    case 'typescript':
      return javascript({ typescript: true, jsx: false })
    case 'tsx':
      return javascript({ typescript: true, jsx: true })
    case 'json':
      return json()
    case 'markdown':
      return markdown()
    case 'html':
      return html()
    case 'css':
      return css()
    case 'python':
      return python()
    default:
      return null
  }
}
