"""
asset.export script.
Exports an Unreal asset to an external file path.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, validate_path


@execute_wrapper
def execute(params):
    asset_path = get_required_param(params, "assetPath")
    output_path = get_required_param(params, "outputPath")

    validate_path(asset_path)

    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    if asset is None:
        return make_error(5102, f"Asset not found: {asset_path}")

    task = unreal.AssetExportTask()
    task.object = asset
    task.filename = output_path
    task.automated = True
    task.replace_identical = True

    result = unreal.Exporter.run_asset_export_task(task)

    if not result:
        return make_error(5101, f"Failed to export '{asset_path}' to '{output_path}'")

    return make_result(
        assetPath=asset_path,
        outputPath=output_path,
        exported=True,
    )
