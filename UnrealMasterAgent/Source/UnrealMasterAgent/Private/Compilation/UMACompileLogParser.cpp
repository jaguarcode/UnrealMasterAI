// Copyright Unreal Master Team. All Rights Reserved.

#include "Compilation/UMACompileLogParser.h"
#include "Internationalization/Regex.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Serialization/JsonWriter.h"
#include "Serialization/JsonSerializer.h"

// ---------------------------------------------------------------------------
// MSVC format: file(line): error CXXXX: message
// Also handles: file(line,col): error CXXXX: message
// Regex handles both forward and backslash paths
// ---------------------------------------------------------------------------
bool FUMACompileLogParser::TryParseMSVC(const FString& Line, FUMACompileError& OutError)
{
    // Pattern: path(line): severity CXXXX: message
    // Path can contain drive letter, backslashes, forward slashes, spaces
    const FRegexPattern Pattern(TEXT("(.+)\\((\\d+)(?:,\\d+)?\\)\\s*:\\s+(error|warning)\\s+(C\\d+)\\s*:\\s+(.+)"));
    FRegexMatcher Matcher(Pattern, Line);

    if (Matcher.FindNext())
    {
        OutError.File = Matcher.GetCaptureGroup(1);
        OutError.Line = FCString::Atoi(*Matcher.GetCaptureGroup(2));
        OutError.Column = 0;
        OutError.Severity = Matcher.GetCaptureGroup(3);
        OutError.Code = Matcher.GetCaptureGroup(4);
        OutError.Message = Matcher.GetCaptureGroup(5);
        return true;
    }

    return false;
}

// ---------------------------------------------------------------------------
// Clang format: file:line:col: severity: message
// Handles Unix paths (forward slashes) and Windows paths (drive letter)
// ---------------------------------------------------------------------------
bool FUMACompileLogParser::TryParseClang(const FString& Line, FUMACompileError& OutError)
{
    // Pattern: path:line:col: severity: message
    // Path handling: Unix paths start with /, Windows paths start with drive letter
    // We need to be careful with the colon in drive letters (e.g., C:\...)
    // Strategy: Match from the first colon that is followed by digits
    const FRegexPattern Pattern(TEXT("(.+?):(\\d+):(\\d+):\\s+(error|warning|note):\\s+(.+)"));
    FRegexMatcher Matcher(Pattern, Line);

    if (Matcher.FindNext())
    {
        OutError.File = Matcher.GetCaptureGroup(1);
        OutError.Line = FCString::Atoi(*Matcher.GetCaptureGroup(2));
        OutError.Column = FCString::Atoi(*Matcher.GetCaptureGroup(3));
        OutError.Severity = Matcher.GetCaptureGroup(4);
        OutError.Message = Matcher.GetCaptureGroup(5);
        // Clang does not always include an error code in the main line
        OutError.Code = FString();
        return true;
    }

    return false;
}

// ---------------------------------------------------------------------------
// Linker error format: file.obj : error LNKXXXX: message
// ---------------------------------------------------------------------------
bool FUMACompileLogParser::TryParseLinker(const FString& Line, FUMACompileError& OutError)
{
    const FRegexPattern Pattern(TEXT("(.+\\.obj)\\s*:\\s+error\\s+(LNK\\d+)\\s*:\\s+(.+)"));
    FRegexMatcher Matcher(Pattern, Line);

    if (Matcher.FindNext())
    {
        OutError.File = Matcher.GetCaptureGroup(1);
        OutError.Line = 0;
        OutError.Column = 0;
        OutError.Severity = TEXT("error");
        OutError.Code = Matcher.GetCaptureGroup(2);
        OutError.Message = Matcher.GetCaptureGroup(3);
        return true;
    }

    return false;
}

// ---------------------------------------------------------------------------
// ParseLine: Try each format in order of specificity
// ---------------------------------------------------------------------------
TArray<FUMACompileError> FUMACompileLogParser::ParseLine(const FString& Line)
{
    TArray<FUMACompileError> Results;

    if (Line.IsEmpty())
    {
        return Results;
    }

    FUMACompileError Error;

    // Try MSVC first (most specific pattern with parenthesized line numbers)
    if (TryParseMSVC(Line, Error))
    {
        Results.Add(MoveTemp(Error));
        return Results;
    }

    // Try linker errors next (before Clang, since .obj pattern is distinctive)
    if (TryParseLinker(Line, Error))
    {
        Results.Add(MoveTemp(Error));
        return Results;
    }

    // Try Clang/GCC format last (most general colon-separated format)
    if (TryParseClang(Line, Error))
    {
        Results.Add(MoveTemp(Error));
        return Results;
    }

    return Results;
}

// ---------------------------------------------------------------------------
// ParseOutput: Split multi-line output and parse each line
// ---------------------------------------------------------------------------
TArray<FUMACompileError> FUMACompileLogParser::ParseOutput(const FString& Output)
{
    TArray<FUMACompileError> AllErrors;

    TArray<FString> Lines;
    Output.ParseIntoArrayLines(Lines);

    for (const FString& Line : Lines)
    {
        TArray<FUMACompileError> LineErrors = ParseLine(Line);
        AllErrors.Append(MoveTemp(LineErrors));
    }

    return AllErrors;
}

// ---------------------------------------------------------------------------
// ErrorsToJson: Serialize array of errors to a JSON string
// ---------------------------------------------------------------------------
FString FUMACompileLogParser::ErrorsToJson(const TArray<FUMACompileError>& Errors)
{
    TArray<TSharedPtr<FJsonValue>> JsonArray;

    for (const FUMACompileError& Error : Errors)
    {
        TSharedPtr<FJsonObject> Obj = MakeShared<FJsonObject>();
        Obj->SetStringField(TEXT("file"), Error.File);
        Obj->SetNumberField(TEXT("line"), Error.Line);
        Obj->SetNumberField(TEXT("column"), Error.Column);
        Obj->SetStringField(TEXT("severity"), Error.Severity);
        Obj->SetStringField(TEXT("message"), Error.Message);
        Obj->SetStringField(TEXT("code"), Error.Code);
        JsonArray.Add(MakeShared<FJsonValueObject>(Obj));
    }

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(JsonArray, Writer);
    Writer->Close();

    return OutputString;
}

// ---------------------------------------------------------------------------
// GetCounts: Count errors and warnings from parsed array
// ---------------------------------------------------------------------------
void FUMACompileLogParser::GetCounts(const TArray<FUMACompileError>& Errors, int32& OutErrors, int32& OutWarnings)
{
    OutErrors = 0;
    OutWarnings = 0;

    for (const FUMACompileError& Error : Errors)
    {
        if (Error.Severity == TEXT("error"))
        {
            ++OutErrors;
        }
        else if (Error.Severity == TEXT("warning"))
        {
            ++OutWarnings;
        }
    }
}
