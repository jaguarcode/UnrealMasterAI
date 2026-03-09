# Coding Conventions and Style Guide

**Unreal Master Agent** — TypeScript MCP Bridge Server + C++ UE Plugin

This document defines the coding standards, patterns, and conventions for both the Node.js/TypeScript MCP Bridge Server (Layer 2) and the C++ Unreal Engine Plugin (Layer 3).

---

## 1. Project Overview and Structure

The Unreal Master Agent is a two-track development project:

| Track | Component | Language | Location |
|-------|-----------|----------|----------|
| **A** | MCP Bridge Server | TypeScript | `mcp-server/src/` |
| **B** | UE Agent Plugin | C++ | `UnrealMasterAgent/Source/UnrealMasterAgent/` |

Both tracks integrate at milestone boundaries and follow strict TDD discipline from the start. The project uses a 4-layer architecture where:

- **Layer 1:** Claude Code (MCP host) — not our code
- **Layer 2:** Node.js/TypeScript MCP Bridge — translates MCP to WebSocket
- **Layer 3:** C++ UE Plugin — executes operations on the GameThread
- **Layer 4:** Unreal Engine APIs — UEdGraph, Slate, ILiveCodingModule, etc.

For full architecture details, see [ARCHITECTURE.md](../../ARCHITECTURE.md).

---

## 2. TypeScript Conventions (mcp-server/)

### 2.1 Module System and Configuration

- **Use ES modules** exclusively (`"type": "module"` in `package.json`)
- Import statements must include `.js` file extensions
- All relative imports use forward slashes: `import { x } from './path/file.js'`

```typescript
// Correct
import { Logger } from '../../observability/logger.js';
import type { WebSocketBridge } from '../transport/websocket-bridge.js';

// Wrong
import { Logger } from '../observability/logger';
import { Logger } from '..\\observability\\logger';
```

### 2.2 Strict TypeScript

- **Enable TypeScript strict mode** in `tsconfig.json`
- All function parameters and return types must be explicitly typed
- Use `type` imports for types-only declarations to enable tree-shaking

```typescript
// Correct
import type { SafetyClassification } from './safety.js';
import { classifyOperation } from './safety.js';

export function checkOperation(op: string): SafetyClassification {
  return classifyOperation(op, {});
}

// Wrong
import { SafetyClassification, classifyOperation } from './safety.js';
export function checkOperation(op) { // No return type
  return classifyOperation(op, {});
}
```

### 2.3 Logging and stdout Discipline

**This is CRITICAL.** The MCP Bridge Server communicates with Claude Code over `stdout` using JSON-RPC 2.0. Any output to `stdout` will corrupt the protocol stream.

- **NEVER use `console.log()`, `console.info()`, or `console.debug()`** directly
- **All debug output must go to stderr** via the `Logger` class or `process.stderr.write()`
- The `Logger` class (in `src/observability/logger.ts`) is pre-configured to write to stderr
- Call `installStdoutGuard()` at server startup to catch any accidental console usage

```typescript
// At server entry point (src/index.ts)
import { createLogger, installStdoutGuard } from './observability/logger.js';

installStdoutGuard();
const logger = createLogger(process.env.LOG_LEVEL || 'info');

logger.info('Server starting on port 9877');
logger.error('Connection failed:', error);

// Wrong
console.log('Server starting'); // Corrupts JSON-RPC stream
```

### 2.4 Zod for Runtime Validation

All tool input parameters are validated at runtime using Zod schemas.

- Define input schemas in `src/tools/tool-schemas.ts`
- Always validate user inputs before processing
- Use descriptive schema error messages

```typescript
// In tool-schemas.ts
export const BlueprintCreateNodeInputSchema = z.object({
  blueprintCacheKey: z.string().min(1, 'Blueprint cache key required'),
  graphName: z.string(),
  nodeClass: z.string(),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
});

// In tool handler
export async function createNode(input: unknown): Promise<McpToolResult> {
  const params = BlueprintCreateNodeInputSchema.parse(input);
  // Process validated params
}
```

### 2.5 MCP Tool Handler Pattern

All tool handlers must return the standardized MCP `CallToolResult` format:

```typescript
export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResult {
  [key: string]: unknown;
  content: McpTextContent[];
}

export async function editorPing(bridge: WebSocketBridge): Promise<McpToolResult> {
  try {
    const response = await bridge.sendRequest(msg);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ status: 'pong', result: response.result }),
      }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ status: 'error', error: message }),
      }],
    };
  }
}
```

### 2.6 Async/Await and Error Handling

- Use `async/await` for all asynchronous operations
- Always wrap async operations in `try/catch` blocks
- Return structured error responses (status: 'error', error message)
- Never let unhandled promises escape

```typescript
// Correct
async function fetchData(url: string): Promise<unknown> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to fetch: ${message}`);
  }
}

// Wrong
async function fetchData(url: string) {
  fetch(url).then(r => r.json()); // Promise not awaited
}
```

### 2.7 Testing Conventions

- **Test framework:** Vitest
- **Test file location:** `tests/unit/<domain>/<file>.test.ts` for unit tests, `tests/integration/<file>.test.ts` for integration tests
- **Test naming:** Use descriptive `describe()` blocks and `it()` statements
- **Mock external dependencies:** Use `vi.mock()` for external modules, `vi.spyOn()` for functions

```typescript
// File: tests/unit/state/safety.test.ts
import { describe, it, expect, vi } from 'vitest';
import { classifyOperation, isPathSafe } from '../../../src/state/safety.js';

describe('classifyOperation', () => {
  it('classifies editor-ping as "safe"', () => {
    const result = classifyOperation('editor-ping', {});
    expect(result.level).toBe('safe');
    expect(result.requiresApproval).toBe(false);
  });

  it('classifies blueprint-deleteNode as "dangerous" requiring approval', () => {
    const result = classifyOperation('blueprint-deleteNode', {});
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });
});
```

### 2.8 Naming Conventions

- **Files:** kebab-case (e.g., `websocket-bridge.ts`, `cache-store.ts`)
- **Classes:** PascalCase (e.g., `WebSocketBridge`, `ApprovalGate`, `CacheStore`)
- **Functions:** camelCase (e.g., `createLogger()`, `classifyOperation()`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS`)
- **Types and Interfaces:** PascalCase (e.g., `McpToolResult`, `SafetyClassification`)

```typescript
// Correct
export const MAX_CACHE_ENTRIES = 1000;
export const DEFAULT_TTL_MS = 60000;

export interface SafetyClassification {
  level: 'safe' | 'warn' | 'dangerous';
  requiresApproval: boolean;
}

export class CacheStore {
  private maxEntries: number;

  public get(key: string): unknown | undefined {
    // implementation
  }
}
```

### 2.9 Code Comments and Documentation

- Add JSDoc comments to all public functions and classes
- Comments should explain **why**, not just **what**
- Use inline comments sparingly; prefer clear code over comments
- Document critical constraints and gotchas

```typescript
/**
 * Classify an operation's safety level based on tool name and parameters.
 *
 * - safe: read-only queries that never mutate state
 * - warn: mutations that are generally recoverable (create, connect, modify)
 * - dangerous: destructive or production-impacting writes (delete, file writes to /Content/)
 *
 * @param toolName - The MCP tool being invoked
 * @param params - Tool input parameters
 * @returns A SafetyClassification with level and requiresApproval flag
 */
export function classifyOperation(
  toolName: string,
  params: Record<string, unknown>,
): SafetyClassification {
  // ...
}

// CRITICAL: stdout is sacred — every JSON-RPC message must be properly formatted
// or the protocol stream is corrupted
```

### 2.10 Dependencies

**Required versions:**

- Node.js 20+
- TypeScript 5.5+
- @modelcontextprotocol/sdk ^1.12.0
- ws ^8.18.0
- zod ^3.23.0
- uuid ^9.0.0
- vitest ^2.0.0

Keep dependencies minimal and pinned to specific versions. All dependencies must be security-reviewed before adding.

---

## 3. C++ Conventions (UnrealMasterAgent/)

### 3.1 Naming Conventions and Class Prefixes

Unreal Engine uses prefix conventions to distinguish class types:

| Prefix | Type | Example |
|--------|------|---------|
| `F` | Non-UObject structs and classes | `FUMABlueprintManipulator` |
| `U` | UObject-derived classes | `UUMAEditorSubsystem` |
| `S` | Slate widget classes | `SUMAChatPanel` |
| `I` | Abstract interfaces | `IUMAHandler` |

**Unreal Master Agent prefix:** All classes use the `UMA` prefix:

```cpp
// Non-UObject helper
class FUMABlueprintSerializer { /* ... */ };

// UObject (editor subsystem)
class UUMAEditorSubsystem : public UEditorSubsystem { /* ... */ };

// Slate widget
class SUMAChatPanel : public SCompoundWidget { /* ... */ };
```

### 3.2 GameThread Dispatch Requirement

**All UE API calls that touch the editor state MUST run on the GameThread.** This includes:

- UEdGraph manipulation (node creation, pin connection)
- Blueprint loading/saving
- Slate UI updates
- Live Coding triggers
- Asset registry queries

Use `AsyncTask()` to dispatch from the WebSocket callback thread to the GameThread:

```cpp
void FUMAMessageHandler::OnMessageReceived(const FUMAWSMessage& Message)
{
    // WebSocket callback runs on background thread
    if (Message.Method == TEXT("blueprint.createNode"))
    {
        // CRITICAL: Dispatch to GameThread
        AsyncTask(ENamedThreads::GameThread, [this, Message]()
        {
            FString OutError;
            FUMABlueprintManipulator Manipulator;
            bool bSuccess = Manipulator.CreateNode(
                Message.BlueprintPath,
                Message.NodeClass,
                OutError
            );
            // Now safe to call UE APIs
        });
    }
}
```

### 3.3 TryCreateConnection for Pin Linking

**ALWAYS use `TryCreateConnection()` for pin linking. NEVER use `MakeLinkTo()`.**

`TryCreateConnection()` respects polymorphic pin type propagation, while `MakeLinkTo()` can create invalid type mismatches.

```cpp
// Correct
bool FUMABlueprintManipulator::ConnectPins(
    UEdGraphPin* OutPin,
    UEdGraphPin* InPin,
    FString& OutError)
{
    // Use TryCreateConnection (polymorphic, safe)
    const UEdGraphSchema* Schema = OutPin->GetOwningNode()->GetGraph()->GetSchema();
    if (Schema->TryCreateConnection(OutPin, InPin))
    {
        return true;
    }
    OutError = TEXT("Pin connection failed");
    return false;
}

// Wrong
OutPin->MakeLinkTo(InPin); // Can create type mismatches
```

### 3.4 Handler Pattern and Delegate Registration

Handlers are registered as `FOnUMAHandleMethod` delegates in the plugin's startup module:

```cpp
// In UnrealMasterAgent.cpp (FUnrealMasterAgentModule)
void FUnrealMasterAgentModule::StartupModule()
{
    if (UUMAEditorSubsystem* Subsystem = GEditor->GetEditorSubsystem<UUMAEditorSubsystem>())
    {
        // Register handler delegates
        Subsystem->RegisterHandler(
            TEXT("editor.ping"),
            FOnUMAHandleMethod::CreateStatic(&FUMAEditorQueries::HandlePing)
        );

        Subsystem->RegisterHandler(
            TEXT("blueprint.serialize"),
            FOnUMAHandleMethod::CreateStatic(&FUMABlueprintSerializer::HandleSerialize)
        );

        Subsystem->RegisterHandler(
            TEXT("blueprint.createNode"),
            FOnUMAHandleMethod::CreateStatic(&FUMABlueprintManipulator::HandleCreateNode)
        );

        // Register 17 handlers total
    }
}
```

**Handler signature:**

```cpp
// All handlers follow this signature
static void HandleMethodName(
    const FUMAWSMessage& Request,
    FUMAWSResponse& OutResponse
);

// Implementation
void FUMABlueprintSerializer::HandleSerialize(
    const FUMAWSMessage& Request,
    FUMAWSResponse& OutResponse)
{
    // Parse request parameters
    FString BlueprintPath = Request.Params.FindRef(TEXT("assetPath"));

    // Execute operation on GameThread (if needed)
    FString JsonAst;
    if (FUMABlueprintSerializer::Serialize(BlueprintPath, JsonAst))
    {
        OutResponse.Status = TEXT("ok");
        OutResponse.Result = JsonAst;
    }
    else
    {
        OutResponse.Status = TEXT("error");
        OutResponse.Error = TEXT("Serialization failed");
    }
}
```

### 3.5 Logging in C++

- Use `UE_LOG()` macro with appropriate log categories
- Prefix messages with `[UMA]` for visibility
- Use appropriate log levels: `Log`, `Warning`, `Error`

```cpp
#include "Logging/LogMacros.h"

// Typical usage
UE_LOG(LogTemp, Log, TEXT("[UMA] Blueprint loaded: %s"), *BlueprintPath);
UE_LOG(LogTemp, Warning, TEXT("[UMA] Node not found: %s"), *NodeName);
UE_LOG(LogTemp, Error, TEXT("[UMA] Failed to connect pins: %s"), *ErrorMessage);
```

### 3.6 Memory Management and Smart Pointers

- UObjects are garbage-collected; use plain pointers
- Use `TSharedPtr<T>` for non-UObject heap allocations
- Use `TUniquePtr<T>` for exclusive ownership
- Always check validity before dereferencing

```cpp
// UObject pointers (garbage-collected)
UBlueprint* Blueprint = LoadObject<UBlueprint>(nullptr, *BlueprintPath);
if (!Blueprint)
{
    UE_LOG(LogTemp, Error, TEXT("[UMA] Blueprint not found"));
    return false;
}

// Non-UObject shared ownership
TSharedPtr<FUMABlueprintManipulator> Manipulator =
    MakeShared<FUMABlueprintManipulator>();

// Non-UObject exclusive ownership
TUniquePtr<FUMACompileLogParser> Parser =
    MakeUnique<FUMACompileLogParser>();
```

### 3.7 String Handling

- Use `FString` for mutable Unicode strings
- Use `FText` for user-facing UI text
- Use `FName` for identifiers and lookups
- Use `TCHAR*` with `TEXT()` macro for string literals

```cpp
// Correct
FString FilePath = TEXT("/Game/Blueprints/BP_TestActor");
FText DisplayName = FText::FromString(FilePath);
FName GraphName = FName(TEXT("EventGraph"));

// Wrong
std::string FilePath = "/Game/Blueprints/BP_TestActor"; // Avoid std::string in UE
const char* NodeName = "PrintString"; // Not Unicode-aware
```

### 3.8 Error Handling and Return Values

Return operation success as `bool` with an `OutError` parameter:

```cpp
// Pattern
bool OperationName(
    const FString& Param,
    FString& OutError)
{
    // Validate input
    if (Param.IsEmpty())
    {
        OutError = TEXT("Parameter is empty");
        return false;
    }

    // Attempt operation
    if (!TryOperation(Param))
    {
        OutError = TEXT("Operation failed: reason");
        return false;
    }

    return true;
}

// Usage
FString Error;
if (!CreateNode(NodeClass, Error))
{
    UE_LOG(LogTemp, Error, TEXT("[UMA] %s"), *Error);
}
```

### 3.9 Testing Conventions

- **Test framework:** UE Automation Framework (`IMPLEMENT_SIMPLE_AUTOMATION_TEST`)
- **Test module:** `UnrealMasterAgentTests`
- **Test naming:** `"UnrealMasterAgent.Category.TestName"` (dot-separated)

```cpp
// File: UnrealMasterAgentTests/Private/UMABlueprintManipulatorTest.cpp
#include "CoreMinimal.h"
#include "Misc/AutomationTest.h"
#include "Blueprint/UMABlueprintManipulator.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FUMABlueprintManipulatorLoadTest,
    "UnrealMasterAgent.Blueprint.Load",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter
)

bool FUMABlueprintManipulatorLoadTest::RunTest(const FString& Parameters)
{
    // Arrange
    FString BlueprintPath = TEXT("/Game/TestBlueprints/BP_Test");
    FString Error;

    // Act
    UBlueprint* BP = FUMABlueprintManipulator::LoadBlueprintFromPath(BlueprintPath, Error);

    // Assert
    TestTrue(TEXT("Blueprint loaded"), BP != nullptr);
    TestEqual(TEXT("Error is empty"), Error, FString());

    return true;
}
```

Run tests headlessly:

```bash
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent" \
  -unattended -nopause -nullrhi
```

### 3.10 Build Configuration

Module dependencies are defined in `UnrealMasterAgent.Build.cs`:

```csharp
public class UnrealMasterAgent : ModuleRules
{
    public UnrealMasterAgent(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "WebSockets",
            "Json",
            "JsonUtilities"
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "UnrealEd",
            "BlueprintGraph",
            "KismetCompiler",
            "Slate",
            "SlateCore",
            "EditorSubsystem",
            "Networking",
            "Sockets",
            "WorkspaceMenuStructure",
            "LiveCoding",
            "InputCore",
            "AssetRegistry"
        });
    }
}
```

Do not add unnecessary dependencies. Always justify new module dependencies in code comments.

---

## 4. Testing Conventions

### 4.1 Test-Driven Development (TDD)

All code changes must follow TDD discipline:

1. **Write a failing test first** that describes the desired behavior
2. **Implement the minimum code** to make the test pass
3. **Refactor** for clarity and performance

```typescript
// Step 1: Write failing test
describe('SafetyGate', () => {
  it('rejects dangerous operations in test mode', async () => {
    const gate = new ApprovalGate();
    gate.setAutoResponse('reject');

    const result = await gate.requestApproval({
      level: 'dangerous',
      requiresApproval: true,
      reason: 'Test reason',
    });

    expect(result).toBe(false);
  });
});

// Step 2: Implement
export class ApprovalGate {
  private autoResponse: 'approve' | 'reject' | null = null;

  setAutoResponse(response: 'approve' | 'reject' | null): void {
    this.autoResponse = response;
  }

  async requestApproval(classification: SafetyClassification): Promise<boolean> {
    if (this.autoResponse === 'reject') return false;
    if (this.autoResponse === 'approve') return true;
    // ... rest of logic
  }
}
```

### 4.2 Unit vs. Integration Tests

- **Unit tests** (`tests/unit/`): Test isolated functions and classes without external dependencies (mocked or stubbed)
- **Integration tests** (`tests/integration/`): Test interaction between components and with real WebSocket connections

```typescript
// Unit test: isolated safety classification
describe('classifyOperation', () => {
  it('identifies dangerous file writes to /Content/', () => {
    const result = classifyOperation('file-write', {
      filePath: '/Game/Content/Blueprints/BP_Test.uasset'
    });
    expect(result.level).toBe('dangerous');
    expect(result.requiresApproval).toBe(true);
  });
});

// Integration test: full approval flow with WebSocket
describe('approval-ws-flow', () => {
  it('sends approval request and receives response', async () => {
    const server = new TestWebSocketServer();
    const bridge = new WebSocketBridge(server);
    const gate = new ApprovalGate(1000, bridge);

    // Simulate UE plugin sending approval
    server.on('message', (msg) => {
      if (msg.method === 'safety.requestApproval') {
        server.send({ id: msg.id, result: { approved: true } });
      }
    });

    const result = await gate.requestApproval({
      level: 'dangerous',
      requiresApproval: true,
      reason: 'Test',
    });

    expect(result).toBe(true);
  });
});
```

### 4.3 Mocking and Test Doubles

- Mock external WebSocket connections with `vi.mock()`
- Spy on function calls with `vi.spyOn()`
- Use `beforeEach()` and `afterEach()` for test setup and cleanup

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('WebSocketBridge', () => {
  let mockWs: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockWs = vi.fn();
    vi.mock('ws', () => ({
      WebSocket: mockWs
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connects and sends message', async () => {
    const bridge = new WebSocketBridge();
    expect(mockWs).toHaveBeenCalledWith('ws://localhost:9877');
  });
});
```

---

## 5. Git Workflow

### 5.1 Branching Strategy

- **Main branch:** `main` (stable, tested)
- **Feature branches:** `feature/us-###-description` (user story tracking)
- **Bugfix branches:** `fix/issue-description`
- **Release branches:** `release/v0.1.0`

```bash
# Create feature branch from main
git checkout -b feature/us-021-approval-dialog

# Work, test, commit
git add .
git commit -m "feat: implement Slate approval dialog"

# Push and create PR
git push -u origin feature/us-021-approval-dialog
```

### 5.2 Commit Message Format

All commit messages follow this format:

```
<type>: <subject>

<optional body with more details>

<optional issue/story reference>
```

**Types:**

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code restructuring (no behavior change)
- `test:` Test additions or fixes
- `chore:` Build, dependency, or CI changes

**Examples:**

```bash
# Feature
git commit -m "feat: implement blueprint node deletion with safety gate"

# Bugfix
git commit -m "fix: handle null blueprint pointer in serializer"

# Documentation
git commit -m "docs: add pin connection safety guidelines"

# TDD commits
git commit -m "test: add failing test for approval timeout (TDD)"
git commit -m "feat: implement approval timeout logic"
```

### 5.3 Pre-Commit Checks

Before committing TypeScript code, run:

```bash
cd mcp-server
npm run typecheck    # Verify types
npm test             # Run all tests
npm run lint         # Check style (if enabled)
```

Never commit code with failing type checks or tests.

---

## 6. Safety and Error Handling Conventions

### 6.1 Safety Classification System

All MCP tools are classified by risk level:

| Level | Characteristics | Approval Required |
|-------|-----------------|-------------------|
| `safe` | Read-only queries; no state mutation | No |
| `warn` | Mutations (create, modify); generally recoverable | No |
| `dangerous` | Destructive (delete nodes) or production writes | Yes |

**Safe tools:** `editor-ping`, `editor-getLevelInfo`, `blueprint-serialize`, `file-read`, `compilation-getStatus`

**Warn tools:** `blueprint-createNode`, `blueprint-connectPins`, `blueprint-modifyProperty`, `compilation-trigger`

**Dangerous tools:** `blueprint-deleteNode`, `file-write` to `/Content/`, `safety-requestApproval`

```typescript
// Classify operations
const classification = classifyOperation('blueprint-deleteNode', {});
// Returns: { level: 'dangerous', requiresApproval: true, reason: 'Destructive Blueprint operation' }

// Gate dangerous operations
const gate = new ApprovalGate();
const approved = await gate.requestApproval(classification, {
  toolName: 'blueprint-deleteNode',
});

if (!approved) {
  return { error: 'Operation rejected by user' };
}
```

### 6.2 Error Code Taxonomy

Error codes are 4-digit integers in ranges:

| Range | Category |
|-------|----------|
| 1000-1099 | WebSocket connection errors |
| 1100-1199 | Message codec errors |
| 2000-2099 | Blueprint serialization errors |
| 2100-2199 | Blueprint manipulation errors |
| 2200-2299 | Pin connection errors |
| 3000-3099 | Compilation errors |
| 4000-4099 | File operation errors |
| 5000-5099 | Safety gate / approval errors |
| 6000-6099 | Editor query errors |

All error responses must include a numeric error code:

```typescript
// Error response format
{
  status: 'error',
  errorCode: 2201,
  error: 'Pin connection failed: type mismatch',
}

// In C++
OutResponse.Status = TEXT("error");
OutResponse.ErrorCode = 2201;
OutResponse.Error = TEXT("Pin connection failed: type mismatch");
```

### 6.3 Path Traversal Protection

File operations must validate paths against a whitelist of allowed roots:

```typescript
import { isPathSafe } from '../state/safety.js';

const allowedRoots = [
  '/Game/Blueprints/',
  '/Game/Content/',
  '/Source/',
];

if (!isPathSafe(userPath, allowedRoots)) {
  return {
    status: 'error',
    errorCode: 4001,
    error: 'Path is outside allowed project roots or contains path traversal',
  };
}
```

---

## 7. Common Pitfalls to Avoid

### 7.1 TypeScript Pitfalls

**Pitfall: Using console.log() in the MCP server**

The MCP server uses `stdout` for JSON-RPC messages. Any console output corrupts the stream.

```typescript
// Wrong
console.log('Debug message');  // Corrupts JSON-RPC
process.stdout.write('text');   // Same problem

// Correct
const logger = createLogger();
logger.debug('Debug message');  // Goes to stderr
process.stderr.write('text');   // Safe
```

**Pitfall: Forgetting `.js` file extensions in ES module imports**

TypeScript imports without extensions work during compilation but fail at runtime.

```typescript
// Wrong
import { foo } from './helpers.ts';
import { bar } from './utils';

// Correct
import { foo } from './helpers.js';
import { bar } from './utils.js';
```

**Pitfall: Not validating user input with Zod**

Tool input comes from Claude Code and must be validated before use.

```typescript
// Wrong
export async function modifyProperty(input: any): Promise<McpToolResult> {
  const { nodeId, propertyName } = input;
  // No validation — nodeId could be undefined
}

// Correct
export async function modifyProperty(input: unknown): Promise<McpToolResult> {
  const params = BlueprintModifyPropertyInputSchema.parse(input);
  const { nodeId, propertyName } = params; // Fully typed and validated
}
```

### 7.2 C++ Pitfalls

**Pitfall: Calling UE APIs from the WebSocket thread**

UE editor APIs are not thread-safe. All calls must run on the GameThread.

```cpp
// Wrong
WebSocket->OnMessage().AddLambda([this](const FString& Msg)
{
    UBlueprint* BP = LoadObject<UBlueprint>(nullptr, *Path); // Wrong thread!
});

// Correct
WebSocket->OnMessage().AddLambda([this](const FString& Msg)
{
    AsyncTask(ENamedThreads::GameThread, [this, Msg]()
    {
        UBlueprint* BP = LoadObject<UBlueprint>(nullptr, *Path); // GameThread
    });
});
```

**Pitfall: Using MakeLinkTo() instead of TryCreateConnection()**

`MakeLinkTo()` does not respect polymorphic pin types and can create invalid connections.

```cpp
// Wrong
OutPin->MakeLinkTo(InPin);  // Can create type mismatches

// Correct
const UEdGraphSchema* Schema = OutPin->GetOwningNode()->GetGraph()->GetSchema();
Schema->TryCreateConnection(OutPin, InPin);  // Validates pin types
```

**Pitfall: Not checking pointer validity before dereferencing**

UE pointers can become invalid if the referenced object is deleted.

```cpp
// Wrong
UBlueprint* BP = GetBlueprint();
UEdGraph* Graph = BP->UbergraphPages[0];  // BP could be null!

// Correct
UBlueprint* BP = GetBlueprint();
if (!BP)
{
    OutError = TEXT("Blueprint is null");
    return false;
}
if (BP->UbergraphPages.IsEmpty())
{
    OutError = TEXT("No graphs in blueprint");
    return false;
}
UEdGraph* Graph = BP->UbergraphPages[0];
```

**Pitfall: Forgetting the [UMA] prefix in log messages**

Logs without the prefix are harder to filter and debug.

```cpp
// Wrong
UE_LOG(LogTemp, Log, TEXT("Blueprint loaded"));

// Correct
UE_LOG(LogTemp, Log, TEXT("[UMA] Blueprint loaded: %s"), *BlueprintPath);
```

### 7.3 Testing Pitfalls

**Pitfall: Writing integration tests without mocking external services**

Integration tests that depend on real WebSocket connections become flaky and slow.

```typescript
// Wrong
it('sends message to UE', async () => {
  const bridge = new WebSocketBridge('ws://localhost:9877');
  // Test fails if UE is not running
});

// Correct
it('sends message to UE', async () => {
  const mockServer = new TestWebSocketServer();
  const bridge = new WebSocketBridge(mockServer);
  // Test runs independently
});
```

**Pitfall: Writing tests that depend on execution order**

Tests should be independent and runnable in any order.

```typescript
// Wrong
let sharedState: string;

it('test 1', () => {
  sharedState = 'value';
  expect(sharedState).toBe('value');
});

it('test 2', () => {
  expect(sharedState).toBe('value');  // Fails if test 1 doesn't run first
});

// Correct
it('test 1', () => {
  const state = 'value';
  expect(state).toBe('value');
});

it('test 2', () => {
  const state = 'value';
  expect(state).toBe('value');
});
```

**Pitfall: Not cleaning up resources in afterEach()**

Tests that don't clean up can interfere with subsequent tests.

```typescript
// Wrong
it('connects WebSocket', async () => {
  const bridge = new WebSocketBridge();
  // Bridge never disconnected
});

// Correct
afterEach(() => {
  bridge?.disconnect();
  vi.clearAllMocks();
});

it('connects WebSocket', async () => {
  const bridge = new WebSocketBridge();
  // Cleaned up in afterEach
});
```

---

## 8. Self-Healing and Retry Logic

The self-healing loop is **Claude's responsibility**, not the server's. The server provides atomic operations; Claude orchestrates retry logic.

**Hard cap:** Maximum 3 retry loops for any operation.

```typescript
// Claude's self-healing pattern
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    // Attempt operation
    const result = await triggerCompilation();

    if (result.status === 'error') {
      const errors = await getCompileErrors();

      // Attempt to fix
      const fixed = await fixCompileErrors(errors);
      if (!fixed) {
        throw new Error('Could not auto-fix errors');
      }

      attempt++;
      continue;
    }

    return result;  // Success
  } catch (err) {
    attempt++;
  }
}

throw new Error('Failed after 3 retry attempts');
```

The server should not attempt automatic retry — it should fail fast and return detailed error information to Claude.

---

## 9. Caching Conventions

The `CacheStore` implements an LRU (Least Recently Used) cache:

- **Capacity:** 1000 entries
- **TTL:** 60 seconds per entry
- **Keys:** BlueprintCacheKey (from `blueprint.serialize`)
- **Values:** Serialized Blueprint JSON AST

```typescript
// Usage
const cache = new CacheStore(1000, 60000);

// Store serialized blueprint
cache.set('bp-123', blueprintAst);

// Retrieve from cache
const cached = cache.get('bp-123');

// Check if key is cached
if (cache.has('bp-123')) {
  // Use cached value
}

// Clear entry
cache.delete('bp-123');

// Clear all
cache.clear();
```

Leverage caching to avoid re-serializing blueprints on every tool call, but always invalidate the cache after mutations (node creation, pin connection, etc.).

```typescript
// Invalidate cache after blueprint mutation
export async function createNode(params: unknown): Promise<McpToolResult> {
  const input = BlueprintCreateNodeInputSchema.parse(params);

  // ... create node logic ...

  // Invalidate cache for this blueprint
  cache.delete(input.blueprintCacheKey);

  return { status: 'ok', ... };
}
```

---

## 10. Documentation Requirements

All public APIs must include:

1. **JSDoc comments** for TypeScript functions and classes
2. **Inline documentation** for complex logic
3. **Usage examples** in comments or tests
4. **Error codes** and conditions

```typescript
/**
 * Connect two pins in a Blueprint graph.
 *
 * This function uses TryCreateConnection to ensure polymorphic pin type
 * propagation. Never use MakeLinkTo as it can create invalid type mismatches.
 *
 * @param blueprintCacheKey - Cache key from blueprint.serialize
 * @param sourcePinId - GUID of the output pin
 * @param targetPinId - GUID of the input pin
 * @returns MCP result with status 'ok' or 'error'
 *
 * Error codes:
 * - 2200: Blueprint not found in cache
 * - 2201: Source or target pin not found
 * - 2202: Pin connection failed (type mismatch)
 *
 * Example:
 * ```typescript
 * const result = await connectPins({
 *   blueprintCacheKey: 'bp-123',
 *   sourcePinId: 'guid-1',
 *   targetPinId: 'guid-2'
 * });
 * ```
 */
export async function connectPins(input: unknown): Promise<McpToolResult> {
  // implementation
}
```

---

## Summary Checklist

Before committing code:

- [ ] All code follows strict TypeScript (or C++ standard for UE)
- [ ] All functions have JSDoc comments
- [ ] All tool handlers return MCP CallToolResult format
- [ ] All async operations are wrapped in try/catch
- [ ] All user input is validated with Zod (TypeScript)
- [ ] All UE API calls run on GameThread (C++)
- [ ] All tests pass (`npm test`)
- [ ] All types are valid (`npm run typecheck`)
- [ ] No console.log() usage — use Logger instead
- [ ] No path traversal vulnerabilities
- [ ] Commit message follows format
- [ ] Never use MakeLinkTo() — always use TryCreateConnection()
- [ ] Cache is invalidated after mutations
- [ ] Maximum 3 retry loops for self-healing

---

*For architecture details, see [ARCHITECTURE.md](../../ARCHITECTURE.md). For implementation guides, see [AGENTS.md](../../AGENTS.md).*
