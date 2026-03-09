"""
Workflow: Create Character
Error codes: 9000-9009
Scaffolds a Character Blueprint with skeletal mesh component, animation BP, and input bindings.
"""

import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper(error_base=9000)
def execute(args: dict) -> dict:
    character_name = get_required_param(args, 'characterName')
    base_path = get_required_param(args, 'basePath')
    mesh_path = get_optional_param(args, 'meshPath', None)

    created_assets = []

    # Create Character Blueprint
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    char_factory = unreal.BlueprintFactory()
    char_factory.set_editor_property('parent_class', unreal.Character)

    char_bp = asset_tools.create_asset(
        character_name,
        base_path,
        unreal.Blueprint,
        char_factory
    )
    if char_bp is None:
        return make_error(9001, f"Failed to create Character Blueprint '{character_name}' at '{base_path}'")
    created_assets.append(f"{base_path}/{character_name}")

    # Optionally assign skeletal mesh
    if mesh_path:
        mesh_asset = unreal.load_asset(mesh_path)
        if mesh_asset and isinstance(mesh_asset, unreal.SkeletalMesh):
            cdo = unreal.get_default_object(char_bp.generated_class())
            mesh_comp = cdo.get_component_by_class(unreal.SkeletalMeshComponent)
            if mesh_comp:
                mesh_comp.set_skeletal_mesh_asset(mesh_asset)
            created_assets.append(f"Assigned mesh: {mesh_path}")

    # Create Animation Blueprint
    anim_bp_name = f"ABP_{character_name}"
    anim_factory = unreal.AnimBlueprintFactory()
    anim_factory.set_editor_property('target_skeleton', None)

    anim_bp = asset_tools.create_asset(
        anim_bp_name,
        base_path,
        unreal.AnimBlueprint,
        anim_factory
    )
    if anim_bp:
        created_assets.append(f"{base_path}/{anim_bp_name}")

    # Save created assets
    unreal.EditorAssetLibrary.save_directory(base_path)

    return make_result({
        'characterName': character_name,
        'basePath': base_path,
        'createdAssets': created_assets,
    })
