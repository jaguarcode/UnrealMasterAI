"""
Workflow: Create Inventory System
Error codes: 9060-9069
Creates DataTable + struct + inventory component Blueprint.
"""

import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


@execute_wrapper(error_base=9060)
def execute(args: dict) -> dict:
    system_name = get_required_param(args, 'systemName')
    base_path = get_required_param(args, 'basePath')
    max_slots = get_optional_param(args, 'maxSlots', 20)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    created_assets = []

    # DataTable for item definitions
    dt_factory = unreal.DataTableFactory()
    dt_factory.set_editor_property('struct', unreal.TableRowBase)
    dt_name = f"DT_{system_name}Items"
    data_table = asset_tools.create_asset(dt_name, base_path, unreal.DataTable, dt_factory)
    if data_table is None:
        return make_error(9061, f"Failed to create DataTable '{dt_name}' at '{base_path}'")
    created_assets.append(f"{base_path}/{dt_name}")

    # Inventory Component Blueprint
    comp_factory = unreal.BlueprintFactory()
    comp_factory.set_editor_property('parent_class', unreal.ActorComponent)
    comp_name = f"BC_{system_name}Inventory"
    inventory_comp = asset_tools.create_asset(comp_name, base_path, unreal.Blueprint, comp_factory)
    if inventory_comp:
        created_assets.append(f"{base_path}/{comp_name}")

    # Save assets
    unreal.EditorAssetLibrary.save_directory(base_path)

    return make_result({
        'systemName': system_name,
        'basePath': base_path,
        'maxSlots': max_slots,
        'createdAssets': created_assets,
    })
