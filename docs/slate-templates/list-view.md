# Slate List View Widget

## Keywords
SListView, list, view, scroll, items, rows, SListView, list-view

## Overview
A Slate list view widget that renders a scrollable list of items.

## Code

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Widgets/Views/SListView.h"

class SMyListView : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyListView)
    {}
        SLATE_ARGUMENT(TArray<TSharedPtr<FString>>, Items)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs)
    {
        Items = InArgs._Items;

        ChildSlot
        [
            SNew(SVerticalBox)
            + SVerticalBox::Slot()
            .FillHeight(1.0f)
            [
                SAssignNew(ListView, SListView<TSharedPtr<FString>>)
                .ItemHeight(24)
                .ListItemsSource(&Items)
                .OnGenerateRow(this, &SMyListView::GenerateRow)
            ]
        ];
    }

private:
    TArray<TSharedPtr<FString>> Items;
    TSharedPtr<SListView<TSharedPtr<FString>>> ListView;

    TSharedRef<ITableRow> GenerateRow(
        TSharedPtr<FString> Item,
        const TSharedRef<STableViewBase>& OwnerTable)
    {
        return SNew(STableRow<TSharedPtr<FString>>, OwnerTable)
            [
                SNew(STextBlock)
                .Text(FText::FromString(*Item))
            ];
    }
};
```
