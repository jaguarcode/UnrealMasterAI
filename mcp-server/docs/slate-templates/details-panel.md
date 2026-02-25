# Details Panel Customization Template

## Usage
Customize the property editor details panel for UObject-derived classes using IDetailCustomization. This allows you to reorganize, hide, or add custom widgets to the properties shown when an object is selected in the editor.

## Code
```cpp
#pragma once
#include "IDetailCustomization.h"
#include "DetailLayoutBuilder.h"
#include "DetailCategoryBuilder.h"
#include "DetailWidgetRow.h"

class FMyActorDetails : public IDetailCustomization
{
public:
    static TSharedRef<IDetailCustomization> MakeInstance()
    {
        return MakeShareable(new FMyActorDetails);
    }

    virtual void CustomizeDetails(IDetailLayoutBuilder& DetailBuilder) override;
};

// Implementation
void FMyActorDetails::CustomizeDetails(IDetailLayoutBuilder& DetailBuilder)
{
    // Get the category to customize
    IDetailCategoryBuilder& Category = DetailBuilder.EditCategory(
        TEXT("MyCategory"),
        FText::FromString(TEXT("My Custom Category")),
        ECategoryPriority::Important
    );

    // Add a custom row
    Category.AddCustomRow(FText::FromString(TEXT("Custom Row")))
    .NameContent()
    [
        SNew(STextBlock)
        .Text(FText::FromString(TEXT("Custom Label")))
        .Font(IDetailLayoutBuilder::GetDetailFont())
    ]
    .ValueContent()
    .MaxDesiredWidth(250.0f)
    [
        SNew(SHorizontalBox)
        + SHorizontalBox::Slot()
        .AutoWidth()
        [
            SNew(SButton)
            .Text(FText::FromString(TEXT("Do Something")))
            .OnClicked_Lambda([]()
            {
                // Handle button click
                return FReply::Handled();
            })
        ]
    ];

    // Hide a property
    TSharedRef<IPropertyHandle> HiddenProp =
        DetailBuilder.GetProperty(GET_MEMBER_NAME_CHECKED(AMyActor, HiddenProperty));
    DetailBuilder.HideProperty(HiddenProp);

    // Get objects being customized
    TArray<TWeakObjectPtr<UObject>> Objects;
    DetailBuilder.GetObjectsBeingCustomized(Objects);
}

// Registration (typically in a module's StartupModule)
// FPropertyEditorModule& PropertyModule = FModuleManager::LoadModuleChecked<FPropertyEditorModule>("PropertyEditor");
// PropertyModule.RegisterCustomClassLayout(
//     AMyActor::StaticClass()->GetFName(),
//     FOnGetDetailCustomizationInstance::CreateStatic(&FMyActorDetails::MakeInstance)
// );
```

## Keywords
details, panel, property, editor, customization, IDetailCustomization, DetailLayoutBuilder, properties, inspector
