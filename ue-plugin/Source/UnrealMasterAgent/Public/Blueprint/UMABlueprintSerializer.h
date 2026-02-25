// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"

class UBlueprint;
class UEdGraph;
class UEdGraphNode;
class UEdGraphPin;
struct FEdGraphPinType;

/**
 * Serializes UE Blueprint UEdGraph structures into JSON matching blueprint-ast.schema.json.
 * Currently handles EventGraph type only (AnimGraph, MacroGraph deferred).
 *
 * Output JSON structure:
 * {
 *   "blueprintPath": "/Game/...",
 *   "blueprintClass": "Blueprint",
 *   "parentClass": "Actor",
 *   "graphs": [
 *     {
 *       "graphName": "EventGraph",
 *       "graphType": "EventGraph",
 *       "nodes": [
 *         {
 *           "nodeId": "GUID",
 *           "nodeClass": "K2Node_CallFunction",
 *           "nodeTitle": "Print String",
 *           "posX": 0, "posY": 0,
 *           "comment": "",
 *           "pins": [...]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
class UNREALMASTERAGENT_API FUMABlueprintSerializer
{
public:
    /** Serialize entire Blueprint to JSON AST string */
    static FString SerializeBlueprint(const FString& AssetPath);

    /** Serialize a single graph by name within a Blueprint */
    static FString SerializeBlueprintGraph(const FString& AssetPath, const FString& GraphName);

private:
    /** Serialize a UEdGraph to a JSON object */
    static TSharedPtr<FJsonObject> SerializeGraph(const UEdGraph* Graph);

    /** Serialize a single UEdGraphNode to a JSON object */
    static TSharedPtr<FJsonObject> SerializeNode(const UEdGraphNode* Node);

    /** Serialize a single UEdGraphPin to a JSON object */
    static TSharedPtr<FJsonObject> SerializePin(const UEdGraphPin* Pin);

    /** Encode pin type to short string (exec, bool, int, float, string, object:ClassName) */
    static FString EncodePinType(const FEdGraphPinType& PinType);

    /** Serialize a JSON object to a compact string */
    static FString JsonObjectToString(const TSharedPtr<FJsonObject>& JsonObject);
};
