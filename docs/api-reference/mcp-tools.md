# MCP Tools API Reference

183 tools across 37 domains

## Domain Summary

| Domain | Tools | Count |
|--------|-------|-------|
| [Editor](#editor) | editor-ping, editor-getLevelInfo, editor-listActors, editor-getAssetInfo, editor-getSelection, editor-getViewport, editor-setSelection, editor-getRecentActivity, editor-batchOperation | 9 |
| [Blueprint](#blueprint) | blueprint-serialize, blueprint-createNode, blueprint-connectPins, blueprint-modifyProperty, blueprint-deleteNode | 5 |
| [Compilation](#compilation) | compilation-trigger, compilation-getStatus, compilation-getErrors, compilation-selfHeal | 4 |
| [File](#file) | file-read, file-write, file-search | 3 |
| [Slate](#slate) | slate-validate, slate-generate, slate-listTemplates | 3 |
| [Chat](#chat) | chat-sendMessage | 1 |
| [Python](#python) | python-execute | 1 |
| [Project](#project) | project-getStructure, project-getSettings, project-getPlugins, project-getDependencyGraph, project-getClassHierarchy, project-snapshot | 6 |
| [Asset](#asset) | asset-create, asset-duplicate, asset-rename, asset-delete, asset-import, asset-export, asset-getReferences, asset-setMetadata | 8 |
| [Content](#content) | content-listAssets, content-findAssets, content-getAssetDetails, content-validateAssets | 4 |
| [Actor](#actor) | actor-spawn, actor-delete, actor-setTransform, actor-getProperties, actor-setProperty, actor-getComponents, actor-addComponent, actor-setArrayRef, actor-select | 9 |
| [Level](#level) | level-create, level-open, level-save, level-addSublevel, level-getWorldSettings | 5 |
| [Material](#material) | material-create, material-setParameter, material-getParameters, material-createInstance, material-setTexture, material-getNodes | 6 |
| [Mesh](#mesh) | mesh-getInfo, mesh-setMaterial, mesh-generateCollision, mesh-setLOD | 4 |
| [DataTable](#datatable) | datatable-create, datatable-addRow, datatable-getRows, datatable-removeRow | 4 |
| [Animation](#animation) | anim-listMontages, anim-getBlendSpace, anim-createMontage, anim-listSequences, anim-getSkeletonInfo | 5 |
| [Gameplay](#gameplay) | gameplay-getGameMode, gameplay-setGameMode, gameplay-listInputActions, gameplay-addInputAction | 4 |
| [SourceControl](#sourcecontrol) | sourcecontrol-getStatus, sourcecontrol-checkout, sourcecontrol-diff | 3 |
| [Build](#build) | build-lightmaps, build-getMapCheck, build-cookContent | 3 |
| [Debug](#debug) | debug-execConsole, debug-getLog, debug-getPerformance | 3 |
| [AI](#ai) | ai-createBehaviorTree, ai-createBlackboard, ai-getBehaviorTreeInfo, ai-getBlackboardKeys, ai-addBlackboardKey, ai-configureNavMesh, ai-getNavMeshInfo, ai-createEQS | 8 |
| [Sequencer](#sequencer) | sequencer-create, sequencer-open, sequencer-addTrack, sequencer-addBinding, sequencer-setKeyframe, sequencer-getInfo, sequencer-exportFBX, sequencer-importFBX | 8 |
| [Widget](#widget) | widget-create, widget-getInfo, widget-addElement, widget-setProperty, widget-getBindings, widget-listWidgets | 6 |
| [Texture](#texture) | texture-import, texture-getInfo, texture-setCompression, texture-createRenderTarget, texture-resize, texture-listTextures | 6 |
| [Niagara](#niagara) | niagara-createSystem, niagara-getInfo, niagara-addEmitter, niagara-setParameter, niagara-compile, niagara-listSystems | 6 |
| [Audio](#audio) | audio-import, audio-createCue, audio-getInfo, audio-setAttenuation, audio-createMetaSound, audio-listAssets | 6 |
| [Landscape](#landscape) | landscape-create, landscape-importHeightmap, landscape-exportHeightmap, landscape-getInfo, landscape-setMaterial | 5 |
| [Physics](#physics) | physics-createAsset, physics-getInfo, physics-setProfile, physics-createMaterial, physics-setConstraint | 5 |
| [WorldPartition](#worldpartition) | worldpartition-getInfo, worldpartition-setConfig, worldpartition-createDataLayer, worldpartition-createHLOD | 4 |
| [Foliage](#foliage) | foliage-createType, foliage-getInfo, foliage-setProperties | 3 |
| [GeometryScript](#geometryscript) | geoscript-meshBoolean, geoscript-meshTransform, geoscript-getInfo | 3 |
| [Curve](#curve) | curve-create, curve-setKeys, curve-getInfo | 3 |
| [PCG](#pcg) | pcg-createGraph, pcg-getInfo, pcg-addNode, pcg-connectNodes | 4 |
| [Workflow](#workflow) | workflow-createCharacter, workflow-createUIScreen, workflow-setupLevel, workflow-createInteractable, workflow-createProjectile, workflow-setupMultiplayer, workflow-createInventorySystem, workflow-createDialogueSystem | 8 |
| [Analyze](#analyze) | analyze-blueprintComplexity, analyze-assetHealth, analyze-performanceHints, analyze-codeConventions | 4 |
| [Refactor](#refactor) | refactor-renameChain | 1 |
| [Context](#context) | context-autoGather, context-getManifest, context-getChains, context-learnWorkflow, context-matchIntent, context-getWorkflows, context-recordOutcome, context-learnFromDocs, context-getOutcomeStats, context-recordResolution, context-matchError, context-markResolutionReused, context-listResolutions | 13 |

---

## Editor

### editor-ping

Ping the Unreal Engine editor to verify connectivity. Returns "pong" if the UE plugin is connected.

**Parameters:** none

**Safety:** `Safe`

---

### editor-getLevelInfo

Get information about the currently loaded level in the Unreal Editor.

**Parameters:** none

**Safety:** `Safe`

---

### editor-listActors

List actors in the current Unreal Editor level with optional class name and tag filters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| className | string | No | Filter actors by class name |
| tag | string | No | Filter actors by tag |

**Safety:** `Safe`

---

### editor-getAssetInfo

Get metadata for a specific asset in the Unreal Editor project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Asset path (e.g., /Game/BP_TestActor) |

**Safety:** `Safe`

---

### editor-getSelection

Get currently selected actors and optionally content browser assets.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetSelection | boolean | No | Also return selected content browser assets |

**Safety:** `Safe`

---

### editor-getViewport

Get viewport camera location, rotation, and FOV.

**Parameters:** none

**Safety:** `Safe`

---

### editor-setSelection

Set actor selection in the viewport.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorNames | string[] | Yes | Actor names to select |
| deselectOthers | boolean | No | Deselect all others before selecting |

**Safety:** `Safe`

---

### editor-getRecentActivity

Get recently modified assets and opened levels.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| count | integer | No | Number of recent items (default 10) |

**Safety:** `Safe`

---

### editor-batchOperation

Apply batch operation to multiple assets/actors.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| operation | enum | Yes | Operation type: rename, move, setProperty, tag |
| targets | string[] | Yes | Asset/actor names to operate on |
| args | object | No | Operation-specific arguments |

**Safety:** `Warning`

---

## Blueprint

### blueprint-serialize

Serialize a Blueprint to JSON AST. Returns a cache key and summary (full data cached server-side).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Blueprint asset path (e.g., /Game/BP_TestActor) |
| graphName | string | No | Specific graph name to serialize |

**Safety:** `Safe`

---

### blueprint-createNode

Create a new Blueprint node in a graph.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blueprintCacheKey | string | Yes | Cache key from blueprint-serialize |
| graphName | string | Yes | Target graph name |
| nodeClass | string | Yes | Node class (e.g., K2Node_CallFunction) |
| functionOwnerClass | string | No | Owner class for K2Node_CallFunction (e.g., Actor, KismetMathLibrary) |
| functionName | string | No | Function name for K2Node_CallFunction (e.g., AddActorLocalRotation) |
| posX | integer | No | X position |
| posY | integer | No | Y position |

**Safety:** `Warning`

---

### blueprint-connectPins

Connect two Blueprint pins using TryCreateConnection.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blueprintCacheKey | string | Yes | Cache key from blueprint-serialize |
| sourcePinId | string | Yes | Source pin UUID |
| targetPinId | string | Yes | Target pin UUID |

**Safety:** `Warning`

---

### blueprint-modifyProperty

Modify a property value on a Blueprint node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blueprintCacheKey | string | Yes | Cache key from blueprint-serialize |
| nodeId | string | Yes | Node UUID |
| propertyName | string | Yes | Property name to modify |
| propertyValue | string | Yes | New property value |

**Safety:** `Warning`

---

### blueprint-deleteNode

Delete a Blueprint node by its UUID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blueprintCacheKey | string | Yes | Cache key from blueprint-serialize |
| nodeId | string | Yes | Node UUID to delete |

**Safety:** `Dangerous` — requires approval

---

## Compilation

### compilation-trigger

Trigger a Live Coding compilation in the Unreal Editor.

**Parameters:** none

**Safety:** `Warning`

---

### compilation-getStatus

Get the status of the current or last compilation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| compileId | string | No | Compile ID to check |

**Safety:** `Safe`

---

### compilation-getErrors

Get structured compile errors from the last compilation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| compileId | string | No | Compile ID to check |

**Safety:** `Safe`

---

### compilation-selfHeal

Get current compile errors and self-healing context. Returns errors, retry count, and suggestion for Claude to act on.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filePath | string | No | File path with errors (for retry tracking) |

**Safety:** `Warning`

---

## File

### file-read

Read a source file from the Unreal Engine project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filePath | string | Yes | File path to read |
| offset | integer | No | Line offset to start reading from |
| limit | integer | No | Maximum number of lines to read |

**Safety:** `Safe`

---

### file-write

Write content to a source file in the Unreal Engine project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filePath | string | Yes | File path to write |
| content | string | Yes | File content |

**Safety:** `Warning` (production Content paths are `Dangerous` — requires approval)

---

### file-search

Search for files or patterns in the Unreal Engine project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| pattern | string | Yes | Search pattern |
| directory | string | No | Directory to search in |
| glob | string | No | Glob pattern filter |

**Safety:** `Safe`

---

## Slate

### slate-validate

Validate Slate C++ code for common errors (unbalanced SNew, missing SLATE_END_ARGS, etc.).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | Yes | Slate C++ code to validate |

**Safety:** `Safe`

---

### slate-generate

Get relevant Slate templates and style guide for widget generation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Widget description (e.g., "list view with checkboxes") |
| widgetName | string | No | Widget name hint |

**Safety:** `Safe`

---

### slate-listTemplates

List all available Slate widget templates.

**Parameters:** none

**Safety:** `Safe`

---

## Chat

### chat-sendMessage

Send a message through the in-editor chat panel.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| text | string | Yes | Message text to send |

**Safety:** `Safe`

---

## Python

### python-execute

Execute a named Python script from the UMA plugin Content/Python/uma/ directory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| script | string | Yes | Script name without .py (e.g., "blueprint_setup_spinning_cube") |
| args | object | No | Arguments to pass to the script |

**Safety:** `Warning`

---

## Project

### project-getStructure

Get project directory tree with asset type counts.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | No | Root path (default: /Game/) |

**Safety:** `Safe`

---

### project-getSettings

Get project settings (engine config, maps, etc.).

**Parameters:** none

**Safety:** `Safe`

---

### project-getPlugins

List enabled/disabled plugins.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| enabledOnly | boolean | No | Only show enabled plugins |

**Safety:** `Safe`

---

### project-getDependencyGraph

Get asset reference/dependency graph.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Asset path to query dependencies for |

**Safety:** `Safe`

---

### project-getClassHierarchy

Get Blueprint/C++ class inheritance tree.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| rootClass | string | No | Root class to start from |

**Safety:** `Safe`

---

### project-snapshot

Get comprehensive project summary (cached 5 min).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| forceRefresh | boolean | No | Force refresh cached snapshot |

**Safety:** `Safe`

---

## Asset

### asset-create

Create a new UE asset (Blueprint, Material, DataTable, etc.).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetName | string | Yes | Asset name |
| assetPath | string | Yes | Content path (e.g., /Game/Blueprints) |
| assetType | string | Yes | Asset type |
| parentClass | string | No | Parent class for Blueprints |

**Safety:** `Warning`

---

### asset-duplicate

Duplicate an existing asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sourcePath | string | Yes | Source asset path |
| destinationPath | string | Yes | Destination path |
| newName | string | Yes | New asset name |

**Safety:** `Warning`

---

### asset-rename

Rename/move an asset with reference fixing.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Current asset path |
| newName | string | Yes | New name |

**Safety:** `Dangerous` — requires approval

---

### asset-delete

Delete an asset (with dependency check).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Asset path to delete |
| forceDelete | boolean | No | Force delete without dependency check |

**Safety:** `Dangerous` — requires approval

---

### asset-import

Import external file (FBX, PNG, WAV, etc.) as UE asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filePath | string | Yes | External file path |
| destinationPath | string | Yes | Content path |
| assetName | string | No | Asset name override |

**Safety:** `Warning`

---

### asset-export

Export asset to external format.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Asset path |
| outputPath | string | Yes | Output file path |

**Safety:** `Safe`

---

### asset-getReferences

Get all assets referencing/referenced by target.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Asset path |

**Safety:** `Safe`

---

### asset-setMetadata

Set asset tags/metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Asset path |
| key | string | Yes | Metadata key |
| value | string | Yes | Metadata value |

**Safety:** `Warning`

---

## Content

### content-listAssets

List assets with filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | No | Content path |
| assetType | string | No | Filter by type |
| recursive | boolean | No | Recurse into subdirectories |

**Safety:** `Safe`

---

### content-findAssets

Search assets by name, type, or metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search query |
| assetType | string | No | Filter by asset type |
| path | string | No | Content path to search in |

**Safety:** `Safe`

---

### content-getAssetDetails

Deep inspection of any asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Asset path |

**Safety:** `Safe`

---

### content-validateAssets

Run asset validation checks.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| paths | string[] | No | Asset paths to validate (all if omitted) |

**Safety:** `Safe`

---

## Actor

### actor-spawn

Spawn actor in current level.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| className | string | Yes | Actor class or Blueprint path |
| location | object {x, y, z} | No | Spawn location |
| rotation | object {pitch, yaw, roll} | No | Spawn rotation |
| label | string | No | Actor label |

**Safety:** `Warning`

---

### actor-delete

Delete actor(s) from level.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorName | string | Yes | Actor name to delete |

**Safety:** `Dangerous` — requires approval

---

### actor-setTransform

Set actor location/rotation/scale.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorName | string | Yes | Actor name |
| location | object {x, y, z} | No | New location |
| rotation | object {pitch, yaw, roll} | No | New rotation |
| scale | object {x, y, z} | No | New scale |

**Safety:** `Warning`

---

### actor-getProperties

Read all editable properties of an actor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorName | string | Yes | Actor name |

**Safety:** `Safe`

---

### actor-setProperty

Set a specific property on an actor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorName | string | Yes | Actor name |
| propertyName | string | Yes | Property name |
| propertyValue | string | Yes | New value |

**Safety:** `Warning`

---

### actor-getComponents

List all components on an actor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorName | string | Yes | Actor name |

**Safety:** `Safe`

---

### actor-addComponent

Add a component to an actor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorName | string | Yes | Actor name |
| componentClass | string | Yes | Component class |
| componentName | string | No | Component name override |

**Safety:** `Warning`

---

### actor-setArrayRef

Set an array-of-actor-references property (e.g., PatrolPoints).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorName | string | Yes | Actor name |
| propertyName | string | Yes | Array property name |
| actorNames | string[] | Yes | Actor names/labels to assign |

**Safety:** `Warning`

---

### actor-select

Select/deselect actors in viewport.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actorNames | string[] | Yes | Actor names to select |
| deselectOthers | boolean | No | Deselect all others first |

**Safety:** `Safe`

---

## Level

### level-create

Create a new level/map.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| levelName | string | Yes | Level name |
| templatePath | string | No | Template level path |

**Safety:** `Warning`

---

### level-open

Open an existing level.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| levelPath | string | Yes | Level path |

**Safety:** `Warning`

---

### level-save

Save current level.

**Parameters:** none

**Safety:** `Warning`

---

### level-addSublevel

Add streaming sublevel.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| levelPath | string | Yes | Sublevel path |
| streamingMethod | string | No | Streaming method |

**Safety:** `Warning`

---

### level-getWorldSettings

Get world settings for current level.

**Parameters:** none

**Safety:** `Safe`

---

## Material

### material-create

Create new material.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| materialName | string | Yes | Material name |
| materialPath | string | Yes | Content path |
| materialType | string | No | Material type |

**Safety:** `Warning`

---

### material-setParameter

Set material parameter value.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| materialPath | string | Yes | Content path to material |
| parameterName | string | Yes | Parameter name |
| value | any | Yes | Parameter value |
| parameterType | string | No | Parameter type hint |

**Safety:** `Warning`

---

### material-getParameters

List material parameters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| materialPath | string | Yes | Content path to material |

**Safety:** `Safe`

---

### material-createInstance

Create material instance from parent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| parentPath | string | Yes | Parent material path |
| instanceName | string | Yes | Instance name |
| instancePath | string | Yes | Content path for instance |

**Safety:** `Warning`

---

### material-setTexture

Assign texture to material.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| materialPath | string | Yes | Content path to material |
| parameterName | string | Yes | Texture parameter name |
| texturePath | string | Yes | Content path to texture |

**Safety:** `Warning`

---

### material-getNodes

Get material graph nodes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| materialPath | string | Yes | Content path to material |

**Safety:** `Safe`

---

## Mesh

### mesh-getInfo

Get mesh details (verts, tris, LODs, materials).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meshPath | string | Yes | Content path to mesh |

**Safety:** `Safe`

---

### mesh-setMaterial

Assign material to mesh slot.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meshPath | string | Yes | Content path to mesh |
| materialPath | string | Yes | Content path to material |
| slotIndex | integer | No | Material slot index |

**Safety:** `Warning`

---

### mesh-generateCollision

Generate collision for static mesh.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meshPath | string | Yes | Content path to mesh |
| collisionType | string | No | Collision type |

**Safety:** `Warning`

---

### mesh-setLOD

Configure LOD settings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meshPath | string | Yes | Content path to mesh |
| lodIndex | integer | Yes | LOD level index |
| screenSize | number | No | Screen size threshold |
| reductionPercent | number | No | Triangle reduction percentage |

**Safety:** `Warning`

---

## DataTable

### datatable-create

Create new DataTable.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tableName | string | Yes | DataTable name |
| tablePath | string | Yes | Content path |
| rowStructPath | string | Yes | Row struct asset path |

**Safety:** `Warning`

---

### datatable-addRow

Add/modify DataTable row.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tablePath | string | Yes | Content path to DataTable |
| rowName | string | Yes | Row name/key |
| rowData | object | Yes | Row data as key-value pairs |

**Safety:** `Warning`

---

### datatable-getRows

Read all DataTable rows.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tablePath | string | Yes | Content path to DataTable |

**Safety:** `Safe`

---

### datatable-removeRow

Remove DataTable row.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tablePath | string | Yes | Content path to DataTable |
| rowName | string | Yes | Row name to remove |

**Safety:** `Dangerous` — requires approval

---

## Animation

### anim-listMontages

List animation montages.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skeletonPath | string | No | Filter by skeleton path |

**Safety:** `Safe`

---

### anim-getBlendSpace

Get blend space details.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blendSpacePath | string | Yes | Content path to blend space |

**Safety:** `Safe`

---

### anim-createMontage

Create animation montage.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| montageName | string | Yes | Montage name |
| montagePath | string | Yes | Content path |
| sequencePath | string | Yes | Animation sequence to base montage on |

**Safety:** `Warning`

---

### anim-listSequences

List animation sequences.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skeletonPath | string | No | Filter by skeleton path |

**Safety:** `Safe`

---

### anim-getSkeletonInfo

Get skeleton bone hierarchy.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skeletonPath | string | Yes | Content path to skeleton |

**Safety:** `Safe`

---

## Gameplay

### gameplay-getGameMode

Get current game mode.

**Parameters:** none

**Safety:** `Safe`

---

### gameplay-setGameMode

Set game mode for current level.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| gameModePath | string | Yes | Content path to GameMode Blueprint |

**Safety:** `Warning`

---

### gameplay-listInputActions

List all input action mappings.

**Parameters:** none

**Safety:** `Safe`

---

### gameplay-addInputAction

Add input action mapping.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionName | string | Yes | Action name |
| key | string | Yes | Key binding |
| shift | boolean | No | Require Shift modifier |
| ctrl | boolean | No | Require Ctrl modifier |
| alt | boolean | No | Require Alt modifier |

**Safety:** `Warning`

---

## SourceControl

### sourcecontrol-getStatus

Get source control status of assets.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPaths | string[] | No | Asset paths to check (all if omitted) |

**Safety:** `Safe`

---

### sourcecontrol-checkout

Check out assets for editing.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPaths | string[] | Yes | Asset paths to check out |

**Safety:** `Warning`

---

### sourcecontrol-diff

Get diff summary for modified asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Asset path |

**Safety:** `Safe`

---

## Build

### build-lightmaps

Trigger lightmap build.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| quality | string | No | Quality level: Preview, Medium, High, Production |

**Safety:** `Warning`

---

### build-getMapCheck

Run map check and return warnings/errors.

**Parameters:** none

**Safety:** `Safe`

---

### build-cookContent

Trigger content cooking for target platform.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| platform | string | No | Target platform (e.g., Windows, Android) |

**Safety:** `Dangerous` — requires approval

---

## Debug

### debug-execConsole

Execute UE console command (dangerous).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| command | string | Yes | Console command to execute |

**Safety:** `Dangerous` — requires approval

---

### debug-getLog

Get recent output log entries.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | No | Log category filter |
| count | integer | No | Number of entries to return |

**Safety:** `Safe`

---

### debug-getPerformance

Get frame time, draw calls, memory stats.

**Parameters:** none

**Safety:** `Safe`

---

## AI

### ai-createBehaviorTree

Create a new BehaviorTree asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| treeName | string | Yes | BehaviorTree name |
| treePath | string | Yes | Content path |

**Safety:** `Warning`

---

### ai-createBlackboard

Create a new Blackboard asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blackboardName | string | Yes | Blackboard name |
| blackboardPath | string | Yes | Content path |

**Safety:** `Warning`

---

### ai-getBehaviorTreeInfo

Get metadata for a BehaviorTree asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| treePath | string | Yes | Content path to BehaviorTree |

**Safety:** `Safe`

---

### ai-getBlackboardKeys

Get all keys from a Blackboard asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blackboardPath | string | Yes | Content path to Blackboard |

**Safety:** `Safe`

---

### ai-addBlackboardKey

Add a key to a Blackboard asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blackboardPath | string | Yes | Content path to Blackboard |
| keyName | string | Yes | Key name |
| keyType | string | Yes | Key type (e.g., Object, Bool, Float, Vector) |

**Safety:** `Warning`

---

### ai-configureNavMesh

Configure RecastNavMesh settings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| agentRadius | number | No | Agent radius |
| agentHeight | number | No | Agent height |
| cellSize | number | No | Voxel cell size |

**Safety:** `Warning`

---

### ai-getNavMeshInfo

Get current RecastNavMesh configuration.

**Parameters:** none

**Safety:** `Safe`

---

### ai-createEQS

Create a new Environment Query System asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| queryName | string | Yes | EQS query name |
| queryPath | string | Yes | Content path |

**Safety:** `Warning`

---

## Sequencer

### sequencer-create

Create a new Level Sequence asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sequenceName | string | Yes | Sequence name |
| sequencePath | string | Yes | Content path |

**Safety:** `Warning`

---

### sequencer-open

Open Level Sequence in Sequencer editor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sequencePath | string | Yes | Sequence asset path |

**Safety:** `Warning`

---

### sequencer-addTrack

Add a track to a Level Sequence.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sequencePath | string | Yes | Sequence asset path |
| trackType | string | Yes | Track type (e.g., Transform, Audio, Event) |
| objectPath | string | No | Actor/object to bind the track to |

**Safety:** `Warning`

---

### sequencer-addBinding

Add actor binding (possessable/spawnable) to a Level Sequence.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sequencePath | string | Yes | Sequence asset path |
| actorName | string | Yes | Actor name to bind |
| bindingType | string | No | possessable or spawnable (default: possessable) |

**Safety:** `Warning`

---

### sequencer-setKeyframe

Set a keyframe value on a sequencer track.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sequencePath | string | Yes | Sequence asset path |
| trackName | string | Yes | Track display name |
| time | number | Yes | Time in seconds |
| value | any | Yes | Keyframe value |

**Safety:** `Warning`

---

### sequencer-getInfo

Get Level Sequence metadata (tracks, bindings, frame range).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sequencePath | string | Yes | Sequence asset path |

**Safety:** `Safe`

---

### sequencer-exportFBX

Export Level Sequence animation to FBX.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sequencePath | string | Yes | Sequence asset path |
| outputPath | string | Yes | Output FBX file path |

**Safety:** `Safe`

---

### sequencer-importFBX

Import FBX animation into Level Sequence.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sequencePath | string | Yes | Sequence asset path |
| fbxPath | string | Yes | Input FBX file path |

**Safety:** `Warning`

---

## Widget

### widget-create

Create a new Widget Blueprint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| widgetName | string | Yes | Widget name |
| widgetPath | string | Yes | Content path |
| parentClass | string | No | Parent widget class |

**Safety:** `Warning`

---

### widget-getInfo

Get Widget Blueprint info (widget tree, bindings).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| widgetPath | string | Yes | Widget Blueprint path |

**Safety:** `Safe`

---

### widget-addElement

Add a UI element to a Widget Blueprint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| widgetPath | string | Yes | Widget Blueprint path |
| elementType | string | Yes | Element type (TextBlock, Button, Image, etc.) |
| elementName | string | Yes | Element name |
| parentName | string | No | Parent element name |

**Safety:** `Warning`

---

### widget-setProperty

Set a property on a Widget Blueprint element.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| widgetPath | string | Yes | Widget Blueprint path |
| elementName | string | Yes | Element name |
| propertyName | string | Yes | Property name |
| propertyValue | string | Yes | Property value |

**Safety:** `Warning`

---

### widget-getBindings

Get property bindings and event dispatchers from a Widget Blueprint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| widgetPath | string | Yes | Widget Blueprint path |

**Safety:** `Safe`

---

### widget-listWidgets

List all Widget Blueprints in project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | No | Content path to search |
| recursive | boolean | No | Recurse into subdirectories |

**Safety:** `Safe`

---

## Texture

### texture-import

Import a texture file into the project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filePath | string | Yes | Source file path |
| destinationPath | string | Yes | Content path for imported texture |
| assetName | string | No | Override asset name |

**Safety:** `Warning`

---

### texture-getInfo

Get texture info: resolution, format, compression, LOD group.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| texturePath | string | Yes | Content path to texture asset |

**Safety:** `Safe`

---

### texture-setCompression

Set compression settings on a texture asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| texturePath | string | Yes | Content path to texture asset |
| compressionType | string | Yes | Compression type (e.g. Default, Normalmap, HDR, Alpha) |

**Safety:** `Warning`

---

### texture-createRenderTarget

Create a Render Target 2D asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetName | string | Yes | Asset name |
| assetPath | string | Yes | Content path |
| width | integer | Yes | Width in pixels |
| height | integer | Yes | Height in pixels |
| format | string | No | Pixel format (default RTF_RGBA16f) |

**Safety:** `Warning`

---

### texture-resize

Set max texture size and LOD bias.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| texturePath | string | Yes | Content path to texture asset |
| maxSize | integer | Yes | Max texture size (power of 2) |
| lodBias | integer | No | LOD bias value |

**Safety:** `Warning`

---

### texture-listTextures

List and filter texture assets in the project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| directory | string | No | Content directory to search |
| filter | string | No | Name filter pattern |

**Safety:** `Safe`

---

## Niagara

### niagara-createSystem

Create a new Niagara particle system asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| systemName | string | Yes | System asset name |
| systemPath | string | Yes | Content path |

**Safety:** `Warning`

---

### niagara-getInfo

Get Niagara system info: emitters, modules, parameters.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| systemPath | string | Yes | Content path to Niagara system |

**Safety:** `Safe`

---

### niagara-addEmitter

Add an emitter to a Niagara system.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| systemPath | string | Yes | Content path to Niagara system |
| emitterName | string | Yes | Emitter name |
| templatePath | string | No | Template emitter path |

**Safety:** `Warning`

---

### niagara-setParameter

Set a user parameter on a Niagara system.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| systemPath | string | Yes | Content path to Niagara system |
| parameterName | string | Yes | Parameter name |
| value | any | Yes | Parameter value |

**Safety:** `Warning`

---

### niagara-compile

Compile a Niagara system.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| systemPath | string | Yes | Content path to Niagara system |

**Safety:** `Warning`

---

### niagara-listSystems

List Niagara system assets in the project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| directory | string | No | Content directory to search |
| filter | string | No | Name filter pattern |

**Safety:** `Safe`

---

## Audio

### audio-import

Import an audio file into the project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| filePath | string | Yes | Source audio file path |
| destinationPath | string | Yes | Content path for imported audio |
| assetName | string | No | Override asset name |

**Safety:** `Warning`

---

### audio-createCue

Create a Sound Cue asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| cueName | string | Yes | Sound Cue name |
| cuePath | string | Yes | Content path |
| soundWavePath | string | No | SoundWave to assign |

**Safety:** `Warning`

---

### audio-getInfo

Get audio asset info: duration, channels, sample rate.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| audioPath | string | Yes | Content path to audio asset |

**Safety:** `Safe`

---

### audio-setAttenuation

Configure distance attenuation on an audio asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| audioPath | string | Yes | Content path to audio asset |
| innerRadius | number | No | Inner radius |
| outerRadius | number | No | Outer radius |
| falloffDistance | number | No | Falloff distance |

**Safety:** `Warning`

---

### audio-createMetaSound

Create a MetaSound source asset (UE5+).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetName | string | Yes | MetaSound asset name |
| assetPath | string | Yes | Content path |

**Safety:** `Warning`

---

### audio-listAssets

List audio assets in the project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| directory | string | No | Content directory to search |
| filter | string | No | Name filter pattern |
| assetType | string | No | Filter by type: SoundWave, SoundCue, MetaSound |

**Safety:** `Safe`

---

## Landscape

### landscape-create

Create a new landscape actor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| landscapeName | string | Yes | Landscape name |
| sectionSize | integer | No | Section size (default 63) |
| componentsX | integer | No | Components in X |
| componentsY | integer | No | Components in Y |
| heightmapPath | string | No | Optional heightmap file to import |

**Safety:** `Warning`

---

### landscape-importHeightmap

Import a heightmap to an existing landscape.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| landscapeName | string | Yes | Landscape actor name |
| heightmapPath | string | Yes | Heightmap file path |

**Safety:** `Warning`

---

### landscape-exportHeightmap

Export heightmap from a landscape.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| landscapeName | string | Yes | Landscape actor name |
| exportPath | string | Yes | Output file path |

**Safety:** `Safe`

---

### landscape-getInfo

Get landscape info: components, size, layers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| landscapeName | string | No | Landscape actor name (default: first found) |

**Safety:** `Safe`

---

### landscape-setMaterial

Assign a material to a landscape.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| landscapeName | string | Yes | Landscape actor name |
| materialPath | string | Yes | Content path to material |

**Safety:** `Warning`

---

## Physics

### physics-createAsset

Create a PhysicsAsset for a skeletal mesh.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetName | string | Yes | Asset name |
| assetPath | string | Yes | Content path |
| skeletalMeshPath | string | No | Skeletal mesh to generate physics for |

**Safety:** `Warning`

---

### physics-getInfo

Get physics asset info: bodies, constraints, profiles.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| physicsAssetPath | string | Yes | Content path to PhysicsAsset |

**Safety:** `Safe`

---

### physics-setProfile

Set collision profile on a physics body.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Content path to PhysicsAsset |
| bodyName | string | Yes | Body name |
| profileName | string | Yes | Collision profile name |

**Safety:** `Warning`

---

### physics-createMaterial

Create a PhysicalMaterial asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| materialName | string | Yes | Material name |
| materialPath | string | Yes | Content path |
| friction | number | No | Friction coefficient |
| restitution | number | No | Restitution (bounciness) |

**Safety:** `Warning`

---

### physics-setConstraint

Configure a physics constraint.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| physicsAssetPath | string | Yes | Content path to PhysicsAsset |
| constraintName | string | Yes | Constraint name |
| linearLimit | number | No | Linear motion limit |
| angularLimit | number | No | Angular motion limit in degrees |

**Safety:** `Warning`

---

## WorldPartition

### worldpartition-getInfo

Get World Partition configuration and data layers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| levelPath | string | No | Level path (default: current) |

**Safety:** `Safe`

---

### worldpartition-setConfig

Set World Partition grid and loading settings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| gridSize | number | No | Grid cell size |
| loadingRange | number | No | Loading range |
| cellSize | number | No | Cell size |

**Safety:** `Warning`

---

### worldpartition-createDataLayer

Create a new World Partition data layer.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| layerName | string | Yes | Data layer name |
| layerType | string | No | Layer type |

**Safety:** `Warning`

---

### worldpartition-createHLOD

Create an HLOD layer configuration.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| layerName | string | Yes | HLOD layer name |
| hlodSetupAsset | string | No | HLOD setup asset path |

**Safety:** `Warning`

---

## Foliage

### foliage-createType

Create a FoliageType asset.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| typeName | string | Yes | Foliage type name |
| typePath | string | Yes | Content path |
| meshPath | string | Yes | Static mesh path to use |

**Safety:** `Warning`

---

### foliage-getInfo

Get foliage type settings and density info.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| foliageTypePath | string | Yes | Content path to FoliageType |

**Safety:** `Safe`

---

### foliage-setProperties

Set foliage density, scale, and culling properties.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| foliageTypePath | string | Yes | Content path to FoliageType |
| density | number | No | Foliage density |
| scale | number | No | Scale multiplier |
| cullDistance | number | No | Cull distance |

**Safety:** `Warning`

---

## GeometryScript

### geoscript-meshBoolean

Perform mesh boolean operation (UE 5.1+).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| targetMesh | string | Yes | Target mesh path |
| toolMesh | string | Yes | Tool mesh path |
| operation | enum | Yes | Boolean operation: union, subtract, intersect |

**Safety:** `Warning`

---

### geoscript-meshTransform

Transform, simplify, or remesh a mesh (UE 5.1+).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meshPath | string | Yes | Mesh asset path |
| operation | enum | Yes | Operation type: simplify, remesh, transform |
| params | object | No | Operation-specific parameters |

**Safety:** `Warning`

---

### geoscript-getInfo

Get mesh geometry info: vertex/tri count, bounds.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| meshPath | string | Yes | Mesh asset path |

**Safety:** `Safe`

---

## Curve

### curve-create

Create a curve asset (float, vector, or linear color).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| curveName | string | Yes | Curve name |
| curvePath | string | Yes | Content path |
| curveType | enum | No | Type: float, vector, linear (default: float) |

**Safety:** `Warning`

---

### curve-setKeys

Add or modify keyframes on a curve.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| curvePath | string | Yes | Content path to curve |
| keys | array of {time, value} | Yes | Array of keyframes |

**Safety:** `Warning`

---

### curve-getInfo

Get curve data, key count, and time range.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| curvePath | string | Yes | Content path to curve |

**Safety:** `Safe`

---

## PCG

### pcg-createGraph

Create a PCG graph asset (UE 5.2+).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| graphName | string | Yes | Graph name |
| graphPath | string | Yes | Content path |

**Safety:** `Warning`

---

### pcg-getInfo

Get PCG graph info: nodes, connections, settings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| graphPath | string | Yes | Content path to PCG graph |

**Safety:** `Safe`

---

### pcg-addNode

Add a node to a PCG graph.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| graphPath | string | Yes | Content path to PCG graph |
| nodeType | string | Yes | Node type to add |
| nodeLabel | string | No | Node label |

**Safety:** `Warning`

---

### pcg-connectNodes

Connect two nodes in a PCG graph.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| graphPath | string | Yes | Content path to PCG graph |
| sourceNode | string | Yes | Source node name |
| sourcePin | string | Yes | Source pin name |
| targetNode | string | Yes | Target node name |
| targetPin | string | Yes | Target pin name |

**Safety:** `Warning`

---

## Workflow

### workflow-createCharacter

Scaffold a playable character: Blueprint, mesh, anim BP, inputs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| characterName | string | Yes | Character name |
| basePath | string | Yes | Content path for generated assets |
| meshPath | string | No | Skeletal mesh to assign |

**Safety:** `Warning`

---

### workflow-createUIScreen

Create a UI screen Widget Blueprint with layout template.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| screenName | string | Yes | Screen name |
| screenPath | string | Yes | Content path |
| screenType | enum | No | Type: hud, menu, inventory |

**Safety:** `Warning`

---

### workflow-setupLevel

Create a level with core actors (player start, lights, sky).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| levelName | string | Yes | Level name |
| levelPath | string | Yes | Content path |
| includePlayerStart | boolean | No | Include PlayerStart (default true) |
| includeLighting | boolean | No | Include default lighting (default true) |

**Safety:** `Warning`

---

### workflow-createInteractable

Create an interactable actor with overlap/interaction component.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| interactableName | string | Yes | Actor name |
| basePath | string | Yes | Content path |
| interactionType | string | No | Interaction type |

**Safety:** `Warning`

---

### workflow-createProjectile

Create a projectile actor with movement, collision, damage.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectileName | string | Yes | Projectile name |
| basePath | string | Yes | Content path |
| speed | number | No | Projectile speed |
| damage | number | No | Damage amount |

**Safety:** `Warning`

---

### workflow-setupMultiplayer

Scaffold multiplayer: GameMode, PlayerState, GameState.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| gameName | string | Yes | Game name prefix |
| basePath | string | Yes | Content path |
| maxPlayers | integer | No | Max player count |

**Safety:** `Warning`

---

### workflow-createInventorySystem

Create inventory system: DataTable, struct, component BP.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| systemName | string | Yes | System name |
| basePath | string | Yes | Content path |
| maxSlots | integer | No | Max inventory slots |

**Safety:** `Warning`

---

### workflow-createDialogueSystem

Create dialogue system: DataTable, widget BP, manager BP.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| systemName | string | Yes | System name |
| basePath | string | Yes | Content path |

**Safety:** `Warning`

---

## Analyze

### analyze-blueprintComplexity

Analyze Blueprint complexity: node count, nesting, cyclomatic.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| blueprintPath | string | Yes | Content path to Blueprint |

**Safety:** `Safe`

---

### analyze-assetHealth

Analyze asset health: unused, broken refs, oversized textures.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| directory | string | No | Content directory to scan |
| includeUnused | boolean | No | Include unused asset detection |

**Safety:** `Safe`

---

### analyze-performanceHints

Get performance hints: draw calls, texture memory, mesh complexity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| levelPath | string | No | Level to analyze (default: current) |

**Safety:** `Safe`

---

### analyze-codeConventions

Check naming conventions and folder structure compliance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| directory | string | No | Content directory to scan |

**Safety:** `Safe`

---

## Refactor

### refactor-renameChain

Rename asset and update all references + clean redirectors.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| assetPath | string | Yes | Content path to asset |
| newName | string | Yes | New asset name |
| updateReferences | boolean | No | Update all references (default true) |

**Safety:** `Dangerous` — requires approval

---

## Context

### context-autoGather

Gather comprehensive project context: info, code stats, content, conventions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| includeConventions | boolean | No | Include convention detection (default true) |
| includeViewport | boolean | No | Include viewport state (default true) |

**Safety:** `Safe`

---

### context-getManifest

Get the complete tool manifest with all tools, domains, and workflow chains.

**Parameters:** none

**Safety:** `Safe`

---

### context-getChains

Get available tool workflow chains and error recovery strategies.

**Parameters:** none

**Safety:** `Safe`

---

### context-learnWorkflow

Learn a new UE developer workflow from documentation or web research. Stores structured workflow with intent patterns and tool sequences.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Unique workflow identifier (e.g., "mat-create-decal") |
| name | string | Yes | Human-readable workflow name |
| description | string | Yes | What the workflow accomplishes |
| domain | string | Yes | Primary domain (blueprint, material, character, level, etc.) |
| difficulty | enum | No | Difficulty level: beginner, intermediate, advanced |
| intentPatterns | string[] | Yes | Natural language phrases that trigger this workflow |
| prerequisites | string[] | No | What must be true before starting |
| steps | array of {tool, purpose, optional?, repeat?} | Yes | Ordered sequence of tool calls |
| expectedOutcome | string | Yes | What the developer gets at the end |
| source | string | No | Where this workflow was learned from |
| tags | string[] | No | Search tags |

**Safety:** `Safe`

---

### context-matchIntent

Match a natural language description of developer intent to known UE workflows. Returns ranked recommendations with tool sequences.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Natural language description of what the developer wants to do |
| maxResults | number | No | Maximum number of matches to return (default 5) |

**Safety:** `Safe`

---

### context-getWorkflows

List all known UE developer workflows (built-in + learned). Optionally filter by domain or tag.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| domain | string | No | Filter by domain (blueprint, material, character, level, etc.) |
| tag | string | No | Filter by tag |

**Safety:** `Safe`

---

### context-recordOutcome

Record the outcome (success/failure) of a workflow execution. Builds outcome history for confidence-weighted recommendations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workflowId | string | Yes | ID of the workflow that was executed |
| success | boolean | Yes | Whether the workflow completed successfully |
| toolsUsed | string[] | No | List of tool names actually used during execution |
| durationMs | number | No | Total execution duration in milliseconds |
| notes | string | No | Additional notes about the outcome (errors, workarounds) |

**Safety:** `Warning`

---

### context-learnFromDocs

Extract and learn UE workflows from documentation content. Parses structured doc text into workflow definitions with tool sequences.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| domain | string | Yes | UE domain (blueprint, material, character, level, animation, etc.) |
| docContent | string | Yes | Documentation text content with numbered/bulleted steps describing a workflow |
| docSource | string | No | Source identifier (default: "epic-docs") |

**Safety:** `Safe`

---

### context-getOutcomeStats

Get outcome statistics for all tracked workflows. Shows success rates, trends, and execution counts.

**Parameters:** none

**Safety:** `Warning`

---

### context-recordResolution

Record a successful error resolution after troubleshooting. Captures the error, attempted fixes (including failures), the successful fix, and root cause. Future similar errors will receive this resolution as a recommendation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| errorMessage | string | Yes | The error message that was encountered |
| errorType | string | No | Error category (compile-error, asset-not-found, pin-connection-failure, etc.). Auto-inferred if omitted. |
| sourceTool | string | Yes | The MCP tool that produced the error (e.g., "blueprint-connectPins") |
| developerIntent | string | Yes | What the developer was trying to accomplish when the error occurred |
| attemptedFixes | array of {action, toolUsed?, result, notes?} | Yes | All fixes attempted, including failures |
| successfulFix | object {description, toolSequence, steps} | Yes | The fix that ultimately resolved the error |
| rootCause | string | Yes | Root cause analysis of why the error occurred |
| tags | string[] | No | Tags for searchability (e.g., ["mobility", "static-mesh"]) |

**Safety:** `Warning`

---

### context-matchError

Find matching past resolutions for a current error. Combines builtin recovery strategies with learned resolutions. Returns ranked recommendations with confidence scores and actions to avoid.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| errorMessage | string | Yes | The error message to find resolutions for |
| sourceTool | string | Yes | The tool that produced the error |
| errorType | string | No | Error category (auto-inferred if omitted) |
| maxResults | number | No | Maximum learned resolutions to return (default 5) |

**Safety:** `Safe`

---

### context-markResolutionReused

Mark a learned error resolution as successfully reused. Boosts its ranking for future similar errors.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| resolutionId | string | Yes | ID of the resolution that was successfully reused |

**Safety:** `Safe`

---

### context-listResolutions

List all stored error resolutions. Optionally filter by error type or source tool.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| errorType | string | No | Filter by error type |
| sourceTool | string | No | Filter by source tool |

**Safety:** `Safe`
