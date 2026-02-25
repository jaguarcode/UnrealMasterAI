// Copyright Unreal Master Team. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Views/SListView.h"
#include "Editor/UMAEditorSubsystem.h"

/**
 * Dockable chat panel widget.
 * Displays chat history and provides a text input for sending messages.
 *
 * THREADING: Must only be constructed and operated on the GameThread.
 */
class SUMAChatPanel : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SUMAChatPanel)
        : _Subsystem(nullptr)
    {}
        SLATE_ARGUMENT(UUMAEditorSubsystem*, Subsystem)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);
    virtual ~SUMAChatPanel() override;

private:
    UUMAEditorSubsystem* Subsystem = nullptr;

    /** Mutable copy of messages for list view (list view needs TArray<TSharedPtr<...>>). */
    TArray<TSharedPtr<FUMAChatEntry>> DisplayedMessages;

    TSharedPtr<SListView<TSharedPtr<FUMAChatEntry>>> MessageListView;
    TSharedPtr<SEditableTextBox> InputBox;

    /** Delegate handle so we can unsubscribe on destruction. */
    FDelegateHandle MessageAddedHandle;

    /** Called when a new message is added to the subsystem. */
    void OnMessageAdded(const FUMAChatEntry& Entry);

    /** Row generator for the list view. */
    TSharedRef<ITableRow> GenerateMessageRow(
        TSharedPtr<FUMAChatEntry> Entry,
        const TSharedRef<STableViewBase>& OwnerTable);

    FReply OnSendClicked();
    void SendCurrentInput();
};
