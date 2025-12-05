import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorkspaceStore } from '../stores/workspace-store'

interface WalkEntry {
  name: string
  path: string
  isDirectory: boolean
  relativePath: string
}

interface ChangedFile {
  path: string
  status: 'M' | 'A' | 'D' | '?'
}

interface ChangedWalkEntry extends WalkEntry {
  status: 'M' | 'A' | 'D' | '?'
}

interface SmartSuggestions {
  changed: ChangedWalkEntry[]
  recent: WalkEntry[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// Cache for git changed files (per workspace, with timestamp)
const changedFilesCache = new Map<string, { files: ChangedFile[]; timestamp: number }>()
const CACHE_TTL = 5000 // 5 seconds

export function useSmartSuggestions(
  workspacePath: string | null,
  workspaceId: string | null,
  allFiles: WalkEntry[]
): SmartSuggestions {
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getRecentlyViewedFiles = useWorkspaceStore((state) => state.getRecentlyViewedFiles)

  // Fetch git changed files
  const fetchChangedFiles = useCallback(async () => {
    if (!workspacePath) {
      setChangedFiles([])
      return
    }

    // Check cache first
    const cached = changedFilesCache.get(workspacePath)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setChangedFiles(cached.files)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.git.getChangedFiles(workspacePath)
      if (result.success && result.data) {
        setChangedFiles(result.data)
        changedFilesCache.set(workspacePath, {
          files: result.data,
          timestamp: Date.now()
        })
      } else {
        setError(result.error || 'Failed to get changed files')
        setChangedFiles([])
      }
    } catch (err) {
      setError(String(err))
      setChangedFiles([])
    } finally {
      setIsLoading(false)
    }
  }, [workspacePath])

  // Fetch on mount and when workspace changes
  useEffect(() => {
    fetchChangedFiles()
  }, [fetchChangedFiles])

  // Manual refresh (clears cache)
  const refresh = useCallback(async () => {
    if (workspacePath) {
      changedFilesCache.delete(workspacePath)
    }
    await fetchChangedFiles()
  }, [workspacePath, fetchChangedFiles])

  // Convert changed files to WalkEntry format with status
  const changedSuggestions = useMemo((): ChangedWalkEntry[] => {
    if (changedFiles.length === 0 || allFiles.length === 0) return []

    return changedFiles
      .map((cf) => {
        // Find the file in allFiles to get full WalkEntry data
        const found = allFiles.find((f) => f.relativePath === cf.path)
        if (found) {
          return {
            ...found,
            status: cf.status
          }
        }
        // If not found in index (e.g., deleted file), create entry
        return {
          name: cf.path.split('/').pop() || cf.path,
          path: `${workspacePath}/${cf.path}`,
          relativePath: cf.path,
          isDirectory: false,
          status: cf.status
        }
      })
      .slice(0, 5) // Max 5 changed files
  }, [changedFiles, allFiles, workspacePath])

  // Convert recently viewed paths to WalkEntry format
  const recentSuggestions = useMemo((): WalkEntry[] => {
    if (!workspaceId || allFiles.length === 0) return []

    const recentPaths = getRecentlyViewedFiles(workspaceId)

    // Filter out files that are already in changed section
    const changedPaths = new Set(changedSuggestions.map((c) => c.relativePath))

    return recentPaths
      .filter((path) => !changedPaths.has(path))
      .map((path) => {
        // Convert absolute path to relative if needed
        const relativePath = workspacePath && path.startsWith(workspacePath)
          ? path.slice(workspacePath.length + 1)
          : path

        // Find in allFiles
        const found = allFiles.find((f) => f.path === path || f.relativePath === relativePath)
        if (found) return found

        // Create entry if not found
        return {
          name: path.split('/').pop() || path,
          path,
          relativePath,
          isDirectory: false
        }
      })
      .filter((entry) => entry !== null)
      .slice(0, 5) // Max 5 recent files
  }, [workspaceId, allFiles, getRecentlyViewedFiles, changedSuggestions, workspacePath])

  return {
    changed: changedSuggestions,
    recent: recentSuggestions,
    isLoading,
    error,
    refresh
  }
}
