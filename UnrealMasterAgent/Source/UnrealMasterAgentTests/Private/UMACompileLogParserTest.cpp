// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "Compilation/UMACompileLogParser.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAParserMSVCError, "UnrealMasterAgent.Compilation.Parser.MSVCError",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAParserMSVCError::RunTest(const FString& Parameters)
{
    FString ErrorLine = TEXT("C:\\Project\\Source\\MyActor.cpp(42): error C2065: 'UndeclaredVar': undeclared identifier");
    TArray<FUMACompileError> Errors = FUMACompileLogParser::ParseLine(ErrorLine);

    TestEqual(TEXT("One error parsed"), Errors.Num(), 1);
    if (Errors.Num() > 0)
    {
        TestTrue(TEXT("File contains MyActor.cpp"), Errors[0].File.Contains(TEXT("MyActor.cpp")));
        TestEqual(TEXT("Line is 42"), Errors[0].Line, 42);
        TestEqual(TEXT("Severity is error"), Errors[0].Severity, TEXT("error"));
        TestTrue(TEXT("Code is C2065"), Errors[0].Code.Contains(TEXT("C2065")));
    }
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAParserClangError, "UnrealMasterAgent.Compilation.Parser.ClangError",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAParserClangError::RunTest(const FString& Parameters)
{
    FString ErrorLine = TEXT("/Project/Source/MyActor.cpp:42:10: error: use of undeclared identifier 'x'");
    TArray<FUMACompileError> Errors = FUMACompileLogParser::ParseLine(ErrorLine);

    TestEqual(TEXT("One error parsed"), Errors.Num(), 1);
    if (Errors.Num() > 0)
    {
        TestTrue(TEXT("File is MyActor.cpp"), Errors[0].File.Contains(TEXT("MyActor.cpp")));
        TestEqual(TEXT("Line is 42"), Errors[0].Line, 42);
        TestEqual(TEXT("Column is 10"), Errors[0].Column, 10);
        TestEqual(TEXT("Severity is error"), Errors[0].Severity, TEXT("error"));
    }
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAParserWarning, "UnrealMasterAgent.Compilation.Parser.Warning",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAParserWarning::RunTest(const FString& Parameters)
{
    FString WarnLine = TEXT("/Project/Source/MyActor.cpp:10:5: warning: unused variable 'y' [-Wunused-variable]");
    TArray<FUMACompileError> Errors = FUMACompileLogParser::ParseLine(WarnLine);

    TestEqual(TEXT("One warning parsed"), Errors.Num(), 1);
    if (Errors.Num() > 0)
    {
        TestEqual(TEXT("Severity is warning"), Errors[0].Severity, TEXT("warning"));
    }
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAParserCleanBuild, "UnrealMasterAgent.Compilation.Parser.CleanBuild",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAParserCleanBuild::RunTest(const FString& Parameters)
{
    FString CleanOutput = TEXT("Build succeeded.\n0 Warning(s)\n0 Error(s)");
    TArray<FUMACompileError> Errors = FUMACompileLogParser::ParseOutput(CleanOutput);

    TestEqual(TEXT("No errors from clean build"), Errors.Num(), 0);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAParserLinkerError, "UnrealMasterAgent.Compilation.Parser.LinkerError",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAParserLinkerError::RunTest(const FString& Parameters)
{
    FString LinkerLine = TEXT("MyActor.cpp.obj : error LNK2019: unresolved external symbol");
    TArray<FUMACompileError> Errors = FUMACompileLogParser::ParseLine(LinkerLine);

    TestEqual(TEXT("One linker error parsed"), Errors.Num(), 1);
    if (Errors.Num() > 0)
    {
        TestTrue(TEXT("Code contains LNK"), Errors[0].Code.Contains(TEXT("LNK")));
        TestEqual(TEXT("Severity is error"), Errors[0].Severity, TEXT("error"));
    }
    return true;
}
