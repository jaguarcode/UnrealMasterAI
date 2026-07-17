/**
 * Recommendation Engine (v2, usage-weighted).
 * Suggests the next tool(s) to call given recent tool usage by blending two
 * signals per candidate transition:
 *   - STATIC workflow adjacency: how often "toolA → toolB" appears across the
 *     known workflow knowledge base (unchanged from v1).
 *   - OBSERVED session adjacency: how often the developer actually chained
 *     "toolA → toolB" in their own recent sessions, weighted by success rate
 *     and support (from the UsageTracker).
 *
 * When called with no `recentTools`, the engine reads the server's automatically
 * tracked recent history from the UsageTracker; an explicit empty array still
 * returns no recommendations.
 */
import { getAllWorkflows, type Workflow } from './workflow-knowledge.js';
import { getUsageTracker } from './usage-tracker.js';

export interface Recommendation {
  tool: string;
  reason: string;
  confidence: number;
  fromWorkflow: string;
  /** Which signal(s) produced this recommendation. */
  source?: 'workflow' | 'observed' | 'both';
}

interface AdjacencyEntry {
  count: number;
  workflows: Array<{ id: string; name: string; domain: string }>;
}

// Maps "toolA" -> "toolB" -> { count, workflows[] }
type AdjacencyMap = Map<string, Map<string, AdjacencyEntry>>;

/** Weight multiplier applied to observed (real-usage) transitions. */
const OBSERVED_WEIGHT = 2.0;
/** Observed support saturates (min(count/5, 1)) at this many occurrences. */
const OBSERVED_SUPPORT_SATURATION = 5;

function buildAdjacencyMap(workflows: Workflow[]): AdjacencyMap {
  const map: AdjacencyMap = new Map();

  for (const workflow of workflows) {
    const steps = workflow.steps;
    for (let i = 0; i < steps.length - 1; i++) {
      const from = steps[i].tool;
      const to = steps[i + 1].tool;

      if (!map.has(from)) map.set(from, new Map());
      const neighbors = map.get(from)!;

      if (!neighbors.has(to)) {
        neighbors.set(to, { count: 0, workflows: [] });
      }
      const entry = neighbors.get(to)!;
      entry.count += 1;
      entry.workflows.push({ id: workflow.id, name: workflow.name, domain: workflow.domain });
    }
  }

  return map;
}

/** Internal accumulator for a candidate next-tool. */
interface ScoreData {
  score: number;
  reason: string;
  fromWorkflow: string;
  hasStatic: boolean;
  hasObserved: boolean;
}

export function getRecommendations(
  recentTools?: string[],
  domain?: string,
  maxResults: number = 5,
): Recommendation[] {
  // No argument → use the server's automatically tracked recent history.
  // An EXPLICIT empty array still short-circuits (preserves v1 contract).
  const tools = recentTools === undefined ? getUsageTracker().getRecentTools(5) : recentTools;
  if (tools.length === 0) return [];

  const workflows = getAllWorkflows();
  const adjacency = buildAdjacencyMap(workflows);
  const observed = getUsageTracker().getObservedAdjacency();
  const recentSet = new Set(tools);

  // Count max static adjacency to normalize the static frequency score.
  let maxStaticCount = 1;
  for (const neighbors of adjacency.values()) {
    for (const entry of neighbors.values()) {
      if (entry.count > maxStaticCount) maxStaticCount = entry.count;
    }
  }

  const scores = new Map<string, ScoreData>();

  /** Merge a computed edge score into the running accumulator for `nextTool`. */
  function contribute(
    nextTool: string,
    edgeScore: number,
    reason: string,
    fromWorkflow: string,
    kind: 'static' | 'observed',
  ): void {
    const existing = scores.get(nextTool);
    if (!existing) {
      scores.set(nextTool, {
        score: edgeScore,
        reason,
        fromWorkflow,
        hasStatic: kind === 'static',
        hasObserved: kind === 'observed',
      });
      return;
    }

    if (edgeScore > existing.score) {
      // Higher-scoring edge wins the reason/source; matches v1 replace semantics.
      existing.score = edgeScore;
      existing.reason = reason;
      existing.fromWorkflow = fromWorkflow;
    } else {
      existing.score += edgeScore * 0.5;
    }
    if (kind === 'static') existing.hasStatic = true;
    else existing.hasObserved = true;
  }

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    // More recent tools (higher index) get higher weight.
    const recencyWeight = (i + 1) / tools.length;

    // ── Static workflow adjacency ──
    const neighbors = adjacency.get(tool);
    if (neighbors) {
      for (const [nextTool, entry] of neighbors.entries()) {
        if (recentSet.has(nextTool)) continue;

        const frequencyScore = entry.count / maxStaticCount;
        let domainBoost = 0;
        if (domain) {
          const matchingWorkflows = entry.workflows.filter((w) => w.domain === domain);
          if (matchingWorkflows.length > 0) {
            domainBoost = 0.2 * (matchingWorkflows.length / entry.workflows.length);
          }
        }

        const edgeScore = frequencyScore * recencyWeight + domainBoost;

        const bestWorkflow = domain
          ? (entry.workflows.find((w) => w.domain === domain) ?? entry.workflows[0])
          : entry.workflows[0];

        contribute(
          nextTool,
          edgeScore,
          `Commonly follows '${tool}' in the '${bestWorkflow.name}' workflow`,
          bestWorkflow.id,
          'static',
        );
      }
    }

    // ── Observed (real-usage) adjacency ──
    const observedNeighbors = observed.get(tool);
    if (observedNeighbors) {
      for (const [nextTool, stat] of observedNeighbors.entries()) {
        if (recentSet.has(nextTool)) continue;
        if (stat.count <= 0) continue;

        const successRate = stat.successCount / stat.count;
        const support = Math.min(stat.count / OBSERVED_SUPPORT_SATURATION, 1);
        const edgeScore = OBSERVED_WEIGHT * successRate * support * recencyWeight;
        if (edgeScore <= 0) continue;

        const pct = Math.round(successRate * 100);
        contribute(
          nextTool,
          edgeScore,
          `Observed ${stat.count}× in your recent sessions (${pct}% success)`,
          'observed',
          'observed',
        );
      }
    }
  }

  // Normalise scores to [0, 1].
  const allScores = Array.from(scores.values()).map((v) => v.score);
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 1;

  const results: Recommendation[] = Array.from(scores.entries()).map(([tool, data]) => {
    const source: Recommendation['source'] =
      data.hasStatic && data.hasObserved ? 'both' : data.hasObserved ? 'observed' : 'workflow';

    // For combined signals, phrase the reason to reflect both.
    let reason = data.reason;
    if (source === 'both' && !reason.startsWith('Observed')) {
      reason = `${reason}; also observed in your recent sessions`;
    }

    return {
      tool,
      reason,
      confidence: Math.min(1, data.score / maxScore),
      fromWorkflow: data.fromWorkflow,
      source,
    };
  });

  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, maxResults);
}
