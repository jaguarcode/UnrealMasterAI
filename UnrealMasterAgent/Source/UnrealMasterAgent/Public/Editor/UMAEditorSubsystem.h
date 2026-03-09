// Copyright Unreal Master Team. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "EditorSubsystem.h"
#include "Framework/Docking/TabManager.h"
#include "UMAEditorSubsystem.generated.h"

/** A single chat message entry in the history. */
USTRUCT()
struct FUMAChatEntry
{
    GENERATED_BODY()

    /** Message text */
    FString Text;

    /** True if the message was sent by the developer; false if from the agent */
    bool bIsFromUser = false;

    /** Timestamp for display */
    FDateTime Timestamp;
};

/**
 * Editor subsystem that owns the In-Editor Chat Panel tab.
 *
 * Registered via UEditorSubsystem lifecycle — automatically instantiated by
 * the editor when the plugin is loaded.
 *
 * THREADING: All Slate/tab operations MUST be on the GameThread.
 */
UCLASS()
class UNREALMASTERAGENT_API UUMAEditorSubsystem : public UEditorSubsystem
{
    GENERATED_BODY()

public:
    // UEditorSubsystem overrides
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    /** Register the 'UMAChatPanel' nomad tab spawner with FGlobalTabmanager. */
    void RegisterChatTab();

    /** Unregister the tab spawner on shutdown. */
    void UnregisterChatTab();

    /**
     * Append a message to the chat history and notify the open panel (if any).
     * Safe to call from GameThread only.
     */
    void AddChatMessage(const FString& Text, bool bIsFromUser);

    /** Returns the current message count (for tests). */
    int32 GetMessageCount() const { return ChatMessages.Num(); }

    /**
     * Returns the WS method name used for outbound chat messages.
     * Used by tests to verify the correct method string.
     */
    FString GetChatSendMethod() const { return TEXT("chat.sendMessage"); }

    /** Invoke (focus or open) the chat tab. */
    void InvokeChatTab();

    /** Delegate broadcast when a new message is added (used by the Slate widget). */
    DECLARE_MULTICAST_DELEGATE_OneParam(FOnChatMessageAdded, const FUMAChatEntry&);
    FOnChatMessageAdded OnChatMessageAdded;

    /** Read-only access to the full history (for initial panel population). */
    const TArray<FUMAChatEntry>& GetChatMessages() const { return ChatMessages; }

private:
    static const FName ChatTabId;

    TArray<FUMAChatEntry> ChatMessages;

    TSharedRef<SDockTab> SpawnChatTabForSubsystem(const FSpawnTabArgs& Args);
    static TSharedRef<SDockTab> SpawnChatTab(const FSpawnTabArgs& Args);
};
