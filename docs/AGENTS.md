<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-25 | Updated: 2026-03-06 -->

# Documentation and RAG Knowledge Base

## Purpose

Project documentation, JSON schemas, Slate UI templates for RAG, and reference
guides covering the full Unreal Master Agent system.

## Key Files

### Documentation

| File | Description |
|------|-------------|
| `setup-guide.md` | Installation, configuration, and quickstart guide |
| `websocket-protocol.md` | WebSocket protocol specification (message format, error codes, threading) |
| `safety-architecture.md` | Safety system: operation classification, approval gate, self-healing |
| `api-reference/mcp-tools.md` | Complete API reference for all 183 MCP tools across 37 domains |
| `coding-conventions/README.md` | TypeScript + C++ coding conventions and style guide |
| `AGENTS.md` | This file — AI agent guidance for documentation |
| `FULL-UE-PYTHON-API-ENHANCEMENT-PLAN.md` | Python API enhancement plan (183 tools implemented) |

### JSON Schemas

| File | Description |
|------|-------------|
| `schemas/ws-protocol.schema.json` | WebSocket message/response envelope schema (JSON Schema draft-07) |
| `schemas/blueprint-ast.schema.json` | Blueprint JSON AST schema |
| `schemas/tool-manifest.schema.json` | MCP tool manifest schema |

### Slate RAG Templates

| File | Description |
|------|-------------|
| `slate-templates/base-widget.md` | Base SCompoundWidget template |
| `slate-templates/list-view.md` | SListView with item row generation |
| `slate-templates/tree-view.md` | STreeView with expansion |
| `slate-templates/dialog-window.md` | Modal dialog with SWindow |
| `slate-templates/input-field.md` | Text input field widget |
| `slate-templates/tab-widget.md` | Dockable SDockTab via FGlobalTabmanager |
| `slate-templates/progress-bar.md` | Progress bar widget |

> **Note:** The MCP server loads templates from `mcp-server/docs/slate-templates/` (a separate directory with its own set of templates including `details-panel.md`, `toolbar.md`, `dialog.md`). The `docs/slate-templates/` directory here serves as the RAG knowledge base source.

## For AI Agents

### Schema Validation

The TypeScript side validates all WS messages against `ws-protocol.schema.json`
using Zod schemas in `mcp-server/src/types/ws-protocol.ts`. Any protocol change
must update BOTH the JSON schema and the Zod schema.

### Slate Template Format

Each template is a Markdown file with three sections:
- `## Usage` — when to apply this pattern
- `## Code` — copy-paste ready C++ snippet
- `## Keywords` — search terms for the RAG embedding store

To add a template: create `docs/slate-templates/<name>.md` following the same
structure. The `SlateTemplateLoader` in `mcp-server/src/rag/slate-templates.ts`
picks up all `.md` files in this directory automatically.

### Accessing Templates via MCP

```
slate-listTemplates    — list all template names
slate-generate         — semantic search + return relevant templates
slate-validate         — validate Slate C++ for common errors
```

### Documentation Map

For detailed information, refer to:
- **API usage** → `api-reference/mcp-tools.md`
- **Protocol details** → `websocket-protocol.md`
- **Safety rules** → `safety-architecture.md`
- **Code style** → `coding-conventions/README.md`
- **Setup** → `setup-guide.md`

<!-- MANUAL: -->
