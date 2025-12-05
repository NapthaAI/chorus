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
  searchInPath: (query: string, pathPrefix: string) => WalkEntry[]
  getChildren: (folderPath: string) => WalkEntry[]
  getRootItems: () => WalkEntry[]
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
        // Return root-level items (files without "/" in path) to show both folders AND files
        const rootItems = files.filter(f => !f.relativePath.includes('/'))
        return rootItems.slice(0, 20)
      }

      const results = fuse.search(query, { limit: 20 })
      return results.map((r) => r.item)
    },
    [fuse, files]
  )

  // Search within a specific path prefix (for path filters like @src/)
  const searchInPath = useCallback(
    (query: string, pathPrefix: string): WalkEntry[] => {
      // Filter files to only those in the path
      const filesInPath = files.filter(f => f.relativePath.startsWith(pathPrefix))

      if (!query.trim()) {
        // No query - return direct children of the path
        const normalizedPath = pathPrefix.endsWith('/') ? pathPrefix.slice(0, -1) : pathPrefix
        const directChildren = filesInPath.filter(f => {
          const relativeToPrefx = f.relativePath.slice(pathPrefix.length)
          // Direct child has no more slashes
          return !relativeToPrefx.includes('/')
        })
        return directChildren.slice(0, 20)
      }

      // Create a Fuse instance for just these files
      const pathFuse = new Fuse(filesInPath, {
        keys: ['name', 'relativePath'],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
        fieldNormWeight: 1
      })

      const results = pathFuse.search(query, { limit: 20 })
      return results.map((r) => r.item)
    },
    [files]
  )

  // Manual refresh function (clears cache)
  const refresh = useCallback(async () => {
    if (workspacePath) {
      fileIndexCache.delete(workspacePath)
    }
    await loadFiles()
  }, [workspacePath, loadFiles])

  // Get direct children of a folder path
  const getChildren = useCallback(
    (folderPath: string): WalkEntry[] => {
      // Normalize folder path (remove trailing slash if present)
      const normalizedPath = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath

      return files.filter((f) => {
        // Get parent directory of the file
        const lastSlash = f.relativePath.lastIndexOf('/')
        const parentPath = lastSlash > 0 ? f.relativePath.slice(0, lastSlash) : ''

        return parentPath === normalizedPath
      })
    },
    [files]
  )

  // Get root-level items (files/folders with no parent path)
  const getRootItems = useCallback((): WalkEntry[] => {
    return files.filter((f) => !f.relativePath.includes('/'))
  }, [files])

  return {
    files,
    search,
    searchInPath,
    getChildren,
    getRootItems,
    isLoading,
    error,
    refresh
  }
}
