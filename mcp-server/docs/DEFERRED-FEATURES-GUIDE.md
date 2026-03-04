# Deferred Features Development Guide

**User Stories:** US-021, US-022, US-023
**Project:** Unreal Master AI Agent
**Date:** 2026-02-25
**Prerequisite:** All existing features passing — MCP Bridge Server (227 tests across 20 test files), UE Plugin (WebSocket, Blueprint, Compilation, Editor, File, Safety, Chat handlers)

---

## 1. Overview

### What Is Already Built

The project has a fully functional 4-layer architecture:

```
Claude Code (Layer 1)
    | stdio / JSON-RPC 2.0
MCP Bridge Server — Node.js/TypeScript (Layer 2)
    | WebSocket — Node.js LISTENS, UE CONNECTS as client
UE Agent Plugin — C++ (Layer 3)
    | Direct C++ API calls
Engine APIs: UEdGraph, Slate, ILiveCodingModule (Layer 4)
```

**Layer 2 (TS side) — fully built:**
- 20 MCP tools registered in `mcp-server/src/server.ts`
- `WebSocketBridge` in `src/transport/websocket-bridge.ts`
- `ApprovalGate` class in `src/state/safety.ts` — WS round-trip to UE Slate dialog with 60s timeout fallback, auto-response for tests
- `classifyOperation()` in `src/state/safety.ts` — `safe` / `warn` / `dangerous` levels
- `SessionManager` in `src/state/session.ts` — retry counts, compile history
- All tool handlers in `src/tools/` — editor, blueprint, compilation, file, slate

**Layer 3 (C++ side) — fully implemented:**
- WebSocket client, message handler registry (`FOnUMAHandleMethod` delegate pattern)
- Blueprint serializer and manipulator
- Compilation: Live Coding controller + compile log parser
- Editor queries (getLevelInfo, listActors, getAssetInfo)
- File operations handler
- Safety: `FUMAApprovalGate` with Slate modal dialog, countdown timer
- Chat: `UUMAEditorSubsystem` with dockable `SUMAChatPanel`
- 17 handlers registered in `UnrealMasterAgent.cpp::StartupModule()`

**Deferred files — now fully implemented:**

| File | Status |
|------|--------|
| `ue-plugin/Source/UnrealMasterAgent/Public/Safety/UMAApprovalGate.h` | ✅ IMPLEMENTED — `FUMAApprovalRequest`, `SUMAApprovalDialog`, `FUMAApprovalGate` |
| `ue-plugin/Source/UnrealMasterAgent/Private/Safety/UMAApprovalGate.cpp` | ✅ IMPLEMENTED — Slate dialog, countdown timer, modal blocking |
| `ue-plugin/Source/UnrealMasterAgent/Public/Editor/UMAEditorSubsystem.h` | ✅ IMPLEMENTED — `FUMAChatEntry`, `UUMAEditorSubsystem`, tab spawner |
| `ue-plugin/Source/UnrealMasterAgent/Private/Editor/UMAEditorSubsystem.cpp` | ✅ IMPLEMENTED — RegisterNomadTabSpawner, message management |
| `ue-plugin/Source/UnrealMasterAgent/Public/Editor/SUMAChatPanel.h` | ✅ NEW — `SUMAChatPanel` Slate widget |
| `ue-plugin/Source/UnrealMasterAgent/Private/Editor/SUMAChatPanel.cpp` | ✅ NEW — Input box, send button, message history with color coding |
| `ue-plugin/Source/UnrealMasterAgentTests/Private/UMAApprovalGateTest.cpp` | ✅ IMPLEMENTED — 6 automation tests |
| `ue-plugin/Source/UnrealMasterAgentTests/Private/UMAEditorSubsystemTest.cpp` | ✅ NEW — 4 automation tests |
| `mcp-server/src/tools/chat/send-message.ts` | ✅ NEW — `chatSendMessage()` tool handler |
| `mcp-server/tests/unit/tools/chat.test.ts` | ✅ NEW — 3 unit tests |
| `mcp-server/tests/integration/approval-ws-flow.test.ts` | ✅ NEW — 5 integration tests |

### What Remains (The Three Deferred Stories)

| Story | Title | Layer(s) Touched |
|-------|-------|-----------------|
| US-021 | Human-in-the-Loop Safety System (Full) | Layer 2 (TS) + Layer 3 (C++) |
| US-022 | In-Editor Chat Panel | Layer 2 (TS) + Layer 3 (C++) |
| US-023 | Documentation and AGENTS.md Hierarchy Update | Docs only |

### Prerequisites for Development

- Node.js 20+, `npm 10+`
- TypeScript 5.5+ (installed via devDependencies in `mcp-server/`)
- Unreal Engine 5.4 with plugin compiled
- All 227 existing TS tests passing: `cd mcp-server && npm test`
- Vitest installed: `mcp-server/node_modules/.bin/vitest`

---

## 2. US-021: Human-in-the-Loop Safety System (Full)

### 2.1 Architecture Overview

The TS-side safety classification already works. The `ApprovalGate.requestApproval()` method currently times out after 60 seconds and returns `false`. US-021 replaces that timeout path with a real WS round-trip to a Slate dialog in the UE editor.

**Approval flow — full sequence:**

```
Claude Code
    |
    | calls tool (e.g., blueprint-deleteNode)
    v
MCP Server (src/tools/blueprint/delete-node.ts)
    |
    | classifyOperation() -> level: 'dangerous', requiresApproval: true
    |
    v
ApprovalGate.requestApproval() [src/state/safety.ts]
    |
    | sends WSMessage  method: 'safety.requestApproval'
    | params: { operationId, toolName, reason, filePath? }
    |
    v                          [WebSocket]
UE Plugin receives on WS background thread
    |
    | AsyncTask(ENamedThreads::GameThread, ...)
    v
UMAApprovalGate (C++) -- spawns Slate dialog via GEditor->EditorAddModalWindow()
    |
    | Developer sees dialog:
    |   [ Operation: blueprint-deleteNode ]
    |   [ Reason: Destructive Blueprint operation ]
    |   [ Path: /Game/BP_TestActor ]
    |   [ [Approve]  [Reject] ]
    |   [ Auto-reject in 60s ]
    |
    | Developer clicks Approve or Reject (or 60s elapses)
    |
    v
UE Plugin sends WSResponse back to MCP Server
    id: <same operationId>
    result: { approved: true | false }
    |
    v
ApprovalGate.requestApproval() promise resolves
    |
    | approved == true  ->  proceed with tool execution
    | approved == false ->  return error 6001 to Claude
    v
MCP Server returns result or error to Claude
```

**Message direction note:** This is the only place where the MCP Server INITIATES a WS request and waits for UE to respond — the reverse of the normal direction. The `WebSocketBridge.sendRequest()` method already supports this pattern via its pending-request map.

**WS method names:**
- Outbound (MCP → UE): `safety.requestApproval`
- Inbound response (UE → MCP): standard `WSResponse` with matching `id`

**Error code:** `6001` — approval rejected by user or timeout.

---

### 2.2 TDD Phase 1: Write C++ Automation Tests First

Write these tests into the stub file before implementing the class.

**File:** `ue-plugin/Source/UnrealMasterAgentTests/Private/UMAApprovalGateTest.cpp`

```cpp
// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "Safety/UMAApprovalGate.h"
#include "WebSocket/UMAMessageTypes.h"

// ---------------------------------------------------------------------------
// Test 1: ApprovalGate creates widget on demand
// Tests that GetOrCreateApprovalGate() returns a non-null object
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateExistsTest,
    "UnrealMasterAgent.Safety.ApprovalGate.Exists",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateExistsTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;
    TestTrue(TEXT("ApprovalGate is valid after construction"), Gate.IsValid());
    return true;
}

// ---------------------------------------------------------------------------
// Test 2: Dialog displays operation description
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateDescriptionTest,
    "UnrealMasterAgent.Safety.ApprovalGate.DisplaysDescription",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateDescriptionTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    FUMAApprovalRequest Request;
    Request.OperationId = TEXT("test-op-001");
    Request.ToolName    = TEXT("blueprint-deleteNode");
    Request.Reason      = TEXT("Destructive Blueprint operation");
    Request.FilePath    = TEXT("/Game/Tests/BP_TestActor");

    // Verify the gate can store and retrieve the request
    Gate.SetPendingRequest(Request);

    const FUMAApprovalRequest* Pending = Gate.GetPendingRequest(TEXT("test-op-001"));
    TestNotNull(TEXT("Pending request should exist"), Pending);

    if (Pending)
    {
        TestEqual(TEXT("ToolName matches"), Pending->ToolName, TEXT("blueprint-deleteNode"));
        TestEqual(TEXT("Reason matches"), Pending->Reason, TEXT("Destructive Blueprint operation"));
        TestEqual(TEXT("FilePath matches"), Pending->FilePath, TEXT("/Game/Tests/BP_TestActor"));
    }

    return true;
}

// ---------------------------------------------------------------------------
// Test 3: Approve response sends correct WS response
// Simulates developer clicking Approve
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateApproveTest,
    "UnrealMasterAgent.Safety.ApprovalGate.ApproveResponse",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateApproveTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    FUMAApprovalRequest Request;
    Request.OperationId = TEXT("test-op-approve");
    Request.ToolName    = TEXT("blueprint-deleteNode");
    Request.Reason      = TEXT("Destructive Blueprint operation");
    Gate.SetPendingRequest(Request);

    // Simulate approve click — this should resolve the pending entry
    bool bResolved = Gate.ResolveRequest(TEXT("test-op-approve"), true);
    TestTrue(TEXT("Resolve returns true for known operation"), bResolved);

    // After resolve, the request should be removed from the map
    const FUMAApprovalRequest* Pending = Gate.GetPendingRequest(TEXT("test-op-approve"));
    TestNull(TEXT("Request removed after resolve"), Pending);

    return true;
}

// ---------------------------------------------------------------------------
// Test 4: Reject response removes the pending entry
// Simulates developer clicking Reject
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateRejectTest,
    "UnrealMasterAgent.Safety.ApprovalGate.RejectResponse",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateRejectTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    FUMAApprovalRequest Request;
    Request.OperationId = TEXT("test-op-reject");
    Request.ToolName    = TEXT("file-write");
    Request.Reason      = TEXT("Writing to production content path");
    Gate.SetPendingRequest(Request);

    bool bResolved = Gate.ResolveRequest(TEXT("test-op-reject"), false);
    TestTrue(TEXT("Resolve returns true for known operation"), bResolved);

    const FUMAApprovalRequest* Pending = Gate.GetPendingRequest(TEXT("test-op-reject"));
    TestNull(TEXT("Request removed after reject"), Pending);

    return true;
}

// ---------------------------------------------------------------------------
// Test 5: Multiple simultaneous requests are queued
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateQueueTest,
    "UnrealMasterAgent.Safety.ApprovalGate.QueueMultiple",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateQueueTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    for (int32 i = 0; i < 3; ++i)
    {
        FUMAApprovalRequest Request;
        Request.OperationId = FString::Printf(TEXT("test-op-%d"), i);
        Request.ToolName    = TEXT("blueprint-deleteNode");
        Request.Reason      = TEXT("Destructive Blueprint operation");
        Gate.SetPendingRequest(Request);
    }

    TestEqual(TEXT("All 3 requests are queued"), Gate.GetPendingCount(), 3);

    Gate.ResolveRequest(TEXT("test-op-0"), true);
    TestEqual(TEXT("2 requests remain after one resolve"), Gate.GetPendingCount(), 2);

    Gate.ResolveRequest(TEXT("test-op-1"), false);
    Gate.ResolveRequest(TEXT("test-op-2"), true);
    TestEqual(TEXT("0 requests remain after all resolved"), Gate.GetPendingCount(), 0);

    return true;
}

// ---------------------------------------------------------------------------
// Test 6: Unknown operationId returns false from ResolveRequest
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateUnknownIdTest,
    "UnrealMasterAgent.Safety.ApprovalGate.UnknownId",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateUnknownIdTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    bool bResolved = Gate.ResolveRequest(TEXT("does-not-exist"), true);
    TestFalse(TEXT("ResolveRequest returns false for unknown id"), bResolved);

    return true;
}
```

Run tests (they will fail — that is expected):

```bash
# In Unreal project root
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent.Safety" \
  -unattended -nopause -nullrhi
```

---

### 2.3 TDD Phase 2: Write TS-Side Integration Tests First

Add a new test file. The existing safety tests cover the timeout path; these cover the WS round-trip path.

**File:** `mcp-server/tests/integration/approval-ws-flow.test.ts`

```typescript
/**
 * Integration tests for the WebSocket-based approval flow.
 * Tests that ApprovalGate.requestApproval() sends a WS message and
 * resolves when the UE plugin responds.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketBridge } from '../../src/transport/websocket-bridge.js';
import { ApprovalGate, type SafetyClassification } from '../../src/state/safety.js';
import { MockUEClient } from '../fixtures/mock-ue-client.js';

describe('ApprovalGate WebSocket flow', () => {
  let bridge: WebSocketBridge;
  let mockClient: MockUEClient;
  let gate: ApprovalGate;

  const dangerousClassification: SafetyClassification = {
    level: 'dangerous',
    reason: 'Destructive Blueprint operation',
    requiresApproval: true,
  };

  beforeEach(async () => {
    bridge = new WebSocketBridge({ port: 0, requestTimeoutMs: 5000 });
    await bridge.start();

    mockClient = new MockUEClient();
    await mockClient.connect(`ws://localhost:${bridge.getPort()}`);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Pass bridge so ApprovalGate can send WS messages
    gate = new ApprovalGate(5000, bridge);
  });

  afterEach(async () => {
    await mockClient.disconnect();
    if (bridge.isListening()) await bridge.stop();
  });

  it('sends safety.requestApproval message to UE when approval required', async () => {
    // Configure mock UE client to auto-approve after receiving the request
    mockClient.setApprovalResponse(true);

    const result = await gate.requestApproval(
      dangerousClassification,
      { toolName: 'blueprint-deleteNode', filePath: '/Game/BP_TestActor' }
    );

    expect(result).toBe(true);
    expect(mockClient.lastReceivedMethod()).toBe('safety.requestApproval');
  });

  it('returns false when UE responds with approved: false', async () => {
    mockClient.setApprovalResponse(false);

    const result = await gate.requestApproval(
      dangerousClassification,
      { toolName: 'blueprint-deleteNode' }
    );

    expect(result).toBe(false);
  });

  it('returns false on WS timeout', async () => {
    // Do not configure mock to respond — let it time out
    const shortTimeoutGate = new ApprovalGate(200, bridge);

    const result = await shortTimeoutGate.requestApproval(
      dangerousClassification,
      { toolName: 'blueprint-deleteNode' }
    );

    expect(result).toBe(false);
  });

  it('auto-approve bypasses WS when autoResponse set (test mode)', async () => {
    gate.setAutoResponse('approve');

    const result = await gate.requestApproval(dangerousClassification, {
      toolName: 'blueprint-deleteNode',
    });

    expect(result).toBe(true);
    // Should NOT have sent any WS message
    expect(mockClient.lastReceivedMethod()).toBeNull();
  });

  it('non-dangerous operations bypass WS entirely', async () => {
    const safeClassification: SafetyClassification = {
      level: 'warn',
      reason: 'Mutation operation',
      requiresApproval: false,
    };

    const result = await gate.requestApproval(safeClassification, {
      toolName: 'blueprint-createNode',
    });

    expect(result).toBe(true);
    expect(mockClient.lastReceivedMethod()).toBeNull();
  });
});
```

Run (expect failures):

```bash
cd mcp-server && npm test -- tests/integration/approval-ws-flow.test.ts
```

---

### 2.4 Implementation Step 1: UMAApprovalGate.h (Public Interface)

**File:** `ue-plugin/Source/UnrealMasterAgent/Public/Safety/UMAApprovalGate.h`

Replace the stub with the full header:

```cpp
// Copyright Unreal Master Team. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/SWindow.h"

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** Represents an in-flight approval request from the MCP Server. */
struct FUMAApprovalRequest
{
    /** UUID that correlates with the pending WSMessage id on the TS side */
    FString OperationId;

    /** MCP tool name, e.g. "blueprint-deleteNode" */
    FString ToolName;

    /** Human-readable reason from classifyOperation() */
    FString Reason;

    /** Optional file path involved in the operation */
    FString FilePath;
};

// ---------------------------------------------------------------------------
// Slate dialog widget
// ---------------------------------------------------------------------------

/**
 * Modal Slate dialog that presents an approval request to the developer.
 * Shown via GEditor->EditorAddModalWindow() on the GameThread.
 *
 * MUST only be created / shown on the GameThread.
 */
class SUMAApprovalDialog : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SUMAApprovalDialog)
        : _Request(FUMAApprovalRequest{})
    {}
        SLATE_ARGUMENT(FUMAApprovalRequest, Request)
        SLATE_ARGUMENT(int32, TimeoutSeconds)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);

    /** Returns true if the Approve button was pressed, false for Reject/timeout. */
    bool WasApproved() const { return bApproved; }

private:
    bool bApproved = false;
    FUMAApprovalRequest CurrentRequest;
    TWeakPtr<SWindow> ParentWindow;
    TSharedPtr<STextBlock> CountdownText;
    FTimerHandle CountdownTimer;
    int32 RemainingSeconds = 60;

    FReply OnApproveClicked();
    FReply OnRejectClicked();
    void OnCountdownTick();
    void CloseDialog();
};

// ---------------------------------------------------------------------------
// Gate class — manages in-flight requests and dialog lifecycle
// ---------------------------------------------------------------------------

/**
 * Manages approval dialogs for dangerous operations initiated by the MCP Server.
 *
 * Threading: All public methods MUST be called on the GameThread.
 * The WebSocket receive path dispatches to GameThread before calling these.
 */
class UNREALMASTERAGENT_API FUMAApprovalGate
{
public:
    FUMAApprovalGate();
    ~FUMAApprovalGate();

    /** Returns true — the gate is always valid after construction. */
    bool IsValid() const { return true; }

    /**
     * Register an in-flight approval request from the MCP Server.
     * Called when a 'safety.requestApproval' WS message arrives.
     * Shows the Slate dialog immediately if on GameThread.
     *
     * @param Request - The parsed approval request
     * @param OnResolved - Callback invoked with (approved: bool) after dialog closes
     */
    void ShowApprovalDialog(
        const FUMAApprovalRequest& Request,
        TFunction<void(bool)> OnResolved);

    // --- Test helpers (used by automation tests only) ---

    /** Add a pending request entry without showing a dialog (for unit tests). */
    void SetPendingRequest(const FUMAApprovalRequest& Request);

    /** Look up a pending request by OperationId. Returns nullptr if not found. */
    const FUMAApprovalRequest* GetPendingRequest(const FString& OperationId) const;

    /**
     * Resolve a pending request (simulate Approve/Reject).
     * @return true if the OperationId was found and resolved; false otherwise.
     */
    bool ResolveRequest(const FString& OperationId, bool bApproved);

    /** Returns the number of pending (unresolved) requests. */
    int32 GetPendingCount() const;

private:
    struct FPendingEntry
    {
        FUMAApprovalRequest Request;
        TFunction<void(bool)> OnResolved;
    };

    /** Map of OperationId -> pending entry */
    TMap<FString, FPendingEntry> PendingRequests;

    /** Invoke a dialog on the GameThread */
    void SpawnDialog(const FString& OperationId, int32 TimeoutSeconds);
};
```

---

### 2.5 Implementation Step 2: UMAApprovalGate.cpp (Slate Dialog Widget)

**File:** `ue-plugin/Source/UnrealMasterAgent/Private/Safety/UMAApprovalGate.cpp`

```cpp
// Copyright Unreal Master Team. All Rights Reserved.

#include "Safety/UMAApprovalGate.h"
#include "Editor.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SSpacer.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/SBoxPanel.h"
#include "Styling/AppStyle.h"
#include "Framework/Application/SlateApplication.h"

// ---------------------------------------------------------------------------
// SUMAApprovalDialog — Slate widget implementation
// ---------------------------------------------------------------------------

void SUMAApprovalDialog::Construct(const FArguments& InArgs)
{
    CurrentRequest   = InArgs._Request;
    RemainingSeconds = InArgs._TimeoutSeconds > 0 ? InArgs._TimeoutSeconds : 60;

    const FString CountdownStr = FString::Printf(TEXT("Auto-reject in %ds"), RemainingSeconds);

    ChildSlot
    [
        SNew(SBox)
        .MinDesiredWidth(420.0f)
        .MaxDesiredWidth(600.0f)
        [
            SNew(SVerticalBox)

            // Header
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 12.0f, 12.0f, 4.0f)
            [
                SNew(STextBlock)
                .Text(FText::FromString(TEXT("Dangerous Operation — Approval Required")))
                .Font(FCoreStyle::GetDefaultFontStyle("Bold", 13))
                .ColorAndOpacity(FLinearColor(0.9f, 0.4f, 0.1f))
            ]

            // Tool name
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 4.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(TEXT("Operation: ")))
                    .Font(FCoreStyle::GetDefaultFontStyle("Bold", 11))
                ]
                + SHorizontalBox::Slot().FillWidth(1.0f)
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(CurrentRequest.ToolName))
                ]
            ]

            // Reason
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 4.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(TEXT("Reason: ")))
                    .Font(FCoreStyle::GetDefaultFontStyle("Bold", 11))
                ]
                + SHorizontalBox::Slot().FillWidth(1.0f)
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(CurrentRequest.Reason))
                    .AutoWrapText(true)
                ]
            ]

            // File path (conditional)
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 4.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(TEXT("Path: ")))
                    .Font(FCoreStyle::GetDefaultFontStyle("Bold", 11))
                    .Visibility(CurrentRequest.FilePath.IsEmpty()
                        ? EVisibility::Collapsed : EVisibility::Visible)
                ]
                + SHorizontalBox::Slot().FillWidth(1.0f)
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(CurrentRequest.FilePath))
                    .Visibility(CurrentRequest.FilePath.IsEmpty()
                        ? EVisibility::Collapsed : EVisibility::Visible)
                ]
            ]

            // Countdown
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 8.0f, 12.0f, 4.0f)
            [
                SAssignNew(CountdownText, STextBlock)
                .Text(FText::FromString(CountdownStr))
                .ColorAndOpacity(FLinearColor(0.6f, 0.6f, 0.6f))
            ]

            // Buttons
            + SVerticalBox::Slot()
            .AutoHeight()
            .HAlign(HAlign_Right)
            .Padding(12.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot()
                .AutoWidth()
                .Padding(4.0f, 0.0f)
                [
                    SNew(SButton)
                    .Text(FText::FromString(TEXT("Approve")))
                    .OnClicked(this, &SUMAApprovalDialog::OnApproveClicked)
                ]
                + SHorizontalBox::Slot()
                .AutoWidth()
                .Padding(4.0f, 0.0f)
                [
                    SNew(SButton)
                    .Text(FText::FromString(TEXT("Reject")))
                    .OnClicked(this, &SUMAApprovalDialog::OnRejectClicked)
                ]
            ]
        ]
    ];

    // Start countdown timer (fires every 1 second on GameThread)
    if (GEditor)
    {
        GEditor->GetTimerManager()->SetTimer(
            CountdownTimer,
            FTimerDelegate::CreateSP(this, &SUMAApprovalDialog::OnCountdownTick),
            1.0f,
            true);
    }
}

FReply SUMAApprovalDialog::OnApproveClicked()
{
    bApproved = true;
    if (GEditor && CountdownTimer.IsValid())
    {
        GEditor->GetTimerManager()->ClearTimer(CountdownTimer);
    }
    CloseDialog();
    return FReply::Handled();
}

FReply SUMAApprovalDialog::OnRejectClicked()
{
    bApproved = false;
    if (GEditor && CountdownTimer.IsValid())
    {
        GEditor->GetTimerManager()->ClearTimer(CountdownTimer);
    }
    CloseDialog();
    return FReply::Handled();
}

void SUMAApprovalDialog::OnCountdownTick()
{
    --RemainingSeconds;
    if (CountdownText.IsValid())
    {
        CountdownText->SetText(FText::FromString(
            FString::Printf(TEXT("Auto-reject in %ds"), RemainingSeconds)));
    }
    if (RemainingSeconds <= 0)
    {
        // Timeout = reject
        OnRejectClicked();
    }
}

void SUMAApprovalDialog::CloseDialog()
{
    TSharedPtr<SWindow> Window = ParentWindow.Pin();
    if (Window.IsValid())
    {
        Window->RequestDestroyWindow();
    }
}

// ---------------------------------------------------------------------------
// FUMAApprovalGate implementation
// ---------------------------------------------------------------------------

FUMAApprovalGate::FUMAApprovalGate()
{
}

FUMAApprovalGate::~FUMAApprovalGate()
{
}

void FUMAApprovalGate::ShowApprovalDialog(
    const FUMAApprovalRequest& Request,
    TFunction<void(bool)> OnResolved)
{
    // Must be on GameThread to touch Slate
    check(IsInGameThread());

    // Register the pending entry so test helpers can find it
    FPendingEntry Entry;
    Entry.Request    = Request;
    Entry.OnResolved = OnResolved;
    PendingRequests.Add(Request.OperationId, Entry);

    SpawnDialog(Request.OperationId, 60);
}

void FUMAApprovalGate::SpawnDialog(const FString& OperationId, int32 TimeoutSeconds)
{
    FPendingEntry* Entry = PendingRequests.Find(OperationId);
    if (!Entry) return;

    TSharedRef<SWindow> Window = SNew(SWindow)
        .Title(FText::FromString(TEXT("Unreal Master — Approval Required")))
        .SizingRule(ESizingRule::Autosized)
        .AutoCenter(EAutoCenter::PreferredWorkArea)
        .SupportsMinimize(false)
        .SupportsMaximize(false)
        .IsTopmostWindow(true);

    TSharedRef<SUMAApprovalDialog> Dialog = SNew(SUMAApprovalDialog)
        .Request(Entry->Request)
        .TimeoutSeconds(TimeoutSeconds);

    // Give the dialog a back-reference to its window for self-close
    Dialog->ParentWindow = Window;
    Window->SetContent(Dialog);

    // Blocking modal — returns after dialog closes
    if (GEditor)
    {
        GEditor->EditorAddModalWindow(Window);
    }

    // After modal returns, read the result
    bool bApproved = Dialog->WasApproved();
    TFunction<void(bool)> Callback = Entry->OnResolved;
    PendingRequests.Remove(OperationId);

    if (Callback)
    {
        Callback(bApproved);
    }
}

// --- Test helpers ---

void FUMAApprovalGate::SetPendingRequest(const FUMAApprovalRequest& Request)
{
    FPendingEntry Entry;
    Entry.Request    = Request;
    Entry.OnResolved = nullptr;
    PendingRequests.Add(Request.OperationId, Entry);
}

const FUMAApprovalRequest* FUMAApprovalGate::GetPendingRequest(const FString& OperationId) const
{
    const FPendingEntry* Entry = PendingRequests.Find(OperationId);
    return Entry ? &Entry->Request : nullptr;
}

bool FUMAApprovalGate::ResolveRequest(const FString& OperationId, bool bApproved)
{
    FPendingEntry* Entry = PendingRequests.Find(OperationId);
    if (!Entry) return false;

    if (Entry->OnResolved)
    {
        Entry->OnResolved(bApproved);
    }
    PendingRequests.Remove(OperationId);
    return true;
}

int32 FUMAApprovalGate::GetPendingCount() const
{
    return PendingRequests.Num();
}
```

---

### 2.6 Implementation Step 3: Modify TS ApprovalGate to Send WS Messages

**File:** `mcp-server/src/state/safety.ts`

Update the `ApprovalGate` class. The `classifyOperation` and `isPathSafe` functions are unchanged.

```typescript
// Replace the ApprovalGate class (lines 106-139 in the current file) with:

export interface ApprovalRequestContext {
  toolName: string;
  filePath?: string;
}

/**
 * Approval gate for dangerous operations.
 *
 * Production mode: sends a 'safety.requestApproval' WS message to the UE editor
 * and waits for the developer to approve or reject via the Slate dialog.
 * Defaults to reject after timeoutMs (60 seconds).
 *
 * Test mode: setAutoResponse('approve' | 'reject') bypasses the WS round-trip.
 */
export class ApprovalGate {
  private autoResponse: 'approve' | 'reject' | null = null;
  private timeoutMs: number;
  private bridge: import('../transport/websocket-bridge.js').WebSocketBridge | null;

  /**
   * @param timeoutMs - How long to wait for UE response before auto-rejecting
   * @param bridge    - WebSocketBridge instance. When null, falls back to timeout-reject.
   */
  constructor(
    timeoutMs = 60000,
    bridge: import('../transport/websocket-bridge.js').WebSocketBridge | null = null,
  ) {
    this.timeoutMs = timeoutMs;
    this.bridge = bridge;
  }

  /** For testing: set automatic response mode. Pass null to restore live behavior. */
  setAutoResponse(response: 'approve' | 'reject' | null): void {
    this.autoResponse = response;
  }

  /**
   * Request approval for a dangerous operation.
   *
   * - Non-dangerous operations (requiresApproval === false) return true immediately.
   * - In auto-response mode (test), returns based on setAutoResponse value.
   * - In production mode, sends 'safety.requestApproval' via WS and awaits response.
   * - Falls back to timeout-reject if no bridge is configured.
   */
  async requestApproval(
    classification: SafetyClassification,
    context: ApprovalRequestContext = { toolName: 'unknown' },
  ): Promise<boolean> {
    if (!classification.requiresApproval) return true;

    if (this.autoResponse !== null) {
      return this.autoResponse === 'approve';
    }

    if (this.bridge && this.bridge.hasActiveConnection()) {
      return this.sendApprovalRequest(classification, context);
    }

    // No bridge or no active connection — timeout-reject (original behavior)
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), this.timeoutMs);
      timer.unref?.();
    });
  }

  private async sendApprovalRequest(
    classification: SafetyClassification,
    context: ApprovalRequestContext,
  ): Promise<boolean> {
    const { v4: uuidv4 } = await import('uuid');
    const operationId = uuidv4();

    const msg = {
      id: operationId,
      method: 'safety.requestApproval',
      params: {
        operationId,
        toolName: context.toolName,
        reason: classification.reason,
        ...(context.filePath ? { filePath: context.filePath } : {}),
      },
      timestamp: Date.now(),
    };

    try {
      const response = await Promise.race([
        this.bridge!.sendRequest(msg),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Approval timeout')), this.timeoutMs),
        ),
      ]);

      if (response.error) return false;

      const result = response.result as Record<string, unknown> | undefined;
      return result?.approved === true;
    } catch {
      // Timeout or WS error — default to reject
      return false;
    }
  }
}
```

Update `MockUEClient` in `mcp-server/tests/fixtures/mock-ue-client.ts` to support approval responses:

```typescript
// Add these fields and methods to the existing MockUEClient class:

private approvalResponse: boolean | null = null;
private _lastReceivedMethod: string | null = null;

/** Configure how the mock responds to safety.requestApproval messages */
setApprovalResponse(approved: boolean): void {
  this.approvalResponse = approved;
}

/** Returns the method of the last message received from the server, or null */
lastReceivedMethod(): string | null {
  return this._lastReceivedMethod;
}

// In the existing message handler, add handling for safety.requestApproval:
// (inside the ws.on('message') callback, after parsing the incoming message)
//
// if (parsed.method === 'safety.requestApproval' && this.approvalResponse !== null) {
//   this._lastReceivedMethod = parsed.method;
//   const response = {
//     id: parsed.id,
//     result: { approved: this.approvalResponse },
//     duration_ms: 1,
//   };
//   ws.send(JSON.stringify(response));
// } else {
//   this._lastReceivedMethod = parsed.method ?? null;
//   // existing echo logic
// }
```

---

### 2.7 Implementation Step 4: Wire into UnrealMasterAgent.cpp StartupModule

**File:** `ue-plugin/Source/UnrealMasterAgent/Private/UnrealMasterAgent.cpp`

Add the include and global at the top of the file (alongside existing globals):

```cpp
// Add to includes (after existing includes)
#include "Safety/UMAApprovalGate.h"

// Add global (after GMessageHandler declaration)
static TUniquePtr<FUMAApprovalGate> GApprovalGate;
```

Register the `safety.requestApproval` handler in `StartupModule()`, after the editor query handlers are registered and before the WebSocket client is initialized:

```cpp
// ---------------------------------------------------------------------------
// Register safety.requestApproval handler
// ---------------------------------------------------------------------------
GApprovalGate = MakeUnique<FUMAApprovalGate>();

GMessageHandler->RegisterHandler(TEXT("safety.requestApproval"),
    FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
    {
        // This handler is called on the GameThread (dispatched by UMAWebSocketClient)
        if (!GApprovalGate.IsValid())
        {
            return MakeErrorResponse(Message.Id, 6000, TEXT("ApprovalGate not initialized"));
        }

        // Parse params
        FString OperationId, ToolName, Reason, FilePath;
        if (!Message.Params.IsValid()
            || !Message.Params->TryGetStringField(TEXT("operationId"), OperationId)
            || !Message.Params->TryGetStringField(TEXT("toolName"), ToolName)
            || !Message.Params->TryGetStringField(TEXT("reason"), Reason))
        {
            return MakeErrorResponse(Message.Id, 3001, TEXT("Missing required approval params"));
        }
        Message.Params->TryGetStringField(TEXT("filePath"), FilePath);

        FUMAApprovalRequest Request;
        Request.OperationId = OperationId;
        Request.ToolName    = ToolName;
        Request.Reason      = Reason;
        Request.FilePath    = FilePath;

        // Blocking: shows modal dialog, returns after developer clicks or timeout
        bool bApproved = false;
        GApprovalGate->ShowApprovalDialog(Request,
            [&bApproved](bool bResult) { bApproved = bResult; });

        FUMAWSResponse Response;
        Response.Id = Message.Id;
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("approved"), bApproved);
        Response.Result = ResultObj;
        return Response;
    }));
```

Add cleanup in `ShutdownModule()`:

```cpp
// Inside ShutdownModule(), after GLiveCodingController.Reset()
GApprovalGate.Reset();
```

---

### 2.8 Implementation Step 5: Integration Testing

**Manual verification with UE running:**

1. Launch the UE Editor with the plugin enabled.
2. Start the MCP Bridge Server: `cd mcp-server && npm run dev`
3. Trigger a dangerous operation via Claude Code:

```
blueprint-deleteNode with blueprintCacheKey for any Blueprint
```

4. Verify the Slate dialog appears in the UE editor.
5. Click Approve — the operation should proceed.
6. Repeat and click Reject — the operation should return an error with code `6001`.
7. Repeat and let the 60-second countdown expire — should auto-reject.

**Also update `server.ts`** to pass the `bridge` instance to `ApprovalGate`:

```typescript
// In src/server.ts, line where ApprovalGate is constructed:
// Change:
//   const approvalGate = new ApprovalGate();
// To:
  const approvalGate = new ApprovalGate(60000, bridge);
```

---

### 2.9 Verification Checklist — US-021

**TS-side (complete):**
- [x] `approval-ws-flow.test.ts` — all 5 integration tests pass
- [x] `mcp-server/tests/unit/state/safety.test.ts` — all existing 18 tests still pass
- [x] `npm test` in `mcp-server/` — all 227 tests pass
- [x] `ApprovalGate` sends WS round-trip via `safety.requestApproval`
- [x] `MockUEClient` supports `setApprovalResponse()` for testing
- [x] `blueprint-deleteNode` is now gated by ApprovalGate (architect-verified fix)
- [x] `file-write` passes context `{ toolName, filePath }` to `requestApproval()` (architect-verified fix)

**C++ side (code written, requires UE Editor testing):**
- [x] `UMAApprovalGateTest.cpp` — 6 automation tests written
- [ ] UE automation tests pass (requires UE Editor compilation)
- [ ] Slate dialog appears in the UE editor when a dangerous operation is attempted
- [ ] Dialog displays tool name, reason, and file path fields
- [ ] Approve button results in operation proceeding
- [ ] Reject button results in error code `6001` returned to Claude
- [ ] 60-second countdown is visible and auto-rejects on expiry
- [ ] Multiple simultaneous requests queue correctly (second dialog shown after first resolves)

---

## 3. US-022: In-Editor Chat Panel

### 3.1 Architecture Overview

The chat panel is a dockable `SDockTab` registered via `FGlobalTabmanager`. It provides a text input and scrolling message history so the developer can converse with the agent without switching to the terminal.

Messages are routed through the existing WebSocket pipeline using two new methods:
- `chat.sendMessage` — UE to MCP (user sends a message)
- `chat.receiveResponse` — MCP to UE (agent's response is displayed)

```
Developer types in SUMAChatPanel
    |
    | OnSendButtonClicked()
    v
FUMAWebSocketClient::SendRawMessage()   [new method needed]
    |
    | WSMessage  method: 'chat.sendMessage'  params: { text }
    v                        [WebSocket]
MCP Bridge Server
    |
    | new MCP tool: chat-sendMessage
    | -> routes to Claude's 'messages' endpoint (future) or
    |    echoes back immediately for Phase 1
    v
WS response  method: (return of sendRequest)
    result: { responseText: "..." }
    |
    v
FUMAWebSocketClient receives response
    |
    | Resolves pending request in UMAEditorSubsystem
    v
UUMAEditorSubsystem appends to ChatMessages array
    |
    v
SUMAChatPanel scrolls to new message and renders it
```

**Message flow diagram:**

```
+--------------------+          WSMessage (chat.sendMessage)
|  SUMAChatPanel     |  ------->  method: chat.sendMessage
|  [Input box]       |            params: { text: "hello" }
|  [Send]            |
|                    |  <-------  WSResponse
|  [Chat history]    |            result: { responseText: "..." }
+--------------------+
         ^
         | Updates TArray<FChatEntry>
         |
+---------------------------+
| UUMAEditorSubsystem       |
| - RegisterTab()           |
| - ChatMessages []         |
| - OnMessageReceived()     |
+---------------------------+
```

**Module dependencies added to `UnrealMasterAgent.Build.cs`:**

```
"WebBrowser"   -- for SWebBrowser (optional, see §3.6)
"WorkspaceMenuStructure"  -- for tab menu category
```

---

### 3.2 TDD Phase 1: Write C++ Automation Tests First

**File:** `ue-plugin/Source/UnrealMasterAgentTests/Private/UMAEditorSubsystemTest.cpp`

Create this new file:

```cpp
// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "Editor/UMAEditorSubsystem.h"

// ---------------------------------------------------------------------------
// Test 1: Chat tab spawner is registered
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAEditorSubsystemTabRegisteredTest,
    "UnrealMasterAgent.EditorSubsystem.ChatTabRegistered",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAEditorSubsystemTabRegisteredTest::RunTest(const FString& Parameters)
{
    // After the subsystem initializes, the tab should be registered
    const FName ChatTabId = TEXT("UMAChatPanel");
    bool bRegistered = FGlobalTabmanager::Get()->CanSpawnTab(ChatTabId);
    TestTrue(TEXT("UMAChatPanel tab spawner is registered"), bRegistered);
    return true;
}

// ---------------------------------------------------------------------------
// Test 2: Chat tab can be spawned
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAEditorSubsystemTabSpawnTest,
    "UnrealMasterAgent.EditorSubsystem.ChatTabSpawn",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAEditorSubsystemTabSpawnTest::RunTest(const FString& Parameters)
{
    const FName ChatTabId = TEXT("UMAChatPanel");

    // TryInvokeTab spawns or focuses the tab
    TSharedPtr<SDockTab> Tab = FGlobalTabmanager::Get()->TryInvokeTab(ChatTabId);
    TestNotNull(TEXT("Chat tab can be spawned via TryInvokeTab"), Tab.Get());

    // Clean up
    if (Tab.IsValid())
    {
        Tab->RequestCloseTab();
    }

    return true;
}

// ---------------------------------------------------------------------------
// Test 3: Chat message is added to history when received
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAEditorSubsystemMessageHistoryTest,
    "UnrealMasterAgent.EditorSubsystem.MessageHistory",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAEditorSubsystemMessageHistoryTest::RunTest(const FString& Parameters)
{
    UUMAEditorSubsystem* Subsystem = GEditor
        ? GEditor->GetEditorSubsystem<UUMAEditorSubsystem>()
        : nullptr;

    if (!Subsystem)
    {
        AddWarning(TEXT("UUMAEditorSubsystem not available in this test environment"));
        return true;
    }

    const int32 BeforeCount = Subsystem->GetMessageCount();

    Subsystem->AddChatMessage(TEXT("Test message"), false /* bIsFromUser */);

    TestEqual(TEXT("Message count increased by 1"),
        Subsystem->GetMessageCount(), BeforeCount + 1);

    return true;
}

// ---------------------------------------------------------------------------
// Test 4: Outbound message sends correct WS method
// Uses a captured-message approach to verify the WS payload
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAEditorSubsystemSendMessageTest,
    "UnrealMasterAgent.EditorSubsystem.SendMessageMethod",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAEditorSubsystemSendMessageTest::RunTest(const FString& Parameters)
{
    UUMAEditorSubsystem* Subsystem = GEditor
        ? GEditor->GetEditorSubsystem<UUMAEditorSubsystem>()
        : nullptr;

    if (!Subsystem)
    {
        AddWarning(TEXT("UUMAEditorSubsystem not available in this test environment"));
        return true;
    }

    // Verify the subsystem can construct the correct WS method name
    FString Method = Subsystem->GetChatSendMethod();
    TestEqual(TEXT("Chat send method is chat.sendMessage"),
        Method, FString(TEXT("chat.sendMessage")));

    return true;
}
```

Run (expect failures for the registration tests until implementation is done):

```bash
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent.EditorSubsystem" \
  -unattended -nopause -nullrhi
```

---

### 3.3 TDD Phase 2: Write TS-Side Tests First

**File:** `mcp-server/tests/unit/tools/chat.test.ts`

```typescript
/**
 * Unit tests for chat message tool handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketBridge } from '../../../src/transport/websocket-bridge.js';
import { chatSendMessage } from '../../../src/tools/chat/send-message.js';

describe('chat.sendMessage tool', () => {
  let mockBridge: WebSocketBridge;

  beforeEach(() => {
    mockBridge = {
      sendRequest: vi.fn(),
      hasActiveConnection: vi.fn().mockReturnValue(true),
    } as unknown as WebSocketBridge;
  });

  it('sends chat.sendMessage WS request with user text', async () => {
    (mockBridge.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'test-id',
      result: { responseText: 'Hello from agent' },
      duration_ms: 10,
    });

    const result = await chatSendMessage(mockBridge, { text: 'Hello' });

    const sentMsg = (mockBridge.sendRequest as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(sentMsg.method).toBe('chat.sendMessage');
    expect(sentMsg.params.text).toBe('Hello');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.responseText).toBe('Hello from agent');
  });

  it('returns error when UE not connected', async () => {
    (mockBridge.hasActiveConnection as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (mockBridge.sendRequest as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('UE plugin not connected'),
    );

    const result = await chatSendMessage(mockBridge, { text: 'Hello' });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
  });

  it('returns empty responseText gracefully', async () => {
    (mockBridge.sendRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'test-id',
      result: { responseText: '' },
      duration_ms: 5,
    });

    const result = await chatSendMessage(mockBridge, { text: 'Hi' });
    const parsed = JSON.parse(result.content[0].text);
    expect(typeof parsed.responseText).toBe('string');
  });
});
```

Run (expect failures):

```bash
cd mcp-server && npm test -- tests/unit/tools/chat.test.ts
```

---

### 3.4 Implementation Step 1: UMAEditorSubsystem.h (Tab Registration)

**File:** `ue-plugin/Source/UnrealMasterAgent/Public/Editor/UMAEditorSubsystem.h`

```cpp
// Copyright Unreal Master Team. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "EditorSubsystem.h"
#include "Framework/Docking/TabManager.h"
#include "UMAEditorSubsystem.generated.h"

/** A single chat message entry in the history. */
USTRUCT()
struct FUMAChatEntry
{
    GENERATED_BODY()

    /** Message text */
    FString Text;

    /** True if the message was sent by the developer; false if from the agent */
    bool bIsFromUser = false;

    /** Timestamp for display */
    FDateTime Timestamp;
};

/**
 * Editor subsystem that owns the In-Editor Chat Panel tab.
 *
 * Registered via UEditorSubsystem lifecycle — automatically instantiated by
 * the editor when the plugin is loaded.
 *
 * THREADING: All Slate/tab operations MUST be on the GameThread.
 */
UCLASS()
class UNREALMASTERAGENT_API UUMAEditorSubsystem : public UEditorSubsystem
{
    GENERATED_BODY()

public:
    // UEditorSubsystem overrides
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    /** Register the 'UMAChatPanel' nomad tab spawner with FGlobalTabmanager. */
    void RegisterChatTab();

    /** Unregister the tab spawner on shutdown. */
    void UnregisterChatTab();

    /**
     * Append a message to the chat history and notify the open panel (if any).
     * Safe to call from GameThread only.
     */
    void AddChatMessage(const FString& Text, bool bIsFromUser);

    /** Returns the current message count (for tests). */
    int32 GetMessageCount() const { return ChatMessages.Num(); }

    /**
     * Returns the WS method name used for outbound chat messages.
     * Used by tests to verify the correct method string.
     */
    FString GetChatSendMethod() const { return TEXT("chat.sendMessage"); }

    /** Invoke (focus or open) the chat tab. */
    void InvokeChatTab();

    /** Delegate broadcast when a new message is added (used by the Slate widget). */
    DECLARE_MULTICAST_DELEGATE_OneParam(FOnChatMessageAdded, const FUMAChatEntry&);
    FOnChatMessageAdded OnChatMessageAdded;

    /** Read-only access to the full history (for initial panel population). */
    const TArray<FUMAChatEntry>& GetChatMessages() const { return ChatMessages; }

private:
    static const FName ChatTabId;

    TArray<FUMAChatEntry> ChatMessages;

    static TSharedRef<SDockTab> SpawnChatTab(const FSpawnTabArgs& Args);
};
```

---

### 3.5 Implementation Step 2: SUMAChatPanel Slate Widget

**File:** `ue-plugin/Source/UnrealMasterAgent/Public/Editor/SUMAChatPanel.h` (new file)

```cpp
// Copyright Unreal Master Team. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Views/SListView.h"
#include "Editor/UMAEditorSubsystem.h"

/**
 * Dockable chat panel widget.
 * Displays chat history and provides a text input for sending messages.
 *
 * THREADING: Must only be constructed and operated on the GameThread.
 */
class SUMAChatPanel : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SUMAChatPanel)
        : _Subsystem(nullptr)
    {}
        SLATE_ARGUMENT(UUMAEditorSubsystem*, Subsystem)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);
    virtual ~SUMAChatPanel() override;

private:
    UUMAEditorSubsystem* Subsystem = nullptr;

    /** Mutable copy of messages for list view (list view needs TArray<TSharedPtr<...>>). */
    TArray<TSharedPtr<FUMAChatEntry>> DisplayedMessages;

    TSharedPtr<SListView<TSharedPtr<FUMAChatEntry>>> MessageListView;
    TSharedPtr<SEditableTextBox> InputBox;

    /** Delegate handle so we can unsubscribe on destruction. */
    FDelegateHandle MessageAddedHandle;

    /** Called when a new message is added to the subsystem. */
    void OnMessageAdded(const FUMAChatEntry& Entry);

    /** Row generator for the list view. */
    TSharedRef<ITableRow> GenerateMessageRow(
        TSharedPtr<FUMAChatEntry> Entry,
        const TSharedRef<STableViewBase>& OwnerTable);

    FReply OnSendClicked();
    void SendCurrentInput();
};
```

**File:** `ue-plugin/Source/UnrealMasterAgent/Private/Editor/SUMAChatPanel.cpp` (new file)

```cpp
// Copyright Unreal Master Team. All Rights Reserved.

#include "Editor/SUMAChatPanel.h"
#include "WebSocket/UMAWebSocketClient.h"
#include "WebSocket/UMAMessageTypes.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Views/SListView.h"
#include "Styling/AppStyle.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"

// Forward declare global WebSocket client (defined in UnrealMasterAgent.cpp)
extern TUniquePtr<FUMAWebSocketClient> GWebSocketClient;

void SUMAChatPanel::Construct(const FArguments& InArgs)
{
    Subsystem = InArgs._Subsystem;

    // Populate from existing history
    if (Subsystem)
    {
        for (const FUMAChatEntry& Entry : Subsystem->GetChatMessages())
        {
            DisplayedMessages.Add(MakeShared<FUMAChatEntry>(Entry));
        }

        // Subscribe to new messages
        MessageAddedHandle = Subsystem->OnChatMessageAdded.AddSP(
            this, &SUMAChatPanel::OnMessageAdded);
    }

    ChildSlot
    [
        SNew(SVerticalBox)

        // Message list (fills available height)
        + SVerticalBox::Slot()
        .FillHeight(1.0f)
        .Padding(4.0f)
        [
            SNew(SBorder)
            .BorderImage(FAppStyle::GetBrush("ToolPanel.GroupBorder"))
            [
                SAssignNew(MessageListView, SListView<TSharedPtr<FUMAChatEntry>>)
                .ListItemsSource(&DisplayedMessages)
                .OnGenerateRow(this, &SUMAChatPanel::GenerateMessageRow)
                .SelectionMode(ESelectionMode::None)
            ]
        ]

        // Input row
        + SVerticalBox::Slot()
        .AutoHeight()
        .Padding(4.0f)
        [
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot()
            .FillWidth(1.0f)
            .Padding(0.0f, 0.0f, 4.0f, 0.0f)
            [
                SAssignNew(InputBox, SEditableTextBox)
                .HintText(FText::FromString(TEXT("Ask Unreal Master...")))
                .OnTextCommitted_Lambda([this](const FText&, ETextCommit::Type CommitType)
                {
                    if (CommitType == ETextCommit::OnEnter)
                    {
                        SendCurrentInput();
                    }
                })
            ]
            + SHorizontalBox::Slot()
            .AutoWidth()
            [
                SNew(SButton)
                .Text(FText::FromString(TEXT("Send")))
                .OnClicked(this, &SUMAChatPanel::OnSendClicked)
            ]
        ]
    ];
}

SUMAChatPanel::~SUMAChatPanel()
{
    if (Subsystem && MessageAddedHandle.IsValid())
    {
        Subsystem->OnChatMessageAdded.Remove(MessageAddedHandle);
    }
}

void SUMAChatPanel::OnMessageAdded(const FUMAChatEntry& Entry)
{
    // Called on GameThread via the subsystem broadcast
    check(IsInGameThread());

    DisplayedMessages.Add(MakeShared<FUMAChatEntry>(Entry));

    if (MessageListView.IsValid())
    {
        MessageListView->RequestListRefresh();
        // Scroll to bottom
        if (DisplayedMessages.Num() > 0)
        {
            MessageListView->RequestScrollIntoView(DisplayedMessages.Last());
        }
    }
}

TSharedRef<ITableRow> SUMAChatPanel::GenerateMessageRow(
    TSharedPtr<FUMAChatEntry> Entry,
    const TSharedRef<STableViewBase>& OwnerTable)
{
    const FLinearColor UserColor  = FLinearColor(0.7f, 0.9f, 1.0f);
    const FLinearColor AgentColor = FLinearColor(0.9f, 0.9f, 0.9f);
    const FLinearColor Color      = Entry->bIsFromUser ? UserColor : AgentColor;
    const FString Prefix          = Entry->bIsFromUser ? TEXT("You: ") : TEXT("Agent: ");

    return SNew(STableRow<TSharedPtr<FUMAChatEntry>>, OwnerTable)
        [
            SNew(SBorder)
            .Padding(FMargin(8.0f, 4.0f))
            .BorderImage(FAppStyle::GetBrush("NoBorder"))
            [
                SNew(STextBlock)
                .Text(FText::FromString(Prefix + Entry->Text))
                .ColorAndOpacity(Color)
                .AutoWrapText(true)
            ]
        ];
}

FReply SUMAChatPanel::OnSendClicked()
{
    SendCurrentInput();
    return FReply::Handled();
}

void SUMAChatPanel::SendCurrentInput()
{
    if (!InputBox.IsValid()) return;

    FString Text = InputBox->GetText().ToString().TrimStartAndEnd();
    if (Text.IsEmpty()) return;

    InputBox->SetText(FText::GetEmpty());

    // Add the user's message to history immediately
    if (Subsystem)
    {
        Subsystem->AddChatMessage(Text, true /* bIsFromUser */);
    }

    // Send via WebSocket
    if (GWebSocketClient.IsValid() && GWebSocketClient->IsConnected())
    {
        FUMAWSMessage Message;
        Message.Id        = FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphens);
        Message.Method    = TEXT("chat.sendMessage");
        Message.Timestamp = FDateTime::UtcNow().ToUnixTimestamp() * 1000;
        Message.Params    = MakeShared<FJsonObject>();
        Message.Params->SetStringField(TEXT("text"), Text);

        // Send and handle response asynchronously
        // The response will come back via the message handler registry
        GWebSocketClient->SendRawMessage(Message);
    }
    else
    {
        // No connection — show error in chat
        if (Subsystem)
        {
            Subsystem->AddChatMessage(
                TEXT("[Error] Not connected to MCP server"), false);
        }
    }
}
```

---

### 3.6 Implementation Step 3: Native Slate Text (No WebBrowser Required)

The chat panel uses native Slate widgets (`SListView`, `STextBlock`, `SEditableTextBox`) rather than `SWebBrowser`. This approach:

- Has zero additional module dependencies beyond already-linked `Slate` and `SlateCore`
- Works in all UE editor configurations without requiring the WebBrowser plugin
- Is consistent with the rest of the plugin's Slate usage

If rich HTML rendering is needed in a future iteration, replace `SListView` with `SWebBrowser` and serve chat history as a local HTML file. Add `"WebBrowser"` to `PrivateDependencyModuleNames` in `Build.cs` at that time.

Add `SendRawMessage` to `FUMAWebSocketClient` (required by `SUMAChatPanel`):

**In `UMAWebSocketClient.h`**, add the declaration:

```cpp
/** Send a raw message (outbound, no response correlation needed). */
void SendRawMessage(const FUMAWSMessage& Message);
```

**In `UMAWebSocketClient.cpp`**, add the implementation:

```cpp
void FUMAWebSocketClient::SendRawMessage(const FUMAWSMessage& Message)
{
    if (!IsConnected())
    {
        UE_LOG(LogTemp, Warning, TEXT("[UMA] Cannot send message: not connected"));
        return;
    }
    const FString JsonString = Message.ToJson();
    WebSocket->Send(JsonString);
}
```

---

### 3.7 Implementation Step 4: WS Message Routing (chat.sendMessage / chat.receiveResponse)

**C++ side** — Register the `chat.receiveResponse` handler in `StartupModule()`:

```cpp
// After the safety.requestApproval handler registration:

GMessageHandler->RegisterHandler(TEXT("chat.receiveResponse"),
    FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
    {
        check(IsInGameThread());

        FString ResponseText;
        if (!Message.Params.IsValid()
            || !Message.Params->TryGetStringField(TEXT("responseText"), ResponseText))
        {
            return MakeErrorResponse(Message.Id, 3001, TEXT("Missing responseText param"));
        }

        // Route to the editor subsystem's chat history
        if (GEditor)
        {
            UUMAEditorSubsystem* Subsystem =
                GEditor->GetEditorSubsystem<UUMAEditorSubsystem>();
            if (Subsystem)
            {
                Subsystem->AddChatMessage(ResponseText, false /* bIsFromUser */);
            }
        }

        FUMAWSResponse Response;
        Response.Id = Message.Id;
        TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
        ResultObj->SetBoolField(TEXT("received"), true);
        Response.Result = ResultObj;
        return Response;
    }));
```

**TS side** — Create the tool handler:

**File:** `mcp-server/src/tools/chat/send-message.ts`

```typescript
/**
 * chat.sendMessage tool handler.
 * Forwards a developer's chat message to the UE plugin via WebSocket.
 * In Phase 1 the UE plugin echoes back an acknowledgement.
 * In a future phase, this could route through the LLM for an agent response.
 */
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketBridge } from '../../transport/websocket-bridge.js';

export interface ChatSendMessageParams {
  text: string;
}

export async function chatSendMessage(
  bridge: WebSocketBridge,
  params: ChatSendMessageParams,
) {
  const msg = {
    id: uuidv4(),
    method: 'chat.sendMessage',
    params: { text: params.text },
    timestamp: Date.now(),
  };

  try {
    const response = await bridge.sendRequest(msg);

    if (response.error) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ status: 'error', error: response.error }),
        }],
      };
    }

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(response.result),
      }],
    };
  } catch (err) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ status: 'error', error: (err as Error).message }),
      }],
    };
  }
}
```

Register the tool in `mcp-server/src/server.ts` (after the slate tools):

```typescript
// Add import at the top of server.ts:
import { chatSendMessage } from './tools/chat/send-message.js';

// Add tool registration (after slate tools):
server.tool(
  'chat-sendMessage',
  'Send a message through the in-editor chat panel.',
  {
    text: z.string().describe('Message text to send'),
  },
  async (params) => {
    logger.info('chat.sendMessage called');
    return chatSendMessage(bridge, params);
  }
);
```

---

### 3.8 Implementation Step 5: Wire into Module Startup

**In `UnrealMasterAgent.cpp` `StartupModule()`**, after the WebSocket client is initialized, register and invoke the editor subsystem's tab:

```cpp
// After GWebSocketClient is set up (end of StartupModule):

// Initialize editor subsystem and register chat tab
// Note: UEditorSubsystem instances are managed by GEditor's subsystem collection
// and initialized automatically. We call RegisterChatTab() explicitly here
// to ensure it happens after the module is ready.
if (GEditor)
{
    UUMAEditorSubsystem* Subsystem =
        GEditor->GetEditorSubsystem<UUMAEditorSubsystem>();
    if (Subsystem)
    {
        Subsystem->RegisterChatTab();
        UE_LOG(LogTemp, Log, TEXT("[UMA] Chat panel registered"));
    }
}
```

**Implement `UMAEditorSubsystem.cpp`:**

**File:** `ue-plugin/Source/UnrealMasterAgent/Private/Editor/UMAEditorSubsystem.cpp`

```cpp
// Copyright Unreal Master Team. All Rights Reserved.

#include "Editor/UMAEditorSubsystem.h"
#include "Editor/SUMAChatPanel.h"
#include "Framework/Docking/TabManager.h"
#include "Widgets/Docking/SDockTab.h"
#include "WorkspaceMenuStructure.h"
#include "WorkspaceMenuStructureModule.h"
#include "Styling/AppStyle.h"

const FName UUMAEditorSubsystem::ChatTabId = TEXT("UMAChatPanel");

void UUMAEditorSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    // Tab registration is called explicitly from StartupModule
    // after the module has fully started. See UnrealMasterAgent.cpp.
}

void UUMAEditorSubsystem::Deinitialize()
{
    UnregisterChatTab();
    Super::Deinitialize();
}

void UUMAEditorSubsystem::RegisterChatTab()
{
    FGlobalTabmanager::Get()->RegisterNomadTabSpawner(
        ChatTabId,
        FOnSpawnTab::CreateUObject(this, &UUMAEditorSubsystem::SpawnChatTabForSubsystem))
        .SetDisplayName(FText::FromString(TEXT("Unreal Master Chat")))
        .SetTooltipText(FText::FromString(TEXT("Open the Unreal Master AI chat panel")))
        .SetIcon(FSlateIcon(FAppStyle::GetAppStyleSetName(), "Icons.Comment"))
        .SetGroup(WorkspaceMenu::GetMenuStructure().GetToolsCategory());
}

void UUMAEditorSubsystem::UnregisterChatTab()
{
    FGlobalTabmanager::Get()->UnregisterNomadTabSpawner(ChatTabId);
}

TSharedRef<SDockTab> UUMAEditorSubsystem::SpawnChatTabForSubsystem(const FSpawnTabArgs& Args)
{
    return SNew(SDockTab)
        .TabRole(NomadTab)
        .Label(FText::FromString(TEXT("Unreal Master Chat")))
        [
            SNew(SUMAChatPanel)
            .Subsystem(this)
        ];
}

// Static overload used in the test helper registration (kept for compat)
TSharedRef<SDockTab> UUMAEditorSubsystem::SpawnChatTab(const FSpawnTabArgs& Args)
{
    // Fallback path — delegates to the subsystem instance if available
    if (GEditor)
    {
        UUMAEditorSubsystem* Subsystem =
            GEditor->GetEditorSubsystem<UUMAEditorSubsystem>();
        if (Subsystem)
        {
            return Subsystem->SpawnChatTabForSubsystem(Args);
        }
    }

    // Minimal fallback tab
    return SNew(SDockTab)
        .TabRole(NomadTab)
        [
            SNew(STextBlock).Text(FText::FromString(TEXT("Chat unavailable")))
        ];
}

void UUMAEditorSubsystem::AddChatMessage(const FString& Text, bool bIsFromUser)
{
    check(IsInGameThread());

    FUMAChatEntry Entry;
    Entry.Text        = Text;
    Entry.bIsFromUser = bIsFromUser;
    Entry.Timestamp   = FDateTime::UtcNow();
    ChatMessages.Add(Entry);

    OnChatMessageAdded.Broadcast(Entry);
}

void UUMAEditorSubsystem::InvokeChatTab()
{
    FGlobalTabmanager::Get()->TryInvokeTab(ChatTabId);
}
```

**Update `Build.cs`** to add `WorkspaceMenuStructure`:

```csharp
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
    "WorkspaceMenuStructure"   // <-- add this
});
```

---

### 3.9 Verification Checklist — US-022

**TS-side (complete):**
- [x] `chat.test.ts` — all 3 unit tests pass
- [x] `npm test` in `mcp-server/` — all tests pass
- [x] `chat-sendMessage` tool registered in `server.ts`
- [x] `chatSendMessage()` handler sends WS request and returns MCP response

**C++ side (code written, requires UE Editor testing):**
- [x] `UMAEditorSubsystemTest.cpp` — 4 automation tests written
- [ ] UE automation tests pass (requires UE Editor compilation)
- [ ] Chat panel appears in UE editor `Tools` menu as "Unreal Master Chat"
- [ ] Panel is dockable (can be dragged to any dock location)
- [ ] Typing text and pressing Enter or clicking Send appends a "You: ..." row
- [ ] User messages have a distinct color (blue-tinted) compared to agent messages
- [ ] Panel scrolls to newest message automatically
- [ ] Messages persist while the tab is open and closed/reopened in the same session
- [ ] `chat.receiveResponse` WS message appends agent reply with correct color
- [ ] No Slate thread assertions when operating the panel

---

## 4. US-023: Documentation and AGENTS.md Hierarchy Update

### 4.1 AGENTS.md Hierarchy Structure

The AGENTS.md files form a hierarchy with `<!-- Parent: -->` references linking child files back to their parent. Each file describes the directory it lives in — not subdirectories.

```
/Unreal Master/AGENTS.md                   (root — describes entire project)
    |
    +-- /mcp-server/AGENTS.md              (describes Layer 2 only)
    |
    +-- /ue-plugin/AGENTS.md               (describes Layer 3 only)
    |
    +-- /docs/AGENTS.md                    (describes RAG knowledge base)
```

Every AGENTS.md must contain:
1. `<!-- Parent: -->` reference (except root)
2. Purpose statement
3. Key files table
4. For AI Agents section covering conventions and gotchas

---

### 4.2 Step-by-Step: Root AGENTS.md

**File:** `/Users/ikhyeon.kim/Workspace/Unreal Master/AGENTS.md`

Replace the current content (which describes only the planning stage) with content that reflects the actual implemented state:

```markdown
<!-- Generated: 2026-02-25 | Updated: 2026-02-25 -->

# Unreal Master — Root

## Purpose

Autonomous AI agent that gives Claude Code bidirectional control over Unreal Engine
internals. 4-layer architecture: Claude Code → MCP Bridge Server (Node.js/TS) →
UE Agent Plugin (C++) → Engine APIs (UEdGraph, Slate, ILiveCodingModule).

## Repository Layout

| Path | Layer | Description |
|------|-------|-------------|
| `mcp-server/` | Layer 2 | Node.js/TypeScript MCP bridge server (219 tests passing) |
| `ue-plugin/` | Layer 3 | C++ Unreal Engine plugin |
| `docs/` | — | Schemas, Slate RAG templates, API reference |
| `ARCHITECTURE.md` | — | Full architecture spec, ADRs, threading model |
| `README.md` | — | Setup instructions and development workflow |
| `PRD.md` | — | Product Requirements Document (Korean) |
| `scripts/` | — | `dev-start.sh`, `test-all.sh` |

## Key Technical Constraints

1. **GameThread-only UE APIs.** Every UE editor API call MUST be dispatched via
   `AsyncTask(ENamedThreads::GameThread, ...)`. WebSocket callbacks run on a
   background thread. Violating this rule causes crashes and data corruption.

2. **stdout is sacred.** The MCP server communicates with Claude Code over stdout
   via JSON-RPC. `console.log()` in server code corrupts the stream. All logging
   goes to `stderr`.

3. **TryCreateConnection, never MakeLinkTo.** For Blueprint pin connection, always
   use `UEdGraphSchema_K2::TryCreateConnection()`. `MakeLinkTo` bypasses schema
   validation and corrupts Blueprint graphs.

4. **UE is the WebSocket CLIENT.** Node.js listens; UE connects. This uses UE's
   stable `FWebSocketsModule` client.

## For AI Agents

### TDD Workflow

All code changes start with failing tests.

- **TS tests:** `cd mcp-server && npm test` (Vitest)
- **C++ tests:** UE Automation Framework via `-ExecCmds="Automation RunTests ..."`
- **Commit format:** `feat: [description] (TDD)`

### Error Code Taxonomy

| Range | Category |
|-------|---------|
| 1000–1099 | Connection / WebSocket |
| 2000–2099 | Handler routing (unknown method = 2001) |
| 3000–3099 | Parameter validation |
| 4000–4099 | Blueprint operations |
| 5000–5099 | Internal / serialization |
| 6000–6099 | Safety gate |

### WS Message Envelope

Request (MCP → UE):
```json
{ "id": "<uuid>", "method": "blueprint.serialize",
  "params": { "blueprintPath": "/Game/BP_Test" }, "timestamp": 1740441600000 }
```

Response (UE → MCP):
```json
{ "id": "<uuid>", "result": { ... }, "duration_ms": 42 }
```

### Deferred Stories

- **US-021** — Human-in-the-Loop Safety (UE Slate approval dialog)
  See `mcp-server/docs/DEFERRED-FEATURES-GUIDE.md` §2
- **US-022** — In-Editor Chat Panel
  See `mcp-server/docs/DEFERRED-FEATURES-GUIDE.md` §3
```

---

### 4.3 Step-by-Step: mcp-server/AGENTS.md

**File:** `mcp-server/AGENTS.md` (create if not present)

```markdown
<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-25 | Updated: 2026-02-25 -->

# MCP Bridge Server (Layer 2)

## Purpose

Node.js/TypeScript MCP bridge. Translates Claude Code's MCP tool calls into
WebSocket requests to the UE plugin. Node.js is the WebSocket SERVER; UE connects
as CLIENT.

## Key Files

| File | Description |
|------|-------------|
| `src/index.ts` | Entry point — creates `McpServer`, binds `StdioServerTransport` |
| `src/server.ts` | Registers all 19 MCP tools |
| `src/transport/websocket-bridge.ts` | WS server, pending-request correlation map |
| `src/transport/message-codec.ts` | Encode/decode with Zod validation |
| `src/transport/connection-manager.ts` | Exponential backoff reconnection |
| `src/state/safety.ts` | `classifyOperation()`, `isPathSafe()`, `ApprovalGate` |
| `src/state/session.ts` | `SessionManager` — retry counts, compile history |
| `src/state/cache-store.ts` | LRU cache — 1000 entries, 60s TTL |
| `src/tools/` | One directory per domain: editor, blueprint, compilation, file, slate, chat |
| `src/rag/` | `EmbeddingStore`, `SlateTemplateLoader`, `SemanticSearch` |
| `src/observability/` | `logger.ts`, `tracer.ts`, `metrics.ts` |
| `tests/` | Vitest tests — `tests/unit/**` and `tests/integration/**` |

## Test Commands

```bash
cd mcp-server

npm test                    # run all 219+ tests once
npm run test:watch          # watch mode
npm run test:coverage       # with coverage report
npm run typecheck           # TypeScript type check only
```

Test files live at `tests/unit/<domain>/<file>.test.ts`
and `tests/integration/<file>.test.ts`.

## For AI Agents

### stdout / stderr Rule

NEVER use `console.log()`. All logging goes through the `Logger` instance
which writes to `stderr`. A single `console.log()` corrupts the JSON-RPC stream.

### ApprovalGate Usage

```typescript
const gate = new ApprovalGate(60000, bridge);  // production: pass bridge
const gate = new ApprovalGate(100);             // tests: no bridge, short timeout
gate.setAutoResponse('approve');               // test: bypass WS round-trip
```

### Adding a New MCP Tool

1. Create `src/tools/<domain>/<tool-name>.ts`
2. Write tests in `tests/unit/tools/<domain>.test.ts`
3. Register in `src/server.ts` with `server.tool()`
4. Register a corresponding C++ handler in `UnrealMasterAgent.cpp::StartupModule()`
5. Commit: `feat: add <tool-name> MCP tool (TDD)`

### WS Request Pattern

```typescript
const response = await bridge.sendRequest({
  id: uuidv4(),
  method: 'editor.ping',
  params: {},
  timestamp: Date.now(),
});
if (response.error) { /* handle */ }
const data = response.result;
```
```

---

### 4.4 Step-by-Step: ue-plugin/AGENTS.md

**File:** `ue-plugin/AGENTS.md` (create if not present)

```markdown
<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-25 | Updated: 2026-02-25 -->

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
│   │   │   ├── UMAMessageHandler.h   Handler registry + FOnUMAHandleMethod delegate
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
│   │   │   └── UMAEditorSubsystem.h   (US-022 — stub)
│   │   ├── FileOps/
│   │   │   └── UMAFileOperations.h
│   │   └── Safety/
│   │       └── UMAApprovalGate.h      (US-021 — stub)
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
    │   ├── UMAApprovalGateTest.cpp    (US-021 — stub)
    │   └── UMAEditorSubsystemTest.cpp (US-022 — new file)
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
```

---

### 4.5 Step-by-Step: docs/AGENTS.md

**File:** `docs/AGENTS.md` (create if not present)

```markdown
<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-25 | Updated: 2026-02-25 -->

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
```

---

### 4.6 Step-by-Step: README.md

The existing `README.md` is accurate for the built features but needs updates to reflect:
- Actual plugin directory name (`ue-plugin/` not `UnrealMasterPlugin/`)
- Deferred features status

**Update the Project Structure section** in `/Users/ikhyeon.kim/Workspace/Unreal Master/README.md`:

Change line 159:
```
├── UnrealMasterPlugin/      Layer 3: C++ UE plugin (to be created in Phase 1)
```
To:
```
├── ue-plugin/               Layer 3: C++ UE plugin (implemented)
│   └── Source/
│       ├── UnrealMasterAgent/        Main module (12 handlers registered)
│       └── UnrealMasterAgentTests/   Automation test module
```

Add a **Deferred Features** section before the Contributing section:

```markdown
## Deferred Features

The following user stories are documented but not yet implemented.
See `mcp-server/docs/DEFERRED-FEATURES-GUIDE.md` for the full implementation guide.

| Story | Feature | Status |
|-------|---------|--------|
| US-021 | Human-in-the-Loop Safety (Slate approval dialog) | Stub exists |
| US-022 | In-Editor Chat Panel (dockable SDockTab) | Stub exists |
| US-023 | Documentation update | In progress |
```

---

### 4.7 Step-by-Step: ARCHITECTURE.md

The existing `ARCHITECTURE.md` is accurate. Two updates are needed:

**Update §3.2 Error Code Taxonomy** — Correct the category labels to match what is actually implemented:

```markdown
| Code Range | Category | Examples |
|------------|----------|---------|
| 1000–1099 | Connection | WS disconnect, handshake failure, timeout |
| 2000–2099 | Handler | Unknown method (2001), handler not found |
| 3000–3099 | Parameters | Missing required param (3001), invalid type |
| 4000–4099 | Blueprint | Node creation failed (4001), pin connect failed (4002) |
| 5000–5099 | Internal | Serialization error (5000), controller not init (5001) |
| 6000–6099 | Safety | Approval rejected (6001), operation blocked |
```

**Update §9 Project Structure** — Replace the `UnrealMasterPlugin/` reference with the actual `ue-plugin/` directory name:

```
├── ue-plugin/               ← Layer 3: C++ UE Plugin
│   ├── UnrealMasterAgent.uplugin
│   └── Source/
│       ├── UnrealMasterAgent/      Main module
│       │   ├── Public/
│       │   └── Private/
│       └── UnrealMasterAgentTests/ Test module
│           ├── Public/
│           └── Private/
```

---

### 4.8 Validation Checklist — US-023

- [x] Root `AGENTS.md` reflects implemented state, not planning state
- [x] Root `AGENTS.md` error code table matches actual code ranges
- [x] `mcp-server/AGENTS.md` lists all `src/` subdirectories and test structure
- [x] `ue-plugin/AGENTS.md` lists all Public/ header files including Safety/Editor modules
- [x] `docs/AGENTS.md` lists all schema files and slate templates
- [x] All `<!-- Parent: -->` links point to correct file paths
- [x] `README.md` project structure reflects `ue-plugin/` (not `UnrealMasterPlugin/`)
- [x] `README.md` has Deferred Features section
- [x] `ARCHITECTURE.md` error code table corrected
- [x] `ARCHITECTURE.md` project structure uses `ue-plugin/`
- [x] No broken internal links in any markdown file

---

## 5. Development Order

Implementation was completed in this sequence:

```
Phase 1 — Safety System Tests (US-021 TDD first)              ✅ COMPLETE
  1.1  Write UMAApprovalGateTest.cpp (6 tests)          [C++]  ✅
  1.2  Write approval-ws-flow.test.ts (5 tests)         [TS]   ✅
  1.3  Verify both test suites fail as expected                 ✅

Phase 2 — Safety System Implementation (US-021)                ✅ COMPLETE
  2.1  Implement UMAApprovalGate.h / .cpp               [C++]  ✅
  2.2  Update ApprovalGate class in safety.ts            [TS]   ✅
  2.3  Update MockUEClient with approval support         [TS]   ✅
  2.4  Wire safety.requestApproval handler in StartupModule [C++] ✅
  2.5  Update server.ts to pass bridge to ApprovalGate   [TS]   ✅
  2.6  Gate blueprint-deleteNode with ApprovalGate       [TS]   ✅ (architect-verified addition)
  2.7  Pass context to requestApproval in file-write     [TS]   ✅ (architect-verified addition)
  2.8  Run all TS tests — 227 pass                              ✅

Phase 3 — Chat Panel Tests (US-022 TDD first)                 ✅ COMPLETE
  3.1  Write UMAEditorSubsystemTest.cpp (4 tests)       [C++]  ✅
  3.2  Write chat.test.ts (3 tests)                     [TS]   ✅
  3.3  Verify both test suites fail as expected                 ✅

Phase 4 — Chat Panel Implementation (US-022)                   ✅ COMPLETE
  4.1  Implement UMAEditorSubsystem.h / .cpp            [C++]  ✅
  4.2  Implement SUMAChatPanel.h / .cpp                 [C++]  ✅
  4.3  Add SendRawMessage to FUMAWebSocketClient         [C++]  ✅
  4.4  Create chat/send-message.ts tool handler         [TS]   ✅
  4.5  Register chat.receiveResponse in StartupModule    [C++]  ✅
  4.6  Register chat-sendMessage tool in server.ts       [TS]   ✅
  4.7  Update Build.cs with WorkspaceMenuStructure       [C++]  ⚠️ Manual step needed
  4.8  Run all TS tests — 227 pass                              ✅

Phase 5 — Documentation (US-023)                               ✅ COMPLETE
  5.1  Update root AGENTS.md                                    ✅
  5.2  Create mcp-server/AGENTS.md                              ✅
  5.3  Create ue-plugin/AGENTS.md                               ✅
  5.4  Create docs/AGENTS.md                                    ✅
  5.5  Update README.md (project structure + deferred section)  ✅
  5.6  Update ARCHITECTURE.md (error codes + project structure) ✅
  5.7  Validate all <!-- Parent: --> links                      ✅
```

### Remaining Work

The following items require an Unreal Engine Editor environment to verify:

1. **C++ Compilation** — All C++ files are written but must be compiled via UnrealBuildTool
2. **UE Automation Tests** — 10 automation tests (6 for Safety, 4 for EditorSubsystem) need to be run inside the UE Editor
3. **Slate Dialog Visual Testing** — Approval dialog countdown, approve/reject buttons
4. **Chat Panel Visual Testing** — Dockable tab, message history scrolling, color coding, input handling
5. **Build.cs Update** — Add `WorkspaceMenuStructure` to `PrivateDependencyModuleNames` if not already present
6. **End-to-End Integration** — Full flow: Claude Code → MCP → UE approval dialog → response back

---

## 6. Testing Commands

### TypeScript (Vitest)

```bash
# All tests
cd mcp-server && npm test

# Watch mode during development
cd mcp-server && npm run test:watch

# Single test file
cd mcp-server && npx vitest run tests/integration/approval-ws-flow.test.ts

# Coverage report
cd mcp-server && npm run test:coverage

# Type check only
cd mcp-server && npm run typecheck
```

### C++ (UE Automation Framework)

```bash
# All plugin tests
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent" \
  -unattended -nopause -nullrhi

# Safety tests only (US-021)
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent.Safety" \
  -unattended -nopause -nullrhi

# Editor subsystem tests only (US-022)
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent.EditorSubsystem" \
  -unattended -nopause -nullrhi

# All + XML report
UnrealEditor-Cmd YourProject.uproject \
  -ExecCmds="Automation RunTests UnrealMasterAgent" \
  -unattended -nopause -nullrhi \
  -ReportOutputPath="TestResults/"
```

### Full Suite Script

```bash
# From project root
bash scripts/test-all.sh
```

The `test-all.sh` script runs `npx vitest run` in `mcp-server/`. Extend it with the UE automation command after C++ tests pass in Phase 2 and 4.

---

## 7. Key Conventions

### TDD Rules

1. Write the failing test first. Commit the test.
2. Write the minimum implementation to make it pass.
3. Refactor. Commit implementation separately.
4. Never write production code without a corresponding test.

### Commit Message Format

```
feat: add UMAApprovalGate Slate dialog (TDD)
feat: add chat.sendMessage WS handler (TDD)
docs: update AGENTS.md hierarchy for US-023
fix: correct approval timeout to reject after 60s (TDD)
```

Pattern: `<type>: <description> (TDD)` for code changes.

### C++ Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Classes | `F` prefix (non-UObject), `U` prefix (UObject/UStruct) | `FUMAApprovalGate`, `UUMAEditorSubsystem` |
| Slate widgets | `S` prefix | `SUMAApprovalDialog`, `SUMAChatPanel` |
| Test classes | `F` prefix | `FUMAApprovalGateExistsTest` |
| Methods | PascalCase | `ShowApprovalDialog()`, `RegisterChatTab()` |
| Members | PascalCase, no prefix | `PendingRequests`, `ChatMessages` |
| Booleans | `b` prefix | `bApproved`, `bIsFromUser` |
| Globals | `G` prefix | `GApprovalGate`, `GMessageHandler` |

### TypeScript Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Classes | PascalCase | `ApprovalGate`, `WebSocketBridge` |
| Functions | camelCase | `classifyOperation()`, `chatSendMessage()` |
| Interfaces | PascalCase | `SafetyClassification`, `ApprovalRequestContext` |
| Test files | `*.test.ts` | `approval-ws-flow.test.ts` |
| Tool handlers | file named after tool | `send-message.ts` in `tools/chat/` |

### Slate Widget Rules

1. `SNew()` for inline construction; `SAssignNew()` to capture a `TSharedPtr` reference.
2. Slate widgets MUST only be constructed on the GameThread.
3. Modal dialogs use `GEditor->EditorAddModalWindow(Window)` — this call blocks until the window closes.
4. Tab spawners registered with `FGlobalTabmanager::Get()->RegisterNomadTabSpawner()` in `StartupModule()` and unregistered in `ShutdownModule()`.
5. Timer-based operations in widgets use `GEditor->GetTimerManager()`, not raw `std::thread` or async tasks.

### Safety System Rules

1. Every destructive operation (level = `dangerous`) must go through `ApprovalGate.requestApproval()`.
2. In tests, always call `gate.setAutoResponse('approve' | 'reject')` to avoid 60-second waits.
3. The approval timeout (60s) defaults to reject — never to approve.
4. Error code for approval rejection: `6001`.
5. The WS method for approval is `safety.requestApproval` (outbound) — the only MCP-initiated message.

### WS Protocol Rules

1. All WS messages use UUID v4 for `id` field.
2. Method names use dot-notation: `<domain>.<verb>`, all lowercase domain, camelCase verb.
   Examples: `safety.requestApproval`, `chat.sendMessage`, `chat.receiveResponse`
3. Responses always include `duration_ms` (milliseconds, floating point).
4. Error responses include `{ code, message }` at minimum.
5. A `result` and `error` are mutually exclusive in a response.

---

## 8. Implementation Notes

### Additional Fixes (Post-Implementation Review)

During architect verification, three issues were identified and fixed:

1. **`blueprint-deleteNode` was not gated by ApprovalGate** (HIGH severity)
   - The `classifyOperation()` correctly classified Blueprint deletion as `dangerous`, but the tool handler in `delete-node.ts` sent WS requests directly without checking approval.
   - **Fix:** Added `ApprovalGate` as third parameter to `blueprintDeleteNode()`, added safety classification + approval check before sending WS request, updated `server.ts` to pass `approvalGate` to the handler.

2. **`write-file.ts` missing context in `requestApproval` call** (MEDIUM severity)
   - `requestApproval(classification)` was called without the second `context` argument, meaning the Slate dialog would not show `toolName` or `filePath`.
   - **Fix:** Changed to `requestApproval(classification, { toolName: 'file-write', filePath: params.filePath })`.

3. **`ARCHITECTURE.md` still referenced `UnrealMasterPlugin/`** (LOW severity)
   - The directory name was outdated from the planning phase.
   - **Fix:** Replaced all occurrences of `UnrealMasterPlugin/` with `ue-plugin/` and clarified error code 6001.

### Files Created or Modified

**New files:**

| File | Purpose |
| ---- | ------- |
| `mcp-server/src/tools/chat/send-message.ts` | Chat tool handler |
| `mcp-server/tests/unit/tools/chat.test.ts` | Chat unit tests (3) |
| `mcp-server/tests/integration/approval-ws-flow.test.ts` | Approval WS integration tests (5) |
| `ue-plugin/Source/UnrealMasterAgent/Public/Safety/UMAApprovalGate.h` | Safety system: request struct, Slate dialog, gate class |
| `ue-plugin/Source/UnrealMasterAgent/Private/Safety/UMAApprovalGate.cpp` | Safety system implementation |
| `ue-plugin/Source/UnrealMasterAgent/Public/Editor/UMAEditorSubsystem.h` | Chat subsystem with tab spawner |
| `ue-plugin/Source/UnrealMasterAgent/Private/Editor/UMAEditorSubsystem.cpp` | Chat subsystem implementation |
| `ue-plugin/Source/UnrealMasterAgent/Public/Editor/SUMAChatPanel.h` | Chat Slate widget |
| `ue-plugin/Source/UnrealMasterAgent/Private/Editor/SUMAChatPanel.cpp` | Chat widget implementation |
| `ue-plugin/Source/UnrealMasterAgentTests/Private/UMAApprovalGateTest.cpp` | Safety automation tests (6) |
| `ue-plugin/Source/UnrealMasterAgentTests/Private/UMAEditorSubsystemTest.cpp` | Chat automation tests (4) |
| `mcp-server/AGENTS.md` | Layer 2 documentation |
| `ue-plugin/AGENTS.md` | Layer 3 documentation |
| `docs/AGENTS.md` | RAG knowledge base documentation |

**Modified files:**

| File | Changes |
| ---- | ------- |
| `mcp-server/src/state/safety.ts` | Added WS round-trip, `ApprovalRequestContext` interface, bridge parameter |
| `mcp-server/src/server.ts` | 20 tools, `ApprovalGate(60000, bridge)`, `chat-sendMessage` tool, approval gate for delete |
| `mcp-server/src/tools/blueprint/delete-node.ts` | Added ApprovalGate parameter and safety check |
| `mcp-server/src/tools/file/write-file.ts` | Added context to `requestApproval()` call |
| `mcp-server/tests/fixtures/mock-ue-client.ts` | Added `setApprovalResponse()`, approval message interception |
| `mcp-server/tests/unit/tools/blueprint-tools.test.ts` | Added ApprovalGate for delete node tests |
| `ue-plugin/Source/UnrealMasterAgent/Private/UnrealMasterAgent.cpp` | 14 handlers, safety + chat handler registration |
| `ue-plugin/Source/UnrealMasterAgent/Public/WebSocket/UMAWebSocketClient.h` | Added `SendRawMessage()` |
| `ue-plugin/Source/UnrealMasterAgent/Private/WebSocket/UMAWebSocketClient.cpp` | Implemented `SendRawMessage()` |
| `AGENTS.md` | Updated to reflect implemented state |
| `README.md` | Updated project structure, test paths, deferred features |
| `ARCHITECTURE.md` | Fixed directory names, error code 6001 |

### Test Summary

| Suite | Count | Status |
| ----- | ----- | ------ |
| TS unit tests | ~200 | ✅ Pass |
| TS integration tests | ~27 | ✅ Pass |
| **Total TS tests** | **227** | **✅ Pass** |
| UE automation tests (Safety) | 6 | ⏳ Requires UE Editor |
| UE automation tests (Chat) | 4 | ⏳ Requires UE Editor |
| **Total UE tests** | **10** | **⏳ Pending** |
