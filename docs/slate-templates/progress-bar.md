# Slate Progress Bar Widget

## Keywords
SProgressBar, progress, bar, loading, percent, fill, SProgressBar

## Overview
A Slate progress bar widget with bindable percentage attribute.

## Code

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Widgets/Notifications/SProgressBar.h"

class SMyProgressBar : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyProgressBar)
        : _Label(FText::GetEmpty())
        , _Percent(0.0f)
    {}
        SLATE_ATTRIBUTE(FText, Label)
        SLATE_ATTRIBUTE(TOptional<float>, Percent)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs)
    {
        ChildSlot
        [
            SNew(SVerticalBox)
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(4.0f)
            [
                SNew(STextBlock)
                .Text(InArgs._Label)
            ]
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(4.0f)
            [
                SNew(SProgressBar)
                .Percent(InArgs._Percent)
            ]
        ];
    }
};
```
