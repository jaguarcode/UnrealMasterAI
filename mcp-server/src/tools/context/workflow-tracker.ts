/**
 * Active Workflow Tracker.
 * Closes the gap between intent matching and outcome recording: today, outcome
 * recording depends entirely on the LLM client voluntarily calling
 * `context-recordOutcome`. This tracker follows a workflow's progress after a
 * high-confidence intent match, and automatically records the outcome once the
 * tool-call stream satisfies all of the workflow's required steps — no explicit
 * client action needed.
 */
import { isMetaTool } from './usage-types.js';
import { recordOutcome } from './workflow-store.js';

/** Tracking is abandoned (silently, without recording) after this much inactivity. */
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export interface ActiveWorkflowState {
  workflowId: string;
  workflowName: string;
  /** Tool names of non-optional steps, in order (duplicates allowed for repeated steps). */
  requiredSteps: string[];
  /** Required steps matched so far. */
  completedSteps: string[];
  /** Every non-meta tool called while this workflow was active (in order, duplicates allowed). */
  toolsUsed: string[];
  /** Non-meta calls with success=false. */
  errorCount: number;
  startedAt: number;
  lastActivityAt: number;
  /** Intent-match confidence that started tracking. */
  confidence: number;
}

export interface WorkflowProgress {
  workflowId: string;
  workflowName: string;
  stepsCompleted: number;
  totalSteps: number;
  /** First uncompleted required step in order, or null if all are completed. */
  nextExpectedTool: string | null;
  /** Rounded 0-100. */
  percent: number;
}

interface WorkflowLike {
  id: string;
  name: string;
  steps: Array<{ tool: string; optional?: boolean }>;
}

function buildProgress(state: ActiveWorkflowState): WorkflowProgress {
  // Determine next expected tool: the earliest required step not yet matched,
  // treating requiredSteps/completedSteps as multisets consumed in order.
  const remaining = [...state.requiredSteps];
  for (const completed of state.completedSteps) {
    const idx = remaining.indexOf(completed);
    if (idx !== -1) remaining.splice(idx, 1);
  }

  const totalSteps = state.requiredSteps.length;
  const stepsCompleted = state.completedSteps.length;
  const percent = totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 0;

  return {
    workflowId: state.workflowId,
    workflowName: state.workflowName,
    stepsCompleted,
    totalSteps,
    nextExpectedTool: remaining.length > 0 ? remaining[0] : null,
    percent,
  };
}

export class WorkflowTracker {
  private active: ActiveWorkflowState | null = null;
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  start(workflow: WorkflowLike, confidence: number): void {
    const requiredSteps = workflow.steps
      .filter((s) => s.optional !== true)
      .map((s) => s.tool);

    if (requiredSteps.length === 0) {
      // Nothing to track — silently no-op (also clears no prior state per spec:
      // start() should replace an existing active workflow even when the new
      // one doesn't qualify to activate).
      this.active = null;
      return;
    }

    const timestamp = this.now();
    this.active = {
      workflowId: workflow.id,
      workflowName: workflow.name,
      requiredSteps,
      completedSteps: [],
      toolsUsed: [],
      errorCount: 0,
      startedAt: timestamp,
      lastActivityAt: timestamp,
      confidence,
    };
  }

  onToolCall(tool: string, success: boolean): { completed: boolean; progress: WorkflowProgress | null } {
    if (isMetaTool(tool)) {
      return { completed: false, progress: this.active ? buildProgress(this.active) : null };
    }

    if (!this.active) {
      return { completed: false, progress: null };
    }

    const timestamp = this.now();
    if (timestamp - this.active.lastActivityAt > IDLE_TIMEOUT_MS) {
      // Abandonment is too weak a signal to record as an outcome — discard silently.
      this.active = null;
      return { completed: false, progress: null };
    }

    this.active.lastActivityAt = timestamp;
    this.active.toolsUsed.push(tool);
    if (!success) {
      this.active.errorCount += 1;
    } else {
      // Only successful calls match steps. Mark the earliest uncompleted
      // instance of this required step as completed, if any.
      const remaining = [...this.active.requiredSteps];
      for (const completed of this.active.completedSteps) {
        const idx = remaining.indexOf(completed);
        if (idx !== -1) remaining.splice(idx, 1);
      }
      if (remaining.includes(tool)) {
        this.active.completedSteps.push(tool);
      }
    }

    const allCompleted = this.active.completedSteps.length >= this.active.requiredSteps.length;

    if (allCompleted) {
      const state = this.active;
      const durationMs = timestamp - state.startedAt;
      const success = state.errorCount / Math.max(state.toolsUsed.length, 1) < 0.5;

      recordOutcome({
        workflowId: state.workflowId,
        timestamp,
        success,
        toolsUsed: state.toolsUsed,
        durationMs,
        notes: 'auto-tracked: workflow steps completed',
      });

      this.active = null;
      return { completed: true, progress: buildProgress(state) };
    }

    return { completed: false, progress: buildProgress(this.active) };
  }

  notifyExplicitOutcome(workflowId: string): void {
    if (this.active && this.active.workflowId === workflowId) {
      this.active = null;
    }
  }

  getActive(): ActiveWorkflowState | null {
    if (!this.active) return null;
    return {
      ...this.active,
      requiredSteps: [...this.active.requiredSteps],
      completedSteps: [...this.active.completedSteps],
      toolsUsed: [...this.active.toolsUsed],
    };
  }

  getProgress(): WorkflowProgress | null {
    return this.active ? buildProgress(this.active) : null;
  }

  cancel(): void {
    this.active = null;
  }
}

let singleton: WorkflowTracker | null = null;

export function getWorkflowTracker(): WorkflowTracker {
  if (!singleton) {
    singleton = new WorkflowTracker();
  }
  return singleton;
}

export function resetWorkflowTrackerForTests(): void {
  singleton = null;
}
