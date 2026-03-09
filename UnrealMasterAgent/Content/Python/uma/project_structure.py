"""
project_structure.py - Returns the project content directory tree with asset type counts.
Uses EditorAssetLibrary.list_assets() to build a directory tree.
"""
import unreal
import json
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    path = get_optional_param(params, 'path', default='/Game/', param_type=str)

    # Validate path
    if '..' in path:
        return make_error(5102, f'Path traversal not allowed: {path}')

    asset_lib = unreal.EditorAssetLibrary

    # List all assets under the given path (recursive)
    all_assets = asset_lib.list_assets(path, recursive=True, include_folder=False)

    # Build directory tree: { folder_path: { asset_class: count } }
    tree = {}
    for asset_path in all_assets:
        # Asset paths look like /Game/Blueprints/MyBP.MyBP
        folder = '/'.join(asset_path.split('/')[:-1])
        asset_data = asset_lib.find_asset_data(asset_path)
        asset_class = str(asset_data.asset_class_path.asset_name) if asset_data else 'Unknown'

        if folder not in tree:
            tree[folder] = {}
        tree[folder][asset_class] = tree[folder].get(asset_class, 0) + 1

    # Also list subdirectories
    all_folders = asset_lib.list_assets(path, recursive=True, include_folder=True)
    folders = [p for p in all_folders if not '.' in p.split('/')[-1]]

    return make_result(
        root=path,
        total_assets=len(all_assets),
        folders=sorted(set(tree.keys()) | set(folders)),
        tree=tree,
    )
