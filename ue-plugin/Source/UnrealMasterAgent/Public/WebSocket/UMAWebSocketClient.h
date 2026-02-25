// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "WebSocket/UMAMessageTypes.h"

DECLARE_DELEGATE_OneParam(FOnUMAMessageReceived, const FUMAWSMessage&);
DECLARE_DELEGATE(FOnUMAConnected);
DECLARE_DELEGATE_OneParam(FOnUMADisconnected, const FString& /* Reason */);

class IWebSocket;

/**
 * WebSocket client that connects to the MCP Bridge Server.
 * UE is the CLIENT, Node.js is the SERVER (reversed from typical setup).
 *
 * THREADING: WebSocket events fire on background thread.
 * All handlers MUST dispatch to GameThread via AsyncTask.
 */
class UNREALMASTERAGENT_API FUMAWebSocketClient
{
public:
    FUMAWebSocketClient();
    ~FUMAWebSocketClient();

    /** Connect to MCP Bridge Server at the given URL (e.g., "ws://localhost:9877") */
    void Connect(const FString& Url);

    /** Disconnect from server */
    void Disconnect();

    /** Check if currently connected */
    bool IsConnected() const;

    /** Send a response back to the bridge server */
    void SendResponse(const FUMAWSResponse& Response);

    /** Send a raw message (outbound, no response correlation needed). */
    void SendRawMessage(const FUMAWSMessage& Message);

    /** Delegate: called when a message is received (already on GameThread) */
    FOnUMAMessageReceived OnMessageReceived;

    /** Delegate: called when connection is established */
    FOnUMAConnected OnConnected;

    /** Delegate: called when connection is lost */
    FOnUMADisconnected OnDisconnected;

private:
    /** Internal WebSocket instance */
    TSharedPtr<IWebSocket> WebSocket;

    /** Connection state */
    bool bIsConnected = false;

    /** Server URL */
    FString ServerUrl;

    /** Handle incoming raw message from WebSocket */
    void OnRawMessageReceived(const FString& Message);

    /** Handle connection established */
    void OnConnectionEstablished();

    /** Handle connection error */
    void OnConnectionError(const FString& Error);

    /** Handle connection closed */
    void OnConnectionClosed(int32 StatusCode, const FString& Reason, bool bWasClean);
};
