# Base Compound Widget Template

## Usage
Basic starting point for custom Slate widgets. Use SCompoundWidget as the base class when you need a widget that composes other Slate widgets into a single unit.

## Code
```cpp
#pragma once
#include "Widgets/SCompoundWidget.h"

class SMyWidget : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyWidget)
        : _Label(FText::GetEmpty())
    {}
        SLATE_ARGUMENT(FText, Label)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);

private:
    TSharedPtr<STextBlock> LabelText;
};

// Implementation
void SMyWidget::Construct(const FArguments& InArgs)
{
    ChildSlot
    [
        SNew(SVerticalBox)
        + SVerticalBox::Slot()
        .AutoHeight()
        [
            SAssignNew(LabelText, STextBlock)
            .Text(InArgs._Label)
        ]
    ];
}
```

## Keywords
widget, compound, basic, template, SCompoundWidget, SLATE_BEGIN_ARGS
