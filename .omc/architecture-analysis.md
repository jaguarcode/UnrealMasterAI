Now I have enough context. Let me produce the comprehensive analysis.

---

# Comprehensive Architectural Analysis: Unreal Engine Autonomous AI Agent via MCP

## 0. Executive Summary

This project creates a 4-layer autonomous agent that lets Claude Code manipulate Unreal Engine internals (Blueprints, Slate UI, Live Coding) via MCP. The architecture is sound in principle but carries substantial risk in three areas: (1) Blueprint AST serialization has no established JSON format and requires deep C++ work against undocumented internal APIs, (2) Live Coding's `ILiveCodingModule` is a semi-private API with no guaranteed stability contract, and (3) the WebSocket server inside UE must coexist with the editor's GameThread constraints. Below is the complete architectural breakdown.

---

## 1. Project Directory Structure

```
unreal-master/
|
|-- .claude/                          # Claude Code MCP configuration
|   |-- mcp.json                      # MCP server registration (stdio transport)
|   `-- settings.json                 # Claude Code project settings
|
|-- .vscode/                          # VS Code workspace config
|   |-- settings.json
|   |-- tasks.json                    # Build tasks for both TS and UE
|   `-- launch.json                   # Debug configs
|
|-- mcp-server/                       # Node.js/TypeScript MCP Bridge Server
|   |-- package.json                  # Dependencies: @modelcontextprotocol/sdk, zod, ws, vitest
|   |-- tsconfig.json                 # TypeScript strict config, ESM output
|   |-- vitest.config.ts              # Test runner configuration
|   |-- src/
|   |   |-- index.ts                  # Entry point: McpServer + StdioServerTransport init
|   |   |-- server.ts                 # McpServer setup, tool registration orchestrator
|   |   |-- transport/
|   |   |   |-- websocket-bridge.ts   # WebSocket client connecting to UE plugin
|   |   |   |-- connection-manager.ts # Reconnection logic, health checks, backoff
|   |   |   `-- message-codec.ts      # JSON-RPC <-> UE message format translation
|   |   |-- tools/
|   |   |   |-- registry.ts           # Tool registration (static + dynamic/RAG)
|   |   |   |-- tool-schemas.ts       # Zod schemas for all tool inputs/outputs
|   |   |   |-- blueprint/
|   |   |   |   |-- get-blueprint.ts      # Serialize BP to JSON
|   |   |   |   |-- create-node.ts        # Spawn node in BP graph
|   |   |   |   |-- connect-pins.ts       # Link pins between nodes
|   |   |   |   |-- modify-property.ts    # Change node property values
|   |   |   |   `-- delete-node.ts        # Remove node from graph
|   |   |   |-- slate/
|   |   |   |   |-- generate-widget.ts    # Generate Slate C++ from prompt
|   |   |   |   |-- list-templates.ts     # List available Slate RAG templates
|   |   |   |   `-- validate-slate.ts     # Pre-validate Slate syntax patterns
|   |   |   |-- compilation/
|   |   |   |   |-- trigger-compile.ts    # Invoke Live Coding compile
|   |   |   |   |-- get-compile-status.ts # Poll compilation result
|   |   |   |   `-- get-errors.ts         # Retrieve parsed compile errors
|   |   |   |-- editor/
|   |   |   |   |-- get-level-info.ts     # Current level metadata
|   |   |   |   |-- list-actors.ts        # Enumerate actors in level
|   |   |   |   |-- get-asset-info.ts     # Asset metadata query
|   |   |   |   `-- execute-command.ts    # Run editor console command
|   |   |   `-- file/
|   |   |       |-- read-file.ts          # Read project file content
|   |   |       |-- write-file.ts         # Write/create source file
|   |   |       `-- search-files.ts       # Glob/grep in project tree
|   |   |-- state/
|   |   |   |-- cache-store.ts        # Stateful result caching (key-value)
|   |   |   |-- session.ts            # Session state management
|   |   |   `-- safety.ts             # Human-in-the-loop gate logic
|   |   |-- rag/
|   |   |   |-- embedding-store.ts    # Tool/template embedding index
|   |   |   |-- semantic-search.ts    # Vector similarity for tool retrieval
|   |   |   `-- slate-templates.ts    # Slate template loading + indexing
|   |   |-- observability/
|   |   |   |-- tracer.ts             # LangSmith/Langfuse trace emission
|   |   |   |-- metrics.ts            # Tool call latency, success rates
|   |   |   `-- logger.ts             # stderr-only logging (critical for stdio)
|   |   `-- types/
|   |       |-- messages.ts           # Shared message type definitions
|   |       |-- blueprint-schema.ts   # Blueprint JSON AST type definitions
|   |       |-- compile-result.ts     # Compilation result types
|   |       `-- ws-protocol.ts        # WebSocket message envelope types
|   `-- tests/
|       |-- unit/
|       |   |-- tools/
|       |   |   |-- blueprint.test.ts
|       |   |   |-- slate.test.ts
|       |   |   `-- compilation.test.ts
|       |   |-- transport/
|       |   |   |-- websocket-bridge.test.ts
|       |   |   `-- message-codec.test.ts
|       |   |-- state/
|       |   |   |-- cache-store.test.ts
|       |   |   `-- safety.test.ts
|       |   `-- rag/
|       |       `-- semantic-search.test.ts
|       |-- integration/
|       |   |-- mcp-tool-roundtrip.test.ts    # Tool call -> WS -> mock UE -> response
|       |   |-- reconnection.test.ts          # Connection drop/recovery
|       |   `-- safety-gate.test.ts           # Human approval flow
|       `-- fixtures/
|           |-- sample-blueprint.json         # Reference BP AST for tests
|           |-- sample-compile-error.json     # Mock compile error output
|           `-- mock-ws-server.ts             # Fake UE WebSocket endpoint
|
|-- ue-plugin/                        # Unreal Engine C++ Plugin
|   |-- UnrealMasterAgent.uplugin     # Plugin descriptor
|   |-- Source/
|   |   |-- UnrealMasterAgent/
|   |   |   |-- UnrealMasterAgent.Build.cs     # Module build rules
|   |   |   |-- Public/
|   |   |   |   |-- UnrealMasterAgent.h        # Module declaration
|   |   |   |   |-- WebSocket/
|   |   |   |   |   |-- UMAWebSocketServer.h       # WS server (runs on background thread)
|   |   |   |   |   |-- UMAMessageHandler.h        # Message routing/dispatch
|   |   |   |   |   `-- UMAMessageTypes.h          # Incoming/outgoing message structs
|   |   |   |   |-- Blueprint/
|   |   |   |   |   |-- UMABlueprintSerializer.h   # UEdGraph -> JSON serializer
|   |   |   |   |   |-- UMABlueprintManipulator.h  # Node spawn, pin link, property set
|   |   |   |   |   `-- UMABlueprintTypes.h        # Serialization struct definitions
|   |   |   |   |-- Compilation/
|   |   |   |   |   |-- UMALiveCodingController.h  # ILiveCodingModule wrapper
|   |   |   |   |   `-- UMACompileLogParser.h      # Compile output log parser
|   |   |   |   |-- FileOps/
|   |   |   |   |   `-- UMAFileOperations.h        # File read/write/search from engine
|   |   |   |   |-- Editor/
|   |   |   |   |   |-- UMAEditorQueries.h         # Level/actor/asset info queries
|   |   |   |   |   `-- UMAEditorSubsystem.h       # UEditorSubsystem for lifecycle mgmt
|   |   |   |   `-- Safety/
|   |   |   |       `-- UMAApprovalGate.h          # In-editor approval dialog
|   |   |   `-- Private/
|   |   |       |-- UnrealMasterAgent.cpp          # Module startup/shutdown
|   |   |       |-- WebSocket/
|   |   |       |   |-- UMAWebSocketServer.cpp
|   |   |       |   `-- UMAMessageHandler.cpp
|   |   |       |-- Blueprint/
|   |   |       |   |-- UMABlueprintSerializer.cpp
|   |   |       |   `-- UMABlueprintManipulator.cpp
|   |   |       |-- Compilation/
|   |   |       |   |-- UMALiveCodingController.cpp
|   |   |       |   `-- UMACompileLogParser.cpp
|   |   |       |-- FileOps/
|   |   |       |   `-- UMAFileOperations.cpp
|   |   |       |-- Editor/
|   |   |       |   |-- UMAEditorQueries.cpp
|   |   |       |   `-- UMAEditorSubsystem.cpp
|   |   |       `-- Safety/
|   |   |           `-- UMAApprovalGate.cpp
|   |   `-- UnrealMasterAgentTests/             # UE Automation Test module
|   |       |-- UnrealMasterAgentTests.Build.cs
|   |       |-- Public/
|   |       |   `-- UMATestHelpers.h
|   |       `-- Private/
|   |           |-- UMABlueprintSerializerTest.cpp
|   |           |-- UMABlueprintManipulatorTest.cpp
|   |           |-- UMAWebSocketServerTest.cpp
|   |           |-- UMAMessageHandlerTest.cpp
|   |           |-- UMALiveCodingControllerTest.cpp
|   |           `-- UMACompileLogParserTest.cpp
|   |-- Content/                      # Plugin content (test Blueprint assets)
|   |   `-- Tests/
|   |       |-- BP_TestActor.uasset
|   |       `-- BP_SerializationFixture.uasset
|   `-- Resources/
|       `-- Icon128.png
|
|-- docs/                             # RAG Knowledge Base
|   |-- slate-templates/
|   |   |-- base-widget.md            # SCompoundWidget boilerplate
|   |   |-- list-view.md              # SListView pattern
|   |   |-- tree-view.md              # STreeView pattern
|   |   |-- details-panel.md          # Property editor panel
|   |   |-- toolbar.md                # SToolBarButtonBlock pattern
|   |   |-- dialog.md                 # SWindow modal dialog
|   |   `-- tab-widget.md             # SDockTab pattern
|   |-- api-reference/
|   |   |-- uedgraph-pin-api.md       # UEdGraphPin method reference
|   |   |-- kismet-utilities-api.md   # FKismetEditorUtilities reference
|   |   |-- live-coding-api.md        # ILiveCodingModule interface
|   |   `-- slate-macros-api.md       # SNew/SAssignNew/SLATE_BEGIN_ARGS reference
|   |-- coding-conventions/
|   |   |-- epic-cpp-standard.md      # Epic's C++ coding standard
|   |   |-- slate-style-guide.md      # Slate-specific conventions
|   |   `-- blueprint-naming.md       # BP naming conventions
|   `-- schemas/
|       |-- blueprint-ast.schema.json # JSON Schema for Blueprint AST format
|       |-- ws-protocol.schema.json   # WebSocket message schema
|       `-- tool-manifest.schema.json # MCP tool definition schema
|
|-- scripts/                          # Development/CI scripts
|   |-- dev-start.sh                  # Start MCP server in dev mode
|   |-- test-all.sh                   # Run all test suites (TS + UE)
|   `-- generate-schemas.ts           # Auto-generate JSON schemas from Zod
|
|-- PRD.md                            # Product Requirements Document
|-- AGENTS.md                         # AI agent documentation
|-- README.md                         # Project overview
|-- ARCHITECTURE.md                   # This document (architecture decisions)
`-- .gitignore
```

**Rationale for key structural decisions:**

- The monorepo keeps `mcp-server/` and `ue-plugin/` as peer directories rather than nesting the plugin inside a UE project. This allows the plugin to be installed into any UE project via symlink or copy, while the MCP server remains project-agnostic.
- The UE plugin uses a separate test module (`UnrealMasterAgentTests`) rather than embedding tests in the main module, following UE best practices where automation tests use `EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter`.
- The `docs/` directory is structured for RAG consumption -- each `.md` file is a self-contained template that can be embedded and retrieved by semantic search.

---

## 2. Architecture Design

### 2.1. Layer-by-Layer Breakdown

#### Layer 1: MCP Host (Claude Code) -- External, Not Our Code

Claude Code acts as the MCP Host. It interprets natural language, decides which tools to invoke, and processes results. Configuration is our responsibility; implementation is not.

**Configuration contract (`.claude/mcp.json`):**
```json
{
  "mcpServers": {
    "unreal-master-agent": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "UE_WS_PORT": "9877",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Layer 2: MCP Bridge Server (Node.js/TypeScript)

**Key classes and responsibilities:**

| Class/Module | File | Responsibility |
|---|---|---|
| `McpServerBootstrap` | `src/index.ts` | Creates `McpServer`, binds `StdioServerTransport`, wires tool registry |
| `ToolRegistry` | `src/tools/registry.ts` | Registers all MCP tools (static at boot, dynamic via RAG at runtime) |
| `WebSocketBridge` | `src/transport/websocket-bridge.ts` | Maintains persistent WS connection to UE plugin, request/response correlation |
| `MessageCodec` | `src/transport/message-codec.ts` | Encodes MCP tool calls into UE-understood JSON envelopes, decodes responses |
| `ConnectionManager` | `src/transport/connection-manager.ts` | Exponential backoff reconnection, heartbeat, connection state machine |
| `CacheStore` | `src/state/cache-store.ts` | LRU key-value store for stateful caching (Blueprint data, actor lists) |
| `SafetyGate` | `src/state/safety.ts` | Human-in-the-loop approval: blocks destructive operations until confirmed |
| `Tracer` | `src/observability/tracer.ts` | Emits OpenTelemetry-compatible traces to LangSmith/Langfuse |

**Critical design constraint -- stdio purity:** All debug output MUST go to `stderr`. The `stdout` channel is exclusively for JSON-RPC messages between Claude Code and the MCP server. A single `console.log()` call will corrupt the JSON-RPC stream and crash the session. The `logger.ts` module must enforce this by overriding `console.log` to redirect to `stderr`.

**WebSocket Bridge -- Request/Response Correlation:**

```
MCP Tool Call                    WebSocket Message            UE Plugin
============                    =================            =========
toolCallId: "abc123"    --->    { id: "abc123",      --->    Process command
                                  method: "blueprint.serialize",
                                  params: { assetPath: "/Game/BP_Actor" }
                                }
                        <---    { id: "abc123",      <---    Return result
                                  result: { ... },
                                  error: null
                                }
```

The bridge maintains a `Map<string, { resolve, reject, timeout }>` for pending requests. Each outgoing message gets a unique ID. Responses are correlated by ID. A 30-second timeout per request prevents indefinite hangs.

#### Layer 3: WebSocket Communication Protocol

**Message Envelope Schema:**

```typescript
interface WSMessage {
  id: string;                    // UUID v4, for request/response correlation
  method: string;                // Dot-notation command: "blueprint.serialize"
  params: Record<string, unknown>; // Command-specific payload
  timestamp: number;             // Unix ms, for latency tracking
}

interface WSResponse {
  id: string;                    // Correlates to request ID
  result?: unknown;              // Success payload
  error?: {
    code: number;                // Error category (see table below)
    message: string;             // Human-readable description
    data?: unknown;              // Structured error context
  };
  duration_ms: number;           // Server-side processing time
}
```

**Error code taxonomy:**

| Code Range | Category | Examples |
|---|---|---|
| 1000-1099 | Connection | WS disconnect, handshake failure |
| 2000-2099 | Validation | Invalid params, unknown method |
| 3000-3099 | Blueprint | Asset not found, invalid pin type |
| 4000-4099 | Compilation | Live Coding unavailable, compile failed |
| 5000-5099 | File System | Permission denied, file not found |
| 6000-6099 | Safety | Approval required, operation blocked |

#### Layer 4: UE Agent Plugin (C++)

**Module structure:**

The plugin is an Editor-only module (`Type: Editor` in `.uplugin`) since it manipulates editor-side constructs (Blueprint graphs, Slate widgets, Live Coding). It MUST NOT ship in runtime builds.

**Key C++ classes:**

| Class | Responsibility | Thread Model |
|---|---|---|
| `FUnrealMasterAgentModule` | Plugin lifecycle, starts/stops WS server | GameThread (Startup/Shutdown) |
| `UUMAEditorSubsystem` | `UEditorSubsystem` -- persistent editor-lifetime object for state | GameThread |
| `FUMAWebSocketServer` | Listens on configurable port, accepts bridge connection | Background FRunnable thread |
| `FUMAMessageHandler` | Routes incoming WS messages to appropriate handler by `method` | GameThread (dispatched via `AsyncTask`) |
| `FUMABlueprintSerializer` | Traverses `UEdGraph` nodes/pins, produces JSON | GameThread (requires GEditor access) |
| `FUMABlueprintManipulator` | Spawns nodes via `FKismetEditorUtilities`, links pins via `UEdGraphPin::MakeLinkTo` and `UEdGraphSchema_K2::TryCreateConnection` | GameThread |
| `FUMALiveCodingController` | Wraps `ILiveCodingModule`, triggers compile, listens for callbacks | GameThread (ILiveCodingModule requirement) |
| `FUMACompileLogParser` | Hooks `FOutputDevice` to capture compile log, parses error/warning lines | GameThread |
| `FUMAFileOperations` | Read/write files in project directory with safety bounds | Any thread |
| `FUMAApprovalGate` | Spawns Slate dialog for destructive operation approval | GameThread |

**Critical threading constraint:** Almost every UE editor API (`UEdGraph`, `FKismetEditorUtilities`, `ILiveCodingModule`, `GEditor`) is GameThread-only. The WebSocket server runs on a background thread. Therefore, every incoming WS message must be dispatched to the GameThread via `AsyncTask(ENamedThreads::GameThread, [=]() { ... })` or `FTSTicker::GetCoreTicker().AddTicker(...)`. The response must then be posted back to the WS thread. This is the single most important architectural constraint in the entire system.

```
Background Thread (WS)          GameThread                     Background Thread (WS)
=====================          ==========                     =====================
Receive WS message    --->     AsyncTask dispatch    --->     (blocked, waiting)
                               Execute UE API call
                               Serialize result
                               Post response back    --->     Send WS response
```

### 2.2. Data Flow: Complete E2E Trace

```
User types: "Add a PrintString node to BP_TestActor's EventGraph and connect it to BeginPlay"

[1] Claude Code interprets intent, decides tool sequence:
    a) Call tool "blueprint.serialize" to read current state
    b) Call tool "blueprint.createNode" to spawn PrintString
    c) Call tool "blueprint.connectPins" to link BeginPlay -> PrintString

[2] Tool call "blueprint.serialize":
    Claude Code -> (stdio/JSON-RPC) -> MCP Server
    MCP Server -> (WebSocket) -> UE Plugin
    UE Plugin (GameThread):
      - Loads UBlueprint via FAssetRegistryModule
      - Iterates UEdGraph->Nodes
      - For each UK2Node: extracts NodeGuid, NodeClass, NodePosX/Y
      - For each UEdGraphPin: extracts PinId, PinName, PinType, DefaultValue, LinkedTo[]
      - Serializes to JSON AST
      - Caches full result in CacheStore, returns cache key + summary
    UE Plugin -> (WebSocket) -> MCP Server -> (stdio) -> Claude Code

[3] Tool call "blueprint.createNode":
    Same path. UE Plugin (GameThread):
      - Resolves node class (UK2Node_CallFunction for PrintString)
      - Calls FKismetEditorUtilities to spawn node
      - Calls AllocateDefaultPins()
      - Returns new node ID and pin IDs

[4] Tool call "blueprint.connectPins":
    UE Plugin (GameThread):
      - Looks up source pin (BeginPlay's exec output) by ID
      - Looks up target pin (PrintString's exec input) by ID
      - Calls Schema->TryCreateConnection(SourcePin, TargetPin)
      - Validates connection succeeded
      - Marks Blueprint as modified
      - Returns success + updated graph snapshot

[5] Claude Code receives confirmation, reports to user.
```

### 2.3. Blueprint AST JSON Schema (Proposed)

This is a critical design artifact. No standard format exists, so this must be designed from scratch.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "blueprintPath": { "type": "string" },
    "blueprintClass": { "type": "string" },
    "parentClass": { "type": "string" },
    "graphs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "graphName": { "type": "string" },
          "graphType": { "enum": ["EventGraph", "FunctionGraph", "MacroGraph", "AnimGraph"] },
          "nodes": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "nodeId": { "type": "string", "format": "uuid" },
                "nodeClass": { "type": "string" },
                "nodeTitle": { "type": "string" },
                "posX": { "type": "integer" },
                "posY": { "type": "integer" },
                "comment": { "type": "string" },
                "pins": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "pinId": { "type": "string", "format": "uuid" },
                      "pinName": { "type": "string" },
                      "direction": { "enum": ["Input", "Output"] },
                      "category": { "type": "string" },
                      "subCategory": { "type": "string" },
                      "isExec": { "type": "boolean" },
                      "defaultValue": { "type": "string" },
                      "linkedTo": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "nodeId": { "type": "string" },
                            "pinId": { "type": "string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Design rationale:**
- Node positions (`posX`, `posY`) are included because LLM-spawned nodes need reasonable layout placement.
- `isExec` flag distinguishes execution flow pins from data pins -- critical for LLM to understand control flow.
- `linkedTo` uses `{nodeId, pinId}` pairs rather than flat pin IDs, allowing the LLM to understand graph topology without additional lookups.
- Category/subcategory correspond to `UEdGraphPin::PinType.PinCategory` and `PinSubCategoryObject`, which encode the actual UE type system (bool, int, float, object reference, struct, etc.).

### 2.4. State Management

**MCP Server side (Node.js):**

```
CacheStore (in-memory LRU)
==========================
Key: "bp:/Game/BP_TestActor"  ->  Value: { full JSON AST, timestamp }
Key: "actors:MainLevel"       ->  Value: { actor list, timestamp }
Key: "compile:latest"         ->  Value: { compile result, timestamp }

TTL: 60 seconds default (configurable)
Max entries: 1000
Eviction: LRU when at capacity
```

Decision: Start with in-memory LRU. Redis adds deployment complexity for a single-user desktop tool. File-based caching risks stale state. If the tool scales to multi-user scenarios later, introduce Redis then.

**UE Plugin side (C++):**
- The `UUMAEditorSubsystem` holds a `TMap<FString, FUMAToolContext>` for any cross-call state needed by the plugin (e.g., tracking which Blueprints are currently "open" for editing).
- No persistent state on the UE side -- the plugin is stateless between editor sessions.

### 2.5. Error Handling Strategy

| Layer | Strategy | Implementation |
|---|---|---|
| stdio (Claude <-> MCP Server) | JSON-RPC error codes per MCP spec | `McpError` with code, message, data |
| WebSocket (MCP Server <-> UE) | Structured error envelope with typed codes | `WSResponse.error` with code taxonomy |
| UE Plugin internal | C++ exceptions are forbidden in UE. Use `bool` return + `FString& OutError` pattern | Every handler returns `{success, error, result}` |
| Blueprint operations | Validate before execute: check asset exists, pin types compatible, node class valid | Pre-validation layer in `UMABlueprintManipulator` |
| Live Coding | Guard with `WITH_LIVE_CODING`, check `IsEnabledForSession()` before calling `Compile()` | Graceful fallback message if unavailable |
| Network failures | Exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s) | `ConnectionManager` state machine |

---

## 3. TDD Integration Plan

### 3.1. MCP Server Tests (Vitest)

**Unit test layer:**

| Test File | Tests | Priority |
|---|---|---|
| `message-codec.test.ts` | Encode/decode round-trip for every message type; malformed input handling | P0 |
| `cache-store.test.ts` | LRU eviction, TTL expiry, concurrent access, cache hit/miss | P0 |
| `safety.test.ts` | Destructive op detection, approval flow mock, timeout behavior | P0 |
| `tool-schemas.test.ts` | Zod schema validation for every tool's input/output | P0 |
| `blueprint.test.ts` | Tool handler logic with mocked WS bridge | P1 |
| `slate.test.ts` | Template retrieval, RAG query formation | P1 |
| `compilation.test.ts` | Compile trigger, status polling, error parsing | P1 |
| `semantic-search.test.ts` | Embedding similarity, top-k retrieval accuracy | P2 |

**Integration test layer:**

| Test File | Tests | Priority |
|---|---|---|
| `mcp-tool-roundtrip.test.ts` | Full MCP tool call through mock WS server, verifying response shape | P0 |
| `reconnection.test.ts` | WS drop mid-request, reconnection + retry behavior | P1 |
| `safety-gate.test.ts` | Full approval flow: request -> block -> approve/reject -> proceed/abort | P1 |

**Test-first workflow for MCP server:**

```
1. Write Zod schema for new tool input/output (tool-schemas.ts)
2. Write test asserting schema validates correct input, rejects bad input
3. Write test asserting tool handler returns expected output shape given mocked UE response
4. Implement tool handler to pass tests
5. Write integration test with mock WS server
6. Wire tool into registry
```

### 3.2. UE Plugin Tests (Automation Framework)

UE's automation test framework uses `IMPLEMENT_SIMPLE_AUTOMATION_TEST` and `IMPLEMENT_COMPLEX_AUTOMATION_TEST` macros.

| Test File | Tests | Priority |
|---|---|---|
| `UMABlueprintSerializerTest.cpp` | Load test BP asset, serialize to JSON, verify JSON schema conformance, verify node/pin counts match | P0 |
| `UMABlueprintManipulatorTest.cpp` | Create blank BP, spawn node, verify node exists in graph; link two pins, verify `LinkedTo` array updated; invalid pin type connection rejected | P0 |
| `UMAWebSocketServerTest.cpp` | Server starts on configured port; accepts connection; echoes test message; handles malformed JSON gracefully | P0 |
| `UMAMessageHandlerTest.cpp` | Route known method to correct handler; unknown method returns error; timeout on slow handler | P1 |
| `UMALiveCodingControllerTest.cpp` | Module availability check; compile trigger with mock module; callback registration | P1 |
| `UMACompileLogParserTest.cpp` | Parse sample error log strings into structured error objects; handle multi-line errors; handle warnings vs errors | P0 |

**Test-first workflow for UE plugin:**

```
1. Create test fixture Blueprint assets (BP_TestActor in Content/Tests/)
2. Write automation test that loads fixture, calls serializer, asserts JSON output
3. Implement serializer to pass test
4. Write manipulation test: spawn node into fixture BP, assert node count increased
5. Implement manipulator
6. Run full automation suite: Session Frontend -> Automation tab
```

**Critical note on UE test execution:** UE automation tests run inside the editor process. They require a running editor with the plugin loaded. CI/CD must use `UnrealEditor-Cmd` with `-ExecCmds="Automation RunTests UMABlueprintSerializer"` for headless test execution.

### 3.3. E2E Tests

E2E tests verify the complete pipeline: Claude Code tool call -> MCP Server -> WebSocket -> UE Plugin -> response. These cannot be run in standard CI due to the UE editor dependency.

**E2E test strategy:**

| Test | Setup | Verification |
|---|---|---|
| "Query current level" | UE editor open with test level | Tool returns level name, actor count |
| "Serialize test Blueprint" | Test BP asset loaded | JSON matches expected schema and node count |
| "Create and connect nodes" | Empty test Blueprint | After tool calls, BP has expected nodes and connections |
| "Trigger Live Coding" | Compilable project state | Live Coding triggers, callback received |
| "Self-healing loop" | Intentional compile error introduced | Agent detects error, produces fix, recompiles successfully |

**E2E test execution:** Manual or semi-automated via shell script that:
1. Launches UE editor with test project
2. Waits for WS server readiness
3. Runs MCP server in test mode
4. Executes scripted tool calls
5. Asserts results

---

## 4. Detailed Phase Breakdown

### Phase 1: Communication Infrastructure (Estimated: 3-4 weeks)

#### Sub-task 1.1: MCP Server Skeleton
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/unit/transport/message-codec.test.ts` -- test encode/decode |
| **Files** | `src/index.ts`, `src/server.ts`, `src/transport/message-codec.ts`, `src/types/messages.ts`, `src/types/ws-protocol.ts`, `src/observability/logger.ts` |
| **Acceptance** | MCP server starts via `node dist/index.js`, registers in `.claude/mcp.json`, Claude Code can discover server and list tools |
| **Dependencies** | None -- this is the root task |
| **Key Decisions** | Use `@modelcontextprotocol/sdk` v1.x (stable) with `server.tool()` API. Migrate to v2 `registerTool()` when stable. |

#### Sub-task 1.2: WebSocket Bridge Client (MCP Server Side)
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/unit/transport/websocket-bridge.test.ts` -- mock WS server, test connect/send/receive/timeout |
| **Files** | `src/transport/websocket-bridge.ts`, `src/transport/connection-manager.ts` |
| **Acceptance** | Bridge connects to UE WS server, sends JSON message, receives correlated response within timeout, reconnects on drop |
| **Dependencies** | 1.1 |
| **Key Decisions** | Use `ws` npm package (most mature Node.js WebSocket library). NOT `socket.io` -- UE side cannot run socket.io. |

#### Sub-task 1.3: UE WebSocket Server Plugin
| | |
|---|---|
| **Complexity** | L |
| **Test First** | `UMAWebSocketServerTest.cpp` -- test server starts, accepts connection, echoes message |
| **Files** | `UnrealMasterAgent.uplugin`, `UnrealMasterAgent.Build.cs`, `UnrealMasterAgent.h/.cpp`, `UMAWebSocketServer.h/.cpp`, `UMAMessageHandler.h/.cpp`, `UMAMessageTypes.h` |
| **Acceptance** | Plugin loads in UE 5.x editor, WS server starts on configurable port, accepts connection from Node.js client, routes incoming `"editor.ping"` to handler, responds with `{ result: "pong" }` |
| **Dependencies** | None on MCP side; can develop in parallel |
| **Key Decisions** | See Section 6 for WebSocket library analysis |

**WebSocket server implementation approach:** Do NOT use `FWebSocketsModule` -- that is client-only. Options:

1. **Use `FWebSocketServer` from `WebSocketNetworking` module** (engine source required). This is the internal server implementation used by Pixel Streaming. It is undocumented but stable across UE 5.x releases.
2. **Embed libwebsockets** (third-party) as a plugin dependency. More control, but adds build complexity.
3. **Use the community `UE5-ServerWebSocket` plugin** as reference/starting point.

**Recommendation:** Option 1 (`WebSocketNetworking` module) for stability, falling back to Option 3's approach if the module proves too tightly coupled to Pixel Streaming.

#### Sub-task 1.4: First MCP Tool -- `editor.ping`
| | |
|---|---|
| **Complexity** | S |
| **Test First** | `tests/integration/mcp-tool-roundtrip.test.ts` with mock WS |
| **Files** | `src/tools/editor/get-level-info.ts`, `src/tools/tool-schemas.ts` |
| **Acceptance** | Claude Code can call `editor.ping` and receive `"pong"` response |
| **Dependencies** | 1.1, 1.2, 1.3 all complete |

#### Sub-task 1.5: E2E Verification
| | |
|---|---|
| **Complexity** | S |
| **Test First** | Manual E2E test script |
| **Files** | `scripts/dev-start.sh`, `.claude/mcp.json` |
| **Acceptance** | Full pipeline works: user asks Claude Code "ping unreal", gets response back |
| **Dependencies** | 1.4 |

#### Sub-task 1.6: Basic Editor Query Tools
| | |
|---|---|
| **Complexity** | M |
| **Test First** | Unit tests for each tool handler + UE automation tests for each query |
| **Files** | `src/tools/editor/get-level-info.ts`, `list-actors.ts`, `get-asset-info.ts`, `UMAEditorQueries.h/.cpp`, `UMAEditorSubsystem.h/.cpp` |
| **Acceptance** | Claude can ask "what level is open?", "list actors in the scene", "describe asset /Game/X" |
| **Dependencies** | 1.5 |

---

### Phase 2: Blueprint Serialization & Manipulation (Estimated: 4-6 weeks)

#### Sub-task 2.1: Blueprint JSON AST Schema Design
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/unit/tools/blueprint.test.ts` -- validate sample JSON against schema |
| **Files** | `docs/schemas/blueprint-ast.schema.json`, `src/types/blueprint-schema.ts`, `tests/fixtures/sample-blueprint.json` |
| **Acceptance** | JSON schema is finalized, Zod types compile, sample fixture validates |
| **Dependencies** | None (can start during Phase 1) |

#### Sub-task 2.2: Blueprint Serializer (C++)
| | |
|---|---|
| **Complexity** | XL |
| **Test First** | `UMABlueprintSerializerTest.cpp` -- load fixture BP, serialize, validate JSON field count |
| **Files** | `UMABlueprintSerializer.h/.cpp`, `UMABlueprintTypes.h` |
| **Acceptance** | Given `BP_TestActor` with 5 nodes, serializer outputs JSON with exactly 5 nodes, correct pin linkage, correct types |
| **Dependencies** | 2.1 (schema must be finalized first) |
| **Technical Detail** | Must iterate `UBlueprint->UbergraphPages` (array of `UEdGraph*`), then `Graph->Nodes` (array of `UEdGraphNode*`), then `Node->Pins` (array of `UEdGraphPin*`). Pin types are encoded in `FEdGraphPinType` struct with `PinCategory` (FName), `PinSubCategory`, `PinSubCategoryObject` (weak object pointer to UClass/UScriptStruct). |

#### Sub-task 2.3: Blueprint Node Spawning (C++)
| | |
|---|---|
| **Complexity** | L |
| **Test First** | `UMABlueprintManipulatorTest.cpp` -- spawn CallFunction node, assert node exists |
| **Files** | `UMABlueprintManipulator.h/.cpp` |
| **Acceptance** | Given a Blueprint and a node class name, spawns node at specified position, allocates pins |
| **Dependencies** | 2.2 |
| **Technical Detail** | Use `FKismetEditorUtilities::PasteNodesHere()` or direct `NewObject<UK2Node_CallFunction>()` + `SetFromFunction()` + `AllocateDefaultPins()`. The spawned node must be added to the graph via `Graph->AddNode()`. Must call `FBlueprintEditorUtils::MarkBlueprintAsModified()` after. |

#### Sub-task 2.4: Pin Connection Logic (C++)
| | |
|---|---|
| **Complexity** | L |
| **Test First** | `UMABlueprintManipulatorTest.cpp` -- link two pins, verify `LinkedTo` |
| **Files** | Same as 2.3 |
| **Acceptance** | Given two pin IDs, links them. Uses `TryCreateConnection` for type-safe linking (handles polymorphic pins correctly). Rejects incompatible types with descriptive error. |
| **Dependencies** | 2.3 |
| **Critical Note** | Must use `UEdGraphSchema_K2::TryCreateConnection()` rather than raw `MakeLinkTo()` because `TryCreateConnection` handles polymorphic pin type propagation (e.g., ForEachLoop wildcard pins). `MakeLinkTo` skips validation and type propagation entirely. |

#### Sub-task 2.5: MCP Tools for Blueprint Operations
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/unit/tools/blueprint.test.ts` -- full tool handler tests |
| **Files** | All files under `src/tools/blueprint/` |
| **Acceptance** | Claude can serialize a Blueprint, create nodes, connect pins, modify properties via natural language |
| **Dependencies** | 2.2, 2.3, 2.4, 1.5 |

#### Sub-task 2.6: Stateful Caching for Blueprint Data
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/unit/state/cache-store.test.ts` |
| **Files** | `src/state/cache-store.ts`, `src/state/session.ts` |
| **Acceptance** | Large Blueprint JSON is cached server-side; only cache key + summary (node names, graph structure outline) returned to Claude. Subsequent operations use cache key to reference full data. |
| **Dependencies** | 2.5 |

---

### Phase 3: Slate UI + Live Coding (Estimated: 4-5 weeks)

#### Sub-task 3.1: Slate Template RAG System
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/unit/rag/semantic-search.test.ts` |
| **Files** | All `docs/slate-templates/*.md`, `src/rag/embedding-store.ts`, `src/rag/semantic-search.ts`, `src/rag/slate-templates.ts` |
| **Acceptance** | Given query "create a list view widget", RAG returns `list-view.md` template with >0.8 relevance score |
| **Dependencies** | None (can start during Phase 2) |
| **Implementation Note** | For local RAG, consider using `@xenova/transformers` for embedding generation (runs locally, no API calls needed) with a small model like `all-MiniLM-L6-v2`. Store embeddings in a flat JSON file -- the corpus is small (< 100 documents). |

#### Sub-task 3.2: Slate Widget Generation Tool
| | |
|---|---|
| **Complexity** | L |
| **Test First** | `tests/unit/tools/slate.test.ts` |
| **Files** | `src/tools/slate/generate-widget.ts`, `src/tools/slate/validate-slate.ts` |
| **Acceptance** | Claude can generate syntactically valid Slate C++ code that follows Epic's coding conventions. Generated code uses correct `SNew`/`SLATE_BEGIN_ARGS` patterns. Pre-validation catches common LLM errors (missing `SLATE_END_ARGS`, wrong `TAttribute` usage). |
| **Dependencies** | 3.1 |

#### Sub-task 3.3: File Write Operations
| | |
|---|---|
| **Complexity** | M |
| **Test First** | Unit tests for file ops + safety gate tests |
| **Files** | `src/tools/file/write-file.ts`, `UMAFileOperations.h/.cpp`, `src/state/safety.ts` |
| **Acceptance** | Claude can write generated Slate C++ files to the project directory. Destructive writes (overwriting existing files) trigger human approval. Path traversal attacks are blocked. |
| **Dependencies** | 1.5 (E2E infrastructure) |

#### Sub-task 3.4: Live Coding Controller (C++)
| | |
|---|---|
| **Complexity** | L |
| **Test First** | `UMALiveCodingControllerTest.cpp` |
| **Files** | `UMALiveCodingController.h/.cpp` |
| **Acceptance** | Programmatically triggers Live Coding compile. Detects compile success/failure via callback. Returns structured result (success, duration, patch count). |
| **Dependencies** | 1.3 (plugin infrastructure) |
| **Technical Detail** | Use `ILiveCodingModule* LC = FModuleManager::GetModulePtr<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);`. Must guard with `#if WITH_LIVE_CODING`. Bind to `GetOnPatchCompleteDelegate()` for completion callback. Note: Live Coding is Windows-only in most UE versions. |

#### Sub-task 3.5: Compile Log Parser (C++)
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `UMACompileLogParserTest.cpp` -- parse sample error strings |
| **Files** | `UMACompileLogParser.h/.cpp` |
| **Acceptance** | Captures compile output, parses into structured errors: `{ file, line, column, severity, message, code }`. Handles multi-line errors, template instantiation backtraces, and linker errors. |
| **Dependencies** | 3.4 |
| **Technical Detail** | Hook into `GLog` via custom `FOutputDevice` subclass that captures lines matching the MSVC/Clang error format: `file(line): error C#### : message`. |

#### Sub-task 3.6: Compilation MCP Tools
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/unit/tools/compilation.test.ts` |
| **Files** | `src/tools/compilation/trigger-compile.ts`, `get-compile-status.ts`, `get-errors.ts` |
| **Acceptance** | Claude can trigger compile, poll status, retrieve parsed errors |
| **Dependencies** | 3.4, 3.5 |

---

### Phase 4: Agent Autonomy & Optimization (Estimated: 3-4 weeks)

#### Sub-task 4.1: Self-Healing Compile Loop
| | |
|---|---|
| **Complexity** | XL |
| **Test First** | Integration test with intentional compile error fixture |
| **Files** | Orchestration logic lives primarily in Claude Code's tool usage pattern. MCP server adds `compilation.selfHeal` meta-tool. |
| **Acceptance** | Given a compile error, Claude autonomously: (1) reads error, (2) reads relevant source, (3) generates fix, (4) writes fix, (5) recompiles, (6) verifies success. Max 3 retry loops before requesting human help. |
| **Dependencies** | 3.3, 3.6 |
| **Key Design** | The self-healing loop is NOT implemented as a server-side state machine. It relies on Claude Code's reasoning to chain tool calls. The MCP server provides atomic tools; Claude provides the orchestration logic. This is critical -- embedding loop logic in the server creates a brittle state machine. |

#### Sub-task 4.2: Micro-Tool Architecture
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/unit/rag/semantic-search.test.ts` -- test tool retrieval accuracy |
| **Files** | `src/rag/embedding-store.ts`, `src/tools/registry.ts` (dynamic registration) |
| **Acceptance** | Tool count exceeds 30. Instead of registering all tools at boot, only register a core set (10-15). Use RAG to dynamically discover and register additional tools based on conversation context. |
| **Dependencies** | 3.1 (RAG infrastructure) |
| **Design Note** | MCP supports `tools/list` which Claude Code calls at session start. For dynamic tools, the server can implement `notifications/tools/list_changed` to signal Claude Code to re-fetch the tool list when context changes. |

#### Sub-task 4.3: Observability Integration
| | |
|---|---|
| **Complexity** | M |
| **Test First** | Unit test for trace emission format |
| **Files** | `src/observability/tracer.ts`, `src/observability/metrics.ts` |
| **Acceptance** | Every tool call emits a trace span to LangSmith/Langfuse with: tool name, duration, success/failure, input summary, error details. Dashboard shows tool usage patterns. |
| **Dependencies** | 1.1 |

#### Sub-task 4.4: In-Editor Chat Panel
| | |
|---|---|
| **Complexity** | L |
| **Test First** | `UMAEditorSubsystem` test for panel registration |
| **Files** | New Slate widget classes in UE plugin, WebBrowser integration |
| **Acceptance** | A dockable tab in the UE editor shows a chat interface. Messages from the panel are routed to Claude Code. Responses appear in the panel. |
| **Dependencies** | 4.1, 4.2, 4.3 (all core features stable first) |
| **Note** | This is a UX improvement, not a functional requirement. It is the lowest priority in Phase 4. The primary UX (Claude Code CLI) works from Phase 1. |

#### Sub-task 4.5: Human-in-the-Loop Safety System
| | |
|---|---|
| **Complexity** | M |
| **Test First** | `tests/integration/safety-gate.test.ts`, `UMAApprovalGate` automation test |
| **Files** | `src/state/safety.ts`, `UMAApprovalGate.h/.cpp` |
| **Acceptance** | Operations classified as destructive (deleting assets, overwriting source files, modifying production Blueprints) pause and prompt for developer approval via in-editor dialog. Timeout after 60 seconds = reject. |
| **Dependencies** | 1.5 |

---

## 5. Risk Analysis

### Phase 1 Risks

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| **UE WebSocket server library instability** | High | Medium | Prototype with `WebSocketNetworking` module first. If coupling to Pixel Streaming is too tight, fall back to embedding libwebsockets as third-party. Budget 1 extra week for this exploration. |
| **stdio stream corruption** | High | High (in early dev) | Enforce `stderr`-only logging from day 1. Write a custom `console` override in `logger.ts` that throws on `stdout` usage. Add CI check that greps for `console.log` in source. |
| **MCP SDK version instability** | Medium | Low | Pin `@modelcontextprotocol/sdk` to exact version. Do not auto-update. The v1 API (`server.tool()`) is stable. |
| **Thread safety in UE plugin** | High | Medium | All WS message handlers MUST dispatch to GameThread. Write a `FUMAGameThreadDispatcher` utility that wraps every handler. Code review checklist item. |

### Phase 2 Risks

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| **Blueprint serialization correctness** | Critical | High | Start with a simple subset: EventGraph only, common node types (CallFunction, IfThenElse, ForEachLoop). Incrementally add AnimGraph, MacroGraph. Write exhaustive test fixtures. |
| **UEdGraphPin API breaks across UE versions** | High | Medium | Target a single UE version (e.g., 5.4 or 5.5) initially. Abstract pin operations behind an interface layer so version-specific code is isolated. |
| **`TryCreateConnection` vs `MakeLinkTo` confusion** | Medium | High | Document the rule: ALWAYS use `TryCreateConnection` for external API calls. `MakeLinkTo` is only for internal engine use where type propagation is handled manually. |
| **JSON payload size for large Blueprints** | High | Medium | The stateful caching design (Sub-task 2.6) directly mitigates this. Also implement a "summary mode" that returns only node names and connection topology, omitting pin details. |

### Phase 3 Risks

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| **LLM generates invalid Slate C++ code** | High | Very High | RAG template injection is necessary but not sufficient. Add a pre-validation pass in the MCP server that checks for common patterns: balanced `SNew`/bracket pairs, `SLATE_BEGIN_ARGS`/`SLATE_END_ARGS` matching, `TAttribute` usage. This catches ~60% of errors before compilation. |
| **Live Coding API is Windows-only** | High | Certain | Clearly document this limitation. On macOS/Linux, fall back to a full `UnrealBuildTool` compile command. Detect platform at plugin startup. |
| **Live Coding `Compile()` blocks GameThread** | High | Medium | The `ILiveCodingModule::Compile()` call itself should be non-blocking (it kicks off the compilation process), but verify this empirically. If it blocks, wrap in `Async(EAsyncExecution::ThreadPool, ...)` and poll completion. |
| **Compile log format changes between UE versions** | Medium | Medium | Make the regex patterns in `UMACompileLogParser` configurable. Test against sample logs from UE 5.3, 5.4, 5.5. |

### Phase 4 Risks

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| **Self-healing loop enters infinite retry** | Critical | Medium | Hard cap at 3 retries. After 3 failed compile attempts, stop and report to user with full error context. Track retry count per-session. |
| **Context window exhaustion** | High | High | Micro-tool architecture (4.2) is the primary mitigation. Also: Blueprint serialization returns summaries, not full ASTs. Compile errors are truncated to relevant lines. Stateful caching prevents re-sending unchanged data. |
| **RAG tool retrieval returns irrelevant tools** | Medium | Medium | Start with a small, curated tool set. Only introduce RAG when tool count exceeds 20-25. Use explicit keyword matching as a first pass before semantic search. |

---

## 6. Key Technical Decisions

### Decision 1: WebSocket Library for UE Plugin (Server-Side)

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **`WebSocketNetworking` module** (engine internal) | Already in engine, no third-party deps, battle-tested by Pixel Streaming | Undocumented, tightly coupled to networking subsystem, may require engine source access | **Preferred** if engine source is available |
| **Community `UE5-ServerWebSocket`** | Open source, designed for exactly this use case, simple API | Copy of engine code (frozen snapshot), may diverge from engine updates, unmaintained risk | **Fallback** if engine source unavailable |
| **Embedded `libwebsockets`** | Maximum control, cross-platform, well-documented | Build system complexity (CMake inside UBT), binary compatibility concerns | **Avoid** unless other options fail |
| **Reverse the connection** (UE as WS client, Node.js as WS server) | Simplifies UE side (use built-in `FWebSocketsModule` client), Node.js WS server is trivial | Reverses the connection direction from PRD design, but functionally equivalent | **Strongly consider** -- this may be the pragmatic choice |

**Strong recommendation: Reverse the connection direction.** Make Node.js the WebSocket server (trivial with `ws` package) and UE the WebSocket client (trivial with built-in `FWebSocketsModule`). This eliminates the hardest technical unknown (WS server inside UE) entirely. The data flow remains identical -- only the TCP connection initiator changes. The MCP bridge server listens for both stdio (from Claude) and WebSocket (from UE). The UE plugin connects as a client at editor startup.

### Decision 2: Blueprint Serialization Format

**Recommendation:** Use the custom JSON schema proposed in Section 2.3. Key design principles:

1. **Logical, not physical:** Serialize execution flow semantics, not raw UEdGraph memory layout. The LLM does not need `FEdGraphPinType` struct details -- it needs "this is an integer input pin named 'Count'".
2. **Bidirectional:** The same JSON format must be parseable back into Blueprint modifications. Every node and pin gets a stable UUID (from `FGuid::NewGuid()` for new nodes, from `NodeGuid`/`PinId` for existing ones).
3. **Incremental:** Support partial serialization (single node, single graph) not just full Blueprint dumps.
4. **Token-efficient:** Strip redundant data. Pin types use short strings ("int", "float", "bool", "exec", "object:ClassName") not UE's full `FEdGraphPinType` struct.

### Decision 3: MCP Tool Registration -- Static vs Dynamic

**Recommendation:** Hybrid approach.

- **Phase 1-3:** All tools registered statically at server boot. Tool count is manageable (<20).
- **Phase 4:** When tool count exceeds 20-25, introduce dynamic registration via `notifications/tools/list_changed`. The RAG system suggests relevant tools based on conversation context. The server calls `server.setRequestHandler(ListToolsRequestSchema, ...)` to return a context-filtered tool list.

The MCP specification supports `notifications/tools/list_changed` which signals the client (Claude Code) to re-fetch tools. This enables dynamic tool sets without protocol violations.

### Decision 4: Live Coding API Stability

**Assessment:** `ILiveCodingModule` is a Developer module (not Runtime), meaning it is editor-only and subject to change. However, the core interface (`IsEnabledForSession()`, `Compile()`, `GetOnPatchCompleteDelegate()`) has remained stable from UE 4.22 through UE 5.5+. The module is a thin wrapper around Live++ by Molecular Matters.

**Recommendation:**
- Abstract behind `FUMALiveCodingController` interface.
- Guard all usage with `#if WITH_LIVE_CODING`.
- Provide fallback to `FDesktopPlatformModule::Get()->CompileWithBuildTool()` for platforms/configurations where Live Coding is unavailable.
- Test against your specific target UE version (pin it in documentation).

### Decision 5: State Caching Mechanism

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **In-memory LRU** | Simplest, fastest, zero deps | Lost on server restart, memory bounded | **Use for Phase 1-3** |
| **File-based (JSON on disk)** | Survives restart, inspectable | I/O latency, stale data risk, cleanup complexity | **Avoid** |
| **Redis** | Scalable, TTL support, shared state | Deployment complexity for desktop tool, overkill for single-user | **Defer to Phase 4+ if multi-user needed** |
| **SQLite** | Persistent, queryable, lightweight | Schema management, more complex than LRU | **Consider for Phase 4** if persistence needed |

**Recommendation:** In-memory LRU with configurable max-entries and TTL. The MCP server is restarted per-session anyway (Claude Code spawns it), so persistence across sessions is not a requirement. If it becomes one, SQLite is the natural next step.

### Decision 6: Additional Open Question -- UE Python vs C++ for Metadata Operations

The PRD mentions Python as a "Scripting Helper" for asset parsing and directory operations. This creates an architectural decision point:

**Recommendation:** Minimize Python usage. The UE Python API (`unreal` module) only exposes UFUNCTION-marked functions, which is exactly the limitation the PRD calls out for Blueprint manipulation. Using Python for metadata operations adds a second runtime (Python interpreter inside UE) and a second communication channel. Instead:

- Use C++ for all engine-internal operations.
- If Python is needed for non-engine tasks (file manipulation, JSON processing), run it as a separate tool in the MCP server (Node.js) side, not inside UE.
- Reserve UE Python only for operations where an existing Python-exposed API is significantly simpler (e.g., `unreal.EditorAssetLibrary` for bulk asset operations).

---

## Appendix A: Dependency Graph (Task Ordering)

```
Phase 1:
  1.1 MCP Skeleton ─────────────────────────────┐
  1.2 WS Bridge ─── depends on 1.1 ─────────────┤
  1.3 UE WS Plugin ─── independent ─────────────┤
  1.4 First Tool ─── depends on 1.1, 1.2, 1.3 ──┤
  1.5 E2E Verify ─── depends on 1.4 ────────────┤
  1.6 Editor Tools ─── depends on 1.5 ──────────┘

Phase 2:
  2.1 Schema Design ─── can start during Phase 1 ─────┐
  2.2 BP Serializer ─── depends on 2.1, 1.3 ──────────┤
  2.3 Node Spawning ─── depends on 2.2 ────────────────┤
  2.4 Pin Connection ─── depends on 2.3 ───────────────┤
  2.5 BP MCP Tools ─── depends on 2.4, 1.5 ───────────┤
  2.6 Stateful Cache ─── depends on 2.5 ──────────────┘

Phase 3:
  3.1 RAG System ─── can start during Phase 2 ─────────┐
  3.2 Slate Tool ─── depends on 3.1 ───────────────────┤
  3.3 File Write ─── depends on 1.5 ───────────────────┤
  3.4 Live Coding ─── depends on 1.3 ──────────────────┤
  3.5 Log Parser ─── depends on 3.4 ───────────────────┤
  3.6 Compile Tools ─── depends on 3.4, 3.5, 1.5 ─────┘

Phase 4:
  4.1 Self-Healing ─── depends on 3.3, 3.6 ────────────┐
  4.2 Micro-Tools ─── depends on 3.1 ──────────────────┤
  4.3 Observability ─── depends on 1.1 ────────────────┤
  4.5 Safety System ─── depends on 1.5 ────────────────┤
  4.4 Chat Panel ─── depends on 4.1, 4.2, 4.3, 4.5 ──┘
```

## Appendix B: Parallelization Opportunities

Tasks that can proceed in parallel to compress the timeline:

| Parallel Track A | Parallel Track B | Notes |
|---|---|---|
| 1.1 + 1.2 (MCP Server) | 1.3 (UE Plugin) | Different languages, different developers |
| 2.1 (Schema Design) | 1.6 (Editor Tools) | Schema is a document, not code |
| 3.1 (RAG System) | 2.2-2.4 (BP Engine) | RAG is MCP-server-side, BP is UE-side |
| 3.3 (File Write) | 3.4 (Live Coding) | Independent UE subsystems |
| 4.3 (Observability) | 4.2 (Micro-Tools) | Both are MCP-server enhancements |

With two developers (one TS-focused, one C++-focused), the critical path compresses from ~14-19 weeks sequential to approximately 10-12 weeks.

---

Sources:
- [MCP TypeScript SDK - GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [@modelcontextprotocol/sdk - npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [MCP SDK Documentation](https://modelcontextprotocol.io/docs/sdk)
- [MCP TypeScript SDK Server Docs](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md)
- [UE5-ServerWebSocket Plugin](https://github.com/h2ogit/UE5-ServerWebSocket)
- [WebSocket Client C++ - UE Community Wiki](https://unrealcommunity.wiki/websocket-client-cpp-5vk7hp9e)
- [WebSockets API - UE 5.7 Documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/WebSockets)
- [WebSocket Server - Fab Marketplace](https://www.fab.com/listings/c52d0c7a-1104-4263-bf71-668a56ebfa43)
- [Using Live Coding in UE - Official Docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-live-coding-to-recompile-unreal-engine-applications-at-runtime)
- [Live Coding Primer - Epic Knowledge Base](https://dev.epicgames.com/community/learning/knowledge-base/GDdl/unreal-engine-live-coding-primer)
- [UE4 Blueprint Internal Structure - GitHub Gist](https://gist.github.com/rbetik12/21201e3c40201e8f8aed16c4bcf0e75e)
- [UEdGraphPin::MakeLinkTo Examples](https://cpp.hotexamples.com/examples/-/UEdGraphPin/MakeLinkTo/cpp-uedgraphpin-makelinkto-method-examples.html)
- [Custom K2 Node for Blueprint - UE Community Wiki](https://unrealcommunity.wiki/create-custom-k2-node-for-blueprint-zwuncdkq)
- [Node Graph System - DeepWiki (UE5 MCP)](https://deepwiki.com/gimmeDG/UnrealEngine5-mcp/3.2.2-node-graph-system)
- [ChiR24/Unreal_mcp - Comprehensive MCP Server](https://github.com/ChiR24/Unreal_mcp)
- [GenOrca/unreal-mcp - Blueprint Node Inspection](https://github.com/GenOrca/unreal-mcp)
- [mirno-ehf/ue5-mcp - Blueprint Editing via Claude](https://github.com/mirno-ehf/ue5-mcp)
- [Slate UI Widget Examples - UE 5.7 Docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/slate-ui-widget-examples-for-unreal-engine)
- [Anatomy of a Widget C++ - Medium](https://codekittah.medium.com/anatomy-of-a-widget-c-unreal-engine-b479a100c7e3)
- [UE4 Slate Widget Grammar](https://easycomplex-tech.com/blog/Unreal/AssetEditor/UEAssetEditorDev-SWidgetGrammar/)
- [Slate Data Binding - TAttribute](https://nerivec.github.io/old-ue4-wiki/pages/templateslate-data-binding-part-3.html)