# Slate Tree View Widget

## Keywords
STreeView, tree, view, hierarchy, expand, collapse, nodes

## Overview
A Slate tree view widget for displaying hierarchical data with expand/collapse support.

## Code

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Widgets/Views/STreeView.h"

struct FTreeItem
{
    FString Label;
    TArray<TSharedPtr<FTreeItem>> Children;
};

class SMyTreeView : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyTreeView)
    {}
        SLATE_ARGUMENT(TArray<TSharedPtr<FTreeItem>>, RootItems)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs)
    {
        RootItems = InArgs._RootItems;

        ChildSlot
        [
            SAssignNew(TreeView, STreeView<TSharedPtr<FTreeItem>>)
            .TreeItemsSource(&RootItems)
            .OnGenerateRow(this, &SMyTreeView::GenerateRow)
            .OnGetChildren(this, &SMyTreeView::GetChildren)
        ];
    }

private:
    TArray<TSharedPtr<FTreeItem>> RootItems;
    TSharedPtr<STreeView<TSharedPtr<FTreeItem>>> TreeView;

    TSharedRef<ITableRow> GenerateRow(
        TSharedPtr<FTreeItem> Item,
        const TSharedRef<STableViewBase>& OwnerTable)
    {
        return SNew(STableRow<TSharedPtr<FTreeItem>>, OwnerTable)
            [
                SNew(STextBlock)
                .Text(FText::FromString(Item->Label))
            ];
    }

    void GetChildren(TSharedPtr<FTreeItem> Item, TArray<TSharedPtr<FTreeItem>>& OutChildren)
    {
        OutChildren = Item->Children;
    }
};
```
