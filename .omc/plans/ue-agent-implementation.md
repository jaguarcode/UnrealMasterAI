# Unreal Engine Autonomous AI Agent -- Implementation Plan

**Generated:** 2026-02-25
**Status:** READY FOR EXECUTION
**Methodology:** TDD (Test-Driven Development) throughout
**Estimated Duration:** 10-12 weeks (two-track parallel development)

---

## 1. Executive Summary

This project builds a 4-layer autonomous AI agent that enables Claude Code to bidirectionally communicate with Unreal Engine internals. The agent manipulates Blueprints, generates Slate UI code, triggers Live Coding compilation, and self-heals from compile errors -- all via natural language commands.

**Scope:**
- MCP Bridge Server (Node.js/TypeScript) communicating via stdio with Claude Code
- UE Agent Plugin (C++) communicating via WebSocket with the Bridge Server
- RAG system for Slate UI template injection
- Self-healing compile loop with 3-retry cap
- Observability integration (LangSmith/Langfuse)
- In-editor chat panel for direct UE interaction

**Goals:**
1. Zero-manual-intervention Blueprint manipulation via natural language
2. Type-safe, schema-validated communication at every boundary
3. TDD at every layer -- no implementation code without a failing test first
4. Safe-by-default operations with human-in-the-loop for destructive actions

**Key Architecture Decisions (Already Made):**
- Reverse WS direction: UE as WebSocket client, Node.js as server
- In-memory LRU caching (not Redis) -- single-user desktop tool
- TryCreateConnection for pin linking (not raw MakeLinkTo)
- Self-healing via Claude reasoning (not server-side state machine)
- Minimize Python; prefer C++ for UE-internal operations

---

## 2. Architecture Overview

### 2.1. 4-Layer Architecture

```
+---------------------+
| Layer 1: MCP Host   |  Claude Code (Claude 3.5 Sonnet / Opus)
| (Not our code)      |  Interprets queries, decides tool call sequences
+----------+----------+
           | stdio (JSON-RPC)
           v
+----------+----------+
| Layer 2: MCP Bridge |  Node.js / TypeScript
| Server              |  Tool registry, WS bridge, caching, RAG, safety
+----------+----------+
           | WebSocket (ws package -- Node.js is SERVER)
           v
+----------+----------+
| Layer 3: UE Agent   |  C++ Plugin (Editor-only)
| Plugin              |  WS client, message routing, GameThread dispatch
+----------+----------+
           | Direct API calls
           v
+----------+----------+
| Layer 4: Engine     |  UEdGraph, FKismetEditorUtilities,
| APIs                |  ILiveCodingModule, Slate, FOutputDevice
+---------------------+
```

### 2.2. Data Flow

```
User: "Add PrintString to BP_TestActor after BeginPlay"

Claude Code --> [stdio/JSON-RPC] --> MCP Server
  --> blueprint.serialize({assetPath: "/Game/BP_TestActor"})
  --> [WebSocket] --> UE Plugin
    --> [GameThread] FUMABlueprintSerializer::Serialize()
    --> JSON AST result cached, key returned
  <-- [WebSocket] <-- UE Plugin
  --> blueprint.createNode({blueprint: cacheKey, nodeClass: "UK2Node_CallFunction", ...})
  --> [WebSocket] --> UE Plugin
    --> [GameThread] FUMABlueprintManipulator::SpawnNode()
  <-- new node ID + pin IDs
  --> blueprint.connectPins({sourcePin: "BeginPlay.exec.out", targetPin: "PrintString.exec.in"})
  --> [WebSocket] --> UE Plugin
    --> [GameThread] Schema->TryCreateConnection()
  <-- success
<-- Claude Code reports completion to user
```

### 2.3. Key Contracts

| Boundary | Contract | Format |
|----------|----------|--------|
| Claude <-> MCP Server | MCP Protocol via stdio | JSON-RPC 2.0 |
| MCP Server <-> UE Plugin | WebSocket messages | WSMessage/WSResponse envelopes |
| Blueprint data | Blueprint AST schema | `docs/schemas/blueprint-ast.schema.json` |
| Compile results | Structured errors | `{file, line, column, severity, message, code}` |
| Tool definitions | MCP tool schemas | Zod schemas -> JSON Schema |

### 2.4. Error Code Taxonomy

| Code Range | Category | Examples |
|------------|----------|----------|
| 1000-1099 | Connection | WS disconnect, handshake failure |
| 2000-2099 | Validation | Invalid params, unknown method |
| 3000-3099 | Blueprint | Asset not found, invalid pin type |
| 4000-4099 | Compilation | Live Coding unavailable, compile failed |
| 5000-5099 | File System | Permission denied, file not found |
| 6000-6099 | Safety | Approval required, operation blocked |

---

## 3. Directory Structure

```
unreal-master/
|
|-- .claude/
|   |-- mcp.json                         # MCP server registration (stdio transport)
|   `-- settings.json                    # Claude Code project settings
|
|-- .vscode/
|   |-- settings.json
|   |-- tasks.json                       # Build tasks for TS + UE
|   `-- launch.json                      # Debug configs
|
|-- mcp-server/                          # ===== NODE.JS/TYPESCRIPT MCP BRIDGE =====
|   |-- package.json                     # @modelcontextprotocol/sdk, zod, ws, vitest, uuid
|   |-- tsconfig.json                    # strict: true, ESM output, target ES2022
|   |-- vitest.config.ts                 # Test runner config
|   |-- src/
|   |   |-- index.ts                     # Entry: McpServer + StdioServerTransport
|   |   |-- server.ts                    # Tool registration orchestrator
|   |   |-- transport/
|   |   |   |-- websocket-bridge.ts      # WS server (Node.js listens, UE connects)
|   |   |   |-- connection-manager.ts    # Reconnection, backoff, heartbeat
|   |   |   `-- message-codec.ts         # Encode/decode with Zod validation
|   |   |-- tools/
|   |   |   |-- registry.ts             # Static + dynamic tool registration
|   |   |   |-- tool-schemas.ts          # Zod schemas for all tools
|   |   |   |-- editor/
|   |   |   |   |-- ping.ts             # editor.ping
|   |   |   |   |-- get-level-info.ts    # editor.getLevelInfo
|   |   |   |   |-- list-actors.ts       # editor.listActors
|   |   |   |   `-- get-asset-info.ts    # editor.getAssetInfo
|   |   |   |-- blueprint/
|   |   |   |   |-- serialize.ts         # blueprint.serialize
|   |   |   |   |-- create-node.ts       # blueprint.createNode
|   |   |   |   |-- connect-pins.ts      # blueprint.connectPins
|   |   |   |   |-- modify-property.ts   # blueprint.modifyProperty
|   |   |   |   `-- delete-node.ts       # blueprint.deleteNode
|   |   |   |-- slate/
|   |   |   |   |-- generate-widget.ts   # slate.generateWidget
|   |   |   |   |-- list-templates.ts    # slate.listTemplates
|   |   |   |   `-- validate-slate.ts    # slate.validateSlate
|   |   |   |-- compilation/
|   |   |   |   |-- trigger-compile.ts   # compilation.trigger
|   |   |   |   |-- get-status.ts        # compilation.getStatus
|   |   |   |   |-- get-errors.ts        # compilation.getErrors
|   |   |   |   `-- self-heal.ts         # compilation.selfHeal (meta-tool)
|   |   |   `-- file/
|   |   |       |-- read-file.ts         # file.read
|   |   |       |-- write-file.ts        # file.write
|   |   |       `-- search-files.ts      # file.search
|   |   |-- state/
|   |   |   |-- cache-store.ts           # LRU cache (configurable max + TTL)
|   |   |   |-- session.ts              # Session state management
|   |   |   `-- safety.ts               # Human-in-the-loop gate logic
|   |   |-- rag/
|   |   |   |-- embedding-store.ts       # Embeddings via @xenova/transformers
|   |   |   |-- semantic-search.ts       # Vector similarity search
|   |   |   `-- slate-templates.ts       # Template loading + indexing
|   |   |-- observability/
|   |   |   |-- tracer.ts               # OpenTelemetry trace spans
|   |   |   |-- metrics.ts              # Latency + success rate tracking
|   |   |   `-- logger.ts               # stderr-only logging (CRITICAL)
|   |   `-- types/
|   |       |-- messages.ts              # WSMessage, WSResponse interfaces
|   |       |-- ws-protocol.ts           # WebSocket envelope types
|   |       |-- blueprint-schema.ts      # Blueprint AST TS types
|   |       `-- compile-result.ts        # Compilation result types
|   `-- tests/
|       |-- unit/
|       |   |-- transport/
|       |   |   |-- message-codec.test.ts
|       |   |   `-- websocket-bridge.test.ts
|       |   |-- tools/
|       |   |   |-- editor.test.ts
|       |   |   |-- blueprint.test.ts
|       |   |   |-- slate.test.ts
|       |   |   `-- compilation.test.ts
|       |   |-- state/
|       |   |   |-- cache-store.test.ts
|       |   |   `-- safety.test.ts
|       |   |-- rag/
|       |   |   `-- semantic-search.test.ts
|       |   `-- observability/
|       |       `-- tracer.test.ts
|       |-- integration/
|       |   |-- mcp-tool-roundtrip.test.ts
|       |   |-- reconnection.test.ts
|       |   `-- safety-gate.test.ts
|       `-- fixtures/
|           |-- sample-blueprint.json
|           |-- sample-compile-error.json
|           `-- mock-ue-client.ts         # Fake UE WebSocket client for testing
|
|-- ue-plugin/                           # ===== UNREAL ENGINE C++ PLUGIN =====
|   |-- UnrealMasterAgent.uplugin        # Plugin descriptor (Editor-only)
|   |-- Source/
|   |   |-- UnrealMasterAgent/           # Main module
|   |   |   |-- UnrealMasterAgent.Build.cs
|   |   |   |-- Public/
|   |   |   |   |-- UnrealMasterAgent.h
|   |   |   |   |-- WebSocket/
|   |   |   |   |   |-- UMAWebSocketClient.h
|   |   |   |   |   |-- UMAMessageHandler.h
|   |   |   |   |   `-- UMAMessageTypes.h
|   |   |   |   |-- Blueprint/
|   |   |   |   |   |-- UMABlueprintSerializer.h
|   |   |   |   |   |-- UMABlueprintManipulator.h
|   |   |   |   |   `-- UMABlueprintTypes.h
|   |   |   |   |-- Compilation/
|   |   |   |   |   |-- UMALiveCodingController.h
|   |   |   |   |   `-- UMACompileLogParser.h
|   |   |   |   |-- FileOps/
|   |   |   |   |   `-- UMAFileOperations.h
|   |   |   |   |-- Editor/
|   |   |   |   |   |-- UMAEditorQueries.h
|   |   |   |   |   `-- UMAEditorSubsystem.h
|   |   |   |   `-- Safety/
|   |   |   |       `-- UMAApprovalGate.h
|   |   |   `-- Private/
|   |   |       |-- UnrealMasterAgent.cpp
|   |   |       |-- WebSocket/
|   |   |       |   |-- UMAWebSocketClient.cpp
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
|   |   `-- UnrealMasterAgentTests/      # Automation test module
|   |       |-- UnrealMasterAgentTests.Build.cs
|   |       |-- Public/
|   |       |   `-- UMATestHelpers.h
|   |       `-- Private/
|   |           |-- UMAWebSocketClientTest.cpp
|   |           |-- UMAMessageHandlerTest.cpp
|   |           |-- UMABlueprintSerializerTest.cpp
|   |           |-- UMABlueprintManipulatorTest.cpp
|   |           |-- UMALiveCodingControllerTest.cpp
|   |           |-- UMACompileLogParserTest.cpp
|   |           |-- UMAEditorQueriesTest.cpp
|   |           `-- UMAApprovalGateTest.cpp
|   |-- Content/
|   |   `-- Tests/
|   |       |-- BP_TestActor.uasset       # Test fixture Blueprint
|   |       `-- BP_SerializationFixture.uasset
|   `-- Resources/
|       `-- Icon128.png
|
|-- docs/                                # ===== RAG KNOWLEDGE BASE =====
|   |-- slate-templates/
|   |   |-- base-widget.md               # SCompoundWidget boilerplate
|   |   |-- list-view.md                 # SListView pattern
|   |   |-- tree-view.md                 # STreeView pattern
|   |   |-- details-panel.md             # Property editor panel
|   |   |-- toolbar.md                   # SToolBarButtonBlock pattern
|   |   |-- dialog.md                    # SWindow modal dialog
|   |   `-- tab-widget.md               # SDockTab pattern
|   |-- api-reference/
|   |   |-- uedgraph-pin-api.md          # UEdGraphPin methods
|   |   |-- kismet-utilities-api.md      # FKismetEditorUtilities
|   |   |-- live-coding-api.md           # ILiveCodingModule interface
|   |   `-- slate-macros-api.md          # SNew/SAssignNew/SLATE_BEGIN_ARGS
|   |-- coding-conventions/
|   |   |-- epic-cpp-standard.md         # Epic C++ coding standard
|   |   |-- slate-style-guide.md         # Slate-specific conventions
|   |   `-- blueprint-naming.md          # Blueprint naming conventions
|   `-- schemas/
|       |-- blueprint-ast.schema.json    # Blueprint AST JSON Schema
|       |-- ws-protocol.schema.json      # WebSocket message schema
|       `-- tool-manifest.schema.json    # MCP tool definition schema
|
|-- scripts/
|   |-- dev-start.sh                     # Start MCP server in dev mode
|   |-- test-all.sh                      # Run all test suites
|   `-- generate-schemas.ts              # Zod -> JSON Schema generation
|
|-- PRD.md
|-- AGENTS.md
|-- README.md
|-- ARCHITECTURE.md
|-- package.json                         # Workspace root (npm workspaces)
`-- .gitignore
```

---

## 4. Phase 1: Communication Infrastructure

**User Stories:** US-001 through US-008
**Estimated Duration:** 3-4 weeks
**Two parallel tracks:** Track A (Node.js/TypeScript) + Track B (C++)

### Task 1.1: Project Scaffolding & Monorepo Setup (US-001)

**Track:** Both
**Complexity:** Small
**Dependencies:** None (root task)

**TDD Sequence:**
1. No test needed -- this is pure scaffolding
2. Validation: `tsc --noEmit` compiles clean, `npm install` succeeds

**Files to Create:**

| File | Purpose |
|------|---------|
| `/package.json` | Workspace root with `"workspaces": ["mcp-server"]` |
| `/.gitignore` | Node, UE, IDE ignores |
| `/mcp-server/package.json` | Dependencies: `@modelcontextprotocol/sdk`, `zod`, `ws`, `uuid` |
| `/mcp-server/tsconfig.json` | `strict: true`, `target: "ES2022"`, `module: "ESNext"` |
| `/mcp-server/vitest.config.ts` | Vitest config with coverage |
| `/mcp-server/src/index.ts` | Empty entry point stub |
| `/mcp-server/src/server.ts` | Empty server stub |
| `/ue-plugin/UnrealMasterAgent.uplugin` | Plugin descriptor (`Type: Editor`, `LoadingPhase: Default`) |
| `/ue-plugin/Source/UnrealMasterAgent/UnrealMasterAgent.Build.cs` | Module build rules |
| `/ue-plugin/Source/UnrealMasterAgent/Public/UnrealMasterAgent.h` | Module header stub |
| `/ue-plugin/Source/UnrealMasterAgent/Private/UnrealMasterAgent.cpp` | Module implementation stub |
| `/ue-plugin/Source/UnrealMasterAgentTests/UnrealMasterAgentTests.Build.cs` | Test module build rules |
| `/ue-plugin/Source/UnrealMasterAgentTests/Public/UMATestHelpers.h` | Test helper utilities |
| `/docs/schemas/` | Empty directory for schemas |
| `/scripts/dev-start.sh` | Stub: `npm run build && node dist/index.js` |
| `/scripts/test-all.sh` | Stub: `cd mcp-server && npx vitest run` |
| `/.claude/mcp.json` | Template MCP server registration |
| `/README.md` | Project overview |

**Acceptance Criteria:**
- [ ] `cd mcp-server && npm install` succeeds
- [ ] `cd mcp-server && npx tsc --noEmit` exits 0
- [ ] UE plugin `.uplugin` file is valid JSON
- [ ] Build.cs files reference required UE modules: `WebSockets`, `Json`, `JsonUtilities`
- [ ] `.gitignore` excludes `node_modules/`, `dist/`, `*.uasset` (binary), IDE files
- [ ] Root `package.json` has npm workspace config

**Commit:** `feat: scaffold monorepo with MCP server and UE plugin structure`

---

### Task 1.2: Architecture Decision Records (US-002)

**Track:** Documentation (either track)
**Complexity:** Medium
**Dependencies:** None (can parallelize with 1.1)

**Files to Create:**

| File | Purpose |
|------|---------|
| `/ARCHITECTURE.md` | Full architecture doc with text diagrams |
| `/docs/schemas/ws-protocol.schema.json` | WebSocket message envelope schema |
| `/docs/schemas/blueprint-ast.schema.json` | Blueprint AST JSON Schema (draft) |
| `/docs/schemas/tool-manifest.schema.json` | MCP tool definition schema |

**Acceptance Criteria:**
- [ ] ARCHITECTURE.md documents all 4 layers with data flow diagrams
- [ ] WebSocket protocol schema defines WSMessage and WSResponse envelopes
- [ ] Error code taxonomy (1000-6099) documented
- [ ] Threading model documented (GameThread dispatch requirement)
- [ ] All 6 key architectural decisions documented with rationale
- [ ] Documents are internally consistent

**Commit:** `docs: add architecture decision records and protocol schemas`

---

### Task 1.3: MCP Server Core Types & Message Codec (US-003)

**Track A:** Node.js/TypeScript
**Complexity:** Medium
**Dependencies:** 1.1 (scaffolding complete)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/transport/message-codec.test.ts`
2. Define types: `/mcp-server/src/types/messages.ts`, `ws-protocol.ts`
3. Implement codec: `/mcp-server/src/transport/message-codec.ts`
4. Run tests until green

**Test File (write first):** `/mcp-server/tests/unit/transport/message-codec.test.ts`

```
Tests to write:
- encode() produces valid JSON with id, method, params, timestamp
- decode() parses valid WSResponse with result field
- decode() parses valid WSResponse with error field
- decode() rejects malformed JSON (throws ZodError)
- decode() rejects missing required fields (id)
- decode() rejects unknown message types
- round-trip: encode -> decode preserves all fields
- encodes every defined message type (ping, blueprint.serialize, etc.)
- handles unicode in string parameters
- handles large payloads (>1MB JSON)
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/types/messages.ts` | `WSMessage`, `WSResponse` interfaces |
| `/mcp-server/src/types/ws-protocol.ts` | WebSocket envelope Zod schemas |
| `/mcp-server/src/types/blueprint-schema.ts` | Blueprint AST TypeScript types |
| `/mcp-server/src/types/compile-result.ts` | Compilation result types |
| `/mcp-server/src/transport/message-codec.ts` | `encode()`, `decode()` with Zod validation |

**Acceptance Criteria:**
- [ ] Test file written BEFORE implementation
- [ ] All 10+ test cases pass
- [ ] Zod schemas validate all message types
- [ ] `tsc --noEmit` exits 0
- [ ] Malformed input throws descriptive Zod errors

**Commit:** `feat: implement message codec with Zod validation (TDD)`

---

### Task 1.4: MCP Server Skeleton with stdio Transport (US-004)

**Track A:** Node.js/TypeScript
**Complexity:** Medium
**Dependencies:** 1.3

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/observability/logger.test.ts` (verify stdout blocked)
2. **WRITE TEST FIRST:** `/mcp-server/tests/unit/tools/registry.test.ts` (tool registration)
3. Implement logger, registry, server bootstrap
4. Run tests until green

**Test Files (write first):**

`/mcp-server/tests/unit/observability/logger.test.ts`:
```
- logger.info() writes to stderr, NOT stdout
- logger.error() writes to stderr with error prefix
- logger.debug() writes to stderr only when LOG_LEVEL=debug
- console.log is overridden to use stderr
- no output reaches stdout (critical for JSON-RPC)
```

`/mcp-server/tests/unit/tools/registry.test.ts`:
```
- registerTool() adds tool to registry
- registerTool() rejects duplicate tool names
- getTools() returns all registered tools
- getTool() returns specific tool by name
- tool schema validated on registration
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/observability/logger.ts` | stderr-only logging, console.log override |
| `/mcp-server/src/tools/registry.ts` | Tool registration framework |
| `/mcp-server/src/tools/tool-schemas.ts` | Zod schemas for initial tools (ping) |
| `/mcp-server/src/index.ts` | McpServer + StdioServerTransport init |
| `/mcp-server/src/server.ts` | Tool registry wiring |

**Acceptance Criteria:**
- [ ] Tests written BEFORE implementation
- [ ] Server starts via `node dist/index.js` without errors
- [ ] ZERO output on stdout (only JSON-RPC)
- [ ] All debug/info logs go to stderr
- [ ] Tool registry registers and retrieves tools
- [ ] `.claude/mcp.json` configured correctly
- [ ] `tsc --noEmit` exits 0

**Commit:** `feat: MCP server skeleton with stdio transport and stderr logging (TDD)`

---

### Task 1.5: WebSocket Bridge & Connection Manager (US-005)

**Track A:** Node.js/TypeScript
**Complexity:** Medium
**Dependencies:** 1.3 (message codec)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/transport/websocket-bridge.test.ts`
2. Implement WebSocket server (Node.js listens on configurable port)
3. Implement connection manager with reconnection logic
4. Run tests until green

**Test File (write first):** `/mcp-server/tests/unit/transport/websocket-bridge.test.ts`

```
Tests to write:
- WS server starts on configured port (default 9877)
- accepts incoming client connection
- sends encoded message, receives correlated response
- request timeout after 30s rejects with TimeoutError
- multiple concurrent requests correlate correctly by ID
- heartbeat detects stale connection (no pong in 10s)
- connection drop triggers onDisconnect callback
- rejects messages with unknown correlation IDs
- handles connection from multiple clients (only one active)
- graceful shutdown closes all connections
```

`/mcp-server/tests/fixtures/mock-ue-client.ts`:
```
- Mock WebSocket client simulating UE plugin behavior
- Connects to bridge, echoes responses for test messages
- Supports configurable latency and failure injection
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/transport/websocket-bridge.ts` | WS server (Node.js as server, UE connects as client) |
| `/mcp-server/src/transport/connection-manager.ts` | Exponential backoff (1s, 2s, 4s, 8s, max 30s), heartbeat |
| `/mcp-server/tests/fixtures/mock-ue-client.ts` | Mock UE WebSocket client |

**Acceptance Criteria:**
- [ ] Test file written BEFORE implementation
- [ ] WS server listens on `process.env.UE_WS_PORT` (default 9877)
- [ ] Request/response correlation via `Map<string, {resolve, reject, timeout}>`
- [ ] 30-second timeout per request with cleanup
- [ ] Heartbeat mechanism (ping/pong every 10s)
- [ ] Connection drop detected and reported
- [ ] All tests pass, `tsc --noEmit` exits 0

**Commit:** `feat: WebSocket bridge server with connection management (TDD)`

---

### Task 1.6: UE Plugin Module & WebSocket Client (US-006)

**Track B:** C++ (PARALLEL with Track A tasks 1.3-1.5)
**Complexity:** Large
**Dependencies:** 1.1 (scaffolding)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAWebSocketClientTest.cpp`
2. **WRITE TEST FIRST:** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAMessageHandlerTest.cpp`
3. Implement UMAWebSocketClient (connects to Node.js WS server)
4. Implement UMAMessageHandler (routes by `method` field)
5. Wire into module startup/shutdown
6. Run UE automation tests

**Test Files (write first):**

`/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAWebSocketClientTest.cpp`:
```
IMPLEMENT_SIMPLE_AUTOMATION_TEST tests:
- Client connects to a mock WS server on localhost:9877
- Client sends ping message, receives pong response
- Client handles connection failure gracefully (server not running)
- Client reconnects after connection drop
- Client handles malformed JSON from server without crash
- Client dispatches all messages to GameThread
```

`/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAMessageHandlerTest.cpp`:
```
IMPLEMENT_SIMPLE_AUTOMATION_TEST tests:
- Routes "editor.ping" to ping handler
- Routes "blueprint.serialize" to blueprint handler
- Returns error for unknown method
- Handles missing "method" field gracefully
- All handlers execute on GameThread
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/ue-plugin/UnrealMasterAgent.uplugin` | `Modules: [{Name, Type: Editor, LoadingPhase: Default}]` |
| `/ue-plugin/Source/UnrealMasterAgent/UnrealMasterAgent.Build.cs` | Dependencies: `WebSockets`, `Json`, `JsonUtilities`, `Sockets`, `Networking` |
| `/ue-plugin/Source/UnrealMasterAgent/Public/UnrealMasterAgent.h` | `IModuleInterface` declaration |
| `/ue-plugin/Source/UnrealMasterAgent/Private/UnrealMasterAgent.cpp` | `StartupModule()` starts WS client, `ShutdownModule()` stops |
| `/ue-plugin/Source/UnrealMasterAgent/Public/WebSocket/UMAWebSocketClient.h` | WS client class using `FWebSocketsModule` |
| `/ue-plugin/Source/UnrealMasterAgent/Private/WebSocket/UMAWebSocketClient.cpp` | Connect to `ws://localhost:PORT`, send/receive |
| `/ue-plugin/Source/UnrealMasterAgent/Public/WebSocket/UMAMessageHandler.h` | Message routing by `method` field |
| `/ue-plugin/Source/UnrealMasterAgent/Private/WebSocket/UMAMessageHandler.cpp` | `TMap<FString, HandlerFunc>` dispatch table |
| `/ue-plugin/Source/UnrealMasterAgent/Public/WebSocket/UMAMessageTypes.h` | C++ structs matching `WSMessage`/`WSResponse` |

**Build.cs Module Dependencies:**
```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "Core", "CoreUObject", "Engine", "InputCore",
    "WebSockets", "Json", "JsonUtilities",
    "Sockets", "Networking"
});

if (Target.bBuildEditor)
{
    PrivateDependencyModuleNames.AddRange(new string[] {
        "UnrealEd", "BlueprintGraph", "KismetCompiler",
        "Kismet", "EditorSubsystem", "Slate", "SlateCore"
    });
}
```

**Critical Threading Pattern:**
```cpp
// In UMAWebSocketClient -- ALL incoming messages dispatch to GameThread
void FUMAWebSocketClient::OnMessage(const FString& Message)
{
    AsyncTask(ENamedThreads::GameThread, [this, Message]()
    {
        MessageHandler->HandleMessage(Message);
    });
}
```

**Acceptance Criteria:**
- [ ] Test files written BEFORE implementation
- [ ] Plugin loads in UE 5.x editor without errors (check Output Log)
- [ ] WS client connects to Node.js server on startup
- [ ] Messages routed to correct handlers by `method` field
- [ ] ALL WS message handlers dispatch to GameThread
- [ ] Plugin shuts down cleanly (WS connection closed)
- [ ] All UE automation tests pass

**Commit:** `feat: UE plugin with WebSocket client and message handler (TDD)`

---

### Task 1.7: E2E Ping/Pong Verification (US-007)

**Track:** Integration (requires both tracks)
**Complexity:** Small
**Dependencies:** 1.4 (MCP server), 1.5 (WS bridge), 1.6 (UE plugin)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/integration/mcp-tool-roundtrip.test.ts`
2. Register `editor.ping` tool in MCP server
3. Implement ping handler in UE plugin
4. Wire end-to-end
5. Run integration test with mock UE client

**Test File (write first):** `/mcp-server/tests/integration/mcp-tool-roundtrip.test.ts`

```
Tests to write:
- MCP tool "editor.ping" is discoverable in tool registry
- Calling editor.ping sends WS message with method "editor.ping"
- Mock UE client receives ping, responds with {result: "pong"}
- MCP server returns "pong" to Claude Code
- Full roundtrip completes in <100ms with mock client
- Timeout if UE client does not respond within 30s
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/tools/editor/ping.ts` | `editor.ping` MCP tool handler |
| `/scripts/dev-start.sh` | Updated: build + start MCP server in dev mode |

**Acceptance Criteria:**
- [ ] Integration test with mock UE client passes
- [ ] `editor.ping` registered in tool registry
- [ ] Full E2E test: Claude Code calls `editor.ping`, receives `pong`
- [ ] `scripts/dev-start.sh` starts MCP server correctly

**Commit:** `feat: E2E ping/pong verification pipeline (TDD)`

---

### Task 1.8: Editor Query Tools (US-008)

**Track:** Both (MCP tools + UE handlers)
**Complexity:** Medium
**Dependencies:** 1.7 (E2E pipeline verified)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/tools/editor.test.ts`
2. **WRITE TEST FIRST:** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAEditorQueriesTest.cpp`
3. Implement MCP tool handlers (TS)
4. Implement UE query handlers (C++)
5. Run all tests

**Test Files (write first):**

`/mcp-server/tests/unit/tools/editor.test.ts`:
```
- editor.getLevelInfo returns {levelName, actorCount, worldType}
- editor.listActors returns array of {name, class, location}
- editor.getAssetInfo returns {assetPath, assetClass, diskSize}
- all tools validate input via Zod schemas
- all tools handle UE-side errors gracefully
```

`/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAEditorQueriesTest.cpp`:
```
IMPLEMENT_SIMPLE_AUTOMATION_TEST tests:
- GetLevelInfo returns valid JSON with current level name
- ListActors returns array with at least default actors (sky, light)
- GetAssetInfo returns metadata for a known test asset
- GetAssetInfo returns error for non-existent asset path
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/tools/editor/get-level-info.ts` | `editor.getLevelInfo` tool |
| `/mcp-server/src/tools/editor/list-actors.ts` | `editor.listActors` tool |
| `/mcp-server/src/tools/editor/get-asset-info.ts` | `editor.getAssetInfo` tool |
| `/mcp-server/src/tools/tool-schemas.ts` | Updated: schemas for editor tools |
| `/ue-plugin/Source/UnrealMasterAgent/Public/Editor/UMAEditorQueries.h` | C++ query handlers |
| `/ue-plugin/Source/UnrealMasterAgent/Private/Editor/UMAEditorQueries.cpp` | Implementation |
| `/ue-plugin/Source/UnrealMasterAgent/Public/Editor/UMAEditorSubsystem.h` | `UEditorSubsystem` |
| `/ue-plugin/Source/UnrealMasterAgent/Private/Editor/UMAEditorSubsystem.cpp` | Persistent state |

**Acceptance Criteria:**
- [ ] Tests written BEFORE implementation
- [ ] Claude can ask "what level is open?" and get response
- [ ] Claude can ask "list actors in the scene" and get structured list
- [ ] Claude can ask "describe asset /Game/X" and get metadata
- [ ] All results returned as structured JSON matching schemas
- [ ] All tests pass (both TS unit and UE automation)

**Commit:** `feat: editor query tools -- level, actors, assets (TDD)`

---

### Phase 1 Parallelization Strategy

```
Week 1:
  Track A (TS): [1.1 Scaffolding] --> [1.3 Types & Codec]
  Track B (C++): [1.1 Scaffolding] --> [1.2 ADR Docs]

Week 2:
  Track A (TS): [1.4 MCP Skeleton] --> [1.5 WS Bridge]
  Track B (C++): [1.6 UE Plugin & WS Client]

Week 3:
  Integration:  [1.7 E2E Ping/Pong] --> [1.8 Editor Query Tools]
  (Requires both tracks complete)

Week 4 (buffer):
  Fix integration issues, stabilize, write remaining tests
```

### Phase 1 Definition of Done

- [ ] MCP server starts via stdio, registers in Claude Code
- [ ] UE plugin loads in editor, connects as WS client to MCP server
- [ ] Full E2E pipeline: Claude Code -> MCP Server -> WS -> UE Plugin -> Response
- [ ] `editor.ping`, `editor.getLevelInfo`, `editor.listActors`, `editor.getAssetInfo` all work
- [ ] ALL unit tests pass (Vitest): `npx vitest run`
- [ ] ALL UE automation tests pass
- [ ] Zero `tsc --noEmit` errors
- [ ] ARCHITECTURE.md and schemas are accurate
- [ ] Zero `console.log` calls to stdout in MCP server code

---

## 5. Phase 2: Blueprint Serialization & Manipulation

**User Stories:** US-009 through US-012
**Estimated Duration:** 4-6 weeks
**Prerequisites:** Phase 1 complete (E2E pipeline working)

### Task 2.1: Blueprint JSON AST Schema & Fixtures (US-009)

**Track:** Both (schema is shared contract)
**Complexity:** Medium
**Dependencies:** None (can start during Phase 1)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/tools/blueprint.test.ts` -- validate sample against Zod schema
2. Define JSON Schema: `/docs/schemas/blueprint-ast.schema.json`
3. Define TS types: `/mcp-server/src/types/blueprint-schema.ts`
4. Create test fixture: `/mcp-server/tests/fixtures/sample-blueprint.json`
5. Run tests until green

**Test File (write first):** `/mcp-server/tests/unit/tools/blueprint.test.ts`

```
Tests to write (schema validation subset):
- sample-blueprint.json validates against Zod BlueprintSchema
- schema requires blueprintPath (string)
- schema requires graphs array with at least 1 entry
- each graph has graphName, graphType, nodes array
- graphType must be one of: EventGraph, FunctionGraph, MacroGraph, AnimGraph
- each node has nodeId (UUID), nodeClass, nodeTitle, posX, posY, pins
- each pin has pinId, pinName, direction (Input|Output), category
- pin.linkedTo is array of {nodeId, pinId} pairs
- partial serialization: single node validates independently
- rejects JSON missing required fields (blueprintPath)
- rejects invalid graphType enum value
- rejects invalid pin direction enum value
```

**Blueprint AST JSON Schema (full):**

```json
{
  "blueprintPath": "/Game/BP_TestActor",
  "blueprintClass": "Blueprint",
  "parentClass": "Actor",
  "graphs": [
    {
      "graphName": "EventGraph",
      "graphType": "EventGraph",
      "nodes": [
        {
          "nodeId": "uuid-here",
          "nodeClass": "K2Node_Event",
          "nodeTitle": "Event BeginPlay",
          "posX": 0,
          "posY": 0,
          "comment": "",
          "pins": [
            {
              "pinId": "uuid-here",
              "pinName": "then",
              "direction": "Output",
              "category": "exec",
              "subCategory": "",
              "isExec": true,
              "defaultValue": "",
              "linkedTo": [
                {"nodeId": "uuid-target", "pinId": "uuid-pin"}
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/docs/schemas/blueprint-ast.schema.json` | Formal JSON Schema (draft-07) |
| `/mcp-server/src/types/blueprint-schema.ts` | Zod schema + TS types matching JSON Schema |
| `/mcp-server/tests/fixtures/sample-blueprint.json` | Realistic fixture with 5+ nodes |

**Acceptance Criteria:**
- [ ] Test file written BEFORE schema implementation
- [ ] JSON Schema is valid draft-07
- [ ] Zod types match JSON Schema exactly
- [ ] Sample fixture validates against both schemas
- [ ] Schema supports partial serialization (single node, single graph)
- [ ] Pin types use short strings: `exec`, `bool`, `int`, `float`, `string`, `object:ClassName`
- [ ] All tests pass

**Commit:** `feat: Blueprint AST JSON schema with test fixtures (TDD)`

---

### Task 2.2: Blueprint Serializer -- C++ (US-010)

**Track B:** C++
**Complexity:** XL (highest risk task in project)
**Dependencies:** 2.1 (schema finalized), 1.6 (plugin infrastructure)

**TDD Sequence:**
1. Create test Blueprint fixture: `/ue-plugin/Content/Tests/BP_TestActor.uasset`
2. **WRITE TEST FIRST:** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMABlueprintSerializerTest.cpp`
3. Implement serializer iterating `UBlueprint->UbergraphPages`
4. Run UE automation tests until green

**Test File (write first):** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMABlueprintSerializerTest.cpp`

```
IMPLEMENT_SIMPLE_AUTOMATION_TEST tests:
- LoadAndSerialize: Load BP_TestActor, serialize, output is valid JSON string
- NodeCount: Serialized JSON has exactly N nodes matching BP_TestActor
- PinLinkage: Serialized JSON correctly represents pin connections
- PinTypes: Exec pins have isExec=true, data pins have correct category
- NodePositions: posX and posY are non-zero integers
- EventGraphOnly: Only EventGraph type graphs are serialized (MacroGraph deferred)
- EmptyBlueprint: Serializing a BP with no nodes returns valid JSON with empty nodes array
- InvalidAssetPath: Serializing non-existent asset returns error
- PartialSerialization: Can serialize a single graph by name
- LargeBlueprint: Serializing a BP with 100+ nodes completes in <1 second
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/ue-plugin/Source/UnrealMasterAgent/Public/Blueprint/UMABlueprintSerializer.h` | Public interface |
| `/ue-plugin/Source/UnrealMasterAgent/Private/Blueprint/UMABlueprintSerializer.cpp` | Graph traversal |
| `/ue-plugin/Source/UnrealMasterAgent/Public/Blueprint/UMABlueprintTypes.h` | Serialization structs |

**Key C++ Implementation Details:**

```cpp
// Traversal pattern
UBlueprint* BP = LoadObject<UBlueprint>(nullptr, *AssetPath);
for (UEdGraph* Graph : BP->UbergraphPages)
{
    for (UEdGraphNode* Node : Graph->Nodes)
    {
        // Extract: Node->NodeGuid, Node->GetClass()->GetName(),
        //          Node->GetNodeTitle(ENodeTitleType::FullTitle),
        //          Node->NodePosX, Node->NodePosY
        for (UEdGraphPin* Pin : Node->Pins)
        {
            // Extract: Pin->PinId, Pin->PinName,
            //          Pin->Direction (EGPD_Input/EGPD_Output),
            //          Pin->PinType.PinCategory,
            //          Pin->PinType.PinSubCategoryObject,
            //          Pin->DefaultValue,
            //          Pin->LinkedTo (array of UEdGraphPin*)
        }
    }
}
```

**Pin Type Encoding:**
```cpp
FString EncodePinType(const FEdGraphPinType& PinType)
{
    if (PinType.PinCategory == UEdGraphSchema_K2::PC_Exec) return TEXT("exec");
    if (PinType.PinCategory == UEdGraphSchema_K2::PC_Boolean) return TEXT("bool");
    if (PinType.PinCategory == UEdGraphSchema_K2::PC_Int) return TEXT("int");
    if (PinType.PinCategory == UEdGraphSchema_K2::PC_Float) return TEXT("float");
    if (PinType.PinCategory == UEdGraphSchema_K2::PC_Real) return TEXT("double");
    if (PinType.PinCategory == UEdGraphSchema_K2::PC_String) return TEXT("string");
    if (PinType.PinCategory == UEdGraphSchema_K2::PC_Object)
    {
        UObject* SubCatObj = PinType.PinSubCategoryObject.Get();
        return FString::Printf(TEXT("object:%s"), SubCatObj ? *SubCatObj->GetName() : TEXT("None"));
    }
    return PinType.PinCategory.ToString(); // fallback
}
```

**Acceptance Criteria:**
- [ ] Test file written BEFORE implementation
- [ ] Given BP_TestActor with known structure, serializer outputs matching JSON
- [ ] Node count in JSON matches node count in Blueprint
- [ ] Pin linkages correctly represented as `{nodeId, pinId}` pairs
- [ ] Pin types encoded as short strings
- [ ] Handles EventGraph only (AnimGraph, MacroGraph deferred)
- [ ] All UE automation tests pass

**Commit:** `feat: C++ Blueprint serializer with EventGraph traversal (TDD)`

---

### Task 2.3: Blueprint Node Spawning & Pin Connection -- C++ (US-011)

**Track B:** C++
**Complexity:** Large
**Dependencies:** 2.2 (serializer)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMABlueprintManipulatorTest.cpp`
2. Implement node spawning via `FKismetEditorUtilities`
3. Implement pin connection via `UEdGraphSchema_K2::TryCreateConnection`
4. Run UE automation tests until green

**Test File (write first):** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMABlueprintManipulatorTest.cpp`

```
IMPLEMENT_SIMPLE_AUTOMATION_TEST tests:
- SpawnNode: Spawn UK2Node_CallFunction for PrintString, verify node exists in graph
- SpawnNodePins: Spawned node has AllocateDefaultPins() called, pins are populated
- SpawnNodePosition: Spawned node has correct posX, posY
- ConnectExecPins: Link BeginPlay exec output to PrintString exec input, verify LinkedTo
- ConnectDataPins: Link string output to PrintString InString input, verify LinkedTo
- RejectIncompatiblePins: Attempt to link int output to bool input, verify error returned
- TryCreateConnection: Uses Schema->TryCreateConnection (NOT raw MakeLinkTo)
- MarkModified: After modification, Blueprint is marked as modified
- DeleteNode: Remove a node, verify node count decreased
- MultipleOperations: Spawn 3 nodes, connect in chain, verify full graph structure
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/ue-plugin/Source/UnrealMasterAgent/Public/Blueprint/UMABlueprintManipulator.h` | Public interface |
| `/ue-plugin/Source/UnrealMasterAgent/Private/Blueprint/UMABlueprintManipulator.cpp` | Implementation |

**Key C++ Implementation Details:**

```cpp
// Node spawning
UK2Node_CallFunction* NewNode = NewObject<UK2Node_CallFunction>(Graph);
UFunction* Func = UKismetSystemLibrary::StaticClass()->FindFunctionByName(FunctionName);
NewNode->SetFromFunction(Func);
NewNode->NodePosX = PosX;
NewNode->NodePosY = PosY;
NewNode->AllocateDefaultPins();
Graph->AddNode(NewNode, false, false);

// Pin connection (MUST use TryCreateConnection, NOT MakeLinkTo)
const UEdGraphSchema_K2* Schema = GetDefault<UEdGraphSchema_K2>();
bool bConnected = Schema->TryCreateConnection(SourcePin, TargetPin);

// Mark modified
FBlueprintEditorUtils::MarkBlueprintAsModified(Blueprint);
```

**Acceptance Criteria:**
- [ ] Test file written BEFORE implementation
- [ ] Node spawning creates valid Blueprint nodes with pins
- [ ] Pin connection uses `TryCreateConnection` (handles polymorphic pins)
- [ ] Incompatible pin types rejected with descriptive error
- [ ] Blueprint marked as modified after changes
- [ ] Node deletion removes node and cleans up pin connections
- [ ] All UE automation tests pass

**Commit:** `feat: Blueprint node spawning and pin connection via TryCreateConnection (TDD)`

---

### Task 2.4: Blueprint MCP Tools & Stateful Caching (US-012)

**Track A:** Node.js/TypeScript (with C++ handler wiring)
**Complexity:** Medium
**Dependencies:** 2.2, 2.3 (C++ implementation), 1.7 (E2E pipeline)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/state/cache-store.test.ts`
2. **WRITE TEST FIRST:** `/mcp-server/tests/unit/tools/blueprint.test.ts` (tool handler tests)
3. Implement LRU cache
4. Implement MCP tool handlers
5. Wire UE handlers to message dispatcher
6. Run all tests

**Test Files (write first):**

`/mcp-server/tests/unit/state/cache-store.test.ts`:
```
- set/get: store value, retrieve by key
- TTL: value expires after configurable TTL (default 60s)
- LRU eviction: when at max capacity, oldest entry evicted
- cache hit: get() returns cached value
- cache miss: get() returns undefined for missing key
- delete: remove specific cache entry
- clear: remove all entries
- size: reports current entry count
- concurrent: multiple rapid set/get operations are consistent
```

`/mcp-server/tests/unit/tools/blueprint.test.ts` (tool handler tests):
```
- blueprint.serialize: sends WS message, caches result, returns cache key + summary
- blueprint.createNode: validates input schema, sends WS message, returns new node ID
- blueprint.connectPins: validates pin IDs, sends WS message, returns success
- blueprint.modifyProperty: validates property name/value, sends WS message
- blueprint.deleteNode: validates node ID, sends WS message, returns success
- all tools: reject invalid input with Zod validation errors
- caching: subsequent serialize for same BP returns cached result
- cache key format: "bp:{assetPath}"
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/state/cache-store.ts` | LRU cache (max entries, TTL) |
| `/mcp-server/src/tools/blueprint/serialize.ts` | `blueprint.serialize` tool |
| `/mcp-server/src/tools/blueprint/create-node.ts` | `blueprint.createNode` tool |
| `/mcp-server/src/tools/blueprint/connect-pins.ts` | `blueprint.connectPins` tool |
| `/mcp-server/src/tools/blueprint/modify-property.ts` | `blueprint.modifyProperty` tool |
| `/mcp-server/src/tools/blueprint/delete-node.ts` | `blueprint.deleteNode` tool |
| `/mcp-server/src/state/session.ts` | Session state tracking |

**Acceptance Criteria:**
- [ ] Tests written BEFORE implementation
- [ ] LRU cache implements configurable max entries (default 1000) and TTL (default 60s)
- [ ] Large Blueprint JSON cached server-side
- [ ] Only cache key + summary returned to Claude (saves tokens)
- [ ] All 5 blueprint tools registered and functional
- [ ] Zod schema validation on all tool inputs
- [ ] All tests pass, `tsc --noEmit` exits 0

**Commit:** `feat: Blueprint MCP tools with LRU caching (TDD)`

---

### Phase 2 Parallelization Strategy

```
Week 5 (during late Phase 1):
  Track A (TS): [2.1 Schema Design] -- can start early
  Track B (C++): [finishing 1.6/1.8]

Week 6-7:
  Track A (TS): [2.4 MCP Tools + Cache] -- once schema finalized
  Track B (C++): [2.2 Serializer] --> [2.3 Manipulator]

Week 8:
  Integration: Wire Blueprint tools end-to-end
  Both tracks: Fix integration issues, test with real Blueprints

Week 9 (buffer):
  Stabilize Phase 2, verify with complex Blueprints
```

### Phase 2 Definition of Done

- [ ] Blueprint JSON AST schema is finalized and validated
- [ ] C++ serializer traverses UEdGraph and outputs schema-conformant JSON
- [ ] C++ manipulator spawns nodes and connects pins via TryCreateConnection
- [ ] 5 MCP tools functional: serialize, createNode, connectPins, modifyProperty, deleteNode
- [ ] Stateful LRU caching prevents token waste on large Blueprints
- [ ] All Vitest tests pass
- [ ] All UE automation tests pass
- [ ] Claude can read, create, and connect Blueprint nodes via natural language

---

## 6. Phase 3: Slate UI + Live Coding

**User Stories:** US-013 through US-017
**Estimated Duration:** 4-5 weeks
**Prerequisites:** Phase 1 complete; Phase 2 substantially complete

### Task 3.1: Slate Template RAG System (US-013)

**Track A:** Node.js/TypeScript
**Complexity:** Medium
**Dependencies:** None (can start during Phase 2)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/rag/semantic-search.test.ts`
2. Write Slate template markdown documents
3. Implement embedding store
4. Implement semantic search
5. Run tests until green

**Test File (write first):** `/mcp-server/tests/unit/rag/semantic-search.test.ts`

```
Tests to write:
- "create a list view widget" returns list-view.md with >0.8 relevance
- "STreeView with hierarchical data" returns tree-view.md
- "modal dialog popup" returns dialog.md
- "toolbar button" returns toolbar.md
- "base compound widget" returns base-widget.md
- top-k=3 returns 3 results sorted by relevance
- empty query returns empty results
- all templates are indexed at startup
- re-indexing after template update works
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/docs/slate-templates/base-widget.md` | SCompoundWidget boilerplate |
| `/docs/slate-templates/list-view.md` | SListView pattern |
| `/docs/slate-templates/tree-view.md` | STreeView pattern |
| `/docs/slate-templates/details-panel.md` | Property editor panel |
| `/docs/slate-templates/toolbar.md` | SToolBarButtonBlock |
| `/docs/slate-templates/dialog.md` | SWindow modal dialog |
| `/docs/slate-templates/tab-widget.md` | SDockTab pattern |
| `/mcp-server/src/rag/embedding-store.ts` | `@xenova/transformers` with `all-MiniLM-L6-v2` |
| `/mcp-server/src/rag/semantic-search.ts` | Vector similarity (cosine) search |
| `/mcp-server/src/rag/slate-templates.ts` | Template loading + indexing |

**Acceptance Criteria:**
- [ ] Test file written BEFORE implementation
- [ ] 7 Slate template documents in `docs/slate-templates/`
- [ ] Each template follows Epic C++ coding conventions
- [ ] Embeddings generated locally via `@xenova/transformers`
- [ ] Embeddings stored in flat JSON file (corpus < 100 docs)
- [ ] Semantic search returns relevant template with >0.8 relevance
- [ ] All tests pass

**Commit:** `feat: Slate template RAG system with semantic search (TDD)`

---

### Task 3.2: Slate Widget Generation & Validation Tool (US-014)

**Track A:** Node.js/TypeScript
**Complexity:** Large
**Dependencies:** 3.1 (RAG system)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/tools/slate.test.ts`
2. Implement Slate code validator
3. Implement generation tool with RAG context injection
4. Run tests until green

**Test File (write first):** `/mcp-server/tests/unit/tools/slate.test.ts`

```
Tests to write:
- validate: balanced SNew brackets passes
- validate: unbalanced SNew brackets fails with descriptive error
- validate: SLATE_BEGIN_ARGS without SLATE_END_ARGS fails
- validate: SLATE_END_ARGS without SLATE_BEGIN_ARGS fails
- validate: correct TAttribute usage passes
- validate: missing .Get() on TAttribute access fails
- generate: query "list view" retrieves list-view.md template
- generate: output includes SLATE_BEGIN_ARGS boilerplate
- generate: style guide constraints are injected into prompt
- generate: generated code passes validation
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/tools/slate/generate-widget.ts` | RAG-augmented generation |
| `/mcp-server/src/tools/slate/validate-slate.ts` | Pre-validation checks |
| `/mcp-server/src/tools/slate/list-templates.ts` | List available templates |

**Acceptance Criteria:**
- [ ] Test file written BEFORE implementation
- [ ] Pre-validation catches: unbalanced SNew, missing SLATE_END_ARGS, wrong TAttribute
- [ ] RAG templates injected into generation context
- [ ] Style guidelines enforced via prompt injection
- [ ] All tests pass

**Commit:** `feat: Slate widget generation with pre-validation and RAG (TDD)`

---

### Task 3.3: File Operations with Safety Gate (US-015)

**Track:** Both
**Complexity:** Medium
**Dependencies:** 1.7 (E2E pipeline)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/state/safety.test.ts`
2. **WRITE TEST FIRST:** `/mcp-server/tests/integration/safety-gate.test.ts`
3. Implement safety classification
4. Implement file operations (TS + C++)
5. Run all tests

**Test Files (write first):**

`/mcp-server/tests/unit/state/safety.test.ts`:
```
- classifies file.read as "safe"
- classifies file.write to new file as "warn"
- classifies file.write overwriting existing file as "dangerous"
- classifies blueprint.deleteNode as "dangerous"
- classifies editor.getLevelInfo as "safe"
- blocks dangerous operations until approval received
- timeout after 60s defaults to "reject"
- approved operations proceed
- rejected operations return error to Claude
- path traversal attempt (../) classified as "blocked" (not even dangerous)
```

`/mcp-server/tests/integration/safety-gate.test.ts`:
```
- full flow: dangerous write -> block -> approve -> proceed
- full flow: dangerous write -> block -> reject -> error returned
- full flow: dangerous write -> block -> timeout -> rejected
- safe read -> proceeds immediately without approval
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/state/safety.ts` | Operation classification + approval gate |
| `/mcp-server/src/tools/file/read-file.ts` | `file.read` tool |
| `/mcp-server/src/tools/file/write-file.ts` | `file.write` tool with safety gate |
| `/mcp-server/src/tools/file/search-files.ts` | `file.search` tool |
| `/ue-plugin/Source/UnrealMasterAgent/Public/FileOps/UMAFileOperations.h` | File ops |
| `/ue-plugin/Source/UnrealMasterAgent/Private/FileOps/UMAFileOperations.cpp` | With path bounds |

**Acceptance Criteria:**
- [ ] Tests written BEFORE implementation
- [ ] Operations classified: safe (reads), warn (new file writes), dangerous (overwrites/deletes)
- [ ] Path traversal attacks blocked
- [ ] Dangerous operations require approval with 60s timeout
- [ ] All tests pass

**Commit:** `feat: file operations with human-in-the-loop safety gate (TDD)`

---

### Task 3.4: Live Coding Controller -- C++ (US-016)

**Track B:** C++
**Complexity:** Large
**Dependencies:** 1.6 (plugin infrastructure)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMALiveCodingControllerTest.cpp`
2. **WRITE TEST FIRST:** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMACompileLogParserTest.cpp`
3. Implement Live Coding controller
4. Implement compile log parser
5. Run UE automation tests

**Test Files (write first):**

`/ue-plugin/Source/UnrealMasterAgentTests/Private/UMALiveCodingControllerTest.cpp`:
```
IMPLEMENT_SIMPLE_AUTOMATION_TEST tests:
- ModuleAvailable: ILiveCodingModule is loaded and accessible
- IsEnabled: Check IsEnabledForSession() returns bool
- TriggerCompile: Compile() call does not crash (guard with #if WITH_LIVE_CODING)
- CompileCallback: GetOnPatchCompleteDelegate() can be bound
- FallbackPath: When Live Coding unavailable, returns descriptive error
- GuardMacro: Code compiles with and without WITH_LIVE_CODING defined
```

`/ue-plugin/Source/UnrealMasterAgentTests/Private/UMACompileLogParserTest.cpp`:
```
IMPLEMENT_SIMPLE_AUTOMATION_TEST tests:
- ParseMSVCError: "file.cpp(42): error C2065: 'x' undeclared" -> structured error
- ParseClangError: "file.cpp:42:10: error: use of undeclared identifier 'x'" -> structured error
- ParseWarning: Warning lines extracted with severity="warning"
- ParseMultiLine: Multi-line error (template backtrace) captured as single entry
- ParseLinkerError: Linker errors (LNK####) extracted
- NoErrors: Clean build output returns empty error array
- MixedOutput: Mix of errors, warnings, info lines correctly categorized
- ErrorCount: Reports total error and warning counts
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/ue-plugin/Source/UnrealMasterAgent/Public/Compilation/UMALiveCodingController.h` | ILiveCodingModule wrapper |
| `/ue-plugin/Source/UnrealMasterAgent/Private/Compilation/UMALiveCodingController.cpp` | Guarded with `#if WITH_LIVE_CODING` |
| `/ue-plugin/Source/UnrealMasterAgent/Public/Compilation/UMACompileLogParser.h` | FOutputDevice subclass |
| `/ue-plugin/Source/UnrealMasterAgent/Private/Compilation/UMACompileLogParser.cpp` | Regex-based log parsing |

**Key C++ Implementation:**
```cpp
#if WITH_LIVE_CODING
ILiveCodingModule* LC = FModuleManager::GetModulePtr<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);
if (LC && LC->IsEnabledForSession())
{
    LC->GetOnPatchCompleteDelegate().AddRaw(this, &FUMALiveCodingController::OnPatchComplete);
    LC->Compile(ELiveCodingCompileFlags::None, nullptr);
}
#endif
```

**Acceptance Criteria:**
- [ ] Test files written BEFORE implementation
- [ ] Live Coding wrapper guarded with `#if WITH_LIVE_CODING`
- [ ] Checks `IsEnabledForSession()` before `Compile()`
- [ ] Completion callback bound via `GetOnPatchCompleteDelegate()`
- [ ] Compile log parser handles MSVC and Clang error formats
- [ ] Multi-line errors and template backtraces captured
- [ ] Fallback documented for macOS/Linux
- [ ] All UE automation tests pass

**Commit:** `feat: Live Coding controller and compile log parser (TDD)`

---

### Task 3.5: Compilation MCP Tools (US-017)

**Track A:** Node.js/TypeScript
**Complexity:** Medium
**Dependencies:** 3.4 (Live Coding controller)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/tools/compilation.test.ts`
2. Implement compilation tools
3. Wire to UE handlers
4. Run tests

**Test File (write first):** `/mcp-server/tests/unit/tools/compilation.test.ts`

```
Tests to write:
- compilation.trigger sends compile command, returns status ID
- compilation.getStatus returns: pending | compiling | success | failed
- compilation.getErrors returns structured error array from parser
- trigger validates: no concurrent compiles (returns error if already compiling)
- getErrors: empty array when compilation succeeded
- getErrors: structured {file, line, column, severity, message, code} per error
- all tools handle UE disconnection gracefully
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/tools/compilation/trigger-compile.ts` | `compilation.trigger` |
| `/mcp-server/src/tools/compilation/get-status.ts` | `compilation.getStatus` |
| `/mcp-server/src/tools/compilation/get-errors.ts` | `compilation.getErrors` |

**Acceptance Criteria:**
- [ ] Test file written BEFORE implementation
- [ ] Compile trigger returns immediately with status ID
- [ ] Status polling works: pending -> compiling -> success/failed
- [ ] Error retrieval returns structured parsed results
- [ ] No concurrent compiles allowed
- [ ] All tests pass

**Commit:** `feat: compilation MCP tools -- trigger, status, errors (TDD)`

---

### Phase 3 Parallelization Strategy

```
Week 9 (start during Phase 2):
  Track A (TS): [3.1 RAG System]
  Track B (C++): [3.4 Live Coding Controller]

Week 10:
  Track A (TS): [3.2 Slate Generation] + [3.3 File Ops]
  Track B (C++): [3.4 cont'd] + [3.5 Log Parser (inside 3.4)]

Week 11:
  Track A (TS): [3.5 Compilation MCP Tools]
  Track B (C++): Integration testing with Live Coding

Week 12:
  Integration: Full Slate generation -> write -> compile -> verify cycle
  Both: Fix issues, test with real Slate widgets
```

### Phase 3 Definition of Done

- [ ] RAG system indexes 7 Slate templates with >0.8 relevance accuracy
- [ ] Slate code pre-validation catches common LLM errors
- [ ] File operations work with safety gate (read/write/search)
- [ ] Live Coding triggered programmatically, completion callback works
- [ ] Compile log parser handles MSVC and Clang formats
- [ ] 3 compilation tools functional: trigger, getStatus, getErrors
- [ ] All Vitest and UE automation tests pass
- [ ] Claude can: generate Slate widget -> write to file -> compile -> read errors

---

## 7. Phase 4: Agent Autonomy & Optimization

**User Stories:** US-018 through US-022
**Estimated Duration:** 3-4 weeks
**Prerequisites:** Phases 1-3 complete

### Task 4.1: Self-Healing Compile Loop (US-018)

**Track:** Both (meta-tool in TS, integration relies on Claude reasoning)
**Complexity:** XL
**Dependencies:** 3.3 (file ops), 3.5 (compilation tools)

**TDD Sequence:**
1. **WRITE TEST FIRST:** Integration test with intentional compile error fixture
2. Implement `compilation.selfHeal` meta-tool
3. Test full loop: error -> read -> fix -> write -> recompile

**Test File (write first):** (integration test)

```
Tests to write:
- selfHeal orchestrates: getErrors -> file.read -> (fix) -> file.write -> compilation.trigger
- retry count tracked per session (starts at 0)
- after 3 failed retries, returns error requesting human help
- successful fix resets retry count for that file
- selfHeal returns structured result: {fixed: bool, retryCount: int, errors: [...]}
- does NOT implement fix logic itself (Claude provides the fix)
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/tools/compilation/self-heal.ts` | `compilation.selfHeal` meta-tool |
| `/mcp-server/src/state/session.ts` | Updated: retry count tracking |

**Key Design Principle:** The self-healing loop is NOT a server-side state machine. Claude Code's reasoning chains the tool calls:
1. Claude calls `compilation.getErrors` -> receives structured errors
2. Claude calls `file.read` for the erroring file
3. Claude reasons about the fix
4. Claude calls `file.write` with the fix
5. Claude calls `compilation.trigger`
6. Claude calls `compilation.getStatus` until complete
7. If still failing, repeat (up to 3 times)

The `compilation.selfHeal` meta-tool is a convenience wrapper, NOT a requirement. Claude can chain atomic tools directly.

**Acceptance Criteria:**
- [ ] Self-healing relies on Claude reasoning (not server-side state machine)
- [ ] Hard cap at 3 retry loops
- [ ] Retry count tracked per session
- [ ] After 3 failures, reports to user with full error context
- [ ] Integration test with intentional error fixture passes

**Commit:** `feat: self-healing compile loop with 3-retry cap (TDD)`

---

### Task 4.2: Observability & Tracing (US-019)

**Track A:** Node.js/TypeScript
**Complexity:** Medium
**Dependencies:** 1.4 (MCP server)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/mcp-server/tests/unit/observability/tracer.test.ts`
2. Implement tracer with OpenTelemetry-compatible spans
3. Implement metrics collector
4. Run tests

**Test File (write first):** `/mcp-server/tests/unit/observability/tracer.test.ts`

```
Tests to write:
- startSpan creates span with tool name
- endSpan records duration_ms
- span includes: toolName, success (bool), inputSummary, errorDetails
- failed span has error details attached
- trace emits to configured endpoint (mock)
- metrics.recordToolCall increments counter for tool name
- metrics.getStats returns {totalCalls, successRate, avgLatency} per tool
- tracer disabled when TRACING_ENABLED=false
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/observability/tracer.ts` | OpenTelemetry trace spans |
| `/mcp-server/src/observability/metrics.ts` | Tool call latency + success rates |

**Acceptance Criteria:**
- [ ] Every tool call emits a trace span
- [ ] Spans include: tool name, duration, success/failure, input summary
- [ ] Metrics track latency and success rates per tool
- [ ] Integration with LangSmith/Langfuse API (configurable)
- [ ] Tracing can be disabled via environment variable
- [ ] All tests pass

**Commit:** `feat: observability with OpenTelemetry tracing and metrics (TDD)`

---

### Task 4.3: Dynamic Tool Registry / Micro-Tools (US-020)

**Track A:** Node.js/TypeScript
**Complexity:** Medium
**Dependencies:** 3.1 (RAG infrastructure)

**TDD Sequence:**
1. **WRITE TEST FIRST:** Extend `/mcp-server/tests/unit/rag/semantic-search.test.ts` for tool retrieval
2. Implement dynamic tool registration
3. Implement `notifications/tools/list_changed` emission
4. Run tests

**Additional Tests:**
```
- 10-15 core tools registered at boot
- dynamic tools discovered via RAG when query context changes
- registry.addTool() registers new tool at runtime
- registry.removeTool() unregisters tool
- tools/list_changed notification emitted on tool set change
- RAG retrieval: "blueprint" context returns blueprint tools
- RAG retrieval: "compile" context returns compilation tools
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/mcp-server/src/tools/registry.ts` | Updated: dynamic add/remove support |
| `/mcp-server/src/rag/embedding-store.ts` | Updated: tool schema embeddings |

**Acceptance Criteria:**
- [ ] Core tools (10-15) registered statically at boot
- [ ] Additional tools discovered via RAG based on context
- [ ] `notifications/tools/list_changed` emitted when tool set changes
- [ ] All tests pass

**Commit:** `feat: dynamic tool registry with RAG-based discovery (TDD)`

---

### Task 4.4: Human-in-the-Loop Safety System -- Full (US-021)

**Track B:** C++ (UE-side approval dialog)
**Complexity:** Medium
**Dependencies:** 3.3 (safety classification from TS side)

**TDD Sequence:**
1. **WRITE TEST FIRST:** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAApprovalGateTest.cpp`
2. Implement Slate approval dialog
3. Wire approval/rejection back through WS
4. Run tests

**Test File (write first):** `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAApprovalGateTest.cpp`

```
IMPLEMENT_SIMPLE_AUTOMATION_TEST tests:
- ApprovalGate spawns Slate dialog (verify widget created)
- Dialog displays operation description and file path
- Approve button sends approval response via WS
- Reject button sends rejection response via WS
- Dialog auto-closes after 60 seconds (timeout = reject)
- Multiple simultaneous approval requests queued
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| `/ue-plugin/Source/UnrealMasterAgent/Public/Safety/UMAApprovalGate.h` | Approval dialog |
| `/ue-plugin/Source/UnrealMasterAgent/Private/Safety/UMAApprovalGate.cpp` | Slate dialog |

**Acceptance Criteria:**
- [ ] In-editor Slate dialog for destructive operation approval
- [ ] 60-second timeout defaults to reject
- [ ] Approval/rejection routed back through WS to MCP server to Claude
- [ ] All tests pass

**Commit:** `feat: in-editor approval dialog for destructive operations (TDD)`

---

### Task 4.5: In-Editor Chat Panel (US-022)

**Track B:** C++
**Complexity:** Large
**Dependencies:** 4.1, 4.2, 4.3 (all core features stable)

**TDD Sequence:**
1. **WRITE TEST FIRST:** UMAEditorSubsystem test for panel registration
2. Implement Slate chat panel widget
3. Implement WebBrowser component integration
4. Wire message routing
5. Run tests

**Test File:** Extend existing `/ue-plugin/Source/UnrealMasterAgentTests/Private/UMAEditorQueriesTest.cpp`

```
Additional tests:
- Chat panel tab registered in UMAEditorSubsystem
- Tab can be spawned via FGlobalTabmanager
- Panel sends message via WS when user types
- Panel displays response when WS message received
```

**Implementation Files:**

| File | Purpose |
|------|---------|
| New Slate widget files in UE plugin | Chat panel UI |
| WebBrowser component integration | Chat rendering |

**Acceptance Criteria:**
- [ ] Dockable tab in UE editor
- [ ] Messages routed to Claude Code via existing WS pipeline
- [ ] Responses displayed in panel
- [ ] All tests pass

**NOTE:** This is lowest priority in Phase 4. The primary UX (Claude Code CLI) works from Phase 1.

**Commit:** `feat: in-editor dockable chat panel (TDD)`

---

### Phase 4 Parallelization Strategy

```
Week 13:
  Track A (TS): [4.2 Observability] + [4.3 Micro-Tools]
  Track B (C++): [4.4 Safety Dialogs]

Week 14:
  Track A (TS): [4.1 Self-Healing Loop]
  Track B (C++): [4.5 Chat Panel]

Week 15-16:
  Integration: Full autonomy testing
  Both: Polish, edge cases, performance optimization
```

### Phase 4 Definition of Done

- [ ] Self-healing compile loop works with 3-retry cap
- [ ] Observability traces every tool call to LangSmith/Langfuse
- [ ] Dynamic tool registry scales beyond 30 tools via RAG
- [ ] In-editor approval dialog blocks destructive operations
- [ ] In-editor chat panel functional (lower priority)
- [ ] All Vitest and UE automation tests pass
- [ ] Claude can autonomously: write code -> compile -> detect errors -> fix -> recompile

---

## 8. Cross-Cutting: Documentation Strategy (US-023)

Documentation is updated at each phase completion, NOT as a final phase.

### When to Update Documentation

| Trigger | What to Update |
|---------|---------------|
| Phase 1 complete | Root `AGENTS.md`, `README.md` (setup instructions), `ARCHITECTURE.md` |
| Phase 2 complete | `mcp-server/AGENTS.md`, `ue-plugin/AGENTS.md`, Blueprint schema docs |
| Phase 3 complete | `docs/AGENTS.md`, Slate template docs, Live Coding API reference |
| Phase 4 complete | All AGENTS.md files, final README with full workflow |
| Every new MCP tool | `docs/schemas/tool-manifest.schema.json` |
| Every schema change | Corresponding `.schema.json` and TypeScript types |

### Documentation Files to Maintain

| File | Content |
|------|---------|
| `/README.md` | Setup instructions, dev workflow, TDD guidelines |
| `/ARCHITECTURE.md` | 4-layer architecture, data flow, key decisions |
| `/AGENTS.md` | Root-level AI agent documentation |
| `/mcp-server/AGENTS.md` | MCP server directory docs |
| `/ue-plugin/AGENTS.md` | UE plugin directory docs |
| `/docs/AGENTS.md` | RAG knowledge base docs |
| All `<!-- Parent: -->` references | Correct hierarchy |

### Documentation Acceptance Criteria

- [ ] All AGENTS.md files reflect ACTUAL (not planned) directory structure
- [ ] README has working setup instructions tested from scratch
- [ ] ARCHITECTURE.md matches actual implementation decisions
- [ ] All AGENTS.md have correct `<!-- Parent: -->` references
- [ ] Documentation is internally consistent

---

## 9. TDD Methodology by Layer

### 9.1. MCP Server (Vitest)

**Test Runner:** Vitest
**Config:** `/mcp-server/vitest.config.ts`
**Run:** `cd mcp-server && npx vitest run`

**Test-First Workflow:**
```
1. Write Zod schema for new tool input/output (tool-schemas.ts)
2. Write test: schema validates correct input, rejects bad input
3. Write test: tool handler returns expected output given mocked UE response
4. Implement tool handler to pass tests
5. Write integration test with mock WS client
6. Wire tool into registry
7. Verify: npx vitest run -- all green
```

**Mock Strategy:**
- Mock WebSocket bridge for unit tests (no real UE connection)
- Use `/mcp-server/tests/fixtures/mock-ue-client.ts` for integration tests
- Sample data fixtures in `/mcp-server/tests/fixtures/`

**Coverage Target:** 80%+ line coverage for `src/` directory

### 9.2. UE Plugin (Automation Framework)

**Test Framework:** UE Automation Tests (`IMPLEMENT_SIMPLE_AUTOMATION_TEST`)
**Test Module:** `UnrealMasterAgentTests` (separate module from plugin)
**Run:** Session Frontend -> Automation tab, or headless:
```bash
UnrealEditor-Cmd -ExecCmds="Automation RunTests UnrealMasterAgent"
```

**Test-First Workflow:**
```
1. Create test Blueprint fixture in Content/Tests/ (if needed)
2. Write IMPLEMENT_SIMPLE_AUTOMATION_TEST
3. Run test -- verify it fails (RED)
4. Implement feature in main module
5. Run test -- verify it passes (GREEN)
6. Refactor if needed, re-run test
```

**Test Fixture Assets:**
- `/ue-plugin/Content/Tests/BP_TestActor.uasset` -- Simple Actor BP with BeginPlay + PrintString
- `/ue-plugin/Content/Tests/BP_SerializationFixture.uasset` -- Complex BP with 5+ node types

**Test Flags:**
```cpp
IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FUMABlueprintSerializerTest,
    "UnrealMasterAgent.Blueprint.Serializer",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::ProductFilter
)
```

### 9.3. E2E Tests

E2E tests verify the complete pipeline but require a running UE editor.

**Execution Strategy:**
1. Launch UE editor with test project
2. Wait for WS client connection to MCP server
3. Run MCP server in test mode
4. Execute scripted tool calls
5. Assert results

**E2E Test Script:** `/scripts/test-e2e.sh` (manual execution)

| Test | Setup | Verification |
|------|-------|-------------|
| Query level | UE editor open | Returns level name |
| Serialize BP | Test BP loaded | JSON matches schema |
| Create+connect nodes | Empty test BP | Nodes and connections exist |
| Trigger compile | Compilable state | Live Coding triggers |
| Self-healing | Intentional error | Agent fixes and recompiles |

---

## 10. Risk Mitigation Matrix

### Phase 1 Risks

| Risk | Severity | Probability | Mitigation | Owner |
|------|----------|-------------|------------|-------|
| UE WS library instability | High | Low | **MITIGATED**: Reversed WS direction. UE uses built-in `FWebSocketsModule` client. | Track B |
| stdio stream corruption | High | High (early) | Override `console.log` to stderr in `logger.ts`. CI check: grep for `console.log`. | Track A |
| MCP SDK API changes | Medium | Low | Pin `@modelcontextprotocol/sdk` to exact version. | Track A |
| GameThread violations | High | Medium | Utility wrapper: `FUMAGameThreadDispatcher`. Code review checklist item. | Track B |

### Phase 2 Risks

| Risk | Severity | Probability | Mitigation | Owner |
|------|----------|-------------|------------|-------|
| Blueprint serialization correctness | Critical | High | Start with EventGraph only, common node types. Exhaustive test fixtures. | Track B |
| UEdGraphPin API version differences | High | Medium | Target single UE version (5.4/5.5). Abstract behind interface. | Track B |
| TryCreateConnection vs MakeLinkTo | Medium | High | **DECIDED**: Always use TryCreateConnection. Documented. | Track B |
| JSON payload size for large BPs | High | Medium | LRU caching + summary mode. Only cache key returned to Claude. | Track A |

### Phase 3 Risks

| Risk | Severity | Probability | Mitigation | Owner |
|------|----------|-------------|------------|-------|
| LLM generates invalid Slate C++ | High | Very High | Pre-validation + RAG templates. Catches ~60% of errors before compile. | Track A |
| Live Coding is Windows-only | High | Certain | Documented. Fallback to `UnrealBuildTool` on macOS/Linux. | Track B |
| Live Coding blocks GameThread | High | Medium | Verify empirically. If blocks, wrap in `Async(EAsyncExecution::ThreadPool)`. | Track B |
| Compile log format varies by UE version | Medium | Medium | Configurable regex patterns. Test against UE 5.3/5.4/5.5 samples. | Track B |

### Phase 4 Risks

| Risk | Severity | Probability | Mitigation | Owner |
|------|----------|-------------|------------|-------|
| Self-healing infinite retry | Critical | Medium | Hard cap at 3 retries. Report to user after failure. | Track A |
| Context window exhaustion | High | High | Micro-tools via RAG. Summary serialization. Stateful caching. | Track A |
| RAG returns irrelevant tools | Medium | Medium | Start with small curated set. Keyword matching before semantic search. | Track A |

---

## 11. Dependency Graph

```
PHASE 1: Communication Infrastructure
========================================

1.1 Scaffolding ──────────────────────────────────────────┐
  |                                                        |
  |-- 1.2 Architecture Docs (parallel, no code dep)       |
  |                                                        |
  |-- 1.3 Types & Codec ──────────────┐                   |
  |     |                              |                   |
  |     |-- 1.4 MCP Skeleton ─────────┤                   |
  |          |                         |                   |
  |          |-- 1.5 WS Bridge ───────┤                   |
  |                                    |                   |
  |-- 1.6 UE Plugin & WS Client ──────┤  (PARALLEL w/ A)  |
  |                                    |                   |
  +-------- 1.7 E2E Ping/Pong ────────┤  (INTEGRATION)    |
            |                          |                   |
            `-- 1.8 Editor Tools ──────┘                   |
                                                           |
PHASE 2: Blueprint Engine                                  |
========================================                   |
                                                           |
2.1 Schema Design ──── (CAN START DURING PHASE 1) ───────┤
  |                                                        |
  `-- 2.2 BP Serializer (C++) ────────────────────────────┤
        |                                                  |
        `-- 2.3 Node Spawn + Pin Connect (C++) ───────────┤
              |                                            |
              `-- 2.4 BP MCP Tools + Cache (TS) ──────────┘

PHASE 3: Slate UI + Live Coding
========================================

3.1 RAG System ──── (CAN START DURING PHASE 2) ──────────┐
  |                                                        |
  `-- 3.2 Slate Generation Tool ──────────────────────────┤
                                                           |
3.3 File Ops + Safety ──── (depends on 1.7) ──────────────┤
                                                           |
3.4 Live Coding Controller (C++) ──── (depends on 1.6) ──┤
  |                                                        |
  `-- 3.5 Compilation MCP Tools ──────────────────────────┘

PHASE 4: Autonomy & Optimization
========================================

4.1 Self-Healing Loop ──── (depends on 3.3, 3.5) ────────┐
                                                           |
4.2 Observability ──── (depends on 1.4) ──────────────────┤
                                                           |
4.3 Micro-Tools ──── (depends on 3.1) ───────────────────┤
                                                           |
4.4 Safety System Full ──── (depends on 3.3) ─────────────┤
                                                           |
4.5 Chat Panel ──── (depends on 4.1, 4.2, 4.3, 4.4) ────┘
     (LOWEST PRIORITY)
```

---

## 12. Parallelization Strategy

### Two-Track Development Plan

**Track A: Node.js/TypeScript Developer**
Owns the MCP server, tool handlers, RAG system, caching, safety logic, observability.

**Track B: C++/UE Developer**
Owns the UE plugin, WebSocket client, Blueprint serializer/manipulator, Live Coding, Slate dialogs.

### Week-by-Week Plan

| Week | Track A (TypeScript) | Track B (C++) | Integration |
|------|---------------------|---------------|-------------|
| **1** | 1.1 Scaffolding, 1.3 Types & Codec | 1.1 Scaffolding, 1.2 ADR Docs | -- |
| **2** | 1.4 MCP Skeleton, 1.5 WS Bridge | 1.6 UE Plugin & WS Client | -- |
| **3** | 1.8 Editor Tools (TS side) | 1.8 Editor Tools (C++ side) | 1.7 E2E Ping/Pong |
| **4** | 2.1 Schema Design, 2.4 Cache | 2.2 BP Serializer | Phase 1 stabilization |
| **5-6** | 2.4 BP MCP Tools | 2.2 cont'd, 2.3 Node Spawn | -- |
| **7** | 2.4 cont'd, integration | 2.3 Pin Connection | Phase 2 integration |
| **8** | 3.1 RAG System | 3.4 Live Coding Controller | Phase 2 stabilization |
| **9** | 3.2 Slate Generation, 3.3 File Ops | 3.4 cont'd (Log Parser) | -- |
| **10** | 3.5 Compilation Tools | Integration testing | Phase 3 integration |
| **11** | 4.2 Observability, 4.3 Micro-Tools | 4.4 Safety Dialogs | -- |
| **12** | 4.1 Self-Healing Loop | 4.5 Chat Panel | Phase 4 integration |

### Critical Path

The critical path runs through:
```
1.1 -> 1.6 -> 2.2 -> 2.3 -> 2.4 -> 3.4 -> 3.5 -> 4.1
(Scaffolding -> UE Plugin -> BP Serializer -> BP Manipulator -> BP Tools -> Live Coding -> Compile Tools -> Self-Healing)
```

This is ~10 weeks on the critical path. Parallelization compresses total calendar time from ~16 weeks sequential to ~12 weeks.

---

## 13. Definition of Done -- Per Phase

### Phase 1: Communication Infrastructure
- [ ] MCP server discoverable by Claude Code (`.claude/mcp.json`)
- [ ] UE plugin loads in editor without errors
- [ ] WebSocket connection established (UE client -> Node.js server)
- [ ] `editor.ping` E2E roundtrip works
- [ ] `editor.getLevelInfo`, `editor.listActors`, `editor.getAssetInfo` functional
- [ ] All Vitest unit + integration tests pass
- [ ] All UE automation tests pass
- [ ] `tsc --noEmit` exits 0
- [ ] ARCHITECTURE.md and protocol schemas accurate

### Phase 2: Blueprint Serialization & Manipulation
- [ ] Blueprint AST JSON Schema finalized with test fixtures
- [ ] C++ serializer outputs schema-conformant JSON for EventGraph
- [ ] C++ manipulator spawns nodes with `FKismetEditorUtilities`
- [ ] Pin connections via `TryCreateConnection` (not raw MakeLinkTo)
- [ ] 5 MCP tools: serialize, createNode, connectPins, modifyProperty, deleteNode
- [ ] LRU caching prevents token waste
- [ ] All Vitest tests pass
- [ ] All UE automation tests pass

### Phase 3: Slate UI + Live Coding
- [ ] 7 Slate templates in RAG with >0.8 relevance accuracy
- [ ] Slate pre-validation catches common LLM errors
- [ ] File operations with human-in-the-loop safety gate
- [ ] Live Coding triggered programmatically (Windows, fallback documented)
- [ ] Compile log parser handles MSVC/Clang formats
- [ ] 3 compilation tools: trigger, getStatus, getErrors
- [ ] All Vitest and UE automation tests pass

### Phase 4: Agent Autonomy & Optimization
- [ ] Self-healing compile loop with 3-retry cap
- [ ] OpenTelemetry tracing for every tool call
- [ ] Dynamic tool registry scales to 30+ tools via RAG
- [ ] In-editor approval dialog for destructive operations
- [ ] In-editor chat panel (stretch goal)
- [ ] All tests pass across all layers

### Project-Wide DoD
- [ ] Zero `tsc --noEmit` errors
- [ ] Zero UE compilation warnings from plugin code
- [ ] All AGENTS.md files up-to-date
- [ ] README has verified setup instructions
- [ ] ARCHITECTURE.md matches implementation

---

## 14. Technology Stack Details

### MCP Server (Node.js/TypeScript)

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | `^1.12.0` (pin exact) | MCP server SDK |
| `zod` | `^3.24.0` | Runtime type validation |
| `ws` | `^8.18.0` | WebSocket server |
| `uuid` | `^11.0.0` | UUID v4 generation for message IDs |
| `@xenova/transformers` | `^2.17.0` | Local embeddings for RAG |
| `vitest` | `^3.0.0` (dev) | Test runner |
| `typescript` | `^5.7.0` (dev) | TypeScript compiler |
| `@types/ws` | `^8.5.0` (dev) | WS type definitions |
| `@types/uuid` | `^10.0.0` (dev) | UUID type definitions |

**tsconfig.json key settings:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### UE Plugin (C++)

| Module | Purpose | When Needed |
|--------|---------|-------------|
| `Core` | UE core types | Always |
| `CoreUObject` | UObject system | Always |
| `Engine` | Engine fundamentals | Always |
| `WebSockets` | `FWebSocketsModule` client | Phase 1 |
| `Json` | `FJsonObject`, `FJsonSerializer` | Phase 1 |
| `JsonUtilities` | `FJsonObjectConverter` | Phase 1 |
| `Sockets` | TCP socket support | Phase 1 |
| `Networking` | Network utilities | Phase 1 |
| `UnrealEd` | Editor APIs, `GEditor` | Phase 1 (Editor-only) |
| `BlueprintGraph` | `UEdGraphSchema_K2` | Phase 2 |
| `KismetCompiler` | `FKismetEditorUtilities` | Phase 2 |
| `Kismet` | Blueprint editor utilities | Phase 2 |
| `EditorSubsystem` | `UEditorSubsystem` base | Phase 1 |
| `Slate` | Slate UI framework | Phase 4 |
| `SlateCore` | Slate core types | Phase 4 |
| `WebBrowser` | In-editor web panel | Phase 4 |

**Target UE Version:** 5.4 or 5.5 (pin one version, document compatibility)

**Plugin Descriptor (.uplugin):**
```json
{
  "FileVersion": 3,
  "Version": 1,
  "VersionName": "0.1.0",
  "FriendlyName": "Unreal Master Agent",
  "Description": "Autonomous AI agent for UE via MCP",
  "Category": "Editor",
  "CreatedBy": "Unreal Master",
  "CanContainContent": true,
  "Modules": [
    {
      "Name": "UnrealMasterAgent",
      "Type": "Editor",
      "LoadingPhase": "Default"
    },
    {
      "Name": "UnrealMasterAgentTests",
      "Type": "Editor",
      "LoadingPhase": "Default"
    }
  ]
}
```

### WebSocket Configuration

| Parameter | Value | Configurable |
|-----------|-------|-------------|
| Server Port | 9877 | `UE_WS_PORT` env var |
| Heartbeat Interval | 10 seconds | Yes |
| Request Timeout | 30 seconds | Yes |
| Reconnection Backoff | 1s, 2s, 4s, 8s, max 30s | Yes |
| Max Concurrent Requests | 10 | Yes |

### Observability

| Tool | Purpose | Phase |
|------|---------|-------|
| LangSmith or Langfuse | Trace collection | Phase 4 |
| OpenTelemetry (SDK) | Span emission format | Phase 4 |
| Custom metrics | Tool call stats | Phase 4 |

---

## 15. Commit Strategy

### Commit Conventions

Format: `<type>(<scope>): <description>`

| Type | When |
|------|------|
| `feat` | New feature or capability |
| `test` | Test-only changes |
| `fix` | Bug fixes |
| `docs` | Documentation changes |
| `refactor` | Code restructuring without behavior change |
| `chore` | Build, config, tooling changes |

**Scope values:** `mcp`, `ue`, `docs`, `scripts`, `schema`

### Commit Points (per task)

Each task in this plan produces exactly ONE commit (test + implementation together, since TDD is the methodology). The commit message format is specified in each task section above.

### Phase-End Tags

| Tag | Description |
|-----|-------------|
| `v0.1.0-phase1` | Communication infrastructure complete |
| `v0.2.0-phase2` | Blueprint engine complete |
| `v0.3.0-phase3` | Slate UI + Live Coding complete |
| `v1.0.0` | Full autonomy -- production ready |

---

## 16. Success Criteria (Project-Level)

### Functional Requirements Met
- [ ] Claude can query UE editor state (level, actors, assets)
- [ ] Claude can read Blueprint structure as JSON
- [ ] Claude can create nodes and connect pins in Blueprints
- [ ] Claude can generate Slate UI C++ code with RAG assistance
- [ ] Claude can trigger Live Coding and read compile results
- [ ] Claude can autonomously fix compile errors (up to 3 retries)
- [ ] Destructive operations require human approval

### Non-Functional Requirements Met
- [ ] All tool calls complete in <5 seconds (excluding compilation)
- [ ] WebSocket reconnection within 30 seconds of drop
- [ ] Zero stdout pollution from MCP server
- [ ] Plugin loads without editor warnings
- [ ] Memory-safe: no leaks in LRU cache or WS connection pool

### Quality Metrics
- [ ] 80%+ test coverage on MCP server (Vitest)
- [ ] All UE automation tests pass reliably
- [ ] Documentation is accurate and up-to-date
- [ ] Zero known critical bugs at each phase completion

---

*This plan drives implementation via ralph-loop. Each task is self-contained with exact files, tests, and acceptance criteria. Track A (TypeScript) and Track B (C++) can proceed in parallel. Integration points are clearly marked.*
