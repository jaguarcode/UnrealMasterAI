# Unreal Master Agent — Setup and Installation Guide

This guide walks you through installing and configuring the Unreal Master Agent MCP server and UE plugin to enable Claude Code to control Unreal Engine development tasks.

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** 20 or later
- **npm** 10 or later
- **TypeScript** 5.5+ (installed automatically via devDependencies)
- **Unreal Engine** 5.4, 5.5, 5.6, or 5.7
- **Claude Code** (latest version) with MCP support enabled

Check your Node.js and npm versions:

```bash
node --version
npm --version
```

---

## Step 1: Install MCP Server Dependencies

Navigate to the MCP server directory and install all required packages:

```bash
cd mcp-server
npm install
```

This installs:
- `@modelcontextprotocol/sdk` — MCP protocol support
- `ws` — WebSocket server for UE plugin communication
- `zod` — Schema validation
- `typescript`, `vitest` — development tools

---

## Step 2: Build the MCP Server

Compile TypeScript to JavaScript:

```bash
npm run build
```

This generates the compiled server in `mcp-server/dist/index.js`.

### Development Mode (Optional)

For active development with automatic recompilation on file changes:

```bash
npm run dev
```

This runs TypeScript in watch mode and recompiles whenever you edit source files.

---

## Step 3: Configure MCP in Claude Code

Configure Claude Code to load the Unreal Master Agent MCP server. You can use either `.claude/mcp.json` (project-local) or `~/.claude/settings.json` (global).

### Project-Local Configuration (.claude/mcp.json)

Create or update `.claude/mcp.json` at the project root:

```json
{
  "mcpServers": {
    "unreal-master-agent": {
      "command": "node",
      "args": ["C:/Workspace/UnrealMasterAI/mcp-server/dist/index.js"],
      "env": {
        "UE_WS_PORT": "9877"
      }
    }
  }
}
```

Replace the `args` path with your actual project path. Use forward slashes (/) even on Windows.

### Global Configuration (~/.claude/settings.json)

Alternatively, add the server to your global Claude Code settings:

```json
{
  "mcpServers": {
    "unreal-master-agent": {
      "command": "node",
      "args": ["/full/path/to/mcp-server/dist/index.js"],
      "env": {
        "UE_WS_PORT": "9877"
      }
    }
  }
}
```

### Environment Variables

- **UE_WS_PORT** (default: 9877) — WebSocket port the UE plugin will connect to. Change this if port 9877 is already in use on your system.

---

## Step 4: Install and Enable the UE Plugin

The UE plugin implements the Layer 3 (C++) components that execute operations in Unreal Engine.

### Copy the Plugin

Copy or symlink the `ue-plugin/` directory to your Unreal Engine project's `Plugins/` directory:

```bash
# Option A: Copy
cp -r ue-plugin /path/to/YourProject/Plugins/UnrealMasterAgent

# Option B: Symlink (Unix/Linux/macOS)
ln -s /path/to/UnrealMasterAI/ue-plugin /path/to/YourProject/Plugins/UnrealMasterAgent

# Option C: Symlink (Windows, requires admin)
mklink /D "C:\YourProject\Plugins\UnrealMasterAgent" "C:\Workspace\UnrealMasterAI\ue-plugin"
```

### Enable in .uproject

Edit your project's `.uproject` file and add the plugin to the `Plugins` array:

```json
{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Category": "Development",
  "Description": "Your project description",
  "Modules": [...],
  "Plugins": [
    {
      "Name": "UnrealMasterAgent",
      "Enabled": true
    }
  ]
}
```

### Rebuild from Source

Open your project in the Unreal Engine editor. You will be prompted to rebuild the plugin. Click **Yes** to compile the C++ code.

Alternatively, rebuild from the command line:

```bash
UnrealAutomationTool BuildPlugin -Plugin=Plugins/UnrealMasterAgent -Package=Binaries/Win64 -CreateNew -TargetPlatforms=Win64
```

---

## Step 5: Verify the Connection

Once the UE editor has loaded with the plugin enabled, verify the connection is working.

### Test with Claude Code

In Claude Code, run the `editor.ping` tool:

```
> editor.ping
```

**Expected response:**

```json
{
  "status": "ok",
  "ueVersion": "5.4.0"
}
```

Replace `5.4.0` with your actual UE version.

### Verify WebSocket Port

Confirm that the WebSocket server is listening on the configured port (default 9877). On Windows:

```bash
netstat -ano | findstr :9877
```

On macOS/Linux:

```bash
lsof -i :9877
```

You should see the Node.js process listening.

### Check Logs

Monitor the MCP server output for connection messages. If you're running the server in development mode, you'll see:

```
WebSocket client connected from [UE Plugin]
```

Or in the UE Editor console:

```
LogUnrealMasterAgent: WebSocket connected to MCP server at localhost:9877
```

---

## Troubleshooting

### WebSocket Connection Refused

**Problem:** The plugin fails to connect to the MCP server.

**Solutions:**
1. Verify the Node.js server is running: `npm start` in `mcp-server/`
2. Confirm the correct port is configured in both `.claude/mcp.json` and the UE plugin settings
3. Ensure the firewall is not blocking localhost connections on the port
4. Check that the plugin path in `.uproject` is correct

### MCP Server Crashes on Startup

**Problem:** The server exits immediately after starting.

**Solutions:**
1. Run `npm run build` to ensure TypeScript is compiled
2. Verify Node.js 20+ is installed: `node --version`
3. Check for missing dependencies: `npm install`
4. Review the server logs for error messages

### Plugin Does Not Load in UE Editor

**Problem:** The UE editor does not recognize the plugin.

**Solutions:**
1. Verify the plugin path: `Plugins/UnrealMasterAgent/`
2. Confirm the `.uproject` entry: `"Name": "UnrealMasterAgent", "Enabled": true`
3. Rebuild the project: **Edit > Plugins > Search "UnrealMasterAgent" > Restart**
4. Check for compilation errors in the Output Log

### Port 9877 Already in Use

**Problem:** Another application is using port 9877.

**Solutions:**
1. Change the port in `.claude/mcp.json` to an available port (e.g., 9878)
2. Restart both the MCP server and UE editor
3. Or terminate the process using the port (use `netstat` or `lsof` to find it)

---

## Development Workflow

### Running the MCP Server

In production, Claude Code automatically starts the MCP server based on your configuration.

To manually start the server:

```bash
cd mcp-server
npm start
```

Or in development mode with watch:

```bash
cd mcp-server
npm run dev
```

### Running Tests

Test the MCP server components:

```bash
cd mcp-server
npm test
```

Or in watch mode:

```bash
cd mcp-server
npm run test:watch
```

### Type Checking

Verify TypeScript types without running tests:

```bash
cd mcp-server
npm run typecheck
```

---

## Next Steps

- Read [ARCHITECTURE.md](../ARCHITECTURE.md) for the system design and 4-layer architecture
- Review the [MCP Tool Reference](./api-reference/) for available tool documentation
- Consult the [Safety Architecture](./safety-architecture.md) guide to understand approval workflows
- Check [AGENTS.md](../docs/AGENTS.md) for AI agent guidance

---

## Support

For issues, questions, or contributions, refer to the project repository or contact the development team.
