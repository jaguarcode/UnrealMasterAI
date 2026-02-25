// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "Safety/UMAApprovalGate.h"
#include "WebSocket/UMAMessageTypes.h"

// ---------------------------------------------------------------------------
// Test 1: ApprovalGate creates valid object
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
// Test 3: Approve resolves with true
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateApproveTest,
    "UnrealMasterAgent.Safety.ApprovalGate.ApproveResponse",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateApproveTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    FUMAApprovalRequest Request;
    Request.OperationId = TEXT("test-approve-001");
    Request.ToolName    = TEXT("file-write");
    Request.Reason      = TEXT("Writing to production content path");

    bool bCallbackResult = false;
    Gate.SetPendingRequest(Request);

    // Manually set the callback
    bool bResolved = Gate.ResolveRequest(TEXT("test-approve-001"), true);
    TestTrue(TEXT("Request was resolved"), bResolved);
    TestEqual(TEXT("No pending requests remain"), Gate.GetPendingCount(), 0);

    return true;
}

// ---------------------------------------------------------------------------
// Test 4: Reject resolves with false
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateRejectTest,
    "UnrealMasterAgent.Safety.ApprovalGate.RejectResponse",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateRejectTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    FUMAApprovalRequest Request;
    Request.OperationId = TEXT("test-reject-001");
    Request.ToolName    = TEXT("blueprint-deleteNode");
    Request.Reason      = TEXT("Destructive Blueprint operation");

    Gate.SetPendingRequest(Request);

    bool bResolved = Gate.ResolveRequest(TEXT("test-reject-001"), false);
    TestTrue(TEXT("Request was resolved"), bResolved);
    TestEqual(TEXT("No pending requests remain"), Gate.GetPendingCount(), 0);

    return true;
}

// ---------------------------------------------------------------------------
// Test 5: Multiple simultaneous requests queued
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateQueueTest,
    "UnrealMasterAgent.Safety.ApprovalGate.MultipleRequestsQueued",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateQueueTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    FUMAApprovalRequest Request1;
    Request1.OperationId = TEXT("queue-001");
    Request1.ToolName    = TEXT("blueprint-deleteNode");
    Request1.Reason      = TEXT("Delete node");

    FUMAApprovalRequest Request2;
    Request2.OperationId = TEXT("queue-002");
    Request2.ToolName    = TEXT("file-write");
    Request2.Reason      = TEXT("Write production file");

    Gate.SetPendingRequest(Request1);
    Gate.SetPendingRequest(Request2);

    TestEqual(TEXT("Two pending requests"), Gate.GetPendingCount(), 2);

    Gate.ResolveRequest(TEXT("queue-001"), true);
    TestEqual(TEXT("One pending request after resolving first"), Gate.GetPendingCount(), 1);

    Gate.ResolveRequest(TEXT("queue-002"), false);
    TestEqual(TEXT("Zero pending requests after resolving second"), Gate.GetPendingCount(), 0);

    return true;
}

// ---------------------------------------------------------------------------
// Test 6: Unknown operation ID returns false from ResolveRequest
// ---------------------------------------------------------------------------
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAApprovalGateUnknownIdTest,
    "UnrealMasterAgent.Safety.ApprovalGate.UnknownOperationId",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAApprovalGateUnknownIdTest::RunTest(const FString& Parameters)
{
    FUMAApprovalGate Gate;

    bool bResolved = Gate.ResolveRequest(TEXT("nonexistent-id"), true);
    TestFalse(TEXT("ResolveRequest returns false for unknown ID"), bResolved);

    return true;
}
