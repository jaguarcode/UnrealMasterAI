// Copyright Unreal Master Team. All Rights Reserved.

#include "WebSocket/UMAWebSocketClient.h"
#include "WebSocketsModule.h"
#include "IWebSocket.h"
#include "Async/Async.h"

FUMAWebSocketClient::FUMAWebSocketClient()
{
}

FUMAWebSocketClient::~FUMAWebSocketClient()
{
    Disconnect();
}

void FUMAWebSocketClient::Connect(const FString& Url)
{
    ServerUrl = Url;

    if (!FModuleManager::Get().IsModuleLoaded(TEXT("WebSockets")))
    {
        FModuleManager::Get().LoadModule(TEXT("WebSockets"));
    }

    WebSocket = FWebSocketsModule::Get().CreateWebSocket(Url, TEXT("ws"));

    if (!WebSocket.IsValid())
    {
        UE_LOG(LogTemp, Error, TEXT("[UMA] Failed to create WebSocket for URL: %s"), *Url);
        return;
    }

    // Bind event handlers
    WebSocket->OnConnected().AddLambda([this]()
    {
        OnConnectionEstablished();
    });

    WebSocket->OnConnectionError().AddLambda([this](const FString& Error)
    {
        OnConnectionError(Error);
    });

    WebSocket->OnClosed().AddLambda([this](int32 StatusCode, const FString& Reason, bool bWasClean)
    {
        OnConnectionClosed(StatusCode, Reason, bWasClean);
    });

    WebSocket->OnMessage().AddLambda([this](const FString& Message)
    {
        OnRawMessageReceived(Message);
    });

    WebSocket->Connect();
}

void FUMAWebSocketClient::Disconnect()
{
    if (WebSocket.IsValid() && WebSocket->IsConnected())
    {
        WebSocket->Close();
    }
    bIsConnected = false;
}

bool FUMAWebSocketClient::IsConnected() const
{
    return bIsConnected;
}

void FUMAWebSocketClient::SendResponse(const FUMAWSResponse& Response)
{
    if (!IsConnected())
    {
        UE_LOG(LogTemp, Warning, TEXT("[UMA] Cannot send response: not connected"));
        return;
    }

    const FString JsonString = Response.ToJson();
    WebSocket->Send(JsonString);
}

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

void FUMAWebSocketClient::OnRawMessageReceived(const FString& Message)
{
    // CRITICAL: Dispatch to GameThread for safe UE API access
    AsyncTask(ENamedThreads::GameThread, [this, Message]()
    {
        FUMAWSMessage ParsedMessage;
        if (ParsedMessage.FromJson(Message))
        {
            OnMessageReceived.ExecuteIfBound(ParsedMessage);
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("[UMA] Failed to parse incoming message: %s"), *Message);
        }
    });
}

void FUMAWebSocketClient::OnConnectionEstablished()
{
    bIsConnected = true;
    UE_LOG(LogTemp, Log, TEXT("[UMA] WebSocket connected to %s"), *ServerUrl);

    AsyncTask(ENamedThreads::GameThread, [this]()
    {
        OnConnected.ExecuteIfBound();
    });
}

void FUMAWebSocketClient::OnConnectionError(const FString& Error)
{
    bIsConnected = false;
    UE_LOG(LogTemp, Error, TEXT("[UMA] WebSocket connection error: %s"), *Error);
}

void FUMAWebSocketClient::OnConnectionClosed(int32 StatusCode, const FString& Reason, bool bWasClean)
{
    bIsConnected = false;
    UE_LOG(LogTemp, Log, TEXT("[UMA] WebSocket closed (Code: %d, Reason: %s, Clean: %s)"),
        StatusCode, *Reason, bWasClean ? TEXT("Yes") : TEXT("No"));

    AsyncTask(ENamedThreads::GameThread, [this, Reason]()
    {
        OnDisconnected.ExecuteIfBound(Reason);
    });
}
