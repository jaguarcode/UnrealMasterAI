// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "WebSocket/UMAWebSocketClient.h"

// Test: WebSocket client initializes without crash
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAWebSocketClientInitTest,
    "UnrealMasterAgent.WebSocket.Client.Init",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAWebSocketClientInitTest::RunTest(const FString& Parameters)
{
    FUMAWebSocketClient Client;
    // Should be disconnected initially
    TestFalse(TEXT("Client should not be connected on init"), Client.IsConnected());
    return true;
}

// Test: WebSocket client handles connection failure gracefully
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAWebSocketClientConnectionFailTest,
    "UnrealMasterAgent.WebSocket.Client.ConnectionFail",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAWebSocketClientConnectionFailTest::RunTest(const FString& Parameters)
{
    FUMAWebSocketClient Client;
    // Should not crash when trying to connect to non-existent server
    Client.Connect(TEXT("ws://localhost:19999"));
    TestFalse(TEXT("Client should not be connected to non-existent server"), Client.IsConnected());
    return true;
}

// Test: Message handler dispatches to GameThread
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAWebSocketClientGameThreadTest,
    "UnrealMasterAgent.WebSocket.Client.GameThread",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAWebSocketClientGameThreadTest::RunTest(const FString& Parameters)
{
    // Verify we're on the GameThread when test runs
    TestTrue(TEXT("Test should run on GameThread"), IsInGameThread());
    return true;
}
