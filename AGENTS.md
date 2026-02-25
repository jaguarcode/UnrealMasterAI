<!-- Generated: 2026-02-25 | Updated: 2026-02-25 -->

# Unreal Master

## Purpose
Autonomous AI agent development project for Unreal Engine. Builds a "virtual development partner" combining Claude Code and Model Context Protocol (MCP) to bidirectionally communicate with UE's internal API — autonomously handling Blueprint logic generation, C++ Slate UI coding, and Live Coding compilation cycles.

## Key Files

| File | Description |
|------|-------------|
| `PRD.md` | Product Requirements Document (Korean) — defines project scope, 4-layer architecture, technical stack, feature requirements, and 4-phase implementation roadmap |

## Planned Architecture (4 Layers)

| Layer | Technology | Role |
|-------|-----------|------|
| MCP Host | Claude Code (Claude 3.5 Sonnet) | Reasoning engine — interprets queries, decides tool call sequences |
| MCP Client | Built into Claude Code | JSON-RPC communication mediator with external servers |
| MCP Bridge Server | Node.js / TypeScript | stdio-based bridge between Claude Code and UE plugin via WebSockets |
| UE Agent Plugin | C++ (UE 5.x) + Python | Engine-internal state control, Blueprint manipulation, Live Coding triggers |

## Planned Subdirectories

As the project develops, expect these directories to emerge:

| Directory | Purpose |
|-----------|---------|
| `mcp-server/` | Node.js/TypeScript MCP bridge server |
| `ue-plugin/` | Unreal Engine C++ plugin (Blueprint serialization, Slate UI, Live Coding) |
| `docs/` | RAG knowledge base — Slate UI templates, coding conventions, API references |

## For AI Agents

### Working In This Directory
- This project is in early planning stage — only PRD.md exists currently
- PRD is written in Korean; all technical terms use English
- The project follows a 4-phase roadmap (see PRD.md §4)
- Phase 1 focuses on: MCP server setup, UE WebSocket plugin, E2E communication verification

### Key Technical Concepts
- **MCP (Model Context Protocol):** Protocol for LLM ↔ tool communication via JSON-RPC
- **Blueprint AST serialization:** Converting UE Blueprints to JSON for LLM consumption
- **UEdGraphPin:** Low-level C++ API for programmatic Blueprint node/pin manipulation
- **Slate UI:** UE's C++ declarative UI framework (not UMG/Widget Blueprints)
- **Live Coding:** UE's hot-reload compilation via `ILiveCodingModule::Compile()`
- **Self-healing loop:** Auto-detect compile errors → parse logs → LLM fixes code → recompile

### Development Phases
1. **Phase 1:** Communication infrastructure — MCP server (stdio), UE WebSocket plugin, E2E verification
2. **Phase 2:** Blueprint engine — JSON serialization, C++ node spawning/pin linking
3. **Phase 3:** Slate UI + Live Coding — RAG for Slate templates, compile automation
4. **Phase 4:** Autonomy — self-healing loops, micro-tools, in-editor chat panel

### Dependencies

#### External (Planned)
- `@modelcontextprotocol/sdk` — MCP server SDK for Node.js
- Unreal Engine 5.x — Target engine version
- Claude Code / Claude 3.5 Sonnet — LLM inference
- WebSockets — UE ↔ Bridge server communication
- LangSmith / Langfuse — Observability platform for agent tracing

<!-- MANUAL: Custom project notes can be added below -->
