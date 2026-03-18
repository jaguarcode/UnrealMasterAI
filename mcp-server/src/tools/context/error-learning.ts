/**
 * Error Learning System for Unreal Master Agent.
 * Captures error resolution patterns during troubleshooting and replays them for future similar errors.
 *
 * Flow:
 *   1. Developer request → tool call fails with an error
 *   2. Troubleshooting: try different approaches, find a fix
 *   3. context-recordResolution: capture the error, attempted fixes, and the successful resolution
 *   4. Next time a similar error occurs → context-matchError returns the proven resolution
 *
 * Error similarity uses token overlap + error code matching + tool context matching.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import type { McpToolResult } from '../editor/ping.js';
import { getRecoveryStrategy, type RecoveryStrategy } from './error-recovery.js';
import { tokenize } from '../../utils/tokenize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.UMA_DATA_DIR
  || join(homedir(), '.unreal-master', 'data');
const RESOLUTIONS_FILE = join(DATA_DIR, 'error-resolutions.json');

// ── Types ──

export interface AttemptedFix {
  action: string;
  toolUsed?: string;
  result: 'success' | 'failure' | 'partial';
  notes?: string;
}

export interface ErrorResolution {
  id: string;
  /** The error message or pattern that was encountered */
  errorMessage: string;
  /** Categorized error type (compile-error, asset-not-found, etc.) */
  errorType: string;
  /** The tool that produced the error */
  sourceTool: string;
  /** What the developer was trying to accomplish */
  developerIntent: string;
  /** Fixes that were attempted (including failures — useful for avoiding dead ends) */
  attemptedFixes: AttemptedFix[];
  /** The fix that ultimately resolved the error */
  successfulFix: {
    description: string;
    toolSequence: string[];
    steps: string[];
  };
  /** Root cause analysis */
  rootCause: string;
  /** Tags for searchability */
  tags: string[];
  /** Number of times this resolution has been successfully reused */
  reuseCount: number;
  /** Timestamps */
  createdAt: number;
  lastUsedAt: number;
}

export interface ErrorMatchResult {
  resolution: ErrorResolution;
  similarity: number;
  matchReason: string;
}

export interface EnhancedRecovery {
  /** Static builtin strategy (if any) */
  builtinStrategy: RecoveryStrategy | null;
  /** Learned resolutions ranked by similarity */
  learnedResolutions: ErrorMatchResult[];
  /** Combined recommendation */
  recommendation: {
    steps: string[];
    toolSequence: string[];
    confidence: number;
    source: 'learned' | 'builtin' | 'combined';
    avoidActions: string[];
  };
}

// ── Persistence ──

interface StoredResolutions {
  version: number;
  updatedAt: number;
  resolutions: ErrorResolution[];
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadResolutions(): ErrorResolution[] {
  try {
    if (existsSync(RESOLUTIONS_FILE)) {
      const raw = readFileSync(RESOLUTIONS_FILE, 'utf-8');
      const data: StoredResolutions = JSON.parse(raw);
      return data.resolutions;
    }
  } catch {
    // Corrupted — start fresh
  }
  return [];
}

function saveResolutions(resolutions: ErrorResolution[]): void {
  ensureDataDir();
  const data: StoredResolutions = {
    version: 1,
    updatedAt: Date.now(),
    resolutions,
  };
  writeFileSync(RESOLUTIONS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Error Similarity Engine ──

/**
 * Compute similarity between two error messages.
 * Combines token overlap, error-type matching, and tool-context matching.
 */
function errorSimilarity(
  queryError: string,
  queryTool: string,
  queryType: string,
  stored: ErrorResolution,
): { score: number; reason: string } {
  const reasons: string[] = [];
  let score = 0;

  // 1. Error type exact match (strong signal)
  if (queryType && queryType === stored.errorType) {
    score += 0.3;
    reasons.push('same error type');
  }

  // 2. Source tool match (medium signal)
  if (queryTool && queryTool === stored.sourceTool) {
    score += 0.15;
    reasons.push('same tool');
  }

  // 3. Error message token similarity
  const queryTokens = tokenize(queryError);
  const storedTokens = tokenize(stored.errorMessage);

  if (queryTokens.length > 0 && storedTokens.length > 0) {
    let matchCount = 0;
    for (const qt of queryTokens) {
      if (storedTokens.includes(qt)) matchCount++;
    }
    const overlap = matchCount / Math.max(queryTokens.length, storedTokens.length);
    score += overlap * 0.4;
    if (overlap > 0.3) {
      reasons.push(`${Math.round(overlap * 100)}% message overlap`);
    }
  }

  // 4. Error code / identifier match (e.g., "E0312", "UE-12345")
  const errorCodePattern = /\b([A-Z]{1,3}[-_]?\d{3,6})\b/gi;
  const queryCodes = new Set((queryError.match(errorCodePattern) ?? []).map((c) => c.toUpperCase()));
  const storedCodes = new Set((stored.errorMessage.match(errorCodePattern) ?? []).map((c) => c.toUpperCase()));
  for (const code of queryCodes) {
    if (storedCodes.has(code)) {
      score += 0.25;
      reasons.push(`error code match: ${code}`);
      break;
    }
  }

  // 5. Reuse bonus — resolutions that have been reused successfully are more trustworthy
  if (stored.reuseCount > 0) {
    score += Math.min(stored.reuseCount * 0.02, 0.1);
    reasons.push(`reused ${stored.reuseCount}x`);
  }

  return {
    score: Math.min(score, 1),
    reason: reasons.join(', ') || 'weak match',
  };
}

// ── Core Functions ──

/**
 * Record a successful error resolution for future reuse.
 */
export function addResolution(resolution: ErrorResolution): void {
  const existing = loadResolutions();
  // Replace if same id exists
  const filtered = existing.filter((r) => r.id !== resolution.id);
  filtered.push(resolution);
  // Keep last 200 resolutions
  if (filtered.length > 200) {
    filtered.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    filtered.splice(200);
  }
  saveResolutions(filtered);
}

/**
 * Find matching resolutions for a given error, combining builtin strategies with learned resolutions.
 */
export function matchError(
  errorMessage: string,
  sourceTool: string,
  errorType?: string,
  maxResults = 5,
): EnhancedRecovery {
  const type = errorType ?? inferErrorType(errorMessage, sourceTool);

  // Get builtin strategy
  const builtinStrategy = getRecoveryStrategy(type) ?? null;

  // Search learned resolutions
  const resolutions = loadResolutions();
  const matches: ErrorMatchResult[] = resolutions
    .map((resolution) => {
      const { score, reason } = errorSimilarity(errorMessage, sourceTool, type, resolution);
      return { resolution, similarity: score, matchReason: reason };
    })
    .filter((m) => m.similarity > 0.2)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  // Build combined recommendation
  const recommendation = buildRecommendation(builtinStrategy, matches);

  return {
    builtinStrategy,
    learnedResolutions: matches,
    recommendation,
  };
}

/**
 * Increment the reuse count of a resolution when it's applied successfully.
 */
export function markResolutionReused(resolutionId: string): boolean {
  const resolutions = loadResolutions();
  const target = resolutions.find((r) => r.id === resolutionId);
  if (!target) return false;
  target.reuseCount++;
  target.lastUsedAt = Date.now();
  saveResolutions(resolutions);
  return true;
}

/**
 * Get all stored resolutions, optionally filtered by error type or tool.
 */
export function getResolutions(filter?: { errorType?: string; sourceTool?: string }): ErrorResolution[] {
  let resolutions = loadResolutions();
  if (filter?.errorType) {
    resolutions = resolutions.filter((r) => r.errorType === filter.errorType);
  }
  if (filter?.sourceTool) {
    resolutions = resolutions.filter((r) => r.sourceTool === filter.sourceTool);
  }
  return resolutions;
}

export function clearResolutions(): void {
  saveResolutions([]);
}

// ── Helpers ──

/**
 * Infer the error type from the error message and source tool when not explicitly provided.
 */
function inferErrorType(errorMessage: string, sourceTool: string): string {
  const msg = errorMessage.toLowerCase();

  if (msg.includes('compile') || msg.includes('compilation')) return 'compile-error';
  if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('missing')) {
    if (msg.includes('asset') || msg.includes('path') || msg.includes('content')) return 'asset-not-found';
    if (msg.includes('node') || msg.includes('class') || msg.includes('function')) return 'blueprint-node-not-found';
    return 'missing-dependency';
  }
  if (msg.includes('pin') || msg.includes('connection') || msg.includes('incompatible')) return 'pin-connection-failure';
  if (msg.includes('permission') || msg.includes('denied') || msg.includes('blocked')) return 'permission-denied';
  if (msg.includes('locked') || msg.includes('checkout')) return 'asset-locked';
  if (msg.includes('material') && (msg.includes('error') || msg.includes('failed'))) return 'material-compile-error';
  if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
  if (msg.includes('disconnect') || msg.includes('websocket')) return 'connection-error';

  // Infer from source tool
  if (sourceTool.startsWith('blueprint-')) return 'blueprint-error';
  if (sourceTool.startsWith('material-')) return 'material-error';
  if (sourceTool.startsWith('actor-')) return 'actor-error';
  if (sourceTool.startsWith('asset-')) return 'asset-error';

  return 'unknown';
}

/**
 * Build a combined recommendation from builtin strategy and learned resolutions.
 * Learned resolutions take priority when they have high similarity scores.
 */
function buildRecommendation(
  builtin: RecoveryStrategy | null,
  learned: ErrorMatchResult[],
): EnhancedRecovery['recommendation'] {
  const topLearned = learned.length > 0 ? learned[0] : null;

  // Collect actions to avoid from failed attempts in learned resolutions
  const avoidActions: string[] = [];
  for (const match of learned) {
    for (const attempt of match.resolution.attemptedFixes) {
      if (attempt.result === 'failure') {
        avoidActions.push(attempt.action);
      }
    }
  }
  const uniqueAvoid = [...new Set(avoidActions)];

  // Case 1: Strong learned match — prefer it
  if (topLearned && topLearned.similarity >= 0.5) {
    const res = topLearned.resolution;
    return {
      steps: res.successfulFix.steps,
      toolSequence: res.successfulFix.toolSequence,
      confidence: topLearned.similarity,
      source: builtin ? 'combined' : 'learned',
      avoidActions: uniqueAvoid,
    };
  }

  // Case 2: Moderate learned match + builtin — combine both
  if (topLearned && topLearned.similarity >= 0.3 && builtin) {
    const combinedSteps = [
      ...builtin.steps,
      `--- Learned resolution (${Math.round(topLearned.similarity * 100)}% match) ---`,
      `Root cause from past case: ${topLearned.resolution.rootCause}`,
      ...topLearned.resolution.successfulFix.steps,
    ];
    const combinedTools = [...new Set([
      ...builtin.suggestedTools,
      ...topLearned.resolution.successfulFix.toolSequence,
    ])];

    return {
      steps: combinedSteps,
      toolSequence: combinedTools,
      confidence: Math.max(topLearned.similarity, 0.4),
      source: 'combined',
      avoidActions: uniqueAvoid,
    };
  }

  // Case 3: Builtin only
  if (builtin) {
    return {
      steps: builtin.steps,
      toolSequence: builtin.suggestedTools,
      confidence: 0.3,
      source: 'builtin',
      avoidActions: uniqueAvoid,
    };
  }

  // Case 4: Weak learned match only
  if (topLearned) {
    const res = topLearned.resolution;
    return {
      steps: [
        `Partial match from past resolution (${Math.round(topLearned.similarity * 100)}% similar):`,
        `Root cause was: ${res.rootCause}`,
        ...res.successfulFix.steps,
      ],
      toolSequence: res.successfulFix.toolSequence,
      confidence: topLearned.similarity * 0.8,
      source: 'learned',
      avoidActions: uniqueAvoid,
    };
  }

  // Case 5: No match at all
  return {
    steps: [
      'No matching resolution found in knowledge base.',
      'Troubleshoot manually and use context-recordResolution to capture the fix for future reuse.',
    ],
    toolSequence: [],
    confidence: 0,
    source: 'builtin',
    avoidActions: [],
  };
}

// ── MCP Tool Handlers ──

export interface RecordResolutionParams {
  errorMessage: string;
  errorType?: string;
  sourceTool: string;
  developerIntent: string;
  attemptedFixes: Array<{
    action: string;
    toolUsed?: string;
    result: 'success' | 'failure' | 'partial';
    notes?: string;
  }>;
  successfulFix: {
    description: string;
    toolSequence: string[];
    steps: string[];
  };
  rootCause: string;
  tags?: string[];
}

export interface MatchErrorParams {
  errorMessage: string;
  sourceTool: string;
  errorType?: string;
  maxResults?: number;
}

export interface MarkReusedParams {
  resolutionId: string;
}

export interface ListResolutionsParams {
  errorType?: string;
  sourceTool?: string;
}

/**
 * Record a successful error resolution for future reuse.
 */
export async function contextRecordResolution(
  params: RecordResolutionParams,
): Promise<McpToolResult> {
  try {
    const id = `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const resolution: ErrorResolution = {
      id,
      errorMessage: params.errorMessage,
      errorType: params.errorType ?? inferErrorType(params.errorMessage, params.sourceTool),
      sourceTool: params.sourceTool,
      developerIntent: params.developerIntent,
      attemptedFixes: params.attemptedFixes,
      successfulFix: params.successfulFix,
      rootCause: params.rootCause,
      tags: params.tags ?? [],
      reuseCount: 0,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    addResolution(resolution);

    const totalResolutions = loadResolutions().length;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          message: `Error resolution recorded and persisted. Will be suggested for similar errors in the future.`,
          id: resolution.id,
          errorType: resolution.errorType,
          failedApproaches: resolution.attemptedFixes.filter((a) => a.result === 'failure').length,
          totalResolutions,
        }),
      }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

/**
 * Find matching past resolutions for a current error.
 */
export async function contextMatchError(
  params: MatchErrorParams,
): Promise<McpToolResult> {
  try {
    const result = matchError(
      params.errorMessage,
      params.sourceTool,
      params.errorType,
      params.maxResults ?? 5,
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          hasBuiltinStrategy: result.builtinStrategy !== null,
          learnedMatchCount: result.learnedResolutions.length,
          recommendation: {
            steps: result.recommendation.steps,
            toolSequence: result.recommendation.toolSequence,
            confidence: Math.round(result.recommendation.confidence * 100) / 100,
            source: result.recommendation.source,
            avoidActions: result.recommendation.avoidActions,
          },
          learnedResolutions: result.learnedResolutions.map((m) => ({
            id: m.resolution.id,
            similarity: Math.round(m.similarity * 100) / 100,
            matchReason: m.matchReason,
            errorType: m.resolution.errorType,
            rootCause: m.resolution.rootCause,
            successfulFix: m.resolution.successfulFix.description,
            reuseCount: m.resolution.reuseCount,
          })),
        }),
      }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

/**
 * Mark a resolution as successfully reused, boosting its future ranking.
 */
export async function contextMarkResolutionReused(
  params: MarkReusedParams,
): Promise<McpToolResult> {
  try {
    const updated = markResolutionReused(params.resolutionId);
    if (!updated) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            error: `Resolution "${params.resolutionId}" not found.`,
          }),
        }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          message: `Resolution "${params.resolutionId}" marked as reused. Its ranking will be boosted for future matches.`,
        }),
      }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}

/**
 * List all stored error resolutions, optionally filtered.
 */
export async function contextListResolutions(
  params: ListResolutionsParams,
): Promise<McpToolResult> {
  try {
    const resolutions = getResolutions(params);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'success',
          count: resolutions.length,
          resolutions: resolutions.map((r) => ({
            id: r.id,
            errorType: r.errorType,
            sourceTool: r.sourceTool,
            rootCause: r.rootCause,
            successfulFix: r.successfulFix.description,
            reuseCount: r.reuseCount,
            createdAt: r.createdAt,
            tags: r.tags,
          })),
        }),
      }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: message }) }],
    };
  }
}
