# Slate Input Field Widget

## Keywords
SEditableTextBox, input, text, field, editable, SEditableText, text input

## Overview
A Slate editable text input field with label and validation support.

## Code

```cpp
#pragma once

#include "CoreMinimal.h"
#include "Widgets/Input/SEditableTextBox.h"

class SMyInputField : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyInputField)
        : _Label(FText::GetEmpty())
        , _HintText(FText::GetEmpty())
    {}
        SLATE_ATTRIBUTE(FText, Label)
        SLATE_ATTRIBUTE(FText, HintText)
        SLATE_EVENT(FOnTextChanged, OnTextChanged)
        SLATE_EVENT(FOnTextCommitted, OnTextCommitted)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs)
    {
        ChildSlot
        [
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot()
            .AutoWidth()
            .VAlign(VAlign_Center)
            .Padding(4.0f)
            [
                SNew(STextBlock)
                .Text(InArgs._Label)
            ]
            + SHorizontalBox::Slot()
            .FillWidth(1.0f)
            .Padding(4.0f)
            [
                SAssignNew(TextBox, SEditableTextBox)
                .HintText(InArgs._HintText)
                .OnTextChanged(InArgs._OnTextChanged)
                .OnTextCommitted(InArgs._OnTextCommitted)
            ]
        ];
    }

    FText GetText() const
    {
        return TextBox.IsValid() ? TextBox->GetText() : FText::GetEmpty();
    }

private:
    TSharedPtr<SEditableTextBox> TextBox;
};
```
