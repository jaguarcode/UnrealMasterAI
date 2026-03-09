# Unreal Master Agent — Safety Architecture

This document describes the safety classification system and human-in-the-loop approval workflow that prevents dangerous operations from executing without explicit developer approval.

---

## Overview

The safety architecture classifies all MCP tool operations into three risk levels and gates dangerous operations behind a Slate approval dialog in the UE editor. The system is designed around the principle that developers maintain control — no destructive operation executes without human approval.

---

## Operation Classification

All MCP tools are classified into one of three safety levels:

| Class | Approval Required | Examples | Behavior |
|-------|-------------------|----------|----------|
| **Safe** | No | `editor.ping`, `editor.getLevelInfo`, `file.read`, `blueprint.serialize` | Execute immediately without review |
| **Warn** | No | `blueprint.createNode`, `blueprint.connectPins`, `compilation.trigger` | Execute immediately; logged for audit trail |
| **Dangerous** | Yes | `blueprint.deleteNode`, `file.write` (to `/Content/`), `file.delete` | Blocked until human approves via dialog |

### Safety Levels by Tool

#### Safe Tools (Read-Only)

These tools query state without mutating the engine:

- `editor.ping` — Health check
- `editor.getLevelInfo` — Query level actors and properties
- `editor.listActors` — List actors in the current level
- `editor.getAssetInfo` — Query asset metadata
- `blueprint.serialize` — Read Blueprint graph as JSON
- `file.read` — Read file contents
- `file.search` — Search file contents
- `compilation.getStatus` — Query current compile status
- `compilation.getErrors` — Retrieve compile error log

#### Warn Tools (Recoverable Mutations)

These tools modify state but changes are easily undoable:

- `blueprint.createNode` — Create a Blueprint node (undoable via Ctrl+Z)
- `blueprint.connectPins` — Connect two pins (undoable)
- `blueprint.modifyProperty` — Set a property value (undoable)
- `compilation.trigger` — Trigger Live Coding compilation

#### Dangerous Tools (Destructive/Irreversible)

These tools perform irreversible actions requiring explicit approval:

- `blueprint.deleteNode` — Delete a Blueprint node from the graph
- `file.write` to production paths — Write to `/Content/` directories (excluding `/Tests/`)
- `file.delete` — Delete a file permanently

---

## Classification Logic

The classification engine in `src/state/safety.ts` implements context-aware rules:

### File Write Classification

File write operations are classified based on the target path:

- **Dangerous:** Writing to `/Content/` paths (except `/Content/Tests/`)
- **Warn:** All other file writes (temporary files, test data, config files)

Example:
```
/Game/Content/BP_Actor.uasset     -> Dangerous (production Blueprint)
/Game/Content/Tests/Test_BP.uasset -> Warn (test Blueprint)
/Temp/cache.json                  -> Warn (temporary file)
```

### Blueprint Delete Classification

Deleting a Blueprint node is always classified as **Dangerous** because deletion is permanent within the session (though undoable via Ctrl+Z in the UI).

---

## Human-in-the-Loop Approval Flow

When Claude Code requests a dangerous operation, the system enforces a synchronous approval workflow:

### Flow Diagram

```
1. MCP Bridge (Node.js/TS)
   |
   +---> classifyOperation() -> DANGEROUS
   |
   +---> ApprovalGate.requestApproval()
         |
         +---> SendRequest("safety.requestApproval") via WebSocket
               |
               v
2. UE Plugin (C++)
   |
   +---> FUMAMessageHandler receives "safety.requestApproval"
   |
   +---> Dispatch to GameThread:
         AsyncTask(ENamedThreads::GameThread, [...]
         |
         +---> FUMAApprovalGate.ShowApprovalDialog()
         |
         +---> Create and show SUMAApprovalDialog (Slate modal)
               |
               v
3. Developer/User
   |
   +---> Reads dialog:
         - Operation: "blueprint.deleteNode"
         - Reason: "Destructive Blueprint operation"
         - File path: "/Game/BP_TestActor.uasset"
         |
         +---> Clicks "Approve" or "Reject" (or waits 60s timeout)
               |
               v
4. UE Plugin
   |
   +---> FUMAApprovalGate records result
   |
   +---> Send response("approved": true|false) via WebSocket
         |
         v
5. MCP Bridge (Node.js/TS)
   |
   +---> ApprovalGate receives response
   |
   +---> return true (approved) or false (rejected)
         |
         v
6. MCP Tool Handler
   |
   +---> If approved: Execute the dangerous operation
   |
   +---> If rejected: Return error 6001 "Operation rejected by user"
```

### Timing and Timeouts

- **Approval Window:** 60 seconds
- **Auto-Reject:** If the user does not approve within 60 seconds, the operation is automatically rejected
- **Rejection Error Code:** `6001 (OPERATION_REJECTED)`

The UE editor displays a countdown timer in the approval dialog showing seconds remaining.

---

## Core Components

### 1. classifyOperation() — TypeScript

**File:** `mcp-server/src/state/safety.ts`

Classifies an MCP tool request based on tool name and parameters:

```typescript
function classifyOperation(
  toolName: string,
  params: Record<string, unknown>,
): SafetyClassification {
  // Returns: { level: 'safe' | 'warn' | 'dangerous', reason, requiresApproval }
}
```

**Example:**

```typescript
classifyOperation('file-write', { filePath: '/Game/Content/BP_Test.uasset' })
// Returns:
// {
//   level: 'dangerous',
//   reason: 'Writing to production content path',
//   requiresApproval: true
// }
```

### 2. isPathSafe() — TypeScript

**File:** `mcp-server/src/state/safety.ts`

Validates that a file path is within allowed project roots and blocks path traversal attacks:

```typescript
function isPathSafe(filePath: string, allowedRoots: string[]): boolean {
  // Rejects paths with "..", "~", or paths outside allowedRoots
  // Returns: true if safe, false otherwise
}
```

**Protected Patterns (v0.4.3 enhanced):**

- `..` — Path traversal attempts
- `~` — Home directory shortcuts
- Null bytes (`\0`) — Null byte injection
- URL-encoded traversals (`%2e%2e`) — Encoded dot-dot sequences
- Double-encoded traversals (`%252e`) — Double-encoded evasion
- UNC paths (`\\server\share`) — Windows UNC path bypass
- Paths outside allowed roots

**Allowed Roots (Example):**

```
/Game/
/Engine/
/Plugins/
C:\Users\<username>\Documents\
```

### 2a. isAssetPathSafe() — TypeScript (v0.4.3)

**File:** `mcp-server/src/state/safety.ts`

Validates that a UE asset path references an allowed content root:

```typescript
function isAssetPathSafe(assetPath: string): boolean {
  // Accepts paths beginning with /Game/, /Engine/, or /Script/
  // Rejects all other roots
}
```

**Valid roots:** `/Game/`, `/Engine/`, `/Script/`

### 2b. Asset path validation in classifyOperation() (v0.4.3)

`classifyOperation()` now scans 14 asset path parameter keys (e.g., `blueprintPath`, `assetPath`, `materialPath`, `texturePath`, etc.) and flags any request containing an unsafe asset path as **dangerous** before tool execution.

### 3. ApprovalGate — TypeScript

**File:** `mcp-server/src/state/safety.ts`

Manages the approval lifecycle in the MCP server:

```typescript
class ApprovalGate {
  // In production: sends 'safety.requestApproval' via WebSocket
  // Waits for UE plugin response (max 60s)
  // Returns: Promise<boolean>

  async requestApproval(
    classification: SafetyClassification,
    context: ApprovalRequestContext
  ): Promise<boolean>
}
```

**Modes:**

- **Production Mode:** Sends WebSocket message to UE plugin, waits for approval dialog response
- **Test Mode:** Auto-responds based on `setAutoResponse('approve' | 'reject')`
- **Fallback Mode:** If WebSocket bridge is unavailable, times out and rejects (safe default)

### 4. FUMAApprovalGate — C++

**File:** `ue-plugin/Source/UnrealMasterAgent/Public/Safety/UMAApprovalGate.h`
**Implementation:** `ue-plugin/Source/UnrealMasterAgent/Private/Safety/UMAApprovalGate.cpp`

Manages approval dialog lifecycle in the UE editor:

```cpp
class FUMAApprovalGate {
  // Shows Slate approval dialog for dangerous operations
  // Handles approval/rejection and sends response back to MCP server

  void ShowApprovalDialog(
    const FUMAApprovalRequest& Request,
    TFunction<void(bool)> OnResolved
  );
}
```

**Threading:** All public methods must be called on the GameThread. WebSocket message dispatch uses `AsyncTask(ENamedThreads::GameThread, ...)` to ensure safety.

### 5. SUMAApprovalDialog — C++ Slate Widget

**File:** `ue-plugin/Source/UnrealMasterAgent/Public/Safety/UMAApprovalGate.h`
**Implementation:** `ue-plugin/Source/UnrealMasterAgent/Private/Safety/UMAApprovalGate.cpp`

Modal Slate dialog displayed to the developer:

```cpp
class SUMAApprovalDialog : public SCompoundWidget {
  // Slate widget showing:
  // - Title: "Dangerous Operation — Approval Required"
  // - Operation: tool name (e.g., "blueprint.deleteNode")
  // - Reason: classification reason
  // - File Path: (if applicable)
  // - Countdown Timer: seconds remaining (0-60)
  // - Buttons: "Approve", "Reject"

  bool WasApproved() const;
}
```

**Dialog Components:**

1. **Header** — Orange warning label with title
2. **Operation Name** — Tool being requested
3. **Reason** — Human-readable classification reason
4. **File Path** — (Conditional) Path to file being modified
5. **Countdown Timer** — Decrements from 60 to 0 seconds
6. **Approve Button** — Approves the operation
7. **Reject Button** — Denies the operation

---

## Protected Paths

The system prevents writes to system and engine-critical paths:

### Blocked System Paths

- `/System/`, `/Library/` (macOS)
- `C:\Windows\`, `C:\Program Files\` (Windows)
- `C:\Program Files (x86)\` (Windows)
- `/usr/`, `/bin/`, `/etc/` (Unix/Linux)

### Allowed Game Content Paths

- `/Game/Content/` — Production game assets
- `/Game/Content/Tests/` — Test assets (warn level, not dangerous)
- `/Plugins/UnrealMasterAgent/` — Plugin resources
- Temporary/cache directories

---

## Self-Healing Safety (Claude's Responsibility)

The safety system is designed around **Claude orchestrating retry logic**, not server-side state machines:

### Retry Bounds

- **Hard Cap:** 3 iterations maximum
- **Driven By:** Claude's reasoning and error handling
- **State Tracked By:** `SessionManager` (retry counts, compile history)

### Example Flow

1. Claude calls `blueprint.deleteNode` on critical Blueprint
2. SafetyGate blocks → `error 6001: Operation rejected by user`
3. Claude reasons: "User rejected. I should ask for clarification or use a different approach"
4. Claude calls `editor.getLevelInfo` to query the scene (safe operation)
5. Claude makes an alternative suggestion to the user
6. User approves via chat and Claude retries with new operation

The server never auto-retries; Claude always makes the retry decision based on context and user input.

---

## Error Codes

### Safety Gate Errors

| Code | Name | Cause | Remedy |
|------|------|-------|--------|
| 6001 | OPERATION_REJECTED | User clicked "Reject" or timed out | Retry with user approval or choose alternative operation |
| 6002 | UNSAFE_PATH | Path failed safety validation | Use a path within allowed roots |
| 6003 | APPROVAL_TIMEOUT | WebSocket bridge unavailable | Ensure UE editor and MCP server are connected |

### Structured Error Codes (v0.4.1)

Tool handlers now return structured `UMA_E_*` error codes instead of raw strings. See `src/errors.ts`:

| Error Code | Constant | Description |
|-----------|----------|-------------|
| `UMA_E_CONNECTION_LOST` | `ErrorCode.CONNECTION_LOST` | WebSocket client disconnected |
| `UMA_E_CONNECTION_REFUSED` | `ErrorCode.CONNECTION_REFUSED` | Connection refused by server |
| `UMA_E_REQUEST_TIMEOUT` | `ErrorCode.REQUEST_TIMEOUT` | Request timed out |
| `UMA_E_ACTOR_NOT_FOUND` | `ErrorCode.ACTOR_NOT_FOUND` | Actor not found in level |
| `UMA_E_ASSET_NOT_FOUND` | `ErrorCode.ASSET_NOT_FOUND` | Asset not found at path |
| `UMA_E_BLUEPRINT_NOT_FOUND` | `ErrorCode.BLUEPRINT_NOT_FOUND` | Blueprint not found |
| `UMA_E_VALIDATION_ERROR` | `ErrorCode.VALIDATION_ERROR` | Input validation failed |
| `UMA_E_COMPILATION_FAILED` | `ErrorCode.COMPILATION_FAILED` | Compilation error |
| `UMA_E_PERMISSION_DENIED` | `ErrorCode.PERMISSION_DENIED` | Operation denied by safety gate |
| `UMA_E_PYTHON_EXECUTION` | `ErrorCode.PYTHON_EXECUTION_ERROR` | Python script execution error |
| `UMA_E_CIRCUIT_OPEN` | `ErrorCode.CIRCUIT_OPEN` | Circuit breaker is open |
| `UMA_E_TOOL_NOT_FOUND` | `ErrorCode.TOOL_NOT_FOUND` | MCP tool not found |
| `UMA_E_INTERNAL_ERROR` | `ErrorCode.INTERNAL_ERROR` | Unclassified internal error |

---

## WebSocket Authentication (v0.4.3)

The MCP server supports optional shared-secret authentication for incoming WebSocket connections.

- **Env var:** `WS_AUTH_SECRET` — when set, all connecting clients must send the `x-uma-auth-token` header
- **Validation:** Uses `crypto.timingSafeEqual` via HMAC normalization to prevent timing-based secret extraction
- **Default:** No auth required (backward compatible — existing setups are unaffected)
- **File:** `src/transport/ws-auth.ts`

---

## Rate Limiting (v0.4.3)

The `RateLimiter` class enforces a configurable per-minute cap on tool calls using a sliding-window algorithm.

- **Env var:** `RATE_LIMIT_PER_MINUTE` — global limit applied to all 183 tools (default: `0` = disabled)
- **Mechanism:** Sliding window — counts calls in the trailing 60-second window
- **Application:** Injected via `server.tool` monkey-patch at startup; no per-tool changes required
- **File:** `src/state/rate-limiter.ts`

---

## Circuit Breaker (v0.4.1)

The circuit breaker (`src/state/circuit-breaker.ts`) prevents cascading failures by disabling tool execution after consecutive errors:

- **Threshold:** Opens after 5 consecutive failures (configurable)
- **Cooldown:** Auto-transitions to half-open after 60 seconds (configurable)
- **Recovery:** `editor-ping` success resets the circuit breaker to closed
- **States:** `closed` (normal) → `open` (blocking) → `half-open` (probing)

```
Tool call fails
  ↓
CircuitBreaker.recordFailure()
  ↓
consecutiveFailures >= threshold?
  ├─ No → Continue (closed state)
  └─ Yes → Circuit opens → Block requests with UMA_E_CIRCUIT_OPEN
         ↓
         After cooldown → Half-open → Allow one request
         ↓
         Success → Close circuit (reset)
         Failure → Re-open circuit
```

---

## Testing

### Unit Tests

Test the classification logic without requiring UE or WebSocket:

```bash
cd mcp-server
npm test -- safety.test.ts
```

### Integration Tests

Test the full approval workflow with mock WebSocket bridge:

```bash
cd mcp-server
npm test -- approval-gate.integration.test.ts
```

### Automation Tests (UE)

Test the Slate dialog and C++ gate in the UE editor:

```bash
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMaster.Safety" \
  -unattended -nopause -nullrhi
```

---

## Design Rationale

### Why Human-in-the-Loop?

Claude cannot reliably predict the consequences of destructive operations (deleting a Blueprint node might break dependent systems). Requiring explicit human approval ensures developers maintain agency.

### Why WebSocket Synchronous Flow?

The MCP SDK tool handler is async, allowing the approval flow to run synchronously: call `requestApproval()`, wait for user response, then decide whether to execute. This keeps the logic simple and decision-making in Claude's hands.

### Why Max 3 Retries?

Infinite retry loops can cause frustration and resource exhaustion. A hard cap of 3 forces Claude to reason about whether continued retry makes sense, encouraging smarter error recovery strategies.

### Why No Server-Side State Machine?

State machines are difficult to reason about and maintain. Letting Claude (a reasoning agent) orchestrate retries based on error context is more flexible and transparent.

---

## Related Documentation

- [ARCHITECTURE.md](../ARCHITECTURE.md) — Full system architecture and 4-layer design
- [API Reference](./api-reference/) — MCP tool definitions and parameters
- [Setup Guide](./setup-guide.md) — Installation and configuration
