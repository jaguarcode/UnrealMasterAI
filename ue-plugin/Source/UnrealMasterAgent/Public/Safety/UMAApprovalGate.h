// Copyright Unreal Master Team. All Rights Reserved.
#pragma once

#include "CoreMinimal.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/SWindow.h"

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** Represents an in-flight approval request from the MCP Server. */
struct FUMAApprovalRequest
{
    /** UUID that correlates with the pending WSMessage id on the TS side */
    FString OperationId;

    /** MCP tool name, e.g. "blueprint-deleteNode" */
    FString ToolName;

    /** Human-readable reason from classifyOperation() */
    FString Reason;

    /** Optional file path involved in the operation */
    FString FilePath;
};

// ---------------------------------------------------------------------------
// Slate dialog widget
// ---------------------------------------------------------------------------

/**
 * Modal Slate dialog that presents an approval request to the developer.
 * Shown via GEditor->EditorAddModalWindow() on the GameThread.
 *
 * MUST only be created / shown on the GameThread.
 */
class SUMAApprovalDialog : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SUMAApprovalDialog)
        : _Request(FUMAApprovalRequest{})
    {}
        SLATE_ARGUMENT(FUMAApprovalRequest, Request)
        SLATE_ARGUMENT(int32, TimeoutSeconds)
    SLATE_END_ARGS()

    void Construct(const FArguments& InArgs);

    /** Returns true if the Approve button was pressed, false for Reject/timeout. */
    bool WasApproved() const { return bApproved; }

    /** Allow SpawnDialog to set the parent window reference */
    TWeakPtr<SWindow> ParentWindow;

private:
    bool bApproved = false;
    FUMAApprovalRequest CurrentRequest;
    TSharedPtr<STextBlock> CountdownText;
    FTimerHandle CountdownTimer;
    int32 RemainingSeconds = 60;

    FReply OnApproveClicked();
    FReply OnRejectClicked();
    void OnCountdownTick();
    void CloseDialog();
};

// ---------------------------------------------------------------------------
// Gate class — manages in-flight requests and dialog lifecycle
// ---------------------------------------------------------------------------

/**
 * Manages approval dialogs for dangerous operations initiated by the MCP Server.
 *
 * Threading: All public methods MUST be called on the GameThread.
 * The WebSocket receive path dispatches to GameThread before calling these.
 */
class UNREALMASTERAGENT_API FUMAApprovalGate
{
public:
    FUMAApprovalGate();
    ~FUMAApprovalGate();

    /** Returns true — the gate is always valid after construction. */
    bool IsValid() const { return true; }

    /**
     * Register an in-flight approval request from the MCP Server.
     * Called when a 'safety.requestApproval' WS message arrives.
     * Shows the Slate dialog immediately if on GameThread.
     *
     * @param Request - The parsed approval request
     * @param OnResolved - Callback invoked with (approved: bool) after dialog closes
     */
    void ShowApprovalDialog(
        const FUMAApprovalRequest& Request,
        TFunction<void(bool)> OnResolved);

    // --- Test helpers (used by automation tests only) ---

    /** Add a pending request entry without showing a dialog (for unit tests). */
    void SetPendingRequest(const FUMAApprovalRequest& Request);

    /** Look up a pending request by OperationId. Returns nullptr if not found. */
    const FUMAApprovalRequest* GetPendingRequest(const FString& OperationId) const;

    /**
     * Resolve a pending request (simulate Approve/Reject).
     * @return true if the OperationId was found and resolved; false otherwise.
     */
    bool ResolveRequest(const FString& OperationId, bool bApproved);

    /** Returns the number of pending (unresolved) requests. */
    int32 GetPendingCount() const;

private:
    struct FPendingEntry
    {
        FUMAApprovalRequest Request;
        TFunction<void(bool)> OnResolved;
    };

    /** Map of OperationId -> pending entry */
    TMap<FString, FPendingEntry> PendingRequests;

    /** Invoke a dialog on the GameThread */
    void SpawnDialog(const FString& OperationId, int32 TimeoutSeconds);
};
