/**
 * Analytics Snapshot Generator.
 * Reads workflow, outcome, and error resolution data files and produces
 * a static JSON snapshot for the analytics dashboard page.
 *
 * Usage: npx unreal-master-mcp-server analytics [--output <path>]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { getAllBuiltinTools } from '../tools/auto-register.js';
import { getBuiltinWorkflowCount } from '../tools/context/workflow-knowledge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Read from the SAME data dir the runtime writes to (workflow-store.ts,
// error-learning.ts, usage-tracker.ts all resolve UMA_DATA_DIR || user-global),
// so a default `analytics` run reflects the live learning state rather than the
// committed package seeds. To snapshot the seeds, pass UMA_DATA_DIR=mcp-server/data.
const DATA_DIR = process.env.UMA_DATA_DIR || join(homedir(), '.unreal-master', 'data');
const USAGE_DATA_DIR = DATA_DIR;
const DOCS_DATA_DIR = join(__dirname, '..', '..', '..', 'docs', 'data');

interface WorkflowItem {
  id: string;
  name: string;
  domain: string;
  difficulty: string;
  steps: Array<{ tool: string; purpose: string }>;
  tags: string[];
  source: string;
}

interface OutcomeItem {
  workflowId: string;
  success: boolean;
  toolsUsed?: string[];
  timestamp: number;
}

interface ResolutionItem {
  id: string;
  errorType: string;
  sourceTool: string;
  reuseCount: number;
  tags: string[];
}

interface ToolUsageEvent {
  tool: string;
  success: boolean;
  durationMs: number;
  timestamp: number;
}

export interface UsageSnapshot {
  totalCalls: number;
  /** 0-1, rounded to 2 decimals */
  overallSuccessRate: number;
  topByCalls: Array<{ tool: string; calls: number; successRate: number }>;
}

export interface AnalyticsSnapshot {
  generatedAt: string;
  workflows: {
    total: number;
    builtin: number;
    learned: number;
    byDomain: Record<string, number>;
    byDifficulty: Record<string, number>;
    topDomains: Array<{ domain: string; count: number }>;
  };
  tools: {
    totalRegistered: number;
    usedInWorkflows: number;
    topToolsByFrequency: Array<{ tool: string; count: number }>;
  };
  outcomes: {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    byWorkflow: Array<{ workflowId: string; executions: number; successRate: number }>;
  };
  errorResolutions: {
    total: number;
    totalReuses: number;
    byErrorType: Record<string, number>;
    topReused: Array<{ id: string; errorType: string; reuseCount: number }>;
  };
  usage: UsageSnapshot | null;
}

function loadJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (existsSync(filePath)) {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    }
  } catch { /* corrupted — use fallback */ }
  return fallback;
}

export function generateSnapshot(): AnalyticsSnapshot {
  // Builtin workflow count comes directly from the knowledge base source of truth.
  const BUILTIN_COUNT = getBuiltinWorkflowCount();
  // Total registered tool count comes directly from the auto-register source of truth
  // (statically imports all domain modules and flattens their tool definitions — no
  // network/WS side effects, safe to call at snapshot-generation time).
  const TOTAL_REGISTERED_TOOLS = getAllBuiltinTools().length;

  const learnedData = loadJsonFile<{ items: WorkflowItem[] }>(
    join(DATA_DIR, 'learned-workflows.json'),
    { items: [] },
  );
  const outcomesData = loadJsonFile<{ items: OutcomeItem[] }>(
    join(DATA_DIR, 'workflow-outcomes.json'),
    { items: [] },
  );
  const resolutionsData = loadJsonFile<{ resolutions: ResolutionItem[] }>(
    join(DATA_DIR, 'error-resolutions.json'),
    { resolutions: [] },
  );

  const learnedWorkflows = learnedData.items;
  const outcomes = outcomesData.items;
  const resolutions = resolutionsData.resolutions;

  // Workflow stats
  const byDomain: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const toolFrequency: Record<string, number> = {};

  for (const w of learnedWorkflows) {
    byDomain[w.domain] = (byDomain[w.domain] ?? 0) + 1;
    byDifficulty[w.difficulty] = (byDifficulty[w.difficulty] ?? 0) + 1;
    for (const step of w.steps) {
      toolFrequency[step.tool] = (toolFrequency[step.tool] ?? 0) + 1;
    }
  }

  const topDomains = Object.entries(byDomain)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const topTools = Object.entries(toolFrequency)
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Outcome stats
  const successCount = outcomes.filter((o) => o.success).length;
  const failureCount = outcomes.length - successCount;
  const outcomeByWorkflow = new Map<string, { total: number; success: number }>();
  for (const o of outcomes) {
    const entry = outcomeByWorkflow.get(o.workflowId) ?? { total: 0, success: 0 };
    entry.total++;
    if (o.success) entry.success++;
    outcomeByWorkflow.set(o.workflowId, entry);
  }
  const byWorkflow = Array.from(outcomeByWorkflow.entries())
    .map(([workflowId, stats]) => ({
      workflowId,
      executions: stats.total,
      successRate: Math.round((stats.success / stats.total) * 100) / 100,
    }))
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 15);

  // Error resolution stats
  const byErrorType: Record<string, number> = {};
  let totalReuses = 0;
  for (const r of resolutions) {
    byErrorType[r.errorType] = (byErrorType[r.errorType] ?? 0) + 1;
    totalReuses += r.reuseCount ?? 0;
  }
  const topReused = [...resolutions]
    .sort((a, b) => (b.reuseCount ?? 0) - (a.reuseCount ?? 0))
    .slice(0, 10)
    .map((r) => ({ id: r.id, errorType: r.errorType, reuseCount: r.reuseCount ?? 0 }));

  // Tool usage stats — tool-usage.json may not exist yet (introduced by a
  // separate usage-tracking work stream), so handle absence gracefully.
  const usageData = loadJsonFile<{ items: ToolUsageEvent[] } | null>(
    join(USAGE_DATA_DIR, 'tool-usage.json'),
    null,
  );
  const usage = buildUsageSnapshot(usageData?.items ?? null);

  return {
    generatedAt: new Date().toISOString(),
    workflows: {
      total: BUILTIN_COUNT + learnedWorkflows.length,
      builtin: BUILTIN_COUNT,
      learned: learnedWorkflows.length,
      byDomain,
      byDifficulty,
      topDomains,
    },
    tools: {
      totalRegistered: TOTAL_REGISTERED_TOOLS,
      usedInWorkflows: Object.keys(toolFrequency).length,
      topToolsByFrequency: topTools,
    },
    outcomes: {
      totalExecutions: outcomes.length,
      successCount,
      failureCount,
      successRate: outcomes.length > 0 ? Math.round((successCount / outcomes.length) * 100) / 100 : 0,
      byWorkflow,
    },
    errorResolutions: {
      total: resolutions.length,
      totalReuses,
      byErrorType,
      topReused,
    },
    usage,
  };
}

/**
 * Build the usage snapshot section from raw tool-call events.
 * Returns null when there is no usage data yet (file absent, corrupted, or empty).
 */
function buildUsageSnapshot(items: ToolUsageEvent[] | null): UsageSnapshot | null {
  if (!items || items.length === 0) return null;

  const byTool = new Map<string, { calls: number; successes: number }>();
  let totalSuccesses = 0;

  for (const item of items) {
    let agg = byTool.get(item.tool);
    if (!agg) {
      agg = { calls: 0, successes: 0 };
      byTool.set(item.tool, agg);
    }
    agg.calls += 1;
    if (item.success) {
      agg.successes += 1;
      totalSuccesses += 1;
    }
  }

  const topByCalls = Array.from(byTool.entries())
    .map(([tool, stats]) => ({
      tool,
      calls: stats.calls,
      successRate: Math.round((stats.successes / stats.calls) * 100) / 100,
    }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 10);

  return {
    totalCalls: items.length,
    overallSuccessRate: Math.round((totalSuccesses / items.length) * 100) / 100,
    topByCalls,
  };
}

export async function runAnalytics(): Promise<void> {
  const outputIdx = process.argv.indexOf('--output');
  const outputPath = outputIdx !== -1 && process.argv[outputIdx + 1]
    ? process.argv[outputIdx + 1]
    : join(DOCS_DATA_DIR, 'analytics-snapshot.json');

  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const snapshot = generateSnapshot();
  writeFileSync(outputPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  console.log(`Analytics snapshot generated: ${outputPath}`);
  console.log(`  Workflows: ${snapshot.workflows.total} (${snapshot.workflows.builtin} builtin + ${snapshot.workflows.learned} learned)`);
  console.log(`  Tools used in workflows: ${snapshot.tools.usedInWorkflows}/${snapshot.tools.totalRegistered}`);
  console.log(`  Outcome executions: ${snapshot.outcomes.totalExecutions}`);
  console.log(`  Error resolutions: ${snapshot.errorResolutions.total} (${snapshot.errorResolutions.totalReuses} reuses)`);
  console.log(
    snapshot.usage
      ? `  Tool usage: ${snapshot.usage.totalCalls} calls (${Math.round(snapshot.usage.overallSuccessRate * 100)}% success)`
      : '  Tool usage: no data yet',
  );
}
