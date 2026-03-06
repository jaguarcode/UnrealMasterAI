"""
content_validate.py - Runs asset validation checks on one or more content paths.

Params:
  paths (list of str, optional): List of asset paths to validate. If empty, validates all /Game/ assets.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    paths = get_optional_param(params, "paths", default=None, param_type=list)

    if not paths:
        paths = list(unreal.EditorAssetLibrary.list_assets("/Game/", recursive=True, include_folder=False))

    results = []
    errors = []

    for path in paths:
        path_str = str(path)
        try:
            validate_path(path_str)
        except ValueError as e:
            errors.append({"path": path_str, "issue": str(e)})
            continue

        asset_data = unreal.EditorAssetLibrary.find_asset_data(path_str)
        if not asset_data or not asset_data.is_valid():
            errors.append({"path": path_str, "issue": "Asset not found in registry"})
            continue

        # Check if asset can be loaded
        loaded = unreal.EditorAssetLibrary.load_asset(path_str)
        if not loaded:
            errors.append({"path": path_str, "issue": "Asset failed to load"})
            continue

        results.append({"path": path_str, "status": "valid"})

    return make_result(
        valid=results,
        invalid=errors,
        total=len(paths),
        valid_count=len(results),
        invalid_count=len(errors),
    )
