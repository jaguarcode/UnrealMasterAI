/**
 * TypeScript types and Zod schemas for Blueprint AST serialization.
 * Matches docs/schemas/blueprint-ast.schema.json
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const BlueprintPinLinkSchema = z.object({
  nodeId: z.string().uuid(),
  pinId: z.string().uuid(),
});

export const BlueprintPinSchema = z.object({
  pinId: z.string().uuid(),
  pinName: z.string(),
  direction: z.enum(['Input', 'Output']),
  category: z.string(),
  subCategory: z.string().optional().default(''),
  isExec: z.boolean(),
  defaultValue: z.string().optional().default(''),
  linkedTo: z.array(BlueprintPinLinkSchema),
});

export const BlueprintNodeSchema = z.object({
  nodeId: z.string().uuid(),
  nodeClass: z.string(),
  nodeTitle: z.string(),
  posX: z.number().int(),
  posY: z.number().int(),
  comment: z.string().optional().default(''),
  pins: z.array(BlueprintPinSchema),
});

export const GraphTypeSchema = z.enum([
  'EventGraph',
  'FunctionGraph',
  'MacroGraph',
  'AnimGraph',
]);

export const BlueprintGraphSchema = z.object({
  graphName: z.string(),
  graphType: GraphTypeSchema,
  nodes: z.array(BlueprintNodeSchema),
});

export const BlueprintASTSchema = z.object({
  blueprintPath: z.string(),
  blueprintClass: z.string(),
  parentClass: z.string(),
  graphs: z.array(BlueprintGraphSchema).min(1),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types (derived from Zod for single source of truth)
// ---------------------------------------------------------------------------

export type BlueprintPinLink = z.infer<typeof BlueprintPinLinkSchema>;
export type BlueprintPin = z.infer<typeof BlueprintPinSchema>;
export type BlueprintNode = z.infer<typeof BlueprintNodeSchema>;
export type GraphType = z.infer<typeof GraphTypeSchema>;
export type BlueprintGraph = z.infer<typeof BlueprintGraphSchema>;
export type BlueprintAST = z.infer<typeof BlueprintASTSchema>;
