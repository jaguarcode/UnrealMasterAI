# Toolbar Extension Template

## Usage
Extend the Unreal Editor toolbar with custom buttons and menus using FExtender and FToolBarBuilder. This pattern is commonly used in editor plugins to add quick-access actions to the main toolbar or section toolbars.

## Code
```cpp
#pragma once
#include "Framework/MultiBox/MultiBoxExtender.h"
#include "ToolMenus.h"

class FMyToolbarExtension
{
public:
    static void Register()
    {
        UToolMenus* ToolMenus = UToolMenus::Get();

        // Extend the main level editor toolbar
        UToolMenu* ToolbarMenu = ToolMenus->ExtendMenu(
            "LevelEditor.LevelEditorToolBar.PlayToolBar");

        FToolMenuSection& Section = ToolbarMenu->AddSection(
            "MyPluginTools",
            FText::FromString(TEXT("My Plugin"))
        );

        // Add a toolbar button
        Section.AddEntry(FToolMenuEntry::InitToolBarButton(
            "MyToolbarButton",
            FUIAction(
                FExecuteAction::CreateStatic(&FMyToolbarExtension::OnButtonClicked),
                FCanExecuteAction::CreateStatic(&FMyToolbarExtension::CanExecute)
            ),
            FText::FromString(TEXT("My Action")),
            FText::FromString(TEXT("Execute my custom action")),
            FSlateIcon(FAppStyle::GetAppStyleSetName(), "Icons.Plus")
        ));

        // Add a combo button with dropdown menu
        Section.AddEntry(FToolMenuEntry::InitComboButton(
            "MyComboButton",
            FUIAction(
                FExecuteAction::CreateStatic(&FMyToolbarExtension::OnButtonClicked)
            ),
            FOnGetContent::CreateStatic(&FMyToolbarExtension::GenerateMenu),
            FText::FromString(TEXT("Options")),
            FText::FromString(TEXT("Additional options")),
            FSlateIcon(FAppStyle::GetAppStyleSetName(), "Icons.Settings")
        ));
    }

    static void OnButtonClicked()
    {
        UE_LOG(LogTemp, Log, TEXT("Toolbar button clicked!"));
    }

    static bool CanExecute()
    {
        return GEditor != nullptr;
    }

    static TSharedRef<SWidget> GenerateMenu()
    {
        FMenuBuilder MenuBuilder(true, nullptr);

        MenuBuilder.AddMenuEntry(
            FText::FromString(TEXT("Option A")),
            FText::FromString(TEXT("First option")),
            FSlateIcon(),
            FUIAction(FExecuteAction::CreateLambda([]()
            {
                UE_LOG(LogTemp, Log, TEXT("Option A selected"));
            }))
        );

        MenuBuilder.AddMenuEntry(
            FText::FromString(TEXT("Option B")),
            FText::FromString(TEXT("Second option")),
            FSlateIcon(),
            FUIAction(FExecuteAction::CreateLambda([]()
            {
                UE_LOG(LogTemp, Log, TEXT("Option B selected"));
            }))
        );

        return MenuBuilder.MakeWidget();
    }

    static void Unregister()
    {
        UToolMenus::UnregisterOwner("MyPlugin");
    }
};
```

## Keywords
toolbar, button, extension, FExtender, FToolBarBuilder, menu, ToolMenus, action, plugin, UToolMenus
