# Unreal Master Agent — Architecture

**Version:** 0.4.1
**Date:** 2026-02-25 (Updated: 2026-03-08)
**Status:** Implementation Complete (Phase 0-15 done, 183 MCP tools across 37 domains)

---

## 1. System Overview

This project creates a 4-layer autonomous AI agent that enables Claude Code to bidirectionally communicate with Unreal Engine internals — manipulating Blueprints, generating Slate UI code, triggering Live Coding compilation, and self-healing from compile errors.

The agent design follows a strict separation of concerns: the LLM reasons and orchestrates at Layer 1, a thin Node.js bridge translates MCP protocol to WebSocket at Layer 2, a C++ plugin executes UE operations on the GameThread at Layer 3, and native engine APIs are consumed at Layer 4. No layer has knowledge of layers more than one hop away.

---

## 2. 4-Layer Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: MCP Host (Claude Code)                        │
│  - Interprets natural language                          │
│  - Decides tool call sequences                          │
│  - Handles self-healing retry logic                     │
└───────────────────┬─────────────────────────────────────┘
                    │ stdio (JSON-RPC 2.0)
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: MCP Bridge Server (Node.js / TypeScript)      │
│  - McpServerBootstrap  (src/index.ts)                   │
│  - ToolRegistry        (src/tools/registry.ts)          │
│  - WebSocketBridge     (src/transport/websocket-bridge) │
│  - MessageCodec        (src/transport/message-codec)    │
│  - ConnectionManager   (src/transport/connection-mgr)   │
│  - CacheStore          (src/state/cache-store.ts)       │
│  - SafetyGate          (src/state/safety.ts)            │
│  - Tracer              (src/observability/tracer.ts)    │
└───────────────────┬─────────────────────────────────────┘
                    │ WebSocket (RFC 6455)
                    │ Node.js listens / UE connects as client
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 3: UE Agent Plugin (C++)                         │
│  - FUnrealMasterAgentModule  (plugin lifecycle)         │
│  - UUMAEditorSubsystem       (UEditorSubsystem state)   │
│  - FUMAWebSocketClient       (connects to Node.js WS)   │
│  - FUMAMessageHandler        (routes by method)         │
│  - FUMABlueprintSerializer   (UEdGraph → JSON)          │
│  - FUMABlueprintManipulator  (node spawn / pin link)    │
│  - FUMALiveCodingController  (ILiveCodingModule wrap)   │
│  - FUMACompileLogParser      (FOutputDevice hook)       │
└───────────────────┬─────────────────────────────────────┘
                    │ Direct C++ API calls
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Engine APIs                                   │
│  - UEdGraph / UEdGraphNode / UEdGraphPin                │
│  - FKismetEditorUtilities                               │
│  - UEdGraphSchema_K2                                    │
│  - ILiveCodingModule                                    │
│  - FOutputDevice                                        │
└─────────────────────────────────────────────────────────┘
```

### Layer Details

#### Layer 1: MCP Host (Claude Code)

- External, not our code
- Interprets natural language and decides tool call sequences
- Handles self-healing retry orchestration (hard cap: 3 retries)
- Configuration via `.claude/mcp.json`

#### Layer 2: MCP Bridge Server (Node.js / TypeScript)

| Module | Path | Responsibility |
|--------|------|----------------|
| `McpServerBootstrap` | `src/index.ts` | Creates `McpServer`, binds `StdioServerTransport` |
| `ToolRegistry` | `src/tools/registry.ts` | Static + dynamic tool registration |
| `WebSocketBridge` | `src/transport/websocket-bridge.ts` | WS server; Node.js listens, UE connects as client |
| `MessageCodec` | `src/transport/message-codec.ts` | Encode/decode with Zod validation |
| `ConnectionManager` | `src/transport/connection-manager.ts` | Connection state tracking, disconnect counting, reconnection stats |
| `ToolTimeouts` | `src/transport/tool-timeouts.ts` | Per-tool timeout config (30s default, 300s for long ops) |
| `CacheStore` | `src/state/cache-store.ts` | LRU key-value store for stateful caching |
| `SafetyGate` | `src/state/safety.ts` | Human-in-the-loop approval for destructive ops |
| `CircuitBreaker` | `src/state/circuit-breaker.ts` | Resilience: opens after N failures, auto-resets after cooldown |
| `ErrorCodes` | `src/errors.ts` | Structured `UMA_E_*` error codes and helpers |
| `Tracer` | `src/observability/tracer.ts` | OpenTelemetry-compatible traces |

> **CRITICAL CONSTRAINT:** All debug output MUST go to `stderr`. `stdout` is exclusively for JSON-RPC messages. A single `console.log()` will corrupt the JSON-RPC stream.

#### Layer 3: UE Agent Plugin (C++)

| Class | Responsibility |
|-------|----------------|
| `FUnrealMasterAgentModule` | Plugin lifecycle (`StartupModule` / `ShutdownModule`) |
| `UUMAEditorSubsystem` | `UEditorSubsystem` for persistent editor-session state |
| `FUMAWebSocketClient` | Connects to Node.js WS server (UE is CLIENT, not server) |
| `FUMAMessageHandler` | Routes messages by method, dispatches to GameThread |
| `FUMABlueprintSerializer` | `UEdGraph` → JSON serializer |
| `FUMABlueprintManipulator` | Node spawn, pin link via `TryCreateConnection` |
| `FUMALiveCodingController` | `ILiveCodingModule` wrapper |
| `FUMACompileLogParser` | Compile output parser via `FOutputDevice` hook |

> **CRITICAL CONSTRAINT:** Almost every UE editor API is GameThread-only. WebSocket callbacks run on a background thread. Every incoming WS message MUST dispatch to the GameThread via:
> ```cpp
> AsyncTask(ENamedThreads::GameThread, [=]() { /* UE API calls here */ });
> ```

#### Layer 4: Engine APIs

| API | Usage |
|-----|-------|
| `UEdGraph`, `UEdGraphNode`, `UEdGraphPin` | Blueprint graph traversal and mutation |
| `FKismetEditorUtilities` | Blueprint editor utilities (compile, create BP) |
| `UEdGraphSchema_K2` | Schema for pin connection validation |
| `ILiveCodingModule` | Hot-reload compilation trigger |
| `FOutputDevice` | Log capture for compile error parsing |

---

## 3. Communication Protocol

### 3.1 WebSocket Message Envelope

**Request** (MCP Bridge Server → UE Plugin):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "blueprint.serialize",
  "params": { "blueprintPath": "/Game/BP_TestActor" },
  "timestamp": 1740441600000
}
```

**Response** (UE Plugin → MCP Bridge Server):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "result": { "cacheKey": "bp_abc123", "summary": "EventGraph: 5 nodes" },
  "duration_ms": 42
}
```

**Error Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "error": {
    "code": 3001,
    "message": "Blueprint asset not found: /Game/BP_Missing",
    "data": { "searchedPaths": ["/Game/BP_Missing.uasset"] }
  },
  "duration_ms": 3
}
```

### 3.2 Error Code Taxonomy

| Code Range | Category | Examples |
|------------|----------|---------|
| 1000–1099 | Connection | WS disconnect, handshake failure, timeout |
| 2000–2099 | Handler routing | Unknown method (2001) |
| 3000–3099 | Parameter validation | Missing required parameter (3001) |
| 4000–4099 | Blueprint operations | Node spawn failed (4001), pin connection failed (4002), delete failed (4003), property modify failed (4004) |
| 5000–5099 | Internal / compilation | Serialization error (5000), Live Coding not initialized (5001), not available (5002), not enabled (5003), already compiling (5004) |
| 6000–6099 | Safety gate | ApprovalGate not initialized (6000), approval rejected or timeout (6001) |

---

## 4. Data Flow

### 4.1 Complete End-to-End Trace

> **User prompt:** "Add PrintString to BP_TestActor after BeginPlay"

```
Step 1  Claude Code interprets natural language
        → calls tool: blueprint.serialize { blueprintPath: "/Game/BP_TestActor" }

Step 2  MCP Server validates params (Zod)
        → encodes WSMessage (id, method, params, timestamp)
        → sends over WebSocket to UE Plugin

Step 3  UE Plugin receives on WS background thread
        → AsyncTask(GameThread) dispatches

Step 4  GameThread: FUMABlueprintSerializer
        → loads UBlueprint from asset registry
        → traverses UEdGraph nodes and pins
        → serializes to Blueprint AST JSON

Step 5  Large result stored in CacheStore
        → returns cache key + summary to Claude
        (e.g., { cacheKey: "bp_abc123", nodeCount: 5 })

Step 6  Claude calls: blueprint.createNode
        { blueprintPath: "/Game/BP_TestActor",
          nodeClass: "UK2Node_CallFunction",
          functionName: "PrintString",
          posX: 400, posY: 200 }
        → UE spawns node on GameThread

Step 7  Claude calls: blueprint.connectPins
        { blueprintPath: "/Game/BP_TestActor",
          sourceNodeId: "<BeginPlay-uuid>",
          sourcePinId: "<exec-out-uuid>",
          targetNodeId: "<PrintString-uuid>",
          targetPinId: "<exec-in-uuid>" }
        → UE calls UEdGraphSchema_K2::TryCreateConnection()

Step 8  Claude reports success to user
```

### 4.2 Threading Model

```
WebSocket Thread          GameThread                Response Path
──────────────────────────────────────────────────────────────────
Receive WS frame
  │
  ├── Decode & validate (Zod)
  │
  └── AsyncTask(GameThread) ──────────────────────►
                                Execute UE API call
                                (UEdGraph, etc.)
                                      │
                                      │ TPromise / callback
                                      ◄──────────────────────────
                              Encode WSResponse
                              WebSocketBridge.send()
```

---

## 5. Key Architecture Decisions

### Decision 1: Reverse WebSocket Direction

**Decision:** UE is the WebSocket CLIENT; Node.js is the SERVER.

**Rationale:** UE ships a mature WebSocket client (`FWebSocketsModule`) but has no stable WebSocket server API. Node.js has trivial WS server support via the `ws` package. This eliminates the riskiest technical unknown.

**Trade-off:** Connection initiator is reversed from a naive reading of the PRD, but data flow and semantics are identical. The class name `FUMAWebSocketClient` reflects this correctly.

**Note:** Any reference to `UMAWebSocketServer` in earlier analysis documents is superseded by this decision. The canonical name is `FUMAWebSocketClient`.

---

### Decision 2: In-Memory LRU Caching

**Decision:** Use in-memory LRU cache (CacheStore), not Redis.

**Rationale:** This is a single-user desktop tool. The MCP server restarts per-session. Redis adds deployment complexity with no measurable benefit.

**Config:** Max 1000 entries, 60-second TTL, LRU eviction policy.

**Future:** If multi-user server deployment is needed, migration path is in-memory → SQLite → Redis.

---

### Decision 3: TryCreateConnection over MakeLinkTo

**Decision:** ALWAYS use `UEdGraphSchema_K2::TryCreateConnection()` for pin linking.

**Rationale:** `TryCreateConnection` handles polymorphic pin type propagation (e.g., ForEachLoop wildcard pins). `MakeLinkTo` bypasses schema validation entirely and can corrupt the Blueprint graph.

**Rule:** `MakeLinkTo` is NEVER used in this project. Any code review finding `MakeLinkTo` in `FUMABlueprintManipulator` should treat it as a bug.

---

### Decision 4: Self-Healing via Claude Reasoning

**Decision:** The self-healing compile-error loop is driven by Claude Code's reasoning, NOT a server-side state machine.

**Rationale:** Claude can reason about arbitrary compile errors and novel fix strategies. A fixed state machine would be brittle and limited to anticipated failure modes. The MCP server provides atomic tools; Claude provides orchestration intelligence.

**Safety:** Hard cap at 3 retry loops to prevent infinite loops. Implemented at the MCP tool handler layer.

---

### Decision 5: Python as Primary Automation Layer

**Decision:** Use Python extensively for UE automation operations alongside C++ for core/low-level operations.

**Rationale:** UE's Python API (`unreal` module) provides comprehensive access to editor operations including asset management, material editing, actor manipulation, level operations, and more. Python scripts are faster to iterate on than C++ and don't require recompilation.

**Architecture:** 154 Python scripts in `ue-plugin/Content/Python/uma/` are executed via the `python-execute` MCP tool. Each script follows a standard pattern with `execute(params)` entry point and `@execute_wrapper` decorator for error handling. The C++ plugin handles low-level Blueprint graph manipulation and WebSocket communication where Python APIs are insufficient.

**Updated from original:** The original decision to minimize Python was revised after discovering that UE's Python API is sufficient for the majority of editor automation tasks. C++ remains essential for Blueprint graph internals (UEdGraph, pin connections) and WebSocket transport.

---

### Decision 6: Stateful Tool Caching

**Decision:** Cache large results (Blueprint AST, actor lists) server-side; return only a cache key + summary to Claude.

**Rationale:** Blueprint ASTs can be hundreds of KB. Returning the full AST to Claude consumes tokens unnecessarily. Subsequent operations reference the cached data via key.

**Config:** Max 1000 entries, 60-second TTL, LRU eviction.

**Cache key format:** `{category}_{sha256(params)[0:8]}` (e.g., `bp_abc12345`)

---

## 6. Safety Architecture

### Operation Classification

| Class | Examples | Approval |
|-------|----------|----------|
| **Safe** | Queries, reads, ping | None required |
| **Warn** | Write to new files | Logged, auto-approved |
| **Dangerous** | Overwrite existing Blueprint, delete node, modify production assets | Explicit human approval |

### Human-in-the-Loop Flow

```
Agent requests dangerous operation
         │
         ▼
SafetyGate.check() → BLOCKED
         │
         ▼
MCP Server sends approval request via WS to UE Plugin
         │
         ▼
UE Plugin shows Slate approval dialog
  ┌──────┴──────┐
  │             │
Approve       Reject / 60s timeout
  │             │
  ▼             ▼
Proceed      Abort with error 6000
```

The 60-second approval timeout prevents the agent from hanging indefinitely if the developer steps away.

---

## 7. TDD Strategy

### MCP Server (Vitest)

| Test Type | Scope | Fixtures |
|-----------|-------|---------|
| Unit | Zod schema validation, tool handler logic, codec round-trips | `sample-blueprint.json`, `sample-compile-error.json` |
| Integration | Full tool call through mock WebSocket | Mock UE plugin responder |
| Contract | WSMessage / WSResponse schema conformance | `ws-protocol.schema.json` |

Test file convention: `tests/unit/<domain>/<file>.test.ts` and `tests/integration/<file>.test.ts`

### UE Plugin (UE Automation Framework)

```cpp
// Simple test example
IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FUMABlueprintSerializerTest,
    "UnrealMaster.Blueprint.Serializer",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductionFilter
)
bool FUMABlueprintSerializerTest::RunTest(const FString& Parameters)
{
    // Load BP_SerializationFixture, call Serialize(), assert JSON structure
    return true;
}
```

Headless execution:
```bash
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMaster" \
  -unattended -nopause -nullrhi
```

Test fixture assets: `BP_TestActor`, `BP_SerializationFixture`

### E2E Tests

Manual/scripted workflow:
1. Launch UE Editor with plugin enabled
2. Start MCP Bridge Server (`npm run dev`)
3. Execute tool calls via Claude Code or direct MCP client
4. Assert results (Blueprint state, compile status)

---

## 8. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| LLM Host | Claude Code (Claude Sonnet / Opus) | Latest |
| MCP SDK | `@modelcontextprotocol/sdk` | ^1.12.0 |
| Bridge Server Runtime | Node.js | 20+ |
| Bridge Server Language | TypeScript | 5.5+ |
| WebSocket Library | `ws` | ^8.18.0 |
| Schema Validation | `zod` | ^3.23.0 |
| Test Runner | `vitest` | ^2.0.0 |
| UE Plugin Language | C++ | UE 5.4 |
| Transport Protocol | WebSocket | RFC 6455 |
| Serialization | JSON | — |
| Observability | LangSmith / Langfuse | Latest |

---

## 9. Project Structure

```
Unreal Master/
├── ARCHITECTURE.md          ← this document
├── README.md
├── AGENTS.md
├── package.json             (workspace root)
│
├── mcp-server/              ← Layer 2: Node.js/TypeScript bridge
│   ├── src/
│   │   ├── index.ts         (McpServerBootstrap)
│   │   ├── server.ts        (183 tools registered across 37 domains)
│   │   ├── tools/           Tool handlers by domain
│   │   │   ├── editor/      Editor queries (ping, list-actors, level-info)
│   │   │   ├── blueprint/   Blueprint graph manipulation
│   │   │   ├── compilation/ Live Coding trigger and status
│   │   │   ├── slate/       Slate UI generation
│   │   │   ├── file/        File read/write/search
│   │   │   ├── chat/        In-editor chat
│   │   │   ├── actor/       Actor CRUD and transforms
│   │   │   ├── material/    Material creation and parameters
│   │   │   ├── mesh/        Mesh info, LOD, collision
│   │   │   ├── level/       Level management
│   │   │   ├── asset/       Asset pipeline operations
│   │   │   ├── animation/   Animation montages and blend spaces
│   │   │   ├── content/     Asset listing and search
│   │   │   ├── datatable/   DataTable CRUD
│   │   │   ├── build/       Build pipeline
│   │   │   ├── project/     Project introspection
│   │   │   ├── gameplay/    Input actions and game mode
│   │   │   ├── python/      Python script execution bridge
│   │   │   ├── sourcecontrol/ Source control integration
│   │   │   ├── debug/       Console, logs, performance
│   │   │   ├── sequencer/   Cinematics
│   │   │   ├── ai/          Behavior trees, nav mesh
│   │   │   ├── widget/      UMG widgets
│   │   │   ├── texture/     Texture pipeline
│   │   │   ├── niagara/     Niagara VFX
│   │   │   ├── audio/       Audio pipeline
│   │   │   ├── landscape/   Landscape ops
│   │   │   ├── physics/     Physics assets
│   │   │   ├── worldpartition/ World partition
│   │   │   ├── foliage/     Foliage types
│   │   │   ├── curve/       Curve assets
│   │   │   ├── pcg/         PCG graphs
│   │   │   ├── geoscript/   Geometry script
│   │   │   ├── workflow/    Workflow templates
│   │   │   ├── analyze/     Analysis tools
│   │   │   ├── refactor/    Refactoring tools
│   │   │   └── context/     Context intelligence
│   │   ├── errors.ts              Structured UMA_E_* error codes
│   │   ├── transport/
│   │   │   ├── websocket-bridge.ts
│   │   │   ├── message-codec.ts
│   │   │   ├── connection-manager.ts
│   │   │   └── tool-timeouts.ts   Per-tool timeout configuration
│   │   ├── state/
│   │   │   ├── cache-store.ts
│   │   │   ├── safety.ts
│   │   │   └── circuit-breaker.ts Circuit breaker for resilience
│   │   └── observability/
│   │       └── tracer.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── ue-plugin/               ← Layer 3: C++ UE Plugin + Python automation
│   ├── UnrealMasterAgent.uplugin
│   ├── Content/Python/uma/  154 Python scripts (actor, material, level, sequencer, ai, etc.)
│   └── Source/
│       ├── UnrealMasterAgent/      Main module
│       │   ├── UnrealMasterAgent.Build.cs
│       │   ├── Public/
│       │   │   ├── WebSocket/     WS client + message types
│       │   │   ├── Blueprint/     Serializer + manipulator
│       │   │   ├── Compilation/   Live Coding controller + log parser
│       │   │   ├── Editor/        EditorSubsystem + ChatPanel
│       │   │   ├── FileOps/       File read/write/search
│       │   │   ├── Python/        Python script execution bridge
│       │   │   └── Safety/        ApprovalGate + Slate dialog
│       │   └── Private/           Implementations (.cpp)
│       └── UnrealMasterAgentTests/ Test module (9 test files + module entry)
│
├── TestProject/             ← UE5 development/test project
│   ├── Source/UMATestProject/  C++ gameplay classes
│   │   ├── PatrollingActor.*   Patrol system with LinkedActors support
│   │   └── PatrolLocationSphere.*  Patrol waypoints
│   └── Plugins/UnrealMasterAgent/  Plugin with Python scripts
│
└── docs/
    ├── api-reference/
    │   └── mcp-tools.md              MCP tool API reference (183 tools)
    ├── coding-conventions/
    │   └── README.md                 TypeScript + C++ coding conventions
    ├── slate-templates/              7 Slate UI RAG templates
    ├── setup-guide.md                Installation and configuration
    ├── websocket-protocol.md         WS protocol specification
    ├── safety-architecture.md        Safety system documentation
    └── AGENTS.md                     Documentation index
```
