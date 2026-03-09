"""
content_list.py - Lists assets in the Unreal Content Browser at a given path.

Params:
  path (str, optional): Content path to list. Defaults to '/Game/'.
  assetType (str, optional): Filter by asset class name (e.g., 'Blueprint').
  recursive (bool, optional): Whether to search recursively. Defaults to True.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    path = get_optional_param(params, "path", default="/Game/", param_type=str)
    asset_type = get_optional_param(params, "assetType", default=None, param_type=str)
    recursive = get_optional_param(params, "recursive", default=True, param_type=bool)

    asset_paths = unreal.EditorAssetLibrary.list_assets(path, recursive=recursive, include_folder=False)

    assets = []
    for asset_path in asset_paths:
        if asset_type:
            asset_data = unreal.EditorAssetLibrary.find_asset_data(asset_path)
            if asset_data and asset_type.lower() not in str(asset_data.asset_class_path).lower():
                continue
        assets.append(str(asset_path))

    return make_result(assets=assets, count=len(assets), path=path)
