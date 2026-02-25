// Copyright Unreal Master Team. All Rights Reserved.

#include "WebSocket/UMAMessageTypes.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

bool FUMAWSMessage::FromJson(const FString& JsonString)
{
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);
    TSharedPtr<FJsonObject> JsonObject;

    if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
    {
        return false;
    }

    if (!JsonObject->TryGetStringField(TEXT("id"), Id))
    {
        return false;
    }

    if (!JsonObject->TryGetStringField(TEXT("method"), Method))
    {
        return false;
    }

    const TSharedPtr<FJsonObject>* ParamsObject;
    if (JsonObject->TryGetObjectField(TEXT("params"), ParamsObject))
    {
        Params = *ParamsObject;
    }
    else
    {
        Params = MakeShareable(new FJsonObject());
    }

    Timestamp = static_cast<int64>(JsonObject->GetNumberField(TEXT("timestamp")));

    return true;
}

FString FUMAWSMessage::ToJson() const
{
    TSharedRef<FJsonObject> JsonObject = MakeShareable(new FJsonObject());
    JsonObject->SetStringField(TEXT("id"), Id);
    JsonObject->SetStringField(TEXT("method"), Method);

    if (Params.IsValid())
    {
        JsonObject->SetObjectField(TEXT("params"), Params);
    }
    else
    {
        JsonObject->SetObjectField(TEXT("params"), MakeShareable(new FJsonObject()));
    }

    JsonObject->SetNumberField(TEXT("timestamp"), static_cast<double>(Timestamp));

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(JsonObject, Writer);
    return OutputString;
}

FString FUMAWSResponse::ToJson() const
{
    TSharedRef<FJsonObject> JsonObject = MakeShareable(new FJsonObject());
    JsonObject->SetStringField(TEXT("id"), Id);

    if (Result.IsValid())
    {
        JsonObject->SetObjectField(TEXT("result"), Result);
    }

    if (Error.IsSet())
    {
        TSharedRef<FJsonObject> ErrorObject = MakeShareable(new FJsonObject());
        ErrorObject->SetNumberField(TEXT("code"), Error.GetValue().Code);
        ErrorObject->SetStringField(TEXT("message"), Error.GetValue().Message);

        if (Error.GetValue().Data.IsValid())
        {
            ErrorObject->SetObjectField(TEXT("data"), Error.GetValue().Data);
        }

        JsonObject->SetObjectField(TEXT("error"), ErrorObject);
    }

    JsonObject->SetNumberField(TEXT("duration_ms"), Duration_ms);

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(JsonObject, Writer);
    return OutputString;
}
