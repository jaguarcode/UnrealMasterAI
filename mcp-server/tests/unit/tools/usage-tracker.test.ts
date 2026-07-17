import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { existsSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  UsageTracker,
  getUsageTracker,
  resetUsageTrackerForTests,
} from '../../../src/tools/context/usage-tracker.js';
import { SESSION_GAP_MS, type ToolCallEvent } from '../../../src/tools/context/usage-types.js';

const DATA_DIR = process.env.UMA_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'data');
const USAGE_FILE = join(DATA_DIR, 'tool-usage.json');

// Backup production data file before tests modify it (in case UMA_DATA_DIR isn't isolated)
const _backupUsage = existsSync(USAGE_FILE) ? readFileSync(USAGE_FILE, 'utf-8') : null;

afterAll(() => {
  if (_backupUsage !== null) {
    writeFileSync(USAGE_FILE, _backupUsage, 'utf-8');
  } else if (existsSync(USAGE_FILE)) {
    rmSync(USAGE_FILE);
  }
  resetUsageTrackerForTests();
});

function makeEvent(overrides: Partial<ToolCallEvent> = {}): ToolCallEvent {
  return {
    tool: 'actor-spawn',
    success: true,
    durationMs: 100,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('UsageTracker', () => {
  beforeEach(() => {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (existsSync(USAGE_FILE)) rmSync(USAGE_FILE);
    resetUsageTrackerForTests();
  });

  describe('recordCall + getAllEvents/getToolStats', () => {
    it('records events and returns them chronologically via getAllEvents', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      const e1 = makeEvent({ tool: 'actor-spawn', timestamp: 1000 });
      const e2 = makeEvent({ tool: 'material-create', timestamp: 2000 });

      tracker.recordCall(e1);
      tracker.recordCall(e2);

      const all = tracker.getAllEvents();
      expect(all).toHaveLength(2);
      expect(all[0].tool).toBe('actor-spawn');
      expect(all[1].tool).toBe('material-create');
    });

    it('getAllEvents returns a copy, not the internal array', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent());
      const events = tracker.getAllEvents();
      events.push(makeEvent({ tool: 'should-not-be-tracked' }));
      expect(tracker.getAllEvents()).toHaveLength(1);
    });

    it('aggregates successRate and avgDurationMs correctly per tool', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'actor-spawn', success: true, durationMs: 100, timestamp: 1000 }));
      tracker.recordCall(makeEvent({ tool: 'actor-spawn', success: true, durationMs: 200, timestamp: 2000 }));
      tracker.recordCall(makeEvent({ tool: 'actor-spawn', success: false, durationMs: 300, timestamp: 3000 }));
      tracker.recordCall(makeEvent({ tool: 'material-create', success: true, durationMs: 50, timestamp: 4000 }));

      const stats = tracker.getToolStats();
      const actorSpawn = stats.find((s) => s.tool === 'actor-spawn')!;
      expect(actorSpawn.calls).toBe(3);
      expect(actorSpawn.successes).toBe(2);
      expect(actorSpawn.failures).toBe(1);
      expect(actorSpawn.successRate).toBeCloseTo(0.67, 2);
      expect(actorSpawn.avgDurationMs).toBe(200); // (100+200+300)/3
      expect(actorSpawn.lastUsed).toBe(3000);

      const materialCreate = stats.find((s) => s.tool === 'material-create')!;
      expect(materialCreate.calls).toBe(1);
      expect(materialCreate.successRate).toBe(1);
    });

    it('sorts getToolStats by calls descending', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'rare-tool', timestamp: 1 }));
      tracker.recordCall(makeEvent({ tool: 'common-tool', timestamp: 2 }));
      tracker.recordCall(makeEvent({ tool: 'common-tool', timestamp: 3 }));
      tracker.recordCall(makeEvent({ tool: 'common-tool', timestamp: 4 }));

      const stats = tracker.getToolStats();
      expect(stats[0].tool).toBe('common-tool');
      expect(stats[0].calls).toBe(3);
    });

    it('includes meta tools in getToolStats', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'context-matchIntent', timestamp: 1 }));

      const stats = tracker.getToolStats();
      expect(stats.some((s) => s.tool === 'context-matchIntent')).toBe(true);
    });
  });

  describe('maxEvents cap', () => {
    it('drops the oldest events once maxEvents is exceeded', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0, maxEvents: 3 });
      tracker.recordCall(makeEvent({ tool: 'tool-1', timestamp: 1 }));
      tracker.recordCall(makeEvent({ tool: 'tool-2', timestamp: 2 }));
      tracker.recordCall(makeEvent({ tool: 'tool-3', timestamp: 3 }));
      tracker.recordCall(makeEvent({ tool: 'tool-4', timestamp: 4 }));

      const all = tracker.getAllEvents();
      expect(all).toHaveLength(3);
      expect(all.map((e) => e.tool)).toEqual(['tool-2', 'tool-3', 'tool-4']);
    });
  });

  describe('persistence', () => {
    it('round-trips: record, flush, new instance sees the events', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'actor-spawn', timestamp: 1000 }));
      tracker.recordCall(makeEvent({ tool: 'material-create', timestamp: 2000 }));
      tracker.flush();

      expect(existsSync(USAGE_FILE)).toBe(true);

      const reloaded = new UsageTracker({ persistIntervalMs: 0 });
      const events = reloaded.getAllEvents();
      expect(events).toHaveLength(2);
      expect(events.map((e) => e.tool)).toEqual(['actor-spawn', 'material-create']);
    });

    it('persistIntervalMs: 0 writes immediately on every recordCall', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'actor-spawn', timestamp: 1000 }));

      const raw = JSON.parse(readFileSync(USAGE_FILE, 'utf-8'));
      expect(raw.items).toHaveLength(1);
      expect(raw.version).toBe(1);
    });

    it('corrupted JSON file causes tracker to start fresh without throwing', () => {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(USAGE_FILE, '{ this is not valid json ]]', 'utf-8');

      expect(() => new UsageTracker({ persistIntervalMs: 0 })).not.toThrow();
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      expect(tracker.getAllEvents()).toHaveLength(0);
    });
  });

  describe('getRecentEvents', () => {
    it('returns the most recent n events in chronological order', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      for (let i = 1; i <= 5; i++) {
        tracker.recordCall(makeEvent({ tool: `tool-${i}`, timestamp: i }));
      }
      const recent = tracker.getRecentEvents(3);
      expect(recent.map((e) => e.tool)).toEqual(['tool-3', 'tool-4', 'tool-5']);
    });

    it('defaults to 50', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      for (let i = 1; i <= 60; i++) {
        tracker.recordCall(makeEvent({ tool: `tool-${i}`, timestamp: i }));
      }
      expect(tracker.getRecentEvents()).toHaveLength(50);
    });
  });

  describe('getRecentTools', () => {
    it('excludes meta tools and orders most-recent-last', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'actor-spawn', timestamp: 1 }));
      tracker.recordCall(makeEvent({ tool: 'context-matchIntent', timestamp: 2 }));
      tracker.recordCall(makeEvent({ tool: 'editor-ping', timestamp: 3 }));
      tracker.recordCall(makeEvent({ tool: 'material-create', timestamp: 4 }));

      const recentTools = tracker.getRecentTools(10);
      expect(recentTools).toEqual(['actor-spawn', 'material-create']);
    });

    it('includes failed calls', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'actor-spawn', success: false, timestamp: 1 }));

      expect(tracker.getRecentTools()).toEqual(['actor-spawn']);
    });

    it('defaults to 10 and respects most-recent-last ordering', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      for (let i = 1; i <= 15; i++) {
        tracker.recordCall(makeEvent({ tool: `tool-${i}`, timestamp: i }));
      }
      const recentTools = tracker.getRecentTools();
      expect(recentTools).toHaveLength(10);
      expect(recentTools[recentTools.length - 1]).toBe('tool-15');
      expect(recentTools[0]).toBe('tool-6');
    });
  });

  describe('getObservedAdjacency', () => {
    it('pairs consecutive non-meta tools within the session gap', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'a', success: true, timestamp: 1000 }));
      tracker.recordCall(makeEvent({ tool: 'b', success: true, timestamp: 2000 }));

      const adjacency = tracker.getObservedAdjacency();
      const stat = adjacency.get('a')?.get('b');
      expect(stat).toBeDefined();
      expect(stat!.count).toBe(1);
      expect(stat!.successCount).toBe(1);
    });

    it('breaks pairing when the gap exceeds SESSION_GAP_MS', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'a', timestamp: 1000 }));
      tracker.recordCall(makeEvent({ tool: 'b', timestamp: 1000 + SESSION_GAP_MS }));

      const adjacency = tracker.getObservedAdjacency();
      expect(adjacency.get('a')?.get('b')).toBeUndefined();
    });

    it('successCount reflects the success of the SECOND call in the pair', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'a', success: false, timestamp: 1000 }));
      tracker.recordCall(makeEvent({ tool: 'b', success: false, timestamp: 2000 }));

      const adjacency = tracker.getObservedAdjacency();
      const stat = adjacency.get('a')?.get('b');
      expect(stat!.count).toBe(1);
      expect(stat!.successCount).toBe(0);

      // Now a succeeding second call
      const tracker2 = new UsageTracker({ persistIntervalMs: 0 });
      tracker2.recordCall(makeEvent({ tool: 'a', success: false, timestamp: 1000 }));
      tracker2.recordCall(makeEvent({ tool: 'b', success: true, timestamp: 2000 }));
      const stat2 = tracker2.getObservedAdjacency().get('a')?.get('b');
      expect(stat2!.successCount).toBe(1);
    });

    it('skips meta tools so a -> context-x -> b still pairs a -> b', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'a', timestamp: 1000 }));
      tracker.recordCall(makeEvent({ tool: 'context-matchIntent', timestamp: 1500 }));
      tracker.recordCall(makeEvent({ tool: 'b', success: true, timestamp: 2000 }));

      const adjacency = tracker.getObservedAdjacency();
      const stat = adjacency.get('a')?.get('b');
      expect(stat).toBeDefined();
      expect(stat!.count).toBe(1);
      expect(stat!.successCount).toBe(1);
      // no adjacency entries should reference the meta tool
      expect(adjacency.has('context-matchIntent')).toBe(false);
      for (const nextMap of adjacency.values()) {
        expect(nextMap.has('context-matchIntent')).toBe(false);
      }
    });

    it('accumulates count/successCount across multiple occurrences of the same pair', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'a', timestamp: 1000 }));
      tracker.recordCall(makeEvent({ tool: 'b', success: true, timestamp: 2000 }));
      tracker.recordCall(makeEvent({ tool: 'a', timestamp: 3000 }));
      tracker.recordCall(makeEvent({ tool: 'b', success: false, timestamp: 4000 }));

      const stat = tracker.getObservedAdjacency().get('a')?.get('b');
      expect(stat!.count).toBe(2);
      expect(stat!.successCount).toBe(1);
    });
  });

  describe('clear', () => {
    it('empties memory and disk', () => {
      const tracker = new UsageTracker({ persistIntervalMs: 0 });
      tracker.recordCall(makeEvent({ tool: 'actor-spawn' }));
      tracker.flush();
      expect(tracker.getAllEvents()).toHaveLength(1);

      tracker.clear();

      expect(tracker.getAllEvents()).toHaveLength(0);
      const raw = JSON.parse(readFileSync(USAGE_FILE, 'utf-8'));
      expect(raw.items).toHaveLength(0);
    });
  });

  describe('singleton', () => {
    it('getUsageTracker returns the same instance until reset', () => {
      const first = getUsageTracker();
      const second = getUsageTracker();
      expect(first).toBe(second);

      resetUsageTrackerForTests();
      const third = getUsageTracker();
      expect(third).not.toBe(first);
    });

    it('resetUsageTrackerForTests flushes pending writes before dropping the singleton', () => {
      const tracker = getUsageTracker();
      tracker.recordCall(makeEvent({ tool: 'actor-spawn' }));
      resetUsageTrackerForTests();

      expect(existsSync(USAGE_FILE)).toBe(true);
      const raw = JSON.parse(readFileSync(USAGE_FILE, 'utf-8'));
      expect(raw.items).toHaveLength(1);
    });
  });
});
