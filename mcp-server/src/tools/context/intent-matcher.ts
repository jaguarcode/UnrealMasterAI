/**
 * Intent Matcher for Unreal Master Agent.
 * Maps natural language developer intent to matching workflows and recommended tool sequences.
 * Uses keyword scoring with domain boosting, UE synonym expansion, and outcome-weighted confidence.
 */

import { getAllWorkflows, type Workflow } from './workflow-knowledge.js';
import { getOutcomeStats } from './workflow-store.js';
import { tokenize } from '../../utils/tokenize.js';

export interface IntentMatch {
  workflow: Workflow;
  score: number;
  confidence: number;
  matchedPatterns: string[];
  outcomeInfo?: {
    successRate: number;
    totalExecutions: number;
    recentTrend: string;
  };
}

export interface IntentMatchResult {
  query: string;
  matches: IntentMatch[];
  topRecommendation: Workflow | null;
  suggestedToolSequence: string[];
  confidence: number;
}

/**
 * UE-specific synonym groups for intent expansion.
 * When a developer says "mesh", they might mean "static mesh", "skeletal mesh", etc.
 */
const UE_SYNONYMS: Record<string, string[]> = {
  // Actors & Objects
  actor: ['object', 'entity', 'pawn', 'instance'],
  blueprint: ['bp', 'visual script', 'graph'],
  component: ['comp', 'part', 'module'],

  // Rendering & Visuals
  material: ['mat', 'shader', 'surface'],
  texture: ['tex', 'image', 'bitmap', 'map'],
  mesh: ['model', 'geometry', 'object', '3d'],
  'static mesh': ['sm', 'prop', 'static model'],
  'skeletal mesh': ['sk', 'skeleton', 'rigged mesh', 'character mesh'],
  niagara: ['vfx', 'particles', 'effects', 'particle system', 'fx'],
  landscape: ['terrain', 'ground', 'heightmap', 'land'],
  foliage: ['vegetation', 'trees', 'grass', 'plants', 'flora'],

  // Animation
  animation: ['anim', 'motion', 'movement'],
  montage: ['one-shot', 'triggered anim', 'action anim'],
  'blend space': ['blendspace', 'motion blend', 'locomotion blend'],
  'state machine': ['fsm', 'anim states', 'animation states'],
  'anim blueprint': ['abp', 'animation bp', 'anim bp'],

  // UI
  widget: ['ui', 'umg', 'interface', 'hud element'],
  hud: ['heads up display', 'overlay', 'game ui'],
  button: ['btn', 'clickable', 'press'],
  menu: ['screen', 'panel', 'page'],

  // Level & World
  level: ['map', 'scene', 'world'],
  spawn: ['place', 'create', 'instantiate', 'add'],
  lighting: ['light', 'illumination', 'lamp'],
  'world partition': ['streaming', 'level streaming', 'open world'],

  // Gameplay
  character: ['player', 'hero', 'protagonist', 'avatar'],
  enemy: ['npc', 'ai', 'bot', 'opponent', 'mob'],
  projectile: ['bullet', 'missile', 'shot', 'ammo'],
  'game mode': ['gamemode', 'gm', 'rules'],
  input: ['controls', 'keys', 'bindings', 'controller'],
  collision: ['physics', 'overlap', 'hit', 'trigger'],
  interactable: ['interactive', 'usable', 'pickupable', 'door', 'switch', 'lever'],
  inventory: ['items', 'equipment', 'bag', 'slots', 'loot'],
  dialogue: ['conversation', 'talk', 'dialog', 'speech', 'npc text'],

  // Audio
  audio: ['sound', 'sfx', 'music', 'ambience'],
  'sound cue': ['audio cue', 'sound node'],
  attenuation: ['falloff', 'distance', 'spatial'],

  // Sequencer
  sequencer: ['cinematic', 'cutscene', 'timeline', 'movie'],
  keyframe: ['key', 'frame', 'animation key'],

  // Building & Pipeline
  compile: ['build', 'cook', 'package'],
  import: ['bring in', 'load', 'add from disk'],
  lod: ['level of detail', 'optimization', 'distance'],

  // Common verbs
  create: ['make', 'add', 'new', 'build', 'generate', 'setup', 'set up'],
  configure: ['set', 'adjust', 'modify', 'change', 'tweak'],
  delete: ['remove', 'destroy', 'clear', 'clean'],
};

/**
 * Expand query tokens with UE synonyms for broader matching.
 * Returns original tokens plus any synonym-matched expansions.
 */
function expandWithSynonyms(tokens: string[]): { expanded: string[]; synonymHits: number } {
  const expanded = new Set(tokens);
  let synonymHits = 0;
  const queryStr = tokens.join(' ');

  for (const [term, synonyms] of Object.entries(UE_SYNONYMS)) {
    const termTokens = tokenize(term);

    // Check if any query token matches the canonical term
    const termMatches = termTokens.every((t) => tokens.includes(t));

    // Check if any query token matches a synonym
    let synonymMatch = false;
    for (const syn of synonyms) {
      const synTokens = tokenize(syn);
      if (synTokens.length === 1 && tokens.includes(synTokens[0])) {
        synonymMatch = true;
        // Add the canonical term tokens
        for (const t of termTokens) expanded.add(t);
        break;
      }
      if (synTokens.length > 1 && queryStr.includes(synTokens.join(' '))) {
        synonymMatch = true;
        for (const t of termTokens) expanded.add(t);
        break;
      }
    }

    // If canonical term found, add all single-word synonyms
    if (termMatches) {
      for (const syn of synonyms) {
        const synTokens = tokenize(syn);
        if (synTokens.length === 1) {
          expanded.add(synTokens[0]);
        }
      }
    }

    if (synonymMatch || termMatches) synonymHits++;
  }

  return { expanded: Array.from(expanded), synonymHits };
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
  expandedTokens: string[],
  workflow: Workflow,
): { score: number; matchedPatterns: string[] } {
  let bestScore = 0;
  const matchedPatterns: string[] = [];

  // Score against each intent pattern (highest weight) — use expanded tokens
  for (const pattern of workflow.intentPatterns) {
    const s = patternScore(expandedTokens, pattern);
    if (s > 0.3) {
      matchedPatterns.push(pattern);
    }
    if (s > bestScore) {
      bestScore = s;
    }
  }

  // Score against name (medium weight)
  const nameScore = patternScore(expandedTokens, workflow.name) * 0.7;
  if (nameScore > bestScore) {
    bestScore = nameScore;
  }

  // Score against description (lower weight)
  const descTokens = tokenize(workflow.description);
  let descMatchCount = 0;
  for (const qt of expandedTokens) {
    if (descTokens.includes(qt)) {
      descMatchCount++;
    }
  }
  const descScore = expandedTokens.length > 0
    ? (descMatchCount / expandedTokens.length) * 0.4
    : 0;
  if (descScore > bestScore) {
    bestScore = descScore;
  }

  // Tag bonus: each matching tag adds a small boost
  let tagBonus = 0;
  for (const tag of workflow.tags) {
    if (expandedTokens.includes(tag)) {
      tagBonus += 0.1;
    }
  }

  return {
    score: bestScore + tagBonus,
    matchedPatterns,
  };
}

/**
 * Calculate outcome-based confidence boost.
 * Workflows with high success rates get boosted; low success rates get penalized.
 */
function outcomeConfidence(workflowId: string): { boost: number; info?: IntentMatch['outcomeInfo'] } {
  const stats = getOutcomeStats(workflowId);
  if (!stats || stats.totalExecutions === 0) {
    return { boost: 0 };
  }

  const info = {
    successRate: stats.successRate,
    totalExecutions: stats.totalExecutions,
    recentTrend: stats.recentTrend,
  };

  // Confidence grows with more data: boost range [-0.2, +0.3]
  const dataBasis = Math.min(stats.totalExecutions / 10, 1); // Saturates at 10 executions
  const successBias = (stats.successRate - 0.5) * 0.6; // [-0.3, +0.3]
  const trendBonus = stats.recentTrend === 'improving' ? 0.05
    : stats.recentTrend === 'declining' ? -0.05
    : 0;

  return {
    boost: (successBias + trendBonus) * dataBasis,
    info,
  };
}

/**
 * Match a natural language intent query against the workflow knowledge base.
 * Returns ranked list of matching workflows with scores and confidence.
 */
export function matchIntent(query: string, maxResults = 5): IntentMatchResult {
  const queryTokens = tokenize(query);
  const { expanded: expandedTokens, synonymHits } = expandWithSynonyms(queryTokens);
  const workflows = getAllWorkflows();

  const scored: IntentMatch[] = workflows
    .map((workflow) => {
      const { score, matchedPatterns } = scoreWorkflow(queryTokens, expandedTokens, workflow);
      const { boost, info } = outcomeConfidence(workflow.id);

      // Synonym expansion bonus: if synonyms contributed to the match
      const synonymBonus = synonymHits > 0 && matchedPatterns.length > 0 ? 0.05 : 0;

      const finalScore = score + boost + synonymBonus;
      const confidence = Math.min(1, Math.max(0, finalScore));

      return { workflow, score: finalScore, confidence, matchedPatterns, outcomeInfo: info };
    })
    .filter((m) => m.score > 0.2) // Minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  const topRecommendation = scored.length > 0 ? scored[0].workflow : null;
  const topConfidence = scored.length > 0 ? scored[0].confidence : 0;

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
    confidence: topConfidence,
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
