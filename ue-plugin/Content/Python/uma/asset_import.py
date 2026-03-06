"""
asset.import script.
Imports an external file as an asset into the Unreal project.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    file_path = get_required_param(params, "filePath")
    destination_path = get_required_param(params, "destinationPath")
    asset_name = get_optional_param(params, "assetName")

    validate_path(destination_path)

    task = unreal.AssetImportTask()
    task.filename = file_path
    task.destination_path = destination_path
    task.automated = True
    task.save = True

    if asset_name:
        task.destination_name = asset_name

    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])

    imported = task.get_objects()
    if not imported:
        return make_error(5101, f"Failed to import '{file_path}' to '{destination_path}'")

    return make_result(
        filePath=file_path,
        destinationPath=destination_path,
        importedAssets=[str(obj.get_path_name()) for obj in imported],
    )
