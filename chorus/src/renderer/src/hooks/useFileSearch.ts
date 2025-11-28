import { useState, useEffect, useMemo, useCallback } from 'react'
import Fuse from 'fuse.js'

interface WalkEntry {
  name: string
  path: string
  isDirectory: boolean
  relativePath: string
}

interface UseFileSearchResult {
  files: WalkEntry[]
  search: (query: string) => WalkEntry[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// Cache file indexes by workspace path
const fileIndexCache = new Map<string, WalkEntry[]>()

export function useFileSearch(workspacePath: string | null): UseFileSearchResult {
  const [files, setFiles] = useState<WalkEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load files from workspace
  const loadFiles = useCallback(async () => {
    if (!workspacePath) {
      setFiles([])
      return
    }

    // Check cache first
    const cached = fileIndexCache.get(workspacePath)
    if (cached) {
      setFiles(cached)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.api.fs.walkDirectory(workspacePath, 5)
      if (result.success && result.data) {
        setFiles(result.data)
        fileIndexCache.set(workspacePath, result.data)
      } else {
        setError(result.error || 'Failed to load files')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }, [workspacePath])

  // Load files on workspace change
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Clear cache when workspace changes
  useEffect(() => {
    return () => {
      // Don't clear cache on unmount - it's useful to keep
    }
  }, [workspacePath])

  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(files, {
      keys: ['name', 'relativePath'],
      threshold: 0.4,
      includeScore: true,
      // Prioritize matches at the start of words
      ignoreLocation: true,
      // Weight name matches higher than path matches
      fieldNormWeight: 1
    })
  }, [files])

  // Search function
  const search = useCallback(
    (query: string): WalkEntry[] => {
      if (!query.trim()) {
        // Return first 10 files when no query
        return files.slice(0, 10)
      }

      const results = fuse.search(query, { limit: 10 })
      return results.map((r) => r.item)
    },
    [fuse, files]
  )

  // Manual refresh function (clears cache)
  const refresh = useCallback(async () => {
    if (workspacePath) {
      fileIndexCache.delete(workspacePath)
    }
    await loadFiles()
  }, [workspacePath, loadFiles])

  return {
    files,
    search,
    isLoading,
    error,
    refresh
  }
}
