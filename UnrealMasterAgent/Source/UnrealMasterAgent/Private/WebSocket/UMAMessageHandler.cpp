// Copyright Unreal Master Team. All Rights Reserved.

#include "WebSocket/UMAMessageHandler.h"

FUMAMessageHandler::FUMAMessageHandler()
{
}

FUMAMessageHandler::~FUMAMessageHandler()
{
}

void FUMAMessageHandler::RegisterHandler(const FString& Method, FOnUMAHandleMethod Handler)
{
    if (Handlers.Contains(Method))
    {
        UE_LOG(LogTemp, Warning, TEXT("[UMA] Overwriting existing handler for method: %s"), *Method);
    }
    Handlers.Add(Method, Handler);
    UE_LOG(LogTemp, Log, TEXT("[UMA] Registered handler for method: %s"), *Method);
}

FUMAWSResponse FUMAMessageHandler::HandleMessage(const FUMAWSMessage& Message)
{
    const double StartTime = FPlatformTime::Seconds();

    FUMAWSResponse Response;
    Response.Id = Message.Id;

    if (FOnUMAHandleMethod* Handler = Handlers.Find(Message.Method))
    {
        if (Handler->IsBound())
        {
            Response = Handler->Execute(Message);
        }
        else
        {
            FUMAWSError Error;
            Error.Code = 2000;
            Error.Message = FString::Printf(TEXT("Handler for '%s' is not bound"), *Message.Method);
            Response.Error = Error;
        }
    }
    else
    {
        FUMAWSError Error;
        Error.Code = 2001;
        Error.Message = FString::Printf(TEXT("Unknown method: '%s'"), *Message.Method);
        Response.Error = Error;
        UE_LOG(LogTemp, Warning, TEXT("[UMA] No handler for method: %s"), *Message.Method);
    }

    Response.Duration_ms = (FPlatformTime::Seconds() - StartTime) * 1000.0;
    return Response;
}

bool FUMAMessageHandler::HasHandler(const FString& Method) const
{
    return Handlers.Contains(Method);
}
