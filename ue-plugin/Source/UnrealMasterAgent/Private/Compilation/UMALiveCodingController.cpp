// Copyright Unreal Master Team. All Rights Reserved.

#include "Compilation/UMALiveCodingController.h"

#if WITH_LIVE_CODING
#include "ILiveCodingModule.h"
#endif

// ---------------------------------------------------------------------------
// Constructor: bind to Live Coding patch-complete delegate if available
// ---------------------------------------------------------------------------
FUMALiveCodingController::FUMALiveCodingController()
{
#if WITH_LIVE_CODING
    ILiveCodingModule* LC = FModuleManager::GetModulePtr<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);
    if (LC)
    {
        LC->GetOnPatchCompleteDelegate().AddRaw(this, &FUMALiveCodingController::OnPatchComplete);
    }
#endif
}

// ---------------------------------------------------------------------------
// Destructor: unbind from Live Coding delegate
// ---------------------------------------------------------------------------
FUMALiveCodingController::~FUMALiveCodingController()
{
#if WITH_LIVE_CODING
    ILiveCodingModule* LC = FModuleManager::GetModulePtr<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);
    if (LC)
    {
        LC->GetOnPatchCompleteDelegate().RemoveAll(this);
    }
#endif
}

// ---------------------------------------------------------------------------
// IsAvailable: Check if the Live Coding module is loaded
// ---------------------------------------------------------------------------
bool FUMALiveCodingController::IsAvailable() const
{
#if WITH_LIVE_CODING
    ILiveCodingModule* LC = FModuleManager::GetModulePtr<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);
    return LC != nullptr;
#else
    return false;
#endif
}

// ---------------------------------------------------------------------------
// IsEnabled: Check if Live Coding is enabled for the current editor session
// ---------------------------------------------------------------------------
bool FUMALiveCodingController::IsEnabled() const
{
#if WITH_LIVE_CODING
    ILiveCodingModule* LC = FModuleManager::GetModulePtr<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);
    return LC && LC->IsEnabledForSession();
#else
    return false;
#endif
}

// ---------------------------------------------------------------------------
// TriggerCompile: Initiate a Live Coding compile pass
// ---------------------------------------------------------------------------
bool FUMALiveCodingController::TriggerCompile()
{
    if (bIsCompiling)
    {
        return false;
    }

#if WITH_LIVE_CODING
    ILiveCodingModule* LC = FModuleManager::GetModulePtr<ILiveCodingModule>(LIVE_CODING_MODULE_NAME);
    if (LC && LC->IsEnabledForSession())
    {
        bIsCompiling = true;
        CompileStartTime = FPlatformTime::Seconds();
        LC->EnableByDefault(true);
        return LC->Compile(ELiveCodingCompileFlags::None, nullptr);
    }
#endif
    return false;
}

// ---------------------------------------------------------------------------
// IsCompiling: Check if a compile is currently in progress
// ---------------------------------------------------------------------------
bool FUMALiveCodingController::IsCompiling() const
{
    return bIsCompiling;
}

// ---------------------------------------------------------------------------
// GetStatusString: Human-readable status for the current controller state
// ---------------------------------------------------------------------------
FString FUMALiveCodingController::GetStatusString() const
{
    if (bIsCompiling)
    {
        const double Elapsed = FPlatformTime::Seconds() - CompileStartTime;
        return FString::Printf(TEXT("Compiling (%.1fs elapsed)"), Elapsed);
    }

    if (!IsAvailable())
    {
        return TEXT("Live Coding not available");
    }

    if (!IsEnabled())
    {
        return TEXT("Live Coding disabled for session");
    }

    if (LastResult.bSuccess)
    {
        return FString::Printf(TEXT("Last compile succeeded (%.2fs, %d warnings)"),
            LastResult.DurationSeconds, LastResult.WarningCount);
    }

    if (LastResult.ErrorCount > 0)
    {
        return FString::Printf(TEXT("Last compile failed (%d errors, %d warnings)"),
            LastResult.ErrorCount, LastResult.WarningCount);
    }

    return TEXT("Ready");
}

// ---------------------------------------------------------------------------
// GetLastResult: Return the most recent compile result
// ---------------------------------------------------------------------------
FUMACompileResult FUMALiveCodingController::GetLastResult() const
{
    return LastResult;
}

// ---------------------------------------------------------------------------
// OnPatchComplete: Called by Live Coding when a patch finishes applying
// ---------------------------------------------------------------------------
#if WITH_LIVE_CODING
void FUMALiveCodingController::OnPatchComplete()
{
    const double EndTime = FPlatformTime::Seconds();
    LastResult.DurationSeconds = EndTime - CompileStartTime;
    // Patch complete means success (errors would have prevented patching)
    LastResult.bSuccess = true;
    LastResult.ErrorCount = 0;
    LastResult.WarningCount = 0;
    LastResult.Errors.Empty();
    bIsCompiling = false;

    OnCompileComplete.ExecuteIfBound(LastResult);
}
#endif
