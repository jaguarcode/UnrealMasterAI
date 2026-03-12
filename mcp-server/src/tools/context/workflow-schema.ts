import { z } from 'zod';
import type { Workflow } from './workflow-knowledge.js';

const WorkflowStepSchema = z.object({
  tool: z.string(),
  purpose: z.string(),
  optional: z.boolean().optional(),
  repeat: z.boolean().optional(),
});

export const WorkflowShareSchema = z.object({
  version: z.literal(1),
  workflow: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    domain: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    intentPatterns: z.array(z.string()).min(1),
    prerequisites: z.array(z.string()).default([]),
    steps: z.array(WorkflowStepSchema).min(1),
    expectedOutcome: z.string(),
    source: z.enum(['epic-docs', 'community', 'user-defined']).default('community'),
    tags: z.array(z.string()).default([]),
  }),
  author: z.object({
    name: z.string(),
    url: z.string().optional(),
  }),
  readme: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type WorkflowShareFormat = z.infer<typeof WorkflowShareSchema>;

export function validateWorkflow(json: unknown):
  | { valid: true; workflow: WorkflowShareFormat }
  | { valid: false; errors: string[] } {
  const result = WorkflowShareSchema.safeParse(json);
  if (result.success) {
    return { valid: true, workflow: result.data };
  }
  const errors = result.error.errors.map(
    (e) => `${e.path.join('.')}: ${e.message}`
  );
  return { valid: false, errors };
}

export function exportWorkflow(
  workflow: Workflow,
  author: { name: string; url?: string } = { name: 'unknown' }
): WorkflowShareFormat {
  return {
    version: 1,
    workflow: {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      domain: workflow.domain,
      difficulty: workflow.difficulty,
      intentPatterns: workflow.intentPatterns,
      prerequisites: workflow.prerequisites ?? [],
      steps: workflow.steps,
      expectedOutcome: workflow.expectedOutcome,
      source: workflow.source ?? 'community',
      tags: workflow.tags ?? [],
    },
    author,
    createdAt: new Date().toISOString(),
  };
}
