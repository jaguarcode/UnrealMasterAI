"""
asset.create script.
Creates a new asset in the Unreal project using AssetTools.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    asset_name = get_required_param(params, "assetName")
    asset_path = get_required_param(params, "assetPath")
    asset_type = get_required_param(params, "assetType")
    parent_class = get_optional_param(params, "parentClass")

    validate_path(asset_path)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()

    # Resolve the factory based on asset_type
    factory = None
    for f in unreal.AssetToolsHelpers.get_asset_tools().list_asset_factories():
        if f.__class__.__name__ == asset_type or asset_type in str(f.__class__.__name__):
            factory = f
            break

    if factory is None:
        return make_error(5102, f"Unknown asset type or factory not found: {asset_type}")

    new_asset = asset_tools.create_asset(asset_name, asset_path, None, factory)

    if new_asset is None:
        return make_error(5101, f"Failed to create asset '{asset_name}' at '{asset_path}'")

    return make_result(
        assetName=asset_name,
        assetPath=asset_path,
        assetType=asset_type,
        objectPath=str(new_asset.get_path_name()),
    )
