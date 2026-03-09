// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Compilation/UMACompileLogParser.h"

DECLARE_DELEGATE_OneParam(FOnCompileComplete, const FUMACompileResult&);

/**
 * Wraps ILiveCodingModule for programmatic compilation.
 * Guarded with #if WITH_LIVE_CODING.
 * Falls back gracefully when Live Coding is unavailable.
 */
class UNREALMASTERAGENT_API FUMALiveCodingController
{
public:
    FUMALiveCodingController();
    ~FUMALiveCodingController();

    /** Check if Live Coding module is available */
    bool IsAvailable() const;

    /** Check if Live Coding is enabled for the current session */
    bool IsEnabled() const;

    /** Trigger a Live Coding compile. Returns false if not available or already compiling. */
    bool TriggerCompile();

    /** Check if currently compiling */
    bool IsCompiling() const;

    /** Get current status as string */
    FString GetStatusString() const;

    /** Get the last compile result */
    FUMACompileResult GetLastResult() const;

    /** Delegate called when compile completes */
    FOnCompileComplete OnCompileComplete;

private:
    bool bIsCompiling = false;
    FUMACompileResult LastResult;
    double CompileStartTime = 0.0;

#if WITH_LIVE_CODING
    void OnPatchComplete();
#endif
};
