"""
asset.getReferences script.
Returns all package referencers for an asset in the Unreal project.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath")

    validate_path(asset_path)

    if not unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        return make_error(5102, f"Asset not found: {asset_path}")

    referencers = unreal.EditorAssetLibrary.find_package_referencers_for_asset(
        asset_path, load_assets_to_confirm=False
    )

    return make_result(
        assetPath=asset_path,
        referencers=list(referencers) if referencers else [],
        count=len(referencers) if referencers else 0,
    )
