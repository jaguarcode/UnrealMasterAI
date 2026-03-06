// Copyright Unreal Master Team. All Rights Reserved.
#include "FileOps/UMAFileOperations.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HAL/FileManager.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonWriter.h"
#include "Serialization/JsonSerializer.h"

FString FUMAFileOperations::GetProjectRoot()
{
    return FPaths::ConvertRelativePathToFull(FPaths::ProjectDir());
}

bool FUMAFileOperations::IsPathWithinProject(const FString& FilePath)
{
    FString FullPath = ResolvePath(FilePath);
    FString ProjectRoot = GetProjectRoot();
    return FullPath.StartsWith(ProjectRoot);
}

FString FUMAFileOperations::ResolvePath(const FString& FilePath)
{
    FString FullPath;
    // Check if path is relative (doesn't start with drive letter or UNC path)
    bool bIsRelative = !FilePath.StartsWith(TEXT("/")) &&
                       !FilePath.StartsWith(TEXT("\\")) &&
                       (FilePath.Len() < 2 || FilePath[1] != TEXT(':'));
    if (bIsRelative)
    {
        FullPath = FPaths::ConvertRelativePathToFull(FPaths::ProjectDir() / FilePath);
    }
    else
    {
        FullPath = FPaths::ConvertRelativePathToFull(FilePath);
    }
    FPaths::NormalizeFilename(FullPath);
    FPaths::CollapseRelativeDirectories(FullPath);
    return FullPath;
}

FString FUMAFileOperations::ReadFile(const FString& FilePath, int32 Offset, int32 Limit)
{
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();

    if (!IsPathWithinProject(FilePath))
    {
        ResultObj->SetBoolField(TEXT("success"), false);
        ResultObj->SetStringField(TEXT("error"), TEXT("Path traversal blocked: file is outside project directory"));
        FString Output;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
        FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
        return Output;
    }

    FString FullPath = ResolvePath(FilePath);

    if (!FPaths::FileExists(FullPath))
    {
        ResultObj->SetBoolField(TEXT("success"), false);
        ResultObj->SetStringField(TEXT("error"), FString::Printf(TEXT("File not found: %s"), *FilePath));
        FString Output;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
        FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
        return Output;
    }

    FString FileContent;
    if (!FFileHelper::LoadFileToString(FileContent, *FullPath))
    {
        ResultObj->SetBoolField(TEXT("success"), false);
        ResultObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Failed to read file: %s"), *FilePath));
        FString Output;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
        FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
        return Output;
    }

    // Apply offset and limit (line-based)
    if (Offset > 0 || Limit > 0)
    {
        TArray<FString> Lines;
        FileContent.ParseIntoArrayLines(Lines);

        int32 StartLine = FMath::Clamp(Offset, 0, Lines.Num());
        int32 EndLine = (Limit > 0)
            ? FMath::Min(StartLine + Limit, Lines.Num())
            : Lines.Num();

        TArray<FString> SlicedLines;
        for (int32 i = StartLine; i < EndLine; ++i)
        {
            SlicedLines.Add(Lines[i]);
        }

        FileContent = FString::Join(SlicedLines, TEXT("\n"));
        ResultObj->SetNumberField(TEXT("totalLines"), Lines.Num());
        ResultObj->SetNumberField(TEXT("startLine"), StartLine);
        ResultObj->SetNumberField(TEXT("endLine"), EndLine);
    }

    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("content"), FileContent);
    ResultObj->SetStringField(TEXT("filePath"), FilePath);

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
    return Output;
}

FString FUMAFileOperations::WriteFile(const FString& FilePath, const FString& Content)
{
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();

    if (!IsPathWithinProject(FilePath))
    {
        ResultObj->SetBoolField(TEXT("success"), false);
        ResultObj->SetStringField(TEXT("error"), TEXT("Path traversal blocked: file is outside project directory"));
        FString Output;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
        FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
        return Output;
    }

    FString FullPath = ResolvePath(FilePath);

    // Ensure directory exists
    FString Directory = FPaths::GetPath(FullPath);
    if (!IFileManager::Get().DirectoryExists(*Directory))
    {
        IFileManager::Get().MakeDirectory(*Directory, true);
    }

    bool bExisted = FPaths::FileExists(FullPath);

    if (!FFileHelper::SaveStringToFile(Content, *FullPath, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM))
    {
        ResultObj->SetBoolField(TEXT("success"), false);
        ResultObj->SetStringField(TEXT("error"), FString::Printf(TEXT("Failed to write file: %s"), *FilePath));
        FString Output;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
        FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
        return Output;
    }

    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetStringField(TEXT("filePath"), FilePath);
    ResultObj->SetBoolField(TEXT("created"), !bExisted);
    ResultObj->SetNumberField(TEXT("bytesWritten"), Content.Len());

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
    return Output;
}

FString FUMAFileOperations::SearchFiles(const FString& Pattern, const FString& Directory, const FString& Glob)
{
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();

    FString SearchRoot = Directory.IsEmpty() ? GetProjectRoot() : ResolvePath(Directory);

    if (!Directory.IsEmpty() && !IsPathWithinProject(Directory))
    {
        ResultObj->SetBoolField(TEXT("success"), false);
        ResultObj->SetStringField(TEXT("error"), TEXT("Path traversal blocked: directory is outside project"));
        FString Output;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
        FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
        return Output;
    }

    // Build file glob pattern
    FString FileGlob = Glob.IsEmpty() ? TEXT("*") : Glob;

    TArray<FString> FoundFiles;
    IFileManager::Get().FindFilesRecursive(FoundFiles, *SearchRoot, *FileGlob, true, false);

    // Filter by content pattern if provided
    TArray<TSharedPtr<FJsonValue>> MatchArray;
    for (const FString& FoundFile : FoundFiles)
    {
        if (!Pattern.IsEmpty())
        {
            // Check filename match
            FString FileName = FPaths::GetCleanFilename(FoundFile);
            if (FileName.Contains(Pattern))
            {
                // Make path relative to project
                FString RelativePath = FoundFile;
                FPaths::MakePathRelativeTo(RelativePath, *GetProjectRoot());
                MatchArray.Add(MakeShared<FJsonValueString>(RelativePath));
            }
        }
        else
        {
            FString RelativePath = FoundFile;
            FPaths::MakePathRelativeTo(RelativePath, *GetProjectRoot());
            MatchArray.Add(MakeShared<FJsonValueString>(RelativePath));
        }
    }

    ResultObj->SetBoolField(TEXT("success"), true);
    ResultObj->SetNumberField(TEXT("matchCount"), MatchArray.Num());
    ResultObj->SetArrayField(TEXT("matches"), MatchArray);

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(ResultObj.ToSharedRef(), Writer);
    return Output;
}
