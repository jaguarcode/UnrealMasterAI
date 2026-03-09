"""
texture.import script.
Import a texture file into the project.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper
def execute(params):
    file_path = get_required_param(params, "filePath")
    dest_path = get_required_param(params, "destinationPath")
    asset_name = get_optional_param(params, "assetName", "")

    task = unreal.AssetImportTask()
    task.set_editor_property("filename", file_path)
    task.set_editor_property("destination_path", dest_path)
    task.set_editor_property("automated", True)
    task.set_editor_property("save", True)

    if asset_name:
        task.set_editor_property("destination_name", asset_name)

    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    paths = task.get_editor_property("imported_object_paths")
    if not paths:
        return make_error(8000, f"Failed to import texture from '{file_path}'")

    return make_result(
        importedPath=str(paths[0]),
        sourcePath=file_path,
    )
