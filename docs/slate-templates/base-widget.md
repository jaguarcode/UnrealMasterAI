# Base Slate Widget

## Keywords
SCompoundWidget, SLATE_BEGIN_ARGS, SLATE_END_ARGS, widget, base, compound

## Overview
A minimal base Slate widget demonstrating the fundamental widget structure.

## Code

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"

class SMyBaseWidget : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyBaseWidget)
        : _LabelText(FText::GetEmpty())
    {}
        SLATE_ATTRIBUTE(FText, LabelText)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs)
    {
        ChildSlot
        [
            SNew(STextBlock)
            .Text(InArgs._LabelText)
        ];
    }
};
```
