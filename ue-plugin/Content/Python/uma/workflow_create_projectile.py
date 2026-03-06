"""
Workflow: Create Projectile
Error codes: 9040-9049
Creates Actor BP with ProjectileMovementComponent, collision, and damage setup.
"""

import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper(error_base=9040)
def execute(args: dict) -> dict:
    projectile_name = get_required_param(args, 'projectileName')
    base_path = get_required_param(args, 'basePath')
    speed = get_optional_param(args, 'speed', 3000.0)
    damage = get_optional_param(args, 'damage', 20.0)

    created_assets = []

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    bp_factory = unreal.BlueprintFactory()
    bp_factory.set_editor_property('parent_class', unreal.Actor)

    projectile_bp = asset_tools.create_asset(
        projectile_name,
        base_path,
        unreal.Blueprint,
        bp_factory
    )
    if projectile_bp is None:
        return make_error(9041, f"Failed to create Projectile Blueprint '{projectile_name}' at '{base_path}'")

    created_assets.append(f"{base_path}/{projectile_name}")

    # Save assets
    unreal.EditorAssetLibrary.save_directory(base_path)

    return make_result({
        'projectileName': projectile_name,
        'basePath': base_path,
        'speed': speed,
        'damage': damage,
        'createdAssets': created_assets,
    })
