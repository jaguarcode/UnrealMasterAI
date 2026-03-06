// Copyright Unreal Master Team. All Rights Reserved.
#include "Editor/UMAEditorQueries.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "AssetRegistry/AssetRegistryModule.h"
#include "Editor.h"
#include "Serialization/JsonSerializer.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"

FString FUMAEditorQueries::GetLevelInfo()
{
    TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();

    UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
    if (!World)
    {
        Result->SetStringField(TEXT("error"), TEXT("No editor world available"));
        FString Output;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
        FJsonSerializer::Serialize(Result.ToSharedRef(), Writer);
        return Output;
    }

    Result->SetStringField(TEXT("levelName"), World->GetMapName());
    Result->SetNumberField(TEXT("actorCount"), World->GetActorCount());
    // Simplified world type string without StaticEnum dependency
    FString WorldTypeStr;
    switch (World->WorldType)
    {
        case EWorldType::Editor: WorldTypeStr = TEXT("Editor"); break;
        case EWorldType::Game: WorldTypeStr = TEXT("Game"); break;
        case EWorldType::PIE: WorldTypeStr = TEXT("PIE"); break;
        case EWorldType::EditorPreview: WorldTypeStr = TEXT("EditorPreview"); break;
        case EWorldType::GamePreview: WorldTypeStr = TEXT("GamePreview"); break;
        case EWorldType::GameRPC: WorldTypeStr = TEXT("GameRPC"); break;
        case EWorldType::Inactive: WorldTypeStr = TEXT("Inactive"); break;
        default: WorldTypeStr = TEXT("Unknown"); break;
    }
    Result->SetStringField(TEXT("worldType"), WorldTypeStr);

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(Result.ToSharedRef(), Writer);
    return Output;
}

FString FUMAEditorQueries::ListActors(const FString& ClassNameFilter, const FString& TagFilter)
{
    TArray<TSharedPtr<FJsonValue>> ActorsArray;

    UWorld* World = GEditor ? GEditor->GetEditorWorldContext().World() : nullptr;
    if (!World)
    {
        return TEXT("[]");
    }

    for (TActorIterator<AActor> It(World); It; ++It)
    {
        AActor* Actor = *It;
        if (!Actor) continue;

        // Apply class name filter
        if (!ClassNameFilter.IsEmpty() && Actor->GetClass()->GetName() != ClassNameFilter)
        {
            continue;
        }

        // Apply tag filter
        if (!TagFilter.IsEmpty() && !Actor->Tags.Contains(FName(*TagFilter)))
        {
            continue;
        }

        TSharedPtr<FJsonObject> ActorObj = MakeShared<FJsonObject>();
        ActorObj->SetStringField(TEXT("name"), Actor->GetName());
        ActorObj->SetStringField(TEXT("class"), Actor->GetClass()->GetName());

        FVector Location = Actor->GetActorLocation();
        TSharedPtr<FJsonObject> LocObj = MakeShared<FJsonObject>();
        LocObj->SetNumberField(TEXT("x"), Location.X);
        LocObj->SetNumberField(TEXT("y"), Location.Y);
        LocObj->SetNumberField(TEXT("z"), Location.Z);
        ActorObj->SetObjectField(TEXT("location"), LocObj);

        ActorsArray.Add(MakeShared<FJsonValueObject>(ActorObj));
    }

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(ActorsArray, Writer);
    return Output;
}

FString FUMAEditorQueries::GetAssetInfo(const FString& AssetPath)
{
    TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();

    FAssetRegistryModule& AssetRegistryModule = FModuleManager::LoadModuleChecked<FAssetRegistryModule>("AssetRegistry");
    IAssetRegistry& AssetRegistry = AssetRegistryModule.Get();

    FAssetData AssetData = AssetRegistry.GetAssetByObjectPath(FSoftObjectPath(AssetPath));

    if (!AssetData.IsValid())
    {
        Result->SetStringField(TEXT("error"), TEXT("Asset not found: ") + AssetPath);
        FString Output;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
        FJsonSerializer::Serialize(Result.ToSharedRef(), Writer);
        return Output;
    }

    Result->SetStringField(TEXT("assetPath"), AssetData.GetObjectPathString());
    Result->SetStringField(TEXT("assetClass"), AssetData.AssetClassPath.GetAssetName().ToString());
    // Note: GetDiskSize removed in UE 5.7, use -1 to indicate unavailable
    Result->SetNumberField(TEXT("diskSize"), -1.0);
    Result->SetStringField(TEXT("packageName"), AssetData.PackageName.ToString());

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(Result.ToSharedRef(), Writer);
    return Output;
}
