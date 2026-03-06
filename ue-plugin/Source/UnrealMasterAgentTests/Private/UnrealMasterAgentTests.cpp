// Copyright Unreal Master Team. All Rights Reserved.

#include "Modules/ModuleManager.h"

class FUnrealMasterAgentTestsModule : public IModuleInterface
{
public:
    virtual void StartupModule() override {}
    virtual void ShutdownModule() override {}
};

IMPLEMENT_MODULE(FUnrealMasterAgentTestsModule, UnrealMasterAgentTests)
