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

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
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
  // Load builtin workflows by importing the knowledge base source
  // We can't dynamically import TS at runtime, so we count from data files + a hardcoded builtin count
  const BUILTIN_COUNT = 20; // From workflow-knowledge.ts

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
      totalRegistered: 188,
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
}
