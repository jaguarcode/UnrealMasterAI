# List View Widget Template

## Usage
Create a scrollable list of items using SListView. Each row is generated via a delegate that returns an ITableRow. Ideal for displaying collections of data such as asset lists, log entries, or search results.

## Code
```cpp
#pragma once
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Views/SListView.h"

struct FMyListItem
{
    FString Name;
    int32 Value;
};

class SMyListWidget : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyListWidget) {}
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);

private:
    TArray<TSharedPtr<FMyListItem>> Items;
    TSharedPtr<SListView<TSharedPtr<FMyListItem>>> ListView;

    TSharedRef<ITableRow> OnGenerateRow(
        TSharedPtr<FMyListItem> InItem,
        const TSharedRef<STableViewBase>& OwnerTable);

    void OnSelectionChanged(
        TSharedPtr<FMyListItem> InItem,
        ESelectInfo::Type SelectInfo);
};

// Implementation
void SMyListWidget::Construct(const FArguments& InArgs)
{
    // Populate sample data
    Items.Add(MakeShared<FMyListItem>(FMyListItem{TEXT("Alpha"), 1}));
    Items.Add(MakeShared<FMyListItem>(FMyListItem{TEXT("Beta"), 2}));
    Items.Add(MakeShared<FMyListItem>(FMyListItem{TEXT("Gamma"), 3}));

    ChildSlot
    [
        SAssignNew(ListView, SListView<TSharedPtr<FMyListItem>>)
        .ItemHeight(24.0f)
        .ListItemsSource(&Items)
        .OnGenerateRow(this, &SMyListWidget::OnGenerateRow)
        .OnSelectionChanged(this, &SMyListWidget::OnSelectionChanged)
    ];
}

TSharedRef<ITableRow> SMyListWidget::OnGenerateRow(
    TSharedPtr<FMyListItem> InItem,
    const TSharedRef<STableViewBase>& OwnerTable)
{
    return SNew(STableRow<TSharedPtr<FMyListItem>>, OwnerTable)
    [
        SNew(SHorizontalBox)
        + SHorizontalBox::Slot()
        .Padding(4.0f)
        [
            SNew(STextBlock)
            .Text(FText::FromString(InItem->Name))
        ]
        + SHorizontalBox::Slot()
        .Padding(4.0f)
        [
            SNew(STextBlock)
            .Text(FText::AsNumber(InItem->Value))
        ]
    ];
}

void SMyListWidget::OnSelectionChanged(
    TSharedPtr<FMyListItem> InItem,
    ESelectInfo::Type SelectInfo)
{
    if (InItem.IsValid())
    {
        UE_LOG(LogTemp, Log, TEXT("Selected: %s"), *InItem->Name);
    }
}
```

## Keywords
list, listview, SListView, ITableRow, row, items, scrollable, data, collection, generate row
