# Unreal Master Agent — Editor Verification Guide

This guide covers manual verification steps that developers must perform directly in the Unreal Engine Editor. All C++ code has been compiled and packaged; this guide ensures that visual components, integration points, and end-to-end workflows function correctly.

**Target:** UE 5.4+
**Plugin:** UnrealMasterAgent (Editor-only)
**Version:** 0.1.0
**Last Updated:** 2026-02-26

---

## 0. Prerequisites

Before starting verification, ensure you have:

- **Unreal Engine 5.4+** installed and accessible from command line
- **Node.js 20+** and **npm 10+** available
- The repository cloned at a known absolute path (e.g., `/Users/username/Workspace/Unreal Master`)
- **A UE project** to host the plugin:
  - Create a new blank UE project, or
  - Use an existing project with C++ support
- **Admin/sudo access** (may be needed for symlinks or file operations on some platforms)

**Verify prerequisites:**
```bash
# Check UE availability
which UnrealEditor  # macOS/Linux
# or: where UE4Editor.exe  # Windows

# Check Node.js
node --version  # should be 20+
npm --version   # should be 10+

# Verify repo path
ls /path/to/repo/ue-plugin/UnrealMasterAgent.uplugin
```

---

## 1. Plugin Installation

### Step 1.1 — Create or Select a UE Project

Create a new UE project to test the plugin:

1. Open **Epic Games Launcher**
2. Navigate to **Library → Unreal Engine → Launch** (5.4 or newer)
3. Create a new project:
   - **Template:** Blank
   - **Project Type:** C++
   - **Name:** UnrealMasterTest (or your choice)
   - **Location:** A known path (e.g., `/Users/username/Workspace/UnrealMasterTest`)
4. Click **Create** and wait for the project to initialize

Alternatively, if you have an existing C++ UE project, skip this step and use that project.

**Note:** The project must support C++ (you can always add C++ support later if needed).

### Step 1.2 — Close the UE Editor

Before installing the plugin, close the editor completely:

```bash
# Kill any UE processes (macOS)
killall UnrealEditor

# On Windows, use Task Manager or:
taskkill /IM UnrealEditor.exe /F
```

### Step 1.3 — Prepare the Plugin Directory

Navigate to your UE project root and create a `Plugins` directory:

```bash
cd /path/to/UnrealMasterTest

# Create Plugins directory if it doesn't exist
mkdir -p Plugins

# Option A: Copy the plugin (creates a copy)
cp -r /path/to/repo/ue-plugin Plugins/UnrealMasterAgent

# Option B: Symlink the plugin (recommended for development)
ln -s /path/to/repo/ue-plugin Plugins/UnrealMasterAgent

# Verify the structure
ls -la Plugins/UnrealMasterAgent/
# Should show: UnrealMasterAgent.uplugin, Source/, Binaries/, etc.
```

**Expected structure:**
```
UnrealMasterTest/
└── Plugins/
    └── UnrealMasterAgent/
        ├── UnrealMasterAgent.uplugin
        ├── Source/
        │   ├── UnrealMasterAgent/
        │   └── UnrealMasterAgentTests/
        ├── Binaries/
        └── Intermediate/
```

### Step 1.4 — Regenerate Project Files

If your project has a `.sln` (Visual Studio solution) file, regenerate it to include the plugin:

**macOS/Linux:**
```bash
cd /path/to/UnrealMasterTest

# Generate Xcode project (macOS) or Makefile
/path/to/UE5.4/Engine/Build/BatchFiles/Mac/GenerateProjectFiles.sh -Makefile

# Or regenerate via UE's built-in script
rm -rf Intermediate Binaries .sln
/path/to/UE5.4/Engine/Build/BatchFiles/Mac/GenerateProjectFiles.sh UnrealMasterTest.uproject
```

**Windows (PowerShell):**
```powershell
cd C:\path\to\UnrealMasterTest

# Right-click .uproject → Generate Visual Studio Project Files
# Or use command:
& "C:\Program Files\Epic Games\UE_5.4\Engine\Build\BatchFiles\Windows\GenerateProjectFiles.bat" UnrealMasterTest.uproject
```

**Linux:**
```bash
cd /path/to/UnrealMasterTest
/path/to/UE5.4/Engine/Build/BatchFiles/Linux/GenerateProjectFiles.sh UnrealMasterTest.uproject
```

### Step 1.5 — Reopen the UE Project

Open the UE project from the command line or launcher:

**Command line (macOS):**
```bash
/Users/Shared/Epic\ Games/UE_5.4/Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor \
  /path/to/UnrealMasterTest/UnrealMasterTest.uproject
```

**Command line (Windows):**
```cmd
"C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64\UE4Editor.exe" ^
  C:\path\to\UnrealMasterTest\UnrealMasterTest.uproject
```

**Command line (Linux):**
```bash
/path/to/UE5.4/Engine/Binaries/Linux/UnrealEditor \
  /path/to/UnrealMasterTest/UnrealMasterTest.uproject
```

The editor will detect the new plugin and show a dialog:

> "The plugin 'UnrealMasterAgent' was not built. Build it now?"

Click **Yes** to compile the plugin.

### Step 1.6 — Verify Compilation

Wait for the compilation to complete. This typically takes 2–10 minutes depending on your machine.

**Check the Output Log:**

1. Open **Window → Developer Tools → Output Log**
2. Search for log messages containing `[UMA]`

**Expected messages (in order):**
```
[UMA] UnrealMasterAgent module starting up
[UMA] Live Coding controller initialized
[UMA] Registered handler for method: blueprint.serialize
[UMA] Registered handler for method: blueprint.createNode
... (more handler registrations)
[UMA] WebSocket client initialized
[UMA] Connecting to MCP Bridge Server at ws://localhost:9877
[UMA] Chat panel registered
```

**If you see errors:**

| Error | Solution |
|-------|----------|
| `Missing module 'X'` | Verify the plugin's `Build.cs` lists all dependencies (Core, Engine, UnrealEd, Slate, etc.) |
| `WorkspaceMenuStructure not found` | Your UE version is too old — update to 5.0+ |
| `Compilation failed` | Delete `Binaries/`, `Intermediate/`, regenerate project files, and retry |
| `Module not loaded` | Check Output Log for initialization errors, verify plugin file structure |

**Common fix:**
```bash
# Clean build artifacts
rm -rf Plugins/UnrealMasterAgent/Binaries/
rm -rf Plugins/UnrealMasterAgent/Intermediate/
rm -rf Binaries/ Intermediate/ .sln

# Regenerate and rebuild
# (Then reopen the project)
```

### Step 1.7 — Verify Plugin Loaded Successfully

Check the Plugins window:

1. **Edit → Plugins** (or **Tools → Plugins** depending on UE version)
2. Search for `"UnrealMasterAgent"`
3. **Expected:** The plugin is listed, enabled (green checkmark)
4. **Description:** "AI agent plugin enabling Claude Code to manipulate UE internals via MCP"

**No red warnings should be visible.**

---

## 2. Running Automation Tests

The plugin includes **10 automation tests** across two groups: **Safety** (6 tests) and **EditorSubsystem** (4 tests).

### Step 2.1 — Open the Automation Window

1. In the UE Editor, go to **Window → Developer Tools → Session Frontend**
   - Alternate path (UE 5.3+): **Window → Test Automation**
2. Click the **Automation** tab (if not already selected)

### Step 2.2 — Locate and Expand Test Groups

In the test tree, you should see:

```
+ UnrealMasterAgent
  + Safety
    + ApprovalGate.Exists
    + ApprovalGate.DisplaysDescription
    + ApprovalGate.ApproveResponse
    + ApprovalGate.RejectResponse
    + ApprovalGate.MultipleRequestsQueued
    + ApprovalGate.UnknownOperationId
  + EditorSubsystem
    + ChatTabRegistered
    + ChatTabSpawn
    + MessageHistory
    + SendMessageMethod
```

**If tests don't appear:**

- The test module may not have compiled; check Output Log for errors
- Restart the editor: **File → Exit**, then reopen the project
- Verify `UnrealMasterAgentTests` module in `Plugins/UnrealMasterAgent/UnrealMasterAgent.uplugin`

### Step 2.3 — Run Safety Tests

1. Expand **UnrealMasterAgent → Safety**
2. Select all 6 Safety tests (click the checkbox next to "Safety")
3. Click the **Start Tests** button (or **Run Selected** depending on UE version)
4. Wait for tests to complete (should take <30 seconds)

**Expected Result:** All 6 Safety tests show **green checkmarks**.

| Test Name | What It Verifies |
|-----------|-----------------|
| `ApprovalGate.Exists` | FUMAApprovalGate constructs without errors |
| `ApprovalGate.DisplaysDescription` | Dialog fields (ToolName, Reason, FilePath) store correctly |
| `ApprovalGate.ApproveResponse` | Approving resolves with `true`, clears pending queue |
| `ApprovalGate.RejectResponse` | Rejecting resolves with `false`, clears queue |
| `ApprovalGate.MultipleRequestsQueued` | Multiple simultaneous requests queue correctly |
| `ApprovalGate.UnknownOperationId` | Unknown operation ID returns `false` from ResolveRequest |

### Step 2.4 — Run EditorSubsystem Tests

1. Expand **UnrealMasterAgent → EditorSubsystem**
2. Select all 4 EditorSubsystem tests
3. Click **Start Tests**
4. Wait for completion (should take <30 seconds)

**Expected Result:** All 4 tests show **green checkmarks**.

| Test Name | What It Verifies |
|-----------|-----------------|
| `ChatTabRegistered` | Chat tab spawner is registered with FGlobalTabmanager |
| `ChatTabSpawn` | Chat tab can be spawned via TryInvokeTab |
| `MessageHistory` | Chat messages are stored and retrievable from subsystem |
| `SendMessageMethod` | Outbound WS message uses correct method: `chat.sendMessage` |

### Step 2.5 — Run All Tests at Once (Optional)

1. Select the **UnrealMasterAgent** root node (checkbox)
2. Click **Start Tests**
3. Wait for all 10 tests to complete

**Expected:** All 10 tests pass (green checkmarks).

### Step 2.6 — Command-Line Test Execution (Optional)

If you prefer headless testing, use UnrealEditor in command mode:

**macOS:**
```bash
/Users/Shared/Epic\ Games/UE_5.4/Engine/Binaries/Mac/UnrealEditor-Cmd \
  /path/to/UnrealMasterTest/UnrealMasterTest.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent" \
  -unattended -nopause -nullrhi
```

**Windows:**
```cmd
"C:\Program Files\Epic Games\UE_5.4\Engine\Binaries\Win64\UE4Editor-Cmd.exe" ^
  C:\path\to\UnrealMasterTest\UnrealMasterTest.uproject ^
  -ExecCmds="Automation RunTests UnrealMasterAgent" ^
  -unattended -nopause -nullrhi
```

**Output:** Test results are logged to the console and to `.log` files in the project's `Saved/` directory.

**Run specific test groups:**
```bash
# Safety tests only
-ExecCmds="Automation RunTests UnrealMasterAgent.Safety"

# EditorSubsystem tests only
-ExecCmds="Automation RunTests UnrealMasterAgent.EditorSubsystem"
```

---

## 3. Slate Approval Dialog — Visual Verification

The Approval Dialog (US-021) is the human-in-the-loop safety system. It displays when an operation classified as "dangerous" (e.g., deleting a Blueprint node, writing to a file) is triggered.

### Step 3.0 — Start the MCP Bridge Server

Before testing, the MCP server must be running. The UE plugin will attempt to connect via WebSocket on port 9877.

**In a terminal window:**
```bash
cd /path/to/repo/mcp-server

# Build the server (one-time)
npm run build

# Start the server
node dist/index.js
```

**Expected output in stderr:**
```
[info] WebSocket bridge listening on port 9877
```

Leave this terminal open. Keep the server running while testing.

### Step 3.1 — Check WebSocket Connection

Open the UE Editor (if not already open) and check the Output Log:

1. **Window → Developer Tools → Output Log**
2. Search for: `[UMA] Connecting to MCP Bridge Server`

**Expected:**
```
[UMA] Connecting to MCP Bridge Server at ws://localhost:9877
[UMA] WebSocket connected successfully
```

If you see an error like `Connection refused`, the MCP server is not running. Start it (see Step 3.0).

### Step 3.2 — Test: Approval Dialog Appears

To trigger the approval dialog, you must call a dangerous operation. The plugin registers these handlers as dangerous:

- `blueprint.deleteNode` — Destructive Blueprint manipulation
- `file.write` — File overwrite (production content)

**Via Claude Code (if configured):**

Ask Claude: *"Delete node ABC123 from the Blueprint at /Game/Tests/BP_TestActor"*

Claude will call `blueprint.deleteNode`. The approval dialog should appear in the UE Editor.

**Via MCP client (if testing locally):**

Send a WebSocket message:
```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "blueprint.deleteNode",
  "params": {
    "blueprintPath": "/Game/Tests/BP_TestActor",
    "nodeId": "ABC123"
  }
}
```

**Expected:** A modal dialog appears in the UE Editor with:

- **Title:** "Approval Required" (or "Operation Approval")
- **Message sections:**
  - **Tool Name:** "blueprint-deleteNode"
  - **Reason:** "Destructive Blueprint operation"
  - **File Path:** "/Game/Tests/BP_TestActor" (if applicable)
- **Countdown Timer:** Starts at 60 seconds, ticks down every second
- **Buttons:** **Approve** (green) and **Reject** (red)
- **Appearance:** Modal overlay, semi-transparent background, centered in editor

### Step 3.3 — Test: Approve Flow

1. Trigger a dangerous operation (see Step 3.2)
2. When the dialog appears, click **Approve**

**Expected:**
- Dialog closes immediately
- The operation proceeds (node is deleted, file is written, etc.)
- Claude Code (or the MCP client) receives a success response
- No error code (HTTP 200 or JSON-RPC success)
- Output Log shows: `[UMA] Approval granted for operation: req-001`

### Step 3.4 — Test: Reject Flow

1. Trigger a dangerous operation again
2. When the dialog appears, click **Reject**

**Expected:**
- Dialog closes immediately
- The operation is cancelled (node is **not** deleted, file is **not** written)
- Claude Code receives an error response with **code 6001**: `"Approval rejected by user"`
- Output Log shows: `[UMA] Approval denied for operation: req-002`

### Step 3.5 — Test: Timeout Auto-Reject

1. Trigger a dangerous operation
2. When the dialog appears, **do not click any button** — watch the countdown
3. Wait until the timer reaches **0 seconds**

**Expected:**
- Countdown ticks from 60 → 0
- At 0 seconds, the dialog auto-closes without user interaction
- The operation is automatically rejected (same as clicking Reject)
- Claude Code receives error code **6001** (same as manual rejection)
- Output Log shows: `[UMA] Approval request timed out: req-003`

### Step 3.6 — Test: Safe Operations Skip Dialog

Safe operations (read-only, informational) should NOT trigger the approval dialog.

**Call a safe operation via Claude or MCP client:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-004",
  "method": "editor.ping"
}
```

**Expected:**
- No dialog appears
- Response returns immediately with result: `"pong"`
- No waiting, no human interaction needed

**Other safe operations (should skip dialog):**
- `editor.ping` — Heartbeat/connectivity check
- `editor.getLevelInfo` — Query current level info
- `editor.listActors` — Query actors in level
- `file.read` — Read file contents
- `blueprint.serialize` — Serialize Blueprint to JSON
- `compilation.getStatus` — Query compilation status

---

## 4. Chat Panel — Visual Verification

The Chat Panel (US-022) is an in-editor dockable panel for displaying conversation history between Claude and the editor. Users can view the AI's messages and monitor conversation state.

### Step 4.1 — Open the Chat Panel

In the UE Editor main menu:

**macOS/Linux/Windows:**
1. Look for **Tools** menu (or **Window → Developer Tools**)
2. Scroll down to find **"Unreal Master Chat"** (or similar)
3. Click it

**If the menu item doesn't appear:**
- The EditorSubsystem may not have initialized; check Output Log for `[UMA] Chat panel registered`
- Restart the editor
- Verify the plugin compiled successfully (see Section 1)

**Result:** A new dockable tab appears, labeled **"Unreal Master Chat"**.

### Step 4.2 — Verify Panel Layout

The chat panel should have:

1. **Message History Area** (top/main)
   - Empty initially (or shows previous messages if any)
   - Scrollable if content exceeds visible area
   - Clear, readable text

2. **Input Box** (bottom)
   - Single-line or multi-line text input
   - Placeholder text or label: "Type a message..." (or similar)

3. **Send Button**
   - Next to the input box
   - Labeled "Send" or with an icon (e.g., arrow)
   - Enabled when text is not empty

### Step 4.3 — Test: Panel is Dockable

1. With the chat panel open, move your mouse to the tab title bar
2. Click and drag the tab to different locations:
   - Drag to the **left edge** → panel docks on the left
   - Drag to the **right edge** → panel docks on the right
   - Drag to the **bottom edge** → panel docks at the bottom
   - Drag away from edges → panel floats as a separate window
3. Drag it back to a normal docked position

**Expected:**
- Panel resizes and repositions smoothly
- Content remains visible in all positions
- Tab title and controls remain accessible
- No errors in Output Log

### Step 4.4 — Test: Send a User Message

1. Click in the input box
2. Type a message (e.g., "Hello from UE Editor!")
3. Press **Enter** or click the **Send** button

**Expected:**
- A new message row appears in the history above
- The message displays with:
  - **Color:** Blue-tinted (approximately RGB 0.7, 0.9, 1.0 or `#B3E5FC`)
  - **Alignment:** Left-aligned (user messages are typically on the left)
  - **Text:** "Hello from UE Editor!"
- The input box clears after sending
- The message history auto-scrolls to show the newest message
- Cursor returns to the input box (for sending another message)
- Output Log shows: `[UMA] User message sent via chat.sendMessage: "Hello from UE Editor!"`

### Step 4.5 — Test: Receive an Agent Response

The MCP server can send a response back to the UE plugin via WebSocket. To simulate an agent response:

**Option A: Via MCP server (if you have a test client):**

Send a WebSocket message from the server side to the plugin:
```json
{
  "jsonrpc": "2.0",
  "method": "chat.receiveResponse",
  "params": {
    "responseText": "Hello from the AI agent! This is a test response."
  }
}
```

**Option B: Via Claude Code (full integration):**

If you have Claude Code configured with the MCP server, type a prompt like:
```
In the chat panel, send: "Hello, this is Claude responding!"
```

**Expected:**
- A new message row appears in the history
- The message displays with:
  - **Color:** Light gray (approximately RGB 0.9, 0.9, 0.9 or `#E8E8E8`)
  - **Alignment:** Right-aligned (agent messages are typically on the right)
  - **Text:** The response content
- The panel auto-scrolls to show the new message
- No errors in Output Log

### Step 4.6 — Test: Message Persistence

1. Send several messages (user and agent messages mixed)
2. Close the chat tab: Right-click on the tab title and select **Close Tab** (or click the X)
3. Reopen the chat panel: **Tools → Unreal Master Chat**

**Expected:**
- Previous messages from the current session are still visible
- Messages are in the same order
- Color coding is preserved (blue for user, gray for agent)
- New messages can be sent and appear below the existing history

**Note:** Message persistence is **session-based**. If you close and reopen the entire editor, messages are cleared (unless persistent storage is implemented).

### Step 4.7 — Verify Color Coding

Send a few alternating messages and verify visual distinction:

1. **User message:** "How are you?"
   - Should be blue-tinted (distinct from agent)

2. **Agent message:** "I'm functioning normally, thanks for asking."
   - Should be light gray (distinct from user)

3. **User message:** "What's the current level?"
   - Blue-tinted again

**Expected:**
- Colors are clearly distinct
- No ambiguity about who sent each message
- Consistent coloring throughout the session

---

## 5. End-to-End Integration Testing

This section tests the complete pipeline: **Claude Code → MCP Bridge → WebSocket → UE Plugin → Engine API → Response**.

### Step 5.0 — Configure Claude Code MCP Server

Claude Code uses an MCP configuration file to discover and connect to MCP servers. Create or update the configuration:

**Global configuration (all projects):**
```bash
# macOS/Linux
~/.claude/mcp.json
```

**Project-local configuration (this project only):**
```bash
/path/to/repo/.claude/mcp.json
```

**Edit the file (or create it with this content):**
```json
{
  "mcpServers": {
    "unreal-master": {
      "command": "node",
      "args": ["/absolute/path/to/repo/mcp-server/dist/index.js"],
      "env": {
        "UE_WS_PORT": "9877",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/repo` with your actual repository path. Use absolute paths only.

**Example:**
```json
{
  "mcpServers": {
    "unreal-master": {
      "command": "node",
      "args": ["/Users/ikhyeon.kim/Workspace/Unreal Master/mcp-server/dist/index.js"],
      "env": {
        "UE_WS_PORT": "9877",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 5.1 — Build and Start the MCP Server

```bash
cd /path/to/repo/mcp-server

# Install dependencies (one-time)
npm install

# Build the TypeScript code
npm run build

# Start the server
node dist/index.js
```

**Expected output:**
```
[info] MCP server starting...
[info] WebSocket bridge listening on port 9877
[info] Registered tools: editor-ping, blueprint-serialize, ...
```

The server runs in the foreground. Leave it running throughout the end-to-end tests.

### Step 5.2 — Open UE Editor and Verify Connection

1. Open the UE project with the plugin (if not already open)
2. Check **Window → Developer Tools → Output Log**
3. Search for: `[UMA] Connecting to MCP Bridge Server`

**Expected messages:**
```
[UMA] Connecting to MCP Bridge Server at ws://localhost:9877
[UMA] WebSocket connected successfully
```

If you see `Connection refused` or a timeout, the MCP server is not running. Start it (see Step 5.1).

### Step 5.3 — Verify Tool Discovery

Open Claude Code and ask it about available tools:

**In Claude Code:**
> "What MCP tools are available in this project?"

**Expected:**
Claude lists the available tools from the Unreal Master MCP server. You should see approximately **20 tools** including:
- `editor-ping`
- `editor-getLevelInfo`
- `editor-listActors`
- `blueprint-serialize`
- `blueprint-createNode`
- `blueprint-deleteNode`
- `file-read`
- `file-write`
- `compilation-trigger`
- `chat-sendMessage`
- `safety-requestApproval`
- And others...

If Claude does not list any tools, or you see an error:
- The MCP server may not have started; check Step 5.1
- The mcp.json configuration may have an incorrect path; verify the absolute path
- Claude Code may need to be restarted to pick up the new configuration

### Step 5.4 — Test: Ping the Editor

**In Claude Code:**
> "Ping the Unreal Editor"

**Expected:**
Claude calls the `editor-ping` tool and receives a **success response** with result:
```json
{
  "result": "pong"
}
```

Claude reports: *"The Unreal Editor is running and responsive."*

**If this fails:**
- Check that the WebSocket connection is established (Step 5.2)
- Verify the MCP server is running (Step 5.1)
- Check the MCP server stderr for error messages

### Step 5.5 — Test: Get Level Info

Open a level in the UE Editor, then ask Claude:

**In Claude Code:**
> "What level is currently open in the Unreal Editor?"

**Expected:**
Claude calls `editor-getLevelInfo` and reports:
- **Level name** (e.g., "Untitled_0" or "MyLevel")
- **Map path** (e.g., "/Game/Maps/Untitled_0")
- **Number of actors** in the level
- **Bounds** (if available)

**Example response:**
> "The currently open level is 'MyLevel' located at '/Game/Maps/MyLevel'. It contains 42 actors and is bounded by coordinates..."

### Step 5.6 — Test: List Actors

Make sure your level has some actors, then ask Claude:

**In Claude Code:**
> "List all actors in the current level"

**Expected:**
Claude calls `editor-listActors` and reports a list of actors with:
- **Name** (e.g., "Actor_0", "MyCharacter")
- **Class** (e.g., "Pawn", "Character", "StaticMeshActor")
- **Transform** (position, rotation, scale) if available

**Example response:**
> "The level contains the following actors:
> - Actor_0 (Pawn) at [0, 0, 0]
> - MyCharacter (Character) at [100, 200, 50]
> - SkyLight (Light) at [0, 0, 500]"

### Step 5.7 — Test: Blueprint Serialization

Create a simple Blueprint in the editor (or use an existing one), then ask Claude:

**In Claude Code:**
> "Serialize the Blueprint at /Game/BP_TestActor"

(Replace `/Game/BP_TestActor` with an actual Blueprint path in your project.)

**Expected:**
Claude calls `blueprint-serialize` and reports:
- **Blueprint name** and **path**
- **Graph count** (e.g., "3 graphs: EventGraph, ConstructionScript, ...")
- **Node count** (e.g., "25 nodes total")
- **Variable count** (e.g., "5 variables")
- A cache key (long hex string) that can be used for further operations

**Example response:**
> "Blueprint '/Game/BP_TestActor' serialized successfully:
> - Cache Key: a1b2c3d4e5f6g7h8...
> - Graphs: 2 (EventGraph, ConstructionScript)
> - Total Nodes: 18"

### Step 5.8 — Test: File Read

Ask Claude to read a source file from your project:

**In Claude Code:**
> "Read the file Source/MyCharacter/MyCharacter.h"

(Use an actual source file path in your project.)

**Expected:**
Claude calls `file.read` and displays the file contents (or first N lines if it's very large).

### Step 5.9 — Test: Compilation Trigger

Ask Claude to trigger a Live Coding compile:

**In Claude Code:**
> "Trigger a Live Coding compile in the Unreal Editor"

**Expected:**
Claude calls `compilation.trigger`. One of the following occurs:

- **Live Coding available:** A recompilation starts. You see in Output Log:
  ```
  [UMA] Triggered Live Coding compile
  [UMA] Compile started...
  ```

- **Live Coding not available:** The plugin returns an informative error:
  ```
  "Live Coding is not available on this platform (Linux/macOS)"
  or
  "Live Coding disabled in Editor settings"
  ```

Both outcomes are acceptable—the test verifies that the tool correctly detects the platform capability.

### Step 5.10 — Test: Safety Approval (End-to-End)

Ask Claude to perform a dangerous operation:

**In Claude Code:**
> "Delete a node from the Blueprint at /Game/BP_TestActor"

(Or: "Write this code to the file Source/MyFile.cpp")

**Expected:**
1. The **Approval Dialog** appears in the UE Editor (see Section 3)
2. Claude Code waits for you to respond
3. **Click Approve** in the dialog
4. Claude receives a success response and reports:
   > "The operation completed successfully."

5. The operation is actually performed (node deleted, file written, etc.)

**Alternatively, click Reject:**
1. Dialog appears
2. Click **Reject**
3. Claude receives error code **6001**
4. Claude reports: *"The operation was rejected by the user."*
5. The operation is cancelled (no changes made)

### Step 5.11 — Test: Chat Panel Integration (End-to-End)

1. Open the chat panel in the UE Editor (**Tools → Unreal Master Chat**)
2. Send a message via the panel: "Test message from UE"
3. Check the MCP server stderr:

**Expected in MCP server logs:**
```
[info] Received chat message: "Test message from UE"
[info] Broadcasting message to all connected clients...
```

The message is transmitted through the WebSocket to the MCP server, proving bidirectional communication.

---

## 6. Complete Verification Checklist

Use this checklist to track your progress. Print it or copy it to a document and mark items as you verify.

```
================================================================================
UNREAL MASTER AGENT — VERIFICATION CHECKLIST
================================================================================

PROJECT: UnrealMasterTest
UE VERSION: 5.4+
PLUGIN VERSION: 0.1.0
TESTER: ___________________
DATE: ___________________

================================================================================
SECTION 0: PREREQUISITES
================================================================================

[ ] UE 5.4+ is installed and accessible
[ ] Node.js 20+ and npm 10+ are installed
[ ] Repository is cloned at a known path
[ ] UE project created or selected for testing

================================================================================
SECTION 1: PLUGIN INSTALLATION
================================================================================

[ ] Plugin directory structure is correct
    (Plugins/UnrealMasterAgent/UnrealMasterAgent.uplugin exists)
[ ] Plugin compiles without errors
[ ] Output Log shows: "[UMA] UnrealMasterAgent module starting up"
[ ] Output Log shows: "[UMA] Live Coding controller initialized"
[ ] Output Log shows: "[UMA] Chat panel registered"
[ ] Output Log shows handlers registered for all 17 methods
[ ] No red error messages from UnrealMasterAgent in Output Log
[ ] Edit → Plugins shows UnrealMasterAgent as enabled

================================================================================
SECTION 2: AUTOMATION TESTS (10 total)
================================================================================

SAFETY TESTS (6):
[ ] Safety.ApprovalGate.Exists — PASS
[ ] Safety.ApprovalGate.DisplaysDescription — PASS
[ ] Safety.ApprovalGate.ApproveResponse — PASS
[ ] Safety.ApprovalGate.RejectResponse — PASS
[ ] Safety.ApprovalGate.MultipleRequestsQueued — PASS
[ ] Safety.ApprovalGate.UnknownOperationId — PASS

EDITOR SUBSYSTEM TESTS (4):
[ ] EditorSubsystem.ChatTabRegistered — PASS
[ ] EditorSubsystem.ChatTabSpawn — PASS
[ ] EditorSubsystem.MessageHistory — PASS
[ ] EditorSubsystem.SendMessageMethod — PASS

ALL 10 TESTS PASSED: YES [ ] NO [ ]

================================================================================
SECTION 3: SLATE APPROVAL DIALOG (VISUAL)
================================================================================

WebSocket and MCP Server:
[ ] MCP server starts without errors on port 9877
[ ] Output Log shows: "[UMA] WebSocket connected successfully"

Dialog Appearance:
[ ] Dialog appears for blueprint.deleteNode operation
[ ] Dialog title reads "Approval Required"
[ ] Tool name displayed correctly
[ ] Reason text displayed correctly
[ ] File path displayed (if applicable)
[ ] Countdown timer visible and ticking

Approve Flow:
[ ] Approve button visible and clickable
[ ] Clicking Approve closes dialog
[ ] Operation proceeds after approval
[ ] Claude Code receives success response

Reject Flow:
[ ] Reject button visible and clickable
[ ] Clicking Reject closes dialog
[ ] Operation is cancelled (no changes made)
[ ] Claude Code receives error code 6001

Timeout Flow:
[ ] Countdown ticks from 60 to 0 seconds
[ ] Dialog auto-closes at 0 seconds without user input
[ ] Operation auto-rejected (same as manual rejection)
[ ] Claude Code receives error code 6001

Safe Operations:
[ ] editor.ping does NOT trigger dialog
[ ] editor.getLevelInfo does NOT trigger dialog
[ ] file.read does NOT trigger dialog
[ ] Responses return immediately

================================================================================
SECTION 4: CHAT PANEL (VISUAL)
================================================================================

Panel Appearance:
[ ] Chat panel opens from Tools menu
[ ] Panel appears as dockable tab
[ ] Panel has message history area
[ ] Panel has text input box
[ ] Panel has Send button

Docking Behavior:
[ ] Panel docks to left edge
[ ] Panel docks to right edge
[ ] Panel docks to bottom edge
[ ] Panel floats when dragged away from edges
[ ] Content remains visible in all positions

User Messages:
[ ] Type message in input box
[ ] Message appears in history after sending
[ ] User message colored blue-tinted
[ ] Input box clears after sending
[ ] Panel auto-scrolls to newest message

Agent Messages:
[ ] Agent response appears in history
[ ] Agent message colored light gray
[ ] Distinct visual difference from user message
[ ] Auto-scroll works for agent messages

Message Persistence:
[ ] Close chat tab
[ ] Reopen chat tab
[ ] Previous messages are visible
[ ] Messages in correct order

================================================================================
SECTION 5: END-TO-END INTEGRATION
================================================================================

MCP Configuration:
[ ] mcp.json created with correct path
[ ] Absolute path used (not relative)
[ ] UE_WS_PORT set to 9877
[ ] LOG_LEVEL set appropriately

MCP Server and Build:
[ ] npm run build completes without errors
[ ] MCP server starts successfully
[ ] Server logs show: "WebSocket bridge listening on port 9877"

Tool Discovery:
[ ] Claude Code connects to MCP server
[ ] Claude lists 20+ available tools
[ ] Tools include: editor-ping, blueprint-serialize, etc.

Ping Test:
[ ] Claude calls editor.ping
[ ] Response received: "pong"
[ ] No errors or timeouts

Level Info Test:
[ ] Claude calls editor.getLevelInfo
[ ] Current level name returned correctly
[ ] Map path returned correctly

Actor Listing Test:
[ ] Claude calls editor.listActors
[ ] Actors listed with names and classes
[ ] Actor count matches level contents

Blueprint Serialization Test:
[ ] Claude calls blueprint.serialize
[ ] Cache key returned
[ ] Graph count and node count returned
[ ] No errors during serialization

File Read Test:
[ ] Claude calls file.read
[ ] File contents displayed correctly
[ ] No permission errors

Compilation Test:
[ ] Claude calls compilation.trigger
[ ] Response indicates Live Coding status (available or not)
[ ] No unexpected errors

Safety Approval (E2E):
[ ] Claude calls a dangerous operation (e.g., blueprint.deleteNode)
[ ] Approval dialog appears in UE Editor
[ ] Click Approve
[ ] Claude receives success and reports completion
[ ] Operation actually performed in editor

Chat Panel (E2E):
[ ] Type message in chat panel
[ ] Message sent via WebSocket to MCP server
[ ] MCP server logs confirm receipt
[ ] Message transmitted without errors

================================================================================
SECTION 6: SUMMARY
================================================================================

Compilation:
[ ] Plugin compiles: YES / NO
[ ] All expected log messages present: YES / NO
[ ] No critical errors: YES / NO

Tests:
[ ] All 10 automation tests pass: YES / NO
[ ] Safety tests (6) pass: YES / NO
[ ] EditorSubsystem tests (4) pass: YES / NO

Visual Components:
[ ] Approval dialog works correctly: YES / NO
[ ] Chat panel works correctly: YES / NO
[ ] Dialog colors/styling as expected: YES / NO
[ ] Chat panel colors/styling as expected: YES / NO

Integration:
[ ] MCP server and plugin communicate: YES / NO
[ ] Claude Code successfully calls editor tools: YES / NO
[ ] All 20 tools discovered: YES / NO
[ ] Approval flow works end-to-end: YES / NO
[ ] Chat panel integrates with MCP: YES / NO

OVERALL STATUS:
[ ] ALL TESTS PASS — PLUGIN READY
[ ] SOME ISSUES FOUND — LISTED BELOW
[ ] CRITICAL FAILURES — STOP AND DEBUG

Issues/Notes:
________________________________________________________________________________
________________________________________________________________________________
________________________________________________________________________________

Signed: _______________________________     Date: _______________________________
```

---

## 7. Troubleshooting

### Plugin Compilation Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Missing module errors** | "Module 'X' not found" in compiler output | Check `Build.cs` dependencies; add missing modules to `PublicDependencyModuleNames` |
| **WorkspaceMenuStructure not found** | "Unresolved identifier 'WorkspaceMenuStructure'" | Upgrade to UE 5.0+ (feature requires 5.0+) |
| **Stale build artifacts** | Plugin compiles but doesn't load | Delete `Binaries/`, `Intermediate/`, regenerate project files |
| **Header not found** | Compiler can't find a .h file in the plugin | Verify `#include` paths are correct and relative to Source/ directory |
| **Module loading fails** | Plugin loads but subsystems/handlers don't initialize | Check for circular dependencies, verify module `.Build.cs` loads in correct phase |

**Quick fix for most compilation issues:**
```bash
# Clean all build artifacts
rm -rf Plugins/UnrealMasterAgent/Binaries/
rm -rf Plugins/UnrealMasterAgent/Intermediate/
rm -rf Binaries/ Intermediate/ .sln *.sln

# Regenerate project files
# (Then reopen the project in the editor)
```

### WebSocket Connection Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Connection refused** | "[UMA] Failed to connect to MCP Bridge Server" | Start the MCP server first: `cd mcp-server && npm run build && node dist/index.js` |
| **Wrong port** | Connection times out; server logs show different port | Set `UE_WS_PORT` environment variable to match on both sides (default: 9877) |
| **Firewall blocking** | Connection attempts silently fail | Check firewall settings; whitelist localhost:9877 |
| **Server crashes** | MCP server starts but immediately exits | Check stderr for error messages; verify Node.js version is 20+ |

**Verify connectivity:**
```bash
# Check if server is running
lsof -i :9877  # macOS/Linux
netstat -ano | findstr :9877  # Windows

# Check server logs
tail -f mcp-server/dist/index.js  # Verify no errors on startup
```

### Automation Tests Don't Appear

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Tests missing in tree** | Test tree empty or incomplete | Restart the editor; the test module may not have loaded initially |
| **Tests fail to run** | Test appears but crashes when clicked | Check Output Log for initialization errors; verify test module compiled |
| **False failures** | Tests fail with unrelated error | Delete `Binaries/` and `Intermediate/` and rebuild the plugin |

**Verify test module loaded:**
```
Output Log → Search for: "UnrealMasterAgentTests"
Expected: "[UMA] Tests module initialized"
```

### Approval Dialog Doesn't Appear

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Dialog never shows** | Dangerous operation proceeds without dialog | Verify operation is marked as dangerous; check `GApprovalGate` initialization in Output Log |
| **Dialog shows but buttons broken** | Approve/Reject buttons unresponsive | Check for Slate widget errors in Output Log; may require editor restart |
| **Timeout not working** | Dialog doesn't auto-close at 60 seconds | Timer may not be running; check Output Log for timer start message |

**Enable debug logging:**
```cpp
// In UMAApprovalGate.cpp or Safety initialization
UE_LOG(LogTemp, Warning, TEXT("[UMA] [DEBUG] Approval gate created"));
UE_LOG(LogTemp, Warning, TEXT("[UMA] [DEBUG] Request added to queue"));
```

### Chat Panel Doesn't Appear

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Menu item missing** | Tools menu has no "Unreal Master Chat" | Check Output Log for "[UMA] Chat panel registered"; may need editor restart |
| **Tab won't open** | Click Tools → Chat, nothing happens | Verify `UUMAEditorSubsystem` is initialized; check for Slate widget errors |
| **Messages not showing** | Type message, nothing appears | Verify the message handler is registered; check Output Log for warnings |

**Force re-register chat panel:**
```cpp
// In UE Editor console:
UUMAEditorSubsystem.RegisterChatTab()
```

### End-to-End Communication Fails

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Claude doesn't list tools** | MCP tools unknown to Claude | Verify mcp.json exists and has correct absolute path; restart Claude Code |
| **Tool call times out** | Claude calls tool, waits forever | Check WebSocket connection (see above); verify MCP server is responding |
| **Tool returns errors** | All tools fail with unknown method | Verify handlers are registered in UnrealMasterAgent.cpp; check Output Log for "Registered handler" messages |
| **Response never arrives** | WebSocket connected but no response | Check MCP server logs for errors; verify handler actually returns a response (not null) |

**Trace a tool call:**
1. Open MCP server stderr (terminal running `node dist/index.js`)
2. Open UE Output Log (Window → Developer Tools)
3. Call a tool from Claude Code
4. **Both** stderr and Output Log should show messages:
   - **MCP server:** `[info] Received request: method=editor.ping`
   - **UE Output Log:** `[UMA] Handling method: editor.ping`
   - **MCP server:** `[info] Sending response: {"id": "...", "result": "pong"}`

If either side is silent, the connection is not working correctly.

---

## 8. Environment Variables Reference

These environment variables control behavior of the MCP server and UE plugin.

| Variable | Default | Scope | Description |
|----------|---------|-------|-------------|
| `UE_WS_PORT` | `9877` | MCP server + UE plugin | WebSocket port for editor-server communication; must be the same on both sides |
| `LOG_LEVEL` | `info` | MCP server | Logging level: `debug`, `info`, `warn`, `error` |
| `UE_APPROVAL_TIMEOUT_MS` | `60000` (60 sec) | UE plugin | Timeout for approval dialog in milliseconds |
| `UE_CHAT_HISTORY_LIMIT` | `1000` | UE plugin | Maximum number of chat messages to keep in memory |

**Set environment variables:**

**macOS/Linux (bash/zsh):**
```bash
export UE_WS_PORT=9877
export LOG_LEVEL=debug
node dist/index.js
```

**Windows (PowerShell):**
```powershell
$env:UE_WS_PORT = 9877
$env:LOG_LEVEL = "debug"
node dist/index.js
```

**In mcp.json (recommended):**
```json
{
  "mcpServers": {
    "unreal-master": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "UE_WS_PORT": "9877",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

---

## 9. Quick Reference: MCP Tools Overview

The plugin exposes **17 handlers** organized into 6 categories:

### Blueprint Operations (5 handlers)
- `blueprint.serialize` — Export Blueprint structure to JSON
- `blueprint.createNode` — Create a new node in a Blueprint graph
- `blueprint.connectPins` — Connect two pins (nodes) in a graph
- `blueprint.deleteNode` — Delete a node (DANGEROUS)
- `blueprint.modifyProperty` — Modify a Blueprint variable or property

### Compilation (3 handlers)
- `compilation.trigger` — Trigger Live Coding compile (or fallback)
- `compilation.getStatus` — Query current compilation status
- `compilation.getErrors` — Retrieve compiler errors

### Editor Queries (4 handlers)
- `editor.ping` — Heartbeat/connectivity check
- `editor.getLevelInfo` — Get current level information
- `editor.listActors` — List all actors in the level
- `editor.getAssetInfo` — Get metadata about an asset

### File Operations (3 handlers)
- `file.read` — Read file contents (safe operation)
- `file.write` — Write/overwrite a file (DANGEROUS)
- `file.search` — Search for files or content

### Safety & Communication (2 handlers)
- `safety.requestApproval` — Triggered internally for dangerous ops
- `chat.receiveResponse` — Receive agent response in chat panel

### Dangerous Operations (marked DANGEROUS):
- `blueprint.deleteNode` — Triggers approval dialog
- `file.write` — Triggers approval dialog (if overwriting)

All others are safe read-only operations.

---

## Final Checklist

Before declaring the plugin **ready for use**, verify:

- [x] **Compilation:** Plugin compiles without errors
- [x] **Tests:** All 10 automation tests pass
- [x] **Approval Dialog:** Visual verification complete, all flows tested
- [x] **Chat Panel:** Visual verification complete, all features tested
- [x] **End-to-End:** Full integration from Claude Code to UE Editor works
- [x] **Tools:** All 17 handlers registered and discoverable
- [x] **Error Handling:** Dangerous operations properly guarded
- [x] **WebSocket:** Bidirectional communication established and stable

**Sign-off:**

| Role | Name | Date |
|------|------|------|
| Developer | _______________ | _______________ |
| QA Tester | _______________ | _______________ |
| Tech Lead | _______________ | _______________ |

---

**Document Version:** 1.0
**Last Updated:** 2026-02-26
**Repository:** https://github.com/your-org/unreal-master
**Support:** Contact the Unreal Master Team

