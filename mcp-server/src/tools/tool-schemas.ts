/**
 * Zod schemas for MCP tool inputs.
 * Each tool's input parameters are validated before execution.
 */
import { z } from 'zod';

// editor.ping — no parameters
export const PingInputSchema = z.object({});

// editor.getLevelInfo — no parameters
export const GetLevelInfoInputSchema = z.object({});

// editor.listActors — optional filter
export const ListActorsInputSchema = z.object({
  className: z.string().optional(),
  tag: z.string().optional(),
});

// editor.getAssetInfo — asset path required
export const GetAssetInfoInputSchema = z.object({
  assetPath: z.string(),
});

// blueprint.serialize — asset path required
export const BlueprintSerializeInputSchema = z.object({
  assetPath: z.string(),
  graphName: z.string().optional(),
});

// blueprint.createNode — target blueprint + node class
export const BlueprintCreateNodeInputSchema = z.object({
  blueprintCacheKey: z.string(),
  graphName: z.string(),
  nodeClass: z.string(),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
});

// blueprint.connectPins — source and target pin IDs
export const BlueprintConnectPinsInputSchema = z.object({
  blueprintCacheKey: z.string(),
  sourcePinId: z.string(),
  targetPinId: z.string(),
});

// blueprint.modifyProperty — modify a property on a node
export const BlueprintModifyPropertyInputSchema = z.object({
  blueprintCacheKey: z.string(),
  nodeId: z.string(),
  propertyName: z.string(),
  propertyValue: z.string(),
});

// blueprint.deleteNode — delete a node from a graph
export const BlueprintDeleteNodeInputSchema = z.object({
  blueprintCacheKey: z.string(),
  nodeId: z.string(),
});

// compilation.trigger — no parameters
export const CompilationTriggerInputSchema = z.object({});

// compilation.getStatus — optional compile ID
export const CompilationGetStatusInputSchema = z.object({
  compileId: z.string().optional(),
});

// compilation.getErrors — optional compile ID
export const CompilationGetErrorsInputSchema = z.object({
  compileId: z.string().optional(),
});

// file.read
export const FileReadInputSchema = z.object({
  filePath: z.string(),
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
});

// file.write
export const FileWriteInputSchema = z.object({
  filePath: z.string(),
  content: z.string(),
});

// file.search
export const FileSearchInputSchema = z.object({
  pattern: z.string(),
  directory: z.string().optional(),
  glob: z.string().optional(),
});
