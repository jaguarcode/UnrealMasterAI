# Dockable Tab Widget Template

## Usage
Register and create dockable tab panels using FTabManager and SDockTab. This pattern is used for editor extensions that need their own dockable panels, similar to Content Browser or Details panels. Tabs can be dragged, docked, and persisted across editor sessions.

## Code
```cpp
#pragma once
#include "Widgets/Docking/SDockTab.h"
#include "Framework/Docking/TabManager.h"
#include "WorkspaceMenuStructure.h"
#include "WorkspaceMenuStructureModule.h"

static const FName MyTabName("MyEditorTab");

class FMyTabManager
{
public:
    static void Register()
    {
        FGlobalTabmanager::Get()->RegisterNomadTabSpawner(
            MyTabName,
            FOnSpawnTab::CreateStatic(&FMyTabManager::SpawnTab))
            .SetDisplayName(FText::FromString(TEXT("My Editor Tab")))
            .SetTooltipText(FText::FromString(TEXT("Open My Editor Tab")))
            .SetIcon(FSlateIcon(FAppStyle::GetAppStyleSetName(), "Icons.Layout"))
            .SetGroup(WorkspaceMenu::GetMenuStructure().GetToolsCategory());
    }

    static void Unregister()
    {
        FGlobalTabmanager::Get()->UnregisterNomadTabSpawner(MyTabName);
    }

    static TSharedRef<SDockTab> SpawnTab(const FSpawnTabArgs& Args)
    {
        return SNew(SDockTab)
            .TabRole(NomadTab)
            .Label(FText::FromString(TEXT("My Tab")))
            [
                SNew(SVerticalBox)
                + SVerticalBox::Slot()
                .AutoHeight()
                .Padding(8.0f)
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(TEXT("Welcome to My Tab")))
                    .Font(FCoreStyle::GetDefaultFontStyle("Bold", 16))
                ]
                + SVerticalBox::Slot()
                .FillHeight(1.0f)
                .Padding(8.0f)
                [
                    SNew(SBorder)
                    .BorderImage(FAppStyle::GetBrush("ToolPanel.GroupBorder"))
                    [
                        SNew(SVerticalBox)
                        + SVerticalBox::Slot()
                        .AutoHeight()
                        [
                            SNew(STextBlock)
                            .Text(FText::FromString(TEXT("Content goes here")))
                        ]
                        + SVerticalBox::Slot()
                        .AutoHeight()
                        .Padding(4.0f)
                        [
                            SNew(SButton)
                            .Text(FText::FromString(TEXT("Execute")))
                            .OnClicked_Lambda([]()
                            {
                                UE_LOG(LogTemp, Log, TEXT("Tab button clicked"));
                                return FReply::Handled();
                            })
                        ]
                    ]
                ]
            ];
    }

    static void InvokeTab()
    {
        FGlobalTabmanager::Get()->TryInvokeTab(MyTabName);
    }
};

// Registration (typically in StartupModule):
// FMyTabManager::Register();

// Invoke tab:
// FMyTabManager::InvokeTab();

// Unregister (typically in ShutdownModule):
// FMyTabManager::Unregister();
```

## Keywords
tab, dockable, SDockTab, FTabManager, panel, dock, nomad, workspace, register, spawn
