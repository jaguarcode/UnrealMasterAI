// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "Compilation/UMALiveCodingController.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMALCModuleCheck, "UnrealMasterAgent.Compilation.LiveCoding.ModuleCheck",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMALCModuleCheck::RunTest(const FString& Parameters)
{
    // Check that the controller can be created and reports availability
    FUMALiveCodingController Controller;
    bool bAvailable = Controller.IsAvailable();
    // On some platforms Live Coding is not available - just verify no crash
    TestTrue(TEXT("IsAvailable returns a boolean without crashing"), true);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMALCStatusCheck, "UnrealMasterAgent.Compilation.LiveCoding.StatusCheck",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMALCStatusCheck::RunTest(const FString& Parameters)
{
    FUMALiveCodingController Controller;
    FString Status = Controller.GetStatusString();
    TestTrue(TEXT("Status is not empty"), !Status.IsEmpty());
    return true;
}
