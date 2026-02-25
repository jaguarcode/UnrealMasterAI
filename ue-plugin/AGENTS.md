<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-25 | Updated: 2026-02-26 -->

# UE Agent Plugin (Layer 3)

## Purpose

C++ Unreal Engine plugin that executes all UE-internal operations. Connects to the
MCP Bridge Server as a WebSocket CLIENT. All UE API calls run on the GameThread.

## Source Layout

```
ue-plugin/Source/
├── UnrealMasterAgent/              Main plugin module
│   ├── UnrealMasterAgent.Build.cs  Module build rules
│   ├── Public/
│   │   ├── UnrealMasterAgent.h     Module interface
│   │   ├── WebSocket/
│   │   │   ├── UMAWebSocketClient.h  WS client (UE connects to Node.js)
│   │   ├── UMAMessageHandler.h   Handler registry + FOnUMAHandleMethod delegate
│   │   │   └── UMAMessageTypes.h     FUMAWSMessage, FUMAWSResponse, FUMAWSError
│   │   ├── Blueprint/
│   │   │   ├── UMABlueprintSerializer.h
│   │   │   ├── UMABlueprintManipulator.h
│   │   │   └── UMABlueprintTypes.h
│   │   ├── Compilation/
│   │   │   ├── UMALiveCodingController.h
│   │   │   └── UMACompileLogParser.h
│   │   ├── Editor/
│   │   │   ├── UMAEditorQueries.h
│   │   │   ├── UMAEditorSubsystem.h   (US-022 — chat panel)
│   │   │   └── SUMAChatPanel.h        (US-022 — chat widget)
│   │   ├── FileOps/
│   │   │   └── UMAFileOperations.h
│   │   └── Safety/
│   │       └── UMAApprovalGate.h      (US-021 — approval dialog)
│   └── Private/                       Implementations (.cpp)
└── UnrealMasterAgentTests/            Automation test module
    ├── Private/
    │   ├── UMAWebSocketClientTest.cpp
    │   ├── UMAMessageHandlerTest.cpp
    │   ├── UMABlueprintSerializerTest.cpp
    │   ├── UMABlueprintManipulatorTest.cpp
    │   ├── UMACompileLogParserTest.cpp
    │   ├── UMALiveCodingControllerTest.cpp
    │   ├── UMAEditorQueriesTest.cpp
    │   ├── UMAApprovalGateTest.cpp    (US-021 — 6 tests)
    │   └── UMAEditorSubsystemTest.cpp (US-022 — 4 tests)
    └── Public/
        └── UMATestHelpers.h
```

## Key Classes

| Class | Type | Responsibility |
|-------|------|----------------|
| `FUnrealMasterAgentModule` | `IModuleInterface` | Plugin lifecycle, handler registration |
| `FUMAWebSocketClient` | RAII class | WS client connecting to Node.js |
| `FUMAMessageHandler` | RAII class | Routes by `method` via `FOnUMAHandleMethod` delegate |
| `FUMABlueprintSerializer` | Static class | `UEdGraph` → JSON AST |
| `FUMABlueprintManipulator` | Static class | Spawn nodes, connect pins, delete nodes |
| `FUMALiveCodingController` | RAII class | Wraps `ILiveCodingModule` |
| `FUMACompileLogParser` | Static class | Parses compile log output to `TArray<FUMACompileError>` |
| `FUMAEditorQueries` | Static class | Level info, actor list, asset metadata |
| `UUMAEditorSubsystem` | `UEditorSubsystem` | Chat panel tab registration (US-022) |
| `FUMAApprovalGate` | RAII class | Approval dialog lifecycle (US-021) |
| `SUMAApprovalDialog` | `SCompoundWidget` | Modal Slate approval dialog (US-021) |
| `SUMAChatPanel` | `SCompoundWidget` | Dockable chat panel widget (US-022) |

## For AI Agents

### Adding a Handler

```cpp
// In StartupModule() in UnrealMasterAgent.cpp
GMessageHandler->RegisterHandler(TEXT("my.method"),
    FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
    {
        // All code here runs on the GameThread
        FUMAWSResponse Response;
        Response.Id = Message.Id;
        TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();
        Result->SetBoolField(TEXT("ok"), true);
        Response.Result = Result;
        return Response;
    }));
```

### GameThread Dispatch

Any code path that starts on a background thread MUST dispatch to the GameThread
before touching UE APIs:

```cpp
AsyncTask(ENamedThreads::GameThread, [=]()
{
    // UE API calls are safe here
});
```

### Running Tests

```bash
# Run all plugin tests headlessly
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent" \
  -unattended -nopause -nullrhi

# Run a specific group
-ExecCmds="Automation RunTests UnrealMasterAgent.Safety"
```

### Test Pattern

```cpp
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FMyTest,
    "UnrealMasterAgent.Category.TestName",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FMyTest::RunTest(const FString& Parameters)
{
    TestTrue(TEXT("description"), expression);
    TestEqual(TEXT("description"), actual, expected);
    return true;
}
```
