import { getAllWorkflows, type Workflow } from './workflow-knowledge.js';

export interface Recommendation {
  tool: string;
  reason: string;
  confidence: number;
  fromWorkflow: string;
}

interface AdjacencyEntry {
  count: number;
  workflows: Array<{ id: string; name: string; domain: string }>;
}

// Maps "toolA" -> "toolB" -> { count, workflows[] }
type AdjacencyMap = Map<string, Map<string, AdjacencyEntry>>;

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

export function getRecommendations(
  recentTools: string[],
  domain?: string,
  maxResults: number = 5,
): Recommendation[] {
  if (recentTools.length === 0) return [];

  const workflows = getAllWorkflows();
  const adjacency = buildAdjacencyMap(workflows);
  const recentSet = new Set(recentTools);

  // Count total adjacency entries per (from, to) pair to normalize confidence
  let maxCount = 1;
  for (const neighbors of adjacency.values()) {
    for (const entry of neighbors.values()) {
      if (entry.count > maxCount) maxCount = entry.count;
    }
  }

  // Accumulate scores: tool -> { score, reason, bestWorkflow }
  const scores = new Map<string, { score: number; reason: string; fromWorkflow: string }>();

  for (let i = 0; i < recentTools.length; i++) {
    const tool = recentTools[i];
    // More recent tools (higher index) get higher weight
    const recencyWeight = (i + 1) / recentTools.length;

    const neighbors = adjacency.get(tool);
    if (!neighbors) continue;

    for (const [nextTool, entry] of neighbors.entries()) {
      if (recentSet.has(nextTool)) continue;

      const frequencyScore = entry.count / maxCount;
      let domainBoost = 0;

      if (domain) {
        const matchingWorkflows = entry.workflows.filter((w) => w.domain === domain);
        if (matchingWorkflows.length > 0) {
          domainBoost = 0.2 * (matchingWorkflows.length / entry.workflows.length);
        }
      }

      const rawScore = frequencyScore * recencyWeight + domainBoost;

      // Pick the best workflow name for the reason string
      const bestWorkflow =
        domain
          ? (entry.workflows.find((w) => w.domain === domain) ?? entry.workflows[0])
          : entry.workflows[0];

      const existing = scores.get(nextTool);
      if (!existing || rawScore > existing.score) {
        scores.set(nextTool, {
          score: rawScore,
          reason: `Commonly follows '${tool}' in the '${bestWorkflow.name}' workflow`,
          fromWorkflow: bestWorkflow.id,
        });
      } else {
        // Accumulate score across multiple source tools
        existing.score += rawScore * 0.5;
      }
    }
  }

  // Normalise scores to [0, 1]
  const allScores = Array.from(scores.values()).map((v) => v.score);
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 1;

  const results: Recommendation[] = Array.from(scores.entries()).map(([tool, data]) => ({
    tool,
    reason: data.reason,
    confidence: Math.min(1, data.score / maxScore),
    fromWorkflow: data.fromWorkflow,
  }));

  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, maxResults);
}
