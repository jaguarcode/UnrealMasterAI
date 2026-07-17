/**
 * Persistent Tool Usage Tracker.
 * Journals every MCP tool invocation (via ToolHookManager post-hooks) to an in-memory
 * ring buffer and periodically flushes it to disk so usage intelligence — per-tool
 * stats and observed tool-to-tool adjacency — survives server restarts.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SESSION_GAP_MS, isMetaTool, type ToolCallEvent } from './usage-types.js';

// Use user-global path so data persists across npx runs and is shared with the MCP server
const DATA_DIR = process.env.UMA_DATA_DIR
  || join(homedir(), '.unreal-master', 'data');
const USAGE_FILE = join(DATA_DIR, 'tool-usage.json');

interface StoredData {
  version: number;
  updatedAt: number;
  items: ToolCallEvent[];
}

export interface ToolUsageStats {
  tool: string;
  calls: number;
  successes: number;
  failures: number;
  /** Rounded to 2 decimals */
  successRate: number;
  /** Rounded integer */
  avgDurationMs: number;
  /** Epoch ms */
  lastUsed: number;
}

export interface AdjacencyStat {
  count: number;
  successCount: number;
}

const DEFAULT_MAX_EVENTS = 2000;
const DEFAULT_PERSIST_INTERVAL_MS = 2000;

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadEvents(): ToolCallEvent[] {
  try {
    if (existsSync(USAGE_FILE)) {
      const raw = readFileSync(USAGE_FILE, 'utf-8');
      const parsed: StoredData = JSON.parse(raw);
      if (Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch {
    // Corrupted file — start fresh
  }
  return [];
}

function saveEvents(events: ToolCallEvent[]): void {
  ensureDataDir();
  const data: StoredData = { version: 1, updatedAt: Date.now(), items: events };
  writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export interface UsageTrackerOptions {
  maxEvents?: number;
  persistIntervalMs?: number;
}

export class UsageTracker {
  private events: ToolCallEvent[];
  private readonly maxEvents: number;
  private readonly persistIntervalMs: number;
  private lastPersistAt = 0;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: UsageTrackerOptions = {}) {
    this.maxEvents = opts.maxEvents ?? DEFAULT_MAX_EVENTS;
    this.persistIntervalMs = opts.persistIntervalMs ?? DEFAULT_PERSIST_INTERVAL_MS;
    this.events = loadEvents();
  }

  recordCall(event: ToolCallEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }

    if (this.persistIntervalMs <= 0) {
      this.persistNow();
      return;
    }

    const now = Date.now();
    if (now - this.lastPersistAt >= this.persistIntervalMs) {
      this.persistNow();
    } else if (!this.pendingTimer) {
      const delay = this.persistIntervalMs - (now - this.lastPersistAt);
      this.pendingTimer = setTimeout(() => {
        this.pendingTimer = null;
        this.persistNow();
      }, Math.max(delay, 0));
      this.pendingTimer.unref?.();
    }
  }

  private persistNow(): void {
    saveEvents(this.events);
    this.lastPersistAt = Date.now();
  }

  flush(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.persistNow();
  }

  getAllEvents(): ToolCallEvent[] {
    return [...this.events];
  }

  getRecentEvents(n = 50): ToolCallEvent[] {
    if (n <= 0) return [];
    return this.events.slice(-n);
  }

  getRecentTools(n = 10): string[] {
    if (n <= 0) return [];
    const result: string[] = [];
    for (let i = this.events.length - 1; i >= 0 && result.length < n; i--) {
      const event = this.events[i];
      if (isMetaTool(event.tool)) continue;
      result.push(event.tool);
    }
    return result.reverse();
  }

  getToolStats(): ToolUsageStats[] {
    const byTool = new Map<string, { calls: number; successes: number; totalDuration: number; lastUsed: number }>();

    for (const event of this.events) {
      let agg = byTool.get(event.tool);
      if (!agg) {
        agg = { calls: 0, successes: 0, totalDuration: 0, lastUsed: 0 };
        byTool.set(event.tool, agg);
      }
      agg.calls += 1;
      if (event.success) agg.successes += 1;
      agg.totalDuration += event.durationMs;
      if (event.timestamp > agg.lastUsed) agg.lastUsed = event.timestamp;
    }

    const stats: ToolUsageStats[] = [];
    for (const [tool, agg] of byTool.entries()) {
      stats.push({
        tool,
        calls: agg.calls,
        successes: agg.successes,
        failures: agg.calls - agg.successes,
        successRate: Math.round((agg.successes / agg.calls) * 100) / 100,
        avgDurationMs: Math.round(agg.totalDuration / agg.calls),
        lastUsed: agg.lastUsed,
      });
    }

    return stats.sort((a, b) => b.calls - a.calls);
  }

  getObservedAdjacency(): Map<string, Map<string, AdjacencyStat>> {
    const adjacency = new Map<string, Map<string, AdjacencyStat>>();
    let prev: ToolCallEvent | null = null;

    for (const event of this.events) {
      if (isMetaTool(event.tool)) continue;

      if (prev && event.timestamp - prev.timestamp < SESSION_GAP_MS) {
        let nextMap = adjacency.get(prev.tool);
        if (!nextMap) {
          nextMap = new Map<string, AdjacencyStat>();
          adjacency.set(prev.tool, nextMap);
        }
        let stat = nextMap.get(event.tool);
        if (!stat) {
          stat = { count: 0, successCount: 0 };
          nextMap.set(event.tool, stat);
        }
        stat.count += 1;
        if (event.success) stat.successCount += 1;
      }

      prev = event;
    }

    return adjacency;
  }

  clear(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.events = [];
    saveEvents(this.events);
    this.lastPersistAt = Date.now();
  }
}

let singleton: UsageTracker | null = null;

export function getUsageTracker(): UsageTracker {
  if (!singleton) {
    singleton = new UsageTracker();
  }
  return singleton;
}

export function resetUsageTrackerForTests(): void {
  if (singleton) {
    singleton.flush();
  }
  singleton = null;
}
