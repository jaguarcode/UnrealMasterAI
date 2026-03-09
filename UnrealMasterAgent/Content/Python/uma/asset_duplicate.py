"""
asset.duplicate script.
Duplicates an existing asset to a new destination path.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    source_path = get_required_param(params, "sourcePath")
    destination_path = get_required_param(params, "destinationPath")
    new_name = get_required_param(params, "newName")

    validate_path(source_path)
    validate_path(destination_path)

    success = unreal.EditorAssetLibrary.duplicate_asset(
        source_path, f"{destination_path}/{new_name}"
    )

    if not success:
        return make_error(
            5101,
            f"Failed to duplicate asset '{source_path}' to '{destination_path}/{new_name}'",
        )

    return make_result(
        sourcePath=source_path,
        destinationPath=destination_path,
        newName=new_name,
        newPath=f"{destination_path}/{new_name}",
    )
