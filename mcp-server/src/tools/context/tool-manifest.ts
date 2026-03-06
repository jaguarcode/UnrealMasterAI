/**
 * Tool manifest generator for Unreal Master Agent.
 * Catalogs all 170 MCP tools across 36 domains with metadata for Claude.
 */

export interface ToolEntry {
  name: string;
  domain: string;
  description: string;
  safety: 'safe' | 'warn' | 'dangerous';
  relatedTools: string[];
}

export interface ToolChainStep {
  tool: string;
  purpose: string;
}

export interface ToolChain {
  name: string;
  description: string;
  steps: ToolChainStep[];
}

export interface DomainInfo {
  name: string;
  description: string;
  tools: string[];
}

export interface ToolManifest {
  version: string;
  toolCount: number;
  domainCount: number;
  tools: ToolEntry[];
  chains: ToolChain[];
  domains: DomainInfo[];
}

const TOOLS: ToolEntry[] = [
  // editor (8)
  {
    name: 'editor-ping',
    domain: 'editor',
    description: 'Ping the Unreal Editor to check connectivity',
    safety: 'safe',
    relatedTools: ['editor-getLevelInfo', 'editor-getRecentActivity', 'compilation-getStatus'],
  },
  {
    name: 'editor-getLevelInfo',
    domain: 'editor',
    description: 'Get information about the currently open level',
    safety: 'safe',
    relatedTools: ['editor-listActors', 'level-getWorldSettings', 'editor-getViewport'],
  },
  {
    name: 'editor-listActors',
    domain: 'editor',
    description: 'List all actors in the current level',
    safety: 'safe',
    relatedTools: ['actor-getProperties', 'editor-getSelection', 'actor-select'],
  },
  {
    name: 'editor-getAssetInfo',
    domain: 'editor',
    description: 'Get metadata and details about a specific asset',
    safety: 'safe',
    relatedTools: ['asset-getReferences', 'content-getAssetDetails', 'editor-getLevelInfo'],
  },
  {
    name: 'editor-getSelection',
    domain: 'editor',
    description: 'Get the currently selected actors in the editor viewport',
    safety: 'safe',
    relatedTools: ['editor-setSelection', 'actor-getProperties', 'editor-listActors'],
  },
  {
    name: 'editor-getViewport',
    domain: 'editor',
    description: 'Get current viewport camera position and settings',
    safety: 'safe',
    relatedTools: ['editor-getLevelInfo', 'actor-setTransform', 'editor-getSelection'],
  },
  {
    name: 'editor-setSelection',
    domain: 'editor',
    description: 'Set the actor selection in the editor viewport',
    safety: 'warn',
    relatedTools: ['editor-getSelection', 'actor-getProperties', 'actor-setProperty'],
  },
  {
    name: 'editor-getRecentActivity',
    domain: 'editor',
    description: 'Get recent editor activity and operation history',
    safety: 'safe',
    relatedTools: ['editor-ping', 'debug-getLog', 'compilation-getStatus'],
  },

  // blueprint (5)
  {
    name: 'blueprint-serialize',
    domain: 'blueprint',
    description: 'Serialize a Blueprint asset graph to a structured representation',
    safety: 'safe',
    relatedTools: ['blueprint-createNode', 'blueprint-connectPins', 'blueprint-modifyProperty'],
  },
  {
    name: 'blueprint-createNode',
    domain: 'blueprint',
    description: 'Create a new node in a Blueprint graph',
    safety: 'warn',
    relatedTools: ['blueprint-serialize', 'blueprint-connectPins', 'blueprint-deleteNode'],
  },
  {
    name: 'blueprint-connectPins',
    domain: 'blueprint',
    description: 'Connect two pins between Blueprint nodes',
    safety: 'warn',
    relatedTools: ['blueprint-createNode', 'blueprint-serialize', 'blueprint-modifyProperty'],
  },
  {
    name: 'blueprint-modifyProperty',
    domain: 'blueprint',
    description: 'Modify a property value on a Blueprint node',
    safety: 'warn',
    relatedTools: ['blueprint-serialize', 'blueprint-createNode', 'blueprint-connectPins'],
  },
  {
    name: 'blueprint-deleteNode',
    domain: 'blueprint',
    description: 'Delete a node from a Blueprint graph',
    safety: 'dangerous',
    relatedTools: ['blueprint-serialize', 'blueprint-createNode', 'compilation-trigger'],
  },

  // compilation (4)
  {
    name: 'compilation-trigger',
    domain: 'compilation',
    description: 'Trigger a Blueprint or project compilation',
    safety: 'warn',
    relatedTools: ['compilation-getStatus', 'compilation-getErrors', 'compilation-selfHeal'],
  },
  {
    name: 'compilation-getStatus',
    domain: 'compilation',
    description: 'Get the current compilation status',
    safety: 'safe',
    relatedTools: ['compilation-trigger', 'compilation-getErrors', 'editor-ping'],
  },
  {
    name: 'compilation-getErrors',
    domain: 'compilation',
    description: 'Retrieve compilation errors and warnings',
    safety: 'safe',
    relatedTools: ['compilation-getStatus', 'compilation-selfHeal', 'debug-getLog'],
  },
  {
    name: 'compilation-selfHeal',
    domain: 'compilation',
    description: 'Attempt to automatically fix compilation errors',
    safety: 'warn',
    relatedTools: ['compilation-getErrors', 'compilation-trigger', 'blueprint-modifyProperty'],
  },

  // file (3)
  {
    name: 'file-read',
    domain: 'file',
    description: 'Read a file from the Unreal project directory',
    safety: 'safe',
    relatedTools: ['file-search', 'file-write', 'project-getStructure'],
  },
  {
    name: 'file-write',
    domain: 'file',
    description: 'Write content to a file in the Unreal project directory',
    safety: 'warn',
    relatedTools: ['file-read', 'file-search', 'sourcecontrol-checkout'],
  },
  {
    name: 'file-search',
    domain: 'file',
    description: 'Search for files within the Unreal project directory',
    safety: 'safe',
    relatedTools: ['file-read', 'content-findAssets', 'project-getStructure'],
  },

  // slate (3)
  {
    name: 'slate-validate',
    domain: 'slate',
    description: 'Validate a Slate widget definition for correctness',
    safety: 'safe',
    relatedTools: ['slate-generate', 'slate-listTemplates', 'widget-create'],
  },
  {
    name: 'slate-generate',
    domain: 'slate',
    description: 'Generate Slate widget code from a template or spec',
    safety: 'warn',
    relatedTools: ['slate-validate', 'slate-listTemplates', 'widget-addElement'],
  },
  {
    name: 'slate-listTemplates',
    domain: 'slate',
    description: 'List available Slate widget templates',
    safety: 'safe',
    relatedTools: ['slate-generate', 'slate-validate', 'widget-listWidgets'],
  },

  // chat (1)
  {
    name: 'chat-sendMessage',
    domain: 'chat',
    description: 'Send a message through the editor chat/notification system',
    safety: 'warn',
    relatedTools: ['editor-getRecentActivity', 'debug-getLog', 'editor-ping'],
  },

  // python (1)
  {
    name: 'python-execute',
    domain: 'python',
    description: 'Execute a Python script in the Unreal Editor Python environment',
    safety: 'warn',
    relatedTools: ['debug-execConsole', 'debug-getLog', 'compilation-trigger'],
  },

  // project (6)
  {
    name: 'project-getStructure',
    domain: 'project',
    description: 'Get the directory and module structure of the Unreal project',
    safety: 'safe',
    relatedTools: ['project-getSettings', 'project-getPlugins', 'file-search'],
  },
  {
    name: 'project-getSettings',
    domain: 'project',
    description: 'Get project configuration settings',
    safety: 'safe',
    relatedTools: ['project-getStructure', 'project-getPlugins', 'gameplay-getGameMode'],
  },
  {
    name: 'project-getPlugins',
    domain: 'project',
    description: 'List enabled plugins for the project',
    safety: 'safe',
    relatedTools: ['project-getSettings', 'project-getStructure', 'project-getDependencyGraph'],
  },
  {
    name: 'project-getDependencyGraph',
    domain: 'project',
    description: 'Get the module dependency graph for the project',
    safety: 'safe',
    relatedTools: ['project-getPlugins', 'project-getClassHierarchy', 'analyze-codeConventions'],
  },
  {
    name: 'project-getClassHierarchy',
    domain: 'project',
    description: 'Get the C++ and Blueprint class hierarchy',
    safety: 'safe',
    relatedTools: ['project-getDependencyGraph', 'asset-getReferences', 'analyze-blueprintComplexity'],
  },
  {
    name: 'project-snapshot',
    domain: 'project',
    description: 'Take a full snapshot of the project state for analysis',
    safety: 'safe',
    relatedTools: ['project-getStructure', 'analyze-assetHealth', 'content-listAssets'],
  },

  // asset (8)
  {
    name: 'asset-create',
    domain: 'asset',
    description: 'Create a new asset in the Content Browser',
    safety: 'warn',
    relatedTools: ['asset-duplicate', 'asset-setMetadata', 'content-listAssets'],
  },
  {
    name: 'asset-duplicate',
    domain: 'asset',
    description: 'Duplicate an existing asset',
    safety: 'warn',
    relatedTools: ['asset-create', 'asset-rename', 'asset-setMetadata'],
  },
  {
    name: 'asset-rename',
    domain: 'asset',
    description: 'Rename an asset and update all references',
    safety: 'dangerous',
    relatedTools: ['asset-getReferences', 'refactor-renameChain', 'sourcecontrol-checkout'],
  },
  {
    name: 'asset-delete',
    domain: 'asset',
    description: 'Delete an asset from the Content Browser',
    safety: 'dangerous',
    relatedTools: ['asset-getReferences', 'content-findAssets', 'sourcecontrol-checkout'],
  },
  {
    name: 'asset-import',
    domain: 'asset',
    description: 'Import an external file as an Unreal asset',
    safety: 'warn',
    relatedTools: ['texture-import', 'audio-import', 'asset-setMetadata'],
  },
  {
    name: 'asset-export',
    domain: 'asset',
    description: 'Export an Unreal asset to an external format',
    safety: 'warn',
    relatedTools: ['asset-import', 'sequencer-exportFBX', 'mesh-getInfo'],
  },
  {
    name: 'asset-getReferences',
    domain: 'asset',
    description: 'Get all assets that reference or are referenced by a given asset',
    safety: 'safe',
    relatedTools: ['asset-delete', 'asset-rename', 'content-findAssets'],
  },
  {
    name: 'asset-setMetadata',
    domain: 'asset',
    description: 'Set metadata tags on an asset',
    safety: 'warn',
    relatedTools: ['asset-create', 'content-getAssetDetails', 'analyze-assetHealth'],
  },

  // content (4)
  {
    name: 'content-listAssets',
    domain: 'content',
    description: 'List assets in a Content Browser path',
    safety: 'safe',
    relatedTools: ['content-findAssets', 'content-getAssetDetails', 'asset-getReferences'],
  },
  {
    name: 'content-findAssets',
    domain: 'content',
    description: 'Search for assets by name, type, or filter criteria',
    safety: 'safe',
    relatedTools: ['content-listAssets', 'content-getAssetDetails', 'content-validateAssets'],
  },
  {
    name: 'content-getAssetDetails',
    domain: 'content',
    description: 'Get detailed information about a specific asset',
    safety: 'safe',
    relatedTools: ['content-findAssets', 'asset-getReferences', 'editor-getAssetInfo'],
  },
  {
    name: 'content-validateAssets',
    domain: 'content',
    description: 'Validate assets for errors and missing references',
    safety: 'safe',
    relatedTools: ['analyze-assetHealth', 'content-findAssets', 'compilation-getErrors'],
  },

  // actor (9)
  {
    name: 'actor-spawn',
    domain: 'actor',
    description: 'Spawn a new actor in the current level',
    safety: 'warn',
    relatedTools: ['actor-setTransform', 'actor-setProperty', 'actor-addComponent'],
  },
  {
    name: 'actor-delete',
    domain: 'actor',
    description: 'Delete an actor from the current level',
    safety: 'dangerous',
    relatedTools: ['actor-getProperties', 'editor-getSelection', 'editor-listActors'],
  },
  {
    name: 'actor-setTransform',
    domain: 'actor',
    description: 'Set the position, rotation, and scale of an actor',
    safety: 'warn',
    relatedTools: ['actor-spawn', 'actor-getProperties', 'editor-getViewport'],
  },
  {
    name: 'actor-getProperties',
    domain: 'actor',
    description: 'Get all properties of an actor',
    safety: 'safe',
    relatedTools: ['actor-setProperty', 'actor-getComponents', 'editor-listActors'],
  },
  {
    name: 'actor-setProperty',
    domain: 'actor',
    description: 'Set a property value on an actor',
    safety: 'warn',
    relatedTools: ['actor-getProperties', 'actor-setTransform', 'blueprint-modifyProperty'],
  },
  {
    name: 'actor-getComponents',
    domain: 'actor',
    description: 'Get all components attached to an actor',
    safety: 'safe',
    relatedTools: ['actor-addComponent', 'actor-getProperties', 'mesh-getInfo'],
  },
  {
    name: 'actor-addComponent',
    domain: 'actor',
    description: 'Add a component to an actor',
    safety: 'warn',
    relatedTools: ['actor-getComponents', 'actor-setProperty', 'actor-spawn'],
  },
  {
    name: 'actor-select',
    domain: 'actor',
    description: 'Select an actor in the editor viewport',
    safety: 'warn',
    relatedTools: ['editor-getSelection', 'editor-setSelection', 'actor-getProperties'],
  },
  {
    name: 'actor-setArrayRef',
    domain: 'actor',
    description: 'Set an array property reference on an actor',
    safety: 'warn',
    relatedTools: ['actor-setProperty', 'actor-getProperties', 'blueprint-modifyProperty'],
  },

  // level (5)
  {
    name: 'level-create',
    domain: 'level',
    description: 'Create a new level in the project',
    safety: 'warn',
    relatedTools: ['level-open', 'level-save', 'level-getWorldSettings'],
  },
  {
    name: 'level-open',
    domain: 'level',
    description: 'Open an existing level in the editor',
    safety: 'warn',
    relatedTools: ['level-create', 'level-save', 'editor-getLevelInfo'],
  },
  {
    name: 'level-save',
    domain: 'level',
    description: 'Save the current level',
    safety: 'warn',
    relatedTools: ['level-open', 'level-create', 'sourcecontrol-checkout'],
  },
  {
    name: 'level-addSublevel',
    domain: 'level',
    description: 'Add a sublevel to the current persistent level',
    safety: 'warn',
    relatedTools: ['level-create', 'worldpartition-getInfo', 'level-getWorldSettings'],
  },
  {
    name: 'level-getWorldSettings',
    domain: 'level',
    description: 'Get the World Settings for the current level',
    safety: 'safe',
    relatedTools: ['editor-getLevelInfo', 'gameplay-getGameMode', 'level-save'],
  },

  // material (6)
  {
    name: 'material-create',
    domain: 'material',
    description: 'Create a new Material asset',
    safety: 'warn',
    relatedTools: ['material-setParameter', 'material-setTexture', 'material-createInstance'],
  },
  {
    name: 'material-setParameter',
    domain: 'material',
    description: 'Set a scalar or vector parameter on a Material',
    safety: 'warn',
    relatedTools: ['material-getParameters', 'material-create', 'material-createInstance'],
  },
  {
    name: 'material-getParameters',
    domain: 'material',
    description: 'Get all parameters defined in a Material',
    safety: 'safe',
    relatedTools: ['material-setParameter', 'material-getNodes', 'material-createInstance'],
  },
  {
    name: 'material-createInstance',
    domain: 'material',
    description: 'Create a Material Instance from a parent Material',
    safety: 'warn',
    relatedTools: ['material-create', 'material-setParameter', 'material-setTexture'],
  },
  {
    name: 'material-setTexture',
    domain: 'material',
    description: 'Set a texture parameter on a Material',
    safety: 'warn',
    relatedTools: ['material-create', 'texture-import', 'material-setParameter'],
  },
  {
    name: 'material-getNodes',
    domain: 'material',
    description: 'Get the node graph of a Material',
    safety: 'safe',
    relatedTools: ['material-getParameters', 'material-create', 'blueprint-serialize'],
  },

  // mesh (4)
  {
    name: 'mesh-getInfo',
    domain: 'mesh',
    description: 'Get information about a Static or Skeletal Mesh',
    safety: 'safe',
    relatedTools: ['mesh-setMaterial', 'mesh-generateCollision', 'mesh-setLOD'],
  },
  {
    name: 'mesh-setMaterial',
    domain: 'mesh',
    description: 'Set a material on a mesh slot',
    safety: 'warn',
    relatedTools: ['mesh-getInfo', 'material-create', 'actor-setProperty'],
  },
  {
    name: 'mesh-generateCollision',
    domain: 'mesh',
    description: 'Generate collision geometry for a mesh',
    safety: 'warn',
    relatedTools: ['mesh-getInfo', 'physics-createAsset', 'mesh-setLOD'],
  },
  {
    name: 'mesh-setLOD',
    domain: 'mesh',
    description: 'Configure LOD settings for a mesh',
    safety: 'warn',
    relatedTools: ['mesh-getInfo', 'mesh-generateCollision', 'analyze-performanceHints'],
  },

  // datatable (4)
  {
    name: 'datatable-create',
    domain: 'datatable',
    description: 'Create a new DataTable asset',
    safety: 'warn',
    relatedTools: ['datatable-addRow', 'datatable-getRows', 'asset-create'],
  },
  {
    name: 'datatable-addRow',
    domain: 'datatable',
    description: 'Add a row to an existing DataTable',
    safety: 'warn',
    relatedTools: ['datatable-create', 'datatable-getRows', 'datatable-removeRow'],
  },
  {
    name: 'datatable-getRows',
    domain: 'datatable',
    description: 'Get rows from a DataTable',
    safety: 'safe',
    relatedTools: ['datatable-addRow', 'datatable-removeRow', 'datatable-create'],
  },
  {
    name: 'datatable-removeRow',
    domain: 'datatable',
    description: 'Remove a row from a DataTable',
    safety: 'dangerous',
    relatedTools: ['datatable-getRows', 'datatable-addRow', 'datatable-create'],
  },

  // animation (5)
  {
    name: 'anim-listMontages',
    domain: 'animation',
    description: 'List Animation Montages for a skeleton',
    safety: 'safe',
    relatedTools: ['anim-createMontage', 'anim-listSequences', 'anim-getSkeletonInfo'],
  },
  {
    name: 'anim-getBlendSpace',
    domain: 'animation',
    description: 'Get information about a Blend Space asset',
    safety: 'safe',
    relatedTools: ['anim-getSkeletonInfo', 'anim-listSequences', 'anim-listMontages'],
  },
  {
    name: 'anim-createMontage',
    domain: 'animation',
    description: 'Create a new Animation Montage',
    safety: 'warn',
    relatedTools: ['anim-listMontages', 'anim-getSkeletonInfo', 'anim-listSequences'],
  },
  {
    name: 'anim-listSequences',
    domain: 'animation',
    description: 'List Animation Sequences for a skeleton',
    safety: 'safe',
    relatedTools: ['anim-listMontages', 'anim-getSkeletonInfo', 'anim-getBlendSpace'],
  },
  {
    name: 'anim-getSkeletonInfo',
    domain: 'animation',
    description: 'Get skeleton hierarchy and bone information',
    safety: 'safe',
    relatedTools: ['anim-listMontages', 'anim-listSequences', 'mesh-getInfo'],
  },

  // gameplay (4)
  {
    name: 'gameplay-getGameMode',
    domain: 'gameplay',
    description: 'Get the current Game Mode configuration',
    safety: 'safe',
    relatedTools: ['gameplay-setGameMode', 'gameplay-listInputActions', 'level-getWorldSettings'],
  },
  {
    name: 'gameplay-setGameMode',
    domain: 'gameplay',
    description: 'Set the Game Mode for the project or level',
    safety: 'warn',
    relatedTools: ['gameplay-getGameMode', 'gameplay-addInputAction', 'project-getSettings'],
  },
  {
    name: 'gameplay-listInputActions',
    domain: 'gameplay',
    description: 'List all input actions defined in the project',
    safety: 'safe',
    relatedTools: ['gameplay-addInputAction', 'gameplay-getGameMode', 'blueprint-serialize'],
  },
  {
    name: 'gameplay-addInputAction',
    domain: 'gameplay',
    description: 'Add a new input action to the project',
    safety: 'warn',
    relatedTools: ['gameplay-listInputActions', 'gameplay-setGameMode', 'blueprint-createNode'],
  },

  // sourcecontrol (3)
  {
    name: 'sourcecontrol-getStatus',
    domain: 'sourcecontrol',
    description: 'Get the source control status of project files',
    safety: 'safe',
    relatedTools: ['sourcecontrol-checkout', 'sourcecontrol-diff', 'file-write'],
  },
  {
    name: 'sourcecontrol-checkout',
    domain: 'sourcecontrol',
    description: 'Check out files from source control for editing',
    safety: 'warn',
    relatedTools: ['sourcecontrol-getStatus', 'sourcecontrol-diff', 'file-write'],
  },
  {
    name: 'sourcecontrol-diff',
    domain: 'sourcecontrol',
    description: 'Show the diff of modified files in source control',
    safety: 'safe',
    relatedTools: ['sourcecontrol-getStatus', 'sourcecontrol-checkout', 'file-read'],
  },

  // build (3)
  {
    name: 'build-lightmaps',
    domain: 'build',
    description: 'Build lightmaps for the current level',
    safety: 'warn',
    relatedTools: ['build-getMapCheck', 'level-save', 'debug-getPerformance'],
  },
  {
    name: 'build-getMapCheck',
    domain: 'build',
    description: 'Run the Map Check tool and get results',
    safety: 'safe',
    relatedTools: ['build-lightmaps', 'content-validateAssets', 'compilation-getErrors'],
  },
  {
    name: 'build-cookContent',
    domain: 'build',
    description: 'Cook project content for a target platform',
    safety: 'dangerous',
    relatedTools: ['build-getMapCheck', 'build-lightmaps', 'content-validateAssets'],
  },

  // debug (3)
  {
    name: 'debug-execConsole',
    domain: 'debug',
    description: 'Execute a console command in the Unreal Editor',
    safety: 'dangerous',
    relatedTools: ['debug-getLog', 'debug-getPerformance', 'python-execute'],
  },
  {
    name: 'debug-getLog',
    domain: 'debug',
    description: 'Retrieve recent output log entries',
    safety: 'safe',
    relatedTools: ['debug-getPerformance', 'compilation-getErrors', 'editor-getRecentActivity'],
  },
  {
    name: 'debug-getPerformance',
    domain: 'debug',
    description: 'Get performance statistics from the editor',
    safety: 'safe',
    relatedTools: ['debug-getLog', 'analyze-performanceHints', 'mesh-setLOD'],
  },

  // sequencer (8)
  {
    name: 'sequencer-create',
    domain: 'sequencer',
    description: 'Create a new Level Sequence asset',
    safety: 'warn',
    relatedTools: ['sequencer-open', 'sequencer-addTrack', 'sequencer-addBinding'],
  },
  {
    name: 'sequencer-open',
    domain: 'sequencer',
    description: 'Open an existing Level Sequence in the Sequencer editor',
    safety: 'warn',
    relatedTools: ['sequencer-create', 'sequencer-getInfo', 'sequencer-addTrack'],
  },
  {
    name: 'sequencer-addTrack',
    domain: 'sequencer',
    description: 'Add a track to a Level Sequence',
    safety: 'warn',
    relatedTools: ['sequencer-addBinding', 'sequencer-setKeyframe', 'sequencer-create'],
  },
  {
    name: 'sequencer-addBinding',
    domain: 'sequencer',
    description: 'Add an actor binding to a Level Sequence',
    safety: 'warn',
    relatedTools: ['sequencer-addTrack', 'sequencer-setKeyframe', 'actor-spawn'],
  },
  {
    name: 'sequencer-setKeyframe',
    domain: 'sequencer',
    description: 'Set a keyframe value on a Sequencer track',
    safety: 'warn',
    relatedTools: ['sequencer-addTrack', 'sequencer-addBinding', 'sequencer-getInfo'],
  },
  {
    name: 'sequencer-getInfo',
    domain: 'sequencer',
    description: 'Get information about a Level Sequence',
    safety: 'safe',
    relatedTools: ['sequencer-open', 'sequencer-addTrack', 'sequencer-exportFBX'],
  },
  {
    name: 'sequencer-exportFBX',
    domain: 'sequencer',
    description: 'Export a Level Sequence to FBX format',
    safety: 'warn',
    relatedTools: ['sequencer-getInfo', 'sequencer-importFBX', 'asset-export'],
  },
  {
    name: 'sequencer-importFBX',
    domain: 'sequencer',
    description: 'Import FBX animation data into a Level Sequence',
    safety: 'warn',
    relatedTools: ['sequencer-exportFBX', 'sequencer-create', 'asset-import'],
  },

  // ai (8)
  {
    name: 'ai-createBehaviorTree',
    domain: 'ai',
    description: 'Create a new Behavior Tree asset',
    safety: 'warn',
    relatedTools: ['ai-createBlackboard', 'ai-getBehaviorTreeInfo', 'ai-createEQS'],
  },
  {
    name: 'ai-createBlackboard',
    domain: 'ai',
    description: 'Create a new Blackboard asset',
    safety: 'warn',
    relatedTools: ['ai-createBehaviorTree', 'ai-addBlackboardKey', 'ai-getBlackboardKeys'],
  },
  {
    name: 'ai-getBehaviorTreeInfo',
    domain: 'ai',
    description: 'Get information about a Behavior Tree asset',
    safety: 'safe',
    relatedTools: ['ai-createBehaviorTree', 'ai-getBlackboardKeys', 'ai-createEQS'],
  },
  {
    name: 'ai-getBlackboardKeys',
    domain: 'ai',
    description: 'Get all keys defined in a Blackboard asset',
    safety: 'safe',
    relatedTools: ['ai-addBlackboardKey', 'ai-createBlackboard', 'ai-getBehaviorTreeInfo'],
  },
  {
    name: 'ai-addBlackboardKey',
    domain: 'ai',
    description: 'Add a key to a Blackboard asset',
    safety: 'warn',
    relatedTools: ['ai-getBlackboardKeys', 'ai-createBlackboard', 'ai-createBehaviorTree'],
  },
  {
    name: 'ai-configureNavMesh',
    domain: 'ai',
    description: 'Configure NavMesh settings for AI navigation',
    safety: 'warn',
    relatedTools: ['ai-getNavMeshInfo', 'level-getWorldSettings', 'actor-spawn'],
  },
  {
    name: 'ai-getNavMeshInfo',
    domain: 'ai',
    description: 'Get current NavMesh configuration and bounds',
    safety: 'safe',
    relatedTools: ['ai-configureNavMesh', 'editor-getLevelInfo', 'debug-getPerformance'],
  },
  {
    name: 'ai-createEQS',
    domain: 'ai',
    description: 'Create an Environment Query System asset',
    safety: 'warn',
    relatedTools: ['ai-createBehaviorTree', 'ai-getNavMeshInfo', 'ai-getBehaviorTreeInfo'],
  },

  // widget (6)
  {
    name: 'widget-create',
    domain: 'widget',
    description: 'Create a new UMG Widget Blueprint',
    safety: 'warn',
    relatedTools: ['widget-addElement', 'widget-setProperty', 'widget-getBindings'],
  },
  {
    name: 'widget-getInfo',
    domain: 'widget',
    description: 'Get information about an existing Widget Blueprint',
    safety: 'safe',
    relatedTools: ['widget-listWidgets', 'widget-getBindings', 'widget-addElement'],
  },
  {
    name: 'widget-addElement',
    domain: 'widget',
    description: 'Add a UI element to a Widget Blueprint',
    safety: 'warn',
    relatedTools: ['widget-create', 'widget-setProperty', 'widget-getBindings'],
  },
  {
    name: 'widget-setProperty',
    domain: 'widget',
    description: 'Set a property on a widget element',
    safety: 'warn',
    relatedTools: ['widget-addElement', 'widget-getBindings', 'widget-getInfo'],
  },
  {
    name: 'widget-getBindings',
    domain: 'widget',
    description: 'Get all property bindings defined in a Widget Blueprint',
    safety: 'safe',
    relatedTools: ['widget-setProperty', 'widget-addElement', 'blueprint-serialize'],
  },
  {
    name: 'widget-listWidgets',
    domain: 'widget',
    description: 'List all Widget Blueprints in the project',
    safety: 'safe',
    relatedTools: ['widget-getInfo', 'widget-create', 'content-findAssets'],
  },

  // editor-utils (1)
  {
    name: 'editor-batchOperation',
    domain: 'editor-utils',
    description: 'Execute a batch of editor operations atomically',
    safety: 'warn',
    relatedTools: ['python-execute', 'debug-execConsole', 'compilation-trigger'],
  },

  // texture (6)
  {
    name: 'texture-import',
    domain: 'texture',
    description: 'Import an image file as a Texture asset',
    safety: 'warn',
    relatedTools: ['material-setTexture', 'texture-setCompression', 'texture-getInfo'],
  },
  {
    name: 'texture-getInfo',
    domain: 'texture',
    description: 'Get information and settings for a Texture asset',
    safety: 'safe',
    relatedTools: ['texture-import', 'texture-setCompression', 'texture-resize'],
  },
  {
    name: 'texture-setCompression',
    domain: 'texture',
    description: 'Set the compression settings for a Texture',
    safety: 'warn',
    relatedTools: ['texture-getInfo', 'texture-import', 'analyze-performanceHints'],
  },
  {
    name: 'texture-createRenderTarget',
    domain: 'texture',
    description: 'Create a Render Target texture asset',
    safety: 'warn',
    relatedTools: ['texture-getInfo', 'material-setTexture', 'texture-import'],
  },
  {
    name: 'texture-resize',
    domain: 'texture',
    description: 'Resize a Texture asset to new dimensions',
    safety: 'warn',
    relatedTools: ['texture-getInfo', 'texture-setCompression', 'analyze-assetHealth'],
  },
  {
    name: 'texture-listTextures',
    domain: 'texture',
    description: 'List all Texture assets in the project',
    safety: 'safe',
    relatedTools: ['texture-getInfo', 'content-findAssets', 'material-setTexture'],
  },

  // niagara (6)
  {
    name: 'niagara-createSystem',
    domain: 'niagara',
    description: 'Create a new Niagara particle system',
    safety: 'warn',
    relatedTools: ['niagara-addEmitter', 'niagara-setParameter', 'niagara-compile'],
  },
  {
    name: 'niagara-getInfo',
    domain: 'niagara',
    description: 'Get information about a Niagara system',
    safety: 'safe',
    relatedTools: ['niagara-createSystem', 'niagara-addEmitter', 'niagara-listSystems'],
  },
  {
    name: 'niagara-addEmitter',
    domain: 'niagara',
    description: 'Add an emitter to a Niagara system',
    safety: 'warn',
    relatedTools: ['niagara-createSystem', 'niagara-setParameter', 'niagara-compile'],
  },
  {
    name: 'niagara-setParameter',
    domain: 'niagara',
    description: 'Set a parameter on a Niagara system or emitter',
    safety: 'warn',
    relatedTools: ['niagara-addEmitter', 'niagara-createSystem', 'niagara-getInfo'],
  },
  {
    name: 'niagara-compile',
    domain: 'niagara',
    description: 'Compile a Niagara system',
    safety: 'warn',
    relatedTools: ['niagara-createSystem', 'niagara-addEmitter', 'compilation-trigger'],
  },
  {
    name: 'niagara-listSystems',
    domain: 'niagara',
    description: 'List all Niagara systems in the project',
    safety: 'safe',
    relatedTools: ['niagara-getInfo', 'content-findAssets', 'niagara-createSystem'],
  },

  // audio (6)
  {
    name: 'audio-import',
    domain: 'audio',
    description: 'Import an audio file as a Sound Wave asset',
    safety: 'warn',
    relatedTools: ['audio-createCue', 'audio-setAttenuation', 'audio-getInfo'],
  },
  {
    name: 'audio-createCue',
    domain: 'audio',
    description: 'Create a Sound Cue asset',
    safety: 'warn',
    relatedTools: ['audio-import', 'audio-setAttenuation', 'audio-createMetaSound'],
  },
  {
    name: 'audio-getInfo',
    domain: 'audio',
    description: 'Get information about an audio asset',
    safety: 'safe',
    relatedTools: ['audio-import', 'audio-setAttenuation', 'audio-listAssets'],
  },
  {
    name: 'audio-setAttenuation',
    domain: 'audio',
    description: 'Set attenuation settings on a sound asset',
    safety: 'warn',
    relatedTools: ['audio-createCue', 'audio-getInfo', 'audio-import'],
  },
  {
    name: 'audio-createMetaSound',
    domain: 'audio',
    description: 'Create a MetaSound asset',
    safety: 'warn',
    relatedTools: ['audio-createCue', 'audio-import', 'audio-setAttenuation'],
  },
  {
    name: 'audio-listAssets',
    domain: 'audio',
    description: 'List all audio assets in the project',
    safety: 'safe',
    relatedTools: ['audio-getInfo', 'content-findAssets', 'audio-import'],
  },

  // landscape (5)
  {
    name: 'landscape-create',
    domain: 'landscape',
    description: 'Create a new Landscape actor in the level',
    safety: 'warn',
    relatedTools: ['landscape-setMaterial', 'landscape-getInfo', 'landscape-importHeightmap'],
  },
  {
    name: 'landscape-importHeightmap',
    domain: 'landscape',
    description: 'Import a heightmap image into a Landscape',
    safety: 'warn',
    relatedTools: ['landscape-create', 'landscape-exportHeightmap', 'landscape-getInfo'],
  },
  {
    name: 'landscape-exportHeightmap',
    domain: 'landscape',
    description: 'Export the heightmap from a Landscape',
    safety: 'warn',
    relatedTools: ['landscape-importHeightmap', 'landscape-getInfo', 'asset-export'],
  },
  {
    name: 'landscape-getInfo',
    domain: 'landscape',
    description: 'Get information about a Landscape actor',
    safety: 'safe',
    relatedTools: ['landscape-create', 'landscape-setMaterial', 'foliage-getInfo'],
  },
  {
    name: 'landscape-setMaterial',
    domain: 'landscape',
    description: 'Set the material on a Landscape actor',
    safety: 'warn',
    relatedTools: ['landscape-create', 'material-create', 'landscape-getInfo'],
  },

  // physics (5)
  {
    name: 'physics-createAsset',
    domain: 'physics',
    description: 'Create a Physics Asset for a Skeletal Mesh',
    safety: 'warn',
    relatedTools: ['physics-getInfo', 'physics-setProfile', 'physics-setConstraint'],
  },
  {
    name: 'physics-getInfo',
    domain: 'physics',
    description: 'Get information about a Physics Asset',
    safety: 'safe',
    relatedTools: ['physics-createAsset', 'physics-setProfile', 'mesh-getInfo'],
  },
  {
    name: 'physics-setProfile',
    domain: 'physics',
    description: 'Set a collision profile on a Physics Asset body',
    safety: 'warn',
    relatedTools: ['physics-createAsset', 'physics-getInfo', 'mesh-generateCollision'],
  },
  {
    name: 'physics-createMaterial',
    domain: 'physics',
    description: 'Create a Physical Material asset',
    safety: 'warn',
    relatedTools: ['physics-setProfile', 'physics-getInfo', 'material-create'],
  },
  {
    name: 'physics-setConstraint',
    domain: 'physics',
    description: 'Set a physics constraint on a Physics Asset',
    safety: 'warn',
    relatedTools: ['physics-createAsset', 'physics-setProfile', 'physics-getInfo'],
  },

  // worldpartition (4)
  {
    name: 'worldpartition-getInfo',
    domain: 'worldpartition',
    description: 'Get World Partition configuration and data layer info',
    safety: 'safe',
    relatedTools: ['worldpartition-setConfig', 'worldpartition-createDataLayer', 'level-getWorldSettings'],
  },
  {
    name: 'worldpartition-setConfig',
    domain: 'worldpartition',
    description: 'Configure World Partition settings',
    safety: 'warn',
    relatedTools: ['worldpartition-getInfo', 'worldpartition-createHLOD', 'level-save'],
  },
  {
    name: 'worldpartition-createDataLayer',
    domain: 'worldpartition',
    description: 'Create a new Data Layer in the World Partition',
    safety: 'warn',
    relatedTools: ['worldpartition-getInfo', 'worldpartition-setConfig', 'level-addSublevel'],
  },
  {
    name: 'worldpartition-createHLOD',
    domain: 'worldpartition',
    description: 'Create HLOD (Hierarchical Level of Detail) for World Partition',
    safety: 'warn',
    relatedTools: ['worldpartition-setConfig', 'worldpartition-getInfo', 'analyze-performanceHints'],
  },

  // foliage (3)
  {
    name: 'foliage-createType',
    domain: 'foliage',
    description: 'Create a new Foliage Type asset',
    safety: 'warn',
    relatedTools: ['foliage-setProperties', 'foliage-getInfo', 'mesh-getInfo'],
  },
  {
    name: 'foliage-getInfo',
    domain: 'foliage',
    description: 'Get information about a Foliage Type',
    safety: 'safe',
    relatedTools: ['foliage-createType', 'foliage-setProperties', 'landscape-getInfo'],
  },
  {
    name: 'foliage-setProperties',
    domain: 'foliage',
    description: 'Set density, scale, and placement properties on a Foliage Type',
    safety: 'warn',
    relatedTools: ['foliage-createType', 'foliage-getInfo', 'mesh-setMaterial'],
  },

  // curve (3)
  {
    name: 'curve-create',
    domain: 'curve',
    description: 'Create a new Curve asset',
    safety: 'warn',
    relatedTools: ['curve-setKeys', 'curve-getInfo', 'asset-create'],
  },
  {
    name: 'curve-setKeys',
    domain: 'curve',
    description: 'Set keyframe values on a Curve asset',
    safety: 'warn',
    relatedTools: ['curve-create', 'curve-getInfo', 'sequencer-setKeyframe'],
  },
  {
    name: 'curve-getInfo',
    domain: 'curve',
    description: 'Get information and keyframes from a Curve asset',
    safety: 'safe',
    relatedTools: ['curve-create', 'curve-setKeys', 'anim-getBlendSpace'],
  },

  // pcg (4)
  {
    name: 'pcg-createGraph',
    domain: 'pcg',
    description: 'Create a new PCG (Procedural Content Generation) graph',
    safety: 'warn',
    relatedTools: ['pcg-addNode', 'pcg-connectNodes', 'pcg-getInfo'],
  },
  {
    name: 'pcg-getInfo',
    domain: 'pcg',
    description: 'Get information about a PCG graph',
    safety: 'safe',
    relatedTools: ['pcg-createGraph', 'pcg-addNode', 'geoscript-getInfo'],
  },
  {
    name: 'pcg-addNode',
    domain: 'pcg',
    description: 'Add a node to a PCG graph',
    safety: 'warn',
    relatedTools: ['pcg-createGraph', 'pcg-connectNodes', 'blueprint-createNode'],
  },
  {
    name: 'pcg-connectNodes',
    domain: 'pcg',
    description: 'Connect nodes within a PCG graph',
    safety: 'warn',
    relatedTools: ['pcg-addNode', 'pcg-createGraph', 'blueprint-connectPins'],
  },

  // geoscript (3)
  {
    name: 'geoscript-meshBoolean',
    domain: 'geoscript',
    description: 'Perform a boolean mesh operation using GeometryScript',
    safety: 'warn',
    relatedTools: ['geoscript-meshTransform', 'geoscript-getInfo', 'mesh-getInfo'],
  },
  {
    name: 'geoscript-meshTransform',
    domain: 'geoscript',
    description: 'Apply a transform operation to a mesh using GeometryScript',
    safety: 'warn',
    relatedTools: ['geoscript-meshBoolean', 'geoscript-getInfo', 'actor-setTransform'],
  },
  {
    name: 'geoscript-getInfo',
    domain: 'geoscript',
    description: 'Get information about GeometryScript capabilities and mesh state',
    safety: 'safe',
    relatedTools: ['geoscript-meshBoolean', 'geoscript-meshTransform', 'mesh-getInfo'],
  },

  // workflow (8)
  {
    name: 'workflow-createCharacter',
    domain: 'workflow',
    description: 'High-level workflow to create a complete character setup',
    safety: 'warn',
    relatedTools: ['actor-spawn', 'anim-createMontage', 'gameplay-addInputAction'],
  },
  {
    name: 'workflow-createUIScreen',
    domain: 'workflow',
    description: 'High-level workflow to create a complete UI screen',
    safety: 'warn',
    relatedTools: ['widget-create', 'widget-addElement', 'blueprint-createNode'],
  },
  {
    name: 'workflow-setupLevel',
    domain: 'workflow',
    description: 'High-level workflow to set up a game level with standard actors',
    safety: 'warn',
    relatedTools: ['level-create', 'actor-spawn', 'build-lightmaps'],
  },
  {
    name: 'workflow-createInteractable',
    domain: 'workflow',
    description: 'High-level workflow to create an interactable object',
    safety: 'warn',
    relatedTools: ['actor-spawn', 'blueprint-createNode', 'gameplay-addInputAction'],
  },
  {
    name: 'workflow-createProjectile',
    domain: 'workflow',
    description: 'High-level workflow to create a projectile actor',
    safety: 'warn',
    relatedTools: ['actor-spawn', 'physics-createAsset', 'niagara-createSystem'],
  },
  {
    name: 'workflow-setupMultiplayer',
    domain: 'workflow',
    description: 'High-level workflow to configure multiplayer game settings',
    safety: 'warn',
    relatedTools: ['gameplay-setGameMode', 'project-getSettings', 'blueprint-createNode'],
  },
  {
    name: 'workflow-createInventorySystem',
    domain: 'workflow',
    description: 'High-level workflow to create a data-driven inventory system',
    safety: 'warn',
    relatedTools: ['datatable-create', 'widget-create', 'blueprint-createNode'],
  },
  {
    name: 'workflow-createDialogueSystem',
    domain: 'workflow',
    description: 'High-level workflow to create a dialogue/conversation system',
    safety: 'warn',
    relatedTools: ['datatable-create', 'widget-create', 'audio-createCue'],
  },

  // analyze (4)
  {
    name: 'analyze-blueprintComplexity',
    domain: 'analyze',
    description: 'Analyze Blueprint graph complexity and identify problem areas',
    safety: 'safe',
    relatedTools: ['blueprint-serialize', 'analyze-codeConventions', 'compilation-getErrors'],
  },
  {
    name: 'analyze-assetHealth',
    domain: 'analyze',
    description: 'Analyze the health and quality of project assets',
    safety: 'safe',
    relatedTools: ['content-validateAssets', 'asset-getReferences', 'analyze-performanceHints'],
  },
  {
    name: 'analyze-performanceHints',
    domain: 'analyze',
    description: 'Provide performance optimization hints for the project',
    safety: 'safe',
    relatedTools: ['debug-getPerformance', 'mesh-setLOD', 'texture-setCompression'],
  },
  {
    name: 'analyze-codeConventions',
    domain: 'analyze',
    description: 'Analyze code for adherence to Unreal coding conventions',
    safety: 'safe',
    relatedTools: ['project-getClassHierarchy', 'analyze-blueprintComplexity', 'compilation-getErrors'],
  },

  // refactor (1)
  {
    name: 'refactor-renameChain',
    domain: 'refactor',
    description: 'Rename an asset and update all references across the project',
    safety: 'dangerous',
    relatedTools: ['asset-rename', 'asset-getReferences', 'sourcecontrol-checkout'],
  },
];

const CHAINS: ToolChain[] = [
  {
    name: 'add-blueprint-logic',
    description: 'Add logic to an existing Blueprint by serializing, adding nodes, connecting pins, and re-serializing to verify',
    steps: [
      { tool: 'blueprint-serialize', purpose: 'Read the current Blueprint graph structure' },
      { tool: 'blueprint-createNode', purpose: 'Create the required logic node' },
      { tool: 'blueprint-connectPins', purpose: 'Wire the node into the existing graph' },
      { tool: 'blueprint-serialize', purpose: 'Verify the final graph structure is correct' },
    ],
  },
  {
    name: 'create-material-from-textures',
    description: 'Create a new material and assign textures and parameters to produce a ready-to-use shading setup',
    steps: [
      { tool: 'material-create', purpose: 'Create the base material asset' },
      { tool: 'material-setTexture', purpose: 'Assign the albedo/base color texture' },
      { tool: 'material-setTexture', purpose: 'Assign normal map texture' },
      { tool: 'material-setTexture', purpose: 'Assign roughness/metallic texture' },
      { tool: 'material-setParameter', purpose: 'Configure scalar and vector parameters' },
    ],
  },
  {
    name: 'setup-character',
    description: 'Full character setup from asset creation through animation and input binding',
    steps: [
      { tool: 'asset-create', purpose: 'Create the Character Blueprint asset' },
      { tool: 'actor-addComponent', purpose: 'Add skeletal mesh component' },
      { tool: 'actor-setProperty', purpose: 'Assign the skeletal mesh and animation blueprint' },
      { tool: 'anim-createMontage', purpose: 'Create animation montages for actions' },
      { tool: 'gameplay-addInputAction', purpose: 'Register input actions for the character' },
      { tool: 'blueprint-createNode', purpose: 'Add input event nodes to the character graph' },
      { tool: 'blueprint-connectPins', purpose: 'Connect input events to movement/action logic' },
    ],
  },
  {
    name: 'create-ui-screen',
    description: 'Create a complete UI screen with elements, properties, and bindings',
    steps: [
      { tool: 'widget-create', purpose: 'Create the Widget Blueprint asset' },
      { tool: 'widget-addElement', purpose: 'Add UI elements (buttons, text, images)' },
      { tool: 'widget-setProperty', purpose: 'Configure element appearance and layout' },
      { tool: 'widget-getBindings', purpose: 'Verify bindings are correctly set up' },
    ],
  },
  {
    name: 'level-setup',
    description: 'Create and populate a new level with actors and built lighting',
    steps: [
      { tool: 'level-create', purpose: 'Create the new level asset' },
      { tool: 'actor-spawn', purpose: 'Spawn a sky and directional light' },
      { tool: 'actor-spawn', purpose: 'Spawn environment and gameplay actors' },
      { tool: 'actor-setTransform', purpose: 'Position and orient all actors' },
      { tool: 'build-lightmaps', purpose: 'Build static lighting for the level' },
    ],
  },
  {
    name: 'debug-performance',
    description: 'Identify and investigate performance bottlenecks',
    steps: [
      { tool: 'analyze-performanceHints', purpose: 'Get high-level optimization recommendations' },
      { tool: 'debug-getPerformance', purpose: 'Capture live performance statistics' },
      { tool: 'debug-getLog', purpose: 'Review logs for performance warnings' },
    ],
  },
  {
    name: 'asset-audit',
    description: 'Audit project assets for health, unused references, and quality issues',
    steps: [
      { tool: 'analyze-assetHealth', purpose: 'Run a full asset health analysis' },
      { tool: 'content-findAssets', purpose: 'Locate assets flagged as problematic' },
      { tool: 'asset-getReferences', purpose: 'Check reference chains for orphaned assets' },
    ],
  },
  {
    name: 'multiplayer-setup',
    description: 'Configure a project for multiplayer gameplay',
    steps: [
      { tool: 'workflow-setupMultiplayer', purpose: 'Run the high-level multiplayer setup workflow' },
      { tool: 'gameplay-setGameMode', purpose: 'Set the multiplayer Game Mode' },
      { tool: 'gameplay-addInputAction', purpose: 'Register multiplayer-specific input actions' },
    ],
  },
];

const DOMAINS: DomainInfo[] = [
  {
    name: 'editor',
    description: 'Core editor queries and viewport control',
    tools: ['editor-ping', 'editor-getLevelInfo', 'editor-listActors', 'editor-getAssetInfo', 'editor-getSelection', 'editor-getViewport', 'editor-setSelection', 'editor-getRecentActivity'],
  },
  {
    name: 'blueprint',
    description: 'Blueprint graph creation, modification, and serialization',
    tools: ['blueprint-serialize', 'blueprint-createNode', 'blueprint-connectPins', 'blueprint-modifyProperty', 'blueprint-deleteNode'],
  },
  {
    name: 'compilation',
    description: 'Blueprint and project compilation management',
    tools: ['compilation-trigger', 'compilation-getStatus', 'compilation-getErrors', 'compilation-selfHeal'],
  },
  {
    name: 'file',
    description: 'File system read, write, and search operations',
    tools: ['file-read', 'file-write', 'file-search'],
  },
  {
    name: 'slate',
    description: 'Slate UI widget generation and validation',
    tools: ['slate-validate', 'slate-generate', 'slate-listTemplates'],
  },
  {
    name: 'chat',
    description: 'Editor chat and notification messaging',
    tools: ['chat-sendMessage'],
  },
  {
    name: 'python',
    description: 'Python script execution in the Unreal Editor environment',
    tools: ['python-execute'],
  },
  {
    name: 'project',
    description: 'Project structure, settings, plugins, and class hierarchy',
    tools: ['project-getStructure', 'project-getSettings', 'project-getPlugins', 'project-getDependencyGraph', 'project-getClassHierarchy', 'project-snapshot'],
  },
  {
    name: 'asset',
    description: 'Asset lifecycle management: create, duplicate, rename, delete, import, export',
    tools: ['asset-create', 'asset-duplicate', 'asset-rename', 'asset-delete', 'asset-import', 'asset-export', 'asset-getReferences', 'asset-setMetadata'],
  },
  {
    name: 'content',
    description: 'Content Browser browsing, searching, and validation',
    tools: ['content-listAssets', 'content-findAssets', 'content-getAssetDetails', 'content-validateAssets'],
  },
  {
    name: 'actor',
    description: 'Actor spawning, properties, transforms, and components',
    tools: ['actor-spawn', 'actor-delete', 'actor-setTransform', 'actor-getProperties', 'actor-setProperty', 'actor-getComponents', 'actor-addComponent', 'actor-select', 'actor-setArrayRef'],
  },
  {
    name: 'level',
    description: 'Level creation, opening, saving, and world settings',
    tools: ['level-create', 'level-open', 'level-save', 'level-addSublevel', 'level-getWorldSettings'],
  },
  {
    name: 'material',
    description: 'Material creation, parameters, textures, and instances',
    tools: ['material-create', 'material-setParameter', 'material-getParameters', 'material-createInstance', 'material-setTexture', 'material-getNodes'],
  },
  {
    name: 'mesh',
    description: 'Static and Skeletal Mesh info, materials, collision, and LODs',
    tools: ['mesh-getInfo', 'mesh-setMaterial', 'mesh-generateCollision', 'mesh-setLOD'],
  },
  {
    name: 'datatable',
    description: 'DataTable asset creation and row management',
    tools: ['datatable-create', 'datatable-addRow', 'datatable-getRows', 'datatable-removeRow'],
  },
  {
    name: 'animation',
    description: 'Animation montages, sequences, blend spaces, and skeleton info',
    tools: ['anim-listMontages', 'anim-getBlendSpace', 'anim-createMontage', 'anim-listSequences', 'anim-getSkeletonInfo'],
  },
  {
    name: 'gameplay',
    description: 'Game Mode configuration and input action management',
    tools: ['gameplay-getGameMode', 'gameplay-setGameMode', 'gameplay-listInputActions', 'gameplay-addInputAction'],
  },
  {
    name: 'sourcecontrol',
    description: 'Source control status, checkout, and diff operations',
    tools: ['sourcecontrol-getStatus', 'sourcecontrol-checkout', 'sourcecontrol-diff'],
  },
  {
    name: 'build',
    description: 'Lightmap building, map checks, and content cooking',
    tools: ['build-lightmaps', 'build-getMapCheck', 'build-cookContent'],
  },
  {
    name: 'debug',
    description: 'Console commands, output log, and performance statistics',
    tools: ['debug-execConsole', 'debug-getLog', 'debug-getPerformance'],
  },
  {
    name: 'sequencer',
    description: 'Level Sequence creation, tracks, keyframes, and FBX import/export',
    tools: ['sequencer-create', 'sequencer-open', 'sequencer-addTrack', 'sequencer-addBinding', 'sequencer-setKeyframe', 'sequencer-getInfo', 'sequencer-exportFBX', 'sequencer-importFBX'],
  },
  {
    name: 'ai',
    description: 'Behavior Trees, Blackboards, NavMesh, and EQS for AI systems',
    tools: ['ai-createBehaviorTree', 'ai-createBlackboard', 'ai-getBehaviorTreeInfo', 'ai-getBlackboardKeys', 'ai-addBlackboardKey', 'ai-configureNavMesh', 'ai-getNavMeshInfo', 'ai-createEQS'],
  },
  {
    name: 'widget',
    description: 'UMG Widget Blueprint creation and UI element management',
    tools: ['widget-create', 'widget-getInfo', 'widget-addElement', 'widget-setProperty', 'widget-getBindings', 'widget-listWidgets'],
  },
  {
    name: 'editor-utils',
    description: 'Batch editor operations and utility functions',
    tools: ['editor-batchOperation'],
  },
  {
    name: 'texture',
    description: 'Texture import, compression, render targets, and resize',
    tools: ['texture-import', 'texture-getInfo', 'texture-setCompression', 'texture-createRenderTarget', 'texture-resize', 'texture-listTextures'],
  },
  {
    name: 'niagara',
    description: 'Niagara particle system creation, emitters, and parameters',
    tools: ['niagara-createSystem', 'niagara-getInfo', 'niagara-addEmitter', 'niagara-setParameter', 'niagara-compile', 'niagara-listSystems'],
  },
  {
    name: 'audio',
    description: 'Audio import, Sound Cues, MetaSounds, and attenuation',
    tools: ['audio-import', 'audio-createCue', 'audio-getInfo', 'audio-setAttenuation', 'audio-createMetaSound', 'audio-listAssets'],
  },
  {
    name: 'landscape',
    description: 'Landscape creation, heightmap import/export, and material assignment',
    tools: ['landscape-create', 'landscape-importHeightmap', 'landscape-exportHeightmap', 'landscape-getInfo', 'landscape-setMaterial'],
  },
  {
    name: 'physics',
    description: 'Physics Assets, collision profiles, physical materials, and constraints',
    tools: ['physics-createAsset', 'physics-getInfo', 'physics-setProfile', 'physics-createMaterial', 'physics-setConstraint'],
  },
  {
    name: 'worldpartition',
    description: 'World Partition configuration, data layers, and HLOD',
    tools: ['worldpartition-getInfo', 'worldpartition-setConfig', 'worldpartition-createDataLayer', 'worldpartition-createHLOD'],
  },
  {
    name: 'foliage',
    description: 'Foliage type creation and placement property management',
    tools: ['foliage-createType', 'foliage-getInfo', 'foliage-setProperties'],
  },
  {
    name: 'curve',
    description: 'Curve asset creation and keyframe management',
    tools: ['curve-create', 'curve-setKeys', 'curve-getInfo'],
  },
  {
    name: 'pcg',
    description: 'Procedural Content Generation graph creation and node management',
    tools: ['pcg-createGraph', 'pcg-getInfo', 'pcg-addNode', 'pcg-connectNodes'],
  },
  {
    name: 'geoscript',
    description: 'GeometryScript mesh boolean and transform operations',
    tools: ['geoscript-meshBoolean', 'geoscript-meshTransform', 'geoscript-getInfo'],
  },
  {
    name: 'workflow',
    description: 'High-level multi-step workflows for common Unreal development tasks',
    tools: ['workflow-createCharacter', 'workflow-createUIScreen', 'workflow-setupLevel', 'workflow-createInteractable', 'workflow-createProjectile', 'workflow-setupMultiplayer', 'workflow-createInventorySystem', 'workflow-createDialogueSystem'],
  },
  {
    name: 'analyze',
    description: 'Static analysis for Blueprint complexity, asset health, performance, and conventions',
    tools: ['analyze-blueprintComplexity', 'analyze-assetHealth', 'analyze-performanceHints', 'analyze-codeConventions'],
  },
  {
    name: 'refactor',
    description: 'Refactoring operations such as cross-project rename chains',
    tools: ['refactor-renameChain'],
  },
];

export function generateManifest(): ToolManifest {
  return {
    version: '5.0.0',
    toolCount: TOOLS.length,
    domainCount: DOMAINS.length,
    tools: TOOLS,
    chains: CHAINS,
    domains: DOMAINS,
  };
}
