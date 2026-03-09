// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "WebSocket/UMAMessageTypes.h"

class FUMAPythonBridge
{
public:
    static FUMAWSResponse ExecutePython(
        const FString& ScriptName,
        const TSharedPtr<FJsonObject>& Params);

    static bool IsPythonAvailable();

private:
    static FString GetScriptPath(const FString& ScriptName);
};
