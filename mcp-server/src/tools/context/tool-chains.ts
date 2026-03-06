export interface ToolChainStep {
  tool: string;
  purpose: string;
  repeat?: boolean;
}

export interface ToolChain {
  name: string;
  description: string;
  steps: ToolChainStep[];
}

export const TOOL_CHAINS: Record<string, ToolChain> = {
  'add-blueprint-logic': {
    name: 'add-blueprint-logic',
    description: 'Add logic to an existing Blueprint by creating and connecting nodes',
    steps: [
      { tool: 'blueprint-serialize', purpose: 'Read current Blueprint graph state' },
      { tool: 'blueprint-createNode', purpose: 'Add required nodes to the graph', repeat: true },
      { tool: 'blueprint-connectPins', purpose: 'Wire nodes together', repeat: true },
      { tool: 'blueprint-serialize', purpose: 'Verify final graph state after edits' },
    ],
  },

  'create-material-from-textures': {
    name: 'create-material-from-textures',
    description: 'Create a PBR material and assign BaseColor, Normal, and ORM textures',
    steps: [
      { tool: 'material-create', purpose: 'Create new material asset' },
      { tool: 'material-setTexture', purpose: 'Assign BaseColor texture to Base Color input' },
      { tool: 'material-setTexture', purpose: 'Assign Normal texture to Normal input' },
      { tool: 'material-setTexture', purpose: 'Assign ORM texture to Occlusion/Roughness/Metallic inputs' },
      { tool: 'material-setParameter', purpose: 'Configure additional scalar/vector parameters' },
    ],
  },

  'setup-character-from-scratch': {
    name: 'setup-character-from-scratch',
    description: 'Create a full playable character with skeletal mesh, animation Blueprint, and input actions',
    steps: [
      { tool: 'asset-create', purpose: 'Create the Character Blueprint asset' },
      { tool: 'actor-addComponent', purpose: 'Add Skeletal Mesh component to the character' },
      { tool: 'actor-setProperty', purpose: 'Assign the skeletal mesh and configure component properties' },
      { tool: 'asset-create', purpose: 'Create the Animation Blueprint for the character' },
      { tool: 'gameplay-addInputAction', purpose: 'Register movement and action input actions' },
      { tool: 'blueprint-createNode', purpose: 'Add input handling and movement nodes to character BP' },
      { tool: 'blueprint-connectPins', purpose: 'Connect input events to movement logic' },
    ],
  },

  'create-ui-screen': {
    name: 'create-ui-screen',
    description: 'Create a UMG widget screen with interactive elements and data bindings',
    steps: [
      { tool: 'widget-create', purpose: 'Create the Widget Blueprint asset' },
      { tool: 'widget-addElement', purpose: 'Add UI elements (buttons, text, images) to the canvas', repeat: true },
      { tool: 'widget-setProperty', purpose: 'Configure layout, styling, and anchoring for each element', repeat: true },
      { tool: 'widget-getBindings', purpose: 'Retrieve and verify data bindings for dynamic properties' },
    ],
  },

  'level-setup-basic': {
    name: 'level-setup-basic',
    description: 'Create a playable level with essential actors: PlayerStart, lighting, and sky',
    steps: [
      { tool: 'level-create', purpose: 'Create a new empty level' },
      { tool: 'actor-spawn', purpose: 'Spawn PlayerStart actor to define player spawn location' },
      { tool: 'actor-spawn', purpose: 'Spawn DirectionalLight for primary scene lighting' },
      { tool: 'actor-spawn', purpose: 'Spawn SkyAtmosphere for realistic sky rendering' },
      { tool: 'build-lightmaps', purpose: 'Build static lighting for the level' },
    ],
  },

  'debug-performance-audit': {
    name: 'debug-performance-audit',
    description: 'Run a full performance audit to identify bottlenecks and problematic assets',
    steps: [
      { tool: 'analyze-performanceHints', purpose: 'Get high-level performance recommendations' },
      { tool: 'debug-getPerformance', purpose: 'Collect runtime performance metrics (GPU/CPU timings)' },
      { tool: 'debug-getLog', purpose: 'Check output log for performance warnings and errors' },
      { tool: 'analyze-assetHealth', purpose: 'Audit asset quality and identify problematic content' },
    ],
  },

  'asset-health-audit': {
    name: 'asset-health-audit',
    description: 'Audit project assets for health issues, broken references, and convention violations',
    steps: [
      { tool: 'analyze-assetHealth', purpose: 'Identify assets with health or quality issues' },
      { tool: 'content-findAssets', purpose: 'Locate assets matching search criteria for review' },
      { tool: 'asset-getReferences', purpose: 'Check asset references for broken or missing dependencies' },
      { tool: 'analyze-codeConventions', purpose: 'Verify assets follow project naming and structure conventions' },
    ],
  },

  'multiplayer-setup': {
    name: 'multiplayer-setup',
    description: 'Configure a project for multiplayer with replication and game mode setup',
    steps: [
      { tool: 'workflow-setupMultiplayer', purpose: 'Run multiplayer configuration workflow' },
      { tool: 'gameplay-setGameMode', purpose: 'Set the GameMode for the level or project' },
      { tool: 'gameplay-addInputAction', purpose: 'Add multiplayer-aware input actions' },
    ],
  },

  'create-interactable-object': {
    name: 'create-interactable-object',
    description: 'Create a Blueprint actor with interaction logic wired to player input',
    steps: [
      { tool: 'workflow-createInteractable', purpose: 'Run interactable object creation workflow' },
      { tool: 'blueprint-serialize', purpose: 'Read the generated Blueprint graph' },
      { tool: 'blueprint-createNode', purpose: 'Add custom interaction logic nodes' },
      { tool: 'blueprint-connectPins', purpose: 'Connect interaction event to custom logic' },
    ],
  },

  'import-and-configure-texture': {
    name: 'import-and-configure-texture',
    description: 'Import a texture from disk and configure its compression and settings',
    steps: [
      { tool: 'texture-import', purpose: 'Import texture file into the Content Browser' },
      { tool: 'texture-setCompression', purpose: 'Set the appropriate compression setting (BC1/BC3/BC5/BC7)' },
      { tool: 'texture-getInfo', purpose: 'Verify final texture settings and import results' },
    ],
  },
};

export function getChain(name: string): ToolChain | undefined {
  return TOOL_CHAINS[name];
}

export function listChains(): ToolChain[] {
  return Object.values(TOOL_CHAINS);
}
