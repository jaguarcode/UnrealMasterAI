# Modal Dialog Template

## Usage
Create a modal dialog window using SWindow with OK and Cancel buttons. Use this pattern when you need user confirmation, input forms, or any popup that blocks interaction with the main editor until dismissed.

## Code
```cpp
#pragma once
#include "Widgets/SCompoundWidget.h"
#include "Widgets/SWindow.h"
#include "Widgets/Input/SEditableTextBox.h"

class SMyDialog : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SMyDialog)
        : _Title(FText::FromString(TEXT("Dialog")))
        , _Message(FText::GetEmpty())
    {}
        SLATE_ARGUMENT(FText, Title)
        SLATE_ARGUMENT(FText, Message)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);

    /** Show the dialog and return true if OK was pressed */
    static bool Show(const FText& Title, const FText& Message, FString& OutInput);

    bool WasOkPressed() const { return bOkPressed; }
    FString GetInput() const;

private:
    bool bOkPressed = false;
    TSharedPtr<SEditableTextBox> InputBox;
    TWeakPtr<SWindow> ParentWindow;

    FReply OnOkClicked();
    FReply OnCancelClicked();
    void CloseDialog();
};

// Implementation
void SMyDialog::Construct(const FArguments& InArgs)
{
    ChildSlot
    [
        SNew(SVerticalBox)
        + SVerticalBox::Slot()
        .AutoHeight()
        .Padding(8.0f)
        [
            SNew(STextBlock)
            .Text(InArgs._Message)
            .AutoWrapText(true)
        ]
        + SVerticalBox::Slot()
        .AutoHeight()
        .Padding(8.0f)
        [
            SAssignNew(InputBox, SEditableTextBox)
            .HintText(FText::FromString(TEXT("Enter value...")))
        ]
        + SVerticalBox::Slot()
        .AutoHeight()
        .HAlign(HAlign_Right)
        .Padding(8.0f)
        [
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot()
            .AutoWidth()
            .Padding(4.0f, 0.0f)
            [
                SNew(SButton)
                .Text(FText::FromString(TEXT("OK")))
                .OnClicked(this, &SMyDialog::OnOkClicked)
            ]
            + SHorizontalBox::Slot()
            .AutoWidth()
            .Padding(4.0f, 0.0f)
            [
                SNew(SButton)
                .Text(FText::FromString(TEXT("Cancel")))
                .OnClicked(this, &SMyDialog::OnCancelClicked)
            ]
        ]
    ];
}

bool SMyDialog::Show(const FText& Title, const FText& Message, FString& OutInput)
{
    TSharedRef<SWindow> Window = SNew(SWindow)
        .Title(Title)
        .SizingRule(ESizingRule::Autosized)
        .AutoCenter(EAutoCenter::PreferredWorkArea)
        .SupportsMinimize(false)
        .SupportsMaximize(false);

    TSharedRef<SMyDialog> Dialog = SNew(SMyDialog)
        .Title(Title)
        .Message(Message);

    Dialog->ParentWindow = Window;
    Window->SetContent(Dialog);

    GEditor->EditorAddModalWindow(Window);

    OutInput = Dialog->GetInput();
    return Dialog->WasOkPressed();
}

FString SMyDialog::GetInput() const
{
    return InputBox.IsValid() ? InputBox->GetText().ToString() : FString();
}

FReply SMyDialog::OnOkClicked()
{
    bOkPressed = true;
    CloseDialog();
    return FReply::Handled();
}

FReply SMyDialog::OnCancelClicked()
{
    bOkPressed = false;
    CloseDialog();
    return FReply::Handled();
}

void SMyDialog::CloseDialog()
{
    TSharedPtr<SWindow> Window = ParentWindow.Pin();
    if (Window.IsValid())
    {
        Window->RequestDestroyWindow();
    }
}
```

## Keywords
dialog, modal, popup, window, SWindow, OK, cancel, confirmation, input, form
