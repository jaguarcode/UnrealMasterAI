# Slate Tab Widget

## Keywords
SDockTab, tab, panel, tabbed, docking, STabManager, tabs

## Overview
A Slate tabbed widget that manages multiple content panels via SDockTab.

## Code

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Widgets/Docking/SDockTab.h"

class SMyTabWidget : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyTabWidget)
    {}
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs)
    {
        const TSharedRef<FTabManager::FLayout> Layout =
            FTabManager::NewLayout("MyTabLayout")
            ->AddArea(
                FTabManager::NewArea(800, 600)
                ->Split(
                    FTabManager::NewStack()
                    ->AddTab("Tab1", ETabState::OpenedTab)
                    ->AddTab("Tab2", ETabState::OpenedTab)
                )
            );

        FGlobalTabmanager::Get()->RegisterTabSpawner("Tab1", FOnSpawnTab::CreateSP(this, &SMyTabWidget::SpawnTab1))
            .SetDisplayName(NSLOCTEXT("Tabs", "Tab1", "First Tab"));
        FGlobalTabmanager::Get()->RegisterTabSpawner("Tab2", FOnSpawnTab::CreateSP(this, &SMyTabWidget::SpawnTab2))
            .SetDisplayName(NSLOCTEXT("Tabs", "Tab2", "Second Tab"));

        ChildSlot
        [
            FGlobalTabmanager::Get()->RestoreFrom(Layout, TSharedPtr<SWindow>()).ToSharedRef()
        ];
    }

private:
    TSharedRef<SDockTab> SpawnTab1(const FSpawnTabArgs& Args)
    {
        return SNew(SDockTab)
            .TabRole(ETabRole::NomadTab)
            [
                SNew(STextBlock)
                .Text(NSLOCTEXT("Tabs", "Content1", "First Tab Content"))
            ];
    }

    TSharedRef<SDockTab> SpawnTab2(const FSpawnTabArgs& Args)
    {
        return SNew(SDockTab)
            .TabRole(ETabRole::NomadTab)
            [
                SNew(STextBlock)
                .Text(NSLOCTEXT("Tabs", "Content2", "Second Tab Content"))
            ];
    }
};
```
