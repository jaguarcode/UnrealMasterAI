// Copyright Unreal Master Team. All Rights Reserved.

#include "Blueprint/UMABlueprintSerializer.h"
#include "Engine/Blueprint.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "EdGraph/EdGraphPin.h"
#include "EdGraphSchema_K2.h"
#include "Serialization/JsonSerializer.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"

FString FUMABlueprintSerializer::SerializeBlueprint(const FString& AssetPath)
{
    TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();

    UBlueprint* BP = LoadObject<UBlueprint>(nullptr, *AssetPath);
    if (!BP)
    {
        Result->SetStringField(TEXT("error"), FString::Printf(TEXT("Blueprint not found: %s"), *AssetPath));
        return JsonObjectToString(Result);
    }

    Result->SetStringField(TEXT("blueprintPath"), AssetPath);
    Result->SetStringField(TEXT("blueprintClass"), BP->GetClass()->GetName());
    Result->SetStringField(TEXT("parentClass"), BP->ParentClass ? BP->ParentClass->GetName() : TEXT("None"));

    // Serialize all uber-graph pages (EventGraphs)
    TArray<TSharedPtr<FJsonValue>> GraphsArray;
    for (const UEdGraph* Graph : BP->UbergraphPages)
    {
        TSharedPtr<FJsonObject> GraphObj = SerializeGraph(Graph);
        if (GraphObj.IsValid())
        {
            GraphsArray.Add(MakeShared<FJsonValueObject>(GraphObj));
        }
    }

    // Also serialize function graphs
    for (const UEdGraph* Graph : BP->FunctionGraphs)
    {
        TSharedPtr<FJsonObject> GraphObj = SerializeGraph(Graph);
        if (GraphObj.IsValid())
        {
            // Override graph type for function graphs
            GraphObj->SetStringField(TEXT("graphType"), TEXT("FunctionGraph"));
            GraphsArray.Add(MakeShared<FJsonValueObject>(GraphObj));
        }
    }

    Result->SetArrayField(TEXT("graphs"), GraphsArray);

    return JsonObjectToString(Result);
}

FString FUMABlueprintSerializer::SerializeBlueprintGraph(const FString& AssetPath, const FString& GraphName)
{
    TSharedPtr<FJsonObject> Result = MakeShared<FJsonObject>();

    UBlueprint* BP = LoadObject<UBlueprint>(nullptr, *AssetPath);
    if (!BP)
    {
        Result->SetStringField(TEXT("error"), FString::Printf(TEXT("Blueprint not found: %s"), *AssetPath));
        return JsonObjectToString(Result);
    }

    // Search all graph collections for the named graph
    const UEdGraph* FoundGraph = nullptr;

    for (const UEdGraph* Graph : BP->UbergraphPages)
    {
        if (Graph && Graph->GetName() == GraphName)
        {
            FoundGraph = Graph;
            break;
        }
    }

    if (!FoundGraph)
    {
        for (const UEdGraph* Graph : BP->FunctionGraphs)
        {
            if (Graph && Graph->GetName() == GraphName)
            {
                FoundGraph = Graph;
                break;
            }
        }
    }

    if (!FoundGraph)
    {
        Result->SetStringField(TEXT("error"),
            FString::Printf(TEXT("Graph '%s' not found in Blueprint: %s"), *GraphName, *AssetPath));
        return JsonObjectToString(Result);
    }

    Result->SetStringField(TEXT("blueprintPath"), AssetPath);

    TSharedPtr<FJsonObject> GraphObj = SerializeGraph(FoundGraph);
    if (GraphObj.IsValid())
    {
        Result->SetObjectField(TEXT("graph"), GraphObj);
    }

    return JsonObjectToString(Result);
}

TSharedPtr<FJsonObject> FUMABlueprintSerializer::SerializeGraph(const UEdGraph* Graph)
{
    if (!Graph)
    {
        return nullptr;
    }

    TSharedPtr<FJsonObject> GraphObj = MakeShared<FJsonObject>();
    GraphObj->SetStringField(TEXT("graphName"), Graph->GetName());
    GraphObj->SetStringField(TEXT("graphType"), TEXT("EventGraph"));

    TArray<TSharedPtr<FJsonValue>> NodesArray;
    for (const UEdGraphNode* Node : Graph->Nodes)
    {
        TSharedPtr<FJsonObject> NodeObj = SerializeNode(Node);
        if (NodeObj.IsValid())
        {
            NodesArray.Add(MakeShared<FJsonValueObject>(NodeObj));
        }
    }
    GraphObj->SetArrayField(TEXT("nodes"), NodesArray);

    return GraphObj;
}

TSharedPtr<FJsonObject> FUMABlueprintSerializer::SerializeNode(const UEdGraphNode* Node)
{
    if (!Node)
    {
        return nullptr;
    }

    TSharedPtr<FJsonObject> NodeObj = MakeShared<FJsonObject>();
    NodeObj->SetStringField(TEXT("nodeId"), Node->NodeGuid.ToString());
    NodeObj->SetStringField(TEXT("nodeClass"), Node->GetClass()->GetName());
    NodeObj->SetStringField(TEXT("nodeTitle"), Node->GetNodeTitle(ENodeTitleType::FullTitle).ToString());
    NodeObj->SetNumberField(TEXT("posX"), Node->NodePosX);
    NodeObj->SetNumberField(TEXT("posY"), Node->NodePosY);
    NodeObj->SetStringField(TEXT("comment"), Node->NodeComment);

    // Serialize all pins
    TArray<TSharedPtr<FJsonValue>> PinsArray;
    for (const UEdGraphPin* Pin : Node->Pins)
    {
        TSharedPtr<FJsonObject> PinObj = SerializePin(Pin);
        if (PinObj.IsValid())
        {
            PinsArray.Add(MakeShared<FJsonValueObject>(PinObj));
        }
    }
    NodeObj->SetArrayField(TEXT("pins"), PinsArray);

    return NodeObj;
}

TSharedPtr<FJsonObject> FUMABlueprintSerializer::SerializePin(const UEdGraphPin* Pin)
{
    if (!Pin)
    {
        return nullptr;
    }

    TSharedPtr<FJsonObject> PinObj = MakeShared<FJsonObject>();
    PinObj->SetStringField(TEXT("pinId"), Pin->PinId.ToString());
    PinObj->SetStringField(TEXT("pinName"), Pin->PinName.ToString());

    // Direction
    const FString DirectionStr = (Pin->Direction == EGPD_Input) ? TEXT("Input") : TEXT("Output");
    PinObj->SetStringField(TEXT("direction"), DirectionStr);

    // Type
    const FString TypeStr = EncodePinType(Pin->PinType);
    PinObj->SetStringField(TEXT("pinType"), TypeStr);

    // Is this an execution pin?
    const bool bIsExec = (Pin->PinType.PinCategory == UEdGraphSchema_K2::PC_Exec);
    PinObj->SetBoolField(TEXT("isExec"), bIsExec);

    // Default value
    if (!Pin->DefaultValue.IsEmpty())
    {
        PinObj->SetStringField(TEXT("defaultValue"), Pin->DefaultValue);
    }

    // Default object (for object-typed pins)
    if (Pin->DefaultObject)
    {
        PinObj->SetStringField(TEXT("defaultObject"), Pin->DefaultObject->GetPathName());
    }

    // Default text value
    if (!Pin->DefaultTextValue.IsEmpty())
    {
        PinObj->SetStringField(TEXT("defaultTextValue"), Pin->DefaultTextValue.ToString());
    }

    // Linked-to connections
    TArray<TSharedPtr<FJsonValue>> LinkedToArray;
    for (const UEdGraphPin* LinkedPin : Pin->LinkedTo)
    {
        if (LinkedPin && LinkedPin->GetOwningNode())
        {
            TSharedPtr<FJsonObject> LinkObj = MakeShared<FJsonObject>();
            LinkObj->SetStringField(TEXT("nodeId"), LinkedPin->GetOwningNode()->NodeGuid.ToString());
            LinkObj->SetStringField(TEXT("pinId"), LinkedPin->PinId.ToString());
            LinkedToArray.Add(MakeShared<FJsonValueObject>(LinkObj));
        }
    }
    PinObj->SetArrayField(TEXT("linkedTo"), LinkedToArray);

    return PinObj;
}

FString FUMABlueprintSerializer::EncodePinType(const FEdGraphPinType& PinType)
{
    const FName& Category = PinType.PinCategory;

    if (Category == UEdGraphSchema_K2::PC_Exec)
    {
        return TEXT("exec");
    }
    if (Category == UEdGraphSchema_K2::PC_Boolean)
    {
        return TEXT("bool");
    }
    if (Category == UEdGraphSchema_K2::PC_Int)
    {
        return TEXT("int");
    }
    if (Category == UEdGraphSchema_K2::PC_Int64)
    {
        return TEXT("int64");
    }
    if (Category == UEdGraphSchema_K2::PC_Float)
    {
        return TEXT("float");
    }
    if (Category == UEdGraphSchema_K2::PC_Real)
    {
        return TEXT("double");
    }
    if (Category == UEdGraphSchema_K2::PC_String)
    {
        return TEXT("string");
    }
    if (Category == UEdGraphSchema_K2::PC_Name)
    {
        return TEXT("name");
    }
    if (Category == UEdGraphSchema_K2::PC_Text)
    {
        return TEXT("text");
    }
    if (Category == UEdGraphSchema_K2::PC_Byte)
    {
        // Could be an enum byte
        if (PinType.PinSubCategoryObject.IsValid())
        {
            return FString::Printf(TEXT("enum:%s"), *PinType.PinSubCategoryObject->GetName());
        }
        return TEXT("byte");
    }
    if (Category == UEdGraphSchema_K2::PC_Enum)
    {
        if (PinType.PinSubCategoryObject.IsValid())
        {
            return FString::Printf(TEXT("enum:%s"), *PinType.PinSubCategoryObject->GetName());
        }
        return TEXT("enum");
    }
    if (Category == UEdGraphSchema_K2::PC_Object || Category == UEdGraphSchema_K2::PC_Interface)
    {
        if (PinType.PinSubCategoryObject.IsValid())
        {
            return FString::Printf(TEXT("object:%s"), *PinType.PinSubCategoryObject->GetName());
        }
        return TEXT("object");
    }
    if (Category == UEdGraphSchema_K2::PC_SoftObject)
    {
        if (PinType.PinSubCategoryObject.IsValid())
        {
            return FString::Printf(TEXT("softobject:%s"), *PinType.PinSubCategoryObject->GetName());
        }
        return TEXT("softobject");
    }
    if (Category == UEdGraphSchema_K2::PC_Class || Category == UEdGraphSchema_K2::PC_SoftClass)
    {
        if (PinType.PinSubCategoryObject.IsValid())
        {
            return FString::Printf(TEXT("class:%s"), *PinType.PinSubCategoryObject->GetName());
        }
        return TEXT("class");
    }
    if (Category == UEdGraphSchema_K2::PC_Struct)
    {
        if (PinType.PinSubCategoryObject.IsValid())
        {
            return FString::Printf(TEXT("struct:%s"), *PinType.PinSubCategoryObject->GetName());
        }
        return TEXT("struct");
    }
    if (Category == UEdGraphSchema_K2::PC_Wildcard)
    {
        return TEXT("wildcard");
    }
    if (Category == UEdGraphSchema_K2::PC_Delegate)
    {
        return TEXT("delegate");
    }
    if (Category == UEdGraphSchema_K2::PC_MCDelegate)
    {
        return TEXT("multicast_delegate");
    }

    // Fallback: return category as-is
    return Category.ToString();
}

FString FUMABlueprintSerializer::JsonObjectToString(const TSharedPtr<FJsonObject>& JsonObject)
{
    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(JsonObject.ToSharedRef(), Writer);
    return Output;
}
