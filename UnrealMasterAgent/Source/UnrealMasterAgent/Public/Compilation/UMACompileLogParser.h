// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"

/** Structured representation of a single compile error/warning */
struct FUMACompileError
{
    FString File;
    int32 Line = 0;
    int32 Column = 0;
    FString Severity;  // "error", "warning", "note"
    FString Message;
    FString Code;      // Error code (e.g., C2065, LNK2019)
};

/** Structured compile result summary */
struct FUMACompileResult
{
    bool bSuccess = false;
    int32 ErrorCount = 0;
    int32 WarningCount = 0;
    TArray<FUMACompileError> Errors;
    double DurationSeconds = 0.0;
};

/**
 * Parses MSVC and Clang compile output into structured errors.
 * Handles single-line errors, multi-line template backtraces, and linker errors.
 */
class UNREALMASTERAGENT_API FUMACompileLogParser
{
public:
    /** Parse a single line of compiler output */
    static TArray<FUMACompileError> ParseLine(const FString& Line);

    /** Parse complete compiler output (multiple lines) */
    static TArray<FUMACompileError> ParseOutput(const FString& Output);

    /** Serialize errors to JSON string */
    static FString ErrorsToJson(const TArray<FUMACompileError>& Errors);

    /** Get summary counts */
    static void GetCounts(const TArray<FUMACompileError>& Errors, int32& OutErrors, int32& OutWarnings);

private:
    /** Try to parse as MSVC format: file(line): error CXXXX: message */
    static bool TryParseMSVC(const FString& Line, FUMACompileError& OutError);

    /** Try to parse as Clang format: file:line:col: severity: message */
    static bool TryParseClang(const FString& Line, FUMACompileError& OutError);

    /** Try to parse as linker error: file.obj : error LNKXXXX: message */
    static bool TryParseLinker(const FString& Line, FUMACompileError& OutError);
};
