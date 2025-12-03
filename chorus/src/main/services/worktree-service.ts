/**
 * Worktree Service (Sprint 16)
 *
 * Manages git worktrees for agent conversation isolation.
 * Each conversation can have its own worktree, enabling concurrent
 * agents to work on different branches without filesystem conflicts.
 */

import * as path from 'path'
import * as fs from 'fs/promises'
import * as gitService from './git-service'
import { GitSettings, DEFAULT_GIT_SETTINGS } from '../store'

const WORKTREE_DIR = '.chorus-worktrees'

/**
 * Get the worktree base directory path for a workspace
 */
export function getWorktreeBaseDir(repoPath: string): string {
  return path.join(repoPath, WORKTREE_DIR)
}

/**
 * Get the worktree path for a specific conversation
 */
export function getConversationWorktreePath(repoPath: string, conversationId: string): string {
  return path.join(getWorktreeBaseDir(repoPath), conversationId)
}

/**
 * Ensure .chorus-worktrees is in .gitignore
 */
export async function ensureWorktreeGitignore(repoPath: string): Promise<void> {
  const gitignorePath = path.join(repoPath, '.gitignore')

  try {
    let content = ''
    try {
      content = await fs.readFile(gitignorePath, 'utf-8')
    } catch {
      // File doesn't exist, will create
    }

    if (!content.includes(WORKTREE_DIR)) {
      const newContent =
        content + (content.endsWith('\n') ? '' : '\n') + `\n# Chorus agent worktrees\n${WORKTREE_DIR}/\n`
      await fs.writeFile(gitignorePath, newContent)
      console.log(`[Worktree] Added ${WORKTREE_DIR}/ to .gitignore`)
    }
  } catch (error) {
    console.error('[Worktree] Failed to update .gitignore:', error)
  }
}

/**
 * Create or get worktree for a conversation
 *
 * @param repoPath - Path to the main repository
 * @param conversationId - Conversation ID (used for worktree directory name)
 * @param branchName - Branch to checkout in the worktree
 * @param gitSettings - Git settings from workspace
 * @returns Worktree path if created/exists, null if worktrees disabled
 */
export async function ensureConversationWorktree(
  repoPath: string,
  conversationId: string,
  branchName: string,
  gitSettings: GitSettings = DEFAULT_GIT_SETTINGS
): Promise<string | null> {
  if (!gitSettings.useWorktrees) {
    console.log('[Worktree] Worktrees disabled in settings')
    return null
  }

  const worktreePath = getConversationWorktreePath(repoPath, conversationId)

  // Check if worktree already exists
  const worktrees = await gitService.listWorktrees(repoPath)
  const existing = worktrees.find((w) => w.path === worktreePath)

  if (existing) {
    console.log(`[Worktree] Reusing existing worktree: ${worktreePath}`)
    return worktreePath
  }

  try {
    // Ensure parent directory exists
    const baseDir = getWorktreeBaseDir(repoPath)
    await fs.mkdir(baseDir, { recursive: true })

    // Ensure .gitignore excludes worktrees
    await ensureWorktreeGitignore(repoPath)

    // Get default branch for creating new branches from
    const defaultBranch = (await gitService.getDefaultBranch(repoPath)) || 'main'

    // Create worktree
    await gitService.createWorktree(repoPath, worktreePath, branchName, defaultBranch)

    console.log(`[Worktree] Created worktree: ${worktreePath} on branch ${branchName}`)
    return worktreePath
  } catch (error) {
    console.error('[Worktree] Failed to create worktree:', error)
    return null
  }
}

/**
 * Remove conversation worktree
 *
 * @param repoPath - Path to main repository
 * @param conversationId - Conversation ID
 * @param force - Force removal even with uncommitted changes
 */
export async function removeConversationWorktree(
  repoPath: string,
  conversationId: string,
  force: boolean = false
): Promise<void> {
  const worktreePath = getConversationWorktreePath(repoPath, conversationId)

  // Check if worktree exists
  const worktrees = await gitService.listWorktrees(repoPath)
  const exists = worktrees.find((w) => w.path === worktreePath)

  if (!exists) {
    console.log(`[Worktree] Worktree not found for conversation ${conversationId}`)
    return
  }

  // Check for uncommitted changes first
  if (!force) {
    const status = await gitService.getWorktreeStatus(worktreePath)
    if (status.isDirty) {
      throw new Error('Worktree has uncommitted changes. Use force=true to remove anyway.')
    }
  }

  await gitService.removeWorktree(repoPath, worktreePath, force)
  console.log(`[Worktree] Removed worktree: ${worktreePath}`)
}

/**
 * Get all conversation worktrees for a workspace
 */
export async function getWorkspaceWorktrees(
  repoPath: string
): Promise<Array<gitService.WorktreeInfo & { conversationId: string }>> {
  const worktrees = await gitService.listWorktrees(repoPath)
  const baseDir = getWorktreeBaseDir(repoPath)

  return worktrees
    .filter((w) => w.path.startsWith(baseDir))
    .map((w) => ({
      ...w,
      conversationId: path.basename(w.path)
    }))
}

/**
 * Get the working directory for an agent conversation.
 * Returns worktree path if enabled and available, otherwise main repo path.
 *
 * This is the main entry point for agent services to get the correct cwd.
 *
 * @param conversationId - Conversation ID
 * @param agentName - Agent name (for branch naming)
 * @param repoPath - Main repository path
 * @param gitSettings - Git settings from workspace
 * @returns Object with cwd, branchName, and worktreePath
 */
export async function getAgentWorkingDirectory(
  conversationId: string,
  agentName: string,
  repoPath: string,
  gitSettings: GitSettings = DEFAULT_GIT_SETTINGS
): Promise<{ cwd: string; branchName: string | null; worktreePath: string | null }> {
  // If auto-branching is disabled, just use main repo
  if (!gitSettings.autoBranch) {
    return { cwd: repoPath, branchName: null, worktreePath: null }
  }

  // Generate branch name
  const branchName = generateAgentBranchName(agentName, conversationId.slice(0, 7))

  // If worktrees disabled, fall back to branch-switching (legacy mode)
  if (!gitSettings.useWorktrees) {
    // Note: The actual checkout happens in agent-sdk-service.ts via ensureAgentBranch
    return { cwd: repoPath, branchName, worktreePath: null }
  }

  // Worktree mode: create isolated working directory
  const worktreePath = await ensureConversationWorktree(
    repoPath,
    conversationId,
    branchName,
    gitSettings
  )

  return {
    cwd: worktreePath || repoPath,
    branchName,
    worktreePath
  }
}

/**
 * Generate a branch name for an agent session
 */
export function generateAgentBranchName(agentName: string, sessionId: string): string {
  const sanitizedAgentName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '-')
  return `agent/${sanitizedAgentName}/${sessionId}`
}

/**
 * Prune all stale worktrees for a workspace
 * Call this on app startup to clean up orphaned worktree entries
 */
export async function pruneStaleWorktrees(repoPath: string): Promise<void> {
  try {
    await gitService.pruneWorktrees(repoPath)
    console.log(`[Worktree] Pruned stale worktrees for ${repoPath}`)
  } catch (error) {
    console.error(`[Worktree] Failed to prune worktrees:`, error)
  }
}
