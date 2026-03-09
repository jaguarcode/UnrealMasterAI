"""
asset.rename script.
Renames an asset within its current directory.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath")
    new_name = get_required_param(params, "newName")

    validate_path(asset_path)

    # Build new path: same directory, new name
    parts = asset_path.rsplit("/", 1)
    if len(parts) < 2:
        return make_error(5102, f"Invalid asset path format: {asset_path}")

    parent_dir = parts[0]
    new_path = f"{parent_dir}/{new_name}"

    success = unreal.EditorAssetLibrary.rename_asset(asset_path, new_path)

    if not success:
        return make_error(5101, f"Failed to rename asset '{asset_path}' to '{new_path}'")

    return make_result(
        oldPath=asset_path,
        newPath=new_path,
        newName=new_name,
    )
