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
- Actor spawning, deletion, property editing, transform control
- Material creation, parameter setting (scalar/vector), texture assignment
- Level management (create, open, save, sublevels, world settings)
- Asset pipeline (import, export, create, duplicate, rename, delete, references)
- Animation tools (montages, blend spaces, skeleton info)
- Mesh operations (LOD, materials, collision generation)
- DataTable CRUD operations
- Project introspection (structure, plugins, settings, class hierarchy, dependency graph)
- Build pipeline (lightmaps, content cooking, map check)
- Source control integration (status, checkout, diff)
- Gameplay systems (input actions, game mode)
- Python script execution bridge (130+ scripts) for extensible UE automation
- Sequencer/cinematics, AI/navigation, widget/UMG tools
- Texture, Niagara VFX, audio, landscape pipelines
- Physics, world partition, foliage, curves, PCG, geometry script tools
- Workflow templates (character, UI, level, multiplayer, inventory, dialogue)
- Analysis tools (Blueprint complexity, asset health, performance, conventions)
- Context intelligence (auto-gather project context, tool manifest, workflow chains)
- Workflow learning system (learn from Epic docs, intent matching with UE synonym expansion)
- Error resolution learning (capture troubleshooting outcomes, replay fixes for similar errors)
- Outcome-weighted recommendations (proven workflows rank higher automatically)

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
- **Unreal Engine** 5.4 - 5.7
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

Copy or symlink `ue-plugin/` into your Unreal Engine project's `Plugins/` directory (renaming to `UnrealMasterAgent`), then enable it in the `.uproject` file:

```json
{
  "Plugins": [
    { "Name": "UnrealMasterAgent", "Enabled": true }
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
├── AGENTS.md                AI agent guidance for this codebase
├── package.json             Workspace root
│
├── mcp-server/              Layer 2: Node.js/TypeScript MCP bridge
│   ├── src/
│   │   ├── index.ts         Entry point (McpServerBootstrap)
│   │   ├── server.ts        McpServer configuration (183 tools registered)
│   │   ├── tools/           183 MCP tool handlers across 37 domains
│   │   │   ├── editor/      Editor queries (ping, list-actors, etc.)
│   │   │   ├── blueprint/   Blueprint graph manipulation
│   │   │   ├── compilation/ Live Coding trigger and status
│   │   │   ├── file/        File read/write/search
│   │   │   ├── slate/       Slate UI generation
│   │   │   ├── chat/        In-editor chat
│   │   │   ├── actor/       Actor spawn, delete, properties, transform
│   │   │   ├── material/    Material create, parameters, textures
│   │   │   ├── mesh/        Mesh info, LOD, materials, collision
│   │   │   ├── level/       Level create, open, save, sublevels
│   │   │   ├── asset/       Asset import, export, create, duplicate
│   │   │   ├── animation/   Montages, blend spaces, skeleton info
│   │   │   ├── content/     Asset listing, search, details, validation
│   │   │   ├── datatable/   DataTable CRUD operations
│   │   │   ├── build/       Lightmaps, content cooking, map check
│   │   │   ├── project/     Project structure, plugins, settings
│   │   │   ├── gameplay/    Input actions, game mode
│   │   │   ├── python/      Python script execution bridge
│   │   │   ├── sourcecontrol/ Source control status, checkout, diff
│   │   │   ├── debug/       Console commands, logs, performance
│   │   │   ├── sequencer/   Cinematics sequences, tracks, keyframes
│   │   │   ├── ai/          Behavior trees, blackboards, nav mesh, EQS
│   │   │   ├── widget/      UMG widget creation and editing
│   │   │   ├── texture/     Texture import, compression, render targets
│   │   │   ├── niagara/     Niagara VFX systems, emitters, parameters
│   │   │   ├── audio/       Audio import, sound cues, MetaSound
│   │   │   ├── landscape/   Landscape creation, heightmaps, materials
│   │   │   ├── physics/     Physics assets, profiles, constraints
│   │   │   ├── worldpartition/ World partition, data layers, HLOD
│   │   │   ├── foliage/     Foliage types, density, properties
│   │   │   ├── curve/       Curve creation, keyframes
│   │   │   ├── pcg/         PCG graphs, nodes, connections
│   │   │   ├── geoscript/   Geometry script operations
│   │   │   ├── workflow/    Workflow templates (character, UI, level)
│   │   │   ├── analyze/     Blueprint complexity, asset health, perf
│   │   │   ├── refactor/    Rename chain with reference updates
│   │   │   └── context/     Auto-gather, tool manifest, chains, workflow learning, error learning
│   │   ├── transport/       WebSocket bridge and codec
│   │   ├── state/           Cache store and safety gate
│   │   └── observability/   Tracing (LangSmith/Langfuse)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── tests/             Test suites
│   └── docs/              Development guides
│
├── ue-plugin/               Layer 3: C++ UE plugin
│   ├── Content/Python/uma/  Python scripts for UE automation (130+ scripts)
│   └── Source/
│       ├── UnrealMasterAgent/        Main module
│       │   ├── Safety/               UMAApprovalGate
│       │   ├── FileOps/              UMAFileOperations
│       │   ├── Editor/               UMAEditorSubsystem, SUMAChatPanel
│       │   ├── Blueprint/            Serializer, Manipulator
│       │   └── Python/               Python script execution bridge
│       └── UnrealMasterAgentTests/   Automation test module
│
├── TestProject/             UE5 test project for development
│   ├── Source/UMATestProject/  C++ gameplay classes (PatrollingActor, etc.)
│   └── Plugins/UnrealMasterAgent/  Symlinked/copied plugin with Python scripts
│
└── docs/
    ├── api-reference/
    │   └── mcp-tools.md            Complete MCP tool API reference
    ├── coding-conventions/
    │   └── README.md               TypeScript + C++ coding conventions
    ├── slate-templates/            Slate UI RAG templates (7 templates)
    ├── setup-guide.md              Installation and configuration guide
    ├── websocket-protocol.md       WebSocket protocol specification
    ├── safety-architecture.md      Safety system and approval gate docs
    └── AGENTS.md                   AI agent guidance for docs
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

| Phase | Goal | Status |
|-------|------|--------|
| Phase 0 | Foundation — Project scaffold, schemas, architecture docs | Complete |
| Phase 1 | Core Communication — WS bridge, UE plugin skeleton, `editor.ping` | Complete |
| Phase 2 | Blueprint Read — `blueprint.serialize` with full AST JSON | Complete |
| Phase 3 | Blueprint Write — Node creation, pin connection, property mutation | Complete |
| Phase 4 | Compilation — Live Coding trigger, compile log capture | Complete |
| Phase 5 | Self-Healing — Error parse, fix apply, retry loop | Complete |
| Phase 6 | Slate Generation — Template RAG, code generation, validation | Complete |
| Phase 7 | Safety + Observability — Human-in-the-loop gate, tracing | Complete |
| Phase 8 | Polish — Performance, caching, documentation | Complete |
| Phase 9 | Extended Tools — Actor, material, mesh, level, asset, animation, build, project, gameplay, datatable, source control, debug, Python bridge (85 total tools) | Complete |
| Phase 10 | Sequencer, AI/Nav, Widget, Editor Utils (112 tools) | Complete |
| Phase 11 | Texture, Niagara, Audio, Landscape (135 tools) | Complete |
| Phase 12 | Physics, World Partition, Foliage, Curves, PCG, GeoScript (157 tools) | Complete |
| Phase 13 | Workflow Orchestration, Analysis, Refactoring (170 tools) | Complete |
| Phase 14 | Claude Intelligence — Context engine, tool manifest, workflow chains (173 tools) | Complete |
| Phase 15 | Workflow & Error Learning — Persistent workflows, outcome tracking, error resolution learning, UE synonym expansion, docs integration (183 tools) | Complete |

---

### Test Summary

| Layer | Tests | Status |
|-------|-------|--------|
| MCP Server (TypeScript) | 826 tests across 54 files | All passing |
| UE Plugin (C++) | 9 test files | Verified in UE Editor |
| Python Scripts | 130+ scripts in `ue-plugin/Content/Python/uma/` | Verified live |

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
