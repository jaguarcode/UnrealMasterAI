import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../src/tools/context/workflow-store.js', () => ({
  recordOutcome: vi.fn(),
}));

import { recordOutcome } from '../../../src/tools/context/workflow-store.js';
import {
  WorkflowTracker,
  IDLE_TIMEOUT_MS,
  getWorkflowTracker,
  resetWorkflowTrackerForTests,
} from '../../../src/tools/context/workflow-tracker.js';

const recordOutcomeMock = vi.mocked(recordOutcome);

/** Simple injectable clock for deterministic time control in tests. */
function makeClock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
    set: (ms: number) => {
      current = ms;
    },
  };
}

const SAMPLE_WORKFLOW = {
  id: 'wf-1',
  name: 'Sample Workflow',
  steps: [
    { tool: 'tool-a', optional: false },
    { tool: 'tool-b' },
    { tool: 'tool-c', optional: true },
  ],
};

beforeEach(() => {
  recordOutcomeMock.mockClear();
  resetWorkflowTrackerForTests();
});

describe('WorkflowTracker - start + progress reporting', () => {
  it('reports progress with nextExpectedTool and percent, excluding optional steps', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);

    const progress = tracker.getProgress();
    expect(progress).not.toBeNull();
    expect(progress!.workflowId).toBe('wf-1');
    expect(progress!.workflowName).toBe('Sample Workflow');
    expect(progress!.totalSteps).toBe(2); // tool-c is optional, excluded
    expect(progress!.stepsCompleted).toBe(0);
    expect(progress!.nextExpectedTool).toBe('tool-a');
    expect(progress!.percent).toBe(0);
  });

  it('getActive returns a defensive copy reflecting requiredSteps only', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.9);

    const active = tracker.getActive();
    expect(active).not.toBeNull();
    expect(active!.requiredSteps).toEqual(['tool-a', 'tool-b']);
    expect(active!.confidence).toBe(0.9);

    // Mutating the returned object must not affect internal state.
    active!.requiredSteps.push('mutated');
    expect(tracker.getActive()!.requiredSteps).toEqual(['tool-a', 'tool-b']);
  });
});

describe('WorkflowTracker - successful completion', () => {
  it('completes in order and records success outcome with correct toolsUsed/durationMs/notes', () => {
    const clock = makeClock(5_000);
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.75);

    const r1 = tracker.onToolCall('tool-a', true);
    expect(r1.completed).toBe(false);
    expect(r1.progress!.stepsCompleted).toBe(1);
    expect(r1.progress!.nextExpectedTool).toBe('tool-b');
    expect(r1.progress!.percent).toBe(50);

    clock.advance(2_500);
    const r2 = tracker.onToolCall('tool-b', true);
    expect(r2.completed).toBe(true);
    expect(r2.progress!.percent).toBe(100);
    expect(r2.progress!.nextExpectedTool).toBeNull();

    expect(recordOutcomeMock).toHaveBeenCalledTimes(1);
    expect(recordOutcomeMock).toHaveBeenCalledWith({
      workflowId: 'wf-1',
      timestamp: 7_500,
      success: true,
      toolsUsed: ['tool-a', 'tool-b'],
      durationMs: 2_500,
      notes: 'auto-tracked: workflow steps completed',
    });

    // Tracking cleared after completion.
    expect(tracker.getActive()).toBeNull();
    expect(tracker.getProgress()).toBeNull();
  });

  it('completes out of order', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.6);

    const r1 = tracker.onToolCall('tool-b', true);
    expect(r1.completed).toBe(false);
    expect(r1.progress!.nextExpectedTool).toBe('tool-a');

    const r2 = tracker.onToolCall('tool-a', true);
    expect(r2.completed).toBe(true);

    expect(recordOutcomeMock).toHaveBeenCalledTimes(1);
    expect(recordOutcomeMock.mock.calls[0][0]).toMatchObject({
      workflowId: 'wf-1',
      success: true,
      toolsUsed: ['tool-b', 'tool-a'],
    });
  });
});

describe('WorkflowTracker - failure handling', () => {
  it('failed calls do not match steps but count errorCount; majority-error completion records success:false', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.7);

    // Failing calls to required steps should NOT mark them complete.
    const r1 = tracker.onToolCall('tool-a', false);
    expect(r1.completed).toBe(false);
    expect(r1.progress!.stepsCompleted).toBe(0);
    expect(tracker.getActive()!.errorCount).toBe(1);

    // Some unrelated failing calls too, pushing error rate over 50%.
    tracker.onToolCall('tool-x', false);
    expect(tracker.getActive()!.errorCount).toBe(2);
    expect(tracker.getActive()!.toolsUsed).toEqual(['tool-a', 'tool-x']);

    // Now succeed at the required steps to trigger completion.
    tracker.onToolCall('tool-a', true);
    const rFinal = tracker.onToolCall('tool-b', true);
    expect(rFinal.completed).toBe(true);

    // toolsUsed: tool-a(fail), tool-x(fail), tool-a(success), tool-b(success) => 4 calls, 2 errors => 0.5, not < 0.5
    expect(recordOutcomeMock).toHaveBeenCalledTimes(1);
    const outcome = recordOutcomeMock.mock.calls[0][0];
    expect(outcome.toolsUsed).toEqual(['tool-a', 'tool-x', 'tool-a', 'tool-b']);
    expect(outcome.success).toBe(false); // 2/4 = 0.5, not < 0.5
  });

  it('records success:true when error rate is below 50%', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.7);

    tracker.onToolCall('tool-x', false); // 1 error out of eventually 3 calls => 1/3 < 0.5
    tracker.onToolCall('tool-a', true);
    tracker.onToolCall('tool-b', true);

    expect(recordOutcomeMock).toHaveBeenCalledTimes(1);
    const outcome = recordOutcomeMock.mock.calls[0][0];
    expect(outcome.success).toBe(true);
    expect(outcome.toolsUsed).toEqual(['tool-x', 'tool-a', 'tool-b']);
  });
});

describe('WorkflowTracker - duplicate required steps', () => {
  it('needs multiple matching calls for duplicated required steps', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    const workflow = {
      id: 'wf-dup',
      name: 'Duplicate Steps Workflow',
      steps: [
        { tool: 'repeat-tool' },
        { tool: 'repeat-tool' },
        { tool: 'final-tool' },
      ],
    };
    tracker.start(workflow, 0.5);

    expect(tracker.getActive()!.requiredSteps).toEqual(['repeat-tool', 'repeat-tool', 'final-tool']);

    const r1 = tracker.onToolCall('repeat-tool', true);
    expect(r1.completed).toBe(false);
    expect(r1.progress!.stepsCompleted).toBe(1);
    expect(r1.progress!.nextExpectedTool).toBe('repeat-tool');

    const r2 = tracker.onToolCall('final-tool', true);
    expect(r2.completed).toBe(false);
    expect(r2.progress!.nextExpectedTool).toBe('repeat-tool');

    const r3 = tracker.onToolCall('repeat-tool', true);
    expect(r3.completed).toBe(true);

    expect(recordOutcomeMock).toHaveBeenCalledTimes(1);
    expect(recordOutcomeMock.mock.calls[0][0].toolsUsed).toEqual(['repeat-tool', 'final-tool', 'repeat-tool']);
  });
});

describe('WorkflowTracker - meta tools', () => {
  it('ignores meta tools: no toolsUsed entry, no step match, returns current progress', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);

    const r1 = tracker.onToolCall('context-matchIntent', true);
    expect(r1.completed).toBe(false);
    expect(r1.progress).not.toBeNull();
    expect(r1.progress!.stepsCompleted).toBe(0);
    expect(tracker.getActive()!.toolsUsed).toEqual([]);

    const r2 = tracker.onToolCall('editor-ping', true);
    expect(r2.completed).toBe(false);
    expect(tracker.getActive()!.toolsUsed).toEqual([]);
    expect(tracker.getActive()!.errorCount).toBe(0);

    expect(recordOutcomeMock).not.toHaveBeenCalled();
  });

  it('meta tool call with no active workflow returns null progress', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    const result = tracker.onToolCall('context-matchError', true);
    expect(result).toEqual({ completed: false, progress: null });
  });
});

describe('WorkflowTracker - idle timeout', () => {
  it('discards silently after idle timeout with no recordOutcome, subsequent call reports no active', () => {
    const clock = makeClock(0);
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);
    tracker.onToolCall('tool-a', true);

    clock.advance(IDLE_TIMEOUT_MS + 1);

    const result = tracker.onToolCall('tool-b', true);
    expect(result).toEqual({ completed: false, progress: null });
    expect(recordOutcomeMock).not.toHaveBeenCalled();
    expect(tracker.getActive()).toBeNull();
    expect(tracker.getProgress()).toBeNull();
  });

  it('does not time out when exactly at the boundary', () => {
    const clock = makeClock(0);
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);
    tracker.onToolCall('tool-a', true);

    clock.advance(IDLE_TIMEOUT_MS); // exactly at threshold, not exceeding it

    const result = tracker.onToolCall('tool-b', true);
    expect(result.completed).toBe(true);
    expect(recordOutcomeMock).toHaveBeenCalledTimes(1);
  });
});

describe('WorkflowTracker - notifyExplicitOutcome', () => {
  it('clears active tracking without recording when ids match', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);
    tracker.onToolCall('tool-a', true);

    tracker.notifyExplicitOutcome('wf-1');

    expect(tracker.getActive()).toBeNull();
    expect(tracker.getProgress()).toBeNull();
    expect(recordOutcomeMock).not.toHaveBeenCalled();

    // Further tool calls shouldn't resurrect the workflow or record anything.
    const result = tracker.onToolCall('tool-b', true);
    expect(result).toEqual({ completed: false, progress: null });
    expect(recordOutcomeMock).not.toHaveBeenCalled();
  });

  it('does nothing when the id does not match the active workflow', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);
    tracker.onToolCall('tool-a', true);

    tracker.notifyExplicitOutcome('some-other-workflow');

    expect(tracker.getActive()).not.toBeNull();
    expect(tracker.getActive()!.completedSteps).toEqual(['tool-a']);
  });

  it('does nothing when there is no active workflow', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    expect(() => tracker.notifyExplicitOutcome('wf-1')).not.toThrow();
    expect(tracker.getActive()).toBeNull();
  });
});

describe('WorkflowTracker - start() edge cases', () => {
  it('does not activate when all steps are optional', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(
      {
        id: 'wf-optional-only',
        name: 'Optional Only',
        steps: [
          { tool: 'opt-a', optional: true },
          { tool: 'opt-b', optional: true },
        ],
      },
      0.9,
    );

    expect(tracker.getActive()).toBeNull();
    expect(tracker.getProgress()).toBeNull();

    const result = tracker.onToolCall('opt-a', true);
    expect(result).toEqual({ completed: false, progress: null });
  });

  it('does not activate for a workflow with zero steps', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start({ id: 'wf-empty', name: 'Empty', steps: [] }, 0.9);
    expect(tracker.getActive()).toBeNull();
  });

  it('replaces a previous active workflow without recording an outcome for it', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);
    tracker.onToolCall('tool-a', true);
    expect(tracker.getActive()!.workflowId).toBe('wf-1');

    const otherWorkflow = {
      id: 'wf-2',
      name: 'Other Workflow',
      steps: [{ tool: 'tool-z' }],
    };
    tracker.start(otherWorkflow, 0.65);

    expect(recordOutcomeMock).not.toHaveBeenCalled();
    expect(tracker.getActive()!.workflowId).toBe('wf-2');
    expect(tracker.getActive()!.completedSteps).toEqual([]);
    expect(tracker.getActive()!.toolsUsed).toEqual([]);
  });

  it('replacing with an only-optional workflow clears the previous active workflow too', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);
    tracker.onToolCall('tool-a', true);
    expect(tracker.getActive()).not.toBeNull();

    tracker.start(
      { id: 'wf-noop', name: 'No-op', steps: [{ tool: 'x', optional: true }] },
      0.9,
    );

    expect(tracker.getActive()).toBeNull();
    expect(recordOutcomeMock).not.toHaveBeenCalled();
  });
});

describe('WorkflowTracker - cancel', () => {
  it('clears active tracking without recording an outcome', () => {
    const clock = makeClock();
    const tracker = new WorkflowTracker(clock.now);
    tracker.start(SAMPLE_WORKFLOW, 0.8);
    tracker.onToolCall('tool-a', true);

    tracker.cancel();

    expect(tracker.getActive()).toBeNull();
    expect(recordOutcomeMock).not.toHaveBeenCalled();
  });
});

describe('WorkflowTracker - default clock', () => {
  it('uses Date.now by default when no clock injected', () => {
    const tracker = new WorkflowTracker();
    const before = Date.now();
    tracker.start(SAMPLE_WORKFLOW, 0.8);
    const active = tracker.getActive();
    expect(active).not.toBeNull();
    expect(active!.startedAt).toBeGreaterThanOrEqual(before);
    expect(active!.startedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('getWorkflowTracker singleton', () => {
  it('returns the same instance across calls', () => {
    const a = getWorkflowTracker();
    const b = getWorkflowTracker();
    expect(a).toBe(b);
  });

  it('resetWorkflowTrackerForTests produces a fresh instance', () => {
    const a = getWorkflowTracker();
    a.start(SAMPLE_WORKFLOW, 0.8);
    resetWorkflowTrackerForTests();
    const b = getWorkflowTracker();
    expect(b).not.toBe(a);
    expect(b.getActive()).toBeNull();
  });
});
