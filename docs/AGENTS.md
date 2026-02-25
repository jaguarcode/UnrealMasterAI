<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-25 | Updated: 2026-02-26 -->

# Documentation and RAG Knowledge Base

## Purpose

Schemas defining the WebSocket protocol and Blueprint AST format. Slate UI widget
templates used by the RAG-based code generation system.

## Key Files

| File | Description |
|------|-------------|
| `schemas/ws-protocol.schema.json` | WebSocket message/response envelope schema (JSON Schema draft-07) |
| `schemas/blueprint-ast.schema.json` | Blueprint JSON AST schema |
| `schemas/tool-manifest.schema.json` | MCP tool manifest schema |
| `slate-templates/base-widget.md` | Base SCompoundWidget template |
| `slate-templates/list-view.md` | SListView with item row generation |
| `slate-templates/tree-view.md` | STreeView with expansion |
| `slate-templates/details-panel.md` | Details/properties panel layout |
| `slate-templates/toolbar.md` | Toolbar with FToolBarBuilder |
| `slate-templates/dialog.md` | Modal dialog with SWindow + GEditor->EditorAddModalWindow() |
| `slate-templates/tab-widget.md` | Dockable SDockTab via FGlobalTabmanager |

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

<!-- MANUAL: -->
