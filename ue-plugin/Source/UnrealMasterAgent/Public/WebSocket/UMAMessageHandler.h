// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "WebSocket/UMAMessageTypes.h"

DECLARE_DELEGATE_RetVal_OneParam(FUMAWSResponse, FOnUMAHandleMethod, const FUMAWSMessage&);

/**
 * Routes incoming WebSocket messages to registered handlers based on the 'method' field.
 * All handler execution occurs on the GameThread (guaranteed by UMAWebSocketClient dispatch).
 */
class UNREALMASTERAGENT_API FUMAMessageHandler
{
public:
    FUMAMessageHandler();
    ~FUMAMessageHandler();

    /**
     * Register a handler for a specific method.
     * @param Method - Dot-notation method name (e.g., "editor.ping")
     * @param Handler - Delegate that processes the message and returns a response
     */
    void RegisterHandler(const FString& Method, FOnUMAHandleMethod Handler);

    /**
     * Handle an incoming message by routing to the registered handler.
     * Returns an error response if no handler is registered for the method.
     */
    FUMAWSResponse HandleMessage(const FUMAWSMessage& Message);

    /** Check if a handler is registered for a method */
    bool HasHandler(const FString& Method) const;

private:
    /** Map of method name -> handler delegate */
    TMap<FString, FOnUMAHandleMethod> Handlers;
};
