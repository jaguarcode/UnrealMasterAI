# MCP Tools API Reference

**Version:** 0.2.0
**Last Updated:** 2026-03-08
**Status:** Complete (183 tools across 37 domains)

---

## Overview

Unreal Master Agent exposes **183 MCP tools** organized across **37 functional domains**. These tools enable Claude Code to query the Unreal Editor, manipulate Blueprints at the graph level, trigger compilation, generate Slate UI code, manage actors, materials, levels, assets, animations, and much more.

All tools communicate via a WebSocket bridge (Layer 2) to the C++ UE plugin (Layer 3) for execution on the GameThread. Extended tools use Python automation scripts executed via the `python-execute` bridge.

### Safety Classification

Each tool is classified by risk level:
- **Safe** — Read-only queries that never mutate state
- **Warning** — Mutations that are generally recoverable
- **Dangerous** — Destructive or production-impacting operations requiring approval

### Domain Summary

| Domain | Tools | Description |
|--------|------:|-------------|
| Editor | 9 | Health checks, level queries, viewport, selection, batch ops |
| Blueprint | 5 | Serialize graphs, create/delete nodes, connect pins, modify properties |
| Compilation | 4 | Trigger compilation, check status, retrieve errors, self-heal |
| File | 3 | Read/write/search project files with safety checks |
| Slate | 3 | List templates, generate Slate C++ code, validate syntax |
| Chat | 1 | Send in-editor chat messages |
| Python | 1 | Execute named Python scripts from `Content/Python/uma/` |
| Project | 6 | Structure, plugins, settings, class hierarchy, dependency graph, snapshot |
| Asset | 8 | Create, delete, duplicate, import, export, rename, references, metadata |
| Content | 4 | List assets, find assets, get details, validate assets |
| Actor | 9 | Spawn, delete, properties, transform, components, selection, array refs |
| Level | 5 | Create, open, save, sublevels, world settings |
| Material | 6 | Create materials/instances, parameters, textures, nodes |
| Mesh | 4 | Mesh info, set material, LOD management, collision generation |
| DataTable | 4 | Create, add row, get rows, remove row |
| Animation | 5 | List sequences/montages, create montage, blend spaces, skeleton info |
| Gameplay | 4 | Get/set game mode, list/add input actions |
| Source Control | 3 | Status, checkout, diff |
| Build | 3 | Build lightmaps, cook content, map check |
| Debug | 3 | Console commands, logs, performance stats |
| AI | 8 | Behavior trees, blackboards, NavMesh, EQS |
| Sequencer | 8 | Create/open sequences, tracks, bindings, keyframes, FBX import/export |
| Widget | 6 | Create/inspect Widget Blueprints, add elements, set properties, bindings |
| Texture | 6 | Import, info, compression, render targets, resize, list |
| Niagara | 6 | Create systems, emitters, parameters, compile, list |
| Audio | 6 | Import, Sound Cues, MetaSound, attenuation, info, list |
| Landscape | 5 | Create, import/export heightmap, info, set material |
| Physics | 5 | Create assets/materials, info, profiles, constraints |
| World Partition | 4 | Info, config, data layers, HLOD |
| Foliage | 3 | Create types, info, set properties |
| Curve | 3 | Create curves, set keys, get info |
| PCG | 4 | Create graphs, info, add/connect nodes |
| Geometry Script | 3 | Mesh boolean, transform, info |
| Workflow | 8 | High-level scaffolding: characters, UI, levels, projectiles, multiplayer, inventory, dialogue |
| Analyze | 4 | Blueprint complexity, asset health, performance hints, code conventions |
| Refactor | 1 | Rename asset chain with reference fixing |
| Context | 13 | Intent matching, workflow learning, error recovery, outcome tracking |
| **Total** | **183** | |

---

## Editor (9 tools)

### `editor-ping`
Ping the Unreal Engine editor to verify connectivity. Returns "pong" with latency and diagnostics.
- **Safety:** Safe
- **Parameters:** None

### `editor-getLevelInfo`
Get information about the currently loaded level.
- **Safety:** Safe
- **Parameters:** None

### `editor-listActors`
List actors in the current level with optional filters.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| className | string | No | Filter actors by class name |
| tag | string | No | Filter actors by tag |

### `editor-getAssetInfo`
Get metadata for a specific asset.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| assetPath | string | Yes | Asset path (e.g., /Game/BP_TestActor) |

### `editor-getSelection`
Get currently selected actors and optionally content browser assets.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `editor-getViewport`
Get viewport camera location, rotation, and FOV.
- **Safety:** Safe
- **Parameters:** None

### `editor-setSelection`
Set actor selection in the viewport.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `editor-getRecentActivity`
Get recently modified assets and opened levels.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `editor-batchOperation`
Apply batch operation to multiple assets/actors.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Blueprint (5 tools)

### `blueprint-serialize`
Serialize a Blueprint to JSON AST. Returns a cache key and summary.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| assetPath | string | Yes | Blueprint asset path (e.g., /Game/BP_TestActor) |
| graphName | string | No | Specific graph name to serialize |

### `blueprint-createNode`
Create a new Blueprint node in a graph.
- **Safety:** Warning
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| blueprintCacheKey | string | Yes | Cache key from blueprint-serialize |
| graphName | string | Yes | Target graph name |
| nodeClass | string | Yes | Node class (e.g., K2Node_CallFunction) |
| functionOwnerClass | string | No | Owner class for K2Node_CallFunction |
| functionName | string | No | Function name for K2Node_CallFunction |
| posX | integer | No | X position |
| posY | integer | No | Y position |

### `blueprint-connectPins`
Connect two Blueprint pins using TryCreateConnection.
- **Safety:** Warning
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| blueprintCacheKey | string | Yes | Cache key from blueprint-serialize |
| sourcePinId | string | Yes | Source pin UUID |
| targetPinId | string | Yes | Target pin UUID |

### `blueprint-modifyProperty`
Modify a property value on a Blueprint node.
- **Safety:** Warning
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| blueprintCacheKey | string | Yes | Cache key from blueprint-serialize |
| nodeId | string | Yes | Node UUID |
| propertyName | string | Yes | Property name to modify |
| propertyValue | string | Yes | New property value |

### `blueprint-deleteNode`
Delete a Blueprint node by its UUID.
- **Safety:** Dangerous
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| blueprintCacheKey | string | Yes | Cache key from blueprint-serialize |
| nodeId | string | Yes | Node UUID to delete |

---

## Compilation (4 tools)

### `compilation-trigger`
Trigger a Live Coding compilation in the Unreal Editor.
- **Safety:** Warning
- **Parameters:** None

### `compilation-getStatus`
Get the status of the current or last compilation.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| compileId | string | No | Compile ID to check |

### `compilation-getErrors`
Get structured compile errors from the last compilation.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| compileId | string | No | Compile ID to check |

### `compilation-selfHeal`
Get current compile errors and self-healing context.
- **Safety:** Warning
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| filePath | string | No | File path with errors (for retry tracking) |

---

## File (3 tools)

### `file-read`
Read a source file from the Unreal Engine project.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| filePath | string | Yes | File path to read |
| offset | integer | No | Line offset |
| limit | integer | No | Line limit |

### `file-write`
Write content to a source file in the Unreal Engine project.
- **Safety:** Warning/Dangerous (context-dependent)
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| filePath | string | Yes | File path to write |
| content | string | Yes | File content |

### `file-search`
Search for files or patterns in the Unreal Engine project.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| pattern | string | Yes | Search pattern |
| directory | string | No | Directory to search in |
| glob | string | No | Glob pattern filter |

---

## Slate (3 tools)

### `slate-validate`
Validate Slate C++ code for common errors.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| code | string | Yes | Slate C++ code to validate |

### `slate-generate`
Get relevant Slate templates and style guide for widget generation.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| query | string | Yes | Widget description (e.g., "list view with checkboxes") |
| widgetName | string | No | Widget name |

### `slate-listTemplates`
List all available Slate widget templates.
- **Safety:** Safe
- **Parameters:** None

---

## Chat (1 tool)

### `chat-sendMessage`
Send a message through the in-editor chat panel.
- **Safety:** Safe
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | Yes | Message text to send |

---

## Python (1 tool)

### `python-execute`
Execute a named Python script from the UMA plugin `Content/Python/uma/` directory.
- **Safety:** Warning
- **Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| script | string | Yes | Script name (without .py, e.g., "blueprint_setup_spinning_cube") |
| args | object | No | Arguments to pass to the script |

---

## Project (6 tools)

### `project-getStructure`
Get project directory tree with asset type counts.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `project-getSettings`
Get project settings (engine config, maps, etc.).
- **Safety:** Safe
- **Parameters:** None

### `project-getPlugins`
List enabled/disabled plugins.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `project-getDependencyGraph`
Get asset reference/dependency graph.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `project-getClassHierarchy`
Get Blueprint/C++ class inheritance tree.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `project-snapshot`
Get comprehensive project summary (cached 5 min).
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Asset (8 tools)

### `asset-create`
Create a new UE asset (Blueprint, Material, DataTable, etc.).
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `asset-duplicate`
Duplicate an existing asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `asset-rename`
Rename/move an asset with reference fixing.
- **Safety:** Dangerous
- **Parameters:** Schema-defined in tool registration

### `asset-delete`
Delete an asset (with dependency check).
- **Safety:** Dangerous
- **Parameters:** Schema-defined in tool registration

### `asset-import`
Import external file (FBX, PNG, WAV, etc.) as UE asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `asset-export`
Export asset to external format.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `asset-getReferences`
Get all assets referencing/referenced by target.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `asset-setMetadata`
Set asset tags/metadata.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Content (4 tools)

### `content-listAssets`
List assets with filtering.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `content-findAssets`
Search assets by name, type, or metadata.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `content-getAssetDetails`
Deep inspection of any asset.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `content-validateAssets`
Run asset validation checks.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Actor (9 tools)

### `actor-spawn`
Spawn actor in current level.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `actor-delete`
Delete actor(s) from level.
- **Safety:** Dangerous
- **Parameters:** Schema-defined in tool registration

### `actor-setTransform`
Set actor location/rotation/scale.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `actor-getProperties`
Read all editable properties of an actor.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `actor-setProperty`
Set a specific property on an actor.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `actor-getComponents`
List all components on an actor.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `actor-addComponent`
Add a component to an actor.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `actor-setArrayRef`
Set an array-of-actor-references property (e.g., PatrolPoints).
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `actor-select`
Select/deselect actors in viewport.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Level (5 tools)

### `level-create`
Create a new level/map.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `level-open`
Open an existing level.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `level-save`
Save current level.
- **Safety:** Warning
- **Parameters:** None

### `level-addSublevel`
Add streaming sublevel.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `level-getWorldSettings`
Get world settings for current level.
- **Safety:** Safe
- **Parameters:** None

---

## Material (6 tools)

### `material-create`
Create new material.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `material-setParameter`
Set material parameter value.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `material-getParameters`
List material parameters.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `material-createInstance`
Create material instance from parent.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `material-setTexture`
Assign texture to material.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `material-getNodes`
Get material graph nodes.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Mesh (4 tools)

### `mesh-getInfo`
Get mesh details (verts, tris, LODs, materials).
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `mesh-setMaterial`
Assign material to mesh slot.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `mesh-generateCollision`
Generate collision for static mesh.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `mesh-setLOD`
Configure LOD settings.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## DataTable (4 tools)

### `datatable-create`
Create new DataTable.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `datatable-addRow`
Add/modify DataTable row.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `datatable-getRows`
Read all DataTable rows.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `datatable-removeRow`
Remove DataTable row.
- **Safety:** Dangerous
- **Parameters:** Schema-defined in tool registration

---

## Animation (5 tools)

### `anim-listMontages`
List animation montages.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `anim-getBlendSpace`
Get blend space details.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `anim-createMontage`
Create animation montage.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `anim-listSequences`
List animation sequences.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `anim-getSkeletonInfo`
Get skeleton bone hierarchy.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Gameplay (4 tools)

### `gameplay-getGameMode`
Get current game mode.
- **Safety:** Safe
- **Parameters:** None

### `gameplay-setGameMode`
Set game mode for current level.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `gameplay-listInputActions`
List all input action mappings.
- **Safety:** Safe
- **Parameters:** None

### `gameplay-addInputAction`
Add input action mapping.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Source Control (3 tools)

### `sourcecontrol-getStatus`
Get source control status of assets.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `sourcecontrol-checkout`
Check out assets for editing.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `sourcecontrol-diff`
Get diff summary for modified asset.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Build (3 tools)

### `build-lightmaps`
Trigger lightmap build.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `build-getMapCheck`
Run map check and return warnings/errors.
- **Safety:** Safe
- **Parameters:** None

### `build-cookContent`
Trigger content cooking for target platform.
- **Safety:** Dangerous
- **Parameters:** Schema-defined in tool registration

---

## Debug (3 tools)

### `debug-execConsole`
Execute UE console command.
- **Safety:** Dangerous
- **Parameters:** Schema-defined in tool registration

### `debug-getLog`
Get recent output log entries.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `debug-getPerformance`
Get frame time, draw calls, memory stats.
- **Safety:** Safe
- **Parameters:** None

---

## AI (8 tools)

### `ai-createBehaviorTree`
Create a new BehaviorTree asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `ai-createBlackboard`
Create a new Blackboard asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `ai-getBehaviorTreeInfo`
Get metadata for a BehaviorTree asset.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `ai-getBlackboardKeys`
Get all keys from a Blackboard asset.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `ai-addBlackboardKey`
Add a key to a Blackboard asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `ai-configureNavMesh`
Configure RecastNavMesh settings.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `ai-getNavMeshInfo`
Get current RecastNavMesh configuration.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `ai-createEQS`
Create a new Environment Query System asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Sequencer (8 tools)

### `sequencer-create`
Create a new Level Sequence asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `sequencer-open`
Open Level Sequence in Sequencer editor.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `sequencer-addTrack`
Add a track to a Level Sequence.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `sequencer-addBinding`
Add actor binding (possessable/spawnable) to a Level Sequence.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `sequencer-setKeyframe`
Set a keyframe value on a sequencer track.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `sequencer-getInfo`
Get Level Sequence metadata (tracks, bindings, frame range).
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `sequencer-exportFBX`
Export Level Sequence animation to FBX.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `sequencer-importFBX`
Import FBX animation into Level Sequence.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Widget (6 tools)

### `widget-create`
Create a new Widget Blueprint.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `widget-getInfo`
Get Widget Blueprint info (widget tree, bindings).
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `widget-addElement`
Add a UI element to a Widget Blueprint.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `widget-setProperty`
Set a property on a Widget Blueprint element.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `widget-getBindings`
Get property bindings and event dispatchers from a Widget Blueprint.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `widget-listWidgets`
List all Widget Blueprints in project.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Texture (6 tools)

### `texture-import`
Import a texture file into the project.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `texture-getInfo`
Get texture info: resolution, format, compression, LOD group.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `texture-setCompression`
Set compression settings on a texture asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `texture-createRenderTarget`
Create a Render Target 2D asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `texture-resize`
Set max texture size and LOD bias.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `texture-listTextures`
List and filter texture assets in the project.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Niagara (6 tools)

### `niagara-createSystem`
Create a new Niagara particle system asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `niagara-getInfo`
Get Niagara system info: emitters, modules, parameters.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `niagara-addEmitter`
Add an emitter to a Niagara system.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `niagara-setParameter`
Set a user parameter on a Niagara system.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `niagara-compile`
Compile a Niagara system.
- **Safety:** Warning
- **Parameters:** None (schema-defined)

### `niagara-listSystems`
List Niagara system assets in the project.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Audio (6 tools)

### `audio-import`
Import an audio file into the project.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `audio-createCue`
Create a Sound Cue asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `audio-getInfo`
Get audio asset info: duration, channels, sample rate.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `audio-setAttenuation`
Configure distance attenuation on an audio asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `audio-createMetaSound`
Create a MetaSound source asset (UE5+).
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `audio-listAssets`
List audio assets in the project.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Landscape (5 tools)

### `landscape-create`
Create a new landscape actor.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `landscape-importHeightmap`
Import a heightmap to an existing landscape.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `landscape-exportHeightmap`
Export heightmap from a landscape.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `landscape-getInfo`
Get landscape info: components, size, layers.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `landscape-setMaterial`
Assign a material to a landscape.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Physics (5 tools)

### `physics-createAsset`
Create a PhysicsAsset for a skeletal mesh.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `physics-getInfo`
Get physics asset info: bodies, constraints, profiles.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `physics-setProfile`
Set collision profile on a physics body.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `physics-createMaterial`
Create a PhysicalMaterial asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `physics-setConstraint`
Configure a physics constraint.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## World Partition (4 tools)

### `worldpartition-getInfo`
Get World Partition configuration and data layers.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `worldpartition-setConfig`
Set World Partition grid and loading settings.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `worldpartition-createDataLayer`
Create a new World Partition data layer.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `worldpartition-createHLOD`
Create an HLOD layer configuration.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Foliage (3 tools)

### `foliage-createType`
Create a FoliageType asset.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `foliage-getInfo`
Get foliage type settings and density info.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `foliage-setProperties`
Set foliage density, scale, and culling properties.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Curve (3 tools)

### `curve-create`
Create a curve asset (float, vector, or linear color).
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `curve-setKeys`
Add or modify keyframes on a curve.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `curve-getInfo`
Get curve data, key count, and time range.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## PCG (4 tools)

### `pcg-createGraph`
Create a PCG graph asset (UE 5.2+).
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `pcg-getInfo`
Get PCG graph info: nodes, connections, settings.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `pcg-addNode`
Add a node to a PCG graph.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `pcg-connectNodes`
Connect two nodes in a PCG graph.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Geometry Script (3 tools)

### `geoscript-meshBoolean`
Perform mesh boolean operation (UE 5.1+).
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `geoscript-meshTransform`
Transform, simplify, or remesh a mesh (UE 5.1+).
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `geoscript-getInfo`
Get mesh geometry info: vertex/tri count, bounds.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Workflow (8 tools)

High-level scaffolding tools that orchestrate multiple lower-level tools to create complete game systems.

### `workflow-createCharacter`
Scaffold a playable character: Blueprint, mesh, anim BP, inputs.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `workflow-createUIScreen`
Create a UI screen Widget Blueprint with layout template.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `workflow-setupLevel`
Create a level with core actors (player start, lights, sky).
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `workflow-createInteractable`
Create an interactable actor with overlap/interaction component.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `workflow-createProjectile`
Create a projectile actor with movement, collision, damage.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `workflow-setupMultiplayer`
Scaffold multiplayer: GameMode, PlayerState, GameState.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `workflow-createInventorySystem`
Create inventory system: DataTable, struct, component BP.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

### `workflow-createDialogueSystem`
Create dialogue system: DataTable, widget BP, manager BP.
- **Safety:** Warning
- **Parameters:** Schema-defined in tool registration

---

## Analyze (4 tools)

### `analyze-blueprintComplexity`
Analyze Blueprint complexity: node count, nesting, cyclomatic.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `analyze-assetHealth`
Analyze asset health: unused, broken refs, oversized textures.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `analyze-performanceHints`
Get performance hints: draw calls, texture memory, mesh complexity.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `analyze-codeConventions`
Check naming conventions and folder structure compliance.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Refactor (1 tool)

### `refactor-renameChain`
Rename asset and update all references + clean redirectors.
- **Safety:** Dangerous
- **Parameters:** Schema-defined in tool registration

---

## Context (13 tools)

Context intelligence tools for workflow learning, intent matching, error recovery, and outcome tracking.

### `context-autoGather`
Gather comprehensive project context: info, code stats, content, conventions.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-getManifest`
Get the complete tool manifest with all tools, domains, and workflow chains.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-getChains`
Get available tool workflow chains and error recovery strategies.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-learnWorkflow`
Learn a new UE developer workflow from documentation or web research.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-matchIntent`
Match a natural language description of developer intent to known UE workflows.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-getWorkflows`
List all known UE developer workflows (built-in + learned).
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-recordOutcome`
Record the outcome (success/failure) of a workflow execution.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-learnFromDocs`
Extract and learn UE workflows from documentation content.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-getOutcomeStats`
Get outcome statistics for all tracked workflows.
- **Safety:** Safe
- **Parameters:** None

### `context-recordResolution`
Record a successful error resolution after troubleshooting.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-matchError`
Find matching past resolutions for a current error.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-markResolutionReused`
Mark a learned error resolution as successfully reused.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

### `context-listResolutions`
List all stored error resolutions.
- **Safety:** Safe
- **Parameters:** Schema-defined in tool registration

---

## Response Format

All MCP tool responses follow the standard MCP `CallToolResult` format:

```typescript
{
  content: [
    {
      type: "text",
      text: JSON.stringify(result)
    }
  ]
}
```

Error responses include `isError: true` with a descriptive message.

---

*Auto-generated from `mcp-server/src/server.ts` tool registrations and `mcp-server/src/state/safety.ts` classifications.*
