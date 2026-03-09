"""
project_plugins.py - Lists enabled/disabled plugins in the project.
"""
import unreal
import json
import os
from uma.utils import execute_wrapper, make_result, make_error, get_optional_param


@execute_wrapper
def execute(params):
    enabled_only = get_optional_param(params, 'enabledOnly', default=False, param_type=bool)

    plugins = []

    # Use IPluginManager via Python bindings if available
    # Fall back to reading .uproject file
    project_dir = unreal.SystemLibrary.get_project_directory()

    # Find .uproject file
    uproject_path = None
    for fname in os.listdir(project_dir):
        if fname.endswith('.uproject'):
            uproject_path = os.path.join(project_dir, fname)
            break

    uproject_plugins = []
    if uproject_path and os.path.exists(uproject_path):
        try:
            with open(uproject_path, 'r', encoding='utf-8') as f:
                uproject_data = json.load(f)
            uproject_plugins = uproject_data.get('Plugins', [])
        except Exception as e:
            return make_error(5101, f'Failed to read .uproject file: {e}')

    for plugin in uproject_plugins:
        name = plugin.get('Name', '')
        enabled = plugin.get('Enabled', False)

        if enabled_only and not enabled:
            continue

        plugins.append({
            'name': name,
            'enabled': enabled,
            'marketplace_url': plugin.get('MarketplaceURL', ''),
            'supported_target_platforms': plugin.get('SupportedTargetPlatforms', []),
        })

    return make_result(
        plugins=plugins,
        total=len(plugins),
        enabled_only=enabled_only,
    )
