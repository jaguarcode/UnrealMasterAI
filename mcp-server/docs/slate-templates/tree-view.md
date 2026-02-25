# Tree View Widget Template

## Usage
Create a hierarchical tree view using STreeView. Supports expanding/collapsing nodes, parent-child relationships, and multi-level nesting. Use when displaying folder structures, scene hierarchies, or any nested data model.

## Code
```cpp
#pragma once
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Views/STreeView.h"

struct FMyTreeItem
{
    FString Label;
    TArray<TSharedPtr<FMyTreeItem>> Children;
};

class SMyTreeWidget : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyTreeWidget) {}
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);

private:
    TArray<TSharedPtr<FMyTreeItem>> RootItems;
    TSharedPtr<STreeView<TSharedPtr<FMyTreeItem>>> TreeView;

    TSharedRef<ITableRow> OnGenerateRow(
        TSharedPtr<FMyTreeItem> InItem,
        const TSharedRef<STableViewBase>& OwnerTable);

    void OnGetChildren(
        TSharedPtr<FMyTreeItem> InItem,
        TArray<TSharedPtr<FMyTreeItem>>& OutChildren);

    void OnExpansionChanged(
        TSharedPtr<FMyTreeItem> InItem,
        bool bIsExpanded);
};

// Implementation
void SMyTreeWidget::Construct(const FArguments& InArgs)
{
    // Build hierarchical data
    TSharedPtr<FMyTreeItem> Root = MakeShared<FMyTreeItem>();
    Root->Label = TEXT("Root");

    TSharedPtr<FMyTreeItem> Child1 = MakeShared<FMyTreeItem>();
    Child1->Label = TEXT("Child 1");

    TSharedPtr<FMyTreeItem> Child2 = MakeShared<FMyTreeItem>();
    Child2->Label = TEXT("Child 2");

    TSharedPtr<FMyTreeItem> GrandChild = MakeShared<FMyTreeItem>();
    GrandChild->Label = TEXT("Grand Child");
    Child1->Children.Add(GrandChild);

    Root->Children.Add(Child1);
    Root->Children.Add(Child2);
    RootItems.Add(Root);

    ChildSlot
    [
        SAssignNew(TreeView, STreeView<TSharedPtr<FMyTreeItem>>)
        .TreeItemsSource(&RootItems)
        .OnGenerateRow(this, &SMyTreeWidget::OnGenerateRow)
        .OnGetChildren(this, &SMyTreeWidget::OnGetChildren)
        .OnExpansionChanged(this, &SMyTreeWidget::OnExpansionChanged)
    ];
}

TSharedRef<ITableRow> SMyTreeWidget::OnGenerateRow(
    TSharedPtr<FMyTreeItem> InItem,
    const TSharedRef<STableViewBase>& OwnerTable)
{
    return SNew(STableRow<TSharedPtr<FMyTreeItem>>, OwnerTable)
    [
        SNew(STextBlock)
        .Text(FText::FromString(InItem->Label))
    ];
}

void SMyTreeWidget::OnGetChildren(
    TSharedPtr<FMyTreeItem> InItem,
    TArray<TSharedPtr<FMyTreeItem>>& OutChildren)
{
    OutChildren = InItem->Children;
}

void SMyTreeWidget::OnExpansionChanged(
    TSharedPtr<FMyTreeItem> InItem,
    bool bIsExpanded)
{
    UE_LOG(LogTemp, Log, TEXT("Node %s %s"),
        *InItem->Label,
        bIsExpanded ? TEXT("expanded") : TEXT("collapsed"));
}
```

## Keywords
tree, treeview, STreeView, hierarchical, hierarchy, children, expand, collapse, nested, parent, GetChildren
