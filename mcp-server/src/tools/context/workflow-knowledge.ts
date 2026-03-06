/**
 * Workflow Knowledge Base for Unreal Master Agent.
 * Pre-loaded with common UE developer workflows extracted from Epic's official documentation.
 * Supports dynamic learning of new workflows at runtime.
 *
 * Sources:
 * - https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-workflows-in-unreal-engine
 * - https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-a-character-in-unreal-engine
 * - https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-landscapes-in-unreal-engine
 * - https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-widgets-in-unreal-engine
 * - https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-materials-tutorials
 * - https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-workflow-guides-and-examples-in-unreal-engine
 * - https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-workflow-guides-and-examples-in-unreal-engine
 */

export interface WorkflowStep {
  tool: string;
  purpose: string;
  optional?: boolean;
  repeat?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  domain: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  intentPatterns: string[];
  prerequisites: string[];
  steps: WorkflowStep[];
  expectedOutcome: string;
  source: 'epic-docs' | 'community' | 'user-defined';
  tags: string[];
}

// Pre-loaded workflows from Epic's official documentation
const BUILTIN_WORKFLOWS: Workflow[] = [
  // ── Blueprint Workflows ──
  {
    id: 'bp-create-actor-class',
    name: 'Create a Blueprint Actor Class',
    description:
      'Create a new Blueprint actor with components, convert to reusable class. Based on Epic\'s Blueprint Quick Start Guide: construct an actor in the level with components, then convert it into a Blueprint Class.',
    domain: 'blueprint',
    difficulty: 'beginner',
    intentPatterns: [
      'create a blueprint actor',
      'make a new blueprint class',
      'create a reusable actor',
      'create blueprint from actor',
      'make a launchpad',
      'new gameplay actor',
    ],
    prerequisites: ['An open UE project with a level'],
    steps: [
      { tool: 'actor-spawn', purpose: 'Spawn an Empty Actor in the level as container' },
      { tool: 'actor-addComponent', purpose: 'Add a shape component (cube/sphere) for visual representation', repeat: true },
      { tool: 'actor-addComponent', purpose: 'Add a collision/trigger component (BoxCollision) for overlap events' },
      { tool: 'actor-setProperty', purpose: 'Configure component properties (size, collision presets)' },
      { tool: 'asset-create', purpose: 'Convert the actor to a Blueprint Class via asset creation' },
      { tool: 'blueprint-serialize', purpose: 'Read the Blueprint graph to verify structure' },
    ],
    expectedOutcome: 'A reusable Blueprint Class that can be dragged into any level from the Content Browser',
    source: 'epic-docs',
    tags: ['blueprint', 'actor', 'beginner', 'quick-start'],
  },
  {
    id: 'bp-add-gameplay-logic',
    name: 'Add Gameplay Logic to a Blueprint',
    description:
      'Wire up event-driven gameplay logic in a Blueprint Event Graph: handle BeginPlay, Tick, overlap events, and custom functions.',
    domain: 'blueprint',
    difficulty: 'beginner',
    intentPatterns: [
      'add logic to blueprint',
      'wire up blueprint events',
      'add beginplay logic',
      'handle overlap event',
      'add gameplay behavior',
      'make blueprint do something',
      'blueprint event graph',
    ],
    prerequisites: ['An existing Blueprint actor'],
    steps: [
      { tool: 'blueprint-serialize', purpose: 'Read current graph state to understand existing nodes' },
      { tool: 'blueprint-createNode', purpose: 'Add event node (BeginPlay, ActorBeginOverlap, Tick)' },
      { tool: 'blueprint-createNode', purpose: 'Add action nodes (PrintString, SetActorLocation, LaunchCharacter)', repeat: true },
      { tool: 'blueprint-connectPins', purpose: 'Connect execution pins from event to action chain', repeat: true },
      { tool: 'blueprint-modifyProperty', purpose: 'Set default values on nodes (messages, vectors, floats)', repeat: true },
      { tool: 'blueprint-serialize', purpose: 'Verify final graph wiring' },
    ],
    expectedOutcome: 'Blueprint with working event-driven gameplay logic',
    source: 'epic-docs',
    tags: ['blueprint', 'logic', 'events', 'gameplay'],
  },
  {
    id: 'bp-create-function',
    name: 'Create a Blueprint Function',
    description:
      'Create a reusable function in a Blueprint with inputs, outputs, and local variables. Functions help organize complex logic into maintainable units.',
    domain: 'blueprint',
    difficulty: 'intermediate',
    intentPatterns: [
      'create blueprint function',
      'add a function to blueprint',
      'make reusable blueprint logic',
      'refactor blueprint into function',
      'blueprint function with parameters',
    ],
    prerequisites: ['An existing Blueprint actor'],
    steps: [
      { tool: 'blueprint-serialize', purpose: 'Read current Blueprint to understand existing structure' },
      { tool: 'blueprint-createNode', purpose: 'Create a new custom function graph' },
      { tool: 'blueprint-createNode', purpose: 'Add input/output parameter nodes to the function', repeat: true },
      { tool: 'blueprint-createNode', purpose: 'Add logic nodes inside the function body', repeat: true },
      { tool: 'blueprint-connectPins', purpose: 'Wire function internals together', repeat: true },
      { tool: 'blueprint-createNode', purpose: 'Add function call node in the Event Graph' },
      { tool: 'blueprint-connectPins', purpose: 'Connect function call to the event chain' },
    ],
    expectedOutcome: 'A reusable Blueprint function callable from the Event Graph or other Blueprints',
    source: 'epic-docs',
    tags: ['blueprint', 'function', 'refactor', 'organization'],
  },

  // ── Character Setup Workflow ──
  {
    id: 'char-setup-playable',
    name: 'Set Up a Playable Character',
    description:
      'Full character setup workflow from Epic\'s official guide: import skeletal mesh, create Animation Blueprint, set up PlayerController with input, create Character Blueprint, and configure GameMode. The primary workflow for character setup in Unreal Engine.',
    domain: 'character',
    difficulty: 'intermediate',
    intentPatterns: [
      'create a character',
      'set up player character',
      'make a playable character',
      'character setup',
      'new player pawn',
      'setup character movement',
      'third person character',
      'first person character',
    ],
    prerequisites: [
      'Skeletal mesh asset (imported or from starter content)',
      'Animation sequences for the character',
    ],
    steps: [
      { tool: 'asset-import', purpose: 'Import skeletal mesh and animations from DCC (FBX)', optional: true },
      { tool: 'anim-getSkeletonInfo', purpose: 'Verify skeleton asset and bone hierarchy' },
      { tool: 'asset-create', purpose: 'Create the Character Blueprint (parent: ACharacter)' },
      { tool: 'actor-addComponent', purpose: 'Add SkeletalMeshComponent and assign mesh' },
      { tool: 'actor-addComponent', purpose: 'Add CameraComponent and SpringArmComponent' },
      { tool: 'actor-setProperty', purpose: 'Configure camera offset, arm length, movement settings' },
      { tool: 'asset-create', purpose: 'Create Animation Blueprint for the character' },
      { tool: 'gameplay-addInputAction', purpose: 'Register movement input actions (MoveForward, MoveRight, Jump, Look)', repeat: true },
      { tool: 'blueprint-createNode', purpose: 'Add input handling nodes to Character BP' },
      { tool: 'blueprint-connectPins', purpose: 'Wire input events to AddMovementInput / AddControllerYawInput' },
      { tool: 'gameplay-setGameMode', purpose: 'Set GameMode to use this character as default pawn' },
    ],
    expectedOutcome: 'A fully playable character with movement, camera, animation, and input handling',
    source: 'epic-docs',
    tags: ['character', 'player', 'input', 'animation', 'camera', 'movement'],
  },
  {
    id: 'char-setup-ai',
    name: 'Set Up an AI Character',
    description:
      'Create an AI-controlled character with behavior tree, blackboard, and navigation. The AI character patrols, detects the player, and reacts.',
    domain: 'character',
    difficulty: 'advanced',
    intentPatterns: [
      'create ai character',
      'make an enemy',
      'ai patrol character',
      'npc with behavior tree',
      'ai controlled pawn',
      'create bot',
    ],
    prerequisites: [
      'A skeletal mesh for the AI character',
      'Nav Mesh Bounds Volume in the level',
    ],
    steps: [
      { tool: 'asset-create', purpose: 'Create AI Character Blueprint (parent: ACharacter)' },
      { tool: 'actor-addComponent', purpose: 'Add SkeletalMeshComponent and assign mesh' },
      { tool: 'ai-createBlackboard', purpose: 'Create Blackboard asset with AI perception keys' },
      { tool: 'ai-addBBKey', purpose: 'Add keys: TargetActor (Object), PatrolLocation (Vector), HasLineOfSight (Bool)', repeat: true },
      { tool: 'ai-createBehaviorTree', purpose: 'Create Behavior Tree asset for AI decision-making' },
      { tool: 'ai-addBTNode', purpose: 'Add selector/sequence nodes for patrol and chase behaviors', repeat: true },
      { tool: 'ai-getNavMesh', purpose: 'Verify NavMesh coverage for AI pathfinding' },
      { tool: 'asset-create', purpose: 'Create AI Controller Blueprint' },
      { tool: 'blueprint-createNode', purpose: 'Add RunBehaviorTree node to AI Controller' },
    ],
    expectedOutcome: 'An AI character that patrols waypoints, detects the player, and chases them',
    source: 'epic-docs',
    tags: ['ai', 'character', 'behavior-tree', 'blackboard', 'navigation', 'enemy'],
  },

  // ── Material Workflows ──
  {
    id: 'mat-create-basic',
    name: 'Create a Basic PBR Material',
    description:
      'Create a standard physically-based material following Epic\'s Material creation workflow: create Material asset, open Material Editor, add texture expressions, connect to material inputs, compile and apply.',
    domain: 'material',
    difficulty: 'beginner',
    intentPatterns: [
      'create a material',
      'make a new material',
      'basic pbr material',
      'assign textures to material',
      'create material for mesh',
    ],
    prerequisites: ['Texture assets (BaseColor, Normal, ORM) imported into Content Browser'],
    steps: [
      { tool: 'material-create', purpose: 'Create new Material asset with M_ prefix' },
      { tool: 'material-setTexture', purpose: 'Assign BaseColor texture to Base Color input' },
      { tool: 'material-setTexture', purpose: 'Assign Normal map to Normal input' },
      { tool: 'material-setTexture', purpose: 'Assign ORM (Occlusion/Roughness/Metallic) packed texture' },
      { tool: 'material-setParameter', purpose: 'Adjust scalar parameters (roughness multiplier, metallic override)', optional: true },
    ],
    expectedOutcome: 'A compiled PBR material ready to apply to meshes',
    source: 'epic-docs',
    tags: ['material', 'pbr', 'texture', 'beginner'],
  },
  {
    id: 'mat-create-instance',
    name: 'Create Material Instances for Variations',
    description:
      'Create Material Instances from a parent Material to produce multiple variations efficiently. Material Instances allow artists to quickly customize Materials without recompiling shaders.',
    domain: 'material',
    difficulty: 'intermediate',
    intentPatterns: [
      'create material instance',
      'material variation',
      'different color material',
      'reuse material with changes',
      'parameterized material',
    ],
    prerequisites: ['A parent Material with exposed parameters'],
    steps: [
      { tool: 'material-getParameters', purpose: 'List exposed parameters on the parent material' },
      { tool: 'material-createInstance', purpose: 'Create Material Instance from the parent Material' },
      { tool: 'material-setParameter', purpose: 'Override scalar/vector parameters for this variation', repeat: true },
      { tool: 'material-setTexture', purpose: 'Override texture parameters if needed', optional: true },
    ],
    expectedOutcome: 'Material Instance with customized parameters, sharing the parent shader for performance',
    source: 'epic-docs',
    tags: ['material', 'instance', 'variation', 'optimization'],
  },
  {
    id: 'mat-dynamic-runtime',
    name: 'Create Dynamic Material for Runtime Changes',
    description:
      'Set up a dynamic material instance that can change properties at runtime (e.g., color change on damage, dissolve effect, highlight on hover).',
    domain: 'material',
    difficulty: 'advanced',
    intentPatterns: [
      'dynamic material',
      'change material at runtime',
      'material color change',
      'dissolve effect',
      'highlight material on hover',
      'runtime material parameter',
    ],
    prerequisites: ['A Material with exposed parameters', 'A Blueprint actor with a mesh component'],
    steps: [
      { tool: 'material-create', purpose: 'Create base material with exposed scalar/vector parameters' },
      { tool: 'material-setParameter', purpose: 'Define parameters: EmissiveColor (Vector), DissolveAmount (Scalar)' },
      { tool: 'material-createInstance', purpose: 'Create Material Instance for the mesh' },
      { tool: 'blueprint-createNode', purpose: 'Add CreateDynamicMaterialInstance node in Blueprint' },
      { tool: 'blueprint-createNode', purpose: 'Add SetScalarParameterValue / SetVectorParameterValue nodes' },
      { tool: 'blueprint-connectPins', purpose: 'Wire event (Tick/Timer/Overlap) to parameter update logic' },
    ],
    expectedOutcome: 'Material that responds to gameplay events by changing visual properties in real time',
    source: 'epic-docs',
    tags: ['material', 'dynamic', 'runtime', 'blueprint', 'effect'],
  },

  // ── Level Design Workflows ──
  {
    id: 'level-create-playable',
    name: 'Create a Playable Level',
    description:
      'Set up a new level with essential actors for gameplay: PlayerStart, lighting, sky atmosphere, and post-process volume.',
    domain: 'level',
    difficulty: 'beginner',
    intentPatterns: [
      'create a new level',
      'set up a level',
      'make a playable map',
      'new game level',
      'empty level setup',
    ],
    prerequisites: ['An open UE project'],
    steps: [
      { tool: 'level-create', purpose: 'Create a new empty level' },
      { tool: 'actor-spawn', purpose: 'Spawn PlayerStart to define spawn location' },
      { tool: 'actor-spawn', purpose: 'Spawn DirectionalLight as sun for primary lighting' },
      { tool: 'actor-spawn', purpose: 'Spawn SkyAtmosphere for realistic sky' },
      { tool: 'actor-spawn', purpose: 'Spawn ExponentialHeightFog for atmosphere', optional: true },
      { tool: 'actor-spawn', purpose: 'Spawn PostProcessVolume for visual quality (set Infinite Extent)', optional: true },
      { tool: 'actor-setProperty', purpose: 'Configure light intensity, color temperature, fog density' },
      { tool: 'level-save', purpose: 'Save the level' },
    ],
    expectedOutcome: 'A playable level with proper lighting, sky, and player spawn',
    source: 'epic-docs',
    tags: ['level', 'lighting', 'sky', 'beginner', 'setup'],
  },
  {
    id: 'level-landscape-outdoor',
    name: 'Create an Outdoor Landscape Level',
    description:
      'Create a landscape-based outdoor level following Epic\'s Landscape Quick Start: create landscape, sculpt terrain, create landscape material with layers, and paint materials.',
    domain: 'level',
    difficulty: 'intermediate',
    intentPatterns: [
      'create a landscape',
      'outdoor terrain',
      'make terrain',
      'landscape level',
      'sculpt terrain',
      'open world terrain',
      'paint landscape materials',
    ],
    prerequisites: ['Landscape material textures (grass, rock, dirt)'],
    steps: [
      { tool: 'level-create', purpose: 'Create new level for landscape' },
      { tool: 'landscape-create', purpose: 'Create landscape actor with specified resolution and size' },
      { tool: 'landscape-importHeightmap', purpose: 'Import heightmap for terrain shape', optional: true },
      { tool: 'material-create', purpose: 'Create landscape material with layer blend node' },
      { tool: 'material-setTexture', purpose: 'Add layer textures (grass, rock, dirt) to landscape material', repeat: true },
      { tool: 'landscape-setMaterial', purpose: 'Apply the landscape material' },
      { tool: 'landscape-getLayers', purpose: 'Verify paint layers are available' },
      { tool: 'landscape-sculptLayer', purpose: 'Paint material layers onto the landscape', repeat: true },
      { tool: 'actor-spawn', purpose: 'Add lighting and sky actors' },
    ],
    expectedOutcome: 'An outdoor landscape level with sculpted terrain and painted material layers',
    source: 'epic-docs',
    tags: ['landscape', 'terrain', 'outdoor', 'sculpt', 'paint'],
  },

  // ── UI/Widget Workflows ──
  {
    id: 'ui-create-hud',
    name: 'Create a HUD Widget',
    description:
      'Create a heads-up display widget showing health, ammo, score, etc. Following Epic\'s UMG workflow: create Widget Blueprint, add UI elements, bind to gameplay data, display via CreateWidget + AddToViewport.',
    domain: 'widget',
    difficulty: 'beginner',
    intentPatterns: [
      'create a hud',
      'health bar ui',
      'score display',
      'ammo counter',
      'create widget',
      'make ui overlay',
      'heads up display',
    ],
    prerequisites: ['A Player Controller or Character Blueprint'],
    steps: [
      { tool: 'widget-createWidget', purpose: 'Create Widget Blueprint (WBP_ prefix) for HUD' },
      { tool: 'widget-addChild', purpose: 'Add CanvasPanel as root container' },
      { tool: 'widget-addChild', purpose: 'Add ProgressBar for health display' },
      { tool: 'widget-addChild', purpose: 'Add TextBlock for score/ammo count', repeat: true },
      { tool: 'widget-setProperty', purpose: 'Set anchors, position, size, styling for each element', repeat: true },
      { tool: 'widget-bindEvent', purpose: 'Bind ProgressBar percent to health variable' },
      { tool: 'blueprint-createNode', purpose: 'Add CreateWidget node in Player Controller BeginPlay' },
      { tool: 'blueprint-createNode', purpose: 'Add AddToViewport node to display the HUD' },
      { tool: 'blueprint-connectPins', purpose: 'Wire BeginPlay → CreateWidget → AddToViewport' },
    ],
    expectedOutcome: 'A HUD widget displaying gameplay data, visible during play',
    source: 'epic-docs',
    tags: ['ui', 'widget', 'hud', 'health', 'score', 'umg'],
  },
  {
    id: 'ui-create-menu',
    name: 'Create an Interactive Menu Screen',
    description:
      'Create a menu screen (main menu, pause menu) with buttons, navigation, and input mode switching. Based on Epic\'s Common UI guide.',
    domain: 'widget',
    difficulty: 'intermediate',
    intentPatterns: [
      'create main menu',
      'pause menu',
      'menu screen',
      'start screen',
      'menu with buttons',
      'interactive menu',
    ],
    prerequisites: ['A Level Blueprint or GameMode'],
    steps: [
      { tool: 'widget-createWidget', purpose: 'Create Widget Blueprint for the menu' },
      { tool: 'widget-addChild', purpose: 'Add CanvasPanel with background image' },
      { tool: 'widget-addChild', purpose: 'Add Button widgets for menu options (Play, Settings, Quit)', repeat: true },
      { tool: 'widget-addChild', purpose: 'Add TextBlock labels for each button', repeat: true },
      { tool: 'widget-setProperty', purpose: 'Configure button styles, hover effects, anchoring', repeat: true },
      { tool: 'widget-bindEvent', purpose: 'Bind button OnClicked events to menu actions', repeat: true },
      { tool: 'blueprint-createNode', purpose: 'Add SetInputModeUIOnly node for mouse cursor control' },
      { tool: 'blueprint-createNode', purpose: 'Add OpenLevel / RemoveFromParent / QuitGame nodes for button actions' },
      { tool: 'blueprint-connectPins', purpose: 'Wire button events to corresponding actions', repeat: true },
    ],
    expectedOutcome: 'A fully interactive menu with working button navigation',
    source: 'epic-docs',
    tags: ['ui', 'menu', 'buttons', 'navigation', 'input-mode'],
  },

  // ── Animation Workflows ──
  {
    id: 'anim-setup-blueprint',
    name: 'Set Up an Animation Blueprint',
    description:
      'Create an Animation Blueprint with state machine for idle, walk, run, and jump states. The Animation Blueprint controls which animations play based on character movement.',
    domain: 'animation',
    difficulty: 'intermediate',
    intentPatterns: [
      'create animation blueprint',
      'animation state machine',
      'character animation setup',
      'idle walk run animations',
      'blend animations',
      'animation bp',
    ],
    prerequisites: [
      'A Skeleton asset with animation sequences (Idle, Walk, Run, Jump)',
    ],
    steps: [
      { tool: 'anim-getSkeletonInfo', purpose: 'Verify skeleton and available animations' },
      { tool: 'anim-listSequences', purpose: 'List available animation sequences for this skeleton' },
      { tool: 'asset-create', purpose: 'Create Animation Blueprint for the skeleton' },
      { tool: 'blueprint-createNode', purpose: 'Add State Machine node in AnimGraph' },
      { tool: 'blueprint-createNode', purpose: 'Add states: Idle, Walk, Run, Jump', repeat: true },
      { tool: 'blueprint-createNode', purpose: 'Add transition rules between states based on speed/jumping', repeat: true },
      { tool: 'blueprint-connectPins', purpose: 'Wire state machine to final animation pose output' },
    ],
    expectedOutcome: 'Animation Blueprint with working state machine driving character animations',
    source: 'epic-docs',
    tags: ['animation', 'state-machine', 'character', 'blend'],
  },
  {
    id: 'anim-create-montage',
    name: 'Create and Play an Animation Montage',
    description:
      'Create a montage for one-shot animations (attack, reload, emote) that can be triggered from gameplay code or Blueprints.',
    domain: 'animation',
    difficulty: 'intermediate',
    intentPatterns: [
      'create animation montage',
      'play attack animation',
      'one-shot animation',
      'reload animation',
      'emote animation',
      'trigger animation from blueprint',
    ],
    prerequisites: ['An animation sequence to use in the montage'],
    steps: [
      { tool: 'anim-createMontage', purpose: 'Create AnimMontage asset from an animation sequence' },
      { tool: 'blueprint-createNode', purpose: 'Add PlayMontage node in character Blueprint' },
      { tool: 'blueprint-createNode', purpose: 'Add input event (key press, overlap) to trigger montage' },
      { tool: 'blueprint-connectPins', purpose: 'Wire input → PlayMontage with montage reference' },
    ],
    expectedOutcome: 'A montage that plays on demand, with proper blending in and out of locomotion',
    source: 'epic-docs',
    tags: ['animation', 'montage', 'attack', 'one-shot'],
  },

  // ── Sequencer/Cinematic Workflows ──
  {
    id: 'seq-create-cutscene',
    name: 'Create a Cinematic Cutscene',
    description:
      'Create a cinematic sequence with camera shots, actor animations, and audio. Following Epic\'s Cinematic Workflow Guide.',
    domain: 'sequencer',
    difficulty: 'intermediate',
    intentPatterns: [
      'create a cutscene',
      'cinematic sequence',
      'camera animation',
      'in-game movie',
      'story sequence',
      'intro cutscene',
    ],
    prerequisites: ['Actors and cameras placed in the level'],
    steps: [
      { tool: 'sequencer-createSequence', purpose: 'Create a new Level Sequence asset' },
      { tool: 'sequencer-addTrack', purpose: 'Add Camera Cut track for shot management' },
      { tool: 'actor-spawn', purpose: 'Spawn CineCamera actors for each shot', repeat: true },
      { tool: 'sequencer-addTrack', purpose: 'Add actor tracks for animated characters/objects', repeat: true },
      { tool: 'sequencer-setKeyframe', purpose: 'Set keyframes for camera position, rotation, focal length', repeat: true },
      { tool: 'sequencer-setKeyframe', purpose: 'Set keyframes for actor transforms and properties', repeat: true },
      { tool: 'sequencer-getSequenceInfo', purpose: 'Verify sequence structure and timing' },
      { tool: 'sequencer-renderMovie', purpose: 'Preview render the cutscene', optional: true },
    ],
    expectedOutcome: 'A playable cinematic sequence with camera cuts and animated actors',
    source: 'epic-docs',
    tags: ['sequencer', 'cinematic', 'cutscene', 'camera', 'animation'],
  },

  // ── Asset Pipeline Workflows ──
  {
    id: 'asset-import-mesh',
    name: 'Import and Configure a 3D Mesh',
    description:
      'Import a static mesh from FBX, set up materials, configure LODs, and generate collision for game use.',
    domain: 'asset',
    difficulty: 'beginner',
    intentPatterns: [
      'import a mesh',
      'import fbx',
      'add 3d model',
      'import static mesh',
      'bring in asset from blender',
      'import from maya',
    ],
    prerequisites: ['A mesh file (FBX, OBJ) on disk'],
    steps: [
      { tool: 'asset-import', purpose: 'Import mesh file into Content Browser' },
      { tool: 'mesh-getInfo', purpose: 'Verify mesh geometry, vertex count, bounds' },
      { tool: 'mesh-setMaterial', purpose: 'Assign material to mesh material slots', repeat: true },
      { tool: 'mesh-setLOD', purpose: 'Configure LOD levels for performance', optional: true },
      { tool: 'mesh-generateCollision', purpose: 'Generate collision geometry (simple or complex)' },
    ],
    expectedOutcome: 'A game-ready static mesh with materials, LODs, and collision',
    source: 'epic-docs',
    tags: ['asset', 'mesh', 'import', 'fbx', 'collision', 'lod'],
  },
  {
    id: 'asset-import-texture-pipeline',
    name: 'Import and Configure Textures',
    description:
      'Import texture files, set compression settings appropriate for usage (diffuse, normal, mask), and verify quality.',
    domain: 'asset',
    difficulty: 'beginner',
    intentPatterns: [
      'import textures',
      'add texture to project',
      'import normal map',
      'texture compression settings',
      'import image as texture',
    ],
    prerequisites: ['Texture files (PNG, TGA, EXR) on disk'],
    steps: [
      { tool: 'texture-import', purpose: 'Import texture file into Content Browser' },
      { tool: 'texture-setCompression', purpose: 'Set compression: BC1 for diffuse, BC5 for normal, BC7 for quality' },
      { tool: 'texture-getInfo', purpose: 'Verify resolution, format, and compression results' },
    ],
    expectedOutcome: 'Properly compressed textures ready for material use',
    source: 'epic-docs',
    tags: ['texture', 'import', 'compression', 'normal-map'],
  },

  // ── Niagara VFX Workflows ──
  {
    id: 'vfx-create-particle-system',
    name: 'Create a Niagara Particle Effect',
    description:
      'Create a Niagara particle system for fire, smoke, sparks, or other VFX. Set up emitter with spawn rate, lifetime, velocity, and rendering.',
    domain: 'niagara',
    difficulty: 'intermediate',
    intentPatterns: [
      'create particle effect',
      'make fire effect',
      'add smoke',
      'spark particles',
      'niagara vfx',
      'create explosion effect',
      'particle system',
    ],
    prerequisites: [],
    steps: [
      { tool: 'niagara-createSystem', purpose: 'Create a new Niagara System asset' },
      { tool: 'niagara-addEmitter', purpose: 'Add an emitter (Fountain, Directional Burst, etc.)' },
      { tool: 'niagara-setParameter', purpose: 'Set spawn rate, particle lifetime, initial velocity', repeat: true },
      { tool: 'niagara-setParameter', purpose: 'Configure size, color, and opacity over lifetime', repeat: true },
      { tool: 'niagara-getSystemInfo', purpose: 'Verify system configuration and performance' },
      { tool: 'actor-spawn', purpose: 'Spawn the Niagara system in the level to preview' },
    ],
    expectedOutcome: 'A Niagara particle system with configured visual properties',
    source: 'epic-docs',
    tags: ['niagara', 'vfx', 'particles', 'fire', 'smoke', 'effect'],
  },

  // ── Audio Workflows ──
  {
    id: 'audio-setup-sound',
    name: 'Import and Configure Sound Effects',
    description:
      'Import audio files, create sound cues with attenuation for spatial audio, and place in the level.',
    domain: 'audio',
    difficulty: 'beginner',
    intentPatterns: [
      'add sound effect',
      'import audio',
      'spatial audio',
      'sound attenuation',
      'ambient sound',
      'footstep sound',
      'background music',
    ],
    prerequisites: ['Audio files (WAV, OGG) on disk'],
    steps: [
      { tool: 'audio-import', purpose: 'Import audio file into Content Browser' },
      { tool: 'audio-getInfo', purpose: 'Verify audio properties (duration, sample rate, channels)' },
      { tool: 'audio-createSoundCue', purpose: 'Create Sound Cue for layering and randomization', optional: true },
      { tool: 'audio-setAttenuation', purpose: 'Configure distance attenuation for spatial audio' },
      { tool: 'actor-spawn', purpose: 'Place AmbientSound actor in the level' },
      { tool: 'actor-setProperty', purpose: 'Assign the sound asset to the AmbientSound actor' },
    ],
    expectedOutcome: 'Spatial audio playing in the level with proper attenuation',
    source: 'epic-docs',
    tags: ['audio', 'sound', 'attenuation', 'spatial', 'ambient'],
  },

  // ── Physics Workflows ──
  {
    id: 'physics-setup-destructible',
    name: 'Set Up Physics-Enabled Object',
    description:
      'Configure a mesh for physics simulation: set mobility to Movable, enable physics, configure collision, and set up physics materials.',
    domain: 'physics',
    difficulty: 'intermediate',
    intentPatterns: [
      'enable physics on object',
      'make object fall',
      'physics simulation',
      'destructible mesh',
      'ragdoll physics',
      'physics asset setup',
    ],
    prerequisites: ['A StaticMesh or SkeletalMesh actor in the level'],
    steps: [
      { tool: 'actor-setProperty', purpose: 'Set mobility to Movable for physics simulation' },
      { tool: 'physics-createAsset', purpose: 'Create Physics Asset for collision bodies' },
      { tool: 'physics-setProfile', purpose: 'Set collision profile (BlockAll, PhysicsActor, Ragdoll)' },
      { tool: 'physics-addConstraint', purpose: 'Add constraints between physics bodies if needed', optional: true },
      { tool: 'actor-setProperty', purpose: 'Enable Simulate Physics on the mesh component' },
      { tool: 'physics-getInfo', purpose: 'Verify physics configuration' },
    ],
    expectedOutcome: 'A physics-enabled object that simulates gravity, collision, and forces at runtime',
    source: 'epic-docs',
    tags: ['physics', 'simulation', 'collision', 'ragdoll'],
  },

  // ── World Building Workflows ──
  {
    id: 'world-populate-foliage',
    name: 'Populate Level with Foliage',
    description:
      'Add foliage to a landscape using the Foliage tool: define foliage types, set density and distribution, and paint onto terrain.',
    domain: 'foliage',
    difficulty: 'intermediate',
    intentPatterns: [
      'add trees and grass',
      'paint foliage',
      'populate with vegetation',
      'foliage density',
      'scatter meshes',
      'add grass to landscape',
    ],
    prerequisites: ['A landscape or terrain in the level', 'Foliage mesh assets (trees, grass, rocks)'],
    steps: [
      { tool: 'foliage-addType', purpose: 'Register foliage types (tree, grass, rock meshes)' },
      { tool: 'foliage-setProperties', purpose: 'Configure scale range, alignment, collision', repeat: true },
      { tool: 'foliage-setDensity', purpose: 'Set density per foliage type for natural distribution' },
      { tool: 'foliage-getTypes', purpose: 'Verify all foliage types are configured correctly' },
    ],
    expectedOutcome: 'A naturally populated landscape with varied foliage distribution',
    source: 'epic-docs',
    tags: ['foliage', 'vegetation', 'landscape', 'trees', 'grass'],
  },
];

// Runtime-learned workflows — initialized from persistent store, then kept in sync
import {
  loadLearnedWorkflows,
  saveLearnedWorkflows,
  appendLearnedWorkflow as persistWorkflow,
  removeLearnedWorkflow as unpersistWorkflow,
} from './workflow-store.js';

let learnedWorkflows: Workflow[] = [];
let initialized = false;

function ensureLoaded(): void {
  if (!initialized) {
    try {
      learnedWorkflows = loadLearnedWorkflows();
    } catch {
      learnedWorkflows = [];
    }
    initialized = true;
  }
}

export function getAllWorkflows(): Workflow[] {
  ensureLoaded();
  return [...BUILTIN_WORKFLOWS, ...learnedWorkflows];
}

export function getWorkflowById(id: string): Workflow | undefined {
  return getAllWorkflows().find((w) => w.id === id);
}

export function getWorkflowsByDomain(domain: string): Workflow[] {
  return getAllWorkflows().filter((w) => w.domain === domain);
}

export function getWorkflowsByTag(tag: string): Workflow[] {
  return getAllWorkflows().filter((w) => w.tags.includes(tag));
}

export function addLearnedWorkflow(workflow: Workflow): void {
  ensureLoaded();
  // Replace if same id exists
  learnedWorkflows = learnedWorkflows.filter((w) => w.id !== workflow.id);
  learnedWorkflows.push(workflow);
  // Persist to disk
  persistWorkflow(workflow);
}

export function removeWorkflow(id: string): boolean {
  ensureLoaded();
  const before = learnedWorkflows.length;
  learnedWorkflows = learnedWorkflows.filter((w) => w.id !== id);
  if (learnedWorkflows.length === before) return false;
  unpersistWorkflow(id);
  return true;
}

export function getLearnedWorkflows(): Workflow[] {
  ensureLoaded();
  return [...learnedWorkflows];
}

export function clearLearnedWorkflows(): void {
  learnedWorkflows = [];
  saveLearnedWorkflows([]);
}

export function getBuiltinWorkflowCount(): number {
  return BUILTIN_WORKFLOWS.length;
}
