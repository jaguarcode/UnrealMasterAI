// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"

/**
 * Generic result for Blueprint manipulation operations.
 */
struct FUMAOperationResult
{
    /** Whether the operation completed successfully */
    bool bSuccess = false;

    /** Human-readable error description when bSuccess is false */
    FString ErrorMessage;
};

/**
 * Result of a node spawn operation, includes the new node's GUID.
 */
struct FUMANodeSpawnResult : public FUMAOperationResult
{
    /** GUID string of the newly created node */
    FString NodeId;
};

/**
 * Result of a pin connection operation.
 */
struct FUMAPinConnectResult : public FUMAOperationResult
{
    /** Additional diagnostic info about the connection attempt */
    FString DiagnosticInfo;
};
