/**
 * Intent Matcher for Unreal Master Agent.
 * Maps natural language developer intent to matching workflows and recommended tool sequences.
 * Uses keyword scoring with domain boosting for accurate matching.
 */

import { getAllWorkflows, type Workflow } from './workflow-knowledge.js';

export interface IntentMatch {
  workflow: Workflow;
  score: number;
  matchedPatterns: string[];
}

export interface IntentMatchResult {
  query: string;
  matches: IntentMatch[];
  topRecommendation: Workflow | null;
  suggestedToolSequence: string[];
}

/**
 * Tokenize a string into lowercase words, stripping punctuation.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Calculate similarity score between a query and a pattern.
 * Uses token overlap with bonus for consecutive word matches.
 */
function patternScore(queryTokens: string[], pattern: string): number {
  const patternTokens = tokenize(pattern);
  if (patternTokens.length === 0) return 0;

  let matchCount = 0;
  let consecutiveBonus = 0;

  for (const pt of patternTokens) {
    if (queryTokens.includes(pt)) {
      matchCount++;
    }
  }

  // Bonus for consecutive token matches (phrase matching)
  const queryStr = queryTokens.join(' ');
  const patternStr = patternTokens.join(' ');
  if (queryStr.includes(patternStr)) {
    consecutiveBonus = patternTokens.length * 0.5;
  }

  // Normalize by pattern length to avoid bias toward short patterns
  const baseScore = matchCount / patternTokens.length;
  return baseScore + consecutiveBonus;
}

/**
 * Score a workflow against a query by checking intent patterns, name, description, and tags.
 */
function scoreWorkflow(
  queryTokens: string[],
  workflow: Workflow,
): { score: number; matchedPatterns: string[] } {
  let bestScore = 0;
  const matchedPatterns: string[] = [];

  // Score against each intent pattern (highest weight)
  for (const pattern of workflow.intentPatterns) {
    const s = patternScore(queryTokens, pattern);
    if (s > 0.3) {
      matchedPatterns.push(pattern);
    }
    if (s > bestScore) {
      bestScore = s;
    }
  }

  // Score against name (medium weight)
  const nameScore = patternScore(queryTokens, workflow.name) * 0.7;
  if (nameScore > bestScore) {
    bestScore = nameScore;
  }

  // Score against description (lower weight)
  const descTokens = tokenize(workflow.description);
  let descMatchCount = 0;
  for (const qt of queryTokens) {
    if (descTokens.includes(qt)) {
      descMatchCount++;
    }
  }
  const descScore = queryTokens.length > 0
    ? (descMatchCount / queryTokens.length) * 0.4
    : 0;
  if (descScore > bestScore) {
    bestScore = descScore;
  }

  // Tag bonus: each matching tag adds a small boost
  let tagBonus = 0;
  for (const tag of workflow.tags) {
    if (queryTokens.includes(tag)) {
      tagBonus += 0.1;
    }
  }

  return {
    score: bestScore + tagBonus,
    matchedPatterns,
  };
}

/**
 * Match a natural language intent query against the workflow knowledge base.
 * Returns ranked list of matching workflows with scores.
 */
export function matchIntent(query: string, maxResults = 5): IntentMatchResult {
  const queryTokens = tokenize(query);
  const workflows = getAllWorkflows();

  const scored: IntentMatch[] = workflows
    .map((workflow) => {
      const { score, matchedPatterns } = scoreWorkflow(queryTokens, workflow);
      return { workflow, score, matchedPatterns };
    })
    .filter((m) => m.score > 0.2) // Minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  const topRecommendation = scored.length > 0 ? scored[0].workflow : null;

  // Build suggested tool sequence from top match
  const suggestedToolSequence = topRecommendation
    ? topRecommendation.steps
        .filter((s) => !s.optional)
        .map((s) => s.tool)
    : [];

  return {
    query,
    matches: scored,
    topRecommendation,
    suggestedToolSequence,
  };
}

/**
 * Get workflow recommendations for a specific domain.
 */
export function getRecommendationsForDomain(
  domain: string,
  maxResults = 5,
): Workflow[] {
  return getAllWorkflows()
    .filter((w) => w.domain === domain)
    .slice(0, maxResults);
}
