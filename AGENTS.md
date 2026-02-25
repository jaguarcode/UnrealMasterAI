<!-- Generated: 2026-02-25 | Updated: 2026-02-26 -->

# Unreal Master — Root

## Purpose

Autonomous AI agent that gives Claude Code bidirectional control over Unreal Engine
internals. 4-layer architecture: Claude Code → MCP Bridge Server (Node.js/TS) →
UE Agent Plugin (C++) → Engine APIs (UEdGraph, Slate, ILiveCodingModule).

## Repository Layout

| Path | Layer | Description |
|------|-------|-------------|
| `mcp-server/` | Layer 2 | Node.js/TypeScript MCP bridge server (227 tests passing) |
| `ue-plugin/` | Layer 3 | C++ Unreal Engine plugin |
| `docs/` | — | Schemas, Slate RAG templates, API reference |
| `README.md` | — | Setup instructions and development workflow |
| `PRD.md` | — | Product Requirements Document (Korean) |

## Key Technical Constraints

1. **GameThread-only UE APIs.** Every UE editor API call MUST be dispatched via
   `AsyncTask(ENamedThreads::GameThread, ...)`. WebSocket callbacks run on a
   background thread. Violating this rule causes crashes and data corruption.

2. **stdout is sacred.** The MCP server communicates with Claude Code over stdout
   via JSON-RPC. `console.log()` in server code corrupts the stream. All logging
   goes to `stderr`.

3. **TryCreateConnection, never MakeLinkTo.** For Blueprint pin connection, always
   use `UEdGraphSchema_K2::TryCreateConnection()`. `MakeLinkTo` bypasses schema
   validation and corrupts Blueprint graphs.

4. **UE is the WebSocket CLIENT.** Node.js listens; UE connects. This uses UE's
   stable `FWebSocketsModule` client.

## For AI Agents

### TDD Workflow

All code changes start with failing tests.

- **TS tests:** `cd mcp-server && npm test` (Vitest)
- **C++ tests:** UE Automation Framework via `-ExecCmds="Automation RunTests ..."`
- **Commit format:** `feat: [description] (TDD)`

### Error Code Taxonomy

| Range | Category |
|-------|---------|
| 1000–1099 | Connection / WebSocket |
| 2000–2099 | Handler routing (unknown method = 2001) |
| 3000–3099 | Parameter validation |
| 4000–4099 | Blueprint operations |
| 5000–5099 | Internal / serialization |
| 6000–6099 | Safety gate |

### WS Message Envelope

Request (MCP → UE):
```json
{ "id": "<uuid>", "method": "blueprint.serialize",
  "params": { "blueprintPath": "/Game/BP_Test" }, "timestamp": 1740441600000 }
```

Response (UE → MCP):
```json
{ "id": "<uuid>", "result": { ... }, "duration_ms": 42 }
```

### MCP Tools (20 registered)

| Domain | Tools |
|--------|-------|
| Editor | `editor-ping`, `editor-getLevelInfo`, `editor-listActors`, `editor-getAssetInfo` |
| Blueprint | `blueprint-serialize`, `blueprint-createNode`, `blueprint-connectPins`, `blueprint-modifyProperty`, `blueprint-deleteNode` |
| Compilation | `compilation-trigger`, `compilation-getStatus`, `compilation-getErrors`, `compilation-selfHeal` |
| File | `file-read`, `file-write`, `file-search` |
| Slate | `slate-validate`, `slate-generate`, `slate-listTemplates` |
| Chat | `chat-sendMessage` |

### Subdirectory AGENTS.md

| File | Purpose |
|------|---------|
| `mcp-server/AGENTS.md` | MCP Bridge Server docs |
| `ue-plugin/AGENTS.md` | UE Plugin docs |
| `docs/AGENTS.md` | RAG knowledge base docs |

<!-- MANUAL: Custom project notes can be added below -->
