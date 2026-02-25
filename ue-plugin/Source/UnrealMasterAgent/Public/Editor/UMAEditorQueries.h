// Copyright Unreal Master Team. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "Dom/JsonObject.h"

/**
 * Static utility class for querying Unreal Editor state.
 * All methods return FString (JSON) for transmission via WebSocket.
 */
class UNREALMASTERAGENT_API FUMAEditorQueries
{
public:
    /** Returns current level info: {levelName, actorCount, worldType} */
    static FString GetLevelInfo();

    /** Returns array of actors: [{name, class, location}] with optional filters */
    static FString ListActors(const FString& ClassNameFilter = TEXT(""), const FString& TagFilter = TEXT(""));

    /** Returns asset metadata: {assetPath, assetClass, diskSize} */
    static FString GetAssetInfo(const FString& AssetPath);
};
