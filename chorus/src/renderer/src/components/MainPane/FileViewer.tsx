import { useEffect, useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { MarkdownContent } from '../Chat/MarkdownContent'

interface FileViewerProps {
  filePath: string
}

// SVG Icons
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25V6H9.75A1.75 1.75 0 018 4.25V1.5H3.75zm5.75.56v2.19c0 .138.112.25.25.25h2.19L9.5 2.06zM2 1.75C2 .784 2.784 0 3.75 0h5.086c.464 0 .909.184 1.237.513l3.414 3.414c.329.328.513.773.513 1.237v8.086A1.75 1.75 0 0112.25 15h-8.5A1.75 1.75 0 012 13.25V1.75z" />
  </svg>
)

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-muted">
    <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
  </svg>
)

const AlertIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M.5 1.75V14.25c0 .69.56 1.25 1.25 1.25h12.5c.69 0 1.25-.56 1.25-1.25V4.664a1.25 1.25 0 00-.366-.884l-2.914-2.914A1.25 1.25 0 0011.336.5H1.75C1.06.5.5 1.06.5 1.75zM2 1.75a.25.25 0 01.25-.25h9.086l3.164 3.164V14.25a.25.25 0 01-.25.25H2.25a.25.25 0 01-.25-.25V1.75zM4 4h5v3H4V4zm6.5 7a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
)

export function FileViewer({ filePath }: FileViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mode, setMode] = useState<'raw' | 'preview'>('preview')
  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Extract filename and extension
  const filename = filePath.split('/').pop() || ''
  const extension = filename.split('.').pop()?.toLowerCase() || ''
  const isMarkdown = extension === 'md'

  // Check if content has been modified
  const hasChanges = editedContent !== null && editedContent !== content

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    setEditedContent(null)
    setMode('preview')

    window.api.fs
      .readFile(filePath)
      .then((result) => {
        if (result.success && result.data !== undefined) {
          setContent(result.data)
        } else {
          setError(result.error || 'Failed to read file')
        }
      })
      .catch((err) => {
        setError(String(err))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [filePath])

  // Save handler
  const handleSave = async () => {
    if (!editedContent) return
    setIsSaving(true)
    try {
      const result = await window.api.fs.writeFile(filePath, editedContent)
      if (result.success) {
        setContent(editedContent)
        setEditedContent(null)
      } else {
        setError(result.error || 'Failed to save file')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSaving(false)
    }
  }

  // Get breadcrumb parts
  const pathParts = filePath.split('/').slice(-4)
  const breadcrumbs = pathParts.map((part, i) => ({
    name: part,
    isLast: i === pathParts.length - 1,
    isFile: i === pathParts.length - 1
  }))

  // Map extension to Prism language
  const language = getLanguage(extension)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-muted">
          <div className="w-5 h-5 border-2 border-muted border-t-transparent rounded-full animate-spin" />
          <span>Loading file...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <AlertIcon />
          </div>
          <p className="text-red-400 font-medium mb-2">Error loading file</p>
          <p className="text-sm text-muted max-w-md">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb header */}
      <div className="px-4 py-3 border-b border-default flex items-center justify-between bg-input/50">
        <div className="flex items-center text-sm">
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <ChevronRightIcon />}
              <span className={`flex items-center gap-1.5 px-1 ${part.isLast ? 'text-primary font-medium' : 'text-muted'}`}>
                {part.isFile ? <FileIcon /> : <FolderIcon />}
                {part.name}
              </span>
            </span>
          ))}
        </div>

        {/* Mode toggle for markdown files */}
        {isMarkdown && (
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
              >
                <SaveIcon />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
            <div className="flex rounded-md overflow-hidden border border-default">
              <button
                onClick={() => setMode('raw')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  mode === 'raw'
                    ? 'bg-accent text-white'
                    : 'bg-input text-secondary hover:bg-hover'
                }`}
              >
                Raw
              </button>
              <button
                onClick={() => setMode('preview')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  mode === 'preview'
                    ? 'bg-accent text-white'
                    : 'bg-input text-secondary hover:bg-hover'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File content */}
      <div className="flex-1 overflow-auto">
        {isMarkdown && mode === 'raw' ? (
          // Raw editing mode for markdown
          <textarea
            value={editedContent ?? content ?? ''}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-transparent text-primary resize-none focus:outline-none"
            spellCheck={false}
          />
        ) : isMarkdown && mode === 'preview' ? (
          // Preview mode for markdown
          <div className="p-6">
            <MarkdownContent content={content || ''} />
          </div>
        ) : (
          // Syntax highlighting for non-markdown files
          <Highlight theme={themes.vsDark} code={content || ''} language={language}>
            {({ style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className="code-block p-4 m-0 min-h-full"
                style={{ ...style, background: 'transparent' }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })} className="table-row hover:bg-hover/30">
                    <span className="table-cell pr-4 text-right text-muted select-none w-12 sticky left-0 bg-main">
                      {i + 1}
                    </span>
                    <span className="table-cell">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        )}
      </div>
    </div>
  )
}

function getLanguage(extension: string): string {
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    py: 'python',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
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
    hpp: 'cpp'
  }
  return languageMap[extension] || 'text'
}
