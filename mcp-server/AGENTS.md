<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-25 | Updated: 2026-03-06 -->

# MCP Bridge Server (Layer 2)

## Purpose

Node.js/TypeScript MCP bridge. Translates Claude Code's MCP tool calls into
WebSocket requests to the UE plugin. Node.js is the WebSocket SERVER; UE connects
as CLIENT.

## Key Files

| File | Description |
|------|-------------|
| `src/index.ts` | Entry point — creates `McpServer`, binds `StdioServerTransport` |
| `src/server.ts` | Registers all 173 MCP tools across 37 domains |
| `src/transport/websocket-bridge.ts` | WS server, pending-request correlation map |
| `src/transport/message-codec.ts` | Encode/decode with Zod validation |
| `src/transport/connection-manager.ts` | Exponential backoff reconnection |
| `src/state/safety.ts` | `classifyOperation()`, `isPathSafe()`, `ApprovalGate` |
| `src/state/session.ts` | `SessionManager` — retry counts, compile history |
| `src/state/cache-store.ts` | LRU cache — 1000 entries, 60s TTL |
| `src/tools/` | 173 tool handlers across 37 domains: editor, blueprint, compilation, file, slate, chat, actor, material, mesh, level, asset, animation, content, datatable, build, project, gameplay, python, sourcecontrol, debug, sequencer, ai, widget, texture, niagara, audio, landscape, physics, worldpartition, foliage, curve, pcg, geoscript, workflow, analyze, refactor, context |
| `src/rag/` | `EmbeddingStore`, `SlateTemplateLoader`, `SemanticSearch` |
| `src/observability/` | `logger.ts`, `tracer.ts`, `metrics.ts` |
| `tests/` | Vitest tests — `tests/unit/**` and `tests/integration/**` |

## Test Commands

```bash
cd mcp-server

npm test                    # run all tests (765 tests, 52 files)
npm run test:watch          # watch mode
npm run test:coverage       # with coverage report
npm run typecheck           # TypeScript type check only
```

Test files live at `tests/unit/<domain>/<file>.test.ts`
and `tests/integration/<file>.test.ts`.

### Development Guides (`docs/`)

| File | Description |
|------|-------------|
| `docs/DEFERRED-FEATURES-GUIDE.md` | Implementation guide for US-021, US-022, US-023 with status tracking |
| `docs/TEST-VERIFICATION-GUIDE.md` | Step-by-step TypeScript test verification walkthrough |
| `docs/UE-EDITOR-VERIFICATION-GUIDE.md` | UE Editor manual testing guide for C++ compilation and visual verification |

## For AI Agents

### stdout / stderr Rule

NEVER use `console.log()`. All logging goes through the `Logger` instance
which writes to `stderr`. A single `console.log()` corrupts the JSON-RPC stream.

### ApprovalGate Usage

```typescript
const gate = new ApprovalGate(60000, bridge);  // production: pass bridge
const gate = new ApprovalGate(100);             // tests: no bridge, short timeout
gate.setAutoResponse('approve');               // test: bypass WS round-trip
```

### Adding a New MCP Tool

1. Create `src/tools/<domain>/<tool-name>.ts`
2. Write tests in `tests/unit/tools/<domain>.test.ts`
3. Register in `src/server.ts` with `server.tool()`
4. Register a corresponding C++ handler in `UnrealMasterAgent.cpp::StartupModule()`
5. Commit: `feat: add <tool-name> MCP tool (TDD)`

### WS Request Pattern

```typescript
const response = await bridge.sendRequest({
  id: uuidv4(),
  method: 'editor.ping',
  params: {},
  timestamp: Date.now(),
});
if (response.error) { /* handle */ }
const data = response.result;
```

<!-- MANUAL: -->
