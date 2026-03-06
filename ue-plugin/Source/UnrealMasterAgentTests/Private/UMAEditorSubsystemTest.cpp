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
    const FName ChatTabId = TEXT("UMAChatPanel");
    // In UE 5.7, use HasTabSpawner instead of CanSpawnTab
    bool bRegistered = FGlobalTabmanager::Get()->HasTabSpawner(ChatTabId);
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

    TSharedPtr<SDockTab> Tab = FGlobalTabmanager::Get()->TryInvokeTab(ChatTabId);
    TestNotNull(TEXT("Chat tab can be spawned via TryInvokeTab"), Tab.Get());

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

    FString Method = Subsystem->GetChatSendMethod();
    TestEqual(TEXT("Chat send method is chat.sendMessage"),
        Method, FString(TEXT("chat.sendMessage")));

    return true;
}
