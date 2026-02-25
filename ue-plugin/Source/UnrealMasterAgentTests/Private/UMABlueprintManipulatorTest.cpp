// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "Blueprint/UMABlueprintManipulator.h"
#include "Blueprint/UMABlueprintSerializer.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMABPManipSpawnNode, "UnrealMasterAgent.Blueprint.Manipulator.SpawnNode",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMABPManipSpawnNode::RunTest(const FString& Parameters)
{
    FUMANodeSpawnResult Result = FUMABlueprintManipulator::SpawnNode(
        TEXT("/Game/Tests/BP_ManipTest"), TEXT("EventGraph"),
        TEXT("K2Node_CallFunction"), TEXT("KismetSystemLibrary"), TEXT("PrintString"),
        400, 100);

    // For test environments without actual BP, check error handling
    if (!Result.bSuccess)
    {
        TestTrue(TEXT("Returns error message for missing BP"), !Result.ErrorMessage.IsEmpty());
    }
    else
    {
        FGuid ParsedGuid;
        TestTrue(TEXT("NodeId is valid GUID"), FGuid::Parse(Result.NodeId, ParsedGuid));
    }

    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMABPManipConnectPins, "UnrealMasterAgent.Blueprint.Manipulator.ConnectPins",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMABPManipConnectPins::RunTest(const FString& Parameters)
{
    FUMAPinConnectResult Result = FUMABlueprintManipulator::ConnectPins(
        TEXT("/Game/Tests/BP_ManipTest"),
        TEXT("invalid-source-pin"), TEXT("invalid-target-pin"));

    // Should fail gracefully for invalid pins
    TestFalse(TEXT("Connecting invalid pins returns failure"), Result.bSuccess);
    TestTrue(TEXT("Has error message"), !Result.ErrorMessage.IsEmpty());

    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMABPManipDeleteNode, "UnrealMasterAgent.Blueprint.Manipulator.DeleteNode",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMABPManipDeleteNode::RunTest(const FString& Parameters)
{
    FUMAOperationResult Result = FUMABlueprintManipulator::DeleteNode(
        TEXT("/Game/Tests/BP_ManipTest"), TEXT("invalid-node-id"));

    TestFalse(TEXT("Deleting invalid node returns failure"), Result.bSuccess);
    TestTrue(TEXT("Has error message"), !Result.ErrorMessage.IsEmpty());

    return true;
}
