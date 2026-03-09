"""
asset.delete script.
Deletes an asset from the Unreal project.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath")
    force_delete = get_optional_param(params, "forceDelete", default=False, param_type=bool)

    validate_path(asset_path)

    success = unreal.EditorAssetLibrary.delete_asset(asset_path)

    if not success:
        return make_error(5101, f"Failed to delete asset '{asset_path}'")

    return make_result(
        assetPath=asset_path,
        deleted=True,
    )
