// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * WebSocket message from MCP Bridge Server to UE Plugin.
 * Matches ws-protocol.schema.json WSMessage definition.
 */
struct FUMAWSMessage
{
    /** UUID v4 for request/response correlation */
    FString Id;

    /** Dot-notation command (e.g., "blueprint.serialize") */
    FString Method;

    /** Command-specific parameters */
    TSharedPtr<FJsonObject> Params;

    /** Unix timestamp in milliseconds */
    int64 Timestamp = 0;

    /** Parse from JSON string. Returns false if parsing fails. */
    bool FromJson(const FString& JsonString);

    /** Serialize to JSON string */
    FString ToJson() const;
};

/**
 * Error details for response messages.
 */
struct FUMAWSError
{
    /** Error code per taxonomy (1000-6099) */
    int32 Code = 0;

    /** Human-readable error description */
    FString Message;

    /** Optional structured error context */
    TSharedPtr<FJsonObject> Data;
};

/**
 * WebSocket response from UE Plugin to MCP Bridge Server.
 * Matches ws-protocol.schema.json WSResponse definition.
 */
struct FUMAWSResponse
{
    /** Correlates to request FUMAWSMessage.Id */
    FString Id;

    /** Success payload (valid on success) */
    TSharedPtr<FJsonObject> Result;

    /** Error details (valid on failure) */
    TOptional<FUMAWSError> Error;

    /** Server-side processing time in milliseconds */
    double Duration_ms = 0.0;

    /** Serialize to JSON string */
    FString ToJson() const;
};
