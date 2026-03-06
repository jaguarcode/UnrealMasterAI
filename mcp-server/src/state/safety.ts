/**
 * Safety classification system for MCP tool operations.
 * Classifies operations by risk level and gates dangerous operations
 * behind an approval workflow.
 */

export type SafetyLevel = 'safe' | 'warn' | 'dangerous';

export interface SafetyClassification {
  level: SafetyLevel;
  reason: string;
  requiresApproval: boolean;
}

/** Read-only / query operations that never mutate state. */
const SAFE_TOOLS = new Set([
  // Editor
  'editor-ping',
  'editor-getLevelInfo',
  'editor-listActors',
  'editor-getAssetInfo',
  // Blueprint
  'blueprint-serialize',
  // File
  'file-read',
  'file-search',
  // Compilation
  'compilation-getStatus',
  'compilation-getErrors',
  // Project context (read-only)
  'project-getStructure',
  'project-getSettings',
  'project-getPlugins',
  'project-getDependencyGraph',
  'project-getClassHierarchy',
  'project-snapshot',
  // Content browser (read-only)
  'content-listAssets',
  'content-findAssets',
  'content-getAssetDetails',
  'content-validateAssets',
  // Asset (read-only)
  'asset-export',
  'asset-getReferences',
  // Actor (read-only)
  'actor-getProperties',
  'actor-getComponents',
  'actor-select',
  // Level (read-only)
  'level-getWorldSettings',
  // Material (read-only)
  'material-getParameters',
  'material-getNodes',
  // Mesh (read-only)
  'mesh-getInfo',
  // DataTable (read-only)
  'datatable-getRows',
  // Animation (read-only)
  'anim-listMontages',
  'anim-getBlendSpace',
  'anim-listSequences',
  'anim-getSkeletonInfo',
  // Gameplay (read-only)
  'gameplay-getGameMode',
  'gameplay-listInputActions',
  // Source control (read-only)
  'sourcecontrol-getStatus',
  'sourcecontrol-diff',
  // Build (read-only)
  'build-getMapCheck',
  // Debug (read-only)
  'debug-getLog',
  'debug-getPerformance',
  // Slate (read-only)
  'slate-listTemplates',
  'slate-generate',
  'slate-validate',
  // Chat
  'chat-sendMessage',
  // Sequencer (read-only)
  'sequencer-getInfo',
  'sequencer-exportFBX',
  // AI/Navigation (read-only)
  'ai-getBehaviorTreeInfo',
  'ai-getBlackboardKeys',
  'ai-getNavMeshInfo',
  // Widget (read-only)
  'widget-getInfo',
  'widget-getBindings',
  'widget-listWidgets',
  // Editor utilities (read-only)
  'editor-getSelection',
  'editor-getViewport',
  'editor-setSelection',
  'editor-getRecentActivity',
  // Texture (read-only)
  'texture-getInfo',
  'texture-listTextures',
  // Niagara (read-only)
  'niagara-getInfo',
  'niagara-listSystems',
  // Audio (read-only)
  'audio-getInfo',
  'audio-listAssets',
  // Landscape (read-only)
  'landscape-getInfo',
  'landscape-exportHeightmap',
  // Physics (read-only)
  'physics-getInfo',
  // World Partition (read-only)
  'worldpartition-getInfo',
  // Foliage (read-only)
  'foliage-getInfo',
  // Curves (read-only)
  'curve-getInfo',
  // PCG (read-only)
  'pcg-getInfo',
  // Geometry Script (read-only)
  'geoscript-getInfo',
  // Analysis (read-only)
  'analyze-blueprintComplexity',
  'analyze-assetHealth',
  'analyze-performanceHints',
  'analyze-codeConventions',
  // Context intelligence (read-only)
  'context-autoGather',
  'context-getManifest',
  'context-getChains',
  'context-learnWorkflow',
  'context-matchIntent',
  'context-getWorkflows',
]);

/** Mutation operations that change state but are generally recoverable. */
const WARN_TOOLS = new Set([
  // Blueprint
  'blueprint-createNode',
  'blueprint-connectPins',
  'blueprint-modifyProperty',
  // Compilation
  'compilation-trigger',
  'compilation-selfHeal',
  // Asset (recoverable mutations)
  'asset-create',
  'asset-duplicate',
  'asset-import',
  'asset-setMetadata',
  // Actor (recoverable mutations)
  'actor-spawn',
  'actor-setTransform',
  'actor-setProperty',
  'actor-addComponent',
  // Level (recoverable mutations)
  'level-create',
  'level-open',
  'level-save',
  'level-addSublevel',
  // Material (recoverable mutations)
  'material-create',
  'material-setParameter',
  'material-createInstance',
  'material-setTexture',
  // Mesh (recoverable mutations)
  'mesh-setMaterial',
  'mesh-generateCollision',
  'mesh-setLOD',
  // DataTable (recoverable mutations)
  'datatable-create',
  'datatable-addRow',
  // Animation (recoverable mutations)
  'anim-createMontage',
  // Gameplay (recoverable mutations)
  'gameplay-setGameMode',
  'gameplay-addInputAction',
  // Source control
  'sourcecontrol-checkout',
  // Build
  'build-lightmaps',
  // Sequencer (mutations)
  'sequencer-create',
  'sequencer-open',
  'sequencer-addTrack',
  'sequencer-addBinding',
  'sequencer-setKeyframe',
  'sequencer-importFBX',
  // AI/Navigation (mutations)
  'ai-createBehaviorTree',
  'ai-createBlackboard',
  'ai-addBlackboardKey',
  'ai-configureNavMesh',
  'ai-createEQS',
  // Widget (mutations)
  'widget-create',
  'widget-addElement',
  'widget-setProperty',
  // Editor utilities (mutations)
  'editor-batchOperation',
  // Texture (mutations)
  'texture-import',
  'texture-setCompression',
  'texture-createRenderTarget',
  'texture-resize',
  // Niagara (mutations)
  'niagara-createSystem',
  'niagara-addEmitter',
  'niagara-setParameter',
  'niagara-compile',
  // Audio (mutations)
  'audio-import',
  'audio-createCue',
  'audio-setAttenuation',
  'audio-createMetaSound',
  // Landscape (mutations)
  'landscape-create',
  'landscape-importHeightmap',
  'landscape-setMaterial',
  // Physics (mutations)
  'physics-createAsset',
  'physics-setProfile',
  'physics-createMaterial',
  'physics-setConstraint',
  // World Partition (mutations)
  'worldpartition-setConfig',
  'worldpartition-createDataLayer',
  'worldpartition-createHLOD',
  // Foliage (mutations)
  'foliage-createType',
  'foliage-setProperties',
  // Curves (mutations)
  'curve-create',
  'curve-setKeys',
  // PCG (mutations)
  'pcg-createGraph',
  'pcg-addNode',
  'pcg-connectNodes',
  // Geometry Script (mutations)
  'geoscript-meshBoolean',
  'geoscript-meshTransform',
  // Workflow (mutations)
  'workflow-createCharacter',
  'workflow-createUIScreen',
  'workflow-setupLevel',
  'workflow-createInteractable',
  'workflow-createProjectile',
  'workflow-setupMultiplayer',
  'workflow-createInventorySystem',
  'workflow-createDialogueSystem',
]);

/** Destructive or production-impacting operations requiring approval. */
const DANGEROUS_TOOLS = new Set([
  'blueprint-deleteNode',
  'asset-delete',
  'asset-rename',
  'actor-delete',
  'datatable-removeRow',
  'debug-execConsole',
  'build-cookContent',
  'refactor-renameChain',
]);

/**
 * Classify an operation's safety level based on tool name and parameters.
 *
 * - safe: read-only queries
 * - warn: mutations that are generally recoverable
 * - dangerous: destructive or production-impacting writes requiring approval
 */
export function classifyOperation(
  toolName: string,
  params: Record<string, unknown>,
): SafetyClassification {
  // Safe operations (queries, reads)
  if (SAFE_TOOLS.has(toolName)) {
    return { level: 'safe', reason: 'Read-only operation', requiresApproval: false };
  }

  // File write — context-dependent classification
  if (toolName === 'file-write') {
    const filePath = params.filePath as string | undefined;
    // Writing to production Content paths (excluding Tests) is dangerous
    if (filePath && filePath.includes('/Content/') && !filePath.includes('/Tests/')) {
      return {
        level: 'dangerous',
        reason: 'Writing to production content path',
        requiresApproval: true,
      };
    }
    // All other file writes are warn-level
    return { level: 'warn', reason: 'File write operation', requiresApproval: false };
  }

  // Dangerous operations requiring approval
  if (DANGEROUS_TOOLS.has(toolName)) {
    return {
      level: 'dangerous',
      reason: 'Destructive or production-impacting operation',
      requiresApproval: true,
    };
  }

  // Known mutation tools
  if (WARN_TOOLS.has(toolName)) {
    return { level: 'warn', reason: 'Mutation operation', requiresApproval: false };
  }

  // Unknown tools default to warn
  return { level: 'warn', reason: 'Unknown operation', requiresApproval: false };
}

/**
 * Validate that a file path is safe and within allowed project roots.
 * Blocks path traversal attacks (.., ~) and paths outside allowed roots.
 */
export function isPathSafe(filePath: string, allowedRoots: string[]): boolean {
  // Normalize to forward slashes
  const normalized = filePath.replace(/\\/g, '/');

  // Block path traversal
  if (normalized.includes('..')) return false;
  if (normalized.includes('~')) return false;

  // Must start with one of the allowed roots
  return allowedRoots.some((root) => normalized.startsWith(root.replace(/\\/g, '/')));
}

export interface ApprovalRequestContext {
  toolName: string;
  filePath?: string;
}

/**
 * Approval gate for dangerous operations.
 *
 * Production mode: sends a 'safety.requestApproval' WS message to the UE editor
 * and waits for the developer to approve or reject via the Slate dialog.
 * Defaults to reject after timeoutMs (60 seconds).
 *
 * Test mode: setAutoResponse('approve' | 'reject') bypasses the WS round-trip.
 */
export class ApprovalGate {
  private autoResponse: 'approve' | 'reject' | null = null;
  private timeoutMs: number;
  private bridge: import('../transport/websocket-bridge.js').WebSocketBridge | null;

  /**
   * @param timeoutMs - How long to wait for UE response before auto-rejecting
   * @param bridge    - WebSocketBridge instance. When null, falls back to timeout-reject.
   */
  constructor(
    timeoutMs = 60000,
    bridge: import('../transport/websocket-bridge.js').WebSocketBridge | null = null,
  ) {
    this.timeoutMs = timeoutMs;
    this.bridge = bridge;
  }

  /** For testing: set automatic response mode. Pass null to restore live behavior. */
  setAutoResponse(response: 'approve' | 'reject' | null): void {
    this.autoResponse = response;
  }

  /**
   * Request approval for a dangerous operation.
   *
   * - Non-dangerous operations (requiresApproval === false) return true immediately.
   * - In auto-response mode (test), returns based on setAutoResponse value.
   * - In production mode, sends 'safety.requestApproval' via WS and awaits response.
   * - Falls back to timeout-reject if no bridge is configured.
   */
  async requestApproval(
    classification: SafetyClassification,
    context: ApprovalRequestContext = { toolName: 'unknown' },
  ): Promise<boolean> {
    if (!classification.requiresApproval) return true;

    if (this.autoResponse !== null) {
      return this.autoResponse === 'approve';
    }

    if (this.bridge && this.bridge.hasActiveConnection()) {
      return this.sendApprovalRequest(classification, context);
    }

    // No bridge or no active connection — timeout-reject (original behavior)
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), this.timeoutMs);
      timer.unref?.();
    });
  }

  private async sendApprovalRequest(
    classification: SafetyClassification,
    context: ApprovalRequestContext,
  ): Promise<boolean> {
    const { v4: uuidv4 } = await import('uuid');
    const operationId = uuidv4();

    const msg = {
      id: operationId,
      method: 'safety.requestApproval',
      params: {
        operationId,
        toolName: context.toolName,
        reason: classification.reason,
        ...(context.filePath ? { filePath: context.filePath } : {}),
      },
      timestamp: Date.now(),
    };

    try {
      const response = await Promise.race([
        this.bridge!.sendRequest(msg),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Approval timeout')), this.timeoutMs),
        ),
      ]);

      if (response.error) return false;

      const result = response.result as Record<string, unknown> | undefined;
      return result?.approved === true;
    } catch {
      // Timeout or WS error — default to reject
      return false;
    }
  }
}
