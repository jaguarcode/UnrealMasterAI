// Copyright Unreal Master Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UMABlueprintTypes.h"

class UBlueprint;
class UEdGraph;
class UEdGraphNode;
class UEdGraphPin;

/**
 * Programmatic Blueprint manipulation: spawn nodes, connect pins, delete nodes.
 *
 * INVARIANTS:
 * - ALWAYS uses UEdGraphSchema_K2::TryCreateConnection for pin connections (NEVER raw MakeLinkTo).
 * - ALWAYS calls FBlueprintEditorUtils::MarkBlueprintAsModified after changes.
 * - All public methods are safe to call with invalid arguments (return error results).
 */
class UNREALMASTERAGENT_API FUMABlueprintManipulator
{
public:
    /**
     * Spawn a new node in a Blueprint graph.
     * @param BlueprintPath  Asset path of the Blueprint (e.g., "/Game/BP/MyBP")
     * @param GraphName      Name of the target graph (e.g., "EventGraph")
     * @param NodeClass      Class of node to spawn (e.g., "K2Node_CallFunction", "K2Node_Event")
     * @param FunctionOwnerClass  For call-function nodes: class owning the function (e.g., "KismetSystemLibrary")
     * @param FunctionName   For call-function nodes: function name (e.g., "PrintString")
     * @param PosX, PosY     Position in the graph editor
     */
    static FUMANodeSpawnResult SpawnNode(
        const FString& BlueprintPath,
        const FString& GraphName,
        const FString& NodeClass,
        const FString& FunctionOwnerClass,
        const FString& FunctionName,
        int32 PosX = 0,
        int32 PosY = 0);

    /**
     * Connect two pins using UEdGraphSchema_K2::TryCreateConnection.
     * @param BlueprintPath  Asset path of the Blueprint
     * @param SourcePinId    GUID string of the source (output) pin
     * @param TargetPinId    GUID string of the target (input) pin
     */
    static FUMAPinConnectResult ConnectPins(
        const FString& BlueprintPath,
        const FString& SourcePinId,
        const FString& TargetPinId);

    /**
     * Delete a node by its GUID.
     * @param BlueprintPath  Asset path of the Blueprint
     * @param NodeId         GUID string of the node to remove
     */
    static FUMAOperationResult DeleteNode(
        const FString& BlueprintPath,
        const FString& NodeId);

    /**
     * Modify a property value on a node.
     * @param BlueprintPath  Asset path of the Blueprint
     * @param NodeId         GUID string of the target node
     * @param PropertyName   Name of the pin/property to set
     * @param PropertyValue  New value as a string
     */
    static FUMAOperationResult ModifyNodeProperty(
        const FString& BlueprintPath,
        const FString& NodeId,
        const FString& PropertyName,
        const FString& PropertyValue);

private:
    /** Load a Blueprint by path, returning nullptr with error if not found */
    static UBlueprint* LoadBlueprintFromPath(const FString& BlueprintPath, FString& OutError);

    /** Find a graph by name within a Blueprint */
    static UEdGraph* FindGraphByName(UBlueprint* BP, const FString& GraphName);

    /** Find a pin in a Blueprint by its GUID string (searches all graphs/nodes/pins) */
    static UEdGraphPin* FindPinByGuid(UBlueprint* BP, const FString& PinGuidStr);

    /** Find a node by its GUID string (searches all graphs/nodes) */
    static UEdGraphNode* FindNodeByGuid(UBlueprint* BP, const FString& NodeGuidStr);
};
