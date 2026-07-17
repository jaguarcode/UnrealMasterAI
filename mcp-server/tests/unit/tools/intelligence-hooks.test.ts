import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Mocks ──
// Hoisted mock fns so the (hoisted) vi.mock factories can reference them.
const { recordCallMock, matchErrorMock } = vi.hoisted(() => ({
  recordCallMock: vi.fn(),
  matchErrorMock: vi.fn(),
}));

// Mock the persistence-backed usage tracker so recordCall never writes
// test-data/tool-usage.json (owned by usage-tracker.test.ts).
vi.mock('../../../src/tools/context/usage-tracker.js', () => ({
  getUsageTracker: () => ({ recordCall: recordCallMock }),
}));

// Mock the workflow-store so the REAL WorkflowTracker's auto-record never writes
// test-data/workflow-outcomes.json.
vi.mock('../../../src/tools/context/workflow-store.js', () => ({
  recordOutcome: vi.fn(),
}));

// Mock matchError so we control the learned-resolution similarity deterministically.
vi.mock('../../../src/tools/context/error-learning.js', () => ({
  matchError: matchErrorMock,
}));

import {
  extractResultStatus,
  registerIntelligenceHooks,
} from '../../../src/tools/context/intelligence-hooks.js';
import { ToolHookManager, type PostHookContext } from '../../../src/tools/tool-hooks.js';
import {
  getWorkflowTracker,
  resetWorkflowTrackerForTests,
} from '../../../src/tools/context/workflow-tracker.js';
import type { McpToolResult } from '../../../src/tools/tool-module.js';

// ── Helpers ──

function textResult(payload: unknown, extra: Record<string, unknown> = {}): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], ...extra };
}

function makeHooks(): ToolHookManager {
  const hooks = new ToolHookManager();
  registerIntelligenceHooks(hooks);
  return hooks;
}

function ctxFor(toolName: string, result: McpToolResult, durationMs = 42): PostHookContext {
  return { toolName, params: {}, result, durationMs };
}

/** Run the registered post-hook chain and return the (possibly transformed) result. */
async function run(hooks: ToolHookManager, toolName: string, result: McpToolResult, durationMs = 42) {
  return hooks.runPostHooks(toolName, {}, result, durationMs);
}

/** Parse the first text content block of a result as JSON. */
function parseFirst(result: McpToolResult): Record<string, unknown> {
  return JSON.parse(result.content[0].text);
}

function noLearnedMatch() {
  return { builtinStrategy: null, learnedResolutions: [], recommendation: {} };
}

function learnedMatch(similarity: number, id = 'res-1', fix = 'Set mobility to Movable') {
  return {
    builtinStrategy: null,
    learnedResolutions: [
      {
        resolution: { id, successfulFix: { description: fix, toolSequence: [], steps: [] } },
        similarity,
        matchReason: 'test',
      },
    ],
    recommendation: {},
  };
}

let savedHintsEnv: string | undefined;

beforeEach(() => {
  recordCallMock.mockClear();
  matchErrorMock.mockReset();
  matchErrorMock.mockReturnValue(noLearnedMatch());
  resetWorkflowTrackerForTests();
  savedHintsEnv = process.env.UMA_HINTS;
  delete process.env.UMA_HINTS;
});

afterEach(() => {
  if (savedHintsEnv === undefined) delete process.env.UMA_HINTS;
  else process.env.UMA_HINTS = savedHintsEnv;
});

// ── extractResultStatus ──

describe('extractResultStatus', () => {
  it('treats status:success as success with no error message', () => {
    const r = extractResultStatus(textResult({ status: 'success', foo: 1 }));
    expect(r).toEqual({ success: true, errorMessage: null });
  });

  it('treats status:error with error string as failure with message', () => {
    const r = extractResultStatus(textResult({ status: 'error', error: 'boom happened' }));
    expect(r.success).toBe(false);
    expect(r.errorMessage).toBe('boom happened');
  });

  it('stringifies object error fields', () => {
    const r = extractResultStatus(textResult({ status: 'error', error: { code: 42 } }));
    expect(r.success).toBe(false);
    expect(r.errorMessage).toBe(JSON.stringify({ code: 42 }));
  });

  it('uses message when status is error and no error field', () => {
    const r = extractResultStatus(textResult({ status: 'error', message: 'the message' }));
    expect(r.success).toBe(false);
    expect(r.errorMessage).toBe('the message');
  });

  it('treats a truthy error field (without status) as failure', () => {
    const r = extractResultStatus(textResult({ error: 'oops' }));
    expect(r.success).toBe(false);
    expect(r.errorMessage).toBe('oops');
  });

  it('truncates long error messages to 500 chars', () => {
    const long = 'x'.repeat(1000);
    const r = extractResultStatus(textResult({ status: 'error', error: long }));
    expect(r.errorMessage).toHaveLength(500);
  });

  it('parse failure defaults to success when isError is not set', () => {
    const r = extractResultStatus({ content: [{ type: 'text', text: 'not json {{{' }] });
    expect(r).toEqual({ success: true, errorMessage: null });
  });

  it('parse failure with isError:true is a failure (no message)', () => {
    const r = extractResultStatus({ content: [{ type: 'text', text: 'not json' }], isError: true });
    expect(r).toEqual({ success: false, errorMessage: null });
  });

  it('isError:true overrides a success payload', () => {
    const r = extractResultStatus(textResult({ status: 'success' }, { isError: true }));
    expect(r.success).toBe(false);
  });

  it('non-text content defaults to success', () => {
    const r = extractResultStatus({ content: [{ type: 'image', data: 'x' }] });
    expect(r).toEqual({ success: true, errorMessage: null });
  });
});

// ── Recording ──

describe('intelligence hook — usage recording', () => {
  it('records the call for a non-meta tool with success and duration', async () => {
    const hooks = makeHooks();
    await run(hooks, 'actor-spawn', textResult({ status: 'success' }), 123);

    expect(recordCallMock).toHaveBeenCalledTimes(1);
    const arg = recordCallMock.mock.calls[0][0];
    expect(arg.tool).toBe('actor-spawn');
    expect(arg.success).toBe(true);
    expect(arg.durationMs).toBe(123);
    expect(typeof arg.timestamp).toBe('number');
  });

  it('records the call for a meta (context-*) tool too', async () => {
    const hooks = makeHooks();
    await run(hooks, 'context-matchIntent', textResult({ status: 'success' }));

    expect(recordCallMock).toHaveBeenCalledTimes(1);
    expect(recordCallMock.mock.calls[0][0].tool).toBe('context-matchIntent');
  });

  it('records success:false when the result declares an error', async () => {
    const hooks = makeHooks();
    await run(hooks, 'blueprint-connectPins', textResult({ status: 'error', error: 'bad pin' }));

    expect(recordCallMock).toHaveBeenCalledTimes(1);
    expect(recordCallMock.mock.calls[0][0].success).toBe(false);
  });
});

// ── Hint injection on failure ──

describe('intelligence hook — known-resolution hint injection', () => {
  it('injects a hint when top learned similarity is >= 0.4', async () => {
    matchErrorMock.mockReturnValue(learnedMatch(0.4, 'res-42', 'Do the fix'));
    const hooks = makeHooks();
    const out = await run(hooks, 'blueprint-connectPins', textResult({ status: 'error', error: 'pin failure' }));

    const parsed = parseFirst(out);
    expect(parsed._uma).toBeDefined();
    const uma = parsed._uma as Record<string, unknown>;
    const hint = uma.hint as Record<string, unknown>;
    expect(hint.type).toBe('known-resolution');
    expect(hint.resolutionId).toBe('res-42');
    expect(hint.similarity).toBe(0.4);
    expect(hint.fix).toBe('Do the fix');
    expect(hint.note).toContain('context-matchError');
    // matchError called with the extracted error message and tool.
    expect(matchErrorMock).toHaveBeenCalledWith('pin failure', 'blueprint-connectPins');
  });

  it('does NOT inject a hint when top similarity is below 0.4', async () => {
    matchErrorMock.mockReturnValue(learnedMatch(0.39));
    const hooks = makeHooks();
    const out = await run(hooks, 'blueprint-connectPins', textResult({ status: 'error', error: 'pin failure' }));

    const parsed = parseFirst(out);
    expect(parsed._uma).toBeUndefined();
  });

  it('does NOT call matchError on successful calls', async () => {
    const hooks = makeHooks();
    await run(hooks, 'actor-spawn', textResult({ status: 'success' }));
    expect(matchErrorMock).not.toHaveBeenCalled();
  });

  it('does NOT inject hints for meta tools even on error', async () => {
    matchErrorMock.mockReturnValue(learnedMatch(0.9));
    const hooks = makeHooks();
    const out = await run(hooks, 'context-matchIntent', textResult({ status: 'error', error: 'x' }));
    const parsed = parseFirst(out);
    expect(parsed._uma).toBeUndefined();
    // meta tool → hint path skipped entirely, matchError not called.
    expect(matchErrorMock).not.toHaveBeenCalled();
  });
});

// ── UMA_HINTS opt-out ──

describe('intelligence hook — UMA_HINTS=off disables injection', () => {
  it('does not inject a hint when UMA_HINTS is off (but still records)', async () => {
    process.env.UMA_HINTS = 'off';
    matchErrorMock.mockReturnValue(learnedMatch(0.9));
    const hooks = makeHooks();
    const out = await run(hooks, 'blueprint-connectPins', textResult({ status: 'error', error: 'x' }));

    const parsed = parseFirst(out);
    expect(parsed._uma).toBeUndefined();
    expect(recordCallMock).toHaveBeenCalledTimes(1); // recording still happens
    expect(matchErrorMock).not.toHaveBeenCalled(); // injection short-circuited before matchError
  });
});

// ── Workflow progress / completion injection ──

describe('intelligence hook — workflow progress injection', () => {
  const WORKFLOW = {
    id: 'wf-1',
    name: 'Sample',
    steps: [{ tool: 'tool-a' }, { tool: 'tool-b' }],
  };

  it('injects in-progress workflow info on a successful non-meta call', async () => {
    getWorkflowTracker().start(WORKFLOW, 0.9);
    const hooks = makeHooks();
    const out = await run(hooks, 'tool-a', textResult({ status: 'success' }));

    const parsed = parseFirst(out);
    const wf = (parsed._uma as Record<string, unknown>).workflow as Record<string, unknown>;
    expect(wf.id).toBe('wf-1');
    expect(wf.name).toBe('Sample');
    expect(wf.progress).toBe('1/2');
    expect(wf.nextSuggested).toBe('tool-b');
    expect(wf.completed).toBeUndefined();
  });

  it('injects a completion object when the workflow finishes', async () => {
    getWorkflowTracker().start(WORKFLOW, 0.9);
    const hooks = makeHooks();
    await run(hooks, 'tool-a', textResult({ status: 'success' }));
    const out = await run(hooks, 'tool-b', textResult({ status: 'success' }));

    const parsed = parseFirst(out);
    const wf = (parsed._uma as Record<string, unknown>).workflow as Record<string, unknown>;
    expect(wf.id).toBe('wf-1');
    expect(wf.completed).toBe(true);
    expect(wf.autoRecorded).toBe(true);
    expect(wf.progress).toBeUndefined();
  });

  it('does not inject workflow info when no workflow is active', async () => {
    const hooks = makeHooks();
    const out = await run(hooks, 'tool-a', textResult({ status: 'success' }));
    const parsed = parseFirst(out);
    expect(parsed._uma).toBeUndefined();
  });
});

// ── Pass-through / robustness ──

describe('intelligence hook — robustness', () => {
  it('passes non-JSON text results through untouched (still records)', async () => {
    getWorkflowTracker().start({ id: 'wf', name: 'W', steps: [{ tool: 'tool-a' }] }, 0.9);
    const hooks = makeHooks();
    const original = { content: [{ type: 'text' as const, text: 'plain non-json output' }] };
    const out = await run(hooks, 'tool-a', original);

    // Returned result unchanged (post-hook returns void → runPostHooks keeps original).
    expect(out).toBe(original);
    expect(out.content[0].text).toBe('plain non-json output');
    expect(recordCallMock).toHaveBeenCalledTimes(1);
  });

  it('passes JSON-array (non-object) results through untouched', async () => {
    getWorkflowTracker().start({ id: 'wf', name: 'W', steps: [{ tool: 'tool-a' }] }, 0.9);
    const hooks = makeHooks();
    const original = textResult([1, 2, 3]);
    const out = await run(hooks, 'tool-a', original);
    expect(out).toBe(original);
  });

  it('swallows a thrown recordCall and returns the result unchanged', async () => {
    recordCallMock.mockImplementationOnce(() => {
      throw new Error('disk full');
    });
    const hooks = makeHooks();
    const original = textResult({ status: 'success', data: 1 });
    const out = await run(hooks, 'actor-spawn', original);

    // Hook must not throw; the result is returned intact.
    expect(out.content[0].text).toBe(original.content[0].text);
    expect(parseFirst(out)).toEqual({ status: 'success', data: 1 });
  });
});
