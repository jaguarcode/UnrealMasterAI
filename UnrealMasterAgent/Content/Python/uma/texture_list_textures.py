"""
texture.list_textures script.
List and filter texture assets using the AssetRegistry.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    directory = get_optional_param(params, "directory", "/Game")
    filter_str = get_optional_param(params, "filter", "")

    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

    ar_filter = unreal.ARFilter(
        class_names=["Texture2D"],
        package_paths=[directory],
        recursive_paths=True,
    )

    assets = asset_registry.get_assets(ar_filter)

    texture_list = []
    for asset_data in assets:
        asset_name = str(asset_data.asset_name)
        if filter_str and filter_str.lower() not in asset_name.lower():
            continue
        texture_list.append({
            "assetName": asset_name,
            "packagePath": str(asset_data.package_path),
            "objectPath": str(asset_data.object_path),
        })

    return make_result(
        directory=directory,
        filter=filter_str,
        count=len(texture_list),
        textures=texture_list,
    )
