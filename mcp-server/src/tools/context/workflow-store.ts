/**
 * Persistent Workflow Store.
 * Saves learned workflows and outcome history to disk so they survive server restarts.
 * Outcome tracking enables confidence-weighted intent matching.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import type { Workflow } from './workflow-knowledge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use user-global path so data persists across npx runs and is shared with the MCP server
const DATA_DIR = process.env.UMA_DATA_DIR
  || join(homedir(), '.unreal-master', 'data');
const WORKFLOWS_FILE = join(DATA_DIR, 'learned-workflows.json');
const OUTCOMES_FILE = join(DATA_DIR, 'workflow-outcomes.json');

export interface WorkflowOutcome {
  workflowId: string;
  timestamp: number;
  success: boolean;
  toolsUsed: string[];
  durationMs?: number;
  notes?: string;
}

export interface OutcomeStats {
  workflowId: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number;
  lastExecuted: number;
  recentTrend: 'improving' | 'stable' | 'declining';
}

interface StoredData<T> {
  version: number;
  updatedAt: number;
  items: T[];
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadJson<T>(filePath: string, defaultValue: StoredData<T>): StoredData<T> {
  try {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // Corrupted file — start fresh
  }
  return defaultValue;
}

function saveJson<T>(filePath: string, data: StoredData<T>): void {
  ensureDataDir();
  data.updatedAt = Date.now();
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Learned Workflows Persistence ──

export function loadLearnedWorkflows(): Workflow[] {
  const data = loadJson<Workflow>(WORKFLOWS_FILE, { version: 1, updatedAt: 0, items: [] });
  return data.items;
}

export function saveLearnedWorkflows(workflows: Workflow[]): void {
  saveJson(WORKFLOWS_FILE, { version: 1, updatedAt: Date.now(), items: workflows });
}

export function appendLearnedWorkflow(workflow: Workflow): void {
  const existing = loadLearnedWorkflows();
  const filtered = existing.filter((w) => w.id !== workflow.id);
  filtered.push(workflow);
  saveLearnedWorkflows(filtered);
}

export function removeLearnedWorkflow(id: string): boolean {
  const existing = loadLearnedWorkflows();
  const filtered = existing.filter((w) => w.id !== id);
  if (filtered.length === existing.length) return false;
  saveLearnedWorkflows(filtered);
  return true;
}

// ── Outcome Tracking ──

export function loadOutcomes(): WorkflowOutcome[] {
  const data = loadJson<WorkflowOutcome>(OUTCOMES_FILE, { version: 1, updatedAt: 0, items: [] });
  return data.items;
}

function saveOutcomes(outcomes: WorkflowOutcome[]): void {
  saveJson(OUTCOMES_FILE, { version: 1, updatedAt: Date.now(), items: outcomes });
}

export function recordOutcome(outcome: WorkflowOutcome): void {
  const outcomes = loadOutcomes();
  outcomes.push(outcome);
  // Keep last 500 outcomes to prevent unbounded growth
  if (outcomes.length > 500) {
    outcomes.splice(0, outcomes.length - 500);
  }
  saveOutcomes(outcomes);
}

export function getOutcomeStats(workflowId: string): OutcomeStats | null {
  const outcomes = loadOutcomes().filter((o) => o.workflowId === workflowId);
  if (outcomes.length === 0) return null;

  const successCount = outcomes.filter((o) => o.success).length;
  const failureCount = outcomes.length - successCount;
  const durations = outcomes.filter((o) => o.durationMs != null).map((o) => o.durationMs!);
  const avgDurationMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  // Recent trend: compare last 3 vs previous 3
  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (outcomes.length >= 6) {
    const recent3 = outcomes.slice(-3).filter((o) => o.success).length / 3;
    const prev3 = outcomes.slice(-6, -3).filter((o) => o.success).length / 3;
    if (recent3 > prev3 + 0.1) recentTrend = 'improving';
    else if (recent3 < prev3 - 0.1) recentTrend = 'declining';
  }

  return {
    workflowId,
    totalExecutions: outcomes.length,
    successCount,
    failureCount,
    successRate: Math.round((successCount / outcomes.length) * 100) / 100,
    avgDurationMs,
    lastExecuted: Math.max(...outcomes.map((o) => o.timestamp)),
    recentTrend,
  };
}

export function getAllOutcomeStats(): OutcomeStats[] {
  const outcomes = loadOutcomes();
  const byId = new Map<string, WorkflowOutcome[]>();
  for (const o of outcomes) {
    if (!byId.has(o.workflowId)) byId.set(o.workflowId, []);
    byId.get(o.workflowId)!.push(o);
  }

  const stats: OutcomeStats[] = [];
  for (const workflowId of byId.keys()) {
    const s = getOutcomeStats(workflowId);
    if (s) stats.push(s);
  }
  return stats.sort((a, b) => b.lastExecuted - a.lastExecuted);
}
