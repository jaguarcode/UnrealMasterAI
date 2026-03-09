using UnrealBuildTool;

public class UnrealMasterAgent : ModuleRules
{
    public UnrealMasterAgent(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "WebSockets",
            "Json",
            "JsonUtilities"
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "UnrealEd",
            "BlueprintGraph",
            "KismetCompiler",
            "Slate",
            "SlateCore",
            "EditorSubsystem",
            "Networking",
            "Sockets",
            "WorkspaceMenuStructure",
            "LiveCoding",
            "InputCore",
            "AssetRegistry",
            "PythonScriptPlugin"
        });
    }
}
