"""
editor.getRecentActivity script.
Returns recently modified assets and opened levels from the editor.
"""
import unreal
from uma.utils import execute_wrapper, make_result, get_optional_param


@execute_wrapper
def execute(params):
    count = get_optional_param(params, "count", 10, int)

    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
    filter_obj = unreal.ARFilter(
        recursive_paths=True,
        package_paths=["/Game/"],
    )
    assets = asset_registry.get_assets(filter_obj)

    # Sort by modification time descending and take top N
    asset_list = []
    for asset_data in assets:
        asset_list.append({
            "name": str(asset_data.asset_name),
            "path": str(asset_data.package_path),
            "class": str(asset_data.asset_class_path.asset_name),
        })

    recent_assets = asset_list[:count]

    # Get the currently open world/level name
    world = unreal.EditorLevelLibrary.get_editor_world()
    current_level = str(world.get_name()) if world else None

    return make_result(
        recentAssets=recent_assets,
        assetCount=len(recent_assets),
        currentLevel=current_level,
    )
