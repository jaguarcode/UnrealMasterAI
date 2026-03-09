// Copyright Unreal Master Team. All Rights Reserved.
#include "Misc/AutomationTest.h"
#include "Editor/UMAEditorQueries.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAGetLevelInfoTest, "UnrealMasterAgent.Editor.GetLevelInfo", EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAGetLevelInfoTest::RunTest(const FString& Parameters)
{
    FString Result = FUMAEditorQueries::GetLevelInfo();

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Result);
    TestTrue(TEXT("GetLevelInfo returns valid JSON"), FJsonSerializer::Deserialize(Reader, JsonObject));
    TestTrue(TEXT("Result has levelName"), JsonObject->HasField(TEXT("levelName")));

    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAListActorsTest, "UnrealMasterAgent.Editor.ListActors", EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAListActorsTest::RunTest(const FString& Parameters)
{
    FString Result = FUMAEditorQueries::ListActors();

    // Should return a JSON array (even if empty)
    TestTrue(TEXT("ListActors result starts with ["), Result.StartsWith(TEXT("[")));
    TestTrue(TEXT("ListActors result ends with ]"), Result.EndsWith(TEXT("]")));

    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMAGetAssetInfoNotFoundTest, "UnrealMasterAgent.Editor.GetAssetInfoNotFound", EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMAGetAssetInfoNotFoundTest::RunTest(const FString& Parameters)
{
    FString Result = FUMAEditorQueries::GetAssetInfo(TEXT("/Game/NonExistent/Asset"));

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Result);
    TestTrue(TEXT("GetAssetInfo returns valid JSON"), FJsonSerializer::Deserialize(Reader, JsonObject));
    TestTrue(TEXT("Result has error field for non-existent asset"), JsonObject->HasField(TEXT("error")));

    return true;
}
