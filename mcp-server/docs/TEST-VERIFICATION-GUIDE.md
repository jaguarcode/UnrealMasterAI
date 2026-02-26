# Test Verification Guide - Unreal Master AI Agent

A step-by-step guide for verifying the complete implementation of the Unreal Master AI Agent project. This covers TypeScript unit tests, integration tests, type checking, and manual server verification.

## Prerequisites

Before running tests, ensure you have:

- **Node.js 20+** and **npm 10+** installed
- **Unreal Engine 5.4+** (required only for C++ tests in UE Editor)
- Repository cloned with working directory ready

### Setup Steps

```bash
cd /Users/ikhyeon.kim/Workspace/Unreal\ Master/mcp-server
npm install
```

Verify installation:

```bash
npm --version
node --version
```

---

## 1. Quick Smoke Test (2 Minutes)

Start here to verify everything is working before diving into detailed tests.

### 1.1 Run All Tests

```bash
cd /Users/ikhyeon.kim/Workspace/Unreal\ Master/mcp-server
npm test
```

**Expected output:**
- **227 tests** passing
- **20 test files** executed
- **0 failures**
- Execution time: ~5-10 seconds

If you see this, skip to section 4 for coverage details. If tests fail, proceed to detailed walkthrough sections.

### 1.2 Verify Type Safety

```bash
npm run typecheck
```

**Expected output:**
- No errors
- Completes in ~3-5 seconds

This checks TypeScript strict mode across entire codebase.

### 1.3 Verify Build

```bash
npm run build
```

**Expected output:**
- Builds successfully to `dist/` directory
- No compilation errors
- TypeScript produces JavaScript output

If build fails, it means type errors exist that typecheck missed (rare edge case).

---

## 2. Unit Tests — Detailed Walkthrough

Unit tests verify individual modules in isolation. They are organized by domain.

### 2.1 Transport Layer

The transport layer handles WebSocket communication, message encoding/decoding, and connection management.

#### Test: Message Codec

```bash
npx vitest run tests/unit/transport/message-codec.test.ts
```

**What it verifies:**
- WS message envelope encoding (JSON → string)
- WS message envelope decoding (string → JSON)
- Timestamp handling
- Protocol-compliant message format

**Expected output:**
```
✓ message-codec.test.ts (X tests)
  ✓ encodes request message with timestamp
  ✓ decodes request message back to object
  ✓ encodes response message
  ✓ decodes response message
  ...
```

**If it fails:**
- Check that message format matches `{ id, method, params, timestamp }`
- Verify JSON serialization is deterministic

#### Test: WebSocket Bridge

```bash
npx vitest run tests/unit/transport/websocket-bridge.test.ts
```

**What it verifies:**
- Bridge startup and shutdown
- Client connection/disconnection handling
- Message send/receive round-trips
- Automatic reconnection
- Port configuration (including port 0 for random assignment)
- Request timeout handling
- Concurrent message handling

**Expected output:**
```
✓ websocket-bridge.test.ts (X tests)
  ✓ starts and stops cleanly
  ✓ accepts client connections
  ✓ sends and receives messages
  ✓ handles client disconnect
  ✓ reconnects after disconnect
  ✓ times out unresponded requests
  ...
```

**If it fails:**
- Ensure port 9877 is not already in use (test uses port 0 to auto-assign)
- Check that WebSocket server is properly awaiting `start()`
- Verify mock clients can connect to test bridge

---

### 2.2 Observability

Observability covers logging and tracing.

#### Test: Logger

```bash
npx vitest run tests/unit/observability/logger.test.ts
```

**What it verifies:**
- Log levels (debug, info, warn, error)
- Stderr output redirection
- Timestamp formatting
- Log format consistency
- Stdout guard prevents non-JSON-RPC output

**Expected output:**
```
✓ logger.test.ts (X tests)
  ✓ logs at debug level
  ✓ logs at info level
  ✓ logs at warn level
  ✓ logs at error level
  ✓ redirects to stderr
  ✓ includes timestamp
  ✓ stdout guard blocks console.log
  ...
```

**If it fails:**
- Check stderr is accessible in test environment
- Verify timestamp is ISO format
- Ensure log level filtering works correctly

#### Test: Tracer

```bash
npx vitest run tests/unit/observability/tracer.test.ts
```

**What it verifies:**
- Span creation and closure
- Nested span tracking
- Duration calculation
- Span attributes and events

**Expected output:**
```
✓ tracer.test.ts (X tests)
  ✓ creates span with metadata
  ✓ tracks span duration
  ✓ nests spans correctly
  ✓ records span events
  ...
```

**If it fails:**
- Verify span timing is accurate (uses `process.hrtime()`)
- Check nested spans maintain proper hierarchy

---

### 2.3 State Management

State management covers caching, safety classification, and session tracking.

#### Test: Cache Store

```bash
npx vitest run tests/unit/state/cache-store.test.ts
```

**What it verifies:**
- Cache get/set operations
- TTL (time-to-live) expiration
- Max entry limit enforcement
- LRU eviction when full
- Cache invalidation

**Expected output:**
```
✓ cache-store.test.ts (X tests)
  ✓ stores and retrieves values
  ✓ expires values after TTL
  ✓ enforces max entries limit
  ✓ evicts LRU entry when full
  ✓ invalidates cache entries
  ...
```

**If it fails:**
- Check TTL millisecond calculations (setTimeout precision)
- Verify LRU eviction removes least-recently-used entry
- Ensure max entries limit is enforced correctly

#### Test: Safety Classification

```bash
npx vitest run tests/unit/state/safety.test.ts
```

**What it verifies:**
- Operation classification (safe/warn/dangerous)
- 18 distinct safety rules
- Path safety validation (protected paths)
- ApprovalGate logic for dangerous operations

**Expected output:**
```
✓ safety.test.ts (18+ tests)
  ✓ classifies editor-ping as safe
  ✓ classifies editor-getLevelInfo as safe
  ✓ classifies file-read as safe
  ✓ classifies file-write as warn
  ✓ classifies blueprint-deleteNode as dangerous
  ✓ classifies compilation-trigger as warn
  ✓ validates safe paths (game paths)
  ✓ rejects unsafe paths (/System, /Library, etc.)
  ✓ ApprovalGate resolves when approval granted
  ✓ ApprovalGate rejects when approval denied
  ...
```

**If it fails:**
- Verify all 18 operations are correctly classified
- Check protected paths list matches security requirements
- Ensure path validation uses exact matching for protected roots

#### Test: Session Manager

```bash
npx vitest run tests/unit/state/session.test.ts
```

**What it verifies:**
- Session creation with unique IDs
- Retry count tracking for compile failures
- Compile history retention
- Session expiration

**Expected output:**
```
✓ session.test.ts (X tests)
  ✓ creates session with unique ID
  ✓ tracks retry counts
  ✓ records compile history
  ✓ expires old sessions
  ...
```

**If it fails:**
- Check UUID generation for uniqueness
- Verify compile history is appended correctly

---

### 2.4 Editor Tools

Editor tools provide read-only access to engine state.

#### Test: Editor Tools

```bash
npx vitest run tests/unit/tools/editor.test.ts
```

**What it verifies:**
- editor.ping — Echo test
- editor.getLevelInfo — Level metadata retrieval
- editor.listActors — Actor enumeration
- editor.getAssetInfo — Asset metadata retrieval

**Expected output:**
```
✓ editor.test.ts (X tests)
  ✓ editor.ping returns echo response
  ✓ editor.getLevelInfo returns level metadata
  ✓ editor.listActors returns list of actors
  ✓ editor.getAssetInfo returns asset metadata
  ...
```

**If it fails:**
- Verify mock UE client is responding to requests
- Check that WS bridge is properly forwarding messages
- Ensure response parsing matches expected format

---

### 2.5 Blueprint Tools

Blueprint tools provide serialization and manipulation.

#### Test: Blueprint Serialization

```bash
npx vitest run tests/unit/tools/blueprint.test.ts
```

**What it verifies:**
- Blueprint.serialize converts BP to JSON schema
- Nodes, pins, properties are correctly represented

**Expected output:**
```
✓ blueprint.test.ts (X tests)
  ✓ serializes blueprint to JSON
  ✓ includes node definitions
  ✓ includes pin connections
  ✓ includes properties
  ...
```

**If it fails:**
- Check JSON schema matches expected structure
- Verify all node types are serialized

#### Test: Blueprint Manipulation

```bash
npx vitest run tests/unit/tools/blueprint-tools.test.ts
```

**What it verifies:**
- createNode — Creates new BP node with given class
- connectPins — Connects output to input pins
- modifyProperty — Modifies node property values
- deleteNode — Removes node (gated by ApprovalGate)

**Expected output:**
```
✓ blueprint-tools.test.ts (X tests)
  ✓ createNode creates new node in blueprint
  ✓ connectPins connects output to input
  ✓ modifyProperty changes node property
  ✓ deleteNode removes node (with approval)
  ✓ deleteNode rejects without approval
  ...
```

**If it fails:**
- Verify ApprovalGate is properly gating deleteNode
- Check node UUIDs are generated correctly
- Ensure pin connections validate compatible types

---

### 2.6 Compilation Tools

Compilation tools trigger builds and monitor progress.

#### Test: Compilation

```bash
npx vitest run tests/unit/tools/compilation.test.ts
```

**What it verifies:**
- triggerCompile — Initiates a compile request
- getCompileStatus — Queries compile progress
- getCompileErrors — Returns compile error logs

**Expected output:**
```
✓ compilation.test.ts (X tests)
  ✓ triggerCompile sends compile request
  ✓ getCompileStatus returns status
  ✓ getCompileErrors returns error list
  ...
```

**If it fails:**
- Verify mock responses include correct status states
- Check error list parsing

#### Test: Self-Healing Compile Loop

```bash
npx vitest run tests/unit/tools/self-heal.test.ts
```

**What it verifies:**
- selfHeal — Attempts automatic compile-fix-retry loop
- Respects max retry limits
- Stops when compile succeeds

**Expected output:**
```
✓ self-heal.test.ts (X tests)
  ✓ selfHeal triggers compilation
  ✓ selfHeal retries on compile failure
  ✓ selfHeal respects max retries
  ✓ selfHeal stops on success
  ...
```

**If it fails:**
- Check retry logic increment
- Verify max retry limit is enforced

---

### 2.7 UI Tools

UI tools for Slate widget validation and generation.

#### Test: Slate Tools

```bash
npx vitest run tests/unit/tools/slate.test.ts
```

**What it verifies:**
- validateSlate — Validates Slate widget declaration syntax
- generateWidget — Generates Slate C++ code from template
- listTemplates — Lists available widget templates

**Expected output:**
```
✓ slate.test.ts (X tests)
  ✓ validateSlate accepts valid declarations
  ✓ validateSlate rejects invalid syntax
  ✓ generateWidget produces valid C++ code
  ✓ listTemplates returns available templates
  ...
```

**If it fails:**
- Verify Slate validation regex patterns
- Check C++ code generation indentation and syntax

---

### 2.8 Semantic Search

RAG-based semantic search for documentation.

#### Test: Semantic Search

```bash
npx vitest run tests/unit/rag/semantic-search.test.ts
```

**What it verifies:**
- TF-IDF embedding store creation
- Document indexing
- Semantic search ranking

**Expected output:**
```
✓ semantic-search.test.ts (X tests)
  ✓ creates embedding store
  ✓ indexes documents
  ✓ ranks search results by relevance
  ...
```

**If it fails:**
- Check TF-IDF calculation accuracy
- Verify document indexing is complete

---

### 2.9 Chat Tools

Chat integration with UE Editor.

#### Test: Chat Tool

```bash
npx vitest run tests/unit/tools/chat.test.ts
```

**What it verifies:**
- chatSendMessage — Sends message to UE chat panel
- Message formatting
- Error handling for disconnected clients

**Expected output:**
```
✓ chat.test.ts (X tests)
  ✓ chatSendMessage sends message
  ✓ chatSendMessage formats response
  ✓ chatSendMessage handles errors
  ...
```

**If it fails:**
- Verify message format for WS transmission
- Check error handling for missing client connection

---

### 2.10 Tool Registry

Tool registry manages all available tools.

#### Test: Tool Registry

```bash
npx vitest run tests/unit/tools/registry.test.ts
```

**What it verifies:**
- Registry initialization with all 20+ tools
- Tool lookup by name
- Tool schema validation

**Expected output:**
```
✓ registry.test.ts (X tests)
  ✓ initializes with all tools
  ✓ looks up tool by name
  ✓ validates tool schemas
  ...
```

**If it fails:**
- Verify all 20 tools are registered
- Check tool schema definitions match MCP spec

---

## 3. Integration Tests — Detailed Walkthrough

Integration tests verify end-to-end scenarios combining multiple components.

### 3.1 MCP Tool Round-trip

```bash
npx vitest run tests/integration/mcp-tool-roundtrip.test.ts
```

**What it verifies:**

This is the critical test. It simulates the full flow:

1. Claude Code calls MCP tool via stdio transport
2. MCP tool handler converts to WebSocket message
3. WS message sent to UE client
4. UE client responds
5. Response converted back to MCP format
6. Claude Code receives result

**Scenario example: editor.getLevelInfo**
- Input: MCP CallTool request with method "editor-getLevelInfo"
- Processing: Converts to WS message → sends to bridge → waits for response
- Output: CallToolResult with level info in text content

**Expected output:**
```
✓ mcp-tool-roundtrip.test.ts (X tests)
  ✓ full MCP tool call round-trip succeeds
  ✓ handles WS timeout gracefully
  ✓ formats response for MCP compatibility
  ...
```

**If it fails:**
- Check WS bridge is starting before test
- Verify mock UE client is responding
- Ensure response format matches MCP CallToolResult schema

---

### 3.2 Safety Gate Integration

```bash
npx vitest run tests/integration/safety-gate.test.ts
```

**What it verifies:**

Safety classification integrated with tool execution:

1. Tool call arrives with operation type
2. classifyOperation() categorizes it (safe/warn/dangerous)
3. If dangerous, ApprovalGate blocks execution
4. Test verifies gate prevents unsafe operations

**Scenarios:**
- Safe operation (editor.ping) — allowed immediately
- Dangerous operation (blueprint.deleteNode) — blocked until approval

**Expected output:**
```
✓ safety-gate.test.ts (X tests)
  ✓ allows safe operations
  ✓ blocks dangerous operations without approval
  ✓ allows dangerous operations with approval
  ✓ gates file write operations
  ...
```

**If it fails:**
- Verify classifyOperation categories are correct
- Check ApprovalGate is properly integrated in tool handlers

---

### 3.3 Reconnection Handling

```bash
npx vitest run tests/integration/reconnection.test.ts
```

**What it verifies:**

Connection resilience when UE client drops:

1. UE client connects to WS bridge
2. Connection drops unexpectedly
3. Bridge detects disconnection
4. Pending requests timeout gracefully
5. New connection accepted

**Scenarios:**
- Client disconnect and immediate reconnect
- Request pending when client disconnects
- Multiple reconnection attempts

**Expected output:**
```
✓ reconnection.test.ts (X tests)
  ✓ handles client disconnect
  ✓ reconnects after disconnect
  ✓ pending requests timeout on disconnect
  ✓ accepts new client after disconnect
  ...
```

**If it fails:**
- Check WebSocket close event handling
- Verify timeout mechanism triggers on disconnect
- Ensure bridge doesn't block new connections after old one closes

---

### 3.4 Approval WebSocket Flow

```bash
npx vitest run tests/integration/approval-ws-flow.test.ts
```

**What it verifies:**

Full WebSocket-based approval flow from request to response:

1. ApprovalGate sends WS message to UE: `safety.requestApproval`
2. UE plugin shows dialog to user
3. User clicks "Approve" or "Reject"
4. UE sends WS response: `safety.approvalResponse`
5. ApprovalGate resolves promise with user choice
6. Tool execution continues or is aborted

**Scenarios:**
- User approves dangerous operation — executes
- User rejects dangerous operation — returns error
- Approval request times out — operation denied

**Expected output:**
```
✓ approval-ws-flow.test.ts (5 tests)
  ✓ sends safety.requestApproval message to UE
  ✓ resolves when user approves
  ✓ rejects when user denies
  ✓ times out after deadline
  ✓ includes operation context in request
```

**If it fails:**
- Check mock client setApprovalResponse() is being called
- Verify WS message contains proper approval context
- Ensure timeout countdown works correctly

---

## 4. Coverage Report

Generate and review test coverage.

### 4.1 Generate Coverage Report

```bash
npm run test:coverage
```

**Expected output:**
```
✓ coverage report generated

Coverage Summary:
---
Statements:   85%+ coverage
Branches:     80%+ coverage
Functions:    85%+ coverage
Lines:        85%+ coverage

HTML report:  mcp-server/coverage/index.html
```

### 4.2 Review Coverage Details

Open the HTML report in a browser:

```bash
open coverage/index.html
```

Or view the text summary:

```bash
npm run test:coverage 2>&1 | grep -A 20 "Coverage Summary"
```

**What to look for:**
- **Statements**: Code coverage % (lines executed)
- **Branches**: Coverage of if/else paths
- **Functions**: All exported functions covered
- **Lines**: Total line coverage

**Target thresholds:**
- Statements: 85%+
- Branches: 80%+
- Functions: 85%+
- Lines: 85%+

**If coverage is low:**
- Red files in report need more tests
- Add tests for uncovered branches
- Check integration test coverage of error paths

---

## 5. Type Safety Verification

Verify TypeScript strict mode catches all type errors.

### 5.1 Run Type Checker

```bash
npm run typecheck
```

**Expected output:**
```
No type errors!
```

**What it checks:**
- Strict null safety (`strictNullChecks`)
- Type narrowing in conditionals
- Function parameter types
- Generic type constraints
- Unused variables and imports

**If there are errors:**

```bash
npm run typecheck 2>&1 | head -20
```

Shows first 20 errors. Fix each one:

```
src/tools/myTool.ts:42:5 - error TS2339: Property 'xyz' does not exist on type 'Foo'
```

Fix by reviewing that line and correcting the type.

---

## 6. Build Verification

Verify TypeScript compilation to JavaScript.

### 6.1 Clean Build

```bash
rm -rf dist/
npm run build
```

**Expected output:**
```
✓ Successfully compiled X files
✓ dist/ directory created with .js and .d.ts files
```

**Check build artifacts:**

```bash
ls -lah dist/
```

Should show `.js` files for each `.ts` source file, plus `.d.ts` type definitions.

### 6.2 Verify Source Maps

```bash
ls dist/*.js.map 2>/dev/null && echo "Source maps generated" || echo "No source maps"
```

Source maps help debug compiled code (optional, but nice to have).

---

## 7. Manual Integration Test — MCP Server Startup

Test the live server without UE client to verify basic connectivity.

### 7.1 Build and Start Server

```bash
npm run build
node dist/index.js
```

**Expected console output (stderr, not stdout):**

```
[info] Starting Unreal Master Agent MCP Bridge Server
[info] WebSocket bridge listening on port 9877
[info] MCP Bridge Server connected via stdio transport
```

**Critical:** stdout must be completely silent (JSON-RPC messages only).

### 7.2 Verify Ports

In another terminal, check if port 9877 is listening:

```bash
lsof -i :9877
```

Expected output:
```
COMMAND   PID  USER  FD  TYPE DEVICE SIZE/OFF NODE NAME
node      XXX  USER   45  IPv4  XXXXX      0t0  *:9877 (LISTEN)
```

If port is already in use, specify a different port:

```bash
UE_WS_PORT=9878 node dist/index.js
```

### 7.3 Connect WebSocket Client

In another terminal, install and use wscat:

```bash
npm install -g wscat
wscat -c ws://localhost:9877
```

You should see:
```
Connected (press CTRL+C to quit)
>
```

### 7.4 Send Test Message

Send a ping request (UE client not connected, should timeout):

```json
{"id":"test-1","method":"editor.ping","params":{},"timestamp":1234567890}
```

After paste, press Enter. Expected result after ~2 seconds:

```json
{"id":"test-1","error":{"code":-32603,"message":"No UE client connected"}}
```

This is correct — the server is working but no UE plugin is attached.

### 7.5 Verify Stdout Cleanliness

In the server terminal, check that NO text output appears except the initial startup logs on stderr. If you see anything else on stdout, that's a bug.

Test with:

```bash
node dist/index.js 2>/dev/null | head -1
```

Should output nothing (empty output). If anything appears, stdout is contaminated.

### 7.6 Shutdown

In the wscat terminal, press `Ctrl+C` to disconnect.
In the server terminal, press `Ctrl+C` to stop the server.

Expected output:
```
^C
[info] Shutting down WebSocket bridge
[info] MCP server shutdown complete
```

---

## 8. C++ Tests — Unreal Engine Automation

C++ tests require UE Editor and the plugin source code.

**Status:** 9 C++ tests written, but require UE Editor environment.

### 8.1 Plugin Compilation

Ensure the plugin compiles in UE Editor:

1. Open UE 5.4+ project
2. Place plugin at `Plugins/UnrealMasterAgent/`
3. Regenerate Visual Studio project files
4. Compile plugin (Editor will auto-compile on open)

Expected: No compilation errors in `ue-plugin/Source/UnrealMasterAgentTests/`

### 8.2 Run Automation Tests from Editor

In UE Editor:

1. **Tools → Automation**
2. Filter: "UnrealMasterAgent" or "UMA"
3. Check all test names (9 tests should appear)
4. Click **Start Tests**

**Expected test names:**
```
UnrealMasterAgentTests.UMAWebSocketClient.*
UnrealMasterAgentTests.UMAMessageHandler.*
UnrealMasterAgentTests.UMAEditorQueries.*
UnrealMasterAgentTests.UMABlueprintSerializer.*
UnrealMasterAgentTests.UMABlueprintManipulator.*
UnrealMasterAgentTests.UMACompileLogParser.*
UnrealMasterAgentTests.UMALiveCodingController.*
UnrealMasterAgentTests.UMAApprovalGate.* (6 tests)
UnrealMasterAgentTests.UMAEditorSubsystem.* (4 tests)
```

All should pass (green checkmarks).

### 8.3 Command-Line Automation

Alternatively, run from command line:

```bash
cd /path/to/UE/project
/path/to/UE/Engine/Build/BatchFiles/RunUAT.sh \
  BuildPlugin -Plugin=/path/to/plugin \
  -CreateNew -TargetPlatforms=Win64
```

Then run tests:

```bash
/path/to/UE/Engine/Binaries/Linux/UE4Editor \
  -execcmds="Automation Start UnrealMasterAgent" \
  -unattended -nopause
```

### 8.4 What Tests Verify

| Test File | Verifies |
|-----------|----------|
| UMAWebSocketClientTest.cpp | WS client connection/messaging |
| UMAMessageHandlerTest.cpp | Handler registry dispatch |
| UMAEditorQueriesTest.cpp | Editor query handlers |
| UMABlueprintSerializerTest.cpp | BP serialization to JSON |
| UMABlueprintManipulatorTest.cpp | BP node CRUD operations |
| UMACompileLogParserTest.cpp | Compile error parsing |
| UMALiveCodingControllerTest.cpp | Live Coding integration |
| UMAApprovalGateTest.cpp | Approval dialog (6 tests) |
| UMAEditorSubsystemTest.cpp | Chat panel (4 tests) |

---

## 9. End-to-End Verification Checklist

Complete this checklist to confirm full system readiness.

```
TypeScript / Node.js Tests:
  [ ] npm test — 227 tests pass
  [ ] npm run typecheck — 0 errors
  [ ] npm run build — clean build, dist/ created
  [ ] npm run test:coverage — report generated

Manual Server Test:
  [ ] npm run build && node dist/index.js starts without errors
  [ ] Server logs on stderr only (no stdout pollution)
  [ ] Listens on port 9877 (or UE_WS_PORT)
  [ ] WS client can connect with wscat
  [ ] Test message times out gracefully (no UE client)

C++ Plugin Tests (requires UE Editor):
  [ ] Plugin compiles in UE 5.4+
  [ ] UE Automation shows 9 test classes
  [ ] All 9 test classes pass
  [ ] Approval dialog appears for dangerous ops
  [ ] Chat panel opens in Tools menu

System Readiness:
  [ ] All TypeScript tests pass
  [ ] All type checks pass
  [ ] Build is clean
  [ ] Server starts and listens
  [ ] C++ plugin compiles (if UE available)
  [ ] Coverage is 85%+ across domains

READY FOR: Production deployment / Claude integration
```

---

## 10. Troubleshooting

### Issue: "npm: command not found"

**Solution:** Install Node.js from https://nodejs.org/ (LTS version 20+)

```bash
node --version  # Should be v20.0.0 or higher
npm --version   # Should be 10.0.0 or higher
```

### Issue: "Port 9877 already in use"

**Solution:** Specify a different port:

```bash
UE_WS_PORT=9878 npm test
```

Or kill the existing process:

```bash
lsof -i :9877 | grep node | awk '{print $2}' | xargs kill -9
```

### Issue: "Cannot find module '@modelcontextprotocol/sdk'"

**Solution:** Reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Tests timeout at 10000ms"

**Solution:** Increase timeout or check port availability:

```bash
npx vitest run --test-timeout=20000
```

Or verify port 9877 is free:

```bash
npx lsof -i :9877
```

### Issue: "EADDRINUSE: address already in use"

**Solution:** Another server is running. Stop it:

```bash
pkill -f "node dist/index.js"
npx vitest run  # Try tests again
```

### Issue: "TypeError: Cannot read property 'on' of undefined"

**Cause:** WebSocket server failed to start (usually port in use)

**Solution:**
1. Check port availability
2. Use port 0 (random assignment) in tests — tests do this automatically
3. Review server startup logs

### Issue: "Stdout contamination error"

**Cause:** Something is logging to stdout before MCP server takes over

**Solution:** Check `src/index.ts` — `installStdoutGuard()` must be the first call

```typescript
// index.ts — MUST be first
installStdoutGuard();  // ← Install guard FIRST

// Then everything else
const logger = createLogger(...);
const bridge = new WebSocketBridge(...);
```

### Issue: "Type error TS2345 in safety.ts"

**Cause:** Type narrowing issue in ApprovalGate

**Solution:** Check that `classification` is properly typed:

```typescript
// Wrong
const approval = await gate.requestApproval(classification);

// Right
const approval = await gate.requestApproval(
  dangerousClassification as SafetyClassification,
  context
);
```

### Issue: "C++ tests don't appear in UE Automation window"

**Cause:** Tests not found or plugin not loaded

**Solution:**
1. Check plugin is in correct location: `Plugins/UnrealMasterAgent/`
2. Rebuild Visual Studio project files
3. Delete `Binaries/` and `Intermediate/` folders
4. Reopen UE Editor
5. Wait for plugin compilation to complete

### Common Test Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| All tests timeout | Port 9877 in use | Kill process, use random port |
| "Cannot find module" | Missing npm install | Run `npm install` |
| Type errors | TypeScript out of sync | Run `npm run typecheck` |
| Build fails | TypeScript errors | Fix types, run `npm run build` |
| Approval test fails | Mock client not responding | Check MockUEClient setup |
| Reconnection test fails | Event loop timing | Increase timeout slightly |

---

## Next Steps

After verification passes completely:

1. **Integration with Claude Code**: Configure MCP bridge in Claude Code settings
2. **Deploy to Production**: Package dist/ folder for distribution
3. **Monitor Logs**: Watch stderr logs for runtime errors
4. **Scale Testing**: Run load tests with multiple concurrent tool calls
5. **Documentation**: Update API docs with any new tools discovered

---

## Test Statistics Summary

| Category | Count | Status |
|----------|-------|--------|
| **Unit Tests** | 16 files | Automated via npm test |
| **Integration Tests** | 4 files | Automated via npm test |
| **Total TS Tests** | 20 files, 227 tests | All passing |
| **C++ Tests** | 9 files, ~30 tests | Requires UE Editor |
| **Coverage Target** | 85%+ | Tracked via npm test:coverage |
| **Type Safety** | Strict mode | Verified via npm typecheck |
| **Build Status** | Clean | Verified via npm build |

---

**Last Updated:** 2026-02-26
**Test Framework:** Vitest 2.0.0
**UE Version Target:** 5.4+
**Node Version:** 20+
