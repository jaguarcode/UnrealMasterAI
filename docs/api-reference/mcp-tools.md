# MCP Tools API Reference

**Version:** 1.0.0
**Last Updated:** 2026-03-06
**Status:** Complete (85 tools across 20 domains)

---

## Overview

Unreal Master Agent exposes 85 MCP tools organized across 20 functional domains. These tools enable Claude Code to query the Unreal Editor, manipulate Blueprints at the graph level, trigger compilation, generate Slate UI code, manage actors, materials, levels, assets, animations, and much more.

All tools communicate via a WebSocket bridge (Layer 2) to the C++ UE plugin (Layer 3) for execution on the GameThread. Extended tools (Phase 9) use Python automation scripts executed via the `python-execute` bridge.

### Tool Organization

| Domain | Tool Count | Purpose |
|--------|-----------|---------|
| Editor | 4 | Health checks, level queries, asset metadata |
| Blueprint | 5 | Serialize graphs, create/delete nodes, connect pins, modify properties |
| Compilation | 4 | Trigger compilation, check status, retrieve errors, self-heal |
| File | 3 | Read/write/search project files with safety checks |
| Slate | 3 | List templates, generate Slate C++ code, validate syntax |
| Chat | 1 | Send in-editor chat messages |
| Actor | 9 | Spawn, delete, properties, transform, components, selection |
| Material | 6 | Create materials/instances, parameters, textures, nodes |
| Mesh | 4 | Mesh info, set material, LOD management, collision generation |
| Level | 5 | Create, open, save, sublevels, world settings |
| Asset | 8 | Create, delete, duplicate, import, export, rename, references, metadata |
| Animation | 5 | List sequences/montages, create montage, blend spaces, skeleton info |
| Content | 4 | List assets, find assets, get details, validate assets |
| DataTable | 4 | Create, add row, get rows, remove row |
| Build | 3 | Build lightmaps, cook content, map check |
| Project | 6 | Structure, plugins, settings, class hierarchy, dependency graph, snapshot |
| Gameplay | 4 | Get/set game mode, list/add input actions |
| Python | 1 | Execute named Python scripts from `Content/Python/uma/` |
| Source Control | 3 | Status, checkout, diff |
| Debug | 3 | Console commands, logs, performance stats |

---

## Response Format

All MCP tool responses follow the standard MCP `CallToolResult` format:

```typescript
{
  content: [
    {
      type: "text",
      text: "<JSON string of the actual result>"
    }
  ]
}
```

The `text` field contains a JSON-encoded string with the tool's result or error:

**Success format:**
```json
{
  "status": "ok" | "pong" | "compiling",
  "result": { /* tool-specific result */ }
}
```

**Error format:**
```json
{
  "status": "error",
  "error": "<error message>"
}
```

---

## Error Handling

### Error Code Taxonomy

All errors returned by the MCP server and UE plugin use numeric codes in these ranges:

| Range | Category | Example |
|-------|----------|---------|
| 1000-1999 | Editor Errors | 1001: Level not loaded, 1002: Asset not found |
| 2000-2999 | Blueprint Errors | 2001: Invalid graph, 2002: Node class not found, 2003: Pin mismatch |
| 3000-3999 | Compilation Errors | 3001: Compile failed, 3002: Live Coding disabled |
| 4000-4999 | File Errors | 4001: Path traversal blocked, 4002: File not found, 4003: Permission denied |
| 5000-5999 | Safety Errors | 5001: Operation requires approval, 5002: Approval denied |
| 6000-6099 | WebSocket Errors | 6001: Bridge not connected, 6002: Request timeout, 6003: Invalid message format |

### Common Error Responses

```json
{
  "status": "error",
  "error": "1002: Asset not found at path /Game/MyBlueprint"
}
```

### Retry Strategy

For transient errors (6001, 6002), exponential backoff with jitter is recommended. Max retries: 3.
For safety errors (5001), obtain human approval before retrying.
For compile errors, use `compilation-selfHeal` tool for guided recovery.

---

## Editor Tools

### editor-ping

Health check. Verifies the WebSocket bridge is connected and returns Unreal Engine version.

**Parameters:** None

**Request:**
```json
{}
```

**Response (Success):**
```json
{
  "status": "pong",
  "result": {
    "ueVersion": "5.4.2",
    "timestamp": 1709670000000
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "6001: WebSocket bridge not connected"
}
```

**Safety:** SAFE — read-only, no state changes.

**Example Usage:**

Verify connection before executing critical tools.

```
> editor-ping
Response: { "status": "pong", "result": { "ueVersion": "5.4.2" } }
```

---

### editor-getLevelInfo

Returns metadata about the currently loaded level: name, actor count, BSP actor count, world composition info.

**Parameters:** None

**Request:**
```json
{}
```

**Response (Success):**
```json
{
  "levelName": "L_TestLevel",
  "actorCount": 42,
  "bspActorCount": 5,
  "staticMeshActorCount": 12,
  "dynamicActorCount": 25,
  "worldOrigin": { "x": 0.0, "y": 0.0, "z": 0.0 },
  "bounds": {
    "min": { "x": -5000.0, "y": -5000.0, "z": -1000.0 },
    "max": { "x": 5000.0, "y": 5000.0, "z": 5000.0 }
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "1001: No level currently loaded"
}
```

**Safety:** SAFE — read-only query.

**Example Usage:**

Check level info before placing actors.

```
> editor-getLevelInfo
Response: { "levelName": "L_TestLevel", "actorCount": 42, ... }
```

---

### editor-listActors

Lists all actors in the current level. Supports optional filtering by class or tag.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `className` | string | No | Filter by actor class (e.g., "ACharacter", "APawn") |
| `tag` | string | No | Filter by actor tag |

**Request (with filter):**
```json
{
  "className": "APawn"
}
```

**Response (Success):**
```json
{
  "count": 3,
  "actors": [
    {
      "name": "BP_Player_C",
      "class": "APawn",
      "position": { "x": 100.0, "y": 200.0, "z": 50.0 },
      "tags": ["Player", "Important"]
    },
    {
      "name": "BP_Enemy_1_C",
      "class": "APawn",
      "position": { "x": 500.0, "y": 600.0, "z": 100.0 },
      "tags": ["Enemy"]
    }
  ]
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "1001: No level currently loaded"
}
```

**Safety:** SAFE — read-only query.

**Example Usage:**

Find all pawn actors in the current level.

```
> editor-listActors { "className": "APawn" }
Response: { "count": 2, "actors": [...] }
```

---

### editor-getAssetInfo

Returns metadata for a specific asset by path: type, size, dependencies, modification time.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `assetPath` | string | Yes | UE asset path (e.g., "/Game/Blueprints/BP_TestActor") |

**Request:**
```json
{
  "assetPath": "/Game/Blueprints/BP_TestActor"
}
```

**Response (Success):**
```json
{
  "assetPath": "/Game/Blueprints/BP_TestActor",
  "assetName": "BP_TestActor",
  "assetClass": "Blueprint",
  "size": 4096,
  "modifyTime": 1709670000000,
  "dependencies": [
    "/Game/Blueprints/BP_Base",
    "/Script/CoreUObject.Object"
  ],
  "isLoaded": true
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "1002: Asset not found at /Game/Blueprints/BP_TestActor"
}
```

**Safety:** SAFE — read-only query.

**Example Usage:**

Check if an asset exists and get its dependencies.

```
> editor-getAssetInfo { "assetPath": "/Game/Blueprints/BP_TestActor" }
Response: { "assetPath": "/Game/Blueprints/BP_TestActor", ... }
```

---

## Blueprint Tools

### blueprint-serialize

Serializes a Blueprint graph to JSON AST format. Full serialization can be large (cached internally to avoid redundant network round trips).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `assetPath` | string | Yes | Blueprint asset path (e.g., "/Game/Blueprints/BP_TestActor") |
| `graphName` | string | No | Filter to specific graph (e.g., "EventGraph", "ConstructionScript"). Omit for all graphs. |

**Request:**
```json
{
  "assetPath": "/Game/Blueprints/BP_TestActor"
}
```

**Response (Success — Cached):**
```json
{
  "cacheKey": "bp:/Game/Blueprints/BP_TestActor",
  "cached": true,
  "summary": {
    "blueprintPath": "/Game/Blueprints/BP_TestActor",
    "graphCount": 2,
    "nodeCount": 18
  }
}
```

**Response (Success — Fresh):**
```json
{
  "cacheKey": "bp:/Game/Blueprints/BP_TestActor",
  "cached": false,
  "summary": {
    "blueprintPath": "/Game/Blueprints/BP_TestActor",
    "graphCount": 2,
    "nodeCount": 18
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "1002: Asset not found at /Game/Blueprints/BP_TestActor"
}
```

**Safety:** SAFE — read-only. Full AST stored in server cache (not returned inline).

**Caching:** Results cached by blueprint path. Cache key format: `bp:<assetPath>`. Subsequent calls within same session return cache summary.

**Example Usage:**

Serialize a Blueprint to get its graph structure.

```
> blueprint-serialize { "assetPath": "/Game/Blueprints/BP_TestActor" }
Response: { "cacheKey": "bp:/Game/Blueprints/BP_TestActor", "summary": { ... } }
```

---

### blueprint-createNode

Creates a new node in a Blueprint graph at specified coordinates. Returns the new node ID.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `blueprintCacheKey` | string | Yes | Cache key from `blueprint-serialize` (format: `bp:/Game/...`) |
| `graphName` | string | Yes | Target graph name (e.g., "EventGraph") |
| `nodeClass` | string | Yes | Node class (e.g., "K2Node_CallFunction", "K2Node_VariableGet") |
| `functionOwnerClass` | string | No | Owning class for function calls (e.g., "KismetSystemLibrary") |
| `functionName` | string | No | Function name (e.g., "PrintString") |
| `posX` | number | No | Canvas X position (pixels). Default: 0 |
| `posY` | number | No | Canvas Y position (pixels). Default: 0 |

**Request:**
```json
{
  "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
  "graphName": "EventGraph",
  "nodeClass": "K2Node_CallFunction",
  "functionOwnerClass": "KismetSystemLibrary",
  "functionName": "PrintString",
  "posX": 300,
  "posY": 200
}
```

**Response (Success):**
```json
{
  "nodeId": "K2Node_CallFunction_123",
  "nodeClass": "K2Node_CallFunction",
  "graphName": "EventGraph",
  "position": { "x": 300, "y": 200 },
  "pins": [
    { "pinId": "Then_123", "pinName": "Then", "direction": "output", "type": "exec" },
    { "pinId": "InString_123", "pinName": "InString", "direction": "input", "type": "string" }
  ]
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "2002: Node class 'K2Node_InvalidClass' not found"
}
```

**Safety:** WARN — modifies Blueprint. Consider snapshotting before calling multiple times in sequence.

**Example Usage:**

Create a PrintString node in the EventGraph.

```
> blueprint-createNode {
    "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
    "graphName": "EventGraph",
    "nodeClass": "K2Node_CallFunction",
    "functionOwnerClass": "KismetSystemLibrary",
    "functionName": "PrintString"
  }
Response: { "nodeId": "K2Node_CallFunction_123", ... }
```

---

### blueprint-connectPins

Connects two pins (source output to target input) via `TryCreateConnection`. Never uses `MakeLinkTo` (which bypasses validation).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `blueprintCacheKey` | string | Yes | Cache key from `blueprint-serialize` |
| `sourcePinId` | string | Yes | Source pin ID (output pin) |
| `targetPinId` | string | Yes | Target pin ID (input pin) |

**Request:**
```json
{
  "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
  "sourcePinId": "Then_100",
  "targetPinId": "InString_123"
}
```

**Response (Success):**
```json
{
  "connected": true,
  "sourcePinId": "Then_100",
  "targetPinId": "InString_123",
  "linkId": "Link_456"
}
```

**Response (Error — Type Mismatch):**
```json
{
  "status": "error",
  "error": "2003: Pin type mismatch: output(exec) cannot connect to input(string)"
}
```

**Safety:** WARN — modifies Blueprint connectivity. Validates pin types via `TryCreateConnection`.

**Pin Type Safety:** The underlying `TryCreateConnection` API validates type compatibility. Type mismatches are caught server-side before propagating to the editor.

**Example Usage:**

Connect BeginPlay output to a function call input.

```
> blueprint-connectPins {
    "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
    "sourcePinId": "Then_100",
    "targetPinId": "InString_123"
  }
Response: { "connected": true, "linkId": "Link_456" }
```

---

### blueprint-modifyProperty

Modifies a property on a specific node (e.g., set a default value, change a parameter).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `blueprintCacheKey` | string | Yes | Cache key from `blueprint-serialize` |
| `nodeId` | string | Yes | Target node ID |
| `propertyName` | string | Yes | Property name (e.g., "InString", "bPrintToScreen") |
| `propertyValue` | string | Yes | New property value (serialized as string) |

**Request:**
```json
{
  "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
  "nodeId": "K2Node_CallFunction_123",
  "propertyName": "InString",
  "propertyValue": "Hello World"
}
```

**Response (Success):**
```json
{
  "modified": true,
  "nodeId": "K2Node_CallFunction_123",
  "property": "InString",
  "oldValue": "Default String",
  "newValue": "Hello World"
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "2001: Invalid property 'InString' on node 'K2Node_CallFunction_123'"
}
```

**Safety:** WARN — modifies Blueprint. Property validation is performed on node.

**Example Usage:**

Set the message text for a PrintString node.

```
> blueprint-modifyProperty {
    "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
    "nodeId": "K2Node_CallFunction_123",
    "propertyName": "InString",
    "propertyValue": "Hello World"
  }
Response: { "modified": true, "newValue": "Hello World" }
```

---

### blueprint-deleteNode

Deletes a node from a Blueprint graph. **Requires human approval** due to destructive nature.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `blueprintCacheKey` | string | Yes | Cache key from `blueprint-serialize` |
| `nodeId` | string | Yes | Target node ID to delete |

**Request:**
```json
{
  "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
  "nodeId": "K2Node_CallFunction_123"
}
```

**Response (Success):**
```json
{
  "deleted": true,
  "nodeId": "K2Node_CallFunction_123",
  "orphanedLinks": 2
}
```

**Response (Error — Approval Denied):**
```json
{
  "status": "error",
  "error": "5002: Operation rejected: User denied deletion of node"
}
```

**Response (Error — Max Retries):**
```json
{
  "status": "error",
  "error": "2001: Cannot delete node K2Node_CallFunction_123"
}
```

**Safety:** DANGEROUS — destructive operation. Triggers approval gate (Slate dialog in UE Editor). Denied operations return error code 5002.

**Approval Flow:**
1. Tool handler calls `ApprovalGate.requestApproval()`
2. UE plugin displays modal dialog
3. User approves or denies
4. Response forwarded back to Claude Code

**Example Usage:**

Remove an unused node (requires manual approval).

```
> blueprint-deleteNode {
    "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
    "nodeId": "K2Node_CallFunction_123"
  }
[UE Editor shows approval dialog]
User approves...
Response: { "deleted": true, "orphanedLinks": 2 }
```

---

## Compilation Tools

### compilation-trigger

Triggers a Live Coding / Hot Reload compilation in the Unreal Editor. Compilation runs asynchronously.

**Parameters:** None

**Request:**
```json
{}
```

**Response (Success):**
```json
{
  "status": "compiling",
  "compileId": "compile_3f8a2c1e",
  "result": {
    "started": true,
    "timestamp": 1709670000000
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "3002: Live Coding module not available (requires UE 5.4+)"
}
```

**Safety:** WARN — initiates compilation. No code is modified; only triggers existing compile workflow.

**Async Compilation:** Compilation is non-blocking. Check status with `compilation-getStatus` using the returned `compileId`.

**Example Usage:**

Trigger recompilation after modifying source files.

```
> compilation-trigger
Response: { "status": "compiling", "compileId": "compile_3f8a2c1e" }

> compilation-getStatus { "compileId": "compile_3f8a2c1e" }
Response: { "status": "idle", "result": "success" }
```

---

### compilation-getStatus

Returns the current compilation status (idle, compiling, success, failed).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `compileId` | string | No | Specific compile ID from `compilation-trigger`. If omitted, returns latest compile status. |

**Request:**
```json
{
  "compileId": "compile_3f8a2c1e"
}
```

**Response (Success — Idle):**
```json
{
  "status": "idle",
  "result": "success",
  "timestamp": 1709670010000
}
```

**Response (Success — Compiling):**
```json
{
  "status": "compiling",
  "progress": 45,
  "message": "Compiling C++ code...",
  "timestamp": 1709670005000
}
```

**Response (Success — Failed):**
```json
{
  "status": "idle",
  "result": "failed",
  "errorCount": 3,
  "timestamp": 1709670015000
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "6001: Compile ID 'invalid_id' not found"
}
```

**Safety:** SAFE — read-only status query.

**Status Values:**
- `idle` — No compilation in progress
- `compiling` — Compilation active
- `success` — Last compilation completed without errors
- `failed` — Last compilation had errors (see `compilation-getErrors`)

**Example Usage:**

Poll compilation status until complete.

```
> compilation-getStatus { "compileId": "compile_3f8a2c1e" }
Response: { "status": "compiling", "progress": 45 }

[wait 2 seconds]

> compilation-getStatus { "compileId": "compile_3f8a2c1e" }
Response: { "status": "idle", "result": "success" }
```

---

### compilation-getErrors

Returns a list of compilation errors from the current or specified compile session.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `compileId` | string | No | Specific compile ID. If omitted, returns latest compile errors. |

**Request:**
```json
{
  "compileId": "compile_3f8a2c1e"
}
```

**Response (Success — With Errors):**
```json
{
  "compileId": "compile_3f8a2c1e",
  "errorCount": 2,
  "errors": [
    {
      "file": "Source/MyProject/MyActor.cpp",
      "line": 42,
      "column": 15,
      "severity": "error",
      "message": "use of undeclared identifier 'InvalidFunction'"
    },
    {
      "file": "Source/MyProject/MyActor.h",
      "line": 18,
      "column": 5,
      "severity": "warning",
      "message": "unused variable 'oldValue'"
    }
  ]
}
```

**Response (Success — No Errors):**
```json
{
  "compileId": "compile_3f8a2c1e",
  "errorCount": 0,
  "errors": []
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "3001: Compile failed with 5 errors"
}
```

**Safety:** SAFE — read-only query. Useful for self-healing loops.

**Error Severity Levels:**
- `error` — Blocks compilation
- `warning` — Does not block but should be fixed
- `info` — Informational (rare)

**Example Usage:**

Retrieve errors for self-healing analysis.

```
> compilation-getErrors { "compileId": "compile_3f8a2c1e" }
Response: {
  "errorCount": 2,
  "errors": [
    { "file": "Source/MyProject/MyActor.cpp", "line": 42, "message": "..." }
  ]
}
```

---

### compilation-selfHeal

Meta-tool that provides self-healing context for Claude. Retrieves current errors, tracks retry count, and provides guidance. Claude handles the actual fix reasoning.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | string | No | Specific file with errors (for context). If omitted, checks all files. |

**Request:**
```json
{
  "filePath": "Source/MyProject/MyActor.cpp"
}
```

**Response (Success — Can Retry):**
```json
{
  "canRetry": true,
  "retryCount": 1,
  "maxRetries": 3,
  "errors": [
    {
      "file": "Source/MyProject/MyActor.cpp",
      "line": 42,
      "message": "use of undeclared identifier 'InvalidFunction'"
    }
  ],
  "suggestion": "Retry 1/3: Read the file, fix the errors, write the fix, and trigger recompilation."
}
```

**Response (Success — Max Retries Exceeded):**
```json
{
  "canRetry": false,
  "retryCount": 3,
  "maxRetries": 3,
  "errors": [
    { "file": "Source/MyProject/MyActor.cpp", "line": 42, "message": "..." }
  ],
  "suggestion": "Max retries (3) exceeded for Source/MyProject/MyActor.cpp. Please review the errors manually."
}
```

**Response (Error):**
```json
{
  "canRetry": false,
  "retryCount": 0,
  "maxRetries": 3,
  "errors": "Could not retrieve compile errors",
  "suggestion": "Could not retrieve compile errors. Check UE plugin connection."
}
```

**Safety:** SAFE — read-only meta-tool. Orchestration handled by Claude.

**Self-Healing Loop:**
1. Trigger compilation → `compilation-trigger`
2. Check status → `compilation-getStatus`
3. If failed: retrieve context → `compilation-selfHeal`
4. Claude reads affected files → `file-read`
5. Claude applies fix → `file-write`
6. Trigger recompilation → `compilation-trigger` (loop back to step 2)
7. If success or max retries: exit loop

**Example Usage:**

Guide a self-healing loop.

```
> compilation-selfHeal { "filePath": "Source/MyProject/MyActor.cpp" }
Response: {
  "canRetry": true,
  "retryCount": 1,
  "maxRetries": 3,
  "errors": [...],
  "suggestion": "Retry 1/3: ..."
}

[Claude reads file, applies fix, triggers recompile]
```

---

## File Tools

### file-read

Reads file content from the Unreal project. Supports offset/limit for large files. **Path traversal is blocked**.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | string | Yes | Absolute or project-relative file path |
| `offset` | number | No | Byte offset to start reading. Default: 0 |
| `limit` | number | No | Maximum bytes to read. Default: entire file |

**Request:**
```json
{
  "filePath": "Source/MyProject/MyActor.cpp",
  "offset": 0,
  "limit": 1000
}
```

**Response (Success):**
```json
{
  "filePath": "Source/MyProject/MyActor.cpp",
  "size": 2048,
  "offset": 0,
  "limit": 1000,
  "content": "#include \"MyActor.h\"\n\nAMyActor::AMyActor() {\n  // ...\n}",
  "isComplete": false
}
```

**Response (Error — Path Traversal):**
```json
{
  "status": "error",
  "error": "4001: Path traversal blocked: ../../../etc/passwd"
}
```

**Response (Error — File Not Found):**
```json
{
  "status": "error",
  "error": "4002: File not found: Source/MyProject/NonExistent.cpp"
}
```

**Safety:** SAFE — read-only. Path traversal (e.g., `../../`) blocked by `isPathSafe()` check.

**Allowed Roots:** By default, only paths under the Unreal project directory are allowed. Environment variable `UMA_ALLOWED_ROOTS` controls this list.

**Example Usage:**

Read a source file for analysis.

```
> file-read { "filePath": "Source/MyProject/MyActor.cpp" }
Response: { "filePath": "Source/MyProject/MyActor.cpp", "size": 2048, "content": "..." }
```

---

### file-write

Writes content to a file in the Unreal project. **Requires human approval** for safety. **Path traversal is blocked**.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | string | Yes | Target file path |
| `content` | string | Yes | File content to write (overwrites existing) |

**Request:**
```json
{
  "filePath": "Source/MyProject/MyActor.cpp",
  "content": "#include \"MyActor.h\"\n\nvoid AMyActor::BeginPlay() { ... }"
}
```

**Response (Success):**
```json
{
  "written": true,
  "filePath": "Source/MyProject/MyActor.cpp",
  "bytesWritten": 156,
  "timestamp": 1709670000000
}
```

**Response (Error — Approval Denied):**
```json
{
  "status": "error",
  "error": "5002: Operation rejected: User denied file write"
}
```

**Response (Error — Path Traversal):**
```json
{
  "status": "error",
  "error": "4001: Path traversal blocked: ../../../etc/passwd"
}
```

**Safety:** DANGEROUS — destructive operation. Triggers approval gate. Requires human confirmation before writing.

**Approval Flow:**
1. Tool handler calls `ApprovalGate.requestApproval()`
2. UE plugin displays modal dialog showing file path and content preview
3. User approves or denies
4. Response forwarded back to Claude Code

**Example Usage:**

Apply a fix to a source file (requires approval).

```
> file-write {
    "filePath": "Source/MyProject/MyActor.cpp",
    "content": "#include \"MyActor.h\"\n\nvoid AMyActor::BeginPlay() { ... }"
  }
[UE Editor shows approval dialog]
User approves...
Response: { "written": true, "bytesWritten": 156 }
```

---

### file-search

Searches for files in the Unreal project by pattern or glob. Useful for finding assets or source files.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pattern` | string | Yes | Search pattern (regex or glob, depending on `glob` param) |
| `directory` | string | No | Directory to search in. Default: project root |
| `glob` | string | No | If present, use glob matching instead of regex. Value can be "**/\*.cpp" |

**Request (Regex):**
```json
{
  "pattern": ".*MyActor.*\\.cpp$",
  "directory": "Source/MyProject"
}
```

**Request (Glob):**
```json
{
  "pattern": "Source/MyProject",
  "glob": "**/MyActor*.cpp"
}
```

**Response (Success):**
```json
{
  "pattern": "**/MyActor*.cpp",
  "directory": "Source/MyProject",
  "count": 3,
  "files": [
    "Source/MyProject/MyActor.cpp",
    "Source/MyProject/MyActorSubclass.cpp",
    "Source/MyProject/Public/MyActor.h"
  ]
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "4003: Directory not found: Source/InvalidDir"
}
```

**Safety:** SAFE — read-only search.

**Example Usage:**

Find all Blueprint C++ files in a directory.

```
> file-search {
    "pattern": "Source/MyProject",
    "glob": "**/BP_*.cpp"
  }
Response: {
  "count": 5,
  "files": ["Source/MyProject/BP_Actor.cpp", ...]
}
```

---

## Slate Tools

### slate-listTemplates

Lists all available Slate UI widget templates in the RAG knowledge base.

**Parameters:** None

**Request:**
```json
{}
```

**Response (Success):**
```json
{
  "count": 8,
  "templates": [
    { "id": "base-widget", "title": "Base SCompoundWidget" },
    { "id": "dialog-window", "title": "Modal Dialog with SWindow" },
    { "id": "list-view", "title": "SListView with Item Rows" },
    { "id": "tree-view", "title": "STreeView with Expansion" },
    { "id": "input-field", "title": "Text Input Field" },
    { "id": "tab-widget", "title": "Dockable SDockTab" },
    { "id": "progress-bar", "title": "Progress Bar Widget" },
    { "id": "details-panel", "title": "Details Panel" }
  ]
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "6002: Template store not initialized"
}
```

**Safety:** SAFE — read-only query.

**Example Usage:**

List available templates before generating widget code.

```
> slate-listTemplates
Response: { "count": 8, "templates": [...] }
```

---

### slate-generate

Generates Slate C++ widget code using RAG (Retrieval Augmented Generation). Searches template database for relevant patterns and returns matched templates plus style guide.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Natural language query (e.g., "modal dialog with buttons", "list view with filtering") |
| `widgetName` | string | No | Widget class name (e.g., "SMyDialog"). If omitted, inferred from query. |

**Request:**
```json
{
  "query": "Create a modal dialog with OK and Cancel buttons",
  "widgetName": "SConfirmDialog"
}
```

**Response (Success):**
```json
{
  "query": "Create a modal dialog with OK and Cancel buttons",
  "widgetName": "SConfirmDialog",
  "templates": [
    {
      "id": "dialog-window",
      "title": "Modal Dialog with SWindow",
      "score": 0.95,
      "content": "// Modal dialog template with SWindow...\nFSlateApplication::Get().AddWindow(SNew(SWindow)\n  .Title(FText::FromString(\"Confirm\"))\n  [...]\n);"
    }
  ],
  "styleGuide": "Epic Games Slate C++ Style Guide:\n- Use SNew() macro for widget construction\n- Use SLATE_BEGIN_ARGS / SLATE_END_ARGS for widget arguments\n[...]\n- One widget per file, matching filename",
  "validationRules": [
    "Balanced SNew brackets",
    "SLATE_BEGIN_ARGS must have SLATE_END_ARGS",
    "TAttribute accessed via .Get()"
  ]
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "5003: Embedding store not available"
}
```

**Safety:** SAFE — read-only code retrieval and synthesis.

**RAG Matching:** Queries are embedded and matched against template database using cosine similarity. Top 3 matches returned by default.

**Example Usage:**

Generate code for a custom dialog widget.

```
> slate-generate {
    "query": "modal dialog with OK and Cancel buttons",
    "widgetName": "SConfirmDialog"
  }
Response: { "templates": [...], "styleGuide": "...", "validationRules": [...] }

[Claude synthesizes final code using templates + style guide]
```

---

### slate-validate

Validates Slate C++ code for common errors: balanced macros, TAttribute usage, etc.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `code` | string | Yes | Slate C++ code to validate |

**Request:**
```json
{
  "code": "SLATE_BEGIN_ARGS(SMyWidget)\nSLATE_END_ARGS\n\nvoid SMyWidget::Construct(const FArguments& InArgs) { ... }"
}
```

**Response (Success — Valid):**
```json
{
  "valid": true,
  "errors": []
}
```

**Response (Success — With Warnings):**
```json
{
  "valid": false,
  "errors": [
    {
      "rule": "SLATE_ARGS_BALANCE",
      "message": "SLATE_BEGIN_ARGS without matching SLATE_END_ARGS"
    },
    {
      "rule": "TATTRIBUTE_GET",
      "message": "TAttribute used but .Get() never called - ensure attributes are accessed via .Get()"
    }
  ]
}
```

**Safety:** SAFE — static analysis, no execution.

**Validation Rules:**
1. **SLATE_ARGS_BALANCE** — Matching SLATE_BEGIN_ARGS / SLATE_END_ARGS
2. **TATTRIBUTE_GET** — TAttribute properties accessed via `.Get()`

**Example Usage:**

Validate generated Slate code before writing to files.

```
> slate-validate {
    "code": "SLATE_BEGIN_ARGS(SMyWidget)\nSLATE_END_ARGS\n..."
  }
Response: { "valid": true, "errors": [] }
```

---

## Chat Tools

### chat-sendMessage

Sends a message to the in-editor chat panel. Useful for providing status updates and logs during autonomous operations.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | string | Yes | Message text to display |

**Request:**
```json
{
  "text": "Compilation succeeded. All 5 nodes connected successfully."
}
```

**Response (Success):**
```json
{
  "status": "sent",
  "result": {
    "messageId": "msg_7c3f1e9d",
    "timestamp": 1709670000000,
    "displayedInEditor": true
  }
}
```

**Response (Error):**
```json
{
  "status": "error",
  "error": "6001: WebSocket bridge not connected"
}
```

**Safety:** SAFE — informational logging, no state changes.

**Chat Panel:** Messages appear in the dockable UMA Chat Panel (implemented in Phase 7). If panel not visible, messages still queue.

**Example Usage:**

Send completion status to the editor.

```
> chat-sendMessage { "text": "Blueprint graph serialized: 3 graphs, 18 nodes." }
Response: { "status": "sent", "displayedInEditor": true }
```

---

## Extended Tool Domains (Phase 9)

The following 14 domains were added in Phase 9, bringing the total from 20 to 85 tools. Each tool delegates to a Python script in `ue-plugin/Content/Python/uma/` via the `python-execute` bridge.

### Actor Tools (9 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `actor-spawn` | Spawn actor by class at location/rotation | WARN |
| `actor-delete` | Delete actor from level | DANGEROUS |
| `actor-getProperties` | Get actor properties as JSON | SAFE |
| `actor-setProperty` | Set a property value on an actor | WARN |
| `actor-setTransform` | Set actor location, rotation, scale | WARN |
| `actor-getComponents` | List components on an actor | SAFE |
| `actor-addComponent` | Add component to actor | WARN |
| `actor-select` | Select actor(s) in editor viewport | SAFE |
| `actor-setArrayRef` | Set array/reference property on actor | WARN |

### Material Tools (6 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `material-create` | Create new material asset | WARN |
| `material-createInstance` | Create material instance from parent | WARN |
| `material-setParameter` | Set scalar/vector/texture parameter | WARN |
| `material-getParameters` | Get all parameters from material | SAFE |
| `material-getNodes` | Get material expression nodes | SAFE |
| `material-setTexture` | Assign texture to material slot | WARN |

### Mesh Tools (4 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `mesh-getInfo` | Get mesh info (vertices, triangles, bounds) | SAFE |
| `mesh-setMaterial` | Set material on mesh slot | WARN |
| `mesh-setLOD` | Configure LOD settings | WARN |
| `mesh-generateCollision` | Generate collision for static mesh | WARN |

### Level Tools (5 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `level-create` | Create new level | WARN |
| `level-open` | Open existing level | WARN |
| `level-save` | Save current level | WARN |
| `level-addSublevel` | Add streaming sublevel | WARN |
| `level-getWorldSettings` | Get world settings | SAFE |

### Asset Tools (8 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `asset-create` | Create new asset | WARN |
| `asset-delete` | Delete asset | DANGEROUS |
| `asset-duplicate` | Duplicate existing asset | WARN |
| `asset-import` | Import external file as asset | WARN |
| `asset-export` | Export asset to file | SAFE |
| `asset-rename` | Rename/move asset | WARN |
| `asset-getReferences` | Get asset dependency references | SAFE |
| `asset-setMetadata` | Set asset metadata tags | WARN |

### Animation Tools (5 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `anim-listSequences` | List animation sequences | SAFE |
| `anim-listMontages` | List animation montages | SAFE |
| `anim-createMontage` | Create montage from sequence | WARN |
| `anim-getBlendSpace` | Get blend space info | SAFE |
| `anim-getSkeletonInfo` | Get skeleton bone hierarchy | SAFE |

### Content Tools (4 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `content-listAssets` | List assets in path | SAFE |
| `content-findAssets` | Search assets by name/type | SAFE |
| `content-getAssetDetails` | Get detailed asset metadata | SAFE |
| `content-validateAssets` | Validate assets for errors | SAFE |

### DataTable Tools (4 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `datatable-create` | Create new DataTable | WARN |
| `datatable-addRow` | Add row to DataTable | WARN |
| `datatable-getRows` | Get rows from DataTable | SAFE |
| `datatable-removeRow` | Remove row from DataTable | DANGEROUS |

### Build Tools (3 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `build-lightmaps` | Build lighting | WARN |
| `build-cookContent` | Cook content for platform | WARN |
| `build-getMapCheck` | Run map check validation | SAFE |

### Project Tools (6 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `project-getStructure` | Get project directory structure | SAFE |
| `project-getPlugins` | List enabled plugins | SAFE |
| `project-getSettings` | Get project settings | SAFE |
| `project-getClassHierarchy` | Get class inheritance tree | SAFE |
| `project-getDependencyGraph` | Get module dependency graph | SAFE |
| `project-snapshot` | Create project state snapshot | SAFE |

### Gameplay Tools (4 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `gameplay-getGameMode` | Get current game mode class | SAFE |
| `gameplay-setGameMode` | Set game mode class | WARN |
| `gameplay-listInputActions` | List input action mappings | SAFE |
| `gameplay-addInputAction` | Add input action mapping | WARN |

### Python Tool (1 tool)

| Tool | Description | Safety |
|------|-------------|--------|
| `python-execute` | Execute named Python script from `Content/Python/uma/` | WARN |

### Source Control Tools (3 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `sourcecontrol-getStatus` | Get file source control status | SAFE |
| `sourcecontrol-checkout` | Check out file for editing | WARN |
| `sourcecontrol-diff` | Get diff of file changes | SAFE |

### Debug Tools (3 tools)

| Tool | Description | Safety |
|------|-------------|--------|
| `debug-execConsole` | Execute UE console command | WARN |
| `debug-getLog` | Get recent log output | SAFE |
| `debug-getPerformance` | Get performance statistics | SAFE |

---

## Safety Classifications

All tools are classified by risk level. Dangerous operations require human approval.

| Classification | Tools | Behavior |
|---|---|---|
| SAFE | All read-only/query tools: editor-*, blueprint-serialize, compilation-getStatus/getErrors/selfHeal, file-read, file-search, slate-*, chat-*, actor-getProperties/getComponents/select, material-getParameters/getNodes, mesh-getInfo, level-getWorldSettings, asset-export/getReferences, anim-list*/get*, content-*, datatable-getRows, build-getMapCheck, project-*, gameplay-getGameMode/listInputActions, sourcecontrol-getStatus/diff, debug-getLog/getPerformance | Execute without approval |
| WARN | Mutation tools: blueprint-createNode/connectPins/modifyProperty, compilation-trigger, actor-spawn/setProperty/setTransform/addComponent/setArrayRef, material-create/createInstance/setParameter/setTexture, mesh-setMaterial/setLOD/generateCollision, level-create/open/save/addSublevel, asset-create/duplicate/import/rename/setMetadata, anim-createMontage, datatable-create/addRow, build-lightmaps/cookContent, gameplay-setGameMode/addInputAction, python-execute, sourcecontrol-checkout, debug-execConsole | Execute with logging |
| DANGEROUS | Destructive tools: blueprint-deleteNode, file-write, actor-delete, asset-delete, datatable-removeRow | **Require human approval** (ApprovalGate) |

---

## Common Workflows

### Workflow 1: Basic Blueprint Node Creation

1. Serialize Blueprint → `blueprint-serialize`
2. Create node → `blueprint-createNode` (returns `nodeId`)
3. Modify properties → `blueprint-modifyProperty`
4. Connect pins → `blueprint-connectPins` (requires pin IDs from serialize)
5. Trigger compile → `compilation-trigger`
6. Poll status → `compilation-getStatus`

### Workflow 2: Self-Healing Compile Loop

1. Trigger compile → `compilation-trigger`
2. Poll status → `compilation-getStatus`
3. If failed:
   a. Get context → `compilation-selfHeal`
   b. Read file → `file-read`
   c. Apply fix → `file-write` (requires approval)
   d. Loop back to step 1 (max 3 retries)
4. If success or max retries: exit

### Workflow 3: Generate Slate Widget

1. List templates → `slate-listTemplates`
2. Generate with RAG → `slate-generate`
3. Validate code → `slate-validate`
4. Write to file → `file-write` (requires approval)
5. Compile → `compilation-trigger`

### Workflow 4: Find and Analyze Asset

1. List actors → `editor-listActors` (filter by class)
2. Get asset info → `editor-getAssetInfo`
3. Serialize Blueprint → `blueprint-serialize`
4. Analyze graph structure (Claude processes returned JSON AST)

---

## Limits and Constraints

| Limit | Value | Notes |
|---|---|---|
| Blueprint AST Size | ~500 KB cached | Large BPs (>1000 nodes) may timeout; use `graphName` filter |
| Self-Heal Max Retries | 3 | Hard limit; human intervention required after 3 failures |
| File Read Limit | 10 MB | Larger files require offset/limit pagination |
| WebSocket Timeout | 30 seconds | Requests timing out return error code 6002 |
| Concurrent Compiles | 1 | Only one compile per session at a time |
| Template Search Results | 3 | RAG returns top 3 matching templates |

---

## Error Recovery Guide

### "6001: WebSocket bridge not connected"

**Cause:** UE plugin not connected to MCP server.

**Recovery:**
1. Verify UE plugin is enabled in `.uproject`
2. Check MCP server is running: `cd mcp-server && npm run dev`
3. Verify WebSocket port (default 9877): check `.claude/mcp.json`
4. Retry `editor-ping`

### "2003: Pin type mismatch"

**Cause:** Attempted to connect incompatible pin types (e.g., exec to boolean).

**Recovery:**
1. Verify source pin is output and target is input
2. Check pin types match (exec-exec, bool-bool, string-string)
3. Use `blueprint-serialize` to inspect pin details
4. Try alternate nodes or pin combinations

### "5002: Operation rejected"

**Cause:** User denied approval for dangerous operation.

**Recovery:**
1. Review the operation in the approval dialog
2. If safe to proceed, approve in UE Editor
3. If unsafe, abort and try alternate approach
4. Dangerous operations: `blueprint-deleteNode`, `file-write`

### "3001: Compile failed with N errors"

**Cause:** Compilation error in generated or user code.

**Recovery:**
1. Call `compilation-getErrors` to list errors
2. Use `compilation-selfHeal` to get guidance
3. Read error file: `file-read { "filePath": "Source/.../MyFile.cpp" }`
4. Apply fix: `file-write` (requires approval)
5. Trigger recompile: `compilation-trigger`
6. Max 3 retries per session; escalate to human after

---

## Example Session

```
Claude Code:
> editor-ping
MCP Response:
{ "status": "pong", "result": { "ueVersion": "5.4.2" } }

Claude Code:
> blueprint-serialize { "assetPath": "/Game/Blueprints/BP_TestActor" }
MCP Response:
{ "cacheKey": "bp:/Game/Blueprints/BP_TestActor", "cached": false, "summary": { "blueprintPath": "/Game/Blueprints/BP_TestActor", "graphCount": 2, "nodeCount": 5 } }

Claude Code:
> blueprint-createNode {
    "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
    "graphName": "EventGraph",
    "nodeClass": "K2Node_CallFunction",
    "functionOwnerClass": "KismetSystemLibrary",
    "functionName": "PrintString",
    "posX": 300,
    "posY": 100
  }
MCP Response:
{ "nodeId": "K2Node_CallFunction_123", "pins": [...] }

Claude Code:
> blueprint-modifyProperty {
    "blueprintCacheKey": "bp:/Game/Blueprints/BP_TestActor",
    "nodeId": "K2Node_CallFunction_123",
    "propertyName": "InString",
    "propertyValue": "Hello from Claude!"
  }
MCP Response:
{ "modified": true, "newValue": "Hello from Claude!" }

Claude Code:
> compilation-trigger
MCP Response:
{ "status": "compiling", "compileId": "compile_3f8a2c1e" }

Claude Code:
> compilation-getStatus { "compileId": "compile_3f8a2c1e" }
MCP Response:
{ "status": "idle", "result": "success" }

Claude Code:
> chat-sendMessage { "text": "Graph modification complete. Compilation succeeded." }
MCP Response:
{ "status": "sent", "displayedInEditor": true }
```

---

## References

- **ARCHITECTURE.md** — Full system design, threading model, data flow diagrams
- **mcp-server/src/tools/** — Tool implementation source code
- **mcp-server/src/transport/websocket-bridge.ts** — WebSocket protocol and messaging
- **docs/schemas/ws-protocol.schema.json** — WebSocket message envelope (JSON Schema)
- **docs/slate-templates/** — RAG template knowledge base for Slate code generation
