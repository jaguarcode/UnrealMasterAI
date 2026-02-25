// Copyright Unreal Master Team. All Rights Reserved.

#include "Blueprint/UMABlueprintManipulator.h"
#include "Engine/Blueprint.h"
#include "EdGraph/EdGraph.h"
#include "EdGraph/EdGraphNode.h"
#include "EdGraph/EdGraphPin.h"
#include "EdGraph/EdGraphSchema.h"
#include "EdGraphSchema_K2.h"
#include "K2Node_CallFunction.h"
#include "K2Node_Event.h"
#include "K2Node_IfThenElse.h"
#include "K2Node_VariableGet.h"
#include "K2Node_VariableSet.h"
#include "K2Node_CustomEvent.h"
#include "Kismet2/BlueprintEditorUtils.h"
#include "Kismet2/KismetEditorUtilities.h"
#include "UObject/UObjectGlobals.h"

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

UBlueprint* FUMABlueprintManipulator::LoadBlueprintFromPath(const FString& BlueprintPath, FString& OutError)
{
    UBlueprint* BP = LoadObject<UBlueprint>(nullptr, *BlueprintPath);
    if (!BP)
    {
        OutError = FString::Printf(TEXT("Blueprint not found: %s"), *BlueprintPath);
    }
    return BP;
}

UEdGraph* FUMABlueprintManipulator::FindGraphByName(UBlueprint* BP, const FString& GraphName)
{
    if (!BP)
    {
        return nullptr;
    }

    // Search UbergraphPages (EventGraphs)
    for (UEdGraph* Graph : BP->UbergraphPages)
    {
        if (Graph && Graph->GetName() == GraphName)
        {
            return Graph;
        }
    }

    // Search FunctionGraphs
    for (UEdGraph* Graph : BP->FunctionGraphs)
    {
        if (Graph && Graph->GetName() == GraphName)
        {
            return Graph;
        }
    }

    return nullptr;
}

UEdGraphPin* FUMABlueprintManipulator::FindPinByGuid(UBlueprint* BP, const FString& PinGuidStr)
{
    if (!BP)
    {
        return nullptr;
    }

    FGuid TargetGuid;
    if (!FGuid::Parse(PinGuidStr, TargetGuid))
    {
        return nullptr;
    }

    // Helper lambda to search a graph collection
    auto SearchGraphs = [&TargetGuid](const TArray<UEdGraph*>& Graphs) -> UEdGraphPin*
    {
        for (const UEdGraph* Graph : Graphs)
        {
            if (!Graph) continue;
            for (const UEdGraphNode* Node : Graph->Nodes)
            {
                if (!Node) continue;
                for (UEdGraphPin* Pin : Node->Pins)
                {
                    if (Pin && Pin->PinId == TargetGuid)
                    {
                        return Pin;
                    }
                }
            }
        }
        return nullptr;
    };

    // Search all graph collections
    if (UEdGraphPin* Found = SearchGraphs(BP->UbergraphPages))
    {
        return Found;
    }
    if (UEdGraphPin* Found = SearchGraphs(BP->FunctionGraphs))
    {
        return Found;
    }

    return nullptr;
}

UEdGraphNode* FUMABlueprintManipulator::FindNodeByGuid(UBlueprint* BP, const FString& NodeGuidStr)
{
    if (!BP)
    {
        return nullptr;
    }

    FGuid TargetGuid;
    if (!FGuid::Parse(NodeGuidStr, TargetGuid))
    {
        return nullptr;
    }

    auto SearchGraphs = [&TargetGuid](const TArray<UEdGraph*>& Graphs) -> UEdGraphNode*
    {
        for (UEdGraph* Graph : Graphs)
        {
            if (!Graph) continue;
            for (UEdGraphNode* Node : Graph->Nodes)
            {
                if (Node && Node->NodeGuid == TargetGuid)
                {
                    return Node;
                }
            }
        }
        return nullptr;
    };

    if (UEdGraphNode* Found = SearchGraphs(BP->UbergraphPages))
    {
        return Found;
    }
    if (UEdGraphNode* Found = SearchGraphs(BP->FunctionGraphs))
    {
        return Found;
    }

    return nullptr;
}

// ---------------------------------------------------------------------------
// SpawnNode
// ---------------------------------------------------------------------------

FUMANodeSpawnResult FUMABlueprintManipulator::SpawnNode(
    const FString& BlueprintPath,
    const FString& GraphName,
    const FString& NodeClass,
    const FString& FunctionOwnerClass,
    const FString& FunctionName,
    int32 PosX,
    int32 PosY)
{
    FUMANodeSpawnResult Result;

    // Load Blueprint
    FString LoadError;
    UBlueprint* BP = LoadBlueprintFromPath(BlueprintPath, LoadError);
    if (!BP)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = LoadError;
        return Result;
    }

    // Find target graph
    UEdGraph* TargetGraph = FindGraphByName(BP, GraphName);
    if (!TargetGraph)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = FString::Printf(TEXT("Graph '%s' not found in Blueprint: %s"), *GraphName, *BlueprintPath);
        return Result;
    }

    // Spawn node based on class
    if (NodeClass == TEXT("K2Node_CallFunction"))
    {
        // Resolve the function owner class
        UClass* OwnerClass = FindObject<UClass>(nullptr, *FString::Printf(TEXT("/Script/Engine.%s"), *FunctionOwnerClass));
        if (!OwnerClass)
        {
            // Try CoreUObject
            OwnerClass = FindObject<UClass>(nullptr, *FString::Printf(TEXT("/Script/CoreUObject.%s"), *FunctionOwnerClass));
        }
        if (!OwnerClass)
        {
            // Broader search across all packages
            OwnerClass = FindFirstObject<UClass>(*FunctionOwnerClass, EFindFirstObjectOptions::NativeFirst);
        }

        if (!OwnerClass)
        {
            Result.bSuccess = false;
            Result.ErrorMessage = FString::Printf(TEXT("Function owner class not found: %s"), *FunctionOwnerClass);
            return Result;
        }

        UFunction* Func = OwnerClass->FindFunctionByName(*FunctionName);
        if (!Func)
        {
            Result.bSuccess = false;
            Result.ErrorMessage = FString::Printf(TEXT("Function '%s' not found on class '%s'"), *FunctionName, *FunctionOwnerClass);
            return Result;
        }

        UK2Node_CallFunction* NewNode = NewObject<UK2Node_CallFunction>(TargetGraph);
        NewNode->SetFromFunction(Func);
        NewNode->NodePosX = PosX;
        NewNode->NodePosY = PosY;
        NewNode->AllocateDefaultPins();
        TargetGraph->AddNode(NewNode, /*bFromUI=*/false, /*bSelectNewNode=*/false);

        FBlueprintEditorUtils::MarkBlueprintAsModified(BP);

        Result.bSuccess = true;
        Result.NodeId = NewNode->NodeGuid.ToString();
    }
    else if (NodeClass == TEXT("K2Node_CustomEvent"))
    {
        UK2Node_CustomEvent* NewNode = NewObject<UK2Node_CustomEvent>(TargetGraph);
        NewNode->CustomFunctionName = *FunctionName;
        NewNode->NodePosX = PosX;
        NewNode->NodePosY = PosY;
        NewNode->AllocateDefaultPins();
        TargetGraph->AddNode(NewNode, /*bFromUI=*/false, /*bSelectNewNode=*/false);

        FBlueprintEditorUtils::MarkBlueprintAsModified(BP);

        Result.bSuccess = true;
        Result.NodeId = NewNode->NodeGuid.ToString();
    }
    else if (NodeClass == TEXT("K2Node_IfThenElse"))
    {
        UK2Node_IfThenElse* NewNode = NewObject<UK2Node_IfThenElse>(TargetGraph);
        NewNode->NodePosX = PosX;
        NewNode->NodePosY = PosY;
        NewNode->AllocateDefaultPins();
        TargetGraph->AddNode(NewNode, /*bFromUI=*/false, /*bSelectNewNode=*/false);

        FBlueprintEditorUtils::MarkBlueprintAsModified(BP);

        Result.bSuccess = true;
        Result.NodeId = NewNode->NodeGuid.ToString();
    }
    else if (NodeClass == TEXT("K2Node_VariableGet"))
    {
        UK2Node_VariableGet* NewNode = NewObject<UK2Node_VariableGet>(TargetGraph);
        NewNode->VariableReference.SetSelfMember(*FunctionName);
        NewNode->NodePosX = PosX;
        NewNode->NodePosY = PosY;
        NewNode->AllocateDefaultPins();
        TargetGraph->AddNode(NewNode, /*bFromUI=*/false, /*bSelectNewNode=*/false);

        FBlueprintEditorUtils::MarkBlueprintAsModified(BP);

        Result.bSuccess = true;
        Result.NodeId = NewNode->NodeGuid.ToString();
    }
    else if (NodeClass == TEXT("K2Node_VariableSet"))
    {
        UK2Node_VariableSet* NewNode = NewObject<UK2Node_VariableSet>(TargetGraph);
        NewNode->VariableReference.SetSelfMember(*FunctionName);
        NewNode->NodePosX = PosX;
        NewNode->NodePosY = PosY;
        NewNode->AllocateDefaultPins();
        TargetGraph->AddNode(NewNode, /*bFromUI=*/false, /*bSelectNewNode=*/false);

        FBlueprintEditorUtils::MarkBlueprintAsModified(BP);

        Result.bSuccess = true;
        Result.NodeId = NewNode->NodeGuid.ToString();
    }
    else
    {
        Result.bSuccess = false;
        Result.ErrorMessage = FString::Printf(
            TEXT("Unsupported node class: %s. Supported: K2Node_CallFunction, K2Node_CustomEvent, K2Node_IfThenElse, K2Node_VariableGet, K2Node_VariableSet"),
            *NodeClass);
    }

    return Result;
}

// ---------------------------------------------------------------------------
// ConnectPins
// ---------------------------------------------------------------------------

FUMAPinConnectResult FUMABlueprintManipulator::ConnectPins(
    const FString& BlueprintPath,
    const FString& SourcePinId,
    const FString& TargetPinId)
{
    FUMAPinConnectResult Result;

    // Load Blueprint
    FString LoadError;
    UBlueprint* BP = LoadBlueprintFromPath(BlueprintPath, LoadError);
    if (!BP)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = LoadError;
        return Result;
    }

    // Find source pin
    UEdGraphPin* SourcePin = FindPinByGuid(BP, SourcePinId);
    if (!SourcePin)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = FString::Printf(TEXT("Source pin not found: %s"), *SourcePinId);
        return Result;
    }

    // Find target pin
    UEdGraphPin* TargetPin = FindPinByGuid(BP, TargetPinId);
    if (!TargetPin)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = FString::Printf(TEXT("Target pin not found: %s"), *TargetPinId);
        return Result;
    }

    // Validate direction: source must be output, target must be input
    if (SourcePin->Direction == TargetPin->Direction)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = TEXT("Cannot connect pins with the same direction. Source must be Output, target must be Input.");
        return Result;
    }

    // Ensure source is output, swap if needed
    UEdGraphPin* OutputPin = SourcePin;
    UEdGraphPin* InputPin = TargetPin;
    if (OutputPin->Direction == EGPD_Input)
    {
        Swap(OutputPin, InputPin);
    }

    // Use the schema's TryCreateConnection (NEVER raw MakeLinkTo)
    // GetSchema() returns const UEdGraphSchema*, and TryCreateConnection is a const method
    const UEdGraphSchema* Schema = OutputPin->GetOwningNode()->GetGraph()->GetSchema();
    if (!Schema)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = TEXT("Failed to get graph schema");
        return Result;
    }

    const bool bConnected = Schema->TryCreateConnection(OutputPin, InputPin);
    if (!bConnected)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = FString::Printf(
            TEXT("TryCreateConnection failed: source pin '%s' (%s) -> target pin '%s' (%s)"),
            *SourcePin->PinName.ToString(), *SourcePinId,
            *TargetPin->PinName.ToString(), *TargetPinId);
        return Result;
    }

    FBlueprintEditorUtils::MarkBlueprintAsModified(BP);

    Result.bSuccess = true;
    Result.DiagnosticInfo = FString::Printf(TEXT("Connected '%s' -> '%s'"),
        *OutputPin->PinName.ToString(), *InputPin->PinName.ToString());

    return Result;
}

// ---------------------------------------------------------------------------
// DeleteNode
// ---------------------------------------------------------------------------

FUMAOperationResult FUMABlueprintManipulator::DeleteNode(
    const FString& BlueprintPath,
    const FString& NodeId)
{
    FUMAOperationResult Result;

    // Load Blueprint
    FString LoadError;
    UBlueprint* BP = LoadBlueprintFromPath(BlueprintPath, LoadError);
    if (!BP)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = LoadError;
        return Result;
    }

    // Find node
    UEdGraphNode* Node = FindNodeByGuid(BP, NodeId);
    if (!Node)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = FString::Printf(TEXT("Node not found: %s"), *NodeId);
        return Result;
    }

    // Get owning graph
    UEdGraph* OwningGraph = Node->GetGraph();
    if (!OwningGraph)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = TEXT("Node has no owning graph");
        return Result;
    }

    // Break all pin links first
    Node->BreakAllNodeLinks();

    // Remove node from graph
    OwningGraph->RemoveNode(Node);

    FBlueprintEditorUtils::MarkBlueprintAsModified(BP);

    Result.bSuccess = true;
    return Result;
}

// ---------------------------------------------------------------------------
// ModifyNodeProperty
// ---------------------------------------------------------------------------

FUMAOperationResult FUMABlueprintManipulator::ModifyNodeProperty(
    const FString& BlueprintPath,
    const FString& NodeId,
    const FString& PropertyName,
    const FString& PropertyValue)
{
    FUMAOperationResult Result;

    // Load Blueprint
    FString LoadError;
    UBlueprint* BP = LoadBlueprintFromPath(BlueprintPath, LoadError);
    if (!BP)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = LoadError;
        return Result;
    }

    // Find node
    UEdGraphNode* Node = FindNodeByGuid(BP, NodeId);
    if (!Node)
    {
        Result.bSuccess = false;
        Result.ErrorMessage = FString::Printf(TEXT("Node not found: %s"), *NodeId);
        return Result;
    }

    // Try to find a pin with the given property name and set its default value
    UEdGraphPin* TargetPin = nullptr;
    for (UEdGraphPin* Pin : Node->Pins)
    {
        if (Pin && Pin->PinName.ToString() == PropertyName)
        {
            TargetPin = Pin;
            break;
        }
    }

    if (TargetPin)
    {
        // Use the schema to set the default value (validates types, etc.)
        const UEdGraphSchema_K2* Schema = GetDefault<UEdGraphSchema_K2>();
        if (Schema)
        {
            Schema->TrySetDefaultValue(*TargetPin, PropertyValue);
        }
        else
        {
            // Fallback: set directly
            TargetPin->DefaultValue = PropertyValue;
        }

        FBlueprintEditorUtils::MarkBlueprintAsModified(BP);

        Result.bSuccess = true;
        return Result;
    }

    // If not a pin, try to find a UProperty on the node class
    FProperty* Prop = Node->GetClass()->FindPropertyByName(*PropertyName);
    if (Prop)
    {
        void* ValuePtr = Prop->ContainerPtrToValuePtr<void>(Node);
        if (Prop->ImportText_Direct(*PropertyValue, ValuePtr, Node, PPF_None))
        {
            FBlueprintEditorUtils::MarkBlueprintAsModified(BP);
            Result.bSuccess = true;
        }
        else
        {
            Result.bSuccess = false;
            Result.ErrorMessage = FString::Printf(
                TEXT("Failed to set property '%s' to value '%s' on node %s"),
                *PropertyName, *PropertyValue, *NodeId);
        }
        return Result;
    }

    Result.bSuccess = false;
    Result.ErrorMessage = FString::Printf(
        TEXT("Property or pin '%s' not found on node %s"), *PropertyName, *NodeId);
    return Result;
}
