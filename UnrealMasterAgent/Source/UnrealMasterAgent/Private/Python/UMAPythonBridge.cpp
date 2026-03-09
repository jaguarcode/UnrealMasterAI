// Copyright Unreal Master Team. All Rights Reserved.

#include "Python/UMAPythonBridge.h"
#include "Dom/JsonObject.h"
#include "Dom/JsonValue.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "IPythonScriptPlugin.h"
#include "Misc/Base64.h"
#include "Misc/Paths.h"

bool FUMAPythonBridge::IsPythonAvailable()
{
    IPythonScriptPlugin* PythonPlugin =
        FModuleManager::GetModulePtr<IPythonScriptPlugin>("PythonScriptPlugin");
    return PythonPlugin != nullptr;
}

FString FUMAPythonBridge::GetScriptPath(const FString& ScriptName)
{
    FString ScriptPath = FPaths::Combine(
        FPaths::ProjectPluginsDir(),
        TEXT("UnrealMasterAgent"),
        TEXT("Content"),
        TEXT("Python"),
        TEXT("uma"),
        ScriptName + TEXT(".py")
    );
    return FPaths::ConvertRelativePathToFull(ScriptPath);
}

FUMAWSResponse FUMAPythonBridge::ExecutePython(
    const FString& ScriptName,
    const TSharedPtr<FJsonObject>& Params)
{
    FUMAWSResponse Response;

    IPythonScriptPlugin* PythonPlugin =
        FModuleManager::GetModulePtr<IPythonScriptPlugin>("PythonScriptPlugin");
    if (!PythonPlugin)
    {
        FUMAWSError Error;
        Error.Code = 5100;
        Error.Message = TEXT("Python scripting plugin not available. Enable PythonScriptPlugin in project settings.");
        Response.Error = Error;
        return Response;
    }

    FString ScriptPath = GetScriptPath(ScriptName);
    if (!FPaths::FileExists(ScriptPath))
    {
        FUMAWSError Error;
        Error.Code = 5101;
        Error.Message = FString::Printf(TEXT("Python script not found: %s"), *ScriptName);
        Response.Error = Error;
        return Response;
    }

    // Serialize params to condensed (single-line) JSON string
    FString ParamsJson;
    if (Params.IsValid())
    {
        TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> Writer =
            TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&ParamsJson);
        FJsonSerializer::Serialize(Params.ToSharedRef(), Writer);
    }
    else
    {
        ParamsJson = TEXT("{}");
    }

    // Compute Content/Python directory for sys.path so 'uma' package is importable
    FString PythonContentDir = FPaths::Combine(
        FPaths::ProjectPluginsDir(),
        TEXT("UnrealMasterAgent"),
        TEXT("Content"),
        TEXT("Python")
    );
    FPaths::NormalizeDirectoryName(PythonContentDir);
    PythonContentDir = FPaths::ConvertRelativePathToFull(PythonContentDir);

    // Encode params as base64 to prevent code injection via triple-quote sequences
    FString ParamsBase64 = FBase64::Encode(ParamsJson);

    // Build Python code that imports and executes the script
    // Params are passed as a base64-encoded string to avoid any injection via special characters
    FString PythonCode = FString::Printf(
        TEXT(
            "import sys, importlib.util, json, base64\n"
            "sys.path.insert(0, r'%s') if r'%s' not in sys.path else None\n"
            "spec = importlib.util.spec_from_file_location('uma_script', r'%s')\n"
            "mod = importlib.util.module_from_spec(spec)\n"
            "spec.loader.exec_module(mod)\n"
            "_uma_result = mod.execute(json.loads(base64.b64decode('%s').decode('utf-8')))\n"
            "print('UMA_RESULT:' + _uma_result)\n"
        ),
        *PythonContentDir,
        *PythonContentDir,
        *ScriptPath,
        *ParamsBase64
    );

    // Execute Python and capture output
    FPythonCommandEx PythonCommand;
    PythonCommand.Command = PythonCode;
    PythonCommand.ExecutionMode = EPythonCommandExecutionMode::ExecuteFile;
    PythonCommand.FileExecutionScope = EPythonFileExecutionScope::Public;

    bool bSuccess = PythonPlugin->ExecPythonCommandEx(PythonCommand);

    if (bSuccess)
    {
        // Extract result from log output
        FString ResultStr;
        for (const FPythonLogOutputEntry& Entry : PythonCommand.LogOutput)
        {
            if (Entry.Output.StartsWith(TEXT("UMA_RESULT:")))
            {
                ResultStr = Entry.Output.Mid(11); // Skip "UMA_RESULT:"
                break;
            }
        }

        if (!ResultStr.IsEmpty())
        {
            TSharedPtr<FJsonObject> ResultObj;
            TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(ResultStr);
            if (FJsonSerializer::Deserialize(Reader, ResultObj) && ResultObj.IsValid())
            {
                Response.Result = ResultObj;
            }
            else
            {
                // Return raw string as result
                TSharedPtr<FJsonObject> WrapperObj = MakeShared<FJsonObject>();
                WrapperObj->SetStringField(TEXT("rawResult"), ResultStr);
                Response.Result = WrapperObj;
            }
        }
        else
        {
            // No result captured - collect any error output
            FString ErrorOutput;
            for (const FPythonLogOutputEntry& Entry : PythonCommand.LogOutput)
            {
                if (Entry.Type == EPythonLogOutputType::Error ||
                    Entry.Type == EPythonLogOutputType::Warning)
                {
                    ErrorOutput += Entry.Output + TEXT("\n");
                }
            }

            if (!ErrorOutput.IsEmpty())
            {
                FUMAWSError Error;
                Error.Code = 5102;
                Error.Message = FString::Printf(TEXT("Python script '%s' produced no result. Output: %s"),
                    *ScriptName, *ErrorOutput);
                Response.Error = Error;
            }
            else
            {
                TSharedPtr<FJsonObject> ResultObj = MakeShared<FJsonObject>();
                ResultObj->SetBoolField(TEXT("success"), true);
                Response.Result = ResultObj;
            }
        }
    }
    else
    {
        FString ErrorOutput;
        for (const FPythonLogOutputEntry& Entry : PythonCommand.LogOutput)
        {
            ErrorOutput += Entry.Output + TEXT("\n");
        }

        FUMAWSError Error;
        Error.Code = 5101;
        Error.Message = FString::Printf(TEXT("Python script '%s' execution failed: %s"),
            *ScriptName, *ErrorOutput);
        Response.Error = Error;
    }

    return Response;
}
