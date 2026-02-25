// Copyright Unreal Master Team. All Rights Reserved.

#include "Safety/UMAApprovalGate.h"
#include "Editor.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SSpacer.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/SBoxPanel.h"
#include "Styling/AppStyle.h"
#include "Framework/Application/SlateApplication.h"

// ---------------------------------------------------------------------------
// SUMAApprovalDialog — Slate widget implementation
// ---------------------------------------------------------------------------

void SUMAApprovalDialog::Construct(const FArguments& InArgs)
{
    CurrentRequest   = InArgs._Request;
    RemainingSeconds = InArgs._TimeoutSeconds > 0 ? InArgs._TimeoutSeconds : 60;

    const FString CountdownStr = FString::Printf(TEXT("Auto-reject in %ds"), RemainingSeconds);

    ChildSlot
    [
        SNew(SBox)
        .MinDesiredWidth(420.0f)
        .MaxDesiredWidth(600.0f)
        [
            SNew(SVerticalBox)

            // Header
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 12.0f, 12.0f, 4.0f)
            [
                SNew(STextBlock)
                .Text(FText::FromString(TEXT("Dangerous Operation \u2014 Approval Required")))
                .Font(FCoreStyle::GetDefaultFontStyle("Bold", 13))
                .ColorAndOpacity(FLinearColor(0.9f, 0.4f, 0.1f))
            ]

            // Tool name
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 4.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(TEXT("Operation: ")))
                    .Font(FCoreStyle::GetDefaultFontStyle("Bold", 11))
                ]
                + SHorizontalBox::Slot().FillWidth(1.0f)
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(CurrentRequest.ToolName))
                ]
            ]

            // Reason
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 4.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(TEXT("Reason: ")))
                    .Font(FCoreStyle::GetDefaultFontStyle("Bold", 11))
                ]
                + SHorizontalBox::Slot().FillWidth(1.0f)
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(CurrentRequest.Reason))
                    .AutoWrapText(true)
                ]
            ]

            // File path (conditional)
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 4.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(TEXT("Path: ")))
                    .Font(FCoreStyle::GetDefaultFontStyle("Bold", 11))
                    .Visibility(CurrentRequest.FilePath.IsEmpty()
                        ? EVisibility::Collapsed : EVisibility::Visible)
                ]
                + SHorizontalBox::Slot().FillWidth(1.0f)
                [
                    SNew(STextBlock)
                    .Text(FText::FromString(CurrentRequest.FilePath))
                    .Visibility(CurrentRequest.FilePath.IsEmpty()
                        ? EVisibility::Collapsed : EVisibility::Visible)
                ]
            ]

            // Countdown
            + SVerticalBox::Slot()
            .AutoHeight()
            .Padding(12.0f, 8.0f, 12.0f, 4.0f)
            [
                SAssignNew(CountdownText, STextBlock)
                .Text(FText::FromString(CountdownStr))
                .ColorAndOpacity(FLinearColor(0.6f, 0.6f, 0.6f))
            ]

            // Buttons
            + SVerticalBox::Slot()
            .AutoHeight()
            .HAlign(HAlign_Right)
            .Padding(12.0f)
            [
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot()
                .AutoWidth()
                .Padding(4.0f, 0.0f)
                [
                    SNew(SButton)
                    .Text(FText::FromString(TEXT("Approve")))
                    .OnClicked(this, &SUMAApprovalDialog::OnApproveClicked)
                ]
                + SHorizontalBox::Slot()
                .AutoWidth()
                .Padding(4.0f, 0.0f)
                [
                    SNew(SButton)
                    .Text(FText::FromString(TEXT("Reject")))
                    .OnClicked(this, &SUMAApprovalDialog::OnRejectClicked)
                ]
            ]
        ]
    ];

    // Start countdown timer (fires every 1 second on GameThread)
    if (GEditor)
    {
        GEditor->GetTimerManager()->SetTimer(
            CountdownTimer,
            FTimerDelegate::CreateSP(this, &SUMAApprovalDialog::OnCountdownTick),
            1.0f,
            true);
    }
}

FReply SUMAApprovalDialog::OnApproveClicked()
{
    bApproved = true;
    if (GEditor && CountdownTimer.IsValid())
    {
        GEditor->GetTimerManager()->ClearTimer(CountdownTimer);
    }
    CloseDialog();
    return FReply::Handled();
}

FReply SUMAApprovalDialog::OnRejectClicked()
{
    bApproved = false;
    if (GEditor && CountdownTimer.IsValid())
    {
        GEditor->GetTimerManager()->ClearTimer(CountdownTimer);
    }
    CloseDialog();
    return FReply::Handled();
}

void SUMAApprovalDialog::OnCountdownTick()
{
    --RemainingSeconds;
    if (CountdownText.IsValid())
    {
        CountdownText->SetText(FText::FromString(
            FString::Printf(TEXT("Auto-reject in %ds"), RemainingSeconds)));
    }
    if (RemainingSeconds <= 0)
    {
        // Timeout = reject
        OnRejectClicked();
    }
}

void SUMAApprovalDialog::CloseDialog()
{
    TSharedPtr<SWindow> Window = ParentWindow.Pin();
    if (Window.IsValid())
    {
        Window->RequestDestroyWindow();
    }
}

// ---------------------------------------------------------------------------
// FUMAApprovalGate implementation
// ---------------------------------------------------------------------------

FUMAApprovalGate::FUMAApprovalGate()
{
}

FUMAApprovalGate::~FUMAApprovalGate()
{
}

void FUMAApprovalGate::ShowApprovalDialog(
    const FUMAApprovalRequest& Request,
    TFunction<void(bool)> OnResolved)
{
    // Must be on GameThread to touch Slate
    check(IsInGameThread());

    // Register the pending entry so test helpers can find it
    FPendingEntry Entry;
    Entry.Request    = Request;
    Entry.OnResolved = OnResolved;
    PendingRequests.Add(Request.OperationId, Entry);

    SpawnDialog(Request.OperationId, 60);
}

void FUMAApprovalGate::SpawnDialog(const FString& OperationId, int32 TimeoutSeconds)
{
    FPendingEntry* Entry = PendingRequests.Find(OperationId);
    if (!Entry) return;

    TSharedRef<SWindow> Window = SNew(SWindow)
        .Title(FText::FromString(TEXT("Unreal Master \u2014 Approval Required")))
        .SizingRule(ESizingRule::Autosized)
        .AutoCenter(EAutoCenter::PreferredWorkArea)
        .SupportsMinimize(false)
        .SupportsMaximize(false)
        .IsTopmostWindow(true);

    TSharedRef<SUMAApprovalDialog> Dialog = SNew(SUMAApprovalDialog)
        .Request(Entry->Request)
        .TimeoutSeconds(TimeoutSeconds);

    // Give the dialog a back-reference to its window for self-close
    Dialog->ParentWindow = Window;
    Window->SetContent(Dialog);

    // Blocking modal — returns after dialog closes
    if (GEditor)
    {
        GEditor->EditorAddModalWindow(Window);
    }

    // After modal returns, read the result
    bool bApproved = Dialog->WasApproved();
    TFunction<void(bool)> Callback = Entry->OnResolved;
    PendingRequests.Remove(OperationId);

    if (Callback)
    {
        Callback(bApproved);
    }
}

// --- Test helpers ---

void FUMAApprovalGate::SetPendingRequest(const FUMAApprovalRequest& Request)
{
    FPendingEntry Entry;
    Entry.Request    = Request;
    Entry.OnResolved = nullptr;
    PendingRequests.Add(Request.OperationId, Entry);
}

const FUMAApprovalRequest* FUMAApprovalGate::GetPendingRequest(const FString& OperationId) const
{
    const FPendingEntry* Entry = PendingRequests.Find(OperationId);
    return Entry ? &Entry->Request : nullptr;
}

bool FUMAApprovalGate::ResolveRequest(const FString& OperationId, bool bApproved)
{
    FPendingEntry* Entry = PendingRequests.Find(OperationId);
    if (!Entry) return false;

    if (Entry->OnResolved)
    {
        Entry->OnResolved(bApproved);
    }
    PendingRequests.Remove(OperationId);
    return true;
}

int32 FUMAApprovalGate::GetPendingCount() const
{
    return PendingRequests.Num();
}
