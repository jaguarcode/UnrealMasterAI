// Copyright Unreal Master Team. All Rights Reserved.

#include "Misc/AutomationTest.h"
#include "Blueprint/UMABlueprintSerializer.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMABPSerializerLoadAndSerialize, "UnrealMasterAgent.Blueprint.Serializer.LoadAndSerialize",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMABPSerializerLoadAndSerialize::RunTest(const FString& Parameters)
{
    // Load a test blueprint (use a default engine blueprint as test fixture)
    FString Result = FUMABlueprintSerializer::SerializeBlueprint(TEXT("/Engine/EngineSky/BP_Sky_Sphere"));

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Result);
    TestTrue(TEXT("Serializer returns valid JSON"), FJsonSerializer::Deserialize(Reader, JsonObject));
    TestTrue(TEXT("Has blueprintPath"), JsonObject->HasField(TEXT("blueprintPath")));
    TestTrue(TEXT("Has graphs array"), JsonObject->HasField(TEXT("graphs")));

    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMABPSerializerInvalidAsset, "UnrealMasterAgent.Blueprint.Serializer.InvalidAsset",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMABPSerializerInvalidAsset::RunTest(const FString& Parameters)
{
    FString Result = FUMABlueprintSerializer::SerializeBlueprint(TEXT("/Game/NonExistent/InvalidBP"));

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Result);
    TestTrue(TEXT("Returns valid JSON for invalid asset"), FJsonSerializer::Deserialize(Reader, JsonObject));
    TestTrue(TEXT("Has error field"), JsonObject->HasField(TEXT("error")));

    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FUMABPSerializerPartialGraph, "UnrealMasterAgent.Blueprint.Serializer.PartialGraph",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FUMABPSerializerPartialGraph::RunTest(const FString& Parameters)
{
    FString Result = FUMABlueprintSerializer::SerializeBlueprintGraph(
        TEXT("/Engine/EngineSky/BP_Sky_Sphere"), TEXT("EventGraph"));

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Result);
    bool bParsed = FJsonSerializer::Deserialize(Reader, JsonObject);
    // May be error if no EventGraph, but should still be valid JSON
    TestTrue(TEXT("Returns valid JSON for partial graph"), bParsed);

    return true;
}
