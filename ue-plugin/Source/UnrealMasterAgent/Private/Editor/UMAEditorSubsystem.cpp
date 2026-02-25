// Copyright Unreal Master Team. All Rights Reserved.

#include "Editor/UMAEditorSubsystem.h"
#include "Editor/SUMAChatPanel.h"
#include "Framework/Docking/TabManager.h"
#include "Widgets/Docking/SDockTab.h"
#include "Widgets/Text/STextBlock.h"
#include "WorkspaceMenuStructure.h"
#include "WorkspaceMenuStructureModule.h"
#include "Styling/AppStyle.h"

const FName UUMAEditorSubsystem::ChatTabId = TEXT("UMAChatPanel");

void UUMAEditorSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
}

void UUMAEditorSubsystem::Deinitialize()
{
    UnregisterChatTab();
    Super::Deinitialize();
}

void UUMAEditorSubsystem::RegisterChatTab()
{
    FGlobalTabmanager::Get()->RegisterNomadTabSpawner(
        ChatTabId,
        FOnSpawnTab::CreateUObject(this, &UUMAEditorSubsystem::SpawnChatTabForSubsystem))
        .SetDisplayName(FText::FromString(TEXT("Unreal Master Chat")))
        .SetTooltipText(FText::FromString(TEXT("Open the Unreal Master AI chat panel")))
        .SetIcon(FSlateIcon(FAppStyle::GetAppStyleSetName(), "Icons.Comment"))
        .SetGroup(WorkspaceMenu::GetMenuStructure().GetToolsCategory());
}

void UUMAEditorSubsystem::UnregisterChatTab()
{
    FGlobalTabmanager::Get()->UnregisterNomadTabSpawner(ChatTabId);
}

TSharedRef<SDockTab> UUMAEditorSubsystem::SpawnChatTabForSubsystem(const FSpawnTabArgs& Args)
{
    return SNew(SDockTab)
        .TabRole(NomadTab)
        .Label(FText::FromString(TEXT("Unreal Master Chat")))
        [
            SNew(SUMAChatPanel)
            .Subsystem(this)
        ];
}

TSharedRef<SDockTab> UUMAEditorSubsystem::SpawnChatTab(const FSpawnTabArgs& Args)
{
    if (GEditor)
    {
        UUMAEditorSubsystem* Subsystem =
            GEditor->GetEditorSubsystem<UUMAEditorSubsystem>();
        if (Subsystem)
        {
            return Subsystem->SpawnChatTabForSubsystem(Args);
        }
    }

    return SNew(SDockTab)
        .TabRole(NomadTab)
        [
            SNew(STextBlock).Text(FText::FromString(TEXT("Chat unavailable")))
        ];
}

void UUMAEditorSubsystem::AddChatMessage(const FString& Text, bool bIsFromUser)
{
    check(IsInGameThread());

    FUMAChatEntry Entry;
    Entry.Text        = Text;
    Entry.bIsFromUser = bIsFromUser;
    Entry.Timestamp   = FDateTime::UtcNow();
    ChatMessages.Add(Entry);

    OnChatMessageAdded.Broadcast(Entry);
}

void UUMAEditorSubsystem::InvokeChatTab()
{
    FGlobalTabmanager::Get()->TryInvokeTab(ChatTabId);
}
