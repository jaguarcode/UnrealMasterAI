"""
Workflow: Create Interactable
Error codes: 9030-9039
Creates a Blueprint Actor with overlap/interaction component.
"""

import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper(error_base=9030)
def execute(args: dict) -> dict:
    interactable_name = get_required_param(args, 'interactableName')
    base_path = get_required_param(args, 'basePath')
    interaction_type = get_optional_param(args, 'interactionType', 'generic')

    created_assets = []

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    bp_factory = unreal.BlueprintFactory()
    bp_factory.set_editor_property('parent_class', unreal.Actor)

    interactable_bp = asset_tools.create_asset(
        interactable_name,
        base_path,
        unreal.Blueprint,
        bp_factory
    )
    if interactable_bp is None:
        return make_error(9031, f"Failed to create Interactable Blueprint '{interactable_name}' at '{base_path}'")

    created_assets.append(f"{base_path}/{interactable_name}")

    # Save assets
    unreal.EditorAssetLibrary.save_directory(base_path)

    return make_result({
        'interactableName': interactable_name,
        'basePath': base_path,
        'interactionType': interaction_type,
        'createdAssets': created_assets,
    })
