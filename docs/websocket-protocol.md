# WebSocket Protocol Specification

## Overview

The Unreal Master Agent uses WebSocket (RFC 6455) for real-time bidirectional communication between the MCP Bridge Server (Node.js) and the UE Agent Plugin (C++).

**Architecture:**
- **Server:** Node.js MCP Bridge listens on a configurable port (default `9877`, set via `UE_WS_PORT` environment variable)
- **Client:** Unreal Engine plugin connects using `FWebSocketsModule`
- **Transport:** RFC 6455 WebSocket with JSON message encoding
- **Serialization:** JSON for all message payloads
- **Dependencies:** `ws` npm package (^8.18.0)

---

## Message Format

### Request (MCP Bridge → UE Plugin)

All requests follow this envelope:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "blueprint.serialize",
  "params": {
    "blueprintPath": "/Game/BP_TestActor"
  },
  "timestamp": 1740441600000
}
```

**Field Specifications:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID v4 string | Unique request identifier for response correlation. Must be present in all requests. |
| `method` | string | Dot-notation command name (pattern: `^[a-z]+\.[a-zA-Z]+$`). Routed to a registered handler. |
| `params` | object | Command-specific parameters. Can be any JSON object. Required but can be empty `{}`. |
| `timestamp` | number | Unix timestamp in milliseconds (integer). Must be positive. |

### Success Response (UE Plugin → MCP Bridge)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "result": {
    "cacheKey": "bp_abc123",
    "summary": "EventGraph: 5 nodes"
  },
  "duration_ms": 42
}
```

**Field Specifications:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID v4 string | Matches the request `id` for correlation. |
| `result` | any | Success payload (any JSON-serializable value). Absent if `error` is present. |
| `duration_ms` | number | Server-side processing time in milliseconds (≥ 0). Always present. |

### Error Response (UE Plugin → MCP Bridge)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "code": 3001,
    "message": "Blueprint asset not found: /Game/BP_Missing",
    "data": {
      "searchedPaths": ["/Game/BP_Missing.uasset"]
    }
  },
  "duration_ms": 3
}
```

**Field Specifications:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID v4 string | Matches the request `id` for correlation. |
| `error.code` | number | Error code (1000-6099). See error taxonomy below. |
| `error.message` | string | Human-readable error description. |
| `error.data` | any | Optional structured error context (e.g., validation details, searched paths). |
| `duration_ms` | number | Server-side processing time in milliseconds. |

---

## Error Code Taxonomy

Error codes are organized in ranges by category. The error code determines the severity and recovery strategy.

| Range | Category | Description | Examples |
|-------|----------|-------------|----------|
| 1000-1099 | Connection | WebSocket-level connection errors | 1000: WS disconnect, 1001: handshake failure, 1002: timeout |
| 2000-2099 | Handler Routing | Method routing errors | 2001: Unknown method, 2002: Handler not registered |
| 3000-3099 | Parameter Validation | Invalid or missing parameters | 3001: Missing required parameter, 3002: Invalid parameter type, 3003: Parameter out of range |
| 4000-4099 | Blueprint Operations | Blueprint graph manipulation failures | 4001: Node spawn failed, 4002: Pin connect failed, 4003: Node delete failed, 4004: Property modify failed |
| 5000-5099 | Internal / Compilation | Internal errors and Live Coding issues | 5000: Serialization error, 5001: Live Coding not initialized, 5002: Feature not available, 5003: Feature not enabled, 5004: Already compiling |
| 6000-6099 | Safety Gate | Approval and safety mechanism errors | 6000: ApprovalGate not initialized, 6001: Approval rejected or timeout |
| 7000-7099 | Resilience | Circuit breaker and resilience errors | 7000: Circuit breaker open (UMA_E_CIRCUIT_OPEN) |

**Error Code Details:**

| Code | Name | Message Pattern | Recovery |
|------|------|-----------------|----------|
| 2001 | Unknown Method | `Unknown method: {method}` | Check method name spelling; refer to handler list |
| 3001 | Missing Parameter | `Missing required parameter: {paramName}` | Add missing parameter |
| 3002 | Invalid Type | `Parameter {name} has wrong type: expected {expected}, got {actual}` | Convert value to correct type |
| 4001 | Node Spawn Failed | `Failed to spawn node: {nodeClass}` | Verify node class exists; check Blueprint validity |
| 4002 | Pin Connect Failed | `Cannot connect pins: {sourcePin} -> {targetPin}` | Verify pin types are compatible; check connection logic |
| 4003 | Node Delete Failed | `Cannot delete node: {nodeId}` | Verify node exists; check for references |
| 4004 | Property Modify Failed | `Cannot modify property: {propertyName}` | Verify property is writable; check value type |
| 5000 | Serialization Error | `Serialization failed: {details}` | Check Blueprint structure; try serialize again |
| 5001 | Live Coding Not Init | `Live Coding module not initialized` | Restart editor or trigger compilation differently |
| 5004 | Already Compiling | `Compilation already in progress` | Wait for current compile to finish; retry |
| 6001 | Approval Rejected | `Operation rejected by approval gate` | User declined the operation in the approval dialog |

---

## Registered Methods (Handlers)

The UE plugin registers 17 method handlers organized by category. All handlers execute on the GameThread (guaranteed by WebSocket client dispatch via `AsyncTask`).

### Editor Methods

**`editor.ping`**
- **Description:** Health check; confirms UE plugin is responsive.
- **Params:** `{}` (empty)
- **Response:** `{ "status": "ok", "ueVersion": "5.4.x" }`
- **Safety Level:** SAFE (read-only)

**`editor.getLevelInfo`**
- **Description:** Get current level metadata (name, actor count, size).
- **Params:** `{}` (empty)
- **Response:** `{ "levelName": "Level_Main", "actorCount": 42, "size": {...} }`
- **Safety Level:** SAFE (read-only)

**`editor.listActors`**
- **Description:** List all actors in the current level with their classes and locations.
- **Params:** `{ "limit"?: number }` (optional limit on results)
- **Response:** `{ "actors": [ { "name": "Actor1", "class": "AActor", "location": {...} }, ... ] }`
- **Safety Level:** SAFE (read-only)

**`editor.getAssetInfo`**
- **Description:** Get metadata for a specific asset (Blueprint, Material, Mesh, etc.).
- **Params:** `{ "assetPath": "/Game/BP_Example" }`
- **Response:** `{ "name": "BP_Example", "type": "Blueprint", "modified": "2024-12-15T10:30:00Z" }`
- **Safety Level:** SAFE (read-only)

### Blueprint Methods

**`blueprint.serialize`**
- **Description:** Serialize a Blueprint to a structured JSON AST (Abstract Syntax Tree).
- **Params:** `{ "blueprintPath": "/Game/BP_TestActor" }`
- **Response:** `{ "cacheKey": "bp_abc123", "ast": {...blueprint graph JSON...}, "nodeCount": 12 }`
- **Safety Level:** SAFE (read-only); results cached with default 60s TTL
- **Cache:** Large results stored in CacheStore; client receives `cacheKey` and must fetch via separate call if needed

**`blueprint.createNode`**
- **Description:** Spawn a new node in a Blueprint graph.
- **Params:** `{ "blueprintPath": "/Game/BP_TestActor", "nodeClass": "BP_PrintString", "x": 100, "y": 200 }`
- **Response:** `{ "nodeId": "guid-string", "class": "BP_PrintString", "position": { "x": 100, "y": 200 } }`
- **Error Codes:** 4001 (node spawn failed), 3001 (missing params)
- **Safety Level:** WARN (recoverable mutation)

**`blueprint.connectPins`**
- **Description:** Connect two pins in a Blueprint graph using `TryCreateConnection`.
- **Params:** `{ "blueprintPath": "/Game/BP_TestActor", "sourceNodeId": "guid1", "sourcePinName": "Completed", "targetNodeId": "guid2", "targetPinName": "Execute" }`
- **Response:** `{ "success": true, "connection": {...} }`
- **Error Codes:** 4002 (pin connect failed), 3001 (missing params)
- **Safety Level:** WARN (recoverable mutation)
- **Note:** Always uses `TryCreateConnection`, never `MakeLinkTo`, to ensure polymorphic pin type propagation.

**`blueprint.modifyProperty`**
- **Description:** Set a property or pin default value on a node.
- **Params:** `{ "blueprintPath": "/Game/BP_TestActor", "nodeId": "guid", "propertyName": "Message", "value": "Hello World" }`
- **Response:** `{ "success": true, "oldValue": "...", "newValue": "Hello World" }`
- **Error Codes:** 4004 (property modify failed), 3001 (missing params)
- **Safety Level:** WARN (recoverable mutation)

**`blueprint.deleteNode`**
- **Description:** Remove a node from a Blueprint by GUID.
- **Params:** `{ "blueprintPath": "/Game/BP_TestActor", "nodeId": "guid" }`
- **Response:** `{ "success": true, "nodeId": "guid", "deletedClass": "BP_PrintString" }`
- **Error Codes:** 4003 (node delete failed), 3001 (missing params)
- **Safety Level:** DANGEROUS (destructive); requires approval gate
- **Approval:** Gated by `safety.requestApproval` workflow

### Compilation Methods

**`compilation.trigger`**
- **Description:** Trigger Live Coding compilation of the project.
- **Params:** `{}` (empty)
- **Response:** `{ "status": "compiling", "startTime": 1740441600000 }`
- **Error Codes:** 5001 (Live Coding not initialized), 5004 (already compiling)
- **Safety Level:** WARN (affects project state)

**`compilation.getStatus`**
- **Description:** Poll current compilation status and progress.
- **Params:** `{}` (empty)
- **Response:** `{ "status": "idle|compiling|success|failed", "progress": 0.75, "startTime": 1740441600000, "duration_ms": 2500 }`
- **Safety Level:** SAFE (read-only)

**`compilation.getErrors`**
- **Description:** Fetch compile errors from the most recent compilation.
- **Params:** `{}` (empty)
- **Response:** `{ "errors": [ { "file": "Source/MyActor.cpp", "line": 42, "message": "...", "severity": "error" }, ... ] }`
- **Safety Level:** SAFE (read-only)

**`compilation.selfHeal`**
- **Description:** Analyze compile errors and attempt automatic fixes (Claude's responsibility).
- **Params:** `{ "errors": [{ "file": "...", "line": ..., "message": "..." }], "maxAttempts": 3 }`
- **Response:** `{ "healed": true, "appliedFixes": [...], "remainingErrors": [...] }`
- **Error Codes:** 5000 (serialization error), 3001 (missing params)
- **Safety Level:** WARN (orchestrated mutation)

### File Methods

**`file.read`**
- **Description:** Read file contents from the project.
- **Params:** `{ "filePath": "/Source/MyFile.cpp" }`
- **Response:** `{ "content": "...file contents...", "encoding": "utf-8", "size": 1024 }`
- **Safety Level:** SAFE (read-only); path validation enforced
- **Path Safety:** Blocks `..` and `~` traversal; requires path within allowed roots

**`file.write`**
- **Description:** Write or overwrite a file in the project.
- **Params:** `{ "filePath": "/Source/MyFile.cpp", "content": "...new content...", "encoding": "utf-8" }`
- **Response:** `{ "success": true, "size": 2048 }`
- **Error Codes:** 3001 (missing params), 6001 (approval rejected if writing to /Content/)
- **Safety Level:** WARN (write to /Tests/) or DANGEROUS (write to /Content/); gated by safety classification
- **Approval:** Production content paths require approval gate

**`file.search`**
- **Description:** Search files by pattern or glob.
- **Params:** `{ "pattern": "*.cpp", "directory": "/Source" }`
- **Response:** `{ "results": [ "/Source/MyActor.cpp", "/Source/MyActor.h" ], "count": 2 }`
- **Safety Level:** SAFE (read-only)

### Safety Methods

**`safety.requestApproval`**
- **Description:** Request human approval for a dangerous operation (sent by server to UE).
- **Params:** `{ "operationId": "uuid", "toolName": "blueprint.deleteNode", "reason": "Destructive Blueprint operation", "filePath"?: "..." }`
- **Response:** `{ "approved": true|false }`
- **Timeout:** 60 seconds; defaults to reject if no response
- **UI:** Displays a Slate approval dialog in the UE Editor
- **Safety Level:** DANGEROUS (gating mechanism)

**`safety.approvalResponse`**
- **Description:** Response from UE Editor approval dialog (sent by UE to server).
- **Params:** `{ "operationId": "uuid", "approved": true|false, "reason"?: "User rejected the operation" }`
- **Response:** `{ "received": true }`
- **Safety Level:** SAFE (informational)

### Chat Methods

**`chat.sendMessage`**
- **Description:** Send a message from Claude to the in-editor chat panel.
- **Params:** `{ "message": "Hello from Claude!", "sender": "claude" }`
- **Response:** `{ "success": true, "timestamp": 1740441600000 }`
- **Safety Level:** SAFE (informational; UI-only)

**`chat.receiveResponse`**
- **Description:** Handle an incoming chat response from the in-editor panel (sent by UE to server).
- **Params:** `{ "message": "User response", "sender": "user", "timestamp": 1740441600000 }`
- **Response:** `{ "received": true }`
- **Safety Level:** SAFE (informational)

---

## Connection Lifecycle

### 1. Server Startup

```
Node.js MCP Bridge
  ↓
WebSocketServer starts on port 9877
  ↓
listening event fires
  ↓
Server ready to accept connections
```

### 2. Client Connection

```
UE Plugin (on startup)
  ↓
Creates FWebSocket with ws://localhost:9877
  ↓
WebSocket handshake (RFC 6455)
  ↓
onClientConnected() callback fires in bridge
  ↓
Bridge can now send requests to UE
```

### 3. Request-Response Cycle

```
MCP Bridge: sendRequest(message)
  ↓
Message serialized to JSON + sent to UE
  ↓
UE receives message on WebSocket thread
  ↓
Dispatches to GameThread via AsyncTask
  ↓
Handler processes synchronously on GameThread
  ↓
Response serialized and sent back
  ↓
Bridge receives response, correlates by id
  ↓
Promise resolved, consumer receives result
```

### 4. Timeout Handling

- **Default Timeout:** 30 seconds
- **Long-Running Tools:** 300 seconds (build-cookContent, build-lightmaps, compilation-trigger, compilation-selfHeal, all workflow-* tools, asset-import, landscape-create, landscape-importHeightmap, niagara-compile)
- **Configurable:** `requestTimeoutMs` in `WebSocketBridgeOptions`, or per-request via `sendRequest(msg, timeoutMs)`
- **Per-Tool Config:** `getToolTimeout(toolName)` from `src/transport/tool-timeouts.ts` returns appropriate timeout
- **Behavior:** If no response within timeout, pending request is rejected with `UMA_E_REQUEST_TIMEOUT` error
- **Cleanup:** Timer cleared on response or timeout; request removed from pending map

### 5. Client Disconnection

```
UE closes WebSocket (planned or crash)
  ↓
close event fires in bridge
  ↓
All pending requests rejected with "Client disconnected" error
  ↓
onClientDisconnected() callback fires
  ↓
activeClient set to null
  ↓
Bridge can still listen for new connections
```

**Reconnection:** UE plugin retries connection with exponential backoff (initial 1s, max 30s). Node.js server automatically accepts reconnection attempt.

### 6. Server Shutdown

```
Node.js receives SIGTERM or graceful shutdown
  ↓
All pending requests rejected with "Server shutting down"
  ↓
Active client terminates forcefully
  ↓
WebSocketServer.close() called
  ↓
listening = false
  ↓
Graceful shutdown completes
```

---

## Threading Model

### Node.js (MCP Bridge)

- **Message Serialization:** Synchronous on main thread
- **Pending Request Tracking:** Map-based with timers
- **Concurrent Handling:** Node.js event loop processes all callbacks asynchronously

### Unreal Engine (UE Plugin)

- **WebSocket Callbacks:** Execute on a background thread (FWebSocketsModule thread pool)
- **GameThread Dispatch:** All handler logic dispatched via `AsyncTask(ENamedThreads::GameThread)`
- **Handler Execution:** Synchronous on GameThread (only one handler at a time per UE engine guarantee)
- **Response Serialization:** Synchronous on GameThread before sending

**Critical Guarantee:** All 17 registered handlers execute exclusively on the GameThread. WebSocket callbacks do NOT run on GameThread; they immediately dispatch to GameThread via AsyncTask.

---

## Message Correlation & State

### Request Correlation

Each request has a unique UUID `id`. The response returned by the handler must have the same `id`.

```typescript
// Request
{ id: "550e8400-...", method: "editor.ping", params: {}, timestamp: ... }

// Response (correlated by id)
{ id: "550e8400-...", result: { status: "ok" }, duration_ms: 5 }
```

The bridge maintains a `pendingRequests: Map<id, PendingRequest>` to correlate responses to callers.

### State Management

- **Connection State:** Tracked by `ConnectionManager` (disconnected | connected)
- **Pending Requests:** Tracked by `WebSocketBridge.pendingRequests` map
- **Cache:** `CacheStore` with LRU eviction and TTL (default 60s, max 1000 entries)

---

## Caching Strategy

### CacheStore Details

- **Type:** LRU (Least Recently Used) with time-to-live (TTL)
- **Default Config:** 1000 max entries, 60s TTL
- **Eviction:** Oldest entry removed when capacity reached
- **Access Pattern:** Accessing a cached entry refreshes its LRU position

### Cache Usage in Protocol

Large results (e.g., `blueprint.serialize` for complex Blueprints) are cached:

```json
{
  "id": "550e8400-...",
  "result": {
    "cacheKey": "bp_abc123",
    "summary": "EventGraph: 12 nodes",
    "nodeCount": 12
  },
  "duration_ms": 45
}
```

The client receives `cacheKey` and can later retrieve the full AST:

```
CacheStore.get("bp_abc123")
  ↓
Returns cached Blueprint AST
```

This reduces JSON payload size for frequently queried Blueprints.

---

## Safety Approval Flow

### Dangerous Operation Detection

Operations are classified by risk level:

- **SAFE:** Read-only (ping, list, serialize)
- **WARN:** Recoverable mutations (createNode, connectPins, modifyProperty, trigger)
- **DANGEROUS:** Destructive (deleteNode, file writes to /Content/)

### Approval Workflow

```
MCP Bridge: Tool execution starts
  ↓
Tool calls SafetyGate.requestApproval()
  ↓
Classification: DANGEROUS?
  ├─ No → Return true immediately, continue
  │
  └─ Yes → Send safety.requestApproval to UE
         ↓
         UE Editor shows Slate approval dialog
         ↓
         User approves or rejects
         ↓
         UE sends safety.approvalResponse back
         ↓
         Bridge receives response (60s timeout)
         ↓
         Tool continues (if approved) or fails (if rejected)
```

### Test Mode

In unit tests, set `ApprovalGate.setAutoResponse('approve' | 'reject')` to bypass the WebSocket round-trip.

---

## Schema References

### JSON Schema Files

- **`docs/schemas/ws-protocol.schema.json`** — Message envelope schema (request, response, error)
- **`docs/schemas/blueprint-ast.schema.json`** — Blueprint graph JSON AST schema

### Example Message Validation

```javascript
import { WSMessageSchema, WSResponseSchema } from 'ws-protocol.ts';

// Validate request
const request = { id: "...", method: "editor.ping", params: {}, timestamp: Date.now() };
const validated = WSMessageSchema.parse(request); // Throws if invalid

// Validate response
const response = { id: "...", result: { status: "ok" }, duration_ms: 5 };
const validated = WSResponseSchema.parse(response); // Throws if invalid
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UE_WS_PORT` | `9877` | Port the Node.js WebSocket server listens on |

**Usage:**

```bash
# Start MCP server on custom port
UE_WS_PORT=9877 node mcp-server/dist/index.js
```

### WebSocket Bridge Options

```typescript
interface WebSocketBridgeOptions {
  port: number;                    // Port to listen on
  requestTimeoutMs?: number;       // Default: 30000 (30s)
}

// Per-request timeout override (added in v0.4.1)
bridge.sendRequest(msg, timeoutMs?: number);

// Per-tool timeout lookup (added in v0.4.1)
import { getToolTimeout } from './transport/tool-timeouts.js';
const timeout = getToolTimeout('build-cookContent'); // 300000 (5 min)
const timeout = getToolTimeout('editor-ping');       // 30000 (30s)
```

---

## Error Handling Examples

### Example 1: Unknown Method

**Request:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "editor.unknownMethod",
  "params": {},
  "timestamp": 1740441600000
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "code": 2001,
    "message": "Unknown method: editor.unknownMethod"
  },
  "duration_ms": 1
}
```

### Example 2: Missing Required Parameter

**Request:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "blueprint.serialize",
  "params": {},
  "timestamp": 1740441600000
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "code": 3001,
    "message": "Missing required parameter: blueprintPath"
  },
  "duration_ms": 2
}
```

### Example 3: Blueprint Not Found

**Request:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "blueprint.serialize",
  "params": {
    "blueprintPath": "/Game/BP_Missing"
  },
  "timestamp": 1740441600000
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "code": 3001,
    "message": "Blueprint asset not found: /Game/BP_Missing",
    "data": {
      "searchedPaths": ["/Game/BP_Missing.uasset"]
    }
  },
  "duration_ms": 3
}
```

### Example 4: Approval Timeout

**Request (dangerous operation):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "blueprint.deleteNode",
  "params": {
    "blueprintPath": "/Game/BP_TestActor",
    "nodeId": "guid-string"
  },
  "timestamp": 1740441600000
}
```

**Response (user doesn't respond within 60s):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "code": 6001,
    "message": "Operation rejected by approval gate"
  },
  "duration_ms": 60000
}
```

---

## Best Practices

### For MCP Bridge (Node.js)

1. **Always validate messages:** Use `WSMessageSchema.parse()` before sending.
2. **Never log to stdout:** Use `stderr` for all diagnostic output.
3. **Handle disconnections gracefully:** Check `hasActiveConnection()` before sending.
4. **Timeout management:** Set appropriate `requestTimeoutMs` for different operations (5s for queries, 30s for compilation).

### For UE Plugin (C++)

1. **Dispatch to GameThread:** All WebSocket callbacks must dispatch handlers via `AsyncTask(ENamedThreads::GameThread)`.
2. **Include duration_ms:** Always measure handler execution time and include it in responses.
3. **Set error codes correctly:** Use the error taxonomy to categorize failures accurately.
4. **Validate parameters:** Check parameter types and required fields; return 3001-3099 errors for validation failures.

### For Consumers (Claude Code)

1. **Correlate by id:** Always match request ids to response ids; never assume order.
2. **Handle timeouts:** Implement exponential backoff for retries; don't spam the same request.
3. **Cache strategically:** Reuse `cacheKey` results when available; don't re-serialize identical Blueprints.
4. **Respect approval gates:** Wait for approval before executing dangerous operations; don't retry rejected approvals.

---

## References

- [RFC 6455 — The WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
- `ws` npm package: https://github.com/websockets/ws
- UE `FWebSocketsModule`: Unreal Engine 5.4+ documentation
- Protocol Schemas: `docs/schemas/ws-protocol.schema.json`, `docs/schemas/blueprint-ast.schema.json`
