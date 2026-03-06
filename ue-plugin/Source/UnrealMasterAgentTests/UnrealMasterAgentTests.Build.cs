using UnrealBuildTool;

public class UnrealMasterAgentTests : ModuleRules
{
    public UnrealMasterAgentTests(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "Json",
            "JsonUtilities",
            "UnrealMasterAgent",
            "UnrealEd",
            "Slate",
            "SlateCore",
            "EditorSubsystem"
        });
    }
}
