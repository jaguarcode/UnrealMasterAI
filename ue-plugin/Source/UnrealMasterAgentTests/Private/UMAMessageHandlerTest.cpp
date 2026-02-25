// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "WebSocket/UMAMessageHandler.h"
#include "WebSocket/UMAMessageTypes.h"

// Test: Message handler routes ping to correct handler
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAMessageHandlerPingRouteTest,
    "UnrealMasterAgent.MessageHandler.PingRoute",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAMessageHandlerPingRouteTest::RunTest(const FString& Parameters)
{
    FUMAMessageHandler Handler;
    bool bPingHandled = false;

    Handler.RegisterHandler(TEXT("editor.ping"), [&bPingHandled](const FUMAWSMessage& Message)
    {
        bPingHandled = true;
        FUMAWSResponse Response;
        Response.Id = Message.Id;
        Response.Duration_ms = 0.1;
        return Response;
    });

    FUMAWSMessage PingMessage;
    PingMessage.Id = FGuid::NewGuid().ToString();
    PingMessage.Method = TEXT("editor.ping");
    PingMessage.Timestamp = FDateTime::UtcNow().ToUnixTimestamp() * 1000;

    Handler.HandleMessage(PingMessage);
    TestTrue(TEXT("Ping handler should have been called"), bPingHandled);
    return true;
}

// Test: Unknown method returns error response
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAMessageHandlerUnknownMethodTest,
    "UnrealMasterAgent.MessageHandler.UnknownMethod",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAMessageHandlerUnknownMethodTest::RunTest(const FString& Parameters)
{
    FUMAMessageHandler Handler;

    FUMAWSMessage UnknownMessage;
    UnknownMessage.Id = FGuid::NewGuid().ToString();
    UnknownMessage.Method = TEXT("unknown.method");
    UnknownMessage.Timestamp = FDateTime::UtcNow().ToUnixTimestamp() * 1000;

    FUMAWSResponse Response = Handler.HandleMessage(UnknownMessage);
    TestTrue(TEXT("Response should have error"), Response.Error.IsSet());
    TestEqual(TEXT("Error code should be 2001"), Response.Error.GetValue().Code, 2001);
    return true;
}
