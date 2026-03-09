"""
asset.setMetadata script.
Sets a metadata tag on an asset in the Unreal project.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath")
    key = get_required_param(params, "key")
    value = get_required_param(params, "value")

    validate_path(asset_path)

    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    if asset is None:
        return make_error(5102, f"Asset not found: {asset_path}")

    unreal.EditorAssetLibrary.set_metadata_tag(asset, key, value)
    unreal.EditorAssetLibrary.save_asset(asset_path)

    return make_result(
        assetPath=asset_path,
        key=key,
        value=value,
        updated=True,
    )
