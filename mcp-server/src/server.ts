/**
 * MCP Server Setup.
 * Creates and configures the McpServer with all tool registrations.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import path from 'node:path';
import type { Logger } from './observability/logger.js';
import type { WebSocketBridge } from './transport/websocket-bridge.js';
import { editorPing } from './tools/editor/ping.js';
import { editorGetLevelInfo } from './tools/editor/get-level-info.js';
import { editorListActors } from './tools/editor/list-actors.js';
import { editorGetAssetInfo } from './tools/editor/get-asset-info.js';
import { CacheStore } from './state/cache-store.js';
import { blueprintSerialize } from './tools/blueprint/serialize.js';
import { blueprintCreateNode } from './tools/blueprint/create-node.js';
import { blueprintConnectPins } from './tools/blueprint/connect-pins.js';
import { blueprintModifyProperty } from './tools/blueprint/modify-property.js';
import { blueprintDeleteNode } from './tools/blueprint/delete-node.js';
import { compilationTrigger } from './tools/compilation/trigger-compile.js';
import { compilationGetStatus } from './tools/compilation/get-status.js';
import { compilationGetErrors } from './tools/compilation/get-errors.js';
import { SessionManager } from './state/session.js';
import { compilationSelfHeal } from './tools/compilation/self-heal.js';
import { fileRead } from './tools/file/read-file.js';
import { fileWrite } from './tools/file/write-file.js';
import { fileSearch } from './tools/file/search-files.js';
import { ApprovalGate } from './state/safety.js';
import { validateSlateCode } from './tools/slate/validate-slate.js';
import { generateWidgetContext } from './tools/slate/generate-widget.js';
import { listTemplates } from './tools/slate/list-templates.js';
import { EmbeddingStore } from './rag/embedding-store.js';
import { SlateTemplateLoader } from './rag/slate-templates.js';
import { chatSendMessage } from './tools/chat/send-message.js';
// Project context tools
import { projectGetStructure } from './tools/project/get-structure.js';
import { projectGetSettings } from './tools/project/get-settings.js';
import { projectGetPlugins } from './tools/project/get-plugins.js';
import { projectGetDependencyGraph } from './tools/project/get-dependency-graph.js';
import { projectGetClassHierarchy } from './tools/project/get-class-hierarchy.js';
import { projectSnapshot } from './tools/project/snapshot.js';
// Asset management tools
import { assetCreate } from './tools/asset/create.js';
import { assetDuplicate } from './tools/asset/duplicate.js';
import { assetRename } from './tools/asset/rename.js';
import { assetDelete } from './tools/asset/delete.js';
import { assetImport } from './tools/asset/import.js';
import { assetExport } from './tools/asset/export.js';
import { assetGetReferences } from './tools/asset/get-references.js';
import { assetSetMetadata } from './tools/asset/set-metadata.js';
// Content browser tools
import { contentListAssets } from './tools/content/list-assets.js';
import { contentFindAssets } from './tools/content/find-assets.js';
import { contentGetAssetDetails } from './tools/content/get-asset-details.js';
import { contentValidateAssets } from './tools/content/validate-assets.js';
// Actor management tools
import { actorSpawn } from './tools/actor/spawn.js';
import { actorDelete } from './tools/actor/delete.js';
import { actorSetTransform } from './tools/actor/set-transform.js';
import { actorGetProperties } from './tools/actor/get-properties.js';
import { actorSetProperty } from './tools/actor/set-property.js';
import { actorGetComponents } from './tools/actor/get-components.js';
import { actorAddComponent } from './tools/actor/add-component.js';
import { actorSelect } from './tools/actor/select.js';
import { actorSetArrayRef } from './tools/actor/set-array-ref.js';
// Level management tools
import { levelCreate } from './tools/level/create.js';
import { levelOpen } from './tools/level/open.js';
import { levelSave } from './tools/level/save.js';
import { levelAddSublevel } from './tools/level/add-sublevel.js';
import { levelGetWorldSettings } from './tools/level/get-world-settings.js';
// Material tools
import { materialCreate } from './tools/material/create.js';
import { materialSetParameter } from './tools/material/set-parameter.js';
import { materialGetParameters } from './tools/material/get-parameters.js';
import { materialCreateInstance } from './tools/material/create-instance.js';
import { materialSetTexture } from './tools/material/set-texture.js';
import { materialGetNodes } from './tools/material/get-nodes.js';
// Mesh tools
import { meshGetInfo } from './tools/mesh/get-info.js';
import { meshSetMaterial } from './tools/mesh/set-material.js';
import { meshGenerateCollision } from './tools/mesh/generate-collision.js';
import { meshSetLOD } from './tools/mesh/set-lod.js';
// DataTable tools
import { datatableCreate } from './tools/datatable/create.js';
import { datatableAddRow } from './tools/datatable/add-row.js';
import { datatableGetRows } from './tools/datatable/get-rows.js';
import { datatableRemoveRow } from './tools/datatable/remove-row.js';
// Animation tools
import { animListMontages } from './tools/animation/list-montages.js';
import { animGetBlendSpace } from './tools/animation/get-blend-space.js';
import { animCreateMontage } from './tools/animation/create-montage.js';
import { animListSequences } from './tools/animation/list-sequences.js';
import { animGetSkeletonInfo } from './tools/animation/get-skeleton-info.js';
// Gameplay tools
import { gameplayGetGameMode } from './tools/gameplay/get-game-mode.js';
import { gameplaySetGameMode } from './tools/gameplay/set-game-mode.js';
import { gameplayListInputActions } from './tools/gameplay/list-input-actions.js';
import { gameplayAddInputAction } from './tools/gameplay/add-input-action.js';
// Source control tools
import { sourcecontrolGetStatus } from './tools/sourcecontrol/get-status.js';
import { sourcecontrolCheckout } from './tools/sourcecontrol/checkout.js';
import { sourcecontrolDiff } from './tools/sourcecontrol/diff.js';
// Build tools
import { buildLightmaps } from './tools/build/lightmaps.js';
import { buildGetMapCheck } from './tools/build/get-map-check.js';
import { buildCookContent } from './tools/build/cook-content.js';
// Debug tools
import { debugExecConsole } from './tools/debug/exec-console.js';
import { debugGetLog } from './tools/debug/get-log.js';
import { debugGetPerformance } from './tools/debug/get-performance.js';
// Sequencer tools
import { sequencerCreate } from './tools/sequencer/create.js';
import { sequencerOpen } from './tools/sequencer/open.js';
import { sequencerAddTrack } from './tools/sequencer/add-track.js';
import { sequencerAddBinding } from './tools/sequencer/add-binding.js';
import { sequencerSetKeyframe } from './tools/sequencer/set-keyframe.js';
import { sequencerGetInfo } from './tools/sequencer/get-info.js';
import { sequencerExportFbx } from './tools/sequencer/export-fbx.js';
import { sequencerImportFbx } from './tools/sequencer/import-fbx.js';
// Widget tools
import { widgetCreate } from './tools/widget/create.js';
import { widgetGetInfo } from './tools/widget/get-info.js';
import { widgetAddElement } from './tools/widget/add-element.js';
import { widgetSetProperty } from './tools/widget/set-property.js';
import { widgetGetBindings } from './tools/widget/get-bindings.js';
import { widgetListWidgets } from './tools/widget/list-widgets.js';
// Editor utility tools
import { editorGetSelection } from './tools/editor/get-selection.js';
import { editorGetViewport } from './tools/editor/get-viewport.js';
import { editorSetSelection } from './tools/editor/set-selection.js';
import { editorGetRecentActivity } from './tools/editor/get-recent-activity.js';
import { editorBatchOperation } from './tools/editor/batch-operation.js';
// AI / Navigation tools
import { aiCreateBehaviorTree } from './tools/ai/create-behavior-tree.js';
import { aiCreateBlackboard } from './tools/ai/create-blackboard.js';
import { aiGetBehaviorTreeInfo } from './tools/ai/get-behavior-tree-info.js';
import { aiGetBlackboardKeys } from './tools/ai/get-blackboard-keys.js';
import { aiAddBlackboardKey } from './tools/ai/add-blackboard-key.js';
import { aiConfigureNavMesh } from './tools/ai/configure-nav-mesh.js';
import { aiGetNavMeshInfo } from './tools/ai/get-nav-mesh-info.js';
import { aiCreateEqs } from './tools/ai/create-eqs.js';
// Texture pipeline tools
import { textureImport } from './tools/texture/import.js';
import { textureGetInfo } from './tools/texture/get-info.js';
import { textureSetCompression } from './tools/texture/set-compression.js';
import { textureCreateRenderTarget } from './tools/texture/create-render-target.js';
import { textureResize } from './tools/texture/resize.js';
import { textureListTextures } from './tools/texture/list-textures.js';
// Niagara/VFX tools
import { niagaraCreateSystem } from './tools/niagara/create-system.js';
import { niagaraGetInfo } from './tools/niagara/get-info.js';
import { niagaraAddEmitter } from './tools/niagara/add-emitter.js';
import { niagaraSetParameter } from './tools/niagara/set-parameter.js';
import { niagaraCompile } from './tools/niagara/compile.js';
import { niagaraListSystems } from './tools/niagara/list-systems.js';
// Audio tools
import { audioImport } from './tools/audio/import.js';
import { audioCreateCue } from './tools/audio/create-cue.js';
import { audioGetInfo } from './tools/audio/get-info.js';
import { audioSetAttenuation } from './tools/audio/set-attenuation.js';
import { audioCreateMetaSound } from './tools/audio/create-meta-sound.js';
import { audioListAssets } from './tools/audio/list-assets.js';
// Landscape tools
import { landscapeCreate } from './tools/landscape/create.js';
import { landscapeImportHeightmap } from './tools/landscape/import-heightmap.js';
import { landscapeExportHeightmap } from './tools/landscape/export-heightmap.js';
import { landscapeGetInfo } from './tools/landscape/get-info.js';
import { landscapeSetMaterial } from './tools/landscape/set-material.js';
// Physics tools
import { physicsCreateAsset } from './tools/physics/create-asset.js';
import { physicsGetInfo } from './tools/physics/get-info.js';
import { physicsSetProfile } from './tools/physics/set-profile.js';
import { physicsCreateMaterial } from './tools/physics/create-material.js';
import { physicsSetConstraint } from './tools/physics/set-constraint.js';
// World Partition tools
import { worldpartitionGetInfo } from './tools/worldpartition/get-info.js';
import { worldpartitionSetConfig } from './tools/worldpartition/set-config.js';
import { worldpartitionCreateDataLayer } from './tools/worldpartition/create-data-layer.js';
import { worldpartitionCreateHLOD } from './tools/worldpartition/create-hlod.js';
// Foliage tools
import { foliageCreateType } from './tools/foliage/create-type.js';
import { foliageGetInfo } from './tools/foliage/get-info.js';
import { foliageSetProperties } from './tools/foliage/set-properties.js';
// Curve tools
import { curveCreate } from './tools/curve/create.js';
import { curveSetKeys } from './tools/curve/set-keys.js';
import { curveGetInfo } from './tools/curve/get-info.js';
// PCG tools
import { pcgCreateGraph } from './tools/pcg/create-graph.js';
import { pcgGetInfo } from './tools/pcg/get-info.js';
import { pcgAddNode } from './tools/pcg/add-node.js';
import { pcgConnectNodes } from './tools/pcg/connect-nodes.js';
// Geometry Script tools
import { geoscriptMeshBoolean } from './tools/geoscript/mesh-boolean.js';
import { geoscriptMeshTransform } from './tools/geoscript/mesh-transform.js';
import { geoscriptGetInfo } from './tools/geoscript/get-info.js';
// Workflow tools
import { workflowCreateCharacter } from './tools/workflow/create-character.js';
import { workflowCreateUIScreen } from './tools/workflow/create-ui-screen.js';
import { workflowSetupLevel } from './tools/workflow/setup-level.js';
import { workflowCreateInteractable } from './tools/workflow/create-interactable.js';
import { workflowCreateProjectile } from './tools/workflow/create-projectile.js';
import { workflowSetupMultiplayer } from './tools/workflow/setup-multiplayer.js';
import { workflowCreateInventorySystem } from './tools/workflow/create-inventory-system.js';
import { workflowCreateDialogueSystem } from './tools/workflow/create-dialogue-system.js';
// Analysis tools
import { analyzeBlueprintComplexity } from './tools/analyze/blueprint-complexity.js';
import { analyzeAssetHealth } from './tools/analyze/asset-health.js';
import { analyzePerformanceHints } from './tools/analyze/performance-hints.js';
import { analyzeCodeConventions } from './tools/analyze/code-conventions.js';
// Refactoring tools
import { refactorRenameChain } from './tools/refactor/rename-chain.js';
// Context intelligence tools
import { contextAutoGather } from './tools/context/auto-gather.js';
import { generateManifest } from './tools/context/tool-manifest.js';
import { listChains } from './tools/context/tool-chains.js';
import { listRecoveryStrategies } from './tools/context/error-recovery.js';
import { contextLearnWorkflow, contextMatchIntent, contextRecordOutcome, contextLearnFromDocs, contextGetOutcomeStats } from './tools/context/learn-workflow.js';
import { getAllWorkflows } from './tools/context/workflow-knowledge.js';
import { contextRecordResolution, contextMatchError, contextMarkResolutionReused, contextListResolutions } from './tools/context/error-learning.js';

/**
 * Server instructions embedded into the MCP initialization handshake.
 * Any Claude instance connecting to this server receives these directives
 * automatically — no CLAUDE.md file required in the user's project folder.
 */
const SERVER_INSTRUCTIONS = `
# Unreal Master Agent — Context-First Workflow

You are connected to the Unreal Master Agent MCP server, which provides 183 tools
across 37 domains for bidirectional control of Unreal Engine. Follow this mandatory
workflow for EVERY developer request involving UE operations.

## 1. Intent Matching (BEFORE executing any tool)
Always call \`context-matchIntent\` first with the developer's natural language request.
- Returns the optimal workflow, tool sequence, confidence score, and outcome history.
- If confidence >= 0.5, follow the recommended \`suggestedToolSequence\`.
- If confidence < 0.5, use your judgment but still reference partial matches.
- Prefer workflows with higher success rates when \`outcomeInfo\` is present.

## 2. Error Recovery (WHEN any tool call fails)
When a tool returns an error, immediately call \`context-matchError\` before manual troubleshooting.
- Checks both built-in recovery strategies AND learned resolutions from past sessions.
- Follow \`recommendation.steps\` in order.
- Respect \`recommendation.avoidActions\` — these are confirmed dead-end approaches.
- If confidence >= 0.4, apply the recommendation directly.

## 3. Outcome Recording (AFTER completing a workflow)
After completing a developer request that matched a workflow, call \`context-recordOutcome\`.
- Set \`success: true/false\` based on whether the task completed as expected.
- Include \`toolsUsed\` with the actual tools called during execution.
- This builds outcome history that improves future recommendations.

## 4. Error Resolution Learning (AFTER fixing an error)
When you resolve an error through troubleshooting, call \`context-recordResolution\`.
- Capture the original error message and source tool.
- Document ALL attempted fixes (including failures — these prevent future dead ends).
- Record the successful fix with its tool sequence and step-by-step instructions.
- Provide a root cause analysis.

## 5. Workflow Learning (WHEN discovering new patterns)
When you discover a new effective workflow not in the knowledge base:
- Call \`context-learnWorkflow\` to persist it.
- Include clear \`intentPatterns\` so future similar requests match it.
- Tag it with the relevant UE domain.

## Decision Flow

Developer Request
  → context-matchIntent(request)
    → High confidence → Follow suggestedToolSequence
      → Tool succeeds → Continue → All done → context-recordOutcome(success: true)
      → Tool fails → context-matchError(error)
        → Resolution found → Apply fix → context-markResolutionReused(id)
        → No match → Manual troubleshooting → Fixed → context-recordResolution(details)
    → Low/no match → Execute with best judgment
      → Success → context-learnWorkflow(new pattern)

## Key Technical Constraints
1. GameThread-only UE APIs — dispatch via AsyncTask(ENamedThreads::GameThread).
2. stdout is sacred — never console.log() in MCP server code, use stderr.
3. TryCreateConnection, never MakeLinkTo — for Blueprint pin connections.
4. UE is the WebSocket CLIENT — Node.js listens, UE connects.
5. Python scripts follow standard pattern — @execute_wrapper, execute(params), make_result()/make_error().
6. Spawn actors by full class path — e.g., /Script/Engine.TargetPoint, not just TargetPoint.
7. Actor mobility — StaticMeshActors default to Static, set to Movable before runtime movement.
`.trim();

/**
 * Create and configure the MCP server with all tools registered.
 * @param logger - stderr-only logger
 * @param bridge - WebSocket bridge to the UE plugin
 */
export function createServer(logger: Logger, bridge: WebSocketBridge): McpServer {
  const server = new McpServer(
    {
      name: 'unreal-master-agent',
      version: '0.4.0',
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  const cache = new CacheStore({ maxEntries: 1000, ttlMs: 60000 });

  const session = new SessionManager(3);

  const approvalGate = new ApprovalGate(60000, bridge);
  const allowedRoots = ['/Game/', '/Engine/'];

  // Initialize RAG store for Slate templates
  const slateStore = new EmbeddingStore();
  const templatesDir = path.resolve(process.cwd(), '../docs/slate-templates');
  try {
    const loader = new SlateTemplateLoader(slateStore, templatesDir);
    loader.loadAll();
    logger.info(`Slate templates loaded from ${templatesDir}`);
  } catch (e) {
    logger.warn(`Could not load Slate templates: ${(e as Error).message}`);
  }

  // Register editor.ping tool
  server.tool(
    'editor-ping',
    'Ping the Unreal Engine editor to verify connectivity. Returns "pong" if the UE plugin is connected.',
    {},
    async () => {
      logger.info('editor.ping called');
      return editorPing(bridge);
    }
  );

  // Register editor.getLevelInfo tool
  server.tool(
    'editor-getLevelInfo',
    'Get information about the currently loaded level in the Unreal Editor.',
    {},
    async () => {
      logger.info('editor.getLevelInfo called');
      return editorGetLevelInfo(bridge);
    }
  );

  // Register editor.listActors tool
  server.tool(
    'editor-listActors',
    'List actors in the current Unreal Editor level with optional class name and tag filters.',
    {
      className: z.string().optional().describe('Filter actors by class name'),
      tag: z.string().optional().describe('Filter actors by tag'),
    },
    async (params) => {
      logger.info('editor.listActors called');
      return editorListActors(bridge, params);
    }
  );

  // Register editor.getAssetInfo tool
  server.tool(
    'editor-getAssetInfo',
    'Get metadata for a specific asset in the Unreal Editor project.',
    {
      assetPath: z.string().describe('Asset path (e.g., /Game/BP_TestActor)'),
    },
    async (params) => {
      logger.info('editor.getAssetInfo called');
      return editorGetAssetInfo(bridge, params);
    }
  );

  // Blueprint tools
  server.tool(
    'blueprint-serialize',
    'Serialize a Blueprint to JSON AST. Returns a cache key and summary (full data cached server-side).',
    {
      assetPath: z.string().describe('Blueprint asset path (e.g., /Game/BP_TestActor)'),
      graphName: z.string().optional().describe('Specific graph name to serialize'),
    },
    async (params) => {
      logger.info(`blueprint.serialize called for ${params.assetPath}`);
      return blueprintSerialize(bridge, cache, params);
    }
  );

  server.tool(
    'blueprint-createNode',
    'Create a new Blueprint node in a graph.',
    {
      blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
      graphName: z.string().describe('Target graph name'),
      nodeClass: z.string().describe('Node class (e.g., K2Node_CallFunction)'),
      functionOwnerClass: z.string().optional().describe('Owner class for K2Node_CallFunction (e.g., Actor, KismetMathLibrary)'),
      functionName: z.string().optional().describe('Function name for K2Node_CallFunction (e.g., AddActorLocalRotation)'),
      posX: z.number().int().optional().describe('X position'),
      posY: z.number().int().optional().describe('Y position'),
    },
    async (params) => {
      logger.info('blueprint.createNode called');
      return blueprintCreateNode(bridge, params);
    }
  );

  server.tool(
    'blueprint-connectPins',
    'Connect two Blueprint pins using TryCreateConnection.',
    {
      blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
      sourcePinId: z.string().describe('Source pin UUID'),
      targetPinId: z.string().describe('Target pin UUID'),
    },
    async (params) => {
      logger.info('blueprint.connectPins called');
      return blueprintConnectPins(bridge, params);
    }
  );

  server.tool(
    'blueprint-modifyProperty',
    'Modify a property value on a Blueprint node.',
    {
      blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
      nodeId: z.string().describe('Node UUID'),
      propertyName: z.string().describe('Property name to modify'),
      propertyValue: z.string().describe('New property value'),
    },
    async (params) => {
      logger.info('blueprint.modifyProperty called');
      return blueprintModifyProperty(bridge, params);
    }
  );

  server.tool(
    'blueprint-deleteNode',
    'Delete a Blueprint node by its UUID.',
    {
      blueprintCacheKey: z.string().describe('Cache key from blueprint-serialize'),
      nodeId: z.string().describe('Node UUID to delete'),
    },
    async (params) => {
      logger.info('blueprint.deleteNode called');
      return blueprintDeleteNode(bridge, params, approvalGate);
    }
  );

  // Compilation tools
  server.tool(
    'compilation-trigger',
    'Trigger a Live Coding compilation in the Unreal Editor.',
    {},
    async () => {
      logger.info('compilation.trigger called');
      return compilationTrigger(bridge);
    }
  );

  server.tool(
    'compilation-getStatus',
    'Get the status of the current or last compilation.',
    {
      compileId: z.string().optional().describe('Compile ID to check'),
    },
    async (params) => {
      logger.info('compilation.getStatus called');
      return compilationGetStatus(bridge, params);
    }
  );

  server.tool(
    'compilation-getErrors',
    'Get structured compile errors from the last compilation.',
    {
      compileId: z.string().optional().describe('Compile ID to check'),
    },
    async (params) => {
      logger.info('compilation.getErrors called');
      return compilationGetErrors(bridge, params);
    }
  );

  // Self-healing compile loop
  server.tool(
    'compilation-selfHeal',
    'Get current compile errors and self-healing context. Returns errors, retry count, and suggestion for Claude to act on.',
    {
      filePath: z.string().optional().describe('File path with errors (for retry tracking)'),
    },
    async (params) => {
      logger.info('compilation.selfHeal called');
      return compilationSelfHeal(bridge, session, params);
    }
  );

  // File operation tools
  server.tool(
    'file-read',
    'Read a source file from the Unreal Engine project.',
    {
      filePath: z.string().describe('File path to read'),
      offset: z.number().int().optional(),
      limit: z.number().int().optional(),
    },
    async (params) => {
      logger.info(`file.read: ${params.filePath}`);
      return fileRead(bridge, params, allowedRoots);
    }
  );

  server.tool(
    'file-write',
    'Write content to a source file in the Unreal Engine project.',
    {
      filePath: z.string().describe('File path to write'),
      content: z.string().describe('File content'),
    },
    async (params) => {
      logger.info(`file.write: ${params.filePath}`);
      return fileWrite(bridge, params, allowedRoots, approvalGate);
    }
  );

  server.tool(
    'file-search',
    'Search for files or patterns in the Unreal Engine project.',
    {
      pattern: z.string().describe('Search pattern'),
      directory: z.string().optional(),
      glob: z.string().optional(),
    },
    async (params) => {
      logger.info(`file.search: ${params.pattern}`);
      return fileSearch(bridge, params);
    }
  );

  // Slate tools
  server.tool(
    'slate-validate',
    'Validate Slate C++ code for common errors (unbalanced SNew, missing SLATE_END_ARGS, etc.).',
    {
      code: z.string().describe('Slate C++ code to validate'),
    },
    async (params) => {
      logger.info('slate.validate called');
      const result = validateSlateCode(params.code);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'slate-generate',
    'Get relevant Slate templates and style guide for widget generation.',
    {
      query: z.string().describe('Widget description (e.g., "list view with checkboxes")'),
      widgetName: z.string().optional(),
    },
    async (params) => {
      logger.info(`slate.generate: ${params.query}`);
      const result = generateWidgetContext(slateStore, params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    'slate-listTemplates',
    'List all available Slate widget templates.',
    {},
    async () => {
      logger.info('slate.listTemplates called');
      const templates = listTemplates(slateStore);
      return { content: [{ type: 'text' as const, text: JSON.stringify(templates) }] };
    }
  );

  // Chat tools
  server.tool(
    'chat-sendMessage',
    'Send a message through the in-editor chat panel.',
    {
      text: z.string().describe('Message text to send'),
    },
    async (params) => {
      logger.info('chat.sendMessage called');
      return chatSendMessage(bridge, params);
    }
  );

  // Generic Python script execution (for custom one-off scripts in uma/ directory)
  server.tool('python-execute', 'Execute a named Python script from the UMA plugin Content/Python/uma/ directory.', {
    script: z.string().describe('Script name (without .py, e.g., "blueprint_setup_spinning_cube")'),
    args: z.record(z.unknown()).optional().describe('Arguments to pass to the script'),
  }, async (params) => {
    logger.info(`python.execute: ${params.script}`);
    const { v4: uuidv4 } = await import('uuid');
    const msg = {
      id: uuidv4(),
      method: 'python.execute' as const,
      params: { script: params.script, args: params.args ?? {} },
      timestamp: Date.now(),
    };
    try {
      const response = await bridge.sendRequest(msg);
      if (response.error) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', error: response.error }) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'success', result: response.result }) }] };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ status: 'error', error: message }) }] };
    }
  });

  // ---- Project context tools ----
  server.tool('project-getStructure', 'Get project directory tree with asset type counts.', {
    path: z.string().optional().describe('Root path (default: /Game/)'),
  }, async (params) => { logger.info('project.getStructure called'); return projectGetStructure(bridge, params); });

  server.tool('project-getSettings', 'Get project settings (engine config, maps, etc.).', {}, async () => { logger.info('project.getSettings called'); return projectGetSettings(bridge); });

  server.tool('project-getPlugins', 'List enabled/disabled plugins.', {
    enabledOnly: z.boolean().optional().describe('Only show enabled plugins'),
  }, async (params) => { logger.info('project.getPlugins called'); return projectGetPlugins(bridge, params); });

  server.tool('project-getDependencyGraph', 'Get asset reference/dependency graph.', {
    assetPath: z.string().describe('Asset path to query dependencies for'),
  }, async (params) => { logger.info('project.getDependencyGraph called'); return projectGetDependencyGraph(bridge, params); });

  server.tool('project-getClassHierarchy', 'Get Blueprint/C++ class inheritance tree.', {
    rootClass: z.string().optional().describe('Root class to start from'),
  }, async (params) => { logger.info('project.getClassHierarchy called'); return projectGetClassHierarchy(bridge, params); });

  server.tool('project-snapshot', 'Get comprehensive project summary (cached 5 min).', {
    forceRefresh: z.boolean().optional().describe('Force refresh cached snapshot'),
  }, async (params) => { logger.info('project.snapshot called'); return projectSnapshot(bridge, cache, params); });

  // ---- Asset management tools ----
  server.tool('asset-create', 'Create a new UE asset (Blueprint, Material, DataTable, etc.).', {
    assetName: z.string().describe('Asset name'), assetPath: z.string().describe('Content path (e.g., /Game/Blueprints)'),
    assetType: z.string().describe('Asset type'), parentClass: z.string().optional().describe('Parent class for Blueprints'),
  }, async (params) => { logger.info('asset.create called'); return assetCreate(bridge, params); });

  server.tool('asset-duplicate', 'Duplicate an existing asset.', {
    sourcePath: z.string().describe('Source asset path'), destinationPath: z.string().describe('Destination path'), newName: z.string().describe('New asset name'),
  }, async (params) => { logger.info('asset.duplicate called'); return assetDuplicate(bridge, params); });

  server.tool('asset-rename', 'Rename/move an asset with reference fixing.', {
    assetPath: z.string().describe('Current asset path'), newName: z.string().describe('New name'),
  }, async (params) => { logger.info('asset.rename called'); return assetRename(bridge, params); });

  server.tool('asset-delete', 'Delete an asset (with dependency check).', {
    assetPath: z.string().describe('Asset path to delete'), forceDelete: z.boolean().optional().describe('Force delete without dependency check'),
  }, async (params) => { logger.info('asset.delete called'); return assetDelete(bridge, params); });

  server.tool('asset-import', 'Import external file (FBX, PNG, WAV, etc.) as UE asset.', {
    filePath: z.string().describe('External file path'), destinationPath: z.string().describe('Content path'), assetName: z.string().optional().describe('Asset name'),
  }, async (params) => { logger.info('asset.import called'); return assetImport(bridge, params); });

  server.tool('asset-export', 'Export asset to external format.', {
    assetPath: z.string().describe('Asset path'), outputPath: z.string().describe('Output file path'),
  }, async (params) => { logger.info('asset.export called'); return assetExport(bridge, params); });

  server.tool('asset-getReferences', 'Get all assets referencing/referenced by target.', {
    assetPath: z.string().describe('Asset path'),
  }, async (params) => { logger.info('asset.getReferences called'); return assetGetReferences(bridge, params); });

  server.tool('asset-setMetadata', 'Set asset tags/metadata.', {
    assetPath: z.string().describe('Asset path'), key: z.string().describe('Metadata key'), value: z.string().describe('Metadata value'),
  }, async (params) => { logger.info('asset.setMetadata called'); return assetSetMetadata(bridge, params); });

  // ---- Content browser tools ----
  server.tool('content-listAssets', 'List assets with filtering.', {
    path: z.string().optional().describe('Content path'), assetType: z.string().optional().describe('Filter by type'), recursive: z.boolean().optional(),
  }, async (params) => { logger.info('content.listAssets called'); return contentListAssets(bridge, params); });

  server.tool('content-findAssets', 'Search assets by name, type, or metadata.', {
    query: z.string().describe('Search query'), assetType: z.string().optional(), path: z.string().optional(),
  }, async (params) => { logger.info('content.findAssets called'); return contentFindAssets(bridge, params); });

  server.tool('content-getAssetDetails', 'Deep inspection of any asset.', {
    assetPath: z.string().describe('Asset path'),
  }, async (params) => { logger.info('content.getAssetDetails called'); return contentGetAssetDetails(bridge, params); });

  server.tool('content-validateAssets', 'Run asset validation checks.', {
    paths: z.array(z.string()).optional().describe('Asset paths to validate'),
  }, async (params) => { logger.info('content.validateAssets called'); return contentValidateAssets(bridge, params); });

  // ---- Actor management tools ----
  server.tool('actor-spawn', 'Spawn actor in current level.', {
    className: z.string().describe('Actor class or Blueprint path'),
    location: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    rotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }).optional(),
    label: z.string().optional().describe('Actor label'),
  }, async (params) => { logger.info('actor.spawn called'); return actorSpawn(bridge, params); });

  server.tool('actor-delete', 'Delete actor(s) from level.', {
    actorName: z.string().describe('Actor name to delete'),
  }, async (params) => { logger.info('actor.delete called'); return actorDelete(bridge, params); });

  server.tool('actor-setTransform', 'Set actor location/rotation/scale.', {
    actorName: z.string().describe('Actor name'),
    location: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    rotation: z.object({ pitch: z.number(), yaw: z.number(), roll: z.number() }).optional(),
    scale: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  }, async (params) => { logger.info('actor.setTransform called'); return actorSetTransform(bridge, params); });

  server.tool('actor-getProperties', 'Read all editable properties of an actor.', {
    actorName: z.string().describe('Actor name'),
  }, async (params) => { logger.info('actor.getProperties called'); return actorGetProperties(bridge, params); });

  server.tool('actor-setProperty', 'Set a specific property on an actor.', {
    actorName: z.string().describe('Actor name'), propertyName: z.string().describe('Property name'), propertyValue: z.string().describe('New value'),
  }, async (params) => { logger.info('actor.setProperty called'); return actorSetProperty(bridge, params); });

  server.tool('actor-getComponents', 'List all components on an actor.', {
    actorName: z.string().describe('Actor name'),
  }, async (params) => { logger.info('actor.getComponents called'); return actorGetComponents(bridge, params); });

  server.tool('actor-addComponent', 'Add a component to an actor.', {
    actorName: z.string().describe('Actor name'), componentClass: z.string().describe('Component class'), componentName: z.string().optional(),
  }, async (params) => { logger.info('actor.addComponent called'); return actorAddComponent(bridge, params); });

  server.tool('actor-setArrayRef', 'Set an array-of-actor-references property (e.g., PatrolPoints).', {
    actorName: z.string().describe('Actor name'),
    propertyName: z.string().describe('Array property name'),
    actorNames: z.array(z.string()).describe('Actor names/labels to assign'),
  }, async (params) => { logger.info('actor.setArrayRef called'); return actorSetArrayRef(bridge, params); });

  server.tool('actor-select', 'Select/deselect actors in viewport.', {
    actorNames: z.array(z.string()).describe('Actor names to select'), deselectOthers: z.boolean().optional(),
  }, async (params) => { logger.info('actor.select called'); return actorSelect(bridge, params); });

  // ---- Level management tools ----
  server.tool('level-create', 'Create a new level/map.', {
    levelName: z.string().describe('Level name'), templatePath: z.string().optional(),
  }, async (params) => { logger.info('level.create called'); return levelCreate(bridge, params); });

  server.tool('level-open', 'Open an existing level.', {
    levelPath: z.string().describe('Level path'),
  }, async (params) => { logger.info('level.open called'); return levelOpen(bridge, params); });

  server.tool('level-save', 'Save current level.', {}, async () => { logger.info('level.save called'); return levelSave(bridge); });

  server.tool('level-addSublevel', 'Add streaming sublevel.', {
    levelPath: z.string().describe('Sublevel path'), streamingMethod: z.string().optional(),
  }, async (params) => { logger.info('level.addSublevel called'); return levelAddSublevel(bridge, params); });

  server.tool('level-getWorldSettings', 'Get world settings for current level.', {}, async () => { logger.info('level.getWorldSettings called'); return levelGetWorldSettings(bridge); });

  // ---- Material tools ----
  server.tool('material-create', 'Create new material.', {
    materialName: z.string(), materialPath: z.string(), materialType: z.string().optional(),
  }, async (params) => { logger.info('material.create called'); return materialCreate(bridge, params); });

  server.tool('material-setParameter', 'Set material parameter value.', {
    materialPath: z.string(), parameterName: z.string(), value: z.unknown(), parameterType: z.string().optional(),
  }, async (params) => { logger.info('material.setParameter called'); return materialSetParameter(bridge, params as any); });

  server.tool('material-getParameters', 'List material parameters.', {
    materialPath: z.string(),
  }, async (params) => { logger.info('material.getParameters called'); return materialGetParameters(bridge, params); });

  server.tool('material-createInstance', 'Create material instance from parent.', {
    parentPath: z.string(), instanceName: z.string(), instancePath: z.string(),
  }, async (params) => { logger.info('material.createInstance called'); return materialCreateInstance(bridge, params); });

  server.tool('material-setTexture', 'Assign texture to material.', {
    materialPath: z.string(), parameterName: z.string(), texturePath: z.string(),
  }, async (params) => { logger.info('material.setTexture called'); return materialSetTexture(bridge, params); });

  server.tool('material-getNodes', 'Get material graph nodes.', {
    materialPath: z.string(),
  }, async (params) => { logger.info('material.getNodes called'); return materialGetNodes(bridge, params); });

  // ---- Mesh tools ----
  server.tool('mesh-getInfo', 'Get mesh details (verts, tris, LODs, materials).', {
    meshPath: z.string(),
  }, async (params) => { logger.info('mesh.getInfo called'); return meshGetInfo(bridge, params); });

  server.tool('mesh-setMaterial', 'Assign material to mesh slot.', {
    meshPath: z.string(), materialPath: z.string(), slotIndex: z.number().int().optional(),
  }, async (params) => { logger.info('mesh.setMaterial called'); return meshSetMaterial(bridge, params); });

  server.tool('mesh-generateCollision', 'Generate collision for static mesh.', {
    meshPath: z.string(), collisionType: z.string().optional(),
  }, async (params) => { logger.info('mesh.generateCollision called'); return meshGenerateCollision(bridge, params); });

  server.tool('mesh-setLOD', 'Configure LOD settings.', {
    meshPath: z.string(), lodIndex: z.number().int(), screenSize: z.number().optional(), reductionPercent: z.number().optional(),
  }, async (params) => { logger.info('mesh.setLOD called'); return meshSetLOD(bridge, params); });

  // ---- DataTable tools ----
  server.tool('datatable-create', 'Create new DataTable.', {
    tableName: z.string(), tablePath: z.string(), rowStructPath: z.string(),
  }, async (params) => { logger.info('datatable.create called'); return datatableCreate(bridge, params); });

  server.tool('datatable-addRow', 'Add/modify DataTable row.', {
    tablePath: z.string(), rowName: z.string(), rowData: z.record(z.unknown()),
  }, async (params) => { logger.info('datatable.addRow called'); return datatableAddRow(bridge, params); });

  server.tool('datatable-getRows', 'Read all DataTable rows.', {
    tablePath: z.string(),
  }, async (params) => { logger.info('datatable.getRows called'); return datatableGetRows(bridge, params); });

  server.tool('datatable-removeRow', 'Remove DataTable row.', {
    tablePath: z.string(), rowName: z.string(),
  }, async (params) => { logger.info('datatable.removeRow called'); return datatableRemoveRow(bridge, params); });

  // ---- Animation tools ----
  server.tool('anim-listMontages', 'List animation montages.', {
    skeletonPath: z.string().optional(),
  }, async (params) => { logger.info('anim.listMontages called'); return animListMontages(bridge, params); });

  server.tool('anim-getBlendSpace', 'Get blend space details.', {
    blendSpacePath: z.string(),
  }, async (params) => { logger.info('anim.getBlendSpace called'); return animGetBlendSpace(bridge, params); });

  server.tool('anim-createMontage', 'Create animation montage.', {
    montageName: z.string(), montagePath: z.string(), sequencePath: z.string(),
  }, async (params) => { logger.info('anim.createMontage called'); return animCreateMontage(bridge, params); });

  server.tool('anim-listSequences', 'List animation sequences.', {
    skeletonPath: z.string().optional(),
  }, async (params) => { logger.info('anim.listSequences called'); return animListSequences(bridge, params); });

  server.tool('anim-getSkeletonInfo', 'Get skeleton bone hierarchy.', {
    skeletonPath: z.string(),
  }, async (params) => { logger.info('anim.getSkeletonInfo called'); return animGetSkeletonInfo(bridge, params); });

  // ---- Gameplay tools ----
  server.tool('gameplay-getGameMode', 'Get current game mode.', {}, async () => { logger.info('gameplay.getGameMode called'); return gameplayGetGameMode(bridge); });

  server.tool('gameplay-setGameMode', 'Set game mode for current level.', {
    gameModePath: z.string(),
  }, async (params) => { logger.info('gameplay.setGameMode called'); return gameplaySetGameMode(bridge, params); });

  server.tool('gameplay-listInputActions', 'List all input action mappings.', {}, async () => { logger.info('gameplay.listInputActions called'); return gameplayListInputActions(bridge); });

  server.tool('gameplay-addInputAction', 'Add input action mapping.', {
    actionName: z.string(), key: z.string(), shift: z.boolean().optional(), ctrl: z.boolean().optional(), alt: z.boolean().optional(),
  }, async (params) => { logger.info('gameplay.addInputAction called'); return gameplayAddInputAction(bridge, params); });

  // ---- Source control tools ----
  server.tool('sourcecontrol-getStatus', 'Get source control status of assets.', {
    assetPaths: z.array(z.string()).optional(),
  }, async (params) => { logger.info('sourcecontrol.getStatus called'); return sourcecontrolGetStatus(bridge, params); });

  server.tool('sourcecontrol-checkout', 'Check out assets for editing.', {
    assetPaths: z.array(z.string()),
  }, async (params) => { logger.info('sourcecontrol.checkout called'); return sourcecontrolCheckout(bridge, params); });

  server.tool('sourcecontrol-diff', 'Get diff summary for modified asset.', {
    assetPath: z.string(),
  }, async (params) => { logger.info('sourcecontrol.diff called'); return sourcecontrolDiff(bridge, params); });

  // ---- Build tools ----
  server.tool('build-lightmaps', 'Trigger lightmap build.', {
    quality: z.string().optional().describe('Preview/Medium/High/Production'),
  }, async (params) => { logger.info('build.lightmaps called'); return buildLightmaps(bridge, params); });

  server.tool('build-getMapCheck', 'Run map check and return warnings/errors.', {}, async () => { logger.info('build.getMapCheck called'); return buildGetMapCheck(bridge, {}); });

  server.tool('build-cookContent', 'Trigger content cooking for target platform.', {
    platform: z.string().optional().describe('Target platform'),
  }, async (params) => { logger.info('build.cookContent called'); return buildCookContent(bridge, params); });

  // ---- Debug tools ----
  server.tool('debug-execConsole', 'Execute UE console command (dangerous).', {
    command: z.string().describe('Console command'),
  }, async (params) => { logger.info('debug.execConsole called'); return debugExecConsole(bridge, params); });

  server.tool('debug-getLog', 'Get recent output log entries.', {
    category: z.string().optional(), count: z.number().int().optional(),
  }, async (params) => { logger.info('debug.getLog called'); return debugGetLog(bridge, params); });

  server.tool('debug-getPerformance', 'Get frame time, draw calls, memory stats.', {}, async () => { logger.info('debug.getPerformance called'); return debugGetPerformance(bridge, {}); });

  // ---- AI / Navigation tools ----
  server.tool('ai-createBehaviorTree', 'Create a new BehaviorTree asset.', {
    treeName: z.string(), treePath: z.string(),
  }, async (params) => { logger.info('ai.createBehaviorTree called'); return aiCreateBehaviorTree(bridge, params as any); });

  server.tool('ai-createBlackboard', 'Create a new Blackboard asset.', {
    blackboardName: z.string(), blackboardPath: z.string(),
  }, async (params) => { logger.info('ai.createBlackboard called'); return aiCreateBlackboard(bridge, params as any); });

  server.tool('ai-getBehaviorTreeInfo', 'Get metadata for a BehaviorTree asset.', {
    treePath: z.string(),
  }, async (params) => { logger.info('ai.getBehaviorTreeInfo called'); return aiGetBehaviorTreeInfo(bridge, params as any); });

  server.tool('ai-getBlackboardKeys', 'Get all keys from a Blackboard asset.', {
    blackboardPath: z.string(),
  }, async (params) => { logger.info('ai.getBlackboardKeys called'); return aiGetBlackboardKeys(bridge, params as any); });

  server.tool('ai-addBlackboardKey', 'Add a key to a Blackboard asset.', {
    blackboardPath: z.string(), keyName: z.string(), keyType: z.string(),
  }, async (params) => { logger.info('ai.addBlackboardKey called'); return aiAddBlackboardKey(bridge, params as any); });

  server.tool('ai-configureNavMesh', 'Configure RecastNavMesh settings.', {
    agentRadius: z.number().optional(), agentHeight: z.number().optional(), cellSize: z.number().optional(),
  }, async (params) => { logger.info('ai.configureNavMesh called'); return aiConfigureNavMesh(bridge, params as any); });

  server.tool('ai-getNavMeshInfo', 'Get current RecastNavMesh configuration.', {
  }, async () => { logger.info('ai.getNavMeshInfo called'); return aiGetNavMeshInfo(bridge, {}); });

  server.tool('ai-createEQS', 'Create a new Environment Query System asset.', {
    queryName: z.string(), queryPath: z.string(),
  }, async (params) => { logger.info('ai.createEQS called'); return aiCreateEqs(bridge, params as any); });

  // ---- Sequencer/Cinematics tools ----
  server.tool('sequencer-create', 'Create a new Level Sequence asset.', {
    sequenceName: z.string().describe('Sequence name'), sequencePath: z.string().describe('Content path'),
  }, async (params) => { logger.info('sequencer.create called'); return sequencerCreate(bridge, params); });

  server.tool('sequencer-open', 'Open Level Sequence in Sequencer editor.', {
    sequencePath: z.string().describe('Sequence asset path'),
  }, async (params) => { logger.info('sequencer.open called'); return sequencerOpen(bridge, params); });

  server.tool('sequencer-addTrack', 'Add a track to a Level Sequence.', {
    sequencePath: z.string().describe('Sequence asset path'), trackType: z.string().describe('Track type (e.g., Transform, Audio, Event)'),
    objectPath: z.string().optional().describe('Actor/object to bind the track to'),
  }, async (params) => { logger.info('sequencer.addTrack called'); return sequencerAddTrack(bridge, params); });

  server.tool('sequencer-addBinding', 'Add actor binding (possessable/spawnable) to a Level Sequence.', {
    sequencePath: z.string().describe('Sequence asset path'), actorName: z.string().describe('Actor name to bind'),
    bindingType: z.string().optional().describe('possessable or spawnable (default: possessable)'),
  }, async (params) => { logger.info('sequencer.addBinding called'); return sequencerAddBinding(bridge, params); });

  server.tool('sequencer-setKeyframe', 'Set a keyframe value on a sequencer track.', {
    sequencePath: z.string().describe('Sequence asset path'), trackName: z.string().describe('Track display name'),
    time: z.number().describe('Time in seconds'), value: z.unknown().describe('Keyframe value'),
  }, async (params) => { logger.info('sequencer.setKeyframe called'); return sequencerSetKeyframe(bridge, params as any); });

  server.tool('sequencer-getInfo', 'Get Level Sequence metadata (tracks, bindings, frame range).', {
    sequencePath: z.string().describe('Sequence asset path'),
  }, async (params) => { logger.info('sequencer.getInfo called'); return sequencerGetInfo(bridge, params); });

  server.tool('sequencer-exportFBX', 'Export Level Sequence animation to FBX.', {
    sequencePath: z.string().describe('Sequence asset path'), outputPath: z.string().describe('Output FBX file path'),
  }, async (params) => { logger.info('sequencer.exportFBX called'); return sequencerExportFbx(bridge, params); });

  server.tool('sequencer-importFBX', 'Import FBX animation into Level Sequence.', {
    sequencePath: z.string().describe('Sequence asset path'), fbxPath: z.string().describe('Input FBX file path'),
  }, async (params) => { logger.info('sequencer.importFBX called'); return sequencerImportFbx(bridge, params); });

  // ---- Widget/UMG tools ----
  server.tool('widget-create', 'Create a new Widget Blueprint.', {
    widgetName: z.string().describe('Widget name'), widgetPath: z.string().describe('Content path'),
    parentClass: z.string().optional().describe('Parent widget class'),
  }, async (params) => { logger.info('widget.create called'); return widgetCreate(bridge, params); });

  server.tool('widget-getInfo', 'Get Widget Blueprint info (widget tree, bindings).', {
    widgetPath: z.string().describe('Widget Blueprint path'),
  }, async (params) => { logger.info('widget.getInfo called'); return widgetGetInfo(bridge, params); });

  server.tool('widget-addElement', 'Add a UI element to a Widget Blueprint.', {
    widgetPath: z.string().describe('Widget Blueprint path'), elementType: z.string().describe('Element type (TextBlock, Button, Image, etc.)'),
    elementName: z.string().describe('Element name'), parentName: z.string().optional().describe('Parent element name'),
  }, async (params) => { logger.info('widget.addElement called'); return widgetAddElement(bridge, params); });

  server.tool('widget-setProperty', 'Set a property on a Widget Blueprint element.', {
    widgetPath: z.string().describe('Widget Blueprint path'), elementName: z.string().describe('Element name'),
    propertyName: z.string().describe('Property name'), propertyValue: z.string().describe('Property value'),
  }, async (params) => { logger.info('widget.setProperty called'); return widgetSetProperty(bridge, params); });

  server.tool('widget-getBindings', 'Get property bindings and event dispatchers from a Widget Blueprint.', {
    widgetPath: z.string().describe('Widget Blueprint path'),
  }, async (params) => { logger.info('widget.getBindings called'); return widgetGetBindings(bridge, params); });

  server.tool('widget-listWidgets', 'List all Widget Blueprints in project.', {
    path: z.string().optional().describe('Content path to search'), recursive: z.boolean().optional(),
  }, async (params) => { logger.info('widget.listWidgets called'); return widgetListWidgets(bridge, params); });

  // ---- Editor utility tools ----
  server.tool('editor-getSelection', 'Get currently selected actors and optionally content browser assets.', {
    assetSelection: z.boolean().optional().describe('Also return selected content browser assets'),
  }, async (params) => { logger.info('editor.getSelection called'); return editorGetSelection(bridge, params); });

  server.tool('editor-getViewport', 'Get viewport camera location, rotation, and FOV.', {
  }, async () => { logger.info('editor.getViewport called'); return editorGetViewport(bridge); });

  server.tool('editor-setSelection', 'Set actor selection in the viewport.', {
    actorNames: z.array(z.string()).describe('Actor names to select'), deselectOthers: z.boolean().optional(),
  }, async (params) => { logger.info('editor.setSelection called'); return editorSetSelection(bridge, params); });

  server.tool('editor-getRecentActivity', 'Get recently modified assets and opened levels.', {
    count: z.number().int().optional().describe('Number of recent items (default 10)'),
  }, async (params) => { logger.info('editor.getRecentActivity called'); return editorGetRecentActivity(bridge, params); });

  server.tool('editor-batchOperation', 'Apply batch operation to multiple assets/actors.', {
    operation: z.enum(['rename', 'move', 'setProperty', 'tag']).describe('Operation type'),
    targets: z.array(z.string()).describe('Asset/actor names to operate on'),
    args: z.record(z.unknown()).optional().describe('Operation-specific arguments'),
  }, async (params) => { logger.info('editor.batchOperation called'); return editorBatchOperation(bridge, params); });

  // --- Texture Pipeline tools ---
  server.tool('texture-import', 'Import a texture file into the project.', {
    filePath: z.string().describe('Source file path'),
    destinationPath: z.string().describe('Content path for imported texture'),
    assetName: z.string().optional().describe('Override asset name'),
  }, async (params) => { logger.info('texture.import called'); return textureImport(bridge, params); });

  server.tool('texture-getInfo', 'Get texture info: resolution, format, compression, LOD group.', {
    texturePath: z.string().describe('Content path to texture asset'),
  }, async (params) => { logger.info('texture.getInfo called'); return textureGetInfo(bridge, params); });

  server.tool('texture-setCompression', 'Set compression settings on a texture asset.', {
    texturePath: z.string().describe('Content path to texture asset'),
    compressionType: z.string().describe('Compression type (e.g. Default, Normalmap, HDR, Alpha)'),
  }, async (params) => { logger.info('texture.setCompression called'); return textureSetCompression(bridge, params); });

  server.tool('texture-createRenderTarget', 'Create a Render Target 2D asset.', {
    assetName: z.string().describe('Asset name'),
    assetPath: z.string().describe('Content path'),
    width: z.number().int().describe('Width in pixels'),
    height: z.number().int().describe('Height in pixels'),
    format: z.string().optional().describe('Pixel format (default RTF_RGBA16f)'),
  }, async (params) => { logger.info('texture.createRenderTarget called'); return textureCreateRenderTarget(bridge, params); });

  server.tool('texture-resize', 'Set max texture size and LOD bias.', {
    texturePath: z.string().describe('Content path to texture asset'),
    maxSize: z.number().int().describe('Max texture size (power of 2)'),
    lodBias: z.number().int().optional().describe('LOD bias value'),
  }, async (params) => { logger.info('texture.resize called'); return textureResize(bridge, params); });

  server.tool('texture-listTextures', 'List and filter texture assets in the project.', {
    directory: z.string().optional().describe('Content directory to search'),
    filter: z.string().optional().describe('Name filter pattern'),
  }, async (params) => { logger.info('texture.listTextures called'); return textureListTextures(bridge, params); });

  // --- Niagara/VFX tools ---
  server.tool('niagara-createSystem', 'Create a new Niagara particle system asset.', {
    systemName: z.string().describe('System asset name'),
    systemPath: z.string().describe('Content path'),
  }, async (params) => { logger.info('niagara.createSystem called'); return niagaraCreateSystem(bridge, params); });

  server.tool('niagara-getInfo', 'Get Niagara system info: emitters, modules, parameters.', {
    systemPath: z.string().describe('Content path to Niagara system'),
  }, async (params) => { logger.info('niagara.getInfo called'); return niagaraGetInfo(bridge, params); });

  server.tool('niagara-addEmitter', 'Add an emitter to a Niagara system.', {
    systemPath: z.string().describe('Content path to Niagara system'),
    emitterName: z.string().describe('Emitter name'),
    templatePath: z.string().optional().describe('Template emitter path'),
  }, async (params) => { logger.info('niagara.addEmitter called'); return niagaraAddEmitter(bridge, params); });

  server.tool('niagara-setParameter', 'Set a user parameter on a Niagara system.', {
    systemPath: z.string().describe('Content path to Niagara system'),
    parameterName: z.string().describe('Parameter name'),
    value: z.unknown().describe('Parameter value'),
  }, async (params) => { logger.info('niagara.setParameter called'); return niagaraSetParameter(bridge, params); });

  server.tool('niagara-compile', 'Compile a Niagara system.', {
    systemPath: z.string().describe('Content path to Niagara system'),
  }, async (params) => { logger.info('niagara.compile called'); return niagaraCompile(bridge, params); });

  server.tool('niagara-listSystems', 'List Niagara system assets in the project.', {
    directory: z.string().optional().describe('Content directory to search'),
    filter: z.string().optional().describe('Name filter pattern'),
  }, async (params) => { logger.info('niagara.listSystems called'); return niagaraListSystems(bridge, params); });

  // --- Audio tools ---
  server.tool('audio-import', 'Import an audio file into the project.', {
    filePath: z.string().describe('Source audio file path'),
    destinationPath: z.string().describe('Content path for imported audio'),
    assetName: z.string().optional().describe('Override asset name'),
  }, async (params) => { logger.info('audio.import called'); return audioImport(bridge, params); });

  server.tool('audio-createCue', 'Create a Sound Cue asset.', {
    cueName: z.string().describe('Sound Cue name'),
    cuePath: z.string().describe('Content path'),
    soundWavePath: z.string().optional().describe('SoundWave to assign'),
  }, async (params) => { logger.info('audio.createCue called'); return audioCreateCue(bridge, params); });

  server.tool('audio-getInfo', 'Get audio asset info: duration, channels, sample rate.', {
    audioPath: z.string().describe('Content path to audio asset'),
  }, async (params) => { logger.info('audio.getInfo called'); return audioGetInfo(bridge, params); });

  server.tool('audio-setAttenuation', 'Configure distance attenuation on an audio asset.', {
    audioPath: z.string().describe('Content path to audio asset'),
    innerRadius: z.number().optional().describe('Inner radius'),
    outerRadius: z.number().optional().describe('Outer radius'),
    falloffDistance: z.number().optional().describe('Falloff distance'),
  }, async (params) => { logger.info('audio.setAttenuation called'); return audioSetAttenuation(bridge, params); });

  server.tool('audio-createMetaSound', 'Create a MetaSound source asset (UE5+).', {
    assetName: z.string().describe('MetaSound asset name'),
    assetPath: z.string().describe('Content path'),
  }, async (params) => { logger.info('audio.createMetaSound called'); return audioCreateMetaSound(bridge, params); });

  server.tool('audio-listAssets', 'List audio assets in the project.', {
    directory: z.string().optional().describe('Content directory to search'),
    filter: z.string().optional().describe('Name filter pattern'),
    assetType: z.string().optional().describe('Filter by type: SoundWave, SoundCue, MetaSound'),
  }, async (params) => { logger.info('audio.listAssets called'); return audioListAssets(bridge, params); });

  // --- Landscape tools ---
  server.tool('landscape-create', 'Create a new landscape actor.', {
    landscapeName: z.string().describe('Landscape name'),
    sectionSize: z.number().int().optional().describe('Section size (default 63)'),
    componentsX: z.number().int().optional().describe('Components in X'),
    componentsY: z.number().int().optional().describe('Components in Y'),
    heightmapPath: z.string().optional().describe('Optional heightmap file to import'),
  }, async (params) => { logger.info('landscape.create called'); return landscapeCreate(bridge, params); });

  server.tool('landscape-importHeightmap', 'Import a heightmap to an existing landscape.', {
    landscapeName: z.string().describe('Landscape actor name'),
    heightmapPath: z.string().describe('Heightmap file path'),
  }, async (params) => { logger.info('landscape.importHeightmap called'); return landscapeImportHeightmap(bridge, params); });

  server.tool('landscape-exportHeightmap', 'Export heightmap from a landscape.', {
    landscapeName: z.string().describe('Landscape actor name'),
    exportPath: z.string().describe('Output file path'),
  }, async (params) => { logger.info('landscape.exportHeightmap called'); return landscapeExportHeightmap(bridge, params); });

  server.tool('landscape-getInfo', 'Get landscape info: components, size, layers.', {
    landscapeName: z.string().optional().describe('Landscape actor name (default: first found)'),
  }, async (params) => { logger.info('landscape.getInfo called'); return landscapeGetInfo(bridge, params); });

  server.tool('landscape-setMaterial', 'Assign a material to a landscape.', {
    landscapeName: z.string().describe('Landscape actor name'),
    materialPath: z.string().describe('Content path to material'),
  }, async (params) => { logger.info('landscape.setMaterial called'); return landscapeSetMaterial(bridge, params); });

  // --- Physics tools ---
  server.tool('physics-createAsset', 'Create a PhysicsAsset for a skeletal mesh.', {
    assetName: z.string().describe('Asset name'),
    assetPath: z.string().describe('Content path'),
    skeletalMeshPath: z.string().optional().describe('Skeletal mesh to generate physics for'),
  }, async (params) => { logger.info('physics.createAsset called'); return physicsCreateAsset(bridge, params); });

  server.tool('physics-getInfo', 'Get physics asset info: bodies, constraints, profiles.', {
    physicsAssetPath: z.string().describe('Content path to PhysicsAsset'),
  }, async (params) => { logger.info('physics.getInfo called'); return physicsGetInfo(bridge, params); });

  server.tool('physics-setProfile', 'Set collision profile on a physics body.', {
    assetPath: z.string().describe('Content path to PhysicsAsset'),
    bodyName: z.string().describe('Body name'),
    profileName: z.string().describe('Collision profile name'),
  }, async (params) => { logger.info('physics.setProfile called'); return physicsSetProfile(bridge, params); });

  server.tool('physics-createMaterial', 'Create a PhysicalMaterial asset.', {
    materialName: z.string().describe('Material name'),
    materialPath: z.string().describe('Content path'),
    friction: z.number().optional().describe('Friction coefficient'),
    restitution: z.number().optional().describe('Restitution (bounciness)'),
  }, async (params) => { logger.info('physics.createMaterial called'); return physicsCreateMaterial(bridge, params); });

  server.tool('physics-setConstraint', 'Configure a physics constraint.', {
    physicsAssetPath: z.string().describe('Content path to PhysicsAsset'),
    constraintName: z.string().describe('Constraint name'),
    linearLimit: z.number().optional().describe('Linear motion limit'),
    angularLimit: z.number().optional().describe('Angular motion limit in degrees'),
  }, async (params) => { logger.info('physics.setConstraint called'); return physicsSetConstraint(bridge, params); });

  // --- World Partition tools ---
  server.tool('worldpartition-getInfo', 'Get World Partition configuration and data layers.', {
    levelPath: z.string().optional().describe('Level path (default: current)'),
  }, async (params) => { logger.info('worldpartition.getInfo called'); return worldpartitionGetInfo(bridge, params); });

  server.tool('worldpartition-setConfig', 'Set World Partition grid and loading settings.', {
    gridSize: z.number().optional().describe('Grid cell size'),
    loadingRange: z.number().optional().describe('Loading range'),
    cellSize: z.number().optional().describe('Cell size'),
  }, async (params) => { logger.info('worldpartition.setConfig called'); return worldpartitionSetConfig(bridge, params); });

  server.tool('worldpartition-createDataLayer', 'Create a new World Partition data layer.', {
    layerName: z.string().describe('Data layer name'),
    layerType: z.string().optional().describe('Layer type'),
  }, async (params) => { logger.info('worldpartition.createDataLayer called'); return worldpartitionCreateDataLayer(bridge, params); });

  server.tool('worldpartition-createHLOD', 'Create an HLOD layer configuration.', {
    layerName: z.string().describe('HLOD layer name'),
    hlodSetupAsset: z.string().optional().describe('HLOD setup asset path'),
  }, async (params) => { logger.info('worldpartition.createHLOD called'); return worldpartitionCreateHLOD(bridge, params); });

  // --- Foliage tools ---
  server.tool('foliage-createType', 'Create a FoliageType asset.', {
    typeName: z.string().describe('Foliage type name'),
    typePath: z.string().describe('Content path'),
    meshPath: z.string().describe('Static mesh path to use'),
  }, async (params) => { logger.info('foliage.createType called'); return foliageCreateType(bridge, params); });

  server.tool('foliage-getInfo', 'Get foliage type settings and density info.', {
    foliageTypePath: z.string().describe('Content path to FoliageType'),
  }, async (params) => { logger.info('foliage.getInfo called'); return foliageGetInfo(bridge, params); });

  server.tool('foliage-setProperties', 'Set foliage density, scale, and culling properties.', {
    foliageTypePath: z.string().describe('Content path to FoliageType'),
    density: z.number().optional().describe('Foliage density'),
    scale: z.number().optional().describe('Scale multiplier'),
    cullDistance: z.number().optional().describe('Cull distance'),
  }, async (params) => { logger.info('foliage.setProperties called'); return foliageSetProperties(bridge, params); });

  // --- Curve tools ---
  server.tool('curve-create', 'Create a curve asset (float, vector, or linear color).', {
    curveName: z.string().describe('Curve name'),
    curvePath: z.string().describe('Content path'),
    curveType: z.enum(['float', 'vector', 'linear']).optional().describe('Type: float, vector, linear (default: float)'),
  }, async (params) => { logger.info('curve.create called'); return curveCreate(bridge, params); });

  server.tool('curve-setKeys', 'Add or modify keyframes on a curve.', {
    curvePath: z.string().describe('Content path to curve'),
    keys: z.array(z.object({ time: z.number(), value: z.number() })).describe('Array of {time, value} keyframes'),
  }, async (params) => { logger.info('curve.setKeys called'); return curveSetKeys(bridge, params); });

  server.tool('curve-getInfo', 'Get curve data, key count, and time range.', {
    curvePath: z.string().describe('Content path to curve'),
  }, async (params) => { logger.info('curve.getInfo called'); return curveGetInfo(bridge, params); });

  // --- PCG tools ---
  server.tool('pcg-createGraph', 'Create a PCG graph asset (UE 5.2+).', {
    graphName: z.string().describe('Graph name'),
    graphPath: z.string().describe('Content path'),
  }, async (params) => { logger.info('pcg.createGraph called'); return pcgCreateGraph(bridge, params); });

  server.tool('pcg-getInfo', 'Get PCG graph info: nodes, connections, settings.', {
    graphPath: z.string().describe('Content path to PCG graph'),
  }, async (params) => { logger.info('pcg.getInfo called'); return pcgGetInfo(bridge, params); });

  server.tool('pcg-addNode', 'Add a node to a PCG graph.', {
    graphPath: z.string().describe('Content path to PCG graph'),
    nodeType: z.string().describe('Node type to add'),
    nodeLabel: z.string().optional().describe('Node label'),
  }, async (params) => { logger.info('pcg.addNode called'); return pcgAddNode(bridge, params); });

  server.tool('pcg-connectNodes', 'Connect two nodes in a PCG graph.', {
    graphPath: z.string().describe('Content path to PCG graph'),
    sourceNode: z.string().describe('Source node name'),
    sourcePin: z.string().describe('Source pin name'),
    targetNode: z.string().describe('Target node name'),
    targetPin: z.string().describe('Target pin name'),
  }, async (params) => { logger.info('pcg.connectNodes called'); return pcgConnectNodes(bridge, params); });

  // --- Geometry Script tools ---
  server.tool('geoscript-meshBoolean', 'Perform mesh boolean operation (UE 5.1+).', {
    targetMesh: z.string().describe('Target mesh path'),
    toolMesh: z.string().describe('Tool mesh path'),
    operation: z.enum(['union', 'subtract', 'intersect']).describe('Boolean operation'),
  }, async (params) => { logger.info('geoscript.meshBoolean called'); return geoscriptMeshBoolean(bridge, params); });

  server.tool('geoscript-meshTransform', 'Transform, simplify, or remesh a mesh (UE 5.1+).', {
    meshPath: z.string().describe('Mesh asset path'),
    operation: z.enum(['simplify', 'remesh', 'transform']).describe('Operation type'),
    params: z.record(z.unknown()).optional().describe('Operation-specific parameters'),
  }, async (params) => { logger.info('geoscript.meshTransform called'); return geoscriptMeshTransform(bridge, params); });

  server.tool('geoscript-getInfo', 'Get mesh geometry info: vertex/tri count, bounds.', {
    meshPath: z.string().describe('Mesh asset path'),
  }, async (params) => { logger.info('geoscript.getInfo called'); return geoscriptGetInfo(bridge, params); });

  // --- Workflow tools ---
  server.tool('workflow-createCharacter', 'Scaffold a playable character: Blueprint, mesh, anim BP, inputs.', {
    characterName: z.string().describe('Character name'),
    basePath: z.string().describe('Content path for generated assets'),
    meshPath: z.string().optional().describe('Skeletal mesh to assign'),
  }, async (params) => { logger.info('workflow.createCharacter called'); return workflowCreateCharacter(bridge, params); });

  server.tool('workflow-createUIScreen', 'Create a UI screen Widget Blueprint with layout template.', {
    screenName: z.string().describe('Screen name'),
    screenPath: z.string().describe('Content path'),
    screenType: z.enum(['hud', 'menu', 'inventory']).optional().describe('Type: hud, menu, inventory'),
  }, async (params) => { logger.info('workflow.createUIScreen called'); return workflowCreateUIScreen(bridge, params); });

  server.tool('workflow-setupLevel', 'Create a level with core actors (player start, lights, sky).', {
    levelName: z.string().describe('Level name'),
    levelPath: z.string().describe('Content path'),
    includePlayerStart: z.boolean().optional().describe('Include PlayerStart (default true)'),
    includeLighting: z.boolean().optional().describe('Include default lighting (default true)'),
  }, async (params) => { logger.info('workflow.setupLevel called'); return workflowSetupLevel(bridge, params); });

  server.tool('workflow-createInteractable', 'Create an interactable actor with overlap/interaction component.', {
    interactableName: z.string().describe('Actor name'),
    basePath: z.string().describe('Content path'),
    interactionType: z.string().optional().describe('Interaction type'),
  }, async (params) => { logger.info('workflow.createInteractable called'); return workflowCreateInteractable(bridge, params); });

  server.tool('workflow-createProjectile', 'Create a projectile actor with movement, collision, damage.', {
    projectileName: z.string().describe('Projectile name'),
    basePath: z.string().describe('Content path'),
    speed: z.number().optional().describe('Projectile speed'),
    damage: z.number().optional().describe('Damage amount'),
  }, async (params) => { logger.info('workflow.createProjectile called'); return workflowCreateProjectile(bridge, params); });

  server.tool('workflow-setupMultiplayer', 'Scaffold multiplayer: GameMode, PlayerState, GameState.', {
    gameName: z.string().describe('Game name prefix'),
    basePath: z.string().describe('Content path'),
    maxPlayers: z.number().int().optional().describe('Max player count'),
  }, async (params) => { logger.info('workflow.setupMultiplayer called'); return workflowSetupMultiplayer(bridge, params); });

  server.tool('workflow-createInventorySystem', 'Create inventory system: DataTable, struct, component BP.', {
    systemName: z.string().describe('System name'),
    basePath: z.string().describe('Content path'),
    maxSlots: z.number().int().optional().describe('Max inventory slots'),
  }, async (params) => { logger.info('workflow.createInventorySystem called'); return workflowCreateInventorySystem(bridge, params); });

  server.tool('workflow-createDialogueSystem', 'Create dialogue system: DataTable, widget BP, manager BP.', {
    systemName: z.string().describe('System name'),
    basePath: z.string().describe('Content path'),
  }, async (params) => { logger.info('workflow.createDialogueSystem called'); return workflowCreateDialogueSystem(bridge, params); });

  // --- Analysis tools ---
  server.tool('analyze-blueprintComplexity', 'Analyze Blueprint complexity: node count, nesting, cyclomatic.', {
    blueprintPath: z.string().describe('Content path to Blueprint'),
  }, async (params) => { logger.info('analyze.blueprintComplexity called'); return analyzeBlueprintComplexity(bridge, params); });

  server.tool('analyze-assetHealth', 'Analyze asset health: unused, broken refs, oversized textures.', {
    directory: z.string().optional().describe('Content directory to scan'),
    includeUnused: z.boolean().optional().describe('Include unused asset detection'),
  }, async (params) => { logger.info('analyze.assetHealth called'); return analyzeAssetHealth(bridge, params); });

  server.tool('analyze-performanceHints', 'Get performance hints: draw calls, texture memory, mesh complexity.', {
    levelPath: z.string().optional().describe('Level to analyze (default: current)'),
  }, async (params) => { logger.info('analyze.performanceHints called'); return analyzePerformanceHints(bridge, params); });

  server.tool('analyze-codeConventions', 'Check naming conventions and folder structure compliance.', {
    directory: z.string().optional().describe('Content directory to scan'),
  }, async (params) => { logger.info('analyze.codeConventions called'); return analyzeCodeConventions(bridge, params); });

  // --- Refactoring tools ---
  server.tool('refactor-renameChain', 'Rename asset and update all references + clean redirectors.', {
    assetPath: z.string().describe('Content path to asset'),
    newName: z.string().describe('New asset name'),
    updateReferences: z.boolean().optional().describe('Update all references (default true)'),
  }, async (params) => { logger.info('refactor.renameChain called'); return refactorRenameChain(bridge, params); });

  // --- Context intelligence tools ---
  server.tool('context-autoGather', 'Gather comprehensive project context: info, code stats, content, conventions.', {
    includeConventions: z.boolean().optional().describe('Include convention detection (default true)'),
    includeViewport: z.boolean().optional().describe('Include viewport state (default true)'),
  }, async (params) => { logger.info('context.autoGather called'); return contextAutoGather(bridge, params); });

  server.tool('context-getManifest', 'Get the complete tool manifest with all tools, domains, and workflow chains.', {
  }, async () => {
    logger.info('context.getManifest called');
    const manifest = generateManifest();
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', result: manifest }) }] };
  });

  server.tool('context-getChains', 'Get available tool workflow chains and error recovery strategies.', {
  }, async () => {
    logger.info('context.getChains called');
    const chains = listChains();
    const recoveryStrategies = listRecoveryStrategies();
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', result: { chains, recoveryStrategies } }) }] };
  });

  server.tool('context-learnWorkflow', 'Learn a new UE developer workflow from documentation or web research. Stores structured workflow with intent patterns and tool sequences.', {
    id: z.string().describe('Unique workflow identifier (e.g., "mat-create-decal")'),
    name: z.string().describe('Human-readable workflow name'),
    description: z.string().describe('What the workflow accomplishes'),
    domain: z.string().describe('Primary domain (blueprint, material, character, level, etc.)'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('Difficulty level'),
    intentPatterns: z.array(z.string()).describe('Natural language phrases that trigger this workflow'),
    prerequisites: z.array(z.string()).optional().describe('What must be true before starting'),
    steps: z.array(z.object({
      tool: z.string().describe('MCP tool name to call'),
      purpose: z.string().describe('Why this step is needed'),
      optional: z.boolean().optional(),
      repeat: z.boolean().optional(),
    })).describe('Ordered sequence of tool calls'),
    expectedOutcome: z.string().describe('What the developer gets at the end'),
    source: z.string().optional().describe('Where this workflow was learned from'),
    tags: z.array(z.string()).optional().describe('Search tags'),
  }, async (params) => { logger.info('context.learnWorkflow called'); return contextLearnWorkflow(params); });

  server.tool('context-matchIntent', 'Match a natural language description of developer intent to known UE workflows. Returns ranked recommendations with tool sequences.', {
    query: z.string().describe('Natural language description of what the developer wants to do'),
    maxResults: z.number().optional().describe('Maximum number of matches to return (default 5)'),
  }, async (params) => { logger.info('context.matchIntent called'); return contextMatchIntent(params); });

  server.tool('context-getWorkflows', 'List all known UE developer workflows (built-in + learned). Optionally filter by domain or tag.', {
    domain: z.string().optional().describe('Filter by domain (blueprint, material, character, level, etc.)'),
    tag: z.string().optional().describe('Filter by tag'),
  }, async (params) => {
    logger.info('context.getWorkflows called');
    let workflows = getAllWorkflows();
    if (params.domain) workflows = workflows.filter((w) => w.domain === params.domain);
    if (params.tag) workflows = workflows.filter((w) => w.tags.includes(params.tag!));
    const summary = workflows.map((w) => ({
      id: w.id, name: w.name, domain: w.domain, difficulty: w.difficulty,
      stepCount: w.steps.length, source: w.source, tags: w.tags,
    }));
    return { content: [{ type: 'text', text: JSON.stringify({ status: 'success', count: summary.length, workflows: summary }) }] };
  });

  server.tool('context-recordOutcome', 'Record the outcome (success/failure) of a workflow execution. Builds outcome history for confidence-weighted recommendations.', {
    workflowId: z.string().describe('ID of the workflow that was executed'),
    success: z.boolean().describe('Whether the workflow completed successfully'),
    toolsUsed: z.array(z.string()).optional().describe('List of tool names actually used during execution'),
    durationMs: z.number().optional().describe('Total execution duration in milliseconds'),
    notes: z.string().optional().describe('Additional notes about the outcome (errors, workarounds)'),
  }, async (params) => { logger.info('context.recordOutcome called'); return contextRecordOutcome(params); });

  server.tool('context-learnFromDocs', 'Extract and learn UE workflows from documentation content. Parses structured doc text into workflow definitions with tool sequences.', {
    domain: z.string().describe('UE domain (blueprint, material, character, level, animation, etc.)'),
    docContent: z.string().describe('Documentation text content with numbered/bulleted steps describing a workflow'),
    docSource: z.string().optional().describe('Source identifier (default: "epic-docs")'),
  }, async (params) => { logger.info('context.learnFromDocs called'); return contextLearnFromDocs(params); });

  server.tool('context-getOutcomeStats', 'Get outcome statistics for all tracked workflows. Shows success rates, trends, and execution counts.', {
  }, async () => { logger.info('context.getOutcomeStats called'); return contextGetOutcomeStats(); });

  server.tool('context-recordResolution', 'Record a successful error resolution after troubleshooting. Captures the error, attempted fixes (including failures), the successful fix, and root cause. Future similar errors will receive this resolution as a recommendation.', {
    errorMessage: z.string().describe('The error message that was encountered'),
    errorType: z.string().optional().describe('Error category (compile-error, asset-not-found, pin-connection-failure, etc.). Auto-inferred if omitted.'),
    sourceTool: z.string().describe('The MCP tool that produced the error (e.g., "blueprint-connectPins")'),
    developerIntent: z.string().describe('What the developer was trying to accomplish when the error occurred'),
    attemptedFixes: z.array(z.object({
      action: z.string().describe('What was tried'),
      toolUsed: z.string().optional().describe('Tool used for this attempt'),
      result: z.enum(['success', 'failure', 'partial']).describe('Outcome of this attempt'),
      notes: z.string().optional().describe('Additional context'),
    })).describe('All fixes attempted, including failures (helps avoid dead ends in future)'),
    successfulFix: z.object({
      description: z.string().describe('Summary of what fixed the error'),
      toolSequence: z.array(z.string()).describe('Ordered list of tools used in the fix'),
      steps: z.array(z.string()).describe('Step-by-step instructions to reproduce the fix'),
    }).describe('The fix that ultimately resolved the error'),
    rootCause: z.string().describe('Root cause analysis of why the error occurred'),
    tags: z.array(z.string()).optional().describe('Tags for searchability (e.g., ["mobility", "static-mesh"])'),
  }, async (params) => { logger.info('context.recordResolution called'); return contextRecordResolution(params); });

  server.tool('context-matchError', 'Find matching past resolutions for a current error. Combines builtin recovery strategies with learned resolutions. Returns ranked recommendations with confidence scores and actions to avoid.', {
    errorMessage: z.string().describe('The error message to find resolutions for'),
    sourceTool: z.string().describe('The tool that produced the error'),
    errorType: z.string().optional().describe('Error category (auto-inferred if omitted)'),
    maxResults: z.number().optional().describe('Maximum learned resolutions to return (default 5)'),
  }, async (params) => { logger.info('context.matchError called'); return contextMatchError(params); });

  server.tool('context-markResolutionReused', 'Mark a learned error resolution as successfully reused. Boosts its ranking for future similar errors.', {
    resolutionId: z.string().describe('ID of the resolution that was successfully reused'),
  }, async (params) => { logger.info('context.markResolutionReused called'); return contextMarkResolutionReused(params); });

  server.tool('context-listResolutions', 'List all stored error resolutions. Optionally filter by error type or source tool.', {
    errorType: z.string().optional().describe('Filter by error type'),
    sourceTool: z.string().optional().describe('Filter by source tool'),
  }, async (params) => { logger.info('context.listResolutions called'); return contextListResolutions(params); });

  logger.info(`MCP tools registered: 183 tools across 37 domains`);

  return server;
}
