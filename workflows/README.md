# Unreal Master Agent — Community Workflows

Shareable workflow templates for common Unreal Engine tasks. Each workflow defines a sequence of MCP tool calls that accomplish a specific goal.

## Format

Workflow files use the standardized **Workflow Share Format** (v1):

```json
{
  "version": 1,
  "workflow": {
    "id": "unique-workflow-id",
    "name": "Human-Readable Name",
    "description": "What this workflow accomplishes",
    "domain": "blueprint|material|level|character|animation|niagara|audio|landscape|physics|gameplay",
    "difficulty": "beginner|intermediate|advanced",
    "intentPatterns": ["natural language trigger phrases"],
    "prerequisites": ["what must be true before starting"],
    "steps": [
      { "tool": "mcp-tool-name", "purpose": "why this step" }
    ],
    "expectedOutcome": "what the developer gets",
    "source": "community",
    "tags": ["searchable", "tags"]
  },
  "author": {
    "name": "Your Name",
    "url": "https://github.com/yourname"
  },
  "readme": "Optional longer description with usage notes",
  "createdAt": "2026-03-12T00:00:00.000Z"
}
```

## Installing a Workflow

**Via CLI:**
```bash
npx unreal-master-mcp-server import-workflow workflows/niagara-rain-system.json
```

**Via MCP tool:**
```
context-importWorkflow { workflow: <paste JSON> }
```

**From URL:**
```bash
npx unreal-master-mcp-server import-workflow https://raw.githubusercontent.com/jaguarcode/UnrealMasterAI/main/workflows/niagara-rain-system.json
```

## Contributing a Workflow

1. Create a JSON file following the format above
2. Use a descriptive `id` prefixed with the domain (e.g., `mat-pbr-weathered`)
3. Include at least 3 `intentPatterns` — these are how the AI matches user requests to your workflow
4. Every `step.tool` must be a valid MCP tool name (see `context-getManifest` for the full list)
5. Submit a PR adding your file to this directory

## Validation

All workflows in this directory are validated in CI. To check yours locally:

```bash
npx unreal-master-mcp-server import-workflow your-workflow.json
```

If it imports without error, the format is valid.
