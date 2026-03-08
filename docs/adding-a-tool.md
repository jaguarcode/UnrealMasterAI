# How to Add a New MCP Tool

This guide walks you through adding a new tool to Unreal Master Agent, from Python script to registered MCP tool with tests.

## Overview

Each tool in Unreal Master Agent has three parts:

1. **Python script** (`ue-plugin/Content/Python/uma/`) — Executes UE operations
2. **TypeScript handler** (`mcp-server/src/tools/<domain>/`) — MCP interface with Zod schema
3. **Registration** (`mcp-server/src/server.ts`) — Registers the tool with the MCP server

## Step 1: Create the Python Script

Create a new file in `ue-plugin/Content/Python/uma/`. Follow the naming convention: `domain_action.py` (e.g., `actor_spawn.py`, `material_create.py`).

### Template

```python
import unreal
from uma.utils import execute_wrapper, make_result, make_error, validate_path

@execute_wrapper
def execute(params):
    """Brief description of what this tool does."""
    # 1. Extract and validate parameters
    name = params.get('name', '')
    if not name:
        return make_error('INVALID_PARAMS', 'name is required')

    # 2. Validate any asset/file paths
    asset_path = params.get('assetPath', '')
    if asset_path and not validate_path(asset_path):
        return make_error('INVALID_PATH', f'Invalid asset path: {asset_path}')

    # 3. Perform UE operations
    # All code here runs on the GameThread (handled by @execute_wrapper)
    result_data = {}

    # Example: Find an actor
    # actors = unreal.EditorLevelLibrary.get_all_level_actors()

    # 4. Return result
    return make_result({
        'success': True,
        'data': result_data
    })
```

### Key Rules

- **Always** use the `@execute_wrapper` decorator
- **Always** name the function `execute` with a `params` dict argument
- **Always** return `make_result(data)` or `make_error(code, message)`
- **Always** use `validate_path()` for asset/file path inputs
- **Never** import modules conditionally or use try/except for imports
- The decorator handles GameThread dispatch, error catching, and JSON serialization

## Step 2: Create the TypeScript Handler

Create a file in `mcp-server/src/tools/<domain>/`. Match the Python script name but use kebab-case: `actor-spawn.ts`, `material-create.ts`.

### Template

```typescript
import { z } from 'zod';
import type { Logger } from '../../observability/logger.js';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

// Define the input schema
const schema = z.object({
  name: z.string().describe('Name of the target'),
  assetPath: z.string().optional().describe('Path to the asset'),
});

type Params = z.infer<typeof schema>;

export const myToolName = {
  name: 'domain-action',
  schema,
  handler: async (params: Params, bridge: WebSocketBridge, logger: Logger) => {
    const result = await bridge.sendRequest('domain.action', params);
    return result;
  },
};
```

### Naming Conventions

- Tool name: `domain-action` (kebab-case)
- Python script: `domain_action.py` (snake_case)
- TypeScript file: `domain-action.ts` (kebab-case, matches tool name)
- Export name: `domainAction` (camelCase)

## Step 3: Register in server.ts

Open `mcp-server/src/server.ts` and:

1. Add the import at the top with the other tool imports:
   ```typescript
   import { myToolName } from './tools/domain/action.js';
   ```

2. Register the tool in the `createServer()` function alongside similar domain tools:
   ```typescript
   mcpServer.tool(
     myToolName.name,
     'Description of what this tool does',
     myToolName.schema.shape,
     async (params) => {
       const result = await myToolName.handler(params, bridge, logger);
       return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
     }
   );
   ```

## Step 4: Safety Classification

Open `mcp-server/src/state/safety.ts` and add your tool to the appropriate set:

| Classification | When to Use | Example |
|---------------|-------------|---------|
| `SAFE_TOOLS` | Read-only, no side effects | `editor-ping`, `content-listAssets`, `mesh-getInfo` |
| `WARN_TOOLS` | Modifies state, reversible | `actor-setProperty`, `material-setParameter` |
| `DANGEROUS_TOOLS` | Destructive, requires approval | `actor-delete`, `asset-delete`, `level-save` |

```typescript
// In safety.ts, add to the appropriate Set:
const WARN_TOOLS = new Set([
  // ... existing tools
  'domain-action',  // Add your tool here
]);
```

## Step 5: Write Tests

Create a test file in `mcp-server/tests/unit/tools/<domain>/`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myToolName } from '../../../../src/tools/domain/action.js';

describe('domain-action', () => {
  it('should have correct name', () => {
    expect(myToolName.name).toBe('domain-action');
  });

  it('should validate required parameters', () => {
    const result = myToolName.schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept valid parameters', () => {
    const result = myToolName.schema.safeParse({ name: 'test' });
    expect(result.success).toBe(true);
  });

  it('should call bridge with correct method', async () => {
    const mockBridge = {
      sendRequest: vi.fn().mockResolvedValue({ success: true }),
    };
    const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };

    await myToolName.handler({ name: 'test' }, mockBridge as any, mockLogger as any);

    expect(mockBridge.sendRequest).toHaveBeenCalledWith('domain.action', { name: 'test' });
  });
});
```

## Step 6: Update Documentation

1. Add the tool to `docs/api-reference/mcp-tools.md`
2. Update tool count in README badges if needed
3. If it's a new domain, add it to the domain list in ARCHITECTURE.md

## Directory Structure Reference

```
mcp-server/
├── src/
│   ├── server.ts                    # Tool registration
│   ├── state/
│   │   └── safety.ts                # Safety classification
│   └── tools/
│       ├── actor/                   # Actor domain tools
│       ├── asset/                   # Asset domain tools
│       ├── blueprint/               # Blueprint domain tools
│       ├── material/                # Material domain tools
│       └── <your-domain>/           # Your new domain
├── tests/
│   └── unit/
│       └── tools/
│           └── <your-domain>/       # Your tests
ue-plugin/
└── Content/
    └── Python/
        └── uma/
            └── your_tool.py         # Your Python script
```

## Checklist

Before submitting your PR:

- [ ] Python script uses `@execute_wrapper` pattern
- [ ] Python script uses `validate_path()` for path inputs
- [ ] TypeScript handler has Zod schema with `.describe()` on all fields
- [ ] Tool registered in `server.ts`
- [ ] Safety classification added in `safety.ts`
- [ ] Tests written and passing
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
