"""
Workflow: Create Dialogue System
Error codes: 9070-9079
Creates DataTable + Widget BP + Dialogue Manager BP.
"""

import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper(error_base=9070)
def execute(args: dict) -> dict:
    system_name = get_required_param(args, 'systemName')
    base_path = get_required_param(args, 'basePath')

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    created_assets = []

    # DataTable for dialogue entries
    dt_factory = unreal.DataTableFactory()
    dt_factory.set_editor_property('struct', unreal.TableRowBase)
    dt_name = f"DT_{system_name}Dialogue"
    data_table = asset_tools.create_asset(dt_name, base_path, unreal.DataTable, dt_factory)
    if data_table is None:
        return make_error(9071, f"Failed to create DataTable '{dt_name}' at '{base_path}'")
    created_assets.append(f"{base_path}/{dt_name}")

    # Dialogue Widget Blueprint
    widget_factory = unreal.WidgetBlueprintFactory()
    widget_factory.set_editor_property('use_inherited_viewport', False)
    widget_name = f"WBP_{system_name}Dialogue"
    widget_bp = asset_tools.create_asset(widget_name, base_path, unreal.WidgetBlueprint, widget_factory)
    if widget_bp:
        created_assets.append(f"{base_path}/{widget_name}")

    # Dialogue Manager Actor Blueprint
    mgr_factory = unreal.BlueprintFactory()
    mgr_factory.set_editor_property('parent_class', unreal.Actor)
    mgr_name = f"BP_{system_name}DialogueManager"
    manager_bp = asset_tools.create_asset(mgr_name, base_path, unreal.Blueprint, mgr_factory)
    if manager_bp:
        created_assets.append(f"{base_path}/{mgr_name}")

    # Save assets
    unreal.EditorAssetLibrary.save_directory(base_path)

    return make_result({
        'systemName': system_name,
        'basePath': base_path,
        'createdAssets': created_assets,
    })
