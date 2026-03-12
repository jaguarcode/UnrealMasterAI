# Custom Tools Directory

Drop `.ts` or `.js` files in this directory to register custom MCP tools.

Each file should export a default `ToolModule` or an array of `ToolModule[]`.

## Example

Create a file `my-custom-tool.ts`:

```typescript
import { z } from 'zod';
import type { ToolModule } from '../src/tools/tool-module.js';

const tool: ToolModule = {
  name: 'custom-myTool',
  description: 'My custom tool that does something useful.',
  schema: {
    input: z.string().describe('Input parameter'),
  },
  handler: async (ctx, params) => {
    // ctx.bridge — WebSocket bridge to Unreal Engine
    // ctx.logger — stderr logger
    // ctx.cache — server-side cache
    // params — validated input parameters

    // Example: send a command to UE via bridge
    // const response = await ctx.bridge.sendRequest({ ... });

    return {
      content: [{ type: 'text', text: JSON.stringify({ status: 'success', input: params.input }) }],
    };
  },
};

export default tool;
```

## Available Context (`ctx`)

| Property | Type | Description |
|----------|------|-------------|
| `ctx.bridge` | `WebSocketBridge` | Send requests to the UE plugin |
| `ctx.logger` | `Logger` | Structured stderr logger |
| `ctx.cache` | `CacheStore` | Server-side key-value cache |
| `ctx.session` | `SessionManager` | Retry/session tracking |
| `ctx.approvalGate` | `ApprovalGate` | Human-in-the-loop gate for destructive ops |
| `ctx.allowedRoots` | `string[]` | Allowed file system roots |
| `ctx.slateStore` | `EmbeddingStore` | Slate template RAG store |

## Naming Convention

Prefix custom tool names with `custom-` to avoid conflicts with built-in tools.

## Auto-Discovery

Custom tools are loaded automatically when the server starts. No server restart is needed if you add tools before the server initializes. Files starting with `_` are ignored.
