# Unreal Master Agent: Full UE Python API Enhancement Plan

## Executive Summary

This plan maps the complete Unreal Engine Python API against the current MCP toolset, identifies all gaps, and defines a phased strategy to achieve **full UE Python API coverage** while making Claude CLI an expert UE development assistant that instantly understands any project.

**Current state**: 73 MCP tools across 21 domains, 60+ Python scripts, solid 4-layer architecture.
**Target state**: ~150+ MCP tools covering 100% of automatable UE Python API surface, plus intelligent project understanding and context-aware assistance.

---

## Part 1: Current Coverage Audit

### Covered Domains (73 tools, 21 categories)

| Domain | Tools | Python Scripts | Coverage |
|--------|-------|---------------|----------|
| Editor Queries | 4 | 0 (C++) | Core queries covered |
| Blueprint Graph | 5 | 0 (C++) | Serialize, CRUD nodes, connect pins |
| Compilation | 4 | 0 (C++) | Live Coding trigger, status, errors, self-heal |
| File Operations | 3 | 3 (C++) | Read, write, search |
| Slate UI | 3 | 0 (RAG) | Templates, generate, validate |
| Chat | 1 | 0 (C++) | Send message |
| Python Execution | 1 | 0 (bridge) | Generic executor |
| Project Context | 6 | 6 | Structure, settings, plugins, deps, classes, snapshot |
| Asset Management | 8 | 8 | Full CRUD, import/export, references, metadata |
| Content Browser | 4 | 4 | List, find, details, validate |
| Actor Management | 9 | 8 | Spawn, delete, transform, properties, components |
| Level Management | 5 | 6 | Create, open, save, sublevel, world settings |
| Materials | 6 | 6 | Create, params, instances, textures, nodes |
| Mesh/Geometry | 4 | 4 | Info, materials, collision, LOD |
| DataTables | 4 | 4 | Create, add/get/remove rows |
| Animation | 5 | 5 | Montages, blend spaces, sequences, skeleton |
| Gameplay | 4 | 4 | Game mode, input actions |
| Source Control | 3 | 3 | Status, checkout, diff |
| Build | 3 | 3 | Lightmaps, map check, cook |
| Debug | 3 | 2 | Console exec, log, performance |
| **Total** | **85** | **66** | |

### Uncovered UE Python API Domains (Gap Analysis)

These are major functional areas of the UE Python API with **zero MCP tool coverage**:

| Domain | UE Python API Classes | Automatable Operations | Developer Impact |
|--------|----------------------|----------------------|-----------------|
| **Sequencer/Cinematics** | LevelSequence, MovieScene, SequencerTools, MovieSceneTrack | Create sequences, add tracks, keyframe, export FBX, camera cuts | HIGH - cinematics workflows |
| **Niagara/VFX** | NiagaraSystem, NiagaraEmitter, NiagaraEditorSubsystem | Create/modify particle systems, compile emitters | MEDIUM - VFX artists |
| **Landscape** | Landscape, LandscapeSubsystem, LandscapeProxy | Import/export heightmaps, paint layers, sculpt | MEDIUM - open world devs |
| **Audio** | SoundWave, SoundCue, MetaSoundSource, AudioComponent | Import audio, create sound cues, configure attenuation | MEDIUM - audio pipeline |
| **Physics** | PhysicsAsset, BodySetup, PhysicalMaterial, Constraints | Create physics assets, configure collision profiles, constraints | MEDIUM - gameplay physics |
| **AI/Navigation** | BehaviorTree, BlackboardData, NavMesh, EnvQuery | Create BTs, blackboards, configure nav mesh, EQS | HIGH - AI gameplay |
| **UMG/Widget** | WidgetBlueprint, WidgetTree, UserWidget | Create widget BPs, basic layout scaffolding | HIGH - UI development |
| **PCG** (5.2+) | PCGGraph, PCGComponent | Create PCG graphs, configure nodes | LOW - newer feature |
| **Geometry Script** (5.1+) | GeometryScriptLibrary_*, DynamicMesh | Procedural mesh operations, booleans | LOW - specialized |
| **World Partition** (5.0+) | WorldPartition, HLODLayer, WP Subsystem | Configure WP, HLOD layers, data layers | MEDIUM - large worlds |
| **Editor Utilities** | EditorUtilityLibrary, EditorUtilitySubsystem | Get selections, spawn utility widgets, batch operations | HIGH - workflow automation |
| **Texture Pipeline** | Texture2D, TextureFactory, RenderTarget2D | Import textures, configure compression, create render targets | MEDIUM - art pipeline |
| **Curves/Splines** | CurveFloat, CurveTable, SplineComponent | Create curves, edit spline points | LOW - specialized |
| **Foliage** | FoliageType, InstancedFoliageSetting | Configure foliage types, paint settings | LOW - environment art |

---

## Part 2: Enhancement Plan - New MCP Tools

### Phase 1: High-Impact Developer Workflows (Weeks 1-4)

**Goal**: Cover the most-requested UE development workflows that are currently impossible.

#### 1.1 Sequencer/Cinematics (8 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `sequencer-create` | warn | `LevelSequenceFactoryNew`, `AssetTools.create_asset` |
| `sequencer-open` | safe | `LevelSequenceEditorSubsystem.open_level_sequence` |
| `sequencer-addTrack` | warn | `MovieScene.add_track(track_class)` |
| `sequencer-addBinding` | warn | `MovieScene.add_possessable/add_spawnable` |
| `sequencer-setKeyframe` | warn | `MovieSceneSection` key manipulation |
| `sequencer-getInfo` | safe | Read tracks, bindings, sections |
| `sequencer-exportFBX` | safe | `SequencerTools.export_fbx` |
| `sequencer-importFBX` | warn | `SequencerTools.import_fbx` |

**Python scripts**: `sequencer_create.py`, `sequencer_open.py`, `sequencer_add_track.py`, `sequencer_add_binding.py`, `sequencer_set_keyframe.py`, `sequencer_get_info.py`, `sequencer_export_fbx.py`, `sequencer_import_fbx.py`

#### 1.2 AI/Navigation (8 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `ai-createBehaviorTree` | warn | `BehaviorTreeFactory`, `AssetTools.create_asset` |
| `ai-createBlackboard` | warn | `BlackboardDataFactory`, `AssetTools.create_asset` |
| `ai-getBehaviorTreeInfo` | safe | Read BT structure, nodes, decorators |
| `ai-getBlackboardKeys` | safe | Read blackboard key definitions |
| `ai-addBlackboardKey` | warn | Add key to blackboard asset |
| `ai-configureNavMesh` | warn | `NavigationSystem` settings, nav mesh bounds |
| `ai-getNavMeshInfo` | safe | Navigation system state and coverage |
| `ai-createEQS` | warn | `EnvQuery` asset creation |

#### 1.3 UMG/Widget Blueprints (6 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `widget-create` | warn | `WidgetBlueprintFactory`, `AssetTools.create_asset` |
| `widget-getInfo` | safe | Read widget tree, hierarchy, bindings |
| `widget-addElement` | warn | Add widget to tree (TextBlock, Button, Image, etc.) |
| `widget-setProperty` | warn | `set_editor_property` on widget elements |
| `widget-getBindings` | safe | Read property bindings and event dispatchers |
| `widget-listWidgets` | safe | List all Widget Blueprints in project |

#### 1.4 Editor Utilities (5 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `editor-getSelection` | safe | `EditorUtilityLibrary.get_selected_assets`, `EditorActorSubsystem.get_selected_level_actors` |
| `editor-getViewport` | safe | Viewport camera transform, FOV, render mode |
| `editor-setSelection` | safe | `EditorActorSubsystem` select/deselect actors |
| `editor-getRecentActivity` | safe | Recently modified assets, opened levels |
| `editor-batchOperation` | warn | Apply operation to selected/filtered assets |

**Phase 1 Total: 27 new tools** (100 cumulative)

---

### Phase 2: Art & Visual Pipelines (Weeks 5-8)

#### 2.1 Texture Pipeline (6 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `texture-import` | warn | `TextureFactory`, `AssetImportTask` |
| `texture-getInfo` | safe | Resolution, format, compression, LOD group |
| `texture-setCompression` | warn | `TextureCompressionSettings` enum |
| `texture-createRenderTarget` | warn | `RenderTarget2D` creation |
| `texture-resize` | warn | Modify `MaxTextureSize`, LOD bias |
| `texture-listTextures` | safe | Filter/list texture assets |

#### 2.2 Niagara/VFX (6 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `niagara-createSystem` | warn | `NiagaraSystemFactory`, `AssetTools.create_asset` |
| `niagara-getInfo` | safe | Read emitters, modules, parameters |
| `niagara-addEmitter` | warn | Add emitter to system |
| `niagara-setParameter` | warn | Modify user parameters |
| `niagara-compile` | warn | `NiagaraEditorSubsystem` compile |
| `niagara-listSystems` | safe | Filter/list Niagara assets |

#### 2.3 Audio (6 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `audio-import` | warn | `SoundFactory`, `AssetImportTask` |
| `audio-createCue` | warn | `SoundCueFactory`, `AssetTools.create_asset` |
| `audio-getInfo` | safe | Duration, channels, sample rate, compression |
| `audio-setAttenuation` | warn | Configure distance attenuation |
| `audio-createMetaSound` | warn | `MetaSoundSource` creation (UE5+) |
| `audio-listAssets` | safe | Filter/list audio assets |

#### 2.4 Landscape (5 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `landscape-create` | warn | Landscape actor creation with heightmap |
| `landscape-importHeightmap` | warn | `LandscapeSubsystem.import_heightmap` |
| `landscape-exportHeightmap` | safe | `LandscapeSubsystem.export_heightmap` |
| `landscape-getInfo` | safe | Component count, size, layers |
| `landscape-setMaterial` | warn | Assign landscape material |

**Phase 2 Total: 23 new tools** (123 cumulative)

---

### Phase 3: Physics, World Systems & Advanced (Weeks 9-12)

#### 3.1 Physics (5 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `physics-createAsset` | warn | `PhysicsAssetFactory`, body setup |
| `physics-getInfo` | safe | Bodies, constraints, profiles |
| `physics-setProfile` | warn | Collision profile assignment |
| `physics-createMaterial` | warn | `PhysicalMaterial` creation |
| `physics-setConstraint` | warn | Configure physics constraints |

#### 3.2 World Partition (4 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `worldpartition-getInfo` | safe | WP configuration, data layers, HLOD |
| `worldpartition-setConfig` | warn | Grid size, loading range |
| `worldpartition-createDataLayer` | warn | New data layer |
| `worldpartition-createHLOD` | warn | HLOD layer configuration |

#### 3.3 Foliage (3 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `foliage-createType` | warn | `FoliageType` asset creation |
| `foliage-getInfo` | safe | Foliage type settings, density |
| `foliage-setProperties` | warn | Configure density, scale, culling |

#### 3.4 Curves & Splines (3 new tools)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `curve-create` | warn | `CurveFactory`, float/vector curves |
| `curve-setKeys` | warn | Add/modify curve keyframes |
| `curve-getInfo` | safe | Read curve data, key count |

#### 3.5 PCG (4 new tools, UE 5.2+)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `pcg-createGraph` | warn | `PCGGraphFactory`, `AssetTools.create_asset` |
| `pcg-getInfo` | safe | Read graph nodes, connections |
| `pcg-addNode` | warn | Add node to PCG graph |
| `pcg-connectNodes` | warn | Connect PCG graph pins |

#### 3.6 Geometry Script (3 new tools, UE 5.1+)

| Tool | Safety | Python API Used |
|------|--------|----------------|
| `geoscript-meshBoolean` | warn | `GeometryScriptLibrary_MeshBooleanFunctions` |
| `geoscript-meshTransform` | warn | Transform, simplify, remesh |
| `geoscript-getInfo` | safe | Vertex/tri count, bounds |

**Phase 3 Total: 22 new tools** (145 cumulative)

---

### Phase 4: Workflow Orchestration & Smart Tools (Weeks 13-16)

These are **composite/intelligent tools** that combine multiple atomic operations into common workflows.

#### 4.1 Workflow Templates (8 new tools)

| Tool | Safety | Description |
|------|--------|-------------|
| `workflow-createCharacter` | warn | Scaffolds: Blueprint, skeletal mesh assignment, anim BP, input bindings |
| `workflow-createUIScreen` | warn | Creates Widget BP with common layout (HUD, menu, inventory) |
| `workflow-setupLevel` | warn | Creates level, spawns core actors (player start, lights, sky) |
| `workflow-createInteractable` | warn | Blueprint with overlap/interaction component, interface |
| `workflow-createProjectile` | warn | Actor BP + movement component + collision + damage |
| `workflow-setupMultiplayer` | warn | Game mode, player state, game state scaffolding |
| `workflow-createInventorySystem` | warn | DataTable + struct + inventory component BP |
| `workflow-createDialogueSystem` | warn | DataTable + widget BP + dialogue manager BP |

#### 4.2 Analysis & Refactoring Tools (5 new tools)

| Tool | Safety | Description |
|------|--------|-------------|
| `analyze-blueprintComplexity` | safe | Cyclomatic complexity, node count, nesting depth per graph |
| `analyze-assetHealth` | safe | Unused assets, broken references, oversized textures |
| `analyze-performanceHints` | safe | Draw call estimates, texture memory, mesh complexity |
| `analyze-codeConventions` | safe | Naming convention violations, folder structure issues |
| `refactor-renameChain` | dangerous | Rename asset + update all references + redirectors |

**Phase 4 Total: 13 new tools** (158 cumulative)

---

## Part 3: Making Claude CLI an Expert UE Assistant

This is the second major goal: Claude should **instantly understand** any UE project and **accurately interpret** developer intent.

### 3.1 Project Understanding System

#### Auto-Context on Connection

When the UE plugin connects to the MCP bridge, automatically gather and inject into Claude's context:

```typescript
interface ProjectContext {
  // Gathered automatically on connection
  project: {
    name: string;
    engineVersion: string;         // "5.7.0"
    targetPlatforms: string[];     // ["Win64", "Android"]
    projectType: string;           // "Game", "Film", "ArchViz"
  };

  code: {
    modules: string[];             // ["MyGame", "MyGameEditor"]
    cppClassCount: number;
    blueprintCount: number;
    plugins: { name: string; enabled: boolean; isProject: boolean }[];
  };

  content: {
    totalAssets: number;
    assetsByType: Record<string, number>;  // {"Blueprint": 45, "Material": 120, ...}
    folderStructure: string[];     // top-level content folders
    recentlyModified: { path: string; type: string; modified: string }[];
  };

  currentState: {
    openLevel: string;
    actorCount: number;
    selectedActors: string[];
    viewportCamera: { location: Vector; rotation: Rotator };
    isDirty: boolean;              // unsaved changes
  };

  conventions: {
    namingPattern: string;         // detected: "BP_", "SM_", "M_", "T_" prefixes
    folderOrganization: string;    // detected: "by-type" or "by-feature"
    blueprintStyle: string;        // detected: heavy-BP, hybrid, cpp-heavy
  };
}
```

**Implementation**: New `context-autoGather` tool that runs `project-snapshot` + `editor-getSelection` + `editor-getViewport` + convention detection, then formats as a compact system prompt injection.

#### Convention Detection Engine

A new Python script `detect_conventions.py` that scans the project and returns:

- **Naming conventions**: Prefix patterns (BP_, SM_, MI_, T_, WBP_, ABP_, etc.)
- **Folder organization**: By type (`/Meshes`, `/Materials`) vs by feature (`/Characters/Warrior/`)
- **Blueprint vs C++ ratio**: Helps Claude know whether to suggest BP or C++ solutions
- **Common base classes**: What `GameMode`, `Character`, `PlayerController` subclasses exist
- **Input system**: Enhanced Input vs legacy, existing action mappings
- **Physics profile**: Collision channels and presets in use
- **Rendering approach**: Forward vs deferred, Lumen vs legacy, Nanite usage

### 3.2 Intent Classification System

Claude needs to map natural language to the right tool(s). Add an **intent classification layer** in the MCP server:

```typescript
interface IntentClassification {
  // Maps natural language patterns to tool chains
  patterns: {
    // Level design intents
    "place|put|add|spawn * in the level": ["actor-spawn"],
    "create a new level|map": ["level-create"],
    "build|bake lighting": ["build-lightmaps"],

    // Blueprint intents
    "add * node to *": ["blueprint-serialize", "blueprint-createNode"],
    "connect * to *": ["blueprint-serialize", "blueprint-connectPins"],
    "when * happens, do *": ["blueprint-serialize", "blueprint-createNode", "blueprint-connectPins"],

    // Asset management intents
    "import * from *": ["asset-import"],
    "create a new material": ["material-create"],
    "make * look like *": ["material-create", "material-setParameter", "material-setTexture"],

    // Analysis intents
    "what does this project *": ["project-snapshot"],
    "show me all *": ["content-findAssets", "content-listAssets"],
    "what depends on *": ["asset-getReferences"],

    // Workflow intents
    "create a character": ["workflow-createCharacter"],
    "build a UI|menu|HUD": ["workflow-createUIScreen"],
    "set up multiplayer": ["workflow-setupMultiplayer"],
  };
}
```

This doesn't need to be a separate system - it's documentation/prompting that helps Claude map intents to tool sequences. Implemented as a **tool manifest** that Claude reads on startup.

### 3.3 Smart Tool Chaining

Many UE tasks require multiple tool calls in sequence. Add **tool chain recipes** that Claude can reference:

```typescript
const TOOL_CHAINS = {
  "add-blueprint-logic": {
    description: "Add logic to a Blueprint event graph",
    steps: [
      { tool: "blueprint-serialize", why: "Understand current graph structure" },
      { tool: "blueprint-createNode", why: "Create the logic node(s)", repeat: true },
      { tool: "blueprint-connectPins", why: "Wire nodes together", repeat: true },
      { tool: "blueprint-serialize", why: "Verify the result" },
    ]
  },

  "create-material-from-textures": {
    description: "Create a material and assign textures",
    steps: [
      { tool: "material-create", why: "Create base material" },
      { tool: "material-setTexture", params: { slot: "BaseColor" } },
      { tool: "material-setTexture", params: { slot: "Normal" } },
      { tool: "material-setTexture", params: { slot: "ORM" } },
      { tool: "material-setParameter", why: "Adjust parameters" },
    ]
  },

  "setup-character-from-scratch": {
    description: "Create a playable character with animation",
    steps: [
      { tool: "asset-create", params: { type: "Blueprint", parent: "Character" } },
      { tool: "actor-addComponent", params: { type: "SkeletalMeshComponent" } },
      { tool: "actor-setProperty", why: "Assign skeletal mesh" },
      { tool: "asset-create", params: { type: "AnimBlueprint" } },
      { tool: "actor-setProperty", why: "Assign anim BP" },
      { tool: "gameplay-addInputAction", why: "Setup movement inputs" },
      { tool: "blueprint-createNode", why: "Add movement logic", repeat: true },
      { tool: "blueprint-connectPins", why: "Wire movement logic", repeat: true },
    ]
  },
};
```

### 3.4 Context-Aware Error Recovery

Enhance the self-healing system beyond compilation errors:

| Error Type | Detection | Recovery Strategy |
|------------|-----------|-------------------|
| Compile error | `compilation-getErrors` | Read error, edit file, retrigger (existing) |
| Missing asset reference | Tool returns "asset not found" | Search for similar names, suggest alternatives |
| Pin connection failure | `TryCreateConnection` returns false | Serialize graph, analyze pin types, suggest conversion node |
| Blueprint node not found | `createNode` fails | Search class hierarchy for correct node class |
| Permission denied | Safety gate rejects | Explain why, suggest safe alternative |
| Asset locked (source control) | Checkout fails | Offer to checkout, or work on duplicate |

### 3.5 UE Knowledge Base (RAG Extension)

Extend the existing RAG system (currently Slate templates only) to include:

1. **Blueprint Node Reference**: Common node classes, their pin layouts, and when to use them
2. **Material Node Reference**: Expression classes, parameter types, common graph patterns
3. **Class Hierarchy Cache**: Engine class inheritance tree for spawning correct node types
4. **UE Naming Conventions**: Standard prefixes, suffixes, and folder structures
5. **Common Patterns**: Gameplay patterns (damage system, inventory, save/load, etc.)
6. **API Gotchas**: Known issues, version differences, undocumented behaviors

Storage: `docs/rag-knowledge/` directory with structured JSON/MD files, loaded by `EmbeddingStore` on startup.

---

## Part 4: Architecture Changes

### 4.1 Python Script Organization

Current: All 60+ scripts flat in `ue-plugin/Content/Python/uma/`
Proposed: Organized by domain subdirectories matching MCP tool categories:

```
Content/Python/uma/
  __init__.py
  utils.py                    # Shared utilities (existing)

  # Existing domains (reorganize)
  actor/
    spawn.py, delete.py, transform.py, properties.py, ...
  asset/
    create.py, delete.py, import.py, export.py, ...
  animation/
    montages.py, blend_space.py, skeleton.py, ...
  ...

  # New domains
  sequencer/
    create.py, add_track.py, add_binding.py, keyframe.py, ...
  ai/
    behavior_tree.py, blackboard.py, nav_mesh.py, eqs.py
  widget/
    create.py, add_element.py, get_info.py, ...
  niagara/
    create_system.py, add_emitter.py, parameters.py, ...
  audio/
    import.py, create_cue.py, attenuation.py, ...
  landscape/
    create.py, heightmap.py, layers.py, ...
  physics/
    create_asset.py, profiles.py, materials.py, ...
  worldpartition/
    config.py, data_layers.py, hlod.py
  texture/
    import.py, compression.py, render_target.py, ...
  pcg/
    create_graph.py, add_node.py, connect.py
  geoscript/
    boolean.py, transform.py, info.py
  foliage/
    create_type.py, properties.py
  curves/
    create.py, keys.py
  editor/
    selection.py, viewport.py, recent_activity.py
  workflow/
    create_character.py, create_ui.py, setup_level.py, ...
  analysis/
    blueprint_complexity.py, asset_health.py, conventions.py, ...
```

**Migration**: The `python.execute` tool already supports `scriptName` routing. Subdirectories work via dot notation: `"scriptName": "sequencer.create"` maps to `uma/sequencer/create.py`.

### 4.2 Tool Registration Scaling

Current `server.ts` is 699 lines with all 73 tools inline. At 150+ tools this becomes unmanageable.

**Proposed**: Auto-registration from tool definition files.

```typescript
// mcp-server/src/tools/registry.ts (enhanced)
interface ToolDefinition {
  name: string;                    // "sequencer-create"
  domain: string;                  // "sequencer"
  description: string;
  inputSchema: ZodSchema;
  safety: SafetyLevel;
  pythonScript?: string;           // "sequencer.create" -> uma/sequencer/create.py
  cppHandler?: string;             // "blueprint.serialize" -> C++ handler
  handler: (params, bridge, cache) => Promise<ToolResult>;
}

// Each domain exports its tool definitions
// mcp-server/src/tools/sequencer/index.ts
export const sequencerTools: ToolDefinition[] = [
  {
    name: "sequencer-create",
    domain: "sequencer",
    description: "Create a new Level Sequence asset",
    inputSchema: z.object({ name: z.string(), path: z.string() }),
    safety: "warn",
    pythonScript: "sequencer.create",
    handler: createPythonToolHandler("sequencer.create"),
  },
  // ...
];

// server.ts auto-registers all domains
import { allToolDefinitions } from './tools/registry';
for (const def of allToolDefinitions) {
  server.tool(def.name, def.description, def.inputSchema, def.handler);
}
```

### 4.3 Tool Manifest for Claude

Generate a machine-readable manifest that Claude receives on startup:

```typescript
// Auto-generated from tool definitions
interface ToolManifest {
  version: string;
  engineVersion: string;
  tools: {
    name: string;
    domain: string;
    description: string;
    safety: SafetyLevel;
    parameters: ParameterSpec[];
    returns: ReturnSpec;
    relatedTools: string[];        // Tools commonly used together
    commonChains: string[];        // Named workflow chains this tool participates in
    examples: ToolExample[];       // Concrete usage examples
  }[];

  chains: {
    name: string;
    description: string;
    steps: { tool: string; purpose: string }[];
  }[];

  domains: {
    name: string;
    description: string;
    tools: string[];
  }[];
}
```

### 4.4 Event Stream (UE -> MCP)

For real-time context awareness, add a push channel from UE to MCP:

```
UE Editor Events:
  selection_changed    -> Update Claude's context about what user is looking at
  asset_opened         -> Claude knows which asset user is editing
  level_loaded         -> Claude knows current level context
  compilation_finished -> Claude can react to compile results
  property_changed     -> Claude can track what user is modifying
  viewport_changed     -> Claude knows camera position
```

Implementation: UE plugin sends events via WebSocket. MCP server stores in ring buffer (last 50 events). Claude can query via `editor-getRecentActivity` tool or receives as context injection.

---

## Part 5: Claude CLI Intelligence Enhancements

### 5.1 System Prompt Engineering

The most impactful change for Claude's UE understanding is the **system prompt** it receives. This should be dynamically constructed:

```
[Static] UE development expert knowledge
  - UE architecture (GameThread, Slate, UObject, GC)
  - Common patterns and anti-patterns
  - Blueprint vs C++ decision framework

[Dynamic - on connect] Project snapshot
  - Project name, engine version, modules
  - Asset counts by type
  - Current level, selected actors
  - Detected conventions

[Dynamic - on connect] Available tools manifest
  - All tools with descriptions
  - Common workflow chains
  - Safety levels and what requires approval

[Dynamic - per request] Editor context
  - Current selection
  - Recent activity
  - Open assets
```

### 5.2 CLAUDE.md / AGENTS.md Integration

Add a **project-specific CLAUDE.md generator** that creates UE-aware instructions:

```markdown
# Project: MyGame (UE 5.7)

## Available MCP Tools
You have access to 150+ Unreal Engine tools via MCP. Key domains:
- Blueprint graph manipulation (serialize, create nodes, connect pins)
- Asset management (create, import, export, duplicate, delete)
- Level editing (create, open, actors, sublevels)
- Materials (create, parameters, instances, textures)
[...truncated tool list with usage hints...]

## Project Conventions
- Blueprints: BP_ prefix, stored in /Game/Blueprints/
- Materials: M_ prefix, instances MI_, stored in /Game/Materials/
- This project uses Enhanced Input System
- Primary game mode: BP_MyGameMode
- Main character: BP_PlayerCharacter (inherits from ACharacter)

## Common Workflows
- To add logic to a Blueprint: serialize first, then create nodes, then connect pins
- To create a material: create base, set parameters, assign textures
- Always check compilation after Blueprint changes
```

### 5.3 Contextual Help System

When Claude encounters an error or the user asks "how do I...", provide UE-specific guidance:

| User Intent | Claude's Enhanced Response |
|------------|---------------------------|
| "Make the player jump higher" | 1. Find character BP via project-snapshot 2. Serialize BP 3. Find JumpZVelocity property 4. Modify via blueprint-modifyProperty |
| "The material looks wrong" | 1. Get material params 2. Get material nodes 3. Identify common issues (missing normal map, wrong blend mode) |
| "Set up multiplayer" | 1. Explain GameMode/GameState/PlayerState architecture 2. Offer workflow-setupMultiplayer 3. Create scaffolding step by step |
| "Optimize my level" | 1. Run analyze-performanceHints 2. Check texture sizes, mesh complexity 3. Suggest LOD, HLOD, culling changes |

---

## Part 6: Implementation Roadmap

### Timeline Overview

| Phase | Weeks | New Tools | Cumulative | Focus |
|-------|-------|-----------|-----------|-------|
| **Phase 1** | 1-4 | 27 | 100 | High-impact: Sequencer, AI, Widgets, Editor Utils |
| **Phase 2** | 5-8 | 23 | 123 | Art pipelines: Textures, Niagara, Audio, Landscape |
| **Phase 3** | 9-12 | 22 | 145 | Systems: Physics, World Partition, PCG, GeoScript |
| **Phase 4** | 13-16 | 13 | 158 | Workflows, Analysis, Refactoring |
| **Phase 5** | 17-20 | — | 158 | Claude Intelligence: Context engine, manifests, RAG |

### Per-Tool Implementation Pattern

Each new tool follows the same pattern (estimated 2-4 hours per tool):

1. **Python script** in `Content/Python/uma/{domain}/{operation}.py`
   - Uses `@execute_wrapper` decorator
   - Validates params via `get_required_param`/`get_optional_param`
   - Calls UE Python API (`unreal.*`)
   - Returns standardized result dict

2. **MCP tool definition** in `mcp-server/src/tools/{domain}/{operation}.ts`
   - Zod input schema
   - Safety classification
   - Routes to `python.execute` with `scriptName`

3. **Tool registration** in domain index file

4. **Safety classification** update in `safety.ts`

5. **Unit test** in `mcp-server/tests/unit/tools/{domain}.test.ts`

6. **UE integration test** (manual or automation framework)

### Priority Matrix

```
                    HIGH IMPACT
                        |
    Sequencer    AI/Nav |  Editor Utils
    Widgets      Audio  |  Workflows
                        |
  LOW EFFORT -----------+----------- HIGH EFFORT
                        |
    Foliage      PCG    |  World Partition
    Curves       GeoSc  |  Context Engine
                        |
                    LOW IMPACT
```

### Dependencies

```
Phase 1 (no deps - all use existing python.execute bridge)
  |
Phase 2 (no deps - all use existing python.execute bridge)
  |
Phase 3 (World Partition tools need UE 5.0+, PCG needs 5.2+, GeoScript needs 5.1+)
  |
Phase 4 (Workflows depend on Phase 1-3 tools being available)
  |
Phase 5 (Context engine depends on project-snapshot + new editor tools)
```

---

## Part 7: Success Metrics

| Metric | Current | After Phase 4 | After Phase 5 |
|--------|---------|---------------|---------------|
| MCP tools | 73 | 158 | 158 |
| UE Python API coverage | ~40% | ~95% | ~95% |
| Tool calls to understand project | 3-5 | 3-5 | 0 (auto-context) |
| Supported UE domains | 21 | 35 | 35 |
| Workflow templates | 0 | 8 | 8 |
| Context-aware suggestions | No | No | Yes |
| Time for Claude to orient in new project | 30-60s | 30-60s | <2s |
| Developer intent accuracy | ~70% | ~85% | ~95% |

---

## Part 8: Risk Mitigation

| Risk | Mitigation |
|------|------------|
| UE Python API changes between versions | Version-gated scripts with `unreal.SystemLibrary.get_engine_version()` checks |
| 158 tools overwhelm Claude's context | Tool manifest with domain grouping; Claude only loads relevant domain details |
| Python script security | Existing bundled-only policy; hash verification; no dynamic code gen |
| Performance with many tools | Lazy tool loading; only register tools for detected project features |
| Breaking changes in UE 5.8+ | Automated compatibility testing matrix; abstraction layer in `utils.py` |
| Tool naming collisions | Strict `{domain}-{verb}{Noun}` naming convention |

---

## Appendix A: Complete Tool Inventory (Target State)

### Existing (73 tools) - No changes needed
editor-ping, editor-getLevelInfo, editor-listActors, editor-getAssetInfo,
blueprint-serialize, blueprint-createNode, blueprint-connectPins, blueprint-modifyProperty, blueprint-deleteNode,
compilation-trigger, compilation-getStatus, compilation-getErrors, compilation-selfHeal,
file-read, file-write, file-search,
slate-validate, slate-generate, slate-listTemplates,
chat-sendMessage,
python-execute,
project-getStructure, project-getSettings, project-getPlugins, project-getDependencyGraph, project-getClassHierarchy, project-snapshot,
asset-create, asset-duplicate, asset-rename, asset-delete, asset-import, asset-export, asset-getReferences, asset-setMetadata,
content-listAssets, content-findAssets, content-getAssetDetails, content-validateAssets,
actor-spawn, actor-delete, actor-setTransform, actor-getProperties, actor-setProperty, actor-getComponents, actor-addComponent, actor-select, actor-setArrayRef,
level-create, level-open, level-save, level-addSublevel, level-getWorldSettings,
material-create, material-setParameter, material-getParameters, material-createInstance, material-setTexture, material-getNodes,
mesh-getInfo, mesh-setMaterial, mesh-generateCollision, mesh-setLOD,
datatable-create, datatable-addRow, datatable-getRows, datatable-removeRow,
anim-listMontages, anim-getBlendSpace, anim-createMontage, anim-listSequences, anim-getSkeletonInfo,
gameplay-getGameMode, gameplay-setGameMode, gameplay-listInputActions, gameplay-addInputAction,
sourcecontrol-getStatus, sourcecontrol-checkout, sourcecontrol-diff,
build-lightmaps, build-getMapCheck, build-cookContent,
debug-execConsole, debug-getLog, debug-getPerformance

### New Phase 1 (27 tools)
sequencer-create, sequencer-open, sequencer-addTrack, sequencer-addBinding, sequencer-setKeyframe, sequencer-getInfo, sequencer-exportFBX, sequencer-importFBX,
ai-createBehaviorTree, ai-createBlackboard, ai-getBehaviorTreeInfo, ai-getBlackboardKeys, ai-addBlackboardKey, ai-configureNavMesh, ai-getNavMeshInfo, ai-createEQS,
widget-create, widget-getInfo, widget-addElement, widget-setProperty, widget-getBindings, widget-listWidgets,
editor-getSelection, editor-getViewport, editor-setSelection, editor-getRecentActivity, editor-batchOperation

### New Phase 2 (23 tools)
texture-import, texture-getInfo, texture-setCompression, texture-createRenderTarget, texture-resize, texture-listTextures,
niagara-createSystem, niagara-getInfo, niagara-addEmitter, niagara-setParameter, niagara-compile, niagara-listSystems,
audio-import, audio-createCue, audio-getInfo, audio-setAttenuation, audio-createMetaSound, audio-listAssets,
landscape-create, landscape-importHeightmap, landscape-exportHeightmap, landscape-getInfo, landscape-setMaterial

### New Phase 3 (22 tools)
physics-createAsset, physics-getInfo, physics-setProfile, physics-createMaterial, physics-setConstraint,
worldpartition-getInfo, worldpartition-setConfig, worldpartition-createDataLayer, worldpartition-createHLOD,
foliage-createType, foliage-getInfo, foliage-setProperties,
curve-create, curve-setKeys, curve-getInfo,
pcg-createGraph, pcg-getInfo, pcg-addNode, pcg-connectNodes,
geoscript-meshBoolean, geoscript-meshTransform, geoscript-getInfo

### New Phase 4 (13 tools)
workflow-createCharacter, workflow-createUIScreen, workflow-setupLevel, workflow-createInteractable, workflow-createProjectile, workflow-setupMultiplayer, workflow-createInventorySystem, workflow-createDialogueSystem,
analyze-blueprintComplexity, analyze-assetHealth, analyze-performanceHints, analyze-codeConventions,
refactor-renameChain

**Grand Total: 158 tools**
