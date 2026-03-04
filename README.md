# Unreal Master Agent

An autonomous AI agent that gives Claude Code bidirectional control over Unreal Engine internals — manipulating Blueprints at the graph level, generating Slate UI code, triggering Live Coding compilation, and self-healing from compile errors without manual intervention.

---

## What This Does

You describe what you want in natural language. Claude Code calls the right tools in sequence. Unreal Engine executes the changes in real time.

**Example:**

> "Add a PrintString node to BP_TestActor connected after BeginPlay, set the message to 'Hello World', then compile."

The agent serializes the Blueprint to JSON, creates the node, connects the exec pins, sets the default value, and triggers Live Coding — reporting any compile errors back for self-healing if needed.

**Core capabilities:**

- Blueprint graph serialization (UEdGraph → structured JSON AST)
- Dynamic node creation and pin connection via C++ UE APIs
- Slate UI code generation with RAG-assisted template retrieval
- Live Coding compilation trigger and compile log capture
- Self-healing loop: parse compile errors → apply fix → retry (max 3 iterations)
- Human-in-the-loop approval gate for destructive operations

---

## Architecture Overview

The system uses a 4-layer architecture with clean separation between reasoning, bridging, execution, and engine APIs.

```
Claude Code (Layer 1)
    │ stdio / JSON-RPC
MCP Bridge Server — Node.js/TypeScript (Layer 2)
    │ WebSocket
UE Agent Plugin — C++ (Layer 3)
    │ Direct C++ API calls
Engine APIs: UEdGraph, Slate, ILiveCodingModule (Layer 4)
```

Key design decisions:

- **UE is the WebSocket client** — Node.js listens, UE connects. This uses UE's stable `FWebSocketsModule` client rather than a nonexistent server API.
- **All UE operations run on the GameThread** — WebSocket callbacks dispatch via `AsyncTask(ENamedThreads::GameThread)`.
- **`TryCreateConnection` always, never `MakeLinkTo`** — ensures polymorphic pin type propagation.
- **Self-healing is Claude's responsibility** — the server provides atomic tools; Claude orchestrates retry logic.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full architecture document including data flow diagrams, threading model, safety architecture, and all ADRs.

---

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **TypeScript** 5.5+ (installed via devDependencies)
- **Unreal Engine** 5.4
- **Claude Code** (latest) with MCP support

---

## Quick Start

### 1. Install dependencies

```bash
cd mcp-server
npm install
```

### 2. Configure MCP

Add the server to `.claude/mcp.json` (project root):

```json
{
  "mcpServers": {
    "unreal-master": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "UMA_WS_PORT": "8765"
      }
    }
  }
}
```

### 3. Build the MCP server

```bash
cd mcp-server
npm run build
```

### 4. Enable the UE Plugin

Copy or symlink `UnrealMasterPlugin/` into your Unreal Engine project's `Plugins/` directory, then enable it in the `.uproject` file:

```json
{
  "Plugins": [
    { "Name": "UnrealMasterPlugin", "Enabled": true }
  ]
}
```

Rebuild the project from source.

### 5. Start the agent

Open your Unreal Engine project (the plugin auto-connects to the MCP server on startup), then launch Claude Code in the project root. The MCP server starts automatically.

Verify the connection:

```
> editor.ping
```

Expected response: `{ "status": "ok", "ueVersion": "5.4.x" }`

### Development mode (watch + auto-rebuild)

```bash
cd mcp-server
npm run dev
```

---

## Project Structure

```
Unreal Master/
├── ARCHITECTURE.md          Architecture decisions and system design
├── README.md                This file
├── PRD.md                   Product requirements document
├── AGENTS.md                AI agent guidance for this codebase
├── package.json             Workspace root
│
├── mcp-server/              Layer 2: Node.js/TypeScript MCP bridge
│   ├── src/
│   │   ├── index.ts         Entry point (McpServerBootstrap)
│   │   ├── server.ts        McpServer configuration
│   │   ├── tools/           MCP tool definitions
│   │   │   ├── editor/      Editor query tools (ping, list-actors, etc.)
│   │   │   ├── blueprint/   Blueprint manipulation tools
│   │   │   ├── compilation/ Compile trigger and status tools
│   │   │   ├── file/        File operation tools
│   │   │   ├── slate/       Slate UI generation tools
│   │   │   └── chat/        In-editor chat tools
│   │   ├── transport/       WebSocket bridge and codec
│   │   ├── state/           Cache store and safety gate
│   │   └── observability/   Tracing (LangSmith/Langfuse)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── tests/             Test suites
│   └── docs/              Development guides
│       ├── DEFERRED-FEATURES-GUIDE.md
│       ├── TEST-VERIFICATION-GUIDE.md
│       └── UE-EDITOR-VERIFICATION-GUIDE.md
│
├── ue-plugin/               Layer 3: C++ UE plugin (implemented)
│   └── Source/
│       ├── UnrealMasterAgent/        Main module (17 handlers registered)
│       │   ├── Safety/               UMAApprovalGate
│       │   ├── FileOps/              UMAFileOperations
│       │   └── Editor/               UMAEditorSubsystem, SUMAChatPanel
│       └── UnrealMasterAgentTests/   Automation test module
│
└── docs/
    └── schemas/
        ├── ws-protocol.schema.json    WebSocket message envelope schema
        ├── blueprint-ast.schema.json  Blueprint JSON AST schema
        └── tool-manifest.schema.json  MCP tool manifest schema
```

---

## Development Workflow

### Two-Track Development

Work proceeds on two parallel tracks that integrate at milestones:

| Track | Focus | Primary Language |
|-------|-------|-----------------|
| Track A | MCP Bridge Server | TypeScript |
| Track B | UE Agent Plugin | C++ |

Both tracks use TDD from the start.

### MCP Server Development

```bash
# Run tests
cd mcp-server && npm test

# Run tests in watch mode
cd mcp-server && npm run test:watch

# Type check
cd mcp-server && npm run typecheck

# Lint
cd mcp-server && npm run lint
```

Test files live at `tests/unit/**/*.test.ts` and `tests/integration/**/*.test.ts`.

### UE Plugin Testing

Run automation tests headlessly:

```bash
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMaster" \
  -unattended -nopause -nullrhi
```

### stdout / stderr Discipline

The MCP Bridge Server communicates with Claude Code over `stdout` using JSON-RPC. **Never use `console.log()`** in the server — it will corrupt the stream. All debug output must go to `stderr` via `process.stderr.write()` or a logger configured to use `stderr`.

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| LLM Host | Claude Code (Sonnet / Opus) | Latest |
| MCP SDK | `@modelcontextprotocol/sdk` | ^1.12.0 |
| Bridge Server | Node.js + TypeScript | Node 20+, TS 5.5+ |
| WebSocket | `ws` | ^8.18.0 |
| Validation | `zod` | ^3.23.0 |
| Test Runner | `vitest` | ^2.0.0 |
| UE Plugin | C++ | UE 5.4 |
| Transport | WebSocket | RFC 6455 |
| Observability | LangSmith / Langfuse | Latest |

---

## Phase Roadmap

| Phase | Goal | Key Deliverables |
|-------|------|-----------------|
| Phase 0 | Foundation | Project scaffold, schemas, architecture docs |
| Phase 1 | Core Communication | WS bridge, UE plugin skeleton, `editor.ping` |
| Phase 2 | Blueprint Read | `blueprint.serialize` with full AST JSON |
| Phase 3 | Blueprint Write | Node creation, pin connection, property mutation |
| Phase 4 | Compilation | Live Coding trigger, compile log capture |
| Phase 5 | Self-Healing | Error parse, fix apply, retry loop |
| Phase 6 | Slate Generation | Template RAG, code generation, validation |
| Phase 7 | Safety + Observability | Human-in-the-loop gate, LangSmith integration |
| Phase 8 | Polish | Performance, caching, documentation |

---

## Deferred Features

The following user stories are documented but not yet fully verified without a UE Editor.
See `mcp-server/docs/DEFERRED-FEATURES-GUIDE.md` for the full implementation guide.

| Story | Feature | Status |
|-------|---------|--------|
| US-021 | Human-in-the-Loop Safety (Slate approval dialog) | Code complete, needs UE testing |
| US-022 | In-Editor Chat Panel (dockable SDockTab) | Code complete, needs UE testing |
| US-023 | Documentation update | Complete |

---

## Contributing

1. All code changes must start with a failing test (TDD).
2. `TryCreateConnection` only — never `MakeLinkTo` in Blueprint manipulation code.
3. Never write to `stdout` in the MCP server — use `stderr` for all logs.
4. Every destructive operation must pass through `SafetyGate`.
5. Run `npm run typecheck && npm test` before committing.
6. Follow the two-track (MCP server / UE plugin) branch strategy.

---

## License

MIT License — see LICENSE file for details.

---

*For the full architecture specification, threading model, data flow diagrams, and all Architecture Decision Records, see [ARCHITECTURE.md](./ARCHITECTURE.md).*
