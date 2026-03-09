# unreal-master-mcp-server

[![npm version](https://img.shields.io/npm/v/unreal-master-mcp-server.svg)](https://www.npmjs.com/package/unreal-master-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/jaguarcode/UnrealMasterAI/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![Unreal Engine](https://img.shields.io/badge/Unreal%20Engine-5.4--5.7-blue.svg)](https://www.unrealengine.com/)
[![MCP Tools](https://img.shields.io/badge/MCP%20Tools-183-purple.svg)](https://github.com/jaguarcode/UnrealMasterAI/blob/main/docs/api-reference/mcp-tools.md)

MCP server that gives Claude AI bidirectional control over Unreal Engine — **183 tools across 37 domains** for Blueprints, materials, actors, levels, sequencer, AI, and more.

## Quick Start

### 1. Configure Claude Desktop or Claude Code

Add to your MCP config (`.claude/mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "unreal-master": {
      "command": "npx",
      "args": ["-y", "unreal-master-mcp-server"],
      "env": {
        "UE_WS_PORT": "9877"
      }
    }
  }
}
```

### 2. Install the UE Plugin

Download the plugin from [GitHub Releases](https://github.com/jaguarcode/UnrealMasterAI/releases) and copy it to your project's `Plugins/` directory, or use the install script:

```bash
git clone https://github.com/jaguarcode/UnrealMasterAI.git
./UnrealMasterAI/scripts/install-plugin.sh /path/to/YourProject
```

### 3. Start Using

Open your UE project (the plugin auto-connects), then ask Claude:

> "Add a PrintString node to BP_TestActor connected after BeginPlay, set the message to 'Hello World', then compile."

### Interactive Setup Wizard

```bash
npx unreal-master-mcp-server init
```

Generates the MCP config snippet, validates Node.js version, and detects your UE project.

## What You Can Do

| Domain | Tools | Examples |
|--------|-------|---------|
| **Blueprint** | 5 | Serialize to JSON AST, create nodes, connect pins, modify properties |
| **Actor** | 9 | Spawn, delete, transform, properties, components |
| **Material** | 6 | Create, set parameters, textures, instances |
| **Level** | 5 | Create, open, save, sublevels, world settings |
| **Asset** | 8 | Import, export, create, duplicate, rename, delete |
| **Animation** | 5 | Montages, blend spaces, sequences, skeleton info |
| **Sequencer** | 8 | Create cinematics, tracks, bindings, keyframes, FBX |
| **AI/Navigation** | 8 | Behavior trees, blackboards, nav mesh, EQS |
| **Widget/UMG** | 6 | Create widgets, elements, properties, bindings |
| **Niagara VFX** | 6 | Particle systems, emitters, parameters |
| **Landscape** | 5 | Create terrain, heightmaps, materials |
| **Physics** | 5 | Physics assets, profiles, constraints, materials |
| **Workflow** | 8 | Character setup, UI screens, multiplayer, inventory |
| **Context** | 15 | Intent matching, workflow learning, error recovery |
| + 23 more | ... | Texture, audio, PCG, foliage, curves, debug, build... |

[Full API Reference (183 tools)](https://github.com/jaguarcode/UnrealMasterAI/blob/main/docs/api-reference/mcp-tools.md)

## Architecture

```
Claude Code / Claude Desktop
    | stdio / JSON-RPC
MCP Bridge Server (this package)
    | WebSocket (port 9877)
UE Agent Plugin (C++)
    | Direct C++ / Python API calls
Unreal Engine 5.4-5.7
```

- **UE is the WebSocket client** — this server listens, UE connects
- **All UE operations run on GameThread** — safe async dispatch
- **Self-healing compilation** — parse errors, apply fix, retry (max 3)
- **Safety gate** — destructive operations require approval

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `UE_WS_PORT` | `9877` | WebSocket port for UE plugin connection |

## Requirements

- **Node.js** >= 20.0.0
- **Unreal Engine** 5.4 - 5.7
- **Python Editor Script Plugin** enabled in UE (Edit → Plugins → Scripting) — required for Python-based automation
- **UE Plugin**: [UnrealMasterAgent](https://github.com/jaguarcode/UnrealMasterAI/tree/main/ue-plugin) installed in your project

## Testing

```bash
# 1134 TypeScript tests + 58 Python tests
npm test

# With coverage (thresholds enforced)
npm run test:coverage
```

## Links

- [GitHub Repository](https://github.com/jaguarcode/UnrealMasterAI)
- [Documentation](https://jaguarcode.github.io/UnrealMasterAI/)
- [API Reference](https://github.com/jaguarcode/UnrealMasterAI/blob/main/docs/api-reference/mcp-tools.md)
- [Contributing Guide](https://github.com/jaguarcode/UnrealMasterAI/blob/main/CONTRIBUTING.md)
- [Changelog](https://github.com/jaguarcode/UnrealMasterAI/blob/main/CHANGELOG.md)

## License

MIT - see [LICENSE](https://github.com/jaguarcode/UnrealMasterAI/blob/main/LICENSE)

*Unreal Engine is a trademark of Epic Games, Inc. This project is not affiliated with or endorsed by Epic Games.*
