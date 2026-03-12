import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  validateWorkflow,
  exportWorkflow,
  WorkflowShareSchema,
} from '../../../src/tools/context/workflow-schema.js';
import { getAllWorkflows } from '../../../src/tools/context/workflow-knowledge.js';
import { getTools } from '../../../src/tools/context/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidShare() {
  return {
    version: 1 as const,
    workflow: {
      id: 'test-workflow-id',
      name: 'Test Workflow',
      description: 'A workflow used in tests',
      domain: 'blueprint',
      difficulty: 'beginner' as const,
      intentPatterns: ['test pattern one'],
      prerequisites: [],
      steps: [{ tool: 'actor-spawn', purpose: 'Spawn test actor' }],
      expectedOutcome: 'Test actor spawned',
      source: 'community' as const,
      tags: ['test'],
    },
    author: { name: 'Tester' },
    createdAt: new Date().toISOString(),
  };
}

const mockCtx = {
  bridge: {},
  logger: {},
  cache: {},
  session: {},
  approvalGate: {},
  allowedRoots: [],
  slateStore: {},
} as any;

function findTool(name: string) {
  const tools = getTools();
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

// ---------------------------------------------------------------------------
// 1. workflow-schema.ts — validateWorkflow
// ---------------------------------------------------------------------------

describe('workflow-schema — validateWorkflow', () => {
  it('accepts a valid workflow share format and returns { valid: true, workflow }', () => {
    const input = makeValidShare();
    const result = validateWorkflow(input);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.workflow.version).toBe(1);
      expect(result.workflow.workflow.id).toBe('test-workflow-id');
    }
  });

  it('rejects missing version field', () => {
    const input = makeValidShare() as any;
    delete input.version;
    const result = validateWorkflow(input);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('version'))).toBe(true);
    }
  });

  it('rejects missing workflow.intentPatterns (requires min 1)', () => {
    const input = makeValidShare() as any;
    input.workflow.intentPatterns = [];
    const result = validateWorkflow(input);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('intentPatterns'))).toBe(true);
    }
  });

  it('rejects missing workflow.steps (requires min 1)', () => {
    const input = makeValidShare() as any;
    input.workflow.steps = [];
    const result = validateWorkflow(input);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('steps'))).toBe(true);
    }
  });

  it('rejects invalid difficulty enum value', () => {
    const input = makeValidShare() as any;
    input.workflow.difficulty = 'expert';
    const result = validateWorkflow(input);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('difficulty'))).toBe(true);
    }
  });

  it('accepts all valid difficulty values', () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      const input = { ...makeValidShare(), workflow: { ...makeValidShare().workflow, difficulty } };
      const result = validateWorkflow(input);
      expect(result.valid).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. workflow-schema.ts — exportWorkflow
// ---------------------------------------------------------------------------

describe('workflow-schema — exportWorkflow', () => {
  it('wraps a Workflow object with version, author, and createdAt', () => {
    const workflows = getAllWorkflows();
    const source = workflows[0];
    const exported = exportWorkflow(source, { name: 'TestAuthor', url: 'https://example.com' });

    expect(exported.version).toBe(1);
    expect(exported.author.name).toBe('TestAuthor');
    expect(exported.author.url).toBe('https://example.com');
    expect(typeof exported.createdAt).toBe('string');
    expect(new Date(exported.createdAt).getTime()).not.toBeNaN();
    expect(exported.workflow.id).toBe(source.id);
    expect(exported.workflow.name).toBe(source.name);
    expect(exported.workflow.steps.length).toBeGreaterThan(0);
  });

  it('uses default author "unknown" when no author is provided', () => {
    const workflows = getAllWorkflows();
    const exported = exportWorkflow(workflows[0]);
    expect(exported.author.name).toBe('unknown');
  });

  it('produces output that passes validateWorkflow', () => {
    const workflows = getAllWorkflows();
    const exported = exportWorkflow(workflows[0], { name: 'Tester' });
    const result = validateWorkflow(exported);
    expect(result.valid).toBe(true);
  });

  it('WorkflowShareSchema can parse the exported object', () => {
    const workflows = getAllWorkflows();
    const exported = exportWorkflow(workflows[0], { name: 'Tester' });
    const parsed = WorkflowShareSchema.safeParse(exported);
    expect(parsed.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. context-exportWorkflow tool handler
// ---------------------------------------------------------------------------

describe('context-exportWorkflow tool handler', () => {
  it('returns success with shareable envelope for a known built-in workflow ID', async () => {
    const tool = findTool('context-exportWorkflow');
    const result = await tool.handler(mockCtx, {
      workflowId: 'bp-create-actor-class',
      authorName: 'TestUser',
      authorUrl: 'https://github.com/testuser',
    });
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('success');
    expect(parsed.workflow).toBeDefined();
    expect(parsed.workflow.version).toBe(1);
    expect(parsed.workflow.workflow.id).toBe('bp-create-actor-class');
    expect(parsed.workflow.author.name).toBe('TestUser');
  });

  it('returns error for unknown workflow ID', async () => {
    const tool = findTool('context-exportWorkflow');
    const result = await tool.handler(mockCtx, {
      workflowId: 'does-not-exist-xyz',
    });
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('error');
    expect(parsed.message).toContain('does-not-exist-xyz');
  });
});

// ---------------------------------------------------------------------------
// 4. context-importWorkflow tool handler
// ---------------------------------------------------------------------------

describe('context-importWorkflow tool handler', () => {
  it('successfully imports a valid workflow share format', async () => {
    const tool = findTool('context-importWorkflow');
    const share = makeValidShare();
    // Use a unique ID to avoid collisions with persistent store
    share.workflow.id = `test-import-${Date.now()}`;
    share.workflow.name = 'Imported Test Workflow';

    const result = await tool.handler(mockCtx, { workflow: share });
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('success');
    expect(parsed.message).toContain('Imported Test Workflow');
    expect(parsed.id).toBe(share.workflow.id);
    expect(parsed.domain).toBe('blueprint');
    expect(parsed.stepCount).toBe(1);
  });

  it('rejects invalid workflow format with error details', async () => {
    const tool = findTool('context-importWorkflow');
    const badPayload = {
      version: 1,
      workflow: {
        // missing required fields: name, description, domain, difficulty, intentPatterns, steps, expectedOutcome
        id: 'bad-workflow',
      },
      author: { name: 'someone' },
      createdAt: new Date().toISOString(),
    };

    const result = await tool.handler(mockCtx, { workflow: badPayload });
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('error');
    expect(parsed.message).toBe('Invalid workflow format');
    expect(Array.isArray(parsed.errors)).toBe(true);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  it('rejects non-object input', async () => {
    const tool = findTool('context-importWorkflow');
    const result = await tool.handler(mockCtx, { workflow: 'not-an-object' });
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.status).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// 5. Community workflow files validation
// ---------------------------------------------------------------------------

describe('community workflow files', () => {
  const workflowsDir = join(__dirname, '..', '..', '..', '..', 'workflows');

  it('workflows directory contains JSON files', () => {
    const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
  });

  it('reads and validates all 10 community workflow JSON files', () => {
    const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBe(10);

    for (const file of files) {
      const fullPath = join(workflowsDir, file);
      const raw = readFileSync(fullPath, 'utf-8');
      let json: unknown;
      expect(() => {
        json = JSON.parse(raw);
      }, `${file} must be valid JSON`).not.toThrow();

      const result = validateWorkflow(json);
      expect(result.valid, `${file} failed validation: ${
        result.valid ? '' : (result as { valid: false; errors: string[] }).errors.join(', ')
      }`).toBe(true);
    }
  });

  it('each community workflow has a unique id', () => {
    const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.json'));
    const ids: string[] = [];
    for (const file of files) {
      const raw = readFileSync(join(workflowsDir, file), 'utf-8');
      const json = JSON.parse(raw) as any;
      ids.push(json?.workflow?.id);
    }
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('each community workflow has source set to "community"', () => {
    const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      const raw = readFileSync(join(workflowsDir, file), 'utf-8');
      const json = JSON.parse(raw) as any;
      expect(json?.workflow?.source, `${file} should have source "community"`).toBe('community');
    }
  });
});
