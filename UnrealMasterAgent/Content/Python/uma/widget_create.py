"""
widget.create script.
Creates a new Widget Blueprint in the Unreal project.
"""
import unreal
from uma.utils import execute_wrapper, make_result, make_error, get_required_param, get_optional_param, validate_path


@execute_wrapper
def execute(params):
    name = get_required_param(params, "widgetName")
    path = get_required_param(params, "widgetPath")
    parent_class = get_optional_param(params, "parentClass", default="UserWidget", param_type=str)

    validate_path(path)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.WidgetBlueprintFactory()

    widget = asset_tools.create_asset(name, path, None, factory)

    if widget is None:
        return make_error(7700, f"Failed to create Widget Blueprint '{name}' at '{path}'")

    return make_result(
        widgetName=name,
        widgetPath=path,
        parentClass=parent_class,
        objectPath=str(widget.get_path_name()),
    )
