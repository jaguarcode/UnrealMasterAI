// Copyright Unreal Master Team. All Rights Reserved.
#pragma once
#include "CoreMinimal.h"

/**
 * File operations handler for the Unreal Master Agent.
 * Provides file read, write, and search within the UE project directory.
 * All paths are validated to stay within project bounds.
 */
class UNREALMASTERAGENT_API FUMAFileOperations
{
public:
    /** Read a file within the project directory. Returns JSON string with content. */
    static FString ReadFile(const FString& FilePath, int32 Offset = 0, int32 Limit = -1);

    /** Write content to a file within the project directory. Returns JSON string with result. */
    static FString WriteFile(const FString& FilePath, const FString& Content);

    /** Search for files matching a pattern. Returns JSON string with matches. */
    static FString SearchFiles(const FString& Pattern, const FString& Directory = TEXT(""), const FString& Glob = TEXT(""));

private:
    /** Get the project root directory (FPaths::ProjectDir()) */
    static FString GetProjectRoot();

    /** Validate that a path is within the project directory (no path traversal) */
    static bool IsPathWithinProject(const FString& FilePath);

    /** Resolve a relative path to absolute within project */
    static FString ResolvePath(const FString& FilePath);
};
