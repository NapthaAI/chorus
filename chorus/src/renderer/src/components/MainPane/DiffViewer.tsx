import { useMemo } from 'react'

interface DiffViewerProps {
  filePath: string
  diff: string
  staged: boolean
  onClose: () => void
  onStage?: () => void
  onUnstage?: () => void
  onDiscard?: () => void
}

interface ParsedDiffLine {
  type: 'context' | 'add' | 'remove' | 'header' | 'info'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

function parseDiff(diff: string): ParsedDiffLine[] {
  if (!diff.trim()) {
    return [{ type: 'info', content: 'No changes to display' }]
  }

  const lines = diff.split('\n')
  const parsed: ParsedDiffLine[] = []

  let oldLine = 0
  let newLine = 0

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      parsed.push({ type: 'header', content: line })
    } else if (line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
      parsed.push({ type: 'info', content: line })
    } else if (line.startsWith('@@')) {
      // Parse hunk header: @@ -start,count +start,count @@
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLine = parseInt(match[1], 10)
        newLine = parseInt(match[2], 10)
      }
      parsed.push({ type: 'header', content: line })
    } else if (line.startsWith('+')) {
      parsed.push({
        type: 'add',
        content: line.substring(1),
        newLineNumber: newLine++
      })
    } else if (line.startsWith('-')) {
      parsed.push({
        type: 'remove',
        content: line.substring(1),
        oldLineNumber: oldLine++
      })
    } else if (line.startsWith(' ')) {
      parsed.push({
        type: 'context',
        content: line.substring(1),
        oldLineNumber: oldLine++,
        newLineNumber: newLine++
      })
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file"
      parsed.push({ type: 'info', content: line })
    } else if (line.trim() !== '') {
      parsed.push({
        type: 'context',
        content: line,
        oldLineNumber: oldLine++,
        newLineNumber: newLine++
      })
    }
  }

  return parsed
}

function DiffLine({ line }: { line: ParsedDiffLine }) {
  if (line.type === 'header') {
    return (
      <div className="flex bg-blue-950/30 text-blue-300 font-mono text-xs">
        <span className="w-20 px-2 py-0.5 text-right text-blue-400/50 select-none border-r border-blue-800/30">
          ...
        </span>
        <span className="flex-1 px-2 py-0.5">{line.content}</span>
      </div>
    )
  }

  if (line.type === 'info') {
    return (
      <div className="flex text-muted/60 font-mono text-xs italic">
        <span className="w-20 px-2 py-0.5 text-right select-none border-r border-default/30">
        </span>
        <span className="flex-1 px-2 py-0.5">{line.content}</span>
      </div>
    )
  }

  const bgClass =
    line.type === 'add'
      ? 'bg-green-950/40'
      : line.type === 'remove'
      ? 'bg-red-950/40'
      : ''

  const textClass =
    line.type === 'add'
      ? 'text-green-300'
      : line.type === 'remove'
      ? 'text-red-300'
      : 'text-muted'

  const lineNum = line.type === 'remove' ? line.oldLineNumber : line.newLineNumber

  const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '

  return (
    <div className={`flex font-mono text-xs ${bgClass}`}>
      <span className="w-10 px-2 py-0.5 text-right text-muted/40 select-none border-r border-default/30">
        {lineNum || ''}
      </span>
      <span className={`w-5 text-center py-0.5 ${textClass} select-none`}>
        {prefix}
      </span>
      <span className={`flex-1 px-1 py-0.5 whitespace-pre ${textClass}`}>
        {line.content || ' '}
      </span>
    </div>
  )
}

function DiffStats({ lines }: { lines: ParsedDiffLine[] }) {
  const stats = useMemo(() => {
    let additions = 0
    let deletions = 0
    for (const line of lines) {
      if (line.type === 'add') additions++
      if (line.type === 'remove') deletions++
    }
    return { additions, deletions }
  }, [lines])

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-green-400">+{stats.additions}</span>
      <span className="text-red-400">-{stats.deletions}</span>
    </div>
  )
}

// Icons
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
  </svg>
)

const StageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z" />
  </svg>
)

const UnstageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 8a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7A.5.5 0 014 8z" />
  </svg>
)

const DiscardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1a7 7 0 11-4.95 11.95l-.707.707A8 8 0 108 0v1z" />
    <path d="M7.5 3v5.293L5.354 6.146a.5.5 0 10-.708.708l3 3a.5.5 0 00.708 0l3-3a.5.5 0 00-.708-.708L8.5 8.293V3a.5.5 0 00-1 0z" />
  </svg>
)

const StagedIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-green-400">
    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
  </svg>
)

export function DiffViewer({
  filePath,
  diff,
  staged,
  onClose,
  onStage,
  onUnstage,
  onDiscard
}: DiffViewerProps) {
  const parsedLines = useMemo(() => parseDiff(diff), [diff])

  return (
    <div className="flex flex-col h-full bg-main">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-default bg-surface">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-primary truncate">{filePath}</span>
          {staged && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-950/30 px-1.5 py-0.5 rounded">
              <StagedIcon />
              Staged
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-muted hover:text-primary rounded hover:bg-hover transition-colors"
          title="Close diff"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {parsedLines.map((line, i) => (
          <DiffLine key={i} line={line} />
        ))}
      </div>

      {/* Footer with stats and actions */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-default bg-surface">
        <DiffStats lines={parsedLines} />
        <div className="flex items-center gap-2">
          {staged && onUnstage && (
            <button
              onClick={onUnstage}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            >
              <UnstageIcon />
              Unstage
            </button>
          )}
          {!staged && onStage && (
            <button
              onClick={onStage}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <StageIcon />
              Stage
            </button>
          )}
          {onDiscard && (
            <button
              onClick={onDiscard}
              className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              <DiscardIcon />
              Discard
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
