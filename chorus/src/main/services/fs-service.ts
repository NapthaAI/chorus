import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync, rmdirSync, renameSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'

export interface DirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
}

export interface WalkEntry extends DirectoryEntry {
  relativePath: string // Path relative to walk root for display
}

// Max file size to read (1MB)
const MAX_FILE_SIZE = 1024 * 1024

// Hidden files/directories to always hide (except .claude)
const HIDDEN_PATTERNS = [
  /^\.git$/,
  /^\.DS_Store$/,
  /^\.vscode$/,
  /^\.idea$/,
  /^node_modules$/,
  /^\.next$/,
  /^\.nuxt$/,
  /^dist$/,
  /^build$/,
  /^out$/,
  /^\.cache$/,
  /^\.parcel-cache$/,
  /^coverage$/,
  /^__pycache__$/,
  /^\.pytest_cache$/,
  /^\.mypy_cache$/,
  /^\.tox$/,
  /^\.eggs$/,
  /^\.egg-info$/,
  /^\.venv$/,
  /^venv$/,
  /^env$/,
  /^\.env\.local$/
]

function shouldHide(name: string): boolean {
  // Always show .claude directory
  if (name === '.claude') return false

  // Hide files matching patterns
  return HIDDEN_PATTERNS.some((pattern) => pattern.test(name))
}

/**
 * List directory contents, sorted with directories first
 */
export async function listDirectory(dirPath: string): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = []

  const items = readdirSync(dirPath)

  for (const name of items) {
    if (shouldHide(name)) continue

    const fullPath = join(dirPath, name)
    try {
      const stats = statSync(fullPath)
      entries.push({
        name,
        path: fullPath,
        isDirectory: stats.isDirectory()
      })
    } catch {
      // Skip files we can't stat
    }
  }

  // Sort: directories first, then alphabetically
  entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.name.localeCompare(b.name)
  })

  return entries
}

/**
 * Read file contents
 */
export async function readFile(filePath: string): Promise<string> {
  const stats = statSync(filePath)

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large (${Math.round(stats.size / 1024)}KB). Maximum size is ${MAX_FILE_SIZE / 1024}KB.`
    )
  }

  // Check if file is binary
  const content = readFileSync(filePath)

  // Simple binary detection: check for null bytes in first 8KB
  const sample = content.slice(0, 8192)
  const hasNullByte = sample.includes(0)

  if (hasNullByte) {
    throw new Error('Binary file cannot be displayed')
  }

  return content.toString('utf-8')
}

/**
 * Write file contents
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Recursively walk directory and return all files/folders up to maxDepth
 */
export async function walkDirectory(
  rootPath: string,
  maxDepth: number = 5
): Promise<WalkEntry[]> {
  const entries: WalkEntry[] = []

  function walk(dirPath: string, currentDepth: number): void {
    if (currentDepth > maxDepth) return

    try {
      const items = readdirSync(dirPath)

      for (const name of items) {
        if (shouldHide(name)) continue

        const fullPath = join(dirPath, name)
        try {
          const stats = statSync(fullPath)
          const isDir = stats.isDirectory()

          // Calculate relative path from root
          const relativePath = fullPath.slice(rootPath.length + 1)

          entries.push({
            name,
            path: fullPath,
            isDirectory: isDir,
            relativePath
          })

          // Recurse into directories
          if (isDir) {
            walk(fullPath, currentDepth + 1)
          }
        } catch {
          // Skip files we can't stat (permission errors, etc.)
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(rootPath, 0)

  // Sort: directories first, then alphabetically by relative path
  entries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1
    if (!a.isDirectory && b.isDirectory) return 1
    return a.relativePath.localeCompare(b.relativePath)
  })

  return entries
}

/**
 * Delete a file or directory (recursive)
 */
export async function deleteFile(filePath: string): Promise<void> {
  const stats = statSync(filePath)
  if (stats.isDirectory()) {
    rmdirSync(filePath, { recursive: true })
  } else {
    unlinkSync(filePath)
  }
}

/**
 * Rename/move a file or directory
 */
export async function renameFile(oldPath: string, newPath: string): Promise<void> {
  renameSync(oldPath, newPath)
}

/**
 * Create a new file with optional content
 */
export async function createFile(filePath: string, content: string = ''): Promise<void> {
  // Create parent directory if it doesn't exist
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, content, 'utf-8')
}

/**
 * Create a new directory
 */
export async function createDirectory(dirPath: string): Promise<void> {
  mkdirSync(dirPath, { recursive: true })
}

/**
 * Check if path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  return existsSync(filePath)
}
