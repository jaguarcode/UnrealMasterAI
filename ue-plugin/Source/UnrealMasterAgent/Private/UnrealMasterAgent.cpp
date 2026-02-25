// Copyright Unreal Master Team. All Rights Reserved.

#include "UnrealMasterAgent.h"
#include "WebSocket/UMAWebSocketClient.h"
#include "WebSocket/UMAMessageHandler.h"
#include "Blueprint/UMABlueprintSerializer.h"
#include "Blueprint/UMABlueprintManipulator.h"
#include "Compilation/UMALiveCodingController.h"
#include "Compilation/UMACompileLogParser.h"
#include "Editor/UMAEditorQueries.h"
#include "Editor/UMAEditorSubsystem.h"
#include "Safety/UMAApprovalGate.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

#define LOCTEXT_NAMESPACE "FUnrealMasterAgentModule"

TUniquePtr<FUMAWebSocketClient> GWebSocketClient;
static TUniquePtr<FUMAMessageHandler> GMessageHandler;
static TUniquePtr<FUMALiveCodingController> GLiveCodingController;
static TUniquePtr<FUMAApprovalGate> GApprovalGate;

// ---------------------------------------------------------------------------
// Helper: Build an error FUMAWSResponse
// ---------------------------------------------------------------------------
static FUMAWSResponse MakeErrorResponse(const FString& RequestId, int32 Code, const FString& Message)
{
    FUMAWSResponse Response;
    Response.Id = RequestId;
    FUMAWSError Error;
    Error.Code = Code;
    Error.Message = Message;
    Response.Error = Error;
    return Response;
}

// ---------------------------------------------------------------------------
// Helper: Build a success FUMAWSResponse from a JSON string
// ---------------------------------------------------------------------------
static FUMAWSResponse MakeJsonStringResponse(const FString& RequestId, const FString& JsonString)
{
    FUMAWSResponse Response;
    Response.Id = RequestId;
    TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
    ResultObj->SetStringField(TEXT("data"), JsonString);
    Response.Result = ResultObj;
    return Response;
}

// ---------------------------------------------------------------------------
// Helper: Extract string param from message, returns false + error response if missing
// ---------------------------------------------------------------------------
static bool GetStringParam(const FUMAWSMessage& Message, const FString& ParamName,
    FString& OutValue, FUMAWSResponse& OutErrorResponse)
{
    if (!Message.Params.IsValid() || !Message.Params->TryGetStringField(ParamName, OutValue))
    {
        OutErrorResponse = MakeErrorResponse(Message.Id, 3001,
            FString::Printf(TEXT("Missing required parameter: %s"), *ParamName));
        return false;
    }
    return true;
}

// ---------------------------------------------------------------------------
// Handler registration helpers
// ---------------------------------------------------------------------------

static void RegisterBlueprintSerializeHandler(FUMAMessageHandler& Handler)
{
    // blueprint.serialize - Serialize entire Blueprint to JSON AST
    Handler.RegisterHandler(TEXT("blueprint.serialize"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FString BlueprintPath;
            FUMAWSResponse ErrorResp;
            if (!GetStringParam(Message, TEXT("blueprintPath"), BlueprintPath, ErrorResp))
            {
                return ErrorResp;
            }

            // Optional: serialize only a specific graph
            FString GraphName;
            FString ResultJson;
            if (Message.Params->TryGetStringField(TEXT("graphName"), GraphName) && !GraphName.IsEmpty())
            {
                ResultJson = FUMABlueprintSerializer::SerializeBlueprintGraph(BlueprintPath, GraphName);
            }
            else
            {
                ResultJson = FUMABlueprintSerializer::SerializeBlueprint(BlueprintPath);
            }

            FUMAWSResponse Response;
            Response.Id = Message.Id;

            // Parse the JSON string back to an object so it's embedded properly
            TSharedPtr<FJsonObject> ParsedResult;
            TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(ResultJson);
            if (FJsonSerializer::Deserialize(Reader, ParsedResult) && ParsedResult.IsValid())
            {
                Response.Result = ParsedResult;
            }
            else
            {
                return MakeErrorResponse(Message.Id, 5000, TEXT("Internal serialization error"));
            }

            return Response;
        }));
}

static void RegisterBlueprintCreateNodeHandler(FUMAMessageHandler& Handler)
{
    // blueprint.createNode - Spawn a new node in a Blueprint graph
    Handler.RegisterHandler(TEXT("blueprint.createNode"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FString BlueprintPath, GraphName, NodeClass;
            FUMAWSResponse ErrorResp;

            if (!GetStringParam(Message, TEXT("blueprintPath"), BlueprintPath, ErrorResp)) return ErrorResp;
            if (!GetStringParam(Message, TEXT("graphName"), GraphName, ErrorResp)) return ErrorResp;
            if (!GetStringParam(Message, TEXT("nodeClass"), NodeClass, ErrorResp)) return ErrorResp;

            // Optional params
            FString FunctionOwnerClass, FunctionName;
            if (Message.Params.IsValid())
            {
                Message.Params->TryGetStringField(TEXT("functionOwnerClass"), FunctionOwnerClass);
                Message.Params->TryGetStringField(TEXT("functionName"), FunctionName);
            }

            int32 PosX = 0, PosY = 0;
            if (Message.Params.IsValid())
            {
                double TempPosX = 0, TempPosY = 0;
                if (Message.Params->TryGetNumberField(TEXT("posX"), TempPosX))
                {
                    PosX = static_cast<int32>(TempPosX);
                }
                if (Message.Params->TryGetNumberField(TEXT("posY"), TempPosY))
                {
                    PosY = static_cast<int32>(TempPosY);
                }
            }

            FUMANodeSpawnResult SpawnResult = FUMABlueprintManipulator::SpawnNode(
                BlueprintPath, GraphName, NodeClass, FunctionOwnerClass, FunctionName, PosX, PosY);

            FUMAWSResponse Response;
            Response.Id = Message.Id;

            if (SpawnResult.bSuccess)
            {
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetBoolField(TEXT("success"), true);
                ResultObj->SetStringField(TEXT("nodeId"), SpawnResult.NodeId);
                Response.Result = ResultObj;
            }
            else
            {
                return MakeErrorResponse(Message.Id, 4001, SpawnResult.ErrorMessage);
            }

            return Response;
        }));
}

static void RegisterBlueprintConnectPinsHandler(FUMAMessageHandler& Handler)
{
    // blueprint.connectPins - Connect two pins via TryCreateConnection
    Handler.RegisterHandler(TEXT("blueprint.connectPins"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FString BlueprintPath, SourcePinId, TargetPinId;
            FUMAWSResponse ErrorResp;

            if (!GetStringParam(Message, TEXT("blueprintPath"), BlueprintPath, ErrorResp)) return ErrorResp;
            if (!GetStringParam(Message, TEXT("sourcePinId"), SourcePinId, ErrorResp)) return ErrorResp;
            if (!GetStringParam(Message, TEXT("targetPinId"), TargetPinId, ErrorResp)) return ErrorResp;

            FUMAPinConnectResult ConnectResult = FUMABlueprintManipulator::ConnectPins(
                BlueprintPath, SourcePinId, TargetPinId);

            FUMAWSResponse Response;
            Response.Id = Message.Id;

            if (ConnectResult.bSuccess)
            {
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetBoolField(TEXT("success"), true);
                if (!ConnectResult.DiagnosticInfo.IsEmpty())
                {
                    ResultObj->SetStringField(TEXT("info"), ConnectResult.DiagnosticInfo);
                }
                Response.Result = ResultObj;
            }
            else
            {
                return MakeErrorResponse(Message.Id, 4002, ConnectResult.ErrorMessage);
            }

            return Response;
        }));
}

static void RegisterBlueprintDeleteNodeHandler(FUMAMessageHandler& Handler)
{
    // blueprint.deleteNode - Remove a node from a Blueprint by GUID
    Handler.RegisterHandler(TEXT("blueprint.deleteNode"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FString BlueprintPath, NodeId;
            FUMAWSResponse ErrorResp;

            if (!GetStringParam(Message, TEXT("blueprintPath"), BlueprintPath, ErrorResp)) return ErrorResp;
            if (!GetStringParam(Message, TEXT("nodeId"), NodeId, ErrorResp)) return ErrorResp;

            FUMAOperationResult DeleteResult = FUMABlueprintManipulator::DeleteNode(BlueprintPath, NodeId);

            FUMAWSResponse Response;
            Response.Id = Message.Id;

            if (DeleteResult.bSuccess)
            {
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetBoolField(TEXT("success"), true);
                Response.Result = ResultObj;
            }
            else
            {
                return MakeErrorResponse(Message.Id, 4003, DeleteResult.ErrorMessage);
            }

            return Response;
        }));
}

static void RegisterBlueprintModifyPropertyHandler(FUMAMessageHandler& Handler)
{
    // blueprint.modifyProperty - Set a property/pin default value on a node
    Handler.RegisterHandler(TEXT("blueprint.modifyProperty"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FString BlueprintPath, NodeId, PropertyName, PropertyValue;
            FUMAWSResponse ErrorResp;

            if (!GetStringParam(Message, TEXT("blueprintPath"), BlueprintPath, ErrorResp)) return ErrorResp;
            if (!GetStringParam(Message, TEXT("nodeId"), NodeId, ErrorResp)) return ErrorResp;
            if (!GetStringParam(Message, TEXT("propertyName"), PropertyName, ErrorResp)) return ErrorResp;
            if (!GetStringParam(Message, TEXT("propertyValue"), PropertyValue, ErrorResp)) return ErrorResp;

            FUMAOperationResult ModifyResult = FUMABlueprintManipulator::ModifyNodeProperty(
                BlueprintPath, NodeId, PropertyName, PropertyValue);

            FUMAWSResponse Response;
            Response.Id = Message.Id;

            if (ModifyResult.bSuccess)
            {
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetBoolField(TEXT("success"), true);
                Response.Result = ResultObj;
            }
            else
            {
                return MakeErrorResponse(Message.Id, 4004, ModifyResult.ErrorMessage);
            }

            return Response;
        }));
}

// ---------------------------------------------------------------------------
// Compilation handlers
// ---------------------------------------------------------------------------

static void RegisterCompilationTriggerHandler(FUMAMessageHandler& Handler)
{
    // compilation.trigger - Trigger a Live Coding compile
    Handler.RegisterHandler(TEXT("compilation.trigger"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            if (!GLiveCodingController.IsValid())
            {
                return MakeErrorResponse(Message.Id, 5001, TEXT("Live Coding controller not initialized"));
            }

            if (!GLiveCodingController->IsAvailable())
            {
                return MakeErrorResponse(Message.Id, 5002, TEXT("Live Coding is not available on this platform"));
            }

            if (!GLiveCodingController->IsEnabled())
            {
                return MakeErrorResponse(Message.Id, 5003, TEXT("Live Coding is not enabled for this session"));
            }

            if (GLiveCodingController->IsCompiling())
            {
                return MakeErrorResponse(Message.Id, 5004, TEXT("A compile is already in progress"));
            }

            bool bStarted = GLiveCodingController->TriggerCompile();

            FUMAWSResponse Response;
            Response.Id = Message.Id;
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetBoolField(TEXT("triggered"), bStarted);
            ResultObj->SetStringField(TEXT("status"), GLiveCodingController->GetStatusString());
            Response.Result = ResultObj;
            return Response;
        }));
}

static void RegisterCompilationGetStatusHandler(FUMAMessageHandler& Handler)
{
    // compilation.getStatus - Get current compilation status
    Handler.RegisterHandler(TEXT("compilation.getStatus"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            if (!GLiveCodingController.IsValid())
            {
                return MakeErrorResponse(Message.Id, 5001, TEXT("Live Coding controller not initialized"));
            }

            FUMAWSResponse Response;
            Response.Id = Message.Id;
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetBoolField(TEXT("available"), GLiveCodingController->IsAvailable());
            ResultObj->SetBoolField(TEXT("enabled"), GLiveCodingController->IsEnabled());
            ResultObj->SetBoolField(TEXT("compiling"), GLiveCodingController->IsCompiling());
            ResultObj->SetStringField(TEXT("status"), GLiveCodingController->GetStatusString());

            // Include last result summary
            FUMACompileResult LastResult = GLiveCodingController->GetLastResult();
            TSharedPtr<FJsonObject> LastResultObj = MakeShared<FJsonObject>();
            LastResultObj->SetBoolField(TEXT("success"), LastResult.bSuccess);
            LastResultObj->SetNumberField(TEXT("errorCount"), LastResult.ErrorCount);
            LastResultObj->SetNumberField(TEXT("warningCount"), LastResult.WarningCount);
            LastResultObj->SetNumberField(TEXT("durationSeconds"), LastResult.DurationSeconds);
            ResultObj->SetObjectField(TEXT("lastResult"), LastResultObj);

            Response.Result = ResultObj;
            return Response;
        }));
}

static void RegisterCompilationGetErrorsHandler(FUMAMessageHandler& Handler)
{
    // compilation.getErrors - Parse compile output and return structured errors
    Handler.RegisterHandler(TEXT("compilation.getErrors"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            // Accept optional "output" parameter for parsing arbitrary compile output
            FString CompileOutput;
            if (Message.Params.IsValid())
            {
                Message.Params->TryGetStringField(TEXT("output"), CompileOutput);
            }

            FUMAWSResponse Response;
            Response.Id = Message.Id;
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();

            if (!CompileOutput.IsEmpty())
            {
                // Parse the provided output
                TArray<FUMACompileError> Errors = FUMACompileLogParser::ParseOutput(CompileOutput);

                int32 ErrorCount = 0;
                int32 WarningCount = 0;
                FUMACompileLogParser::GetCounts(Errors, ErrorCount, WarningCount);

                ResultObj->SetNumberField(TEXT("errorCount"), ErrorCount);
                ResultObj->SetNumberField(TEXT("warningCount"), WarningCount);
                ResultObj->SetStringField(TEXT("errors"), FUMACompileLogParser::ErrorsToJson(Errors));
            }
            else if (GLiveCodingController.IsValid())
            {
                // Return errors from the last compile result
                FUMACompileResult LastResult = GLiveCodingController->GetLastResult();
                ResultObj->SetNumberField(TEXT("errorCount"), LastResult.ErrorCount);
                ResultObj->SetNumberField(TEXT("warningCount"), LastResult.WarningCount);
                ResultObj->SetStringField(TEXT("errors"), FUMACompileLogParser::ErrorsToJson(LastResult.Errors));
            }
            else
            {
                ResultObj->SetNumberField(TEXT("errorCount"), 0);
                ResultObj->SetNumberField(TEXT("warningCount"), 0);
                ResultObj->SetStringField(TEXT("errors"), TEXT("[]"));
            }

            Response.Result = ResultObj;
            return Response;
        }));
}

// ---------------------------------------------------------------------------
// Module startup / shutdown
// ---------------------------------------------------------------------------

void FUnrealMasterAgentModule::StartupModule()
{
    UE_LOG(LogTemp, Log, TEXT("[UMA] UnrealMasterAgent module starting up"));

    // Initialize message handler
    GMessageHandler = MakeUnique<FUMAMessageHandler>();

    // Register built-in handlers
    GMessageHandler->RegisterHandler(TEXT("editor.ping"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FUMAWSResponse Response;
            Response.Id = Message.Id;
            TSharedPtr<FJsonObject> ResultObj = MakeShareable(new FJsonObject());
            ResultObj->SetStringField(TEXT("status"), TEXT("pong"));
            Response.Result = ResultObj;
            return Response;
        }));

    // Register Blueprint handlers
    RegisterBlueprintSerializeHandler(*GMessageHandler);
    RegisterBlueprintCreateNodeHandler(*GMessageHandler);
    RegisterBlueprintConnectPinsHandler(*GMessageHandler);
    RegisterBlueprintDeleteNodeHandler(*GMessageHandler);
    RegisterBlueprintModifyPropertyHandler(*GMessageHandler);

    // Initialize Live Coding controller and register compilation handlers
    GLiveCodingController = MakeUnique<FUMALiveCodingController>();
    RegisterCompilationTriggerHandler(*GMessageHandler);
    RegisterCompilationGetStatusHandler(*GMessageHandler);
    RegisterCompilationGetErrorsHandler(*GMessageHandler);

    UE_LOG(LogTemp, Log, TEXT("[UMA] Live Coding controller initialized (available=%s, enabled=%s)"),
        GLiveCodingController->IsAvailable() ? TEXT("true") : TEXT("false"),
        GLiveCodingController->IsEnabled() ? TEXT("true") : TEXT("false"));

    // Register editor query handlers
    GMessageHandler->RegisterHandler(TEXT("editor.getLevelInfo"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FString Result = FUMAEditorQueries::GetLevelInfo();

            FUMAWSResponse Response;
            Response.Id = Message.Id;

            TSharedPtr<FJsonObject> ResultObj;
            TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Result);
            if (FJsonSerializer::Deserialize(Reader, ResultObj) && ResultObj.IsValid())
            {
                Response.Result = ResultObj;
            }
            else
            {
                return MakeErrorResponse(Message.Id, 5000, TEXT("Internal serialization error"));
            }

            return Response;
        }));

    GMessageHandler->RegisterHandler(TEXT("editor.listActors"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FString ClassNameFilter;
            FString TagFilter;
            if (Message.Params.IsValid())
            {
                Message.Params->TryGetStringField(TEXT("className"), ClassNameFilter);
                Message.Params->TryGetStringField(TEXT("tag"), TagFilter);
            }

            FString Result = FUMAEditorQueries::ListActors(ClassNameFilter, TagFilter);

            FUMAWSResponse Response;
            Response.Id = Message.Id;
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetStringField(TEXT("data"), Result);
            Response.Result = ResultObj;

            return Response;
        }));

    GMessageHandler->RegisterHandler(TEXT("editor.getAssetInfo"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            FString AssetPath;
            FUMAWSResponse ErrorResp;
            if (!GetStringParam(Message, TEXT("assetPath"), AssetPath, ErrorResp))
            {
                return ErrorResp;
            }

            FString Result = FUMAEditorQueries::GetAssetInfo(AssetPath);

            FUMAWSResponse Response;
            Response.Id = Message.Id;

            TSharedPtr<FJsonObject> ResultObj;
            TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Result);
            if (FJsonSerializer::Deserialize(Reader, ResultObj) && ResultObj.IsValid())
            {
                Response.Result = ResultObj;
            }
            else
            {
                return MakeErrorResponse(Message.Id, 5000, TEXT("Internal serialization error"));
            }

            return Response;
        }));

    // Initialize approval gate and register safety handler
    GApprovalGate = MakeUnique<FUMAApprovalGate>();

    GMessageHandler->RegisterHandler(TEXT("safety.requestApproval"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            if (!GApprovalGate.IsValid())
            {
                return MakeErrorResponse(Message.Id, 6000, TEXT("ApprovalGate not initialized"));
            }

            FString OperationId, ToolName, Reason, FilePath;
            if (!Message.Params.IsValid()
                || !Message.Params->TryGetStringField(TEXT("operationId"), OperationId)
                || !Message.Params->TryGetStringField(TEXT("toolName"), ToolName)
                || !Message.Params->TryGetStringField(TEXT("reason"), Reason))
            {
                return MakeErrorResponse(Message.Id, 3001, TEXT("Missing required approval params"));
            }
            Message.Params->TryGetStringField(TEXT("filePath"), FilePath);

            FUMAApprovalRequest Request;
            Request.OperationId = OperationId;
            Request.ToolName    = ToolName;
            Request.Reason      = Reason;
            Request.FilePath    = FilePath;

            bool bApproved = false;
            GApprovalGate->ShowApprovalDialog(Request,
                [&bApproved](bool bResult) { bApproved = bResult; });

            FUMAWSResponse Response;
            Response.Id = Message.Id;
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetBoolField(TEXT("approved"), bApproved);
            Response.Result = ResultObj;
            return Response;
        }));

    // Initialize WebSocket client
    GWebSocketClient = MakeUnique<FUMAWebSocketClient>();
    GWebSocketClient->OnMessageReceived.BindLambda([](const FUMAWSMessage& Message)
    {
        if (GMessageHandler.IsValid())
        {
            FUMAWSResponse Response = GMessageHandler->HandleMessage(Message);
            if (GWebSocketClient.IsValid())
            {
                GWebSocketClient->SendResponse(Response);
            }
        }
    });

    // Connect to MCP Bridge Server
    const FString WsPort = FPlatformMisc::GetEnvironmentVariable(TEXT("UE_WS_PORT"));
    const FString Port = WsPort.IsEmpty() ? TEXT("9877") : WsPort;
    const FString Url = FString::Printf(TEXT("ws://localhost:%s"), *Port);

    UE_LOG(LogTemp, Log, TEXT("[UMA] Connecting to MCP Bridge Server at %s"), *Url);
    GWebSocketClient->Connect(Url);

    // Register chat.receiveResponse handler
    GMessageHandler->RegisterHandler(TEXT("chat.receiveResponse"),
        FOnUMAHandleMethod::CreateLambda([](const FUMAWSMessage& Message) -> FUMAWSResponse
        {
            check(IsInGameThread());

            FString ResponseText;
            if (!Message.Params.IsValid()
                || !Message.Params->TryGetStringField(TEXT("responseText"), ResponseText))
            {
                return MakeErrorResponse(Message.Id, 3001, TEXT("Missing responseText param"));
            }

            if (GEditor)
            {
                UUMAEditorSubsystem* Subsystem =
                    GEditor->GetEditorSubsystem<UUMAEditorSubsystem>();
                if (Subsystem)
                {
                    Subsystem->AddChatMessage(ResponseText, false /* bIsFromUser */);
                }
            }

            FUMAWSResponse Response;
            Response.Id = Message.Id;
            TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
            ResultObj->SetBoolField(TEXT("received"), true);
            Response.Result = ResultObj;
            return Response;
        }));

    // Initialize editor subsystem chat tab
    if (GEditor)
    {
        UUMAEditorSubsystem* Subsystem =
            GEditor->GetEditorSubsystem<UUMAEditorSubsystem>();
        if (Subsystem)
        {
            Subsystem->RegisterChatTab();
            UE_LOG(LogTemp, Log, TEXT("[UMA] Chat panel registered"));
        }
    }
}

void FUnrealMasterAgentModule::ShutdownModule()
{
    UE_LOG(LogTemp, Log, TEXT("[UMA] UnrealMasterAgent module shutting down"));

    if (GWebSocketClient.IsValid())
    {
        GWebSocketClient->Disconnect();
        GWebSocketClient.Reset();
    }

    GLiveCodingController.Reset();
    GApprovalGate.Reset();
    GMessageHandler.Reset();
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FUnrealMasterAgentModule, UnrealMasterAgent)
