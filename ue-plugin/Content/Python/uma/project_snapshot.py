"""
project_snapshot.py - Generates a comprehensive project summary.
"""
import unreal
import json
import os
from uma.utils import execute_wrapper, make_result, make_error


@execute_wrapper
def execute(params):
    snapshot = {}

    # Basic project info
    snapshot['project_name'] = unreal.SystemLibrary.get_game_name()
    snapshot['engine_version'] = unreal.SystemLibrary.get_engine_version()
    snapshot['project_directory'] = unreal.SystemLibrary.get_project_directory()

    # Asset counts by class
    asset_lib = unreal.EditorAssetLibrary
    all_assets = asset_lib.list_assets('/Game/', recursive=True, include_folder=False)

    asset_counts = {}
    for asset_path in all_assets:
        asset_data = asset_lib.find_asset_data(asset_path)
        if asset_data:
            asset_class = str(asset_data.asset_class_path.asset_name)
            asset_counts[asset_class] = asset_counts.get(asset_class, 0) + 1

    snapshot['total_assets'] = len(all_assets)
    snapshot['asset_counts_by_class'] = asset_counts

    # Plugin info from .uproject
    project_dir = unreal.SystemLibrary.get_project_directory()
    plugins_enabled = []
    plugins_disabled = []

    for fname in os.listdir(project_dir):
        if fname.endswith('.uproject'):
            try:
                with open(os.path.join(project_dir, fname), 'r', encoding='utf-8') as f:
                    uproject_data = json.load(f)
                for plugin in uproject_data.get('Plugins', []):
                    name = plugin.get('Name', '')
                    if plugin.get('Enabled', False):
                        plugins_enabled.append(name)
                    else:
                        plugins_disabled.append(name)
            except Exception:
                pass
            break

    snapshot['plugins_enabled'] = plugins_enabled
    snapshot['plugins_disabled'] = plugins_disabled
    snapshot['plugin_counts'] = {
        'enabled': len(plugins_enabled),
        'disabled': len(plugins_disabled),
    }

    # Directory summary (top-level folders under /Game/)
    top_level = set()
    for asset_path in all_assets:
        parts = asset_path.split('/')
        if len(parts) > 2:
            top_level.add(parts[2])

    snapshot['top_level_folders'] = sorted(top_level)

    return make_result(snapshot=snapshot)
