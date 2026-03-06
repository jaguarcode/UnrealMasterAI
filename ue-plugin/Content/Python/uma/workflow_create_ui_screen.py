"""
Workflow: Create UI Screen
Error codes: 9010-9019
Creates a Widget Blueprint with layout based on screen type (hud, menu, inventory).
"""

import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param


SCREEN_TYPE_PARENT_MAP = {
    'hud': unreal.HUD,
    'menu': unreal.UserWidget,
    'inventory': unreal.UserWidget,
}


@execute_wrapper(error_base=9010)
def execute(args: dict) -> dict:
    screen_name = get_required_param(args, 'screenName')
    screen_path = get_required_param(args, 'screenPath')
    screen_type = get_optional_param(args, 'screenType', 'menu')

    if screen_type not in ('hud', 'menu', 'inventory'):
        return make_error(9011, f"Invalid screenType '{screen_type}'. Must be 'hud', 'menu', or 'inventory'.")

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    widget_factory = unreal.WidgetBlueprintFactory()
    widget_factory.set_editor_property('use_inherited_viewport', False)

    widget_bp = asset_tools.create_asset(
        screen_name,
        screen_path,
        unreal.WidgetBlueprint,
        widget_factory
    )
    if widget_bp is None:
        return make_error(9012, f"Failed to create Widget Blueprint '{screen_name}' at '{screen_path}'")

    unreal.EditorAssetLibrary.save_directory(screen_path)

    return make_result({
        'screenName': screen_name,
        'screenPath': screen_path,
        'screenType': screen_type,
        'createdAssets': [f"{screen_path}/{screen_name}"],
    })
