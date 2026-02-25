// Copyright Unreal Master Team. All Rights Reserved.

#include "Editor/SUMAChatPanel.h"
#include "WebSocket/UMAWebSocketClient.h"
#include "WebSocket/UMAMessageTypes.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Views/SListView.h"
#include "Styling/AppStyle.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"

// Forward declare global WebSocket client (defined in UnrealMasterAgent.cpp)
extern TUniquePtr<FUMAWebSocketClient> GWebSocketClient;

void SUMAChatPanel::Construct(const FArguments& InArgs)
{
    Subsystem = InArgs._Subsystem;

    // Populate from existing history
    if (Subsystem)
    {
        for (const FUMAChatEntry& Entry : Subsystem->GetChatMessages())
        {
            DisplayedMessages.Add(MakeShared<FUMAChatEntry>(Entry));
        }

        // Subscribe to new messages
        MessageAddedHandle = Subsystem->OnChatMessageAdded.AddSP(
            this, &SUMAChatPanel::OnMessageAdded);
    }

    ChildSlot
    [
        SNew(SVerticalBox)

        // Message list (fills available height)
        + SVerticalBox::Slot()
        .FillHeight(1.0f)
        .Padding(4.0f)
        [
            SNew(SBorder)
            .BorderImage(FAppStyle::GetBrush("ToolPanel.GroupBorder"))
            [
                SAssignNew(MessageListView, SListView<TSharedPtr<FUMAChatEntry>>)
                .ListItemsSource(&DisplayedMessages)
                .OnGenerateRow(this, &SUMAChatPanel::GenerateMessageRow)
                .SelectionMode(ESelectionMode::None)
            ]
        ]

        // Input row
        + SVerticalBox::Slot()
        .AutoHeight()
        .Padding(4.0f)
        [
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot()
            .FillWidth(1.0f)
            .Padding(0.0f, 0.0f, 4.0f, 0.0f)
            [
                SAssignNew(InputBox, SEditableTextBox)
                .HintText(FText::FromString(TEXT("Ask Unreal Master...")))
                .OnTextCommitted_Lambda([this](const FText&, ETextCommit::Type CommitType)
                {
                    if (CommitType == ETextCommit::OnEnter)
                    {
                        SendCurrentInput();
                    }
                })
            ]
            + SHorizontalBox::Slot()
            .AutoWidth()
            [
                SNew(SButton)
                .Text(FText::FromString(TEXT("Send")))
                .OnClicked(this, &SUMAChatPanel::OnSendClicked)
            ]
        ]
    ];
}

SUMAChatPanel::~SUMAChatPanel()
{
    if (Subsystem && MessageAddedHandle.IsValid())
    {
        Subsystem->OnChatMessageAdded.Remove(MessageAddedHandle);
    }
}

void SUMAChatPanel::OnMessageAdded(const FUMAChatEntry& Entry)
{
    check(IsInGameThread());

    DisplayedMessages.Add(MakeShared<FUMAChatEntry>(Entry));

    if (MessageListView.IsValid())
    {
        MessageListView->RequestListRefresh();
        if (DisplayedMessages.Num() > 0)
        {
            MessageListView->RequestScrollIntoView(DisplayedMessages.Last());
        }
    }
}

TSharedRef<ITableRow> SUMAChatPanel::GenerateMessageRow(
    TSharedPtr<FUMAChatEntry> Entry,
    const TSharedRef<STableViewBase>& OwnerTable)
{
    const FLinearColor UserColor  = FLinearColor(0.7f, 0.9f, 1.0f);
    const FLinearColor AgentColor = FLinearColor(0.9f, 0.9f, 0.9f);
    const FLinearColor Color      = Entry->bIsFromUser ? UserColor : AgentColor;
    const FString Prefix          = Entry->bIsFromUser ? TEXT("You: ") : TEXT("Agent: ");

    return SNew(STableRow<TSharedPtr<FUMAChatEntry>>, OwnerTable)
        [
            SNew(SBorder)
            .Padding(FMargin(8.0f, 4.0f))
            .BorderImage(FAppStyle::GetBrush("NoBorder"))
            [
                SNew(STextBlock)
                .Text(FText::FromString(Prefix + Entry->Text))
                .ColorAndOpacity(Color)
                .AutoWrapText(true)
            ]
        ];
}

FReply SUMAChatPanel::OnSendClicked()
{
    SendCurrentInput();
    return FReply::Handled();
}

void SUMAChatPanel::SendCurrentInput()
{
    if (!InputBox.IsValid()) return;

    FString Text = InputBox->GetText().ToString().TrimStartAndEnd();
    if (Text.IsEmpty()) return;

    InputBox->SetText(FText::GetEmpty());

    // Add the user's message to history immediately
    if (Subsystem)
    {
        Subsystem->AddChatMessage(Text, true /* bIsFromUser */);
    }

    // Send via WebSocket
    if (GWebSocketClient.IsValid() && GWebSocketClient->IsConnected())
    {
        FUMAWSMessage Message;
        Message.Id        = FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphens);
        Message.Method    = TEXT("chat.sendMessage");
        Message.Timestamp = FDateTime::UtcNow().ToUnixTimestamp() * 1000;
        Message.Params    = MakeShared<FJsonObject>();
        Message.Params->SetStringField(TEXT("text"), Text);

        GWebSocketClient->SendRawMessage(Message);
    }
    else
    {
        if (Subsystem)
        {
            Subsystem->AddChatMessage(
                TEXT("[Error] Not connected to MCP server"), false);
        }
    }
}
