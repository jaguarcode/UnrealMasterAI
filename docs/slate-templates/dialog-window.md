# Slate Dialog Window

## Keywords
SWindow, dialog, modal, window, popup, SButton, confirm, cancel

## Overview
A Slate modal dialog window with confirm and cancel buttons.

## Code

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Widgets/SWindow.h"
#include "Widgets/Input/SButton.h"

class SMyDialog : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyDialog)
        : _Title(FText::GetEmpty())
        , _Message(FText::GetEmpty())
    {}
        SLATE_ATTRIBUTE(FText, Title)
        SLATE_ATTRIBUTE(FText, Message)
        SLATE_EVENT(FSimpleDelegate, OnConfirm)
        SLATE_EVENT(FSimpleDelegate, OnCancel)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs)
    {
        OnConfirmDelegate = InArgs._OnConfirm;
        OnCancelDelegate = InArgs._OnCancel;

        ChildSlot
        [
            SNew(SVerticalBox)
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(10.0f)
            [
                SNew(STextBlock)
                .Text(InArgs._Message)
            ]
            + SVerticalBox::Slot()
            .AutoHeight()
            .HAlign(HAlign_Right)
            .Padding(10.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot()
                .AutoWidth()
                [
                    SNew(SButton)
                    .Text(NSLOCTEXT("Dialog", "Confirm", "Confirm"))
                    .OnClicked(this, &SMyDialog::HandleConfirm)
                ]
                + SHorizontalBox::Slot()
                .AutoWidth()
                [
                    SNew(SButton)
                    .Text(NSLOCTEXT("Dialog", "Cancel", "Cancel"))
                    .OnClicked(this, &SMyDialog::HandleCancel)
                ]
            ]
        ];
    }

private:
    FSimpleDelegate OnConfirmDelegate;
    FSimpleDelegate OnCancelDelegate;

    FReply HandleConfirm()
    {
        OnConfirmDelegate.ExecuteIfBound();
        return FReply::Handled();
    }

    FReply HandleCancel()
    {
        OnCancelDelegate.ExecuteIfBound();
        return FReply::Handled();
    }
};
```
